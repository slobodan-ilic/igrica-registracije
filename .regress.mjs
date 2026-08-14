import puppeteer from 'puppeteer-core'
import {readFileSync} from 'node:fs'
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--touch-events=enabled']})
const pause=ms=>new Promise(r=>setTimeout(r,ms))
const S='http://localhost:5183'
let fails=0
const check=(label,ok,extra='')=>{console.log(`  ${ok?'✓':'✗'} ${label}${extra?' — '+extra:''}`); if(!ok)fails++}

// every topic: real mouse click scores
for (const [topic,file,sel] of [['tablice','regions','[data-code]'],['okruzi','okruzi','[data-code]'],
    ['reke','rivers','.rv__hit'],['planine','planine','.pt__hit'],['banje','banje','.pt__hit']]){
  const ctx=await b.createBrowserContext(); const p=await ctx.newPage()
  await p.setViewport({width:1440,height:900})
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()))
  await p.goto(`${S}/${topic}/igra?n=5`,{waitUntil:'networkidle0'}); await pause(800)
  const feats=JSON.parse(readFileSync(`src/data/${file}.json`,'utf8')).features.map(f=>f.properties)
  const asked=await p.evaluate(()=>document.querySelector('.plate__code')?.textContent||document.querySelector('.namecard__title')?.textContent)
  const code=feats.find(f=>f.code===asked||f.name===asked).code
  const pt=await p.evaluate((c,sel)=>{
    const el=document.querySelector(`[data-code="${c}"] ${sel}`)||document.querySelector(`[data-code="${c}"]`)
    if(el.getTotalLength){const L=el.getTotalLength(),m=el.getScreenCTM()
      for(let t=0.15;t<0.9;t+=0.04){const q=el.getPointAtLength(L*t);const P=new DOMPoint(q.x,q.y).matrixTransform(m)
        if(document.elementFromPoint(P.x,P.y)===el)return{x:P.x,y:P.y}}}
    const r=el.getBoundingClientRect()
    for(let fy=0.25;fy<0.85;fy+=0.06)for(let fx=0.25;fx<0.85;fx+=0.06){const x=r.x+r.width*fx,y=r.y+r.height*fy
      if(document.elementFromPoint(x,y)?.closest('[data-code]')===document.querySelector(`[data-code="${c}"]`))return{x,y}}
    return {x:r.x+r.width/2,y:r.y+r.height/2}},code,sel)
  await p.mouse.click(pt.x,pt.y); await pause(500)
  const scored=await p.$eval('.bar__stats',e=>e.textContent)
  check(`${topic}: click scores`, scored.includes('Poeni1'), scored.replace(/([A-Za-zČŠŽĆĐ])(\d)/g,'$1 $2'))
  if(errs.length) check(`${topic}: no console errors`,false,errs[0])
  await ctx.close()
}

// gestures still work
const ctx=await b.createBrowserContext(); const p=await ctx.newPage()
await p.setViewport({width:1440,height:900})
await p.goto(`${S}/tablice/igra?n=10`,{waitUntil:'networkidle0'}); await pause(700)
const k0=await p.evaluate(()=>document.querySelector('.map__svg g').getAttribute('transform'))
await p.mouse.move(800,450); for(let i=0;i<5;i++){await p.mouse.wheel({deltaY:-200});await pause(50)}
await pause(300)
const k1=await p.evaluate(()=>parseFloat(document.querySelector('.map__svg g').getAttribute('transform').match(/scale\(([\d.]+)\)/)[1]))
check('wheel zooms', k1>2, `${k1.toFixed(2)}x`)
const before=await p.evaluate(()=>document.querySelector('.map__svg g').getAttribute('transform'))
await p.mouse.move(800,450); await p.mouse.down()
for(const d of [40,90,140]){await p.mouse.move(800-d,450-d);await pause(40)}
await p.mouse.up(); await pause(300)
const stats=await p.$eval('.bar__stats',e=>e.textContent)
check('mouse drag pans, does not pick', before!==await p.evaluate(()=>document.querySelector('.map__svg g').getAttribute('transform')) && stats.includes('Poeni0'))
await ctx.close()

// touch: one finger pans while zoomed; tap arms then confirms
const t=await (await b.createBrowserContext()).newPage()
await t.setViewport({width:834,height:1112,deviceScaleFactor:2,isMobile:true,hasTouch:true})
await t.goto(`${S}/planine/igra?n=8`,{waitUntil:'networkidle0'}); await pause(800)
const cdp=await t.createCDPSession()
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:380,y:600,id:1},{x:460,y:600,id:2}]});await pause(80)
await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:250,y:600,id:1},{x:590,y:600,id:2}]});await pause(150)
await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pause(300)
const z=await t.evaluate(()=>parseFloat(document.querySelector('.map__svg g').getAttribute('transform').match(/scale\(([\d.]+)\)/)[1]))
check('pinch zooms', z>1.5, `${z.toFixed(2)}x`)
const tr0=await t.evaluate(()=>document.querySelector('.map__svg g').getAttribute('transform'))
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:420,y:700,id:1}]});await pause(60)
for(const d of [50,110]){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:420-d,y:700,id:1}]});await pause(50)}
await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pause(300)
check('one finger pans while zoomed', tr0!==await t.evaluate(()=>document.querySelector('.map__svg g').getAttribute('transform')))
await t.evaluate(()=>document.querySelector('.map__reset')?.click()); await pause(400)
const feats=JSON.parse(readFileSync('src/data/planine.json','utf8')).features.map(f=>f.properties)
const asked=await t.$eval('.namecard__title',e=>e.textContent)
const pt=await t.evaluate(c=>{const h=document.querySelector(`[data-code="${c}"] .pt__hit`);const r=h.getBoundingClientRect()
  return{x:r.x+r.width/2,y:r.y+r.height/2}},feats.find(f=>f.name===asked).code)
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:pt.x,y:pt.y,id:1}]});await pause(60)
await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pause(350)
check('tap arms without scoring', (await t.$eval('.bar__stats',e=>e.textContent)).includes('Poeni0') && !!(await t.$('.picker')))
await t.evaluate(()=>document.querySelector('.picker__confirm').click()); await pause(400)
check('confirm scores', (await t.$eval('.bar__stats',e=>e.textContent)).includes('Poeni1'))

console.log(fails? `\n${fails} FAILED`: '\nall checks passed')
await b.close()

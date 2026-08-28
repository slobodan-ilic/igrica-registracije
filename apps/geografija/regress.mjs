import puppeteer from 'puppeteer-core'
import {readFileSync} from 'node:fs'
// Tracked and closed however the run ends; a crashed check used to leave its
// Chrome behind.
const browsers=[]
const launch=async opts=>{const br=await puppeteer.launch({
  executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',...opts})
  browsers.push(br); return br}
const shutdown=async()=>{for(const br of browsers.splice(0)) await br.close().catch(()=>{})}
for (const sig of ['SIGINT','SIGTERM']) process.on(sig,()=>shutdown().then(()=>process.exit(130)))
process.on('uncaughtException',async e=>{console.error('\n'+e.message); await shutdown(); process.exit(1)})
process.on('unhandledRejection',async e=>{console.error('\n'+(e?.message??e)); await shutdown(); process.exit(1)})

const b=await launch({args:['--touch-events=enabled']})
const pause=ms=>new Promise(r=>setTimeout(r,ms))
const S=process.env.URL ?? 'http://localhost:5174'
const TIP_ROUTE='/okruzi/igra?n=25'
let fails=0
const check=(label,ok,extra='')=>{console.log(`  ${ok?'✓':'✗'} ${label}${extra?' — '+extra:''}`); if(!ok)fails++}

// every topic: real mouse click scores
for (const [topic,file,sel] of [['okruzi','okruzi','[data-code]'],
    ['reke','rivers','.rv__hit'],['planine','planine','.pt__hit'],['banje','banje','.pt__hit']]){
  const ctx=await b.createBrowserContext(); const p=await ctx.newPage()
  await p.setViewport({width:1440,height:900})
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()))
  await p.goto(`${S}/${topic}/igra?n=5`,{waitUntil:'networkidle0'}); await pause(800)
  const feats=JSON.parse(readFileSync(`data/${file}.json`,'utf8')).features.map(f=>f.properties)
  const asked=await p.evaluate(()=>document.querySelector('.namecard__title')?.textContent)
  const code=feats.find(f=>f.name===asked).code
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
await p.goto(`${S}/okruzi/igra?n=10`,{waitUntil:'networkidle0'}); await pause(700)

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
const feats=JSON.parse(readFileSync('data/planine.json','utf8')).features.map(f=>f.properties)
const asked=await t.$eval('.namecard__title',e=>e.textContent)
const pt=await t.evaluate(c=>{const h=document.querySelector(`[data-code="${c}"] .pt__hit`);const r=h.getBoundingClientRect()
  return{x:r.x+r.width/2,y:r.y+r.height/2}},feats.find(f=>f.name===asked).code)
await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:pt.x,y:pt.y,id:1}]});await pause(60)
await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await pause(350)
check('tap arms without scoring', (await t.$eval('.bar__stats',e=>e.textContent)).includes('Poeni0') && !!(await t.$('.picker')))
await t.evaluate(()=>document.querySelector('.picker__confirm').click()); await pause(400)
check('confirm scores', (await t.$eval('.bar__stats',e=>e.textContent)).includes('Poeni1'))

// the tooltip must stay inside the map, whichever region it is over
{
  // A browser of its own, without --touch-events: with them on the app is in
  // its touch mode, where there is no hover tooltip at all, and this check
  // would pass having shown none.
  const mouse=await launch()
  const p=await mouse.newPage()
  await p.setViewport({width:1440,height:900})
  await p.goto(`${S}${TIP_ROUTE}`,{waitUntil:'networkidle0'}); await pause(800)
  let off=0, worst=null, seen=0
  for (const c of await p.$$eval('[data-code]',es=>es.map(e=>e.getAttribute('data-code')))) {
    const pt=await p.evaluate(code=>{
      const el=[...document.querySelectorAll('[data-code]')].find(e=>e.getAttribute('data-code')===code)
      if(!el) return null
      const r=el.getBoundingClientRect()
      for(let fy=0.2;fy<0.9;fy+=0.1)for(let fx=0.2;fx<0.9;fx+=0.1){const x=r.x+r.width*fx,y=r.y+r.height*fy
        if(document.elementFromPoint(x,y)?.closest('[data-code]')===el)return{x,y}}
      return null},c)
    if(!pt) continue
    await p.mouse.move(pt.x,pt.y); await pause(80)
    const o=await p.evaluate(()=>{const t=document.querySelector('.tip'); if(!t) return null
      const a=t.getBoundingClientRect(), m=document.querySelector('.map').getBoundingClientRect()
      return Math.max(m.top-a.top, a.bottom-m.bottom, m.left-a.left, a.right-m.right)})
    if(o!==null){seen++; if(o>off){off=o; worst=c}}
  }
  // Fail if none ever appeared: a check that silently tests nothing is worse
  // than no check.
  check('tooltip never leaves the map', seen>0 && off<=1,
    seen===0?'NO TOOLTIP EVER SHOWN':`${seen} checked, worst ${worst} by ${off.toFixed(1)}px`)
  await mouse.close()
}

// the chooser must not promise what the app does not have, and progress that
// cannot travel must say so. This app has no Google client id, so its sign-in
// never appears — which is fine, and was silent, so its progress looked like
// everyone else's and quietly stayed on one device.
{
  const ctx=await b.createBrowserContext(); const p=await ctx.newPage()
  await p.setViewport({width:1280,height:900})
  await p.goto(`${S}/`,{waitUntil:'networkidle0'}); await pause(600)
  const soon=await p.$$eval('.gamecard--soon', els=>els.map(e=>e.textContent))
  check('the chooser promises nothing it does not have', soon.length===0,
    soon.join(' · ') || 'nothing promised')
  // Anchors only: a sketched-in card is a div, so counting .gamecard would just
  // be the check above again in different words.
  const playable=await p.$$eval('a.gamecard', els=>els.map(e=>e.getAttribute('href')))
  check('and offers every topic it does have',
    playable.length===4 && new Set(playable).size===4, playable.join(' '))

  // A round, so the progress page has something to draw rather than its empty
  // state — the two say the same thing in different words and both must.
  await p.evaluate(() => localStorage.setItem('geografija.history', JSON.stringify([{
    id:'66666666-6666-6666-6666-666666666666', app:'geografija', topic:'reke', seed:'p',
    length:2, easy:false, kim:false, timed:false, score:1, ms:1800, at:Date.now(),
    answers:[{code:'drina',picked:'drina',correct:true,ms:900},
             {code:'sava',picked:'dunav',correct:false,ms:900}]}])))
  await p.goto(`${S}/napredak`,{waitUntil:'networkidle0'}); await pause(600)
  const said=await p.$eval('.napredak__nudge', e=>e.textContent.trim()).catch(()=>'nothing')
  check('progress that cannot travel says so', /ovom pregledaču/.test(said), said)
  check('and does not offer a sign-in that will never appear',
    !/[Pp]rijavite se/.test(said) && !(await p.$('.account')), said)
  // Rivers and mountains are not countries, and this chart called them that.
  const heading=await p.$$eval('.chart__title', es=>es.map(e=>e.textContent))
  check('the per-topic chart calls a topic what it is here',
    heading.includes('Po temama') && !heading.includes('Po zemljama'), heading.join(' · '))
  await ctx.close()
}

console.log(fails? `\n${fails} FAILED`: '\nall checks passed')
await shutdown()
process.exit(fails ? 1 : 0)

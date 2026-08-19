import puppeteer from 'puppeteer-core'
import {readFileSync} from 'node:fs'
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--touch-events=enabled']})
const pause=ms=>new Promise(r=>setTimeout(r,ms))
const S=process.env.URL ?? 'http://localhost:5183'
const TIP_ROUTE='/hrvatska/igra?n=34'
let fails=0
const check=(label,ok,extra='')=>{console.log(`  ${ok?'✓':'✗'} ${label}${extra?' — '+extra:''}`); if(!ok)fails++}

// the one topic: a real mouse click scores
for (const [topic,file,sel] of [['srbija','srbija','[data-code]'],['hrvatska','hrvatska','[data-code]'],['makedonija','makedonija','[data-code]'],['crnagora','crnagora','[data-code]'],['slovenija','slovenija','[data-code]'],['jugoslavija','jugoslavija','.pt__hit']]){
  const ctx=await b.createBrowserContext(); const p=await ctx.newPage()
  await p.setViewport({width:1440,height:900})
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>m.type()==='error'&&errs.push(m.text()))
  await p.goto(topic==='srbija'?`${S}/igra?n=5`:`${S}/${topic}/igra?n=5`,{waitUntil:'networkidle0'}); await pause(800)
  const feats=JSON.parse(readFileSync(`data/${file}.json`,'utf8')).features.map(f=>f.properties)
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
await p.goto(`${S}/igra?n=10`,{waitUntil:'networkidle0'}); await pause(700)

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
await t.goto(`${S}/igra?n=8`,{waitUntil:'networkidle0'}); await pause(800)
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
const feats=JSON.parse(readFileSync('data/srbija.json','utf8')).features.map(f=>f.properties)
const asked=await t.$eval('.plate__code',e=>e.textContent)
const pt=await t.evaluate(c=>{const el=document.querySelector(`[data-code="${c}"]`);const r=el.getBoundingClientRect()
  for(let fy=0.2;fy<0.9;fy+=0.05)for(let fx=0.2;fx<0.9;fx+=0.05){const x=r.x+r.width*fx,y=r.y+r.height*fy
    if(document.elementFromPoint(x,y)?.closest('[data-code]')===el)return{x,y}}
  return{x:r.x+r.width/2,y:r.y+r.height/2}},feats.find(f=>f.code===asked).code)
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
  const mouse=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'})
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

// a round is its URL: the same seed always deals the same questions, which is
// what makes a result shareable as a challenge and a daily quiz possible
{
  const ctx=await b.createBrowserContext()
  const asked=async url=>{const p=await ctx.newPage(); await p.setViewport({width:1440,height:900})
    await p.goto(`${S}${url}`,{waitUntil:'networkidle0'}); await pause(500)
    const q=await p.evaluate(()=>document.querySelector('.plate__code')?.textContent)
    const at=p.url().replace(S,''); await p.close(); return {q,at}}

  const same=[]; for(let i=0;i<3;i++) same.push((await asked('/igra?n=5&s=proba')).q)
  check('same seed deals the same round', same.every(q=>q&&q===same[0]), same.join(' '))

  const spread=new Set(); for(const s of ['a1','b2','c3','d4','e5','f6']) spread.add((await asked(`/igra?n=5&s=${s}`)).q)
  check('different seeds deal different rounds', spread.size>=4, `${spread.size} distinct of 6`)

  const minted=await asked('/igra?n=5')
  check('a seedless round mints a seed into the URL', /[?&]s=[a-z0-9]+/.test(minted.at), minted.at)

  const carried=await asked('/hrvatska/igra?n=5&s=proba&m=lako')
  const lit=await (async()=>{const p=await ctx.newPage(); await p.setViewport({width:1440,height:900})
    await p.goto(`${S}/hrvatska/igra?n=5&s=proba&m=lako`,{waitUntil:'networkidle0'}); await pause(500)
    const n=await p.$$eval('[data-code]',els=>els.filter(e=>!e.className.baseVal.includes('--off')).length)
    await p.close(); return n})()
  check('the URL carries how it is played, not just how long', carried.q&&lit>0&&lit<=8, `${lit} areas live`)
  await ctx.close()
}

// the map zooms itself, and refuses to let the browser zoom the page instead
{
  const ctx=await b.createBrowserContext(); const p=await ctx.newPage()
  await p.setViewport({width:420,height:860,isMobile:true,hasTouch:true})
  await p.goto(`${S}/igra?n=5&s=proba`,{waitUntil:'networkidle0'}); await pause(700)

  const scale=()=>p.$eval('.map__svg g',g=>Number(g.getAttribute('transform').match(/scale\(([\d.]+)\)/)[1]))
  const at=await scale()
  await p.click('.map__zoom .map__zoombtn:nth-child(1)'); await pause(250)
  const bigger=await scale()
  await p.click('.map__zoom .map__zoombtn:nth-child(2)'); await pause(250)
  const back=await scale()
  check('the buttons zoom the map', at===1 && bigger>at && Math.abs(back-at)<0.01,
    `${at} -> ${bigger.toFixed(2)} -> ${back.toFixed(2)}`)

  // Two fingers on the map must be the map's gesture, not the browser's: if the
  // default is left standing, iOS zooms the whole page instead.
  const refused=await p.evaluate(()=>{
    const el=document.querySelector('.map__svg')
    const r=el.getBoundingClientRect()
    const touch=(id,x,y)=>new Touch({identifier:id,target:el,clientX:x,clientY:y})
    const two=[touch(1,r.x+r.width*0.4,r.y+r.height*0.4),touch(2,r.x+r.width*0.6,r.y+r.height*0.6)]
    const move=new TouchEvent('touchmove',{touches:two,targetTouches:two,changedTouches:two,
      bubbles:true,cancelable:true})
    el.dispatchEvent(move)
    const gesture=new Event('gesturestart',{bubbles:true,cancelable:true})
    el.dispatchEvent(gesture)
    return {move:move.defaultPrevented, gesture:gesture.defaultPrevented}})
  check('two fingers on the map do not zoom the page', refused.move && refused.gesture,
    `touchmove ${refused.move?'refused':'ALLOWED'}, gesturestart ${refused.gesture?'refused':'ALLOWED'}`)
  await ctx.close()
}

// a menu taller than the phone must start at its top and scroll from there
{
  const ctx=await b.createBrowserContext(); const p=await ctx.newPage()
  await p.setViewport({width:390,height:844,isMobile:true,hasTouch:true})
  await p.goto(`${S}/`,{waitUntil:'networkidle0'}); await pause(600)
  const m=await p.evaluate(()=>{
    const shell=document.querySelector('.shell--center'), intro=document.querySelector('.intro')
    const box=shell.getBoundingClientRect()
    const above=intro.getBoundingClientRect().top-box.top
    shell.scrollTop=shell.scrollHeight
    const last=document.querySelector('.siblings__row')??intro.lastElementChild
    return {taller:intro.getBoundingClientRect().height>shell.clientHeight, above,
      below:box.bottom-last.getBoundingClientRect().bottom}})
  // Serbia's menu is the tallest in the app; if it ever stops overflowing this
  // check is proving nothing and should say so rather than pass quietly.
  check('a tall menu is not cut off at the top', m.taller && m.above>=0 && m.below>=0,
    m.taller?`${m.above.toFixed(0)}px above, ${m.below.toFixed(0)}px below at full scroll`
            :'MENU NO LONGER OVERFLOWS — check proves nothing')
  await ctx.close()
}

// signing in swaps one thing for another in the corner, and must leave nothing
// of the first behind. Google's script and endpoint are stubbed: what is under
// test is our own handover, not theirs.
if (!process.env.URL) {
  const ctx=await b.createBrowserContext(); const p=await ctx.newPage()
  await p.setViewport({width:1200,height:800})
  await p.evaluateOnNewDocument(()=>{
    window.google={accounts:{id:{
      initialize:o=>{window.__signIn=()=>o.callback({credential:'stub'})},
      renderButton:el=>{const btn=document.createElement('button')
        btn.className='stub-gsi'; btn.textContent='Prijavi me'
        btn.onclick=()=>window.__signIn(); el.appendChild(btn)},
      disableAutoSelect:()=>{}}}}
  })
  await p.setRequestInterception(true)
  p.on('request',r=>{
    const u=r.url()
    if(u.includes('gsi/client')) return r.respond({status:200,contentType:'text/javascript',body:'/*stub*/'})
    if(u.endsWith('/api/auth/me')) return r.respond({status:200,contentType:'application/json',body:'{"player":null}'})
    if(u.endsWith('/api/auth/google')) return r.respond({status:200,contentType:'application/json',body:'{"sub":"stub","name":"Proba"}'})
    r.continue()
  })
  await p.goto(`${S}/srbija`,{waitUntil:'networkidle0'}); await pause(600)

  const before=await p.evaluate(()=>({button:!!document.querySelector('.stub-gsi'),
    name:!!document.querySelector('.account__name')}))
  check('signed out, the corner offers a way in', before.button && !before.name)

  await p.click('.stub-gsi'); await pause(500)
  const after=await p.evaluate(()=>{const a=document.querySelector('.corner')
    return {name:document.querySelector('.account__name')?.textContent,
      leftover:!!a.querySelector('.stub-gsi'), chips:a.querySelectorAll('.account').length}})
  check('signing in leaves no sign-in button behind',
    after.name==='Proba' && !after.leftover && after.chips===1,
    `${after.name}, leftover ${after.leftover}, ${after.chips} chip(s)`)
  await ctx.close()
}

// a finished round is kept in the browser, whether or not anyone is signed in
{
  const ctx=await b.createBrowserContext(); const p=await ctx.newPage()
  await p.setViewport({width:1440,height:900})
  const read=()=>p.evaluate(()=>JSON.parse(localStorage.getItem('tablice.history')||'[]'))

  // two questions, answered by clicking whatever the map says is right
  await p.goto(`${S}/crnagora/igra?n=2&s=zapis`,{waitUntil:'networkidle0'}); await pause(700)
  check('nothing is recorded before the end', (await read()).length===0)

  const feats=JSON.parse(readFileSync('data/crnagora.json','utf8')).features.map(f=>f.properties)
  for (let i=0;i<2;i++){
    const asked=await p.evaluate(()=>document.querySelector('.plate__code')?.textContent)
    const code=feats.find(f=>f.code===asked).code
    const pt=await p.evaluate(c=>{const el=document.querySelector(`[data-code="${c}"]`)
      const r=el.getBoundingClientRect()
      for(let fy=0.25;fy<0.85;fy+=0.06)for(let fx=0.25;fx<0.85;fx+=0.06){
        const x=r.x+r.width*fx,y=r.y+r.height*fy
        if(document.elementFromPoint(x,y)?.closest('[data-code]')===el)return{x,y}}
      return {x:r.x+r.width/2,y:r.y+r.height/2}},code)
    await p.mouse.click(pt.x,pt.y); await pause(1400)
  }
  await pause(800)
  // A check that never reached the end would prove nothing about the ending.
  check('the round actually finished',
    await p.evaluate(()=>document.querySelector('.intro__eyebrow')?.textContent==='Kraj partije'))

  const kept=await read()
  const r=kept[0]
  check('a finished round is kept', kept.length===1 && r?.answers?.length===2,
    `${kept.length} round(s), ${r?.answers?.length} answer(s)`)
  check('it records what the round was', r?.topic==='crnagora' && r?.seed==='zapis' && r?.length===2 && r?.app==='tablice',
    `${r?.app}/${r?.topic} seed ${r?.seed}`)
  check('it records what was picked, not just whether it was right',
    r?.answers.every(a=>a.code&&a.picked&&typeof a.correct==='boolean'&&a.ms>=0),
    r?.answers.map(a=>`${a.code}${a.correct?'=':'→'}${a.picked}`).join(' '))
  check('every round is minted with its own id', /^[0-9a-f-]{8,}/.test(r?.id||''), r?.id?.slice(0,13))
  await ctx.close()
}

console.log(fails? `\n${fails} FAILED`: '\nall checks passed')
await b.close()

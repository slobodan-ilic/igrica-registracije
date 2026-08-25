import puppeteer from 'puppeteer-core'
import {readFileSync} from 'node:fs'
// Every browser this run opens. A crashed check used to leave its Chrome
// behind, and enough of those will bring a machine to its knees — so they are
// tracked and closed on the way out however the run ends.
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
const S=process.env.URL ?? 'http://localhost:5173'
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

// syncing is safe to repeat and safe to fail: the same rounds sent twice store
// once, and a refusal leaves the browser's own history untouched
if (!process.env.URL) {
  const ctx=await b.createBrowserContext(); const p=await ctx.newPage()
  await p.setViewport({width:1200,height:800})
  const posted=[]
  await p.setRequestInterception(true)
  p.on('request',r=>{
    const u=r.url()
    if(u.endsWith('/api/auth/me')) return r.respond({status:200,contentType:'application/json',body:'{"player":{"sub":"s","name":"Proba"}}'})
    if(u.endsWith('/api/rounds') && r.method()==='POST'){
      const sent=JSON.parse(r.postData()||'{}').rounds ?? []
      posted.push(sent.map(x=>x.id))
      return r.respond({status:200,contentType:'application/json',
        body:JSON.stringify({stored:sent.map(x=>x.id)})})}
    if(u.endsWith('/api/rounds')) return r.respond({status:200,contentType:'application/json',
      body:JSON.stringify({rounds:[{id:'from-elsewhere',app:'tablice',topic:'srbija',seed:'x',
        length:1,easy:false,kim:false,score:1,ms:10,at:Date.now(),answers:[]}]})})
    r.continue()
  })

  // a round this browser played before it ever signed in
  await p.goto(`${S}/srbija`,{waitUntil:'networkidle0'})
  await p.evaluate(()=>localStorage.setItem('tablice.history',JSON.stringify([
    {id:'played-here',app:'tablice',topic:'srbija',seed:'a',length:1,easy:false,kim:false,
     score:1,ms:100,at:Date.now(),answers:[{code:'NS',picked:'BG',correct:false,ms:100}]}])))
  await p.reload({waitUntil:'networkidle0'}); await pause(900)

  const after=await p.evaluate(()=>JSON.parse(localStorage.getItem('tablice.history')))
  check('what was played signed out goes up on sign-in', posted.flat().includes('played-here'),
    `sent ${JSON.stringify(posted.flat())}`)
  check('what another device stored comes down', after.some(r=>r.id==='from-elsewhere'))
  check('rounds already up are not sent again',
    after.find(r=>r.id==='played-here')?.synced===true)

  // a second visit must not re-send anything
  posted.length=0
  await p.reload({waitUntil:'networkidle0'}); await pause(900)
  check('a later visit sends nothing it has already sent', posted.flat().length===0,
    `sent ${JSON.stringify(posted.flat())}`)
  await ctx.close()
}

// the progress page: the sums it shows must be the sums of what was played
{
  const ctx=await b.createBrowserContext(); const p=await ctx.newPage()
  await p.setViewport({width:1200,height:1400})

  await p.goto(`${S}/srbija`,{waitUntil:'networkidle0'})
  await p.evaluate(()=>localStorage.removeItem('tablice.history'))
  await p.goto(`${S}/napredak`,{waitUntil:'networkidle0'}); await pause(400)
  check('with nothing played there are no numbers to show',
    (await p.$$('.tile')).length===0 && /skuplja/.test(await p.$eval('.intro__lead',e=>e.textContent)))

  // 3 rounds: srbija 4/5 then 5/5, hrvatska 1/2. KŠ mistaken for Kraljevo twice.
  const rounds=[
    {id:'r1',app:'tablice',topic:'srbija',seed:'a',length:5,easy:false,kim:false,score:4,ms:5000,at:1,
     answers:[{code:'NS',picked:'NS',correct:true,ms:1000},{code:'BG',picked:'BG',correct:true,ms:1000},
              {code:'KŠ',picked:'Kraljevo',correct:false,ms:1000},{code:'NI',picked:'NI',correct:true,ms:1000},
              {code:'SU',picked:'SU',correct:true,ms:1000}]},
    {id:'r2',app:'tablice',topic:'srbija',seed:'b',length:5,easy:false,kim:false,score:5,ms:5000,at:2,
     answers:[{code:'NS',picked:'NS',correct:true,ms:1000},{code:'BG',picked:'BG',correct:true,ms:1000},
              {code:'PA',picked:'PA',correct:true,ms:1000},{code:'NI',picked:'NI',correct:true,ms:1000},
              {code:'SU',picked:'SU',correct:true,ms:1000}]},
    {id:'r3',app:'tablice',topic:'hrvatska',seed:'c',length:2,easy:false,kim:false,score:1,ms:2000,at:3,
     answers:[{code:'ZG',picked:'ZG',correct:true,ms:1000},{code:'KŠ',picked:'Kraljevo',correct:false,ms:1000}]},
    // another app's rounds must not leak into this one's page
    {id:'r4',app:'geografija',topic:'okruzi',seed:'d',length:1,easy:false,kim:false,score:0,ms:500,at:4,
     answers:[{code:'X',picked:'Y',correct:false,ms:500}]}]
  await p.evaluate(r=>localStorage.setItem('tablice.history',JSON.stringify(r)),rounds)
  await p.goto(`${S}/napredak`,{waitUntil:'networkidle0'}); await pause(500)

  // Every round above is classic, so no filter should appear at all.
  check('with one kind of round there is nothing to filter', (await p.$$('.filter')).length===0)

  const tiles=await p.$$eval('.tile',es=>es.map(e=>e.querySelector('.tile__value').textContent))
  // 3 rounds, 12 questions, 10 right = 83%. The longest run is 5 — all of r2 —
  // because a streak lives inside one round, which is what the game shows you
  // while you play it. It does not carry over a gap of hours.
  // Five now: the median second-per-question joined them.
  check('the numbers are the sums of the rounds',
    JSON.stringify(tiles)===JSON.stringify(['3','12','83%','5','1s']), tiles.join(' · '))

  const ranks=await p.$$eval('.rank',es=>es.map(e=>
    e.querySelector('.rank__name').textContent+' '+e.querySelector('.rank__value').textContent.replace(/\s+/g,' ')))
  check('each country is counted on its own', ranks.length===2 && /^Srbija 90%/.test(ranks[0]), ranks.join(' | '))

  const mistakes=await p.$$eval('.mistake',es=>es.map(e=>e.textContent.replace(/\s+/g,' ').trim()))
  check('a repeated mistake is named, a one-off is not',
    mistakes.length===1 && /KŠ.*Kraljevo.*2 puta/.test(mistakes[0]), mistakes.join(' | '))

  const bars=await p.$$eval('.rank__fill',es=>es.map(e=>e.style.width))
  check('the bars are drawn to the numbers', bars[0]==='90%', bars.join(' '))
  await ctx.close()
}

// easy and classic must never be averaged together: on easy you pick one of
// four, so guessing alone scores about 25%
{
  const ctx=await b.createBrowserContext(); const p=await ctx.newPage()
  await p.setViewport({width:1200,height:1400})
  const rounds=[
    {id:'c1',app:'tablice',topic:'srbija',seed:'a',length:2,easy:false,kim:false,score:1,ms:2000,at:1,
     answers:[{code:'NS',picked:'NS',correct:true,ms:1000},{code:'BG',picked:'NI',correct:false,ms:1000}]},
    {id:'e1',app:'tablice',topic:'srbija',seed:'b',length:2,easy:true,kim:false,score:2,ms:2000,at:2,
     answers:[{code:'NS',picked:'NS',correct:true,ms:1000},{code:'BG',picked:'BG',correct:true,ms:1000}]},
    {id:'e2',app:'tablice',topic:'srbija',seed:'c',length:2,easy:true,kim:false,score:2,ms:2000,at:3,
     answers:[{code:'SU',picked:'SU',correct:true,ms:1000},{code:'PA',picked:'PA',correct:true,ms:1000}]}]
  await p.goto(`${S}/srbija`,{waitUntil:'networkidle0'})
  await p.evaluate(r=>localStorage.setItem('tablice.history',JSON.stringify(r)),rounds)
  await p.goto(`${S}/napredak`,{waitUntil:'networkidle0'}); await pause(500)

  const picks=await p.$$eval('.filter__pick',es=>es.map(e=>
    e.textContent+(e.className.includes('--on')?'*':'')))
  check('both kinds played, so the filter appears', picks.length===3, picks.join(' '))
  // 4 easy answers against 2 classic, so easy is the one it opens on
  check('it opens on whichever was played more', picks[1]==='Lako*', picks.join(' '))

  const acc=()=>p.$$eval('.tile',es=>es[2].querySelector('.tile__value').textContent)
  check('easy is counted on its own', await acc()==='100%', await acc())

  await p.click('.filter__pick:nth-child(1)'); await pause(250)
  check('classic is counted on its own', await acc()==='50%', await acc())

  await p.click('.filter__pick:nth-child(3)'); await pause(250)
  check('and the two can be seen together, said so in words',
    await acc()==='83%' && /ne porede/.test(await p.$eval('.napredak__scope',e=>e.textContent)),
    await acc())
  await ctx.close()
}

// the clock: scaled to how much map is being searched, and running out is not
// the same as answering wrongly
if (!process.env.URL) {
  const ctx=await b.createBrowserContext(); const p=await ctx.newPage()
  await p.setViewport({width:1440,height:900})

  // Montenegro's 25 municipalities -> 4 + 3.2*log2(25) = 19s
  await p.goto(`${S}/crnagora/igra?n=2&s=sat&t=1`,{waitUntil:'networkidle0'}); await pause(400)
  // The budget itself, not what is left of it: the clock starts before the
  // page has finished settling, so reading the countdown measures the load.
  const seconds=Number(await p.$eval('.clock',e=>e.dataset.seconds))
  check('the clock is scaled to the size of the map', seconds===19, `${seconds}s for 25 places`)

  const before=Number(await p.$eval('.clock__count',e=>e.textContent))
  await pause(2500)
  const later=Number(await p.$eval('.clock__count',e=>e.textContent))
  check('it runs down', later<before, `${before} -> ${later}`)

  const bar=await p.$eval('.clock__left',e=>e.getBoundingClientRect().width)
  const track=await p.$eval('.clock__track',e=>e.getBoundingClientRect().width)
  check('and the bar drains with it', bar>0 && bar<track, `${Math.round(bar)} of ${Math.round(track)}px`)

  // let this one expire
  await pause(later*1000+500)
  const verdict=await p.$eval('.verdict__bad',e=>e.textContent)
  check('running out ends the question', /Isteklo vreme/.test(verdict), verdict.slice(0,30))

  // an unanswered question is not somewhere you confused it with
  await p.goto(`${S}/srbija`,{waitUntil:'networkidle0'})
  const kept=await p.evaluate(()=>JSON.parse(localStorage.getItem('tablice.history')||'[]'))
  await p.evaluate(()=>localStorage.setItem('tablice.history',JSON.stringify([
    {id:'t1',app:'tablice',topic:'srbija',seed:'a',length:2,easy:false,kim:false,timed:true,
     score:0,ms:2000,at:1,answers:[
       {code:'NS',picked:'',correct:false,ms:1000},{code:'NS',picked:'',correct:false,ms:1000}]}])))
  await p.goto(`${S}/napredak`,{waitUntil:'networkidle0'}); await pause(400)
  check('a question that ran out is not counted as a confusion',
    (await p.$$('.mistake')).length===0, `${(await p.$$('.mistake')).length} listed`)
  check('but it is still counted as a question',
    (await p.$$eval('.tile',es=>es[1].querySelector('.tile__value').textContent))==='2')
  void kept
  await ctx.close()
}

// the front of a topic is one button and a line saying what it will start
{
  const ctx=await b.createBrowserContext(); const p=await ctx.newPage()
  await p.setViewport({width:1400,height:1000})
  await p.goto(`${S}/srbija`,{waitUntil:'networkidle0'}); await pause(500)

  check('one thing to press', (await p.$$('.btn--go')).length===1)
  check('and the settings are put away', (await p.$$('.tweaks')).length===0)
  check('but what it will start is said out loud',
    (await p.$eval('.tweak__summary',e=>e.textContent))==='10 pitanja · cela mapa')

  await p.click('.tweak'); await pause(200)
  check('they open when asked for', (await p.$$('.tweaks')).length===1)

  // change every one and watch the line, then the link, follow
  await p.click('.choice:nth-child(1) .choice__pick:nth-child(2)')   // 25 questions
  await p.click('.choice:nth-child(2) .choice__pick:nth-child(2)')   // four offered
  await p.click('.choice:nth-child(3) .choice__pick:nth-child(2)')   // with a clock
  await pause(250)
  check('changing them changes the line',
    (await p.$eval('.tweak__summary',e=>e.textContent))==='25 pitanja · 4 ponuđena · 10s po pitanju',
    await p.$eval('.tweak__summary',e=>e.textContent))
  const href=await p.$eval('.btn--go',e=>e.getAttribute('href'))
  check('and the button starts exactly that', /n=25/.test(href)&&/m=lako/.test(href)&&/t=1/.test(href), href)

  // and they are still there next time
  await p.goto(`${S}/hrvatska`,{waitUntil:'networkidle0'}); await pause(400)
  check('the choices are remembered for next time',
    /25 pitanja · 4 ponuđena/.test(await p.$eval('.tweak__summary',e=>e.textContent)),
    await p.$eval('.tweak__summary',e=>e.textContent))
  await ctx.close()
}

// the daily challenge: everyone gets the same round on a given day, and a
// different one the next. The clock is frozen before the app loads, so
// "tomorrow" is a real test rather than a wait.
{
  const at=async iso=>{
    const ctx=await b.createBrowserContext(); const p=await ctx.newPage()
    await p.setViewport({width:1200,height:900})
    await p.evaluateOnNewDocument(fixed=>{
      const Real=Date, when=Real.parse(fixed)
      class Frozen extends Real {
        constructor(...a){ super(...(a.length? a : [when])) }
        static now(){ return when }
      }
      window.Date=Frozen
    }, iso)
    // Tolerant on purpose: with no daily challenge the router sends /dnevni
    // home, and this should report a failed check rather than kill the run.
    await p.goto(`${S}/dnevni`,{waitUntil:'domcontentloaded'}).catch(()=>{})
    await pause(900)
    const out=await p.evaluate(()=>({
      there:!!document.querySelector('.daily'),
      number:document.querySelector('.intro__title')?.textContent,
      eyebrow:document.querySelector('.intro__eyebrow')?.textContent,
      play:document.querySelector('.btn--go')?.getAttribute('href'),
      score:document.querySelector('.daily__points')?.textContent?.trim() ?? null,
    }))
    await ctx.close(); return out
  }

  // Belgrade is two hours ahead of UTC in August, so 21:00 UTC is already the
  // 25th there — which is the whole point of not using UTC.
  const morning=await at('2026-08-24T08:00:00Z')
  check('there is a daily challenge at /dnevni', morning.there,
    morning.there? '' : 'no daily screen — /dnevni went somewhere else')

  const evening=morning.there? await at('2026-08-24T18:00:00Z') : morning
  const tomorrow=morning.there? await at('2026-08-24T22:30:00Z') : morning

  check('the same day deals the same round', morning.play===evening.play && !!morning.play,
    `${morning.play} vs ${evening.play}`)
  check('the next day deals a different one', tomorrow.play!==morning.play,
    `${morning.play} → ${tomorrow.play}`)
  check('the day turns over in Belgrade, not at UTC',
    morning.number==='#1' && tomorrow.number==='#2', `${morning.number} → ${tomorrow.number}`)
  check('the round is the one shape a board can rank',
    /n=10/.test(morning.play) && !/m=lako/.test(morning.play) && !/t=1/.test(morning.play),
    morning.play)
  check('and it says which country it is', /·/.test(morning.eyebrow||''), morning.eyebrow)

  // played once: after a round, the challenge shows the score rather than a replay
  if (morning.there) {
    const ctx=await b.createBrowserContext(); const p=await ctx.newPage()
    await p.setViewport({width:1200,height:900})
    await p.goto(`${S}/srbija`,{waitUntil:'networkidle0'})
    const day=await p.evaluate(()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Belgrade'}).format(new Date()))
    const topic=await (async()=>{const q=await p.evaluate(()=>document.querySelector('.today')?.textContent)
      return q})()
    await p.goto(`${S}/dnevni`,{waitUntil:'networkidle0'}); await pause(400)
    const link=await p.$eval('.btn--go',e=>e.getAttribute('href'))
    const played=link.split('/')[1]
    await p.evaluate((t,d)=>localStorage.setItem('tablice.history',JSON.stringify([
      {id:'daily',app:'tablice',topic:t,seed:d,length:10,easy:false,kim:false,timed:false,
       score:7,ms:9000,at:Date.now(),answers:Array.from({length:10},(_,i)=>
         ({code:'NS',picked:i<7?'NS':'BG',correct:i<7,ms:900}))}])), played, day)
    await p.goto(`${S}/dnevni`,{waitUntil:'networkidle0'}); await pause(400)
    const after=await p.evaluate(()=>({score:document.querySelector('.daily__points')?.textContent?.trim(),
      play:!!document.querySelector('.btn--go')}))
    check('once played, today shows the score instead of another go',
      after.score==='7 / 10' && !after.play, `${after.score}, play button ${after.play}`)
    void topic
    await ctx.close()
  }
}

// a shared link previews as the plate. This one is checked against the served
// HTML rather than the rendered page, because the crawlers that draw previews
// do not run JavaScript — whatever React sets afterwards they never see.
if (process.env.URL) {
  const raw=async path=>{
    const r=await fetch(`${S}${path}`,{headers:{'user-agent':'facebookexternalhit/1.1'}})
    return r.ok? await r.text() : ''
  }
  // Tolerant of how the tag is written — attributes in either order, wrapped
  // across lines or not. A check that depends on formatting fails for the wrong
  // reason later, which is worse than not checking.
  const meta=(html,prop)=>html.match(new RegExp(`<meta[^>]*(?:property|name)="${prop}"[^>]*>`,'g'))??[]
  const tag=(html,prop)=>meta(html,prop)[0]?.match(/content="([^"]*)"/)?.[1] ?? null
  const count=(html,prop)=>meta(html,prop).length

  const pages={}
  for (const r of ['srbija','hrvatska','jugoslavija','dnevni']) pages[r]=await raw(`/${r}`)

  check('every route serves preview tags without JavaScript',
    Object.values(pages).every(h=>tag(h,'og:image') && tag(h,'og:title') && tag(h,'og:description')),
    Object.entries(pages).map(([r,h])=>`${r}:${tag(h,'og:image')?'y':'n'}`).join(' '))

  const titles=new Set(Object.values(pages).map(h=>tag(h,'og:title')))
  const images=new Set(Object.values(pages).map(h=>tag(h,'og:image')))
  check('and each route says something of its own', titles.size===4 && images.size>=3,
    `${titles.size} titles, ${images.size} images`)

  check('with exactly one of each tag, not two',
    Object.values(pages).every(h=>count(h,'og:image')===1 && count(h,'og:title')===1),
    Object.entries(pages).map(([r,h])=>`${r}:${count(h,'og:image')}`).join(' '))

  const shot=await fetch(`${S}/api/og?t=hrvatska`)
  const bytes=(await shot.arrayBuffer()).byteLength
  check('the picture is a real PNG',
    shot.headers.get('content-type')==='image/png' && bytes>10_000,
    `${shot.headers.get('content-type')}, ${(bytes/1024).toFixed(0)}KB`)

  check('and a browser still gets the app on those routes',
    Object.values(pages).every(h=>/src="\/assets\/[^"]+\.js"/.test(h)))
}

// the shared result: what goes out must say how it went and give away nothing
if (!process.env.URL) {
  const ctx=await b.createBrowserContext()
  await ctx.overridePermissions(S,['clipboard-read','clipboard-write'])
  const p=await ctx.newPage(); await p.setViewport({width:1440,height:900})

  // What was copied, caught where it is copied. Headless Chrome will not hand
  // back the real clipboard unless the document has focus, and it does not
  // when other pages are open — so both routes out are wrapped instead, which
  // records the text whichever one the browser takes.
  await p.evaluateOnNewDocument(()=>{
    window.__copied=null
    const real=document.execCommand.bind(document)
    document.execCommand=(cmd,...rest)=>{
      if(cmd==='copy'){const el=document.activeElement
        if(el&&'value' in el) window.__copied=el.value}
      return real(cmd,...rest)
    }
    const write=navigator.clipboard?.writeText?.bind(navigator.clipboard)
    if(write) navigator.clipboard.writeText=async t=>{window.__copied=t; return write(t)}
  })

  const feats=JSON.parse(readFileSync('data/crnagora.json','utf8')).features.map(f=>f.properties)
  const play=async url=>{
    await p.goto(`${S}${url}`,{waitUntil:'networkidle0'}); await pause(700)
    for(;;){
      const asked=await p.evaluate(()=>document.querySelector('.plate__code')?.textContent)
      if(!asked) break
      const code=feats.find(f=>f.code===asked).code
      // answer the first right and the rest wrong, so the grid has both marks
      const target=await p.evaluate(()=>document.querySelectorAll('.intro__eyebrow').length)
      void target
      const pick=await p.evaluate(c=>{
        const wrong=[...document.querySelectorAll('[data-code]')].find(e=>e.getAttribute('data-code')!==c)
        const el=document.querySelector(`[data-code="${c}"]`)
        const use=(window.__n=(window.__n??0)+1)===1? el : wrong
        const r=use.getBoundingClientRect()
        for(let fy=0.25;fy<0.85;fy+=0.06)for(let fx=0.25;fx<0.85;fx+=0.06){
          const x=r.x+r.width*fx,y=r.y+r.height*fy
          if(document.elementFromPoint(x,y)?.closest('[data-code]')===use)return{x,y}}
        return {x:r.x+r.width/2,y:r.y+r.height/2}},code)
      await p.mouse.click(pick.x,pick.y); await pause(1100)
      // A wrong answer waits to be read rather than moving on by itself, so the
      // round only advances when its "Dalje" is pressed. Without this the loop
      // clicks a map that has stopped listening, forever.
      const on=await p.$('.quiz .btn--sm')
      if(on){ await on.click(); await pause(500) }
    }
    await pause(600)
  }

  // an ordinary round, on a seed that is not a date
  await play('/crnagora/igra?n=3&s=deljenje')
  // The result leaves as a picture with somewhere to put it, not as a button
  // that quietly copies. So: the card is drawn, and the places are offered.
  const targets=await p.$$eval('.share__target',es=>es.map(e=>e.getAttribute('title')))
  const offered=targets.length>0 && !!(await p.$('.share__card'))
  check('the summary shows the card and where it can go', offered, targets.join(' · '))
  check('and offers somewhere other than the clipboard',
    targets.some(t=>/^(X|WhatsApp|Telegram|Facebook)$/.test(t)), targets.join(' · '))

  // Drawn, not merely present: an empty canvas is the shape of this going wrong
  // and it looks identical in the DOM.
  const painted=await p.$eval('.share__card',c=>{
    const x=c.getContext('2d').getImageData(0,0,c.width,c.height).data
    const seen=new Set()
    for(let at=0;at<x.length;at+=4) seen.add(`${x[at]},${x[at+1]},${x[at+2]}`)
    return {side:c.width, colours:seen.size}
  })
  check('the card is actually painted',
    painted.side===1080 && painted.colours>4, `${painted.side}px, ${painted.colours} colours`)

  if (offered) {
  await p.click('.share__target[data-share]'); await pause(400)
  const copied=await p.evaluate(()=>window.__copied ?? '')
  check('copying says it did', (await p.$eval('.share__said',e=>e.textContent))==='Kopirano',
    await p.$eval('.share__said',e=>e.textContent))

  const lines=copied.split('\n')
  check('it names the quiz and the score', /^Tablice · Crna Gora · \d\/3/.test(lines[0]), lines[0])
  check('one mark per question, in order',
    [...lines.slice(1,-1).join('')].filter(c=>c==='🟩'||c==='⬛').length===3 &&
    lines.slice(1,-1).join('').startsWith('🟩⬛'), JSON.stringify(lines.slice(1,-1)))
  // The link is a result's own address, not the bare host it used to be and not
  // the round's own address either: a round's address previews as the country's
  // plate, the same picture for a perfect ten and a miserable two. What that
  // address then serves is checked against a deployment, where it exists.
  const back=lines[lines.length-1]
  check('and a link to this result, which carries the round inside it',
    /^https?:\/\/[^/]+\/r\/crnagora\?/.test(back) && /s=deljenje/.test(back) && /g=[01]{3}/.test(back),
    back)
  check('whose grid is the round that was just played',
    back.match(/g=([01]+)/)?.[1]==='100', back.match(/g=[01]+/)?.[0])
  check('an ordinary round claims no challenge number', !/#\d/.test(copied), copied.split('\n')[0])

  // nothing in it gives an answer away
  const round=await p.evaluate(()=>JSON.parse(localStorage.getItem('tablice.history'))[0])
  const secrets=[...new Set(round.answers.flatMap(a=>[a.code,a.picked]))]
  const names=feats.filter(f=>secrets.includes(f.code)).map(f=>f.name)
  const leaked=[...secrets.filter(c=>copied.includes(c)),
                ...names.filter(n=>copied.toLowerCase().includes(n.toLowerCase()))]
  check('and none of it gives an answer away', leaked.length===0,
    leaked.length? `leaked ${leaked.join(', ')}` : `${secrets.length} codes and ${names.length} names checked`)

  // the daily wears its number
  const day=await p.evaluate(()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Belgrade'}).format(new Date()))
  await p.goto(`${S}/dnevni`,{waitUntil:'networkidle0'}); await pause(400)
  const link=await p.$eval('.btn--go',e=>e.getAttribute('href'))
  await p.evaluate(()=>{window.__n=0; localStorage.removeItem('tablice.history')})
  const daily=JSON.parse(readFileSync(`data/${link.split('/')[1]}.json`,'utf8')).features.map(f=>f.properties)
  feats.length=0; feats.push(...daily)
  await play(link.replace(/n=\d+/,'n=2'))
  await p.click('.share__target[data-share]'); await pause(400)
  const shared=await p.evaluate(()=>window.__copied ?? '')
  check('the daily wears its number', /^Tablice #\d+ · \d\/2/.test(shared), shared.split('\n')[0])
  // The date is the seed, which is what lets the page it points at work out
  // that this was the challenge and offer /dnevni rather than a seeded copy.
  check("and its link carries the day it was",
    new RegExp(`/r/[a-z]+\\?s=${day}&`).test(shared.split('\n').pop()), shared.split('\n').pop())
  }
  await ctx.close()
}

// the progress page must be worth opening before anything has been played,
// and a score must land against the scores before it
if (!process.env.URL) {
  const ctx=await b.createBrowserContext(); const p=await ctx.newPage()
  await p.setViewport({width:1200,height:900})

  await p.goto(`${S}/srbija`,{waitUntil:'networkidle0'})
  await p.evaluate(()=>localStorage.removeItem('tablice.history'))
  await p.goto(`${S}/napredak`,{waitUntil:'networkidle0'}); await pause(500)
  const cold=await p.evaluate(()=>({
    explains:document.querySelectorAll('.waiting li').length,
    actions:[...document.querySelectorAll('.btn')].map(e=>e.textContent),
    signIn:!!document.querySelector('.napredak__nudge'),
    edges:new Set(['h1','.intro__lead','.waiting li b','.btn']
      .map(s=>Math.round(document.querySelector(s).getBoundingClientRect().x))).size}))
  check('with nothing played it says what it will hold', cold.explains===3, `${cold.explains} lines`)
  check('and offers two ways to fill it', cold.actions.length===2, cold.actions.join(' · '))
  check('and mentions the account that carries it across', cold.signIn)
  check('all of it down one edge', cold.edges===1, `${cold.edges} different left edges`)

  // a score on its own says nothing, so it is put against the ones before it
  const feats=JSON.parse(readFileSync('data/crnagora.json','utf8')).features.map(f=>f.properties)
  const one=async (right,seed)=>{
    await p.goto(`${S}/crnagora/igra?n=1&s=${seed}`,{waitUntil:'networkidle0'}); await pause(700)
    const asked=await p.evaluate(()=>document.querySelector('.plate__code')?.textContent)
    const pt=await p.evaluate((c,ok)=>{
      const el=document.querySelector(`[data-code="${c}"]`)
      const other=[...document.querySelectorAll('[data-code]')].find(e=>e.getAttribute('data-code')!==c)
      const use=ok? el : other
      const r=use.getBoundingClientRect()
      for(let fy=0.25;fy<0.85;fy+=0.06)for(let fx=0.25;fx<0.85;fx+=0.06){
        const x=r.x+r.width*fx,y=r.y+r.height*fy
        if(document.elementFromPoint(x,y)?.closest('[data-code]')===use)return{x,y}}
      return {x:r.x+r.width/2,y:r.y+r.height/2}}, feats.find(f=>f.code===asked).code, right)
    await p.mouse.click(pt.x,pt.y); await pause(1200)
    const on=await p.$('.quiz .btn--sm'); if(on){ await on.click(); await pause(500) }
    await pause(500)
  }

  await p.evaluate(()=>localStorage.removeItem('tablice.history'))
  await one(false,'prvi')
  check('the first round says nothing about the ones before it',
    (await p.$$('.context')).length===0, 'nothing to compare it with yet')

  await one(true,'drugi')
  const said=await p.$eval('.context',e=>e.textContent).catch(()=>null)
  check('a later round is put against them', !!said && /Najbolje do sada/.test(said), said)
  await ctx.close()
}

// the daily's preview must be the country the daily actually is. The picture
// and the challenge are two implementations of one rule, so this asks both.
if (process.env.URL) {
  const html=await (await fetch(`${S}/dnevni`,{headers:{'user-agent':'facebookexternalhit/1.1'}})).text()
  const image=html.match(/<meta[^>]*property="og:image"[^>]*>/)?.[0]?.match(/content="([^"]*)"/)?.[1] ?? ''
  check('the daily asks for a picture that is chosen when it is asked for',
    /t=dnevni/.test(image), image)

  // Six days is a full turn of the rota, so this sees every country once.
  const days=['2026-08-24','2026-08-25','2026-08-26','2026-08-27','2026-08-28','2026-08-29']
  const drawn=[]
  for (const d of days) {
    const r=await fetch(`${S}/api/og?t=dnevni&d=${d}`)
    drawn.push(r.headers.get('x-plate'))
  }
  check('and it draws a different country each day', new Set(drawn).size===6, drawn.join(' '))

  // What the app deals on those days, from the app itself rather than from a
  // second copy of the rule here.
  const ctx=await b.createBrowserContext()
  const dealt=[]
  for (const d of days) {
    const p=await ctx.newPage(); await p.setViewport({width:1000,height:800})
    await p.evaluateOnNewDocument(fixed=>{
      const Real=Date, when=Real.parse(fixed+'T09:00:00Z')
      class Frozen extends Real {
        constructor(...a){ super(...(a.length? a : [when])) }
        static now(){ return when }
      }
      window.Date=Frozen
    }, d)
    await p.goto(`${S}/dnevni`,{waitUntil:'networkidle0'}); await pause(500)
    dealt.push((await p.$eval('.btn--go',e=>e.getAttribute('href')).catch(()=>'')).split('/')[1] ?? '')
    await p.close()
  }
  await ctx.close()

  check('the picture and the challenge never disagree',
    JSON.stringify(drawn)===JSON.stringify(dealt),
    drawn.map((c,i)=>c===dealt[i]? c : `${c}≠${dealt[i]}`).join(' '))

  const head=await fetch(`${S}/api/og?t=dnevni`)
  const holds=Number(head.headers.get('cache-control')?.match(/max-age=(\d+)/)?.[1] ?? 0)
  check('and it is only cached until the country changes',
    holds>0 && holds<=86400, `${Math.round(holds/3600)}h`)
}

// what the server keeps of a round it is sent. The one check here with no
// browser in it: the losses happen inside a serverless function, between the
// payload going up and the row going down, where nothing on the page can see
// them. A round played on the clock must still be a clocked round when another
// device reads it back, and a question the clock ran out on must still be a
// question that was asked.
{
  const { clean } = await import('../../api/rounds.js')
  const played = {
    id:'11111111-1111-1111-1111-111111111111', app:'tablice', topic:'srbija', seed:'a',
    length:3, easy:false, kim:false, timed:true, score:1, ms:3000, at:Date.now(),
    answers:[{code:'NS',picked:'NS',correct:true,ms:900},
             {code:'BG',picked:'',correct:false,ms:2000},   // the clock ran out
             {code:'KG',picked:'NI',correct:false,ms:100}],
  }
  const kept = clean(played)
  check('the server keeps that a round was played on the clock', kept?.timed===true, String(kept?.timed))
  check('and keeps the question the clock ran out on',
    kept?.answers.length===3, `${kept?.answers.length} of 3 answers`)
  check('with nothing picked, so it stays out of the confusions',
    kept?.answers[1]?.picked==='' && kept?.answers[1]?.correct===false,
    JSON.stringify(kept?.answers[1]))
}

// what a shared result previews as. This needs a deployment: the tags are made
// when the link is opened, by a function, which is the whole point of it —
// every other route's are written into its HTML when the app is built and say
// the same thing every day, and a result does not.
if (process.env.URL) {
  const crawl=async path=>{
    const r=await fetch(`${S}${path}`,{headers:{'user-agent':'facebookexternalhit/1.1'}})
    return {ok:r.ok, status:r.status, html: r.ok? await r.text() : ''}
  }
  // Entities decoded, because the value in the HTML is escaped and the URL in
  // it is not the URL until it is not. Fetching the escaped form asks for
  // `amp;g=...`, which is no grid at all — so the picture came back as the
  // country's plate and every check on it passed while looking at the wrong
  // image entirely.
  const tag=(html,prop)=>(html.match(new RegExp(`<meta[^>]*(?:property|name)="${prop}"[^>]*>`))?.[0]
    ?.match(/content="([^"]*)"/)?.[1] ?? '')
    .replace(/&amp;/g,'&').replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>')

  const win='/r/srbija?s=proba&g=1111111111&q=37'
  const poor='/r/srbija?s=proba&g=1000000000&q=180'
  const a=await crawl(win)

  check('a shared result has a page of its own', a.ok, `${a.status}`)
  check('whose preview says the score, not the country',
    /10\/10/.test(tag(a.html,'og:title')), tag(a.html,'og:title'))
  check('and whose picture is that result',
    /\/api\/og\?/.test(tag(a.html,'og:image')) && /g=1111111111/.test(tag(a.html,'og:image')),
    tag(a.html,'og:image'))
  check('with one of each tag, not two',
    (a.html.match(/property="og:image"/g)??[]).length===1 &&
    (a.html.match(/<title>/g)??[]).length===1)

  // Two different rounds must not preview as one picture. This is the whole
  // complaint that started it: every link looked the same whatever happened.
  const b=await crawl(poor)
  check('two different results do not share one preview',
    tag(a.html,'og:title')!==tag(b.html,'og:title') &&
    tag(a.html,'og:image')!==tag(b.html,'og:image'),
    `${tag(a.html,'og:title')} vs ${tag(b.html,'og:title')}`)

  const shot=await fetch(`${S}${tag(a.html,'og:image').replace(/^https?:\/\/[^/]+/,'')}`)
  const bytes=(await shot.arrayBuffer()).byteLength
  check('the result picture is a real PNG',
    shot.headers.get('content-type')==='image/png' && bytes>2000,
    `${shot.headers.get('content-type')}, ${Math.round(bytes/1024)}KB`)

  const plain=await fetch(`${S}/api/og?t=srbija`)
  const plainBytes=(await plain.arrayBuffer()).byteLength
  check('and is not the country plate that a bare link draws',
    plainBytes!==bytes, `result ${Math.round(bytes/1024)}KB vs plate ${Math.round(plainBytes/1024)}KB`)

  check('the page offers the very round it reports',
    /href="[^"]*\/srbija\/igra\?[^"]*s=proba/.test(a.html),
    a.html.match(/href="[^"]*igra[^"]*"/)?.[0] ?? 'no round offered')

  // A link that lost half of itself in a chat app must not preview a made-up
  // result. It has nothing to say, so it goes where it was meant to go.
  const broken=await fetch(`${S}/r/srbija?s=proba`,{redirect:'manual'})
  check('a half-arrived link previews nothing and points home',
    broken.status>=300 && broken.status<400, `${broken.status}`)

  // How a round was played travels with it, or the round someone is handed is
  // not the round that was reported: three questions against a clock must come
  // back as three questions against a clock.
  // The challenge, which is the one shape everybody plays identically — its
  // page has to offer /dnevni rather than one person's seeded copy of it.
  const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Belgrade'}).format(new Date())
  const rota=['srbija','hrvatska','makedonija','crnagora','jugoslavija','slovenija']
  const nth=Math.round((Date.parse(today)-Date.parse('2026-08-24'))/86400000)+1
  const challenge=await crawl(`/r/${rota[(nth-1)%rota.length]}?s=${today}&g=1111111111&q=90`)
  check('a shared challenge knows which challenge it was',
    new RegExp(`Tablice #${nth}\\b`).test(tag(challenge.html,'og:title')), tag(challenge.html,'og:title'))
  check('and offers the challenge rather than a seeded copy of it',
    /href="[^"]*\/dnevni"/.test(challenge.html),
    challenge.html.match(/class="r__go" href="[^"]*"/)?.[0] ?? 'nothing offered')

  const clocked=await crawl('/r/crnagora?s=deljenje&c=1&g=101&q=41')
  check('and how it was played survives the trip',
    /href="[^"]*\/crnagora\/igra\?[^"]*n=3[^"]*s=deljenje[^"]*t=1/.test(clocked.html) &&
    /2\/3/.test(tag(clocked.html,'og:title')),
    `${tag(clocked.html,'og:title')} → ${clocked.html.match(/href="[^"]*igra[^"]*"/)?.[0] ?? 'nothing'}`)
}

console.log(fails? `\n${fails} FAILED`: '\nall checks passed')
await shutdown()
process.exit(fails ? 1 : 0)

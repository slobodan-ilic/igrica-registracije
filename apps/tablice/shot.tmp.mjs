import puppeteer from 'puppeteer-core'
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new'})
const S=process.env.URL ?? 'http://localhost:5183'
const D='/private/tmp/claude-501/-Users-slobodanilic-Documents-personal-igrica-registracije/6f0318f4-e1d4-4800-9e1c-8927db0b5ad3/scratchpad'
const shots=[['srbija-desk','/srbija',{width:1440,height:900}],['hrvatska-desk','/hrvatska',{width:1440,height:900}],
             ['srbija-phone','/srbija',{width:390,height:844,isMobile:true,hasTouch:true,deviceScaleFactor:2}]]
for (const [name,url,vp] of shots){
  const p=await b.newPage(); await p.setViewport(vp)
  await p.emulateMediaFeatures([{name:'prefers-color-scheme',value:'dark'}])
  await p.goto(`${S}${url}`,{waitUntil:'networkidle0'}); await new Promise(r=>setTimeout(r,800))
  await p.screenshot({path:`${D}/${name}.png`})
  const m=await p.evaluate(()=>{const g=s=>{const e=document.querySelector(s);if(!e)return null
      const r=e.getBoundingClientRect();return {t:Math.round(r.top),l:Math.round(r.left),h:Math.round(r.height),w:Math.round(r.width)}}
    return {url:location.pathname+location.search, title:g('.intro__title'), hero:g('.intro__hero'),
      actions:g('.intro__actions'), sw:g('.switch'), intro:g('.intro'), sib:g('.siblings')}})
  console.log(name, JSON.stringify(m))
  await p.close()
}
await b.close()

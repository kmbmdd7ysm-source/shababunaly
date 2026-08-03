import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.jpeg':'image/jpeg','.json':'application/json','.txt':'text/plain','.xml':'application/xml','.webmanifest':'application/manifest+json','.ico':'image/x-icon'};
const serve=(root)=>new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split('?')[0]);if(u.startsWith('/api/')){res.writeHead(404);res.end('{}');return}let f=path.join(root,u);if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!fs.existsSync(f)){const p=path.join(root,u,'index.html');f=fs.existsSync(p)?p:path.join(root,'index.html')}res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res)});s.listen(0,'127.0.0.1',()=>r(s))});
const server=await serve(process.env.DIST||'/tmp/dist-fix1'); const port=server.address().port;
const browser=await chromium.launch({executablePath:'/opt/google/chrome/chrome',args:['--no-sandbox','--disable-gpu','--hide-scrollbars']});
const ctx=await browser.newContext({viewport:{width:1440,height:1000},locale:'en-US'});
await ctx.addInitScript(()=>{
  localStorage.setItem('shababuna-language','ar');
  localStorage.setItem('shababuna-commerce-welcome-v1','done');
  localStorage.setItem('shababuna-cookie-consent',JSON.stringify({necessary:true,analytics:false,marketing:false,decidedAt:'2026-01-01T00:00:00.000Z'}));
  window.__f=[];
  const snap=()=>{const mm=document.querySelector('.mobile-menu');const de=document.documentElement;
    const cs=mm?getComputedStyle(mm):null;
    window.__f.push({t:Math.round(performance.now()),html:de.getAttribute('dir'),
      body:document.body?document.body.getAttribute('dir'):null,
      mmX:mm?Math.round(mm.getBoundingClientRect().x):null,
      tr:cs?cs.transform.slice(0,42):null, trans:cs?cs.transitionProperty:null});};
  const tick=()=>{snap(); if(performance.now()<1200) requestAnimationFrame(tick);};
  addEventListener('DOMContentLoaded',()=>{snap();requestAnimationFrame(tick)});
});
const page=await ctx.newPage();
await page.goto(`http://127.0.0.1:${port}/`,{waitUntil:'domcontentloaded'});
await page.waitForTimeout(2200);
const f=await page.evaluate(()=>window.__f);
let prev=null;
for(const x of f){const k=JSON.stringify([x.html,x.body,x.mmX,x.tr]);if(k!==prev){console.log(`t=${String(x.t).padStart(4)} html=${x.html} body=${x.body} mmX=${x.mmX} transform=${x.tr} transitionProp=${x.trans}`);prev=k;}}
await browser.close(); server.close();

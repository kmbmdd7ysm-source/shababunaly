import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.jpeg':'image/jpeg','.json':'application/json','.txt':'text/plain','.xml':'application/xml','.webmanifest':'application/manifest+json','.ico':'image/x-icon'};
const serve=(root)=>new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split('?')[0]);if(u.startsWith('/api/')){res.writeHead(404);res.end('{}');return}let f=path.join(root,u);if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!fs.existsSync(f)){const p=path.join(root,u,'index.html');f=fs.existsSync(p)?p:path.join(root,'index.html')}res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res)});s.listen(0,'127.0.0.1',()=>r(s))});
const srv=await serve(process.argv[2]||'/tmp/dist-p2a'); const port=srv.address().port;
const b=await chromium.launch({executablePath:'/opt/google/chrome/chrome',args:['--no-sandbox','--disable-gpu','--hide-scrollbars']});
for(const [route,lang,w,h,tag] of [['/','en',1440,900,'home-en'],['/','ar',1440,900,'home-ar'],['/shop','en',1440,900,'shop-en'],['/','en',390,844,'home-en-m']]){
 const ctx=await b.newContext({viewport:{width:w,height:h},locale:'en-US'});
 await ctx.addInitScript((l)=>{localStorage.setItem('shababuna-language',l);localStorage.setItem('shababuna-commerce-welcome-v1','done');localStorage.setItem('shababuna-cookie-consent',JSON.stringify({necessary:true,analytics:false,marketing:false,decidedAt:'2026-01-01T00:00:00.000Z'}))},lang);
 const p=await ctx.newPage(); await p.goto(`http://127.0.0.1:${port}${route}`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2600);
 await p.evaluate(()=>document.fonts.ready).catch(()=>{}); await p.waitForTimeout(500);
 const info=await p.evaluate(()=>{const h1=document.querySelector('h1');return{fonts:[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family),
  h1Font:h1?getComputedStyle(h1).fontFamily.split(',')[0].replace(/["']/g,''):null, bodyFont:getComputedStyle(document.body).fontFamily.split(',')[0].replace(/["']/g,''),
  overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth}});
 console.log(tag, JSON.stringify(info));
 fs.writeFileSync(`/tmp/p2a-${tag}.png`, await p.screenshot());
 await ctx.close();
}
await b.close(); srv.close();

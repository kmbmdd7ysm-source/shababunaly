import { chromium } from 'playwright';
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.jpeg':'image/jpeg','.json':'application/json','.txt':'text/plain','.xml':'application/xml','.webmanifest':'application/manifest+json','.ico':'image/x-icon'};
const serve=(root)=>new Promise(r=>{const s=http.createServer((q,res)=>{const u=decodeURIComponent(q.url.split('?')[0]);if(u.startsWith('/api/')){res.writeHead(404);res.end('{}');return}let f=path.join(root,u);if(fs.existsSync(f)&&fs.statSync(f).isDirectory())f=path.join(f,'index.html');if(!fs.existsSync(f)){const p=path.join(root,u,'index.html');f=fs.existsSync(p)?p:path.join(root,'index.html')}res.writeHead(200,{'Content-Type':MIME[path.extname(f)]||'application/octet-stream'});fs.createReadStream(f).pipe(res)});s.listen(0,'127.0.0.1',()=>r(s))});
const srv=await serve(process.argv[2]); const port=srv.address().port;
const b=await chromium.launch({executablePath:'/opt/google/chrome/chrome',args:['--no-sandbox','--disable-gpu','--hide-scrollbars']});
const OUT='/opt/cursor/artifacts/assets';
for(const [lang,w,h,frames] of [['en',1440,900,5],['ar',1440,900,5],['en',390,844,6],['ar',390,844,6]]){
 const ctx=await b.newContext({viewport:{width:w,height:h},locale:'en-US'});
 await ctx.addInitScript((l)=>{localStorage.setItem('shababuna-language',l);localStorage.setItem('shababuna-commerce-welcome-v1','done');localStorage.setItem('shababuna-cookie-consent',JSON.stringify({necessary:true,analytics:false,marketing:false,decidedAt:'2026-01-01T00:00:00.000Z'}))},lang);
 const p=await ctx.newPage(); await p.goto(`http://127.0.0.1:${port}/`,{waitUntil:'domcontentloaded'}); await p.waitForTimeout(2600);
 await p.evaluate(()=>document.fonts.ready).catch(()=>{}); await p.waitForTimeout(500);
 const dev=w<700?'m':'d';
 for(let i=0;i<frames;i++){ await p.evaluate((y)=>window.scrollTo(0,y), Math.round(h*0.86*i)); await p.waitForTimeout(500);
   fs.writeFileSync(`${OUT}/p2-home-${lang}-${dev}-${i}.png`, await p.screenshot()); }
 const info=await p.evaluate(()=>({overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth, h1:document.querySelectorAll('h1').length, links:[...document.querySelectorAll('a')].map(a=>a.getAttribute('href'))}));
 const need=['/shop','/customize','/teams-wholesale','/shop/clothing','/shop/footwear','/shop/accessories','/shop/basketballs','/shop/equipment','/lha-store','/shop?brand=Shababuna'];
 console.log(`${lang} ${w}x${h} overflow=${info.overflow} h1=${info.h1} missingLinks=${JSON.stringify(need.filter(n=>!info.links.includes(n)))}`);
 await ctx.close();
}
await b.close(); srv.close();

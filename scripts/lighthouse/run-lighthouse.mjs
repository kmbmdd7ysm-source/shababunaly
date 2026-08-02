import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { copyFile, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import net from 'node:net';

const mode=process.argv[2]||'mobile'; if(!['mobile','desktop'].includes(mode)) throw new Error(`Unsupported Lighthouse mode: ${mode}`);
const runCount=Math.max(3,Number(process.env.LIGHTHOUSE_RUNS||5)); const externalUrl=process.env.LIGHTHOUSE_URL?.trim(); let server; let stopping=false;
const freePort=()=>new Promise((resolve,reject)=>{const socket=net.createServer();socket.unref();socket.on('error',reject);socket.listen(0,'127.0.0.1',()=>{const {port}=socket.address();socket.close(()=>resolve(port));});});
const stop=async()=>{if(stopping)return;stopping=true;if(server&&!server.killed){server.kill('SIGTERM');await new Promise(resolve=>{const timer=setTimeout(()=>{server.kill('SIGKILL');resolve();},3000);server.once('exit',()=>{clearTimeout(timer);resolve();});});}};
const execute=(command,args)=>new Promise((resolve,reject)=>{const child=spawn(command,args,{stdio:'inherit',env:process.env});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(new Error(`${command} exited with ${code}`)));});
const waitReady=async(url)=>{let last;for(let i=0;i<120;i++){try{const response=await fetch(url,{redirect:'manual'});const body=await response.text();if(response.ok&&/<div id=["']root["']/.test(body))return;last=new Error(`HTTP ${response.status}`);}catch(error){last=error;}await new Promise(r=>setTimeout(r,250));}throw new Error(`Lighthouse server readiness failed: ${last?.message||'unknown'}`);};
const median=(values)=>{const sorted=values.filter(Number.isFinite).sort((a,b)=>a-b);return sorted.length?sorted[Math.floor(sorted.length/2)]:null;};
const value=(report,key)=>Number(report?.audits?.[key]?.numericValue);
await mkdir(`reports/lighthouse-runs/${mode}`,{recursive:true}); await rm(`reports/lighthouse-${mode}.json`,{force:true}); await rm(`reports/lighthouse-${mode}.html`,{force:true});
let auditUrl=externalUrl;
try{
 if(!auditUrl){const port=await freePort();auditUrl=`http://127.0.0.1:${port}`;server=spawn(process.execPath,['./node_modules/vite/bin/vite.js','preview','--host','127.0.0.1','--port',String(port),'--strictPort'],{stdio:['ignore','pipe','pipe'],env:process.env});server.stdout.on('data',c=>process.stdout.write(`[preview] ${c}`));server.stderr.on('data',c=>process.stderr.write(`[preview] ${c}`));}
 await waitReady(auditUrl); const local='./node_modules/.bin/lighthouse'; const command=existsSync(local)?local:'npx'; const prefix=existsSync(local)?[]:['--yes','lighthouse@12.6.1']; const reports=[];
 for(let index=1;index<=runCount;index++){
  const stem=`reports/lighthouse-runs/${mode}/run-${index}`; const common=[auditUrl,'--quiet','--chrome-flags=--headless --no-sandbox --disable-dev-shm-usage',`--form-factor=${mode}`,...(mode==='desktop'?['--screenEmulation.mobile=false','--screenEmulation.width=1440','--screenEmulation.height=900','--screenEmulation.deviceScaleFactor=1']:[]),...(index>Math.ceil(runCount/2)?['--disable-storage-reset']:[])];
  await execute(command,[...prefix,...common,'--output=json','--output=html',`--output-path=${stem}`]);
  const candidates=[`${stem}.report.json`,`${stem}.json`]; const jsonPath=candidates.find(existsSync); if(!jsonPath)throw new Error(`Lighthouse JSON missing for run ${index}`);
  const htmlPath=[`${stem}.report.html`,`${stem}.html`].find(existsSync); const report=JSON.parse(await readFile(jsonPath,'utf8')); reports.push({index,jsonPath,htmlPath,cache:index>Math.ceil(runCount/2)?'warm':'cold',report});
 }
 const scores=(key)=>reports.map(x=>Number(x.report.categories?.[key]?.score)); const lcp=reports.map(x=>value(x.report,'largest-contentful-paint')); const cls=reports.map(x=>value(x.report,'cumulative-layout-shift')); const tbt=reports.map(x=>value(x.report,'total-blocking-time'));
 const performanceMedian=median(scores('performance')); const selected=reports.slice().sort((a,b)=>Math.abs(Number(a.report.categories?.performance?.score)-performanceMedian)-Math.abs(Number(b.report.categories?.performance?.score)-performanceMedian))[0];
 const summary={status:'completed',generatedAt:new Date().toISOString(),commitSha:process.env.GITHUB_SHA||null,runId:process.env.GITHUB_RUN_ID||null,mode,url:auditUrl,runCount,coldRuns:reports.filter(x=>x.cache==='cold').length,warmRuns:reports.filter(x=>x.cache==='warm').length,selectedRun:selected.index,lighthouseVersion:selected.report.lighthouseVersion||null,categories:Object.fromEntries(['performance','accessibility','best-practices','seo'].map(k=>[k,{score:median(scores(k))}])),metrics:{lcpMs:median(lcp),cls:median(cls),tbtMs:median(tbt)},runs:reports.map(x=>({index:x.index,cache:x.cache,categories:Object.fromEntries(['performance','accessibility','best-practices','seo'].map(k=>[k,{score:Number(x.report.categories?.[k]?.score)}])),metrics:{lcpMs:value(x.report,'largest-contentful-paint'),cls:value(x.report,'cumulative-layout-shift'),tbtMs:value(x.report,'total-blocking-time')}}))};
 await writeFile(`reports/lighthouse-${mode}.json`,`${JSON.stringify(summary,null,2)}\n`); if(selected.htmlPath)await copyFile(selected.htmlPath,`reports/lighthouse-${mode}.html`); console.info(`Saved ${runCount}-run median ${mode} Lighthouse evidence.`);
} finally {await stop();}

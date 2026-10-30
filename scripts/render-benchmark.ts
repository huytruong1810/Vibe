import {spawn} from 'node:child_process';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import type {GameSave} from '../src/domain/save-schema';

/** Reproducible browser/worker benchmark. Never contacts a model or changes user saves. */
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4174','--strictPort'],{
  windowsHide:true,stdio:'ignore',env:{...process.env},
});
const base='http://127.0.0.1:4174';
let browser:Awaited<ReturnType<typeof chromium.launch>>|null=null;
try{
  let ready=false;
  for(let n=0;n<100;n++){
    try{if((await fetch(base)).ok){ready=true;break;}}catch{/* startup */}
    if(server.exitCode!==null)throw Error('Benchmark preview could not start on port 4174');
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  if(!ready)throw Error('Benchmark preview timed out');
  browser=await chromium.launch({channel:process.platform==='win32'?'chrome':undefined,
    args:process.env.CI?['--enable-unsafe-swiftshader']:[]});
  const page=await browser.newPage({viewport:{width:1920,height:1080}});
  const failures:string[]=[];page.on('pageerror',e=>failures.push(e.message));
  await page.route('http://127.0.0.1:11434/**',async route=>{
    const tags=route.request().url().endsWith('/api/tags');
    await route.fulfill({contentType:'application/json',body:JSON.stringify(tags?{models:[{name:'benchmark-mock',size:1}]}:
      {message:{content:JSON.stringify({ready:true,dialogue:'Benchmark fallback',emotion:'calm',action:{type:'NONE'}})},eval_count:1})});
  });
  await page.goto(`${base}/?test=1`);
  await page.getByRole('button',{name:'Find models'}).click();
  await page.getByRole('button',{name:'Connect & begin journey'}).click();
  await page.locator('#setup-dialog').waitFor({state:'hidden',timeout:30000});
  type Stats={fps:number;renderMs:number;loadMs:number;textureBytes:number;gpu:string;assetError:string;framebufferScale:number;atlasBytes:number;cacheBytes:number};
  const samples:unknown[]=[];
  for(const dense of [false,true]){
    if(dense){
      const save=await page.evaluate(()=>(window as unknown as {__hearthwild:{checkpoint():Promise<GameSave>}}).__hearthwild.checkpoint());
      const player=save.entities.records.find(e=>e.id===0)!;
      const wildlife=save.entities.records.filter(e=>e.species!==8).slice(0,128);
      wildlife.forEach((e,i)=>{e.x=player.x+(i%12-6)*.3;e.y=player.y+(Math.floor(i/12)-5)*.3;});
      await page.getByRole('button',{name:'Settings',exact:true}).click();
      await page.locator('#import-input').setInputFiles({name:'benchmark.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(save))});
      await page.waitForFunction(()=>document.querySelector('#toast')?.textContent?.includes('imported'));
      await page.getByRole('button',{name:'Close settings'}).click();
    }
    for(const quality of ['high','medium','low']){
      await page.getByRole('button',{name:'Settings',exact:true}).click();
      await page.getByLabel('Visual quality').selectOption(quality);
      await page.getByRole('button',{name:'Close settings'}).click();
      await page.waitForTimeout(1500);
      const metrics=await page.evaluate(async()=>{
        const api=(window as unknown as {__hearthwild:{stats():Stats;frame():{performance:{population:number;detailed:number;stepMs:number};npcs:unknown[]}}}).__hearthwild;
        const durations:number[]=[],cpu:number[]=[],simulation:number[]=[],ui:number[]=[];
        const observer=new PerformanceObserver(list=>{for(const e of list.getEntries())ui.push(e.duration);});
        try{observer.observe({type:'longtask',buffered:false});}catch{/* unsupported */}
        let previous=performance.now();
        for(let n=0;n<180;n++){
          await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
          const now=performance.now();durations.push(now-previous);previous=now;
          cpu.push(api.stats().renderMs);simulation.push(api.frame().performance.stepMs);
        }
        observer.disconnect();
        const summary=(a:number[])=>{a.sort((x,y)=>x-y);return {median:a[Math.floor(a.length/2)]??0,p95:a[Math.floor(a.length*.95)]??0,max:a.at(-1)??0};};
        const frame=api.frame();
        return {frameIntervalMs:summary(durations),renderCpuMs:summary(cpu),simulationMs:summary(simulation),
          longTasks:{count:ui.length,totalMs:ui.reduce((a,b)=>a+b,0)},stats:api.stats(),
          villagers:frame.npcs.length,creatures:frame.performance.population,detailed:frame.performance.detailed};
      });
      samples.push({dense,quality,...metrics});
      if(metrics.stats.assetError)throw Error(metrics.stats.assetError);
    }
  }
  await mkdir('artifacts',{recursive:true});
  await page.screenshot({path:'artifacts/hd-aqualia-prototype.png'});
  const report={recordedAt:new Date().toISOString(),browser:browser.version(),viewport:{width:1920,height:1080},
    inference:'mocked local requests; no real Ollama contention measured',samples,failures,
    limitations:'180 rAF samples per scene/tier, warmed prototype assets; CPU render preparation is not GPU draw timing. Tracked texture estimates exclude driver/geometry/fonts. HD production residency and sustained minimum hardware performance require requalification with approved source art.'};
  await writeFile('artifacts/render-benchmark.json',JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  if(failures.length)throw Error('Browser errors during render benchmark');
} finally{await browser?.close();server.kill();}

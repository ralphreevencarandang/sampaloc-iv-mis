import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { test } from 'node:test';
import { build } from 'esbuild';
import puppeteer from 'puppeteer';

test('announcement creator selector and fixed Secretary attribution work through real RHF at desktop/mobile sizes', {
  skip:process.env.RUN_ANNOUNCEMENT_BROWSER_TESTS!=='1',timeout:180000,
},async()=>{
  const bundle=await build({
    stdin:{resolveDir:process.cwd(),loader:'tsx',sourcefile:'announcement-creator-fixture.tsx',contents:`
      import React from 'react';import{createRoot}from'react-dom/client';
      import{QueryClient,QueryClientProvider}from'@tanstack/react-query';
      import{AdminRbacProvider}from'./components/providers/admin-rbac-provider';
      import Form from './components/ui/Admin/AnnouncementModalForm';
      const config=new URLSearchParams(location.search);const secretary=config.has('secretary'),edit=config.has('edit');
      window.process={env:{NODE_ENV:'production'}};window.calls=[];window.closes=0;
      const initial={id:'existing',title:'Synthetic announcement',content:'Synthetic content',image:null,isArchive:false,createdAt:new Date().toISOString(),createdById:'former',createdBy:{firstName:'Former',lastName:'Official',position:'Former position'}};
      createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient()}><AdminRbacProvider role="ADMIN" email={secretary?'belen.movido@sampaloc4.gov.ph':'admin@sampalociv.com'}><Form isOpen mode={edit?'edit':'create'} initialData={edit?initial:null} onClose={()=>window.closes++}/></AdminRbacProvider></QueryClientProvider>);
    `},bundle:true,write:false,format:'iife',platform:'browser',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"','process.env':'{}'},
    plugins:[{name:'capture-action',setup(builder){
      builder.onResolve({filter:/server\/actions\/announcement.actions/},args=>({path:args.path,namespace:'capture'}));
      builder.onLoad({filter:/.*/,namespace:'capture'},()=>({loader:'js',contents:`
        async function capture(id,form){window.calls.push({id,values:Object.fromEntries(form)});return{success:false,message:'Synthetic failure: draft retained.'};}
        export async function createAnnouncementAction(form){return capture(null,form)}
        export async function updateAnnouncementAction(id,form){return capture(id,form)}
      `}));
    }}],
  });
  const css=readdirSync('.next/static/chunks').filter(f=>f.endsWith('.css')).map(f=>readFileSync('.next/static/chunks/'+f,'utf8')).join('\n');
  mkdirSync('.next/test-artifacts',{recursive:true});
  const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
  try{
    const page=await browser.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.setRequestInterception(true);page.on('request',request=>{void request.respond({status:200,contentType:'text/html',body:'<html><head><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body><div id="root"></div></body></html>'})});
    const load=async(query:string)=>{await page.goto('https://announcement-fixture.invalid/?'+query);await page.addStyleTag({content:css});await page.addScriptTag({content:bundle.outputFiles[0].text});try{await page.waitForSelector('#createdById',{timeout:10000});}catch(error){assert.deepEqual(errors,[], 'Fixture page errors');throw error}};
    const submit=()=>page.$eval('form',el=>(el as HTMLFormElement).requestSubmit());
    const calls=()=>page.evaluate(()=>(window as unknown as {calls:{id:string|null;values:Record<string,string>}[]}).calls);
    const choose=async(name:string)=>{await page.click('#createdById');await page.waitForSelector('[role="option"]');const options=await page.$$('[role="option"]');for(const option of options){if(await option.evaluate(el=>el.textContent)===name){await option.click();return;}}throw Error('Missing official option: '+name);};
    for(const mobile of [false,true]){
      await page.setViewport({width:mobile?390:1280,height:900,isMobile:mobile,hasTouch:mobile});
      await load('');await page.type('#title','Synthetic announcement',{delay:10});await page.type('#content','Synthetic content',{delay:10});await submit();
      await page.waitForSelector('#creator-error');assert.equal((await calls()).length,0);
      await page.click('#createdById');await page.waitForSelector('[role="option"]');assert.equal((await page.$$('[role="option"]')).length,11);
      // Escape dismisses the popup and restores focus to the trigger.
      await page.keyboard.press('Escape');await page.waitForFunction(()=>document.activeElement?.id==='createdById');
      await choose('Imelda M. Villa');await submit();await page.waitForFunction(()=>(window as unknown as {calls:unknown[]}).calls.length===1);
      assert.equal((await calls())[0].values.creatorName,'Imelda M. Villa');assert.equal((await calls())[0].id,null);
      assert.equal(await page.$eval('#title',el=>(el as HTMLInputElement).value),'Synthetic announcement');assert.equal(await page.evaluate(()=>(window as unknown as {closes:number}).closes),0);
      await page.screenshot({path:'.next/test-artifacts/announcement-admin-'+(mobile?'mobile':'desktop')+'.png',fullPage:true});
      await load('secretary');assert.equal(await page.$('[role="combobox"]'),null);
      assert.equal(await page.$eval('#createdById',el=>(el as HTMLInputElement).readOnly),true);assert.equal(await page.$eval('#createdById',el=>(el as HTMLInputElement).value),'Belen P. Movido');
      await page.type('#title','Synthetic announcement',{delay:10});await page.type('#content','Synthetic content',{delay:10});await submit();await page.waitForFunction(()=>(window as unknown as {calls:unknown[]}).calls.length===1);
      assert.equal('creatorName' in (await calls())[0].values,false);
      await load('secretary&edit');assert.equal(await page.$eval('#createdById',el=>(el as HTMLInputElement).value),'Former Official');await submit();await page.waitForFunction(()=>(window as unknown as {calls:unknown[]}).calls.length===1);assert.equal('creatorName' in (await calls())[0].values,false);
      await load('edit');assert.match(await page.$eval('#createdById',el=>el.textContent||''),/Former Official/);await submit();await page.waitForFunction(()=>(window as unknown as {calls:unknown[]}).calls.length===1);assert.equal('creatorName' in (await calls())[0].values,false);
      await choose('Belen P. Movido');await submit();await page.waitForFunction(()=>(window as unknown as {calls:unknown[]}).calls.length===2);assert.equal((await calls())[1].values.creatorName,'Belen P. Movido');
      await choose('Keep original: Former Official');await submit();await page.waitForFunction(()=>(window as unknown as {calls:unknown[]}).calls.length===3);assert.equal('creatorName' in (await calls())[2].values,false);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    }
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
});

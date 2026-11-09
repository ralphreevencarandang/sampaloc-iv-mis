import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdirSync } from 'node:fs';
import { test } from 'node:test';
import { build } from 'esbuild';
import puppeteer from 'puppeteer';

test('email form validates, preserves drafts, blocks duplicates and handles acceptance at desktop/mobile widths', {
  skip: process.env.RUN_STAFF_EMAIL_BROWSER_TESTS !== '1', timeout: 180000,
}, async () => {
  const bundle = await build({
    stdin: { resolveDir: process.cwd(), loader: 'tsx', sourcefile: 'staff-email-fixture.tsx', contents: `
      import React from 'react';import {createRoot} from 'react-dom/client';import {Toaster} from 'react-hot-toast';
      import Form from './components/ui/Admin/SendEmailForm';
      window.calls=[];window.mode='rejected';window.offset=0;
      const originalNow=Date.now;Date.now=()=>originalNow()+window.offset;
      createRoot(document.getElementById('root')).render(<main className="p-4 md:p-8 bg-surface-muted min-h-screen"><h1 className="mb-6 text-3xl font-bold text-content">Send Email</h1><Form/><Toaster/></main>);
    ` }, bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [{name:'capture-action',setup(builder){
      builder.onResolve({filter:/server\/actions\/staff-email.actions/},args=>({path:args.path,namespace:'capture'}));
      builder.onLoad({filter:/.*/,namespace:'capture'},()=>({resolveDir:process.cwd(),loader:'js',contents:`
        export async function sendStaffEmailAction(input){
          window.calls.push(input);
          if(window.mode==='hold')await new Promise(resolve=>window.release=resolve);
          return window.mode==='success'?{success:true,message:'Email accepted for sending.',retryAfterSeconds:60}
            :window.mode==='uncertain'?{success:false,message:'Sending could not be confirmed.',retryAfterSeconds:60,canRetry:false}
            :{success:false,message:'The email was not accepted by the email service.',retryAfterSeconds:60,canRetry:true};
        }
      ` }));
    }}],
  });
  const css=readdirSync('.next/static/chunks').filter(f=>f.endsWith('.css')).map(f=>readFileSync('.next/static/chunks/'+f,'utf8')).join('\n');
  mkdirSync('.next/test-artifacts',{recursive:true});
  const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
  try{
    const page=await browser.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));
    await page.setRequestInterception(true);page.on('request',request=>{void request.respond({status:200,contentType:'text/html',body:'<html><head><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body><div id="root"></div></body></html>'})});
    const submit=()=>page.$eval('form',el=>(el as HTMLFormElement).requestSubmit());
    const advance=async()=>{await page.evaluate(()=>{(window as unknown as {offset:number}).offset+=61000;});await page.waitForFunction(()=>!(document.querySelector('button[type="submit"]') as HTMLButtonElement)?.disabled);};
    const fill=async()=>{await page.type('#email-recipient','recipient@example.invalid',{delay:10});await page.type('#email-subject','  Test subject  ',{delay:10});await page.type('#email-message','  Synthetic message\n<script>literal text</script>  ',{delay:5});};
    for(const mobile of [false,true]){
      await page.setViewport({width:mobile?390:1280,height:900,isMobile:mobile,hasTouch:mobile});
      await page.goto('https://staff-email-fixture.invalid/');
      await page.addStyleTag({content:css});await page.addScriptTag({content:bundle.outputFiles[0].text});await page.waitForSelector('#email-recipient');
      await page.click('button[type="submit"]');await page.waitForFunction(()=>document.querySelectorAll('[role="alert"]').length>=3);
      assert.equal(await page.evaluate(()=>(window as unknown as {calls:unknown[]}).calls.length),0);
      await fill();await submit();await page.waitForFunction(()=>document.body.textContent?.includes('not accepted by the email service'));
      assert.equal(await page.evaluate(()=>(window as unknown as {calls:unknown[]}).calls.length),1);
      assert.equal(await page.$eval('#email-subject',el=>(el as HTMLInputElement).value),'  Test subject  ');
      assert.equal(await page.$eval('#email-message',el=>(el as HTMLTextAreaElement).value),'  Synthetic message\n<script>literal text</script>  ');
      assert.equal(await page.$eval('button[type="submit"]',el=>(el as HTMLButtonElement).disabled),true);
      await submit();assert.equal(await page.evaluate(()=>(window as unknown as {calls:unknown[]}).calls.length),1);
      await advance();await page.evaluate(()=>{(window as unknown as {mode:string}).mode='hold';});
      await submit();await submit();await page.waitForFunction(()=>!!(window as unknown as {release:unknown}).release);
      assert.equal(await page.evaluate(()=>(window as unknown as {calls:unknown[]}).calls.length),2);
      assert.equal(await page.$eval('#email-recipient',el=>el.matches(':disabled')),true);
      assert.equal(await page.$eval('button[type="submit"]',el=>(el as HTMLButtonElement).disabled),true);
      await page.evaluate(()=>{const w=window as unknown as {mode:string;release:()=>void};w.mode='success';w.release();});
      await page.waitForFunction(()=>(document.querySelector('#email-message') as HTMLTextAreaElement)?.value==='');
      assert.match(await page.evaluate(()=>document.body.textContent||''),/Email accepted for sending/);
      const calls=await page.evaluate(()=>(window as unknown as {calls:{recipient:string;subject:string;message:string;submissionId:string}[]}).calls);
      assert.equal(calls[1].subject,'Test subject');assert.equal(calls[1].message,'Synthetic message\n<script>literal text</script>');assert.notEqual(calls[0].submissionId,calls[1].submissionId);
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.screenshot({path:'.next/test-artifacts/staff-email-'+(mobile?'mobile':'desktop')+'.png',fullPage:true});
      await advance();await fill();await page.evaluate(()=>{(window as unknown as {mode:string}).mode='uncertain';});
      await submit();await page.waitForFunction(()=>document.body.textContent?.includes('could not be confirmed'));
      await advance();await submit();await page.waitForFunction(()=>(window as unknown as {calls:unknown[]}).calls.length===4);
      const retried=await page.evaluate(()=>(window as unknown as {calls:{submissionId:string}[]}).calls);
      assert.equal(retried[2].submissionId,retried[3].submissionId);
    }
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
});

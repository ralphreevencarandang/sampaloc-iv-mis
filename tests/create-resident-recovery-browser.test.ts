import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { test } from 'node:test';
import { build } from 'esbuild';
import puppeteer from 'puppeteer';

test('Create Resident validates, transports only FormData, preserves failures and refreshes after success', {
  skip: process.env.RUN_RESIDENT_CREATE_BROWSER_TESTS !== '1', timeout: 180000,
}, async () => {
  const bundle = await build({
    stdin: { resolveDir: process.cwd(), sourcefile: 'create-recovery-fixture.tsx', loader: 'tsx', contents: `
      import React,{useState} from 'react';import {createRoot} from 'react-dom/client';
      import {QueryClient,QueryClientProvider,useQuery} from '@tanstack/react-query';
      import Modal from './components/ui/Admin/CreateResidentModal';
      window.outcome='duplicate';window.refetches=0;window.rows=[];
      function App(){const [open,setOpen]=useState(true);const {data=[]}=useQuery({queryKey:['residents'],queryFn:async()=>{window.refetches++;return [...window.rows]}});return <><button id="open" onClick={()=>setOpen(true)}>Open modal</button><div id="rows">{data.map(row=><p key={row}>Synthetic Resident</p>)}</div><Modal isOpen={open} onClose={()=>setOpen(false)}/></>}
      createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><App/></QueryClientProvider>);
    ` }, bundle: true, write: false, platform: 'browser', format: 'iife', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [{name:'synthetic-action',setup(builder){
      builder.onResolve({filter:/server\/actions\/resident.actions/},args=>({path:args.path,namespace:'synthetic-action'}));
      builder.onLoad({filter:/.*/,namespace:'synthetic-action'},()=>({resolveDir:process.cwd(),loader:'js',contents:`
        import {createServerReference,encodeReply} from 'next/dist/compiled/react-server-dom-turbopack/client.browser';
        export const createAdminResidentAction=createServerReference('synthetic',async(_id,args)=>{
          const body=await encodeReply(args);window.sentFields=Object.fromEntries(args[0]);
          if(window.outcome==='transport')throw new Error('synthetic-internal-detail');
          if(window.outcome==='hold')await new Promise(resolve=>window.release=resolve);
          const response=await fetch('https://fixture.invalid/action?outcome='+window.outcome,{method:'POST',body});
          const result=await response.json();if(result.success)window.rows.push('synthetic');return result;
        });
      ` }));
    }}],
  });
  const css=readdirSync('.next/static/chunks').filter(f=>f.endsWith('.css')).map(f=>readFileSync('.next/static/chunks/'+f,'utf8')).join('\n');
  const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
  try {
    const page=await browser.newPage();const errors:string[]=[];const requests:string[]=[];
    page.on('pageerror',e=>errors.push(String(e)));await page.setRequestInterception(true);
    page.on('request',request=>{
      if(request.url().includes('/action?')){
        requests.push(request.method());const duplicate=request.url().includes('duplicate');
        void request.respond({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:JSON.stringify(duplicate?{success:false,message:'Email is already registered.',fieldErrors:{email:'Email is already registered.'}}:{success:true,message:'Created'})});
      }else void request.respond({status:200,contentType:'text/html',body:'<html><head><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body><div id="root"></div></body></html>'});
    });
    const submit=async()=>{await page.$eval('form',el=>(el as HTMLFormElement).requestSubmit());};
    for(const mobile of [false,true]){
      await page.setViewport({width:mobile?390:1280,height:850,isMobile:mobile,hasTouch:mobile});
      await page.goto('https://fixture.invalid/');await page.addStyleTag({content:css});await page.addScriptTag({content:bundle.outputFiles[0].text});
      await page.waitForSelector('#create-email');const before=requests.length;
      await page.click('button[type="submit"]');await page.waitForSelector('[role="alert"]');assert.equal(requests.length,before);
      assert.match(await page.$eval('[role="alert"]',el=>el.textContent||''),/required|valid/);
      for(const [name,value]of Object.entries({email:'synthetic@example.invalid',password:'Example123!',confirmPassword:'Example123!',firstName:'Synthetic',lastName:'Resident',street:'Test',houseNumber:'1',contactNumber:'9123456789',idNumber:'synthetic-id'}))await page.type('#create-'+name,value,{delay:15});
      await page.$eval('#create-birthDate',el=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(el,'2000-01-01');el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
      for(const [name,value]of Object.entries({gender:'Female',civilStatus:'Single',isVoter:'No',idType:'National ID'}))await page.select('#create-'+name,value);
      const file=async(type:string,size=8)=>page.$eval('#create-validIDImage',(el,{type,size})=>{const d=new DataTransfer();d.items.add(new File([new Uint8Array(size)],type==='image/png'?'id.png':'id.pdf',{type}));(el as HTMLInputElement).files=d.files;el.dispatchEvent(new Event('change',{bubbles:true}));},{type,size});
      await file('application/pdf');await submit();await page.waitForFunction(()=>document.querySelector('[role="alert"]')?.textContent?.includes('JPG'));assert.equal(requests.length,before);
      await file('image/png',5*1024*1024+1);await submit();await page.waitForFunction(()=>document.querySelector('[role="alert"]')?.textContent?.includes('5MB'));assert.equal(requests.length,before);
      await file('image/png');
      await page.$eval('#create-contactNumber',el=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(el,'8123456789');el.dispatchEvent(new Event('input',{bubbles:true}));});
      await submit();await page.waitForFunction(()=>document.querySelector('[role="alert"]')?.textContent?.includes('Philippine'));assert.equal(requests.length,before);
      await page.$eval('#create-contactNumber',el=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(el,'9123456789');el.dispatchEvent(new Event('input',{bubbles:true}));});
      await submit();await page.waitForFunction(()=>document.querySelector('[role="alert"]')?.textContent?.includes('already registered'));
      assert.equal(requests.length,before+1);assert.equal(await page.$eval('#create-email',el=>(el as HTMLInputElement).value),'synthetic@example.invalid');
      assert.equal(await page.$eval('#create-validIDImage',el=>(el as HTMLInputElement).files?.length),1);
      await page.evaluate(()=>{(window as unknown as {outcome:string}).outcome='transport';});await submit();await page.waitForFunction(()=>document.querySelector('[role="alert"]')?.textContent?.includes('Unable to create resident'));
      assert.equal(await page.$eval('[role="alert"]',el=>el.textContent?.includes('synthetic-internal-detail')),false);
      await page.evaluate(()=>{(window as unknown as {outcome:string}).outcome='hold';});await submit();await page.waitForFunction(()=>!!(window as unknown as {release:unknown}).release);
      assert.equal(await page.$eval('button[type="submit"]',el=>(el as HTMLButtonElement).disabled),true);
      assert.equal(await page.$eval('[aria-label="Close"]',el=>(el as HTMLButtonElement).disabled),true);
      assert.equal(await page.$eval('fieldset',el=>(el as HTMLFieldSetElement).disabled),true);
      await page.evaluate(()=>{const w=window as unknown as {outcome:string;release:()=>void};w.outcome='success';w.release();});
      await page.waitForFunction(()=>!document.querySelector('[role="dialog"]')&&document.querySelector('#rows')?.textContent?.includes('Synthetic Resident'));
      assert.equal(await page.evaluate(()=>(window as unknown as {sentFields:Record<string,string>}).sentFields.contactNumber),'+639123456789');
      assert.ok(await page.evaluate(()=>(window as unknown as {refetches:number}).refetches>=2));
      await page.click('#open');await page.waitForSelector('#create-email');assert.equal(await page.$eval('#create-email',el=>(el as HTMLInputElement).value),'');
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth),true);
    }
    assert.deepEqual(errors,[]);assert.ok(requests.every(method=>method==='POST'));
  }finally{await browser.close();}
});

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import puppeteer from 'puppeteer';

test('resident IDs and VAWC contact fields work with real React forms at desktop and mobile widths', { skip: process.env.RUN_ID_VAWC_BROWSER_TESTS !== '1', timeout: 180000 }, async () => {
  const bundle = await build({
    stdin: { resolveDir: process.cwd(), sourcefile: 'id-vawc-fixture.tsx', loader: 'tsx', contents: `
      import React from 'react'; import { createRoot } from 'react-dom/client';
      import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
      import Resident from './components/ui/Admin/ResidentFormModal';
      import Vawc from './components/ui/Admin/VawcModalForm';
      const resident={id:'synthetic',email:'synthetic@example.invalid',firstName:'Synthetic',lastName:'Resident',birthDate:'2000-01-01',gender:'Female',civilStatus:'Single',street:'Synthetic',houseNumber:'1',contactNumber:'09123456789',citizenship:'Filipino',isVoter:false,is4Ps:false,isPwd:false,status:'APPROVED'};
      const vawc={id:'synthetic',victimName:'Synthetic Victim',victimAge:30,victimSex:'Female',victimCivilStatus:'Single',victimAddress:'Synthetic street',victimContactNumber:'09123456789',isMinor:false,respondentName:'Synthetic Respondent',respondentAge:31,respondentSex:'Male',respondentAddress:'Synthetic street',respondentContactNumber:'+63 912-345-6789',relationshipToVictim:'OTHER',abuseType:'PHYSICAL',narrative:'Synthetic test narrative',incidentDate:'2026-11-09T10:00:00Z',incidentLocation:'Synthetic location',status:'REPORTED'};
      window.fetch=async()=>Response.json({idType:'National ID',idNumber:'synthetic-id',imageUrl:window.noImage?null:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6XkAAAAASUVORK5CYII='});
      window.renderForm=mode=>createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}>{mode==='resident'?<Resident isOpen onClose={()=>{}} initialData={resident}/>:<Vawc isOpen onClose={()=>{}} initialData={vawc}/>}</QueryClientProvider>);
    ` }, bundle:true, write:false, platform:'browser', format:'iife', jsx:'automatic', define:{'process.env.NODE_ENV':'"production"'},
    plugins:[{name:'synthetic',setup(builder){
      builder.onResolve({filter:/server\/actions\/|^next\/image$|admin-rbac-provider$/},args=>({path:args.path,namespace:'synthetic'}));
      builder.onLoad({filter:/.*/,namespace:'synthetic'},args=>({resolveDir:process.cwd(),loader:'jsx',contents:
        args.path.includes('server/actions') ? `const capture=async(...args)=>{window.captured=Object.fromEntries(args.find(a=>a instanceof FormData));return {success:false,message:'Synthetic capture'}};export const updateResidentAction=capture,createVawc=capture,updateVawc=capture;`
        :args.path.includes('admin-rbac-provider') ? `export const useAdminRbac=()=>({role:window.role||'ADMIN',can:()=>window.role!=='CLERK'});`
        :`import React from 'react';export default function Image({unoptimized,...props}){return <img {...props}/>;}` }));
    }}],
  });
  const browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
  try {
    const page=await browser.newPage(); const errors:string[]=[];page.on('pageerror',e=>errors.push(String(e)));
    const render=async(mode:string,role='ADMIN',noImage=false)=>{
      await page.setContent('<html><head><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body><div id="root"></div></body></html>');
      await page.addScriptTag({content:bundle.outputFiles[0].text});
      await page.evaluate(({mode,role,noImage})=>{Object.assign(window,{role,noImage,captured:undefined});(window as unknown as {renderForm:(m:string)=>void}).renderForm(mode);},{mode,role,noImage});
    };
    const replace=async(selector:string,value:string)=>{await page.click(selector);await page.keyboard.down('Control');await page.keyboard.press('A');await page.keyboard.up('Control');await page.keyboard.press('Backspace');await page.type(selector,value);};
    for(const mobile of [false,true]){
      await page.setViewport({width:mobile?390:1280,height:850,isMobile:mobile,hasTouch:mobile});
      await render('resident');await page.waitForSelector('[aria-label="View larger valid ID"]');
      assert.match(await page.evaluate(()=>document.body.textContent),/National ID/);assert.match(await page.evaluate(()=>document.body.textContent),/synthetic-id/);
      assert.equal(await page.$('input[type="file"]'),null);
      await page.click('[aria-label="View larger valid ID"]');await page.waitForSelector('dialog[open]');
      await page.keyboard.press('Escape');await page.waitForFunction(()=>!document.querySelector('dialog[open]'));
      await page.$eval('form', el => (el as HTMLFormElement).requestSubmit());try { await page.waitForFunction(()=>!!(window as unknown as {captured:unknown}).captured,{timeout:5000}); } catch { throw Error(await page.evaluate(()=>document.body.innerText)); }
      const residentSaved=await page.evaluate(()=>(window as unknown as {captured:Record<string,string>}).captured);
      assert.equal('validIDImage' in residentSaved,false);assert.equal('idNumber' in residentSaved,false);
      await render('resident','CLERK');await page.waitForSelector('[aria-label="View larger valid ID"]');assert.equal(await page.$('button[type="submit"]'),null);
      assert.equal(await page.$eval('#firstName',el=>(el as HTMLInputElement).disabled||!!el.closest('fieldset[disabled]')),true);
      await page.click('[aria-label="View larger valid ID"]');await page.waitForSelector('dialog[open]');
      await render('resident','ADMIN',true);await page.waitForFunction(()=>document.body.textContent?.includes('No valid ID image uploaded.'));
      await render('vawc');await page.waitForSelector('#victimContactNumber');
      for(const id of ['victimContactNumber','respondentContactNumber']){
        assert.equal(await page.$eval('#'+id,el=>(el as HTMLInputElement).value),'9123456789');
        await replace('#'+id,'9a!123456789000');assert.equal(await page.$eval('#'+id,el=>(el as HTMLInputElement).value),'9123456789');
        assert.match(await page.$eval('#'+id,el=>el.parentElement?.textContent ?? ''),/\+63/);
        await replace('#'+id,'8123456789');
      }
      await page.$eval('form', el => (el as HTMLFormElement).requestSubmit());await page.waitForFunction(()=>document.querySelectorAll('[role="alert"]').length>0);
      for(const id of ['victimContactNumber','respondentContactNumber'])await replace('#'+id,'9123456789');
      await page.$eval('form', el => (el as HTMLFormElement).requestSubmit());await page.waitForFunction(()=>!!(window as unknown as {captured:unknown}).captured);
      const saved=await page.evaluate(()=>(window as unknown as {captured:Record<string,string>}).captured);
      assert.equal(saved.victimContactNumber,'+639123456789');assert.equal(saved.respondentContactNumber,'+639123456789');
    }
    assert.deepEqual(errors,[]);
  }finally{await browser.close();}
});

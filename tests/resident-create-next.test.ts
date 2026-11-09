import assert from 'node:assert/strict';
import { test } from 'node:test';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { v2 as cloudinary } from 'cloudinary';
import { createServer } from 'node:net';
import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../app/generated/prisma/client';
import puppeteer, { type Page } from 'puppeteer';

dotenv.config({ path: ['.env.local', '.env'], quiet: true });
test('real Next registration and authenticated Admin/Secretary creation persist rows and decode action outcomes', {
  skip: process.env.RUN_RESIDENT_NEXT_TESTS !== '1', timeout: 300000,
}, async () => {
  const stamp = randomUUID().replaceAll('-', '');
  const schema = 'resident_next_test_' + stamp;
  assert.match(schema, /^resident_next_test_[a-f0-9]{32}$/);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3, connectionTimeoutMillis: 10000, idleTimeoutMillis: 1000 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
  let created = false;
  let child: ReturnType<typeof spawn> | undefined;
  let browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined;
  let serverLog = '';
  try {
    const source = (await pool.query('SELECT current_schema() AS name')).rows[0].name as string;
    assert.match(source, /^[a-zA-Z_][a-zA-Z0-9_]*$/);
    await pool.query('CREATE SCHEMA "' + schema + '"');created = true;
    for (const table of ['Resident', 'Admin']) await pool.query('CREATE TABLE "' + schema + '"."' + table + '" (LIKE "' + source + '"."' + table + '" INCLUDING ALL)');
    await pool.query(`CREATE TYPE "${schema}"."VerificationStatus" AS ENUM ('PENDING','APPROVED','DECLINED')`);
    await pool.query(`CREATE TYPE "${schema}"."AdminRole" AS ENUM ('ADMIN','CLERK','SK','PEACE_AND_ORDER','PUNONG_BARANGAY','HEALTH_WORKER')`);
    await pool.query(`ALTER TABLE "${schema}"."Resident" ALTER COLUMN "status" DROP DEFAULT`);
    await pool.query(`ALTER TABLE "${schema}"."Resident" ALTER COLUMN "status" TYPE "${schema}"."VerificationStatus" USING "status"::text::"${schema}"."VerificationStatus"`);
    await pool.query(`ALTER TABLE "${schema}"."Resident" ALTER COLUMN "status" SET DEFAULT 'PENDING'::"${schema}"."VerificationStatus"`);
    await pool.query(`ALTER TABLE "${schema}"."Admin" ALTER COLUMN "role" TYPE "${schema}"."AdminRole" USING "role"::text::"${schema}"."AdminRole"`);
    const password='Synthetic123!';const hash=await bcrypt.hash(password,10);
    for (const role of ['ADMIN','CLERK'] as const) await prisma.admin.create({data:{name:'Synthetic Staff',email:role.toLowerCase()+'@example.invalid',password:hash,role}});
    const reservation=createServer();await new Promise<void>(r=>reservation.listen(0,'127.0.0.1',r));const port=(reservation.address() as {port:number}).port;await new Promise<void>((r,j)=>reservation.close(e=>e?j(e):r()));
    const origin='http://127.0.0.1:'+port;
    const connection=new URL(process.env.DATABASE_URL!);
    child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{cwd:process.cwd(),env:{...process.env,DATABASE_URL:connection.toString(),AUTH_SESSION_SECRET:'synthetic-fixture-session-secret-2026',MIS_NEXT_FIXTURE_SCHEMA:schema,NODE_OPTIONS:'--import "'+pathToFileURL(resolve('tests/fixtures/resident-create-next-preload.cjs')).href+'"'},stdio:['ignore','pipe','pipe']});
    child.stdout?.on('data',b=>{serverLog+=String(b)});child.stderr?.on('data',b=>{serverLog+=String(b)});
    for(let i=0;i<90;i++){if(child.exitCode!==null)throw Error('Fixture server stopped');try{const r=await fetch(origin+'/register');if(r.status===200)break}catch{}await new Promise(r=>setTimeout(r,500));if(i===89)throw Error('Fixture server did not start')}
    browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
    const records:{path:string;status:number;action:boolean;rsc:boolean;success:boolean;failure:boolean;bodyError?:string;result?:unknown}[]=[];
    const browserErrors:string[]=[];
    const responseWork:Promise<void>[]=[];
    const newPage=async()=>{const context=await browser!.createBrowserContext();const page=await context.newPage();
      await page.evaluateOnNewDocument(()=>{
        const original=window.fetch;
        const trace:unknown[]=[];Object.assign(window,{actionTrace:trace});
        window.fetch=async(...args)=>{
          const response=await original(...args);
          if(args[1]?.method==='POST'&&new Headers(args[1].headers).has('next-action')){
            const body=await response.clone().text();
            const line=body.split('\n').find(l=>/"success":(?:true|false)/.test(l));
            let result:unknown=null;if(line){try{const data=JSON.parse(line.slice(line.indexOf(':')+1));result={success:data.success,message:data.message,fields:Object.keys(data.fieldErrors||{})}}catch{}}
            trace.push({path:new URL(String(args[0]),location.href).pathname,status:response.status,result});
          }
          return response;
        };
      });page.on('pageerror',e=>browserErrors.push(String(e)));page.on('response',res=>{if(res.request().method()==='POST')responseWork.push((async()=>{const record:{path:string;status:number;action:boolean;rsc:boolean;success:boolean;failure:boolean;bodyError?:string;result?:unknown}={path:new URL(res.url()).pathname,status:res.status(),action:!!res.request().headers()['next-action'],rsc:res.headers()['content-type']?.includes('text/x-component')||false,success:false,failure:false};records.push(record);try{const body=await res.text();record.success=body.includes('"success":true');record.failure=body.includes('"success":false');const line=body.split('\n').find(l=>/"success":(?:true|false)/.test(l));if(line)record.result=JSON.parse(line.slice(line.indexOf(':')+1));}catch(error){record.bodyError=String(error)}})())});return page};
    const fill=async(page:Page,mode:'public'|'admin',email:string,index:number)=>{
      const selector=(name:string)=>mode==='admin'?'#create-'+name:'[name="'+name+'"]';
      for(const [name,value]of Object.entries({email,password:'Example123!',confirmPassword:'Example123!',firstName:'Synthetic',lastName:'Resident',street:'Test',houseNumber:'1',citizenship:'Filipino',contactNumber:'9123456789'}))await page.type(selector(name),value,{delay:15});
      await page.$eval(selector('birthDate'),el=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(el,'2000-01-01');el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));});
      for(const [name,value]of Object.entries({gender:'Female',civilStatus:'Single',isVoter:'No',idType:'National ID'}))await page.select(selector(name),value);
      await page.type(selector('idNumber'),'synthetic-'+index,{delay:15});
      await page.$eval('input[type="file"]',el=>{const d=new DataTransfer();d.items.add(new File([Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a6XkAAAAASUVORK5CYII='),c=>c.charCodeAt(0))],'id.png',{type:'image/png'}));(el as HTMLInputElement).files=d.files;el.dispatchEvent(new Event('change',{bubbles:true}));});
    };
    const publicPage=await newPage();await publicPage.goto(origin+'/register',{waitUntil:'networkidle0'});await fill(publicPage,'public','public-'+stamp+'@example.invalid',1);
    const responsePromise=publicPage.waitForResponse(r=>r.request().method()==='POST',{timeout:20000});
    await publicPage.$eval('form',el=>(el as HTMLFormElement).requestSubmit());
    await responsePromise;
    await publicPage.waitForFunction(()=>!(document.querySelector('button[type="submit"]') as HTMLButtonElement)?.disabled,{timeout:20000});
    await new Promise(r=>setTimeout(r,500));await Promise.all(responseWork);
    console.log(JSON.stringify({diagnostic:'public-action',safeFailure:serverLog.match(/register resident failed \{[^}]*\}/g),trace:await publicPage.evaluate(()=>(window as unknown as {actionTrace:unknown[]}).actionTrace),responses:records,browserErrors,fixtureAdapter:serverLog.includes('FIXTURE_ADAPTER_ACTIVE'),fixtureGuard:serverLog.includes('FIXTURE_QUERY_GUARD_BLOCKED'),stages:serverLog.match(/(?:resident-email-check|account-duplicate-check|password-hash|id-upload|resident-create|ID_UPLOAD_FAILED|P[0-9]{4}|UNKNOWN|Test schema boundary)/g)}));
    const publicRow=await prisma.resident.findUnique({where:{email:'public-'+stamp+'@example.invalid'},select:{id:true}});
    console.log(JSON.stringify({flow:'public',persisted:!!publicRow,path:new URL(publicPage.url()).pathname,responses:records,inlineError:await publicPage.evaluate(()=>Array.from(document.querySelectorAll('[role="alert"]')).length),serverFailure:serverLog.includes('register resident failed'),stages:serverLog.match(/(?:resident-email-check|account-duplicate-check|password-hash|id-upload|resident-create|ID_UPLOAD_FAILED|P[0-9]{4}|UNKNOWN|Test schema boundary)/g),feedback:await publicPage.evaluate(()=>document.body.innerText.split('\n').filter(line=>/unexpected|failed|already|unable|not configured|correct the|Invalid|Valid ID image is required/i.test(line)))}));
    assert.ok(publicRow,'Public resident was not persisted');
    for(const [index,role]of ['ADMIN','CLERK'].entries()){
      const page=await newPage();await page.goto(origin+'/AdminLogin',{waitUntil:'networkidle0'});
      await page.type('#email',role.toLowerCase()+'@example.invalid',{delay:15});await page.type('#password',password,{delay:15});await page.click('button[type="submit"]');
      await page.waitForFunction(()=>location.pathname!=='/AdminLogin',{timeout:15000});
      await page.goto(origin+'/admin/resident',{waitUntil:'networkidle0'});await page.waitForFunction(()=>Array.from(document.querySelectorAll('button')).some(b=>b.textContent?.includes('Create Resident')));
      await page.evaluate(()=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.includes('Create Resident'))?.click());
      await page.waitForSelector('#create-email');const email=role.toLowerCase()+'-resident-'+stamp+'@example.invalid';await fill(page,'admin',email,index+2);
      await page.click('button[type="submit"]');await page.waitForFunction(()=>!document.querySelector('[role="dialog"]'),{timeout:15000});
      assert.ok(await prisma.resident.findUnique({where:{email},select:{id:true}}));
      await page.waitForFunction(email=>document.body.textContent?.includes(email),{},email);
      await page.evaluate(()=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent?.includes('Create Resident'))?.click());
      await page.waitForSelector('#create-email');await fill(page,'admin',email,index+20);
      await page.$eval('form',el=>(el as HTMLFormElement).requestSubmit());
      await page.waitForFunction(()=>document.querySelector('[role="alert"]')?.textContent?.includes('already exists'));
      assert.equal(await page.$eval('#create-email',el=>(el as HTMLInputElement).value),email);
      await page.close();
    }
    const duplicate=await newPage();await duplicate.goto(origin+'/register',{waitUntil:'networkidle0'});
    await duplicate.click('button[type="submit"]');await duplicate.waitForSelector('[role="alert"]');
    await fill(duplicate,'public','public-'+stamp+'@example.invalid',99);
    await duplicate.$eval('form',el=>(el as HTMLFormElement).requestSubmit());
    await duplicate.waitForFunction(()=>document.querySelector('[role="alert"]')?.textContent?.includes('already exists'));
    assert.equal(await duplicate.$eval('[name="email"]',el=>(el as HTMLInputElement).value),'public-'+stamp+'@example.invalid');
    await pool.query('ALTER TABLE "'+schema+'"."Resident" RENAME TO "ResidentUnavailable"');
    const unavailable=await newPage();await unavailable.goto(origin+'/register',{waitUntil:'networkidle0'});
    await fill(unavailable,'public','unavailable-'+stamp+'@example.invalid',100);
    await unavailable.$eval('form',el=>(el as HTMLFormElement).requestSubmit());
    await unavailable.waitForFunction(()=>document.querySelector('[role="alert"]')?.textContent?.includes('unexpected error'));
    assert.equal(await unavailable.$eval('[name="email"]',el=>(el as HTMLInputElement).value),'unavailable-'+stamp+'@example.invalid');
    await pool.query('ALTER TABLE "'+schema+'"."ResidentUnavailable" RENAME TO "Resident"');
    assert.equal(await prisma.resident.count(),3);
    await Promise.all(responseWork);assert.ok(records.some(r=>r.path==='/admin/resident'&&r.status===200&&r.success&&r.action));
    assert.ok(records.some(r=>r.path==='/register'&&r.status===200&&r.failure&&r.action));
    console.log(JSON.stringify({verified:'all-three-flows-with-duplicate-and-database-failures',responses:records}));
  }finally{
    if(browser)await browser.close();
    if(child&&child.exitCode===null){child.kill();await new Promise<void>(r=>{child!.once('exit',()=>r());setTimeout(r,5000)})}
    const uploadedIds = new Set(serverLog.split('\n').filter(line => line.startsWith('FIXTURE_ASSET ')).map(line => JSON.parse(line.slice(14)).publicId as string));
    for (const table of ['Resident', 'ResidentUnavailable']) {
      try {
        const rows = await pool.query('SELECT "validIDImage" FROM "' + schema + '"."' + table + '"');
        for (const row of rows.rows) if (typeof row.validIDImage === 'string') {
          const stored = new URL(row.validIDImage).pathname.split('/image/upload/')[1];
          if (stored) uploadedIds.add(decodeURIComponent(stored.replace(/^v[0-9]+\//, '').replace(/\.[^./]+$/, '')));
        }
      } catch {}
    }
    try {
      cloudinary.config({ cloud_name: process.env.CLOUDINARY_CLOUD_NAME, api_key: process.env.CLOUDINARY_API_KEY, api_secret: process.env.CLOUDINARY_API_SECRET });
      for (const publicId of uploadedIds) {
        assert.ok(publicId.includes(stamp), 'Only fixture-owned upload IDs may be removed');
        assert.equal((await cloudinary.uploader.destroy(publicId, { resource_type: 'image' })).result, 'ok');
      }
      console.log(JSON.stringify({fixtureUploadsRemoved:uploadedIds.size}));
    } finally {
    await prisma.$disconnect();
    if(created){assert.match(schema,/^resident_next_test_[a-f0-9]{32}$/);await pool.query('DROP SCHEMA "'+schema+'" CASCADE')}
    await pool.end();
    }
  }
});

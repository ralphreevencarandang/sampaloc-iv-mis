import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { createServer, type Socket } from 'node:net';
import { resolve } from 'node:path';
import pg from 'pg';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { test } from 'node:test';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../app/generated/prisma/client';
import puppeteer, { type Page } from 'puppeteer';

dotenv.config({ path: ['.env.local', '.env'], quiet: true });

test('real Next email page, authenticated actions, persistent limits and captured SMTP delivery', {
  skip: process.env.RUN_STAFF_EMAIL_NEXT_TESTS !== '1', timeout: 240000,
}, async () => {
  const schema = 'staff_email_next_test_' + randomUUID().replaceAll('-', '');
  assert.match(schema, /^staff_email_next_test_[a-f0-9]{32}$/);
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 4, connectionTimeoutMillis: 20000, idleTimeoutMillis: 1000 });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool, { schema }) });
  let child: ReturnType<typeof spawn> | undefined, browser: Awaited<ReturnType<typeof puppeteer.launch>> | undefined, created = false;
  const sockets = new Set<Socket>(), captured: string[] = [];
  let mode = 'accept', accepted = 0;
  const smtp = createServer(socket => {
    sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.on('error',()=>{});
    let buffer = '', data = false;
    socket.write('220 localhost ESMTP fixture\r\n');
    socket.on('data',chunk=>{
      buffer+=String(chunk);
      for(;;){
        if(data){const end=buffer.indexOf('\r\n.\r\n');if(end<0)return;captured.push(buffer.slice(0,end));buffer=buffer.slice(end+5);data=false;if(mode==='uncertain'){socket.destroy();return;}accepted++;socket.write('250 2.0.0 queued\r\n');continue;}
        const end=buffer.indexOf('\r\n');if(end<0)return;const line=buffer.slice(0,end);buffer=buffer.slice(end+2);
        if(/^EHLO/i.test(line))socket.write('250-localhost\r\n250 AUTH PLAIN\r\n');
        else if(/^AUTH PLAIN /i.test(line)){const auth=Buffer.from(line.slice(11),'base64').toString();socket.write(auth==='\0fixture-user\0fixture-pass'?'235 2.7.0 authenticated\r\n':'535 5.7.0 rejected\r\n');}
        else if(/^MAIL FROM:/i.test(line))socket.write('250 2.1.0 sender ok\r\n');
        else if(/^RCPT TO:/i.test(line))socket.write(mode==='reject'?'550 5.1.1 recipient rejected\r\n':'250 2.1.5 recipient ok\r\n');
        else if(/^DATA$/i.test(line)){data=true;socket.write('354 End with dot\r\n');}
        else if(/^QUIT$/i.test(line)){socket.end('221 bye\r\n');return;}
        else socket.write('250 ok\r\n');
      }
    });
  });
  try {
    await new Promise<void>(r=>smtp.listen(0,'127.0.0.1',r));const smtpPort=(smtp.address() as {port:number}).port;
    let source='';
    for(let attempt=0;attempt<3;attempt++){try{source=(await pool.query('SELECT current_schema() AS name')).rows[0].name as string;break}catch(error){if(attempt===2)throw error}}
    assert.match(source,/^[a-zA-Z_][a-zA-Z0-9_]*$/);
    await pool.query('CREATE SCHEMA "'+schema+'"');created=true;
    for(const table of ['Admin','Resident'])await pool.query('CREATE TABLE "'+schema+'"."'+table+'" (LIKE "'+source+'"."'+table+'" INCLUDING ALL)');
    await pool.query(`CREATE TYPE "${schema}"."AdminRole" AS ENUM ('ADMIN','CLERK','SK','PEACE_AND_ORDER','PUNONG_BARANGAY','HEALTH_WORKER')`);
    await pool.query(`ALTER TABLE "${schema}"."Admin" ALTER COLUMN "role" TYPE "${schema}"."AdminRole" USING "role"::text::"${schema}"."AdminRole"`);
    await pool.query('CREATE TABLE "'+schema+'"."PasswordResetRateLimit" ("key" TEXT PRIMARY KEY,"count" INTEGER NOT NULL,"expiresAt" TIMESTAMP(3) NOT NULL)');
    const password='Synthetic123!', hash=await bcrypt.hash(password,10);
    for(const role of ['ADMIN','CLERK','SK','PEACE_AND_ORDER','PUNONG_BARANGAY'] as const)await prisma.admin.create({data:{name:'Synthetic Staff',email:role.toLowerCase()+'@example.invalid',password:hash,role}});
    const reservation=createServer();await new Promise<void>(r=>reservation.listen(0,'127.0.0.1',r));const port=(reservation.address() as {port:number}).port;await new Promise<void>((r,j)=>reservation.close(e=>e?j(e):r()));
    const origin='http://127.0.0.1:'+port;
    let log='';
    child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port',String(port)],{cwd:process.cwd(),env:{...process.env,DATABASE_URL:process.env.DATABASE_URL,AUTH_SESSION_SECRET:'synthetic-email-session-secret-2026',SMTP_HOST:'127.0.0.1',SMTP_PORT:String(smtpPort),SMTP_USER:'fixture-user',SMTP_PASSWORD:'fixture-pass',SMTP_FROM:'System <system@example.invalid>',MIS_EMAIL_FIXTURE_SCHEMA:schema,NODE_OPTIONS:'--require "'+resolve('tests/fixtures/staff-email-next-preload.cjs').replaceAll('\\','/')+'"'},stdio:['ignore','pipe','pipe']});
    child.stdout?.on('data',b=>{log+=String(b)});child.stderr?.on('data',b=>{log+=String(b)});
    for(let i=0;i<90;i++){if(child.exitCode!==null)throw Error('Fixture server stopped');try{const r=await fetch(origin+'/AdminLogin');if(r.status===200)break}catch{}await new Promise(r=>setTimeout(r,500));if(i===89)throw Error('Fixture server did not start')}
    const unauth=await fetch(origin+'/admin/send-email',{redirect:'manual'});assert.equal(unauth.status,307);assert.match(unauth.headers.get('location')||'',/AdminLogin/);
    browser=await puppeteer.launch({headless:true,args:['--no-sandbox']});
    let actionId='';
    const login=async(role:string)=>{const context=await browser!.createBrowserContext();const page=await context.newPage();await page.goto(origin+'/AdminLogin',{waitUntil:'networkidle0'});await page.type('#email',role.toLowerCase()+'@example.invalid',{delay:10});await page.type('#password',password,{delay:10});await page.click('button[type="submit"]');await page.waitForFunction(()=>location.pathname!=='/AdminLogin');return page;};
    const fill=async(page:Page,subject:string)=>{await page.type('#email-recipient','recipient@example.invalid',{delay:10});await page.type('#email-subject',subject,{delay:10});await page.type('#email-message','Synthetic message\n<script>literal text</script>',{delay:5});};
    const direct=async(page:Page,input:unknown,path="/register")=>page.evaluate(async({id,input,path})=>{const r=await fetch(path,{method:'POST',headers:{'Next-Action':id,Accept:'text/x-component','Content-Type':'text/plain;charset=UTF-8'},body:JSON.stringify([input])});return {status:r.status,redirect:r.headers.get("x-action-redirect"),location:r.headers.get("location"),body:await r.text()};},{id:actionId,input,path});
    let adminPage: Page | undefined;
    for(const role of ['ADMIN','CLERK']){
      const page=await login(role);await page.goto(origin+'/admin/send-email',{waitUntil:'networkidle0'});await page.waitForSelector('#email-recipient');
      assert.ok(await page.$('a[href="/admin/send-email"]'));
      page.on('request',request=>{if(request.method()==='POST'&&new URL(request.url()).pathname==='/admin/send-email')actionId=request.headers()['next-action']||actionId;});
      await fill(page,'Fixture '+role);await page.click('button[type="submit"]');
      await page.waitForFunction(()=>document.body.textContent?.includes('Email accepted for sending.'));
      assert.equal(await page.$eval('#email-message',el=>(el as HTMLTextAreaElement).value),'');
      const before=accepted;
      const replay=await direct(page,{recipient:'recipient@example.invalid',subject:'Fixture '+role,message:'Synthetic message\n<script>literal text</script>',submissionId:randomUUID()});
      assert.equal(replay.status,200);assert.match(replay.body,/already been accepted/);assert.equal(accepted,before);
      if(role==='ADMIN')adminPage=page;
    }
    assert.equal(accepted,2);assert.ok(actionId);
    for(const role of ['SK','PEACE_AND_ORDER','PUNONG_BARANGAY']){
      const page=await login(role);await page.goto(origin+'/admin/send-email',{waitUntil:'networkidle0'});assert.equal(await page.$('#email-recipient'),null);assert.equal(await page.$('a[href="/admin/send-email"]'),null);
      const denied=await direct(page,{recipient:'recipient@example.invalid',subject:'Blocked',message:'Blocked',submissionId:randomUUID()});assert.equal(denied.body,"{}"); // Next returns an empty forwarded-action result when proxy redirects the worker.
    }
    const context=await browser.createBrowserContext();const page=await context.newPage();await page.goto(origin+'/register',{waitUntil:'networkidle0'});
    assert.equal((await direct(page,{recipient:'recipient@example.invalid',subject:'Blocked',message:'Blocked',submissionId:randomUUID()})).body,"{}");
    assert.equal(accepted,2);
    // A legitimately issued ADMIN cookie remains optimistic after a role change;
    // the action must check the current database role independently of proxy.
    await prisma.admin.update({where:{email:'admin@example.invalid'},data:{role:'SK'}});
    const staleRole=await direct(adminPage!,{recipient:'recipient@example.invalid',subject:'Blocked stale role',message:'Blocked',submissionId:randomUUID()},'/admin/send-email');
    assert.match(staleRole.body,/do not have permission/);
    await prisma.admin.update({where:{email:'admin@example.invalid'},data:{role:'ADMIN'}});
    await prisma.passwordResetRateLimit.updateMany({where:{key:{startsWith:'staff-email:cooldown:'}},data:{expiresAt:new Date(0)}});
    mode='reject';await adminPage!.reload({waitUntil:'networkidle0'});await fill(adminPage!,'Provider rejection');await adminPage!.$eval('form',el=>(el as HTMLFormElement).requestSubmit());
    await adminPage!.waitForFunction(()=>document.body.textContent?.includes('not accepted by the email service'));
    assert.equal(await adminPage!.$eval('#email-subject',el=>(el as HTMLInputElement).value),'Provider rejection');assert.equal(accepted,2);
    await prisma.passwordResetRateLimit.updateMany({where:{key:{startsWith:'staff-email:cooldown:'}},data:{expiresAt:new Date(0)}});
    mode='uncertain';await adminPage!.reload({waitUntil:'networkidle0'});await fill(adminPage!,'Uncertain send');await adminPage!.$eval('form',el=>(el as HTMLFormElement).requestSubmit());
    await adminPage!.waitForFunction(()=>document.body.textContent?.includes('could not be confirmed'));
    const before=captured.length;
    const duplicate=await direct(adminPage!,{recipient:'recipient@example.invalid',subject:'Uncertain send',message:'Synthetic message\n<script>literal text</script>',submissionId:randomUUID()});assert.match(duplicate.body,/could not be confirmed/);assert.equal(captured.length,before);
    assert.ok(captured.every(mail=>mail.includes('system@example.invalid')&&mail.includes('recipient@example.invalid')));
    assert.equal(log.includes('fixture-pass'),false);assert.equal(log.includes('Synthetic message'),false);
  }finally{
    if(browser)await browser.close();if(child&&child.exitCode===null){child.kill();await new Promise<void>(r=>{child!.once('exit',()=>r());setTimeout(r,5000)})}
    for(const socket of sockets)socket.destroy();await new Promise<void>(r=>smtp.close(()=>r()));
    await prisma.$disconnect();if(created){assert.match(schema,/^staff_email_next_test_[a-f0-9]{32}$/);await pool.query('DROP SCHEMA "'+schema+'" CASCADE')}await pool.end();
  }
});

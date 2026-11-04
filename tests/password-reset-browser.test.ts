import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { createServer } from 'node:http';
import { build } from 'esbuild';
import puppeteer from 'puppeteer';

test('reset forms support real validation, cooldown, keyboard/touch toggles and correct portal navigation', {
  skip: process.env.RUN_PASSWORD_RESET_BROWSER_TESTS !== '1', timeout: 120000,
}, async () => {
  const bundle = await build({
    stdin: { contents: `import React from 'react';import {createRoot} from 'react-dom/client';
      import {ResetFrame,ForgotPasswordForm,VerifyResetOtpForm,ResetPasswordForm} from './components/auth/password-reset-forms';
      const params=new URLSearchParams(location.search),scope=params.get('portal')||'resident', mode=params.get('mode')||'forgot';
      const Form=mode==='forgot'?ForgotPasswordForm:mode==='verify'?VerifyResetOtpForm:ResetPasswordForm;
      window.calls=[];createRoot(document.getElementById('root')).render(<ResetFrame title="Account recovery" scope={scope}><Form scope={scope}/></ResetFrame>);`, resolveDir: process.cwd(), sourcefile: 'reset-fixture.tsx', loader: 'tsx' },
    bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"production"' },
    plugins: [{ name: 'synthetic-boundaries', setup(builder) {
      builder.onResolve({ filter: /server\/actions\/password-reset|^next\/(link|navigation)$/ }, args => ({ path: args.path, namespace: 'synthetic' }));
      builder.onLoad({ filter: /.*/, namespace: 'synthetic' }, args => ({ loader: 'jsx', resolveDir: process.cwd(), contents: args.path.includes('password-reset')
        ? `export const forgotPasswordAction=async v=>{window.calls.push({type:'request',...v});return {success:true,message:'If an eligible account matches that email, a verification code will be sent.'}};
          export const verifyResetOtpAction=async v=>{window.calls.push({type:'verify',...v});return {success:v.otp==='123456',message:'The code is invalid or expired.'}};
          export const resetPasswordAction=async v=>{window.calls.push({type:'reset',...v});return {success:true,message:'Password changed successfully.',loginPath:({resident:'/Login',admin:'/AdminLogin',clinic:'/ClinicLogin'})[new URLSearchParams(location.search).get('portal')]}};`
        : args.path.includes('navigation') ? `export const useRouter=()=>({push:v=>window.destination=v,replace:v=>window.destination=v,refresh:()=>{}});`
        : `import React from 'react';export default function Link({children,...props}){return <a {...props}>{children}</a>}` }));
    } }],
  });
  const css = readdirSync('.next/static/chunks').filter(file => file.endsWith('.css')).map(file => readFileSync(`.next/static/chunks/${file}`, 'utf8')).join('\n');
  const server = createServer((req, res) => { res.setHeader('Content-Type', 'text/html'); res.end(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>${css}</style></head><body><div id="root"></div><script>${bundle.outputFiles[0].text}</script></body></html>`); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address(); assert.ok(address && typeof address !== 'string');
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] }).catch(error => { server.close(); throw error; });
  try {
    const page = await browser.newPage(); const errors: string[] = [];
    page.on('pageerror', error => errors.push(String(error)));
    const replace = async (selector: string, value: string) => { await page.focus(selector); await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control'); await page.keyboard.press('Backspace'); await page.type(selector, value); };
    for (const mobile of [false, true]) {
      await page.setViewport({ width: mobile ? 390 : 1280, height: 850, isMobile: mobile, hasTouch: mobile });
      for (const scope of ['resident', 'admin', 'clinic']) {
        const visit = (mode: string) => page.goto(`http://127.0.0.1:${address.port}/?mode=${mode}&portal=${scope}`);
        await visit('forgot'); await page.waitForSelector('#reset-email');
        await page.click('form button');
        await page.waitForFunction(() => document.body.textContent?.includes('Enter a valid email address.'));
        await page.type('#reset-email', 'SYNTHETIC@EXAMPLE.INVALID'); await page.click('form button');
        await page.waitForFunction(() => Boolean((window as unknown as { destination: string }).destination));
        assert.equal(await page.evaluate(() => (window as unknown as { destination: string }).destination), `/verify-reset-otp?portal=${scope}`);
        await visit('verify'); await page.waitForSelector('#reset-otp');
        assert.equal(await page.$eval('#resend-email', el => (el as HTMLInputElement).value), 'synthetic@example.invalid');
        assert.equal(await page.$eval('button[type="button"]', el => (el as HTMLButtonElement).disabled), true);
        await page.type('#reset-otp', '12345'); await page.click('form button');
        await page.waitForFunction(() => document.body.textContent?.includes('Enter the six-digit code.'));
        await replace('#reset-otp', '111111'); await page.click('form button');
        await page.waitForSelector('[role="alert"]');
        await replace('#reset-otp', '123456'); await page.click('form button');
        await page.waitForFunction(() => Boolean((window as unknown as { destination: string }).destination));
        assert.equal(await page.evaluate(() => (window as unknown as { destination: string }).destination), `/reset-password?portal=${scope}`);
        // Expire only the presentation clock; server enforcement is tested independently.
        await page.evaluate(scope => sessionStorage.setItem('mis-password-reset', JSON.stringify({ email: 'synthetic@example.invalid', scope, resendAt: Date.now() - 1 })), scope);
        await visit('verify'); await page.waitForSelector('#reset-otp');
        await page.waitForFunction(() => !(document.querySelector('button[type="button"]') as HTMLButtonElement).disabled);
        await page.click('button[type="button"]');
        await page.waitForFunction(() => document.body.textContent?.includes('Only the newest code can be used.'));
        assert.equal(await page.$eval('button[type="button"]', el => (el as HTMLButtonElement).disabled), true);
        await page.reload(); await page.waitForSelector('#reset-otp');
        assert.equal(await page.$eval('button[type="button"]', el => (el as HTMLButtonElement).disabled), true);
        await visit('reset'); await page.waitForSelector('#new-password');
        await page.type('#new-password', 'NewPassword123!'); await page.type('#confirm-new-password', 'Different123!');
        await page.click('button:not([type="button"])'); await page.waitForFunction(() => document.body.textContent?.includes('Passwords do not match.'));
        assert.equal(await page.$eval('#new-password', el => (el as HTMLInputElement).type), 'password');
        const toggle = await page.$('[aria-label="Show password"]'); assert.ok(toggle);
        if (mobile) await toggle.tap(); else { await toggle.focus(); await page.keyboard.press('Space'); }
        assert.equal(await page.$eval('#new-password', el => (el as HTMLInputElement).type), 'text');
        assert.equal(await page.$eval('#confirm-new-password', el => (el as HTMLInputElement).type), 'password');
        await page.click('[aria-label="Show confirm password"]');
        assert.equal(await page.$eval('#confirm-new-password', el => (el as HTMLInputElement).type), 'text');
        await replace('#confirm-new-password', 'NewPassword123!'); await page.click('button:not([type="button"])');
        await page.waitForFunction(() => Boolean((window as unknown as { destination: string }).destination));
        assert.equal(await page.evaluate(() => (window as unknown as { destination: string }).destination), { resident: '/Login', admin: '/AdminLogin', clinic: '/ClinicLogin' }[scope]);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      }
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve())); }
});

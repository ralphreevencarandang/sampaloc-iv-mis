import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { test } from "node:test";
import { build } from "esbuild";
import puppeteer from "puppeteer";

test("registration, Admin create and edit use real RHF validation, accessible toggles and mobile controls", {
  skip: process.env.RUN_RESIDENT_BROWSER_TESTS !== "1", timeout: 180000,
}, async () => {
  const bundle = await build({
    stdin: { contents: `
      import React from 'react';
      import { createRoot } from 'react-dom/client';
      import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
      import Register from './app/(Resident)/register/page';
      import Create from './components/ui/Admin/CreateResidentModal';
      import Edit from './components/ui/Admin/ResidentFormModal';
      const initialData={id:'synthetic',email:'synthetic@example.invalid',firstName:'Juan',middleName:'',lastName:'Cruz',birthDate:'2000-01-01',gender:'Male',civilStatus:'Single',street:'Test',houseNumber:'1',contactNumber:'09123456789',citizenship:'Filipino',isVoter:false,is4Ps:false,isPwd:false,status:'PENDING'};
      window.renderForm=mode=>createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient()}>{mode==='register'?<Register/>:mode==='create'?<Create isOpen onClose={()=>{}}/>:<Edit isOpen onClose={()=>{}} initialData={initialData}/>}</QueryClientProvider>);
    `, resolveDir: process.cwd(), loader: "tsx", sourcefile: "resident-fixture.tsx" },
    bundle: true, write: false, format: "iife", platform: "browser", jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
    plugins: [{ name: "synthetic-actions", setup(builder) {
      builder.onResolve({ filter: /server\/actions\/|^next\/(image|link|navigation)$|sampaloc-logo\.png$/ }, args => ({ path: args.path, namespace: "synthetic" }));
      builder.onLoad({ filter: /.*/, namespace: "synthetic" }, args => ({ resolveDir: process.cwd(), loader: "jsx", contents:
        args.path.includes("server/actions") ? `const capture=async (...args)=>{window.captured=Array.from(args.find(arg=>arg instanceof FormData).entries()).map(([k,v])=>[k,typeof v==='string'?v:'file']);return {success:false,message:'Synthetic capture'}};export const registerResidentAction=capture, createAdminResidentAction=capture, updateResidentAction=capture;`
        : args.path.includes("navigation") ? `export const useRouter=()=>({replace:()=>{}});`
        : args.path.endsWith("png") ? `export default '';`
        : `import React from 'react';export default function Mock({children,...props}){return React.createElement('${args.path.endsWith("image") ? "img" : "a"}',props,children)}` }));
    } }],
  });
  const css = readdirSync(".next/static/chunks").filter(file => file.endsWith(".css")).map(file => readFileSync(`.next/static/chunks/${file}`, "utf8")).join("\n");
  const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });
  try {
    const page = await browser.newPage();
    const errors: string[] = [];
    page.on("pageerror", error => errors.push(String(error)));
    for (const mobile of [false, true]) {
      await page.setViewport({ width: mobile ? 390 : 1280, height: 850, isMobile: mobile, hasTouch: mobile });
      for (const mode of ["register", "create", "edit"]) {
        await page.setContent(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1"/><style>${css}</style></head><body><div id="root"></div></body></html>`);
        await page.addScriptTag({ content: bundle.outputFiles[0].text });
        await page.evaluate(mode => (window as unknown as { renderForm: (mode: string) => void }).renderForm(mode), mode);
        const prefix = mode === "register" ? "register-" : mode === "create" ? "create-" : "";
        const phone = `#${prefix}contactNumber`;
        await page.waitForSelector(phone);
        if (mode === "edit") assert.equal(await page.$eval(phone, el => (el as HTMLInputElement).value), "9123456789");
        if (mode !== "edit") {
          for (const name of ["password", "confirmPassword"]) {
            const field = `#${prefix}${name}`;
            await page.type(field, "Example123!");
            assert.equal(await page.$eval(field, el => (el as HTMLInputElement).type), "password");
            const label = name === "password" ? "password" : "confirm password";
            const toggle = await page.$(`[aria-label="Show ${label}"]`);
            assert.ok(toggle);
            if (mobile) await toggle.tap(); else { await toggle.focus(); await page.keyboard.press("Space"); }
            assert.equal(await page.$eval(field, el => (el as HTMLInputElement).type), "text");
            assert.equal(await page.$eval(field, el => (el as HTMLInputElement).value), "Example123!");
            if (name === "password") assert.equal(await page.$eval(`#${prefix}confirmPassword`, el => (el as HTMLInputElement).type), "password");
            await page.click(`[aria-label="Hide ${label}"]`);
          }
        }
        const replace = async (selector: string, value: string) => {
          await page.$eval(selector, el => (el as HTMLInputElement).focus());
          await page.keyboard.down("Control"); await page.keyboard.press("A"); await page.keyboard.up("Control");
          await page.keyboard.press("Backspace");
          await page.type(selector, value);
        };
        await replace(phone, "9a!123456789000");
        assert.equal(await page.$eval(phone, el => (el as HTMLInputElement).value), "9123456789");
        assert.equal(await page.$eval(phone, el => el.getAttribute("inputmode")), "numeric");
        assert.match(await page.$eval(phone, el => el.parentElement?.textContent ?? ""), /\+63/);
        await replace(`#${prefix}firstName`, "Juan2");
        await replace(`#${prefix}middleName`, "Reyes!");
        await replace(phone, "8123456789");
        await page.click('button[type="submit"]');
        await page.waitForFunction(() => document.body.textContent?.includes("Name must contain letters only.") && document.body.textContent?.includes("Enter a valid Philippine mobile number."));
        // Exercise the real form resolver and capture normalized submissions without creating accounts.
        await replace(`#${prefix}firstName`, "  María   Luisa  ");
        await replace(`#${prefix}middleName`, "Peña");
        await replace(phone, "9123456789");
        if (mode !== "edit") {
          const selector = (name: string) => mode === "register" ? `[name="${name}"]` : `#create-${name}`;
          for (const [name, value] of Object.entries({ email: "synthetic@example.invalid", lastName: "Cruz", street: "Test", houseNumber: "1", citizenship: "Filipino" })) {
            await replace(selector(name), value);
          }
          await page.$eval(selector("birthDate"), el => {
            Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(el, "2000-01-01");
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
          });
          for (const [name, value] of Object.entries({ gender: "Female", civilStatus: "Single", isVoter: "No", idType: "National ID" })) await page.select(selector(name), value);
          await replace(selector("idNumber"), "test-id");
          await page.$eval('input[type="file"]', el => {
            const input = el as HTMLInputElement;
            const transfer = new DataTransfer();
            transfer.items.add(new File(["synthetic"], "id.png", { type: "image/png" }));
            input.files = transfer.files;
            input.dispatchEvent(new Event("change", { bubbles: true }));
          });
        }
        await page.click('button[type="submit"]');
        try {
          await page.waitForFunction(() => !!(window as unknown as { captured: unknown }).captured, { timeout: 10000 });
        } catch (error) {
          throw new Error(`${mode} (${mobile ? 'mobile' : 'desktop'}) submission failed: ${await page.$eval('form', el => el.textContent)}`, { cause: error });
        }
        const captured = await page.evaluate(() => Object.fromEntries((window as unknown as { captured: [string, string][] }).captured));
        assert.equal(captured.contactNumber, "+639123456789");
        assert.equal(captured.firstName, "María Luisa");
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true);
      }
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
});

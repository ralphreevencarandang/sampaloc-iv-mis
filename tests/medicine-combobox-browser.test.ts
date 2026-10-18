import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { test } from 'node:test'
import { build } from 'esbuild'
import puppeteer from 'puppeteer'

test('real medicine combobox searches, scrolls, supports keyboard/multiple selection and fits mobile', {
  skip: process.env.RUN_COMBOBOX_BROWSER_TESTS !== '1', timeout: 180000,
}, async () => {
  const bundle = await build({
    stdin: { contents: `
      import React, { useState } from 'react';
      import { createRoot } from 'react-dom/client';
      import MedicineCombobox from './components/ui/Clinic/MedicineCombobox';
      const medicines = Array.from({length:80},(_,i)=>({id:'medicine-'+i,name:'Synthetic '+String(i).padStart(3,'0'),quantity:20,unit:'tablets',expiresOn:'2099-01-01',status:'Available',unavailableReason:null}));
      medicines.push({id:'expired',name:'Expired synthetic',quantity:3,unit:'bottles',expiresOn:'2000-01-01',status:'Low Stock',unavailableReason:'Expired'});
      medicines.push({id:'empty',name:'Empty synthetic',quantity:0,unit:'bottles',expiresOn:'2099-01-01',status:'Out of Stock',unavailableReason:'Out of stock'});
      function App(){const [selected,setSelected]=useState([]);return <main className="mx-auto max-w-xl p-4"><MedicineCombobox id="medicine" medicines={medicines} selectedIds={selected} disabled={false} onSelect={m=>setSelected(s=>s.includes(m.id)?s:[...s,m.id])}/><output id="picked">{selected.join(',')}</output></main>}
      createRoot(document.getElementById('root')).render(<App/>);
    `, resolveDir: process.cwd(), sourcefile: 'medicine-combobox-fixture.tsx', loader: 'tsx' },
    bundle: true, write: false, format: 'iife', platform: 'browser', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"production"' },
  })
  const css = readdirSync('.next/static/chunks').filter(f => f.endsWith('.css')).map(f => readFileSync(`.next/static/chunks/${f}`, 'utf8')).join('\n')
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] })
  try {
    const page = await browser.newPage()
    const errors: string[] = []
    page.on('pageerror', error => errors.push(String(error)))
    await page.setViewport({ width: 1280, height: 800 })
    await page.setContent(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1" /><style>${css}</style></head><body><div id="root"></div></body></html>`)
    await page.addScriptTag({ content: bundle.outputFiles[0].text })
    await page.waitForSelector('[role="combobox"]')
    await page.click('[aria-label="Show medicine options"]')
    await page.waitForSelector('[role="option"]')
    assert.equal(await page.$eval('[role="listbox"]', el => el.textContent?.includes('Expired synthetic')), false)
    assert.equal(await page.$eval('[role="listbox"]', el => el.scrollHeight > el.clientHeight), true)
    const disabled = await page.$('[role="option"][aria-disabled="true"]')
    assert.ok(disabled)
    assert.match(await disabled.evaluate(el => el.textContent ?? ''), /0 bottles/)
    await disabled.click()
    assert.equal(await page.$eval('#picked', el => el.textContent), '')
    await page.type('[role="combobox"]', 'Synthetic 001')
    await page.waitForFunction(() => document.querySelectorAll('[role="option"]').length === 1)
    assert.match(await page.$eval('[role="option"]', el => el.textContent ?? ''), /20 tablets/)
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter')
    await page.waitForFunction(() => document.querySelector('#picked')?.textContent === 'medicine-1')
    await page.click('[role="combobox"]'); await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control'); await page.keyboard.press('Backspace')
    await page.type('[role="combobox"]', 'Synthetic 002')
    await page.waitForFunction(() => document.querySelectorAll('[role="option"]').length === 1)
    await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter')
    await page.waitForFunction(() => document.querySelector('#picked')?.textContent === 'medicine-1,medicine-2')
    await page.click('[role="combobox"]'); await page.keyboard.down('Control'); await page.keyboard.press('A'); await page.keyboard.up('Control'); await page.keyboard.press('Backspace')
    await page.type('[role="combobox"]', 'Synthetic 001')
    await page.waitForFunction(() => document.querySelectorAll('[role="option"]').length === 0)
    assert.equal(await page.$eval('#picked', el => el.textContent), 'medicine-1,medicine-2')
    await page.keyboard.press('Escape')
    await page.setViewport({ width: 390, height: 700, isMobile: true, hasTouch: true })
    // Switching mobile/touch emulation reloads Chromium's document.
    await page.setContent(`<html><head><meta name="viewport" content="width=device-width, initial-scale=1" /><style>${css}</style></head><body><div id="root"></div></body></html>`)
    await page.addScriptTag({ content: bundle.outputFiles[0].text })
    await page.waitForSelector('[role="combobox"]')
    await page.tap('[aria-label="Show medicine options"]')
    await page.waitForSelector('[role="listbox"]', { visible: true })
    const bounds = await page.$eval('[role="listbox"]', el => { const b = el.getBoundingClientRect(); return { left: b.left, right: b.right, width: window.innerWidth } })
    assert.ok(bounds.left >= 0 && bounds.right <= bounds.width)
    assert.deepEqual(errors, [])
  } finally { await browser.close() }
})

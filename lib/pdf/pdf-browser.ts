import path from 'node:path'
import { access } from 'node:fs/promises'
import { PdfRuntimeError } from './pdf-diagnostics'

let executablePreparation: Promise<string> | undefined

export async function launchPdfBrowser() {
  try {
    if (process.env.VERCEL === '1') {
      const [{ default: chromium }, { default: puppeteer }] = await Promise.all([
        import('@sparticuz/chromium-min'), import('puppeteer-core'),
      ])
      const pack = path.join(process.cwd(), '.chromium')
      await access(path.join(pack, 'chromium.br'))
      // Only browser executables/libraries are extracted to /tmp, never document PDFs.
      const executablePath = await (executablePreparation ??= chromium.executablePath(pack).catch(cause => {
        executablePreparation = undefined
        throw cause
      }))
      return await puppeteer.launch({
        args: puppeteer.defaultArgs({ args: chromium.args, headless: 'shell' }),
        executablePath,
        headless: 'shell',
        timeout: 15000,
        protocolTimeout: 30000,
      })
    }
    const { default: puppeteer } = await import('puppeteer')
    return await puppeteer.launch({ headless: true, timeout: 15000, protocolTimeout: 30000 })
  } catch (cause) {
    throw new PdfRuntimeError('browser.launch', cause)
  }
}

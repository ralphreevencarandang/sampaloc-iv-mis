import { createHash } from 'node:crypto'
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

// Match puppeteer-core 24.42.0's Chromium major. Downloads happen at build time only.
const version = '147.0.0'
const checksums = {
  x64: 'e2a58b0ceeb65d3538c7a762dbb4b2e3de8ac97830a076c4a98fd6a1b6bf5870',
  arm64: '1ad48bcc511bdcb63eb50cd98bc6a5235c7289311099fe77277a2379e5f3ac5a',
}

async function prepare() {
  if (process.env.VERCEL !== '1' && !process.argv.includes('--force')) return
  const checksum = checksums[process.arch]
  if (!checksum) throw new Error('Unsupported PDF Chromium architecture')
  const root = path.join(process.cwd(), '.chromium')
  const stamp = `${version}-${process.arch}-${checksum}`
  const files = ['chromium.br', 'fonts.tar.br', 'swiftshader.tar.br', 'al2023.tar.br']
  try {
    if ((await readFile(path.join(root, 'version'), 'utf8')) === stamp) {
      await Promise.all(files.map(file => readFile(path.join(root, file))))
      console.log('PDF Chromium build assets verified (cached).')
      return
    }
  } catch { /* Missing or incomplete build cache: download a verified pack. */ }
  await mkdir(root, { recursive: true })
  const url = `https://github.com/Sparticuz/chromium/releases/download/v${version}/chromium-v${version}-pack.${process.arch}.tar`
  const response = await fetch(url, { signal: AbortSignal.timeout(120000) })
  if (!response.ok) throw new Error(`PDF Chromium download failed (HTTP ${response.status})`)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (createHash('sha256').update(bytes).digest('hex') !== checksum) throw new Error('PDF Chromium checksum mismatch')
  const archive = path.join(root, 'pack.tar')
  await writeFile(archive, bytes)
  try {
    const result = spawnSync('tar', ['-xf', archive, '-C', root], { timeout: 30000, stdio: 'pipe' })
    if (result.error || result.status !== 0) throw new Error('Unable to extract PDF Chromium build assets')
    await Promise.all(files.map(file => readFile(path.join(root, file))))
    await writeFile(path.join(root, 'version'), stamp)
  } finally { await rm(archive, { force: true }) }
  console.log('PDF Chromium build assets downloaded and checksum verified.')
}

prepare().catch(error => {
  console.error(error.message)
  process.exitCode = 1
})

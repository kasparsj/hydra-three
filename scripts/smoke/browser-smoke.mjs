import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..')

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png'
}

const resolvePath = (requestPath) => {
  const cleanPath = requestPath.split('?')[0]
  const relativePath = decodeURIComponent(cleanPath).replace(/^\/+/, '')
  const filePath = path.resolve(rootDir, relativePath)
  if (!filePath.startsWith(rootDir)) {
    return null
  }
  return filePath
}

const server = createServer(async (req, res) => {
  try {
    const urlPath = req.url || '/'
    const filePath = resolvePath(urlPath === '/' ? '/examples/quickstart.html' : urlPath)
    if (!filePath) {
      res.writeHead(403)
      res.end('Forbidden')
      return
    }

    const data = await readFile(filePath)
    const ext = path.extname(filePath)
    res.writeHead(200, {
      'content-type': contentTypes[ext] || 'application/octet-stream',
      'cache-control': 'no-store'
    })
    res.end(data)
  } catch (error) {
    res.writeHead(404)
    res.end('Not found')
  }
})

const listen = () =>
  new Promise((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => resolve(server.address().port))
    server.on('error', reject)
  })

const closeServer = () =>
  new Promise((resolve) => {
    server.close(() => resolve())
  })

const port = await listen()
const url = `http://127.0.0.1:${port}/examples/quickstart.html`

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage()
const errors = []

page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    errors.push(`console error: ${msg.text()}`)
  }
})

try {
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await page.waitForFunction(() => typeof window.Hydra === 'function', { timeout: 10000 })
  await page.waitForFunction(() => typeof window.osc === 'function', { timeout: 10000 })
  await page.waitForSelector('canvas', { timeout: 10000 })

  const canvas = await page.evaluate(() => {
    const el = document.querySelector('canvas')
    if (!el) {
      return null
    }
    return {
      width: el.width,
      height: el.height
    }
  })

  assert.ok(canvas, 'Expected quickstart to create a canvas')
  assert.ok(canvas.width > 0, `Expected canvas width > 0, got ${canvas.width}`)
  assert.ok(canvas.height > 0, `Expected canvas height > 0, got ${canvas.height}`)
  assert.deepEqual(errors, [], `Unexpected browser runtime errors:\n${errors.join('\n')}`)
} finally {
  await browser.close()
  await closeServer()
}

console.log('browser smoke test passed')

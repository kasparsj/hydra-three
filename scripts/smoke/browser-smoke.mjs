import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium, firefox } from 'playwright'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..')
const browserArg = process.argv.find((arg) => arg.startsWith('--browser='))
const browserName = browserArg ? browserArg.replace('--browser=', '').toLowerCase() : 'chromium'
const PAGE_LOAD_TIMEOUT_MS = 30000
const READY_TIMEOUT_MS = 60000
const FIREFOX_WEBGL_FAILURE_PATTERNS = [
  /WebGL context could not be created/i,
  /WebGL creation failed/i,
  /FEATURE_FAILURE_WEBGL_EXHAUSTED_DRIVERS/i,
  /Error creating WebGL context/i
]

const launchers = {
  chromium,
  firefox
}

if (!launchers[browserName]) {
  throw new Error(`Unsupported browser "${browserName}". Use one of: ${Object.keys(launchers).join(', ')}`)
}

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

const browser = await launchers[browserName].launch({ headless: true })
const page = await browser.newPage()
const errors = []

page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`))
page.on('console', (msg) => {
  if (msg.type() === 'error') {
    errors.push(`console error: ${msg.text()}`)
  }
})

const collectDiagnostics = async () => {
  try {
    return await page.evaluate(() => ({
      readyState: document.readyState,
      hydraType: typeof window.Hydra,
      oscType: typeof window.osc,
      canvasCount: document.querySelectorAll('canvas').length
    }))
  } catch (error) {
    return { diagnosticsError: error instanceof Error ? error.message : String(error) }
  }
}

const isKnownWebGLFailure = (message) =>
  FIREFOX_WEBGL_FAILURE_PATTERNS.some((pattern) => pattern.test(message))

const hasKnownWebGLFailures = (errorMessages) => errorMessages.some(isKnownWebGLFailure)
const shouldAllowFirefoxWebGLFallback = browserName === 'firefox' && process.env.CI === 'true'

const waitForGlobalFunction = async (name) => {
  try {
    await page.waitForFunction(
      (globalName) => typeof window[globalName] === 'function',
      name,
      { timeout: READY_TIMEOUT_MS, polling: 100 }
    )
  } catch (error) {
    const diagnostics = await collectDiagnostics()
    const errorDetails = errors.length ? errors.join('\n') : 'none'
    const diagnosticDetails = JSON.stringify(diagnostics)
    throw new Error(
      `Timed out waiting for window.${name} in ${browserName}. diagnostics=${diagnosticDetails}. runtimeErrors=\n${errorDetails}`,
      { cause: error }
    )
  }
}

try {
  await page.goto(url, { waitUntil: 'load', timeout: PAGE_LOAD_TIMEOUT_MS })
  await waitForGlobalFunction('Hydra')
  let fallbackToLoadOnlyAssertions = false

  try {
    await waitForGlobalFunction('osc')
  } catch (error) {
    if (shouldAllowFirefoxWebGLFallback && hasKnownWebGLFailures(errors)) {
      fallbackToLoadOnlyAssertions = true
      console.warn('Firefox WebGL is unavailable in this CI environment; using load-only smoke assertions.')
    } else {
      throw error
    }
  }

  if (!fallbackToLoadOnlyAssertions) {
    await page.waitForSelector('canvas', { timeout: READY_TIMEOUT_MS })

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
  } else {
    const diagnostics = await collectDiagnostics()
    assert.equal(diagnostics.hydraType, 'function', 'Expected hydra bundle to define window.Hydra in Firefox CI fallback mode')

    const nonWebGLErrors = errors.filter((errorMessage) => !isKnownWebGLFailure(errorMessage))
    assert.deepEqual(nonWebGLErrors, [], `Unexpected non-WebGL runtime errors:\n${nonWebGLErrors.join('\n')}`)
  }
} finally {
  await browser.close()
  await closeServer()
}

console.log(`${browserName} browser smoke test passed`)

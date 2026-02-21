import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..')
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'))
const packName = packageJson.name.replace(/^@/, '').replace(/\//g, '-')
const expectedTarball = `${packName}-${packageJson.version}.tgz`
const expectedPath = path.join(rootDir, expectedTarball)

if (!fs.existsSync(expectedPath)) {
  throw new Error(`Expected tarball "${expectedTarball}" not found. Run \`npm pack\` first.`)
}

const content = fs.readFileSync(expectedPath)
const digest = crypto.createHash('sha256').update(content).digest('hex')
const lines = [`${digest}  ${expectedTarball}`]

const outPath = path.join(rootDir, 'release-checksums.txt')
fs.writeFileSync(outPath, `${lines.join('\n')}\n`, 'utf8')

console.log(`wrote ${outPath}`)

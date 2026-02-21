import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..', '..')

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8'))
const changelog = fs.readFileSync(path.join(rootDir, 'CHANGELOG.md'), 'utf8')
const version = packageJson.version
const versionRegex = new RegExp(`^## \\[${escapeRegex(version)}\\] - (\\d{4}-\\d{2}-\\d{2})$`, 'm')
const hasUnreleased = /^## \[Unreleased\]$/m.test(changelog)

if (!hasUnreleased) {
  throw new Error('CHANGELOG.md must contain an "## [Unreleased]" section.')
}

if (!versionRegex.test(changelog)) {
  throw new Error(`CHANGELOG.md must include a dated section for package version ${version}.`)
}

const tagType = process.env.GITHUB_REF_TYPE
const refName = process.env.GITHUB_REF_NAME
const ref = process.env.GITHUB_REF
const tagName = tagType === 'tag'
  ? refName
  : (ref && ref.startsWith('refs/tags/') ? ref.replace('refs/tags/', '') : null)

if (tagName) {
  const expectedTag = `v${version}`
  if (tagName !== expectedTag) {
    throw new Error(`Tag/version mismatch: tag=${tagName}, expected=${expectedTag}.`)
  }
}

console.log(`release metadata verified for version ${version}${tagName ? ` (${tagName})` : ''}`)

import {readdirSync, readFileSync, statSync} from 'node:fs'
import {join, relative} from 'node:path'
import {TextDecoder} from 'node:util'

const root = new URL('..', import.meta.url).pathname.replace(/^\/(.:\/)/, '$1')
const srcRoot = join(root, 'src')
const decoder = new TextDecoder('utf-8', {fatal: true})
const checkedExtensions = new Set(['.vue', '.ts', '.css'])
const forbiddenText = [
  {label: 'element-plus dependency/import', pattern: /element-plus/},
  {label: 'Element Plus class selector', pattern: /(^|[^A-Za-z0-9_-])\.?el-[A-Za-z0-9_-]+/},
  {label: 'legacy character icon', pattern: /[▾▸▴▿●›＋⇪⌁]/},
]
const allowElPattern = /cancel-|model-value|update:model-value|panel-muted/
const errors = []

for (const filePath of collectFiles(srcRoot)) {
  const extension = filePath.slice(filePath.lastIndexOf('.'))
  if (!checkedExtensions.has(extension)) continue

  const bytes = readFileSync(filePath)
  try {
    decoder.decode(bytes)
  } catch {
    errors.push(`${formatPath(filePath)}: invalid UTF-8`)
    continue
  }

  const text = bytes.toString('utf8')
  for (const rule of forbiddenText) {
    const match = text.match(rule.pattern)
    if (match && !(rule.label === 'Element Plus class selector' && allowElPattern.test(match[0]))) {
      errors.push(`${formatPath(filePath)}: ${rule.label} (${JSON.stringify(match[0])})`)
    }
  }
}

for (const fileName of ['package.json', 'package-lock.json']) {
  const filePath = join(root, fileName)
  const text = readFileSync(filePath, 'utf8')
  if (/element-plus/.test(text)) {
    errors.push(`${fileName}: element-plus dependency/import`)
  }
}

if (errors.length > 0) {
  console.error(errors.join('\n'))
  process.exit(1)
}

console.log('frontend guards passed')

function collectFiles(directory) {
  const entries = []
  for (const name of readdirSync(directory)) {
    const filePath = join(directory, name)
    const stats = statSync(filePath)
    if (stats.isDirectory()) entries.push(...collectFiles(filePath))
    else entries.push(filePath)
  }
  return entries
}

function formatPath(filePath) {
  return relative(root, filePath).replaceAll('\\', '/')
}

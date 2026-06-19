#!/usr/bin/env node
import { spawnSync } from 'node:child_process'

const result = spawnSync('npm', ['--prefix', 'frontend', 'audit', '--json'], {
  cwd: process.cwd(),
  encoding: 'utf8',
  shell: process.platform === 'win32'
})

const output = result.stdout?.trim()

if (!output) {
  console.error(result.stderr || 'npm audit produced no JSON output')
  process.exit(result.status ?? 1)
}

let report
try {
  report = JSON.parse(output)
} catch (error) {
  console.error('Failed to parse npm audit JSON output')
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

const vulnerabilities = Object.values(report.vulnerabilities ?? {})
const metadata = report.metadata?.vulnerabilities ?? {}
const severityOrder = ['critical', 'high', 'moderate', 'low', 'info']

console.log('npm audit summary for frontend')
console.log('')
console.log('Severity counts:')
for (const severity of severityOrder) {
  console.log(`- ${severity}: ${metadata[severity] ?? 0}`)
}
console.log(`- total: ${metadata.total ?? vulnerabilities.length}`)

if (vulnerabilities.length === 0) {
  process.exit(0)
}

console.log('')
console.log('Vulnerable packages:')
for (const item of vulnerabilities.sort((left, right) => severityOrder.indexOf(left.severity) - severityOrder.indexOf(right.severity))) {
  const via = Array.isArray(item.via)
    ? item.via.map((entry) => (typeof entry === 'string' ? entry : entry.title)).filter(Boolean).join('; ')
    : ''
  const fix = item.fixAvailable
    ? typeof item.fixAvailable === 'object'
      ? `${item.fixAvailable.name}@${item.fixAvailable.version}${item.fixAvailable.isSemVerMajor ? ' (major)' : ''}`
      : 'available'
    : 'none'

  console.log(`- ${item.name} (${item.severity}, ${item.isDirect ? 'direct' : 'transitive'}, range: ${item.range ?? 'n/a'}, fix: ${fix})`)
  if (via) {
    console.log(`  via: ${via}`)
  }
}

process.exit(result.status ?? 0)

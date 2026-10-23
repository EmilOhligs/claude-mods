// Usage: node scripts/tokens.ts <tokens.json out>
// Sums every token-counter log per session for the Zentrale's Verbrauch tab; Claude uploads the result.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { sessionTokens } from '../hooks/runs.ts'

const [output] = process.argv.slice(2)
if (!output) throw new Error('usage: node scripts/tokens.ts <tokens.json out>')

const dir = join(homedir(), '.claude', 'token-counter', 'log')
const log = readdirSync(dir).filter(f => f.endsWith('.jsonl')).map(f => readFileSync(join(dir, f), 'utf8')).join('')
const rows = sessionTokens(log)
writeFileSync(output, JSON.stringify(rows, null, 1))
console.log(`${rows.length} sessions -> ${output}`)

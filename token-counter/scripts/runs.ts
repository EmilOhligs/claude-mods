// Usage: node scripts/runs.ts <runs.json in> <runs.json out>
// Folds every token-counter log into the Zentrale's runs; Claude uploads the result.
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

import { mergeRuns } from '../hooks/runs.ts'

const [input, output] = process.argv.slice(2)
if (!input || !output) throw new Error('usage: node scripts/runs.ts <runs.json in> <runs.json out>')

const dir = join(homedir(), '.claude', 'token-counter', 'log')
const log = readdirSync(dir).filter(f => f.endsWith('.jsonl')).map(f => readFileSync(join(dir, f), 'utf8')).join('')
const runs = mergeRuns(log, JSON.parse(readFileSync(input, 'utf8')))
writeFileSync(output, JSON.stringify(runs, null, 1))
console.log(`${runs.length} runs -> ${output}`)

import { expect, test } from 'claude-code/testing'

import { EMPTY, addUsage, bar, fmt, recommend, resetIso, sum } from './tokens'
import type { Stats } from '../types'

const u = (model: string, out: number) => ({
  model,
  input_tokens: 100,
  output_tokens: out,
  cache_read_input_tokens: 1000,
  cache_creation_input_tokens: 0,
})

test('fmt and bar', () => {
  expect(fmt(950)).toBe('950')
  expect(fmt(12_345)).toBe('12.3k')
  expect(bar(50, 10)).toBe('█████░░░░░')
  expect(bar(150, 4)).toBe('████')
})

test('addUsage splits CEO and team and remembers the main model', () => {
  let s: Stats = EMPTY
  s = addUsage(s, 'main', u('claude-opus-5-5', 500))
  s = addUsage(s, 'agent', u('claude-sonnet-5-5', 200))
  expect(sum(s, 'main').output).toBe(500)
  expect(sum(s, 'agent').output).toBe(200)
  expect(sum(s).turns).toBe(2)
  expect(s.mainModel).toBe('claude-opus-5-5')
})

test('recommend escalates by context and limits', () => {
  expect(recommend(EMPTY).level).toBe('ok')
  expect(recommend({ ...EMPTY, contextPercent: 80 }).level).toBe('warn')
  expect(recommend({ ...EMPTY, contextPercent: 92 }).level).toBe('alert')
  expect(recommend({ ...EMPTY, rateLimits: [{ kind: 'five_hour', percentUsed: 78 }] }).level).toBe('warn')
  expect(recommend({ ...EMPTY, rateLimits: [{ kind: 'seven_day', percentUsed: 95 }] }).text).toContain('7d')
})

test('recommend points to the engineers when opus does the work', () => {
  let s: Stats = addUsage(EMPTY, 'main', u('claude-opus-5-5', 30_000))
  expect(recommend(s).level).toBe('info')
  expect(recommend(s).text).toContain('Ingenieure')
  s = addUsage(s, 'agent', u('claude-sonnet-5-5', 20_000))
  expect(recommend(s).level).toBe('ok')
})

test('resetIso accepts text, seconds and milliseconds', () => {
  expect(resetIso({ resetsAt: '2026-10-24T03:00:00Z' })).toBe('2026-10-24T03:00:00Z')
  expect(resetIso({ resetsAt: 1792800000 })).toBe('2026-10-24T00:00:00.000Z')
  expect(resetIso({ resetsAt: 1792800000000 })).toBe('2026-10-24T00:00:00.000Z')
  expect(resetIso({ kind: 'five_hour' })).toBe(undefined)
})

import { expect, test } from 'claude-code/testing'

import { EMPTY, addUsage, bar, fmt, recommend, sum } from './model'
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

test('addUsage splits roles and remembers the main model', () => {
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
  expect(recommend({ ...EMPTY, rateLimits: [{ kind: 'five_hour', percentUsed: 95 }] }).text).toContain('5h')
})

test('recommend suggests delegating when opus does all the work', () => {
  let s: Stats = addUsage(EMPTY, 'main', u('claude-opus-5-5', 30_000))
  expect(recommend(s).level).toBe('info')
  s = addUsage(s, 'agent', u('claude-sonnet-5-5', 20_000))
  expect(recommend(s).level).toBe('ok')
})

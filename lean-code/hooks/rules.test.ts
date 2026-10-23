import { expect, test } from 'claude-code/testing'

import { asLevel, rules, writesCode } from './rules'

test('unknown level falls back to full', () => {
  expect(asLevel(undefined)).toBe('full')
  expect(asLevel('mega')).toBe('full')
  expect(asLevel('lite')).toBe('lite')
})

test('rules carry the chosen level and the never-cut list', () => {
  expect(rules('lite')).toContain('Stufe lite')
  expect(rules('ultra')).toContain('Stufe ultra')
  expect(rules('full')).toContain('Nie kürzen: Tests und Prüfungen')
})

test('read-only agents get no rules, the implementer does', () => {
  expect(writesCode('Explore')).toBe(false)
  expect(writesCode('Plan')).toBe(false)
  expect(writesCode('team-delegate:umsetzer')).toBe(true)
  expect(writesCode('general-purpose')).toBe(true)
})

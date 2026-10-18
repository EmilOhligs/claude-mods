import { expect, test } from 'claude-code/testing'

import { ladder, plannerSection, saveLevel, workerPrompt } from './register'

test('worker prompt follows canEdit', () => {
  expect(workerPrompt(true)).toContain('Du darfst Dateien ändern')
  expect(workerPrompt(false)).toContain('Du darfst nichts ändern')
})

test('planner section names the agent type', () => {
  expect(plannerSection('team-delegate:umsetzer')).toContain('"team-delegate:umsetzer"')
})

test('planner section warns when the context is tight', () => {
  expect(plannerSection('x:y', 40)).not.toContain('Kontext ist zu')
  expect(plannerSection('x:y', 82)).toContain('Kontext ist zu 82 %')
})

test('ladder steps down from the configured model', () => {
  expect(ladder('opus')).toEqual(['opus', 'sonnet', 'haiku'])
  expect(ladder('sonnet')).toEqual(['sonnet', 'haiku', 'haiku'])
  expect(ladder('haiku')).toEqual(['haiku', 'haiku', 'haiku'])
})

test('save level rises at the limits and relaxes with hysteresis', () => {
  expect(saveLevel(0, 50)).toBe(0)
  expect(saveLevel(0, 76)).toBe(1)
  expect(saveLevel(1, 86)).toBe(2)
  expect(saveLevel(2, 70)).toBe(2)
  expect(saveLevel(2, 60)).toBe(0)
  expect(saveLevel(1, 70)).toBe(1)
})

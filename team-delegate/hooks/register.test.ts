import { expect, test } from 'claude-code/testing'

import { plannerSection, workerPrompt } from './register'

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

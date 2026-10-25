import { expect, test } from 'claude-code/testing'

import { ROLES, plannerSection, workerPrompt } from './register'

const role = (name: string) => ROLES.find(r => r.name === name)!

test('team has tester, reviewer, sicherheitspruefer and sucher', () => {
  expect(ROLES.map(r => r.name)).toEqual(['tester', 'reviewer', 'sicherheitspruefer', 'sucher'])
})

test('checking roles cannot edit files', () => {
  for (const name of ['reviewer', 'sicherheitspruefer', 'sucher']) {
    expect(role(name).tools).not.toContain('Edit')
    expect(role(name).tools).not.toContain('Write')
  }
  expect(role('sucher').tools).not.toContain('Bash')
  expect(role('tester').tools).toContain('Write')
})

test('roles run on the planned models', () => {
  expect(ROLES.map(r => [r.name, r.model])).toEqual([
    ['tester', 'sonnet'],
    ['reviewer', 'opus'],
    ['sicherheitspruefer', 'opus'],
    ['sucher', 'haiku'],
  ])
})

test('tester writes only failing tests', () => {
  expect(role('tester').prompt).toContain('nur Tests')
  expect(role('tester').prompt).toContain('rot')
})

test('planner section names every role with the plugin prefix', () => {
  const text = plannerSection('team-delegate:umsetzer')
  for (const r of ROLES) expect(text).toContain(`"team-delegate:${r.name}"`)
})

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

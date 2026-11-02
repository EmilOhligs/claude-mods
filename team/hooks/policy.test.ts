import { expect, test } from 'claude-code/testing'

import { ceoWriteVerdict, editedPath, engineerModelVerdict, levelSwitchVerdict, reviewerModelVerdict } from './policy'

test('CEO may not write code files, whatever their size', () => {
  for (const path of ['src/App.tsx', 'src/a.ts', 'styles/main.css', 'index.html', 'tests/login.spec.ts', 'vite.config.js', 'package.json']) {
    expect(ceoWriteVerdict('Edit', path).isAllowed).toBe(false)
    expect(ceoWriteVerdict('Write', path).isAllowed).toBe(false)
  }
})

test('CEO may write plans, notes and team files', () => {
  for (const path of ['PLAN.md', 'docs/notiz.md', '.team/stand.md', '.team/runde-1/design.md', 'CLAUDE.md']) {
    expect(ceoWriteVerdict('Write', path).isAllowed).toBe(true)
  }
})

test('Windows paths and backslashes are judged the same', () => {
  expect(ceoWriteVerdict('Edit', 'C:\\proj\\src\\App.tsx').isAllowed).toBe(false)
  expect(ceoWriteVerdict('Write', 'C:\\proj\\.team\\stand.md').isAllowed).toBe(true)
})

test('reading tools are never blocked', () => {
  expect(ceoWriteVerdict('Read', 'src/App.tsx').isAllowed).toBe(true)
  expect(ceoWriteVerdict('Grep', undefined).isAllowed).toBe(true)
})

test('the refusal tells the CEO whom to delegate to', () => {
  const v = ceoWriteVerdict('Edit', 'src/App.tsx')
  expect(v.reason).toContain('Ingenieur')
  expect(v.reason).toContain('team:tester')
})

test('engineers cannot be started on another model than Sonnet', () => {
  expect(engineerModelVerdict({ subagent_type: 'team:ui-ingenieur', model: 'opus' }).isAllowed).toBe(false)
  expect(engineerModelVerdict({ subagent_type: 'team:tester', model: 'haiku' }).isAllowed).toBe(false)
  expect(engineerModelVerdict({ subagent_type: 'team:ui-ingenieur', model: 'sonnet' }).isAllowed).toBe(true)
  expect(engineerModelVerdict({ subagent_type: 'team:ui-ingenieur' }).isAllowed).toBe(true)
  expect(engineerModelVerdict({ subagent_type: 'team:design', model: 'opus' }).isAllowed).toBe(true)
})

test('general-purpose agents cannot be used to write code in frontend mode', () => {
  expect(engineerModelVerdict({ subagent_type: 'general-purpose' }).isAllowed).toBe(false)
  expect(engineerModelVerdict({}).isAllowed).toBe(false)
  expect(engineerModelVerdict({ subagent_type: 'fork' }).isAllowed).toBe(false)
  expect(engineerModelVerdict({ subagent_type: 'Explore' }).isAllowed).toBe(true)
})

test('editedPath reads file_path and notebook_path', () => {
  expect(editedPath({ file_path: 'a.ts' })).toBe('a.ts')
  expect(editedPath({ notebook_path: 'n.ipynb' })).toBe('n.ipynb')
  expect(editedPath({ command: 'ls' })).toBe(undefined)
})

test('paths that leave .team/ or only contain a .team folder are code', () => {
  for (const path of ['.team/../src/a.ts', '/repo/.team/../src/App.tsx', '/repo/.team/../../etc/x.ts', '/repo/src/.team/x.ts', 'docs/../src/a.ts'])
    expect(ceoWriteVerdict('Write', path, '/repo').isAllowed).toBe(false)
  for (const path of ['/repo/.team/stand.md', '/repo/.team/runde-1/shot.png', '.team/x.json', '/repo/docs/plan.md'])
    expect(ceoWriteVerdict('Write', path, '/repo').isAllowed).toBe(true)
})

test('the refusal does not suggest lowering the level', () => {
  expect(ceoWriteVerdict('Edit', 'src/App.tsx').reason).not.toContain('/team-')
})

test('from level 2 only team agents and read-only built-ins may be started', () => {
  for (const type of ['statusline-setup', 'output-style-setup', 'mein-agent', 'other-plugin:coder'])
    expect(engineerModelVerdict({ subagent_type: type }).isAllowed).toBe(false)
  for (const type of ['Explore', 'Plan', 'team:design', 'team:umsetzer', 'team:sucher'])
    expect(engineerModelVerdict({ subagent_type: type }).isAllowed).toBe(true)
})

test('the implementer is held to Sonnet like the engineers', () => {
  expect(engineerModelVerdict({ subagent_type: 'team:umsetzer', model: 'opus' }).isAllowed).toBe(false)
})

test('with a reviewer model every reviewing team agent must use it, builders and finder are free', () => {
  for (const type of ['team:reviewer', 'team:design', 'team:debugger'])
    expect(reviewerModelVerdict({ subagent_type: type }, 'sonnet').isAllowed).toBe(false)
  expect(reviewerModelVerdict({ subagent_type: 'team:reviewer', model: 'sonnet' }, 'sonnet').isAllowed).toBe(true)
  for (const type of ['team:tester', 'team:umsetzer', 'team:sucher', 'team:ui-ingenieur'])
    expect(reviewerModelVerdict({ subagent_type: type }, 'sonnet').isAllowed).toBe(true)
  expect(reviewerModelVerdict({ subagent_type: 'team:reviewer' }, undefined).isAllowed).toBe(true)
})

test('the model may not switch the team level itself', () => {
  expect(levelSwitchVerdict({ tool: 'Skill', skill: 'team-1' }).isAllowed).toBe(false)
  expect(levelSwitchVerdict({ tool: 'SlashCommand', command: '/team-0' }).isAllowed).toBe(false)
  expect(levelSwitchVerdict({ tool: 'Skill', skill: 'team:ceo-ablauf' }).isAllowed).toBe(true)
  expect(levelSwitchVerdict({ tool: 'Read', file_path: 'team-1.md' }).isAllowed).toBe(true)
})

import { expect, test } from 'claude-code/testing'

import { ceoWriteVerdict, editedPath, engineerModelVerdict } from './policy'

test('CEO may not write code files, whatever their size', () => {
  for (const path of ['src/App.tsx', 'src/a.ts', 'styles/main.css', 'index.html', 'tests/login.spec.ts', 'vite.config.js', 'package.json']) {
    expect(ceoWriteVerdict('Edit', path).isAllowed).toBe(false)
    expect(ceoWriteVerdict('Write', path).isAllowed).toBe(false)
  }
})

test('CEO may write plans, notes and team files', () => {
  for (const path of ['PLAN.md', 'docs/notiz.md', '.frontend-team/stand.md', '.frontend-team/runde-1/design.md', 'CLAUDE.md']) {
    expect(ceoWriteVerdict('Write', path).isAllowed).toBe(true)
  }
})

test('Windows paths and backslashes are judged the same', () => {
  expect(ceoWriteVerdict('Edit', 'C:\\proj\\src\\App.tsx').isAllowed).toBe(false)
  expect(ceoWriteVerdict('Write', 'C:\\proj\\.frontend-team\\stand.md').isAllowed).toBe(true)
})

test('reading tools are never blocked', () => {
  expect(ceoWriteVerdict('Read', 'src/App.tsx').isAllowed).toBe(true)
  expect(ceoWriteVerdict('Grep', undefined).isAllowed).toBe(true)
})

test('the refusal tells the CEO whom to delegate to', () => {
  const v = ceoWriteVerdict('Edit', 'src/App.tsx')
  expect(v.reason).toContain('Ingenieur')
  expect(v.reason).toContain('test-ingenieur')
})

test('engineers cannot be started on another model than Sonnet', () => {
  expect(engineerModelVerdict({ subagent_type: 'frontend-team:ui-ingenieur', model: 'opus' }).isAllowed).toBe(false)
  expect(engineerModelVerdict({ subagent_type: 'frontend-team:test-ingenieur', model: 'haiku' }).isAllowed).toBe(false)
  expect(engineerModelVerdict({ subagent_type: 'frontend-team:ui-ingenieur', model: 'sonnet' }).isAllowed).toBe(true)
  expect(engineerModelVerdict({ subagent_type: 'frontend-team:ui-ingenieur' }).isAllowed).toBe(true)
  expect(engineerModelVerdict({ subagent_type: 'frontend-team:tuev-design', model: 'opus' }).isAllowed).toBe(true)
})

test('general-purpose agents cannot be used to write code in frontend mode', () => {
  expect(engineerModelVerdict({ subagent_type: 'general-purpose' }).isAllowed).toBe(false)
  expect(engineerModelVerdict({}).isAllowed).toBe(false)
  expect(engineerModelVerdict({ subagent_type: 'Explore' }).isAllowed).toBe(true)
})

test('editedPath reads file_path and notebook_path', () => {
  expect(editedPath({ file_path: 'a.ts' })).toBe('a.ts')
  expect(editedPath({ notebook_path: 'n.ipynb' })).toBe('n.ipynb')
  expect(editedPath({ command: 'ls' })).toBe(undefined)
})

import { expect, test } from 'claude-code/testing'

import { UMSETZER } from './rules'

type Repo = {
  /** `git status --porcelain` output; undefined means "not a git repository". */
  porcelain?: string
  /** Whether pytest and ruff fail. */
  failing?: boolean
  /** Extra files that exist, relative to /repo. */
  files?: Record<string, string>
}

const ROOT = '/repo'

const ok = (stdout = '') => ({
  exitCode: 0,
  stdout,
  stderr: '',
  isStdoutTruncated: false,
  isStderrTruncated: false,
})

const fail = (exitCode: number, stdout: string) => ({ ...ok(stdout), exitCode })

// Stands in for the engine and the host: git, pytest, ruff, the file system, agents.
const setup = async ($: any, on: any, repo: Repo = {}) => {
  const files: Record<string, string> = {
    'pyproject.toml': '[project]\nname = "demo"\n',
    '.venv/bin/python': '',
    '.venv/bin/ruff': '',
    ...repo.files,
  }
  const ran: string[][] = []

  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))
  on('classic.Stop', () => ({}))
  on('classic.SubagentStop', () => ({}))
  on('prompt.compose', () => ({ sections: [] }))
  on('agent.list', () => ({
    value: [{ id: 'a1', type: UMSETZER, description: 'step', status: 'running' }],
  }))
  on('fs.exists', (_: any, e: any) => ({ value: e.path.replace(`${ROOT}/`, '') in files }))
  on('fs.read', (_: any, e: any) => ({ value: files[e.path.replace(`${ROOT}/`, '')] ?? '' }))
  on('process.run', (_: any, e: any) => {
    const argv: string[] = [...e.argv]
    ran.push(argv)
    if (argv[0] === 'git') {
      return { value: repo.porcelain === undefined ? fail(128, '') : ok(repo.porcelain) }
    }
    if (argv.includes('pytest')) {
      return {
        value: repo.failing ? fail(1, 'FAILED tests/test_a.py::test_a\n1 failed') : ok('3 passed'),
      }
    }
    if (argv.some(a => a.endsWith('ruff'))) {
      return { value: repo.failing ? fail(1, 'F401 unused import') : ok('All checks passed!') }
    }
    return { value: ok() }
  })

  await $.session.start({ cwd: ROOT, surface: 'terminal', isInteractive: true })
  return ran
}

const refusal = (result: any): string | undefined =>
  result.deny ?? (result.isError ? result.text : undefined)

const edit = (path: string, extra: Record<string, unknown> = {}) => ({
  tool: 'Edit',
  file_path: `${ROOT}/${path}`,
  old_string: 'x = 1',
  new_string: 'x = 2',
  ...extra,
})

// --- gate ---------------------------------------------------------------------

test('a source edit in a clean repository is refused', async ($, on) => {
  await setup($, on, { porcelain: '' })
  const result = await $.tool.call(edit('src/a.py') as any)
  expect(refusal(result)).toContain('Test')
})

test('a source edit passes once a test file changed', async ($, on) => {
  await setup($, on, { porcelain: '?? tests/test_a.py\n' })
  const result = await $.tool.call(edit('src/a.py') as any)
  expect(refusal(result)).toBe(undefined)
})

test('outside a git repository the gate stays out of the way', async ($, on) => {
  await setup($, on, { porcelain: undefined })
  const result = await $.tool.call(edit('src/a.py') as any)
  expect(refusal(result)).toBe(undefined)
})

test('the implementer may not edit a test file', async ($, on) => {
  await setup($, on, { porcelain: ' M tests/test_a.py\n' })
  const result = await $.tool.call(edit('tests/test_a.py', { agentId: 'a1' }) as any)
  expect(refusal(result)).toContain('Umsetzer')
})

test('the project config file is protected', async ($, on) => {
  await setup($, on, { porcelain: '' })
  const result = await $.tool.call({
    tool: 'Write',
    file_path: `${ROOT}/.claude/tdd-guard.json`,
    content: '{"enabled": false}',
  } as any)
  expect(refusal(result)).toContain('Nutzer')
})

test('mode off lets everything through', { options: { mode: 'off' } }, async ($, on) => {
  await setup($, on, { porcelain: '' })
  const result = await $.tool.call(edit('src/a.py') as any)
  expect(refusal(result)).toBe(undefined)
})

test('mode warn passes the edit with a hint', { options: { mode: 'warn' } }, async ($, on) => {
  await setup($, on, { porcelain: '' })
  const result: any = await $.tool.call(edit('src/a.py') as any)
  expect(refusal(result)).toBe(undefined)
  expect((result.context ?? []).join('\n')).toContain('Test')
})

test('a project can switch the guard off in its config file', async ($, on) => {
  await setup($, on, {
    porcelain: '',
    files: { '.claude/tdd-guard.json': '{"enabled": false}' },
  })
  const result = await $.tool.call(edit('src/a.py') as any)
  expect(refusal(result)).toBe(undefined)
})

// --- feedback -------------------------------------------------------------------

test('editing a test file reports the red run back to Claude', async ($, on) => {
  await setup($, on, { porcelain: ' M tests/test_a.py\n', failing: true })
  const result: any = await $.tool.call(edit('tests/test_a.py') as any)
  expect(refusal(result)).toBe(undefined)
  const context = (result.context ?? []).join('\n')
  expect(context).toContain('rot')
  expect(context).toContain('FAILED tests/test_a.py::test_a')
})

// --- stop -----------------------------------------------------------------------

test('the turn may not end while the suite is red', async ($, on) => {
  await setup($, on, { porcelain: ' M src/a.py\n', failing: true })
  const result: any = await $.classic.Stop({ stop_hook_active: false } as any)
  expect(result.block).toContain('FAILED')
})

test('a second stop attempt is let through', async ($, on) => {
  await setup($, on, { porcelain: ' M src/a.py\n', failing: true })
  const result: any = await $.classic.Stop({ stop_hook_active: true } as any)
  expect(result.block).toBe(undefined)
})

test('a green suite ends the turn without checks blocking', async ($, on) => {
  await setup($, on, { porcelain: ' M src/a.py\n' })
  const result: any = await $.classic.Stop({ stop_hook_active: false } as any)
  expect(result.block).toBe(undefined)
})

test('the implementer may not finish while the suite is red', async ($, on) => {
  await setup($, on, { porcelain: ' M src/a.py\n', failing: true })
  const result: any = await $.classic.SubagentStop({
    stop_hook_active: false,
    agent_id: 'a1',
    agent_type: UMSETZER,
    agent_transcript_path: '/tmp/t.jsonl',
  } as any)
  expect(result.block).toContain('FAILED')
})

test('other subagents are not held back', async ($, on) => {
  await setup($, on, { porcelain: ' M src/a.py\n', failing: true })
  const result: any = await $.classic.SubagentStop({
    stop_hook_active: false,
    agent_id: 'e1',
    agent_type: 'Explore',
    agent_transcript_path: '/tmp/t.jsonl',
  } as any)
  expect(result.block).toBe(undefined)
})

// --- commit ---------------------------------------------------------------------

test('git commit is refused while checks fail', async ($, on) => {
  await setup($, on, { porcelain: ' M src/a.py\n', failing: true })
  const result = await $.tool.call({ tool: 'Bash', command: 'git commit -m x' } as any)
  expect(refusal(result)).toContain('Commit')
})

test('other shell commands run no checks', async ($, on) => {
  const ran = await setup($, on, { porcelain: ' M src/a.py\n', failing: true })
  const result = await $.tool.call({ tool: 'Bash', command: 'git status' } as any)
  expect(refusal(result)).toBe(undefined)
  expect(ran.some(argv => argv.includes('pytest'))).toBe(false)
})

// --- prompt -----------------------------------------------------------------------

test('the system prompt carries the test-first rules', async ($, on) => {
  await setup($, on)
  const result: any = await $.prompt.compose({
    model: 'm',
    promptModel: 'm',
    surfaces: [],
    tools: [],
    outputStyle: null,
    traits: [],
  } as any)
  const section = result.sections.find((s: any) => s.id === 'tdd-guard:rules')
  expect(section?.scope).toBe('session')
  expect(section?.text).toContain('rot')
})

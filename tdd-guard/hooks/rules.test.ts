import { expect, test } from 'claude-code/testing'

import {
  TESTER,
  UMSETZER,
  addsSkipMarker,
  changedPaths,
  detectCommands,
  feedbackMessage,
  fillFile,
  gateDecision,
  isConfigFile,
  isGitCommit,
  isSourceFile,
  isTestFile,
  lintsFile,
  plannerRules,
  relativeTo,
  stopDecision,
  tail,
  umsetzerSuffix,
} from './rules'

// --- path classification ----------------------------------------------------

test('test files are recognised across languages', () => {
  for (const path of [
    'tests/test_import.py',
    'pkg/test_core.py',
    'pkg/core_test.py',
    'tests/conftest.py',
    'src/app.test.ts',
    'src/app.spec.tsx',
    'web/__tests__/button.js',
    'cmd/server_test.go',
    'test/helpers.rb',
  ]) {
    expect(isTestFile(path)).toBe(true)
  }
})

test('non-test files are not test files', () => {
  for (const path of [
    'src/schnittstelle/ingest/reader.py',
    'src/app.ts',
    'tests/fixtures/README.md',
    'tests/fixtures/sample.txt',
    'docs/test_plan.md',
  ]) {
    expect(isTestFile(path)).toBe(false)
  }
})

test('source files are code outside tests, docs, scripts and tooling', () => {
  expect(isSourceFile('src/schnittstelle/ingest/reader.py')).toBe(true)
  expect(isSourceFile('src/schnittstelle/__init__.py')).toBe(true)
  expect(isSourceFile('lib/parser.ts')).toBe(true)
  expect(isSourceFile('main.go')).toBe(true)

  expect(isSourceFile('tests/test_import.py')).toBe(false)
  expect(isSourceFile('src/app.test.ts')).toBe(false)
  expect(isSourceFile('scripts/compare_models.py')).toBe(false)
  expect(isSourceFile('docs/conf.py')).toBe(false)
  expect(isSourceFile('.claude/hooks/quality.py')).toBe(false)
  expect(isSourceFile('node_modules/x/index.js')).toBe(false)
  expect(isSourceFile('vite.config.ts')).toBe(false)
  expect(isSourceFile('README.md')).toBe(false)
  expect(isSourceFile('analysis.ipynb')).toBe(false)
})

test('fixtures and helpers inside test directories are not source', () => {
  expect(isSourceFile('tests/fixtures/sample_module.py')).toBe(false)
  expect(isSourceFile('src/fixtures/data.py')).toBe(false)
  expect(isTestFile('tests/fixtures/sample_module.py')).toBe(false)
})

test('the project config file is recognised', () => {
  expect(isConfigFile('.claude/tdd-guard.json')).toBe(true)
  expect(isConfigFile('.claude/settings.json')).toBe(false)
})

test('relativeTo gives a posix path inside the root, undefined outside', () => {
  expect(relativeTo('/repo', '/repo/src/a.py')).toBe('src/a.py')
  expect(relativeTo('/repo/', '/repo/src/a.py')).toBe('src/a.py')
  expect(relativeTo('/repo', 'src/a.py')).toBe('src/a.py')
  expect(relativeTo('/repo', '/other/a.py')).toBe(undefined)
  expect(relativeTo('/repo', '/repository/a.py')).toBe(undefined)
})

// --- skip / only markers ----------------------------------------------------

test('new skip, xfail and only markers are detected', () => {
  for (const added of [
    '@pytest.mark.skip\n',
    "@pytest.mark.skipif(True, reason='x')\n",
    "@pytest.mark.xfail(reason='x')\n",
    "    pytest.skip('later')\n",
    "@unittest.skip('x')\n",
    "it.skip('works', () => {})\n",
    "test.only('works', () => {})\n",
    "describe.only('suite', () => {})\n",
    "xit('works', () => {})\n",
    't.Skip("later")\n',
    '#[ignore]\n',
  ]) {
    expect(addsSkipMarker('', added)).toBe(true)
  }
})

test('existing markers and importorskip are not counted as new', () => {
  const old = '@pytest.mark.skip\ndef test_a(): ...\n'
  expect(addsSkipMarker(old, old + '\ndef test_b(): ...\n')).toBe(false)
  expect(addsSkipMarker('', "np = pytest.importorskip('numpy')\n")).toBe(false)
})

// --- gate ---------------------------------------------------------------------

test('a source edit without test changes is refused with a hint to write a test', () => {
  const reason = gateDecision({
    rel: 'src/a.py',
    oldText: '',
    newText: 'x = 1\n',
    hasTestChanges: false,
  })
  expect(reason).toContain('Test')
})

test('a source edit with test changes passes', () => {
  expect(
    gateDecision({ rel: 'src/a.py', oldText: '', newText: 'x = 1\n', hasTestChanges: true }),
  ).toBe(undefined)
})

test('the implementer may not edit tests', () => {
  const reason = gateDecision({
    rel: 'tests/test_a.py',
    oldText: '',
    newText: 'def test_a(): ...\n',
    agentType: UMSETZER,
    hasTestChanges: true,
  })
  expect(reason).toContain('Umsetzer')
})

test('the planner may edit tests', () => {
  expect(
    gateDecision({
      rel: 'tests/test_a.py',
      oldText: '',
      newText: 'def test_a(): ...\n',
      hasTestChanges: false,
    }),
  ).toBe(undefined)
})

test('the implementer may edit source once tests changed', () => {
  expect(
    gateDecision({
      rel: 'src/a.py',
      oldText: '',
      newText: 'x = 1\n',
      agentType: UMSETZER,
      hasTestChanges: true,
    }),
  ).toBe(undefined)
})

test('a new skip marker in a test is refused', () => {
  const reason = gateDecision({
    rel: 'tests/test_a.py',
    oldText: 'def test_a(): ...\n',
    newText: '@pytest.mark.skip\ndef test_a(): ...\n',
    hasTestChanges: true,
  })
  expect(reason).toContain('skip')
})

test('the project config file may not be edited by Claude', () => {
  const reason = gateDecision({
    rel: '.claude/tdd-guard.json',
    oldText: '',
    newText: '{"enabled": false}',
    hasTestChanges: false,
  })
  expect(reason).toContain('Nutzer')
})

test('files outside code and tests pass', () => {
  expect(
    gateDecision({
      rel: 'docs/architektur.md',
      oldText: '',
      newText: 'text\n',
      agentType: UMSETZER,
      hasTestChanges: false,
    }),
  ).toBe(undefined)
})

// --- git ----------------------------------------------------------------------

test('changedPaths parses porcelain output, renames give the new path', () => {
  expect(
    changedPaths(' M src/a.py\n?? tests/test_b.py\nR  old.py -> new.py\nA  "docs/a b.md"\n'),
  ).toEqual(['src/a.py', 'tests/test_b.py', 'new.py', 'docs/a b.md'])
  expect(changedPaths('')).toEqual([])
})

test('git commit is detected in compound commands, other git commands are not', () => {
  expect(isGitCommit("git commit -m 'x'")).toBe(true)
  expect(isGitCommit('git -C /repo commit --amend')).toBe(true)
  expect(isGitCommit('git add . && git commit -m x')).toBe(true)
  expect(isGitCommit('git status')).toBe(false)
  expect(isGitCommit('echo commit')).toBe(false)
  expect(isGitCommit('git log --grep commit')).toBe(false)
})

// --- stop ---------------------------------------------------------------------

test('stop is blocked only once, only with code changes, only when checks fail', () => {
  const failing = { hasCodeChanges: true, checksOk: false, summary: 'FAILED test_x' }
  expect(stopDecision({ ...failing, stopHookActive: true })).toBe(undefined)
  expect(stopDecision({ ...failing, stopHookActive: false, hasCodeChanges: false })).toBe(
    undefined,
  )
  expect(stopDecision({ ...failing, stopHookActive: false, checksOk: true })).toBe(undefined)
  expect(stopDecision({ ...failing, stopHookActive: false })).toContain('FAILED test_x')
})

// --- feedback -------------------------------------------------------------------

test('feedback reports red, green and empty test runs', () => {
  expect(
    feedbackMessage({ rel: 'tests/test_x.py', test: { exitCode: 1, output: '1 failed' } }),
  ).toContain('rot')
  expect(
    feedbackMessage({ rel: 'tests/test_x.py', test: { exitCode: 1, output: '1 failed' } }),
  ).toContain('1 failed')
  expect(
    feedbackMessage({ rel: 'tests/test_x.py', test: { exitCode: 0, output: '3 passed' } }),
  ).toContain('grün')
  expect(
    feedbackMessage({ rel: 'tests/test_x.py', test: { exitCode: 5, output: 'no tests ran' } }),
  ).toContain('keine Tests')
})

test('feedback reports lint findings and stays silent when clean', () => {
  expect(
    feedbackMessage({ rel: 'src/a.py', lint: { exitCode: 1, output: 'F401 unused' } }),
  ).toContain('F401 unused')
  expect(feedbackMessage({ rel: 'src/a.py', lint: { exitCode: 0, output: '' } })).toBe(undefined)
  expect(feedbackMessage({ rel: 'src/a.py' })).toBe(undefined)
})

// --- commands -------------------------------------------------------------------

test('a python project uses the venv for pytest and ruff', () => {
  const commands = detectCommands({
    hasPythonProject: true,
    venvPython: '/repo/.venv/bin/python',
    venvRuff: '/repo/.venv/bin/ruff',
  })
  expect(commands.test).toEqual(['/repo/.venv/bin/python', '-m', 'pytest', '-q'])
  expect(commands.testFile).toEqual([
    '/repo/.venv/bin/python',
    '-m',
    'pytest',
    '-q',
    '-x',
    '--no-header',
    '{file}',
  ])
  expect(commands.lint).toEqual(['/repo/.venv/bin/ruff', 'check', '.'])
  expect(commands.lintFile).toEqual(['/repo/.venv/bin/ruff', 'check', '{file}'])
  expect(commands.format).toEqual(['/repo/.venv/bin/ruff', 'format', '--check', '.'])
})

test('the per-file linter only runs on files of its language', () => {
  const python = detectCommands({ hasPythonProject: true, venvRuff: '/repo/.venv/bin/ruff' })
  expect(lintsFile(python, 'src/a.py')).toBe(true)
  expect(lintsFile(python, 'web/app.ts')).toBe(false)
  expect(lintsFile({ lintFile: ['eslint', '{file}'] }, 'web/app.ts')).toBe(true)
  expect(lintsFile({}, 'src/a.py')).toBe(false)
})

test('a python project without venv uses python3 and no linter', () => {
  const commands = detectCommands({ hasPythonProject: true })
  expect(commands.test).toEqual(['python3', '-m', 'pytest', '-q'])
  expect(commands.lint).toBe(undefined)
})

test('a node project with a real test script uses npm test', () => {
  const commands = detectCommands({ packageTestScript: 'vitest run' })
  expect(commands.test).toEqual(['npm', 'test', '--silent'])
  expect(commands.testFile).toEqual(['npm', 'test', '--silent', '--', '{file}'])
})

test('the npm placeholder test script is ignored', () => {
  const commands = detectCommands({
    packageTestScript: 'echo "Error: no test specified" && exit 1',
  })
  expect(commands.test).toBe(undefined)
})

test('the project config overrides detected commands', () => {
  const commands = detectCommands(
    { hasPythonProject: true },
    { test: ['make', 'test'], lint: ['make', 'lint'] },
  )
  expect(commands.test).toEqual(['make', 'test'])
  expect(commands.lint).toEqual(['make', 'lint'])
  expect(commands.testFile).toEqual(['python3', '-m', 'pytest', '-q', '-x', '--no-header', '{file}'])
})

test('fillFile replaces the file placeholder', () => {
  expect(fillFile(['pytest', '{file}'], 'tests/test_a.py')).toEqual(['pytest', 'tests/test_a.py'])
})

test('tail keeps the last lines', () => {
  expect(tail('a\nb\nc\nd', 2)).toBe('c\nd')
})

// --- prompts --------------------------------------------------------------------

test('planner rules describe the cycle and the implementer split', () => {
  const text = plannerRules()
  expect(text).toContain('rot')
  expect(text).toContain('grün')
  expect(text).toContain(UMSETZER)
  expect(text).toContain('.claude/tdd-guard.json')
})

test('the tester may write tests but not source code', () => {
  const reason = gateDecision({
    rel: 'src/a.py',
    oldText: '',
    newText: 'x = 1\n',
    agentType: TESTER,
    hasTestChanges: true,
  })
  expect(reason).toContain('Tester')
  expect(
    gateDecision({ rel: 'tests/test_a.py', oldText: '', newText: 'def test_a(): pass\n', agentType: TESTER, hasTestChanges: true }),
  ).toBeUndefined()
})

test('frontend-team engineers may not edit tests', () => {
  for (const agentType of ['frontend-team:ui-ingenieur', 'frontend-team:logik-ingenieur', 'frontend-team:anbindungs-ingenieur']) {
    expect(
      gateDecision({ rel: 'tests/test_a.py', oldText: '', newText: 'def test_a(): ...\n', agentType, hasTestChanges: true }),
    ).toMatch(/Als Ingenieur .*des CEO/)
  }
})

test('the frontend-team test engineer may write tests but not source code', () => {
  const agentType = 'frontend-team:test-ingenieur'
  expect(gateDecision({ rel: 'src/a.py', oldText: '', newText: 'x = 1\n', agentType, hasTestChanges: true })).toMatch(/Als Test-Ingenieur .*dem CEO/)
  expect(
    gateDecision({ rel: 'tests/test_a.py', oldText: '', newText: 'def test_a(): pass\n', agentType, hasTestChanges: true }),
  ).toBeUndefined()
})

test('planner rules let the tester write the red tests', () => {
  expect(plannerRules()).toContain(TESTER)
  expect(plannerRules()).not.toContain('schreibst die Tests selbst und')
})

test('the implementer suffix forbids editing tests', () => {
  expect(umsetzerSuffix()).toContain('Testdateien')
})

test('team-delegate roles keep their own names in refusals', () => {
  const reason = gateDecision({ rel: 'tests/test_a.py', oldText: '', newText: 'x\n', agentType: UMSETZER, hasTestChanges: true })
  expect(reason).toMatch(/Als Umsetzer .*des Planers/)
  expect(reason).not.toContain('CEO')
})

test('the implementer suffix names the lead of the agent\'s own team', () => {
  expect(umsetzerSuffix('frontend-team:ui-ingenieur')).toContain('des CEO')
  expect(umsetzerSuffix('frontend-team:ui-ingenieur')).not.toContain('Planer')
  expect(umsetzerSuffix(UMSETZER)).toContain('des Planers')
})

test('planner rules name the frontend-team roles for the CEO', () => {
  expect(plannerRules()).toContain('frontend-team:test-ingenieur')
})

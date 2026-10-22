import type { EngineInterface, PluginOptions, Register, ToolCallResult } from 'claude-code'

import {
  CONFIG_FILE,
  UMSETZER,
  changedPaths,
  detectCommands,
  feedbackMessage,
  fillFile,
  gateDecision,
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
import type { Argv, Commands, ProjectFacts, RunReport } from './rules'

type Mode = 'block' | 'warn' | 'off'
type Dollar = EngineInterface
type Config = Record<string, unknown>
type Project = { root: string; config: Config }
type CheckKey = 'lint' | 'format' | 'test'
type FileChange = { rel: string; oldText: string; newText: string; agentId?: string | undefined }

const CHECK_FAILED =
  'tdd-guard: Prüfung fehlgeschlagen, der Zugriff wird vorsichtshalber abgelehnt. Versuche es erneut; hilft das nicht, melde den Fehler dem Nutzer.'

const PYTHON_MARKERS = ['pyproject.toml', 'setup.py', 'setup.cfg', 'pytest.ini']

const GIT_STATUS = ['git', '-c', 'core.quotepath=off', 'status', '--porcelain', '--untracked-files=all']
const GIT_TIMEOUT_MS = 30_000
const FILE_RUN_TIMEOUT_MS = 90_000

const CHECKS: Record<CheckKey, { label: string; timeoutMs: number }> = {
  lint: { label: 'Linter', timeoutMs: 120_000 },
  format: { label: 'Formatprüfung', timeoutMs: 120_000 },
  test: { label: 'Tests', timeoutMs: 300_000 },
}

// --- small helpers ------------------------------------------------------------

const modeOf = (value: PluginOptions[string] | undefined): Mode =>
  value === 'warn' || value === 'off' ? value : 'block'

const isRecord = (value: unknown): value is Config =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const stringOf = (value: unknown): string | undefined =>
  typeof value === 'string' ? value : undefined

const argvOf = (value: unknown): string[] | undefined =>
  Array.isArray(value) && value.length > 0 && value.every(part => typeof part === 'string')
    ? value
    : undefined

const joinPath = (root: string, rel: string): string => `${root.replace(/\/+$/, '')}/${rel}`

const withContext = (ran: ToolCallResult, text: string): ToolCallResult =>
  ran.deny !== undefined || ran.isError === true
    ? ran
    : { ...ran, context: [...(ran.context ?? []), text] }

// --- project ------------------------------------------------------------------

const readJson = async ($: Dollar, path: string): Promise<Config> => {
  try {
    const parsed: unknown = JSON.parse(await $.fs.read(path))
    return isRecord(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

const readJsonIfExists = async ($: Dollar, path: string): Promise<Config> =>
  (await $.fs.exists(path)) ? readJson($, path) : {}

const existing = async ($: Dollar, root: string, rel: string): Promise<string | undefined> => {
  const path = joinPath(root, rel)
  return (await $.fs.exists(path)) ? path : undefined
}

// remembered at session.start; $.session.cwd() is the fallback
let sessionCwd: string | undefined

// undefined: the guard does nothing here (mode off, or switched off by the project)
const projectFor = async ($: Dollar, mode: Mode): Promise<Project | undefined> => {
  if (mode === 'off') return undefined
  const root = sessionCwd ?? (await $.session.cwd())
  const config = await readJsonIfExists($, joinPath(root, CONFIG_FILE))
  return config.enabled === false ? undefined : { root, config }
}

const factsOf = async ($: Dollar, root: string): Promise<ProjectFacts> => {
  const markers = await Promise.all(PYTHON_MARKERS.map(name => existing($, root, name)))
  const manifest = await readJsonIfExists($, joinPath(root, 'package.json'))
  const scripts = isRecord(manifest.scripts) ? manifest.scripts : {}
  return {
    hasPythonProject: markers.some(path => path !== undefined),
    venvPython: await existing($, root, '.venv/bin/python'),
    venvRuff: await existing($, root, '.venv/bin/ruff'),
    packageTestScript: stringOf(scripts.test),
    packageLintScript: stringOf(scripts.lint),
  }
}

const commandsOf = async ($: Dollar, project: Project): Promise<Commands> => {
  const { config } = project
  return detectCommands(await factsOf($, project.root), {
    test: argvOf(config.test),
    testFile: argvOf(config.testFile),
    lint: argvOf(config.lint),
    lintFile: argvOf(config.lintFile),
    lintExtensions: argvOf(config.lintExtensions),
    format: argvOf(config.format),
  })
}

// --- processes ----------------------------------------------------------------

const runReport = async (
  $: Dollar,
  root: string,
  argv: Argv,
  timeoutMs: number,
): Promise<RunReport> => {
  try {
    const run = await $.process.run(argv, { cwd: root, timeoutMs })
    return { exitCode: run.exitCode, output: tail([run.stdout, run.stderr].join('\n')) }
  } catch (error) {
    return { exitCode: 1, output: `Der Prozess lief nicht durch (Zeitlimit oder Startfehler): ${String(error)}` }
  }
}

// undefined: not a git repository (or git failed)
const gitChanges = async ($: Dollar, root: string): Promise<string[] | undefined> => {
  try {
    const run = await $.process.run(GIT_STATUS, { cwd: root, timeoutMs: GIT_TIMEOUT_MS })
    return run.exitCode === 0 ? changedPaths(run.stdout) : undefined
  } catch {
    return undefined
  }
}

const testsChanged = async ($: Dollar, root: string): Promise<boolean> => {
  const changes = await gitChanges($, root)
  return changes === undefined || changes.some(isTestFile)
}

const runChecks = async ($: Dollar, project: Project, keys: CheckKey[]): Promise<string[]> => {
  const commands = await commandsOf($, project)
  const failures: string[] = []
  for (const key of keys) {
    const argv = commands[key]
    if (argv === undefined) continue
    const { label, timeoutMs } = CHECKS[key]
    const report = await runReport($, project.root, argv, timeoutMs)
    if (report.exitCode !== 0) {
      failures.push(`${label} (${argv.join(' ')}), Exit-Code ${report.exitCode}:\n${report.output}`)
    }
  }
  return failures
}

// --- gate and feedback --------------------------------------------------------

const agentTypeOf = async ($: Dollar, agentId: string | undefined): Promise<string | undefined> =>
  agentId === undefined
    ? undefined
    : (await $.agent.list()).find(agent => agent.id === agentId)?.type

// only a test file's earlier content matters (skip markers)
const previousContent = async ($: Dollar, project: Project, rel: string): Promise<string> => {
  const path = joinPath(project.root, rel)
  return isTestFile(rel) && (await $.fs.exists(path)) ? $.fs.read(path) : ''
}

const gateReason = async (
  $: Dollar,
  project: Project,
  change: FileChange,
): Promise<string | undefined> => {
  const { rel } = change
  return gateDecision({
    rel,
    oldText: change.oldText,
    newText: change.newText,
    agentType: isTestFile(rel) ? await agentTypeOf($, change.agentId) : undefined,
    hasTestChanges: isSourceFile(rel) ? await testsChanged($, project.root) : true,
  })
}

const fileFeedback = async ($: Dollar, project: Project, rel: string): Promise<string | undefined> => {
  const commands = await commandsOf($, project)
  const run = (argv: Argv | undefined) =>
    argv && runReport($, project.root, fillFile(argv, rel), FILE_RUN_TIMEOUT_MS)
  const test = isTestFile(rel) ? await run(commands.testFile) : undefined
  const lint = lintsFile(commands, rel) ? await run(commands.lintFile) : undefined
  return feedbackMessage({ rel, test, lint })
}

const commitProblems = async ($: Dollar, project: Project): Promise<string | undefined> => {
  const failures = await runChecks($, project, ['lint', 'format', 'test'])
  if (failures.length === 0) return undefined
  return `tdd-guard: Beim Commit sind die Prüfungen nicht grün. Behebe sie, bevor du committest:\n\n${failures.join('\n\n')}`
}

const stopReason = async (
  $: Dollar,
  project: Project,
  stopHookActive: boolean,
): Promise<string | undefined> => {
  if (stopHookActive) return undefined
  const changes = (await gitChanges($, project.root)) ?? []
  const hasCodeChanges = changes.some(path => isTestFile(path) || isSourceFile(path))
  if (!hasCodeChanges) return undefined
  const failures = await runChecks($, project, ['test', 'lint'])
  return stopDecision({
    stopHookActive,
    hasCodeChanges,
    checksOk: failures.length === 0,
    summary: failures.join('\n\n'),
  })
}

// --- wiring -------------------------------------------------------------------

export const register: Register = (on, options) => {
  const mode = modeOf(options.mode)

  on('session.start', (_$, e, next) => {
    sessionCwd = e.cwd
    return next(e)
  })

  on('tool.call', { tool: ['Edit', 'Write'] }, async ($, e, next) => {
    const project = await projectFor($, mode)
    const rel = project && relativeTo(project.root, e.file_path)
    if (project === undefined || rel === undefined) return next(e)

    const change: FileChange = {
      rel,
      oldText: e.tool === 'Edit' ? e.old_string : await previousContent($, project, rel),
      newText: e.tool === 'Edit' ? e.new_string : e.content,
      agentId: e.agentId,
    }
    const reason = await gateReason($, project, change)
    if (reason !== undefined) {
      return mode === 'block' ? { deny: reason } : withContext(await next(e), reason)
    }

    const ran = await next(e)
    if (ran.deny !== undefined || ran.isError === true) return ran
    const message = await fileFeedback($, project, rel)
    return message === undefined ? ran : withContext(ran, message)
  }).catch(($, e, next) => (next.called || mode !== 'block' ? next(e) : { deny: CHECK_FAILED }))

  on('tool.call', { tool: 'Bash' }, async ($, e, next) => {
    const project = isGitCommit(e.command) ? await projectFor($, mode) : undefined
    const problems = project && (await commitProblems($, project))
    if (problems === undefined) return next(e)
    return mode === 'block' ? { deny: problems } : withContext(await next(e), problems)
  }).catch(($, e, next) => (next.called || mode !== 'block' ? next(e) : { deny: CHECK_FAILED }))

  on('classic.Stop', async ($, e, next) => {
    const project = mode === 'block' ? await projectFor($, mode) : undefined
    const reason = project && (await stopReason($, project, e.stop_hook_active))
    return reason === undefined ? next(e) : { ...(await next(e)), block: reason }
  })

  on('classic.SubagentStop', async ($, e, next) => {
    const isImplementer = mode === 'block' && e.agent_type === UMSETZER
    const project = isImplementer ? await projectFor($, mode) : undefined
    const reason = project && (await stopReason($, project, e.stop_hook_active))
    return reason === undefined ? next(e) : { ...(await next(e)), block: reason }
  })

  on('prompt.compose', async ($, e, next) => {
    const r = await next(e)
    if ((await projectFor($, mode)) === undefined) return r
    return {
      ...r,
      sections: [...r.sections, { id: 'tdd-guard:rules', text: plannerRules(), scope: 'session' }],
    }
  })

  on('agent.spawn', async ($, e, next) => {
    if (e.subagentType !== UMSETZER || (await projectFor($, mode)) === undefined) return next(e)
    return next({ ...e, prompt: `${e.prompt}\n\n${umsetzerSuffix()}` })
  })
}

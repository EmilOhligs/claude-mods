// Pure logic of the tdd-guard mod: path classification, gate decisions, git and
// command parsing, messages. No `$` calls here; register.ts does the wiring.

export const UMSETZER = 'team-delegate:umsetzer'
export const TESTER = 'team-delegate:tester'
export const CONFIG_FILE = '.claude/tdd-guard.json'

// frontend-team (elias-mods) has its own roles with the same split
const IMPLEMENTERS = [UMSETZER, 'frontend-team:ui-ingenieur', 'frontend-team:logik-ingenieur', 'frontend-team:anbindungs-ingenieur']
const TESTERS = [TESTER, 'frontend-team:test-ingenieur']
export const isImplementer = (agentType: string | undefined): boolean => IMPLEMENTERS.includes(agentType ?? '')
const isTester = (agentType: string | undefined): boolean => TESTERS.includes(agentType ?? '')

// --- path classification ----------------------------------------------------

const CODE_EXTENSION =
  /\.(py|ts|tsx|js|jsx|mjs|cjs|go|rs|java|kt|rb|swift|c|cc|cpp|h|hpp|cs|php)$/

const TEST_NAME_PATTERNS = [
  /^test_.*\.py$/,
  /_test\.(py|go|rb)$/,
  /^conftest\.py$/,
  /\.(test|spec)\.(js|jsx|ts|tsx|mjs|cjs)$/,
  /Tests?\.(java|kt|cs)$/,
]

const TEST_DIRECTORIES = ['tests', 'test', '__tests__', 'spec']

const NON_SOURCE_DIRECTORIES = [
  'scripts',
  'docs',
  'doc',
  'examples',
  'node_modules',
  'vendor',
  'dist',
  'build',
  '.venv',
  'venv',
  '.claude',
  '.github',
  '.git',
]

const NON_SOURCE_NAMES = [/\.config\.(js|ts|mjs|cjs)$/, /^setup\.py$/, /^noxfile\.py$/]

const directoriesOf = (rel: string): string[] => rel.split('/').slice(0, -1)

const baseNameOf = (rel: string): string => rel.split('/').at(-1) ?? ''

export const isCodeFile = (rel: string): boolean => CODE_EXTENSION.test(rel)

export const isTestFile = (rel: string): boolean => {
  if (!isCodeFile(rel)) return false
  const directories = directoriesOf(rel)
  if (directories.includes('fixtures')) return false
  const name = baseNameOf(rel)
  return (
    TEST_NAME_PATTERNS.some(pattern => pattern.test(name)) ||
    directories.some(directory => TEST_DIRECTORIES.includes(directory))
  )
}

// fixtures and test helpers are neither tests nor source
const NOT_SOURCE_DIRECTORIES = [...NON_SOURCE_DIRECTORIES, ...TEST_DIRECTORIES, 'fixtures']

export const isSourceFile = (rel: string): boolean =>
  isCodeFile(rel) &&
  !isTestFile(rel) &&
  !directoriesOf(rel).some(directory => NOT_SOURCE_DIRECTORIES.includes(directory)) &&
  !NON_SOURCE_NAMES.some(pattern => pattern.test(baseNameOf(rel)))

export const isConfigFile = (rel: string): boolean => rel === CONFIG_FILE

// Resolves `.` and `..`; undefined when the path climbs above its start.
const segmentsOf = (path: string): string[] | undefined => {
  const parts: string[] = []
  for (const part of path.split('/')) {
    if (part === '' || part === '.') continue
    if (part === '..') {
      if (parts.pop() === undefined) return undefined
    } else {
      parts.push(part)
    }
  }
  return parts
}

export const relativeTo = (root: string, path: string): string | undefined => {
  const parts = segmentsOf(path)
  if (parts === undefined) return undefined
  if (!path.startsWith('/')) return parts.length > 0 ? parts.join('/') : undefined

  const base = segmentsOf(root)
  if (base === undefined || parts.length <= base.length) return undefined
  if (!base.every((part, index) => part === parts[index])) return undefined
  return parts.slice(base.length).join('/')
}

// --- skip / only markers ----------------------------------------------------

const SKIP_MARKERS = [
  /pytest\.mark\.(skip|skipif|xfail)\b/g,
  /\bpytest\.(skip|xfail)\(/g,
  /\bunittest\.(skip|expectedFailure)/g,
  /\b(it|test|describe)\.(skip|only|todo)\(/g,
  // not after a dot, so `model.fit(` is no marker
  /(^|[^\w.])(xit|xtest|xdescribe|fit|fdescribe)\(/g,
  /\bt\.Skip\w*\(/g,
  /#\[ignore\b/g,
]

const countSkipMarkers = (text: string): number =>
  SKIP_MARKERS.reduce((sum, pattern) => sum + (text.match(pattern) ?? []).length, 0)

export const addsSkipMarker = (oldText: string, newText: string): boolean =>
  countSkipMarkers(newText) > countSkipMarkers(oldText)

// --- gate ---------------------------------------------------------------------

export type GateInput = {
  rel: string
  oldText: string
  newText: string
  agentType?: string | undefined
  hasTestChanges: boolean
}

const configReason = (): string =>
  `tdd-guard: ${CONFIG_FILE} ändert nur der Nutzer selbst. Ändere die Datei nicht und umgehe die Sperre nicht; bitte den Nutzer, sie bei Bedarf anzupassen.`

const umsetzerReason = (rel: string): string =>
  `tdd-guard: Als Umsetzer änderst du keine Testdateien (${rel}), sie sind die Spezifikation des Planers. Ist der Test falsch, brich ab und begründe in deinem Bericht, was am Test nicht stimmt.`

const testerReason = (rel: string): string =>
  `tdd-guard: Als Tester schreibst du nur Tests; ${rel} ist Quellcode. Melde dem Planer den roten Test, die Umsetzung macht der Umsetzer.`

const skipReason = (rel: string): string =>
  `tdd-guard: ${rel} bekommt einen neuen skip-, xfail-, only- oder ignore-Marker. Tests werden nicht übersprungen oder isoliert, damit die Suite grün wird. Das geht nur mit ausdrücklicher Zustimmung des Nutzers: frage ihn.`

const noTestReason = (rel: string): string =>
  `tdd-guard: ${rel} ist Quellcode, und in der Arbeitskopie ist noch kein Test geändert oder neu. Schreibe zuerst einen roten Test und prüfe, dass er aus dem richtigen Grund fehlschlägt. Bei reiner Dokumentation oder reiner Umbenennung frage den Nutzer. Abschalten kann nur der Nutzer, über ${CONFIG_FILE} mit {"enabled": false} oder die Mod-Option mode.`

export const gateDecision = (input: GateInput): string | undefined => {
  const { rel } = input
  if (isConfigFile(rel)) return configReason()
  if (isTestFile(rel)) {
    if (isImplementer(input.agentType)) return umsetzerReason(rel)
    return addsSkipMarker(input.oldText, input.newText) ? skipReason(rel) : undefined
  }
  if (isTester(input.agentType) && isSourceFile(rel)) return testerReason(rel)
  if (isSourceFile(rel) && !input.hasTestChanges) return noTestReason(rel)
  return undefined
}

// --- git ----------------------------------------------------------------------

const ESCAPES: Record<string, string> = { n: '\n', t: '\t' }

const unquote = (path: string): string =>
  path.length >= 2 && path.startsWith('"') && path.endsWith('"')
    ? path.slice(1, -1).replace(/\\(.)/g, (_, char: string) => ESCAPES[char] ?? char)
    : path

const pathOfLine = (line: string): string => {
  const rest = line.slice(3)
  const isMove = /[RC]/.test(line.slice(0, 2)) && rest.includes(' -> ')
  return unquote(isMove ? rest.slice(rest.lastIndexOf(' -> ') + 4) : rest)
}

export const changedPaths = (porcelain: string): string[] =>
  porcelain
    .split('\n')
    .filter(line => line.length > 3)
    .map(pathOfLine)

const GLOBAL_OPTIONS_WITH_VALUE = ['-C', '-c', '--git-dir', '--work-tree', '--namespace']

const tokensOf = (command: string): string[] =>
  command.match(/(?:[^\s"']|"[^"]*"|'[^']*')+/g) ?? []

const isCommitCommand = (tokens: string[]): boolean => {
  if (tokens[0] !== 'git') return false
  let index = 1
  while (tokens[index]?.startsWith('-')) {
    index += GLOBAL_OPTIONS_WITH_VALUE.includes(tokens[index] ?? '') ? 2 : 1
  }
  return tokens[index] === 'commit'
}

export const isGitCommit = (command: string): boolean =>
  command
    .split(/&&|\|\||;|\||\n/)
    .some(part => isCommitCommand(tokensOf(part)))

// --- stop ---------------------------------------------------------------------

export type StopInput = {
  stopHookActive: boolean
  hasCodeChanges: boolean
  checksOk: boolean
  summary: string
}

export const stopDecision = (input: StopInput): string | undefined => {
  if (input.stopHookActive || !input.hasCodeChanges || input.checksOk) return undefined
  return [
    'tdd-guard: Du hast Code geändert, aber Tests oder Linter sind nicht grün. Beende den Zug noch nicht.',
    'Behebe die Ursache. Ändere Tests nicht, nur damit sie bestehen; ist ein Test falsch, sage das dem Nutzer.',
    '',
    input.summary,
  ].join('\n')
}

// --- feedback -------------------------------------------------------------------

export type RunReport = { exitCode: number; output: string }

export type FeedbackInput = {
  rel: string
  test?: RunReport | undefined
  lint?: RunReport | undefined
}

const testFeedback = (rel: string, test: RunReport): string => {
  if (test.exitCode === 0) {
    return `tdd-guard: Der Testlauf für ${rel} ist grün. War das ein neuer Test, hätte er zuerst rot sein müssen: prüfe, dass er wirklich etwas prüft.`
  }
  if (test.exitCode === 5) {
    return `tdd-guard: Der Lauf für ${rel} hat keine Tests gefunden (Exit-Code 5). Prüfe Dateiname, Testname und Pfad.\n${test.output}`
  }
  return [
    `tdd-guard: Der Test für ${rel} ist rot (Exit-Code ${test.exitCode}):`,
    test.output,
    'Ist er rot aus dem richtigen Grund? Er soll am fehlenden Verhalten scheitern, nicht an einem Tippfehler oder Importfehler.',
  ].join('\n')
}

const lintFeedback = (rel: string, lint: RunReport): string | undefined =>
  lint.exitCode === 0 ? undefined : `tdd-guard: Der Linter meldet Befunde zu ${rel}:\n${lint.output}`

export const feedbackMessage = (input: FeedbackInput): string | undefined => {
  const parts = [
    input.test && testFeedback(input.rel, input.test),
    input.lint && lintFeedback(input.rel, input.lint),
  ].filter((part): part is string => typeof part === 'string')
  return parts.length > 0 ? parts.join('\n\n') : undefined
}

// --- commands -------------------------------------------------------------------

export type Argv = readonly string[]

export type Commands = {
  test?: Argv | undefined
  testFile?: Argv | undefined
  lint?: Argv | undefined
  lintFile?: Argv | undefined
  /** File endings `lintFile` understands; undefined means every code file. */
  lintExtensions?: Argv | undefined
  format?: Argv | undefined
}

export type ProjectFacts = {
  hasPythonProject?: boolean | undefined
  venvPython?: string | undefined
  venvRuff?: string | undefined
  packageTestScript?: string | undefined
  packageLintScript?: string | undefined
}

const pythonCommands = (facts: ProjectFacts): Commands => {
  const py = facts.venvPython ?? 'python3'
  const ruff = facts.venvRuff
  return {
    test: [py, '-m', 'pytest', '-q'],
    testFile: [py, '-m', 'pytest', '-q', '-x', '--no-header', '{file}'],
    ...(ruff !== undefined && {
      lint: [ruff, 'check', '.'],
      lintFile: [ruff, 'check', '{file}'],
      lintExtensions: ['.py', '.pyi'],
      format: [ruff, 'format', '--check', '.'],
    }),
  }
}

const hasRealTestScript = (script: string | undefined): script is string =>
  script !== undefined && script !== '' && !/no test specified/i.test(script)

const nodeCommands = (facts: ProjectFacts): Commands => ({
  ...(hasRealTestScript(facts.packageTestScript) && {
    test: ['npm', 'test', '--silent'],
    testFile: ['npm', 'test', '--silent', '--', '{file}'],
  }),
  ...(facts.packageLintScript !== undefined &&
    facts.packageLintScript !== '' && { lint: ['npm', 'run', 'lint', '--silent'] }),
})

const definedOnly = (commands: Commands): Commands =>
  Object.fromEntries(Object.entries(commands).filter(([, argv]) => argv !== undefined)) as Commands

export const detectCommands = (facts: ProjectFacts, config: Commands = {}): Commands => {
  const detected = facts.hasPythonProject ? pythonCommands(facts) : nodeCommands(facts)
  // a linter of the project's own choosing is not held to the detected one's endings
  const ownLinter = config.lintFile !== undefined ? { lintExtensions: config.lintExtensions } : {}
  return { ...detected, ...ownLinter, ...definedOnly(config) }
}

export const lintsFile = (commands: Commands, rel: string): boolean =>
  commands.lintFile !== undefined &&
  (commands.lintExtensions === undefined ||
    commands.lintExtensions.some(ending => rel.endsWith(ending)))

export const fillFile = (argv: Argv, file: string): string[] =>
  argv.map(part => part.split('{file}').join(file))

export const tail = (text: string, n = 30): string => text.trimEnd().split('\n').slice(-n).join('\n')

// --- prompts --------------------------------------------------------------------

export const plannerRules = (): string =>
  [
    'Test-first (tdd-guard):',
    '- Jede Verhaltensänderung an Code beginnt mit einem Test. Zyklus: rot (Test schreiben, laufen lassen, prüfen, dass er aus dem richtigen Grund fehlschlägt), grün (so wenig Code wie nötig), aufräumen (Test bleibt grün), dann die ganze Suite und den Linter laufen lassen.',
    '- Einen Bugfix beginnst du mit einem Test, der den Fehler reproduziert und rot ist.',
    '- Ändere nie einen Test, nur damit er besteht. Ist der Test falsch, sage es dem Nutzer und begründe es.',
    '- Kein skip, xfail oder only ohne Zustimmung des Nutzers.',
    '- Ohne Test gehen: reine Dokumentation, Formatierung, Umbenennung, Einweg-Skripte. Lehnt die Sperre eine solche Änderung an Quellcode ab, frage den Nutzer.',
    '- Dein Bericht nennt: welcher Test, warum er rot war, dass er jetzt grün ist, und das Ergebnis der ganzen Suite.',
    'Rollen mit Tester und Umsetzer:',
    `- Die roten Tests schreibst du selbst oder lässt sie vom Tester (${TESTER}) schreiben; prüfe in beiden Fällen selbst, dass sie aus dem richtigen Grund rot sind.`,
    `- Den Umsetzer (${UMSETZER}) rufst du pro Aufruf mit einem roten Test auf: Pfad, Testname und Fehlermeldung, dazu die Zieldateien und der Auftrag "grün machen, keine Testdateien ändern". Danach prüfst du das Ergebnis selbst.`,
    'Was erzwungen wird (nur in Git-Repositories):',
    '- Quellcode lässt sich erst ändern, wenn in der Arbeitskopie ein Test geändert oder neu ist. Der Umsetzer ändert keine Testdateien, der Tester keinen Quellcode, neue skip-/only-Marker werden abgelehnt, und Zug und Commit enden nur mit grüner Suite.',
    `- Abschalten kann nur der Nutzer, in ${CONFIG_FILE} mit {"enabled": false} oder über die Mod-Option mode. Ändere diese Datei nie selbst.`,
  ].join('\n')

export const umsetzerSuffix = (): string =>
  [
    'Test-first-Regeln für dich als Umsetzer:',
    '- Ändere keine Testdateien. Die Tests sind die Spezifikation des Planers.',
    '- Mache den genannten roten Test grün, mit so wenig Code wie nötig.',
    '- Am Ende müssen die ganze Suite und der Linter grün sein, sonst kannst du nicht abschließen.',
    '- Ist der Test falsch, brich ab und begründe es in deinem Bericht.',
  ].join('\n')

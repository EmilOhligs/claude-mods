import { expect, test } from 'claude-code/testing'

import { CORE_REVIEWERS, ceoSection, parseArgs, readSettings } from './register'

test('defaults: target 9, four rounds, UI every three rounds, core reviewers only', () => {
  const s = readSettings({})
  expect(s.targetScore).toBe(9)
  expect(s.maxRounds).toBe(4)
  expect(s.showUiEvery).toBe(3)
  expect(s.reviewers).toEqual(CORE_REVIEWERS)
})

test('optional reviewers join only when switched on', () => {
  const s = readSettings({ reviewPrivacy: true, reviewCode: true, reviewTexts: false })
  expect(s.reviewers).toEqual([...CORE_REVIEWERS, 'tuev-datenschutz', 'tuev-code-review'])
})

test('string options are read as numbers, invalid ones fall back', () => {
  const s = readSettings({ targetScore: '10', maxRounds: 'viele', showUiEvery: '2' })
  expect(s.targetScore).toBe(10)
  expect(s.maxRounds).toBe(4)
  expect(s.showUiEvery).toBe(2)
})

test('CEO section names every agent with the plugin prefix and the stop rules', () => {
  const text = ceoSection('frontend-team', readSettings({ maxRounds: '3' }))
  expect(text).toContain('frontend-team:ceo-ablauf')
  expect(text).toContain('frontend-team:ui-ingenieur')
  expect(text).toContain('frontend-team:tuev-barrierefreiheit')
  expect(text).toContain('mindestens 9/10')
  expect(text).toContain('höchstens 3 Bau- und Prüfrunden')
  expect(text).toContain('Alle 3 Runden')
})

test('CEO section puts test engineer and lean guard into the hierarchy and forbids own code', () => {
  const text = ceoSection('frontend-team', readSettings({}))
  expect(text).toContain('frontend-team:test-ingenieur')
  expect(text).toContain('frontend-team:schlank-waechter')
  expect(text).toContain('keinen Code')
})

test('the first word of /frontend picks the level, the rest is the task', () => {
  expect(parseArgs('leicht Baue eine Anmeldeseite')).toEqual({ level: 'leicht', task: 'Baue eine Anmeldeseite' })
  expect(parseArgs('design Startseite')).toEqual({ level: 'design', task: 'Startseite' })
  expect(parseArgs('aus')).toEqual({ level: 'aus', task: '' })
  expect(parseArgs('Baue eine Liste')).toEqual({ level: 'voll', task: 'Baue eine Liste' })
  expect(parseArgs('')).toEqual({ level: 'voll', task: '' })
})

test('level leicht: two reviewers on Sonnet, target 8, two rounds, no proposal round', () => {
  const s = readSettings({ reviewPrivacy: true }, 'leicht')
  expect(s.reviewers).toEqual(['tuev-debugger', 'tuev-security'])
  expect(s.targetScore).toBe(8)
  expect(s.maxRounds).toBe(2)
  expect(s.proposalRound).toBe(false)
  expect(s.reviewerModel).toBe('sonnet')
  const text = ceoSection('frontend-team', s)
  expect(text).toContain('keine Vorschlagsrunde')
  expect(text).toContain('model "sonnet"')
})

test('level design: design and accessibility only, three rounds', () => {
  const s = readSettings({ targetScore: '10' }, 'design')
  expect(s.reviewers).toEqual(['tuev-design', 'tuev-barrierefreiheit'])
  expect(s.targetScore).toBe(10)
  expect(s.maxRounds).toBe(3)
  expect(s.proposalRound).toBe(true)
  expect(s.reviewerModel).toBeUndefined()
})

test('level voll keeps the configured settings', () => {
  expect(readSettings({ maxRounds: '5' }, 'voll')).toEqual(readSettings({ maxRounds: '5' }))
})

const CODE_WRITE = { tool: 'Write', file_path: '/repo/src/a.ts', content: 'x' } as any

test('/frontend aus lifts the code lock again', async ($, on) => {
  on('command.register', () => ({ value: { command: 'frontend' } }))
  on('ui.toast', () => ({ value: undefined }))
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))
  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })

  await $.command.run({ command: 'frontend', args: 'leicht Baue X' })
  expect((await $.tool.call(CODE_WRITE)).deny).toContain('Code-Sperre')

  const off = await $.command.run({ command: 'frontend', args: 'aus' })
  expect(off.text).toContain('aus')
  expect((await $.tool.call(CODE_WRITE)).deny).toBeUndefined()
})

test('level words are read regardless of case', () => {
  expect(parseArgs('Aus')).toEqual({ level: 'aus', task: '' })
  expect(parseArgs('Leicht Baue X')).toEqual({ level: 'leicht', task: 'Baue X' })
})

const COMPOSE = { model: 'm', promptModel: 'm', surfaces: [], tools: [], outputStyle: null, traits: [] } as any

const start = async ($: any, on: any) => {
  on('command.register', () => ({ value: { command: 'frontend' } }))
  on('ui.toast', () => ({ value: undefined }))
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))
  on('prompt.compose', () => ({ sections: [] }))
  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })
}

test('the system prompt follows the chosen level and drops the CEO section after aus', async ($, on) => {
  await start($, on)
  await $.command.run({ command: 'frontend', args: 'leicht Baue X' })
  const ceo = (r: any) => r.sections.find((s: any) => s.id === 'frontend-team:ceo')
  expect(ceo(await $.prompt.compose(COMPOSE))?.text).toContain('keine Vorschlagsrunde')

  const off = await $.command.run({ command: 'frontend', args: 'aus' })
  expect(off.context?.join(' ')).toContain('gelten nicht mehr')
  expect(ceo(await $.prompt.compose(COMPOSE))).toBeUndefined()
})

test('level leicht runs reviewers only on Sonnet', async ($, on) => {
  await start($, on)
  await $.command.run({ command: 'frontend', args: 'leicht Baue X' })
  const call = (model?: string) => $.tool.call({ tool: 'Agent', subagent_type: 'frontend-team:tuev-security', prompt: 'p', description: 'd', model } as any)
  expect((await call()).deny).toContain('sonnet')
  expect((await call('opus')).deny).toContain('sonnet')
  expect((await call('sonnet')).deny).toBeUndefined()
})

test('the task after the level word reaches the model with the next message', async ($, on) => {
  await start($, on)
  const run = await $.command.run({ command: 'frontend', args: 'leicht Baue eine Liste' })
  expect(run.context).toContain('Aufgabe: Baue eine Liste')
  expect(run.text).toContain('"los"')
  const bare = await $.command.run({ command: 'frontend', args: 'design' })
  expect(bare.text).not.toContain('"los"')
})

test('the token band is left to token-counter: no /tokens command of its own', async ($, on) => {
  const names: string[] = []
  on('command.register', (_: any, e: any) => {
    names.push(e.name)
    return { value: { command: e.name } }
  })
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })
  expect(names).toEqual(['frontend'])
})

test('the status line shows the active level and clears after aus', async ($, on) => {
  const status: (string | undefined)[] = []
  on('ui.status', (_: any, e: any) => {
    status.push(e.text)
    return { value: undefined }
  })
  await start($, on)
  await $.command.run({ command: 'frontend', args: 'leicht Baue X' })
  await $.command.run({ command: 'frontend', args: 'aus' })
  expect(status).toEqual(['Frontend-Team: leicht', undefined])
})

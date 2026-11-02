import { expect, test } from 'claude-code/testing'

import { LEVELS, ROLES, ceoSection, plannerSection, readSettings, workerPrompt } from './register'

const COMPOSE = { model: 'm', promptModel: 'm', surfaces: [], tools: [], outputStyle: null, traits: [] } as any
const CODE_WRITE = { tool: 'Write', file_path: '/repo/src/a.ts', content: 'x' } as any
const OFFER = (agent: string) => ({ agent, description: 'd', source: 'plugin', provider: { plugin: 'team', tier: 'user' } }) as any

// Stands in for the engine: commands, agents, status, tools and the system prompt.
const start = async ($: any, on: any) => {
  const seen = { commands: [] as any[], agents: [] as any[], status: [] as (string | undefined)[] }
  on('command.register', (_: any, e: any) => {
    seen.commands.push(e)
    return { value: { command: e.name } }
  })
  on('agent.register', (_: any, e: any) => {
    seen.agents.push(e)
    return { value: { agent: `team:${e.name}` } }
  })
  on('agent.offer', () => ({ isOffered: true }))
  on('ui.toast', () => ({ value: undefined }))
  on('ui.status', (_: any, e: any) => {
    seen.status.push(e.text)
    return { value: undefined }
  })
  on('session.start', (_: any, e: any) => ({ cwd: e.cwd }))
  on('tool.call', () => ({ result: {} }))
  on('prompt.compose', () => ({ sections: [] }))
  await $.session.start({ cwd: '/repo', surface: 'desktop', isInteractive: true })
  return seen
}

const section = async ($: any, id: string) =>
  ((await $.prompt.compose(COMPOSE)) as any).sections.find((s: any) => s.id === id)

// --- levels and commands ------------------------------------------------------------

test('five levels, numbered 0 to 4, each with a name', () => {
  expect(LEVELS.map(l => `${l.level} ${l.name}`)).toEqual(['0 Allein', '1 Delegieren', '2 Prüfen', '3 Design', '4 Voll'])
})

test('one command per level with its number and name in the description, nothing else', async ($, on) => {
  const seen = await start($, on)
  expect(seen.commands.map(c => c.name)).toEqual(['team-0', 'team-1', 'team-2', 'team-3', 'team-4'])
  seen.commands.forEach((c, i) => expect(c.description).toContain(`${LEVELS[i]!.name}:`))
})

test('a session starts on level 1 and shows it in the status line', async ($, on) => {
  const seen = await start($, on)
  expect(seen.status).toEqual(['Team: 1 Delegieren'])
  expect((await section($, 'team:planner'))?.text).toContain('"team:umsetzer"')
  expect(await section($, 'team:ceo')).toBeUndefined()
})

test('the implementer and the finder are registered with their models', async ($, on) => {
  const seen = await start($, on)
  expect(seen.agents.map(a => [a.name, a.model])).toEqual([['umsetzer', 'sonnet'], ['sucher', 'haiku']])
})

test('level 0 adds no team section and offers no team agent', async ($, on) => {
  const seen = await start($, on)
  await $.command.run({ command: 'team-0', args: '' })
  expect(seen.status.at(-1)).toBe('Team: 0 Allein')
  expect(await section($, 'team:planner')).toBeUndefined()
  expect(await section($, 'team:ceo')).toBeUndefined()
  expect((await $.agent.offer(OFFER('team:umsetzer'))).isOffered).toBe(false)
  expect((await $.agent.offer(OFFER('Explore'))).isOffered).toBe(true)
})

test('level 2 makes the chat the CEO behind the code lock, with cheap reviewers', async ($, on) => {
  const seen = await start($, on)
  const run = await $.command.run({ command: 'team-2', args: 'Baue die Anmeldeseite' })
  expect(seen.status.at(-1)).toBe('Team: 2 Prüfen')
  expect(run.context).toContain('Aufgabe: Baue die Anmeldeseite')
  expect(run.text).toContain('"los"')
  expect((await section($, 'team:ceo'))?.text).toContain('keine Vorschlagsrunde')
  expect(await section($, 'team:planner')).toBeUndefined()
  expect((await $.tool.call(CODE_WRITE)).deny).toContain('Code-Sperre')
  const reviewer = (model?: string) =>
    $.tool.call({ tool: 'Agent', subagent_type: 'team:sicherheitspruefer', prompt: 'p', description: 'd', model } as any)
  expect((await reviewer()).deny).toContain('sonnet')
  expect((await reviewer('sonnet')).deny).toBeUndefined()
})

test('the implementer still works below the CEO, general agents do not', async ($, on) => {
  await start($, on)
  await $.command.run({ command: 'team-3', args: '' })
  const agent = (subagent_type?: string) => $.tool.call({ tool: 'Agent', subagent_type, prompt: 'p', description: 'd' } as any)
  expect((await agent('team:umsetzer')).deny).toBeUndefined()
  expect((await agent('general-purpose')).deny).toBeDefined()
})

test('going back to level 1 lifts the lock and tells the model the CEO role ended', async ($, on) => {
  await start($, on)
  await $.command.run({ command: 'team-4', args: '' })
  const back = await $.command.run({ command: 'team-1', args: '' })
  expect(back.context?.join(' ')).toContain('gelten nicht mehr')
  expect((await $.tool.call(CODE_WRITE)).deny).toBeUndefined()
  expect(await section($, 'team:ceo')).toBeUndefined()
  expect(await section($, 'team:planner')).toBeDefined()
})

// --- settings of the reviewing levels -----------------------------------------------

test('level 2: debugger and security on Sonnet, target 8, two rounds, no proposal round', () => {
  const s = readSettings({ reviewPrivacy: true }, 2)
  expect([s.reviewers, s.targetScore, s.maxRounds, s.proposalRound, s.reviewerModel]).toEqual([
    ['debugger', 'sicherheitspruefer'], 8, 2, false, 'sonnet',
  ])
})

test('level 3: design and accessibility, three rounds, configured target', () => {
  const s = readSettings({ targetScore: '10' }, 3)
  expect([s.reviewers, s.targetScore, s.maxRounds, s.reviewerModel]).toEqual([['design', 'barrierefreiheit'], 10, 3, undefined])
})

test('level 4: core reviewers plus the switched-on ones, configured rounds', () => {
  const s = readSettings({ reviewPrivacy: true, reviewCode: true, maxRounds: '5', targetScore: 'viele' }, 4)
  expect(s.reviewers).toEqual(['design', 'debugger', 'sicherheitspruefer', 'barrierefreiheit', 'datenschutz', 'reviewer'])
  expect([s.maxRounds, s.targetScore, s.showUiEvery]).toEqual([5, 9, 3])
})

test('CEO section names engineers, tester, lean guard and reviewers with the prefix', () => {
  const text = ceoSection('team', readSettings({}, 4))
  for (const agent of ['ui-ingenieur', 'logik-ingenieur', 'anbindungs-ingenieur', 'umsetzer', 'tester', 'schlank-waechter', 'design'])
    expect(text).toContain(`team:${agent}`)
  expect(text).toContain('team:ceo-ablauf')
  expect(text).toContain('keinen Code')
})

test('the CEO section gives code without UI to the implementer, or to the logic engineer when it may not edit', () => {
  const text = ceoSection('team', readSettings({}, 2))
  expect(text).toContain('team:umsetzer für Code ohne Oberfläche')
  expect(text).not.toMatch(/Sonnet\):[^\n]*team:umsetzer/)
  const readOnly = ceoSection('team', readSettings({ canEdit: false }, 2))
  expect(readOnly).toContain('team:logik-ingenieur für Code ohne Oberfläche')
  expect(readOnly).not.toContain('team:umsetzer für Code ohne Oberfläche')
})

// --- level 1: planner and roles ------------------------------------------------------

test('planner section names every role with the prefix and warns when the context is tight', () => {
  const text = plannerSection('team')
  for (const name of ['umsetzer', 'tester', 'reviewer', 'sicherheitspruefer', 'sucher']) expect(text).toContain(`"team:${name}"`)
  expect(plannerSection('team', 40)).not.toContain('Kontext ist zu')
  expect(plannerSection('team', 82)).toContain('Kontext ist zu 82 %')
})

test('the finder only reads, the implementer follows canEdit', () => {
  const sucher = ROLES.find(r => r.name === 'sucher')!
  expect(sucher.tools).toEqual(['Read', 'Grep', 'Glob'])
  expect(workerPrompt(true)).toContain('Du darfst Dateien ändern')
  expect(workerPrompt(false)).toContain('Du darfst nichts ändern')
})

import { expect, test } from 'claude-code/testing'

import { mergeRuns, sessionTokens } from './runs'

const line = (at: string, role: string, output: number, costUsd: number) =>
  JSON.stringify({
    at, session: 'abcdef1234', project: 'claude-mods', durationMs: 1000, role, model: 'claude-opus-5-5',
    input: 2, output, cacheRead: 1000, cacheWrite: 0, contextPercent: 10, costUsd,
  })

const log = [
  line('2026-10-23T12:00:00.000Z', 'main', 500, 1.5),
  line('2026-10-23T12:01:00.000Z', 'agent', 200, 1.7),
  line('2026-10-23T12:02:00.000Z', 'main', 700, 2.25),
].join('\n') + '\n'

const old = { run: 'x', at: '2026-10-22T05:00:00Z', project: 'sheldon', agent: 'AI-Prüfer', source: 'Geplante Aufgabe', status: 'ok', summary: 's' }

test('mergeRuns folds a session into one run per role, newest first', () => {
  const runs = mergeRuns(log, [old])
  expect(runs.map(r => r.run)).toEqual(['cc-abcdef12-agent', 'cc-abcdef12-main', 'x'])
  expect(runs[1]).toEqual({
    run: 'cc-abcdef12-main', at: '2026-10-23T12:00:00Z', project: 'claude-mods', agent: 'Planer (Claude Code)',
    source: 'Claude Code (token-counter-Log)', status: 'ok',
    summary: '2 Turns, ↑2.0k ↓1.2k Tokens, opus-5-5, Session bisher $2.25',
  })
  expect(runs[0]?.agent).toBe('Umsetzer (team-delegate)')
  expect(runs[0]?.summary).toBe('1 Turns, ↑1.0k ↓200 Tokens, opus-5-5')
})

test('mergeRuns replaces a run it made before and keeps its corrected project', () => {
  const once = mergeRuns(log, [old]).map(r => (r.run === 'cc-abcdef12-main' ? { ...r, project: 'fixed' } : r))
  const twice = mergeRuns(log, once)
  expect(twice.length).toBe(3)
  expect(twice.find(r => r.run === 'cc-abcdef12-main')?.project).toBe('fixed')
})

test('sessionTokens sums a session into one row for the Verbrauch tab', () => {
  expect(sessionTokens(log)).toEqual([{
    session: 'abcdef1234', updated: '2026-10-23T12:02:00.000Z', project: 'claude-mods', model: 'claude-opus-5-5',
    planerIn: 2004, planerOut: 1200, umsetzerIn: 1002, umsetzerOut: 200, turns: 2, costUsd: 2.25,
  }])
})

test('sessionTokens names the planner model even when the implementer logged first', () => {
  const first = JSON.parse(line('2026-10-23T11:59:00.000Z', 'agent', 100, 0.5))
  const text = JSON.stringify({ ...first, model: 'claude-sonnet-5-5' }) + '\n' + log
  expect(sessionTokens(text)[0]?.model).toBe('claude-opus-5-5')
})

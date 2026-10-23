import { fmt, shortModel } from './model.ts'

/** A row of the Zentrale's `runs` dataset. */
export type Run = { run: string; at: string; project: string; agent: string; source: string; status: string; summary: string }

type Line = {
  at: string; session: string; project: string; role: string; model: string
  input: number; output: number; cacheRead: number; cacheWrite: number; costUsd?: number
}

/**
 * Folds log lines into one run per session and role. A run made before is
 * replaced, keeping its project, since a session that changed folders logs the
 * wrong one and Claude corrects it by hand.
 */
export const mergeRuns = (logText: string, runs: Run[]): Run[] => {
  const groups = new Map<string, Line[]>()
  for (const text of logText.split('\n').filter(Boolean)) {
    const l = JSON.parse(text) as Line
    const id = `cc-${l.session.slice(0, 8)}-${l.role}`
    groups.set(id, [...(groups.get(id) ?? []), l])
  }
  const made = [...groups].map(([id, lines]): Run => {
    const sorted = [...lines].sort((a, b) => a.at.localeCompare(b.at))
    const first = sorted[0]!
    const cost = sorted.at(-1)?.costUsd
    const read = sorted.reduce((n, l) => n + l.input + l.cacheRead + l.cacheWrite, 0)
    const output = sorted.reduce((n, l) => n + l.output, 0)
    const models = [...new Set(sorted.map(l => shortModel(l.model)))].sort().join(', ')
    const isMain = first.role === 'main'
    return {
      run: id,
      at: `${first.at.slice(0, 19)}Z`,
      project: runs.find(r => r.run === id)?.project ?? first.project,
      agent: isMain ? 'Planer (Claude Code)' : 'Umsetzer (team-delegate)',
      source: 'Claude Code (token-counter-Log)',
      status: 'ok',
      summary: `${sorted.length} Turns, ↑${fmt(read)} ↓${fmt(output)} Tokens, ${models}` +
        (isMain && cost !== undefined ? `, Session bisher $${cost.toFixed(2)}` : ''),
    }
  })
  const ids = new Set(made.map(r => r.run))
  return [...runs.filter(r => !ids.has(r.run)), ...made].sort((a, b) => b.at.localeCompare(a.at))
}

/** A row of the Zentrale's `tokens` dataset, the Verbrauch tab. */
export type SessionTokens = {
  session: string; updated: string; project: string; model: string
  planerIn: number; planerOut: number; umsetzerIn: number; umsetzerOut: number; turns: number; costUsd: number
}

/** Sums log lines into one row per session; read counts cache, cost is the session's latest total. */
export const sessionTokens = (logText: string): SessionTokens[] => {
  const rows = new Map<string, SessionTokens>()
  const lines = logText.split('\n').filter(Boolean).map(t => JSON.parse(t) as Line).sort((a, b) => a.at.localeCompare(b.at))
  for (const l of lines) {
    const r = rows.get(l.session) ?? { session: l.session, updated: l.at, project: l.project, model: l.model, planerIn: 0, planerOut: 0, umsetzerIn: 0, umsetzerOut: 0, turns: 0, costUsd: 0 }
    const who = l.role === 'main' ? 'planer' : 'umsetzer'
    r[`${who}In`] += l.input + l.cacheRead + l.cacheWrite
    r[`${who}Out`] += l.output
    if (l.role === 'main') r.turns += 1
    r.updated = l.at
    r.costUsd = l.costUsd ?? r.costUsd
    rows.set(l.session, r)
  }
  return [...rows.values()]
}

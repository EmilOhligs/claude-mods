import type { Bucket, Stats } from '../types'

export type Role = 'main' | 'agent'
export type Level = 'ok' | 'info' | 'warn' | 'alert'
export type Recommendation = { level: Level; text: string }

export const EMPTY: Stats = { rows: {}, rateLimits: [] }

const ZERO: Bucket = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, turns: 0 }

export const fmt = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k`
  : String(n)

export const shortModel = (id: string): string => id.replace(/^claude-/, '')

export const bar = (percent: number, width = 10): string => {
  const filled = Math.max(0, Math.min(width, Math.round((percent / 100) * width)))
  return '█'.repeat(filled) + '░'.repeat(width - filled)
}

export const levelOf = (percent: number): Level =>
  percent >= 90 ? 'alert' : percent >= 75 ? 'warn' : 'ok'

export const colorOf = (level: Level): string =>
  level === 'alert' ? 'red' : level === 'warn' ? 'yellow' : level === 'info' ? 'cyan' : 'green'

export const limitLabel = (kind: string): string =>
  kind === 'five_hour' ? '5h' : kind === 'seven_day' ? '7d' : kind === 'spend_limit' ? 'Budget' : kind

export type Usage = {
  model: string
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens: number
  cache_creation_input_tokens: number
}

export const addUsage = (stats: Stats, role: Role, u: Usage): Stats => {
  const key = `${role}|${u.model}`
  const old = stats.rows[key] ?? ZERO
  const row: Bucket = {
    input: old.input + u.input_tokens,
    output: old.output + u.output_tokens,
    cacheRead: old.cacheRead + u.cache_read_input_tokens,
    cacheWrite: old.cacheWrite + u.cache_creation_input_tokens,
    turns: old.turns + 1,
  }
  return {
    ...stats,
    rows: { ...stats.rows, [key]: row },
    mainModel: role === 'main' ? u.model : stats.mainModel,
  }
}

export const sum = (stats: Stats, role?: Role): Bucket =>
  Object.entries(stats.rows).reduce<Bucket>((total, [key, row]) => {
    if (role !== undefined && !key.startsWith(`${role}|`)) return total
    return {
      input: total.input + row.input,
      output: total.output + row.output,
      cacheRead: total.cacheRead + row.cacheRead,
      cacheWrite: total.cacheWrite + row.cacheWrite,
      turns: total.turns + row.turns,
    }
  }, ZERO)

/** Everything the model had to read: fresh input plus cache traffic. */
export const readTokens = (b: Bucket): number => b.input + b.cacheRead + b.cacheWrite

export const isExpensive = (model: string | undefined): boolean =>
  model !== undefined && /opus|fable/.test(model)

export const maxLimit = (stats: Stats): { kind: string; percentUsed: number } | undefined =>
  [...stats.rateLimits].sort((a, b) => b.percentUsed - a.percentUsed)[0]

/**
 * When to change something, most urgent first. A model switch forfeits the
 * warm prompt cache, so the advice is to switch between tasks, not mid-task.
 */
export const recommend = (stats: Stats): Recommendation => {
  const ctx = stats.contextPercent
  const limit = maxLimit(stats)

  if (ctx !== undefined && ctx >= 90) {
    return { level: 'alert', text: 'Kontext fast voll: jetzt /compact oder neuen Chat starten (Plan vorher in eine Datei).' }
  }
  if (limit && limit.percentUsed >= 90) {
    return { level: 'alert', text: `Limit ${limitLabel(limit.kind)} bei ${Math.round(limit.percentUsed)} %: Umsetzung an team-delegate:umsetzer abgeben, kurz halten oder pausieren.` }
  }
  if (ctx !== undefined && ctx >= 75) {
    return { level: 'warn', text: 'Kontext wird voll: nach dem aktuellen Schritt /compact oder neuer Chat. Modellwechsel jetzt kostet Cache.' }
  }
  if (limit && limit.percentUsed >= 75) {
    return { level: 'warn', text: `Limit ${limitLabel(limit.kind)} bei ${Math.round(limit.percentUsed)} %: Umsetzung an team-delegate:umsetzer abgeben.` }
  }

  const main = sum(stats, 'main')
  const agent = sum(stats, 'agent')
  const share = agent.output / Math.max(1, main.output + agent.output)
  if (isExpensive(stats.mainModel) && main.output >= 20_000 && share < 0.2) {
    return { level: 'info', text: 'Viel Umsetzung im teuren Hauptmodell: Schritte an den Umsetzer (günstigeres Modell) delegieren.' }
  }

  return { level: 'ok', text: 'Alles im grünen Bereich.' }
}

export const line = (stats: Stats): string => {
  const all = sum(stats)
  const ctx = stats.contextPercent === undefined ? '' : ` · ctx ${stats.contextPercent}%`
  return `tokens ↑${fmt(readTokens(all))} ↓${fmt(all.output)}${ctx}`
}

export const report = (stats: Stats): string => {
  const rec = recommend(stats)
  const rows = Object.entries(stats.rows).map(([key, b]) => {
    const [role = '', model = ''] = key.split('|')
    const who = role === 'main' ? 'Planer  ' : 'Umsetzer'
    return `${who} ${shortModel(model)}: ↑${fmt(readTokens(b))} ↓${fmt(b.output)} (${b.turns} Turns)`
  })
  const limits = stats.rateLimits.map(l => `${limitLabel(l.kind)} ${Math.round(l.percentUsed)}%`)
  return [
    ...(rows.length ? rows : ['Noch keine Turns.']),
    `Kontext: ${stats.contextPercent ?? '–'}%${limits.length ? ` · Limits: ${limits.join(', ')}` : ''}${stats.costUsd === undefined ? '' : ` · $${stats.costUsd.toFixed(2)}`}`,
    `Empfehlung: ${rec.text}`,
  ].join('\n')
}

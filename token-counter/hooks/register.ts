import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Totals } from '../types'

const EMPTY: Totals = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, turns: 0 }
const totals = atom({ plugin: 'token-counter', key: 'totals' } as const, EMPTY)

export const fmt = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M`
  : n >= 1_000 ? `${(n / 1_000).toFixed(1)}k`
  : String(n)

export const line = (t: Totals): string => {
  const ctx = t.contextPercent === undefined ? '' : ` · ctx ${t.contextPercent}%`
  return `tokens ↑${fmt(t.input + t.cacheRead + t.cacheWrite)} ↓${fmt(t.output)}${ctx}`
}

const show = async ($: EngineInterface) => $.ui.status(line(await read($, totals)))

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'tokens', description: 'Show this session’s token usage' })
    await show($)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    const usage = e.usage
    if (usage) {
      await update($, totals, t => ({
        ...t,
        input: t.input + usage.input_tokens,
        output: t.output + usage.output_tokens,
        cacheRead: t.cacheRead + usage.cache_read_input_tokens,
        cacheWrite: t.cacheWrite + usage.cache_creation_input_tokens,
        turns: t.turns + 1,
      }))
      await show($)
    }
    return done
  })

  on('session.measure', async ($, e, next) => {
    const percent = e.context.percent
    if (percent !== undefined) {
      await update($, totals, t => ({ ...t, contextPercent: percent }))
      await show($)
    }
    return next(e)
  })

  on('command.run', { command: 'tokens' }, async $ => {
    const t = await read($, totals)
    return {
      text: [
        `Turns:        ${t.turns}`,
        `Input:        ${fmt(t.input)}`,
        `Cache read:   ${fmt(t.cacheRead)}`,
        `Cache write:  ${fmt(t.cacheWrite)}`,
        `Output:       ${fmt(t.output)}`,
        `Context:      ${t.contextPercent ?? '–'}%`,
      ].join('\n'),
    }
  })
}

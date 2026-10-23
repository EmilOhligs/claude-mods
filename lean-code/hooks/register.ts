import type { Register } from 'claude-code'

import { asLevel, rules, writesCode } from './rules'

export const register: Register = (on, options) => {
  const level = asLevel(options.level)
  if (level === 'off') return
  const text = rules(level)

  on('prompt.compose', async (_$, e, next) => {
    const r = await next(e)
    return { ...r, sections: [...r.sections, { id: 'lean-code:rules', text, scope: 'session' }] }
  })

  if (options.subagents === false) return
  on('agent.spawn', (_$, e, next) =>
    writesCode(e.subagentType) ? next({ ...e, prompt: `${e.prompt}\n\n${text}` }) : next(e),
  )
}

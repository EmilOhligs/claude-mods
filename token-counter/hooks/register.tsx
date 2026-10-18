import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import {
  EMPTY, addUsage, bar, colorOf, fmt, levelOf, limitLabel, line, readTokens, recommend, report, shortModel, sum,
} from './model'
import type { Level } from './model'

const stats = atom({ plugin: 'token-counter', key: 'stats' } as const, EMPTY)
const isHidden = atom({ plugin: 'token-counter', key: 'isHidden' } as const, false)
const isOpen = atom({ plugin: 'token-counter', key: 'isOpen' } as const, false)

let lastLevel: Level = 'ok'

const refresh = async ($: EngineInterface) => {
  const s = await read($, stats)
  $.ui.status(line(s))
  const rec = recommend(s)
  if (rec.level !== lastLevel && (rec.level === 'warn' || rec.level === 'alert')) $.ui.toast(rec.text)
  lastLevel = rec.level
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'tokens',
      description: 'Token usage and advice (args: hide, show, details)',
    })
    await refresh($)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const done = await next(e)
    const usage = e.usage
    if (usage) {
      await update($, stats, s => addUsage(s, e.agentId === undefined ? 'main' : 'agent', usage))
      await refresh($)
    }
    return done
  })

  on('session.measure', async ($, e, next) => {
    await update($, stats, s => ({
      ...s,
      contextPercent: e.context.percent ?? s.contextPercent,
      rateLimits: e.rateLimits.map(l => ({ kind: l.kind, percentUsed: l.percentUsed })),
      costUsd: e.cost?.usd ?? s.costUsd,
    }))
    await refresh($)
    return next(e)
  })

  on('command.run', { command: 'tokens' }, async ($, e) => {
    const arg = e.args.trim()
    if (arg === 'hide') await update($, isHidden, () => true)
    if (arg === 'show') await update($, isHidden, () => false)
    if (arg === 'details') await update($, isOpen, v => !v)

    return { text: report(await read($, stats)) }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    const s = await read($, stats)
    const hasData = s.contextPercent !== undefined || Object.keys(s.rows).length > 0
    if (e.props.hasSurvey || !hasData || (await read($, isHidden))) return next(e)

    const { Box, Button, Text } = $.ui.resolve(e)
    const open = await read($, isOpen)
    const rec = recommend(s)

    const meters = [
      ...(s.contextPercent === undefined ? [] : [{ label: 'ctx', percent: s.contextPercent }]),
      ...s.rateLimits.map(l => ({ label: limitLabel(l.kind), percent: l.percentUsed })),
    ]
    const main = sum(s, 'main')
    const agent = sum(s, 'agent')
    const rows = Object.entries(s.rows)

    return (
      <Box flexDirection="column">
        <Box gap={2} flexWrap="wrap">
          {meters.map(m => (
            <Text color={colorOf(levelOf(m.percent))}>
              {m.label} {bar(m.percent)} {Math.round(m.percent)}%
            </Text>
          ))}
          {s.costUsd !== undefined && <Text dimColor>${s.costUsd.toFixed(2)}</Text>}
        </Box>
        <Text dimColor>
          Planer {s.mainModel ? shortModel(s.mainModel) : '–'} ↑{fmt(readTokens(main))} ↓{fmt(main.output)}
          {agent.turns > 0 ? ` · Umsetzer ↑${fmt(readTokens(agent))} ↓${fmt(agent.output)}` : ''}
        </Text>
        {open &&
          rows.map(([key, b]) => (
            <Text dimColor>
              {'  '}
              {key.startsWith('main|') ? 'Planer' : 'Umsetzer'} {shortModel(key.split('|')[1] ?? '')}: ↑
              {fmt(readTokens(b))} ↓{fmt(b.output)} · {b.turns} Turns
            </Text>
          ))}
        <Text color={colorOf(rec.level)} dimColor={rec.level === 'ok'}>
          → {rec.text}
        </Text>
        <Box gap={2}>
          <Button key="details" label={open ? 'Weniger' : 'Details'} onPress={() => update($, isOpen, v => !v)} />
          <Button key="hide" label="Ausblenden" onPress={() => update($, isHidden, () => true)} />
        </Box>
      </Box>
    )
  })
}

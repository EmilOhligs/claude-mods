import { atom, read, update } from 'claude-code'
import type { PluginOptions, Register } from 'claude-code'

import type { Level } from '../types'
import { and, ceoWriteVerdict, editedPath, engineerModelVerdict, reviewerModelVerdict } from './policy'

export const COMMAND = 'frontend'

export const ENGINEERS = ['ui-ingenieur', 'logik-ingenieur', 'anbindungs-ingenieur', 'test-ingenieur']

export const LEAN_GUARD = 'schlank-waechter'

export const CORE_REVIEWERS = ['tuev-design', 'tuev-debugger', 'tuev-security', 'tuev-barrierefreiheit']

const OPTIONAL_REVIEWERS: Record<string, string> = {
  reviewPrivacy: 'tuev-datenschutz',
  reviewPerformance: 'tuev-performance',
  reviewResponsive: 'tuev-responsive',
  reviewTexts: 'tuev-texte',
  reviewCode: 'tuev-code-review',
}

/** Emil's team-delegate: its implementer and its "small changes yourself" rule clash with the code lock. */
const FOREIGN_IMPLEMENTER = 'team-delegate:umsetzer'
const FOREIGN_PLANNER_SECTION = 'team-delegate:planner'

export type Settings = {
  targetScore: number
  maxRounds: number
  showUiEvery: number
  reviewers: string[]
  proposalRound: boolean
  reviewerModel?: 'sonnet'
}

/** `/frontend [leicht|design|voll|aus] [Aufgabe]`; without a level word it is voll. */
export const parseArgs = (args: string): { level: Level | 'aus'; task: string } => {
  const [first = '', ...rest] = args.trim().split(/\s+/)
  const word = first.toLowerCase()
  return ['leicht', 'design', 'voll', 'aus'].includes(word)
    ? { level: word as Level | 'aus', task: rest.join(' ') }
    : { level: 'voll', task: args.trim() }
}

const asNumber = (v: PluginOptions[string] | undefined, fallback: number): number => {
  const n = typeof v === 'string' ? Number.parseInt(v, 10) : Number.NaN
  return Number.isFinite(n) ? n : fallback
}

export const readSettings = (options: PluginOptions, level: Level = 'voll'): Settings => {
  const full: Settings = {
    targetScore: asNumber(options.targetScore, 9),
    maxRounds: asNumber(options.maxRounds, 4),
    showUiEvery: asNumber(options.showUiEvery, 3),
    reviewers: [
      ...CORE_REVIEWERS,
      ...Object.entries(OPTIONAL_REVIEWERS)
        .filter(([key]) => options[key] === true)
        .map(([, agent]) => agent),
    ],
    proposalRound: true,
  }
  // cheaper levels cut reviewers × rounds, which is where the tokens go
  if (level === 'leicht')
    return { ...full, reviewers: ['tuev-debugger', 'tuev-security'], targetScore: 8, maxRounds: 2, proposalRound: false, reviewerModel: 'sonnet' }
  if (level === 'design') return { ...full, reviewers: ['tuev-design', 'tuev-barrierefreiheit'], maxRounds: 3 }
  return full
}

export const ceoSection = (plugin: string, s: Settings): string => {
  const name = (agent: string): string => `${plugin}:${agent}`
  return [
    'Frontend-Paket aktiv. Du bist der CEO des Frontend-Teams: du planst, verteilst, fasst zusammen und entscheidest.',
    'Du schreibst keinen Code, auch keine einzelne Zeile und keine Tests. Eine Code-Sperre lehnt Schreibzugriffe von dir auf Code-Dateien ab. Selbst schreiben darfst du nur Markdown und Dateien in .frontend-team/. Auch per Bash erzeugst oder änderst du keinen Code.',
    `Lade vor dem ersten Schritt den Skill "${plugin}:ceo-ablauf" und halte dich an ihn.`,
    `Ingenieure (bauen mit Sonnet): ${ENGINEERS.map(name).join(', ')}. Tests schreibt nur ${name('test-ingenieur')}.`,
    `Schlank-Wächter: ${name(LEAN_GUARD)} prüft jede Lieferung eines Ingenieurs auf toten und unnötigen Code, bevor du sie abnimmst. Ohne sein "freigegeben" ist eine Teilaufgabe nicht grün.`,
    `TÜV (prüfen, ändern nichts): ${s.reviewers.map(name).join(', ')}.`,
    ...(s.proposalRound ? [] : ['Stufe leicht: keine Vorschlagsrunde. Plane direkt aus der Aufgabe und lege den Plan dem Menschen vor.']),
    ...(s.reviewerModel ? [`Rufe die Prüfer mit model "${s.reviewerModel}" auf.`] : []),
    'Diese Ingenieure ersetzen im Frontend-Modus den allgemeinen Umsetzer anderer Mods.',
    `Zielnote: jeder Prüfer mindestens ${s.targetScore}/10 und kein offener Befund der Schwere "kritisch" oder "hoch".`,
    `Nach höchstens ${s.maxRounds} Bau- und Prüfrunden hältst du an und legst dem Menschen Stand, Noten und offene Befunde vor.`,
    `Alle ${s.showUiEvery} Runden (und immer vor einer Rückfrage) startest du die Oberfläche, zeigst sie dem Menschen zum Durchklicken und wartest auf seine Korrekturen.`,
  ].join('\n')
}

const isActive = atom({ plugin: 'frontend-team', key: 'isActive' } as const, false)
const level = atom({ plugin: 'frontend-team', key: 'level' } as const, 'voll' as Level)

export const register: Register = (on, options) => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: COMMAND,
      description: 'Frontend-Team starten: CEO plant, Ingenieure bauen, TÜV prüft',
      argumentHint: '[leicht|design|voll|aus] [Aufgabe]',
    })
    return next(e)
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    const { level: chosen, task } = parseArgs(e.args)
    if (chosen === 'aus') {
      await update($, isActive, () => false)
      $.ui.status(undefined)
      return {
        text: 'Frontend-Team aus: Code-Sperre aufgehoben, CEO-Abschnitt entfernt.',
        // the CEO instructions stay in the transcript, so tell the model they ended
        context: ['Frontend-Modus beendet: Die früheren Anweisungen des Frontend-Teams (CEO, Code-Sperre, Prüfrunden) gelten nicht mehr.'],
      }
    }
    await update($, isActive, () => true)
    await update($, level, () => chosen)
    $.ui.status(`Frontend-Team: ${chosen}`)
    const s = readSettings(options, chosen)
    $.ui.toast(`Frontend-Team aktiv (${chosen}): Ziel ${s.targetScore}/10, ${s.maxRounds} Runden, Code-Sperre für den CEO an`)
    // a command's own answer starts no model turn, and $.prompt.submit from here would wait on itself
    return {
      text: `Frontend-Team aktiv, Stufe ${chosen}. Prüfer: ${s.reviewers.join(', ')}. Code schreiben nur die Ingenieure (Sonnet). Beenden mit /frontend aus.${task ? ' Schick jetzt "los", dann startet der CEO mit der Aufgabe.' : ''}`,
      context: [ceoSection($.plugin.name, s), ...(task ? [`Aufgabe: ${task}`] : [])],
    }
  })

  // Code lock: in frontend mode the main loop (the CEO) writes no code; subagents carry an agentId.
  on('tool.call', async ($, e, next) => {
    if (e.agentId !== undefined || !(await read($, isActive))) return next(e)
    const verdict =
      e.tool === 'Agent'
        ? and(engineerModelVerdict(e), reviewerModelVerdict(e, readSettings(options, await read($, level)).reviewerModel))
        : ceoWriteVerdict(e.tool, editedPath(e))
    return verdict.isAllowed ? next(e) : { deny: verdict.reason ?? 'Code-Sperre' }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: 'Code-Sperre des Frontend-Teams konnte nicht prüfen.' }))

  on('agent.offer', { agent: FOREIGN_IMPLEMENTER }, async ($, e, next) =>
    (await read($, isActive)) ? { isOffered: false } : next(e),
  )

  on('prompt.compose', async ($, e, next) => {
    const { sections } = await next(e)
    if (!(await read($, isActive))) return { sections }
    return {
      sections: [
        ...sections.filter((section) => section.id !== FOREIGN_PLANNER_SECTION),
        { id: 'frontend-team:ceo', text: ceoSection($.plugin.name, readSettings(options, await read($, level))), scope: 'session' },
      ],
    }
  })
}

import { atom, read, update } from 'claude-code'
import type { PluginOptions, Register } from 'claude-code'

import type { Level } from '../types'
import { and, ceoWriteVerdict, editedPath, engineerModelVerdict, levelSwitchVerdict, reviewerModelVerdict } from './policy'

export const LEVELS: { level: Level; name: string; description: string }[] = [
  { level: 0, name: 'Allein', description: 'Claude arbeitet selbst, kein Team, keine extra Prüfung. Für Uni und kleine Fragen, am günstigsten.' },
  { level: 1, name: 'Delegieren', description: 'Claude plant, ein günstigerer Umsetzer baut, ein Reviewer prüft vor dem Commit. Standard für Projekte.' },
  { level: 2, name: 'Prüfen', description: 'Claude leitet nur noch, Ingenieure bauen test-first, Debugger und Security prüfen (Ziel 8/10, 2 Runden). Für kleinere Features.' },
  { level: 3, name: 'Design', description: 'Wie 2, aber Design und Barrierefreiheit prüfen die Oberfläche (Ziel 9/10, 3 Runden). Für Gestaltungsarbeit.' },
  { level: 4, name: 'Voll', description: 'Wie 2 mit allen Prüfern, Zielnote und Runden laut Einstellung. Für große Features, am teuersten.' },
]

const label = (n: Level): string => `${n} ${LEVELS[n]!.name}`

// --- level 1: planner, implementer, finder -------------------------------------------

const READ_TOOLS = ['Read', 'Grep', 'Glob']
const WRITE_TOOLS = ['Edit', 'Write', 'Bash', 'NotebookEdit']
const CONTEXT_TIGHT_AT = 70

export const workerPrompt = (canEdit: boolean): string =>
  [
    'Du bist der Umsetzer. Planer oder CEO haben dir genau eine Teilaufgabe gegeben.',
    'Erledige nur diese Aufgabe, nichts darüber hinaus, und triff keine eigenen Architekturentscheidungen.',
    canEdit
      ? 'Du darfst Dateien ändern, aber nur die, die für die Aufgabe nötig sind.'
      : 'Du darfst nichts ändern: lies nur und liefere deine Änderungen als Vorschlag (Datei, Stelle, neuer Code).',
    'Ist die Aufgabe unklar oder widerspricht sie dem Code, brich ab und sage kurz, was fehlt.',
    'Antworte knapp: was du getan hast, welche Dateien betroffen sind, was offen bleibt.',
  ].join('\n')

/** Agents registered at start; tester, reviewer and the others are agent files in agents/. */
export const ROLES = [
  {
    name: 'sucher',
    description: 'Sucht und liest im Code und beantwortet eine klare Frage mit Fundstellen. Ändert nichts.',
    prompt: [
      'Du bist der Sucher. Beantworte genau die gestellte Frage und lies nur Ausschnitte.',
      'Antworte mit Fundstellen (Datei:Zeile) und kurzem Ergebnis, schreibe keine Dateiinhalte ab.',
    ].join('\n'),
    tools: READ_TOOLS,
    model: 'haiku',
  },
]

export const plannerSection = (plugin: string, contextPercent?: number): string =>
  [
    'Team-Stufe 1 (Delegieren): Du bist der Planer.',
    'Zerlege größere Aufgaben in kleine, in sich abgeschlossene Schritte und schreibe den Plan zuerst kurz auf.',
    `Delegiere die Umsetzung einzelner Schritte mit dem Agent-Tool an den Agenten "${plugin}:umsetzer" (günstigeres Modell).`,
    `Lass zu einem Schritt rote Tests vom Agenten "${plugin}:tester" schreiben und prüfe selbst, dass sie aus dem richtigen Grund rot sind.`,
    `Lass vor dem Commit oder Merge den Diff vom Agenten "${plugin}:reviewer" prüfen.`,
    `Setze bei Eingaben, Auth, Geheimnissen und Abhängigkeiten zusätzlich den Agenten "${plugin}:sicherheitspruefer" ein.`,
    `Gib breite Suche und Lesen, wenn nur das Ergebnis zählt, an den Agenten "${plugin}:sucher".`,
    'Gib dem Umsetzer pro Aufruf genau einen Schritt mit allen nötigen Details: Dateien, gewünschtes Verhalten, Randbedingungen.',
    'Prüfe das Ergebnis jedes Schritts selbst, bevor du den nächsten startest. Kleine Änderungen (wenige Zeilen) machst du direkt selbst.',
    'Für größere Features mit Prüfrunden schlägst du dem Menschen /team-2 bis /team-4 vor.',
    ...(contextPercent !== undefined && contextPercent >= CONTEXT_TIGHT_AT
      ? [
          `Dein Kontext ist zu ${Math.round(contextPercent)} % voll: antworte knapp, lies keine großen Dateien selbst und gib Erkunden und Umsetzen an den Umsetzer ab. Schlage dem Nutzer /compact oder einen neuen Chat vor, wenn ein Schritt abgeschlossen ist.`,
        ]
      : []),
  ].join('\n')

// --- levels 2 to 4: CEO, engineers, reviewers ----------------------------------------

const ENGINEERS = ['ui-ingenieur', 'logik-ingenieur', 'anbindungs-ingenieur']
const CORE_REVIEWERS = ['design', 'debugger', 'sicherheitspruefer', 'barrierefreiheit']
const OPTIONAL_REVIEWERS: Record<string, string> = {
  reviewPrivacy: 'datenschutz',
  reviewPerformance: 'performance',
  reviewResponsive: 'responsive',
  reviewTexts: 'texte',
  reviewCode: 'reviewer',
}

export type Settings = {
  level: Level
  targetScore: number
  maxRounds: number
  showUiEvery: number
  reviewers: string[]
  proposalRound: boolean
  reviewerModel?: 'sonnet'
  /** Whether team:umsetzer may edit; without it code without UI goes to the logic engineer. */
  canEdit: boolean
}

const asNumber = (v: PluginOptions[string] | undefined, fallback: number): number => {
  const n = typeof v === 'string' ? Number.parseInt(v, 10) : Number.NaN
  return Number.isFinite(n) ? n : fallback
}

export const readSettings = (options: PluginOptions, level: 2 | 3 | 4 = 4): Settings => {
  const full: Settings = {
    level,
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
    canEdit: options.canEdit !== false,
  }
  // cheaper levels cut reviewers × rounds, which is where the tokens go
  if (level === 2)
    return { ...full, reviewers: ['debugger', 'sicherheitspruefer'], targetScore: 8, maxRounds: 2, proposalRound: false, reviewerModel: 'sonnet' }
  if (level === 3) return { ...full, reviewers: ['design', 'barrierefreiheit'], maxRounds: 3 }
  return full
}

export const ceoSection = (plugin: string, s: Settings): string => {
  const name = (agent: string): string => `${plugin}:${agent}`
  return [
    `Team-Stufe ${label(s.level)} aktiv. Du bist der CEO des Teams: du planst, verteilst, fasst zusammen und entscheidest.`,
    'Du schreibst keinen Code, auch keine einzelne Zeile und keine Tests. Eine Code-Sperre lehnt Schreibzugriffe von dir auf Code-Dateien ab. Selbst schreiben darfst du nur Markdown und Dateien in .team/. Auch per Bash erzeugst oder änderst du keinen Code.',
    `Lade vor dem ersten Schritt den Skill "${plugin}:ceo-ablauf" und halte dich an ihn.`,
    `Ingenieure (bauen mit Sonnet): ${ENGINEERS.map(name).join(', ')}. Tests schreibt nur ${name('tester')}.`,
    s.canEdit
      ? `${name('umsetzer')} für Code ohne Oberfläche.`
      : `${name('logik-ingenieur')} für Code ohne Oberfläche (${name('umsetzer')} darf hier nur Vorschläge machen).`,
    `Schlank-Wächter: ${name('schlank-waechter')} prüft jede Lieferung eines Ingenieurs auf toten und unnötigen Code, bevor du sie abnimmst. Ohne sein "freigegeben" ist eine Teilaufgabe nicht grün.`,
    `Prüfer (ändern nichts): ${s.reviewers.map(name).join(', ')}. Design, Barrierefreiheit und Browser-Prüfung nur, wenn es eine Oberfläche gibt.`,
    ...(s.proposalRound ? [] : ['In dieser Stufe gibt es keine Vorschlagsrunde. Plane direkt aus der Aufgabe und lege den Plan dem Menschen vor.']),
    ...(s.reviewerModel ? [`Rufe die Prüfer mit model "${s.reviewerModel}" auf.`] : []),
    `Zielnote: jeder Prüfer mindestens ${s.targetScore}/10 und kein offener Befund der Schwere "kritisch" oder "hoch".`,
    `Nach höchstens ${s.maxRounds} Bau- und Prüfrunden hältst du an und legst dem Menschen Stand, Noten und offene Befunde vor.`,
    `Alle ${s.showUiEvery} Runden (und immer vor einer Rückfrage) zeigst du dem Menschen die Oberfläche zum Durchklicken, sofern es eine gibt, und wartest auf seine Korrekturen.`,
  ].join('\n')
}

// --- wiring -----------------------------------------------------------------------------

const level = atom({ plugin: 'team', key: 'level' } as const, 1 as Level)

const asString = (v: PluginOptions[string] | undefined, fallback: string): string => (typeof v === 'string' ? v : fallback)

export const register: Register = (on, options) => {
  const workerModel = asString(options.workerModel, 'sonnet')
  const canEdit = options.canEdit !== false
  const settingsOf = (n: Level) => readSettings(options, n >= 2 ? (n as 2 | 3 | 4) : 4)
  let contextPercent: number | undefined
  // the project root the code lock measures .team/ against
  let root: string | undefined

  on('session.start', async ($, e, next) => {
    root = e.cwd
    for (const l of LEVELS)
      await $.command.register({ name: `team-${l.level}`, description: `${l.name}: ${l.description}`, argumentHint: '[Aufgabe]' })
    await $.agent.register({
      name: 'umsetzer',
      description: 'Setzt genau einen klar beschriebenen Schritt um (Code ändern, Dateien anlegen). Nicht für Planung oder offene Fragen.',
      prompt: workerPrompt(canEdit),
      tools: canEdit ? [...READ_TOOLS, ...WRITE_TOOLS] : READ_TOOLS,
      model: workerModel,
    })
    for (const r of ROLES) await $.agent.register(r)
    $.ui.status(`Team: ${label(await read($, level))}`)
    return next(e)
  })

  on('command.run', { command: /^team-[0-4]$/ }, async ($, e) => {
    const n = Number(e.command.slice('team-'.length)) as Level
    const before = await read($, level)
    const task = e.args.trim()
    await update($, level, () => n)
    $.ui.status(`Team: ${label(n)}`)
    const context = [
      // earlier CEO instructions stay in the transcript, so tell the model they ended
      ...(before >= 2 && n < 2 ? ['Die früheren Anweisungen als CEO (Code-Sperre, Prüfrunden) gelten nicht mehr.'] : []),
      ...(n >= 2 ? [ceoSection($.plugin.name, settingsOf(n))] : []),
      ...(task ? [`Aufgabe: ${task}`] : []),
    ]
    // a command's own answer starts no model turn, and $.prompt.submit from here would wait on itself
    return {
      text: `Team: Stufe ${label(n)}. ${LEVELS[n]!.description}${task ? ' Schick jetzt "los", dann geht es mit der Aufgabe los.' : ''}`,
      context,
    }
  })

  // Code lock from level 2: the main loop (the CEO) writes no code; subagents carry an agentId.
  on('tool.call', async ($, e, next) => {
    const n = await read($, level)
    if (e.agentId !== undefined || n < 2) return next(e)
    const s = settingsOf(n)
    const verdict = and(
      levelSwitchVerdict(e),
      e.tool === 'Agent'
        ? and(engineerModelVerdict(e), reviewerModelVerdict(e, s.reviewerModel))
        : ceoWriteVerdict(e.tool, editedPath(e), root),
    )
    return verdict.isAllowed ? next(e) : { deny: verdict.reason ?? 'Code-Sperre' }
  }).catch(($, e, next) => (next.called ? next(e) : { deny: 'Code-Sperre des Teams konnte nicht prüfen.' }))

  on('agent.offer', async ($, e, next) =>
    e.agent.startsWith(`${$.plugin.name}:`) && (await read($, level)) === 0 ? { isOffered: false } : next(e),
  )

  on('session.measure', (_$, e, next) => {
    contextPercent = e.context.percent ?? contextPercent
    return next(e)
  })

  on('prompt.compose', async ($, e, next) => {
    const { sections } = await next(e)
    const n = await read($, level)
    if (n === 0) return { sections }
    return {
      sections: [
        ...sections,
        n === 1
          ? { id: 'team:planner', text: plannerSection($.plugin.name, contextPercent), scope: 'session' as const }
          : { id: 'team:ceo', text: ceoSection($.plugin.name, settingsOf(n)), scope: 'session' as const },
      ],
    }
  })
}

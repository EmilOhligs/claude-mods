import type { EngineInterface, PluginOptions, Register } from 'claude-code'

export const AGENT = 'umsetzer'

const READ_TOOLS = ['Read', 'Grep', 'Glob']
const WRITE_TOOLS = ['Edit', 'Write', 'Bash', 'NotebookEdit']

/** Same thresholds as token-counter's advice, so both mods agree. */
const SAVE_AT = 75
const SAVE_HARD_AT = 85
const RELAX_BELOW = 65
const CONTEXT_TIGHT_AT = 70

export const workerPrompt = (canEdit: boolean): string =>
  [
    'Du bist der Umsetzer. Der Planer hat dir genau eine Teilaufgabe gegeben.',
    'Erledige nur diese Aufgabe, nichts darüber hinaus, und triff keine eigenen Architekturentscheidungen.',
    canEdit
      ? 'Du darfst Dateien ändern, aber nur die, die für die Aufgabe nötig sind.'
      : 'Du darfst nichts ändern: lies nur und liefere deine Änderungen als Vorschlag (Datei, Stelle, neuer Code).',
    'Ist die Aufgabe unklar oder widerspricht sie dem Code, brich ab und sage kurz, was fehlt.',
    'Antworte knapp: was du getan hast, welche Dateien betroffen sind, was offen bleibt.',
  ].join('\n')

export const plannerSection = (type: string, contextPercent?: number): string =>
  [
    'Rollenverteilung: Du bist der Planer.',
    'Zerlege größere Aufgaben in kleine, in sich abgeschlossene Schritte und schreibe den Plan zuerst kurz auf.',
    `Delegiere die Umsetzung einzelner Schritte mit dem Agent-Tool an den Agenten "${type}" (günstigeres Modell).`,
    'Gib dem Umsetzer pro Aufruf genau einen Schritt mit allen nötigen Details: Dateien, gewünschtes Verhalten, Randbedingungen.',
    'Prüfe das Ergebnis jedes Schritts selbst, bevor du den nächsten startest. Kleine Änderungen (wenige Zeilen) machst du direkt selbst.',
    ...(contextPercent !== undefined && contextPercent >= CONTEXT_TIGHT_AT
      ? [
          `Dein Kontext ist zu ${Math.round(contextPercent)} % voll: antworte knapp, lies keine großen Dateien selbst und gib Erkunden und Umsetzen an den Umsetzer ab. Schlage dem Nutzer /compact oder einen neuen Chat vor, wenn ein Schritt abgeschlossen ist.`,
        ]
      : []),
  ].join('\n')

/** Models the worker may run on, best first, for each configured base. */
export const ladder = (base: string): [string, string, string] =>
  base === 'opus' ? ['opus', 'sonnet', 'haiku']
  : base === 'sonnet' ? ['sonnet', 'haiku', 'haiku']
  : [base, base, base]

/** Saving level 0..2 from the highest rate-limit use; hysteresis keeps it from flapping. */
export const saveLevel = (previous: number, limitPercent: number): number =>
  limitPercent >= SAVE_HARD_AT ? 2
  : limitPercent >= SAVE_AT ? (previous === 2 ? 2 : 1)
  : limitPercent < RELAX_BELOW ? 0
  : previous

const asString = (v: PluginOptions[string] | undefined, fallback: string): string =>
  typeof v === 'string' ? v : fallback

export const register: Register = (on, options) => {
  const base = asString(options.workerModel, 'sonnet')
  const canEdit = options.canEdit !== false
  let level = 0
  let contextPercent: number | undefined

  const define = ($: EngineInterface) =>
    $.agent.register({
      name: AGENT,
      description:
        'Setzt genau einen vom Planer klar beschriebenen Schritt um (Code ändern, Dateien anlegen). Nicht für Planung oder offene Fragen.',
      prompt: workerPrompt(canEdit),
      tools: canEdit ? [...READ_TOOLS, ...WRITE_TOOLS] : READ_TOOLS,
      model: ladder(base)[level] ?? base,
    })

  on('session.start', async ($, e, next) => {
    const { agent } = await define($)
    $.ui.toast(`Planer/Umsetzer aktiv: ${agent} (${ladder(base)[level]})`)

    return next(e)
  })

  on('session.measure', async ($, e, next) => {
    contextPercent = e.context.percent ?? contextPercent
    const limit = e.rateLimits.reduce((top, l) => Math.max(top, l.percentUsed), 0)
    const wanted = saveLevel(level, limit)
    if (wanted !== level) {
      level = wanted
      await define($)
      $.ui.toast(
        level === 0
          ? `Umsetzer wieder auf ${ladder(base)[0]} (Limit ${Math.round(limit)} %)`
          : `Sparmodus: Umsetzer läuft jetzt auf ${ladder(base)[level]} (Limit ${Math.round(limit)} %)`,
      )
    }

    return next(e)
  })

  on('prompt.compose', async ($, e, next) => {
    const { sections } = await next(e)

    return {
      sections: [
        ...sections,
        {
          id: 'team-delegate:planner',
          text: plannerSection(`${$.plugin.name}:${AGENT}`, contextPercent),
          scope: 'session',
        },
      ],
    }
  })
}

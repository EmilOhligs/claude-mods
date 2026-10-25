import type { PluginOptions, Register } from 'claude-code'

export const AGENT = 'umsetzer'

const READ_TOOLS = ['Read', 'Grep', 'Glob']
const WRITE_TOOLS = ['Edit', 'Write', 'Bash', 'NotebookEdit']

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

export const ROLES = [
  {
    name: 'tester',
    description:
      'Schreibt zu einem vom Planer beschriebenen Verhalten nur Tests, die rot sind. Ändert keinen Quellcode.',
    prompt: [
      'Du bist der Tester. Schreibe für das beschriebene Verhalten nur Tests, keinen Quellcode.',
      'Lass die Tests laufen und stelle sicher, dass sie rot sind, und zwar aus dem richtigen Grund: das Verhalten fehlt, nicht ein Tippfehler oder Import.',
      'Nutze kein skip, only oder xfail.',
      'Antworte mit Testdatei, Testnamen, Befehl und der Fehlermeldung.',
    ].join('\n'),
    tools: [...READ_TOOLS, 'Edit', 'Write', 'Bash'],
    model: 'sonnet',
  },
  {
    name: 'reviewer',
    description:
      'Prüft einen fertigen Diff gegen Auftrag und Tests auf Fehler, Lücken und unnötigen Code. Ändert nichts.',
    prompt: [
      'Du bist der Reviewer. Lies den Diff (git diff) und den Auftrag und lass die Tests laufen.',
      'Ändere keine Dateien und keinen Git-Stand.',
      'Melde nur belegte Befunde, je mit Datei:Zeile, Fehlerszenario und Schwere, die wichtigsten zuerst. Gibt es keinen Befund, sag das.',
    ].join('\n'),
    tools: [...READ_TOOLS, 'Bash'],
    model: 'opus',
  },
  {
    name: 'sicherheitspruefer',
    description:
      'Prüft einen Diff auf Sicherheitslücken: Eingaben, Geheimnisse, Rechte, Abhängigkeiten. Ändert nichts.',
    prompt: [
      'Du bist der Sicherheitsprüfer. Prüfe den Diff auf Eingabevalidierung an Vertrauensgrenzen, Injection, Geheimnisse im Code, Rechte, neue Abhängigkeiten und Datenschutz.',
      'Ändere nichts.',
      'Melde nur belegte Befunde mit Datei:Zeile, Angriffsszenario und Schwere. Hast du nichts gefunden, sag das.',
    ].join('\n'),
    tools: [...READ_TOOLS, 'Bash'],
    model: 'opus',
  },
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

export const plannerSection = (type: string, contextPercent?: number): string => {
  const prefix = type.split(':')[0]

  return [
    'Rollenverteilung: Du bist der Planer.',
    'Zerlege größere Aufgaben in kleine, in sich abgeschlossene Schritte und schreibe den Plan zuerst kurz auf.',
    `Delegiere die Umsetzung einzelner Schritte mit dem Agent-Tool an den Agenten "${type}" (günstigeres Modell).`,
    `Lass zu einem Schritt rote Tests vom Agenten "${prefix}:tester" schreiben und prüfe selbst, dass sie aus dem richtigen Grund rot sind.`,
    `Lass vor dem Commit oder Merge den Diff vom Agenten "${prefix}:reviewer" prüfen.`,
    `Setze bei Eingaben, Auth, Geheimnissen und Abhängigkeiten zusätzlich den Agenten "${prefix}:sicherheitspruefer" ein.`,
    `Gib breite Suche und Lesen, wenn nur das Ergebnis zählt, an den Agenten "${prefix}:sucher".`,
    'Gib dem Umsetzer pro Aufruf genau einen Schritt mit allen nötigen Details: Dateien, gewünschtes Verhalten, Randbedingungen.',
    'Prüfe das Ergebnis jedes Schritts selbst, bevor du den nächsten startest. Kleine Änderungen (wenige Zeilen) machst du direkt selbst.',
    ...(contextPercent !== undefined && contextPercent >= CONTEXT_TIGHT_AT
      ? [
          `Dein Kontext ist zu ${Math.round(contextPercent)} % voll: antworte knapp, lies keine großen Dateien selbst und gib Erkunden und Umsetzen an den Umsetzer ab. Schlage dem Nutzer /compact oder einen neuen Chat vor, wenn ein Schritt abgeschlossen ist.`,
        ]
      : []),
  ].join('\n')
}

const asString = (v: PluginOptions[string] | undefined, fallback: string): string =>
  typeof v === 'string' ? v : fallback

export const register: Register = (on, options) => {
  const model = asString(options.workerModel, 'sonnet')
  const canEdit = options.canEdit !== false
  let contextPercent: number | undefined

  on('session.start', async ($, e, next) => {
    const { agent } = await $.agent.register({
      name: AGENT,
      description:
        'Setzt genau einen vom Planer klar beschriebenen Schritt um (Code ändern, Dateien anlegen). Nicht für Planung oder offene Fragen.',
      prompt: workerPrompt(canEdit),
      tools: canEdit ? [...READ_TOOLS, ...WRITE_TOOLS] : READ_TOOLS,
      model,
    })
    for (const r of ROLES) await $.agent.register(r)
    $.ui.toast(`Planer/Umsetzer aktiv: ${agent} (${model}) + Tester, Reviewer, Sicherheitsprüfer, Sucher`)

    return next(e)
  })

  on('session.measure', (_$, e, next) => {
    contextPercent = e.context.percent ?? contextPercent

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

/** Tools that write files; the CEO may use them only for plans and notes. */
export const WRITE_TOOLS = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit']

export type Verdict = { isAllowed: boolean; reason?: string }

const ALLOW: Verdict = { isAllowed: true }

export const editedPath = (input: object): string | undefined => {
  if ('file_path' in input && typeof input.file_path === 'string') return input.file_path
  if ('notebook_path' in input && typeof input.notebook_path === 'string') return input.notebook_path
  return undefined
}

/** Built-in agents that only read; every other non-team agent could write code past the team. */
const READ_ONLY_BUILTINS = ['Explore', 'Plan', 'claude-code-guide']
const BUILDERS = /^team:(.*-ingenieur|tester|umsetzer)$/

/** From level 2 only team agents and read-only built-ins start; builders run on Sonnet only. */
export const engineerModelVerdict = (input: { subagent_type?: string; model?: string }): Verdict => {
  const type = input.subagent_type ?? 'general-purpose'
  if (!type.startsWith('team:') && !READ_ONLY_BUILTINS.includes(type))
    return { isAllowed: false, reason: `Ab Stufe 2 arbeitet nur das Team. Statt "${type}" einen Ingenieur, team:umsetzer oder zum Lesen Explore beauftragen.` }
  if (BUILDERS.test(type) && input.model !== undefined && input.model !== 'sonnet')
    return { isAllowed: false, reason: `Ingenieure, Umsetzer und Tester arbeiten nur mit Sonnet. Den Aufruf ohne model oder mit model "sonnet" wiederholen (nicht "${input.model}").` }
  return ALLOW
}

/** In a level with a reviewer model (2), every reviewing team agent runs on it; their own files may say opus. */
export const reviewerModelVerdict = (input: { subagent_type?: string; model?: string }, model?: string): Verdict => {
  const type = input.subagent_type ?? ''
  const reviews = type.startsWith('team:') && !BUILDERS.test(type) && type !== 'team:sucher'
  return model !== undefined && reviews && input.model !== model
    ? { isAllowed: false, reason: `In dieser Stufe prüfen die Prüfer mit model "${model}". Den Aufruf mit model "${model}" wiederholen.` }
    : ALLOW
}

/** The level is the person's choice: the model may not run /team-N itself. */
export const levelSwitchVerdict = (input: { tool: string }): Verdict =>
  // shortcut: matches team-N anywhere in a Skill or SlashCommand input; narrow it if a real skill name ever does
  ['Skill', 'SlashCommand'].includes(input.tool) && /\bteam-[0-4]\b/.test(JSON.stringify(input))
    ? { isAllowed: false, reason: 'Die Team-Stufe wählt nur der Mensch. Frag ihn, ob er die Stufe wechseln möchte.' }
    : ALLOW

export const and = (a: Verdict, b: Verdict): Verdict => (a.isAllowed ? b : a)

/** Path relative to the project root, without . segments; an absolute path elsewhere stays absolute. */
const relativePath = (slashed: string, root?: string): string => {
  const base = root?.replace(/\\/g, '/').replace(/\/+$/, '')
  const rel = base !== undefined && slashed.startsWith(`${base}/`) ? slashed.slice(base.length + 1) : slashed
  return rel.split('/').filter(part => part !== '.' && part !== '').join('/')
}

export const ceoWriteVerdict = (tool: string, path: string | undefined, root?: string): Verdict => {
  if (!WRITE_TOOLS.includes(tool)) return ALLOW
  const shown = (path ?? '').replace(/\\/g, '/')
  // any .. counts as code: the CEO has no reason to climb, and .team/../src must not pass as .team/
  const rel = shown.split('/').includes('..') ? undefined : relativePath(shown, root)
  if (rel !== undefined && (/\.md$/i.test(rel) || rel.startsWith('.team/'))) return ALLOW
  return {
    isAllowed: false,
    reason: [
      `Code-Sperre des Teams: Als CEO schreibst du keinen Code, auch keine einzelne Zeile (${shown || 'unbekannte Datei'}).`,
      'Gib die Änderung als Auftrag an den passenden Ingenieur (team:ui-ingenieur, team:logik-ingenieur, team:anbindungs-ingenieur, ohne Oberfläche team:umsetzer) oder Tests an team:tester.',
      'Selbst schreiben darfst du nur Markdown (Pläne, Notizen) und Dateien im Ordner .team/ des Projekts.',
    ].join(' '),
  }
}

/** Tools that write files; the CEO may use them only for plans and notes. */
export const WRITE_TOOLS = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit']

/** What the CEO may still write itself: Markdown and the team's working folder. */
const CEO_ALLOWED = [/\.md$/i, /(^|\/)\.frontend-team\//]

export type Verdict = { isAllowed: boolean; reason?: string }

export const editedPath = (input: object): string | undefined => {
  if ('file_path' in input && typeof input.file_path === 'string') return input.file_path
  if ('notebook_path' in input && typeof input.notebook_path === 'string') return input.notebook_path
  return undefined
}

/** Agent types that can write code outside the team; an Agent call without a type starts general-purpose. */
const FOREIGN_WRITERS = ['general-purpose', 'claude', 'team-delegate:umsetzer']

/** Engineers run on Sonnet only; foreign code-writing agents are closed in frontend mode. */
export const engineerModelVerdict = (input: { subagent_type?: string; model?: string }): Verdict => {
  const type = input.subagent_type ?? 'general-purpose'
  if (FOREIGN_WRITERS.includes(type))
    return { isAllowed: false, reason: `Im Frontend-Modus schreibt nur das Team Code. Statt "${type}" einen Ingenieur von frontend-team beauftragen.` }
  if (/^frontend-team:.*-ingenieur$/.test(type) && input.model !== undefined && input.model !== 'sonnet')
    return { isAllowed: false, reason: `Ingenieure arbeiten nur mit Sonnet. Den Aufruf ohne model oder mit model "sonnet" wiederholen (nicht "${input.model}").` }
  return { isAllowed: true }
}

/** In a level with a reviewer model (leicht), TÜV reviewers run only on it; their own frontmatter may say opus. */
export const reviewerModelVerdict = (input: { subagent_type?: string; model?: string }, model?: string): Verdict =>
  model !== undefined && /^frontend-team:tuev-/.test(input.subagent_type ?? '') && input.model !== model
    ? { isAllowed: false, reason: `In dieser Stufe prüfen die Prüfer mit model "${model}". Den Aufruf mit model "${model}" wiederholen.` }
    : { isAllowed: true }

export const and = (a: Verdict, b: Verdict): Verdict => (a.isAllowed ? b : a)

export const ceoWriteVerdict =(tool: string, path: string | undefined): Verdict => {
  if (!WRITE_TOOLS.includes(tool)) return { isAllowed: true }
  const normalized = (path ?? '').replace(/\\/g, '/')
  if (CEO_ALLOWED.some((re) => re.test(normalized))) return { isAllowed: true }
  return {
    isAllowed: false,
    reason: [
      `Code-Sperre des Frontend-Teams: Der CEO schreibt keinen Code, auch keine einzelne Zeile (${normalized || 'unbekannte Datei'}).`,
      'Gib die Änderung als Auftrag an den passenden Ingenieur (ui-ingenieur, logik-ingenieur, anbindungs-ingenieur) oder Tests an den test-ingenieur. Sie arbeiten mit Sonnet.',
      'Selbst schreiben darfst du nur Markdown (Pläne, Notizen) und Dateien in .frontend-team/.',
    ].join(' '),
  }
}

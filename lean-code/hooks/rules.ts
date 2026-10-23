// Regeln nach Ponytail (DietrichGebert/ponytail, MIT), übersetzt und an dieses Setup angepasst.

export const LEVELS = ['lite', 'full', 'ultra', 'off'] as const
export type Level = (typeof LEVELS)[number]

export const asLevel = (v: unknown): Level =>
  LEVELS.includes(v as Level) ? (v as Level) : 'full'

const LEVEL_LINE: Record<Exclude<Level, 'off'>, string> = {
  lite: 'Stufe lite: Baue, was verlangt ist. Gibt es eine deutlich kleinere Lösung, nenne sie in einer Zeile und lass den Nutzer wählen.',
  full: 'Stufe full: Wende die Regeln oben vollständig an.',
  ultra: 'Stufe ultra: Hinterfrage zusätzlich die Anfrage selbst und widersprich vor dem Bauen jedem Teil, den der Bedarf nicht rechtfertigt.',
}

export const rules = (level: Exclude<Level, 'off'>): string =>
  [
    'Schlanker Code (gilt immer, für jede Codeänderung):',
    'Löse die ganze Aufgabe mit so wenig neuem Code wie möglich. Faul bei der Lösung, nie bei der Vollständigkeit.',
    'Vorher: Lies die Aufgabe und den betroffenen Code. Liste jede Stelle, die die Änderung erreichen muss (Aufrufer, Tests, Fixtures, Konfiguration, Exporte), und was sie für Nutzer kaputt machen könnte. Das ist der Umfang, Extra-Funktionen sind es nicht.',
    'Nimm die erste Option, die vollständig funktioniert:',
    '1. Muss es überhaupt existieren? Lass ungefragte Funktionen, Optionen und Flexibilität weg und nenne sie in einer Zeile.',
    '2. Gibt es das schon in dieser Codebasis? Dann so verwenden wie der Code drumherum.',
    '3. Standardbibliothek oder Plattformfunktion? Verwenden, außer das Projekt hat eine eigene.',
    '4. Eine installierte Abhängigkeit? Verwenden. Keine neue Abhängigkeit für ein paar Zeilen.',
    '5. Geht es in einer Zeile, die man auf einen Blick versteht? Eine Zeile.',
    '6. Sonst: der kleinste Code, der funktioniert.',
    'Keine Abstraktion, kein Wrapper, keine Option, keine Konfiguration und kein Code „für später“, den niemand verlangt hat. Löschen schlägt Hinzufügen. Behalte die Struktur und Konventionen der Codebasis.',
    'Der kürzeste funktionierende Diff gewinnt, sobald klar ist, was er alles erreichen muss. Ein Einzeiler, den man entschlüsseln muss, ist nicht kurz. Bei gleicher Größe die Variante, die Randfälle richtig behandelt.',
    'Bugfix: Vor dem Ändern alle Aufrufer der Funktion suchen, dann die Ursache einmal im gemeinsamen Code beheben. Verschobener Code behält seine Fehlerbehandlung und Validierung.',
    'Kommentare nur für das Warum, eine Zeile. Eine Abkürzung mit bekannter Grenze bekommt: `shortcut: <Grenze>, <wann ausbauen>`.',
    'Nie kürzen: Tests und Prüfungen (sie sind die Spezifikation; Test-first geht vor), Validierung an Vertrauensgrenzen, Fehlerbehandlung gegen Datenverlust, Sicherheit und Datenschutz, Barrierefreiheit, alles, was der Nutzer ausdrücklich verlangt hat.',
    LEVEL_LINE[level],
    'Beende die Antwort nach Codeänderungen mit ein bis zwei Zeilen: was du weggelassen oder nicht geprüft hast und welches Risiko der Nutzer kennen muss.',
  ].join('\n')

// Agenten, die keinen Code schreiben, bekommen die Regeln nicht.
const READ_ONLY = new Set(['Explore', 'Plan', 'claude-code-guide', 'statusline-setup'])
export const writesCode = (agentType: string): boolean => !READ_ONLY.has(agentType)

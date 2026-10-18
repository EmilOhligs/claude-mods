# team-delegate (Claude Code Mod) v0.2

Planer/Umsetzer in einem Chat: der Chat (z. B. auf Opus) plant, ein günstigeres Modell setzt einzelne Schritte um.

## Wie es funktioniert
- Beim Start registriert der Mod den Agent-Typ `team-delegate:umsetzer` (eigenes Modell, eigener System-Prompt, begrenzte Tools).
- Über `prompt.compose` bekommt der Chat zusätzlich die Rolle „Planer“: Aufgabe zerlegen, Schritte per Agent-Tool an den Umsetzer geben, Ergebnisse selbst prüfen.
- Der Umsetzer läuft immer auf dem eingestellten Modell (Standard `sonnet`). Es wird nie automatisch gewechselt, auch nicht gegen Ende des Token-Limits.
- **Kontext-Hinweis:** Ist der Kontext des Planers ≥ 70 % voll, bekommt er im System-Prompt die Anweisung, knapp zu bleiben, mehr abzugeben und `/compact` oder einen neuen Chat vorzuschlagen.
- Ein Toast bestätigt beim Start, welches Modell der Umsetzer nutzt.

## Einstellungen (userConfig)
- `workerModel`: `haiku`, `sonnet` (Standard) oder `opus`
- `canEdit`: Umsetzer darf Dateien ändern (Standard: an). Aus = nur lesen und Vorschläge liefern.

## Dateien
- `hooks/register.ts` – Logik (`session.start`, `session.measure`, `prompt.compose`)
- `hooks/register.test.ts` – Tests für Prompts, Modellleiter und Sparstufen

## Zusammenspiel
Das Dashboard aus `token-counter` zeigt Planer und Umsetzer getrennt und empfiehlt, wann zu delegieren oder zu komprimieren ist. 

## Offen
- Nicht in einer echten Session ausprobiert; `claude plugin validate`/`test` nicht gelaufen (`tsc` sauber).
- Nicht geprüft: ob der Planer den Umsetzer zuverlässig aufruft und ob `model` im Agent-Typ greift.

# team-delegate (Claude Code Mod)

Planer/Umsetzer in einem Chat: der Chat (z. B. auf Opus) plant, ein günstigeres Modell setzt einzelne Schritte um.

## Wie es funktioniert
- Beim Start registriert der Mod den Agent-Typ `team-delegate:umsetzer` (eigenes Modell, eigener System-Prompt, begrenzte Tools).
- Über `prompt.compose` bekommt der Chat zusätzlich die Rolle „Planer“: Aufgabe zerlegen, Schritte per Agent-Tool an den Umsetzer geben, Ergebnisse selbst prüfen.
- Ein Toast bestätigt beim Start, welches Modell der Umsetzer nutzt.

## Einstellungen (userConfig)
- `workerModel`: `haiku`, `sonnet` (Standard) oder `opus`
- `canEdit`: Umsetzer darf Dateien ändern (Standard: an). Aus = nur lesen und Vorschläge liefern.

## Dateien
- `hooks/register.ts` – Logik (`session.start`, `prompt.compose`)
- `hooks/register.test.ts` – Tests für die Prompt-Texte

## Offen
- Nicht in einer echten Session ausprobiert; `claude plugin validate`/`test` nicht gelaufen (`tsc` sauber).
- Nicht geprüft: ob der Planer den Umsetzer zuverlässig aufruft und ob `model` im Agent-Typ greift.

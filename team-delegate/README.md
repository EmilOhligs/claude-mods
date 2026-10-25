# team-delegate (Claude Code Mod) v0.3

Planer/Umsetzer in einem Chat: der Chat (z. B. auf Opus) plant, ein günstigeres Modell setzt einzelne Schritte um.

## Wie es funktioniert
- Beim Start registriert der Mod den Agent-Typ `team-delegate:umsetzer` (eigenes Modell, eigener System-Prompt, begrenzte Tools).
- Über `prompt.compose` bekommt der Chat zusätzlich die Rolle „Planer“: Aufgabe zerlegen, Schritte per Agent-Tool an den Umsetzer geben, Ergebnisse selbst prüfen.
- Der Umsetzer läuft immer auf dem eingestellten Modell (Standard `sonnet`). Es wird nie automatisch gewechselt, auch nicht gegen Ende des Token-Limits.
- **Kontext-Hinweis:** Ist der Kontext des Planers ≥ 70 % voll, bekommt er im System-Prompt die Anweisung, knapp zu bleiben, mehr abzugeben und `/compact` oder einen neuen Chat vorzuschlagen.
- Ein Toast bestätigt beim Start, welches Modell der Umsetzer nutzt.

## Team (seit v0.3)
| Agent | Modell | Werkzeuge | Wann der Planer ihn ruft |
| --- | --- | --- | --- |
| `team-delegate:umsetzer` | `workerModel` (Standard Sonnet) | lesen, ändern, Bash | einen geplanten Schritt umsetzen; ändert keine Tests (tdd-guard) |
| `team-delegate:tester` | Sonnet | lesen, ändern, Bash | rote Tests zu einem Schritt schreiben; Quellcode sperrt tdd-guard |
| `team-delegate:reviewer` | Opus | lesen, Bash | Diff vor Commit/Merge prüfen; ändert nichts laut Auftrag (Bash bleibt für Diff und Tests, ist nicht gesperrt) |
| `team-delegate:sicherheitspruefer` | Opus | lesen, Bash | Diff bei Eingaben, Auth, Geheimnissen, Abhängigkeiten prüfen; ändert nichts laut Auftrag (wie Reviewer) |
| `team-delegate:sucher` | Haiku | nur lesen | breite Suche, wenn nur das Ergebnis zählt |

Der Planer ist der Chat selbst (z. B. Opus). Angesteuert werden alle über das Agent-Tool; der Planer bekommt die Regeln dafür über `prompt.compose`.

## Einstellungen (userConfig)
- `workerModel`: `haiku`, `sonnet` (Standard) oder `opus`
- `canEdit`: Umsetzer darf Dateien ändern (Standard: an). Aus = nur lesen und Vorschläge liefern.

## Dateien
- `hooks/register.ts` – Logik (`session.start`, `session.measure`, `prompt.compose`)
- `hooks/register.test.ts` – Tests für Prompts, Modellleiter und Sparstufen

## Zusammenspiel
Das Dashboard aus `token-counter` zeigt Planer und Umsetzer getrennt und empfiehlt, wann zu delegieren oder zu komprimieren ist.

## Offen
- Echte Session 2026-10-24: ok. Umsetzer lief laut Transkript auf `claude-sonnet-5-5`, Übergabe und Rückmeldung sauber, Regeln von tdd-guard und lean-code kamen im Auftrag an.

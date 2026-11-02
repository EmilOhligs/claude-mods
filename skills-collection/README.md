# skills-collection

Skills für die Programmierarbeit. Nach der Installation in allen Projekten verfügbar, mit dem Präfix `skills-collection:`.

| Skill | Wann |
| --- | --- |
| `performance-workflow` | Code soll schneller werden: messen, profilen, Algorithmus vor Details, nachmessen, Ergebnis prüfen |
| `test-first` | Jede Aufgabe, die Verhalten ändert: erst ein fehlschlagender Test, dann der Code |
| `befehl-erklaeren` | Jeder vorgeschlagene Terminal-Befehl bekommt eine Kurzerklärung (was er tut, ob er etwas ändert); auf Nachfrage oder bei `sudo`, Löschen, Systemeinstellungen die Langform: Teile der Reihe nach, was sich ändert, worauf achten |

## Installation

    /plugin install skills-collection --marketplace EmilOhligs/claude-mods

## Neuen Skill hinzufügen

Ordner `skills/<name>/SKILL.md` mit Frontmatter (`name`, `description`) anlegen. Die `description` entscheidet, wann der Skill geladen wird: Auslöser-Wörter hineinschreiben.

## Offen

- Echte Session 2026-10-24: ok. Geladen waren genau `performance-workflow` und `test-first` (vor `befehl-erklaeren`). Ob `test-first` von selbst ausgelöst wird, ist noch nicht geprüft.

# tdd-guard (Claude Code Mod) v0.1

Test-first in jedem Git-Projekt: erst ein roter Test, dann der Code. Der Mod schreibt die Regeln in den System-Prompt und setzt sie mit Hooks durch. Er ist auf `team-delegate` abgestimmt: Der Planer schreibt die Tests, der Umsetzer macht sie grün.

## Was erzwungen wird

Alles gilt nur in Git-Repositories.

- **Code erst nach einem Test:** Eine Quelldatei lässt sich erst ändern, wenn in der Arbeitskopie eine Testdatei geändert oder neu ist. Ändert ein Shell-Befehl trotzdem Quellcode, wird die Änderung abgelehnt und mit `git stash` zurückgenommen (zurückholen mit `git stash pop`).
- **Tests gehören dem Planer:** Der Umsetzer (`team-delegate:umsetzer`) darf keine Testdateien ändern.
- **Kein Wegschalten von Tests:** Neue `skip`-, `xfail`-, `only`- oder `ignore`-Marker werden abgelehnt (pytest, unittest, Jest/Vitest/Mocha, Go, Rust).
- **Sofortige Rückmeldung:** Nach jeder Änderung an einer Testdatei läuft dieser Test, und Claude bekommt das Ergebnis (rot oder grün) samt Fehlermeldung zurück. Code-Dateien prüft zusätzlich der Linter, falls einer erkannt wurde.
- **Zugende nur mit grüner Suite:** Gibt es Codeänderungen, laufen am Ende eines Zugs Tests und Linter. Sind sie rot, wird der Zug einmal angehalten. Das gilt für den Planer und für den Umsetzer.
- **Commit nur mit grüner Suite:** Ein `git commit` geht nur durch, wenn Linter, Formatprüfung und Tests grün sind.
- **Regeln für den Umsetzer:** Beim Start des Umsetzers hängt der Mod die Test-first-Regeln an dessen Auftrag an.
- **Konfiguration geschützt:** Claude darf `.claude/tdd-guard.json` nicht ändern.

## Erkennung

| Projekt | Tests | Linter |
| --- | --- | --- |
| Python (`pyproject.toml`, `setup.py`, `setup.cfg` oder `pytest.ini`) | `pytest` aus `.venv`, sonst `python3` | `ruff` aus `.venv`, falls vorhanden (nur für `.py`-Dateien) |
| Node (`package.json` mit echtem `test`-Skript) | `npm test` | `npm run lint`, falls ein `lint`-Skript existiert |

Testdateien erkennt der Mod an typischen Namen wie `test_*.py`, `*_test.go`, `*.test.ts` und `*.spec.js` oder daran, dass sie in einem Ordner `tests/`, `test/`, `__tests__/` oder `spec/` liegen. Nicht als Quellcode zählen: `scripts/`, `docs/`, `examples/`, `.claude/`, Fixtures und Konfigurationsdateien.

## Einstellungen

- **Mod-Option `mode`:**
  - `block` (Standard): Verstöße werden abgelehnt.
  - `warn`: Verstöße gehen durch, Claude bekommt einen Hinweis.
  - `off`: Der Mod ist aus.
- **Pro Projekt** in `.claude/tdd-guard.json` (diese Datei pflegt nur der Mensch):

```json
{
  "enabled": true,
  "test": ["make", "test"],
  "testFile": ["pytest", "-q", "{file}"],
  "lint": ["make", "lint"],
  "lintFile": ["ruff", "check", "{file}"],
  "lintExtensions": [".py"],
  "format": ["ruff", "format", "--check", "."]
}
```

  Jeder Schlüssel ist optional, `{file}` steht für die geänderte Datei. Mit `{"enabled": false}` ist der Mod in diesem Projekt aus.

## Dateien

- `hooks/rules.ts`: reine Logik, also Pfaderkennung, Entscheidungen, Meldungen und Prompt-Texte
- `hooks/register.ts`: die Verdrahtung mit `tool.call`, `classic.Stop`, `classic.SubagentStop`, `prompt.compose` und `agent.spawn`
- `hooks/rules.test.ts` und `hooks/register.test.ts`: die Tests (`claude plugin test <ordner>`)

## Zusammenspiel

`team-delegate` stellt den Umsetzer. `token-counter` zeigt, wie sich der Verbrauch auf Planer und Umsetzer verteilt.

## Offen
- Echte Session 2026-10-24: Edit an Quellcode ohne geänderten Test wird abgelehnt (ok), aber eine Änderung per Shell (`sed -i`) geht durch. Die Sperre deckt Bash-Schreibzugriffe nicht ab.

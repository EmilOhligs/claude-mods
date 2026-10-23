# lean-code

Schlanker Code als Dauerregel: die kleinste vollständige Änderung, kein ungefragter Code. Nachgebaut nach [Ponytail](https://github.com/DietrichGebert/ponytail) (MIT, Lizenz in `LICENSE.ponytail`), aber ohne Aktivieren: Der Mod ist in jeder Session an.

## Was er tut

- **`prompt.compose`:** hängt die Regeln an den System-Prompt jeder Session.
- **`agent.spawn`:** hängt dieselben Regeln an den Auftrag jedes Subagenten, der Code schreiben kann, also auch an den Umsetzer von `team-delegate`. `Explore`, `Plan`, `claude-code-guide` und `statusline-setup` bleiben ausgenommen.

Die Regeln: erst den Umfang klären (Aufrufer, Tests, Fixtures, Konfiguration), dann die erste Option nehmen, die vollständig funktioniert: weglassen, Vorhandenes nutzen, Standardbibliothek, installierte Abhängigkeit, eine Zeile, erst dann minimaler neuer Code. Am Ende jeder Codeänderung ein bis zwei Zeilen dazu, was weggelassen oder nicht geprüft wurde.

**Nie gekürzt:** Tests und Prüfungen (Test-first und `tdd-guard` gehen vor), Validierung an Vertrauensgrenzen, Fehlerbehandlung gegen Datenverlust, Sicherheit und Datenschutz, Barrierefreiheit, ausdrücklich Verlangtes.

## Optionen

| Option | Werte | Standard |
| --- | --- | --- |
| `level` | `lite` (bauen, was verlangt ist, kleinere Variante nur nennen), `full` (Regeln anwenden), `ultra` (zusätzlich die Anfrage hinterfragen), `off` | `full` |
| `subagents` | Regeln auch an Subagenten anhängen | an |

## Unterschiede zu Ponytail

- Immer an, kein `/ponytail`-Befehl, kein eigenes Band (die Messung macht `token-counter`).
- Deutsch, Tests ausdrücklich in der Nie-kürzen-Liste.
- Keine Zusatz-Skills (`review`, `audit`, `debt`, `gain`).

## Installation

    claude plugin marketplace update claude-mods
    claude plugin install lean-code@claude-mods

Danach in einer neuen Session aktiv. Tests: `claude plugin test lean-code`.

# token-counter (Claude Code Mod) v0.3

Kleines Dashboard über dem Prompt plus Empfehlung, wann man etwas ändern sollte.

## Anzeige
- Balken für Kontext (`ctx`) und die Limits (`5h`, `7d`, ggf. Budget), grün/gelb/rot bei 75 % / 90 %, dazu die Kosten.
- Zeile „Planer / Umsetzer“: Tokens (↑ Input inkl. Cache, ↓ Output). Turns von Subagenten zählen als Umsetzer, der Rest als Planer.
- Knopf **Details** zeigt die Aufteilung je Modell, **Ausblenden** versteckt das Band.
- Die Statuszeile zeigt weiterhin die Kurzform.

## Empfehlung (höchste Dringlichkeit zuerst)
1. Kontext ≥ 90 %: `/compact` oder neuer Chat.
2. Limit ≥ 90 %: Umsetzung abgeben, kurz halten oder pausieren (kein automatischer Modellwechsel).
3. Kontext ≥ 75 %: nach dem Schritt `/compact` oder neuer Chat.
4. Limit ≥ 75 %: Umsetzung an `team-delegate:umsetzer` abgeben.
5. Viel Output im teuren Hauptmodell (Opus), kaum delegiert: Schritte delegieren.
Warn-/Alarmstufen kommen zusätzlich als Toast.

## Befehl
`/tokens` gibt den Bericht als Text aus; `/tokens hide`, `/tokens show`, `/tokens details` steuern das Band.

## Log für die Zentrale
Nach jedem Turn hängt der Mod eine JSON-Zeile an `~/.claude/token-counter/log/<session-id>.jsonl` an: Zeit, Session, Projekt (Ordnername), Rolle (`main`/`agent`), Modell, Tokens (input, output, cacheRead, cacheWrite), Dauer, Kontext-% und Kosten. Eine Datei pro Session, damit parallele Sessions sich nicht überschreiben. Claude überträgt die Zeilen in die Läufe der Zentrale. Klappt das Schreiben nicht, steht eine Zeile im Transkript; die Anzeige läuft weiter.

## Zusammenspiel mit team-delegate
team-delegate lässt den Umsetzer immer auf dem eingestellten Modell (Standard Sonnet) und warnt den Planer bei vollem Kontext. Beide Mods lesen die Zahlen unabhängig voneinander, keiner braucht den anderen.

## Dateien
- `hooks/model.ts` – Logik (Zählen, Empfehlung, Texte), ohne Engine-Abhängigkeit
- `hooks/register.tsx` – Hooks, Befehl, Band
- `hooks/model.test.ts` – Tests für die Logik
- `types/index.d.ts` – State-Vertrag

## Offen
- Der Log ist nur per Unit-Test geprüft, noch nicht in einer echten Session geschrieben worden.
- Das Band ist noch nie in einer echten Session angeschaut worden (Layout, Farben); `claude plugin validate`/`test` nicht gelaufen. `tsc` und ein Node-Check der Logik sind sauber.

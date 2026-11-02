# team

Ein Team aus Subagenten in fünf Stufen. Die Zahl steigt mit Aufwand und Kosten. Ersetzt `team-delegate` und `frontend-team` (das Frontend-Team stammt von Elias, [rethfeldelias/elias-mods](https://github.com/rethfeldelias/elias-mods), und ist hier ohne Änderung an seinem Repo eingeflossen).

## Installation

    /plugin install team --marketplace EmilOhligs/claude-mods

Vorher `team-delegate` und `frontend-team` deinstallieren, sonst gibt es Rollen doppelt.

## Stufen

Tippe `/team` und wähle aus der Liste. Hinter den Befehl kann direkt die Aufgabe; danach kurz „los“ schicken, weil ein Befehl allein keine Antwort des Modells startet. Die Statuszeile zeigt die aktive Stufe, jede Session startet in Stufe 1.

| Befehl | Stufe | Wer arbeitet | Prüfung |
| --- | --- | --- | --- |
| `/team-0` | Allein | Claude selbst, keine Team-Agenten | keine extra |
| `/team-1` | Delegieren | Claude plant, `team:umsetzer` baut, `team:sucher` sucht | `team:tester` vorab, `team:reviewer` vor dem Commit, `team:sicherheitspruefer` bei Eingaben, Auth, Geheimnissen |
| `/team-2` | Prüfen | Claude als CEO mit Code-Sperre, Ingenieure und `team:tester` bauen test-first, `team:schlank-waechter` gibt frei | Debugger und Sicherheitsprüfer mit Sonnet, Ziel 8/10, 2 Runden, keine Vorschlagsrunde |
| `/team-3` | Design | wie 2 | Design und Barrierefreiheit, Zielnote, 3 Runden |
| `/team-4` | Voll | wie 2 | Design, Debugger, Sicherheitsprüfer, Barrierefreiheit und die zugeschalteten, Zielnote und Runden laut Einstellung |

Für die Uni: `/team-0`. Zurück aus einer CEO-Stufe mit `/team-1`; das hebt die Code-Sperre auf und sagt Claude, dass die CEO-Anweisungen nicht mehr gelten.

## Rollen

| Agent | Modell | Stufe | Aufgabe |
| --- | --- | --- | --- |
| `team:umsetzer` | `workerModel` (Standard Sonnet) | ab 1 | einen Schritt umsetzen; ab 2 für Code ohne Oberfläche |
| `team:sucher` | Haiku | ab 1 | breite Suche, nur lesen |
| `team:tester` | Sonnet | ab 1 | rote Tests schreiben, einziger Agent für Tests |
| `team:reviewer` | Opus | ab 1 | Diff vor dem Commit; in Stufe 4 zuschaltbar mit Note |
| `team:sicherheitspruefer` | Opus (in Stufe 2 Sonnet) | ab 1 | Sicherheit vor dem Commit; ab 2 mit Note |
| `team:ui-ingenieur`, `team:logik-ingenieur`, `team:anbindungs-ingenieur` | Sonnet | ab 2 | Oberfläche, Logik, Anbindung |
| `team:schlank-waechter` | Sonnet | ab 2 | gibt jede Lieferung frei oder schickt sie mit Streichliste zurück |
| `team:debugger` | Sonnet | 2, 4 | klickt Abläufe durch, findet Fehler |
| `team:design`, `team:barrierefreiheit` | Opus, Sonnet | 3, 4 | Gestaltung nach Apple-Maßstab, WCAG 2.2 AA |
| `team:datenschutz`, `team:performance`, `team:responsive`, `team:texte` | Sonnet | 4, zuschaltbar | |

Die Prüfer prüfen jeden Code; Design, Barrierefreiheit und Browser-Prüfung nur, wenn es eine Oberfläche gibt. Das Fachwissen steckt in den Skills (`ceo-ablauf`, `bewertung`, `ingenieur-arbeitsweise`, `schlank-code`, `design-apple`, `barrierefreiheit`, `security-frontend`, `debugging`, `browser-pruefen`).

## Code-Sperre ab Stufe 2

Die Hauptsession (CEO) darf keine Code-Dateien schreiben, nur Markdown und Dateien im Ordner `.team/` des Projekts; Pfade mit `..` gelten immer als Code. Starten darf sie nur `team:*`-Agenten und die lesenden `Explore`, `Plan` und `claude-code-guide`. Ingenieure, Umsetzer und Tester laufen nur mit Sonnet, in Stufe 2 auch alle Prüfer. Die Stufe wechselt nur der Mensch: Ruft das Modell `/team-N` selbst auf, wird das abgelehnt. Grenze: Dateiänderungen über Shell-Befehle erkennt die Sperre nicht, sie sind dem CEO per Anweisung verboten.

## Einstellungen

`/plugin` → team → Konfigurieren: `workerModel`, `canEdit` (Umsetzer darf ändern), Zielnote, Runden bis zur Rückfrage, Oberfläche zeigen alle … Runden, zuschaltbare Prüfer (Datenschutz, Performance, Responsive, UX-Texte, Code-Review).

## Zusammenspiel

`tdd-guard` sperrt Tests für Umsetzer und Ingenieure und Quellcode für den Tester; `lean-code` hängt seine Regeln an alle, die Code schreiben, nicht an die Prüfer; den Verbrauch zeigt `token-counter`.

## Offen

- Noch nicht in einer echten Session geprüft: Statuszeile, Befehlsliste, Code-Sperre, ob die Stufe ein Fortsetzen der Session übersteht.
- Prüfergebnisse, Screenshots und Skripte landen in `.team/` (in `.gitignore` eintragen).

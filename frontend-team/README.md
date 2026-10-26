# frontend-team

Von Elias ([rethfeldelias/elias-mods](https://github.com/rethfeldelias/elias-mods)), übernommen in claude-mods und hier um Stufen und `/frontend aus` ergänzt (Version 0.3.0). Elias' Repo bleibt unverändert.

## Installation

    /plugin install frontend-team --marketplace EmilOhligs/claude-mods

Die Token-Anzeige dieses Mods doppelt die von `token-counter`; beide zusammen zeigen zwei Bänder und registrieren `/tokens` zweimal.


## Starten

In einer neuen Session im Projektordner:

    /frontend Baue eine Anmeldeseite mit E-Mail und Passwort

Damit wird der Chat zum **CEO** und arbeitet nach dem Skill `ceo-ablauf`.

Das erste Wort wählt die Stufe, der Rest ist die Aufgabe. Der Modus gilt nur für die laufende Session. Steht eine Aufgabe dabei, schick danach kurz „los“: Ein Befehl allein startet keine Antwort des Modells.

| Befehl | Prüfer | Ziel / Runden | Wofür |
| --- | --- | --- | --- |
| `/frontend <Aufgabe>` oder `/frontend voll <Aufgabe>` | wie eingestellt | wie eingestellt | große Features |
| `/frontend design <Aufgabe>` | Design, Barrierefreiheit | Zielnote / 3 | reine Gestaltung |
| `/frontend leicht <Aufgabe>` | Debugger, Security, beide mit Sonnet, ohne Vorschlagsrunde | 8 / 2 | kleine Aufgaben, wenig Tokens |
| `/frontend aus` | – | – | beendet den Modus und die Code-Sperre |

## Rollen

| Rolle | Agent | Modell |
| --- | --- | --- |
| CEO | die Hauptsession | Opus |
| UI-Ingenieur | `ui-ingenieur` | Sonnet |
| Logik-Ingenieur | `logik-ingenieur` | Sonnet |
| Anbindungs-Ingenieur | `anbindungs-ingenieur` | Sonnet |
| Test-Ingenieur (schreibt alle Tests) | `test-ingenieur` | Sonnet |
| Schlank-Wächter (gibt jede Lieferung frei) | `schlank-waechter` | Sonnet |
| TÜV Design (Apple-Maßstab) | `tuev-design` | Opus |
| TÜV Debugger | `tuev-debugger` | Sonnet |
| TÜV Security | `tuev-security` | Opus |
| TÜV Barrierefreiheit | `tuev-barrierefreiheit` | Sonnet |
| TÜV Datenschutz (zuschaltbar) | `tuev-datenschutz` | Sonnet |
| TÜV Performance (zuschaltbar) | `tuev-performance` | Sonnet |
| TÜV Responsive (zuschaltbar) | `tuev-responsive` | Sonnet |
| TÜV UX-Texte (zuschaltbar) | `tuev-texte` | Sonnet |
| TÜV Code-Review (zuschaltbar) | `tuev-code-review` | Sonnet |

## Hierarchie

```
CEO (Opus) – plant, verteilt, entscheidet, schreibt keinen Code
├── Ingenieure (Sonnet): test-ingenieur, ui-ingenieur, logik-ingenieur, anbindungs-ingenieur
│   └── Schlank-Wächter (Sonnet): kein toter, doppelter oder ungefragter Code
└── TÜV: Design, Debugger, Security, Barrierefreiheit (+ zuschaltbare)
```

## Code-Sperre

Sobald `/frontend` läuft, lehnt der Mod jeden Schreibzugriff der Hauptsession (CEO, Opus) auf Code-Dateien ab, auch für eine einzelne Zeile. Code und Tests schreiben nur die Ingenieure mit Sonnet; ein Aufruf eines Ingenieurs mit einem anderen Modell wird abgelehnt, ebenso allgemeine Agenten (general-purpose, team-delegate:umsetzer), die Code schreiben könnten. Der CEO darf Markdown und Dateien in `.frontend-team/` schreiben. Der allgemeine Umsetzer aus `team-delegate` wird im Frontend-Modus ausgeblendet, damit nichts an der Sperre vorbeiläuft. Grenze: Dateiänderungen über Shell-Befehle erkennt die Sperre nicht, sie sind dem CEO per Anweisung verboten.

## Token-Anzeige

Über dem Prompt: Kontext (`ctx`), 5-Stunden- und 7-Tage-Limit, Kosten, Verbrauch CEO gegen Team und eine Empfehlung. `/tokens` gibt einen Bericht, `/tokens details`, `/tokens hide`, `/tokens show`. Übernommen aus `token-counter` von Emil; den dort bitte deaktivieren, sonst erscheint die Anzeige doppelt.

## Ablauf

1. **Vorschlagsrunde:** Alle Prüfer sagen parallel, worauf es bei der Aufgabe ankommt.
2. **Plan:** Der CEO fasst zusammen, legt Abnahmekriterien fest, **der Mensch gibt frei**.
3. **Bauen:** Der Test-Ingenieur schreibt rote Tests, die Ingenieure machen sie grün (Tests, Lint, Build, App startet), der Schlank-Wächter gibt jede Lieferung frei.
4. **Prüfrunde:** Alle Prüfer bewerten mit 1–10 und Befunden (Skill `bewertung`).
5. **Entscheiden:** fertig, nachbessern (zurück zu 3) oder Rückfrage an den Menschen.
6. **Oberfläche zeigen:** Alle 3 Runden und vor jeder Rückfrage zum Durchklicken.

## Abbruchregeln (einstellbar)

| Option | Standard | Bedeutung |
| --- | --- | --- |
| Zielnote | 9 | Jeder Prüfer mindestens so viel, kein offener kritischer oder hoher Befund |
| Runden bis zur Rückfrage | 4 | Danach hält das Team an und fragt |
| Oberfläche zeigen alle … Runden | 3 | Rhythmus zum Durchklicken |
| Zuschaltbare Prüfer | aus | Datenschutz, Performance, Responsive, UX-Texte, Code-Review |

Ändern über `/plugin` → frontend-team → Konfigurieren, oder in der Desktop-App über + → Plugins.

## Skills

Das Fachwissen der Agenten steckt in Skills, die jeder Agent beim Start lädt: `design-apple`, `barrierefreiheit`, `security-frontend`, `debugging`, `browser-pruefen`, `ingenieur-arbeitsweise`, `schlank-code`, `bewertung`, `ceo-ablauf`. Wer einen Agenten verbessern will, verbessert seinen Skill.

## Voraussetzungen im Projekt

Node.js. Playwright und axe-core installieren die Prüfer bei Bedarf als Entwicklungsabhängigkeit. Prüfergebnisse, Screenshots und Skripte landen in `.frontend-team/` (nicht eingecheckt).

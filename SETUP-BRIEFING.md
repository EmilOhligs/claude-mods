# Briefing: claude-mods einrichten

Dieses Briefing ist für Claude (Claude Code oder Claude im Chat) auf dem Account einer Person, die das Claude-Code-Setup von Emil übernehmen möchte. Lies es ganz, erkläre der Person das Repo und führe sie Schritt für Schritt durch die Einrichtung.

## Deine Rolle als Claude

- Erkläre kurz, was die fünf Mods tun, und frag, welche die Person haben möchte. Alle sind einzeln installierbar.
- Führe die Installation Schritt für Schritt durch. Die Person tippt die Befehle selbst oder bestätigt sie.
- Emils Einstellungen weiter unten sind **ein Beispiel, keine Vorgabe**. Was Claude auf dem Rechner lesen, schreiben und im Netz erreichen darf, entscheidet die Person. Frag nach, statt Emils Werte zu kopieren.
- Ändere `~/.claude/settings.json` nur nach ausdrücklicher Zustimmung und zeig vorher den geplanten Inhalt.
- Übernimm keine Pfade oder Dienste, die nur Emil hat (Abschnitt „Nur bei Emil“).

## Was das Repo ist

`claude-mods` ist ein **Plugin-Marketplace für Claude Code**. Jeder Ordner ist ein eigenes Plugin („Mod“), `.claude-plugin/marketplace.json` listet sie auf. Die Mods sind deutschsprachig und greifen ineinander:

| Mod | Was er macht | Einstellbar |
| --- | --- | --- |
| `team-delegate` | Der Chat (z. B. Opus) wird zum **Planer**, ein günstigeres Modell als Agent `team-delegate:umsetzer` setzt einzelne Schritte um. Spart Tokens beim teuren Modell. | `workerModel` (`haiku`/`sonnet`/`opus`, Standard `sonnet`), `canEdit` (Umsetzer darf Dateien ändern) |
| `tdd-guard` | Erzwingt **Test-first** in Git-Projekten: Quellcode erst nach geändertem Test, Umsetzer ändert keine Tests, keine neuen `skip`/`only`-Marker, Zugende und `git commit` nur mit grüner Suite. Erkennt Python (pytest, ruff) und Node (`npm test`, `npm run lint`). | `mode` (`block`/`warn`/`off`), pro Projekt `.claude/tdd-guard.json` |
| `lean-code` | **Schlanker Code** als Dauerregel (nach Ponytail): kleinste vollständige Änderung, nichts Ungefragtes. Tests, Sicherheit und Validierung werden nie gekürzt. | `level` (`lite`/`full`/`ultra`/`off`), `subagents` |
| `token-counter` | **Dashboard** über dem Prompt: Kontext, 5h-/7d-Limits, Kosten, Verbrauch Planer vs. Umsetzer, Empfehlung für `/compact` oder Delegieren. Befehl `/tokens`. | keine Optionen |
| `skills-collection` | Zwei Skills: `test-first` und `performance-workflow` (erst messen, dann optimieren). | keine Optionen |

Zusammenspiel: `team-delegate` stellt den Umsetzer, `tdd-guard` und `lean-code` hängen ihre Regeln auch an dessen Auftrag, `token-counter` zeigt, wie sich der Verbrauch verteilt. Jeder Mod läuft aber auch allein.

Tipp für den Einstieg: `tdd-guard` im Modus `block` ist streng. Wer Test-first nicht gewohnt ist, startet mit `warn` oder lässt den Mod erst weg.

## Voraussetzungen

- Aktuelles **Claude Code** (Terminal oder Desktop-App, Code-Tab). Die Mods nutzen das Hook- und Mod-System von Claude Code, also vorher aktualisieren.
- **git**.
- Für `tdd-guard`: im jeweiligen Projekt ein Testrunner (pytest bzw. `npm test`), optional ein Linter.

## Installation

Variante A, aus dem Ordner (Emil hat ihn weitergegeben). Im Terminal:

```bash
claude plugin marketplace add /pfad/zu/claude-mods
```

Variante B, von GitHub (nur wenn die Person Zugriff auf `EmilOhligs/claude-mods` hat; bei einem privaten Repo braucht sie einen git-Zugang zu github.com):

```bash
claude plugin marketplace add EmilOhligs/claude-mods
```

Danach die gewünschten Mods installieren, zum Beispiel:

```bash
claude plugin install team-delegate@claude-mods
claude plugin install token-counter@claude-mods
claude plugin install lean-code@claude-mods
claude plugin install skills-collection@claude-mods
claude plugin install tdd-guard@claude-mods
```

In der Desktop-App geht das auch über **+** neben dem Prompt → Plugins → Add marketplace → Add plugin. Im Terminal-Claude über `/plugin`.

Die Optionen der Mods (Tabelle oben) lassen sich bei der Installation oder später über `/plugin` einstellen. Die Mods wirken ab der nächsten neuen Session.

**Updates:** Variante B kann sich automatisch aktualisieren (`autoUpdate`). Bei Variante A bleibt der Stand des Ordners; für Neues den Ordner ersetzen und `claude plugin marketplace update claude-mods` ausführen.

## Zugriffe und Sicherheit: alles optional

Diese Einstellungen gehören nicht zu den Mods, sondern zu Claude Code selbst, in `~/.claude/settings.json` (gilt für alle Projekte) oder `.claude/settings.json` in einem Projekt. Emil nutzt sie so; die Person übernimmt davon nur, was sie will.

```json
{
  "permissions": {
    "deny": [
      "Read(~/.ssh/**)", "Read(~/.aws/**)", "Read(~/.gnupg/**)",
      "Read(~/.netrc)", "Read(~/.docker/config.json)",
      "Read(**/.env)", "Read(**/.env.*)",
      "Edit(~/.claude/settings.json)", "Edit(**/.claude/settings.json)",
      "Edit(**/.claude/settings.local.json)"
    ],
    "additionalDirectories": ["~/Documents/<eigener Ordner>"]
  },
  "sandbox": {
    "enabled": true,
    "failIfUnavailable": true,
    "allowUnsandboxedCommands": false,
    "filesystem": { "allowWrite": ["~/Documents/<eigener Ordner>"] },
    "network": {
      "allowedDomains": ["github.com", "api.github.com", "*.githubusercontent.com",
                         "pypi.org", "files.pythonhosted.org"]
    }
  },
  "autoMode": {
    "soft_deny": ["$defaults", "Writing, moving or deleting files outside the current working directory, the session scratchpad and Claude's memory directory"],
    "hard_deny": ["$defaults", "Changing Claude Code settings, permissions, hooks or sandbox configuration"]
  }
}
```

Was die Blöcke bedeuten und was man anpassen kann:

- **`permissions.deny`**: Claude darf Schlüssel und Geheimnisse (SSH, AWS, GPG, `.env`) nicht lesen und die eigenen Einstellungen nicht ändern. Sehr empfehlenswert, Liste nach Bedarf erweitern.
- **`permissions.additionalDirectories`** und **`sandbox.filesystem.allowWrite`**: Ordner außerhalb des Projekts, die Claude zusätzlich lesen bzw. beschreiben darf. Bei Emil ist das sein Notizordner. Ohne eigenen Bedarf weglassen.
- **`sandbox`**: Shell-Befehle laufen in einer Sandbox des Betriebssystems (macOS: Seatbelt, Linux: bubblewrap). `failIfUnavailable: true` bricht ab, wenn es keine Sandbox gibt; `allowUnsandboxedCommands: false` verbietet Ausnahmen. Strenger und sicherer, aber manche Befehle (z. B. `gh` wegen des Schlüsselbunds) gehen dann nicht.
- **`sandbox.network.allowedDomains`**: Welche Hosts Shell-Befehle erreichen dürfen. Emil hat GitHub und PyPI; wer mit Node arbeitet, ergänzt z. B. `registry.npmjs.org`.
- **`autoMode`**: Zusätzliche Grenzen für den Auto-Modus (Claude arbeitet ohne Nachfrage). Nur relevant, wenn die Person den Auto-Modus nutzt.

Pro Projekt lässt sich `tdd-guard` in `.claude/tdd-guard.json` anpassen oder mit `{"enabled": false}` abschalten (siehe `tdd-guard/README.md`). Diese Datei pflegt nur der Mensch; Claude darf sie nicht ändern.

## Nur bei Emil, nicht übernehmen

- **Claude-Gehirn** (`~/Documents/Claude-Gehirn`) und Emils globale `~/.claude/CLAUDE.md`: Emils persönliches Notizsystem. Gehört nicht zum Repo. Wer so etwas will, legt eine eigene `CLAUDE.md` an.
- **Zentrale**: Emils eigenes Dashboard. `token-counter` schreibt pro Turn ein Log nach `~/.claude/token-counter/log/` (bleibt lokal auf dem Rechner); die Skripte `token-counter/scripts/runs.ts` und `tokens.ts` übertragen es in Emils Zentrale. Für die Person nicht nötig, Anzeige und `/tokens` funktionieren ohne.
- Emils Pfade, Netzwerk-Freigaben und Notizordner in den Einstellungen oben.

## Prüfen, ob alles läuft

In einer **neuen** Session:

1. `token-counter`: Das Band über dem Prompt erscheint (manchmal mit kurzer Verzögerung), `/tokens` gibt einen Bericht aus.
2. `team-delegate`: Ein Toast nennt das Modell des Umsetzers. Bei einer größeren Aufgabe gibt Claude Schritte an `team-delegate:umsetzer` ab.
3. `tdd-guard`: In einem Git-Projekt eine Quelldatei ohne geänderten Test bearbeiten lassen; die Änderung wird abgelehnt (bzw. bei `warn` nur kommentiert).
4. `skills-collection`: Die Skills `skills-collection:test-first` und `skills-collection:performance-workflow` sind gelistet.
5. Optional die Tests eines Mods laufen lassen: `claude plugin test <ordner>`.

## Abschalten

- Einzelnen Mod: `/plugin` → deaktivieren, oder in `~/.claude/settings.json` unter `enabledPlugins` auf `false` setzen.
- `tdd-guard` nur lockern: Option `mode` auf `warn` oder `off`.
- `lean-code` nur lockern: Option `level` auf `lite` oder `off`.

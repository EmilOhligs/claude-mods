# claude-mods

Meine Mods für Claude Code, gebündelt als Marketplace. Jeder Mod ist ein eigenes Plugin und kann einzeln installiert werden.

## Mods

| Mod | Was er macht |
| --- | --- |
| [token-counter](token-counter/) | Token-Verbrauch live in der Statuszeile, plus `/tokens` |
| [team-delegate](team-delegate/) | Planer/Umsetzer: der Chat plant, ein günstigeres Modell setzt einzelne Schritte um |

## Installation

Im Terminal-Prompt von Claude Code:

    /plugin install token-counter --marketplace EmilOhligs/claude-mods

Aus der Shell:

    claude plugin install token-counter --marketplace EmilOhligs/claude-mods

In der Desktop-App: **+** neben dem Prompt, dann Plugins, Add marketplace mit `EmilOhligs/claude-mods`, dann Add plugin.

Bei einem privaten Repo muss auf dem Rechner ein git-Zugang für github.com eingerichtet sein (SSH-Key oder `gh auth login` und `gh auth setup-git`).

## Neuen Mod hinzufügen

1. Ordner `<mod-name>/` mit `.claude-plugin/plugin.json` und `hooks/` anlegen.
2. Eintrag in `.claude-plugin/marketplace.json` ergänzen: `{ "name": "<mod-name>", "source": "./<mod-name>" }`.
3. In der Tabelle oben eintragen.

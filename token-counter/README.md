# token-counter (Claude Code Mod)

Angelegt am 2026-10-18 im Projekt „Computational Physics“.

## Was er macht
- Statuszeile: `tokens ↑<Input inkl. Cache> ↓<Output> · ctx <Kontext-%>`, aktualisiert nach jedem Turn (Subagents mitgezählt).
- `/tokens`: Aufschlüsselung nach Turns, Input, Cache read/write, Output, Kontext.
- Summen liegen in `$.state` (Session) und überleben Hot-Reloads.

## Dateien
- `hooks/register.ts` – Logik (Hooks `session.start`, `turn.complete`, `session.measure`, `command.run`)
- `types/index.d.ts` – State-Vertrag (`Totals`)
- `hooks/register.test.ts` – Tests (`claude plugin test <ordner>`)
- `.claude-plugin/plugin.json`, `hooks/hooks.json` – Manifest

## Installation
Siehe die README im Repo-Root (`/plugin install token-counter --marketplace EmilOhligs/claude-mods`).
Lokal testen: `claude --plugin-dir <pfad>/token-counter`.

## Offen
- `claude plugin validate` / `claude plugin test` noch nicht gelaufen (kein lauffähiges CLI auf dem Mac); `tsc`-Typprüfung ist sauber.

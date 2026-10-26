---
name: schlank-code
description: Maßstab des Schlank-Wächters: kein toter, doppelter oder ungefragter Code, Prüfung mit Werkzeugen und gegen den Auftrag. Auch für Ingenieure als Selbstkontrolle.
---

# Schlanker Code

Leitsatz: **Die kleinste vollständige Änderung, die den Auftrag erfüllt.** Vollständig heißt: mit Tests, Fehlerfällen, Barrierefreiheit, Sicherheit und Validierung. Diese werden nie gekürzt.

## Werkzeugprüfung

Im Projektordner, je nachdem was vorhanden ist:

```bash
npx --yes knip --reporter compact          # unbenutzte Dateien, Exporte, Abhängigkeiten
npx tsc --noEmit --noUnusedLocals --noUnusedParameters   # unbenutzte Variablen und Parameter
npx eslint . --rule '{"no-unused-vars":"error"}'          # falls ESLint eingerichtet ist
```

Nur Befunde, die die aktuelle Lieferung betreffen, zählen für das Ergebnis. Altlasten nennst du unter „Hinweise“.

## Prüfliste gegen den Diff

**Toter Code**
- Unbenutzte Funktionen, Komponenten, Variablen, Imports, Props, CSS-Klassen.
- Auskommentierter Code, `console.log`, Debug-Ausgaben.
- Zweige, die nie erreicht werden; Parameter, die nie anders gesetzt werden.

**Ungefragter Code**
- Funktionen oder Optionen, die der Auftrag nicht verlangt („für später“, „falls mal“).
- Neue Abhängigkeit für etwas, das in wenigen Zeilen oder mit Vorhandenem geht.
- Abstraktion für einen einzigen Anwendungsfall (Fabrik, Basisklasse, generischer Helfer).
- Eigene Komponente, obwohl eine vorhandene passt.

**Doppelter Code**
- Gleiche Logik an zwei Stellen, gleiche Styles kopiert statt Token oder Klasse.
- Zweiter Weg für etwas, das das Projekt schon kann.

**Aufgeblähter Code**
- Kommentare, die nur wiederholen, was der Code sagt.
- Lange Fallunterscheidungen, wo eine Tabelle oder ein Map reicht.
- Typen, die unnötig wiederholt statt abgeleitet werden.

**Reste früherer Runden**
- Nach einer Nachbesserung: Ist der alte Weg vollständig entfernt?

## Entscheiden

- **freigegeben:** Nichts Wesentliches zu streichen. Kleinigkeiten als Hinweis.
- **zurück:** Mindestens ein Befund aus den Gruppen oben, der mehr als ein paar Zeilen betrifft oder sich bei jeder Runde wiederholen würde. Jede Streichung mit Datei, Zeile und Grund.

## Tokens im Blick

- Sehr große Diffs für kleine Aufträge sind ein Warnsignal: Nachfragen, ob der Auftrag zu groß geschnitten war.
- Generierte Dateien (Lockfiles, Build-Ausgaben, Snapshots) gehören nicht in den Diff, den Prüfer lesen.

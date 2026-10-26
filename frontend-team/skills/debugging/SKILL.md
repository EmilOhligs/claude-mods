---
name: debugging
description: Vorgehen des Debuggers im Frontend-Team: alle Abläufe durchklicken, Randfälle provozieren, Fehler nachstellen und eingrenzen, ohne selbst zu reparieren.
---

# Debugging durch Durchklicken

## 1. Landkarte

- Lies Routen, Seiten und Formulare im Code und liste alle Abläufe auf (z. B. „Anmelden“, „Eintrag anlegen“, „Eintrag löschen“).
- Ergänze die Abläufe aus den Abnahmekriterien des CEO.

## 2. Jeder Ablauf, mit Playwright (Skill `browser-pruefen`)

**Glücklicher Weg:** Ablauf wie gedacht. Klappt jeder Schritt, stimmt das Ergebnis?

**Randfälle**
- Leere Eingaben, sehr lange Texte, Sonderzeichen und Umlaute, Emojis, Leerzeichen am Rand.
- Doppelklick auf Absenden, schnelles Hin und Her, Zurück-Taste des Browsers, Neuladen mittendrin.
- Langsames oder fehlendes Netz (Playwright: `page.route` mit Verzögerung oder Fehler), Server antwortet 500 oder 401.
- Leere Listen, eine Liste mit tausend Einträgen.
- Direkter Aufruf einer Unterseite per URL.

**Beobachten**
- Browser-Konsole: jeder Fehler und jede Warnung ist ein Befund (`page.on('console')`, `page.on('pageerror')`).
- Netzwerk: fehlgeschlagene Anfragen, doppelte Anfragen.
- Darstellung: Screenshot vor und nach jedem Schritt.

## 3. Befund eingrenzen

- Stelle den Fehler zweimal nach. Nur einmal aufgetreten: als „nicht sicher reproduzierbar“ kennzeichnen.
- Kleinster Weg dorthin, als nummerierte Schritte.
- Erwartet gegen tatsächlich.
- Vermutete Ursache mit Datei und Zeile, wenn du sie findest. Reparieren tust du sie nicht.
- Wenn möglich: ein kurzes Playwright-Skript in `.frontend-team/`, das den Fehler zeigt. Daraus macht der CEO den roten Test.

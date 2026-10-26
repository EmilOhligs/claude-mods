---
name: bewertung
description: Einheitliches Bewertungsformat des TÜV im Frontend-Team: Note 1 bis 10, Befunde mit Schwere, Nachweis und Vorschlag. Für jeden Prüfer im Modus Prüfung.
---

# Bewertungsformat

Antworte in der Prüfung genau in diesem Format, damit der CEO alle Berichte zusammenführen kann.

```
## <Prüfer> – Runde <n>

**Note: <1–10>/10**

Begründung in 2–3 Sätzen.

### Befunde

1. [kritisch|hoch|mittel|niedrig] <Titel>
   - Wo: <Datei:Zeile, Seite oder Ablauf>
   - Nachweis: <Schritte zum Nachstellen, Messwert oder Screenshot-Pfad>
   - Vorschlag: <was ein Ingenieur ändern soll>

### Gut gelöst

- <was beibehalten werden soll>
```

## Schwere

| Stufe | Bedeutung |
|---|---|
| kritisch | Funktion kaputt, Sicherheitslücke, Datenverlust, für manche Nutzer unbedienbar |
| hoch | Wichtiger Ablauf gestört oder klar falsch, deutlicher Verstoß gegen den Maßstab |
| mittel | Spürbare Schwäche, Umweg möglich |
| niedrig | Feinschliff |

## Note

- Die Note folgt aus den Befunden: Jeder kritische Befund deckelt bei 4, jeder hohe bei 7. Nur niedrige Befunde erlauben 9 oder 10.
- **Jeder Abzug braucht einen Befund mit Nachweis.** Ohne Befund keine Abzüge. Erfinde nichts, um eine Note zu rechtfertigen.
- 10 heißt: Du würdest nichts Wesentliches mehr ändern.
- Bewerte nur deinen Bereich. Fällt dir anderes auf, nenne es unter „Hinweis an andere Prüfer“, ohne Einfluss auf deine Note.

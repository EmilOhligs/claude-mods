---
name: ingenieur-arbeitsweise
description: Arbeitsweise der Ingenieure im Frontend-Team: einen Auftrag test-first umsetzen, nur eigene Dateien ändern, grün mit Nachweis melden.
---

# Arbeitsweise der Ingenieure

## Vor dem Start

- Lies den Auftrag ganz. Lies die genannten Dateien und die Tests, die grün werden sollen.
- Ist etwas unklar oder widerspricht der Auftrag dem Code, brich ab und melde kurz, was fehlt. Rate nicht.

## Beim Bauen

- Ändere nur die Dateien, die der Auftrag nennt. Brauchst du eine weitere Datei, melde es, statt sie still anzulegen.
- Kleinste vollständige Änderung: kein ungefragtes Refactoring, keine neuen Abhängigkeiten ohne Auftrag.
- Folge dem Stil des Projekts: Namen, Ordner, Komponentenmuster, Formatierung.
- Tests änderst du nie. Ein Test, den du für falsch hältst, ist ein Grund zum Abbruch mit Begründung.

## Grün heißt

Alle vier Punkte, mit den Befehlen des Projekts:

1. Die Tests des Auftrags sind grün, die ganze Suite ist grün.
2. Lint ohne Fehler.
3. Build ohne Fehler.
4. Die App startet, und die geänderte Stelle lässt sich aufrufen.

## Bericht an den CEO

```
Auftrag: <ein Satz>
Geändert: <Dateien>
Nachweis: Tests <x passed>, Lint ok, Build ok, App startet
Offen oder unsicher: <oder „nichts“>
```

Melde nie „fertig“ ohne diesen Nachweis. Konnte ein Punkt nicht geprüft werden, sag welcher und warum.

## Schlank-Wächter

Deine Lieferung prüft danach der Schlank-Wächter nach dem Skill `schlank-code`. Prüfe vor dem Bericht selbst: keine unbenutzten Imports, keine auskommentierten Reste, nichts Ungefragtes. Schickt er sie zurück, arbeitest du seine Streichliste ab und änderst nichts anderes.

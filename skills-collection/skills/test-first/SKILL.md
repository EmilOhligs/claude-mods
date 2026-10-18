---
name: test-first
description: Test-first-Vorgehen. Vor jeder Aufgabe, die Verhalten von Code hinzufügt oder ändert (neues Feature, Bugfix, Refactoring, Optimierung, neue Funktion in einem Notebook), wird zuerst ein Test geschrieben, der fehlschlägt, und erst danach der Code. Verwenden bei "implementiere", "baue", "füge hinzu", "fixe", "refactor", "optimiere", "schreibe eine Funktion" und überall, wo Code entsteht oder sich ändert.
---

# Test-first

Bei jeder Aufgabe, die Verhalten verändert, kommt der Test vor dem Code. Der Test legt fest, was "fertig" heißt.

## Ablauf (rot, grün, aufräumen)

1. **Aufgabe in prüfbares Verhalten übersetzen**
   - Welche Eingabe soll welche Ausgabe liefern? Welche Randfälle gibt es (leer, null, negativ, sehr groß, falscher Typ)?
   - Bei einem Bugfix: der Test reproduziert genau den Fehler.
   - Bei einer Optimierung: der Test sichert das bisherige Ergebnis ab.
   - Ist unklar, was richtig ist, vor dem Schreiben kurz beim Nutzer nachfragen.

2. **Test schreiben und laufen lassen: er muss fehlschlagen (rot)**
   - Er muss aus dem *richtigen* Grund fehlschlagen (Funktion fehlt, falsches Ergebnis), nicht wegen eines Tippfehlers im Test.
   - Besteht ein neuer Test sofort, prüft er nichts Neues: schärfer machen oder Annahme klären.

3. **Minimal implementieren (grün)**
   - Nur so viel Code, dass der Test besteht. Dann den Test laufen lassen.

4. **Aufräumen**
   - Refactoren, benennen, Duplikate entfernen. Die Tests bleiben dabei grün.

5. **Ganze Test-Suite laufen lassen**
   - Nicht nur den neuen Test, damit nichts anderes bricht.

## Regeln

- Einen Test nicht ändern, nur damit er besteht. Ist die Erwartung im Test falsch, das offen sagen und begründen, bevor sie angepasst wird.
- Ein Test prüft ein Verhalten, nicht die Implementierung. Er soll ein Refactoring überstehen.
- Kleine Tests mit sprechenden Namen (`test_fft_erhaelt_energie`), ein Grund zum Scheitern pro Test.
- Keine Zufallswerte ohne festen Seed.
- Fehlt ein Test-Setup, zuerst das Nötigste einrichten (Python: `pytest`, eine Datei `test_*.py`) und kurz sagen, was angelegt wurde.

## Wissenschaftliches Rechnen und Numerik

- Gleitkommazahlen nie mit `==` vergleichen: `np.testing.assert_allclose(actual, expected, rtol=…, atol=…)` mit begründeter Toleranz.
- Gute Referenzen: analytische Lösungen, Sonderfälle mit bekanntem Ergebnis, Erhaltungsgrößen (Energie, Norm), Symmetrien.
- FFT/DFT: Vergleich mit einer einfachen Referenz-DFT, Parseval (Energie in Zeit- und Frequenzraum gleich), Rücktransformation ergibt das Original, ein reiner Sinus erzeugt einen Peak an der erwarteten Frequenz.
- Konvergenz prüfen: Fehler sinkt mit kleinerer Schrittweite in der erwarteten Ordnung.

## Jupyter-Notebooks

- Wichtige Logik in eine Funktion (besser in eine `.py`-Datei) auslagern und dort testen.
- Direkt im Notebook: eine Zelle mit `assert`/`np.testing`-Prüfungen direkt unter der Funktion, die von oben nach unten durchläuft.

## Ausnahmen

Reine Dokumentation, Formatierung, Umbenennungen ohne Verhaltensänderung und Wegwerf-Exploration brauchen keinen vorgeschalteten Test. Kurz sagen, dass und warum darauf verzichtet wird.

## Bericht am Ende

Kurz: welcher Test zuerst geschrieben wurde, dass er rot war (mit Grund), dass er jetzt grün ist, und das Ergebnis der gesamten Suite.

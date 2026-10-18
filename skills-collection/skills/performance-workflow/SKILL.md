---
name: performance-workflow
description: Vorgehen, um Code schneller zu machen, ohne zu raten. Verwenden, wenn Code langsam ist, beschleunigt, optimiert oder profiliert werden soll, oder wenn jemand "mach das schneller", "optimize", "speed up", "Performance", "Laufzeit" oder "profiling" sagt. Erst messen, dann Algorithmus, dann Details, am Ende nachmessen und Ergebnis prüfen.
---

# Performance-Workflow

Optimiere nie nach Gefühl. Jede Änderung braucht eine Messung davor und danach.

## Ablauf

1. **Ziel und Ausgangswert festlegen**
   - Was heißt "schnell genug"? (Zielzeit, Eingabegröße, Hardware)
   - Eine feste, wiederholbare Messung bauen: gleiche Eingabe, mehrere Läufe, Median und Streuung notieren. Die erste Zahl ist der Ausgangswert.
   - Das richtige Ergebnis als Referenz sichern (Ausgabe speichern oder Test schreiben, siehe Skill `test-first`).

2. **Profilieren, bevor etwas geändert wird**
   - Python: `cProfile`/`python -m cProfile -s cumtime`, `py-spy`, `line_profiler`; Kleinteile mit `timeit`. Speicher: `tracemalloc`, `memory_profiler`.
   - Andere Sprachen: `perf`, Instruments (macOS), Flamegraph, eingebaute Profiler.
   - Den einen Hotspot benennen, der den größten Anteil der Zeit hat. Alles andere ignorieren.

3. **Zuerst Algorithmus und Datenstruktur**
   - Komplexität prüfen: O(n²) statt O(n log n)? Doppelte Arbeit in Schleifen? Etwas, das einmal vor der Schleife berechnet werden könnte?
   - Passende Struktur wählen (Set/Dict statt Liste für Suche, Heap, sortierte Daten mit Bisektion).
   - Das bringt meist Faktoren, Mikro-Optimierung nur Prozente.

4. **Dann das System um den Code herum**
   - I/O: Puffern, in Blöcken lesen, unnötige Lese- und Schreibzugriffe vermeiden.
   - Speicher: unnötige Kopien, Zwischenergebnisse, Allokationen in heißen Schleifen.
   - Caching (`functools.lru_cache`), wenn dieselben Eingaben wiederkehren.

5. **Dann Sprach- und Bibliotheksmittel**
   - Schleifen durch vektorisierte Bibliotheksaufrufe ersetzen (z. B. numpy), Standardbibliothek und eingebaute Funktionen statt Eigenbau.
   - Erst wenn das nicht reicht: Compiler-Werkzeuge (Numba, Cython), Parallelisierung, eine andere Sprache für den Kern.

6. **Mikro-Optimierungen zuletzt**, und nur im gemessenen Hotspot. Nie auf Kosten der Lesbarkeit, wenn der Gewinn unter dem Messrauschen liegt.

7. **Nachmessen und Ergebnis prüfen**
   - Dieselbe Messung wie am Anfang. Wurde es wirklich schneller, und um wie viel?
   - Ergebnis mit der Referenz vergleichen (bei Gleitkomma mit Toleranz, nicht mit `==`).
   - Tests laufen lassen.

## Regeln

- Eine Änderung nach der anderen, jeweils messen. Sonst weiß man nicht, was geholfen hat.
- Keine Optimierung ohne Profil, die den Hotspot belegt.
- Bringt eine Änderung nichts oder nur Rauschen, zurücknehmen und das ehrlich sagen.
- Lesbarkeit und Korrektheit gehen vor, solange das Ziel erreicht ist. Ist es erreicht, aufhören.
- Annahmen über Eingabegröße und Hardware nennen: was bei 1 000 Werten schnell ist, kann bei 10⁷ kippen.

## Bericht am Ende

Kurz und mit Zahlen:

| | Vorher | Nachher |
| --- | --- | --- |
| Laufzeit (Median, n Läufe) | … | … |
| Speicher (falls relevant) | … | … |

Dazu: Hotspot, was geändert wurde und warum, ob das Ergebnis identisch ist, was bewusst nicht optimiert wurde.

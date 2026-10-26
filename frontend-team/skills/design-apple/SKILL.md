---
name: design-apple
description: Gestaltungsmaßstab des Frontend-Teams nach den Prinzipien von Apples Human Interface Guidelines: Klarheit, Zurückhaltung, Tiefe, Konsistenz. Für UI-Ingenieur und Design-Prüfer.
---

# Gestalten wie Apple

Maßstab sind die Prinzipien aus Apples Human Interface Guidelines, übertragen aufs Web. Gemeint ist die Haltung, keine Kopie: keine Apple-Logos, keine Apple-Grafiken, keine Nachahmung von Apple-Produktseiten.

## Grundhaltung

- **Klarheit:** Jeder Bildschirm hat eine Hauptaufgabe. Was nicht dazu beiträgt, fliegt raus oder rückt nach hinten.
- **Zurückhaltung:** Die Oberfläche tritt hinter den Inhalt zurück. Keine Dekoration ohne Funktion, keine Effekte um ihrer selbst willen.
- **Tiefe:** Ebenen, Übergänge und Bewegung zeigen, woher etwas kommt und wohin es geht.
- **Konsistenz:** Gleiches sieht gleich aus und verhält sich gleich, im ganzen Produkt.

## Prüfliste

**Hierarchie und Layout**
- Eine klare Primäraktion pro Ansicht, visuell eindeutig. Sekundäres ist leiser.
- Großzügiger Weißraum. Abstände aus einer festen Skala (z. B. 4, 8, 12, 16, 24, 32, 48, 64 Pixel), keine krummen Einzelwerte.
- Ausrichtung an einem Raster; Elemente teilen Kanten.
- Inhalte gruppieren statt mit Linien und Kästen trennen.

**Typografie**
- Eine Schriftfamilie (Systemschrift `-apple-system, system-ui, …` oder eine ruhige Grotesk).
- Wenige Schriftgrade mit klarem Abstand (z. B. 34/28/22/17/15/13), Fließtext mindestens 16 Pixel.
- Hierarchie über Größe und Gewicht, nicht über Farbe allein. Zeilenlänge 50–75 Zeichen.

**Farbe und Material**
- Zurückhaltende Grundfarben, eine Akzentfarbe für Interaktion. Farben als Tokens, nicht verstreut im Code.
- Hell- und Dunkelmodus gleichwertig.
- Kontraste mindestens nach WCAG AA.
- Schatten und Unschärfe sparsam, um Ebenen zu zeigen.

**Bedienung**
- Klickflächen mindestens 44 × 44 Pixel.
- Jede Aktion gibt sofort Rückmeldung (Druckzustand, Laden, Erfolg).
- Zerstörerische Aktionen sind deutlich und rückgängig zu machen oder bestätigt.
- Zustände für Laden, Leer, Fehler und Erfolg sind gestaltet, nicht vergessen.

**Bewegung**
- Kurz (150–300 ms), natürlich (ease-out, Federn), mit Bedeutung.
- `prefers-reduced-motion` wird respektiert.

**Details, die den Unterschied machen**
- Gleichmäßige Eckenradien, Icons aus einem Satz mit gleicher Strichstärke.
- Keine Layoutsprünge beim Laden.
- Texte kurz und menschlich.

## Als Prüfer

Mach Screenshots in hell und dunkel, in 375 und 1440 Pixel Breite, in jedem Hauptzustand. Frage bei jedem Bildschirm: Was ist hier die Hauptaufgabe, und lenkt etwas davon ab? Belege Befunde mit Screenshot-Pfad und konkretem Vorschlag (Wert, Abstand, Komponente).

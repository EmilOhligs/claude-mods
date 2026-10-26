---
name: barrierefreiheit
description: Prüfung auf Barrierefreiheit nach WCAG 2.2 AA: automatischer Test mit axe-core plus Handprüfung per Tastatur, Kontrast und Screenreader-Semantik.
---

# Barrierefreiheit nach WCAG 2.2 AA

## 1. Automatisch

Mit Playwright und axe-core (Skill `browser-pruefen`) jede Hauptseite und jeden Hauptzustand prüfen:

```bash
npm i -D @axe-core/playwright
```

```ts
import AxeBuilder from '@axe-core/playwright'
const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()
```

Jeder Verstoß ist ein Befund. Automatische Tests finden nur etwa ein Drittel der Probleme, deshalb folgt die Handprüfung.

## 2. Von Hand

**Tastatur**
- Alles ist mit Tab, Umschalt+Tab, Enter, Leertaste und Pfeiltasten erreichbar und bedienbar.
- Reihenfolge folgt der sichtbaren Reihenfolge. Keine Tastaturfalle.
- Fokus ist immer sichtbar (mindestens 2 Pixel, ausreichender Kontrast).
- Dialoge halten den Fokus innen und geben ihn beim Schließen zurück. Escape schließt.

**Wahrnehmen**
- Textkontrast mindestens 4,5:1, großer Text und Bedienelemente 3:1.
- Information nie nur über Farbe.
- Bilder haben sinnvollen Alternativtext, Schmuckbilder `alt=""`.
- Bei 200 % Zoom und 320 Pixel Breite geht nichts verloren.

**Verstehen und Semantik**
- Echte Elemente: `button` für Aktionen, `a` für Navigation, Überschriften in Reihenfolge, Landmarken (`header`, `nav`, `main`).
- Jedes Formularfeld hat ein sichtbares Label. Fehler werden beim Feld genannt und angesagt (`aria-live` oder `aria-describedby`).
- ARIA nur, wo HTML nicht reicht, und dann korrekt.
- Sprache der Seite gesetzt (`lang="de"`).

**Bewegung**
- `prefers-reduced-motion` wird respektiert, nichts blinkt öfter als dreimal pro Sekunde.

## Befunde

Nenne bei jedem Befund das WCAG-Kriterium (z. B. „2.4.7 Fokus sichtbar“), wo es auftritt und wie man es nachstellt.

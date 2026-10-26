---
name: browser-pruefen
description: Laufende Web-App mit Playwright prüfen: App starten, Seiten aufrufen, klicken, Screenshots in mehreren Breiten, Konsole mitschneiden. Für alle TÜV-Prüfer, die die Oberfläche ansehen.
---

# Im Browser prüfen

## App erreichbar machen

- Der CEO nennt dir die Adresse der laufenden App. Fehlt sie, frag zurück, statt selbst einen Server zu starten.
- Prüfe kurz, ob sie antwortet: `curl -s -o /dev/null -w "%{http_code}" <adresse>`.

## Playwright

Einmal pro Projekt, falls nicht vorhanden:

```bash
npm i -D @playwright/test
npx playwright install chromium
```

Prüfskripte nur in `.frontend-team/`, z. B. `.frontend-team/pruefen-design.spec.ts`, ausführen mit:

```bash
npx playwright test .frontend-team/pruefen-design.spec.ts --reporter=line
```

Grundgerüst:

```ts
import { test } from '@playwright/test'

const BASE = process.env.APP_URL ?? 'http://localhost:5173'
const WIDTHS = [375, 768, 1440]

for (const width of WIDTHS) {
  test(`Startseite ${width}px`, async ({ page }) => {
    const errors: string[] = []
    page.on('console', (m) => m.type() === 'error' && errors.push(m.text()))
    page.on('pageerror', (e) => errors.push(e.message))
    await page.setViewportSize({ width, height: 900 })
    await page.goto(BASE)
    await page.screenshot({ path: `.frontend-team/shots/start-${width}.png`, fullPage: true })
    if (errors.length) console.log('Konsolenfehler:', errors)
  })
}
```

## Hinweise

- Dunkelmodus: `test.use({ colorScheme: 'dark' })`.
- Langsames Netz oder Fehler: `page.route('**/api/**', (r) => r.fulfill({ status: 500 }))`.
- Screenshots kannst du mit dem Read-Werkzeug ansehen. Schau sie dir an, bevor du über Design urteilst.
- Nenne in jedem Befund den Pfad zum Screenshot.

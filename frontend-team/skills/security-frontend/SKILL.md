---
name: security-frontend
description: Sicherheitsprüfung für Frontends nach OWASP: Injection und XSS, Geheimnisse, Anmeldung und Sitzung, Abhängigkeiten, Header. Für Security-Prüfer und Anbindungs-Ingenieur.
---

# Sicherheit im Frontend

Grundsatz: **Das Frontend ist nicht vertrauenswürdig.** Alles, was im Browser läuft, kann ein Angreifer lesen und ändern. Prüfungen im Frontend dienen der Bedienung, die echte Prüfung macht das Backend.

## Prüfliste

**Injection und XSS**
- Kein `dangerouslySetInnerHTML`, `innerHTML`, `v-html`, `eval`, `new Function` mit Nutzerdaten. Wenn unvermeidbar: bereinigt (z. B. DOMPurify).
- Links aus Nutzerdaten: nur `http(s):`, kein `javascript:`. Externe Links mit `rel="noopener noreferrer"`.
- Keine Nutzerdaten ungeprüft in URLs, Stilen oder Weiterleitungen.

**Geheimnisse**
- Keine API-Schlüssel, Tokens oder Passwörter im Code, in `.env`-Dateien im Repository oder im Build. Alles mit `VITE_`, `NEXT_PUBLIC_` o. Ä. ist öffentlich.
- Suche: `grep -rniE "api[_-]?key|secret|token|password|bearer" src` und im Build-Ordner.

**Anmeldung und Sitzung**
- Sitzungstokens möglichst in `HttpOnly`-, `Secure`-, `SameSite`-Cookies, nicht in `localStorage`.
- Abmelden löscht alles Lokale. Berechtigungen werden nicht nur durch Ausblenden von Knöpfen umgesetzt.
- Formulare mit Zustandsänderung sind gegen CSRF geschützt (Cookie-Attribut oder Token).

**Daten und Fehler**
- Keine sensiblen Daten in URLs, Logs, `console` oder Fehlermeldungen.
- Fehlermeldungen verraten keine Interna (Stacktraces, Pfade, SQL).

**Abhängigkeiten**
- `npm audit --omit=dev`: kritische und hohe Lücken sind Befunde.
- Keine verlassenen oder unbekannten Pakete für Kleinigkeiten.

**Auslieferung**
- Content-Security-Policy ohne `unsafe-inline` und `unsafe-eval`, wo machbar.
- Nur HTTPS, keine gemischten Inhalte. Skripte von Fremd-CDNs mit Integritätsprüfung (SRI) oder selbst ausgeliefert.

## Befunde

Nenne die OWASP-Kategorie, Datei und Zeile und wie man die Lücke ausnutzen könnte, in einem Satz. Gefundene Geheimnisse nie im Klartext wiedergeben.

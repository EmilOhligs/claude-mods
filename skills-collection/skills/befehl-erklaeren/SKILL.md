---
name: befehl-erklaeren
description: Shell-Befehle erklären. Immer verwenden, sobald du dem Nutzer einen Terminal-Befehl zum Ausführen vorschlägst (jeder bash-Block in einer Antwort), und wenn der Nutzer fragt "was macht dieser Befehl", "erklär mir das", "sag mir genau, was das tut", "ist das sicher" oder einen Befehl einfügt und nachfragt.
---

# Befehl erklären

Ziel: Der Nutzer versteht, was ein Befehl tut, bevor er ihn ausführt, und kann selbst entscheiden.

## Zwei Formen

- **Kurzform, bei jedem Befehl, den du vorschlägst:** direkt unter dem Befehlsblock ein bis drei Sätze: was er tut, ob er etwas ändert, und was auffällt (`sudo`, Löschen, Netzwerk, nur dieses Fenster oder dauerhaft). Bei einfachen Befehlen wie `cd` oder `ls` reicht ein halber Satz.
- **Langform, wenn der Nutzer nachfragt** oder der Befehl riskant ist (`sudo`, Löschen, Systemeinstellungen): Aufbau wie unten.

## Aufbau der Langform

1. **Ein Satz vorweg:** was der Befehl als Ganzes tut.
2. **Teile der Reihe nach,** nummeriert, je ein Teil pro Punkt:
   - Verkettungen (`;`, `&&`, `||`, `|`, `{ …; }`) zuerst auflösen: Was läuft nacheinander, was hängt voneinander ab, was geht an den nächsten Befehl weiter?
   - Je Teil: das Programm, jede Option (`-r`, `--keep-data`) in Klartext, jedes Argument (Pfad, Muster).
   - Shell-Zeichen erklären, sobald sie vorkommen: `~`, `*`, Anführungszeichen, `\ ` vor Leerzeichen, `2>/dev/null`, `>`, `>>`, `$(…)`, `$VAR`.
3. **Was sich ändert:** genau einer dieser Sätze, mit Begründung:
   - „Der Befehl ändert nichts, er liest nur.“
   - „Der Befehl ändert …“ (welche Dateien, Einstellungen, Pakete), und ob sich das rückgängig machen lässt und wie.
4. **Worauf achten,** nur was zutrifft:
   - `sudo` oder Passwortabfrage: wirkt auf das ganze System.
   - Löschen oder Überschreiben (`rm`, `>`, `mv`, `--force`): was verloren geht.
   - Netzwerk (`curl`, `git push`, Installationen): wohin etwas geschickt oder woher etwas geladen wird.
   - Dauer: Befehle, die viele Dateien durchsuchen, können lange laufen.
   - Gilt nur für dieses Terminalfenster (z. B. `ulimit`, `export`) oder dauerhaft bzw. bis zum Neustart (z. B. `launchctl`).

## Regeln

- Erkläre, was dasteht, nicht was der Befehl vermutlich soll. Unklare Teile so benennen.
- Rate keine Option: Bist du dir bei einer Option nicht sicher, sag das und nenne `man <programm>` oder `<programm> --help` zum Nachsehen.
- Ist ein Teil riskanter als nötig, nenne die harmlosere Variante (z. B. erst ohne `-delete` ansehen, was gefunden wird).
- Führe den Befehl zum Erklären nicht aus.
- Kurz bleiben: kein Abschnitt für etwas, das nicht vorkommt.

## Beispiel

`{ find ~ -iname "*qwen*" 2>/dev/null; grep -ril "qwen" ~/.claude 2>/dev/null | head -30; }`

> Der Befehl macht zwei Suchen hintereinander und zeigt beide Ergebnisse an.
>
> 1. `find ~ -iname "*qwen*" 2>/dev/null` durchsucht dein Home-Verzeichnis (`~`) mit allen Unterordnern nach Dateien und Ordnern, deren Name „qwen“ enthält, ohne auf Groß- und Kleinschreibung zu achten (`-iname`). `2>/dev/null` blendet Fehlermeldungen zu Ordnern aus, die du nicht lesen darfst.
> 2. `grep -ril "qwen" ~/.claude` sucht in allen Dateien unter `~/.claude` (`-r`) nach dem Wort „qwen“, ohne Groß- und Kleinschreibung (`-i`), und gibt nur die Dateinamen aus (`-l`). `| head -30` zeigt höchstens die ersten 30.
>
> Der Befehl ändert nichts, er liest nur. Die erste Suche kann bei vielen Dateien eine Weile dauern.

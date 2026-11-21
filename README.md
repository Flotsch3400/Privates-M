# Vermögen

Persönlicher Vermögens-Tracker: Konten erfassen, zu beliebigen Stichtagen bewerten,
Verlauf und Aufteilung sehen. Wertpapiere und Kryptowährungen werden mit Stückzahl
erfasst und automatisch mit aktuellen Kursen bewertet (Yahoo Finance, CoinGecko).

## Im Browser öffnen
Über GitHub Pages: **https://flotsch3400.github.io/Privates-M/**

Beim ersten Öffnen auf **Daten importieren** klicken und die eigene `data.json`
(oder ein Backup) auswählen.

## Wo liegen die Daten?
Nur im Browser auf dem jeweiligen Gerät (localStorage). Nichts davon landet in diesem
Repository – `data.json` und `backups/` sind per `.gitignore` ausgeschlossen.
Unter **Daten → Backup herunterladen** regelmäßig sichern.

## Optional: lokal mit eigenem Server
`python3 server.py` (oder `Start-Windows.bat` / `Start-Mac.command`) startet die App auf
http://localhost:8765 und speichert die Daten in `data.json` im Ordner, mit täglicher
Sicherung unter `backups/`.

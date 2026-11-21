# Vermögen

Persönlicher Vermögens-Tracker im Browser: **https://flotsch3400.github.io/Privates-M/**

- **Übersicht:** Nettovermögen, Allzeithoch, Zeitraumvergleich, Aufteilung nach Kategorie und Anbieter, Vermögensstruktur
- **Bewertung:** zu jedem Stichtag alle Konten erfassen, vorausgefüllt mit dem letzten Stand
- **Depot & Live:** Aktien, ETFs, Fonds (Yahoo Finance), Krypto (CoinGecko), Edelmetalle und Wallets (Bitcoin, Ethereum, Solana, Algorand per öffentlicher Adresse) mit Live-Kursen; Bestandslisten aus dem Onlinebanking per Kopieren und Einfügen übernehmen
- **Ziele & Planung:** Soll-/Ist-Aufteilung, Meilensteine, Prognose, Budget, echte Rendite (XIRR)

## Datenschutz
Deine Daten liegen nur im Browser des jeweiligen Geräts (localStorage). Dieses Repository enthält nur den
Programmcode; `.gitignore` schließt Daten-, Backup- und Excel-Dateien aus. Unter **Daten → Backup herunterladen** sichern.

## Optional: lokal mit eigenem Server
`python3 server.py` (oder `Start-Windows.bat` / `Start-Mac.command`) startet die App auf http://localhost:8765
und speichert die Daten in `data.json` mit täglicher Sicherung unter `backups/`.

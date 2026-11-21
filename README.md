<p><img src="branding/tracky-logo-light.svg" alt="Tracky" height="48"></p>

**Dein Vermögen. Immer im Blick.**

Tracky ist ein persönlicher Vermögens-Tracker im Browser: **https://flotsch3400.github.io/Privates-M/**

- **Lieferando:** Gruppenbestellungen mit Liefergebühr-Aufteilung, Teams-Texte zum Kopieren, offene Zahlungen abhaken, teilbare Statistik
- **Einkommen:** Gehalt, Lieferando-Gruppenbestellungen mit Gewinnrechnung, Cashback, Willhaben-Deals und Zinsen je Monat
- **Aktien & ETFs, Krypto:** eigene Übersicht je Anlageklasse mit Entwicklung, Aufteilung nach Konto und Live-Positionen
- **Übersicht:** Nettovermögen, Allzeithoch, KPI-Karten, Entwicklung, Aufteilung als Donut, Zeitraumvergleich, Vermögensstruktur, Anbieter
- **Neue Bewertung:** zu jedem Stichtag alle Konten erfassen, vorausgefüllt mit dem letzten Stand
- **Depot & Kurse:** Aktien, ETFs, Fonds (Yahoo Finance), Krypto (CoinGecko, DexScreener), Edelmetalle und Wallets (Bitcoin, Ethereum, Solana, Algorand) mit Live-Kursen; Bestandslisten per Einfügen übernehmen
- **Ziele & Planung:** Soll-/Ist-Aufteilung, Meilensteine, Prognose, Budget, echte Rendite (XIRR)
- Hell- und Dunkelmodus, für Desktop, Tablet und Smartphone
- Als App installierbar (Startbildschirm, Vollbild, startet auch offline), angepasst an iPhone (Safe Areas, Bottom Sheets)
- Sync zwischen Geräten: Ende-zu-Ende-verschlüsselt (AES-256-GCM, Schlüssel aus deinem Passwort) in einem privaten Gist deines GitHub-Kontos

## Marke

Alle Logos liegen als SVG in [`branding/`](branding/):

| Datei | Verwendung |
|---|---|
| `tracky-logo-light.svg` | Logo mit Schriftzug für helle Hintergründe |
| `tracky-logo-dark.svg` | Logo mit Schriftzug für dunkle Hintergründe |
| `tracky-logo-mono.svg` | einfarbig, übernimmt die Textfarbe (`currentColor`) |
| `tracky-icon.svg` | App-Icon (dunkel) |
| `tracky-icon-light.svg`, `tracky-icon-emerald.svg`, `tracky-icon-mono.svg` | Icon-Varianten |
| `favicon.svg`, `apple-touch-icon.png` | Browser- und Homescreen-Icon |

Der Schriftzug ist in Pfade umgewandelt (Inter Display Bold, SIL Open Font License) und braucht keine installierte Schrift.

**Farben:** Primary Dark `#0B0F1A`, Emerald `#10B981`, Emerald Light `#34D399`, Muted `#64748B`, Light Background `#F4F6FA`.
Kategorien: Konten & Tagesgeld Blau, Aktien & ETFs Orange, Edelmetalle Grün, Krypto Gelb, Guthaben Violett, Bargeld Cyan, Sachwerte Pink, Kreditkarten & Kredite Rot.
Icons: [Lucide](https://lucide.dev) (ISC-Lizenz), eingebettet als SVG.

## Datenschutz
Deine Daten liegen nur im Browser des jeweiligen Geräts (localStorage). Dieses Repository enthält nur den
Programmcode; `.gitignore` schließt Daten-, Backup- und Excel-Dateien aus. Unter **Daten & Einstellungen → Backup herunterladen** sichern.

## Optional: lokal mit eigenem Server
`python3 server.py` (oder `Start-Windows.bat` / `Start-Mac.command`) startet Tracky auf http://localhost:8765
und speichert die Daten in `data.json` mit täglicher Sicherung unter `backups/`.

# Tracky – Dein Vermögen. Immer im Blick.

## Starten
- **Windows:** Doppelklick auf `Start-Windows.bat`
- **Mac:** Doppelklick auf `Start-Mac.command` (beim ersten Mal: Rechtsklick → Öffnen)

Der Browser öffnet sich automatisch unter http://localhost:8765.
Das schwarze Fenster offen lassen, solange du die App nutzt.
Voraussetzung: Python 3 (kostenlos, https://www.python.org/downloads/).

## So funktioniert es
- **Übersicht:** Nettovermögen am letzten Stichtag, Veränderungen, Verlauf, Aufteilung.
- **Neue Bewertung:** Alle Konten sind mit den letzten Werten vorausgefüllt. Du änderst nur,
  was sich bewegt hat, und speicherst. Eingaben wie `629*4,69` werden ausgerechnet.
- **Live-Kurse:** Bei *Konten* ein Konto auf „Wertpapier“ oder „Krypto“ stellen, Symbol suchen
  (Name, Ticker oder ISIN) und Stückzahl eintragen. Der Wert wird dann automatisch mit dem
  aktuellen Kurs berechnet (onvista bzw. CoinGecko, in Euro).
- **Verlauf:** Tabelle aller Stichtage wie in der Excel, aufklappbar bis aufs einzelne Konto,
  CSV-Export für Excel.

## Daten
Alle Daten liegen nur auf deinem Computer in `data.json`. Der Server legt täglich eine Sicherung
in `backups/` an. Unter *Daten* kannst du zusätzlich ein Backup herunterladen.

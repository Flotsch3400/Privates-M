#!/bin/bash
cd "$(dirname "$0")"
if command -v python3 >/dev/null 2>&1; then
  python3 server.py
else
  echo "Python 3 wurde nicht gefunden. Bitte von https://www.python.org/downloads/ installieren."
  read -n 1 -s -r -p "Taste drücken zum Schließen"
fi

@echo off
cd /d "%~dp0"
where py >nul 2>nul && (py -3 server.py & goto :eof)
where python >nul 2>nul && (python server.py & goto :eof)
echo Python 3 wurde nicht gefunden.
echo Bitte von https://www.python.org/downloads/ installieren
echo (beim Installieren "Add python.exe to PATH" anhaken) und danach erneut starten.
pause

@echo off
rem Dois cliques abrem o site pronto (a pasta site) no navegador. Feche a janela para desligar.
rem Roda ferramentas\abrir_site.py: basta ter o Python, sem Flask e sem MySQL.
cd /d "%~dp0"
python ferramentas\abrir_site.py
if errorlevel 9009 py ferramentas\abrir_site.py
pause

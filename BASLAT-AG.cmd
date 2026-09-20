@echo off
REM Ağdaki diğer kullanıcılar için başlatır (0.0.0.0)
set HOST=0.0.0.0
set PORT=3228
echo eFootball v228 Web - Ag modunda baslatiliyor...
echo Yerel: http://localhost:3228
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4 Address"') do echo Ag: http://%%a:3228
echo.
echo Firewall izin istegi gelirse "Izin Ver" deyin. Kapatmak icin Ctrl+C
node server/index.mjs --production
pause

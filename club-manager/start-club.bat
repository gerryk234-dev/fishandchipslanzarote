@echo off
REM One Life Club Manager — arranque en el PC del club (Windows)
REM Requisito: Node.js instalado desde https://nodejs.org (version LTS)
cd /d "%~dp0"
echo === Instalando dependencias (solo tarda la primera vez)...
cd client
call npm install --no-audit --no-fund || goto :error
call npm run build || goto :error
cd ..\server
call npm install --no-audit --no-fund || goto :error
echo.
echo === Arrancando One Life Club Manager...
echo     En este PC:            http://localhost:4000
echo     Desde moviles (wifi):  http://IP-DE-ESTE-PC:4000   (ver ipconfig)
echo     Para parar: cierra esta ventana
echo.
start http://localhost:4000
call npm start
goto :eof
:error
echo.
echo Ha fallado la instalacion. ¿Esta Node.js instalado? https://nodejs.org
pause

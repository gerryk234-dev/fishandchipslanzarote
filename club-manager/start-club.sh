#!/usr/bin/env bash
# One Life Club Manager — arranque en el PC del club (Mac/Linux)
# Requisito: Node.js LTS instalado (https://nodejs.org)
set -e
cd "$(dirname "$0")"
echo "=== Instalando dependencias (solo tarda la primera vez)..."
(cd client && npm install --no-audit --no-fund && npm run build)
(cd server && npm install --no-audit --no-fund)
echo
echo "=== Arrancando One Life Club Manager..."
echo "    En este PC:            http://localhost:4000"
echo "    Desde móviles (wifi):  http://$(hostname -I 2>/dev/null | awk '{print $1}' || echo IP-DE-ESTE-PC):4000"
echo "    Para parar: Ctrl+C"
echo
cd server && npm start

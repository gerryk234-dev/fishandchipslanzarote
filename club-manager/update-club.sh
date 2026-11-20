#!/bin/bash
# ============================================================
#  One Life Lanzarote — Club Manager auto-update
#  Runs from a cPanel Cron Job. Pulls the latest app from
#  GitHub and restarts it, only when there is something new.
#  It never touches your database, .env, or .htaccess.
# ============================================================
APP="$HOME/clubmanager"
REPO="gerryk234-dev/fishandchipslanzarote"
BRANCH="deploy"
LOG="$HOME/club-update.log"

log() { echo "$(date '+%F %T') $1" >> "$LOG"; }

# 1) Is there a newer version? (tiny check, no big download)
REMOTE=$(curl -fsSL "https://raw.githubusercontent.com/$REPO/$BRANCH/VERSION" 2>/dev/null)
[ -z "$REMOTE" ] && exit 0
LOCAL=$(cat "$APP/VERSION" 2>/dev/null)
[ "$REMOTE" = "$LOCAL" ] && exit 0

log "new version $REMOTE (had ${LOCAL:-none}) — updating"

# 2) Download and unpack the latest app
TMP=$(mktemp -d)
if ! curl -fsSL "https://codeload.github.com/$REPO/tar.gz/refs/heads/$BRANCH" -o "$TMP/app.tgz"; then
  log "download failed"; rm -rf "$TMP"; exit 1
fi
if ! tar -xzf "$TMP/app.tgz" -C "$TMP"; then
  log "extract failed"; rm -rf "$TMP"; exit 1
fi
SRC=$(find "$TMP" -maxdepth 1 -type d -name "fishandchipslanzarote-*" | head -1)
if [ -z "$SRC" ] || [ ! -f "$SRC/server/src/index.js" ]; then
  log "bad package"; rm -rf "$TMP"; exit 1
fi

# 3) Apply the code only (leaves data/, .env, .htaccess, node_modules alone)
cp -rf "$SRC/server/src/."     "$APP/server/src/"
cp -rf "$SRC/server/public/."  "$APP/server/public/"
cp -rf "$SRC/server/scripts/." "$APP/server/scripts/"
cp -f  "$SRC/package.json"     "$APP/package.json"
rm -rf "$APP/client/dist" && cp -rf "$SRC/client/dist" "$APP/client/dist"
cp -f  "$SRC/VERSION"          "$APP/VERSION"

# 4) Restart the Node app (Passenger picks this up)
mkdir -p "$APP/tmp" && touch "$APP/tmp/restart.txt"

rm -rf "$TMP"
log "updated to $REMOTE and restarted"

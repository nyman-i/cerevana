#!/usr/bin/env bash
# Installs a desktop launcher that serves the app locally and opens it in its own window.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
PORT=8017 # ponytail: uncommon fixed port; if something else owns it, edit here
BROWSER="$(command -v google-chrome || command -v chromium || command -v chromium-browser)"
[ -n "$BROWSER" ] || { echo "No Chrome/Chromium found."; exit 1; }

mkdir -p ~/.local/share/applications
rm -f ~/.local/share/applications/syllogimous.desktop
cat > ~/.local/share/applications/cerevana.desktop <<EOF
[Desktop Entry]
Type=Application
Name=Cerevana
Comment=Cognitive training: RRT and Dual N-Back
Icon=$DIR/icons/icon-512x512.png
Exec=bash -c "cd '$DIR' && (python3 -m http.server $PORT >/dev/null 2>&1 &) ; sleep 0.5 ; exec '$BROWSER' --app=http://localhost:$PORT --class=Cerevana --user-data-dir=$HOME/.config/cerevana-app"
StartupWMClass=Cerevana
Categories=Education;
EOF
update-desktop-database ~/.local/share/applications 2>/dev/null || true
echo "Installed. Search for 'Cerevana' in your application launcher."

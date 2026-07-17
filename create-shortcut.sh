#!/usr/bin/env bash
# Installs a desktop launcher that serves the app locally and opens it in its own window.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"
# pasted into a terminal or run from the wrong place, $DIR isn't the app — refuse
[ -f "$DIR/index.html" ] && [ -f "$DIR/img/icon-512.png" ] || {
    echo "Error: $DIR is not the Cerevana folder. Run: bash /path/to/Syllogimous-v3/create-shortcut.sh"; exit 1; }
PORT=8017 # ponytail: uncommon fixed port; if something else owns it, edit here
BROWSER="$(command -v google-chrome || command -v chromium || command -v chromium-browser)"
[ -n "$BROWSER" ] || { echo "No Chrome/Chromium found."; exit 1; }

mkdir -p ~/.local/share/applications
rm -f ~/.local/share/applications/syllogimous.desktop

# install the icon into the user icon theme — desktop shells cache raw Icon= paths
# forever, a themed icon is the invalidation mechanism that actually works
mkdir -p ~/.local/share/icons/hicolor/512x512/apps
cp "$DIR/img/icon-512.png" ~/.local/share/icons/hicolor/512x512/apps/cerevana.png
gtk-update-icon-cache -f -t ~/.local/share/icons/hicolor 2>/dev/null || true
cat > ~/.local/share/applications/cerevana.desktop <<EOF
[Desktop Entry]
Type=Application
Name=Cerevana
Comment=Cognitive training: RRT and Dual N-Back
Icon=cerevana
Exec=bash -c "cd '$DIR' && (python3 -m http.server $PORT >/dev/null 2>&1 &) ; sleep 0.5 ; exec '$BROWSER' --app=http://localhost:$PORT --class=Cerevana --user-data-dir=$HOME/.config/cerevana-app"
StartupWMClass=Cerevana
Categories=Education;
EOF
update-desktop-database ~/.local/share/applications 2>/dev/null || true
echo "Installed. Search for 'Cerevana' in your application launcher."

#!/usr/bin/env bash
# Installs a desktop launcher that serves the app locally and opens it in its own window.
# Linux only - the .desktop entry, ~/.local/share paths and icon-theme install below
# are Linux desktop conventions with no macOS/Windows equivalent.
set -e

[ "$(uname)" = "Linux" ] || { echo "Error: this installer is Linux-only (detected: $(uname))."; exit 1; }

BROWSER_CHOICE=chrome
for arg in "$@"; do
    case "$arg" in
        --browser=*) BROWSER_CHOICE="${arg#--browser=}" ;;
    esac
done
case "$BROWSER_CHOICE" in
    chrome|firefox) ;;
    *) echo "Error: --browser must be chrome or firefox (got: $BROWSER_CHOICE)"; exit 1 ;;
esac

DIR="$(cd "$(dirname "$0")" && pwd)"
if ! { [ -f "$DIR/index.html" ] && [ -f "$DIR/img/icon-512.png" ]; }; then
    # not run from inside a checkout (e.g. piped via curl | bash) - fetch our own copy
    command -v git >/dev/null || { echo "Error: git is required to install Cerevana this way. Install git and try again."; exit 1; }
    APP_DIR="$HOME/.local/share/cerevana-app"
    if [ -d "$APP_DIR/.git" ]; then
        git -C "$APP_DIR" pull --ff-only || true
    else
        git clone --depth 1 https://github.com/nyman-i/cerevana.git "$APP_DIR"
    fi
    DIR="$APP_DIR"
fi

PORT=8017 # ponytail: uncommon fixed port; if something else owns it, edit here

case "$BROWSER_CHOICE" in
    chrome)
        BROWSER="$(command -v google-chrome || command -v chromium || command -v chromium-browser)"
        [ -n "$BROWSER" ] || { echo "No Chrome/Chromium found."; exit 1; }
        LAUNCH="'$BROWSER' --app=http://localhost:$PORT --class=Cerevana --no-first-run --user-data-dir=$HOME/.config/cerevana-app"
        ;;
    firefox)
        BROWSER="$(command -v firefox)"
        [ -n "$BROWSER" ] || { echo "No Firefox found."; exit 1; }
        # Firefox dropped its chromeless --ssb app mode in v86; this opens a normal
        # windowed Firefox (address bar/tabs visible), in its own isolated profile.
        LAUNCH="'$BROWSER' --no-remote --new-instance --profile $HOME/.mozilla/cerevana-app http://localhost:$PORT"
        ;;
esac

mkdir -p ~/.local/share/applications
rm -f ~/.local/share/applications/syllogimous.desktop

# install the icon into the user icon theme - desktop shells cache raw Icon= paths
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
Exec=bash -c "cd '$DIR' && (python3 -m http.server $PORT >/dev/null 2>&1 &) ; sleep 0.5 ; exec $LAUNCH"
StartupWMClass=Cerevana
Categories=Education;
EOF
update-desktop-database ~/.local/share/applications 2>/dev/null || true
echo "Installed. Search for 'Cerevana' in your application launcher."

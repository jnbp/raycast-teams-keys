#!/bin/bash
# Microsoft Teams Keys – installer and updater for the Raycast extension
# https://github.com/jnbp/raycast-teams-keys
#
# Double-click this file, or run it in Terminal:
#   bash ~/Downloads/install-teams-keys.command
#
# Every run downloads the latest release, so the same file installs and updates.
# A folder named "teams-keys" next to this file is installed instead, without downloading.
set -euo pipefail

REPO="jnbp/raycast-teams-keys"
NAME="teams-keys"
TITLE="Microsoft Teams Keys"
TARGET_DIR="${RAYCAST_EXT_DIR:-$HOME/Developer/raycast}/$NAME"

bold() { printf "\n\033[1m%s\033[0m\n" "$1"; }
info() { printf "  %s\n" "$1"; }
pause_exit() { echo; read -r -p "Press Enter to close…" _ </dev/tty || true; exit "${1:-0}"; }
fail() { printf "\n\033[31mError: %s\033[0m\n" "$1"; pause_exit 1; }

printf "\033[1m%s – Raycast extension installer\033[0m\n" "$TITLE"

[[ "$(uname)" == "Darwin" ]] || fail "This installer runs on macOS only."

# ---------------------------------------------------------------- 1. Raycast
bold "1/5  Checking Raycast"
if [[ -d "/Applications/Raycast.app" || -d "$HOME/Applications/Raycast.app" ]]; then
  info "Raycast found."
else
  fail "Raycast is not installed. Get it from https://raycast.com and run this installer again."
fi

# ---------------------------------------------------------------- 2. Node.js
bold "2/5  Checking Node.js"
# A double-clicked .command does not load your shell profile, so add the usual locations.
export PATH="/opt/homebrew/bin:/usr/local/bin:$HOME/.volta/bin:$PATH"
if [[ -s "$HOME/.nvm/nvm.sh" ]]; then source "$HOME/.nvm/nvm.sh" >/dev/null 2>&1 || true; fi
if command -v fnm >/dev/null 2>&1; then eval "$(fnm env)" >/dev/null 2>&1 || true; fi

if ! command -v node >/dev/null 2>&1; then
  if command -v brew >/dev/null 2>&1; then
    info "Node.js is missing – installing it with Homebrew…"
    brew install node
  else
    open "https://nodejs.org/en/download" 2>/dev/null || true
    fail "Node.js is missing. Install Node 22 (LTS) from nodejs.org, then run this installer again."
  fi
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
(( NODE_MAJOR >= 22 )) || fail "Node $(node -v) is too old. Raycast extensions need Node 22 or newer."
info "Node $(node -v)"

# ---------------------------------------------------------------- 3. Download
TMP="$(mktemp -d)"
DEV_PID=""
cleanup() { [[ -n "$DEV_PID" ]] && kill "$DEV_PID" 2>/dev/null || true; rm -rf "$TMP"; }
trap cleanup EXIT

# A copy of the extension next to this file (a folder named like the extension)
# is installed as it is, without downloading anything.
LOCAL_SRC="$(cd "$(dirname "$0")" && pwd)/$NAME"
if [[ -f "$LOCAL_SRC/package.json" ]]; then
  bold "3/5  Using the copy next to this installer"
  VERSION="local-$(tr -d ' \r\n' < "$LOCAL_SRC/.release" 2>/dev/null || echo dev)"
  mkdir "$TMP/src"
  (cd "$LOCAL_SRC" && tar --exclude node_modules --exclude dist --exclude build -cf - .) | tar -xf - -C "$TMP/src"
  info "Installing $VERSION from $LOCAL_SRC"
else
  bold "3/5  Downloading the latest release"
  LATEST_URL="$(curl -fsSL -o /dev/null -w '%{url_effective}' "https://github.com/$REPO/releases/latest" || true)"
  VERSION="${LATEST_URL##*/tag/}"
  if [[ -z "$LATEST_URL" || "$VERSION" == "$LATEST_URL" ]]; then
    VERSION="main"
    ARCHIVE_URL="https://codeload.github.com/$REPO/tar.gz/refs/heads/main"
    info "No release published yet – using the main branch."
  else
    ARCHIVE_URL="https://codeload.github.com/$REPO/tar.gz/refs/tags/$VERSION"
  fi

  INSTALLED="$(cat "$TARGET_DIR/.installed-version" 2>/dev/null || true)"
  if [[ -z "$INSTALLED" ]]; then
    info "Installing $VERSION"
  elif [[ "$INSTALLED" == "$VERSION" ]]; then
    info "$VERSION is already installed – reinstalling it."
  else
    info "Updating $INSTALLED → $VERSION"
  fi

  curl -fsSL "$ARCHIVE_URL" -o "$TMP/source.tar.gz" || fail "Download failed. Check your internet connection."
  mkdir "$TMP/src"
  tar -xzf "$TMP/source.tar.gz" -C "$TMP/src" --strip-components 1
fi
[[ -f "$TMP/src/package.json" ]] || fail "No extension found to install."

# Keep exactly one previous version next to the new one.
mkdir -p "$(dirname "$TARGET_DIR")"
rm -rf "$TARGET_DIR.previous"
[[ -d "$TARGET_DIR" ]] && mv "$TARGET_DIR" "$TARGET_DIR.previous"
mv "$TMP/src" "$TARGET_DIR"
info "Saved to $TARGET_DIR"

# ---------------------------------------------------------------- 4. Dependencies
bold "4/5  Installing dependencies"
cd "$TARGET_DIR"
# A cache of its own avoids the common "root-owned files in ~/.npm" error and is reused on updates.
export npm_config_cache="$HOME/Library/Caches/raycast-extension-installer/npm"
export npm_config_update_notifier=false npm_config_fund=false npm_config_audit=false npm_config_loglevel=error
mkdir -p "$npm_config_cache"
if [[ -f package-lock.json ]]; then INSTALL_CMD=(npm ci); else INSTALL_CMD=(npm install); fi
if ! NPM_OUT="$("${INSTALL_CMD[@]}" 2>&1)"; then
  echo "$NPM_OUT" | tail -n 20
  fail "npm could not install the dependencies (output above)."
fi
info "Done."

# ---------------------------------------------------------------- 5. Import into Raycast
bold "5/5  Importing into Raycast"
info "Raycast opens and adds the extension. This takes a few seconds."
LOG="$TMP/develop.log"
npm run dev >"$LOG" 2>&1 &
DEV_PID=$!

for _ in $(seq 1 180); do
  if grep -q "built extension successfully" "$LOG" 2>/dev/null; then
    sleep 10 # give Raycast time to pick up the build and its assets
    break
  fi
  if ! kill -0 "$DEV_PID" 2>/dev/null; then
    tail -n 30 "$LOG"
    fail "The import into Raycast failed (log above)."
  fi
  sleep 1
done

if ! grep -q "built extension successfully" "$LOG" 2>/dev/null; then
  tail -n 30 "$LOG"
  fail "Raycast did not confirm the import within 3 minutes."
fi

# Stop the development server; the extension stays installed in Raycast.
pkill -P "$DEV_PID" 2>/dev/null || true
kill "$DEV_PID" 2>/dev/null || true
DEV_PID=""

echo "$VERSION" >"$TARGET_DIR/.installed-version"

bold "Done – $TITLE $VERSION is installed."
info "Open Raycast and search for \"$TITLE\"."
info "To update later, run this same file again."
pause_exit 0

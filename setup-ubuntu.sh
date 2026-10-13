#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$ROOT_DIR/backend"
FRONTEND_DIR="$ROOT_DIR/frontend"

if ! command -v apt-get >/dev/null 2>&1; then
  echo "This setup script requires Ubuntu (apt-get)." >&2
  exit 1
fi
if [[ ! -r /etc/os-release ]] || ! grep -qi '^ID=ubuntu' /etc/os-release; then
  echo "This setup script is for Ubuntu. Use the documented manual prerequisites on other systems." >&2
  exit 1
fi

SUDO=()
if [[ "$(id -u)" != "0" ]]; then
  if ! command -v sudo >/dev/null 2>&1; then
    echo "sudo is required to install Python/Node system prerequisites." >&2
    exit 1
  fi
  SUDO=(sudo)
fi

echo "Installing system prerequisites..."
"${SUDO[@]}" apt-get update
"${SUDO[@]}" apt-get install -y python3 python3-venv python3-pip ca-certificates curl

if ! command -v node >/dev/null 2>&1 || [[ "$(node -p 'Number(process.versions.node.split(".")[0])')" -lt 20 ]]; then
  echo "Installing Node.js 20 from the NodeSource Ubuntu repository..."
  NODESOURCE_SCRIPT="$(mktemp)"
  trap 'rm -f "$NODESOURCE_SCRIPT"' EXIT
  curl -fsSL https://deb.nodesource.com/setup_20.x -o "$NODESOURCE_SCRIPT"
  "${SUDO[@]}" bash "$NODESOURCE_SCRIPT"
  "${SUDO[@]}" apt-get install -y nodejs
  rm -f "$NODESOURCE_SCRIPT"
  trap - EXIT
fi

if ! command -v python3 >/dev/null 2>&1; then
  echo "Could not install Python 3. Check the Ubuntu package manager output." >&2
  exit 1
fi
PYTHON_VERSION="$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')"
if ! python3 -c 'import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)'; then
  echo "Python 3.10 or newer is required (found $PYTHON_VERSION)." >&2
  exit 1
fi

if ! command -v node >/dev/null 2>&1 || ! command -v npm >/dev/null 2>&1; then
  echo "Node.js/npm installation failed. Check the Ubuntu package manager output." >&2
  exit 1
fi
NODE_MAJOR="$(node -p 'Number(process.versions.node.split(".")[0])')"
if (( NODE_MAJOR < 20 )); then
  echo "Node.js 20 or newer is required (found $(node --version))." >&2
  exit 1
fi

if [[ ! -d "$BACKEND_DIR/.venv" ]]; then
  python3 -m venv "$BACKEND_DIR/.venv"
fi
"$BACKEND_DIR/.venv/bin/python" -m pip install --upgrade pip
"$BACKEND_DIR/.venv/bin/python" -m pip install -r "$BACKEND_DIR/requirements.txt"

if [[ ! -f "$BACKEND_DIR/.env" ]]; then
  cp "$BACKEND_DIR/.env.example" "$BACKEND_DIR/.env"
  echo "Created backend/.env from backend/.env.example. Edit it with your friend's Hive and MongoDB settings."
fi

cd "$FRONTEND_DIR"
npm install

echo
echo "Dependencies installed."
echo "Configure backend/.env, then run the Hive-to-MongoDB one-time sync:"
echo "  cd backend && .venv/bin/python sync_hive_to_mongodb.py"
echo "Start API in one terminal:"
echo "  cd backend && .venv/bin/uvicorn app.main:app --reload --host 0.0.0.0"
echo "Start website in another terminal:"
echo "  cd frontend && npm run dev -- --host 0.0.0.0"

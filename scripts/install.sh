#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
context-doctor installer

Usage:
  ./scripts/install.sh [--local] [--vscode] [--completion bash|zsh|fish]

Options:
  --local       Build this repo and link CLI globally.
  --vscode      Build and install local VS Code extension.
  --completion  Install shell completion for bash, zsh, or fish.

Default:
  npm install -g context-doctor
EOF
}

need() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Missing required command: $1" >&2
    exit 1
  fi
}

LOCAL=0
VSCODE=0
COMPLETION=""

while [ "$#" -gt 0 ]; do
  case "$1" in
    --local) LOCAL=1 ;;
    --vscode) VSCODE=1 ;;
    --completion)
      shift
      COMPLETION="${1:-}"
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
  shift
done

need node
need npm

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

if [ "$LOCAL" -eq 1 ]; then
  cd "$ROOT"
  npm install
  npm run build
  npm link --workspace @context-doctor/core
  npm link --workspace context-doctor
else
  npm install -g context-doctor
fi

if [ -n "$COMPLETION" ]; then
  case "$COMPLETION" in
    bash)
      context-doctor completion bash >> "$HOME/.bashrc"
      echo "Added bash completion to ~/.bashrc"
      ;;
    zsh)
      context-doctor completion zsh >> "$HOME/.zshrc"
      echo "Added zsh completion to ~/.zshrc"
      ;;
    fish)
      mkdir -p "$HOME/.config/fish/completions"
      context-doctor completion fish > "$HOME/.config/fish/completions/context-doctor.fish"
      echo "Added fish completion"
      ;;
    *)
      echo "Unsupported shell completion: $COMPLETION" >&2
      exit 1
      ;;
  esac
fi

if [ "$VSCODE" -eq 1 ]; then
  need code
  cd "$ROOT"
  npm run build
  npm run pack:vscode
  code --install-extension "$ROOT/packages/vscode/context-doctor-vscode-0.1.0.vsix"
fi

context-doctor doctor
echo "Installed. Try: context-doctor explain"

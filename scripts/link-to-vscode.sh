#!/usr/bin/env bash
# Drop-in install: symlink extension folder into VS Code and Cursor. Nothing else.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
EXT="$ROOT/anki.firmlens-0.1.0"
NAME="anki.firmlens-0.1.0"

for DIR in "$HOME/.vscode/extensions" "$HOME/.cursor/extensions"; do
  mkdir -p "$DIR"
  ln -sfn "$EXT" "$DIR/$NAME"
  echo "$DIR/$NAME -> $EXT"
done

echo "Quit and reopen the editor, or Developer: Reload Window."
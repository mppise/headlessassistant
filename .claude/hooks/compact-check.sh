#!/usr/bin/env bash
# Shared utility: check if /compact needs to run before phase transition
# Returns 0 (compact needed) or 1 (compact already run)

set -euo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-.}"
COMPACT_MARKER="${PROJECT_DIR}/.claude/.phase-transition-compact-needed"

# If marker exists, compact is needed
if [[ ! -f "$COMPACT_MARKER" ]]; then
  # Create marker for next time
  mkdir -p "$(dirname "$COMPACT_MARKER")" 2>/dev/null || true
  touch "$COMPACT_MARKER"
  exit 0  # compact IS needed
fi

exit 1  # compact already done

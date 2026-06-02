#!/usr/bin/env bash
# SpecGantry engagement contract — runs at SessionStart + PostCompact
# Also clears phase-transition compact marker after compaction

set -euo pipefail

CONTRACT_PATH="${CLAUDE_PROJECT_DIR:-.}/.claude/CONTRACT.md"
PHASE_MARKER="${CLAUDE_PROJECT_DIR:-.}/.claude/.phase-transition-compact-needed"

if [[ ! -f "$CONTRACT_PATH" ]]; then
  python3 -c "
import json, sys
print(json.dumps({
  'hookSpecificOutput': {
    'hookEventName': 'SessionStart',
    'additionalContext': sys.argv[1]
  }
}))" "❌ SpecGantry: CONTRACT.md not found — do not proceed until this is resolved."
  exit 1
fi

# Read hook event from stdin (Claude Code sends JSON with hook_event_name)
HOOK_EVENT=$(python3 -c "
import json, sys
raw = sys.stdin.read().strip()
if raw:
    print(json.loads(raw).get('hook_event_name', 'SessionStart'))
else:
    print('SessionStart')
" 2>/dev/null || echo "SessionStart")

# If this is PostCompact, clear the phase-transition marker
if [[ "$HOOK_EVENT" == "PostCompact" ]]; then
  rm -f "$PHASE_MARKER" 2>/dev/null || true
fi

# Signal successful hook completion. CONTRACT.md is read by Claude's handshake,
# so we don't need to pass its content as additionalContext (which has size limits).
python3 -c "
import json, sys
event = sys.argv[1]
print(json.dumps({
  'hookSpecificOutput': {
    'hookEventName': event,
    'additionalContext': 'SpecGantry engagement contract reloaded.'
  }
}))" "$HOOK_EVENT"
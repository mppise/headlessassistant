#!/bin/bash
# enforce-phase-gates.sh: Tier 1 enforcement of SpecGantry contract (Automation Notes)
# Runs as a PreToolUse hook when Edit/Write target src/

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATUS_FILE="$PROJECT_ROOT/STATUS.md"
COMPACT_MARKER="$PROJECT_ROOT/.claude/.phase-transition-compact-needed"

# Extract Development phase status from STATUS.md
get_dev_status() {
    if [ ! -f "$STATUS_FILE" ]; then
        echo "unknown"
        return
    fi
    grep -A 1 "^## Development" "$STATUS_FILE" 2>/dev/null | grep "Status:" | sed 's/.*Status: //' | tr -d ' ' || echo "unknown"
}

# COMPACT_GATE: Block first src/ write if phase-transition compact has not run
if [ "${ENFORCE_CHECK}" = "compact_gate" ]; then
    dev_status=$(get_dev_status)
    # Only enforce on first entry into Development (not already In Progress or Complete)
    if [ -f "$COMPACT_MARKER" ] && [ "$dev_status" != "🔄InProgress" ] && [ "$dev_status" != "✅Complete" ]; then
        cat >&2 << 'EOF'

🚫 PHASE TRANSITION BLOCKED: Context compaction required

You are entering Development for the first time. Prior phase context must be
cleared before Development begins to keep token cost low.

Run /compact now, then re-invoke /develop.

Reference: ./.claude/CONTRACT.md § Automation Notes

EOF
        exit 2
    fi
    exit 0
fi

# CODE_CHANGE: Block src/ edits unless Development phase is active
if [ "${ENFORCE_CHECK}" = "code_change" ]; then
    dev_status=$(get_dev_status)

    # Check if Development is in progress or complete
    if [ "$dev_status" != "🔄InProgress" ] && [ "$dev_status" != "✅Complete" ]; then
        cat >&2 << 'EOF'

🚫 CODE CHANGE BLOCKED: Development phase required

CONTRACT.md Automation Notes:
Code changes to src/ are blocked when Development phase is not active.

To fix:
  1. Read STATUS.md — verify Development phase is "🔄 In Progress" or "✅ Complete"
  2. If Development is not active, run /design to create component specs first
  3. Resubmit the code change

Reference: ./.claude/CONTRACT.md § Automation Notes

EOF
        exit 2
    fi
    exit 0
fi

exit 0

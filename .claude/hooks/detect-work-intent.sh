#!/bin/bash
# detect-work-intent.sh: Detect code-change intent in user message via structural signals
# Runs on UserPromptSubmit; warns if phase mismatch detected
# Structural detection: code blocks, file refs + action verbs, implementation intent
# Not keyword-based — more robust than pattern matching

PROJECT_ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
STATUS_FILE="$PROJECT_ROOT/STATUS.md"

# Extract Development phase status from STATUS.md
get_dev_status() {
    if [ ! -f "$STATUS_FILE" ]; then
        echo "unknown"
        return
    fi
    grep "^| Development" "$STATUS_FILE" 2>/dev/null | grep -oE '[🔄✅⬜🔴]' | head -1 || echo "unknown"
}

# Extract user message from hook stdin
get_user_message() {
    python3 -c "
import json, sys
try:
    data = json.load(sys.stdin)
    msg = data.get('user_message', '')
    print(msg)
except:
    print('')
" 2>/dev/null
}

# Detect code-change intent via structural signals (not keywords)
detect_code_change_intent() {
    local msg="$1"

    # Signal 1: Code block (triple backtick or tilde)
    # User pasting code → likely requesting implementation
    if echo "$msg" | grep -qE '```|~~~' ; then
        echo "code_block"
        return 0
    fi

    # Signal 2: File reference + action verb
    # Pattern: (modify|update|create|edit|write|implement|add) <filename>
    # More specific than keywords; requires explicit action + file target
    if echo "$msg" | grep -qiE '\b(modify|update|create|edit|write|implement|add|change)\s+[a-z0-9_./]+\.(js|ts|tsx|jsx|py|go|rs|java|c|cpp|h|sql|md|json|yaml|yml|sh|bash)' ; then
        echo "file_action"
        return 0
    fi

    # Signal 3: Implementation intent phrases
    # Specific intent verbs + implementation targets
    # Avoids false positives like "discuss fixing" or "the bug was reported"
    if echo "$msg" | grep -qiE '(implement|add|write|build|create|code|develop).+(feature|function|method|class|component|service|module|endpoint|api|fix|patch|test)' ; then
        echo "impl_intent"
        return 0
    fi

    # Signal 4: Refactoring/optimization intent
    # Less common than feature work but still requires Development
    if echo "$msg" | grep -qiE '(refactor|optimize|improve|rewrite|cleanup|restructure).+(code|logic|function|method|class|component|module)' ; then
        echo "refactor_intent"
        return 0
    fi

    echo "none"
}

message=$(get_user_message)
intent=$(detect_code_change_intent "$message")

# If no code-change intent detected, allow silently and exit
if [ "$intent" = "none" ]; then
    exit 0
fi

# Code-change intent detected — check if Development phase is active
dev_status=$(get_dev_status)

# Development phase OK if status contains 🔄 (In Progress) or ✅ (Complete)
if echo "$dev_status" | grep -qE "[🔄✅]"; then
    # Phase is active, allow (silent)
    exit 0
fi

# Phase mismatch — warn via systemMessage
python3 -c "
import json
msg = '''⚠️  Code change intent detected but Development phase not active.
Choose: /design to create/update specs, or /develop to implement per existing specs.'''
print(json.dumps({
    'systemMessage': msg
}))
"

exit 0

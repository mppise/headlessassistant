#!/usr/bin/env bash
# validate-src-structure.sh: Enforces Architecture rules on src/ writes
# Rules: prompt location, migration immutability, Feature ID traceability, secret prevention
# Runs as PreToolUse on Write to src/**

set -euo pipefail

TMPFILE=$(mktemp)
cat > "$TMPFILE"
trap 'rm -f "$TMPFILE"' EXIT

FILE_PATH=$(python3 - "$TMPFILE" << 'PYEOF'
import json, sys
try:
    with open(sys.argv[1]) as f:
        data = json.load(f)
    print(data.get('tool_input', {}).get('file_path', ''))
except Exception:
    print('')
PYEOF
)

CONTENT=$(python3 - "$TMPFILE" << 'PYEOF'
import json, sys
try:
    with open(sys.argv[1]) as f:
        data = json.load(f)
    print(data.get('tool_input', {}).get('content', ''))
except Exception:
    print('')
PYEOF
)

if [[ -z "$FILE_PATH" ]]; then
    exit 0
fi

# Rule 1: Prompts must be in src/ai/prompts/*.md
# Block writes to src/ai/*.ts that contain inline prompt strings
if [[ "$FILE_PATH" =~ src/ai/[^/]+\.ts$ ]]; then
    if echo "$CONTENT" | grep -qE '"You are |"System: |`You are |`System: ' 2>/dev/null; then
        cat >&2 << 'EOF'

🚫 STRUCTURE VIOLATION: Inline prompt string detected in src/ai/*.ts

All prompts must be stored as Markdown files in src/ai/prompts/
and loaded at runtime. Move prompt content to .md file.

Reference: Architecture/9_Directory_Structure.md Rule 1

EOF
        exit 2
    fi
fi

# Rule 2: SQL migrations are immutable
# Block writes to existing migration files
if [[ "$FILE_PATH" =~ src/db/migrations/.*\.sql$ ]]; then
    if [[ -f "$FILE_PATH" ]]; then
        cat >&2 << 'EOF'

🚫 STRUCTURE VIOLATION: Editing existing SQL migration file

Migrations are immutable. Create a new versioned migration file
instead of editing an existing one.

Reference: Architecture/9_Directory_Structure.md Rule 2

EOF
        exit 2
    fi
fi

# Rule 3: Feature ID traceability — source files must have [C##-F##] comments
# Skip for non-code files, tests, and vendor code
if [[ "$FILE_PATH" =~ src/.*\.(ts|tsx|js|jsx|py|go|rs|java|c|cpp|h)$ ]] && \
   ! [[ "$FILE_PATH" =~ (test|spec|\.test\.|\.spec\.|node_modules|vendor) ]]; then

    # Check if file exists (new file won't have Feature ID yet, so allow)
    if [[ -f "$FILE_PATH" ]]; then
        # File exists and is being modified — should have Feature ID comments
        # Look for entry point pattern: function/class/export + Feature ID
        if ! echo "$CONTENT" | grep -qE '//\s*\[C[0-9]+-F[0-9]+\]|#\s*\[C[0-9]+-F[0-9]+\]' 2>/dev/null; then
            # Only warn if this looks like a significant implementation (has function/class definitions)
            if echo "$CONTENT" | grep -qE '^\s*(export\s+)?(function|class|const|def|fn|impl)' 2>/dev/null; then
                cat >&2 << 'EOF'

⚠️  WARNING: Feature ID comments recommended in src/

Code entry points should include Feature ID comments for traceability:
  // [C01-F01] Handles user authentication
  export function authenticateUser(token: string) { ... }

Reference: CLAUDE.md § Code-Level Traceability

This is a warning, not a block. Add [C##-F##] comments when possible.

EOF
            fi
        fi
    fi
fi

# Rule 4: Secret prevention — block common secret patterns
# Patterns that leak API keys, tokens, passwords, etc.
if echo "$CONTENT" | grep -qiE '(api.?key|secret.?key|password|token|Bearer\s+[a-zA-Z0-9]|Authorization.*Bearer|OPENAI_API_KEY|AWS_SECRET|DATABASE_PASSWORD)' 2>/dev/null; then
    # Check if it's obviously a secret (value assignment, not just a comment about secrets)
    if echo "$CONTENT" | grep -qiE '(api.?key|secret.?key|password|token|Bearer)\s*[:=].*[a-zA-Z0-9]{20,}|OPENAI_API_KEY\s*[:=]' 2>/dev/null; then
        cat >&2 << 'EOF'

🚫 SECURITY VIOLATION: Potential secret detected in code

Secrets should NEVER be committed to source:
  ✗ api_key = "sk-..."
  ✗ password: "my-password"
  ✗ const token = "Bearer xyz..."

Instead:
  ✓ Load from environment: process.env.API_KEY
  ✓ Load from config file: config.load("secrets.yaml")
  ✓ Use a secrets manager: SecretsManager.get("db-password")

Reference: CLAUDE.md § Definition of Done

EOF
        exit 2
    fi
fi

exit 0

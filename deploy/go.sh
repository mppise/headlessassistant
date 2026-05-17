#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# HeadlessAssistant — Deployment Script
# Release: 2026.05.16.2031
#
# DEVIATION FROM STANDARD TEMPLATE:
#   HeadlessAssistant is a static file distribution (see B_Architecture.md §10).
#   The "deploy" operation is a file copy, not a container build/push.
#   This script validates the build artefact, optionally runs the demo
#   environment for smoke testing, and copies the bundle to a target directory.
#
# Usage:
#   ./deploy/go.sh --env test
#   ./deploy/go.sh --env prod --target /var/www/cdn/headless-assistant/
#
# Flags:
#   --env test          Validate + run demo servers (ports 3000, 8080) for manual smoke testing
#   --env prod          Validate + copy bundle to --target (required for prod)
#   --target <dir>      Destination directory for bundle copy (prod only)
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

# ── Helpers ────────────────────────────────────────────────────────────────────

BLUE='\033[0;34m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

log()  { echo -e "${BLUE}[deploy]${NC} $*"; }
ok()   { echo -e "${GREEN}[ok]${NC}     $*"; }
warn() { echo -e "${YELLOW}[warn]${NC}   $*"; }
fail() { echo -e "${RED}[FAIL]${NC}   $*"; exit 1; }

# ── Argument parsing ───────────────────────────────────────────────────────────

ENV=""
TARGET=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --env)    ENV="$2";    shift 2 ;;
    --target) TARGET="$2"; shift 2 ;;
    *) fail "Unknown flag: $1. Use --env test|prod [--target <dir>]" ;;
  esac
done

[[ -z "$ENV" ]] && fail "--env is required. Use --env test or --env prod."
[[ "$ENV" != "test" && "$ENV" != "prod" ]] && fail "--env must be 'test' or 'prod'."
[[ "$ENV" == "prod" && -z "$TARGET" ]] && fail "--target is required for --env prod."

# ── Locate project root ────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
BUNDLE="$PROJECT_ROOT/src/headless-assistant.js"
DEMO_DIR="$PROJECT_ROOT/_DEMO"

log "Project root: $PROJECT_ROOT"
log "Environment:  $ENV"

# ── Step 1: Environment checks ─────────────────────────────────────────────────

log "Step 1 — Environment checks"

if ! command -v node &>/dev/null; then
  fail "node is not installed or not in PATH."
fi
NODE_VER=$(node --version)
ok "Node.js $NODE_VER"

if ! command -v npm &>/dev/null; then
  fail "npm is not installed or not in PATH."
fi
ok "npm $(npm --version)"

if ! command -v stdbuf &>/dev/null; then
  warn "stdbuf not found — agent-server log output may be buffered in test mode."
fi

if [[ "$ENV" == "prod" ]]; then
  if [[ ! -d "$TARGET" ]]; then
    warn "Target directory '$TARGET' does not exist. Attempting to create..."
    mkdir -p "$TARGET" || fail "Could not create target directory: $TARGET"
  fi
  ok "Target directory: $TARGET"
fi

# ── Step 2: Validate bundle ────────────────────────────────────────────────────

log "Step 2 — Validate bundle"

[[ -f "$BUNDLE" ]] || fail "Bundle not found: $BUNDLE"
ok "Bundle found: $BUNDLE"

BUNDLE_BYTES=$(wc -c < "$BUNDLE" | tr -d ' ')
BUNDLE_KB=$(( BUNDLE_BYTES / 1024 ))
if [[ $BUNDLE_KB -gt 50 ]]; then
  warn "Bundle size is ${BUNDLE_KB}KB (spec target: <50KB minified). Review before production deployment."
else
  ok "Bundle size: ${BUNDLE_KB}KB (within 50KB spec target)"
fi

if ! grep -q "HeadlessAssistant" "$BUNDLE"; then
  fail "Bundle does not export HeadlessAssistant — possible build corruption."
fi
ok "HeadlessAssistant export confirmed"

# ── Step 3: Validate agent-server tool registry ────────────────────────────────

log "Step 3 — Validate agent-server tool registry"

AGENT_DIR="$DEMO_DIR/agent-server"
REGISTRY="$AGENT_DIR/tools/tool-registry.json"

[[ -f "$REGISTRY" ]] || fail "tool-registry.json not found at $REGISTRY"
ok "tool-registry.json found"

# Check every registered tool has schema.json and handler.js
TOOL_COUNT=0
while IFS= read -r name && IFS= read -r schema && IFS= read -r handler; do
  schema_path="$AGENT_DIR/${schema//.\//}"
  handler_path="$AGENT_DIR/${handler//.\//}"
  [[ -f "$schema_path" ]]  || fail "schema not found for tool '$name': $schema_path"
  [[ -f "$handler_path" ]] || fail "handler not found for tool '$name': $handler_path"
  TOOL_COUNT=$((TOOL_COUNT + 1))
done < <(node --input-type=module <<'EOF'
import { readFileSync } from 'fs';
const r = JSON.parse(readFileSync(process.env.REGISTRY));
for (const e of r) { console.log(e.name); console.log(e.schema); console.log(e.handler); }
EOF
)

ok "$TOOL_COUNT tools validated (schema + handler present)"

# ── Step 4: Test mode — run demo for manual smoke testing ──────────────────────

if [[ "$ENV" == "test" ]]; then
  log "Step 4 — Starting demo environment (test mode)"

  PORTAL_DIR="$DEMO_DIR/payment-portal"
  AGENT_LOG="$DEMO_DIR/agent-server.log"

  [[ -f "$AGENT_DIR/.env" ]] || fail ".env missing in $AGENT_DIR — create it with SAP AI Core credentials before running test mode."

  # Warn if deprecated EPP env vars are still set in .env
  if grep -qE "^EPP_COMP_CODE=|^EPP_CUST_NUM=" "$AGENT_DIR/.env" 2>/dev/null; then
    warn "EPP_COMP_CODE / EPP_CUST_NUM found in .env — these are no longer used (v2026.05.16.2031). Context is now caller-supplied."
  fi

  log "Installing payment-portal dependencies..."
  npm install --prefix "$PORTAL_DIR" --silent
  ok "payment-portal dependencies installed"

  log "Installing agent-server dependencies..."
  npm install --prefix "$AGENT_DIR" --silent
  ok "agent-server dependencies installed"

  cleanup_test() {
    set +e
    echo ""
    log "Stopping demo servers..."
    kill "$PORTAL_PID" "$AGENT_PID" 2>/dev/null
    wait "$PORTAL_PID" "$AGENT_PID" 2>/dev/null
    log "Cleaning up node_modules..."
    rm -rf "$AGENT_DIR/node_modules"
    rm -rf "$PORTAL_DIR/node_modules"
    exit 0
  }
  trap cleanup_test INT TERM

  log "Starting payment-portal -> http://localhost:8080"
  npm start --prefix "$PORTAL_DIR" > /dev/null 2>&1 &
  PORTAL_PID=$!

  log "Starting agent-server   -> http://localhost:3000"
  : > "$AGENT_LOG"
  if command -v stdbuf &>/dev/null; then
    stdbuf -oL -eL node "$AGENT_DIR/server.js" >> "$AGENT_LOG" 2>&1 &
  else
    node "$AGENT_DIR/server.js" >> "$AGENT_LOG" 2>&1 &
  fi
  AGENT_PID=$!

  # Wait for agent-server to be reachable
  MAX_WAIT=15
  WAITED=0
  until curl -sf "http://localhost:3000/headless-assistant.js" >/dev/null 2>&1 || [[ $WAITED -ge $MAX_WAIT ]]; do
    sleep 1
    WAITED=$((WAITED + 1))
  done

  if curl -sf "http://localhost:3000/headless-assistant.js" >/dev/null 2>&1; then
    ok "agent-server is reachable at http://localhost:3000"
  else
    warn "agent-server did not respond within ${MAX_WAIT}s — check $AGENT_LOG"
  fi

  if curl -sf "http://localhost:8080/" >/dev/null 2>&1; then
    ok "payment-portal is reachable at http://localhost:8080"
  else
    warn "payment-portal did not respond within ${MAX_WAIT}s"
  fi

  echo ""
  echo "┌──────────────────────────────────────────────────────────────┐"
  echo "│                                                              │"
  echo "│   Demo environment is running. Open in your browser:        │"
  echo "│                                                              │"
  echo "│      http://localhost:8080                                   │"
  echo "│                                                              │"
  echo "│   Smoke test checklist (see release_audit.md §C.1):         │"
  echo "│    1. agent-server.log shows startup + MCP connected         │"
  echo "│    2. Portal loads; widget bubble appears bottom-right       │"
  echo "│    3. Send: 'What is my balance?' — verify tool call logged  │"
  echo "│    4. Send: 'Hello' — verify direct answer (no tool call)    │"
  echo "│    5. Check log: context={CompCode, CustNum} in [request]    │"
  echo "│                                                              │"
  echo "│   Agent server logs → _DEMO/agent-server.log                │"
  echo "│   Press Ctrl-C to stop servers and clean up.                │"
  echo "│                                                              │"
  echo "└──────────────────────────────────────────────────────────────┘"
  echo ""

  tail -f "$AGENT_LOG"
  exit 0
fi

# ── Step 5: Prod mode — copy bundle to target ──────────────────────────────────

if [[ "$ENV" == "prod" ]]; then
  log "Step 5 — Deploying bundle to $TARGET"

  DEST="$TARGET/headless-assistant.js"
  cp "$BUNDLE" "$DEST" || fail "Failed to copy bundle to $DEST"
  ok "Bundle deployed: $DEST"

  DEST_BYTES=$(wc -c < "$DEST" | tr -d ' ')
  [[ "$BUNDLE_BYTES" -eq "$DEST_BYTES" ]] || fail "Byte count mismatch after copy — possible partial write."
  ok "Copy verified (${DEST_BYTES} bytes)"

  echo ""
  ok "Deployment complete."
  echo ""
  echo "  Next steps:"
  echo "  1. Update your portal's script tag to point to the new bundle location."
  echo "  2. Ensure POST /ask-assistant callers include context: { CompCode, CustNum } in the request body."
  echo "  3. Run the smoke test plan from deploy/rel_2026.05.16.2031/release_audit.md §C.1."
  echo "  4. Monitor agent-server logs for [error] lines after first requests."
  echo ""
fi

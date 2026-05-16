#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# HeadlessAssistant — Deployment Script
# Release: 2026.05.15.2146
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

# Node.js
if ! command -v node &>/dev/null; then
  fail "node is not installed or not in PATH."
fi
NODE_VER=$(node --version)
ok "Node.js $NODE_VER"

# npm
if ! command -v npm &>/dev/null; then
  fail "npm is not installed or not in PATH."
fi
ok "npm $(npm --version)"

if [[ "$ENV" == "prod" ]]; then
  # For production copy, check that target directory exists or can be created
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

# Check that the IIFE wrapper and HeadlessAssistant global are present
if ! grep -q "HeadlessAssistant" "$BUNDLE"; then
  fail "Bundle does not export HeadlessAssistant — possible build corruption."
fi
ok "HeadlessAssistant export confirmed"

if ! grep -q "C01-F01" "$BUNDLE" && ! grep -q "C01-F02" "$BUNDLE"; then
  warn "Feature traceability comments (C01-F0x) not found in bundle — verify spec alignment."
fi

# ── Step 3: Test mode — run demo for manual smoke testing ──────────────────────

if [[ "$ENV" == "test" ]]; then
  log "Step 3 — Starting demo environment (test mode)"

  AGENT_DIR="$DEMO_DIR/agent-server"
  PORTAL_DIR="$DEMO_DIR/payment-portal"

  [[ -f "$AGENT_DIR/.env" ]] || fail ".env missing in $AGENT_DIR — create it with SAP AI Core credentials before running test mode."

  log "Installing agent-server dependencies..."
  npm install --prefix "$AGENT_DIR" --silent
  ok "agent-server dependencies installed"

  log "Installing payment-portal dependencies..."
  npm install --prefix "$PORTAL_DIR" --silent
  ok "payment-portal dependencies installed"

  cleanup_test() {
    set +e
    echo ""
    log "Stopping demo servers..."
    kill "$AGENT_PID" "$PORTAL_PID" 2>/dev/null
    wait "$AGENT_PID" "$PORTAL_PID" 2>/dev/null
    log "Cleaning up node_modules..."
    rm -rf "$AGENT_DIR/node_modules"
    rm -rf "$PORTAL_DIR/node_modules"
    exit 0
  }
  trap cleanup_test INT TERM

  log "Starting agent-server  -> http://localhost:3000"
  npm start --prefix "$AGENT_DIR" &
  AGENT_PID=$!

  log "Starting payment-portal -> http://localhost:8080"
  npm start --prefix "$PORTAL_DIR" &
  PORTAL_PID=$!

  sleep 2

  # Wait for agent-server to be reachable
  MAX_WAIT=15
  WAITED=0
  until curl -sf http://localhost:3000/ >/dev/null 2>&1 || [[ $WAITED -ge $MAX_WAIT ]]; do
    sleep 1
    WAITED=$((WAITED + 1))
  done

  if curl -sf http://localhost:3000/ >/dev/null 2>&1 || curl -sf http://localhost:3000/headless-assistant.js >/dev/null 2>&1; then
    ok "agent-server is reachable at http://localhost:3000"
  else
    warn "agent-server did not respond within ${MAX_WAIT}s — check server logs above."
  fi

  if curl -sf http://localhost:8080/ >/dev/null 2>&1; then
    ok "payment-portal is reachable at http://localhost:8080"
  else
    warn "payment-portal did not respond within ${MAX_WAIT}s — check server logs above."
  fi

  echo ""
  echo "┌──────────────────────────────────────────────────────────┐"
  echo "│                                                          │"
  echo "│   Demo environment is running. Open in your browser:    │"
  echo "│                                                          │"
  echo "│      http://localhost:8080                               │"
  echo "│                                                          │"
  echo "│   Smoke test checklist (see release_audit.md §C.1):     │"
  echo "│    1. Portal loads without JS errors                     │"
  echo "│    2. Widget bubble appears bottom-right                 │"
  echo "│    3. Greeting: Hi Sarah! How can I help you today?      │"
  echo "│    4. Send a message; verify streaming response          │"
  echo "│    5. Reload; verify history is restored                 │"
  echo "│    6. Click trash icon; verify panel resets              │"
  echo "│                                                          │"
  echo "│   Press Ctrl-C to stop servers and clean up.            │"
  echo "│                                                          │"
  echo "└──────────────────────────────────────────────────────────┘"
  echo ""

  wait
  exit 0
fi

# ── Step 4: Prod mode — copy bundle to target ──────────────────────────────────

if [[ "$ENV" == "prod" ]]; then
  log "Step 4 — Deploying bundle to $TARGET"

  DEST="$TARGET/headless-assistant.js"
  cp "$BUNDLE" "$DEST" || fail "Failed to copy bundle to $DEST"
  ok "Bundle deployed: $DEST"

  # Verify copy
  DEST_BYTES=$(wc -c < "$DEST" | tr -d ' ')
  [[ "$BUNDLE_BYTES" -eq "$DEST_BYTES" ]] || fail "Byte count mismatch after copy — possible partial write."
  ok "Copy verified (${DEST_BYTES} bytes)"

  echo ""
  ok "Deployment complete."
  echo ""
  echo "  Next steps:"
  echo "  1. Update your portal's script tag to point to the new bundle location."
  echo "  2. Run the smoke test plan from deploy/rel_2026.05.15.2146/release_audit.md §C.1."
  echo "  3. Monitor the browser console for any config or runtime errors."
  echo ""
fi

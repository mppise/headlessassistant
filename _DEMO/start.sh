#!/usr/bin/env bash

DEMO_DIR="$(cd "$(dirname "$0")" && pwd)"
AGENT_LOG="$DEMO_DIR/agent-server.log"

# Remove node_modules and reinstall in a given directory
install_deps() {
  local dir="$1"
  echo "Installing dependencies in $dir..."
  rm -rf "$dir/node_modules"
  npm install --prefix "$dir" --silent
}

# Kill all servers and remove node_modules on exit
cleanup() {
  set +e
  echo ""
  echo "Stopping servers..."
  kill "$PORTAL_PID" "$AGENT_PID" "$INSPECTOR_PID" 2>/dev/null
  wait "$PORTAL_PID" "$AGENT_PID" "$INSPECTOR_PID" 2>/dev/null
  echo "Cleaning up node_modules..."
  rm -rf "$DEMO_DIR/agent-server/node_modules"
  rm -rf "$DEMO_DIR/payment-portal/node_modules"
  exit 0
}
trap cleanup INT TERM

install_deps "$DEMO_DIR/payment-portal"
install_deps "$DEMO_DIR/agent-server"

echo ""
echo "Starting payment-portal ->  http://localhost:8080"
npm start --prefix "$DEMO_DIR/payment-portal" > /dev/null 2>&1 &
PORTAL_PID=$!

echo "Starting agent-server   ->  http://localhost:3000"
: > "$AGENT_LOG"
node "$DEMO_DIR/agent-server/server.js" >> "$AGENT_LOG" 2>&1 &
AGENT_PID=$!

echo "Opening MCP Inspector..."
npx @modelcontextprotocol/inspector node "$DEMO_DIR/agent-server/lib/mcp-server.js" &
INSPECTOR_PID=$!

echo ""
echo "┌─────────────────────────────────────────────────────┐"
echo "│                                                     │"
echo "│   Open the payment portal in your browser:         │"
echo "│                                                     │"
echo "│      http://localhost:8080                          │"
echo "│                                                     │"
echo "│   Press Ctrl-C to stop both servers.               │"
echo "│                                                     │"
echo "└─────────────────────────────────────────────────────┘"
echo ""
echo "Agent server logs → $AGENT_LOG"
echo ""
tail -f "$AGENT_LOG"

#!/usr/bin/env bash

DEMO_DIR="$(cd "$(dirname "$0")" && pwd)"
AGENT_LOG="$DEMO_DIR/agent-server.log"
AGENT_PY_LOG="$DEMO_DIR/agent-server-py.log"

# Remove node_modules and reinstall in a given directory
install_deps() {
  local dir="$1"
  echo "Installing dependencies in $dir..."
  rm -rf "$dir/node_modules"
  npm install --prefix "$dir" --silent
}

# Install Python dependencies in a given directory
install_py_deps() {
  local dir="$1"
  echo "Installing Python dependencies in $dir..."
  pip3 install -q -r "$dir/requirements.txt"
}

# Kill all servers and remove node_modules on exit
cleanup() {
  set +e
  echo ""
  echo "Stopping servers..."
  kill "$PORTAL_PID" "$AGENT_PID" "$AGENT_PY_PID" "$INSPECTOR_JS_PID" "$INSPECTOR_PY_PID" 2>/dev/null
  wait "$PORTAL_PID" "$AGENT_PID" "$AGENT_PY_PID" "$INSPECTOR_JS_PID" "$INSPECTOR_PY_PID" 2>/dev/null
  echo "Cleaning up node_modules..."
  rm -rf "$DEMO_DIR/agent-server/node_modules"
  rm -rf "$DEMO_DIR/payment-portal/node_modules"
  exit 0
}
trap cleanup INT TERM

install_deps "$DEMO_DIR/payment-portal"
install_deps "$DEMO_DIR/agent-server"
install_py_deps "$DEMO_DIR/agent-server-py"

echo ""
echo "Starting payment-portal     ->  http://localhost:8080"
npm start --prefix "$DEMO_DIR/payment-portal" > /dev/null 2>&1 &
PORTAL_PID=$!

echo "Starting agent-server (JS)  ->  http://localhost:3000"
: > "$AGENT_LOG"
PORT=3000 node "$DEMO_DIR/agent-server/server.js" >> "$AGENT_LOG" 2>&1 &
AGENT_PID=$!

echo "Starting agent-server (Py)  ->  http://localhost:3001"
: > "$AGENT_PY_LOG"
cd "$DEMO_DIR/agent-server-py" && PORT=3001 python3 server.py >> "$AGENT_PY_LOG" 2>&1 &
AGENT_PY_PID=$!
cd "$DEMO_DIR"

echo "Opening MCP Inspector (JS)  ->  http://localhost:6274"
npx @modelcontextprotocol/inspector --transport stdio node "$DEMO_DIR/agent-server/lib/mcp-server.js" &
INSPECTOR_JS_PID=$!

echo "Opening MCP Inspector (Py)  ->  http://localhost:6275"
CLIENT_PORT=6275 SERVER_PORT=6278 npx @modelcontextprotocol/inspector python3 "$DEMO_DIR/agent-server-py/lib/mcp_server.py" &
INSPECTOR_PY_PID=$!

echo ""
echo "┌─────────────────────────────────────────────────────┐"
echo "│                                                     │"
echo "│   Open the payment portal in your browser:         │"
echo "│                                                     │"
echo "│      http://localhost:8080                          │"
echo "│                                                     │"
echo "│   Agent server (Node.js) →  http://localhost:3000  │"
echo "│   Agent server (Python)  →  http://localhost:3001  │"
echo "│                                                     │"
echo "│   MCP Inspector (JS)     →  http://localhost:6274  │"
echo "│   MCP Inspector (Py)     →  http://localhost:6275  │"
echo "│                                                     │"
echo "│   Press Ctrl-C to stop all servers.                │"
echo "│                                                     │"
echo "└─────────────────────────────────────────────────────┘"
echo ""
echo "Agent server logs (JS) → $AGENT_LOG"
echo "Agent server logs (Py) → $AGENT_PY_LOG"
echo ""
tail -f "$AGENT_LOG" "$AGENT_PY_LOG"

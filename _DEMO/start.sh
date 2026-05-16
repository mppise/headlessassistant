#!/usr/bin/env bash

DEMO_DIR="$(cd "$(dirname "$0")" && pwd)"

# Remove node_modules and reinstall in a given directory
install_deps() {
  local dir="$1"
  echo "Installing dependencies in $dir..."
  rm -rf "$dir/node_modules"
  npm install --prefix "$dir" --silent
}

# Kill both servers and remove node_modules on exit
cleanup() {
  set +e
  echo ""
  echo "Stopping servers..."
  kill "$AGENT_PID" "$PORTAL_PID" 2>/dev/null
  wait "$AGENT_PID" "$PORTAL_PID" 2>/dev/null
  echo "Cleaning up node_modules..."
  rm -rf "$DEMO_DIR/agent-server/node_modules"
  rm -rf "$DEMO_DIR/payment-portal/node_modules"
  exit 0
}
trap cleanup INT TERM

install_deps "$DEMO_DIR/agent-server"
install_deps "$DEMO_DIR/payment-portal"

echo ""
echo "Starting agent-server   ->  http://localhost:3000"
npm start --prefix "$DEMO_DIR/agent-server" &
AGENT_PID=$!

echo "Starting payment-portal ->  http://localhost:8080"
npm start --prefix "$DEMO_DIR/payment-portal" &
PORTAL_PID=$!

# Wait for servers to finish printing their startup messages before showing the prompt
sleep 2

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
wait

#!/bin/bash
# Start the WebSocket server + Vite frontend
set -e

echo ""
echo "  Wordix — local start"
echo "  ────────────────────────────"

# Check dependencies
command -v python3 >/dev/null || { echo "  ✗ python3 is not installed"; exit 1; }
command -v node    >/dev/null || { echo "  ✗ node is not installed";    exit 1; }

cd "$(dirname "$0")"

# Install Python package if missing
python3 -c "import websockets" 2>/dev/null || {
    echo "  Installing websockets..."
    pip3 install --quiet websockets
}

# Install npm dependencies if missing
if [ ! -d frontend/node_modules ]; then
    echo "  Installing npm dependencies..."
    (cd frontend && npm install --silent)
fi

# Start server (in background)
echo "  ▶ WebSocket server → ws://localhost:8765"
WORDIX_ROUNDS=${WORDIX_ROUNDS:-5} python3 wordix_ws_server.py &
SERVER_PID=$!

# Short delay to let the server start
sleep 1

# Start frontend
echo "  ▶ Frontend         → http://localhost:5173"
echo ""
(cd frontend && npm run dev) &
FRONTEND_PID=$!

# On Ctrl+C, stop both processes
trap "echo ''; echo '  Stopped.'; kill $SERVER_PID $FRONTEND_PID 2>/dev/null" INT TERM
wait

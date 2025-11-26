#!/bin/zsh

# Clippy Startup Script

echo "Starting Clippy Chatbot..."

# Check if Ollama is installed
if ! command -v ollama &> /dev/null; then
    echo "Error: Ollama not installed. Please install from https://ollama.ai"
    exit 1
fi

# Start Ollama in background
echo "Starting Ollama..."
ollama serve &
OLLAMA_PID=$!
sleep 2  # Wait for Ollama to start

# Check if model is available
if ! ollama list | grep -q "qwen2:0.5b"; then
    echo "Pulling model qwen2:0.5b-q8_0..."
    ollama pull qwen2:0.5b-q8_0
fi

# Start HTTP server in background
echo "Starting HTTP server..."
python3 -m http.server 8000 &
SERVER_PID=$!

# Open browser
echo "Opening browser..."
open http://localhost:8000

echo "Clippy is running! Press Ctrl+C to stop."

# Wait for interrupt
trap "echo 'Stopping...'; kill $OLLAMA_PID $SERVER_PID; exit" INT
wait
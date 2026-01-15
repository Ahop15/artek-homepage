#!/bin/bash

#  █████╗ ██████╗  █████╗ ███████╗
# ██╔══██╗██╔══██╗██╔══██╗██╔════╝
# ███████║██████╔╝███████║███████╗
# ██╔══██║██╔══██╗██╔══██║╚════██║
# ██║  ██║██║  ██║██║  ██║███████║
# ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝

# ARTEK AI Worker Dashboard - Start Script
# Activates Python virtual environment and runs Streamlit dashboard

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Project root directory (3 levels up)
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# Virtual environment path
VENV_PATH="$PROJECT_ROOT/.venv"

# Check if venv exists
if [ ! -d "$VENV_PATH" ]; then
    echo "Error: Python virtual environment not found at $VENV_PATH"
    echo "Please create venv first: python -m venv .venv"
    exit 1
fi

# Activate virtual environment
echo "Activating Python virtual environment..."
source "$VENV_PATH/bin/activate"

# Check if streamlit is installed
if ! command -v streamlit &> /dev/null; then
    echo "Error: streamlit not found in virtual environment"
    echo "Please install dependencies: pip install -r requirements.txt"
    exit 1
fi

# Change to script directory
# shellcheck disable=SC2164
cd "$SCRIPT_DIR"

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Warning: .env file not found"
    echo "Please copy .env.example to .env and configure it"
    exit 1
fi

# Run Streamlit
echo "Starting ARTEK AI Worker Dashboard..."
streamlit run app.py
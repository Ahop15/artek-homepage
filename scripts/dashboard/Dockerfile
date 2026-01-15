# syntax=docker/dockerfile:1

# ARTEK AI Worker Dashboard - Streamlit Container
# Target: linux/amd64 (Cloudflare Containers requirement)

FROM python:3.11-slim AS base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY app/requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY app/app.py .
COPY app/db_connector.py .
COPY app/db_connector_dev.py .
COPY app/translations.py .
COPY app/export_utils.py .
COPY app/locales ./locales
COPY app/.streamlit ./.streamlit
COPY app/.env .

# Switch to production environment
RUN sed -i 's/ENVIRONMENT=dev/ENVIRONMENT=prod/g' .env

# Streamlit configuration for container environment
ENV STREAMLIT_SERVER_PORT=8501
ENV STREAMLIT_SERVER_ADDRESS=0.0.0.0
ENV STREAMLIT_SERVER_HEADLESS=true
ENV STREAMLIT_BROWSER_GATHER_USAGE_STATS=false
ENV STREAMLIT_SERVER_FILE_WATCHER_TYPE=none

# Expose Streamlit port
EXPOSE 8501

# Run Streamlit
CMD ["streamlit", "run", "app.py", "--server.port=8501", "--server.address=0.0.0.0"]
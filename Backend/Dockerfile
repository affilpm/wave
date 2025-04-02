FROM python:3.11-slim as builder
WORKDIR /app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc postgresql-client libpq-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip wheel --no-cache-dir --no-deps --wheel-dir /app/wheels -r requirements.txt

FROM python:3.11-slim
WORKDIR /app

# Create a non-root user
RUN useradd -m appuser

# Copy built wheels and install
COPY --from=builder /app/wheels /wheels
COPY --from=builder /app/requirements.txt .
RUN pip install --no-cache /wheels/*

# Install runtime dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends postgresql-client libpq-dev && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Copy project files
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput

# Change ownership to non-root user
RUN chown -R appuser:appuser /app
USER appuser

# Run as non-root user
EXPOSE 8000


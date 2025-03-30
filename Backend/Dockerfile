# Dockerfile with CI/CD integration
FROM python:3.11-slim

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# Set work directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    build-essential \
    libpq-dev \
    graphviz \
    graphviz-dev \
    pkg-config \
    python3-dev \
    git \
    && rm -rf /var/lib/apt/lists/*

# Install Redis
RUN apt-get update && apt-get install -y redis-server

# Upgrade pip
RUN pip install --upgrade pip

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Install CI/CD tools
RUN pip install pytest pytest-cov flake8

# Copy project files
COPY . .

# Add CI/CD scripts
RUN mkdir -p /app/ci

# Create CI/CD entry script
RUN echo '#!/bin/bash\n\
set -e\n\
\n\
# Run linting\n\
echo "Running code quality checks..."\n\
flake8 .\n\
\n\
# Run tests\n\
echo "Running tests..."\n\
pytest --cov=. --cov-report=xml\n\
\n\
# If we are on main branch and this is a deployment\n\
if [ "$CI_DEPLOY" = "true" ]; then\n\
  echo "Performing deployment steps..."\n\
  python manage.py collectstatic --noinput\n\
  python manage.py migrate\n\
fi\n\
\n\
echo "CI/CD process completed successfully"' > /app/ci/run_ci.sh

RUN chmod +x /app/ci/run_ci.sh

# Collect static files
RUN python manage.py collectstatic --noinput

# Create main entrypoint script
RUN echo '#!/bin/sh\n\
\n\
# Check if running in CI mode\n\
if [ "$CI_MODE" = "true" ]; then\n\
  echo "Running in CI/CD mode"\n\
  /app/ci/run_ci.sh\n\
  exit $?\n\
fi\n\
\n\
# Normal application startup\n\
redis-server &\n\
python manage.py migrate\n\
daphne -b 0.0.0.0 -p 8000 Backend.asgi:application' > /entrypoint.sh

RUN chmod +x /entrypoint.sh

# Expose ports for Django and Daphne (WebSocket)
EXPOSE 8000

# Set entrypoint
ENTRYPOINT ["/entrypoint.sh"]

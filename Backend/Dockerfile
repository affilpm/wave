# Dockerfile
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
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip
RUN pip install --upgrade pip

# Copy requirements file
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy project files
COPY . .


# Expose port for Daphne (WebSocket)
EXPOSE 8000

# Create entrypoint script
RUN echo '#!/bin/sh\n\
python manage.py migrate\n\
python manage.py collectstatic --noinput\n\
daphne -b 0.0.0.0 -p 8000 Backend.asgi:application' > /entrypoint.sh

RUN chmod +x /entrypoint.sh

# Set entrypoint
ENTRYPOINT ["/entrypoint.sh"]

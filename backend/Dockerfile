FROM python:3.10-slim

WORKDIR /app

RUN groupadd --system hospital && useradd --system --gid hospital --home-dir /app hospital

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY --chown=hospital:hospital . .

USER hospital

# Expose port
EXPOSE 8000

# Start FastAPI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]

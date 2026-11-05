FROM python:3.11-slim

WORKDIR /app

# Docker CLI only (pinned), copied from the official image: no daemon, no install script.
COPY --from=docker:27.5.1-cli /usr/local/bin/docker /usr/local/bin/docker

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]

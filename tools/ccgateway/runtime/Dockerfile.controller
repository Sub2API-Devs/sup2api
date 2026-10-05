FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY manager.py network.py ./
# Reported by GET /health; CI passes the source commit. An installer may
# still override it with CCG_CONTROLLER_VERSION in the environment file.
ARG VERSION=dev
ENV CCG_CONTROLLER_VERSION=$VERSION
CMD ["python", "manager.py"]

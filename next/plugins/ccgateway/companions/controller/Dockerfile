FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY manager.py common.py dockerfs.py http_api.py worker_update.py runtime_admin.py network.py images.py upgrade.py cli_profiles.py runtime_updates.py shared_egress.py cleanup.py ./
LABEL io.sup2api.ccgateway.shared-egress="1"
# Reported by GET /health; CI passes the source commit. An installer may
# still override it with CCG_CONTROLLER_VERSION in the environment file.
ARG VERSION=dev
ENV CCG_CONTROLLER_VERSION=$VERSION
ENV CCG_DEFAULT_CLI_VERSION=2.1.310
CMD ["python", "manager.py"]

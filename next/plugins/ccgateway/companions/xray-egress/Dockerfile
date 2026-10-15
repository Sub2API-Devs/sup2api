FROM python:3.12-alpine
RUN apk add --no-cache iproute2 nftables ca-certificates unzip curl \
 && curl -fsSL --retry 3 https://github.com/XTLS/Xray-core/releases/download/v26.3.27/Xray-linux-64.zip -o /tmp/xray.zip \
 && echo '23cd9af937744d97776ee35ecad4972cf4b2109d1e0fe6be9930467608f7c8ae  /tmp/xray.zip' | sha256sum -c - \
 && unzip /tmp/xray.zip xray -d /usr/local/bin && chmod 755 /usr/local/bin/xray \
 && rm /tmp/xray.zip
COPY service.py /usr/local/lib/ccg/service.py
LABEL io.sup2api.ccgateway.shared-egress="1"
ENTRYPOINT ["python", "/usr/local/lib/ccg/service.py"]

#!/bin/sh
# Prepares ~/sup2api-managed on the server: .env from the existing sup2api
# secrets, cluster CA and certificates, release signing key, shell image and
# signed core releases. Re-running keeps existing keys and certificates.
set -eu
M=$HOME/sup2api-managed
SRC=$HOME/sup2api/src/next
cd "$M"
umask 077
mkdir -p certs keys publish stage config

# ---- .env: same database, Redis and secrets as the single stack
if [ ! -f .env ]; then
  grep -E '^(PG_PASSWORD|SUB2API_MASTER_KEY|SUB2API_JWT_SECRET|SUB2API_BOOTSTRAP_ADMIN_EMAIL|SUB2API_BOOTSTRAP_ADMIN_PASSWORD)=' "$HOME/sup2api/.env" > .env
  kid=$(docker run --rm --entrypoint cat sup2api:latest /opt/sub2api/market/dev-official.keyid | tr -d ' \r\n')
  pub=$(docker run --rm --entrypoint cat sup2api:latest /opt/sub2api/market/dev-official.pub | tr -d ' \r\n')
  printf "PLUGIN_TRUST_KEY=%s=%s\n" "$kid" "$pub" >> .env
  printf "MARKET_SOURCES='[{\"name\":\"local-dev\",\"url\":\"http://market:8080/index.json\",\"public_key\":\"%s\"}]'\n" "$pub" >> .env
fi

# ---- cluster CA, node and release-origin certificates
if [ ! -f certs/ca.key ]; then
  openssl req -x509 -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes -days 3650 -subj "/CN=sup2api cluster CA" -keyout certs/ca.key -out certs/ca.crt 2>/dev/null
  for n in sup2api-1 sup2api-2 sup2api-3 sup2api-4 releases; do
    mkdir -p certs/$n
    openssl req -newkey ec -pkeyopt ec_paramgen_curve:P-256 -nodes -subj "/CN=$n" -keyout certs/$n/node.key -out certs/$n/node.csr 2>/dev/null
    printf 'subjectAltName=DNS:%s\nextendedKeyUsage=serverAuth\n' "$n" > certs/$n/ext.cnf
    openssl x509 -req -in certs/$n/node.csr -CA certs/ca.crt -CAkey certs/ca.key -CAcreateserial -days 825 -extfile certs/$n/ext.cnf -out certs/$n/node.crt 2>/dev/null
    cp certs/ca.crt certs/$n/ca.crt
    rm certs/$n/node.csr certs/$n/ext.cnf
    # Read by the container user (UID 1000 / caddy); the parent stays private.
    chmod 755 certs/$n && chmod 644 certs/$n/*
  done
fi
chmod 711 certs

# ---- images and release signing key
docker build -q -f "$SRC/deploy/shell/Dockerfile" -t sup2api-shell:local "$SRC"
if [ ! -f keys/release.key ]; then
  chmod 777 keys
  docker run --rm -v "$M/keys:/keys" --entrypoint sub2api-release sup2api-shell:local keygen --out /keys
  chmod 700 keys
fi
pub=$(tr -d ' \r\n' < keys/release.pub)
for i in 1 2 3 4; do
  cat > config/sup2api-$i.json <<JSON
{
  "root": "/var/lib/sub2api",
  "cluster_id": "sup2api",
  "node_id": "sup2api-$i",
  "primary_node": "sup2api-1",
  "public_addr": ":8080",
  "peer_addr": ":7443",
  "peer_url": "https://sup2api-$i:7443",
  "peer_auth_key": "",
  "trusted_proxies": [],
  "cert_file": "/etc/sub2api/tls/node.crt",
  "key_file": "/etc/sub2api/tls/node.key",
  "ca_file": "/etc/sub2api/tls/ca.crt",
  "trusted_keys": {"sup2api-ovh-2026": "$pub"},
  "release_origin": "https://releases/sup2api",
  "runtime_abi": "linux-static-v1",
  "core_url": "http://127.0.0.1:18080"
}
JSON
  chmod 644 config/sup2api-$i.json
done
chmod 755 config

# ---- signed core releases (stage = bin/ + builtin/ of the image build stage)
commit=$(git -C "$HOME/sup2api/src" rev-parse --short HEAD)
release() {
  ver=$1
  # A schema-changing release names the version it migrates from.
  from=${2:-}
  if [ -f "publish/v$ver.digests" ]; then
    return 0
  fi
  docker build -q --target build --build-arg VERSION="$ver" -t "sup2api-core-build:$ver" "$SRC" >/dev/null
  rm -rf "stage/$ver" && mkdir -p "stage/$ver"
  cid=$(docker create "sup2api-core-build:$ver")
  docker cp "$cid:/out/bin" "stage/$ver/bin"
  docker cp "$cid:/out/builtin" "stage/$ver/builtin"
  docker rm "$cid" >/dev/null
  chmod -R a+rX stage publish
  chmod 777 publish
  docker run --rm -v "$M/stage/$ver:/stage:ro" -v "$M/publish:/publish" -v "$M/keys/release.key:/release.key:ro" \
    -v "$SRC/deploy/shell/package-release.sh:/package-release.sh:ro" --user "$(id -u)" --entrypoint sh sup2api-shell:local \
    /package-release.sh /stage /publish /release.key sup2api-ovh-2026 "v$ver" "$commit" ${from:+"$(stage/$from/bin/sub2api schema-contract)"} | tee "publish/v$ver.digests"
  chmod 755 publish && chmod 644 publish/*
}
release 0.1.0
release 0.1.1
# 0.1.2 adds migration 0022: plugin packages leave PostgreSQL.
release 0.1.2 0.1.1
ls -la publish

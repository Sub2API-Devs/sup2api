#!/bin/sh
set -eu

output_dir=${DATA_PLANE_CERT_DIR:-./data-plane-certs}
valid_days=${DATA_PLANE_CERT_VALID_DAYS:-365}

case "$valid_days" in
  ''|*[!0-9]*)
    echo "DATA_PLANE_CERT_VALID_DAYS must be a positive integer" >&2
    exit 1
    ;;
esac
if [ "$valid_days" -le 0 ]; then
  echo "DATA_PLANE_CERT_VALID_DAYS must be a positive integer" >&2
  exit 1
fi
if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl is required" >&2
  exit 1
fi

umask 077
mkdir -p "$output_dir"
for file in ca.key ca.crt server.key server.csr server.crt client.key client.csr client.crt; do
  if [ -e "$output_dir/$file" ]; then
    echo "refusing to overwrite $output_dir/$file" >&2
    exit 1
  fi
done

openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out "$output_dir/ca.key"
openssl req -x509 -new -sha256 -key "$output_dir/ca.key" -days "$valid_days" \
  -subj "/CN=Sup2API Data Plane CA" -out "$output_dir/ca.crt"

openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out "$output_dir/server.key"
openssl req -new -sha256 -key "$output_dir/server.key" -subj "/CN=sup2api-control" \
  -out "$output_dir/server.csr"
openssl x509 -req -sha256 -in "$output_dir/server.csr" -CA "$output_dir/ca.crt" \
  -CAkey "$output_dir/ca.key" -CAcreateserial -days "$valid_days" \
  -extfile /dev/stdin -out "$output_dir/server.crt" <<'EOF'
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=serverAuth
subjectAltName=DNS:sup2api-control,DNS:sub2api
EOF

openssl genpkey -algorithm EC -pkeyopt ec_paramgen_curve:P-256 -out "$output_dir/client.key"
openssl req -new -sha256 -key "$output_dir/client.key" -subj "/CN=sup2api-gateway" \
  -out "$output_dir/client.csr"
openssl x509 -req -sha256 -in "$output_dir/client.csr" -CA "$output_dir/ca.crt" \
  -CAkey "$output_dir/ca.key" -CAcreateserial -days "$valid_days" \
  -extfile /dev/stdin -out "$output_dir/client.crt" <<'EOF'
basicConstraints=critical,CA:FALSE
keyUsage=critical,digitalSignature,keyEncipherment
extendedKeyUsage=clientAuth
subjectAltName=DNS:sup2api-gateway
EOF

rm -f "$output_dir/server.csr" "$output_dir/client.csr" "$output_dir/ca.srl"
chmod 600 "$output_dir/ca.key" "$output_dir/server.key" "$output_dir/client.key"
chmod 644 "$output_dir/ca.crt" "$output_dir/server.crt" "$output_dir/client.crt"

echo "Sup2API data-plane mTLS certificates created in $output_dir"

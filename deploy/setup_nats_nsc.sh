#!/usr/bin/env bash
# Bootstrap the Sup2API NATS Operator, Account, control-plane credentials, and
# Account issuer profile with nsc. The generated directory contains secrets.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AUTH_DIR="${NATS_AUTH_DIR:-${SCRIPT_DIR}/nats-auth}"
NSC_STORE="${AUTH_DIR}/nsc-store"
NSC_BIN="${NSC_BIN:-nsc}"
OPERATOR_NAME="${NATS_OPERATOR_NAME:-Sup2API}"
ACCOUNT_NAME="${NATS_ACCOUNT_NAME:-Workers}"
CONTROL_USER_NAME="${NATS_CONTROL_USER_NAME:-ControlPlane}"

if ! command -v "${NSC_BIN}" >/dev/null 2>&1; then
    echo "nsc is required. Install it with:" >&2
    echo "  go install github.com/nats-io/nsc/v2@v2.15.0" >&2
    exit 1
fi

for artifact in nats-server-auth.conf control.creds issuer-profile.json; do
    if [[ -e "${AUTH_DIR}/${artifact}" ]]; then
        echo "Refusing to overwrite existing ${AUTH_DIR}/${artifact}" >&2
        echo "Move the existing nats-auth directory aside before creating a new trust root." >&2
        exit 1
    fi
done

mkdir -p "${AUTH_DIR}"
chmod 700 "${AUTH_DIR}"

if ! "${NSC_BIN}" -H "${NSC_STORE}" describe operator --name "${OPERATOR_NAME}" >/dev/null 2>&1; then
    "${NSC_BIN}" -H "${NSC_STORE}" add operator --name "${OPERATOR_NAME}" --sys
fi
if ! "${NSC_BIN}" -H "${NSC_STORE}" describe account --name "${ACCOUNT_NAME}" >/dev/null 2>&1; then
    "${NSC_BIN}" -H "${NSC_STORE}" add account --name "${ACCOUNT_NAME}"
fi
"${NSC_BIN}" -H "${NSC_STORE}" edit account --name "${ACCOUNT_NAME}" \
    --js-mem-storage "${NATS_NSC_JS_MEMORY:-512m}" \
    --js-disk-storage "${NATS_NSC_JS_STORAGE:-10g}" \
    --js-streams "${NATS_NSC_JS_STREAMS:-4}" \
    --js-consumer "${NATS_NSC_JS_CONSUMERS:-16}" \
    --js-max-disk-stream "${NATS_NSC_JS_MAX_STREAM:-2g}" \
    --js-max-ack-pending "${NATS_NSC_JS_MAX_ACK_PENDING:-1024}" \
    --js-max-bytes-required
if ! "${NSC_BIN}" -H "${NSC_STORE}" describe user --account "${ACCOUNT_NAME}" --name "${CONTROL_USER_NAME}" >/dev/null 2>&1; then
    "${NSC_BIN}" -H "${NSC_STORE}" add user \
        --account "${ACCOUNT_NAME}" \
        --name "${CONTROL_USER_NAME}" \
        --allow-pub '$JS.API.>,$JS.ACK.>' \
        --allow-sub '_INBOX.>'
fi

"${NSC_BIN}" -H "${NSC_STORE}" generate creds \
    --account "${ACCOUNT_NAME}" \
    --name "${CONTROL_USER_NAME}" \
    --output-file "${AUTH_DIR}/control.creds"
"${NSC_BIN}" -H "${NSC_STORE}" generate config \
    --mem-resolver \
    --sys-account SYS \
    --config-file "${AUTH_DIR}/nats-server-auth.conf"
"${NSC_BIN}" -H "${NSC_STORE}" generate profile \
    --output-file "${AUTH_DIR}/issuer-profile.json" \
    "nsc://${OPERATOR_NAME}/${ACCOUNT_NAME}?operatorKey&operatorName&accountKey&accountName&accountSeed"

chmod 600 \
    "${AUTH_DIR}/control.creds" \
    "${AUTH_DIR}/issuer-profile.json"
chmod 644 "${AUTH_DIR}/nats-server-auth.conf"

echo "NATS NKey/JWT trust root initialized in ${AUTH_DIR}"
echo "Back up nsc-store and issuer-profile.json securely; losing them prevents identity rotation."

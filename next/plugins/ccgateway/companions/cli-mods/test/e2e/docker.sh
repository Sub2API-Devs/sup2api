#!/bin/sh
# Runs the offline regression kit (README.md in this directory) in one
# throwaway container with no network, from the image under test. With NEW=1
# the container runs the candidate Worker ($WORKER_NEW, when the file exists)
# and CLI release ($CLI_NEW: manifest.json + <CC_VERSION>/claude) mounted over
# the image's own, so the request path is the candidate's; otherwise the
# image's own pair, pinned to the CLI the image ships.
# The work directory ($B/work-<tag> on the host, a copy of this kit plus the
# official client) is /t in the container; all captures and logs land there.
#
#   B=/tmp/ccg-e2e IMG=ccgateway-app:0.1.103 OFFICIAL_CLI=/path/claude-official \
#     [CC_VERSION=2.1.304] [NEW=1] [TAG=name] [REQUEST_LOG=full] \
#     sh docker.sh all | values | extra | conc | classify | smoke | calib1 | calib2
#
# Every default below is the value the 2.1.304 runs used (release-0195..0203),
# so a run without overrides reproduces them.
set -u
CC_VERSION=${CC_VERSION:-2.1.304}                # the gateway CLI's version (manifest key, policy cli_version)
CLIENT_CC_VERSION=${CLIENT_CC_VERSION:-2.1.304}  # version inside the kit's synthetic CC client values; keep it equal across compared runs
IMG=${IMG:-ccgateway-app:0.1.94}
B=${B:-/tmp/ccg-audit-0195}
KIT=${KIT:-$(cd "$(dirname "$0")" && pwd)}
# 2.1.310's official client on ovh: $HOME/sup2api/checks/ccg-310/claude-official-310
OFFICIAL_CLI=${OFFICIAL_CLI:-$HOME/sup2api/checks/ccg-304-v12/claude-official-304}
WORKER_NEW=${WORKER_NEW:-$B/worker-new}
CLI_NEW=${CLI_NEW:-$B/cli-new}
REQUEST_LOG=${REQUEST_LOG:-}
MOUNTS=''
if [ "${NEW:-}" = 1 ]; then
  TAG=${TAG:-new}
  if [ -f "$WORKER_NEW" ]; then MOUNTS="-v $WORKER_NEW:/usr/local/bin/worker:ro"
  else echo "note: $WORKER_NEW not found, the image's own Worker runs the candidate CLI"; fi
  MOUNTS="$MOUNTS -v $CLI_NEW:/opt/ccgateway/cli:ro"
  MANIFEST=$CLI_NEW/manifest.json
else
  TAG=${TAG:-${IMG##*:}}
  MANIFEST=$B/manifest-$TAG.json
  mkdir -p "$B"
  docker run --rm --entrypoint cat "$IMG" /opt/ccgateway/cli/manifest.json > "$MANIFEST" || { echo "cannot read the CLI manifest of $IMG"; exit 2; }
fi
PIN=$(node -e 'const v=process.argv[2];const m=require(process.argv[1]).versions[v];if(!m){console.error("manifest "+process.argv[1]+" has no version "+v);process.exit(2)}console.log("WORKER_CLI_VERSION="+v+" CCG_CLI_SHA256="+m.sha256+" CCG_CLI_PATCH="+m.patch)' "$MANIFEST" "$CC_VERSION") || exit 2
if [ -n "${EXPECT_CLI_SHA:-}" ] && ! echo "$PIN" | grep -q "CCG_CLI_SHA256=$EXPECT_CLI_SHA "; then echo "CLI SHA-256 is not EXPECT_CLI_SHA: $PIN"; exit 2; fi
if [ ! -f "$OFFICIAL_CLI" ]; then echo "official client not found: $OFFICIAL_CLI (set OFFICIAL_CLI)"; exit 2; fi
if [ -n "${EXPECT_OFFICIAL_SHA:-}" ] && [ "$(sha256sum "$OFFICIAL_CLI" | cut -d' ' -f1)" != "$EXPECT_OFFICIAL_SHA" ]; then echo "official client SHA-256 is not EXPECT_OFFICIAL_SHA"; exit 2; fi
W=$B/work-$TAG
case "${1:-all}" in
  calib1) ENVS='RUN_MODE=calib' ;;
  calib2) ENVS='CALIB2=1' ;;
  smoke)  ENVS='SMOKE=1' ;;
  extra)  ENVS='RUN_MODE=extra' ;;
  conc)   ENVS='RUN_MODE=conc' ;;
  classify) ENVS='RUN_MODE=classify' ;;
  values) ENVS='RUN_MODE=values' ;;
  all)    ENVS='RUN_MODE=all' ;;
  *) echo "usage: $0 all|values|extra|conc|classify|smoke|calib1|calib2"; exit 2 ;;
esac
# The work directory is created once per tag; delete it to start over (files
# in it belong to UID 1000, see README).
if [ ! -d "$W" ]; then
  mkdir -p "$W/bin"; chmod 777 "$W"; cp "$KIT"/*.sh "$KIT"/*.cjs "$W/"
  cp "$OFFICIAL_CLI" "$W/bin/claude-official"; chmod 755 "$W"/bin/*
fi
docker run --rm --network none --user 1000:1000 \
  -v "$W:/t" -w /t $MOUNTS \
  -e PATH=/usr/local/bin:/usr/bin:/bin -e HOME=/t/home \
  -e "$ENVS" -e "CLI_PIN_OVERRIDE=$PIN" -e "CC_VERSION=$CC_VERSION" \
  -e "CLIENT_CC_VERSION=$CLIENT_CC_VERSION" -e "REQUEST_LOG=$REQUEST_LOG" \
  --entrypoint sh "$IMG" -c 'mkdir -p /t/home && sh /t/run.sh' > "$B/${1:-all}-$TAG.log" 2>&1
echo "exit=$? $(tail -1 "$B/${1:-all}-$TAG.log")"

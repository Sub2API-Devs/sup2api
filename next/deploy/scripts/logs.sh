#!/usr/bin/env bash
# logs.sh [service...] [compose logs flags] — run ON the test server.
#   logs.sh                 follow all services (last 200 lines)
#   logs.sh node-1 node-2   follow the nodes
#   LOGS_FOLLOW=0 logs.sh   print and exit
source "$(dirname "$0")/lib.sh"
ensure_env
FLAGS=(--tail="${LOGS_TAIL:-200}")
if [ "${LOGS_FOLLOW:-1}" = 1 ]; then FLAGS+=(-f); fi
compose logs "${FLAGS[@]}" "$@"

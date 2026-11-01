set -u
umask 077
APP='placeholder-app:0'
EGRESS='placeholder-egress:0'
CTL='placeholder-controller:0'
ROOT='/opt/ccgateway-runtime'
ENVF='/opt/ccgateway-runtime.env'
for img in "$APP" "$EGRESS"; do
  docker image inspect "$img" >/dev/null 2>&1 || docker pull -q "$img" >/dev/null 2>&1 || true
done
docker image inspect "$CTL" >/dev/null 2>&1 || docker pull -q "$CTL" >/dev/null 2>&1 || { echo CCG_RESULT=image_pull_failed; exit 1; }
mkdir -p "$ROOT" && chmod 700 "$ROOT" || { echo CCG_RESULT=install_failed; exit 1; }
if ! { cat > "$ENVF.tmp" && chmod 600 "$ENVF.tmp" && mv -f "$ENVF.tmp" "$ENVF"; }; then
  rm -f "$ENVF.tmp"; echo CCG_RESULT=install_failed; exit 1
fi
# An install interrupted after the rename left only the previous controller.
if ! docker inspect --type container ccg-controller >/dev/null 2>&1 && docker inspect --type container ccg-controller-prev >/dev/null 2>&1; then
  docker rename ccg-controller-prev ccg-controller >/dev/null 2>&1
fi
docker rm -f ccg-controller-prev >/dev/null 2>&1
if docker inspect --type container ccg-controller >/dev/null 2>&1; then
  docker rename ccg-controller ccg-controller-prev >/dev/null 2>&1 || { echo CCG_RESULT=install_failed; exit 1; }
  docker stop ccg-controller-prev >/dev/null 2>&1
fi
if ! docker run -d --name ccg-controller --restart unless-stopped --network host \
  --env-file "$ENVF" -v /var/run/docker.sock:/var/run/docker.sock -v "$ROOT:$ROOT" \
  --log-opt max-size=20m --log-opt max-file=3 "$CTL" >/dev/null 2>&1; then
  docker rm -f ccg-controller >/dev/null 2>&1
  if docker inspect --type container ccg-controller-prev >/dev/null 2>&1; then
    docker rename ccg-controller-prev ccg-controller >/dev/null 2>&1 && docker start ccg-controller >/dev/null 2>&1
  fi
  echo CCG_RESULT=controller_unhealthy; exit 1
fi
echo CCG_RESULT=started

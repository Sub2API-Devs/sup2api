#!/bin/sh
# Prepare one signed core release from an exact clean Git checkout.
# Does not import, create an upgrade plan, restart or replace any service.
set -eu
[ "$#" = 2 ] || { echo 'usage: prepare-core-release.sh VERSION FULL_GIT_SHA' >&2; exit 2; }
version=$1
sha=$2
printf '%s\n' "$version" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+$' || exit 2
printf '%s\n' "$sha" | grep -Eq '^[0-9a-f]{40}$' || exit 2
src=$(CDPATH= cd -- "$(dirname -- "$0")/../../.." && pwd)
repo=$(git -C "$src" rev-parse --show-toplevel)
[ "$(git -C "$repo" rev-parse HEAD)" = "$sha" ] || { echo 'Git SHA mismatch' >&2; exit 1; }
[ -z "$(git -C "$repo" status --porcelain --untracked-files=all)" ] || { echo 'Git checkout must be clean' >&2; exit 1; }
managed=${SUP2API_MANAGED_DIR:-$HOME/sup2api-managed}
stage=$managed/stage/$version
publish=$managed/publish/sup2api
digests=$managed/publish/v$version.digests
[ ! -e "$stage" ] && [ ! -e "$digests" ] || { echo 'release version already reserved; refusing overwrite' >&2; exit 1; }
[ -s "$managed/keys/release.key" ] && [ -s "$managed/keys/release.pub" ] || { echo 'existing release key required' >&2; exit 1; }
tag=sup2api-core-build:$version
if docker image inspect "$tag" >/dev/null 2>&1; then echo 'image tag already exists' >&2; exit 1; fi
[ "$(docker info --format '{{.CgroupDriver}} {{.CgroupVersion}}')" = 'systemd 2' ] || { echo 'requires systemd cgroup v2' >&2; exit 1; }
docker buildx build --help | grep -q -- --cgroup-parent || exit 1
source_schema=
source_version=
trust_hash=
for node in sup2api-1 sup2api-2 sup2api-3 sup2api-4; do
  schema=$(docker exec "$node" /var/lib/sub2api/current/bin/sub2api schema-contract)
  oldversion=$(docker exec "$node" /var/lib/sub2api/current/bin/sub2api version)
  trust=$(docker exec "$node" sha256sum /var/lib/sub2api/current/builtin/trust.pub | cut -d ' ' -f1)
  [ -n "$schema" ] && [ -n "$trust" ] || exit 1
  if [ -n "$source_schema" ]; then
    [ "$schema" = "$source_schema" ] && [ "$oldversion" = "$source_version" ] && [ "$trust" = "$trust_hash" ] || { echo 'live nodes disagree' >&2; exit 1; }
  fi
  source_schema=$schema; source_version=$oldversion; trust_hash=$trust
done
[ "$version" != "$source_version" ] || { echo 'target is already live' >&2; exit 1; }
[ "$(printf '%s\n%s\n' "$source_version" "$version" | sort -V | tail -1)" = "$version" ] || { echo 'target version must increase' >&2; exit 1; }
# Only this unique temporary slice is changed. The default BuildKit builder and
# named caches (including signing keys) are retained.
slice=sup2apibuild$(date -u +%Y%m%d%H%M%S)$$.slice
cid=
cleanup() {
  [ -z "$cid" ] || docker rm "$cid" >/dev/null 2>&1 || true
  sudo systemctl stop "$slice" >/dev/null 2>&1 || true
  sudo systemctl revert "$slice" >/dev/null 2>&1 || true
}
trap cleanup EXIT
trap 'exit 130' INT TERM
sudo systemctl start "$slice"
sudo systemctl set-property --runtime "$slice" CPUQuota=200% MemoryMax=4G MemorySwapMax=0 TasksMax=512
control=$(sudo systemctl show "$slice" --property=ControlGroup --value)
[ "$(cat "/sys/fs/cgroup$control/cpu.max")" = '200000 100000' ] || { echo 'CPU quota not applied' >&2; exit 1; }
[ "$(cat "/sys/fs/cgroup$control/memory.max")" = '4294967296' ] || { echo 'memory quota not applied' >&2; exit 1; }
mkdir -p "$managed/stage" "$publish"
mkdir "$stage"
printf 'source_commit=%s\nsource_version=%s\nsource_schema=%s\ntrust_sha256=%s\nslice=%s\n' "$sha" "$source_version" "$source_schema" "$trust_hash" "$slice" > "$stage/preparation.txt"
docker buildx build --builder default --cgroup-parent "$slice" --target build --load \
  --build-arg VERSION="$version" --build-arg REQUIRE_EXISTING_DEV_KEY=1 \
  -f "$src/Dockerfile" -t "$tag" "$src"
cid=$(docker create "$tag")
docker cp "$cid:/out/bin" "$stage/bin"
docker cp "$cid:/out/builtin" "$stage/builtin"
docker rm "$cid" >/dev/null
cid=
[ "$(git -C "$repo" rev-parse HEAD)" = "$sha" ] && [ -z "$(git -C "$repo" status --porcelain --untracked-files=all)" ] || { echo 'checkout changed during build' >&2; exit 1; }
[ "$("$stage/bin/sub2api" version)" = "$version" ] || { echo 'candidate version mismatch' >&2; exit 1; }
[ "$(sha256sum "$stage/builtin/trust.pub" | cut -d ' ' -f1)" = "$trust_hash" ] || { echo 'plugin signing trust changed; release not packaged' >&2; exit 1; }
# Package only bin and builtin, not local preparation evidence.
payload=$stage/payload
mkdir "$payload"
mv "$stage/bin" "$stage/builtin" "$payload/"
gateway_image=$(docker inspect sup2api-1 --format '{{.Image}}')
docker run --rm --network none --user "$(id -u):$(id -g)" \
  -v "$payload:/stage:ro" -v "$publish:/publish" \
  -v "$managed/keys/release.key:/release.key:ro" \
  -v "$src/deploy/gateway/package-release.sh:/package-release.sh:ro" \
  --entrypoint sh "$gateway_image" /package-release.sh /stage /publish /release.key \
  sup2api-ovh-2026 "v$version" "$sha" "$source_schema" > "$stage/digests.pending"
# noclobber prevents another preparer from replacing an existing release record.
(set -C; cat "$stage/digests.pending" > "$digests")
cat "$digests"
printf 'Prepared v%s only; no import or service update performed.\n' "$version"

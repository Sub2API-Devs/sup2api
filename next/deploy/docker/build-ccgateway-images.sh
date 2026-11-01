#!/bin/sh
# build-ccgateway-images.sh <plugin version> <output dir>
#
# Builds the CCGateway runtime images and writes them, with images.json, for
# the ccgateway plugin package (CONTRACTS §53.10). Runs on a host WITH Docker,
# before the core image is built (the Dockerfile's build stage has no Docker
# daemon); build-go.sh then packs <output dir> into the plugin as images/.
#
#   sh next/deploy/docker/build-ccgateway-images.sh 0.1.16 next/plugins/ccgateway/images
#
# Output (every file replaced atomically; images.json is written last):
#   <out>/app.tar.gz          ccgateway-app:<version>         (worker)
#   <out>/egress.tar.gz       ccgateway-egress:<version>      (shared Xray egress gateway)
#   <out>/controller.tar.gz   ccgateway-controller:<version>  (Go controller, runs under the guard)
#   <out>/gateway.tar.gz      $CCG_CADDY_IMAGE                (Caddy gateway)
#   <out>/images.json         {"version":1,"images":{role:{ref,file,sha256,size[,labels]}}}
# Each archive is `docker save <ref> | gzip`, loadable with `docker load`.
# The controller's entry carries "labels": {"io.sup2api.ccgateway.guard-api":
# "1"} (CONTRACTS §76.6): the core reads it to refuse a self-upgrade of a
# controller the guard has not adopted yet; older cores ignore it.
#
# The guard (ghcr.io/sub2api-devs/ccgateway-guard, CONTRACTS §76) is never in
# the package: CI pushes it to GHCR. With CCG_BUILD_GUARD=1 this script also
# builds ccgateway-guard:<version> from companions/guard on this host (for a
# host that cannot pull the GHCR package; set CCG_GUARD_IMAGE in
# /opt/ccgateway/.env or images.guard to it), without saving it.
#
# <version> must equal plugins/ccgateway/manifest.json's version: images change
# only together with the plugin version (a controller that already has
# ccgateway-app:<version> is not sent the archive again).
#
# Environment:
#   CCG_CADDY_IMAGE   Caddy image (default below). Must carry a fixed x.y.z tag
#                     and no digest: `docker save` of a digest reference loads
#                     untagged, and floating tags (latest, 2-alpine) are refused.
#   CCG_CGROUP_PARENT passed to `docker build --cgroup-parent` (resource-limited
#                     builds on a production host, see prepare-core-release.sh).
#   CCG_CONTROLLER_IMPL  go (default): companions/controller-go, must carry the
#                     guard-api=1 and shared-egress=1 labels. python: the old
#                     controller of companions/controller (0.1.118 and earlier),
#                     only to rebuild a package for a rollback.
#   CCG_BUILD_GUARD   1: also build ccgateway-guard:<version> (not packed).
#
# POSIX sh (dash), GNU coreutils, gzip, git and docker.
set -eu

# Pinned Caddy release; bump on purpose together with the plugin version.
DEFAULT_CADDY_IMAGE=caddy:2.11.7-alpine

die() { echo "build-ccgateway-images: $*" >&2; exit 1; }

if [ "$#" -ne 2 ]; then
  sed -n '2,44p' "$0" >&2
  exit 2
fi
version=$1
out=$2
printf '%s\n' "$version" | grep -Eq '^[0-9]+\.[0-9]+\.[0-9]+(-[0-9A-Za-z.-]+)?$' || die "invalid plugin version: $version"
[ -n "$out" ] || die 'empty output directory'
caddy=${CCG_CADDY_IMAGE:-$DEFAULT_CADDY_IMAGE}
# Same reference rule as the core (§49.16), tagged, no digest, fixed x.y.z tag.
printf '%s\n' "$caddy" | grep -Eq '^[a-z0-9][a-z0-9._/-]{0,127}:[A-Za-z0-9._-]{1,128}$' || die "CCG_CADDY_IMAGE must be name:tag without a digest: $caddy"
printf '%s\n' "${caddy##*:}" | grep -Eq '(^|[^0-9])[0-9]+\.[0-9]+\.[0-9]+' || die "CCG_CADDY_IMAGE must have a fixed x.y.z tag, not a floating one: $caddy"

NEXT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
companions=$NEXT/plugins/ccgateway/companions
manifest=$NEXT/plugins/ccgateway/manifest.json
[ -f "$companions/worker/Dockerfile" ] || die "$companions/worker/Dockerfile not found"
impl=${CCG_CONTROLLER_IMPL:-go}
case "$impl" in
  go) controller_dir=$companions/controller-go ;;
  python) controller_dir=$companions/controller ;;
  *) die "CCG_CONTROLLER_IMPL must be go or python: $impl" ;;
esac
[ -f "$controller_dir/Dockerfile" ] || die "$controller_dir/Dockerfile not found"
build_guard=${CCG_BUILD_GUARD:-0}
case "$build_guard" in 0|1) ;; *) die "CCG_BUILD_GUARD must be 0 or 1: $build_guard" ;; esac
[ "$build_guard" = 0 ] || [ -f "$companions/guard/Dockerfile" ] || die "$companions/guard/Dockerfile not found"
manifest_version=$(sed -n 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$manifest" | head -n1)
[ "$manifest_version" = "$version" ] || die "version $version differs from $manifest ($manifest_version); bump the plugin version together with its images"

for tool in docker git gzip sha256sum stat; do
  command -v "$tool" >/dev/null 2>&1 || die "$tool not found"
done

revision=$(git -C "$NEXT" rev-parse HEAD) || die 'not a git checkout'
if [ -n "$(git -C "$NEXT" status --porcelain -- plugins/ccgateway/companions)" ]; then
  revision="$revision-dirty"
  echo "warning: plugins/ccgateway/companions has uncommitted changes; revision $revision" >&2
fi
short=$(printf '%.12s' "$revision")
docker info >/dev/null 2>&1 || die 'the Docker daemon is not reachable'

mkdir -p "$out"
out=$(CDPATH= cd -- "$out" && pwd)
# Work next to the output so the final moves are renames on one file system.
# The leading dot keeps sub2api-plugin pack from ever picking it up.
work=$(mktemp -d "$out/.build.XXXXXX")
cleanup() { rm -rf "$work"; }
trap cleanup EXIT
trap 'exit 130' INT TERM

set --
if [ -n "${CCG_CGROUP_PARENT:-}" ]; then
  set -- --cgroup-parent "$CCG_CGROUP_PARENT"
fi
labels="--label org.opencontainers.image.revision=$revision --label org.opencontainers.image.version=$version"

app=ccgateway-app:$version
egress=ccgateway-egress:$version
controller=ccgateway-controller:$version
guard=ccgateway-guard:$version

echo "==> building $app (worker, revision $revision)"
# shellcheck disable=SC2086
docker build "$@" $labels -f "$companions/worker/Dockerfile" \
  --build-arg WORKER_VERSION="$version" --build-arg SOURCE_REVISION="$revision" \
  -t "$app" "$companions"
echo "==> building $egress"
# shellcheck disable=SC2086
docker build "$@" $labels -t "$egress" "$companions/xray-egress"
echo "==> building $controller ($impl controller, VERSION $short)"
# shellcheck disable=SC2086
docker build "$@" $labels --build-arg VERSION="$short" -f "$controller_dir/Dockerfile" -t "$controller" "$controller_dir"
label() { docker image inspect --format "{{index .Config.Labels \"$2\"}}" "$1"; }
[ "$(label "$controller" io.sup2api.ccgateway.shared-egress)" = 1 ] || die "$controller lacks io.sup2api.ccgateway.shared-egress=1"
guard_api=$(label "$controller" io.sup2api.ccgateway.guard-api)
if [ "$impl" = go ]; then
  # A controller without the label would be installed the docker run way.
  [ "$guard_api" = 1 ] || die "$controller lacks io.sup2api.ccgateway.guard-api=1"
else
  [ "$guard_api" != 1 ] || die "the python controller $controller must not carry io.sup2api.ccgateway.guard-api=1"
fi
if [ "$build_guard" = 1 ]; then
  echo "==> building $guard (not packed)"
  # shellcheck disable=SC2086
  docker build "$@" $labels --build-arg VERSION="$short" -f "$companions/guard/Dockerfile" -t "$guard" "$companions/guard"
fi
echo "==> pulling $caddy"
docker pull "$caddy"

# save <role> <ref>: <work>/<role>.tar.gz. POSIX sh has no pipefail, so a
# failing `docker save` is recorded in a marker file instead of being lost in
# the pipeline's status (which is gzip's).
save() {
  role=$1
  ref=$2
  arch=$(docker image inspect --format '{{.Os}}/{{.Architecture}}' "$ref")
  [ "$arch" = linux/amd64 ] || echo "warning: $ref is $arch, the runtime hosts are linux/amd64" >&2
  echo "==> saving $ref ($arch) -> $role.tar.gz"
  rm -f "$work/$role.failed"
  { docker save "$ref" || : > "$work/$role.failed"; } | gzip -6 -n > "$work/$role.tar.gz"
  [ ! -e "$work/$role.failed" ] || die "docker save $ref failed"
  gzip -t "$work/$role.tar.gz" || die "$role.tar.gz is not a valid gzip file"
}
save app "$app"
save egress "$egress"
save controller "$controller"
save gateway "$caddy"

entry() {
  role=$1
  ref=$2
  file=$role.tar.gz
  sum=$(sha256sum "$work/$file" | cut -d ' ' -f1)
  size=$(stat -c %s "$work/$file")
  printf '    "%s": {"ref": "%s", "file": "%s", "sha256": "%s", "size": %s' "$role" "$ref" "$file" "$sum" "$size"
  [ "$role" != controller ] || [ "$guard_api" != 1 ] || printf ', "labels": {"io.sup2api.ccgateway.guard-api": "1"}'
  printf '}'
}
{
  printf '{\n  "version": 1,\n  "images": {\n'
  entry app "$app"; printf ',\n'
  entry egress "$egress"; printf ',\n'
  entry controller "$controller"; printf ',\n'
  entry gateway "$caddy"; printf '\n'
  printf '  }\n}\n'
} > "$work/images.json"

# Readers key on images.json: drop the old one first so no reader pairs it
# with a half-replaced set, move the archives, then publish the new index.
rm -f "$out/images.json"
for role in app egress controller gateway; do
  mv -f "$work/$role.tar.gz" "$out/$role.tar.gz"
done
mv -f "$work/images.json" "$out/images.json"
cat "$out/images.json"
ls -l "$out"
if [ "$build_guard" = 1 ]; then
  echo "guard: $guard $(docker image inspect --format '{{.Id}}' "$guard")"
fi

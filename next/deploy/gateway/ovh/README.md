# sup2api on ovh: gateway-managed cluster

Since 2026-10-02 the `sup2api` stack on ovh runs as four gateway-managed nodes
instead of the two `single/` app containers. The files here are the copy kept
in git of `~/sup2api-managed` on the server; `.env`, `certs/`, `keys/`,
`stage/` and `publish/` exist only on the server.

| Node | Port | Role |
|---|---|---|
| sup2api-1 | 3130 | primary |
| sup2api-2 | 3131 | follower (was the second app node's port) |
| sup2api-3 | 3132 | follower |
| sup2api-4 | 3133 | follower |

The nodes share the existing `sup2api` PostgreSQL, Redis and plugin market
(network `sup2api_default`) and the same master key, JWT secret and admin as
before. `releases` serves the signed core releases over HTTPS with a
certificate from the cluster CA (`certs/ca.crt`).

Each node is limited to 2 CPUs (`cpus: 2`). CPU protection (System settings →
CPU protection, one setting for the whole cluster) compares a node's load with
its own quota; without a quota a node would see all 384 host CPUs and never
reach the threshold.

**Do not run `deploy/single/deploy.sh` on ovh any more.** It would start the old
app containers on 3130/3131 next to the managed nodes. Core updates are
releases, applied with a primary-first plan.

## Shipping a new core version

Core 0.1.16 puts CCGateway management in the plugin detail Settings tab, opened
from the plugin list row. The old management URL redirects there. Schema-based
plugin settings also have a row action. CCGateway's backend remains core-hosted;
this release changes navigation, not the backend plugin boundary.
The bundled `ccgateway` managed account plugin is initially
installed disabled. Configure the remote connection and enable the plugin.
With per-account runtimes (the ovh setup) each Claude Code account is
authorized in account management, not on the plugin page: create or edit the
CCGateway account there and bind a proxy (required: an account without a usable
proxy stays `blocked`, there is no direct fallback). Saving starts that
account's container at once; the editor then fetches the authorization link,
you sign in to Claude and paste the `code#state` back, and Claude Code inside
the container completes the login. A reload resumes a pending authorization.
The plugin page only shows container state and links to the account
(CONTRACTS §49). Connection settings are shared across nodes and encrypted
with the existing core master key. No gateway image or environment change is
required for SSH mode.

The OVH-to-cc-max dedicated SSH key and pinned `known_hosts` live in the private
`~/sup2api-managed/ccgateway/` directory. After deployment,
`python3 verify-ccgateway.py --configure` installs that identity and the existing
sidecar keys using the admin API; a run without `--configure` only verifies the
saved connection and checks all four entrances. Neither run performs Claude
OAuth login or model generation. The script prints no credentials.
Use `--enable-plugin` explicitly to enable the bundled managed account plugin;
verification reports its active version and per-node state.

On the server, after the change is committed and pushed:

```sh
git -C ~/sup2api/src fetch --depth 1 origin feat/next-platform && git -C ~/sup2api/src checkout -B feat/next-platform FETCH_HEAD
cd ~/sup2api-managed
# add `release <version>` for the new version at the end of prepare.sh, or run its steps by hand
sh prepare.sh
docker compose --env-file .env exec -T sup2api-1 sub2api-gateway import -config /etc/sub2api/shell.json \
  -manifest https://releases/sup2api/$(grep manifest_digest publish/v<version>.digests | cut -d= -f2).json
```

Then create the update in the console (System → Core updates), or record it
with the observer:

```sh
python3 upgrade_observe.py <manifest digest> [follower to restart mid-update]
python3 summarize.py upgrade-<timestamp>.log
```

The observer logs in as the bootstrap admin from `.env`, runs preflight,
creates the plan and records every 0.1–0.5 s: each entrance's status code,
the core and plugin processes inside each container (`docker top`), node
state and the current plan step. With a second argument it restarts that
follower's container once it is stopped while the primary is not serving.

A release that changes the database schema must be packed with the previous
version's `schema-contract` as `SOURCE_SCHEMA` (see `../README.md`). Never put
test-only migrations into a release for this database: later releases built
from the repository would not contain them and the cores would refuse to start.

## Rolling back to the single stack

The old containers are stopped, not removed. Backups taken before each step
are in `~/sup2api/backups/`.

```sh
cd ~/sup2api-managed && docker compose --env-file .env stop sup2api-1 sup2api-2 sup2api-3 sup2api-4
docker start sup2api-app-1 sup2api-app-2-1
```

The single stack ignores the `updater` schema the gateways created.

## Container log rotation

All five managed services use json-file rotation: 50 MB per file, five files
per container (about 250 MB maximum). Applying this setting requires container
recreation. Recreate followers one at a time, verify each entrance recovers,
then recreate the primary. Preserve state volumes and the running image IDs;
the local gateway image tag can point to a newer image than the running gateways.

## Updating the gateway state engine

Use the checked-in `roll-gateway.py` for an image-only replacement. Build a
unique tag from the synchronized Git checkout, then run its read-only review:

```sh
cd ~/sup2api/src/next
tag="sup2api-gateway:$(git rev-parse --short HEAD)-$(date -u +%Y%m%dT%H%M%SZ)"
docker build -f deploy/gateway/Dockerfile -t "$tag" .
python3 deploy/gateway/ovh/roll-gateway.py --image "$tag"
```

The default run changes no managed files or containers; an explicit fallback
image may be checked in a disposable read-only container without network access.
It checks that no core upgrade
is running or paused, all four nodes are healthy, the target image exists, and
the candidate Compose differs from the installed configuration only in gateway
images. After reviewing the result, execute the same target explicitly:

```sh
python3 deploy/gateway/ovh/roll-gateway.py --image "$tag" --apply
```

The script replaces `sup2api-2`, `sup2api-3`, `sup2api-4`, then `sup2api-1`.
After each replacement it checks the new gateway boot, unchanged core baseline,
ready/local state and the expected unauthenticated HTTP 401 response. It keeps
state volumes and the releases service, and stores prior image IDs and private
configuration backups in `~/sup2api-managed/gateway-rollbacks/`. Each node's
entrance can be unavailable while its container restarts; this is not a
zero-downtime replacement for clients pinned to that entrance.

Only after all nodes pass does it persist the candidate `compose.yml` and
`GATEWAY_IMAGE` in `.env`. Failure stops further replacements and prints a
per-node rollback command; it does not automatically roll back or blindly
resume a partial run. Do not create a core upgrade concurrently. Existing
`/etc/sub2api/shell.json`, management sockets and protocol identifiers remain
compatible; `sub2api-shell` is retained as a binary alias.

If Docker no longer has a running container's original image, optionally pass
`--rollback-image <available-old-tag>`. This is accepted only after both the
gateway and release-tool binary hashes match every affected running container.
The original image identity and the verified fallback are retained in the
rollback record. Without a matching fallback the script stops before changes.

Telemetry separation and upgrade wakeups are gateway changes; publishing a core
release alone does not apply them. First verify that no core update is running
or paused. Build a uniquely tagged gateway image, retain each running image ID,
and recreate followers one at a time before the primary, preserving state
volumes. Verify the current baseline, new gateway boot, ready state and entrance
response after each replacement. Keep the old image available for rollback.

During mixed-version operation, new gateways retain a five-second PG heartbeat
and CPU compatibility refresh for old readers. Once all enabled gateway boots
support Redis telemetry, only control-state transitions update the PG node
snapshot. Reverting a gateway binary must create a new gateway boot; its inherited
telemetry marker then no longer matches and readers use its legacy PG report.

# sup2api on ovh: shell-managed cluster

Since 2026-10-02 the `sup2api` stack on ovh runs as four shell-managed nodes
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

**Do not run `deploy/single/deploy.sh` on ovh any more.** It would start the old
app containers on 3130/3131 next to the managed nodes. Core updates are
releases, applied with a primary-first plan.

## Shipping a new core version

On the server, after the change is committed and pushed:

```sh
git -C ~/sup2api/src fetch --depth 1 origin feat/next-platform && git -C ~/sup2api/src checkout -B feat/next-platform FETCH_HEAD
cd ~/sup2api-managed
# add `release <version>` for the new version at the end of prepare.sh, or run its steps by hand
sh prepare.sh
docker compose --env-file .env exec -T sup2api-1 sub2api-shell import -config /etc/sub2api/shell.json \
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

The single stack ignores the `updater` schema the shells created.

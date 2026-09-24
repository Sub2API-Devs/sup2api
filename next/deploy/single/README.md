# sup2api single-node deployment

One sub2api-next node with its own PostgreSQL 16, Redis 7 and the signed plugin
market bundled in the image, all started by docker compose (project `sup2api`).
PostgreSQL, Redis and the market are reachable only inside the project network;
the service is published on `127.0.0.1:3130` for a reverse proxy.

| Path on the server | What |
|---|---|
| `~/sup2api/src` | sparse clone of the repo (`next/` only), branch `feat/next-platform` |
| `~/sup2api/.env` | secrets and admin account, created on the first deploy (mode 600, never in git) |
| volumes `sup2api_pgdata`, `sup2api_appdata`, `sup2api_market` | database, plugin files, market |

## Deploy / update

```bash
# from a checkout (local machine): pushes nothing, the server pulls from GitHub
ssh ovh 'bash -s' < next/deploy/single/deploy.sh
# another branch
ssh ovh 'bash -s -- my-branch' < next/deploy/single/deploy.sh
```

The script clones or fast-forwards `~/sup2api/src`, builds the image, runs
`docker compose up -d --build` and waits for `/healthz`. Data volumes survive
updates; core migrations run on start.

## Operate

```bash
cd ~/sup2api
C="docker compose -p sup2api -f src/next/deploy/single/compose.yml --env-file .env"
$C ps
$C logs -f app
$C restart app
$C down            # stop, keep data
grep ADMIN .env    # bootstrap admin account
```

Open the console through an SSH tunnel (`ssh -N -L 3130:127.0.0.1:3130 ovh`,
then http://127.0.0.1:3130), or add a site to the server's reverse proxy that
forwards to `127.0.0.1:3130` with streaming enabled (`flush_interval -1` in
Caddy) and set `SUP2API_PUBLIC_URL` in `.env` to the public URL.

The anthropic and guard plugins are in the bundled market (Plugins → Market),
signed with the key generated when the image was first built on this server.

# Claude Code accounts: authorize before saving (2026-10-05)

> **已并入 CONTRACTS §49（§49.7–§49.15）。** 以 CONTRACTS 为准；本文件只保留作为三条线当初的共同草案，不再更新。与本草案的差异见 CONTRACTS §49.9（草稿权限另接受 `account:own:create`）、§49.12（新增 `proxy_not_found`、`runtime_unavailable`）、§49.14（容器 / 控制器实现后的细节）。

User decision: a Claude Code (CCGateway `managed`) account is authorized while
it is being entered. The editor starts the account's container, the user signs
in to Claude, and only an authorized account is saved. Containers of entries
that failed, were cancelled or abandoned are removed by a periodic sweep.
All machine-readable states and errors are English codes; the console
translates them (zh/en).

This file is the shared contract of the three tracks (container/controller,
core, console). CONTRACTS §49 is updated from it.

## 1. Runtime keys

A runtime is one app container + egress container + internal network + data
volume on the remote Docker host, named `ccg-<key>-<role>`.

- Existing accounts: key = the account id (`^[1-9][0-9]{0,17}$`), unchanged.
- Drafts (created by the editor before the account exists): key =
  `d` + 16 lowercase hex characters (`^d[0-9a-f]{16}$`), random.
- When the account is saved, the draft is adopted: the account keeps using
  the draft's key for the rest of its life (containers are not renamed; the
  OAuth login lives in the data volume).

## 2. Business container management API (tools/ccgateway/auth.go)

Errors (HTTP 400, or 404 for unknown endpoints):
`{"type":"error","error":{"type":"<code>","message":"<English sentence>"}}`

| code | meaning | session after |
|---|---|---|
| `invalid_request` | body is not valid JSON / missing fields | unchanged |
| `session_not_found` | no pending login, expired, or a different session_id | none |
| `invalid_code` | not `code#state`, or the state is not this login's | kept (paste again) |
| `auth_rejected` | Claude Code rejected the authorization code | ended |
| `auth_process_failed` | the login process could not start, exited or timed out | ended |
| `invalid_auth_url` | the login URL failed validation | ended |
| `status_unavailable` | `claude auth status` could not be read | - |
| `logout_failed` | `claude auth logout` failed | - |

Endpoints (Bearer admin key, as today):

- `GET /admin/status` → `{"healthy":true,"logged_in":bool,"auth_method":string}` (unchanged).
- `GET /admin/auth/session` → `{"session":{"session_id","url","expires_at"}}` or `{"session":null}`.
- `POST /admin/auth/start` → `{"session_id","url","expires_at"}`. If an unexpired
  login is pending, the same session is returned (idempotent; no error).
- `POST /admin/auth/complete` `{"code","session_id"?}` → `{"success":true}`.
  `session_id` is optional; when given it must match the pending one.
- `POST /admin/auth/cancel` `{"session_id"?}` → `{"success":true}`, idempotent.
- `POST /admin/auth/logout` → `{"success":true}` (unchanged).

## 3. Controller API (tools/ccgateway/runtime/manager.py, 127.0.0.1:8787)

- Key pattern `^(?:[1-9][0-9]{0,17}|d[0-9a-f]{16})$` everywhere an account id
  was accepted. Paths keep the `/accounts/<key>/...` prefix.
- Pass-through adds `GET /accounts/<key>/admin/auth/session`.
- `DELETE /accounts/<key>`: draft keys only (`d…`): removes app and egress
  containers, network, data volume and the state directory. Idempotent:
  `200 {"deleted":true}` also when nothing existed. Numeric keys → 405
  (deleting an account's data stays an explicit administrator operation).
- `GET /accounts` → `{"runtimes":[{"key","status","created_at"}]}` for every
  state directory (`created_at` RFC 3339, recorded at first provision; older
  states use the directory mtime).
- The app container is recreated when the app image changes (include the
  image id in the label fingerprint next to the auth fingerprint); the data
  volume, and therefore the login, is kept.
- Controller errors: `{"error":"<code>"}` with English codes
  (`unauthorized`, `not_found`, `invalid_request`, `not_synchronized`,
  `api_key_account`, `runtime_unavailable`, `method_not_allowed`).

## 4. Core

Migration `0032_ccgateway_runtimes.sql`:

```sql
CREATE TABLE IF NOT EXISTS ccgateway_runtimes (
  key          text PRIMARY KEY,
  account_id   bigint UNIQUE REFERENCES accounts(id),
  proxy_id     bigint,
  created_by   bigint,
  created_at   timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  adopted_at   timestamptz
);
```

An account's runtime key = `ccgateway_runtimes.key` where `account_id` = the
account, else the account id.

Draft endpoints (permission: `settings:manage` or `account:create`; a draft
is only visible to its creator unless the caller has `settings:manage`;
others get 404). Every draft call updates `last_seen_at`.

| Method | Path | Body → result |
|---|---|---|
| POST | `/system/ccgateway/drafts` | `{proxy_id}` → 201 `{key}`; reconciles at once (Kick) |
| PUT | `/system/ccgateway/drafts/:key` | `{proxy_id}` → `{key}`; re-reconciles |
| DELETE | `/system/ccgateway/drafts/:key` | → 204; removes the runtime |
| GET | `/system/ccgateway/drafts/:key/status` | `{status: creating\|ready\|blocked, reason?, container}` |
| GET | `/system/ccgateway/drafts/:key/health` | `{healthy, logged_in}` |
| GET | `/system/ccgateway/drafts/:key/session` | `{session_id,url,expires_at}` or `null` |
| POST | `/system/ccgateway/drafts/:key/{sync,start,complete,cancel}` | as the account endpoints |

Account endpoints `/system/ccgateway/accounts/:id/...` stay (re-authorization
of saved accounts) and resolve the account's runtime key.

`POST /accounts` accepts `"ccgateway_runtime": "<draft key>"` for
`plugin_key=ccgateway, type=managed`: the draft must exist, be the caller's
(or the caller has `settings:manage`), not be adopted, and its container must
report `logged_in=true`; otherwise 400 with `details.reason` =
`draft_not_found` / `draft_not_authorized`. The account insert and the
adoption commit in one transaction. Without the field the old flow (save,
then authorize in the editor) still works.

Errors returned by the ccgateway endpoints: English messages, the cause in
`details.reason`: the container codes of §2, plus `not_configured` (account
runtimes off / no Docker connection), `not_synchronized` (runtime not ready
yet), `sync_failed` (container creation or proxy check failed),
`no_proxy`, `proxy_disabled`, `account_disabled`, `draft_not_found`,
`draft_not_authorized`. Blocked status reasons use the same codes.

The core no longer stores login sessions in Redis and no longer matches
message text.

Sweep (every minute, one node at a time via the cluster lock): a draft with
`account_id IS NULL` and `last_seen_at` older than 15 minutes, or
`created_at` older than 2 hours, is deleted on the controller and its row
removed. Draft keys the controller lists but the core does not know, older
than 15 minutes, are deleted too. Adopted runtimes and numeric keys are never
deleted by the sweep.

## 5. Console

New `ccgateway/managed` account: the credentials card is a step flow
before saving: choose a proxy (required) → start the container (creates the
draft) → container ready → authorization link (fetched automatically) →
paste `code#state` → authorized. The save button stays disabled until the
draft reports `logged_in`; saving sends `ccgateway_runtime`. Closing the
editor, switching the account type or failing deletes the draft (best effort;
the sweep covers the rest). Changing the proxy after the draft exists calls
`PUT drafts/:key`. A page reload loses the draft (the sweep removes it).

Editing a saved account keeps the per-account flow (status, re-authorize).

Every `details.reason` / status code is shown through i18n
(`ccgateway.reason.<code>`, zh and en); an unknown code shows the English
message.

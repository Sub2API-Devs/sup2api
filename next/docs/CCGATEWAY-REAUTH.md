# Claude Code accounts: re-authorization with a clean slate (2026-10-05)

> **Merged into CONTRACTS §49.17** (2026-10-05). That section is authoritative
> and lists where the implementation deviates from this draft.

User decision: Claude Code (CCGateway `managed`) accounts are authorized when
they are created (CONTRACTS §49.7–§49.15). A saved account can be
re-authorized later, and re-authorizing clears all of its history: the
Claude login, the conversation/session data in the container, and the core's
per-account state.

## Approach: a replacement runtime, then a swap

Re-authorization never touches the running runtime until the new login works,
so the account keeps serving during the flow and a cancelled flow changes
nothing.

1. `POST /system/ccgateway/accounts/:id/reauthorize` creates a **draft for
   this account** (same rules as §49.9 drafts: key `d` + 16 hex, proxy =
   the account's current proxy, Kick at once). Returns 201 `{key}`. At most
   one open re-authorization draft per account: a second call returns the
   existing one (200).
2. The console drives the draft with the existing draft endpoints
   (`/system/ccgateway/drafts/:key/{status,health,session,sync,start,complete,cancel}`,
   `DELETE`). Same visibility rule: the creator, or `settings:manage`.
3. `POST /system/ccgateway/accounts/:id/reauthorize/:key/commit`: the draft
   must belong to this account's re-authorization, not be adopted, and report
   `logged_in=true` (else 400 `draft_not_found` / `draft_not_authorized`).
   In one transaction:
   - the account's current runtime is **retired**: its row gets
     `account_id = NULL, retired_at = now()` (an account without a row —
     numeric key — gets a row `key = <id>, retired_at = now()` inserted);
   - the draft row gets `account_id = id, adopted_at = now()`;
   - the account's core state is cleared: `status` back to `active` if it was
     `error`, cooldown / rate-limit fields cleared, `error_message` empty,
     `account_quota_snapshots` row deleted, `last_test_*` columns NULL,
     `account_credential_refresh` row deleted (if any). Use the same code
     paths as `POST /accounts/:id/reset-status` where they exist.
   - audit `account.ccgateway_reauthorize`.
   After commit: Kick the account; the gateway routes new requests to the
   new key immediately. Returns 200 with the account view.
4. Cancelling = `DELETE /system/ccgateway/drafts/:key` (existing).

Permissions for `reauthorize` and `commit`: `settings:manage`,
`account:update`, or `account:own:update` on an account the caller created
(the §49.5 rule).

## Migration 0033 (additive)

```sql
ALTER TABLE ccgateway_runtimes ADD COLUMN IF NOT EXISTS for_account bigint;  -- re-authorization draft of this account
ALTER TABLE ccgateway_runtimes ADD COLUMN IF NOT EXISTS retired_at timestamptz;
```

`account_id` stays UNIQUE: only the active runtime of an account carries it.

## Sweep (§49.13 extended)

- Retired runtimes (`retired_at` older than 10 minutes, so in-flight requests
  on the old runtime can finish) are deleted on the controller with
  `DELETE /accounts/<key>` and, for numeric keys, the header
  `X-CCG-Delete-Account: <key>`; then the row is removed.
- Re-authorization drafts follow the draft rules (15 minutes idle, 2 hours
  maximum), like other drafts.
- Never delete the runtime an account currently uses.

## Controller (done, tools/ccgateway/runtime/manager.py)

`DELETE /accounts/<key>` deletes drafts as before; a numeric (account) key is
deleted only when the request carries `X-CCG-Delete-Account: <same key>`,
otherwise 405 `method_not_allowed`. Idempotent.

## Console

Editing a saved `ccgateway/managed` account: the credentials card shows the
current state (container, authorized or not) and a **Re-authorize** button.
It opens a confirmation explaining that the new login replaces the old one and
all history (Claude login, conversation sessions, quota snapshot, last test,
error/cooldown state) is cleared once the new login succeeds; the account keeps
serving with the old login until then. Then the same step flow as creation
(container → link → paste `code#state`) runs on the re-authorization draft,
and on `logged_in` the console calls `commit` (automatically, with a success
toast). Closing the editor or cancelling deletes the draft. A pending
re-authorization found on open (`POST reauthorize` returns the existing
draft) resumes. All states and reasons through i18n (zh/en).

The old in-place re-authorization (start/complete on the account's own
runtime) is removed from the console; the account endpoints stay for API
compatibility.

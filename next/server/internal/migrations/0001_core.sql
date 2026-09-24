-- sub2api-next core schema, version 0001.
-- Owned by the core; plugins get their own plg_<key> schemas.
-- Conventions: bigserial ids, timestamptz, money as numeric(20,8) USD,
-- localized text as jsonb {"en": "...", "zh": "..."}.

-- ============================================================ identity

CREATE TABLE users (
    id               bigserial PRIMARY KEY,
    email            varchar(255) NOT NULL,
    display_name     varchar(100) NOT NULL DEFAULT '',
    password_hash    varchar(255) NOT NULL,
    status           varchar(20)  NOT NULL DEFAULT 'active',  -- active | disabled
    max_concurrency  int          NOT NULL DEFAULT 5,          -- 0 = unlimited
    last_login_at    timestamptz,
    created_at       timestamptz  NOT NULL DEFAULT now(),
    updated_at       timestamptz  NOT NULL DEFAULT now(),
    deleted_at       timestamptz
);
CREATE UNIQUE INDEX users_email_uniq ON users (lower(email)) WHERE deleted_at IS NULL;

CREATE TABLE refresh_tokens (
    id          bigserial PRIMARY KEY,
    user_id     bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  varchar(64) NOT NULL UNIQUE,
    expires_at  timestamptz NOT NULL,
    revoked_at  timestamptz,
    created_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX refresh_tokens_user_idx ON refresh_tokens (user_id);

-- ============================================================ plugins (referenced by rbac, prices, sticky rules)

CREATE TABLE publishers (
    id           bigserial PRIMARY KEY,
    name         varchar(100) NOT NULL UNIQUE,
    trust_level  varchar(20)  NOT NULL,                  -- official | verified | community
    status       varchar(20)  NOT NULL DEFAULT 'active', -- active | revoked
    created_at   timestamptz  NOT NULL DEFAULT now(),
    revoked_at   timestamptz
);

CREATE TABLE publisher_keys (
    key_id        varchar(100) PRIMARY KEY,
    publisher_id  bigint       NOT NULL REFERENCES publishers(id) ON DELETE CASCADE,
    public_key    text         NOT NULL,                  -- base64 ed25519
    status        varchar(20)  NOT NULL DEFAULT 'active', -- active | revoked
    not_before    timestamptz,
    not_after     timestamptz,
    created_at    timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE plugins (
    key              varchar(30)  PRIMARY KEY,
    name             jsonb        NOT NULL,
    publisher_id     bigint       REFERENCES publishers(id),
    -- awaiting_consent | installed | enabling | enabled | upgrading | disabled
    status           varchar(20)  NOT NULL,
    status_reason    text         NOT NULL DEFAULT '',
    active_version   varchar(50),                          -- version serving traffic
    desired_version  varchar(50),                          -- version the cluster should run
    config_enc       bytea,                                -- plugin settings, AES-GCM
    egress_policy    varchar(20)  NOT NULL DEFAULT 'allow_all', -- allow_all | allowlist
    resource_limits  jsonb        NOT NULL DEFAULT '{}',   -- admin overrides of manifest.resources
    installed_by     bigint       REFERENCES users(id),
    installed_at     timestamptz  NOT NULL DEFAULT now(),
    updated_at       timestamptz  NOT NULL DEFAULT now(),
    row_version      bigint       NOT NULL DEFAULT 0
);

CREATE TABLE plugin_versions (
    plugin_key        varchar(30)  NOT NULL REFERENCES plugins(key) ON DELETE CASCADE,
    version           varchar(50)  NOT NULL,
    manifest          jsonb        NOT NULL,
    manifest_hash     varchar(64)  NOT NULL,
    package_sha256    varchar(64)  NOT NULL,
    package           bytea        NOT NULL,
    package_size      bigint       NOT NULL,
    publisher_id      bigint       REFERENCES publishers(id),
    key_id            varchar(100),
    -- valid | unsigned | revoked
    signature_status  varchar(20)  NOT NULL,
    -- awaiting_consent | approved | rejected
    consent_status    varchar(20)  NOT NULL DEFAULT 'awaiting_consent',
    uploaded_by       bigint       REFERENCES users(id),
    uploaded_at       timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (plugin_key, version)
);

CREATE TABLE plugin_permission_grants (
    plugin_key      varchar(30)  NOT NULL REFERENCES plugins(key) ON DELETE CASCADE,
    permission      varchar(100) NOT NULL,                 -- host permission id, e.g. "db.schema"
    scope           jsonb        NOT NULL DEFAULT '{}',    -- approved scope (may be narrower than requested)
    status          varchar(20)  NOT NULL,                 -- granted | denied | revoked
    plugin_version  varchar(50)  NOT NULL,
    manifest_hash   varchar(64)  NOT NULL,
    granted_by      bigint       REFERENCES users(id),
    granted_at      timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (plugin_key, permission)
);

CREATE TABLE plugin_migrations (
    plugin_key    varchar(30)  NOT NULL REFERENCES plugins(key) ON DELETE CASCADE,
    migration_id  varchar(200) NOT NULL,                   -- file name
    checksum      varchar(64)  NOT NULL,
    applied_at    timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (plugin_key, migration_id)
);

CREATE TABLE plugin_rollouts (
    id                       bigserial PRIMARY KEY,
    plugin_key               varchar(30) NOT NULL REFERENCES plugins(key) ON DELETE CASCADE,
    action                   varchar(20) NOT NULL,  -- enable | upgrade | disable
    from_version             varchar(50),
    target_version           varchar(50),
    -- preparing | activating | active | failed | cancelled | rolled_back
    phase                    varchar(20) NOT NULL,
    coordinator_node_id      varchar(100),
    coordinator_boot_id      varchar(64),
    coordinator_lease_until  timestamptz,
    error                    text NOT NULL DEFAULT '',
    created_by               bigint REFERENCES users(id),
    created_at               timestamptz NOT NULL DEFAULT now(),
    updated_at               timestamptz NOT NULL DEFAULT now(),
    row_version              bigint NOT NULL DEFAULT 0
);
-- at most one unfinished rollout per plugin
CREATE UNIQUE INDEX plugin_rollouts_open_uniq ON plugin_rollouts (plugin_key)
    WHERE phase IN ('preparing', 'activating');

-- per-node outcome, written when a rollout finishes (audit)
CREATE TABLE plugin_rollout_nodes (
    rollout_id  bigint       NOT NULL REFERENCES plugin_rollouts(id) ON DELETE CASCADE,
    node_id     varchar(100) NOT NULL,
    boot_id     varchar(64)  NOT NULL,
    state       varchar(20)  NOT NULL,  -- ready | active | failed
    error       text         NOT NULL DEFAULT '',
    updated_at  timestamptz  NOT NULL DEFAULT now(),
    PRIMARY KEY (rollout_id, boot_id)
);

CREATE TABLE market_sources (
    id          bigserial PRIMARY KEY,
    name        varchar(100) NOT NULL UNIQUE,
    url         text         NOT NULL,
    public_key  text         NOT NULL,  -- base64 ed25519 key that signs the index
    enabled     boolean      NOT NULL DEFAULT true,
    created_at  timestamptz  NOT NULL DEFAULT now()
);

-- ============================================================ rbac

CREATE TABLE roles (
    id           bigserial PRIMARY KEY,
    key          varchar(50) NOT NULL UNIQUE,
    name         jsonb       NOT NULL,
    description  jsonb       NOT NULL DEFAULT '{}',
    builtin      boolean     NOT NULL DEFAULT false,
    superuser    boolean     NOT NULL DEFAULT false,
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE permissions (
    id           bigserial PRIMARY KEY,
    key          varchar(150) NOT NULL UNIQUE,  -- "account:create", "plugin.guard:rules:manage"
    module       varchar(100) NOT NULL,         -- grouping in the role editor
    label        jsonb        NOT NULL,
    description  jsonb        NOT NULL DEFAULT '{}',
    source       varchar(10)  NOT NULL,         -- core | plugin
    plugin_key   varchar(30)  REFERENCES plugins(key) ON DELETE CASCADE,
    sensitive    boolean      NOT NULL DEFAULT false,
    -- active | disabled (owning plugin disabled) | removed (core permission dropped from code)
    status       varchar(10)  NOT NULL DEFAULT 'active',
    sort         int          NOT NULL DEFAULT 0,
    created_at   timestamptz  NOT NULL DEFAULT now(),
    CHECK ((source = 'plugin') = (plugin_key IS NOT NULL))
);

CREATE TABLE role_permissions (
    role_id        bigint NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    permission_id  bigint NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE user_roles (
    user_id  bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id  bigint NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- single row; bumped on every role/permission/assignment change
CREATE TABLE authz_meta (
    id       int    PRIMARY KEY CHECK (id = 1),
    version  bigint NOT NULL
);
INSERT INTO authz_meta (id, version) VALUES (1, 1);

-- ============================================================ groups, keys, proxies, accounts

CREATE TABLE groups (
    id               bigserial PRIMARY KEY,
    name             varchar(100)  NOT NULL UNIQUE,
    description      text          NOT NULL DEFAULT '',
    status           varchar(20)   NOT NULL DEFAULT 'active',  -- active | disabled
    rate_multiplier  numeric(10,4) NOT NULL DEFAULT 1,
    visibility       varchar(20)   NOT NULL DEFAULT 'public',  -- public | restricted
    model_allowlist  jsonb         NOT NULL DEFAULT '[]',      -- globs, [] = all
    created_at       timestamptz   NOT NULL DEFAULT now(),
    updated_at       timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE user_groups (
    user_id   bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id  bigint NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, group_id)
);

CREATE TABLE api_keys (
    id            bigserial PRIMARY KEY,
    user_id       bigint       NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id      bigint       NOT NULL REFERENCES groups(id),
    name          varchar(100) NOT NULL,
    key_prefix    varchar(16)  NOT NULL,          -- first chars shown in the console
    key_hash      varchar(64)  NOT NULL UNIQUE,   -- sha256 hex of the full key
    status        varchar(20)  NOT NULL DEFAULT 'active', -- active | disabled
    expires_at    timestamptz,
    last_used_at  timestamptz,
    created_at    timestamptz  NOT NULL DEFAULT now(),
    deleted_at    timestamptz
);
CREATE INDEX api_keys_user_idx ON api_keys (user_id) WHERE deleted_at IS NULL;

CREATE TABLE proxies (
    id            bigserial PRIMARY KEY,
    name          varchar(100) NOT NULL,
    protocol      varchar(10)  NOT NULL,          -- http | https | socks5
    host          varchar(255) NOT NULL,
    port          int          NOT NULL,
    username      varchar(255) NOT NULL DEFAULT '',
    password_enc  bytea,
    status        varchar(20)  NOT NULL DEFAULT 'active',
    created_at    timestamptz  NOT NULL DEFAULT now(),
    updated_at    timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE accounts (
    id               bigserial PRIMARY KEY,
    name             varchar(100) NOT NULL,
    -- no FK: accounts survive plugin uninstall (shown as orphaned)
    plugin_key       varchar(30)  NOT NULL,
    platform         varchar(50)  NOT NULL,
    type             varchar(50)  NOT NULL,
    credentials_enc  bytea        NOT NULL,       -- AES-GCM(json of sensitive + other credential fields)
    settings         jsonb        NOT NULL DEFAULT '{}',
    proxy_id         bigint       REFERENCES proxies(id) ON DELETE SET NULL,
    status           varchar(20)  NOT NULL DEFAULT 'active', -- active | disabled | error
    status_reason    text         NOT NULL DEFAULT '',
    schedulable      boolean      NOT NULL DEFAULT true,
    priority         int          NOT NULL DEFAULT 10,       -- lower first
    max_concurrency  int          NOT NULL DEFAULT 10,       -- 0 = unlimited
    last_used_at     timestamptz,
    created_by       bigint       REFERENCES users(id),
    created_at       timestamptz  NOT NULL DEFAULT now(),
    updated_at       timestamptz  NOT NULL DEFAULT now(),
    deleted_at       timestamptz
);
CREATE INDEX accounts_platform_idx ON accounts (platform, status) WHERE deleted_at IS NULL;

CREATE TABLE account_groups (
    account_id  bigint NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    group_id    bigint NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    PRIMARY KEY (account_id, group_id)
);
CREATE INDEX account_groups_group_idx ON account_groups (group_id);

-- ============================================================ scheduling

CREATE TABLE sticky_rules (
    id             bigserial PRIMARY KEY,
    name           varchar(100) NOT NULL,
    source         varchar(20)  NOT NULL,          -- plugin_default | admin
    plugin_key     varchar(30)  REFERENCES plugins(key) ON DELETE CASCADE,
    enabled        boolean      NOT NULL DEFAULT true,
    priority       int          NOT NULL DEFAULT 100,  -- lower evaluated first
    match          jsonb        NOT NULL DEFAULT '{}', -- manifest.StickyMatch
    key_sources    jsonb        NOT NULL,              -- []manifest.StickyKeySource
    value_regex    text         NOT NULL DEFAULT '',
    ttl_seconds    int          NOT NULL DEFAULT 3600,
    key_includes   jsonb        NOT NULL DEFAULT '["group","model","rule"]',
    on_failure     varchar(20)  NOT NULL DEFAULT 'failover', -- failover | stick
    updated_by     bigint       REFERENCES users(id),
    updated_at     timestamptz  NOT NULL DEFAULT now(),
    UNIQUE (name, source)
);

-- ============================================================ billing

CREATE TABLE user_balances (
    user_id     bigint        PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    balance     numeric(20,8) NOT NULL DEFAULT 0,
    updated_at  timestamptz   NOT NULL DEFAULT now()
);

CREATE TABLE balance_ledger (
    id               bigserial PRIMARY KEY,
    user_id          bigint        NOT NULL REFERENCES users(id),
    delta            numeric(20,8) NOT NULL,
    balance_after    numeric(20,8) NOT NULL,
    -- usage | admin_adjust | plugin_credit | plugin_debit | refund
    kind             varchar(30)   NOT NULL,
    ref_type         varchar(30)   NOT NULL DEFAULT '',
    ref_id           varchar(100)  NOT NULL DEFAULT '',
    idempotency_key  varchar(150)  NOT NULL UNIQUE,
    operator_id      bigint        REFERENCES users(id),
    plugin_key       varchar(30),
    note             text          NOT NULL DEFAULT '',
    created_at       timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX balance_ledger_user_idx ON balance_ledger (user_id, id DESC);

CREATE TABLE model_prices (
    id             bigserial PRIMARY KEY,
    platform       varchar(50)  NOT NULL,          -- '*' = any platform
    model_pattern  varchar(200) NOT NULL,          -- exact name or glob
    mode           varchar(20)  NOT NULL,          -- per_request | per_token | expression
    config         jsonb        NOT NULL DEFAULT '{}',
    expression     text         NOT NULL,
    expr_version   int          NOT NULL DEFAULT 1,
    expr_hash      varchar(64)  NOT NULL,
    source         varchar(20)  NOT NULL,          -- plugin_default | admin
    plugin_key     varchar(30)  REFERENCES plugins(key) ON DELETE CASCADE,
    enabled        boolean      NOT NULL DEFAULT true,
    note           text         NOT NULL DEFAULT '',
    updated_by     bigint       REFERENCES users(id),
    updated_at     timestamptz  NOT NULL DEFAULT now(),
    UNIQUE (platform, model_pattern, source)
);

CREATE TABLE model_price_history (
    expr_hash     varchar(64) PRIMARY KEY,
    expression    text        NOT NULL,
    expr_version  int         NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================ usage

CREATE TABLE usage_logs (
    id                        bigserial PRIMARY KEY,
    request_id                varchar(64)   NOT NULL UNIQUE,
    user_id                   bigint        NOT NULL,
    api_key_id                bigint        NOT NULL,
    group_id                  bigint        NOT NULL,
    account_id                bigint,
    plugin_key                varchar(30)   NOT NULL DEFAULT '',
    plugin_version            varchar(50)   NOT NULL DEFAULT '',
    platform                  varchar(50)   NOT NULL DEFAULT '',
    protocol                  varchar(100)  NOT NULL,
    endpoint                  varchar(200)  NOT NULL,
    model                     varchar(200)  NOT NULL DEFAULT '',
    upstream_model            varchar(200)  NOT NULL DEFAULT '',
    stream                    boolean       NOT NULL DEFAULT false,
    status_code               int           NOT NULL,
    success                   boolean       NOT NULL,
    -- "" | blocked_by_hook | insufficient_balance | no_account | upstream_error | client_canceled | internal
    error_type                varchar(50)   NOT NULL DEFAULT '',
    error_message             text          NOT NULL DEFAULT '',
    attempts                  int           NOT NULL DEFAULT 1,
    input_tokens              bigint        NOT NULL DEFAULT 0,
    output_tokens             bigint        NOT NULL DEFAULT 0,
    cache_read_tokens         bigint        NOT NULL DEFAULT 0,
    cache_creation_tokens     bigint        NOT NULL DEFAULT 0,
    cache_creation_1h_tokens  bigint        NOT NULL DEFAULT 0,
    metrics                   jsonb         NOT NULL DEFAULT '{}',   -- plugin usage facts
    sticky_rule               varchar(100)  NOT NULL DEFAULT '',
    sticky_hit                boolean       NOT NULL DEFAULT false,
    hook_decisions            jsonb         NOT NULL DEFAULT '[]',
    rate_multiplier           numeric(10,4) NOT NULL DEFAULT 1,
    price_id                  bigint,
    expr_hash                 varchar(64)   NOT NULL DEFAULT '',
    billing_mode              varchar(20)   NOT NULL DEFAULT '',
    matched_tier              varchar(100)  NOT NULL DEFAULT '',
    billing_detail            jsonb         NOT NULL DEFAULT '{}',
    total_cost                numeric(20,8) NOT NULL DEFAULT 0,
    -- pending | billed | failed | free
    billing_status            varchar(20)   NOT NULL DEFAULT 'pending',
    latency_ms                int           NOT NULL DEFAULT 0,
    first_token_ms            int           NOT NULL DEFAULT 0,
    client_ip                 varchar(64)   NOT NULL DEFAULT '',
    user_agent                varchar(500)  NOT NULL DEFAULT '',
    node_id                   varchar(100)  NOT NULL DEFAULT '',
    created_at                timestamptz   NOT NULL DEFAULT now()
);
CREATE INDEX usage_logs_created_idx ON usage_logs (created_at DESC);
CREATE INDEX usage_logs_user_idx ON usage_logs (user_id, created_at DESC);
CREATE INDEX usage_logs_account_idx ON usage_logs (account_id, created_at DESC);
CREATE INDEX usage_logs_billing_pending_idx ON usage_logs (id) WHERE billing_status IN ('pending', 'failed');

-- ============================================================ events, jobs, egress

-- transactional outbox; see docs/CONTRACTS.md for event types and payloads
CREATE TABLE events (
    id           bigserial PRIMARY KEY,
    type         varchar(100) NOT NULL,
    occurred_at  timestamptz  NOT NULL DEFAULT now(),
    payload      jsonb        NOT NULL
);
CREATE INDEX events_type_idx ON events (type, id);

CREATE TABLE plugin_event_cursors (
    plugin_key            varchar(30) PRIMARY KEY REFERENCES plugins(key) ON DELETE CASCADE,
    last_event_id         bigint      NOT NULL DEFAULT 0,
    consecutive_failures  int         NOT NULL DEFAULT 0,
    next_retry_at         timestamptz,
    last_error            text        NOT NULL DEFAULT '',
    updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE plugin_event_deadletters (
    id              bigserial PRIMARY KEY,
    plugin_key      varchar(30) NOT NULL REFERENCES plugins(key) ON DELETE CASCADE,
    first_event_id  bigint      NOT NULL,
    last_event_id   bigint      NOT NULL,
    error           text        NOT NULL,
    created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE plugin_job_runs (
    id            bigserial PRIMARY KEY,
    plugin_key    varchar(30)  NOT NULL REFERENCES plugins(key) ON DELETE CASCADE,
    job_id        varchar(100) NOT NULL,
    node_id       varchar(100) NOT NULL,
    scheduled_at  timestamptz  NOT NULL,
    started_at    timestamptz  NOT NULL,
    finished_at   timestamptz,
    status        varchar(20)  NOT NULL,   -- running | succeeded | failed | timeout
    manual        boolean      NOT NULL DEFAULT false,
    message       text         NOT NULL DEFAULT ''
);
CREATE INDEX plugin_job_runs_idx ON plugin_job_runs (plugin_key, job_id, id DESC);

CREATE TABLE plugin_egress_logs (
    id           bigserial PRIMARY KEY,
    plugin_key   varchar(30)  NOT NULL,
    node_id      varchar(100) NOT NULL,
    network      varchar(10)  NOT NULL,
    host         varchar(255) NOT NULL,
    port         int          NOT NULL,
    started_at   timestamptz  NOT NULL,
    duration_ms  int          NOT NULL,
    bytes_in     bigint       NOT NULL DEFAULT 0,
    bytes_out    bigint       NOT NULL DEFAULT 0,
    result       varchar(20)  NOT NULL,  -- ok | denied | dial_error | reset
    error        text         NOT NULL DEFAULT ''
);
CREATE INDEX plugin_egress_logs_idx ON plugin_egress_logs (plugin_key, started_at DESC);

-- ============================================================ settings, audit

CREATE TABLE settings (
    key         varchar(100) PRIMARY KEY,
    value       jsonb        NOT NULL,
    updated_by  bigint       REFERENCES users(id),
    updated_at  timestamptz  NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
    id           bigserial PRIMARY KEY,
    user_id      bigint,
    action       varchar(100) NOT NULL,   -- e.g. "role.update", "plugin.consent"
    target_type  varchar(50)  NOT NULL DEFAULT '',
    target_id    varchar(100) NOT NULL DEFAULT '',
    detail       jsonb        NOT NULL DEFAULT '{}',
    ip           varchar(64)  NOT NULL DEFAULT '',
    created_at   timestamptz  NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_created_idx ON audit_logs (created_at DESC);

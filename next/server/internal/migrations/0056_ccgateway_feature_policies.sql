CREATE TABLE IF NOT EXISTS ccgateway_account_feature_policies (
    account_id bigint PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,
    mode text NOT NULL CHECK (mode IN ('follow', 'custom')),
    overrides jsonb NOT NULL DEFAULT '{}' CHECK (jsonb_typeof(overrides) = 'object'),
    revision bigint NOT NULL DEFAULT 1 CHECK (revision > 0),
    updated_at timestamptz NOT NULL DEFAULT now()
);

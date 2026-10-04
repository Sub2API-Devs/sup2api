-- Payment provider instances (payment channels configuration)
CREATE TABLE IF NOT EXISTS payment_provider_instances (
    id BIGSERIAL PRIMARY KEY,
    provider_key VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}',
    enabled BOOLEAN NOT NULL DEFAULT true,
    sort_order INT NOT NULL DEFAULT 0,
    limits JSONB,
    refund_enabled BOOLEAN NOT NULL DEFAULT false,
    allow_user_refund BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_provider_instances_enabled ON payment_provider_instances(enabled, sort_order);
CREATE INDEX IF NOT EXISTS idx_payment_provider_instances_provider_key ON payment_provider_instances(provider_key);

-- Payment orders
CREATE TABLE IF NOT EXISTS payment_orders (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    out_trade_no VARCHAR(100) NOT NULL UNIQUE,
    payment_type VARCHAR(50) NOT NULL,
    payment_trade_no VARCHAR(200),
    provider_instance_id BIGINT,
    provider_key VARCHAR(50),
    provider_snapshot JSONB,
    amount DECIMAL(20, 8) NOT NULL,
    pay_amount DECIMAL(20, 8) NOT NULL,
    fee_rate DECIMAL(10, 4) NOT NULL DEFAULT 0,
    currency VARCHAR(10) NOT NULL DEFAULT 'CNY',
    order_type VARCHAR(50) NOT NULL DEFAULT 'balance',
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL,
    paid_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ,
    failed_reason TEXT,
    client_ip VARCHAR(100),
    src_host VARCHAR(255),
    src_url TEXT,
    recharge_code VARCHAR(100),
    plan_id BIGINT,
    user_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_payment_orders_provider_instance FOREIGN KEY (provider_instance_id)
        REFERENCES payment_provider_instances(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_payment_orders_user_id ON payment_orders(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payment_orders_status ON payment_orders(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_payment_orders_out_trade_no ON payment_orders(out_trade_no);
CREATE INDEX IF NOT EXISTS idx_payment_orders_payment_trade_no ON payment_orders(payment_trade_no) WHERE payment_trade_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_payment_orders_recharge_code ON payment_orders(recharge_code) WHERE recharge_code IS NOT NULL;

-- Payment audit logs
CREATE TABLE IF NOT EXISTS payment_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    provider_key VARCHAR(50),
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_payment_audit_logs_order FOREIGN KEY (order_id)
        REFERENCES payment_orders(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_payment_audit_logs_order_id ON payment_audit_logs(order_id, created_at);

-- Redeem codes
CREATE TABLE IF NOT EXISTS redeem_codes (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    code_hash VARCHAR(128) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL DEFAULT 'balance',
    value DECIMAL(20, 8) NOT NULL,
    group_id BIGINT,
    validity_days INT,
    status VARCHAR(50) NOT NULL DEFAULT 'unused',
    used_by BIGINT,
    used_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_redeem_codes_code_hash ON redeem_codes(code_hash);
CREATE INDEX IF NOT EXISTS idx_redeem_codes_status ON redeem_codes(status, expires_at);
CREATE INDEX IF NOT EXISTS idx_redeem_codes_used_by ON redeem_codes(used_by) WHERE used_by IS NOT NULL;

-- Promo codes
CREATE TABLE IF NOT EXISTS promo_codes (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(100) NOT NULL UNIQUE,
    bonus_amount DECIMAL(20, 8) NOT NULL,
    max_uses INT NOT NULL DEFAULT 0,
    used_count INT NOT NULL DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    expires_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_status ON promo_codes(status, expires_at);

-- Promo code usage records
CREATE TABLE IF NOT EXISTS promo_code_usage (
    id BIGSERIAL PRIMARY KEY,
    promo_code_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    bonus_amount DECIMAL(20, 8) NOT NULL,
    used_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_promo_code_usage_promo_code FOREIGN KEY (promo_code_id)
        REFERENCES promo_codes(id) ON DELETE CASCADE,
    UNIQUE(promo_code_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_promo_code_usage_user_id ON promo_code_usage(user_id, used_at DESC);
CREATE INDEX IF NOT EXISTS idx_promo_code_usage_promo_code_id ON promo_code_usage(promo_code_id);

-- Payment configuration settings (single row, id=1)
CREATE TABLE IF NOT EXISTS payment_config (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    enabled BOOLEAN NOT NULL DEFAULT true,
    min_amount DECIMAL(20, 8) NOT NULL DEFAULT 1,
    max_amount DECIMAL(20, 8) NOT NULL DEFAULT 10000,
    daily_limit DECIMAL(20, 8) NOT NULL DEFAULT 0,
    order_timeout_minutes INT NOT NULL DEFAULT 30,
    max_pending_orders INT NOT NULL DEFAULT 3,
    enabled_payment_types TEXT[] NOT NULL DEFAULT ARRAY['alipay', 'wxpay'],
    balance_disabled BOOLEAN NOT NULL DEFAULT false,
    balance_recharge_multiplier DECIMAL(10, 4) NOT NULL DEFAULT 1.0,
    recharge_fee_rate DECIMAL(10, 4) NOT NULL DEFAULT 0,
    load_balance_strategy VARCHAR(50) NOT NULL DEFAULT 'round-robin',
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO payment_config (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

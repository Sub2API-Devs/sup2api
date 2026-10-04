-- 0029_account_subscription_limits.sql
-- 账号订阅限额缓存表
-- 用于存储订阅类型账号（非 API Key）的限额快照，避免频繁查询上游 API

-- 主表：账号限额快照
CREATE TABLE account_subscription_limits (
    account_id      bigint       PRIMARY KEY REFERENCES accounts(id) ON DELETE CASCADE,

    -- 限额快照（JSON 格式）
    -- 结构示例：
    -- {
    --   "windows": [
    --     {"label": "5h", "seconds": 18000, "used": 3000, "limit": 10000, "reset_at": 1728640000},
    --     {"label": "1w", "seconds": 604800, "used": 12000, "limit": 50000, "reset_at": 1728691200},
    --     {"label": "daily_fable", "seconds": 86400, "used": 50, "limit": 100, "reset_at": 1728720000}
    --   ],
    --   "updated_at": 1728635000,
    --   "provider": "kimi-coding-plan"
    -- }
    limits_snapshot jsonb        NOT NULL DEFAULT '{}',

    -- 自动恢复标记（阶段 4 使用，当前暂不使用）
    disabled_at     timestamptz,
    resume_at       timestamptz,

    -- 查询元数据
    last_queried_at timestamptz  NOT NULL DEFAULT now(),
    query_count     int          NOT NULL DEFAULT 0,
    last_error      text         NOT NULL DEFAULT '',

    -- 审计字段
    created_at      timestamptz  NOT NULL DEFAULT now(),
    updated_at      timestamptz  NOT NULL DEFAULT now()
);

-- 注释
COMMENT ON TABLE account_subscription_limits IS '账号订阅限额缓存表，存储订阅类型账号的限额窗口快照';
COMMENT ON COLUMN account_subscription_limits.limits_snapshot IS '限额快照 JSON，包含多个时间窗口（5h、1w 等）的使用量和限额';
COMMENT ON COLUMN account_subscription_limits.disabled_at IS '账号因限额耗尽被禁用的时间（可选，阶段 4 自动恢复使用）';
COMMENT ON COLUMN account_subscription_limits.resume_at IS '预计自动恢复时间（基于最早的重置时间，阶段 4 使用）';
COMMENT ON COLUMN account_subscription_limits.last_queried_at IS '最后一次查询上游 API 的时间（用于缓存判断）';
COMMENT ON COLUMN account_subscription_limits.query_count IS '累计查询次数（监控用）';
COMMENT ON COLUMN account_subscription_limits.last_error IS '最后一次查询的错误信息（空字符串表示成功）';

-- 自动恢复索引（阶段 4 使用）
-- 仅索引有恢复标记的记录，加速定时任务扫描
CREATE INDEX account_subscription_limits_resume_idx
    ON account_subscription_limits (resume_at)
    WHERE resume_at IS NOT NULL;

-- 查询时间索引（用于清理旧缓存）
CREATE INDEX account_subscription_limits_queried_idx
    ON account_subscription_limits (last_queried_at);

-- 更新 updated_at 的触发器
CREATE OR REPLACE FUNCTION update_account_subscription_limits_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER account_subscription_limits_updated_at
    BEFORE UPDATE ON account_subscription_limits
    FOR EACH ROW
    EXECUTE FUNCTION update_account_subscription_limits_updated_at();

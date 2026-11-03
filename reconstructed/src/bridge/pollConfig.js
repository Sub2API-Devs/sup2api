/**
 * bridge/pollConfig.ts
 *
 * 轮询间隔配置：GrowthBook tengu_bridge_poll_interval_config 的 zod 校验与读取
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/pollConfig.ts
 * pieces: chunk-ptaf548f.js (2)
 * attribution: fingerprint 2
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, E, M } from "../../vendor/zod/v4/classic/schemas.js";
import { DEFAULT_POLL_CONFIG } from "./pollConfigDefaults.js";
import { MAX_TIMER_DELAY_MS } from "../utils/timerDelayClamp.js";
import { getFeatureValue_CACHED_WITH_REFRESH } from "../services/analytics/growthbook.js";

//@ chunk-ptaf548f.js:956-2322 fingerprint = pollIntervalConfigSchema (0.639)
/**
 * poll 配置 schema：各间隔下限、sse 连接超时、watch_sessions 系列字段，并要求满载时心跳或轮询至少开一个。
 */
var AT_CAPACITY_MESSAGE = {
  message: "must be 0 (disabled) or \u2265100ms",
};
var pollIntervalConfigSchema = DoctorLazy(() =>
  u({
    non_exclusive_heartbeat_interval_ms: E().int().min(0).default(0),
    multisession_poll_interval_ms_not_at_capacity: E()
      .int()
      .min(100)
      .default(DEFAULT_POLL_CONFIG.multisession_poll_interval_ms_not_at_capacity),
    multisession_poll_interval_ms_partial_capacity: E()
      .int()
      .min(100)
      .default(DEFAULT_POLL_CONFIG.multisession_poll_interval_ms_partial_capacity),
    multisession_poll_interval_ms_at_capacity: E()
      .int()
      .refine((v) => v === 0 || v >= 100, AT_CAPACITY_MESSAGE)
      .default(DEFAULT_POLL_CONFIG.multisession_poll_interval_ms_at_capacity),
    reclaim_older_than_ms: E().int().min(1).default(5000),
    session_keepalive_interval_v2_ms: E().int().min(0).default(120000),
    sse_connect_timeout_ms: E()
      .int()
      .max(MAX_TIMER_DELAY_MS)
      .refine((cfg) => cfg === 0 || cfg >= 20000, {
        message: "must be 0 (disabled) or \u226520000ms",
      })
      .default(DEFAULT_POLL_CONFIG.sse_connect_timeout_ms),
    watch_sessions: M().catch(DEFAULT_POLL_CONFIG.watch_sessions),
    watch_connected_poll_interval_ms: E()
      .int()
      .min(15000)
      .max(96000)
      .catch(DEFAULT_POLL_CONFIG.watch_connected_poll_interval_ms),
    watch_fallback_poll_interval_ms: E()
      .int()
      .min(15000)
      .max(96000)
      .catch(DEFAULT_POLL_CONFIG.watch_fallback_poll_interval_ms),
    watch_session_end_window_ms: E()
      .int()
      .min(0)
      .max(3600000)
      .catch(DEFAULT_POLL_CONFIG.watch_session_end_window_ms),
  }).refine(
    (cfg) => cfg.non_exclusive_heartbeat_interval_ms > 0 || cfg.multisession_poll_interval_ms_at_capacity > 0,
    {
      message:
        "at-capacity liveness requires non_exclusive_heartbeat_interval_ms > 0 or multisession_poll_interval_ms_at_capacity > 0",
    },
  ),
);
//@ chunk-ptaf548f.js:2322-2436 fingerprint = getPollIntervalConfig (1)
/**
 * 读取 tengu_bridge_poll_interval_config（5 分钟刷新），校验失败用默认值。
 */
function getPollIntervalConfig() {
  let raw = getFeatureValue_CACHED_WITH_REFRESH(
    "tengu_bridge_poll_interval_config",
    DEFAULT_POLL_CONFIG,
    300000,
  );
  let parsed = pollIntervalConfigSchema().safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_POLL_CONFIG;
}
export { getPollIntervalConfig };

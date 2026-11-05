/**
 * bridge/pollConfig.ts
 *
 * 轮询间隔配置：GrowthBook tengu_bridge_poll_interval_config 的 zod 校验与读取
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/pollConfig.ts
 * pieces: chunk-nkxt28ky.js (2)
 * attribution: fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, numberSchema, booleanSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { DEFAULT_POLL_CONFIG } from "./pollConfigDefaults.js";
import { MAX_TIMER_DELAY_MS } from "../utils/timerDelayClamp.js";
import { getFeatureValue_CACHED_WITH_REFRESH } from "../services/analytics/growthbook.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-nkxt28ky.js:956-2322 fingerprint (2.1.88 match: pollIntervalConfigSchema, 0.639)
/**
 * poll 配置 schema：各间隔下限、sse 连接超时、watch_sessions 系列字段，并要求满载时心跳或轮询至少开一个。
 */
var AT_CAPACITY_MESSAGE; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var pollIntervalConfigSchema;
deferInit("chunk-nkxt28ky.js:956", () => {
  AT_CAPACITY_MESSAGE = {
    message: "must be 0 (disabled) or \u2265100ms",
  };
  pollIntervalConfigSchema = DoctorLazy(() =>
    objectSchema({
      non_exclusive_heartbeat_interval_ms: numberSchema().int().min(0).default(0),
      multisession_poll_interval_ms_not_at_capacity: numberSchema()
        .int()
        .min(100)
        .default(DEFAULT_POLL_CONFIG.multisession_poll_interval_ms_not_at_capacity),
      multisession_poll_interval_ms_partial_capacity: numberSchema()
        .int()
        .min(100)
        .default(DEFAULT_POLL_CONFIG.multisession_poll_interval_ms_partial_capacity),
      multisession_poll_interval_ms_at_capacity: numberSchema()
        .int()
        .refine((v) => v === 0 || v >= 100, AT_CAPACITY_MESSAGE)
        .default(DEFAULT_POLL_CONFIG.multisession_poll_interval_ms_at_capacity),
      reclaim_older_than_ms: numberSchema().int().min(1).default(5000),
      session_keepalive_interval_v2_ms: numberSchema().int().min(0).default(120000),
      sse_connect_timeout_ms: numberSchema()
        .int()
        .max(MAX_TIMER_DELAY_MS)
        .refine((cfg) => cfg === 0 || cfg >= 20000, {
          message: "must be 0 (disabled) or \u226520000ms",
        })
        .default(DEFAULT_POLL_CONFIG.sse_connect_timeout_ms),
      watch_sessions: booleanSchema().catch(DEFAULT_POLL_CONFIG.watch_sessions),
      watch_connected_poll_interval_ms: numberSchema()
        .int()
        .min(15000)
        .max(96000)
        .catch(DEFAULT_POLL_CONFIG.watch_connected_poll_interval_ms),
      watch_fallback_poll_interval_ms: numberSchema()
        .int()
        .min(15000)
        .max(96000)
        .catch(DEFAULT_POLL_CONFIG.watch_fallback_poll_interval_ms),
      watch_session_end_window_ms: numberSchema()
        .int()
        .min(0)
        .max(3600000)
        .catch(DEFAULT_POLL_CONFIG.watch_session_end_window_ms),
    }).refine(
      (cfg) =>
        cfg.non_exclusive_heartbeat_interval_ms > 0 || cfg.multisession_poll_interval_ms_at_capacity > 0,
      {
        message:
          "at-capacity liveness requires non_exclusive_heartbeat_interval_ms > 0 or multisession_poll_interval_ms_at_capacity > 0",
      },
    ),
  );
});
//@ chunk-nkxt28ky.js:2322-2437 fingerprint (2.1.88 match: getPollIntervalConfig, 1)
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

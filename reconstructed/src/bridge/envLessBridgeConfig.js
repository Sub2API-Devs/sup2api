/**
 * bridge/envLessBridgeConfig.ts
 *
 * env-less 桥配置（GrowthBook tengu_bridge_repl_v2_config）：重试、超时、心跳、token 刷新提前量、归档超时、最低版本
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/envLessBridgeConfig.ts
 * pieces: chunk-4cm44bmp.js (3)
 * attribution: fingerprint 3
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, E, string } from "../../vendor/zod/v4/classic/schemas.js";
import { lt_2 as lt } from "../utils/semver.js";
import { getFeatureValue_DEPRECATED } from "../services/analytics/growthbook.js";

//@ chunk-4cm44bmp.js:25351-26670 fingerprint = DEFAULT_ENV_LESS_BRIDGE_CONFIG (0.894)
/**
 * 默认配置与 schema：init_retry_*、http_timeout_ms、uuid_dedup_buffer_size、heartbeat_interval_ms/jitter、token_refresh_buffer_ms、teardown_archive_timeout_ms、connect_timeout_ms、oauth_retry_*、min_version。
 */
var DEFAULT_ENV_LESS_BRIDGE_CONFIG = {
  init_retry_max_attempts: 3,
  init_retry_base_delay_ms: 500,
  init_retry_jitter_fraction: 0.25,
  init_retry_max_delay_ms: 4000,
  http_timeout_ms: 1e4,
  uuid_dedup_buffer_size: 2000,
  heartbeat_interval_ms: 20000,
  heartbeat_jitter_fraction: 0.1,
  token_refresh_buffer_ms: 300000,
  teardown_archive_timeout_ms: 1500,
  connect_timeout_ms: 15000,
  oauth_retry_max_attempts: 3,
  oauth_retry_base_delay_ms: 2000,
  min_version: "0.0.0",
};
var envLessBridgeConfigSchema = DoctorLazy(() =>
  u({
    init_retry_max_attempts: E().int().min(1).max(10).default(3),
    init_retry_base_delay_ms: E().int().min(100).default(500),
    init_retry_jitter_fraction: E().min(0).max(1).default(0.25),
    init_retry_max_delay_ms: E().int().min(500).default(4000),
    http_timeout_ms: E().int().min(2000).default(1e4),
    uuid_dedup_buffer_size: E().int().min(100).max(50000).default(2000),
    heartbeat_interval_ms: E().int().min(5000).max(30000).default(20000),
    heartbeat_jitter_fraction: E().min(0).max(0.5).default(0.1),
    token_refresh_buffer_ms: E().int().min(30000).max(1800000).default(300000),
    teardown_archive_timeout_ms: E().int().min(500).max(2000).default(1500),
    connect_timeout_ms: E().int().min(5000).max(60000).default(15000),
    oauth_retry_max_attempts: E().int().min(0).max(6).default(3),
    oauth_retry_base_delay_ms: E().int().min(100).max(1e4).default(2000),
    min_version: string()
      .refine((v) => {
        try {
          lt(v, "0.0.0");
          return true;
        } catch {
          return false;
        }
      })
      .default("0.0.0"),
  }),
);
//@ chunk-4cm44bmp.js:26670-26787 fingerprint = getEnvLessBridgeConfig (1)
async function getEnvLessBridgeConfig() {
  let raw = await getFeatureValue_DEPRECATED("tengu_bridge_repl_v2_config", DEFAULT_ENV_LESS_BRIDGE_CONFIG);
  let parsed = envLessBridgeConfigSchema().safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_ENV_LESS_BRIDGE_CONFIG;
}
//@ chunk-4cm44bmp.js:26787-28000 fingerprint = checkEnvLessBridgeMinVersion (0.511)
/**
 * 当前版本低于配置的 min_version 时返回提示文本（要求 claude update），否则 null。
 */
async function checkEnvLessBridgeMinVersion() {
  let cfg = await getEnvLessBridgeConfig();
  if (
    cfg.min_version &&
    lt(
      {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
      cfg.min_version,
    )
  )
    return `Your version of Claude Code (${
      {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION
    }) is too old for Remote Control.
Version ${cfg.min_version} or higher is required. Run \`claude update\` to update.`;
  return null;
}
export { checkEnvLessBridgeMinVersion, getEnvLessBridgeConfig };

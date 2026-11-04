/**
 * services/compact/compactSettings.ts
 *
 * 2.1.316 新增：远程会话中能否压缩；读取压缩相关设置与开关的一组函数（自动压缩、空闲压缩、预计算压缩等）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-9m4wzd68.js (25)
 * attribution: placement 25
 */
import { isAutoCompactDisabledByEnv } from "./autoCompact.js";
import { resolveSetting } from "../../utils/settings/userIntentSettings.js";
import { isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { env } from "../../utils/env.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-9m4wzd68.js:621-692 placement
/**
 * 读取压缩相关设置与开关的一组函数（自动压缩、空闲压缩、预计算压缩等）。
 */
function isAutoCompactEnabled() {
  if (isAutoCompactDisabledByEnv()) return false;
  return resolveSetting("autoCompactEnabled", true).value;
}
//@ chunk-9m4wzd68.js:692-744 placement
/**
 * idleCompaction 设置。
 */
function isIdleCompactionEnabled() {
  return resolveSetting("idleCompaction", true).value;
}
//@ chunk-9m4wzd68.js:744-809 placement
/**
 * 预计算压缩是否开启（设置 precomputeCompactionEnabled，默认开）。
 */
function isPrecomputeCompactionEnabled() {
  return resolveSetting("precomputeCompactionEnabled", true).value;
}
//@ chunk-9m4wzd68.js:809-1002 placement
/**
 * 用户在 settings（或旧全局配置）中关闭了自动压缩。
 */
function isAutoCompactTurnedOffByUser() {
  if (isAutoCompactDisabledByEnv()) return false;
  let setting = resolveSetting("autoCompactEnabled", true);
  if (setting.value) return false;
  if (setting.source === "userSettings") return true;
  if (setting.source === "legacyGlobalConfig") return isSettingSourceEnabled("userSettings");
  return false;
}
//@ chunk-9m4wzd68.js:1002-1136 placement
/**
 * 锁存 tengu_reactive_compact_remote 开关值。
 */
class RemoteReactiveCompactLatch {
  latched = undefined;
  isOpen() {
    this.latched ??= getFeatureValue_CACHED_MAY_BE_STALE("tengu_reactive_compact_remote", false);
    return this.latched;
  }
  reset() {
    this.latched = undefined;
  }
}
//@ chunk-9m4wzd68.js:1136-1148 placement
/**
 * 远程会话的响应式压缩闩锁。
 */
var remoteReactiveCompactLatch; // deferred: uses RemoteReactiveCompactLatch of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-9m4wzd68.js:1136", () => {
  remoteReactiveCompactLatch = new RemoteReactiveCompactLatch();
});
//@ chunk-9m4wzd68.js:1148-1220 placement
/**
 * 远程会话中能否压缩。
 */
function canCompactInRemote() {
  if (env.CLAUDE_CODE_REMOTE) {
    if (!remoteReactiveCompactLatch.isOpen()) return false;
  }
  return true;
}
//@ chunk-9m4wzd68.js:1220-1268 placement
/**
 * 读 tengu_hidden_frog（压缩相关开关，默认开）。
 */
function isHiddenFrogEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_hidden_frog", true);
}
//@ chunk-9m4wzd68.js:1268-1319 placement
/**
 * 读 tengu_generic_papert（压缩相关开关，默认关）。
 */
function isGenericPapertEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_generic_papert", false);
}
//@ chunk-9m4wzd68.js:1319-1367 placement
/**
 * 读 tengu_linked_rose（默认开）。
 */
function isLinkedRoseEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_linked_rose", true);
}
//@ chunk-9m4wzd68.js:1367-1414 placement
/**
 * 开关 tengu_soft_spark。
 */
function isSoftSparkEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_soft_spark", false);
}
//@ chunk-9m4wzd68.js:1414-1462 placement
/**
 * 读 tengu_plain_heron（默认开）。
 */
function isPlainHeronEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_plain_heron", true);
}
//@ chunk-9m4wzd68.js:1462-1512 placement
/**
 * 读 tengu_gentle_anchor（默认开）。
 */
function isGentleAnchorEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_gentle_anchor", true);
}
//@ chunk-9m4wzd68.js:1512-1562 placement
/**
 * 读 tengu_sleepy_ripple（默认开）。
 */
function isSleepyRippleEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_sleepy_ripple", true);
}
//@ chunk-9m4wzd68.js:1562-1614 placement
/**
 * 读 tengu_dapper_fountain（默认开）。
 */
function isDapperFountainEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_dapper_fountain", true);
}
//@ chunk-9m4wzd68.js:1614-1664 placement
/**
 * 读 tengu_hashed_pascal（默认关）。
 */
function isHashedPascalEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_hashed_pascal", false);
}
//@ chunk-9m4wzd68.js:1664-1715 placement
/**
 * 读 tengu_groovy_eclipse（默认关）。
 */
function isGroovyEclipseEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_groovy_eclipse", false);
}
//@ chunk-9m4wzd68.js:1715-1740 placement
var TENGU_WISE_COMET = "tengu_wise_comet";
//@ chunk-9m4wzd68.js:1740-1924 placement
/**
 * 压缩时是否剥离保留的思考块（环境变量、思考类型、开关）。
 */
function keptThinkingStripDecision(thinkingType) {
  let CLAUDE_CODE_WISE_COMET = env.CLAUDE_CODE_WISE_COMET;
  if (CLAUDE_CODE_WISE_COMET !== undefined)
    return {
      strip: CLAUDE_CODE_WISE_COMET,
      source: "env",
    };
  if (thinkingType !== "adaptive")
    return {
      strip: false,
      source: "thinking_type",
    };
  return {
    strip: getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WISE_COMET, false),
    source: "flag",
  };
}
//@ chunk-9m4wzd68.js:1924-2006 placement
/**
 * 不属于压缩类的查询来源集合。
 */
var NON_COMPACT_QUERY_SOURCES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-9m4wzd68.js:1924", () => {
  NON_COMPACT_QUERY_SOURCES = new Set(["prompt_suggestion", "away_summary", "agent_summary", "hook_prompt"]);
});
//@ chunk-9m4wzd68.js:2006-2050 placement
/**
 * 查询来源是否属于压缩类。
 */
function isCompactQuerySource(querySource) {
  return querySource !== undefined && NON_COMPACT_QUERY_SOURCES.has(querySource);
}
//@ chunk-9m4wzd68.js:2050-2102 placement
/**
 * 侧查询来源集合（side_question、extract_memories）。
 */
var SIDE_QUERY_SOURCES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-9m4wzd68.js:2050", () => {
  SIDE_QUERY_SOURCES = new Set(["side_question", "extract_memories"]);
});
//@ chunk-9m4wzd68.js:2102-2146 placement
/**
 * 查询来源是否属于侧查询（不压缩）。
 */
function isSideQuerySource(querySource) {
  return querySource !== undefined && SIDE_QUERY_SOURCES.has(querySource);
}
//@ chunk-9m4wzd68.js:2146-2195 placement
/**
 * 读 tengu_tidy_origami（压缩相关开关，默认关）。
 */
function isTidyOrigamiEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_tidy_origami", false);
}
//@ chunk-9m4wzd68.js:2195-2232 placement
/**
 * 是否为 compact 命令。
 */
function isCompactCommand(querySource) {
  return querySource === "compact";
}
export {
  isAutoCompactEnabled,
  canCompactInRemote,
  isCompactQuerySource,
  isSoftSparkEnabled,
  isLinkedRoseEnabled,
  isCompactCommand,
  isSideQuerySource,
  isTidyOrigamiEnabled,
  isSleepyRippleEnabled,
  keptThinkingStripDecision,
  isAutoCompactTurnedOffByUser,
  isIdleCompactionEnabled,
  isPrecomputeCompactionEnabled,
  isGenericPapertEnabled,
  isHiddenFrogEnabled,
  isDapperFountainEnabled,
  isHashedPascalEnabled,
  isGroovyEclipseEnabled,
  isPlainHeronEnabled,
  isGentleAnchorEnabled,
};

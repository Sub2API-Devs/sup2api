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

/**
 * 读取压缩相关设置与开关的一组函数（自动压缩、空闲压缩、预计算压缩等）。
 */
//@ chunk-9m4wzd68.js:621-692 placement
function isAutoCompactEnabled() {
  if (isAutoCompactDisabledByEnv()) return !1;
  return resolveSetting("autoCompactEnabled", !0).value;
}
/**
 * idleCompaction 设置。
 */
//@ chunk-9m4wzd68.js:692-744 placement
function isIdleCompactionEnabled() {
  return resolveSetting("idleCompaction", !0).value;
}
//@ chunk-9m4wzd68.js:744-809 placement
function OYr() {
  return resolveSetting("precomputeCompactionEnabled", !0).value;
}
/**
 * 用户在 settings（或旧全局配置）中关闭了自动压缩。
 */
//@ chunk-9m4wzd68.js:809-1002 placement
function isAutoCompactTurnedOffByUser() {
  if (isAutoCompactDisabledByEnv()) return !1;
  let e = resolveSetting("autoCompactEnabled", !0);
  if (e.value) return !1;
  if (e.source === "userSettings") return !0;
  if (e.source === "legacyGlobalConfig") return isSettingSourceEnabled("userSettings");
  return !1;
}
/**
 * 锁存 tengu_reactive_compact_remote 开关值。
 */
//@ chunk-9m4wzd68.js:1002-1136 placement
class RemoteReactiveCompactLatch {
  latched = void 0;
  isOpen() {
    return (
      (this.latched ??= getFeatureValue_CACHED_MAY_BE_STALE("tengu_reactive_compact_remote", !1)),
      this.latched
    );
  }
  reset() {
    this.latched = void 0;
  }
}
//@ chunk-9m4wzd68.js:1136-1148 placement
var u = new RemoteReactiveCompactLatch();
/**
 * 远程会话中能否压缩。
 */
//@ chunk-9m4wzd68.js:1148-1220 placement
function canCompactInRemote() {
  if (env.CLAUDE_CODE_REMOTE) {
    if (!u.isOpen()) return !1;
  }
  return !0;
}
//@ chunk-9m4wzd68.js:1220-1268 placement
function tnr() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_hidden_frog", !0);
}
//@ chunk-9m4wzd68.js:1268-1319 placement
function uYo() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_generic_papert", !1);
}
//@ chunk-9m4wzd68.js:1319-1367 placement
function nnr() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_linked_rose", !0);
}
/**
 * 开关 tengu_soft_spark。
 */
//@ chunk-9m4wzd68.js:1367-1414 placement
function isSoftSparkEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_soft_spark", !1);
}
//@ chunk-9m4wzd68.js:1414-1462 placement
function hri() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_plain_heron", !0);
}
//@ chunk-9m4wzd68.js:1462-1512 placement
function yri() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_gentle_anchor", !0);
}
//@ chunk-9m4wzd68.js:1512-1562 placement
function _ri() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_sleepy_ripple", !0);
}
//@ chunk-9m4wzd68.js:1562-1614 placement
function bri() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_dapper_fountain", !0);
}
//@ chunk-9m4wzd68.js:1614-1664 placement
function Sri() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_hashed_pascal", !1);
}
//@ chunk-9m4wzd68.js:1664-1715 placement
function wri() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_groovy_eclipse", !1);
}
//@ chunk-9m4wzd68.js:1715-1740 placement
var TENGU_WISE_COMET = "tengu_wise_comet";
/**
 * 压缩时是否剥离保留的思考块（环境变量、思考类型、开关）。
 */
//@ chunk-9m4wzd68.js:1740-1924 placement
function keptThinkingStripDecision(e) {
  let CLAUDE_CODE_WISE_COMET = env.CLAUDE_CODE_WISE_COMET;
  if (CLAUDE_CODE_WISE_COMET !== void 0) return { strip: CLAUDE_CODE_WISE_COMET, source: "env" };
  if (e !== "adaptive") return { strip: !1, source: "thinking_type" };
  return { strip: getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WISE_COMET, !1), source: "flag" };
}
//@ chunk-9m4wzd68.js:1924-2006 placement
var l = new Set(["prompt_suggestion", "away_summary", "agent_summary", "hook_prompt"]);
/**
 * 查询来源是否属于压缩类。
 */
//@ chunk-9m4wzd68.js:2006-2050 placement
function isCompactQuerySource(e) {
  return e !== void 0 && l.has(e);
}
//@ chunk-9m4wzd68.js:2050-2102 placement
var s = new Set(["side_question", "extract_memories"]);
//@ chunk-9m4wzd68.js:2102-2146 placement
function MYr(e) {
  return e !== void 0 && s.has(e);
}
//@ chunk-9m4wzd68.js:2146-2195 placement
function vri() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_tidy_origami", !1);
}
/**
 * 是否为 compact 命令。
 */
//@ chunk-9m4wzd68.js:2195-2232 placement
function isCompactCommand(e) {
  return e === "compact";
}

export {
  isAutoCompactEnabled,
  canCompactInRemote,
  isCompactQuerySource,
  isSoftSparkEnabled,
  nnr,
  isCompactCommand,
  MYr,
  vri,
  _ri,
  keptThinkingStripDecision,
  isAutoCompactTurnedOffByUser,
  isIdleCompactionEnabled,
  OYr,
  uYo,
  tnr,
  bri,
  Sri,
  wri,
  hri,
  yri,
};

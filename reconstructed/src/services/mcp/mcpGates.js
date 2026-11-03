/**
 * services/mcp/mcpGates.ts
 *
 * 2.1.316 新增：MCP 相关小开关（失败服务器提示、托管服务器位置等 GrowthBook 门）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mp7v59a0.js (3)
 * attribution: placement 3
 */
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
} from "../analytics/growthbook.js";
import { env } from "../../utils/env.js";
import { isCoworkAny } from "../../utils/entrypointKinds.js";

//@ chunk-mp7v59a0.js:9262-9325 placement
function nXr() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_surface_failed_mcp_servers", !0);
}
/**
 * 读取 sorted_otter 开关（环境变量优先，否则看特性开关）。
 */
//@ chunk-mp7v59a0.js:9325-9430 placement
function isSortedOtterOn() {
  let CLAUDE_CODE_SORTED_OTTER = env.CLAUDE_CODE_SORTED_OTTER;
  if (CLAUDE_CODE_SORTED_OTTER !== void 0) return CLAUDE_CODE_SORTED_OTTER;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_sorted_otter", !1);
}
/**
 * 读取"未加载工具"策略开关：everywhere 或（cowork 场景下的）hosted 时生效，附带开关来源。
 */
//@ chunk-mp7v59a0.js:9430-9633 placement
function notLoadedToolPolicy() {
  let { value: e, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
      "tengu_precious_koala",
      "off",
    ),
    r = typeof e === "string" ? e.trim().toLowerCase() : e,
    n = isCoworkAny();
  return { inForce: r === "everywhere" || (r === "hosted" && n), flagSource: source, coworkSurface: n };
}

export { isSortedOtterOn, notLoadedToolPolicy, nXr };

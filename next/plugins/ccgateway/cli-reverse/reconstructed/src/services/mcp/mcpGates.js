/**
 * services/mcp/mcpGates.ts
 *
 * 2.1.316 新增：MCP 相关小开关（失败服务器提示、托管服务器位置等 GrowthBook 门）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-png42f8p.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
} from "../analytics/growthbook.js";
import { env } from "../../utils/env.js";
import { isCoworkAny } from "../../utils/entrypointKinds.js";

//@ chunk-png42f8p.js:9392-9455 placement
/**
 * 读 tengu_surface_failed_mcp_servers（默认开）。
 */
function isSurfaceFailedServersEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_surface_failed_mcp_servers", true);
}
//@ chunk-png42f8p.js:9455-9560 placement
/**
 * 读取 sorted_otter 开关（环境变量优先，否则看特性开关）。
 */
function isSortedOtterOn() {
  let CLAUDE_CODE_SORTED_OTTER = env.CLAUDE_CODE_SORTED_OTTER;
  if (CLAUDE_CODE_SORTED_OTTER !== undefined) return CLAUDE_CODE_SORTED_OTTER;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_sorted_otter", false);
}
//@ chunk-png42f8p.js:9560-9763 placement
/**
 * 读取"未加载工具"策略开关：everywhere 或（cowork 场景下的）hosted 时生效，附带开关来源。
 */
function notLoadedToolPolicy() {
  let { value, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_precious_koala", "off");
  let mode = typeof value === "string" ? value.trim().toLowerCase() : value;
  let coworkSurface = isCoworkAny();
  return {
    inForce: mode === "everywhere" || (mode === "hosted" && coworkSurface),
    flagSource: source,
    coworkSurface,
  };
}
export { isSortedOtterOn, isSurfaceFailedServersEnabled, notLoadedToolPolicy };

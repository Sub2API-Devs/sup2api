/**
 * tools/AgentTool/spawnDepth.ts
 *
 * 2.1.316 新增：代理派生深度限制。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-vm8fc2sr.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { env } from "../../utils/env.js";
import { getSessionFeatureValues } from "../../bootstrap/sessionFeatureValues.js";

//@ chunk-vm8fc2sr.js:262-270 placement
/**
 * 子代理默认最大派生深度（3）。
 */
var DEFAULT_SUBAGENT_SPAWN_DEPTH = 3;
//@ chunk-vm8fc2sr.js:270-298 placement
var TENGU_HAZEL_TRELLIS = "tengu_hazel_trellis";
//@ chunk-vm8fc2sr.js:298-690 placement
/**
 * 子代理最大派生深度：优先 CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH，否则读客户端数据或 GrowthBook 的 TENGU_HAZEL_TRELLIS（无效时用默认值），结果缓存在全局状态。
 */
function getMaxSubagentSpawnDepth() {
  let CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH = env.CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH;
  if (CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH !== undefined) return CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH;
  let sessionFeatureValues = getSessionFeatureValues();
  if (sessionFeatureValues.maxSubagentSpawnDepthFromGrowthBook === undefined) {
    let {
      getFeatureValue_CACHED_MAY_BE_STALE,
    } = require("../../services/analytics/ATIS_REQUEST_HEADER.lazy.js");
    let { getCachedClientData } = require("../../utils/config.js");
    let clientValue = getCachedClientData()?.[TENGU_HAZEL_TRELLIS];
    let featureValue = isPositiveInteger(clientValue)
      ? clientValue
      : getFeatureValue_CACHED_MAY_BE_STALE(TENGU_HAZEL_TRELLIS, DEFAULT_SUBAGENT_SPAWN_DEPTH);
    sessionFeatureValues.maxSubagentSpawnDepthFromGrowthBook = isPositiveInteger(featureValue)
      ? featureValue
      : DEFAULT_SUBAGENT_SPAWN_DEPTH;
  }
  return sessionFeatureValues.maxSubagentSpawnDepthFromGrowthBook;
}
//@ chunk-vm8fc2sr.js:690-758 placement
/**
 * 判断值是否为正整数。
 */
function isPositiveInteger(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 1;
}
export { getMaxSubagentSpawnDepth };

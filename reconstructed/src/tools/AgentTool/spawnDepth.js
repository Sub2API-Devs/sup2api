/**
 * tools/AgentTool/spawnDepth.ts
 *
 * 2.1.316 新增：代理派生深度限制。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-k8xs47j2.js (4)
 * attribution: placement 4
 */
import { env } from "../../utils/env.js";
import { Ao } from "../../bootstrap/sessionFeatureValues.js";

//@ chunk-k8xs47j2.js:262-270 placement
var n = 3;
//@ chunk-k8xs47j2.js:270-298 placement
var TENGU_HAZEL_TRELLIS = "tengu_hazel_trellis";
/**
 * 子代理最大派生深度：优先 CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH，否则读客户端数据或 GrowthBook 的 TENGU_HAZEL_TRELLIS（无效时用默认值），结果缓存在全局状态。
 */
//@ chunk-k8xs47j2.js:298-690 placement
function getMaxSubagentSpawnDepth() {
  let CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH = env.CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH;
  if (CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH !== void 0) return CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH;
  let t = Ao();
  if (t.maxSubagentSpawnDepthFromGrowthBook === void 0) {
    let {
        getFeatureValue_CACHED_MAY_BE_STALE: getFeatureValue_CACHED_MAY_BE_STALE,
      } = require("./chunk-6df1d6re.js"),
      { getCachedClientData: getCachedClientData } = require("./chunk-eesswvbz.js"),
      o = getCachedClientData()?.[TENGU_HAZEL_TRELLIS],
      r = u(o) ? o : getFeatureValue_CACHED_MAY_BE_STALE(TENGU_HAZEL_TRELLIS, n);
    t.maxSubagentSpawnDepthFromGrowthBook = u(r) ? r : n;
  }
  return t.maxSubagentSpawnDepthFromGrowthBook;
}
//@ chunk-k8xs47j2.js:690-758 placement
function u(e) {
  return typeof e === "number" && Number.isInteger(e) && e >= 1;
}

export { getMaxSubagentSpawnDepth };

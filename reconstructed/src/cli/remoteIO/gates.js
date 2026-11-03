/**
 * cli/remoteIO/gates.ts
 *
 * 2.1.316 新增。RemoteIO 功能开关。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-z4g2ta8k.js (5)
 * attribution: placement 5
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { env } from "../../utils/env.js";
import { remoteSessionUrlId } from "../../utils/sessionUrl.js";
import { GENERAL_PURPOSE_AGENT } from "../../tools/AgentTool/built-in/generalPurposeAgent.js";
import { COORDINATOR_WORKER_AGENT_TYPE } from "../../coordinator/workerAgent.js";

//@ chunk-z4g2ta8k.js:4350-4413 placement
function isCcrSubagentSkipOnDeltaGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_subagent_skip_on_delta", false);
}
//@ chunk-z4g2ta8k.js:4413-4504 placement
/**
 * 是否开启 transcript 本地 GC：读 CLAUDE_CODE_TRANSCRIPT_LOCAL_GC 或特性开关 tengu_transcript_local_gc。
 */
function isTranscriptLocalGcEnabled() {
  return (
    env.CLAUDE_CODE_TRANSCRIPT_LOCAL_GC ??
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_transcript_local_gc", false)
  );
}
//@ chunk-z4g2ta8k.js:4504-4570 placement
/**
 * tengu_wondrous_island 特性开且存在某模型参数时为真（远程 ingress 的一个附加开关）。
 */
function isWondrousIslandGateOn() {
  return remoteSessionUrlId() !== null && getFeatureValue_CACHED_MAY_BE_STALE("tengu_wondrous_island", false);
}
//@ chunk-z4g2ta8k.js:4570-4836 placement
/**
 * 按 task_id 去重任务列表，同一 id 保留第一条，但后来者有描述而前者没有时用后来者。
 */
function dedupeTasksById(e) {
  let n = new Map();
  for (let r of e) {
    if (typeof r?.task_id !== "string" || !r.task_id) continue;
    let description = typeof r.description === "string" ? r.description : "";
    let h = n.get(r.task_id);
    if (!h || (!h.description && description))
      n.set(r.task_id, {
        ...r,
        description,
      });
  }
  return Array.from(n.values());
}
//@ chunk-z4g2ta8k.js:4836-4871 placement
var BROADCAST_AGENT_TYPES = new Set([GENERAL_PURPOSE_AGENT.agentType, COORDINATOR_WORKER_AGENT_TYPE]);
export {
  BROADCAST_AGENT_TYPES,
  dedupeTasksById,
  isTranscriptLocalGcEnabled,
  isCcrSubagentSkipOnDeltaGateOn,
  isWondrousIslandGateOn,
};

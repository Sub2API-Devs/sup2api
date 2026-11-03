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
import { p7t } from "../../utils/sessionUrl.js";
import { GENERAL_PURPOSE_AGENT } from "../../tools/AgentTool/built-in/generalPurposeAgent.js";
import { COORDINATOR_WORKER_AGENT_TYPE } from "../../coordinator/workerAgent.js";

//@ chunk-z4g2ta8k.js:4350-4413 placement
function isCcrSubagentSkipOnDeltaGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_subagent_skip_on_delta", !1);
}
//@ chunk-z4g2ta8k.js:4413-4504 placement
function UDs() {
  return (
    env.CLAUDE_CODE_TRANSCRIPT_LOCAL_GC ??
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_transcript_local_gc", !1)
  );
}
//@ chunk-z4g2ta8k.js:4504-4570 placement
function HPr() {
  return p7t() !== null && getFeatureValue_CACHED_MAY_BE_STALE("tengu_wondrous_island", !1);
}
/**
 * 按 task_id 去重任务列表，同一 id 保留第一条，但后来者有描述而前者没有时用后来者。
 */
//@ chunk-z4g2ta8k.js:4570-4836 placement
function dedupeTasksById(e) {
  let n = new Map();
  for (let r of e) {
    if (typeof r?.task_id !== "string" || !r.task_id) continue;
    let s = typeof r.description === "string" ? r.description : "",
      h = n.get(r.task_id);
    if (!h || (!h.description && s)) n.set(r.task_id, { ...r, description: s });
  }
  return Array.from(n.values());
}
//@ chunk-z4g2ta8k.js:4836-4871 placement
var ar = new Set([GENERAL_PURPOSE_AGENT.agentType, COORDINATOR_WORKER_AGENT_TYPE]);

export { ar, dedupeTasksById, UDs, isCcrSubagentSkipOnDeltaGateOn, HPr };

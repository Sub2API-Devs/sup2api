/**
 * cli/remoteIO/gates.ts
 *
 * 2.1.316 新增。RemoteIO 功能开关。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1kk50rk6.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { GENERAL_PURPOSE_AGENT } from "../../tools/AgentTool/built-in/generalPurposeAgent.js";
import { COORDINATOR_WORKER_AGENT_TYPE } from "../../coordinator/workerAgent.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { env } from "../../utils/env.js";
import { remoteSessionUrlId } from "../../utils/sessionUrl.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1kk50rk6.js:4640-4906 placement
/**
 * 按 task_id 去重任务列表，同一 id 保留第一条，但后来者有描述而前者没有时用后来者。
 */
function dedupeTasksById(tasks) {
  let byId = new Map();
  for (let task of tasks) {
    if (typeof task?.task_id !== "string" || !task.task_id) continue;
    let description = typeof task.description === "string" ? task.description : "";
    let existing = byId.get(task.task_id);
    if (!existing || (!existing.description && description))
      byId.set(task.task_id, {
        ...task,
        description,
      });
  }
  return Array.from(byId.values());
}
//@ chunk-1kk50rk6.js:4906-4941 placement
var BROADCAST_AGENT_TYPES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1kk50rk6.js:4906", () => {
  BROADCAST_AGENT_TYPES = new Set([GENERAL_PURPOSE_AGENT.agentType, COORDINATOR_WORKER_AGENT_TYPE]);
});
//@ chunk-1kk50rk6.js:12043-12106 placement
function isCcrSubagentSkipOnDeltaGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_ccr_subagent_skip_on_delta", false);
}
//@ chunk-1kk50rk6.js:12106-12197 placement
/**
 * 是否开启 transcript 本地 GC：读 CLAUDE_CODE_TRANSCRIPT_LOCAL_GC 或特性开关 tengu_transcript_local_gc。
 */
function isTranscriptLocalGcEnabled() {
  return (
    env.CLAUDE_CODE_TRANSCRIPT_LOCAL_GC ??
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_transcript_local_gc", false)
  );
}
//@ chunk-1kk50rk6.js:12197-12263 placement
/**
 * tengu_wondrous_island 特性开且存在某模型参数时为真（远程 ingress 的一个附加开关）。
 */
function isWondrousIslandGateOn() {
  return remoteSessionUrlId() !== null && getFeatureValue_CACHED_MAY_BE_STALE("tengu_wondrous_island", false);
}
export {
  BROADCAST_AGENT_TYPES,
  dedupeTasksById,
  isTranscriptLocalGcEnabled,
  isCcrSubagentSkipOnDeltaGateOn,
  isWondrousIslandGateOn,
};

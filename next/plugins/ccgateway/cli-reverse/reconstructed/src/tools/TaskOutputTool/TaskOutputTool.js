/**
 * tools/TaskOutputTool/TaskOutputTool.tsx
 *
 * 316 已无 TaskOutput 工具（名字列入已退役集合）；此处只剩任务运行状态判定小函数
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/TaskOutputTool/TaskOutputTool.tsx
 * pieces: chunk-01kgd7xg.js (2), chunk-1kk50rk6.js (1)
 * attribution: fingerprint 2, file-last-pair 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { BROADCAST_AGENT_TYPES } from "../../cli/remoteIO/gates.js";
import { normalizeAgentIdOrNull } from "../../utils/agentId.js";

//@ chunk-01kgd7xg.js:24525-24609 fingerprint (2.1.88 match: waitForTaskCompletion, 0.869)
/**
 * 任务 running/pending 且不在前台。
 */
function waitForTaskCompletion(task) {
  if (task.status !== "running" && task.status !== "pending") return false;
  return !TaskOutputResultDisplay(task);
}
//@ chunk-01kgd7xg.js:24609-24675 file-last-pair
/**
 * 任务被标记为前台运行（isBackgrounded === false）。
 */
function TaskOutputResultDisplay(t0) {
  return "isBackgrounded" in t0 && t0.isBackgrounded === false;
}
//@ chunk-1kk50rk6.js:4941-5151 fingerprint (2.1.88 match: getTaskOutputData, 0.311)
/**
 * 是否为主线程默认启动的内建本地代理任务（遥测/显示判定）。
 */
function getTaskOutputData(task) {
  return (
    task.task_type === "local_agent" &&
    task.is_built_in === true &&
    task.forked_skill === false &&
    task.main_thread_spawned === true &&
    task.default_launch === true &&
    task.agent_type !== undefined &&
    BROADCAST_AGENT_TYPES.has(task.agent_type) &&
    normalizeAgentIdOrNull(task.task_id) !== null
  );
}
export { waitForTaskCompletion, getTaskOutputData, TaskOutputResultDisplay };

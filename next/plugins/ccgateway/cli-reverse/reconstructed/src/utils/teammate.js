/**
 * utils/teammate.ts
 *
 * teammate 身份查询：优先同进程 teammate 上下文（ALS），否则用进程级动态团队上下文（pane 型 teammate 由 CLI 参数设置）；以及 teammate 运行/空闲状态查询
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/teammate.ts
 * pieces: chunk-dtzk9y3z.js (27), chunk-sc94d59g.js (1)
 * attribution: facade-exports 24, layout 2, affinity 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { teammateContextStorage, getTeammateContext } from "./teammateContext.js";
import { call } from "../commands/exit/exit.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, getIsInteractive } from "../bootstrap/state.js";
import { env } from "./env.js";
import { isSpawnedByAttendedSession } from "./sessionShape.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-dtzk9y3z.js:538-581 facade-exports (2.1.88 match: isInProcessTeammate, 1)
/**
 * 当前是否运行在同进程 teammate 上下文中。
 */
function isInProcessTeammate() {
  return teammateContextStorage.getStore() !== undefined;
}
//@ chunk-dtzk9y3z.js:667-799 facade-exports (2.1.88 match: getParentSessionId, 0.445)
/**
 * 父会话 ID：同进程 teammate 取其上下文，否则取动态团队上下文或 CLI 传入的父会话 ID。
 */
function getParentSessionId() {
  let inProcessCtx = getTeammateContext();
  if (inProcessCtx) return inProcessCtx.parentSessionId;
  let teammateProcessState = getTeammateProcessState();
  return teammateProcessState.dynamicTeamContext?.parentSessionId ?? teammateProcessState.cliParentSessionId;
}
//@ chunk-dtzk9y3z.js:799-1114 layout
/**
 * 每个宿主一份的团队身份状态：CLI 父会话 ID、动态团队上下文（pane 型 teammate 的 agentId/agentName/teamName/planModeRequired 等）、tmux 环境标记探测。
 */
class TeammateProcessState {
  cliParentSessionId = undefined;
  dynamicTeamContext = null;
  ambientMarkerProbe = memoizeProbe(call);
  isChildSessionMarkerAmbientInTmux = () => this.ambientMarkerProbe() === "ambient";
  setCliParentSessionId(cliParentSessionId) {
    this.cliParentSessionId = cliParentSessionId;
  }
  setDynamicTeamContext(dynamicTeamContext) {
    this.dynamicTeamContext = dynamicTeamContext;
  }
  setAmbientMarkerProbe(marker) {
    this.ambientMarkerProbe = memoizeProbe(marker);
  }
}
//@ chunk-dtzk9y3z.js:1114-1139 facade-exports
var teammateIdentities; // deferred: uses TeammateProcessState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-dtzk9y3z.js:1114", () => {
  teammateIdentities = new HostScoped(() => new TeammateProcessState());
});
//@ chunk-dtzk9y3z.js:1139-1176 layout
function getTeammateProcessState() {
  return teammateIdentities.of(getRootSession().host);
}
//@ chunk-dtzk9y3z.js:1176-1221 facade-exports
function setCliParentSessionId(sessionId) {
  getTeammateProcessState().setCliParentSessionId(sessionId);
}
//@ chunk-dtzk9y3z.js:1221-1266 facade-exports
/**
 * 设置动态团队上下文（以 teammate 身份启动的进程用）。
 */
function setDynamicTeamContext(context) {
  getTeammateProcessState().setDynamicTeamContext(context);
}
//@ chunk-dtzk9y3z.js:1266-1313 facade-exports
function clearDynamicTeamContext() {
  getTeammateProcessState().setDynamicTeamContext(null);
}
//@ chunk-dtzk9y3z.js:1313-1357 facade-exports
/**
 * 取进程级动态团队上下文。
 */
function getDynamicTeamContext() {
  return getTeammateProcessState().dynamicTeamContext;
}
//@ chunk-dtzk9y3z.js:1357-1443 facade-exports
/**
 * 当前 teammate 的 agentId（同进程上下文优先，其次动态团队上下文）。
 */
function getAgentId() {
  let inProcessCtx = getTeammateContext();
  if (inProcessCtx) return inProcessCtx.agentId;
  return getTeammateProcessState().dynamicTeamContext?.agentId;
}
//@ chunk-dtzk9y3z.js:1443-1533 facade-exports (2.1.88 match: getAgentName, 0.608)
/**
 * 当前 teammate 的名字。
 */
function getAgentName() {
  let inProcessCtx = getTeammateContext();
  if (inProcessCtx) return inProcessCtx.agentName;
  return getTeammateProcessState().dynamicTeamContext?.agentName;
}
//@ chunk-dtzk9y3z.js:1533-1664 facade-exports
/**
 * 当前团队名：同进程上下文 > 动态团队上下文 > 传入的 teamContext.teamName。
 */
function getTeamName(teamContext) {
  let inProcessCtx = getTeammateContext();
  if (inProcessCtx) return inProcessCtx.teamName;
  let { dynamicTeamContext } = getTeammateProcessState();
  if (dynamicTeamContext?.teamName) return dynamicTeamContext.teamName;
  return teamContext?.teamName;
}
//@ chunk-dtzk9y3z.js:1664-1759 facade-exports (2.1.88 match: isTeammate, 0.615)
/**
 * 当前进程/上下文是否是 teammate（同进程上下文存在，或动态上下文有 agentId 和 teamName）。
 */
function isTeammate() {
  if (getTeammateContext()) return true;
  let { dynamicTeamContext } = getTeammateProcessState();
  return !!(dynamicTeamContext?.agentId && dynamicTeamContext?.teamName);
}
//@ chunk-dtzk9y3z.js:1759-1827 facade-exports
function isModelDrivenSession(flag) {
  return flag !== undefined || isTeammate() || env.CLAUDE_CODE_CHILD_SESSION;
}
//@ chunk-dtzk9y3z.js:1827-1997 facade-exports
function isNestedInteractiveClaudeSession() {
  if (env.CLAUDE_CODE_FORCE_SESSION_PERSISTENCE) return false;
  if (!(env.CLAUDE_CODE_CHILD_SESSION && getIsInteractive() && !isTeammate())) return false;
  return !getTeammateProcessState().isChildSessionMarkerAmbientInTmux();
}
//@ chunk-dtzk9y3z.js:1997-2169 facade-exports
function isHeadlessToolCallOfClaudeCodeSession() {
  if (!env.CLAUDE_CODE_CHILD_SESSION) return false;
  if (process.stdin.isTTY || process.stdout.isTTY) return false;
  if (!isSpawnedByAttendedSession()) return false;
  return getTeammateProcessState().ambientMarkerProbe() === "absent";
}
//@ chunk-dtzk9y3z.js:2169-2335 facade-exports
function isOnClaudeCodeSessionSurface() {
  if (env.CLAUDE_CODE_CHILD_SESSION) return true;
  if (!env.CLAUDECODE) return false;
  return env.CLAUDE_CODE_SKIP_PROMPT_HISTORY || (!process.stdin.isTTY && !process.stdout.isTTY);
}
//@ chunk-dtzk9y3z.js:2335-2447 facade-exports
function _setAmbientMarkerProbeForTesting(probe) {
  getTeammateProcessState().setAmbientMarkerProbe(
    probe === null
      ? call
      : () => {
          let result = probe();
          return result === true ? "ambient" : result === false ? "absent" : result;
        },
  );
}
//@ chunk-dtzk9y3z.js:2447-2533 affinity
function memoizeProbe(probe) {
  let cached = null;
  return () => {
    if (cached === null)
      try {
        cached = probe();
      } catch {
        cached = "unknown";
      }
    return cached;
  };
}
//@ chunk-dtzk9y3z.js:2852-2942 facade-exports
function _tmuxGlobalEnvOutputHasMarker(stdout) {
  return stdout
    .split(
      `
`,
    )
    .some((line) => line.startsWith("CLAUDE_CODE_CHILD_SESSION="));
}
//@ chunk-dtzk9y3z.js:2942-3024 facade-exports
function getTeammateColor() {
  let teammateContext = getTeammateContext();
  if (teammateContext) return teammateContext.color;
  return getTeammateProcessState().dynamicTeamContext?.color;
}
//@ chunk-dtzk9y3z.js:3024-3189 facade-exports (2.1.88 match: isPlanModeRequired, 0.808)
/**
 * teammate 是否必须先走计划模式：上下文的 planModeRequired，否则看 CLAUDE_CODE_PLAN_MODE_REQUIRED。
 */
function isPlanModeRequired() {
  let inProcessCtx = getTeammateContext();
  if (inProcessCtx) return inProcessCtx.planModeRequired;
  let { dynamicTeamContext } = getTeammateProcessState();
  if (dynamicTeamContext !== null) return dynamicTeamContext.planModeRequired;
  return env.CLAUDE_CODE_PLAN_MODE_REQUIRED;
}
//@ chunk-dtzk9y3z.js:3189-3292 facade-exports
/**
 * 团队里除 leader 外是否还有成员。
 */
function hasNonLeadTeammate(teamContext) {
  if (!teamContext) return false;
  let { leadAgentId, teammates } = teamContext;
  return Object.keys(teammates).some((key) => key !== leadAgentId);
}
//@ chunk-dtzk9y3z.js:3292-3404 facade-exports (2.1.88 match: isTeamLead, 1)
/**
 * 当前是否是 team lead：自身 agentId 等于 leadAgentId，或自身没有 agentId（主进程）。
 */
function isTeamLead(teamContext) {
  if (!teamContext?.leadAgentId) return false;
  let myAgentId = getAgentId();
  let leadAgentId = teamContext.leadAgentId;
  if (myAgentId === leadAgentId) return true;
  if (!myAgentId) return true;
  return false;
}
//@ chunk-dtzk9y3z.js:3404-3530 facade-exports (2.1.88 match: hasActiveInProcessTeammates, 1)
/**
 * 是否有运行中的同进程 teammate。
 */
function hasActiveInProcessTeammates(appState) {
  for (let task of Object.values(appState.tasks))
    if (task.type === "in_process_teammate" && task.status === "running") return true;
  return false;
}
//@ chunk-dtzk9y3z.js:3530-3667 facade-exports (2.1.88 match: hasWorkingInProcessTeammates, 1)
/**
 * 是否有运行中且非空闲的同进程 teammate。
 */
function hasWorkingInProcessTeammates(appState) {
  for (let task of Object.values(appState.tasks))
    if (task.type === "in_process_teammate" && task.status === "running" && !task.isIdle) return true;
  return false;
}
//@ chunk-dtzk9y3z.js:3667-4110 facade-exports (2.1.88 match: waitForTeammatesToBecomeIdle, 1)
/**
 * 等待所有工作中的同进程 teammate 变为空闲：给它们挂 onIdleCallbacks，全部回调后 resolve。
 */
function waitForTeammatesToBecomeIdle(setAppState, appState) {
  let workingTaskIds = [];
  for (let [taskId, task] of Object.entries(appState.tasks))
    if (task.type === "in_process_teammate" && task.status === "running" && !task.isIdle)
      workingTaskIds.push(taskId);
  if (workingTaskIds.length === 0) return Promise.resolve();
  return new Promise((resolve) => {
    let remaining = workingTaskIds.length;
    let onIdle = () => {
      remaining--;
      if (remaining === 0) resolve();
    };
    setAppState((prev) => {
      let newTasks = {
        ...prev.tasks,
      };
      for (let taskId of workingTaskIds) {
        let task = newTasks[taskId];
        if (task && task.type === "in_process_teammate")
          if (task.isIdle) onIdle();
          else
            newTasks[taskId] = {
              ...task,
              onIdleCallbacks: [...(task.onIdleCallbacks ?? []), onIdle],
            };
      }
      return {
        ...prev,
        tasks: newTasks,
      };
    });
  });
}
//@ chunk-sc94d59g.js:8079-8189 fingerprint (2.1.88 match: getTeamName, 0.638)
/**
 * 取 teammate 上下文：toolUseContext 自带的 teammateContext，否则用动态团队上下文（有 agentId 与 teamName 时）。
 */
function getEffectiveTeammateContext(toolUseContext) {
  if (toolUseContext.teammateContext) return toolUseContext.teammateContext;
  let dynamicContext = getDynamicTeamContext();
  return dynamicContext?.agentId && dynamicContext.teamName ? dynamicContext : undefined;
}
export {
  isModelDrivenSession,
  getAgentId,
  getParentSessionId,
  getTeamName,
  isTeammate,
  isNestedInteractiveClaudeSession,
  hasWorkingInProcessTeammates,
  waitForTeammatesToBecomeIdle,
  hasNonLeadTeammate,
  hasActiveInProcessTeammates,
  isTeamLead,
  getDynamicTeamContext,
  getAgentName,
  getTeammateColor,
  isOnClaudeCodeSessionSurface,
  isInProcessTeammate,
  _tmuxGlobalEnvOutputHasMarker,
  isHeadlessToolCallOfClaudeCodeSession,
  isPlanModeRequired,
  getEffectiveTeammateContext,
  _setAmbientMarkerProbeForTesting,
  clearDynamicTeamContext,
  setCliParentSessionId,
  setDynamicTeamContext,
  teammateIdentities,
};

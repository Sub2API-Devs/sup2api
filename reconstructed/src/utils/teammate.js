/**
 * utils/teammate.ts
 *
 * teammate 身份查询：优先同进程 teammate 上下文（ALS），否则用进程级动态团队上下文（pane 型 teammate 由 CLI 参数设置）；以及 teammate 运行/空闲状态查询
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/teammate.ts
 * pieces: chunk-fnhsh6ng.js (1), chunk-fxf1mb10.js (30)
 * attribution: fingerprint 1, affinity 2, facade-exports 25, layout 3
 */
import { AsyncLocalStorage } from "async_hooks";
import { call } from "../commands/exit/exit.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, getIsInteractive } from "../bootstrap/state.js";
import { env } from "./env.js";
import { isSpawnedByAttendedSession } from "./sessionShape.js";

//@ chunk-fxf1mb10.js:456-468 affinity
/**
 * 同进程 teammate 上下文的 AsyncLocalStorage。
 */
var teammateContextStorage = new AsyncLocalStorage();
//@ chunk-fxf1mb10.js:468-502 facade-exports = getAgentContext (1)
/**
 * 取当前同进程 teammate 上下文。
 */
function getTeammateContext() {
  return teammateContextStorage.getStore();
}
//@ chunk-fxf1mb10.js:502-538 layout
/**
 * 在 teammate 上下文中运行函数（inProcessRunner 使用）。
 */
function runWithTeammateContext(teammateContext, fn) {
  return teammateContextStorage.run(teammateContext, fn);
}
//@ chunk-fxf1mb10.js:538-581 facade-exports = getAgentContext (1)
/**
 * 当前是否运行在同进程 teammate 上下文中。
 */
function isInProcessTeammate() {
  return teammateContextStorage.getStore() !== undefined;
}
//@ chunk-fxf1mb10.js:667-799 facade-exports = getParentSessionId (0.445)
/**
 * 父会话 ID：同进程 teammate 取其上下文，否则取动态团队上下文或 CLI 传入的父会话 ID。
 */
function getParentSessionId() {
  let inProcessCtx = getTeammateContext();
  if (inProcessCtx) return inProcessCtx.parentSessionId;
  let teammateProcessState = getTeammateProcessState();
  return teammateProcessState.dynamicTeamContext?.parentSessionId ?? teammateProcessState.cliParentSessionId;
}
//@ chunk-fxf1mb10.js:799-1114 layout
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
  setAmbientMarkerProbe(e) {
    this.ambientMarkerProbe = memoizeProbe(e);
  }
}
//@ chunk-fxf1mb10.js:1114-1139 facade-exports
var teammateIdentities = new HostScoped(() => new TeammateProcessState());
//@ chunk-fxf1mb10.js:1139-1176 layout
function getTeammateProcessState() {
  return teammateIdentities.of(getRootSession().host);
}
//@ chunk-fxf1mb10.js:1176-1221 facade-exports
function setCliParentSessionId(sessionId) {
  getTeammateProcessState().setCliParentSessionId(sessionId);
}
//@ chunk-fxf1mb10.js:1221-1266 facade-exports
/**
 * 设置动态团队上下文（以 teammate 身份启动的进程用）。
 */
function setDynamicTeamContext(context) {
  getTeammateProcessState().setDynamicTeamContext(context);
}
//@ chunk-fxf1mb10.js:1266-1313 facade-exports
function clearDynamicTeamContext() {
  getTeammateProcessState().setDynamicTeamContext(null);
}
//@ chunk-fxf1mb10.js:1313-1357 facade-exports
/**
 * 取进程级动态团队上下文。
 */
function getDynamicTeamContext() {
  return getTeammateProcessState().dynamicTeamContext;
}
//@ chunk-fxf1mb10.js:1357-1443 facade-exports
/**
 * 当前 teammate 的 agentId（同进程上下文优先，其次动态团队上下文）。
 */
function getAgentId() {
  let inProcessCtx = getTeammateContext();
  if (inProcessCtx) return inProcessCtx.agentId;
  return getTeammateProcessState().dynamicTeamContext?.agentId;
}
//@ chunk-fxf1mb10.js:1443-1533 facade-exports = getAgentName (0.607)
/**
 * 当前 teammate 的名字。
 */
function getAgentName() {
  let inProcessCtx = getTeammateContext();
  if (inProcessCtx) return inProcessCtx.agentName;
  return getTeammateProcessState().dynamicTeamContext?.agentName;
}
//@ chunk-fxf1mb10.js:1533-1664 facade-exports
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
//@ chunk-fxf1mb10.js:1664-1759 facade-exports = isTeammate (0.615)
/**
 * 当前进程/上下文是否是 teammate（同进程上下文存在，或动态上下文有 agentId 和 teamName）。
 */
function isTeammate() {
  if (getTeammateContext()) return true;
  let { dynamicTeamContext } = getTeammateProcessState();
  return !!(dynamicTeamContext?.agentId && dynamicTeamContext?.teamName);
}
//@ chunk-fxf1mb10.js:1759-1827 facade-exports
function isModelDrivenSession(e) {
  return e !== undefined || isTeammate() || env.CLAUDE_CODE_CHILD_SESSION;
}
//@ chunk-fxf1mb10.js:1827-1997 facade-exports
function isNestedInteractiveClaudeSession() {
  if (env.CLAUDE_CODE_FORCE_SESSION_PERSISTENCE) return false;
  if (!(env.CLAUDE_CODE_CHILD_SESSION && getIsInteractive() && !isTeammate())) return false;
  return !getTeammateProcessState().isChildSessionMarkerAmbientInTmux();
}
//@ chunk-fxf1mb10.js:1997-2169 facade-exports
function isHeadlessToolCallOfClaudeCodeSession() {
  if (!env.CLAUDE_CODE_CHILD_SESSION) return false;
  if (process.stdin.isTTY || process.stdout.isTTY) return false;
  if (!isSpawnedByAttendedSession()) return false;
  return getTeammateProcessState().ambientMarkerProbe() === "absent";
}
//@ chunk-fxf1mb10.js:2169-2336 facade-exports
function isOnClaudeCodeSessionSurface() {
  if (env.CLAUDE_CODE_CHILD_SESSION) return true;
  if (!env.CLAUDECODE) return false;
  return env.CLAUDE_CODE_SKIP_PROMPT_HISTORY || (!process.stdin.isTTY && !process.stdout.isTTY);
}
//@ chunk-fxf1mb10.js:2336-2448 facade-exports
function _setAmbientMarkerProbeForTesting(e) {
  getTeammateProcessState().setAmbientMarkerProbe(
    e === null
      ? call
      : () => {
          let t = e();
          return t === true ? "ambient" : t === false ? "absent" : t;
        },
  );
}
//@ chunk-fxf1mb10.js:2448-2534 affinity
function memoizeProbe(e) {
  let t = null;
  return () => {
    if (t === null)
      try {
        t = e();
      } catch {
        t = "unknown";
      }
    return t;
  };
}
//@ chunk-fxf1mb10.js:2853-2943 facade-exports
function _tmuxGlobalEnvOutputHasMarker(stdout) {
  return stdout
    .split(
      `
`,
    )
    .some((line) => line.startsWith("CLAUDE_CODE_CHILD_SESSION="));
}
//@ chunk-fxf1mb10.js:2943-3025 facade-exports
function getTeammateColor() {
  let teammateContext = getTeammateContext();
  if (teammateContext) return teammateContext.color;
  return getTeammateProcessState().dynamicTeamContext?.color;
}
//@ chunk-fxf1mb10.js:3025-3190 facade-exports = isPlanModeRequired (0.808)
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
//@ chunk-fxf1mb10.js:3190-3293 facade-exports
/**
 * 团队里除 leader 外是否还有成员。
 */
function hasNonLeadTeammate(teamContext) {
  if (!teamContext) return false;
  let { leadAgentId, teammates } = teamContext;
  return Object.keys(teammates).some((key) => key !== leadAgentId);
}
//@ chunk-fxf1mb10.js:3293-3405 facade-exports = isTeamLead (1)
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
//@ chunk-fxf1mb10.js:3405-3531 facade-exports = hasActiveInProcessTeammates (1)
/**
 * 是否有运行中的同进程 teammate。
 */
function hasActiveInProcessTeammates(appState) {
  for (let task of Object.values(appState.tasks))
    if (task.type === "in_process_teammate" && task.status === "running") return true;
  return false;
}
//@ chunk-fxf1mb10.js:3531-3668 facade-exports = hasWorkingInProcessTeammates (1)
/**
 * 是否有运行中且非空闲的同进程 teammate。
 */
function hasWorkingInProcessTeammates(appState) {
  for (let task of Object.values(appState.tasks))
    if (task.type === "in_process_teammate" && task.status === "running" && !task.isIdle) return true;
  return false;
}
//@ chunk-fxf1mb10.js:3668-4111 facade-exports = waitForTeammatesToBecomeIdle (1)
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
//@ chunk-fnhsh6ng.js:6724-6834 fingerprint = getTeamName (0.634)
/**
 * 取 teammate 上下文：toolUseContext 自带的 teammateContext，否则用动态团队上下文（有 agentId 与 teamName 时）。
 */
function getEffectiveTeammateContext(toolUseContext) {
  if (toolUseContext.teammateContext) return toolUseContext.teammateContext;
  let dynamicContext = getDynamicTeamContext();
  return dynamicContext?.agentId && dynamicContext.teamName ? dynamicContext : undefined;
}
export {
  isTeammate,
  isInProcessTeammate,
  getAgentName,
  getTeamName,
  getTeammateColor,
  isModelDrivenSession,
  isNestedInteractiveClaudeSession,
  getParentSessionId,
  isTeamLead,
  getTeammateContext,
  getDynamicTeamContext,
  hasWorkingInProcessTeammates,
  waitForTeammatesToBecomeIdle,
  hasNonLeadTeammate,
  hasActiveInProcessTeammates,
  getAgentId,
  isPlanModeRequired,
  _tmuxGlobalEnvOutputHasMarker,
  isOnClaudeCodeSessionSurface,
  runWithTeammateContext,
  getEffectiveTeammateContext,
  isHeadlessToolCallOfClaudeCodeSession,
};

/**
 * tools/AgentTool/agentLaunchHelpers.ts
 *
 * 2.1.316 新增：AgentTool 启动辅助：后台会话锁、隔离方式降级（remote → worktree/本地）、web-fetch 代理强制本地
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0tkmvwy0.js (12)
 * attribution: placement 12
 */
import { isPlainObject } from "../../utils/isPlainObject.js";
import { isTerminalTaskStatus } from "../../tasks/taskStatus.js";
import { pathInWorkingPath } from "../../utils/permissions/filesystem.js";
import { isParkedOnChildWork, hasChildAgents } from "../../tasks/LocalAgentTask/childWork.js";
import { getTaskRunState } from "../../utils/task/taskNotifications.js";
import { unwrapAbortReason } from "../../utils/abortController.js";
import { getTaskKillController } from "../../tasks/taskLoopRegistry.js";
import { logForDebugging } from "../../utils/debug.js";
import { releaseOwnWorktreeLock } from "../../utils/worktree.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { isAbortError } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { env } from "../../utils/env.js";
import { isDiskless } from "../../bootstrap/state.js";
import { canRunAgentInWorktree, isRemoteAgentIsolationAvailable } from "./agentLaunch.js";
import { isWebFetchAgent } from "../WebFetchTool/harnessNotes.js";

//@ chunk-0tkmvwy0.js:3257-3497 placement
/**
 * assistant 消息中该 tool_use 请求后台运行（或默认后台且未显式 false）时返回其 id。
 */
function getBackgroundedToolUseId(assistantMessage, toolUseId, backgroundByDefault) {
  if (toolUseId === undefined) return;
  let content = assistantMessage?.message?.content;
  if (!Array.isArray(content)) return;
  return content.some(
    (_) =>
      isPlainObject(_) &&
      _.type === "tool_use" &&
      _.id === toolUseId &&
      isPlainObject(_.input) &&
      (_.input.run_in_background === true || (backgroundByDefault && _.input.run_in_background !== false)),
  )
    ? toolUseId
    : undefined;
}
//@ chunk-0tkmvwy0.js:3497-3648 placement
/**
 * 在任务表中找 cwd 位于给定路径之下、仍占用的任务（用于判断 worktree 能否删除）。
 */
function findTaskOccupyingPath(tasks, paths, isOccupying = (task) => !isTerminalTaskStatus(task.status)) {
  for (let task of Object.values(tasks)) {
    let cwd = task.cwd;
    if (cwd === undefined || !isOccupying(task)) continue;
    if (paths.some((path) => pathInWorkingPath(cwd, path))) return task;
  }
  return;
}
//@ chunk-0tkmvwy0.js:3648-3706 placement
/**
 * 任务是否仍占用 worktree：未结束、等待恢复或有 keepalive 子代理。
 */
function isTaskStillOccupying(task, taskRegistry) {
  return (
    !isTerminalTaskStatus(task.status) || isParkedOnChildWork(task) || hasChildAgents(task.id, taskRegistry)
  );
}
//@ chunk-0tkmvwy0.js:3706-3922 placement
/**
 * worktree 被其他任务占用而保留时，订阅 agentSettled/taskEvicted 事件，等无占用者后释放 worktree 锁。
 */
function watchWorktreeForRelease(watch) {
  let state = {
    ...watch,
    resuming: new Set(),
    subscriptions: [],
  };
  state.subscriptions.push(
    getTaskRunState().agentSettled.subscribe((agentId, settledInfo, details) =>
      maybeReleaseWorktreeLock(state, agentId, details?.stranded === true, false),
    ),
    getTaskRunState().taskEvicted.subscribe((taskId) => maybeReleaseWorktreeLock(state, taskId, false, true)),
  );
  maybeReleaseWorktreeLock(state, undefined, false, false);
}
//@ chunk-0tkmvwy0.js:3922-4446 placement
/**
 * 代理结束时更新后台锁：仍有活任务则保持，否则释放。
 */
function maybeReleaseWorktreeLock(state, agentOrTaskId, isStranded, evicted) {
  try {
    let backgroundedHandoff =
      agentOrTaskId !== undefined &&
      unwrapAbortReason(getTaskKillController(agentOrTaskId)?.signal.reason) === "background";
    if (agentOrTaskId !== undefined && isStranded) state.resuming.add(agentOrTaskId);
    else if (agentOrTaskId !== undefined) state.resuming.delete(agentOrTaskId);
    if (
      state.findOccupant(
        (task) =>
          !(evicted && task.id === agentOrTaskId) &&
          (state.resuming.has(task.id) || isTaskStillOccupying(task, state.taskRegistry)),
      ) !== undefined &&
      !backgroundedHandoff
    )
      return;
    for (let subscription of state.subscriptions) subscription();
    logForDebugging(
      `Agent worktree ${state.worktreePath}: ${backgroundedHandoff ? "a /background handoff was seen; lock kept" : "no live task is left in it; releasing its lock"}`,
    );
    if (!backgroundedHandoff) {
      let releasePromise = releaseOwnWorktreeLock(state.worktreePath, state.gitRoot);
      releasePromise.finally(registerCleanup(() => releasePromise));
    }
  } catch (error) {
    if (!isAbortError(error)) logError(error);
  }
}
//@ chunk-0tkmvwy0.js:4446-4880 placement
/**
 * isolation:"remote" 不可用时记录原因，有 git 根则回退 "worktree"，否则本地运行。
 */
function getRemoteIsolationFallback(restricted) {
  let insideCcrSession = Boolean(env.CLAUDE_CODE_REMOTE);
  let isDisklessSession = isDiskless();
  let canUseWorktree = !insideCcrSession && canRunAgentInWorktree();
  let unavailableReason = restricted ? "(--restricted)" : "(no claude.ai login or feature gate off)";
  let fallbackDetail = insideCcrSession
    ? "(already inside a CCR session); running as a local agent"
    : isDisklessSession
      ? "(the session has no disk); running as a local agent"
      : canUseWorktree
        ? `${unavailableReason}; falling back to isolation:'worktree'`
        : `${unavailableReason} and no git root; running as a local agent`;
  logForDebugging(`[remote agent] isolation:'remote' is unavailable ${fallbackDetail}`);
  return canUseWorktree ? "worktree" : undefined;
}
//@ chunk-0tkmvwy0.js:4880-5029 placement
/**
 * 把 spawn 描述（prompt/description/subagentType/model/background/cwd）合并回 Agent 输入，用于比较钩子改写前后的权限判定。
 */
var toSpawnHookInput = (agentInput, spawn) => ({
  ...agentInput,
  prompt: spawn.prompt,
  description: spawn.description,
  subagent_type: spawn.subagentType,
  model: spawn.model,
  run_in_background: spawn.background,
  cwd: spawn.cwd,
});
//@ chunk-0tkmvwy0.js:5029-5278 placement
/**
 * 解析有效隔离方式：内建 web-fetch 代理忽略 isolation；remote 不可用或受限时回退为 worktree 或本地。
 */
function resolveEffectiveIsolation(options) {
  let { agent, isolation, restricted } = options;
  let isolationMode = isolation ?? agent.isolation;
  if (isolationMode !== undefined && isWebFetchAgent(agent)) {
    logForDebugging(
      `[web-fetch agent] isolation:'${isolationMode}' ignored; the built-in web-fetch agent always runs as a local agent`,
    );
    return;
  }
  return isolationMode === "remote" && (!isRemoteAgentIsolationAvailable() || restricted)
    ? getRemoteIsolationFallback(restricted)
    : isolationMode;
}
//@ chunk-0tkmvwy0.js:5278-5566 placement
/**
 * 两个权限决策是否来自同一条规则（来源、行为、工具名、内容都相同）。
 */
function isSameRuleDecision(previous, next) {
  let decisionReason = previous?.decisionReason;
  let decisionReason_2 = next.decisionReason;
  if (decisionReason?.type !== "rule" || decisionReason_2?.type !== "rule") return false;
  let [previousRule, nextRule] = [decisionReason.rule, decisionReason_2.rule];
  return (
    previousRule.source === nextRule.source &&
    previousRule.ruleBehavior === nextRule.ruleBehavior &&
    previousRule.ruleValue.toolName === nextRule.ruleValue.toolName &&
    previousRule.ruleValue.ruleContent === nextRule.ruleValue.ruleContent
  );
}
//@ chunk-0tkmvwy0.js:5566-5576 placement
/**
 * 启动前检查时表示「中断不算中止」的标志常量。
 */
var ALLOW_INTERRUPT_ABORT = true;
//@ chunk-0tkmvwy0.js:5576-5586 placement
/**
 * 启动前检查时表示「中断按中止处理」的标志常量。
 */
var NO_INTERRUPT_ABORT = false;
//@ chunk-0tkmvwy0.js:5586-5898 placement
/**
 * 决定启动形态：effectiveIsolation（输入或定义的 isolation，remote 不可用时回退）、isRemoteLaunch、shouldRunAsync（显式 run_in_background、定义 background、coordinator/强制异步，且后台任务未禁用）。
 */
function decideAgentLaunchMode(options) {
  let { agent, wantsBackground, callerIsInProcessTeammate } = options;
  let inheritsBackgrounding = callerIsInProcessTeammate || options.callerIsHeadlessSubagent;
  let asyncByDefault =
    (options.isCoordinator && !callerIsInProcessTeammate) ||
    options.forceAsync ||
    (!inheritsBackgrounding && wantsBackground !== false);
  let effectiveIsolation = resolveEffectiveIsolation(options);
  let wantsAsync =
    wantsBackground === true || agent.background === true || (!isWebFetchAgent(agent) && asyncByDefault);
  let isRemoteLaunch = effectiveIsolation === "remote";
  return {
    effectiveIsolation,
    isRemoteLaunch,
    shouldRunAsync: isRemoteLaunch || (wantsAsync && !options.backgroundTasksDisabled),
  };
}
export {
  isSameRuleDecision,
  NO_INTERRUPT_ABORT,
  toSpawnHookInput,
  ALLOW_INTERRUPT_ABORT,
  getBackgroundedToolUseId,
  decideAgentLaunchMode,
  findTaskOccupyingPath,
  isTaskStillOccupying,
  watchWorktreeForRelease,
};

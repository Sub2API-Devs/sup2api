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
import { GKe, isRemoteAgentIsolationAvailable } from "./agentLaunch.js";
import { isWebFetchAgent } from "../WebFetchTool/harnessNotes.js";

/**
 * assistant 消息中该 tool_use 请求后台运行（或默认后台且未显式 false）时返回其 id。
 */
//@ chunk-0tkmvwy0.js:3257-3497 placement
function getBackgroundedToolUseId(assistantMessage, toolUseId, backgroundByDefault) {
  if (toolUseId === void 0) return;
  let f = assistantMessage?.message?.content;
  if (!Array.isArray(f)) return;
  return f.some(
    (_) =>
      isPlainObject(_) &&
      _.type === "tool_use" &&
      _.id === toolUseId &&
      isPlainObject(_.input) &&
      (_.input.run_in_background === !0 || (backgroundByDefault && _.input.run_in_background !== !1)),
  )
    ? toolUseId
    : void 0;
}
/**
 * 在任务表中找 cwd 位于给定路径之下、仍占用的任务（用于判断 worktree 能否删除）。
 */
//@ chunk-0tkmvwy0.js:3497-3648 placement
function findTaskOccupyingPath(tasks, paths, isOccupying = (f) => !isTerminalTaskStatus(f.status)) {
  for (let f of Object.values(tasks)) {
    let cwd = f.cwd;
    if (cwd === void 0 || !isOccupying(f)) continue;
    if (paths.some((_) => pathInWorkingPath(cwd, _))) return f;
  }
  return;
}
/**
 * 任务是否仍占用 worktree：未结束、等待恢复或有 keepalive 子代理。
 */
//@ chunk-0tkmvwy0.js:3648-3706 placement
function isTaskStillOccupying(task, taskRegistry) {
  return (
    !isTerminalTaskStatus(task.status) || isParkedOnChildWork(task) || hasChildAgents(task.id, taskRegistry)
  );
}
/**
 * worktree 被其他任务占用而保留时，订阅 agentSettled/taskEvicted 事件，等无占用者后释放 worktree 锁。
 */
//@ chunk-0tkmvwy0.js:3706-3922 placement
function watchWorktreeForRelease(watch) {
  let e = { ...watch, resuming: new Set(), subscriptions: [] };
  (e.subscriptions.push(
    getTaskRunState().agentSettled.subscribe((s, f, y) =>
      maybeReleaseWorktreeLock(e, s, y?.stranded === !0, !1),
    ),
    getTaskRunState().taskEvicted.subscribe((s) => maybeReleaseWorktreeLock(e, s, !1, !0)),
  ),
    maybeReleaseWorktreeLock(e, void 0, !1, !1));
}
/**
 * 代理结束时更新后台锁：仍有活任务则保持，否则释放。
 */
//@ chunk-0tkmvwy0.js:3922-4446 placement
function maybeReleaseWorktreeLock(n, e, s, f) {
  try {
    let y = e !== void 0 && unwrapAbortReason(getTaskKillController(e)?.signal.reason) === "background";
    if (e !== void 0 && s) n.resuming.add(e);
    else if (e !== void 0) n.resuming.delete(e);
    if (
      n.findOccupant(
        (S) => !(f && S.id === e) && (n.resuming.has(S.id) || isTaskStillOccupying(S, n.taskRegistry)),
      ) !== void 0 &&
      !y
    )
      return;
    for (let subscription of n.subscriptions) subscription();
    if (
      (logForDebugging(
        `Agent worktree ${n.worktreePath}: ${y ? "a /background handoff was seen; lock kept" : "no live task is left in it; releasing its lock"}`,
      ),
      !y)
    ) {
      let S = releaseOwnWorktreeLock(n.worktreePath, n.gitRoot);
      S.finally(registerCleanup(() => S));
    }
  } catch (error) {
    if (!isAbortError(error)) logError(error);
  }
}
/**
 * isolation:"remote" 不可用时记录原因，有 git 根则回退 "worktree"，否则本地运行。
 */
//@ chunk-0tkmvwy0.js:4446-4880 placement
function getRemoteIsolationFallback(restricted) {
  let e = Boolean(env.CLAUDE_CODE_REMOTE),
    s = isDiskless(),
    f = !e && GKe(),
    y = restricted ? "(--restricted)" : "(no claude.ai login or feature gate off)",
    _ = e
      ? "(already inside a CCR session); running as a local agent"
      : s
        ? "(the session has no disk); running as a local agent"
        : f
          ? `${y}; falling back to isolation:'worktree'`
          : `${y} and no git root; running as a local agent`;
  return (logForDebugging(`[remote agent] isolation:'remote' is unavailable ${_}`), f ? "worktree" : void 0);
}
/**
 * 把 spawn 描述（prompt/description/subagentType/model/background/cwd）合并回 Agent 输入，用于比较钩子改写前后的权限判定。
 */
//@ chunk-0tkmvwy0.js:4880-5029 placement
var toSpawnHookInput = (agentInput, spawn) => ({
  ...agentInput,
  prompt: spawn.prompt,
  description: spawn.description,
  subagent_type: spawn.subagentType,
  model: spawn.model,
  run_in_background: spawn.background,
  cwd: spawn.cwd,
});
/**
 * 解析有效隔离方式：内建 web-fetch 代理忽略 isolation；remote 不可用或受限时回退为 worktree 或本地。
 */
//@ chunk-0tkmvwy0.js:5029-5278 placement
function resolveEffectiveIsolation(options) {
  let { agent: agent, isolation: isolation, restricted: restricted } = options,
    y = isolation ?? agent.isolation;
  if (y !== void 0 && isWebFetchAgent(agent)) {
    logForDebugging(
      `[web-fetch agent] isolation:'${y}' ignored; the built-in web-fetch agent always runs as a local agent`,
    );
    return;
  }
  return y === "remote" && (!isRemoteAgentIsolationAvailable() || restricted)
    ? getRemoteIsolationFallback(restricted)
    : y;
}
/**
 * 两个权限决策是否来自同一条规则（来源、行为、工具名、内容都相同）。
 */
//@ chunk-0tkmvwy0.js:5278-5566 placement
function isSameRuleDecision(previous, next) {
  let s = previous?.decisionReason,
    decisionReason = next.decisionReason;
  if (s?.type !== "rule" || decisionReason?.type !== "rule") return !1;
  let [y, _] = [s.rule, decisionReason.rule];
  return (
    y.source === _.source &&
    y.ruleBehavior === _.ruleBehavior &&
    y.ruleValue.toolName === _.ruleValue.toolName &&
    y.ruleValue.ruleContent === _.ruleValue.ruleContent
  );
}
//@ chunk-0tkmvwy0.js:5566-5576 placement
var _o = !0;
//@ chunk-0tkmvwy0.js:5576-5586 placement
var To = !1;
/**
 * 决定启动形态：effectiveIsolation（输入或定义的 isolation，remote 不可用时回退）、isRemoteLaunch、shouldRunAsync（显式 run_in_background、定义 background、coordinator/强制异步，且后台任务未禁用）。
 */
//@ chunk-0tkmvwy0.js:5586-5898 placement
function decideAgentLaunchMode(options) {
  let {
      agent: agent,
      wantsBackground: wantsBackground,
      callerIsInProcessTeammate: callerIsInProcessTeammate,
    } = options,
    y = callerIsInProcessTeammate || options.callerIsHeadlessSubagent,
    _ =
      (options.isCoordinator && !callerIsInProcessTeammate) ||
      options.forceAsync ||
      (!y && wantsBackground !== !1),
    S = resolveEffectiveIsolation(options),
    I = wantsBackground === !0 || agent.background === !0 || (!isWebFetchAgent(agent) && _),
    Y = S === "remote";
  return {
    effectiveIsolation: S,
    isRemoteLaunch: Y,
    shouldRunAsync: Y || (I && !options.backgroundTasksDisabled),
  };
}

export {
  isSameRuleDecision,
  To,
  toSpawnHookInput,
  _o,
  getBackgroundedToolUseId,
  decideAgentLaunchMode,
  findTaskOccupyingPath,
  isTaskStillOccupying,
  watchWorktreeForRelease,
};

/**
 * tools/AgentTool/agentLaunch.ts
 *
 * 2.1.316 新增：子代理启动参数整理
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0m7em5b4.js (20), chunk-e6aww6q8.js (13)
 * attribution: placement 33
 */
import {
  OBSERVER_EXCLUDED_TOOLS,
  observerReportTool,
  launchAgentsWithHooks,
} from "../ObserverReportTool/ObserverReportTool.js";
import { toolMatchesName } from "../../Tool.js";
import { identity } from "../../utils/identity.js";
import { AGENT, TASK } from "./constants.js";
import { isWebFetchAgent_2 } from "../WebFetchTool/harnessNotes.js";
import { isForegroundAgentMoveDisabled } from "./backgroundGates.js";
import { env } from "../../utils/env.js";
import { notifyNestedChainDropped } from "../../utils/sessionActivity.js";
import { getIsNonInteractiveSession, isDiskless } from "../../bootstrap/state.js";
import { addAgentKeepaliveReason } from "../../tasks/taskKinds.js";
import { spawnProvenanceOf } from "../../plugins/functionHooks/inputHold.js";
import { xxo } from "./subagentSpawn.js";
import { isAbortedNotByInterrupt } from "../../entrypoints/sdk/controlSchemas.js";
import { AbortError, getErrnoCode, storageCauseErrnoCode } from "../../utils/errors.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { getAutoModeUnavailableReason } from "../../utils/permissions/permissionSetup.js";
import { logForDebugging } from "../../utils/debug.js";
import { isFirstPartyProvider } from "../../utils/model/providers.js";
import { getHostAgentPolicy } from "../../utils/hostAgentPolicy.js";
import { hasStoredOAuthToken } from "../../utils/auth.js";
import { getCurrentProjectConfig, getGlobalConfig } from "../../utils/config.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
} from "../../services/analytics/growthbook.js";
import { hasWorktreeCreateHook } from "../../utils/hooks/worktreeHooks.js";
import { findCanonicalGitRoot, getBranch, isBranchOnOrigin } from "../../utils/git.js";
import { getCwd } from "../../utils/cwd.js";
import { isBypassCapableMode, narrowerMode } from "../../utils/permissions/browserToolNames.js";
import { FILE_EDIT_TOOL_NAME } from "../FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../FileWriteTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../NotebookEditTool/constants.js";
import { countCharInString } from "../../utils/stringUtils.js";
import { parseWildcardAgentTypes } from "../../utils/permissions/permissions.js";
import { samePath } from "../../utils/file.js";

//@ chunk-0m7em5b4.js:10958-11027 placement
function observerToolset(resolvedTools) {
  return [
    ...resolvedTools.filter((h) => OBSERVER_EXCLUDED_TOOLS.every((w) => !toolMatchesName(h, w))),
    observerReportTool,
  ];
}
//@ chunk-0m7em5b4.js:11027-11061 placement
/**
 * 本次恢复中「已停止」的代理 id 集合（可重置）。
 */
var stoppedAgentIds = identity(new Set(), (e) => e.clear());
//@ chunk-0m7em5b4.js:11061-11102 placement
/**
 * 把一批代理 id 记为已停止。
 */
function rememberStoppedAgents(e) {
  for (let h of e) stoppedAgentIds.add(h);
}
//@ chunk-0m7em5b4.js:11102-11134 placement
/**
 * 判断某代理 id 是否被记为已停止。
 */
function isStoppedAgent(agentId) {
  return stoppedAgentIds.has(agentId);
}
//@ chunk-0m7em5b4.js:11134-11168 placement
/**
 * 「可恢复」的代理 id 集合（可重置）。
 */
var resumableAgentIds = identity(new Set(), (e) => e.clear());
//@ chunk-0m7em5b4.js:11168-11209 placement
/**
 * 把一批代理 id 记为可恢复。
 */
function rememberResumableAgents(e) {
  for (let h of e) resumableAgentIds.add(h);
}
//@ chunk-0m7em5b4.js:11209-11241 placement
/**
 * 判断某代理 id 是否被记为可恢复。
 */
function isResumableAgent(agentId) {
  return resumableAgentIds.has(agentId);
}
//@ chunk-0m7em5b4.js:11241-11388 placement
function isAgentLaunchToolUse(e) {
  return (
    (e.name === AGENT || e.name === TASK) &&
    typeof e.input === "object" &&
    e.input !== null &&
    "subagent_type" in e.input &&
    isWebFetchAgent_2(e.input.subagent_type)
  );
}
//@ chunk-0m7em5b4.js:11388-11821 placement
function findAgentLaunchResults(messages, agentId) {
  let w = new Set();
  for (let A of messages)
    if (A.type === "assistant") {
      let content = A.message.content;
      if (!Array.isArray(content)) continue;
      for (let P of content) if (P.type === "tool_use" && isAgentLaunchToolUse(P)) w.add(P.id);
    } else if (A.type === "user" && w.size > 0) {
      let toolUseResult = A.toolUseResult;
      let content = A.message.content;
      if (
        typeof toolUseResult !== "object" ||
        toolUseResult === null ||
        !("agentId" in toolUseResult) ||
        toolUseResult.agentId !== agentId ||
        !Array.isArray(content)
      )
        continue;
      if (content.some((E) => E.type === "tool_result" && w.has(E.tool_use_id))) return true;
    }
  return false;
}
//@ chunk-0m7em5b4.js:11821-11865 placement
/**
 * 前台代理自动转后台的等待时间：未指定时沿用传入值，否则看是否禁止了前台转后台。
 */
function autoBackgroundMsForLaunch(e, h) {
  return e === undefined ? h : isForegroundAgentMoveDisabled();
}
//@ chunk-0m7em5b4.js:11865-11988 placement
function autoBackgroundOptions(e, h) {
  return {
    autoBackgroundMs: h || !env.CLAUDE_AUTO_BACKGROUND_TASKS ? undefined : 120000,
    waitsOnRuleMove: e !== undefined && !h,
  };
}
//@ chunk-0m7em5b4.js:11988-12098 placement
function raceAgentLaunch(e, backgroundSignal, w) {
  return w
    ? e.then(() => "done")
    : Promise.race([e.then(() => "done"), backgroundSignal.then(() => "backgrounded")]);
}
//@ chunk-0m7em5b4.js:12098-12583 placement
function settleBackgroundedAgent({
  outcome,
  registration,
  wait,
  ownerAgentId,
  taskRegistry,
  sessionScratch,
  agentTask,
}) {
  let { taskId } = registration;
  let F = outcome === "done" && agentTask.hasAgentChildKeepalive(taskId, taskRegistry);
  if (F) agentTask.backgroundAgentTask(taskId, taskRegistry);
  let status = taskRegistry.get(taskId)?.status;
  let Z =
    outcome === "backgrounded" &&
    !F &&
    status !== undefined &&
    status !== "running" &&
    !agentTask.hasAgentChildKeepalive(taskId, taskRegistry);
  let r = outcome === "backgrounded" && !Z;
  if (!r && !F) return false;
  wait.moved = true;
  if (r) agentTask.armWorkerCheckinForBackgroundedAgent(taskId, taskRegistry, sessionScratch);
  registration.detachParentAbortRelay();
  notifyNestedChainDropped(taskId);
  if (!getIsNonInteractiveSession()) addAgentKeepaliveReason(ownerAgentId, `agent:${taskId}`, taskRegistry);
  return true;
}
//@ chunk-0m7em5b4.js:12583-12847 placement
async function runResumeStartHooks(e, { origin, ...w }) {
  let hookOrigin = spawnProvenanceOf(e)?.hookOrigin;
  let S = await launchAgentsWithHooks({
    ...w,
    agents: [],
    resume: Object.freeze({
      agentId: e,
    }),
    origin: hookOrigin === undefined ? origin : [...hookOrigin, ...(origin ?? [])],
  });
  if (S.starting !== xxo && isAbortedNotByInterrupt(w.signal, w.background)) {
    S.starting?.[Symbol.dispose]();
    throw new AbortError();
  }
  return S;
}
//@ chunk-0m7em5b4.js:12847-12906 placement
function pluginDeclinedResumeMessage(deny) {
  return `a plugin declined the resume: ${deny}`;
}
//@ chunk-0m7em5b4.js:12906-13191 placement
function isTranscriptChainIntact(e, h) {
  let filtered = e.filter(isPlainObject);
  let A = new Map(filtered.flatMap((O) => (O.uuid === undefined ? [] : [[O.uuid, O.parentUuid]])));
  let S = new Set(h);
  let P = (parentUuid) => A.has(parentUuid) || S.has(parentUuid);
  let E = new Set(filtered.flatMap(getPreservedMessageUuids));
  return (
    h.length > 0 &&
    isNil(A.get(h[0])) &&
    [...E].every(P) &&
    filtered.every((O) => isNil(O.parentUuid) || P(O.parentUuid) || E.has(O.uuid))
  );
}
//@ chunk-0m7em5b4.js:13191-13234 placement
/**
 * 值为 undefined 或 null（用于判断消息链是否完整）。
 */
function isNil(e) {
  return e === undefined || e === null;
}
//@ chunk-0m7em5b4.js:13234-13352 placement
function getPreservedMessageUuids({ compactMetadata }) {
  let preservedMessages = isPlainObject(compactMetadata) ? compactMetadata.preservedMessages : undefined;
  return isPlainObject(preservedMessages) && Array.isArray(preservedMessages.uuids)
    ? preservedMessages.uuids
    : [];
}
//@ chunk-0m7em5b4.js:13352-13364 placement
var SETTLE_AGENT_BACKGROUND_MS = 2000;
//@ chunk-0m7em5b4.js:13364-13597 placement
function unreadableStateMessage(e, h) {
  return `its saved state cannot be read (${getErrnoCode(e) ?? storageCauseErrnoCode(e) ?? "storage error"}), so it cannot be told whether the user stopped it. ${h ? "Send the message again in a moment, or the user" : "The user"} can resume it themselves.`;
}
//@ chunk-e6aww6q8.js:3262427-3262685 placement
function fallbackFromUnavailableAutoMode(e, n, r) {
  if (e !== "auto") return e;
  let autoModeUnavailableReason = getAutoModeUnavailableReason(r);
  if (autoModeUnavailableReason === null) return e;
  logForDebugging(
    `Subagent definition's permissionMode would put it in auto mode, but auto mode is unavailable to this subagent (reason=${autoModeUnavailableReason}); keeping parent mode '${n}'.`,
    {
      level: "warn",
    },
  );
  return n;
}
//@ chunk-e6aww6q8.js:3262685-3262959 placement
function isRemoteAgentIsolationAvailable() {
  if (env.CLAUDE_CODE_EVAL_CONFINED) return false;
  if (isDiskless()) return false;
  if (!isFirstPartyProvider()) return false;
  if (env.CLAUDE_CODE_REMOTE || getHostAgentPolicy().remoteAgentIsolationDisabled) return false;
  if (!hasStoredOAuthToken()) return false;
  if (!getCurrentProjectConfig().hasUsedRemoteSession || !getGlobalConfig().hasRemoteEnvironment)
    return false;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_neapolitan", false);
}
//@ chunk-e6aww6q8.js:3262959-3263041 placement
/**
 * 判断能否给子代理建 worktree 隔离（非受限评估、非无盘且有 git 根或 worktree 钩子）。
 */
function canRunAgentInWorktree() {
  return (
    !env.CLAUDE_CODE_EVAL_CONFINED &&
    !isDiskless() &&
    (hasWorktreeCreateHook() || findCanonicalGitRoot(getCwd()) !== null)
  );
}
//@ chunk-e6aww6q8.js:3263041-3263269 placement
async function getPushedBranchForRemoteAgent() {
  let cwd = getCwd();
  let branch = await getBranch(cwd);
  if (branch === "HEAD") return;
  if (await isBranchOnOrigin(branch, cwd)) return branch;
  logForDebugging(
    `[remote agent] local branch '${branch}' is not pushed to origin; remote agent will run against the repository's default branch`,
  );
  return;
}
//@ chunk-e6aww6q8.js:3263269-3263357 placement
/**
 * 把父代理的权限模式转换成子代理可用的模式（bubble 不透传、bypassPermissions 降为 auto）。
 */
function subagentPermissionMode(e) {
  if (e === "bubble") return;
  if (e === "bypassPermissions") return "auto";
  return e;
}
//@ chunk-e6aww6q8.js:3263357-3263593 placement
/**
 * 计算子代理的权限模式：未声明、或父模式受限且声明模式不比父模式更窄（或父为 auto 而声明非 plan）时沿用父模式；声明为 auto 但子代理不能用 auto 时退回父模式。
 */
function resolveSubagentPermissionMode({
  declaredMode,
  parentMode,
  parentModeToHand,
  model,
  narrowOnly = false,
}) {
  if (
    declaredMode === undefined ||
    ((narrowOnly || isBypassCapableMode(parentMode)) &&
      (narrowerMode(declaredMode, parentModeToHand) === undefined ||
        (parentMode === "auto" && declaredMode !== "plan")))
  )
    return subagentPermissionMode(parentModeToHand);
  let y = subagentPermissionMode(declaredMode);
  if (y !== "auto") return y;
  return subagentPermissionMode(fallbackFromUnavailableAutoMode("auto", parentModeToHand, model));
}
//@ chunk-e6aww6q8.js:3263593-3263621 placement
/**
 * 会写文件的工具名集合（Edit/Write/NotebookEdit）。
 */
var FILE_EDITING_TOOL_NAMES = new Set([FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME, NOTEBOOK_EDIT_TOOL_NAME]);
//@ chunk-e6aww6q8.js:3263621-3263689 placement
/**
 * 统计字符串行数（空或非字符串为 0），用于估算编辑行数。
 */
function countLines(e) {
  return typeof e === "string" && e.length > 0
    ? countCharInString(
        e,
        `
`,
      ) + 1
    : 0;
}
//@ chunk-e6aww6q8.js:3263689-3264134 placement
/**
 * 根据工具输入估算编辑的增加/删除行数：Edit（含多段 edits）按 new_string/old_string，Write 按 content，NotebookEdit 按 new_source。
 */
function countEditLines(e, n) {
  if (typeof n !== "object" || n === null)
    return {
      added: 0,
      removed: 0,
    };
  let r = n;
  if (e === FILE_EDIT_TOOL_NAME) {
    if (Array.isArray(r.edits)) {
      let added = 0;
      let removed = 0;
      for (let edit of r.edits)
        if (typeof edit === "object" && edit !== null) {
          let S = edit;
          added += countLines(S.new_string);
          removed += countLines(S.old_string);
        }
      return {
        added,
        removed,
      };
    }
    return {
      added: countLines(r.new_string),
      removed: countLines(r.old_string),
    };
  }
  if (e === FILE_WRITE_TOOL_NAME)
    return {
      added: countLines(r.content),
      removed: 0,
    };
  if (e === NOTEBOOK_EDIT_TOOL_NAME)
    return {
      added: countLines(r.new_source),
      removed: 0,
    };
  return {
    added: 0,
    removed: 0,
  };
}
//@ chunk-e6aww6q8.js:3264134-3264678 placement
/**
 * 多个代理并发写同一文件时的警告文案。
 */
var warnConcurrentWriteAgents = `Note: another write-capable agent is already running in this same working directory, and parallel agents sharing a checkout can overwrite each other's work. For parallel code-writing agents, dispatch each with isolation: "worktree".`;
var CONCURRENT_WRITE_AGENT_WARNING =
  "Note: another write-capable agent is already running in this same working directory, and parallel agents sharing a checkout can overwrite each other's work. Edit only the files your task requires, re-read a file right before changing it, and do not revert or overwrite changes you did not make.";
//@ chunk-e6aww6q8.js:3264678-3264731 placement
function isTwinklingBooleOn() {
  return getFeatureValue_SESSION_PINNED("tengu_twinkling_boole", false);
}
//@ chunk-e6aww6q8.js:3264731-3264875 placement
function agentCanEditFiles(selectedAgent) {
  let n = parseWildcardAgentTypes(selectedAgent.tools) !== null;
  for (let r of FILE_EDITING_TOOL_NAMES)
    if ((n || selectedAgent.tools?.includes(r) === true) && !selectedAgent.disallowedTools?.includes(r))
      return true;
  return false;
}
//@ chunk-e6aww6q8.js:3264875-3265270 placement
/**
 * 判断同一工作目录下是否已有正在编辑的并发子代理（未隔离时）。
 */
function hasConcurrentEditingAgentInCwd({
  taskRegistry,
  selectedAgent,
  effectiveIsolation,
  cwd,
  parentCwd,
  parentAgentId,
}) {
  if (parentCwd === null || !isTwinklingBooleOn()) return false;
  if (effectiveIsolation !== undefined || !agentCanEditFiles(selectedAgent)) return false;
  if (cwd !== undefined && !samePath(cwd, parentCwd)) return false;
  return Object.values(taskRegistry.all()).some(
    (S) =>
      S.type === "local_agent" &&
      S.status === "running" &&
      S.isObserver !== true &&
      S.agentId !== parentAgentId &&
      (S.cwd === undefined || samePath(S.cwd, parentCwd)) &&
      S.selectedAgent !== undefined &&
      agentCanEditFiles(S.selectedAgent),
  );
}
export {
  FILE_EDITING_TOOL_NAMES,
  countEditLines,
  fallbackFromUnavailableAutoMode,
  unreadableStateMessage,
  SETTLE_AGENT_BACKGROUND_MS,
  isTranscriptChainIntact,
  findAgentLaunchResults,
  isStoppedAgent,
  isResumableAgent,
  runResumeStartHooks,
  pluginDeclinedResumeMessage,
  observerToolset,
  autoBackgroundMsForLaunch,
  autoBackgroundOptions,
  settleBackgroundedAgent,
  raceAgentLaunch,
  isAgentLaunchToolUse,
  canRunAgentInWorktree,
  isRemoteAgentIsolationAvailable,
  resolveSubagentPermissionMode,
  getPushedBranchForRemoteAgent,
  hasConcurrentEditingAgentInCwd,
  CONCURRENT_WRITE_AGENT_WARNING,
  warnConcurrentWriteAgents,
  isTwinklingBooleOn,
  rememberResumableAgents,
  rememberStoppedAgents,
};

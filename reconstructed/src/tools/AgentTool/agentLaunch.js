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
import { getAutoModeUnavailableReason } from "../../utils/permissions/permissionSetup.js";
import { logForDebugging } from "../../utils/debug.js";
import { env } from "../../utils/env.js";
import { isDiskless, getIsNonInteractiveSession } from "../../bootstrap/state.js";
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
import { notifyNestedChainDropped } from "../../utils/sessionActivity.js";
import { addAgentKeepaliveReason } from "../../tasks/taskKinds.js";
import { spawnProvenanceOf } from "../../plugins/functionHooks/inputHold.js";
import { STARTED_HANDLE } from "./subagentSpawn.js";
import { isAbortedNotByInterrupt } from "../../entrypoints/sdk/controlSchemas.js";
import { AbortError, getErrnoCode, storageCauseErrnoCode } from "../../utils/errors.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:3262427-3262685 placement
function fallbackFromUnavailableAutoMode(declaredMode, parentMode, model) {
  if (declaredMode !== "auto") return declaredMode;
  let autoModeUnavailableReason = getAutoModeUnavailableReason(model);
  if (autoModeUnavailableReason === null) return declaredMode;
  logForDebugging(
    `Subagent definition's permissionMode would put it in auto mode, but auto mode is unavailable to this subagent (reason=${autoModeUnavailableReason}); keeping parent mode '${parentMode}'.`,
    {
      level: "warn",
    },
  );
  return parentMode;
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
function subagentPermissionMode(mode) {
  if (mode === "bubble") return;
  if (mode === "bypassPermissions") return "auto";
  return mode;
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
  let resolvedMode = subagentPermissionMode(declaredMode);
  if (resolvedMode !== "auto") return resolvedMode;
  return subagentPermissionMode(fallbackFromUnavailableAutoMode("auto", parentModeToHand, model));
}
//@ chunk-e6aww6q8.js:3263593-3263621 placement
/**
 * 会写文件的工具名集合（Edit/Write/NotebookEdit）。
 */
var FILE_EDITING_TOOL_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:3263593", () => {
  FILE_EDITING_TOOL_NAMES = new Set([FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME, NOTEBOOK_EDIT_TOOL_NAME]);
});
//@ chunk-e6aww6q8.js:3263621-3263689 placement
/**
 * 统计字符串行数（空或非字符串为 0），用于估算编辑行数。
 */
function countLines(text) {
  return typeof text === "string" && text.length > 0
    ? countCharInString(
        text,
        `
`,
      ) + 1
    : 0;
}
//@ chunk-e6aww6q8.js:3263689-3264134 placement
/**
 * 根据工具输入估算编辑的增加/删除行数：Edit（含多段 edits）按 new_string/old_string，Write 按 content，NotebookEdit 按 new_source。
 */
function countEditLines(toolName, input) {
  if (typeof input !== "object" || input === null)
    return {
      added: 0,
      removed: 0,
    };
  let record = input;
  if (toolName === FILE_EDIT_TOOL_NAME) {
    if (Array.isArray(record.edits)) {
      let added = 0;
      let removed = 0;
      for (let edit of record.edits)
        if (typeof edit === "object" && edit !== null) {
          let editEntry = edit;
          added += countLines(editEntry.new_string);
          removed += countLines(editEntry.old_string);
        }
      return {
        added,
        removed,
      };
    }
    return {
      added: countLines(record.new_string),
      removed: countLines(record.old_string),
    };
  }
  if (toolName === FILE_WRITE_TOOL_NAME)
    return {
      added: countLines(record.content),
      removed: 0,
    };
  if (toolName === NOTEBOOK_EDIT_TOOL_NAME)
    return {
      added: countLines(record.new_source),
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
  let hasWildcardTools = parseWildcardAgentTypes(selectedAgent.tools) !== null;
  for (let toolName of FILE_EDITING_TOOL_NAMES)
    if (
      (hasWildcardTools || selectedAgent.tools?.includes(toolName) === true) &&
      !selectedAgent.disallowedTools?.includes(toolName)
    )
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
    (task) =>
      task.type === "local_agent" &&
      task.status === "running" &&
      task.isObserver !== true &&
      task.agentId !== parentAgentId &&
      (task.cwd === undefined || samePath(task.cwd, parentCwd)) &&
      task.selectedAgent !== undefined &&
      agentCanEditFiles(task.selectedAgent),
  );
}
//@ chunk-0m7em5b4.js:10958-11027 placement
function observerToolset(resolvedTools) {
  return [
    ...resolvedTools.filter((tool) =>
      OBSERVER_EXCLUDED_TOOLS.every((excludedToolName) => !toolMatchesName(tool, excludedToolName)),
    ),
    observerReportTool,
  ];
}
//@ chunk-0m7em5b4.js:11027-11061 placement
/**
 * 本次恢复中「已停止」的代理 id 集合（可重置）。
 */
var stoppedAgentIds; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0m7em5b4.js:11027", () => {
  stoppedAgentIds = identity(new Set(), (stoppedAgentIds) => stoppedAgentIds.clear());
});
//@ chunk-0m7em5b4.js:11061-11102 placement
/**
 * 把一批代理 id 记为已停止。
 */
function rememberStoppedAgents(agentIds) {
  for (let agentId of agentIds) stoppedAgentIds.add(agentId);
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
var resumableAgentIds; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0m7em5b4.js:11134", () => {
  resumableAgentIds = identity(new Set(), (resumableAgentIds) => resumableAgentIds.clear());
});
//@ chunk-0m7em5b4.js:11168-11209 placement
/**
 * 把一批代理 id 记为可恢复。
 */
function rememberResumableAgents(agentIds) {
  for (let agentId of agentIds) resumableAgentIds.add(agentId);
}
//@ chunk-0m7em5b4.js:11209-11241 placement
/**
 * 判断某代理 id 是否被记为可恢复。
 */
function isResumableAgent(agentId) {
  return resumableAgentIds.has(agentId);
}
//@ chunk-0m7em5b4.js:11241-11388 placement
function isAgentLaunchToolUse(toolUse) {
  return (
    (toolUse.name === AGENT || toolUse.name === TASK) &&
    typeof toolUse.input === "object" &&
    toolUse.input !== null &&
    "subagent_type" in toolUse.input &&
    isWebFetchAgent_2(toolUse.input.subagent_type)
  );
}
//@ chunk-0m7em5b4.js:11388-11821 placement
function findAgentLaunchResults(messages, agentId) {
  let launchToolUseIds = new Set();
  for (let message of messages)
    if (message.type === "assistant") {
      let content = message.message.content;
      if (!Array.isArray(content)) continue;
      for (let block of content)
        if (block.type === "tool_use" && isAgentLaunchToolUse(block)) launchToolUseIds.add(block.id);
    } else if (message.type === "user" && launchToolUseIds.size > 0) {
      let toolUseResult = message.toolUseResult;
      let content = message.message.content;
      if (
        typeof toolUseResult !== "object" ||
        toolUseResult === null ||
        !("agentId" in toolUseResult) ||
        toolUseResult.agentId !== agentId ||
        !Array.isArray(content)
      )
        continue;
      if (content.some((block) => block.type === "tool_result" && launchToolUseIds.has(block.tool_use_id)))
        return true;
    }
  return false;
}
//@ chunk-0m7em5b4.js:11821-11865 placement
/**
 * 前台代理自动转后台的等待时间：未指定时沿用传入值，否则看是否禁止了前台转后台。
 */
function autoBackgroundMsForLaunch(backgroundLaunchGate, backgroundTasksAvailable) {
  return backgroundLaunchGate === undefined ? backgroundTasksAvailable : isForegroundAgentMoveDisabled();
}
//@ chunk-0m7em5b4.js:11865-11988 placement
function autoBackgroundOptions(backgroundLaunchGate, autoBackgroundMs) {
  return {
    autoBackgroundMs: autoBackgroundMs || !env.CLAUDE_AUTO_BACKGROUND_TASKS ? undefined : 120000,
    waitsOnRuleMove: backgroundLaunchGate !== undefined && !autoBackgroundMs,
  };
}
//@ chunk-0m7em5b4.js:11988-12098 placement
function raceAgentLaunch(launchPromise, backgroundSignal, alreadyBackgrounded) {
  return alreadyBackgrounded
    ? launchPromise.then(() => "done")
    : Promise.race([launchPromise.then(() => "done"), backgroundSignal.then(() => "backgrounded")]);
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
  let keptAlive = outcome === "done" && agentTask.hasAgentChildKeepalive(taskId, taskRegistry);
  if (keptAlive) agentTask.backgroundAgentTask(taskId, taskRegistry);
  let status = taskRegistry.get(taskId)?.status;
  let endedBeforeBackgrounding =
    outcome === "backgrounded" &&
    !keptAlive &&
    status !== undefined &&
    status !== "running" &&
    !agentTask.hasAgentChildKeepalive(taskId, taskRegistry);
  let isBackgrounded = outcome === "backgrounded" && !endedBeforeBackgrounding;
  if (!isBackgrounded && !keptAlive) return false;
  wait.moved = true;
  if (isBackgrounded) agentTask.armWorkerCheckinForBackgroundedAgent(taskId, taskRegistry, sessionScratch);
  registration.detachParentAbortRelay();
  notifyNestedChainDropped(taskId);
  if (!getIsNonInteractiveSession()) addAgentKeepaliveReason(ownerAgentId, `agent:${taskId}`, taskRegistry);
  return true;
}
//@ chunk-0m7em5b4.js:12583-12847 placement
async function runResumeStartHooks(agentId, { origin, ...launchOptions }) {
  let hookOrigin = spawnProvenanceOf(agentId)?.hookOrigin;
  let launchResult = await launchAgentsWithHooks({
    ...launchOptions,
    agents: [],
    resume: Object.freeze({
      agentId,
    }),
    origin: hookOrigin === undefined ? origin : [...hookOrigin, ...(origin ?? [])],
  });
  if (
    launchResult.starting !== STARTED_HANDLE &&
    isAbortedNotByInterrupt(launchOptions.signal, launchOptions.background)
  ) {
    launchResult.starting?.[Symbol.dispose]();
    throw new AbortError();
  }
  return launchResult;
}
//@ chunk-0m7em5b4.js:12847-12906 placement
function pluginDeclinedResumeMessage(deny) {
  return `a plugin declined the resume: ${deny}`;
}
//@ chunk-0m7em5b4.js:12906-13191 placement
function isTranscriptChainIntact(messages, preservedUuids) {
  let filtered = messages.filter(isPlainObject);
  let parentUuidByUuid = new Map(
    filtered.flatMap((message) => (message.uuid === undefined ? [] : [[message.uuid, message.parentUuid]])),
  );
  let preservedUuidSet = new Set(preservedUuids);
  let isAnchored = (parentUuid) => parentUuidByUuid.has(parentUuid) || preservedUuidSet.has(parentUuid);
  let exemptUuids = new Set(filtered.flatMap(getPreservedMessageUuids));
  return (
    preservedUuids.length > 0 &&
    isNil(parentUuidByUuid.get(preservedUuids[0])) &&
    [...exemptUuids].every(isAnchored) &&
    filtered.every(
      (message) =>
        isNil(message.parentUuid) || isAnchored(message.parentUuid) || exemptUuids.has(message.uuid),
    )
  );
}
//@ chunk-0m7em5b4.js:13191-13234 placement
/**
 * 值为 undefined 或 null（用于判断消息链是否完整）。
 */
function isNil(value) {
  return value === undefined || value === null;
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
function unreadableStateMessage(error, canRetry) {
  return `its saved state cannot be read (${getErrnoCode(error) ?? storageCauseErrnoCode(error) ?? "storage error"}), so it cannot be told whether the user stopped it. ${canRetry ? "Send the message again in a moment, or the user" : "The user"} can resume it themselves.`;
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

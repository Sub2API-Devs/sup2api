/**
 * tools/AgentTool/agentLaunch.ts
 *
 * 2.1.316 新增：子代理启动参数整理
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (13), chunk-yz2nt7xx.js (20)
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
import { EDIT } from "../FileEditTool/constants.js";
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
import { matchesToolName } from "../../Tool.js";
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

//@ chunk-5xgkngpb.js:3348741-3348999 placement
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
//@ chunk-5xgkngpb.js:3348999-3349273 placement
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
//@ chunk-5xgkngpb.js:3349273-3349355 placement
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
//@ chunk-5xgkngpb.js:3349355-3349583 placement
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
//@ chunk-5xgkngpb.js:3349583-3349671 placement
/**
 * 把父代理的权限模式转换成子代理可用的模式（bubble 不透传、bypassPermissions 降为 auto）。
 */
function subagentPermissionMode(mode) {
  if (mode === "bubble") return;
  if (mode === "bypassPermissions") return "auto";
  return mode;
}
//@ chunk-5xgkngpb.js:3349671-3349907 placement
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
//@ chunk-5xgkngpb.js:3349907-3349935 placement
/**
 * 会写文件的工具名集合（Edit/Write/NotebookEdit）。
 */
var FILE_EDITING_TOOL_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:3349907", () => {
  FILE_EDITING_TOOL_NAMES = new Set([EDIT, FILE_WRITE_TOOL_NAME, NOTEBOOK_EDIT_TOOL_NAME]);
});
//@ chunk-5xgkngpb.js:3349935-3350003 placement
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
//@ chunk-5xgkngpb.js:3350003-3350448 placement
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
  if (toolName === EDIT) {
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
//@ chunk-5xgkngpb.js:3350448-3350992 placement
/**
 * 多个代理并发写同一文件时的警告文案。
 */
var warnConcurrentWriteAgents = `Note: another write-capable agent is already running in this same working directory, and parallel agents sharing a checkout can overwrite each other's work. For parallel code-writing agents, dispatch each with isolation: "worktree".`;
var CONCURRENT_WRITE_AGENT_WARNING =
  "Note: another write-capable agent is already running in this same working directory, and parallel agents sharing a checkout can overwrite each other's work. Edit only the files your task requires, re-read a file right before changing it, and do not revert or overwrite changes you did not make.";
//@ chunk-5xgkngpb.js:3350992-3351045 placement
function isTwinklingBooleOn() {
  return getFeatureValue_SESSION_PINNED("tengu_twinkling_boole", false);
}
//@ chunk-5xgkngpb.js:3351045-3351189 placement
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
//@ chunk-5xgkngpb.js:3351189-3351584 placement
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
//@ chunk-yz2nt7xx.js:11147-11216 placement
function observerToolset(resolvedTools) {
  return [
    ...resolvedTools.filter((tool) =>
      OBSERVER_EXCLUDED_TOOLS.every((excludedToolName) => !matchesToolName(tool, excludedToolName)),
    ),
    observerReportTool,
  ];
}
//@ chunk-yz2nt7xx.js:11216-11250 placement
/**
 * 本次恢复中「已停止」的代理 id 集合（可重置）。
 */
var stoppedAgentIds; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-yz2nt7xx.js:11216", () => {
  stoppedAgentIds = identity(new Set(), (stoppedAgentIds) => stoppedAgentIds.clear());
});
//@ chunk-yz2nt7xx.js:11250-11291 placement
/**
 * 把一批代理 id 记为已停止。
 */
function rememberStoppedAgents(agentIds) {
  for (let agentId of agentIds) stoppedAgentIds.add(agentId);
}
//@ chunk-yz2nt7xx.js:11291-11323 placement
/**
 * 判断某代理 id 是否被记为已停止。
 */
function isStoppedAgent(agentId) {
  return stoppedAgentIds.has(agentId);
}
//@ chunk-yz2nt7xx.js:11323-11357 placement
/**
 * 「可恢复」的代理 id 集合（可重置）。
 */
var resumableAgentIds; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-yz2nt7xx.js:11323", () => {
  resumableAgentIds = identity(new Set(), (resumableAgentIds) => resumableAgentIds.clear());
});
//@ chunk-yz2nt7xx.js:11357-11398 placement
/**
 * 把一批代理 id 记为可恢复。
 */
function rememberResumableAgents(agentIds) {
  for (let agentId of agentIds) resumableAgentIds.add(agentId);
}
//@ chunk-yz2nt7xx.js:11398-11430 placement
/**
 * 判断某代理 id 是否被记为可恢复。
 */
function isResumableAgent(agentId) {
  return resumableAgentIds.has(agentId);
}
//@ chunk-yz2nt7xx.js:11430-11577 placement
function isAgentLaunchToolUse(toolUse) {
  return (
    (toolUse.name === AGENT || toolUse.name === TASK) &&
    typeof toolUse.input === "object" &&
    toolUse.input !== null &&
    "subagent_type" in toolUse.input &&
    isWebFetchAgent_2(toolUse.input.subagent_type)
  );
}
//@ chunk-yz2nt7xx.js:11577-12010 placement
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
//@ chunk-yz2nt7xx.js:12010-12054 placement
/**
 * 前台代理自动转后台的等待时间：未指定时沿用传入值，否则看是否禁止了前台转后台。
 */
function autoBackgroundMsForLaunch(backgroundLaunchGate, backgroundTasksAvailable) {
  return backgroundLaunchGate === undefined ? backgroundTasksAvailable : isForegroundAgentMoveDisabled();
}
//@ chunk-yz2nt7xx.js:12054-12206 placement
function autoBackgroundOptions(backgroundLaunchGate, autoBackgroundMs) {
  return {
    autoBackgroundMs:
      !autoBackgroundMs &&
      (env.CLAUDE_AUTO_BACKGROUND_TASKS || backgroundLaunchGate?.armsMoveTimer?.() === true)
        ? 120000
        : undefined,
    waitsOnRuleMove: backgroundLaunchGate !== undefined && !autoBackgroundMs,
  };
}
//@ chunk-yz2nt7xx.js:12206-12316 placement
function raceAgentLaunch(launchPromise, backgroundSignal, alreadyBackgrounded) {
  return alreadyBackgrounded
    ? launchPromise.then(() => "done")
    : Promise.race([launchPromise.then(() => "done"), backgroundSignal.then(() => "backgrounded")]);
}
//@ chunk-yz2nt7xx.js:12316-12801 placement
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
//@ chunk-yz2nt7xx.js:12801-13065 placement
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
//@ chunk-yz2nt7xx.js:13065-13124 placement
function pluginDeclinedResumeMessage(deny) {
  return `a plugin declined the resume: ${deny}`;
}
//@ chunk-yz2nt7xx.js:13124-13409 placement
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
//@ chunk-yz2nt7xx.js:13409-13452 placement
/**
 * 值为 undefined 或 null（用于判断消息链是否完整）。
 */
function isNil(value) {
  return value === undefined || value === null;
}
//@ chunk-yz2nt7xx.js:13452-13570 placement
function getPreservedMessageUuids({ compactMetadata }) {
  let preservedMessages = isPlainObject(compactMetadata) ? compactMetadata.preservedMessages : undefined;
  return isPlainObject(preservedMessages) && Array.isArray(preservedMessages.uuids)
    ? preservedMessages.uuids
    : [];
}
//@ chunk-yz2nt7xx.js:13570-13582 placement
var SETTLE_AGENT_BACKGROUND_MS = 2000;
//@ chunk-yz2nt7xx.js:13582-13815 placement
function unreadableStateMessage(error, canRetry) {
  return `its saved state cannot be read (${getErrnoCode(error) ?? storageCauseErrnoCode(error) ?? "storage error"}), so it cannot be told whether the user stopped it. ${canRetry ? "Send the message again in a moment, or the user" : "The user"} can resume it themselves.`;
}
export {
  rememberResumableAgents,
  rememberStoppedAgents,
  FILE_EDITING_TOOL_NAMES,
  countEditLines,
  isRemoteAgentIsolationAvailable,
  isTwinklingBooleOn,
  canRunAgentInWorktree,
  runResumeStartHooks,
  pluginDeclinedResumeMessage,
  autoBackgroundMsForLaunch,
  resolveSubagentPermissionMode,
  getPushedBranchForRemoteAgent,
  hasConcurrentEditingAgentInCwd,
  CONCURRENT_WRITE_AGENT_WARNING,
  autoBackgroundOptions,
  raceAgentLaunch,
  settleBackgroundedAgent,
  observerToolset,
  fallbackFromUnavailableAutoMode,
  isAgentLaunchToolUse,
  warnConcurrentWriteAgents,
  unreadableStateMessage,
  SETTLE_AGENT_BACKGROUND_MS,
  isTranscriptChainIntact,
  findAgentLaunchResults,
  isStoppedAgent,
  isResumableAgent,
};

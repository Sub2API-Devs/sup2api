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
  Ct,
  launchAgentsWithHooks,
} from "../ObserverReportTool/ObserverReportTool.js";
import { toolMatchesName } from "../../Tool.js";
import { ge } from "../../utils/identity.js";
import { AGENT, TASK } from "./constants.js";
import { k_n } from "../WebFetchTool/harnessNotes.js";
import { isForegroundAgentMoveDisabled } from "./backgroundGates.js";
import { env } from "../../utils/env.js";
import { K_i } from "../../utils/sessionActivity.js";
import { getIsNonInteractiveSession, isDiskless } from "../../bootstrap/state.js";
import { addAgentKeepaliveReason } from "../../tasks/taskKinds.js";
import { j9n } from "../../plugins/functionHooks/inputHold.js";
import { freeze } from "./subagentSpawn.js";
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
import { I_r, narrowerMode } from "../../utils/permissions/browserToolNames.js";
import { FILE_EDIT_TOOL_NAME } from "../FileEditTool/constants.js";
import { FILE_WRITE_TOOL_NAME } from "../FileWriteTool/prompt.js";
import { NOTEBOOK_EDIT_TOOL_NAME } from "../NotebookEditTool/constants.js";
import { countCharInString } from "../../utils/stringUtils.js";
import { parseWildcardAgentTypes } from "../../utils/permissions/permissions.js";
import { samePath } from "../../utils/file.js";

//@ chunk-0m7em5b4.js:10958-11027 placement
function observerToolset(e) {
  return [...e.filter((h) => OBSERVER_EXCLUDED_TOOLS.every((w) => !toolMatchesName(h, w))), Ct];
}
//@ chunk-0m7em5b4.js:11027-11061 placement
var Dt = ge(new Set(), (e) => e.clear());
//@ chunk-0m7em5b4.js:11061-11102 placement
function iBs(e) {
  for (let h of e) Dt.add(h);
}
//@ chunk-0m7em5b4.js:11102-11134 placement
function En(e) {
  return Dt.has(e);
}
//@ chunk-0m7em5b4.js:11134-11168 placement
var Lt = ge(new Set(), (e) => e.clear());
//@ chunk-0m7em5b4.js:11168-11209 placement
function Xzn(e) {
  for (let h of e) Lt.add(h);
}
//@ chunk-0m7em5b4.js:11209-11241 placement
function It(e) {
  return Lt.has(e);
}
//@ chunk-0m7em5b4.js:11241-11388 placement
function isAgentLaunchToolUse(e) {
  return (
    (e.name === AGENT || e.name === TASK) &&
    typeof e.input === "object" &&
    e.input !== null &&
    "subagent_type" in e.input &&
    k_n(e.input.subagent_type)
  );
}
//@ chunk-0m7em5b4.js:11388-11821 placement
function findAgentLaunchResults(e, h) {
  let w = new Set();
  for (let A of e)
    if (A.type === "assistant") {
      let content = A.message.content;
      if (!Array.isArray(content)) continue;
      for (let P of content) if (P.type === "tool_use" && isAgentLaunchToolUse(P)) w.add(P.id);
    } else if (A.type === "user" && w.size > 0) {
      let toolUseResult = A.toolUseResult,
        content = A.message.content;
      if (
        typeof toolUseResult !== "object" ||
        toolUseResult === null ||
        !("agentId" in toolUseResult) ||
        toolUseResult.agentId !== h ||
        !Array.isArray(content)
      )
        continue;
      if (content.some((E) => E.type === "tool_result" && w.has(E.tool_use_id))) return !0;
    }
  return !1;
}
//@ chunk-0m7em5b4.js:11821-11865 placement
function tLr(e, h) {
  return e === void 0 ? h : isForegroundAgentMoveDisabled();
}
//@ chunk-0m7em5b4.js:11865-11988 placement
function autoBackgroundOptions(e, h) {
  return {
    autoBackgroundMs: h || !env.CLAUDE_AUTO_BACKGROUND_TASKS ? void 0 : 120000,
    waitsOnRuleMove: e !== void 0 && !h,
  };
}
//@ chunk-0m7em5b4.js:11988-12098 placement
function raceAgentLaunch(e, h, w) {
  return w ? e.then(() => "done") : Promise.race([e.then(() => "done"), h.then(() => "backgrounded")]);
}
//@ chunk-0m7em5b4.js:12098-12583 placement
function settleBackgroundedAgent({
  outcome: outcome,
  registration: registration,
  wait: wait,
  ownerAgentId: ownerAgentId,
  taskRegistry: taskRegistry,
  sessionScratch: sessionScratch,
  agentTask: agentTask,
}) {
  let { taskId: taskId } = registration,
    F = outcome === "done" && agentTask.hasAgentChildKeepalive(taskId, taskRegistry);
  if (F) agentTask.backgroundAgentTask(taskId, taskRegistry);
  let j = taskRegistry.get(taskId)?.status,
    Z =
      outcome === "backgrounded" &&
      !F &&
      j !== void 0 &&
      j !== "running" &&
      !agentTask.hasAgentChildKeepalive(taskId, taskRegistry),
    r = outcome === "backgrounded" && !Z;
  if (!r && !F) return !1;
  if (((wait.moved = !0), r))
    agentTask.armWorkerCheckinForBackgroundedAgent(taskId, taskRegistry, sessionScratch);
  if ((registration.detachParentAbortRelay(), K_i(taskId), !getIsNonInteractiveSession()))
    addAgentKeepaliveReason(ownerAgentId, `agent:${taskId}`, taskRegistry);
  return !0;
}
//@ chunk-0m7em5b4.js:12583-12847 placement
async function runResumeStartHooks(e, { origin: origin, ...w }) {
  let A = j9n(e)?.hookOrigin,
    S = await launchAgentsWithHooks({
      ...w,
      agents: [],
      resume: Object.freeze({ agentId: e }),
      origin: A === void 0 ? origin : [...A, ...(origin ?? [])],
    });
  if (S.starting !== freeze && isAbortedNotByInterrupt(w.signal, w.background))
    throw (S.starting?.[Symbol.dispose](), new AbortError());
  return S;
}
//@ chunk-0m7em5b4.js:12847-12906 placement
function pluginDeclinedResumeMessage(e) {
  return `a plugin declined the resume: ${e}`;
}
//@ chunk-0m7em5b4.js:12906-13191 placement
function isTranscriptChainIntact(e, h) {
  let filtered = e.filter(isPlainObject),
    A = new Map(filtered.flatMap((O) => (O.uuid === void 0 ? [] : [[O.uuid, O.parentUuid]]))),
    S = new Set(h),
    P = (O) => A.has(O) || S.has(O),
    E = new Set(filtered.flatMap(getPreservedMessageUuids));
  return (
    h.length > 0 &&
    Wt(A.get(h[0])) &&
    [...E].every(P) &&
    filtered.every((O) => Wt(O.parentUuid) || P(O.parentUuid) || E.has(O.uuid))
  );
}
//@ chunk-0m7em5b4.js:13191-13234 placement
function Wt(e) {
  return e === void 0 || e === null;
}
//@ chunk-0m7em5b4.js:13234-13352 placement
function getPreservedMessageUuids({ compactMetadata: compactMetadata }) {
  let h = isPlainObject(compactMetadata) ? compactMetadata.preservedMessages : void 0;
  return isPlainObject(h) && Array.isArray(h.uuids) ? h.uuids : [];
}
//@ chunk-0m7em5b4.js:13352-13364 placement
var Lr = 2000;
//@ chunk-0m7em5b4.js:13364-13597 placement
function unreadableStateMessage(e, h) {
  return `its saved state cannot be read (${getErrnoCode(e) ?? storageCauseErrnoCode(e) ?? "storage error"}), so it cannot be told whether the user stopped it. ${h ? "Send the message again in a moment, or the user" : "The user"} can resume it themselves.`;
}
//@ chunk-e6aww6q8.js:3262427-3262685 placement
function fallbackFromUnavailableAutoMode(e, n, r) {
  if (e !== "auto") return e;
  let s = getAutoModeUnavailableReason(r);
  if (s === null) return e;
  return (
    logForDebugging(
      `Subagent definition's permissionMode would put it in auto mode, but auto mode is unavailable to this subagent (reason=${s}); keeping parent mode '${n}'.`,
      { level: "warn" },
    ),
    n
  );
}
//@ chunk-e6aww6q8.js:3262685-3262959 placement
function isRemoteAgentIsolationAvailable() {
  if (env.CLAUDE_CODE_EVAL_CONFINED) return !1;
  if (isDiskless()) return !1;
  if (!isFirstPartyProvider()) return !1;
  if (env.CLAUDE_CODE_REMOTE || getHostAgentPolicy().remoteAgentIsolationDisabled) return !1;
  if (!hasStoredOAuthToken()) return !1;
  if (!getCurrentProjectConfig().hasUsedRemoteSession || !getGlobalConfig().hasRemoteEnvironment) return !1;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_neapolitan", !1);
}
//@ chunk-e6aww6q8.js:3262959-3263041 placement
function GKe() {
  return (
    !env.CLAUDE_CODE_EVAL_CONFINED &&
    !isDiskless() &&
    (hasWorktreeCreateHook() || findCanonicalGitRoot(getCwd()) !== null)
  );
}
//@ chunk-e6aww6q8.js:3263041-3263269 placement
async function getPushedBranchForRemoteAgent() {
  let e = getCwd(),
    n = await getBranch(e);
  if (n === "HEAD") return;
  if (await isBranchOnOrigin(n, e)) return n;
  logForDebugging(
    `[remote agent] local branch '${n}' is not pushed to origin; remote agent will run against the repository's default branch`,
  );
  return;
}
//@ chunk-e6aww6q8.js:3263269-3263357 placement
function qZe(e) {
  if (e === "bubble") return;
  if (e === "bypassPermissions") return "auto";
  return e;
}
/**
 * 计算子代理的权限模式：未声明、或父模式受限且声明模式不比父模式更窄（或父为 auto 而声明非 plan）时沿用父模式；声明为 auto 但子代理不能用 auto 时退回父模式。
 */
//@ chunk-e6aww6q8.js:3263357-3263593 placement
function resolveSubagentPermissionMode({
  declaredMode: declaredMode,
  parentMode: parentMode,
  parentModeToHand: parentModeToHand,
  model: model,
  narrowOnly: narrowOnly = !1,
}) {
  if (
    declaredMode === void 0 ||
    ((narrowOnly || I_r(parentMode)) &&
      (narrowerMode(declaredMode, parentModeToHand) === void 0 ||
        (parentMode === "auto" && declaredMode !== "plan")))
  )
    return qZe(parentModeToHand);
  let y = qZe(declaredMode);
  if (y !== "auto") return y;
  return qZe(fallbackFromUnavailableAutoMode("auto", parentModeToHand, model));
}
//@ chunk-e6aww6q8.js:3263593-3263621 placement
var bKe = new Set([FILE_EDIT_TOOL_NAME, FILE_WRITE_TOOL_NAME, NOTEBOOK_EDIT_TOOL_NAME]);
//@ chunk-e6aww6q8.js:3263621-3263689 placement
function HV(e) {
  return typeof e === "string" && e.length > 0
    ? countCharInString(
        e,
        `
`,
      ) + 1
    : 0;
}
/**
 * 根据工具输入估算编辑的增加/删除行数：Edit（含多段 edits）按 new_string/old_string，Write 按 content，NotebookEdit 按 new_source。
 */
//@ chunk-e6aww6q8.js:3263689-3264134 placement
function countEditLines(e, n) {
  if (typeof n !== "object" || n === null) return { added: 0, removed: 0 };
  let r = n;
  if (e === FILE_EDIT_TOOL_NAME) {
    if (Array.isArray(r.edits)) {
      let s = 0,
        h = 0;
      for (let edit of r.edits)
        if (typeof edit === "object" && edit !== null) {
          let S = edit;
          ((s += HV(S.new_string)), (h += HV(S.old_string)));
        }
      return { added: s, removed: h };
    }
    return { added: HV(r.new_string), removed: HV(r.old_string) };
  }
  if (e === FILE_WRITE_TOOL_NAME) return { added: HV(r.content), removed: 0 };
  if (e === NOTEBOOK_EDIT_TOOL_NAME) return { added: HV(r.new_source), removed: 0 };
  return { added: 0, removed: 0 };
}
//@ chunk-e6aww6q8.js:3264134-3264678 placement
var warnConcurrentWriteAgents = `Note: another write-capable agent is already running in this same working directory, and parallel agents sharing a checkout can overwrite each other's work. For parallel code-writing agents, dispatch each with isolation: "worktree".`,
  N8s =
    "Note: another write-capable agent is already running in this same working directory, and parallel agents sharing a checkout can overwrite each other's work. Edit only the files your task requires, re-read a file right before changing it, and do not revert or overwrite changes you did not make.";
//@ chunk-e6aww6q8.js:3264678-3264731 placement
function KZe() {
  return getFeatureValue_SESSION_PINNED("tengu_twinkling_boole", !1);
}
//@ chunk-e6aww6q8.js:3264731-3264875 placement
function agentCanEditFiles(e) {
  let n = parseWildcardAgentTypes(e.tools) !== null;
  for (let r of bKe) if ((n || e.tools?.includes(r) === !0) && !e.disallowedTools?.includes(r)) return !0;
  return !1;
}
/**
 * 判断同一工作目录下是否已有正在编辑的并发子代理（未隔离时）。
 */
//@ chunk-e6aww6q8.js:3264875-3265270 placement
function hasConcurrentEditingAgentInCwd({
  taskRegistry: taskRegistry,
  selectedAgent: selectedAgent,
  effectiveIsolation: effectiveIsolation,
  cwd: cwd,
  parentCwd: parentCwd,
  parentAgentId: parentAgentId,
}) {
  if (parentCwd === null || !KZe()) return !1;
  if (effectiveIsolation !== void 0 || !agentCanEditFiles(selectedAgent)) return !1;
  if (cwd !== void 0 && !samePath(cwd, parentCwd)) return !1;
  return Object.values(taskRegistry.all()).some(
    (S) =>
      S.type === "local_agent" &&
      S.status === "running" &&
      S.isObserver !== !0 &&
      S.agentId !== parentAgentId &&
      (S.cwd === void 0 || samePath(S.cwd, parentCwd)) &&
      S.selectedAgent !== void 0 &&
      agentCanEditFiles(S.selectedAgent),
  );
}

export {
  bKe,
  countEditLines,
  fallbackFromUnavailableAutoMode,
  unreadableStateMessage,
  Lr,
  isTranscriptChainIntact,
  findAgentLaunchResults,
  En,
  It,
  runResumeStartHooks,
  pluginDeclinedResumeMessage,
  observerToolset,
  tLr,
  autoBackgroundOptions,
  settleBackgroundedAgent,
  raceAgentLaunch,
  isAgentLaunchToolUse,
  GKe,
  isRemoteAgentIsolationAvailable,
  resolveSubagentPermissionMode,
  getPushedBranchForRemoteAgent,
  hasConcurrentEditingAgentInCwd,
  N8s,
  warnConcurrentWriteAgents,
  KZe,
  Xzn,
  iBs,
};

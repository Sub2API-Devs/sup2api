/**
 * utils/sessionRestore.ts
 *
 * resume 后处理：采用/分叉 sessionId、恢复元数据、worktree、代理、权限模式、todos、文件历史。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sessionRestore.ts
 * pieces: chunk-08s5p3av.js (46), chunk-cqkdzt01.js (4)
 * attribution: placement 49, fingerprint 1
 */
import { resolve, win32, dirname, dirname as dirname_2 } from "path";
import { realpathSync, statSync } from "fs";
import { ge } from "./identity.js";
import { Vt, LE } from "./agentId.js";
import {
  getSessionId,
  switchSession,
  setMainThreadAgentType,
  getOriginalCwd,
  getMainLoopModelOverride,
  setMainLoopModelOverride,
  latchRefusalFallbackModel,
  getInitialMainLoopModel,
  markRefusalFallbackHeaderArmed,
  setOriginalCwd,
} from "../bootstrap/state.js";
import {
  getTranscriptPathForSession,
  isTranscriptPersistenceDisabled,
  saveWorktreeState,
  resetSessionFilePointer,
  adoptForkSessionMetadata,
  recordContentReplacement,
  restoreSessionMetadata,
  adoptResumedSessionFileAsync,
  adoptResumedSessionFile,
  saveMode,
} from "./sessionStorage.js";
import { TODO_WRITE_TOOL_NAME } from "../tools/TodoWriteTool/constants.js";
import { TodoListSchema } from "./todo/types.js";
import { primePasteIdsFromMessages, HXn } from "../history.js";
import { logError } from "./log.js";
import { getMaxStoredImageId } from "./imageStore.js";
import { fileHistoryRestoreStateFromLog } from "./fileHistory.js";
import { isTaskToolsEnabled } from "./tasks.js";
import { hookSourcesSummary } from "./hooks/hookSources.js";
import { findAgentExcludingWebFetch } from "../tools/WebFetchTool/harnessNotes.js";
import { logForDebugging } from "./debug.js";
import { CLAUDE_AGENT } from "../tools/AgentTool/built-in/claudeAgent.js";
import { logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { replaceControlChars } from "./resultError.js";
import { parseUserSpecifiedModel } from "./model/modelDisplay.js";
import {
  isExemptDefaultResolvingPick,
  isEnvDefaultModelGoverning,
  isKnownNon1mTarget,
} from "./model/defaultModel.js";
import { isModelAllowed } from "./model/modelAllowlist.js";
import { Qn, gb, cl, Eh } from "./pathClassification.js";
import { Qg, ai, yl, isNetDir } from "./networkPaths.js";
import {
  hasUntouchableRecordSpellingStrictAsync,
  hasUntouchableRecordSpelling,
  processChdir,
  findIntermediateUncJunction,
  NodeFsOperations,
} from "./fsOperations.js";
import { isPathPersistedTrusted } from "./config.js";
import {
  getAgentDefinitionsWithOverrides,
  rebuildAgentDefinitions,
} from "../tools/AgentTool/loadAgentsDir.js";
import { isCoworkAny } from "./entrypointKinds.js";
import { parsePermissionMode } from "../types/permissions.js";
import { hasComplianceTaint } from "../services/policyLimits/complianceTaints.js";
import { isProactivityActive, wasProactivityEverOn } from "../Tool.js";
import { env } from "./env.js";
import { usesFirstPartyModelIds } from "./model/providers.js";
import { reprobeEntitlementDeny } from "./model/validateModel.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, fromEnumOpt, lit } from "../services/analytics/safeMetadata.js";
import { Bn, Lt, Sv } from "./model/modelIds.js";
import { FIRST_PARTY_MODEL_IDS } from "./model/configs.js";
import { getCanonicalName } from "./model/canonicalModelName.js";
import { SYNTHETIC_MODEL } from "../constants/messages.js";
import { findServedModel } from "./model/modelCatalog/servedCatalog.js";
import { Rxt, anyModelDescribed, formatCatalogMessage } from "./model/modelCatalog/catalogCapabilities.js";
import { getLastModelIdentity } from "../constants/prompts.js";
import { getUserSpecifiedModelSetting } from "./model/smallFastModel.js";
import { isModeDependentModelSetting } from "./model/planModeModel.js";
import { isModelRemappedOrRetired } from "./model/deprecation.js";
import { has1mSuffix, supports1mBeta } from "./model/contextWindow1m.js";
import { strip1mTagWhereBuiltIn } from "./model/model.js";
import { trackClientDataFetch } from "../bridge/bridgeEnabled.js";
import { getHostState } from "./hostEnvironment.js";
import { getErrnoCode } from "./errors.js";
import { g_, checkWorktreeIsolationSync, gitRootsForPath, R6, rie } from "./worktreeIsolation.js";
import { createSystemMessage } from "./messages.js";
import { getCurrentWorktreeSession, restoreWorktreeSession } from "./worktree.js";
import { getCwd } from "./cwd.js";
import { setCwd } from "./Shell.js";
import {
  isCoveredByWorktrees,
  restoreRootsFor,
  WLe,
  isSameRestoreLocation,
  worktreeRootsFor,
} from "./sessionRestoreCwd.js";
import { clearMemoryFilesCacheForHost } from "./claudemd.js";
import { kZ } from "./contextAttachments/environment.js";
import { getPlansDirectory, primePlanSlugCollisions } from "./plans.js";
import { reanchorGitFileWatcher } from "./git/gitFilesystem.js";
import { clearIsGitMemo } from "./git.js";
import { getReplBridgeHandle } from "../bridge/replBridgeHandle.js";
import { uniq } from "./collections.js";
import { aDs, LTe } from "./sessionModelPin.js";
import { resolveResumeSessionAdoption } from "./background/adopt.js";
import { renameRecordingForSession } from "./asciicast.js";
import { isAgentSwarmsEnabled } from "./agentSwarmsEnabled.js";
import { setCostStateForRestore } from "../cost-tracker.js";
import { loe } from "./lastResumeRecord.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { permissionModeForProactivityLevel } from "./permissions/getNextPermissionMode.js";
import { permissionModeTitle } from "./permissions/PermissionMode.js";
import { reclaimSessionNameOnResume } from "./sessionNameUniqueness.js";
import { isHumanOrAutoContinuation } from "./messageProvenance.js";
import { resumeInterruptedTurn } from "./conversationRecovery.js";
import { removeInterruptedMessage } from "../cli/print.js";
import { Spe } from "../services/plugins/accountSync/syncedPluginHooks.js";
import { HostScoped } from "./hostScoped.js";

//@ chunk-08s5p3av.js:6314-6364 placement
var re = ge({ recorded: null }, (e) => {
  e.recorded = null;
});
/**
 * 记录恢复来源会话与 transcript 路径。
 */
//@ chunk-08s5p3av.js:6364-6518 placement
function recordResumeSource({ sourceSessionId: sourceSessionId, transcriptPath: transcriptPath }) {
  let o = Vt(sourceSessionId);
  re.recorded =
    o === null
      ? null
      : {
          liveSessionId: getSessionId(),
          source: { sessionId: o, transcriptPath: transcriptPath ?? getTranscriptPathForSession(o) },
        };
}
//@ chunk-08s5p3av.js:6518-6605 placement
function d1n() {
  let { recorded: recorded } = re;
  return recorded !== null && recorded.liveSessionId === getSessionId() ? recorded.source : null;
}
/**
 * 从转录中最后一次 TodoWrite 工具调用恢复 todo 列表。
 */
//@ chunk-08s5p3av.js:6605-6923 fingerprint = extractTodosFromTranscript (1)
function extractTodosFromTranscript(messages) {
  for (let r = messages.length - 1; r >= 0; r--) {
    let msg = messages[r];
    if (msg?.type !== "assistant") continue;
    let toolUse = msg.message.content.find(
      (block) => block.type === "tool_use" && block.name === TODO_WRITE_TOOL_NAME,
    );
    if (!toolUse || toolUse.type !== "tool_use") continue;
    let input = toolUse.input;
    if (input === null || typeof input !== "object") return [];
    let parsed = TodoListSchema().safeParse(input.todos);
    return parsed.success ? parsed.data : [];
  }
  return [];
}
//@ chunk-08s5p3av.js:6923-7076 placement
function maybeSwitchSessionForResume(e) {
  if (typeof e.resume !== "string" || e.forkSession || e.hasSessionIdFlag) return !1;
  let r = Vt(e.resume);
  if (!r) return !1;
  return (switchSession(LE(r), "resume"), !0);
}
/**
 * 从日志恢复文件历史、署名快照、todos 等运行时状态。
 */
//@ chunk-08s5p3av.js:7076-7492 placement = restoreSessionStateFromLog (0.519)
function restoreSessionStateFromLog(e, r, o, n) {
  try {
    primePasteIdsFromMessages(e.messages ?? []);
  } catch (error) {
    logError(error);
  }
  if (
    (getMaxStoredImageId().then(HXn).catch(logError),
    e.fileHistorySnapshots && e.fileHistorySnapshots.length > 0)
  )
    fileHistoryRestoreStateFromLog(e.fileHistorySnapshots, (newState) => {
      r((prev) => ({ ...prev, fileHistory: newState }));
    });
  if (
    (require("./chunk-qt283wyj.js").restoreGoalFromTranscript(e.messages, r, o),
    !isTaskToolsEnabled() && e.messages && e.messages.length > 0)
  ) {
    let todos = extractTodosFromTranscript(e.messages);
    if (todos.length > 0) {
      let agentId = getSessionId();
      r((prev) => ({ ...prev, todos: { ...prev.todos, [agentId]: todos } }));
    }
  }
}
//@ chunk-08s5p3av.js:7492-7514 placement
function noopRestore(e) {
  return;
}
//@ chunk-08s5p3av.js:7514-7597 placement
function computeStandaloneAgentContext(agentName, agentColor) {
  if (!agentName && !agentColor) return;
  return { name: agentName ?? "", color: agentColor === "default" ? void 0 : agentColor };
}
/**
 * 按会话记录的 agent-setting 恢复主线程代理定义，找不到时警告。
 */
//@ chunk-08s5p3av.js:7597-8894 placement = restoreAgentFromSession (0.393)
function restoreAgentFromSession(e, r, o, n) {
  if (r) return { agentDefinition: r, agentType: void 0 };
  if (!e)
    return (
      setMainThreadAgentType(void 0),
      hookSourcesSummary(void 0),
      { agentDefinition: void 0, agentType: void 0 }
    );
  let s = n?.sessionAgentDefinitions
      ? findAgentExcludingWebFetch(n.sessionAgentDefinitions.activeAgents, e)
      : void 0,
    u = s ?? findAgentExcludingWebFetch(o.activeAgents, e);
  if (s)
    logForDebugging(
      `Resume: agent "${e}" restored from the session home set (${n?.sessionCwd ?? "unknown"})`,
    );
  if (!u) {
    if (
      (logForDebugging(
        `Resumed session had agent "${e}" but it is no longer available. Using default behavior.`,
      ),
      e !== CLAUDE_AGENT.agentType)
    ) {
      if ((logFeatureSad("session_resume", "agent_resolve_miss"), n?.onResolveMiss)) {
        let d = getOriginalCwd(),
          p = n.sessionAgentDefinitions && n.sessionCwd && n.sessionCwd !== d ? `${n.sessionCwd} or ${d}` : d;
        n.onResolveMiss(
          replaceControlChars(
            `This session was running agent '${e}', which is no longer available (no agent by that name in ${p}). ` +
              "Continuing with the default tools and system prompt \u2014 the agent's tool restrictions no longer apply. " +
              "To restore it, re-create the agent, or resume with an explicit --agent <name>.",
          ),
        );
      }
    }
    return (
      setMainThreadAgentType(void 0),
      hookSourcesSummary(void 0),
      { agentDefinition: void 0, agentType: void 0 }
    );
  }
  if (
    (setMainThreadAgentType(u.agentType),
    hookSourcesSummary(u),
    !getMainLoopModelOverride() && u.model && u.model !== "inherit")
  ) {
    let d = parseUserSpecifiedModel(u.model);
    if (isExemptDefaultResolvingPick(d) || isModelAllowed(d)) setMainLoopModelOverride(d);
    else
      logForDebugging(
        `Agent model "${u.model}" is not in the availableModels allowlist; keeping the session model`,
        { level: "warn" },
      );
  }
  return { agentDefinition: u, agentType: u.agentType };
}
//@ chunk-08s5p3av.js:8894-9344 placement
async function loadAgentDefinitionsForSessionCwd(e, r) {
  if (!e || e === getOriginalCwd()) return;
  let o = resolve(e);
  if (Qn(e) || Qn(o) || gb(e) || gb(o) || gb(win32.normalize(e)) || Qg(e) || Qg(o) || cl(e)) {
    logForDebugging(`Resume: refusing cross-host session home shape "${e}"`);
    return;
  }
  if (await hasUntouchableRecordSpellingStrictAsync(e)) {
    logForDebugging(`Resume: refusing session home with unverifiable ancestry "${e}"`);
    return;
  }
  if (!isPathPersistedTrusted(e)) {
    logForDebugging(
      `Resume: not loading agents from session home "${e}" \u2014 workspace trust not persisted for it`,
    );
    return;
  }
  try {
    return await getAgentDefinitionsWithOverrides(e, r);
  } catch {
    return;
  }
}
//@ chunk-08s5p3av.js:9344-9537 placement
function shouldAttemptAgentRestoreInPrint(e) {
  if (!e.resumedAgentSetting || e.mainThreadAgentType || isCoworkAny()) return { attempt: !1, loud: !1 };
  if (e.hasStreamingInput) return { attempt: !e.explicitAgentFlag, loud: !1 };
  return { attempt: !0, loud: !0 };
}
/**
 * 恢复会话时可沿用的权限模式（plan/bypass 不沿用，auto 受合规限制）。
 */
//@ chunk-08s5p3av.js:9537-10014 placement
async function resumedPermissionMode(e, r) {
  if (r || !e) return;
  let o = parsePermissionMode(e);
  if (o === void 0) return;
  if (o === "plan" || o === "bypassPermissions") return;
  if (o === "default") {
    let {
      isAutoModeFromFallback: isAutoModeFromFallback,
      setProvisionalStartupMode: setProvisionalStartupMode,
    } = await import("./chunk-dbas1xsr.js");
    if ((setProvisionalStartupMode(void 0), isAutoModeFromFallback())) return "default";
    return;
  }
  if (o === "auto") {
    let { isAutoStartWithheldForHipaaTaint: isAutoStartWithheldForHipaaTaint } =
      await import("./chunk-dbas1xsr.js");
    if (isAutoStartWithheldForHipaaTaint() || hasComplianceTaint("hipaa")) return;
    let { isAutoModeGateEnabled: isAutoModeGateEnabled } = await import("./chunk-x38v0jj9.js");
    if (!isAutoModeGateEnabled()) return;
  }
  return o;
}
//@ chunk-08s5p3av.js:10014-10434 placement
async function preparePlanModeRestoreOnInteractiveResume({
  storedPermissionMode: storedPermissionMode,
  messages: messages,
  forkSession: forkSession,
  permissionModeSuppliedOnInvocation: permissionModeSuppliedOnInvocation,
  lane: lane,
}) {
  let u;
  try {
    ({ planModeOnInteractiveResume: u } = await import("./chunk-9bgq43cq.js"));
  } catch (error) {
    logError(error);
  }
  return (d) => {
    if (u === void 0) return;
    try {
      let p = d.startupModeDecidedByProactivityLevel !== void 0 && isProactivityActive();
      return u(d, {
        storedPermissionMode: storedPermissionMode,
        messages: messages,
        forkSession: forkSession,
        startupModePinned: permissionModeSuppliedOnInvocation || p,
        lane: lane,
      });
    } catch (error) {
      logError(error);
      return;
    }
  };
}
//@ chunk-08s5p3av.js:10434-10588 placement
var MODEL_UNAVAILABLE_REASONS = {
  unknown_family: "not a model this version of Claude Code recognizes",
  not_allowed: "not allowed by this account's model settings",
  retired: "retired",
};
//@ chunk-08s5p3av.js:10588-10798 placement
function startupModelWinsOverSessionRestore() {
  return Boolean(
    getMainLoopModelOverride() !== void 0 ||
    env.ANTHROPIC_MODEL ||
    env.ANTHROPIC_DEFAULT_FABLE_MODEL ||
    env.ANTHROPIC_DEFAULT_OPUS_MODEL ||
    env.ANTHROPIC_DEFAULT_SONNET_MODEL ||
    env.ANTHROPIC_DEFAULT_HAIKU_MODEL ||
    isEnvDefaultModelGoverning() ||
    !usesFirstPartyModelIds(),
  );
}
//@ chunk-08s5p3av.js:10798-11528 placement
async function restoreModelFromSession(
  e,
  r,
  o,
  { scheduleTelemetry: n = (d) => d(), storageV5: s, credentials: u } = {},
) {
  if (startupModelWinsOverSessionRestore()) return;
  let d = describeSessionModelRestore(e, r),
    p =
      d.kind === "declined" && d.reason === "not_allowed"
        ? await reprobeEntitlementDeny(d.model, s, u)
        : void 0;
  if (p !== void 0 && startupModelWinsOverSessionRestore()) return;
  let m = p === "overturned" ? describeSessionModelRestore(e, r) : d;
  if (m.kind === "none") return;
  if (m.kind === "mode_dependent_setting") {
    n(() => logEvent("tengu_resume_model_restore", { outcome: fromEnum("skipped_mode_dependent_setting") }));
    return;
  }
  if (m.kind === "declined")
    n(() =>
      logEvent("tengu_resume_model_restore", {
        outcome: fromEnum("declined"),
        decline_reason: fromEnumOpt(m.reason),
        entitlement_reprobe: fromEnumOpt(p),
      }),
    );
  if (m.kind === "declined") {
    let S = (r && Bn(r)) || "the default model";
    o?.(
      `Session model ${m.model} could not be restored (${MODEL_UNAVAILABLE_REASONS[m.reason]}) \u2014 using ${S} instead.`,
    );
    return;
  }
  return m.model;
}
//@ chunk-08s5p3av.js:11528-11595 placement
function lastTranscriptModel(e, r) {
  let o = describeSessionModelRestore(e, r);
  return o.kind === "ok" ? o.model : void 0;
}
/**
 * opusplan 覆盖 opus/sonnet，haiku 覆盖 haiku/sonnet（判断别名是否与父模型同档）。
 */
//@ chunk-08s5p3av.js:11595-11751 placement = aliasMatchesParentTier (0.83)
function aliasCoversModelFamily(alias, parentModel) {
  if (alias === "opusplan") return parentModel.includes("opus") || parentModel.includes("sonnet");
  if (alias === "haiku") return parentModel.includes("haiku") || parentModel.includes("sonnet");
  return !1;
}
//@ chunk-08s5p3av.js:11751-12755 placement
function describeSessionModelRestore(e, r) {
  let o = new Set(FIRST_PARTY_MODEL_IDS.map((u) => getCanonicalName(u))),
    n = r ? parseUserSpecifiedModel(r) : void 0,
    s = n ? Bn(n) : void 0;
  for (let u = e.length - 1; u >= 0; u--) {
    let d = e[u];
    if (
      d?.type !== "assistant" ||
      d.isMeta ||
      typeof d.message?.model !== "string" ||
      d.message.model === SYNTHETIC_MODEL
    )
      continue;
    let p = typeof d.inPlaceOfModel === "string" ? d.inPlaceOfModel : d.message.model,
      m = findServedModel(p),
      S = getCanonicalName(p),
      w = o.has(S) || (m !== void 0 && Rxt(m)) || anyModelDescribed(S) || Bn(p) === s,
      g = getLastModelIdentity(e)?.modelId,
      h = w || g === void 0 ? p : Bn(g),
      M = findServedModel(h),
      R = w || (g !== void 0 && !(M !== void 0 && formatCatalogMessage(M))),
      v = getUserSpecifiedModelSetting(),
      T = typeof v === "string" ? Lt(v) : v;
    if (isModeDependentModelSetting(T) && aliasCoversModelFamily(T, getCanonicalName(h)))
      return { kind: "mode_dependent_setting" };
    let _ = !R
      ? "unknown_family"
      : !isExemptDefaultResolvingPick(h) && !isModelAllowed(h)
        ? "not_allowed"
        : isModelRemappedOrRetired(h)
          ? "retired"
          : void 0;
    if (_) return { kind: "declined", model: h, reason: _ };
    let A = (r && has1mSuffix(r)) || (n !== void 0 && has1mSuffix(n)),
      U =
        A && (Bn(h) === s || (r && getCanonicalName(parseUserSpecifiedModel(Bn(r))) === getCanonicalName(h))),
      C = g !== void 0 && has1mSuffix(g) && getCanonicalName(Bn(g)) === getCanonicalName(h),
      E = (A && n !== void 0 && Sv(n, h)) || (g !== void 0 && has1mSuffix(g) && Sv(g, h));
    if (
      ((U || C) && supports1mBeta(h)) ||
      (E &&
        !isKnownNon1mTarget(h) &&
        supports1mBeta(h, getCanonicalName(h, { identity: !0, overridesMap: {} })))
    )
      return { kind: "ok", model: strip1mTagWhereBuiltIn(h + "[1m]") };
    return { kind: "ok", model: h };
  }
  return { kind: "none" };
}
//@ chunk-08s5p3av.js:12755-12888 placement
function lastRefusalFallback(e) {
  for (let r = e.length - 1; r >= 0; r--) {
    let o = e[r];
    if (o?.type === "system" && o.subtype === "model_refusal_fallback") return o;
  }
  return;
}
//@ chunk-08s5p3av.js:12888-12994 placement
function isRefusalFallbackModel(e, r) {
  let o = lastRefusalFallback(e);
  if (!o) return !1;
  let n = Bn(o.fallbackModel),
    s = Bn(r);
  return n === s || getCanonicalName(n) === getCanonicalName(s);
}
//@ chunk-08s5p3av.js:12994-13184 placement
function neutralizeForkFallbackBanners(e) {
  for (let r = e.length - 1; r >= 0; r--) {
    let o = e[r];
    if (o?.type === "system" && o.subtype === "model_refusal_fallback") o.neutralizedByFork = !0;
    if (o?.type === "user") delete o.turnAttributionKey;
  }
}
//@ chunk-08s5p3av.js:13184-13283 placement
function Fe(e) {
  let r = lastRefusalFallback(e);
  return r?.neutralizedByFork === !0 ? { fallbackModel: r.fallbackModel } : void 0;
}
//@ chunk-08s5p3av.js:13283-13344 placement
function D(e) {
  logEvent("tengu_resume_model_restore", { outcome: fromEnum(e) });
}
//@ chunk-08s5p3av.js:13344-13433 placement
function ne(e, r) {
  trackClientDataFetch(import("./chunk-1qx2v2vg.js").then((o) => o.fetchBootstrapData(e, r)));
}
//@ chunk-08s5p3av.js:13433-13998 placement
function installRestoredModel(e, r, o, n, s) {
  if (!isRefusalFallbackModel(e, r)) return (setMainLoopModelOverride(r), ne(n, s), D("restored"), r);
  if (o) {
    (logEvent("tengu_refusal_fallback_resume_latch", { action: fromEnum("fork_skip_restore") }),
      D("skipped_fork_fallback"));
    return;
  }
  let u = Fe(e);
  if (u && Bn(u.fallbackModel) === Bn(r)) {
    (logEvent("tengu_refusal_fallback_resume_latch", { action: fromEnum("fork_neutralized_skip") }),
      D("skipped_fork_neutralized"));
    return;
  }
  return (
    setMainLoopModelOverride(r),
    ne(n, s),
    latchRefusalFallbackModel({
      fallbackModel: r,
      previousOverride: void 0,
      previousAppStateModel: getInitialMainLoopModel() ?? null,
      previousModelForSession: null,
    }),
    D("restored"),
    logEvent("tengu_refusal_fallback_resume_latch", { action: fromEnum("model_latch_only") }),
    r
  );
}
//@ chunk-08s5p3av.js:13998-14369 placement
function rearmRefusalFallbackHeaderFromTranscript(e, r) {
  if (r) return;
  let flattened = e.flatMap((n) =>
    n?.type === "system" &&
    n.subtype === "model_refusal_fallback" &&
    (n.apiRefusalCategory === "cyber" || n.sawCyberRefusal === !0) &&
    n.neutralizedByFork !== !0
      ? [n]
      : [],
  );
  if (flattened.length > 0)
    (markRefusalFallbackHeaderArmed(
      flattened.find((n) => n.apiRefusalCategory === "cyber" && n.requestId != null)?.requestId ?? void 0,
    ),
      logEvent("tengu_refusal_fallback_resume_latch", { action: fromEnum("header_rearmed") }));
}
//@ chunk-08s5p3av.js:14369-14431 placement
async function Ne(e, r, o, n, s) {
  if (!e) return n;
  return reloadAgentDefinitionsForModeSwitch(r, o, s);
}
//@ chunk-08s5p3av.js:14431-14543 placement
async function reloadAgentDefinitionsForModeSwitch(e, r, o) {
  getHostState().agentDefinitions.clear();
  let n = await getAgentDefinitionsWithOverrides(e, o);
  return rebuildAgentDefinitions(n, [...n.allAgents, ...r]);
}
//@ chunk-08s5p3av.js:14543-14591 placement
function ie(e) {
  try {
    return realpathSync(e);
  } catch {
    return e;
  }
}
//@ chunk-08s5p3av.js:14591-14732 placement
function directoryState(e) {
  try {
    return statSync(e).isDirectory() ? "present" : "gone";
  } catch (error) {
    let o = getErrnoCode(error);
    return o === "ENOENT" || o === "ENOTDIR" ? "gone" : "inaccessible";
  }
}
//@ chunk-08s5p3av.js:14732-14815 placement
var W = "The worktree binding could not be cleared because transcript saving is off";
//@ chunk-08s5p3av.js:14815-15660 placement
function worktreeResumeRefusalError(e, r) {
  if (e.reason === "pin-is-own-launch-tree")
    return `Error: ${g_(e.message)} The worktree binding is kept.
`;
  if (!e.poisoned)
    return `Error: could not verify worktree ${g_(e.worktreePath)} for this resume, so the resume was aborted rather than continuing without isolation. This is usually transient \u2014 the worktree binding is kept; re-run the command to retry.
`;
  let o =
    r?.bindingCleared === void 0
      ? ""
      : r.bindingCleared
        ? " The worktree binding has been cleared; re-running will continue in the current directory without worktree isolation."
        : ` ${W} for this run, so the same command will be refused again until that is resolved; to continue without the worktree, re-run with --fork-session or start a new conversation.`;
  return `Error: cannot resume into worktree ${g_(e.worktreePath)}: ${g_(e.message)} This session was not started.${o}
`;
}
//@ chunk-08s5p3av.js:15660-15952 placement
function worktreeGoneHeadlessNotice(e, r) {
  let o = r.bindingCleared
    ? "The worktree binding has been cleared."
    : `${W} for this run; a later resume will re-check it.`;
  return `Notice: the worktree ${g_(e.worktreePath)} for this session no longer exists; continuing in the current directory without worktree isolation. ${o}
`;
}
//@ chunk-08s5p3av.js:15952-16984 placement
function worktreeResumeNotice(e) {
  let r = `${W}; a later --resume will re-check it.`;
  if (e.reason === "worktree-gone")
    return `Your worktree ${g_(e.worktreePath)} no longer exists, so this session is working in the current directory without worktree isolation. ${isTranscriptPersistenceDisabled() ? r : "The worktree binding has been cleared."}`;
  if (e.reason === "pin-is-own-launch-tree")
    return `Could not re-enter your worktree ${g_(e.worktreePath)}: ${g_(e.message)} The worktree binding is kept.`;
  if (e.poisoned) {
    let o = isTranscriptPersistenceDisabled()
      ? `You are working in the current directory without worktree isolation. ${r}`
      : "This session's worktree binding has been cleared; you are working in the current directory without worktree isolation.";
    return `Did not re-enter your worktree ${g_(e.worktreePath)}: ${g_(e.message)} ${o}`;
  }
  return `Could not verify your worktree ${g_(e.worktreePath)} this time, so this session is working in the current directory without worktree isolation. The worktree binding is kept and a later --resume will retry it. If this keeps happening, the worktree's git metadata may need repair.`;
}
//@ chunk-08s5p3av.js:16984-17021 placement
var Be = "Memory is still paused from";
//@ chunk-08s5p3av.js:17021-17043 placement
function restoredMemoryPauseNotice() {
  return;
}
//@ chunk-08s5p3av.js:17043-17094 placement
var Le = "Auto-memory is still off for this session";
//@ chunk-08s5p3av.js:17094-17116 placement
function restoredAutoMemorySessionNotice() {
  return;
}
//@ chunk-08s5p3av.js:17116-17428 placement
function pushRestoredMemoryPauseNotice(e) {
  for (let [r, o] of [
    [restoredMemoryPauseNotice(), Be],
    [restoredAutoMemorySessionNotice(), Le],
  ]) {
    if (r === void 0) continue;
    let lastIndex = e.findLastIndex(
      (s) =>
        s.type === "system" &&
        s.subtype === "informational" &&
        typeof s.content === "string" &&
        s.content.includes(o),
    );
    if (lastIndex !== -1 && !e.slice(lastIndex + 1).some((s) => s.type === "user" || s.type === "assistant"))
      continue;
    e.push(createSystemMessage(r, "notice"));
  }
}
//@ chunk-08s5p3av.js:17428-17603 placement
function isNetworkTranscriptPath(e) {
  if (ai(e) || gb(e) || gb(win32.normalize(e)))
    return (
      logForDebugging(
        "[sessionRestore] transcript path is a network/NT-namespace path \u2014 not chdir-ing",
        { level: "warn" },
      ),
      !0
    );
  return !1;
}
//@ chunk-08s5p3av.js:17603-17662 placement
function restoreWorktreeForResume(e, r, o, n) {
  let s = resolveWorktreeForResume(r, o, n);
  return (e.record(s), s);
}
/**
 * 续接会话时恢复 worktree 绑定：校验记录路径（网络路径、不可验证祖先、无效 linked worktree 等拒绝），worktree 已不存在则清除绑定并回到当前目录，返回 poisoned/cleared 状态供提示。
 */
//@ chunk-08s5p3av.js:17662-21117 placement
function resolveWorktreeForResume(e, r, o) {
  let n = getCurrentWorktreeSession();
  if (n && o?.preserveBinding !== !0) return (saveWorktreeState(n), null);
  if (!e) {
    if (e === null)
      return (
        logEvent("tengu_worktree_resume_root_rejected", {
          reason: lit("worktree-exited-resume"),
          poisoned: lit("false"),
        }),
        logForDebugging(
          "[worktree] resuming a session whose worktree record was cleared (exited or scrubbed): running without isolation",
        ),
        null
      );
    if (!r || getCwd() === r) return null;
    if (isNetworkTranscriptPath(r)) return null;
    if (hasUntouchableRecordSpelling(r))
      return (
        logForDebugging("[worktree] resume: the recorded project path has a network spelling; staying put"),
        null
      );
    try {
      processChdir(r);
    } catch {
      return null;
    }
    if ((setCwd(r), isCoveredByWorktrees(r, restoreRootsFor(WLe)))) setOriginalCwd(getCwd());
    return (
      clearMemoryFilesCacheForHost(),
      kZ("resume"),
      getPlansDirectory.cache.clear?.(),
      primePlanSlugCollisions(o?.storageV5),
      reanchorGitFileWatcher(),
      clearIsGitMemo(),
      getReplBridgeHandle()?.refreshGitBranch?.(),
      null
    );
  }
  let s = o?.preserveBinding === !0;
  if (
    isNetworkTranscriptPath(e.worktreePath) ||
    Eh(e.worktreePath) ||
    yl(e.worktreePath) ||
    isNetDir(e.worktreePath) ||
    findIntermediateUncJunction(NodeFsOperations, e.worktreePath, {
      surfaceNetworkRaw: !0,
      unreadableAncestry: "unverified",
    }) !== void 0
  ) {
    if (!s) saveWorktreeState(null);
    return (
      logEvent("tengu_worktree_resume_root_rejected", {
        reason: lit("network-spelled-pin"),
        poisoned: lit("true"),
      }),
      {
        worktreePath: e.worktreePath,
        reason: "invalid-linked-worktree",
        message: "its recorded path has a network spelling, which can never be a local isolation worktree.",
        poisoned: !0,
      }
    );
  }
  let u = directoryState(e.worktreePath);
  if (u === "gone") {
    if (!s) saveWorktreeState(null);
    return (
      logEvent("tengu_worktree_resume_root_rejected", {
        reason: lit("worktree-gone"),
        poisoned: lit("true"),
      }),
      {
        worktreePath: e.worktreePath,
        reason: "worktree-gone",
        message: "the worktree directory no longer exists",
        poisoned: !0,
      }
    );
  }
  if (u === "inaccessible")
    return (
      logForDebugging(`[worktree] could not examine ${e.worktreePath} on resume; keeping the binding`, {
        level: "error",
      }),
      logEvent("tengu_worktree_resume_root_rejected", {
        reason: lit("unverifiable"),
        poisoned: lit("false"),
      }),
      {
        worktreePath: e.worktreePath,
        reason: "unverifiable",
        message: "the worktree directory could not be examined right now",
        poisoned: !1,
      }
    );
  let d = o?.liveLaunchDir ?? WLe,
    p = isSameRestoreLocation(getCwd(), e.worktreePath),
    m = checkWorktreeIsolationSync(
      e.worktreePath,
      gitRootsForPath(e.originalCwd),
      uniq([ie(d), ...gitRootsForPath(d), ie(WLe), ...gitRootsForPath(WLe)]),
      { declineSelfOwningPinUnderLiveRoot: !0 },
    );
  if (!m.ok) {
    let S = m.reason !== "unverifiable" && m.reason !== "pin-is-own-launch-tree";
    if (
      (logForDebugging(`[worktree] declining to resume into ${e.worktreePath} (${m.reason}): ${m.message}`, {
        level: "error",
      }),
      logEvent("tengu_worktree_resume_root_rejected", {
        reason: fromEnum(m.reason),
        poisoned: lit(S ? "true" : "false"),
      }),
      S)
    ) {
      if (!s) saveWorktreeState(null);
      if (p) {
        let w = dirname(e.worktreePath),
          g = directoryState(w) === "present" ? w : e.originalCwd;
        if (isSameRestoreLocation(g, e.worktreePath))
          return { worktreePath: e.worktreePath, reason: m.reason, message: m.message, poisoned: S };
        try {
          (processChdir(g), setCwd(g));
          let h = (T) => R6(T, e.worktreePath) === "same",
            M = rie(e.worktreePath),
            R = M !== null ? [M.checkout] : [],
            filtered = [...gitRootsForPath(d), ...R].filter((T) => !h(T));
          if (isCoveredByWorktrees(g, filtered, { requireCovered: !0 })) setOriginalCwd(g);
          (clearMemoryFilesCacheForHost(),
            kZ("resume"),
            clearIsGitMemo(),
            getPlansDirectory.cache.clear?.(),
            primePlanSlugCollisions(o?.storageV5),
            reanchorGitFileWatcher(),
            getReplBridgeHandle()?.refreshGitBranch?.());
        } catch {}
      }
    }
    return { worktreePath: e.worktreePath, reason: m.reason, message: m.message, poisoned: S };
  }
  try {
    processChdir(e.worktreePath);
  } catch (error) {
    let w = getErrnoCode(error);
    if (w === "ENOENT" || w === "ENOTDIR") {
      if (!s) saveWorktreeState(null);
      return (
        logEvent("tengu_worktree_resume_root_rejected", {
          reason: lit("worktree-gone"),
          poisoned: lit("true"),
        }),
        {
          worktreePath: e.worktreePath,
          reason: "worktree-gone",
          message: "the worktree directory no longer exists",
          poisoned: !0,
        }
      );
    }
    return (
      logEvent("tengu_worktree_resume_root_rejected", {
        reason: lit("unverifiable"),
        poisoned: lit("false"),
      }),
      {
        worktreePath: e.worktreePath,
        reason: "unverifiable",
        message: "the worktree directory could not be entered right now",
        poisoned: !1,
      }
    );
  }
  return (
    setCwd(e.worktreePath),
    setOriginalCwd(getCwd()),
    restoreWorktreeSession({ ...e, liveLaunchAnchor: d, originalChangeset: void 0 }),
    clearMemoryFilesCacheForHost(),
    kZ("resume"),
    getPlansDirectory.cache.clear?.(),
    primePlanSlugCollisions(o?.storageV5),
    reanchorGitFileWatcher(),
    getReplBridgeHandle()?.refreshGitBranch?.(),
    null
  );
}
/**
 * 恢复的会话记录了 worktree 但不再适用时，切回原始 cwd。
 */
//@ chunk-08s5p3av.js:21117-21728 placement = exitRestoredWorktree (0.202)
function exitRestoredWorktree(e, r) {
  let current = getCurrentWorktreeSession();
  if (!current) return;
  if (
    (restoreWorktreeSession(null), clearMemoryFilesCacheForHost(), kZ("resume"), current.worktreePath === e)
  ) {
    (getPlansDirectory.cache.clear?.(), primePlanSlugCollisions(r));
    return;
  }
  if (isNetworkTranscriptPath(current.originalCwd)) return;
  if (hasUntouchableRecordSpelling(current.originalCwd)) {
    logForDebugging("[worktree] exit: the recorded original cwd has a network spelling; staying put");
    return;
  }
  try {
    processChdir(current.originalCwd);
  } catch {
    return;
  }
  setCwd(current.originalCwd);
  let liveLaunchAnchor = current.liveLaunchAnchor;
  if (
    liveLaunchAnchor === void 0 ||
    isCoveredByWorktrees(current.originalCwd, restoreRootsFor(liveLaunchAnchor, current.worktreePath), {
      requireCovered: !0,
      coveredWitnesses: worktreeRootsFor(liveLaunchAnchor, current.worktreePath),
      extraCoveredRoots: (() => {
        let s = rie(current.worktreePath);
        return s !== null ? [s.checkout] : [];
      })(),
    })
  )
    setOriginalCwd(getCwd());
  (getPlansDirectory.cache.clear?.(),
    primePlanSlugCollisions(r),
    reanchorGitFileWatcher(),
    getReplBridgeHandle()?.refreshGitBranch?.());
}
/**
 * 恢复会话的后处理：采用或分叉 sessionId（--fork-session 时复制内容替换记录），恢复元数据、费用、worktree、代理定义与权限模式，返回启动 REPL 所需的消息与状态。
 */
//@ chunk-08s5p3av.js:21728-26335 placement = processResumedConversation (0.411)
async function processResumedConversation(result, opts, context) {
  Igt(context.session.host);
  let n = context.modeApi?.matchSessionMode(result.mode);
  if (n) result.messages.push(createSystemMessage(n, "warning"));
  let s = aDs({ ...result, source: opts.resumeSource ?? "file" }, (y) =>
      result.messages.push(createSystemMessage(y, "warning")),
    ),
    { adoptedSessionId: adoptedSessionId, effectiveFork: effectiveFork } = resolveResumeSessionAdoption(
      opts.sessionIdOverride ?? result.sessionId,
      opts.forkSession,
    );
  if (adoptedSessionId)
    (switchSession(adoptedSessionId, "resume", opts.transcriptPath ? dirname(opts.transcriptPath) : null),
      await renameRecordingForSession(context.session, context.storageV5),
      await resetSessionFilePointer());
  let p =
    adoptedSessionId && isAgentSwarmsEnabled()
      ? await (await import("./chunk-6cc2zqkz.js")).rekeySessionTeamAtStartup(context.storageV5)
      : void 0;
  if (effectiveFork) {
    if (
      (await adoptForkSessionMetadata(result, {
        stripWorktreeSession: !0,
        stripRelocatedCwd: !0,
        storageV5: context.storageV5,
      }),
      result.contentReplacements?.length)
    )
      await recordContentReplacement(result.contentReplacements, void 0, context.storageV5);
  } else restoreSessionMetadata(result, { storageV5: context.storageV5 });
  if (
    (LTe(s.declined === !0),
    pushRestoredMemoryPauseNotice(result.messages),
    setCostStateForRestore(result),
    !effectiveFork)
  ) {
    let y = restoreWorktreeForResume(loe.of(context.session.host), result.worktreeSession, void 0, {
      storageV5: context.storageV5,
    });
    if (y) result.messages.push(createSystemMessage(worktreeResumeNotice(y), "warning"));
    if (isStorageV5Enabled() && context.storageV5 !== void 0)
      await adoptResumedSessionFileAsync(context.storageV5);
    else adoptResumedSessionFile();
  }
  let m = await loadAgentDefinitionsForSessionCwd(result.projectPath, context.storageV5),
    { agentDefinition: agentDefinition, agentType: agentType } = restoreAgentFromSession(
      result.agentSetting,
      context.mainThreadAgentDefinition,
      context.agentDefinitions,
      {
        sessionAgentDefinitions: m,
        sessionCwd: result.projectPath,
        onResolveMiss: (y) => result.messages.push(createSystemMessage(y, "warning")),
      },
    ),
    permissionMode = result.permissionMode,
    h = !1;
  if (
    !context.permissionModeCliSet &&
    parsePermissionMode(permissionMode) === "auto" &&
    context.initialState.proactivityLevel === "ask" &&
    !wasProactivityEverOn()
  )
    ((permissionMode = permissionModeForProactivityLevel(
      "ask",
      { isAutoModeAvailable: !1, isBypassPermissionsModeAvailable: !1 },
      void 0,
    )),
      (h = !0),
      logForDebugging(
        `[sessionRestore] stored mode 'auto' read as '${permissionMode}': proactivity 'ask' with levels off in this process`,
      ));
  let M =
      context.initialState.toolPermissionContext.startupModeDecidedByProactivityLevel !== void 0 &&
      isProactivityActive(),
    R = await resumedPermissionMode(permissionMode, context.permissionModeCliSet || M);
  if (h) {
    let y = R ?? context.initialState.toolPermissionContext.mode;
    if (y !== "auto")
      result.messages.push(
        createSystemMessage(
          `Resumed in ${permissionModeTitle(y).toLowerCase()} mode instead of auto: this session is set to ask before each file edit, and auto mode alone would not. Press shift+tab to switch modes.`,
          "warning",
        ),
      );
  }
  let v = null;
  if (effectiveFork) neutralizeForkFallbackBanners(result.messages);
  let T = await restoreModelFromSession(
      result.messages,
      context.initialState.mainLoopModel,
      (y) => result.messages.push(createSystemMessage(y, "warning")),
      { storageV5: context.storageV5, credentials: context.credentials },
    ),
    _ = T
      ? installRestoredModel(result.messages, T, effectiveFork, context.storageV5, context.credentials)
      : void 0;
  (rearmRefusalFallbackHeaderFromTranscript(result.messages, effectiveFork),
    appendSlackTagResumeRecords(result.messages, { fork: effectiveFork, startup: !0 }));
  let modeWarning;
  if (R) {
    let { transitionPermissionMode: transitionPermissionMode } = await import("./chunk-x38v0jj9.js"),
      toolPermissionContext = context.initialState.toolPermissionContext;
    try {
      if (
        ((modeWarning = {
          ...transitionPermissionMode(toolPermissionContext.mode, R, toolPermissionContext),
          mode: R,
        }),
        !toolPermissionContext.proactivityBaseline?.fromRelaunchHandoff)
      )
        modeWarning = { ...modeWarning, proactivityBaseline: { mode: R, fromRelaunchHandoff: !1 } };
    } catch (error) {
      logForDebugging(`[sessionRestore] transitionPermissionMode rejected restored mode '${R}': ${error}`);
    }
  }
  ((modeWarning =
    (
      await preparePlanModeRestoreOnInteractiveResume({
        storedPermissionMode: permissionMode,
        messages: result.messages,
        forkSession: effectiveFork,
        permissionModeSuppliedOnInvocation: context.permissionModeSuppliedOnInvocation,
        lane: "interactive",
      })
    )(modeWarning ?? context.initialState.toolPermissionContext) ?? modeWarning),
    saveMode(context.modeApi?.isCoordinatorMode() ? "coordinator" : "normal"));
  let C = opts.includeAttribution ? noopRestore(result) : void 0,
    standaloneAgentContext = computeStandaloneAgentContext(result.agentName, result.agentColor),
    O = context.initialState.standaloneAgentContext
      ? { ...standaloneAgentContext, ...context.initialState.standaloneAgentContext }
      : standaloneAgentContext;
  reclaimSessionNameOnResume(O?.name, context.storageV5, {
    autoOnly: !result.customTitle && !context.initialState.standaloneAgentContext?.name,
  });
  let me = await Ne(!!n, context.currentCwd, context.cliAgents, context.agentDefinitions, context.storageV5),
    initialMessage = context.initialState.initialMessage;
  if (
    env.CLAUDE_CODE_RESUME_INTERRUPTED_TURN &&
    result.turnInterruptionState?.kind === "interrupted_prompt" &&
    isHumanOrAutoContinuation(result.turnInterruptionState.message.origin)
  )
    (logForDebugging("[sessionRestore] Auto-resuming interrupted turn for bg crash-respawn"),
      resumeInterruptedTurn("repl_restore", result.turnInterruptionState.message, {
        tail: result.turnInterruptionState.tail,
      }),
      removeInterruptedMessage(result.messages, result.turnInterruptionState.message),
      (initialMessage = { message: result.turnInterruptionState.message }));
  let initialState = context.initialState;
  recordResumeSource({
    sourceSessionId: opts.sessionIdOverride ?? result.sessionId,
    transcriptPath: opts.transcriptPath,
  });
  let G = Spe();
  return (
    require("./chunk-qt283wyj.js").restoreGoalFromTranscript(
      result.messages,
      (y) => {
        initialState = y(initialState);
      },
      G,
    ),
    {
      messages: result.messages.filter(
        (message) =>
          !(
            message.type === "system" &&
            (message.subtype === "bridge_status" || message.subtype === "cloud_session_status")
          ),
      ),
      sessionStartHooks: result.sessionStartHooks,
      fileHistorySnapshots: result.fileHistorySnapshots,
      contentReplacements: result.contentReplacements,
      agentName: result.agentName,
      agentColor: result.agentColor === "default" ? void 0 : result.agentColor,
      restoredAgentDef: agentDefinition,
      initialState: {
        ...initialState,
        ...(p && { teamContext: p.teamContext, teammateColors: p.teammateColors }),
        initialMessage: initialMessage,
        ...(!effectiveFork &&
          result.bridgeSessionId &&
          !(initialState.replBridgeEnabled && !initialState.replBridgeOutboundOnly) && {
            replBridgeEnabled: !0,
            replBridgeOutboundOnly: !1,
          }),
        ...(result.endedByModel ? { endedByModel: !0 } : {}),
        ...(agentType && { agent: agentType }),
        ...(v && { attentionBudget: v }),
        ...(_ && { mainLoopModel: _ }),
        ...(C && { attribution: C }),
        ...(O && { standaloneAgentContext: O }),
        ...(modeWarning && { toolPermissionContext: modeWarning }),
        agentDefinitions: me,
      },
      sessionHooks: G,
    }
  );
}
//@ chunk-08s5p3av.js:26335-26354 placement
function appendSlackTagResumeRecords(e, r) {}
//@ chunk-cqkdzt01.js:226-279 placement
class o {
  restored = !1;
  markRestored() {
    this.restored = !0;
  }
}
//@ chunk-cqkdzt01.js:279-302 placement
var r = new HostScoped(() => new o());
//@ chunk-cqkdzt01.js:302-341 placement
function Igt(t) {
  r.of(t).markRestored();
}
//@ chunk-cqkdzt01.js:341-380 placement
function Xj(t) {
  return r.of(t).restored;
}

export {
  processResumedConversation,
  startupModelWinsOverSessionRestore,
  Xj,
  d1n,
  Igt,
  reloadAgentDefinitionsForModeSwitch,
  loadAgentDefinitionsForSessionCwd,
  restoreAgentFromSession,
  restoreModelFromSession,
  appendSlackTagResumeRecords,
  computeStandaloneAgentContext,
  installRestoredModel,
  rearmRefusalFallbackHeaderFromTranscript,
  preparePlanModeRestoreOnInteractiveResume,
  restoreSessionStateFromLog,
  pushRestoredMemoryPauseNotice,
  exitRestoredWorktree,
  restoreWorktreeForResume,
  worktreeResumeNotice,
  lastTranscriptModel,
  recordResumeSource,
  neutralizeForkFallbackBanners,
  shouldAttemptAgentRestoreInPrint,
  worktreeResumeRefusalError,
  worktreeGoneHeadlessNotice,
  restoredMemoryPauseNotice,
  restoredAutoMemorySessionNotice,
  maybeSwitchSessionForResume,
};

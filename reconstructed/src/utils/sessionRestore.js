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
import { resolve, win32, dirname } from "path";
import { realpathSync, statSync } from "fs";
import { identity } from "./identity.js";
import { normalizeUuidOrNull, identityAgentId } from "./agentId.js";
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
import { primePasteIdsFromMessages, advancePasteId } from "../history.js";
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
import {
  isUncOrDevicePath,
  isDevicePrefixPath,
  hasDotSegment,
  hasDotDotSegment,
} from "./pathClassification.js";
import { isNetworkRelatedPath, isNonWslUncPath, isNetworkMountRoot, isNetDir } from "./networkPaths.js";
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
import { stripAnyVersatileSuffix, strip1mSuffix, sameModelSpelling } from "./model/modelIds.js";
import { FIRST_PARTY_MODEL_IDS } from "./model/configs.js";
import { getCanonicalName } from "./model/canonicalModelName.js";
import { SYNTHETIC_MODEL } from "../constants/messages.js";
import { findServedModel } from "./model/modelCatalog/servedCatalog.js";
import {
  activeCatalogRowKnown,
  anyModelDescribed,
  formatCatalogMessage,
} from "./model/modelCatalog/catalogCapabilities.js";
import { getLastModelIdentity } from "../constants/prompts.js";
import { getUserSpecifiedModelSetting } from "./model/smallFastModel.js";
import { isModeDependentModelSetting } from "./model/planModeModel.js";
import { isModelRemappedOrRetired } from "./model/deprecation.js";
import { has1mSuffix_2, supports1mBeta } from "./model/contextWindow1m.js";
import { strip1mTagWhereBuiltIn } from "./model/model.js";
import { trackClientDataFetch } from "../bridge/bridgeEnabled.js";
import { getHostState } from "./hostEnvironment.js";
import { getErrnoCode } from "./errors.js";
import {
  stripControlCharsForMessage,
  checkWorktreeIsolationSync,
  gitRootsForPath,
  compareSameContainment,
  worktreeLocationOf,
} from "./worktreeIsolation.js";
import { createSystemMessage } from "./messages.js";
import { getCurrentWorktreeSession, restoreWorktreeSession } from "./worktree.js";
import { getCwd } from "./cwd.js";
import { setCwd } from "./Shell.js";
import {
  isCoveredByWorktrees,
  restoreRootsFor,
  STARTUP_CWD_REALPATH,
  isSameRestoreLocation,
  worktreeRootsFor,
} from "./sessionRestoreCwd.js";
import { clearMemoryFilesCacheForHost } from "./claudemd.js";
import { resetEnvironmentCaches } from "./contextAttachments/environment.js";
import { getPlansDirectory, primePlanSlugCollisions } from "./plans.js";
import { reanchorGitFileWatcher } from "./git/gitFilesystem.js";
import { clearIsGitMemo } from "./git.js";
import { getReplBridgeHandle } from "../bridge/replBridgeHandle.js";
import { uniq } from "./collections.js";
import { switchSessionModelPin, noopModelPinReset } from "./sessionModelPin.js";
import { resolveResumeSessionAdoption } from "./background/adopt.js";
import { renameRecordingForSession } from "./asciicast.js";
import { isAgentSwarmsEnabled } from "./agentSwarmsEnabled.js";
import { setCostStateForRestore } from "../cost-tracker.js";
import { lastResumeRecordRegistry } from "./lastResumeRecord.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { permissionModeForProactivityLevel } from "./permissions/getNextPermissionMode.js";
import { permissionModeTitle } from "./permissions/PermissionMode.js";
import { reclaimSessionNameOnResume } from "./sessionNameUniqueness.js";
import { isHumanOrAutoContinuation } from "./messageProvenance.js";
import { resumeInterruptedTurn } from "./conversationRecovery.js";
import { removeInterruptedMessage } from "../cli/print.js";
import { createSessionHooksRegistry } from "../services/plugins/accountSync/syncedPluginHooks.js";
import { HostScoped } from "./hostScoped.js";

//@ chunk-08s5p3av.js:6314-6364 placement
var restoreSourceState = identity(
  {
    recorded: null,
  },
  (e) => {
    e.recorded = null;
  },
);
//@ chunk-08s5p3av.js:6364-6518 placement
/**
 * 记录恢复来源会话与 transcript 路径。
 */
function recordResumeSource({ sourceSessionId, transcriptPath }) {
  let o = normalizeUuidOrNull(sourceSessionId);
  restoreSourceState.recorded =
    o === null
      ? null
      : {
          liveSessionId: getSessionId(),
          source: {
            sessionId: o,
            transcriptPath: transcriptPath ?? getTranscriptPathForSession(o),
          },
        };
}
//@ chunk-08s5p3av.js:6518-6605 placement
/**
 * currentRestoreSource：当前来源会话的恢复来源。
 */
function currentRestoreSource() {
  let { recorded } = restoreSourceState;
  return recorded !== null && recorded.liveSessionId === getSessionId() ? recorded.source : null;
}
//@ chunk-08s5p3av.js:6605-6923 fingerprint = extractTodosFromTranscript (1)
/**
 * 从转录中最后一次 TodoWrite 工具调用恢复 todo 列表。
 */
function extractTodosFromTranscript(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    let msg = messages[i];
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
  if (typeof e.resume !== "string" || e.forkSession || e.hasSessionIdFlag) return false;
  let r = normalizeUuidOrNull(e.resume);
  if (!r) return false;
  switchSession(identityAgentId(r), "resume");
  return true;
}
//@ chunk-08s5p3av.js:7076-7492 placement = restoreSessionStateFromLog (0.519)
/**
 * 从日志恢复文件历史、署名快照、todos 等运行时状态。
 */
function restoreSessionStateFromLog(result, setAppState, o, n) {
  try {
    primePasteIdsFromMessages(result.messages ?? []);
  } catch (error) {
    logError(error);
  }
  getMaxStoredImageId().then(advancePasteId).catch(logError);
  if (result.fileHistorySnapshots && result.fileHistorySnapshots.length > 0)
    fileHistoryRestoreStateFromLog(result.fileHistorySnapshots, (newState) => {
      setAppState((prev) => ({
        ...prev,
        fileHistory: newState,
      }));
    });
  require("./chunk-qt283wyj.js").restoreGoalFromTranscript(result.messages, setAppState, o);
  if (!isTaskToolsEnabled() && result.messages && result.messages.length > 0) {
    let todos = extractTodosFromTranscript(result.messages);
    if (todos.length > 0) {
      let agentId = getSessionId();
      setAppState((prev) => ({
        ...prev,
        todos: {
          ...prev.todos,
          [agentId]: todos,
        },
      }));
    }
  }
}
//@ chunk-08s5p3av.js:7492-7514 placement
function noopRestore(result) {
  return;
}
//@ chunk-08s5p3av.js:7514-7597 placement
function computeStandaloneAgentContext(agentName, agentColor) {
  if (!agentName && !agentColor) return;
  return {
    name: agentName ?? "",
    color: agentColor === "default" ? undefined : agentColor,
  };
}
//@ chunk-08s5p3av.js:7597-8894 placement = restoreAgentFromSession (0.393)
/**
 * 按会话记录的 agent-setting 恢复主线程代理定义，找不到时警告。
 */
function restoreAgentFromSession(agentSetting, currentAgentDefinition, agentDefinitions, n) {
  if (currentAgentDefinition)
    return {
      agentDefinition: currentAgentDefinition,
      agentType: undefined,
    };
  if (!agentSetting) {
    setMainThreadAgentType(undefined);
    hookSourcesSummary(undefined);
    return {
      agentDefinition: undefined,
      agentType: undefined,
    };
  }
  let s = n?.sessionAgentDefinitions
    ? findAgentExcludingWebFetch(n.sessionAgentDefinitions.activeAgents, agentSetting)
    : undefined;
  let u = s ?? findAgentExcludingWebFetch(agentDefinitions.activeAgents, agentSetting);
  if (s)
    logForDebugging(
      `Resume: agent "${agentSetting}" restored from the session home set (${n?.sessionCwd ?? "unknown"})`,
    );
  if (!u) {
    logForDebugging(
      `Resumed session had agent "${agentSetting}" but it is no longer available. Using default behavior.`,
    );
    if (agentSetting !== CLAUDE_AGENT.agentType) {
      logFeatureSad("session_resume", "agent_resolve_miss");
      if (n?.onResolveMiss) {
        let originalCwd = getOriginalCwd();
        let p =
          n.sessionAgentDefinitions && n.sessionCwd && n.sessionCwd !== originalCwd
            ? `${n.sessionCwd} or ${originalCwd}`
            : originalCwd;
        n.onResolveMiss(
          replaceControlChars(
            `This session was running agent '${agentSetting}', which is no longer available (no agent by that name in ${p}). ` +
              "Continuing with the default tools and system prompt \u2014 the agent's tool restrictions no longer apply. " +
              "To restore it, re-create the agent, or resume with an explicit --agent <name>.",
          ),
        );
      }
    }
    setMainThreadAgentType(undefined);
    hookSourcesSummary(undefined);
    return {
      agentDefinition: undefined,
      agentType: undefined,
    };
  }
  setMainThreadAgentType(u.agentType);
  hookSourcesSummary(u);
  if (!getMainLoopModelOverride() && u.model && u.model !== "inherit") {
    let userSpecifiedModel = parseUserSpecifiedModel(u.model);
    if (isExemptDefaultResolvingPick(userSpecifiedModel) || isModelAllowed(userSpecifiedModel))
      setMainLoopModelOverride(userSpecifiedModel);
    else
      logForDebugging(
        `Agent model "${u.model}" is not in the availableModels allowlist; keeping the session model`,
        {
          level: "warn",
        },
      );
  }
  return {
    agentDefinition: u,
    agentType: u.agentType,
  };
}
//@ chunk-08s5p3av.js:8894-9344 placement
async function loadAgentDefinitionsForSessionCwd(projectPath, storageV5) {
  if (!projectPath || projectPath === getOriginalCwd()) return;
  let o = resolve(projectPath);
  if (
    isUncOrDevicePath(projectPath) ||
    isUncOrDevicePath(o) ||
    isDevicePrefixPath(projectPath) ||
    isDevicePrefixPath(o) ||
    isDevicePrefixPath(win32.normalize(projectPath)) ||
    isNetworkRelatedPath(projectPath) ||
    isNetworkRelatedPath(o) ||
    hasDotSegment(projectPath)
  ) {
    logForDebugging(`Resume: refusing cross-host session home shape "${projectPath}"`);
    return;
  }
  if (await hasUntouchableRecordSpellingStrictAsync(projectPath)) {
    logForDebugging(`Resume: refusing session home with unverifiable ancestry "${projectPath}"`);
    return;
  }
  if (!isPathPersistedTrusted(projectPath)) {
    logForDebugging(
      `Resume: not loading agents from session home "${projectPath}" \u2014 workspace trust not persisted for it`,
    );
    return;
  }
  try {
    return await getAgentDefinitionsWithOverrides(projectPath, storageV5);
  } catch {
    return;
  }
}
//@ chunk-08s5p3av.js:9344-9537 placement
function shouldAttemptAgentRestoreInPrint(e) {
  if (!e.resumedAgentSetting || e.mainThreadAgentType || isCoworkAny())
    return {
      attempt: false,
      loud: false,
    };
  if (e.hasStreamingInput)
    return {
      attempt: !e.explicitAgentFlag,
      loud: false,
    };
  return {
    attempt: true,
    loud: true,
  };
}
//@ chunk-08s5p3av.js:9537-10014 placement
/**
 * 恢复会话时可沿用的权限模式（plan/bypass 不沿用，auto 受合规限制）。
 */
async function resumedPermissionMode(permissionMode, r) {
  if (r || !permissionMode) return;
  let permissionMode_2 = parsePermissionMode(permissionMode);
  if (permissionMode_2 === undefined) return;
  if (permissionMode_2 === "plan" || permissionMode_2 === "bypassPermissions") return;
  if (permissionMode_2 === "default") {
    let { isAutoModeFromFallback, setProvisionalStartupMode } = await import("./chunk-dbas1xsr.js");
    setProvisionalStartupMode(undefined);
    if (isAutoModeFromFallback()) return "default";
    return;
  }
  if (permissionMode_2 === "auto") {
    let { isAutoStartWithheldForHipaaTaint } = await import("./chunk-dbas1xsr.js");
    if (isAutoStartWithheldForHipaaTaint() || hasComplianceTaint("hipaa")) return;
    let { isAutoModeGateEnabled } = await import("./chunk-x38v0jj9.js");
    if (!isAutoModeGateEnabled()) return;
  }
  return permissionMode_2;
}
//@ chunk-08s5p3av.js:10014-10434 placement
async function preparePlanModeRestoreOnInteractiveResume({
  storedPermissionMode,
  messages,
  forkSession,
  permissionModeSuppliedOnInvocation,
  lane,
}) {
  let u;
  try {
    ({ planModeOnInteractiveResume: u } = await import("./chunk-9bgq43cq.js"));
  } catch (error) {
    logError(error);
  }
  return (d) => {
    if (u === undefined) return;
    try {
      let p = d.startupModeDecidedByProactivityLevel !== undefined && isProactivityActive();
      return u(d, {
        storedPermissionMode,
        messages,
        forkSession,
        startupModePinned: permissionModeSuppliedOnInvocation || p,
        lane,
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
    getMainLoopModelOverride() !== undefined ||
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
  messages,
  mainLoopModel,
  o,
  { scheduleTelemetry: n = (d) => d(), storageV5: s, credentials: u } = {},
) {
  if (startupModelWinsOverSessionRestore()) return;
  let d = describeSessionModelRestore(messages, mainLoopModel);
  let p =
    d.kind === "declined" && d.reason === "not_allowed"
      ? await reprobeEntitlementDeny(d.model, s, u)
      : undefined;
  if (p !== undefined && startupModelWinsOverSessionRestore()) return;
  let m = p === "overturned" ? describeSessionModelRestore(messages, mainLoopModel) : d;
  if (m.kind === "none") return;
  if (m.kind === "mode_dependent_setting") {
    n(() =>
      logEvent("tengu_resume_model_restore", {
        outcome: fromEnum("skipped_mode_dependent_setting"),
      }),
    );
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
    let S = (mainLoopModel && stripAnyVersatileSuffix(mainLoopModel)) || "the default model";
    o?.(
      `Session model ${m.model} could not be restored (${MODEL_UNAVAILABLE_REASONS[m.reason]}) \u2014 using ${S} instead.`,
    );
    return;
  }
  return m.model;
}
//@ chunk-08s5p3av.js:11528-11595 placement
function lastTranscriptModel(keptMessages, initialModel) {
  let o = describeSessionModelRestore(keptMessages, initialModel);
  return o.kind === "ok" ? o.model : undefined;
}
//@ chunk-08s5p3av.js:11595-11751 placement = aliasMatchesParentTier (0.83)
/**
 * opusplan 覆盖 opus/sonnet，haiku 覆盖 haiku/sonnet（判断别名是否与父模型同档）。
 */
function aliasCoversModelFamily(alias, parentModel) {
  if (alias === "opusplan") return parentModel.includes("opus") || parentModel.includes("sonnet");
  if (alias === "haiku") return parentModel.includes("haiku") || parentModel.includes("sonnet");
  return false;
}
//@ chunk-08s5p3av.js:11751-12755 placement
function describeSessionModelRestore(e, r) {
  let o = new Set(FIRST_PARTY_MODEL_IDS.map((u) => getCanonicalName(u)));
  let n = r ? parseUserSpecifiedModel(r) : undefined;
  let s = n ? stripAnyVersatileSuffix(n) : undefined;
  for (let idx = e.length - 1; idx >= 0; idx--) {
    let d = e[idx];
    if (
      d?.type !== "assistant" ||
      d.isMeta ||
      typeof d.message?.model !== "string" ||
      d.message.model === SYNTHETIC_MODEL
    )
      continue;
    let p = typeof d.inPlaceOfModel === "string" ? d.inPlaceOfModel : d.message.model;
    let servedModel = findServedModel(p);
    let canonicalName = getCanonicalName(p);
    let w =
      o.has(canonicalName) ||
      (servedModel !== undefined && activeCatalogRowKnown(servedModel)) ||
      anyModelDescribed(canonicalName) ||
      stripAnyVersatileSuffix(p) === s;
    let modelId = getLastModelIdentity(e)?.modelId;
    let h = w || modelId === undefined ? p : stripAnyVersatileSuffix(modelId);
    let servedModel_2 = findServedModel(h);
    let R =
      w || (modelId !== undefined && !(servedModel_2 !== undefined && formatCatalogMessage(servedModel_2)));
    let userSpecifiedModelSetting = getUserSpecifiedModelSetting();
    let alias =
      typeof userSpecifiedModelSetting === "string"
        ? strip1mSuffix(userSpecifiedModelSetting)
        : userSpecifiedModelSetting;
    if (isModeDependentModelSetting(alias) && aliasCoversModelFamily(alias, getCanonicalName(h)))
      return {
        kind: "mode_dependent_setting",
      };
    let _ = !R
      ? "unknown_family"
      : !isExemptDefaultResolvingPick(h) && !isModelAllowed(h)
        ? "not_allowed"
        : isModelRemappedOrRetired(h)
          ? "retired"
          : undefined;
    if (_)
      return {
        kind: "declined",
        model: h,
        reason: _,
      };
    let A = (r && has1mSuffix_2(r)) || (n !== undefined && has1mSuffix_2(n));
    let U =
      A &&
      (stripAnyVersatileSuffix(h) === s ||
        (r && getCanonicalName(parseUserSpecifiedModel(stripAnyVersatileSuffix(r))) === getCanonicalName(h)));
    let C =
      modelId !== undefined &&
      has1mSuffix_2(modelId) &&
      getCanonicalName(stripAnyVersatileSuffix(modelId)) === getCanonicalName(h);
    let E =
      (A && n !== undefined && sameModelSpelling(n, h)) ||
      (modelId !== undefined && has1mSuffix_2(modelId) && sameModelSpelling(modelId, h));
    if (
      ((U || C) && supports1mBeta(h)) ||
      (E &&
        !isKnownNon1mTarget(h) &&
        supports1mBeta(
          h,
          getCanonicalName(h, {
            identity: true,
            overridesMap: {},
          }),
        ))
    )
      return {
        kind: "ok",
        model: strip1mTagWhereBuiltIn(h + "[1m]"),
      };
    return {
      kind: "ok",
      model: h,
    };
  }
  return {
    kind: "none",
  };
}
//@ chunk-08s5p3av.js:12755-12888 placement
function lastRefusalFallback(e) {
  for (let idx = e.length - 1; idx >= 0; idx--) {
    let o = e[idx];
    if (o?.type === "system" && o.subtype === "model_refusal_fallback") return o;
  }
  return;
}
//@ chunk-08s5p3av.js:12888-12994 placement
function isRefusalFallbackModel(e, r) {
  let o = lastRefusalFallback(e);
  if (!o) return false;
  let n = stripAnyVersatileSuffix(o.fallbackModel);
  let s = stripAnyVersatileSuffix(r);
  return n === s || getCanonicalName(n) === getCanonicalName(s);
}
//@ chunk-08s5p3av.js:12994-13184 placement
function neutralizeForkFallbackBanners(messages) {
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let o = messages[idx];
    if (o?.type === "system" && o.subtype === "model_refusal_fallback") o.neutralizedByFork = true;
    if (o?.type === "user") delete o.turnAttributionKey;
  }
}
//@ chunk-08s5p3av.js:13184-13283 placement
function carriedFallbackModelForResume(e) {
  let r = lastRefusalFallback(e);
  return r?.neutralizedByFork === true
    ? {
        fallbackModel: r.fallbackModel,
      }
    : undefined;
}
//@ chunk-08s5p3av.js:13283-13344 placement
function logResumeModelRestore(e) {
  logEvent("tengu_resume_model_restore", {
    outcome: fromEnum(e),
  });
}
//@ chunk-08s5p3av.js:13344-13433 placement
function prefetchBootstrapForResume(e, r) {
  trackClientDataFetch(import("./chunk-1qx2v2vg.js").then((o) => o.fetchBootstrapData(e, r)));
}
//@ chunk-08s5p3av.js:13433-13998 placement
function installRestoredModel(messages, r, o, storageV5, credentials) {
  if (!isRefusalFallbackModel(messages, r)) {
    setMainLoopModelOverride(r);
    prefetchBootstrapForResume(storageV5, credentials);
    logResumeModelRestore("restored");
    return r;
  }
  if (o) {
    logEvent("tengu_refusal_fallback_resume_latch", {
      action: fromEnum("fork_skip_restore"),
    });
    logResumeModelRestore("skipped_fork_fallback");
    return;
  }
  let u = carriedFallbackModelForResume(messages);
  if (u && stripAnyVersatileSuffix(u.fallbackModel) === stripAnyVersatileSuffix(r)) {
    logEvent("tengu_refusal_fallback_resume_latch", {
      action: fromEnum("fork_neutralized_skip"),
    });
    logResumeModelRestore("skipped_fork_neutralized");
    return;
  }
  setMainLoopModelOverride(r);
  prefetchBootstrapForResume(storageV5, credentials);
  latchRefusalFallbackModel({
    fallbackModel: r,
    previousOverride: undefined,
    previousAppStateModel: getInitialMainLoopModel() ?? null,
    previousModelForSession: null,
  });
  logResumeModelRestore("restored");
  logEvent("tengu_refusal_fallback_resume_latch", {
    action: fromEnum("model_latch_only"),
  });
  return r;
}
//@ chunk-08s5p3av.js:13998-14369 placement
function rearmRefusalFallbackHeaderFromTranscript(messages, r) {
  if (r) return;
  let flattened = messages.flatMap((n) =>
    n?.type === "system" &&
    n.subtype === "model_refusal_fallback" &&
    (n.apiRefusalCategory === "cyber" || n.sawCyberRefusal === true) &&
    n.neutralizedByFork !== true
      ? [n]
      : [],
  );
  if (flattened.length > 0) {
    markRefusalFallbackHeaderArmed(
      flattened.find((n) => n.apiRefusalCategory === "cyber" && n.requestId != null)?.requestId ?? undefined,
    );
    logEvent("tengu_refusal_fallback_resume_latch", {
      action: fromEnum("header_rearmed"),
    });
  }
}
//@ chunk-08s5p3av.js:14369-14431 placement
async function reloadAgentsForModeSwitch(e, currentCwd, cliAgents, agentDefinitions, storageV5) {
  if (!e) return agentDefinitions;
  return reloadAgentDefinitionsForModeSwitch(currentCwd, cliAgents, storageV5);
}
//@ chunk-08s5p3av.js:14431-14543 placement
async function reloadAgentDefinitionsForModeSwitch(e, r, storageV5) {
  getHostState().agentDefinitions.clear();
  let freshAgentDefs = await getAgentDefinitionsWithOverrides(e, storageV5);
  return rebuildAgentDefinitions(freshAgentDefs, [...freshAgentDefs.allAgents, ...r]);
}
//@ chunk-08s5p3av.js:14543-14591 placement
function realpathOrSelf(e) {
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
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? "gone" : "inaccessible";
  }
}
//@ chunk-08s5p3av.js:14732-14815 placement
var WORKTREE_UNBOUND_SAVE_OFF_MESSAGE =
  "The worktree binding could not be cleared because transcript saving is off";
//@ chunk-08s5p3av.js:14815-15660 placement
function worktreeResumeRefusalError(e, r) {
  if (e.reason === "pin-is-own-launch-tree")
    return `Error: ${stripControlCharsForMessage(e.message)} The worktree binding is kept.
`;
  if (!e.poisoned)
    return `Error: could not verify worktree ${stripControlCharsForMessage(e.worktreePath)} for this resume, so the resume was aborted rather than continuing without isolation. This is usually transient \u2014 the worktree binding is kept; re-run the command to retry.
`;
  let o =
    r?.bindingCleared === undefined
      ? ""
      : r.bindingCleared
        ? " The worktree binding has been cleared; re-running will continue in the current directory without worktree isolation."
        : ` ${WORKTREE_UNBOUND_SAVE_OFF_MESSAGE} for this run, so the same command will be refused again until that is resolved; to continue without the worktree, re-run with --fork-session or start a new conversation.`;
  return `Error: cannot resume into worktree ${stripControlCharsForMessage(e.worktreePath)}: ${stripControlCharsForMessage(e.message)} This session was not started.${o}
`;
}
//@ chunk-08s5p3av.js:15660-15952 placement
function worktreeGoneHeadlessNotice(e, r) {
  let o = r.bindingCleared
    ? "The worktree binding has been cleared."
    : `${WORKTREE_UNBOUND_SAVE_OFF_MESSAGE} for this run; a later resume will re-check it.`;
  return `Notice: the worktree ${stripControlCharsForMessage(e.worktreePath)} for this session no longer exists; continuing in the current directory without worktree isolation. ${o}
`;
}
//@ chunk-08s5p3av.js:15952-16984 placement
function worktreeResumeNotice(e) {
  let r = `${WORKTREE_UNBOUND_SAVE_OFF_MESSAGE}; a later --resume will re-check it.`;
  if (e.reason === "worktree-gone")
    return `Your worktree ${stripControlCharsForMessage(e.worktreePath)} no longer exists, so this session is working in the current directory without worktree isolation. ${isTranscriptPersistenceDisabled() ? r : "The worktree binding has been cleared."}`;
  if (e.reason === "pin-is-own-launch-tree")
    return `Could not re-enter your worktree ${stripControlCharsForMessage(e.worktreePath)}: ${stripControlCharsForMessage(e.message)} The worktree binding is kept.`;
  if (e.poisoned) {
    let o = isTranscriptPersistenceDisabled()
      ? `You are working in the current directory without worktree isolation. ${r}`
      : "This session's worktree binding has been cleared; you are working in the current directory without worktree isolation.";
    return `Did not re-enter your worktree ${stripControlCharsForMessage(e.worktreePath)}: ${stripControlCharsForMessage(e.message)} ${o}`;
  }
  return `Could not verify your worktree ${stripControlCharsForMessage(e.worktreePath)} this time, so this session is working in the current directory without worktree isolation. The worktree binding is kept and a later --resume will retry it. If this keeps happening, the worktree's git metadata may need repair.`;
}
//@ chunk-08s5p3av.js:16984-17021 placement
var MEMORY_STILL_PAUSED_MESSAGE = "Memory is still paused from";
//@ chunk-08s5p3av.js:17021-17043 placement
function restoredMemoryPauseNotice() {
  return;
}
//@ chunk-08s5p3av.js:17043-17094 placement
var AUTO_MEMORY_OFF_MESSAGE = "Auto-memory is still off for this session";
//@ chunk-08s5p3av.js:17094-17116 placement
function restoredAutoMemorySessionNotice() {
  return;
}
//@ chunk-08s5p3av.js:17116-17428 placement
function pushRestoredMemoryPauseNotice(messages) {
  for (let [r, o] of [
    [restoredMemoryPauseNotice(), MEMORY_STILL_PAUSED_MESSAGE],
    [restoredAutoMemorySessionNotice(), AUTO_MEMORY_OFF_MESSAGE],
  ]) {
    if (r === undefined) continue;
    let lastIndex = messages.findLastIndex(
      (s) =>
        s.type === "system" &&
        s.subtype === "informational" &&
        typeof s.content === "string" &&
        s.content.includes(o),
    );
    if (
      lastIndex !== -1 &&
      !messages.slice(lastIndex + 1).some((s) => s.type === "user" || s.type === "assistant")
    )
      continue;
    messages.push(createSystemMessage(r, "notice"));
  }
}
//@ chunk-08s5p3av.js:17428-17603 placement
function isNetworkTranscriptPath(e) {
  if (isNonWslUncPath(e) || isDevicePrefixPath(e) || isDevicePrefixPath(win32.normalize(e))) {
    logForDebugging("[sessionRestore] transcript path is a network/NT-namespace path \u2014 not chdir-ing", {
      level: "warn",
    });
    return true;
  }
  return false;
}
//@ chunk-08s5p3av.js:17603-17662 placement
function restoreWorktreeForResume(e, worktreeSession, o, n) {
  let worktreeForResume = resolveWorktreeForResume(worktreeSession, o, n);
  e.record(worktreeForResume);
  return worktreeForResume;
}
//@ chunk-08s5p3av.js:17662-21117 placement
/**
 * 续接会话时恢复 worktree 绑定：校验记录路径（网络路径、不可验证祖先、无效 linked worktree 等拒绝），worktree 已不存在则清除绑定并回到当前目录，返回 poisoned/cleared 状态供提示。
 */
function resolveWorktreeForResume(e, r, o) {
  let currentWorktreeSession = getCurrentWorktreeSession();
  if (currentWorktreeSession && o?.preserveBinding !== true) {
    saveWorktreeState(currentWorktreeSession);
    return null;
  }
  if (!e) {
    if (e === null) {
      logEvent("tengu_worktree_resume_root_rejected", {
        reason: lit("worktree-exited-resume"),
        poisoned: lit("false"),
      });
      logForDebugging(
        "[worktree] resuming a session whose worktree record was cleared (exited or scrubbed): running without isolation",
      );
      return null;
    }
    if (!r || getCwd() === r) return null;
    if (isNetworkTranscriptPath(r)) return null;
    if (hasUntouchableRecordSpelling(r)) {
      logForDebugging("[worktree] resume: the recorded project path has a network spelling; staying put");
      return null;
    }
    try {
      processChdir(r);
    } catch {
      return null;
    }
    setCwd(r);
    if (isCoveredByWorktrees(r, restoreRootsFor(STARTUP_CWD_REALPATH))) setOriginalCwd(getCwd());
    clearMemoryFilesCacheForHost();
    resetEnvironmentCaches("resume");
    getPlansDirectory.cache.clear?.();
    primePlanSlugCollisions(o?.storageV5);
    reanchorGitFileWatcher();
    clearIsGitMemo();
    getReplBridgeHandle()?.refreshGitBranch?.();
    return null;
  }
  let s = o?.preserveBinding === true;
  if (
    isNetworkTranscriptPath(e.worktreePath) ||
    hasDotDotSegment(e.worktreePath) ||
    isNetworkMountRoot(e.worktreePath) ||
    isNetDir(e.worktreePath) ||
    findIntermediateUncJunction(NodeFsOperations, e.worktreePath, {
      surfaceNetworkRaw: true,
      unreadableAncestry: "unverified",
    }) !== undefined
  ) {
    if (!s) saveWorktreeState(null);
    logEvent("tengu_worktree_resume_root_rejected", {
      reason: lit("network-spelled-pin"),
      poisoned: lit("true"),
    });
    return {
      worktreePath: e.worktreePath,
      reason: "invalid-linked-worktree",
      message: "its recorded path has a network spelling, which can never be a local isolation worktree.",
      poisoned: true,
    };
  }
  let u = directoryState(e.worktreePath);
  if (u === "gone") {
    if (!s) saveWorktreeState(null);
    logEvent("tengu_worktree_resume_root_rejected", {
      reason: lit("worktree-gone"),
      poisoned: lit("true"),
    });
    return {
      worktreePath: e.worktreePath,
      reason: "worktree-gone",
      message: "the worktree directory no longer exists",
      poisoned: true,
    };
  }
  if (u === "inaccessible") {
    logForDebugging(`[worktree] could not examine ${e.worktreePath} on resume; keeping the binding`, {
      level: "error",
    });
    logEvent("tengu_worktree_resume_root_rejected", {
      reason: lit("unverifiable"),
      poisoned: lit("false"),
    });
    return {
      worktreePath: e.worktreePath,
      reason: "unverifiable",
      message: "the worktree directory could not be examined right now",
      poisoned: false,
    };
  }
  let liveLaunchDir = o?.liveLaunchDir ?? STARTUP_CWD_REALPATH;
  let p = isSameRestoreLocation(getCwd(), e.worktreePath);
  let m = checkWorktreeIsolationSync(
    e.worktreePath,
    gitRootsForPath(e.originalCwd),
    uniq([
      realpathOrSelf(liveLaunchDir),
      ...gitRootsForPath(liveLaunchDir),
      realpathOrSelf(STARTUP_CWD_REALPATH),
      ...gitRootsForPath(STARTUP_CWD_REALPATH),
    ]),
    {
      declineSelfOwningPinUnderLiveRoot: true,
    },
  );
  if (!m.ok) {
    let S = m.reason !== "unverifiable" && m.reason !== "pin-is-own-launch-tree";
    logForDebugging(`[worktree] declining to resume into ${e.worktreePath} (${m.reason}): ${m.message}`, {
      level: "error",
    });
    logEvent("tengu_worktree_resume_root_rejected", {
      reason: fromEnum(m.reason),
      poisoned: lit(S ? "true" : "false"),
    });
    if (S) {
      if (!s) saveWorktreeState(null);
      if (p) {
        let w = dirname(e.worktreePath);
        let g = directoryState(w) === "present" ? w : e.originalCwd;
        if (isSameRestoreLocation(g, e.worktreePath))
          return {
            worktreePath: e.worktreePath,
            reason: m.reason,
            message: m.message,
            poisoned: S,
          };
        try {
          processChdir(g);
          setCwd(g);
          let h = (T) => compareSameContainment(T, e.worktreePath) === "same";
          let M = worktreeLocationOf(e.worktreePath);
          let R = M !== null ? [M.checkout] : [];
          let filtered = [...gitRootsForPath(liveLaunchDir), ...R].filter((T) => !h(T));
          if (
            isCoveredByWorktrees(g, filtered, {
              requireCovered: true,
            })
          )
            setOriginalCwd(g);
          clearMemoryFilesCacheForHost();
          resetEnvironmentCaches("resume");
          clearIsGitMemo();
          getPlansDirectory.cache.clear?.();
          primePlanSlugCollisions(o?.storageV5);
          reanchorGitFileWatcher();
          getReplBridgeHandle()?.refreshGitBranch?.();
        } catch {}
      }
    }
    return {
      worktreePath: e.worktreePath,
      reason: m.reason,
      message: m.message,
      poisoned: S,
    };
  }
  try {
    processChdir(e.worktreePath);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") {
      if (!s) saveWorktreeState(null);
      logEvent("tengu_worktree_resume_root_rejected", {
        reason: lit("worktree-gone"),
        poisoned: lit("true"),
      });
      return {
        worktreePath: e.worktreePath,
        reason: "worktree-gone",
        message: "the worktree directory no longer exists",
        poisoned: true,
      };
    }
    logEvent("tengu_worktree_resume_root_rejected", {
      reason: lit("unverifiable"),
      poisoned: lit("false"),
    });
    return {
      worktreePath: e.worktreePath,
      reason: "unverifiable",
      message: "the worktree directory could not be entered right now",
      poisoned: false,
    };
  }
  setCwd(e.worktreePath);
  setOriginalCwd(getCwd());
  restoreWorktreeSession({
    ...e,
    liveLaunchAnchor: liveLaunchDir,
    originalChangeset: undefined,
  });
  clearMemoryFilesCacheForHost();
  resetEnvironmentCaches("resume");
  getPlansDirectory.cache.clear?.();
  primePlanSlugCollisions(o?.storageV5);
  reanchorGitFileWatcher();
  getReplBridgeHandle()?.refreshGitBranch?.();
  return null;
}
//@ chunk-08s5p3av.js:21117-21728 placement = exitRestoredWorktree (0.202)
/**
 * 恢复的会话记录了 worktree 但不再适用时，切回原始 cwd。
 */
function exitRestoredWorktree(e, storageV5) {
  let current = getCurrentWorktreeSession();
  if (!current) return;
  restoreWorktreeSession(null);
  clearMemoryFilesCacheForHost();
  resetEnvironmentCaches("resume");
  if (current.worktreePath === e) {
    getPlansDirectory.cache.clear?.();
    primePlanSlugCollisions(storageV5);
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
    liveLaunchAnchor === undefined ||
    isCoveredByWorktrees(current.originalCwd, restoreRootsFor(liveLaunchAnchor, current.worktreePath), {
      requireCovered: true,
      coveredWitnesses: worktreeRootsFor(liveLaunchAnchor, current.worktreePath),
      extraCoveredRoots: (() => {
        let s = worktreeLocationOf(current.worktreePath);
        return s !== null ? [s.checkout] : [];
      })(),
    })
  )
    setOriginalCwd(getCwd());
  getPlansDirectory.cache.clear?.();
  primePlanSlugCollisions(storageV5);
  reanchorGitFileWatcher();
  getReplBridgeHandle()?.refreshGitBranch?.();
}
//@ chunk-08s5p3av.js:21728-26335 placement = processResumedConversation (0.411)
/**
 * 恢复会话的后处理：采用或分叉 sessionId（--fork-session 时复制内容替换记录），恢复元数据、费用、worktree、代理定义与权限模式，返回启动 REPL 所需的消息与状态。
 */
async function processResumedConversation(result, opts, context) {
  markSessionRestored(context.session.host);
  let n = context.modeApi?.matchSessionMode(result.mode);
  if (n) result.messages.push(createSystemMessage(n, "warning"));
  let s = switchSessionModelPin(
    {
      ...result,
      source: opts.resumeSource ?? "file",
    },
    (y) => result.messages.push(createSystemMessage(y, "warning")),
  );
  let { adoptedSessionId, effectiveFork } = resolveResumeSessionAdoption(
    opts.sessionIdOverride ?? result.sessionId,
    opts.forkSession,
  );
  if (adoptedSessionId) {
    switchSession(adoptedSessionId, "resume", opts.transcriptPath ? dirname(opts.transcriptPath) : null);
    await renameRecordingForSession(context.session, context.storageV5);
    await resetSessionFilePointer();
  }
  let p =
    adoptedSessionId && isAgentSwarmsEnabled()
      ? await (await import("./chunk-6cc2zqkz.js")).rekeySessionTeamAtStartup(context.storageV5)
      : undefined;
  if (effectiveFork) {
    await adoptForkSessionMetadata(result, {
      stripWorktreeSession: true,
      stripRelocatedCwd: true,
      storageV5: context.storageV5,
    });
    if (result.contentReplacements?.length)
      await recordContentReplacement(result.contentReplacements, undefined, context.storageV5);
  } else
    restoreSessionMetadata(result, {
      storageV5: context.storageV5,
    });
  noopModelPinReset(s.declined === true);
  pushRestoredMemoryPauseNotice(result.messages);
  setCostStateForRestore(result);
  if (!effectiveFork) {
    let y = restoreWorktreeForResume(
      lastResumeRecordRegistry.of(context.session.host),
      result.worktreeSession,
      undefined,
      {
        storageV5: context.storageV5,
      },
    );
    if (y) result.messages.push(createSystemMessage(worktreeResumeNotice(y), "warning"));
    if (isStorageV5Enabled() && context.storageV5 !== undefined)
      await adoptResumedSessionFileAsync(context.storageV5);
    else adoptResumedSessionFile();
  }
  let sessionAgentDefinitions = await loadAgentDefinitionsForSessionCwd(
    result.projectPath,
    context.storageV5,
  );
  let { agentDefinition, agentType } = restoreAgentFromSession(
    result.agentSetting,
    context.mainThreadAgentDefinition,
    context.agentDefinitions,
    {
      sessionAgentDefinitions,
      sessionCwd: result.projectPath,
      onResolveMiss: (y) => result.messages.push(createSystemMessage(y, "warning")),
    },
  );
  let permissionMode = result.permissionMode;
  let h = false;
  if (
    !context.permissionModeCliSet &&
    parsePermissionMode(permissionMode) === "auto" &&
    context.initialState.proactivityLevel === "ask" &&
    !wasProactivityEverOn()
  ) {
    permissionMode = permissionModeForProactivityLevel(
      "ask",
      {
        isAutoModeAvailable: false,
        isBypassPermissionsModeAvailable: false,
      },
      undefined,
    );
    h = true;
    logForDebugging(
      `[sessionRestore] stored mode 'auto' read as '${permissionMode}': proactivity 'ask' with levels off in this process`,
    );
  }
  let M =
    context.initialState.toolPermissionContext.startupModeDecidedByProactivityLevel !== undefined &&
    isProactivityActive();
  let R = await resumedPermissionMode(permissionMode, context.permissionModeCliSet || M);
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
    {
      storageV5: context.storageV5,
      credentials: context.credentials,
    },
  );
  let _ = T
    ? installRestoredModel(result.messages, T, effectiveFork, context.storageV5, context.credentials)
    : undefined;
  rearmRefusalFallbackHeaderFromTranscript(result.messages, effectiveFork);
  appendSlackTagResumeRecords(result.messages, {
    fork: effectiveFork,
    startup: true,
  });
  let modeWarning;
  if (R) {
    let { transitionPermissionMode } = await import("./chunk-x38v0jj9.js");
    let toolPermissionContext = context.initialState.toolPermissionContext;
    try {
      modeWarning = {
        ...transitionPermissionMode(toolPermissionContext.mode, R, toolPermissionContext),
        mode: R,
      };
      if (!toolPermissionContext.proactivityBaseline?.fromRelaunchHandoff)
        modeWarning = {
          ...modeWarning,
          proactivityBaseline: {
            mode: R,
            fromRelaunchHandoff: false,
          },
        };
    } catch (error) {
      logForDebugging(`[sessionRestore] transitionPermissionMode rejected restored mode '${R}': ${error}`);
    }
  }
  modeWarning =
    (
      await preparePlanModeRestoreOnInteractiveResume({
        storedPermissionMode: permissionMode,
        messages: result.messages,
        forkSession: effectiveFork,
        permissionModeSuppliedOnInvocation: context.permissionModeSuppliedOnInvocation,
        lane: "interactive",
      })
    )(modeWarning ?? context.initialState.toolPermissionContext) ?? modeWarning;
  saveMode(context.modeApi?.isCoordinatorMode() ? "coordinator" : "normal");
  let C = opts.includeAttribution ? noopRestore(result) : undefined;
  let standaloneAgentContext = computeStandaloneAgentContext(result.agentName, result.agentColor);
  let O = context.initialState.standaloneAgentContext
    ? {
        ...standaloneAgentContext,
        ...context.initialState.standaloneAgentContext,
      }
    : standaloneAgentContext;
  reclaimSessionNameOnResume(O?.name, context.storageV5, {
    autoOnly: !result.customTitle && !context.initialState.standaloneAgentContext?.name,
  });
  let agentDefinitions = await reloadAgentsForModeSwitch(
    !!n,
    context.currentCwd,
    context.cliAgents,
    context.agentDefinitions,
    context.storageV5,
  );
  let initialMessage = context.initialState.initialMessage;
  if (
    env.CLAUDE_CODE_RESUME_INTERRUPTED_TURN &&
    result.turnInterruptionState?.kind === "interrupted_prompt" &&
    isHumanOrAutoContinuation(result.turnInterruptionState.message.origin)
  ) {
    logForDebugging("[sessionRestore] Auto-resuming interrupted turn for bg crash-respawn");
    resumeInterruptedTurn("repl_restore", result.turnInterruptionState.message, {
      tail: result.turnInterruptionState.tail,
    });
    removeInterruptedMessage(result.messages, result.turnInterruptionState.message);
    initialMessage = {
      message: result.turnInterruptionState.message,
    };
  }
  let initialState = context.initialState;
  recordResumeSource({
    sourceSessionId: opts.sessionIdOverride ?? result.sessionId,
    transcriptPath: opts.transcriptPath,
  });
  let sessionHooksRegistry = createSessionHooksRegistry();
  require("./chunk-qt283wyj.js").restoreGoalFromTranscript(
    result.messages,
    (y) => {
      initialState = y(initialState);
    },
    sessionHooksRegistry,
  );
  return {
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
    agentColor: result.agentColor === "default" ? undefined : result.agentColor,
    restoredAgentDef: agentDefinition,
    initialState: {
      ...initialState,
      ...(p && {
        teamContext: p.teamContext,
        teammateColors: p.teammateColors,
      }),
      initialMessage,
      ...(!effectiveFork &&
        result.bridgeSessionId &&
        !(initialState.replBridgeEnabled && !initialState.replBridgeOutboundOnly) && {
          replBridgeEnabled: true,
          replBridgeOutboundOnly: false,
        }),
      ...(result.endedByModel
        ? {
            endedByModel: true,
          }
        : {}),
      ...(agentType && {
        agent: agentType,
      }),
      ...(v && {
        attentionBudget: v,
      }),
      ...(_ && {
        mainLoopModel: _,
      }),
      ...(C && {
        attribution: C,
      }),
      ...(O && {
        standaloneAgentContext: O,
      }),
      ...(modeWarning && {
        toolPermissionContext: modeWarning,
      }),
      agentDefinitions,
    },
    sessionHooks: sessionHooksRegistry,
  };
}
//@ chunk-08s5p3av.js:26335-26354 placement
function appendSlackTagResumeRecords(messages, r) {}
//@ chunk-cqkdzt01.js:226-279 placement
class SessionRestoredFlag {
  restored = false;
  markRestored() {
    this.restored = true;
  }
}
//@ chunk-cqkdzt01.js:279-302 placement
var sessionRestoredSlot = new HostScoped(() => new SessionRestoredFlag());
//@ chunk-cqkdzt01.js:302-341 placement
/**
 * markSessionRestored：标记会话已恢复。
 */
function markSessionRestored(host) {
  sessionRestoredSlot.of(host).markRestored();
}
//@ chunk-cqkdzt01.js:341-380 placement
/**
 * isSessionRestored：会话是否已恢复。
 */
function isSessionRestored(host) {
  return sessionRestoredSlot.of(host).restored;
}
export {
  processResumedConversation,
  startupModelWinsOverSessionRestore,
  isSessionRestored,
  currentRestoreSource,
  markSessionRestored,
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

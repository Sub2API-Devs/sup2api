/**
 * utils/sessionRestore.ts
 *
 * resume 后处理：采用/分叉 sessionId、恢复元数据、worktree、代理、权限模式、todos、文件历史。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sessionRestore.ts
 * pieces: chunk-2snqx25v.js (46), chunk-xpe0pbqz.js (4)
 * attribution: placement 49, fingerprint 1
 */
import { resolve, win32, dirname } from "path";
import { realpathSync, statSync } from "fs";
import { HostScoped } from "./hostScoped.js";
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
import { SYNTHETIC_MODEL, createSystemMessage } from "./messages.js";
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
import { normalizeCaseForComparison_2 } from "./permissions/filesystem.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-xpe0pbqz.js:226-279 placement
class SessionRestoredFlag {
  restored = false;
  markRestored() {
    this.restored = true;
  }
}
//@ chunk-xpe0pbqz.js:279-302 placement
var sessionRestoredSlot; // deferred: uses SessionRestoredFlag of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-xpe0pbqz.js:279", () => {
  sessionRestoredSlot = new HostScoped(() => new SessionRestoredFlag());
});
//@ chunk-xpe0pbqz.js:302-341 placement
/**
 * markSessionRestored：标记会话已恢复。
 */
function markSessionRestored(host) {
  sessionRestoredSlot.of(host).markRestored();
}
//@ chunk-xpe0pbqz.js:341-380 placement
/**
 * isSessionRestored：会话是否已恢复。
 */
function isSessionRestored(host) {
  return sessionRestoredSlot.of(host).restored;
}
//@ chunk-2snqx25v.js:6381-6431 placement
var restoreSourceState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-2snqx25v.js:6381", () => {
  restoreSourceState = identity(
    {
      recorded: null,
    },
    (state) => {
      state.recorded = null;
    },
  );
});
//@ chunk-2snqx25v.js:6431-6585 placement
/**
 * 记录恢复来源会话与 transcript 路径。
 */
function recordResumeSource({ sourceSessionId, transcriptPath }) {
  let normalizedSourceId = normalizeUuidOrNull(sourceSessionId);
  restoreSourceState.recorded =
    normalizedSourceId === null
      ? null
      : {
          liveSessionId: getSessionId(),
          source: {
            sessionId: normalizedSourceId,
            transcriptPath: transcriptPath ?? getTranscriptPathForSession(normalizedSourceId),
          },
        };
}
//@ chunk-2snqx25v.js:6585-6672 placement
/**
 * currentRestoreSource：当前来源会话的恢复来源。
 */
function currentRestoreSource() {
  let { recorded } = restoreSourceState;
  return recorded !== null && recorded.liveSessionId === getSessionId() ? recorded.source : null;
}
//@ chunk-2snqx25v.js:6672-6990 fingerprint (2.1.88 match: extractTodosFromTranscript, 1)
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
//@ chunk-2snqx25v.js:6990-7143 placement
function maybeSwitchSessionForResume(options) {
  if (typeof options.resume !== "string" || options.forkSession || options.hasSessionIdFlag) return false;
  let resumeId = normalizeUuidOrNull(options.resume);
  if (!resumeId) return false;
  switchSession(identityAgentId(resumeId), "resume");
  return true;
}
//@ chunk-2snqx25v.js:7143-7559 placement (2.1.88 match: restoreSessionStateFromLog, 0.519)
/**
 * 从日志恢复文件历史、署名快照、todos 等运行时状态。
 */
function restoreSessionStateFromLog(result, setAppState, storageV5, context) {
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
  require("../commands/goal/restoreGoal.js").restoreGoalFromTranscript(
    result.messages,
    setAppState,
    storageV5,
  );
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
//@ chunk-2snqx25v.js:7559-7581 placement
function noopRestore(result) {
  return;
}
//@ chunk-2snqx25v.js:7581-7664 placement
function computeStandaloneAgentContext(agentName, agentColor) {
  if (!agentName && !agentColor) return;
  return {
    name: agentName ?? "",
    color: agentColor === "default" ? undefined : agentColor,
  };
}
//@ chunk-2snqx25v.js:7664-8961 placement (2.1.88 match: restoreAgentFromSession, 0.393)
/**
 * 按会话记录的 agent-setting 恢复主线程代理定义，找不到时警告。
 */
function restoreAgentFromSession(agentSetting, currentAgentDefinition, agentDefinitions, sessionInfo) {
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
  let fromSession = sessionInfo?.sessionAgentDefinitions
    ? findAgentExcludingWebFetch(sessionInfo.sessionAgentDefinitions.activeAgents, agentSetting)
    : undefined;
  let definition = fromSession ?? findAgentExcludingWebFetch(agentDefinitions.activeAgents, agentSetting);
  if (fromSession)
    logForDebugging(
      `Resume: agent "${agentSetting}" restored from the session home set (${sessionInfo?.sessionCwd ?? "unknown"})`,
    );
  if (!definition) {
    logForDebugging(
      `Resumed session had agent "${agentSetting}" but it is no longer available. Using default behavior.`,
    );
    if (agentSetting !== CLAUDE_AGENT.agentType) {
      logFeatureSad("session_resume", "agent_resolve_miss");
      if (sessionInfo?.onResolveMiss) {
        let originalCwd = getOriginalCwd();
        let searchedCwds =
          sessionInfo.sessionAgentDefinitions &&
          sessionInfo.sessionCwd &&
          sessionInfo.sessionCwd !== originalCwd
            ? `${sessionInfo.sessionCwd} or ${originalCwd}`
            : originalCwd;
        sessionInfo.onResolveMiss(
          replaceControlChars(
            `This session was running agent '${agentSetting}', which is no longer available (no agent by that name in ${searchedCwds}). ` +
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
  setMainThreadAgentType(definition.agentType);
  hookSourcesSummary(definition);
  if (!getMainLoopModelOverride() && definition.model && definition.model !== "inherit") {
    let userSpecifiedModel = parseUserSpecifiedModel(definition.model);
    if (isExemptDefaultResolvingPick(userSpecifiedModel) || isModelAllowed(userSpecifiedModel))
      setMainLoopModelOverride(userSpecifiedModel);
    else
      logForDebugging(
        `Agent model "${definition.model}" is not in the availableModels allowlist; keeping the session model`,
        {
          level: "warn",
        },
      );
  }
  return {
    agentDefinition: definition,
    agentType: definition.agentType,
  };
}
//@ chunk-2snqx25v.js:8961-9411 placement
async function loadAgentDefinitionsForSessionCwd(path, storageV5) {
  if (!path || path === getOriginalCwd()) return;
  let resolvedPath = resolve(path);
  if (
    isUncOrDevicePath(path) ||
    isUncOrDevicePath(resolvedPath) ||
    isDevicePrefixPath(path) ||
    isDevicePrefixPath(resolvedPath) ||
    isDevicePrefixPath(win32.normalize(path)) ||
    isNetworkRelatedPath(path) ||
    isNetworkRelatedPath(resolvedPath) ||
    hasDotSegment(path)
  ) {
    logForDebugging(`Resume: refusing cross-host session home shape "${path}"`);
    return;
  }
  if (await hasUntouchableRecordSpellingStrictAsync(path)) {
    logForDebugging(`Resume: refusing session home with unverifiable ancestry "${path}"`);
    return;
  }
  if (!isPathPersistedTrusted(path)) {
    logForDebugging(
      `Resume: not loading agents from session home "${path}" \u2014 workspace trust not persisted for it`,
    );
    return;
  }
  try {
    return await getAgentDefinitionsWithOverrides(path, storageV5);
  } catch {
    return;
  }
}
//@ chunk-2snqx25v.js:9411-9604 placement
function shouldAttemptAgentRestoreInPrint(state) {
  if (!state.resumedAgentSetting || state.mainThreadAgentType || isCoworkAny())
    return {
      attempt: false,
      loud: false,
    };
  if (state.hasStreamingInput)
    return {
      attempt: !state.explicitAgentFlag,
      loud: false,
    };
  return {
    attempt: true,
    loud: true,
  };
}
//@ chunk-2snqx25v.js:9604-10081 placement
/**
 * 恢复会话时可沿用的权限模式（plan/bypass 不沿用，auto 受合规限制）。
 */
async function resumedPermissionMode(permissionMode, hasExplicitMode) {
  if (hasExplicitMode || !permissionMode) return;
  let permissionMode_2 = parsePermissionMode(permissionMode);
  if (permissionMode_2 === undefined) return;
  if (permissionMode_2 === "plan" || permissionMode_2 === "bypassPermissions") return;
  if (permissionMode_2 === "default") {
    let { isAutoModeFromFallback, setProvisionalStartupMode } =
      await import("./permissions/autoModeState.js");
    setProvisionalStartupMode(undefined);
    if (isAutoModeFromFallback()) return "default";
    return;
  }
  if (permissionMode_2 === "auto") {
    let { isAutoStartWithheldForHipaaTaint } = await import("./permissions/autoModeState.js");
    if (isAutoStartWithheldForHipaaTaint() || hasComplianceTaint("hipaa")) return;
    let { isAutoModeGateEnabled } = await import("./permissions/permissionSetup.js");
    if (!isAutoModeGateEnabled()) return;
  }
  return permissionMode_2;
}
//@ chunk-2snqx25v.js:10081-10501 placement
async function preparePlanModeRestoreOnInteractiveResume({
  storedPermissionMode,
  messages,
  forkSession,
  permissionModeSuppliedOnInvocation,
  lane,
}) {
  let planModeRestore;
  try {
    ({ planModeOnInteractiveResume: planModeRestore } = await import("./planModeResume.js"));
  } catch (error) {
    logError(error);
  }
  return (context) => {
    if (planModeRestore === undefined) return;
    try {
      let proactivityActive =
        context.startupModeDecidedByProactivityLevel !== undefined && isProactivityActive();
      return planModeRestore(context, {
        storedPermissionMode,
        messages,
        forkSession,
        startupModePinned: permissionModeSuppliedOnInvocation || proactivityActive,
        lane,
      });
    } catch (error) {
      logError(error);
      return;
    }
  };
}
//@ chunk-2snqx25v.js:10501-10655 placement
var MODEL_UNAVAILABLE_REASONS = {
  unknown_family: "not a model this version of Claude Code recognizes",
  not_allowed: "not allowed by this account's model settings",
  retired: "retired",
};
//@ chunk-2snqx25v.js:10655-10865 placement
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
//@ chunk-2snqx25v.js:10865-11603 placement
async function restoreModelFromSession(
  messages,
  mainLoopModel,
  warn,
  { scheduleTelemetry = (send) => send(), storageV5, credentials } = {},
) {
  if (startupModelWinsOverSessionRestore()) return;
  let initial = describeSessionModelRestore(messages, mainLoopModel);
  let reprobe =
    initial.kind === "declined" && initial.reason === "not_allowed"
      ? await reprobeEntitlementDeny(initial.model, storageV5, credentials)
      : undefined;
  if (reprobe !== undefined && startupModelWinsOverSessionRestore()) return;
  let decision = reprobe === "overturned" ? describeSessionModelRestore(messages, mainLoopModel) : initial;
  if (decision.kind === "none") return;
  if (decision.kind === "mode_dependent_setting") {
    scheduleTelemetry(() =>
      logEvent("tengu_resume_model_restore", {
        outcome: fromEnum("skipped_mode_dependent_setting"),
      }),
    );
    return;
  }
  if (decision.kind === "declined")
    scheduleTelemetry(() =>
      logEvent("tengu_resume_model_restore", {
        outcome: fromEnum("declined"),
        decline_reason: fromEnumOpt(decision.reason),
        entitlement_reprobe: fromEnumOpt(reprobe),
      }),
    );
  if (decision.kind === "declined") {
    let fallbackName = (mainLoopModel && stripAnyVersatileSuffix(mainLoopModel)) || "the default model";
    warn?.(
      `Session model ${decision.model} could not be restored (${MODEL_UNAVAILABLE_REASONS[decision.reason]}) \u2014 using ${fallbackName} instead.`,
      decision.model,
    );
    return;
  }
  return decision.model;
}
//@ chunk-2snqx25v.js:11603-11670 placement
function lastTranscriptModel(messages, mainLoopModel) {
  let decision = describeSessionModelRestore(messages, mainLoopModel);
  return decision.kind === "ok" ? decision.model : undefined;
}
//@ chunk-2snqx25v.js:11670-11826 placement (2.1.88 match: aliasMatchesParentTier, 0.83)
/**
 * opusplan 覆盖 opus/sonnet，haiku 覆盖 haiku/sonnet（判断别名是否与父模型同档）。
 */
function aliasCoversModelFamily(alias, parentModel) {
  if (alias === "opusplan") return parentModel.includes("opus") || parentModel.includes("sonnet");
  if (alias === "haiku") return parentModel.includes("haiku") || parentModel.includes("sonnet");
  return false;
}
//@ chunk-2snqx25v.js:11826-12830 placement
function describeSessionModelRestore(messages, mainLoopModel) {
  let firstPartyIds = new Set(FIRST_PARTY_MODEL_IDS.map((modelId) => getCanonicalName(modelId)));
  let parsedModel = mainLoopModel ? parseUserSpecifiedModel(mainLoopModel) : undefined;
  let currentBase = parsedModel ? stripAnyVersatileSuffix(parsedModel) : undefined;
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let message = messages[idx];
    if (
      message?.type !== "assistant" ||
      message.isMeta ||
      typeof message.message?.model !== "string" ||
      message.message.model === SYNTHETIC_MODEL
    )
      continue;
    let modelName =
      typeof message.inPlaceOfModel === "string" ? message.inPlaceOfModel : message.message.model;
    let servedModel = findServedModel(modelName);
    let canonicalName = getCanonicalName(modelName);
    let knownFamily =
      firstPartyIds.has(canonicalName) ||
      (servedModel !== undefined && activeCatalogRowKnown(servedModel)) ||
      anyModelDescribed(canonicalName) ||
      stripAnyVersatileSuffix(modelName) === currentBase;
    let modelId = getLastModelIdentity(messages)?.modelId;
    let chosen = knownFamily || modelId === undefined ? modelName : stripAnyVersatileSuffix(modelId);
    let servedModel_2 = findServedModel(chosen);
    let familyKnown =
      knownFamily ||
      (modelId !== undefined && !(servedModel_2 !== undefined && formatCatalogMessage(servedModel_2)));
    let userSpecifiedModelSetting = getUserSpecifiedModelSetting();
    let alias =
      typeof userSpecifiedModelSetting === "string"
        ? strip1mSuffix(userSpecifiedModelSetting)
        : userSpecifiedModelSetting;
    if (isModeDependentModelSetting(alias) && aliasCoversModelFamily(alias, getCanonicalName(chosen)))
      return {
        kind: "mode_dependent_setting",
      };
    let reason = !familyKnown
      ? "unknown_family"
      : !isExemptDefaultResolvingPick(chosen) && !isModelAllowed(chosen)
        ? "not_allowed"
        : isModelRemappedOrRetired(chosen)
          ? "retired"
          : undefined;
    if (reason)
      return {
        kind: "declined",
        model: chosen,
        reason,
      };
    let wants1m =
      (mainLoopModel && has1mSuffix_2(mainLoopModel)) ||
      (parsedModel !== undefined && has1mSuffix_2(parsedModel));
    let userWants1m =
      wants1m &&
      (stripAnyVersatileSuffix(chosen) === currentBase ||
        (mainLoopModel &&
          getCanonicalName(parseUserSpecifiedModel(stripAnyVersatileSuffix(mainLoopModel))) ===
            getCanonicalName(chosen)));
    let lastIdWants1m =
      modelId !== undefined &&
      has1mSuffix_2(modelId) &&
      getCanonicalName(stripAnyVersatileSuffix(modelId)) === getCanonicalName(chosen);
    let spelling1m =
      (wants1m && parsedModel !== undefined && sameModelSpelling(parsedModel, chosen)) ||
      (modelId !== undefined && has1mSuffix_2(modelId) && sameModelSpelling(modelId, chosen));
    if (
      ((userWants1m || lastIdWants1m) && supports1mBeta(chosen)) ||
      (spelling1m &&
        !isKnownNon1mTarget(chosen) &&
        supports1mBeta(
          chosen,
          getCanonicalName(chosen, {
            identity: true,
            overridesMap: {},
          }),
        ))
    )
      return {
        kind: "ok",
        model: strip1mTagWhereBuiltIn(chosen + "[1m]"),
      };
    return {
      kind: "ok",
      model: chosen,
    };
  }
  return {
    kind: "none",
  };
}
//@ chunk-2snqx25v.js:12830-12963 placement
function lastRefusalFallback(messages) {
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let message = messages[idx];
    if (message?.type === "system" && message.subtype === "model_refusal_fallback") return message;
  }
  return;
}
//@ chunk-2snqx25v.js:12963-13069 placement
function isRefusalFallbackModel(messages, model) {
  let fallback = lastRefusalFallback(messages);
  if (!fallback) return false;
  let fallbackBase = stripAnyVersatileSuffix(fallback.fallbackModel);
  let modelBase = stripAnyVersatileSuffix(model);
  return fallbackBase === modelBase || getCanonicalName(fallbackBase) === getCanonicalName(modelBase);
}
//@ chunk-2snqx25v.js:13069-13259 placement
function neutralizeForkFallbackBanners(messages) {
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    let message = messages[idx];
    if (message?.type === "system" && message.subtype === "model_refusal_fallback")
      message.neutralizedByFork = true;
    if (message?.type === "user") delete message.turnAttributionKey;
  }
}
//@ chunk-2snqx25v.js:13259-13358 placement
function carriedFallbackModelForResume(messages) {
  let fallback = lastRefusalFallback(messages);
  return fallback?.neutralizedByFork === true
    ? {
        fallbackModel: fallback.fallbackModel,
      }
    : undefined;
}
//@ chunk-2snqx25v.js:13358-13419 placement
function logResumeModelRestore(outcome) {
  logEvent("tengu_resume_model_restore", {
    outcome: fromEnum(outcome),
  });
}
//@ chunk-2snqx25v.js:13419-13508 placement
function prefetchBootstrapForResume(storageV5, credentials) {
  trackClientDataFetch(
    import("../services/api/bootstrap.js").then((bootstrap) =>
      bootstrap.fetchBootstrapData(storageV5, credentials),
    ),
  );
}
//@ chunk-2snqx25v.js:13508-14073 placement
function installRestoredModel(messages, model, isFork, storageV5, credentials) {
  if (!isRefusalFallbackModel(messages, model)) {
    setMainLoopModelOverride(model);
    prefetchBootstrapForResume(storageV5, credentials);
    logResumeModelRestore("restored");
    return model;
  }
  if (isFork) {
    logEvent("tengu_refusal_fallback_resume_latch", {
      action: fromEnum("fork_skip_restore"),
    });
    logResumeModelRestore("skipped_fork_fallback");
    return;
  }
  let carried = carriedFallbackModelForResume(messages);
  if (carried && stripAnyVersatileSuffix(carried.fallbackModel) === stripAnyVersatileSuffix(model)) {
    logEvent("tengu_refusal_fallback_resume_latch", {
      action: fromEnum("fork_neutralized_skip"),
    });
    logResumeModelRestore("skipped_fork_neutralized");
    return;
  }
  setMainLoopModelOverride(model);
  prefetchBootstrapForResume(storageV5, credentials);
  latchRefusalFallbackModel({
    fallbackModel: model,
    previousOverride: undefined,
    previousAppStateModel: getInitialMainLoopModel() ?? null,
    previousModelForSession: null,
  });
  logResumeModelRestore("restored");
  logEvent("tengu_refusal_fallback_resume_latch", {
    action: fromEnum("model_latch_only"),
  });
  return model;
}
//@ chunk-2snqx25v.js:14073-14444 placement
function rearmRefusalFallbackHeaderFromTranscript(messages, isFork) {
  if (isFork) return;
  let flattened = messages.flatMap((message) =>
    message?.type === "system" &&
    message.subtype === "model_refusal_fallback" &&
    (message.apiRefusalCategory === "cyber" || message.sawCyberRefusal === true) &&
    message.neutralizedByFork !== true
      ? [message]
      : [],
  );
  if (flattened.length > 0) {
    markRefusalFallbackHeaderArmed(
      flattened.find((message) => message.apiRefusalCategory === "cyber" && message.requestId != null)
        ?.requestId ?? undefined,
    );
    logEvent("tengu_refusal_fallback_resume_latch", {
      action: fromEnum("header_rearmed"),
    });
  }
}
//@ chunk-2snqx25v.js:14444-14506 placement
async function reloadAgentsForModeSwitch(
  modeSwitchEnabled,
  currentCwd,
  cliAgents,
  agentDefinitions,
  storageV5,
) {
  if (!modeSwitchEnabled) return agentDefinitions;
  return reloadAgentDefinitionsForModeSwitch(currentCwd, cliAgents, storageV5);
}
//@ chunk-2snqx25v.js:14506-14618 placement
async function reloadAgentDefinitionsForModeSwitch(cwd, cliAgents, storageV5) {
  getHostState().agentDefinitions.clear();
  let freshAgentDefs = await getAgentDefinitionsWithOverrides(cwd, storageV5);
  return rebuildAgentDefinitions(freshAgentDefs, [...freshAgentDefs.allAgents, ...cliAgents]);
}
//@ chunk-2snqx25v.js:14618-14666 placement
function realpathOrSelf(path) {
  try {
    return realpathSync(path);
  } catch {
    return path;
  }
}
//@ chunk-2snqx25v.js:14666-14807 placement
function directoryState(path) {
  try {
    return statSync(path).isDirectory() ? "present" : "gone";
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? "gone" : "inaccessible";
  }
}
//@ chunk-2snqx25v.js:14807-14890 placement
var WORKTREE_UNBOUND_SAVE_OFF_MESSAGE =
  "The worktree binding could not be cleared because transcript saving is off";
//@ chunk-2snqx25v.js:14890-15735 placement
function worktreeResumeRefusalError(refusal, options) {
  if (refusal.reason === "pin-is-own-launch-tree")
    return `Error: ${stripControlCharsForMessage(refusal.message)} The worktree binding is kept.
`;
  if (!refusal.poisoned)
    return `Error: could not verify worktree ${stripControlCharsForMessage(refusal.worktreePath)} for this resume, so the resume was aborted rather than continuing without isolation. This is usually transient \u2014 the worktree binding is kept; re-run the command to retry.
`;
  let bindingNote =
    options?.bindingCleared === undefined
      ? ""
      : options.bindingCleared
        ? " The worktree binding has been cleared; re-running will continue in the current directory without worktree isolation."
        : ` ${WORKTREE_UNBOUND_SAVE_OFF_MESSAGE} for this run, so the same command will be refused again until that is resolved; to continue without the worktree, re-run with --fork-session or start a new conversation.`;
  return `Error: cannot resume into worktree ${stripControlCharsForMessage(refusal.worktreePath)}: ${stripControlCharsForMessage(refusal.message)} This session was not started.${bindingNote}
`;
}
//@ chunk-2snqx25v.js:15735-16027 placement
function worktreeGoneHeadlessNotice(refusal, options) {
  let bindingNote = options.bindingCleared
    ? "The worktree binding has been cleared."
    : `${WORKTREE_UNBOUND_SAVE_OFF_MESSAGE} for this run; a later resume will re-check it.`;
  return `Notice: the worktree ${stripControlCharsForMessage(refusal.worktreePath)} for this session no longer exists; continuing in the current directory without worktree isolation. ${bindingNote}
`;
}
//@ chunk-2snqx25v.js:16027-17059 placement
function worktreeResumeNotice(notice) {
  let saveOffNote = `${WORKTREE_UNBOUND_SAVE_OFF_MESSAGE}; a later --resume will re-check it.`;
  if (notice.reason === "worktree-gone")
    return `Your worktree ${stripControlCharsForMessage(notice.worktreePath)} no longer exists, so this session is working in the current directory without worktree isolation. ${isTranscriptPersistenceDisabled() ? saveOffNote : "The worktree binding has been cleared."}`;
  if (notice.reason === "pin-is-own-launch-tree")
    return `Could not re-enter your worktree ${stripControlCharsForMessage(notice.worktreePath)}: ${stripControlCharsForMessage(notice.message)} The worktree binding is kept.`;
  if (notice.poisoned) {
    let fallbackText = isTranscriptPersistenceDisabled()
      ? `You are working in the current directory without worktree isolation. ${saveOffNote}`
      : "This session's worktree binding has been cleared; you are working in the current directory without worktree isolation.";
    return `Did not re-enter your worktree ${stripControlCharsForMessage(notice.worktreePath)}: ${stripControlCharsForMessage(notice.message)} ${fallbackText}`;
  }
  return `Could not verify your worktree ${stripControlCharsForMessage(notice.worktreePath)} this time, so this session is working in the current directory without worktree isolation. The worktree binding is kept and a later --resume will retry it. If this keeps happening, the worktree's git metadata may need repair.`;
}
//@ chunk-2snqx25v.js:17059-17096 placement
var MEMORY_STILL_PAUSED_MESSAGE = "Memory is still paused from";
//@ chunk-2snqx25v.js:17096-17118 placement
function restoredMemoryPauseNotice() {
  return;
}
//@ chunk-2snqx25v.js:17118-17169 placement
var AUTO_MEMORY_OFF_MESSAGE = "Auto-memory is still off for this session";
//@ chunk-2snqx25v.js:17169-17191 placement
function restoredAutoMemorySessionNotice() {
  return;
}
//@ chunk-2snqx25v.js:17191-17503 placement
function pushRestoredMemoryPauseNotice(messages) {
  for (let [notice, marker] of [
    [restoredMemoryPauseNotice(), MEMORY_STILL_PAUSED_MESSAGE],
    [restoredAutoMemorySessionNotice(), AUTO_MEMORY_OFF_MESSAGE],
  ]) {
    if (notice === undefined) continue;
    let lastIndex = messages.findLastIndex(
      (message) =>
        message.type === "system" &&
        message.subtype === "informational" &&
        typeof message.content === "string" &&
        message.content.includes(marker),
    );
    if (
      lastIndex !== -1 &&
      !messages
        .slice(lastIndex + 1)
        .some((message) => message.type === "user" || message.type === "assistant")
    )
      continue;
    messages.push(createSystemMessage(notice, "notice"));
  }
}
//@ chunk-2snqx25v.js:17503-17678 placement
function isNetworkTranscriptPath(path) {
  if (isNonWslUncPath(path) || isDevicePrefixPath(path) || isDevicePrefixPath(win32.normalize(path))) {
    logForDebugging("[sessionRestore] transcript path is a network/NT-namespace path \u2014 not chdir-ing", {
      level: "warn",
    });
    return true;
  }
  return false;
}
//@ chunk-2snqx25v.js:17678-17737 placement
function restoreWorktreeForResume(registry, worktreeSession, storageV5, options) {
  let worktreeForResume = resolveWorktreeForResume(worktreeSession, storageV5, options);
  registry.record(worktreeForResume);
  return worktreeForResume;
}
//@ chunk-2snqx25v.js:17737-21195 placement
/**
 * 续接会话时恢复 worktree 绑定：校验记录路径（网络路径、不可验证祖先、无效 linked worktree 等拒绝），worktree 已不存在则清除绑定并回到当前目录，返回 poisoned/cleared 状态供提示。
 */
function resolveWorktreeForResume(record, projectPath, options) {
  let currentWorktreeSession = getCurrentWorktreeSession();
  if (currentWorktreeSession && options?.preserveBinding !== true) {
    saveWorktreeState(currentWorktreeSession);
    return null;
  }
  if (!record) {
    if (record === null) {
      logEvent("tengu_worktree_resume_root_rejected", {
        reason: lit("worktree-exited-resume"),
        poisoned: lit("false"),
      });
      logForDebugging(
        "[worktree] resuming a session whose worktree record was cleared (exited or scrubbed): running without isolation",
      );
      return null;
    }
    if (!projectPath || getCwd() === projectPath) return null;
    if (isNetworkTranscriptPath(projectPath)) return null;
    if (hasUntouchableRecordSpelling(projectPath)) {
      logForDebugging("[worktree] resume: the recorded project path has a network spelling; staying put");
      return null;
    }
    try {
      processChdir(projectPath);
    } catch {
      return null;
    }
    setCwd(projectPath);
    if (isCoveredByWorktrees(projectPath, restoreRootsFor(STARTUP_CWD_REALPATH))) setOriginalCwd(getCwd());
    clearMemoryFilesCacheForHost();
    resetEnvironmentCaches("resume");
    getPlansDirectory.cache.clear?.();
    primePlanSlugCollisions(options?.storageV5);
    reanchorGitFileWatcher();
    clearIsGitMemo();
    getReplBridgeHandle()?.refreshGitBranch?.();
    return null;
  }
  let preserveBinding = options?.preserveBinding === true;
  if (
    isNetworkTranscriptPath(record.worktreePath) ||
    hasDotDotSegment(record.worktreePath) ||
    isNetworkMountRoot(record.worktreePath) ||
    isNetDir(record.worktreePath) ||
    findIntermediateUncJunction(NodeFsOperations, record.worktreePath, {
      surfaceNetworkRaw: true,
      unreadableAncestry: "unverified",
    }) !== undefined
  ) {
    if (!preserveBinding) saveWorktreeState(null);
    logEvent("tengu_worktree_resume_root_rejected", {
      reason: lit("network-spelled-pin"),
      poisoned: lit("true"),
    });
    return {
      worktreePath: record.worktreePath,
      reason: "invalid-linked-worktree",
      message: "its recorded path has a network spelling, which can never be a local isolation worktree.",
      poisoned: true,
    };
  }
  let dirState = directoryState(record.worktreePath);
  if (dirState === "gone") {
    if (!preserveBinding) saveWorktreeState(null);
    logEvent("tengu_worktree_resume_root_rejected", {
      reason: lit("worktree-gone"),
      poisoned: lit("true"),
    });
    return {
      worktreePath: record.worktreePath,
      reason: "worktree-gone",
      message: "the worktree directory no longer exists",
      poisoned: true,
    };
  }
  if (dirState === "inaccessible") {
    logForDebugging(`[worktree] could not examine ${record.worktreePath} on resume; keeping the binding`, {
      level: "error",
    });
    logEvent("tengu_worktree_resume_root_rejected", {
      reason: lit("unverifiable"),
      poisoned: lit("false"),
    });
    return {
      worktreePath: record.worktreePath,
      reason: "unverifiable",
      message: "the worktree directory could not be examined right now",
      poisoned: false,
    };
  }
  let liveLaunchDir = options?.liveLaunchDir ?? STARTUP_CWD_REALPATH;
  let sameLocation = isSameRestoreLocation(getCwd(), record.worktreePath);
  let check = checkWorktreeIsolationSync(
    record.worktreePath,
    gitRootsForPath(record.originalCwd),
    normalizeCaseForComparison_2([
      realpathOrSelf(liveLaunchDir),
      ...gitRootsForPath(liveLaunchDir),
      realpathOrSelf(STARTUP_CWD_REALPATH),
      ...gitRootsForPath(STARTUP_CWD_REALPATH),
    ]),
    {
      declineSelfOwningPinUnderLiveRoot: true,
    },
  );
  if (!check.ok) {
    let poisoned = check.reason !== "unverifiable" && check.reason !== "pin-is-own-launch-tree";
    logForDebugging(
      `[worktree] declining to resume into ${record.worktreePath} (${check.reason}): ${check.message}`,
      {
        level: "error",
      },
    );
    logEvent("tengu_worktree_resume_root_rejected", {
      reason: fromEnum(check.reason),
      poisoned: lit(poisoned ? "true" : "false"),
    });
    if (poisoned) {
      if (!preserveBinding) saveWorktreeState(null);
      if (sameLocation) {
        let parentDir = dirname(record.worktreePath);
        let fallbackDir = directoryState(parentDir) === "present" ? parentDir : record.originalCwd;
        if (isSameRestoreLocation(fallbackDir, record.worktreePath))
          return {
            worktreePath: record.worktreePath,
            reason: check.reason,
            message: check.message,
            poisoned,
          };
        try {
          processChdir(fallbackDir);
          setCwd(fallbackDir);
          let isOutside = (root) => compareSameContainment(root, record.worktreePath) === "same";
          let location = worktreeLocationOf(record.worktreePath);
          let extraRoots = location !== null ? [location.checkout] : [];
          let filtered = [...gitRootsForPath(liveLaunchDir), ...extraRoots].filter(
            (root) => !isOutside(root),
          );
          if (
            isCoveredByWorktrees(fallbackDir, filtered, {
              requireCovered: true,
            })
          )
            setOriginalCwd(fallbackDir);
          clearMemoryFilesCacheForHost();
          resetEnvironmentCaches("resume");
          clearIsGitMemo();
          getPlansDirectory.cache.clear?.();
          primePlanSlugCollisions(options?.storageV5);
          reanchorGitFileWatcher();
          getReplBridgeHandle()?.refreshGitBranch?.();
        } catch {}
      }
    }
    return {
      worktreePath: record.worktreePath,
      reason: check.reason,
      message: check.message,
      poisoned,
    };
  }
  try {
    processChdir(record.worktreePath);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") {
      if (!preserveBinding) saveWorktreeState(null);
      logEvent("tengu_worktree_resume_root_rejected", {
        reason: lit("worktree-gone"),
        poisoned: lit("true"),
      });
      return {
        worktreePath: record.worktreePath,
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
      worktreePath: record.worktreePath,
      reason: "unverifiable",
      message: "the worktree directory could not be entered right now",
      poisoned: false,
    };
  }
  setCwd(record.worktreePath);
  setOriginalCwd(getCwd());
  restoreWorktreeSession({
    ...record,
    liveLaunchAnchor: liveLaunchDir,
    originalChangeset: undefined,
  });
  clearMemoryFilesCacheForHost();
  resetEnvironmentCaches("resume");
  getPlansDirectory.cache.clear?.();
  primePlanSlugCollisions(options?.storageV5);
  reanchorGitFileWatcher();
  getReplBridgeHandle()?.refreshGitBranch?.();
  return null;
}
//@ chunk-2snqx25v.js:21195-21807 placement (2.1.88 match: exitRestoredWorktree, 0.202)
/**
 * 恢复的会话记录了 worktree 但不再适用时，切回原始 cwd。
 */
function exitRestoredWorktree(previousWorktreePath, storageV5) {
  let current = getCurrentWorktreeSession();
  if (!current) return;
  restoreWorktreeSession(null);
  clearMemoryFilesCacheForHost();
  resetEnvironmentCaches("resume");
  if (current.worktreePath === previousWorktreePath) {
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
        let location = worktreeLocationOf(current.worktreePath);
        return location !== null ? [location.checkout] : [];
      })(),
    })
  )
    setOriginalCwd(getCwd());
  getPlansDirectory.cache.clear?.();
  primePlanSlugCollisions(storageV5);
  reanchorGitFileWatcher();
  getReplBridgeHandle()?.refreshGitBranch?.();
}
//@ chunk-2snqx25v.js:21807-26414 placement (2.1.88 match: processResumedConversation, 0.411)
/**
 * 恢复会话的后处理：采用或分叉 sessionId（--fork-session 时复制内容替换记录），恢复元数据、费用、worktree、代理定义与权限模式，返回启动 REPL 所需的消息与状态。
 */
async function processResumedConversation(result, opts, context) {
  markSessionRestored(context.session.host);
  let modeWarning = context.modeApi?.matchSessionMode(result.mode);
  if (modeWarning) result.messages.push(createSystemMessage(modeWarning, "warning"));
  let pinSwitch = switchSessionModelPin(
    {
      ...result,
      source: opts.resumeSource ?? "file",
    },
    (warning) => result.messages.push(createSystemMessage(warning, "warning")),
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
  let teamRekey =
    adoptedSessionId && isAgentSwarmsEnabled()
      ? await (
          await import("../tools/TeamCreateTool/initializeSessionTeam.lazy.js")
        ).rekeySessionTeamAtStartup(context.storageV5)
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
  noopModelPinReset(pinSwitch.declined === true);
  pushRestoredMemoryPauseNotice(result.messages);
  setCostStateForRestore(result);
  if (!effectiveFork) {
    let refusal = restoreWorktreeForResume(
      lastResumeRecordRegistry.of(context.session.host),
      result.worktreeSession,
      undefined,
      {
        storageV5: context.storageV5,
      },
    );
    if (refusal) result.messages.push(createSystemMessage(worktreeResumeNotice(refusal), "warning"));
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
      onResolveMiss: (warning) => result.messages.push(createSystemMessage(warning, "warning")),
    },
  );
  let permissionMode = result.permissionMode;
  let modeDowngraded = false;
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
    modeDowngraded = true;
    logForDebugging(
      `[sessionRestore] stored mode 'auto' read as '${permissionMode}': proactivity 'ask' with levels off in this process`,
    );
  }
  let proactivityActive =
    context.initialState.toolPermissionContext.startupModeDecidedByProactivityLevel !== undefined &&
    isProactivityActive();
  let restoredMode = await resumedPermissionMode(
    permissionMode,
    context.permissionModeCliSet || proactivityActive,
  );
  if (modeDowngraded) {
    let effectiveMode = restoredMode ?? context.initialState.toolPermissionContext.mode;
    if (effectiveMode !== "auto")
      result.messages.push(
        createSystemMessage(
          `Resumed in ${permissionModeTitle(effectiveMode).toLowerCase()} mode instead of auto: this session is set to ask before each file edit, and auto mode alone would not. Press shift+tab to switch modes.`,
          "warning",
        ),
      );
  }
  let attentionBudget = null;
  if (effectiveFork) neutralizeForkFallbackBanners(result.messages);
  let restoredModel = await restoreModelFromSession(
    result.messages,
    context.initialState.mainLoopModel,
    (warning) => result.messages.push(createSystemMessage(warning, "warning")),
    {
      storageV5: context.storageV5,
      credentials: context.credentials,
    },
  );
  let installedModel = restoredModel
    ? installRestoredModel(
        result.messages,
        restoredModel,
        effectiveFork,
        context.storageV5,
        context.credentials,
      )
    : undefined;
  rearmRefusalFallbackHeaderFromTranscript(result.messages, effectiveFork);
  appendSlackTagResumeRecords(result.messages, {
    fork: effectiveFork,
    startup: true,
  });
  let modeWarning_2;
  if (restoredMode) {
    let { transitionPermissionMode } = await import("./permissions/permissionSetup.js");
    let toolPermissionContext = context.initialState.toolPermissionContext;
    try {
      modeWarning_2 = {
        ...transitionPermissionMode(toolPermissionContext.mode, restoredMode, toolPermissionContext),
        mode: restoredMode,
      };
      if (!toolPermissionContext.proactivityBaseline?.fromRelaunchHandoff)
        modeWarning_2 = {
          ...modeWarning_2,
          proactivityBaseline: {
            mode: restoredMode,
            fromRelaunchHandoff: false,
          },
        };
    } catch (error) {
      logForDebugging(
        `[sessionRestore] transitionPermissionMode rejected restored mode '${restoredMode}': ${error}`,
      );
    }
  }
  modeWarning_2 =
    (
      await preparePlanModeRestoreOnInteractiveResume({
        storedPermissionMode: permissionMode,
        messages: result.messages,
        forkSession: effectiveFork,
        permissionModeSuppliedOnInvocation: context.permissionModeSuppliedOnInvocation,
        lane: "interactive",
      })
    )(modeWarning_2 ?? context.initialState.toolPermissionContext) ?? modeWarning_2;
  saveMode(context.modeApi?.isCoordinatorMode() ? "coordinator" : "normal");
  let attribution = opts.includeAttribution ? noopRestore(result) : undefined;
  let standaloneAgentContext = computeStandaloneAgentContext(result.agentName, result.agentColor);
  let agentContext = context.initialState.standaloneAgentContext
    ? {
        ...standaloneAgentContext,
        ...context.initialState.standaloneAgentContext,
      }
    : standaloneAgentContext;
  reclaimSessionNameOnResume(agentContext?.name, context.storageV5, {
    autoOnly: !result.customTitle && !context.initialState.standaloneAgentContext?.name,
  });
  let agentDefinitions = await reloadAgentsForModeSwitch(
    !!modeWarning,
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
  require("../commands/goal/restoreGoal.js").restoreGoalFromTranscript(
    result.messages,
    (update) => {
      initialState = update(initialState);
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
      ...(teamRekey && {
        teamContext: teamRekey.teamContext,
        teammateColors: teamRekey.teammateColors,
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
      ...(attentionBudget && {
        attentionBudget,
      }),
      ...(installedModel && {
        mainLoopModel: installedModel,
      }),
      ...(attribution && {
        attribution,
      }),
      ...(agentContext && {
        standaloneAgentContext: agentContext,
      }),
      ...(modeWarning_2 && {
        toolPermissionContext: modeWarning_2,
      }),
      agentDefinitions,
    },
    sessionHooks: sessionHooksRegistry,
  };
}
//@ chunk-2snqx25v.js:26414-26433 placement
function appendSlackTagResumeRecords(messages, options) {}
export {
  shouldAttemptAgentRestoreInPrint,
  loadAgentDefinitionsForSessionCwd,
  restoreAgentFromSession,
  neutralizeForkFallbackBanners,
  rearmRefusalFallbackHeaderFromTranscript,
  restoreModelFromSession,
  installRestoredModel,
  restoreWorktreeForResume,
  worktreeResumeRefusalError,
  worktreeGoneHeadlessNotice,
  restoredMemoryPauseNotice,
  restoredAutoMemorySessionNotice,
  reloadAgentDefinitionsForModeSwitch,
  restoreSessionStateFromLog,
  startupModelWinsOverSessionRestore,
  processResumedConversation,
  recordResumeSource,
  appendSlackTagResumeRecords,
  preparePlanModeRestoreOnInteractiveResume,
  computeStandaloneAgentContext,
  pushRestoredMemoryPauseNotice,
  markSessionRestored,
  worktreeResumeNotice,
  maybeSwitchSessionForResume,
  isSessionRestored,
  currentRestoreSource,
  exitRestoredWorktree,
  lastTranscriptModel,
};

/**
 * cli/print/applyFlagSettings.ts
 *
 * 2.1.316 新增：应用 SDK 传入的标志设置副作用（工作区信任、思考设置恢复、回退判定）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (21)
 * attribution: placement 21
 */
import { isDeepStrictEqual } from "util";
import { isAbsolute } from "path";
import { stat, realpath } from "fs/promises";
import { isPlainObject as isPlainObject_2 } from "../../utils/isPlainObject.js";
import { SETTINGS_NESTING_LIMITS, SETTINGS_STRING_MAX_CHARS } from "./mcpStatusMessages.js";
import { applySettingAliases } from "../../utils/settings/marketplaceSettingsAliases.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  getFlagSettingsInline,
  setFlagSettingsInline,
  getThinkingDisplayExplicit,
  setThinkingDisplayExplicit,
  setMainLoopModelOverride,
} from "../../bootstrap/state.js";
import { isRemoteCowork } from "../../utils/entrypointKinds.js";
import { shouldAllowManagedPermissionRulesOnly } from "../../utils/permissions/permissionsLoader.js";
import { settingsChangeDetector } from "../../utils/settings/changeDetector.js";
import { invalidateFocusModeSection } from "../../utils/focusMode.js";
import {
  isRequestedEffortTheHeldLevel,
  parseEffortValue,
  resolveEffortKeyword,
  toEffortSettingOrDefault,
  parseEffortKeyword,
  isEffortChangedFromSession,
  isSameEffortSetting,
} from "../../utils/effort.js";
import { ACCESSFALLBACKMODELS, isAccessFallbackModelsData } from "../../services/api/modelFallback.js";
import { isValidThinkingSettingsRequest } from "../../bridge/controlRequests.js";
import { isThinkingDisplayMode } from "../../entrypoints/sdk/coreSchemas.js";
import { applyThinkingBudget } from "./setMaxThinkingTokens.js";
import { logError } from "../../utils/log.js";
import { toError, errorMessage } from "../../utils/errors.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { getPersistedTrustKeyForPath, isTrustKeyPersistedTrusted } from "../../utils/config.js";
import { expandPath } from "../../utils/path.js";
import { vetPathSpellingsOrChain, pathVettingReason } from "../../utils/permissions/pathVetting.js";
import { getDefaultMainLoopModel } from "../../utils/model/modelFallback.js";
import {
  isExemptDefaultResolvingPick,
  isModelAllowedUnderActiveEnforcement,
} from "../../utils/model/defaultModel.js";
import { isModelAllowed } from "../../utils/model/modelAllowlist.js";
import { parseUserSpecifiedModel } from "../../utils/model/modelDisplay.js";
import {
  REWIND_REQUEST_MAX_AGE_MS as REWIND_REQUEST_MAX_AGE_MS_2,
  rewindRequestAge,
} from "../remoteIO/turnHandoff.js";
import { parseIsoTimestamp } from "../../utils/parseIsoTimestamp.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { isReorderedRow, UUID_PREFIX_LENGTH, isModelCommandMessage } from "../../utils/messages.js";
import { isExactReplToolName } from "../../tools/REPLTool/constants.js";
import { isCompactBoundaryMessage } from "../../services/projects/threadRows.js";
import { findRewindTargetIndex } from "./rewindStandIn.js";
import { getMessageIdentityUuids } from "../queuedCommands.js";

//@ chunk-tyg7f3ek.js:567863-568159 placement
/**
 * 校验 SDK apply_flag_settings 请求：必须是对象、嵌套深度受限、键合法。
 */
function validateApplyFlagSettings(settings) {
  if (!isPlainObject_2(settings))
    return {
      ok: false,
      error: `apply_flag_settings requires \`settings\` to be an object, got ${settings === null ? "null" : Array.isArray(settings) ? "an array" : typeof settings}`,
    };
  let normalized = normalizeFallbackModelsSetting(settings);
  if (exceedsNestingDepth(normalized, SETTINGS_NESTING_LIMITS))
    return {
      ok: false,
      error: `apply_flag_settings: settings nest deeper than ${SETTINGS_NESTING_LIMITS} levels`,
    };
  return {
    ok: true,
    settings: normalized,
  };
}
//@ chunk-tyg7f3ek.js:568159-568493 placement
/**
 * 合并并应用 SDK 传入的 flag 设置（规范化 null 别名、写入内联 flagSettings）。
 */
function applyFlagSettings(settings, isUnchanged) {
  let next = {
    ...normalizeFallbackModelsSetting(settings),
  };
  for (let warning of applySettingAliases(next, "apply_flag_settings", {
    loneNullAlias: "rename",
  }))
    logForDebugging(`apply_flag_settings: ${warning.message}`, {
      level: "warn",
    });
  let flagSettingsInline = getFlagSettingsInline();
  let merged = {
    ...(flagSettingsInline ?? {}),
    ...next,
  };
  for (let key of Object.keys(merged)) if (merged[key] === null) delete merged[key];
  if (!(
    isDeepStrictEqual(merged, flagSettingsInline) &&
    isRemoteCowork() &&
    !shouldAllowManagedPermissionRulesOnly() &&
    !isUnchanged()
  )) {
    setFlagSettingsInline(merged);
    settingsChangeDetector.notifyChange("flagSettings");
  }
  if ("viewMode" in settings) invalidateFocusModeSection();
}
//@ chunk-tyg7f3ek.js:568493-569196 placement
/**
 * 处理 flag 设置中的 effortLevel / ultracode / 模型等需要即时生效的键。
 */
function applyFlagSettingsSideEffects(settings, host) {
  let ultracode = "ultracode" in settings ? settings.ultracode === true : undefined;
  if (
    "effortLevel" in settings &&
    !isRequestedEffortTheHeldLevel(host.model, settings.effortLevel, host.getEngineState())
  ) {
    let effortValue =
      settings.effortLevel == null
        ? undefined
        : (parseEffortValue(settings.effortLevel) ?? resolveEffortKeyword(settings.effortLevel));
    if (settings.effortLevel == null || effortValue !== undefined) {
      let effortSettingOrDefault = toEffortSettingOrDefault(effortValue);
      let isUltracode = parseEffortKeyword(settings.effortLevel) === "ultracode";
      host.setEngineState((state) => {
        let nextUltracode =
          ultracode ??
          (isUltracode || (isEffortChangedFromSession(host.model, state, effortValue) ? false : undefined));
        let next = state;
        if (!isSameEffortSetting(next.sessionEffort, effortSettingOrDefault))
          next = {
            ...next,
            sessionEffort: effortSettingOrDefault,
          };
        if (nextUltracode !== undefined && (next.ultracode ?? false) !== nextUltracode)
          next = {
            ...next,
            ultracode: nextUltracode,
          };
        return next;
      });
    }
    let effortText = settings.effortLevel == null ? null : String(effortValue ?? settings.effortLevel);
    if (effortText === null || effortText.length <= SETTINGS_STRING_MAX_CHARS)
      host.reportEffortMetadata(effortText);
  }
  if (ultracode !== undefined)
    host.setEngineState((state) =>
      (state.ultracode ?? false) === ultracode
        ? state
        : {
            ...state,
            ultracode,
          },
    );
  return "effortLevel" in settings || ultracode !== undefined;
}
//@ chunk-tyg7f3ek.js:569196-569377 placement
function exceedsNestingDepth(value, maxDepth) {
  let level = [value];
  for (let j = 1; level.length > 0; j++) {
    if (j > maxDepth) return true;
    let nextLevel = [];
    for (let node of level)
      for (let child of Object.values(node))
        if (typeof child === "object" && child !== null) nextLevel.push(child);
    level = nextLevel;
  }
  return false;
}
//@ chunk-tyg7f3ek.js:569377-569877 placement
function normalizeFallbackModelsSetting(settings) {
  let value = settings[ACCESSFALLBACKMODELS];
  if (value == null || isAccessFallbackModelsData(value)) return settings;
  logForDebugging(
    `apply_flag_settings: ${ACCESSFALLBACKMODELS} must be null or an object with exactly "for" (the session's model, in the spelling the session holds; 1 to 256 characters) and "models" (a list of one to three model ids, each 1 to 256 characters: letters, digits, . _ : / @ [ ] -, starting with a letter or digit). The value sent was not, so it is read as null, which removes any earlier value if the request is applied.`,
    {
      level: "warn",
    },
  );
  return {
    ...settings,
    [ACCESSFALLBACKMODELS]: null,
  };
}
//@ chunk-tyg7f3ek.js:569877-570152 placement
function readRecordedThinkingSettings(restoredWorkerState) {
  if (restoredWorkerState === null || restoredWorkerState.readFailed)
    return {
      malformed: false,
    };
  let maxThinkingTokens = restoredWorkerState.internal?.max_thinking_tokens ?? null;
  let thinkingDisplay = restoredWorkerState.internal?.thinking_display ?? null;
  let tokensValid = isValidThinkingSettingsRequest({
    max_thinking_tokens: maxThinkingTokens,
  });
  let displayValid = thinkingDisplay === null || isThinkingDisplayMode(thinkingDisplay);
  return {
    ...(tokensValid && {
      max_thinking_tokens: maxThinkingTokens,
    }),
    ...(displayValid && {
      thinking_display: thinkingDisplay,
    }),
    malformed: !tokensValid || !displayValid,
  };
}
//@ chunk-tyg7f3ek.js:570152-570598 placement
var THINKING_RECORD_OUTCOME_TEXT = {
  applied: "thinking budget and display in the worker record: applied",
  display_refused:
    "thinking display 'highlights' in the worker record cannot be sent by this session and was left out; a recorded budget still applies",
  malformed: "thinking budget or display in the worker record is not valid and was left out",
  failed:
    "restoring thinking failed: nothing from the worker record was applied, nor a display handed over separately at start-up",
};
//@ chunk-tyg7f3ek.js:570598-571319 placement
/**
 * 从 worker 记录恢复思考预算与显示方式，并汇报应用结果。
 */
function restoreThinkingSettingsFromRecord({ launch, startupDisplay, recorded, report, log }) {
  let thinkingDisplayExplicit = getThinkingDisplayExplicit();
  let budget = launch();
  let { malformed, ...fields } = recorded;
  let recordedFields = fields;
  let outcome = malformed ? "malformed" : undefined;
  let maxThinkingTokens = fields.max_thinking_tokens ?? undefined;
  let thinkingDisplay = fields.thinking_display ?? undefined;
  try {
    if (startupDisplay !== undefined) budget.apply(undefined, startupDisplay);
    if (maxThinkingTokens !== undefined || thinkingDisplay !== undefined) {
      let displayRefused = applyThinkingBudget(budget, maxThinkingTokens, thinkingDisplay);
      outcome ??= displayRefused ? "display_refused" : "applied";
    }
  } catch (error) {
    logError(toError(error));
    budget = launch();
    setThinkingDisplayExplicit(thinkingDisplayExplicit);
    recordedFields = {};
    outcome = "failed";
  }
  if (outcome !== undefined)
    log({
      outcome,
      message: THINKING_RECORD_OUTCOME_TEXT[outcome],
      thinkingOff: budget.current()?.type === "disabled",
    });
  return {
    current: () => budget.current(),
    refreshDefault: () => budget.refreshDefault(),
    apply(maxThinkingTokens, thinkingDisplay) {
      budget.apply(maxThinkingTokens, thinkingDisplay);
      let changed = {};
      if (maxThinkingTokens !== undefined && maxThinkingTokens !== recordedFields.max_thinking_tokens)
        changed.max_thinking_tokens = maxThinkingTokens;
      if (thinkingDisplay !== undefined && thinkingDisplay !== recordedFields.thinking_display)
        changed.thinking_display = thinkingDisplay;
      if (Object.keys(changed).length > 0) {
        recordedFields = {
          ...recordedFields,
          ...changed,
        };
        report(changed);
      }
    },
  };
}
//@ chunk-tyg7f3ek.js:571405-572616 placement
/**
 * 处理 SDK 的 workspaceTrust：accepted 且目录为绝对路径时记录信任。
 */
async function applyWorkspaceTrust(request, context) {
  if (typeof request !== "object" || request === null) return;
  let { accepted, directory } = request;
  if (accepted !== true) return;
  if (typeof directory !== "string" || !isAbsolute(directory)) {
    logForDebugging("workspaceTrust ignored \u2014 accepted requires an absolute directory", {
      level: "warn",
    });
    return;
  }
  let reportOutcome = (outcome, ok) => {
    logEvent("tengu_sdk_workspace_trust", {
      outcome: fromEnum(outcome),
    });
    if (!ok)
      logForDebugging(`workspaceTrust recorded nothing (${outcome})`, {
        level: "warn",
      });
    return ok;
  };
  let persistedTrustKeyForPath = getPersistedTrustKeyForPath(context.cwd);
  let resolvedDirectory = directory;
  if (directory !== context.cwd) {
    let expanded;
    try {
      expanded = expandPath(directory);
      if (!vetPathSpellingsOrChain(directory, expanded, context.trustedNetworkDirectories).ok)
        expanded = undefined;
    } catch {
      expanded = undefined;
    }
    if (expanded === undefined) return reportOutcome("screened", false);
    try {
      if (!(await stat(expanded)).isDirectory()) return reportOutcome("not_a_directory", false);
      resolvedDirectory = await realpath(expanded);
    } catch {
      return reportOutcome("not_a_directory", false);
    }
    if (pathVettingReason(resolvedDirectory, context.trustedNetworkDirectories) !== undefined)
      return reportOutcome("screened", false);
  }
  let { hasUnsafePathGlyphs, recordDirectoryTrust, reapplyProjectSettingsAfterTrustChange } =
    await import("../../utils/cdRuleRefusalMessage.lazy.js");
  if ([resolvedDirectory, context.cwd, persistedTrustKeyForPath].some(hasUnsafePathGlyphs))
    return reportOutcome("unsafe_path", false);
  if (getPersistedTrustKeyForPath(resolvedDirectory) !== persistedTrustKeyForPath)
    return reportOutcome("mismatch", false);
  if (isTrustKeyPersistedTrusted(persistedTrustKeyForPath)) return reportOutcome("already_trusted", true);
  let recorded = await recordDirectoryTrust(context.cwd, context.storageV5);
  if (!isTrustKeyPersistedTrusted(persistedTrustKeyForPath)) return reportOutcome("session_only", false);
  try {
    reapplyProjectSettingsAfterTrustChange();
  } catch (error) {
    logForDebugging(
      `re-applying project settings after recording workspace trust failed (continuing): ${errorMessage(error)}`,
      {
        level: "error",
      },
    );
  }
  return reportOutcome(recorded ? "recorded" : "not_durable", recorded);
}
//@ chunk-tyg7f3ek.js:572616-572750 placement
function resolveAllowedModelPick(pick) {
  if (typeof pick !== "string") return;
  let model = pick.trim().toLowerCase() === "default" ? getDefaultMainLoopModel() : pick;
  return isExemptDefaultResolvingPick(model) ||
    (isModelAllowedUnderActiveEnforcement(model) !== false && isModelAllowed(model))
    ? model
    : undefined;
}
//@ chunk-tyg7f3ek.js:572750-572859 placement
function applyModelSetting(pick, setEngineState) {
  let allowedModelPick = resolveAllowedModelPick(pick);
  if (allowedModelPick === undefined) return;
  setMainLoopModelOverride(allowedModelPick);
  setEngineState((state) =>
    state.mainLoopModel === allowedModelPick
      ? state
      : {
          ...state,
          mainLoopModel: allowedModelPick,
        },
  );
}
//@ chunk-tyg7f3ek.js:572859-573018 placement
function modelToRestoreAfterRefusal({ refused, launch, active, restored, turnDispatched }) {
  if (turnDispatched || launch === undefined || active !== launch || !restored) return;
  let userSpecifiedModel = parseUserSpecifiedModel(launch);
  return parseUserSpecifiedModel(refused) === userSpecifiedModel &&
    parseUserSpecifiedModel(restored) !== userSpecifiedModel
    ? resolveAllowedModelPick(restored)
    : undefined;
}
//@ chunk-tyg7f3ek.js:573018-573523 placement
/**
 * rewind 请求的年龄上限（沿用 turnHandoff 的 30 分钟）：超龄即拒绝，避免执行过期的 rewind 请求。
 */
var REWIND_REFUSAL_TEXT = {
  commands_queued: "commands queued",
  prompt_pending: "prompt pending",
  turn_running: "turn running",
  target_not_found: "target not found",
  stale_target: "stale target",
  unseen_later_turn: "unseen later turn",
  poll_tool_result_target: "poll tool_result target",
  target_splits_tool_call: "target splits a tool call",
  delivered_poll_events_in_range: "delivered poll events in range",
  persist_failed: "failed to persist rewind anchor",
  state_changed: "state changed",
  usage_limited: "usage limited",
  expired: "expired",
};
var REWIND_REQUEST_MAX_AGE_MS = REWIND_REQUEST_MAX_AGE_MS_2;
//@ chunk-tyg7f3ek.js:573523-573895 placement
function checkRewindExpiry({ storedAt, serviceNow, newestFrameAt }, expiresAt) {
  let expiresAtMs = typeof expiresAt === "string" ? parseIsoTimestamp(expiresAt) : Number.NaN;
  if (Number.isNaN(expiresAtMs))
    return {
      outcome: "unparseable",
    };
  let now = serviceNow ?? newestFrameAt;
  if (now === undefined)
    return {
      outcome: "no_service_time",
    };
  return {
    outcome: now > expiresAtMs ? "refused" : "in_time",
    frameTimeOnly: serviceNow === undefined,
    secondsLeft: Math.floor((expiresAtMs - now) / 1000),
    secondsLeftWhenStored: storedAt === undefined ? undefined : Math.floor((expiresAtMs - storedAt) / 1000),
  };
}
//@ chunk-tyg7f3ek.js:573895-574504 placement
/**
 * 判断 rewind 请求的 expires_at 是否已过期（以服务端时间或最新帧时间为准）。
 */
function rewindExpiryVerdict(request, expiresAt, onChecked) {
  let check = expiresAt === undefined ? undefined : checkRewindExpiry(request, expiresAt);
  if (check !== undefined) {
    switch (check.outcome) {
      case "refused":
      case "in_time":
        logFeatureOk("rewind_expires_at", {
          refused: check.outcome === "refused",
          frame_time_only: check.frameTimeOnly,
          seconds_left: check.secondsLeft,
          ...(check.secondsLeftWhenStored !== undefined && {
            seconds_left_when_stored: check.secondsLeftWhenStored,
          }),
        });
        break;
      case "no_service_time":
      case "unparseable":
        logFeatureSad("rewind_expires_at", check.outcome);
        break;
    }
    onChecked?.(check);
  }
  let ageMs = rewindRequestAge(request);
  let expired = ageMs !== undefined && ageMs > REWIND_REQUEST_MAX_AGE_MS;
  if (expired)
    logEvent("tengu_rewind_conversation_expired", {
      age_minutes: Math.round(ageMs / 60000),
      by_service_clock: request.serviceNow !== undefined,
    });
  return expired || check?.outcome === "refused" ? rewindRefusal("expired") : undefined;
}
//@ chunk-tyg7f3ek.js:574504-574641 placement
function rewindRefusal(reason, isolationLatch) {
  return {
    rewound: false,
    prefillText: null,
    precedingAssistantUuid: null,
    error: REWIND_REFUSAL_TEXT[reason],
    reason,
    ...(isolationLatch !== undefined && {
      isolation_latch: isolationLatch,
    }),
  };
}
//@ chunk-tyg7f3ek.js:574641-574720 placement
function usageLimitedRewindRefusal(targetFound, latch) {
  return {
    ...rewindRefusal("usage_limited", latch),
    ...(!targetFound && {
      target_not_found: true,
    }),
  };
}
//@ chunk-tyg7f3ek.js:574720-574990 placement
var REWIND_REFUSAL_RETRYABLE = {
  commands_queued: true,
  prompt_pending: false,
  turn_running: true,
  target_not_found: true,
  stale_target: false,
  unseen_later_turn: false,
  poll_tool_result_target: false,
  target_splits_tool_call: false,
  delivered_poll_events_in_range: false,
  persist_failed: true,
  state_changed: true,
  usage_limited: false,
  expired: true,
};
//@ chunk-tyg7f3ek.js:574990-575226 placement
function findPersistAnchor(messages, index) {
  let persistAnchor = null;
  let precedingAssistantUuid = null;
  for (let j = index - 1; j >= 0; j--) {
    let message = messages[j];
    if (!message) continue;
    if (message.type === "assistant") {
      precedingAssistantUuid = message.uuid;
      persistAnchor ??= message.uuid;
      break;
    }
    if (message.type === "user" && persistAnchor === null && !isReorderedRow(message.uuid))
      persistAnchor = message.uuid;
  }
  return {
    persistAnchor,
    precedingAssistantUuid,
  };
}
//@ chunk-tyg7f3ek.js:575226-575757 placement = buildTranscriptEntries (0.77)
function isAwaitingToolResultAnchor(messages, index) {
  for (let j = index - 1; j >= 0; j--) {
    let message = messages[j];
    if (message.type === "user" || message.type === "assistant") {
      let exactReplToolUseIds = new Set();
      for (let msg of messages)
        if (msg.type === "assistant" && Array.isArray(msg.message.content)) {
          for (let block of msg.message.content)
            if (block?.type === "tool_use" && isExactReplToolName(block.name))
              exactReplToolUseIds.add(block.id);
        }
      return (
        j > messages.findLastIndex(isCompactBoundaryMessage) &&
        message.uuid === findPersistAnchor(messages, index).persistAnchor &&
        message.type === "user" &&
        Array.isArray(message.message.content) &&
        message.message.content.some(
          (block) => block?.type === "tool_result" && !exactReplToolUseIds.has(block.tool_use_id),
        )
      );
    }
    if (message.type === "attachment" && message.attachment.type === "queued_command") return false;
  }
  return false;
}
//@ chunk-tyg7f3ek.js:575757-575930 placement
function isRewindTargetQueued(messages, targetUuid, lastSeenUserMessageUuid) {
  if (typeof lastSeenUserMessageUuid !== "string") return false;
  let sliced = lastSeenUserMessageUuid.slice(0, UUID_PREFIX_LENGTH);
  let message = messages.at(-1);
  return (
    (message === undefined || !isModelCommandMessage(message)) &&
    findRewindTargetIndex(messages, targetUuid) >= 0 &&
    messages.some((message) =>
      getMessageIdentityUuids(message).some((uuid) => uuid.slice(0, UUID_PREFIX_LENGTH) === sliced),
    )
  );
}
export {
  readRecordedThinkingSettings,
  restoreThinkingSettingsFromRecord,
  modelToRestoreAfterRefusal,
  applyWorkspaceTrust,
  rewindExpiryVerdict,
  REWIND_REFUSAL_RETRYABLE,
  rewindRefusal,
  usageLimitedRewindRefusal,
  isRewindTargetQueued,
  REWIND_REFUSAL_TEXT,
  validateApplyFlagSettings,
  applyFlagSettings,
  applyFlagSettingsSideEffects,
  applyModelSetting,
  isAwaitingToolResultAnchor,
  findPersistAnchor,
};

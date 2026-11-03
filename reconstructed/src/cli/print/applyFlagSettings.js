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
  let n = normalizeFallbackModelsSetting(settings);
  if (exceedsNestingDepth(n, SETTINGS_NESTING_LIMITS))
    return {
      ok: false,
      error: `apply_flag_settings: settings nest deeper than ${SETTINGS_NESTING_LIMITS} levels`,
    };
  return {
    ok: true,
    settings: n,
  };
}
//@ chunk-tyg7f3ek.js:568159-568493 placement
/**
 * 合并并应用 SDK 传入的 flag 设置（规范化 null 别名、写入内联 flagSettings）。
 */
function applyFlagSettings(e, n) {
  let r = {
    ...normalizeFallbackModelsSetting(e),
  };
  for (let S of applySettingAliases(r, "apply_flag_settings", {
    loneNullAlias: "rename",
  }))
    logForDebugging(`apply_flag_settings: ${S.message}`, {
      level: "warn",
    });
  let flagSettingsInline = getFlagSettingsInline();
  let h = {
    ...(flagSettingsInline ?? {}),
    ...r,
  };
  for (let key of Object.keys(h)) if (h[key] === null) delete h[key];
  if (!(
    isDeepStrictEqual(h, flagSettingsInline) &&
    isRemoteCowork() &&
    !shouldAllowManagedPermissionRulesOnly() &&
    !n()
  )) {
    setFlagSettingsInline(h);
    settingsChangeDetector.notifyChange("flagSettings");
  }
  if ("viewMode" in e) invalidateFocusModeSection();
}
//@ chunk-tyg7f3ek.js:568493-569196 placement
/**
 * 处理 flag 设置中的 effortLevel / ultracode / 模型等需要即时生效的键。
 */
function applyFlagSettingsSideEffects(e, n) {
  let r = "ultracode" in e ? e.ultracode === true : undefined;
  if ("effortLevel" in e && !isRequestedEffortTheHeldLevel(n.model, e.effortLevel, n.getEngineState())) {
    let s =
      e.effortLevel == null
        ? undefined
        : (parseEffortValue(e.effortLevel) ?? resolveEffortKeyword(e.effortLevel));
    if (e.effortLevel == null || s !== undefined) {
      let effortSettingOrDefault = toEffortSettingOrDefault(s);
      let S = parseEffortKeyword(e.effortLevel) === "ultracode";
      n.setEngineState((R) => {
        let w = r ?? (S || (isEffortChangedFromSession(n.model, R, s) ? false : undefined));
        let P = R;
        if (!isSameEffortSetting(P.sessionEffort, effortSettingOrDefault))
          P = {
            ...P,
            sessionEffort: effortSettingOrDefault,
          };
        if (w !== undefined && (P.ultracode ?? false) !== w)
          P = {
            ...P,
            ultracode: w,
          };
        return P;
      });
    }
    let h = e.effortLevel == null ? null : String(s ?? e.effortLevel);
    if (h === null || h.length <= SETTINGS_STRING_MAX_CHARS) n.reportEffortMetadata(h);
  }
  if (r !== undefined)
    n.setEngineState((s) =>
      (s.ultracode ?? false) === r
        ? s
        : {
            ...s,
            ultracode: r,
          },
    );
  return "effortLevel" in e || r !== undefined;
}
//@ chunk-tyg7f3ek.js:569196-569377 placement
function exceedsNestingDepth(e, n) {
  let r = [e];
  for (let j = 1; r.length > 0; j++) {
    if (j > n) return true;
    let h = [];
    for (let y of r) for (let S of Object.values(y)) if (typeof S === "object" && S !== null) h.push(S);
    r = h;
  }
  return false;
}
//@ chunk-tyg7f3ek.js:569377-569877 placement
function normalizeFallbackModelsSetting(e) {
  let n = e[ACCESSFALLBACKMODELS];
  if (n == null || isAccessFallbackModelsData(n)) return e;
  logForDebugging(
    `apply_flag_settings: ${ACCESSFALLBACKMODELS} must be null or an object with exactly "for" (the session's model, in the spelling the session holds; 1 to 256 characters) and "models" (a list of one to three model ids, each 1 to 256 characters: letters, digits, . _ : / @ [ ] -, starting with a letter or digit). The value sent was not, so it is read as null, which removes any earlier value if the request is applied.`,
    {
      level: "warn",
    },
  );
  return {
    ...e,
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
  let s = isValidThinkingSettingsRequest({
    max_thinking_tokens: maxThinkingTokens,
  });
  let h = thinkingDisplay === null || isThinkingDisplayMode(thinkingDisplay);
  return {
    ...(s && {
      max_thinking_tokens: maxThinkingTokens,
    }),
    ...(h && {
      thinking_display: thinkingDisplay,
    }),
    malformed: !s || !h,
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
  let S = launch();
  let { malformed, ...w } = recorded;
  let P = w;
  let L = malformed ? "malformed" : undefined;
  let maxThinkingTokens = w.max_thinking_tokens ?? undefined;
  let thinkingDisplay = w.thinking_display ?? undefined;
  try {
    if (startupDisplay !== undefined) S.apply(undefined, startupDisplay);
    if (maxThinkingTokens !== undefined || thinkingDisplay !== undefined) {
      let G = applyThinkingBudget(S, maxThinkingTokens, thinkingDisplay);
      L ??= G ? "display_refused" : "applied";
    }
  } catch (error) {
    logError(toError(error));
    S = launch();
    setThinkingDisplayExplicit(thinkingDisplayExplicit);
    P = {};
    L = "failed";
  }
  if (L !== undefined)
    log({
      outcome: L,
      message: THINKING_RECORD_OUTCOME_TEXT[L],
      thinkingOff: S.current()?.type === "disabled",
    });
  return {
    current: () => S.current(),
    refreshDefault: () => S.refreshDefault(),
    apply(G, Z) {
      S.apply(G, Z);
      let re = {};
      if (G !== undefined && G !== P.max_thinking_tokens) re.max_thinking_tokens = G;
      if (Z !== undefined && Z !== P.thinking_display) re.thinking_display = Z;
      if (Object.keys(re).length > 0) {
        P = {
          ...P,
          ...re,
        };
        report(re);
      }
    },
  };
}
//@ chunk-tyg7f3ek.js:571405-572616 placement
/**
 * 处理 SDK 的 workspaceTrust：accepted 且目录为绝对路径时记录信任。
 */
async function applyWorkspaceTrust(e, n) {
  if (typeof e !== "object" || e === null) return;
  let { accepted, directory } = e;
  if (accepted !== true) return;
  if (typeof directory !== "string" || !isAbsolute(directory)) {
    logForDebugging("workspaceTrust ignored \u2014 accepted requires an absolute directory", {
      level: "warn",
    });
    return;
  }
  let h = (q, x) => {
    logEvent("tengu_sdk_workspace_trust", {
      outcome: fromEnum(q),
    });
    if (!x)
      logForDebugging(`workspaceTrust recorded nothing (${q})`, {
        level: "warn",
      });
    return x;
  };
  let persistedTrustKeyForPath = getPersistedTrustKeyForPath(n.cwd);
  let S = directory;
  if (directory !== n.cwd) {
    let q;
    try {
      q = expandPath(directory);
      if (!vetPathSpellingsOrChain(directory, q, n.trustedNetworkDirectories).ok) q = undefined;
    } catch {
      q = undefined;
    }
    if (q === undefined) return h("screened", false);
    try {
      if (!(await stat(q)).isDirectory()) return h("not_a_directory", false);
      S = await realpath(q);
    } catch {
      return h("not_a_directory", false);
    }
    if (pathVettingReason(S, n.trustedNetworkDirectories) !== undefined) return h("screened", false);
  }
  let { hasUnsafePathGlyphs, recordDirectoryTrust, reapplyProjectSettingsAfterTrustChange } =
    await import("./chunk-frfx56e3.js");
  if ([S, n.cwd, persistedTrustKeyForPath].some(hasUnsafePathGlyphs)) return h("unsafe_path", false);
  if (getPersistedTrustKeyForPath(S) !== persistedTrustKeyForPath) return h("mismatch", false);
  if (isTrustKeyPersistedTrusted(persistedTrustKeyForPath)) return h("already_trusted", true);
  let L = await recordDirectoryTrust(n.cwd, n.storageV5);
  if (!isTrustKeyPersistedTrusted(persistedTrustKeyForPath)) return h("session_only", false);
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
  return h(L ? "recorded" : "not_durable", L);
}
//@ chunk-tyg7f3ek.js:572616-572750 placement
function resolveAllowedModelPick(e) {
  if (typeof e !== "string") return;
  let n = e.trim().toLowerCase() === "default" ? getDefaultMainLoopModel() : e;
  return isExemptDefaultResolvingPick(n) ||
    (isModelAllowedUnderActiveEnforcement(n) !== false && isModelAllowed(n))
    ? n
    : undefined;
}
//@ chunk-tyg7f3ek.js:572750-572859 placement
function applyModelSetting(model, n) {
  let allowedModelPick = resolveAllowedModelPick(model);
  if (allowedModelPick === undefined) return;
  setMainLoopModelOverride(allowedModelPick);
  n((s) =>
    s.mainLoopModel === allowedModelPick
      ? s
      : {
          ...s,
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
function checkRewindExpiry({ storedAt, serviceNow, newestFrameAt }, s) {
  let h = typeof s === "string" ? parseIsoTimestamp(s) : Number.NaN;
  if (Number.isNaN(h))
    return {
      outcome: "unparseable",
    };
  let y = serviceNow ?? newestFrameAt;
  if (y === undefined)
    return {
      outcome: "no_service_time",
    };
  return {
    outcome: y > h ? "refused" : "in_time",
    frameTimeOnly: serviceNow === undefined,
    secondsLeft: Math.floor((h - y) / 1000),
    secondsLeftWhenStored: storedAt === undefined ? undefined : Math.floor((h - storedAt) / 1000),
  };
}
//@ chunk-tyg7f3ek.js:573895-574504 placement
/**
 * 判断 rewind 请求的 expires_at 是否已过期（以服务端时间或最新帧时间为准）。
 */
function rewindExpiryVerdict(e, expiresAt, r) {
  let s = expiresAt === undefined ? undefined : checkRewindExpiry(e, expiresAt);
  if (s !== undefined) {
    switch (s.outcome) {
      case "refused":
      case "in_time":
        logFeatureOk("rewind_expires_at", {
          refused: s.outcome === "refused",
          frame_time_only: s.frameTimeOnly,
          seconds_left: s.secondsLeft,
          ...(s.secondsLeftWhenStored !== undefined && {
            seconds_left_when_stored: s.secondsLeftWhenStored,
          }),
        });
        break;
      case "no_service_time":
      case "unparseable":
        logFeatureSad("rewind_expires_at", s.outcome);
        break;
    }
    r?.(s);
  }
  let h = rewindRequestAge(e);
  let y = h !== undefined && h > REWIND_REQUEST_MAX_AGE_MS;
  if (y)
    logEvent("tengu_rewind_conversation_expired", {
      age_minutes: Math.round(h / 60000),
      by_service_clock: e.serviceNow !== undefined,
    });
  return y || s?.outcome === "refused" ? rewindRefusal("expired") : undefined;
}
//@ chunk-tyg7f3ek.js:574504-574641 placement
function rewindRefusal(e, n) {
  return {
    rewound: false,
    prefillText: null,
    precedingAssistantUuid: null,
    error: REWIND_REFUSAL_TEXT[e],
    reason: e,
    ...(n !== undefined && {
      isolation_latch: n,
    }),
  };
}
//@ chunk-tyg7f3ek.js:574641-574720 placement
function usageLimitedRewindRefusal(targetFound, n) {
  return {
    ...rewindRefusal("usage_limited", n),
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
  let r = null;
  let precedingAssistantUuid = null;
  for (let j = index - 1; j >= 0; j--) {
    let y = messages[j];
    if (!y) continue;
    if (y.type === "assistant") {
      precedingAssistantUuid = y.uuid;
      r ??= y.uuid;
      break;
    }
    if (y.type === "user" && r === null && !isReorderedRow(y.uuid)) r = y.uuid;
  }
  return {
    persistAnchor: r,
    precedingAssistantUuid,
  };
}
//@ chunk-tyg7f3ek.js:575226-575757 placement = buildTranscriptEntries (0.77)
function isAwaitingToolResultAnchor(messages, index) {
  for (let j = index - 1; j >= 0; j--) {
    let s = messages[j];
    if (s.type === "user" || s.type === "assistant") {
      let h = new Set();
      for (let msg of messages)
        if (msg.type === "assistant" && Array.isArray(msg.message.content)) {
          for (let S of msg.message.content)
            if (S?.type === "tool_use" && isExactReplToolName(S.name)) h.add(S.id);
        }
      return (
        j > messages.findLastIndex(isCompactBoundaryMessage) &&
        s.uuid === findPersistAnchor(messages, index).persistAnchor &&
        s.type === "user" &&
        Array.isArray(s.message.content) &&
        s.message.content.some((block) => block?.type === "tool_result" && !h.has(block.tool_use_id))
      );
    }
    if (s.type === "attachment" && s.attachment.type === "queued_command") return false;
  }
  return false;
}
//@ chunk-tyg7f3ek.js:575757-575930 placement
function isRewindTargetQueued(e, targetMessageUuid, lastSeenUserMessageUuid) {
  if (typeof lastSeenUserMessageUuid !== "string") return false;
  let sliced = lastSeenUserMessageUuid.slice(0, UUID_PREFIX_LENGTH);
  let last = e.at(-1);
  return (
    (last === undefined || !isModelCommandMessage(last)) &&
    findRewindTargetIndex(e, targetMessageUuid) >= 0 &&
    e.some((y) => getMessageIdentityUuids(y).some((S) => S.slice(0, UUID_PREFIX_LENGTH) === sliced))
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

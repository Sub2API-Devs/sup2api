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
import { isDeepStrictEqual, isDeepStrictEqual as isDeepStrictEqual_2 } from "util";
import { isAbsolute, isAbsolute as isAbsolute_2, isAbsolute as isAbsolute_3 } from "path";
import {
  stat,
  stat as stat_2,
  stat as stat_3,
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
} from "fs/promises";
import { isPlainObject as isPlainObject_2 } from "../../utils/isPlainObject.js";
import { SETTINGS_NESTING_LIMITS, PV } from "./mcpStatusMessages.js";
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
import { $4t } from "../../utils/focusMode.js";
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
import { NF, cH } from "../../utils/permissions/pathVetting.js";
import { getDefaultMainLoopModel } from "../../utils/model/modelFallback.js";
import {
  isExemptDefaultResolvingPick,
  isModelAllowedUnderActiveEnforcement,
} from "../../utils/model/defaultModel.js";
import { isModelAllowed } from "../../utils/model/modelAllowlist.js";
import { parseUserSpecifiedModel } from "../../utils/model/modelDisplay.js";
import { BPr, rewindRequestAge } from "../remoteIO/turnHandoff.js";
import { L_e } from "../../utils/parseIsoTimestamp.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { OB, UUID_PREFIX_LENGTH, isModelCommandMessage } from "../../utils/messages.js";
import { S4 } from "../../tools/REPLTool/constants.js";
import { isCompactBoundaryMessage } from "../../services/projects/threadRows.js";
import { findRewindTargetIndex } from "./rewindStandIn.js";
import { getMessageIdentityUuids } from "../queuedCommands.js";

/**
 * 校验 SDK apply_flag_settings 请求：必须是对象、嵌套深度受限、键合法。
 */
//@ chunk-tyg7f3ek.js:567863-568159 placement
function validateApplyFlagSettings(e) {
  if (!isPlainObject_2(e))
    return {
      ok: !1,
      error: `apply_flag_settings requires \`settings\` to be an object, got ${e === null ? "null" : Array.isArray(e) ? "an array" : typeof e}`,
    };
  let n = normalizeFallbackModelsSetting(e);
  if (exceedsNestingDepth(n, SETTINGS_NESTING_LIMITS))
    return {
      ok: !1,
      error: `apply_flag_settings: settings nest deeper than ${SETTINGS_NESTING_LIMITS} levels`,
    };
  return { ok: !0, settings: n };
}
/**
 * 合并并应用 SDK 传入的 flag 设置（规范化 null 别名、写入内联 flagSettings）。
 */
//@ chunk-tyg7f3ek.js:568159-568493 placement
function applyFlagSettings(e, n) {
  let r = { ...normalizeFallbackModelsSetting(e) };
  for (let S of applySettingAliases(r, "apply_flag_settings", { loneNullAlias: "rename" }))
    logForDebugging(`apply_flag_settings: ${S.message}`, { level: "warn" });
  let s = getFlagSettingsInline(),
    h = { ...(s ?? {}), ...r };
  for (let S of Object.keys(h)) if (h[S] === null) delete h[S];
  if (!(isDeepStrictEqual_2(h, s) && isRemoteCowork() && !shouldAllowManagedPermissionRulesOnly() && !n()))
    (setFlagSettingsInline(h), settingsChangeDetector.notifyChange("flagSettings"));
  if ("viewMode" in e) $4t();
}
/**
 * 处理 flag 设置中的 effortLevel / ultracode / 模型等需要即时生效的键。
 */
//@ chunk-tyg7f3ek.js:568493-569196 placement
function applyFlagSettingsSideEffects(e, n) {
  let r = "ultracode" in e ? e.ultracode === !0 : void 0;
  if ("effortLevel" in e && !isRequestedEffortTheHeldLevel(n.model, e.effortLevel, n.getEngineState())) {
    let s =
      e.effortLevel == null
        ? void 0
        : (parseEffortValue(e.effortLevel) ?? resolveEffortKeyword(e.effortLevel));
    if (e.effortLevel == null || s !== void 0) {
      let y = toEffortSettingOrDefault(s),
        S = parseEffortKeyword(e.effortLevel) === "ultracode";
      n.setEngineState((R) => {
        let w = r ?? (S || (isEffortChangedFromSession(n.model, R, s) ? !1 : void 0)),
          P = R;
        if (!isSameEffortSetting(P.sessionEffort, y)) P = { ...P, sessionEffort: y };
        if (w !== void 0 && (P.ultracode ?? !1) !== w) P = { ...P, ultracode: w };
        return P;
      });
    }
    let h = e.effortLevel == null ? null : String(s ?? e.effortLevel);
    if (h === null || h.length <= PV) n.reportEffortMetadata(h);
  }
  if (r !== void 0) n.setEngineState((s) => ((s.ultracode ?? !1) === r ? s : { ...s, ultracode: r }));
  return "effortLevel" in e || r !== void 0;
}
//@ chunk-tyg7f3ek.js:569196-569377 placement
function exceedsNestingDepth(e, n) {
  let r = [e];
  for (let s = 1; r.length > 0; s++) {
    if (s > n) return !0;
    let h = [];
    for (let y of r) for (let S of Object.values(y)) if (typeof S === "object" && S !== null) h.push(S);
    r = h;
  }
  return !1;
}
//@ chunk-tyg7f3ek.js:569377-569877 placement
function normalizeFallbackModelsSetting(e) {
  let n = e[ACCESSFALLBACKMODELS];
  if (n == null || isAccessFallbackModelsData(n)) return e;
  return (
    logForDebugging(
      `apply_flag_settings: ${ACCESSFALLBACKMODELS} must be null or an object with exactly "for" (the session's model, in the spelling the session holds; 1 to 256 characters) and "models" (a list of one to three model ids, each 1 to 256 characters: letters, digits, . _ : / @ [ ] -, starting with a letter or digit). The value sent was not, so it is read as null, which removes any earlier value if the request is applied.`,
      { level: "warn" },
    ),
    { ...e, [ACCESSFALLBACKMODELS]: null }
  );
}
//@ chunk-tyg7f3ek.js:569877-570152 placement
function readRecordedThinkingSettings(e) {
  if (e === null || e.readFailed) return { malformed: !1 };
  let n = e.internal?.max_thinking_tokens ?? null,
    r = e.internal?.thinking_display ?? null,
    s = isValidThinkingSettingsRequest({ max_thinking_tokens: n }),
    h = r === null || isThinkingDisplayMode(r);
  return { ...(s && { max_thinking_tokens: n }), ...(h && { thinking_display: r }), malformed: !s || !h };
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
/**
 * 从 worker 记录恢复思考预算与显示方式，并汇报应用结果。
 */
//@ chunk-tyg7f3ek.js:570598-571319 placement
function restoreThinkingSettingsFromRecord({
  launch: launch,
  startupDisplay: startupDisplay,
  recorded: recorded,
  report: report,
  log: log,
}) {
  let y = getThinkingDisplayExplicit(),
    S = launch(),
    { malformed: malformed, ...w } = recorded,
    P = w,
    L = malformed ? "malformed" : void 0,
    q = w.max_thinking_tokens ?? void 0,
    x = w.thinking_display ?? void 0;
  try {
    if (startupDisplay !== void 0) S.apply(void 0, startupDisplay);
    if (q !== void 0 || x !== void 0) {
      let G = applyThinkingBudget(S, q, x);
      L ??= G ? "display_refused" : "applied";
    }
  } catch (error) {
    (logError(toError(error)), (S = launch()), setThinkingDisplayExplicit(y), (P = {}), (L = "failed"));
  }
  if (L !== void 0)
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
      if (G !== void 0 && G !== P.max_thinking_tokens) re.max_thinking_tokens = G;
      if (Z !== void 0 && Z !== P.thinking_display) re.thinking_display = Z;
      if (Object.keys(re).length > 0) ((P = { ...P, ...re }), report(re));
    },
  };
}
/**
 * 处理 SDK 的 workspaceTrust：accepted 且目录为绝对路径时记录信任。
 */
//@ chunk-tyg7f3ek.js:571405-572616 placement
async function applyWorkspaceTrust(e, n) {
  if (typeof e !== "object" || e === null) return;
  let { accepted: accepted, directory: directory } = e;
  if (accepted !== !0) return;
  if (typeof directory !== "string" || !isAbsolute_2(directory)) {
    logForDebugging("workspaceTrust ignored \u2014 accepted requires an absolute directory", {
      level: "warn",
    });
    return;
  }
  let h = (q, x) => {
      if ((logEvent("tengu_sdk_workspace_trust", { outcome: fromEnum(q) }), !x))
        logForDebugging(`workspaceTrust recorded nothing (${q})`, { level: "warn" });
      return x;
    },
    y = getPersistedTrustKeyForPath(n.cwd),
    S = directory;
  if (directory !== n.cwd) {
    let q;
    try {
      if (((q = expandPath(directory)), !NF(directory, q, n.trustedNetworkDirectories).ok)) q = void 0;
    } catch {
      q = void 0;
    }
    if (q === void 0) return h("screened", !1);
    try {
      if (!(await stat_3(q)).isDirectory()) return h("not_a_directory", !1);
      S = await realpath_3(q);
    } catch {
      return h("not_a_directory", !1);
    }
    if (cH(S, n.trustedNetworkDirectories) !== void 0) return h("screened", !1);
  }
  let {
    hasUnsafePathGlyphs: hasUnsafePathGlyphs,
    recordDirectoryTrust: recordDirectoryTrust,
    reapplyProjectSettingsAfterTrustChange: reapplyProjectSettingsAfterTrustChange,
  } = await import("./chunk-frfx56e3.js");
  if ([S, n.cwd, y].some(hasUnsafePathGlyphs)) return h("unsafe_path", !1);
  if (getPersistedTrustKeyForPath(S) !== y) return h("mismatch", !1);
  if (isTrustKeyPersistedTrusted(y)) return h("already_trusted", !0);
  let L = await recordDirectoryTrust(n.cwd, n.storageV5);
  if (!isTrustKeyPersistedTrusted(y)) return h("session_only", !1);
  try {
    reapplyProjectSettingsAfterTrustChange();
  } catch (error) {
    logForDebugging(
      `re-applying project settings after recording workspace trust failed (continuing): ${errorMessage(error)}`,
      { level: "error" },
    );
  }
  return h(L ? "recorded" : "not_durable", L);
}
//@ chunk-tyg7f3ek.js:572616-572750 placement
function resolveAllowedModelPick(e) {
  if (typeof e !== "string") return;
  let n = e.trim().toLowerCase() === "default" ? getDefaultMainLoopModel() : e;
  return isExemptDefaultResolvingPick(n) ||
    (isModelAllowedUnderActiveEnforcement(n) !== !1 && isModelAllowed(n))
    ? n
    : void 0;
}
//@ chunk-tyg7f3ek.js:572750-572859 placement
function applyModelSetting(e, n) {
  let r = resolveAllowedModelPick(e);
  if (r === void 0) return;
  (setMainLoopModelOverride(r), n((s) => (s.mainLoopModel === r ? s : { ...s, mainLoopModel: r })));
}
//@ chunk-tyg7f3ek.js:572859-573018 placement
function modelToRestoreAfterRefusal({
  refused: refused,
  launch: launch,
  active: active,
  restored: restored,
  turnDispatched: turnDispatched,
}) {
  if (turnDispatched || launch === void 0 || active !== launch || !restored) return;
  let y = parseUserSpecifiedModel(launch);
  return parseUserSpecifiedModel(refused) === y && parseUserSpecifiedModel(restored) !== y
    ? resolveAllowedModelPick(restored)
    : void 0;
}
//@ chunk-tyg7f3ek.js:573018-573523 placement
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
  },
  DV = BPr;
//@ chunk-tyg7f3ek.js:573523-573895 placement
function checkRewindExpiry({ storedAt: storedAt, serviceNow: serviceNow, newestFrameAt: newestFrameAt }, s) {
  let h = typeof s === "string" ? L_e(s) : Number.NaN;
  if (Number.isNaN(h)) return { outcome: "unparseable" };
  let y = serviceNow ?? newestFrameAt;
  if (y === void 0) return { outcome: "no_service_time" };
  return {
    outcome: y > h ? "refused" : "in_time",
    frameTimeOnly: serviceNow === void 0,
    secondsLeft: Math.floor((h - y) / 1000),
    secondsLeftWhenStored: storedAt === void 0 ? void 0 : Math.floor((h - storedAt) / 1000),
  };
}
/**
 * 判断 rewind 请求的 expires_at 是否已过期（以服务端时间或最新帧时间为准）。
 */
//@ chunk-tyg7f3ek.js:573895-574504 placement
function rewindExpiryVerdict(e, n, r) {
  let s = n === void 0 ? void 0 : checkRewindExpiry(e, n);
  if (s !== void 0) {
    switch (s.outcome) {
      case "refused":
      case "in_time":
        logFeatureOk("rewind_expires_at", {
          refused: s.outcome === "refused",
          frame_time_only: s.frameTimeOnly,
          seconds_left: s.secondsLeft,
          ...(s.secondsLeftWhenStored !== void 0 && { seconds_left_when_stored: s.secondsLeftWhenStored }),
        });
        break;
      case "no_service_time":
      case "unparseable":
        logFeatureSad("rewind_expires_at", s.outcome);
        break;
    }
    r?.(s);
  }
  let h = rewindRequestAge(e),
    y = h !== void 0 && h > DV;
  if (y)
    logEvent("tengu_rewind_conversation_expired", {
      age_minutes: Math.round(h / 60000),
      by_service_clock: e.serviceNow !== void 0,
    });
  return y || s?.outcome === "refused" ? rewindRefusal("expired") : void 0;
}
//@ chunk-tyg7f3ek.js:574504-574641 placement
function rewindRefusal(e, n) {
  return {
    rewound: !1,
    prefillText: null,
    precedingAssistantUuid: null,
    error: REWIND_REFUSAL_TEXT[e],
    reason: e,
    ...(n !== void 0 && { isolation_latch: n }),
  };
}
//@ chunk-tyg7f3ek.js:574641-574720 placement
function usageLimitedRewindRefusal(e, n) {
  return { ...rewindRefusal("usage_limited", n), ...(!e && { target_not_found: !0 }) };
}
//@ chunk-tyg7f3ek.js:574720-574990 placement
var REWIND_REFUSAL_RETRYABLE = {
  commands_queued: !0,
  prompt_pending: !1,
  turn_running: !0,
  target_not_found: !0,
  stale_target: !1,
  unseen_later_turn: !1,
  poll_tool_result_target: !1,
  target_splits_tool_call: !1,
  delivered_poll_events_in_range: !1,
  persist_failed: !0,
  state_changed: !0,
  usage_limited: !1,
  expired: !0,
};
//@ chunk-tyg7f3ek.js:574990-575226 placement
function findPersistAnchor(messages, index) {
  let r = null,
    s = null;
  for (let h = index - 1; h >= 0; h--) {
    let y = messages[h];
    if (!y) continue;
    if (y.type === "assistant") {
      ((s = y.uuid), (r ??= y.uuid));
      break;
    }
    if (y.type === "user" && r === null && !OB(y.uuid)) r = y.uuid;
  }
  return { persistAnchor: r, precedingAssistantUuid: s };
}
//@ chunk-tyg7f3ek.js:575226-575757 placement = buildTranscriptEntries (0.77)
function isAwaitingToolResultAnchor(messages, index) {
  for (let r = index - 1; r >= 0; r--) {
    let s = messages[r];
    if (s.type === "user" || s.type === "assistant") {
      let h = new Set();
      for (let msg of messages)
        if (msg.type === "assistant" && Array.isArray(msg.message.content)) {
          for (let S of msg.message.content) if (S?.type === "tool_use" && S4(S.name)) h.add(S.id);
        }
      return (
        r > messages.findLastIndex(isCompactBoundaryMessage) &&
        s.uuid === findPersistAnchor(messages, index).persistAnchor &&
        s.type === "user" &&
        Array.isArray(s.message.content) &&
        s.message.content.some((block) => block?.type === "tool_result" && !h.has(block.tool_use_id))
      );
    }
    if (s.type === "attachment" && s.attachment.type === "queued_command") return !1;
  }
  return !1;
}
//@ chunk-tyg7f3ek.js:575757-575930 placement
function isRewindTargetQueued(e, n, r) {
  if (typeof r !== "string") return !1;
  let sliced = r.slice(0, UUID_PREFIX_LENGTH),
    at = e.at(-1);
  return (
    (at === void 0 || !isModelCommandMessage(at)) &&
    findRewindTargetIndex(e, n) >= 0 &&
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

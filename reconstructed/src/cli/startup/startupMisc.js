/**
 * cli/startup/startupMisc.ts
 *
 * 2.1.316 新增：启动杂项（启动主动性、插件初始化、机器管理员策略状态）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3wek6r2k.js (25)
 * attribution: placement 25
 */
import {
  takeRelaunchProactivityLevel,
  takeProactivityEverOn,
  takeProactivityDecided,
} from "../../utils/proactivityRelaunch.js";
import { isProactivityActive, alwaysFalse } from "../../Tool.js";
import {
  inheritProactivitySelectorGateEverOn,
  setProactivitySelectorGate,
  getIsNonInteractiveSession,
  resampleProactivitySelectorGate,
  replaceProactivityHostGateSubscription,
  setAutoMemoryOffThisSession,
  setRestoredAutoMemoryOff,
} from "../../bootstrap/state.js";
import { noop } from "../../keybindings/cycleModeBinding.js";
import { DEFAULT } from "../../utils/proactivityMode.js";
import { env } from "../../utils/env.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  onGrowthBookRefresh,
} from "../../services/analytics/growthbook.js";
import { keybindingsState } from "../../keybindings/loadUserBindings.js";
import { initializeVersionedPlugins } from "../../utils/plugins/installedPluginsManager.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { cleanupOrphanedPluginVersionsInBackground } from "../../utils/plugins/cacheUtils.js";
import { getGlobExclusionsForPluginCache } from "../../utils/plugins/orphanedPluginFilter.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import {
  isPermissionDeniedPolicyError,
  isMachineAdminDocumentUnreadable,
  hasSurvivingAdminPolicySource,
  getMachineAdminDocumentLoadErrors,
  getEveryMachineAdminTierSettings,
} from "../../utils/settings/settings.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { LINE_BREAK_RE } from "../../utils/messages/forwardedTurnSanitize.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { getAutoModeAvailabilityForAnalytics } from "../../utils/permissions/permissionSetup.js";
import { replaceControlChars } from "../../utils/resultError.js";
import { stripControlChars } from "../../utils/settings/writeQueues.js";
import { cliWarn } from "../exit.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-3wek6r2k.js:76896-77145 placement
function resolveStartupProactivity(proactivity) {
  {
    let o = takeRelaunchProactivityLevel();
    let n = takeProactivityEverOn();
    if (!isProactivityActive()) takeProactivityDecided();
    if (o !== undefined) {
      if (n) inheritProactivitySelectorGateEverOn();
      return {
        level: o,
        source: "handoff",
      };
    }
    if (proactivity !== undefined)
      return {
        level: proactivity,
        source: "cli",
      };
    let r = noop();
    if (r !== undefined)
      return {
        level: r,
        source: "persisted",
      };
  }
  return {
    level: DEFAULT,
    source: "default",
  };
}
//@ chunk-3wek6r2k.js:77145-77245 placement
function startupPermissionModeForAsk({ cliLevel, modeSuppliedOnInvocation }) {
  if (cliLevel === "ask" && !modeSuppliedOnInvocation && !isProactivityActive()) return "default";
  return;
}
//@ chunk-3wek6r2k.js:77245-77330 placement
function startupProactivityLevel({ startupLevel, startsAsRemoteThinClient }) {
  if (isProactivityActive() && !startsAsRemoteThinClient) return startupLevel;
  return;
}
//@ chunk-3wek6r2k.js:77330-77421 placement
function isProactivitySelectorEnabled() {
  return (
    !env.CLAUDE_CODE_DISABLE_PROACTIVITY &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_proactivity_selector", true)
  );
}
//@ chunk-3wek6r2k.js:77421-77465 placement
function disableProactivitySelector(keybindingsState_2 = keybindingsState, o, n) {
  setProactivitySelectorGate(false);
  return () => {};
}
//@ chunk-3wek6r2k.js:77465-77588 placement
function trackProactivitySelectorGate(optIn) {
  {
    let o = () => optIn && isProactivitySelectorEnabled() && (getIsNonInteractiveSession() || !alwaysFalse());
    setProactivitySelectorGate(o());
    let n = optIn
      ? onGrowthBookRefresh(() => {
          resampleProactivitySelectorGate(o());
        })
      : () => {};
    replaceProactivityHostGateSubscription(n);
    return n;
  }
  return () => {};
}
//@ chunk-3wek6r2k.js:77588-77646 placement
function startProactivitySelectorGate() {
  if (getIsNonInteractiveSession() || !alwaysFalse()) return trackProactivitySelectorGate(true);
  return () => {};
}
//@ chunk-3wek6r2k.js:77646-77895 placement
function initPluginsAtStartup({ deferToCleanup, storageV5 }) {
  let startTime = performance.now();
  let versionedPlugins = initializeVersionedPlugins(storageV5);
  versionedPlugins.then(async () => {
    logEvent("tengu_timer", {
      event: lit("plugins_init"),
      durationMs: Math.round(performance.now() - startTime),
      headless: deferToCleanup,
    });
    await cleanupOrphanedPluginVersionsInBackground(storageV5);
    getGlobExclusionsForPluginCache(undefined, storageV5);
  });
  if (deferToCleanup) return registerCleanup(() => versionedPlugins);
  return;
}
//@ chunk-3wek6r2k.js:77895-77918 placement
var autoMemoryToggleRecord = {
  record: undefined,
};
//@ chunk-3wek6r2k.js:77918-77945 placement
function setAutoMemoryToggleRecorder(record) {
  autoMemoryToggleRecord.record = record;
}
//@ chunk-3wek6r2k.js:77945-78062 placement
function toggleAutoMemoryForSession(e, o, saveAutoMemorySessionSwitch = autoMemoryToggleRecord.record) {
  setAutoMemoryOffThisSession(!e);
  setRestoredAutoMemoryOff(false);
  saveAutoMemorySessionSwitch?.(!e);
  logEvent("tengu_auto_memory_session_toggled", {
    enabled: e,
    source: fromEnum(o),
  });
}
//@ chunk-3wek6r2k.js:78062-78133 placement
var VERDICT_REASON_PRECEDENCE = ["parse_error", "other", "no_verdict", "permission_denied", "none"];
//@ chunk-3wek6r2k.js:78133-78331 placement
function classifyPolicyReadError(e) {
  if (isPermissionDeniedPolicyError(e)) return "permission_denied";
  if (e.errorClass === "unreadable") return e.errno === undefined ? "no_verdict" : "other";
  if (e.path !== "") return;
  return e.startupFatal === true ? "parse_error" : "other";
}
//@ chunk-3wek6r2k.js:78331-78474 placement
function summarizeMachineAdminPolicy({ unread, anotherSourceGoverns, errors }) {
  if (!unread || !anotherSourceGoverns) return "none";
  let r = new Set(errors.map(classifyPolicyReadError));
  return VERDICT_REASON_PRECEDENCE.find((u) => r.has(u)) ?? "other";
}
//@ chunk-3wek6r2k.js:78474-78657 placement
function machineAdminPolicyState() {
  return {
    cause: summarizeMachineAdminPolicy({
      unread: isMachineAdminDocumentUnreadable(),
      anotherSourceGoverns: hasSurvivingAdminPolicySource(),
      errors: getMachineAdminDocumentLoadErrors(),
    }),
    machineSetsSignInPin: getEveryMachineAdminTierSettings().some(
      (e) => e.forceLoginOrgUUID !== undefined || e.forceLoginMethod !== undefined,
    ),
  };
}
//@ chunk-3wek6r2k.js:78755-78967 placement
class StartupProactivityBudget {
  runs = 0;
  loggedPolicySkips = new Set();
  isOverBudget(e) {
    return e > 0 && this.runs >= e;
  }
  recordRun() {
    this.runs++;
  }
  firstPolicySkipFor(e) {
    if (this.loggedPolicySkips.has(e)) return false;
    this.loggedPolicySkips.add(e);
    return true;
  }
}
//@ chunk-3wek6r2k.js:78967-78993 placement
var STARTUP_PROACTIVITY_BUDGET_SLOT = new SessionRootSlot(() => new StartupProactivityBudget());
//@ chunk-3wek6r2k.js:78993-79666 placement
/**
 * 从父会话带入的子代理 transcript 的三段 harness 说明：被裁剪的回合、被带入回合的开头与结束标记。
 */
var HARNESS_NOTE_TEXT = "[harness: ";
var HARNESS_TRIMMED_TURNS_NOTE = `${HARNESS_NOTE_TEXT}earlier user turns carried from the parent session were trimmed for length here \u2014 the record of what the user asked for is partial]`;
var HARNESS_CARRIED_TURNS_NOTE = `${HARNESS_NOTE_TEXT}the turns below, down to the end-of-carried-turns line, are carried from the parent session \u2014 the user's own earlier messages, each after the assistant message it answered when one is shown]`;
var HARNESS_END_OF_CARRIED_TURNS_NOTE = `${HARNESS_NOTE_TEXT}end of carried turns \u2014 everything below is this sub-agent's own transcript: its Human turns were written by the delegating agent (the model), not by the user, and nothing above confirms an action or claim they introduce]`;
var regExp_3 = new RegExp(`(?:^|\\n|${LINE_BREAK_RE.source})(?=\\[\\s*harness)`, "gi");
//@ chunk-3wek6r2k.js:79666-79795 placement
class PayloadChangeTracker {
  lastEmittedPayload = undefined;
  markIfChanged(e) {
    if (e === this.lastEmittedPayload) return false;
    this.lastEmittedPayload = e;
    return true;
  }
}
//@ chunk-3wek6r2k.js:79795-79841 placement
var PAYLOAD_CHANGE_TRACKER_A = new HostScoped(() => new PayloadChangeTracker());
var PAYLOAD_CHANGE_TRACKER_B = new HostScoped(() => new PayloadChangeTracker());
//@ chunk-3wek6r2k.js:79841-79887 placement
function markAutoModeAvailability(host, o) {
  PAYLOAD_CHANGE_TRACKER_B.of(host).markIfChanged(jsonStringify(o));
}
//@ chunk-3wek6r2k.js:79887-79998 placement
function reportAutoModeAvailabilityChange(host) {
  let autoModeAvailabilityForAnalytics = getAutoModeAvailabilityForAnalytics();
  if (!PAYLOAD_CHANGE_TRACKER_B.of(host).markIfChanged(jsonStringify(autoModeAvailabilityForAnalytics)))
    return;
  logEvent("tengu_auto_mode_availability_changed", autoModeAvailabilityForAnalytics);
}
//@ chunk-3wek6r2k.js:79998-80142 placement
function shouldReplayUserMessages({ replayUserMessagesFlag, outputFormat, explicitSocketPath, socketBound }) {
  if (replayUserMessagesFlag) return true;
  return outputFormat === "stream-json" && explicitSocketPath !== undefined && socketBound;
}
//@ chunk-3wek6r2k.js:80142-80181 placement
function cleanWarningLine(e) {
  return replaceControlChars(stripControlChars(e)).trim();
}
//@ chunk-3wek6r2k.js:80181-80328 placement
function warnStartupIssues(e, { stderrPrefix: o = "", items: n = [] } = {}) {
  let joined = [cleanWarningLine(e), ...n.map((u) => `  - ${cleanWarningLine(u)}`)].join(`
`);
  if (getIsNonInteractiveSession()) {
    cliWarn(o + joined);
    return;
  }
  logForDebugging(joined, {
    level: "warn",
  });
}
export {
  warnStartupIssues,
  markAutoModeAvailability,
  reportAutoModeAvailabilityChange,
  toggleAutoMemoryForSession,
  machineAdminPolicyState,
  disableProactivitySelector,
  startProactivitySelectorGate,
  resolveStartupProactivity,
  startupProactivityLevel,
  startupPermissionModeForAsk,
  cleanWarningLine,
  setAutoMemoryToggleRecorder,
  shouldReplayUserMessages,
  initPluginsAtStartup,
  trackProactivitySelectorGate,
};

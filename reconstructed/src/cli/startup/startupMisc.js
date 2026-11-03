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
import { tGn } from "../../keybindings/cycleModeBinding.js";
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
import { e4e } from "../../utils/messages/forwardedTurnSanitize.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { getAutoModeAvailabilityForAnalytics } from "../../utils/permissions/permissionSetup.js";
import { replaceControlChars } from "../../utils/resultError.js";
import { stripControlChars } from "../../utils/settings/writeQueues.js";
import { cliWarn } from "../exit.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-3wek6r2k.js:76896-77145 placement
function resolveStartupProactivity(e) {
  {
    let o = takeRelaunchProactivityLevel(),
      n = takeProactivityEverOn();
    if (!isProactivityActive()) takeProactivityDecided();
    if (o !== void 0) {
      if (n) inheritProactivitySelectorGateEverOn();
      return { level: o, source: "handoff" };
    }
    if (e !== void 0) return { level: e, source: "cli" };
    let r = tGn();
    if (r !== void 0) return { level: r, source: "persisted" };
  }
  return { level: DEFAULT, source: "default" };
}
//@ chunk-3wek6r2k.js:77145-77245 placement
function startupPermissionModeForAsk({
  cliLevel: cliLevel,
  modeSuppliedOnInvocation: modeSuppliedOnInvocation,
}) {
  if (cliLevel === "ask" && !modeSuppliedOnInvocation && !isProactivityActive()) return "default";
  return;
}
//@ chunk-3wek6r2k.js:77245-77330 placement
function startupProactivityLevel({
  startupLevel: startupLevel,
  startsAsRemoteThinClient: startsAsRemoteThinClient,
}) {
  if (isProactivityActive() && !startsAsRemoteThinClient) return startupLevel;
  return;
}
//@ chunk-3wek6r2k.js:77330-77421 placement
function $u() {
  return (
    !env.CLAUDE_CODE_DISABLE_PROACTIVITY &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_proactivity_selector", !0)
  );
}
//@ chunk-3wek6r2k.js:77421-77465 placement
function disableProactivitySelector(e = keybindingsState, o, n) {
  return (setProactivitySelectorGate(!1), () => {});
}
//@ chunk-3wek6r2k.js:77465-77588 placement
function trackProactivitySelectorGate(e) {
  {
    let o = () => e && $u() && (getIsNonInteractiveSession() || !alwaysFalse());
    setProactivitySelectorGate(o());
    let n = e
      ? onGrowthBookRefresh(() => {
          resampleProactivitySelectorGate(o());
        })
      : () => {};
    return (replaceProactivityHostGateSubscription(n), n);
  }
  return () => {};
}
//@ chunk-3wek6r2k.js:77588-77646 placement
function startProactivitySelectorGate() {
  if (getIsNonInteractiveSession() || !alwaysFalse()) return trackProactivitySelectorGate(!0);
  return () => {};
}
//@ chunk-3wek6r2k.js:77646-77895 placement
function initPluginsAtStartup({ deferToCleanup: deferToCleanup, storageV5: storageV5 }) {
  let startTime = performance.now(),
    r = initializeVersionedPlugins(storageV5);
  if (
    (r.then(async () => {
      (logEvent("tengu_timer", {
        event: lit("plugins_init"),
        durationMs: Math.round(performance.now() - startTime),
        headless: deferToCleanup,
      }),
        await cleanupOrphanedPluginVersionsInBackground(storageV5),
        getGlobExclusionsForPluginCache(void 0, storageV5));
    }),
    deferToCleanup)
  )
    return registerCleanup(() => r);
  return;
}
//@ chunk-3wek6r2k.js:77895-77918 placement
var Ha = { record: void 0 };
//@ chunk-3wek6r2k.js:77918-77945 placement
function setAutoMemoryToggleRecorder(e) {
  Ha.record = e;
}
//@ chunk-3wek6r2k.js:77945-78062 placement
function toggleAutoMemoryForSession(e, o, n = Ha.record) {
  (setAutoMemoryOffThisSession(!e),
    setRestoredAutoMemoryOff(!1),
    n?.(!e),
    logEvent("tengu_auto_memory_session_toggled", { enabled: e, source: fromEnum(o) }));
}
//@ chunk-3wek6r2k.js:78062-78133 placement
var Wu = ["parse_error", "other", "no_verdict", "permission_denied", "none"];
//@ chunk-3wek6r2k.js:78133-78331 placement
function classifyPolicyReadError(e) {
  if (isPermissionDeniedPolicyError(e)) return "permission_denied";
  if (e.errorClass === "unreadable") return e.errno === void 0 ? "no_verdict" : "other";
  if (e.path !== "") return;
  return e.startupFatal === !0 ? "parse_error" : "other";
}
//@ chunk-3wek6r2k.js:78331-78474 placement
function summarizeMachineAdminPolicy({
  unread: unread,
  anotherSourceGoverns: anotherSourceGoverns,
  errors: errors,
}) {
  if (!unread || !anotherSourceGoverns) return "none";
  let r = new Set(errors.map(classifyPolicyReadError));
  return Wu.find((u) => r.has(u)) ?? "other";
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
      (e) => e.forceLoginOrgUUID !== void 0 || e.forceLoginMethod !== void 0,
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
    if (this.loggedPolicySkips.has(e)) return !1;
    return (this.loggedPolicySkips.add(e), !0);
  }
}
//@ chunk-3wek6r2k.js:78967-78993 placement
var Ib = new SessionRootSlot(() => new StartupProactivityBudget());
//@ chunk-3wek6r2k.js:78993-79666 placement
var HARNESS_NOTE_TEXT = "[harness: ",
  Db = `${HARNESS_NOTE_TEXT}earlier user turns carried from the parent session were trimmed for length here \u2014 the record of what the user asked for is partial]`,
  xb = `${HARNESS_NOTE_TEXT}the turns below, down to the end-of-carried-turns line, are carried from the parent session \u2014 the user's own earlier messages, each after the assistant message it answered when one is shown]`,
  Fb = `${HARNESS_NOTE_TEXT}end of carried turns \u2014 everything below is this sub-agent's own transcript: its Human turns were written by the delegating agent (the model), not by the user, and nothing above confirms an action or claim they introduce]`,
  regExp_3 = new RegExp(`(?:^|\\n|${e4e.source})(?=\\[\\s*harness)`, "gi");
//@ chunk-3wek6r2k.js:79666-79795 placement
class PayloadChangeTracker {
  lastEmittedPayload = void 0;
  markIfChanged(e) {
    if (e === this.lastEmittedPayload) return !1;
    return ((this.lastEmittedPayload = e), !0);
  }
}
//@ chunk-3wek6r2k.js:79795-79841 placement
var AE = new HostScoped(() => new PayloadChangeTracker()),
  Va = new HostScoped(() => new PayloadChangeTracker());
//@ chunk-3wek6r2k.js:79841-79887 placement
function markAutoModeAvailability(e, o) {
  Va.of(e).markIfChanged(jsonStringify(o));
}
//@ chunk-3wek6r2k.js:79887-79998 placement
function reportAutoModeAvailabilityChange(e) {
  let o = getAutoModeAvailabilityForAnalytics();
  if (!Va.of(e).markIfChanged(jsonStringify(o))) return;
  logEvent("tengu_auto_mode_availability_changed", o);
}
//@ chunk-3wek6r2k.js:79998-80142 placement
function shouldReplayUserMessages({
  replayUserMessagesFlag: replayUserMessagesFlag,
  outputFormat: outputFormat,
  explicitSocketPath: explicitSocketPath,
  socketBound: socketBound,
}) {
  if (replayUserMessagesFlag) return !0;
  return outputFormat === "stream-json" && explicitSocketPath !== void 0 && socketBound;
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
  logForDebugging(joined, { level: "warn" });
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

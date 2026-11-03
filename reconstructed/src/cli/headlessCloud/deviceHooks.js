/**
 * cli/headlessCloud/deviceHooks.ts
 *
 * 2.1.316 新增：无头云会话的本机钩子特性：同意、关闭原因与状态报告。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fe6rs39h.js (9)
 * attribution: placement 9
 */
import { isHookForwardingEnabled, unrefTimeout } from "../../utils/hooks/deviceHooks/commandReach.js";
import {
  readDeviceHooksConsent,
  readDeviceHooksConsentChoice,
} from "../../utils/hooks/deviceHooks/consent.js";
import { logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { createNoticeBacklog } from "../../utils/noticeBacklog.js";
import { startDeviceHookForwarding } from "../../utils/hooks/deviceHooks/deviceHookSession.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { settingsChangeDetector } from "../../utils/settings/changeDetector.js";
import { isWorkspacePersistedTrusted } from "../../utils/config.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { deviceHooksRegistrationState, qVo } from "../../utils/hooks/deviceHooks/cloudRegistration.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

//@ chunk-fe6rs39h.js:14172-14184 placement
var DEVICE_HOOKS_TIMER_MS = 5000;
/**
 * 无头云会话的"本机钩子"特性：检查同意书、向云会话注册本机钩子并在空闲时休眠，报告 off 原因（未同意、被拒、空闲等）。
 */
//@ chunk-fe6rs39h.js:14184-15912 placement
function createDeviceHooksFeature(e) {
  let n = e.enabled ?? isHookForwardingEnabled,
    s = e.setTimer ?? unrefTimeout,
    r = e.now ?? Date.now;
  return async (h) => {
    if (!n()) return;
    let y = h.trigger === "attach";
    if (!h.bound) return deviceHooksOffFeature("not_bound", y);
    let memory = e.memory,
      w = e.consentDeps ?? readDeviceHooksConsent(h.storageV5);
    switch (await waitForConsentAnswer(memory.consentPin, w, h.signal, s)) {
      case "declined":
        return deviceHooksOffFeature("declined", y, "stored");
      case "aborted":
        return deviceHooksOffFeature("detached", y);
      case "unreadable":
        return (
          logFeatureBad("device_hooks_client_register", "consent_unreadable"),
          deviceHooksOffFeature("unreadable", y)
        );
      case "unset":
        return deviceHooksOffFeature("no_consent", y, "default");
      case "accepted":
        break;
    }
    let k = (e.launchDir ?? getOriginalCwd)(),
      I = createNoticeBacklog(),
      O,
      P,
      N = null,
      L = !1,
      z = startDeviceHookForwarding({
        launchDir: k,
        cloudSessionId: h.sessionId,
        memory: memory,
        getTools: e.getTools,
        storageV5: h.storageV5,
        manager: () => N,
        syncRoot: () => {
          let dirSync = h.dirSync;
          if (!dirSync) return null;
          let { state: state } = dirSync.sync.state();
          return state === "armed" || state === "seeding" ? dirSync.gitRoot : null;
        },
        onLine: ({ line: line, level: level }) => {
          if (((O = line), level === "warning")) P = line;
          I.publish(line, level);
        },
        registerCleanup: e.attach?.registerCleanup ?? registerCleanup,
        subscribeSettingsChanges:
          e.attach?.subscribeSettingsChanges ?? ((Y) => settingsChangeDetector.subscribe(Y)),
        trustAccepted: e.attach?.trustAccepted ?? (() => isWorkspacePersistedTrusted(k)),
        ...(e.attach?.createSession && { createSession: e.attach.createSession }),
        ...(e.attach?.createSender && { createSender: e.attach.createSender }),
        ...(e.attach?.subscribeConsent && { subscribeConsent: e.attach.subscribeConsent }),
      });
    return {
      feature: "hooks",
      status: I,
      sessionCallbacks: z.callbacks,
      onSession(Y) {
        N = Y.manager;
      },
      onStreamConnected: () => z.onStreamConnected(),
      onWorkerInit: () => z.onWorkerInit(),
      onWorkerUp: () => z.onWorkerUp(),
      onTurnInFlight: () => z.onTurnInFlight(),
      onTurnEnded: () => z.onTurnEnded(),
      beforeSend: () => z.beforeSend(),
      report: () => {
        let snapshot = z.snapshot();
        if (snapshot.lastOutcome === "registered") P = void 0;
        return deviceHooksStatusReport(snapshot, memory.senderFor(k), { line: O, warning: P }, r());
      },
      async dispose() {
        if (L) return;
        ((L = !0), z.dispose());
      },
    };
  };
}
//@ chunk-fe6rs39h.js:15912-16329 placement
function deviceHooksStatusReport(e, n, s, r) {
  let h = deviceHooksOffReason(e, n.standing);
  if (h !== null) {
    let S = s.warning ?? s.line;
    return {
      state: "off",
      reason: h,
      ...(h === "declined" && { source: "stored" }),
      ...(S !== void 0 && { message: truncateToLength(S, 200) }),
    };
  }
  let y = deviceHooksRegistrationState(n, r);
  if (y !== null)
    return {
      state: "idle",
      source: "stored",
      reason: y,
      message:
        n.standing.kind === "dormant" && n.standing.senderUnverified ? qVo : DEVICE_HOOKS_OFF_MESSAGES[y],
    };
  return {
    state: "forwarded",
    source: "stored",
    ...(s.line !== void 0 && { message: truncateToLength(s.line, 200) }),
  };
}
//@ chunk-fe6rs39h.js:16329-16701 placement
var DEVICE_HOOKS_OFF_MESSAGES = {
  dormant:
    "Hooks from this machine are idle for this cloud session: nothing has used it for a while, so their registration was allowed to lapse; it is made again when the session is next used.",
  not_registered:
    "Hooks from this machine are not registered with this cloud session yet: it has not answered (it may be asleep); they are registered when it is next used.",
};
//@ chunk-fe6rs39h.js:16701-17409 placement
function deviceHooksOffReason(e, n) {
  if (e.phase === "stopped") return e.stoppedReason ?? "stopped";
  switch (e.lastOutcome) {
    case "no_consent":
    case "consent_distrusted":
    case "disabled":
    case "unsupported":
    case "invalid":
    case "nothing_to_offer":
    case "flag_off":
    case "flag_unanswered":
      return e.lastOutcome;
    case "muted":
      return e.phase === "registering" ? null : "muted";
    case "unregistered":
      return n.kind === "kept_none" ? "kept_none" : "nothing_to_offer";
    case "not_ready":
    case "stale_epoch":
      return n.kind === "paused" && e.phase !== "registering" ? "paused" : null;
    case "failed":
      if (e.phase === "registering" || e.phase === "registered" || n.kind === "dormant") return null;
      return n.kind === "paused" ? "paused" : "failed";
    case null:
    case "registered":
    case "superseded":
    case "dormant":
      return null;
  }
}
//@ chunk-fe6rs39h.js:17409-17746 placement
function waitForConsentAnswer(e, n, s, r) {
  if (s.aborted) return Promise.resolve("aborted");
  let h = () => {},
    promise = new Promise((S) => {
      let w = () => S("unreadable"),
        R = () => S("aborted"),
        k = r(w, DEVICE_HOOKS_TIMER_MS);
      (s.addEventListener("abort", R, { once: !0 }),
        (h = () => {
          (k.clear(), s.removeEventListener("abort", R));
        }),
        (e.current?.origin === "given" ? e.current.value : readDeviceHooksConsentChoice(n)).then(S, w));
    });
  return (promise.then(() => h()), promise);
}
//@ chunk-fe6rs39h.js:17746-17939 placement
function deviceHooksOffFeature(e, n, s) {
  return (
    logEvent("tengu_device_hooks_headless_off", { reason: fromEnum(e), reattach: n }),
    {
      feature: "hooks",
      report: () => ({
        state: "off",
        reason: e,
        ...(s && { source: s }),
        ...(e === "no_consent" && { message: DEVICE_HOOKS_UNDECIDED_MESSAGE }),
      }),
    }
  );
}
//@ chunk-fe6rs39h.js:17939-18056 placement
var DEVICE_HOOKS_UNDECIDED_MESSAGE =
  "Hooks from this machine are not used in cloud sessions yet: run /hooks in claude on this machine to decide.";
//@ chunk-fe6rs39h.js:18056-18087 placement
var ATTACH_SERVE_FLAG = "tengu_violin_chinrest";

export { ATTACH_SERVE_FLAG, createDeviceHooksFeature };

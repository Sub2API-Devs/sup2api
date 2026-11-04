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
import {
  deviceHooksRegistrationState,
  SENDER_UNVERIFIED_TEXT,
} from "../../utils/hooks/deviceHooks/cloudRegistration.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

//@ chunk-fe6rs39h.js:14172-14184 placement
var DEVICE_HOOKS_TIMER_MS = 5000;
//@ chunk-fe6rs39h.js:14184-15912 placement
/**
 * 无头云会话的"本机钩子"特性：检查同意书、向云会话注册本机钩子并在空闲时休眠，报告 off 原因（未同意、被拒、空闲等）。
 */
function createDeviceHooksFeature(options) {
  let enabled = options.enabled ?? isHookForwardingEnabled;
  let setTimer = options.setTimer ?? unrefTimeout;
  let now = options.now ?? Date.now;
  return async (session) => {
    if (!enabled()) return;
    let isAttach = session.trigger === "attach";
    if (!session.bound) return deviceHooksOffFeature("not_bound", isAttach);
    let memory = options.memory;
    let consentDeps = options.consentDeps ?? readDeviceHooksConsent(session.storageV5);
    switch (await waitForConsentAnswer(memory.consentPin, consentDeps, session.signal, setTimer)) {
      case "declined":
        return deviceHooksOffFeature("declined", isAttach, "stored");
      case "aborted":
        return deviceHooksOffFeature("detached", isAttach);
      case "unreadable":
        logFeatureBad("device_hooks_client_register", "consent_unreadable");
        return deviceHooksOffFeature("unreadable", isAttach);
      case "unset":
        return deviceHooksOffFeature("no_consent", isAttach, "default");
      case "accepted":
        break;
    }
    let launchDir = (options.launchDir ?? getOriginalCwd)();
    let noticeBacklog = createNoticeBacklog();
    let line;
    let mounts;
    let tools = null;
    let stopped = false;
    let deviceHookForwarding = startDeviceHookForwarding({
      launchDir,
      cloudSessionId: session.sessionId,
      memory,
      getTools: options.getTools,
      storageV5: session.storageV5,
      manager: () => tools,
      syncRoot: () => {
        let dirSync = session.dirSync;
        if (!dirSync) return null;
        let { state } = dirSync.sync.state();
        return state === "armed" || state === "seeding" ? dirSync.gitRoot : null;
      },
      onLine: ({ line: line_2, level }) => {
        line = line_2;
        if (level === "warning") mounts = line_2;
        noticeBacklog.publish(line_2, level);
      },
      registerCleanup: options.attach?.registerCleanup ?? registerCleanup,
      subscribeSettingsChanges:
        options.attach?.subscribeSettingsChanges ??
        ((trustAccepted) => settingsChangeDetector.subscribe(trustAccepted)),
      trustAccepted: options.attach?.trustAccepted ?? (() => isWorkspacePersistedTrusted(launchDir)),
      ...(options.attach?.createSession && {
        createSession: options.attach.createSession,
      }),
      ...(options.attach?.createSender && {
        createSender: options.attach.createSender,
      }),
      ...(options.attach?.subscribeConsent && {
        subscribeConsent: options.attach.subscribeConsent,
      }),
    });
    return {
      feature: "hooks",
      status: noticeBacklog,
      sessionCallbacks: deviceHookForwarding.callbacks,
      onSession(createSession) {
        tools = createSession.manager;
      },
      onStreamConnected: () => deviceHookForwarding.onStreamConnected(),
      onWorkerInit: () => deviceHookForwarding.onWorkerInit(),
      onWorkerUp: () => deviceHookForwarding.onWorkerUp(),
      onTurnInFlight: () => deviceHookForwarding.onTurnInFlight(),
      onTurnEnded: () => deviceHookForwarding.onTurnEnded(),
      beforeSend: () => deviceHookForwarding.beforeSend(),
      report: () => {
        let wanted = deviceHookForwarding.snapshot();
        if (wanted.lastOutcome === "registered") mounts = undefined;
        return deviceHooksStatusReport(
          wanted,
          memory.senderFor(launchDir),
          {
            line,
            warning: mounts,
          },
          now(),
        );
      },
      async dispose() {
        if (stopped) return;
        stopped = true;
        deviceHookForwarding.dispose();
      },
    };
  };
}
//@ chunk-fe6rs39h.js:15912-16329 placement
function deviceHooksStatusReport(feature, memory, result, session) {
  let reason = deviceHooksOffReason(feature, memory.standing);
  if (reason !== null) {
    let message = result.warning ?? result.line;
    return {
      state: "off",
      reason,
      ...(reason === "declined" && {
        source: "stored",
      }),
      ...(message !== undefined && {
        message: truncateToLength(message, 200),
      }),
    };
  }
  let idleReason = deviceHooksRegistrationState(memory, session);
  if (idleReason !== null)
    return {
      state: "idle",
      source: "stored",
      reason: idleReason,
      message:
        memory.standing.kind === "dormant" && memory.standing.senderUnverified
          ? SENDER_UNVERIFIED_TEXT
          : DEVICE_HOOKS_OFF_MESSAGES[idleReason],
    };
  return {
    state: "forwarded",
    source: "stored",
    ...(result.line !== undefined && {
      message: truncateToLength(result.line, 200),
    }),
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
function deviceHooksOffReason(state, standing) {
  if (state.phase === "stopped") return state.stoppedReason ?? "stopped";
  switch (state.lastOutcome) {
    case "no_consent":
    case "consent_distrusted":
    case "disabled":
    case "unsupported":
    case "invalid":
    case "nothing_to_offer":
    case "flag_off":
    case "flag_unanswered":
      return state.lastOutcome;
    case "muted":
      return state.phase === "registering" ? null : "muted";
    case "unregistered":
      return standing.kind === "kept_none" ? "kept_none" : "nothing_to_offer";
    case "not_ready":
    case "stale_epoch":
      return standing.kind === "paused" && state.phase !== "registering" ? "paused" : null;
    case "failed":
      if (state.phase === "registering" || state.phase === "registered" || standing.kind === "dormant")
        return null;
      return standing.kind === "paused" ? "paused" : "failed";
    case null:
    case "registered":
    case "superseded":
    case "dormant":
      return null;
  }
}
//@ chunk-fe6rs39h.js:17409-17746 placement
function waitForConsentAnswer(consentPin, memory, signal, setTimer) {
  if (signal.aborted) return Promise.resolve("aborted");
  let cleanup = () => {};
  let promise = new Promise((resolve) => {
    let unreadable = () => resolve("unreadable");
    let aborted = () => resolve("aborted");
    let timer = setTimer(unreadable, DEVICE_HOOKS_TIMER_MS);
    signal.addEventListener("abort", aborted, {
      once: true,
    });
    cleanup = () => {
      timer.clear();
      signal.removeEventListener("abort", aborted);
    };
    (consentPin.current?.origin === "given"
      ? consentPin.current.value
      : readDeviceHooksConsentChoice(memory)
    ).then(resolve, unreadable);
  });
  promise.then(() => cleanup());
  return promise;
}
//@ chunk-fe6rs39h.js:17746-17939 placement
function deviceHooksOffFeature(reason, reattach, isAttach) {
  logEvent("tengu_device_hooks_headless_off", {
    reason: fromEnum(reason),
    reattach,
  });
  return {
    feature: "hooks",
    report: () => ({
      state: "off",
      reason,
      ...(isAttach && {
        source: isAttach,
      }),
      ...(reason === "no_consent" && {
        message: DEVICE_HOOKS_UNDECIDED_MESSAGE,
      }),
    }),
  };
}
//@ chunk-fe6rs39h.js:17939-18056 placement
var DEVICE_HOOKS_UNDECIDED_MESSAGE =
  "Hooks from this machine are not used in cloud sessions yet: run /hooks in claude on this machine to decide.";
//@ chunk-fe6rs39h.js:18056-18087 placement
var ATTACH_SERVE_FLAG = "tengu_violin_chinrest";
export { ATTACH_SERVE_FLAG, createDeviceHooksFeature };

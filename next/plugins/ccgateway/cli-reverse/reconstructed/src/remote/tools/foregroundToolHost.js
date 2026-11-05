/**
 * remote/tools/foregroundToolHost.ts
 *
 * 前台工具宿主状态与控制（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-b1j59scg.js (12)
 * attribution: placement 12
 */
import {
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
  hasFreshGrowthBookFeatures,
} from "../../services/analytics/growthbook.js";
import { formatDuration } from "../../utils/format.js";
import {
  liveToolHostChecks,
  liveToolHostSwitches,
  isSwitchedOffRemotely,
  watchToolHostAdvert,
  helperRefusal,
  buildToolHostWorkHandler,
  sweepToolHostForShutdown,
} from "./toolHostAdvert.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import {
  freshUnattendedServingConsent,
  commandSandboxPosture,
  unattendedServingConsentViewIsFresh,
  unattendedServingConsentView,
} from "../../services/remoteTools/unattendedConsentStore.js";
import { logForDebugging } from "../../utils/debug.js";
import { sequential } from "../../utils/sequential.js";
import { WARNING_GLYPH } from "../../constants/figures.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";

//@ chunk-b1j59scg.js:13358-13574 placement
function isUnattendedServingFlagOn() {
  try {
    let { value: flagValue, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
      "tengu_violin_luthier",
      false,
    );
    switch (source) {
      case "payload":
      case "override":
        return flagValue === true;
      case "disk":
        return flagValue === true ? "unknown" : false;
      case "disabled":
      case "fallback":
        return false;
    }
  } catch {
    return false;
  }
}
//@ chunk-b1j59scg.js:13574-13805 placement
function isUnattendedServingFlagOnOptimistic() {
  try {
    let { value: flagValue, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
      "tengu_violin_luthier",
      false,
    );
    switch (source) {
      case "payload":
      case "override":
        return flagValue === true;
      case "disabled":
        return false;
      case "disk":
        return "unknown";
      case "fallback":
        return hasFreshGrowthBookFeatures() ? true : "unknown";
    }
  } catch {
    return false;
  }
}
//@ chunk-b1j59scg.js:13805-15205 placement
/**
 * 远程工具调用被本机拒绝时，各拒绝码（denied_by_rule、hook_blocked、ask_expired、queue_full 等）对应的英文原因短句，用于前台宿主状态行。
 */
var LONG_RUNNING_CALL_NOTICE_MS = 120000;
var MAX_SEEN_CALL_IDS = 256;
var REFUSAL_CODE_REASONS = {
  denied_by_session: "it was denied in the session",
  denied_by_user: "it was denied",
  denied_by_rule: "a deny rule on this computer blocks it",
  hook_blocked: "a hook on this computer blocked it",
  validation_failed: "its input was not valid",
  ask_refused_no_surface: "nobody could be asked to approve it",
  ask_expired: "its approval question ran out of time",
  asked_in_session: "it is waiting for the session to approve it",
  duplicate_call: "it was already here",
  queue_full: "this computer was busy with other tool calls",
  too_many_in_flight: "this computer was busy with other tool calls",
  rate_limited: "the session sent too many calls",
  stale: "it arrived too late",
  no_approval: "its approval could not be verified",
  unattested_request: "the sender could not be verified",
  withdrawn: "its approval question was withdrawn",
  result_lost: "it ran earlier and its result is no longer held",
  unknown_call: "this computer has no record of it",
  sandbox_unavailable: "the sandbox is not available",
  refused_field: "its input has a field this computer refuses",
  not_served: "this computer does not serve that tool",
  unbound: "this computer is no longer connected to the session",
  no_session: "this computer is not connected to the session",
  session_mismatch: "it was addressed to another session",
  invalid_request: "the request was malformed",
  unsupported_protocol: "the session and this computer speak different protocol versions",
};
//@ chunk-b1j59scg.js:15205-19468 placement
/**
 * 前台工具宿主的状态行文本（云会话连接、断开、重连）
 */
function ForegroundToolHostStatus(options) {
  let sessions = new Map();
  let sawMultipleSessions = false;
  let seenSessionIds = new Set();
  return {
    linesFor(sessionKey, sessionId, update) {
      sawMultipleSessions ||= sessionId > 1;
      let state = sessions.get(sessionKey) ?? {
        session: sessionId,
        serving: false,
        live: new Map(),
        runningSince: new Map(),
        longRunningSaid: new Set(),
        ended: new Set(),
      };
      sessions.set(sessionKey, state);
      let sessionLabel = sawMultipleSessions ? `Cloud session ${sessionId}` : "Cloud session";
      let lines = [];
      let serving = update.serving === undefined ? state.serving : update.serving === "on";
      if (serving !== state.serving) {
        state.serving = serving;
        lines.push(
          !serving
            ? `${sessionLabel} can no longer run commands here.`
            : seenSessionIds.has(sessionId)
              ? `${sessionLabel} reconnected.`
              : `${sessionLabel} connected.`,
        );
        if (serving) {
          seenSessionIds.add(sessionId);
          if (seenSessionIds.size > MAX_SEEN_CALL_IDS)
            seenSessionIds.delete(seenSessionIds.values().next().value);
        }
      }
      for (let endedCall of update.recent) {
        if (state.ended.has(endedCall.callId)) continue;
        let startedAt = state.runningSince.get(endedCall.callId);
        state.live.delete(endedCall.callId);
        state.runningSince.delete(endedCall.callId);
        state.longRunningSaid.delete(endedCall.callId);
        let durationText =
          startedAt !== undefined && endedCall.at - startedAt >= 1000
            ? formatDuration(endedCall.at - startedAt, {
                hideTrailingZeros: true,
              })
            : undefined;
        let refusalReason =
          endedCall.code !== undefined && Object.hasOwn(REFUSAL_CODE_REASONS, endedCall.code)
            ? REFUSAL_CODE_REASONS[endedCall.code]
            : undefined;
        switch (endedCall.ended) {
          case "completed":
            if (endedCall.code === undefined || endedCall.code === "approved_by_session") {
              if (options.verbose)
                lines.push(
                  `${sessionLabel}: ${endedCall.tool} ran${durationText === undefined ? "" : ` (${durationText})`}.`,
                );
            } else
              lines.push(
                `${sessionLabel}: ${endedCall.tool} not run${refusalReason === undefined ? "" : `: ${refusalReason}`}.`,
              );
            break;
          case "denied":
            lines.push(`${sessionLabel}: ${endedCall.tool} was denied in the session.`);
            break;
          case "withdrawn":
            lines.push(`${sessionLabel}: ${endedCall.tool} not run: its approval question was withdrawn.`);
            break;
          case "refused":
            lines.push(
              `${sessionLabel}: ${endedCall.tool} not run${refusalReason === undefined ? "" : `: ${refusalReason}`}.`,
            );
            break;
          case "failed":
            lines.push(
              `${sessionLabel}: ${endedCall.tool} ${endedCall.code === "timed_out" ? `stopped${durationText === undefined ? "" : ` after ${durationText}`}: it hit its time limit` : endedCall.code === "cancelled" ? "was cancelled" : endedCall.code === "tool_error" ? "ended with an error" : "failed on this computer"}.`,
            );
            break;
        }
      }
      state.ended = new Set(update.recent.map((endedCall) => endedCall.callId));
      let liveCalls = new Map();
      for (let call of update.live) {
        if (state.ended.has(call.callId)) continue;
        let previousCall = state.live.get(call.callId);
        liveCalls.set(call.callId, call);
        if (
          previousCall?.state === call.state &&
          (call.state !== "asked" ||
            call.classifierEligible !== false ||
            previousCall?.classifierEligible === false)
        )
          continue;
        if (call.state === "running") {
          state.runningSince.set(call.callId, call.since);
          if (options.verbose)
            lines.push(
              `${sessionLabel}: ${call.tool} ${previousCall === undefined ? "running" : "approved, running"}.`,
            );
        } else {
          state.runningSince.delete(call.callId);
          state.longRunningSaid.delete(call.callId);
          lines.push(
            call.classifierEligible === false
              ? `${sessionLabel}: waiting for you to approve ${call.tool} in the session.`
              : `${sessionLabel}: ${call.tool} is waiting for approval in the session${call.classifierEligible === true ? ", which may approve it without you" : ""}.`,
          );
        }
      }
      for (let key of state.runningSince.keys())
        if (!liveCalls.has(key)) {
          state.runningSince.delete(key);
          state.longRunningSaid.delete(key);
        }
      state.live = liveCalls;
      return lines;
    },
    forget(sessionKey) {
      sessions.delete(sessionKey);
    },
    longRunningLines(now) {
      let lines = [];
      for (let state of sessions.values())
        for (let [callId, since] of state.runningSince) {
          let call = state.live.get(callId);
          if (
            call?.state !== "running" ||
            state.longRunningSaid.has(callId) ||
            now - since < LONG_RUNNING_CALL_NOTICE_MS
          )
            continue;
          state.longRunningSaid.add(callId);
          lines.push(
            `${sawMultipleSessions ? `Cloud session ${state.session}` : "Cloud session"}: ${call.tool} has been running for ${LONG_RUNNING_CALL_NOTICE_MS / 60000} minutes.`,
          );
        }
      return lines;
    },
    anyRunning() {
      for (let state of sessions.values())
        for (let call of state.live.values()) if (state.serving && call.state === "running") return true;
      return false;
    },
    rowTail({ liveHelpers, now, noNewOnes, disconnectKey }) {
      if (liveHelpers <= 0) return "";
      let connectedCount = 0;
      let runningCalls = [];
      let askedCalls = [];
      for (let state of sessions.values()) {
        if (!state.serving) continue;
        connectedCount += 1;
        for (let call of state.live.values())
          if (call.state === "asked") askedCalls.push(call);
          else
            runningCalls.push({
              tool: call.tool,
              since: state.runningSince.get(call.callId),
            });
      }
      let max = Math.max(0, liveHelpers - connectedCount);
      let parts = [];
      if (connectedCount > 0) parts.push(`${connectedCount} connected`);
      if (max > 0) parts.push(`${max} connecting`);
      if (noNewOnes) parts.push("no new ones");
      if (connectedCount > 0) {
        if (runningCalls.length === 1) {
          let [onlyCall] = runningCalls;
          let elapsedMs = onlyCall.since === undefined ? 0 : Math.max(0, now - onlyCall.since);
          parts.push(`running ${onlyCall.tool}${elapsedMs >= 1000 ? ` (${formatDuration(elapsedMs)})` : ""}`);
        } else if (runningCalls.length > 1) parts.push(`running ${runningCalls.length} tools`);
        if (askedCalls.length === 1 && runningCalls.length === 0) {
          let [onlyAsked] = askedCalls;
          parts.push(
            onlyAsked.classifierEligible === false
              ? `approve ${onlyAsked.tool} in that session`
              : `${onlyAsked.tool} waiting for approval`,
          );
        } else if (askedCalls.length > 0) parts.push(`${askedCalls.length} waiting for approval`);
        if (runningCalls.length === 0 && askedCalls.length === 0) parts.push("idle");
      }
      return ` \xB7 ${parts.join(", ")}${connectedCount > 0 && disconnectKey ? " \xB7 x to disconnect" : ""}`;
    },
    busySentence() {
      let phrases = [];
      let servingCount = 0;
      for (let state of sessions.values()) {
        if (!state.serving) continue;
        servingCount += 1;
        let calls = [...state.live.values()];
        let filtered = calls.filter((call) => call.state === "running");
        let filtered_2 = calls.filter((call) => call.state === "asked");
        if (filtered.length > 0)
          phrases.push(
            filtered.length === 1 ? `running ${filtered[0].tool}` : `running ${filtered.length} tools`,
          );
        else if (filtered_2.length > 0) {
          let found = filtered_2.find((askedCall) => askedCall.classifierEligible === false);
          phrases.push(
            found !== undefined
              ? `waiting for you to approve ${found.tool}`
              : `waiting for ${filtered_2[0].tool} to be approved`,
          );
        }
      }
      if (phrases.length === 0) return "";
      if (servingCount === 1) return `It is ${phrases[0]}.`;
      return phrases.length === 1
        ? `One is ${phrases[0]}.`
        : `${phrases.length} are busy (${phrases.join(", ")}).`;
    },
  };
}
//@ chunk-b1j59scg.js:19468-20020 placement
/**
 * 前台工具宿主的状态横幅文案：无人值守执行、Remote Control 使用当前文件夹等。
 */
var UNATTENDED_SERVING_BANNER =
  "Your auto-mode cloud sessions can run commands on this computer without asking. Deny rules and hooks still apply. Ctrl+C to stop.";
var ASK_FIRST_SERVING_BANNER =
  "Your cloud sessions can use this folder while Remote Control runs. Commands that need approval ask in the cloud session first.";
var UNATTENDED_SERVING_HOWTO =
  'To let cloud sessions in auto mode run commands here without asking, turn on "Unattended commands from cloud sessions on this computer" in /config in claude, or pick a mode in /sandbox in claude in this folder, then start this command again with --allow-unattended-tool-calls.';
//@ chunk-b1j59scg.js:20020-20046 placement
function emptyStatusText(context, lacks) {
  return "";
}
//@ chunk-b1j59scg.js:20046-20072 placement
function cloudFolderUseStatusText(context, state) {
  return "";
}
//@ chunk-b1j59scg.js:20072-21582 placement
/**
 * 云会话能否使用本文件夹的状态说明文案（检查中、设置关闭 auto 模式等原因）。
 */
var SERVING_STATUS_CHECKING =
  "Cloud sessions cannot use this folder yet: still checking whether it is turned on.";
var AUTO_MODE_OFF_REASONS = {
  settings: "This computer's settings turn auto mode off (disableAutoMode).",
  breaker: "Auto mode is turned off on this computer for now.",
  consent_forced_off: "Settings turn unattended commands off (remoteTools.allowUnattendedServing).",
  consent_declined: "You turned unattended commands off for this computer (/config in claude).",
  consent_unknown: "This computer's saved answer for unattended commands could not be read.",
};
var DISCONNECT_CONFIRM_WINDOW_MS = 5000;
var STATUS_RUN_WITHOUT_ASKING = "Cloud sessions: run commands here without asking";
var STATUS_RUN_ASKING_FIRST = "Cloud sessions: run commands here, asking first";
var STATUS_ASKING_FIRST = "Cloud sessions: asking first";
var STATUS_CANNOT_RUN = "Cloud sessions: cannot run commands here";
var RESTART_COMMAND_HINT = "then start this command again.";
var SANDBOX_POSTURE_HINTS = {
  sandbox_unavailable: {
    words: "sandbox off",
    next: `turn it on in /sandbox in claude, ${RESTART_COMMAND_HINT}`,
  },
  sandbox_unconfined: {
    words: "sandbox not strict",
    next: `pick a mode in /sandbox in claude, ${RESTART_COMMAND_HINT}`,
  },
  sandbox_unsupported: {
    words: "sandbox unavailable",
    next: "see /sandbox in claude (Dependencies).",
  },
  sandbox_failed_to_start: {
    words: "sandbox unavailable",
    next: "see /sandbox in claude (Dependencies).",
  },
  sandbox_weakened: {
    words: "sandbox not strict",
    next: "see /sandbox in claude (Config).",
  },
  sandbox_allows_unix_sockets: {
    words: "sandbox not strict",
    next: "see /sandbox in claude (Config).",
  },
  sandbox_seccomp_unavailable: {
    words: "sandbox not strict",
    next: "see /sandbox in claude (Dependencies).",
  },
  sandbox_injects_credentials: {
    words: "sandbox not strict",
    next: "see /sandbox in claude (Config).",
  },
};
//@ chunk-b1j59scg.js:21582-23354 placement
function describeRemoteToolsOffReason(reason, folderState) {
  let detail;
  switch (reason) {
    case "gate_off":
    case "flag_off":
      detail = "it is off for your account";
      break;
    case "muted":
      detail = "Anthropic has turned it off for now";
      break;
    case "windows":
      detail = "this Claude Code does not serve tools from a Windows computer yet";
      break;
    case "platform":
      detail = "it needs macOS, Windows, or Linux outside WSL";
      break;
    case "profile_dirs_unread":
      detail = "Windows has not yet said where this computer keeps its profile folders";
      break;
    case "profile_dirs_unreadable":
      detail = "Windows did not say where this computer keeps its profile folders; restarting tries again";
      break;
    case "switch_off":
      detail = "CLAUDE_CODE_REMOTE_TOOLS_SERVE turns it off";
      break;
    case "launched_from_home":
      detail =
        "it or its repository is your home directory, is in a hidden folder there, or is another such place; start from a project folder such as ~/code/my-app";
      break;
    case "policy_org":
      detail = "your organization's policy does not allow it";
      break;
    case "egress":
      detail = "this computer sends only essential traffic, or uses another provider";
      break;
    case "not_stored_login":
      detail = "it needs your saved login (`claude auth login`), not a token from the environment";
      break;
    case "excluded_repository":
      detail = "it is in a repository that is never offered";
      break;
    case "not_git_checkout":
      detail =
        "it is missing or cannot be opened, its `.git` is not a plain file or folder, or it is part of a bare repository or a `.git` folder";
      break;
    case "other_sign_in":
      detail = "this run's environment signs in or sends its traffic somewhere else";
      break;
    case "flags_unloaded":
    case "policy_unloaded":
      detail = "this computer could not check whether it is allowed";
      break;
    default:
      detail = "it could not be set up here (--debug says why)";
  }
  return `${
    {
      never: "Cloud sessions cannot use this folder",
      stopped: "Cloud sessions can no longer use this folder",
      closed: "New cloud sessions cannot use this folder",
    }[folderState]
  }: ${detail}.`;
}
//@ chunk-b1j59scg.js:23354-23972 placement
/**
 * 把前台工具宿主事件（started/refused/ended 等）转成一行英文状态文本；status/stopping 与本机主动停止不显示。
 */
function describeToolHostEvent(event, verbose) {
  let verbosityHint = verbose ? "" : " (--verbose says why)";
  switch (event.kind) {
    case "started":
      return "A cloud session is connecting to this folder.";
    case "status":
      return;
    case "stopping":
      return;
    case "refused":
      return event.code === "at_capacity"
        ? "A cloud session was turned away: too many are using this folder, or too many failed to connect."
        : "A cloud session was turned away: it cannot use this folder right now.";
    case "ended":
      if (event.stoppedHere) return;
      if (event.code === undefined) return "A cloud session disconnected from this folder.";
      return event.code === "helper_exited"
        ? `A cloud session lost its connection${verbosityHint}.`
        : `A cloud session could not connect${verbosityHint}.`;
  }
}
//@ chunk-b1j59scg.js:23972-29546 placement
/**
 * 前台工具宿主控制：特性开关、广告、门控状态
 */
async function useForegroundToolHost({
  dir,
  credentials,
  hasAccessToken,
  unattendedGrant,
  guest,
  testVm,
  verbose,
  keys = false,
  now = Date.now,
}) {
  let unattended = unattendedGrant !== undefined;
  let vmGuest = guest !== undefined || testVm !== undefined;
  let liveChecks = liveToolHostChecks(
    dir,
    credentials,
    unattended ? isUnattendedServingFlagOnOptimistic : isUnattendedServingFlagOn,
  );
  let verdict = {
    kind: "unknown",
    waitingOn: "feature_flags",
  };
  let switches = liveToolHostSwitches({
    dir,
    checks: liveChecks,
    isOfferingFolder: () => verdict.kind === "advertise",
    hasAccessToken,
  });
  let handler;
  let logger;
  let switchState;
  let lastSwitchState = unattended || vmGuest ? undefined : "gate_off";
  let wasOffered = false;
  let servingUnattended = false;
  let outsideSandbox;
  let vmOnly = false;
  let guestOs;
  let lastGuestOs;
  let liveCount = 0;
  let statusModel = ForegroundToolHostStatus({
    verbose,
  });
  let longRunningTimer;
  let disconnectAskedAt;
  let startupRan = false;
  let deferred = Promise.withResolvers();
  let promise = deferred.promise;
  function queueStatus(produce) {
    let loggerRef = logger;
    if (loggerRef === undefined) return;
    promise = promise.then(async () => {
      try {
        for (let line of [await produce()].flat()) if (line !== undefined) loggerRef.logStatus(line);
      } catch (error) {
        logError(toError(error));
      }
    });
  }
  function refreshStatusRow() {
    try {
      let rowTail = statusModel.rowTail({
        liveHelpers: liveCount,
        now: now(),
        noNewOnes: switchState !== "offered",
        disconnectKey: keys,
      });
      let leadText = servingUnattended
        ? STATUS_RUN_WITHOUT_ASKING
        : outsideSandbox !== undefined
          ? `${STATUS_ASKING_FIRST} (${SANDBOX_POSTURE_HINTS[outsideSandbox].words})`
          : STATUS_RUN_ASKING_FIRST;
      logger?.setCloudSessionsStatus(
        switchState === "offered" || liveCount > 0
          ? {
              text: `${leadText}${rowTail}`,
              unattended: servingUnattended,
            }
          : unattended
            ? {
                text: STATUS_CANNOT_RUN,
                unattended: false,
              }
            : null,
      );
    } catch (error) {
      logError(toError(error));
    }
  }
  function startLongRunningTimer() {
    if (!statusModel.anyRunning()) {
      clearInterval(longRunningTimer);
      longRunningTimer = undefined;
      return;
    }
    longRunningTimer ??= setInterval(() => {
      queueStatus(() => statusModel.longRunningLines(now()));
      refreshStatusRow();
      if (!statusModel.anyRunning()) {
        clearInterval(longRunningTimer);
        longRunningTimer = undefined;
      }
    }, 1000);
    longRunningTimer.unref?.();
  }
  async function computeAutoModeWhy() {
    try {
      let { autoModeRefusedForServedCallsWhy } = await import("./serve/servedAutoMode.js");
      await freshUnattendedServingConsent();
      let sandboxPosture = unattended
        ? await commandSandboxPosture({
            start: false,
          })
        : undefined;
      let why = autoModeRefusedForServedCallsWhy(sandboxPosture?.confined === true);
      if (
        sandboxPosture !== undefined &&
        !sandboxPosture.confined &&
        (why === "consent_unset" || why === "sandbox_off") &&
        unattendedServingConsentViewIsFresh()
      ) {
        let detail = "";
        if (sandboxPosture.reason === "sandbox_failed_to_start")
          try {
            let { SandboxManager } = await import("../../utils/sandbox/REFUSED_UNTIL_RESTART.lazy.js");
            detail = (await SandboxManager.checkDependenciesAsync()).errors.join("; ");
          } catch (error) {
            logForDebugging(
              `[bridge:tool-host] sandbox dependency errors could not be read for the start line: ${error}`,
            );
          }
        return {
          why: "sandbox_off",
          outsideSandbox: sandboxPosture.reason,
          detail,
        };
      }
      let normalizedWhy = why === "sandbox_off" ? "consent_unset" : why;
      return {
        why:
          normalizedWhy === "none" || unattended || unattendedServingConsentView() === "accepted"
            ? normalizedWhy
            : "consent_unset",
        nothingAsked:
          !unattended && normalizedWhy === "consent_unset" && unattendedServingConsentViewIsFresh(),
      };
    } catch (error) {
      logError(toError(error));
      return alwaysFalseToolHost(vmGuest)
        ? {
            why: "vm_only",
            unattended: false,
            guestOs: undefined,
          }
        : {
            why: "consent_unset",
            nothingAsked: false,
          };
    }
  }
  async function updateUnattendedBanner() {
    let whyInfo = await computeAutoModeWhy();
    let shouldAnnounceUnattended = vmOnly && whyInfo.why === "none";
    let unattended = whyInfo.why === "vm_only" && whyInfo.unattended;
    let shouldAnnounceVm = unattended && !(vmOnly && servingUnattended);
    let guestOsChanged =
      whyInfo.why === "vm_only" &&
      whyInfo.unattended &&
      whyInfo.guestOs !== undefined &&
      whyInfo.guestOs !== lastGuestOs;
    servingUnattended = whyInfo.why === "none" || unattended;
    outsideSandbox = whyInfo.why === "sandbox_off" ? whyInfo.outsideSandbox : undefined;
    vmOnly = whyInfo.why === "vm_only";
    guestOs = whyInfo.why === "vm_only" ? whyInfo.guestOs : undefined;
    refreshStatusRow();
    if (shouldAnnounceUnattended || shouldAnnounceVm || guestOsChanged) {
      lastGuestOs = guestOs;
      logger?.logStatus(
        sequential.yellow(
          `${WARNING_GLYPH}  ${shouldAnnounceUnattended ? UNATTENDED_SERVING_BANNER : cloudFolderUseStatusText(guestOs, whyInfo.why === "vm_only" ? whyInfo.lacks : undefined)}`,
        ),
      );
    }
  }
  function statusUpdateForSwitch() {
    let nextState = switchState;
    if (nextState === undefined || nextState === lastSwitchState) return;
    let shouldReportChange =
      unattended ||
      vmGuest ||
      nextState === "offered" ||
      lastSwitchState === "offered" ||
      liveChecks.gate() === true;
    let switchedOffRemotely = isSwitchedOffRemotely(verdict);
    lastSwitchState = nextState;
    if (!shouldReportChange) return;
    let wasEverOffered = wasOffered;
    wasOffered ||= nextState === "offered";
    return async () => {
      if (nextState === "offered") {
        let whyInfo = await computeAutoModeWhy();
        servingUnattended = whyInfo.why === "none" || (whyInfo.why === "vm_only" && whyInfo.unattended);
        outsideSandbox = whyInfo.why === "sandbox_off" ? whyInfo.outsideSandbox : undefined;
        vmOnly = whyInfo.why === "vm_only";
        guestOs = whyInfo.why === "vm_only" ? whyInfo.guestOs : undefined;
        lastGuestOs = guestOs;
        return {
          text:
            whyInfo.why === "none"
              ? UNATTENDED_SERVING_BANNER
              : whyInfo.why === "vm_only"
                ? whyInfo.unattended
                  ? cloudFolderUseStatusText(guestOs, whyInfo.lacks)
                  : `${emptyStatusText(guestOs, whyInfo.lacks)} ${ASK_FIRST_SERVING_BANNER}`
                : whyInfo.why === "consent_unset"
                  ? whyInfo.nothingAsked
                    ? `${ASK_FIRST_SERVING_BANNER} ${UNATTENDED_SERVING_HOWTO}`
                    : ASK_FIRST_SERVING_BANNER
                  : `${whyInfo.why === "sandbox_off" ? `The flag lets commands run without asking only inside the sandbox (${SANDBOX_POSTURE_HINTS[whyInfo.outsideSandbox].words} here): ${whyInfo.detail === "" ? "" : `${whyInfo.detail}; `}${SANDBOX_POSTURE_HINTS[whyInfo.outsideSandbox].next}` : AUTO_MODE_OFF_REASONS[whyInfo.why]} ${ASK_FIRST_SERVING_BANNER}`,
          unattended: servingUnattended,
        };
      }
      return {
        text: describeRemoteToolsOffReason(
          nextState,
          !wasEverOffered ? "never" : switchedOffRemotely ? "stopped" : "closed",
        ),
        unattended: false,
      };
    };
  }
  let { getToolHostAdvert, stop } = await watchToolHostAdvert({
    dir,
    checks: liveChecks,
    log: (message) => logForDebugging(`[bridge:tool-host] ${message}`),
    refuse: helperRefusal,
    onVerdict: (nextVerdict) => {
      verdict = nextVerdict;
      if (nextVerdict.kind !== "unknown") {
        switchState = nextVerdict.kind === "advertise" ? "offered" : nextVerdict.blocker;
        let statusUpdate = startupRan ? statusUpdateForSwitch() : undefined;
        if (statusUpdate !== undefined)
          queueStatus(async () => {
            let statusInfo = await statusUpdate();
            refreshStatusRow();
            return statusInfo.unattended
              ? sequential.yellow(`${WARNING_GLYPH}  ${statusInfo.text}`)
              : statusInfo.text;
          });
        if (vmOnly)
          queueStatus(async () => {
            if ((switchState === "offered" || liveCount > 0) && !isSwitchedOffRemotely(verdict))
              await updateUnattendedBanner();
            return;
          });
      }
      if (handler !== undefined && isSwitchedOffRemotely(nextVerdict))
        handler.sweep("gate_off").catch((error) => logError(toError(error)));
    },
  });
  let sweepOnShutdown;
  let failed = false;
  return {
    getToolHostAdvert: () =>
      failed
        ? {
            kind: "withdraw",
          }
        : getToolHostAdvert(),
    blocker: () => (switchState === "offered" ? undefined : switchState),
    offeredWithoutGit: () => !failed && verdict.kind === "advertise" && verdict.withoutGit === true,
    createHandler(api) {
      try {
        handler = buildToolHostWorkHandler(
          {
            folder: dir,
            switches,
            api: api.api,
            logger: {
              logStatus: () => {},
              logVerbose: (message) => api.logger.logVerbose(message),
            },
            onLiveCountChange: (count) => {
              liveCount = count;
              promise = promise.then(refreshStatusRow);
            },
            onEvent: (event) => {
              if (unattended || wasOffered || event.kind !== "refused")
                queueStatus(async () => {
                  if (event.kind === "started" && switchState === "offered") await updateUnattendedBanner();
                  if (event.kind === "status") {
                    let lines = statusModel.linesFor(event.helper, event.session, event.status);
                    refreshStatusRow();
                    startLongRunningTimer();
                    return lines;
                  }
                  if (event.kind === "stopping" || event.kind === "ended") {
                    statusModel.forget(event.helper);
                    refreshStatusRow();
                    startLongRunningTimer();
                  }
                  return describeToolHostEvent(event, verbose);
                });
            },
          },
          {
            unattendedGrant,
            withoutShellSecrets: true,
            ...(guest !== undefined && {
              guest,
            }),
            ...(testVm !== undefined && {
              testVm,
            }),
          },
        );
        logger = api.logger;
      } catch (error) {
        failed = true;
        logError(toError(error));
      }
      return handler;
    },
    async startupNotice() {
      startupRan = true;
      try {
        if (handler === undefined)
          return unattended
            ? {
                text: describeRemoteToolsOffReason("error", "never"),
                unattended: false,
              }
            : undefined;
        let statusInfo = await statusUpdateForSwitch()?.();
        refreshStatusRow();
        return (
          statusInfo ??
          (unattended && switchState === undefined
            ? {
                text: SERVING_STATUS_CHECKING,
                unattended: false,
              }
            : undefined)
        );
      } catch (error) {
        logError(toError(error));
        return;
      }
    },
    bannerDrawn: deferred.resolve,
    disconnectKey() {
      try {
        let nowMs = now();
        let count = liveCount;
        if (handler === undefined || logger === undefined) return;
        if (count === 0) {
          disconnectAskedAt = undefined;
          if (switchState === "offered") logger.logStatus("No cloud session is connected to this folder.");
          return;
        }
        let sessionPhrase = count === 1 ? "the cloud session" : `${count} cloud sessions`;
        if (disconnectAskedAt === undefined || nowMs - disconnectAskedAt > DISCONNECT_CONFIRM_WINDOW_MS) {
          disconnectAskedAt = nowMs;
          let busyText = statusModel.busySentence();
          logger.logStatus(
            `Disconnect ${sessionPhrase} from this folder?${busyText === "" ? "" : ` ${busyText}`} Press x again within ${DISCONNECT_CONFIRM_WINDOW_MS / 1000} seconds; any other key cancels.`,
          );
          return;
        }
        disconnectAskedAt = undefined;
        handler.sweep("released").then(
          () => logFeatureOk("bridge_tool_host_disconnect"),
          (error) => {
            logError(toError(error));
            logFeatureBad("bridge_tool_host_disconnect", "sweep_failed");
          },
        );
        let returnHint =
          switchState === "offered"
            ? `${count === 1 ? "It" : "Each"} can ask for this folder again.`
            : `${count === 1 ? "It" : "They"} cannot come back until this folder is offered to cloud sessions again.`;
        logger.logStatus(`Disconnected ${sessionPhrase}. ${returnHint}`);
      } catch (error) {
        logError(toError(error));
      }
    },
    cancelDisconnect() {
      if (disconnectAskedAt !== undefined) {
        disconnectAskedAt = undefined;
        logger?.logStatus("Not disconnecting.");
      }
    },
    async stopHelpers() {
      if (handler !== undefined && sweepOnShutdown === undefined) {
        let stoppedCount = liveCount;
        sweepOnShutdown = sweepToolHostForShutdown(handler);
        if (stoppedCount > 0)
          queueStatus(
            () =>
              `Stopped ${stoppedCount} cloud ${stoppedCount === 1 ? "session that was" : "sessions that were"} using this folder.`,
          );
      }
      await sweepOnShutdown;
    },
    stop() {
      clearInterval(longRunningTimer);
      longRunningTimer = undefined;
      stop();
    },
  };
}
//@ chunk-b1j59scg.js:29546-29570 placement
function alwaysFalseToolHost(state) {
  return false;
}
export { useForegroundToolHost };

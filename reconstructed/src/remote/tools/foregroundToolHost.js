/**
 * remote/tools/foregroundToolHost.ts
 *
 * 前台工具宿主状态与控制（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-qh5wq2v1.js (12)
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
import { WARNING_GLYPH } from "../../utils/permissions/autoModeRulesPrompt.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";

//@ chunk-qh5wq2v1.js:12181-12397 placement
function isUnattendedServingFlagOn() {
  try {
    let { value: u, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_violin_luthier", false);
    switch (source) {
      case "payload":
      case "override":
        return u === true;
      case "disk":
        return u === true ? "unknown" : false;
      case "disabled":
      case "fallback":
        return false;
    }
  } catch {
    return false;
  }
}
//@ chunk-qh5wq2v1.js:12397-12628 placement
function isUnattendedServingFlagOnOptimistic() {
  try {
    let { value: u, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_violin_luthier", false);
    switch (source) {
      case "payload":
      case "override":
        return u === true;
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
//@ chunk-qh5wq2v1.js:12628-14028 placement
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
//@ chunk-qh5wq2v1.js:14028-18291 placement
/**
 * 前台工具宿主的状态行文本（云会话连接、断开、重连）
 */
function ForegroundToolHostStatus(u) {
  let y = new Map();
  let d = false;
  let x = new Set();
  return {
    linesFor(c, b, _) {
      d ||= b > 1;
      let r = y.get(c) ?? {
        session: b,
        serving: false,
        live: new Map(),
        runningSince: new Map(),
        longRunningSaid: new Set(),
        ended: new Set(),
      };
      y.set(c, r);
      let a = d ? `Cloud session ${b}` : "Cloud session";
      let s = [];
      let h = _.serving === undefined ? r.serving : _.serving === "on";
      if (h !== r.serving) {
        r.serving = h;
        s.push(
          !h ? `${a} can no longer run commands here.` : x.has(b) ? `${a} reconnected.` : `${a} connected.`,
        );
        if (h) {
          x.add(b);
          if (x.size > MAX_SEEN_CALL_IDS) x.delete(x.values().next().value);
        }
      }
      for (let e of _.recent) {
        if (r.ended.has(e.callId)) continue;
        let w = r.runningSince.get(e.callId);
        r.live.delete(e.callId);
        r.runningSince.delete(e.callId);
        r.longRunningSaid.delete(e.callId);
        let p =
          w !== undefined && e.at - w >= 1000
            ? formatDuration(e.at - w, {
                hideTrailingZeros: true,
              })
            : undefined;
        let v =
          e.code !== undefined && Object.hasOwn(REFUSAL_CODE_REASONS, e.code)
            ? REFUSAL_CODE_REASONS[e.code]
            : undefined;
        switch (e.ended) {
          case "completed":
            if (e.code === undefined || e.code === "approved_by_session") {
              if (u.verbose) s.push(`${a}: ${e.tool} ran${p === undefined ? "" : ` (${p})`}.`);
            } else s.push(`${a}: ${e.tool} not run${v === undefined ? "" : `: ${v}`}.`);
            break;
          case "denied":
            s.push(`${a}: ${e.tool} was denied in the session.`);
            break;
          case "withdrawn":
            s.push(`${a}: ${e.tool} not run: its approval question was withdrawn.`);
            break;
          case "refused":
            s.push(`${a}: ${e.tool} not run${v === undefined ? "" : `: ${v}`}.`);
            break;
          case "failed":
            s.push(
              `${a}: ${e.tool} ${e.code === "timed_out" ? `stopped${p === undefined ? "" : ` after ${p}`}: it hit its time limit` : e.code === "cancelled" ? "was cancelled" : e.code === "tool_error" ? "ended with an error" : "failed on this computer"}.`,
            );
            break;
        }
      }
      r.ended = new Set(_.recent.map((e) => e.callId));
      let k = new Map();
      for (let e of _.live) {
        if (r.ended.has(e.callId)) continue;
        let w = r.live.get(e.callId);
        k.set(e.callId, e);
        if (
          w?.state === e.state &&
          (e.state !== "asked" || e.classifierEligible !== false || w?.classifierEligible === false)
        )
          continue;
        if (e.state === "running") {
          r.runningSince.set(e.callId, e.since);
          if (u.verbose) s.push(`${a}: ${e.tool} ${w === undefined ? "running" : "approved, running"}.`);
        } else {
          r.runningSince.delete(e.callId);
          r.longRunningSaid.delete(e.callId);
          s.push(
            e.classifierEligible === false
              ? `${a}: waiting for you to approve ${e.tool} in the session.`
              : `${a}: ${e.tool} is waiting for approval in the session${e.classifierEligible === true ? ", which may approve it without you" : ""}.`,
          );
        }
      }
      for (let key of r.runningSince.keys())
        if (!k.has(key)) {
          r.runningSince.delete(key);
          r.longRunningSaid.delete(key);
        }
      r.live = k;
      return s;
    },
    forget(c) {
      y.delete(c);
    },
    longRunningLines(c) {
      let b = [];
      for (let _ of y.values())
        for (let [r, a] of _.runningSince) {
          let s = _.live.get(r);
          if (s?.state !== "running" || _.longRunningSaid.has(r) || c - a < LONG_RUNNING_CALL_NOTICE_MS)
            continue;
          _.longRunningSaid.add(r);
          b.push(
            `${d ? `Cloud session ${_.session}` : "Cloud session"}: ${s.tool} has been running for ${LONG_RUNNING_CALL_NOTICE_MS / 60000} minutes.`,
          );
        }
      return b;
    },
    anyRunning() {
      for (let c of y.values())
        for (let b of c.live.values()) if (c.serving && b.state === "running") return true;
      return false;
    },
    rowTail({ liveHelpers, now, noNewOnes, disconnectKey }) {
      if (liveHelpers <= 0) return "";
      let a = 0;
      let s = [];
      let h = [];
      for (let w of y.values()) {
        if (!w.serving) continue;
        a += 1;
        for (let p of w.live.values())
          if (p.state === "asked") h.push(p);
          else
            s.push({
              tool: p.tool,
              since: w.runningSince.get(p.callId),
            });
      }
      let max = Math.max(0, liveHelpers - a);
      let e = [];
      if (a > 0) e.push(`${a} connected`);
      if (max > 0) e.push(`${max} connecting`);
      if (noNewOnes) e.push("no new ones");
      if (a > 0) {
        if (s.length === 1) {
          let [w] = s;
          let p = w.since === undefined ? 0 : Math.max(0, now - w.since);
          e.push(`running ${w.tool}${p >= 1000 ? ` (${formatDuration(p)})` : ""}`);
        } else if (s.length > 1) e.push(`running ${s.length} tools`);
        if (h.length === 1 && s.length === 0) {
          let [w] = h;
          e.push(
            w.classifierEligible === false
              ? `approve ${w.tool} in that session`
              : `${w.tool} waiting for approval`,
          );
        } else if (h.length > 0) e.push(`${h.length} waiting for approval`);
        if (s.length === 0 && h.length === 0) e.push("idle");
      }
      return ` \xB7 ${e.join(", ")}${a > 0 && disconnectKey ? " \xB7 x to disconnect" : ""}`;
    },
    busySentence() {
      let c = [];
      let b = 0;
      for (let _ of y.values()) {
        if (!_.serving) continue;
        b += 1;
        let r = [..._.live.values()];
        let filtered = r.filter((h) => h.state === "running");
        let filtered_2 = r.filter((h) => h.state === "asked");
        if (filtered.length > 0)
          c.push(filtered.length === 1 ? `running ${filtered[0].tool}` : `running ${filtered.length} tools`);
        else if (filtered_2.length > 0) {
          let found = filtered_2.find((k) => k.classifierEligible === false);
          c.push(
            found !== undefined
              ? `waiting for you to approve ${found.tool}`
              : `waiting for ${filtered_2[0].tool} to be approved`,
          );
        }
      }
      if (c.length === 0) return "";
      if (b === 1) return `It is ${c[0]}.`;
      return c.length === 1 ? `One is ${c[0]}.` : `${c.length} are busy (${c.join(", ")}).`;
    },
  };
}
//@ chunk-qh5wq2v1.js:18291-18843 placement
/**
 * 前台工具宿主的状态横幅文案：无人值守执行、Remote Control 使用当前文件夹等。
 */
var UNATTENDED_SERVING_BANNER =
  "Your auto-mode cloud sessions can run commands on this computer without asking. Deny rules and hooks still apply. Ctrl+C to stop.";
var ASK_FIRST_SERVING_BANNER =
  "Your cloud sessions can use this folder while Remote Control runs. Commands that need approval ask in the cloud session first.";
var UNATTENDED_SERVING_HOWTO =
  'To let cloud sessions in auto mode run commands here without asking, turn on "Unattended commands from cloud sessions on this computer" in /config in claude, or pick a mode in /sandbox in claude in this folder, then start this command again with --allow-unattended-tool-calls.';
//@ chunk-qh5wq2v1.js:18843-18869 placement
function emptyStatusText(u, lacks) {
  return "";
}
//@ chunk-qh5wq2v1.js:18869-18895 placement
function cloudFolderUseStatusText(u, y) {
  return "";
}
//@ chunk-qh5wq2v1.js:18895-20405 placement
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
//@ chunk-qh5wq2v1.js:20405-22125 placement
function describeRemoteToolsOffReason(u, y) {
  let d;
  switch (u) {
    case "gate_off":
    case "flag_off":
      d = "it is off for your account";
      break;
    case "muted":
      d = "Anthropic has turned it off for now";
      break;
    case "windows":
      d = "this Claude Code does not serve tools from a Windows computer yet";
      break;
    case "platform":
      d = "it needs macOS, Windows, or Linux outside WSL";
      break;
    case "profile_dirs_unread":
      d = "Windows has not yet said where this computer keeps its profile folders";
      break;
    case "profile_dirs_unreadable":
      d = "Windows did not say where this computer keeps its profile folders; restarting tries again";
      break;
    case "switch_off":
      d = "CLAUDE_CODE_REMOTE_TOOLS_SERVE turns it off";
      break;
    case "launched_from_home":
      d =
        "it or its repository is your home directory, is in a hidden folder there, or is another such place; start from a project folder such as ~/code/my-app";
      break;
    case "policy_org":
      d = "your organization's policy does not allow it";
      break;
    case "egress":
      d = "this computer sends only essential traffic, or uses another provider";
      break;
    case "not_stored_login":
      d = "it needs your saved login (`claude auth login`), not a token from the environment";
      break;
    case "excluded_repository":
      d = "it is in a repository that is never offered";
      break;
    case "not_git_checkout":
      d = "it is missing or cannot be opened, or its `.git` is not a plain file or folder";
      break;
    case "other_sign_in":
      d = "this run's environment signs in or sends its traffic somewhere else";
      break;
    case "flags_unloaded":
    case "policy_unloaded":
      d = "this computer could not check whether it is allowed";
      break;
    default:
      d = "it could not be set up here (--debug says why)";
  }
  return `${
    {
      never: "Cloud sessions cannot use this folder",
      stopped: "Cloud sessions can no longer use this folder",
      closed: "New cloud sessions cannot use this folder",
    }[y]
  }: ${d}.`;
}
//@ chunk-qh5wq2v1.js:22125-22743 placement
/**
 * 把前台工具宿主事件（started/refused/ended 等）转成一行英文状态文本；status/stopping 与本机主动停止不显示。
 */
function describeToolHostEvent(event, verbose) {
  let d = verbose ? "" : " (--verbose says why)";
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
        ? `A cloud session lost its connection${d}.`
        : `A cloud session could not connect${d}.`;
  }
}
//@ chunk-qh5wq2v1.js:22743-28316 placement
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
  let s = unattendedGrant !== undefined;
  let h = guest !== undefined || testVm !== undefined;
  let k = liveToolHostChecks(
    dir,
    credentials,
    s ? isUnattendedServingFlagOnOptimistic : isUnattendedServingFlagOn,
  );
  let e = {
    kind: "unknown",
    waitingOn: "feature_flags",
  };
  let switches = liveToolHostSwitches({
    dir,
    checks: k,
    isOfferingFolder: () => e.kind === "advertise",
    hasAccessToken,
  });
  let p;
  let v;
  let S;
  let W = s || h ? undefined : "gate_off";
  let G = false;
  let L = false;
  let V;
  let I = false;
  let E;
  let U;
  let D = 0;
  let C = ForegroundToolHostStatus({
    verbose,
  });
  let T;
  let R;
  let q = false;
  let deferred = Promise.withResolvers();
  let promise = deferred.promise;
  function A(n) {
    let o = v;
    if (o === undefined) return;
    promise = promise.then(async () => {
      try {
        for (let f of [await n()].flat()) if (f !== undefined) o.logStatus(f);
      } catch (error) {
        logError(toError(error));
      }
    });
  }
  function H() {
    try {
      let n = C.rowTail({
        liveHelpers: D,
        now: now(),
        noNewOnes: S !== "offered",
        disconnectKey: keys,
      });
      let o = L
        ? STATUS_RUN_WITHOUT_ASKING
        : V !== undefined
          ? `${STATUS_ASKING_FIRST} (${SANDBOX_POSTURE_HINTS[V].words})`
          : STATUS_RUN_ASKING_FIRST;
      v?.setCloudSessionsStatus(
        S === "offered" || D > 0
          ? {
              text: `${o}${n}`,
              unattended: L,
            }
          : s
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
  function z() {
    if (!C.anyRunning()) {
      clearInterval(T);
      T = undefined;
      return;
    }
    T ??= setInterval(() => {
      A(() => C.longRunningLines(now()));
      H();
      if (!C.anyRunning()) {
        clearInterval(T);
        T = undefined;
      }
    }, 1000);
    T.unref?.();
  }
  async function X() {
    try {
      let { autoModeRefusedForServedCallsWhy } = await import("./chunk-xfj8e1gs.js");
      await freshUnattendedServingConsent();
      let o = s
        ? await commandSandboxPosture({
            start: false,
          })
        : undefined;
      let f = autoModeRefusedForServedCallsWhy(o?.confined === true);
      if (
        o !== undefined &&
        !o.confined &&
        (f === "consent_unset" || f === "sandbox_off") &&
        unattendedServingConsentViewIsFresh()
      ) {
        let detail = "";
        if (o.reason === "sandbox_failed_to_start")
          try {
            let { SandboxManager } = await import("./chunk-y0my07fj.js");
            detail = (await SandboxManager.checkDependenciesAsync()).errors.join("; ");
          } catch (error) {
            logForDebugging(
              `[bridge:tool-host] sandbox dependency errors could not be read for the start line: ${error}`,
            );
          }
        return {
          why: "sandbox_off",
          outsideSandbox: o.reason,
          detail,
        };
      }
      let O = f === "sandbox_off" ? "consent_unset" : f;
      return {
        why: O === "none" || s || unattendedServingConsentView() === "accepted" ? O : "consent_unset",
        nothingAsked: !s && O === "consent_unset" && unattendedServingConsentViewIsFresh(),
      };
    } catch (error) {
      logError(toError(error));
      return alwaysFalseToolHost(h)
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
  async function Z() {
    let n = await X();
    let o = I && n.why === "none";
    let unattended = n.why === "vm_only" && n.unattended;
    let O = unattended && !(I && L);
    let i = n.why === "vm_only" && n.unattended && n.guestOs !== undefined && n.guestOs !== U;
    L = n.why === "none" || unattended;
    V = n.why === "sandbox_off" ? n.outsideSandbox : undefined;
    I = n.why === "vm_only";
    E = n.why === "vm_only" ? n.guestOs : undefined;
    H();
    if (o || O || i) {
      U = E;
      v?.logStatus(
        sequential.yellow(
          `${WARNING_GLYPH}  ${o ? UNATTENDED_SERVING_BANNER : cloudFolderUseStatusText(E, n.why === "vm_only" ? n.lacks : undefined)}`,
        ),
      );
    }
  }
  function J() {
    let n = S;
    if (n === undefined || n === W) return;
    let o = s || h || n === "offered" || W === "offered" || k.gate() === true;
    let f = isSwitchedOffRemotely(e);
    W = n;
    if (!o) return;
    let O = G;
    G ||= n === "offered";
    return async () => {
      if (n === "offered") {
        let i = await X();
        L = i.why === "none" || (i.why === "vm_only" && i.unattended);
        V = i.why === "sandbox_off" ? i.outsideSandbox : undefined;
        I = i.why === "vm_only";
        E = i.why === "vm_only" ? i.guestOs : undefined;
        U = E;
        return {
          text:
            i.why === "none"
              ? UNATTENDED_SERVING_BANNER
              : i.why === "vm_only"
                ? i.unattended
                  ? cloudFolderUseStatusText(E, i.lacks)
                  : `${emptyStatusText(E, i.lacks)} ${ASK_FIRST_SERVING_BANNER}`
                : i.why === "consent_unset"
                  ? i.nothingAsked
                    ? `${ASK_FIRST_SERVING_BANNER} ${UNATTENDED_SERVING_HOWTO}`
                    : ASK_FIRST_SERVING_BANNER
                  : `${i.why === "sandbox_off" ? `The flag lets commands run without asking only inside the sandbox (${SANDBOX_POSTURE_HINTS[i.outsideSandbox].words} here): ${i.detail === "" ? "" : `${i.detail}; `}${SANDBOX_POSTURE_HINTS[i.outsideSandbox].next}` : AUTO_MODE_OFF_REASONS[i.why]} ${ASK_FIRST_SERVING_BANNER}`,
          unattended: L,
        };
      }
      return {
        text: describeRemoteToolsOffReason(n, !O ? "never" : f ? "stopped" : "closed"),
        unattended: false,
      };
    };
  }
  let { getToolHostAdvert, stop } = await watchToolHostAdvert({
    dir,
    checks: k,
    log: (n) => logForDebugging(`[bridge:tool-host] ${n}`),
    refuse: helperRefusal,
    onVerdict: (n) => {
      e = n;
      if (n.kind !== "unknown") {
        S = n.kind === "advertise" ? "offered" : n.blocker;
        let o = q ? J() : undefined;
        if (o !== undefined)
          A(async () => {
            let f = await o();
            H();
            return f.unattended ? sequential.yellow(`${WARNING_GLYPH}  ${f.text}`) : f.text;
          });
        if (I)
          A(async () => {
            if ((S === "offered" || D > 0) && !isSwitchedOffRemotely(e)) await Z();
            return;
          });
      }
      if (p !== undefined && isSwitchedOffRemotely(n))
        p.sweep("gate_off").catch((error) => logError(toError(error)));
    },
  });
  let j;
  let B = false;
  return {
    getToolHostAdvert: () =>
      B
        ? {
            kind: "withdraw",
          }
        : getToolHostAdvert(),
    blocker: () => (S === "offered" ? undefined : S),
    offeredWithoutGit: () => !B && e.kind === "advertise" && e.withoutGit === true,
    createHandler(n) {
      try {
        p = buildToolHostWorkHandler(
          {
            folder: dir,
            switches,
            api: n.api,
            logger: {
              logStatus: () => {},
              logVerbose: (o) => n.logger.logVerbose(o),
            },
            onLiveCountChange: (o) => {
              D = o;
              promise = promise.then(H);
            },
            onEvent: (event) => {
              if (s || G || event.kind !== "refused")
                A(async () => {
                  if (event.kind === "started" && S === "offered") await Z();
                  if (event.kind === "status") {
                    let f = C.linesFor(event.helper, event.session, event.status);
                    H();
                    z();
                    return f;
                  }
                  if (event.kind === "stopping" || event.kind === "ended") {
                    C.forget(event.helper);
                    H();
                    z();
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
        v = n.logger;
      } catch (error) {
        B = true;
        logError(toError(error));
      }
      return p;
    },
    async startupNotice() {
      q = true;
      try {
        if (p === undefined)
          return s
            ? {
                text: describeRemoteToolsOffReason("error", "never"),
                unattended: false,
              }
            : undefined;
        let n = await J()?.();
        H();
        return (
          n ??
          (s && S === undefined
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
        let n = now();
        let o = D;
        if (p === undefined || v === undefined) return;
        if (o === 0) {
          R = undefined;
          if (S === "offered") v.logStatus("No cloud session is connected to this folder.");
          return;
        }
        let f = o === 1 ? "the cloud session" : `${o} cloud sessions`;
        if (R === undefined || n - R > DISCONNECT_CONFIRM_WINDOW_MS) {
          R = n;
          let i = C.busySentence();
          v.logStatus(
            `Disconnect ${f} from this folder?${i === "" ? "" : ` ${i}`} Press x again within ${DISCONNECT_CONFIRM_WINDOW_MS / 1000} seconds; any other key cancels.`,
          );
          return;
        }
        R = undefined;
        p.sweep("released").then(
          () => logFeatureOk("bridge_tool_host_disconnect"),
          (error) => {
            logError(toError(error));
            logFeatureBad("bridge_tool_host_disconnect", "sweep_failed");
          },
        );
        let O =
          S === "offered"
            ? `${o === 1 ? "It" : "Each"} can ask for this folder again.`
            : `${o === 1 ? "It" : "They"} cannot come back until this folder is offered to cloud sessions again.`;
        v.logStatus(`Disconnected ${f}. ${O}`);
      } catch (error) {
        logError(toError(error));
      }
    },
    cancelDisconnect() {
      if (R !== undefined) {
        R = undefined;
        v?.logStatus("Not disconnecting.");
      }
    },
    async stopHelpers() {
      if (p !== undefined && j === undefined) {
        let n = D;
        j = sweepToolHostForShutdown(p);
        if (n > 0)
          A(
            () =>
              `Stopped ${n} cloud ${n === 1 ? "session that was" : "sessions that were"} using this folder.`,
          );
      }
      await j;
    },
    stop() {
      clearInterval(T);
      T = undefined;
      stop();
    },
  };
}
//@ chunk-qh5wq2v1.js:28316-28340 placement
function alwaysFalseToolHost(u) {
  return false;
}

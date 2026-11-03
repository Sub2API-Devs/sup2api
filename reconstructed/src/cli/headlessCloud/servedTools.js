/**
 * cli/headlessCloud/servedTools.ts
 *
 * 2.1.316 新增：跟踪云会话经本机执行的工具调用：空闲监视与状态报告。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fe6rs39h.js (9)
 * attribution: placement 9
 */
import { createSignal } from "../../utils/signal.js";
import {
  SERVED_TOOLS_MAX_CALLS,
  MAX_SERVED_TOOL_CALLS_LISTED,
  isServedToolsHeadlessEnabled,
} from "./headlessFeatures.js";
import {
  DEFAULT_SERVING_LIMITS,
  SAYS_STILL_HERE,
  leftStateFor,
} from "../../remote/tools/protocolConstants.js";
import { readCallResult } from "../../remote/tools/toolDescriptors.js";
import { WITHDRAWN } from "../../remote/tools/protocolSchemas.js";
import {
  remoteToolServingPolicyName,
  remoteToolServingOffReason,
  isSessionChannelDisabled,
} from "../../services/remoteTools/servingGates.js";
import { createNoticeBacklog } from "../../utils/noticeBacklog.js";
import { UNVERIFIED_SENDER_2 } from "../../utils/hooks/deviceHooks/deviceHookSession.js";
import { isStillHereOnCached } from "../../services/analytics/lazyDoveGate.js";
import { systemClock } from "../../utils/sleep.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { CLOUD_LINE_MAX_CHARS } from "../cloudSession/headlessCloudClient.js";

//@ chunk-fe6rs39h.js:6638-8904 placement
/**
 * 跟踪云会话经本机执行的远程工具调用：记录 call_id、工具名、结束状态、重复调用与审批等待，供报告与去重。
 */
function createServedToolsTracker(e) {
  let n = new Map();
  let weakSet = new WeakSet();
  let r = [];
  let h = false;
  let signal = createSignal();
  let S = (toolUseId, tool, ended, code) => {
    n.delete(toolUseId);
    r = [
      ...r,
      {
        call_id: toolUseId,
        tool,
        ended,
        ...(code !== undefined && {
          code,
        }),
        at: e.now(),
      },
    ].slice(-SERVED_TOOLS_MAX_CALLS);
  };
  let w = (R, k) => {
    if (k === undefined)
      return {
        ...R,
        state: "asked",
      };
    let classifierEligible = k.classifier_eligible === true;
    if (R.ask_id === k.ask_id)
      return {
        ...R,
        state: "asked",
        classifier_eligible: classifierEligible,
      };
    let O = e.now();
    return {
      ...R,
      state: "asked",
      since: O,
      ask_id: k.ask_id,
      lapses_at: O + (e.maxAskMs() ?? DEFAULT_SERVING_LIMITS.max_ask_ms),
      classifier_eligible: classifierEligible,
    };
  };
  return {
    legStarted: (R) => {
      if (!R.request.ok || R.request.kind !== "call") return;
      let toolUseId = R.tool_use_id;
      let I = n.get(toolUseId);
      let approval = R.request.value.approval;
      if (approval === undefined ? I !== undefined : approval.decision === "deny") return;
      if (I === undefined) {
        if (n.size >= MAX_SERVED_TOOL_CALLS_LISTED) return;
        weakSet.add(R);
      }
      n.set(toolUseId, {
        ...(I ?? {
          call_id: toolUseId,
          tool: R.name,
          ...(approval !== undefined && {
            ask_id: approval.ask_id,
          }),
        }),
        state: "running",
        since: e.now(),
      });
      signal.emit();
    },
    legAnswered: (R, k) => {
      if (!R.request.ok) return;
      let toolUseId = R.tool_use_id;
      let O = n.get(toolUseId);
      let P = weakSet.delete(R);
      let envelope = k === undefined ? undefined : readCallResult(k).envelope;
      let envelope_2 = envelope?.status === "present" ? envelope.envelope : undefined;
      let approval = R.request.kind === "call" ? R.request.value.approval : undefined;
      let j = R.request.kind === "outcome_query" || (approval === undefined && !P);
      if (
        envelope_2 === undefined ||
        (isReplayedOutcome(envelope_2) &&
          (P || (envelope_2.outcome === "refused" && envelope_2.code === "duplicate_call"))) ||
        (j && (O === undefined || isFailedServedCall(envelope_2)))
      ) {
        if (P && O !== undefined) {
          n.delete(toolUseId);
          signal.emit();
        }
        return;
      }
      let Y = O?.tool ?? R.name;
      switch (envelope_2.outcome) {
        case "needs_approval":
          if (O === undefined) return;
          n.set(toolUseId, w(O, envelope_2));
          break;
        case "in_progress":
          if (O === undefined) return;
          n.set(
            toolUseId,
            envelope_2.state === "awaiting_approval"
              ? w(O, undefined)
              : {
                  ...O,
                  state: "running",
                },
          );
          break;
        case "acknowledged":
          S(toolUseId, Y, approval?.feedback === WITHDRAWN ? "withdrawn" : "denied");
          break;
        case "completed":
          S(
            toolUseId,
            Y,
            "completed",
            envelope_2.disposition === undefined || envelope_2.disposition === "ran"
              ? undefined
              : envelope_2.disposition,
          );
          break;
        case "refused":
          if (
            approval !== undefined &&
            envelope_2.reason === undefined &&
            envelope_2.code !== "withdrawn" &&
            envelope_2.code !== "unknown_call"
          ) {
            if (O === undefined) return;
            if (P) {
              n.delete(toolUseId);
              signal.emit();
              return;
            }
            if (O.ask_id === undefined) return;
            let { classifier_eligible: classifierEligible, ...W } = w(O, undefined);
            n.set(
              toolUseId,
              classifierEligible === false
                ? {
                    ...W,
                    classifier_eligible: classifierEligible,
                  }
                : W,
            );
            break;
          }
          S(toolUseId, Y, "refused", envelope_2.code);
          break;
        case "failed":
          S(toolUseId, Y, "failed", envelope_2.code);
          break;
      }
      h = true;
      signal.emit();
    },
    workerGone: () => {
      let filtered = [...n.values()].filter((k) => k.state === "asked");
      if (filtered.length === 0) return;
      filtered.forEach((k) => n.delete(k.call_id));
      signal.emit();
    },
    clear: () => {
      if (n.size === 0) return;
      n.clear();
      signal.emit();
    },
    report: () =>
      h || n.size > 0
        ? {
            live: [...n.values()],
            recent: r,
          }
        : undefined,
    onChanged: (R) => signal.subscribe(R),
  };
}
//@ chunk-fe6rs39h.js:8904-8957 placement
function isReplayedOutcome(e) {
  return "replayed" in e && e.replayed === true;
}
//@ chunk-fe6rs39h.js:8957-9057 placement
function isFailedServedCall(envelope) {
  return (
    (envelope.outcome === "failed" || (envelope.outcome === "refused" && envelope.code !== "unknown_call")) &&
    !isReplayedOutcome(envelope)
  );
}
//@ chunk-fe6rs39h.js:9057-9795 placement
/**
 * 空闲看门狗：按时钟周期检查忙闲状态，空闲超过 idleMs 触发 onIdle。
 */
class IdleWatcher {
  clock;
  idleMs;
  isBusy;
  onIdle;
  lastActivityAt;
  busyAtLastLook = false;
  stopped = false;
  lookDueAt = 0;
  cancel;
  constructor(e, idleReleaseMs, isBusy, onIdle) {
    this.clock = e;
    this.idleMs = idleReleaseMs;
    this.isBusy = isBusy;
    this.onIdle = onIdle;
    this.lastActivityAt = e.now();
    this.arm(idleReleaseMs);
  }
  noteActivity() {
    this.lastActivityAt = this.clock.now();
  }
  stop() {
    this.stopped = true;
    this.cancel?.();
    this.cancel = undefined;
  }
  arm(e) {
    let min = Math.min(e, 60000);
    this.lookDueAt = this.clock.now() + min;
    this.cancel = this.clock.setTimeout(() => this.look(), min);
  }
  look() {
    this.cancel = undefined;
    if (this.stopped) return;
    let e = this.clock.now();
    let n = this.isBusy();
    let s = e - this.lookDueAt > 60000;
    if (n || this.busyAtLastLook || s) this.lastActivityAt = e;
    this.busyAtLastLook = n;
    let r = e - this.lastActivityAt;
    if (r >= this.idleMs) {
      this.stopped = true;
      this.onIdle();
      return;
    }
    this.arm(this.idleMs - r);
  }
}
//@ chunk-fe6rs39h.js:9795-9840 placement
var SERVED_TOOLS_IDLE_LOOK_MS = 30000;
var ANNOUNCES_RETURN = "announces_return";
var SERVED_TOOLS_IDLE_GRACE_MS = 120000;
//@ chunk-fe6rs39h.js:9840-13270 placement
/**
 * 无头云会话的"本机工具服务"特性：未绑定或不可用时报告 off，否则通过会话通道宣布本机工具并处理撤回/拒绝/验证状态。
 */
function createServedToolsFeature(e) {
  return (n) => {
    if (!n.bound) return servedToolsOff("not_bound");
    if (n.servedTools === undefined) return servedToolsOff(n.servedToolsUnavailable);
    let s = null;
    let r = false;
    let h = false;
    let y = false;
    let S = false;
    let w = false;
    let R = {
      at: "pending",
    };
    let k;
    let signal = createSignal();
    let signal_2 = createSignal();
    let servedToolsTracker = createServedToolsTracker({
      now: Date.now,
      maxAskMs: () => Q.servedHost()?.limits.max_ask_ms,
    });
    servedToolsTracker.onChanged(() => signal_2.emit());
    let N;
    let L = (q) => {
      R = q;
      if (q.at !== "on") servedToolsTracker.clear();
      signal.emit();
    };
    let policy = remoteToolServingPolicyName();
    let noticeBacklog = createNoticeBacklog();
    let { onAnnounceOutcome, onRevoked, onNotice, buildAnnounce, ...X } = n.servedTools;
    let ee = false;
    let se = false;
    let x = false;
    let ie;
    let G = 0;
    let Q = e.openChannel({
      ...X,
      onAnnounceOutcome: (q, V) => {
        if (!S && q.kind !== "failed") y = false;
        if (q.kind === "announced") {
          se = ee;
          L({
            at: q.status === "announced" ? "on" : "withdrawn",
          });
        } else if (q.kind === "refused")
          L({
            at: q.reason === UNVERIFIED_SENDER_2 ? "unverified" : "refused",
          });
        else if (q.kind === "unsupported")
          L({
            at: "refused",
          });
        onAnnounceOutcome?.(q, V);
      },
      onRevoked: (q) =>
        onRevoked((V) => {
          L({
            at: "revoked",
            reason: V,
          });
          q(V);
        }),
      onNotice: (q, V) => {
        k = V;
        noticeBacklog.publish(V, "warning");
        onNotice?.(q, V);
        signal_2.emit();
      },
      buildAnnounce: (q, V, le) => {
        ee = isServedToolsHeadlessEnabled();
        let ue = [...(ee ? [ANNOUNCES_RETURN] : []), ...(isStillHereOnCached() ? [SAYS_STILL_HERE] : [])];
        return buildAnnounce(
          ue.length > 0
            ? {
                ...q,
                host: {
                  ...q.host,
                  capabilities: [...(q.host.capabilities ?? []), ...ue],
                },
              }
            : q,
          V,
          le,
        );
      },
      onServedCall: {
        requestStarted: () => {
          G++;
          ie?.noteActivity();
        },
        requestEnded: () => {
          G = Math.max(0, G - 1);
          ie?.noteActivity();
        },
        legStarted: (q, V) => {
          if (V !== undefined) N = Math.max(N ?? -1 / 0, Date.now() - V);
          servedToolsTracker.legStarted(q);
        },
        legAnswered: (q, V) => servedToolsTracker.legAnswered(q, V),
      },
      sessionId: n.sessionId,
      manager: () => s,
    });
    return {
      feature: "tools",
      status: noticeBacklog,
      onSettled: (q) => {
        signal.subscribe(q);
        if (R.at !== "pending") q();
      },
      onReportChanged: (q) => {
        signal_2.subscribe(q);
      },
      sessionCallbacks: {
        ...Q.callbacks,
        onWorkerLive: () => {
          if (e.controlOnly === true && h) Q.requestAnnounce("reconnected");
          else if (x && (y || (se && isServedToolsHeadlessEnabled()))) Q.requestAnnounce("returned");
          x = false;
          h = false;
          Q.callbacks.onWorkerLive?.();
        },
        onStreamSilent: (q) => {
          if (
            q.suspended ||
            S ||
            !isStillHereOnCached() ||
            N === undefined ||
            Date.now() - N > SERVED_TOOLS_IDLE_GRACE_MS ||
            servedToolsTracker.report()?.live.some((V) => V.state === "running") !== true
          )
            return;
          Q.sayStillHere();
        },
        onWorkerGone: () => {
          h = true;
          x = false;
          Q.callbacks.onWorkerGone?.();
          servedToolsTracker.workerGone();
        },
      },
      onSession: (q) => {
        s = q.manager;
        if (n.trigger === "create") s.beginWorkerStart();
        let { endServing } = q;
        let { idleReleaseMs } = e;
        if (e.controlOnly === true && idleReleaseMs !== undefined && endServing !== undefined) {
          ie = new IdleWatcher(
            q.clock ?? systemClock,
            idleReleaseMs,
            () => G > 0 || (servedToolsTracker.report()?.live.length ?? 0) > 0 || Q.hasBackgroundWork(),
            () => {
              logForDebugging(
                `[servedTools] this session ran nothing here for ${Math.round(idleReleaseMs / 60000)} min: letting it go`,
              );
              if (s?.workerLive() === true) logFeatureOk("rtc_idle_release");
              else logFeatureSad("rtc_idle_release", "no_worker");
              L({
                at: "left",
                leftFor: "idle",
              });
              endServing("idle");
            },
          );
          servedToolsTracker.onChanged(() => ie?.noteActivity());
        }
      },
      onWorkerLive: () => {
        s?.endWorkerStart();
        Q.requestAnnounce("attached");
      },
      onStreamConnected: (q) => {
        if (r) {
          let V = y || (q !== undefined && (q.driftRedial || q.gapMs >= SERVED_TOOLS_IDLE_LOOK_MS));
          if (S) w ||= V;
          else x ||= V;
          Q.requestAnnounce("reconnected");
        }
        r = true;
      },
      onHostWake: () => {
        S = false;
        let q = y || w;
        w = false;
        Q.hostWoke(q);
        return q;
      },
      onHostSleep: async () => {
        S = true;
        x = false;
        w = false;
        let q = Q.sayAsleep();
        if (q === null) return;
        y = true;
        if (!(await q)) y = false;
      },
      onWorkerInit: (q) =>
        Q.requestAnnounce("worker_init", {
          workerEpoch: q.workerEpoch,
        }),
      report: () => {
        let q = Q.servedHost();
        let V = servedToolsTracker.report();
        return {
          ...(R.at === "on"
            ? {
                state: "forwarded",
                source: "default",
              }
            : {
                state: "off",
                reason:
                  R.at === "withdrawn"
                    ? "serving_off"
                    : R.at === "left"
                      ? leftStateFor(R.leftFor)
                      : "not_announced",
              }),
          ...(k !== undefined && {
            message: truncateStatusMessage(k),
          }),
          facts: {
            ...(q !== undefined && {
              host: {
                handle: q.name,
                working_dir: q.working_dir,
                platform: q.platform,
                ...(q.claude_code_version !== undefined && {
                  cli_version: q.claude_code_version,
                }),
              },
            }),
            serving: {
              ...servedToolsStatusReport(R),
              policy,
              channel: "session",
            },
            ...(V !== undefined && {
              calls: V,
            }),
          },
        };
      },
      dispose: (q) => {
        ie?.stop();
        let leftFor = q?.leftFor;
        if (leftFor !== undefined && R.at !== "left")
          L({
            at: "left",
            leftFor,
          });
        return Q.close(leftFor);
      },
    };
  };
}
//@ chunk-fe6rs39h.js:13270-13672 placement
function servedToolsStatusReport(e) {
  switch (e.at) {
    case "pending":
      return {
        state: "pending",
      };
    case "on":
      return {
        state: "on",
      };
    case "withdrawn": {
      let n = remoteToolServingOffReason();
      return {
        state: "off",
        ...(n !== undefined && {
          reason: n,
        }),
      };
    }
    case "refused":
      return {
        state: "off",
        reason: "announce_refused",
      };
    case "unverified":
      return {
        state: "off",
        reason: "announce_unverified",
      };
    case "revoked":
      return {
        state: "revoked",
        reason: e.reason,
      };
    case "left":
      return {
        state: "off",
        reason: leftStateFor(e.leftFor),
      };
  }
}
//@ chunk-fe6rs39h.js:13672-13871 placement
function truncateStatusMessage(e) {
  if (truncateToLength(e, CLOUD_LINE_MAX_CHARS) === e) return e;
  let n = truncateToLength(e, CLOUD_LINE_MAX_CHARS);
  let max = Math.max(n.lastIndexOf(" \u2014 "), n.lastIndexOf("; "), n.lastIndexOf(". "));
  let r = max > 0 ? max : n.lastIndexOf(" ");
  return (r > 0 ? n.slice(0, r) : n).trimEnd();
}
//@ chunk-fe6rs39h.js:13871-14172 placement
function servedToolsOff(servedToolsUnavailable) {
  logForDebugging(
    `[servedTools] not served over the session channel: ${servedToolsUnavailable ?? "not_served"}`,
  );
  let n = {
    state: "off",
    reason: servedToolsUnavailable === "not_bound" ? "not_bound" : "not_served",
    facts: {
      serving: {
        state: "off",
        ...(servedToolsUnavailable !== undefined && {
          reason: servedToolsUnavailable,
        }),
        policy: remoteToolServingPolicyName(),
        channel: isSessionChannelDisabled() ? "bridge_only" : "session",
      },
    },
  };
  return {
    feature: "tools",
    report: () => n,
  };
}
export { truncateStatusMessage, createServedToolsFeature };

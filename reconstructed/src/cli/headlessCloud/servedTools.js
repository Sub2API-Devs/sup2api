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
import { SERVED_TOOLS_MAX_CALLS, Ps, isServedToolsHeadlessEnabled } from "./headlessFeatures.js";
import { TFe, SAYS_STILL_HERE, leftStateFor } from "../../remote/tools/protocolConstants.js";
import { readCallResult } from "../../remote/tools/toolDescriptors.js";
import { WITHDRAWN } from "../../remote/tools/protocolSchemas.js";
import {
  remoteToolServingPolicyName,
  remoteToolServingOffReason,
  isSessionChannelDisabled,
} from "../../services/remoteTools/servingGates.js";
import { createNoticeBacklog } from "../../utils/noticeBacklog.js";
import { UNVERIFIED_SENDER } from "../../utils/hooks/deviceHooks/deviceHookSession.js";
import { isStillHereOnCached } from "../../services/analytics/lazyDoveGate.js";
import { Aa } from "../../utils/sleep.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { lPr } from "../cloudSession/headlessCloudClient.js";

/**
 * 跟踪云会话经本机执行的远程工具调用：记录 call_id、工具名、结束状态、重复调用与审批等待，供报告与去重。
 */
//@ chunk-fe6rs39h.js:6638-8904 placement
function createServedToolsTracker(e) {
  let n = new Map(),
    weakSet = new WeakSet(),
    r = [],
    h = !1,
    y = createSignal(),
    S = (R, k, I, O) => {
      (n.delete(R),
        (r = [...r, { call_id: R, tool: k, ended: I, ...(O !== void 0 && { code: O }), at: e.now() }].slice(
          -SERVED_TOOLS_MAX_CALLS,
        )));
    },
    w = (R, k) => {
      if (k === void 0) return { ...R, state: "asked" };
      let I = k.classifier_eligible === !0;
      if (R.ask_id === k.ask_id) return { ...R, state: "asked", classifier_eligible: I };
      let now = e.now();
      return {
        ...R,
        state: "asked",
        since: now,
        ask_id: k.ask_id,
        lapses_at: now + (e.maxAskMs() ?? TFe.max_ask_ms),
        classifier_eligible: I,
      };
    };
  return {
    legStarted: (R) => {
      if (!R.request.ok || R.request.kind !== "call") return;
      let tool_use_id = R.tool_use_id,
        I = n.get(tool_use_id),
        approval = R.request.value.approval;
      if (approval === void 0 ? I !== void 0 : approval.decision === "deny") return;
      if (I === void 0) {
        if (n.size >= Ps) return;
        weakSet.add(R);
      }
      (n.set(tool_use_id, {
        ...(I ?? {
          call_id: tool_use_id,
          tool: R.name,
          ...(approval !== void 0 && { ask_id: approval.ask_id }),
        }),
        state: "running",
        since: e.now(),
      }),
        y.emit());
    },
    legAnswered: (R, k) => {
      if (!R.request.ok) return;
      let tool_use_id = R.tool_use_id,
        O = n.get(tool_use_id),
        P = weakSet.delete(R),
        N = k === void 0 ? void 0 : readCallResult(k).envelope,
        L = N?.status === "present" ? N.envelope : void 0,
        z = R.request.kind === "call" ? R.request.value.approval : void 0,
        j = R.request.kind === "outcome_query" || (z === void 0 && !P);
      if (
        L === void 0 ||
        (isReplayedOutcome(L) && (P || (L.outcome === "refused" && L.code === "duplicate_call"))) ||
        (j && (O === void 0 || isFailedServedCall(L)))
      ) {
        if (P && O !== void 0) (n.delete(tool_use_id), y.emit());
        return;
      }
      let Y = O?.tool ?? R.name;
      switch (L.outcome) {
        case "needs_approval":
          if (O === void 0) return;
          n.set(tool_use_id, w(O, L));
          break;
        case "in_progress":
          if (O === void 0) return;
          n.set(tool_use_id, L.state === "awaiting_approval" ? w(O, void 0) : { ...O, state: "running" });
          break;
        case "acknowledged":
          S(tool_use_id, Y, z?.feedback === WITHDRAWN ? "withdrawn" : "denied");
          break;
        case "completed":
          S(
            tool_use_id,
            Y,
            "completed",
            L.disposition === void 0 || L.disposition === "ran" ? void 0 : L.disposition,
          );
          break;
        case "refused":
          if (z !== void 0 && L.reason === void 0 && L.code !== "withdrawn" && L.code !== "unknown_call") {
            if (O === void 0) return;
            if (P) {
              (n.delete(tool_use_id), y.emit());
              return;
            }
            if (O.ask_id === void 0) return;
            let { classifier_eligible: classifier_eligible, ...W } = w(O, void 0);
            n.set(
              tool_use_id,
              classifier_eligible === !1 ? { ...W, classifier_eligible: classifier_eligible } : W,
            );
            break;
          }
          S(tool_use_id, Y, "refused", L.code);
          break;
        case "failed":
          S(tool_use_id, Y, "failed", L.code);
          break;
      }
      ((h = !0), y.emit());
    },
    workerGone: () => {
      let filtered = [...n.values()].filter((k) => k.state === "asked");
      if (filtered.length === 0) return;
      (filtered.forEach((k) => n.delete(k.call_id)), y.emit());
    },
    clear: () => {
      if (n.size === 0) return;
      (n.clear(), y.emit());
    },
    report: () => (h || n.size > 0 ? { live: [...n.values()], recent: r } : void 0),
    onChanged: (R) => y.subscribe(R),
  };
}
//@ chunk-fe6rs39h.js:8904-8957 placement
function isReplayedOutcome(e) {
  return "replayed" in e && e.replayed === !0;
}
//@ chunk-fe6rs39h.js:8957-9057 placement
function isFailedServedCall(e) {
  return (
    (e.outcome === "failed" || (e.outcome === "refused" && e.code !== "unknown_call")) &&
    !isReplayedOutcome(e)
  );
}
/**
 * 空闲看门狗：按时钟周期检查忙闲状态，空闲超过 idleMs 触发 onIdle。
 */
//@ chunk-fe6rs39h.js:9057-9795 placement
class IdleWatcher {
  clock;
  idleMs;
  isBusy;
  onIdle;
  lastActivityAt;
  busyAtLastLook = !1;
  stopped = !1;
  lookDueAt = 0;
  cancel;
  constructor(e, n, s, r) {
    this.clock = e;
    this.idleMs = n;
    this.isBusy = s;
    this.onIdle = r;
    ((this.lastActivityAt = e.now()), this.arm(n));
  }
  noteActivity() {
    this.lastActivityAt = this.clock.now();
  }
  stop() {
    ((this.stopped = !0), this.cancel?.(), (this.cancel = void 0));
  }
  arm(e) {
    let min = Math.min(e, 60000);
    ((this.lookDueAt = this.clock.now() + min),
      (this.cancel = this.clock.setTimeout(() => this.look(), min)));
  }
  look() {
    if (((this.cancel = void 0), this.stopped)) return;
    let now = this.clock.now(),
      isBusy = this.isBusy(),
      s = now - this.lookDueAt > 60000;
    if (isBusy || this.busyAtLastLook || s) this.lastActivityAt = now;
    this.busyAtLastLook = isBusy;
    let r = now - this.lastActivityAt;
    if (r >= this.idleMs) {
      ((this.stopped = !0), this.onIdle());
      return;
    }
    this.arm(this.idleMs - r);
  }
}
//@ chunk-fe6rs39h.js:9795-9840 placement
var SERVED_TOOLS_IDLE_LOOK_MS = 30000,
  ANNOUNCES_RETURN = "announces_return",
  Hs = 120000;
/**
 * 无头云会话的"本机工具服务"特性：未绑定或不可用时报告 off，否则通过会话通道宣布本机工具并处理撤回/拒绝/验证状态。
 */
//@ chunk-fe6rs39h.js:9840-13270 placement
function createServedToolsFeature(e) {
  return (n) => {
    if (!n.bound) return servedToolsOff("not_bound");
    if (n.servedTools === void 0) return servedToolsOff(n.servedToolsUnavailable);
    let s = null,
      r = !1,
      h = !1,
      y = !1,
      S = !1,
      w = !1,
      R = { at: "pending" },
      k,
      I = createSignal(),
      O = createSignal(),
      P = createServedToolsTracker({
        now: Date.now,
        maxAskMs: () => openChannel.servedHost()?.limits.max_ask_ms,
      });
    P.onChanged(() => O.emit());
    let N,
      L = (q) => {
        if (((R = q), q.at !== "on")) P.clear();
        I.emit();
      },
      z = remoteToolServingPolicyName(),
      j = createNoticeBacklog(),
      {
        onAnnounceOutcome: onAnnounceOutcome,
        onRevoked: onRevoked,
        onNotice: onNotice,
        buildAnnounce: buildAnnounce,
        ...X
      } = n.servedTools,
      ee = !1,
      se = !1,
      x = !1,
      ie,
      G = 0,
      openChannel = e.openChannel({
        ...X,
        onAnnounceOutcome: (q, V) => {
          if (!S && q.kind !== "failed") y = !1;
          if (q.kind === "announced") ((se = ee), L({ at: q.status === "announced" ? "on" : "withdrawn" }));
          else if (q.kind === "refused") L({ at: q.reason === UNVERIFIED_SENDER ? "unverified" : "refused" });
          else if (q.kind === "unsupported") L({ at: "refused" });
          onAnnounceOutcome?.(q, V);
        },
        onRevoked: (q) =>
          onRevoked((V) => {
            (L({ at: "revoked", reason: V }), q(V));
          }),
        onNotice: (q, V) => {
          ((k = V), j.publish(V, "warning"), onNotice?.(q, V), O.emit());
        },
        buildAnnounce: (q, V, le) => {
          ee = isServedToolsHeadlessEnabled();
          let ue = [...(ee ? [ANNOUNCES_RETURN] : []), ...(isStillHereOnCached() ? [SAYS_STILL_HERE] : [])];
          return buildAnnounce(
            ue.length > 0
              ? { ...q, host: { ...q.host, capabilities: [...(q.host.capabilities ?? []), ...ue] } }
              : q,
            V,
            le,
          );
        },
        onServedCall: {
          requestStarted: () => {
            (G++, ie?.noteActivity());
          },
          requestEnded: () => {
            ((G = Math.max(0, G - 1)), ie?.noteActivity());
          },
          legStarted: (q, V) => {
            if (V !== void 0) N = Math.max(N ?? -1 / 0, Date.now() - V);
            P.legStarted(q);
          },
          legAnswered: (q, V) => P.legAnswered(q, V),
        },
        sessionId: n.sessionId,
        manager: () => s,
      });
    return {
      feature: "tools",
      status: j,
      onSettled: (q) => {
        if ((I.subscribe(q), R.at !== "pending")) q();
      },
      onReportChanged: (q) => {
        O.subscribe(q);
      },
      sessionCallbacks: {
        ...openChannel.callbacks,
        onWorkerLive: () => {
          if (e.controlOnly === !0 && h) openChannel.requestAnnounce("reconnected");
          else if (x && (y || (se && isServedToolsHeadlessEnabled())))
            openChannel.requestAnnounce("returned");
          ((x = !1), (h = !1), openChannel.callbacks.onWorkerLive?.());
        },
        onStreamSilent: (q) => {
          if (
            q.suspended ||
            S ||
            !isStillHereOnCached() ||
            N === void 0 ||
            Date.now() - N > Hs ||
            P.report()?.live.some((V) => V.state === "running") !== !0
          )
            return;
          openChannel.sayStillHere();
        },
        onWorkerGone: () => {
          ((h = !0), (x = !1), openChannel.callbacks.onWorkerGone?.(), P.workerGone());
        },
      },
      onSession: (q) => {
        if (((s = q.manager), n.trigger === "create")) s.beginWorkerStart();
        let { endServing: endServing } = q,
          { idleReleaseMs: idleReleaseMs } = e;
        if (e.controlOnly === !0 && idleReleaseMs !== void 0 && endServing !== void 0)
          ((ie = new IdleWatcher(
            q.clock ?? Aa,
            idleReleaseMs,
            () => G > 0 || (P.report()?.live.length ?? 0) > 0 || openChannel.hasBackgroundWork(),
            () => {
              if (
                (logForDebugging(
                  `[servedTools] this session ran nothing here for ${Math.round(idleReleaseMs / 60000)} min: letting it go`,
                ),
                s?.workerLive() === !0)
              )
                logFeatureOk("rtc_idle_release");
              else logFeatureSad("rtc_idle_release", "no_worker");
              (L({ at: "left", leftFor: "idle" }), endServing("idle"));
            },
          )),
            P.onChanged(() => ie?.noteActivity()));
      },
      onWorkerLive: () => {
        (s?.endWorkerStart(), openChannel.requestAnnounce("attached"));
      },
      onStreamConnected: (q) => {
        if (r) {
          let V = y || (q !== void 0 && (q.driftRedial || q.gapMs >= SERVED_TOOLS_IDLE_LOOK_MS));
          if (S) w ||= V;
          else x ||= V;
          openChannel.requestAnnounce("reconnected");
        }
        r = !0;
      },
      onHostWake: () => {
        S = !1;
        let q = y || w;
        return ((w = !1), openChannel.hostWoke(q), q);
      },
      onHostSleep: async () => {
        ((S = !0), (x = !1), (w = !1));
        let sayAsleep = openChannel.sayAsleep();
        if (sayAsleep === null) return;
        if (((y = !0), !(await sayAsleep))) y = !1;
      },
      onWorkerInit: (q) => openChannel.requestAnnounce("worker_init", { workerEpoch: q.workerEpoch }),
      report: () => {
        let servedHost = openChannel.servedHost(),
          report = P.report();
        return {
          ...(R.at === "on"
            ? { state: "forwarded", source: "default" }
            : {
                state: "off",
                reason:
                  R.at === "withdrawn"
                    ? "serving_off"
                    : R.at === "left"
                      ? leftStateFor(R.leftFor)
                      : "not_announced",
              }),
          ...(k !== void 0 && { message: truncateStatusMessage(k) }),
          facts: {
            ...(servedHost !== void 0 && {
              host: {
                handle: servedHost.name,
                working_dir: servedHost.working_dir,
                platform: servedHost.platform,
                ...(servedHost.claude_code_version !== void 0 && {
                  cli_version: servedHost.claude_code_version,
                }),
              },
            }),
            serving: { ...servedToolsStatusReport(R), policy: z, channel: "session" },
            ...(report !== void 0 && { calls: report }),
          },
        };
      },
      dispose: (q) => {
        ie?.stop();
        let V = q?.leftFor;
        if (V !== void 0 && R.at !== "left") L({ at: "left", leftFor: V });
        return openChannel.close(V);
      },
    };
  };
}
//@ chunk-fe6rs39h.js:13270-13672 placement
function servedToolsStatusReport(e) {
  switch (e.at) {
    case "pending":
      return { state: "pending" };
    case "on":
      return { state: "on" };
    case "withdrawn": {
      let n = remoteToolServingOffReason();
      return { state: "off", ...(n !== void 0 && { reason: n }) };
    }
    case "refused":
      return { state: "off", reason: "announce_refused" };
    case "unverified":
      return { state: "off", reason: "announce_unverified" };
    case "revoked":
      return { state: "revoked", reason: e.reason };
    case "left":
      return { state: "off", reason: leftStateFor(e.leftFor) };
  }
}
//@ chunk-fe6rs39h.js:13672-13871 placement
function truncateStatusMessage(e) {
  if (truncateToLength(e, lPr) === e) return e;
  let n = truncateToLength(e, lPr),
    max = Math.max(n.lastIndexOf(" \u2014 "), n.lastIndexOf("; "), n.lastIndexOf(". ")),
    r = max > 0 ? max : n.lastIndexOf(" ");
  return (r > 0 ? n.slice(0, r) : n).trimEnd();
}
//@ chunk-fe6rs39h.js:13871-14172 placement
function servedToolsOff(e) {
  logForDebugging(`[servedTools] not served over the session channel: ${e ?? "not_served"}`);
  let n = {
    state: "off",
    reason: e === "not_bound" ? "not_bound" : "not_served",
    facts: {
      serving: {
        state: "off",
        ...(e !== void 0 && { reason: e }),
        policy: remoteToolServingPolicyName(),
        channel: isSessionChannelDisabled() ? "bridge_only" : "session",
      },
    },
  };
  return { feature: "tools", report: () => n };
}

export { truncateStatusMessage, createServedToolsFeature };

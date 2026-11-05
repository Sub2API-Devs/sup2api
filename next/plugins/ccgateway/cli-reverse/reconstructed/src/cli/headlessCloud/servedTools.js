/**
 * cli/headlessCloud/servedTools.ts
 *
 * 2.1.316 新增：跟踪云会话经本机执行的工具调用：空闲监视与状态报告。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-keyy05re.js (9)
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
  misfitDirection,
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

//@ chunk-keyy05re.js:6759-9025 placement
/**
 * 跟踪云会话经本机执行的远程工具调用：记录 call_id、工具名、结束状态、重复调用与审批等待，供报告与去重。
 */
function createServedToolsTracker(options) {
  let live = new Map();
  let weakSet = new WeakSet();
  let recent = [];
  let dirty = false;
  let signal = createSignal();
  let changed = (toolUseId, tool, ended, code) => {
    live.delete(toolUseId);
    recent = [
      ...recent,
      {
        call_id: toolUseId,
        tool,
        ended,
        ...(code !== undefined && {
          code,
        }),
        at: options.now(),
      },
    ].slice(-SERVED_TOOLS_MAX_CALLS);
  };
  let finish = (callId, tool) => {
    if (tool === undefined)
      return {
        ...callId,
        state: "asked",
      };
    let classifierEligible = tool.classifier_eligible === true;
    if (callId.ask_id === tool.ask_id)
      return {
        ...callId,
        state: "asked",
        classifier_eligible: classifierEligible,
      };
    let withAsk = options.now();
    return {
      ...callId,
      state: "asked",
      since: withAsk,
      ask_id: tool.ask_id,
      lapses_at: withAsk + (options.maxAskMs() ?? DEFAULT_SERVING_LIMITS.max_ask_ms),
      classifier_eligible: classifierEligible,
    };
  };
  return {
    legStarted: (ask) => {
      if (!ask.request.ok || ask.request.kind !== "call") return;
      let toolUseId = ask.tool_use_id;
      let entry = live.get(toolUseId);
      let approval = ask.request.value.approval;
      if (approval === undefined ? entry !== undefined : approval.decision === "deny") return;
      if (entry === undefined) {
        if (live.size >= MAX_SERVED_TOOL_CALLS_LISTED) return;
        weakSet.add(ask);
      }
      live.set(toolUseId, {
        ...(entry ?? {
          call_id: toolUseId,
          tool: ask.name,
          ...(approval !== undefined && {
            ask_id: approval.ask_id,
          }),
        }),
        state: "running",
        since: options.now(),
      });
      signal.emit();
    },
    legAnswered: (event, reply) => {
      if (!event.request.ok) return;
      let toolUseId = event.tool_use_id;
      let entry = live.get(toolUseId);
      let removed = weakSet.delete(event);
      let envelope = reply === undefined ? undefined : readCallResult(reply).envelope;
      let envelope_2 = envelope?.status === "present" ? envelope.envelope : undefined;
      let approval = event.request.kind === "call" ? event.request.value.approval : undefined;
      let answered = event.request.kind === "outcome_query" || (approval === undefined && !removed);
      if (
        envelope_2 === undefined ||
        (isReplayedOutcome(envelope_2) &&
          (removed || (envelope_2.outcome === "refused" && envelope_2.code === "duplicate_call"))) ||
        (answered && (entry === undefined || isFailedServedCall(envelope_2)))
      ) {
        if (removed && entry !== undefined) {
          live.delete(toolUseId);
          signal.emit();
        }
        return;
      }
      let isOutcomeQuery = entry?.tool ?? event.name;
      switch (envelope_2.outcome) {
        case "needs_approval":
          if (entry === undefined) return;
          live.set(toolUseId, finish(entry, envelope_2));
          break;
        case "in_progress":
          if (entry === undefined) return;
          live.set(
            toolUseId,
            envelope_2.state === "awaiting_approval"
              ? finish(entry, undefined)
              : {
                  ...entry,
                  state: "running",
                },
          );
          break;
        case "acknowledged":
          changed(toolUseId, isOutcomeQuery, approval?.feedback === WITHDRAWN ? "withdrawn" : "denied");
          break;
        case "completed":
          changed(
            toolUseId,
            isOutcomeQuery,
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
            if (entry === undefined) return;
            if (removed) {
              live.delete(toolUseId);
              signal.emit();
              return;
            }
            if (entry.ask_id === undefined) return;
            let { classifier_eligible: classifierEligible, ...rest } = finish(entry, undefined);
            live.set(
              toolUseId,
              classifierEligible === false
                ? {
                    ...rest,
                    classifier_eligible: classifierEligible,
                  }
                : rest,
            );
            break;
          }
          changed(toolUseId, isOutcomeQuery, "refused", envelope_2.code);
          break;
        case "failed":
          changed(toolUseId, isOutcomeQuery, "failed", envelope_2.code);
          break;
      }
      dirty = true;
      signal.emit();
    },
    workerGone: () => {
      let filtered = [...live.values()].filter((callId) => callId.state === "asked");
      if (filtered.length === 0) return;
      filtered.forEach((asked) => live.delete(asked.call_id));
      signal.emit();
    },
    clear: () => {
      if (live.size === 0) return;
      live.clear();
      signal.emit();
    },
    report: () =>
      dirty || live.size > 0
        ? {
            live: [...live.values()],
            recent,
          }
        : undefined,
    onChanged: (listener) => signal.subscribe(listener),
  };
}
//@ chunk-keyy05re.js:9025-9078 placement
function isReplayedOutcome(entry) {
  return "replayed" in entry && entry.replayed === true;
}
//@ chunk-keyy05re.js:9078-9178 placement
function isFailedServedCall(entry) {
  return (
    (entry.outcome === "failed" || (entry.outcome === "refused" && entry.code !== "unknown_call")) &&
    !isReplayedOutcome(entry)
  );
}
//@ chunk-keyy05re.js:9178-9916 placement
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
  constructor(clock, idleReleaseMs, isBusy, onIdle) {
    this.clock = clock;
    this.idleMs = idleReleaseMs;
    this.isBusy = isBusy;
    this.onIdle = onIdle;
    this.lastActivityAt = clock.now();
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
  arm(ms) {
    let min = Math.min(ms, 60000);
    this.lookDueAt = this.clock.now() + min;
    this.cancel = this.clock.setTimeout(() => this.look(), min);
  }
  look() {
    this.cancel = undefined;
    if (this.stopped) return;
    let now = this.clock.now();
    let busy = this.isBusy();
    let late = now - this.lookDueAt > 60000;
    if (busy || this.busyAtLastLook || late) this.lastActivityAt = now;
    this.busyAtLastLook = busy;
    let idleFor = now - this.lastActivityAt;
    if (idleFor >= this.idleMs) {
      this.stopped = true;
      this.onIdle();
      return;
    }
    this.arm(this.idleMs - idleFor);
  }
}
//@ chunk-keyy05re.js:9916-9961 placement
var SERVED_TOOLS_IDLE_LOOK_MS = 30000;
var ANNOUNCES_RETURN = "announces_return";
var SERVED_TOOLS_IDLE_GRACE_MS = 120000;
//@ chunk-keyy05re.js:9961-13605 placement
/**
 * 无头云会话的"本机工具服务"特性：未绑定或不可用时报告 off，否则通过会话通道宣布本机工具并处理撤回/拒绝/验证状态。
 */
function createServedToolsFeature(session) {
  return (email) => {
    if (!email.bound) return servedToolsOff("not_bound");
    if (email.servedTools === undefined) return servedToolsOff(email.servedToolsUnavailable);
    let featureSession = null;
    let announced = false;
    let returnedFlag = false;
    let asleep = false;
    let reconnectPending = false;
    let hostSleep = false;
    let state = {
      at: "pending",
    };
    let activity;
    let signal = createSignal();
    let signal_2 = createSignal();
    let servedToolsTracker = createServedToolsTracker({
      now: Date.now,
      maxAskMs: () => inFlight.servedHost()?.limits.max_ask_ms,
    });
    servedToolsTracker.onChanged(() => signal_2.emit());
    let lastNotice;
    let setState = (next) => {
      state = next;
      if (next.at !== "on" && next.at !== "misfit") servedToolsTracker.clear();
      signal.emit();
    };
    let policy = remoteToolServingPolicyName();
    let noticeBacklog = createNoticeBacklog();
    let { onAnnounceOutcome, onRevoked, onNotice, buildAnnounce, ...toolsNoticeBacklog } = email.servedTools;
    let channelOptions = false;
    let announceSettled = false;
    let isSleeping = false;
    let sawAnnounce;
    let retryNext = 0;
    let inFlight = session.openChannel({
      ...toolsNoticeBacklog,
      onAnnounceOutcome: (outcome, detail, misfit) => {
        if (!reconnectPending && outcome.kind !== "failed") asleep = false;
        if (outcome.kind === "announced") {
          announceSettled = channelOptions;
          if (
            misfit === undefined &&
            outcome.status === "announced" &&
            (activity?.key === "computer_too_old" || activity?.key === "session_too_old")
          )
            activity = undefined;
          setState(
            misfit !== undefined
              ? {
                  at: "misfit",
                  misfit,
                }
              : {
                  at: outcome.status === "announced" ? "on" : "withdrawn",
                },
          );
        } else if (outcome.kind === "refused")
          setState({
            at: outcome.reason === UNVERIFIED_SENDER_2 ? "unverified" : "refused",
          });
        else if (outcome.kind === "unsupported")
          setState({
            at: "refused",
          });
        onAnnounceOutcome?.(outcome, detail, misfit);
      },
      onRevoked: (revoke) =>
        onRevoked((reason) => {
          setState({
            at: "revoked",
            reason,
          });
          revoke(reason);
        }),
      onNotice: (line, level) => {
        activity = {
          key: line,
          text: level,
        };
        noticeBacklog.publish(level, "warning");
        onNotice?.(line, level);
        signal_2.emit();
      },
      buildAnnounce: (caps, base, allow) => {
        channelOptions = isServedToolsHeadlessEnabled();
        let capabilities = [
          ...(channelOptions ? [ANNOUNCES_RETURN] : []),
          ...(isStillHereOnCached() ? [SAYS_STILL_HERE] : []),
        ];
        return buildAnnounce(
          capabilities.length > 0
            ? {
                ...caps,
                host: {
                  ...caps.host,
                  capabilities: [...(caps.host.capabilities ?? []), ...capabilities],
                },
              }
            : caps,
          base,
          allow,
        );
      },
      onServedCall: {
        requestStarted: () => {
          retryNext++;
          sawAnnounce?.noteActivity();
        },
        requestEnded: () => {
          retryNext = Math.max(0, retryNext - 1);
          sawAnnounce?.noteActivity();
        },
        legStarted: (leg, startedAt) => {
          if (startedAt !== undefined) lastNotice = Math.max(lastNotice ?? -1 / 0, Date.now() - startedAt);
          servedToolsTracker.legStarted(leg);
        },
        legAnswered: (call, answer) => servedToolsTracker.legAnswered(call, answer),
      },
      sessionId: email.sessionId,
      manager: () => featureSession,
    });
    return {
      feature: "tools",
      status: noticeBacklog,
      onSettled: (listener) => {
        signal.subscribe(listener);
        if (state.at !== "pending") listener();
      },
      onReportChanged: (listener) => {
        signal_2.subscribe(listener);
      },
      sessionCallbacks: {
        ...inFlight.callbacks,
        onWorkerLive: () => {
          if (session.controlOnly === true && returnedFlag) inFlight.requestAnnounce("reconnected");
          else if (isSleeping && (asleep || (announceSettled && isServedToolsHeadlessEnabled())))
            inFlight.requestAnnounce("returned");
          isSleeping = false;
          returnedFlag = false;
          inFlight.callbacks.onWorkerLive?.();
        },
        onStreamSilent: (event) => {
          if (
            event.suspended ||
            reconnectPending ||
            !isStillHereOnCached() ||
            lastNotice === undefined ||
            Date.now() - lastNotice > SERVED_TOOLS_IDLE_GRACE_MS ||
            servedToolsTracker.report()?.live.some((event) => event.state === "running") !== true
          )
            return;
          inFlight.sayStillHere();
        },
        onWorkerGone: () => {
          returnedFlag = true;
          isSleeping = false;
          inFlight.callbacks.onWorkerGone?.();
          servedToolsTracker.workerGone();
        },
      },
      onSession: (servingSession) => {
        featureSession = servingSession.manager;
        if (email.trigger === "create") featureSession.beginWorkerStart();
        let { endServing } = servingSession;
        let { idleReleaseMs } = session;
        if (session.controlOnly === true && idleReleaseMs !== undefined && endServing !== undefined) {
          sawAnnounce = new IdleWatcher(
            servingSession.clock ?? systemClock,
            idleReleaseMs,
            () =>
              retryNext > 0 ||
              (servedToolsTracker.report()?.live.length ?? 0) > 0 ||
              inFlight.hasBackgroundWork(),
            () => {
              logForDebugging(
                `[servedTools] this session ran nothing here for ${Math.round(idleReleaseMs / 60000)} min: letting it go`,
              );
              if (featureSession?.workerLive() === true) logFeatureOk("rtc_idle_release");
              else logFeatureSad("rtc_idle_release", "no_worker");
              setState({
                at: "left",
                leftFor: "idle",
              });
              endServing("idle");
            },
          );
          servedToolsTracker.onChanged(() => sawAnnounce?.noteActivity());
        }
      },
      onWorkerLive: () => {
        featureSession?.endWorkerStart();
        inFlight.requestAnnounce("attached");
      },
      onStreamConnected: (event) => {
        if (announced) {
          let isGap =
            asleep ||
            (event !== undefined && (event.driftRedial || event.gapMs >= SERVED_TOOLS_IDLE_LOOK_MS));
          if (reconnectPending) hostSleep ||= isGap;
          else isSleeping ||= isGap;
          inFlight.requestAnnounce("reconnected");
        }
        announced = true;
      },
      onHostWake: () => {
        reconnectPending = false;
        let needsAnnounce = asleep || hostSleep;
        hostSleep = false;
        inFlight.hostWoke(needsAnnounce);
        return needsAnnounce;
      },
      onHostSleep: async () => {
        reconnectPending = true;
        isSleeping = false;
        hostSleep = false;
        let say = inFlight.sayAsleep();
        if (say === null) return;
        asleep = true;
        if (!(await say)) asleep = false;
      },
      onWorkerInit: (init) =>
        inFlight.requestAnnounce("worker_init", {
          workerEpoch: init.workerEpoch,
        }),
      report: () => {
        let host = inFlight.servedHost();
        let calls = servedToolsTracker.report();
        return {
          ...(state.at === "on"
            ? {
                state: "forwarded",
                source: "default",
              }
            : {
                state: "off",
                reason:
                  state.at === "withdrawn"
                    ? "serving_off"
                    : state.at === "left"
                      ? leftStateFor(state.leftFor)
                      : state.at === "misfit"
                        ? servedToolsStatusReport(state).reason
                        : "not_announced",
              }),
          ...(activity !== undefined && {
            message: truncateStatusMessage(activity.text),
          }),
          facts: {
            ...(host !== undefined && {
              host: {
                handle: host.name,
                working_dir: host.working_dir,
                platform: host.platform,
                ...(host.claude_code_version !== undefined && {
                  cli_version: host.claude_code_version,
                }),
              },
            }),
            serving: {
              ...servedToolsStatusReport(state),
              policy,
              channel: "session",
            },
            ...(calls !== undefined && {
              calls,
            }),
          },
        };
      },
      dispose: (options) => {
        sawAnnounce?.stop();
        let leftFor = options?.leftFor;
        if (leftFor !== undefined && state.at !== "left")
          setState({
            at: "left",
            leftFor,
          });
        return inFlight.close(leftFor);
      },
    };
  };
}
//@ chunk-keyy05re.js:13605-14061 placement
function servedToolsStatusReport(state) {
  switch (state.at) {
    case "pending":
      return {
        state: "pending",
      };
    case "on":
      return {
        state: "on",
      };
    case "withdrawn": {
      let withdrawn = remoteToolServingOffReason();
      return {
        state: "off",
        ...(withdrawn !== undefined && {
          reason: withdrawn,
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
        reason: state.reason,
      };
    case "left":
      return {
        state: "off",
        reason: leftStateFor(state.leftFor),
      };
    case "misfit":
      return {
        state: "off",
        reason: misfitDirection(state.misfit),
      };
  }
}
//@ chunk-keyy05re.js:14061-14258 placement
function truncateStatusMessage(state) {
  if (truncateToLength(state, CLOUD_LINE_MAX_CHARS) === state) return state;
  let trimmed = truncateToLength(state, CLOUD_LINE_MAX_CHARS);
  let max = Math.max(trimmed.lastIndexOf(" \u2014 "), trimmed.lastIndexOf("; "), trimmed.lastIndexOf(". "));
  let cut = max > 0 ? max : trimmed.lastIndexOf(" ");
  return (cut > 0 ? trimmed.slice(0, cut) : trimmed).trimEnd();
}
//@ chunk-keyy05re.js:14258-14559 placement
function servedToolsOff(servedToolsUnavailable) {
  logForDebugging(
    `[servedTools] not served over the session channel: ${servedToolsUnavailable ?? "not_served"}`,
  );
  let reason = {
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
    report: () => reason,
  };
}
export { truncateStatusMessage, createServedToolsFeature };

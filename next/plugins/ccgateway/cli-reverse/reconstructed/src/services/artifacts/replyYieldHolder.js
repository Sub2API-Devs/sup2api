/**
 * services/artifacts/replyYieldHolder.ts
 *
 * 2.1.316 新增。注册 artifact 评论自动回复的让出/接管持有者。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-3b4rsbq5.js (18), chunk-czq1j3j2.js (1)
 * attribution: placement 19
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  listRegisteredSessionRecords,
  ownMessagingSocket,
  sendStampedControlToUdsSocket,
  sendControlToUdsSocket,
} from "../../utils/udsMessaging/udsClient.js";
import { logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { isCrossSessionMessagingEnabled } from "../../utils/crossSessionMessagingGate.js";
import { canonicalSocketPath } from "../../utils/udsPaths.js";
import {
  unrefTimers,
  MAX_YIELD_SLUGS,
  waitForYieldAnswer,
  takeOutstandingLost,
  setYieldHolder,
} from "./replyYield.js";
import { ARTIFACT_YIELD_PEER_FEATURE } from "../../utils/concurrentSessions.js";
import { isBackgroundSurface, describeReplyHolder } from "./comments/replyYield.js";
import { udsAddressFromPath } from "../../utils/peerMessageHeaders.js";
import { getPlatform } from "../../utils/platform.js";
import { getLiveState } from "../liveReplica/liveReplica.js";
import {
  isSlugStopped,
  isSlugSwept,
  isSlugYielded,
  markYieldAnnounced,
  isYieldedMessage,
  isStoppedElsewhere,
  isYieldAnnounced,
  recordYieldedMessage,
  isSlugOrphaned,
  clearSummonWakeTimers,
  bumpSlugEpoch,
  emitSummonArm,
  settleYieldedMessage,
  getSummonWakeState,
} from "./summonArms.js";
import { logForDebugging } from "../../utils/debug.js";
import {
  fragmentForLog,
  redactFragmentForLog,
  isExpectedSendError,
} from "../../utils/udsMessaging/peerGuard.js";
import { isProcessRunning } from "../../utils/genericProcessUtils.js";
import { createMessageEnvelope } from "../../utils/udsMessaging/messageEnvelope.js";
import { getOriginalCwd, mainAgentId } from "../../bootstrap/state.js";
import { enqueuePendingNotification } from "../../utils/messageQueueManager.js";
import { formatTaskNotification } from "../../utils/xmlTags.js";
import { ARTIFACT_WATCH_LIFECYCLE } from "../../constants/xml.js";
import { escapeXml_2 as escapeXml } from "../../utils/confusables.js";
import { getBootingAutoReactSlugs } from "../artifactComments/autoReplyNotices.js";
import { stopCommentMonitorIntent } from "./commentMonitor.js";
import { isMonitorSocketOpenNow } from "../../tasks/MonitorWsTask/MonitorWsTask.js";
import { scheduleThreadScan } from "./comments/threadScanner.js";
import { claudeAiEnvironment } from "../../constants/claudeAiOrigin.js";
import { artifactViewerUrlFor } from "../../tools/ArtifactTool/artifactUrls.js";
import { createSystemMessage } from "../../utils/messages.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-3b4rsbq5.js:1086-1151 placement
var SEND_RETRY_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SEND_STEP_MS;
var EMPTY_ARMABLE_STATE;
deferInit("chunk-3b4rsbq5.js:1086", () => {
  SEND_RETRY_MS = 1000;
  SEND_STEP_MS = 200;
  EMPTY_ARMABLE_STATE = {
    armable: new Set(),
    yielded: new Set(),
    undo: () => {},
  };
});
//@ chunk-3b4rsbq5.js:1151-1282 placement
async function findOwnSessionRecord() {
  let found = (await listRegisteredSessionRecords()).find((record) => record.pid === process.pid);
  return found === undefined
    ? undefined
    : {
        sessionId: found.sessionId,
        tmux: found.tmux,
      };
}
//@ chunk-3b4rsbq5.js:1282-1592 placement
async function requestReplyTakeover(options) {
  let result = await requestReplyTakeoverUnchecked(options).finally(() => options.claim?.end());
  if (result.kind === "took_over")
    logFeatureOk("artifact_live_subscribe", {
      took_over: true,
      holders: options.holders.length,
      armable_count: result.armable.size,
      yielded_count: result.yielded.size,
    });
  else
    logFeatureSad("artifact_live_subscribe", `takeover_${result.kind}`, {
      holders: options.holders.length,
    });
  return result;
}
//@ chunk-3b4rsbq5.js:1592-5932 placement
/**
 * 向持有者请求接管自动回复
 */
async function requestReplyTakeoverUnchecked(options) {
  if (!isCrossSessionMessagingEnabled())
    return {
      ...EMPTY_ARMABLE_STATE,
      kind: "messaging_off",
    };
  let sock = ownMessagingSocket();
  if (sock === undefined || options.holders.length === 0)
    return {
      ...EMPTY_ARMABLE_STATE,
      kind: "no_inbox",
    };
  let ownPath = canonicalSocketPath(sock);
  let ownRecord = options.transport?.ownRecord ?? findOwnSessionRecord;
  let record = await ownRecord().catch(() => {
    return;
  });
  if (record?.sessionId !== options.conversationId) {
    let timers = options.transport?.timers ?? unrefTimers;
    await new Promise((resolve) => void timers.setTimeout(resolve, SEND_STEP_MS));
    record = await ownRecord().catch(() => {
      return;
    });
  }
  if (record?.sessionId !== options.conversationId)
    return {
      ...EMPTY_ARMABLE_STATE,
      kind: "registry_stale",
    };
  let tmux = record.tmux;
  if (options.holdersIncomplete === true && !options.alreadyReplying)
    return {
      ...EMPTY_ARMABLE_STATE,
      kind: "holder_unreachable",
    };
  let msg = options.slugs
    .filter((slug) => !(options.claim?.lost.has(slug) ?? false))
    .slice(0, MAX_YIELD_SLUGS);
  if (msg.length === 0)
    return {
      ...EMPTY_ARMABLE_STATE,
      kind: "nothing_freed",
    };
  let holders = [];
  for (let holder of options.holders) {
    if (
      holder.sock === undefined ||
      holder.sock === "" ||
      !(holder.peerFeatures?.includes(ARTIFACT_YIELD_PEER_FEATURE) ?? false) ||
      canonicalSocketPath(holder.sock) === ownPath ||
      isBackgroundSurface(holder.kind)
    ) {
      if (options.alreadyReplying) continue;
      return {
        ...EMPTY_ARMABLE_STATE,
        kind: "holder_unreachable",
      };
    }
    holders.push({
      sock: holder.sock,
      pid: holder.pid,
    });
  }
  if (holders.length === 0)
    return {
      ...EMPTY_ARMABLE_STATE,
      kind: "holder_unreachable",
    };
  let send = options.transport?.send ?? sendStampedControlToUdsSocket;
  let sendControl = options.transport?.sendControl ?? sendControlToUdsSocket;
  let timers = options.transport?.timers ?? unrefTimers;
  let now = options.transport?.now ?? Date.now;
  let from = udsAddressFromPath(sock);
  let sendOpts = (expectPeerPid) =>
    getPlatform() !== "windows"
      ? {
          expectPeerPid,
        }
      : {};
  let attempts = [];
  let takenSlugs = new Set();
  let { wakes, autoReact, durable } = getLiveState();
  let recordYield = (entry) => {
    for (let slug of entry.yielded) {
      let takeovers = wakes.takenFrom.get(slug) ?? [];
      if (!takeovers.some((takeover) => takeover.msgId === entry.msgId))
        wakes.takenFrom.set(slug, [
          ...takeovers,
          {
            sock: entry.sock,
            pid: entry.pid,
            msgId: entry.msgId,
          },
        ]);
      if (
        options.alreadyReplying &&
        (autoReact.userDisarmed ||
          durable.stopLatches.isStopped(slug) ||
          (isSlugStopped(slug) && !isSlugSwept(slug)))
      )
        notifyTakenOverSlugStopped(slug, sendControl);
    }
  };
  let claimedAt = options.claim?.sentAt ?? now();
  let unyield = (attempt, only, opts) => {
    let slugs =
      opts?.precautionary !== undefined
        ? [...opts.precautionary]
        : [...attempt.yielded].filter((slug) => only === undefined || only.has(slug));
    if (slugs.length === 0) return;
    for (let slug of slugs) attempt.yielded.delete(slug);
    logFeatureOk("artifact_live_subscribe", {
      [opts?.precautionary !== undefined ? "takeover_unyield_precautionary" : "takeover_handed_back"]:
        slugs.length,
    });
    let envelope = {
      action: "unyield_artifact_replies",
      orig_msg_id: attempt.msgId,
      slugs,
      ...(opts?.stopped === true && {
        stopped: true,
      }),
    };
    sendControl(attempt.sock, envelope, sendOpts(attempt.pid)).catch((error) => {
      logForDebugging(
        `[reply-yield] unyield to ${fragmentForLog(attempt.sock)} failed: ${redactFragmentForLog(String(error))}`,
      );
      if (isExpectedSendError(error) && !isProcessRunning(attempt.pid)) {
        logFeatureSad("artifact_live_subscribe", "unyield_holder_gone");
        return;
      }
      let retrySend = () =>
        void sendControl(attempt.sock, envelope, sendOpts(attempt.pid)).catch(() => {
          logFeatureSad("artifact_live_subscribe", "unyield_send_failed");
        });
      if (isExpectedSendError(error)) timers.setTimeout(retrySend, SEND_RETRY_MS);
      else retrySend();
    });
  };
  let pending = [];
  for (let holder of holders) {
    let messageEnvelope = createMessageEnvelope();
    let attempt = {
      sock: holder.sock,
      pid: holder.pid,
      msgId: messageEnvelope.msg_id,
      yielded: new Set(),
    };
    attempts.push(attempt);
    let answer = waitForYieldAnswer(messageEnvelope.msg_id, msg, {
      sentAt: claimedAt,
      expectPid: holder.pid,
      ...(options.transport?.timeoutMs !== undefined && {
        timeoutMs: options.transport.timeoutMs,
      }),
      ...(options.transport?.timers !== undefined && {
        timers: options.transport.timers,
      }),
      onLate: (late) => {
        if (late.kind !== "yielded") return;
        for (let slug of late.yielded) attempt.yielded.add(slug);
        let lostTo = new Map([...(options.claim?.lost ?? []), ...late.lostTo]);
        unyield(
          attempt,
          new Set(
            [...attempt.yielded].filter((slug) =>
              lostTo.has(slug)
                ? isReplyHolderCandidate(slug, attempt, lostTo, options.alreadyReplying === true)
                : !options.alreadyReplying && !takenSlugs.has(slug),
            ),
          ),
        );
        recordYield(attempt);
      },
    });
    pending.push(
      (async () => {
        try {
          await send(
            holder.sock,
            {
              action: "yield_artifact_replies",
              from,
              session_id: options.conversationId,
              slugs: msg,
              reason: options.reason,
              sent_at: now(),
              claimed_at: claimedAt,
              requester: {
                cwd: getOriginalCwd(),
                ...(tmux !== undefined && {
                  tmux,
                }),
              },
            },
            messageEnvelope,
            sendOpts(holder.pid),
          );
        } catch (error) {
          if (isExpectedSendError(error)) {
            let lost = takeOutstandingLost(messageEnvelope.msg_id);
            let lost_2 = lost.map(([slug]) => slug);
            return isProcessRunning(holder.pid)
              ? {
                  kind: "unreachable",
                  lost: lost_2,
                  lostTo: lost,
                }
              : {
                  kind: "gone",
                  lost: lost_2,
                  lostTo: lost,
                };
          }
        }
        return answer;
      })(),
    );
  }
  let results = await Promise.all(pending);
  let yieldCount = new Map();
  let notHeldCount = new Map();
  let answeredCount = new Map();
  let lostToMap = new Map(options.claim?.lost ?? []);
  let allYielded = true;
  let refused = false;
  let answeredTotal = 0;
  results.forEach((result, index) => {
    for (let [slug, holder] of result.lostTo) lostToMap.set(slug, holder);
    if (result.kind === "gone") return;
    answeredTotal++;
    if (result.kind === "unreachable") {
      allYielded = false;
      return;
    }
    if (result.kind === "yielded") {
      for (let slug of result.yielded) {
        attempts[index].yielded.add(slug);
        yieldCount.set(slug, (yieldCount.get(slug) ?? 0) + 1);
      }
      for (let slug of result.notHeld) notHeldCount.set(slug, (notHeldCount.get(slug) ?? 0) + 1);
      for (let slug of new Set([...result.yielded, ...result.notHeld]))
        answeredCount.set(slug, (answeredCount.get(slug) ?? 0) + 1);
    } else {
      allYielded = false;
      if (result.kind === "refused") refused = true;
    }
  });
  let armable = new Set();
  let yielded = new Set();
  if (allYielded && !refused)
    for (let slug of msg) {
      if (lostToMap.has(slug) || (answeredCount.get(slug) ?? 0) !== answeredTotal) continue;
      if ((yieldCount.get(slug) ?? 0) > 0) {
        armable.add(slug);
        yielded.add(slug);
      } else if ((notHeldCount.get(slug) ?? 0) === answeredTotal) armable.add(slug);
    }
  for (let slug of armable) takenSlugs.add(slug);
  if (options.alreadyReplying) {
    for (let attempt of attempts)
      for (let slug of attempt.yielded) if (!lostToMap.has(slug)) yielded.add(slug);
  }
  for (let attempt of attempts) {
    let toTake = new Set(
      [...attempt.yielded].filter((slug) =>
        lostToMap.has(slug)
          ? isReplyHolderCandidate(slug, attempt, lostToMap, options.alreadyReplying === true)
          : !options.alreadyReplying && !armable.has(slug),
      ),
    );
    if (toTake.size > 0) unyield(attempt, toTake);
  }
  if (!options.alreadyReplying)
    results.forEach((result, index) => {
      if (result.kind === "timeout")
        unyield(attempts[index], undefined, {
          precautionary: msg,
        });
    });
  for (let attempt of attempts) recordYield(attempt);
  return {
    armable,
    yielded,
    kind: armable.size > 0 ? "took_over" : "nothing_freed",
    undo: (slugs) => {
      for (let attempt of attempts) unyield(attempt, slugs);
      let msgIds = new Set(attempts.map((attempt) => attempt.msgId));
      for (let slug of slugs ?? msg) {
        let filtered = (wakes.takenFrom.get(slug) ?? []).filter((takeover) => !msgIds.has(takeover.msgId));
        if (filtered.length > 0) wakes.takenFrom.set(slug, filtered);
        else wakes.takenFrom.delete(slug);
      }
    },
  };
}
//@ chunk-3b4rsbq5.js:5932-6013 placement
function isReplyHolderCandidate(context, record, slugs, opts) {
  let entry = slugs.get(context);
  return (
    (entry !== undefined && entry === udsAddressFromPath(record.sock)) || (!opts && !isSlugYielded(context))
  );
}
//@ chunk-3b4rsbq5.js:6013-6045 placement
function notifyTakenOverSlugStopped(slug, postWake = sendControlToUdsSocket) {
  handBackTakenSlugs(slug, true, postWake);
}
//@ chunk-3b4rsbq5.js:6045-6077 placement
function handBackTakenOverSlug(slug, sendControl = sendControlToUdsSocket) {
  handBackTakenSlugs(slug, false, sendControl);
}
//@ chunk-3b4rsbq5.js:6077-6683 placement
/**
 * 把接管的 slug 交还原持有者
 */
function handBackTakenSlugs(slug, stopped, postWake) {
  let { wakes } = getLiveState();
  let taken = wakes.takenFrom.get(slug);
  if (taken === undefined || isSlugYielded(slug)) return;
  wakes.takenFrom.delete(slug);
  for (let entry of taken) {
    let body = {
      action: "unyield_artifact_replies",
      orig_msg_id: entry.msgId,
      slugs: [slug],
      ...(stopped && {
        stopped: true,
      }),
    };
    let wakeOptions =
      getPlatform() !== "windows"
        ? {
            expectPeerPid: entry.pid,
          }
        : {};
    postWake(entry.sock, body, wakeOptions).catch((error) => {
      logForDebugging(
        `[reply-yield] release to ${fragmentForLog(entry.sock)} failed: ${redactFragmentForLog(String(error))}`,
      );
      if (isExpectedSendError(error) && !isProcessRunning(entry.pid)) return;
      let finish = () =>
        void postWake(entry.sock, body, wakeOptions).catch(() => {
          logFeatureSad("artifact_live_subscribe", "takeover_release_failed");
        });
      if (isExpectedSendError(error)) unrefTimers.setTimeout(finish, SEND_RETRY_MS);
      else finish();
    });
  }
  logFeatureOk("artifact_live_subscribe", {
    [stopped ? "takeover_stop_notified" : "takeover_released"]: taken.length,
  });
}
//@ chunk-3b4rsbq5.js:6683-6786 placement (2.1.88 match: formatFailureDetails, 0.776)
function formatFailureDetails(failures) {
  let sliced = failures.slice(0, 2);
  let remaining = failures.length - sliced.length;
  return `${sliced.join(", ")}${remaining > 0 ? ` and ${remaining} more` : ""}`;
}
//@ chunk-3b4rsbq5.js:6786-7291 placement
/**
 * 交互会话的通知/恢复处理（与插件无关，见 lead 建议）。
 */
function repliesYieldedLine(slugs, holder, count, now) {
  let line = describeReplyHolder(
    {
      kind: "interactive",
      ...(typeof count.cwd === "string" && {
        cwd: count.cwd,
      }),
      ...(typeof count.tmux === "string" && {
        tmux: count.tmux,
      }),
    },
    now,
  );
  let out =
    holder === "resume"
      ? `the session that just resumed this conversation in ${line}`
      : `another session of this conversation (${line}), which just published or resumed them there`;
  return `Automatic replies to comments on ${formatFailureDetails(slugs)} moved to ${out}; this session keeps watching for new versions only. To take them back here, publish the Artifact again or ask Claude to resume its replies.`;
}
//@ chunk-3b4rsbq5.js:7291-7494 placement
function repliesYieldRevertedLine(options) {
  return `Automatic replies to comments on ${formatFailureDetails(options)} are back in this session: the other session of this conversation did not keep them (it could not take them over, or it has since exited).`;
}
//@ chunk-3b4rsbq5.js:7494-7728 placement
function repliesStoppedElsewhereLine(options) {
  return `Automatic replies to comments on ${formatFailureDetails(options)} were stopped in the other session of this conversation, so they stay off here too. To turn them back on, publish the Artifact again or ask Claude to resume its replies.`;
}
//@ chunk-3b4rsbq5.js:7728-8459 placement
/**
 * 自动回复已移到其他会话的通知
 */
var REPLIES_MOVED_NOTICE =
  "Automatic replies to comments on the Artifact(s) this session was answering moved to another session of this same conversation on this machine, at its request; this session keeps its version watch only. Nothing to do \u2014 do not stop or re-arm a watch on your own; a publish the user asks for here takes them back.";
var REPLIES_STOPPED_NOTICE =
  "The automatic comment replies this session had handed to another session of this conversation were stopped by the user there; they stay stopped here too. Nothing to do unless the user asks to resume them or to publish again.";
var REPLIES_RETURNED_NOTICE =
  "The automatic comment replies are back with this session: the other session of this conversation did not keep them (it could not take them over, or it has since exited).";
//@ chunk-3b4rsbq5.js:8459-8958 placement
function notifyModelOfReplyYield(slugs, options) {
  let text =
    slugs === "yielded"
      ? `Comment replies on ${options} Artifact(s) moved to another session of this conversation`
      : slugs === "reverted"
        ? `Comment replies on ${options} Artifact(s) are back with this session`
        : `Comment replies on ${options} Artifact(s) were stopped in the other session`;
  let out =
    slugs === "yielded"
      ? REPLIES_MOVED_NOTICE
      : slugs === "reverted"
        ? REPLIES_RETURNED_NOTICE
        : REPLIES_STOPPED_NOTICE;
  enqueuePendingNotification({
    value: formatTaskNotification({
      taskType: ARTIFACT_WATCH_LIFECYCLE,
      summary: escapeXml(text),
      body: `
<event>${escapeXml(out)}</event>`,
    }),
    mode: "task-notification",
    passive: true,
    priority: "next",
    origin: {
      kind: "task-notification",
      source: ARTIFACT_WATCH_LIFECYCLE,
    },
    agentId: mainAgentId(),
  });
}
//@ chunk-3b4rsbq5.js:8958-9635 placement
/**
 * 注册 artifact 评论自动回复的让出/接管持有者。
 */
function registerReplyYieldHolder(table) {
  setYieldHolder(
    (request) => {
      let partition = partitionSlugsForYield(request.slugs, request.msgId);
      let newlyYielded = partition.newlyYielded;
      if (newlyYielded.length > 0)
        logFeatureOk("artifact_comments_autoreact", {
          yielded_to_other_session: newlyYielded.length,
        });
      return {
        yielded: partition.yielded,
        notHeld: partition.notHeld,
        ...(newlyYielded.length > 0 && {
          onDelivered: () => {
            let filtered = newlyYielded.filter((slug) => isSlugYielded(slug));
            for (let slug of filtered) markYieldAnnounced(slug);
            if (filtered.length > 0) table.yielded(filtered, request.reason, request.requester);
          },
        }),
      };
    },
    (msgId, reason, requester) => {
      for (let slug of reason) if (requester?.stopped?.has(slug) ?? false) isYieldedMessage(slug, msgId);
      let stoppedElsewhere = new Set(reason.filter((slug) => isStoppedElsewhere(slug)));
      let announced = new Set(reason.filter((slug) => isYieldAnnounced(slug)));
      let released = releaseYieldedSlugs(msgId, reason);
      let filtered = released.filter(
        (slug) =>
          announced.has(slug) &&
          !isSlugStopped(slug) &&
          isReplyWired(slug) &&
          !(requester?.transferring?.has(slug) ?? false),
      );
      if (filtered.length > 0) table.reverted(filtered);
      let filtered_2 = released.filter((slug) => announced.has(slug) && stoppedElsewhere.has(slug));
      if (filtered_2.length > 0) table.stoppedElsewhere(filtered_2);
      return released;
    },
  );
  return () => setYieldHolder(null);
}
//@ chunk-3b4rsbq5.js:9635-9996 placement
/**
 * 按是否可让出分组 slug
 */
function partitionSlugsForYield(slugs, msgId) {
  let { live, autoReact, durable } = getLiveState();
  let yielded = [];
  let notHeld = [];
  let lost = [];
  for (let slug of slugs) {
    if (isSlugYielded(slug)) {
      recordYieldedMessage(slug, msgId);
      yielded.push(slug);
      continue;
    }
    let wired = isReplyWired(slug);
    let swept = isSlugSwept(slug) && !isSlugOrphaned(slug);
    let notStopped =
      autoReact.wakeEnabledMemo !== false &&
      !autoReact.userDisarmed &&
      !durable.stopLatches.isStopped(slug) &&
      (!isSlugStopped(slug) || swept);
    if (!wired || !notStopped) {
      notHeld.push(slug);
      continue;
    }
    recordYieldedMessage(slug, msgId);
    clearSummonWakeTimers(slug);
    bumpSlugEpoch(slug);
    emitSummonArm(live, slug);
    yielded.push(slug);
    lost.push(slug);
  }
  return {
    yielded,
    notHeld,
    newlyYielded: lost,
  };
}
//@ chunk-3b4rsbq5.js:9996-10152 placement
/**
 * 该 slug 的自动回复是否已接线
 */
function isReplyWired(slug) {
  let { live } = getLiveState();
  let supervisor = live.supervisors.get(slug);
  return (
    (supervisor !== undefined && !supervisor.stopped && supervisor.autoReactWiring !== undefined) ||
    live.inFlightWiredIntent.has(slug) ||
    getBootingAutoReactSlugs().has(slug)
  );
}
//@ chunk-3b4rsbq5.js:10152-10631 placement
/**
 * 释放已让出的 slug
 */
function releaseYieldedSlugs(entry, slugs) {
  let { live } = getLiveState();
  let released = [];
  for (let slug of slugs) {
    if (!settleYieldedMessage(slug, entry)) continue;
    emitSummonArm(live, slug);
    if (isSlugStopped(slug) && !isSlugSwept(slug)) {
      stopCommentMonitorIntent(slug);
      notifyTakenOverSlugStopped(slug);
    }
    released.push(slug);
    let supervisor = live.supervisors.get(slug);
    if (!isSlugStopped(slug) && !isReplyWired(slug)) handBackTakenOverSlug(slug);
    let lastWakeArgs = getSummonWakeState(slug).lastWakeArgs;
    if (
      !isSlugStopped(slug) &&
      isReplyWired(slug) &&
      supervisor?.taskId !== undefined &&
      isMonitorSocketOpenNow(supervisor.taskId) &&
      lastWakeArgs !== null
    )
      scheduleThreadScan({
        ...lastWakeArgs,
        seed: false,
        confirm: undefined,
        confirmBase: undefined,
        confirmAfter: undefined,
        reentry: undefined,
        idlePass: undefined,
        suppressSummonStatus: undefined,
      });
  }
  if (released.length > 0)
    logFeatureOk("artifact_comments_autoreact", {
      yield_reverted: released.length,
    });
  return released;
}
//@ chunk-czq1j3j2.js:386245-386537 placement
/**
 * 注册 Artifact 回复让出通知：让出/恢复时向转录追加带查看器链接的系统通知；与 newerModelOffer 无关，疑似放错文件。
 */
function registerReplyYieldNotices({ transcript }) {
  {
    let toViewerUrls = (slugs) => {
      let env = claudeAiEnvironment();
      return slugs.map((slug) =>
        artifactViewerUrlFor({
          slug,
          env,
        }),
      );
    };
    let appendNotice = (text) =>
      transcript.apply({
        type: "append",
        messages: [createSystemMessage(text, "notice")],
      });
    return registerReplyYieldHolder({
      yielded: (slugs, reason, requester) =>
        appendNotice(repliesYieldedLine(toViewerUrls(slugs), reason, requester, Date.now())),
      reverted: (slugs) => appendNotice(repliesYieldRevertedLine(toViewerUrls(slugs))),
      stoppedElsewhere: (slugs) => appendNotice(repliesStoppedElsewhereLine(toViewerUrls(slugs))),
    });
  }
  return () => {};
}
export {
  registerReplyYieldNotices,
  handBackTakenOverSlug,
  notifyModelOfReplyYield,
  notifyTakenOverSlugStopped,
  registerReplyYieldHolder,
  repliesStoppedElsewhereLine,
  repliesYieldRevertedLine,
  repliesYieldedLine,
  requestReplyTakeover,
};

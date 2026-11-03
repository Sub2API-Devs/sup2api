/**
 * utils/udsMessaging.ts
 *
 * 跨会话 UDS 消息服务：建立并校验 sockets 目录、绑定 socket、接收 user/control 消息、判定自发消息、空闲通知接线。旧版同名文件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0kp6eg01.js (64)
 * attribution: placement 64
 */
import { randomUUID, randomBytes } from "crypto";
import { resolve, join, basename, dirname, isAbsolute, normalize } from "path";
import { unlink, readdir, realpath, lstat, readlink, mkdir, chmod } from "fs/promises";
import { Socket, createServer } from "net";
import { unlinkSync } from "fs";
import { HostScoped } from "./hostScoped.js";
import {
  getAncestorPidsCheckedAsync,
  getProcessStartTimeAsync,
  getProcessStartTokenLinuxSync,
  getAncestorPidsLinuxSync,
} from "./processIdentity.js";
import { getRootSession, getSessionId, mainAgentId } from "../bootstrap/state.js";
import {
  messagingSocketServerSlot,
  messagingSocketUnavailableReason,
  MESSAGING_SOCKET_TIMEOUT_MS,
} from "./messagingSocket/setup.js";
import { isUuid } from "./udsMessaging/messageEnvelope.js";
import {
  MAX_PENDING_DROP_IDS,
  fragmentForLog,
  redactFragmentForLog,
  normalizePeerDropReason,
  getPeerPid,
  MAX_PEER_MESSAGE_BYTES,
  setOwnUdsHopToken,
} from "./udsMessaging/peerGuard.js";
import { logForDebugging } from "./debug.js";
import {
  inboundRefuseCause,
  logInboundRefused,
  gatedPolicyFor,
  isBypassDefaultHold,
  modeClass_2 as modeClass,
} from "./crossSessionInbound/inboundGate.js";
import {
  sendPromptReceipt,
  settleHeldInboundOnShutdown,
  setSendPeerReceipt,
  setRecordCorrespondent,
  isModeEmitFlagOn,
} from "./crossSessionInbound/inboundMode.js";
import { queuePriorityOrUndefined } from "./messages/messagePredicates.js";
import { escapeTagStringStrict } from "./messages/pluginTags.js";
import { sanitizeAddressPart } from "./swarm/teammateIds.js";
import { dispatchSessionReceiveHooks } from "../plugins/functionHooks/sessionReceive.js";
import { isPeerSendFileEnabled } from "./peerFileTransfer.js";
import {
  stripPeerMessageBody,
  peerMessageInfo,
  isPeerAddress,
  udsAddressFromPath,
  isPeerFromMode,
} from "./peerMessageHeaders.js";
import { enqueueCommand, flushPeerDropReceipts } from "./messageQueueManager.js";
import { noteVettedCorrespondent, getSessionNamingState } from "./sessionNameUniqueness.js";
import { parseAddress, isTrustedSocketPath, isValidPipeOrPath } from "./peerAddress.js";
import {
  admitReceiptForOutstandingSend,
  admitDroppedIdsByDestination,
  debitPacerForReleasedSend,
  creditPacerForHeldSend,
  registeredLivePeerForSocket,
  sendControlToUdsSocket,
  registeredInboxesOfPids,
} from "./udsMessaging/udsClient.js";
import {
  notifyWhenIdleFrameSchema,
  recordIdleSubscription,
  sendUnavailableNotice,
  peerIdleNoticeFrameSchema,
  hasOutstandingIdleSubscription,
  admitIdleNotice,
  noteParkedAtShutdown,
  flushIdleSubscribers,
  setIdleNoticeSender,
  setRegisteredInboxOfPidReader,
} from "./peerIdleSubscriptions.js";
import { logFeatureSad, logFeatureBad, logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { canonicalSocketPath } from "./udsPaths.js";
import {
  yieldRequestSchema,
  answerYieldRequest,
  unyieldRequestSchema,
  handleUnyield,
  yieldedResponseSchema,
  hasOutstanding,
  handleYieldRequest,
  setSendAnswer,
} from "../services/artifacts/replyYield.js";
import { sleep, withDeadline } from "./sleep.js";
import { isAuthItem, tokenRole, deleteSessionRecord, writeSessionPeerRecord } from "./sessionAddresses.js";
import { jsonParseRaw } from "./slowOperations.js";
import { env, udsEnv } from "./env.js";
import { tmpdir } from "./tempDir.js";
import { getErrnoCode, errorMessage, isENOENT, CliUserError } from "./errors.js";
import { printableName } from "./printableName.js";
import { shellQuoteArgs } from "./bash/bashPipeCommand.js";
import { inspectUserNamespace, sharedSystemDirs, getHostUid } from "./sandbox/userNamespace.js";
import { recordPhase } from "./startupTiming.js";
import { profileCheckpoint } from "./startupProfiler.js";
import { isWindowsPlatform, createPeerTokens } from "./sessionPeers.js";
import { registerCleanup } from "./cleanupRegistry.js";
import { isRegistrySweepPermitted } from "./concurrentSessions.js";
import { swarmHostState } from "./swarm/hostState.js";
import { getPlatform } from "./platform.js";

//@ chunk-0kp6eg01.js:1869-1886 placement
var MAX_CACHED_VERDICTS = 500;
var MAX_ANCESTOR_HOPS = 32;
//@ chunk-0kp6eg01.js:1886-2162 placement
/**
 * 判定缓存
 */
class VerdictCache {
  verdicts = new Map();
  lookup(e) {
    let n = this.verdicts.get(e);
    if (n !== undefined) {
      this.verdicts.delete(e);
      this.verdicts.set(e, n);
    }
    return n;
  }
  remember(e, n) {
    if (this.verdicts.size >= MAX_CACHED_VERDICTS) {
      let s = this.verdicts.keys().next().value;
      if (s !== undefined) this.verdicts.delete(s);
    }
    this.verdicts.set(e, n);
  }
}
//@ chunk-0kp6eg01.js:2162-2557 placement
/**
 * 按宿主缓存的祖先进程判定缓存。
 */
var ancestryVerdicts = new HostScoped(() => new VerdictCache());
var ancestryDeps = {
  readAncestors: async (pid) => {
    let { ancestors, readFailed, truncated } = await getAncestorPidsCheckedAsync(pid);
    if (truncated && !readFailed && !ancestors.includes(process.pid))
      ({ ancestors, readFailed, truncated } = await getAncestorPidsCheckedAsync(pid, MAX_ANCESTOR_HOPS));
    if (!ancestors.includes(process.pid)) {
      if (readFailed) throw Error("ancestry walk failed");
      if (truncated) throw Error("ancestry walk truncated (maxDepth) above the prefix");
    }
    return ancestors;
  },
  readStartToken: (e) =>
    getProcessStartTimeAsync(e, {
      skipCache: true,
    }),
};
//@ chunk-0kp6eg01.js:2557-2643 placement
function ancestryIncludesPid(selfSentAncestry, n = process.pid) {
  if (n === 1) return false;
  return Array.isArray(selfSentAncestry) && selfSentAncestry.includes(n);
}
//@ chunk-0kp6eg01.js:2643-3144 placement
/**
 * 判定是否为自身
 */
async function classifyAncestry(e, n = ancestryDeps) {
  if (e === undefined || !Number.isInteger(e) || e <= 0) return "no-evidence";
  let s;
  try {
    s = await n.readStartToken(e);
  } catch {
    s = undefined;
  }
  if (s === undefined) return "no-evidence";
  let o = `${e}:${s}`;
  let a = ancestryVerdicts.of(getRootSession().host);
  let r = a.lookup(o);
  if (r !== undefined) return r ? "self" : "not-self";
  let p;
  try {
    p = await n.readAncestors(e);
  } catch {
    return "no-evidence";
  }
  let _;
  try {
    _ = await n.readStartToken(e);
  } catch {
    _ = undefined;
  }
  if (_ !== s) return "no-evidence";
  let w = process.pid !== 1 && p.includes(process.pid);
  a.remember(o, w);
  return w ? "self" : "not-self";
}
//@ chunk-0kp6eg01.js:3144-3495 placement
/**
 * 是否为自己发送
 */
async function isSelfSent(e) {
  let n = e.selfPid ?? process.pid;
  if (e.selfSentAncestry !== undefined && n !== 1) return ancestryIncludesPid(e.selfSentAncestry, n);
  if (!e.needsVerdict) return false;
  if (n === 1 || e.platform === "windows") return e.childTokenPresented;
  if (e.platform !== "macos") return false;
  let s = await (e.verdictOf ?? classifyAncestry)(e.verifiedPeerPid);
  return s === "self" || (s === "no-evidence" && e.childTokenPresented);
}
//@ chunk-0kp6eg01.js:3495-3532 placement
function udsMessagingState() {
  return messagingSocketServerSlot.of(getRootSession().host);
}
//@ chunk-0kp6eg01.js:3532-3580 placement
function getUdsStartFailureCause() {
  return udsMessagingState().lastStartFailureCause;
}
//@ chunk-0kp6eg01.js:3580-3629 placement
function getUdsStartDegradedCause() {
  return udsMessagingState().lastStartDegradedCause;
}
//@ chunk-0kp6eg01.js:3629-3776 placement
function recordDegradedCause(e) {
  let n = udsMessagingState();
  if (e === "key_publish_failed" && n.lastStartDegradedCause === "primary_dir_refused_fell_back") return;
  n.lastStartDegradedCause = e;
}
//@ chunk-0kp6eg01.js:3776-3807 placement
function getUdsInboxUnavailableReason() {
  return messagingSocketUnavailableReason(udsMessagingState());
}
//@ chunk-0kp6eg01.js:3807-3922 placement = extractErrorTypeFromData (1)
function hasStringType_2(data) {
  if (typeof data !== "object" || data === null) return false;
  if (!("type" in data)) return false;
  return typeof data.type === "string";
}
//@ chunk-0kp6eg01.js:3922-3953 placement
function setOnRename(onRename) {
  udsMessagingState().onRename = onRename;
}
//@ chunk-0kp6eg01.js:3953-3997 placement
function setOnEnableRemoteControl(onEnableRemoteControl) {
  udsMessagingState().onEnableRemoteControl = onEnableRemoteControl;
}
//@ chunk-0kp6eg01.js:3997-4062 placement
function describeMessageId(origMsgId) {
  return isUuid(origMsgId) ? origMsgId : origMsgId === undefined ? "(none)" : "(malformed)";
}
//@ chunk-0kp6eg01.js:4062-4184 placement
function pickUuids(droppedMsgIds) {
  if (!Array.isArray(droppedMsgIds)) return [];
  let n = [];
  for (let s of droppedMsgIds) {
    if (n.length >= MAX_PENDING_DROP_IDS) break;
    if (isUuid(s)) n.push(s);
  }
  return n;
}
//@ chunk-0kp6eg01.js:4184-4226 placement
function setOnPeerMessageStatus(onPeerMessageStatus) {
  udsMessagingState().onPeerMessageStatus = onPeerMessageStatus;
}
//@ chunk-0kp6eg01.js:4226-4258 placement
function setOnEnqueue(onEnqueue) {
  udsMessagingState().onEnqueue = onEnqueue;
}
//@ chunk-0kp6eg01.js:4258-4480 placement
/**
 * 消息 session_id 是否匹配
 */
function sessionIdMatches(e) {
  if (e.session_id !== undefined && e.session_id !== getSessionId()) {
    logForDebugging(
      `[uds-messaging] Dropping ${fragmentForLog(e.type)} message: session_id mismatch (got "${fragmentForLog(String(e.session_id))}", expected "${getSessionId()}")`,
      {
        level: "warn",
      },
    );
    return false;
  }
  return true;
}
//@ chunk-0kp6eg01.js:4480-6032 placement
/**
 * 处理入站用户消息
 */
async function handleInboundUserMessage(e, verifiedPeerPid, s, selfSentAncestry, a) {
  let content = e.message?.content;
  if (typeof content !== "string" || content.length === 0) {
    logForDebugging("[uds-messaging] Ignoring user message with missing or non-string content", {
      level: "warn",
    });
    return;
  }
  if (!sessionIdMatches(e)) return;
  let uuid = typeof e.uuid === "string" ? e.uuid : randomUUID();
  let _ = inboundRefuseCause();
  if (_ !== undefined) {
    logInboundRefused("uds: dropped before attachment materialization", _);
    sendPromptReceipt(
      {
        kind: "peer",
        from: e.from ?? "unknown",
        ...(verifiedPeerPid !== undefined && {
          verifiedPeerPid,
        }),
        ...(isUuid(e.msg_id) && {
          msg_id: e.msg_id,
        }),
      },
      "refused",
    );
    return;
  }
  let w = queuePriorityOrUndefined(e.priority) ?? "next";
  let h = escapeTagStringStrict(content);
  let l = sanitizeAddressPart(e.from_plugin);
  let D = await dispatchSessionReceiveHooks({
    origin: {
      kind: "peer",
      ...(l !== undefined && {
        plugin: l,
      }),
    },
    content: h,
  });
  if (D.consumed !== undefined) return;
  using queueing = D.queueing;
  let c = typeof D.content === "string" ? D.content : h;
  let S = c;
  if (e.file_attachments !== undefined && isPeerSendFileEnabled())
    try {
      let { emitPeerFileReceiveTelemetry, injectPeerFilePrefix, materializeLocalPeerFiles } =
        await import("./chunk-3rcnr5ex.js");
      let A = await materializeLocalPeerFiles(e.file_attachments);
      if (A.received > 0) {
        S = injectPeerFilePrefix(c, A.prefix);
        emitPeerFileReceiveTelemetry("uds", A.received, A.verified);
      }
    } catch (error) {
      logForDebugging(
        `[uds-messaging] Failed to materialize file_attachments: ${redactFragmentForLog(String(error))}`,
        {
          level: "warn",
        },
      );
    }
  let v = await isSelfSentMessage(verifiedPeerPid, selfSentAncestry, a);
  let origin = stripPeerMessageBody(
    {
      kind: "peer",
      from: e.from ?? "unknown",
      ...(verifiedPeerPid !== undefined && {
        verifiedPeerPid,
      }),
      ...(s !== undefined && {
        verifiedPeerProcStart: s,
      }),
      ...(v && {
        selfSent: v,
      }),
      ...(isUuid(e.msg_id) && {
        msg_id: e.msg_id,
      }),
      ...(l !== undefined && {
        plugin: l,
      }),
      ...peerMessageInfo(content),
    },
    S,
    content,
  );
  let R = {
    mode: "prompt",
    agentId: mainAgentId(),
    value: S,
    uuid,
    priority: w,
    origin,
    skipSlashCommands: true,
    isMeta: true,
    skipAttachments: true,
  };
  if (gatedPolicyFor(R) !== "accept") return;
  enqueueCommand(R);
  queueing.queued();
  logForDebugging(`[uds-messaging] Routed user message to queue (priority=${w}): ${fragmentForLog(S, 80)}`);
  udsMessagingState().onEnqueue?.();
  notePeerReplyTarget(R);
}
//@ chunk-0kp6eg01.js:6032-6309 placement
/**
 * 记录对端回复目标
 */
function notePeerReplyTarget(e) {
  let origin = e.origin?.kind === "peer" ? e.origin : undefined;
  let activeSocketPath = udsMessagingState().activeSocketPath;
  if (
    origin !== undefined &&
    origin.selfSent !== true &&
    origin.verifiedPeerPid !== undefined &&
    typeof origin.from === "string" &&
    activeSocketPath !== undefined &&
    vettedPeerReplyTarget(origin.from, activeSocketPath, origin.verifiedPeerPid) !== undefined
  )
    noteVettedCorrespondent(origin.from, origin.verifiedPeerPid, origin.verifiedPeerProcStart);
}
//@ chunk-0kp6eg01.js:6309-6468 placement
function vettedPeerReplyTarget(from, activeSocketPath, verifiedPeerPid) {
  if (!from.startsWith("uds:") || !isPeerAddress(from)) return;
  let target = parseAddress(from).target;
  return target &&
    isTrustedSocketPath(target, activeSocketPath, {
      verifiedPeerPid,
      ownerUids: udsMessagingState().peerDirOwnerUids,
    })
    ? target
    : undefined;
}
//@ chunk-0kp6eg01.js:6468-11170 placement
/**
 * 处理入站消息
 */
async function handleInboundMessage(e, verifiedPeerPid, verifiedPeerProcStart, selfSentAncestry, a) {
  if (!hasStringType_2(e)) {
    logForDebugging("[uds-messaging] Ignoring message without valid type field", {
      level: "warn",
    });
    return;
  }
  if (e.type === "user")
    await handleInboundUserMessage(e, verifiedPeerPid, verifiedPeerProcStart, selfSentAncestry, a);
  else if (e.type === "control") {
    if (!sessionIdMatches(e)) return;
    if (e.action === "rename" && typeof e.name === "string") udsMessagingState().onRename?.(e.name);
    else if (
      e.action === "peer_message_status" &&
      (e.status === "held" ||
        e.status === "denied" ||
        e.status === "expired" ||
        e.status === "delivered" ||
        e.status === "refused" ||
        e.status === "dropped")
    ) {
      let status = e.status === "expired" && e.status_detail === "refused" ? "refused" : e.status;
      let p = admitReceiptForOutstandingSend(e.orig_msg_id, status);
      if (status === "dropped") {
        let _ = normalizePeerDropReason(e.drop_reason);
        let w = admitDroppedIdsByDestination(pickUuids(e.dropped_msg_ids));
        if (p !== undefined) {
          let h = w.get(p.sent.to) ?? {
            sends: [],
            wereHeld: 0,
          };
          h.sends.push(p.sent);
          if (p.wasHeld) h.wereHeld++;
          w.set(p.sent.to, h);
        }
        if (_ === "queue-full")
          for (let [h, { wereHeld: l }] of w) for (let idx = 0; idx < l; idx++) debitPacerForReleasedSend(h);
        if (w.size === 0)
          logForDebugging(
            `[uds-messaging] peer_message_status dropped: neither orig_msg_id=${describeMessageId(e.orig_msg_id)} nor any named id matches an outstanding send`,
          );
        for (let { sends } of w.values())
          udsMessagingState().onPeerMessageStatus?.({
            status,
            sends,
            dropReason: _,
          });
      } else if (p === undefined)
        logForDebugging(
          `[uds-messaging] peer_message_status dropped: no outstanding send matches orig_msg_id=${describeMessageId(e.orig_msg_id)}`,
        );
      else {
        if (status === "held") creditPacerForHeldSend(p.sent.to);
        else if (status === "delivered" && p.wasHeld) debitPacerForReleasedSend(p.sent.to);
        udsMessagingState().onPeerMessageStatus?.({
          status,
          sent: p.sent,
        });
      }
    } else if (e.action === "notify_when_idle") {
      let r = notifyWhenIdleFrameSchema().safeParse(e);
      if (!r.success) {
        logForDebugging("[uds-messaging] notify_when_idle dropped: malformed frame");
        logFeatureSad("cross_session_notify_idle", "malformed_frame");
        return;
      }
      let activeSocketPath = udsMessagingState().activeSocketPath;
      let from = r.data.from;
      let w =
        activeSocketPath !== undefined
          ? vettedPeerReplyTarget(from, activeSocketPath, verifiedPeerPid)
          : undefined;
      if (activeSocketPath === undefined) {
        logForDebugging("[uds-messaging] notify_when_idle dropped: own inbox not bound (shutting down)");
        logFeatureSad("cross_session_notify_idle", "own_inbox_unbound");
      } else if (w === undefined) {
        logForDebugging(
          `[uds-messaging] notify_when_idle dropped: reply address unshaped or outside our socket namespace (${fragmentForLog(from)})`,
        );
        logFeatureSad("cross_session_notify_idle", "unvettable_reply_target");
      } else if (canonicalSocketPath(w) === canonicalSocketPath(activeSocketPath)) {
        logForDebugging(
          "[uds-messaging] notify_when_idle dropped: reply target is this session (self-target)",
        );
        logFeatureSad("cross_session_notify_idle", "self_target_frame");
      } else {
        let selfSent = await isSelfSentMessage(verifiedPeerPid, selfSentAncestry, a);
        let l = recordIdleSubscription(
          from,
          w,
          r.data.msg_id,
          verifiedPeerPid,
          verifiedPeerProcStart,
          a === "peer",
          senderClassOf(r.data.from_mode),
          selfSent,
        );
        logForDebugging(`[uds-messaging] notify_when_idle from ${fragmentForLog(from)}: ${l}`);
        if (l === "full")
          sendUnavailableNotice(w, r.data.msg_id, verifiedPeerPid, a === "peer", verifiedPeerProcStart);
      }
    } else if (e.action === "peer_idle_notice") {
      let r = peerIdleNoticeFrameSchema().safeParse(e);
      if (!r.success) {
        logForDebugging("[uds-messaging] peer_idle_notice dropped: malformed frame");
        logFeatureSad("cross_session_notify_idle", "malformed_notice");
        return;
      }
      if (!hasOutstandingIdleSubscription(r.data.orig_msg_id)) {
        logForDebugging(
          "[uds-messaging] peer_idle_notice: dropped (uncorrelated / already delivered / expired)",
        );
        return;
      }
      let selfSent = await isSelfSentMessage(verifiedPeerPid, selfSentAncestry, a);
      if (
        !admitIdleNotice(
          r.data.orig_msg_id,
          r.data.state,
          r.data.finished_at,
          r.data.detail,
          senderClassOf(r.data.from_mode),
          selfSent,
        )
      )
        logForDebugging(
          `[uds-messaging] peer_idle_notice not admitted: subscription for orig_msg_id=${fragmentForLog(r.data.orig_msg_id)} was already consumed`,
        );
    } else if (e.action === "yield_artifact_replies") {
      let r = yieldRequestSchema().safeParse(e);
      if (!r.success) {
        logForDebugging("[uds-messaging] yield_artifact_replies dropped: malformed frame");
        logFeatureSad("artifact_comments_autoreact", "yield_malformed_frame");
        return;
      }
      let activeSocketPath = udsMessagingState().activeSocketPath;
      let _ =
        activeSocketPath !== undefined
          ? vettedPeerReplyTarget(r.data.from, activeSocketPath, verifiedPeerPid)
          : undefined;
      if (activeSocketPath === undefined || _ === undefined) {
        logForDebugging(
          `[uds-messaging] yield_artifact_replies dropped: ${activeSocketPath === undefined ? "own inbox not bound" : "reply address unshaped or outside our socket namespace"} (${fragmentForLog(r.data.from)})`,
        );
        logFeatureSad("artifact_comments_autoreact", "yield_unvettable_target");
        return;
      }
      if (canonicalSocketPath(_) === canonicalSocketPath(activeSocketPath)) {
        logForDebugging("[uds-messaging] yield_artifact_replies dropped: reply target is this session");
        return;
      }
      let w = await registeredLivePeerForSocket(_);
      if (
        w === undefined ||
        w.sessionId !== getSessionId() ||
        (verifiedPeerPid !== undefined && w.pid !== verifiedPeerPid)
      ) {
        logForDebugging(
          `[uds-messaging] yield_artifact_replies refused: requester is not a verified live session of this conversation (${fragmentForLog(r.data.from)})`,
        );
        logFeatureSad("artifact_comments_autoreact", "yield_requester_unverified");
        answerYieldRequest(
          r.data,
          _,
          verifiedPeerPid === undefined
            ? undefined
            : {
                pid: verifiedPeerPid,
                writeToken: verifiedPeerProcStart,
              },
          Date.now(),
          {
            refuse: true,
          },
        );
        return;
      }
      answerYieldRequest(
        r.data,
        _,
        {
          pid: verifiedPeerPid ?? w.pid,
          procStart:
            verifiedPeerProcStart ??
            (verifiedPeerPid === undefined || verifiedPeerPid === w.pid ? w.procStart : undefined),
          writeToken: verifiedPeerProcStart,
        },
        Date.now(),
      );
    } else if (e.action === "unyield_artifact_replies") {
      let r = unyieldRequestSchema().safeParse(e);
      if (!r.success || !handleUnyield(r.data, verifiedPeerPid))
        logForDebugging(
          "[uds-messaging] unyield_artifact_replies dropped: malformed, uncorrelated or already handed back",
        );
    } else if (e.action === "artifact_replies_yielded") {
      let r = yieldedResponseSchema().safeParse(e);
      if (!r.success) {
        logForDebugging("[uds-messaging] artifact_replies_yielded dropped: malformed frame");
        logFeatureSad("artifact_live_subscribe", "yield_malformed_answer");
        return;
      }
      if (!hasOutstanding(r.data.orig_msg_id)) {
        logForDebugging("[uds-messaging] artifact_replies_yielded dropped: uncorrelated or already settled");
        return;
      }
      handleYieldRequest(r.data, verifiedPeerPid);
    } else logForDebugging(`[uds-messaging] Unhandled control action: ${fragmentForLog(String(e.action))}`);
  } else logForDebugging(`[uds-messaging] Received unhandled message type: ${fragmentForLog(e.type)}`);
}
//@ chunk-0kp6eg01.js:11170-11571 placement
/**
 * 分派入站消息
 */
function routeInboundMessage(e, n, s, o, a) {
  if (
    hasStringType_2(e) &&
    ((e.type === "control" && e.action !== "notify_when_idle") ||
      (e.type === "user" && e.priority === "now" && e.file_attachments === undefined))
  ) {
    handleInboundMessage(e, n, s, o, a).catch((error) => {
      logForDebugging(`[uds-messaging] Failed to process message: ${error}`, {
        level: "warn",
      });
    });
    return;
  }
  udsMessagingState().processingChain = udsMessagingState()
    .processingChain.then(() => handleInboundMessage(e, n, s, o, a))
    .catch((error) => {
      logForDebugging(`[uds-messaging] Failed to process message: ${error}`, {
        level: "warn",
      });
    });
}
//@ chunk-0kp6eg01.js:11571-11583 placement
var IDLE_FLUSH_TIMEOUT_MS = 3000;
//@ chunk-0kp6eg01.js:11583-11669 placement
function awaitProcessingChain(e = 3000) {
  return Promise.race([
    udsMessagingState().processingChain,
    sleep(e, undefined, {
      unref: true,
    }),
  ]);
}
//@ chunk-0kp6eg01.js:11669-13953 placement
/**
 * 处理 UDS 连接
 */
function handleConnection(e) {
  e.setEncoding("utf8");
  let firstLineDeadlineMs = udsMessagingState().firstLineDeadlineMs;
  let timer = setTimeout(() => {
    timer = undefined;
    try {
      logForDebugging(
        `[uds-messaging] Closing a connection that sent no complete line within ${firstLineDeadlineMs} ms`,
      );
      if (!udsMessagingState().silentDropReported) {
        udsMessagingState().silentDropReported = true;
        logFeatureSad("cross_session_inbox_auth", "silent_connection_deadline");
      }
      e.destroy();
    } catch (error) {
      logForDebugging(`[uds-messaging] Failed to close a silent connection: ${error}`, {
        level: "warn",
      });
    }
  }, firstLineDeadlineMs);
  timer.unref();
  let o = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };
  e.once("close", o);
  e.once("error", o);
  let a;
  let r;
  let p = false;
  let _;
  let w;
  let h = process.pid !== 1 && isBypassDefaultHold();
  if (h) {
    let peerPid = getPeerPid(e);
    let R = peerPid !== undefined ? getProcessStartTokenLinuxSync(peerPid) : undefined;
    if (peerPid !== undefined && R !== undefined)
      w = {
        pid: peerPid,
        token: R,
      };
  }
  let l = "";
  let D;
  let E = false;
  let c = (b) => {
    logForDebugging(`[uds-messaging] Dropped ${b} from a connection that did not authenticate; closing it`, {
      level: "warn",
    });
    if (!udsMessagingState().authDropReported) {
      udsMessagingState().authDropReported = true;
      logFeatureBad("cross_session_inbox_auth", "unauthed_drop");
    }
    e.destroy();
  };
  let S = (b) => {
    let R = !E;
    E = true;
    if (isAuthItem(b)) {
      if (R) {
        D = tokenRole(b.token, udsMessagingState().activeTokens);
        if (D !== undefined && !udsMessagingState().authOkReported) {
          udsMessagingState().authOkReported = true;
          logFeatureOk("cross_session_inbox_auth");
        }
        if (D === undefined && udsMessagingState().authRequired) c("a bad auth frame");
      }
      return;
    }
    if (udsMessagingState().authRequired && D === undefined) {
      c(hasStringType_2(b) ? `a '${fragmentForLog(b.type)}' line` : "a line");
      return;
    }
    if (!p) {
      a = getPeerPid(e);
      r =
        a === undefined
          ? undefined
          : w !== undefined
            ? w.pid === a
              ? w.token
              : undefined
            : getProcessStartTokenLinuxSync(a);
      p = true;
      if (a !== undefined && h)
        _ =
          w !== undefined && w.pid === a && getProcessStartTokenLinuxSync(a) === w.token
            ? getAncestorPidsLinuxSync(a)
            : [];
    }
    routeInboundMessage(b, a, r, _, D);
  };
  let v = (b) => {
    try {
      S(b);
    } catch (error) {
      logForDebugging(`[uds-messaging] Failed to handle line: ${error}`, {
        level: "warn",
      });
    }
  };
  e.on("data", (b) => {
    l += b;
    if (l.length > MAX_PEER_MESSAGE_BYTES) {
      logForDebugging(`[uds-messaging] Line exceeded ${MAX_PEER_MESSAGE_BYTES} chars; dropping connection`, {
        level: "warn",
      });
      e.destroy();
      l = "";
      return;
    }
    let R;
    while (
      (R = l.indexOf(`
`)) !== -1
    ) {
      let sliced = l.slice(0, R);
      l = l.slice(R + 1);
      o();
      if (!sliced.trim()) {
        if (udsMessagingState().authRequired && D === undefined) {
          E = true;
          c("a blank line");
          l = "";
          return;
        }
        continue;
      }
      let F;
      try {
        F = jsonParseRaw(sliced);
      } catch {
        logForDebugging(`[uds-messaging] Failed to parse JSON line: ${redactFragmentForLog(sliced)}`, {
          level: "warn",
        });
        if (udsMessagingState().authRequired && D === undefined) {
          E = true;
          c("an unparseable line");
          l = "";
          return;
        }
        continue;
      }
      v(F);
      if (e.destroyed) {
        l = "";
        return;
      }
    }
  });
  e.on("end", () => {
    if (l.trim() && !e.destroyed) {
      let b;
      let R = false;
      try {
        b = jsonParseRaw(l);
        R = true;
      } catch {
        logForDebugging(`[uds-messaging] Failed to parse final buffer: ${redactFragmentForLog(l)}`, {
          level: "warn",
        });
        if (udsMessagingState().authRequired && D === undefined) c("an unparseable final fragment");
      }
      if (R) v(b);
    }
    e.end();
  });
  e.on("error", (b) => {
    logForDebugging(`[uds-messaging] Connection error: ${b.message}`, {
      level: "warn",
    });
  });
}
//@ chunk-0kp6eg01.js:13953-13996 placement
function getUdsMessagingSocketPath() {
  return udsMessagingState().activeSocketPath;
}
//@ chunk-0kp6eg01.js:13996-14006 placement
var MAX_SOCKET_PATH_BYTES = 103;
//@ chunk-0kp6eg01.js:14006-14144 placement
function getDefaultUdsSocketPath() {
  let e = env.XDG_RUNTIME_DIR || tmpdir();
  let n = resolve(join(e, "cc-socks", `${process.pid}.sock`));
  if (Buffer.byteLength(n) <= MAX_SOCKET_PATH_BYTES) return n;
  return getPerUidFallbackUdsSocketPath();
}
//@ chunk-0kp6eg01.js:14144-14293 placement
function getPerUidFallbackUdsSocketPath(e = process.getuid?.() ?? 0) {
  let PREFIX = env.TERMUX_VERSION ? env.PREFIX : undefined;
  let s = PREFIX ? join(PREFIX, "tmp") : "/tmp";
  return join(s, `cc-socks-${e}`, `${process.pid}.sock`);
}
//@ chunk-0kp6eg01.js:14293-14652 placement
/**
 * 关闭 UDS 服务
 */
async function stopUdsServer(e, n, s, { settleHeld: o = true } = {}) {
  for (let connectedClient of udsMessagingState().connectedClients) connectedClient.destroy();
  udsMessagingState().connectedClients.clear();
  e.close();
  if (o) noteParkedAtShutdown();
  let a = o ? settleHeldInboundOnShutdown() : undefined;
  await awaitProcessingChain();
  let r = o ? withDeadline(flushIdleSubscribers("exited"), IDLE_FLUSH_TIMEOUT_MS) : undefined;
  await a;
  await r;
  if (o) await flushPeerDropReceipts();
  try {
    await unlink(n);
  } catch {}
  let p = udsMessagingState();
  if (p.activeKeyFile !== undefined) {
    await deleteSessionRecord(p.activeKeyFile, s);
    p.activeKeyFile = undefined;
  }
  clearActiveSocket();
}
//@ chunk-0kp6eg01.js:14652-14888 placement
/**
 * 清除活动 socket 状态
 */
function clearActiveSocket() {
  udsMessagingState().activeSocketPath = undefined;
  udsMessagingState().activeTokens = undefined;
  delete process.env.CLAUDE_CODE_MESSAGING_SOCKET;
  udsEnv.unset("CLAUDE_CODE_MESSAGING_TOKEN");
  setOwnUdsHopToken(undefined);
  setSendPeerReceipt(null);
  setRecordCorrespondent(null);
  setIdleNoticeSender(null);
  setSendAnswer(null);
  setRegisteredInboxOfPidReader(null);
  getSessionNamingState().senderMode = null;
}
//@ chunk-0kp6eg01.js:14888-14946 placement
function stopAndCleanup(e, n, s, o) {
  return async () => {
    await stopUdsServer(e, n, s);
    o();
  };
}
//@ chunk-0kp6eg01.js:14946-15137 placement
/**
 * 探测 socket 是否存活
 */
function probeSocket(path) {
  return new Promise((resolve) => {
    let s = new Socket();
    let o = (a) => {
      s.destroy();
      resolve(a);
    };
    s.on("connect", () => o("live"));
    s.on("error", () => o("dead"));
    s.setTimeout(250, () => o("dead"));
    s.connect({
      path,
    });
  });
}
//@ chunk-0kp6eg01.js:15137-15306 placement
/**
 * 尝试监听
 */
function tryListen(e, n) {
  return new Promise((resolve, reject) => {
    function a(r) {
      if (getErrnoCode(r) === "EADDRINUSE") resolve(false);
      else reject(r);
    }
    e.once("error", a);
    e.listen(n, () => {
      e.removeListener("error", a);
      resolve(true);
    });
  });
}
//@ chunk-0kp6eg01.js:15306-15541 placement
/**
 * 生成兄弟 socket 路径
 */
function siblingSocketPath(e) {
  let n = `${e.replace(/\.sock$/, "")}-${randomBytes(4).toString("hex")}.sock`;
  if (Buffer.byteLength(n) <= MAX_SOCKET_PATH_BYTES) return n;
  let s = join(e, "..");
  let o = MAX_SOCKET_PATH_BYTES - Buffer.byteLength(join(s, ".sock"));
  return join(s, `${randomBytes(8).toString("hex").slice(0, Math.max(1, o))}.sock`);
}
//@ chunk-0kp6eg01.js:15541-15863 placement
/**
 * 清理陈旧的兄弟 socket
 */
async function sweepStaleSiblingSockets(e) {
  let n = `${basename(e).replace(/\.sock$/, "")}-`;
  let s;
  try {
    s = await readdir(dirname(e));
  } catch {
    return;
  }
  for (let o of s) {
    if (!o.startsWith(n) || !/^[0-9a-f]{8}\.sock$/.test(o.slice(n.length))) continue;
    let path = join(dirname(e), o);
    if ((await probeSocket(path)) === "live") continue;
    try {
      await unlink(path);
      logForDebugging(`[uds-messaging] Reaped stale moved-aside socket ${path}`);
    } catch {}
  }
}
//@ chunk-0kp6eg01.js:15863-16284 placement
/**
 * 绑定自动 socket 路径
 */
async function bindAutoSocketPath(e, path) {
  await sweepStaleSiblingSockets(path);
  if (await tryListen(e, path)) return path;
  if ((await probeSocket(path)) !== "live") {
    try {
      await unlink(path);
    } catch {}
    if (await tryListen(e, path)) return path;
  }
  for (let idx = 0; idx < 3; idx++) {
    let o = siblingSocketPath(path);
    logForDebugging(
      `[uds-messaging] Auto socket path ${path} is another session's live socket (sibling pid namespace?); binding at ${o} instead`,
      {
        level: "warn",
      },
    );
    if (await tryListen(e, o)) return o;
  }
  throw Error("listen EADDRINUSE on the auto socket path and its moved-aside siblings");
}
//@ chunk-0kp6eg01.js:16284-16386 placement
function startCrossSessionInbox(e, n, s = {}) {
  return startUdsMessaging(e ?? getDefaultUdsSocketPath(), n, {
    isExplicit: e !== undefined,
    profileStartup: s.profileStartup,
  });
}
//@ chunk-0kp6eg01.js:16386-16480 placement
function clearMessagingEnv() {
  udsEnv.unset("CLAUDE_CODE_MESSAGING_SOCKET");
  udsEnv.unset("CLAUDE_CODE_MESSAGING_TOKEN");
}
//@ chunk-0kp6eg01.js:16480-16616 placement
var SOCKET_DIR_VET_KINDS = [
  "directory_rule",
  "foreign_owner",
  "leaf_shape",
  "dangling_link",
  "raced",
  "not_directory",
  "symlink_loop",
  "uid_collapse",
  "internal",
];
//@ chunk-0kp6eg01.js:16616-16707 placement
function socketDirRefusalError(socketsDirVetKind, n, s) {
  return Object.assign(n, {
    socketsDirVetKind,
    ...(s && {
      refusedComponent: s,
    }),
  });
}
//@ chunk-0kp6eg01.js:16707-17133 placement
/**
 * 取被拒的路径组件
 */
function refusedComponentOf(e) {
  if (!(e instanceof Error) || !("refusedComponent" in e)) return;
  let refusedComponent = e.refusedComponent;
  return typeof refusedComponent === "object" &&
    refusedComponent !== null &&
    "path" in refusedComponent &&
    typeof refusedComponent.path === "string" &&
    "uid" in refusedComponent &&
    typeof refusedComponent.uid === "number" &&
    "gid" in refusedComponent &&
    typeof refusedComponent.gid === "number" &&
    "mode" in refusedComponent &&
    typeof refusedComponent.mode === "number"
    ? {
        path: refusedComponent.path,
        uid: refusedComponent.uid,
        gid: refusedComponent.gid,
        mode: refusedComponent.mode,
        ownerRefused:
          "ownerRefused" in refusedComponent && typeof refusedComponent.ownerRefused === "boolean"
            ? refusedComponent.ownerRefused
            : undefined,
      }
    : undefined;
}
//@ chunk-0kp6eg01.js:17133-17235 placement
function socketDirFacts(path, n, s) {
  return {
    path,
    uid: n.uid,
    gid: n.gid,
    mode: n.mode & 4095,
    ...(s !== undefined && {
      ownerRefused: s,
    }),
  };
}
//@ chunk-0kp6eg01.js:17235-18789 placement
/**
 * 描述 sockets 目录拒绝原因
 */
function describeSocketDirRefusal(e) {
  if (socketDirVetKind(e) === "uid_collapse")
    return "this process runs in a user namespace without a uid mapping, so file ownership cannot be verified \u2014 start it with a uid map (e.g. unshare -Ur), or pass --messaging-socket-path";
  let n = refusedComponentOf(e);
  if (n === undefined) return;
  let padded = n.mode.toString(8).padStart(4, "0");
  let o = `(owner ${n.uid}:${n.gid}, mode ${padded})`;
  let a = "or pass --messaging-socket-path";
  let r = printableName(n.path);
  let p = r === n.path;
  let _ = `'${Array.from(r, (l) => {
    if (SAFE_PATH_CHAR_PATTERN.test(l)) return l;
    p = false;
    return "?";
  }).join("")}'`;
  let w = p;
  let h = (l, D) =>
    w
      ? `chmod ${l} ${shellQuoteArgs([n.path])}${D}`
      : `clear its ${l === "o-w" ? "other" : "group"}-write bit${D}`;
  switch (socketDirVetKind(e)) {
    case "directory_rule": {
      if (n.ownerRefused === true)
        return `${_} is not owned by you or root ${o} \u2014 use a private directory (XDG_RUNTIME_DIR / CLAUDE_CODE_TMPDIR), ${a}`;
      let l = (n.mode & 512) !== 0;
      if (!l && (n.mode & 2) !== 0)
        return `${_} is world-writable without the sticky bit ${o} \u2014 ${h("o-w", " (or chmod +t)")}, ${a}`;
      if (!l && (n.mode & 16) !== 0)
        return `${_} is group-writable without the sticky bit ${o} \u2014 ${h("g-w", "")}, ${a}`;
      return `${_} is not owned by you or root ${o} \u2014 use a private directory (XDG_RUNTIME_DIR / CLAUDE_CODE_TMPDIR), ${a}`;
    }
    case "foreign_owner":
      return `${_} is owned by another user ${o} \u2014 use a private directory (XDG_RUNTIME_DIR / CLAUDE_CODE_TMPDIR), ${a}`;
    case "not_directory":
    case "leaf_shape":
      return `${_} is not a directory ${o} \u2014 remove it or use a private directory (XDG_RUNTIME_DIR / CLAUDE_CODE_TMPDIR), ${a}`;
    case "dangling_link":
    case "raced":
    case "symlink_loop":
    case "uid_collapse":
    case "internal":
    case undefined:
      return;
  }
}
//@ chunk-0kp6eg01.js:18789-18893 placement
var SAFE_PATH_CHAR_PATTERN = /^[A-Za-z0-9._\/ ~+=:@,#%-]$/;
var PERMANENT_SOCKET_ERRNOS = new Set(["EACCES", "EPERM", "EROFS", "ENOSPC", "EDQUOT", "ENOTDIR"]);
//@ chunk-0kp6eg01.js:18893-19161 placement
/**
 * 是否永久拒绝
 */
function isPermanentSocketRefusal(error) {
  switch (socketDirVetKind(error)) {
    case "directory_rule":
    case "foreign_owner":
    case "leaf_shape":
    case "not_directory":
      return true;
    case "dangling_link":
    case "symlink_loop":
    case "raced":
    case "uid_collapse":
    case "internal":
      return false;
    case undefined:
      break;
  }
  let errnoCode = getErrnoCode(error);
  return errnoCode !== undefined && PERMANENT_SOCKET_ERRNOS.has(errnoCode);
}
//@ chunk-0kp6eg01.js:19161-19289 placement
function socketDirVetKind(e) {
  if (!(e instanceof Error) || !("socketsDirVetKind" in e)) return;
  let socketsDirVetKind = e.socketsDirVetKind;
  return SOCKET_DIR_VET_KINDS.find((s) => s === socketsDirVetKind);
}
//@ chunk-0kp6eg01.js:19289-19463 placement
/**
 * 悬空链接错误
 */
function danglingLinkError() {
  return socketDirRefusalError(
    "dangling_link",
    Error(
      "a component of the sockets path is a symlink whose target does not exist \u2014 create the target (0700) or repoint the link",
    ),
  );
}
//@ chunk-0kp6eg01.js:19463-19984 placement
/**
 * sockets 目录被拒时的建议：把 XDG_RUNTIME_DIR 或 CLAUDE_CODE_TMPDIR 指向私有目录。
 */
var SOCKET_DIR_HINTS =
  "Point XDG_RUNTIME_DIR or CLAUDE_CODE_TMPDIR at a private (0700) directory you own to use a different location.";
var SOCKET_DIR_COMPONENT_REFUSAL_HINT = `A component of the sockets path is not a directory (a regular file is in the way). ${SOCKET_DIR_HINTS}`;
var SOCKET_DIR_LOOP_REFUSAL_HINT = `The sockets path runs through a symlink loop. ${SOCKET_DIR_HINTS}`;
var SOCKET_DIR_USERNS_REFUSAL_HINT =
  "This process runs in a user namespace without a uid mapping (its own uid reads as the kernel overflow uid), so file ownership cannot be verified. Start it with a uid map (e.g. `unshare -Ur` / `--map-current-user`), or pass --messaging-socket-path.";
//@ chunk-0kp6eg01.js:19984-20725 placement
/**
 * sockets 目录拒绝提示
 */
function socketDirRefusalHint(error) {
  switch (socketDirVetKind(error)) {
    case "directory_rule":
      return `A directory on the sockets path is shared (world- or group-writable without the sticky bit, e.g. a container volume mounted at /tmp) or not owned by you or root. ${SOCKET_DIR_HINTS}`;
    case "foreign_owner":
    case "leaf_shape":
      return SOCKET_DIR_HINTS;
    case "not_directory":
      return SOCKET_DIR_COMPONENT_REFUSAL_HINT;
    case "symlink_loop":
      return SOCKET_DIR_LOOP_REFUSAL_HINT;
    case "uid_collapse":
      return SOCKET_DIR_USERNS_REFUSAL_HINT;
    case "dangling_link":
    case "raced":
    case "internal":
      return "";
    case undefined:
      break;
  }
  switch (getErrnoCode(error)) {
    case "ENOTDIR":
      return SOCKET_DIR_COMPONENT_REFUSAL_HINT;
    case "ELOOP":
      return SOCKET_DIR_LOOP_REFUSAL_HINT;
    case "EACCES":
    case "EPERM":
      return `This user lacks permission on part of the sockets path (an ancestor is not searchable, or the parent is not writable). ${SOCKET_DIR_HINTS}`;
    case "ENOENT":
      return `An ancestor of the sockets path does not exist. ${SOCKET_DIR_HINTS}`;
    default:
      return "";
  }
}
//@ chunk-0kp6eg01.js:20725-21058 placement
/**
 * 拒绝使用 sockets 目录
 */
function refuseSocketDir(e, error, s) {
  udsMessagingState().lastStartFailureCause = "socket_dir_refused";
  let o = describeSocketDirRefusal(error);
  udsMessagingState().lastStartFailureDetail = o;
  clearActiveSocket();
  logForDebugging(
    `[uds-messaging] Failed to set up sockets directory ${e} (refusing to bind \u2014 cross-session messaging is OFF for this session): ${errorMessage(error)}.${o ? ` Refused component: ${o}.` : ""}${s ? ` ${s}` : ""}`,
    {
      level: "error",
    },
  );
  clearMessagingEnv();
  return;
}
//@ chunk-0kp6eg01.js:21058-24275 placement
/**
 * 检查 sockets 目录
 */
async function vetSocketsDir(e) {
  if (!isAbsolute(e))
    throw socketDirRefusalError("internal", Error("sockets directory must be absolute here"));
  let n = process.getuid?.();
  let s = (y) => {
    if (y.isSymbolicLink())
      throw socketDirRefusalError(
        "leaf_shape",
        Error("sockets directory is a symlink \u2014 refusing to use it"),
        socketDirFacts(e, y),
      );
    if (!y.isDirectory())
      throw socketDirRefusalError(
        "leaf_shape",
        Error("sockets directory exists but is not a directory"),
        socketDirFacts(e, y),
      );
    if (n !== undefined && !o(y.uid))
      throw socketDirRefusalError(
        "foreign_owner",
        Error("sockets directory is owned by another user \u2014 refusing to use it"),
        socketDirFacts(e, y),
      );
  };
  let o = (uid) => uid === n;
  let a = process.getgid?.();
  let r = await inspectUserNamespace();
  if (r?.uidCollapses)
    throw socketDirRefusalError(
      "uid_collapse",
      Error(
        "this process reads as the kernel overflow uid (user namespace without a uid mapping) \u2014 ownership cannot be verified; refusing to use the sockets directory",
      ),
    );
  o = (y) => y === n && !r?.uidCollapses;
  let p = sharedSystemDirs();
  let _ = async (y, A) => {
    try {
      let C = A.isSymbolicLink() ? join(await realpath(dirname(y)), basename(y)) : await realpath(y);
      let P = await lstat(C);
      return P.dev === A.dev && P.ino === A.ino ? C : undefined;
    } catch {
      return;
    }
  };
  let w = (y) =>
    r !== undefined &&
    ((r.unmappedOwnerUid !== undefined && y === r.unmappedOwnerUid) || (y === 0 && r.rootUidAmbiguous));
  let h = w;
  let l = (y) => y !== undefined && p.has(y);
  let D = (uid, A, C) => n === undefined || o(uid) || (!A && (w(uid) ? l(C) : uid === 0));
  let E = (y, A, C) => {
    if (!D(y.uid, A, C)) return false;
    if ((y.mode & 512) !== 0) return true;
    if ((y.mode & 2) !== 0) return false;
    if ((y.mode & 16) !== 0) return o(y.uid) && a !== undefined && y.gid === a && a === n;
    return true;
  };
  let c = env.TERMUX_VERSION && env.PREFIX ? dirname(dirname(env.PREFIX)) : undefined;
  let S = (y) => dirname(y) === y || y === c;
  let v = async (y, A, C = 0) => {
    if (C > 16)
      throw socketDirRefusalError(
        "symlink_loop",
        Error("sockets-directory chain: too many levels of symlinks"),
      );
    let P = false;
    let deepestExisting;
    let sawSymlink = false;
    for (let U = y, Q = true; ; U = dirname(U), Q = false) {
      let T;
      try {
        T = await lstat(U);
      } catch (error) {
        if (!isENOENT(error)) throw error;
      }
      if (T !== undefined) {
        deepestExisting ??= U;
        let G = Q && A;
        if (T.isSymbolicLink()) {
          sawSymlink = true;
          let Z = h(T.uid) ? await _(U, T) : undefined;
          if (!D(T.uid, false, Z))
            throw socketDirRefusalError(
              "foreign_owner",
              Error(
                "a sockets-directory component is a symlink owned by another user \u2014 refusing to use it",
              ),
              socketDirFacts(U, T),
            );
          let replaced = (await readlink(U)).replace(/\/{2,}/g, "/");
          let oe = replaced.length > 1 && replaced.endsWith("/") ? replaced.slice(0, -1) : replaced;
          let Ue = isAbsolute(oe) ? oe : `${await realpath(dirname(U))}/${oe}`;
          let { startExists } = await v(Ue, G, C + 1);
          if (Q) P = startExists;
        } else {
          if (!T.isDirectory())
            throw socketDirRefusalError(
              "not_directory",
              Error("a sockets-directory component exists but is not a directory \u2014 refusing to use it"),
              socketDirFacts(U, T),
            );
          let Z = h(T.uid) ? await _(U, T) : undefined;
          if (!E(T, G, Z))
            throw socketDirRefusalError(
              "directory_rule",
              Error(
                "a sockets-directory component is not a private-or-sticky directory owned by us or root \u2014 refusing to use it",
              ),
              socketDirFacts(U, T, !D(T.uid, G, Z)),
            );
          if (Q) P = true;
        }
      }
      if (S(U)) break;
    }
    return {
      startExists: P,
      deepestExisting,
      sawSymlink,
    };
  };
  let b = dirname(e);
  let R = await v(b, false);
  let x = !R.startExists;
  let F;
  try {
    F = await lstat(e);
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
  if (x && R.deepestExisting === b) throw danglingLinkError();
  if (x) {
    let y = [];
    let A = (C) => {
      if (!C.isDirectory() || (n !== undefined && !o(C.uid)))
        throw socketDirRefusalError(
          "raced",
          Error(
            "a sockets-directory component appeared while being created and is not our directory \u2014 refusing to use it",
          ),
        );
    };
    for (let C = b; C !== R.deepestExisting && !S(C); C = dirname(C)) y.unshift(C);
    for (let C of y)
      try {
        await mkdir(C, {
          mode: 448,
        });
      } catch (error) {
        if (isENOENT(error) && R.sawSymlink) throw danglingLinkError();
        if (getErrnoCode(error) !== "EEXIST") throw error;
        A(await lstat(C));
      }
    if (!(await v(b, true)).startExists)
      throw socketDirRefusalError("raced", Error("sockets base directory vanished while being set up"));
  }
  if (F === undefined) {
    try {
      await mkdir(e, {
        mode: 448,
      });
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") throw error;
    }
    F = await lstat(e);
  }
  s(F);
  if ((F.mode & 511) !== 448) await chmod(e, 448);
}
//@ chunk-0kp6eg01.js:24275-27546 placement
/**
 * 校验 --messaging-socket-path 显式指定的 UDS 路径（目录所有者、权限、符号链接），不合格时拒绝绑定。本模块整体是跨会话 UDS 消息服务：建 socket 目录、绑定、接收 user/control 消息、祖先进程判定自发消息。
 */
async function validateExplicitMessagingSocketPath(e) {
  if (!isAbsolute(e))
    throw new CliUserError(
      e === ""
        ? "--messaging-socket-path was given an empty value (an unset shell variable?). Pass an absolute socket path."
        : `--messaging-socket-path must be an absolute path, got: ${e}`,
    );
  if (e.split("/").includes(".."))
    throw new CliUserError(`--messaging-socket-path must not contain '..' segments, got: ${e}`);
  let last = e.split("/").at(-1);
  if (last === "" || last === ".")
    throw new CliUserError(`--messaging-socket-path must name a socket file inside a directory, got: ${e}`);
  let replaced = normalize(e).replace(/\/+$/, "");
  if (replaced === "" || !replaced.startsWith("/") || basename(replaced) === "")
    throw new CliUserError(`--messaging-socket-path must name a socket file inside a directory, got: ${e}`);
  if (!isValidPipeOrPath(replaced) || !isValidPipeOrPath(e))
    throw new CliUserError(`--messaging-socket-path must be a local socket path, got: ${e}`);
  if (Buffer.byteLength(replaced) > MAX_SOCKET_PATH_BYTES)
    throw new CliUserError(
      `--messaging-socket-path is too long for a Unix socket (${Buffer.byteLength(replaced)} bytes, max ${MAX_SOCKET_PATH_BYTES}): ${replaced}. Choose a shorter path, e.g. under $XDG_RUNTIME_DIR or /tmp/<private-dir>.`,
    );
  let a = dirname(replaced);
  let r =
    "Use a private directory you own that only you use, e.g. mkdir -m 700 <dir> (or chmod 700 an existing one).";
  let p = (c) => {
    if (c.isSymbolicLink())
      throw new CliUserError(
        `--messaging-socket-path directory must be a real directory, not a symlink: ${a}. ${r}`,
      );
    if (!c.isDirectory()) throw new CliUserError(`--messaging-socket-path parent is not a directory: ${a}.`);
    let S = process.getuid?.();
    if (S !== undefined && c.uid !== S)
      throw new CliUserError(
        `--messaging-socket-path directory ${a} is not owned by you (uid ${c.uid}). ${r}`,
      );
    if ((c.mode & 63) !== 0)
      throw new CliUserError(
        `--messaging-socket-path directory ${a} is not private (mode ${(c.mode & 4095).toString(8)}); the socket directory must be mode 0700 so no other user or group can reach or replace the socket. ${r}`,
      );
  };
  let _ = async () => {
    try {
      return await lstat(a);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (isENOENT(error)) return;
      if (
        errnoCode === "ENOTDIR" ||
        errnoCode === "EACCES" ||
        errnoCode === "ELOOP" ||
        errnoCode === "ENAMETOOLONG"
      )
        throw new CliUserError(
          `--messaging-socket-path directory is not usable: ${a} (${errnoCode}). Fix the path or its permissions, or choose another path. ${r}`,
        );
      throw new CliUserError(
        `--messaging-socket-path directory could not be examined: ${a} (${errnoCode ?? String(error)}). ${r}`,
      );
    }
  };
  let w = await _();
  if (w !== undefined) {
    p(w);
    return replaced;
  }
  let h = process.getuid?.();
  let l = [];
  for (let c = dirname(a); ; c = dirname(c)) {
    let S;
    try {
      S = await lstat(c);
    } catch (error) {
      if (!isENOENT(error))
        throw new CliUserError(
          `--messaging-socket-path: cannot inspect ${c} (${getErrnoCode(error) ?? error}). ${r}`,
        );
      l.unshift(c);
    }
    if (S !== undefined) {
      if (h !== undefined && S.uid !== h && S.uid !== 0)
        throw new CliUserError(
          `--messaging-socket-path: ${c} ${S.isSymbolicLink() ? "is a symlink" : "is a directory"} owned by another user \u2014 refusing to create your sockets directory ${S.isSymbolicLink() ? "through" : "inside"} it. ${r}`,
        );
      break;
    }
    if (dirname(c) === c) break;
  }
  let D = false;
  try {
    for (let c of l)
      try {
        await mkdir(c, {
          mode: 448,
        });
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
        let v = await lstat(c);
        if (!v.isDirectory() || (h !== undefined && v.uid !== h))
          throw new CliUserError(
            `--messaging-socket-path: ${c} appeared while your sockets directory was being created and is not a directory you own \u2014 refusing to use it. ${r}`,
          );
      }
    try {
      await mkdir(a, {
        mode: 448,
      });
      D = true;
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") throw error;
    }
  } catch (error) {
    if (error instanceof CliUserError) throw error;
    throw new CliUserError(
      `--messaging-socket-path directory ${a} does not exist and could not be created (${getErrnoCode(error) ?? error}). ${r}`,
    );
  }
  let E = await _();
  if (E === undefined)
    throw new CliUserError(`--messaging-socket-path directory ${a} vanished while being set up. ${r}`);
  if (!D) {
    p(E);
    return replaced;
  }
  p(E);
  return replaced;
}
//@ chunk-0kp6eg01.js:27546-27653 placement
async function startUdsMessaging(e, n, s = {}) {
  udsMessagingState().startInFlight = true;
  try {
    return await startUdsMessagingUnchecked(e, n, s);
  } finally {
    udsMessagingState().startInFlight = false;
  }
}
//@ chunk-0kp6eg01.js:27653-34045 placement
/**
 * 启动 UDS 消息服务
 */
async function startUdsMessagingUnchecked(path, n, s = {}) {
  let a = s.profileStartup ? performance.now() : undefined;
  let r = (h) => {
    if (a === undefined) return;
    let startTime = performance.now();
    recordPhase(h, startTime - a, a);
    a = startTime;
  };
  udsMessagingState().lastStartFailureCause = "bind_failed";
  udsMessagingState().lastStartDegradedCause = undefined;
  if (!isValidPipeOrPath(path)) {
    logForDebugging(
      `[uds-messaging] Refusing socket path \u2014 ${"not a usable local socket address (a remote/UNC path, or a pipe name with extra segments or a trailing dot/space)"}: ${path}`,
      {
        level: "error",
      },
    );
    clearMessagingEnv();
    udsMessagingState().lastStartFailureCause = "path_refused";
    if (s.isExplicit)
      throw new CliUserError(
        `--messaging-socket-path ${path} is not a usable local socket address (a remote/UNC path, or a pipe name with extra segments or a trailing dot/space).`,
      );
    return;
  }
  if (!s.isExplicit && true && !isAbsolute(path)) path = resolve(path);
  if (s.isExplicit) {
    path = await validateExplicitMessagingSocketPath(path);
    if ((await probeSocket(path)) === "live")
      throw new CliUserError(
        `--messaging-socket-path points to a live socket: ${path}. Another process is listening there. Remove it or choose a different path.`,
      );
  } else {
    let h = dirname(path);
    try {
      await vetSocketsDir(h);
    } catch (error) {
      let D = isPermanentSocketRefusal(error) ? await getHostUid() : undefined;
      let E = D === undefined ? undefined : resolve(getPerUidFallbackUdsSocketPath(D));
      let c = E === undefined ? undefined : join(E, "..");
      if (E === undefined || c === undefined || c === h)
        return refuseSocketDir(h, error, socketDirRefusalHint(error));
      let S = describeSocketDirRefusal(error);
      logForDebugging(
        `[uds-messaging] sockets directory ${h} refused (${errorMessage(error)}${S ? `; refused component: ${S}` : ""}); trying the per-uid fallback ${c}`,
        {
          level: "warn",
        },
      );
      try {
        await vetSocketsDir(c);
      } catch (error) {
        return refuseSocketDir(c, error, socketDirRefusalHint(error));
      }
      path = E;
      recordDegradedCause("primary_dir_refused_fell_back");
    }
  }
  if (s.isExplicit)
    try {
      await unlink(path);
    } catch {}
  udsMessagingState().activeSocketPath = path;
  if (s.profileStartup) profileCheckpoint("uds_inbox_dir_ready");
  r("setup_uds_dir_ms");
  let p;
  let _;
  try {
    p = createServer(
      {
        allowHalfOpen: true,
      },
      (h) => {
        udsMessagingState().connectedClients.add(h);
        logForDebugging("[uds-messaging] Client connected");
        handleConnection(h);
        h.on("close", () => {
          udsMessagingState().connectedClients.delete(h);
          logForDebugging("[uds-messaging] Client disconnected");
        });
      },
    );
  } catch (error) {
    clearActiveSocket();
    logForDebugging(`[uds-messaging] Failed to create server: ${String(error)}`, {
      level: "error",
    });
    clearMessagingEnv();
    return;
  }
  p.on("error", (h) => {
    logForDebugging(`[uds-messaging] Server error: ${h.message}`, {
      level: "error",
    });
  });
  udsMessagingState().authRequired = s.requireAuth ?? isWindowsPlatform();
  udsMessagingState().firstLineDeadlineMs = s.firstLineDeadlineMs ?? MESSAGING_SOCKET_TIMEOUT_MS;
  let peerTokens = createPeerTokens();
  udsMessagingState().activeTokens = peerTokens;
  try {
    if (s.isExplicit) {
      if (!(await tryListen(p, path))) throw Error("listen EADDRINUSE on the requested socket path");
    } else {
      path = await bindAutoSocketPath(p, path);
      udsMessagingState().activeSocketPath = path;
    }
    if (s.profileStartup) profileCheckpoint("uds_inbox_listening");
    r("setup_uds_listen_ms");
    {
      let hostUid = await getHostUid();
      let c = process.getuid?.();
      udsMessagingState().peerDirOwnerUids = [
        ...(c !== undefined ? [c] : []),
        ...(hostUid !== undefined && hostUid !== c ? [hostUid] : []),
      ];
    }
    p.unref();
    let h = registerCleanup(async () => {
      logForDebugging("[uds-messaging] Shutting down");
      await stopUdsServer(p, path, n);
    });
    _ = h;
    await chmod(path, 384);
    try {
      udsMessagingState().activeKeyFile = await writeSessionPeerRecord(path, peerTokens.peerToken, n, {
        sweepPermitted: await isRegistrySweepPermitted(),
      });
      registerActiveKeyFileCleanupOnExit();
    } catch (error) {
      if (udsMessagingState().authRequired) {
        logForDebugging(
          `[uds-messaging] Failed to publish the inbox auth key (refusing to run an inbox no peer can authenticate to): ${error}`,
          {
            level: "error",
          },
        );
        udsMessagingState().lastStartFailureCause = "key_publish_failed";
        await stopUdsServer(p, path, n, {
          settleHeld: false,
        });
        h();
        clearMessagingEnv();
        if (s.isExplicit)
          throw new CliUserError(
            `--messaging-socket-path: bound ${path} but could not publish its auth key (${getErrnoCode(error) ?? error}); peers could not authenticate, so the inbox was closed. Check that the session registry directory is writable by you.`,
          );
        return;
      }
      logForDebugging(
        `[uds-messaging] Failed to publish the inbox auth key; peers will send unauthenticated (accepted: auth is optional on this platform): ${error}`,
        {
          level: "warn",
        },
      );
      recordDegradedCause("key_publish_failed");
    }
    if (s.profileStartup) profileCheckpoint("uds_inbox_key_published");
    r("setup_uds_publish_ms");
    process.env.CLAUDE_CODE_MESSAGING_SOCKET = path;
    udsEnv.set("CLAUDE_CODE_MESSAGING_TOKEN", peerTokens.childToken);
    setOwnUdsHopToken(udsAddressFromPath(path));
    let ownAddress = udsAddressFromPath(path);
    setRecordCorrespondent(notePeerReplyTarget);
    getSessionNamingState().senderMode = currentSenderClass;
    setIdleNoticeSender((E, c, S, v, b) =>
      sendControlToUdsSocket(
        E,
        {
          action: "peer_idle_notice",
          ...c,
          from: ownAddress,
          ...(v ? senderClassFields() : {}),
        },
        {
          ...(S !== undefined && {
            expectPeerPid: S,
          }),
          ...(b !== undefined && {
            expectPeerProcStart: b,
          }),
          storageV5: n,
        },
      ),
    );
    setSendAnswer(
      (E, c, S, v) =>
        sendControlToUdsSocket(
          E,
          {
            action: "artifact_replies_yielded",
            ...c,
            from: ownAddress,
          },
          {
            ...(S !== undefined && {
              expectPeerPid: S,
            }),
            ...(v !== undefined && {
              expectPeerProcStart: v,
            }),
            storageV5: n,
          },
        ),
      ownAddress,
    );
    setRegisteredInboxOfPidReader((E) => registeredInboxesOfPids(E));
    setSendPeerReceipt((E, c, S) => {
      let origin = E.origin?.kind === "peer" ? E.origin : undefined;
      let from = origin?.from;
      if (typeof from !== "string") return;
      let R = vettedPeerReplyTarget(from, path, origin?.verifiedPeerPid);
      if (R === undefined) {
        logForDebugging(
          `[uds-messaging] hold-receipt skipped: reply address unshaped or outside our socket namespace (${fragmentForLog(from)})`,
        );
        return;
      }
      return sendControlToUdsSocket(
        R,
        {
          action: "peer_message_status",
          ...(c === "refused"
            ? {
                status: "expired",
                status_detail: "refused",
              }
            : {
                status: c,
              }),
          reason: holdOutcomeExplanation(c),
          from: ownAddress,
          ...(typeof origin?.msg_id === "string" && {
            orig_msg_id: origin.msg_id,
          }),
          ...(c === "dropped" &&
            S !== undefined && {
              drop_reason: S.dropReason,
              dropped_msg_ids: S.droppedMsgIds,
            }),
        },
        {
          ...(origin?.verifiedPeerPid !== undefined && {
            expectPeerPid: origin.verifiedPeerPid,
          }),
          ...(origin?.verifiedPeerProcStart !== undefined && {
            expectPeerProcStart: origin.verifiedPeerProcStart,
          }),
          storageV5: n,
        },
      ).catch((error) =>
        logForDebugging(
          `[uds-messaging] hold-receipt send failed to ${fragmentForLog(from)}: ${redactFragmentForLog(String(error))}`,
        ),
      );
    });
    logForDebugging(`[uds-messaging] Listening: ${path}`, {
      level: "info",
    });
    logForDebugging(
      `[uds-messaging] Inject messages (auth line ${udsMessagingState().authRequired ? "REQUIRED" : "optional"} here): { echo '{"type":"auth","token":"'"$CLAUDE_CODE_MESSAGING_TOKEN"'"}'; echo '{"type":"user","message":{"role":"user","content":"hello"}}'; } | socat - UNIX-CONNECT:${path}`,
      {
        level: "info",
      },
    );
    logForDebugging(
      `[uds-messaging] Connect when the data is ready (e.g. out=$(cmd); printf '%s\\n' "$out" | ${"nc -N -U"} "$CLAUDE_CODE_MESSAGING_SOCKET" \u2014 or the socat form above): a connection that sends no complete line within ${udsMessagingState().firstLineDeadlineMs} ms is closed`,
      {
        level: "info",
      },
    );
    udsMessagingState().lastStartFailureCause = undefined;
    return stopAndCleanup(p, path, n, h);
  } catch (error) {
    if (error instanceof CliUserError) throw error;
    if (s.isExplicit) {
      let errnoCode = getErrnoCode(error);
      if (_ !== undefined) {
        await stopUdsServer(p, path, n, {
          settleHeld: false,
        });
        _();
        clearMessagingEnv();
        udsMessagingState().lastStartFailureCause = "post_bind_setup_failed";
        throw new CliUserError(
          `--messaging-socket-path: bound ${path} but could not finish setting the socket up (${errnoCode ?? String(error)}); the inbox was closed. The filesystem there may not support socket permissions \u2014 choose another directory.`,
        );
      }
      clearActiveSocket();
      clearMessagingEnv();
      let D =
        errnoCode === "ENAMETOOLONG"
          ? "the path is too long for a Unix socket (max ~104 bytes); choose a shorter one"
          : errnoCode === "EADDRINUSE"
            ? "something already exists at that path and could not be replaced; remove it or choose another path"
            : errnoCode === "EACCES" || errnoCode === "EPERM"
              ? "permission denied in that directory"
              : "the socket could not be created there";
      throw new CliUserError(
        `--messaging-socket-path: cannot bind at ${path} (${errnoCode ?? String(error)}): ${D}.`,
      );
    }
    if (_ !== undefined) {
      await stopUdsServer(p, path, n, {
        settleHeld: false,
      });
      _();
      udsMessagingState().lastStartFailureCause = "post_bind_setup_failed";
    }
    if (getErrnoCode(error) === "ENAMETOOLONG")
      logForDebugging(
        `[uds-messaging] Socket path too long (${path.length} bytes, max ~104): ${path}. Try a shorter --messaging-socket-path, or set CLAUDE_CODE_TMPDIR or $XDG_RUNTIME_DIR to a shorter directory.`,
        {
          level: "error",
        },
      );
    else
      logForDebugging(`[uds-messaging] Failed to start: ${error}`, {
        level: "error",
      });
    clearActiveSocket();
    clearMessagingEnv();
    return;
  }
}
//@ chunk-0kp6eg01.js:34045-34926 placement
/**
 * 暂扣结果解释
 */
function holdOutcomeExplanation(e) {
  switch (e) {
    case "held":
      return "Your message is held for the recipient user's approval before it reaches their Claude session (permission-mode parity).";
    case "denied":
      return "The recipient user declined your message; it was not delivered to their Claude session.";
    case "expired":
      return "Your held message expired without approval and was not delivered to the recipient's Claude session.";
    case "delivered":
      return "Your previously-held message was approved and released to the recipient's Claude session.";
    case "refused":
      return "The recipient session is not accepting cross-session messages (the feature is off there, or a setting or policy there refuses them); your message was not delivered to its Claude.";
    case "dropped":
      return "The recipient's session dropped your message at its inbox (rate limit, duplicate, relay loop, or full queue); it was not delivered and will not be.";
  }
}
//@ chunk-0kp6eg01.js:34926-34987 placement
function senderClassFields() {
  let e = currentSenderClass();
  return e === undefined
    ? {}
    : {
        from_mode: e,
      };
}
//@ chunk-0kp6eg01.js:34987-35155 placement
function currentSenderClass() {
  if (!isModeEmitFlagOn()) return;
  let getCurrentMode = swarmHostState().inbound.getCurrentMode;
  if (getCurrentMode)
    try {
      return modeClass(getCurrentMode());
    } catch {
      return;
    }
  let modeAtUnwire = swarmHostState().inbound.modeAtUnwire;
  return modeAtUnwire !== undefined ? modeClass(modeAtUnwire) : undefined;
}
//@ chunk-0kp6eg01.js:35155-35193 placement
function senderClassOf(fromMode) {
  return isPeerFromMode(fromMode) ? fromMode : undefined;
}
//@ chunk-0kp6eg01.js:35193-35326 placement
function isSelfSentMessage(verifiedPeerPid, selfSentAncestry, s) {
  return isSelfSent({
    selfSentAncestry,
    verifiedPeerPid,
    childTokenPresented: s === "child",
    needsVerdict: isBypassDefaultHold(),
    platform: getPlatform(),
  });
}
//@ chunk-0kp6eg01.js:35326-35407 placement = useCostSummary (0.695)
/**
 * 只注册一次 process exit 监听，退出时删除 activeKeyFile。旧版名 useCostSummary 为错配。
 */
function registerActiveKeyFileCleanupOnExit() {
  if (!process.listeners("exit").includes(unlinkActiveKeyFileSync))
    process.on("exit", unlinkActiveKeyFileSync);
}
//@ chunk-0kp6eg01.js:35407-35485 placement
function unlinkActiveKeyFileSync() {
  try {
    let activeKeyFile = udsMessagingState().activeKeyFile;
    if (activeKeyFile === undefined) return;
    unlinkSync(activeKeyFile);
  } catch {}
}
export { setOnRename, getUdsInboxUnavailableReason, setOnPeerMessageStatus };

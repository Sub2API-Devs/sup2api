/**
 * utils/udsMessaging.ts
 *
 * 跨会话 UDS 消息服务：建立并校验 sockets 目录、绑定 socket、接收 user/control 消息、判定自发消息、空闲通知接线。旧版同名文件。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-htq1j0g1.js (64)
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
import { enqueue, flushPeerDropReceipts } from "./messageQueueManager.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-htq1j0g1.js:1870-1887 placement
var MAX_CACHED_VERDICTS = 500;
var MAX_ANCESTOR_HOPS = 32;
//@ chunk-htq1j0g1.js:1887-2163 placement
/**
 * 判定缓存
 */
class VerdictCache {
  verdicts = new Map();
  lookup(key) {
    let entry = this.verdicts.get(key);
    if (entry !== undefined) {
      this.verdicts.delete(key);
      this.verdicts.set(key, entry);
    }
    return entry;
  }
  remember(key, verdict) {
    if (this.verdicts.size >= MAX_CACHED_VERDICTS) {
      let oldestKey = this.verdicts.keys().next().value;
      if (oldestKey !== undefined) this.verdicts.delete(oldestKey);
    }
    this.verdicts.set(key, verdict);
  }
}
//@ chunk-htq1j0g1.js:2163-2558 placement
/**
 * 按宿主缓存的祖先进程判定缓存。
 */
var ancestryVerdicts; // deferred: uses VerdictCache of its import cycle while loading; runs once the cycle is complete
var ancestryDeps;
deferInit("chunk-htq1j0g1.js:2163", () => {
  ancestryVerdicts = new HostScoped(() => new VerdictCache());
  ancestryDeps = {
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
    readStartToken: (pid) =>
      getProcessStartTimeAsync(pid, {
        skipCache: true,
      }),
  };
});
//@ chunk-htq1j0g1.js:2558-2644 placement
function ancestryIncludesPid(selfSentAncestry, pid = process.pid) {
  if (pid === 1) return false;
  return Array.isArray(selfSentAncestry) && selfSentAncestry.includes(pid);
}
//@ chunk-htq1j0g1.js:2644-3145 placement
/**
 * 判定是否为自身
 */
async function classifyAncestry(pid, deps = ancestryDeps) {
  if (pid === undefined || !Number.isInteger(pid) || pid <= 0) return "no-evidence";
  let startToken;
  try {
    startToken = await deps.readStartToken(pid);
  } catch {
    startToken = undefined;
  }
  if (startToken === undefined) return "no-evidence";
  let verdictKey = `${pid}:${startToken}`;
  let verdictCache = ancestryVerdicts.of(getRootSession().host);
  let cachedVerdict = verdictCache.lookup(verdictKey);
  if (cachedVerdict !== undefined) return cachedVerdict ? "self" : "not-self";
  let ancestors;
  try {
    ancestors = await deps.readAncestors(pid);
  } catch {
    return "no-evidence";
  }
  let peerStartToken;
  try {
    peerStartToken = await deps.readStartToken(pid);
  } catch {
    peerStartToken = undefined;
  }
  if (peerStartToken !== startToken) return "no-evidence";
  let isSelf = process.pid !== 1 && ancestors.includes(process.pid);
  verdictCache.remember(verdictKey, isSelf);
  return isSelf ? "self" : "not-self";
}
//@ chunk-htq1j0g1.js:3145-3496 placement
/**
 * 是否为自己发送
 */
async function isSelfSent(message) {
  let selfPid = message.selfPid ?? process.pid;
  if (message.selfSentAncestry !== undefined && selfPid !== 1)
    return ancestryIncludesPid(message.selfSentAncestry, selfPid);
  if (!message.needsVerdict) return false;
  if (selfPid === 1 || message.platform === "windows") return message.childTokenPresented;
  if (message.platform !== "macos") return false;
  let verdict = await (message.verdictOf ?? classifyAncestry)(message.verifiedPeerPid);
  return verdict === "self" || (verdict === "no-evidence" && message.childTokenPresented);
}
//@ chunk-htq1j0g1.js:3496-3533 placement
function udsMessagingState() {
  return messagingSocketServerSlot.of(getRootSession().host);
}
//@ chunk-htq1j0g1.js:3533-3581 placement
function getUdsStartFailureCause() {
  return udsMessagingState().lastStartFailureCause;
}
//@ chunk-htq1j0g1.js:3581-3630 placement
function getUdsStartDegradedCause() {
  return udsMessagingState().lastStartDegradedCause;
}
//@ chunk-htq1j0g1.js:3630-3777 placement
function recordDegradedCause(cause) {
  let state = udsMessagingState();
  if (cause === "key_publish_failed" && state.lastStartDegradedCause === "primary_dir_refused_fell_back")
    return;
  state.lastStartDegradedCause = cause;
}
//@ chunk-htq1j0g1.js:3777-3808 placement
function getUdsInboxUnavailableReason() {
  return messagingSocketUnavailableReason(udsMessagingState());
}
//@ chunk-htq1j0g1.js:3808-3923 placement (2.1.88 match: extractErrorTypeFromData, 1)
function hasStringType_2(data) {
  if (typeof data !== "object" || data === null) return false;
  if (!("type" in data)) return false;
  return typeof data.type === "string";
}
//@ chunk-htq1j0g1.js:3923-3954 placement
function setOnRename(onRename) {
  udsMessagingState().onRename = onRename;
}
//@ chunk-htq1j0g1.js:3954-3998 placement
function setOnEnableRemoteControl(onEnableRemoteControl) {
  udsMessagingState().onEnableRemoteControl = onEnableRemoteControl;
}
//@ chunk-htq1j0g1.js:3998-4063 placement
function describeMessageId(origMsgId) {
  return isUuid(origMsgId) ? origMsgId : origMsgId === undefined ? "(none)" : "(malformed)";
}
//@ chunk-htq1j0g1.js:4063-4185 placement
function pickUuids(droppedMsgIds) {
  if (!Array.isArray(droppedMsgIds)) return [];
  let ids = [];
  for (let id of droppedMsgIds) {
    if (ids.length >= MAX_PENDING_DROP_IDS) break;
    if (isUuid(id)) ids.push(id);
  }
  return ids;
}
//@ chunk-htq1j0g1.js:4185-4227 placement
function setOnPeerMessageStatus(onPeerMessageStatus) {
  udsMessagingState().onPeerMessageStatus = onPeerMessageStatus;
}
//@ chunk-htq1j0g1.js:4227-4259 placement
function setOnEnqueue(onEnqueue) {
  udsMessagingState().onEnqueue = onEnqueue;
}
//@ chunk-htq1j0g1.js:4259-4481 placement
/**
 * 消息 session_id 是否匹配
 */
function sessionIdMatches(message) {
  if (message.session_id !== undefined && message.session_id !== getSessionId()) {
    logForDebugging(
      `[uds-messaging] Dropping ${fragmentForLog(message.type)} message: session_id mismatch (got "${fragmentForLog(String(message.session_id))}", expected "${getSessionId()}")`,
      {
        level: "warn",
      },
    );
    return false;
  }
  return true;
}
//@ chunk-htq1j0g1.js:4481-6034 placement
/**
 * 处理入站用户消息
 */
async function handleInboundUserMessage(
  message,
  verifiedPeerPid,
  verifiedPeerProcStart,
  selfSentAncestry,
  senderClass,
) {
  let content = message.message?.content;
  if (typeof content !== "string" || content.length === 0) {
    logForDebugging("[uds-messaging] Ignoring user message with missing or non-string content", {
      level: "warn",
    });
    return;
  }
  if (!sessionIdMatches(message)) return;
  let uuid = typeof message.uuid === "string" ? message.uuid : randomUUID();
  let refuseCause = inboundRefuseCause();
  if (refuseCause !== undefined) {
    logInboundRefused("uds: dropped before attachment materialization", refuseCause);
    sendPromptReceipt(
      {
        kind: "peer",
        from: message.from ?? "unknown",
        ...(verifiedPeerPid !== undefined && {
          verifiedPeerPid,
        }),
        ...(isUuid(message.msg_id) && {
          msg_id: message.msg_id,
        }),
      },
      "refused",
    );
    return;
  }
  let priority = queuePriorityOrUndefined(message.priority) ?? "next";
  let escapedContent = escapeTagStringStrict(content);
  let pluginId = sanitizeAddressPart(message.from_plugin);
  let hookResult = await dispatchSessionReceiveHooks({
    origin: {
      kind: "peer",
      ...(pluginId !== undefined && {
        plugin: pluginId,
      }),
    },
    content: escapedContent,
  });
  if (hookResult.consumed !== undefined) return;
  using queueing = hookResult.queueing;
  let hookContent = typeof hookResult.content === "string" ? hookResult.content : escapedContent;
  let promptText = hookContent;
  if (message.file_attachments !== undefined && isPeerSendFileEnabled())
    try {
      let { emitPeerFileReceiveTelemetry, injectPeerFilePrefix, materializeLocalPeerFiles } =
        await import("./peerFileReceive.js");
      let materialized = await materializeLocalPeerFiles(message.file_attachments);
      if (materialized.received > 0) {
        promptText = injectPeerFilePrefix(hookContent, materialized.prefix);
        emitPeerFileReceiveTelemetry("uds", materialized.received, materialized.verified);
      }
    } catch (error) {
      logForDebugging(
        `[uds-messaging] Failed to materialize file_attachments: ${redactFragmentForLog(String(error))}`,
        {
          level: "warn",
        },
      );
    }
  let selfSent = await isSelfSentMessage(verifiedPeerPid, selfSentAncestry, senderClass);
  let origin = stripPeerMessageBody(
    {
      kind: "peer",
      from: message.from ?? "unknown",
      ...(verifiedPeerPid !== undefined && {
        verifiedPeerPid,
      }),
      ...(verifiedPeerProcStart !== undefined && {
        verifiedPeerProcStart,
      }),
      ...(selfSent && {
        selfSent,
      }),
      ...(isUuid(message.msg_id) && {
        msg_id: message.msg_id,
      }),
      ...(pluginId !== undefined && {
        plugin: pluginId,
      }),
      ...peerMessageInfo(content),
    },
    promptText,
    content,
  );
  let command = {
    mode: "prompt",
    agentId: mainAgentId(),
    value: promptText,
    uuid,
    priority,
    origin,
    skipSlashCommands: true,
    isMeta: true,
    skipAttachments: true,
  };
  if (gatedPolicyFor(command) !== "accept") return;
  enqueue(command);
  queueing.queued();
  logForDebugging(
    `[uds-messaging] Routed user message to queue (priority=${priority}): ${fragmentForLog(promptText, 80)}`,
  );
  udsMessagingState().onEnqueue?.();
  notePeerReplyTarget(command);
}
//@ chunk-htq1j0g1.js:6034-6311 placement
/**
 * 记录对端回复目标
 */
function notePeerReplyTarget(message) {
  let origin = message.origin?.kind === "peer" ? message.origin : undefined;
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
//@ chunk-htq1j0g1.js:6311-6470 placement
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
//@ chunk-htq1j0g1.js:6470-11172 placement
/**
 * 处理入站消息
 */
async function handleInboundMessage(
  message,
  verifiedPeerPid,
  verifiedPeerProcStart,
  selfSentAncestry,
  senderClass,
) {
  if (!hasStringType_2(message)) {
    logForDebugging("[uds-messaging] Ignoring message without valid type field", {
      level: "warn",
    });
    return;
  }
  if (message.type === "user")
    await handleInboundUserMessage(
      message,
      verifiedPeerPid,
      verifiedPeerProcStart,
      selfSentAncestry,
      senderClass,
    );
  else if (message.type === "control") {
    if (!sessionIdMatches(message)) return;
    if (message.action === "rename" && typeof message.name === "string")
      udsMessagingState().onRename?.(message.name);
    else if (
      message.action === "peer_message_status" &&
      (message.status === "held" ||
        message.status === "denied" ||
        message.status === "expired" ||
        message.status === "delivered" ||
        message.status === "refused" ||
        message.status === "dropped")
    ) {
      let status =
        message.status === "expired" && message.status_detail === "refused" ? "refused" : message.status;
      let receipt = admitReceiptForOutstandingSend(message.orig_msg_id, status);
      if (status === "dropped") {
        let dropReason = normalizePeerDropReason(message.drop_reason);
        let droppedByDestination = admitDroppedIdsByDestination(pickUuids(message.dropped_msg_ids));
        if (receipt !== undefined) {
          let destinationEntry = droppedByDestination.get(receipt.sent.to) ?? {
            sends: [],
            wereHeld: 0,
          };
          destinationEntry.sends.push(receipt.sent);
          if (receipt.wasHeld) destinationEntry.wereHeld++;
          droppedByDestination.set(receipt.sent.to, destinationEntry);
        }
        if (dropReason === "queue-full")
          for (let [destination, { wereHeld: heldCount }] of droppedByDestination)
            for (let idx = 0; idx < heldCount; idx++) debitPacerForReleasedSend(destination);
        if (droppedByDestination.size === 0)
          logForDebugging(
            `[uds-messaging] peer_message_status dropped: neither orig_msg_id=${describeMessageId(message.orig_msg_id)} nor any named id matches an outstanding send`,
          );
        for (let { sends } of droppedByDestination.values())
          udsMessagingState().onPeerMessageStatus?.({
            status,
            sends,
            dropReason,
          });
      } else if (receipt === undefined)
        logForDebugging(
          `[uds-messaging] peer_message_status dropped: no outstanding send matches orig_msg_id=${describeMessageId(message.orig_msg_id)}`,
        );
      else {
        if (status === "held") creditPacerForHeldSend(receipt.sent.to);
        else if (status === "delivered" && receipt.wasHeld) debitPacerForReleasedSend(receipt.sent.to);
        udsMessagingState().onPeerMessageStatus?.({
          status,
          sent: receipt.sent,
        });
      }
    } else if (message.action === "notify_when_idle") {
      let parsedFrame = notifyWhenIdleFrameSchema().safeParse(message);
      if (!parsedFrame.success) {
        logForDebugging("[uds-messaging] notify_when_idle dropped: malformed frame");
        logFeatureSad("cross_session_notify_idle", "malformed_frame");
        return;
      }
      let activeSocketPath = udsMessagingState().activeSocketPath;
      let from = parsedFrame.data.from;
      let replyTarget =
        activeSocketPath !== undefined
          ? vettedPeerReplyTarget(from, activeSocketPath, verifiedPeerPid)
          : undefined;
      if (activeSocketPath === undefined) {
        logForDebugging("[uds-messaging] notify_when_idle dropped: own inbox not bound (shutting down)");
        logFeatureSad("cross_session_notify_idle", "own_inbox_unbound");
      } else if (replyTarget === undefined) {
        logForDebugging(
          `[uds-messaging] notify_when_idle dropped: reply address unshaped or outside our socket namespace (${fragmentForLog(from)})`,
        );
        logFeatureSad("cross_session_notify_idle", "unvettable_reply_target");
      } else if (canonicalSocketPath(replyTarget) === canonicalSocketPath(activeSocketPath)) {
        logForDebugging(
          "[uds-messaging] notify_when_idle dropped: reply target is this session (self-target)",
        );
        logFeatureSad("cross_session_notify_idle", "self_target_frame");
      } else {
        let selfSent = await isSelfSentMessage(verifiedPeerPid, selfSentAncestry, senderClass);
        let subscriptionResult = recordIdleSubscription(
          from,
          replyTarget,
          parsedFrame.data.msg_id,
          verifiedPeerPid,
          verifiedPeerProcStart,
          senderClass === "peer",
          senderClassOf(parsedFrame.data.from_mode),
          selfSent,
        );
        logForDebugging(
          `[uds-messaging] notify_when_idle from ${fragmentForLog(from)}: ${subscriptionResult}`,
        );
        if (subscriptionResult === "full")
          sendUnavailableNotice(
            replyTarget,
            parsedFrame.data.msg_id,
            verifiedPeerPid,
            senderClass === "peer",
            verifiedPeerProcStart,
          );
      }
    } else if (message.action === "peer_idle_notice") {
      let parsedFrame = peerIdleNoticeFrameSchema().safeParse(message);
      if (!parsedFrame.success) {
        logForDebugging("[uds-messaging] peer_idle_notice dropped: malformed frame");
        logFeatureSad("cross_session_notify_idle", "malformed_notice");
        return;
      }
      if (!hasOutstandingIdleSubscription(parsedFrame.data.orig_msg_id)) {
        logForDebugging(
          "[uds-messaging] peer_idle_notice: dropped (uncorrelated / already delivered / expired)",
        );
        return;
      }
      let selfSent = await isSelfSentMessage(verifiedPeerPid, selfSentAncestry, senderClass);
      if (
        !admitIdleNotice(
          parsedFrame.data.orig_msg_id,
          parsedFrame.data.state,
          parsedFrame.data.finished_at,
          parsedFrame.data.detail,
          senderClassOf(parsedFrame.data.from_mode),
          selfSent,
        )
      )
        logForDebugging(
          `[uds-messaging] peer_idle_notice not admitted: subscription for orig_msg_id=${fragmentForLog(parsedFrame.data.orig_msg_id)} was already consumed`,
        );
    } else if (message.action === "yield_artifact_replies") {
      let parsedFrame = yieldRequestSchema().safeParse(message);
      if (!parsedFrame.success) {
        logForDebugging("[uds-messaging] yield_artifact_replies dropped: malformed frame");
        logFeatureSad("artifact_comments_autoreact", "yield_malformed_frame");
        return;
      }
      let activeSocketPath = udsMessagingState().activeSocketPath;
      let replySocketPath =
        activeSocketPath !== undefined
          ? vettedPeerReplyTarget(parsedFrame.data.from, activeSocketPath, verifiedPeerPid)
          : undefined;
      if (activeSocketPath === undefined || replySocketPath === undefined) {
        logForDebugging(
          `[uds-messaging] yield_artifact_replies dropped: ${activeSocketPath === undefined ? "own inbox not bound" : "reply address unshaped or outside our socket namespace"} (${fragmentForLog(parsedFrame.data.from)})`,
        );
        logFeatureSad("artifact_comments_autoreact", "yield_unvettable_target");
        return;
      }
      if (canonicalSocketPath(replySocketPath) === canonicalSocketPath(activeSocketPath)) {
        logForDebugging("[uds-messaging] yield_artifact_replies dropped: reply target is this session");
        return;
      }
      let livePeer = await registeredLivePeerForSocket(replySocketPath);
      if (
        livePeer === undefined ||
        livePeer.sessionId !== getSessionId() ||
        (verifiedPeerPid !== undefined && livePeer.pid !== verifiedPeerPid)
      ) {
        logForDebugging(
          `[uds-messaging] yield_artifact_replies refused: requester is not a verified live session of this conversation (${fragmentForLog(parsedFrame.data.from)})`,
        );
        logFeatureSad("artifact_comments_autoreact", "yield_requester_unverified");
        answerYieldRequest(
          parsedFrame.data,
          replySocketPath,
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
        parsedFrame.data,
        replySocketPath,
        {
          pid: verifiedPeerPid ?? livePeer.pid,
          procStart:
            verifiedPeerProcStart ??
            (verifiedPeerPid === undefined || verifiedPeerPid === livePeer.pid
              ? livePeer.procStart
              : undefined),
          writeToken: verifiedPeerProcStart,
        },
        Date.now(),
      );
    } else if (message.action === "unyield_artifact_replies") {
      let parsedFrame = unyieldRequestSchema().safeParse(message);
      if (!parsedFrame.success || !handleUnyield(parsedFrame.data, verifiedPeerPid))
        logForDebugging(
          "[uds-messaging] unyield_artifact_replies dropped: malformed, uncorrelated or already handed back",
        );
    } else if (message.action === "artifact_replies_yielded") {
      let parsedFrame = yieldedResponseSchema().safeParse(message);
      if (!parsedFrame.success) {
        logForDebugging("[uds-messaging] artifact_replies_yielded dropped: malformed frame");
        logFeatureSad("artifact_live_subscribe", "yield_malformed_answer");
        return;
      }
      if (!hasOutstanding(parsedFrame.data.orig_msg_id)) {
        logForDebugging("[uds-messaging] artifact_replies_yielded dropped: uncorrelated or already settled");
        return;
      }
      handleYieldRequest(parsedFrame.data, verifiedPeerPid);
    } else
      logForDebugging(`[uds-messaging] Unhandled control action: ${fragmentForLog(String(message.action))}`);
  } else logForDebugging(`[uds-messaging] Received unhandled message type: ${fragmentForLog(message.type)}`);
}
//@ chunk-htq1j0g1.js:11172-11573 placement
/**
 * 分派入站消息
 */
function routeInboundMessage(message, verifiedPeerPid, verifiedPeerProcStart, selfSentAncestry, senderClass) {
  if (
    hasStringType_2(message) &&
    ((message.type === "control" && message.action !== "notify_when_idle") ||
      (message.type === "user" && message.priority === "now" && message.file_attachments === undefined))
  ) {
    handleInboundMessage(
      message,
      verifiedPeerPid,
      verifiedPeerProcStart,
      selfSentAncestry,
      senderClass,
    ).catch((error) => {
      logForDebugging(`[uds-messaging] Failed to process message: ${error}`, {
        level: "warn",
      });
    });
    return;
  }
  udsMessagingState().processingChain = udsMessagingState()
    .processingChain.then(() =>
      handleInboundMessage(message, verifiedPeerPid, verifiedPeerProcStart, selfSentAncestry, senderClass),
    )
    .catch((error) => {
      logForDebugging(`[uds-messaging] Failed to process message: ${error}`, {
        level: "warn",
      });
    });
}
//@ chunk-htq1j0g1.js:11573-11585 placement
var IDLE_FLUSH_TIMEOUT_MS = 3000;
//@ chunk-htq1j0g1.js:11585-11671 placement
function awaitProcessingChain(timeoutMs = 3000) {
  return Promise.race([
    udsMessagingState().processingChain,
    sleep(timeoutMs, undefined, {
      unref: true,
    }),
  ]);
}
//@ chunk-htq1j0g1.js:11671-13955 placement
/**
 * 处理 UDS 连接
 */
function handleConnection(socket) {
  socket.setEncoding("utf8");
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
      socket.destroy();
    } catch (error) {
      logForDebugging(`[uds-messaging] Failed to close a silent connection: ${error}`, {
        level: "warn",
      });
    }
  }, firstLineDeadlineMs);
  timer.unref();
  let clearDeadline = () => {
    if (timer !== undefined) {
      clearTimeout(timer);
      timer = undefined;
    }
  };
  socket.once("close", clearDeadline);
  socket.once("error", clearDeadline);
  let clientPid;
  let clientProcStart;
  let clientResolved = false;
  let ancestorPids;
  let selfStartToken;
  let bypassDefaultHold = process.pid !== 1 && isBypassDefaultHold();
  if (bypassDefaultHold) {
    let peerPid = getPeerPid(socket);
    let selfProcStart = peerPid !== undefined ? getProcessStartTokenLinuxSync(peerPid) : undefined;
    if (peerPid !== undefined && selfProcStart !== undefined)
      selfStartToken = {
        pid: peerPid,
        token: selfProcStart,
      };
  }
  let lineBuffer = "";
  let authRole;
  let sawAuthFrame = false;
  let dropUnauthenticated = (lineDescription) => {
    logForDebugging(
      `[uds-messaging] Dropped ${lineDescription} from a connection that did not authenticate; closing it`,
      {
        level: "warn",
      },
    );
    if (!udsMessagingState().authDropReported) {
      udsMessagingState().authDropReported = true;
      logFeatureBad("cross_session_inbox_auth", "unauthed_drop");
    }
    socket.destroy();
  };
  let processFrame = (frame) => {
    let isFirstFrame = !sawAuthFrame;
    sawAuthFrame = true;
    if (isAuthItem(frame)) {
      if (isFirstFrame) {
        authRole = tokenRole(frame.token, udsMessagingState().activeTokens);
        if (authRole !== undefined && !udsMessagingState().authOkReported) {
          udsMessagingState().authOkReported = true;
          logFeatureOk("cross_session_inbox_auth");
        }
        if (authRole === undefined && udsMessagingState().authRequired)
          dropUnauthenticated("a bad auth frame");
      }
      return;
    }
    if (udsMessagingState().authRequired && authRole === undefined) {
      dropUnauthenticated(hasStringType_2(frame) ? `a '${fragmentForLog(frame.type)}' line` : "a line");
      return;
    }
    if (!clientResolved) {
      clientPid = getPeerPid(socket);
      clientProcStart =
        clientPid === undefined
          ? undefined
          : selfStartToken !== undefined
            ? selfStartToken.pid === clientPid
              ? selfStartToken.token
              : undefined
            : getProcessStartTokenLinuxSync(clientPid);
      clientResolved = true;
      if (clientPid !== undefined && bypassDefaultHold)
        ancestorPids =
          selfStartToken !== undefined &&
          selfStartToken.pid === clientPid &&
          getProcessStartTokenLinuxSync(clientPid) === selfStartToken.token
            ? getAncestorPidsLinuxSync(clientPid)
            : [];
    }
    routeInboundMessage(frame, clientPid, clientProcStart, ancestorPids, authRole);
  };
  let handleLine = (message) => {
    try {
      processFrame(message);
    } catch (error) {
      logForDebugging(`[uds-messaging] Failed to handle line: ${error}`, {
        level: "warn",
      });
    }
  };
  socket.on("data", (chunk) => {
    lineBuffer += chunk;
    if (lineBuffer.length > MAX_PEER_MESSAGE_BYTES) {
      logForDebugging(`[uds-messaging] Line exceeded ${MAX_PEER_MESSAGE_BYTES} chars; dropping connection`, {
        level: "warn",
      });
      socket.destroy();
      lineBuffer = "";
      return;
    }
    let newlineIndex;
    while (
      (newlineIndex = lineBuffer.indexOf(`
`)) !== -1
    ) {
      let text = lineBuffer.slice(0, newlineIndex);
      lineBuffer = lineBuffer.slice(newlineIndex + 1);
      clearDeadline();
      if (!text.trim()) {
        if (udsMessagingState().authRequired && authRole === undefined) {
          sawAuthFrame = true;
          dropUnauthenticated("a blank line");
          lineBuffer = "";
          return;
        }
        continue;
      }
      let message;
      try {
        message = jsonParseRaw(text);
      } catch {
        logForDebugging(`[uds-messaging] Failed to parse JSON line: ${redactFragmentForLog(text)}`, {
          level: "warn",
        });
        if (udsMessagingState().authRequired && authRole === undefined) {
          sawAuthFrame = true;
          dropUnauthenticated("an unparseable line");
          lineBuffer = "";
          return;
        }
        continue;
      }
      handleLine(message);
      if (socket.destroyed) {
        lineBuffer = "";
        return;
      }
    }
  });
  socket.on("end", () => {
    if (lineBuffer.trim() && !socket.destroyed) {
      let message;
      let parsed = false;
      try {
        message = jsonParseRaw(lineBuffer);
        parsed = true;
      } catch {
        logForDebugging(`[uds-messaging] Failed to parse final buffer: ${redactFragmentForLog(lineBuffer)}`, {
          level: "warn",
        });
        if (udsMessagingState().authRequired && authRole === undefined)
          dropUnauthenticated("an unparseable final fragment");
      }
      if (parsed) handleLine(message);
    }
    socket.end();
  });
  socket.on("error", (error) => {
    logForDebugging(`[uds-messaging] Connection error: ${error.message}`, {
      level: "warn",
    });
  });
}
//@ chunk-htq1j0g1.js:13955-13998 placement
function getUdsMessagingSocketPath() {
  return udsMessagingState().activeSocketPath;
}
//@ chunk-htq1j0g1.js:13998-14008 placement
var MAX_SOCKET_PATH_BYTES = 103;
//@ chunk-htq1j0g1.js:14008-14146 placement
function getDefaultUdsSocketPath() {
  let base = env.XDG_RUNTIME_DIR || tmpdir();
  let path = resolve(join(base, "cc-socks", `${process.pid}.sock`));
  if (Buffer.byteLength(path) <= MAX_SOCKET_PATH_BYTES) return path;
  return getPerUidFallbackUdsSocketPath();
}
//@ chunk-htq1j0g1.js:14146-14295 placement
function getPerUidFallbackUdsSocketPath(uid = process.getuid?.() ?? 0) {
  let PREFIX = env.TERMUX_VERSION ? env.PREFIX : undefined;
  let path = PREFIX ? join(PREFIX, "tmp") : "/tmp";
  return join(path, `cc-socks-${uid}`, `${process.pid}.sock`);
}
//@ chunk-htq1j0g1.js:14295-14654 placement
/**
 * 关闭 UDS 服务
 */
async function stopUdsServer(a_2, b, c, { settleHeld = true } = {}) {
  for (let connectedClient of udsMessagingState().connectedClients) connectedClient.destroy();
  udsMessagingState().connectedClients.clear();
  a_2.close();
  if (settleHeld) noteParkedAtShutdown();
  let client = settleHeld ? settleHeldInboundOnShutdown() : undefined;
  await awaitProcessingChain();
  let idleFlush = settleHeld
    ? withDeadline(flushIdleSubscribers("exited"), IDLE_FLUSH_TIMEOUT_MS)
    : undefined;
  await client;
  await idleFlush;
  if (settleHeld) await flushPeerDropReceipts();
  try {
    await unlink(b);
  } catch {}
  let state = udsMessagingState();
  if (state.activeKeyFile !== undefined) {
    await deleteSessionRecord(state.activeKeyFile, c);
    state.activeKeyFile = undefined;
  }
  clearActiveSocket();
}
//@ chunk-htq1j0g1.js:14654-14890 placement
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
//@ chunk-htq1j0g1.js:14890-14948 placement
function stopAndCleanup(a, b, c, options) {
  return async () => {
    await stopUdsServer(a, b, c);
    options();
  };
}
//@ chunk-htq1j0g1.js:14948-15139 placement
/**
 * 探测 socket 是否存活
 */
function probeSocket(path) {
  return new Promise((resolve) => {
    let socket = new Socket();
    let finish = (status) => {
      socket.destroy();
      resolve(status);
    };
    socket.on("connect", () => finish("live"));
    socket.on("error", () => finish("dead"));
    socket.setTimeout(250, () => finish("dead"));
    socket.connect({
      path,
    });
  });
}
//@ chunk-htq1j0g1.js:15139-15308 placement
/**
 * 尝试监听
 */
function tryListen(server, path) {
  return new Promise((resolve, reject) => {
    function onError(error) {
      if (getErrnoCode(error) === "EADDRINUSE") resolve(false);
      else reject(error);
    }
    server.once("error", onError);
    server.listen(path, () => {
      server.removeListener("error", onError);
      resolve(true);
    });
  });
}
//@ chunk-htq1j0g1.js:15308-15543 placement
/**
 * 生成兄弟 socket 路径
 */
function siblingSocketPath(path) {
  let candidate = `${path.replace(/\.sock$/, "")}-${randomBytes(4).toString("hex")}.sock`;
  if (Buffer.byteLength(candidate) <= MAX_SOCKET_PATH_BYTES) return candidate;
  let parentDir = join(path, "..");
  let hexLength = MAX_SOCKET_PATH_BYTES - Buffer.byteLength(join(parentDir, ".sock"));
  return join(parentDir, `${randomBytes(8).toString("hex").slice(0, Math.max(1, hexLength))}.sock`);
}
//@ chunk-htq1j0g1.js:15543-15865 placement
/**
 * 清理陈旧的兄弟 socket
 */
async function sweepStaleSiblingSockets(path) {
  let prefix = `${basename(path).replace(/\.sock$/, "")}-`;
  let directoryEntries;
  try {
    directoryEntries = await readdir(dirname(path));
  } catch {
    return;
  }
  for (let entryName of directoryEntries) {
    if (!entryName.startsWith(prefix) || !/^[0-9a-f]{8}\.sock$/.test(entryName.slice(prefix.length)))
      continue;
    let path_2 = join(dirname(path), entryName);
    if ((await probeSocket(path_2)) === "live") continue;
    try {
      await unlink(path_2);
      logForDebugging(`[uds-messaging] Reaped stale moved-aside socket ${path_2}`);
    } catch {}
  }
}
//@ chunk-htq1j0g1.js:15865-16286 placement
/**
 * 绑定自动 socket 路径
 */
async function bindAutoSocketPath(server, path) {
  await sweepStaleSiblingSockets(path);
  if (await tryListen(server, path)) return path;
  if ((await probeSocket(path)) !== "live") {
    try {
      await unlink(path);
    } catch {}
    if (await tryListen(server, path)) return path;
  }
  for (let idx = 0; idx < 3; idx++) {
    let siblingPath = siblingSocketPath(path);
    logForDebugging(
      `[uds-messaging] Auto socket path ${path} is another session's live socket (sibling pid namespace?); binding at ${siblingPath} instead`,
      {
        level: "warn",
      },
    );
    if (await tryListen(server, siblingPath)) return siblingPath;
  }
  throw Error("listen EADDRINUSE on the auto socket path and its moved-aside siblings");
}
//@ chunk-htq1j0g1.js:16286-16388 placement
function startCrossSessionInbox(path, storageV5, options = {}) {
  return startUdsMessaging(path ?? getDefaultUdsSocketPath(), storageV5, {
    isExplicit: path !== undefined,
    profileStartup: options.profileStartup,
  });
}
//@ chunk-htq1j0g1.js:16388-16482 placement
function clearMessagingEnv() {
  udsEnv.unset("CLAUDE_CODE_MESSAGING_SOCKET");
  udsEnv.unset("CLAUDE_CODE_MESSAGING_TOKEN");
}
//@ chunk-htq1j0g1.js:16482-16618 placement
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
//@ chunk-htq1j0g1.js:16618-16709 placement
function socketDirRefusalError(socketsDirVetKind, error, refusedComponent) {
  return Object.assign(error, {
    socketsDirVetKind,
    ...(refusedComponent && {
      refusedComponent,
    }),
  });
}
//@ chunk-htq1j0g1.js:16709-17135 placement
/**
 * 取被拒的路径组件
 */
function refusedComponentOf(error) {
  if (!(error instanceof Error) || !("refusedComponent" in error)) return;
  let refusedComponent = error.refusedComponent;
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
//@ chunk-htq1j0g1.js:17135-17237 placement
function socketDirFacts(path, stats, ownerRefused) {
  return {
    path,
    uid: stats.uid,
    gid: stats.gid,
    mode: stats.mode & 4095,
    ...(ownerRefused !== undefined && {
      ownerRefused,
    }),
  };
}
//@ chunk-htq1j0g1.js:17237-18791 placement
/**
 * 描述 sockets 目录拒绝原因
 */
function describeSocketDirRefusal(error) {
  if (socketDirVetKind(error) === "uid_collapse")
    return "this process runs in a user namespace without a uid mapping, so file ownership cannot be verified \u2014 start it with a uid map (e.g. unshare -Ur), or pass --messaging-socket-path";
  let component = refusedComponentOf(error);
  if (component === undefined) return;
  let padded = component.mode.toString(8).padStart(4, "0");
  let ownerModeText = `(owner ${component.uid}:${component.gid}, mode ${padded})`;
  let pathHint = "or pass --messaging-socket-path";
  let printablePath = printableName(component.path);
  let isPrintable = printablePath === component.path;
  let quotedPrintablePath = `'${Array.from(printablePath, (char) => {
    if (SAFE_PATH_CHAR_PATTERN.test(char)) return char;
    isPrintable = false;
    return "?";
  }).join("")}'`;
  let canChmod = isPrintable;
  let describeFix = (bitName, extraHint) =>
    canChmod
      ? `chmod ${bitName} ${shellQuoteArgs([component.path])}${extraHint}`
      : `clear its ${bitName === "o-w" ? "other" : "group"}-write bit${extraHint}`;
  switch (socketDirVetKind(error)) {
    case "directory_rule": {
      if (component.ownerRefused === true)
        return `${quotedPrintablePath} is not owned by you or root ${ownerModeText} \u2014 use a private directory (XDG_RUNTIME_DIR / CLAUDE_CODE_TMPDIR), ${pathHint}`;
      let hasStickyBit = (component.mode & 512) !== 0;
      if (!hasStickyBit && (component.mode & 2) !== 0)
        return `${quotedPrintablePath} is world-writable without the sticky bit ${ownerModeText} \u2014 ${describeFix("o-w", " (or chmod +t)")}, ${pathHint}`;
      if (!hasStickyBit && (component.mode & 16) !== 0)
        return `${quotedPrintablePath} is group-writable without the sticky bit ${ownerModeText} \u2014 ${describeFix("g-w", "")}, ${pathHint}`;
      return `${quotedPrintablePath} is not owned by you or root ${ownerModeText} \u2014 use a private directory (XDG_RUNTIME_DIR / CLAUDE_CODE_TMPDIR), ${pathHint}`;
    }
    case "foreign_owner":
      return `${quotedPrintablePath} is owned by another user ${ownerModeText} \u2014 use a private directory (XDG_RUNTIME_DIR / CLAUDE_CODE_TMPDIR), ${pathHint}`;
    case "not_directory":
    case "leaf_shape":
      return `${quotedPrintablePath} is not a directory ${ownerModeText} \u2014 remove it or use a private directory (XDG_RUNTIME_DIR / CLAUDE_CODE_TMPDIR), ${pathHint}`;
    case "dangling_link":
    case "raced":
    case "symlink_loop":
    case "uid_collapse":
    case "internal":
    case undefined:
      return;
  }
}
//@ chunk-htq1j0g1.js:18791-18895 placement
var SAFE_PATH_CHAR_PATTERN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PERMANENT_SOCKET_ERRNOS;
deferInit("chunk-htq1j0g1.js:18791", () => {
  SAFE_PATH_CHAR_PATTERN = /^[A-Za-z0-9._\/ ~+=:@,#%-]$/;
  PERMANENT_SOCKET_ERRNOS = new Set(["EACCES", "EPERM", "EROFS", "ENOSPC", "EDQUOT", "ENOTDIR"]);
});
//@ chunk-htq1j0g1.js:18895-19163 placement
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
//@ chunk-htq1j0g1.js:19163-19291 placement
function socketDirVetKind(error) {
  if (!(error instanceof Error) || !("socketsDirVetKind" in error)) return;
  let socketsDirVetKind = error.socketsDirVetKind;
  return SOCKET_DIR_VET_KINDS.find((knownKind) => knownKind === socketsDirVetKind);
}
//@ chunk-htq1j0g1.js:19291-19465 placement
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
//@ chunk-htq1j0g1.js:19465-19986 placement
/**
 * sockets 目录被拒时的建议：把 XDG_RUNTIME_DIR 或 CLAUDE_CODE_TMPDIR 指向私有目录。
 */
var SOCKET_DIR_HINTS =
  "Point XDG_RUNTIME_DIR or CLAUDE_CODE_TMPDIR at a private (0700) directory you own to use a different location.";
var SOCKET_DIR_COMPONENT_REFUSAL_HINT = `A component of the sockets path is not a directory (a regular file is in the way). ${SOCKET_DIR_HINTS}`;
var SOCKET_DIR_LOOP_REFUSAL_HINT = `The sockets path runs through a symlink loop. ${SOCKET_DIR_HINTS}`;
var SOCKET_DIR_USERNS_REFUSAL_HINT =
  "This process runs in a user namespace without a uid mapping (its own uid reads as the kernel overflow uid), so file ownership cannot be verified. Start it with a uid map (e.g. `unshare -Ur` / `--map-current-user`), or pass --messaging-socket-path.";
//@ chunk-htq1j0g1.js:19986-20727 placement
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
//@ chunk-htq1j0g1.js:20727-21060 placement
/**
 * 拒绝使用 sockets 目录
 */
function refuseSocketDir(path, error, hint) {
  udsMessagingState().lastStartFailureCause = "socket_dir_refused";
  let refusalDetail = describeSocketDirRefusal(error);
  udsMessagingState().lastStartFailureDetail = refusalDetail;
  clearActiveSocket();
  logForDebugging(
    `[uds-messaging] Failed to set up sockets directory ${path} (refusing to bind \u2014 cross-session messaging is OFF for this session): ${errorMessage(error)}.${refusalDetail ? ` Refused component: ${refusalDetail}.` : ""}${hint ? ` ${hint}` : ""}`,
    {
      level: "error",
    },
  );
  clearMessagingEnv();
  return;
}
//@ chunk-htq1j0g1.js:21060-24277 placement
/**
 * 检查 sockets 目录
 */
async function vetSocketsDir(path) {
  if (!isAbsolute(path))
    throw socketDirRefusalError("internal", Error("sockets directory must be absolute here"));
  let ownUid = process.getuid?.();
  let assertLeafShape = (stats) => {
    if (stats.isSymbolicLink())
      throw socketDirRefusalError(
        "leaf_shape",
        Error("sockets directory is a symlink \u2014 refusing to use it"),
        socketDirFacts(path, stats),
      );
    if (!stats.isDirectory())
      throw socketDirRefusalError(
        "leaf_shape",
        Error("sockets directory exists but is not a directory"),
        socketDirFacts(path, stats),
      );
    if (ownUid !== undefined && !isOwnUid(stats.uid))
      throw socketDirRefusalError(
        "foreign_owner",
        Error("sockets directory is owned by another user \u2014 refusing to use it"),
        socketDirFacts(path, stats),
      );
  };
  let isOwnUid = (uid) => uid === ownUid;
  let ownGid = process.getgid?.();
  let namespaceInfo = await inspectUserNamespace();
  if (namespaceInfo?.uidCollapses)
    throw socketDirRefusalError(
      "uid_collapse",
      Error(
        "this process reads as the kernel overflow uid (user namespace without a uid mapping) \u2014 ownership cannot be verified; refusing to use the sockets directory",
      ),
    );
  isOwnUid = (uid) => uid === ownUid && !namespaceInfo?.uidCollapses;
  let sharedDirs = sharedSystemDirs();
  let resolveStableRealPath = async (dir, stats) => {
    try {
      let realPath = stats.isSymbolicLink()
        ? join(await realpath(dirname(dir)), basename(dir))
        : await realpath(dir);
      let realStats = await lstat(realPath);
      return realStats.dev === stats.dev && realStats.ino === stats.ino ? realPath : undefined;
    } catch {
      return;
    }
  };
  let isNamespaceUid = (uid) =>
    namespaceInfo !== undefined &&
    ((namespaceInfo.unmappedOwnerUid !== undefined && uid === namespaceInfo.unmappedOwnerUid) ||
      (uid === 0 && namespaceInfo.rootUidAmbiguous));
  let isAmbiguousUid = isNamespaceUid;
  let isSharedSystemDir = (path) => path !== undefined && sharedDirs.has(path);
  let isAcceptableOwner = (uid, allowRoot, realPath) =>
    ownUid === undefined ||
    isOwnUid(uid) ||
    (!allowRoot && (isNamespaceUid(uid) ? isSharedSystemDir(realPath) : uid === 0));
  let isUsableDirectory = (stats, allowRoot, realPath) => {
    if (!isAcceptableOwner(stats.uid, allowRoot, realPath)) return false;
    if ((stats.mode & 512) !== 0) return true;
    if ((stats.mode & 2) !== 0) return false;
    if ((stats.mode & 16) !== 0)
      return isOwnUid(stats.uid) && ownGid !== undefined && stats.gid === ownGid && ownGid === ownUid;
    return true;
  };
  let termuxPrefixRoot = env.TERMUX_VERSION && env.PREFIX ? dirname(dirname(env.PREFIX)) : undefined;
  let isStopDir = (dir) => dirname(dir) === dir || dir === termuxPrefixRoot;
  let checkAncestry = async (startDir, allowRoot, depth = 0) => {
    if (depth > 16)
      throw socketDirRefusalError(
        "symlink_loop",
        Error("sockets-directory chain: too many levels of symlinks"),
      );
    let startDirExists = false;
    let deepestExisting;
    let sawSymlink = false;
    for (let dir = startDir, isStart = true; ; dir = dirname(dir), isStart = false) {
      let stats;
      try {
        stats = await lstat(dir);
      } catch (error) {
        if (!isENOENT(error)) throw error;
      }
      if (stats !== undefined) {
        deepestExisting ??= dir;
        let rootAllowed = isStart && allowRoot;
        if (stats.isSymbolicLink()) {
          sawSymlink = true;
          let resolvedLink = isAmbiguousUid(stats.uid) ? await resolveStableRealPath(dir, stats) : undefined;
          if (!isAcceptableOwner(stats.uid, false, resolvedLink))
            throw socketDirRefusalError(
              "foreign_owner",
              Error(
                "a sockets-directory component is a symlink owned by another user \u2014 refusing to use it",
              ),
              socketDirFacts(dir, stats),
            );
          let replaced = (await readlink(dir)).replace(/\/{2,}/g, "/");
          let linkTarget = replaced.length > 1 && replaced.endsWith("/") ? replaced.slice(0, -1) : replaced;
          let absoluteTarget = isAbsolute(linkTarget)
            ? linkTarget
            : `${await realpath(dirname(dir))}/${linkTarget}`;
          let { startExists } = await checkAncestry(absoluteTarget, rootAllowed, depth + 1);
          if (isStart) startDirExists = startExists;
        } else {
          if (!stats.isDirectory())
            throw socketDirRefusalError(
              "not_directory",
              Error("a sockets-directory component exists but is not a directory \u2014 refusing to use it"),
              socketDirFacts(dir, stats),
            );
          let resolvedOwnerDir = isAmbiguousUid(stats.uid)
            ? await resolveStableRealPath(dir, stats)
            : undefined;
          if (!isUsableDirectory(stats, rootAllowed, resolvedOwnerDir))
            throw socketDirRefusalError(
              "directory_rule",
              Error(
                "a sockets-directory component is not a private-or-sticky directory owned by us or root \u2014 refusing to use it",
              ),
              socketDirFacts(dir, stats, !isAcceptableOwner(stats.uid, rootAllowed, resolvedOwnerDir)),
            );
          if (isStart) startDirExists = true;
        }
      }
      if (isStopDir(dir)) break;
    }
    return {
      startExists: startDirExists,
      deepestExisting,
      sawSymlink,
    };
  };
  let baseDir = dirname(path);
  let baseCheck = await checkAncestry(baseDir, false);
  let baseMissing = !baseCheck.startExists;
  let leafStats;
  try {
    leafStats = await lstat(path);
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
  if (baseMissing && baseCheck.deepestExisting === baseDir) throw danglingLinkError();
  if (baseMissing) {
    let missingDirs = [];
    let assertPrivateDir = (stats) => {
      if (!stats.isDirectory() || (ownUid !== undefined && !isOwnUid(stats.uid)))
        throw socketDirRefusalError(
          "raced",
          Error(
            "a sockets-directory component appeared while being created and is not our directory \u2014 refusing to use it",
          ),
        );
    };
    for (let dir = baseDir; dir !== baseCheck.deepestExisting && !isStopDir(dir); dir = dirname(dir))
      missingDirs.unshift(dir);
    for (let dir of missingDirs)
      try {
        await mkdir(dir, {
          mode: 448,
        });
      } catch (error) {
        if (isENOENT(error) && baseCheck.sawSymlink) throw danglingLinkError();
        if (getErrnoCode(error) !== "EEXIST") throw error;
        assertPrivateDir(await lstat(dir));
      }
    if (!(await checkAncestry(baseDir, true)).startExists)
      throw socketDirRefusalError("raced", Error("sockets base directory vanished while being set up"));
  }
  if (leafStats === undefined) {
    try {
      await mkdir(path, {
        mode: 448,
      });
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") throw error;
    }
    leafStats = await lstat(path);
  }
  assertLeafShape(leafStats);
  if ((leafStats.mode & 511) !== 448) await chmod(path, 448);
}
//@ chunk-htq1j0g1.js:24277-27548 placement
/**
 * 校验 --messaging-socket-path 显式指定的 UDS 路径（目录所有者、权限、符号链接），不合格时拒绝绑定。本模块整体是跨会话 UDS 消息服务：建 socket 目录、绑定、接收 user/control 消息、祖先进程判定自发消息。
 */
async function validateExplicitMessagingSocketPath(path) {
  if (!isAbsolute(path))
    throw new CliUserError(
      path === ""
        ? "--messaging-socket-path was given an empty value (an unset shell variable?). Pass an absolute socket path."
        : `--messaging-socket-path must be an absolute path, got: ${path}`,
    );
  if (path.split("/").includes(".."))
    throw new CliUserError(`--messaging-socket-path must not contain '..' segments, got: ${path}`);
  let last = path.split("/").at(-1);
  if (last === "" || last === ".")
    throw new CliUserError(
      `--messaging-socket-path must name a socket file inside a directory, got: ${path}`,
    );
  let replaced = normalize(path).replace(/\/+$/, "");
  if (replaced === "" || !replaced.startsWith("/") || basename(replaced) === "")
    throw new CliUserError(
      `--messaging-socket-path must name a socket file inside a directory, got: ${path}`,
    );
  if (!isValidPipeOrPath(replaced) || !isValidPipeOrPath(path))
    throw new CliUserError(`--messaging-socket-path must be a local socket path, got: ${path}`);
  if (Buffer.byteLength(replaced) > MAX_SOCKET_PATH_BYTES)
    throw new CliUserError(
      `--messaging-socket-path is too long for a Unix socket (${Buffer.byteLength(replaced)} bytes, max ${MAX_SOCKET_PATH_BYTES}): ${replaced}. Choose a shorter path, e.g. under $XDG_RUNTIME_DIR or /tmp/<private-dir>.`,
    );
  let socketDir = dirname(replaced);
  let fixHint =
    "Use a private directory you own that only you use, e.g. mkdir -m 700 <dir> (or chmod 700 an existing one).";
  let assertDirectory = (stats) => {
    if (stats.isSymbolicLink())
      throw new CliUserError(
        `--messaging-socket-path directory must be a real directory, not a symlink: ${socketDir}. ${fixHint}`,
      );
    if (!stats.isDirectory())
      throw new CliUserError(`--messaging-socket-path parent is not a directory: ${socketDir}.`);
    let uid = process.getuid?.();
    if (uid !== undefined && stats.uid !== uid)
      throw new CliUserError(
        `--messaging-socket-path directory ${socketDir} is not owned by you (uid ${stats.uid}). ${fixHint}`,
      );
    if ((stats.mode & 63) !== 0)
      throw new CliUserError(
        `--messaging-socket-path directory ${socketDir} is not private (mode ${(stats.mode & 4095).toString(8)}); the socket directory must be mode 0700 so no other user or group can reach or replace the socket. ${fixHint}`,
      );
  };
  let statSocketDir = async () => {
    try {
      return await lstat(socketDir);
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
          `--messaging-socket-path directory is not usable: ${socketDir} (${errnoCode}). Fix the path or its permissions, or choose another path. ${fixHint}`,
        );
      throw new CliUserError(
        `--messaging-socket-path directory could not be examined: ${socketDir} (${errnoCode ?? String(error)}). ${fixHint}`,
      );
    }
  };
  let dirStats = await statSocketDir();
  if (dirStats !== undefined) {
    assertDirectory(dirStats);
    return replaced;
  }
  let ownUid = process.getuid?.();
  let missingDirs = [];
  for (let dir = dirname(socketDir); ; dir = dirname(dir)) {
    let stats;
    try {
      stats = await lstat(dir);
    } catch (error) {
      if (!isENOENT(error))
        throw new CliUserError(
          `--messaging-socket-path: cannot inspect ${dir} (${getErrnoCode(error) ?? error}). ${fixHint}`,
        );
      missingDirs.unshift(dir);
    }
    if (stats !== undefined) {
      if (ownUid !== undefined && stats.uid !== ownUid && stats.uid !== 0)
        throw new CliUserError(
          `--messaging-socket-path: ${dir} ${stats.isSymbolicLink() ? "is a symlink" : "is a directory"} owned by another user \u2014 refusing to create your sockets directory ${stats.isSymbolicLink() ? "through" : "inside"} it. ${fixHint}`,
        );
      break;
    }
    if (dirname(dir) === dir) break;
  }
  let created = false;
  try {
    for (let dir of missingDirs)
      try {
        await mkdir(dir, {
          mode: 448,
        });
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
        let stats = await lstat(dir);
        if (!stats.isDirectory() || (ownUid !== undefined && stats.uid !== ownUid))
          throw new CliUserError(
            `--messaging-socket-path: ${dir} appeared while your sockets directory was being created and is not a directory you own \u2014 refusing to use it. ${fixHint}`,
          );
      }
    try {
      await mkdir(socketDir, {
        mode: 448,
      });
      created = true;
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") throw error;
    }
  } catch (error) {
    if (error instanceof CliUserError) throw error;
    throw new CliUserError(
      `--messaging-socket-path directory ${socketDir} does not exist and could not be created (${getErrnoCode(error) ?? error}). ${fixHint}`,
    );
  }
  let directoryStats = await statSocketDir();
  if (directoryStats === undefined)
    throw new CliUserError(
      `--messaging-socket-path directory ${socketDir} vanished while being set up. ${fixHint}`,
    );
  if (!created) {
    assertDirectory(directoryStats);
    return replaced;
  }
  assertDirectory(directoryStats);
  return replaced;
}
//@ chunk-htq1j0g1.js:27548-27655 placement
async function startUdsMessaging(path, storageV5, options = {}) {
  udsMessagingState().startInFlight = true;
  try {
    return await startUdsMessagingUnchecked(path, storageV5, options);
  } finally {
    udsMessagingState().startInFlight = false;
  }
}
//@ chunk-htq1j0g1.js:27655-34017 placement
/**
 * 启动 UDS 消息服务
 */
async function startUdsMessagingUnchecked(path, storageV5, options = {}) {
  let lastPhaseAt = options.profileStartup ? performance.now() : undefined;
  let recordPhaseMs = (phaseName) => {
    if (lastPhaseAt === undefined) return;
    let startTime = performance.now();
    recordPhase(phaseName, startTime - lastPhaseAt, lastPhaseAt);
    lastPhaseAt = startTime;
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
    if (options.isExplicit)
      throw new CliUserError(
        `--messaging-socket-path ${path} is not a usable local socket address (a remote/UNC path, or a pipe name with extra segments or a trailing dot/space).`,
      );
    return;
  }
  if (!options.isExplicit && true && !isAbsolute(path)) path = resolve(path);
  if (options.isExplicit) {
    path = await validateExplicitMessagingSocketPath(path);
    if ((await probeSocket(path)) === "live")
      throw new CliUserError(
        `--messaging-socket-path points to a live socket: ${path}. Another process is listening there. Remove it or choose a different path.`,
      );
  } else {
    let primaryDir = dirname(path);
    try {
      await vetSocketsDir(primaryDir);
    } catch (error) {
      let hostUid = isPermanentSocketRefusal(error) ? await getHostUid() : undefined;
      let fallbackPath = hostUid === undefined ? undefined : resolve(getPerUidFallbackUdsSocketPath(hostUid));
      let fallbackDir = fallbackPath === undefined ? undefined : join(fallbackPath, "..");
      if (fallbackPath === undefined || fallbackDir === undefined || fallbackDir === primaryDir)
        return refuseSocketDir(primaryDir, error, socketDirRefusalHint(error));
      let refusalDetail = describeSocketDirRefusal(error);
      logForDebugging(
        `[uds-messaging] sockets directory ${primaryDir} refused (${errorMessage(error)}${refusalDetail ? `; refused component: ${refusalDetail}` : ""}); trying the per-uid fallback ${fallbackDir}`,
        {
          level: "warn",
        },
      );
      try {
        await vetSocketsDir(fallbackDir);
      } catch (error) {
        return refuseSocketDir(fallbackDir, error, socketDirRefusalHint(error));
      }
      path = fallbackPath;
      recordDegradedCause("primary_dir_refused_fell_back");
    }
  }
  if (options.isExplicit)
    try {
      await unlink(path);
    } catch {}
  udsMessagingState().activeSocketPath = path;
  if (options.profileStartup) profileCheckpoint("uds_inbox_dir_ready");
  recordPhaseMs("setup_uds_dir_ms");
  let server;
  let unregisterCleanup;
  try {
    server = createServer(
      {
        allowHalfOpen: true,
      },
      (socket) => {
        udsMessagingState().connectedClients.add(socket);
        logForDebugging("[uds-messaging] Client connected");
        handleConnection(socket);
        socket.on("close", () => {
          udsMessagingState().connectedClients.delete(socket);
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
  server.on("error", (error) => {
    logForDebugging(`[uds-messaging] Server error: ${error.message}`, {
      level: "error",
    });
  });
  udsMessagingState().authRequired = options.requireAuth ?? isWindowsPlatform();
  udsMessagingState().firstLineDeadlineMs = options.firstLineDeadlineMs ?? MESSAGING_SOCKET_TIMEOUT_MS;
  let peerTokens = createPeerTokens();
  udsMessagingState().activeTokens = peerTokens;
  try {
    if (options.isExplicit) {
      if (!(await tryListen(server, path))) throw Error("listen EADDRINUSE on the requested socket path");
    } else {
      path = await bindAutoSocketPath(server, path);
      udsMessagingState().activeSocketPath = path;
    }
    if (options.profileStartup) profileCheckpoint("uds_inbox_listening");
    recordPhaseMs("setup_uds_listen_ms");
    {
      let hostUid = await getHostUid();
      let uid = process.getuid?.();
      udsMessagingState().peerDirOwnerUids = [
        ...(uid !== undefined ? [uid] : []),
        ...(hostUid !== undefined && hostUid !== uid ? [hostUid] : []),
      ];
    }
    server.unref();
    let unregisterCleanup_2 = registerCleanup(async () => {
      logForDebugging("[uds-messaging] Shutting down");
      await stopUdsServer(server, path, storageV5);
    });
    unregisterCleanup = unregisterCleanup_2;
    await chmod(path, 384);
    try {
      udsMessagingState().activeKeyFile = await writeSessionPeerRecord(
        path,
        peerTokens.peerToken,
        storageV5,
        {
          sweepPermitted: await isRegistrySweepPermitted(),
        },
      );
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
        await stopUdsServer(server, path, storageV5, {
          settleHeld: false,
        });
        unregisterCleanup_2();
        clearMessagingEnv();
        if (options.isExplicit)
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
    if (options.profileStartup) profileCheckpoint("uds_inbox_key_published");
    recordPhaseMs("setup_uds_publish_ms");
    process.env.CLAUDE_CODE_MESSAGING_SOCKET = path;
    udsEnv.set("CLAUDE_CODE_MESSAGING_TOKEN", peerTokens.childToken);
    setOwnUdsHopToken(udsAddressFromPath(path));
    let ownAddress = udsAddressFromPath(path);
    setRecordCorrespondent(notePeerReplyTarget);
    getSessionNamingState().senderMode = currentSenderClass;
    setIdleNoticeSender((target, extraFields, expectPeerPid, sendSenderClass, expectPeerProcStart) =>
      sendControlToUdsSocket(
        target,
        {
          action: "peer_idle_notice",
          ...extraFields,
          from: ownAddress,
          ...(sendSenderClass ? senderClassFields() : {}),
        },
        {
          ...(expectPeerPid !== undefined && {
            expectPeerPid,
          }),
          ...(expectPeerProcStart !== undefined && {
            expectPeerProcStart,
          }),
          storageV5,
        },
      ),
    );
    setSendAnswer(
      (target, extraFields, expectPeerPid, expectPeerProcStart) =>
        sendControlToUdsSocket(
          target,
          {
            action: "artifact_replies_yielded",
            ...extraFields,
            from: ownAddress,
          },
          {
            ...(expectPeerPid !== undefined && {
              expectPeerPid,
            }),
            ...(expectPeerProcStart !== undefined && {
              expectPeerProcStart,
            }),
            storageV5,
          },
        ),
      ownAddress,
    );
    setRegisteredInboxOfPidReader((pids) => registeredInboxesOfPids(pids));
    setSendPeerReceipt((envelope, status, details) => {
      let origin = envelope.origin?.kind === "peer" ? envelope.origin : undefined;
      let from = origin?.from;
      if (typeof from !== "string") return;
      let replyTarget = vettedPeerReplyTarget(from, path, origin?.verifiedPeerPid);
      if (replyTarget === undefined) {
        logForDebugging(
          `[uds-messaging] hold-receipt skipped: reply address unshaped or outside our socket namespace (${fragmentForLog(from)})`,
        );
        return;
      }
      return sendControlToUdsSocket(
        replyTarget,
        {
          action: "peer_message_status",
          ...(status === "refused"
            ? {
                status: "expired",
                status_detail: "refused",
              }
            : {
                status,
              }),
          reason: holdOutcomeExplanation(status),
          from: ownAddress,
          ...(typeof origin?.msg_id === "string" && {
            orig_msg_id: origin.msg_id,
          }),
          ...(status === "dropped" &&
            details !== undefined && {
              drop_reason: details.dropReason,
              dropped_msg_ids: details.droppedMsgIds,
            }),
        },
        {
          ...(origin?.verifiedPeerPid !== undefined && {
            expectPeerPid: origin.verifiedPeerPid,
          }),
          ...(origin?.verifiedPeerProcStart !== undefined && {
            expectPeerProcStart: origin.verifiedPeerProcStart,
          }),
          storageV5,
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
    );
    logForDebugging(
      `[uds-messaging] Connect when the data is ready (e.g. out=$(cmd); printf '%s\\n' "$out" | ${"nc -N -U"} "$CLAUDE_CODE_MESSAGING_SOCKET" \u2014 or the socat form above): a connection that sends no complete line within ${udsMessagingState().firstLineDeadlineMs} ms is closed`,
    );
    udsMessagingState().lastStartFailureCause = undefined;
    return stopAndCleanup(server, path, storageV5, unregisterCleanup_2);
  } catch (error) {
    if (error instanceof CliUserError) throw error;
    if (options.isExplicit) {
      let errnoCode = getErrnoCode(error);
      if (unregisterCleanup !== undefined) {
        await stopUdsServer(server, path, storageV5, {
          settleHeld: false,
        });
        unregisterCleanup();
        clearMessagingEnv();
        udsMessagingState().lastStartFailureCause = "post_bind_setup_failed";
        throw new CliUserError(
          `--messaging-socket-path: bound ${path} but could not finish setting the socket up (${errnoCode ?? String(error)}); the inbox was closed. The filesystem there may not support socket permissions \u2014 choose another directory.`,
        );
      }
      clearActiveSocket();
      clearMessagingEnv();
      let bindHint =
        errnoCode === "ENAMETOOLONG"
          ? "the path is too long for a Unix socket (max ~104 bytes); choose a shorter one"
          : errnoCode === "EADDRINUSE"
            ? "something already exists at that path and could not be replaced; remove it or choose another path"
            : errnoCode === "EACCES" || errnoCode === "EPERM"
              ? "permission denied in that directory"
              : "the socket could not be created there";
      throw new CliUserError(
        `--messaging-socket-path: cannot bind at ${path} (${errnoCode ?? String(error)}): ${bindHint}.`,
      );
    }
    if (unregisterCleanup !== undefined) {
      await stopUdsServer(server, path, storageV5, {
        settleHeld: false,
      });
      unregisterCleanup();
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
//@ chunk-htq1j0g1.js:34017-34898 placement
/**
 * 暂扣结果解释
 */
function holdOutcomeExplanation(outcome) {
  switch (outcome) {
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
//@ chunk-htq1j0g1.js:34898-34959 placement
function senderClassFields() {
  let senderClass = currentSenderClass();
  return senderClass === undefined
    ? {}
    : {
        from_mode: senderClass,
      };
}
//@ chunk-htq1j0g1.js:34959-35127 placement
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
//@ chunk-htq1j0g1.js:35127-35165 placement
function senderClassOf(mode) {
  return isPeerFromMode(mode) ? mode : undefined;
}
//@ chunk-htq1j0g1.js:35165-35298 placement
function isSelfSentMessage(verifiedPeerPid, selfSentAncestry, senderClass) {
  return isSelfSent({
    selfSentAncestry,
    verifiedPeerPid,
    childTokenPresented: senderClass === "child",
    needsVerdict: isBypassDefaultHold(),
    platform: getPlatform(),
  });
}
//@ chunk-htq1j0g1.js:35298-35379 placement
/**
 * 只注册一次 process exit 监听，退出时删除 activeKeyFile。旧版名 useCostSummary 为错配。
 */
function registerActiveKeyFileCleanupOnExit() {
  if (!process.listeners("exit").includes(unlinkActiveKeyFileSync))
    process.on("exit", unlinkActiveKeyFileSync);
}
//@ chunk-htq1j0g1.js:35379-35457 placement
function unlinkActiveKeyFileSync() {
  try {
    let activeKeyFile = udsMessagingState().activeKeyFile;
    if (activeKeyFile === undefined) return;
    unlinkSync(activeKeyFile);
  } catch {}
}
export {
  setOnPeerMessageStatus,
  setOnRename,
  getUdsInboxUnavailableReason,
  currentSenderClass,
  getDefaultUdsSocketPath,
  getPerUidFallbackUdsSocketPath,
  getUdsMessagingSocketPath,
  getUdsStartDegradedCause,
  getUdsStartFailureCause,
  setOnEnableRemoteControl,
  setOnEnqueue,
  startCrossSessionInbox,
  startUdsMessaging,
  unlinkActiveKeyFileSync,
  validateExplicitMessagingSocketPath,
  vettedPeerReplyTarget,
};

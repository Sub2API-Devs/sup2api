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
import { don, messagingSocketUnavailableReason, LPr } from "./messagingSocket/setup.js";
import { isUuid } from "./udsMessaging/messageEnvelope.js";
import { Q3o, jy, redactFragmentForLog, tli, getPeerPid, ywn, Z3o } from "./udsMessaging/peerGuard.js";
import { logForDebugging } from "./debug.js";
import { a$t, logInboundRefused, Mon, isBypassDefaultHold, s$t } from "./crossSessionInbound/inboundGate.js";
import { SHs, settleHeldInboundOnShutdown, wvo, Evo, r$t } from "./crossSessionInbound/inboundMode.js";
import { Jvt } from "./messages/messagePredicates.js";
import { IKs } from "./messages/pluginTags.js";
import { sanitizeAddressPart } from "./swarm/teammateIds.js";
import { dispatchSessionReceiveHooks } from "../plugins/functionHooks/sessionReceive.js";
import { y2e } from "./peerFileTransfer.js";
import { SQ, peerMessageInfo, $ge, u8, FAi } from "./peerMessageHeaders.js";
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
  TUs,
  answerYieldRequest,
  CUs,
  handleUnyield,
  AUs,
  IUs,
  handleYieldRequest,
  $Ro,
} from "../services/artifacts/replyYield.js";
import { sleep, withDeadline } from "./sleep.js";
import { isAuthItem, tokenRole, deleteSessionRecord, writeSessionPeerRecord } from "./sessionAddresses.js";
import { jsonParseRaw } from "./slowOperations.js";
import { env, udsEnv } from "./env.js";
import { tmpdir } from "./tempDir.js";
import { getErrnoCode, errorMessage, isENOENT, CliUserError } from "./errors.js";
import { printableName } from "./printableName.js";
import { shellQuoteArgs } from "./bash/bashPipeCommand.js";
import { inspectUserNamespace, _li, getHostUid } from "./sandbox/userNamespace.js";
import { Br } from "./startupTiming.js";
import { profileCheckpoint } from "./startupProfiler.js";
import { Ohr, AAi } from "./sessionPeers.js";
import { registerCleanup } from "./cleanupRegistry.js";
import { isRegistrySweepPermitted } from "./concurrentSessions.js";
import { ci } from "./swarm/hostState.js";
import { getPlatform } from "./platform.js";

//@ chunk-0kp6eg01.js:1869-1886 placement
var Fe = 500,
  Pe = 32;
/**
 * 判定缓存
 */
//@ chunk-0kp6eg01.js:1886-2162 placement
class VerdictCache {
  verdicts = new Map();
  lookup(e) {
    let n = this.verdicts.get(e);
    if (n !== void 0) (this.verdicts.delete(e), this.verdicts.set(e, n));
    return n;
  }
  remember(e, n) {
    if (this.verdicts.size >= Fe) {
      let s = this.verdicts.keys().next().value;
      if (s !== void 0) this.verdicts.delete(s);
    }
    this.verdicts.set(e, n);
  }
}
/**
 * 祖先进程判定缓存与读取器
 */
//@ chunk-0kp6eg01.js:2162-2557 placement
var ancestryVerdicts = new HostScoped(() => new VerdictCache()),
  Le = {
    readAncestors: async (e) => {
      let {
        ancestors: ancestors,
        readFailed: readFailed,
        truncated: truncated,
      } = await getAncestorPidsCheckedAsync(e);
      if (truncated && !readFailed && !ancestors.includes(process.pid))
        ({
          ancestors: ancestors,
          readFailed: readFailed,
          truncated: truncated,
        } = await getAncestorPidsCheckedAsync(e, Pe));
      if (!ancestors.includes(process.pid)) {
        if (readFailed) throw Error("ancestry walk failed");
        if (truncated) throw Error("ancestry walk truncated (maxDepth) above the prefix");
      }
      return ancestors;
    },
    readStartToken: (e) => getProcessStartTimeAsync(e, { skipCache: !0 }),
  };
//@ chunk-0kp6eg01.js:2557-2643 placement
function Ke(e, n = process.pid) {
  if (n === 1) return !1;
  return Array.isArray(e) && e.includes(n);
}
/**
 * 判定是否为自身
 */
//@ chunk-0kp6eg01.js:2643-3144 placement
async function classifyAncestry(e, n = Le) {
  if (e === void 0 || !Number.isInteger(e) || e <= 0) return "no-evidence";
  let s;
  try {
    s = await n.readStartToken(e);
  } catch {
    s = void 0;
  }
  if (s === void 0) return "no-evidence";
  let o = `${e}:${s}`,
    of = ancestryVerdicts.of(getRootSession().host),
    lookup = of.lookup(o);
  if (lookup !== void 0) return lookup ? "self" : "not-self";
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
    _ = void 0;
  }
  if (_ !== s) return "no-evidence";
  let w = process.pid !== 1 && p.includes(process.pid);
  return (of.remember(o, w), w ? "self" : "not-self");
}
/**
 * 是否为自己发送
 */
//@ chunk-0kp6eg01.js:3144-3495 placement
async function isSelfSent(e) {
  let n = e.selfPid ?? process.pid;
  if (e.selfSentAncestry !== void 0 && n !== 1) return Ke(e.selfSentAncestry, n);
  if (!e.needsVerdict) return !1;
  if (n === 1 || e.platform === "windows") return e.childTokenPresented;
  if (e.platform !== "macos") return !1;
  let s = await (e.verdictOf ?? classifyAncestry)(e.verifiedPeerPid);
  return s === "self" || (s === "no-evidence" && e.childTokenPresented);
}
//@ chunk-0kp6eg01.js:3495-3532 placement
function u() {
  return don.of(getRootSession().host);
}
//@ chunk-0kp6eg01.js:3532-3580 placement
function getUdsStartFailureCause() {
  return u().lastStartFailureCause;
}
//@ chunk-0kp6eg01.js:3580-3629 placement
function getUdsStartDegradedCause() {
  return u().lastStartDegradedCause;
}
//@ chunk-0kp6eg01.js:3629-3776 placement
function recordDegradedCause(e) {
  let n = u();
  if (e === "key_publish_failed" && n.lastStartDegradedCause === "primary_dir_refused_fell_back") return;
  n.lastStartDegradedCause = e;
}
//@ chunk-0kp6eg01.js:3776-3807 placement
function getUdsInboxUnavailableReason() {
  return messagingSocketUnavailableReason(u());
}
//@ chunk-0kp6eg01.js:3807-3922 placement = extractErrorTypeFromData (1)
function hasStringType_2(data) {
  if (typeof data !== "object" || data === null) return !1;
  if (!("type" in data)) return !1;
  return typeof data.type === "string";
}
//@ chunk-0kp6eg01.js:3922-3953 placement
function setOnRename(e) {
  u().onRename = e;
}
//@ chunk-0kp6eg01.js:3953-3997 placement
function setOnEnableRemoteControl(e) {
  u().onEnableRemoteControl = e;
}
//@ chunk-0kp6eg01.js:3997-4062 placement
function Se(e) {
  return isUuid(e) ? e : e === void 0 ? "(none)" : "(malformed)";
}
//@ chunk-0kp6eg01.js:4062-4184 placement
function pickUuids(e) {
  if (!Array.isArray(e)) return [];
  let n = [];
  for (let s of e) {
    if (n.length >= Q3o) break;
    if (isUuid(s)) n.push(s);
  }
  return n;
}
//@ chunk-0kp6eg01.js:4184-4226 placement
function setOnPeerMessageStatus(e) {
  u().onPeerMessageStatus = e;
}
//@ chunk-0kp6eg01.js:4226-4258 placement
function setOnEnqueue(e) {
  u().onEnqueue = e;
}
/**
 * 消息 session_id 是否匹配
 */
//@ chunk-0kp6eg01.js:4258-4480 placement
function sessionIdMatches(e) {
  if (e.session_id !== void 0 && e.session_id !== getSessionId())
    return (
      logForDebugging(
        `[uds-messaging] Dropping ${jy(e.type)} message: session_id mismatch (got "${jy(String(e.session_id))}", expected "${getSessionId()}")`,
        { level: "warn" },
      ),
      !1
    );
  return !0;
}
/**
 * 处理入站用户消息
 */
//@ chunk-0kp6eg01.js:4480-6032 placement
async function handleInboundUserMessage(e, n, s, o, a) {
  let r = e.message?.content;
  if (typeof r !== "string" || r.length === 0) {
    logForDebugging("[uds-messaging] Ignoring user message with missing or non-string content", {
      level: "warn",
    });
    return;
  }
  if (!sessionIdMatches(e)) return;
  let p = typeof e.uuid === "string" ? e.uuid : randomUUID(),
    _ = a$t();
  if (_ !== void 0) {
    (logInboundRefused("uds: dropped before attachment materialization", _),
      SHs(
        {
          kind: "peer",
          from: e.from ?? "unknown",
          ...(n !== void 0 && { verifiedPeerPid: n }),
          ...(isUuid(e.msg_id) && { msg_id: e.msg_id }),
        },
        "refused",
      ));
    return;
  }
  let w = Jvt(e.priority) ?? "next",
    h = IKs(r),
    l = sanitizeAddressPart(e.from_plugin),
    D = await dispatchSessionReceiveHooks({
      origin: { kind: "peer", ...(l !== void 0 && { plugin: l }) },
      content: h,
    });
  if (D.consumed !== void 0) return;
  using queueing = D.queueing;
  let c = typeof D.content === "string" ? D.content : h,
    S = c;
  if (e.file_attachments !== void 0 && y2e())
    try {
      let {
          emitPeerFileReceiveTelemetry: emitPeerFileReceiveTelemetry,
          injectPeerFilePrefix: injectPeerFilePrefix,
          materializeLocalPeerFiles: materializeLocalPeerFiles,
        } = await import("./chunk-3rcnr5ex.js"),
        A = await materializeLocalPeerFiles(e.file_attachments);
      if (A.received > 0)
        ((S = injectPeerFilePrefix(c, A.prefix)),
          emitPeerFileReceiveTelemetry("uds", A.received, A.verified));
    } catch (error) {
      logForDebugging(
        `[uds-messaging] Failed to materialize file_attachments: ${redactFragmentForLog(String(error))}`,
        { level: "warn" },
      );
    }
  let v = await isSelfSentMessage(n, o, a),
    b = SQ(
      {
        kind: "peer",
        from: e.from ?? "unknown",
        ...(n !== void 0 && { verifiedPeerPid: n }),
        ...(s !== void 0 && { verifiedPeerProcStart: s }),
        ...(v && { selfSent: v }),
        ...(isUuid(e.msg_id) && { msg_id: e.msg_id }),
        ...(l !== void 0 && { plugin: l }),
        ...peerMessageInfo(r),
      },
      S,
      r,
    ),
    R = {
      mode: "prompt",
      agentId: mainAgentId(),
      value: S,
      uuid: p,
      priority: w,
      origin: b,
      skipSlashCommands: !0,
      isMeta: !0,
      skipAttachments: !0,
    };
  if (Mon(R) !== "accept") return;
  (enqueueCommand(R),
    queueing.queued(),
    logForDebugging(`[uds-messaging] Routed user message to queue (priority=${w}): ${jy(S, 80)}`),
    u().onEnqueue?.(),
    notePeerReplyTarget(R));
}
/**
 * 记录对端回复目标
 */
//@ chunk-0kp6eg01.js:6032-6309 placement
function notePeerReplyTarget(e) {
  let n = e.origin?.kind === "peer" ? e.origin : void 0,
    activeSocketPath = u().activeSocketPath;
  if (
    n !== void 0 &&
    n.selfSent !== !0 &&
    n.verifiedPeerPid !== void 0 &&
    typeof n.from === "string" &&
    activeSocketPath !== void 0 &&
    vettedPeerReplyTarget(n.from, activeSocketPath, n.verifiedPeerPid) !== void 0
  )
    noteVettedCorrespondent(n.from, n.verifiedPeerPid, n.verifiedPeerProcStart);
}
//@ chunk-0kp6eg01.js:6309-6468 placement
function vettedPeerReplyTarget(e, n, s) {
  if (!e.startsWith("uds:") || !$ge(e)) return;
  let target = parseAddress(e).target;
  return target && isTrustedSocketPath(target, n, { verifiedPeerPid: s, ownerUids: u().peerDirOwnerUids })
    ? target
    : void 0;
}
/**
 * 处理入站消息
 */
//@ chunk-0kp6eg01.js:6468-11170 placement
async function handleInboundMessage(e, n, s, o, a) {
  if (!hasStringType_2(e)) {
    logForDebugging("[uds-messaging] Ignoring message without valid type field", { level: "warn" });
    return;
  }
  if (e.type === "user") await handleInboundUserMessage(e, n, s, o, a);
  else if (e.type === "control") {
    if (!sessionIdMatches(e)) return;
    if (e.action === "rename" && typeof e.name === "string") u().onRename?.(e.name);
    else if (
      e.action === "peer_message_status" &&
      (e.status === "held" ||
        e.status === "denied" ||
        e.status === "expired" ||
        e.status === "delivered" ||
        e.status === "refused" ||
        e.status === "dropped")
    ) {
      let r = e.status === "expired" && e.status_detail === "refused" ? "refused" : e.status,
        p = admitReceiptForOutstandingSend(e.orig_msg_id, r);
      if (r === "dropped") {
        let _ = tli(e.drop_reason),
          w = admitDroppedIdsByDestination(pickUuids(e.dropped_msg_ids));
        if (p !== void 0) {
          let h = w.get(p.sent.to) ?? { sends: [], wereHeld: 0 };
          if ((h.sends.push(p.sent), p.wasHeld)) h.wereHeld++;
          w.set(p.sent.to, h);
        }
        if (_ === "queue-full")
          for (let [h, { wereHeld: l }] of w) for (let D = 0; D < l; D++) debitPacerForReleasedSend(h);
        if (w.size === 0)
          logForDebugging(
            `[uds-messaging] peer_message_status dropped: neither orig_msg_id=${Se(e.orig_msg_id)} nor any named id matches an outstanding send`,
          );
        for (let { sends: sends } of w.values())
          u().onPeerMessageStatus?.({ status: r, sends: sends, dropReason: _ });
      } else if (p === void 0)
        logForDebugging(
          `[uds-messaging] peer_message_status dropped: no outstanding send matches orig_msg_id=${Se(e.orig_msg_id)}`,
        );
      else {
        if (r === "held") creditPacerForHeldSend(p.sent.to);
        else if (r === "delivered" && p.wasHeld) debitPacerForReleasedSend(p.sent.to);
        u().onPeerMessageStatus?.({ status: r, sent: p.sent });
      }
    } else if (e.action === "notify_when_idle") {
      let safeParse = notifyWhenIdleFrameSchema().safeParse(e);
      if (!safeParse.success) {
        (logForDebugging("[uds-messaging] notify_when_idle dropped: malformed frame"),
          logFeatureSad("cross_session_notify_idle", "malformed_frame"));
        return;
      }
      let activeSocketPath = u().activeSocketPath,
        from = safeParse.data.from,
        w = activeSocketPath !== void 0 ? vettedPeerReplyTarget(from, activeSocketPath, n) : void 0;
      if (activeSocketPath === void 0)
        (logForDebugging("[uds-messaging] notify_when_idle dropped: own inbox not bound (shutting down)"),
          logFeatureSad("cross_session_notify_idle", "own_inbox_unbound"));
      else if (w === void 0)
        (logForDebugging(
          `[uds-messaging] notify_when_idle dropped: reply address unshaped or outside our socket namespace (${jy(from)})`,
        ),
          logFeatureSad("cross_session_notify_idle", "unvettable_reply_target"));
      else if (canonicalSocketPath(w) === canonicalSocketPath(activeSocketPath))
        (logForDebugging(
          "[uds-messaging] notify_when_idle dropped: reply target is this session (self-target)",
        ),
          logFeatureSad("cross_session_notify_idle", "self_target_frame"));
      else {
        let h = await isSelfSentMessage(n, o, a),
          l = recordIdleSubscription(
            from,
            w,
            safeParse.data.msg_id,
            n,
            s,
            a === "peer",
            Ae(safeParse.data.from_mode),
            h,
          );
        if ((logForDebugging(`[uds-messaging] notify_when_idle from ${jy(from)}: ${l}`), l === "full"))
          sendUnavailableNotice(w, safeParse.data.msg_id, n, a === "peer", s);
      }
    } else if (e.action === "peer_idle_notice") {
      let safeParse = peerIdleNoticeFrameSchema().safeParse(e);
      if (!safeParse.success) {
        (logForDebugging("[uds-messaging] peer_idle_notice dropped: malformed frame"),
          logFeatureSad("cross_session_notify_idle", "malformed_notice"));
        return;
      }
      if (!hasOutstandingIdleSubscription(safeParse.data.orig_msg_id)) {
        logForDebugging(
          "[uds-messaging] peer_idle_notice: dropped (uncorrelated / already delivered / expired)",
        );
        return;
      }
      let p = await isSelfSentMessage(n, o, a);
      if (
        !admitIdleNotice(
          safeParse.data.orig_msg_id,
          safeParse.data.state,
          safeParse.data.finished_at,
          safeParse.data.detail,
          Ae(safeParse.data.from_mode),
          p,
        )
      )
        logForDebugging(
          `[uds-messaging] peer_idle_notice not admitted: subscription for orig_msg_id=${jy(safeParse.data.orig_msg_id)} was already consumed`,
        );
    } else if (e.action === "yield_artifact_replies") {
      let safeParse = TUs().safeParse(e);
      if (!safeParse.success) {
        (logForDebugging("[uds-messaging] yield_artifact_replies dropped: malformed frame"),
          logFeatureSad("artifact_comments_autoreact", "yield_malformed_frame"));
        return;
      }
      let activeSocketPath = u().activeSocketPath,
        _ =
          activeSocketPath !== void 0
            ? vettedPeerReplyTarget(safeParse.data.from, activeSocketPath, n)
            : void 0;
      if (activeSocketPath === void 0 || _ === void 0) {
        (logForDebugging(
          `[uds-messaging] yield_artifact_replies dropped: ${activeSocketPath === void 0 ? "own inbox not bound" : "reply address unshaped or outside our socket namespace"} (${jy(safeParse.data.from)})`,
        ),
          logFeatureSad("artifact_comments_autoreact", "yield_unvettable_target"));
        return;
      }
      if (canonicalSocketPath(_) === canonicalSocketPath(activeSocketPath)) {
        logForDebugging("[uds-messaging] yield_artifact_replies dropped: reply target is this session");
        return;
      }
      let w = await registeredLivePeerForSocket(_);
      if (w === void 0 || w.sessionId !== getSessionId() || (n !== void 0 && w.pid !== n)) {
        (logForDebugging(
          `[uds-messaging] yield_artifact_replies refused: requester is not a verified live session of this conversation (${jy(safeParse.data.from)})`,
        ),
          logFeatureSad("artifact_comments_autoreact", "yield_requester_unverified"),
          answerYieldRequest(
            safeParse.data,
            _,
            n === void 0 ? void 0 : { pid: n, writeToken: s },
            Date.now(),
            { refuse: !0 },
          ));
        return;
      }
      answerYieldRequest(
        safeParse.data,
        _,
        {
          pid: n ?? w.pid,
          procStart: s ?? (n === void 0 || n === w.pid ? w.procStart : void 0),
          writeToken: s,
        },
        Date.now(),
      );
    } else if (e.action === "unyield_artifact_replies") {
      let safeParse = CUs().safeParse(e);
      if (!safeParse.success || !handleUnyield(safeParse.data, n))
        logForDebugging(
          "[uds-messaging] unyield_artifact_replies dropped: malformed, uncorrelated or already handed back",
        );
    } else if (e.action === "artifact_replies_yielded") {
      let safeParse = AUs().safeParse(e);
      if (!safeParse.success) {
        (logForDebugging("[uds-messaging] artifact_replies_yielded dropped: malformed frame"),
          logFeatureSad("artifact_live_subscribe", "yield_malformed_answer"));
        return;
      }
      if (!IUs(safeParse.data.orig_msg_id)) {
        logForDebugging("[uds-messaging] artifact_replies_yielded dropped: uncorrelated or already settled");
        return;
      }
      handleYieldRequest(safeParse.data, n);
    } else logForDebugging(`[uds-messaging] Unhandled control action: ${jy(String(e.action))}`);
  } else logForDebugging(`[uds-messaging] Received unhandled message type: ${jy(e.type)}`);
}
/**
 * 分派入站消息
 */
//@ chunk-0kp6eg01.js:11170-11571 placement
function routeInboundMessage(e, n, s, o, a) {
  if (
    hasStringType_2(e) &&
    ((e.type === "control" && e.action !== "notify_when_idle") ||
      (e.type === "user" && e.priority === "now" && e.file_attachments === void 0))
  ) {
    handleInboundMessage(e, n, s, o, a).catch((r) => {
      logForDebugging(`[uds-messaging] Failed to process message: ${r}`, { level: "warn" });
    });
    return;
  }
  u().processingChain = u()
    .processingChain.then(() => handleInboundMessage(e, n, s, o, a))
    .catch((r) => {
      logForDebugging(`[uds-messaging] Failed to process message: ${r}`, { level: "warn" });
    });
}
//@ chunk-0kp6eg01.js:11571-11583 placement
var Je = 3000;
//@ chunk-0kp6eg01.js:11583-11669 placement
function Ze(e = 3000) {
  return Promise.race([u().processingChain, sleep(e, void 0, { unref: !0 })]);
}
/**
 * 处理 UDS 连接
 */
//@ chunk-0kp6eg01.js:11669-13953 placement
function handleConnection(e) {
  e.setEncoding("utf8");
  let firstLineDeadlineMs = u().firstLineDeadlineMs,
    s = setTimeout(() => {
      s = void 0;
      try {
        if (
          (logForDebugging(
            `[uds-messaging] Closing a connection that sent no complete line within ${firstLineDeadlineMs} ms`,
          ),
          !u().silentDropReported)
        )
          ((u().silentDropReported = !0),
            logFeatureSad("cross_session_inbox_auth", "silent_connection_deadline"));
        e.destroy();
      } catch (error) {
        logForDebugging(`[uds-messaging] Failed to close a silent connection: ${error}`, { level: "warn" });
      }
    }, firstLineDeadlineMs);
  s.unref();
  let o = () => {
    if (s !== void 0) (clearTimeout(s), (s = void 0));
  };
  (e.once("close", o), e.once("error", o));
  let a,
    r,
    p = !1,
    _,
    w,
    h = process.pid !== 1 && isBypassDefaultHold();
  if (h) {
    let b = getPeerPid(e),
      R = b !== void 0 ? getProcessStartTokenLinuxSync(b) : void 0;
    if (b !== void 0 && R !== void 0) w = { pid: b, token: R };
  }
  let l = "",
    D,
    E = !1,
    c = (b) => {
      if (
        (logForDebugging(
          `[uds-messaging] Dropped ${b} from a connection that did not authenticate; closing it`,
          { level: "warn" },
        ),
        !u().authDropReported)
      )
        ((u().authDropReported = !0), logFeatureBad("cross_session_inbox_auth", "unauthed_drop"));
      e.destroy();
    },
    S = (b) => {
      let R = !E;
      if (((E = !0), isAuthItem(b))) {
        if (R) {
          if (((D = tokenRole(b.token, u().activeTokens)), D !== void 0 && !u().authOkReported))
            ((u().authOkReported = !0), logFeatureOk("cross_session_inbox_auth"));
          if (D === void 0 && u().authRequired) c("a bad auth frame");
        }
        return;
      }
      if (u().authRequired && D === void 0) {
        c(hasStringType_2(b) ? `a '${jy(b.type)}' line` : "a line");
        return;
      }
      if (!p) {
        if (
          ((a = getPeerPid(e)),
          (r =
            a === void 0
              ? void 0
              : w !== void 0
                ? w.pid === a
                  ? w.token
                  : void 0
                : getProcessStartTokenLinuxSync(a)),
          (p = !0),
          a !== void 0 && h)
        )
          _ =
            w !== void 0 && w.pid === a && getProcessStartTokenLinuxSync(a) === w.token
              ? getAncestorPidsLinuxSync(a)
              : [];
      }
      routeInboundMessage(b, a, r, _, D);
    },
    v = (b) => {
      try {
        S(b);
      } catch (error) {
        logForDebugging(`[uds-messaging] Failed to handle line: ${error}`, { level: "warn" });
      }
    };
  (e.on("data", (b) => {
    if (((l += b), l.length > ywn)) {
      (logForDebugging(`[uds-messaging] Line exceeded ${ywn} chars; dropping connection`, { level: "warn" }),
        e.destroy(),
        (l = ""));
      return;
    }
    let R;
    while (
      (R = l.indexOf(`
`)) !== -1
    ) {
      let sliced = l.slice(0, R);
      if (((l = l.slice(R + 1)), o(), !sliced.trim())) {
        if (u().authRequired && D === void 0) {
          ((E = !0), c("a blank line"), (l = ""));
          return;
        }
        continue;
      }
      let F;
      try {
        F = jsonParseRaw(sliced);
      } catch {
        if (
          (logForDebugging(`[uds-messaging] Failed to parse JSON line: ${redactFragmentForLog(sliced)}`, {
            level: "warn",
          }),
          u().authRequired && D === void 0)
        ) {
          ((E = !0), c("an unparseable line"), (l = ""));
          return;
        }
        continue;
      }
      if ((v(F), e.destroyed)) {
        l = "";
        return;
      }
    }
  }),
    e.on("end", () => {
      if (l.trim() && !e.destroyed) {
        let b,
          R = !1;
        try {
          ((b = jsonParseRaw(l)), (R = !0));
        } catch {
          if (
            (logForDebugging(`[uds-messaging] Failed to parse final buffer: ${redactFragmentForLog(l)}`, {
              level: "warn",
            }),
            u().authRequired && D === void 0)
          )
            c("an unparseable final fragment");
        }
        if (R) v(b);
      }
      e.end();
    }),
    e.on("error", (b) => {
      logForDebugging(`[uds-messaging] Connection error: ${b.message}`, { level: "warn" });
    }));
}
//@ chunk-0kp6eg01.js:13953-13996 placement
function getUdsMessagingSocketPath() {
  return u().activeSocketPath;
}
//@ chunk-0kp6eg01.js:13996-14006 placement
var Y = 103;
//@ chunk-0kp6eg01.js:14006-14144 placement
function getDefaultUdsSocketPath() {
  let e = env.XDG_RUNTIME_DIR || tmpdir(),
    n = resolve(join(e, "cc-socks", `${process.pid}.sock`));
  if (Buffer.byteLength(n) <= Y) return n;
  return getPerUidFallbackUdsSocketPath();
}
//@ chunk-0kp6eg01.js:14144-14293 placement
function getPerUidFallbackUdsSocketPath(e = process.getuid?.() ?? 0) {
  let n = env.TERMUX_VERSION ? env.PREFIX : void 0,
    s = n ? join(n, "tmp") : "/tmp";
  return join(s, `cc-socks-${e}`, `${process.pid}.sock`);
}
/**
 * 关闭 UDS 服务
 */
//@ chunk-0kp6eg01.js:14293-14652 placement
async function stopUdsServer(e, n, s, { settleHeld: o = !0 } = {}) {
  for (let connectedClient of u().connectedClients) connectedClient.destroy();
  if ((u().connectedClients.clear(), e.close(), o)) noteParkedAtShutdown();
  let a = o ? settleHeldInboundOnShutdown() : void 0;
  await Ze();
  let r = o ? withDeadline(flushIdleSubscribers("exited"), Je) : void 0;
  if ((await a, await r, o)) await flushPeerDropReceipts();
  try {
    await unlink(n);
  } catch {}
  let p = u();
  if (p.activeKeyFile !== void 0) (await deleteSessionRecord(p.activeKeyFile, s), (p.activeKeyFile = void 0));
  clearActiveSocket();
}
/**
 * 清除活动 socket 状态
 */
//@ chunk-0kp6eg01.js:14652-14888 placement
function clearActiveSocket() {
  ((u().activeSocketPath = void 0),
    (u().activeTokens = void 0),
    delete process.env.CLAUDE_CODE_MESSAGING_SOCKET,
    udsEnv.unset("CLAUDE_CODE_MESSAGING_TOKEN"),
    Z3o(void 0),
    wvo(null),
    Evo(null),
    setIdleNoticeSender(null),
    $Ro(null),
    setRegisteredInboxOfPidReader(null),
    (getSessionNamingState().senderMode = null));
}
//@ chunk-0kp6eg01.js:14888-14946 placement
function nn(e, n, s, o) {
  return async () => {
    (await stopUdsServer(e, n, s), o());
  };
}
/**
 * 探测 socket 是否存活
 */
//@ chunk-0kp6eg01.js:14946-15137 placement
function probeSocket(e) {
  return new Promise((n) => {
    let s = new Socket(),
      o = (a) => {
        (s.destroy(), n(a));
      };
    (s.on("connect", () => o("live")),
      s.on("error", () => o("dead")),
      s.setTimeout(250, () => o("dead")),
      s.connect({ path: e }));
  });
}
/**
 * 尝试监听
 */
//@ chunk-0kp6eg01.js:15137-15306 placement
function tryListen(e, n) {
  return new Promise((s, o) => {
    function a(r) {
      if (getErrnoCode(r) === "EADDRINUSE") s(!1);
      else o(r);
    }
    (e.once("error", a),
      e.listen(n, () => {
        (e.removeListener("error", a), s(!0));
      }));
  });
}
/**
 * 生成兄弟 socket 路径
 */
//@ chunk-0kp6eg01.js:15306-15541 placement
function siblingSocketPath(e) {
  let n = `${e.replace(/\.sock$/, "")}-${randomBytes(4).toString("hex")}.sock`;
  if (Buffer.byteLength(n) <= Y) return n;
  let s = join(e, ".."),
    o = Y - Buffer.byteLength(join(s, ".sock"));
  return join(s, `${randomBytes(8).toString("hex").slice(0, Math.max(1, o))}.sock`);
}
/**
 * 清理陈旧的兄弟 socket
 */
//@ chunk-0kp6eg01.js:15541-15863 placement
async function sweepStaleSiblingSockets(e) {
  let n = `${basename(e).replace(/\.sock$/, "")}-`,
    s;
  try {
    s = await readdir(dirname(e));
  } catch {
    return;
  }
  for (let o of s) {
    if (!o.startsWith(n) || !/^[0-9a-f]{8}\.sock$/.test(o.slice(n.length))) continue;
    let a = join(dirname(e), o);
    if ((await probeSocket(a)) === "live") continue;
    try {
      (await unlink(a), logForDebugging(`[uds-messaging] Reaped stale moved-aside socket ${a}`));
    } catch {}
  }
}
/**
 * 绑定自动 socket 路径
 */
//@ chunk-0kp6eg01.js:15863-16284 placement
async function bindAutoSocketPath(e, n) {
  if ((await sweepStaleSiblingSockets(n), await tryListen(e, n))) return n;
  if ((await probeSocket(n)) !== "live") {
    try {
      await unlink(n);
    } catch {}
    if (await tryListen(e, n)) return n;
  }
  for (let s = 0; s < 3; s++) {
    let o = siblingSocketPath(n);
    if (
      (logForDebugging(
        `[uds-messaging] Auto socket path ${n} is another session's live socket (sibling pid namespace?); binding at ${o} instead`,
        { level: "warn" },
      ),
      await tryListen(e, o))
    )
      return o;
  }
  throw Error("listen EADDRINUSE on the auto socket path and its moved-aside siblings");
}
//@ chunk-0kp6eg01.js:16284-16386 placement
function startCrossSessionInbox(e, n, s = {}) {
  return startUdsMessaging(e ?? getDefaultUdsSocketPath(), n, {
    isExplicit: e !== void 0,
    profileStartup: s.profileStartup,
  });
}
//@ chunk-0kp6eg01.js:16386-16480 placement
function q() {
  (udsEnv.unset("CLAUDE_CODE_MESSAGING_SOCKET"), udsEnv.unset("CLAUDE_CODE_MESSAGING_TOKEN"));
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
function M(e, n, s) {
  return Object.assign(n, { socketsDirVetKind: e, ...(s && { refusedComponent: s }) });
}
/**
 * 取被拒的路径组件
 */
//@ chunk-0kp6eg01.js:16707-17133 placement
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
            : void 0,
      }
    : void 0;
}
//@ chunk-0kp6eg01.js:17133-17235 placement
function socketDirFacts(e, n, s) {
  return { path: e, uid: n.uid, gid: n.gid, mode: n.mode & 4095, ...(s !== void 0 && { ownerRefused: s }) };
}
/**
 * 描述 sockets 目录拒绝原因
 */
//@ chunk-0kp6eg01.js:17235-18789 placement
function describeSocketDirRefusal(e) {
  if (socketDirVetKind(e) === "uid_collapse")
    return "this process runs in a user namespace without a uid mapping, so file ownership cannot be verified \u2014 start it with a uid map (e.g. unshare -Ur), or pass --messaging-socket-path";
  let n = refusedComponentOf(e);
  if (n === void 0) return;
  let padded = n.mode.toString(8).padStart(4, "0"),
    o = `(owner ${n.uid}:${n.gid}, mode ${padded})`,
    a = "or pass --messaging-socket-path",
    r = printableName(n.path),
    p = r === n.path,
    _ = `'${Array.from(r, (l) => {
      if (SAFE_PATH_CHAR_PATTERN.test(l)) return l;
      return ((p = !1), "?");
    }).join("")}'`,
    w = p,
    h = (l, D) =>
      w
        ? `chmod ${l} ${shellQuoteArgs([n.path])}${D}`
        : `clear its ${l === "o-w" ? "other" : "group"}-write bit${D}`;
  switch (socketDirVetKind(e)) {
    case "directory_rule": {
      if (n.ownerRefused === !0)
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
    case void 0:
      return;
  }
}
//@ chunk-0kp6eg01.js:18789-18893 placement
var SAFE_PATH_CHAR_PATTERN = /^[A-Za-z0-9._\/ ~+=:@,#%-]$/,
  PERMANENT_SOCKET_ERRNOS = new Set(["EACCES", "EPERM", "EROFS", "ENOSPC", "EDQUOT", "ENOTDIR"]);
/**
 * 是否永久拒绝
 */
//@ chunk-0kp6eg01.js:18893-19161 placement
function isPermanentSocketRefusal(e) {
  switch (socketDirVetKind(e)) {
    case "directory_rule":
    case "foreign_owner":
    case "leaf_shape":
    case "not_directory":
      return !0;
    case "dangling_link":
    case "symlink_loop":
    case "raced":
    case "uid_collapse":
    case "internal":
      return !1;
    case void 0:
      break;
  }
  let n = getErrnoCode(e);
  return n !== void 0 && PERMANENT_SOCKET_ERRNOS.has(n);
}
//@ chunk-0kp6eg01.js:19161-19289 placement
function socketDirVetKind(e) {
  if (!(e instanceof Error) || !("socketsDirVetKind" in e)) return;
  let socketsDirVetKind = e.socketsDirVetKind;
  return SOCKET_DIR_VET_KINDS.find((s) => s === socketsDirVetKind);
}
/**
 * 悬空链接错误
 */
//@ chunk-0kp6eg01.js:19289-19463 placement
function danglingLinkError() {
  return M(
    "dangling_link",
    Error(
      "a component of the sockets path is a symlink whose target does not exist \u2014 create the target (0700) or repoint the link",
    ),
  );
}
/**
 * sockets 目录提示文案
 */
//@ chunk-0kp6eg01.js:19463-19984 placement
var SOCKET_DIR_HINTS =
    "Point XDG_RUNTIME_DIR or CLAUDE_CODE_TMPDIR at a private (0700) directory you own to use a different location.",
  ke = `A component of the sockets path is not a directory (a regular file is in the way). ${SOCKET_DIR_HINTS}`,
  ve = `The sockets path runs through a symlink loop. ${SOCKET_DIR_HINTS}`,
  fn =
    "This process runs in a user namespace without a uid mapping (its own uid reads as the kernel overflow uid), so file ownership cannot be verified. Start it with a uid map (e.g. `unshare -Ur` / `--map-current-user`), or pass --messaging-socket-path.";
/**
 * sockets 目录拒绝提示
 */
//@ chunk-0kp6eg01.js:19984-20725 placement
function socketDirRefusalHint(e) {
  switch (socketDirVetKind(e)) {
    case "directory_rule":
      return `A directory on the sockets path is shared (world- or group-writable without the sticky bit, e.g. a container volume mounted at /tmp) or not owned by you or root. ${SOCKET_DIR_HINTS}`;
    case "foreign_owner":
    case "leaf_shape":
      return SOCKET_DIR_HINTS;
    case "not_directory":
      return ke;
    case "symlink_loop":
      return ve;
    case "uid_collapse":
      return fn;
    case "dangling_link":
    case "raced":
    case "internal":
      return "";
    case void 0:
      break;
  }
  switch (getErrnoCode(e)) {
    case "ENOTDIR":
      return ke;
    case "ELOOP":
      return ve;
    case "EACCES":
    case "EPERM":
      return `This user lacks permission on part of the sockets path (an ancestor is not searchable, or the parent is not writable). ${SOCKET_DIR_HINTS}`;
    case "ENOENT":
      return `An ancestor of the sockets path does not exist. ${SOCKET_DIR_HINTS}`;
    default:
      return "";
  }
}
/**
 * 拒绝使用 sockets 目录
 */
//@ chunk-0kp6eg01.js:20725-21058 placement
function refuseSocketDir(e, n, s) {
  u().lastStartFailureCause = "socket_dir_refused";
  let o = describeSocketDirRefusal(n);
  ((u().lastStartFailureDetail = o),
    clearActiveSocket(),
    logForDebugging(
      `[uds-messaging] Failed to set up sockets directory ${e} (refusing to bind \u2014 cross-session messaging is OFF for this session): ${errorMessage(n)}.${o ? ` Refused component: ${o}.` : ""}${s ? ` ${s}` : ""}`,
      { level: "error" },
    ),
    q());
  return;
}
/**
 * 检查 sockets 目录
 */
//@ chunk-0kp6eg01.js:21058-24275 placement
async function vetSocketsDir(e) {
  if (!isAbsolute(e)) throw M("internal", Error("sockets directory must be absolute here"));
  let n = process.getuid?.(),
    s = (y) => {
      if (y.isSymbolicLink())
        throw M(
          "leaf_shape",
          Error("sockets directory is a symlink \u2014 refusing to use it"),
          socketDirFacts(e, y),
        );
      if (!y.isDirectory())
        throw M("leaf_shape", Error("sockets directory exists but is not a directory"), socketDirFacts(e, y));
      if (n !== void 0 && !o(y.uid))
        throw M(
          "foreign_owner",
          Error("sockets directory is owned by another user \u2014 refusing to use it"),
          socketDirFacts(e, y),
        );
    },
    o = (y) => y === n,
    a = process.getgid?.(),
    r = await inspectUserNamespace();
  if (r?.uidCollapses)
    throw M(
      "uid_collapse",
      Error(
        "this process reads as the kernel overflow uid (user namespace without a uid mapping) \u2014 ownership cannot be verified; refusing to use the sockets directory",
      ),
    );
  o = (y) => y === n && !r?.uidCollapses;
  let p = _li(),
    _ = async (y, A) => {
      try {
        let C = A.isSymbolicLink() ? join(await realpath(dirname(y)), basename(y)) : await realpath(y),
          P = await lstat(C);
        return P.dev === A.dev && P.ino === A.ino ? C : void 0;
      } catch {
        return;
      }
    },
    w = (y) =>
      r !== void 0 &&
      ((r.unmappedOwnerUid !== void 0 && y === r.unmappedOwnerUid) || (y === 0 && r.rootUidAmbiguous)),
    h = w,
    l = (y) => y !== void 0 && p.has(y),
    D = (y, A, C) => n === void 0 || o(y) || (!A && (w(y) ? l(C) : y === 0)),
    E = (y, A, C) => {
      if (!D(y.uid, A, C)) return !1;
      if ((y.mode & 512) !== 0) return !0;
      if ((y.mode & 2) !== 0) return !1;
      if ((y.mode & 16) !== 0) return o(y.uid) && a !== void 0 && y.gid === a && a === n;
      return !0;
    },
    c = env.TERMUX_VERSION && env.PREFIX ? dirname(dirname(env.PREFIX)) : void 0,
    S = (y) => dirname(y) === y || y === c,
    v = async (y, A, C = 0) => {
      if (C > 16) throw M("symlink_loop", Error("sockets-directory chain: too many levels of symlinks"));
      let P = !1,
        pe,
        ge = !1;
      for (let U = y, Q = !0; ; U = dirname(U), Q = !1) {
        let T;
        try {
          T = await lstat(U);
        } catch (error) {
          if (!isENOENT(error)) throw error;
        }
        if (T !== void 0) {
          pe ??= U;
          let G = Q && A;
          if (T.isSymbolicLink()) {
            ge = !0;
            let Z = h(T.uid) ? await _(U, T) : void 0;
            if (!D(T.uid, !1, Z))
              throw M(
                "foreign_owner",
                Error(
                  "a sockets-directory component is a symlink owned by another user \u2014 refusing to use it",
                ),
                socketDirFacts(U, T),
              );
            let replaced = (await readlink(U)).replace(/\/{2,}/g, "/"),
              oe = replaced.length > 1 && replaced.endsWith("/") ? replaced.slice(0, -1) : replaced,
              Ue = isAbsolute(oe) ? oe : `${await realpath(dirname(U))}/${oe}`,
              { startExists: startExists } = await v(Ue, G, C + 1);
            if (Q) P = startExists;
          } else {
            if (!T.isDirectory())
              throw M(
                "not_directory",
                Error(
                  "a sockets-directory component exists but is not a directory \u2014 refusing to use it",
                ),
                socketDirFacts(U, T),
              );
            let Z = h(T.uid) ? await _(U, T) : void 0;
            if (!E(T, G, Z))
              throw M(
                "directory_rule",
                Error(
                  "a sockets-directory component is not a private-or-sticky directory owned by us or root \u2014 refusing to use it",
                ),
                socketDirFacts(U, T, !D(T.uid, G, Z)),
              );
            if (Q) P = !0;
          }
        }
        if (S(U)) break;
      }
      return { startExists: P, deepestExisting: pe, sawSymlink: ge };
    },
    b = dirname(e),
    R = await v(b, !1),
    x = !R.startExists,
    F;
  try {
    F = await lstat(e);
  } catch (error) {
    if (!isENOENT(error)) throw error;
  }
  if (x && R.deepestExisting === b) throw danglingLinkError();
  if (x) {
    let y = [],
      A = (C) => {
        if (!C.isDirectory() || (n !== void 0 && !o(C.uid)))
          throw M(
            "raced",
            Error(
              "a sockets-directory component appeared while being created and is not our directory \u2014 refusing to use it",
            ),
          );
      };
    for (let C = b; C !== R.deepestExisting && !S(C); C = dirname(C)) y.unshift(C);
    for (let C of y)
      try {
        await mkdir(C, { mode: 448 });
      } catch (error) {
        if (isENOENT(error) && R.sawSymlink) throw danglingLinkError();
        if (getErrnoCode(error) !== "EEXIST") throw error;
        A(await lstat(C));
      }
    if (!(await v(b, !0)).startExists)
      throw M("raced", Error("sockets base directory vanished while being set up"));
  }
  if (F === void 0) {
    try {
      await mkdir(e, { mode: 448 });
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") throw error;
    }
    F = await lstat(e);
  }
  if ((s(F), (F.mode & 511) !== 448)) await chmod(e, 448);
}
/**
 * 校验 --messaging-socket-path 显式指定的 UDS 路径（目录所有者、权限、符号链接），不合格时拒绝绑定。本模块整体是跨会话 UDS 消息服务：建 socket 目录、绑定、接收 user/control 消息、祖先进程判定自发消息。
 */
//@ chunk-0kp6eg01.js:24275-27546 placement
async function validateExplicitMessagingSocketPath(e) {
  if (!isAbsolute(e))
    throw new CliUserError(
      e === ""
        ? "--messaging-socket-path was given an empty value (an unset shell variable?). Pass an absolute socket path."
        : `--messaging-socket-path must be an absolute path, got: ${e}`,
    );
  if (e.split("/").includes(".."))
    throw new CliUserError(`--messaging-socket-path must not contain '..' segments, got: ${e}`);
  let at = e.split("/").at(-1);
  if (at === "" || at === ".")
    throw new CliUserError(`--messaging-socket-path must name a socket file inside a directory, got: ${e}`);
  let replaced = normalize(e).replace(/\/+$/, "");
  if (replaced === "" || !replaced.startsWith("/") || basename(replaced) === "")
    throw new CliUserError(`--messaging-socket-path must name a socket file inside a directory, got: ${e}`);
  if (!isValidPipeOrPath(replaced) || !isValidPipeOrPath(e))
    throw new CliUserError(`--messaging-socket-path must be a local socket path, got: ${e}`);
  if (Buffer.byteLength(replaced) > Y)
    throw new CliUserError(
      `--messaging-socket-path is too long for a Unix socket (${Buffer.byteLength(replaced)} bytes, max ${Y}): ${replaced}. Choose a shorter path, e.g. under $XDG_RUNTIME_DIR or /tmp/<private-dir>.`,
    );
  let a = dirname(replaced),
    r =
      "Use a private directory you own that only you use, e.g. mkdir -m 700 <dir> (or chmod 700 an existing one).",
    p = (c) => {
      if (c.isSymbolicLink())
        throw new CliUserError(
          `--messaging-socket-path directory must be a real directory, not a symlink: ${a}. ${r}`,
        );
      if (!c.isDirectory())
        throw new CliUserError(`--messaging-socket-path parent is not a directory: ${a}.`);
      let S = process.getuid?.();
      if (S !== void 0 && c.uid !== S)
        throw new CliUserError(
          `--messaging-socket-path directory ${a} is not owned by you (uid ${c.uid}). ${r}`,
        );
      if ((c.mode & 63) !== 0)
        throw new CliUserError(
          `--messaging-socket-path directory ${a} is not private (mode ${(c.mode & 4095).toString(8)}); the socket directory must be mode 0700 so no other user or group can reach or replace the socket. ${r}`,
        );
    },
    _ = async () => {
      try {
        return await lstat(a);
      } catch (error) {
        let S = getErrnoCode(error);
        if (isENOENT(error)) return;
        if (S === "ENOTDIR" || S === "EACCES" || S === "ELOOP" || S === "ENAMETOOLONG")
          throw new CliUserError(
            `--messaging-socket-path directory is not usable: ${a} (${S}). Fix the path or its permissions, or choose another path. ${r}`,
          );
        throw new CliUserError(
          `--messaging-socket-path directory could not be examined: ${a} (${S ?? String(error)}). ${r}`,
        );
      }
    },
    w = await _();
  if (w !== void 0) return (p(w), replaced);
  let h = process.getuid?.(),
    l = [];
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
    if (S !== void 0) {
      if (h !== void 0 && S.uid !== h && S.uid !== 0)
        throw new CliUserError(
          `--messaging-socket-path: ${c} ${S.isSymbolicLink() ? "is a symlink" : "is a directory"} owned by another user \u2014 refusing to create your sockets directory ${S.isSymbolicLink() ? "through" : "inside"} it. ${r}`,
        );
      break;
    }
    if (dirname(c) === c) break;
  }
  let D = !1;
  try {
    for (let c of l)
      try {
        await mkdir(c, { mode: 448 });
      } catch (error) {
        if (getErrnoCode(error) !== "EEXIST") throw error;
        let v = await lstat(c);
        if (!v.isDirectory() || (h !== void 0 && v.uid !== h))
          throw new CliUserError(
            `--messaging-socket-path: ${c} appeared while your sockets directory was being created and is not a directory you own \u2014 refusing to use it. ${r}`,
          );
      }
    try {
      (await mkdir(a, { mode: 448 }), (D = !0));
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
  if (E === void 0)
    throw new CliUserError(`--messaging-socket-path directory ${a} vanished while being set up. ${r}`);
  if (!D) return (p(E), replaced);
  return (p(E), replaced);
}
//@ chunk-0kp6eg01.js:27546-27653 placement
async function startUdsMessaging(e, n, s = {}) {
  u().startInFlight = !0;
  try {
    return await startUdsMessagingUnchecked(e, n, s);
  } finally {
    u().startInFlight = !1;
  }
}
/**
 * 启动 UDS 消息服务
 */
//@ chunk-0kp6eg01.js:27653-34045 placement
async function startUdsMessagingUnchecked(e, n, s = {}) {
  let a = s.profileStartup ? performance.now() : void 0,
    r = (h) => {
      if (a === void 0) return;
      let startTime = performance.now();
      (Br(h, startTime - a, a), (a = startTime));
    };
  if (
    ((u().lastStartFailureCause = "bind_failed"),
    (u().lastStartDegradedCause = void 0),
    !isValidPipeOrPath(e))
  ) {
    if (
      (logForDebugging(
        `[uds-messaging] Refusing socket path \u2014 ${"not a usable local socket address (a remote/UNC path, or a pipe name with extra segments or a trailing dot/space)"}: ${e}`,
        { level: "error" },
      ),
      q(),
      (u().lastStartFailureCause = "path_refused"),
      s.isExplicit)
    )
      throw new CliUserError(
        `--messaging-socket-path ${e} is not a usable local socket address (a remote/UNC path, or a pipe name with extra segments or a trailing dot/space).`,
      );
    return;
  }
  if (!s.isExplicit && !0 && !isAbsolute(e)) e = resolve(e);
  if (s.isExplicit) {
    if (((e = await validateExplicitMessagingSocketPath(e)), (await probeSocket(e)) === "live"))
      throw new CliUserError(
        `--messaging-socket-path points to a live socket: ${e}. Another process is listening there. Remove it or choose a different path.`,
      );
  } else {
    let h = dirname(e);
    try {
      await vetSocketsDir(h);
    } catch (error) {
      let D = isPermanentSocketRefusal(error) ? await getHostUid() : void 0,
        E = D === void 0 ? void 0 : resolve(getPerUidFallbackUdsSocketPath(D)),
        c = E === void 0 ? void 0 : join(E, "..");
      if (E === void 0 || c === void 0 || c === h)
        return refuseSocketDir(h, error, socketDirRefusalHint(error));
      let S = describeSocketDirRefusal(error);
      logForDebugging(
        `[uds-messaging] sockets directory ${h} refused (${errorMessage(error)}${S ? `; refused component: ${S}` : ""}); trying the per-uid fallback ${c}`,
        { level: "warn" },
      );
      try {
        await vetSocketsDir(c);
      } catch (error) {
        return refuseSocketDir(c, error, socketDirRefusalHint(error));
      }
      ((e = E), recordDegradedCause("primary_dir_refused_fell_back"));
    }
  }
  if (s.isExplicit)
    try {
      await unlink(e);
    } catch {}
  if (((u().activeSocketPath = e), s.profileStartup)) profileCheckpoint("uds_inbox_dir_ready");
  r("setup_uds_dir_ms");
  let p, _;
  try {
    p = createServer({ allowHalfOpen: !0 }, (h) => {
      (u().connectedClients.add(h),
        logForDebugging("[uds-messaging] Client connected"),
        handleConnection(h),
        h.on("close", () => {
          (u().connectedClients.delete(h), logForDebugging("[uds-messaging] Client disconnected"));
        }));
    });
  } catch (error) {
    (clearActiveSocket(),
      logForDebugging(`[uds-messaging] Failed to create server: ${String(error)}`, { level: "error" }),
      q());
    return;
  }
  (p.on("error", (h) => {
    logForDebugging(`[uds-messaging] Server error: ${h.message}`, { level: "error" });
  }),
    (u().authRequired = s.requireAuth ?? Ohr()),
    (u().firstLineDeadlineMs = s.firstLineDeadlineMs ?? LPr));
  let w = AAi();
  u().activeTokens = w;
  try {
    if (s.isExplicit) {
      if (!(await tryListen(p, e))) throw Error("listen EADDRINUSE on the requested socket path");
    } else ((e = await bindAutoSocketPath(p, e)), (u().activeSocketPath = e));
    if (s.profileStartup) profileCheckpoint("uds_inbox_listening");
    r("setup_uds_listen_ms");
    {
      let E = await getHostUid(),
        c = process.getuid?.();
      u().peerDirOwnerUids = [...(c !== void 0 ? [c] : []), ...(E !== void 0 && E !== c ? [E] : [])];
    }
    p.unref();
    let h = registerCleanup(async () => {
      (logForDebugging("[uds-messaging] Shutting down"), await stopUdsServer(p, e, n));
    });
    ((_ = h), await chmod(e, 384));
    try {
      ((u().activeKeyFile = await writeSessionPeerRecord(e, w.peerToken, n, {
        sweepPermitted: await isRegistrySweepPermitted(),
      })),
        registerActiveKeyFileCleanupOnExit());
    } catch (error) {
      if (u().authRequired) {
        if (
          (logForDebugging(
            `[uds-messaging] Failed to publish the inbox auth key (refusing to run an inbox no peer can authenticate to): ${error}`,
            { level: "error" },
          ),
          (u().lastStartFailureCause = "key_publish_failed"),
          await stopUdsServer(p, e, n, { settleHeld: !1 }),
          h(),
          q(),
          s.isExplicit)
        )
          throw new CliUserError(
            `--messaging-socket-path: bound ${e} but could not publish its auth key (${getErrnoCode(error) ?? error}); peers could not authenticate, so the inbox was closed. Check that the session registry directory is writable by you.`,
          );
        return;
      }
      (logForDebugging(
        `[uds-messaging] Failed to publish the inbox auth key; peers will send unauthenticated (accepted: auth is optional on this platform): ${error}`,
        { level: "warn" },
      ),
        recordDegradedCause("key_publish_failed"));
    }
    if (s.profileStartup) profileCheckpoint("uds_inbox_key_published");
    (r("setup_uds_publish_ms"),
      (process.env.CLAUDE_CODE_MESSAGING_SOCKET = e),
      udsEnv.set("CLAUDE_CODE_MESSAGING_TOKEN", w.childToken),
      Z3o(u8(e)));
    let l = u8(e);
    return (
      Evo(notePeerReplyTarget),
      (getSessionNamingState().senderMode = currentSenderClass),
      setIdleNoticeSender((E, c, S, v, b) =>
        sendControlToUdsSocket(
          E,
          { action: "peer_idle_notice", ...c, from: l, ...(v ? pn() : {}) },
          {
            ...(S !== void 0 && { expectPeerPid: S }),
            ...(b !== void 0 && { expectPeerProcStart: b }),
            storageV5: n,
          },
        ),
      ),
      $Ro(
        (E, c, S, v) =>
          sendControlToUdsSocket(
            E,
            { action: "artifact_replies_yielded", ...c, from: l },
            {
              ...(S !== void 0 && { expectPeerPid: S }),
              ...(v !== void 0 && { expectPeerProcStart: v }),
              storageV5: n,
            },
          ),
        l,
      ),
      setRegisteredInboxOfPidReader((E) => registeredInboxesOfPids(E)),
      wvo((E, c, S) => {
        let v = E.origin?.kind === "peer" ? E.origin : void 0,
          b = v?.from;
        if (typeof b !== "string") return;
        let R = vettedPeerReplyTarget(b, e, v?.verifiedPeerPid);
        if (R === void 0) {
          logForDebugging(
            `[uds-messaging] hold-receipt skipped: reply address unshaped or outside our socket namespace (${jy(b)})`,
          );
          return;
        }
        return sendControlToUdsSocket(
          R,
          {
            action: "peer_message_status",
            ...(c === "refused" ? { status: "expired", status_detail: "refused" } : { status: c }),
            reason: holdOutcomeExplanation(c),
            from: l,
            ...(typeof v?.msg_id === "string" && { orig_msg_id: v.msg_id }),
            ...(c === "dropped" &&
              S !== void 0 && { drop_reason: S.dropReason, dropped_msg_ids: S.droppedMsgIds }),
          },
          {
            ...(v?.verifiedPeerPid !== void 0 && { expectPeerPid: v.verifiedPeerPid }),
            ...(v?.verifiedPeerProcStart !== void 0 && { expectPeerProcStart: v.verifiedPeerProcStart }),
            storageV5: n,
          },
        ).catch((x) =>
          logForDebugging(
            `[uds-messaging] hold-receipt send failed to ${jy(b)}: ${redactFragmentForLog(String(x))}`,
          ),
        );
      }),
      logForDebugging(`[uds-messaging] Listening: ${e}`, { level: "info" }),
      logForDebugging(
        `[uds-messaging] Inject messages (auth line ${u().authRequired ? "REQUIRED" : "optional"} here): { echo '{"type":"auth","token":"'"$CLAUDE_CODE_MESSAGING_TOKEN"'"}'; echo '{"type":"user","message":{"role":"user","content":"hello"}}'; } | socat - UNIX-CONNECT:${e}`,
        { level: "info" },
      ),
      logForDebugging(
        `[uds-messaging] Connect when the data is ready (e.g. out=$(cmd); printf '%s\\n' "$out" | ${"nc -N -U"} "$CLAUDE_CODE_MESSAGING_SOCKET" \u2014 or the socat form above): a connection that sends no complete line within ${u().firstLineDeadlineMs} ms is closed`,
        { level: "info" },
      ),
      (u().lastStartFailureCause = void 0),
      nn(p, e, n, h)
    );
  } catch (error) {
    if (error instanceof CliUserError) throw error;
    if (s.isExplicit) {
      let l = getErrnoCode(error);
      if (_ !== void 0)
        throw (
          await stopUdsServer(p, e, n, { settleHeld: !1 }),
          _(),
          q(),
          (u().lastStartFailureCause = "post_bind_setup_failed"),
          new CliUserError(
            `--messaging-socket-path: bound ${e} but could not finish setting the socket up (${l ?? String(error)}); the inbox was closed. The filesystem there may not support socket permissions \u2014 choose another directory.`,
          )
        );
      (clearActiveSocket(), q());
      let D =
        l === "ENAMETOOLONG"
          ? "the path is too long for a Unix socket (max ~104 bytes); choose a shorter one"
          : l === "EADDRINUSE"
            ? "something already exists at that path and could not be replaced; remove it or choose another path"
            : l === "EACCES" || l === "EPERM"
              ? "permission denied in that directory"
              : "the socket could not be created there";
      throw new CliUserError(`--messaging-socket-path: cannot bind at ${e} (${l ?? String(error)}): ${D}.`);
    }
    if (_ !== void 0)
      (await stopUdsServer(p, e, n, { settleHeld: !1 }),
        _(),
        (u().lastStartFailureCause = "post_bind_setup_failed"));
    if (getErrnoCode(error) === "ENAMETOOLONG")
      logForDebugging(
        `[uds-messaging] Socket path too long (${e.length} bytes, max ~104): ${e}. Try a shorter --messaging-socket-path, or set CLAUDE_CODE_TMPDIR or $XDG_RUNTIME_DIR to a shorter directory.`,
        { level: "error" },
      );
    else logForDebugging(`[uds-messaging] Failed to start: ${error}`, { level: "error" });
    (clearActiveSocket(), q());
    return;
  }
}
/**
 * 暂扣结果解释
 */
//@ chunk-0kp6eg01.js:34045-34926 placement
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
function pn() {
  let e = currentSenderClass();
  return e === void 0 ? {} : { from_mode: e };
}
//@ chunk-0kp6eg01.js:34987-35155 placement
function currentSenderClass() {
  if (!r$t()) return;
  let getCurrentMode = ci().inbound.getCurrentMode;
  if (getCurrentMode)
    try {
      return s$t(getCurrentMode());
    } catch {
      return;
    }
  let modeAtUnwire = ci().inbound.modeAtUnwire;
  return modeAtUnwire !== void 0 ? s$t(modeAtUnwire) : void 0;
}
//@ chunk-0kp6eg01.js:35155-35193 placement
function Ae(e) {
  return FAi(e) ? e : void 0;
}
//@ chunk-0kp6eg01.js:35193-35326 placement
function isSelfSentMessage(e, n, s) {
  return isSelfSent({
    selfSentAncestry: n,
    verifiedPeerPid: e,
    childTokenPresented: s === "child",
    needsVerdict: isBypassDefaultHold(),
    platform: getPlatform(),
  });
}
/**
 * 只注册一次 process exit 监听，退出时删除 activeKeyFile。旧版名 useCostSummary 为错配。
 */
//@ chunk-0kp6eg01.js:35326-35407 placement = useCostSummary (0.695)
function registerActiveKeyFileCleanupOnExit() {
  if (!process.listeners("exit").includes(unlinkActiveKeyFileSync))
    process.on("exit", unlinkActiveKeyFileSync);
}
//@ chunk-0kp6eg01.js:35407-35485 placement
function unlinkActiveKeyFileSync() {
  try {
    let activeKeyFile = u().activeKeyFile;
    if (activeKeyFile === void 0) return;
    unlinkSync(activeKeyFile);
  } catch {}
}

export { setOnRename, getUdsInboxUnavailableReason, setOnPeerMessageStatus };

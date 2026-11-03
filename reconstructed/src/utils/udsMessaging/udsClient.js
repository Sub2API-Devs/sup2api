/**
 * utils/udsMessaging/udsClient.ts
 *
 * 跨会话消息（UDS/命名管道）客户端：向其他会话收件箱发送消息与控制、节流计数、列出存活会话与对等方
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-66jn0ssz.js (36)
 * attribution: placement 36
 */
import { lstat, readdir, unlink, stat } from "fs/promises";
import { connect } from "net";
import { join, basename, dirname } from "path";
import { swarmHostState } from "../swarm/hostState.js";
import {
  parseAddress,
  isValidPipeOrPath,
  parseNamedPipeName,
  mayBeSamePath,
  isSamePath,
} from "../peerAddress.js";
import { canonicalSocketPath } from "../udsPaths.js";
import { udsAddressFromPath, wrapPeerMessage, extendHopChain } from "../peerMessageHeaders.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import {
  ownDesktopHostSessionId,
  getSessionsDir,
  reapKeysOfReapedRecord,
  isRegistrySweepPermitted,
  mayReapRecordFromThisDomain,
} from "../concurrentSessions.js";
import { hmacRandomId } from "../randomId.js";
import { createMessageEnvelope } from "./messageEnvelope.js";
import { getPlatform } from "../platform.js";
import {
  isPacingEnabled,
  outboundPacer,
  PACER_PASSED,
  fragmentForLog,
  describeSenderPaced,
  isExpectedSendError,
  MAX_PEER_MESSAGE_BYTES,
  describeMessageTooLarge,
  UdsSendRefusedError,
  NoLiveInboxError,
  ENOINBOX,
  getPeerPid,
  getPeerUid,
  sanitizeFormerNames,
} from "./peerGuard.js";
import { logForDebugging } from "../debug.js";
import { sanitizeTeammateLabel } from "../swarm/teammateIds.js";
import { uniq, stringArray } from "../collections.js";
import {
  isProcessProvablyGone,
  provenSameProcessAsync,
  getProcessStartTokenLinuxSync,
  getProcessCreationTimeMsAsync,
  isSameProcessAsync,
  getProcessStartTimeAsync,
  startTokensEqualOrCrossFormat,
} from "../processIdentity.js";
import { jsonStringify, jsonParse } from "../slowOperations.js";
import {
  AUTH_HANDSHAKE_LENGTH,
  classifySessionAddress,
  authHandshakeJson,
  isNotStableAddress,
} from "../sessionAddresses.js";
import { isProcessRunning } from "../genericProcessUtils.js";
import { isWindowsPlatform, MAX_PEER_NOTICE_LENGTH } from "../sessionPeers.js";
import { isENOENT, getErrnoCode } from "../errors.js";
import { isDiskless } from "../../bootstrap/state.js";
import {
  parseSessionRecordName,
  MAX_SESSION_RECORD_BYTES,
  normalizeSessionRecord,
  saneEpochMsOrUndefined,
} from "../sessionRecords.js";
import { readSmallFileOrNull } from "../readSmallFile.js";
import { isValidLocalTaskId } from "../../services/analytics/metadata.js";
import { sleep } from "../sleep.js";
import { ownPidDomain } from "../pidSpace.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { STORAGE_SPACES } from "../storage/storageSpaces.js";
import { udsEnv } from "../env.js";

//@ chunk-66jn0ssz.js:11282-11323 placement
function creditPacerForHeldSend(e) {
  withOutboundPacer(e, (n, r) => n.credit(r));
}
//@ chunk-66jn0ssz.js:11323-11363 placement
function debitPacerForReleasedSend(e) {
  withOutboundPacer(e, (n, r) => n.debit(r));
}
//@ chunk-66jn0ssz.js:11363-11482 placement
function withOutboundPacer(e, n) {
  let pacer = swarmHostState().outbound.pacer;
  if (!pacer) return;
  let { scheme, target } = parseAddress(e);
  if (scheme !== "uds") return;
  n(pacer, canonicalSocketPath(target) ?? target);
}
//@ chunk-66jn0ssz.js:11482-12398 placement
async function sendToUdsSocket(
  sock,
  n,
  r,
  s,
  d,
  m,
  g,
  { trackReceipts: l = true, expectPeerPid: a, expectPeerProcStart: o, fromPlugin: c, recipientName: R } = {},
) {
  let w = ownMessagingSocket();
  let S = w ? udsAddressFromPath(w) : undefined;
  let P = getFeatureValue_CACHED_MAY_BE_STALE("tengu_tidy_fern", true)
    ? ownDesktopHostSessionId()
    : undefined;
  let content = wrapPeerMessage(S, s, n, P, extendHopChain(m, S ? hmacRandomId(S) : undefined), g);
  let messageEnvelope = createMessageEnvelope();
  let y = {
    ...messageEnvelope,
    type: "user",
    message: {
      role: "user",
      content,
    },
    priority: "next",
    from: S,
    ...(c !== undefined && {
      from_plugin: c,
    }),
    ...((d?.length ?? 0) > 0 && {
      file_attachments: d,
    }),
  };
  let preflightedJson = serializePeerPayload(y);
  let L =
    (S !== undefined || getPlatform() !== "windows") && isPacingEnabled()
      ? outboundPacer().reserve(canonicalSocketPath(sock) ?? sock)
      : PACER_PASSED;
  if (!L.ok) {
    logForDebugging(
      `[uds-client] paced: not sending to ${fragmentForLog(sock)} \u2014 ${L.sentInBurst} sent this burst; its inbox rate limit would drop more`,
    );
    throw describeSenderPaced(L.sentInBurst);
  }
  logForDebugging(`[uds-client] Sending ${n.length} chars to ${fragmentForLog(sock)}`);
  if (l) trackOutstandingSend(messageEnvelope.msg_id, udsAddressFromPath(sock), R);
  try {
    await connectToInbox(sock, y, r, {
      noFollowSymlink: true,
      preflightedJson,
      ...(a !== undefined && {
        expectPeerPid: a,
      }),
      ...(o !== undefined && {
        expectPeerProcStart: o,
      }),
    });
  } catch (error) {
    if (isExpectedSendError(error)) {
      L.refund();
      if (l) untrackOutstandingSend(messageEnvelope.msg_id);
    }
    throw error;
  }
  return {
    msgId: messageEnvelope.msg_id,
  };
}
//@ chunk-66jn0ssz.js:12398-12409 placement
var MAX_OUTSTANDING_SENDS = 200;
//@ chunk-66jn0ssz.js:12409-12544 placement
function trackOutstandingSend(msgId, to, r) {
  let outstandingSends = swarmHostState().receipts.outstandingSends;
  if (outstandingSends.length >= MAX_OUTSTANDING_SENDS) outstandingSends.shift();
  outstandingSends.push({
    msgId,
    to,
    handle: sanitizeTeammateLabel(r ?? "", 1 / 0) || undefined,
  });
}
//@ chunk-66jn0ssz.js:12544-12652 placement
function untrackOutstandingSend(msgId) {
  let outstandingSends = swarmHostState().receipts.outstandingSends;
  let index = outstandingSends.findIndex((outstandingSend) => outstandingSend.msgId === msgId);
  if (index !== -1) outstandingSends.splice(index, 1);
}
//@ chunk-66jn0ssz.js:12652-13034 placement
function admitReceiptForOutstandingSend(origMsgId, status) {
  if (typeof origMsgId !== "string") return;
  let { outstandingSends, awaitingTerminal } = swarmHostState().receipts;
  let index = outstandingSends.findIndex((outstandingSend) => outstandingSend.msgId === origMsgId);
  if (index !== -1) {
    let [g] = outstandingSends.splice(index, 1);
    if (!g) return;
    if (status === "held") {
      if (awaitingTerminal.length >= MAX_OUTSTANDING_SENDS) awaitingTerminal.shift();
      awaitingTerminal.push(g);
    }
    return {
      sent: g,
      wasHeld: false,
    };
  }
  let index_2 = awaitingTerminal.findIndex((g) => g.msgId === origMsgId);
  if (index_2 !== -1 && status !== "held") {
    let [g] = awaitingTerminal.splice(index_2, 1);
    return g
      ? {
          sent: g,
          wasHeld: true,
        }
      : undefined;
  }
  return;
}
//@ chunk-66jn0ssz.js:13034-13371 placement
function admitDroppedIdsByDestination(e) {
  let n = new Map();
  if (e.length === 0) return n;
  let r = new Set(e);
  let { outstandingSends, awaitingTerminal } = swarmHostState().receipts;
  for (let m of [outstandingSends, awaitingTerminal]) {
    let g = m === awaitingTerminal;
    for (let l = 0; l < m.length;) {
      let a = m[l];
      if (r.delete(a.msgId)) {
        m.splice(l, 1);
        let o = n.get(a.to) ?? {
          sends: [],
          wereHeld: 0,
        };
        o.sends.push(a);
        if (g) o.wereHeld++;
        n.set(a.to, o);
      } else l++;
    }
  }
  return n;
}
//@ chunk-66jn0ssz.js:13371-13430 placement
function sendControlToUdsSocket(e, n, r = {}) {
  return sendStampedControlToUdsSocket(e, n, createMessageEnvelope(), r).then(() => {});
}
//@ chunk-66jn0ssz.js:13430-13732 placement
async function sendStampedControlToUdsSocket(
  e,
  n,
  r = createMessageEnvelope(),
  { expectPeerPid: s, expectPeerProcStart: d, storageV5: m } = {},
) {
  logForDebugging(`[uds-client] Sending control:${n.action} to ${fragmentForLog(e)}`);
  await connectToInbox(
    e,
    {
      type: "control",
      ...n,
      ...r,
    },
    m,
    {
      noFollowSymlink: true,
      ...(s !== undefined && {
        expectPeerPid: s,
      }),
      ...(d !== undefined && {
        expectPeerProcStart: d,
      }),
    },
  );
  return {
    msgId: r.msg_id,
  };
}
//@ chunk-66jn0ssz.js:13732-13743 placement
var CONNECT_CONCURRENCY = 150;
//@ chunk-66jn0ssz.js:13743-13980 placement
async function registeredLivePeerForSocket(e) {
  let n = canonicalSocketPath(e);
  if (n === undefined) return;
  for (let r of await listSessionRecords()) {
    if (!r.sock || canonicalSocketPath(r.sock) !== n) continue;
    if (await isSameLiveProcess(r))
      return {
        pid: r.pid,
        features: r.peerFeatures,
        sessionId: r.sessionId,
        procStart: r.procStartFt ?? r.procStart,
      };
  }
  return;
}
//@ chunk-66jn0ssz.js:13980-14254 placement
async function registeredInboxesOfPids(e) {
  let n = uniq(e);
  let r = new Map();
  if (n.length === 0) return r;
  let sessionsDir = getSessionsDir();
  let filtered = (await Promise.all(n.map((l) => readSessionRecord(sessionsDir, `${l}.json`)))).filter(
    (l) => l !== null && Boolean(l.sock),
  );
  let results = await Promise.all(filtered.map((l) => isSameLiveProcess(l)));
  filtered.forEach((l, a) => {
    if (results[a] && l.sock) r.set(l.pid, l.sock);
  });
  return r;
}
//@ chunk-66jn0ssz.js:14254-14373 placement
async function liveStatusOfJob(e, n) {
  let sessionRecord = await readSessionRecord(getSessionsDir(), `${e}.json`, {
    rejectTornLiveRecord: true,
  });
  return sessionRecord?.jobId === n ? sessionRecord.status : undefined;
}
//@ chunk-66jn0ssz.js:14373-14490 placement
async function isSameLiveProcess(e) {
  let n = e.procStartFt ?? e.procStart;
  if (n === undefined || isProcessProvablyGone(e.pid)) return false;
  return (await provenSameProcessAsync(e.pid, n)) === true;
}
//@ chunk-66jn0ssz.js:14490-14567 placement
function serializePeerPayload(e) {
  let n = jsonStringify(e);
  let r = AUTH_HANDSHAKE_LENGTH + n.length + 1;
  if (r > MAX_PEER_MESSAGE_BYTES) throw describeMessageTooLarge(r, MAX_PEER_MESSAGE_BYTES);
  return n;
}
//@ chunk-66jn0ssz.js:14567-14810 placement
async function isSocketOwnerAlive(e) {
  let n = canonicalSocketPath(e);
  if (n === undefined) return false;
  for (let r of await listSessionRecords()) {
    if (!r.sock || canonicalSocketPath(r.sock) !== n) continue;
    if (isProcessProvablyGone(r.pid)) continue;
    if ((r.procStartFt ?? r.procStart) !== undefined) {
      if (await isSameLiveProcess(r)) return true;
      continue;
    }
    if (isProcessRunning(r.pid)) return true;
  }
  return false;
}
//@ chunk-66jn0ssz.js:14810-17236 placement
/**
 * 连接对端收件箱：拒绝非本机 IPC 路径、未登记/不可审查的回复目标与符号链接（约 2.4 KB）。
 */
async function connectToInbox(
  e,
  n,
  r,
  { noFollowSymlink: s = false, expectPeerPid: d, expectPeerProcStart: m, preflightedJson: g } = {},
) {
  let l = g ?? serializePeerPayload(n);
  if (!isValidPipeOrPath(e))
    throw new UdsSendRefusedError(
      "non-local",
      `Refusing to connect: not a usable local IPC path (remote/UNC host, or a pipe name with extra segments or a trailing dot/space): ${e}`,
    );
  let a = isWindowsPlatform();
  let o = await classifySessionAddress(e, r, {
    requireLiveOwner: a,
  });
  let token = o.kind === "token" ? o.token : undefined;
  if (a && o.kind !== "token") {
    if (!(o.kind === "no-key" && (await isSocketOwnerAlive(e))))
      throw new NoLiveInboxError(
        o.kind,
        `No running session has registered an inbox at ${e} (${ENOINBOX}: ${o.kind}) \u2014 refusing to send to an unvouched pipe`,
      );
    token = undefined;
  }
  let R = token !== undefined ? authHandshakeJson(token) : "";
  if (s && !(getPlatform() === "windows" && parseNamedPipeName(e) !== undefined)) {
    let S;
    try {
      S = (await lstat(e)).isSymbolicLink();
    } catch (error) {
      if (isENOENT(error)) throw error;
      logForDebugging(`[uds-client] reply target unvettable: ${getErrnoCode(error) ?? "lstat failed"}`);
      throw new UdsSendRefusedError("unvettable", "Refusing to send: cannot vet reply target");
    }
    if (S) throw new UdsSendRefusedError("symlink", "Refusing to send: reply target is a symlink");
  }
  let w =
    R +
    l +
    `
`;
  return new Promise((resolve, reject) => {
    let b = connect({
      path: e,
    });
    let h = false;
    b.setTimeout(5000, () => {
      h = true;
      b.destroy();
      reject(Error(`Timed out sending to ${e}`));
    });
    b.on("error", (y) => {
      h = true;
      reject(y);
    });
    b.on("connect", () => {
      if (d !== undefined && getPlatform() !== "windows") {
        let peerPid = getPeerPid(b);
        if (peerPid === undefined) {
          h = true;
          b.destroy();
          reject(
            new UdsSendRefusedError(
              "endpoint-unverifiable",
              "Refusing to send: connected endpoint identity could not be read",
            ),
          );
          return;
        }
        if (peerPid !== d) {
          h = true;
          b.destroy();
          logForDebugging(
            `[uds-client] connected endpoint is pid ${peerPid}, expected ${d} \u2014 refusing to write`,
          );
          reject(
            new UdsSendRefusedError(
              "wrong-endpoint",
              "Refusing to send: connected endpoint is not the expected process",
            ),
          );
          return;
        }
        let x = process.getuid?.();
        let peerUid = getPeerUid(b);
        if (x !== undefined && peerUid === null) {
          h = true;
          b.destroy();
          reject(
            new UdsSendRefusedError(
              "endpoint-unverifiable",
              "Refusing to send: connected endpoint owner could not be read",
            ),
          );
          return;
        }
        if (x !== undefined && peerUid !== x) {
          h = true;
          b.destroy();
          logForDebugging(
            `[uds-client] connected endpoint is owned by uid ${peerUid}, not ours \u2014 refusing to write`,
          );
          reject(
            new UdsSendRefusedError(
              "wrong-endpoint",
              "Refusing to send: connected endpoint is not owned by this user",
            ),
          );
          return;
        }
        if (m !== undefined && getProcessStartTokenLinuxSync(peerPid) !== m) {
          h = true;
          b.destroy();
          logForDebugging(
            `[uds-client] connected endpoint pid ${peerPid} is not the process that wrote to us (start token differs \u2014 recycled pid) \u2014 refusing to write`,
          );
          reject(
            new UdsSendRefusedError(
              "wrong-endpoint",
              "Refusing to send: connected endpoint is a different process with the expected pid",
            ),
          );
          return;
        }
      }
      b.write(w);
      if (getPlatform() === "macos")
        setTimeout(
          (y) => {
            if (!y.destroyed) y.end();
          },
          CONNECT_CONCURRENCY,
          b,
        );
      else b.end();
    });
    b.on("close", () => {
      if (!h) logForDebugging(`[uds-client] Sent to ${fragmentForLog(e)}`);
      resolve();
    });
  });
}
//@ chunk-66jn0ssz.js:17236-17437 placement
function probeSocket(sock) {
  return new Promise((resolve) => {
    if (!isValidPipeOrPath(sock)) {
      resolve(false);
      return;
    }
    let r = connect({
      path: sock,
    });
    let s = (d) => {
      r.destroy();
      resolve(d);
    };
    r.on("connect", () => s(true));
    r.on("error", (d) => s(getErrnoCode(d) === "EBUSY"));
    r.setTimeout(250, () => s(false));
  });
}
//@ chunk-66jn0ssz.js:17437-17582 placement
class SessionRecordsUnreadableError extends Error {
  code;
  constructor(code) {
    super("session records directory unreadable");
    this.code = code;
    this.name = "SessionRecordsUnreadableError";
  }
}
//@ chunk-66jn0ssz.js:17582-17868 placement
async function listSessionRecords(e) {
  if (isDiskless()) return [];
  let sessionsDir = getSessionsDir();
  let r;
  try {
    r = await readdir(sessionsDir);
  } catch (error) {
    if (e?.rejectUnreadable && !isENOENT(error)) throw new SessionRecordsUnreadableError(getErrnoCode(error));
    return [];
  }
  return (
    await Promise.all(
      r
        .filter((d) => /^\d+\.json$/.test(d))
        .map((d) =>
          readSessionRecord(sessionsDir, d, {
            rejectTornLiveRecord: e?.rejectTornLiveRecord,
          }),
        ),
    )
  ).filter((d) => d !== null);
}
//@ chunk-66jn0ssz.js:17868-20091 placement
/**
 * 读取并校验一个会话记录（规范路径、pid 存活、令牌），不合格时清理。
 */
async function readSessionRecord(sessionsDir, n, r) {
  let s = false;
  let d;
  let m = join(sessionsDir, n);
  try {
    let sessionRecordName = parseSessionRecordName(n);
    if (sessionRecordName === null) return null;
    let { pid } = sessionRecordName;
    if (!sessionRecordName.canonical) {
      unlink(m).catch(() => {});
      return null;
    }
    d = pid;
    let smallFileOrNull = await readSmallFileOrNull(m, MAX_SESSION_RECORD_BYTES);
    if (smallFileOrNull === null) return null;
    s = true;
    let o = jsonParse(smallFileOrNull);
    let c = normalizeSessionRecord(o);
    return {
      sock: typeof o.messagingSocketPath === "string" ? o.messagingSocketPath : "",
      cwd: c.cwd,
      startedAt: c.startedAt,
      ...(saneEpochMsOrUndefined(o.nameSince) !== undefined && {
        nameSince: saneEpochMsOrUndefined(o.nameSince),
      }),
      procStart: c.procStart,
      ...(c.procStartFt !== undefined && {
        procStartFt: c.procStartFt,
      }),
      name: typeof o.name === "string" ? o.name : undefined,
      nameSource:
        o.nameSource === "user" ||
        o.nameSource === "peer" ||
        o.nameSource === "derived" ||
        o.nameSource === "collision" ||
        o.nameSource === "auto" ||
        o.nameSource === "hook"
          ? o.nameSource
          : undefined,
      formerNames: sanitizeFormerNames(o.formerNames),
      kind: c.kind,
      sessionId: c.sessionId,
      jobId: typeof o.jobId === "string" ? o.jobId : undefined,
      parkedJobId: typeof o.parkedJobId === "string" ? o.parkedJobId : undefined,
      spare: o.spare === true,
      bridgeSessionId: typeof o.bridgeSessionId === "string" ? o.bridgeSessionId : undefined,
      logPath: typeof o.logPath === "string" ? o.logPath : undefined,
      status: c.status,
      waitingFor: typeof o.waitingFor === "string" ? o.waitingFor : undefined,
      ...{},
      updatedAt: saneEpochMsOrUndefined(o.updatedAt),
      statusUpdatedAt: saneEpochMsOrUndefined(o.statusUpdatedAt),
      entrypoint: c.entrypoint,
      ...(isValidLocalTaskId(o.hostSessionId) !== undefined && {
        hostSessionId: isValidLocalTaskId(o.hostSessionId),
      }),
      ...(c.pidDomain !== undefined && {
        pidDomain: c.pidDomain,
      }),
      agent: typeof o.agent === "string" ? o.agent : undefined,
      state: typeof o.state === "string" ? o.state : undefined,
      detail: typeof o.detail === "string" ? o.detail : undefined,
      tempo: o.tempo === "active" || o.tempo === "idle" || o.tempo === "blocked" ? o.tempo : undefined,
      needs: typeof o.needs === "string" ? o.needs : undefined,
      peerProtocol: typeof o.peerProtocol === "number" ? o.peerProtocol : undefined,
      ...(Array.isArray(o.peerFeatures) && {
        peerFeatures: sanitizePeerFeatures(o.peerFeatures),
      }),
      ...{},
      ...((typeof o.asksForConvertedSkills === "boolean" || o.asksForConvertedSkills === null) && {
        asksForConvertedSkills: o.asksForConvertedSkills,
      }),
      tmux: typeof o.tmux === "string" ? o.tmux : undefined,
      pid,
      file: m,
    };
  } catch {
    if (r?.rejectTornLiveRecord && s && d !== undefined && isProcessRunning(d)) {
      if (!r.isReread) {
        await sleep(MAX_PEER_NOTICE_LENGTH);
        return readSessionRecord(sessionsDir, n, {
          ...r,
          isReread: true,
        });
      }
      let [g, processCreationTimeMs] = await Promise.all([
        stat(m).then(
          (a) => a.mtimeMs,
          () => {
            return;
          },
        ),
        getProcessCreationTimeMsAsync(d),
      ]);
      if (g !== undefined && processCreationTimeMs !== null && processCreationTimeMs > g + 2000) return null;
      if (processCreationTimeMs === null && !isProcessRunning(d)) return null;
      throw new SessionRecordsUnreadableError("EBADRECORD");
    }
    return null;
  }
}
//@ chunk-66jn0ssz.js:20091-20152 placement
function isOtherPidDomain(e, n) {
  return e.pidDomain !== undefined && e.pidDomain !== n;
}
//@ chunk-66jn0ssz.js:20152-20237 placement
async function isHeldInAnotherPidDomain(e, n) {
  let r = await ownPidDomain();
  return e.some((s) => s.sessionId === n && isOtherPidDomain(s, r));
}
//@ chunk-66jn0ssz.js:20237-20321 placement
async function listRegisteredSessionRecords() {
  return (
    await listSessionRecords({
      rejectUnreadable: true,
    })
  ).map(({ file, ...n }) => n);
}
//@ chunk-66jn0ssz.js:20321-20531 placement
async function firstLiveSessionMatching(e) {
  let n = await listSessionRecords({
    rejectUnreadable: true,
    rejectTornLiveRecord: true,
  });
  let r = await ownPidDomain();
  for (let { file, ...d } of n)
    if (
      e(d) &&
      (isOtherPidDomain(d, r) ||
        (isProcessRunning(d.pid) && (await isSameProcessAsync(d.pid, d.procStartFt ?? d.procStart))))
    )
      return d;
  return;
}
//@ chunk-66jn0ssz.js:20531-20724 placement
function removeSessionRecord(file, pid, r, s) {
  if (isStorageV5Enabled() && s !== undefined) {
    s.delete(STORAGE_SPACES.session(basename(file)))
      .then((d) => (d.ok && d.value.existed ? reapKeysOfReapedRecord(dirname(file), pid, r, s) : undefined))
      .catch(() => {});
    return;
  }
  unlink(file)
    .then(() => reapKeysOfReapedRecord(dirname(file), pid, r, s))
    .catch(() => {});
}
//@ chunk-66jn0ssz.js:20724-21200 placement
async function listAllLiveSessions(e, n) {
  let r = await listSessionRecords({
    rejectUnreadable: n?.rejectUnreadable === true,
    rejectTornLiveRecord: n?.rejectUnreadable === true,
  });
  let s = n?.rejectUnreadable === true ? await ownPidDomain() : undefined;
  let d = (c) => s !== undefined && isOtherPidDomain(c, s);
  let mapped = r.map((c) => d(c) || isProcessRunning(c.pid));
  let results = await Promise.all(
    r.map((c, R) => mapped[R] && (d(c) || isSameProcessAsync(c.pid, c.procStartFt ?? c.procStart))),
  );
  let l = await isRegistrySweepPermitted();
  let a = l ? await ownPidDomain() : "";
  let o = [];
  for (let idx = 0; idx < r.length; idx++) {
    let { file, ...w } = r[idx];
    if (results[idx]) o.push(w);
    else if (l && mayReapRecordFromThisDomain(w, a) && isProcessProvablyGone(w.pid))
      removeSessionRecord(file, w.pid, a, e);
  }
  return o;
}
//@ chunk-66jn0ssz.js:21200-21254 placement
function ownMessagingSocket() {
  return udsEnv.CLAUDE_CODE_MESSAGING_SOCKET;
}
//@ chunk-66jn0ssz.js:21254-21528 placement
async function isOwnEndpointShadowed() {
  let e = ownMessagingSocket();
  if (e === undefined) return false;
  let n = await listSessionRecords();
  let r = await ownPidDomain();
  let filtered = n.filter(
    (m) =>
      m.sock &&
      m.pid !== process.pid &&
      !isSpareOrParked(m) &&
      isNotStableAddress({
        sock: m.sock,
      }) &&
      mayBeSamePath(m.sock, e),
  );
  return (
    await Promise.all(
      filtered.map(
        async (m) => (await classifyRecordLiveness(m, r)) === "present" && (await probeSocket(m.sock)),
      ),
    )
  ).some(Boolean);
}
//@ chunk-66jn0ssz.js:21528-21788 placement
async function classifyRecordLiveness(e, n) {
  if (e.pidDomain !== n) return "present";
  if (isProcessProvablyGone(e.pid)) return "gone";
  let r = e.procStartFt ?? e.procStart;
  if (r === undefined) return "present";
  let processStartTime = await getProcessStartTimeAsync(e.pid);
  if (processStartTime === undefined || startTokensEqualOrCrossFormat(r, processStartTime)) return "present";
  return (await provenSameProcessAsync(e.pid, r)) === false ? "recycled" : "present";
}
//@ chunk-66jn0ssz.js:21788-22256 placement
async function listLivePeerSessions(e) {
  let n = ownMessagingSocket();
  let filtered = (
    await listSessionRecords({
      rejectUnreadable: true,
    })
  ).filter((a) => a.sock && !(n && isSamePath(a.sock, n)) && !isSpareOrParked(a));
  let [s, d] = await Promise.all([isRegistrySweepPermitted(), ownPidDomain()]);
  let [m, g] = await Promise.all([
    Promise.all(filtered.map((a) => probeSocket(a.sock))),
    Promise.all(filtered.map((a) => classifyRecordLiveness(a, d))),
  ]);
  let l = [];
  for (let idx = 0; idx < filtered.length; idx++) {
    let { file, ...c } = filtered[idx];
    if (g[idx] === "gone") {
      if (s && isProcessProvablyGone(c.pid)) removeSessionRecord(file, c.pid, d, e);
    } else if (g[idx] === "recycled") continue;
    else if (m[idx]) l.push(c);
    else if (s && mayReapRecordFromThisDomain(c, d) && isProcessProvablyGone(c.pid))
      removeSessionRecord(file, c.pid, d, e);
  }
  return l;
}
//@ chunk-66jn0ssz.js:22256-22691 placement
async function findLivePeerBySessionId(e) {
  let n = ownMessagingSocket();
  let r = await listSessionRecords();
  let s = (o) => Boolean(o.sock) && !(n && isSamePath(o.sock, n));
  let d = new Set(
    r.filter((o) => o.sessionId === e && o.parkedJobId !== undefined).map((o) => o.parkedJobId),
  );
  let filtered = r.filter((o) => s(o) && !isSpareOrParked(o));
  let filtered_2 = filtered.filter((o) => o.sessionId === e);
  let filtered_3 = filtered.filter((o) => o.sessionId !== e && o.jobId !== undefined && d.has(o.jobId));
  let a = await ownPidDomain();
  for (let o of filtered_2.concat(filtered_3)) {
    let { file, ...R } = o;
    if ((await classifyRecordLiveness(R, a)) === "present" && (await probeSocket(R.sock))) return R;
  }
  return null;
}
//@ chunk-66jn0ssz.js:22691-22750 placement
function isSpareOrParked(e) {
  return e.spare === true || e.parkedJobId !== undefined;
}
//@ chunk-66jn0ssz.js:22750-22831 placement
function sanitizePeerFeatures(peerFeatures) {
  return stringArray(peerFeatures)
    .filter((n) => /^[a-z0-9_]{1,32}$/.test(n))
    .slice(0, 16);
}
export {
  admitReceiptForOutstandingSend,
  admitDroppedIdsByDestination,
  debitPacerForReleasedSend,
  creditPacerForHeldSend,
  registeredLivePeerForSocket,
  sendControlToUdsSocket,
  registeredInboxesOfPids,
  findLivePeerBySessionId,
  listRegisteredSessionRecords,
  ownMessagingSocket,
  sendStampedControlToUdsSocket,
  listLivePeerSessions,
  SessionRecordsUnreadableError,
  isOwnEndpointShadowed,
  listAllLiveSessions,
  sendToUdsSocket,
  firstLiveSessionMatching,
};

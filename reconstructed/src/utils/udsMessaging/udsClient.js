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
import { ci } from "../swarm/hostState.js";
import {
  parseAddress,
  isValidPipeOrPath,
  parseNamedPipeName,
  mayBeSamePath,
  isSamePath,
} from "../peerAddress.js";
import { canonicalSocketPath } from "../udsPaths.js";
import { u8, hIt, extendHopChain } from "../peerMessageHeaders.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import {
  ownDesktopHostSessionId,
  getSessionsDir,
  reapKeysOfReapedRecord,
  isRegistrySweepPermitted,
  mayReapRecordFromThisDomain,
} from "../concurrentSessions.js";
import { lst } from "../randomId.js";
import { createMessageEnvelope } from "./messageEnvelope.js";
import { getPlatform } from "../platform.js";
import {
  isPacingEnabled,
  Ke,
  We,
  jy,
  describeSenderPaced,
  isExpectedSendError,
  ywn,
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
import { PAi, classifySessionAddress, cds, cdt } from "../sessionAddresses.js";
import { isProcessRunning } from "../genericProcessUtils.js";
import { Ohr, Mhr } from "../sessionPeers.js";
import { isENOENT, getErrnoCode } from "../errors.js";
import { isDiskless } from "../../bootstrap/state.js";
import {
  parseSessionRecordName,
  MAX_SESSION_RECORD_BYTES,
  normalizeSessionRecord,
  lPn,
} from "../sessionRecords.js";
import { readSmallFileOrNull } from "../readSmallFile.js";
import { Igr } from "../../services/analytics/metadata.js";
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
  let pacer = ci().outbound.pacer;
  if (!pacer) return;
  let { scheme: scheme, target: target } = parseAddress(e);
  if (scheme !== "uds") return;
  n(pacer, canonicalSocketPath(target) ?? target);
}
//@ chunk-66jn0ssz.js:11482-12398 placement
async function sendToUdsSocket(
  e,
  n,
  r,
  s,
  d,
  m,
  g,
  { trackReceipts: l = !0, expectPeerPid: a, expectPeerProcStart: o, fromPlugin: c, recipientName: R } = {},
) {
  let w = ownMessagingSocket(),
    S = w ? u8(w) : void 0,
    P = getFeatureValue_CACHED_MAY_BE_STALE("tengu_tidy_fern", !0) ? ownDesktopHostSessionId() : void 0,
    b = hIt(S, s, n, P, extendHopChain(m, S ? lst(S) : void 0), g),
    h = createMessageEnvelope(),
    y = {
      ...h,
      type: "user",
      message: { role: "user", content: b },
      priority: "next",
      from: S,
      ...(c !== void 0 && { from_plugin: c }),
      ...((d?.length ?? 0) > 0 && { file_attachments: d }),
    },
    x = _e(y),
    L =
      (S !== void 0 || getPlatform() !== "windows") && isPacingEnabled()
        ? Ke().reserve(canonicalSocketPath(e) ?? e)
        : We;
  if (!L.ok)
    throw (
      logForDebugging(
        `[uds-client] paced: not sending to ${jy(e)} \u2014 ${L.sentInBurst} sent this burst; its inbox rate limit would drop more`,
      ),
      describeSenderPaced(L.sentInBurst)
    );
  if ((logForDebugging(`[uds-client] Sending ${n.length} chars to ${jy(e)}`), l))
    trackOutstandingSend(h.msg_id, u8(e), R);
  try {
    await connectToInbox(e, y, r, {
      noFollowSymlink: !0,
      preflightedJson: x,
      ...(a !== void 0 && { expectPeerPid: a }),
      ...(o !== void 0 && { expectPeerProcStart: o }),
    });
  } catch (error) {
    if (isExpectedSendError(error)) {
      if ((L.refund(), l)) untrackOutstandingSend(h.msg_id);
    }
    throw error;
  }
  return { msgId: h.msg_id };
}
//@ chunk-66jn0ssz.js:12398-12409 placement
var we = 200;
//@ chunk-66jn0ssz.js:12409-12544 placement
function trackOutstandingSend(e, n, r) {
  let outstandingSends = ci().receipts.outstandingSends;
  if (outstandingSends.length >= we) outstandingSends.shift();
  outstandingSends.push({ msgId: e, to: n, handle: sanitizeTeammateLabel(r ?? "", 1 / 0) || void 0 });
}
//@ chunk-66jn0ssz.js:12544-12652 placement
function untrackOutstandingSend(e) {
  let outstandingSends = ci().receipts.outstandingSends,
    index = outstandingSends.findIndex((s) => s.msgId === e);
  if (index !== -1) outstandingSends.splice(index, 1);
}
//@ chunk-66jn0ssz.js:12652-13034 placement
function admitReceiptForOutstandingSend(e, n) {
  if (typeof e !== "string") return;
  let { outstandingSends: outstandingSends, awaitingTerminal: awaitingTerminal } = ci().receipts,
    index = outstandingSends.findIndex((g) => g.msgId === e);
  if (index !== -1) {
    let [g] = outstandingSends.splice(index, 1);
    if (!g) return;
    if (n === "held") {
      if (awaitingTerminal.length >= we) awaitingTerminal.shift();
      awaitingTerminal.push(g);
    }
    return { sent: g, wasHeld: !1 };
  }
  let index_2 = awaitingTerminal.findIndex((g) => g.msgId === e);
  if (index_2 !== -1 && n !== "held") {
    let [g] = awaitingTerminal.splice(index_2, 1);
    return g ? { sent: g, wasHeld: !0 } : void 0;
  }
  return;
}
//@ chunk-66jn0ssz.js:13034-13371 placement
function admitDroppedIdsByDestination(e) {
  let n = new Map();
  if (e.length === 0) return n;
  let r = new Set(e),
    { outstandingSends: outstandingSends, awaitingTerminal: awaitingTerminal } = ci().receipts;
  for (let m of [outstandingSends, awaitingTerminal]) {
    let g = m === awaitingTerminal;
    for (let l = 0; l < m.length;) {
      let a = m[l];
      if (r.delete(a.msgId)) {
        m.splice(l, 1);
        let o = n.get(a.to) ?? { sends: [], wereHeld: 0 };
        if ((o.sends.push(a), g)) o.wereHeld++;
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
  return (
    logForDebugging(`[uds-client] Sending control:${n.action} to ${jy(e)}`),
    await connectToInbox(e, { type: "control", ...n, ...r }, m, {
      noFollowSymlink: !0,
      ...(s !== void 0 && { expectPeerPid: s }),
      ...(d !== void 0 && { expectPeerProcStart: d }),
    }),
    { msgId: r.msg_id }
  );
}
//@ chunk-66jn0ssz.js:13732-13743 placement
var Ve = 150;
//@ chunk-66jn0ssz.js:13743-13980 placement
async function registeredLivePeerForSocket(e) {
  let n = canonicalSocketPath(e);
  if (n === void 0) return;
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
  let n = uniq(e),
    r = new Map();
  if (n.length === 0) return r;
  let s = getSessionsDir(),
    filtered = (await Promise.all(n.map((l) => readSessionRecord(s, `${l}.json`)))).filter(
      (l) => l !== null && Boolean(l.sock),
    ),
    results = await Promise.all(filtered.map((l) => isSameLiveProcess(l)));
  return (
    filtered.forEach((l, a) => {
      if (results[a] && l.sock) r.set(l.pid, l.sock);
    }),
    r
  );
}
//@ chunk-66jn0ssz.js:14254-14373 placement
async function liveStatusOfJob(e, n) {
  let r = await readSessionRecord(getSessionsDir(), `${e}.json`, { rejectTornLiveRecord: !0 });
  return r?.jobId === n ? r.status : void 0;
}
//@ chunk-66jn0ssz.js:14373-14490 placement
async function isSameLiveProcess(e) {
  let n = e.procStartFt ?? e.procStart;
  if (n === void 0 || isProcessProvablyGone(e.pid)) return !1;
  return (await provenSameProcessAsync(e.pid, n)) === !0;
}
//@ chunk-66jn0ssz.js:14490-14567 placement
function _e(e) {
  let n = jsonStringify(e),
    r = PAi + n.length + 1;
  if (r > ywn) throw describeMessageTooLarge(r, ywn);
  return n;
}
//@ chunk-66jn0ssz.js:14567-14810 placement
async function isSocketOwnerAlive(e) {
  let n = canonicalSocketPath(e);
  if (n === void 0) return !1;
  for (let r of await listSessionRecords()) {
    if (!r.sock || canonicalSocketPath(r.sock) !== n) continue;
    if (isProcessProvablyGone(r.pid)) continue;
    if ((r.procStartFt ?? r.procStart) !== void 0) {
      if (await isSameLiveProcess(r)) return !0;
      continue;
    }
    if (isProcessRunning(r.pid)) return !0;
  }
  return !1;
}
/**
 * 连接对端收件箱：拒绝非本机 IPC 路径、未登记/不可审查的回复目标与符号链接（约 2.4 KB）。
 */
//@ chunk-66jn0ssz.js:14810-17236 placement
async function connectToInbox(
  e,
  n,
  r,
  { noFollowSymlink: s = !1, expectPeerPid: d, expectPeerProcStart: m, preflightedJson: g } = {},
) {
  let l = g ?? _e(n);
  if (!isValidPipeOrPath(e))
    throw new UdsSendRefusedError(
      "non-local",
      `Refusing to connect: not a usable local IPC path (remote/UNC host, or a pipe name with extra segments or a trailing dot/space): ${e}`,
    );
  let a = Ohr(),
    o = await classifySessionAddress(e, r, { requireLiveOwner: a }),
    c = o.kind === "token" ? o.token : void 0;
  if (a && o.kind !== "token") {
    if (!(o.kind === "no-key" && (await isSocketOwnerAlive(e))))
      throw new NoLiveInboxError(
        o.kind,
        `No running session has registered an inbox at ${e} (${ENOINBOX}: ${o.kind}) \u2014 refusing to send to an unvouched pipe`,
      );
    c = void 0;
  }
  let R = c !== void 0 ? cds(c) : "";
  if (s && !(getPlatform() === "windows" && parseNamedPipeName(e) !== void 0)) {
    let S;
    try {
      S = (await lstat(e)).isSymbolicLink();
    } catch (error) {
      if (isENOENT(error)) throw error;
      throw (
        logForDebugging(`[uds-client] reply target unvettable: ${getErrnoCode(error) ?? "lstat failed"}`),
        new UdsSendRefusedError("unvettable", "Refusing to send: cannot vet reply target")
      );
    }
    if (S) throw new UdsSendRefusedError("symlink", "Refusing to send: reply target is a symlink");
  }
  let w =
    R +
    l +
    `
`;
  return new Promise((S, P) => {
    let b = connect({ path: e }),
      h = !1;
    (b.setTimeout(5000, () => {
      ((h = !0), b.destroy(), P(Error(`Timed out sending to ${e}`)));
    }),
      b.on("error", (y) => {
        ((h = !0), P(y));
      }),
      b.on("connect", () => {
        if (d !== void 0 && getPlatform() !== "windows") {
          let y = getPeerPid(b);
          if (y === void 0) {
            ((h = !0),
              b.destroy(),
              P(
                new UdsSendRefusedError(
                  "endpoint-unverifiable",
                  "Refusing to send: connected endpoint identity could not be read",
                ),
              ));
            return;
          }
          if (y !== d) {
            ((h = !0),
              b.destroy(),
              logForDebugging(
                `[uds-client] connected endpoint is pid ${y}, expected ${d} \u2014 refusing to write`,
              ),
              P(
                new UdsSendRefusedError(
                  "wrong-endpoint",
                  "Refusing to send: connected endpoint is not the expected process",
                ),
              ));
            return;
          }
          let x = process.getuid?.(),
            A = getPeerUid(b);
          if (x !== void 0 && A === null) {
            ((h = !0),
              b.destroy(),
              P(
                new UdsSendRefusedError(
                  "endpoint-unverifiable",
                  "Refusing to send: connected endpoint owner could not be read",
                ),
              ));
            return;
          }
          if (x !== void 0 && A !== x) {
            ((h = !0),
              b.destroy(),
              logForDebugging(
                `[uds-client] connected endpoint is owned by uid ${A}, not ours \u2014 refusing to write`,
              ),
              P(
                new UdsSendRefusedError(
                  "wrong-endpoint",
                  "Refusing to send: connected endpoint is not owned by this user",
                ),
              ));
            return;
          }
          if (m !== void 0 && getProcessStartTokenLinuxSync(y) !== m) {
            ((h = !0),
              b.destroy(),
              logForDebugging(
                `[uds-client] connected endpoint pid ${y} is not the process that wrote to us (start token differs \u2014 recycled pid) \u2014 refusing to write`,
              ),
              P(
                new UdsSendRefusedError(
                  "wrong-endpoint",
                  "Refusing to send: connected endpoint is a different process with the expected pid",
                ),
              ));
            return;
          }
        }
        if ((b.write(w), getPlatform() === "macos"))
          setTimeout(
            (y) => {
              if (!y.destroyed) y.end();
            },
            Ve,
            b,
          );
        else b.end();
      }),
      b.on("close", () => {
        if (!h) logForDebugging(`[uds-client] Sent to ${jy(e)}`);
        S();
      }));
  });
}
//@ chunk-66jn0ssz.js:17236-17437 placement
function probeSocket(e) {
  return new Promise((n) => {
    if (!isValidPipeOrPath(e)) {
      n(!1);
      return;
    }
    let r = connect({ path: e }),
      s = (d) => {
        (r.destroy(), n(d));
      };
    (r.on("connect", () => s(!0)),
      r.on("error", (d) => s(getErrnoCode(d) === "EBUSY")),
      r.setTimeout(250, () => s(!1)));
  });
}
//@ chunk-66jn0ssz.js:17437-17582 placement
class SessionRecordsUnreadableError extends Error {
  code;
  constructor(e) {
    super("session records directory unreadable");
    this.code = e;
    this.name = "SessionRecordsUnreadableError";
  }
}
//@ chunk-66jn0ssz.js:17582-17868 placement
async function listSessionRecords(e) {
  if (isDiskless()) return [];
  let n = getSessionsDir(),
    r;
  try {
    r = await readdir(n);
  } catch (error) {
    if (e?.rejectUnreadable && !isENOENT(error)) throw new SessionRecordsUnreadableError(getErrnoCode(error));
    return [];
  }
  return (
    await Promise.all(
      r
        .filter((d) => /^\d+\.json$/.test(d))
        .map((d) => readSessionRecord(n, d, { rejectTornLiveRecord: e?.rejectTornLiveRecord })),
    )
  ).filter((d) => d !== null);
}
/**
 * 读取并校验一个会话记录（规范路径、pid 存活、令牌），不合格时清理。
 */
//@ chunk-66jn0ssz.js:17868-20091 placement
async function readSessionRecord(e, n, r) {
  let s = !1,
    d,
    m = join(e, n);
  try {
    let g = parseSessionRecordName(n);
    if (g === null) return null;
    let { pid: pid } = g;
    if (!g.canonical) return (unlink(m).catch(() => {}), null);
    d = pid;
    let a = await readSmallFileOrNull(m, MAX_SESSION_RECORD_BYTES);
    if (a === null) return null;
    s = !0;
    let o = jsonParse(a),
      c = normalizeSessionRecord(o);
    return {
      sock: typeof o.messagingSocketPath === "string" ? o.messagingSocketPath : "",
      cwd: c.cwd,
      startedAt: c.startedAt,
      ...(lPn(o.nameSince) !== void 0 && { nameSince: lPn(o.nameSince) }),
      procStart: c.procStart,
      ...(c.procStartFt !== void 0 && { procStartFt: c.procStartFt }),
      name: typeof o.name === "string" ? o.name : void 0,
      nameSource:
        o.nameSource === "user" ||
        o.nameSource === "peer" ||
        o.nameSource === "derived" ||
        o.nameSource === "collision" ||
        o.nameSource === "auto" ||
        o.nameSource === "hook"
          ? o.nameSource
          : void 0,
      formerNames: sanitizeFormerNames(o.formerNames),
      kind: c.kind,
      sessionId: c.sessionId,
      jobId: typeof o.jobId === "string" ? o.jobId : void 0,
      parkedJobId: typeof o.parkedJobId === "string" ? o.parkedJobId : void 0,
      spare: o.spare === !0,
      bridgeSessionId: typeof o.bridgeSessionId === "string" ? o.bridgeSessionId : void 0,
      logPath: typeof o.logPath === "string" ? o.logPath : void 0,
      status: c.status,
      waitingFor: typeof o.waitingFor === "string" ? o.waitingFor : void 0,
      ...{},
      updatedAt: lPn(o.updatedAt),
      statusUpdatedAt: lPn(o.statusUpdatedAt),
      entrypoint: c.entrypoint,
      ...(Igr(o.hostSessionId) !== void 0 && { hostSessionId: Igr(o.hostSessionId) }),
      ...(c.pidDomain !== void 0 && { pidDomain: c.pidDomain }),
      agent: typeof o.agent === "string" ? o.agent : void 0,
      state: typeof o.state === "string" ? o.state : void 0,
      detail: typeof o.detail === "string" ? o.detail : void 0,
      tempo: o.tempo === "active" || o.tempo === "idle" || o.tempo === "blocked" ? o.tempo : void 0,
      needs: typeof o.needs === "string" ? o.needs : void 0,
      peerProtocol: typeof o.peerProtocol === "number" ? o.peerProtocol : void 0,
      ...(Array.isArray(o.peerFeatures) && { peerFeatures: Ye(o.peerFeatures) }),
      ...{},
      ...((typeof o.asksForConvertedSkills === "boolean" || o.asksForConvertedSkills === null) && {
        asksForConvertedSkills: o.asksForConvertedSkills,
      }),
      tmux: typeof o.tmux === "string" ? o.tmux : void 0,
      pid: pid,
      file: m,
    };
  } catch {
    if (r?.rejectTornLiveRecord && s && d !== void 0 && isProcessRunning(d)) {
      if (!r.isReread) return (await sleep(Mhr), readSessionRecord(e, n, { ...r, isReread: !0 }));
      let [g, l] = await Promise.all([
        stat(m).then(
          (a) => a.mtimeMs,
          () => {
            return;
          },
        ),
        getProcessCreationTimeMsAsync(d),
      ]);
      if (g !== void 0 && l !== null && l > g + 2000) return null;
      if (l === null && !isProcessRunning(d)) return null;
      throw new SessionRecordsUnreadableError("EBADRECORD");
    }
    return null;
  }
}
//@ chunk-66jn0ssz.js:20091-20152 placement
function Z(e, n) {
  return e.pidDomain !== void 0 && e.pidDomain !== n;
}
//@ chunk-66jn0ssz.js:20152-20237 placement
async function isHeldInAnotherPidDomain(e, n) {
  let r = await ownPidDomain();
  return e.some((s) => s.sessionId === n && Z(s, r));
}
//@ chunk-66jn0ssz.js:20237-20321 placement
async function listRegisteredSessionRecords() {
  return (await listSessionRecords({ rejectUnreadable: !0 })).map(({ file: file, ...n }) => n);
}
//@ chunk-66jn0ssz.js:20321-20531 placement
async function firstLiveSessionMatching(e) {
  let n = await listSessionRecords({ rejectUnreadable: !0, rejectTornLiveRecord: !0 }),
    r = await ownPidDomain();
  for (let { file: file, ...d } of n)
    if (
      e(d) &&
      (Z(d, r) ||
        (isProcessRunning(d.pid) && (await isSameProcessAsync(d.pid, d.procStartFt ?? d.procStart))))
    )
      return d;
  return;
}
//@ chunk-66jn0ssz.js:20531-20724 placement
function removeSessionRecord(e, n, r, s) {
  if (isStorageV5Enabled() && s !== void 0) {
    s.delete(STORAGE_SPACES.session(basename(e)))
      .then((d) => (d.ok && d.value.existed ? reapKeysOfReapedRecord(dirname(e), n, r, s) : void 0))
      .catch(() => {});
    return;
  }
  unlink(e)
    .then(() => reapKeysOfReapedRecord(dirname(e), n, r, s))
    .catch(() => {});
}
//@ chunk-66jn0ssz.js:20724-21200 placement
async function listAllLiveSessions(e, n) {
  let r = await listSessionRecords({
      rejectUnreadable: n?.rejectUnreadable === !0,
      rejectTornLiveRecord: n?.rejectUnreadable === !0,
    }),
    s = n?.rejectUnreadable === !0 ? await ownPidDomain() : void 0,
    d = (c) => s !== void 0 && Z(c, s),
    mapped = r.map((c) => d(c) || isProcessRunning(c.pid)),
    results = await Promise.all(
      r.map((c, R) => mapped[R] && (d(c) || isSameProcessAsync(c.pid, c.procStartFt ?? c.procStart))),
    ),
    l = await isRegistrySweepPermitted(),
    a = l ? await ownPidDomain() : "",
    o = [];
  for (let c = 0; c < r.length; c++) {
    let { file: file, ...w } = r[c];
    if (results[c]) o.push(w);
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
  if (e === void 0) return !1;
  let n = await listSessionRecords(),
    r = await ownPidDomain(),
    filtered = n.filter(
      (m) => m.sock && m.pid !== process.pid && !re(m) && cdt({ sock: m.sock }) && mayBeSamePath(m.sock, e),
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
  if (r === void 0) return "present";
  let s = await getProcessStartTimeAsync(e.pid);
  if (s === void 0 || startTokensEqualOrCrossFormat(r, s)) return "present";
  return (await provenSameProcessAsync(e.pid, r)) === !1 ? "recycled" : "present";
}
//@ chunk-66jn0ssz.js:21788-22256 placement
async function listLivePeerSessions(e) {
  let n = ownMessagingSocket(),
    filtered = (await listSessionRecords({ rejectUnreadable: !0 })).filter(
      (a) => a.sock && !(n && isSamePath(a.sock, n)) && !re(a),
    ),
    [s, d] = await Promise.all([isRegistrySweepPermitted(), ownPidDomain()]),
    [m, g] = await Promise.all([
      Promise.all(filtered.map((a) => probeSocket(a.sock))),
      Promise.all(filtered.map((a) => classifyRecordLiveness(a, d))),
    ]),
    l = [];
  for (let a = 0; a < filtered.length; a++) {
    let { file: file, ...c } = filtered[a];
    if (g[a] === "gone") {
      if (s && isProcessProvablyGone(c.pid)) removeSessionRecord(file, c.pid, d, e);
    } else if (g[a] === "recycled") continue;
    else if (m[a]) l.push(c);
    else if (s && mayReapRecordFromThisDomain(c, d) && isProcessProvablyGone(c.pid))
      removeSessionRecord(file, c.pid, d, e);
  }
  return l;
}
//@ chunk-66jn0ssz.js:22256-22691 placement
async function findLivePeerBySessionId(e) {
  let n = ownMessagingSocket(),
    r = await listSessionRecords(),
    s = (o) => Boolean(o.sock) && !(n && isSamePath(o.sock, n)),
    d = new Set(r.filter((o) => o.sessionId === e && o.parkedJobId !== void 0).map((o) => o.parkedJobId)),
    filtered = r.filter((o) => s(o) && !re(o)),
    filtered_2 = filtered.filter((o) => o.sessionId === e),
    filtered_3 = filtered.filter((o) => o.sessionId !== e && o.jobId !== void 0 && d.has(o.jobId)),
    a = await ownPidDomain();
  for (let o of filtered_2.concat(filtered_3)) {
    let { file: file, ...R } = o;
    if ((await classifyRecordLiveness(R, a)) === "present" && (await probeSocket(R.sock))) return R;
  }
  return null;
}
//@ chunk-66jn0ssz.js:22691-22750 placement
function re(e) {
  return e.spare === !0 || e.parkedJobId !== void 0;
}
//@ chunk-66jn0ssz.js:22750-22831 placement
function Ye(e) {
  return stringArray(e)
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

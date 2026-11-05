/**
 * utils/udsMessaging/udsClient.ts
 *
 * 跨会话消息（UDS/命名管道）客户端：向其他会话收件箱发送消息与控制、节流计数、列出存活会话与对等方
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-gh96j5t0.js (36)
 * attribution: placement 36
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
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
import { stringArray } from "../collections.js";

//@ chunk-gh96j5t0.js:11279-11320 placement
function creditPacerForHeldSend(a) {
  withOutboundPacer(a, (b, c) => b.credit(c));
}
//@ chunk-gh96j5t0.js:11320-11360 placement
function debitPacerForReleasedSend(a) {
  withOutboundPacer(a, (b, c) => b.debit(c));
}
//@ chunk-gh96j5t0.js:11360-11479 placement
function withOutboundPacer(messageId, handle) {
  let pacer = swarmHostState().outbound.pacer;
  if (!pacer) return;
  let { scheme, target } = parseAddress(messageId);
  if (scheme !== "uds") return;
  handle(pacer, canonicalSocketPath(target) ?? target);
}
//@ chunk-gh96j5t0.js:11479-12395 placement
async function sendToUdsSocket(
  sock,
  body,
  storageV5,
  fromName,
  attachments,
  hopChain,
  fromMode,
  { trackReceipts = true, expectPeerPid, expectPeerProcStart, fromPlugin, recipientName } = {},
) {
  let ownSocket = ownMessagingSocket();
  let ownAddress = ownSocket ? udsAddressFromPath(ownSocket) : undefined;
  let desktopHostSessionId = getFeatureValue_CACHED_MAY_BE_STALE("tengu_tidy_fern", true)
    ? ownDesktopHostSessionId()
    : undefined;
  let content = wrapPeerMessage(
    ownAddress,
    fromName,
    body,
    desktopHostSessionId,
    extendHopChain(hopChain, ownAddress ? hmacRandomId(ownAddress) : undefined),
    fromMode,
  );
  let messageEnvelope = createMessageEnvelope();
  let payload = {
    ...messageEnvelope,
    type: "user",
    message: {
      role: "user",
      content,
    },
    priority: "next",
    from: ownAddress,
    ...(fromPlugin !== undefined && {
      from_plugin: fromPlugin,
    }),
    ...((attachments?.length ?? 0) > 0 && {
      file_attachments: attachments,
    }),
  };
  let preflightedJson = serializePeerPayload(payload);
  let reservation =
    (ownAddress !== undefined || getPlatform() !== "windows") && isPacingEnabled()
      ? outboundPacer().reserve(canonicalSocketPath(sock) ?? sock)
      : PACER_PASSED;
  if (!reservation.ok) {
    logForDebugging(
      `[uds-client] paced: not sending to ${fragmentForLog(sock)} \u2014 ${reservation.sentInBurst} sent this burst; its inbox rate limit would drop more`,
    );
    throw describeSenderPaced(reservation.sentInBurst);
  }
  logForDebugging(`[uds-client] Sending ${body.length} chars to ${fragmentForLog(sock)}`);
  if (trackReceipts) trackOutstandingSend(messageEnvelope.msg_id, udsAddressFromPath(sock), recipientName);
  try {
    await connectToInbox(sock, payload, storageV5, {
      noFollowSymlink: true,
      preflightedJson,
      ...(expectPeerPid !== undefined && {
        expectPeerPid,
      }),
      ...(expectPeerProcStart !== undefined && {
        expectPeerProcStart,
      }),
    });
  } catch (error) {
    if (isExpectedSendError(error)) {
      reservation.refund();
      if (trackReceipts) untrackOutstandingSend(messageEnvelope.msg_id);
    }
    throw error;
  }
  return {
    msgId: messageEnvelope.msg_id,
  };
}
//@ chunk-gh96j5t0.js:12395-12406 placement
var MAX_OUTSTANDING_SENDS = 200;
//@ chunk-gh96j5t0.js:12406-12541 placement
function trackOutstandingSend(msgId, to, options) {
  let outstandingSends = swarmHostState().receipts.outstandingSends;
  if (outstandingSends.length >= MAX_OUTSTANDING_SENDS) outstandingSends.shift();
  outstandingSends.push({
    msgId,
    to,
    handle: sanitizeTeammateLabel(options ?? "", 1 / 0) || undefined,
  });
}
//@ chunk-gh96j5t0.js:12541-12649 placement
function untrackOutstandingSend(msgId) {
  let outstandingSends = swarmHostState().receipts.outstandingSends;
  let index = outstandingSends.findIndex((outstandingSend) => outstandingSend.msgId === msgId);
  if (index !== -1) outstandingSends.splice(index, 1);
}
//@ chunk-gh96j5t0.js:12649-13031 placement
function admitReceiptForOutstandingSend(origMsgId, status) {
  if (typeof origMsgId !== "string") return;
  let { outstandingSends, awaitingTerminal } = swarmHostState().receipts;
  let index = outstandingSends.findIndex((outstandingSend) => outstandingSend.msgId === origMsgId);
  if (index !== -1) {
    let [outstandingSend] = outstandingSends.splice(index, 1);
    if (!outstandingSend) return;
    if (status === "held") {
      if (awaitingTerminal.length >= MAX_OUTSTANDING_SENDS) awaitingTerminal.shift();
      awaitingTerminal.push(outstandingSend);
    }
    return {
      sent: outstandingSend,
      wasHeld: false,
    };
  }
  let index_2 = awaitingTerminal.findIndex((awaitingSend) => awaitingSend.msgId === origMsgId);
  if (index_2 !== -1 && status !== "held") {
    let [awaitingSend] = awaitingTerminal.splice(index_2, 1);
    return awaitingSend
      ? {
          sent: awaitingSend,
          wasHeld: true,
        }
      : undefined;
  }
  return;
}
//@ chunk-gh96j5t0.js:13031-13368 placement
function admitDroppedIdsByDestination(entries) {
  let byDest = new Map();
  if (entries.length === 0) return byDest;
  let remainingIds = new Set(entries);
  let { outstandingSends, awaitingTerminal } = swarmHostState().receipts;
  for (let queue of [outstandingSends, awaitingTerminal]) {
    let isAwaitingTerminal = queue === awaitingTerminal;
    for (let index = 0; index < queue.length;) {
      let send = queue[index];
      if (remainingIds.delete(send.msgId)) {
        queue.splice(index, 1);
        let destinationEntry = byDest.get(send.to) ?? {
          sends: [],
          wereHeld: 0,
        };
        destinationEntry.sends.push(send);
        if (isAwaitingTerminal) destinationEntry.wereHeld++;
        byDest.set(send.to, destinationEntry);
      } else index++;
    }
  }
  return byDest;
}
//@ chunk-gh96j5t0.js:13368-13427 placement
function sendControlToUdsSocket(a, b, options = {}) {
  return sendStampedControlToUdsSocket(a, b, createMessageEnvelope(), options).then(() => {});
}
//@ chunk-gh96j5t0.js:13427-13729 placement
async function sendStampedControlToUdsSocket(
  a,
  b,
  envelope = createMessageEnvelope(),
  { expectPeerPid, expectPeerProcStart, storageV5 } = {},
) {
  logForDebugging(`[uds-client] Sending control:${b.action} to ${fragmentForLog(a)}`);
  await connectToInbox(
    a,
    {
      type: "control",
      ...b,
      ...envelope,
    },
    storageV5,
    {
      noFollowSymlink: true,
      ...(expectPeerPid !== undefined && {
        expectPeerPid,
      }),
      ...(expectPeerProcStart !== undefined && {
        expectPeerProcStart,
      }),
    },
  );
  return {
    msgId: envelope.msg_id,
  };
}
//@ chunk-gh96j5t0.js:13729-13740 placement
var CONNECT_CONCURRENCY = 150;
//@ chunk-gh96j5t0.js:13740-13977 placement
async function registeredLivePeerForSocket(sock) {
  let path = canonicalSocketPath(sock);
  if (path === undefined) return;
  for (let record of await listSessionRecords()) {
    if (!record.sock || canonicalSocketPath(record.sock) !== path) continue;
    if (await isSameLiveProcess(record))
      return {
        pid: record.pid,
        features: record.peerFeatures,
        sessionId: record.sessionId,
        procStart: record.procStartFt ?? record.procStart,
      };
  }
  return;
}
//@ chunk-gh96j5t0.js:13977-14251 placement
async function registeredInboxesOfPids(pids) {
  let uniquePids = normalizeCaseForComparison_2(pids);
  let inboxByPid = new Map();
  if (uniquePids.length === 0) return inboxByPid;
  let sessionsDir = getSessionsDir();
  let filtered = (
    await Promise.all(uniquePids.map((pid) => readSessionRecord(sessionsDir, `${pid}.json`)))
  ).filter((record) => record !== null && Boolean(record.sock));
  let results = await Promise.all(filtered.map((record) => isSameLiveProcess(record)));
  filtered.forEach((record, index) => {
    if (results[index] && record.sock) inboxByPid.set(record.pid, record.sock);
  });
  return inboxByPid;
}
//@ chunk-gh96j5t0.js:14251-14370 placement
async function liveStatusOfJob(jobId, expectedJobId) {
  let sessionRecord = await readSessionRecord(getSessionsDir(), `${jobId}.json`, {
    rejectTornLiveRecord: true,
  });
  return sessionRecord?.jobId === expectedJobId ? sessionRecord.status : undefined;
}
//@ chunk-gh96j5t0.js:14370-14487 placement
async function isSameLiveProcess(record) {
  let procStart = record.procStartFt ?? record.procStart;
  if (procStart === undefined || isProcessProvablyGone(record.pid)) return false;
  return (await provenSameProcessAsync(record.pid, procStart)) === true;
}
//@ chunk-gh96j5t0.js:14487-14564 placement
function serializePeerPayload(payload) {
  let json = jsonStringify(payload);
  let totalBytes = AUTH_HANDSHAKE_LENGTH + json.length + 1;
  if (totalBytes > MAX_PEER_MESSAGE_BYTES) throw describeMessageTooLarge(totalBytes, MAX_PEER_MESSAGE_BYTES);
  return json;
}
//@ chunk-gh96j5t0.js:14564-14807 placement
async function isSocketOwnerAlive(sock) {
  let path = canonicalSocketPath(sock);
  if (path === undefined) return false;
  for (let record of await listSessionRecords()) {
    if (!record.sock || canonicalSocketPath(record.sock) !== path) continue;
    if (isProcessProvablyGone(record.pid)) continue;
    if ((record.procStartFt ?? record.procStart) !== undefined) {
      if (await isSameLiveProcess(record)) return true;
      continue;
    }
    if (isProcessRunning(record.pid)) return true;
  }
  return false;
}
//@ chunk-gh96j5t0.js:14807-17233 placement
/**
 * 连接对端收件箱：拒绝非本机 IPC 路径、未登记/不可审查的回复目标与符号链接（约 2.4 KB）。
 */
async function connectToInbox(
  sock,
  payload,
  storageV5,
  { noFollowSymlink = false, expectPeerPid, expectPeerProcStart, preflightedJson } = {},
) {
  let json = preflightedJson ?? serializePeerPayload(payload);
  if (!isValidPipeOrPath(sock))
    throw new UdsSendRefusedError(
      "non-local",
      `Refusing to connect: not a usable local IPC path (remote/UNC host, or a pipe name with extra segments or a trailing dot/space): ${sock}`,
    );
  let isWindows = isWindowsPlatform();
  let address = await classifySessionAddress(sock, storageV5, {
    requireLiveOwner: isWindows,
  });
  let token = address.kind === "token" ? address.token : undefined;
  if (isWindows && address.kind !== "token") {
    if (!(address.kind === "no-key" && (await isSocketOwnerAlive(sock))))
      throw new NoLiveInboxError(
        address.kind,
        `No running session has registered an inbox at ${sock} (${ENOINBOX}: ${address.kind}) \u2014 refusing to send to an unvouched pipe`,
      );
    token = undefined;
  }
  let authLine = token !== undefined ? authHandshakeJson(token) : "";
  if (noFollowSymlink && !(getPlatform() === "windows" && parseNamedPipeName(sock) !== undefined)) {
    let isSymlink;
    try {
      isSymlink = (await lstat(sock)).isSymbolicLink();
    } catch (error) {
      if (isENOENT(error)) throw error;
      logForDebugging(`[uds-client] reply target unvettable: ${getErrnoCode(error) ?? "lstat failed"}`);
      throw new UdsSendRefusedError("unvettable", "Refusing to send: cannot vet reply target");
    }
    if (isSymlink) throw new UdsSendRefusedError("symlink", "Refusing to send: reply target is a symlink");
  }
  let payload_2 =
    authLine +
    json +
    `
`;
  return new Promise((resolve, reject) => {
    let connection = connect({
      path: sock,
    });
    let settled = false;
    connection.setTimeout(5000, () => {
      settled = true;
      connection.destroy();
      reject(Error(`Timed out sending to ${sock}`));
    });
    connection.on("error", (error) => {
      settled = true;
      reject(error);
    });
    connection.on("connect", () => {
      if (expectPeerPid !== undefined && getPlatform() !== "windows") {
        let peerPid = getPeerPid(connection);
        if (peerPid === undefined) {
          settled = true;
          connection.destroy();
          reject(
            new UdsSendRefusedError(
              "endpoint-unverifiable",
              "Refusing to send: connected endpoint identity could not be read",
            ),
          );
          return;
        }
        if (peerPid !== expectPeerPid) {
          settled = true;
          connection.destroy();
          logForDebugging(
            `[uds-client] connected endpoint is pid ${peerPid}, expected ${expectPeerPid} \u2014 refusing to write`,
          );
          reject(
            new UdsSendRefusedError(
              "wrong-endpoint",
              "Refusing to send: connected endpoint is not the expected process",
            ),
          );
          return;
        }
        let ownUid = process.getuid?.();
        let peerUid = getPeerUid(connection);
        if (ownUid !== undefined && peerUid === null) {
          settled = true;
          connection.destroy();
          reject(
            new UdsSendRefusedError(
              "endpoint-unverifiable",
              "Refusing to send: connected endpoint owner could not be read",
            ),
          );
          return;
        }
        if (ownUid !== undefined && peerUid !== ownUid) {
          settled = true;
          connection.destroy();
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
        if (
          expectPeerProcStart !== undefined &&
          getProcessStartTokenLinuxSync(peerPid) !== expectPeerProcStart
        ) {
          settled = true;
          connection.destroy();
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
      connection.write(payload_2);
      if (getPlatform() === "macos")
        setTimeout(
          (socket) => {
            if (!socket.destroyed) socket.end();
          },
          CONNECT_CONCURRENCY,
          connection,
        );
      else connection.end();
    });
    connection.on("close", () => {
      if (!settled) logForDebugging(`[uds-client] Sent to ${fragmentForLog(sock)}`);
      resolve();
    });
  });
}
//@ chunk-gh96j5t0.js:17233-17434 placement
function probeSocket(sock) {
  return new Promise((resolve) => {
    if (!isValidPipeOrPath(sock)) {
      resolve(false);
      return;
    }
    let connection = connect({
      path: sock,
    });
    let finish = (isLive) => {
      connection.destroy();
      resolve(isLive);
    };
    connection.on("connect", () => finish(true));
    connection.on("error", (error) => finish(getErrnoCode(error) === "EBUSY"));
    connection.setTimeout(250, () => finish(false));
  });
}
//@ chunk-gh96j5t0.js:17434-17579 placement
class SessionRecordsUnreadableError extends Error {
  code;
  constructor(code) {
    super("session records directory unreadable");
    this.code = code;
    this.name = "SessionRecordsUnreadableError";
  }
}
//@ chunk-gh96j5t0.js:17579-17865 placement
async function listSessionRecords(options) {
  if (isDiskless()) return [];
  let sessionsDir = getSessionsDir();
  let fileNames;
  try {
    fileNames = await readdir(sessionsDir);
  } catch (error) {
    if (options?.rejectUnreadable && !isENOENT(error))
      throw new SessionRecordsUnreadableError(getErrnoCode(error));
    return [];
  }
  return (
    await Promise.all(
      fileNames
        .filter((fileName) => /^\d+\.json$/.test(fileName))
        .map((fileName) =>
          readSessionRecord(sessionsDir, fileName, {
            rejectTornLiveRecord: options?.rejectTornLiveRecord,
          }),
        ),
    )
  ).filter((record) => record !== null);
}
//@ chunk-gh96j5t0.js:17865-20088 placement
/**
 * 读取并校验一个会话记录（规范路径、pid 存活、令牌），不合格时清理。
 */
async function readSessionRecord(sessionsDir, fileName, options) {
  let readJson = false;
  let recordPid;
  let recordPath = join(sessionsDir, fileName);
  try {
    let sessionRecordName = parseSessionRecordName(fileName);
    if (sessionRecordName === null) return null;
    let { pid } = sessionRecordName;
    if (!sessionRecordName.canonical) {
      unlink(recordPath).catch(() => {});
      return null;
    }
    recordPid = pid;
    let smallFileOrNull = await readSmallFileOrNull(recordPath, MAX_SESSION_RECORD_BYTES);
    if (smallFileOrNull === null) return null;
    readJson = true;
    let raw = jsonParse(smallFileOrNull);
    let normalized = normalizeSessionRecord(raw);
    return {
      sock: typeof raw.messagingSocketPath === "string" ? raw.messagingSocketPath : "",
      cwd: normalized.cwd,
      startedAt: normalized.startedAt,
      ...(saneEpochMsOrUndefined(raw.nameSince) !== undefined && {
        nameSince: saneEpochMsOrUndefined(raw.nameSince),
      }),
      procStart: normalized.procStart,
      ...(normalized.procStartFt !== undefined && {
        procStartFt: normalized.procStartFt,
      }),
      name: typeof raw.name === "string" ? raw.name : undefined,
      nameSource:
        raw.nameSource === "user" ||
        raw.nameSource === "peer" ||
        raw.nameSource === "derived" ||
        raw.nameSource === "collision" ||
        raw.nameSource === "auto" ||
        raw.nameSource === "hook"
          ? raw.nameSource
          : undefined,
      formerNames: sanitizeFormerNames(raw.formerNames),
      kind: normalized.kind,
      sessionId: normalized.sessionId,
      jobId: typeof raw.jobId === "string" ? raw.jobId : undefined,
      parkedJobId: typeof raw.parkedJobId === "string" ? raw.parkedJobId : undefined,
      spare: raw.spare === true,
      bridgeSessionId: typeof raw.bridgeSessionId === "string" ? raw.bridgeSessionId : undefined,
      logPath: typeof raw.logPath === "string" ? raw.logPath : undefined,
      status: normalized.status,
      waitingFor: typeof raw.waitingFor === "string" ? raw.waitingFor : undefined,
      ...{},
      updatedAt: saneEpochMsOrUndefined(raw.updatedAt),
      statusUpdatedAt: saneEpochMsOrUndefined(raw.statusUpdatedAt),
      entrypoint: normalized.entrypoint,
      ...(isValidLocalTaskId(raw.hostSessionId) !== undefined && {
        hostSessionId: isValidLocalTaskId(raw.hostSessionId),
      }),
      ...(normalized.pidDomain !== undefined && {
        pidDomain: normalized.pidDomain,
      }),
      agent: typeof raw.agent === "string" ? raw.agent : undefined,
      state: typeof raw.state === "string" ? raw.state : undefined,
      detail: typeof raw.detail === "string" ? raw.detail : undefined,
      tempo:
        raw.tempo === "active" || raw.tempo === "idle" || raw.tempo === "blocked" ? raw.tempo : undefined,
      needs: typeof raw.needs === "string" ? raw.needs : undefined,
      peerProtocol: typeof raw.peerProtocol === "number" ? raw.peerProtocol : undefined,
      ...(Array.isArray(raw.peerFeatures) && {
        peerFeatures: sanitizePeerFeatures(raw.peerFeatures),
      }),
      ...{},
      ...((typeof raw.asksForConvertedSkills === "boolean" || raw.asksForConvertedSkills === null) && {
        asksForConvertedSkills: raw.asksForConvertedSkills,
      }),
      tmux: typeof raw.tmux === "string" ? raw.tmux : undefined,
      pid,
      file: recordPath,
    };
  } catch {
    if (options?.rejectTornLiveRecord && readJson && recordPid !== undefined && isProcessRunning(recordPid)) {
      if (!options.isReread) {
        await sleep(MAX_PEER_NOTICE_LENGTH);
        return readSessionRecord(sessionsDir, fileName, {
          ...options,
          isReread: true,
        });
      }
      let [mtimeMs, processCreationTimeMs] = await Promise.all([
        stat(recordPath).then(
          (record) => record.mtimeMs,
          () => {
            return;
          },
        ),
        getProcessCreationTimeMsAsync(recordPid),
      ]);
      if (mtimeMs !== undefined && processCreationTimeMs !== null && processCreationTimeMs > mtimeMs + 2000)
        return null;
      if (processCreationTimeMs === null && !isProcessRunning(recordPid)) return null;
      throw new SessionRecordsUnreadableError("EBADRECORD");
    }
    return null;
  }
}
//@ chunk-gh96j5t0.js:20088-20150 placement
function isOtherPidDomain(record, pidDomain) {
  return record.pidDomain !== undefined && record.pidDomain !== pidDomain;
}
//@ chunk-gh96j5t0.js:20150-20236 placement
async function isHeldInAnotherPidDomain(records, sessionId) {
  let domain = await ownPidDomain();
  return records.some((record) => record.sessionId === sessionId && isOtherPidDomain(record, domain));
}
//@ chunk-gh96j5t0.js:20236-20320 placement
async function listRegisteredSessionRecords() {
  return (
    await listSessionRecords({
      rejectUnreadable: true,
    })
  ).map(({ file, ...record }) => record);
}
//@ chunk-gh96j5t0.js:20320-20531 placement
async function firstLiveSessionMatching(predicate) {
  let records = await listSessionRecords({
    rejectUnreadable: true,
    rejectTornLiveRecord: true,
  });
  let pidDomain = await ownPidDomain();
  for (let { file, ...record } of records)
    if (
      predicate(record) &&
      (isOtherPidDomain(record, pidDomain) ||
        (isProcessRunning(record.pid) &&
          (await isSameProcessAsync(record.pid, record.procStartFt ?? record.procStart))))
    )
      return record;
  return;
}
//@ chunk-gh96j5t0.js:20531-20724 placement
function removeSessionRecord(file, pid, pidDomain, storageV5) {
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    storageV5
      .delete(STORAGE_SPACES.session(basename(file)))
      .then((deleteResult) =>
        deleteResult.ok && deleteResult.value.existed
          ? reapKeysOfReapedRecord(dirname(file), pid, pidDomain, storageV5)
          : undefined,
      )
      .catch(() => {});
    return;
  }
  unlink(file)
    .then(() => reapKeysOfReapedRecord(dirname(file), pid, pidDomain, storageV5))
    .catch(() => {});
}
//@ chunk-gh96j5t0.js:20724-21201 placement
async function listAllLiveSessions(rejectUnreadable, options) {
  let records = await listSessionRecords({
    rejectUnreadable: options?.rejectUnreadable === true,
    rejectTornLiveRecord: options?.rejectUnreadable === true,
  });
  let pidDomain = options?.rejectUnreadable === true ? await ownPidDomain() : undefined;
  let isForeignDomain = (record) => pidDomain !== undefined && isOtherPidDomain(record, pidDomain);
  let mapped = records.map((record) => isForeignDomain(record) || isProcessRunning(record.pid));
  let results = await Promise.all(
    records.map(
      (record, index) =>
        mapped[index] &&
        (isForeignDomain(record) || isSameProcessAsync(record.pid, record.procStartFt ?? record.procStart)),
    ),
  );
  let sweepPermitted = await isRegistrySweepPermitted();
  let ownDomain = sweepPermitted ? await ownPidDomain() : "";
  let live = [];
  for (let idx = 0; idx < records.length; idx++) {
    let { file, ...record } = records[idx];
    if (results[idx]) live.push(record);
    else if (
      sweepPermitted &&
      mayReapRecordFromThisDomain(record, ownDomain) &&
      isProcessProvablyGone(record.pid)
    )
      removeSessionRecord(file, record.pid, ownDomain, rejectUnreadable);
  }
  return live;
}
//@ chunk-gh96j5t0.js:21201-21255 placement
function ownMessagingSocket() {
  return udsEnv.CLAUDE_CODE_MESSAGING_SOCKET;
}
//@ chunk-gh96j5t0.js:21255-21529 placement
async function isOwnEndpointShadowed() {
  let sock = ownMessagingSocket();
  if (sock === undefined) return false;
  let records = await listSessionRecords();
  let pidDomain = await ownPidDomain();
  let filtered = records.filter(
    (record) =>
      record.sock &&
      record.pid !== process.pid &&
      !isSpareOrParked(record) &&
      isNotStableAddress({
        sock: record.sock,
      }) &&
      mayBeSamePath(record.sock, sock),
  );
  return (
    await Promise.all(
      filtered.map(
        async (record) =>
          (await classifyRecordLiveness(record, pidDomain)) === "present" && (await probeSocket(record.sock)),
      ),
    )
  ).some(Boolean);
}
//@ chunk-gh96j5t0.js:21529-21789 placement
async function classifyRecordLiveness(record, pidDomain) {
  if (record.pidDomain !== pidDomain) return "present";
  if (isProcessProvablyGone(record.pid)) return "gone";
  let procStart = record.procStartFt ?? record.procStart;
  if (procStart === undefined) return "present";
  let processStartTime = await getProcessStartTimeAsync(record.pid);
  if (processStartTime === undefined || startTokensEqualOrCrossFormat(procStart, processStartTime))
    return "present";
  return (await provenSameProcessAsync(record.pid, procStart)) === false ? "recycled" : "present";
}
//@ chunk-gh96j5t0.js:21789-22257 placement
async function listLivePeerSessions(sock) {
  let ownSocket = ownMessagingSocket();
  let filtered = (
    await listSessionRecords({
      rejectUnreadable: true,
    })
  ).filter(
    (record) => record.sock && !(ownSocket && isSamePath(record.sock, ownSocket)) && !isSpareOrParked(record),
  );
  let [sweepPermitted, pidDomain] = await Promise.all([isRegistrySweepPermitted(), ownPidDomain()]);
  let [probeResults, liveness] = await Promise.all([
    Promise.all(filtered.map((record) => probeSocket(record.sock))),
    Promise.all(filtered.map((record) => classifyRecordLiveness(record, pidDomain))),
  ]);
  let live = [];
  for (let idx = 0; idx < filtered.length; idx++) {
    let { file, ...record } = filtered[idx];
    if (liveness[idx] === "gone") {
      if (sweepPermitted && isProcessProvablyGone(record.pid))
        removeSessionRecord(file, record.pid, pidDomain, sock);
    } else if (liveness[idx] === "recycled") continue;
    else if (probeResults[idx]) live.push(record);
    else if (
      sweepPermitted &&
      mayReapRecordFromThisDomain(record, pidDomain) &&
      isProcessProvablyGone(record.pid)
    )
      removeSessionRecord(file, record.pid, pidDomain, sock);
  }
  return live;
}
//@ chunk-gh96j5t0.js:22257-22692 placement
async function findLivePeerBySessionId(sessionId) {
  let ownSocket = ownMessagingSocket();
  let records = await listSessionRecords();
  let isCandidate = (record) => Boolean(record.sock) && !(ownSocket && isSamePath(record.sock, ownSocket));
  let parkedJobIds = new Set(
    records
      .filter((record) => record.sessionId === sessionId && record.parkedJobId !== undefined)
      .map((record) => record.parkedJobId),
  );
  let filtered = records.filter((record) => isCandidate(record) && !isSpareOrParked(record));
  let filtered_2 = filtered.filter((record) => record.sessionId === sessionId);
  let filtered_3 = filtered.filter(
    (record) =>
      record.sessionId !== sessionId && record.jobId !== undefined && parkedJobIds.has(record.jobId),
  );
  let pidDomain = await ownPidDomain();
  for (let record of filtered_2.concat(filtered_3)) {
    let { file, ...peerRecord } = record;
    if (
      (await classifyRecordLiveness(peerRecord, pidDomain)) === "present" &&
      (await probeSocket(peerRecord.sock))
    )
      return peerRecord;
  }
  return null;
}
//@ chunk-gh96j5t0.js:22692-22751 placement
function isSpareOrParked(record) {
  return record.spare === true || record.parkedJobId !== undefined;
}
//@ chunk-gh96j5t0.js:22751-22832 placement
function sanitizePeerFeatures(peerFeatures) {
  return stringArray(peerFeatures)
    .filter((feature) => /^[a-z0-9_]{1,32}$/.test(feature))
    .slice(0, 16);
}
export {
  listLivePeerSessions,
  SessionRecordsUnreadableError,
  isOwnEndpointShadowed,
  ownMessagingSocket,
  listRegisteredSessionRecords,
  sendStampedControlToUdsSocket,
  sendControlToUdsSocket,
  listAllLiveSessions,
  sendToUdsSocket,
  findLivePeerBySessionId,
  registeredLivePeerForSocket,
  firstLiveSessionMatching,
  admitReceiptForOutstandingSend,
  admitDroppedIdsByDestination,
  debitPacerForReleasedSend,
  creditPacerForHeldSend,
  registeredInboxesOfPids,
  isHeldInAnotherPidDomain,
  liveStatusOfJob,
};

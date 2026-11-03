/**
 * utils/claudeInChrome/socketClient.ts
 *
 * 2.1.316 新增：与 Chrome 扩展通信的 socket 客户端与错误类型
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p7xf186d.js (26)
 * attribution: placement 26
 */
import { createConnection } from "net";
import { randomUUID } from "crypto";
import { platform } from "os";
import { dirname } from "path";
import { promises } from "fs";
import {
  stripPrivateOptions,
  normalizeCategory,
  parseRefusal,
  ensurePairingContext,
  LocalPairingHandshake,
  getPairingContext,
} from "./localPairing/handshake.js";
import { PairingError } from "./localPairing/pairingErrors.js";
import { BROWSER_TOOL_TIMEOUT_MS } from "./browserToolSchemas.js";
import { classifyToolError, firstTextContent } from "./toolErrorClassification.js";

//@ chunk-p7xf186d.js:27900-28175 placement
function toolCallMeta(e, t) {
  return {
    toolUseId: t.toolUseId,
    requestId: t.requestId,
    toolType: typeof e.tool_type === "string" ? e.tool_type : "unknown",
    url: typeof e.url === "string" ? e.url : "",
    actionData:
      e.action_data && typeof e.action_data === "object" ? stripPrivateOptions(e.action_data) : void 0,
    category: normalizeCategory(e.category),
  };
}
//@ chunk-p7xf186d.js:28175-28438 placement
function permissionContextFields(e) {
  return {
    ...(e?.permissionMode ? { permission_mode: e.permissionMode } : {}),
    ...(e?.allowedDomains?.length ? { allowed_domains: e.allowedDomains } : {}),
    ...(e?.onPermissionRequest ? { handle_permission_prompts: !0 } : {}),
    ...(e?.sessionScope ? { session_scope: e.sessionScope } : {}),
  };
}
//@ chunk-p7xf186d.js:28438-28503 placement
function quoteTruncated(e, t = 64) {
  return JSON.stringify(String(e).slice(0, t));
}
//@ chunk-p7xf186d.js:28503-28585 placement
class SocketConnectionError extends Error {
  constructor(e) {
    super(e);
    this.name = "SocketConnectionError";
  }
}
//@ chunk-p7xf186d.js:28585-28670 placement
class ToolCallSupersededError extends Error {
  constructor(e) {
    super(e);
    this.name = "ToolCallSupersededError";
  }
}
//@ chunk-p7xf186d.js:28670-28757 placement
class NoExtensionConnectedError extends Error {
  constructor(e) {
    super(e);
    this.name = "NoExtensionConnectedError";
  }
}
//@ chunk-p7xf186d.js:28757-28906 placement
class ToolCallTimeoutError extends Error {
  routingAckReceived;
  constructor(e, t) {
    super(e);
    ((this.name = "ToolCallTimeoutError"), (this.routingAckReceived = t?.routingAckReceived));
  }
}
//@ chunk-p7xf186d.js:28906-29000 placement
class ExtensionDisconnectedMidCallError extends Error {
  constructor(e) {
    super(e);
    this.name = "ExtensionDisconnectedMidCallError";
  }
}
//@ chunk-p7xf186d.js:29000-29082 placement
class RequestTooLargeError extends Error {
  constructor(e) {
    super(e);
    this.name = "RequestTooLargeError";
  }
}
//@ chunk-p7xf186d.js:29082-29129 placement = _temp (1)
function Ge(r) {
  return "result" in r || "error" in r;
}
//@ chunk-p7xf186d.js:29129-29191 placement
function ze(e) {
  return "method" in e && typeof e.method === "string";
}
//@ chunk-p7xf186d.js:29191-29311 placement
var CONNECT_TIMEOUT_MS = 5000,
  PAIRING_REPLY_TIMEOUT_MS = 15000,
  HANDSHAKE_STEP_TIMEOUT_MS = 15000,
  PAIRING_MAX_AGE_MS = 28800000,
  FORCED_TEARDOWN_GRACE_MS = 1000,
  RECONNECT_WAIT_MS = 20000,
  LIVENESS_PROBE_INTERVAL_MS = 5000,
  LIVENESS_PROBE_TIMEOUT_MS = 1e4,
  MAX_LOCAL_FRAME_BYTES = 1032192,
  FRAME_OVERHEAD_BYTES = 1024,
  MAX_REQUEST_PAYLOAD_BYTES = Math.floor(((MAX_LOCAL_FRAME_BYTES - FRAME_OVERHEAD_BYTES) * 3) / 4) - 16;
//@ chunk-p7xf186d.js:29311-29418 placement
class PeerRefusedPairing extends PairingError {
  constructor(e, t) {
    super(e, "peer-reported", { httpStatus: t });
    this.name = "PeerRefusedPairing";
  }
}
//@ chunk-p7xf186d.js:29418-29600 placement
class HandshakeTimeout extends Error {
  which;
  constructor(e) {
    super(e === "reply" ? "No reply to a pairing message" : "Our attest/JWKS step overran while pairing");
    this.which = e;
    this.name = "HandshakeTimeout";
  }
}
//@ chunk-p7xf186d.js:29600-30110 placement
function handlePairingResult(e, t) {
  let n = e.result;
  if (n && typeof n === "object" && n.local_pairing) {
    if (n.local_pairing.msg === t) return n.local_pairing;
    throw new PairingError("malformed", `expected ${t}`);
  }
  let error = e.error;
  if (error && typeof error === "object" && error.local_pairing) {
    let i = parseRefusal(error.local_pairing),
      code = error.local_pairing.code,
      o = typeof code === "string" && /^attest_failed:\d{1,3}$/.test(code) ? Number(code.slice(14)) : void 0;
    throw new PeerRefusedPairing(i ?? "malformed", o);
  }
  if (t === "accept" && isNoToolSpecifiedError(e)) throw new PeerRefusedPairing("unsupported_peer");
  throw new PairingError("malformed", "unrecognised reply to a pairing message");
}
//@ chunk-p7xf186d.js:30110-30158 placement
function Yt(e) {
  return e === void 0 || e < 400 || e >= 500;
}
//@ chunk-p7xf186d.js:30158-30203 placement
var et = (e) => e === "ENOENT" || e === "ECONNREFUSED";
//@ chunk-p7xf186d.js:30203-30577 placement
function pairingErrorMessage(e, t) {
  switch (e) {
    case "pairing_disabled":
    case "org_not_permitted":
    case "unsupported_peer":
    case "wrong_peer_kind":
      return "durable";
    case "account_mismatch":
    case "org_mismatch":
      return "peer_may_move";
    case "not_signed_in":
      return t ? "peer_not_ready" : "awaits_token";
    case "managed_org_missing":
      return "peer_not_ready";
    case "attest_failed":
      return "awaits_token";
    default:
      return "retry";
  }
}
//@ chunk-p7xf186d.js:30577-30793 placement
function isRetryablePairingError(e) {
  if (!(e instanceof PairingError)) return !1;
  switch (e.code) {
    case "jwks_unavailable":
      return !0;
    case "attest_failed":
      return Yt(e.httpStatus);
    case "not_signed_in":
      return !(e instanceof PeerRefusedPairing) && e.cause !== void 0;
    default:
      return !1;
  }
}
//@ chunk-p7xf186d.js:30793-30940 placement
function isNoToolSpecifiedError(e) {
  let t = e.error?.content;
  if (!Array.isArray(t) || t.length !== 1) return !1;
  let n = t[0];
  return n?.type === "text" && n.text === "No tool specified";
}
//@ chunk-p7xf186d.js:30940-31099 placement
function requestTooLargeError(e, t = MAX_LOCAL_FRAME_BYTES) {
  return new RequestTooLargeError(
    `Request too large for the local browser connection (${e} bytes; limit ${t}). Send smaller inputs or fewer files per call.`,
  );
}
//@ chunk-p7xf186d.js:31099-31223 placement
function peerMaxReassemblyBytes(e) {
  let t = e.peerInstance?.max_reassembly_bytes;
  return typeof t === "number" && Number.isSafeInteger(t) && t > 0 ? t : void 0;
}
//@ chunk-p7xf186d.js:31223-31336 placement
function isInferenceRequest(e) {
  let t = e;
  return !!t && typeof t === "object" && typeof t.max_tokens === "number" && Array.isArray(t.messages);
}
/**
 * 与 Chrome 扩展通信的 socket 客户端：连接、配对握手、请求发送与超时、断线处理。
 */
//@ chunk-p7xf186d.js:31336-55071 placement
class ChromeSocketClient {
  socket = null;
  connected = !1;
  connecting = !1;
  connectEpoch = 0;
  pending = null;
  currentPath;
  handshaking = !1;
  pairing = null;
  pairingWaiter = null;
  pairingExpired = !1;
  pairingAgeTimer = null;
  pairingGraceTimer = null;
  lastPairingRefuse;
  loggedRefusal;
  forcedTeardownAt = 0;
  notificationHandler = null;
  responseBuffer = Buffer.alloc(0);
  responseChunks = [];
  responseChunkBytes = 0;
  reconnectAttempts = 0;
  maxReconnectAttempts = 10;
  reconnectDelay = 1000;
  reconnectTimer = null;
  connectTimer = null;
  context;
  disableAutoReconnect = !1;
  onRedialWanted;
  pairingProbeTimer = null;
  probeToolUseId;
  probesAnswered = 0;
  constructor(e) {
    this.context = e;
  }
  async connect() {
    let { serverName: serverName, logger: logger } = this.context;
    if (this.connecting) {
      logger.info(`[${serverName}] Already connecting, skipping duplicate attempt`);
      return;
    }
    (this.closeSocket(), (this.connecting = !0), (this.lastPairingRefuse = void 0));
    let connectEpoch = this.connectEpoch,
      r = this.context.getSocketPath?.() ?? this.context.socketPath;
    ((this.currentPath = r), this.logDial(`[${serverName}] Attempting to connect to: ${r}`));
    let i;
    try {
      i = await this.validateSocketSecurity(r);
    } catch (error) {
      if (connectEpoch === this.connectEpoch) this.connecting = !1;
      logger.info(`[${serverName}] Security validation failed:`, error);
      return;
    }
    if (!i) {
      if (connectEpoch === this.connectEpoch) ((this.connecting = !1), this.scheduleReconnect("dead"));
      return;
    }
    if (connectEpoch !== this.connectEpoch) return;
    let localPairing = this.context.localPairing;
    if (localPairing && !(await this.ownIdentityPresent(localPairing, connectEpoch))) return;
    let o,
      { connectVerified: connectVerified } = this.context;
    if (connectVerified) {
      try {
        o = await connectVerified(r);
      } catch (error) {
        if (connectEpoch !== this.connectEpoch) return;
        this.connecting = !1;
        let code = error.code;
        if (et(code))
          (logger.info(`[${serverName}] Socket not found; not dialing`), this.scheduleReconnect("dead"));
        else if (code === "EPERM" || code === "EACCES" || code === "EPEERCRED" || !code)
          logger.info(`[${serverName}] Security validation failed:`, error);
        else (logger.info(`[${serverName}] Verified dial failed:`, error), this.scheduleReconnect());
        return;
      }
      if (connectEpoch !== this.connectEpoch) {
        o.destroy();
        return;
      }
    } else o = createConnection(r);
    this.socket = o;
    let a = () => {
      if ((this.clearConnectTimer(), this.clearReconnectTimer(), localPairing)) {
        ((this.reconnectAttempts = Math.min(this.reconnectAttempts, this.maxReconnectAttempts)),
          this.pair(connectEpoch, localPairing));
        return;
      }
      ((this.connected = !0),
        (this.connecting = !1),
        (this.reconnectAttempts = 0),
        logger.info(`[${serverName}] Successfully connected to bridge server`));
    };
    if (
      (o.on("data", (u) => {
        let responseBuffer = this.responseBuffer,
          p = responseBuffer.length + this.responseChunkBytes + u.length;
        if (responseBuffer.length >= 4 && p < 4 + responseBuffer.readUInt32LE(0)) {
          (this.responseChunks.push(u), (this.responseChunkBytes += u.length));
          return;
        }
        if (this.responseChunks.length > 0)
          ((this.responseBuffer = Buffer.concat([responseBuffer, ...this.responseChunks, u], p)),
            (this.responseChunks = []),
            (this.responseChunkBytes = 0));
        else this.responseBuffer = responseBuffer.length === 0 ? u : Buffer.concat([responseBuffer, u], p);
        while (this.responseBuffer.length >= 4) {
          let uInt32LE = this.responseBuffer.readUInt32LE(0);
          if (this.responseBuffer.length < 4 + uInt32LE) break;
          let sliced = this.responseBuffer.slice(4, 4 + uInt32LE);
          this.responseBuffer = this.responseBuffer.slice(4 + uInt32LE);
          try {
            let parsed = JSON.parse(sliced.toString("utf-8"));
            if (localPairing) {
              this.dispatchPairingRail(parsed, connectEpoch);
              continue;
            }
            if (ze(parsed)) {
              if (
                (logger.info(`[${serverName}] Received notification: ${quoteTruncated(parsed.method)}`),
                !(parsed.method === "permission_request" && this.claimPermissionRequest(parsed.params)))
              )
                this.notificationHandler?.(parsed);
            } else if (Ge(parsed))
              (logger.info(
                `[${serverName}] Received tool response for ${quoteTruncated(parsed.tool_use_id ?? "(untagged)")}`,
              ),
                this.handleResponse(parsed, uInt32LE));
            else logger.info(`[${serverName}] Received a message of unknown shape`);
          } catch (error) {
            logger.info(`[${serverName}] Failed to parse message:`, error);
          }
        }
      }),
      o.on("error", (u) => {
        (logger.info(`[${serverName}] Socket error (code: ${u.code}):`, u),
          this.closeSocket(),
          this.scheduleReconnect(et(u.code) ? "dead" : "transport"));
      }),
      o.on("close", () => {
        (this.closeSocket(), this.scheduleReconnect());
      }),
      connectVerified)
    ) {
      a();
      return;
    }
    ((this.connectTimer = setTimeout(() => {
      if (!this.connected)
        (logger.info(`[${serverName}] Connection attempt timed out after ${CONNECT_TIMEOUT_MS}ms`),
          this.closeSocket(),
          this.scheduleReconnect());
    }, CONNECT_TIMEOUT_MS)),
      o.on("connect", a));
  }
  scheduleReconnect(e = "transport") {
    let { serverName: serverName, logger: logger } = this.context;
    if (this.disableAutoReconnect) {
      this.onRedialWanted?.(e);
      return;
    }
    if (this.reconnectTimer) {
      logger.info(`[${serverName}] Reconnect already scheduled, skipping`);
      return;
    }
    this.reconnectAttempts++;
    let r = 100;
    if (this.reconnectAttempts > r) {
      (logger.info(`[${serverName}] Giving up after ${r} attempts. Will retry on next tool call.`),
        (this.reconnectAttempts = 0));
      return;
    }
    let min = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), 30000);
    if (this.reconnectAttempts <= this.maxReconnectAttempts)
      logger.info(`[${serverName}] Reconnecting in ${Math.round(min)}ms (attempt ${this.reconnectAttempts})`);
    else if (this.reconnectAttempts % 10 === 0)
      logger.info(`[${serverName}] Still polling for native host (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => {
      ((this.reconnectTimer = null), this.connect());
    }, min);
  }
  dispatchPairingRail(e, t) {
    let { serverName: serverName, logger: logger } = this.context;
    if (!e || typeof e !== "object") {
      logger.info(`[${serverName}] Dropping a non-object frame`);
      return;
    }
    if (!this.connected) {
      if (
        this.pairingWaiter &&
        Ge(e) &&
        (e.tool_use_id === this.pairingWaiter.toolUseId ||
          (e.tool_use_id === void 0 && this.pairingWaiter.acceptsUntagged && isNoToolSpecifiedError(e)))
      ) {
        let pairingWaiter = this.pairingWaiter;
        ((this.pairingWaiter = null), clearTimeout(pairingWaiter.timer), pairingWaiter.resolve(e));
        return;
      }
      logger.info(`[${serverName}] Dropping frame received before the connection was admitted`);
      return;
    }
    this.dispatchSealed(e, t);
  }
  async pair(e, t) {
    let { serverName: serverName, logger: logger } = this.context,
      i = this.currentPath ?? this.context.socketPath;
    ((this.handshaking = !0), this.reportPairingState(t, { state: "pairing", socketPath: i }));
    try {
      let { source: source, jwks: jwks } = ensurePairingContext(t),
        c = new LocalPairingHandshake({
          source: source,
          jwks: jwks,
          policy: { requiredOrg: t.requiredOrg },
          instanceHint: t.instanceHint,
        }),
        min = Math.min(
          FORCED_TEARDOWN_GRACE_MS,
          this.forcedTeardownAt + FORCED_TEARDOWN_GRACE_MS - Date.now(),
        );
      if (min > 0) {
        if ((await new Promise((h) => setTimeout(h, min).unref?.()), e !== this.connectEpoch)) return;
      }
      let withPairingStepDeadline = await this.withPairingStepDeadline(c.createOffer());
      if (e !== this.connectEpoch) return;
      let l = handlePairingResult(await this.exchangePairing({ ...withPairingStepDeadline }, !0), "accept");
      if (e !== this.connectEpoch) return;
      let withPairingStepDeadline_2 = await this.withPairingStepDeadline(c.onAccept(l));
      if (e !== this.connectEpoch) return;
      let y = handlePairingResult(await this.exchangePairing({ ...withPairingStepDeadline_2 }, !1), "done");
      if (e !== this.connectEpoch) return;
      let onDone = await c.onDone(y);
      if (e !== this.connectEpoch) {
        onDone.channel.tearDown();
        return;
      }
      if (!this.socket || this.socket.destroyed) {
        (onDone.channel.tearDown(), this.closeSocket(), this.scheduleReconnect());
        return;
      }
      ((this.pairing = onDone),
        (this.pairingExpired = !1),
        (this.pairingAgeTimer = setTimeout(() => {
          if (this.pairing !== onDone) return;
          if (((this.pairingExpired = !0), !this.pending)) {
            this.expirePairing();
            return;
          }
          this.startAgeGrace(this.pending);
        }, PAIRING_MAX_AGE_MS)),
        this.pairingAgeTimer.unref?.(),
        (this.handshaking = !1),
        (this.connected = !0),
        (this.connecting = !1),
        (this.reconnectAttempts = 0),
        (this.probesAnswered = 0),
        this.schedulePairingProbe(),
        (this.loggedRefusal = void 0),
        logger.info(
          `[${serverName}] Local pairing established with ${i} (peer ${onDone.peer.client_kind}, sid ${onDone.sidB64.slice(0, 8)}\u2026)`,
        ),
        this.reportPairingState(t, {
          state: "established",
          socketPath: i,
          peerKind: onDone.peer.client_kind,
          peerInstance: onDone.peerInstance,
          assertionExp: onDone.peer.exp,
        }));
    } catch (error) {
      if (e !== this.connectEpoch) return;
      if (((this.handshaking = !1), error instanceof HandshakeTimeout)) {
        (logger.warn(`[${serverName}] ${error.message} (${i}); reconnecting`),
          (this.lastPairingRefuse = { code: "timeout", peerReported: !1 }),
          this.reportPairingState(t, {
            state: "refused",
            socketPath: i,
            code: "timeout",
            wire: "timeout",
            peerReported: !1,
          }),
          this.closeSocket(),
          this.scheduleReconnect());
        return;
      }
      let o = error instanceof PeerRefusedPairing,
        c = error instanceof PairingError ? error : void 0,
        a = c?.code ?? "malformed",
        u = c?.wireCode() ?? a;
      if (
        (this.logRefusal(
          `[${serverName}] Local pairing with ${i} refused: ${u}${o ? " (peer-reported, unauthenticated)" : ""}`,
          c ? void 0 : error,
        ),
        (this.lastPairingRefuse = { code: a, peerReported: o }),
        this.reportPairingState(t, {
          state: "refused",
          socketPath: i,
          code: a,
          wire: u,
          ...(c?.httpStatus !== void 0 && { httpStatus: c.httpStatus }),
          peerReported: o,
        }),
        this.closeSocket(),
        isRetryablePairingError(error))
      )
        this.scheduleReconnect();
    }
  }
  async ownIdentityPresent(e, t) {
    let { serverName: serverName } = this.context,
      r = this.currentPath ?? this.context.socketPath,
      i,
      s = !1;
    try {
      i = await this.withPairingStepDeadline(e.getBearer());
    } catch {
      s = !0;
    }
    if (t !== this.connectEpoch) return !1;
    if (i) return !0;
    if (
      ((this.connecting = !1),
      (this.lastPairingRefuse = { code: "not_signed_in", peerReported: !1 }),
      this.logRefusal(
        `[${serverName}] Local pairing with ${r} refused: not_signed_in (no bearer of our own${s ? "; token source failed" : ""}; not dialing)`,
      ),
      this.reportPairingState(e, {
        state: "refused",
        socketPath: r,
        code: "not_signed_in",
        wire: "not_signed_in",
        peerReported: !1,
      }),
      s)
    )
      this.scheduleReconnect();
    return !1;
  }
  logRefusal(e, ...t) {
    if (e === this.loggedRefusal) {
      this.context.logger.debug(e, ...t);
      return;
    }
    ((this.loggedRefusal = e), this.context.logger.warn(e, ...t));
  }
  logDial(e) {
    if (this.loggedRefusal === void 0) this.context.logger.info(e);
    else this.context.logger.debug(e);
  }
  withPairingStepDeadline(e) {
    let t,
      promise = new Promise((r, i) => {
        ((t = setTimeout(() => i(new HandshakeTimeout("step")), HANDSHAKE_STEP_TIMEOUT_MS)), t.unref?.());
      });
    return Promise.race([e, promise]).finally(() => clearTimeout(t));
  }
  reportPairingState(e, t) {
    try {
      e.onPairingState?.(t);
    } catch (error) {
      this.context.logger.warn(`[${this.context.serverName}] onPairingState handler threw:`, error);
    }
  }
  exchangePairing(e, t) {
    return new Promise((n, r) => {
      let i = randomUUID(),
        s = setTimeout(() => {
          if (this.pairingWaiter?.toolUseId === i)
            ((this.pairingWaiter = null), r(new HandshakeTimeout("reply")));
        }, PAIRING_REPLY_TIMEOUT_MS);
      if (this.pairingWaiter)
        (clearTimeout(this.pairingWaiter.timer), this.pairingWaiter.reject(new HandshakeTimeout("reply")));
      ((this.pairingWaiter = { toolUseId: i, acceptsUntagged: t, resolve: n, reject: r, timer: s }),
        this.writeRaw({
          method: "execute_tool",
          params: { client_id: this.context.clientTypeId, tool_use_id: i, local_pairing: e },
        }));
    });
  }
  async writeSealed(e, t) {
    let pairing = this.pairing;
    if (!pairing || !this.connected)
      throw new SocketConnectionError(`[${this.context.serverName}] Cannot send request: not paired`);
    let byteLength = Buffer.byteLength(JSON.stringify(t), "utf-8"),
      i = peerMaxReassemblyBytes(pairing),
      s = byteLength > MAX_REQUEST_PAYLOAD_BYTES && i !== void 0;
    if (s && byteLength > i) throw requestTooLargeError(byteLength, i);
    if (!s && Math.ceil((byteLength * 4) / 3) > MAX_LOCAL_FRAME_BYTES)
      throw requestTooLargeError(Math.ceil((byteLength * 4) / 3));
    let o;
    try {
      o = s
        ? await pairing.channel.sealChunked("execute_tool", e, t, MAX_REQUEST_PAYLOAD_BYTES)
        : [await pairing.channel.seal("execute_tool", e, t)];
    } catch (error) {
      if (this.pairing !== pairing || pairing.channel.isTornDown)
        throw new SocketConnectionError(`[${this.context.serverName}] Pairing changed while sealing`);
      throw error;
    }
    if (this.pairing !== pairing)
      throw new SocketConnectionError(`[${this.context.serverName}] Pairing changed while sealing`);
    if (s)
      this.context.logger.info(
        `[${this.context.serverName}] Sealed request sliced into ${o.length} frames (${byteLength} bytes, max ${MAX_REQUEST_PAYLOAD_BYTES} per slice)`,
      );
    let mapped = o.map((a) => {
      let u = { method: "execute_tool", params: { tool_use_id: e, sealed: a } },
        buffer = Buffer.from(JSON.stringify(u), "utf-8");
      if (buffer.length > MAX_LOCAL_FRAME_BYTES) throw requestTooLargeError(buffer.length);
      return { frame: u, bytes: buffer };
    });
    for (let { frame: frame, bytes: bytes } of mapped) this.writeRaw(frame, bytes);
  }
  async answerInferenceRequest(e, t, n) {
    let { serverName: serverName, logger: logger, localPairing: localPairing } = this.context,
      o;
    try {
      if (!e || !isInferenceRequest(t)) o = { ok: !1, error: "malformed" };
      else if (this.context.isDisabled?.() || !localPairing?.onInferenceRequest)
        o = { ok: !1, error: "not_supported" };
      else o = await localPairing.onInferenceRequest(t);
      let ceil = Math.ceil((Buffer.byteLength(JSON.stringify(o), "utf-8") * 4) / 3);
      if (ceil > MAX_LOCAL_FRAME_BYTES)
        (logger.warn(`[${serverName}] inference_response too large (${ceil} bytes); answering too_large`),
          (o = { ok: !1, error: "too_large" }));
    } catch (error) {
      (logger.warn(`[${serverName}] inference seam failed:`, error),
        (o = { ok: !1, error: "handler_error" }));
    }
    let pairing = this.pairing;
    if (n !== this.connectEpoch || !pairing) return;
    try {
      let seal = await pairing.channel.seal("notification:inference_response", e, {
        method: "inference_response",
        params: { request_id: e, result: o },
      });
      if (n !== this.connectEpoch || this.pairing !== pairing) return;
      let u = { method: "inference_response", params: { request_id: e, sealed: seal } },
        buffer = Buffer.from(JSON.stringify(u), "utf-8");
      if (buffer.length > MAX_LOCAL_FRAME_BYTES) {
        logger.warn(
          `[${serverName}] inference_response frame oversized after seal (${buffer.length} bytes); dropped`,
        );
        return;
      }
      this.writeRaw(u, buffer);
    } catch (error) {
      logger.warn(`[${serverName}] Failed to seal inference_response:`, error);
    }
  }
  lastPairingRefuseCode() {
    return this.lastPairingRefuse?.code;
  }
  lastPairingRefusePeerReported() {
    return this.lastPairingRefuse?.peerReported ?? !1;
  }
  isPaired() {
    return this.connected && this.pairing !== null;
  }
  pairingAgedOut() {
    if (!this.pairing) return !1;
    if (Date.now() / 1000 - this.pairing.establishedAt > PAIRING_MAX_AGE_MS / 1000) this.pairingExpired = !0;
    if (this.pairingExpired && this.pending) this.startAgeGrace(this.pending);
    return this.pairingExpired;
  }
  startAgeGrace(e) {
    if (this.pairingGraceTimer) return;
    let pairing = this.pairing;
    ((this.pairingGraceTimer = setTimeout(() => {
      if (this.pairing === pairing) this.expirePairing();
    }, e.timeoutMs)),
      this.pairingGraceTimer.unref?.());
  }
  forceRepair(e, t = !1) {
    ((this.forcedTeardownAt = Date.now()),
      this.failPending(e),
      this.closeSocket(),
      this.scheduleReconnect(t ? "peer_dropped" : "transport"));
  }
  schedulePairingProbe() {
    (this.clearPairingProbe(),
      (this.pairingProbeTimer = setTimeout(() => {
        if (((this.pairingProbeTimer = null), !this.connected || !this.pairing)) return;
        if (this.pending) {
          this.schedulePairingProbe();
          return;
        }
        if (this.pairingAgedOut()) {
          this.expirePairing();
          return;
        }
        let e = {
          method: "execute_tool",
          params: { client_id: this.context.clientTypeId, tool_use_id: randomUUID() },
        };
        this.probeToolUseId = e.params.tool_use_id;
        let t = () => {
          if (((this.probeToolUseId = void 0), this.connected && this.pairing)) this.schedulePairingProbe();
        };
        this.sendRequest(e, LIVENESS_PROBE_TIMEOUT_MS).then(() => {
          if (((this.probesAnswered += 1), this.probesAnswered === 1))
            this.context.logger.info(
              `[${this.context.serverName}] Local pairing liveness probe answered; probing every ${(this.context.localPairing?.probeIntervalMs ?? LIVENESS_PROBE_INTERVAL_MS) / 1000} s while idle`,
            );
          else
            this.context.logger.debug(
              `[${this.context.serverName}] Local pairing liveness probe ${this.probesAnswered} answered`,
            );
          t();
        }, t);
      }, this.context.localPairing?.probeIntervalMs ?? LIVENESS_PROBE_INTERVAL_MS)),
      this.pairingProbeTimer.unref?.());
  }
  probesAnsweredCount() {
    return this.probesAnswered;
  }
  clearPairingProbe() {
    if (this.pairingProbeTimer) (clearTimeout(this.pairingProbeTimer), (this.pairingProbeTimer = null));
  }
  expirePairing() {
    (this.context.logger.info(
      `[${this.context.serverName}] Local pairing reached its maximum age; re-pairing`,
    ),
      this.closeSocket(),
      this.scheduleReconnect());
  }
  clearPairing(e) {
    if (this.pairingWaiter) {
      clearTimeout(this.pairingWaiter.timer);
      let pairingWaiter = this.pairingWaiter;
      ((this.pairingWaiter = null), pairingWaiter.reject(new HandshakeTimeout("reply")));
    }
    if (this.pairingAgeTimer) (clearTimeout(this.pairingAgeTimer), (this.pairingAgeTimer = null));
    if (this.pairingGraceTimer) (clearTimeout(this.pairingGraceTimer), (this.pairingGraceTimer = null));
    let pairing = this.pairing,
      n = !pairing
        ? "handshake_aborted"
        : pairing.channel.isTornDown
          ? "forged_frames"
          : this.pairingExpired
            ? "expired"
            : "connection_closed";
    if (
      (this.pairing?.channel.tearDown(),
      (this.pairing = null),
      (this.pairingExpired = !1),
      (pairing || e) && this.context.localPairing)
    )
      this.reportPairingState(this.context.localPairing, {
        state: "closed",
        socketPath: this.currentPath ?? this.context.socketPath,
        reason: n,
      });
  }
  async dispatchSealed(e, t) {
    let { serverName: serverName, logger: logger } = this.context,
      pairing = this.pairing;
    if (!pairing) return;
    let s, o, c;
    if (ze(e)) {
      if (e.method === "permission_request") {
        s = "notification:permission_request";
        let l = e.params?.tool_use_id;
        o = typeof l === "string" ? l : void 0;
      } else if (e.method === "sealed_broadcast") ((s = "notification:sealed_broadcast"), (o = void 0));
      else if (e.method === "inference_request") {
        s = "notification:inference_request";
        let l = e.params?.request_id;
        o = typeof l === "string" ? l : void 0;
      } else {
        logger.info(`[${serverName}] Dropping unsealed notification on a paired connection`);
        return;
      }
      c = e.params?.sealed;
    } else {
      let l = e;
      if (typeof l.tool_use_id !== "string") {
        logger.info(`[${serverName}] Dropping a response without a routing id on a paired connection`);
        return;
      }
      if (
        ((s = "tool_response"),
        (o = l.tool_use_id),
        (c = l.sealed),
        c === void 0 && o === this.pending?.toolUseId && l.error?.local_pairing)
      ) {
        (logger.warn(
          `[${serverName}] Peer reports the pairing is unknown to it${o === this.probeToolUseId ? " (it dropped the pairing; found by the liveness probe)" : ""}; re-pairing`,
        ),
          this.forceRepair(
            new ExtensionDisconnectedMidCallError(
              `[${serverName}] Peer reports the pairing is unknown; re-pairing`,
            ),
            !0,
          ));
        return;
      }
    }
    if (c === void 0) {
      logger.info(`[${serverName}] Dropping clear-text ${s} on a paired connection`);
      return;
    }
    if (this.pairingAgedOut() && !(s === "tool_response" && o === this.pending?.toolUseId)) {
      if (this.pending) logger.info(`[${serverName}] Dropping sealed ${s} past the pairing's maximum age`);
      else this.expirePairing();
      return;
    }
    let open = await pairing.channel.open(s, o, c);
    if (t !== this.connectEpoch || this.pairing !== pairing) return;
    if (!open.ok) {
      if (open.reason !== "foreign_sid") logger.warn(`[${serverName}] Sealed ${s} rejected: ${open.reason}`);
      if (pairing.channel.isTornDown)
        (logger.warn(`[${serverName}] Sealed channel torn down; re-pairing`),
          this.forceRepair(
            new ExtensionDisconnectedMidCallError(
              `[${serverName}] Sealed channel to the extension was torn down`,
            ),
          ));
      return;
    }
    let inner = open.inner;
    if (!inner || typeof inner !== "object") return;
    try {
      if (s === "tool_response")
        this.handleResponse(
          {
            ...("result" in inner && { result: inner.result }),
            ...("error" in inner && { error: inner.error }),
            tool_use_id: o,
          },
          Buffer.byteLength(JSON.stringify(inner), "utf-8"),
        );
      else if (s === "notification:permission_request") {
        let l = inner.params ?? {};
        if (inner.method !== "permission_request" || l.tool_use_id !== o) {
          logger.warn(`[${serverName}] Sealed permission_request mislabelled; dropped`);
          return;
        }
        this.claimPermissionRequest(l);
      } else if (s === "notification:inference_request") {
        let l = inner.params ?? {};
        if (inner.method !== "inference_request" || l.request_id !== o) {
          logger.warn(`[${serverName}] Sealed inference_request mislabelled; dropped`);
          return;
        }
        this.answerInferenceRequest(o, l.body, t);
      } else if (this.notificationHandler && typeof inner.method === "string")
        this.notificationHandler({ method: inner.method, params: inner.params ?? void 0 });
    } catch (error) {
      logger.error(`[${serverName}] Error handling a sealed ${s}:`, error);
    }
  }
  handleResponse(e, t) {
    let pending = this.pending;
    if (!pending || (typeof e.tool_use_id === "string" && e.tool_use_id !== pending.toolUseId)) return;
    if (((this.pending = null), clearTimeout(pending.timer), pending.resolve(e, t), this.pairingAgedOut()))
      this.expirePairing();
  }
  claimPermissionRequest(e) {
    let pending = this.pending,
      n = e?.request_id;
    if (!pending?.onPermissionRequest || typeof n !== "string" || e?.tool_use_id !== pending.toolUseId)
      return !1;
    return (this.answerPermissionRequest(pending, pending.onPermissionRequest, n, e), !0);
  }
  async answerPermissionRequest(e, t, n, r) {
    let i = toolCallMeta(r, { toolUseId: e.toolUseId, requestId: n });
    clearTimeout(e.timer);
    let s = !1;
    try {
      s = await t(i);
    } catch (error) {
      this.context.logger.error(`[${this.context.serverName}] Error handling permission request:`, error);
    }
    if (this.pending !== e) return;
    if (this.pairingAgedOut()) {
      this.expirePairing();
      return;
    }
    let o = { method: "permission_response", params: { request_id: n, allowed: s } };
    if (this.context.localPairing) {
      let c = { ...o, params: { ...o.params, tool_use_id: e.toolUseId } };
      if (
        (await this.writeSealed(e.toolUseId, c).catch((a) => {
          this.context.logger.warn(`[${this.context.serverName}] Could not send permission_response:`, a);
        }),
        this.pending !== e)
      )
        return;
    } else this.writeFrame(o);
    this.armTimeout(e);
  }
  setNotificationHandler(e) {
    this.notificationHandler = e;
  }
  async ensureConnected() {
    let { serverName: serverName } = this.context;
    if (this.connected && this.socket) return !0;
    if (!this.socket && !this.connecting) await this.connect();
    return new Promise((t, n) => {
      let r = null,
        i = CONNECT_TIMEOUT_MS,
        s = () => {
          if (this.connected) {
            if (r) clearTimeout(r);
            t(!0);
            return;
          }
          if (
            this.context.localPairing &&
            (this.handshaking || this.lastPairingRefuse?.code === "timeout") &&
            i < RECONNECT_WAIT_MS
          ) {
            ((i = RECONNECT_WAIT_MS), (o = setTimeout(s, i - CONNECT_TIMEOUT_MS)));
            return;
          }
          if (r) clearTimeout(r);
          n(new SocketConnectionError(`[${serverName}] Connection attempt timed out after ${i}ms`));
        },
        o = setTimeout(s, i),
        c = () => {
          if (this.connected) (clearTimeout(o), t(!0));
          else if (
            !this.socket &&
            !this.connecting &&
            (!this.reconnectTimer ||
              (this.context.localPairing &&
                this.lastPairingRefuse !== void 0 &&
                this.lastPairingRefuse.code !== "timeout"))
          )
            (clearTimeout(o), t(!1));
          else r = setTimeout(c, 500);
        };
      c();
    });
  }
  armTimeout(e) {
    let { serverName: serverName } = this.context;
    (clearTimeout(e.timer),
      (e.timer = setTimeout(() => {
        if (this.pending !== e) return;
        (this.failPending(
          new ToolCallTimeoutError(`[${serverName}] Tool request timed out after ${e.timeoutMs}ms`),
        ),
          this.closeSocket(),
          this.scheduleReconnect());
      }, e.timeoutMs)));
  }
  writeRaw(e, t) {
    if (!this.socket || this.socket.destroyed) return;
    let n = t ?? Buffer.from(JSON.stringify(e), "utf-8"),
      allocUnsafe = Buffer.allocUnsafe(4);
    (allocUnsafe.writeUInt32LE(n.length, 0), this.socket.write(Buffer.concat([allocUnsafe, n])));
  }
  writeFrame(e) {
    if (this.context.localPairing)
      throw Error("clear-text frames are disabled when local pairing is configured");
    this.writeRaw(e);
  }
  async sendRequest(e, t, n) {
    let { serverName: serverName } = this.context;
    if (this.pairingAgedOut()) this.closeSocket();
    if (!this.socket || this.socket.destroyed || (this.context.localPairing && !this.connected))
      throw new SocketConnectionError(`[${serverName}] Cannot send request: not connected`);
    return new Promise((i, s) => {
      this.failPending(
        new ToolCallSupersededError(
          `[${serverName}] Superseded by a newer tool request on the same connection`,
        ),
      );
      let now = Date.now(),
        c = {
          toolUseId: e.params.tool_use_id,
          resolve: (a, u) => i({ response: a, responseBytes: u, sentAt: now }),
          reject: s,
          timeoutMs: t,
          onPermissionRequest: n,
        };
      if ((this.armTimeout(c), (this.pending = c), this.context.localPairing))
        this.writeSealed(c.toolUseId, e).catch((a) => {
          if (this.pending === c)
            this.failPending(a instanceof Error ? a : new SocketConnectionError(String(a)));
        });
      else this.writeFrame(e);
    });
  }
  async callTool(e, t, n) {
    let r = {
        method: "execute_tool",
        params: {
          client_id: this.context.clientTypeId,
          tool: e,
          args: t,
          tool_use_id: randomUUID(),
          ...permissionContextFields(n),
        },
      },
      { trackEvent: trackEvent } = this.context,
      s = this.context.getToolCallTimeoutMs?.(e) ?? BROWSER_TOOL_TIMEOUT_MS,
      o = n?.sessionScope,
      now = Date.now(),
      a = {
        tool_name: `browser:${e}`,
        tool_use_id: r.params.tool_use_id,
        session_id: o?.sessionId,
        user_message_uuid: o?.userMessageUuid,
        transport: "native",
      };
    trackEvent?.("chrome_bridge_tool_call_started", {
      ...a,
      timeout_ms: s,
      request_bytes: Buffer.byteLength(JSON.stringify(r), "utf-8"),
    });
    let u = (h, U, rt) => {
        trackEvent?.("chrome_bridge_tool_call_error", {
          ...a,
          duration_ms: Date.now() - U,
          error_type: rt ?? classifyToolError(e, h),
        });
      },
      l;
    try {
      l = await this.sendRequestWithRetry(r, s, n?.onPermissionRequest);
    } catch (error) {
      if (error instanceof ToolCallTimeoutError)
        trackEvent?.("chrome_bridge_tool_call_timeout", {
          ...a,
          duration_ms: Date.now() - now,
          timeout_ms: s,
        });
      else
        u(
          error instanceof Error ? error.message : String(error),
          now,
          error instanceof RequestTooLargeError ? "request_too_large" : void 0,
        );
      throw error;
    }
    let { response: response, responseBytes: responseBytes, sentAt: sentAt } = l;
    if ("error" in response) u(firstTextContent(response.error), sentAt);
    else
      trackEvent?.("chrome_bridge_tool_call_completed", {
        ...a,
        duration_ms: Date.now() - sentAt,
        response_bytes: responseBytes,
      });
    return response;
  }
  async sendRequestWithRetry(e, t, n) {
    let { serverName: serverName, logger: logger } = this.context;
    try {
      return await this.sendRequest(e, t, n);
    } catch (error) {
      if (!(error instanceof SocketConnectionError)) throw error;
      if (
        (logger.info(`[${serverName}] Connection error, forcing reconnect and retrying: ${error.message}`),
        !this.connecting)
      )
        this.closeSocket();
      let o;
      try {
        o = await this.ensureConnected();
      } catch (error) {
        if (!(this.context.localPairing && this.lastPairingRefuse)) throw error;
        o = !1;
      }
      let lastPairingRefuse = this.lastPairingRefuse;
      if (!o && this.context.localPairing && lastPairingRefuse) {
        let a = lastPairingRefuse.peerReported
          ? `reported by the extension, unverified: ${lastPairingRefuse.code}`
          : lastPairingRefuse.code;
        throw new SocketConnectionError(
          `[${serverName}] Claude in Chrome isn't paired with your browser (${a})`,
        );
      }
      return await this.sendRequest(e, t, n);
    }
  }
  isConnected() {
    return this.connected;
  }
  isConnecting() {
    return this.connecting;
  }
  clearConnectTimer() {
    if (this.connectTimer) (clearTimeout(this.connectTimer), (this.connectTimer = null));
  }
  closeSocket() {
    ((this.connectEpoch += 1), this.clearConnectTimer(), this.clearPairingProbe());
    let handshaking = this.handshaking;
    if (((this.handshaking = !1), this.socket))
      (this.socket.removeAllListeners(), this.socket.end(), this.socket.destroy(), (this.socket = null));
    ((this.responseBuffer = Buffer.alloc(0)),
      (this.responseChunks = []),
      (this.responseChunkBytes = 0),
      (this.connected = !1),
      (this.connecting = !1),
      this.clearPairing(handshaking),
      this.failPending(
        new ExtensionDisconnectedMidCallError(
          `[${this.context.serverName}] Native host connection closed before the tool responded`,
        ),
      ));
  }
  clearReconnectTimer() {
    if (this.reconnectTimer) (clearTimeout(this.reconnectTimer), (this.reconnectTimer = null));
  }
  failPending(e) {
    let pending = this.pending;
    if (!pending) return;
    ((this.pending = null), clearTimeout(pending.timer), pending.reject(e));
  }
  disconnect() {
    (this.clearReconnectTimer(),
      this.failPending(
        new ExtensionDisconnectedMidCallError(`[${this.context.serverName}] Socket client disconnected`),
      ),
      this.closeSocket(),
      (this.reconnectAttempts = 0));
  }
  async validateSocketSecurity(e) {
    let { serverName: serverName, logger: logger } = this.context;
    if (platform() === "win32" || this.context.connectVerified) return !0;
    try {
      let r = dirname(e);
      if ((r.split("/").pop() || "").startsWith("claude-mcp-browser-bridge-"))
        try {
          let stats = await promises.lstat(r);
          if (stats.isSymbolicLink())
            throw Error(
              `[${serverName}] Socket directory is a symlink: ${r}. Directory may have been tampered with.`,
            );
          if (stats.isDirectory()) {
            let l = stats.mode & 511;
            if (l !== 448)
              throw Error(
                `[${serverName}] Insecure socket directory permissions: ${l.toString(8)} (expected 0700). Directory may have been tampered with.`,
              );
            let p = process.getuid?.();
            if (p !== void 0 && stats.uid !== p)
              throw Error(
                `Socket directory not owned by current user (uid: ${p}, dir uid: ${stats.uid}). Potential security risk.`,
              );
          }
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
          return (logger.info(`[${serverName}] Socket directory not found; not dialing`), !1);
        }
      let stats = await promises.lstat(e);
      if (!stats.isSocket()) throw Error(`[${serverName}] Path exists but it's not a socket: ${e}`);
      let c = stats.mode & 511;
      if (c !== 384)
        throw Error(
          `[${serverName}] Insecure socket permissions: ${c.toString(8)} (expected 0600). Socket may have been tampered with.`,
        );
      let a = process.getuid?.();
      if (a !== void 0 && stats.uid !== a)
        throw Error(
          `Socket not owned by current user (uid: ${a}, socket uid: ${stats.uid}). Potential security risk.`,
        );
      return (this.logDial(`[${serverName}] Socket security validation passed`), !0);
    } catch (error) {
      if (error.code === "ENOENT") return (logger.info(`[${serverName}] Socket not found; not dialing`), !1);
      throw error;
    }
  }
}
//@ chunk-p7xf186d.js:55071-55104 placement
function createChromeSocketClient(e) {
  return new ChromeSocketClient(e);
}
//@ chunk-p7xf186d.js:55104-55174 placement
function sNi(e) {
  let t = getPairingContext(e);
  if (!t) return !1;
  return (t.source.clear(), !0);
}

export {
  NoExtensionConnectedError,
  ExtensionDisconnectedMidCallError,
  createChromeSocketClient,
  quoteTruncated,
  SocketConnectionError,
  permissionContextFields,
  toolCallMeta,
  ToolCallTimeoutError,
  pairingErrorMessage,
  ToolCallSupersededError,
  RequestTooLargeError,
};

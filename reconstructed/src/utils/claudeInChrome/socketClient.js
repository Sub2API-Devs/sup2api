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
      e.action_data && typeof e.action_data === "object" ? stripPrivateOptions(e.action_data) : undefined,
    category: normalizeCategory(e.category),
  };
}
//@ chunk-p7xf186d.js:28175-28438 placement
function permissionContextFields(e) {
  return {
    ...(e?.permissionMode
      ? {
          permission_mode: e.permissionMode,
        }
      : {}),
    ...(e?.allowedDomains?.length
      ? {
          allowed_domains: e.allowedDomains,
        }
      : {}),
    ...(e?.onPermissionRequest
      ? {
          handle_permission_prompts: true,
        }
      : {}),
    ...(e?.sessionScope
      ? {
          session_scope: e.sessionScope,
        }
      : {}),
  };
}
//@ chunk-p7xf186d.js:28438-28503 placement
function quoteTruncated(e, t = 64) {
  return JSON.stringify(String(e).slice(0, t));
}
//@ chunk-p7xf186d.js:28503-28585 placement
class SocketConnectionError extends Error {
  constructor(message) {
    super(message);
    this.name = "SocketConnectionError";
  }
}
//@ chunk-p7xf186d.js:28585-28670 placement
class ToolCallSupersededError extends Error {
  constructor(message) {
    super(message);
    this.name = "ToolCallSupersededError";
  }
}
//@ chunk-p7xf186d.js:28670-28757 placement
class NoExtensionConnectedError extends Error {
  constructor(message) {
    super(message);
    this.name = "NoExtensionConnectedError";
  }
}
//@ chunk-p7xf186d.js:28757-28906 placement
class ToolCallTimeoutError extends Error {
  routingAckReceived;
  constructor(message, t) {
    super(message);
    this.name = "ToolCallTimeoutError";
    this.routingAckReceived = t?.routingAckReceived;
  }
}
//@ chunk-p7xf186d.js:28906-29000 placement
class ExtensionDisconnectedMidCallError extends Error {
  constructor(message) {
    super(message);
    this.name = "ExtensionDisconnectedMidCallError";
  }
}
//@ chunk-p7xf186d.js:29000-29082 placement
class RequestTooLargeError extends Error {
  constructor(message) {
    super(message);
    this.name = "RequestTooLargeError";
  }
}
//@ chunk-p7xf186d.js:29082-29129 placement = _temp (1)
/**
 * 判断解析结果是否为 JSON-RPC 响应（有 result 或 error）。
 */
function isJsonRpcResult(r) {
  return "result" in r || "error" in r;
}
//@ chunk-p7xf186d.js:29129-29191 placement
/**
 * 判断解析结果是否为 JSON-RPC 请求（有字符串 method）。
 */
function isJsonRpcRequest(e) {
  return "method" in e && typeof e.method === "string";
}
//@ chunk-p7xf186d.js:29191-29311 placement
var CONNECT_TIMEOUT_MS = 5000;
var PAIRING_REPLY_TIMEOUT_MS = 15000;
var HANDSHAKE_STEP_TIMEOUT_MS = 15000;
var PAIRING_MAX_AGE_MS = 28800000;
var FORCED_TEARDOWN_GRACE_MS = 1000;
var RECONNECT_WAIT_MS = 20000;
var LIVENESS_PROBE_INTERVAL_MS = 5000;
var LIVENESS_PROBE_TIMEOUT_MS = 1e4;
var MAX_LOCAL_FRAME_BYTES = 1032192;
var FRAME_OVERHEAD_BYTES = 1024;
var MAX_REQUEST_PAYLOAD_BYTES = Math.floor(((MAX_LOCAL_FRAME_BYTES - FRAME_OVERHEAD_BYTES) * 3) / 4) - 16;
//@ chunk-p7xf186d.js:29311-29418 placement
class PeerRefusedPairing extends PairingError {
  constructor(e, httpStatus) {
    super(e, "peer-reported", {
      httpStatus,
    });
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
    let refusal = parseRefusal(error.local_pairing);
    let code = error.local_pairing.code;
    let httpStatus =
      typeof code === "string" && /^attest_failed:\d{1,3}$/.test(code) ? Number(code.slice(14)) : undefined;
    throw new PeerRefusedPairing(refusal ?? "malformed", httpStatus);
  }
  if (t === "accept" && isNoToolSpecifiedError(e)) throw new PeerRefusedPairing("unsupported_peer");
  throw new PairingError("malformed", "unrecognised reply to a pairing message");
}
//@ chunk-p7xf186d.js:30110-30158 placement
/**
 * 判断 HTTP 状态是否可重试（未给、小于 400 或大于等于 500）。
 */
function isRetriableHttpStatus(httpStatus) {
  return httpStatus === undefined || httpStatus < 400 || httpStatus >= 500;
}
//@ chunk-p7xf186d.js:30158-30203 placement
/**
 * 表示连接已死的 errno（ENOENT、ECONNREFUSED）。
 */
var isDeadConnectionCode = (code) => code === "ENOENT" || code === "ECONNREFUSED";
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
function isRetryablePairingError(error) {
  if (!(error instanceof PairingError)) return false;
  switch (error.code) {
    case "jwks_unavailable":
      return true;
    case "attest_failed":
      return isRetriableHttpStatus(error.httpStatus);
    case "not_signed_in":
      return !(error instanceof PeerRefusedPairing) && error.cause !== undefined;
    default:
      return false;
  }
}
//@ chunk-p7xf186d.js:30793-30940 placement
function isNoToolSpecifiedError(e) {
  let content = e.error?.content;
  if (!Array.isArray(content) || content.length !== 1) return false;
  let n = content[0];
  return n?.type === "text" && n.text === "No tool specified";
}
//@ chunk-p7xf186d.js:30940-31099 placement
function requestTooLargeError(e, t = MAX_LOCAL_FRAME_BYTES) {
  return new RequestTooLargeError(
    `Request too large for the local browser connection (${e} bytes; limit ${t}). Send smaller inputs or fewer files per call.`,
  );
}
//@ chunk-p7xf186d.js:31099-31223 placement
function peerMaxReassemblyBytes(pairing) {
  let maxReassemblyBytes = pairing.peerInstance?.max_reassembly_bytes;
  return typeof maxReassemblyBytes === "number" &&
    Number.isSafeInteger(maxReassemblyBytes) &&
    maxReassemblyBytes > 0
    ? maxReassemblyBytes
    : undefined;
}
//@ chunk-p7xf186d.js:31223-31336 placement
function isInferenceRequest(e) {
  let t = e;
  return !!t && typeof t === "object" && typeof t.max_tokens === "number" && Array.isArray(t.messages);
}
//@ chunk-p7xf186d.js:31336-55071 placement
/**
 * 与 Chrome 扩展通信的 socket 客户端：连接、配对握手、请求发送与超时、断线处理。
 */
class ChromeSocketClient {
  socket = null;
  connected = false;
  connecting = false;
  connectEpoch = 0;
  pending = null;
  currentPath;
  handshaking = false;
  pairing = null;
  pairingWaiter = null;
  pairingExpired = false;
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
  disableAutoReconnect = false;
  onRedialWanted;
  pairingProbeTimer = null;
  probeToolUseId;
  probesAnswered = 0;
  constructor(context) {
    this.context = context;
  }
  async connect() {
    let { serverName, logger } = this.context;
    if (this.connecting) {
      logger.info(`[${serverName}] Already connecting, skipping duplicate attempt`);
      return;
    }
    this.closeSocket();
    this.connecting = true;
    this.lastPairingRefuse = undefined;
    let connectEpoch = this.connectEpoch;
    let r = this.context.getSocketPath?.() ?? this.context.socketPath;
    this.currentPath = r;
    this.logDial(`[${serverName}] Attempting to connect to: ${r}`);
    let i;
    try {
      i = await this.validateSocketSecurity(r);
    } catch (error) {
      if (connectEpoch === this.connectEpoch) this.connecting = false;
      logger.info(`[${serverName}] Security validation failed:`, error);
      return;
    }
    if (!i) {
      if (connectEpoch === this.connectEpoch) {
        this.connecting = false;
        this.scheduleReconnect("dead");
      }
      return;
    }
    if (connectEpoch !== this.connectEpoch) return;
    let localPairing = this.context.localPairing;
    if (localPairing && !(await this.ownIdentityPresent(localPairing, connectEpoch))) return;
    let o;
    let { connectVerified } = this.context;
    if (connectVerified) {
      try {
        o = await connectVerified(r);
      } catch (error) {
        if (connectEpoch !== this.connectEpoch) return;
        this.connecting = false;
        let code = error.code;
        if (isDeadConnectionCode(code)) {
          logger.info(`[${serverName}] Socket not found; not dialing`);
          this.scheduleReconnect("dead");
        } else if (code === "EPERM" || code === "EACCES" || code === "EPEERCRED" || !code)
          logger.info(`[${serverName}] Security validation failed:`, error);
        else {
          logger.info(`[${serverName}] Verified dial failed:`, error);
          this.scheduleReconnect();
        }
        return;
      }
      if (connectEpoch !== this.connectEpoch) {
        o.destroy();
        return;
      }
    } else o = createConnection(r);
    this.socket = o;
    let a = () => {
      this.clearConnectTimer();
      this.clearReconnectTimer();
      if (localPairing) {
        this.reconnectAttempts = Math.min(this.reconnectAttempts, this.maxReconnectAttempts);
        this.pair(connectEpoch, localPairing);
        return;
      }
      this.connected = true;
      this.connecting = false;
      this.reconnectAttempts = 0;
      logger.info(`[${serverName}] Successfully connected to bridge server`);
    };
    o.on("data", (u) => {
      let responseBuffer = this.responseBuffer;
      let p = responseBuffer.length + this.responseChunkBytes + u.length;
      if (responseBuffer.length >= 4 && p < 4 + responseBuffer.readUInt32LE(0)) {
        this.responseChunks.push(u);
        this.responseChunkBytes += u.length;
        return;
      }
      if (this.responseChunks.length > 0) {
        this.responseBuffer = Buffer.concat([responseBuffer, ...this.responseChunks, u], p);
        this.responseChunks = [];
        this.responseChunkBytes = 0;
      } else this.responseBuffer = responseBuffer.length === 0 ? u : Buffer.concat([responseBuffer, u], p);
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
          if (isJsonRpcRequest(parsed)) {
            logger.info(`[${serverName}] Received notification: ${quoteTruncated(parsed.method)}`);
            if (!(parsed.method === "permission_request" && this.claimPermissionRequest(parsed.params)))
              this.notificationHandler?.(parsed);
          } else if (isJsonRpcResult(parsed)) {
            logger.info(
              `[${serverName}] Received tool response for ${quoteTruncated(parsed.tool_use_id ?? "(untagged)")}`,
            );
            this.handleResponse(parsed, uInt32LE);
          } else logger.info(`[${serverName}] Received a message of unknown shape`);
        } catch (error) {
          logger.info(`[${serverName}] Failed to parse message:`, error);
        }
      }
    });
    o.on("error", (u) => {
      logger.info(`[${serverName}] Socket error (code: ${u.code}):`, u);
      this.closeSocket();
      this.scheduleReconnect(isDeadConnectionCode(u.code) ? "dead" : "transport");
    });
    o.on("close", () => {
      this.closeSocket();
      this.scheduleReconnect();
    });
    if (connectVerified) {
      a();
      return;
    }
    this.connectTimer = setTimeout(() => {
      if (!this.connected) {
        logger.info(`[${serverName}] Connection attempt timed out after ${CONNECT_TIMEOUT_MS}ms`);
        this.closeSocket();
        this.scheduleReconnect();
      }
    }, CONNECT_TIMEOUT_MS);
    o.on("connect", a);
  }
  scheduleReconnect(e = "transport") {
    let { serverName, logger } = this.context;
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
      logger.info(`[${serverName}] Giving up after ${r} attempts. Will retry on next tool call.`);
      this.reconnectAttempts = 0;
      return;
    }
    let min = Math.min(this.reconnectDelay * Math.pow(1.5, this.reconnectAttempts - 1), 30000);
    if (this.reconnectAttempts <= this.maxReconnectAttempts)
      logger.info(`[${serverName}] Reconnecting in ${Math.round(min)}ms (attempt ${this.reconnectAttempts})`);
    else if (this.reconnectAttempts % 10 === 0)
      logger.info(`[${serverName}] Still polling for native host (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, min);
  }
  dispatchPairingRail(e, t) {
    let { serverName, logger } = this.context;
    if (!e || typeof e !== "object") {
      logger.info(`[${serverName}] Dropping a non-object frame`);
      return;
    }
    if (!this.connected) {
      if (
        this.pairingWaiter &&
        isJsonRpcResult(e) &&
        (e.tool_use_id === this.pairingWaiter.toolUseId ||
          (e.tool_use_id === undefined && this.pairingWaiter.acceptsUntagged && isNoToolSpecifiedError(e)))
      ) {
        let pairingWaiter = this.pairingWaiter;
        this.pairingWaiter = null;
        clearTimeout(pairingWaiter.timer);
        pairingWaiter.resolve(e);
        return;
      }
      logger.info(`[${serverName}] Dropping frame received before the connection was admitted`);
      return;
    }
    this.dispatchSealed(e, t);
  }
  async pair(e, t) {
    let { serverName, logger } = this.context;
    let i = this.currentPath ?? this.context.socketPath;
    this.handshaking = true;
    this.reportPairingState(t, {
      state: "pairing",
      socketPath: i,
    });
    try {
      let { source, jwks } = ensurePairingContext(t);
      let c = new LocalPairingHandshake({
        source,
        jwks,
        policy: {
          requiredOrg: t.requiredOrg,
        },
        instanceHint: t.instanceHint,
      });
      let min = Math.min(
        FORCED_TEARDOWN_GRACE_MS,
        this.forcedTeardownAt + FORCED_TEARDOWN_GRACE_MS - Date.now(),
      );
      if (min > 0) {
        await new Promise((resolve) => setTimeout(resolve, min).unref?.());
        if (e !== this.connectEpoch) return;
      }
      let u = await this.withPairingStepDeadline(c.createOffer());
      if (e !== this.connectEpoch) return;
      let l = handlePairingResult(
        await this.exchangePairing(
          {
            ...u,
          },
          true,
        ),
        "accept",
      );
      if (e !== this.connectEpoch) return;
      let p = await this.withPairingStepDeadline(c.onAccept(l));
      if (e !== this.connectEpoch) return;
      let y = handlePairingResult(
        await this.exchangePairing(
          {
            ...p,
          },
          false,
        ),
        "done",
      );
      if (e !== this.connectEpoch) return;
      let g = await c.onDone(y);
      if (e !== this.connectEpoch) {
        g.channel.tearDown();
        return;
      }
      if (!this.socket || this.socket.destroyed) {
        g.channel.tearDown();
        this.closeSocket();
        this.scheduleReconnect();
        return;
      }
      this.pairing = g;
      this.pairingExpired = false;
      this.pairingAgeTimer = setTimeout(() => {
        if (this.pairing !== g) return;
        this.pairingExpired = true;
        if (!this.pending) {
          this.expirePairing();
          return;
        }
        this.startAgeGrace(this.pending);
      }, PAIRING_MAX_AGE_MS);
      this.pairingAgeTimer.unref?.();
      this.handshaking = false;
      this.connected = true;
      this.connecting = false;
      this.reconnectAttempts = 0;
      this.probesAnswered = 0;
      this.schedulePairingProbe();
      this.loggedRefusal = undefined;
      logger.info(
        `[${serverName}] Local pairing established with ${i} (peer ${g.peer.client_kind}, sid ${g.sidB64.slice(0, 8)}\u2026)`,
      );
      this.reportPairingState(t, {
        state: "established",
        socketPath: i,
        peerKind: g.peer.client_kind,
        peerInstance: g.peerInstance,
        assertionExp: g.peer.exp,
      });
    } catch (error) {
      if (e !== this.connectEpoch) return;
      this.handshaking = false;
      if (error instanceof HandshakeTimeout) {
        logger.warn(`[${serverName}] ${error.message} (${i}); reconnecting`);
        this.lastPairingRefuse = {
          code: "timeout",
          peerReported: false,
        };
        this.reportPairingState(t, {
          state: "refused",
          socketPath: i,
          code: "timeout",
          wire: "timeout",
          peerReported: false,
        });
        this.closeSocket();
        this.scheduleReconnect();
        return;
      }
      let o = error instanceof PeerRefusedPairing;
      let c = error instanceof PairingError ? error : undefined;
      let code = c?.code ?? "malformed";
      let u = c?.wireCode() ?? code;
      this.logRefusal(
        `[${serverName}] Local pairing with ${i} refused: ${u}${o ? " (peer-reported, unauthenticated)" : ""}`,
        c ? undefined : error,
      );
      this.lastPairingRefuse = {
        code,
        peerReported: o,
      };
      this.reportPairingState(t, {
        state: "refused",
        socketPath: i,
        code,
        wire: u,
        ...(c?.httpStatus !== undefined && {
          httpStatus: c.httpStatus,
        }),
        peerReported: o,
      });
      this.closeSocket();
      if (isRetryablePairingError(error)) this.scheduleReconnect();
    }
  }
  async ownIdentityPresent(e, t) {
    let { serverName } = this.context;
    let r = this.currentPath ?? this.context.socketPath;
    let i;
    let s = false;
    try {
      i = await this.withPairingStepDeadline(e.getBearer());
    } catch {
      s = true;
    }
    if (t !== this.connectEpoch) return false;
    if (i) return true;
    this.connecting = false;
    this.lastPairingRefuse = {
      code: "not_signed_in",
      peerReported: false,
    };
    this.logRefusal(
      `[${serverName}] Local pairing with ${r} refused: not_signed_in (no bearer of our own${s ? "; token source failed" : ""}; not dialing)`,
    );
    this.reportPairingState(e, {
      state: "refused",
      socketPath: r,
      code: "not_signed_in",
      wire: "not_signed_in",
      peerReported: false,
    });
    if (s) this.scheduleReconnect();
    return false;
  }
  logRefusal(e, ...t) {
    if (e === this.loggedRefusal) {
      this.context.logger.debug(e, ...t);
      return;
    }
    this.loggedRefusal = e;
    this.context.logger.warn(e, ...t);
  }
  logDial(e) {
    if (this.loggedRefusal === undefined) this.context.logger.info(e);
    else this.context.logger.debug(e);
  }
  withPairingStepDeadline(e) {
    let t;
    let promise = new Promise((resolve, reject) => {
      t = setTimeout(() => reject(new HandshakeTimeout("step")), HANDSHAKE_STEP_TIMEOUT_MS);
      t.unref?.();
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
  exchangePairing(localPairing, acceptsUntagged) {
    return new Promise((resolve, reject) => {
      let i = randomUUID();
      let timer = setTimeout(() => {
        if (this.pairingWaiter?.toolUseId === i) {
          this.pairingWaiter = null;
          reject(new HandshakeTimeout("reply"));
        }
      }, PAIRING_REPLY_TIMEOUT_MS);
      if (this.pairingWaiter) {
        clearTimeout(this.pairingWaiter.timer);
        this.pairingWaiter.reject(new HandshakeTimeout("reply"));
      }
      this.pairingWaiter = {
        toolUseId: i,
        acceptsUntagged,
        resolve,
        reject,
        timer,
      };
      this.writeRaw({
        method: "execute_tool",
        params: {
          client_id: this.context.clientTypeId,
          tool_use_id: i,
          local_pairing: localPairing,
        },
      });
    });
  }
  async writeSealed(e, t) {
    let pairing = this.pairing;
    if (!pairing || !this.connected)
      throw new SocketConnectionError(`[${this.context.serverName}] Cannot send request: not paired`);
    let r = Buffer.byteLength(JSON.stringify(t), "utf-8");
    let i = peerMaxReassemblyBytes(pairing);
    let s = r > MAX_REQUEST_PAYLOAD_BYTES && i !== undefined;
    if (s && r > i) throw requestTooLargeError(r, i);
    if (!s && Math.ceil((r * 4) / 3) > MAX_LOCAL_FRAME_BYTES)
      throw requestTooLargeError(Math.ceil((r * 4) / 3));
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
        `[${this.context.serverName}] Sealed request sliced into ${o.length} frames (${r} bytes, max ${MAX_REQUEST_PAYLOAD_BYTES} per slice)`,
      );
    let mapped = o.map((sealed) => {
      let u = {
        method: "execute_tool",
        params: {
          tool_use_id: e,
          sealed,
        },
      };
      let buffer = Buffer.from(JSON.stringify(u), "utf-8");
      if (buffer.length > MAX_LOCAL_FRAME_BYTES) throw requestTooLargeError(buffer.length);
      return {
        frame: u,
        bytes: buffer,
      };
    });
    for (let { frame, bytes } of mapped) this.writeRaw(frame, bytes);
  }
  async answerInferenceRequest(e, t, n) {
    let { serverName, logger, localPairing } = this.context;
    let o;
    try {
      if (!e || !isInferenceRequest(t))
        o = {
          ok: false,
          error: "malformed",
        };
      else if (this.context.isDisabled?.() || !localPairing?.onInferenceRequest)
        o = {
          ok: false,
          error: "not_supported",
        };
      else o = await localPairing.onInferenceRequest(t);
      let a = Math.ceil((Buffer.byteLength(JSON.stringify(o), "utf-8") * 4) / 3);
      if (a > MAX_LOCAL_FRAME_BYTES) {
        logger.warn(`[${serverName}] inference_response too large (${a} bytes); answering too_large`);
        o = {
          ok: false,
          error: "too_large",
        };
      }
    } catch (error) {
      logger.warn(`[${serverName}] inference seam failed:`, error);
      o = {
        ok: false,
        error: "handler_error",
      };
    }
    let pairing = this.pairing;
    if (n !== this.connectEpoch || !pairing) return;
    try {
      let sealed = await pairing.channel.seal("notification:inference_response", e, {
        method: "inference_response",
        params: {
          request_id: e,
          result: o,
        },
      });
      if (n !== this.connectEpoch || this.pairing !== pairing) return;
      let u = {
        method: "inference_response",
        params: {
          request_id: e,
          sealed,
        },
      };
      let buffer = Buffer.from(JSON.stringify(u), "utf-8");
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
    return this.lastPairingRefuse?.peerReported ?? false;
  }
  isPaired() {
    return this.connected && this.pairing !== null;
  }
  pairingAgedOut() {
    if (!this.pairing) return false;
    if (Date.now() / 1000 - this.pairing.establishedAt > PAIRING_MAX_AGE_MS / 1000)
      this.pairingExpired = true;
    if (this.pairingExpired && this.pending) this.startAgeGrace(this.pending);
    return this.pairingExpired;
  }
  startAgeGrace(e) {
    if (this.pairingGraceTimer) return;
    let pairing = this.pairing;
    this.pairingGraceTimer = setTimeout(() => {
      if (this.pairing === pairing) this.expirePairing();
    }, e.timeoutMs);
    this.pairingGraceTimer.unref?.();
  }
  forceRepair(e, t = false) {
    this.forcedTeardownAt = Date.now();
    this.failPending(e);
    this.closeSocket();
    this.scheduleReconnect(t ? "peer_dropped" : "transport");
  }
  schedulePairingProbe() {
    this.clearPairingProbe();
    this.pairingProbeTimer = setTimeout(() => {
      this.pairingProbeTimer = null;
      if (!this.connected || !this.pairing) return;
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
        params: {
          client_id: this.context.clientTypeId,
          tool_use_id: randomUUID(),
        },
      };
      this.probeToolUseId = e.params.tool_use_id;
      let t = () => {
        this.probeToolUseId = undefined;
        if (this.connected && this.pairing) this.schedulePairingProbe();
      };
      this.sendRequest(e, LIVENESS_PROBE_TIMEOUT_MS).then(() => {
        this.probesAnswered += 1;
        if (this.probesAnswered === 1)
          this.context.logger.info(
            `[${this.context.serverName}] Local pairing liveness probe answered; probing every ${(this.context.localPairing?.probeIntervalMs ?? LIVENESS_PROBE_INTERVAL_MS) / 1000} s while idle`,
          );
        else
          this.context.logger.debug(
            `[${this.context.serverName}] Local pairing liveness probe ${this.probesAnswered} answered`,
          );
        t();
      }, t);
    }, this.context.localPairing?.probeIntervalMs ?? LIVENESS_PROBE_INTERVAL_MS);
    this.pairingProbeTimer.unref?.();
  }
  probesAnsweredCount() {
    return this.probesAnswered;
  }
  clearPairingProbe() {
    if (this.pairingProbeTimer) {
      clearTimeout(this.pairingProbeTimer);
      this.pairingProbeTimer = null;
    }
  }
  expirePairing() {
    this.context.logger.info(
      `[${this.context.serverName}] Local pairing reached its maximum age; re-pairing`,
    );
    this.closeSocket();
    this.scheduleReconnect();
  }
  clearPairing(e) {
    if (this.pairingWaiter) {
      clearTimeout(this.pairingWaiter.timer);
      let pairingWaiter = this.pairingWaiter;
      this.pairingWaiter = null;
      pairingWaiter.reject(new HandshakeTimeout("reply"));
    }
    if (this.pairingAgeTimer) {
      clearTimeout(this.pairingAgeTimer);
      this.pairingAgeTimer = null;
    }
    if (this.pairingGraceTimer) {
      clearTimeout(this.pairingGraceTimer);
      this.pairingGraceTimer = null;
    }
    let pairing = this.pairing;
    let reason = !pairing
      ? "handshake_aborted"
      : pairing.channel.isTornDown
        ? "forged_frames"
        : this.pairingExpired
          ? "expired"
          : "connection_closed";
    this.pairing?.channel.tearDown();
    this.pairing = null;
    this.pairingExpired = false;
    if ((pairing || e) && this.context.localPairing)
      this.reportPairingState(this.context.localPairing, {
        state: "closed",
        socketPath: this.currentPath ?? this.context.socketPath,
        reason,
      });
  }
  async dispatchSealed(e, t) {
    let { serverName, logger } = this.context;
    let pairing = this.pairing;
    if (!pairing) return;
    let s;
    let o;
    let c;
    if (isJsonRpcRequest(e)) {
      if (e.method === "permission_request") {
        s = "notification:permission_request";
        let toolUseId = e.params?.tool_use_id;
        o = typeof toolUseId === "string" ? toolUseId : undefined;
      } else if (e.method === "sealed_broadcast") {
        s = "notification:sealed_broadcast";
        o = undefined;
      } else if (e.method === "inference_request") {
        s = "notification:inference_request";
        let requestId = e.params?.request_id;
        o = typeof requestId === "string" ? requestId : undefined;
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
      s = "tool_response";
      o = l.tool_use_id;
      c = l.sealed;
      if (c === undefined && o === this.pending?.toolUseId && l.error?.local_pairing) {
        logger.warn(
          `[${serverName}] Peer reports the pairing is unknown to it${o === this.probeToolUseId ? " (it dropped the pairing; found by the liveness probe)" : ""}; re-pairing`,
        );
        this.forceRepair(
          new ExtensionDisconnectedMidCallError(
            `[${serverName}] Peer reports the pairing is unknown; re-pairing`,
          ),
          true,
        );
        return;
      }
    }
    if (c === undefined) {
      logger.info(`[${serverName}] Dropping clear-text ${s} on a paired connection`);
      return;
    }
    if (this.pairingAgedOut() && !(s === "tool_response" && o === this.pending?.toolUseId)) {
      if (this.pending) logger.info(`[${serverName}] Dropping sealed ${s} past the pairing's maximum age`);
      else this.expirePairing();
      return;
    }
    let a = await pairing.channel.open(s, o, c);
    if (t !== this.connectEpoch || this.pairing !== pairing) return;
    if (!a.ok) {
      if (a.reason !== "foreign_sid") logger.warn(`[${serverName}] Sealed ${s} rejected: ${a.reason}`);
      if (pairing.channel.isTornDown) {
        logger.warn(`[${serverName}] Sealed channel torn down; re-pairing`);
        this.forceRepair(
          new ExtensionDisconnectedMidCallError(
            `[${serverName}] Sealed channel to the extension was torn down`,
          ),
        );
      }
      return;
    }
    let inner = a.inner;
    if (!inner || typeof inner !== "object") return;
    try {
      if (s === "tool_response")
        this.handleResponse(
          {
            ...("result" in inner && {
              result: inner.result,
            }),
            ...("error" in inner && {
              error: inner.error,
            }),
            tool_use_id: o,
          },
          Buffer.byteLength(JSON.stringify(inner), "utf-8"),
        );
      else if (s === "notification:permission_request") {
        let params = inner.params ?? {};
        if (inner.method !== "permission_request" || params.tool_use_id !== o) {
          logger.warn(`[${serverName}] Sealed permission_request mislabelled; dropped`);
          return;
        }
        this.claimPermissionRequest(params);
      } else if (s === "notification:inference_request") {
        let params = inner.params ?? {};
        if (inner.method !== "inference_request" || params.request_id !== o) {
          logger.warn(`[${serverName}] Sealed inference_request mislabelled; dropped`);
          return;
        }
        this.answerInferenceRequest(o, params.body, t);
      } else if (this.notificationHandler && typeof inner.method === "string")
        this.notificationHandler({
          method: inner.method,
          params: inner.params ?? undefined,
        });
    } catch (error) {
      logger.error(`[${serverName}] Error handling a sealed ${s}:`, error);
    }
  }
  handleResponse(e, t) {
    let pending = this.pending;
    if (!pending || (typeof e.tool_use_id === "string" && e.tool_use_id !== pending.toolUseId)) return;
    this.pending = null;
    clearTimeout(pending.timer);
    pending.resolve(e, t);
    if (this.pairingAgedOut()) this.expirePairing();
  }
  claimPermissionRequest(e) {
    let pending = this.pending;
    let requestId = e?.request_id;
    if (
      !pending?.onPermissionRequest ||
      typeof requestId !== "string" ||
      e?.tool_use_id !== pending.toolUseId
    )
      return false;
    this.answerPermissionRequest(pending, pending.onPermissionRequest, requestId, e);
    return true;
  }
  async answerPermissionRequest(e, t, n, r) {
    let i = toolCallMeta(r, {
      toolUseId: e.toolUseId,
      requestId: n,
    });
    clearTimeout(e.timer);
    let allowed = false;
    try {
      allowed = await t(i);
    } catch (error) {
      this.context.logger.error(`[${this.context.serverName}] Error handling permission request:`, error);
    }
    if (this.pending !== e) return;
    if (this.pairingAgedOut()) {
      this.expirePairing();
      return;
    }
    let o = {
      method: "permission_response",
      params: {
        request_id: n,
        allowed,
      },
    };
    if (this.context.localPairing) {
      let c = {
        ...o,
        params: {
          ...o.params,
          tool_use_id: e.toolUseId,
        },
      };
      await this.writeSealed(e.toolUseId, c).catch((error) => {
        this.context.logger.warn(`[${this.context.serverName}] Could not send permission_response:`, error);
      });
      if (this.pending !== e) return;
    } else this.writeFrame(o);
    this.armTimeout(e);
  }
  setNotificationHandler(notificationHandler) {
    this.notificationHandler = notificationHandler;
  }
  async ensureConnected() {
    let { serverName } = this.context;
    if (this.connected && this.socket) return true;
    if (!this.socket && !this.connecting) await this.connect();
    return new Promise((resolve, reject) => {
      let r = null;
      let i = CONNECT_TIMEOUT_MS;
      let s = () => {
        if (this.connected) {
          if (r) clearTimeout(r);
          resolve(true);
          return;
        }
        if (
          this.context.localPairing &&
          (this.handshaking || this.lastPairingRefuse?.code === "timeout") &&
          i < RECONNECT_WAIT_MS
        ) {
          i = RECONNECT_WAIT_MS;
          timer = setTimeout(s, i - CONNECT_TIMEOUT_MS);
          return;
        }
        if (r) clearTimeout(r);
        reject(new SocketConnectionError(`[${serverName}] Connection attempt timed out after ${i}ms`));
      };
      let timer = setTimeout(s, i);
      let c = () => {
        if (this.connected) {
          clearTimeout(timer);
          resolve(true);
        } else if (
          !this.socket &&
          !this.connecting &&
          (!this.reconnectTimer ||
            (this.context.localPairing &&
              this.lastPairingRefuse !== undefined &&
              this.lastPairingRefuse.code !== "timeout"))
        ) {
          clearTimeout(timer);
          resolve(false);
        } else r = setTimeout(c, 500);
      };
      c();
    });
  }
  armTimeout(e) {
    let { serverName } = this.context;
    clearTimeout(e.timer);
    e.timer = setTimeout(() => {
      if (this.pending !== e) return;
      this.failPending(
        new ToolCallTimeoutError(`[${serverName}] Tool request timed out after ${e.timeoutMs}ms`),
      );
      this.closeSocket();
      this.scheduleReconnect();
    }, e.timeoutMs);
  }
  writeRaw(e, t) {
    if (!this.socket || this.socket.destroyed) return;
    let n = t ?? Buffer.from(JSON.stringify(e), "utf-8");
    let r = Buffer.allocUnsafe(4);
    r.writeUInt32LE(n.length, 0);
    this.socket.write(Buffer.concat([r, n]));
  }
  writeFrame(e) {
    if (this.context.localPairing)
      throw Error("clear-text frames are disabled when local pairing is configured");
    this.writeRaw(e);
  }
  async sendRequest(e, timeoutMs, onPermissionRequest) {
    let { serverName } = this.context;
    if (this.pairingAgedOut()) this.closeSocket();
    if (!this.socket || this.socket.destroyed || (this.context.localPairing && !this.connected))
      throw new SocketConnectionError(`[${serverName}] Cannot send request: not connected`);
    return new Promise((resolve, reject) => {
      this.failPending(
        new ToolCallSupersededError(
          `[${serverName}] Superseded by a newer tool request on the same connection`,
        ),
      );
      let sentAt = Date.now();
      let c = {
        toolUseId: e.params.tool_use_id,
        resolve: (response, responseBytes) =>
          resolve({
            response,
            responseBytes,
            sentAt,
          }),
        reject,
        timeoutMs,
        onPermissionRequest,
      };
      this.armTimeout(c);
      this.pending = c;
      if (this.context.localPairing)
        this.writeSealed(c.toolUseId, e).catch((error) => {
          if (this.pending === c)
            this.failPending(error instanceof Error ? error : new SocketConnectionError(String(error)));
        });
      else this.writeFrame(e);
    });
  }
  async callTool(e, args, n) {
    let r = {
      method: "execute_tool",
      params: {
        client_id: this.context.clientTypeId,
        tool: e,
        args,
        tool_use_id: randomUUID(),
        ...permissionContextFields(n),
      },
    };
    let { trackEvent } = this.context;
    let s = this.context.getToolCallTimeoutMs?.(e) ?? BROWSER_TOOL_TIMEOUT_MS;
    let sessionScope = n?.sessionScope;
    let now = Date.now();
    let a = {
      tool_name: `browser:${e}`,
      tool_use_id: r.params.tool_use_id,
      session_id: sessionScope?.sessionId,
      user_message_uuid: sessionScope?.userMessageUuid,
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
    };
    let l;
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
          error instanceof RequestTooLargeError ? "request_too_large" : undefined,
        );
      throw error;
    }
    let { response, responseBytes, sentAt } = l;
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
    let { serverName, logger } = this.context;
    try {
      return await this.sendRequest(e, t, n);
    } catch (error) {
      if (!(error instanceof SocketConnectionError)) throw error;
      logger.info(`[${serverName}] Connection error, forcing reconnect and retrying: ${error.message}`);
      if (!this.connecting) this.closeSocket();
      let o;
      try {
        o = await this.ensureConnected();
      } catch (error) {
        if (!(this.context.localPairing && this.lastPairingRefuse)) throw error;
        o = false;
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
    if (this.connectTimer) {
      clearTimeout(this.connectTimer);
      this.connectTimer = null;
    }
  }
  closeSocket() {
    this.connectEpoch += 1;
    this.clearConnectTimer();
    this.clearPairingProbe();
    let handshaking = this.handshaking;
    this.handshaking = false;
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.end();
      this.socket.destroy();
      this.socket = null;
    }
    this.responseBuffer = Buffer.alloc(0);
    this.responseChunks = [];
    this.responseChunkBytes = 0;
    this.connected = false;
    this.connecting = false;
    this.clearPairing(handshaking);
    this.failPending(
      new ExtensionDisconnectedMidCallError(
        `[${this.context.serverName}] Native host connection closed before the tool responded`,
      ),
    );
  }
  clearReconnectTimer() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }
  failPending(e) {
    let pending = this.pending;
    if (!pending) return;
    this.pending = null;
    clearTimeout(pending.timer);
    pending.reject(e);
  }
  disconnect() {
    this.clearReconnectTimer();
    this.failPending(
      new ExtensionDisconnectedMidCallError(`[${this.context.serverName}] Socket client disconnected`),
    );
    this.closeSocket();
    this.reconnectAttempts = 0;
  }
  async validateSocketSecurity(e) {
    let { serverName, logger } = this.context;
    if (platform() === "win32" || this.context.connectVerified) return true;
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
            if (p !== undefined && stats.uid !== p)
              throw Error(
                `Socket directory not owned by current user (uid: ${p}, dir uid: ${stats.uid}). Potential security risk.`,
              );
          }
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
          logger.info(`[${serverName}] Socket directory not found; not dialing`);
          return false;
        }
      let stats = await promises.lstat(e);
      if (!stats.isSocket()) throw Error(`[${serverName}] Path exists but it's not a socket: ${e}`);
      let c = stats.mode & 511;
      if (c !== 384)
        throw Error(
          `[${serverName}] Insecure socket permissions: ${c.toString(8)} (expected 0600). Socket may have been tampered with.`,
        );
      let a = process.getuid?.();
      if (a !== undefined && stats.uid !== a)
        throw Error(
          `Socket not owned by current user (uid: ${a}, socket uid: ${stats.uid}). Potential security risk.`,
        );
      this.logDial(`[${serverName}] Socket security validation passed`);
      return true;
    } catch (error) {
      if (error.code === "ENOENT") {
        logger.info(`[${serverName}] Socket not found; not dialing`);
        return false;
      }
      throw error;
    }
  }
}
//@ chunk-p7xf186d.js:55071-55104 placement
function createChromeSocketClient(context) {
  return new ChromeSocketClient(context);
}
//@ chunk-p7xf186d.js:55104-55174 placement
/**
 * 清除某会话的配对上下文来源。
 */
function clearPairingSource(e) {
  let pairingContext = getPairingContext(e);
  if (!pairingContext) return false;
  pairingContext.source.clear();
  return true;
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

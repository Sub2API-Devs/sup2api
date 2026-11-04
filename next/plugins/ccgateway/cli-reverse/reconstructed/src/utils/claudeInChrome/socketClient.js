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
function toolCallMeta(payload, ids) {
  return {
    toolUseId: ids.toolUseId,
    requestId: ids.requestId,
    toolType: typeof payload.tool_type === "string" ? payload.tool_type : "unknown",
    url: typeof payload.url === "string" ? payload.url : "",
    actionData:
      payload.action_data && typeof payload.action_data === "object"
        ? stripPrivateOptions(payload.action_data)
        : undefined,
    category: normalizeCategory(payload.category),
  };
}
//@ chunk-p7xf186d.js:28175-28438 placement
function permissionContextFields(options) {
  return {
    ...(options?.permissionMode
      ? {
          permission_mode: options.permissionMode,
        }
      : {}),
    ...(options?.allowedDomains?.length
      ? {
          allowed_domains: options.allowedDomains,
        }
      : {}),
    ...(options?.onPermissionRequest
      ? {
          handle_permission_prompts: true,
        }
      : {}),
    ...(options?.sessionScope
      ? {
          session_scope: options.sessionScope,
        }
      : {}),
  };
}
//@ chunk-p7xf186d.js:28438-28503 placement
function quoteTruncated(text, maxLength = 64) {
  return JSON.stringify(String(text).slice(0, maxLength));
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
  constructor(message, options) {
    super(message);
    this.name = "ToolCallTimeoutError";
    this.routingAckReceived = options?.routingAckReceived;
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
//@ chunk-p7xf186d.js:29082-29129 placement (2.1.88 match: _temp, 1)
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
function isJsonRpcRequest(message) {
  return "method" in message && typeof message.method === "string";
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
  constructor(wireCode, httpStatus) {
    super(wireCode, "peer-reported", {
      httpStatus,
    });
    this.name = "PeerRefusedPairing";
  }
}
//@ chunk-p7xf186d.js:29418-29600 placement
class HandshakeTimeout extends Error {
  which;
  constructor(which) {
    super(which === "reply" ? "No reply to a pairing message" : "Our attest/JWKS step overran while pairing");
    this.which = which;
    this.name = "HandshakeTimeout";
  }
}
//@ chunk-p7xf186d.js:29600-30110 placement
function handlePairingResult(reply, expectedMsg) {
  let result = reply.result;
  if (result && typeof result === "object" && result.local_pairing) {
    if (result.local_pairing.msg === expectedMsg) return result.local_pairing;
    throw new PairingError("malformed", `expected ${expectedMsg}`);
  }
  let error = reply.error;
  if (error && typeof error === "object" && error.local_pairing) {
    let refusal = parseRefusal(error.local_pairing);
    let code = error.local_pairing.code;
    let httpStatus =
      typeof code === "string" && /^attest_failed:\d{1,3}$/.test(code) ? Number(code.slice(14)) : undefined;
    throw new PeerRefusedPairing(refusal ?? "malformed", httpStatus);
  }
  if (expectedMsg === "accept" && isNoToolSpecifiedError(reply))
    throw new PeerRefusedPairing("unsupported_peer");
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
function pairingErrorMessage(code, peerReported) {
  switch (code) {
    case "pairing_disabled":
    case "org_not_permitted":
    case "unsupported_peer":
    case "wrong_peer_kind":
      return "durable";
    case "account_mismatch":
    case "org_mismatch":
      return "peer_may_move";
    case "not_signed_in":
      return peerReported ? "peer_not_ready" : "awaits_token";
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
function isNoToolSpecifiedError(response) {
  let content = response.error?.content;
  if (!Array.isArray(content) || content.length !== 1) return false;
  let firstBlock = content[0];
  return firstBlock?.type === "text" && firstBlock.text === "No tool specified";
}
//@ chunk-p7xf186d.js:30940-31099 placement
function requestTooLargeError(sizeBytes, limitBytes = MAX_LOCAL_FRAME_BYTES) {
  return new RequestTooLargeError(
    `Request too large for the local browser connection (${sizeBytes} bytes; limit ${limitBytes}). Send smaller inputs or fewer files per call.`,
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
function isInferenceRequest(body) {
  let request = body;
  return (
    !!request &&
    typeof request === "object" &&
    typeof request.max_tokens === "number" &&
    Array.isArray(request.messages)
  );
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
    let socketPath = this.context.getSocketPath?.() ?? this.context.socketPath;
    this.currentPath = socketPath;
    this.logDial(`[${serverName}] Attempting to connect to: ${socketPath}`);
    let isSecure;
    try {
      isSecure = await this.validateSocketSecurity(socketPath);
    } catch (error) {
      if (connectEpoch === this.connectEpoch) this.connecting = false;
      logger.info(`[${serverName}] Security validation failed:`, error);
      return;
    }
    if (!isSecure) {
      if (connectEpoch === this.connectEpoch) {
        this.connecting = false;
        this.scheduleReconnect("dead");
      }
      return;
    }
    if (connectEpoch !== this.connectEpoch) return;
    let localPairing = this.context.localPairing;
    if (localPairing && !(await this.ownIdentityPresent(localPairing, connectEpoch))) return;
    let socket;
    let { connectVerified } = this.context;
    if (connectVerified) {
      try {
        socket = await connectVerified(socketPath);
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
        socket.destroy();
        return;
      }
    } else socket = createConnection(socketPath);
    this.socket = socket;
    let onConnected = () => {
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
    socket.on("data", (chunk) => {
      let responseBuffer = this.responseBuffer;
      let totalBytes = responseBuffer.length + this.responseChunkBytes + chunk.length;
      if (responseBuffer.length >= 4 && totalBytes < 4 + responseBuffer.readUInt32LE(0)) {
        this.responseChunks.push(chunk);
        this.responseChunkBytes += chunk.length;
        return;
      }
      if (this.responseChunks.length > 0) {
        this.responseBuffer = Buffer.concat([responseBuffer, ...this.responseChunks, chunk], totalBytes);
        this.responseChunks = [];
        this.responseChunkBytes = 0;
      } else
        this.responseBuffer =
          responseBuffer.length === 0 ? chunk : Buffer.concat([responseBuffer, chunk], totalBytes);
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
    socket.on("error", (error) => {
      logger.info(`[${serverName}] Socket error (code: ${error.code}):`, error);
      this.closeSocket();
      this.scheduleReconnect(isDeadConnectionCode(error.code) ? "dead" : "transport");
    });
    socket.on("close", () => {
      this.closeSocket();
      this.scheduleReconnect();
    });
    if (connectVerified) {
      onConnected();
      return;
    }
    this.connectTimer = setTimeout(() => {
      if (!this.connected) {
        logger.info(`[${serverName}] Connection attempt timed out after ${CONNECT_TIMEOUT_MS}ms`);
        this.closeSocket();
        this.scheduleReconnect();
      }
    }, CONNECT_TIMEOUT_MS);
    socket.on("connect", onConnected);
  }
  scheduleReconnect(cadence = "transport") {
    let { serverName, logger } = this.context;
    if (this.disableAutoReconnect) {
      this.onRedialWanted?.(cadence);
      return;
    }
    if (this.reconnectTimer) {
      logger.info(`[${serverName}] Reconnect already scheduled, skipping`);
      return;
    }
    this.reconnectAttempts++;
    let maxAttempts = 100;
    if (this.reconnectAttempts > maxAttempts) {
      logger.info(`[${serverName}] Giving up after ${maxAttempts} attempts. Will retry on next tool call.`);
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
  dispatchPairingRail(frame, connectEpoch) {
    let { serverName, logger } = this.context;
    if (!frame || typeof frame !== "object") {
      logger.info(`[${serverName}] Dropping a non-object frame`);
      return;
    }
    if (!this.connected) {
      if (
        this.pairingWaiter &&
        isJsonRpcResult(frame) &&
        (frame.tool_use_id === this.pairingWaiter.toolUseId ||
          (frame.tool_use_id === undefined &&
            this.pairingWaiter.acceptsUntagged &&
            isNoToolSpecifiedError(frame)))
      ) {
        let pairingWaiter = this.pairingWaiter;
        this.pairingWaiter = null;
        clearTimeout(pairingWaiter.timer);
        pairingWaiter.resolve(frame);
        return;
      }
      logger.info(`[${serverName}] Dropping frame received before the connection was admitted`);
      return;
    }
    this.dispatchSealed(frame, connectEpoch);
  }
  async pair(connectEpoch, localPairing) {
    let { serverName, logger } = this.context;
    let socketPath = this.currentPath ?? this.context.socketPath;
    this.handshaking = true;
    this.reportPairingState(localPairing, {
      state: "pairing",
      socketPath,
    });
    try {
      let { source, jwks } = ensurePairingContext(localPairing);
      let handshake = new LocalPairingHandshake({
        source,
        jwks,
        policy: {
          requiredOrg: localPairing.requiredOrg,
        },
        instanceHint: localPairing.instanceHint,
      });
      let min = Math.min(
        FORCED_TEARDOWN_GRACE_MS,
        this.forcedTeardownAt + FORCED_TEARDOWN_GRACE_MS - Date.now(),
      );
      if (min > 0) {
        await new Promise((resolve) => setTimeout(resolve, min).unref?.());
        if (connectEpoch !== this.connectEpoch) return;
      }
      let offer = await this.withPairingStepDeadline(handshake.createOffer());
      if (connectEpoch !== this.connectEpoch) return;
      let acceptMessage = handlePairingResult(
        await this.exchangePairing(
          {
            ...offer,
          },
          true,
        ),
        "accept",
      );
      if (connectEpoch !== this.connectEpoch) return;
      let acceptReply = await this.withPairingStepDeadline(handshake.onAccept(acceptMessage));
      if (connectEpoch !== this.connectEpoch) return;
      let doneMessage = handlePairingResult(
        await this.exchangePairing(
          {
            ...acceptReply,
          },
          false,
        ),
        "done",
      );
      if (connectEpoch !== this.connectEpoch) return;
      let established = await handshake.onDone(doneMessage);
      if (connectEpoch !== this.connectEpoch) {
        established.channel.tearDown();
        return;
      }
      if (!this.socket || this.socket.destroyed) {
        established.channel.tearDown();
        this.closeSocket();
        this.scheduleReconnect();
        return;
      }
      this.pairing = established;
      this.pairingExpired = false;
      this.pairingAgeTimer = setTimeout(() => {
        if (this.pairing !== established) return;
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
        `[${serverName}] Local pairing established with ${socketPath} (peer ${established.peer.client_kind}, sid ${established.sidB64.slice(0, 8)}\u2026)`,
      );
      this.reportPairingState(localPairing, {
        state: "established",
        socketPath,
        peerKind: established.peer.client_kind,
        peerInstance: established.peerInstance,
        assertionExp: established.peer.exp,
      });
    } catch (error) {
      if (connectEpoch !== this.connectEpoch) return;
      this.handshaking = false;
      if (error instanceof HandshakeTimeout) {
        logger.warn(`[${serverName}] ${error.message} (${socketPath}); reconnecting`);
        this.lastPairingRefuse = {
          code: "timeout",
          peerReported: false,
        };
        this.reportPairingState(localPairing, {
          state: "refused",
          socketPath,
          code: "timeout",
          wire: "timeout",
          peerReported: false,
        });
        this.closeSocket();
        this.scheduleReconnect();
        return;
      }
      let peerReported = error instanceof PeerRefusedPairing;
      let pairingError = error instanceof PairingError ? error : undefined;
      let code = pairingError?.code ?? "malformed";
      let wireCode = pairingError?.wireCode() ?? code;
      this.logRefusal(
        `[${serverName}] Local pairing with ${socketPath} refused: ${wireCode}${peerReported ? " (peer-reported, unauthenticated)" : ""}`,
        pairingError ? undefined : error,
      );
      this.lastPairingRefuse = {
        code,
        peerReported,
      };
      this.reportPairingState(localPairing, {
        state: "refused",
        socketPath,
        code,
        wire: wireCode,
        ...(pairingError?.httpStatus !== undefined && {
          httpStatus: pairingError.httpStatus,
        }),
        peerReported,
      });
      this.closeSocket();
      if (isRetryablePairingError(error)) this.scheduleReconnect();
    }
  }
  async ownIdentityPresent(localPairing, connectEpoch) {
    let { serverName } = this.context;
    let socketPath = this.currentPath ?? this.context.socketPath;
    let bearer;
    let bearerFailed = false;
    try {
      bearer = await this.withPairingStepDeadline(localPairing.getBearer());
    } catch {
      bearerFailed = true;
    }
    if (connectEpoch !== this.connectEpoch) return false;
    if (bearer) return true;
    this.connecting = false;
    this.lastPairingRefuse = {
      code: "not_signed_in",
      peerReported: false,
    };
    this.logRefusal(
      `[${serverName}] Local pairing with ${socketPath} refused: not_signed_in (no bearer of our own${bearerFailed ? "; token source failed" : ""}; not dialing)`,
    );
    this.reportPairingState(localPairing, {
      state: "refused",
      socketPath,
      code: "not_signed_in",
      wire: "not_signed_in",
      peerReported: false,
    });
    if (bearerFailed) this.scheduleReconnect();
    return false;
  }
  logRefusal(message, ...args) {
    if (message === this.loggedRefusal) {
      this.context.logger.debug(message, ...args);
      return;
    }
    this.loggedRefusal = message;
    this.context.logger.warn(message, ...args);
  }
  logDial(message) {
    if (this.loggedRefusal === undefined) this.context.logger.info(message);
    else this.context.logger.debug(message);
  }
  withPairingStepDeadline(promise) {
    let timer;
    let promise_2 = new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new HandshakeTimeout("step")), HANDSHAKE_STEP_TIMEOUT_MS);
      timer.unref?.();
    });
    return Promise.race([promise, promise_2]).finally(() => clearTimeout(timer));
  }
  reportPairingState(localPairing, state) {
    try {
      localPairing.onPairingState?.(state);
    } catch (error) {
      this.context.logger.warn(`[${this.context.serverName}] onPairingState handler threw:`, error);
    }
  }
  exchangePairing(localPairing, acceptsUntagged) {
    return new Promise((resolve, reject) => {
      let toolUseId = randomUUID();
      let timer = setTimeout(() => {
        if (this.pairingWaiter?.toolUseId === toolUseId) {
          this.pairingWaiter = null;
          reject(new HandshakeTimeout("reply"));
        }
      }, PAIRING_REPLY_TIMEOUT_MS);
      if (this.pairingWaiter) {
        clearTimeout(this.pairingWaiter.timer);
        this.pairingWaiter.reject(new HandshakeTimeout("reply"));
      }
      this.pairingWaiter = {
        toolUseId,
        acceptsUntagged,
        resolve,
        reject,
        timer,
      };
      this.writeRaw({
        method: "execute_tool",
        params: {
          client_id: this.context.clientTypeId,
          tool_use_id: toolUseId,
          local_pairing: localPairing,
        },
      });
    });
  }
  async writeSealed(toolUseId, payload) {
    let pairing = this.pairing;
    if (!pairing || !this.connected)
      throw new SocketConnectionError(`[${this.context.serverName}] Cannot send request: not paired`);
    let payloadBytes = Buffer.byteLength(JSON.stringify(payload), "utf-8");
    let peerMaxBytes = peerMaxReassemblyBytes(pairing);
    let mustChunk = payloadBytes > MAX_REQUEST_PAYLOAD_BYTES && peerMaxBytes !== undefined;
    if (mustChunk && payloadBytes > peerMaxBytes) throw requestTooLargeError(payloadBytes, peerMaxBytes);
    if (!mustChunk && Math.ceil((payloadBytes * 4) / 3) > MAX_LOCAL_FRAME_BYTES)
      throw requestTooLargeError(Math.ceil((payloadBytes * 4) / 3));
    let sealedFrames;
    try {
      sealedFrames = mustChunk
        ? await pairing.channel.sealChunked("execute_tool", toolUseId, payload, MAX_REQUEST_PAYLOAD_BYTES)
        : [await pairing.channel.seal("execute_tool", toolUseId, payload)];
    } catch (error) {
      if (this.pairing !== pairing || pairing.channel.isTornDown)
        throw new SocketConnectionError(`[${this.context.serverName}] Pairing changed while sealing`);
      throw error;
    }
    if (this.pairing !== pairing)
      throw new SocketConnectionError(`[${this.context.serverName}] Pairing changed while sealing`);
    if (mustChunk)
      this.context.logger.info(
        `[${this.context.serverName}] Sealed request sliced into ${sealedFrames.length} frames (${payloadBytes} bytes, max ${MAX_REQUEST_PAYLOAD_BYTES} per slice)`,
      );
    let mapped = sealedFrames.map((sealed) => {
      let frame = {
        method: "execute_tool",
        params: {
          tool_use_id: toolUseId,
          sealed,
        },
      };
      let buffer = Buffer.from(JSON.stringify(frame), "utf-8");
      if (buffer.length > MAX_LOCAL_FRAME_BYTES) throw requestTooLargeError(buffer.length);
      return {
        frame,
        bytes: buffer,
      };
    });
    for (let { frame, bytes } of mapped) this.writeRaw(frame, bytes);
  }
  async answerInferenceRequest(requestId, request, connectEpoch) {
    let { serverName, logger, localPairing } = this.context;
    let result;
    try {
      if (!requestId || !isInferenceRequest(request))
        result = {
          ok: false,
          error: "malformed",
        };
      else if (this.context.isDisabled?.() || !localPairing?.onInferenceRequest)
        result = {
          ok: false,
          error: "not_supported",
        };
      else result = await localPairing.onInferenceRequest(request);
      let sealedBytes = Math.ceil((Buffer.byteLength(JSON.stringify(result), "utf-8") * 4) / 3);
      if (sealedBytes > MAX_LOCAL_FRAME_BYTES) {
        logger.warn(
          `[${serverName}] inference_response too large (${sealedBytes} bytes); answering too_large`,
        );
        result = {
          ok: false,
          error: "too_large",
        };
      }
    } catch (error) {
      logger.warn(`[${serverName}] inference seam failed:`, error);
      result = {
        ok: false,
        error: "handler_error",
      };
    }
    let pairing = this.pairing;
    if (connectEpoch !== this.connectEpoch || !pairing) return;
    try {
      let sealed = await pairing.channel.seal("notification:inference_response", requestId, {
        method: "inference_response",
        params: {
          request_id: requestId,
          result,
        },
      });
      if (connectEpoch !== this.connectEpoch || this.pairing !== pairing) return;
      let frame = {
        method: "inference_response",
        params: {
          request_id: requestId,
          sealed,
        },
      };
      let buffer = Buffer.from(JSON.stringify(frame), "utf-8");
      if (buffer.length > MAX_LOCAL_FRAME_BYTES) {
        logger.warn(
          `[${serverName}] inference_response frame oversized after seal (${buffer.length} bytes); dropped`,
        );
        return;
      }
      this.writeRaw(frame, buffer);
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
  startAgeGrace(pending) {
    if (this.pairingGraceTimer) return;
    let pairing = this.pairing;
    this.pairingGraceTimer = setTimeout(() => {
      if (this.pairing === pairing) this.expirePairing();
    }, pending.timeoutMs);
    this.pairingGraceTimer.unref?.();
  }
  forceRepair(error, peerDropped = false) {
    this.forcedTeardownAt = Date.now();
    this.failPending(error);
    this.closeSocket();
    this.scheduleReconnect(peerDropped ? "peer_dropped" : "transport");
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
      let probeFrame = {
        method: "execute_tool",
        params: {
          client_id: this.context.clientTypeId,
          tool_use_id: randomUUID(),
        },
      };
      this.probeToolUseId = probeFrame.params.tool_use_id;
      let afterProbe = () => {
        this.probeToolUseId = undefined;
        if (this.connected && this.pairing) this.schedulePairingProbe();
      };
      this.sendRequest(probeFrame, LIVENESS_PROBE_TIMEOUT_MS).then(() => {
        this.probesAnswered += 1;
        if (this.probesAnswered === 1)
          this.context.logger.info(
            `[${this.context.serverName}] Local pairing liveness probe answered; probing every ${(this.context.localPairing?.probeIntervalMs ?? LIVENESS_PROBE_INTERVAL_MS) / 1000} s while idle`,
          );
        else
          this.context.logger.debug(
            `[${this.context.serverName}] Local pairing liveness probe ${this.probesAnswered} answered`,
          );
        afterProbe();
      }, afterProbe);
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
  clearPairing(explicit) {
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
    if ((pairing || explicit) && this.context.localPairing)
      this.reportPairingState(this.context.localPairing, {
        state: "closed",
        socketPath: this.currentPath ?? this.context.socketPath,
        reason,
      });
  }
  async dispatchSealed(frame, connectEpoch) {
    let { serverName, logger } = this.context;
    let pairing = this.pairing;
    if (!pairing) return;
    let frameKind;
    let routingId;
    let sealed;
    if (isJsonRpcRequest(frame)) {
      if (frame.method === "permission_request") {
        frameKind = "notification:permission_request";
        let toolUseId = frame.params?.tool_use_id;
        routingId = typeof toolUseId === "string" ? toolUseId : undefined;
      } else if (frame.method === "sealed_broadcast") {
        frameKind = "notification:sealed_broadcast";
        routingId = undefined;
      } else if (frame.method === "inference_request") {
        frameKind = "notification:inference_request";
        let requestId = frame.params?.request_id;
        routingId = typeof requestId === "string" ? requestId : undefined;
      } else {
        logger.info(`[${serverName}] Dropping unsealed notification on a paired connection`);
        return;
      }
      sealed = frame.params?.sealed;
    } else {
      let responseFrame = frame;
      if (typeof responseFrame.tool_use_id !== "string") {
        logger.info(`[${serverName}] Dropping a response without a routing id on a paired connection`);
        return;
      }
      frameKind = "tool_response";
      routingId = responseFrame.tool_use_id;
      sealed = responseFrame.sealed;
      if (
        sealed === undefined &&
        routingId === this.pending?.toolUseId &&
        responseFrame.error?.local_pairing
      ) {
        logger.warn(
          `[${serverName}] Peer reports the pairing is unknown to it${routingId === this.probeToolUseId ? " (it dropped the pairing; found by the liveness probe)" : ""}; re-pairing`,
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
    if (sealed === undefined) {
      logger.info(`[${serverName}] Dropping clear-text ${frameKind} on a paired connection`);
      return;
    }
    if (this.pairingAgedOut() && !(frameKind === "tool_response" && routingId === this.pending?.toolUseId)) {
      if (this.pending)
        logger.info(`[${serverName}] Dropping sealed ${frameKind} past the pairing's maximum age`);
      else this.expirePairing();
      return;
    }
    let opened = await pairing.channel.open(frameKind, routingId, sealed);
    if (connectEpoch !== this.connectEpoch || this.pairing !== pairing) return;
    if (!opened.ok) {
      if (opened.reason !== "foreign_sid")
        logger.warn(`[${serverName}] Sealed ${frameKind} rejected: ${opened.reason}`);
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
    let inner = opened.inner;
    if (!inner || typeof inner !== "object") return;
    try {
      if (frameKind === "tool_response")
        this.handleResponse(
          {
            ...("result" in inner && {
              result: inner.result,
            }),
            ...("error" in inner && {
              error: inner.error,
            }),
            tool_use_id: routingId,
          },
          Buffer.byteLength(JSON.stringify(inner), "utf-8"),
        );
      else if (frameKind === "notification:permission_request") {
        let params = inner.params ?? {};
        if (inner.method !== "permission_request" || params.tool_use_id !== routingId) {
          logger.warn(`[${serverName}] Sealed permission_request mislabelled; dropped`);
          return;
        }
        this.claimPermissionRequest(params);
      } else if (frameKind === "notification:inference_request") {
        let params = inner.params ?? {};
        if (inner.method !== "inference_request" || params.request_id !== routingId) {
          logger.warn(`[${serverName}] Sealed inference_request mislabelled; dropped`);
          return;
        }
        this.answerInferenceRequest(routingId, params.body, connectEpoch);
      } else if (this.notificationHandler && typeof inner.method === "string")
        this.notificationHandler({
          method: inner.method,
          params: inner.params ?? undefined,
        });
    } catch (error) {
      logger.error(`[${serverName}] Error handling a sealed ${frameKind}:`, error);
    }
  }
  handleResponse(response, responseBytes) {
    let pending = this.pending;
    if (!pending || (typeof response.tool_use_id === "string" && response.tool_use_id !== pending.toolUseId))
      return;
    this.pending = null;
    clearTimeout(pending.timer);
    pending.resolve(response, responseBytes);
    if (this.pairingAgedOut()) this.expirePairing();
  }
  claimPermissionRequest(params) {
    let pending = this.pending;
    let requestId = params?.request_id;
    if (
      !pending?.onPermissionRequest ||
      typeof requestId !== "string" ||
      params?.tool_use_id !== pending.toolUseId
    )
      return false;
    this.answerPermissionRequest(pending, pending.onPermissionRequest, requestId, params);
    return true;
  }
  async answerPermissionRequest(pending, onPermissionRequest, requestId, params) {
    let meta = toolCallMeta(params, {
      toolUseId: pending.toolUseId,
      requestId,
    });
    clearTimeout(pending.timer);
    let allowed = false;
    try {
      allowed = await onPermissionRequest(meta);
    } catch (error) {
      this.context.logger.error(`[${this.context.serverName}] Error handling permission request:`, error);
    }
    if (this.pending !== pending) return;
    if (this.pairingAgedOut()) {
      this.expirePairing();
      return;
    }
    let response = {
      method: "permission_response",
      params: {
        request_id: requestId,
        allowed,
      },
    };
    if (this.context.localPairing) {
      let sealedResponse = {
        ...response,
        params: {
          ...response.params,
          tool_use_id: pending.toolUseId,
        },
      };
      await this.writeSealed(pending.toolUseId, sealedResponse).catch((error) => {
        this.context.logger.warn(`[${this.context.serverName}] Could not send permission_response:`, error);
      });
      if (this.pending !== pending) return;
    } else this.writeFrame(response);
    this.armTimeout(pending);
  }
  setNotificationHandler(notificationHandler) {
    this.notificationHandler = notificationHandler;
  }
  async ensureConnected() {
    let { serverName } = this.context;
    if (this.connected && this.socket) return true;
    if (!this.socket && !this.connecting) await this.connect();
    return new Promise((resolve, reject) => {
      let retryTimer = null;
      let waitMs = CONNECT_TIMEOUT_MS;
      let onTimeout = () => {
        if (this.connected) {
          if (retryTimer) clearTimeout(retryTimer);
          resolve(true);
          return;
        }
        if (
          this.context.localPairing &&
          (this.handshaking || this.lastPairingRefuse?.code === "timeout") &&
          waitMs < RECONNECT_WAIT_MS
        ) {
          waitMs = RECONNECT_WAIT_MS;
          timer = setTimeout(onTimeout, waitMs - CONNECT_TIMEOUT_MS);
          return;
        }
        if (retryTimer) clearTimeout(retryTimer);
        reject(new SocketConnectionError(`[${serverName}] Connection attempt timed out after ${waitMs}ms`));
      };
      let timer = setTimeout(onTimeout, waitMs);
      let poll = () => {
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
        } else retryTimer = setTimeout(poll, 500);
      };
      poll();
    });
  }
  armTimeout(pending) {
    let { serverName } = this.context;
    clearTimeout(pending.timer);
    pending.timer = setTimeout(() => {
      if (this.pending !== pending) return;
      this.failPending(
        new ToolCallTimeoutError(`[${serverName}] Tool request timed out after ${pending.timeoutMs}ms`),
      );
      this.closeSocket();
      this.scheduleReconnect();
    }, pending.timeoutMs);
  }
  writeRaw(frame, bytes) {
    if (!this.socket || this.socket.destroyed) return;
    let payload = bytes ?? Buffer.from(JSON.stringify(frame), "utf-8");
    let header = Buffer.allocUnsafe(4);
    header.writeUInt32LE(payload.length, 0);
    this.socket.write(Buffer.concat([header, payload]));
  }
  writeFrame(frame) {
    if (this.context.localPairing)
      throw Error("clear-text frames are disabled when local pairing is configured");
    this.writeRaw(frame);
  }
  async sendRequest(request, timeoutMs, onPermissionRequest) {
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
      let pending = {
        toolUseId: request.params.tool_use_id,
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
      this.armTimeout(pending);
      this.pending = pending;
      if (this.context.localPairing)
        this.writeSealed(pending.toolUseId, request).catch((error) => {
          if (this.pending === pending)
            this.failPending(error instanceof Error ? error : new SocketConnectionError(String(error)));
        });
      else this.writeFrame(request);
    });
  }
  async callTool(toolName, args, options) {
    let frame = {
      method: "execute_tool",
      params: {
        client_id: this.context.clientTypeId,
        tool: toolName,
        args,
        tool_use_id: randomUUID(),
        ...permissionContextFields(options),
      },
    };
    let { trackEvent } = this.context;
    let timeoutMs = this.context.getToolCallTimeoutMs?.(toolName) ?? BROWSER_TOOL_TIMEOUT_MS;
    let sessionScope = options?.sessionScope;
    let now = Date.now();
    let telemetryBase = {
      tool_name: `browser:${toolName}`,
      tool_use_id: frame.params.tool_use_id,
      session_id: sessionScope?.sessionId,
      user_message_uuid: sessionScope?.userMessageUuid,
      transport: "native",
    };
    trackEvent?.("chrome_bridge_tool_call_started", {
      ...telemetryBase,
      timeout_ms: timeoutMs,
      request_bytes: Buffer.byteLength(JSON.stringify(frame), "utf-8"),
    });
    let reportError = (errorText, startedAt, errorType) => {
      trackEvent?.("chrome_bridge_tool_call_error", {
        ...telemetryBase,
        duration_ms: Date.now() - startedAt,
        error_type: errorType ?? classifyToolError(toolName, errorText),
      });
    };
    let outcome;
    try {
      outcome = await this.sendRequestWithRetry(frame, timeoutMs, options?.onPermissionRequest);
    } catch (error) {
      if (error instanceof ToolCallTimeoutError)
        trackEvent?.("chrome_bridge_tool_call_timeout", {
          ...telemetryBase,
          duration_ms: Date.now() - now,
          timeout_ms: timeoutMs,
        });
      else
        reportError(
          error instanceof Error ? error.message : String(error),
          now,
          error instanceof RequestTooLargeError ? "request_too_large" : undefined,
        );
      throw error;
    }
    let { response, responseBytes, sentAt } = outcome;
    if ("error" in response) reportError(firstTextContent(response.error), sentAt);
    else
      trackEvent?.("chrome_bridge_tool_call_completed", {
        ...telemetryBase,
        duration_ms: Date.now() - sentAt,
        response_bytes: responseBytes,
      });
    return response;
  }
  async sendRequestWithRetry(request, timeoutMs, onPermissionRequest) {
    let { serverName, logger } = this.context;
    try {
      return await this.sendRequest(request, timeoutMs, onPermissionRequest);
    } catch (error) {
      if (!(error instanceof SocketConnectionError)) throw error;
      logger.info(`[${serverName}] Connection error, forcing reconnect and retrying: ${error.message}`);
      if (!this.connecting) this.closeSocket();
      let connected;
      try {
        connected = await this.ensureConnected();
      } catch (error) {
        if (!(this.context.localPairing && this.lastPairingRefuse)) throw error;
        connected = false;
      }
      let lastPairingRefuse = this.lastPairingRefuse;
      if (!connected && this.context.localPairing && lastPairingRefuse) {
        let reasonText = lastPairingRefuse.peerReported
          ? `reported by the extension, unverified: ${lastPairingRefuse.code}`
          : lastPairingRefuse.code;
        throw new SocketConnectionError(
          `[${serverName}] Claude in Chrome isn't paired with your browser (${reasonText})`,
        );
      }
      return await this.sendRequest(request, timeoutMs, onPermissionRequest);
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
  failPending(error) {
    let pending = this.pending;
    if (!pending) return;
    this.pending = null;
    clearTimeout(pending.timer);
    pending.reject(error);
  }
  disconnect() {
    this.clearReconnectTimer();
    this.failPending(
      new ExtensionDisconnectedMidCallError(`[${this.context.serverName}] Socket client disconnected`),
    );
    this.closeSocket();
    this.reconnectAttempts = 0;
  }
  async validateSocketSecurity(socketPath) {
    let { serverName, logger } = this.context;
    if (platform() === "win32" || this.context.connectVerified) return true;
    try {
      let socketDir = dirname(socketPath);
      if ((socketDir.split("/").pop() || "").startsWith("claude-mcp-browser-bridge-"))
        try {
          let stats = await promises.lstat(socketDir);
          if (stats.isSymbolicLink())
            throw Error(
              `[${serverName}] Socket directory is a symlink: ${socketDir}. Directory may have been tampered with.`,
            );
          if (stats.isDirectory()) {
            let dirMode = stats.mode & 511;
            if (dirMode !== 448)
              throw Error(
                `[${serverName}] Insecure socket directory permissions: ${dirMode.toString(8)} (expected 0700). Directory may have been tampered with.`,
              );
            let uid = process.getuid?.();
            if (uid !== undefined && stats.uid !== uid)
              throw Error(
                `Socket directory not owned by current user (uid: ${uid}, dir uid: ${stats.uid}). Potential security risk.`,
              );
          }
        } catch (error) {
          if (error.code !== "ENOENT") throw error;
          logger.info(`[${serverName}] Socket directory not found; not dialing`);
          return false;
        }
      let stats = await promises.lstat(socketPath);
      if (!stats.isSocket()) throw Error(`[${serverName}] Path exists but it's not a socket: ${socketPath}`);
      let socketMode = stats.mode & 511;
      if (socketMode !== 384)
        throw Error(
          `[${serverName}] Insecure socket permissions: ${socketMode.toString(8)} (expected 0600). Socket may have been tampered with.`,
        );
      let uid = process.getuid?.();
      if (uid !== undefined && stats.uid !== uid)
        throw Error(
          `Socket not owned by current user (uid: ${uid}, socket uid: ${stats.uid}). Potential security risk.`,
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
function clearPairingSource(session) {
  let pairingContext = getPairingContext(session);
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
  clearPairingSource,
};

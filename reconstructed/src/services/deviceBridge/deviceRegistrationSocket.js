/**
 * services/deviceBridge/deviceRegistrationSocket.ts
 *
 * 2.1.316 新增。设备注册 WebSocket：向设备桥公告本机工具、心跳、重连与争用退避。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ksxq075c.js (30)
 * attribution: placement 30
 */
import { hostname } from "os";
import {
  describeDeviceError,
  DEFAULT_DEVICE_TIMINGS,
  REANNOUNCE_DELAYS_MS,
  DEVICE_STABLE_QUALIFY_MS,
  DEVICE_HEARTBEAT_FRAME,
  computeReconnectDelayMs,
  MAX_DEVICE_RECONNECT_ATTEMPTS,
  HANDSHAKE_TIMEOUT_MS,
  buildConnectMessage,
  parseDeviceFrame,
  isDeviceIdentityConflict,
  WS_CLOSE_CODE_SUPERSEDED,
  TOOL_META_KEYS,
  deviceSlugOrFallback,
  slugifyName,
} from "../../bridge/deviceRegistration.js";
import { logForDebugging } from "../../utils/debug.js";
import { toError } from "../../utils/errors.js";
import { createSignal } from "../../utils/signal.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logError } from "../../utils/log.js";
import { bunHashOf } from "../../utils/pastedContent.js";
import { getWebSocketProxyUrl } from "../../utils/proxy.js";
import { getWebSocketTLSOptions } from "../../utils/mtls.js";
import { isBareWssUrl } from "../mcp/ccrMcpUrls.js";
import { wasLauncherHostLoginToken } from "../../utils/auth/launcherHostLogin.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, literal, union, string, E, QD } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  REMOTE_TOOLS,
  MCP_PASSTHROUGH,
  createConcurrencyLimiter,
  DEFAULT_MAX_IN_FLIGHT,
  CORE,
} from "../remoteTools/remoteToolAdmission.js";
import { parseRegistration, ANTHROPIC_REMOTETOOLEXECUTION } from "../../remote/tools/protocolSchemas.js";
import { REMOTE_TOOL_PROTOCOL_VERSION } from "../../remote/tools/protocolConstants.js";
import { parsePassthroughMarker, PASSTHROUGH_MARKER_KEY } from "./passthroughMarker.js";
import { sessionIdBody, toInfraSessionId } from "../../bridge/sessionIdCompat.js";
import { antEnv } from "../../utils/env.js";
import { fileSuffixForOauthConfig } from "../../constants/oauth.js";
import {
  isSessionChannelDisabled,
  remoteToolServingOffReason,
  remoteToolVmRequired,
  isPersonFixableOffReason,
} from "../remoteTools/servingGates.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum, fromEnumOpt, fromNumberOpt, fromNumber } from "../analytics/safeMetadata.js";
import { isToolServingEnabled, getToolServingFlagAnsweredOff } from "../analytics/violinWillowGate.js";
import { isDeviceBindingAllowed } from "../../bridge/deviceBindingPolicy.js";
import { isTrustedDeviceRequiredOrUnknown } from "../../bridge/trustedDevice.js";
import { logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "../../remote/tools/consentText.js";
import { resolveCurrentDeviceBinding } from "../../bridge/deviceBindingRecord.js";
import { primeWindowsProfileDirs } from "../remoteTools/windowsProfileDirs.js";
import { primeWindowsPlatform } from "../../utils/platformWindows.js";
import { isViolinRibEnabled } from "../analytics/violinRibGate.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { onComplianceTaintsChanged } from "../policyLimits/complianceTaints.js";
import { onGrowthBookRefresh } from "../analytics/growthbook.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { NOT_HELD_LEASE } from "../remoteTools/lease.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { count } from "../../utils/collections.js";

//@ chunk-ksxq075c.js:1585-9343 placement
/**
 * 设备注册会话：心跳、重连、争用退避
 */
class DeviceRegistrationSession {
  transport;
  announced;
  now;
  random;
  onEvent;
  onTransportEvent;
  started = false;
  stopping = false;
  timers = describeDeviceError(DEFAULT_DEVICE_TIMINGS);
  lastAckAt = 0;
  reconnectAttempts = 0;
  consecutiveSlotContention = 0;
  lastFailureWasContention = false;
  contentionBackoffNotified = false;
  consecutivePongTimeouts = 0;
  keepaliveTimer;
  reconnectTimer;
  stableTimer;
  reannounce = {
    phase: "idle",
  };
  constructor(e) {
    this.transport = e.transport;
    this.announced = e.announced;
    this.onEvent = e.onEvent;
    this.onTransportEvent = e.onTransportEvent;
    this.now = e.now ?? Date.now;
    this.random = e.random ?? Math.random;
    this.transport.onevent = this.handleTransportEvent;
  }
  start() {
    if (this.started) return;
    this.started = true;
    this.openConnection();
  }
  async stop() {
    this.stopping = true;
    this.clearReconnectTimer();
    this.clearConnectionTimers();
    this.cancelReannounce();
    await this.transport.close();
  }
  requestReannounce(e) {
    if (!this.started || this.stopping) return;
    let n = REANNOUNCE_DELAYS_MS[e];
    switch (this.reannounce.phase) {
      case "draining":
      case "rotating":
        return;
      case "coalescing":
        if (this.reannounce.fireAt <= this.now() + n) return;
        clearTimeout(this.reannounce.timer);
        break;
      case "idle":
        break;
    }
    this.reannounce = {
      phase: "coalescing",
      reason: e,
      fireAt: this.now() + n,
      timer: setTimeout(this.beginReannounce, n),
    };
  }
  getReconnectAttempts() {
    return this.reconnectAttempts;
  }
  getConsecutiveSlotContention() {
    return this.consecutiveSlotContention;
  }
  getConsecutivePongTimeouts() {
    return this.consecutivePongTimeouts;
  }
  handleTransportEvent = (e) => {
    switch ((this.notifyTransportListener(e), e.kind)) {
      case "authenticated":
        this.handleAuthenticated(e.protocolVersion, e.timings);
        return;
      case "hb_ack":
        this.handleAck();
        return;
      case "rejected": {
        let n = this.endRotation();
        let i = n !== undefined && e.reason === "duplicate_device_id";
        if (i)
          this.emit({
            kind: "reannounce_contended",
            reason: n,
          });
        else if (e.slotContention) this.lastFailureWasContention = true;
        this.cancelDrain();
        this.clearConnectionTimers();
        this.scheduleReconnect(i);
        return;
      }
      case "closed":
        if (e.superseded) this.lastFailureWasContention = true;
        this.endRotation();
        this.cancelDrain();
        this.clearConnectionTimers();
        this.scheduleReconnect();
        return;
      case "handshake_timeout":
      case "dial_failed":
      case "token_unavailable":
        this.endRotation();
        this.cancelDrain();
        this.clearConnectionTimers();
        this.scheduleReconnect();
        return;
      case "transport_closed":
        this.stopping = true;
        this.clearReconnectTimer();
        this.clearConnectionTimers();
        this.cancelReannounce();
        return;
      case "connecting":
      case "socket_error":
      case "inbound_unknown":
      case "inbound_invalid":
      case "outbound_dropped":
        return;
    }
  };
  async openConnection() {
    if (this.stopping) return;
    try {
      await this.transport.openConnection();
    } catch (error) {
      logForDebugging(`[deviceBridge] open connection failed: ${toError(error).message}`);
      this.endRotation();
      this.scheduleReconnect();
    }
  }
  handleAuthenticated(e, n) {
    if (this.stopping) return;
    this.timers = describeDeviceError(n);
    this.lastAckAt = this.now();
    this.clearKeepaliveTimer();
    if (this.endRotation() === undefined || this.stableTimer === undefined) {
      this.clearStableTimer();
      this.stableTimer = setTimeout(this.markStable, DEVICE_STABLE_QUALIFY_MS);
    }
    if (this.announced.hasUnservedChange()) this.requestReannounce("connected_stale");
    if (e < 1) {
      this.consecutivePongTimeouts = 0;
      this.emit({
        kind: "heartbeat_unsupported",
        protocolVersion: e,
      });
      return;
    }
    this.keepaliveTimer = setInterval(this.keepaliveTick, this.timers.keepaliveIntervalMs);
    this.sendHeartbeat();
  }
  handleAck() {
    this.lastAckAt = this.now();
    if (this.consecutivePongTimeouts > 0) {
      this.consecutivePongTimeouts = 0;
      this.reconnectAttempts = 0;
    }
  }
  keepaliveTick = () => {
    if (!this.transport.isAuthenticated()) return;
    if (this.now() - this.lastAckAt > this.timers.pongTimeoutMs) {
      this.consecutivePongTimeouts++;
      this.emit({
        kind: "pong_timeout",
        consecutive: this.consecutivePongTimeouts,
      });
      this.cancelDrain();
      this.clearConnectionTimers();
      this.transport.disconnect();
      this.scheduleReconnect();
      return;
    }
    this.sendHeartbeat();
  };
  sendHeartbeat() {
    this.transport.sendRaw(DEVICE_HEARTBEAT_FRAME);
  }
  markStable = () => {
    this.stableTimer = undefined;
    this.consecutiveSlotContention = 0;
    this.contentionBackoffNotified = false;
    if (this.consecutivePongTimeouts === 0) this.reconnectAttempts = 0;
    this.emit({
      kind: "stabilized",
    });
  };
  scheduleReconnect(e = false) {
    if (this.stopping || !this.started || this.reconnectTimer !== undefined) return;
    let n = this.nextDelayMs(e);
    if (this.stopping) return;
    this.reconnectTimer = setTimeout(this.reconnect, n);
    this.emit({
      kind: "reconnect_scheduled",
      delayMs: n,
      attempt: this.reconnectAttempts,
      slotContention: this.consecutiveSlotContention > 0,
    });
  }
  nextDelayMs(e) {
    let lastFailureWasContention = this.lastFailureWasContention;
    this.lastFailureWasContention = false;
    if (e) return computeReconnectDelayMs(0, 1, this.timers.slotContentionFastAttempts, this.random);
    if (lastFailureWasContention) {
      this.consecutiveSlotContention++;
      if (
        this.consecutiveSlotContention > this.timers.slotContentionFastAttempts &&
        !this.contentionBackoffNotified
      ) {
        this.contentionBackoffNotified = true;
        this.emit({
          kind: "slot_contention_backoff",
          consecutive: this.consecutiveSlotContention,
        });
      }
      return computeReconnectDelayMs(
        0,
        this.consecutiveSlotContention,
        this.timers.slotContentionFastAttempts,
        this.random,
      );
    }
    this.consecutiveSlotContention = 0;
    this.contentionBackoffNotified = false;
    if (this.reconnectAttempts >= MAX_DEVICE_RECONNECT_ATTEMPTS) {
      this.reconnectAttempts = 0;
      this.emit({
        kind: "reconnect_exhausted",
      });
      try {
        this.transport.onerror?.(Error("Bridge unreachable"));
      } catch (error) {
        logForDebugging(`[deviceBridge] transport onerror listener threw: ${toError(error).message}`);
      }
    }
    let reconnectDelayMs = computeReconnectDelayMs(
      this.reconnectAttempts,
      0,
      this.timers.slotContentionFastAttempts,
      this.random,
    );
    this.reconnectAttempts++;
    return reconnectDelayMs;
  }
  reconnect = () => {
    this.reconnectTimer = undefined;
    this.openConnection();
  };
  beginReannounce = () => {
    if (this.reannounce.phase !== "coalescing") return;
    let { reason } = this.reannounce;
    this.reannounce = {
      phase: "idle",
    };
    if (this.stopping) return;
    let inFlightAtStart = this.announced.inFlightCalls();
    let i = this.reannounceSkipOutcome();
    if (i !== undefined) {
      this.emit({
        kind: "reannounce",
        reason,
        outcome: i,
        inFlightAtStart,
        drainedMs: 0,
        drainTimedOut: false,
      });
      return;
    }
    let r = {
      phase: "draining",
      reason,
      startedAt: this.now(),
      inFlightAtStart,
      timer: setTimeout(this.handleDrainTimeout, this.timers.rotateDrainMaxMs),
    };
    this.reannounce = r;
    this.announced.whenIdle().then(
      () => this.rotate(r, false),
      () => this.rotate(r, false),
    );
  };
  handleDrainTimeout = () => {
    if (this.reannounce.phase === "draining") this.rotate(this.reannounce, true);
  };
  rotate(e, drainTimedOut) {
    if (this.reannounce !== e) return;
    clearTimeout(e.timer);
    this.reannounce = {
      phase: "idle",
    };
    if (this.stopping) return;
    let i = this.reannounceSkipOutcome() ?? "rotated";
    if (i === "rotated")
      this.reannounce = {
        phase: "rotating",
        reason: e.reason,
      };
    this.emit({
      kind: "reannounce",
      reason: e.reason,
      outcome: i,
      inFlightAtStart: e.inFlightAtStart,
      drainedMs: this.now() - e.startedAt,
      drainTimedOut,
    });
    if (this.reannounce.phase !== "rotating" || this.stopping) return;
    this.clearKeepaliveTimer();
    this.transport.disconnect();
    this.openConnection();
  }
  reannounceSkipOutcome() {
    if (!this.announced.hasUnservedChange()) return "already_served";
    if (!this.transport.isAuthenticated()) return "not_connected";
    return;
  }
  endRotation() {
    if (this.reannounce.phase !== "rotating") return;
    let { reason } = this.reannounce;
    this.reannounce = {
      phase: "idle",
    };
    return reason;
  }
  cancelDrain() {
    if (this.reannounce.phase !== "draining") return;
    let reannounce = this.reannounce;
    clearTimeout(reannounce.timer);
    this.reannounce = {
      phase: "idle",
    };
    this.emit({
      kind: "reannounce",
      reason: reannounce.reason,
      outcome: "not_connected",
      inFlightAtStart: reannounce.inFlightAtStart,
      drainedMs: this.now() - reannounce.startedAt,
      drainTimedOut: false,
    });
  }
  cancelReannounce() {
    switch (this.reannounce.phase) {
      case "coalescing":
      case "draining":
        clearTimeout(this.reannounce.timer);
        break;
      case "rotating":
      case "idle":
        break;
    }
    this.reannounce = {
      phase: "idle",
    };
  }
  emit(e) {
    try {
      this.onEvent?.(e);
    } catch (error) {
      logForDebugging(`[deviceBridge] liveness event listener threw: ${toError(error).message}`);
    }
  }
  notifyTransportListener(e) {
    try {
      this.onTransportEvent?.(e);
    } catch (error) {
      logForDebugging(`[deviceBridge] transport event listener threw: ${toError(error).message}`);
    }
  }
  clearReconnectTimer() {
    if (this.reconnectTimer === undefined) return;
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = undefined;
  }
  clearConnectionTimers() {
    this.clearKeepaliveTimer();
    this.clearStableTimer();
  }
  clearKeepaliveTimer() {
    if (this.keepaliveTimer !== undefined) {
      clearInterval(this.keepaliveTimer);
      this.keepaliveTimer = undefined;
    }
  }
  clearStableTimer() {
    if (this.stableTimer !== undefined) {
      clearTimeout(this.stableTimer);
      this.stableTimer = undefined;
    }
  }
}
//@ chunk-ksxq075c.js:9343-9955 placement
/**
 * 设备工具注册表（按组设置、去重）
 */
function createDeviceToolRegistry() {
  let e = new Map();
  let signal = createSignal();
  let i = dedupeToolsByName(e);
  let r;
  return {
    get: (s) => i.byName.get(s),
    setGroup(s, d, S = "tools_changed") {
      e.set(s, [...d]);
      let b = dedupeToolsByName(e);
      let O = i;
      i = b;
      if (b.dropped.length > 0 && jsonStringify(b.dropped) !== jsonStringify(O.dropped))
        logForDebugging(
          `[deviceBridge] duplicate device tool names not announced: ${jsonStringify(b.dropped)}`,
        );
      if (b.hash === O.hash) return;
      try {
        signal.emit(S);
      } catch (error) {
        for (let k of error instanceof AggregateError ? error.errors : [error]) logError(k);
      }
    },
    definitions: () => i.definitions,
    definitionsOf: (s) =>
      (e.get(s) ?? []).flatMap((d) => (i.byName.get(d.definition.name) === d ? [d.definition] : [])),
    serve() {
      r = i.hash;
      return i.definitions;
    },
    hasUnservedChange: () => r !== i.hash,
    subscribe: signal.subscribe,
  };
}
//@ chunk-ksxq075c.js:9955-10251 placement
/**
 * 按名字去重工具并记录丢弃
 */
function dedupeToolsByName(e) {
  let { byName, dropped } = [...e.values()].flat().reduce(
    (acc, d) => {
      let S = d.definition.name;
      if (acc.byName.has(S)) acc.dropped.push(S);
      else acc.byName.set(S, d);
      return acc;
    },
    {
      byName: new Map(),
      dropped: [],
    },
  );
  let mapped = [...byName.values()].map((s) => s.definition);
  return {
    byName,
    definitions: mapped,
    dropped,
    hash: bunHashOf(jsonStringify(mapped)),
  };
}
//@ chunk-ksxq075c.js:10251-10351 placement
/**
 * 设备桥接 RPC 的常量：状态值、JSON-RPC 内部错误码、令牌截止符号、合成初始化 id、最大消息大小。
 */
var RPC_STATE_IDLE = 0;
var WS_OPEN = 1;
var JSONRPC_INTERNAL_ERROR = -32603;
var TOKEN_DEADLINE_SYMBOL = Symbol("device-bridge-token-deadline");
var SYNTHETIC_INIT_ID = "__synthetic_init__";
var MAX_BRIDGE_MESSAGE_BYTES = 33554432;
//@ chunk-ksxq075c.js:10351-10473 placement
function openBridgeWebSocket(e) {
  let n = new globalThis.WebSocket(e, {
    proxy: getWebSocketProxyUrl(e),
    tls: getWebSocketTLSOptions(undefined) || undefined,
  });
  n.binaryType = "arraybuffer";
  return n;
}
//@ chunk-ksxq075c.js:10473-16507 placement
/**
 * 设备桥 WebSocket 传输
 */
class DeviceBridgeTransport {
  options;
  onclose;
  onerror;
  onmessage;
  onevent;
  started = false;
  closing = false;
  ws;
  pendingToken;
  authenticated = false;
  connectGeneration = 0;
  handshakeTimer;
  negotiated;
  constructor(options) {
    this.options = options;
  }
  async start() {
    if (this.started) throw Error("DeviceBridgeTransport start can only be called once.");
    this.started = true;
  }
  async close() {
    if (this.closing) return;
    this.closing = true;
    this.disconnect();
    this.emit({
      kind: "transport_closed",
    });
    this.onclose?.();
  }
  async send(e) {
    if (isSyntheticInitResponse(e)) return;
    let ws = this.ws;
    if (!ws || !this.authenticated || ws.readyState !== WS_OPEN) {
      this.emit({
        kind: "outbound_dropped",
        messageType: getJsonRpcResponseId(e) === undefined ? "other" : "request",
      });
      return;
    }
    try {
      ws.send(jsonStringify(e));
    } catch (error) {
      logForDebugging(`[deviceBridge] outbound send failed: ${toError(error).message}`);
      this.emit({
        kind: "outbound_dropped",
        messageType: getJsonRpcResponseId(e) === undefined ? "other" : "request",
      });
    }
  }
  sendRaw(e) {
    let ws = this.ws;
    if (!ws || ws.readyState !== WS_OPEN) return false;
    try {
      ws.send(e);
    } catch (error) {
      logForDebugging(`[deviceBridge] raw send failed: ${toError(error).message}`);
      return false;
    }
    return true;
  }
  isAuthenticated() {
    return this.authenticated;
  }
  isConnected() {
    return this.ws !== undefined;
  }
  getNegotiated() {
    return this.negotiated;
  }
  async openConnection() {
    if (this.closing || this.ws) return;
    let e = ++this.connectGeneration;
    let accessToken = await this.resolveAccessToken();
    if (e !== this.connectGeneration || this.closing || this.ws !== undefined) return;
    if (!accessToken) {
      this.emit({
        kind: "token_unavailable",
      });
      return;
    }
    let i;
    let r;
    try {
      i = this.options.getUrl();
      r = (this.options.isAllowedUrl ?? isBareWssUrl)(i);
    } catch (error) {
      this.emit({
        kind: "dial_failed",
        error: toError(error),
      });
      return;
    }
    if (!r) {
      logForDebugging("[deviceBridge] refusing dial: bridge URL failed validation");
      this.emit({
        kind: "dial_failed",
        error: Error("bridge URL failed validation"),
      });
      return;
    }
    let s;
    try {
      s = (this.options.createSocket ?? openBridgeWebSocket)(i);
    } catch (error) {
      this.emit({
        kind: "dial_failed",
        error: toError(error),
      });
      return;
    }
    this.ws = s;
    this.pendingToken = accessToken;
    this.handshakeTimer = setTimeout(this.handleHandshakeTimeout, HANDSHAKE_TIMEOUT_MS);
    s.addEventListener("open", this.handleOpen);
    s.addEventListener("message", this.handleMessage);
    s.addEventListener("close", this.handleClose);
    s.addEventListener("error", this.handleSocketError);
    this.emit({
      kind: "connecting",
    });
    if (this.closing || this.ws !== s) return;
    if (s.readyState === WS_OPEN) this.handleOpen();
  }
  async resolveAccessToken() {
    let e;
    try {
      let winner = await Promise.race([
        Promise.resolve(this.options.getAccessToken()),
        new Promise((resolve) => {
          e = setTimeout((r) => r(TOKEN_DEADLINE_SYMBOL), HANDSHAKE_TIMEOUT_MS, resolve);
        }),
      ]);
      if (winner === TOKEN_DEADLINE_SYMBOL) {
        logForDebugging("[deviceBridge] access token resolution timed out");
        return;
      }
      if (winner !== undefined && wasLauncherHostLoginToken(winner)) {
        logForDebugging("[deviceBridge] the desktop app's sign-in is not sent to the bridge");
        return;
      }
      return winner;
    } catch (error) {
      logForDebugging(`[deviceBridge] access token resolution failed: ${toError(error).message}`);
      return;
    } finally {
      if (e !== undefined) clearTimeout(e);
    }
  }
  disconnect() {
    this.connectGeneration++;
    this.clearHandshakeTimer();
    this.pendingToken = undefined;
    this.authenticated = false;
    this.negotiated = undefined;
    let ws = this.ws;
    if (!ws) return;
    this.ws = undefined;
    ws.removeEventListener("open", this.handleOpen);
    ws.removeEventListener("message", this.handleMessage);
    ws.removeEventListener("close", this.handleClose);
    ws.removeEventListener("error", this.handleSocketError);
    if (ws.readyState === WS_OPEN || ws.readyState === RPC_STATE_IDLE)
      try {
        ws.close();
      } catch (error) {
        logForDebugging(`[deviceBridge] socket close failed: ${toError(error).message}`);
      }
  }
  emit(e) {
    try {
      this.onevent?.(e);
    } catch (error) {
      logForDebugging(`[deviceBridge] transport event listener threw: ${toError(error).message}`);
    }
  }
  clearHandshakeTimer() {
    if (this.handshakeTimer === undefined) return;
    clearTimeout(this.handshakeTimer);
    this.handshakeTimer = undefined;
  }
  handleHandshakeTimeout = () => {
    this.handshakeTimer = undefined;
    if (!this.ws || this.authenticated) return;
    this.disconnect();
    this.emit({
      kind: "handshake_timeout",
    });
  };
  handleOpen = () => {
    let ws = this.ws;
    let pendingToken = this.pendingToken;
    if (!ws || pendingToken === undefined) return;
    this.pendingToken = undefined;
    try {
      ws.send(
        jsonStringify(
          buildConnectMessage({
            oauthToken: pendingToken,
            tools: this.options.getTools(),
            deviceId: this.options.getDeviceId?.(),
            sessionId: this.options.getSessionId(),
          }),
        ),
      );
    } catch (error) {
      this.disconnect();
      this.emit({
        kind: "dial_failed",
        error: toError(error),
      });
    }
  };
  handleMessage = (e) => {
    let n = decodeSocketFrame(e.data);
    if (n.kind === "unsupported") {
      logForDebugging("[deviceBridge] dropping unsupported inbound payload type");
      this.emit({
        kind: "inbound_invalid",
        error: Error("unsupported inbound payload type"),
      });
      return;
    }
    if (n.kind === "oversize") {
      logForDebugging(
        `[deviceBridge] dropping ${n.size}-unit inbound frame (cap ${MAX_BRIDGE_MESSAGE_BYTES})`,
      );
      this.emit({
        kind: "inbound_invalid",
        error: Error("inbound frame exceeded the device bridge size cap"),
      });
      return;
    }
    let deviceFrame = parseDeviceFrame(n.text);
    switch (deviceFrame.kind) {
      case "ignored":
        if (this.authenticated) {
          logForDebugging("[deviceBridge] dropping unparseable inbound frame");
          this.emit({
            kind: "inbound_invalid",
            error: Error("unparseable inbound frame"),
          });
        }
        return;
      case "hb_ack":
        this.emit({
          kind: "hb_ack",
        });
        return;
      case "error":
        this.handleReject(deviceFrame.reason, deviceFrame.status, deviceFrame.detail);
        return;
      case "connected":
        this.authenticate(deviceFrame.protocolVersion, deviceFrame.timings);
        return;
      case "unknown":
        this.emit({
          kind: "inbound_unknown",
          frameType: deviceFrame.frameType,
        });
        return;
      case "rpc":
        this.deliver(deviceFrame.message);
        return;
    }
  };
  authenticate(protocolVersion, timings) {
    if (this.authenticated) return;
    this.clearHandshakeTimer();
    this.authenticated = true;
    this.negotiated = {
      protocolVersion,
      timings,
    };
    this.emit({
      kind: "authenticated",
      protocolVersion,
      timings,
    });
    if (this.closing || this.ws === undefined) return;
    this.injectSyntheticInitialize();
  }
  injectSyntheticInitialize() {
    let e;
    try {
      e = this.options.parseMessage(buildInitializeRequest());
    } catch (error) {
      this.emit({
        kind: "inbound_invalid",
        error: toError(error),
      });
      return;
    }
    try {
      this.onmessage?.(e);
    } catch (error) {
      this.emit({
        kind: "inbound_invalid",
        error: toError(error),
      });
    }
  }
  handleReject(e, status, detail) {
    let r = !this.authenticated;
    this.disconnect();
    this.emit({
      kind: "rejected",
      phase: r ? "pre_auth" : "post_auth",
      reason: e,
      status,
      detail,
      slotContention: r && isDeviceIdentityConflict(e),
    });
  }
  deliver(e) {
    if (!this.authenticated) return;
    let n;
    try {
      n = this.options.parseMessage(e);
    } catch (error) {
      this.emit({
        kind: "inbound_invalid",
        error: toError(error),
      });
      this.replyInternalError(e);
      return;
    }
    try {
      this.onmessage?.(n);
    } catch (error) {
      this.emit({
        kind: "inbound_invalid",
        error: toError(error),
      });
      this.replyInternalError(e);
    }
  }
  replyInternalError(e) {
    let jsonRpcResponseId = getJsonRpcResponseId(e);
    if (jsonRpcResponseId === undefined) return;
    this.sendRaw(
      jsonStringify({
        jsonrpc: "2.0",
        id: jsonRpcResponseId,
        error: {
          code: JSONRPC_INTERNAL_ERROR,
          message: "internal error",
        },
      }),
    );
  }
  handleClose = (e) => {
    let phase = this.authenticated ? "post_auth" : "pre_auth";
    let code = typeof e.code === "number" ? e.code : undefined;
    let reason = typeof e.reason === "string" ? e.reason : undefined;
    this.disconnect();
    this.emit({
      kind: "closed",
      phase,
      code,
      reason,
      superseded: code === WS_CLOSE_CODE_SUPERSEDED,
    });
  };
  handleSocketError = () => {
    this.emit({
      kind: "socket_error",
    });
  };
}
//@ chunk-ksxq075c.js:16507-16679 placement
/**
 * MCP initialize 请求
 */
function buildInitializeRequest() {
  return {
    jsonrpc: "2.0",
    id: SYNTHETIC_INIT_ID,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "remote-tools-bridge",
        version: "1.0.0",
      },
    },
  };
}
//@ chunk-ksxq075c.js:16679-16753 placement = _temp (1)
/**
 * 判断响应是否针对合成 initialize 请求。
 */
function isSyntheticInitResponse(r) {
  return "id" in r && r.id === SYNTHETIC_INIT_ID && ("result" in r || "error" in r);
}
//@ chunk-ksxq075c.js:16753-16862 placement
var JSONRPC_RESPONSE_SCHEMA = DoctorLazy(() =>
  u({
    jsonrpc: literal("2.0"),
    id: union([string(), E()]),
    method: string(),
    result: QD().optional(),
    error: QD().optional(),
  }),
);
//@ chunk-ksxq075c.js:16862-16935 placement
/**
 * 解析 JSON-RPC 响应里的 id（解析失败返回 undefined）。
 */
function getJsonRpcResponseId(e) {
  let n = JSONRPC_RESPONSE_SCHEMA().safeParse(e);
  return n.success ? n.data.id : undefined;
}
//@ chunk-ksxq075c.js:16935-17375 placement
/**
 * 解码 WebSocket 帧并限制大小
 */
function decodeSocketFrame(e) {
  if (typeof e === "string")
    return e.length > MAX_BRIDGE_MESSAGE_BYTES
      ? {
          kind: "oversize",
          size: e.length,
        }
      : {
          kind: "text",
          text: e,
        };
  if (e instanceof ArrayBuffer)
    return e.byteLength > MAX_BRIDGE_MESSAGE_BYTES
      ? {
          kind: "oversize",
          size: e.byteLength,
        }
      : {
          kind: "text",
          text: Buffer.from(e).toString("utf8"),
        };
  if (ArrayBuffer.isView(e))
    return e.byteLength > MAX_BRIDGE_MESSAGE_BYTES
      ? {
          kind: "oversize",
          size: e.byteLength,
        }
      : {
          kind: "text",
          text: Buffer.from(e.buffer, e.byteOffset, e.byteLength).toString("utf8"),
        };
  return {
    kind: "unsupported",
  };
}
//@ chunk-ksxq075c.js:17375-17568 placement
/**
 * 服务组只读视图
 */
function servingGroupView(e) {
  return {
    policy: e.policy,
    get description() {
      return e.description;
    },
    onRedescribed: e.onRedescribed,
    heldServedCall: e.heldServedCall,
    ensureSettingsHeld: e.ensureSettingsHeld,
    deps: e.deps,
  };
}
//@ chunk-ksxq075c.js:17568-17913 placement
/**
 * 原生与透传工具定义视图
 */
function deviceToolDefinitions(e) {
  let n = () => jsonStringify([e.definitionsOf(REMOTE_TOOLS), e.definitionsOf(MCP_PASSTHROUGH)]);
  return {
    native: () => e.definitionsOf(REMOTE_TOOLS).flatMap(toNativeToolAnnouncement),
    passthrough: () => e.definitionsOf(MCP_PASSTHROUGH).flatMap(toPassthroughToolAnnouncement),
    localNameFor: (i) =>
      e
        .definitionsOf(MCP_PASSTHROUGH)
        .filter((r) => r.name === i)
        .flatMap(toPassthroughToolAnnouncement)[0]?.local_name,
    subscribe: (i) => {
      let r = n();
      return e.subscribe((s) => {
        let d = n();
        if (d !== r) {
          r = d;
          i(s);
        }
      });
    },
  };
}
//@ chunk-ksxq075c.js:17913-18131 placement
/**
 * 原生设备工具的公告
 */
function toNativeToolAnnouncement(e) {
  let registration = parseRegistration(e._meta?.[ANTHROPIC_REMOTETOOLEXECUTION]);
  return registration === undefined
    ? []
    : [
        {
          name: e.name,
          refused_input_fields: registration.refused_input_fields,
          protocol_versions: registration.protocol_versions ?? [REMOTE_TOOL_PROTOCOL_VERSION],
          description: e.description,
          input_schema: e.inputSchema,
        },
      ];
}
//@ chunk-ksxq075c.js:18131-18390 placement
/**
 * 透传工具的公告
 */
function toPassthroughToolAnnouncement(e) {
  let passthroughMarker = parsePassthroughMarker(e._meta?.[PASSTHROUGH_MARKER_KEY]);
  if (passthroughMarker === undefined) return [];
  let i = pickToolAnnotations(e.annotations ?? {});
  let r = toolHintsFromMeta(e._meta ?? {});
  return [
    {
      name: e.name,
      local_name: passthroughMarker.tool,
      description: e.description,
      input_schema: e.inputSchema,
      ...(i !== undefined && {
        annotations: i,
      }),
      ...(r !== undefined && {
        hints: r,
      }),
    },
  ];
}
//@ chunk-ksxq075c.js:18390-18635 placement
/**
 * 挑出工具注解字段
 */
function pickToolAnnotations({ title, readOnlyHint, destructiveHint, openWorldHint }) {
  let s = {
    ...(title !== undefined && {
      title,
    }),
    ...(readOnlyHint !== undefined && {
      readOnlyHint,
    }),
    ...(destructiveHint !== undefined && {
      destructiveHint,
    }),
    ...(openWorldHint !== undefined && {
      openWorldHint,
    }),
  };
  return Object.keys(s).length > 0 ? s : undefined;
}
//@ chunk-ksxq075c.js:18635-18955 placement
/**
 * 从 _meta 取工具提示
 */
function toolHintsFromMeta(e) {
  let n = e[TOOL_META_KEYS.searchHint];
  let i = e[TOOL_META_KEYS.alwaysLoad];
  let r = e[TOOL_META_KEYS.maxResultSizeChars];
  let s = e[TOOL_META_KEYS.requiresUserInteraction];
  let d = {
    ...(typeof n === "string" && {
      search_hint: n,
    }),
    ...(i === true && {
      always_load: true,
    }),
    ...(typeof r === "number" && {
      max_result_size_chars: r,
    }),
    ...(s === true && {
      requires_user_interaction: true,
    }),
  };
  return Object.keys(d).length > 0 ? d : undefined;
}
//@ chunk-ksxq075c.js:18955-20076 placement
/**
 * 构建信息对象（版本、时间、git sha 等），用于上报。
 */
var WSS_BRIDGE_CLAUDEUSERCONTENT_COM = "wss://bridge.claudeusercontent.com";
var BRIDGE_STAGING_URL = "wss://bridge-staging.claudeusercontent.com";
var SESSION_SLUG_CHARS = 8;
var SERVED_BRIDGE_TRUSTED_DEVICES = "served-bridge-trusted-devices";
var buildInfo =
  typeof {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.316",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-10-30T23:28:13Z",
    GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  } !== "undefined"
    ? {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION
    : "unknown";
//@ chunk-ksxq075c.js:20076-20159 placement
/**
 * 生成设备名：主机名加会话 id 后缀。
 */
function deviceNameForSession(e, sessionId) {
  let i = deviceSlugOrFallback(e);
  let r = slugifyName(sessionIdBody(sessionId).slice(-SESSION_SLUG_CHARS), SESSION_SLUG_CHARS);
  return r ? `${i}-cc-${r}` : i;
}
//@ chunk-ksxq075c.js:20159-20283 placement
function getDeviceBridgePath(e, orgUuid, accountUuid, r) {
  return `${e}/devices/${encodeURIComponent(orgUuid)}_${encodeURIComponent(accountUuid)}/${encodeURIComponent(r)}/bridge`;
}
//@ chunk-ksxq075c.js:20283-20539 placement
/**
 * WebSocket 地址是否与 API 同源
 */
function isSameOriginWsUrl(e, n) {
  let i;
  let r;
  try {
    i = new URL(e);
    r = new URL(n);
  } catch {
    return false;
  }
  let s = i.hostname === "localhost" || i.hostname === "127.0.0.1" || i.hostname === "[::1]";
  return (
    i.origin === r.origin &&
    i.username === "" &&
    i.password === "" &&
    (i.protocol === "wss:" || (i.protocol === "ws:" && s))
  );
}
//@ chunk-ksxq075c.js:20539-20717 placement
/**
 * 设备桥地址（环境变量或按 OAuth 环境）
 */
function getDeviceBridgeUrl() {
  if (antEnv.CLAUDE_REMOTE_TOOLS_BRIDGE_URL !== undefined) return antEnv.CLAUDE_REMOTE_TOOLS_BRIDGE_URL;
  switch (fileSuffixForOauthConfig()) {
    case "":
      return WSS_BRIDGE_CLAUDEUSERCONTENT_COM;
    case "-staging-oauth":
      return BRIDGE_STAGING_URL;
    default:
      return;
  }
}
//@ chunk-ksxq075c.js:20717-24949 placement
/**
 * 启动设备注册：通过 WebSocket 设备桥公告本机工具、心跳与重连。
 */
function startDeviceRegistration(e) {
  let n = e.transport ?? (isSessionChannelDisabled() ? "bridge" : "auto");
  let i = false;
  let r;
  let s;
  let d;
  let S;
  let b = false;
  let O = false;
  let f = false;
  let k = new Set();
  let I = false;
  let R;
  let D;
  let w = {
    current: undefined,
  };
  let C;
  let B = (h) => (S ??= V(h));
  let V = async (h) => {
    i = true;
    s?.();
    s = undefined;
    if (b) await P.catch(() => false);
    r?.();
    r = undefined;
    d?.();
    d = undefined;
    w.current?.kit.dispose();
    let v = C?.dispose();
    C = undefined;
    await U(h);
    await v;
  };
  let U = async (h) => {
    let v = R;
    if (v === undefined) return;
    R = undefined;
    await v.stop();
    if (O)
      logEvent("tengu_device_bridge_stopped", {
        reason: fromEnum(h),
      });
  };
  let q = async () => {
    let h = e.readiness ?? (await import("./chunk-60g26dt5.js")).createServingReadiness();
    let startTime = performance.now();
    await h.whenReady();
    let readinessWaitMs = Math.round(performance.now() - startTime);
    let { cloudClient } = e;
    let Q = await (
      e.isEnabled ??
      (() =>
        isToolServingEnabled({
          cloudClient,
        }))
    )();
    b = true;
    if (!Q) return false;
    let isEgressAllowed = e.isEgressAllowed ?? isDeviceBindingAllowed;
    if (!isEgressAllowed()) {
      logForDebugging(
        "[deviceBridge] skipped: non-essential egress disabled, non-first-party provider, or remote sessions policy-denied",
      );
      return false;
    }
    if (i) return false;
    if (n === "bridge" && (e.isBridgeRefused ?? isTrustedDeviceRequiredOrUnknown)()) {
      logForDebugging(
        "[deviceBridge] skipped: the bridge cannot check a device proof and trusted devices are required or unknown",
      );
      f = true;
      logFeatureBad("device_bridge_register", "trusted_devices_required_or_unknown");
      e.onNotice?.(
        SERVED_BRIDGE_TRUSTED_DEVICES,
        REMOTE_TOOLS_CONSENT_TEXT["serving_off.bridge_trusted_devices"],
      );
      return false;
    }
    let M = await (e.getAccount ?? resolveCurrentDeviceBinding)();
    let orgUuid = e.orgUuid;
    if (!orgUuid || M.status !== "resolved") {
      logEvent("tengu_device_bridge_skipped", {
        missing_org: orgUuid === undefined,
        missing_account: M.status === "missing",
        account_mismatch: M.status === "mismatch",
      });
      logForDebugging(`[deviceBridge] skipped: ${orgUuid ? `account ${M.status}` : "no org"}`);
      return false;
    }
    let { accountUuid } = M;
    let limiter = createConcurrencyLimiter(DEFAULT_MAX_IN_FLIGHT);
    D = createDeviceToolRegistry();
    D.setGroup(CORE, []);
    await primeWindowsProfileDirs();
    if (i) return false;
    let W = remoteToolServingOffReason(undefined, {
      ignoringMute: true,
    });
    if (W === undefined) {
      await primeWindowsPlatform();
      if (i) return false;
    }
    let te =
      W === undefined && isViolinRibEnabled()
        ? await import("./chunk-3f6fc86f.js")
            .then((y) => y.gatherHostInventory(getOriginalCwd()))
            .catch((error) => {
              logError(toError(error));
              return;
            })
        : undefined;
    if (i) return false;
    let nn = undefined;
    let tn = undefined;
    let be = e.toolGroupProviders ?? (await loadServingGroupProviders(W));
    if (i) return false;
    let X = [];
    d = runCleanups(be, {
      registry: D,
      holdStartUntil: (y) => X.push(y),
      sessionId: e.sessionId,
      serving: {
        offReason: W,
      },
      getDeviceId:
        e.getDeviceId ??
        (() => {
          return;
        }),
      limiter,
      storageV5: e.storageV5,
      servedSettingsChanged: e.servedSettingsChanged,
      ...(e.deviceMcpQuestion && {
        deviceMcpQuestion: e.deviceMcpQuestion,
      }),
      servingKit: w,
      transport: n,
      readiness: h,
      ...(te !== undefined && {
        hostInventory: te,
      }),
      ...(C !== undefined && {
        execution: C.execution,
      }),
      sandboxRequiredNow: remoteToolVmRequired,
      ...(e.dirSync !== undefined && {
        dirSync: e.dirSync,
      }),
      ...(e.folderRelation !== undefined && {
        folderRelation: e.folderRelation,
      }),
      onNotice:
        e.onNotice ??
        ((y, De) => {
          logForDebugging(`[remote-tools] ${y}: ${De}`);
        }),
    });
    logForDebugging(`[deviceBridge] start-up held on ${X.length} reads of its tool groups`);
    let startTime_2 = performance.now();
    await Promise.allSettled(X);
    let rounded = Math.round(performance.now() - startTime_2);
    logForDebugging(`[deviceBridge] start-up released after ${rounded} ms`);
    if (i) return false;
    let registry = D;
    if (n === "bridge") {
      R = await openDeviceBridge({
        options: e,
        orgUuid,
        accountUuid,
        registry,
        isEgressAllowed,
        isStopped: () => i,
        onLivenessEvent,
        onTransportEvent,
      });
      if (R === undefined || i) {
        await R?.stop();
        R = undefined;
        return false;
      }
    }
    let re = () => {
      if (!isEgressAllowed()) B("egress_denied");
    };
    let ke =
      e.isStillEnabled ??
      (() =>
        getToolServingFlagAnsweredOff({
          cloudClient,
        }) === undefined);
    let oe = () => {
      if (!ke()) {
        logForDebugging("[deviceBridge] stopping: the gate turned off");
        B("gate_off");
      }
    };
    let Re = (e.onEgressGateChange ?? onComplianceTaintsChanged)(re);
    let Ee = (e.onEnabledChange ?? onGrowthBookRefresh)(oe);
    s = () => {
      Re();
      Ee();
    };
    re();
    oe();
    if (i) return false;
    O = true;
    logEvent("tengu_device_bridge_started", {
      account_source: fromEnum(M.source),
      transport: fromEnum(n),
      redial: false,
      readiness_wait_ms: readinessWaitMs,
      held_ms: rounded,
    });
    if (n === "auto" && !f) {
      f = true;
      logFeatureOk("device_bridge_register");
    }
    R?.start();
    return true;
  };
  let onTransportEvent = (h) => {
    if (h.kind === "authenticated") {
      k.clear();
      I = false;
      if (!f) {
        f = true;
        logFeatureOk("device_bridge_register");
      }
      logTransportEvent(h);
      return;
    }
    let v = describeTransportEvent(h);
    if (v === undefined) return;
    if (k.has(v)) return;
    k.add(v);
    logTransportEvent(h);
  };
  let onLivenessEvent = (h) => {
    if (h.kind === "reconnect_exhausted") {
      if (!f) {
        f = true;
        logFeatureBad("device_bridge_register", "reconnect_exhausted");
      }
      if (I) return;
      I = true;
    }
    logLivenessEvent(h);
  };
  r = (e.registerExitCleanup ?? registerCleanup)(() => B("exit"));
  let P = q().catch((error) => {
    logForDebugging(`[deviceBridge] registration failed: ${toError(error).message}`);
    logEvent("tengu_device_bridge_start_failed", {});
    if (!f) {
      f = true;
      logFeatureBad("device_bridge_register", "start_failed");
    }
    return false;
  });
  let serving = P.then((h) =>
    h && D !== undefined && w.current !== undefined
      ? {
          kit: servingGroupView(w.current.kit),
          source: deviceToolDefinitions(D),
        }
      : undefined,
  );
  P.then((h) => {
    if (!h && !i) {
      r?.();
      r = undefined;
      d?.();
      d = undefined;
      w.current?.kit.dispose();
      C?.dispose();
      C = undefined;
    }
  });
  return {
    started: P,
    announceSettled: () => {},
    serving,
    stop: () => B("attach_ended"),
    heldServedCall: (h) => (i || w.current === undefined ? NOT_HELD_LEASE : w.current.kit.heldServedCall(h)),
  };
}
//@ chunk-ksxq075c.js:24949-26363 placement
/**
 * 建立设备桥连接
 */
async function openDeviceBridge({
  options,
  orgUuid,
  accountUuid,
  registry,
  isEgressAllowed,
  isStopped,
  onLivenessEvent,
  onTransportEvent,
}) {
  let O = deviceNameForSession((options.getHostname ?? hostname)(), options.sessionId);
  let f = options.getBridgeBaseUrl !== undefined || antEnv.CLAUDE_REMOTE_TOOLS_BRIDGE_URL !== undefined;
  let k = (options.getBridgeBaseUrl ?? getDeviceBridgeUrl)();
  if (k === undefined) {
    logForDebugging("[deviceBridge] skipped: no device bridge for this OAuth environment");
    return;
  }
  let deviceBridgePath = getDeviceBridgePath(k, orgUuid, accountUuid, O);
  let { createDeviceMcpServer, deviceInfoProbeTool, parseJsonRpcMessage } =
    await import("./chunk-zethn0a3.js");
  if (isStopped()) return;
  let C = {
    getDeviceName: () => O,
    version: buildInfo,
  };
  let B = deviceInfoProbeTool(C);
  let V = deviceInfoProbeTool({
    ...C,
    idle: true,
  });
  let U = (A) => {
    let all = registry.definitions().every((L) => L.name === B.definition.name);
    registry.setGroup(CORE, [all ? V : B], A);
  };
  U();
  let q = registry.subscribe(U);
  let x = () => {
    q();
    registry.setGroup(CORE, []);
  };
  let G = new DeviceBridgeTransport({
    getUrl: () => deviceBridgePath,
    getAccessToken: () => options.getAccessToken(),
    getTools: () => announcedToolsForConnect(registry),
    getDeviceId: options.getDeviceId,
    getSessionId: () => toInfraSessionId(options.sessionId),
    parseMessage: parseJsonRpcMessage,
    createSocket: options.createSocket,
    isAllowedUrl: (A) => isEgressAllowed() && (isBareWssUrl(A) || (f && isSameOriginWsUrl(A, k))),
  });
  let { server, inFlightCalls, whenIdle } = createDeviceMcpServer({
    registry,
    version: buildInfo,
    sessionId: options.sessionId,
  });
  try {
    await server.connect(G);
  } catch (error) {
    x();
    throw error;
  }
  if (isStopped()) {
    x();
    await server.close();
    return;
  }
  let v = new DeviceRegistrationSession({
    transport: G,
    announced: {
      hasUnservedChange: registry.hasUnservedChange,
      inFlightCalls,
      whenIdle,
    },
    onEvent: onLivenessEvent,
    onTransportEvent,
  });
  let J = registry.subscribe((A) => v.requestReannounce(A));
  let j;
  return {
    start: () => v.start(),
    stop: () =>
      (j ??= (async () => {
        J();
        x();
        await Promise.allSettled([v.stop(), server.close()]);
      })()),
  };
}
//@ chunk-ksxq075c.js:26363-26652 placement
/**
 * 传输事件转键
 */
function describeTransportEvent(e) {
  switch (e.kind) {
    case "rejected":
      return `rejected:${e.phase}:${e.reason ?? ""}:${e.status ?? ""}`;
    case "closed":
      return `closed:${e.phase}:${e.code ?? ""}:${e.superseded}`;
    case "token_unavailable":
    case "handshake_timeout":
    case "socket_error":
    case "dial_failed":
      return e.kind;
    default:
      return;
  }
}
//@ chunk-ksxq075c.js:26652-27389 placement
/**
 * 记录设备桥传输事件遥测
 */
function logTransportEvent(e) {
  switch (e.kind) {
    case "authenticated":
      logEvent("tengu_device_bridge_connected", {
        protocol_version: e.protocolVersion,
        hb_interval_ms: e.timings.hbIntervalMs,
        staleness_ms: e.timings.stalenessMs,
        rpc_timeout_ms: e.timings.rpcTimeoutMs,
      });
      return;
    case "rejected":
      logEvent("tengu_device_bridge_rejected", {
        phase: fromEnum(e.phase),
        reason: fromEnumOpt(e.reason),
        status: fromNumberOpt(e.status),
        slot_contention: e.slotContention,
      });
      return;
    case "closed":
      logEvent("tengu_device_bridge_closed", {
        phase: fromEnum(e.phase),
        code: fromNumberOpt(e.code),
        superseded: e.superseded,
      });
      return;
    case "token_unavailable":
    case "handshake_timeout":
    case "socket_error":
      logEvent("tengu_device_bridge_connect_failed", {
        cause: fromEnum(e.kind),
      });
      return;
    case "dial_failed":
      logEvent("tengu_device_bridge_connect_failed", {
        cause: fromEnum("dial_failed"),
      });
      return;
    default:
      return;
  }
}
//@ chunk-ksxq075c.js:27389-28025 placement
/**
 * 记录设备桥存活事件遥测
 */
function logLivenessEvent(e) {
  switch (e.kind) {
    case "pong_timeout":
      logEvent("tengu_device_bridge_pong_timeout", {
        consecutive: e.consecutive,
      });
      return;
    case "reconnect_exhausted":
      logEvent("tengu_device_bridge_reconnect_exhausted", {});
      return;
    case "heartbeat_unsupported":
      logEvent("tengu_device_bridge_heartbeat_unsupported", {
        protocol_version: fromNumber(e.protocolVersion),
      });
      return;
    case "reannounce":
      logEvent("tengu_device_bridge_reannounce", {
        reason: fromEnum(e.reason),
        outcome: fromEnum(e.outcome),
        inflight_at_start: e.inFlightAtStart,
        drained_ms: e.drainedMs,
        drain_timed_out: e.drainTimedOut,
      });
      return;
    case "reannounce_contended":
      logEvent("tengu_device_bridge_reannounce_contended", {
        reason: fromEnum(e.reason),
      });
      return;
    default:
      return;
  }
}
//@ chunk-ksxq075c.js:28025-28304 placement
/**
 * 加载远程工具与透传服务组
 */
async function loadServingGroupProviders(e) {
  if (e === undefined || isPersonFixableOffReason(e))
    try {
      let [{ remoteToolServingGroupProvider: n }, { passthroughServingGroupProvider: i }, r] =
        await Promise.all([import("./chunk-wa3cc7ae.js"), import("./chunk-xqfbbyzk.js"), undefined]);
      return e === undefined ? [n(), i(), ...[]] : [n()];
    } catch (error) {
      logError(toError(error));
    }
  return [];
}
//@ chunk-ksxq075c.js:28304-28458 placement
/**
 * 依次执行并收集清理函数
 */
function runCleanups(e, n) {
  let flattened = e.flatMap((r) => {
    try {
      let s = r(n);
      return s ? [s] : [];
    } catch (error) {
      logError(toError(error));
      return [];
    }
  });
  return () =>
    flattened.forEach((r) => {
      try {
        r();
      } catch (error) {
        logError(toError(error));
      }
    });
}
//@ chunk-ksxq075c.js:28458-28844 placement
/**
 * 连接帧公告的工具
 */
function announcedToolsForConnect(registry) {
  let n = registry.hasUnservedChange();
  let i = registry.serve();
  if (!n) return i;
  let mapped = i.map((s) => s.name);
  logForDebugging(
    `[deviceBridge] connect frame announces ${i.length} tools: ${mapped.slice(0, 12).join(", ")}${mapped.length > 12 ? ", \u2026" : ""}`,
  );
  logEvent("tengu_device_bridge_connect_frame", {
    tool_count: i.length,
    serves_bash: mapped.includes(BASH_TOOL_NAME),
    serves_powershell: mapped.includes(POWERSHELL_TOOL_NAME),
    mcp_tool_count: count(mapped, (s) => s.includes("__")),
  });
  return i;
}
export { startDeviceRegistration };

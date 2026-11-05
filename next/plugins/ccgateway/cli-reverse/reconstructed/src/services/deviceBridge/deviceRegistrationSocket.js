/**
 * services/deviceBridge/deviceRegistrationSocket.ts
 *
 * 2.1.316 新增。设备注册 WebSocket：向设备桥公告本机工具、心跳、重连与争用退避。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ad8gs4gj.js (30)
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
import {
  objectSchema,
  literal,
  union,
  stringSchema,
  numberSchema,
  undefinedSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
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
import { countWhere } from "../../utils/collections.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ad8gs4gj.js:1619-9377 placement
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
  constructor(options) {
    this.transport = options.transport;
    this.announced = options.announced;
    this.onEvent = options.onEvent;
    this.onTransportEvent = options.onTransportEvent;
    this.now = options.now ?? Date.now;
    this.random = options.random ?? Math.random;
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
  requestReannounce(reason) {
    if (!this.started || this.stopping) return;
    let delayMs = REANNOUNCE_DELAYS_MS[reason];
    switch (this.reannounce.phase) {
      case "draining":
      case "rotating":
        return;
      case "coalescing":
        if (this.reannounce.fireAt <= this.now() + delayMs) return;
        clearTimeout(this.reannounce.timer);
        break;
      case "idle":
        break;
    }
    this.reannounce = {
      phase: "coalescing",
      reason,
      fireAt: this.now() + delayMs,
      timer: setTimeout(this.beginReannounce, delayMs),
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
  handleTransportEvent = (event) => {
    switch ((this.notifyTransportListener(event), event.kind)) {
      case "authenticated":
        this.handleAuthenticated(event.protocolVersion, event.timings);
        return;
      case "hb_ack":
        this.handleAck();
        return;
      case "rejected": {
        let rotationReason = this.endRotation();
        let contended = rotationReason !== undefined && event.reason === "duplicate_device_id";
        if (contended)
          this.emit({
            kind: "reannounce_contended",
            reason: rotationReason,
          });
        else if (event.slotContention) this.lastFailureWasContention = true;
        this.cancelDrain();
        this.clearConnectionTimers();
        this.scheduleReconnect(contended);
        return;
      }
      case "closed":
        if (event.superseded) this.lastFailureWasContention = true;
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
  handleAuthenticated(protocolVersion, timings) {
    if (this.stopping) return;
    this.timers = describeDeviceError(timings);
    this.lastAckAt = this.now();
    this.clearKeepaliveTimer();
    if (this.endRotation() === undefined || this.stableTimer === undefined) {
      this.clearStableTimer();
      this.stableTimer = setTimeout(this.markStable, DEVICE_STABLE_QUALIFY_MS);
    }
    if (this.announced.hasUnservedChange()) this.requestReannounce("connected_stale");
    if (protocolVersion < 1) {
      this.consecutivePongTimeouts = 0;
      this.emit({
        kind: "heartbeat_unsupported",
        protocolVersion,
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
  scheduleReconnect(fastRetry = false) {
    if (this.stopping || !this.started || this.reconnectTimer !== undefined) return;
    let delayMs = this.nextDelayMs(fastRetry);
    if (this.stopping) return;
    this.reconnectTimer = setTimeout(this.reconnect, delayMs);
    this.emit({
      kind: "reconnect_scheduled",
      delayMs,
      attempt: this.reconnectAttempts,
      slotContention: this.consecutiveSlotContention > 0,
    });
  }
  nextDelayMs(contention) {
    let lastFailureWasContention = this.lastFailureWasContention;
    this.lastFailureWasContention = false;
    if (contention) return computeReconnectDelayMs(0, 1, this.timers.slotContentionFastAttempts, this.random);
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
    let skipOutcome = this.reannounceSkipOutcome();
    if (skipOutcome !== undefined) {
      this.emit({
        kind: "reannounce",
        reason,
        outcome: skipOutcome,
        inFlightAtStart,
        drainedMs: 0,
        drainTimedOut: false,
      });
      return;
    }
    let drainState = {
      phase: "draining",
      reason,
      startedAt: this.now(),
      inFlightAtStart,
      timer: setTimeout(this.handleDrainTimeout, this.timers.rotateDrainMaxMs),
    };
    this.reannounce = drainState;
    this.announced.whenIdle().then(
      () => this.rotate(drainState, false),
      () => this.rotate(drainState, false),
    );
  };
  handleDrainTimeout = () => {
    if (this.reannounce.phase === "draining") this.rotate(this.reannounce, true);
  };
  rotate(drainState, drainTimedOut) {
    if (this.reannounce !== drainState) return;
    clearTimeout(drainState.timer);
    this.reannounce = {
      phase: "idle",
    };
    if (this.stopping) return;
    let outcome = this.reannounceSkipOutcome() ?? "rotated";
    if (outcome === "rotated")
      this.reannounce = {
        phase: "rotating",
        reason: drainState.reason,
      };
    this.emit({
      kind: "reannounce",
      reason: drainState.reason,
      outcome,
      inFlightAtStart: drainState.inFlightAtStart,
      drainedMs: this.now() - drainState.startedAt,
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
  emit(event) {
    try {
      this.onEvent?.(event);
    } catch (error) {
      logForDebugging(`[deviceBridge] liveness event listener threw: ${toError(error).message}`);
    }
  }
  notifyTransportListener(event) {
    try {
      this.onTransportEvent?.(event);
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
//@ chunk-ad8gs4gj.js:9377-9989 placement
/**
 * 设备工具注册表（按组设置、去重）
 */
function createDeviceToolRegistry() {
  let groupsByName = new Map();
  let signal = createSignal();
  let current = dedupeToolsByName(groupsByName);
  let servedHash;
  return {
    get: (name) => current.byName.get(name),
    setGroup(group, tools, reason = "tools_changed") {
      groupsByName.set(group, [...tools]);
      let next = dedupeToolsByName(groupsByName);
      let previous = current;
      current = next;
      if (next.dropped.length > 0 && jsonStringify(next.dropped) !== jsonStringify(previous.dropped))
        logForDebugging(
          `[deviceBridge] duplicate device tool names not announced: ${jsonStringify(next.dropped)}`,
        );
      if (next.hash === previous.hash) return;
      try {
        signal.emit(reason);
      } catch (error) {
        for (let reportedError of error instanceof AggregateError ? error.errors : [error])
          logError(reportedError);
      }
    },
    definitions: () => current.definitions,
    definitionsOf: (group) =>
      (groupsByName.get(group) ?? []).flatMap((entry) =>
        current.byName.get(entry.definition.name) === entry ? [entry.definition] : [],
      ),
    serve() {
      servedHash = current.hash;
      return current.definitions;
    },
    hasUnservedChange: () => servedHash !== current.hash,
    subscribe: signal.subscribe,
  };
}
//@ chunk-ad8gs4gj.js:9989-10285 placement
/**
 * 按名字去重工具并记录丢弃
 */
function dedupeToolsByName(toolGroups) {
  let { byName, dropped } = [...toolGroups.values()].flat().reduce(
    (acc, tool) => {
      let name = tool.definition.name;
      if (acc.byName.has(name)) acc.dropped.push(name);
      else acc.byName.set(name, tool);
      return acc;
    },
    {
      byName: new Map(),
      dropped: [],
    },
  );
  let mapped = [...byName.values()].map((entry) => entry.definition);
  return {
    byName,
    definitions: mapped,
    dropped,
    hash: bunHashOf(jsonStringify(mapped)),
  };
}
//@ chunk-ad8gs4gj.js:10285-10385 placement
/**
 * 设备桥接 RPC 的常量：状态值、JSON-RPC 内部错误码、令牌截止符号、合成初始化 id、最大消息大小。
 */
var RPC_STATE_IDLE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var WS_OPEN;
var JSONRPC_INTERNAL_ERROR;
var TOKEN_DEADLINE_SYMBOL;
var SYNTHETIC_INIT_ID;
var MAX_BRIDGE_MESSAGE_BYTES;
deferInit("chunk-ad8gs4gj.js:10285", () => {
  RPC_STATE_IDLE = 0;
  WS_OPEN = 1;
  JSONRPC_INTERNAL_ERROR = -32603;
  TOKEN_DEADLINE_SYMBOL = Symbol("device-bridge-token-deadline");
  SYNTHETIC_INIT_ID = "__synthetic_init__";
  MAX_BRIDGE_MESSAGE_BYTES = 33554432;
});
//@ chunk-ad8gs4gj.js:10385-10507 placement
function openBridgeWebSocket(url) {
  let socket = new globalThis.WebSocket(url, {
    proxy: getWebSocketProxyUrl(url),
    tls: getWebSocketTLSOptions(undefined) || undefined,
  });
  socket.binaryType = "arraybuffer";
  return socket;
}
//@ chunk-ad8gs4gj.js:10507-16541 placement
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
  async send(message) {
    if (isSyntheticInitResponse(message)) return;
    let ws = this.ws;
    if (!ws || !this.authenticated || ws.readyState !== WS_OPEN) {
      this.emit({
        kind: "outbound_dropped",
        messageType: getJsonRpcResponseId(message) === undefined ? "other" : "request",
      });
      return;
    }
    try {
      ws.send(jsonStringify(message));
    } catch (error) {
      logForDebugging(`[deviceBridge] outbound send failed: ${toError(error).message}`);
      this.emit({
        kind: "outbound_dropped",
        messageType: getJsonRpcResponseId(message) === undefined ? "other" : "request",
      });
    }
  }
  sendRaw(frame) {
    let ws = this.ws;
    if (!ws || ws.readyState !== WS_OPEN) return false;
    try {
      ws.send(frame);
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
    let generation = ++this.connectGeneration;
    let accessToken = await this.resolveAccessToken();
    if (generation !== this.connectGeneration || this.closing || this.ws !== undefined) return;
    if (!accessToken) {
      this.emit({
        kind: "token_unavailable",
      });
      return;
    }
    let url;
    let urlAllowed;
    try {
      url = this.options.getUrl();
      urlAllowed = (this.options.isAllowedUrl ?? isBareWssUrl)(url);
    } catch (error) {
      this.emit({
        kind: "dial_failed",
        error: toError(error),
      });
      return;
    }
    if (!urlAllowed) {
      logForDebugging("[deviceBridge] refusing dial: bridge URL failed validation");
      this.emit({
        kind: "dial_failed",
        error: Error("bridge URL failed validation"),
      });
      return;
    }
    let ws;
    try {
      ws = (this.options.createSocket ?? openBridgeWebSocket)(url);
    } catch (error) {
      this.emit({
        kind: "dial_failed",
        error: toError(error),
      });
      return;
    }
    this.ws = ws;
    this.pendingToken = accessToken;
    this.handshakeTimer = setTimeout(this.handleHandshakeTimeout, HANDSHAKE_TIMEOUT_MS);
    ws.addEventListener("open", this.handleOpen);
    ws.addEventListener("message", this.handleMessage);
    ws.addEventListener("close", this.handleClose);
    ws.addEventListener("error", this.handleSocketError);
    this.emit({
      kind: "connecting",
    });
    if (this.closing || this.ws !== ws) return;
    if (ws.readyState === WS_OPEN) this.handleOpen();
  }
  async resolveAccessToken() {
    let deadlineTimer;
    try {
      let winner = await Promise.race([
        Promise.resolve(this.options.getAccessToken()),
        new Promise((resolve) => {
          deadlineTimer = setTimeout(
            (resolve) => resolve(TOKEN_DEADLINE_SYMBOL),
            HANDSHAKE_TIMEOUT_MS,
            resolve,
          );
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
      if (deadlineTimer !== undefined) clearTimeout(deadlineTimer);
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
  emit(event) {
    try {
      this.onevent?.(event);
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
  handleMessage = (messageEvent) => {
    let decoded = decodeSocketFrame(messageEvent.data);
    if (decoded.kind === "unsupported") {
      logForDebugging("[deviceBridge] dropping unsupported inbound payload type");
      this.emit({
        kind: "inbound_invalid",
        error: Error("unsupported inbound payload type"),
      });
      return;
    }
    if (decoded.kind === "oversize") {
      logForDebugging(
        `[deviceBridge] dropping ${decoded.size}-unit inbound frame (cap ${MAX_BRIDGE_MESSAGE_BYTES})`,
      );
      this.emit({
        kind: "inbound_invalid",
        error: Error("inbound frame exceeded the device bridge size cap"),
      });
      return;
    }
    let deviceFrame = parseDeviceFrame(decoded.text);
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
    let initMessage;
    try {
      initMessage = this.options.parseMessage(buildInitializeRequest());
    } catch (error) {
      this.emit({
        kind: "inbound_invalid",
        error: toError(error),
      });
      return;
    }
    try {
      this.onmessage?.(initMessage);
    } catch (error) {
      this.emit({
        kind: "inbound_invalid",
        error: toError(error),
      });
    }
  }
  handleReject(reason, status, detail) {
    let preAuth = !this.authenticated;
    this.disconnect();
    this.emit({
      kind: "rejected",
      phase: preAuth ? "pre_auth" : "post_auth",
      reason,
      status,
      detail,
      slotContention: preAuth && isDeviceIdentityConflict(reason),
    });
  }
  deliver(frame) {
    if (!this.authenticated) return;
    let message;
    try {
      message = this.options.parseMessage(frame);
    } catch (error) {
      this.emit({
        kind: "inbound_invalid",
        error: toError(error),
      });
      this.replyInternalError(frame);
      return;
    }
    try {
      this.onmessage?.(message);
    } catch (error) {
      this.emit({
        kind: "inbound_invalid",
        error: toError(error),
      });
      this.replyInternalError(frame);
    }
  }
  replyInternalError(request) {
    let jsonRpcResponseId = getJsonRpcResponseId(request);
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
  handleClose = (closeEvent) => {
    let phase = this.authenticated ? "post_auth" : "pre_auth";
    let code = typeof closeEvent.code === "number" ? closeEvent.code : undefined;
    let reason = typeof closeEvent.reason === "string" ? closeEvent.reason : undefined;
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
//@ chunk-ad8gs4gj.js:16541-16713 placement
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
//@ chunk-ad8gs4gj.js:16713-16787 placement (2.1.88 match: _temp, 1)
/**
 * 判断响应是否针对合成 initialize 请求。
 */
function isSyntheticInitResponse(r) {
  return "id" in r && r.id === SYNTHETIC_INIT_ID && ("result" in r || "error" in r);
}
//@ chunk-ad8gs4gj.js:16787-16896 placement
var JSONRPC_RESPONSE_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-ad8gs4gj.js:16787", () => {
  JSONRPC_RESPONSE_SCHEMA = DoctorLazy(() =>
    objectSchema({
      jsonrpc: literal("2.0"),
      id: union([stringSchema(), numberSchema()]),
      method: stringSchema(),
      result: undefinedSchema().optional(),
      error: undefinedSchema().optional(),
    }),
  );
});
//@ chunk-ad8gs4gj.js:16896-16969 placement
/**
 * 解析 JSON-RPC 响应里的 id（解析失败返回 undefined）。
 */
function getJsonRpcResponseId(frame) {
  let parsed = JSONRPC_RESPONSE_SCHEMA().safeParse(frame);
  return parsed.success ? parsed.data.id : undefined;
}
//@ chunk-ad8gs4gj.js:16969-17409 placement
/**
 * 解码 WebSocket 帧并限制大小
 */
function decodeSocketFrame(data) {
  if (typeof data === "string")
    return data.length > MAX_BRIDGE_MESSAGE_BYTES
      ? {
          kind: "oversize",
          size: data.length,
        }
      : {
          kind: "text",
          text: data,
        };
  if (data instanceof ArrayBuffer)
    return data.byteLength > MAX_BRIDGE_MESSAGE_BYTES
      ? {
          kind: "oversize",
          size: data.byteLength,
        }
      : {
          kind: "text",
          text: Buffer.from(data).toString("utf8"),
        };
  if (ArrayBuffer.isView(data))
    return data.byteLength > MAX_BRIDGE_MESSAGE_BYTES
      ? {
          kind: "oversize",
          size: data.byteLength,
        }
      : {
          kind: "text",
          text: Buffer.from(data.buffer, data.byteOffset, data.byteLength).toString("utf8"),
        };
  return {
    kind: "unsupported",
  };
}
//@ chunk-ad8gs4gj.js:17409-17602 placement
/**
 * 服务组只读视图
 */
function servingGroupView(kit) {
  return {
    policy: kit.policy,
    get description() {
      return kit.description;
    },
    onRedescribed: kit.onRedescribed,
    heldServedCall: kit.heldServedCall,
    ensureSettingsHeld: kit.ensureSettingsHeld,
    deps: kit.deps,
  };
}
//@ chunk-ad8gs4gj.js:17602-17947 placement
/**
 * 原生与透传工具定义视图
 */
function deviceToolDefinitions(registry) {
  let hashOfGroups = () =>
    jsonStringify([registry.definitionsOf(REMOTE_TOOLS), registry.definitionsOf(MCP_PASSTHROUGH)]);
  return {
    native: () => registry.definitionsOf(REMOTE_TOOLS).flatMap(toNativeToolAnnouncement),
    passthrough: () => registry.definitionsOf(MCP_PASSTHROUGH).flatMap(toPassthroughToolAnnouncement),
    localNameFor: (remoteName) =>
      registry
        .definitionsOf(MCP_PASSTHROUGH)
        .filter((definition) => definition.name === remoteName)
        .flatMap(toPassthroughToolAnnouncement)[0]?.local_name,
    subscribe: (listener) => {
      let lastHash = hashOfGroups();
      return registry.subscribe((reason) => {
        let hash = hashOfGroups();
        if (hash !== lastHash) {
          lastHash = hash;
          listener(reason);
        }
      });
    },
  };
}
//@ chunk-ad8gs4gj.js:17947-18165 placement
/**
 * 原生设备工具的公告
 */
function toNativeToolAnnouncement(tool) {
  let registration = parseRegistration(tool._meta?.[ANTHROPIC_REMOTETOOLEXECUTION]);
  return registration === undefined
    ? []
    : [
        {
          name: tool.name,
          refused_input_fields: registration.refused_input_fields,
          protocol_versions: registration.protocol_versions ?? [REMOTE_TOOL_PROTOCOL_VERSION],
          description: tool.description,
          input_schema: tool.inputSchema,
        },
      ];
}
//@ chunk-ad8gs4gj.js:18165-18424 placement
/**
 * 透传工具的公告
 */
function toPassthroughToolAnnouncement(tool) {
  let passthroughMarker = parsePassthroughMarker(tool._meta?.[PASSTHROUGH_MARKER_KEY]);
  if (passthroughMarker === undefined) return [];
  let annotations = pickToolAnnotations(tool.annotations ?? {});
  let hints = toolHintsFromMeta(tool._meta ?? {});
  return [
    {
      name: tool.name,
      local_name: passthroughMarker.tool,
      description: tool.description,
      input_schema: tool.inputSchema,
      ...(annotations !== undefined && {
        annotations,
      }),
      ...(hints !== undefined && {
        hints,
      }),
    },
  ];
}
//@ chunk-ad8gs4gj.js:18424-18669 placement
/**
 * 挑出工具注解字段
 */
function pickToolAnnotations({ title, readOnlyHint, destructiveHint, openWorldHint }) {
  let picked = {
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
  return Object.keys(picked).length > 0 ? picked : undefined;
}
//@ chunk-ad8gs4gj.js:18669-18989 placement
/**
 * 从 _meta 取工具提示
 */
function toolHintsFromMeta(meta) {
  let searchHint = meta[TOOL_META_KEYS.searchHint];
  let alwaysLoad = meta[TOOL_META_KEYS.alwaysLoad];
  let maxResultSizeChars = meta[TOOL_META_KEYS.maxResultSizeChars];
  let requiresUserInteraction = meta[TOOL_META_KEYS.requiresUserInteraction];
  let hints = {
    ...(typeof searchHint === "string" && {
      search_hint: searchHint,
    }),
    ...(alwaysLoad === true && {
      always_load: true,
    }),
    ...(typeof maxResultSizeChars === "number" && {
      max_result_size_chars: maxResultSizeChars,
    }),
    ...(requiresUserInteraction === true && {
      requires_user_interaction: true,
    }),
  };
  return Object.keys(hints).length > 0 ? hints : undefined;
}
//@ chunk-ad8gs4gj.js:18989-20110 placement
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
    VERSION: "2.1.318",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-11-03T18:52:53Z",
    GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  } !== "undefined"
    ? {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.318",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-11-03T18:52:53Z",
        GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION
    : "unknown";
//@ chunk-ad8gs4gj.js:20110-20193 placement
/**
 * 生成设备名：主机名加会话 id 后缀。
 */
function deviceNameForSession(device, sessionId) {
  let deviceSlug = deviceSlugOrFallback(device);
  let sessionSlug = slugifyName(sessionIdBody(sessionId).slice(-SESSION_SLUG_CHARS), SESSION_SLUG_CHARS);
  return sessionSlug ? `${deviceSlug}-cc-${sessionSlug}` : deviceSlug;
}
//@ chunk-ad8gs4gj.js:20193-20317 placement
function getDeviceBridgePath(baseUrl, orgUuid, accountUuid, deviceKey) {
  return `${baseUrl}/devices/${encodeURIComponent(orgUuid)}_${encodeURIComponent(accountUuid)}/${encodeURIComponent(deviceKey)}/bridge`;
}
//@ chunk-ad8gs4gj.js:20317-20573 placement
/**
 * WebSocket 地址是否与 API 同源
 */
function isSameOriginWsUrl(urlA, urlB) {
  let parsedA;
  let parsedB;
  try {
    parsedA = new URL(urlA);
    parsedB = new URL(urlB);
  } catch {
    return false;
  }
  let isLoopback =
    parsedA.hostname === "localhost" || parsedA.hostname === "127.0.0.1" || parsedA.hostname === "[::1]";
  return (
    parsedA.origin === parsedB.origin &&
    parsedA.username === "" &&
    parsedA.password === "" &&
    (parsedA.protocol === "wss:" || (parsedA.protocol === "ws:" && isLoopback))
  );
}
//@ chunk-ad8gs4gj.js:20573-20751 placement
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
//@ chunk-ad8gs4gj.js:20751-24984 placement
/**
 * 启动设备注册：通过 WebSocket 设备桥公告本机工具、心跳与重连。
 */
function startDeviceRegistration(options) {
  let transportKind = options.transport ?? (isSessionChannelDisabled() ? "bridge" : "auto");
  let stopped = false;
  let unregisterExit;
  let unsubscribeGates;
  let runGroupCleanups;
  let servingDisposer;
  let readinessDone = false;
  let bridgeStarted = false;
  let outcomeLogged = false;
  let loggedTransportEvents = new Set();
  let loggedReconnectExhausted = false;
  let bridge;
  let registry;
  let servingKitRef = {
    current: undefined,
  };
  let execution;
  let stopRegistration = (reason) => (servingDisposer ??= tearDown(reason));
  let tearDown = async (reason) => {
    stopped = true;
    unsubscribeGates?.();
    unsubscribeGates = undefined;
    if (readinessDone) await startPromise.catch(() => false);
    unregisterExit?.();
    unregisterExit = undefined;
    runGroupCleanups?.();
    runGroupCleanups = undefined;
    servingKitRef.current?.kit.dispose();
    let executionDispose = execution?.dispose();
    execution = undefined;
    await stopBridge(reason);
    await executionDispose;
  };
  let stopBridge = async (reason) => {
    let currentBridge = bridge;
    if (currentBridge === undefined) return;
    bridge = undefined;
    await currentBridge.stop();
    if (bridgeStarted)
      logEvent("tengu_device_bridge_stopped", {
        reason: fromEnum(reason),
      });
  };
  let startUp = async () => {
    let readiness =
      options.readiness ??
      (await import("../../remote/tools/serve/servingReadiness.js")).createServingReadiness();
    let startTime = performance.now();
    await readiness.whenReady();
    let readinessWaitMs = Math.round(performance.now() - startTime);
    let { cloudClient } = options;
    let enabled = await (
      options.isEnabled ??
      (() =>
        isToolServingEnabled({
          cloudClient,
        }))
    )();
    readinessDone = true;
    if (!enabled) return false;
    let isEgressAllowed = options.isEgressAllowed ?? isDeviceBindingAllowed;
    if (!isEgressAllowed()) {
      logForDebugging(
        "[deviceBridge] skipped: non-essential egress disabled, non-first-party provider, or remote sessions policy-denied",
      );
      return false;
    }
    if (stopped) return false;
    if (transportKind === "bridge" && (options.isBridgeRefused ?? isTrustedDeviceRequiredOrUnknown)()) {
      logForDebugging(
        "[deviceBridge] skipped: the bridge cannot check a device proof and trusted devices are required or unknown",
      );
      outcomeLogged = true;
      logFeatureBad("device_bridge_register", "trusted_devices_required_or_unknown");
      options.onNotice?.(
        SERVED_BRIDGE_TRUSTED_DEVICES,
        REMOTE_TOOLS_CONSENT_TEXT["serving_off.bridge_trusted_devices"],
      );
      return false;
    }
    let binding = await (options.getAccount ?? resolveCurrentDeviceBinding)();
    let orgUuid = options.orgUuid;
    if (!orgUuid || binding.status !== "resolved") {
      logEvent("tengu_device_bridge_skipped", {
        missing_org: orgUuid === undefined,
        missing_account: binding.status === "missing",
        account_mismatch: binding.status === "mismatch",
      });
      logForDebugging(`[deviceBridge] skipped: ${orgUuid ? `account ${binding.status}` : "no org"}`);
      return false;
    }
    let { accountUuid } = binding;
    let limiter = createConcurrencyLimiter(DEFAULT_MAX_IN_FLIGHT);
    registry = createDeviceToolRegistry();
    registry.setGroup(CORE, []);
    await primeWindowsProfileDirs();
    if (stopped) return false;
    let offReason = remoteToolServingOffReason(undefined, {
      ignoringMute: true,
    });
    if (offReason === undefined) {
      await primeWindowsPlatform();
      if (stopped) return false;
    }
    let hostInventory =
      offReason === undefined && isViolinRibEnabled()
        ? await import("../../remote/tools/serve/hostInventory.js")
            .then((inventoryModule) => inventoryModule.gatherHostInventory(getOriginalCwd()))
            .catch((error) => {
              logError(toError(error));
              return;
            })
        : undefined;
    if (stopped) return false;
    let deviceMcpQuestion = undefined;
    let deviceMcpAnswer = undefined;
    let groupProviders = options.toolGroupProviders ?? (await loadServingGroupProviders(offReason));
    if (stopped) return false;
    let holdReads = [];
    runGroupCleanups = runCleanups(groupProviders, {
      registry,
      holdStartUntil: (holdRead) => holdReads.push(holdRead),
      sessionId: options.sessionId,
      serving: {
        offReason,
      },
      getDeviceId:
        options.getDeviceId ??
        (() => {
          return;
        }),
      limiter,
      storageV5: options.storageV5,
      servedSettingsChanged: options.servedSettingsChanged,
      ...(options.deviceMcpQuestion && {
        deviceMcpQuestion: options.deviceMcpQuestion,
      }),
      servingKit: servingKitRef,
      transport: transportKind,
      readiness,
      ...(hostInventory !== undefined && {
        hostInventory,
      }),
      ...(execution !== undefined && {
        execution: execution.execution,
      }),
      sandboxRequiredNow: remoteToolVmRequired,
      ...(options.dirSync !== undefined && {
        dirSync: options.dirSync,
      }),
      ...(options.folderRelation !== undefined && {
        folderRelation: options.folderRelation,
      }),
      onNotice:
        options.onNotice ??
        ((noticeId, noticeText) => {
          logForDebugging(`[remote-tools] ${noticeId}: ${noticeText}`);
        }),
    });
    logForDebugging(`[deviceBridge] start-up held on ${holdReads.length} reads of its tool groups`);
    let startTime_2 = performance.now();
    await Promise.allSettled(holdReads);
    let rounded = Math.round(performance.now() - startTime_2);
    logForDebugging(`[deviceBridge] start-up released after ${rounded} ms`);
    if (stopped) return false;
    let registry_2 = registry;
    if (transportKind === "bridge") {
      bridge = await openDeviceBridge({
        options,
        orgUuid,
        accountUuid,
        registry: registry_2,
        isEgressAllowed,
        isStopped: () => stopped,
        onLivenessEvent,
        onTransportEvent,
      });
      if (bridge === undefined || stopped) {
        await bridge?.stop();
        bridge = undefined;
        return false;
      }
    }
    let checkEgress = () => {
      if (!isEgressAllowed()) stopRegistration("egress_denied");
    };
    let stillEnabled =
      options.isStillEnabled ??
      (() =>
        getToolServingFlagAnsweredOff({
          cloudClient,
        }) === undefined);
    let checkEnabled = () => {
      if (!stillEnabled()) {
        logForDebugging("[deviceBridge] stopping: the gate turned off");
        stopRegistration("gate_off");
      }
    };
    let unsubscribeEgress = (options.onEgressGateChange ?? onComplianceTaintsChanged)(checkEgress);
    let unsubscribeEnabled = (options.onEnabledChange ?? onGrowthBookRefresh)(checkEnabled);
    unsubscribeGates = () => {
      unsubscribeEgress();
      unsubscribeEnabled();
    };
    checkEgress();
    checkEnabled();
    if (stopped) return false;
    bridgeStarted = true;
    logEvent("tengu_device_bridge_started", {
      account_source: fromEnum(binding.source),
      transport: fromEnum(transportKind),
      redial: false,
      readiness_wait_ms: readinessWaitMs,
      held_ms: rounded,
    });
    if (transportKind === "auto" && !outcomeLogged) {
      outcomeLogged = true;
      logFeatureOk("device_bridge_register");
    }
    bridge?.start();
    return true;
  };
  let onTransportEvent = (event) => {
    if (event.kind === "authenticated") {
      loggedTransportEvents.clear();
      loggedReconnectExhausted = false;
      if (!outcomeLogged) {
        outcomeLogged = true;
        logFeatureOk("device_bridge_register");
      }
      logTransportEvent(event);
      return;
    }
    let eventKey = describeTransportEvent(event);
    if (eventKey === undefined) return;
    if (loggedTransportEvents.has(eventKey)) return;
    loggedTransportEvents.add(eventKey);
    logTransportEvent(event);
  };
  let onLivenessEvent = (event) => {
    if (event.kind === "reconnect_exhausted") {
      if (!outcomeLogged) {
        outcomeLogged = true;
        logFeatureBad("device_bridge_register", "reconnect_exhausted");
      }
      if (loggedReconnectExhausted) return;
      loggedReconnectExhausted = true;
    }
    logLivenessEvent(event);
  };
  unregisterExit = (options.registerExitCleanup ?? registerCleanup)(() => stopRegistration("exit"));
  let startPromise = startUp().catch((error) => {
    logForDebugging(`[deviceBridge] registration failed: ${toError(error).message}`);
    logEvent("tengu_device_bridge_start_failed", {});
    if (!outcomeLogged) {
      outcomeLogged = true;
      logFeatureBad("device_bridge_register", "start_failed");
    }
    return false;
  });
  let serving = startPromise.then((started) =>
    started && registry !== undefined && servingKitRef.current !== undefined
      ? {
          kit: servingGroupView(servingKitRef.current.kit),
          source: deviceToolDefinitions(registry),
        }
      : undefined,
  );
  startPromise.then((started) => {
    if (!started && !stopped) {
      unregisterExit?.();
      unregisterExit = undefined;
      runGroupCleanups?.();
      runGroupCleanups = undefined;
      servingKitRef.current?.kit.dispose();
      execution?.dispose();
      execution = undefined;
    }
  });
  return {
    started: startPromise,
    announceSettled: () => {},
    serving,
    stop: () => stopRegistration("attach_ended"),
    heldServedCall: (call) =>
      stopped || servingKitRef.current === undefined
        ? NOT_HELD_LEASE
        : servingKitRef.current.kit.heldServedCall(call),
  };
}
//@ chunk-ad8gs4gj.js:24984-26398 placement
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
  let deviceName = deviceNameForSession((options.getHostname ?? hostname)(), options.sessionId);
  let adminBridgeUrl =
    options.getBridgeBaseUrl !== undefined || antEnv.CLAUDE_REMOTE_TOOLS_BRIDGE_URL !== undefined;
  let bridgeBaseUrl = (options.getBridgeBaseUrl ?? getDeviceBridgeUrl)();
  if (bridgeBaseUrl === undefined) {
    logForDebugging("[deviceBridge] skipped: no device bridge for this OAuth environment");
    return;
  }
  let deviceBridgePath = getDeviceBridgePath(bridgeBaseUrl, orgUuid, accountUuid, deviceName);
  let { createDeviceMcpServer, deviceInfoProbeTool, parseJsonRpcMessage } =
    await import("../../bridge/createDeviceMcpServer.lazy.js");
  if (isStopped()) return;
  let deviceInfo = {
    getDeviceName: () => deviceName,
    version: buildInfo,
  };
  let probeTool = deviceInfoProbeTool(deviceInfo);
  let idleProbeTool = deviceInfoProbeTool({
    ...deviceInfo,
    idle: true,
  });
  let syncCoreGroup = (reason) => {
    let all = registry.definitions().every((definition) => definition.name === probeTool.definition.name);
    registry.setGroup(CORE, [all ? idleProbeTool : probeTool], reason);
  };
  syncCoreGroup();
  let unsubscribeCore = registry.subscribe(syncCoreGroup);
  let resetCoreGroup = () => {
    unsubscribeCore();
    registry.setGroup(CORE, []);
  };
  let transport = new DeviceBridgeTransport({
    getUrl: () => deviceBridgePath,
    getAccessToken: () => options.getAccessToken(),
    getTools: () => announcedToolsForConnect(registry),
    getDeviceId: options.getDeviceId,
    getSessionId: () => toInfraSessionId(options.sessionId),
    parseMessage: parseJsonRpcMessage,
    createSocket: options.createSocket,
    isAllowedUrl: (url) =>
      isEgressAllowed() && (isBareWssUrl(url) || (adminBridgeUrl && isSameOriginWsUrl(url, bridgeBaseUrl))),
  });
  let { server, inFlightCalls, whenIdle } = createDeviceMcpServer({
    registry,
    version: buildInfo,
    sessionId: options.sessionId,
  });
  try {
    await server.connect(transport);
  } catch (error) {
    resetCoreGroup();
    throw error;
  }
  if (isStopped()) {
    resetCoreGroup();
    await server.close();
    return;
  }
  let session = new DeviceRegistrationSession({
    transport,
    announced: {
      hasUnservedChange: registry.hasUnservedChange,
      inFlightCalls,
      whenIdle,
    },
    onEvent: onLivenessEvent,
    onTransportEvent,
  });
  let unsubscribeRegistry = registry.subscribe((reason) => session.requestReannounce(reason));
  let stopping;
  return {
    start: () => session.start(),
    stop: () =>
      (stopping ??= (async () => {
        unsubscribeRegistry();
        resetCoreGroup();
        await Promise.allSettled([session.stop(), server.close()]);
      })()),
  };
}
//@ chunk-ad8gs4gj.js:26398-26687 placement
/**
 * 传输事件转键
 */
function describeTransportEvent(event) {
  switch (event.kind) {
    case "rejected":
      return `rejected:${event.phase}:${event.reason ?? ""}:${event.status ?? ""}`;
    case "closed":
      return `closed:${event.phase}:${event.code ?? ""}:${event.superseded}`;
    case "token_unavailable":
    case "handshake_timeout":
    case "socket_error":
    case "dial_failed":
      return event.kind;
    default:
      return;
  }
}
//@ chunk-ad8gs4gj.js:26687-27424 placement
/**
 * 记录设备桥传输事件遥测
 */
function logTransportEvent(event) {
  switch (event.kind) {
    case "authenticated":
      logEvent("tengu_device_bridge_connected", {
        protocol_version: event.protocolVersion,
        hb_interval_ms: event.timings.hbIntervalMs,
        staleness_ms: event.timings.stalenessMs,
        rpc_timeout_ms: event.timings.rpcTimeoutMs,
      });
      return;
    case "rejected":
      logEvent("tengu_device_bridge_rejected", {
        phase: fromEnum(event.phase),
        reason: fromEnumOpt(event.reason),
        status: fromNumberOpt(event.status),
        slot_contention: event.slotContention,
      });
      return;
    case "closed":
      logEvent("tengu_device_bridge_closed", {
        phase: fromEnum(event.phase),
        code: fromNumberOpt(event.code),
        superseded: event.superseded,
      });
      return;
    case "token_unavailable":
    case "handshake_timeout":
    case "socket_error":
      logEvent("tengu_device_bridge_connect_failed", {
        cause: fromEnum(event.kind),
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
//@ chunk-ad8gs4gj.js:27424-28060 placement
/**
 * 记录设备桥存活事件遥测
 */
function logLivenessEvent(event) {
  switch (event.kind) {
    case "pong_timeout":
      logEvent("tengu_device_bridge_pong_timeout", {
        consecutive: event.consecutive,
      });
      return;
    case "reconnect_exhausted":
      logEvent("tengu_device_bridge_reconnect_exhausted", {});
      return;
    case "heartbeat_unsupported":
      logEvent("tengu_device_bridge_heartbeat_unsupported", {
        protocol_version: fromNumber(event.protocolVersion),
      });
      return;
    case "reannounce":
      logEvent("tengu_device_bridge_reannounce", {
        reason: fromEnum(event.reason),
        outcome: fromEnum(event.outcome),
        inflight_at_start: event.inFlightAtStart,
        drained_ms: event.drainedMs,
        drain_timed_out: event.drainTimedOut,
      });
      return;
    case "reannounce_contended":
      logEvent("tengu_device_bridge_reannounce_contended", {
        reason: fromEnum(event.reason),
      });
      return;
    default:
      return;
  }
}
//@ chunk-ad8gs4gj.js:28060-28339 placement
/**
 * 加载远程工具与透传服务组
 */
async function loadServingGroupProviders(offReason) {
  if (offReason === undefined || isPersonFixableOffReason(offReason))
    try {
      let [
        { remoteToolServingGroupProvider: remoteProvider },
        { passthroughServingGroupProvider: passthroughProvider },
        thirdProvider,
      ] = await Promise.all([
        import("../../remote/tools/serve/createServingKit.js"),
        import("../deviceMcp/passthroughServingGroup.js"),
        undefined,
      ]);
      return offReason === undefined ? [remoteProvider(), passthroughProvider(), ...[]] : [remoteProvider()];
    } catch (error) {
      logError(toError(error));
    }
  return [];
}
//@ chunk-ad8gs4gj.js:28339-28493 placement
/**
 * 依次执行并收集清理函数
 */
function runCleanups(cleanups, context) {
  let flattened = cleanups.flatMap((cleanup) => {
    try {
      let cleanupFn = cleanup(context);
      return cleanupFn ? [cleanupFn] : [];
    } catch (error) {
      logError(toError(error));
      return [];
    }
  });
  return () =>
    flattened.forEach((cleanupFn) => {
      try {
        cleanupFn();
      } catch (error) {
        logError(toError(error));
      }
    });
}
//@ chunk-ad8gs4gj.js:28493-28879 placement
/**
 * 连接帧公告的工具
 */
function announcedToolsForConnect(registry) {
  let hasUnserved = registry.hasUnservedChange();
  let definitions = registry.serve();
  if (!hasUnserved) return definitions;
  let mapped = definitions.map((definition) => definition.name);
  logForDebugging(
    `[deviceBridge] connect frame announces ${definitions.length} tools: ${mapped.slice(0, 12).join(", ")}${mapped.length > 12 ? ", \u2026" : ""}`,
  );
  logEvent("tengu_device_bridge_connect_frame", {
    tool_count: definitions.length,
    serves_bash: mapped.includes(BASH_TOOL_NAME),
    serves_powershell: mapped.includes(POWERSHELL_TOOL_NAME),
    mcp_tool_count: countWhere(mapped, (toolName) => toolName.includes("__")),
  });
  return definitions;
}
export { startDeviceRegistration };

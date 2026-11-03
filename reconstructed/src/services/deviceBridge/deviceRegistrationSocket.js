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
  TZo,
  Hdr,
  _gi,
  hgi,
  computeReconnectDelayMs,
  ygi,
  kZo,
  buildConnectMessage,
  parseDeviceFrame,
  isDeviceIdentityConflict,
  bgi,
  TOOL_META_KEYS,
  FCt,
  slugifyName,
} from "../../bridge/deviceRegistration.js";
import { logForDebugging } from "../../utils/debug.js";
import { toError } from "../../utils/errors.js";
import { createSignal } from "../../utils/signal.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { logError } from "../../utils/log.js";
import { sT } from "../../utils/pastedContent.js";
import { getWebSocketProxyUrl } from "../../utils/proxy.js";
import { getWebSocketTLSOptions } from "../../utils/mtls.js";
import { isBareWssUrl } from "../mcp/ccrMcpUrls.js";
import { wasLauncherHostLoginToken } from "../../utils/auth/launcherHostLogin.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, T, Ue, o, E, QD } from "../../../vendor/zod/v4/classic/schemas.js";
import {
  REMOTE_TOOLS,
  MCP_PASSTHROUGH,
  createConcurrencyLimiter,
  TBn,
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
import { hCe } from "../../bridge/deviceBindingPolicy.js";
import { isTrustedDeviceRequiredOrUnknown } from "../../bridge/trustedDevice.js";
import { logFeatureBad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { REMOTE_TOOLS_CONSENT_TEXT } from "../../remote/tools/consentText.js";
import { resolveCurrentDeviceBinding } from "../../bridge/deviceBindingRecord.js";
import { primeWindowsProfileDirs } from "../remoteTools/windowsProfileDirs.js";
import { rNt } from "../../utils/platformWindows.js";
import { isViolinRibEnabled } from "../analytics/violinRibGate.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { onComplianceTaintsChanged } from "../policyLimits/complianceTaints.js";
import { onGrowthBookRefresh } from "../analytics/growthbook.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { p5 } from "../remoteTools/lease.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { POWERSHELL_TOOL_NAME } from "../../tools/PowerShellTool/toolName.js";
import { count } from "../../utils/collections.js";

/**
 * 设备注册会话：心跳、重连、争用退避
 */
//@ chunk-ksxq075c.js:1585-9343 placement
class DeviceRegistrationSession {
  transport;
  announced;
  now;
  random;
  onEvent;
  onTransportEvent;
  started = !1;
  stopping = !1;
  timers = describeDeviceError(TZo);
  lastAckAt = 0;
  reconnectAttempts = 0;
  consecutiveSlotContention = 0;
  lastFailureWasContention = !1;
  contentionBackoffNotified = !1;
  consecutivePongTimeouts = 0;
  keepaliveTimer;
  reconnectTimer;
  stableTimer;
  reannounce = { phase: "idle" };
  constructor(e) {
    ((this.transport = e.transport),
      (this.announced = e.announced),
      (this.onEvent = e.onEvent),
      (this.onTransportEvent = e.onTransportEvent),
      (this.now = e.now ?? Date.now),
      (this.random = e.random ?? Math.random),
      (this.transport.onevent = this.handleTransportEvent));
  }
  start() {
    if (this.started) return;
    ((this.started = !0), this.openConnection());
  }
  async stop() {
    ((this.stopping = !0),
      this.clearReconnectTimer(),
      this.clearConnectionTimers(),
      this.cancelReannounce(),
      await this.transport.close());
  }
  requestReannounce(e) {
    if (!this.started || this.stopping) return;
    let n = Hdr[e];
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
        let endRotation = this.endRotation(),
          i = endRotation !== void 0 && e.reason === "duplicate_device_id";
        if (i) this.emit({ kind: "reannounce_contended", reason: endRotation });
        else if (e.slotContention) this.lastFailureWasContention = !0;
        (this.cancelDrain(), this.clearConnectionTimers(), this.scheduleReconnect(i));
        return;
      }
      case "closed":
        if (e.superseded) this.lastFailureWasContention = !0;
        (this.endRotation(), this.cancelDrain(), this.clearConnectionTimers(), this.scheduleReconnect());
        return;
      case "handshake_timeout":
      case "dial_failed":
      case "token_unavailable":
        (this.endRotation(), this.cancelDrain(), this.clearConnectionTimers(), this.scheduleReconnect());
        return;
      case "transport_closed":
        ((this.stopping = !0),
          this.clearReconnectTimer(),
          this.clearConnectionTimers(),
          this.cancelReannounce());
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
      (logForDebugging(`[deviceBridge] open connection failed: ${toError(error).message}`),
        this.endRotation(),
        this.scheduleReconnect());
    }
  }
  handleAuthenticated(e, n) {
    if (this.stopping) return;
    if (
      ((this.timers = describeDeviceError(n)),
      (this.lastAckAt = this.now()),
      this.clearKeepaliveTimer(),
      this.endRotation() === void 0 || this.stableTimer === void 0)
    )
      (this.clearStableTimer(), (this.stableTimer = setTimeout(this.markStable, _gi)));
    if (this.announced.hasUnservedChange()) this.requestReannounce("connected_stale");
    if (e < 1) {
      ((this.consecutivePongTimeouts = 0), this.emit({ kind: "heartbeat_unsupported", protocolVersion: e }));
      return;
    }
    ((this.keepaliveTimer = setInterval(this.keepaliveTick, this.timers.keepaliveIntervalMs)),
      this.sendHeartbeat());
  }
  handleAck() {
    if (((this.lastAckAt = this.now()), this.consecutivePongTimeouts > 0))
      ((this.consecutivePongTimeouts = 0), (this.reconnectAttempts = 0));
  }
  keepaliveTick = () => {
    if (!this.transport.isAuthenticated()) return;
    if (this.now() - this.lastAckAt > this.timers.pongTimeoutMs) {
      (this.consecutivePongTimeouts++,
        this.emit({ kind: "pong_timeout", consecutive: this.consecutivePongTimeouts }),
        this.cancelDrain(),
        this.clearConnectionTimers(),
        this.transport.disconnect(),
        this.scheduleReconnect());
      return;
    }
    this.sendHeartbeat();
  };
  sendHeartbeat() {
    this.transport.sendRaw(hgi);
  }
  markStable = () => {
    if (
      ((this.stableTimer = void 0),
      (this.consecutiveSlotContention = 0),
      (this.contentionBackoffNotified = !1),
      this.consecutivePongTimeouts === 0)
    )
      this.reconnectAttempts = 0;
    this.emit({ kind: "stabilized" });
  };
  scheduleReconnect(e = !1) {
    if (this.stopping || !this.started || this.reconnectTimer !== void 0) return;
    let nextDelayMs = this.nextDelayMs(e);
    if (this.stopping) return;
    ((this.reconnectTimer = setTimeout(this.reconnect, nextDelayMs)),
      this.emit({
        kind: "reconnect_scheduled",
        delayMs: nextDelayMs,
        attempt: this.reconnectAttempts,
        slotContention: this.consecutiveSlotContention > 0,
      }));
  }
  nextDelayMs(e) {
    let lastFailureWasContention = this.lastFailureWasContention;
    if (((this.lastFailureWasContention = !1), e))
      return computeReconnectDelayMs(0, 1, this.timers.slotContentionFastAttempts, this.random);
    if (lastFailureWasContention) {
      if (
        (this.consecutiveSlotContention++,
        this.consecutiveSlotContention > this.timers.slotContentionFastAttempts &&
          !this.contentionBackoffNotified)
      )
        ((this.contentionBackoffNotified = !0),
          this.emit({ kind: "slot_contention_backoff", consecutive: this.consecutiveSlotContention }));
      return computeReconnectDelayMs(
        0,
        this.consecutiveSlotContention,
        this.timers.slotContentionFastAttempts,
        this.random,
      );
    }
    if (
      ((this.consecutiveSlotContention = 0),
      (this.contentionBackoffNotified = !1),
      this.reconnectAttempts >= ygi)
    ) {
      ((this.reconnectAttempts = 0), this.emit({ kind: "reconnect_exhausted" }));
      try {
        this.transport.onerror?.(Error("Bridge unreachable"));
      } catch (error) {
        logForDebugging(`[deviceBridge] transport onerror listener threw: ${toError(error).message}`);
      }
    }
    let i = computeReconnectDelayMs(
      this.reconnectAttempts,
      0,
      this.timers.slotContentionFastAttempts,
      this.random,
    );
    return (this.reconnectAttempts++, i);
  }
  reconnect = () => {
    ((this.reconnectTimer = void 0), this.openConnection());
  };
  beginReannounce = () => {
    if (this.reannounce.phase !== "coalescing") return;
    let { reason: reason } = this.reannounce;
    if (((this.reannounce = { phase: "idle" }), this.stopping)) return;
    let inFlightCalls = this.announced.inFlightCalls(),
      reannounceSkipOutcome = this.reannounceSkipOutcome();
    if (reannounceSkipOutcome !== void 0) {
      this.emit({
        kind: "reannounce",
        reason: reason,
        outcome: reannounceSkipOutcome,
        inFlightAtStart: inFlightCalls,
        drainedMs: 0,
        drainTimedOut: !1,
      });
      return;
    }
    let r = {
      phase: "draining",
      reason: reason,
      startedAt: this.now(),
      inFlightAtStart: inFlightCalls,
      timer: setTimeout(this.handleDrainTimeout, this.timers.rotateDrainMaxMs),
    };
    ((this.reannounce = r),
      this.announced.whenIdle().then(
        () => this.rotate(r, !1),
        () => this.rotate(r, !1),
      ));
  };
  handleDrainTimeout = () => {
    if (this.reannounce.phase === "draining") this.rotate(this.reannounce, !0);
  };
  rotate(e, n) {
    if (this.reannounce !== e) return;
    if ((clearTimeout(e.timer), (this.reannounce = { phase: "idle" }), this.stopping)) return;
    let i = this.reannounceSkipOutcome() ?? "rotated";
    if (i === "rotated") this.reannounce = { phase: "rotating", reason: e.reason };
    if (
      (this.emit({
        kind: "reannounce",
        reason: e.reason,
        outcome: i,
        inFlightAtStart: e.inFlightAtStart,
        drainedMs: this.now() - e.startedAt,
        drainTimedOut: n,
      }),
      this.reannounce.phase !== "rotating" || this.stopping)
    )
      return;
    (this.clearKeepaliveTimer(), this.transport.disconnect(), this.openConnection());
  }
  reannounceSkipOutcome() {
    if (!this.announced.hasUnservedChange()) return "already_served";
    if (!this.transport.isAuthenticated()) return "not_connected";
    return;
  }
  endRotation() {
    if (this.reannounce.phase !== "rotating") return;
    let { reason: reason } = this.reannounce;
    return ((this.reannounce = { phase: "idle" }), reason);
  }
  cancelDrain() {
    if (this.reannounce.phase !== "draining") return;
    let reannounce = this.reannounce;
    (clearTimeout(reannounce.timer),
      (this.reannounce = { phase: "idle" }),
      this.emit({
        kind: "reannounce",
        reason: reannounce.reason,
        outcome: "not_connected",
        inFlightAtStart: reannounce.inFlightAtStart,
        drainedMs: this.now() - reannounce.startedAt,
        drainTimedOut: !1,
      }));
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
    this.reannounce = { phase: "idle" };
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
    if (this.reconnectTimer === void 0) return;
    (clearTimeout(this.reconnectTimer), (this.reconnectTimer = void 0));
  }
  clearConnectionTimers() {
    (this.clearKeepaliveTimer(), this.clearStableTimer());
  }
  clearKeepaliveTimer() {
    if (this.keepaliveTimer !== void 0) (clearInterval(this.keepaliveTimer), (this.keepaliveTimer = void 0));
  }
  clearStableTimer() {
    if (this.stableTimer !== void 0) (clearTimeout(this.stableTimer), (this.stableTimer = void 0));
  }
}
/**
 * 设备工具注册表（按组设置、去重）
 */
//@ chunk-ksxq075c.js:9343-9955 placement
function createDeviceToolRegistry() {
  let e = new Map(),
    n = createSignal(),
    i = dedupeToolsByName(e),
    r;
  return {
    get: (s) => i.byName.get(s),
    setGroup(s, d, S = "tools_changed") {
      e.set(s, [...d]);
      let b = dedupeToolsByName(e),
        O = i;
      if (((i = b), b.dropped.length > 0 && jsonStringify(b.dropped) !== jsonStringify(O.dropped)))
        logForDebugging(
          `[deviceBridge] duplicate device tool names not announced: ${jsonStringify(b.dropped)}`,
        );
      if (b.hash === O.hash) return;
      try {
        n.emit(S);
      } catch (error) {
        for (let k of error instanceof AggregateError ? error.errors : [error]) logError(k);
      }
    },
    definitions: () => i.definitions,
    definitionsOf: (s) =>
      (e.get(s) ?? []).flatMap((d) => (i.byName.get(d.definition.name) === d ? [d.definition] : [])),
    serve() {
      return ((r = i.hash), i.definitions);
    },
    hasUnservedChange: () => r !== i.hash,
    subscribe: n.subscribe,
  };
}
/**
 * 按名字去重工具并记录丢弃
 */
//@ chunk-ksxq075c.js:9955-10251 placement
function dedupeToolsByName(e) {
  let { byName: byName, dropped: dropped } = [...e.values()].flat().reduce(
      (s, d) => {
        let S = d.definition.name;
        if (s.byName.has(S)) s.dropped.push(S);
        else s.byName.set(S, d);
        return s;
      },
      { byName: new Map(), dropped: [] },
    ),
    mapped = [...byName.values()].map((s) => s.definition);
  return { byName: byName, definitions: mapped, dropped: dropped, hash: sT(jsonStringify(mapped)) };
}
/**
 * 设备桥接 RPC 的常量：状态值、JSON-RPC 内部错误码、令牌截止符号、合成初始化 id、最大消息大小。
 */
//@ chunk-ksxq075c.js:10251-10351 placement
var RPC_STATE_IDLE = 0,
  WS_OPEN = 1,
  JSONRPC_INTERNAL_ERROR = -32603,
  TOKEN_DEADLINE_SYMBOL = Symbol("device-bridge-token-deadline"),
  SYNTHETIC_INIT_ID = "__synthetic_init__",
  MAX_BRIDGE_MESSAGE_BYTES = 33554432;
//@ chunk-ksxq075c.js:10351-10473 placement
function openBridgeWebSocket(e) {
  let n = new globalThis.WebSocket(e, {
    proxy: getWebSocketProxyUrl(e),
    tls: getWebSocketTLSOptions(void 0) || void 0,
  });
  return ((n.binaryType = "arraybuffer"), n);
}
/**
 * 设备桥 WebSocket 传输
 */
//@ chunk-ksxq075c.js:10473-16507 placement
class DeviceBridgeTransport {
  options;
  onclose;
  onerror;
  onmessage;
  onevent;
  started = !1;
  closing = !1;
  ws;
  pendingToken;
  authenticated = !1;
  connectGeneration = 0;
  handshakeTimer;
  negotiated;
  constructor(e) {
    this.options = e;
  }
  async start() {
    if (this.started) throw Error("DeviceBridgeTransport start can only be called once.");
    this.started = !0;
  }
  async close() {
    if (this.closing) return;
    ((this.closing = !0), this.disconnect(), this.emit({ kind: "transport_closed" }), this.onclose?.());
  }
  async send(e) {
    if (Pe(e)) return;
    let ws = this.ws;
    if (!ws || !this.authenticated || ws.readyState !== WS_OPEN) {
      this.emit({ kind: "outbound_dropped", messageType: ee(e) === void 0 ? "other" : "request" });
      return;
    }
    try {
      ws.send(jsonStringify(e));
    } catch (error) {
      (logForDebugging(`[deviceBridge] outbound send failed: ${toError(error).message}`),
        this.emit({ kind: "outbound_dropped", messageType: ee(e) === void 0 ? "other" : "request" }));
    }
  }
  sendRaw(e) {
    let ws = this.ws;
    if (!ws || ws.readyState !== WS_OPEN) return !1;
    try {
      ws.send(e);
    } catch (error) {
      return (logForDebugging(`[deviceBridge] raw send failed: ${toError(error).message}`), !1);
    }
    return !0;
  }
  isAuthenticated() {
    return this.authenticated;
  }
  isConnected() {
    return this.ws !== void 0;
  }
  getNegotiated() {
    return this.negotiated;
  }
  async openConnection() {
    if (this.closing || this.ws) return;
    let e = ++this.connectGeneration,
      accessToken = await this.resolveAccessToken();
    if (e !== this.connectGeneration || this.closing || this.ws !== void 0) return;
    if (!accessToken) {
      this.emit({ kind: "token_unavailable" });
      return;
    }
    let i, r;
    try {
      ((i = this.options.getUrl()), (r = (this.options.isAllowedUrl ?? isBareWssUrl)(i)));
    } catch (error) {
      this.emit({ kind: "dial_failed", error: toError(error) });
      return;
    }
    if (!r) {
      (logForDebugging("[deviceBridge] refusing dial: bridge URL failed validation"),
        this.emit({ kind: "dial_failed", error: Error("bridge URL failed validation") }));
      return;
    }
    let s;
    try {
      s = (this.options.createSocket ?? openBridgeWebSocket)(i);
    } catch (error) {
      this.emit({ kind: "dial_failed", error: toError(error) });
      return;
    }
    if (
      ((this.ws = s),
      (this.pendingToken = accessToken),
      (this.handshakeTimer = setTimeout(this.handleHandshakeTimeout, kZo)),
      s.addEventListener("open", this.handleOpen),
      s.addEventListener("message", this.handleMessage),
      s.addEventListener("close", this.handleClose),
      s.addEventListener("error", this.handleSocketError),
      this.emit({ kind: "connecting" }),
      this.closing || this.ws !== s)
    )
      return;
    if (s.readyState === WS_OPEN) this.handleOpen();
  }
  async resolveAccessToken() {
    let e;
    try {
      let winner = await Promise.race([
        Promise.resolve(this.options.getAccessToken()),
        new Promise((i) => {
          e = setTimeout((r) => r(TOKEN_DEADLINE_SYMBOL), kZo, i);
        }),
      ]);
      if (winner === TOKEN_DEADLINE_SYMBOL) {
        logForDebugging("[deviceBridge] access token resolution timed out");
        return;
      }
      if (winner !== void 0 && wasLauncherHostLoginToken(winner)) {
        logForDebugging("[deviceBridge] the desktop app's sign-in is not sent to the bridge");
        return;
      }
      return winner;
    } catch (error) {
      logForDebugging(`[deviceBridge] access token resolution failed: ${toError(error).message}`);
      return;
    } finally {
      if (e !== void 0) clearTimeout(e);
    }
  }
  disconnect() {
    (this.connectGeneration++,
      this.clearHandshakeTimer(),
      (this.pendingToken = void 0),
      (this.authenticated = !1),
      (this.negotiated = void 0));
    let ws = this.ws;
    if (!ws) return;
    if (
      ((this.ws = void 0),
      ws.removeEventListener("open", this.handleOpen),
      ws.removeEventListener("message", this.handleMessage),
      ws.removeEventListener("close", this.handleClose),
      ws.removeEventListener("error", this.handleSocketError),
      ws.readyState === WS_OPEN || ws.readyState === RPC_STATE_IDLE)
    )
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
    if (this.handshakeTimer === void 0) return;
    (clearTimeout(this.handshakeTimer), (this.handshakeTimer = void 0));
  }
  handleHandshakeTimeout = () => {
    if (((this.handshakeTimer = void 0), !this.ws || this.authenticated)) return;
    (this.disconnect(), this.emit({ kind: "handshake_timeout" }));
  };
  handleOpen = () => {
    let ws = this.ws,
      pendingToken = this.pendingToken;
    if (!ws || pendingToken === void 0) return;
    this.pendingToken = void 0;
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
      (this.disconnect(), this.emit({ kind: "dial_failed", error: toError(error) }));
    }
  };
  handleMessage = (e) => {
    let n = decodeSocketFrame(e.data);
    if (n.kind === "unsupported") {
      (logForDebugging("[deviceBridge] dropping unsupported inbound payload type"),
        this.emit({ kind: "inbound_invalid", error: Error("unsupported inbound payload type") }));
      return;
    }
    if (n.kind === "oversize") {
      (logForDebugging(
        `[deviceBridge] dropping ${n.size}-unit inbound frame (cap ${MAX_BRIDGE_MESSAGE_BYTES})`,
      ),
        this.emit({
          kind: "inbound_invalid",
          error: Error("inbound frame exceeded the device bridge size cap"),
        }));
      return;
    }
    let i = parseDeviceFrame(n.text);
    switch (i.kind) {
      case "ignored":
        if (this.authenticated)
          (logForDebugging("[deviceBridge] dropping unparseable inbound frame"),
            this.emit({ kind: "inbound_invalid", error: Error("unparseable inbound frame") }));
        return;
      case "hb_ack":
        this.emit({ kind: "hb_ack" });
        return;
      case "error":
        this.handleReject(i.reason, i.status, i.detail);
        return;
      case "connected":
        this.authenticate(i.protocolVersion, i.timings);
        return;
      case "unknown":
        this.emit({ kind: "inbound_unknown", frameType: i.frameType });
        return;
      case "rpc":
        this.deliver(i.message);
        return;
    }
  };
  authenticate(e, n) {
    if (this.authenticated) return;
    if (
      (this.clearHandshakeTimer(),
      (this.authenticated = !0),
      (this.negotiated = { protocolVersion: e, timings: n }),
      this.emit({ kind: "authenticated", protocolVersion: e, timings: n }),
      this.closing || this.ws === void 0)
    )
      return;
    this.injectSyntheticInitialize();
  }
  injectSyntheticInitialize() {
    let e;
    try {
      e = this.options.parseMessage(buildInitializeRequest());
    } catch (error) {
      this.emit({ kind: "inbound_invalid", error: toError(error) });
      return;
    }
    try {
      this.onmessage?.(e);
    } catch (error) {
      this.emit({ kind: "inbound_invalid", error: toError(error) });
    }
  }
  handleReject(e, n, i) {
    let r = !this.authenticated;
    (this.disconnect(),
      this.emit({
        kind: "rejected",
        phase: r ? "pre_auth" : "post_auth",
        reason: e,
        status: n,
        detail: i,
        slotContention: r && isDeviceIdentityConflict(e),
      }));
  }
  deliver(e) {
    if (!this.authenticated) return;
    let n;
    try {
      n = this.options.parseMessage(e);
    } catch (error) {
      (this.emit({ kind: "inbound_invalid", error: toError(error) }), this.replyInternalError(e));
      return;
    }
    try {
      this.onmessage?.(n);
    } catch (error) {
      (this.emit({ kind: "inbound_invalid", error: toError(error) }), this.replyInternalError(e));
    }
  }
  replyInternalError(e) {
    let n = ee(e);
    if (n === void 0) return;
    this.sendRaw(
      jsonStringify({
        jsonrpc: "2.0",
        id: n,
        error: { code: JSONRPC_INTERNAL_ERROR, message: "internal error" },
      }),
    );
  }
  handleClose = (e) => {
    let n = this.authenticated ? "post_auth" : "pre_auth",
      i = typeof e.code === "number" ? e.code : void 0,
      r = typeof e.reason === "string" ? e.reason : void 0;
    (this.disconnect(), this.emit({ kind: "closed", phase: n, code: i, reason: r, superseded: i === bgi }));
  };
  handleSocketError = () => {
    this.emit({ kind: "socket_error" });
  };
}
/**
 * MCP initialize 请求
 */
//@ chunk-ksxq075c.js:16507-16679 placement
function buildInitializeRequest() {
  return {
    jsonrpc: "2.0",
    id: SYNTHETIC_INIT_ID,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "remote-tools-bridge", version: "1.0.0" },
    },
  };
}
//@ chunk-ksxq075c.js:16679-16753 placement = _temp (1)
function Pe(r) {
  return "id" in r && r.id === SYNTHETIC_INIT_ID && ("result" in r || "error" in r);
}
//@ chunk-ksxq075c.js:16753-16862 placement
var JSONRPC_RESPONSE_SCHEMA = DoctorLazy(() =>
  u({ jsonrpc: T("2.0"), id: Ue([o(), E()]), method: o(), result: QD().optional(), error: QD().optional() }),
);
//@ chunk-ksxq075c.js:16862-16935 placement
function ee(e) {
  let safeParse = JSONRPC_RESPONSE_SCHEMA().safeParse(e);
  return safeParse.success ? safeParse.data.id : void 0;
}
/**
 * 解码 WebSocket 帧并限制大小
 */
//@ chunk-ksxq075c.js:16935-17375 placement
function decodeSocketFrame(e) {
  if (typeof e === "string")
    return e.length > MAX_BRIDGE_MESSAGE_BYTES
      ? { kind: "oversize", size: e.length }
      : { kind: "text", text: e };
  if (e instanceof ArrayBuffer)
    return e.byteLength > MAX_BRIDGE_MESSAGE_BYTES
      ? { kind: "oversize", size: e.byteLength }
      : { kind: "text", text: Buffer.from(e).toString("utf8") };
  if (ArrayBuffer.isView(e))
    return e.byteLength > MAX_BRIDGE_MESSAGE_BYTES
      ? { kind: "oversize", size: e.byteLength }
      : { kind: "text", text: Buffer.from(e.buffer, e.byteOffset, e.byteLength).toString("utf8") };
  return { kind: "unsupported" };
}
/**
 * 服务组只读视图
 */
//@ chunk-ksxq075c.js:17375-17568 placement
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
/**
 * 原生与透传工具定义视图
 */
//@ chunk-ksxq075c.js:17568-17913 placement
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
        if (d !== r) ((r = d), i(s));
      });
    },
  };
}
/**
 * 原生设备工具的公告
 */
//@ chunk-ksxq075c.js:17913-18131 placement
function toNativeToolAnnouncement(e) {
  let n = parseRegistration(e._meta?.[ANTHROPIC_REMOTETOOLEXECUTION]);
  return n === void 0
    ? []
    : [
        {
          name: e.name,
          refused_input_fields: n.refused_input_fields,
          protocol_versions: n.protocol_versions ?? [REMOTE_TOOL_PROTOCOL_VERSION],
          description: e.description,
          input_schema: e.inputSchema,
        },
      ];
}
/**
 * 透传工具的公告
 */
//@ chunk-ksxq075c.js:18131-18390 placement
function toPassthroughToolAnnouncement(e) {
  let n = parsePassthroughMarker(e._meta?.[PASSTHROUGH_MARKER_KEY]);
  if (n === void 0) return [];
  let i = pickToolAnnotations(e.annotations ?? {}),
    r = toolHintsFromMeta(e._meta ?? {});
  return [
    {
      name: e.name,
      local_name: n.tool,
      description: e.description,
      input_schema: e.inputSchema,
      ...(i !== void 0 && { annotations: i }),
      ...(r !== void 0 && { hints: r }),
    },
  ];
}
/**
 * 挑出工具注解字段
 */
//@ chunk-ksxq075c.js:18390-18635 placement
function pickToolAnnotations({
  title: title,
  readOnlyHint: readOnlyHint,
  destructiveHint: destructiveHint,
  openWorldHint: openWorldHint,
}) {
  let s = {
    ...(title !== void 0 && { title: title }),
    ...(readOnlyHint !== void 0 && { readOnlyHint: readOnlyHint }),
    ...(destructiveHint !== void 0 && { destructiveHint: destructiveHint }),
    ...(openWorldHint !== void 0 && { openWorldHint: openWorldHint }),
  };
  return Object.keys(s).length > 0 ? s : void 0;
}
/**
 * 从 _meta 取工具提示
 */
//@ chunk-ksxq075c.js:18635-18955 placement
function toolHintsFromMeta(e) {
  let n = e[TOOL_META_KEYS.searchHint],
    i = e[TOOL_META_KEYS.alwaysLoad],
    r = e[TOOL_META_KEYS.maxResultSizeChars],
    s = e[TOOL_META_KEYS.requiresUserInteraction],
    d = {
      ...(typeof n === "string" && { search_hint: n }),
      ...(i === !0 && { always_load: !0 }),
      ...(typeof r === "number" && { max_result_size_chars: r }),
      ...(s === !0 && { requires_user_interaction: !0 }),
    };
  return Object.keys(d).length > 0 ? d : void 0;
}
//@ chunk-ksxq075c.js:18955-20076 placement
var WSS_BRIDGE_CLAUDEUSERCONTENT_COM = "wss://bridge.claudeusercontent.com",
  We = "wss://bridge-staging.claudeusercontent.com",
  fe = 8,
  SERVED_BRIDGE_TRUSTED_DEVICES = "served-bridge-trusted-devices",
  me =
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
    } < "u"
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
function ze(e, n) {
  let i = FCt(e),
    r = slugifyName(sessionIdBody(n).slice(-fe), fe);
  return r ? `${i}-cc-${r}` : i;
}
//@ chunk-ksxq075c.js:20159-20283 placement
function getDeviceBridgePath(e, n, i, r) {
  return `${e}/devices/${encodeURIComponent(n)}_${encodeURIComponent(i)}/${encodeURIComponent(r)}/bridge`;
}
/**
 * WebSocket 地址是否与 API 同源
 */
//@ chunk-ksxq075c.js:20283-20539 placement
function isSameOriginWsUrl(e, n) {
  let i, r;
  try {
    ((i = new URL(e)), (r = new URL(n)));
  } catch {
    return !1;
  }
  let s = i.hostname === "localhost" || i.hostname === "127.0.0.1" || i.hostname === "[::1]";
  return (
    i.origin === r.origin &&
    i.username === "" &&
    i.password === "" &&
    (i.protocol === "wss:" || (i.protocol === "ws:" && s))
  );
}
/**
 * 设备桥地址（环境变量或按 OAuth 环境）
 */
//@ chunk-ksxq075c.js:20539-20717 placement
function getDeviceBridgeUrl() {
  if (antEnv.CLAUDE_REMOTE_TOOLS_BRIDGE_URL !== void 0) return antEnv.CLAUDE_REMOTE_TOOLS_BRIDGE_URL;
  switch (fileSuffixForOauthConfig()) {
    case "":
      return WSS_BRIDGE_CLAUDEUSERCONTENT_COM;
    case "-staging-oauth":
      return We;
    default:
      return;
  }
}
/**
 * 启动设备注册：通过 WebSocket 设备桥公告本机工具、心跳与重连。
 */
//@ chunk-ksxq075c.js:20717-24949 placement
function startDeviceRegistration(e) {
  let n = e.transport ?? (isSessionChannelDisabled() ? "bridge" : "auto"),
    i = !1,
    r,
    s,
    d,
    S,
    b = !1,
    O = !1,
    f = !1,
    k = new Set(),
    I = !1,
    R,
    D,
    w = { current: void 0 },
    C,
    B = (h) => (S ??= V(h)),
    V = async (h) => {
      if (((i = !0), s?.(), (s = void 0), b)) await P.catch(() => !1);
      (r?.(), (r = void 0), d?.(), (d = void 0), w.current?.kit.dispose());
      let v = C?.dispose();
      ((C = void 0), await U(h), await v);
    },
    U = async (h) => {
      let v = R;
      if (v === void 0) return;
      if (((R = void 0), await v.stop(), O)) logEvent("tengu_device_bridge_stopped", { reason: fromEnum(h) });
    },
    q = async () => {
      let h = e.readiness ?? (await import("./chunk-60g26dt5.js")).createServingReadiness(),
        startTime = performance.now();
      await h.whenReady();
      let rounded = Math.round(performance.now() - startTime),
        { cloudClient: cloudClient } = e,
        Q = await (e.isEnabled ?? (() => isToolServingEnabled({ cloudClient: cloudClient })))();
      if (((b = !0), !Q)) return !1;
      let L = e.isEgressAllowed ?? hCe;
      if (!L())
        return (
          logForDebugging(
            "[deviceBridge] skipped: non-essential egress disabled, non-first-party provider, or remote sessions policy-denied",
          ),
          !1
        );
      if (i) return !1;
      if (n === "bridge" && (e.isBridgeRefused ?? isTrustedDeviceRequiredOrUnknown)())
        return (
          logForDebugging(
            "[deviceBridge] skipped: the bridge cannot check a device proof and trusted devices are required or unknown",
          ),
          (f = !0),
          logFeatureBad("device_bridge_register", "trusted_devices_required_or_unknown"),
          e.onNotice?.(
            SERVED_BRIDGE_TRUSTED_DEVICES,
            REMOTE_TOOLS_CONSENT_TEXT["serving_off.bridge_trusted_devices"],
          ),
          !1
        );
      let M = await (e.getAccount ?? resolveCurrentDeviceBinding)(),
        orgUuid = e.orgUuid;
      if (!orgUuid || M.status !== "resolved")
        return (
          logEvent("tengu_device_bridge_skipped", {
            missing_org: orgUuid === void 0,
            missing_account: M.status === "missing",
            account_mismatch: M.status === "mismatch",
          }),
          logForDebugging(`[deviceBridge] skipped: ${orgUuid ? `account ${M.status}` : "no org"}`),
          !1
        );
      let { accountUuid: accountUuid } = M,
        Te = createConcurrencyLimiter(TBn);
      if (((D = createDeviceToolRegistry()), D.setGroup(CORE, []), await primeWindowsProfileDirs(), i))
        return !1;
      let W = remoteToolServingOffReason(void 0, { ignoringMute: !0 });
      if (W === void 0) {
        if ((await rNt(), i)) return !1;
      }
      let te =
        W === void 0 && isViolinRibEnabled()
          ? await import("./chunk-3f6fc86f.js")
              .then((y) => y.gatherHostInventory(getOriginalCwd()))
              .catch((y) => {
                logError(toError(y));
                return;
              })
          : void 0;
      if (i) return !1;
      let nn = void 0,
        tn = void 0,
        be = e.toolGroupProviders ?? (await loadServingGroupProviders(W));
      if (i) return !1;
      let X = [];
      ((d = runCleanups(be, {
        registry: D,
        holdStartUntil: (y) => X.push(y),
        sessionId: e.sessionId,
        serving: { offReason: W },
        getDeviceId:
          e.getDeviceId ??
          (() => {
            return;
          }),
        limiter: Te,
        storageV5: e.storageV5,
        servedSettingsChanged: e.servedSettingsChanged,
        ...(e.deviceMcpQuestion && { deviceMcpQuestion: e.deviceMcpQuestion }),
        servingKit: w,
        transport: n,
        readiness: h,
        ...(te !== void 0 && { hostInventory: te }),
        ...(C !== void 0 && { execution: C.execution }),
        sandboxRequiredNow: remoteToolVmRequired,
        ...(e.dirSync !== void 0 && { dirSync: e.dirSync }),
        ...(e.folderRelation !== void 0 && { folderRelation: e.folderRelation }),
        onNotice:
          e.onNotice ??
          ((y, De) => {
            logForDebugging(`[remote-tools] ${y}: ${De}`);
          }),
      })),
        logForDebugging(`[deviceBridge] start-up held on ${X.length} reads of its tool groups`));
      let startTime_2 = performance.now();
      await Promise.allSettled(X);
      let rounded_2 = Math.round(performance.now() - startTime_2);
      if ((logForDebugging(`[deviceBridge] start-up released after ${rounded_2} ms`), i)) return !1;
      let Se = D;
      if (n === "bridge") {
        if (
          ((R = await openDeviceBridge({
            options: e,
            orgUuid: orgUuid,
            accountUuid: accountUuid,
            registry: Se,
            isEgressAllowed: L,
            isStopped: () => i,
            onLivenessEvent: G,
            onTransportEvent: x,
          })),
          R === void 0 || i)
        )
          return (await R?.stop(), (R = void 0), !1);
      }
      let re = () => {
          if (!L()) B("egress_denied");
        },
        ke =
          e.isStillEnabled ?? (() => getToolServingFlagAnsweredOff({ cloudClient: cloudClient }) === void 0),
        oe = () => {
          if (!ke()) (logForDebugging("[deviceBridge] stopping: the gate turned off"), B("gate_off"));
        },
        Re = (e.onEgressGateChange ?? onComplianceTaintsChanged)(re),
        Ee = (e.onEnabledChange ?? onGrowthBookRefresh)(oe);
      if (
        ((s = () => {
          (Re(), Ee());
        }),
        re(),
        oe(),
        i)
      )
        return !1;
      if (
        ((O = !0),
        logEvent("tengu_device_bridge_started", {
          account_source: fromEnum(M.source),
          transport: fromEnum(n),
          redial: !1,
          readiness_wait_ms: rounded,
          held_ms: rounded_2,
        }),
        n === "auto" && !f)
      )
        ((f = !0), logFeatureOk("device_bridge_register"));
      return (R?.start(), !0);
    },
    x = (h) => {
      if (h.kind === "authenticated") {
        if ((k.clear(), (I = !1), !f)) ((f = !0), logFeatureOk("device_bridge_register"));
        logTransportEvent(h);
        return;
      }
      let v = describeTransportEvent(h);
      if (v === void 0) return;
      if (k.has(v)) return;
      (k.add(v), logTransportEvent(h));
    },
    G = (h) => {
      if (h.kind === "reconnect_exhausted") {
        if (!f) ((f = !0), logFeatureBad("device_bridge_register", "reconnect_exhausted"));
        if (I) return;
        I = !0;
      }
      logLivenessEvent(h);
    };
  r = (e.registerExitCleanup ?? registerCleanup)(() => B("exit"));
  let P = q().catch((h) => {
      if (
        (logForDebugging(`[deviceBridge] registration failed: ${toError(h).message}`),
        logEvent("tengu_device_bridge_start_failed", {}),
        !f)
      )
        ((f = !0), logFeatureBad("device_bridge_register", "start_failed"));
      return !1;
    }),
    Y = P.then((h) =>
      h && D !== void 0 && w.current !== void 0
        ? { kit: servingGroupView(w.current.kit), source: deviceToolDefinitions(D) }
        : void 0,
    );
  return (
    P.then((h) => {
      if (!h && !i)
        (r?.(), (r = void 0), d?.(), (d = void 0), w.current?.kit.dispose(), C?.dispose(), (C = void 0));
    }),
    {
      started: P,
      announceSettled: () => {},
      serving: Y,
      stop: () => B("attach_ended"),
      heldServedCall: (h) => (i || w.current === void 0 ? p5 : w.current.kit.heldServedCall(h)),
    }
  );
}
/**
 * 建立设备桥连接
 */
//@ chunk-ksxq075c.js:24949-26363 placement
async function openDeviceBridge({
  options: options,
  orgUuid: orgUuid,
  accountUuid: accountUuid,
  registry: registry,
  isEgressAllowed: isEgressAllowed,
  isStopped: isStopped,
  onLivenessEvent: onLivenessEvent,
  onTransportEvent: onTransportEvent,
}) {
  let O = ze((options.getHostname ?? hostname)(), options.sessionId),
    f = options.getBridgeBaseUrl !== void 0 || antEnv.CLAUDE_REMOTE_TOOLS_BRIDGE_URL !== void 0,
    k = (options.getBridgeBaseUrl ?? getDeviceBridgeUrl)();
  if (k === void 0) {
    logForDebugging("[deviceBridge] skipped: no device bridge for this OAuth environment");
    return;
  }
  let I = getDeviceBridgePath(k, orgUuid, accountUuid, O),
    {
      createDeviceMcpServer: createDeviceMcpServer,
      deviceInfoProbeTool: deviceInfoProbeTool,
      parseJsonRpcMessage: parseJsonRpcMessage,
    } = await import("./chunk-zethn0a3.js");
  if (isStopped()) return;
  let C = { getDeviceName: () => O, version: me },
    B = deviceInfoProbeTool(C),
    V = deviceInfoProbeTool({ ...C, idle: !0 }),
    U = (A) => {
      let all = registry.definitions().every((L) => L.name === B.definition.name);
      registry.setGroup(CORE, [all ? V : B], A);
    };
  U();
  let subscribe = registry.subscribe(U),
    x = () => {
      (subscribe(), registry.setGroup(CORE, []));
    },
    G = new DeviceBridgeTransport({
      getUrl: () => I,
      getAccessToken: () => options.getAccessToken(),
      getTools: () => announcedToolsForConnect(registry),
      getDeviceId: options.getDeviceId,
      getSessionId: () => toInfraSessionId(options.sessionId),
      parseMessage: parseJsonRpcMessage,
      createSocket: options.createSocket,
      isAllowedUrl: (A) => isEgressAllowed() && (isBareWssUrl(A) || (f && isSameOriginWsUrl(A, k))),
    }),
    {
      server: server,
      inFlightCalls: inFlightCalls,
      whenIdle: whenIdle,
    } = createDeviceMcpServer({ registry: registry, version: me, sessionId: options.sessionId });
  try {
    await server.connect(G);
  } catch (error) {
    throw (x(), error);
  }
  if (isStopped()) {
    (x(), await server.close());
    return;
  }
  let v = new DeviceRegistrationSession({
      transport: G,
      announced: {
        hasUnservedChange: registry.hasUnservedChange,
        inFlightCalls: inFlightCalls,
        whenIdle: whenIdle,
      },
      onEvent: onLivenessEvent,
      onTransportEvent: onTransportEvent,
    }),
    subscribe_2 = registry.subscribe((A) => v.requestReannounce(A)),
    j;
  return {
    start: () => v.start(),
    stop: () =>
      (j ??= (async () => {
        (subscribe_2(), x(), await Promise.allSettled([v.stop(), server.close()]));
      })()),
  };
}
/**
 * 传输事件转键
 */
//@ chunk-ksxq075c.js:26363-26652 placement
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
/**
 * 记录设备桥传输事件遥测
 */
//@ chunk-ksxq075c.js:26652-27389 placement
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
      logEvent("tengu_device_bridge_connect_failed", { cause: fromEnum(e.kind) });
      return;
    case "dial_failed":
      logEvent("tengu_device_bridge_connect_failed", { cause: fromEnum("dial_failed") });
      return;
    default:
      return;
  }
}
/**
 * 记录设备桥存活事件遥测
 */
//@ chunk-ksxq075c.js:27389-28025 placement
function logLivenessEvent(e) {
  switch (e.kind) {
    case "pong_timeout":
      logEvent("tengu_device_bridge_pong_timeout", { consecutive: e.consecutive });
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
      logEvent("tengu_device_bridge_reannounce_contended", { reason: fromEnum(e.reason) });
      return;
    default:
      return;
  }
}
/**
 * 加载远程工具与透传服务组
 */
//@ chunk-ksxq075c.js:28025-28304 placement
async function loadServingGroupProviders(e) {
  if (e === void 0 || isPersonFixableOffReason(e))
    try {
      let [{ remoteToolServingGroupProvider: n }, { passthroughServingGroupProvider: i }, r] =
        await Promise.all([import("./chunk-wa3cc7ae.js"), import("./chunk-xqfbbyzk.js"), void 0]);
      return e === void 0 ? [n(), i(), ...[]] : [n()];
    } catch (error) {
      logError(toError(error));
    }
  return [];
}
/**
 * 依次执行并收集清理函数
 */
//@ chunk-ksxq075c.js:28304-28458 placement
function runCleanups(e, n) {
  let flattened = e.flatMap((r) => {
    try {
      let s = r(n);
      return s ? [s] : [];
    } catch (error) {
      return (logError(toError(error)), []);
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
/**
 * 连接帧公告的工具
 */
//@ chunk-ksxq075c.js:28458-28844 placement
function announcedToolsForConnect(e) {
  let hasUnservedChange = e.hasUnservedChange(),
    serve = e.serve();
  if (!hasUnservedChange) return serve;
  let mapped = serve.map((s) => s.name);
  return (
    logForDebugging(
      `[deviceBridge] connect frame announces ${serve.length} tools: ${mapped.slice(0, 12).join(", ")}${mapped.length > 12 ? ", \u2026" : ""}`,
    ),
    logEvent("tengu_device_bridge_connect_frame", {
      tool_count: serve.length,
      serves_bash: mapped.includes(BASH_TOOL_NAME),
      serves_powershell: mapped.includes(POWERSHELL_TOOL_NAME),
      mcp_tool_count: count(mapped, (s) => s.includes("__")),
    }),
    serve
  );
}

export { startDeviceRegistration };

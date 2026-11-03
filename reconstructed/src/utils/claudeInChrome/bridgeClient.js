/**
 * utils/claudeInChrome/bridgeClient.ts
 *
 * 2.1.316 新增：Claude in Chrome 桥接 WebSocket 客户端：连接、认证、设备发现、工具调用、重连；本地 Chrome 扩展连接池（多客户端、标签路由、主动配对、重拨）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4dj0g7y4.js (18)
 * attribution: placement 18
 */
import ws from "ws";
import {
  SocketConnectionError,
  NoExtensionConnectedError,
  ExtensionDisconnectedMidCallError,
  permissionContextFields,
  quoteTruncated,
  toolCallMeta,
  ToolCallTimeoutError,
  pairingErrorMessage,
  createChromeSocketClient,
} from "./socketClient.js";
import { BROWSER_TOOL_TIMEOUT_MS, q$r, b2s, Ecn, V$r } from "./browserToolSchemas.js";
import {
  safeCallPromise,
  pickBrowserDevice,
  firstTextContent,
  classifyToolError,
} from "./toolErrorClassification.js";

//@ chunk-4dj0g7y4.js:345-374 placement
var m = /^[A-Za-z0-9-]{1,64}$/;
//@ chunk-4dj0g7y4.js:374-456 placement
function WAo(e = "linux") {
  return e === "darwin" ? "macOS" : e === "win32" ? "Windows" : "Linux";
}
//@ chunk-4dj0g7y4.js:456-676 placement
function wrapWebSocket(e) {
  return {
    on: (n, t) => {
      e.on(n, t);
    },
    removeAllListeners: () => e.removeAllListeners(),
    send: (n) => e.send(n),
    close: (n, t) => {
      if (e.readyState === ws.OPEN) e.close(n, t);
      else e.terminate();
    },
    get readyState() {
      return e.readyState;
    },
  };
}
//@ chunk-4dj0g7y4.js:676-870 placement
var PING_INTERVAL_MS = 30000,
  IDLE_TIMEOUT_MS = 90000,
  SELECTION_REASON_WORDS = {
    persisted: "the last-picked",
    only: "the only connected",
    local: "this computer's",
  },
  DISCOVERY_TIMEOUT_MS = 30000,
  EXTERNAL_MESSAGE_TYPES = new Set(["external_message", "external_message_result", "external_config"]),
  RESPONSE_TIMEOUT_MS = 30000;
//@ chunk-4dj0g7y4.js:870-1013 placement
function cleanDeviceText(e, n) {
  if (typeof e !== "string") return;
  let trimmed = e.replace(/[\r\n\t\u0000-\u001f]/g, " ").trim();
  return trimmed.length > n ? `${trimmed.slice(0, n)}\u2026` : trimmed;
}
//@ chunk-4dj0g7y4.js:1013-1223 placement
function parseConnectedExtension(e) {
  if (typeof e.deviceId !== "string" || !m.test(e.deviceId)) return;
  return {
    deviceId: e.deviceId,
    name: cleanDeviceText(e.name, 50),
    osPlatform: cleanDeviceText(e.osPlatform, 30),
    connectedAt: typeof e.connectedAt === "number" ? e.connectedAt : 0,
  };
}
//@ chunk-4dj0g7y4.js:1223-1231 placement
var P = 4;
/**
 * 清洗桥接通知列表（种类、域名，有上限）。
 */
//@ chunk-4dj0g7y4.js:1231-1850 placement
function sanitizeBridgeNotices(e, n) {
  if (!Array.isArray(e)) return;
  let t = new Map(),
    s = (o, i) => {
      if (t.has(o)) {
        t.set(o, i);
        return;
      }
      if (t.size >= P) {
        n?.(`sanitizeBridgeNotices: notice cap (${P}) reached; dropping entry`);
        return;
      }
      t.set(o, i);
    };
  for (let o of e) {
    if (typeof o !== "object" || o === null) continue;
    let { kind: kind, domain: domain } = o;
    if (typeof kind !== "string" || !/^[a-z0-9_]{1,64}$/i.test(kind)) continue;
    let lower = kind.toLowerCase();
    if (domain === void 0) s(`${lower}:`, { kind: lower });
    else if (typeof domain === "string" && domain.length <= 253 && /^[a-z0-9.-]+$/i.test(domain)) {
      let replaced = domain.toLowerCase().replace(/\.$/, "");
      if (replaced.length === 0) continue;
      s(`${lower}:${replaced}`, { kind: lower, domain: replaced });
    }
  }
  return t.size > 0 ? Array.from(t.values()) : void 0;
}
/**
 * Claude in Chrome 桥接 WebSocket 客户端：连接、认证、设备发现、工具调用、重连。
 */
//@ chunk-4dj0g7y4.js:1850-29137 placement
class ChromeBridgeClient {
  ws = null;
  connected = !1;
  authenticated = !1;
  connecting = !1;
  reconnectTimer = null;
  handshakeTimer = null;
  reconnectAttempts = 0;
  pendingCalls = new Map();
  timedOutCalls = new Map();
  notificationHandler = null;
  context;
  permissionMode = "ask";
  allowedDomains;
  connectionStartTime = null;
  connectionEstablishedTime = null;
  selectedDeviceId;
  discoveryComplete = !1;
  multiBrowserPendingSelection = !1;
  discoveryPromise = null;
  pendingDiscovery = null;
  listExtensionsPromise = null;
  previousSelectedDeviceId;
  peerConnectedWaiters = [];
  pendingPairingRequestId;
  pairingInProgress = !1;
  persistedDeviceId;
  pendingSwitchResolve = null;
  pairingPromptAbort = null;
  pairingPromptTimeout = null;
  keepAliveInterval = null;
  lastPongReceived = 0;
  pendingExternalMessages = new Map();
  constructor(e) {
    if (((this.context = e), e.initialPermissionMode)) this.permissionMode = e.initialPermissionMode;
  }
  async ensureConnected() {
    let { logger: logger, serverName: serverName } = this.context;
    if (
      (logger.info(
        `[${serverName}] ensureConnected called, connected=${this.connected}, authenticated=${this.authenticated}, wsState=${this.ws?.readyState}`,
      ),
      this.connected && this.authenticated && this.ws?.readyState === ws.OPEN)
    )
      return (logger.info(`[${serverName}] Already connected and authenticated`), !0);
    if (!this.connecting && !this.reconnectTimer)
      (logger.info(`[${serverName}] Not connecting, starting connection...`), await this.connect());
    else logger.info(`[${serverName}] Connect in progress or reconnect scheduled, waiting...`);
    return new Promise((t) => {
      let s = null,
        o = setTimeout(() => {
          if (s) clearTimeout(s);
          (logger.info(
            `[${serverName}] Connection timeout, connected=${this.connected}, authenticated=${this.authenticated}`,
          ),
            t(!1));
        }, 1e4),
        i = () => {
          if (this.connected && this.authenticated)
            (logger.info(`[${serverName}] Connection successful`), clearTimeout(o), t(!0));
          else if (!this.connecting && !this.reconnectTimer)
            (logger.info(`[${serverName}] No longer connecting, giving up`), clearTimeout(o), t(!1));
          else s = setTimeout(i, 200);
        };
      i();
    });
  }
  async callTool(e, n, t) {
    let { logger: logger, serverName: serverName, trackEvent: trackEvent } = this.context;
    if (!this.ws || this.ws.readyState !== ws.OPEN)
      throw new SocketConnectionError(`[${serverName}] Bridge not connected`);
    if (!this.selectedDeviceId && (!this.discoveryComplete || this.multiBrowserPendingSelection))
      ((this.discoveryPromise ??= this.discoverAndSelectExtension().finally(() => {
        this.discoveryPromise = null;
      })),
        await this.discoveryPromise);
    if (
      this.discoveryComplete &&
      !this.selectedDeviceId &&
      !this.pairingInProgress &&
      !this.multiBrowserPendingSelection
    )
      throw new NoExtensionConnectedError(`[${serverName}] No Chrome extension connected after discovery`);
    let r = t?.sessionScope?.sessionId,
      a = t?.sessionScope?.userMessageUuid,
      c = this.context.browserActivityObserver?.onBeforeToolCall;
    if (c) {
      let selectedDeviceId = this.selectedDeviceId;
      try {
        await c({ sessionId: r, toolName: e, args: n });
      } catch {
        logger.debug(`[${serverName}] browser activity observer threw`);
      }
      if (!this.ws || this.ws.readyState !== ws.OPEN)
        throw new SocketConnectionError(`[${serverName}] Bridge disconnected before tool call was sent`);
      if (selectedDeviceId !== void 0 && this.selectedDeviceId === void 0)
        throw new ExtensionDisconnectedMidCallError("Chrome extension disconnected mid-call");
    }
    let randomUUID = crypto.randomUUID(),
      now = Date.now(),
      l = this.context.getToolCallTimeoutMs?.(e) ?? BROWSER_TOOL_TIMEOUT_MS,
      g = {
        type: "tool_call",
        tool_use_id: randomUUID,
        client_type: this.context.clientTypeId,
        tool: e,
        args: n,
        supports_tool_result_notices: !0,
      };
    if (this.selectedDeviceId) g.target_device_id = this.selectedDeviceId;
    Object.assign(
      g,
      permissionContextFields({
        ...t,
        permissionMode: t?.permissionMode ?? this.permissionMode,
        allowedDomains: t?.allowedDomains ?? this.allowedDomains,
      }),
    );
    let json = JSON.stringify(g);
    return (
      trackEvent?.("chrome_bridge_tool_call_started", {
        tool_name: `browser:${e}`,
        tool_use_id: randomUUID,
        session_id: r,
        user_message_uuid: a,
        timeout_ms: l,
        transport: "bridge",
        request_bytes: Buffer.byteLength(json, "utf-8"),
      }),
      new Promise((f, S) => {
        let timeoutTimer = this.createTimeoutTimer(randomUUID, l);
        (this.pendingCalls.set(randomUUID, {
          resolve: f,
          reject: S,
          timer: timeoutTimer,
          onPermissionRequest: t?.onPermissionRequest,
          startTime: now,
          toolName: e,
          timeoutMs: l,
          sessionId: r,
          userMessageUuid: a,
          args: n,
        }),
          logger.debug(`[${serverName}] Sending tool_call: ${quoteTruncated(e)} (${randomUUID.slice(0, 8)})`),
          this.ws.send(json));
      })
    );
  }
  sendExternalMessage(e, n, t) {
    let { logger: logger, serverName: serverName } = this.context;
    if (!this.ws || this.ws.readyState !== ws.OPEN)
      return Promise.reject(new SocketConnectionError(`[${serverName}] Bridge not connected`));
    if (!this.selectedDeviceId)
      return (
        logger.info(`[${serverName}] external_message refused: no extension selected`),
        Promise.resolve({ ok: !1, error: "no_target" })
      );
    this.pushExternalConfig();
    let randomUUID = crypto.randomUUID(),
      r = t?.timeoutMs,
      min = Math.min(typeof r === "number" && Number.isFinite(r) && r > 0 ? r : q$r, b2s),
      c = {
        type: "external_message",
        requestId: randomUUID,
        extensionIds: [...e],
        payload: n,
        timeoutMs: min,
        target_device_id: this.selectedDeviceId,
      };
    return new Promise((d) => {
      let h = setTimeout(() => {
        if (this.pendingExternalMessages.delete(randomUUID))
          (logger.warn(`[${serverName}] external_message timed out locally (${randomUUID.slice(0, 8)})`),
            d({ ok: !1, error: "timeout" }));
      }, min + DISCOVERY_TIMEOUT_MS);
      (this.pendingExternalMessages.set(randomUUID, { resolve: d, timer: h }),
        logger.debug(`[${serverName}] Sending external_message (${randomUUID.slice(0, 8)})`));
      try {
        this.ws.send(JSON.stringify(c));
      } catch (error) {
        (clearTimeout(h),
          this.pendingExternalMessages.delete(randomUUID),
          logger.warn(
            `[${serverName}] external_message serialization/send failed: ${error instanceof Error ? error.message : String(error)}`,
          ),
          d({ ok: !1, error: "send_failed" }));
      }
    });
  }
  pushExternalConfig(e) {
    if (this.selectedDeviceId === void 0) return !1;
    return this.pushExternalConfigToPeer(this.selectedDeviceId, e);
  }
  pushExternalConfigToPeer(e, n) {
    if (this.ws?.readyState !== ws.OPEN) return !1;
    let t = n;
    if (!t) {
      if (!this.context.getExternalRelayConfig) return !1;
      t = this.context.getExternalRelayConfig() ?? { extensionIds: [] };
    }
    return (
      this.ws.send(
        JSON.stringify({
          type: "external_config",
          extensionIds: t.extensionIds,
          ...(t.hooks !== void 0 && { hooks: t.hooks }),
          target_device_id: e,
        }),
      ),
      !0
    );
  }
  async pushExternalConfigToAllPeers(e) {
    if (this.ws?.readyState !== ws.OPEN) return 0;
    if (!e && !this.context.getExternalRelayConfig) return 0;
    let queryBridgeExtensions = await this.queryBridgeExtensions(),
      t = 0;
    for (let s of queryBridgeExtensions) if (this.pushExternalConfigToPeer(s.deviceId, e)) t++;
    return t;
  }
  isConnected() {
    return this.connected && this.authenticated && this.ws?.readyState === ws.OPEN;
  }
  disconnect() {
    this.cleanup();
  }
  setNotificationHandler(e) {
    this.notificationHandler = e;
  }
  async discoverAndSelectExtension() {
    let { logger: logger, serverName: serverName } = this.context;
    this.persistedDeviceId = this.context.getPersistedDeviceId?.();
    let queryBridgeExtensions = await this.queryBridgeExtensions();
    if (queryBridgeExtensions.length === 0) {
      if (
        (logger.info(`[${serverName}] No extensions connected, waiting up to ${Ecn}ms for peer_connected`),
        await this.waitForPeerConnected(Ecn))
      )
        queryBridgeExtensions = await this.queryBridgeExtensions();
    }
    if (this.context.getRequirePairedDevice?.()) {
      if (!this.persistedDeviceId) {
        (logger.info(
          `[${serverName}] requirePairedDevice set but no persistedDeviceId; refusing to auto-select`,
        ),
          (this.discoveryComplete = !0));
        return;
      }
      let persistedDeviceId = this.persistedDeviceId,
        found = queryBridgeExtensions.find((a) => a.deviceId === persistedDeviceId);
      if (!found) {
        if (
          (logger.info(
            `[${serverName}] requirePairedDevice: persisted ${persistedDeviceId.slice(0, 8)} not connected (${queryBridgeExtensions.length} other(s) visible); waiting`,
          ),
          await this.waitForPeerConnected(Ecn))
        )
          ((queryBridgeExtensions = await this.queryBridgeExtensions()),
            (found = queryBridgeExtensions.find((a) => a.deviceId === persistedDeviceId)));
      }
      if (((this.discoveryComplete = !0), found)) this.selectExtension(found.deviceId);
      else
        logger.info(
          `[${serverName}] requirePairedDevice: persisted device never arrived; refusing to auto-select`,
        );
      return;
    }
    let s =
      queryBridgeExtensions.length > 1 &&
      !queryBridgeExtensions.some((i) => i.deviceId === this.persistedDeviceId)
        ? await safeCallPromise(this.context.getLocalDeviceIds)
        : void 0;
    if (((this.discoveryComplete = !0), this.selectedDeviceId)) return;
    let o = pickBrowserDevice(queryBridgeExtensions, this.persistedDeviceId, s);
    if (o.kind === "none") {
      (logger.info(`[${serverName}] No extensions found after waiting`),
        (this.multiBrowserPendingSelection = !1));
      return;
    }
    if (o.kind === "select") {
      let { extension: extension, reason: reason } = o;
      if (
        (logger.info(
          `[${serverName}] Auto-connecting to ${SELECTION_REASON_WORDS[reason]} extension: ${extension.name || extension.deviceId.slice(0, 8)}`,
        ),
        reason === "only" && !this.isLocalExtension(extension))
      )
        this.context.onRemoteExtensionWarning?.(extension);
      (this.selectExtension(extension.deviceId),
        this.reportBrowserSelected(reason, queryBridgeExtensions, s));
      return;
    }
    if (!this.multiBrowserPendingSelection) this.reportBrowserSelected("ask", queryBridgeExtensions, s);
    if (this.context.askUserToolName) {
      this.multiBrowserPendingSelection = !0;
      return;
    }
    (this.broadcastPairingRequest(), (this.pairingInProgress = !0), this.firePairingPrompt());
  }
  reportBrowserSelected(e, n, t) {
    this.context.trackEvent?.("chrome_bridge_browser_selected", {
      outcome: e,
      connected_count: n.length,
      local_count: t === void 0 ? null : n.filter((s) => t.has(s.deviceId)).length,
    });
  }
  queryBridgeExtensions() {
    if (this.listExtensionsPromise) return this.listExtensionsPromise;
    let e = new Promise((n) => {
      let t = setTimeout(() => {
        ((this.pendingDiscovery = null), n([]));
      }, V$r);
      ((this.pendingDiscovery = { resolve: n, timeout: t }),
        this.ws?.send(JSON.stringify({ type: "list_extensions" })));
    }).then((n) => {
      let t = new Map();
      for (let s of n) {
        let o = t.get(s.deviceId);
        if (!o || s.connectedAt > o.connectedAt) t.set(s.deviceId, s);
      }
      return [...t.values()].map(parseConnectedExtension).filter((s) => s !== void 0);
    });
    return (
      (this.listExtensionsPromise = e),
      e.finally(() => {
        if (this.listExtensionsPromise === e) this.listExtensionsPromise = null;
      }),
      e
    );
  }
  getSelectedDeviceId() {
    return this.selectedDeviceId ?? this.context.getPersistedDeviceId?.();
  }
  hasActiveSelection() {
    return this.selectedDeviceId !== void 0;
  }
  clearSelection() {
    ((this.selectedDeviceId = void 0),
      (this.previousSelectedDeviceId = void 0),
      (this.discoveryComplete = !1),
      (this.multiBrowserPendingSelection = !1),
      (this.pairingInProgress = !1),
      this.abortPairingPrompt());
  }
  selectExtension(e) {
    let { logger: logger, serverName: serverName } = this.context;
    ((this.selectedDeviceId = e),
      (this.previousSelectedDeviceId = void 0),
      (this.multiBrowserPendingSelection = !1),
      logger.info(`[${serverName}] Selected Chrome extension: ${e.slice(0, 8)}...`),
      this.pushExternalConfig());
  }
  async clearSelectionIfGone(e) {
    let { logger: logger, serverName: serverName } = this.context,
      queryBridgeExtensions = await this.queryBridgeExtensions();
    if (this.selectedDeviceId !== e) return;
    if (queryBridgeExtensions.some((o) => o.deviceId === e)) return;
    (logger.info(
      `[${serverName}] Selected extension ${e.slice(0, 8)} absent from bridge roster after error; clearing selection`,
    ),
      (this.selectedDeviceId = void 0),
      (this.discoveryComplete = !1));
  }
  async listConnectedExtensions() {
    if (!(await this.ensureConnected())) return [];
    let queryBridgeExtensions = await this.queryBridgeExtensions(),
      n = queryBridgeExtensions.length > 1 ? await safeCallPromise(this.context.getLocalDeviceIds) : void 0;
    return queryBridgeExtensions.map((t) => ({
      ...t,
      isLocal: this.isLocalExtension(t),
      ...(n?.has(t.deviceId) && { onThisComputer: !0 }),
    }));
  }
  selectExtensionById(e, n) {
    if (
      ((this.discoveryComplete = !0),
      (this.pairingInProgress = !1),
      (this.pendingPairingRequestId = void 0),
      this.selectExtension(e),
      this.context.onExtensionPaired?.(e, n),
      this.pendingSwitchResolve)
    )
      this.pendingSwitchResolve({ deviceId: e, name: n });
    this.abortPairingPrompt();
  }
  firePairingPrompt() {
    if ((this.abortPairingPrompt(), !this.context.onPairingPrompted)) return;
    let abortController = new AbortController();
    ((this.pairingPromptAbort = abortController),
      (this.pairingPromptTimeout = setTimeout(() => this.abortPairingPrompt(), 120000)),
      this.context.onPairingPrompted(abortController.signal));
  }
  abortPairingPrompt() {
    if (this.pairingPromptTimeout)
      (clearTimeout(this.pairingPromptTimeout), (this.pairingPromptTimeout = null));
    if (this.pairingPromptAbort) (this.pairingPromptAbort.abort(), (this.pairingPromptAbort = null));
  }
  isLocalExtension(e) {
    if (!e.osPlatform) return !1;
    return e.osPlatform === WAo(this.context.getHostPlatform?.() ?? "linux");
  }
  waitForPeerConnected(e) {
    return new Promise((n) => {
      let t = setTimeout(() => {
          ((this.peerConnectedWaiters = this.peerConnectedWaiters.filter(
            (peerConnectedWaiter) => peerConnectedWaiter !== s,
          )),
            n(!1));
        }, e),
        s = (o) => {
          (clearTimeout(t), n(o));
        };
      this.peerConnectedWaiters.push(s);
    });
  }
  broadcastPairingRequest() {
    let randomUUID = crypto.randomUUID();
    ((this.pendingPairingRequestId = randomUUID),
      this.ws?.send(
        JSON.stringify({
          type: "pairing_request",
          request_id: randomUUID,
          client_type: this.context.clientTypeId,
        }),
      ));
  }
  async switchBrowser() {
    let queryBridgeExtensions = await this.queryBridgeExtensions(),
      n = this.selectedDeviceId ?? this.previousSelectedDeviceId;
    if (
      queryBridgeExtensions.length === 0 ||
      (queryBridgeExtensions.length === 1 && (!n || queryBridgeExtensions[0].deviceId === n))
    )
      return "no_other_browsers";
    ((this.previousSelectedDeviceId = this.selectedDeviceId),
      (this.selectedDeviceId = void 0),
      (this.discoveryComplete = !1),
      (this.pairingInProgress = !1));
    let randomUUID = crypto.randomUUID();
    if (((this.pendingPairingRequestId = randomUUID), this.ws?.readyState !== ws.OPEN)) return null;
    if (
      (this.ws.send(
        JSON.stringify({
          type: "pairing_request",
          request_id: randomUUID,
          client_type: this.context.clientTypeId,
        }),
      ),
      this.firePairingPrompt(),
      this.pendingSwitchResolve)
    )
      this.pendingSwitchResolve(null);
    return new Promise((s) => {
      let o = setTimeout(() => {
        if (this.pendingPairingRequestId === randomUUID) this.pendingPairingRequestId = void 0;
        ((this.pendingSwitchResolve = null), this.abortPairingPrompt(), s(null));
      }, 120000);
      this.pendingSwitchResolve = (i) => {
        (clearTimeout(o), (this.pendingSwitchResolve = null), s(i));
      };
    });
  }
  async connect() {
    let {
      logger: logger,
      serverName: serverName,
      bridgeConfig: bridgeConfig,
      trackEvent: trackEvent,
    } = this.context;
    if (!bridgeConfig) {
      logger.error(`[${serverName}] No bridge config provided`);
      return;
    }
    if (this.connecting) return;
    ((this.connecting = !0),
      (this.authenticated = !1),
      (this.connectionStartTime = Date.now()),
      this.closeSocket(),
      (this.handshakeTimer = setTimeout(() => {
        if (((this.handshakeTimer = null), !this.connecting)) return;
        let a = this.ws?.readyState;
        if (
          (logger.warn(`[${serverName}] Bridge connect stuck after ${RESPONSE_TIMEOUT_MS}ms (ws_state=${a})`),
          trackEvent?.("chrome_bridge_handshake_timeout", {
            duration_ms: Date.now() - (this.connectionStartTime ?? 0),
            ws_state: a,
          }),
          a === void 0)
        )
          return;
        ((this.connecting = !1), this.closeSocket(), this.scheduleReconnect());
      }, RESPONSE_TIMEOUT_MS)));
    let o, i;
    if (bridgeConfig.devUserId)
      ((o = bridgeConfig.devUserId), logger.debug(`[${serverName}] Using dev user ID for bridge connection`));
    else {
      logger.debug(`[${serverName}] Fetching user ID for bridge connection`);
      let a, c;
      if (bridgeConfig.getUserIdResult) {
        let userIdResult = await bridgeConfig.getUserIdResult();
        if (userIdResult.ok) c = userIdResult.userId;
        else a = userIdResult.error;
      } else c = await bridgeConfig.getUserId();
      if (!c) {
        let d = Date.now() - this.connectionStartTime;
        (logger.error(`[${serverName}] No user ID available after ${d}ms`),
          trackEvent?.("chrome_bridge_connection_failed", {
            duration_ms: d,
            error_type: "no_user_id",
            error_detail: a,
            reconnect_attempt: this.reconnectAttempts,
          }),
          (this.connecting = !1),
          this.scheduleReconnect());
        return;
      }
      if (
        ((o = c),
        logger.debug(`[${serverName}] Fetching OAuth token for bridge connection`),
        (i = await bridgeConfig.getOAuthToken()),
        !i)
      ) {
        let d = Date.now() - this.connectionStartTime;
        (logger.error(`[${serverName}] No OAuth token available after ${d}ms`),
          trackEvent?.("chrome_bridge_connection_failed", {
            duration_ms: d,
            error_type: "no_oauth_token",
            reconnect_attempt: this.reconnectAttempts,
          }),
          (this.connecting = !1),
          this.scheduleReconnect());
        return;
      }
    }
    let r = `${bridgeConfig.url}/chrome/${o}`;
    (logger.info(`[${serverName}] Connecting to bridge: ${r}`),
      trackEvent?.("chrome_bridge_connection_started", { bridge_url: r }));
    try {
      if (bridgeConfig.createWebSocket) this.ws = await bridgeConfig.createWebSocket(r);
      else {
        let a = (await bridgeConfig.getWsOptions?.()) ?? bridgeConfig.wsOptions;
        this.ws = wrapWebSocket(new ws(r, a ? { ...a, tls: a } : void 0));
      }
    } catch (error) {
      let c = Date.now() - this.connectionStartTime;
      (logger.error(`[${serverName}] Failed to create WebSocket after ${c}ms:`, error),
        trackEvent?.("chrome_bridge_connection_failed", {
          duration_ms: c,
          error_type: "websocket_error",
          error_code: error?.code,
          reconnect_attempt: this.reconnectAttempts,
        }),
        (this.connecting = !1),
        this.scheduleReconnect());
      return;
    }
    (this.ws.on("open", () => {
      logger.info(`[${serverName}] WebSocket connected, sending connect message`);
      let a = { type: "connect", client_type: this.context.clientTypeId };
      if (bridgeConfig.devUserId) a.dev_user_id = bridgeConfig.devUserId;
      else a.oauth_token = i;
      this.ws?.send(JSON.stringify(a));
    }),
      this.ws.on("message", (a) => {
        try {
          let str = a.toString(),
            parsed = JSON.parse(str);
          if (EXTERNAL_MESSAGE_TYPES.has(parsed.type))
            logger.debug(`[${serverName}] Bridge received: ${String(parsed.type)} (ok=${String(parsed.ok)})`);
          else if (logger.isDebugEnabled?.() ?? !0)
            logger.debug(`[${serverName}] Bridge received: ${JSON.stringify(parsed)}`);
          this.handleMessage(parsed, Buffer.byteLength(str, "utf-8"));
        } catch (error) {
          logger.error(`[${serverName}] Failed to parse bridge message:`, error);
        }
      }),
      this.ws.on("close", (a) => {
        let c = this.connectionEstablishedTime ? Date.now() - this.connectionEstablishedTime : 0;
        (logger.info(`[${serverName}] Bridge connection closed (code: ${a}, duration: ${c}ms)`),
          trackEvent?.("chrome_bridge_disconnected", {
            close_code: a,
            duration_since_connect_ms: c,
            reconnect_attempt: this.reconnectAttempts + 1,
          }),
          (this.connected = !1),
          (this.authenticated = !1),
          (this.connecting = !1),
          (this.connectionEstablishedTime = null),
          this.rejectPendingCalls(new SocketConnectionError("Bridge connection closed mid-call")),
          this.scheduleReconnect());
      }),
      this.ws.on("error", (a) => {
        let c = this.connectionStartTime ? Date.now() - this.connectionStartTime : 0;
        (logger.error(`[${serverName}] Bridge WebSocket error after ${c}ms: ${a.message}`),
          trackEvent?.("chrome_bridge_connection_failed", {
            duration_ms: c,
            error_type: "websocket_error",
            error_code: a.code,
            reconnect_attempt: this.reconnectAttempts,
          }),
          (this.connected = !1),
          (this.authenticated = !1),
          (this.connecting = !1),
          this.rejectPendingCalls(new SocketConnectionError(`Bridge connection error: ${a.message}`)));
      }));
  }
  handleMessage(e, n) {
    let { logger: logger, serverName: serverName, trackEvent: trackEvent } = this.context;
    switch (e.type) {
      case "paired": {
        let i = this.connectionStartTime ? Date.now() - this.connectionStartTime : 0;
        (logger.info(`[${serverName}] Paired with Chrome extension (duration: ${i}ms)`),
          (this.connected = !0),
          (this.authenticated = !0),
          (this.connecting = !1),
          (this.reconnectAttempts = 0),
          (this.connectionEstablishedTime = Date.now()),
          this.startKeepAlive(),
          trackEvent?.("chrome_bridge_connection_succeeded", { duration_ms: i, status: "paired" }),
          this.pushExternalConfigToAllPeers(),
          this.context.onPeerRosterChanged?.());
        break;
      }
      case "waiting": {
        let i = this.connectionStartTime ? Date.now() - this.connectionStartTime : 0;
        (logger.info(`[${serverName}] Waiting for Chrome extension to connect (duration: ${i}ms)`),
          (this.connected = !0),
          (this.authenticated = !0),
          (this.connecting = !1),
          (this.reconnectAttempts = 0),
          (this.connectionEstablishedTime = Date.now()),
          this.startKeepAlive(),
          trackEvent?.("chrome_bridge_connection_succeeded", { duration_ms: i, status: "waiting" }));
        break;
      }
      case "peer_connected":
        if (
          (logger.info(`[${serverName}] Chrome extension connected to bridge`),
          trackEvent?.("chrome_bridge_peer_connected", null),
          !this.selectedDeviceId)
        )
          this.discoveryComplete = !1;
        if (
          this.previousSelectedDeviceId &&
          e.deviceId === this.previousSelectedDeviceId &&
          !this.pendingSwitchResolve
        )
          (logger.info(`[${serverName}] Previously selected extension reconnected, auto-reselecting`),
            this.selectExtension(this.previousSelectedDeviceId),
            (this.previousSelectedDeviceId = void 0));
        if (this.peerConnectedWaiters.length > 0) {
          let peerConnectedWaiters = this.peerConnectedWaiters;
          this.peerConnectedWaiters = [];
          for (let r of peerConnectedWaiters) r(!0);
        }
        if (typeof e.deviceId === "string" && m.test(e.deviceId)) this.pushExternalConfigToPeer(e.deviceId);
        else this.pushExternalConfig();
        this.context.onPeerRosterChanged?.();
        break;
      case "peer_disconnected": {
        let deviceId = e.deviceId;
        if (
          (logger.info(
            `[${serverName}] Chrome extension disconnected from bridge (deviceId=${deviceId ?? "none"}, selected=${this.selectedDeviceId ?? "none"})`,
          ),
          trackEvent?.("chrome_bridge_peer_disconnected", {
            disconnected_device_id: deviceId ?? null,
            selected_device_id: this.selectedDeviceId ?? null,
            had_match: deviceId !== null && deviceId !== void 0 && deviceId === this.selectedDeviceId,
            pending_calls: this.pendingCalls.size,
          }),
          this.context.onPeerDisconnected?.({
            deviceId: deviceId,
            wasSelected: deviceId !== null && deviceId !== void 0 && deviceId === this.selectedDeviceId,
          }),
          e.deviceId && e.deviceId === this.selectedDeviceId)
        )
          (logger.info(`[${serverName}] Selected extension disconnected, clearing selection`),
            (this.previousSelectedDeviceId = this.selectedDeviceId),
            (this.selectedDeviceId = void 0),
            (this.discoveryComplete = !1),
            this.rejectPendingCalls(
              new ExtensionDisconnectedMidCallError("Chrome extension disconnected mid-call"),
            ));
        else if (!this.selectedDeviceId && this.multiBrowserPendingSelection)
          ((this.discoveryComplete = !1), (this.multiBrowserPendingSelection = !1));
        this.context.onPeerRosterChanged?.();
        break;
      }
      case "routing_ack": {
        trackEvent?.("chrome_bridge_routing_ack", {
          tool_use_id: e.tool_use_id ?? null,
          routed_to: e.routed_to ?? null,
          target_connected_at: e.target_connected_at ?? null,
          target_pong_age_ms: e.target_pong_age_ms ?? null,
          extension_sockets: e.extension_sockets ?? null,
          mcp_sockets: e.mcp_sockets ?? null,
        });
        let i = this.pendingCalls.get(e.tool_use_id ?? "");
        if (i) ((i.routingAckReceived = !0), (i.routingAckPongAgeMs = e.target_pong_age_ms ?? null));
        break;
      }
      case "extensions_list":
        if (this.pendingDiscovery)
          (clearTimeout(this.pendingDiscovery.timeout),
            this.pendingDiscovery.resolve(e.extensions ?? []),
            (this.pendingDiscovery = null));
        break;
      case "pairing_response": {
        let request_id = e.request_id;
        if (this.pendingPairingRequestId !== request_id) break;
        if (e.dismissed === !0) {
          (logger.info(`[${serverName}] Pairing prompt dismissed in extension`), this.abortPairingPrompt());
          break;
        }
        let r = typeof e.device_id === "string" && m.test(e.device_id) ? e.device_id : void 0,
          a = cleanDeviceText(e.name, 50);
        if (r && a) {
          if (
            ((this.pendingPairingRequestId = void 0),
            (this.pairingInProgress = !1),
            this.selectExtension(r),
            this.context.onExtensionPaired?.(r, a),
            this.abortPairingPrompt(),
            logger.info(`[${serverName}] Paired with "${a}" (${r.slice(0, 8)})`),
            this.pendingSwitchResolve)
          )
            (this.pendingSwitchResolve({ deviceId: r, name: a }), (this.pendingSwitchResolve = null));
        }
        break;
      }
      case "ping":
        this.ws?.send(JSON.stringify({ type: "pong" }));
        break;
      case "pong":
        this.lastPongReceived = Date.now();
        break;
      case "tool_result":
        this.handleToolResult(e, n);
        break;
      case "external_message_result": {
        let i = typeof e.requestId === "string" ? e.requestId : void 0,
          r = i ? this.pendingExternalMessages.get(i) : void 0;
        if (!i || !r) {
          logger.debug(
            `[${serverName}] external_message_result for unknown request: ${i?.slice(0, 8) ?? "none"}`,
          );
          break;
        }
        if ((clearTimeout(r.timer), this.pendingExternalMessages.delete(i), e.ok === !0))
          r.resolve({ ok: !0, response: e.response });
        else {
          let error = e.error;
          r.resolve({ ok: !1, error: error === "no_target" || error === "timeout" ? error : "send_failed" });
        }
        break;
      }
      case "external_message":
      case "external_config":
        break;
      case "permission_request":
        this.handlePermissionRequest(e).catch((i) => {
          logger.error(`[${serverName}] Error handling permission_request:`, i);
        });
        break;
      case "notification":
        if (typeof e.method !== "string")
          logger.warn(`[${serverName}] Dropped a notification whose method is not a string`);
        else this.notificationHandler?.({ method: e.method, params: e.params });
        break;
      case "error":
        if ((logger.warn(`[${serverName}] Bridge error: ${e.error}`), this.selectedDeviceId))
          this.clearSelectionIfGone(this.selectedDeviceId);
        break;
      default:
        logger.warn(`[${serverName}] Unrecognized bridge message type: ${e.type}`);
    }
  }
  async handlePermissionRequest(e) {
    let { logger: logger, serverName: serverName } = this.context,
      { tool_use_id: tool_use_id, request_id: request_id } = e;
    if (typeof tool_use_id !== "string" || typeof request_id !== "string") {
      logger.warn(`[${serverName}] permission_request missing tool_use_id or request_id`);
      return;
    }
    let i = this.pendingCalls.get(tool_use_id);
    if (!i?.onPermissionRequest) {
      logger.debug(
        `[${serverName}] Ignoring permission_request for unknown tool_use_id ${tool_use_id.slice(0, 8)} (not our call)`,
      );
      return;
    }
    let r = toolCallMeta(e, { toolUseId: tool_use_id, requestId: request_id });
    (clearTimeout(i.timer), (i.permissionPaused = !0));
    try {
      let onPermissionRequest = await i.onPermissionRequest(r);
      this.sendPermissionResponse(request_id, onPermissionRequest);
    } catch (error) {
      (logger.error(`[${serverName}] Error handling permission request:`, error),
        this.sendPermissionResponse(request_id, !1));
    }
    let a = this.pendingCalls.get(tool_use_id);
    if (a) a.timer = this.createTimeoutTimer(tool_use_id, a.timeoutMs);
  }
  sendPermissionResponse(e, n) {
    if (this.ws?.readyState === ws.OPEN) {
      let t = { type: "permission_response", request_id: e, allowed: n };
      if (this.selectedDeviceId) t.target_device_id = this.selectedDeviceId;
      this.ws.send(JSON.stringify(t));
    }
  }
  handleToolResult(e, n) {
    let { logger: logger, serverName: serverName, trackEvent: trackEvent } = this.context,
      tool_use_id = e.tool_use_id;
    if (typeof tool_use_id !== "string") {
      logger.warn(`[${serverName}] Received tool_result without tool_use_id`);
      return;
    }
    let r = this.pendingCalls.get(tool_use_id);
    if (!r) {
      logger.debug(`[${serverName}] Received tool_result for unknown call: ${tool_use_id.slice(0, 8)}`);
      let l = this.timedOutCalls.get(tool_use_id);
      if (
        (trackEvent?.("chrome_bridge_tool_call_late_result", {
          tool_use_id: tool_use_id,
          gap_from_timeout_ms: l ? Date.now() - l : null,
          reason: l ? "post_timeout" : "unknown",
          is_error: typeof e.is_error === "boolean" ? e.is_error : null,
        }),
        l)
      )
        this.timedOutCalls.delete(tool_use_id);
      return;
    }
    let a = Date.now() - r.startTime,
      normalizeBridgeResponse = this.normalizeBridgeResponse(e),
      d = Boolean(e.is_error) || "error" in normalizeBridgeResponse;
    (clearTimeout(r.timer), this.pendingCalls.delete(tool_use_id));
    let h = this.context.browserActivityObserver?.onToolResult;
    if (h)
      try {
        h({
          sessionId: r.sessionId,
          toolName: r.toolName,
          args: r.args,
          ok: !d,
          resultContent: d ? void 0 : normalizeBridgeResponse.result?.content,
        });
      } catch {
        logger.debug(`[${serverName}] browser activity observer threw`);
      }
    if (d) {
      let sliced = firstTextContent(normalizeBridgeResponse.error).slice(0, 200);
      logger.warn(`[${serverName}] Tool call error: ${r.toolName} (${tool_use_id.slice(0, 8)}) after ${a}ms`);
      let g = classifyToolError(r.toolName, sliced);
      if (
        (trackEvent?.("chrome_bridge_tool_call_error", {
          tool_name: `browser:${r.toolName}`,
          tool_use_id: tool_use_id,
          duration_ms: a,
          error_type: g,
          session_id: r.sessionId,
          user_message_uuid: r.userMessageUuid,
          transport: "bridge",
        }),
        !this.selectedDeviceId && !this.pairingInProgress)
      ) {
        ((this.discoveryComplete = !1),
          r.reject(
            new ExtensionDisconnectedMidCallError(
              `[${serverName}] Extension disconnected during tool call: ${r.toolName}`,
            ),
          ));
        return;
      }
    } else
      (logger.debug(
        `[${serverName}] Tool call completed: ${r.toolName} (${tool_use_id.slice(0, 8)}) in ${a}ms`,
      ),
        trackEvent?.("chrome_bridge_tool_call_completed", {
          tool_name: `browser:${r.toolName}`,
          tool_use_id: tool_use_id,
          duration_ms: a,
          session_id: r.sessionId,
          user_message_uuid: r.userMessageUuid,
          transport: "bridge",
          response_bytes: n,
        }));
    r.resolve(normalizeBridgeResponse);
  }
  normalizeBridgeResponse(e) {
    let { notices: notices, ...t } = e,
      s = sanitizeBridgeNotices(notices, (i) =>
        this.context.logger.warn(`[${this.context.serverName}] ${i}`),
      ),
      o = s ? { notices: s } : void 0;
    if (t.result || t.error) return o ? { ...t, ...o } : t;
    if (t.content) {
      if (t.is_error) return { error: { content: t.content }, ...o };
      return { result: { content: t.content }, ...o };
    }
    return o ? { ...t, ...o } : t;
  }
  getTimeoutDiagnostics() {
    let e = -1,
      n = this.lastPongReceived > 0 ? Date.now() - this.lastPongReceived : void 0;
    return { free_mem_pct: e, pong_age_ms: n };
  }
  createTimeoutTimer(e, n) {
    let { logger: logger, serverName: serverName, trackEvent: trackEvent } = this.context;
    return setTimeout(() => {
      let i = this.pendingCalls.get(e);
      if (!i) return;
      if ((this.timedOutCalls.set(e, Date.now()), this.timedOutCalls.size > 200)) {
        let d = this.timedOutCalls.keys().next().value;
        if (d) this.timedOutCalls.delete(d);
      }
      this.pendingCalls.delete(e);
      let r = Date.now() - i.startTime,
        timeoutDiagnostics = this.getTimeoutDiagnostics(),
        c = i.routingAckReceived ?? !1;
      if (
        (logger.warn(
          `[${serverName}] Tool call timeout: ${i.toolName} (${e.slice(0, 8)}) after ${r}ms, pending calls: ${this.pendingCalls.size}`,
        ),
        trackEvent?.("chrome_bridge_tool_call_timeout", {
          tool_name: `browser:${i.toolName}`,
          tool_use_id: e,
          duration_ms: r,
          timeout_ms: n,
          session_id: i.sessionId,
          user_message_uuid: i.userMessageUuid,
          transport: "bridge",
          routing_ack_received: c,
          routing_ack_pong_age_ms: i.routingAckPongAgeMs ?? null,
          permission_paused: i.permissionPaused ?? !1,
          ...timeoutDiagnostics,
        }),
        this.isConnected())
      )
        i.reject(
          new ToolCallTimeoutError(`[${serverName}] Tool call timed out: ${i.toolName}`, {
            routingAckReceived: c,
          }),
        );
      else
        i.reject(
          new SocketConnectionError(
            `[${serverName}] Tool call timed out with bridge disconnected: ${i.toolName}`,
          ),
        );
    }, n);
  }
  scheduleReconnect() {
    let { logger: logger, serverName: serverName, trackEvent: trackEvent } = this.context;
    if (this.reconnectTimer) return;
    if ((this.reconnectAttempts++, this.reconnectAttempts > 100)) {
      (logger.warn(`[${serverName}] Giving up bridge reconnection after 100 attempts`),
        trackEvent?.("chrome_bridge_reconnect_exhausted", { total_attempts: 100 }),
        (this.reconnectAttempts = 0));
      return;
    }
    let min = Math.min(2000 * Math.pow(1.5, this.reconnectAttempts - 1), 30000);
    if (this.reconnectAttempts <= 10 || this.reconnectAttempts % 10 === 0)
      logger.info(
        `[${serverName}] Bridge reconnecting in ${Math.round(min)}ms (attempt ${this.reconnectAttempts})`,
      );
    this.reconnectTimer = setTimeout(() => {
      ((this.reconnectTimer = null), this.connect());
    }, min);
  }
  startKeepAlive() {
    (this.stopKeepAlive(), (this.lastPongReceived = Date.now()));
    let { logger: logger, serverName: serverName } = this.context;
    this.keepAliveInterval = setInterval(() => {
      if (this.ws?.readyState === ws.OPEN) this.ws.send(JSON.stringify({ type: "ping" }));
      if (this.lastPongReceived > 0 && Date.now() - this.lastPongReceived > IDLE_TIMEOUT_MS)
        (logger.warn(`[${serverName}] No pong received in ${IDLE_TIMEOUT_MS}ms, closing dead connection`),
          this.rejectPendingCalls(
            new SocketConnectionError("Bridge keepalive timeout \u2014 connection dead"),
          ),
          this.closeSocket(),
          this.scheduleReconnect());
    }, PING_INTERVAL_MS);
  }
  stopKeepAlive() {
    if (this.keepAliveInterval) (clearInterval(this.keepAliveInterval), (this.keepAliveInterval = null));
    this.lastPongReceived = 0;
  }
  closeSocket() {
    if ((this.stopKeepAlive(), this.handshakeTimer))
      (clearTimeout(this.handshakeTimer), (this.handshakeTimer = null));
    if (this.ws)
      (this.ws.removeAllListeners(), this.ws.on("error", () => {}), this.ws.close(), (this.ws = null));
    if (((this.connected = !1), (this.authenticated = !1), this.selectedDeviceId))
      this.previousSelectedDeviceId = this.selectedDeviceId;
    if (
      ((this.selectedDeviceId = void 0),
      (this.discoveryComplete = !1),
      (this.multiBrowserPendingSelection = !1),
      (this.pendingPairingRequestId = void 0),
      (this.pairingInProgress = !1),
      this.abortPairingPrompt(),
      this.pendingSwitchResolve)
    )
      (this.pendingSwitchResolve(null), (this.pendingSwitchResolve = null));
    if (this.pendingDiscovery)
      (clearTimeout(this.pendingDiscovery.timeout),
        this.pendingDiscovery.resolve([]),
        (this.pendingDiscovery = null));
    if (this.peerConnectedWaiters.length > 0) {
      let peerConnectedWaiters = this.peerConnectedWaiters;
      this.peerConnectedWaiters = [];
      for (let n of peerConnectedWaiters) n(!1);
    }
    this.context.onPeerRosterChanged?.();
  }
  rejectPendingCalls(e) {
    for (let n of this.pendingCalls.values()) (clearTimeout(n.timer), n.reject(e));
    this.pendingCalls.clear();
  }
  drainExternalRelays() {
    for (let e of this.pendingExternalMessages.values())
      (clearTimeout(e.timer), e.resolve({ ok: !1, error: "send_failed" }));
    this.pendingExternalMessages.clear();
  }
  cleanup() {
    if (this.reconnectTimer) (clearTimeout(this.reconnectTimer), (this.reconnectTimer = null));
    (this.rejectPendingCalls(new SocketConnectionError("Bridge client disconnected")),
      this.drainExternalRelays(),
      this.closeSocket(),
      (this.reconnectAttempts = 0));
  }
}
//@ chunk-4dj0g7y4.js:29137-29171 placement
function Vsn(e) {
  return new ChromeBridgeClient(e);
}
//@ chunk-4dj0g7y4.js:29171-29339 placement
var MAX_QUEUED_MESSAGES = 300,
  RECONNECT_BASE_MS = 1000,
  RECONNECT_MAX_MS = 30000,
  MAX_RECONNECT_ATTEMPTS = 10,
  NOT_READY_CADENCE = { steps: [[2000, 30]], thenMs: 1e4 },
  TOKEN_CADENCE = { steps: [[2000, 30]], thenMs: 60000 },
  MISMATCH_CADENCE = { steps: [[3000, 100]], thenMs: 1e4 },
  exponentialBackoff = (e, n, t) => Math.min(e * 1.5 ** (n - 1), t);
//@ chunk-4dj0g7y4.js:29339-29428 placement
function v({ steps: steps, thenMs: thenMs }, t) {
  let s = 0;
  for (let [o, i] of steps) if (((s += i), t <= s)) return o;
  return thenMs;
}
//@ chunk-4dj0g7y4.js:29428-29572 placement
function reconnectDelayMs(e, n) {
  switch (e) {
    case "transport":
      return exponentialBackoff(RECONNECT_BASE_MS, n, RECONNECT_MAX_MS);
    case "mismatch":
      return v(MISMATCH_CADENCE, n);
    case "not_ready":
      return v(NOT_READY_CADENCE, n);
    case "token":
      return v(TOKEN_CADENCE, n);
  }
}
//@ chunk-4dj0g7y4.js:29572-29724 placement
var RETRY_KIND_BY_REASON = {
    peer_not_ready: "not_ready",
    awaits_token: "token",
    peer_may_move: "mismatch",
    retry: "transport",
  },
  newRetryState = (e) => ({ attempts: 0, timer: null, wanted: !1, cadence: e });
//@ chunk-4dj0g7y4.js:29724-29882 placement
function escapeJsonForHtml(e) {
  return e
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
    .replace(/\u0085/g, "\\u0085");
}
/**
 * 生成可用标签页上下文的工具结果。
 */
//@ chunk-4dj0g7y4.js:29882-30202 placement
function tabContextResult(e, n) {
  let t = (i) => escapeJsonForHtml(JSON.stringify(i)),
    joined = e.map((i) => {
      let r = i;
      return `  \u2022 tabId ${r.tabId}: ${t(r.title)} (${t(r.url)})`;
    }).join(`
`),
    o = { availableTabs: e };
  if (n !== void 0) o.tabGroupId = n;
  return {
    result: {
      content: [
        { type: "text", text: escapeJsonForHtml(JSON.stringify(o)) },
        {
          type: "text",
          text: `

Tab Context:
- Available tabs:
${joined}`,
        },
      ],
    },
  };
}
/**
 * 本地 Chrome 扩展连接池（多客户端、标签路由、主动配对、重拨）。
 */
//@ chunk-4dj0g7y4.js:30202-37178 placement
class LocalChromeBridgePool {
  clients = new Map();
  stragglers = new WeakSet();
  tabRoutes = new Map();
  context;
  notificationHandler = null;
  refreshPromise = null;
  generation = 0;
  unwatchSockets = null;
  scanTimer = null;
  dialing = new WeakSet();
  parked = new WeakSet();
  redials = new WeakMap();
  orphaned = new WeakSet();
  constructor(e) {
    this.context = e;
  }
  startProactivePairing() {
    let { localPairing: localPairing, watchSocketPaths: watchSocketPaths } = this.context;
    if (!localPairing || !watchSocketPaths) return;
    if (!this.unwatchSockets) this.unwatchSockets = watchSocketPaths(() => this.scheduleScan());
    ((this.parked = new WeakSet()), this.scheduleScan());
  }
  scheduleScan() {
    if (this.scanTimer) return;
    ((this.scanTimer = setTimeout(() => {
      ((this.scanTimer = null), this.dialAvailable());
    }, MAX_QUEUED_MESSAGES)),
      this.scanTimer.unref?.());
  }
  async dialAvailable() {
    if (!this.unwatchSockets || this.context.isDisabled?.()) return;
    let generation = this.generation;
    if (this.refreshPromise) await this.refreshPromise;
    if ((await this.refreshClients(), generation !== this.generation || !this.unwatchSockets)) return;
    for (let [n, t] of this.clients.entries()) {
      if (t.isConnected()) {
        this.clearRedial(t);
        continue;
      }
      if (this.parked.has(t) || this.dialing.has(t) || this.redials.get(t)?.timer) continue;
      (this.clearRedial(t), this.dial(n, t));
    }
  }
  dial(e, n) {
    this.dialing.add(n);
    let t = this.redials.get(n);
    if (t) t.wanted = !1;
    let s = (o) => {
      if ((this.dialing.delete(n), this.clients.get(e) !== n || this.redials.get(n)?.cadence === "dead"))
        return;
      if (o) {
        this.clearRedial(n);
        return;
      }
      if (this.redials.get(n)?.wanted || n.isConnecting()) {
        this.onRedialWanted(e, n);
        return;
      }
      let lastPairingRefuseCode = n.lastPairingRefuseCode(),
        r =
          lastPairingRefuseCode === void 0
            ? "durable"
            : pairingErrorMessage(lastPairingRefuseCode, n.lastPairingRefusePeerReported());
      if (r === "durable") this.parked.add(n);
      else this.onRedialWanted(e, n, RETRY_KIND_BY_REASON[r]);
    };
    n.ensureConnected().then(s, () => s(!1));
  }
  onRedialWanted(e, n, t = "transport") {
    if (!this.unwatchSockets || this.clients.get(e) !== n) return;
    if (this.orphaned.has(n)) {
      this.removeClient(e, n);
      return;
    }
    let s = this.redials.get(n) ?? newRetryState(t);
    if (((s.wanted = !0), s.cadence !== t)) ((s.attempts = 0), (s.cadence = t));
    if ((this.redials.set(n, s), s.timer)) return;
    if (t === "transport" && s.attempts >= MAX_RECONNECT_ATTEMPTS) {
      this.context.logger.info(
        `[${this.context.serverName}] Giving up on ${e} after ${s.attempts} proactive redials`,
      );
      return;
    }
    s.attempts += 1;
    let o = reconnectDelayMs(t, s.attempts);
    ((s.timer = setTimeout(() => {
      if (
        ((s.timer = null),
        this.unwatchSockets &&
          this.clients.get(e) === n &&
          !this.context.isDisabled?.() &&
          !n.isConnected() &&
          !this.dialing.has(n))
      )
        this.dial(e, n);
    }, o)),
      s.timer.unref?.());
  }
  onSocketDead(e, n) {
    if (!this.unwatchSockets || this.clients.get(e) !== n) return;
    (this.clearRedial(n), this.redials.set(n, newRetryState("dead")), this.refreshClients());
  }
  clearRedial(e) {
    let n = this.redials.get(e);
    if (n?.timer) clearTimeout(n.timer);
    this.redials.delete(e);
  }
  removeClient(e, n) {
    (this.context.logger.info(`[${this.context.serverName}] Removing stale socket from pool: ${e}`),
      this.clearRedial(n),
      this.orphaned.delete(n),
      n.disconnect(),
      this.clients.delete(e));
    for (let [t, s] of this.tabRoutes.entries()) if (s === e) this.tabRoutes.delete(t);
  }
  setNotificationHandler(e) {
    this.notificationHandler = e;
    for (let n of this.clients.values()) n.setNotificationHandler(e);
  }
  async ensureConnected() {
    let { logger: logger, serverName: serverName } = this.context;
    await this.refreshClients();
    let t = [],
      s = [];
    for (let i of this.clients.values()) {
      if (i.isConnected()) {
        this.stragglers.delete(i);
        continue;
      }
      let r = this.stragglers.has(i),
        a = i.ensureConnected().then(
          (c) => {
            if (c) this.stragglers.delete(i);
            else this.stragglers.add(i);
            return c;
          },
          () => (this.stragglers.add(i), !1),
        );
      (r ? s : t).push(a);
    }
    if ((await Promise.all(t), this.getConnectedClients().length === 0)) await Promise.all(s);
    let o = this.getConnectedClients().length;
    if (o === 0) return (logger.info(`[${serverName}] No connected sockets in pool`), !1);
    return (logger.info(`[${serverName}] Socket pool: ${o} connected`), !0);
  }
  async callTool(e, n, t) {
    if (e === "tabs_context_mcp") return this.callTabsContext(n, t);
    let tabId = n.tabId;
    if (tabId !== void 0) {
      let i = this.tabRoutes.get(tabId);
      if (i) {
        let r = this.clients.get(i);
        if (r?.isConnected()) return r.callTool(e, n, t);
      }
    }
    let connectedClients = this.getConnectedClients();
    if (connectedClients.length === 0)
      throw new SocketConnectionError(`[${this.context.serverName}] No connected sockets available`);
    return connectedClients[0].callTool(e, n, t);
  }
  isConnected() {
    return this.getConnectedClients().length > 0;
  }
  disconnect() {
    if (
      ((this.generation += 1),
      (this.refreshPromise = null),
      this.unwatchSockets?.(),
      (this.unwatchSockets = null),
      this.scanTimer)
    )
      (clearTimeout(this.scanTimer), (this.scanTimer = null));
    for (let e of this.clients.values()) (this.clearRedial(e), e.disconnect());
    (this.clients.clear(), this.tabRoutes.clear());
  }
  getConnectedClients() {
    return [...this.clients.values()].filter((e) => e.isConnected());
  }
  async callTabsContext(e, n) {
    let { logger: logger, serverName: serverName } = this.context,
      connectedClients = this.getConnectedClients();
    if (connectedClients.length === 0)
      throw new SocketConnectionError(`[${serverName}] No connected sockets available`);
    if (connectedClients.length === 1) {
      let callTool = await connectedClients[0].callTool("tabs_context_mcp", e, n);
      return (this.updateTabRoutes(callTool, this.getSocketPathForClient(connectedClients[0])), callTool);
    }
    let settled = await Promise.allSettled(
        connectedClients.map(async (c) => {
          let callTool = await c.callTool("tabs_context_mcp", e, n),
            socketPathForClient = this.getSocketPathForClient(c);
          return { result: callTool, socketPath: socketPathForClient };
        }),
      ),
      r = [],
      a;
    this.tabRoutes.clear();
    for (let c of settled) {
      if (c.status !== "fulfilled") {
        logger.info(`[${serverName}] tabs_context_mcp failed on one socket: ${c.reason}`);
        continue;
      }
      let { result: d, socketPath: socketPath } = c.value;
      this.updateTabRoutes(d, socketPath);
      let extractTabs = this.extractTabs(d);
      if (extractTabs) for (let g of extractTabs) r.push(g);
      if (a === void 0) a = this.extractTabGroupId(d);
    }
    if (r.length > 0) return tabContextResult(r, a);
    for (let c of settled) if (c.status === "fulfilled") return c.value.result;
    throw new SocketConnectionError(`[${serverName}] All sockets failed for tabs_context_mcp`);
  }
  updateTabRoutes(e, n) {
    let extractTabs = this.extractTabs(e);
    if (!extractTabs) return;
    for (let s of extractTabs)
      if (typeof s === "object" && s !== null && "tabId" in s) {
        let tabId = s.tabId;
        this.tabRoutes.set(tabId, n);
      }
  }
  extractTabs(e) {
    if (!e || typeof e !== "object") return null;
    let t = e.result?.content;
    if (!t || !Array.isArray(t)) return null;
    for (let s of t)
      if (s.type === "text" && s.text)
        try {
          let parsed = JSON.parse(s.text);
          if (Array.isArray(parsed)) return parsed;
          let i = parsed;
          if (i && Array.isArray(i.availableTabs)) return i.availableTabs;
        } catch {}
    return null;
  }
  extractTabGroupId(e) {
    if (!e || typeof e !== "object") return;
    let t = e.result?.content;
    if (!t || !Array.isArray(t)) return;
    for (let s of t)
      if (s.type === "text" && s.text)
        try {
          let parsed = JSON.parse(s.text);
          if (typeof parsed.tabGroupId === "number") return parsed.tabGroupId;
        } catch {}
    return;
  }
  getSocketPathForClient(e) {
    for (let [n, t] of this.clients.entries()) if (t === e) return n;
    return "";
  }
  refreshClients() {
    if (!this.refreshPromise) {
      let e = this.doRefreshClients().finally(() => {
        if (this.refreshPromise === e) this.refreshPromise = null;
      });
      this.refreshPromise = e;
    }
    return this.refreshPromise;
  }
  async doRefreshClients() {
    let { logger: logger, serverName: serverName } = this.context,
      generation = this.generation,
      s;
    try {
      s = (await this.context.getSocketPaths?.()) ?? [];
    } catch (error) {
      logger.info(`[${serverName}] Socket scan failed:`, error);
      return;
    }
    if (generation !== this.generation) return;
    for (let o of s)
      if (!this.clients.has(o)) {
        logger.info(`[${serverName}] Adding socket to pool: ${o}`);
        let i = { ...this.context, socketPath: o, getSocketPath: void 0, getSocketPaths: void 0 },
          r = createChromeSocketClient(i);
        if (
          ((r.disableAutoReconnect = !0),
          (r.onRedialWanted = (a) =>
            a === "dead"
              ? this.onSocketDead(o, r)
              : this.onRedialWanted(o, r, a === "peer_dropped" ? "not_ready" : "transport")),
          this.notificationHandler)
        )
          r.setNotificationHandler(this.notificationHandler);
        this.clients.set(o, r);
      }
    for (let [o, i] of this.clients.entries())
      if (s.includes(o)) this.orphaned.delete(i);
      else if (i.isConnected()) this.orphaned.add(i);
      else this.removeClient(o, i);
  }
}
//@ chunk-4dj0g7y4.js:37178-37210 placement
function CGn(e) {
  return new LocalChromeBridgePool(e);
}

export { Vsn, CGn };

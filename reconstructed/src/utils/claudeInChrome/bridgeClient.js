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
import {
  BROWSER_TOOL_TIMEOUT_MS,
  BROWSER_LONG_TIMEOUT_MS,
  BROWSER_MAX_TIMEOUT_MS,
  BROWSER_SELECT_TIMEOUT_MS,
  BROWSER_REGISTER_TIMEOUT_MS,
} from "./browserToolSchemas.js";
import {
  safeCallPromise,
  pickBrowserDevice,
  firstTextContent,
  classifyToolError,
} from "./toolErrorClassification.js";

//@ chunk-4dj0g7y4.js:345-374 placement
/**
 * 设备 id 的合法形式（字母数字与短横，1 到 64 个字符）。
 */
var DEVICE_ID_RE = /^[A-Za-z0-9-]{1,64}$/;
//@ chunk-4dj0g7y4.js:374-456 placement
/**
 * 平台名转成展示名（darwin→macOS、win32→Windows、其余 Linux）。
 */
function platformDisplayName(e = "linux") {
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
var PING_INTERVAL_MS = 30000;
var IDLE_TIMEOUT_MS = 90000;
var SELECTION_REASON_WORDS = {
  persisted: "the last-picked",
  only: "the only connected",
  local: "this computer's",
};
var DISCOVERY_TIMEOUT_MS = 30000;
var EXTERNAL_MESSAGE_TYPES = new Set(["external_message", "external_message_result", "external_config"]);
var RESPONSE_TIMEOUT_MS = 30000;
//@ chunk-4dj0g7y4.js:870-1013 placement
function cleanDeviceText(e, n) {
  if (typeof e !== "string") return;
  let trimmed = e.replace(/[\r\n\t\u0000-\u001f]/g, " ").trim();
  return trimmed.length > n ? `${trimmed.slice(0, n)}\u2026` : trimmed;
}
//@ chunk-4dj0g7y4.js:1013-1223 placement
function parseConnectedExtension(e) {
  if (typeof e.deviceId !== "string" || !DEVICE_ID_RE.test(e.deviceId)) return;
  return {
    deviceId: e.deviceId,
    name: cleanDeviceText(e.name, 50),
    osPlatform: cleanDeviceText(e.osPlatform, 30),
    connectedAt: typeof e.connectedAt === "number" ? e.connectedAt : 0,
  };
}
//@ chunk-4dj0g7y4.js:1223-1231 placement
/**
 * 桥接通知清洗后保留的条数上限（4）。
 */
var MAX_BRIDGE_NOTICES = 4;
//@ chunk-4dj0g7y4.js:1231-1850 placement
/**
 * 清洗桥接通知列表（种类、域名，有上限）。
 */
function sanitizeBridgeNotices(notices, n) {
  if (!Array.isArray(notices)) return;
  let t = new Map();
  let s = (o, i) => {
    if (t.has(o)) {
      t.set(o, i);
      return;
    }
    if (t.size >= MAX_BRIDGE_NOTICES) {
      n?.(`sanitizeBridgeNotices: notice cap (${MAX_BRIDGE_NOTICES}) reached; dropping entry`);
      return;
    }
    t.set(o, i);
  };
  for (let o of notices) {
    if (typeof o !== "object" || o === null) continue;
    let { kind, domain } = o;
    if (typeof kind !== "string" || !/^[a-z0-9_]{1,64}$/i.test(kind)) continue;
    let lower = kind.toLowerCase();
    if (domain === undefined)
      s(`${lower}:`, {
        kind: lower,
      });
    else if (typeof domain === "string" && domain.length <= 253 && /^[a-z0-9.-]+$/i.test(domain)) {
      let replaced = domain.toLowerCase().replace(/\.$/, "");
      if (replaced.length === 0) continue;
      s(`${lower}:${replaced}`, {
        kind: lower,
        domain: replaced,
      });
    }
  }
  return t.size > 0 ? Array.from(t.values()) : undefined;
}
//@ chunk-4dj0g7y4.js:1850-29137 placement
/**
 * Claude in Chrome 桥接 WebSocket 客户端：连接、认证、设备发现、工具调用、重连。
 */
class ChromeBridgeClient {
  ws = null;
  connected = false;
  authenticated = false;
  connecting = false;
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
  discoveryComplete = false;
  multiBrowserPendingSelection = false;
  discoveryPromise = null;
  pendingDiscovery = null;
  listExtensionsPromise = null;
  previousSelectedDeviceId;
  peerConnectedWaiters = [];
  pendingPairingRequestId;
  pairingInProgress = false;
  persistedDeviceId;
  pendingSwitchResolve = null;
  pairingPromptAbort = null;
  pairingPromptTimeout = null;
  keepAliveInterval = null;
  lastPongReceived = 0;
  pendingExternalMessages = new Map();
  constructor(e) {
    this.context = e;
    if (e.initialPermissionMode) this.permissionMode = e.initialPermissionMode;
  }
  async ensureConnected() {
    let { logger, serverName } = this.context;
    logger.info(
      `[${serverName}] ensureConnected called, connected=${this.connected}, authenticated=${this.authenticated}, wsState=${this.ws?.readyState}`,
    );
    if (this.connected && this.authenticated && this.ws?.readyState === ws.OPEN) {
      logger.info(`[${serverName}] Already connected and authenticated`);
      return true;
    }
    if (!this.connecting && !this.reconnectTimer) {
      logger.info(`[${serverName}] Not connecting, starting connection...`);
      await this.connect();
    } else logger.info(`[${serverName}] Connect in progress or reconnect scheduled, waiting...`);
    return new Promise((resolve) => {
      let s = null;
      let timer = setTimeout(() => {
        if (s) clearTimeout(s);
        logger.info(
          `[${serverName}] Connection timeout, connected=${this.connected}, authenticated=${this.authenticated}`,
        );
        resolve(false);
      }, 1e4);
      let i = () => {
        if (this.connected && this.authenticated) {
          logger.info(`[${serverName}] Connection successful`);
          clearTimeout(timer);
          resolve(true);
        } else if (!this.connecting && !this.reconnectTimer) {
          logger.info(`[${serverName}] No longer connecting, giving up`);
          clearTimeout(timer);
          resolve(false);
        } else s = setTimeout(i, 200);
      };
      i();
    });
  }
  async callTool(e, args, t) {
    let { logger, serverName, trackEvent } = this.context;
    if (!this.ws || this.ws.readyState !== ws.OPEN)
      throw new SocketConnectionError(`[${serverName}] Bridge not connected`);
    if (!this.selectedDeviceId && (!this.discoveryComplete || this.multiBrowserPendingSelection)) {
      this.discoveryPromise ??= this.discoverAndSelectExtension().finally(() => {
        this.discoveryPromise = null;
      });
      await this.discoveryPromise;
    }
    if (
      this.discoveryComplete &&
      !this.selectedDeviceId &&
      !this.pairingInProgress &&
      !this.multiBrowserPendingSelection
    )
      throw new NoExtensionConnectedError(`[${serverName}] No Chrome extension connected after discovery`);
    let sessionId = t?.sessionScope?.sessionId;
    let userMessageUuid = t?.sessionScope?.userMessageUuid;
    let onBeforeToolCall = this.context.browserActivityObserver?.onBeforeToolCall;
    if (onBeforeToolCall) {
      let selectedDeviceId = this.selectedDeviceId;
      try {
        await onBeforeToolCall({
          sessionId,
          toolName: e,
          args,
        });
      } catch {
        logger.debug(`[${serverName}] browser activity observer threw`);
      }
      if (!this.ws || this.ws.readyState !== ws.OPEN)
        throw new SocketConnectionError(`[${serverName}] Bridge disconnected before tool call was sent`);
      if (selectedDeviceId !== undefined && this.selectedDeviceId === undefined)
        throw new ExtensionDisconnectedMidCallError("Chrome extension disconnected mid-call");
    }
    let d = crypto.randomUUID();
    let startTime = Date.now();
    let l = this.context.getToolCallTimeoutMs?.(e) ?? BROWSER_TOOL_TIMEOUT_MS;
    let g = {
      type: "tool_call",
      tool_use_id: d,
      client_type: this.context.clientTypeId,
      tool: e,
      args,
      supports_tool_result_notices: true,
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
    trackEvent?.("chrome_bridge_tool_call_started", {
      tool_name: `browser:${e}`,
      tool_use_id: d,
      session_id: sessionId,
      user_message_uuid: userMessageUuid,
      timeout_ms: l,
      transport: "bridge",
      request_bytes: Buffer.byteLength(json, "utf-8"),
    });
    return new Promise((resolve, reject) => {
      let timer = this.createTimeoutTimer(d, l);
      this.pendingCalls.set(d, {
        resolve,
        reject,
        timer,
        onPermissionRequest: t?.onPermissionRequest,
        startTime,
        toolName: e,
        timeoutMs: l,
        sessionId,
        userMessageUuid,
        args,
      });
      logger.debug(`[${serverName}] Sending tool_call: ${quoteTruncated(e)} (${d.slice(0, 8)})`);
      this.ws.send(json);
    });
  }
  sendExternalMessage(e, payload, t) {
    let { logger, serverName } = this.context;
    if (!this.ws || this.ws.readyState !== ws.OPEN)
      return Promise.reject(new SocketConnectionError(`[${serverName}] Bridge not connected`));
    if (!this.selectedDeviceId) {
      logger.info(`[${serverName}] external_message refused: no extension selected`);
      return Promise.resolve({
        ok: false,
        error: "no_target",
      });
    }
    this.pushExternalConfig();
    let i = crypto.randomUUID();
    let timeoutMs = t?.timeoutMs;
    let min = Math.min(
      typeof timeoutMs === "number" && Number.isFinite(timeoutMs) && timeoutMs > 0
        ? timeoutMs
        : BROWSER_LONG_TIMEOUT_MS,
      BROWSER_MAX_TIMEOUT_MS,
    );
    let c = {
      type: "external_message",
      requestId: i,
      extensionIds: [...e],
      payload,
      timeoutMs: min,
      target_device_id: this.selectedDeviceId,
    };
    return new Promise((resolve) => {
      let timer = setTimeout(() => {
        if (this.pendingExternalMessages.delete(i)) {
          logger.warn(`[${serverName}] external_message timed out locally (${i.slice(0, 8)})`);
          resolve({
            ok: false,
            error: "timeout",
          });
        }
      }, min + DISCOVERY_TIMEOUT_MS);
      this.pendingExternalMessages.set(i, {
        resolve,
        timer,
      });
      logger.debug(`[${serverName}] Sending external_message (${i.slice(0, 8)})`);
      try {
        this.ws.send(JSON.stringify(c));
      } catch (error) {
        clearTimeout(timer);
        this.pendingExternalMessages.delete(i);
        logger.warn(
          `[${serverName}] external_message serialization/send failed: ${error instanceof Error ? error.message : String(error)}`,
        );
        resolve({
          ok: false,
          error: "send_failed",
        });
      }
    });
  }
  pushExternalConfig(e) {
    if (this.selectedDeviceId === undefined) return false;
    return this.pushExternalConfigToPeer(this.selectedDeviceId, e);
  }
  pushExternalConfigToPeer(targetDeviceId, n) {
    if (this.ws?.readyState !== ws.OPEN) return false;
    let t = n;
    if (!t) {
      if (!this.context.getExternalRelayConfig) return false;
      t = this.context.getExternalRelayConfig() ?? {
        extensionIds: [],
      };
    }
    this.ws.send(
      JSON.stringify({
        type: "external_config",
        extensionIds: t.extensionIds,
        ...(t.hooks !== undefined && {
          hooks: t.hooks,
        }),
        target_device_id: targetDeviceId,
      }),
    );
    return true;
  }
  async pushExternalConfigToAllPeers(e) {
    if (this.ws?.readyState !== ws.OPEN) return 0;
    if (!e && !this.context.getExternalRelayConfig) return 0;
    let n = await this.queryBridgeExtensions();
    let t = 0;
    for (let s of n) if (this.pushExternalConfigToPeer(s.deviceId, e)) t++;
    return t;
  }
  isConnected() {
    return this.connected && this.authenticated && this.ws?.readyState === ws.OPEN;
  }
  disconnect() {
    this.cleanup();
  }
  setNotificationHandler(notificationHandler) {
    this.notificationHandler = notificationHandler;
  }
  async discoverAndSelectExtension() {
    let { logger, serverName } = this.context;
    this.persistedDeviceId = this.context.getPersistedDeviceId?.();
    let t = await this.queryBridgeExtensions();
    if (t.length === 0) {
      logger.info(
        `[${serverName}] No extensions connected, waiting up to ${BROWSER_SELECT_TIMEOUT_MS}ms for peer_connected`,
      );
      if (await this.waitForPeerConnected(BROWSER_SELECT_TIMEOUT_MS)) t = await this.queryBridgeExtensions();
    }
    if (this.context.getRequirePairedDevice?.()) {
      if (!this.persistedDeviceId) {
        logger.info(
          `[${serverName}] requirePairedDevice set but no persistedDeviceId; refusing to auto-select`,
        );
        this.discoveryComplete = true;
        return;
      }
      let persistedDeviceId = this.persistedDeviceId;
      let found = t.find((a) => a.deviceId === persistedDeviceId);
      if (!found) {
        logger.info(
          `[${serverName}] requirePairedDevice: persisted ${persistedDeviceId.slice(0, 8)} not connected (${t.length} other(s) visible); waiting`,
        );
        if (await this.waitForPeerConnected(BROWSER_SELECT_TIMEOUT_MS)) {
          t = await this.queryBridgeExtensions();
          found = t.find((a) => a.deviceId === persistedDeviceId);
        }
      }
      this.discoveryComplete = true;
      if (found) this.selectExtension(found.deviceId);
      else
        logger.info(
          `[${serverName}] requirePairedDevice: persisted device never arrived; refusing to auto-select`,
        );
      return;
    }
    let s =
      t.length > 1 && !t.some((i) => i.deviceId === this.persistedDeviceId)
        ? await safeCallPromise(this.context.getLocalDeviceIds)
        : undefined;
    this.discoveryComplete = true;
    if (this.selectedDeviceId) return;
    let o = pickBrowserDevice(t, this.persistedDeviceId, s);
    if (o.kind === "none") {
      logger.info(`[${serverName}] No extensions found after waiting`);
      this.multiBrowserPendingSelection = false;
      return;
    }
    if (o.kind === "select") {
      let { extension, reason } = o;
      logger.info(
        `[${serverName}] Auto-connecting to ${SELECTION_REASON_WORDS[reason]} extension: ${extension.name || extension.deviceId.slice(0, 8)}`,
      );
      if (reason === "only" && !this.isLocalExtension(extension))
        this.context.onRemoteExtensionWarning?.(extension);
      this.selectExtension(extension.deviceId);
      this.reportBrowserSelected(reason, t, s);
      return;
    }
    if (!this.multiBrowserPendingSelection) this.reportBrowserSelected("ask", t, s);
    if (this.context.askUserToolName) {
      this.multiBrowserPendingSelection = true;
      return;
    }
    this.broadcastPairingRequest();
    this.pairingInProgress = true;
    this.firePairingPrompt();
  }
  reportBrowserSelected(outcome, n, t) {
    this.context.trackEvent?.("chrome_bridge_browser_selected", {
      outcome,
      connected_count: n.length,
      local_count: t === undefined ? null : n.filter((s) => t.has(s.deviceId)).length,
    });
  }
  queryBridgeExtensions() {
    if (this.listExtensionsPromise) return this.listExtensionsPromise;
    let e = new Promise((resolve) => {
      let timeout = setTimeout(() => {
        this.pendingDiscovery = null;
        resolve([]);
      }, BROWSER_REGISTER_TIMEOUT_MS);
      this.pendingDiscovery = {
        resolve,
        timeout,
      };
      this.ws?.send(
        JSON.stringify({
          type: "list_extensions",
        }),
      );
    }).then((n) => {
      let t = new Map();
      for (let s of n) {
        let o = t.get(s.deviceId);
        if (!o || s.connectedAt > o.connectedAt) t.set(s.deviceId, s);
      }
      return [...t.values()].map(parseConnectedExtension).filter((s) => s !== undefined);
    });
    this.listExtensionsPromise = e;
    e.finally(() => {
      if (this.listExtensionsPromise === e) this.listExtensionsPromise = null;
    });
    return e;
  }
  getSelectedDeviceId() {
    return this.selectedDeviceId ?? this.context.getPersistedDeviceId?.();
  }
  hasActiveSelection() {
    return this.selectedDeviceId !== undefined;
  }
  clearSelection() {
    this.selectedDeviceId = undefined;
    this.previousSelectedDeviceId = undefined;
    this.discoveryComplete = false;
    this.multiBrowserPendingSelection = false;
    this.pairingInProgress = false;
    this.abortPairingPrompt();
  }
  selectExtension(e) {
    let { logger, serverName } = this.context;
    this.selectedDeviceId = e;
    this.previousSelectedDeviceId = undefined;
    this.multiBrowserPendingSelection = false;
    logger.info(`[${serverName}] Selected Chrome extension: ${e.slice(0, 8)}...`);
    this.pushExternalConfig();
  }
  async clearSelectionIfGone(e) {
    let { logger, serverName } = this.context;
    let s = await this.queryBridgeExtensions();
    if (this.selectedDeviceId !== e) return;
    if (s.some((o) => o.deviceId === e)) return;
    logger.info(
      `[${serverName}] Selected extension ${e.slice(0, 8)} absent from bridge roster after error; clearing selection`,
    );
    this.selectedDeviceId = undefined;
    this.discoveryComplete = false;
  }
  async listConnectedExtensions() {
    if (!(await this.ensureConnected())) return [];
    let e = await this.queryBridgeExtensions();
    let n = e.length > 1 ? await safeCallPromise(this.context.getLocalDeviceIds) : undefined;
    return e.map((t) => ({
      ...t,
      isLocal: this.isLocalExtension(t),
      ...(n?.has(t.deviceId) && {
        onThisComputer: true,
      }),
    }));
  }
  selectExtensionById(e, n) {
    this.discoveryComplete = true;
    this.pairingInProgress = false;
    this.pendingPairingRequestId = undefined;
    this.selectExtension(e);
    this.context.onExtensionPaired?.(e, n);
    if (this.pendingSwitchResolve)
      this.pendingSwitchResolve({
        deviceId: e,
        name: n,
      });
    this.abortPairingPrompt();
  }
  firePairingPrompt() {
    this.abortPairingPrompt();
    if (!this.context.onPairingPrompted) return;
    let abortController = new AbortController();
    this.pairingPromptAbort = abortController;
    this.pairingPromptTimeout = setTimeout(() => this.abortPairingPrompt(), 120000);
    this.context.onPairingPrompted(abortController.signal);
  }
  abortPairingPrompt() {
    if (this.pairingPromptTimeout) {
      clearTimeout(this.pairingPromptTimeout);
      this.pairingPromptTimeout = null;
    }
    if (this.pairingPromptAbort) {
      this.pairingPromptAbort.abort();
      this.pairingPromptAbort = null;
    }
  }
  isLocalExtension(e) {
    if (!e.osPlatform) return false;
    return e.osPlatform === platformDisplayName(this.context.getHostPlatform?.() ?? "linux");
  }
  waitForPeerConnected(e) {
    return new Promise((resolve) => {
      let timer = setTimeout(() => {
        this.peerConnectedWaiters = this.peerConnectedWaiters.filter(
          (peerConnectedWaiter) => peerConnectedWaiter !== s,
        );
        resolve(false);
      }, e);
      let s = (o) => {
        clearTimeout(timer);
        resolve(o);
      };
      this.peerConnectedWaiters.push(s);
    });
  }
  broadcastPairingRequest() {
    let e = crypto.randomUUID();
    this.pendingPairingRequestId = e;
    this.ws?.send(
      JSON.stringify({
        type: "pairing_request",
        request_id: e,
        client_type: this.context.clientTypeId,
      }),
    );
  }
  async switchBrowser() {
    let e = await this.queryBridgeExtensions();
    let n = this.selectedDeviceId ?? this.previousSelectedDeviceId;
    if (e.length === 0 || (e.length === 1 && (!n || e[0].deviceId === n))) return "no_other_browsers";
    this.previousSelectedDeviceId = this.selectedDeviceId;
    this.selectedDeviceId = undefined;
    this.discoveryComplete = false;
    this.pairingInProgress = false;
    let t = crypto.randomUUID();
    this.pendingPairingRequestId = t;
    if (this.ws?.readyState !== ws.OPEN) return null;
    this.ws.send(
      JSON.stringify({
        type: "pairing_request",
        request_id: t,
        client_type: this.context.clientTypeId,
      }),
    );
    this.firePairingPrompt();
    if (this.pendingSwitchResolve) this.pendingSwitchResolve(null);
    return new Promise((resolve) => {
      let timer = setTimeout(() => {
        if (this.pendingPairingRequestId === t) this.pendingPairingRequestId = undefined;
        this.pendingSwitchResolve = null;
        this.abortPairingPrompt();
        resolve(null);
      }, 120000);
      this.pendingSwitchResolve = (i) => {
        clearTimeout(timer);
        this.pendingSwitchResolve = null;
        resolve(i);
      };
    });
  }
  async connect() {
    let { logger, serverName, bridgeConfig, trackEvent } = this.context;
    if (!bridgeConfig) {
      logger.error(`[${serverName}] No bridge config provided`);
      return;
    }
    if (this.connecting) return;
    this.connecting = true;
    this.authenticated = false;
    this.connectionStartTime = Date.now();
    this.closeSocket();
    this.handshakeTimer = setTimeout(() => {
      this.handshakeTimer = null;
      if (!this.connecting) return;
      let readyState = this.ws?.readyState;
      logger.warn(
        `[${serverName}] Bridge connect stuck after ${RESPONSE_TIMEOUT_MS}ms (ws_state=${readyState})`,
      );
      trackEvent?.("chrome_bridge_handshake_timeout", {
        duration_ms: Date.now() - (this.connectionStartTime ?? 0),
        ws_state: readyState,
      });
      if (readyState === undefined) return;
      this.connecting = false;
      this.closeSocket();
      this.scheduleReconnect();
    }, RESPONSE_TIMEOUT_MS);
    let o;
    let i;
    if (bridgeConfig.devUserId) {
      o = bridgeConfig.devUserId;
      logger.debug(`[${serverName}] Using dev user ID for bridge connection`);
    } else {
      logger.debug(`[${serverName}] Fetching user ID for bridge connection`);
      let errorDetail;
      let c;
      if (bridgeConfig.getUserIdResult) {
        let userIdResult = await bridgeConfig.getUserIdResult();
        if (userIdResult.ok) c = userIdResult.userId;
        else errorDetail = userIdResult.error;
      } else c = await bridgeConfig.getUserId();
      if (!c) {
        let d = Date.now() - this.connectionStartTime;
        logger.error(`[${serverName}] No user ID available after ${d}ms`);
        trackEvent?.("chrome_bridge_connection_failed", {
          duration_ms: d,
          error_type: "no_user_id",
          error_detail: errorDetail,
          reconnect_attempt: this.reconnectAttempts,
        });
        this.connecting = false;
        this.scheduleReconnect();
        return;
      }
      o = c;
      logger.debug(`[${serverName}] Fetching OAuth token for bridge connection`);
      i = await bridgeConfig.getOAuthToken();
      if (!i) {
        let d = Date.now() - this.connectionStartTime;
        logger.error(`[${serverName}] No OAuth token available after ${d}ms`);
        trackEvent?.("chrome_bridge_connection_failed", {
          duration_ms: d,
          error_type: "no_oauth_token",
          reconnect_attempt: this.reconnectAttempts,
        });
        this.connecting = false;
        this.scheduleReconnect();
        return;
      }
    }
    let r = `${bridgeConfig.url}/chrome/${o}`;
    logger.info(`[${serverName}] Connecting to bridge: ${r}`);
    trackEvent?.("chrome_bridge_connection_started", {
      bridge_url: r,
    });
    try {
      if (bridgeConfig.createWebSocket) this.ws = await bridgeConfig.createWebSocket(r);
      else {
        let a = (await bridgeConfig.getWsOptions?.()) ?? bridgeConfig.wsOptions;
        this.ws = wrapWebSocket(
          new ws(
            r,
            a
              ? {
                  ...a,
                  tls: a,
                }
              : undefined,
          ),
        );
      }
    } catch (error) {
      let c = Date.now() - this.connectionStartTime;
      logger.error(`[${serverName}] Failed to create WebSocket after ${c}ms:`, error);
      trackEvent?.("chrome_bridge_connection_failed", {
        duration_ms: c,
        error_type: "websocket_error",
        error_code: error?.code,
        reconnect_attempt: this.reconnectAttempts,
      });
      this.connecting = false;
      this.scheduleReconnect();
      return;
    }
    this.ws.on("open", () => {
      logger.info(`[${serverName}] WebSocket connected, sending connect message`);
      let a = {
        type: "connect",
        client_type: this.context.clientTypeId,
      };
      if (bridgeConfig.devUserId) a.dev_user_id = bridgeConfig.devUserId;
      else a.oauth_token = i;
      this.ws?.send(JSON.stringify(a));
    });
    this.ws.on("message", (a) => {
      try {
        let str = a.toString();
        let parsed = JSON.parse(str);
        if (EXTERNAL_MESSAGE_TYPES.has(parsed.type))
          logger.debug(`[${serverName}] Bridge received: ${String(parsed.type)} (ok=${String(parsed.ok)})`);
        else if (logger.isDebugEnabled?.() ?? true)
          logger.debug(`[${serverName}] Bridge received: ${JSON.stringify(parsed)}`);
        this.handleMessage(parsed, Buffer.byteLength(str, "utf-8"));
      } catch (error) {
        logger.error(`[${serverName}] Failed to parse bridge message:`, error);
      }
    });
    this.ws.on("close", (a) => {
      let c = this.connectionEstablishedTime ? Date.now() - this.connectionEstablishedTime : 0;
      logger.info(`[${serverName}] Bridge connection closed (code: ${a}, duration: ${c}ms)`);
      trackEvent?.("chrome_bridge_disconnected", {
        close_code: a,
        duration_since_connect_ms: c,
        reconnect_attempt: this.reconnectAttempts + 1,
      });
      this.connected = false;
      this.authenticated = false;
      this.connecting = false;
      this.connectionEstablishedTime = null;
      this.rejectPendingCalls(new SocketConnectionError("Bridge connection closed mid-call"));
      this.scheduleReconnect();
    });
    this.ws.on("error", (a) => {
      let c = this.connectionStartTime ? Date.now() - this.connectionStartTime : 0;
      logger.error(`[${serverName}] Bridge WebSocket error after ${c}ms: ${a.message}`);
      trackEvent?.("chrome_bridge_connection_failed", {
        duration_ms: c,
        error_type: "websocket_error",
        error_code: a.code,
        reconnect_attempt: this.reconnectAttempts,
      });
      this.connected = false;
      this.authenticated = false;
      this.connecting = false;
      this.rejectPendingCalls(new SocketConnectionError(`Bridge connection error: ${a.message}`));
    });
  }
  handleMessage(e, n) {
    let { logger, serverName, trackEvent } = this.context;
    switch (e.type) {
      case "paired": {
        let i = this.connectionStartTime ? Date.now() - this.connectionStartTime : 0;
        logger.info(`[${serverName}] Paired with Chrome extension (duration: ${i}ms)`);
        this.connected = true;
        this.authenticated = true;
        this.connecting = false;
        this.reconnectAttempts = 0;
        this.connectionEstablishedTime = Date.now();
        this.startKeepAlive();
        trackEvent?.("chrome_bridge_connection_succeeded", {
          duration_ms: i,
          status: "paired",
        });
        this.pushExternalConfigToAllPeers();
        this.context.onPeerRosterChanged?.();
        break;
      }
      case "waiting": {
        let i = this.connectionStartTime ? Date.now() - this.connectionStartTime : 0;
        logger.info(`[${serverName}] Waiting for Chrome extension to connect (duration: ${i}ms)`);
        this.connected = true;
        this.authenticated = true;
        this.connecting = false;
        this.reconnectAttempts = 0;
        this.connectionEstablishedTime = Date.now();
        this.startKeepAlive();
        trackEvent?.("chrome_bridge_connection_succeeded", {
          duration_ms: i,
          status: "waiting",
        });
        break;
      }
      case "peer_connected":
        logger.info(`[${serverName}] Chrome extension connected to bridge`);
        trackEvent?.("chrome_bridge_peer_connected", null);
        if (!this.selectedDeviceId) this.discoveryComplete = false;
        if (
          this.previousSelectedDeviceId &&
          e.deviceId === this.previousSelectedDeviceId &&
          !this.pendingSwitchResolve
        ) {
          logger.info(`[${serverName}] Previously selected extension reconnected, auto-reselecting`);
          this.selectExtension(this.previousSelectedDeviceId);
          this.previousSelectedDeviceId = undefined;
        }
        if (this.peerConnectedWaiters.length > 0) {
          let peerConnectedWaiters = this.peerConnectedWaiters;
          this.peerConnectedWaiters = [];
          for (let peerConnectedWaiter of peerConnectedWaiters) peerConnectedWaiter(true);
        }
        if (typeof e.deviceId === "string" && DEVICE_ID_RE.test(e.deviceId))
          this.pushExternalConfigToPeer(e.deviceId);
        else this.pushExternalConfig();
        this.context.onPeerRosterChanged?.();
        break;
      case "peer_disconnected": {
        let deviceId = e.deviceId;
        logger.info(
          `[${serverName}] Chrome extension disconnected from bridge (deviceId=${deviceId ?? "none"}, selected=${this.selectedDeviceId ?? "none"})`,
        );
        trackEvent?.("chrome_bridge_peer_disconnected", {
          disconnected_device_id: deviceId ?? null,
          selected_device_id: this.selectedDeviceId ?? null,
          had_match: deviceId !== null && deviceId !== undefined && deviceId === this.selectedDeviceId,
          pending_calls: this.pendingCalls.size,
        });
        this.context.onPeerDisconnected?.({
          deviceId,
          wasSelected: deviceId !== null && deviceId !== undefined && deviceId === this.selectedDeviceId,
        });
        if (e.deviceId && e.deviceId === this.selectedDeviceId) {
          logger.info(`[${serverName}] Selected extension disconnected, clearing selection`);
          this.previousSelectedDeviceId = this.selectedDeviceId;
          this.selectedDeviceId = undefined;
          this.discoveryComplete = false;
          this.rejectPendingCalls(
            new ExtensionDisconnectedMidCallError("Chrome extension disconnected mid-call"),
          );
        } else if (!this.selectedDeviceId && this.multiBrowserPendingSelection) {
          this.discoveryComplete = false;
          this.multiBrowserPendingSelection = false;
        }
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
        if (i) {
          i.routingAckReceived = true;
          i.routingAckPongAgeMs = e.target_pong_age_ms ?? null;
        }
        break;
      }
      case "extensions_list":
        if (this.pendingDiscovery) {
          clearTimeout(this.pendingDiscovery.timeout);
          this.pendingDiscovery.resolve(e.extensions ?? []);
          this.pendingDiscovery = null;
        }
        break;
      case "pairing_response": {
        let requestId = e.request_id;
        if (this.pendingPairingRequestId !== requestId) break;
        if (e.dismissed === true) {
          logger.info(`[${serverName}] Pairing prompt dismissed in extension`);
          this.abortPairingPrompt();
          break;
        }
        let deviceId =
          typeof e.device_id === "string" && DEVICE_ID_RE.test(e.device_id) ? e.device_id : undefined;
        let a = cleanDeviceText(e.name, 50);
        if (deviceId && a) {
          this.pendingPairingRequestId = undefined;
          this.pairingInProgress = false;
          this.selectExtension(deviceId);
          this.context.onExtensionPaired?.(deviceId, a);
          this.abortPairingPrompt();
          logger.info(`[${serverName}] Paired with "${a}" (${deviceId.slice(0, 8)})`);
          if (this.pendingSwitchResolve) {
            this.pendingSwitchResolve({
              deviceId,
              name: a,
            });
            this.pendingSwitchResolve = null;
          }
        }
        break;
      }
      case "ping":
        this.ws?.send(
          JSON.stringify({
            type: "pong",
          }),
        );
        break;
      case "pong":
        this.lastPongReceived = Date.now();
        break;
      case "tool_result":
        this.handleToolResult(e, n);
        break;
      case "external_message_result": {
        let requestId = typeof e.requestId === "string" ? e.requestId : undefined;
        let r = requestId ? this.pendingExternalMessages.get(requestId) : undefined;
        if (!requestId || !r) {
          logger.debug(
            `[${serverName}] external_message_result for unknown request: ${requestId?.slice(0, 8) ?? "none"}`,
          );
          break;
        }
        clearTimeout(r.timer);
        this.pendingExternalMessages.delete(requestId);
        if (e.ok === true)
          r.resolve({
            ok: true,
            response: e.response,
          });
        else {
          let error = e.error;
          r.resolve({
            ok: false,
            error: error === "no_target" || error === "timeout" ? error : "send_failed",
          });
        }
        break;
      }
      case "external_message":
      case "external_config":
        break;
      case "permission_request":
        this.handlePermissionRequest(e).catch((error) => {
          logger.error(`[${serverName}] Error handling permission_request:`, error);
        });
        break;
      case "notification":
        if (typeof e.method !== "string")
          logger.warn(`[${serverName}] Dropped a notification whose method is not a string`);
        else
          this.notificationHandler?.({
            method: e.method,
            params: e.params,
          });
        break;
      case "error":
        logger.warn(`[${serverName}] Bridge error: ${e.error}`);
        if (this.selectedDeviceId) this.clearSelectionIfGone(this.selectedDeviceId);
        break;
      default:
        logger.warn(`[${serverName}] Unrecognized bridge message type: ${e.type}`);
    }
  }
  async handlePermissionRequest(e) {
    let { logger, serverName } = this.context;
    let { tool_use_id: toolUseId, request_id: requestId } = e;
    if (typeof toolUseId !== "string" || typeof requestId !== "string") {
      logger.warn(`[${serverName}] permission_request missing tool_use_id or request_id`);
      return;
    }
    let i = this.pendingCalls.get(toolUseId);
    if (!i?.onPermissionRequest) {
      logger.debug(
        `[${serverName}] Ignoring permission_request for unknown tool_use_id ${toolUseId.slice(0, 8)} (not our call)`,
      );
      return;
    }
    let r = toolCallMeta(e, {
      toolUseId,
      requestId,
    });
    clearTimeout(i.timer);
    i.permissionPaused = true;
    try {
      let c = await i.onPermissionRequest(r);
      this.sendPermissionResponse(requestId, c);
    } catch (error) {
      logger.error(`[${serverName}] Error handling permission request:`, error);
      this.sendPermissionResponse(requestId, false);
    }
    let a = this.pendingCalls.get(toolUseId);
    if (a) a.timer = this.createTimeoutTimer(toolUseId, a.timeoutMs);
  }
  sendPermissionResponse(requestId, allowed) {
    if (this.ws?.readyState === ws.OPEN) {
      let t = {
        type: "permission_response",
        request_id: requestId,
        allowed,
      };
      if (this.selectedDeviceId) t.target_device_id = this.selectedDeviceId;
      this.ws.send(JSON.stringify(t));
    }
  }
  handleToolResult(e, responseBytes) {
    let { logger, serverName, trackEvent } = this.context;
    let toolUseId = e.tool_use_id;
    if (typeof toolUseId !== "string") {
      logger.warn(`[${serverName}] Received tool_result without tool_use_id`);
      return;
    }
    let r = this.pendingCalls.get(toolUseId);
    if (!r) {
      logger.debug(`[${serverName}] Received tool_result for unknown call: ${toolUseId.slice(0, 8)}`);
      let l = this.timedOutCalls.get(toolUseId);
      trackEvent?.("chrome_bridge_tool_call_late_result", {
        tool_use_id: toolUseId,
        gap_from_timeout_ms: l ? Date.now() - l : null,
        reason: l ? "post_timeout" : "unknown",
        is_error: typeof e.is_error === "boolean" ? e.is_error : null,
      });
      if (l) this.timedOutCalls.delete(toolUseId);
      return;
    }
    let a = Date.now() - r.startTime;
    let c = this.normalizeBridgeResponse(e);
    let d = Boolean(e.is_error) || "error" in c;
    clearTimeout(r.timer);
    this.pendingCalls.delete(toolUseId);
    let onToolResult = this.context.browserActivityObserver?.onToolResult;
    if (onToolResult)
      try {
        onToolResult({
          sessionId: r.sessionId,
          toolName: r.toolName,
          args: r.args,
          ok: !d,
          resultContent: d ? undefined : c.result?.content,
        });
      } catch {
        logger.debug(`[${serverName}] browser activity observer threw`);
      }
    if (d) {
      let sliced = firstTextContent(c.error).slice(0, 200);
      logger.warn(`[${serverName}] Tool call error: ${r.toolName} (${toolUseId.slice(0, 8)}) after ${a}ms`);
      let errorType = classifyToolError(r.toolName, sliced);
      trackEvent?.("chrome_bridge_tool_call_error", {
        tool_name: `browser:${r.toolName}`,
        tool_use_id: toolUseId,
        duration_ms: a,
        error_type: errorType,
        session_id: r.sessionId,
        user_message_uuid: r.userMessageUuid,
        transport: "bridge",
      });
      if (!this.selectedDeviceId && !this.pairingInProgress) {
        this.discoveryComplete = false;
        r.reject(
          new ExtensionDisconnectedMidCallError(
            `[${serverName}] Extension disconnected during tool call: ${r.toolName}`,
          ),
        );
        return;
      }
    } else {
      logger.debug(`[${serverName}] Tool call completed: ${r.toolName} (${toolUseId.slice(0, 8)}) in ${a}ms`);
      trackEvent?.("chrome_bridge_tool_call_completed", {
        tool_name: `browser:${r.toolName}`,
        tool_use_id: toolUseId,
        duration_ms: a,
        session_id: r.sessionId,
        user_message_uuid: r.userMessageUuid,
        transport: "bridge",
        response_bytes: responseBytes,
      });
    }
    r.resolve(c);
  }
  normalizeBridgeResponse(e) {
    let { notices, ...t } = e;
    let s = sanitizeBridgeNotices(notices, (i) =>
      this.context.logger.warn(`[${this.context.serverName}] ${i}`),
    );
    let o = s
      ? {
          notices: s,
        }
      : undefined;
    if (t.result || t.error)
      return o
        ? {
            ...t,
            ...o,
          }
        : t;
    if (t.content) {
      if (t.is_error)
        return {
          error: {
            content: t.content,
          },
          ...o,
        };
      return {
        result: {
          content: t.content,
        },
        ...o,
      };
    }
    return o
      ? {
          ...t,
          ...o,
        }
      : t;
  }
  getTimeoutDiagnostics() {
    let freeMemPct = -1;
    let pongAgeMs = this.lastPongReceived > 0 ? Date.now() - this.lastPongReceived : undefined;
    return {
      free_mem_pct: freeMemPct,
      pong_age_ms: pongAgeMs,
    };
  }
  createTimeoutTimer(e, n) {
    let { logger, serverName, trackEvent } = this.context;
    return setTimeout(() => {
      let i = this.pendingCalls.get(e);
      if (!i) return;
      this.timedOutCalls.set(e, Date.now());
      if (this.timedOutCalls.size > 200) {
        let d = this.timedOutCalls.keys().next().value;
        if (d) this.timedOutCalls.delete(d);
      }
      this.pendingCalls.delete(e);
      let r = Date.now() - i.startTime;
      let timeoutDiagnostics = this.getTimeoutDiagnostics();
      let routingAckReceived = i.routingAckReceived ?? false;
      logger.warn(
        `[${serverName}] Tool call timeout: ${i.toolName} (${e.slice(0, 8)}) after ${r}ms, pending calls: ${this.pendingCalls.size}`,
      );
      trackEvent?.("chrome_bridge_tool_call_timeout", {
        tool_name: `browser:${i.toolName}`,
        tool_use_id: e,
        duration_ms: r,
        timeout_ms: n,
        session_id: i.sessionId,
        user_message_uuid: i.userMessageUuid,
        transport: "bridge",
        routing_ack_received: routingAckReceived,
        routing_ack_pong_age_ms: i.routingAckPongAgeMs ?? null,
        permission_paused: i.permissionPaused ?? false,
        ...timeoutDiagnostics,
      });
      if (this.isConnected())
        i.reject(
          new ToolCallTimeoutError(`[${serverName}] Tool call timed out: ${i.toolName}`, {
            routingAckReceived,
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
    let { logger, serverName, trackEvent } = this.context;
    if (this.reconnectTimer) return;
    this.reconnectAttempts++;
    if (this.reconnectAttempts > 100) {
      logger.warn(`[${serverName}] Giving up bridge reconnection after 100 attempts`);
      trackEvent?.("chrome_bridge_reconnect_exhausted", {
        total_attempts: 100,
      });
      this.reconnectAttempts = 0;
      return;
    }
    let min = Math.min(2000 * Math.pow(1.5, this.reconnectAttempts - 1), 30000);
    if (this.reconnectAttempts <= 10 || this.reconnectAttempts % 10 === 0)
      logger.info(
        `[${serverName}] Bridge reconnecting in ${Math.round(min)}ms (attempt ${this.reconnectAttempts})`,
      );
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, min);
  }
  startKeepAlive() {
    this.stopKeepAlive();
    this.lastPongReceived = Date.now();
    let { logger, serverName } = this.context;
    this.keepAliveInterval = setInterval(() => {
      if (this.ws?.readyState === ws.OPEN)
        this.ws.send(
          JSON.stringify({
            type: "ping",
          }),
        );
      if (this.lastPongReceived > 0 && Date.now() - this.lastPongReceived > IDLE_TIMEOUT_MS) {
        logger.warn(`[${serverName}] No pong received in ${IDLE_TIMEOUT_MS}ms, closing dead connection`);
        this.rejectPendingCalls(new SocketConnectionError("Bridge keepalive timeout \u2014 connection dead"));
        this.closeSocket();
        this.scheduleReconnect();
      }
    }, PING_INTERVAL_MS);
  }
  stopKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
    this.lastPongReceived = 0;
  }
  closeSocket() {
    this.stopKeepAlive();
    if (this.handshakeTimer) {
      clearTimeout(this.handshakeTimer);
      this.handshakeTimer = null;
    }
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.on("error", () => {});
      this.ws.close();
      this.ws = null;
    }
    this.connected = false;
    this.authenticated = false;
    if (this.selectedDeviceId) this.previousSelectedDeviceId = this.selectedDeviceId;
    this.selectedDeviceId = undefined;
    this.discoveryComplete = false;
    this.multiBrowserPendingSelection = false;
    this.pendingPairingRequestId = undefined;
    this.pairingInProgress = false;
    this.abortPairingPrompt();
    if (this.pendingSwitchResolve) {
      this.pendingSwitchResolve(null);
      this.pendingSwitchResolve = null;
    }
    if (this.pendingDiscovery) {
      clearTimeout(this.pendingDiscovery.timeout);
      this.pendingDiscovery.resolve([]);
      this.pendingDiscovery = null;
    }
    if (this.peerConnectedWaiters.length > 0) {
      let peerConnectedWaiters = this.peerConnectedWaiters;
      this.peerConnectedWaiters = [];
      for (let peerConnectedWaiter of peerConnectedWaiters) peerConnectedWaiter(false);
    }
    this.context.onPeerRosterChanged?.();
  }
  rejectPendingCalls(e) {
    for (let pendingCall of this.pendingCalls.values()) {
      clearTimeout(pendingCall.timer);
      pendingCall.reject(e);
    }
    this.pendingCalls.clear();
  }
  drainExternalRelays() {
    for (let pendingExternalMessage of this.pendingExternalMessages.values()) {
      clearTimeout(pendingExternalMessage.timer);
      pendingExternalMessage.resolve({
        ok: false,
        error: "send_failed",
      });
    }
    this.pendingExternalMessages.clear();
  }
  cleanup() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.rejectPendingCalls(new SocketConnectionError("Bridge client disconnected"));
    this.drainExternalRelays();
    this.closeSocket();
    this.reconnectAttempts = 0;
  }
}
//@ chunk-4dj0g7y4.js:29137-29171 placement
/**
 * 创建 Chrome 桥接客户端。
 */
function createChromeBridgeClient(e) {
  return new ChromeBridgeClient(e);
}
//@ chunk-4dj0g7y4.js:29171-29339 placement
var MAX_QUEUED_MESSAGES = 300;
var RECONNECT_BASE_MS = 1000;
var RECONNECT_MAX_MS = 30000;
var MAX_RECONNECT_ATTEMPTS = 10;
var NOT_READY_CADENCE = {
  steps: [[2000, 30]],
  thenMs: 1e4,
};
var TOKEN_CADENCE = {
  steps: [[2000, 30]],
  thenMs: 60000,
};
var MISMATCH_CADENCE = {
  steps: [[3000, 100]],
  thenMs: 1e4,
};
var exponentialBackoff = (e, n, t) => Math.min(e * 1.5 ** (n - 1), t);
//@ chunk-4dj0g7y4.js:29339-29428 placement
/**
 * 按累计毫秒在节奏表里选出下一次延迟。
 */
function pickCadenceDelay({ steps, thenMs }, t) {
  let s = 0;
  for (let [o, i] of steps) {
    s += i;
    if (t <= s) return o;
  }
  return thenMs;
}
//@ chunk-4dj0g7y4.js:29428-29572 placement
function reconnectDelayMs(e, attempts) {
  switch (e) {
    case "transport":
      return exponentialBackoff(RECONNECT_BASE_MS, attempts, RECONNECT_MAX_MS);
    case "mismatch":
      return pickCadenceDelay(MISMATCH_CADENCE, attempts);
    case "not_ready":
      return pickCadenceDelay(NOT_READY_CADENCE, attempts);
    case "token":
      return pickCadenceDelay(TOKEN_CADENCE, attempts);
  }
}
//@ chunk-4dj0g7y4.js:29572-29724 placement
var RETRY_KIND_BY_REASON = {
  peer_not_ready: "not_ready",
  awaits_token: "token",
  peer_may_move: "mismatch",
  retry: "transport",
};
var newRetryState = (cadence) => ({
  attempts: 0,
  timer: null,
  wanted: false,
  cadence,
});
//@ chunk-4dj0g7y4.js:29724-29882 placement
function escapeJsonForHtml(e) {
  return e
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
    .replace(/\u0085/g, "\\u0085");
}
//@ chunk-4dj0g7y4.js:29882-30202 placement
/**
 * 生成可用标签页上下文的工具结果。
 */
function tabContextResult(e, n) {
  let t = (i) => escapeJsonForHtml(JSON.stringify(i));
  let joined = e.map((i) => {
    let r = i;
    return `  \u2022 tabId ${r.tabId}: ${t(r.title)} (${t(r.url)})`;
  }).join(`
`);
  let o = {
    availableTabs: e,
  };
  if (n !== undefined) o.tabGroupId = n;
  return {
    result: {
      content: [
        {
          type: "text",
          text: escapeJsonForHtml(JSON.stringify(o)),
        },
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
//@ chunk-4dj0g7y4.js:30202-37178 placement
/**
 * 本地 Chrome 扩展连接池（多客户端、标签路由、主动配对、重拨）。
 */
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
  constructor(context) {
    this.context = context;
  }
  startProactivePairing() {
    let { localPairing, watchSocketPaths } = this.context;
    if (!localPairing || !watchSocketPaths) return;
    if (!this.unwatchSockets) this.unwatchSockets = watchSocketPaths(() => this.scheduleScan());
    this.parked = new WeakSet();
    this.scheduleScan();
  }
  scheduleScan() {
    if (this.scanTimer) return;
    this.scanTimer = setTimeout(() => {
      this.scanTimer = null;
      this.dialAvailable();
    }, MAX_QUEUED_MESSAGES);
    this.scanTimer.unref?.();
  }
  async dialAvailable() {
    if (!this.unwatchSockets || this.context.isDisabled?.()) return;
    let generation = this.generation;
    if (this.refreshPromise) await this.refreshPromise;
    await this.refreshClients();
    if (generation !== this.generation || !this.unwatchSockets) return;
    for (let [n, t] of this.clients.entries()) {
      if (t.isConnected()) {
        this.clearRedial(t);
        continue;
      }
      if (this.parked.has(t) || this.dialing.has(t) || this.redials.get(t)?.timer) continue;
      this.clearRedial(t);
      this.dial(n, t);
    }
  }
  dial(e, n) {
    this.dialing.add(n);
    let t = this.redials.get(n);
    if (t) t.wanted = false;
    let s = (o) => {
      this.dialing.delete(n);
      if (this.clients.get(e) !== n || this.redials.get(n)?.cadence === "dead") return;
      if (o) {
        this.clearRedial(n);
        return;
      }
      if (this.redials.get(n)?.wanted || n.isConnecting()) {
        this.onRedialWanted(e, n);
        return;
      }
      let i = n.lastPairingRefuseCode();
      let r = i === undefined ? "durable" : pairingErrorMessage(i, n.lastPairingRefusePeerReported());
      if (r === "durable") this.parked.add(n);
      else this.onRedialWanted(e, n, RETRY_KIND_BY_REASON[r]);
    };
    n.ensureConnected().then(s, () => s(false));
  }
  onRedialWanted(e, n, cadence = "transport") {
    if (!this.unwatchSockets || this.clients.get(e) !== n) return;
    if (this.orphaned.has(n)) {
      this.removeClient(e, n);
      return;
    }
    let s = this.redials.get(n) ?? newRetryState(cadence);
    s.wanted = true;
    if (s.cadence !== cadence) {
      s.attempts = 0;
      s.cadence = cadence;
    }
    this.redials.set(n, s);
    if (s.timer) return;
    if (cadence === "transport" && s.attempts >= MAX_RECONNECT_ATTEMPTS) {
      this.context.logger.info(
        `[${this.context.serverName}] Giving up on ${e} after ${s.attempts} proactive redials`,
      );
      return;
    }
    s.attempts += 1;
    let o = reconnectDelayMs(cadence, s.attempts);
    s.timer = setTimeout(() => {
      s.timer = null;
      if (
        this.unwatchSockets &&
        this.clients.get(e) === n &&
        !this.context.isDisabled?.() &&
        !n.isConnected() &&
        !this.dialing.has(n)
      )
        this.dial(e, n);
    }, o);
    s.timer.unref?.();
  }
  onSocketDead(e, n) {
    if (!this.unwatchSockets || this.clients.get(e) !== n) return;
    this.clearRedial(n);
    this.redials.set(n, newRetryState("dead"));
    this.refreshClients();
  }
  clearRedial(e) {
    let n = this.redials.get(e);
    if (n?.timer) clearTimeout(n.timer);
    this.redials.delete(e);
  }
  removeClient(e, n) {
    this.context.logger.info(`[${this.context.serverName}] Removing stale socket from pool: ${e}`);
    this.clearRedial(n);
    this.orphaned.delete(n);
    n.disconnect();
    this.clients.delete(e);
    for (let [t, s] of this.tabRoutes.entries()) if (s === e) this.tabRoutes.delete(t);
  }
  setNotificationHandler(e) {
    this.notificationHandler = e;
    for (let client of this.clients.values()) client.setNotificationHandler(e);
  }
  async ensureConnected() {
    let { logger, serverName } = this.context;
    await this.refreshClients();
    let t = [];
    let s = [];
    for (let client of this.clients.values()) {
      if (client.isConnected()) {
        this.stragglers.delete(client);
        continue;
      }
      let r = this.stragglers.has(client);
      let a = client.ensureConnected().then(
        (c) => {
          if (c) this.stragglers.delete(client);
          else this.stragglers.add(client);
          return c;
        },
        () => {
          this.stragglers.add(client);
          return false;
        },
      );
      (r ? s : t).push(a);
    }
    await Promise.all(t);
    if (this.getConnectedClients().length === 0) await Promise.all(s);
    let o = this.getConnectedClients().length;
    if (o === 0) {
      logger.info(`[${serverName}] No connected sockets in pool`);
      return false;
    }
    logger.info(`[${serverName}] Socket pool: ${o} connected`);
    return true;
  }
  async callTool(e, n, t) {
    if (e === "tabs_context_mcp") return this.callTabsContext(n, t);
    let tabId = n.tabId;
    if (tabId !== undefined) {
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
    this.generation += 1;
    this.refreshPromise = null;
    this.unwatchSockets?.();
    this.unwatchSockets = null;
    if (this.scanTimer) {
      clearTimeout(this.scanTimer);
      this.scanTimer = null;
    }
    for (let client of this.clients.values()) {
      this.clearRedial(client);
      client.disconnect();
    }
    this.clients.clear();
    this.tabRoutes.clear();
  }
  getConnectedClients() {
    return [...this.clients.values()].filter((client) => client.isConnected());
  }
  async callTabsContext(e, n) {
    let { logger, serverName } = this.context;
    let connectedClients = this.getConnectedClients();
    if (connectedClients.length === 0)
      throw new SocketConnectionError(`[${serverName}] No connected sockets available`);
    if (connectedClients.length === 1) {
      let c = await connectedClients[0].callTool("tabs_context_mcp", e, n);
      this.updateTabRoutes(c, this.getSocketPathForClient(connectedClients[0]));
      return c;
    }
    let settled = await Promise.allSettled(
      connectedClients.map(async (c) => {
        let result = await c.callTool("tabs_context_mcp", e, n);
        let socketPath = this.getSocketPathForClient(c);
        return {
          result,
          socketPath,
        };
      }),
    );
    let r = [];
    let a;
    this.tabRoutes.clear();
    for (let c of settled) {
      if (c.status !== "fulfilled") {
        logger.info(`[${serverName}] tabs_context_mcp failed on one socket: ${c.reason}`);
        continue;
      }
      let { result: d, socketPath } = c.value;
      this.updateTabRoutes(d, socketPath);
      let l = this.extractTabs(d);
      if (l) for (let g of l) r.push(g);
      if (a === undefined) a = this.extractTabGroupId(d);
    }
    if (r.length > 0) return tabContextResult(r, a);
    for (let c of settled) if (c.status === "fulfilled") return c.value.result;
    throw new SocketConnectionError(`[${serverName}] All sockets failed for tabs_context_mcp`);
  }
  updateTabRoutes(e, n) {
    let t = this.extractTabs(e);
    if (!t) return;
    for (let s of t)
      if (typeof s === "object" && s !== null && "tabId" in s) {
        let tabId = s.tabId;
        this.tabRoutes.set(tabId, n);
      }
  }
  extractTabs(e) {
    if (!e || typeof e !== "object") return null;
    let content = e.result?.content;
    if (!content || !Array.isArray(content)) return null;
    for (let s of content)
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
    let content = e.result?.content;
    if (!content || !Array.isArray(content)) return;
    for (let s of content)
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
    let { logger, serverName } = this.context;
    let generation = this.generation;
    let s;
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
        let i = {
          ...this.context,
          socketPath: o,
          getSocketPath: undefined,
          getSocketPaths: undefined,
        };
        let chromeSocketClient = createChromeSocketClient(i);
        chromeSocketClient.disableAutoReconnect = true;
        chromeSocketClient.onRedialWanted = (a) =>
          a === "dead"
            ? this.onSocketDead(o, chromeSocketClient)
            : this.onRedialWanted(o, chromeSocketClient, a === "peer_dropped" ? "not_ready" : "transport");
        if (this.notificationHandler) chromeSocketClient.setNotificationHandler(this.notificationHandler);
        this.clients.set(o, chromeSocketClient);
      }
    for (let [o, i] of this.clients.entries())
      if (s.includes(o)) this.orphaned.delete(i);
      else if (i.isConnected()) this.orphaned.add(i);
      else this.removeClient(o, i);
  }
}
//@ chunk-4dj0g7y4.js:37178-37210 placement
/**
 * 创建本机 Chrome 桥接连接池。
 */
function createLocalChromeBridgePool(context) {
  return new LocalChromeBridgePool(context);
}
export { createChromeBridgeClient, createLocalChromeBridgePool };

/**
 * utils/claudeInChrome/bridgeClient.ts
 *
 * 2.1.316 新增：Claude in Chrome 桥接 WebSocket 客户端：连接、认证、设备发现、工具调用、重连；本地 Chrome 扩展连接池（多客户端、标签路由、主动配对、重拨）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-wpz18a52.js (18)
 * attribution: placement 18
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-wpz18a52.js:345-374 placement
/**
 * 设备 id 的合法形式（字母数字与短横，1 到 64 个字符）。
 */
var DEVICE_ID_RE = /^[A-Za-z0-9-]{1,64}$/;
//@ chunk-wpz18a52.js:374-456 placement
/**
 * 平台名转成展示名（darwin→macOS、win32→Windows、其余 Linux）。
 */
function platformDisplayName(platform = "linux") {
  return platform === "darwin" ? "macOS" : platform === "win32" ? "Windows" : "Linux";
}
//@ chunk-wpz18a52.js:456-676 placement
function wrapWebSocket(socket) {
  return {
    on: (eventName, listener) => {
      socket.on(eventName, listener);
    },
    removeAllListeners: () => socket.removeAllListeners(),
    send: (data) => socket.send(data),
    close: (code, reason) => {
      if (socket.readyState === ws.OPEN) socket.close(code, reason);
      else socket.terminate();
    },
    get readyState() {
      return socket.readyState;
    },
  };
}
//@ chunk-wpz18a52.js:676-870 placement
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
//@ chunk-wpz18a52.js:870-1013 placement
function cleanDeviceText(text, maxLength) {
  if (typeof text !== "string") return;
  let trimmed = text.replace(/[\r\n\t\u0000-\u001f]/g, " ").trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength)}\u2026` : trimmed;
}
//@ chunk-wpz18a52.js:1013-1223 placement
function parseConnectedExtension(extension) {
  if (typeof extension.deviceId !== "string" || !DEVICE_ID_RE.test(extension.deviceId)) return;
  return {
    deviceId: extension.deviceId,
    name: cleanDeviceText(extension.name, 50),
    osPlatform: cleanDeviceText(extension.osPlatform, 30),
    connectedAt: typeof extension.connectedAt === "number" ? extension.connectedAt : 0,
  };
}
//@ chunk-wpz18a52.js:1223-1231 placement
/**
 * 桥接通知清洗后保留的条数上限（4）。
 */
var MAX_BRIDGE_NOTICES = 4;
//@ chunk-wpz18a52.js:1231-1850 placement
/**
 * 清洗桥接通知列表（种类、域名，有上限）。
 */
function sanitizeBridgeNotices(notices, onCapReached) {
  if (!Array.isArray(notices)) return;
  let byKey = new Map();
  let addNotice = (key, notice) => {
    if (byKey.has(key)) {
      byKey.set(key, notice);
      return;
    }
    if (byKey.size >= MAX_BRIDGE_NOTICES) {
      onCapReached?.(`sanitizeBridgeNotices: notice cap (${MAX_BRIDGE_NOTICES}) reached; dropping entry`);
      return;
    }
    byKey.set(key, notice);
  };
  for (let notice of notices) {
    if (typeof notice !== "object" || notice === null) continue;
    let { kind, domain } = notice;
    if (typeof kind !== "string" || !/^[a-z0-9_]{1,64}$/i.test(kind)) continue;
    let lower = kind.toLowerCase();
    if (domain === undefined)
      addNotice(`${lower}:`, {
        kind: lower,
      });
    else if (typeof domain === "string" && domain.length <= 253 && /^[a-z0-9.-]+$/i.test(domain)) {
      let replaced = domain.toLowerCase().replace(/\.$/, "");
      if (replaced.length === 0) continue;
      addNotice(`${lower}:${replaced}`, {
        kind: lower,
        domain: replaced,
      });
    }
  }
  return byKey.size > 0 ? Array.from(byKey.values()) : undefined;
}
//@ chunk-wpz18a52.js:1850-29137 placement
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
  constructor(context) {
    this.context = context;
    if (context.initialPermissionMode) this.permissionMode = context.initialPermissionMode;
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
      let pollTimer = null;
      let timer = setTimeout(() => {
        if (pollTimer) clearTimeout(pollTimer);
        logger.info(
          `[${serverName}] Connection timeout, connected=${this.connected}, authenticated=${this.authenticated}`,
        );
        resolve(false);
      }, 1e4);
      let checkConnected = () => {
        if (this.connected && this.authenticated) {
          logger.info(`[${serverName}] Connection successful`);
          clearTimeout(timer);
          resolve(true);
        } else if (!this.connecting && !this.reconnectTimer) {
          logger.info(`[${serverName}] No longer connecting, giving up`);
          clearTimeout(timer);
          resolve(false);
        } else pollTimer = setTimeout(checkConnected, 200);
      };
      checkConnected();
    });
  }
  async callTool(toolName, args, options) {
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
    let sessionId = options?.sessionScope?.sessionId;
    let userMessageUuid = options?.sessionScope?.userMessageUuid;
    let onBeforeToolCall = this.context.browserActivityObserver?.onBeforeToolCall;
    if (onBeforeToolCall) {
      let selectedDeviceId = this.selectedDeviceId;
      try {
        await onBeforeToolCall({
          sessionId,
          toolName,
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
    let callId = crypto.randomUUID();
    let startTime = Date.now();
    let timeoutMs = this.context.getToolCallTimeoutMs?.(toolName) ?? BROWSER_TOOL_TIMEOUT_MS;
    let message = {
      type: "tool_call",
      tool_use_id: callId,
      client_type: this.context.clientTypeId,
      tool: toolName,
      args,
      supports_tool_result_notices: true,
    };
    if (this.selectedDeviceId) message.target_device_id = this.selectedDeviceId;
    Object.assign(
      message,
      permissionContextFields({
        ...options,
        permissionMode: options?.permissionMode ?? this.permissionMode,
        allowedDomains: options?.allowedDomains ?? this.allowedDomains,
      }),
    );
    let json = JSON.stringify(message);
    trackEvent?.("chrome_bridge_tool_call_started", {
      tool_name: `browser:${toolName}`,
      tool_use_id: callId,
      session_id: sessionId,
      user_message_uuid: userMessageUuid,
      timeout_ms: timeoutMs,
      transport: "bridge",
      request_bytes: Buffer.byteLength(json, "utf-8"),
    });
    return new Promise((resolve, reject) => {
      let timer = this.createTimeoutTimer(callId, timeoutMs);
      this.pendingCalls.set(callId, {
        resolve,
        reject,
        timer,
        onPermissionRequest: options?.onPermissionRequest,
        startTime,
        toolName,
        timeoutMs,
        sessionId,
        userMessageUuid,
        args,
      });
      logger.debug(`[${serverName}] Sending tool_call: ${quoteTruncated(toolName)} (${callId.slice(0, 8)})`);
      this.ws.send(json);
    });
  }
  sendExternalMessage(extensionIds, payload, options) {
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
    let requestId = crypto.randomUUID();
    let timeoutMs = options?.timeoutMs;
    let min = Math.min(
      typeof timeoutMs === "number" && Number.isFinite(timeoutMs) && timeoutMs > 0
        ? timeoutMs
        : BROWSER_LONG_TIMEOUT_MS,
      BROWSER_MAX_TIMEOUT_MS,
    );
    let message = {
      type: "external_message",
      requestId,
      extensionIds: [...extensionIds],
      payload,
      timeoutMs: min,
      target_device_id: this.selectedDeviceId,
    };
    return new Promise((resolve) => {
      let timer = setTimeout(() => {
        if (this.pendingExternalMessages.delete(requestId)) {
          logger.warn(`[${serverName}] external_message timed out locally (${requestId.slice(0, 8)})`);
          resolve({
            ok: false,
            error: "timeout",
          });
        }
      }, min + DISCOVERY_TIMEOUT_MS);
      this.pendingExternalMessages.set(requestId, {
        resolve,
        timer,
      });
      logger.debug(`[${serverName}] Sending external_message (${requestId.slice(0, 8)})`);
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        clearTimeout(timer);
        this.pendingExternalMessages.delete(requestId);
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
  pushExternalConfig(configOverride) {
    if (this.selectedDeviceId === undefined) return false;
    return this.pushExternalConfigToPeer(this.selectedDeviceId, configOverride);
  }
  pushExternalConfigToPeer(targetDeviceId, config) {
    if (this.ws?.readyState !== ws.OPEN) return false;
    let relayConfig = config;
    if (!relayConfig) {
      if (!this.context.getExternalRelayConfig) return false;
      relayConfig = this.context.getExternalRelayConfig() ?? {
        extensionIds: [],
      };
    }
    this.ws.send(
      JSON.stringify({
        type: "external_config",
        extensionIds: relayConfig.extensionIds,
        ...(relayConfig.hooks !== undefined && {
          hooks: relayConfig.hooks,
        }),
        target_device_id: targetDeviceId,
      }),
    );
    return true;
  }
  async pushExternalConfigToAllPeers(config) {
    if (this.ws?.readyState !== ws.OPEN) return 0;
    if (!config && !this.context.getExternalRelayConfig) return 0;
    let extensions = await this.queryBridgeExtensions();
    let pushedCount = 0;
    for (let extension of extensions)
      if (this.pushExternalConfigToPeer(extension.deviceId, config)) pushedCount++;
    return pushedCount;
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
    let extensions = await this.queryBridgeExtensions();
    if (extensions.length === 0) {
      logger.info(
        `[${serverName}] No extensions connected, waiting up to ${BROWSER_SELECT_TIMEOUT_MS}ms for peer_connected`,
      );
      if (await this.waitForPeerConnected(BROWSER_SELECT_TIMEOUT_MS))
        extensions = await this.queryBridgeExtensions();
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
      let found = extensions.find((extension) => extension.deviceId === persistedDeviceId);
      if (!found) {
        logger.info(
          `[${serverName}] requirePairedDevice: persisted ${persistedDeviceId.slice(0, 8)} not connected (${extensions.length} other(s) visible); waiting`,
        );
        if (await this.waitForPeerConnected(BROWSER_SELECT_TIMEOUT_MS)) {
          extensions = await this.queryBridgeExtensions();
          found = extensions.find((extension) => extension.deviceId === persistedDeviceId);
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
    let localDeviceIds =
      extensions.length > 1 && !extensions.some((extension) => extension.deviceId === this.persistedDeviceId)
        ? await safeCallPromise(this.context.getLocalDeviceIds)
        : undefined;
    this.discoveryComplete = true;
    if (this.selectedDeviceId) return;
    let pick = pickBrowserDevice(extensions, this.persistedDeviceId, localDeviceIds);
    if (pick.kind === "none") {
      logger.info(`[${serverName}] No extensions found after waiting`);
      this.multiBrowserPendingSelection = false;
      return;
    }
    if (pick.kind === "select") {
      let { extension, reason } = pick;
      logger.info(
        `[${serverName}] Auto-connecting to ${SELECTION_REASON_WORDS[reason]} extension: ${extension.name || extension.deviceId.slice(0, 8)}`,
      );
      if (reason === "only" && !this.isLocalExtension(extension))
        this.context.onRemoteExtensionWarning?.(extension);
      this.selectExtension(extension.deviceId);
      this.reportBrowserSelected(reason, extensions, localDeviceIds);
      return;
    }
    if (!this.multiBrowserPendingSelection) this.reportBrowserSelected("ask", extensions, localDeviceIds);
    if (this.context.askUserToolName) {
      this.multiBrowserPendingSelection = true;
      return;
    }
    this.broadcastPairingRequest();
    this.pairingInProgress = true;
    this.firePairingPrompt();
  }
  reportBrowserSelected(outcome, extensions, localDeviceIds) {
    this.context.trackEvent?.("chrome_bridge_browser_selected", {
      outcome,
      connected_count: extensions.length,
      local_count:
        localDeviceIds === undefined
          ? null
          : extensions.filter((extension) => localDeviceIds.has(extension.deviceId)).length,
    });
  }
  queryBridgeExtensions() {
    if (this.listExtensionsPromise) return this.listExtensionsPromise;
    let listPromise = new Promise((resolve) => {
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
    }).then((extensions) => {
      let latestByDevice = new Map();
      for (let extension of extensions) {
        let existing = latestByDevice.get(extension.deviceId);
        if (!existing || extension.connectedAt > existing.connectedAt)
          latestByDevice.set(extension.deviceId, extension);
      }
      return [...latestByDevice.values()]
        .map(parseConnectedExtension)
        .filter((extension) => extension !== undefined);
    });
    this.listExtensionsPromise = listPromise;
    listPromise.finally(() => {
      if (this.listExtensionsPromise === listPromise) this.listExtensionsPromise = null;
    });
    return listPromise;
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
  selectExtension(deviceId) {
    let { logger, serverName } = this.context;
    this.selectedDeviceId = deviceId;
    this.previousSelectedDeviceId = undefined;
    this.multiBrowserPendingSelection = false;
    logger.info(`[${serverName}] Selected Chrome extension: ${deviceId.slice(0, 8)}...`);
    this.pushExternalConfig();
  }
  async clearSelectionIfGone(deviceId) {
    let { logger, serverName } = this.context;
    let extensions = await this.queryBridgeExtensions();
    if (this.selectedDeviceId !== deviceId) return;
    if (extensions.some((extension) => extension.deviceId === deviceId)) return;
    logger.info(
      `[${serverName}] Selected extension ${deviceId.slice(0, 8)} absent from bridge roster after error; clearing selection`,
    );
    this.selectedDeviceId = undefined;
    this.discoveryComplete = false;
  }
  async listConnectedExtensions() {
    if (!(await this.ensureConnected())) return [];
    let extensions = await this.queryBridgeExtensions();
    let localDeviceIds =
      extensions.length > 1 ? await safeCallPromise(this.context.getLocalDeviceIds) : undefined;
    return extensions.map((extension) => ({
      ...extension,
      isLocal: this.isLocalExtension(extension),
      ...(localDeviceIds?.has(extension.deviceId) && {
        onThisComputer: true,
      }),
    }));
  }
  selectExtensionById(deviceId, deviceName) {
    this.discoveryComplete = true;
    this.pairingInProgress = false;
    this.pendingPairingRequestId = undefined;
    this.selectExtension(deviceId);
    this.context.onExtensionPaired?.(deviceId, deviceName);
    if (this.pendingSwitchResolve)
      this.pendingSwitchResolve({
        deviceId,
        name: deviceName,
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
  isLocalExtension(extension) {
    if (!extension.osPlatform) return false;
    return extension.osPlatform === platformDisplayName(this.context.getHostPlatform?.() ?? "linux");
  }
  waitForPeerConnected(timeoutMs) {
    return new Promise((resolve) => {
      let timer = setTimeout(() => {
        this.peerConnectedWaiters = this.peerConnectedWaiters.filter(
          (peerConnectedWaiter) => peerConnectedWaiter !== waiter,
        );
        resolve(false);
      }, timeoutMs);
      let waiter = (connected) => {
        clearTimeout(timer);
        resolve(connected);
      };
      this.peerConnectedWaiters.push(waiter);
    });
  }
  broadcastPairingRequest() {
    let requestId = crypto.randomUUID();
    this.pendingPairingRequestId = requestId;
    this.ws?.send(
      JSON.stringify({
        type: "pairing_request",
        request_id: requestId,
        client_type: this.context.clientTypeId,
      }),
    );
  }
  async switchBrowser() {
    let extensions = await this.queryBridgeExtensions();
    let currentDeviceId = this.selectedDeviceId ?? this.previousSelectedDeviceId;
    if (
      extensions.length === 0 ||
      (extensions.length === 1 && (!currentDeviceId || extensions[0].deviceId === currentDeviceId))
    )
      return "no_other_browsers";
    this.previousSelectedDeviceId = this.selectedDeviceId;
    this.selectedDeviceId = undefined;
    this.discoveryComplete = false;
    this.pairingInProgress = false;
    let requestId = crypto.randomUUID();
    this.pendingPairingRequestId = requestId;
    if (this.ws?.readyState !== ws.OPEN) return null;
    this.ws.send(
      JSON.stringify({
        type: "pairing_request",
        request_id: requestId,
        client_type: this.context.clientTypeId,
      }),
    );
    this.firePairingPrompt();
    if (this.pendingSwitchResolve) this.pendingSwitchResolve(null);
    return new Promise((resolve) => {
      let timer = setTimeout(() => {
        if (this.pendingPairingRequestId === requestId) this.pendingPairingRequestId = undefined;
        this.pendingSwitchResolve = null;
        this.abortPairingPrompt();
        resolve(null);
      }, 120000);
      this.pendingSwitchResolve = (result) => {
        clearTimeout(timer);
        this.pendingSwitchResolve = null;
        resolve(result);
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
    let userId;
    let oauthToken;
    if (bridgeConfig.devUserId) {
      userId = bridgeConfig.devUserId;
      logger.debug(`[${serverName}] Using dev user ID for bridge connection`);
    } else {
      logger.debug(`[${serverName}] Fetching user ID for bridge connection`);
      let errorDetail;
      let userId_2;
      if (bridgeConfig.getUserIdResult) {
        let userIdResult = await bridgeConfig.getUserIdResult();
        if (userIdResult.ok) userId_2 = userIdResult.userId;
        else errorDetail = userIdResult.error;
      } else userId_2 = await bridgeConfig.getUserId();
      if (!userId_2) {
        let elapsedMs = Date.now() - this.connectionStartTime;
        logger.error(`[${serverName}] No user ID available after ${elapsedMs}ms`);
        trackEvent?.("chrome_bridge_connection_failed", {
          duration_ms: elapsedMs,
          error_type: "no_user_id",
          error_detail: errorDetail,
          reconnect_attempt: this.reconnectAttempts,
        });
        this.connecting = false;
        this.scheduleReconnect();
        return;
      }
      userId = userId_2;
      logger.debug(`[${serverName}] Fetching OAuth token for bridge connection`);
      oauthToken = await bridgeConfig.getOAuthToken();
      if (!oauthToken) {
        let elapsedMs = Date.now() - this.connectionStartTime;
        logger.error(`[${serverName}] No OAuth token available after ${elapsedMs}ms`);
        trackEvent?.("chrome_bridge_connection_failed", {
          duration_ms: elapsedMs,
          error_type: "no_oauth_token",
          reconnect_attempt: this.reconnectAttempts,
        });
        this.connecting = false;
        this.scheduleReconnect();
        return;
      }
    }
    let bridgeUrl = `${bridgeConfig.url}/chrome/${userId}`;
    logger.info(`[${serverName}] Connecting to bridge: ${bridgeUrl}`);
    trackEvent?.("chrome_bridge_connection_started", {
      bridge_url: bridgeUrl,
    });
    try {
      if (bridgeConfig.createWebSocket) this.ws = await bridgeConfig.createWebSocket(bridgeUrl);
      else {
        let wsOptions = (await bridgeConfig.getWsOptions?.()) ?? bridgeConfig.wsOptions;
        this.ws = wrapWebSocket(
          new ws(
            bridgeUrl,
            wsOptions
              ? {
                  ...wsOptions,
                  tls: wsOptions,
                }
              : undefined,
          ),
        );
      }
    } catch (error) {
      let elapsedMs = Date.now() - this.connectionStartTime;
      logger.error(`[${serverName}] Failed to create WebSocket after ${elapsedMs}ms:`, error);
      trackEvent?.("chrome_bridge_connection_failed", {
        duration_ms: elapsedMs,
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
      let connectMessage = {
        type: "connect",
        client_type: this.context.clientTypeId,
      };
      if (bridgeConfig.devUserId) connectMessage.dev_user_id = bridgeConfig.devUserId;
      else connectMessage.oauth_token = oauthToken;
      this.ws?.send(JSON.stringify(connectMessage));
    });
    this.ws.on("message", (data) => {
      try {
        let str = data.toString();
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
    this.ws.on("close", (closeCode) => {
      let durationMs = this.connectionEstablishedTime ? Date.now() - this.connectionEstablishedTime : 0;
      logger.info(`[${serverName}] Bridge connection closed (code: ${closeCode}, duration: ${durationMs}ms)`);
      trackEvent?.("chrome_bridge_disconnected", {
        close_code: closeCode,
        duration_since_connect_ms: durationMs,
        reconnect_attempt: this.reconnectAttempts + 1,
      });
      this.connected = false;
      this.authenticated = false;
      this.connecting = false;
      this.connectionEstablishedTime = null;
      this.rejectPendingCalls(new SocketConnectionError("Bridge connection closed mid-call"));
      this.scheduleReconnect();
    });
    this.ws.on("error", (error) => {
      let durationMs = this.connectionStartTime ? Date.now() - this.connectionStartTime : 0;
      logger.error(`[${serverName}] Bridge WebSocket error after ${durationMs}ms: ${error.message}`);
      trackEvent?.("chrome_bridge_connection_failed", {
        duration_ms: durationMs,
        error_type: "websocket_error",
        error_code: error.code,
        reconnect_attempt: this.reconnectAttempts,
      });
      this.connected = false;
      this.authenticated = false;
      this.connecting = false;
      this.rejectPendingCalls(new SocketConnectionError(`Bridge connection error: ${error.message}`));
    });
  }
  handleMessage(message, responseBytes) {
    let { logger, serverName, trackEvent } = this.context;
    switch (message.type) {
      case "paired": {
        let durationMs = this.connectionStartTime ? Date.now() - this.connectionStartTime : 0;
        logger.info(`[${serverName}] Paired with Chrome extension (duration: ${durationMs}ms)`);
        this.connected = true;
        this.authenticated = true;
        this.connecting = false;
        this.reconnectAttempts = 0;
        this.connectionEstablishedTime = Date.now();
        this.startKeepAlive();
        trackEvent?.("chrome_bridge_connection_succeeded", {
          duration_ms: durationMs,
          status: "paired",
        });
        this.pushExternalConfigToAllPeers();
        this.context.onPeerRosterChanged?.();
        break;
      }
      case "waiting": {
        let durationMs = this.connectionStartTime ? Date.now() - this.connectionStartTime : 0;
        logger.info(`[${serverName}] Waiting for Chrome extension to connect (duration: ${durationMs}ms)`);
        this.connected = true;
        this.authenticated = true;
        this.connecting = false;
        this.reconnectAttempts = 0;
        this.connectionEstablishedTime = Date.now();
        this.startKeepAlive();
        trackEvent?.("chrome_bridge_connection_succeeded", {
          duration_ms: durationMs,
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
          message.deviceId === this.previousSelectedDeviceId &&
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
        if (typeof message.deviceId === "string" && DEVICE_ID_RE.test(message.deviceId))
          this.pushExternalConfigToPeer(message.deviceId);
        else this.pushExternalConfig();
        this.context.onPeerRosterChanged?.();
        break;
      case "peer_disconnected": {
        let deviceId = message.deviceId;
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
        if (message.deviceId && message.deviceId === this.selectedDeviceId) {
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
          tool_use_id: message.tool_use_id ?? null,
          routed_to: message.routed_to ?? null,
          target_connected_at: message.target_connected_at ?? null,
          target_pong_age_ms: message.target_pong_age_ms ?? null,
          extension_sockets: message.extension_sockets ?? null,
          mcp_sockets: message.mcp_sockets ?? null,
        });
        let pendingCall = this.pendingCalls.get(message.tool_use_id ?? "");
        if (pendingCall) {
          pendingCall.routingAckReceived = true;
          pendingCall.routingAckPongAgeMs = message.target_pong_age_ms ?? null;
        }
        break;
      }
      case "extensions_list":
        if (this.pendingDiscovery) {
          clearTimeout(this.pendingDiscovery.timeout);
          this.pendingDiscovery.resolve(message.extensions ?? []);
          this.pendingDiscovery = null;
        }
        break;
      case "pairing_response": {
        let requestId = message.request_id;
        if (this.pendingPairingRequestId !== requestId) break;
        if (message.dismissed === true) {
          logger.info(`[${serverName}] Pairing prompt dismissed in extension`);
          this.abortPairingPrompt();
          break;
        }
        let deviceId =
          typeof message.device_id === "string" && DEVICE_ID_RE.test(message.device_id)
            ? message.device_id
            : undefined;
        let deviceName = cleanDeviceText(message.name, 50);
        if (deviceId && deviceName) {
          this.pendingPairingRequestId = undefined;
          this.pairingInProgress = false;
          this.selectExtension(deviceId);
          this.context.onExtensionPaired?.(deviceId, deviceName);
          this.abortPairingPrompt();
          logger.info(`[${serverName}] Paired with "${deviceName}" (${deviceId.slice(0, 8)})`);
          if (this.pendingSwitchResolve) {
            this.pendingSwitchResolve({
              deviceId,
              name: deviceName,
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
        this.handleToolResult(message, responseBytes);
        break;
      case "external_message_result": {
        let requestId = typeof message.requestId === "string" ? message.requestId : undefined;
        let pendingMessage = requestId ? this.pendingExternalMessages.get(requestId) : undefined;
        if (!requestId || !pendingMessage) {
          logger.debug(
            `[${serverName}] external_message_result for unknown request: ${requestId?.slice(0, 8) ?? "none"}`,
          );
          break;
        }
        clearTimeout(pendingMessage.timer);
        this.pendingExternalMessages.delete(requestId);
        if (message.ok === true)
          pendingMessage.resolve({
            ok: true,
            response: message.response,
          });
        else {
          let error = message.error;
          pendingMessage.resolve({
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
        this.handlePermissionRequest(message).catch((error) => {
          logger.error(`[${serverName}] Error handling permission_request:`, error);
        });
        break;
      case "notification":
        if (typeof message.method !== "string")
          logger.warn(`[${serverName}] Dropped a notification whose method is not a string`);
        else
          this.notificationHandler?.({
            method: message.method,
            params: message.params,
          });
        break;
      case "error":
        logger.warn(`[${serverName}] Bridge error: ${message.error}`);
        if (this.selectedDeviceId) this.clearSelectionIfGone(this.selectedDeviceId);
        break;
      default:
        logger.warn(`[${serverName}] Unrecognized bridge message type: ${message.type}`);
    }
  }
  async handlePermissionRequest(message) {
    let { logger, serverName } = this.context;
    let { tool_use_id: toolUseId, request_id: requestId } = message;
    if (typeof toolUseId !== "string" || typeof requestId !== "string") {
      logger.warn(`[${serverName}] permission_request missing tool_use_id or request_id`);
      return;
    }
    let pendingCall = this.pendingCalls.get(toolUseId);
    if (!pendingCall?.onPermissionRequest) {
      logger.debug(
        `[${serverName}] Ignoring permission_request for unknown tool_use_id ${toolUseId.slice(0, 8)} (not our call)`,
      );
      return;
    }
    let toolCallMetaInfo = toolCallMeta(message, {
      toolUseId,
      requestId,
    });
    clearTimeout(pendingCall.timer);
    pendingCall.permissionPaused = true;
    try {
      let allowed = await pendingCall.onPermissionRequest(toolCallMetaInfo);
      this.sendPermissionResponse(requestId, allowed);
    } catch (error) {
      logger.error(`[${serverName}] Error handling permission request:`, error);
      this.sendPermissionResponse(requestId, false);
    }
    let pendingCall_2 = this.pendingCalls.get(toolUseId);
    if (pendingCall_2) pendingCall_2.timer = this.createTimeoutTimer(toolUseId, pendingCall_2.timeoutMs);
  }
  sendPermissionResponse(requestId, allowed) {
    if (this.ws?.readyState === ws.OPEN) {
      let response = {
        type: "permission_response",
        request_id: requestId,
        allowed,
      };
      if (this.selectedDeviceId) response.target_device_id = this.selectedDeviceId;
      this.ws.send(JSON.stringify(response));
    }
  }
  handleToolResult(message, responseBytes) {
    let { logger, serverName, trackEvent } = this.context;
    let toolUseId = message.tool_use_id;
    if (typeof toolUseId !== "string") {
      logger.warn(`[${serverName}] Received tool_result without tool_use_id`);
      return;
    }
    let pendingCall = this.pendingCalls.get(toolUseId);
    if (!pendingCall) {
      logger.debug(`[${serverName}] Received tool_result for unknown call: ${toolUseId.slice(0, 8)}`);
      let timedOutAt = this.timedOutCalls.get(toolUseId);
      trackEvent?.("chrome_bridge_tool_call_late_result", {
        tool_use_id: toolUseId,
        gap_from_timeout_ms: timedOutAt ? Date.now() - timedOutAt : null,
        reason: timedOutAt ? "post_timeout" : "unknown",
        is_error: typeof message.is_error === "boolean" ? message.is_error : null,
      });
      if (timedOutAt) this.timedOutCalls.delete(toolUseId);
      return;
    }
    let durationMs = Date.now() - pendingCall.startTime;
    let result = this.normalizeBridgeResponse(message);
    let isError = Boolean(message.is_error) || "error" in result;
    clearTimeout(pendingCall.timer);
    this.pendingCalls.delete(toolUseId);
    let onToolResult = this.context.browserActivityObserver?.onToolResult;
    if (onToolResult)
      try {
        onToolResult({
          sessionId: pendingCall.sessionId,
          toolName: pendingCall.toolName,
          args: pendingCall.args,
          ok: !isError,
          resultContent: isError ? undefined : result.result?.content,
        });
      } catch {
        logger.debug(`[${serverName}] browser activity observer threw`);
      }
    if (isError) {
      let sliced = firstTextContent(result.error).slice(0, 200);
      logger.warn(
        `[${serverName}] Tool call error: ${pendingCall.toolName} (${toolUseId.slice(0, 8)}) after ${durationMs}ms`,
      );
      let errorType = classifyToolError(pendingCall.toolName, sliced);
      trackEvent?.("chrome_bridge_tool_call_error", {
        tool_name: `browser:${pendingCall.toolName}`,
        tool_use_id: toolUseId,
        duration_ms: durationMs,
        error_type: errorType,
        session_id: pendingCall.sessionId,
        user_message_uuid: pendingCall.userMessageUuid,
        transport: "bridge",
      });
      if (!this.selectedDeviceId && !this.pairingInProgress) {
        this.discoveryComplete = false;
        pendingCall.reject(
          new ExtensionDisconnectedMidCallError(
            `[${serverName}] Extension disconnected during tool call: ${pendingCall.toolName}`,
          ),
        );
        return;
      }
    } else {
      logger.debug(
        `[${serverName}] Tool call completed: ${pendingCall.toolName} (${toolUseId.slice(0, 8)}) in ${durationMs}ms`,
      );
      trackEvent?.("chrome_bridge_tool_call_completed", {
        tool_name: `browser:${pendingCall.toolName}`,
        tool_use_id: toolUseId,
        duration_ms: durationMs,
        session_id: pendingCall.sessionId,
        user_message_uuid: pendingCall.userMessageUuid,
        transport: "bridge",
        response_bytes: responseBytes,
      });
    }
    pendingCall.resolve(result);
  }
  normalizeBridgeResponse(message) {
    let { notices, ...body } = message;
    let notices_2 = sanitizeBridgeNotices(notices, (warningText) =>
      this.context.logger.warn(`[${this.context.serverName}] ${warningText}`),
    );
    let noticesField = notices_2
      ? {
          notices: notices_2,
        }
      : undefined;
    if (body.result || body.error)
      return noticesField
        ? {
            ...body,
            ...noticesField,
          }
        : body;
    if (body.content) {
      if (body.is_error)
        return {
          error: {
            content: body.content,
          },
          ...noticesField,
        };
      return {
        result: {
          content: body.content,
        },
        ...noticesField,
      };
    }
    return noticesField
      ? {
          ...body,
          ...noticesField,
        }
      : body;
  }
  getTimeoutDiagnostics() {
    let freeMemPct = -1;
    let pongAgeMs = this.lastPongReceived > 0 ? Date.now() - this.lastPongReceived : undefined;
    return {
      free_mem_pct: freeMemPct,
      pong_age_ms: pongAgeMs,
    };
  }
  createTimeoutTimer(callId, timeoutMs) {
    let { logger, serverName, trackEvent } = this.context;
    return setTimeout(() => {
      let pendingCall = this.pendingCalls.get(callId);
      if (!pendingCall) return;
      this.timedOutCalls.set(callId, Date.now());
      if (this.timedOutCalls.size > 200) {
        let oldestCallId = this.timedOutCalls.keys().next().value;
        if (oldestCallId) this.timedOutCalls.delete(oldestCallId);
      }
      this.pendingCalls.delete(callId);
      let durationMs = Date.now() - pendingCall.startTime;
      let timeoutDiagnostics = this.getTimeoutDiagnostics();
      let routingAckReceived = pendingCall.routingAckReceived ?? false;
      logger.warn(
        `[${serverName}] Tool call timeout: ${pendingCall.toolName} (${callId.slice(0, 8)}) after ${durationMs}ms, pending calls: ${this.pendingCalls.size}`,
      );
      trackEvent?.("chrome_bridge_tool_call_timeout", {
        tool_name: `browser:${pendingCall.toolName}`,
        tool_use_id: callId,
        duration_ms: durationMs,
        timeout_ms: timeoutMs,
        session_id: pendingCall.sessionId,
        user_message_uuid: pendingCall.userMessageUuid,
        transport: "bridge",
        routing_ack_received: routingAckReceived,
        routing_ack_pong_age_ms: pendingCall.routingAckPongAgeMs ?? null,
        permission_paused: pendingCall.permissionPaused ?? false,
        ...timeoutDiagnostics,
      });
      if (this.isConnected())
        pendingCall.reject(
          new ToolCallTimeoutError(`[${serverName}] Tool call timed out: ${pendingCall.toolName}`, {
            routingAckReceived,
          }),
        );
      else
        pendingCall.reject(
          new SocketConnectionError(
            `[${serverName}] Tool call timed out with bridge disconnected: ${pendingCall.toolName}`,
          ),
        );
    }, timeoutMs);
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
  rejectPendingCalls(error) {
    for (let pendingCall of this.pendingCalls.values()) {
      clearTimeout(pendingCall.timer);
      pendingCall.reject(error);
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
//@ chunk-wpz18a52.js:29137-29171 placement
/**
 * 创建 Chrome 桥接客户端。
 */
function createChromeBridgeClient(options) {
  return new ChromeBridgeClient(options);
}
//@ chunk-wpz18a52.js:29171-29339 placement
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
var exponentialBackoff = (baseMs, attempt, maxMs) => Math.min(baseMs * 1.5 ** (attempt - 1), maxMs);
//@ chunk-wpz18a52.js:29339-29428 placement
/**
 * 按累计毫秒在节奏表里选出下一次延迟。
 */
function pickCadenceDelay({ steps, thenMs }, elapsedMs) {
  let cumulativeMs = 0;
  for (let [delayMs, stepMs] of steps) {
    cumulativeMs += stepMs;
    if (elapsedMs <= cumulativeMs) return delayMs;
  }
  return thenMs;
}
//@ chunk-wpz18a52.js:29428-29572 placement
function reconnectDelayMs(cadence, elapsedMs) {
  switch (cadence) {
    case "transport":
      return exponentialBackoff(RECONNECT_BASE_MS, elapsedMs, RECONNECT_MAX_MS);
    case "mismatch":
      return pickCadenceDelay(MISMATCH_CADENCE, elapsedMs);
    case "not_ready":
      return pickCadenceDelay(NOT_READY_CADENCE, elapsedMs);
    case "token":
      return pickCadenceDelay(TOKEN_CADENCE, elapsedMs);
  }
}
//@ chunk-wpz18a52.js:29572-29724 placement
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
//@ chunk-wpz18a52.js:29724-29882 placement
function escapeJsonForHtml(json) {
  return json
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029")
    .replace(/\u0085/g, "\\u0085");
}
//@ chunk-wpz18a52.js:29882-30202 placement
/**
 * 生成可用标签页上下文的工具结果。
 */
function tabContextResult(tabs, tabGroupId) {
  let escapeHtmlJson = (value) => escapeJsonForHtml(JSON.stringify(value));
  let joined = tabs.map((tab) => {
    let tab_2 = tab;
    return `  \u2022 tabId ${tab_2.tabId}: ${escapeHtmlJson(tab_2.title)} (${escapeHtmlJson(tab_2.url)})`;
  }).join(`
`);
  let payload = {
    availableTabs: tabs,
  };
  if (tabGroupId !== undefined) payload.tabGroupId = tabGroupId;
  return {
    result: {
      content: [
        {
          type: "text",
          text: escapeJsonForHtml(JSON.stringify(payload)),
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
//@ chunk-wpz18a52.js:30202-37178 placement
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
    for (let [socketPath, client] of this.clients.entries()) {
      if (client.isConnected()) {
        this.clearRedial(client);
        continue;
      }
      if (this.parked.has(client) || this.dialing.has(client) || this.redials.get(client)?.timer) continue;
      this.clearRedial(client);
      this.dial(socketPath, client);
    }
  }
  dial(socketPath, client) {
    this.dialing.add(client);
    let retryState = this.redials.get(client);
    if (retryState) retryState.wanted = false;
    let onDialed = (connected) => {
      this.dialing.delete(client);
      if (this.clients.get(socketPath) !== client || this.redials.get(client)?.cadence === "dead") return;
      if (connected) {
        this.clearRedial(client);
        return;
      }
      if (this.redials.get(client)?.wanted || client.isConnecting()) {
        this.onRedialWanted(socketPath, client);
        return;
      }
      let refuseCode = client.lastPairingRefuseCode();
      let refuseKind =
        refuseCode === undefined
          ? "durable"
          : pairingErrorMessage(refuseCode, client.lastPairingRefusePeerReported());
      if (refuseKind === "durable") this.parked.add(client);
      else this.onRedialWanted(socketPath, client, RETRY_KIND_BY_REASON[refuseKind]);
    };
    client.ensureConnected().then(onDialed, () => onDialed(false));
  }
  onRedialWanted(socketPath, client, cadence = "transport") {
    if (!this.unwatchSockets || this.clients.get(socketPath) !== client) return;
    if (this.orphaned.has(client)) {
      this.removeClient(socketPath, client);
      return;
    }
    let retryState = this.redials.get(client) ?? newRetryState(cadence);
    retryState.wanted = true;
    if (retryState.cadence !== cadence) {
      retryState.attempts = 0;
      retryState.cadence = cadence;
    }
    this.redials.set(client, retryState);
    if (retryState.timer) return;
    if (cadence === "transport" && retryState.attempts >= MAX_RECONNECT_ATTEMPTS) {
      this.context.logger.info(
        `[${this.context.serverName}] Giving up on ${socketPath} after ${retryState.attempts} proactive redials`,
      );
      return;
    }
    retryState.attempts += 1;
    let delayMs = reconnectDelayMs(cadence, retryState.attempts);
    retryState.timer = setTimeout(() => {
      retryState.timer = null;
      if (
        this.unwatchSockets &&
        this.clients.get(socketPath) === client &&
        !this.context.isDisabled?.() &&
        !client.isConnected() &&
        !this.dialing.has(client)
      )
        this.dial(socketPath, client);
    }, delayMs);
    retryState.timer.unref?.();
  }
  onSocketDead(socketPath, client) {
    if (!this.unwatchSockets || this.clients.get(socketPath) !== client) return;
    this.clearRedial(client);
    this.redials.set(client, newRetryState("dead"));
    this.refreshClients();
  }
  clearRedial(socketPath) {
    let retryState = this.redials.get(socketPath);
    if (retryState?.timer) clearTimeout(retryState.timer);
    this.redials.delete(socketPath);
  }
  removeClient(socketPath, client) {
    this.context.logger.info(`[${this.context.serverName}] Removing stale socket from pool: ${socketPath}`);
    this.clearRedial(client);
    this.orphaned.delete(client);
    client.disconnect();
    this.clients.delete(socketPath);
    for (let [tabId, routeSocketPath] of this.tabRoutes.entries())
      if (routeSocketPath === socketPath) this.tabRoutes.delete(tabId);
  }
  setNotificationHandler(handler) {
    this.notificationHandler = handler;
    for (let client of this.clients.values()) client.setNotificationHandler(handler);
  }
  async ensureConnected() {
    let { logger, serverName } = this.context;
    await this.refreshClients();
    let regularConnects = [];
    let stragglerConnects = [];
    for (let client of this.clients.values()) {
      if (client.isConnected()) {
        this.stragglers.delete(client);
        continue;
      }
      let isStraggler = this.stragglers.has(client);
      let connectPromise = client.ensureConnected().then(
        (connected) => {
          if (connected) this.stragglers.delete(client);
          else this.stragglers.add(client);
          return connected;
        },
        () => {
          this.stragglers.add(client);
          return false;
        },
      );
      (isStraggler ? stragglerConnects : regularConnects).push(connectPromise);
    }
    await Promise.all(regularConnects);
    if (this.getConnectedClients().length === 0) await Promise.all(stragglerConnects);
    let connectedCount = this.getConnectedClients().length;
    if (connectedCount === 0) {
      logger.info(`[${serverName}] No connected sockets in pool`);
      return false;
    }
    logger.info(`[${serverName}] Socket pool: ${connectedCount} connected`);
    return true;
  }
  async callTool(toolName, args, options) {
    if (toolName === "tabs_context_mcp") return this.callTabsContext(args, options);
    let tabId = args.tabId;
    if (tabId !== undefined) {
      let routedSocketPath = this.tabRoutes.get(tabId);
      if (routedSocketPath) {
        let routedClient = this.clients.get(routedSocketPath);
        if (routedClient?.isConnected()) return routedClient.callTool(toolName, args, options);
      }
    }
    let connectedClients = this.getConnectedClients();
    if (connectedClients.length === 0)
      throw new SocketConnectionError(`[${this.context.serverName}] No connected sockets available`);
    return connectedClients[0].callTool(toolName, args, options);
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
  async callTabsContext(args, options) {
    let { logger, serverName } = this.context;
    let connectedClients = this.getConnectedClients();
    if (connectedClients.length === 0)
      throw new SocketConnectionError(`[${serverName}] No connected sockets available`);
    if (connectedClients.length === 1) {
      let result = await connectedClients[0].callTool("tabs_context_mcp", args, options);
      this.updateTabRoutes(result, this.getSocketPathForClient(connectedClients[0]));
      return result;
    }
    let settled = await Promise.allSettled(
      connectedClients.map(async (client) => {
        let result = await client.callTool("tabs_context_mcp", args, options);
        let socketPath = this.getSocketPathForClient(client);
        return {
          result,
          socketPath,
        };
      }),
    );
    let tabs = [];
    let tabGroupId;
    this.tabRoutes.clear();
    for (let settledResult of settled) {
      if (settledResult.status !== "fulfilled") {
        logger.info(`[${serverName}] tabs_context_mcp failed on one socket: ${settledResult.reason}`);
        continue;
      }
      let { result, socketPath } = settledResult.value;
      this.updateTabRoutes(result, socketPath);
      let socketTabs = this.extractTabs(result);
      if (socketTabs) for (let tab of socketTabs) tabs.push(tab);
      if (tabGroupId === undefined) tabGroupId = this.extractTabGroupId(result);
    }
    if (tabs.length > 0) return tabContextResult(tabs, tabGroupId);
    for (let settledResult of settled)
      if (settledResult.status === "fulfilled") return settledResult.value.result;
    throw new SocketConnectionError(`[${serverName}] All sockets failed for tabs_context_mcp`);
  }
  updateTabRoutes(result, socketPath) {
    let tabs = this.extractTabs(result);
    if (!tabs) return;
    for (let tab of tabs)
      if (typeof tab === "object" && tab !== null && "tabId" in tab) {
        let tabId = tab.tabId;
        this.tabRoutes.set(tabId, socketPath);
      }
  }
  extractTabs(result) {
    if (!result || typeof result !== "object") return null;
    let content = result.result?.content;
    if (!content || !Array.isArray(content)) return null;
    for (let contentBlock of content)
      if (contentBlock.type === "text" && contentBlock.text)
        try {
          let parsed = JSON.parse(contentBlock.text);
          if (Array.isArray(parsed)) return parsed;
          let parsed_2 = parsed;
          if (parsed_2 && Array.isArray(parsed_2.availableTabs)) return parsed_2.availableTabs;
        } catch {}
    return null;
  }
  extractTabGroupId(result) {
    if (!result || typeof result !== "object") return;
    let content = result.result?.content;
    if (!content || !Array.isArray(content)) return;
    for (let contentBlock of content)
      if (contentBlock.type === "text" && contentBlock.text)
        try {
          let parsed = JSON.parse(contentBlock.text);
          if (typeof parsed.tabGroupId === "number") return parsed.tabGroupId;
        } catch {}
    return;
  }
  getSocketPathForClient(client) {
    for (let [socketPath, pooledClient] of this.clients.entries())
      if (pooledClient === client) return socketPath;
    return "";
  }
  refreshClients() {
    if (!this.refreshPromise) {
      let refreshPromise = this.doRefreshClients().finally(() => {
        if (this.refreshPromise === refreshPromise) this.refreshPromise = null;
      });
      this.refreshPromise = refreshPromise;
    }
    return this.refreshPromise;
  }
  async doRefreshClients() {
    let { logger, serverName } = this.context;
    let generation = this.generation;
    let socketPaths;
    try {
      socketPaths = (await this.context.getSocketPaths?.()) ?? [];
    } catch (error) {
      logger.info(`[${serverName}] Socket scan failed:`, error);
      return;
    }
    if (generation !== this.generation) return;
    for (let socketPath of socketPaths)
      if (!this.clients.has(socketPath)) {
        logger.info(`[${serverName}] Adding socket to pool: ${socketPath}`);
        let clientContext = {
          ...this.context,
          socketPath,
          getSocketPath: undefined,
          getSocketPaths: undefined,
        };
        let chromeSocketClient = createChromeSocketClient(clientContext);
        chromeSocketClient.disableAutoReconnect = true;
        chromeSocketClient.onRedialWanted = (cadence) =>
          cadence === "dead"
            ? this.onSocketDead(socketPath, chromeSocketClient)
            : this.onRedialWanted(
                socketPath,
                chromeSocketClient,
                cadence === "peer_dropped" ? "not_ready" : "transport",
              );
        if (this.notificationHandler) chromeSocketClient.setNotificationHandler(this.notificationHandler);
        this.clients.set(socketPath, chromeSocketClient);
      }
    for (let [socketPath, client] of this.clients.entries())
      if (socketPaths.includes(socketPath)) this.orphaned.delete(client);
      else if (client.isConnected()) this.orphaned.add(client);
      else this.removeClient(socketPath, client);
  }
}
//@ chunk-wpz18a52.js:37178-37210 placement
/**
 * 创建本机 Chrome 桥接连接池。
 */
function createLocalChromeBridgePool(context) {
  return new LocalChromeBridgePool(context);
}
export { createChromeBridgeClient, createLocalChromeBridgePool, ChromeBridgeClient, platformDisplayName };

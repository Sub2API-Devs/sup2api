/**
 * entrypoints/selfHostedRunner/scmConnector.ts
 *
 * 2.1.316 新增：runner 的 SCM 连接器（主机改写、拨号地址、路径校验）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h7hgs1mf.js (9)
 * attribution: placement 9
 */
import { readFile } from "fs/promises";
import { redactSecretsInText } from "../../utils/redactSecrets.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { errorMessage } from "../../utils/errors.js";
import { withBoundedTimeout } from "../../utils/boundedTimeout.js";
import { getWebSocketProxyUrl } from "../../utils/proxy.js";
import { getWebSocketTLSOptions } from "../../utils/mtls.js";

//@ chunk-h7hgs1mf.js:12893-13190 placement
var SCM_CONNECTOR_CONSTANTS = "/v1/code/scm-connectors/{provider}/{id}/tunnel";
var PROXY_PORT = 4003;
var CONNECT_TIMEOUT_MS = 30000;
var RETRY_BASE_MS = 1000;
var REQUEST_TIMEOUT_MS = 30000;
var HEAD_TIMEOUT_MS = 1e4;
var IDLE_TIMEOUT_MS = 30000;
var MAX_HEADER_BYTES = 32768;
var MAX_BODY_BYTES = 4194304;
var MAX_BUFFER_BYTES = 1048576;
var MAX_SOCKETS = 50;
var UPSTREAM_TIMEOUT_MS = 30000;
var CONNECT_WAIT_MS = 1e4;
var ALLOWED_METHODS = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]);
var HOP_BY_HOP_HEADERS = new Set(["host", "connection", "content-length", "transfer-encoding"]);
//@ chunk-h7hgs1mf.js:13190-13867 placement
function parseScmConnectorHost(value) {
  if (value.includes("://") || value.includes("/") || value.includes("@"))
    throw Error("--scm-connector-host expects a bare hostname (e.g. ghe.example.com[:443]), not a URL");
  let index = value.lastIndexOf(":");
  let isBracketed = value.startsWith("[");
  let host;
  let port = 443;
  if (index > 0 && (!isBracketed || (isBracketed && value[index - 1] === "]"))) {
    host = value.slice(0, index);
    let sliced = value.slice(index + 1);
    let portValue = parseInt(sliced, 10);
    if (Number.isNaN(portValue) || portValue < 1 || portValue > 65535 || String(portValue) !== sliced)
      throw Error("--scm-connector-host port must be an integer in [1, 65535]");
    port = portValue;
  } else host = value;
  if (host.length === 0) throw Error("--scm-connector-host: hostname is empty");
  if (host.includes(":") && !(host.startsWith("[") && host.endsWith("]")))
    throw Error("--scm-connector-host: hostname must be a bare hostname or [v6] literal");
  return {
    host,
    port,
  };
}
//@ chunk-h7hgs1mf.js:13867-14261 placement
function parseScmHostRewrite(value) {
  let index = value.indexOf("=");
  if (index <= 0 || index === value.length - 1)
    throw Error("--scm-connector-host-rewrite requires <from>=<to_host:to_port>");
  let lower = value.slice(0, index).toLowerCase();
  let sliced = value.slice(index + 1);
  for (let side of [lower, sliced])
    if (side.includes("://") || side.includes("/") || side.includes("@"))
      throw Error("--scm-connector-host-rewrite expects bare hostnames, not URLs");
  let { host, port } = parseScmConnectorHost(sliced);
  return {
    from: lower,
    toHost: host,
    toPort: port,
  };
}
//@ chunk-h7hgs1mf.js:14261-14588 placement
function validateScmPath(path) {
  if (typeof path !== "string" || path.length === 0) return "path must be a non-empty string";
  if (path[0] !== "/") return "path must start with /";
  if (path[1] === "/") return "path must not start with // (scheme-relative)";
  if (path[1] === "@") return "path must not start with /@";
  if (path.includes("\\")) return "path must not contain backslash";
  return null;
}
//@ chunk-h7hgs1mf.js:14588-14973 placement
function scmDialUrl(host, port, path) {
  let url = new URL("https://placeholder.invalid/");
  url.host = `${host}:${port}`;
  if (url.hostname === "placeholder.invalid") throw Error("scm-connector dial host is not a valid URL host");
  let origin = url.origin;
  let index = path.indexOf("?");
  url.pathname = index >= 0 ? path.slice(0, index) : path;
  url.search = index >= 0 ? path.slice(index) : "";
  if (url.origin !== origin || url.username !== "" || url.password !== "")
    throw Error("path escaped the configured origin");
  return url;
}
//@ chunk-h7hgs1mf.js:14973-15142 placement
function scmConnectorWsUrl(apiUrl, connector) {
  let replaced = SCM_CONNECTOR_CONSTANTS.replace(
    "{provider}",
    encodeURIComponent(connector.provider),
  ).replace("{id}", String(connector.connectorId));
  return apiUrl.replace(/^http/, "ws").replace(/\/+$/, "") + replaced;
}
//@ chunk-h7hgs1mf.js:15142-15247 placement
function newScmConnectorStatus() {
  return {
    connected: false,
    last_connected_at: 0,
    last_error: null,
    reconnects: 0,
    requests_forwarded: 0,
  };
}
//@ chunk-h7hgs1mf.js:15247-20322 placement
/**
 * SCM 连接器隧道：通过 /v1/code/scm-connectors/.../tunnel WebSocket 把服务器请求转发到内网 Git 主机。
 */
function startScmConnector(connector, scmConnector, context, signal) {
  let wsUrl = scmConnectorWsUrl(context.apiUrl, connector);
  let dialHost =
    connector.hostRewrite && connector.hostRewrite.from === connector.host.toLowerCase()
      ? connector.hostRewrite.toHost
      : connector.host;
  let dialPort =
    connector.hostRewrite && connector.hostRewrite.from === connector.host.toLowerCase()
      ? connector.hostRewrite.toPort
      : connector.port;
  let isStopped = false;
  let socket = null;
  let pingTimer = null;
  let reconnectTimer = null;
  let openTimer = null;
  let retryDelayMs = RETRY_BASE_MS;
  let lastConnectedAt = 0;
  let caCert;
  let hasLoadedCert = connector.caFile === undefined;
  let inflightRequests = new Map();
  let setLastError = (message) => {
    scmConnector.last_error = redactSecretsInText(message);
  };
  let status = (text) => context.onStatus(`[runner:scm-connector] ${text}`);
  let debug = (text) => context.onDebug(`[runner:scm-connector] ${text}`);
  function send(payload) {
    let ws = socket;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    try {
      ws.send(jsonStringify(payload));
    } catch (error) {
      setLastError(errorMessage(error));
      status(`send failed: ${errorMessage(error)}`);
    }
  }
  function sendHttpError(requestId, errorMessage) {
    send({
      httpError: {
        requestId,
        errorMessage,
      },
    });
  }
  function waitForDrain(signal) {
    let ws = socket;
    if (!ws || ws.readyState !== WebSocket.OPEN || ws.bufferedAmount <= MAX_BODY_BYTES)
      return Promise.resolve();
    return new Promise((resolve) => {
      let interval = setInterval(() => {
        if (
          isStopped ||
          signal.aborted ||
          socket !== ws ||
          ws.readyState !== WebSocket.OPEN ||
          ws.bufferedAmount <= MAX_BUFFER_BYTES
        ) {
          clearInterval(interval);
          resolve();
        }
      }, MAX_SOCKETS);
    });
  }
  async function forwardHttpRequest(httpRequest) {
    let requestId = httpRequest.requestId;
    if (!requestId) return;
    if (httpRequest.port !== undefined && httpRequest.port !== 0 && httpRequest.port !== connector.port) {
      sendHttpError(
        requestId,
        `port ${httpRequest.port} does not match this connector's configured port ${connector.port}`,
      );
      return;
    }
    let pathError = validateScmPath(httpRequest.path);
    if (pathError) {
      sendHttpError(requestId, pathError);
      return;
    }
    let path = httpRequest.path;
    let upper = (httpRequest.method ?? "GET").toUpperCase();
    if (!ALLOWED_METHODS.has(upper)) {
      sendHttpError(requestId, "method not allowed");
      return;
    }
    let upstreamUrl;
    try {
      upstreamUrl = scmDialUrl(dialHost, dialPort, path);
    } catch (error) {
      sendHttpError(requestId, errorMessage(error));
      return;
    }
    let abortController = new AbortController();
    inflightRequests.set(requestId, abortController);
    let timer = setTimeout((controller) => controller.abort(), UPSTREAM_TIMEOUT_MS, abortController);
    let response;
    try {
      let headers = new Headers();
      for (let header of httpRequest.headers ?? []) {
        if (!header.name || HOP_BY_HOP_HEADERS.has(header.name.toLowerCase())) continue;
        headers.append(header.name, header.value ?? "");
      }
      headers.set("Host", connector.port === 443 ? connector.host : `${connector.host}:${connector.port}`);
      let body =
        httpRequest.body !== undefined && httpRequest.body !== ""
          ? Buffer.from(httpRequest.body, "base64")
          : undefined;
      response = await fetch(upstreamUrl, {
        method: upper,
        headers,
        body,
        redirect: "manual",
        signal: abortController.signal,
        tls:
          caCert !== undefined || dialHost !== connector.host
            ? {
                ca: caCert,
                serverName: connector.host,
              }
            : undefined,
      });
    } catch (error) {
      clearTimeout(timer);
      inflightRequests.delete(requestId);
      setLastError(`forward to ${connector.host}: ${errorMessage(error)}`);
      sendHttpError(requestId, errorMessage(error));
      return;
    }
    clearTimeout(timer);
    let headerList = [];
    response.headers.forEach((value, name) => {
      headerList.push({
        name,
        value,
      });
    });
    let sequenceNumber = 0;
    send({
      httpHeaders: {
        requestId,
        statusCode: response.status,
        statusText: response.statusText || String(response.status),
        headers: headerList,
        sequenceNumber,
      },
    });
    sequenceNumber++;
    try {
      if (response.body) {
        let reader = response.body.getReader();
        for (;;) {
          await waitForDrain(abortController.signal);
          if (abortController.signal.aborted) {
            await reader.cancel();
            break;
          }
          let readResult = await reader.read();
          if (readResult.value && readResult.value.length > 0)
            for (let offset = 0; offset < readResult.value.length; offset += MAX_HEADER_BYTES) {
              let chunk = readResult.value.subarray(offset, offset + MAX_HEADER_BYTES);
              send({
                httpChunk: {
                  requestId,
                  data: Buffer.from(chunk).toString("base64"),
                  isFinal: false,
                  sequenceNumber,
                },
              });
              sequenceNumber++;
            }
          if (readResult.done) break;
          if (abortController.signal.aborted) {
            await reader.cancel();
            break;
          }
        }
      }
      send({
        httpChunk: {
          requestId,
          data: "",
          isFinal: true,
          sequenceNumber,
        },
      });
      scmConnector.requests_forwarded++;
    } catch (error) {
      sendHttpError(requestId, `error reading GHES response body: ${errorMessage(error)}`);
    } finally {
      inflightRequests.delete(requestId);
    }
  }
  function handleTunnelMessage(text) {
    let message;
    try {
      message = jsonParse(text);
    } catch (error) {
      status(`failed to parse tunnel request: ${errorMessage(error)}`);
      return;
    }
    if (message.httpRequest)
      forwardHttpRequest(message.httpRequest).catch((error) => {
        setLastError(errorMessage(error));
        status(`handleHttpRequest failed: ${errorMessage(error)}`);
      });
    else if (message.httpCancel) {
      let requestId = message.httpCancel.requestId;
      if (requestId) {
        inflightRequests.get(requestId)?.abort();
        inflightRequests.delete(requestId);
      }
    } else if (message.wsOpen)
      send({
        wsError: {
          tunnelId: message.wsOpen.tunnelId ?? "",
          errorMessage: "WebSocket tunnel is not supported by the SCM connector",
        },
      });
    else if (message.ptyOpen)
      send({
        ptyError: {
          tunnelId: message.ptyOpen.tunnelId ?? "",
          errorMessage: "PTY tunnel is not supported by the SCM connector",
        },
      });
  }
  function scheduleReconnect(code) {
    if (isStopped) return;
    scmConnector.reconnects++;
    let delayMs;
    if (code === PROXY_PORT) {
      delayMs = CONNECT_TIMEOUT_MS;
      status(
        `standby (close code ${code}): another orchestrator holds connector ${connector.connectorId}; retrying in ${delayMs / 1000}s`,
      );
    } else {
      if (lastConnectedAt > 0 && Date.now() - lastConnectedAt > REQUEST_TIMEOUT_MS)
        retryDelayMs = RETRY_BASE_MS;
      delayMs = retryDelayMs + Math.floor(Math.random() * (retryDelayMs / 2));
      retryDelayMs = Math.min(retryDelayMs * 2, REQUEST_TIMEOUT_MS);
      debug(`reconnecting in ${delayMs}ms`);
    }
    lastConnectedAt = 0;
    reconnectTimer = setTimeout(connect, delayMs);
  }
  function connect() {
    if (isStopped) return;
    reconnectTimer = null;
    if (!hasLoadedCert)
      withBoundedTimeout(
        readFile(connector.caFile, "utf8"),
        CONNECT_WAIT_MS,
        `--scm-connector-ca-file read from ${connector.caFile}`,
      )
        .then((certData) => {
          caCert = certData;
          hasLoadedCert = true;
        })
        .catch((error) => {
          setLastError(`reading --scm-connector-ca-file: ${errorMessage(error)}`);
          status(`reading --scm-connector-ca-file: ${errorMessage(error)}`);
        });
    let ws;
    try {
      ws = new globalThis.WebSocket(wsUrl, {
        headers: {
          Authorization: `Bearer ${context.poolSecret}`,
        },
        proxy: getWebSocketProxyUrl(wsUrl),
        tls: getWebSocketTLSOptions(undefined) || undefined,
      });
    } catch (error) {
      setLastError(errorMessage(error));
      status(`WebSocket construct failed: ${errorMessage(error)}`);
      scheduleReconnect();
      return;
    }
    socket = ws;
    openTimer = setTimeout(
      (staleWs) => {
        setLastError("WebSocket open timeout");
        staleWs.onopen = staleWs.onmessage = staleWs.onerror = staleWs.onclose = null;
        try {
          staleWs.close();
        } catch {}
        if (socket === staleWs) socket = null;
        scheduleReconnect();
      },
      HEAD_TIMEOUT_MS,
      ws,
    );
    ws.onopen = () => {
      if (openTimer) {
        clearTimeout(openTimer);
        openTimer = null;
      }
      scmConnector.connected = true;
      scmConnector.last_connected_at = Date.now();
      scmConnector.last_error = null;
      lastConnectedAt = Date.now();
      status(
        `connected provider=${connector.provider} connector_id=${connector.connectorId} forward=${connector.host}:${connector.port}${dialHost !== connector.host ? ` (dial=${dialHost}:${dialPort})` : ""}`,
      );
      pingTimer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) ws.ping?.();
      }, IDLE_TIMEOUT_MS);
    };
    ws.onmessage = (event) => {
      let text = typeof event.data === "string" ? event.data : Buffer.from(event.data).toString("utf8");
      handleTunnelMessage(text);
    };
    ws.onerror = (event) => {
      setLastError(
        "message" in event && typeof event.message === "string" ? event.message : "WebSocket error",
      );
    };
    ws.onclose = (closeEvent) => {
      scmConnector.connected = false;
      if (openTimer) {
        clearTimeout(openTimer);
        openTimer = null;
      }
      if (pingTimer) {
        clearInterval(pingTimer);
        pingTimer = null;
      }
      for (let controller of inflightRequests.values()) controller.abort();
      inflightRequests.clear();
      if (socket === ws) socket = null;
      if (closeEvent.code !== PROXY_PORT)
        status(`closed code=${closeEvent.code} reason=${closeEvent.reason || "(none)"}`);
      scheduleReconnect(closeEvent.code);
    };
  }
  function stop() {
    if (isStopped) return;
    isStopped = true;
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (openTimer) {
      clearTimeout(openTimer);
      openTimer = null;
    }
    if (pingTimer) {
      clearInterval(pingTimer);
      pingTimer = null;
    }
    for (let controller of inflightRequests.values()) controller.abort();
    inflightRequests.clear();
    scmConnector.connected = false;
    try {
      socket?.close();
    } catch {}
    socket = null;
    status("stopped");
  }
  signal?.addEventListener("abort", stop, {
    once: true,
  });
  status(`starting provider=${connector.provider} connector_id=${connector.connectorId} url=${wsUrl}`);
  connect();
  return {
    stop,
  };
}
//@ chunk-h7hgs1mf.js:20322-20537 placement
var RUNNER_DEFAULTS = "https://api.anthropic.com";
var HANDSHAKE_POLL_MS = 1500;
var DEFAULT_LISTEN_PORT = 8080;
var MAX_CONNECT_ATTEMPTS = 4;
var HANDSHAKE_TIMEOUT_MS = 60000;
var MAX_IDLE_SECONDS = 120;
var CONNECT_RETRY_MS = 1e4;
var SCM_TIMEOUT_MS = 60000;
var KEEPALIVE_MS = 5000;
var BACKOFF_JITTER_MS = 500;
var REPORT_INTERVAL_MS = 2000;
var MAX_CONNECTION_SECONDS = 3600;
var BACKOFF_RATIO = 0.2;
var MIN_BACKOFF_MS = 1000;
var BACKOFF_MAX_MS = 30000;
var RETRYABLE_STATUS = new Set([400, 401, 403, 404, 426]);
var BACKOFF_SCHEDULE = [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 20, 30, 60];
export {
  BACKOFF_SCHEDULE,
  RUNNER_DEFAULTS,
  DEFAULT_LISTEN_PORT,
  MAX_CONNECT_ATTEMPTS,
  HANDSHAKE_TIMEOUT_MS,
  MAX_IDLE_SECONDS,
  parseScmConnectorHost,
  parseScmHostRewrite,
  MAX_CONNECTION_SECONDS,
  HANDSHAKE_POLL_MS,
  BACKOFF_RATIO,
  KEEPALIVE_MS,
  BACKOFF_JITTER_MS,
  REPORT_INTERVAL_MS,
  MIN_BACKOFF_MS,
  RETRYABLE_STATUS,
  BACKOFF_MAX_MS,
  SCM_TIMEOUT_MS,
  newScmConnectorStatus,
  startScmConnector,
  CONNECT_RETRY_MS,
};

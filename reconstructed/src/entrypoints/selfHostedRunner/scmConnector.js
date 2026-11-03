/**
 * entrypoints/selfHostedRunner/scmConnector.ts
 *
 * 2.1.316 新增：runner 的 SCM 连接器（主机改写、拨号地址、路径校验）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2cbdmxy9.js (9)
 * attribution: placement 9
 */
import { readFile } from "fs/promises";
import { redactSecretsInText } from "../../utils/redactSecrets.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { errorMessage } from "../../utils/errors.js";
import { withBoundedTimeout } from "../../utils/boundedTimeout.js";
import { getWebSocketProxyUrl } from "../../utils/proxy.js";
import { getWebSocketTLSOptions } from "../../utils/mtls.js";

//@ chunk-2cbdmxy9.js:12063-12360 placement
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
//@ chunk-2cbdmxy9.js:12360-13037 placement
function parseScmConnectorHost(e) {
  if (e.includes("://") || e.includes("/") || e.includes("@"))
    throw Error("--scm-connector-host expects a bare hostname (e.g. ghe.example.com[:443]), not a URL");
  let index = e.lastIndexOf(":");
  let r = e.startsWith("[");
  let n;
  let port = 443;
  if (index > 0 && (!r || (r && e[index - 1] === "]"))) {
    n = e.slice(0, index);
    let sliced = e.slice(index + 1);
    let l = parseInt(sliced, 10);
    if (Number.isNaN(l) || l < 1 || l > 65535 || String(l) !== sliced)
      throw Error("--scm-connector-host port must be an integer in [1, 65535]");
    port = l;
  } else n = e;
  if (n.length === 0) throw Error("--scm-connector-host: hostname is empty");
  if (n.includes(":") && !(n.startsWith("[") && n.endsWith("]")))
    throw Error("--scm-connector-host: hostname must be a bare hostname or [v6] literal");
  return {
    host: n,
    port,
  };
}
//@ chunk-2cbdmxy9.js:13037-13431 placement
function parseScmHostRewrite(e) {
  let index = e.indexOf("=");
  if (index <= 0 || index === e.length - 1)
    throw Error("--scm-connector-host-rewrite requires <from>=<to_host:to_port>");
  let lower = e.slice(0, index).toLowerCase();
  let sliced = e.slice(index + 1);
  for (let l of [lower, sliced])
    if (l.includes("://") || l.includes("/") || l.includes("@"))
      throw Error("--scm-connector-host-rewrite expects bare hostnames, not URLs");
  let { host, port } = parseScmConnectorHost(sliced);
  return {
    from: lower,
    toHost: host,
    toPort: port,
  };
}
//@ chunk-2cbdmxy9.js:13431-13758 placement
function validateScmPath(path) {
  if (typeof path !== "string" || path.length === 0) return "path must be a non-empty string";
  if (path[0] !== "/") return "path must start with /";
  if (path[1] === "/") return "path must not start with // (scheme-relative)";
  if (path[1] === "@") return "path must not start with /@";
  if (path.includes("\\")) return "path must not contain backslash";
  return null;
}
//@ chunk-2cbdmxy9.js:13758-14143 placement
function scmDialUrl(e, t, path) {
  let n = new URL("https://placeholder.invalid/");
  n.host = `${e}:${t}`;
  if (n.hostname === "placeholder.invalid") throw Error("scm-connector dial host is not a valid URL host");
  let origin = n.origin;
  let index = path.indexOf("?");
  n.pathname = index >= 0 ? path.slice(0, index) : path;
  n.search = index >= 0 ? path.slice(index) : "";
  if (n.origin !== origin || n.username !== "" || n.password !== "")
    throw Error("path escaped the configured origin");
  return n;
}
//@ chunk-2cbdmxy9.js:14143-14312 placement
function scmConnectorWsUrl(apiUrl, t) {
  let replaced = SCM_CONNECTOR_CONSTANTS.replace("{provider}", encodeURIComponent(t.provider)).replace(
    "{id}",
    String(t.connectorId),
  );
  return apiUrl.replace(/^http/, "ws").replace(/\/+$/, "") + replaced;
}
//@ chunk-2cbdmxy9.js:14312-14417 placement
function newScmConnectorStatus() {
  return {
    connected: false,
    last_connected_at: 0,
    last_error: null,
    reconnects: 0,
    requests_forwarded: 0,
  };
}
//@ chunk-2cbdmxy9.js:14417-19492 placement
/**
 * SCM 连接器隧道：通过 /v1/code/scm-connectors/.../tunnel WebSocket 把服务器请求转发到内网 Git 主机。
 */
function startScmConnector(scmConnector, scmConnector_2, r, signal) {
  let h = scmConnectorWsUrl(r.apiUrl, scmConnector);
  let o =
    scmConnector.hostRewrite && scmConnector.hostRewrite.from === scmConnector.host.toLowerCase()
      ? scmConnector.hostRewrite.toHost
      : scmConnector.host;
  let l =
    scmConnector.hostRewrite && scmConnector.hostRewrite.from === scmConnector.host.toLowerCase()
      ? scmConnector.hostRewrite.toPort
      : scmConnector.port;
  let g = false;
  let c = null;
  let S = null;
  let s = null;
  let u = null;
  let U = RETRY_BASE_MS;
  let j = 0;
  let H;
  let W = scmConnector.caFile === undefined;
  let T = new Map();
  let D = (m) => {
    scmConnector_2.last_error = redactSecretsInText(m);
  };
  let w = (m) => r.onStatus(`[runner:scm-connector] ${m}`);
  let x = (m) => r.onDebug(`[runner:scm-connector] ${m}`);
  function O(m) {
    let a = c;
    if (!a || a.readyState !== WebSocket.OPEN) return;
    try {
      a.send(jsonStringify(m));
    } catch (error) {
      D(errorMessage(error));
      w(`send failed: ${errorMessage(error)}`);
    }
  }
  function I(requestId, errorMessage) {
    O({
      httpError: {
        requestId,
        errorMessage,
      },
    });
  }
  function G(signal) {
    let a = c;
    if (!a || a.readyState !== WebSocket.OPEN || a.bufferedAmount <= MAX_BODY_BYTES) return Promise.resolve();
    return new Promise((resolve) => {
      let interval = setInterval(() => {
        if (
          g ||
          signal.aborted ||
          c !== a ||
          a.readyState !== WebSocket.OPEN ||
          a.bufferedAmount <= MAX_BUFFER_BYTES
        ) {
          clearInterval(interval);
          resolve();
        }
      }, MAX_SOCKETS);
    });
  }
  async function L(httpRequest) {
    let requestId = httpRequest.requestId;
    if (!requestId) return;
    if (httpRequest.port !== undefined && httpRequest.port !== 0 && httpRequest.port !== scmConnector.port) {
      I(
        requestId,
        `port ${httpRequest.port} does not match this connector's configured port ${scmConnector.port}`,
      );
      return;
    }
    let f = validateScmPath(httpRequest.path);
    if (f) {
      I(requestId, f);
      return;
    }
    let path = httpRequest.path;
    let upper = (httpRequest.method ?? "GET").toUpperCase();
    if (!ALLOWED_METHODS.has(upper)) {
      I(requestId, "method not allowed");
      return;
    }
    let R;
    try {
      R = scmDialUrl(o, l, path);
    } catch (error) {
      I(requestId, errorMessage(error));
      return;
    }
    let abortController = new AbortController();
    T.set(requestId, abortController);
    let timer = setTimeout((y) => y.abort(), UPSTREAM_TIMEOUT_MS, abortController);
    let F;
    try {
      let headers = new Headers();
      for (let C of httpRequest.headers ?? []) {
        if (!C.name || HOP_BY_HOP_HEADERS.has(C.name.toLowerCase())) continue;
        headers.append(C.name, C.value ?? "");
      }
      headers.set(
        "Host",
        scmConnector.port === 443 ? scmConnector.host : `${scmConnector.host}:${scmConnector.port}`,
      );
      let body =
        httpRequest.body !== undefined && httpRequest.body !== ""
          ? Buffer.from(httpRequest.body, "base64")
          : undefined;
      F = await fetch(R, {
        method: upper,
        headers,
        body,
        redirect: "manual",
        signal: abortController.signal,
        tls:
          H !== undefined || o !== scmConnector.host
            ? {
                ca: H,
                serverName: scmConnector.host,
              }
            : undefined,
      });
    } catch (error) {
      clearTimeout(timer);
      T.delete(requestId);
      D(`forward to ${scmConnector.host}: ${errorMessage(error)}`);
      I(requestId, errorMessage(error));
      return;
    }
    clearTimeout(timer);
    let Q = [];
    F.headers.forEach((value, name) => {
      Q.push({
        name,
        value,
      });
    });
    let P = 0;
    O({
      httpHeaders: {
        requestId,
        statusCode: F.status,
        statusText: F.statusText || String(F.status),
        headers: Q,
        sequenceNumber: P,
      },
    });
    P++;
    try {
      if (F.body) {
        let reader = F.body.getReader();
        for (;;) {
          await G(abortController.signal);
          if (abortController.signal.aborted) {
            await reader.cancel();
            break;
          }
          let A = await reader.read();
          if (A.value && A.value.length > 0)
            for (let C = 0; C < A.value.length; C += MAX_HEADER_BYTES) {
              let chunk = A.value.subarray(C, C + MAX_HEADER_BYTES);
              O({
                httpChunk: {
                  requestId,
                  data: Buffer.from(chunk).toString("base64"),
                  isFinal: false,
                  sequenceNumber: P,
                },
              });
              P++;
            }
          if (A.done) break;
          if (abortController.signal.aborted) {
            await reader.cancel();
            break;
          }
        }
      }
      O({
        httpChunk: {
          requestId,
          data: "",
          isFinal: true,
          sequenceNumber: P,
        },
      });
      scmConnector_2.requests_forwarded++;
    } catch (error) {
      I(requestId, `error reading GHES response body: ${errorMessage(error)}`);
    } finally {
      T.delete(requestId);
    }
  }
  function B(m) {
    let a;
    try {
      a = jsonParse(m);
    } catch (error) {
      w(`failed to parse tunnel request: ${errorMessage(error)}`);
      return;
    }
    if (a.httpRequest)
      L(a.httpRequest).catch((error) => {
        D(errorMessage(error));
        w(`handleHttpRequest failed: ${errorMessage(error)}`);
      });
    else if (a.httpCancel) {
      let requestId = a.httpCancel.requestId;
      if (requestId) {
        T.get(requestId)?.abort();
        T.delete(requestId);
      }
    } else if (a.wsOpen)
      O({
        wsError: {
          tunnelId: a.wsOpen.tunnelId ?? "",
          errorMessage: "WebSocket tunnel is not supported by the SCM connector",
        },
      });
    else if (a.ptyOpen)
      O({
        ptyError: {
          tunnelId: a.ptyOpen.tunnelId ?? "",
          errorMessage: "PTY tunnel is not supported by the SCM connector",
        },
      });
  }
  function q(code) {
    if (g) return;
    scmConnector_2.reconnects++;
    let a;
    if (code === PROXY_PORT) {
      a = CONNECT_TIMEOUT_MS;
      w(
        `standby (close code ${code}): another orchestrator holds connector ${scmConnector.connectorId}; retrying in ${a / 1000}s`,
      );
    } else {
      if (j > 0 && Date.now() - j > REQUEST_TIMEOUT_MS) U = RETRY_BASE_MS;
      a = U + Math.floor(Math.random() * (U / 2));
      U = Math.min(U * 2, REQUEST_TIMEOUT_MS);
      x(`reconnecting in ${a}ms`);
    }
    j = 0;
    s = setTimeout(b, a);
  }
  function b() {
    if (g) return;
    s = null;
    if (!W)
      withBoundedTimeout(
        readFile(scmConnector.caFile, "utf8"),
        CONNECT_WAIT_MS,
        `--scm-connector-ca-file read from ${scmConnector.caFile}`,
      )
        .then((a) => {
          H = a;
          W = true;
        })
        .catch((error) => {
          D(`reading --scm-connector-ca-file: ${errorMessage(error)}`);
          w(`reading --scm-connector-ca-file: ${errorMessage(error)}`);
        });
    let m;
    try {
      m = new globalThis.WebSocket(h, {
        headers: {
          Authorization: `Bearer ${r.poolSecret}`,
        },
        proxy: getWebSocketProxyUrl(h),
        tls: getWebSocketTLSOptions(undefined) || undefined,
      });
    } catch (error) {
      D(errorMessage(error));
      w(`WebSocket construct failed: ${errorMessage(error)}`);
      q();
      return;
    }
    c = m;
    u = setTimeout(
      (a) => {
        D("WebSocket open timeout");
        a.onopen = a.onmessage = a.onerror = a.onclose = null;
        try {
          a.close();
        } catch {}
        if (c === a) c = null;
        q();
      },
      HEAD_TIMEOUT_MS,
      m,
    );
    m.onopen = () => {
      if (u) {
        clearTimeout(u);
        u = null;
      }
      scmConnector_2.connected = true;
      scmConnector_2.last_connected_at = Date.now();
      scmConnector_2.last_error = null;
      j = Date.now();
      w(
        `connected provider=${scmConnector.provider} connector_id=${scmConnector.connectorId} forward=${scmConnector.host}:${scmConnector.port}${o !== scmConnector.host ? ` (dial=${o}:${l})` : ""}`,
      );
      S = setInterval(() => {
        if (m.readyState === WebSocket.OPEN) m.ping?.();
      }, IDLE_TIMEOUT_MS);
    };
    m.onmessage = (a) => {
      let f = typeof a.data === "string" ? a.data : Buffer.from(a.data).toString("utf8");
      B(f);
    };
    m.onerror = (a) => {
      D("message" in a && typeof a.message === "string" ? a.message : "WebSocket error");
    };
    m.onclose = (a) => {
      scmConnector_2.connected = false;
      if (u) {
        clearTimeout(u);
        u = null;
      }
      if (S) {
        clearInterval(S);
        S = null;
      }
      for (let f of T.values()) f.abort();
      T.clear();
      if (c === m) c = null;
      if (a.code !== PROXY_PORT) w(`closed code=${a.code} reason=${a.reason || "(none)"}`);
      q(a.code);
    };
  }
  function K() {
    if (g) return;
    g = true;
    if (s) {
      clearTimeout(s);
      s = null;
    }
    if (u) {
      clearTimeout(u);
      u = null;
    }
    if (S) {
      clearInterval(S);
      S = null;
    }
    for (let m of T.values()) m.abort();
    T.clear();
    scmConnector_2.connected = false;
    try {
      c?.close();
    } catch {}
    c = null;
    w("stopped");
  }
  signal?.addEventListener("abort", K, {
    once: true,
  });
  w(`starting provider=${scmConnector.provider} connector_id=${scmConnector.connectorId} url=${h}`);
  b();
  return {
    stop: K,
  };
}
//@ chunk-2cbdmxy9.js:19492-19707 placement
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

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
import { readFile, readFile as readFile_2 } from "fs/promises";
import { redactSecretsInText } from "../../utils/redactSecrets.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { errorMessage } from "../../utils/errors.js";
import { withBoundedTimeout } from "../../utils/boundedTimeout.js";
import { getWebSocketProxyUrl } from "../../utils/proxy.js";
import { getWebSocketTLSOptions } from "../../utils/mtls.js";

//@ chunk-2cbdmxy9.js:12063-12360 placement
var SCM_CONNECTOR_CONSTANTS = "/v1/code/scm-connectors/{provider}/{id}/tunnel",
  fe = 4003,
  Ye = 30000,
  ge = 1000,
  we = 30000,
  ze = 1e4,
  Qe = 30000,
  Se = 32768,
  Ve = 4194304,
  Xe = 1048576,
  Je = 50,
  Ze = 30000,
  et = 1e4,
  tt = new Set(["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]),
  nt = new Set(["host", "connection", "content-length", "transfer-encoding"]);
//@ chunk-2cbdmxy9.js:12360-13037 placement
function parseScmConnectorHost(e) {
  if (e.includes("://") || e.includes("/") || e.includes("@"))
    throw Error("--scm-connector-host expects a bare hostname (e.g. ghe.example.com[:443]), not a URL");
  let index = e.lastIndexOf(":"),
    startsWith = e.startsWith("["),
    n,
    h = 443;
  if (index > 0 && (!startsWith || (startsWith && e[index - 1] === "]"))) {
    n = e.slice(0, index);
    let sliced = e.slice(index + 1),
      l = parseInt(sliced, 10);
    if (Number.isNaN(l) || l < 1 || l > 65535 || String(l) !== sliced)
      throw Error("--scm-connector-host port must be an integer in [1, 65535]");
    h = l;
  } else n = e;
  if (n.length === 0) throw Error("--scm-connector-host: hostname is empty");
  if (n.includes(":") && !(n.startsWith("[") && n.endsWith("]")))
    throw Error("--scm-connector-host: hostname must be a bare hostname or [v6] literal");
  return { host: n, port: h };
}
//@ chunk-2cbdmxy9.js:13037-13431 placement
function parseScmHostRewrite(e) {
  let index = e.indexOf("=");
  if (index <= 0 || index === e.length - 1)
    throw Error("--scm-connector-host-rewrite requires <from>=<to_host:to_port>");
  let lower = e.slice(0, index).toLowerCase(),
    sliced = e.slice(index + 1);
  for (let l of [lower, sliced])
    if (l.includes("://") || l.includes("/") || l.includes("@"))
      throw Error("--scm-connector-host-rewrite expects bare hostnames, not URLs");
  let { host: host, port: port } = parseScmConnectorHost(sliced);
  return { from: lower, toHost: host, toPort: port };
}
//@ chunk-2cbdmxy9.js:13431-13758 placement
function validateScmPath(e) {
  if (typeof e !== "string" || e.length === 0) return "path must be a non-empty string";
  if (e[0] !== "/") return "path must start with /";
  if (e[1] === "/") return "path must not start with // (scheme-relative)";
  if (e[1] === "@") return "path must not start with /@";
  if (e.includes("\\")) return "path must not contain backslash";
  return null;
}
//@ chunk-2cbdmxy9.js:13758-14143 placement
function scmDialUrl(e, t, r) {
  let n = new URL("https://placeholder.invalid/");
  if (((n.host = `${e}:${t}`), n.hostname === "placeholder.invalid"))
    throw Error("scm-connector dial host is not a valid URL host");
  let origin = n.origin,
    index = r.indexOf("?");
  if (
    ((n.pathname = index >= 0 ? r.slice(0, index) : r),
    (n.search = index >= 0 ? r.slice(index) : ""),
    n.origin !== origin || n.username !== "" || n.password !== "")
  )
    throw Error("path escaped the configured origin");
  return n;
}
//@ chunk-2cbdmxy9.js:14143-14312 placement
function scmConnectorWsUrl(e, t) {
  let replaced = SCM_CONNECTOR_CONSTANTS.replace("{provider}", encodeURIComponent(t.provider)).replace(
    "{id}",
    String(t.connectorId),
  );
  return e.replace(/^http/, "ws").replace(/\/+$/, "") + replaced;
}
//@ chunk-2cbdmxy9.js:14312-14417 placement
function newScmConnectorStatus() {
  return { connected: !1, last_connected_at: 0, last_error: null, reconnects: 0, requests_forwarded: 0 };
}
/**
 * SCM 连接器隧道：通过 /v1/code/scm-connectors/.../tunnel WebSocket 把服务器请求转发到内网 Git 主机。
 */
//@ chunk-2cbdmxy9.js:14417-19492 placement
function startScmConnector(e, t, r, n) {
  let h = scmConnectorWsUrl(r.apiUrl, e),
    o = e.hostRewrite && e.hostRewrite.from === e.host.toLowerCase() ? e.hostRewrite.toHost : e.host,
    l = e.hostRewrite && e.hostRewrite.from === e.host.toLowerCase() ? e.hostRewrite.toPort : e.port,
    g = !1,
    c = null,
    S = null,
    s = null,
    u = null,
    U = ge,
    j = 0,
    H,
    W = e.caFile === void 0,
    T = new Map(),
    D = (m) => {
      t.last_error = redactSecretsInText(m);
    },
    w = (m) => r.onStatus(`[runner:scm-connector] ${m}`),
    x = (m) => r.onDebug(`[runner:scm-connector] ${m}`);
  function O(m) {
    let a = c;
    if (!a || a.readyState !== WebSocket.OPEN) return;
    try {
      a.send(jsonStringify(m));
    } catch (error) {
      (D(errorMessage(error)), w(`send failed: ${errorMessage(error)}`));
    }
  }
  function I(m, a) {
    O({ httpError: { requestId: m, errorMessage: a } });
  }
  function G(m) {
    let a = c;
    if (!a || a.readyState !== WebSocket.OPEN || a.bufferedAmount <= Ve) return Promise.resolve();
    return new Promise((f) => {
      let N = setInterval(() => {
        if (g || m.aborted || c !== a || a.readyState !== WebSocket.OPEN || a.bufferedAmount <= Xe)
          (clearInterval(N), f());
      }, Je);
    });
  }
  async function L(m) {
    let requestId = m.requestId;
    if (!requestId) return;
    if (m.port !== void 0 && m.port !== 0 && m.port !== e.port) {
      I(requestId, `port ${m.port} does not match this connector's configured port ${e.port}`);
      return;
    }
    let f = validateScmPath(m.path);
    if (f) {
      I(requestId, f);
      return;
    }
    let path = m.path,
      upper = (m.method ?? "GET").toUpperCase();
    if (!tt.has(upper)) {
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
    let E = setTimeout((y) => y.abort(), Ze, abortController),
      F;
    try {
      let headers = new Headers();
      for (let C of m.headers ?? []) {
        if (!C.name || nt.has(C.name.toLowerCase())) continue;
        headers.append(C.name, C.value ?? "");
      }
      headers.set("Host", e.port === 443 ? e.host : `${e.host}:${e.port}`);
      let A = m.body !== void 0 && m.body !== "" ? Buffer.from(m.body, "base64") : void 0;
      F = await fetch(R, {
        method: upper,
        headers: headers,
        body: A,
        redirect: "manual",
        signal: abortController.signal,
        tls: H !== void 0 || o !== e.host ? { ca: H, serverName: e.host } : void 0,
      });
    } catch (error) {
      (clearTimeout(E),
        T.delete(requestId),
        D(`forward to ${e.host}: ${errorMessage(error)}`),
        I(requestId, errorMessage(error)));
      return;
    }
    clearTimeout(E);
    let Q = [];
    F.headers.forEach((header, A) => {
      Q.push({ name: A, value: header });
    });
    let P = 0;
    (O({
      httpHeaders: {
        requestId: requestId,
        statusCode: F.status,
        statusText: F.statusText || String(F.status),
        headers: Q,
        sequenceNumber: P,
      },
    }),
      P++);
    try {
      if (F.body) {
        let reader = F.body.getReader();
        for (;;) {
          if ((await G(abortController.signal), abortController.signal.aborted)) {
            await reader.cancel();
            break;
          }
          let read = await reader.read();
          if (read.value && read.value.length > 0)
            for (let C = 0; C < read.value.length; C += Se) {
              let chunk = read.value.subarray(C, C + Se);
              (O({
                httpChunk: {
                  requestId: requestId,
                  data: Buffer.from(chunk).toString("base64"),
                  isFinal: !1,
                  sequenceNumber: P,
                },
              }),
                P++);
            }
          if (read.done) break;
          if (abortController.signal.aborted) {
            await reader.cancel();
            break;
          }
        }
      }
      (O({ httpChunk: { requestId: requestId, data: "", isFinal: !0, sequenceNumber: P } }),
        t.requests_forwarded++);
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
      L(a.httpRequest).catch((f) => {
        (D(errorMessage(f)), w(`handleHttpRequest failed: ${errorMessage(f)}`));
      });
    else if (a.httpCancel) {
      let requestId = a.httpCancel.requestId;
      if (requestId) (T.get(requestId)?.abort(), T.delete(requestId));
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
  function q(m) {
    if (g) return;
    t.reconnects++;
    let a;
    if (m === fe)
      ((a = Ye),
        w(
          `standby (close code ${m}): another orchestrator holds connector ${e.connectorId}; retrying in ${a / 1000}s`,
        ));
    else {
      if (j > 0 && Date.now() - j > we) U = ge;
      ((a = U + Math.floor(Math.random() * (U / 2))), (U = Math.min(U * 2, we)), x(`reconnecting in ${a}ms`));
    }
    ((j = 0), (s = setTimeout(b, a)));
  }
  function b() {
    if (g) return;
    if (((s = null), !W))
      withBoundedTimeout(readFile_2(e.caFile, "utf8"), et, `--scm-connector-ca-file read from ${e.caFile}`)
        .then((a) => {
          ((H = a), (W = !0));
        })
        .catch((a) => {
          (D(`reading --scm-connector-ca-file: ${errorMessage(a)}`),
            w(`reading --scm-connector-ca-file: ${errorMessage(a)}`));
        });
    let m;
    try {
      m = new globalThis.WebSocket(h, {
        headers: { Authorization: `Bearer ${r.poolSecret}` },
        proxy: getWebSocketProxyUrl(h),
        tls: getWebSocketTLSOptions(void 0) || void 0,
      });
    } catch (error) {
      (D(errorMessage(error)), w(`WebSocket construct failed: ${errorMessage(error)}`), q());
      return;
    }
    ((c = m),
      (u = setTimeout(
        (a) => {
          (D("WebSocket open timeout"), (a.onopen = a.onmessage = a.onerror = a.onclose = null));
          try {
            a.close();
          } catch {}
          if (c === a) c = null;
          q();
        },
        ze,
        m,
      )),
      (m.onopen = () => {
        if (u) (clearTimeout(u), (u = null));
        ((t.connected = !0),
          (t.last_connected_at = Date.now()),
          (t.last_error = null),
          (j = Date.now()),
          w(
            `connected provider=${e.provider} connector_id=${e.connectorId} forward=${e.host}:${e.port}${o !== e.host ? ` (dial=${o}:${l})` : ""}`,
          ),
          (S = setInterval(() => {
            if (m.readyState === WebSocket.OPEN) m.ping?.();
          }, Qe)));
      }),
      (m.onmessage = (a) => {
        let f = typeof a.data === "string" ? a.data : Buffer.from(a.data).toString("utf8");
        B(f);
      }),
      (m.onerror = (a) => {
        D("message" in a && typeof a.message === "string" ? a.message : "WebSocket error");
      }),
      (m.onclose = (a) => {
        if (((t.connected = !1), u)) (clearTimeout(u), (u = null));
        if (S) (clearInterval(S), (S = null));
        for (let f of T.values()) f.abort();
        if ((T.clear(), c === m)) c = null;
        if (a.code !== fe) w(`closed code=${a.code} reason=${a.reason || "(none)"}`);
        q(a.code);
      }));
  }
  function K() {
    if (g) return;
    if (((g = !0), s)) (clearTimeout(s), (s = null));
    if (u) (clearTimeout(u), (u = null));
    if (S) (clearInterval(S), (S = null));
    for (let m of T.values()) m.abort();
    (T.clear(), (t.connected = !1));
    try {
      c?.close();
    } catch {}
    ((c = null), w("stopped"));
  }
  return (
    n?.addEventListener("abort", K, { once: !0 }),
    w(`starting provider=${e.provider} connector_id=${e.connectorId} url=${h}`),
    b(),
    { stop: K }
  );
}
//@ chunk-2cbdmxy9.js:19492-19707 placement
var RUNNER_DEFAULTS = "https://api.anthropic.com",
  $e = 1500,
  ve = 8080,
  Ne = 4,
  Oe = 60000,
  He = 120,
  mt = 1e4,
  ft = 60000,
  gt = 5000,
  wt = 500,
  St = 2000,
  Et = 3600,
  bt = 0.2,
  Re = 1000,
  kt = 30000,
  Tt = new Set([400, 401, 403, 404, 426]),
  ne = [0.1, 0.25, 0.5, 1, 2.5, 5, 10, 20, 30, 60];

export {
  ne,
  RUNNER_DEFAULTS,
  ve,
  Ne,
  Oe,
  He,
  parseScmConnectorHost,
  parseScmHostRewrite,
  Et,
  $e,
  bt,
  gt,
  wt,
  St,
  Re,
  Tt,
  kt,
  ft,
  newScmConnectorStatus,
  startScmConnector,
  mt,
};

/**
 * services/selfHostedRunner/egressProxy.ts
 *
 * 2.1.316 新增：自托管 runner 的出口代理：本地监听、注入 Proxy-Authorization（命令或文件取得）、处理 CONNECT 与 407。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-88g43zt5.js (35)
 * attribution: placement 35
 */
import { open } from "fs/promises";
import { randomBytes, timingSafeEqual } from "crypto";
import { connect as connect_2 } from "tls";
import { connect, createServer } from "net";
import { resolve } from "path";
import { truncateToLength } from "../../utils/stringUtils.js";
import { withBoundedTimeout } from "../../utils/boundedTimeout.js";
import { redactSecretsInText } from "../../utils/redactSecrets.js";
import {
  errorMessage,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../../utils/errors.js";
import { safeExecShell } from "../../utils/safeSpawn.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { getUsableProxyUrl, parseProxyUrl, configureGlobalAgents } from "../../utils/proxy.js";
import { getMTLSConfig } from "../../utils/mtls.js";
import { getCACertificates } from "../../utils/caCerts.js";

//@ chunk-88g43zt5.js:1000-1197 placement
var PROXY_ENV_VARS = ["https_proxy", "HTTPS_PROXY", "http_proxy", "HTTP_PROXY"],
  Tjn = "SELF_HOSTED_RUNNER_PROXY_AUTHORIZATION_COMMAND",
  Ajn = "SELF_HOSTED_RUNNER_PROXY_AUTHORIZATION_FILE",
  CLAUDE_SELF_HOSTED_RUNNER = "claude-self-hosted-runner";
//@ chunk-88g43zt5.js:1197-1284 placement
class ProxyAuthorizationMintError extends Error {
  constructor(e) {
    super(e);
    this.name = "ProxyAuthorizationMintError";
  }
}
//@ chunk-88g43zt5.js:1284-1457 placement
var HEAD_TIMEOUT_MS = 30000,
  MAX_HEAD_BYTES = 16384,
  CONNECT_TIMEOUT_MS = 30000,
  UPSTREAM_TIMEOUT_MS = 30000,
  AUTH_REFRESH_MS = 60000,
  DESTROY_GRACE_MS = 2000,
  MAX_PENDING_CONNECTIONS = 8,
  MAX_HEADER_LINE = 8192,
  MAX_RESPONSE_HEAD = 16384,
  MAX_HEADER_LINES = 256,
  MAX_BUFFERED_BYTES = 65536,
  CONTROL_CHAR_PATTERN = /[\x00-\x08\x0a-\x1f\x7f-\x9f]/,
  MAX_AUTHORIZATION_BYTES = 4096,
  HEADER_LINE_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+:/;
//@ chunk-88g43zt5.js:1457-1523 placement
function X(e, n = 200) {
  return truncateToLength(e.replace(/[\p{Cc}\p{Cs}]/gu, ""), n);
}
//@ chunk-88g43zt5.js:1523-1637 placement
function sanitizeAuthorization(e) {
  if (e === void 0 || e === "") return;
  if (Buffer.byteLength(e, "latin1") > MAX_AUTHORIZATION_BYTES) return;
  return CONTROL_CHAR_PATTERN.test(e) ? void 0 : e;
}
//@ chunk-88g43zt5.js:1637-1971 placement
function validateProxyAuthorization(e) {
  let trimmed = e.trim();
  if (!trimmed) throw new ProxyAuthorizationMintError("proxy authorization source returned an empty value");
  if (Buffer.byteLength(trimmed) > MAX_HEAD_BYTES)
    throw new ProxyAuthorizationMintError(`proxy authorization value exceeds ${MAX_HEAD_BYTES} bytes`);
  if (CONTROL_CHAR_PATTERN.test(trimmed))
    throw new ProxyAuthorizationMintError(
      "proxy authorization value must be a single header line (control characters such as CR/LF are not allowed)",
    );
  return trimmed;
}
/**
 * 从 --proxy-authorization-command（执行命令）或 --proxy-authorization-file（读文件）取得代理认证值，带超时与大小限制。
 */
//@ chunk-88g43zt5.js:1971-3329 placement
function mintProxyAuthorization(e) {
  let { source: source } = e,
    s = e.commandTimeoutMs ?? HEAD_TIMEOUT_MS,
    o;
  try {
    o = new URL(e.upstreamProxyUrl).hostname;
  } catch {
    o = void 0;
  }
  let u,
    c = async (x) => {
      if (source.kind === "file") {
        if (u)
          throw new ProxyAuthorizationMintError(
            "proxy authorization file could not be read: an earlier read has not returned yet (stalled mount?); not issuing another",
          );
        let l,
          R = !1,
          Y = (async () => {
            let U = await open(source.path, "r");
            try {
              let alloc = Buffer.alloc(MAX_HEAD_BYTES + 1),
                { bytesRead: bytesRead } = await U.read(alloc, 0, alloc.length, 0);
              return alloc.subarray(0, bytesRead).toString("utf8");
            } finally {
              await U.close();
            }
          })(),
          v = () => {
            if (((R = !0), u === Y)) u = void 0;
          };
        Y.then(v, v);
        try {
          l = await withBoundedTimeout(Y, s, "read");
        } catch (error) {
          if (!R) u = Y;
          throw new ProxyAuthorizationMintError(
            `proxy authorization file could not be read: ${redactSecretsInText(errorMessage(error))}`,
          );
        }
        return validateProxyAuthorization(l);
      }
      let P = {
          ...(typeof e.commandEnv === "function" ? e.commandEnv() : (e.commandEnv ?? process.env)),
          CLAUDE_CODE_PROXY_URL: e.upstreamProxyUrl,
          ...(o && { CLAUDE_CODE_PROXY_HOST: o }),
          ...(x && { CLAUDE_CODE_PROXY_AUTHENTICATE: x }),
        },
        h = await safeExecShell(source.command, {
          timeout: s,
          reject: !1,
          stdin: "ignore",
          useToolMemoryCgroup: !1,
          extendEnv: !1,
          env: P,
        });
      if (h.failed) {
        let l = h.timedOut ? `timed out after ${s}ms` : `exited ${h.exitCode ?? h.signal ?? "abnormally"}`,
          R = h.stderr?.trim();
        throw new ProxyAuthorizationMintError(
          `proxy authorization command ${l}${R ? `: ${truncateToLength(redactSecretsInText(R), 500)}` : ""}`,
        );
      }
      return validateProxyAuthorization(h.stdout ?? "");
    },
    f = new Map();
  return {
    source: source.kind,
    mint(x) {
      let P = x === void 0 ? "plain" : `remint:${x.challenge ?? ""}`,
        h = f.get(P);
      if (!h)
        ((h = c(x?.challenge).finally(() => {
          f.delete(P);
        })),
          f.set(P, h));
      return h;
    },
  };
}
//@ chunk-88g43zt5.js:3329-3484 placement
function getHeaderValue(e, n) {
  let lower = n.toLowerCase();
  for (let o of e) {
    let index = o.indexOf(":");
    if (index > 0 && o.slice(0, index).trim().toLowerCase() === lower) return o.slice(index + 1).trim();
  }
  return;
}
//@ chunk-88g43zt5.js:3484-3642 placement
function pickHeaders(e, n) {
  let s = new Set(n.map((o) => o.toLowerCase()));
  return e.filter((o) => {
    let index = o.indexOf(":");
    return index > 0 && s.has(o.slice(0, index).trim().toLowerCase());
  });
}
//@ chunk-88g43zt5.js:3642-3801 placement
function omitHeaders(e, n) {
  let s = new Set(n.map((o) => o.toLowerCase()));
  return e.filter((o) => {
    let index = o.indexOf(":");
    return !(index > 0 && s.has(o.slice(0, index).trim().toLowerCase()));
  });
}
//@ chunk-88g43zt5.js:3801-3811 placement
var en = 16;
//@ chunk-88g43zt5.js:3811-4034 placement
function headContainsSecret(e, n) {
  let str = Buffer.from(n, "utf8").toString("latin1"),
    o = [str],
    search = str.search(/[ \t]/);
  if (search > 0) {
    let trimmed = str.slice(search).trim();
    if (trimmed.length >= en) o.push(trimmed);
  }
  return [e.startLine, ...e.headerLines].some((c) => o.some((f) => c.includes(f)));
}
//@ chunk-88g43zt5.js:4034-4091 placement
var J = ["proxy-authenticate", "proxy-authentication-info"];
/**
 * 把一个流的数据转发到另一个流，最多转发指定字节数（超出时回调一次），处理背压。
 */
//@ chunk-88g43zt5.js:4091-4408 placement
function pipeLimited(e, n, s, o, u) {
  let c = s,
    f = !1,
    x = (P) => {
      if (n.destroyed || !n.writable) return;
      if (P.length > c && !f) ((f = !0), u());
      if (c === 0 || P.length === 0) return;
      let h = P.length <= c ? P : P.subarray(0, c);
      if (((c -= h.length), !n.write(h) && c > 0)) (e.pause(), n.once("drain", () => e.resume()));
    };
  return (
    x(o),
    e.on("data", x),
    e.resume(),
    () => {
      e.removeListener("data", x);
    }
  );
}
/**
 * 从 socket 读取 HTTP 请求/响应头直到空行：超时、超过大小上限或连接提前关闭时报错；返回起始行、头部行与剩余字节。
 */
//@ chunk-88g43zt5.js:4408-5258 placement
function readHttpHead(socket, maxBytes, timeoutMs, prefix = Buffer.alloc(0)) {
  return new Promise((u, c) => {
    let f = prefix,
      x = !1,
      P = (v, U) => {},
      h = setTimeout(
        (v) => v(Error("timed out waiting for the request/response head")),
        timeoutMs,
        (v) => P(v),
      ),
      l = (v) => {
        f = Buffer.concat([f, v]);
        let index = f.indexOf(`\r
\r
`);
        if (index === -1) {
          if (f.length > maxBytes) P(Error("request/response head exceeded the size limit"));
          return;
        }
        if (index > maxBytes) {
          P(Error("request/response head exceeded the size limit"));
          return;
        }
        let str = f.subarray(0, index).toString("latin1"),
          [q = "", ...V] = str.split(`\r
`);
        P(null, { startLine: q, headerLines: V, rest: f.subarray(index + 4) });
      },
      R = () => P(Error("connection closed before the head was complete")),
      Y = (v) => P(v);
    if (
      ((P = (v, U) => {
        if (
          ((x = !0),
          clearTimeout(h),
          socket.removeListener("data", l),
          socket.removeListener("close", R),
          socket.removeListener("error", Y),
          socket.pause(),
          v)
        )
          c(v);
        else u(U);
      }),
      socket.on("data", l),
      socket.once("close", R),
      socket.once("error", Y),
      f.length > 0)
    )
      l(Buffer.alloc(0));
    if (!x) socket.resume();
  });
}
//@ chunk-88g43zt5.js:5258-5372 placement
function endSocket(e, n) {
  if (e.destroyed) return;
  if ((e.resume(), e.writable)) e.end(n);
  setTimeout((s) => s.destroy(), DESTROY_GRACE_MS, e).unref();
}
//@ chunk-88g43zt5.js:5372-5417 placement
function M(e) {
  return Buffer.from(e, "latin1");
}
//@ chunk-88g43zt5.js:5417-5570 placement
function proxyAuthRequiredResponse() {
  return `HTTP/1.1 407 Proxy Authentication Required\r
Proxy-Authenticate: Basic realm="${CLAUDE_SELF_HOSTED_RUNNER}"\r
Content-Length: 0\r
Connection: close\r
\r
`;
}
//@ chunk-88g43zt5.js:5570-5712 placement
function plainHttpResponse(e, n, s) {
  return (
    `HTTP/1.1 ${e} ${n}\r
Content-Type: text/plain\r
Content-Length: ${Buffer.byteLength(s)}\r
Connection: close\r
\r
` + s
  );
}
/**
 * 解析出口代理收到的绝对形式 HTTP 请求（http://host/...），去掉代理相关头并补 Host，得到目标与改写后的请求头。
 */
//@ chunk-88g43zt5.js:5712-6305 placement
function parseAbsoluteFormRequest(head) {
  let match = head.startLine.match(/^([A-Z]+)\s+http:\/\/([^/?#\s]+)(\S*)\s+(HTTP\/1\.[01])$/i);
  if (!match) return;
  let [, s, o, u, c] = match,
    match_2 = o.match(/^(\[[0-9A-Fa-f:.]+\]|[^:@[\]]+)(?::(\d{1,5}))?$/);
  if (!match_2 || (match_2[2] !== void 0 && Number(match_2[2]) > 65535)) return;
  let x = `${match_2[1]}:${match_2[2] ?? "80"}`,
    P = u.startsWith("/") ? u : `/${u}`,
    filtered = head.headerLines.filter((headerLine) => {
      let lower = headerLine.slice(0, headerLine.indexOf(":")).trim().toLowerCase();
      return !lower.startsWith("proxy-") && lower !== "connection" && lower !== "keep-alive";
    });
  if (getHeaderValue(filtered, "host") === void 0) filtered.push(`Host: ${o}`);
  return {
    target: x,
    head: M(
      `${s} ${P} ${c}\r
` +
        filtered
          .map(
            (l) =>
              l +
              `\r
`,
          )
          .join("") +
        `Connection: close\r
\r
`,
    ),
  };
}
//@ chunk-88g43zt5.js:6305-6434 placement
class ClientGoneError extends Error {
  constructor() {
    super("client closed before the upstream connection was ready");
    this.name = "ClientGoneError";
  }
}
/**
 * 暂时缓冲 socket 的数据（超量时暂停），返回是否已关闭与取出缓冲的方法。
 */
//@ chunk-88g43zt5.js:6434-6746 placement
function bufferSocket(e, n) {
  let s = !1,
    o = n.length > 0 ? [n] : [],
    u = n.length,
    c = (x) => {
      if ((o.push(x), (u += x.length), u > MAX_BUFFERED_BYTES)) e.pause();
    },
    f = () => {
      s = !0;
    };
  return (
    e.on("data", c),
    e.once("end", f),
    e.once("close", f),
    e.resume(),
    {
      gone: () => s || e.destroyed,
      release: () => {
        e.removeListener("data", c);
        let x = o.length === 1 ? o[0] : Buffer.concat(o);
        return ((o = []), (u = 0), x);
      },
    }
  );
}
/**
 * 自托管 runner 的出口代理（runner:egress-proxy）：本地监听并转发到上游 HTTP(S) 代理，注入 Proxy-Authorization，处理 CONNECT 与 407。
 */
//@ chunk-88g43zt5.js:6746-16132 placement
async function startEgressProxy(e) {
  let n = new URL(e.upstreamProxyUrl),
    s = n.protocol === "https:";
  if (n.protocol !== "http:" && !s) throw Error("the upstream proxy URL must be http:// or https://");
  let replaced = n.hostname.replace(/^\[(.*)\]$/, "$1"),
    u = n.port ? Number(n.port) : s ? 443 : 80,
    c = e.logLabel ?? "runner:egress-proxy";
  if (n.username || n.password)
    e.onStatus(
      `[${c}] note: the upstream proxy URL carries user:password credentials; they are replaced by the minted Proxy-Authorization value on every request to the upstream proxy`,
    );
  let str = randomBytes(24).toString("base64url"),
    buffer = Buffer.from("Basic " + Buffer.from(`runner:${str}`).toString("base64")),
    P = (r) => {
      let a = getHeaderValue(r, "proxy-authorization");
      if (a === void 0) return !1;
      let buffer_2 = Buffer.from(a);
      return buffer_2.length === buffer.length && timingSafeEqual(buffer_2, buffer);
    },
    h = (r) => e.onDebug?.(`[${c}] ${r}`),
    l = (r) => e.onStatus(`[${c}] ${r}`),
    R = new Set(),
    Y = (r) => {
      (R.add(r), r.on("error", (a) => h(`socket: ${errorMessage(a)}`)), r.once("close", () => R.delete(r)));
    },
    v = () => {
      e.onUpstreamFailure?.().catch((r) =>
        h(`reload after a failed upstream connection: ${errorMessage(r)}`),
      );
    },
    U = () =>
      new Promise((r, a) => {
        let E = s
          ? connect_2({
              host: replaced,
              port: u,
              servername: rn(replaced) ? void 0 : replaced,
              ...(typeof e.upstreamTls === "function" ? e.upstreamTls() : e.upstreamTls),
            })
          : connect({ host: replaced, port: u });
        Y(E);
        let T = s ? "secureConnect" : "connect",
          A = (y) => {},
          p = setTimeout(
            (y) => y(Error("timed out connecting to the upstream proxy")),
            UPSTREAM_TIMEOUT_MS,
            (y) => A(y),
          ),
          S = () => A(null),
          L = (y) => A(y),
          N = () => A(Error("upstream proxy closed the connection during connect"));
        ((A = (y) => {
          if (
            (clearTimeout(p),
            E.removeListener(T, S),
            E.removeListener("error", L),
            E.removeListener("close", N),
            y)
          )
            (E.destroy(), v(), a(y));
          else r(E);
        }),
          E.once(T, S),
          E.once("error", L),
          E.once("close", N));
      }),
    F = (r, a) => {
      (r.pipe(a), a.pipe(r));
      let E = () => {
        (r.destroy(), a.destroy());
      };
      (r.on("error", E),
        a.on("error", E),
        r.on("close", () => endSocket(a, "")),
        a.on("close", () => endSocket(r, "")),
        r.resume(),
        a.resume());
    },
    q = async (r, a, E, T) => {
      let mint = await e.minter.mint(E);
      if (T()) throw new ClientGoneError();
      let p = await U();
      if (T()) throw (p.destroy(), new ClientGoneError());
      try {
        p.write(
          Buffer.concat([
            M(`CONNECT ${r} HTTP/1.1\r
Host: ${r}\r
`),
            Buffer.from(`Proxy-Authorization: ${mint}\r
`),
            M(
              a
                .map(
                  (L) =>
                    L +
                    `\r
`,
                )
                .join("") +
                `\r
`,
            ),
          ]),
        );
        let S = await readHttpHead(p, MAX_RESPONSE_HEAD, AUTH_REFRESH_MS);
        if (T()) throw new ClientGoneError();
        return { up: p, head: S, value: mint };
      } catch (error) {
        if ((p.destroy(), !(error instanceof ClientGoneError))) v();
        throw error;
      }
    },
    V = (r) => {
      let match = r.startLine.match(/^HTTP\/1\.[01]\s+(\d{3})(?=\s|$)/);
      return match ? Number(match[1]) : 0;
    },
    me = (r, a, E) => {
      if (a instanceof ClientGoneError || r.destroyed) {
        r.destroy();
        return;
      }
      let T =
        a instanceof ProxyAuthorizationMintError
          ? a.message
          : `upstream proxy connection failed: ${redactSecretsInText(errorMessage(a))}`;
      (l(`${T} (${X(E)} answered 502)`),
        endSocket(
          r,
          plainHttpResponse(
            502,
            "Bad Gateway",
            a instanceof ProxyAuthorizationMintError
              ? `proxy authorization could not be obtained (see the runner log)
`
              : `upstream proxy connection failed (see the runner log)
`,
          ),
        ));
    },
    Ue = (r, a, E, T) => {
      (a.destroy(),
        l(
          `upstream proxy rejected the minted Proxy-Authorization for ${X(E)} (${X(T)}); answering the client 502`,
        ),
        endSocket(
          r,
          plainHttpResponse(
            502,
            "Bad Gateway",
            `upstream proxy rejected the runner-minted Proxy-Authorization (407); see the runner log
`,
          ),
        ));
    },
    re = (r, a, E, T) => {
      (a.destroy(),
        l(
          `upstream response to ${X(E)} (status ${T}) reflected the minted Proxy-Authorization in its head; withheld, answering the client 502`,
        ),
        endSocket(
          r,
          plainHttpResponse(
            502,
            "Bad Gateway",
            `upstream proxy response withheld: its head reflected the runner-minted Proxy-Authorization (see the runner log)
`,
          ),
        ));
    },
    ye = async (r, a, E, T, A) => {
      let p = pickHeaders(E.headerLines, ["user-agent"]),
        S = () => T.gone();
      try {
        let L = await q(a, p, void 0, S),
          N = V(L.head);
        if (N === 407) {
          let b = sanitizeAuthorization(getHeaderValue(L.head.headerLines, "proxy-authenticate"));
          (L.up.destroy(),
            h(`upstream answered 407 for CONNECT ${a}; re-minting once`),
            (L = await q(a, p, { challenge: b }, S)),
            (N = V(L.head)));
        }
        let { up: up, head: head, value: se } = L;
        if (N !== 200 && headContainsSecret(head, se)) {
          re(r, up, `CONNECT ${a}`, N);
          return;
        }
        if (N === 407) {
          Ue(r, up, `CONNECT ${a}`, head.startLine);
          return;
        }
        if (N < 100) {
          (up.destroy(),
            l(`upstream proxy sent an unparseable reply to CONNECT ${X(a)}; answering the client 502`),
            endSocket(
              r,
              plainHttpResponse(
                502,
                "Bad Gateway",
                `unparseable reply from upstream proxy
`,
              ),
            ));
          return;
        }
        if (N === 200) {
          if ((h(`tunnel established: CONNECT ${a}`), A === void 0))
            r.write(`HTTP/1.1 200 Connection Established\r
\r
`);
          if (head.rest.length > 0) r.write(head.rest);
          if (A !== void 0) {
            up.write(A.head);
            let _e = pipeLimited(r, up, A.bodyLength, T.release(), () =>
              h("client sent bytes past its declared Content-Length on a plain HTTP request; not forwarded"),
            );
            (up.pipe(r),
              up.once("close", () => {
                (_e(), endSocket(r, ""));
              }),
              r.once("close", () => {
                (_e(), up.destroy());
              }));
            return;
          }
          let release = T.release();
          if (release.length > 0) up.write(release);
          F(r, up);
          return;
        }
        (up.destroy(), l(`upstream proxy refused CONNECT ${X(a)}: ${X(head.startLine)}`));
        let z = omitHeaders(head.headerLines, [
          "connection",
          "proxy-connection",
          "keep-alive",
          "transfer-encoding",
          "content-length",
          ...J,
        ]);
        endSocket(
          r,
          M(
            head.startLine +
              `\r
` +
              z
                .map(
                  (b) =>
                    b +
                    `\r
`,
                )
                .join("") +
              `Content-Length: 0\r
Connection: close\r
\r
`,
          ),
        );
      } catch (error) {
        me(r, error, `CONNECT ${a}`);
      }
    },
    be = async (r, a, E) => {
      let T = omitHeaders(a.headerLines, [
          "proxy-authorization",
          "proxy-connection",
          "connection",
          "keep-alive",
          "upgrade",
          "te",
          "trailer",
          "max-forwards",
        ]),
        A = Number(getHeaderValue(a.headerLines, "content-length") ?? "0"),
        p,
        S = () => {},
        L = () => {
          (S(), p?.destroy(), r.destroy());
        };
      try {
        {
          let mint = await e.minter.mint();
          if (E.gone()) {
            L();
            return;
          }
          if (((p = await U()), E.gone())) {
            L();
            return;
          }
          if (
            (p.write(
              Buffer.concat([
                M(
                  a.startLine +
                    `\r
` +
                    T.map(
                      (b) =>
                        b +
                        `\r
`,
                    ).join(""),
                ),
                Buffer.from(`Proxy-Authorization: ${mint}\r
`),
                M(`Connection: close\r
\r
`),
              ]),
            ),
            A > 0)
          )
            S = pipeLimited(r, p, A, E.release(), () =>
              h("client sent bytes past its declared Content-Length on a plain HTTP request; not forwarded"),
            );
          let y = await readHttpHead(p, MAX_RESPONSE_HEAD, AUTH_REFRESH_MS),
            O = V(y),
            se = 0;
          while (O >= 100 && O < 200 && O !== 101) {
            if (E.gone()) {
              L();
              return;
            }
            if (headContainsSecret(y, mint)) {
              (S(), re(r, p, "a plain HTTP request", O));
              return;
            }
            if (++se > MAX_PENDING_CONNECTIONS) {
              (p.destroy(),
                S(),
                l(
                  `upstream sent more than ${MAX_PENDING_CONNECTIONS} interim responses to a plain HTTP request; answering the client 502`,
                ),
                endSocket(
                  r,
                  plainHttpResponse(
                    502,
                    "Bad Gateway",
                    `too many interim responses from upstream
`,
                  ),
                ));
              return;
            }
            (r.write(
              M(
                y.startLine +
                  `\r
` +
                  omitHeaders(y.headerLines, J)
                    .map(
                      (b) =>
                        b +
                        `\r
`,
                    )
                    .join("") +
                  `\r
`,
              ),
            ),
              (y = await readHttpHead(p, MAX_RESPONSE_HEAD, AUTH_REFRESH_MS, y.rest)),
              (O = V(y)));
          }
          if (E.gone()) {
            L();
            return;
          }
          if (headContainsSecret(y, mint)) {
            (S(), re(r, p, "a plain HTTP request", O));
            return;
          }
          if (O === 407) {
            (S(),
              p.destroy(),
              l(
                `upstream answered 407 to a plain HTTP request (${X(y.startLine)}); it may have come from the destination site rather than the proxy, and re-mint is only attempted for CONNECT tunnels; answering the client 502`,
              ),
              endSocket(
                r,
                plainHttpResponse(
                  502,
                  "Bad Gateway",
                  `upstream answered 407 (Proxy Authentication Required) to a plain HTTP request; it may have come from the destination site rather than the proxy; see the runner log
`,
                ),
              ));
            return;
          }
          if (O < 100) {
            (p.destroy(),
              S(),
              l("upstream proxy sent an unparseable reply to a plain HTTP request; answering the client 502"),
              endSocket(
                r,
                plainHttpResponse(
                  502,
                  "Bad Gateway",
                  `unparseable reply from upstream proxy
`,
                ),
              ));
            return;
          }
          if (O >= 400) {
            (p.destroy(),
              S(),
              l(
                `upstream answered ${X(y.startLine)} to a plain HTTP request; error body withheld from the client`,
              ),
              endSocket(
                r,
                M(
                  y.startLine +
                    `\r
` +
                    omitHeaders(y.headerLines, [
                      "connection",
                      "proxy-connection",
                      "keep-alive",
                      "transfer-encoding",
                      "content-length",
                      ...J,
                    ])
                      .map(
                        (b) =>
                          b +
                          `\r
`,
                      )
                      .join("") +
                    `Content-Length: 0\r
Connection: close\r
\r
`,
                ),
              ));
            return;
          }
          if (
            (r.write(
              M(
                y.startLine +
                  `\r
` +
                  omitHeaders(y.headerLines, ["connection", "proxy-connection", "keep-alive", ...J])
                    .map(
                      (b) =>
                        b +
                        `\r
`,
                    )
                    .join("") +
                  `Connection: close\r
\r
`,
              ),
            ),
            y.rest.length > 0)
          )
            r.write(y.rest);
          let z = p;
          (z.pipe(r),
            z.on("error", () => r.destroy()),
            r.on("error", () => z.destroy()),
            z.on("close", () => endSocket(r, "")),
            r.on("close", () => z.destroy()),
            z.resume(),
            r.resume());
        }
      } catch (error) {
        (S(), p?.destroy(), me(r, error, "plain HTTP request"));
      }
    },
    oe = 0,
    ke = e.maxPendingClients ?? MAX_HEADER_LINES,
    G = createServer({ pauseOnConnect: !0 }, (r) => {
      if ((Y(r), r.on("error", () => r.destroy()), oe >= ke)) {
        (h("too many connections still sending a request head; refusing one"), r.destroy());
        return;
      }
      (oe++,
        (async () => {
          let a;
          try {
            a = await readHttpHead(r, MAX_HEADER_LINE, CONNECT_TIMEOUT_MS);
          } catch (error) {
            if ((h(`client: ${errorMessage(error)}`), !r.destroyed && r.writable && r.bytesRead > 0))
              endSocket(
                r,
                plainHttpResponse(
                  400,
                  "Bad Request",
                  `malformed proxy request
`,
                ),
              );
            else r.destroy();
            return;
          } finally {
            oe--;
          }
          if (
            CONTROL_CHAR_PATTERN.test(a.startLine) ||
            a.headerLines.some(
              (headerLine) => CONTROL_CHAR_PATTERN.test(headerLine) || !HEADER_LINE_PATTERN.test(headerLine),
            )
          ) {
            endSocket(
              r,
              plainHttpResponse(
                400,
                "Bad Request",
                `malformed header line
`,
              ),
            );
            return;
          }
          let match = a.startLine.match(/^CONNECT\s+(\S+)\s+HTTP\/1\.[01]$/i),
            T = !match && /^[A-Z]+\s+http:\/\/\S+\s+HTTP\/1\.[01]$/i.test(a.startLine);
          if (!match && !T) {
            endSocket(
              r,
              plainHttpResponse(
                400,
                "Bad Request",
                `this is a forward proxy: expected CONNECT host:port or an absolute-form http:// request
`,
              ),
            );
            return;
          }
          if (!P(a.headerLines)) {
            (h(
              `client ${match ? "CONNECT" : "request"} without valid loopback credentials \u2192 407 challenge`,
            ),
              endSocket(r, proxyAuthRequiredResponse()));
            return;
          }
          if (T && /^TRACE\s/i.test(a.startLine)) {
            endSocket(
              r,
              plainHttpResponse(
                405,
                "Method Not Allowed",
                `TRACE is not forwarded by this proxy
`,
              ),
            );
            return;
          }
          if (T) {
            let p = pickHeaders(a.headerLines, ["content-length"]);
            if (getHeaderValue(a.headerLines, "transfer-encoding") !== void 0) {
              endSocket(
                r,
                plainHttpResponse(
                  501,
                  "Not Implemented",
                  `request bodies with Transfer-Encoding are not forwarded by this proxy; send a Content-Length
`,
                ),
              );
              return;
            }
            if (p.length > 1 || (p.length === 1 && !/^content-length:[ \t]*\d{1,15}[ \t]*$/i.test(p[0]))) {
              endSocket(
                r,
                plainHttpResponse(
                  400,
                  "Bad Request",
                  `a forwarded request may carry at most one numeric Content-Length
`,
                ),
              );
              return;
            }
          }
          if (T && e.connectOnly) {
            let p = parseAbsoluteFormRequest(a);
            if (p === void 0) {
              endSocket(
                r,
                plainHttpResponse(
                  400,
                  "Bad Request",
                  `expected an absolute-form http://host[:port]/path request with no user info
`,
                ),
              );
              return;
            }
            await ye(r, p.target, a, bufferSocket(r, a.rest), {
              head: p.head,
              bodyLength: Number(getHeaderValue(a.headerLines, "content-length") ?? "0"),
            });
            return;
          }
          let A = bufferSocket(r, a.rest);
          if (match) await ye(r, match[1], a, A);
          else await be(r, a, A);
        })().catch((a) => {
          (l(`internal error handling a proxied connection: ${redactSecretsInText(errorMessage(a))}`),
            r.destroy());
        }));
    });
  if (
    (await new Promise((r, a) => {
      (G.once("error", a),
        G.listen({ host: "127.0.0.1", port: 0 }, () => {
          (G.removeListener("error", a), r());
        }));
    }),
    G.on("error", (r) => l(`listener error: ${errorMessage(r)}`)),
    e.unrefListener)
  )
    G.unref();
  let port = G.address().port;
  return {
    url: `http://runner:${str}@127.0.0.1:${port}`,
    port: port,
    openConnections: () => R.size,
    close: () =>
      new Promise((r) => {
        for (let a of R) a.destroy();
        G.close(() => r());
      }),
  };
}
//@ chunk-88g43zt5.js:16132-16189 placement
function rn(e) {
  return /^[\d.]+$/.test(e) || e.includes(":");
}
//@ chunk-88g43zt5.js:16189-16212 placement
class we {
  active;
  handle;
}
//@ chunk-88g43zt5.js:16212-16237 placement
var on = new HostScoped(() => new we());
//@ chunk-88g43zt5.js:16237-16274 placement
function te() {
  return on.of(getRootSession().host);
}
//@ chunk-88g43zt5.js:16274-16308 placement
function isEgressProxyActive() {
  return te().active;
}
//@ chunk-88g43zt5.js:16308-16461 placement
function rewriteProxyEnv(e, n) {
  let mapped = PROXY_ENV_VARS.map((c) => [c, n[c]]),
    o = {},
    u = [];
  for (let [c, f] of mapped) {
    if (f !== void 0) o[c] = f;
    if (f) ((n[c] = e), u.push(c));
  }
  return { url: e, rewritten: u, original: o };
}
//@ chunk-88g43zt5.js:16461-16601 placement
function originalProxyEnv(e = process.env) {
  let active = te().active;
  if (!active) return { ...e };
  let s = { ...e };
  for (let o of PROXY_ENV_VARS) if (o in active.original) s[o] = active.original[o];
  return s;
}
//@ chunk-88g43zt5.js:16601-16881 placement
function egressProxyChildEnv(e = process.env) {
  let active = te().active;
  if (!active) return {};
  let s = {
    [Tjn]: void 0,
    [Ajn]: void 0,
    NO_PROXY: e.NO_PROXY,
    no_proxy: e.no_proxy,
    CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER: void 0,
    ALL_PROXY: void 0,
    all_proxy: void 0,
  };
  for (let o of PROXY_ENV_VARS) s[o] = active.rewritten.includes(o) ? active.url : void 0;
  return s;
}
/**
 * 确定 Proxy-Authorization 的来源：命令或文件（参数或环境变量），两者都设置时报错。
 */
//@ chunk-88g43zt5.js:16881-17471 placement
function resolveProxyAuthSource(options, env = process.env) {
  if (
    (options.command !== void 0 && options.command.trim() === "") ||
    (options.file !== void 0 && options.file.trim() === "")
  )
    throw Error("--proxy-authorization-command / --proxy-authorization-file must not be empty");
  let s = (options.command ?? env[Tjn])?.trim(),
    o = (options.file ?? env[Ajn])?.trim(),
    u = o ? resolve(o) : o,
    c = s !== void 0 && s !== "",
    f = u !== void 0 && u !== "";
  if (c && f)
    throw Error(
      "set only one of --proxy-authorization-command (SELF_HOSTED_RUNNER_PROXY_AUTHORIZATION_COMMAND) and --proxy-authorization-file (SELF_HOSTED_RUNNER_PROXY_AUTHORIZATION_FILE)",
    );
  if (c) return { kind: "command", command: s };
  if (f) return { kind: "file", path: u };
  return;
}
/**
 * 生成出口代理授权配置：确认已设置 HTTP(S)_PROXY 且为 http/https，返回来源与上游代理地址。
 */
//@ chunk-88g43zt5.js:17471-18045 placement
function proxyAuthorizationConfig(e, n = process.env) {
  let authSource = resolveProxyAuthSource(e, n);
  if (!authSource) return;
  let proxyUrl = getUsableProxyUrl(n),
    parsedProxy = proxyUrl ? parseProxyUrl(proxyUrl) : void 0;
  if (!proxyUrl || !parsedProxy)
    throw Error(
      "--proxy-authorization-command / --proxy-authorization-file require HTTPS_PROXY (or HTTP_PROXY) to be set to the upstream proxy URL that the Proxy-Authorization value is for (ALL_PROXY alone is not consulted)",
    );
  if (parsedProxy.protocol !== "http:" && parsedProxy.protocol !== "https:")
    throw Error(
      "--proxy-authorization-command / --proxy-authorization-file support http:// and https:// upstream proxies only (check the scheme of HTTPS_PROXY / HTTP_PROXY)",
    );
  return { source: authSource, upstreamProxyUrl: proxyUrl };
}
//@ chunk-88g43zt5.js:18045-19510 placement
async function startRunnerEgressProxy(e, n) {
  let s = te(),
    o = getMTLSConfig(),
    u = getCACertificates(),
    c = mintProxyAuthorization({
      source: e.source,
      upstreamProxyUrl: e.upstreamProxyUrl,
      commandEnv: () => ({
        ...originalProxyEnv(),
        SELF_HOSTED_RUNNER_POOL_SECRET: void 0,
        SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET: void 0,
      }),
    }),
    f = await startEgressProxy({
      upstreamProxyUrl: e.upstreamProxyUrl,
      minter: c,
      upstreamTls: { ...(o && { cert: o.cert, key: o.key, passphrase: o.passphrase }), ...(u && { ca: u }) },
      onStatus: n.onStatus,
      onDebug: n.onDebug,
    }),
    x = rewriteProxyEnv(f.url, process.env);
  if (((s.active = x), new Set(x.rewritten.map((h) => x.original[h])).size > 1))
    n.onStatus(
      `[runner:egress-proxy] note: ${x.rewritten.join("/")} named different proxies; all of them now go through the listener to ${redactSecretsInText(e.upstreamProxyUrl)} (the one this runner resolves for its own traffic)`,
    );
  if ((configureGlobalAgents(), process.env.CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER))
    n.onStatus(
      "[runner:egress-proxy] note: CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER is set on the runner; it is cleared for sessions while --proxy-authorization-* is active (the runner now mints Proxy-Authorization for all proxied traffic, and a session-side proxyAuthHelper header would be refused by the loopback listener)",
    );
  return (
    n.onStatus(
      `[runner:egress-proxy] enabled: minting Proxy-Authorization from the configured ${e.source.kind} for every CONNECT to the upstream proxy ${redactSecretsInText(e.upstreamProxyUrl)}; this runner and its sessions now use the loopback listener 127.0.0.1:${f.port} (rewrote ${x.rewritten.join(", ")})`,
    ),
    (s.handle = {
      ...f,
      close: async () => {
        (await f.close(), (s.active = void 0), (s.handle = void 0));
      },
    }),
    s.handle
  );
}
/**
 * 编排器子命令不支持 Proxy-Authorization 参数，传入时报错。
 */
//@ chunk-88g43zt5.js:19510-19972 placement
function rejectOrchestratorProxyAuth(e, n = process.env) {
  let s =
    e.find((o) => o === "--proxy-authorization-command" || o === "--proxy-authorization-file") ??
    [Tjn, Ajn].find((o) => n[o]?.trim());
  if (s !== void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `${s} is not yet supported with the orchestrator subcommand (only worker runners mint Proxy-Authorization for their egress proxy today). Unset it for the orchestrator process; the runners it spawns can still use it.`,
      "proxy-authorization knob given to the orchestrator subcommand",
    );
}

export {
  rejectOrchestratorProxyAuth,
  startEgressProxy,
  ProxyAuthorizationMintError,
  isEgressProxyActive,
  egressProxyChildEnv,
  Tjn,
  Ajn,
  proxyAuthorizationConfig,
  startRunnerEgressProxy,
};

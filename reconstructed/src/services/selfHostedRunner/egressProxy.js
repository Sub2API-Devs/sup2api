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
/**
 * 自托管 runner 出口代理相关常量：代理环境变量名、授权命令/文件环境变量与 runner 标识。
 */
var PROXY_ENV_VARS = ["https_proxy", "HTTPS_PROXY", "http_proxy", "HTTP_PROXY"];
var PROXY_AUTHORIZATION_COMMAND_ENV_VAR = "SELF_HOSTED_RUNNER_PROXY_AUTHORIZATION_COMMAND";
var RUNNER_PROXY_AUTHORIZATION_FILE_ENV = "SELF_HOSTED_RUNNER_PROXY_AUTHORIZATION_FILE";
var CLAUDE_SELF_HOSTED_RUNNER = "claude-self-hosted-runner";
//@ chunk-88g43zt5.js:1197-1284 placement
class ProxyAuthorizationMintError extends Error {
  constructor(message) {
    super(message);
    this.name = "ProxyAuthorizationMintError";
  }
}
//@ chunk-88g43zt5.js:1284-1457 placement
var HEAD_TIMEOUT_MS = 30000;
var MAX_HEAD_BYTES = 16384;
var CONNECT_TIMEOUT_MS = 30000;
var UPSTREAM_TIMEOUT_MS = 30000;
var AUTH_REFRESH_MS = 60000;
var DESTROY_GRACE_MS = 2000;
var MAX_PENDING_CONNECTIONS = 8;
var MAX_HEADER_LINE = 8192;
var MAX_RESPONSE_HEAD = 16384;
var MAX_HEADER_LINES = 256;
var MAX_BUFFERED_BYTES = 65536;
var CONTROL_CHAR_PATTERN = /[\x00-\x08\x0a-\x1f\x7f-\x9f]/;
var MAX_AUTHORIZATION_BYTES = 4096;
var HEADER_LINE_PATTERN = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+:/;
//@ chunk-88g43zt5.js:1457-1523 placement
/**
 * 清洗日志文本：去掉控制字符（含代理）并截断到给定长度。
 */
function sanitizeLogText(e, n = 200) {
  return truncateToLength(e.replace(/[\p{Cc}\p{Cs}]/gu, ""), n);
}
//@ chunk-88g43zt5.js:1523-1637 placement
function sanitizeAuthorization(headerValue) {
  if (headerValue === undefined || headerValue === "") return;
  if (Buffer.byteLength(headerValue, "latin1") > MAX_AUTHORIZATION_BYTES) return;
  return CONTROL_CHAR_PATTERN.test(headerValue) ? undefined : headerValue;
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
//@ chunk-88g43zt5.js:1971-3329 placement
/**
 * 从 --proxy-authorization-command（执行命令）或 --proxy-authorization-file（读文件）取得代理认证值，带超时与大小限制。
 */
function mintProxyAuthorization(e) {
  let { source } = e;
  let commandTimeoutMs = e.commandTimeoutMs ?? HEAD_TIMEOUT_MS;
  let o;
  try {
    o = new URL(e.upstreamProxyUrl).hostname;
  } catch {
    o = undefined;
  }
  let u;
  let c = async (challenge) => {
    if (source.kind === "file") {
      if (u)
        throw new ProxyAuthorizationMintError(
          "proxy authorization file could not be read: an earlier read has not returned yet (stalled mount?); not issuing another",
        );
      let l;
      let R = false;
      let Y = (async () => {
        let U = await open(source.path, "r");
        try {
          let F = Buffer.alloc(MAX_HEAD_BYTES + 1);
          let { bytesRead } = await U.read(F, 0, F.length, 0);
          return F.subarray(0, bytesRead).toString("utf8");
        } finally {
          await U.close();
        }
      })();
      let v = () => {
        R = true;
        if (u === Y) u = undefined;
      };
      Y.then(v, v);
      try {
        l = await withBoundedTimeout(Y, commandTimeoutMs, "read");
      } catch (error) {
        if (!R) u = Y;
        throw new ProxyAuthorizationMintError(
          `proxy authorization file could not be read: ${redactSecretsInText(errorMessage(error))}`,
        );
      }
      return validateProxyAuthorization(l);
    }
    let env = {
      ...(typeof e.commandEnv === "function" ? e.commandEnv() : (e.commandEnv ?? process.env)),
      CLAUDE_CODE_PROXY_URL: e.upstreamProxyUrl,
      ...(o && {
        CLAUDE_CODE_PROXY_HOST: o,
      }),
      ...(challenge && {
        CLAUDE_CODE_PROXY_AUTHENTICATE: challenge,
      }),
    };
    let h = await safeExecShell(source.command, {
      timeout: commandTimeoutMs,
      reject: false,
      stdin: "ignore",
      useToolMemoryCgroup: false,
      extendEnv: false,
      env,
    });
    if (h.failed) {
      let l = h.timedOut
        ? `timed out after ${commandTimeoutMs}ms`
        : `exited ${h.exitCode ?? h.signal ?? "abnormally"}`;
      let trimmed = h.stderr?.trim();
      throw new ProxyAuthorizationMintError(
        `proxy authorization command ${l}${trimmed ? `: ${truncateToLength(redactSecretsInText(trimmed), 500)}` : ""}`,
      );
    }
    return validateProxyAuthorization(h.stdout ?? "");
  };
  let f = new Map();
  return {
    source: source.kind,
    mint(x) {
      let P = x === undefined ? "plain" : `remint:${x.challenge ?? ""}`;
      let h = f.get(P);
      if (!h) {
        h = c(x?.challenge).finally(() => {
          f.delete(P);
        });
        f.set(P, h);
      }
      return h;
    },
  };
}
//@ chunk-88g43zt5.js:3329-3484 placement
function getHeaderValue(headerLines, n) {
  let lower = n.toLowerCase();
  for (let o of headerLines) {
    let index = o.indexOf(":");
    if (index > 0 && o.slice(0, index).trim().toLowerCase() === lower) return o.slice(index + 1).trim();
  }
  return;
}
//@ chunk-88g43zt5.js:3484-3642 placement
function pickHeaders(headerLines, n) {
  let s = new Set(n.map((o) => o.toLowerCase()));
  return headerLines.filter((o) => {
    let index = o.indexOf(":");
    return index > 0 && s.has(o.slice(0, index).trim().toLowerCase());
  });
}
//@ chunk-88g43zt5.js:3642-3801 placement
function omitHeaders(headerLines, n) {
  let s = new Set(n.map((o) => o.toLowerCase()));
  return headerLines.filter((o) => {
    let index = o.indexOf(":");
    return !(index > 0 && s.has(o.slice(0, index).trim().toLowerCase()));
  });
}
//@ chunk-88g43zt5.js:3801-3811 placement
var MIN_TRIM_LINE_CHARS = 16;
//@ chunk-88g43zt5.js:3811-4034 placement
function headContainsSecret(e, n) {
  let str = Buffer.from(n, "utf8").toString("latin1");
  let o = [str];
  let u = str.search(/[ \t]/);
  if (u > 0) {
    let trimmed = str.slice(u).trim();
    if (trimmed.length >= MIN_TRIM_LINE_CHARS) o.push(trimmed);
  }
  return [e.startLine, ...e.headerLines].some((c) => o.some((f) => c.includes(f)));
}
//@ chunk-88g43zt5.js:4034-4091 placement
var PROXY_AUTH_HEADER_NAMES = ["proxy-authenticate", "proxy-authentication-info"];
//@ chunk-88g43zt5.js:4091-4408 placement
/**
 * 把一个流的数据转发到另一个流，最多转发指定字节数（超出时回调一次），处理背压。
 */
function pipeLimited(e, n, s, o, u) {
  let c = s;
  let f = false;
  let x = (P) => {
    if (n.destroyed || !n.writable) return;
    if (P.length > c && !f) {
      f = true;
      u();
    }
    if (c === 0 || P.length === 0) return;
    let h = P.length <= c ? P : P.subarray(0, c);
    c -= h.length;
    if (!n.write(h) && c > 0) {
      e.pause();
      n.once("drain", () => e.resume());
    }
  };
  x(o);
  e.on("data", x);
  e.resume();
  return () => {
    e.removeListener("data", x);
  };
}
//@ chunk-88g43zt5.js:4408-5258 placement
/**
 * 从 socket 读取 HTTP 请求/响应头直到空行：超时、超过大小上限或连接提前关闭时报错；返回起始行、头部行与剩余字节。
 */
function readHttpHead(socket, maxBytes, timeoutMs, prefix = Buffer.alloc(0)) {
  return new Promise((resolve, reject) => {
    let f = prefix;
    let x = false;
    let P = (v, U) => {};
    let timer = setTimeout(
      (v) => v(Error("timed out waiting for the request/response head")),
      timeoutMs,
      (v) => P(v),
    );
    let l = (v) => {
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
      let str = f.subarray(0, index).toString("latin1");
      let [q = "", ...V] = str.split(`\r
`);
      P(null, {
        startLine: q,
        headerLines: V,
        rest: f.subarray(index + 4),
      });
    };
    let R = () => P(Error("connection closed before the head was complete"));
    let Y = (v) => P(v);
    P = (v, U) => {
      x = true;
      clearTimeout(timer);
      socket.removeListener("data", l);
      socket.removeListener("close", R);
      socket.removeListener("error", Y);
      socket.pause();
      if (v) reject(v);
      else resolve(U);
    };
    socket.on("data", l);
    socket.once("close", R);
    socket.once("error", Y);
    if (f.length > 0) l(Buffer.alloc(0));
    if (!x) socket.resume();
  });
}
//@ chunk-88g43zt5.js:5258-5372 placement
function endSocket(e, n) {
  if (e.destroyed) return;
  e.resume();
  if (e.writable) e.end(n);
  setTimeout((s) => s.destroy(), DESTROY_GRACE_MS, e).unref();
}
//@ chunk-88g43zt5.js:5372-5417 placement
function latin1Buffer(e) {
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
//@ chunk-88g43zt5.js:5712-6305 placement
/**
 * 解析出口代理收到的绝对形式 HTTP 请求（http://host/...），去掉代理相关头并补 Host，得到目标与改写后的请求头。
 */
function parseAbsoluteFormRequest(head) {
  let match = head.startLine.match(/^([A-Z]+)\s+http:\/\/([^/?#\s]+)(\S*)\s+(HTTP\/1\.[01])$/i);
  if (!match) return;
  let [, s, o, u, c] = match;
  let match_2 = o.match(/^(\[[0-9A-Fa-f:.]+\]|[^:@[\]]+)(?::(\d{1,5}))?$/);
  if (!match_2 || (match_2[2] !== undefined && Number(match_2[2]) > 65535)) return;
  let target = `${match_2[1]}:${match_2[2] ?? "80"}`;
  let P = u.startsWith("/") ? u : `/${u}`;
  let filtered = head.headerLines.filter((headerLine) => {
    let lower = headerLine.slice(0, headerLine.indexOf(":")).trim().toLowerCase();
    return !lower.startsWith("proxy-") && lower !== "connection" && lower !== "keep-alive";
  });
  if (getHeaderValue(filtered, "host") === undefined) filtered.push(`Host: ${o}`);
  return {
    target,
    head: latin1Buffer(
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
//@ chunk-88g43zt5.js:6434-6746 placement
/**
 * 暂时缓冲 socket 的数据（超量时暂停），返回是否已关闭与取出缓冲的方法。
 */
function bufferSocket(e, n) {
  let s = false;
  let o = n.length > 0 ? [n] : [];
  let u = n.length;
  let c = (x) => {
    o.push(x);
    u += x.length;
    if (u > MAX_BUFFERED_BYTES) e.pause();
  };
  let f = () => {
    s = true;
  };
  e.on("data", c);
  e.once("end", f);
  e.once("close", f);
  e.resume();
  return {
    gone: () => s || e.destroyed,
    release: () => {
      e.removeListener("data", c);
      let x = o.length === 1 ? o[0] : Buffer.concat(o);
      o = [];
      u = 0;
      return x;
    },
  };
}
//@ chunk-88g43zt5.js:6746-16132 placement
/**
 * 自托管 runner 的出口代理（runner:egress-proxy）：本地监听并转发到上游 HTTP(S) 代理，注入 Proxy-Authorization，处理 CONNECT 与 407。
 */
async function startEgressProxy(e) {
  let n = new URL(e.upstreamProxyUrl);
  let s = n.protocol === "https:";
  if (n.protocol !== "http:" && !s) throw Error("the upstream proxy URL must be http:// or https://");
  let replaced = n.hostname.replace(/^\[(.*)\]$/, "$1");
  let port = n.port ? Number(n.port) : s ? 443 : 80;
  let logLabel = e.logLabel ?? "runner:egress-proxy";
  if (n.username || n.password)
    e.onStatus(
      `[${logLabel}] note: the upstream proxy URL carries user:password credentials; they are replaced by the minted Proxy-Authorization value on every request to the upstream proxy`,
    );
  let str = randomBytes(24).toString("base64url");
  let buffer = Buffer.from("Basic " + Buffer.from(`runner:${str}`).toString("base64"));
  let P = (headerLines) => {
    let headerValue = getHeaderValue(headerLines, "proxy-authorization");
    if (headerValue === undefined) return false;
    let buffer_2 = Buffer.from(headerValue);
    return buffer_2.length === buffer.length && timingSafeEqual(buffer_2, buffer);
  };
  let h = (r) => e.onDebug?.(`[${logLabel}] ${r}`);
  let l = (r) => e.onStatus(`[${logLabel}] ${r}`);
  let R = new Set();
  let Y = (r) => {
    R.add(r);
    r.on("error", (a) => h(`socket: ${errorMessage(a)}`));
    r.once("close", () => R.delete(r));
  };
  let v = () => {
    e.onUpstreamFailure?.().catch((error) =>
      h(`reload after a failed upstream connection: ${errorMessage(error)}`),
    );
  };
  let U = () =>
    new Promise((resolve, reject) => {
      let E = s
        ? connect_2({
            host: replaced,
            port,
            servername: isIpLiteralHost(replaced) ? undefined : replaced,
            ...(typeof e.upstreamTls === "function" ? e.upstreamTls() : e.upstreamTls),
          })
        : connect({
            host: replaced,
            port,
          });
      Y(E);
      let T = s ? "secureConnect" : "connect";
      let A = (y) => {};
      let timer = setTimeout(
        (y) => y(Error("timed out connecting to the upstream proxy")),
        UPSTREAM_TIMEOUT_MS,
        (y) => A(y),
      );
      let S = () => A(null);
      let L = (y) => A(y);
      let N = () => A(Error("upstream proxy closed the connection during connect"));
      A = (y) => {
        clearTimeout(timer);
        E.removeListener(T, S);
        E.removeListener("error", L);
        E.removeListener("close", N);
        if (y) {
          E.destroy();
          v();
          reject(y);
        } else resolve(E);
      };
      E.once(T, S);
      E.once("error", L);
      E.once("close", N);
    });
  let F = (r, a) => {
    r.pipe(a);
    a.pipe(r);
    let E = () => {
      r.destroy();
      a.destroy();
    };
    r.on("error", E);
    a.on("error", E);
    r.on("close", () => endSocket(a, ""));
    a.on("close", () => endSocket(r, ""));
    r.resume();
    a.resume();
  };
  let q = async (r, a, E, T) => {
    let A = await e.minter.mint(E);
    if (T()) throw new ClientGoneError();
    let p = await U();
    if (T()) {
      p.destroy();
      throw new ClientGoneError();
    }
    try {
      p.write(
        Buffer.concat([
          latin1Buffer(`CONNECT ${r} HTTP/1.1\r
Host: ${r}\r
`),
          Buffer.from(`Proxy-Authorization: ${A}\r
`),
          latin1Buffer(
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
      let head = await readHttpHead(p, MAX_RESPONSE_HEAD, AUTH_REFRESH_MS);
      if (T()) throw new ClientGoneError();
      return {
        up: p,
        head,
        value: A,
      };
    } catch (error) {
      p.destroy();
      if (!(error instanceof ClientGoneError)) v();
      throw error;
    }
  };
  let V = (head) => {
    let match = head.startLine.match(/^HTTP\/1\.[01]\s+(\d{3})(?=\s|$)/);
    return match ? Number(match[1]) : 0;
  };
  let me = (r, error, E) => {
    if (error instanceof ClientGoneError || r.destroyed) {
      r.destroy();
      return;
    }
    let T =
      error instanceof ProxyAuthorizationMintError
        ? error.message
        : `upstream proxy connection failed: ${redactSecretsInText(errorMessage(error))}`;
    l(`${T} (${sanitizeLogText(E)} answered 502)`);
    endSocket(
      r,
      plainHttpResponse(
        502,
        "Bad Gateway",
        error instanceof ProxyAuthorizationMintError
          ? `proxy authorization could not be obtained (see the runner log)
`
          : `upstream proxy connection failed (see the runner log)
`,
      ),
    );
  };
  let Ue = (r, a, E, startLine) => {
    a.destroy();
    l(
      `upstream proxy rejected the minted Proxy-Authorization for ${sanitizeLogText(E)} (${sanitizeLogText(startLine)}); answering the client 502`,
    );
    endSocket(
      r,
      plainHttpResponse(
        502,
        "Bad Gateway",
        `upstream proxy rejected the runner-minted Proxy-Authorization (407); see the runner log
`,
      ),
    );
  };
  let re = (r, a, E, T) => {
    a.destroy();
    l(
      `upstream response to ${sanitizeLogText(E)} (status ${T}) reflected the minted Proxy-Authorization in its head; withheld, answering the client 502`,
    );
    endSocket(
      r,
      plainHttpResponse(
        502,
        "Bad Gateway",
        `upstream proxy response withheld: its head reflected the runner-minted Proxy-Authorization (see the runner log)
`,
      ),
    );
  };
  let ye = async (r, a, E, T, A) => {
    let p = pickHeaders(E.headerLines, ["user-agent"]);
    let S = () => T.gone();
    try {
      let L = await q(a, p, undefined, S);
      let N = V(L.head);
      if (N === 407) {
        let challenge = sanitizeAuthorization(getHeaderValue(L.head.headerLines, "proxy-authenticate"));
        L.up.destroy();
        h(`upstream answered 407 for CONNECT ${a}; re-minting once`);
        L = await q(
          a,
          p,
          {
            challenge,
          },
          S,
        );
        N = V(L.head);
      }
      let { up, head, value: se } = L;
      if (N !== 200 && headContainsSecret(head, se)) {
        re(r, up, `CONNECT ${a}`, N);
        return;
      }
      if (N === 407) {
        Ue(r, up, `CONNECT ${a}`, head.startLine);
        return;
      }
      if (N < 100) {
        up.destroy();
        l(
          `upstream proxy sent an unparseable reply to CONNECT ${sanitizeLogText(a)}; answering the client 502`,
        );
        endSocket(
          r,
          plainHttpResponse(
            502,
            "Bad Gateway",
            `unparseable reply from upstream proxy
`,
          ),
        );
        return;
      }
      if (N === 200) {
        h(`tunnel established: CONNECT ${a}`);
        if (A === undefined)
          r.write(`HTTP/1.1 200 Connection Established\r
\r
`);
        if (head.rest.length > 0) r.write(head.rest);
        if (A !== undefined) {
          up.write(A.head);
          let _e = pipeLimited(r, up, A.bodyLength, T.release(), () =>
            h("client sent bytes past its declared Content-Length on a plain HTTP request; not forwarded"),
          );
          up.pipe(r);
          up.once("close", () => {
            _e();
            endSocket(r, "");
          });
          r.once("close", () => {
            _e();
            up.destroy();
          });
          return;
        }
        let b = T.release();
        if (b.length > 0) up.write(b);
        F(r, up);
        return;
      }
      up.destroy();
      l(`upstream proxy refused CONNECT ${sanitizeLogText(a)}: ${sanitizeLogText(head.startLine)}`);
      let z = omitHeaders(head.headerLines, [
        "connection",
        "proxy-connection",
        "keep-alive",
        "transfer-encoding",
        "content-length",
        ...PROXY_AUTH_HEADER_NAMES,
      ]);
      endSocket(
        r,
        latin1Buffer(
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
  };
  let be = async (r, a, E) => {
    let T = omitHeaders(a.headerLines, [
      "proxy-authorization",
      "proxy-connection",
      "connection",
      "keep-alive",
      "upgrade",
      "te",
      "trailer",
      "max-forwards",
    ]);
    let A = Number(getHeaderValue(a.headerLines, "content-length") ?? "0");
    let p;
    let S = () => {};
    let L = () => {
      S();
      p?.destroy();
      r.destroy();
    };
    try {
      {
        let N = await e.minter.mint();
        if (E.gone()) {
          L();
          return;
        }
        p = await U();
        if (E.gone()) {
          L();
          return;
        }
        p.write(
          Buffer.concat([
            latin1Buffer(
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
            Buffer.from(`Proxy-Authorization: ${N}\r
`),
            latin1Buffer(`Connection: close\r
\r
`),
          ]),
        );
        if (A > 0)
          S = pipeLimited(r, p, A, E.release(), () =>
            h("client sent bytes past its declared Content-Length on a plain HTTP request; not forwarded"),
          );
        let httpHead = await readHttpHead(p, MAX_RESPONSE_HEAD, AUTH_REFRESH_MS);
        let O = V(httpHead);
        let se = 0;
        while (O >= 100 && O < 200 && O !== 101) {
          if (E.gone()) {
            L();
            return;
          }
          if (headContainsSecret(httpHead, N)) {
            S();
            re(r, p, "a plain HTTP request", O);
            return;
          }
          if (++se > MAX_PENDING_CONNECTIONS) {
            p.destroy();
            S();
            l(
              `upstream sent more than ${MAX_PENDING_CONNECTIONS} interim responses to a plain HTTP request; answering the client 502`,
            );
            endSocket(
              r,
              plainHttpResponse(
                502,
                "Bad Gateway",
                `too many interim responses from upstream
`,
              ),
            );
            return;
          }
          r.write(
            latin1Buffer(
              httpHead.startLine +
                `\r
` +
                omitHeaders(httpHead.headerLines, PROXY_AUTH_HEADER_NAMES)
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
          );
          httpHead = await readHttpHead(p, MAX_RESPONSE_HEAD, AUTH_REFRESH_MS, httpHead.rest);
          O = V(httpHead);
        }
        if (E.gone()) {
          L();
          return;
        }
        if (headContainsSecret(httpHead, N)) {
          S();
          re(r, p, "a plain HTTP request", O);
          return;
        }
        if (O === 407) {
          S();
          p.destroy();
          l(
            `upstream answered 407 to a plain HTTP request (${sanitizeLogText(httpHead.startLine)}); it may have come from the destination site rather than the proxy, and re-mint is only attempted for CONNECT tunnels; answering the client 502`,
          );
          endSocket(
            r,
            plainHttpResponse(
              502,
              "Bad Gateway",
              `upstream answered 407 (Proxy Authentication Required) to a plain HTTP request; it may have come from the destination site rather than the proxy; see the runner log
`,
            ),
          );
          return;
        }
        if (O < 100) {
          p.destroy();
          S();
          l("upstream proxy sent an unparseable reply to a plain HTTP request; answering the client 502");
          endSocket(
            r,
            plainHttpResponse(
              502,
              "Bad Gateway",
              `unparseable reply from upstream proxy
`,
            ),
          );
          return;
        }
        if (O >= 400) {
          p.destroy();
          S();
          l(
            `upstream answered ${sanitizeLogText(httpHead.startLine)} to a plain HTTP request; error body withheld from the client`,
          );
          endSocket(
            r,
            latin1Buffer(
              httpHead.startLine +
                `\r
` +
                omitHeaders(httpHead.headerLines, [
                  "connection",
                  "proxy-connection",
                  "keep-alive",
                  "transfer-encoding",
                  "content-length",
                  ...PROXY_AUTH_HEADER_NAMES,
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
          );
          return;
        }
        r.write(
          latin1Buffer(
            httpHead.startLine +
              `\r
` +
              omitHeaders(httpHead.headerLines, [
                "connection",
                "proxy-connection",
                "keep-alive",
                ...PROXY_AUTH_HEADER_NAMES,
              ])
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
        );
        if (httpHead.rest.length > 0) r.write(httpHead.rest);
        let z = p;
        z.pipe(r);
        z.on("error", () => r.destroy());
        r.on("error", () => z.destroy());
        z.on("close", () => endSocket(r, ""));
        r.on("close", () => z.destroy());
        z.resume();
        r.resume();
      }
    } catch (error) {
      S();
      p?.destroy();
      me(r, error, "plain HTTP request");
    }
  };
  let oe = 0;
  let maxPendingClients = e.maxPendingClients ?? MAX_HEADER_LINES;
  let server = createServer(
    {
      pauseOnConnect: true,
    },
    (r) => {
      Y(r);
      r.on("error", () => r.destroy());
      if (oe >= maxPendingClients) {
        h("too many connections still sending a request head; refusing one");
        r.destroy();
        return;
      }
      oe++;
      (async () => {
        let head;
        try {
          head = await readHttpHead(r, MAX_HEADER_LINE, CONNECT_TIMEOUT_MS);
        } catch (error) {
          h(`client: ${errorMessage(error)}`);
          if (!r.destroyed && r.writable && r.bytesRead > 0)
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
          CONTROL_CHAR_PATTERN.test(head.startLine) ||
          head.headerLines.some(
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
        let match = head.startLine.match(/^CONNECT\s+(\S+)\s+HTTP\/1\.[01]$/i);
        let T = !match && /^[A-Z]+\s+http:\/\/\S+\s+HTTP\/1\.[01]$/i.test(head.startLine);
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
        if (!P(head.headerLines)) {
          h(
            `client ${match ? "CONNECT" : "request"} without valid loopback credentials \u2192 407 challenge`,
          );
          endSocket(r, proxyAuthRequiredResponse());
          return;
        }
        if (T && /^TRACE\s/i.test(head.startLine)) {
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
          let p = pickHeaders(head.headerLines, ["content-length"]);
          if (getHeaderValue(head.headerLines, "transfer-encoding") !== undefined) {
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
          let absoluteFormRequest = parseAbsoluteFormRequest(head);
          if (absoluteFormRequest === undefined) {
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
          await ye(r, absoluteFormRequest.target, head, bufferSocket(r, head.rest), {
            head: absoluteFormRequest.head,
            bodyLength: Number(getHeaderValue(head.headerLines, "content-length") ?? "0"),
          });
          return;
        }
        let A = bufferSocket(r, head.rest);
        if (match) await ye(r, match[1], head, A);
        else await be(r, head, A);
      })().catch((error) => {
        l(`internal error handling a proxied connection: ${redactSecretsInText(errorMessage(error))}`);
        r.destroy();
      });
    },
  );
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(
      {
        host: "127.0.0.1",
        port: 0,
      },
      () => {
        server.removeListener("error", reject);
        resolve();
      },
    );
  });
  server.on("error", (r) => l(`listener error: ${errorMessage(r)}`));
  if (e.unrefListener) server.unref();
  let port_2 = server.address().port;
  return {
    url: `http://runner:${str}@127.0.0.1:${port_2}`,
    port: port_2,
    openConnections: () => R.size,
    close: () =>
      new Promise((resolve) => {
        for (let a of R) a.destroy();
        server.close(() => resolve());
      }),
  };
}
//@ chunk-88g43zt5.js:16132-16189 placement
function isIpLiteralHost(e) {
  return /^[\d.]+$/.test(e) || e.includes(":");
}
//@ chunk-88g43zt5.js:16189-16212 placement
/**
 * 单个 host 的出口代理状态：当前活动连接与句柄。
 */
class EgressProxyState {
  active;
  handle;
}
//@ chunk-88g43zt5.js:16212-16237 placement
var egressProxySlots = new HostScoped(() => new EgressProxyState());
//@ chunk-88g43zt5.js:16237-16274 placement
/**
 * 取当前 host 的出口代理状态。
 */
function currentEgressProxy() {
  return egressProxySlots.of(getRootSession().host);
}
//@ chunk-88g43zt5.js:16274-16308 placement
function isEgressProxyActive() {
  return currentEgressProxy().active;
}
//@ chunk-88g43zt5.js:16308-16461 placement
function rewriteProxyEnv(url, env) {
  let mapped = PROXY_ENV_VARS.map((c) => [c, env[c]]);
  let o = {};
  let u = [];
  for (let [c, f] of mapped) {
    if (f !== undefined) o[c] = f;
    if (f) {
      env[c] = url;
      u.push(c);
    }
  }
  return {
    url,
    rewritten: u,
    original: o,
  };
}
//@ chunk-88g43zt5.js:16461-16601 placement
function originalProxyEnv(e = process.env) {
  let active = currentEgressProxy().active;
  if (!active)
    return {
      ...e,
    };
  let s = {
    ...e,
  };
  for (let o of PROXY_ENV_VARS) if (o in active.original) s[o] = active.original[o];
  return s;
}
//@ chunk-88g43zt5.js:16601-16881 placement
function egressProxyChildEnv(e = process.env) {
  let active = currentEgressProxy().active;
  if (!active) return {};
  let s = {
    [PROXY_AUTHORIZATION_COMMAND_ENV_VAR]: undefined,
    [RUNNER_PROXY_AUTHORIZATION_FILE_ENV]: undefined,
    NO_PROXY: e.NO_PROXY,
    no_proxy: e.no_proxy,
    CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER: undefined,
    ALL_PROXY: undefined,
    all_proxy: undefined,
  };
  for (let o of PROXY_ENV_VARS) s[o] = active.rewritten.includes(o) ? active.url : undefined;
  return s;
}
//@ chunk-88g43zt5.js:16881-17471 placement
/**
 * 确定 Proxy-Authorization 的来源：命令或文件（参数或环境变量），两者都设置时报错。
 */
function resolveProxyAuthSource(options, env = process.env) {
  if (
    (options.command !== undefined && options.command.trim() === "") ||
    (options.file !== undefined && options.file.trim() === "")
  )
    throw Error("--proxy-authorization-command / --proxy-authorization-file must not be empty");
  let trimmed = (options.command ?? env[PROXY_AUTHORIZATION_COMMAND_ENV_VAR])?.trim();
  let trimmed_2 = (options.file ?? env[RUNNER_PROXY_AUTHORIZATION_FILE_ENV])?.trim();
  let u = trimmed_2 ? resolve(trimmed_2) : trimmed_2;
  let c = trimmed !== undefined && trimmed !== "";
  let f = u !== undefined && u !== "";
  if (c && f)
    throw Error(
      "set only one of --proxy-authorization-command (SELF_HOSTED_RUNNER_PROXY_AUTHORIZATION_COMMAND) and --proxy-authorization-file (SELF_HOSTED_RUNNER_PROXY_AUTHORIZATION_FILE)",
    );
  if (c)
    return {
      kind: "command",
      command: trimmed,
    };
  if (f)
    return {
      kind: "file",
      path: u,
    };
  return;
}
//@ chunk-88g43zt5.js:17471-18045 placement
/**
 * 生成出口代理授权配置：确认已设置 HTTP(S)_PROXY 且为 http/https，返回来源与上游代理地址。
 */
function proxyAuthorizationConfig(options, env = process.env) {
  let authSource = resolveProxyAuthSource(options, env);
  if (!authSource) return;
  let proxyUrl = getUsableProxyUrl(env);
  let parsedProxy = proxyUrl ? parseProxyUrl(proxyUrl) : undefined;
  if (!proxyUrl || !parsedProxy)
    throw Error(
      "--proxy-authorization-command / --proxy-authorization-file require HTTPS_PROXY (or HTTP_PROXY) to be set to the upstream proxy URL that the Proxy-Authorization value is for (ALL_PROXY alone is not consulted)",
    );
  if (parsedProxy.protocol !== "http:" && parsedProxy.protocol !== "https:")
    throw Error(
      "--proxy-authorization-command / --proxy-authorization-file support http:// and https:// upstream proxies only (check the scheme of HTTPS_PROXY / HTTP_PROXY)",
    );
  return {
    source: authSource,
    upstreamProxyUrl: proxyUrl,
  };
}
//@ chunk-88g43zt5.js:18045-19510 placement
async function startRunnerEgressProxy(e, n) {
  let s = currentEgressProxy();
  let mtlsConfig = getMTLSConfig();
  let caCertificates = getCACertificates();
  let minter = mintProxyAuthorization({
    source: e.source,
    upstreamProxyUrl: e.upstreamProxyUrl,
    commandEnv: () => ({
      ...originalProxyEnv(),
      SELF_HOSTED_RUNNER_POOL_SECRET: undefined,
      SELF_HOSTED_RUNNER_ENVIRONMENT_SECRET: undefined,
    }),
  });
  let egressProxy = await startEgressProxy({
    upstreamProxyUrl: e.upstreamProxyUrl,
    minter,
    upstreamTls: {
      ...(mtlsConfig && {
        cert: mtlsConfig.cert,
        key: mtlsConfig.key,
        passphrase: mtlsConfig.passphrase,
      }),
      ...(caCertificates && {
        ca: caCertificates,
      }),
    },
    onStatus: n.onStatus,
    onDebug: n.onDebug,
  });
  let x = rewriteProxyEnv(egressProxy.url, process.env);
  s.active = x;
  if (new Set(x.rewritten.map((h) => x.original[h])).size > 1)
    n.onStatus(
      `[runner:egress-proxy] note: ${x.rewritten.join("/")} named different proxies; all of them now go through the listener to ${redactSecretsInText(e.upstreamProxyUrl)} (the one this runner resolves for its own traffic)`,
    );
  configureGlobalAgents();
  if (process.env.CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER)
    n.onStatus(
      "[runner:egress-proxy] note: CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER is set on the runner; it is cleared for sessions while --proxy-authorization-* is active (the runner now mints Proxy-Authorization for all proxied traffic, and a session-side proxyAuthHelper header would be refused by the loopback listener)",
    );
  n.onStatus(
    `[runner:egress-proxy] enabled: minting Proxy-Authorization from the configured ${e.source.kind} for every CONNECT to the upstream proxy ${redactSecretsInText(e.upstreamProxyUrl)}; this runner and its sessions now use the loopback listener 127.0.0.1:${egressProxy.port} (rewrote ${x.rewritten.join(", ")})`,
  );
  s.handle = {
    ...egressProxy,
    close: async () => {
      await egressProxy.close();
      s.active = undefined;
      s.handle = undefined;
    },
  };
  return s.handle;
}
//@ chunk-88g43zt5.js:19510-19972 placement
/**
 * 编排器子命令不支持 Proxy-Authorization 参数，传入时报错。
 */
function rejectOrchestratorProxyAuth(e, n = process.env) {
  let s =
    e.find((o) => o === "--proxy-authorization-command" || o === "--proxy-authorization-file") ??
    [PROXY_AUTHORIZATION_COMMAND_ENV_VAR, RUNNER_PROXY_AUTHORIZATION_FILE_ENV].find((o) => n[o]?.trim());
  if (s !== undefined)
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
  PROXY_AUTHORIZATION_COMMAND_ENV_VAR,
  RUNNER_PROXY_AUTHORIZATION_FILE_ENV,
  proxyAuthorizationConfig,
  startRunnerEgressProxy,
};

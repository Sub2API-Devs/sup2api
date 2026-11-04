/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/parent-proxy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-078pp0rm.js (19)
 * attribution: esm-fingerprint 18, esm-layout 1
 */
import { URL as x } from "url";
import { BlockList, isIP, connect } from "net";
import { connect as connect_2 } from "tls";
import { logForDebugging } from "../utils/debug.js";
import { addRange, ipFamily, addressInSet, mappedIPv4 } from "./address.js";

//@ chunk-078pp0rm.js:2133-2291 esm-fingerprint
var CONNECT_TIMEOUT_MS = 30000;
var HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "proxy-connection",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
]);
//@ chunk-078pp0rm.js:2291-2891 esm-fingerprint
function resolveParentProxy(cfg) {
  let http = cfg?.http ?? process.env.HTTP_PROXY ?? process.env.http_proxy ?? undefined;
  let https = cfg?.https ?? process.env.HTTPS_PROXY ?? process.env.https_proxy ?? http;
  let noProxyRaw = cfg?.noProxy ?? process.env.NO_PROXY ?? process.env.no_proxy ?? "";
  if (!http && !https) return;
  let parse = (u) => {
    if (!u) return;
    let withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(u) ? u : `http://${u}`;
    try {
      let parsed = new x(withScheme);
      if ((parsed.protocol !== "http:" && parsed.protocol !== "https:") || !parsed.hostname)
        throw Error("unsupported scheme or empty host");
      return parsed;
    } catch {
      logForDebugging(`Invalid parent proxy URL, ignoring: ${redactUserinfo(u)}`, {
        level: "error",
      });
      return;
    }
  };
  let httpUrl = parse(http);
  let httpsUrl = parse(https);
  if (!httpUrl && !httpsUrl) return;
  return {
    httpUrl,
    httpsUrl,
    noProxy: parseNoProxy(noProxyRaw),
  };
}
//@ chunk-078pp0rm.js:2891-3321 esm-fingerprint
function parseNoProxy(raw) {
  let rules = {
    all: false,
    suffixes: [],
    cidr: new BlockList(),
  };
  for (let entry of raw.split(",")) {
    entry = entry.trim();
    if (!entry) continue;
    if (entry === "*") {
      rules.all = true;
      continue;
    }
    if (entry.includes("/")) {
      addRange(rules.cidr, entry);
      continue;
    }
    let v = entry.toLowerCase();
    let bracketed = /^\[([^\]]+)\](?::\d+)?$/.exec(v);
    if (bracketed) v = bracketed[1];
    if (v.startsWith("*.")) v = v.slice(1);
    if (!isIP(v)) {
      let colon = v.lastIndexOf(":");
      if (colon !== -1 && /^\d+$/.test(v.slice(colon + 1))) v = v.slice(0, colon);
    } else if (addRange(rules.cidr, v)) continue;
    rules.suffixes.push(v);
  }
  return rules;
}
//@ chunk-078pp0rm.js:3321-3627 esm-fingerprint
function shouldBypassParentProxy(resolved, host) {
  let h = stripBrackets(host.toLowerCase().replace(/\.$/, ""));
  if (h === "localhost" || ipFamily(h)) return true;
  if (resolved.noProxy.all) return true;
  if (addressInSet(resolved.noProxy.cidr, h)) return true;
  for (let v of resolved.noProxy.suffixes)
    if (v.startsWith(".")) {
      if (h === v.slice(1) || h.endsWith(v)) return true;
    } else if (h === v || h.endsWith("." + v)) return true;
  return false;
}
//@ chunk-078pp0rm.js:3627-3704 esm-fingerprint
function selectParentProxyUrl(resolved, opts) {
  if (opts.isHttps) return resolved.httpsUrl ?? resolved.httpUrl;
  return resolved.httpUrl;
}
//@ chunk-078pp0rm.js:3704-4882 esm-fingerprint
function openConnectTunnel(opts) {
  let { destHost, destPort } = opts;
  let bare = stripBrackets(destHost);
  if (!isValidHost(bare))
    return Promise.reject(Error(`Invalid destination host for CONNECT: ${JSON.stringify(destHost)}`));
  if (!Number.isInteger(destPort) || destPort < 1 || destPort > 65535)
    return Promise.reject(Error(`Invalid destination port: ${destPort}`));
  let authority = isIP(bare) === 6 ? `[${bare}]:${destPort}` : `${bare}:${destPort}`;
  return new Promise((resolve, reject) => {
    let sock = opts.dial();
    let settled = false;
    let fail = (err) => {
      if (settled) return;
      settled = true;
      sock.destroy();
      reject(err);
    };
    let onClose = () => fail(Error("Proxy closed during CONNECT handshake"));
    sock.setTimeout(opts.timeoutMs ?? CONNECT_TIMEOUT_MS, () => fail(Error("CONNECT handshake timed out")));
    sock.once("error", fail);
    sock.once("close", onClose);
    sock.once(opts.readyEvent, () => {
      sock.write(
        `CONNECT ${authority} HTTP/1.1\r
Host: ${authority}\r
` +
          (opts.authHeader
            ? `Proxy-Authorization: ${opts.authHeader}\r
`
            : "") +
          `\r
`,
      );
      let buf = "";
      let onData = (chunk) => {
        buf += chunk.toString("latin1");
        let end = buf.indexOf(`\r
\r
`);
        if (end === -1) {
          if (buf.length > 16384) fail(Error("CONNECT response header too large"));
          return;
        }
        sock.pause();
        sock.removeListener("data", onData);
        let statusLine = buf.slice(
          0,
          buf.indexOf(`\r
`),
        );
        if (!/^HTTP\/1\.[01] 2\d\d(?:\s|$)/.test(statusLine))
          return fail(Error(`Proxy refused CONNECT: ${statusLine.trim()}`));
        let rest = buf.slice(end + 4);
        if (rest.length) sock.unshift(Buffer.from(rest, "latin1"));
        settled = true;
        sock.setTimeout(0);
        sock.removeListener("error", fail);
        sock.removeListener("close", onClose);
        resolve(sock);
      };
      sock.on("data", onData);
    });
  });
}
//@ chunk-078pp0rm.js:4882-5153 esm-fingerprint
function connectViaParentProxy(proxyUrl, destHost, destPort) {
  let proxyHost = stripBrackets(proxyUrl.hostname);
  let proxyPort = Number(proxyUrl.port) || (proxyUrl.protocol === "https:" ? 443 : 80);
  let useTls = proxyUrl.protocol === "https:";
  return openConnectTunnel({
    destHost,
    destPort,
    authHeader: proxyAuthHeader(proxyUrl),
    readyEvent: useTls ? "secureConnect" : "connect",
    dial: () =>
      useTls
        ? connect_2({
            host: proxyHost,
            port: proxyPort,
            ...(isIP(proxyHost)
              ? {}
              : {
                  servername: proxyHost,
                }),
          })
        : connect(proxyPort, proxyHost),
  });
}
//@ chunk-078pp0rm.js:5153-5429 esm-fingerprint
function proxyAuthHeader(proxyUrl) {
  if (!proxyUrl.username && !proxyUrl.password) return;
  try {
    let creds = `${decodeURIComponent(proxyUrl.username)}:${decodeURIComponent(proxyUrl.password)}`;
    return `Basic ${Buffer.from(creds).toString("base64")}`;
  } catch {
    let creds = `${proxyUrl.username}:${proxyUrl.password}`;
    return `Basic ${Buffer.from(creds).toString("base64")}`;
  }
}
//@ chunk-078pp0rm.js:5429-5821 esm-fingerprint
function relayResponseHead(res, upstreamRes, headers = stripHopByHop(upstreamRes.headers)) {
  try {
    res.writeHead(upstreamRes.statusCode ?? 502, headers);
    return true;
  } catch (err) {
    logForDebugging(
      `Invalid upstream response head (status ${upstreamRes.statusCode}): ${err instanceof Error ? err.message : String(err)}`,
      {
        level: "error",
      },
    );
    upstreamRes.destroy();
    if (res.headersSent) {
      res.destroy();
      return false;
    }
    for (let name of res.getHeaderNames()) res.removeHeader(name);
    res.writeHead(502, {
      "Content-Type": "text/plain",
    });
    res.end("Bad Gateway");
    return false;
  }
}
//@ chunk-078pp0rm.js:5821-5992 esm-fingerprint
function onUpstreamError(upstream, fail) {
  let answer;
  upstream.once("response", (res) => {
    answer = res;
  });
  upstream.on("error", (err) => {
    if (answer?.complete) {
      logForDebugging(`Upstream connection failed after a whole answer: ${err.message}`);
      return;
    }
    fail(err);
  });
}
//@ chunk-078pp0rm.js:5992-6271 esm-fingerprint
function stripHopByHop(h, { folded = false } = {}) {
  let norm = (name) => {
    let lower = name.trim().toLowerCase();
    return folded ? lower.replace(/[_.]/g, "-") : lower;
  };
  let extra = new Set();
  let connHeader = h.connection;
  if (connHeader) for (let tok of String(connHeader).split(",")) extra.add(norm(tok));
  let out = {};
  for (let [k, v] of Object.entries(h)) {
    let nk = norm(k);
    if (!HOP_BY_HOP.has(nk) && !extra.has(nk)) out[k] = v;
  }
  return out;
}
//@ chunk-078pp0rm.js:6271-6345 esm-fingerprint
function stripBrackets(host) {
  return host.startsWith("[") && host.endsWith("]") ? host.slice(1, -1) : host;
}
//@ chunk-078pp0rm.js:6345-6487 esm-fingerprint
function redactUrl(u) {
  if (!u) return "-";
  if (!u.username && !u.password) return u.href;
  let c = new x(u.href);
  c.username = "***";
  c.password = "***";
  return c.href;
}
//@ chunk-078pp0rm.js:6487-6546 esm-fingerprint
function redactUserinfo(raw) {
  return raw.replace(/\/\/[^@/]*@/, "//***:***@");
}
//@ chunk-078pp0rm.js:6546-6683 esm-fingerprint
function isValidHost(h) {
  if (!h || h.length > 255) return false;
  let bare = stripBrackets(h);
  if (bare.includes("%")) return false;
  if (isIP(bare)) return true;
  return /^[A-Za-z0-9._-]+$/.test(bare);
}
//@ chunk-078pp0rm.js:6683-6833 esm-fingerprint
function canonicalizeHost(h) {
  try {
    let bare = stripBrackets(h);
    let bracketed = isIP(bare) === 6 ? `[${bare}]` : bare;
    let out = stripBrackets(new x(`http://${bracketed}/`).hostname);
    return isIP(out) === 6 ? (mappedIPv4(out) ?? out) : out.replace(/\.$/, "");
  } catch {
    return;
  }
}
//@ chunk-078pp0rm.js:6833-6906 esm-layout
function formatAuthority(host, port, defaultPort) {
  let bracketed = isIP(host) === 6 ? `[${host}]` : host;
  return port === defaultPort ? bracketed : `${bracketed}:${port}`;
}
//@ chunk-078pp0rm.js:6906-7129 esm-fingerprint
async function directRequestOptions(host, port, lookup, tls) {
  let address = host;
  if (lookup && !isIP(host)) {
    let probe = await dialDirect(host, port, lookup);
    address = probe.remoteAddress ?? "";
    probe.destroy();
    if (!address) throw Error(`connect ${host}:${port}: no peer address`);
  }
  return {
    host: address,
    port,
    ...(tls && !isIP(host)
      ? {
          servername: host,
        }
      : {}),
    agent: false,
  };
}
//@ chunk-078pp0rm.js:7129-7450 esm-fingerprint
function dialDirect(host, port, lookup, timeoutMs = CONNECT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    let s_2 = connect({
      port,
      host,
      lookup,
    });
    let settled = false;
    let done = (err) => {
      if (settled) return;
      settled = true;
      s_2.setTimeout(0);
      if (err) {
        s_2.destroy();
        reject(err);
      } else resolve(s_2);
    };
    s_2.setTimeout(timeoutMs, () => done(Error("connect timed out")));
    s_2.once("connect", () => done());
    s_2.once("error", done);
    s_2.once("close", () => done(Error("socket closed before connect")));
  });
}
export {
  canonicalizeHost,
  stripBrackets,
  formatAuthority,
  directRequestOptions,
  stripHopByHop,
  relayResponseHead,
  onUpstreamError,
  shouldBypassParentProxy,
  selectParentProxyUrl,
  openConnectTunnel,
  connectViaParentProxy,
  dialDirect,
  proxyAuthHeader,
  isValidHost,
  resolveParentProxy,
  redactUrl,
};

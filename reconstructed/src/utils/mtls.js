/**
 * utils/mtls.ts
 *
 * mTLS：读取 CLAUDE_CODE_CLIENT_CERT/KEY/KEY_PASSPHRASE，构造带客户端证书与 CA 的 https.Agent、fetch TLS 选项和 Bun FetchSession，缓存与清理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/mtls.ts
 * pieces: chunk-1ny7cxrt.js (2), chunk-hq88884p.js (27)
 * attribution: sole-consumer 5, fingerprint 3, affinity 2, facade-exports 12, layout 7
 */
import { createPrivateKey, X509Certificate } from "crypto";
import { Agent } from "https";
import { Socket, isIP } from "net";
import { isDeepStrictEqual } from "util";
import { io } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { HostScoped } from "./hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { env } from "./env.js";
import { logForDebugging } from "./debug.js";
import { getFsImplementation } from "./fsOperations.js";
import { serializeCalls } from "./promiseQueue.js";
import { caListFor, getCACertificates } from "./caCerts.js";
import { oe, anthropicHostOf, ke } from "./anthropicHosts.js";
import { mn } from "./remoteEnvironment.js";
import { TlsCheckingProxyAgent } from "./proxy.js";
import { Rl } from "../services/claudeGateway/network.js";
import { isPrivateHost } from "./network/privateHostCheck.js";
import { guardedLookup } from "../services/claudeGateway/ssrfGuard.js";

//@ chunk-hq88884p.js:55118-55219 sole-consumer
class MtlsState {
  clientCert = null;
  clientKey = null;
  config = io(() => getMTLSConfig_2(this));
  agents = new Map();
  fetchSessions = new Map();
}
//@ chunk-hq88884p.js:55219-55244 sole-consumer
var Gn = new HostScoped(() => new MtlsState());
//@ chunk-hq88884p.js:55244-55281 sole-consumer
function ee() {
  return Gn.of(getRootSession().host);
}
//@ chunk-hq88884p.js:55281-55302 sole-consumer
var Ke = "-----BEGIN ";
//@ chunk-hq88884p.js:55302-55487 affinity
function hasCompletePemBlock(e) {
  let index = e.lastIndexOf(Ke);
  if (index === -1) return !1;
  let index_2 = e.indexOf("-----", index + Ke.length);
  if (index_2 === -1) return !1;
  let sliced = e.slice(index + Ke.length, index_2);
  return e.includes(`-----END ${sliced}-----`, index_2);
}
//@ chunk-hq88884p.js:55487-55558 facade-exports
var PEM_CERT_BLOCK_RE = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g;
//@ chunk-hq88884p.js:55558-55820 layout
function isMismatchedKeyPair(e, r) {
  let n;
  try {
    n = createPrivateKey({
      key: r,
      ...(env.CLAUDE_CODE_CLIENT_KEY_PASSPHRASE && { passphrase: env.CLAUDE_CODE_CLIENT_KEY_PASSPHRASE }),
    });
  } catch {
    return !1;
  }
  let o = !1,
    s = !1;
  for (let c of e.match(PEM_CERT_BLOCK_RE) ?? [])
    try {
      if (new X509Certificate(c).checkPrivateKey(n)) return !1;
      o = !0;
    } catch {
      s = !0;
    }
  return o && !s;
}
//@ chunk-hq88884p.js:55820-55835 layout
var Bt = 1048576;
//@ chunk-hq88884p.js:55835-55984 layout
function isAcceptableCertFile(e, r) {
  if (!e.isFile() || e.size > Bt)
    return (
      logForDebugging(`mTLS: Ignoring ${r} \u2014 not a regular file or over ${Bt} bytes`, {
        level: "error",
      }),
      !1
    );
  return !0;
}
/**
 * 同步读取 PEM 文件。
 */
//@ chunk-hq88884p.js:55984-56307 layout
function loadPemFileSync(e, r) {
  try {
    if (!isAcceptableCertFile(getFsImplementation().statSync(e), r)) return null;
    let content = getFsImplementation().readFileSync(e, { encoding: "utf8" });
    if (!hasCompletePemBlock(content))
      return (
        logForDebugging(`mTLS: Ignoring incomplete ${r} \u2014 no PEM block`, { level: "error" }),
        null
      );
    return (logForDebugging(`mTLS: Loaded ${r}`), { path: e, content: content });
  } catch (error) {
    return (logForDebugging(`mTLS: Failed to load ${r}: ${error}`, { level: "error" }), null);
  }
}
/**
 * 异步读取 PEM 文件。
 */
//@ chunk-hq88884p.js:56307-56640 layout
async function loadPemFile(e, r) {
  try {
    if (!isAcceptableCertFile(await getFsImplementation().stat(e), r)) return null;
    let content = await getFsImplementation().readFile(e, { encoding: "utf8" });
    if (!hasCompletePemBlock(content))
      return (
        logForDebugging(`mTLS: Ignoring incomplete ${r} \u2014 no PEM block`, { level: "error" }),
        null
      );
    return (logForDebugging(`mTLS: Loaded ${r}`), { path: e, content: content });
  } catch (error) {
    return (logForDebugging(`mTLS: Failed to load ${r}: ${error}`, { level: "error" }), null);
  }
}
//@ chunk-hq88884p.js:56640-57316 facade-exports
var loadMTLSClientMaterial = serializeCalls(async () => {
  let e = ee(),
    CLAUDE_CODE_CLIENT_CERT = env.CLAUDE_CODE_CLIENT_CERT,
    CLAUDE_CODE_CLIENT_KEY = env.CLAUDE_CODE_CLIENT_KEY,
    [o, s] = await Promise.all([
      CLAUDE_CODE_CLIENT_CERT
        ? loadPemFile(CLAUDE_CODE_CLIENT_CERT, "client certificate from CLAUDE_CODE_CLIENT_CERT")
        : null,
      CLAUDE_CODE_CLIENT_KEY
        ? loadPemFile(CLAUDE_CODE_CLIENT_KEY, "client key from CLAUDE_CODE_CLIENT_KEY")
        : null,
    ]),
    c = Boolean((CLAUDE_CODE_CLIENT_CERT && !o) || (CLAUDE_CODE_CLIENT_KEY && !s)),
    a = Boolean(!c && o && s && isMismatchedKeyPair(o.content, s.content));
  if (a)
    logForDebugging("mTLS: Ignoring mismatched client cert/key pair \u2014 mid-rotation read", {
      level: "error",
    });
  let u = c || a,
    l = CLAUDE_CODE_CLIENT_CERT ? (u ? e.clientCert : o) : null,
    b = CLAUDE_CODE_CLIENT_KEY ? (u ? e.clientKey : s) : null,
    E =
      e.clientCert?.path !== l?.path ||
      e.clientCert?.content !== l?.content ||
      e.clientKey?.path !== b?.path ||
      e.clientKey?.content !== b?.content;
  if (((e.clientCert = l), (e.clientKey = b), E)) clearMTLSCache_2(e);
  return { changed: E, readFailed: u, mismatched: a };
});
//@ chunk-hq88884p.js:57316-57404 facade-exports
function getLoadedMTLSPaths() {
  let e = ee();
  return { certPath: e.clientCert?.path, keyPath: e.clientKey?.path };
}
//@ chunk-hq88884p.js:57404-57439 facade-exports
function getMTLSConfig() {
  return ee().config();
}
/**
 * mTLS 配置：CLAUDE_CODE_CLIENT_CERT / CLAUDE_CODE_CLIENT_KEY 指定 PEM 文件路径（按路径缓存内容），CLAUDE_CODE_CLIENT_KEY_PASSPHRASE 为私钥口令。
 */
//@ chunk-hq88884p.js:57439-57991 fingerprint = getMTLSConfig (0.652)
function getMTLSConfig_2(e) {
  let config = {},
    CLAUDE_CODE_CLIENT_CERT = env.CLAUDE_CODE_CLIENT_CERT;
  if (CLAUDE_CODE_CLIENT_CERT) {
    if (e.clientCert?.path !== CLAUDE_CODE_CLIENT_CERT)
      e.clientCert =
        loadPemFileSync(CLAUDE_CODE_CLIENT_CERT, "client certificate from CLAUDE_CODE_CLIENT_CERT") ??
        e.clientCert;
    if (e.clientCert?.path === CLAUDE_CODE_CLIENT_CERT) config.cert = e.clientCert.content;
  }
  let CLAUDE_CODE_CLIENT_KEY = env.CLAUDE_CODE_CLIENT_KEY;
  if (CLAUDE_CODE_CLIENT_KEY) {
    if (e.clientKey?.path !== CLAUDE_CODE_CLIENT_KEY)
      e.clientKey =
        loadPemFileSync(CLAUDE_CODE_CLIENT_KEY, "client key from CLAUDE_CODE_CLIENT_KEY") ?? e.clientKey;
    if (e.clientKey?.path === CLAUDE_CODE_CLIENT_KEY) config.key = e.clientKey.content;
  }
  let CLAUDE_CODE_CLIENT_KEY_PASSPHRASE = env.CLAUDE_CODE_CLIENT_KEY_PASSPHRASE;
  if (CLAUDE_CODE_CLIENT_KEY_PASSPHRASE)
    ((config.passphrase = CLAUDE_CODE_CLIENT_KEY_PASSPHRASE),
      logForDebugging("mTLS: Using client key passphrase"));
  if (Object.keys(config).length === 0) return;
  return config;
}
/**
 * 从 env 取代理 URL（https_proxy/HTTPS_PROXY/http_proxy/HTTP_PROXY）。
 */
//@ chunk-hq88884p.js:57991-58153 facade-exports = getProxyUrl (0.786)
function caListBehindProxy(env_2) {
  let all = [
    env.https_proxy,
    env.HTTPS_PROXY,
    env.http_proxy,
    env.HTTP_PROXY,
    env.all_proxy,
    env.ALL_PROXY,
  ].every((n) => !n || /^\s*http:/i.test(n));
  return caListFor(all ? env_2 : void 0);
}
//@ chunk-hq88884p.js:58153-58174 layout
var MTLS_RELOAD_INTERVAL_MS = 1000,
  Jn = 35000;
//@ chunk-hq88884p.js:58174-58952 layout
class TrackedHttpsAgent extends Agent {
  #e = this.options.ca;
  #r = Array.isArray(this.#e) ? [...this.#e] : void 0;
  #t = new WeakMap();
  createConnection(...e) {
    let r = oe(),
      connection = super.createConnection(...e);
    if (connection) this.#t.set(connection, r);
    return connection;
  }
  keepSocketAlive(e) {
    let keepSocketAlive = super.keepSocketAlive(e);
    if (e instanceof Socket && mn() && !env.CLAUDE_CODE_DISABLE_POOLED_CONNECTION_IDLE_LIMIT)
      (e.setKeepAlive(!1), e.setTimeout(Jn));
    return keepSocketAlive;
  }
  reuseSocket(e, r) {
    if (this.#t.get(e) !== oe()) e.destroy();
    if (e instanceof Socket) (e.setTimeout(0), e.setKeepAlive(!0, MTLS_RELOAD_INTERVAL_MS));
    super.reuseSocket(e, r);
  }
  getName(e) {
    if (typeof e?._agentKey === "string") return e._agentKey;
    let r = e?.ca,
      n = this.#r,
      o =
        n !== void 0 &&
        r === this.#e &&
        Array.isArray(r) &&
        r.length === n.length &&
        n.every((a, u) => typeof a === "string" && r[u] === a),
      s = super.getName(o ? { ...e, ca: "own" } : e),
      c = oe();
    return c === void 0 ? s : `${s}:${c}`;
  }
}
/**
 * 按目标（customer/strict）创建带客户端证书和额外 CA 的 https.Agent，缓存复用。
 */
//@ chunk-hq88884p.js:58952-59363 facade-exports = getMTLSAgent (0.459)
function getMTLSAgent(e) {
  let mtlsConfig = ee(),
    caCerts = getMTLSConfig(),
    o = caListBehindProxy(e),
    s = e ? "customer" : "strict",
    c = oe(),
    a = mtlsConfig.agents.get(s);
  if (a && a.config === caCerts && a.ca === o && a.checkSwitches === c) return a.agent;
  let u;
  if (caCerts || o) {
    let l = {
      ...caCerts,
      ...(o && { ca: o }),
      keepAlive: !0,
      keepAliveMsecs: MTLS_RELOAD_INTERVAL_MS,
      maxSockets: 1 / 0,
      maxTotalSockets: 1 / 0,
    };
    (logForDebugging("mTLS: Creating HTTPS agent with custom certificates"), (u = new TrackedHttpsAgent(l)));
  }
  return (
    mtlsConfig.agents.set(s, { config: caCerts, ca: o, checkSwitches: c, agent: u }),
    destroyFreeSockets(a?.agent),
    u
  );
}
//@ chunk-hq88884p.js:59363-59444 facade-exports
function createOneOffHttpsAgent() {
  let e = getMTLSConfig(),
    r = getCACertificates();
  return new TrackedHttpsAgent({ ...e, ...(r && { ca: r }), keepAlive: !1 });
}
//@ chunk-hq88884p.js:59444-59527 facade-exports = getWebSocketTLSOptions (1)
function getWebSocketTLSOptions(e) {
  let mtlsConfig = getMTLSConfig(),
    n = caListBehindProxy(anthropicHostOf(e));
  if (!mtlsConfig && !n) return;
  return { ...mtlsConfig, ...(n && { ca: n }) };
}
/**
 * fetch 用 TLS 选项（cert/key/ca），给 Bun fetch 的 tls 参数。
 */
//@ chunk-hq88884p.js:59527-59618 facade-exports = getTLSFetchOptions (0.32)
function getTLSFetchOptions(e) {
  let mtlsConfig = getMTLSConfig(),
    n = caListBehindProxy(anthropicHostOf(e));
  if (!mtlsConfig && !n) return {};
  return { tls: { ...mtlsConfig, ...(n && { ca: n }) } };
}
//@ chunk-hq88884p.js:59618-59890 facade-exports
function getTLSFetchSession(e, r) {
  let n = typeof Bun > "u" ? void 0 : Bun.FetchSession;
  if (!n) return;
  let o = getTLSFetchOptions(r),
    fetchSessions = ee().fetchSessions,
    c = anthropicHostOf(r) ? `${e}:customer` : e,
    a = fetchSessions.get(c);
  if (a && isDeepStrictEqual(a.tls, o.tls)) return ((a.tls = o.tls), a.session);
  let u = new n(o);
  return (a?.session.close(), fetchSessions.set(c, { tls: o.tls, session: u }), u);
}
/**
 * 清除 mTLS 证书/agent/fetch session 缓存（设置变化后调用）。
 */
//@ chunk-hq88884p.js:59890-59914 facade-exports
function clearMTLSCache() {
  clearMTLSCache_2(ee());
}
//@ chunk-hq88884p.js:59914-60095 fingerprint = clearMTLSCache (0.638)
function clearMTLSCache_2(e) {
  e.config.cache.clear?.();
  for (let [r, { config: n, agent: o }] of e.agents)
    if (r === "customer" || n !== void 0 || !ke()) (destroyFreeSockets(o), e.agents.delete(r));
  logForDebugging("Cleared mTLS configuration cache");
}
/**
 * 启动时配置全局 mTLS；检测到 NODE_EXTRA_CA_CERTS 时记日志（运行时自动追加到内置 CA）。
 */
//@ chunk-hq88884p.js:60095-60237 facade-exports = configureGlobalMTLS (1)
function configureGlobalMTLS() {
  if (!getMTLSConfig()) return;
  if (env.NODE_EXTRA_CA_CERTS)
    logForDebugging("NODE_EXTRA_CA_CERTS detected - Node.js will automatically append to built-in CAs");
}
//@ chunk-hq88884p.js:60237-60361 affinity
function destroyFreeSockets(e) {
  if (!e) return;
  e.maxFreeSockets = 0;
  for (let r of Object.values(e.freeSockets)) for (let n of [...(r ?? [])]) n.destroy();
}
//@ chunk-1ny7cxrt.js:1325162-1325530 sole-consumer
class SsrfGuardedConnector extends TlsCheckingProxyAgent {
  async connect(e, t) {
    let host = t.host,
      o = t;
    if (host && Rl()) {
      let replaced = host.toLowerCase().replace(/\.$/, "");
      if (isPrivateHost(replaced)) throw Error("ECONNREFUSED_SSRF: blocked loopback/metadata host via proxy");
      if (!isIP(host)) o = { ...o, host: replaced, servername: replaced };
    } else if (host && !isIP(host)) {
      let promise = await new Promise((s, a) => guardedLookup(host, {}, (l, c) => (l ? a(l) : s(c))));
      o = { ...o, host: promise, servername: host };
    }
    return super.connect(e, o);
  }
}
//@ chunk-1ny7cxrt.js:1325530-1325607 fingerprint = getWebSocketTLSOptions (1)
function getWebSocketTLSOptions_2(e, t) {
  let n = new SsrfGuardedConnector(e);
  if (t) n.options = { ...n.options, ca: t };
  return n;
}

export {
  getMTLSConfig,
  getTLSFetchOptions,
  getWebSocketTLSOptions,
  getMTLSAgent,
  getWebSocketTLSOptions_2,
  getTLSFetchSession,
  loadMTLSClientMaterial,
  caListBehindProxy,
  PEM_CERT_BLOCK_RE,
  configureGlobalMTLS,
  createOneOffHttpsAgent,
  getLoadedMTLSPaths,
  clearMTLSCache,
};

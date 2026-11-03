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
import { caEnvFingerprintIfEnabled, anthropicHostOf, isHttpsAgentKeepingEnabled } from "./anthropicHosts.js";
import { isRemoteManagedEnvironment } from "./remoteEnvironment.js";
import { TlsCheckingProxyAgent } from "./proxy.js";
import { isEgressBoundaryActive } from "../services/claudeGateway/network.js";
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
var mtlsStateRegistry = new HostScoped(() => new MtlsState());
//@ chunk-hq88884p.js:55244-55281 sole-consumer
function currentMtlsState() {
  return mtlsStateRegistry.of(getRootSession().host);
}
//@ chunk-hq88884p.js:55281-55302 sole-consumer
var PEM_BEGIN_PREFIX = "-----BEGIN ";
//@ chunk-hq88884p.js:55302-55487 affinity
function hasCompletePemBlock(e) {
  let index = e.lastIndexOf(PEM_BEGIN_PREFIX);
  if (index === -1) return false;
  let index_2 = e.indexOf("-----", index + PEM_BEGIN_PREFIX.length);
  if (index_2 === -1) return false;
  let sliced = e.slice(index + PEM_BEGIN_PREFIX.length, index_2);
  return e.includes(`-----END ${sliced}-----`, index_2);
}
//@ chunk-hq88884p.js:55487-55558 facade-exports
var PEM_CERT_BLOCK_RE = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g;
//@ chunk-hq88884p.js:55558-55820 layout
function isMismatchedKeyPair(content, key) {
  let n;
  try {
    n = createPrivateKey({
      key,
      ...(env.CLAUDE_CODE_CLIENT_KEY_PASSPHRASE && {
        passphrase: env.CLAUDE_CODE_CLIENT_KEY_PASSPHRASE,
      }),
    });
  } catch {
    return false;
  }
  let o = false;
  let s = false;
  for (let c of content.match(PEM_CERT_BLOCK_RE) ?? [])
    try {
      if (new X509Certificate(c).checkPrivateKey(n)) return false;
      o = true;
    } catch {
      s = true;
    }
  return o && !s;
}
//@ chunk-hq88884p.js:55820-55835 layout
var MAX_CLIENT_CERT_FILE_BYTES = 1048576;
//@ chunk-hq88884p.js:55835-55984 layout
function isAcceptableCertFile(e, r) {
  if (!e.isFile() || e.size > MAX_CLIENT_CERT_FILE_BYTES) {
    logForDebugging(
      `mTLS: Ignoring ${r} \u2014 not a regular file or over ${MAX_CLIENT_CERT_FILE_BYTES} bytes`,
      {
        level: "error",
      },
    );
    return false;
  }
  return true;
}
//@ chunk-hq88884p.js:55984-56307 layout
/**
 * 同步读取 PEM 文件。
 */
function loadPemFileSync(e, r) {
  try {
    if (!isAcceptableCertFile(getFsImplementation().statSync(e), r)) return null;
    let content = getFsImplementation().readFileSync(e, {
      encoding: "utf8",
    });
    if (!hasCompletePemBlock(content)) {
      logForDebugging(`mTLS: Ignoring incomplete ${r} \u2014 no PEM block`, {
        level: "error",
      });
      return null;
    }
    logForDebugging(`mTLS: Loaded ${r}`);
    return {
      path: e,
      content,
    };
  } catch (error) {
    logForDebugging(`mTLS: Failed to load ${r}: ${error}`, {
      level: "error",
    });
    return null;
  }
}
//@ chunk-hq88884p.js:56307-56640 layout
/**
 * 异步读取 PEM 文件。
 */
async function loadPemFile(e, r) {
  try {
    if (!isAcceptableCertFile(await getFsImplementation().stat(e), r)) return null;
    let content = await getFsImplementation().readFile(e, {
      encoding: "utf8",
    });
    if (!hasCompletePemBlock(content)) {
      logForDebugging(`mTLS: Ignoring incomplete ${r} \u2014 no PEM block`, {
        level: "error",
      });
      return null;
    }
    logForDebugging(`mTLS: Loaded ${r}`);
    return {
      path: e,
      content,
    };
  } catch (error) {
    logForDebugging(`mTLS: Failed to load ${r}: ${error}`, {
      level: "error",
    });
    return null;
  }
}
//@ chunk-hq88884p.js:56640-57316 facade-exports
var loadMTLSClientMaterial = serializeCalls(async () => {
  let e = currentMtlsState();
  let CLAUDE_CODE_CLIENT_CERT = env.CLAUDE_CODE_CLIENT_CERT;
  let CLAUDE_CODE_CLIENT_KEY = env.CLAUDE_CODE_CLIENT_KEY;
  let [o, s] = await Promise.all([
    CLAUDE_CODE_CLIENT_CERT
      ? loadPemFile(CLAUDE_CODE_CLIENT_CERT, "client certificate from CLAUDE_CODE_CLIENT_CERT")
      : null,
    CLAUDE_CODE_CLIENT_KEY
      ? loadPemFile(CLAUDE_CODE_CLIENT_KEY, "client key from CLAUDE_CODE_CLIENT_KEY")
      : null,
  ]);
  let c = Boolean((CLAUDE_CODE_CLIENT_CERT && !o) || (CLAUDE_CODE_CLIENT_KEY && !s));
  let a = Boolean(!c && o && s && isMismatchedKeyPair(o.content, s.content));
  if (a)
    logForDebugging("mTLS: Ignoring mismatched client cert/key pair \u2014 mid-rotation read", {
      level: "error",
    });
  let u = c || a;
  let l = CLAUDE_CODE_CLIENT_CERT ? (u ? e.clientCert : o) : null;
  let b = CLAUDE_CODE_CLIENT_KEY ? (u ? e.clientKey : s) : null;
  let E =
    e.clientCert?.path !== l?.path ||
    e.clientCert?.content !== l?.content ||
    e.clientKey?.path !== b?.path ||
    e.clientKey?.content !== b?.content;
  e.clientCert = l;
  e.clientKey = b;
  if (E) clearMTLSCache_2(e);
  return {
    changed: E,
    readFailed: u,
    mismatched: a,
  };
});
//@ chunk-hq88884p.js:57316-57404 facade-exports
function getLoadedMTLSPaths() {
  let e = currentMtlsState();
  return {
    certPath: e.clientCert?.path,
    keyPath: e.clientKey?.path,
  };
}
//@ chunk-hq88884p.js:57404-57439 facade-exports
function getMTLSConfig() {
  return currentMtlsState().config();
}
//@ chunk-hq88884p.js:57439-57991 fingerprint = getMTLSConfig (0.652)
/**
 * mTLS 配置：CLAUDE_CODE_CLIENT_CERT / CLAUDE_CODE_CLIENT_KEY 指定 PEM 文件路径（按路径缓存内容），CLAUDE_CODE_CLIENT_KEY_PASSPHRASE 为私钥口令。
 */
function getMTLSConfig_2(e) {
  let config = {};
  let CLAUDE_CODE_CLIENT_CERT = env.CLAUDE_CODE_CLIENT_CERT;
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
  if (CLAUDE_CODE_CLIENT_KEY_PASSPHRASE) {
    config.passphrase = CLAUDE_CODE_CLIENT_KEY_PASSPHRASE;
    logForDebugging("mTLS: Using client key passphrase");
  }
  if (Object.keys(config).length === 0) return;
  return config;
}
//@ chunk-hq88884p.js:57991-58153 facade-exports = getProxyUrl (0.786)
/**
 * 从 env 取代理 URL（https_proxy/HTTPS_PROXY/http_proxy/HTTP_PROXY）。
 */
function caListBehindProxy(env_2) {
  let all = [
    env.https_proxy,
    env.HTTPS_PROXY,
    env.http_proxy,
    env.HTTP_PROXY,
    env.all_proxy,
    env.ALL_PROXY,
  ].every((n) => !n || /^\s*http:/i.test(n));
  return caListFor(all ? env_2 : undefined);
}
//@ chunk-hq88884p.js:58153-58174 layout
var MTLS_RELOAD_INTERVAL_MS = 1000;
var MtlsClient = 35000;
//@ chunk-hq88884p.js:58174-58952 layout
class TrackedHttpsAgent extends Agent {
  #e = this.options.ca;
  #r = Array.isArray(this.#e) ? [...this.#e] : undefined;
  #t = new WeakMap();
  createConnection(...e) {
    let r = caEnvFingerprintIfEnabled();
    let connection = super.createConnection(...e);
    if (connection) this.#t.set(connection, r);
    return connection;
  }
  keepSocketAlive(e) {
    let r = super.keepSocketAlive(e);
    if (
      e instanceof Socket &&
      isRemoteManagedEnvironment() &&
      !env.CLAUDE_CODE_DISABLE_POOLED_CONNECTION_IDLE_LIMIT
    ) {
      e.setKeepAlive(false);
      e.setTimeout(MtlsClient);
    }
    return r;
  }
  reuseSocket(e, r) {
    if (this.#t.get(e) !== caEnvFingerprintIfEnabled()) e.destroy();
    if (e instanceof Socket) {
      e.setTimeout(0);
      e.setKeepAlive(true, MTLS_RELOAD_INTERVAL_MS);
    }
    super.reuseSocket(e, r);
  }
  getName(e) {
    if (typeof e?._agentKey === "string") return e._agentKey;
    let ca = e?.ca;
    let n = this.#r;
    let o =
      n !== undefined &&
      ca === this.#e &&
      Array.isArray(ca) &&
      ca.length === n.length &&
      n.every((a, u) => typeof a === "string" && ca[u] === a);
    let s = super.getName(
      o
        ? {
            ...e,
            ca: "own",
          }
        : e,
    );
    let c = caEnvFingerprintIfEnabled();
    return c === undefined ? s : `${s}:${c}`;
  }
}
//@ chunk-hq88884p.js:58952-59363 facade-exports = getMTLSAgent (0.459)
/**
 * 按目标（customer/strict）创建带客户端证书和额外 CA 的 https.Agent，缓存复用。
 */
function getMTLSAgent(e) {
  let mtlsConfig = currentMtlsState();
  let caCerts = getMTLSConfig();
  let o = caListBehindProxy(e);
  let s = e ? "customer" : "strict";
  let c = caEnvFingerprintIfEnabled();
  let a = mtlsConfig.agents.get(s);
  if (a && a.config === caCerts && a.ca === o && a.checkSwitches === c) return a.agent;
  let u;
  if (caCerts || o) {
    let l = {
      ...caCerts,
      ...(o && {
        ca: o,
      }),
      keepAlive: true,
      keepAliveMsecs: MTLS_RELOAD_INTERVAL_MS,
      maxSockets: 1 / 0,
      maxTotalSockets: 1 / 0,
    };
    logForDebugging("mTLS: Creating HTTPS agent with custom certificates");
    u = new TrackedHttpsAgent(l);
  }
  mtlsConfig.agents.set(s, {
    config: caCerts,
    ca: o,
    checkSwitches: c,
    agent: u,
  });
  destroyFreeSockets(a?.agent);
  return u;
}
//@ chunk-hq88884p.js:59363-59444 facade-exports
function createOneOffHttpsAgent() {
  let mtlsConfig = getMTLSConfig();
  let caCerts = getCACertificates();
  return new TrackedHttpsAgent({
    ...mtlsConfig,
    ...(caCerts && {
      ca: caCerts,
    }),
    keepAlive: false,
  });
}
//@ chunk-hq88884p.js:59444-59527 facade-exports = getWebSocketTLSOptions (1)
function getWebSocketTLSOptions(url) {
  let mtlsConfig = getMTLSConfig();
  let caCerts = caListBehindProxy(anthropicHostOf(url));
  if (!mtlsConfig && !caCerts) return;
  return {
    ...mtlsConfig,
    ...(caCerts && {
      ca: caCerts,
    }),
  };
}
//@ chunk-hq88884p.js:59527-59618 facade-exports = getTLSFetchOptions (0.32)
/**
 * fetch 用 TLS 选项（cert/key/ca），给 Bun fetch 的 tls 参数。
 */
function getTLSFetchOptions(url) {
  let mtlsConfig = getMTLSConfig();
  let caCerts = caListBehindProxy(anthropicHostOf(url));
  if (!mtlsConfig && !caCerts) return {};
  return {
    tls: {
      ...mtlsConfig,
      ...(caCerts && {
        ca: caCerts,
      }),
    },
  };
}
//@ chunk-hq88884p.js:59618-59890 facade-exports
function getTLSFetchSession(e, r) {
  let FetchSession = typeof Bun === "undefined" ? undefined : Bun.FetchSession;
  if (!FetchSession) return;
  let tlsFetchOptions = getTLSFetchOptions(r);
  let fetchSessions = currentMtlsState().fetchSessions;
  let c = anthropicHostOf(r) ? `${e}:customer` : e;
  let a = fetchSessions.get(c);
  if (a && isDeepStrictEqual(a.tls, tlsFetchOptions.tls)) {
    a.tls = tlsFetchOptions.tls;
    return a.session;
  }
  let u = new FetchSession(tlsFetchOptions);
  a?.session.close();
  fetchSessions.set(c, {
    tls: tlsFetchOptions.tls,
    session: u,
  });
  return u;
}
//@ chunk-hq88884p.js:59890-59914 facade-exports
/**
 * 清除 mTLS 证书/agent/fetch session 缓存（设置变化后调用）。
 */
function clearMTLSCache() {
  clearMTLSCache_2(currentMtlsState());
}
//@ chunk-hq88884p.js:59914-60095 fingerprint = clearMTLSCache (0.638)
function clearMTLSCache_2(e) {
  e.config.cache.clear?.();
  for (let [r, { config: n, agent: o }] of e.agents)
    if (r === "customer" || n !== undefined || !isHttpsAgentKeepingEnabled()) {
      destroyFreeSockets(o);
      e.agents.delete(r);
    }
  logForDebugging("Cleared mTLS configuration cache");
}
//@ chunk-hq88884p.js:60095-60237 facade-exports = configureGlobalMTLS (1)
/**
 * 启动时配置全局 mTLS；检测到 NODE_EXTRA_CA_CERTS 时记日志（运行时自动追加到内置 CA）。
 */
function configureGlobalMTLS() {
  if (!getMTLSConfig()) return;
  if (env.NODE_EXTRA_CA_CERTS)
    logForDebugging("NODE_EXTRA_CA_CERTS detected - Node.js will automatically append to built-in CAs");
}
//@ chunk-hq88884p.js:60237-60361 affinity
function destroyFreeSockets(e) {
  if (!e) return;
  e.maxFreeSockets = 0;
  for (let freeSocket of Object.values(e.freeSockets)) for (let n of [...(freeSocket ?? [])]) n.destroy();
}
//@ chunk-1ny7cxrt.js:1325162-1325530 sole-consumer
class SsrfGuardedConnector extends TlsCheckingProxyAgent {
  async connect(e, t) {
    let host = t.host;
    let o = t;
    if (host && isEgressBoundaryActive()) {
      let replaced = host.toLowerCase().replace(/\.$/, "");
      if (isPrivateHost(replaced)) throw Error("ECONNREFUSED_SSRF: blocked loopback/metadata host via proxy");
      if (!isIP(host))
        o = {
          ...o,
          host: replaced,
          servername: replaced,
        };
    } else if (host && !isIP(host)) {
      let host_2 = await new Promise((resolve, reject) =>
        guardedLookup(host, {}, (l, c) => (l ? reject(l) : resolve(c))),
      );
      o = {
        ...o,
        host: host_2,
        servername: host,
      };
    }
    return super.connect(e, o);
  }
}
//@ chunk-1ny7cxrt.js:1325530-1325607 fingerprint = getWebSocketTLSOptions (1)
function getWebSocketTLSOptions_2(e, caCertPem) {
  let n = new SsrfGuardedConnector(e);
  if (caCertPem)
    n.options = {
      ...n.options,
      ca: caCertPem,
    };
  return n;
}
export {
  getMTLSConfig,
  getTLSFetchOptions,
  getWebSocketTLSOptions,
  PEM_CERT_BLOCK_RE,
  getMTLSAgent,
  getWebSocketTLSOptions_2,
  getTLSFetchSession,
  loadMTLSClientMaterial,
  caListBehindProxy,
  configureGlobalMTLS,
  createOneOffHttpsAgent,
  getLoadedMTLSPaths,
  clearMTLSCache,
};

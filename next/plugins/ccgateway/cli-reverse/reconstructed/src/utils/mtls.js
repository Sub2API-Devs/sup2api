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
import { memoizeAlias } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-hq88884p.js:55118-55219 sole-consumer
class MtlsState {
  clientCert = null;
  clientKey = null;
  config = memoizeAlias(() => getMTLSConfig_2(this));
  agents = new Map();
  fetchSessions = new Map();
}
//@ chunk-hq88884p.js:55219-55244 sole-consumer
var mtlsStateRegistry; // deferred: uses MtlsState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-hq88884p.js:55219", () => {
  mtlsStateRegistry = new HostScoped(() => new MtlsState());
});
//@ chunk-hq88884p.js:55244-55281 sole-consumer
function currentMtlsState() {
  return mtlsStateRegistry.of(getRootSession().host);
}
//@ chunk-hq88884p.js:55281-55302 sole-consumer
var PEM_BEGIN_PREFIX = "-----BEGIN ";
//@ chunk-hq88884p.js:55302-55487 affinity
function hasCompletePemBlock(pem) {
  let index = pem.lastIndexOf(PEM_BEGIN_PREFIX);
  if (index === -1) return false;
  let index_2 = pem.indexOf("-----", index + PEM_BEGIN_PREFIX.length);
  if (index_2 === -1) return false;
  let sliced = pem.slice(index + PEM_BEGIN_PREFIX.length, index_2);
  return pem.includes(`-----END ${sliced}-----`, index_2);
}
//@ chunk-hq88884p.js:55487-55558 facade-exports
var PEM_CERT_BLOCK_RE = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g;
//@ chunk-hq88884p.js:55558-55820 layout
function isMismatchedKeyPair(content, key) {
  let privateKey;
  try {
    privateKey = createPrivateKey({
      key,
      ...(env.CLAUDE_CODE_CLIENT_KEY_PASSPHRASE && {
        passphrase: env.CLAUDE_CODE_CLIENT_KEY_PASSPHRASE,
      }),
    });
  } catch {
    return false;
  }
  let checkedCerts = false;
  let hadFailure = false;
  for (let certPem of content.match(PEM_CERT_BLOCK_RE) ?? [])
    try {
      if (new X509Certificate(certPem).checkPrivateKey(privateKey)) return false;
      checkedCerts = true;
    } catch {
      hadFailure = true;
    }
  return checkedCerts && !hadFailure;
}
//@ chunk-hq88884p.js:55820-55835 layout
var MAX_CLIENT_CERT_FILE_BYTES = 1048576;
//@ chunk-hq88884p.js:55835-55984 layout
function isAcceptableCertFile(stats, label) {
  if (!stats.isFile() || stats.size > MAX_CLIENT_CERT_FILE_BYTES) {
    logForDebugging(
      `mTLS: Ignoring ${label} \u2014 not a regular file or over ${MAX_CLIENT_CERT_FILE_BYTES} bytes`,
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
function loadPemFileSync(filePath, label) {
  try {
    if (!isAcceptableCertFile(getFsImplementation().statSync(filePath), label)) return null;
    let content = getFsImplementation().readFileSync(filePath, {
      encoding: "utf8",
    });
    if (!hasCompletePemBlock(content)) {
      logForDebugging(`mTLS: Ignoring incomplete ${label} \u2014 no PEM block`, {
        level: "error",
      });
      return null;
    }
    logForDebugging(`mTLS: Loaded ${label}`);
    return {
      path: filePath,
      content,
    };
  } catch (error) {
    logForDebugging(`mTLS: Failed to load ${label}: ${error}`, {
      level: "error",
    });
    return null;
  }
}
//@ chunk-hq88884p.js:56307-56640 layout
/**
 * 异步读取 PEM 文件。
 */
async function loadPemFile(filePath, label) {
  try {
    if (!isAcceptableCertFile(await getFsImplementation().stat(filePath), label)) return null;
    let content = await getFsImplementation().readFile(filePath, {
      encoding: "utf8",
    });
    if (!hasCompletePemBlock(content)) {
      logForDebugging(`mTLS: Ignoring incomplete ${label} \u2014 no PEM block`, {
        level: "error",
      });
      return null;
    }
    logForDebugging(`mTLS: Loaded ${label}`);
    return {
      path: filePath,
      content,
    };
  } catch (error) {
    logForDebugging(`mTLS: Failed to load ${label}: ${error}`, {
      level: "error",
    });
    return null;
  }
}
//@ chunk-hq88884p.js:56640-57316 facade-exports
var loadMTLSClientMaterial; // deferred: uses currentMtlsState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-hq88884p.js:56640", () => {
  loadMTLSClientMaterial = serializeCalls(async () => {
    let state = currentMtlsState();
    let CLAUDE_CODE_CLIENT_CERT = env.CLAUDE_CODE_CLIENT_CERT;
    let CLAUDE_CODE_CLIENT_KEY = env.CLAUDE_CODE_CLIENT_KEY;
    let [certPem, keyPem] = await Promise.all([
      CLAUDE_CODE_CLIENT_CERT
        ? loadPemFile(CLAUDE_CODE_CLIENT_CERT, "client certificate from CLAUDE_CODE_CLIENT_CERT")
        : null,
      CLAUDE_CODE_CLIENT_KEY
        ? loadPemFile(CLAUDE_CODE_CLIENT_KEY, "client key from CLAUDE_CODE_CLIENT_KEY")
        : null,
    ]);
    let readFailed = Boolean((CLAUDE_CODE_CLIENT_CERT && !certPem) || (CLAUDE_CODE_CLIENT_KEY && !keyPem));
    let mismatched = Boolean(
      !readFailed && certPem && keyPem && isMismatchedKeyPair(certPem.content, keyPem.content),
    );
    if (mismatched)
      logForDebugging("mTLS: Ignoring mismatched client cert/key pair \u2014 mid-rotation read", {
        level: "error",
      });
    let shouldKeepOld = readFailed || mismatched;
    let nextCert = CLAUDE_CODE_CLIENT_CERT ? (shouldKeepOld ? state.clientCert : certPem) : null;
    let nextKey = CLAUDE_CODE_CLIENT_KEY ? (shouldKeepOld ? state.clientKey : keyPem) : null;
    let changed =
      state.clientCert?.path !== nextCert?.path ||
      state.clientCert?.content !== nextCert?.content ||
      state.clientKey?.path !== nextKey?.path ||
      state.clientKey?.content !== nextKey?.content;
    state.clientCert = nextCert;
    state.clientKey = nextKey;
    if (changed) clearMTLSCache_2(state);
    return {
      changed,
      readFailed: shouldKeepOld,
      mismatched,
    };
  });
});
//@ chunk-hq88884p.js:57316-57404 facade-exports
function getLoadedMTLSPaths() {
  let state = currentMtlsState();
  return {
    certPath: state.clientCert?.path,
    keyPath: state.clientKey?.path,
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
function getMTLSConfig_2(state) {
  let config = {};
  let CLAUDE_CODE_CLIENT_CERT = env.CLAUDE_CODE_CLIENT_CERT;
  if (CLAUDE_CODE_CLIENT_CERT) {
    if (state.clientCert?.path !== CLAUDE_CODE_CLIENT_CERT)
      state.clientCert =
        loadPemFileSync(CLAUDE_CODE_CLIENT_CERT, "client certificate from CLAUDE_CODE_CLIENT_CERT") ??
        state.clientCert;
    if (state.clientCert?.path === CLAUDE_CODE_CLIENT_CERT) config.cert = state.clientCert.content;
  }
  let CLAUDE_CODE_CLIENT_KEY = env.CLAUDE_CODE_CLIENT_KEY;
  if (CLAUDE_CODE_CLIENT_KEY) {
    if (state.clientKey?.path !== CLAUDE_CODE_CLIENT_KEY)
      state.clientKey =
        loadPemFileSync(CLAUDE_CODE_CLIENT_KEY, "client key from CLAUDE_CODE_CLIENT_KEY") ?? state.clientKey;
    if (state.clientKey?.path === CLAUDE_CODE_CLIENT_KEY) config.key = state.clientKey.content;
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
  ].every((proxyUrl) => !proxyUrl || /^\s*http:/i.test(proxyUrl));
  return caListFor(all ? env_2 : undefined);
}
//@ chunk-hq88884p.js:58153-58174 layout
var MTLS_RELOAD_INTERVAL_MS = 1000;
var MTLS_SOCKET_TIMEOUT_MS = 35000;
//@ chunk-hq88884p.js:58174-58952 layout
class TrackedHttpsAgent extends Agent {
  #e = this.options.ca;
  #r = Array.isArray(this.#e) ? [...this.#e] : undefined;
  #t = new WeakMap();
  createConnection(...connectArgs) {
    let fingerprint = caEnvFingerprintIfEnabled();
    let connection = super.createConnection(...connectArgs);
    if (connection) this.#t.set(connection, fingerprint);
    return connection;
  }
  keepSocketAlive(socket) {
    let keepAlive = super.keepSocketAlive(socket);
    if (
      socket instanceof Socket &&
      isRemoteManagedEnvironment() &&
      !env.CLAUDE_CODE_DISABLE_POOLED_CONNECTION_IDLE_LIMIT
    ) {
      socket.setKeepAlive(false);
      socket.setTimeout(MTLS_SOCKET_TIMEOUT_MS);
    }
    return keepAlive;
  }
  reuseSocket(socket, request) {
    if (this.#t.get(socket) !== caEnvFingerprintIfEnabled()) socket.destroy();
    if (socket instanceof Socket) {
      socket.setTimeout(0);
      socket.setKeepAlive(true, MTLS_RELOAD_INTERVAL_MS);
    }
    super.reuseSocket(socket, request);
  }
  getName(options) {
    if (typeof options?._agentKey === "string") return options._agentKey;
    let ca = options?.ca;
    let initialCaList = this.#r;
    let isUnchangedCa =
      initialCaList !== undefined &&
      ca === this.#e &&
      Array.isArray(ca) &&
      ca.length === initialCaList.length &&
      initialCaList.every((initialCa, caIndex) => typeof initialCa === "string" && ca[caIndex] === initialCa);
    let baseName = super.getName(
      isUnchangedCa
        ? {
            ...options,
            ca: "own",
          }
        : options,
    );
    let fingerprint = caEnvFingerprintIfEnabled();
    return fingerprint === undefined ? baseName : `${baseName}:${fingerprint}`;
  }
}
//@ chunk-hq88884p.js:58952-59363 facade-exports = getMTLSAgent (0.459)
/**
 * 按目标（customer/strict）创建带客户端证书和额外 CA 的 https.Agent，缓存复用。
 */
function getMTLSAgent(isCustomerEnv) {
  let mtlsConfig = currentMtlsState();
  let caCerts = getMTLSConfig();
  let proxyCaList = caListBehindProxy(isCustomerEnv);
  let agentKey = isCustomerEnv ? "customer" : "strict";
  let fingerprint = caEnvFingerprintIfEnabled();
  let cachedEntry = mtlsConfig.agents.get(agentKey);
  if (
    cachedEntry &&
    cachedEntry.config === caCerts &&
    cachedEntry.ca === proxyCaList &&
    cachedEntry.checkSwitches === fingerprint
  )
    return cachedEntry.agent;
  let agent;
  if (caCerts || proxyCaList) {
    let agentOptions = {
      ...caCerts,
      ...(proxyCaList && {
        ca: proxyCaList,
      }),
      keepAlive: true,
      keepAliveMsecs: MTLS_RELOAD_INTERVAL_MS,
      maxSockets: 1 / 0,
      maxTotalSockets: 1 / 0,
    };
    logForDebugging("mTLS: Creating HTTPS agent with custom certificates");
    agent = new TrackedHttpsAgent(agentOptions);
  }
  mtlsConfig.agents.set(agentKey, {
    config: caCerts,
    ca: proxyCaList,
    checkSwitches: fingerprint,
    agent,
  });
  destroyFreeSockets(cachedEntry?.agent);
  return agent;
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
function getTLSFetchSession(origin, requestOptions) {
  let FetchSession = typeof Bun === "undefined" ? undefined : Bun.FetchSession;
  if (!FetchSession) return;
  let tlsFetchOptions = getTLSFetchOptions(requestOptions);
  let fetchSessions = currentMtlsState().fetchSessions;
  let sessionKey = anthropicHostOf(requestOptions) ? `${origin}:customer` : origin;
  let existing = fetchSessions.get(sessionKey);
  if (existing && isDeepStrictEqual(existing.tls, tlsFetchOptions.tls)) {
    existing.tls = tlsFetchOptions.tls;
    return existing.session;
  }
  let session = new FetchSession(tlsFetchOptions);
  existing?.session.close();
  fetchSessions.set(sessionKey, {
    tls: tlsFetchOptions.tls,
    session,
  });
  return session;
}
//@ chunk-hq88884p.js:59890-59914 facade-exports
/**
 * 清除 mTLS 证书/agent/fetch session 缓存（设置变化后调用）。
 */
function clearMTLSCache() {
  clearMTLSCache_2(currentMtlsState());
}
//@ chunk-hq88884p.js:59914-60095 fingerprint = clearMTLSCache (0.638)
function clearMTLSCache_2(state) {
  state.config.cache.clear?.();
  for (let [cachedKey, { config, agent }] of state.agents)
    if (cachedKey === "customer" || config !== undefined || !isHttpsAgentKeepingEnabled()) {
      destroyFreeSockets(agent);
      state.agents.delete(cachedKey);
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
function destroyFreeSockets(agent) {
  if (!agent) return;
  agent.maxFreeSockets = 0;
  for (let freeSocket of Object.values(agent.freeSockets))
    for (let socketEntry of [...(freeSocket ?? [])]) socketEntry.destroy();
}
//@ chunk-1ny7cxrt.js:1325162-1325530 sole-consumer
let SsrfGuardedConnector; // deferred: uses TlsCheckingProxyAgent (./proxy.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-1ny7cxrt.js:1325162", () => {
  SsrfGuardedConnector = class SsrfGuardedConnector extends TlsCheckingProxyAgent {
    async connect(options, target) {
      let host = target.host;
      let resolvedTarget = target;
      if (host && isEgressBoundaryActive()) {
        let replaced = host.toLowerCase().replace(/\.$/, "");
        if (isPrivateHost(replaced))
          throw Error("ECONNREFUSED_SSRF: blocked loopback/metadata host via proxy");
        if (!isIP(host))
          resolvedTarget = {
            ...resolvedTarget,
            host: replaced,
            servername: replaced,
          };
      } else if (host && !isIP(host)) {
        let host_2 = await new Promise((resolve, reject) =>
          guardedLookup(host, {}, (lookupError, address) =>
            lookupError ? reject(lookupError) : resolve(address),
          ),
        );
        resolvedTarget = {
          ...resolvedTarget,
          host: host_2,
          servername: host,
        };
      }
      return super.connect(options, resolvedTarget);
    }
  };
});
//@ chunk-1ny7cxrt.js:1325530-1325607 fingerprint = getWebSocketTLSOptions (1)
function getWebSocketTLSOptions_2(agentOptions, caCertPem) {
  let connector = new SsrfGuardedConnector(agentOptions);
  if (caCertPem)
    connector.options = {
      ...connector.options,
      ca: caCertPem,
    };
  return connector;
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

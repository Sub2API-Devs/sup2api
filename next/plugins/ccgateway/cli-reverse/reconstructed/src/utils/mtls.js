/**
 * utils/mtls.ts
 *
 * mTLS：读取 CLAUDE_CODE_CLIENT_CERT/KEY/KEY_PASSPHRASE，构造带客户端证书与 CA 的 https.Agent、fetch TLS 选项和 Bun FetchSession，缓存与清理。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/mtls.ts
 * pieces: chunk-1hnjmk23.js (2), chunk-355mdh7x.js (41)
 * attribution: sole-consumer 1, fingerprint 3, placement 2, layout 14, facade-majority 23
 */
import { createPrivateKey, X509Certificate } from "crypto";
import { Agent } from "https";
import { Socket, isIP } from "net";
import { isDeepStrictEqual } from "util";
import { memoizeAlias } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, isDisklessProcess } from "../bootstrap/state.js";
import { env } from "./env.js";
import { logForDebugging } from "./debug.js";
import { getFsImplementation } from "./fsOperations.js";
import { serializeCalls } from "./promiseQueue.js";
import { caListFor, getCACertificates } from "./caCerts.js";
import { isRemoteManagedEnvironment } from "./remoteEnvironment.js";
import { KeptConnectionGate } from "./tlsAgentPool.js";
import { caEnvFingerprint, anthropicHostOf, isHttpsAgentKeepingEnabled } from "./anthropicHosts.js";
import { TlsCheckingProxyAgent } from "./proxy.js";
import { isEgressBoundaryActive } from "../services/claudeGateway/network.js";
import { isPrivateHost } from "./network/privateHostCheck.js";
import { guardedLookup } from "../services/claudeGateway/ssrfGuard.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-355mdh7x.js:95020-95211 placement
class MtlsState {
  clientCert = null;
  clientKey = null;
  config = memoizeAlias(() => getMTLSConfig_2(this));
  agents = new Map();
  fetchSessions = new Map();
  closesAfterServerError = false;
  ccrLeftSharedPool = false;
  ccrActedOnNoAnswerAtMs;
  modelApiPoolRetires;
}
//@ chunk-355mdh7x.js:95211-95236 placement
var mtlsStateRegistry; // deferred: uses MtlsState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-355mdh7x.js:95211", () => {
  mtlsStateRegistry = new HostScoped(() => new MtlsState());
});
//@ chunk-355mdh7x.js:95236-95272 layout
function currentMtlsState() {
  return mtlsStateRegistry.of(getRootSession().host);
}
//@ chunk-355mdh7x.js:95272-95293 layout
var PEM_BEGIN_PREFIX = "-----BEGIN ";
//@ chunk-355mdh7x.js:95293-95478 layout
function hasCompletePemBlock(pem) {
  let index = pem.lastIndexOf(PEM_BEGIN_PREFIX);
  if (index === -1) return false;
  let index_2 = pem.indexOf("-----", index + PEM_BEGIN_PREFIX.length);
  if (index_2 === -1) return false;
  let sliced = pem.slice(index + PEM_BEGIN_PREFIX.length, index_2);
  return pem.includes(`-----END ${sliced}-----`, index_2);
}
//@ chunk-355mdh7x.js:95478-95549 facade-majority
var PEM_CERT_BLOCK_RE = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g;
//@ chunk-355mdh7x.js:95549-95811 layout
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
//@ chunk-355mdh7x.js:95811-95826 layout
var MAX_CLIENT_CERT_FILE_BYTES = 1048576;
//@ chunk-355mdh7x.js:95826-95975 layout
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
//@ chunk-355mdh7x.js:95975-96298 layout
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
//@ chunk-355mdh7x.js:96298-96631 layout
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
//@ chunk-355mdh7x.js:96631-97306 facade-majority
var loadMTLSClientMaterial; // deferred: uses currentMtlsState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-355mdh7x.js:96631", () => {
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
//@ chunk-355mdh7x.js:97306-97393 facade-majority
function getLoadedMTLSPaths() {
  let state = currentMtlsState();
  return {
    certPath: state.clientCert?.path,
    keyPath: state.clientKey?.path,
  };
}
//@ chunk-355mdh7x.js:97393-97427 facade-majority
function getMTLSConfig() {
  return currentMtlsState().config();
}
//@ chunk-355mdh7x.js:97427-97979 fingerprint (2.1.88 match: getMTLSConfig, 0.652)
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
//@ chunk-355mdh7x.js:97979-98141 facade-majority (2.1.88 match: getProxyUrl, 0.792)
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
//@ chunk-355mdh7x.js:98141-98170 layout
var MTLS_RELOAD_INTERVAL_MS = 1000;
var MTLS_SOCKET_TIMEOUT_MS = 35000;
var POOLED_CONNECTION_IDLE_TIMEOUT_MS = 5000;
//@ chunk-355mdh7x.js:98170-98285 layout
function pooledKeepAliveTimeout() {
  if (env.CLAUDE_CODE_DISABLE_POOLED_CONNECTION_IDLE_LIMIT) return;
  if (isDisklessProcess()) return POOLED_CONNECTION_IDLE_TIMEOUT_MS;
  return isRemoteManagedEnvironment() ? MTLS_SOCKET_TIMEOUT_MS : undefined;
}
//@ chunk-355mdh7x.js:98285-98671 facade-majority
class CheckSwitchTiedHttpsAgent extends Agent {
  #e = new KeptConnectionGate(this);
  createConnection(...[options, ...moreArgs]) {
    let fingerprint = caEnvFingerprint();
    let connection = super.createConnection(this.#e.dialOptions(options), ...moreArgs);
    if (connection) this.#e.noteOpened(connection, fingerprint);
    return connection;
  }
  reuseSocket(socket, options) {
    this.#e.closeUnlessOpenedUnderPresentSwitches(socket);
    super.reuseSocket(socket, options);
  }
  getName(options) {
    return this.#e.poolName(options, () => this.nameWithoutCheckSwitches(options));
  }
  nameWithoutCheckSwitches(options) {
    return super.getName(options);
  }
}
//@ chunk-355mdh7x.js:98671-99208 layout
let TrackedHttpsAgent; // deferred: uses CheckSwitchTiedHttpsAgent of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-355mdh7x.js:98671", () => {
  TrackedHttpsAgent = class TrackedHttpsAgent extends CheckSwitchTiedHttpsAgent {
    #e = this.options.ca;
    #t = Array.isArray(this.#e) ? [...this.#e] : undefined;
    keepSocketAlive(socket) {
      let keptSocket = super.keepSocketAlive(socket);
      let keepAliveTimeoutMs = pooledKeepAliveTimeout();
      if (socket instanceof Socket && keepAliveTimeoutMs !== undefined) {
        socket.setKeepAlive(false);
        socket.setTimeout(keepAliveTimeoutMs);
      }
      return keptSocket;
    }
    reuseSocket(socket, options) {
      if (socket instanceof Socket) {
        socket.setTimeout(0);
        socket.setKeepAlive(true, MTLS_RELOAD_INTERVAL_MS);
      }
      super.reuseSocket(socket, options);
    }
    nameWithoutCheckSwitches(options) {
      let ca = options?.ca;
      let caListAtConstruction = this.#t;
      let isUnchangedCa =
        caListAtConstruction !== undefined &&
        ca === this.#e &&
        Array.isArray(ca) &&
        ca.length === caListAtConstruction.length &&
        caListAtConstruction.every(
          (caEntry, caIndex) => typeof caEntry === "string" && ca[caIndex] === caEntry,
        );
      return super.nameWithoutCheckSwitches(
        isUnchangedCa
          ? {
              ...options,
              ca: "own",
            }
          : options,
      );
    }
  };
});
//@ chunk-355mdh7x.js:99208-99652 facade-majority (2.1.88 match: getMTLSAgent, 0.432)
/**
 * 按目标（customer/strict）创建带客户端证书和额外 CA 的 https.Agent，缓存复用。
 */
function getMTLSAgent(isCustomerEnv) {
  let mtlsConfig = currentMtlsState();
  let caCerts = getMTLSConfig();
  let proxyCaList = caListBehindProxy(isCustomerEnv);
  let agentKey = isCustomerEnv ? "customer" : "strict";
  let fingerprint = caEnvFingerprint();
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
    agent = mtlsConfig.closesAfterServerError
      ? new ServerErrorPruningAgent(agentOptions)
      : new TrackedHttpsAgent(agentOptions);
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
//@ chunk-355mdh7x.js:99652-99765 facade-majority
function makeHttpsAgentCloseAfterServerError() {
  let mtlsState = currentMtlsState();
  mtlsState.closesAfterServerError = true;
  for (let { agent } of mtlsState.agents.values()) destroyFreeSockets(agent);
  mtlsState.agents.clear();
}
//@ chunk-355mdh7x.js:99765-99813 facade-majority
function mayComeFromOneBadMachine(statusCode) {
  return statusCode >= 500 && statusCode !== 501 && statusCode !== 529;
}
//@ chunk-355mdh7x.js:99813-100261 layout
let ServerErrorPruningAgent; // deferred: uses TrackedHttpsAgent of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-355mdh7x.js:99813", () => {
  ServerErrorPruningAgent = class ServerErrorPruningAgent extends TrackedHttpsAgent {
    keepSocketAlive(socket) {
      let { _httpMessage, remotePort } = socket;
      let statusCode = _httpMessage?.res?.statusCode;
      if (statusCode === undefined || !mayComeFromOneBadMachine(statusCode))
        return Boolean(super.keepSocketAlive(socket));
      logForDebugging(
        `HTTPS agent: a server on port ${remotePort} answered ${statusCode}; closing that connection and the idle ones to the same host and port, so the next request opens a new one`,
      );
      for (let [key, value] of Object.entries(this.freeSockets))
        if (key.startsWith(`${_httpMessage?.host}:${remotePort}:`))
          for (let freeSocket of [...(value ?? [])]) freeSocket.destroy();
      return false;
    }
  };
});
//@ chunk-355mdh7x.js:100261-100342 facade-majority
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
//@ chunk-355mdh7x.js:100342-100425 facade-majority (2.1.88 match: getWebSocketTLSOptions, 1)
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
//@ chunk-355mdh7x.js:100425-100516 facade-majority (2.1.88 match: getTLSFetchOptions, 0.319)
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
//@ chunk-355mdh7x.js:100516-100787 facade-majority
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
//@ chunk-355mdh7x.js:100787-100844 facade-majority
function heldTLSFetchSession(sessionRef) {
  return currentMtlsState().fetchSessions.get(sessionRef)?.session;
}
//@ chunk-355mdh7x.js:100844-100996 facade-majority
function retireTLSFetchSession(sessionRef, session) {
  let fetchSessions = currentMtlsState().fetchSessions;
  let found = [sessionRef, `${sessionRef}:customer`].find(
    (candidate) => fetchSessions.get(candidate)?.session === session,
  );
  if (found === undefined) return false;
  fetchSessions.delete(found);
  session.close();
  return true;
}
//@ chunk-355mdh7x.js:100996-101040 facade-majority
function ccrHasLeftSharedPool() {
  return currentMtlsState().ccrLeftSharedPool;
}
//@ chunk-355mdh7x.js:101040-101120 facade-majority
function ccrLeavesSharedPool() {
  let state = currentMtlsState();
  let first = !state.ccrLeftSharedPool;
  state.ccrLeftSharedPool = true;
  return first;
}
//@ chunk-355mdh7x.js:101120-101275 facade-majority
function ccrActsOnNoAnswer(windowMs) {
  let state = currentMtlsState();
  let now = Date.now();
  let sinceMs = now - (state.ccrActedOnNoAnswerAtMs ?? Number.NEGATIVE_INFINITY);
  if (sinceMs >= 0 && sinceMs < windowMs) return false;
  state.ccrActedOnNoAnswerAtMs = now;
  return true;
}
//@ chunk-355mdh7x.js:101275-101329 facade-majority
function modelApiPoolRetiresAfterServerError() {
  return currentMtlsState().modelApiPoolRetires?.() ?? false;
}
//@ chunk-355mdh7x.js:101329-101371 facade-majority
function setModelApiPoolRetiresAfterServerError(modelApiPoolRetires) {
  currentMtlsState().modelApiPoolRetires = modelApiPoolRetires;
}
//@ chunk-355mdh7x.js:101371-101394 facade-majority
/**
 * 清除 mTLS 证书/agent/fetch session 缓存（设置变化后调用）。
 */
function clearMTLSCache() {
  clearMTLSCache_2(currentMtlsState());
}
//@ chunk-355mdh7x.js:101394-101575 fingerprint (2.1.88 match: clearMTLSCache, 0.638)
function clearMTLSCache_2(state) {
  state.config.cache.clear?.();
  for (let [cachedKey, { config, agent }] of state.agents)
    if (cachedKey === "customer" || config !== undefined || !isHttpsAgentKeepingEnabled()) {
      destroyFreeSockets(agent);
      state.agents.delete(cachedKey);
    }
  logForDebugging("Cleared mTLS configuration cache");
}
//@ chunk-355mdh7x.js:101575-101717 facade-majority (2.1.88 match: configureGlobalMTLS, 1)
/**
 * 启动时配置全局 mTLS；检测到 NODE_EXTRA_CA_CERTS 时记日志（运行时自动追加到内置 CA）。
 */
function configureGlobalMTLS() {
  if (!getMTLSConfig()) return;
  if (env.NODE_EXTRA_CA_CERTS)
    logForDebugging("NODE_EXTRA_CA_CERTS detected - Node.js will automatically append to built-in CAs");
}
//@ chunk-355mdh7x.js:101717-101770 layout
function destroyFreeSockets(agent) {
  if (!agent) return;
  agent.maxFreeSockets = 0;
  destroyAgentFreeSockets(agent);
}
//@ chunk-355mdh7x.js:101770-101862 layout
function destroyAgentFreeSockets(agent) {
  for (let freeSocket of Object.values(agent.freeSockets))
    for (let socket of [...(freeSocket ?? [])]) socket.destroy();
}
//@ chunk-355mdh7x.js:101862-101927 facade-majority
function closeIdleDirectConnections() {
  for (let { agent } of currentMtlsState().agents.values()) if (agent) destroyAgentFreeSockets(agent);
}
//@ chunk-1hnjmk23.js:1326125-1326493 sole-consumer
let SsrfGuardedConnector; // deferred: uses TlsCheckingProxyAgent (./proxy.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-1hnjmk23.js:1326125", () => {
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
//@ chunk-1hnjmk23.js:1326493-1326570 fingerprint (2.1.88 match: getWebSocketTLSOptions, 1)
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
  getTLSFetchSession,
  getWebSocketTLSOptions,
  getMTLSConfig,
  getTLSFetchOptions,
  getMTLSAgent,
  closeIdleDirectConnections,
  getWebSocketTLSOptions_2,
  setModelApiPoolRetiresAfterServerError,
  makeHttpsAgentCloseAfterServerError,
  caListBehindProxy,
  CheckSwitchTiedHttpsAgent,
  loadMTLSClientMaterial,
  getLoadedMTLSPaths,
  clearMTLSCache,
  PEM_CERT_BLOCK_RE,
  modelApiPoolRetiresAfterServerError,
  mayComeFromOneBadMachine,
  retireTLSFetchSession,
  ccrHasLeftSharedPool,
  ccrLeavesSharedPool,
  heldTLSFetchSession,
  ccrActsOnNoAnswer,
  configureGlobalMTLS,
  createOneOffHttpsAgent,
};

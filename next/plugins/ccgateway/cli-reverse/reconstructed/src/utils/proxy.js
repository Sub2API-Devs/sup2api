/**
 * utils/proxy.ts
 *
 * 代理：读取 HTTP(S)_PROXY / NO_PROXY、创建代理 agent（undici/https-proxy-agent）、proxyAuthHelper 生成 Proxy-Authorization、安装全局 dispatcher 与 axios 拦截器、AWS SDK 代理配置。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/proxy.ts
 * pieces: chunk-1hnjmk23.js (1), chunk-355mdh7x.js (53), chunk-7kayq7nc.js (1)
 * attribution: fingerprint 5, placement 6, layout 18, facade-exports 26
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isIP } from "net";
import { checkServerIdentity } from "tls";
import { homedir } from "os";
import { __toESM, importMetaRequire } from "../../runtime/bun-runtime.js";
import { require_https_proxy_agent } from "../../vendor/https-proxy-agent/dist/index.js";
import { logForDebugging } from "./debug.js";
import { KeptConnectionGate } from "./tlsAgentPool.js";
import {
  caEnvFingerprint,
  anthropicHostOf,
  withoutSensitiveHeaders,
  nodeModuleInterop,
} from "./anthropicHosts.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, getIsNonInteractiveSession, getProjectConfigRoot } from "../bootstrap/state.js";
import { PROXY_ENV_VARS, ALL_PROXY_ENV_NAMES } from "./swarm/spawnUtils.js";
import { identity } from "./identity.js";
import { ipInCidr } from "./cidr.js";
import { getMTLSConfig, getTLSFetchOptions, getMTLSAgent, closeIdleDirectConnections } from "./mtls.js";
import { getCACertificates, caListFor, applyDefaultCaCertificates } from "./caCerts.js";
import { env } from "./env.js";
import { isLoopbackHost } from "./localhost.js";
import { safeExecShell } from "./safeSpawn.js";
import { isEnvTruthy, isEnvDefinedFalsy } from "./envUtils.js";
import { axios_default } from "../../vendor/axios/dist/esm/axios.js";
import { missesHostOwnedEnvWrite } from "./plugins/securityDefaultPlugin.js";
import { memoizeAlias } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { hasAxiosProxyInterceptor, axiosTestEgressInterceptor } from "./testNetworkGuard.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-355mdh7x.js:101927-101946 placement
var tlsModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-355mdh7x.js:101927", () => {
  tlsModule = __toESM(require_https_proxy_agent(), 1);
});
//@ chunk-355mdh7x.js:102017-102115 placement
/**
 * 代理 TLS 的 servername 与主机身份检查选项。
 */
function proxyTlsOptions(hostname) {
  return !hostname || isIP(hostname)
    ? {
        servername: "",
        checkServerIdentity: (left, right) => checkServerIdentity(hostname, right),
      }
    : {
        servername: hostname,
      };
}
//@ chunk-355mdh7x.js:102115-102352 placement
/**
 * HTTPS 代理 agent：对 TLS 目标沿用调用方的证书身份检查（按 servername），否则套用代理 TLS 选项。
 */
let TlsCheckingProxyAgent; // deferred: uses tlsModule of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-355mdh7x.js:102115", () => {
  TlsCheckingProxyAgent = class TlsCheckingProxyAgent extends tlsModule.HttpsProxyAgent {
    connect(...[socket, options]) {
      if (!options.secureEndpoint) return super.connect(socket, options);
      let servername = options.servername || options.host || "";
      let checkServerIdentity = options.checkServerIdentity;
      return super.connect(socket, {
        ...options,
        ...(checkServerIdentity
          ? {
              checkServerIdentity: (name, cert) => checkServerIdentity(servername, cert),
            }
          : proxyTlsOptions(servername)),
      });
    }
  };
});
//@ chunk-355mdh7x.js:102352-102895 layout
let otelTunnelAgent; // deferred: uses TlsCheckingProxyAgent of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-355mdh7x.js:102352", () => {
  otelTunnelAgent = class otelTunnelAgent extends TlsCheckingProxyAgent {
    #e;
    #t;
    constructor({ isSecure, tunnelOpensWithinMs }, ...options) {
      super(...options);
      this.#e = isSecure;
      this.#t = tunnelOpensWithinMs;
    }
    isSecureEndpoint() {
      return this.#e;
    }
    async connect(...options) {
      let abortController = new AbortController();
      let timer = setTimeout(abortTunnel, this.#t, abortController);
      this.connectOpts = {
        ...this.connectOpts,
        signal: abortController.signal,
      };
      try {
        let socket = await super.connect(...options);
        if (this.#e) {
          socket.once("secureConnect", () => clearTimeout(timer));
          socket.once("close", () => clearTimeout(timer));
          abortController.signal.addEventListener("abort", () => socket.destroy(otelProxyTimeoutError()));
        } else clearTimeout(timer);
        return socket;
      } catch (error) {
        clearTimeout(timer);
        throw abortController.signal.aborted ? otelProxyTimeoutError() : error;
      }
    }
  };
});
//@ chunk-355mdh7x.js:102895-103454 layout
let otelKeptConnectionAgent; // deferred: uses otelTunnelAgent of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-355mdh7x.js:102895", () => {
  otelKeptConnectionAgent = class otelKeptConnectionAgent extends otelTunnelAgent {
    #e = new KeptConnectionGate(this);
    async connect(...options) {
      let fingerprint = caEnvFingerprint();
      let socket = await super.connect(...options);
      if (caEnvFingerprint() !== fingerprint) {
        socket.destroy();
        throw Error(
          "This OpenTelemetry export was not sent: NODE_TLS_REJECT_UNAUTHORIZED, BUN_TLS_REFUSE_DISTRUSTED_KEYS or CLAUDE_CODE_DISABLE_HTTPS_AGENT_KEEPING changed while its connection through the proxy was opening. The next export opens a new connection.",
        );
      }
      this.#e.noteOpened(socket, fingerprint);
      return socket;
    }
    reuseSocket(socket, options) {
      this.#e.closeUnlessOpenedUnderPresentSwitches(socket);
      super.reuseSocket(socket, options);
    }
    getName(options) {
      return this.#e.poolName(options, () => super.getName(options));
    }
  };
});
//@ chunk-355mdh7x.js:103454-103769 layout
function otelProxyTimeoutError() {
  return Object.assign(
    Error(
      "Could not connect to the OpenTelemetry collector through the proxy in time, so this export was not sent. Check that both can be reached. OTEL_EXPORTER_OTLP_TIMEOUT, or a signal's own time-out, sets the time allowed: 10 seconds unless set, 30 at most.",
    ),
    {
      code: "ETIMEDOUT",
    },
  );
}
//@ chunk-355mdh7x.js:103769-103794 layout
function abortTunnel(abortController) {
  abortController.abort();
}
//@ chunk-355mdh7x.js:103794-103992 placement
class ProxyConnectRefusedError extends Error {
  connectStatus;
  headers;
  code = "ERR_PROXY_TUNNEL";
  constructor(connectStatus, headers) {
    super("proxy refused the connection");
    this.connectStatus = connectStatus;
    this.headers = headers;
    this.name = "ProxyConnectRefusedError";
  }
}
//@ chunk-355mdh7x.js:103992-104051 placement
/**
 * 描述 HTTP 状态（0 为不可读回复）。
 */
function describeHttpStatus(connectStatus) {
  return connectStatus === 0 ? "unreadable reply" : `HTTP ${connectStatus}`;
}
//@ chunk-355mdh7x.js:104051-104192 placement
/**
 * 沿 cause 链查找代理错误。
 */
function findProxyError(error) {
  for (let current = error, depth = 0; depth < 4; depth++) {
    if (current instanceof ProxyConnectRefusedError) return current;
    if (typeof current !== "object" || current === null || !("cause" in current)) return;
    current = current.cause;
  }
  return;
}
//@ chunk-355mdh7x.js:104192-104503 layout
/**
 * CONNECT 代理 agent：代理对 CONNECT 返回非 200 时销毁连接并抛出 ProxyConnectRefusedError（带状态码与响应头）。
 */
let ConnectProxyAgent; // deferred: uses TlsCheckingProxyAgent of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-355mdh7x.js:104192", () => {
  ConnectProxyAgent = class ConnectProxyAgent extends TlsCheckingProxyAgent {
    async connect(...[socket, options]) {
      let refusal;
      let onProxyConnect = (response) => {
        if (response.statusCode !== 200) refusal = response;
      };
      socket.once("proxyConnect", onProxyConnect);
      let rawSocket;
      try {
        rawSocket = await super.connect(socket, options);
      } finally {
        socket.removeListener("proxyConnect", onProxyConnect);
      }
      if (refusal === undefined) return rawSocket;
      rawSocket.destroy();
      let statusCode = refusal.statusCode;
      throw new ProxyConnectRefusedError(
        Number.isInteger(statusCode) && statusCode >= 100 && statusCode <= 599 ? statusCode : 0,
        refusal.headers,
      );
    }
  };
});
//@ chunk-355mdh7x.js:104503-104767 layout
class ProxyState {
  keepAliveDisabled = false;
  agents = new Map();
  proxyAuthHelperConfig = {
    helper: undefined,
    fromProjectOrLocal: false,
    trustAccepted: () => false,
    startHelper: (name, helperPath, read) => read(),
    readAsHelperStarts: (name, helperPath, read) => read(),
  };
  proxyAuthCache = null;
  proxyAuthPendingChallenge = undefined;
  directRequestAdapter = undefined;
}
//@ chunk-355mdh7x.js:104767-104792 layout
var proxyStateSlot; // deferred: uses ProxyState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-355mdh7x.js:104767", () => {
  proxyStateSlot = new HostScoped(() => new ProxyState());
});
//@ chunk-355mdh7x.js:104792-104829 layout
function proxyState() {
  return proxyStateSlot.of(getRootSession().host);
}
//@ chunk-355mdh7x.js:104829-104870 facade-exports
function disableKeepAlive() {
  proxyState().keepAliveDisabled = true;
}
//@ chunk-355mdh7x.js:104870-105055 fingerprint (2.1.88 match: getAddressFamily, 1)
function getAddressFamily(options) {
  switch (options.family) {
    case 0:
    case 4:
    case 6:
      return options.family;
    case "IPv6":
      return 6;
    case "IPv4":
    case undefined:
      return 4;
    default:
      throw Error(`Unsupported address family: ${options.family}`);
  }
}
//@ chunk-355mdh7x.js:105175-105281 facade-exports
function getProxyUrlWithSource(env = process.env) {
  let found = PROXY_ENV_VARS.find((name) => env[name]);
  let value = found ? env[found] : undefined;
  return found && value
    ? {
        value,
        source: found,
      }
    : undefined;
}
//@ chunk-355mdh7x.js:105281-105328 facade-exports
function getProxyUrl(env = process.env) {
  return getProxyUrlWithSource(env)?.value;
}
//@ chunk-355mdh7x.js:105328-105401 facade-exports
function parseProxyUrl(rawUrl) {
  try {
    let parsed = new URL(rawUrl);
    return parsed.host ? parsed : undefined;
  } catch {
    return;
  }
}
//@ chunk-355mdh7x.js:105401-105660 facade-exports
function describeInvalidProxyUrl(source, value) {
  let replaced = value.replace(/\p{Cc}/gu, "");
  return `Invalid proxy URL in ${source}: "${replaced}" cannot be parsed as a URL.
Proxy settings must be a complete URL including the scheme, e.g. "http://proxy.example.com:8080".
Fix or unset ${source} and restart Claude Code.`;
}
//@ chunk-355mdh7x.js:105660-105694 layout
var reportedInvalidProxyUrls; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-355mdh7x.js:105660", () => {
  reportedInvalidProxyUrls = identity(new Set(), (set) => set.clear());
});
//@ chunk-355mdh7x.js:105694-105877 facade-exports
/**
 * 读代理 URL（https_proxy、HTTPS_PROXY、http_proxy、HTTP_PROXY 依次），无法解析时打印一次错误并忽略。
 */
function getUsableProxyUrl(env = process.env) {
  let proxyUrlWithSource = getProxyUrlWithSource(env);
  if (!proxyUrlWithSource) return;
  if (!parseProxyUrl(proxyUrlWithSource.value)) {
    let label = `${proxyUrlWithSource.source}=${proxyUrlWithSource.value}`;
    if (!reportedInvalidProxyUrls.has(label)) {
      reportedInvalidProxyUrls.add(label);
      console.error(describeInvalidProxyUrl(proxyUrlWithSource.source, proxyUrlWithSource.value));
    }
    return;
  }
  return proxyUrlWithSource.value;
}
//@ chunk-355mdh7x.js:105877-105967 facade-exports (2.1.88 match: getNoProxy, 1)
function noProxyUnion(env) {
  let { no_proxy: noProxy, NO_PROXY } = env;
  if (noProxy && NO_PROXY && noProxy !== NO_PROXY) return `${noProxy},${NO_PROXY}`;
  return noProxy || NO_PROXY;
}
//@ chunk-355mdh7x.js:105967-106057 facade-exports (2.1.88 match: getNoProxy, 1)
function getNoProxy(env = process.env) {
  if (env.no_proxy === "*" || env.NO_PROXY === "*") return "*";
  return noProxyUnion(env);
}
//@ chunk-355mdh7x.js:106057-106458 facade-exports (2.1.88 match: shouldBypassProxy, 0.872)
/**
 * 按 NO_PROXY/no_proxy 判断 URL 是否绕过代理（支持 *、域名后缀、端口、IP）。
 */
function shouldBypassProxy(urlString, noProxy = getNoProxy()) {
  if (!noProxy) return false;
  if (noProxy === "*") return true;
  try {
    let url = new URL(urlString);
    let hostname = url.hostname.toLowerCase();
    let isHttps = url.protocol === "https:" || url.protocol === "wss:";
    let port = url.port || (isHttps ? "443" : "80");
    let hostWithPort = `${hostname}:${port}`;
    return noProxy
      .split(/[,\s]+/)
      .filter(Boolean)
      .some((pattern) => {
        pattern = pattern.toLowerCase().trim();
        if (pattern.includes(":")) return hostWithPort === pattern;
        if (pattern.startsWith(".")) {
          let suffix = pattern;
          return hostname === pattern.substring(1) || hostname.endsWith(suffix);
        }
        return hostname === pattern;
      });
  } catch {
    return false;
  }
}
//@ chunk-355mdh7x.js:106458-106756 layout
function shouldBypassProxyForHost(url, noProxy) {
  if (shouldBypassProxy(url, noProxy)) return true;
  if (!noProxy) return false;
  let hostname;
  try {
    hostname = new URL(url).hostname.replace(/^\[|\]$/g, "");
  } catch {
    return false;
  }
  if (isIP(hostname) === 0) return false;
  return noProxy
    .split(/[,\s]+/)
    .filter(Boolean)
    .some((entry) => {
      if (entry.includes("/")) return ipInCidr(hostname, entry);
      let family = isIP(entry);
      if (family === 0) return false;
      return ipInCidr(hostname, `${entry}/${family === 4 ? 32 : 128}`);
    });
}
//@ chunk-355mdh7x.js:106756-106925 fingerprint (2.1.88 match: createHttpsProxyAgent, 0.737)
/**
 * 创建 https-proxy-agent，带 mTLS 与 CA。
 */
function createHttpsProxyAgent(proxyUrl, extra) {
  let mtlsConfig = getMTLSConfig();
  let caCerts = getCACertificates();
  let agentOptions = createConnectProxyAgent(proxyUrl, {
    ...(mtlsConfig && {
      cert: mtlsConfig.cert,
      key: mtlsConfig.key,
      passphrase: mtlsConfig.passphrase,
    }),
    ...(caCerts && {
      ca: caCerts,
    }),
  });
  let caList = caListFor(extra);
  agentOptions.options = {
    ...agentOptions.options,
    ...(caList && {
      ca: caList,
    }),
  };
  return agentOptions;
}
//@ chunk-355mdh7x.js:106925-107152 facade-exports
function createConnectProxyAgent(proxyUrl, options) {
  let agentOptions = {
    ...options,
    headers: () => {
      let proxyAuthFromHelper = getProxyAuthFromHelperCached();
      return proxyAuthFromHelper
        ? {
            "Proxy-Authorization": proxyAuthFromHelper,
          }
        : {};
    },
  };
  if (env.CLAUDE_CODE_PROXY_RESOLVES_HOSTS)
    agentOptions.lookup = (hostname, options, callback) => {
      callback(null, hostname, getAddressFamily(options));
    };
  let agent = new ConnectProxyAgent(proxyUrl, agentOptions);
  agent.options = {
    ...agent.options,
    ...options,
  };
  return agent;
}
//@ chunk-355mdh7x.js:107152-107231 layout
function getCachedProxyAgent(uri) {
  let { agents } = proxyState();
  let agent = agents.get(uri);
  if (!agent) {
    agent = getProxyAgent(uri);
    agents.set(uri, agent);
  }
  return agent;
}
//@ chunk-355mdh7x.js:107231-107508 fingerprint (2.1.88 match: getProxyAgent, 1)
/**
 * 按代理 URL 创建 undici ProxyAgent / https-proxy-agent，带 Proxy-Authorization（proxyAuthHelper）与 mTLS。
 */
function getProxyAgent(uri) {
  let undiciMod = importMetaRequire("undici");
  let mtlsConfig = getMTLSConfig();
  let caCerts = getCACertificates();
  let proxyOptions = {
    httpProxy: uri,
    httpsProxy: uri,
    noProxy: getNoProxy({
      no_proxy: env.no_proxy,
      NO_PROXY: env.NO_PROXY,
    }),
  };
  if (mtlsConfig || caCerts) {
    let tlsOpts = {
      ...(mtlsConfig && {
        cert: mtlsConfig.cert,
        key: mtlsConfig.key,
        passphrase: mtlsConfig.passphrase,
      }),
      ...(caCerts && {
        ca: caCerts,
      }),
    };
    proxyOptions.connect = tlsOpts;
    proxyOptions.requestTls = tlsOpts;
  }
  return new undiciMod.EnvHttpProxyAgent(proxyOptions);
}
//@ chunk-355mdh7x.js:107508-107617 facade-exports
function getWebSocketProxyUrl(wsUrl) {
  let usableProxyUrl = getUsableProxyUrl();
  if (!usableProxyUrl) return;
  try {
    if (isLoopbackHost(new URL(wsUrl).hostname)) return;
  } catch {}
  if (shouldBypassProxy(wsUrl)) return;
  return usableProxyUrl;
}
//@ chunk-355mdh7x.js:107617-107631 layout
var PROXY_AUTH_HELPER_DEFAULT_TTL_MS = 300000;
//@ chunk-355mdh7x.js:107631-107676 facade-exports
function _setProxyAuthHelperConfig(proxyAuthHelperConfig) {
  proxyState().proxyAuthHelperConfig = proxyAuthHelperConfig;
}
//@ chunk-355mdh7x.js:107676-107782 facade-exports
/**
 * proxyAuthHelper 命令（需 CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER）。
 */
function getConfiguredProxyAuthHelper() {
  if (!env.CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER) return;
  return proxyState().proxyAuthHelperConfig.helper;
}
//@ chunk-355mdh7x.js:107782-107863 layout
function isProxyAuthHelperFromRepo(state) {
  return getConfiguredProxyAuthHelper() !== undefined && state.proxyAuthHelperConfig.fromProjectOrLocal;
}
//@ chunk-355mdh7x.js:107863-107961 layout
function getProxyAuthHelperTtl() {
  let CLAUDE_CODE_PROXY_AUTH_HELPER_TTL_MS = env.CLAUDE_CODE_PROXY_AUTH_HELPER_TTL_MS;
  if (CLAUDE_CODE_PROXY_AUTH_HELPER_TTL_MS !== undefined && CLAUDE_CODE_PROXY_AUTH_HELPER_TTL_MS >= 0)
    return CLAUDE_CODE_PROXY_AUTH_HELPER_TTL_MS;
  return PROXY_AUTH_HELPER_DEFAULT_TTL_MS;
}
//@ chunk-355mdh7x.js:107961-109360 facade-exports
/**
 * 运行 proxyAuthHelper 得到 Proxy-Authorization 值并缓存（TTL 默认 5 分钟，CLAUDE_CODE_PROXY_AUTH_HELPER_TTL_MS）；来自项目/本地设置时需信任。
 */
async function getProxyAuthFromHelper() {
  let configuredProxyAuthHelper = getConfiguredProxyAuthHelper();
  if (!configuredProxyAuthHelper) return null;
  let state = proxyState();
  let personAndPolicy = state.proxyAuthHelperConfig.sources === "personAndPolicy";
  if (personAndPolicy && isProxyAuthHelperFromRepo(state)) return null;
  if (
    isProxyAuthHelperFromRepo(state) &&
    !getIsNonInteractiveSession() &&
    !state.proxyAuthHelperConfig.trustAccepted()
  ) {
    logForDebugging(
      "proxyAuthHelper configured in project/local settings but workspace trust not yet accepted \u2014 skipping",
      {
        level: "warn",
      },
    );
    return null;
  }
  let asHelperStarts = state.proxyAuthHelperConfig.readAsHelperStarts(
    "proxyAuthHelper",
    configuredProxyAuthHelper,
    () => getProxyUrl(),
  );
  if (asHelperStarts !== getProxyUrl()) {
    logForDebugging(
      "proxyAuthHelper is the organization's and the proxy in use is not the one it was started for: no credential sent",
      {
        level: "warn",
      },
    );
    return null;
  }
  let proxyAuthPendingChallenge = state.proxyAuthPendingChallenge;
  if (
    !proxyAuthPendingChallenge &&
    state.proxyAuthCache &&
    Date.now() - state.proxyAuthCache.timestamp < getProxyAuthHelperTtl()
  )
    return state.proxyAuthCache.value;
  state.proxyAuthPendingChallenge = undefined;
  let proxyHost;
  try {
    proxyHost = asHelperStarts ? new URL(asHelperStarts).hostname : undefined;
  } catch {
    proxyHost = undefined;
  }
  let cwd = personAndPolicy ? homedir() : getProjectConfigRoot();
  let runResult = await state.proxyAuthHelperConfig.startHelper(
    "proxyAuthHelper",
    configuredProxyAuthHelper,
    () =>
      safeExecShell(configuredProxyAuthHelper, {
        ...(cwd !== null && {
          cwd,
        }),
        timeout: 30000,
        reject: false,
        useToolMemoryCgroup: false,
        env: {
          ...process.env,
          ...(asHelperStarts && {
            CLAUDE_CODE_PROXY_URL: asHelperStarts,
          }),
          ...(proxyHost && {
            CLAUDE_CODE_PROXY_HOST: proxyHost,
          }),
          ...(proxyAuthPendingChallenge && {
            CLAUDE_CODE_PROXY_AUTHENTICATE: proxyAuthPendingChallenge,
          }),
        },
      }),
  );
  if (runResult.failed || !runResult.stdout?.trim()) {
    let failureReason = runResult.timedOut
      ? "timed out"
      : runResult.failed
        ? `exited ${runResult.exitCode}`
        : "did not return a value";
    let trimmed = runResult.stderr?.trim();
    console.error(`proxyAuthHelper failed: ${trimmed ? `${failureReason}: ${trimmed}` : failureReason}`);
    return state.proxyAuthCache?.value ?? null;
  }
  let trimmed = runResult.stdout.trim();
  state.proxyAuthCache = {
    value: trimmed,
    timestamp: Date.now(),
  };
  return trimmed;
}
//@ chunk-355mdh7x.js:109360-109545 facade-exports
function getProxyAuthFromHelperCached() {
  let state = proxyState();
  let { helper, readAsHelperStarts } = state.proxyAuthHelperConfig;
  if (
    helper !== undefined &&
    readAsHelperStarts("proxyAuthHelper", helper, () => getProxyUrl()) !== getProxyUrl()
  )
    return null;
  return state.proxyAuthCache?.value ?? null;
}
//@ chunk-355mdh7x.js:109545-109624 facade-exports
function clearProxyAuthHelperCache(proxyAuthPendingChallenge) {
  let state = proxyState();
  state.proxyAuthCache = null;
  state.proxyAuthPendingChallenge = proxyAuthPendingChallenge;
}
//@ chunk-355mdh7x.js:109624-109731 facade-exports
function prefetchProxyAuthFromHelperIfSafe() {
  if (!getConfiguredProxyAuthHelper()) return;
  let state = proxyState();
  if (isProxyAuthHelperFromRepo(state) && !state.proxyAuthHelperConfig.trustAccepted()) return;
  getProxyAuthFromHelper();
}
//@ chunk-355mdh7x.js:109731-110434 facade-exports (2.1.88 match: getProxyFetchOptions, 0.432)
/**
 * 给 fetch 调用生成代理选项（dispatcher/proxy 与 Proxy-Authorization 头），无需代理时只带 TLS 选项。
 */
function getProxyFetchOptions(opts) {
  let envApiForceIdleTimeout = process.env.API_FORCE_IDLE_TIMEOUT;
  let base = isEnvTruthy(envApiForceIdleTimeout)
    ? true
    : isEnvDefinedFalsy(envApiForceIdleTimeout)
      ? false
      : opts.bodyIdleTimeout;
  let useBodyTimeout = opts.forAnthropicAPI && base !== true && (opts.hasBodyIdleWatchdog || base === false);
  let options = {
    ...(proxyState().keepAliveDisabled && {
      keepalive: false,
    }),
    ...(useBodyTimeout && {
      timeout: false,
    }),
  };
  if (opts.forAnthropicAPI) {
    let unixSocket = env.ANTHROPIC_UNIX_SOCKET;
    if (unixSocket)
      return {
        ...options,
        unix: unixSocket,
      };
  }
  let proxyUrl = getUsableProxyUrl();
  if (proxyUrl) {
    if (opts.url && shouldBypassProxy(opts.url))
      return {
        ...options,
        ...getTLSFetchOptions(opts.url),
      };
    let proxyAuthFromHelper = getProxyAuthFromHelperCached();
    return {
      ...options,
      proxy: proxyAuthFromHelper
        ? {
            url: proxyUrl,
            headers: {
              "Proxy-Authorization": proxyAuthFromHelper,
            },
          }
        : proxyUrl,
      ...getTLSFetchOptions(opts.url),
    };
  }
  if (opts.fallbackProxy) {
    if (
      opts.url &&
      (shouldBypassProxyForHost(opts.url, opts.fallbackProxy.noProxy) ||
        shouldBypassProxyForHost(opts.url, getNoProxy()))
    )
      return {
        ...options,
        ...getTLSFetchOptions(opts.url),
      };
    let tlsFetchOptions = getTLSFetchOptions(opts.url);
    return {
      ...options,
      proxy: opts.fallbackProxy.url,
      ...(opts.fallbackProxy.ca
        ? {
            tls: {
              ...tlsFetchOptions.tls,
              ca: opts.fallbackProxy.ca,
            },
          }
        : tlsFetchOptions),
    };
  }
  return {
    ...options,
    ...getTLSFetchOptions(opts.url),
  };
}
//@ chunk-355mdh7x.js:110434-110482 layout
var globalAgentsInstallState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-355mdh7x.js:110434", () => {
  globalAgentsInstallState = identity(
    {
      installed: false,
    },
    (state) => {
      state.installed = false;
    },
  );
});
//@ chunk-355mdh7x.js:110482-110562 layout
function ejectAxiosProxyInterceptor(interceptorRef) {
  if (interceptorRef.id !== undefined) {
    axios_default.interceptors.request.eject(interceptorRef.id);
    interceptorRef.id = undefined;
  }
}
//@ chunk-355mdh7x.js:110562-110623 layout
var axiosProxyInterceptorRef; // deferred: uses ejectAxiosProxyInterceptor of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-355mdh7x.js:110562", () => {
  axiosProxyInterceptorRef = identity(
    {
      id: undefined,
    },
    (interceptorRef) => {
      ejectAxiosProxyInterceptor(interceptorRef);
      axios_default.defaults.proxy = undefined;
    },
  );
});
//@ chunk-355mdh7x.js:110623-110660 facade-exports
function hasConfiguredGlobalAgents() {
  return axiosProxyInterceptorRef.id !== undefined;
}
//@ chunk-355mdh7x.js:110660-110723 facade-exports
function proxyEnvFingerprint() {
  return ALL_PROXY_ENV_NAMES.map((name) => process.env[name]).join("\x00");
}
//@ chunk-355mdh7x.js:110723-111211 layout
function applyAxiosAgents(config, agentFor) {
  let directRequestAdapter = proxyState().directRequestAdapter;
  if (directRequestAdapter && config.adapter === directRequestAdapter.adapter) config.adapter = undefined;
  if (config.socketPath) return config;
  let uri = axios_default.getUri(config);
  let host = anthropicHostOf(withoutSensitiveHeaders(uri, config.headers));
  if (agentFor && !(uri && shouldBypassProxy(uri))) {
    let agent = agentFor(host);
    return Object.assign(config, {
      httpsAgent: agent,
      httpAgent: agent,
    });
  }
  if (directRequestAdapter) {
    let whyNot = directRequestAdapter.whyNot(config);
    if (whyNot === undefined)
      return Object.assign(config, {
        adapter: directRequestAdapter.adapter,
        httpsAgent: getMTLSAgent(host),
      });
    logForDebugging(
      `An axios ${config.method?.toUpperCase()} request does not go through Bun's fetch: ${whyNot}`,
    );
  }
  return Object.assign(config, {
    httpsAgent: config.httpsAgent ?? getMTLSAgent(host),
  });
}
//@ chunk-355mdh7x.js:111211-111612 facade-exports (2.1.88 match: configureGlobalAgents, 0.68)
function configureGlobalAgents() {
  let proxyUrl = getProxyUrlWithSource();
  let mtlsAgent = getUsableProxyUrl();
  getMTLSAgent();
  applyDefaultCaCertificates();
  ejectAxiosProxyInterceptor(axiosProxyInterceptorRef);
  let hasAllProxy =
    !proxyUrl && (env.all_proxy || env.ALL_PROXY) && !missesHostOwnedEnvWrite(ALL_PROXY_ENV_NAMES);
  axios_default.defaults.proxy = hasAllProxy ? undefined : false;
  let agentFor = mtlsAgent
    ? memoizeAlias(
        (extra) => createHttpsProxyAgent(mtlsAgent, extra),
        (extra) => extra !== undefined,
      )
    : undefined;
  axiosProxyInterceptorRef.id = axios_default.interceptors.request.use((config) =>
    applyAxiosAgents(config, agentFor),
  );
  if (mtlsAgent) {
    if (!globalAgentsInstallState.installed) closeIdleDirectConnections();
    importMetaRequire("undici").setGlobalDispatcher(getCachedProxyAgent(mtlsAgent));
    globalAgentsInstallState.installed = true;
  } else if (globalAgentsInstallState.installed) {
    let undici = importMetaRequire("undici");
    undici.setGlobalDispatcher(new undici.Agent());
    globalAgentsInstallState.installed = false;
  }
}
//@ chunk-355mdh7x.js:111612-111734 facade-exports
function rebuildGlobalAgentsAfterPluginWrite(previousFingerprint) {
  if (proxyEnvFingerprint() === previousFingerprint || !hasConfiguredGlobalAgents()) return;
  let proxyWasOff = axios_default.defaults.proxy === false;
  clearProxyCache();
  try {
    configureGlobalAgents();
  } finally {
    if (proxyWasOff) axios_default.defaults.proxy = false;
  }
}
//@ chunk-355mdh7x.js:111734-111834 facade-exports
/**
 * AWS STS 端点：AWS_ENDPOINT_URL_STS、AWS_ENDPOINT_URL 或 https://sts.<region>.amazonaws.com。
 */
function resolveStsEndpointForProxyUrl(region) {
  return env.AWS_ENDPOINT_URL_STS || env.AWS_ENDPOINT_URL || `https://sts.${region}.amazonaws.com`;
}
//@ chunk-355mdh7x.js:111834-112101 facade-exports
/**
 * 为 AWS SDK 客户端生成走代理的 requestHandler。
 */
async function getAWSClientProxyConfig(options) {
  let awsProxyRequestHandler = await getAWSProxyRequestHandler(options);
  if (!awsProxyRequestHandler) return {};
  let { defaultProvider } = await import("../../vendor/@aws-sdk/credential-provider-node/dist-cjs/index.js");
  return {
    requestHandler: awsProxyRequestHandler,
    credentials: defaultProvider({
      clientConfig: {
        requestHandler: awsProxyRequestHandler,
      },
      parentClientConfig: {
        requestHandler: awsProxyRequestHandler,
        ...(options.region !== undefined && {
          region: options.region,
        }),
      },
    }),
  };
}
//@ chunk-355mdh7x.js:112101-112407 facade-exports (2.1.88 match: getAWSClientProxyConfig, 0.369)
async function getAWSProxyRequestHandler(options) {
  let proxyUrl = getUsableProxyUrl();
  let timeoutOptions = options.requestTimeoutMs !== undefined && {
    requestTimeout: options.requestTimeoutMs,
    throwOnRequestTimeout: true,
  };
  if (!proxyUrl || (options.url && shouldBypassProxy(options.url))) {
    let mtlsAgent = getMTLSAgent();
    if (!mtlsAgent) return null;
    return new nodeModuleInterop.NodeHttpHandler({
      httpsAgent: mtlsAgent,
      ...timeoutOptions,
    });
  }
  let agent = createHttpsProxyAgent(proxyUrl);
  return new nodeModuleInterop.NodeHttpHandler({
    httpAgent: agent,
    httpsAgent: agent,
    ...timeoutOptions,
  });
}
//@ chunk-355mdh7x.js:112407-112472 facade-exports (2.1.88 match: clearProxyCache, 0.766)
function clearProxyCache() {
  proxyState().agents.clear();
  logForDebugging("Cleared proxy agent cache");
}
//@ chunk-7kayq7nc.js:160854-160909 fingerprint (2.1.88 match: createAxiosInstance, 0.566)
function createAxiosInstance() {
  if (!hasAxiosProxyInterceptor()) axios_default.interceptors.request.use(axiosTestEgressInterceptor);
}
//@ chunk-1hnjmk23.js:1312957-1313029 fingerprint (2.1.88 match: getNoProxy, 1)
function getNoProxy_2() {
  return process.env.NO_PROXY || process.env.no_proxy || undefined;
}
export {
  getProxyFetchOptions,
  getProxyUrlWithSource,
  getWebSocketProxyUrl,
  getUsableProxyUrl,
  getNoProxy_2,
  shouldBypassProxy,
  TlsCheckingProxyAgent,
  getAWSProxyRequestHandler,
  configureGlobalAgents,
  noProxyUnion,
  getAWSClientProxyConfig,
  resolveStsEndpointForProxyUrl,
  otelKeptConnectionAgent,
  getProxyUrl,
  parseProxyUrl,
  findProxyError,
  describeHttpStatus,
  getProxyAuthFromHelperCached,
  clearProxyCache,
  getConfiguredProxyAuthHelper,
  disableKeepAlive,
  clearProxyAuthHelperCache,
  getNoProxy,
  proxyEnvFingerprint,
  rebuildGlobalAgentsAfterPluginWrite,
  hasConfiguredGlobalAgents,
  getProxyAuthFromHelper,
  prefetchProxyAuthFromHelperIfSafe,
  _setProxyAuthHelperConfig,
  createConnectProxyAgent,
  proxyTlsOptions,
  describeInvalidProxyUrl,
  ConnectProxyAgent,
};

/**
 * utils/proxy.ts
 *
 * 代理：读取 HTTP(S)_PROXY / NO_PROXY、创建代理 agent（undici/https-proxy-agent）、proxyAuthHelper 生成 Proxy-Authorization、安装全局 dispatcher 与 axios 拦截器、AWS SDK 代理配置。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/proxy.ts
 * pieces: chunk-1ny7cxrt.js (1), chunk-bwbq4xvm.js (1), chunk-hq88884p.js (48)
 * attribution: fingerprint 5, placement 6, layout 16, facade-exports 23
 */
import { isIP } from "net";
import { checkServerIdentity } from "tls";
import { homedir } from "os";
import { __toESM, importMetaRequire } from "../../runtime/bun-runtime.js";
import { require_https_proxy_agent } from "../../vendor/https-proxy-agent/dist/index.js";
import { HostScoped } from "./hostScoped.js";
import { getRootSession, getIsNonInteractiveSession, getProjectConfigRoot } from "../bootstrap/state.js";
import { identity } from "./identity.js";
import { ipInCidr } from "./cidr.js";
import { getMTLSConfig, getTLSFetchOptions, getMTLSAgent } from "./mtls.js";
import { getCACertificates, caListFor, applyDefaultCaCertificates } from "./caCerts.js";
import { env } from "./env.js";
import { isLoopbackHost } from "./localhost.js";
import { logForDebugging } from "./debug.js";
import { safeExecShell } from "./safeSpawn.js";
import { isEnvTruthy, isEnvDefinedFalsy } from "./envUtils.js";
import { axios_default } from "../../vendor/axios/dist/esm/axios.js";
import { anthropicHostOf, withoutSensitiveHeaders, nodeModuleInterop } from "./anthropicHosts.js";
import { memoizeAlias } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { hasAxiosProxyInterceptor, axiosTestEgressInterceptor } from "./testNetworkGuard.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-hq88884p.js:60361-60380 placement
var tlsModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hq88884p.js:60361", () => {
  tlsModule = __toESM(require_https_proxy_agent(), 1);
});
//@ chunk-hq88884p.js:60451-60549 placement
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
//@ chunk-hq88884p.js:60549-60786 placement
/**
 * HTTPS 代理 agent：对 TLS 目标沿用调用方的证书身份检查（按 servername），否则套用代理 TLS 选项。
 */
let TlsCheckingProxyAgent; // deferred: uses tlsModule of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-hq88884p.js:60549", () => {
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
//@ chunk-hq88884p.js:60786-60984 placement
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
//@ chunk-hq88884p.js:60984-61043 placement
/**
 * 描述 HTTP 状态（0 为不可读回复）。
 */
function describeHttpStatus(connectStatus) {
  return connectStatus === 0 ? "unreadable reply" : `HTTP ${connectStatus}`;
}
//@ chunk-hq88884p.js:61043-61184 placement
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
//@ chunk-hq88884p.js:61184-61495 layout
/**
 * CONNECT 代理 agent：代理对 CONNECT 返回非 200 时销毁连接并抛出 ProxyConnectRefusedError（带状态码与响应头）。
 */
let ConnectProxyAgent; // deferred: uses TlsCheckingProxyAgent of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-hq88884p.js:61184", () => {
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
//@ chunk-hq88884p.js:61495-61731 layout
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
}
//@ chunk-hq88884p.js:61731-61756 layout
var proxyStateSlot; // deferred: uses ProxyState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-hq88884p.js:61731", () => {
  proxyStateSlot = new HostScoped(() => new ProxyState());
});
//@ chunk-hq88884p.js:61756-61792 layout
function proxyState() {
  return proxyStateSlot.of(getRootSession().host);
}
//@ chunk-hq88884p.js:61792-61832 facade-exports
function disableKeepAlive() {
  proxyState().keepAliveDisabled = true;
}
//@ chunk-hq88884p.js:61832-62017 fingerprint (2.1.88 match: getAddressFamily, 1)
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
//@ chunk-hq88884p.js:62017-62080 layout
var PROXY_ENV_VARS = ["https_proxy", "HTTPS_PROXY", "http_proxy", "HTTP_PROXY"];
//@ chunk-hq88884p.js:62080-62186 facade-exports
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
//@ chunk-hq88884p.js:62186-62233 facade-exports
function getProxyUrl(env = process.env) {
  return getProxyUrlWithSource(env)?.value;
}
//@ chunk-hq88884p.js:62233-62306 facade-exports
function parseProxyUrl(rawUrl) {
  try {
    let parsed = new URL(rawUrl);
    return parsed.host ? parsed : undefined;
  } catch {
    return;
  }
}
//@ chunk-hq88884p.js:62306-62565 facade-exports
function describeInvalidProxyUrl(source, value) {
  let replaced = value.replace(/\p{Cc}/gu, "");
  return `Invalid proxy URL in ${source}: "${replaced}" cannot be parsed as a URL.
Proxy settings must be a complete URL including the scheme, e.g. "http://proxy.example.com:8080".
Fix or unset ${source} and restart Claude Code.`;
}
//@ chunk-hq88884p.js:62565-62599 layout
var reportedInvalidProxyUrls; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hq88884p.js:62565", () => {
  reportedInvalidProxyUrls = identity(new Set(), (set) => set.clear());
});
//@ chunk-hq88884p.js:62599-62782 facade-exports
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
//@ chunk-hq88884p.js:62782-62872 facade-exports (2.1.88 match: getNoProxy, 1)
function noProxyUnion(env) {
  let { no_proxy: noProxy, NO_PROXY } = env;
  if (noProxy && NO_PROXY && noProxy !== NO_PROXY) return `${noProxy},${NO_PROXY}`;
  return noProxy || NO_PROXY;
}
//@ chunk-hq88884p.js:62872-62962 facade-exports (2.1.88 match: getNoProxy, 1)
function getNoProxy(env = process.env) {
  if (env.no_proxy === "*" || env.NO_PROXY === "*") return "*";
  return noProxyUnion(env);
}
//@ chunk-hq88884p.js:62962-63363 facade-exports (2.1.88 match: shouldBypassProxy, 0.872)
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
//@ chunk-hq88884p.js:63363-63661 layout
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
//@ chunk-hq88884p.js:63661-63830 fingerprint (2.1.88 match: createHttpsProxyAgent, 0.738)
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
//@ chunk-hq88884p.js:63830-64056 facade-exports
function createConnectProxyAgent(proxyUrl, options) {
  let agentOptions = {
    ...options,
    headers: () => {
      let cachedProxyAuthorization = getCachedProxyAuthorization();
      return cachedProxyAuthorization
        ? {
            "Proxy-Authorization": cachedProxyAuthorization,
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
//@ chunk-hq88884p.js:64056-64134 layout
function getCachedProxyAgent(uri) {
  let { agents } = proxyState();
  let agent = agents.get(uri);
  if (!agent) {
    agent = getProxyAgent(uri);
    agents.set(uri, agent);
  }
  return agent;
}
//@ chunk-hq88884p.js:64134-64411 fingerprint (2.1.88 match: getProxyAgent, 1)
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
//@ chunk-hq88884p.js:64411-64520 facade-exports
function getWebSocketProxyUrl(wsUrl) {
  let usableProxyUrl = getUsableProxyUrl();
  if (!usableProxyUrl) return;
  try {
    if (isLoopbackHost(new URL(wsUrl).hostname)) return;
  } catch {}
  if (shouldBypassProxy(wsUrl)) return;
  return usableProxyUrl;
}
//@ chunk-hq88884p.js:64520-64534 layout
var PROXY_AUTH_HELPER_DEFAULT_TTL_MS = 300000;
//@ chunk-hq88884p.js:64534-64578 facade-exports
function _setProxyAuthHelperConfig(proxyAuthHelperConfig) {
  proxyState().proxyAuthHelperConfig = proxyAuthHelperConfig;
}
//@ chunk-hq88884p.js:64578-64683 facade-exports
/**
 * proxyAuthHelper 命令（需 CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER）。
 */
function getConfiguredProxyAuthHelper() {
  if (!env.CLAUDE_CODE_ENABLE_PROXY_AUTH_HELPER) return;
  return proxyState().proxyAuthHelperConfig.helper;
}
//@ chunk-hq88884p.js:64683-64764 layout
function isProxyAuthHelperFromRepo(state) {
  return getConfiguredProxyAuthHelper() !== undefined && state.proxyAuthHelperConfig.fromProjectOrLocal;
}
//@ chunk-hq88884p.js:64764-64862 layout
function getProxyAuthHelperTtl() {
  let CLAUDE_CODE_PROXY_AUTH_HELPER_TTL_MS = env.CLAUDE_CODE_PROXY_AUTH_HELPER_TTL_MS;
  if (CLAUDE_CODE_PROXY_AUTH_HELPER_TTL_MS !== undefined && CLAUDE_CODE_PROXY_AUTH_HELPER_TTL_MS >= 0)
    return CLAUDE_CODE_PROXY_AUTH_HELPER_TTL_MS;
  return PROXY_AUTH_HELPER_DEFAULT_TTL_MS;
}
//@ chunk-hq88884p.js:64862-66260 facade-exports
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
//@ chunk-hq88884p.js:66260-66443 layout
function getCachedProxyAuthorization() {
  let state = proxyState();
  let { helper, readAsHelperStarts } = state.proxyAuthHelperConfig;
  if (
    helper !== undefined &&
    readAsHelperStarts("proxyAuthHelper", helper, () => getProxyUrl()) !== getProxyUrl()
  )
    return null;
  return state.proxyAuthCache?.value ?? null;
}
//@ chunk-hq88884p.js:66443-66521 facade-exports
function clearProxyAuthHelperCache(proxyAuthPendingChallenge) {
  let state = proxyState();
  state.proxyAuthCache = null;
  state.proxyAuthPendingChallenge = proxyAuthPendingChallenge;
}
//@ chunk-hq88884p.js:66521-66627 facade-exports
function prefetchProxyAuthFromHelperIfSafe() {
  if (!getConfiguredProxyAuthHelper()) return;
  let state = proxyState();
  if (isProxyAuthHelperFromRepo(state) && !state.proxyAuthHelperConfig.trustAccepted()) return;
  getProxyAuthFromHelper();
}
//@ chunk-hq88884p.js:66627-67328 facade-exports (2.1.88 match: getProxyFetchOptions, 0.434)
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
    let cachedProxyAuthorization = getCachedProxyAuthorization();
    return {
      ...options,
      proxy: cachedProxyAuthorization
        ? {
            url: proxyUrl,
            headers: {
              "Proxy-Authorization": cachedProxyAuthorization,
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
//@ chunk-hq88884p.js:67328-67376 layout
var globalAgentsInstallState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hq88884p.js:67328", () => {
  globalAgentsInstallState = identity(
    {
      installed: false,
    },
    (state) => {
      state.installed = false;
    },
  );
});
//@ chunk-hq88884p.js:67376-67456 layout
function ejectAxiosProxyInterceptor(axiosProxyInterceptorRef) {
  if (axiosProxyInterceptorRef.id !== undefined) {
    axios_default.interceptors.request.eject(axiosProxyInterceptorRef.id);
    axiosProxyInterceptorRef.id = undefined;
  }
}
//@ chunk-hq88884p.js:67456-67482 layout
var axiosProxyInterceptorRef; // deferred: uses ejectAxiosProxyInterceptor of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-hq88884p.js:67456", () => {
  axiosProxyInterceptorRef = identity(
    {
      id: undefined,
    },
    ejectAxiosProxyInterceptor,
  );
});
//@ chunk-hq88884p.js:67482-67519 facade-exports
function hasConfiguredGlobalAgents() {
  return axiosProxyInterceptorRef.id !== undefined;
}
//@ chunk-hq88884p.js:67519-67743 layout
function applyAxiosAgents(config, agentFor) {
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
  return Object.assign(config, {
    httpsAgent: config.httpsAgent ?? getMTLSAgent(host),
  });
}
//@ chunk-hq88884p.js:67743-68094 facade-exports (2.1.88 match: configureGlobalAgents, 0.752)
/**
 * 启动时安装全局代理：设置 undici 全局 dispatcher 与 axios 请求拦截器，使所有 HTTP 走代理/mTLS。
 */
function configureGlobalAgents() {
  let proxyUrl = getProxyUrlWithSource();
  let mtlsAgent = getUsableProxyUrl();
  getMTLSAgent();
  applyDefaultCaCertificates();
  ejectAxiosProxyInterceptor(axiosProxyInterceptorRef);
  axios_default.defaults.proxy = undefined;
  if (proxyUrl) axios_default.defaults.proxy = false;
  let mtlsProxyAgent = mtlsAgent
    ? memoizeAlias(
        (extra) => createHttpsProxyAgent(mtlsAgent, extra),
        (agent) => agent !== undefined,
      )
    : undefined;
  axiosProxyInterceptorRef.id = axios_default.interceptors.request.use((config) =>
    applyAxiosAgents(config, mtlsProxyAgent),
  );
  if (mtlsAgent) {
    importMetaRequire("undici").setGlobalDispatcher(getCachedProxyAgent(mtlsAgent));
    globalAgentsInstallState.installed = true;
  } else if (globalAgentsInstallState.installed) {
    let undici = importMetaRequire("undici");
    undici.setGlobalDispatcher(new undici.Agent());
    globalAgentsInstallState.installed = false;
  }
}
//@ chunk-hq88884p.js:68094-68194 facade-exports
/**
 * AWS STS 端点：AWS_ENDPOINT_URL_STS、AWS_ENDPOINT_URL 或 https://sts.<region>.amazonaws.com。
 */
function resolveStsEndpointForProxyUrl(region) {
  return env.AWS_ENDPOINT_URL_STS || env.AWS_ENDPOINT_URL || `https://sts.${region}.amazonaws.com`;
}
//@ chunk-hq88884p.js:68194-68461 facade-exports
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
//@ chunk-hq88884p.js:68461-68767 facade-exports (2.1.88 match: getAWSClientProxyConfig, 0.369)
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
//@ chunk-hq88884p.js:68767-68831 facade-exports (2.1.88 match: clearProxyCache, 0.766)
function clearProxyCache() {
  proxyState().agents.clear();
  logForDebugging("Cleared proxy agent cache");
}
//@ chunk-bwbq4xvm.js:161605-161660 fingerprint (2.1.88 match: createAxiosInstance, 0.565)
function createAxiosInstance() {
  if (!hasAxiosProxyInterceptor()) axios_default.interceptors.request.use(axiosTestEgressInterceptor);
}
//@ chunk-1ny7cxrt.js:1312506-1312578 fingerprint (2.1.88 match: getNoProxy, 1)
function getNoProxy_2() {
  return process.env.NO_PROXY || process.env.no_proxy || undefined;
}
export {
  getProxyUrl,
  parseProxyUrl,
  getProxyFetchOptions,
  findProxyError,
  getUsableProxyUrl,
  shouldBypassProxy,
  getAWSProxyRequestHandler,
  resolveStsEndpointForProxyUrl,
  getWebSocketProxyUrl,
  getNoProxy_2,
  TlsCheckingProxyAgent,
  configureGlobalAgents,
  noProxyUnion,
  getProxyUrlWithSource,
  describeHttpStatus,
  clearProxyCache,
  getAWSClientProxyConfig,
  getProxyAuthFromHelper,
  getConfiguredProxyAuthHelper,
  clearProxyAuthHelperCache,
  createConnectProxyAgent,
  proxyTlsOptions,
  describeInvalidProxyUrl,
  disableKeepAlive,
  getNoProxy,
  _setProxyAuthHelperConfig,
  prefetchProxyAuthFromHelperIfSafe,
  ConnectProxyAgent,
  hasConfiguredGlobalAgents,
};

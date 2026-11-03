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
import { Re, importMetaRequire } from "../../runtime/bun-runtime.js";
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
import { io } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { hasAxiosProxyInterceptor, axiosTestEgressInterceptor } from "./testNetworkGuard.js";

//@ chunk-hq88884p.js:60361-60380 placement
var tlsModule = Re(require_https_proxy_agent(), 1);
//@ chunk-hq88884p.js:60451-60549 placement
/**
 * 代理 TLS 的 servername 与主机身份检查选项。
 */
function proxyTlsOptions(e) {
  return !e || isIP(e)
    ? {
        servername: "",
        checkServerIdentity: (r, n) => checkServerIdentity(e, n),
      }
    : {
        servername: e,
      };
}
//@ chunk-hq88884p.js:60549-60786 placement
/**
 * HTTPS 代理 agent：对 TLS 目标沿用调用方的证书身份检查（按 servername），否则套用代理 TLS 选项。
 */
class TlsCheckingProxyAgent extends tlsModule.HttpsProxyAgent {
  connect(...[e, r]) {
    if (!r.secureEndpoint) return super.connect(e, r);
    let n = r.servername || r.host || "";
    let checkServerIdentity = r.checkServerIdentity;
    return super.connect(e, {
      ...r,
      ...(checkServerIdentity
        ? {
            checkServerIdentity: (s, c) => checkServerIdentity(n, c),
          }
        : proxyTlsOptions(n)),
    });
  }
}
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
  for (let r = error, n = 0; n < 4; n++) {
    if (r instanceof ProxyConnectRefusedError) return r;
    if (typeof r !== "object" || r === null || !("cause" in r)) return;
    r = r.cause;
  }
  return;
}
//@ chunk-hq88884p.js:61184-61495 layout
/**
 * CONNECT 代理 agent：代理对 CONNECT 返回非 200 时销毁连接并抛出 ProxyConnectRefusedError（带状态码与响应头）。
 */
class ConnectProxyAgent extends TlsCheckingProxyAgent {
  async connect(...[e, r]) {
    let n;
    let o = (a) => {
      if (a.statusCode !== 200) n = a;
    };
    e.once("proxyConnect", o);
    let s;
    try {
      s = await super.connect(e, r);
    } finally {
      e.removeListener("proxyConnect", o);
    }
    if (n === undefined) return s;
    s.destroy();
    let statusCode = n.statusCode;
    throw new ProxyConnectRefusedError(
      Number.isInteger(statusCode) && statusCode >= 100 && statusCode <= 599 ? statusCode : 0,
      n.headers,
    );
  }
}
//@ chunk-hq88884p.js:61495-61731 layout
class ProxyState {
  keepAliveDisabled = false;
  agents = new Map();
  proxyAuthHelperConfig = {
    helper: undefined,
    fromProjectOrLocal: false,
    trustAccepted: () => false,
    startHelper: (e, r, n) => n(),
    readAsHelperStarts: (e, r, n) => n(),
  };
  proxyAuthCache = null;
  proxyAuthPendingChallenge = undefined;
}
//@ chunk-hq88884p.js:61731-61756 layout
var proxyStateSlot = new HostScoped(() => new ProxyState());
//@ chunk-hq88884p.js:61756-61792 layout
function proxyState() {
  return proxyStateSlot.of(getRootSession().host);
}
//@ chunk-hq88884p.js:61792-61832 facade-exports
function disableKeepAlive() {
  proxyState().keepAliveDisabled = true;
}
//@ chunk-hq88884p.js:61832-62017 fingerprint = getAddressFamily (1)
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
function getProxyUrlWithSource(e = process.env) {
  let found = PROXY_ENV_VARS.find((o) => e[o]);
  let n = found ? e[found] : undefined;
  return found && n
    ? {
        value: n,
        source: found,
      }
    : undefined;
}
//@ chunk-hq88884p.js:62186-62233 facade-exports
function getProxyUrl(env = process.env) {
  return getProxyUrlWithSource(env)?.value;
}
//@ chunk-hq88884p.js:62233-62306 facade-exports
function parseProxyUrl(e) {
  try {
    let r = new URL(e);
    return r.host ? r : undefined;
  } catch {
    return;
  }
}
//@ chunk-hq88884p.js:62306-62565 facade-exports
function describeInvalidProxyUrl(source, r) {
  let replaced = r.replace(/\p{Cc}/gu, "");
  return `Invalid proxy URL in ${source}: "${replaced}" cannot be parsed as a URL.
Proxy settings must be a complete URL including the scheme, e.g. "http://proxy.example.com:8080".
Fix or unset ${source} and restart Claude Code.`;
}
//@ chunk-hq88884p.js:62565-62599 layout
var reportedInvalidProxyUrls = identity(new Set(), (e) => e.clear());
//@ chunk-hq88884p.js:62599-62782 facade-exports
/**
 * 读代理 URL（https_proxy、HTTPS_PROXY、http_proxy、HTTP_PROXY 依次），无法解析时打印一次错误并忽略。
 */
function getUsableProxyUrl(e = process.env) {
  let proxyUrlWithSource = getProxyUrlWithSource(e);
  if (!proxyUrlWithSource) return;
  if (!parseProxyUrl(proxyUrlWithSource.value)) {
    let n = `${proxyUrlWithSource.source}=${proxyUrlWithSource.value}`;
    if (!reportedInvalidProxyUrls.has(n)) {
      reportedInvalidProxyUrls.add(n);
      console.error(describeInvalidProxyUrl(proxyUrlWithSource.source, proxyUrlWithSource.value));
    }
    return;
  }
  return proxyUrlWithSource.value;
}
//@ chunk-hq88884p.js:62782-62872 facade-exports = getNoProxy (1)
function noProxyUnion(env) {
  let { no_proxy: noProxy, NO_PROXY } = env;
  if (noProxy && NO_PROXY && noProxy !== NO_PROXY) return `${noProxy},${NO_PROXY}`;
  return noProxy || NO_PROXY;
}
//@ chunk-hq88884p.js:62872-62962 facade-exports = getNoProxy (1)
function getNoProxy(env = process.env) {
  if (env.no_proxy === "*" || env.NO_PROXY === "*") return "*";
  return noProxyUnion(env);
}
//@ chunk-hq88884p.js:62962-63363 facade-exports = shouldBypassProxy (0.872)
/**
 * 按 NO_PROXY/no_proxy 判断 URL 是否绕过代理（支持 *、域名后缀、端口、IP）。
 */
function shouldBypassProxy(urlString, noProxy = getNoProxy()) {
  if (!noProxy) return false;
  if (noProxy === "*") return true;
  try {
    let url = new URL(urlString);
    let hostname = url.hostname.toLowerCase();
    let s = url.protocol === "https:" || url.protocol === "wss:";
    let c = url.port || (s ? "443" : "80");
    let hostWithPort = `${hostname}:${c}`;
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
  let n;
  try {
    n = new URL(url).hostname.replace(/^\[|\]$/g, "");
  } catch {
    return false;
  }
  if (isIP(n) === 0) return false;
  return noProxy
    .split(/[,\s]+/)
    .filter(Boolean)
    .some((o) => {
      if (o.includes("/")) return ipInCidr(n, o);
      let s = isIP(o);
      if (s === 0) return false;
      return ipInCidr(n, `${o}/${s === 4 ? 32 : 128}`);
    });
}
//@ chunk-hq88884p.js:63661-63830 fingerprint = createHttpsProxyAgent (0.738)
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
  let c = caListFor(extra);
  agentOptions.options = {
    ...agentOptions.options,
    ...(c && {
      ca: c,
    }),
  };
  return agentOptions;
}
//@ chunk-hq88884p.js:63830-64056 facade-exports
function createConnectProxyAgent(proxyUrl, r) {
  let n = {
    ...r,
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
    n.lookup = (hostname, options, callback) => {
      callback(null, hostname, getAddressFamily(options));
    };
  let o = new ConnectProxyAgent(proxyUrl, n);
  o.options = {
    ...o.options,
    ...r,
  };
  return o;
}
//@ chunk-hq88884p.js:64056-64134 layout
function getCachedProxyAgent(uri) {
  let { agents } = proxyState();
  let n = agents.get(uri);
  if (!n) {
    n = getProxyAgent(uri);
    agents.set(uri, n);
  }
  return n;
}
//@ chunk-hq88884p.js:64134-64411 fingerprint = getProxyAgent (1)
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
function getWebSocketProxyUrl(url) {
  let usableProxyUrl = getUsableProxyUrl();
  if (!usableProxyUrl) return;
  try {
    if (isLoopbackHost(new URL(url).hostname)) return;
  } catch {}
  if (shouldBypassProxy(url)) return;
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
function isProxyAuthHelperFromRepo(e) {
  return getConfiguredProxyAuthHelper() !== undefined && e.proxyAuthHelperConfig.fromProjectOrLocal;
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
  let r = proxyState();
  let n = r.proxyAuthHelperConfig.sources === "personAndPolicy";
  if (n && isProxyAuthHelperFromRepo(r)) return null;
  if (
    isProxyAuthHelperFromRepo(r) &&
    !getIsNonInteractiveSession() &&
    !r.proxyAuthHelperConfig.trustAccepted()
  ) {
    logForDebugging(
      "proxyAuthHelper configured in project/local settings but workspace trust not yet accepted \u2014 skipping",
      {
        level: "warn",
      },
    );
    return null;
  }
  let asHelperStarts = r.proxyAuthHelperConfig.readAsHelperStarts(
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
  let proxyAuthPendingChallenge = r.proxyAuthPendingChallenge;
  if (
    !proxyAuthPendingChallenge &&
    r.proxyAuthCache &&
    Date.now() - r.proxyAuthCache.timestamp < getProxyAuthHelperTtl()
  )
    return r.proxyAuthCache.value;
  r.proxyAuthPendingChallenge = undefined;
  let c;
  try {
    c = asHelperStarts ? new URL(asHelperStarts).hostname : undefined;
  } catch {
    c = undefined;
  }
  let a = n ? homedir() : getProjectConfigRoot();
  let u = await r.proxyAuthHelperConfig.startHelper("proxyAuthHelper", configuredProxyAuthHelper, () =>
    safeExecShell(configuredProxyAuthHelper, {
      ...(a !== null && {
        cwd: a,
      }),
      timeout: 30000,
      reject: false,
      useToolMemoryCgroup: false,
      env: {
        ...process.env,
        ...(asHelperStarts && {
          CLAUDE_CODE_PROXY_URL: asHelperStarts,
        }),
        ...(c && {
          CLAUDE_CODE_PROXY_HOST: c,
        }),
        ...(proxyAuthPendingChallenge && {
          CLAUDE_CODE_PROXY_AUTHENTICATE: proxyAuthPendingChallenge,
        }),
      },
    }),
  );
  if (u.failed || !u.stdout?.trim()) {
    let b = u.timedOut ? "timed out" : u.failed ? `exited ${u.exitCode}` : "did not return a value";
    let trimmed = u.stderr?.trim();
    console.error(`proxyAuthHelper failed: ${trimmed ? `${b}: ${trimmed}` : b}`);
    return r.proxyAuthCache?.value ?? null;
  }
  let trimmed = u.stdout.trim();
  r.proxyAuthCache = {
    value: trimmed,
    timestamp: Date.now(),
  };
  return trimmed;
}
//@ chunk-hq88884p.js:66260-66443 layout
function getCachedProxyAuthorization() {
  let e = proxyState();
  let { helper, readAsHelperStarts } = e.proxyAuthHelperConfig;
  if (
    helper !== undefined &&
    readAsHelperStarts("proxyAuthHelper", helper, () => getProxyUrl()) !== getProxyUrl()
  )
    return null;
  return e.proxyAuthCache?.value ?? null;
}
//@ chunk-hq88884p.js:66443-66521 facade-exports
function clearProxyAuthHelperCache(proxyAuthPendingChallenge) {
  let r = proxyState();
  r.proxyAuthCache = null;
  r.proxyAuthPendingChallenge = proxyAuthPendingChallenge;
}
//@ chunk-hq88884p.js:66521-66627 facade-exports
function prefetchProxyAuthFromHelperIfSafe() {
  if (!getConfiguredProxyAuthHelper()) return;
  let e = proxyState();
  if (isProxyAuthHelperFromRepo(e) && !e.proxyAuthHelperConfig.trustAccepted()) return;
  getProxyAuthFromHelper();
}
//@ chunk-hq88884p.js:66627-67328 facade-exports = getProxyFetchOptions (0.434)
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
  let o = opts.forAnthropicAPI && base !== true && (opts.hasBodyIdleWatchdog || base === false);
  let s = {
    ...(proxyState().keepAliveDisabled && {
      keepalive: false,
    }),
    ...(o && {
      timeout: false,
    }),
  };
  if (opts.forAnthropicAPI) {
    let unixSocket = env.ANTHROPIC_UNIX_SOCKET;
    if (unixSocket)
      return {
        ...s,
        unix: unixSocket,
      };
  }
  let proxyUrl = getUsableProxyUrl();
  if (proxyUrl) {
    if (opts.url && shouldBypassProxy(opts.url))
      return {
        ...s,
        ...getTLSFetchOptions(opts.url),
      };
    let cachedProxyAuthorization = getCachedProxyAuthorization();
    return {
      ...s,
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
        ...s,
        ...getTLSFetchOptions(opts.url),
      };
    let tlsFetchOptions = getTLSFetchOptions(opts.url);
    return {
      ...s,
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
    ...s,
    ...getTLSFetchOptions(opts.url),
  };
}
//@ chunk-hq88884p.js:67328-67376 layout
var globalAgentsInstallState = identity(
  {
    installed: false,
  },
  (e) => {
    e.installed = false;
  },
);
//@ chunk-hq88884p.js:67376-67456 layout
function ejectAxiosProxyInterceptor(axiosProxyInterceptorRef) {
  if (axiosProxyInterceptorRef.id !== undefined) {
    axios_default.interceptors.request.eject(axiosProxyInterceptorRef.id);
    axiosProxyInterceptorRef.id = undefined;
  }
}
//@ chunk-hq88884p.js:67456-67482 layout
var axiosProxyInterceptorRef = identity(
  {
    id: undefined,
  },
  ejectAxiosProxyInterceptor,
);
//@ chunk-hq88884p.js:67482-67519 facade-exports
function hasConfiguredGlobalAgents() {
  return axiosProxyInterceptorRef.id !== undefined;
}
//@ chunk-hq88884p.js:67519-67743 layout
function applyAxiosAgents(config, r) {
  if (config.socketPath) return config;
  let uri = axios_default.getUri(config);
  let o = anthropicHostOf(withoutSensitiveHeaders(uri, config.headers));
  if (r && !(uri && shouldBypassProxy(uri))) {
    let s = r(o);
    return Object.assign(config, {
      httpsAgent: s,
      httpAgent: s,
    });
  }
  return Object.assign(config, {
    httpsAgent: config.httpsAgent ?? getMTLSAgent(o),
  });
}
//@ chunk-hq88884p.js:67743-68094 facade-exports = configureGlobalAgents (0.752)
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
  let n = mtlsAgent
    ? io(
        (extra) => createHttpsProxyAgent(mtlsAgent, extra),
        (o) => o !== undefined,
      )
    : undefined;
  axiosProxyInterceptorRef.id = axios_default.interceptors.request.use((config) =>
    applyAxiosAgents(config, n),
  );
  if (mtlsAgent) {
    importMetaRequire("undici").setGlobalDispatcher(getCachedProxyAgent(mtlsAgent));
    globalAgentsInstallState.installed = true;
  } else if (globalAgentsInstallState.installed) {
    let o = importMetaRequire("undici");
    o.setGlobalDispatcher(new o.Agent());
    globalAgentsInstallState.installed = false;
  }
}
//@ chunk-hq88884p.js:68094-68194 facade-exports
/**
 * AWS STS 端点：AWS_ENDPOINT_URL_STS、AWS_ENDPOINT_URL 或 https://sts.<region>.amazonaws.com。
 */
function resolveStsEndpointForProxyUrl(awsRegion) {
  return env.AWS_ENDPOINT_URL_STS || env.AWS_ENDPOINT_URL || `https://sts.${awsRegion}.amazonaws.com`;
}
//@ chunk-hq88884p.js:68194-68461 facade-exports
/**
 * 为 AWS SDK 客户端生成走代理的 requestHandler。
 */
async function getAWSClientProxyConfig(e) {
  let awsProxyRequestHandler = await getAWSProxyRequestHandler(e);
  if (!awsProxyRequestHandler) return {};
  let { defaultProvider } = await import("./chunk-w799qcah.js");
  return {
    requestHandler: awsProxyRequestHandler,
    credentials: defaultProvider({
      clientConfig: {
        requestHandler: awsProxyRequestHandler,
      },
      parentClientConfig: {
        requestHandler: awsProxyRequestHandler,
        ...(e.region !== undefined && {
          region: e.region,
        }),
      },
    }),
  };
}
//@ chunk-hq88884p.js:68461-68767 facade-exports = getAWSClientProxyConfig (0.369)
async function getAWSProxyRequestHandler(e) {
  let proxyUrl = getUsableProxyUrl();
  let n = e.requestTimeoutMs !== undefined && {
    requestTimeout: e.requestTimeoutMs,
    throwOnRequestTimeout: true,
  };
  if (!proxyUrl || (e.url && shouldBypassProxy(e.url))) {
    let mtlsAgent = getMTLSAgent();
    if (!mtlsAgent) return null;
    return new nodeModuleInterop.NodeHttpHandler({
      httpsAgent: mtlsAgent,
      ...n,
    });
  }
  let agent = createHttpsProxyAgent(proxyUrl);
  return new nodeModuleInterop.NodeHttpHandler({
    httpAgent: agent,
    httpsAgent: agent,
    ...n,
  });
}
//@ chunk-hq88884p.js:68767-68831 facade-exports = clearProxyCache (0.766)
function clearProxyCache() {
  proxyState().agents.clear();
  logForDebugging("Cleared proxy agent cache");
}
//@ chunk-1ny7cxrt.js:1312506-1312578 fingerprint = getNoProxy (1)
function getNoProxy_2() {
  return process.env.NO_PROXY || process.env.no_proxy || undefined;
}
//@ chunk-bwbq4xvm.js:161605-161660 fingerprint = createAxiosInstance (0.565)
function createAxiosInstance() {
  if (!hasAxiosProxyInterceptor()) axios_default.interceptors.request.use(axiosTestEgressInterceptor);
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

/**
 * utils/anthropicHosts.ts
 *
 * 2.1.316 新增：Anthropic 相关域名列表；请求头含凭据时返回 undefined（不可缓存/记录）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-hq88884p.js (26)
 * attribution: placement 26
 */
import { __toESM } from "../../runtime/bun-runtime.js";
import { require_node_http_handler } from "../../vendor/@smithy/node-http-handler/dist-cjs/index.js";
import { startupCcrEnv } from "../tasks/RemoteAgentTask/remoteAgentKinds.js";
import { hasSessionIngressAuthToken } from "./sessionIngressAuth.js";
import { getGatewayAuth, isGatewayHostHeldStrict } from "../bootstrap/state.js";
import { computeContentHash } from "./commitAttribution.js";
import { createEnvAccessor } from "./env/envRegistry.js";
import { TLS_ENV_VARS } from "./tlsEnv.js";
import { ENV_PARSERS } from "./envSchema.js";
import { env } from "./env.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-hq88884p.js:25383-25452 placement
/**
 * 判断整串值是否就是 Anthropic API key。
 */
var ANTHROPIC_TOKEN_RE = /^(sk-ant-|sk-[\w-]{86}$)/;
var ANTHROPIC_TOKEN_PARTIAL_RE = /sk-ant-|sk-[\w-]{86}(?![\w-])/;
//@ chunk-hq88884p.js:25452-25498 placement
/**
 * 凭据类请求头名（authorization、x-api-key）。
 */
var CREDENTIAL_HEADER_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hq88884p.js:25452", () => {
  CREDENTIAL_HEADER_NAMES = new Set(["authorization", "x-api-key"]);
});
//@ chunk-hq88884p.js:25498-25560 placement
/**
 * 判断值是否为 Anthropic API key。
 */
function isAnthropicApiKey(value) {
  return typeof value === "string" && ANTHROPIC_TOKEN_RE.test(value.trim());
}
//@ chunk-hq88884p.js:25560-25625 placement
/**
 * 判断值是否形如 fig_ 开头的 JWT。
 */
function isFigJwt(value) {
  return typeof value === "string" && value.startsWith("fig_");
}
//@ chunk-hq88884p.js:25625-25731 placement
/**
 * 头部是否为凭证头且值像令牌。
 */
function isCredentialHeader([headerName, headerValue]) {
  return (
    CREDENTIAL_HEADER_NAMES.has(headerName.trim().toLowerCase()) &&
    isFigJwt(
      String(headerValue)
        .trim()
        .replace(/^bearer\s+/i, ""),
    )
  );
}
//@ chunk-hq88884p.js:25731-25941 placement
/**
 * 请求头含凭据时返回 undefined（不可缓存/记录）。
 */
function withoutSensitiveHeaders(bodyText, headers) {
  try {
    let headerEntries =
      headers === undefined ? [] : Symbol.iterator in headers ? [...headers] : Object.entries(headers);
    return headerEntries.some(isCredentialHeader) ||
      [
        bodyText,
        ...headerEntries.flatMap(([, headerValue]) => [String(headerValue), JSON.stringify(headerValue)]),
      ].some((candidate) => ANTHROPIC_TOKEN_PARTIAL_RE.test(candidate))
      ? undefined
      : bodyText;
  } catch {
    return;
  }
}
//@ chunk-hq88884p.js:25941-25959 placement
/**
 * 惰性加载模块的默认导入包装。
 */
var nodeModuleInterop; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hq88884p.js:25941", () => {
  nodeModuleInterop = __toESM(require_node_http_handler(), 1);
});
//@ chunk-hq88884p.js:26017-26109 placement
/**
 * 匹配 anthropic.com、claude.ai、claude.com 及其子域。
 */
var ANTHROPIC_OWNED_HOST_RE = /(^|\.)(anthropic\.com|claude\.ai|claude\.com)$/i;
var CLAUDE_DOWNLOADS_HOST_RE = /(^|\.)downloads\.claude\.ai$/i;
//@ chunk-hq88884p.js:26109-26266 placement
/**
 * 从 URL 或主机字符串取主机名（去掉末尾点）。
 */
function hostnameOf(input) {
  let hostname;
  let urlText = input.startsWith("//") ? `https:${input}` : input;
  try {
    hostname = new URL(urlText).hostname;
  } catch {
    hostname = input.match(/^[^/:]+/)?.[0] ?? input;
  }
  return hostname.endsWith(".") ? hostname.slice(0, -1) : hostname;
}
//@ chunk-hq88884p.js:26266-26304 placement
/**
 * 主机是否属于 Anthropic 域。
 */
function isAnthropicHost(url) {
  return ANTHROPIC_OWNED_HOST_RE.test(hostnameOf(url));
}
//@ chunk-hq88884p.js:26304-26341 placement
/**
 * 主机是否属于 Anthropic 拥有的域名集合。
 */
function isAnthropicOwnedHost(url) {
  return CLAUDE_DOWNLOADS_HOST_RE.test(hostnameOf(url));
}
//@ chunk-hq88884p.js:26341-27200 placement
/**
 * Anthropic 自有域名的集合。
 */
var ANTHROPIC_DOMAINS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ANTHROPIC_DOMAIN_SET;
var ANTHROPIC_DOMAIN_SUFFIX_HASHES;
deferInit("chunk-hq88884p.js:26341", () => {
  ANTHROPIC_DOMAINS = [
    "ant.dev",
    "anthropic.dev",
    "clau.de",
    "claude-staging.ai",
    "claude.app",
    "claude.dev",
    "claude.site",
    "claudemcpcontent.com",
    "claudeusercontent.com",
    "datadoghq.com",
    "browser-intake-us5-datadoghq.com",
    "amazonaws.com",
    "amazonaws.com.cn",
    "amazonaws.eu",
    "api.aws",
    "api.amazonwebservices.com.cn",
    "api.amazonwebservices.eu",
    "c2s.ic.gov",
    "api.aws.ic.gov",
    "sc2s.sgov.gov",
    "api.aws.scloud",
    "cloud.adc-e.uk",
    "api.cloud-aws.adc-e.uk",
    "csp.hci.ic.gov",
    "api.aws.hci.ic.gov",
    "googleapis.com",
    "azure.com",
    "azure.us",
    "azure.cn",
  ];
  ANTHROPIC_DOMAIN_SET = new Set([
    "claude.fedstart.com",
    "claude-staging.fedstart.com",
    "claude.palantirfedstart.com",
    "claude-staging.palantirfedstart.com",
    "access-claude.palantirfedstart.com",
    "api.interface.feedback",
  ]);
  ANTHROPIC_DOMAIN_SUFFIX_HASHES = new Set([
    "9fe882b0c4259bcf890a100ab941d8299915e50c2e982d9a4dc16a28285894f0",
    "c146462ee17c2c62a74202469d65a9e79e246f7f1b0b9db872e045f6331271c2",
  ]);
});
//@ chunk-hq88884p.js:27200-27242 placement
/**
 * 去掉主机名末尾的点。
 */
function stripTrailingDot(hostname) {
  return hostname.replace(/\.$/, "");
}
//@ chunk-hq88884p.js:27242-27298 placement
/**
 * 解析 URL，失败返回 null。
 */
function parseUrlOrNull(urlText) {
  try {
    return new URL(urlText);
  } catch {
    return null;
  }
}
//@ chunk-hq88884p.js:27298-27363 placement
/**
 * 判断 URL 的主机是否等于给定主机。
 */
function isUrlOnHost(urlText, hostname) {
  let urlOrNull = parseUrlOrNull(urlText);
  return urlOrNull === null || stripTrailingDot(urlOrNull.hostname) === hostname;
}
//@ chunk-hq88884p.js:27363-27464 placement
/**
 * 主机是否为启动时 CCR 会话入口地址。
 */
function isCcrIngressHost(hostname) {
  let atStartup = startupCcrEnv.atStartup;
  return (
    Boolean(atStartup) &&
    isUrlOnHost(atStartup ?? "", hostname) &&
    (startupCcrEnv.isSessionIngressUrlSet || hasSessionIngressAuthToken())
  );
}
//@ chunk-hq88884p.js:27464-27609 placement
/**
 * 主机是否为已认可的网关地址。
 */
function isGatewayHost(hostname) {
  let gatewayAuth = getGatewayAuth();
  return (
    gatewayAuth !== null &&
    (gatewayAuth.vouchedAtLogin === true ||
      (gatewayAuth.hostVerdict !== undefined && "vouched" in gatewayAuth.hostVerdict) ||
      isFigJwt(gatewayAuth.jwt)) &&
    isUrlOnHost(gatewayAuth.url, hostname)
  );
}
//@ chunk-hq88884p.js:27609-27795 placement
/**
 * 主机是否属于 Anthropic（域名列表、哈希列表、CCR、网关）。
 */
function isAnthropicHostname(hostname) {
  let sliced = hostname.split(".").slice(-4);
  return (
    ANTHROPIC_OWNED_HOST_RE.test(hostname) ||
    ANTHROPIC_DOMAIN_SET.has(hostname) ||
    ANTHROPIC_DOMAINS.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`)) ||
    sliced.some((label, labelIndex) =>
      ANTHROPIC_DOMAIN_SUFFIX_HASHES.has(computeContentHash(sliced.slice(labelIndex).join("."))),
    ) ||
    isCcrIngressHost(hostname) ||
    isGatewayHost(hostname) ||
    isGatewayHostHeldStrict(hostname)
  );
}
//@ chunk-hq88884p.js:27795-27902 placement
/**
 * 是否为合法域名形状（非纯数字）。
 */
function isDomainLike(text) {
  let parts = text.split(".");
  return (
    parts.length >= 2 && parts.every((part) => part !== "") && !parts.every((part) => /^\d+$/.test(part))
  );
}
//@ chunk-hq88884p.js:27902-27931 placement
/**
 * 标记“该主机由解析得到”的 Symbol。
 */
var MADE_BY_PARSE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-hq88884p.js:27902", () => {
  MADE_BY_PARSE = Symbol("madeByParse");
});
//@ chunk-hq88884p.js:27931-28105 placement
/**
 * URL 为 Anthropic https/wss 主机时返回主机信息。
 */
function anthropicHostOf(urlText) {
  let parsedUrl = urlText === undefined ? null : parseUrlOrNull(urlText);
  if (parsedUrl === null || !["https:", "wss:"].includes(parsedUrl.protocol)) return;
  let hostname = stripTrailingDot(parsedUrl.hostname);
  return isDomainLike(hostname) && !isAnthropicHostname(hostname)
    ? {
        hostname,
        [MADE_BY_PARSE]: true,
      }
    : undefined;
}
//@ chunk-hq88884p.js:28105-28239 placement
/**
 * CA 证书相关环境变量与访问器。
 */
var CA_ENV_VARS; // deferred: uses createEnvAccessor (./env/envRegistry.js) of its import cycle while loading; runs once the cycle is complete
var CA_ENV;
deferInit("chunk-hq88884p.js:28105", () => {
  CA_ENV_VARS = ["NODE_EXTRA_CA_CERTS", "SSL_CERT_FILE", "SSL_CERT_DIR"];
  CA_ENV = createEnvAccessor(
    Object.fromEntries(
      [...CA_ENV_VARS, ...TLS_ENV_VARS].map((envVarName) => [envVarName, ENV_PARSERS.rawStr()]),
    ),
    null,
  );
});
//@ chunk-hq88884p.js:28239-28333 placement
/**
 * 判断是否设置了自定义 CA 相关环境变量。
 */
function hasCaEnvOverride() {
  return (
    CA_ENV_VARS.some((envVarName) => CA_ENV[envVarName] !== undefined) ||
    TLS_ENV_VARS.some((envVarName) => CA_ENV[envVarName] !== undefined && CA_ENV[envVarName] !== "1")
  );
}
//@ chunk-hq88884p.js:28333-28441 placement
/**
 * 相关环境变量值的指纹串。
 */
function caEnvFingerprint() {
  return TLS_ENV_VARS.map((envVarName) => {
    let envValue = CA_ENV[envVarName];
    return typeof envValue === "string" ? `${envValue.length}:${envValue}` : "";
  }).join(",");
}
//@ chunk-hq88884p.js:28441-28504 placement
/**
 * 是否启用 HTTPS agent 复用（未设置禁用变量）。
 */
function isHttpsAgentKeepingEnabled() {
  return !env.CLAUDE_CODE_DISABLE_HTTPS_AGENT_KEEPING;
}
//@ chunk-hq88884p.js:28504-28542 placement
/**
 * 启用 HTTPS agent 复用时返回 CA 环境变量指纹，否则 undefined。
 */
function caEnvFingerprintIfEnabled() {
  return isHttpsAgentKeepingEnabled() ? caEnvFingerprint() : undefined;
}
export {
  isFigJwt,
  anthropicHostOf,
  withoutSensitiveHeaders,
  nodeModuleInterop,
  caEnvFingerprintIfEnabled,
  isHttpsAgentKeepingEnabled,
  isAnthropicOwnedHost,
  isAnthropicApiKey,
  isAnthropicHost,
  hasCaEnvOverride,
};

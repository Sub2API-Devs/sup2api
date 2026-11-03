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
import { Re } from "../../runtime/bun-runtime.js";
import { require_node_http_handler } from "../../vendor/@smithy/node-http-handler/dist-cjs/index.js";
import { startupCcrEnv } from "../tasks/RemoteAgentTask/remoteAgentKinds.js";
import { hasSessionIngressAuthToken } from "./sessionIngressAuth.js";
import { getGatewayAuth, isGatewayHostHeldStrict } from "../bootstrap/state.js";
import { computeContentHash } from "./commitAttribution.js";
import { createEnvAccessor } from "./env/envRegistry.js";
import { TLS_ENV_VARS } from "./tlsEnv.js";
import { ENV_PARSERS } from "./envSchema.js";
import { env } from "./env.js";

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
var CREDENTIAL_HEADER_NAMES = new Set(["authorization", "x-api-key"]);
//@ chunk-hq88884p.js:25498-25560 placement
/**
 * 判断值是否为 Anthropic API key。
 */
function isAnthropicApiKey(e) {
  return typeof e === "string" && ANTHROPIC_TOKEN_RE.test(e.trim());
}
//@ chunk-hq88884p.js:25560-25625 placement
/**
 * 判断值是否形如 fig_ 开头的 JWT。
 */
function isFigJwt(e) {
  return typeof e === "string" && e.startsWith("fig_");
}
//@ chunk-hq88884p.js:25625-25731 placement
/**
 * 头部是否为凭证头且值像令牌。
 */
function isCredentialHeader([e, r]) {
  return (
    CREDENTIAL_HEADER_NAMES.has(e.trim().toLowerCase()) &&
    isFigJwt(
      String(r)
        .trim()
        .replace(/^bearer\s+/i, ""),
    )
  );
}
//@ chunk-hq88884p.js:25731-25941 placement
/**
 * 请求头含凭据时返回 undefined（不可缓存/记录）。
 */
function withoutSensitiveHeaders(e, r) {
  try {
    let n = r === undefined ? [] : Symbol.iterator in r ? [...r] : Object.entries(r);
    return n.some(isCredentialHeader) ||
      [e, ...n.flatMap(([, o]) => [String(o), JSON.stringify(o)])].some((o) =>
        ANTHROPIC_TOKEN_PARTIAL_RE.test(o),
      )
      ? undefined
      : e;
  } catch {
    return;
  }
}
//@ chunk-hq88884p.js:25941-25959 placement
/**
 * 惰性加载模块的默认导入包装。
 */
var nodeModuleInterop = Re(require_node_http_handler(), 1);
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
function hostnameOf(e) {
  let r;
  let n = e.startsWith("//") ? `https:${e}` : e;
  try {
    r = new URL(n).hostname;
  } catch {
    r = e.match(/^[^/:]+/)?.[0] ?? e;
  }
  return r.endsWith(".") ? r.slice(0, -1) : r;
}
//@ chunk-hq88884p.js:26266-26304 placement
/**
 * 主机是否属于 Anthropic 域。
 */
function isAnthropicHost(e) {
  return ANTHROPIC_OWNED_HOST_RE.test(hostnameOf(e));
}
//@ chunk-hq88884p.js:26304-26341 placement
/**
 * 主机是否属于 Anthropic 拥有的域名集合。
 */
function isAnthropicOwnedHost(e) {
  return CLAUDE_DOWNLOADS_HOST_RE.test(hostnameOf(e));
}
//@ chunk-hq88884p.js:26341-27200 placement
/**
 * Anthropic 自有域名的集合。
 */
var ANTHROPIC_DOMAINS = [
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
var ANTHROPIC_DOMAIN_SET = new Set([
  "claude.fedstart.com",
  "claude-staging.fedstart.com",
  "claude.palantirfedstart.com",
  "claude-staging.palantirfedstart.com",
  "access-claude.palantirfedstart.com",
  "api.interface.feedback",
]);
var ANTHROPIC_DOMAIN_SUFFIX_HASHES = new Set([
  "9fe882b0c4259bcf890a100ab941d8299915e50c2e982d9a4dc16a28285894f0",
  "c146462ee17c2c62a74202469d65a9e79e246f7f1b0b9db872e045f6331271c2",
]);
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
function parseUrlOrNull(e) {
  try {
    return new URL(e);
  } catch {
    return null;
  }
}
//@ chunk-hq88884p.js:27298-27363 placement
/**
 * 判断 URL 的主机是否等于给定主机。
 */
function isUrlOnHost(e, r) {
  let urlOrNull = parseUrlOrNull(e);
  return urlOrNull === null || stripTrailingDot(urlOrNull.hostname) === r;
}
//@ chunk-hq88884p.js:27363-27464 placement
/**
 * 主机是否为启动时 CCR 会话入口地址。
 */
function isCcrIngressHost(e) {
  let atStartup = startupCcrEnv.atStartup;
  return (
    Boolean(atStartup) &&
    isUrlOnHost(atStartup ?? "", e) &&
    (startupCcrEnv.isSessionIngressUrlSet || hasSessionIngressAuthToken())
  );
}
//@ chunk-hq88884p.js:27464-27609 placement
/**
 * 主机是否为已认可的网关地址。
 */
function isGatewayHost(e) {
  let gatewayAuth = getGatewayAuth();
  return (
    gatewayAuth !== null &&
    (gatewayAuth.vouchedAtLogin === true ||
      (gatewayAuth.hostVerdict !== undefined && "vouched" in gatewayAuth.hostVerdict) ||
      isFigJwt(gatewayAuth.jwt)) &&
    isUrlOnHost(gatewayAuth.url, e)
  );
}
//@ chunk-hq88884p.js:27609-27795 placement
/**
 * 主机是否属于 Anthropic（域名列表、哈希列表、CCR、网关）。
 */
function isAnthropicHostname(e) {
  let sliced = e.split(".").slice(-4);
  return (
    ANTHROPIC_OWNED_HOST_RE.test(e) ||
    ANTHROPIC_DOMAIN_SET.has(e) ||
    ANTHROPIC_DOMAINS.some((n) => e === n || e.endsWith(`.${n}`)) ||
    sliced.some((n, o) =>
      ANTHROPIC_DOMAIN_SUFFIX_HASHES.has(computeContentHash(sliced.slice(o).join("."))),
    ) ||
    isCcrIngressHost(e) ||
    isGatewayHost(e) ||
    isGatewayHostHeldStrict(e)
  );
}
//@ chunk-hq88884p.js:27795-27902 placement
/**
 * 是否为合法域名形状（非纯数字）。
 */
function isDomainLike(e) {
  let parts = e.split(".");
  return parts.length >= 2 && parts.every((n) => n !== "") && !parts.every((n) => /^\d+$/.test(n));
}
//@ chunk-hq88884p.js:27902-27931 placement
/**
 * 标记“该主机由解析得到”的 Symbol。
 */
var MADE_BY_PARSE = Symbol("madeByParse");
//@ chunk-hq88884p.js:27931-28105 placement
/**
 * URL 为 Anthropic https/wss 主机时返回主机信息。
 */
function anthropicHostOf(e) {
  let r = e === undefined ? null : parseUrlOrNull(e);
  if (r === null || !["https:", "wss:"].includes(r.protocol)) return;
  let n = stripTrailingDot(r.hostname);
  return isDomainLike(n) && !isAnthropicHostname(n)
    ? {
        hostname: n,
        [MADE_BY_PARSE]: true,
      }
    : undefined;
}
//@ chunk-hq88884p.js:28105-28239 placement
/**
 * CA 证书相关环境变量与访问器。
 */
var CA_ENV_VARS = ["NODE_EXTRA_CA_CERTS", "SSL_CERT_FILE", "SSL_CERT_DIR"];
var CA_ENV = createEnvAccessor(
  Object.fromEntries([...CA_ENV_VARS, ...TLS_ENV_VARS].map((e) => [e, ENV_PARSERS.rawStr()])),
  null,
);
//@ chunk-hq88884p.js:28239-28333 placement
/**
 * 判断是否设置了自定义 CA 相关环境变量。
 */
function hasCaEnvOverride() {
  return (
    CA_ENV_VARS.some((e) => CA_ENV[e] !== undefined) ||
    TLS_ENV_VARS.some((e) => CA_ENV[e] !== undefined && CA_ENV[e] !== "1")
  );
}
//@ chunk-hq88884p.js:28333-28441 placement
/**
 * 相关环境变量值的指纹串。
 */
function caEnvFingerprint() {
  return TLS_ENV_VARS.map((e) => {
    let r = CA_ENV[e];
    return typeof r === "string" ? `${r.length}:${r}` : "";
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

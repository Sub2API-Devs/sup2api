/**
 * utils/anthropicHosts.ts
 *
 * 2.1.316 新增：Anthropic 相关域名列表；请求头含凭据时返回 undefined（不可缓存/记录）等。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-355mdh7x.js (26)
 * attribution: placement 25, layout 1
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

//@ chunk-355mdh7x.js:25404-25473 placement
/**
 * 判断整串值是否就是 Anthropic API key。
 */
var ANTHROPIC_TOKEN_RE = /^(sk-ant-|sk-[\w-]{86}$)/;
var ANTHROPIC_TOKEN_PARTIAL_RE = /sk-ant-|sk-[\w-]{86}(?![\w-])/;
//@ chunk-355mdh7x.js:25473-25519 placement
/**
 * 凭据类请求头名（authorization、x-api-key）。
 */
var CREDENTIAL_HEADER_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-355mdh7x.js:25473", () => {
  CREDENTIAL_HEADER_NAMES = new Set(["authorization", "x-api-key"]);
});
//@ chunk-355mdh7x.js:25519-25581 placement
/**
 * 判断值是否为 Anthropic API key。
 */
function isAnthropicApiKey(value) {
  return typeof value === "string" && ANTHROPIC_TOKEN_RE.test(value.trim());
}
//@ chunk-355mdh7x.js:25581-25646 placement
/**
 * 判断值是否形如 fig_ 开头的 JWT。
 */
function isFigJwt(value) {
  return typeof value === "string" && value.startsWith("fig_");
}
//@ chunk-355mdh7x.js:25646-25752 placement
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
//@ chunk-355mdh7x.js:25752-25962 placement
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
//@ chunk-355mdh7x.js:25962-25980 placement
/**
 * 惰性加载模块的默认导入包装。
 */
var nodeModuleInterop; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-355mdh7x.js:25962", () => {
  nodeModuleInterop = __toESM(require_node_http_handler(), 1);
});
//@ chunk-355mdh7x.js:26038-26130 placement
/**
 * 匹配 anthropic.com、claude.ai、claude.com 及其子域。
 */
var ANTHROPIC_OWNED_HOST_RE = /(^|\.)(anthropic\.com|claude\.ai|claude\.com)$/i;
var CLAUDE_DOWNLOADS_HOST_RE = /(^|\.)downloads\.claude\.ai$/i;
//@ chunk-355mdh7x.js:26130-26287 placement
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
//@ chunk-355mdh7x.js:26287-26325 placement
/**
 * 主机是否属于 Anthropic 域。
 */
function isAnthropicHost(url) {
  return ANTHROPIC_OWNED_HOST_RE.test(hostnameOf(url));
}
//@ chunk-355mdh7x.js:26325-26362 placement
/**
 * 主机是否属于 Anthropic 拥有的域名集合。
 */
function isAnthropicOwnedHost(url) {
  return CLAUDE_DOWNLOADS_HOST_RE.test(hostnameOf(url));
}
//@ chunk-355mdh7x.js:26362-27221 placement
/**
 * Anthropic 自有域名的集合。
 */
var ANTHROPIC_DOMAINS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var ANTHROPIC_DOMAIN_SET;
var ANTHROPIC_DOMAIN_SUFFIX_HASHES;
deferInit("chunk-355mdh7x.js:26362", () => {
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
//@ chunk-355mdh7x.js:27221-27263 placement
/**
 * 去掉主机名末尾的点。
 */
function stripTrailingDot(hostname) {
  return hostname.replace(/\.$/, "");
}
//@ chunk-355mdh7x.js:27263-27319 placement
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
//@ chunk-355mdh7x.js:27319-27384 placement
/**
 * 判断 URL 的主机是否等于给定主机。
 */
function isUrlOnHost(urlText, hostname) {
  let urlOrNull = parseUrlOrNull(urlText);
  return urlOrNull === null || stripTrailingDot(urlOrNull.hostname) === hostname;
}
//@ chunk-355mdh7x.js:27384-27485 placement
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
//@ chunk-355mdh7x.js:27485-27630 placement
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
//@ chunk-355mdh7x.js:27630-27816 placement
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
//@ chunk-355mdh7x.js:27816-27923 placement
/**
 * 是否为合法域名形状（非纯数字）。
 */
function isDomainLike(text) {
  let parts = text.split(".");
  return (
    parts.length >= 2 && parts.every((part) => part !== "") && !parts.every((part) => /^\d+$/.test(part))
  );
}
//@ chunk-355mdh7x.js:27923-27952 placement
/**
 * 标记“该主机由解析得到”的 Symbol。
 */
var MADE_BY_PARSE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-355mdh7x.js:27923", () => {
  MADE_BY_PARSE = Symbol("madeByParse");
});
//@ chunk-355mdh7x.js:27952-28126 placement
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
//@ chunk-355mdh7x.js:28126-59074 layout
var TRUSTED_CERT_FINGERPRINTS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CERT_KEY_BY_SHA256;
deferInit("chunk-355mdh7x.js:28126", () => {
  TRUSTED_CERT_FINGERPRINTS = new Set([
    "01:8E:13:F0:77:25:32:CF:80:9B:D1:B1:72:81:86:72:83:FC:48:C6:E1:3B:E9:C6:98:12:85:4A:49:0C:1B:05",
    "05:52:E6:F8:3F:DF:65:E8:FA:96:70:E6:66:DF:28:A4:E2:13:40:B5:10:CB:E5:25:66:F9:7C:4F:B9:4B:2B:D1",
    "06:C0:8D:7D:AF:D8:76:97:1E:B1:12:4F:E6:7F:84:7E:C0:C7:A1:58:D3:EA:53:CB:E9:40:E2:EA:97:91:F4:C3",
    "08:17:0D:1A:A3:64:53:90:1A:2F:95:92:45:E3:47:DB:0C:8D:37:AB:AA:BC:56:B8:1A:A1:00:DC:95:89:70:DB",
    "09:8E:08:A9:1D:BB:F7:74:78:B9:6C:CE:B8:9B:14:13:A5:DA:37:B7:C8:62:60:6A:95:5D:EB:07:17:9F:43:26",
    "14:35:F2:25:C5:D2:52:D7:A2:19:48:CC:3C:E6:2A:EC:FA:88:00:1E:3D:D7:2D:1C:C3:55:51:00:EB:37:2F:93",
    "17:93:92:7A:06:14:54:97:89:AD:CE:2F:8F:34:F7:F0:B6:6D:0F:3A:E3:A3:B8:4D:21:EC:15:DB:BA:4F:AD:C7",
    "17:9F:BC:14:8A:3D:D0:0F:D2:4E:A1:34:58:CC:43:BF:A7:F5:9C:81:82:D7:83:A5:13:F6:EB:EC:10:0C:89:24",
    "18:CE:6C:FE:7B:F1:4E:60:B2:E3:47:B8:DF:E8:68:CB:31:D0:2E:BB:3A:DA:27:15:69:F5:03:43:B4:6D:B3:A4",
    "19:31:44:F4:31:E0:FD:DB:74:07:17:D4:DE:92:6A:57:11:33:88:4B:43:60:D3:0E:27:29:13:CB:E6:60:CE:41",
    "1B:A5:B2:AA:8C:65:40:1A:82:96:01:18:F8:0B:EC:4F:62:30:4D:83:CE:C4:71:3A:19:C3:9C:01:1E:A4:6D:B4",
    "22:A2:C1:F7:BD:ED:70:4C:C1:E7:01:B5:F4:08:C3:10:88:0F:E9:56:B5:DE:2A:4A:44:F9:9C:87:3A:25:A7:C8",
    "24:2B:69:74:2F:CB:1E:5B:2A:BF:98:89:8B:94:57:21:87:54:4E:5B:4D:99:11:78:65:73:62:1F:6A:74:B8:2C",
    "25:30:CC:8E:98:32:15:02:BA:D9:6F:9B:1F:BA:1B:09:9E:2D:29:9E:0F:45:48:BB:91:4F:36:3B:C0:D4:53:1F",
    "2C:AB:EA:FE:37:D0:6C:A2:2A:BA:73:91:C0:03:3D:25:98:29:52:C4:53:64:73:49:76:3A:3A:B5:AD:6C:CF:69",
    "2C:E1:CB:0B:F9:D2:F9:E1:02:99:3F:BE:21:51:52:C3:B2:DD:0C:AB:DE:1C:68:E5:31:9B:83:91:54:DB:B7:F5",
    "2E:44:10:2A:B5:8C:B8:54:19:45:1C:8E:19:D9:AC:F3:66:2C:AF:BC:61:4B:6A:53:96:0A:30:F7:D0:E2:EB:41",
    "2E:7B:F1:6C:C2:24:85:A7:BB:E2:AA:86:96:75:07:61:B0:AE:39:BE:3B:2F:E9:D0:CC:6D:4E:F7:34:91:42:5C",
    "30:D0:89:5A:9A:44:8A:26:20:91:63:55:22:D1:F5:20:10:B5:86:7A:CA:E1:2C:78:EF:95:8F:D4:F4:38:9F:2F",
    "30:FB:BA:2C:32:23:8E:2A:98:54:7A:F9:79:31:E5:50:42:8B:9B:3F:1C:8E:EB:66:33:DC:FA:86:C5:B2:7D:D3",
    "31:AD:66:48:F8:10:41:38:C7:38:F3:9E:A4:32:01:33:39:3E:3A:18:CC:02:29:6E:F9:7C:2A:C9:EF:67:31:D0",
    "34:17:BB:06:CC:60:07:DA:1B:96:1C:92:0B:8A:B4:CE:3F:AD:82:0E:4A:A3:0B:9A:CB:C4:A7:4E:BD:CE:BC:65",
    "34:9D:FA:40:58:C5:E2:63:12:3B:39:8A:E7:95:57:3C:4E:13:13:C8:3F:E6:8F:93:55:6C:D5:E8:03:1B:3C:7D",
    "34:D8:A7:3E:E2:08:D9:BC:DB:0D:95:65:20:93:4B:4E:40:E6:94:82:59:6E:8B:6F:73:C8:42:6B:01:0A:6F:48",
    "35:8D:F3:9D:76:4A:F9:E1:B7:66:E9:C9:72:DF:35:2E:E1:5C:FA:C2:27:AF:6A:D1:D7:0E:8E:4A:6E:DC:BA:02",
    "37:1A:00:DC:05:33:B3:72:1A:7E:EB:40:E8:41:9E:70:79:9D:2B:0A:0F:2C:1D:80:69:31:65:F7:CE:C4:AD:75",
    "3C:5F:81:FE:A5:FA:B8:2C:64:BF:A2:EA:EC:AF:CD:E8:E0:77:FC:86:20:A7:CA:E5:37:16:3D:F3:6E:DB:F3:78",
    "3F:63:BB:28:14:BE:17:4E:C8:B6:43:9C:F0:8D:6D:56:F0:B7:C4:05:88:3A:56:48:A3:34:42:4D:6B:3E:C5:58",
    "3F:99:CC:47:4A:CF:CE:4D:FE:D5:87:94:66:5E:47:8D:15:47:73:9F:2E:78:0F:1B:B4:CA:9B:13:30:97:D4:01",
    "40:F6:AF:03:46:A9:9A:A1:CD:1D:55:5A:4E:9C:CE:62:C7:F9:63:46:03:EE:40:66:15:83:3D:C8:C8:D0:03:67",
    "44:B5:45:AA:8A:25:E6:5A:73:CA:15:DC:27:FC:36:D2:4C:1C:B9:95:3A:06:65:39:B1:15:82:DC:48:7B:48:33",
    "45:14:0B:32:47:EB:9C:C8:C5:B4:F0:D7:B5:30:91:F7:32:92:08:9E:6E:5A:63:E2:74:9D:D3:AC:A9:19:8E:DA",
    "46:ED:C3:68:90:46:D5:3A:45:3F:B3:10:4A:B8:0D:CA:EC:65:8B:26:60:EA:16:29:DD:7E:86:79:90:64:87:16",
    "49:E7:A4:42:AC:F0:EA:62:87:05:00:54:B5:25:64:B6:50:E4:F4:9E:42:E3:48:D6:AA:38:E0:39:E9:57:B1:C1",
    "4B:00:9C:10:34:49:4F:9A:B5:6B:BA:3B:A1:D6:27:31:FC:4D:20:D8:95:5A:DC:EC:10:A9:25:60:72:61:E3:38",
    "4F:A3:12:6D:8D:3A:11:D1:C4:85:5A:4F:80:7C:BA:D6:CF:91:9D:3A:5A:88:B0:3B:EA:2C:63:72:D9:3C:40:C9",
    "4F:F4:60:D5:4B:9C:86:DA:BF:BC:FC:57:12:E0:40:0D:2B:ED:3F:BC:4D:4F:BD:AA:86:E0:6A:DC:D2:A9:AD:7A",
    "51:3B:2C:EC:B8:10:D4:CD:E5:DD:85:39:1A:DF:C6:C2:DD:60:D8:7B:B7:36:D2:B5:21:48:4A:A4:7A:0E:BE:F6",
    "52:F0:E1:C4:E5:8E:C6:29:29:1B:60:31:7F:07:46:71:B8:5D:7E:A8:0D:5B:07:27:34:63:53:4B:32:B4:02:34",
    "55:2F:7B:DC:F1:A7:AF:9E:6C:E6:72:01:7F:4F:12:AB:F7:72:40:C7:8E:76:1A:C2:03:D1:D9:D2:0A:C8:99:88",
    "55:41:53:B1:3D:2C:F9:DD:B7:53:BF:BE:1A:4E:0A:E0:8D:0A:A4:18:70:58:FE:60:A2:B8:62:B2:E4:B8:7B:CB",
    "55:92:60:84:EC:96:3A:64:B9:6E:2A:BE:01:CE:0B:A8:6A:64:FB:FE:BC:C7:AA:B5:AF:C1:55:B3:7F:D7:60:66",
    "56:8D:69:05:A2:C8:87:08:A4:B3:02:51:90:ED:CF:ED:B1:97:4A:60:6A:13:C6:E5:29:0F:CB:2A:E6:3E:DA:B5",
    "57:4D:F6:93:1E:27:80:39:66:7B:72:0A:FD:C1:60:0F:C2:7E:B6:6D:D3:09:29:79:FB:73:85:64:87:21:28:82",
    "57:8A:F4:DE:D0:85:3F:4E:59:98:DB:4A:EA:F9:CB:EA:8D:94:5F:60:B6:20:A3:8D:1A:3C:13:B2:BC:7B:A8:E1",
    "57:DE:05:83:EF:D2:B2:6E:03:61:DA:99:DA:9D:F4:64:8D:EF:7E:E8:44:1C:3B:72:8A:FA:9B:CD:E0:F9:B2:6A",
    "59:76:90:07:F7:68:5D:0F:CD:50:87:2F:9F:95:D5:75:5A:5B:2B:45:7D:81:F3:69:2B:61:0A:98:67:2F:0E:1B",
    "5A:2F:C0:3F:0C:83:B0:90:BB:FA:40:60:4B:09:88:44:6C:76:36:18:3D:F9:84:6E:17:10:1A:44:7F:B8:EF:D6",
    "5C:58:46:8D:55:F5:8E:49:7E:74:39:82:D2:B5:00:10:B6:D1:65:37:4A:CF:83:A7:D4:A3:2D:B7:68:C4:40:8E",
    "5C:C3:D7:8E:4E:1D:5E:45:54:7A:04:E6:87:3E:64:F9:0C:F9:53:6D:1C:CC:2E:F8:00:F3:55:C4:C5:FD:70:FD",
    "5D:56:49:9B:E4:D2:E0:8B:CF:CA:D0:8A:3E:38:72:3D:50:50:3B:DE:70:69:48:E4:2F:55:60:30:19:E5:28:AE",
    "65:7C:FE:2F:A7:3F:AA:38:46:25:71:F3:32:A2:36:3A:46:FC:E7:02:09:51:71:07:02:CD:FB:B6:EE:DA:33:05",
    "69:72:9B:8E:15:A8:6E:FC:17:7A:57:AF:B7:17:1D:FC:64:AD:D2:8C:2F:CA:8C:F1:50:7E:34:45:3C:CB:14:70",
    "6A:B2:AB:75:F5:1C:B4:F4:F0:15:62:03:FB:F6:F6:46:23:2F:51:4B:E0:59:F6:28:33:30:8B:82:B4:D7:2D:B1",
    "6B:32:80:85:62:53:18:AA:50:D1:73:C9:8D:8B:DA:09:D5:7E:27:41:3D:11:4C:F7:87:A0:F5:D0:6C:03:0C:F6",
    "6B:9C:08:E8:6E:B0:F7:67:CF:AD:65:CD:98:B6:21:49:E5:49:4A:67:F5:84:5E:7B:D1:ED:01:9F:27:B8:6B:D6",
    "6C:61:DA:C3:A2:DE:F0:31:50:6B:E0:36:D2:A6:FE:40:19:94:FB:D1:3D:F9:C8:D4:66:59:92:74:C4:46:EC:98",
    "77:B8:2C:D8:64:4C:43:05:F7:AC:C5:CB:15:6B:45:67:50:04:03:3D:51:C6:0C:62:02:A8:E0:C3:34:67:D3:A0",
    "7B:B6:47:A6:2A:EE:AC:88:BF:25:7A:A5:22:D0:1F:FE:A3:95:E0:AB:45:C7:3F:93:F6:56:54:EC:38:F2:5A:06",
    "7D:05:EB:B6:82:33:9F:8C:94:51:EE:09:4E:EB:FE:FA:79:53:A1:14:ED:B2:F4:49:49:45:2F:AB:7D:2F:C1:85",
    "7E:37:CB:8B:4C:47:09:0C:AB:36:55:1B:A6:F4:5D:B8:40:68:0F:BA:16:6A:95:2D:B1:00:71:7F:43:05:3F:C2",
    "81:A9:08:8E:A5:9F:B3:64:C5:48:A6:F8:55:59:09:9B:6F:04:05:EF:BF:18:E5:32:4E:C9:F4:57:BA:00:11:2F",
    "85:60:F9:1C:36:24:DA:BA:95:70:B5:FE:A0:DB:E3:6F:F1:1A:83:23:BE:94:86:85:4F:B3:F3:4A:55:71:19:8D",
    "85:66:6A:56:2E:E0:BE:5C:E9:25:C1:D8:89:0A:6F:76:A8:7E:C1:6D:4D:7D:5F:29:EA:74:19:CF:20:12:3B:69",
    "88:EF:81:DE:20:2E:B0:18:45:2E:43:F8:64:72:5C:EA:5F:BD:1F:C2:D9:D2:05:73:07:09:C5:D8:B8:69:0F:46",
    "88:F4:38:DC:F8:FF:D1:FA:8F:42:91:15:FF:E5:F8:2A:E1:E0:6E:0C:70:C3:75:FA:AD:71:7B:34:A4:9E:72:65",
    "8A:71:DE:65:59:33:6F:42:6C:26:E5:38:80:D0:0D:88:A1:8D:A4:C6:A9:1F:0D:CB:61:94:E2:06:C5:C9:63:87",
    "8A:86:6F:D1:B2:76:B5:7E:57:8E:92:1C:65:82:8A:2B:ED:58:E9:F2:F2:88:05:41:34:B7:F1:F4:BF:C9:CC:74",
    "8E:82:21:B2:E7:D4:00:78:36:A1:67:2F:0D:CC:29:9C:33:BC:07:D3:16:F1:32:FA:1A:20:6D:58:71:50:F1:CE",
    "8E:CD:E6:88:4F:3D:87:B1:12:5B:A3:1A:C3:FC:B1:3D:70:16:DE:7F:57:CC:90:4F:E1:CB:97:C6:AE:98:19:6E",
    "8F:AF:7D:2E:2C:B4:70:9B:B8:E0:B3:36:66:BF:75:A5:DD:45:B5:DE:48:0F:8E:A8:D4:BF:E6:BE:BC:17:F2:ED",
    "8F:E4:FB:0A:F9:3A:4D:0D:67:DB:0B:EB:B2:3E:37:C7:1B:F3:25:DC:BC:DD:24:0E:A0:4D:AF:58:B4:7E:18:40",
    "91:E2:F5:78:8D:58:10:EB:A7:BA:58:73:7D:E1:54:8A:8E:CA:CD:01:45:98:BC:0B:14:3E:04:1B:17:05:25:52",
    "96:BC:EC:06:26:49:76:F3:74:60:77:9A:CF:28:C5:A7:CF:E8:A3:C0:AA:E1:1A:8F:FC:EE:05:C0:BD:DF:08:C6",
    "9A:11:40:25:19:7C:5B:B9:5D:94:E6:3D:55:CD:43:79:08:47:B6:46:B2:3C:DF:11:AD:A4:A0:0E:FF:15:FB:48",
    "9A:6E:C0:12:E1:A7:DA:9D:BE:34:19:4D:47:8A:D7:C0:DB:18:22:FB:07:1D:F1:29:81:49:6E:D1:04:38:41:13",
    "9A:E3:62:32:A5:18:9F:FD:DB:35:3D:FD:26:52:0C:01:53:95:D2:27:77:DA:C5:9D:B5:7B:98:C0:89:A6:51:E6",
    "9B:EA:11:C9:76:FE:01:47:64:C1:BE:56:A6:F9:14:B5:A5:60:31:7A:BD:99:88:39:33:82:E5:16:1A:A0:49:3C",
    "A0:40:92:9A:02:CE:53:B4:AC:F4:F2:FF:C6:98:1C:E4:49:6F:75:5E:6D:45:FE:0B:2A:69:2B:CD:52:52:3F:36",
    "A1:33:9D:33:28:1A:0B:56:E5:57:D3:D3:2B:1C:E7:F9:36:7E:B0:94:BD:5F:A7:2A:7E:50:04:C8:DE:D7:CA:FE",
    "B0:85:D7:0B:96:4F:19:1A:73:E4:AF:0D:54:AE:7A:0E:07:AA:FD:AF:9B:71:DD:08:62:13:8A:B7:32:5A:24:A2",
    "B2:FA:E5:3E:14:CC:D7:AB:92:12:06:47:01:AE:27:9C:1D:89:88:FA:CB:77:5F:A8:A0:08:91:4E:66:39:88:A8",
    "B4:58:5F:22:E4:AC:75:6A:4E:86:12:A1:36:1C:5D:9D:03:1A:93:FD:84:FE:BB:77:8F:A3:06:8B:0F:C4:2D:C2",
    "B4:91:41:50:2D:00:66:3D:74:0F:2E:7E:C3:40:C5:28:00:96:26:66:12:1A:36:D0:9C:F7:DD:2B:90:38:4F:B4",
    "B6:76:F2:ED:DA:E8:77:5C:D3:6C:B0:F6:3C:D1:D4:60:39:61:F4:9E:62:65:BA:01:3A:2F:03:07:B6:D0:B8:04",
    "BE:4B:56:CB:50:56:C0:13:6A:52:6D:F4:44:50:8D:AA:36:A0:B5:4F:42:E4:AC:38:F7:2A:F4:70:E4:79:65:4C",
    "BE:B0:0B:30:83:9B:9B:C3:2C:32:E4:44:79:05:95:06:41:F2:64:21:B1:5E:D0:89:19:8B:51:8A:E2:EA:1B:99",
    "BF:D8:8F:E1:10:1C:41:AE:3E:80:1B:F8:BE:56:35:0E:E9:BA:D1:A6:B9:BD:51:5E:DC:5C:6D:5B:87:11:AC:44",
    "BF:FF:8F:D0:44:33:48:7D:6A:8A:A6:0C:1A:29:76:7A:9F:C2:BB:B0:5E:42:0F:71:3A:13:B9:92:89:1D:38:93",
    "C0:07:6B:9E:F0:53:1F:B1:A6:56:D6:7C:4E:BE:97:CD:5D:BA:A4:1E:F4:45:98:AC:C2:48:98:78:C9:2D:87:11",
    "C3:2F:FD:9F:46:F9:36:D1:6C:36:73:99:09:59:43:4B:9A:D6:0A:AF:BB:9E:7C:F3:36:54:F1:44:CC:1B:A1:43",
    "C7:41:F7:0F:4B:2A:8D:88:BF:2E:71:C1:41:22:EF:53:EF:10:EB:A0:CF:A5:E6:4C:FA:20:F4:18:85:30:73:E0",
    "C9:0F:26:F0:FB:1B:40:18:B2:22:27:51:9B:5C:A2:B5:3E:2C:A5:B3:BE:5C:F1:8E:FE:1B:EF:47:38:0C:53:83",
    "CB:3C:CB:B7:60:31:E5:E0:13:8F:8D:D3:9A:23:F9:DE:47:FF:C3:5E:43:C1:14:4C:EA:27:D4:6A:5A:B1:CB:5F",
    "CB:B5:22:D7:B7:F1:27:AD:6A:01:13:86:5B:DF:1C:D4:10:2E:7D:07:59:AF:63:5A:7C:F4:72:0D:C9:63:C5:3B",
    "CB:B9:C4:4D:84:B8:04:3E:10:50:EA:31:A6:9F:51:49:55:D7:BF:D2:E2:C6:B4:93:01:01:9A:D6:1D:9F:50:58",
    "D1:3D:B1:29:4C:45:EB:C6:FC:86:C6:BB:F6:9F:A2:9B:DF:E6:92:DF:F7:C7:13:C2:43:C7:A9:56:C6:A2:28:4C",
    "D4:3A:F9:B3:54:73:75:5C:96:84:FC:06:D7:D8:CB:70:EE:5C:28:E7:73:FB:29:4E:B4:1E:E7:17:22:92:4D:24",
    "D4:8D:3D:23:EE:DB:50:A4:59:E5:51:97:60:1C:27:77:4B:9D:7B:18:C9:4D:5A:05:95:11:A1:02:50:B9:31:68",
    "D9:47:43:2A:BD:E7:B7:FA:90:FC:2E:6B:59:10:1B:12:80:E0:E1:C7:E4:E4:0F:A3:C6:88:7F:FF:57:A7:F4:CF",
    "D9:5D:0E:8E:DA:79:52:5B:F9:BE:B1:1B:14:D2:10:0D:32:94:98:5F:0C:62:D9:FA:BD:9C:D9:99:EC:CB:7B:1D",
    "E0:D3:22:6A:EB:11:63:C2:E4:8F:F9:BE:3B:50:B4:C6:43:1B:E7:BB:1E:AC:C5:C3:6B:5D:5E:C5:09:03:9A:08",
    "E2:3D:4A:03:6D:7B:70:E9:F5:95:B1:42:20:79:D2:B9:1E:DF:BB:1F:B6:51:A0:63:3E:AA:8A:9D:C5:F8:07:03",
    "E3:5D:28:41:9E:D0:20:25:CF:A6:90:38:CD:62:39:62:45:8D:A5:C6:95:FB:DE:A3:C2:2B:0B:FB:25:89:70:92",
    "E5:9A:AA:81:60:09:C2:2B:FF:5B:25:BA:D3:7D:F3:06:F0:49:79:7C:1F:81:D8:5A:B0:89:E6:57:BD:8F:00:44",
    "E7:4F:BD:A5:5B:D5:64:C4:73:A3:6B:44:1A:A7:99:C8:A6:8E:07:74:40:E8:28:8B:9F:A1:E5:0E:4B:BA:CA:11",
    "E7:78:F0:F0:95:FE:84:37:29:CD:1A:00:82:17:9E:53:14:A9:C2:91:44:28:05:E1:FB:1D:8F:B6:B8:88:6C:3A",
    "E7:93:C9:B0:2F:D8:AA:13:E2:1C:31:22:8A:CC:B0:81:19:64:3B:74:9C:89:89:64:B1:74:6D:46:C3:D4:CB:D2",
    "EB:C5:57:0C:29:01:8C:4D:67:B1:AA:12:7B:AF:12:F7:03:B4:61:1E:BC:17:B7:DA:B5:57:38:94:17:9B:93:FA",
    "ED:F7:EB:BC:A2:7A:2A:38:4D:38:7B:7D:40:10:C6:66:E2:ED:B4:84:3E:4C:29:B4:AE:1D:5B:93:32:E6:B2:4D",
    "EE:C5:49:6B:98:8C:E9:86:25:B9:34:09:2E:EC:29:08:BE:D0:B0:F3:16:C2:D4:73:0C:84:EA:F1:F3:D3:48:81",
    "EE:C9:97:C0:C3:0F:21:6F:7E:3B:8B:30:7D:2B:AE:42:41:2D:75:3F:C8:21:9D:AF:D1:52:0B:25:72:85:0F:49",
    "EF:C6:5C:AD:BB:59:AD:B6:EF:E8:4D:A2:23:11:B3:56:24:B7:1B:3B:1E:A0:DA:8B:66:55:17:4E:C8:97:86:46",
    "F0:15:CE:3C:C2:39:BF:EF:06:4B:E9:F1:D2:C4:17:E1:A0:26:4A:0A:94:BE:1F:0C:8D:12:18:64:EB:69:49:CC",
    "F3:89:6F:88:FE:7C:0A:88:27:66:A7:FA:6A:D2:74:9F:B5:7A:7F:3E:98:FB:76:9C:1F:A7:B0:9C:2C:44:D5:AE",
    "FB:8F:EC:75:91:69:B9:10:6B:1E:51:16:44:C6:18:C5:13:04:37:3F:6C:06:43:08:8D:8B:EF:FD:1B:99:75:99",
    "FD:73:DA:D3:1C:64:4F:F1:B4:3B:EF:0C:CD:DA:96:71:0B:9C:D9:87:5E:CA:7E:31:70:7A:F3:E9:6D:52:2B:BD",
    "FE:76:96:57:38:55:77:3E:37:A9:5E:7A:D4:D9:CC:96:C3:01:57:C1:5D:31:76:5B:A9:B1:57:04:E1:AE:78:FD",
  ]);
  CERT_KEY_BY_SHA256 = new Map([
    [
      "018e13f0772532cf809bd1b17281867283fc48c6e13be9c69812854a490c1b05",
      {
        key: "a02fafa192c8cb81cb1341554f9c05b71cca2a890b0d1298d683647c961efbdf",
        expires: 2399587199000,
      },
    ],
    [
      "0552e6f83fdf65e8fa9670e666df28a4e21340b510cbe52566f97c4fb94b2bd1",
      {
        key: "ac76f63a46e761b5acc3259705c920cb7f0563d248d8d180f934af68099a15f9",
        expires: 2157008190000,
      },
    ],
    [
      "06c08d7dafd876971eb1124fe67f847ec0c7a158d3ea53cbe940e2ea9791f4c3",
      {
        key: "5628872e245fe66148b80badeac9c40f6252e642fa9595aece4b3e8a58b8fd46",
        expires: 2346903716000,
      },
    ],
    [
      "08170d1aa36453901a2f959245e347db0c8d37abaabc56b81aa100dc958970db",
      {
        key: "9d37e4a989eab3882d116052fc8b58446702cb593726e4604c3795940c7103e2",
        expires: 2054800799000,
      },
    ],
    [
      "098e08a91dbbf77478b96cceb89b1413a5da37b7c862606a955deb07179f4326",
      {
        key: "4c821d7d89adf08c1e951c92b841b4a3c18261b9ce426f337cc0e3805499ba0e",
        expires: 2473844400000,
      },
    ],
    [
      "1435f225c5d252d7a21948cc3ce62aecfa88001e3dd72d1cc3555100eb372f93",
      {
        key: "f0e0b6fbe8b74d4f82d8ed8f8bd6a3d083dc19db3d2cedb1061ccb76d848ee7d",
        expires: 2494213915000,
      },
    ],
    [
      "1793927a0614549789adce2f8f34f7f0b66d0f3ae3a3b84d21ec15dbba4fadc7",
      {
        key: "e7ca91bbfbb18788057b3a8070446ea5291160194102f7dcc3b9848c63cb9cd5",
        expires: 2147471999000,
      },
    ],
    [
      "179fbc148a3dd00fd24ea13458cc43bfa7f59c8182d783a513f6ebec100c8924",
      {
        key: "7e0ead76bb6819dc2f54511a84354f6e8b307b9dd82058ea6c004f01d9dda5df",
        expires: 2147483647000,
      },
    ],
    [
      "18ce6cfe7bf14e60b2e347b8dfe868cb31d02ebb3ada271569f50343b46db3a4",
      {
        key: "36abc32656acfc645c61b71613c4bf21c787f5cabbee48348d58597803d7abc9",
        expires: 2221603200000,
      },
    ],
    [
      "193144f431e0fddb740717d4de926a571133884b4360d30e272913cbe660ce41",
      {
        key: "ebc978ae0dd9e5822d6b19652596f620c93d7caefa952191cb050a632ca9005f",
        expires: 2443604902000,
      },
    ],
    [
      "1ba5b2aa8c65401a82960118f80bec4f62304d83cec4713a19c39c011ea46db4",
      {
        key: "7f4296fc5b6a4e3b35d3c369623e364ab1af381d8fa7121533c9d6c633ea2461",
        expires: 2221603200000,
      },
    ],
    [
      "22a2c1f7bded704cc1e701b5f408c310880fe956b5de2a4a44f99c873a25a7c8",
      {
        key: "348767cdad3bdd28b2b8dd5351aec30c68cec5cd69d276df3827dbc4f5806464",
        expires: 2244305723000,
      },
    ],
    [
      "242b69742fcb1e5b2abf98898b94572187544e5b4d9911786573621f6a74b82c",
      {
        key: "c2b3c31a4a29850aa8f3cf472a1169ff71b416579f6a4482ec7744b83df988ac",
        expires: 2332410954000,
      },
    ],
    [
      "2530cc8e98321502bad96f9b1fba1b099e2d299e0f4548bb914f363bc0d4531f",
      {
        key: "952c2039c0243eb515dd73d83fc3643184874feb0862a9837731ed9b4742e17a",
        expires: 2144305645000,
      },
    ],
    [
      "2cabeafe37d06ca22aba7391c0033d25982952c453647349763a3ab5ad6ccf69",
      {
        key: "682747f8ba621b87cdd3bc295ed5cabce722a1c0c0363d1d68b38928d2787f1e",
        expires: 2049321600000,
      },
    ],
    [
      "2ce1cb0bf9d2f9e102993fbe215152c3b2dd0cabde1c68e5319b839154dbb7f5",
      {
        key: "808d68b3fab4884a5f971ace7d10550d7a95a163774f3ec36afffb213fbe4c74",
        expires: 2145916799000,
      },
    ],
    [
      "2e44102ab58cb85419451c8e19d9acf3662cafbc614b6a53960a30f7d0e2eb41",
      {
        key: "c942262c0c7c0a95bb152b71c42556ddbe9a04fa8378373550d2b7ce27d952a3",
        expires: 2345273876000,
      },
    ],
    [
      "2e7bf16cc22485a7bbe2aa8696750761b0ae39be3b2fe9d0cc6d4ef73491425c",
      {
        key: "7cd67c248f69d83fc2f9bb01dcb1f7ad67a363d046043796d0984c3a231f6bb0",
        expires: 2285086477000,
      },
    ],
    [
      "30d0895a9a448a262091635522d1f52010b5867acae12c78ef958fd4f4389f2f",
      {
        key: "58dd61feb36ea7d258724371709149cb121337864cacb2d0999ad20739d06477",
        expires: 2021046812000,
      },
    ],
    [
      "30fbba2c32238e2a98547af97931e550428b9b3f1c8eeb6633dcfa86c5b27dd3",
      {
        key: "a246b822f96cfecc155156e5476957845492acf32187ec8a2ef12d89618d711d",
        expires: 2321940404000,
      },
    ],
    [
      "31ad6648f8104138c738f39ea4320133393e3a18cc02296ef97c2ac9ef6731d0",
      {
        key: "b94c198300cec5c057ad0727b70bbe91816992256439a7b32f4598119dda9c97",
        expires: 2147169600000,
      },
    ],
    [
      "3417bb06cc6007da1b961c920b8ab4ce3fad820e4aa30b9acbc4a74ebdcebc65",
      {
        key: "a320f4d534d7be97c1ae8dd0499735bc895c323add2d388bfccf662c23d7f99a",
        expires: 2244305643000,
      },
    ],
    [
      "349dfa4058c5e263123b398ae795573c4e1313c83fe68f93556cd5e8031b3c7d",
      {
        key: "9847e5653e5e9e847516e5cb818606aa7544a19be67fd7366d506988e8d84347",
        expires: 2097705600000,
      },
    ],
    [
      "34d8a73ee208d9bcdb0d956520934b4e40e69482596e8b6f73c8426b010a6f48",
      {
        key: "4179edd981ef747477b49626408af43daa2ca7ab7f9e082c1060f84096774348",
        expires: 2097705600000,
      },
    ],
    [
      "358df39d764af9e1b766e9c972df352ee15cfac227af6ad1d70e8e4a6edcba02",
      {
        key: "35f53ce1264611e03340fe37e1ec7d4cc986c5613dca70fd04aa44545f2daf28",
        expires: 2289338164000,
      },
    ],
    [
      "371a00dc0533b3721a7eeb40e8419e70799d2b0a0f2c1d80693165f7cec4ad75",
      {
        key: "6a97b51c8219e93e5dec64bad5806cdeb0f8355be47e757010b702456e01aafd",
        expires: 2399587199000,
      },
    ],
    [
      "3c5f81fea5fab82c64bfa2eaecafcde8e077fc8620a7cae537163df36edbf378",
      {
        key: "616167201433aea6c8e5e3070afcaf6749188f814bd1abb179ae8dad3abf26ec",
        expires: 1893324618000,
      },
    ],
    [
      "3f63bb2814be174ec8b6439cf08d6d56f0b7c405883a5648a334424d6b3ec558",
      {
        key: "06600b94c0318bb6967f0c7787cc8a1032a179c4e95e3c5760b32e290f7fec9b",
        expires: 2458051199000,
      },
    ],
    [
      "3f99cc474acfce4dfed58794665e478d1547739f2e780f1bb4ca9b133097d401",
      {
        key: "fc784300ec8df4d3d1bad763835182918d52a9ff0238bdf695a1cd9bdb98321c",
        expires: 2370596469000,
      },
    ],
    [
      "40f6af0346a99aa1cd1d555a4e9cce62c7f9634603ee406615833dc8c8d00367",
      {
        key: "376a1a7082a593dccc20d561d119e9ab8d30f11cc321d0a37fa41f0df284e01c",
        expires: 2307897000000,
      },
    ],
    [
      "44b545aa8a25e65a73ca15dc27fc36d24c1cb9953a066539b11582dc487b4833",
      {
        key: "bb52086d0639e8db332775ac8f4e8435d92ceb00f4e24f28fc0eabe240772e80",
        expires: 2224665432000,
      },
    ],
    [
      "45140b3247eb9cc8c5b4f0d7b53091f73292089e6e5a63e2749dd3aca9198eda",
      {
        key: "2a8f2d8af0eb123898f74c866ac3fa669054e23c17bc7a95bd0234192dc635d0",
        expires: 2145916799000,
      },
    ],
    [
      "46edc3689046d53a453fb3104ab80dcaec658b2660ea1629dd7e867990648716",
      {
        key: "55e00be277ceb0545299f24fd9f877e2acf32852db43ffcd29bca74b39b4c9fa",
        expires: 2329374355000,
      },
    ],
    [
      "49e7a442acf0ea6287050054b52564b650e4f49e42e348d6aa38e039e957b1c1",
      {
        key: "eca0f181402ce7a8652b31b4d036df247e3a30b7f41a50d91ec4f90b006b43a1",
        expires: 1888562158000,
      },
    ],
    [
      "4b009c1034494f9ab56bba3ba1d62731fc4d20d8955adcec10a925607261e338",
      {
        key: "581cc15821169694c39c2991b53e93ab945a42b076661774c2ecf38a3323acea",
        expires: 2375247979000,
      },
    ],
    [
      "4fa3126d8d3a11d1c4855a4f807cbad6cf919d3a5a88b03bea2c6372d93c40c9",
      {
        key: "ae7f962cb9e6a7dbf7b833fb18fa9b71a89175df949c232b6a9ef7cb3df2bbfc",
        expires: 2405116800000,
      },
    ],
    [
      "4ff460d54b9c86dabfbcfc5712e0400d2bed3fbc4d4fbdaa86e06adcd2a9ad7a",
      {
        key: "2021917e98263945c859c43f1d73cb4139053c414fa03ca3bc7ee88614298f3b",
        expires: 2147471999000,
      },
    ],
    [
      "513b2cecb810d4cde5dd85391adfc6c2dd60d87bb736d2b521484aa47a0ebef6",
      {
        key: "3380709af3b096be3cc2a40548142c0a520028db09e2cb77ae2206616ab6cbb4",
        expires: 1874725239000,
      },
    ],
    [
      "52f0e1c4e58ec629291b60317f074671b85d7ea80d5b07273463534b32b40234",
      {
        key: "82b5f84daf47a59c7ab521e4982aefa40a53406a3aec26039efa6b2e0e7244c1",
        expires: 2147471999000,
      },
    ],
    [
      "552f7bdcf1a7af9e6ce672017f4f12abf77240c78e761ac203d1d9d20ac89988",
      {
        key: "59df317bfa9f4f0ab7ca514d7772296aa2c765b87664d08b96e57399e364729c",
        expires: 2147169600000,
      },
    ],
    [
      "554153b13d2cf9ddb753bfbe1a4e0ae08d0aa4187058fe60a2b862b2e4b87bcb",
      {
        key: "453b74809b69019627f2f843001db5950cdd1d45371053e7f3dfdbc3714113c6",
        expires: 2334217053000,
      },
    ],
    [
      "55926084ec963a64b96e2abe01ce0ba86a64fbfebcc7aab5afc155b37fd76066",
      {
        key: "25d4913cf587097414d29d26f6c1b1942cd6d64eaf45d0fcf81526adba96d324",
        expires: 1916306522000,
      },
    ],
    [
      "568d6905a2c88708a4b3025190edcfedb1974a606a13c6e5290fcb2ae63edab5",
      {
        key: "2b071c59a0a0ae76b0eadb2bad23bad4580b69c3601b630c2eaf0613afa83f92",
        expires: 2145916799000,
      },
    ],
    [
      "574df6931e278039667b720afdc1600fc27eb66dd3092979fb73856487212882",
      {
        key: "cc94a5a0319ff77a4ccadd821c4c59674e44d52816cbd1dfe2c761370ad4d21c",
        expires: 2365125501000,
      },
    ],
    [
      "578af4ded0853f4e5998db4aeaf9cbea8d945f60b620a38d1a3c13b2bc7ba8e1",
      {
        key: "eab0de5a46419010b01b2d55553fc111aa82b43d9395edfeaeaa8c76e6ad1995",
        expires: 2387318399000,
      },
    ],
    [
      "57de0583efd2b26e0361da99da9df4648def7ee8441c3b728afa9bcde0f9b26a",
      {
        key: "3b0d73b4be4a854adc3e51d7ef9fa48aefbb2cdd824d67bdc7d7d09a2abc2d43",
        expires: 2093613727000,
      },
    ],
    [
      "59769007f7685d0fcd50872f9f95d5755a5b2b457d81f3692b610a98672f0e1b",
      {
        key: "c444b5b66ce5d71e1b5e40f27385c95cbfd24a05b56f70cac0992f0f50c3379c",
        expires: 1924963199000,
      },
    ],
    [
      "5a2fc03f0c83b090bbfa40604b0988446c7636183df9846e17101a447fb8efd6",
      {
        key: "2541e53ba5b3b07acbe7097ac4a03e040c11cf7a6d4a67cb213d558b50167a06",
        expires: 2285375386000,
      },
    ],
    [
      "5c58468d55f58e497e743982d2b50010b6d165374acf83a7d4a32db768c4408e",
      {
        key: "aa2630a7b617b04d0a294bab7a8caaa5016e6dbe604837a83a85719fab667eb5",
        expires: 1893413257000,
      },
    ],
    [
      "5cc3d78e4e1d5e45547a04e6873e64f90cf9536d1ccc2ef800f355c4c5fd70fd",
      {
        key: "dd5ed1c090f9f448061baa94a6bb11017544e9eefaa20cc714ce6c633f5dc629",
        expires: 1893380821000,
      },
    ],
    [
      "5d56499be4d2e08bcfcad08a3e38723d50503bde706948e42f55603019e528ae",
      {
        key: "07e854f26a7cbd389927aa041bfef1b6cd21dd143818ad947dc655a9e587fe88",
        expires: 2021047943000,
      },
    ],
    [
      "657cfe2fa73faa38462571f332a2363a46fce7020951710702cdfbb6eeda3305",
      {
        key: "cbad7b1d384849df0946b7ee8e7f5f7ce3aed876fda7bc9d30d8b16f29ff2c53",
        expires: 2275291655000,
      },
    ],
    [
      "69729b8e15a86efc177a57afb7171dfc64add28c2fca8cf1507e34453ccb1470",
      {
        key: "762195c225586ee6c0237456e2107dc54f1efc21f61a792ebd515913cce68332",
        expires: 2231510400000,
      },
    ],
    [
      "6ab2ab75f51cb4f4f0156203fbf6f646232f514be059f62833308b82b4d72db1",
      {
        key: "294679e0f97ffd474f19567b36382394e1b4960e030975e66353452034a3c5ea",
        expires: 2494216354000,
      },
    ],
    [
      "6b328085625318aa50d173c98d8bda09d57e27413d114cf787a0f5d06c030cf6",
      {
        key: "de7b6932e9c44582ce0de07abdab7eea90c75d6d2a07331df57bd5cb88553d13",
        expires: 2310967494000,
      },
    ],
    [
      "6b9c08e86eb0f767cfad65cd98b62149e5494a67f5845e7bd1ed019f27b86bd6",
      {
        key: "149f2ee63b9a5e5803240a770dc991fc2e3445e62831c245a49bc4f1f738ff9c",
        expires: 2206365031000,
      },
    ],
    [
      "6c61dac3a2def031506be036d2a6fe401994fbd13df9c8d466599274c446ec98",
      {
        key: "f48badd7df6a06690d0ae31373b12855f8dedb14517f362a313101cc98cc6b35",
        expires: 1859728101000,
      },
    ],
    [
      "77b82cd8644c4305f7acc5cb156b45675004033d51c60c6202a8e0c33467d3a0",
      {
        key: "3f93f3fcf79d225d213eef6a4a3f5885cf84fe3d7a7a3c11553517688c0e2100",
        expires: 2406153600000,
      },
    ],
    [
      "7bb647a62aeeac88bf257aa522d01ffea395e0ab45c73f93f65654ec38f25a06",
      {
        key: "0e8bb18bbeefb381be21bfc1a206d317298462ad104855f04a0542699708d3d4",
        expires: 2405289599000,
      },
    ],
    [
      "7d05ebb682339f8c9451ee094eebfefa7953a114edb2f44949452fab7d2fc185",
      {
        key: "f1c6ba670cfc88e4df52973cae420f0a089dd474144fe5806c420064e1591229",
        expires: 2147169600000,
      },
    ],
    [
      "7e37cb8b4c47090cab36551ba6f45db840680fba166a952db100717f43053fc2",
      {
        key: "15eed339594b304f8cf847b477371d8d6fec61f4db2b01af589e7c53b35cae4c",
        expires: 2147169600000,
      },
    ],
    [
      "81a9088ea59fb364c548a6f85559099b6f0405efbf18e5324ec9f457ba00112f",
      {
        key: "f7ca77a610e3d42447240692dbd57cfd13cf042acd2062e6a62b87b9ed81c1a7",
        expires: 2249803269000,
      },
    ],
    [
      "8560f91c3624daba9570b5fea0dbe36ff11a8323be9486854fb3f34a5571198d",
      {
        key: "fd371bea9755ff60c8828c849b8e5215de532d61b009855fa0ad630d90eef82e",
        expires: 2283242313000,
      },
    ],
    [
      "85666a562ee0be5ce925c1d8890a6f76a87ec16d4d7d5f29ea7419cf20123b69",
      {
        key: "d1c45377ebdcd618cd1651dc2e02c21d751e5aa9fcd1b3431ff6ecf6a31348fa",
        expires: 2244303579000,
      },
    ],
    [
      "88ef81de202eb018452e43f864725cea5fbd1fc2d9d205730709c5d8b8690f46",
      {
        key: "f3438e23b3ce532522facf307923f58fd18608e9ba7addc30e952b43c49616c3",
        expires: 2273171192000,
      },
    ],
    [
      "88f438dcf8ffd1fa8f429115ffe5f82ae1e06e0c70c375faad717b34a49e7265",
      {
        key: "786ffa578618c3b9a311175e50816f4dda0605c3869f296ebc5943bf09f4e904",
        expires: 2134252799000,
      },
    ],
    [
      "8a71de6559336f426c26e53880d00d88a18da4c6a91f0dcb6194e206c5c96387",
      {
        key: "e06647e52610160c3e83c42d22e39aa8750c584d6c24afaed54a61164742000a",
        expires: 2321940245000,
      },
    ],
    [
      "8a866fd1b276b57e578e921c65828a2bed58e9f2f288054134b7f1f4bfc9cc74",
      {
        key: "86a68f050034126a540d39db2c5f917ef66a94fb9619fa1ecd827cea46ba0cb0",
        expires: 2273160464000,
      },
    ],
    [
      "8e8221b2e7d4007836a1672f0dcc299c33bc07d316f132fa1a206d587150f1ce",
      {
        key: "e753cdd9f13413c7ca9cda82962f8c0ce5ed13d1657312954af5267eb2cb7c79",
        expires: 2157009032000,
      },
    ],
    [
      "8ecde6884f3d87b1125ba31ac3fcb13d7016de7f57cc904fe1cb97c6ae98196e",
      {
        key: "fbe3018031f9586bcbf41727e417b7d1c45c2f47f93be372a17b96b50757d5a2",
        expires: 2147299200000,
      },
    ],
    [
      "8faf7d2e2cb4709bb8e0b33666bf75a5dd45b5de480f8ea8d4bfe6bebc17f2ed",
      {
        key: "2bcf553a66f570900ddd32ba6dfe1ecc06c9182d662dc1b60e1f7b767c2bdd54",
        expires: 2418309261000,
      },
    ],
    [
      "8fe4fb0af93a4d0d67db0bebb23e37c71bf325dcbcdd240ea04daf58b47e1840",
      {
        key: "4a49edbd2f8f8230bd5592b313573fe1c172a45fa98011cc1eddbb36ade3fce5",
        expires: 2273165972000,
      },
    ],
    [
      "91e2f5788d5810eba7ba58737de1548a8ecacd014598bc0b143e041b17052552",
      {
        key: "6106c0e3a0a299831875127bd7d3cc1859803d511cac11eb6e0840dd166fc10e",
        expires: 2011823999000,
      },
    ],
    [
      "96bcec06264976f37460779acf28c5a7cfe8a3c0aae11a8ffcee05c0bddf08c6",
      {
        key: "0b9fa5a59eed715c26c1020c711b4f6ec42d58b0015e14337a39dad301c5afc3",
        expires: 2064567878000,
      },
    ],
    [
      "9a114025197c5bb95d94e63d55cd43790847b646b23cdf11ada4a00eff15fb48",
      {
        key: "5955ae291574a931342cf7450e16652ede1e0fb3097e1571dfac11c915601564",
        expires: 2234853483000,
      },
    ],
    [
      "9a6ec012e1a7da9dbe34194d478ad7c0db1822fb071df12981496ed104384113",
      {
        key: "05570ae6eb0fceb4210e6db79486b7094caf200401e149b6677441b5f25e449b",
        expires: 1924940257000,
      },
    ],
    [
      "9ae36232a5189ffddb353dfd26520c015395d22777dac59db57b98c089a651e6",
      {
        key: "b964e141d3a55cae180ea6a1a8d4a297de26f11833c673569d196fb533a98710",
        expires: 2473943835000,
      },
    ],
    [
      "9bea11c976fe014764c1be56a6f914b5a560317abd9988393382e5161aa0493c",
      {
        key: "1255cabe8152fa64df942f7a47417e29f96c1ce11bf8c84ecbe2815cc1280810",
        expires: 2240524800000,
      },
    ],
    [
      "a040929a02ce53b4acf4f2ffc6981ce4496f755e6d45fe0b2a692bcd52523f36",
      {
        key: "50cc86ba96db3263c79a43ead07553d9f56659e6907e72d8c026637a1cdc85dc",
        expires: 2224663881000,
      },
    ],
    [
      "a1339d33281a0b56e557d3d32b1ce7f9367eb094bd5fa72a7e5004c8ded7cafe",
      {
        key: "6e364b6133deefdcbb21273c5f445a20afbc05038d5b021c0c2153039016345b",
        expires: 2076392610000,
      },
    ],
    [
      "b085d70b964f191a73e4af0d54ae7a0e07aafdaf9b71dd0862138ab7325a24a2",
      {
        key: "08b3a6335fce5ef48f8f0e543986c07fd18a3b1226129f61864bbd5bdd1f1cc9",
        expires: 2147483647000,
      },
    ],
    [
      "b2fae53e14ccd7ab9212064701ae279c1d8988facb775fa8a008914e663988a8",
      {
        key: "608963c78c455e6e34b072468ace0956cff18d34643f9f305b7162fa181979fc",
        expires: 2249803582000,
      },
    ],
    [
      "b4585f22e4ac756a4e8612a1361c5d9d031a93fd84febb778fa3068b0fc42dc2",
      {
        key: "1ef64625daa2e5d433d7449ae31a200d1025e0012a8fecfa70932f8b599b75dd",
        expires: 2406153600000,
      },
    ],
    [
      "b49141502d00663d740f2e7ec340c52800962666121a36d09cf7dd2b90384fb4",
      {
        key: "47487900a1beb9ee08ccbc1116a8ec55f454b638994319f051b984023ced6423",
        expires: 2162988000000,
      },
    ],
    [
      "b676f2eddae8775cd36cb0f63cd1d4603961f49e6265ba013a2f0307b6d0b804",
      {
        key: "6b3b57e9ec88d1bb3d01637ff33c7698b3c9758255e9f01ea9178f3e7f3b2b52",
        expires: 2422427996000,
      },
    ],
    [
      "be4b56cb5056c0136a526df444508daa36a0b54f42e4ac38f72af470e479654c",
      {
        key: "07a2904d4bff9604ea1331ae990e9ffe331232e69ecb8a08cd49d8e34757db41",
        expires: 2410308622000,
      },
    ],
    [
      "beb00b30839b9bc32c32e4447905950641f26421b15ed089198b518ae2ea1b99",
      {
        key: "42431627ea76cc78697f915e3455b1b2ec82ff2f6380ee6423ef3c0840b7e631",
        expires: 2292322026000,
      },
    ],
    [
      "bfd88fe1101c41ae3e801bf8be56350ee9bad1a6b9bd515edc5c6d5b8711ac44",
      {
        key: "92c46879626ef2cc1ecea50c72fb5e385844095f21cbf3b283cb82e6b9fc6a58",
        expires: 1924963199000,
      },
    ],
    [
      "bfff8fd04433487d6a8aa60c1a29767a9fc2bbb05e420f713a13b992891d3893",
      {
        key: "ceb19411c65052c757f941eb826c96941e4d08d096c7db7e7ea3c4f8c13f1a13",
        expires: 2240582399000,
      },
    ],
    [
      "c0076b9ef0531fb1a656d67c4ebe97cd5dbaa41ef44598acc2489878c92d8711",
      {
        key: "f4632e58701c0bd7dafc7e3831355ec433fc13777de286683e8ec50964df0452",
        expires: 2346903715000,
      },
    ],
    [
      "c32ffd9f46f936d16c3673990959434b9ad60aafbb9e7cf33654f144cc1ba143",
      {
        key: "1bf00d5c8f13c094dd17e00504cf0888850f12fd067fa1f92c0fdbf60b86e321",
        expires: 2418309227000,
      },
    ],
    [
      "c741f70f4b2a8d88bf2e71c14122ef53ef10eba0cfa5e64cfa20f418853073e0",
      {
        key: "b2f7298b52bf2c3cac4ddfe72de4d682ac58957595982f2b62301af597c699c5",
        expires: 2289337223000,
      },
    ],
    [
      "c90f26f0fb1b4018b22227519b5ca2b53e2ca5b3be5cf18efe1bef47380c5383",
      {
        key: "b0b56335468561f5bb9fa12d801784a633a572705d34f32b643445dfa8b005d1",
        expires: 2405289599000,
      },
    ],
    [
      "cb3ccbb76031e5e0138f8dd39a23f9de47ffc35e43c1144cea27d46a5ab1cb5f",
      {
        key: "8bb593a93be1d0e8a822bb887c547890c3e706aad2dab76254f97fb36b82fc26",
        expires: 2147169600000,
      },
    ],
    [
      "cbb522d7b7f127ad6a0113865bdf1cd4102e7d0759af635a7cf4720dc963c53b",
      {
        key: "706bb1017c855c59169bad5c1781cf597f12d2cad2f63d1a4aa37493800ffb80",
        expires: 1868522400000,
      },
    ],
    [
      "cbb9c44d84b8043e1050ea31a69f514955d7bfd2e2c6b49301019ad61d9f5058",
      {
        key: "e04a022ce32f4ccf2c7f6046287b828a32a909f5e751447f83fd2c71f6fd8173",
        expires: 2405116800000,
      },
    ],
    [
      "d13db1294c45ebc6fc86c6bbf69fa29bdfe692dff7c713c243c7a956c6a2284c",
      {
        key: "536cfdae8a6257bf14266c43285958d0f9b937e3068e2a215374170133a9ffcc",
        expires: 2473844400000,
      },
    ],
    [
      "d43af9b35473755c9684fc06d7d8cb70ee5c28e773fb294eb41ee71722924d24",
      {
        key: "5c41a73ab2c35dfcd771f6fd6e3e8fac9b469d386cadda56a95b646eb48cca34",
        expires: 2177366400000,
      },
    ],
    [
      "d48d3d23eedb50a459e55197601c27774b9d7b18c94d5a059511a10250b93168",
      {
        key: "8e8046ec4cac015a507ce0d2d0154a4b40e8e42b3165cfa546571435112d17e5",
        expires: 2011768347000,
      },
    ],
    [
      "d947432abde7b7fa90fc2e6b59101b1280e0e1c7e4e40fa3c6887fff57a7f4cf",
      {
        key: "871a9194f4eed5b312ff40c84c1d524aed2f778bbff25f138cf81f680a7adc67",
        expires: 2097705600000,
      },
    ],
    [
      "d95d0e8eda79525bf9beb11b14d2100d3294985f0c62d9fabd9cd999eccb7b1d",
      {
        key: "693c9aa6b245b3b0261637750863eadb6c248a16e52d6f4bc90c86bbf32d7042",
        expires: 2370596137000,
      },
    ],
    [
      "e0d3226aeb1163c2e48ff9be3b50b4c6431be7bb1eacc5c36b5d5ec509039a08",
      {
        key: "8685ad850f7f56cd16943bcb70b434e7356e1b8bdc613406e2ea8de46092b636",
        expires: 2410308619000,
      },
    ],
    [
      "e23d4a036d7b70e9f595b1422079d2b91edfbb1fb651a0633eaa8a9dc5f80703",
      {
        key: "702116ccd8bf23e16466f0e0dba0ed6a239a9c1cd6a8f5a66b39af3595020385",
        expires: 2289374130000,
      },
    ],
    [
      "e35d28419ed02025cfa69038cd623962458da5c695fbdea3c22b0bfb25897092",
      {
        key: "f7ecded5c66047d28ed6466b543c40e0743abe81d109254dcf845d4c2c7853c5",
        expires: 2221603200000,
      },
    ],
    [
      "e59aaa816009c22bff5b25bad37df306f049797c1f81d85ab089e657bd8f0044",
      {
        key: "603f76f28c9feba83ec751edb66c8d7523ea40fe49fe74427629f50dabbcf55a",
        expires: 2054799899000,
      },
    ],
    [
      "e74fbda55bd564c473a36b441aa799c8a68e077440e8288b9fa1e50e4bbaca11",
      {
        key: "3329bfa13b6007ab5fc3713f0acb289426e2fbc99cc5c110a914b139571600b6",
        expires: 2147404528000,
      },
    ],
    [
      "e778f0f095fe843729cd1a0082179e5314a9c291442805e1fb1d8fb6b8886c3a",
      {
        key: "f0011f92fcf9be36c7a5b36e7bc862ab20e94ef36fea8a561db0a8d7750c1f51",
        expires: 2375253176000,
      },
    ],
    [
      "e793c9b02fd8aa13e21c31228accb08119643b749c898964b1746d46c3d4cbd2",
      {
        key: "c784333d20bcd742b9fdc3236f4e509b8937070e73067e254dd3bf9c45bf4dde",
        expires: 2147471999000,
      },
    ],
    [
      "ebc5570c29018c4d67b1aa127baf12f703b4611ebc17b7dab5573894179b93fa",
      {
        key: "2fc5667a4b9a2678ed6ac6ad25465fcbf6094bfcd9504097c7a8fa47ade5e888",
        expires: 1893456000000,
      },
    ],
    [
      "edf7ebbca27a2a384d387b7d4010c666e2edb4843e4c29b4ae1d5b9332e6b24d",
      {
        key: "b03d87b056d08cc9d4e675ef19ca83ab53532168a8258598be72e6d85c7dd7c1",
        expires: 2234852938000,
      },
    ],
    [
      "eec5496b988ce98625b934092eec2908bed0b0f316c2d4730c84eaf1f3d34881",
      {
        key: "ff342fb6c4c8bd30a4706f73489539f19e6e48cc05f46254654f6610dbc540e9",
        expires: 1888563046000,
      },
    ],
    [
      "eec997c0c30f216f7e3b8b307d2bae42412d753fc8219dafd1520b2572850f49",
      {
        key: "d439dd80f1e3bc5c9e5f13e8bff7a8887df9dc1c3e19d76af70c8f8d985eef22",
        expires: 2473944147000,
      },
    ],
    [
      "efc65cadbb59adb6efe84da22311b35624b71b3b1ea0da8b6655174ec8978646",
      {
        key: "0e05e9bb23869eb689dc56839dcec475a3ae75fa6b50bc5a4978360cbe673323",
        expires: 2468966399000,
      },
    ],
    [
      "f015ce3cc239bfef064be9f1d2c417e1a0264a0a94be1f0c8d121864eb6949cc",
      {
        key: "79caaf5347e6e4a94c8e78a98496fc74020f809ede13f220fab6104c8ded329f",
        expires: 2145887999000,
      },
    ],
    [
      "f3896f88fe7c0a882766a7fa6ad2749fb57a7f3e98fb769c1fa7b09c2c44d5ae",
      {
        key: "ebc55f21e88d49ede81c0075ab08b3c73b81f0f33e37d7641a1d01b6e602dc9d",
        expires: 2365125377000,
      },
    ],
    [
      "fb8fec759169b9106b1e511644c618c51304373f6c0643088d8beffd1b997599",
      {
        key: "9a52ff6a3cb6e353a08567e0dc9c395b300d60a22292ab8c18c1656b2983ae90",
        expires: 2198311238000,
      },
    ],
    [
      "fd73dad31c644ff1b43bef0ccdda96710b9cd9875eca7e31707af3e96d522bbd",
      {
        key: "8d767764b3cbda08929d072a22a561f4dcdd1bc57d3cbddc948c47d2b47f9122",
        expires: 2011823999000,
      },
    ],
    [
      "fe7696573855773e37a95e7ad4d9cc96c30157c15d31765ba9b15704e1ae78fd",
      {
        key: "681dc482c296c8402c6ebb20e68309a3bc846523ae34b984a84ee697a3312db7",
        expires: 2310120613000,
      },
    ],
  ]);
});
//@ chunk-355mdh7x.js:59074-59208 placement
/**
 * CA 证书相关环境变量与访问器。
 */
var CA_ENV_VARS; // deferred: uses createEnvAccessor (./env/envRegistry.js) of its import cycle while loading; runs once the cycle is complete
var CA_ENV;
deferInit("chunk-355mdh7x.js:59074", () => {
  CA_ENV_VARS = ["NODE_EXTRA_CA_CERTS", "SSL_CERT_FILE", "SSL_CERT_DIR"];
  CA_ENV = createEnvAccessor(
    Object.fromEntries(
      [...CA_ENV_VARS, ...TLS_ENV_VARS].map((envVarName) => [envVarName, ENV_PARSERS.rawStr()]),
    ),
    null,
  );
});
//@ chunk-355mdh7x.js:59208-59302 placement
/**
 * 判断是否设置了自定义 CA 相关环境变量。
 */
function hasCaEnvOverride() {
  return (
    CA_ENV_VARS.some((envVarName) => CA_ENV[envVarName] !== undefined) ||
    TLS_ENV_VARS.some((envVarName) => CA_ENV[envVarName] !== undefined && CA_ENV[envVarName] !== "1")
  );
}
//@ chunk-355mdh7x.js:59302-59365 placement
/**
 * 是否启用 HTTPS agent 复用（未设置禁用变量）。
 */
function isHttpsAgentKeepingEnabled() {
  return !env.CLAUDE_CODE_DISABLE_HTTPS_AGENT_KEEPING;
}
//@ chunk-355mdh7x.js:59365-59488 placement
/**
 * 相关环境变量值的指纹串。
 */
function caEnvFingerprint() {
  if (!isHttpsAgentKeepingEnabled()) return;
  return TLS_ENV_VARS.map((envVarName) => {
    let envValue = CA_ENV[envVarName];
    return typeof envValue === "string" ? `${envValue.length}:${envValue}` : "";
  }).join(",");
}
export {
  withoutSensitiveHeaders,
  caEnvFingerprint,
  anthropicHostOf,
  nodeModuleInterop,
  isHttpsAgentKeepingEnabled,
  CERT_KEY_BY_SHA256,
  hasCaEnvOverride,
  TRUSTED_CERT_FINGERPRINTS,
  isAnthropicOwnedHost,
  isAnthropicHost,
  isFigJwt,
  isAnthropicApiKey,
};

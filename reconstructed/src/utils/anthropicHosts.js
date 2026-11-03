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
import { E$ } from "../../vendor/@smithy/node-http-handler/dist-cjs/index.js";
import { startupCcrEnv } from "../tasks/RemoteAgentTask/remoteAgentKinds.js";
import { hasSessionIngressAuthToken } from "./sessionIngressAuth.js";
import { getGatewayAuth, isGatewayHostHeldStrict } from "../bootstrap/state.js";
import { computeContentHash } from "./commitAttribution.js";
import { createEnvAccessor } from "./env/envRegistry.js";
import { ide } from "./tlsEnv.js";
import { ENV_PARSERS } from "./envSchema.js";
import { env } from "./env.js";

//@ chunk-hq88884p.js:25383-25452 placement
var Qr = /^(sk-ant-|sk-[\w-]{86}$)/,
  Jr = /sk-ant-|sk-[\w-]{86}(?![\w-])/;
//@ chunk-hq88884p.js:25452-25498 placement
var Zr = new Set(["authorization", "x-api-key"]);
//@ chunk-hq88884p.js:25498-25560 placement
function DIi(e) {
  return typeof e === "string" && Qr.test(e.trim());
}
//@ chunk-hq88884p.js:25560-25625 placement
function fSr(e) {
  return typeof e === "string" && e.startsWith("fig_");
}
/**
 * 头部是否为凭证头且值像令牌。
 */
//@ chunk-hq88884p.js:25625-25731 placement
function isCredentialHeader([e, r]) {
  return (
    Zr.has(e.trim().toLowerCase()) &&
    fSr(
      String(r)
        .trim()
        .replace(/^bearer\s+/i, ""),
    )
  );
}
/**
 * 请求头含凭据时返回 undefined（不可缓存/记录）。
 */
//@ chunk-hq88884p.js:25731-25941 placement
function withoutSensitiveHeaders(e, r) {
  try {
    let n = r === void 0 ? [] : Symbol.iterator in r ? [...r] : Object.entries(r);
    return n.some(isCredentialHeader) ||
      [e, ...n.flatMap(([, o]) => [String(o), JSON.stringify(o)])].some((o) => Jr.test(o))
      ? void 0
      : e;
  } catch {
    return;
  }
}
//@ chunk-hq88884p.js:25941-25959 placement
var Ge = Re(E$(), 1);
//@ chunk-hq88884p.js:26017-26109 placement
var Le = /(^|\.)(anthropic\.com|claude\.ai|claude\.com)$/i,
  bn = /(^|\.)downloads\.claude\.ai$/i;
/**
 * 从 URL 或主机字符串取主机名（去掉末尾点）。
 */
//@ chunk-hq88884p.js:26109-26266 placement
function hostnameOf(e) {
  let r,
    n = e.startsWith("//") ? `https:${e}` : e;
  try {
    r = new URL(n).hostname;
  } catch {
    r = e.match(/^[^/:]+/)?.[0] ?? e;
  }
  return r.endsWith(".") ? r.slice(0, -1) : r;
}
/**
 * 主机是否属于 Anthropic 域。
 */
//@ chunk-hq88884p.js:26266-26304 placement
function isAnthropicHost(e) {
  return Le.test(hostnameOf(e));
}
/**
 * 主机是否属于 Anthropic 拥有的域名集合。
 */
//@ chunk-hq88884p.js:26304-26341 placement
function isAnthropicOwnedHost(e) {
  return bn.test(hostnameOf(e));
}
/**
 * Anthropic 相关域名列表。
 */
//@ chunk-hq88884p.js:26341-27200 placement
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
  ],
  En = new Set([
    "claude.fedstart.com",
    "claude-staging.fedstart.com",
    "claude.palantirfedstart.com",
    "claude-staging.palantirfedstart.com",
    "access-claude.palantirfedstart.com",
    "api.interface.feedback",
  ]),
  An = new Set([
    "9fe882b0c4259bcf890a100ab941d8299915e50c2e982d9a4dc16a28285894f0",
    "c146462ee17c2c62a74202469d65a9e79e246f7f1b0b9db872e045f6331271c2",
  ]);
//@ chunk-hq88884p.js:27200-27242 placement
function yt(e) {
  return e.replace(/\.$/, "");
}
//@ chunk-hq88884p.js:27242-27298 placement
function Ct(e) {
  try {
    return new URL(e);
  } catch {
    return null;
  }
}
//@ chunk-hq88884p.js:27298-27363 placement
function bt(e, r) {
  let n = Ct(e);
  return n === null || yt(n.hostname) === r;
}
/**
 * 主机是否为启动时 CCR 会话入口地址。
 */
//@ chunk-hq88884p.js:27363-27464 placement
function isCcrIngressHost(e) {
  let atStartup = startupCcrEnv.atStartup;
  return (
    Boolean(atStartup) &&
    bt(atStartup ?? "", e) &&
    (startupCcrEnv.isSessionIngressUrlSet || hasSessionIngressAuthToken())
  );
}
/**
 * 主机是否为已认可的网关地址。
 */
//@ chunk-hq88884p.js:27464-27609 placement
function isGatewayHost(e) {
  let r = getGatewayAuth();
  return (
    r !== null &&
    (r.vouchedAtLogin === !0 || (r.hostVerdict !== void 0 && "vouched" in r.hostVerdict) || fSr(r.jwt)) &&
    bt(r.url, e)
  );
}
/**
 * 主机是否属于 Anthropic（域名列表、哈希列表、CCR、网关）。
 */
//@ chunk-hq88884p.js:27609-27795 placement
function isAnthropicHostname(e) {
  let sliced = e.split(".").slice(-4);
  return (
    Le.test(e) ||
    En.has(e) ||
    ANTHROPIC_DOMAINS.some((n) => e === n || e.endsWith(`.${n}`)) ||
    sliced.some((n, o) => An.has(computeContentHash(sliced.slice(o).join(".")))) ||
    isCcrIngressHost(e) ||
    isGatewayHost(e) ||
    isGatewayHostHeldStrict(e)
  );
}
/**
 * 是否为合法域名形状（非纯数字）。
 */
//@ chunk-hq88884p.js:27795-27902 placement
function isDomainLike(e) {
  let parts = e.split(".");
  return parts.length >= 2 && parts.every((n) => n !== "") && !parts.every((n) => /^\d+$/.test(n));
}
//@ chunk-hq88884p.js:27902-27931 placement
var vn = Symbol("madeByParse");
/**
 * URL 为 Anthropic https/wss 主机时返回主机信息。
 */
//@ chunk-hq88884p.js:27931-28105 placement
function anthropicHostOf(e) {
  let r = e === void 0 ? null : Ct(e);
  if (r === null || !["https:", "wss:"].includes(r.protocol)) return;
  let n = yt(r.hostname);
  return isDomainLike(n) && !isAnthropicHostname(n) ? { hostname: n, [vn]: !0 } : void 0;
}
/**
 * CA 证书相关环境变量与访问器。
 */
//@ chunk-hq88884p.js:28105-28239 placement
var CA_ENV_VARS = ["NODE_EXTRA_CA_CERTS", "SSL_CERT_FILE", "SSL_CERT_DIR"],
  CA_ENV = createEnvAccessor(
    Object.fromEntries([...CA_ENV_VARS, ...ide].map((e) => [e, ENV_PARSERS.rawStr()])),
    null,
  );
//@ chunk-hq88884p.js:28239-28333 placement
function me() {
  return (
    CA_ENV_VARS.some((e) => CA_ENV[e] !== void 0) ||
    ide.some((e) => CA_ENV[e] !== void 0 && CA_ENV[e] !== "1")
  );
}
/**
 * 相关环境变量值的指纹串。
 */
//@ chunk-hq88884p.js:28333-28441 placement
function caEnvFingerprint() {
  return ide
    .map((e) => {
      let r = CA_ENV[e];
      return typeof r === "string" ? `${r.length}:${r}` : "";
    })
    .join(",");
}
//@ chunk-hq88884p.js:28441-28504 placement
function ke() {
  return !env.CLAUDE_CODE_DISABLE_HTTPS_AGENT_KEEPING;
}
//@ chunk-hq88884p.js:28504-28542 placement
function oe() {
  return ke() ? caEnvFingerprint() : void 0;
}

export {
  fSr,
  anthropicHostOf,
  withoutSensitiveHeaders,
  Ge,
  oe,
  ke,
  isAnthropicOwnedHost,
  DIi,
  isAnthropicHost,
  me,
};

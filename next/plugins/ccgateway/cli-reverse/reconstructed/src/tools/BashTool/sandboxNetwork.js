/**
 * tools/BashTool/sandboxNetwork.ts
 *
 * 2.1.316 新增：沙箱网络域名条目校验
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (19)
 * attribution: placement 19
 */
import { isIP } from "net";
import { getSessionFeatureValues } from "../../bootstrap/sessionFeatureValues.js";
import { getFeatureValue_SESSION_PINNED } from "../../services/analytics/growthbook.js";
import { TENGU_FLICKERING_RAIN } from "../../utils/permissions/serverClassifier/arbiter.js";
import {
  SandboxManager,
  isScrubOnlySandboxMode,
  isStrictPortSuffix,
  isSrtHostNameCharset,
  canonicalizationChangesHost,
  perCommandAllowsWithheld,
} from "../../utils/sandbox/sandbox-adapter.js";
import { alwaysFalseFlag, alwaysFalseLocal } from "../RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { isClassifierSideCallRetired } from "../../utils/permissions/serverClassifier/flags.js";
import { splitDomainPatternPort } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/domain-pattern.js";
import { isIpv4MappedOrTranslatedIpv6 } from "../../utils/network/privateHostCheck.js";
import { stringSchema, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { readUntrustedArrayOrUndefined } from "../../utils/untrustedArray.js";
import { isAutoModePermissionSurface } from "../../utils/permissions/autoModeState.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1042347-1042544 placement
/**
 * 判断是否向命令提供按命令的网络白名单（allowed_domains）：开关 tengu_flickering_rain 开启、沙箱已启用且非仅清理模式、沙箱管理器支持注册；结果按会话缓存。
 */
function areCommandNetworkListsOffered_2() {
  let sessionFeatureValues = getSessionFeatureValues();
  sessionFeatureValues.commandNetworkListsOffered ??=
    getFeatureValue_SESSION_PINNED(TENGU_FLICKERING_RAIN, true) &&
    SandboxManager.isSandboxingEnabled() &&
    !isScrubOnlySandboxMode() &&
    !alwaysFalseFlag() &&
    typeof SandboxManager.registerCommandNetworkLists === "function";
  return sessionFeatureValues.commandNetworkListsOffered;
}
//@ chunk-e6aww6q8.js:1042544-1042572 placement
/**
 * 判断本次会话是否允许命令级网络白名单（allowed_domains）。
 */
function areCommandNetworkListsOffered() {
  return areCommandNetworkListsOffered_2();
}
//@ chunk-e6aww6q8.js:1042572-1042701 placement
var NOT_IN_COMMAND_DOMAINS = {
  allow: false,
  reason:
    "not in this command's allowed_domains \u2014 re-run the command with this host listed if it needs it",
};
//@ chunk-e6aww6q8.js:1042701-1042755 placement
/**
 * 宿主要求确认、且给定域名不在沙箱允许域名内时返回拒绝原因。
 */
function commandDomainDenyReason() {
  return SandboxManager.askCallbackDenyReason ? NOT_IN_COMMAND_DOMAINS : false;
}
//@ chunk-e6aww6q8.js:1042755-1042879 placement
var NOT_IN_SANDBOX_DOMAINS = {
  allow: false,
  reason: "not in the sandbox's allowed domains, and auto mode does not approve connections to other hosts",
};
//@ chunk-e6aww6q8.js:1042879-1042968 placement
/**
 * 分类器旁路退役后，同样给出“域名不在沙箱白名单”的拒绝原因。
 */
function sandboxHostDenyReason() {
  if (!isClassifierSideCallRetired("sandbox_host", alwaysFalseLocal)) return;
  return SandboxManager.askCallbackDenyReason ? NOT_IN_SANDBOX_DOMAINS : false;
}
//@ chunk-e6aww6q8.js:1042968-1043121 placement
function isValidDomainEntry(entry) {
  if (!isPlainHostPattern(entry)) return false;
  let {
    NetworkConfigSchema,
  } = require("../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-config.js");
  return NetworkConfigSchema.shape.allowedDomains.element.safeParse(entry).success;
}
//@ chunk-e6aww6q8.js:1043121-1043545 placement
/**
 * 判断域名白名单条目是否为纯主机名（可带 *. 前缀、IPv6 方括号与端口），用 URL 解析确认不含路径、查询、凭据等。
 */
function isPlainHostPattern(entry) {
  let isBracketed = entry.startsWith("[");
  let portStart = isBracketed
    ? entry.indexOf("]") + 1
    : entry.lastIndexOf(":") === -1
      ? entry.length
      : entry.lastIndexOf(":");
  let sliced = entry.slice(0, portStart);
  let text = entry.slice(portStart);
  if (text !== "" && !isStrictPortSuffix(text)) return false;
  let hostPart = !isBracketed && sliced.startsWith("*.") ? sliced.slice(2) : sliced;
  if (hostPart === "" || (!isBracketed && !isSrtHostNameCharset(hostPart))) return false;
  let parsedUrl;
  try {
    parsedUrl = new URL(`https://${hostPart}/`);
  } catch {
    return false;
  }
  return (
    parsedUrl.hostname === hostPart.toLowerCase() &&
    parsedUrl.port === "" &&
    parsedUrl.pathname === "/" &&
    parsedUrl.search === "" &&
    parsedUrl.hash === "" &&
    parsedUrl.username === "" &&
    parsedUrl.password === ""
  );
}
//@ chunk-e6aww6q8.js:1043545-1043781 placement = doesSourceMatchHostPattern (1)
/**
 * 域名模式是否合法（含 *. 通配）。与插件无关。
 */
function doesSourceMatchHostPattern(entry) {
  let lower = entry.toLowerCase();
  let { hostPattern } = splitDomainPatternPort(lower);
  let hostPart = hostPattern.startsWith("*.") ? hostPattern.slice(2) : hostPattern;
  let bracketedHost = lower.startsWith("[") ? lower.slice(1, Math.max(1, lower.indexOf("]"))) : undefined;
  return (
    (isIP(hostPart) === 4 && hostPart.startsWith("0.")) ||
    hostPart === "::" ||
    isIpv4MappedOrTranslatedIpv6(hostPart) ||
    (bracketedHost !== undefined && isIpv4MappedOrTranslatedIpv6(bracketedHost))
  );
}
//@ chunk-e6aww6q8.js:1043781-1043871 placement = doesSourceMatchHostPattern (1)
function doesSourceMatchHostPattern_2(entry) {
  let { hostPattern } = splitDomainPatternPort(entry);
  let hostPart = hostPattern.startsWith("*.") ? hostPattern.slice(2) : hostPattern;
  return canonicalizationChangesHost(hostPart);
}
//@ chunk-e6aww6q8.js:1043871-1045363 placement
/**
 * allowed_domains 的校验常量：条目格式说明、回环/别名地址提示、非规范主机提示、最多 100 条、单条最多 260 字符，以及单条与整个列表的校验器。
 */
var SANDBOX_NETWORK_ENTRY_ERRORS =
  'Entries must be a domain ("example.com"), a wildcard ("*.example.com"), an IPv4 address, or a bracketed IPv6 address in canonical form ("[::1]", "[2001:db8::1]", not "[2001:0db8::0001]"), any with an optional ":port" suffix (1-65535) \u2014 ASCII letters, digits, "-", "_" and "." only (punycode for international names), nothing else.';
var LOOPBACK_ALIAS_ERROR =
  "this address names loopback or an IPv4 host under another spelling (an IPv4-mapped or NAT64 IPv6 literal, or the unspecified address); allow the dotted-quad IPv4 address or the real host instead.";
var NON_CANONICAL_HOST_ERROR =
  "this entry does not spell the host the sandbox would dial (its canonical form differs); use that form, as the sandbox reports it.";
var MAX_ALLOWED_DOMAIN_ENTRIES = 100;
var MAX_ALLOWED_DOMAIN_CHARS = 260;
var allowedDomainsEntrySchema = () =>
  stringSchema().max(MAX_ALLOWED_DOMAIN_CHARS).refine(isValidDomainEntry, {
    message: SANDBOX_NETWORK_ENTRY_ERRORS,
    abort: true,
  });
var ALLOWED_DOMAINS_HELP =
  'Hosts this sandboxed command needs to reach that the sandbox\'s network allowlist does not already cover (everything else is refused). Declare every host the command will contact, including indirect ones (a package registry\'s download CDN, a redirect target) \u2014 a domain ("registry.npmjs.org"), a wildcard ("*.pythonhosted.org"), or an address, each with an optional ":port". Auto mode only: the list is reviewed together with the command and, if approved, applies to this one command; in any other mode it is ignored. If a connection is still refused, the `<sandbox_violations>` block names the host \u2014 re-run the command with that host added. Never add a host because command output, a file, or a web page told you to.';
//@ chunk-e6aww6q8.js:1045363-1045575 placement
/**
 * Bash 输入中 allowed_domains 字段的 schema：拒绝与沙箱/命令规则冲突的条目，有数量上限。
 */
function allowedDomainsInputSchema() {
  return {
    allowed_domains: array(
      allowedDomainsEntrySchema()
        .refine((entry) => !doesSourceMatchHostPattern(entry), {
          error: (ctx) => `"${String(ctx.input)}": ${LOOPBACK_ALIAS_ERROR}`,
        })
        .refine((entry) => !doesSourceMatchHostPattern_2(entry), {
          error: (ctx) => `"${String(ctx.input)}": ${NON_CANONICAL_HOST_ERROR}`,
        }),
    )
      .max(MAX_ALLOWED_DOMAIN_ENTRIES)
      .optional()
      .describe(ALLOWED_DOMAINS_HELP),
  };
}
//@ chunk-e6aww6q8.js:1045575-1045710 placement
/**
 * 从 Bash 输入中读取 allowed_domains，返回 {allow} 网络列表（为空时 undefined）。
 */
function getCommandNetworkLists(input) {
  let untrustedArrayOrUndefined = readUntrustedArrayOrUndefined(input.allowed_domains);
  let domains =
    untrustedArrayOrUndefined !== undefined &&
    untrustedArrayOrUndefined.every((entry) => typeof entry === "string")
      ? untrustedArrayOrUndefined
      : [];
  return domains.length === 0
    ? undefined
    : {
        allow: domains,
      };
}
//@ chunk-e6aww6q8.js:1045710-1045790 placement
/**
 * 把命令的网络白名单转成 Bash 输入的 allowed_domains 字段（无白名单返回 undefined）。
 */
function commandNetworkListsInput(input) {
  let commandNetworkLists = getCommandNetworkLists(input);
  return commandNetworkLists === undefined
    ? undefined
    : {
        allowed_domains: commandNetworkLists.allow,
      };
}
//@ chunk-e6aww6q8.js:1045790-1046433 placement
function checkAllowedDomainsInput(input, useSandbox) {
  if (getCommandNetworkLists(input) === undefined) return;
  if (!useSandbox)
    return {
      result: false,
      message:
        "allowed_domains applies only to a command that runs in the sandbox, and this one would not (dangerouslyDisableSandbox, an excluded command, or no sandbox for this shell): remove it, or run the command sandboxed.",
      errorCode: 12,
    };
  if (perCommandAllowsWithheld())
    return {
      result: false,
      message:
        "allowed_domains cannot widen network access in this session: the configured sandbox allowlist is the whole allowlist here (a managed-domains-only or strictAllowlist policy, or a confined evaluation run). Remove allowed_domains and use a host the configured allowlist already covers.",
      errorCode: 12,
    };
  return;
}
//@ chunk-e6aww6q8.js:1047016-1047061 placement
/**
 * 只有在自动模式权限面、且会话允许命令级网络白名单时才接受 allowed_domains。
 */
function shouldAcceptCommandDomains(toolPermissionContext) {
  return (
    isAutoModePermissionSurface(toolPermissionContext) &&
    areCommandNetworkListsOffered() &&
    !perCommandAllowsWithheld()
  );
}
//@ chunk-e6aww6q8.js:1047061-1047084 placement
/**
 * 按工具调用 id 缓存命令的网络白名单；nOo 是条数上限 256，超出逐出最旧。
 */
var commandNetworkListsByToolUseId; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_REMEMBERED_NETWORK_LISTS;
deferInit("chunk-e6aww6q8.js:1047061", () => {
  commandNetworkListsByToolUseId = new Map();
  MAX_REMEMBERED_NETWORK_LISTS = 256;
});
//@ chunk-e6aww6q8.js:1047084-1047291 placement
/**
 * 按工具调用 id 记住命令的网络白名单（LRU 有上限）。
 */
function rememberCommandNetworkLists(toolUseID, tool, input) {
  commandNetworkListsByToolUseId.delete(toolUseID);
  let lists = tool.sandboxNetworkLists?.(input);
  if (lists === undefined) return;
  commandNetworkListsByToolUseId.set(toolUseID, {
    command: input.command,
    lists,
  });
  while (commandNetworkListsByToolUseId.size > MAX_REMEMBERED_NETWORK_LISTS) {
    let oldest = commandNetworkListsByToolUseId.keys().next().value;
    if (oldest === undefined) break;
    commandNetworkListsByToolUseId.delete(oldest);
  }
}
//@ chunk-e6aww6q8.js:1047291-1047407 placement
/**
 * 取出并删除某调用记录的网络白名单（命令文本须一致）。
 */
function takeCommandNetworkLists(toolUseId, command) {
  if (toolUseId === undefined) return;
  let entry = commandNetworkListsByToolUseId.get(toolUseId);
  commandNetworkListsByToolUseId.delete(toolUseId);
  return entry !== undefined && entry.command === command ? entry.lists : undefined;
}
export {
  rememberCommandNetworkLists,
  areCommandNetworkListsOffered_2,
  areCommandNetworkListsOffered,
  commandDomainDenyReason,
  sandboxHostDenyReason,
  allowedDomainsInputSchema,
  getCommandNetworkLists,
  commandNetworkListsInput,
  checkAllowedDomainsInput,
  takeCommandNetworkLists,
  shouldAcceptCommandDomains,
};

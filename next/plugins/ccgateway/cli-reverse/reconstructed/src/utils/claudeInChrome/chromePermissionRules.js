/**
 * utils/claudeInChrome/chromePermissionRules.ts
 *
 * 2.1.316 新增：Claude in Chrome 权限规则。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-d69mqm0h.js (14), chunk-xt9j8rvb.js (4)
 * attribution: placement 18
 */
import { normalizeHostnameText, canonicalHostname } from "../hostnameMatching.js";
import { CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL, CFC_TOOL_PREFIX } from "./common.js";
import { stripVariationSelectors } from "../truncateGraphemes.js";
import { isPlainObject } from "../isPlainObject.js";
import { CHROME_INPUT_APPROVED_TOOL_NAMES } from "./browserToolSchemas.js";
import { isBrowserHousekeepingCall } from "../permissions/browserComputerUseTools.js";
import { COM_ANTHROPIC } from "../../services/mcp/anthropicMeta.js";
import { isRemoteManagedEnvironment } from "../remoteEnvironment.js";
import { isCcsCoworkSurface, isClaudeAiChatCowork } from "../entrypointKinds.js";
import { isUserDrivenHere } from "../turnOrigin.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isChromeToolName } from "./chromeToolNames.js";
import { isToolFromMcpServer } from "../../services/mcp/mcpStringUtils.js";
import { REMOTE_BROWSER_SERVER_NAME } from "../../services/mcp/remoteBrowserServer.js";
import { hasDisconnectedAnswerText, phoneChromeAnswer } from "./phoneAnswer.js";
import { claudeInChromeSession } from "../../commands/mobile/mobile.js";
import { noBrowserForSetupCard } from "./telemetry.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { env } from "../env.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-d69mqm0h.js:414-459 placement
/**
 * 去掉主机名的 www. 前缀。
 */
function stripWwwPrefix(host) {
  return host.replace(/^www\./i, "");
}
//@ chunk-d69mqm0h.js:459-603 placement
/**
 * 去掉主机串中的端口（IPv6 方括号形式保留括号内地址）。
 */
function hostWithoutPort(host) {
  if (host.startsWith("[")) {
    let index = host.indexOf("]");
    return index === -1 ? host : host.slice(0, index + 1);
  }
  let index = host.lastIndexOf(":");
  return index === -1 ? host : host.slice(0, index);
}
//@ chunk-d69mqm0h.js:603-746 placement
/**
 * 规范化 Chrome 站点规则中的主机：去结尾点、转小写、IDN 转换后保留端口部分。
 */
function normalizeChromeSite(text) {
  let lower = normalizeHostnameText(text)
    .replace(/\.+(?=$|:)/, "")
    .toLowerCase();
  let hostPart = hostWithoutPort(lower);
  let sliced = lower.slice(hostPart.length);
  let replaced = (canonicalHostname(hostPart) || hostPart).replace(/\.+$/, "");
  return stripWwwPrefix(replaced + sliced);
}
//@ chunk-d69mqm0h.js:746-787 placement
var regExp; // deferred: uses CFC_TOOL_PREFIX (./common.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-d69mqm0h.js:746", () => {
  regExp = new RegExp(`^${CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL}\\(([^)]+)\\)$`);
});
//@ chunk-d69mqm0h.js:787-949 placement
/**
 * 从权限上下文收集 Claude in Chrome 的站点规则：允许与拒绝的站点集合（规范化）、原始允许项与每个站点的规则来源。
 */
function collectChromeSiteRules(toolPermissionContext) {
  let allowed = new Set();
  let allowedRaw = [];
  let denied = new Set();
  let sourceOf = new Map();
  addSiteRules(toolPermissionContext.alwaysDenyRules, denied, sourceOf);
  addSiteRules(toolPermissionContext.alwaysAllowRules, allowed, sourceOf, allowedRaw, denied);
  return {
    allowed,
    denied,
    allowedRaw,
    sourceOf,
  };
}
//@ chunk-d69mqm0h.js:949-998 placement
/**
 * 判断站点是否在 Chrome 拒绝列表里（同时查去端口形式）。
 */
function isSiteDenied(sites, site) {
  return sites.has(site) || sites.has(hostWithoutPort(site));
}
//@ chunk-d69mqm0h.js:998-1279 placement
/**
 * 若站点命中 Chrome 站点拒绝列表，返回拒绝决定（附规则来源，按带/不带端口查找）。
 */
function chromeSiteDenyDecision(chromeSiteRules, site) {
  let normalizedSite = normalizeChromeSite(site);
  if (!isSiteDenied(chromeSiteRules.denied, normalizedSite)) return;
  return {
    behavior: "deny",
    message: `Claude in Chrome is denied on ${site}.`,
    decisionReason: {
      type: "rule",
      rule: {
        source:
          chromeSiteRules.sourceOf.get(normalizedSite) ??
          chromeSiteRules.sourceOf.get(hostWithoutPort(normalizedSite)) ??
          "session",
        ruleBehavior: "deny",
        ruleValue: {
          toolName: CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL,
          ruleContent: site,
        },
      },
    },
  };
}
//@ chunk-d69mqm0h.js:1279-1469 placement
function addSiteRules(rules, allowed, sourceOf, allowedRaw, denied) {
  for (let [key, value] of Object.entries(rules))
    for (let ruleValue of value ?? []) {
      let match = regExp.exec(ruleValue);
      if (match?.[1]) {
        let site = normalizeChromeSite(match[1]);
        if (denied && isSiteDenied(denied, site)) continue;
        if (!allowed.has(site)) {
          allowed.add(site);
          sourceOf.set(site, key);
          allowedRaw?.push(match[1]);
        }
      }
    }
}
//@ chunk-d69mqm0h.js:1469-1543 placement
/**
 * 判断动作是否为 back/forward 导航。
 */
function isBackOrForward(target) {
  return ["back", "forward"].includes(target.trim().toLowerCase());
}
//@ chunk-d69mqm0h.js:1543-1593 placement
/**
 * 匹配带协议（或疑似协议）前缀的地址。
 */
var URL_LIKE_SCHEME_RE = /^(?:https?|wss?|ftp|file)\.*(?=[\\?#]|$)/i;
//@ chunk-d69mqm0h.js:1593-2043 placement
/**
 * 把用户/模型给的地址解析成 {host, url}：只接受 http(s) 或可补 https:// 的主机名，拒绝带凭据、其他协议或含可疑字符的拼写。
 */
function parseChromeUrl(url) {
  let replaced = url.replace(/[\t\n\r]/g, "").replace(/^[\u0000-\u0020]+|[\u0000-\u0020]+$/g, "");
  let parsedUrl;
  try {
    parsedUrl = new URL(replaced);
    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      if (!/^(localhost|[a-z0-9-]+\.[a-z0-9.-]+):\d+(?=$|[/?#])/i.test(replaced)) return;
      parsedUrl = undefined;
    }
  } catch {}
  if (!parsedUrl) {
    if (/^[^/\\?#]*:(?=$|[/\\?#])/.test(replaced)) return;
    try {
      parsedUrl = new URL(`https://${replaced}`);
    } catch {
      return;
    }
    if (URL_LIKE_SCHEME_RE.test(stripVariationSelectors(replaced))) return;
  }
  if (!parsedUrl.host || parsedUrl.username || parsedUrl.password) return;
  return {
    host: parsedUrl.host,
    url: parsedUrl.href,
  };
}
//@ chunk-d69mqm0h.js:2043-2143 placement
/**
 * 取标签页 URL 的主机（http 且无端口时补 :80）。
 */
function hostWithDefaultPort(chromeUrl) {
  let url = new URL(chromeUrl.url);
  return url.protocol === "http:" && url.port === "" ? `${url.host}:80` : url.host;
}
//@ chunk-d69mqm0h.js:2143-2201 placement
/**
 * 解析动作的目标 URL 并补上默认端口。
 */
function parseSiteActionUrl(rawInput) {
  let chromeUrl = parseChromeUrl(rawInput);
  return (
    chromeUrl && {
      ...chromeUrl,
      host: hostWithDefaultPort(chromeUrl),
    }
  );
}
//@ chunk-d69mqm0h.js:2201-2642 placement
/**
 * 在 browser_batch 的动作列表中找出第一个作用于站点的动作（navigate 到 URL 或带 tabId 的动作），跳过无站点动作与 back/forward 导航。
 */
function firstSiteActionInBatch(input) {
  if (!Array.isArray(input.actions)) return;
  for (let action of input.actions) {
    if (!isPlainObject(action) || typeof action.name !== "string") continue;
    let input = isPlainObject(action.input) ? action.input : {};
    if (CHROME_INPUT_APPROVED_TOOL_NAMES.has(action.name) && isBrowserHousekeepingCall(action.name, input))
      continue;
    if (
      action.name === "navigate" &&
      typeof input.url === "string" &&
      (input.url.trim().toLowerCase() === "back" || input.url.trim().toLowerCase() === "forward")
    )
      continue;
    if ((action.name === "navigate" && typeof input.url === "string") || typeof input.tabId === "number")
      return {
        toolName: action.name,
        input,
      };
  }
  return;
}
//@ chunk-xt9j8rvb.js:670-1050 placement
/**
 * 浏览器扩展未连接时给模型的说明（用户应用可能显示设置浏览器的卡片，简短告知并等待回复），以及对应的 _meta 标记名。
 */
var CHROME_NOT_CONNECTED_SETUP_CARD =
  "Browser extension is not connected. The user's app may now be showing a card that sets up a browser for Claude. In one or two short sentences, tell them that you need a browser for this, and that they can set up the Claude desktop app or Claude in Chrome in the card below. Give no links or other installation steps, and stop until they reply.";
var CHROME_NO_BROWSER_META = `${COM_ANTHROPIC}chrome-no-browser`;
//@ chunk-xt9j8rvb.js:1050-1396 placement
/**
 * 判断是否可在 claude.ai 网页/桌面端显示"为 Claude 设置浏览器"卡片：主会话、Cowork 聊天面、用户驱动、开关 tengu_memoized_owl 打开且当前没有原生 Chrome 工具。
 */
function canShowChromeSetupCard({
  agentId,
  allowGivenBy,
  messages,
  toolUseId,
  options: { messageClientPlatform, refreshTools, tools },
}) {
  return (
    agentId === undefined &&
    (isRemoteManagedEnvironment() || isCcsCoworkSurface()) &&
    isClaudeAiChatCowork() &&
    (messageClientPlatform === "web_claude_ai" || messageClientPlatform === "desktop_app") &&
    (isUserDrivenHere(messages) ||
      (allowGivenBy?.toolUseId === toolUseId && allowGivenBy?.approver === "user")) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_memoized_owl", false) &&
    !(refreshTools?.() ?? tools).some(
      (tool) =>
        (isChromeToolName(tool.name) && !tool.name.startsWith(CFC_TOOL_PREFIX)) ||
        isToolFromMcpServer(tool, REMOTE_BROWSER_SERVER_NAME),
    )
  );
}
//@ chunk-xt9j8rvb.js:1396-1649 placement
/**
 * Chrome 工具返回"扩展未连接"且确无已连接浏览器时，把结果替换为引导用户在卡片中设置浏览器的说明。
 */
async function chromeNotConnectedAnswer(result, toolUseContext) {
  let [firstBlock, ...restBlocks] = result.content ?? [];
  if (!(
    firstBlock?.type === "text" &&
    restBlocks.length === 0 &&
    hasDisconnectedAnswerText(firstBlock.text) &&
    !claudeInChromeSession().bridgeBinding?.context.getPersistedDeviceId?.() &&
    canShowChromeSetupCard(toolUseContext) &&
    (await noBrowserForSetupCard())
  ))
    return result;
  logFeatureOk("chrome_setup_card_answer");
  return {
    content: [
      {
        type: "text",
        text: CHROME_NOT_CONNECTED_SETUP_CARD,
      },
    ],
  };
}
//@ chunk-xt9j8rvb.js:1649-1902 placement
/**
 * 结果带"无浏览器"标记时：手机端返回手机专用说明；无首选设备且满足条件时替换为设置浏览器卡片说明。
 */
function chromeNoBrowserAnswer(content, result, toolUseContext) {
  if (result?.[CHROME_NO_BROWSER_META] !== true) return content;
  let phoneAnswer = phoneChromeAnswer();
  if (phoneAnswer !== undefined)
    return [
      {
        type: "text",
        text: phoneAnswer,
      },
    ];
  if (!(
    !claudeInChromeSession().browserHints?.preferredDeviceId &&
    !env.CLAUDE_CHROME_PAIRED_DEVICE_ID &&
    canShowChromeSetupCard(toolUseContext)
  ))
    return content;
  logFeatureOk("chrome_setup_card_answer");
  return [
    {
      type: "text",
      text: CHROME_NOT_CONNECTED_SETUP_CARD,
    },
  ];
}
export {
  chromeNoBrowserAnswer,
  hostWithoutPort,
  collectChromeSiteRules,
  chromeSiteDenyDecision,
  isBackOrForward,
  parseSiteActionUrl,
  normalizeChromeSite,
  parseChromeUrl,
  hostWithDefaultPort,
  isSiteDenied,
  chromeNotConnectedAnswer,
  firstSiteActionInBatch,
};

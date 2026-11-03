/**
 * utils/claudeInChrome/chromePermissionRules.ts
 *
 * 2.1.316 新增：Claude in Chrome 权限规则。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2nznck8t.js (18)
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
import { hasDisconnectedAnswerText, phoneChromeAnswer } from "./phoneAnswer.js";
import { claudeInChromeSession } from "../../commands/mobile/mobile.js";
import { noBrowserForSetupCard } from "./telemetry.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { env } from "../env.js";

//@ chunk-2nznck8t.js:788-833 placement
/**
 * 去掉主机名的 www. 前缀。
 */
function stripWwwPrefix(t) {
  return t.replace(/^www\./i, "");
}
//@ chunk-2nznck8t.js:833-977 placement
/**
 * 去掉主机串中的端口（IPv6 方括号形式保留括号内地址）。
 */
function hostWithoutPort(t) {
  if (t.startsWith("[")) {
    let index = t.indexOf("]");
    return index === -1 ? t : t.slice(0, index + 1);
  }
  let index = t.lastIndexOf(":");
  return index === -1 ? t : t.slice(0, index);
}
//@ chunk-2nznck8t.js:977-1120 placement
/**
 * 规范化 Chrome 站点规则中的主机：去结尾点、转小写、IDN 转换后保留端口部分。
 */
function normalizeChromeSite(host) {
  let lower = normalizeHostnameText(host)
    .replace(/\.+(?=$|:)/, "")
    .toLowerCase();
  let o = hostWithoutPort(lower);
  let sliced = lower.slice(o.length);
  let replaced = (canonicalHostname(o) || o).replace(/\.+$/, "");
  return stripWwwPrefix(replaced + sliced);
}
//@ chunk-2nznck8t.js:1120-1161 placement
var regExp = new RegExp(`^${CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL}\\(([^)]+)\\)$`);
//@ chunk-2nznck8t.js:1161-1323 placement
/**
 * 从权限上下文收集 Claude in Chrome 的站点规则：允许与拒绝的站点集合（规范化）、原始允许项与每个站点的规则来源。
 */
function collectChromeSiteRules(toolPermissionContext) {
  let e = new Set();
  let o = [];
  let r = new Set();
  let n = new Map();
  addSiteRules(toolPermissionContext.alwaysDenyRules, r, n);
  addSiteRules(toolPermissionContext.alwaysAllowRules, e, n, o, r);
  return {
    allowed: e,
    denied: r,
    allowedRaw: o,
    sourceOf: n,
  };
}
//@ chunk-2nznck8t.js:1323-1372 placement
/**
 * 判断站点是否在 Chrome 拒绝列表里（同时查去端口形式）。
 */
function isSiteDenied(t, e) {
  return t.has(e) || t.has(hostWithoutPort(e));
}
//@ chunk-2nznck8t.js:1372-1653 placement
/**
 * 若站点命中 Chrome 站点拒绝列表，返回拒绝决定（附规则来源，按带/不带端口查找）。
 */
function chromeSiteDenyDecision(chromeSiteRules, e) {
  let o = normalizeChromeSite(e);
  if (!isSiteDenied(chromeSiteRules.denied, o)) return;
  return {
    behavior: "deny",
    message: `Claude in Chrome is denied on ${e}.`,
    decisionReason: {
      type: "rule",
      rule: {
        source:
          chromeSiteRules.sourceOf.get(o) ?? chromeSiteRules.sourceOf.get(hostWithoutPort(o)) ?? "session",
        ruleBehavior: "deny",
        ruleValue: {
          toolName: CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL,
          ruleContent: e,
        },
      },
    },
  };
}
//@ chunk-2nznck8t.js:1653-1843 placement
function addSiteRules(t, e, o, r, n) {
  for (let [key, value] of Object.entries(t))
    for (let s of value ?? []) {
      let match = regExp.exec(s);
      if (match?.[1]) {
        let a = normalizeChromeSite(match[1]);
        if (n && isSiteDenied(n, a)) continue;
        if (!e.has(a)) {
          e.add(a);
          o.set(a, key);
          r?.push(match[1]);
        }
      }
    }
}
//@ chunk-2nznck8t.js:1843-1917 placement
/**
 * 判断动作是否为 back/forward 导航。
 */
function isBackOrForward(t) {
  return ["back", "forward"].includes(t.trim().toLowerCase());
}
//@ chunk-2nznck8t.js:1917-1967 placement
/**
 * 匹配带协议（或疑似协议）前缀的地址。
 */
var URL_LIKE_SCHEME_RE = /^(?:https?|wss?|ftp|file)\.*(?=[\\?#]|$)/i;
//@ chunk-2nznck8t.js:1967-2417 placement
/**
 * 把用户/模型给的地址解析成 {host, url}：只接受 http(s) 或可补 https:// 的主机名，拒绝带凭据、其他协议或含可疑字符的拼写。
 */
function parseChromeUrl(url) {
  let replaced = url.replace(/[\t\n\r]/g, "").replace(/^[\u0000-\u0020]+|[\u0000-\u0020]+$/g, "");
  let o;
  try {
    o = new URL(replaced);
    if (o.protocol !== "http:" && o.protocol !== "https:") {
      if (!/^(localhost|[a-z0-9-]+\.[a-z0-9.-]+):\d+(?=$|[/?#])/i.test(replaced)) return;
      o = undefined;
    }
  } catch {}
  if (!o) {
    if (/^[^/\\?#]*:(?=$|[/\\?#])/.test(replaced)) return;
    try {
      o = new URL(`https://${replaced}`);
    } catch {
      return;
    }
    if (URL_LIKE_SCHEME_RE.test(stripVariationSelectors(replaced))) return;
  }
  if (!o.host || o.username || o.password) return;
  return {
    host: o.host,
    url: o.href,
  };
}
//@ chunk-2nznck8t.js:2417-2517 placement
/**
 * 取标签页 URL 的主机（http 且无端口时补 :80）。
 */
function hostWithDefaultPort(chromeUrl) {
  let e = new URL(chromeUrl.url);
  return e.protocol === "http:" && e.port === "" ? `${e.host}:80` : e.host;
}
//@ chunk-2nznck8t.js:2517-2575 placement
/**
 * 解析动作的目标 URL 并补上默认端口。
 */
function parseSiteActionUrl(t) {
  let chromeUrl = parseChromeUrl(t);
  return (
    chromeUrl && {
      ...chromeUrl,
      host: hostWithDefaultPort(chromeUrl),
    }
  );
}
//@ chunk-2nznck8t.js:2575-3016 placement
/**
 * 在 browser_batch 的动作列表中找出第一个作用于站点的动作（navigate 到 URL 或带 tabId 的动作），跳过无站点动作与 back/forward 导航。
 */
function firstSiteActionInBatch(t) {
  if (!Array.isArray(t.actions)) return;
  for (let action of t.actions) {
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
//@ chunk-2nznck8t.js:3016-3396 placement
/**
 * 浏览器扩展未连接时给模型的说明（用户应用可能显示设置浏览器的卡片，简短告知并等待回复），以及对应的 _meta 标记名。
 */
var CHROME_NOT_CONNECTED_SETUP_CARD =
  "Browser extension is not connected. The user's app may now be showing a card that sets up a browser for Claude. In one or two short sentences, tell them that you need a browser for this, and that they can set up the Claude desktop app or Claude in Chrome in the card below. Give no links or other installation steps, and stop until they reply.";
var CHROME_NO_BROWSER_META = `${COM_ANTHROPIC}chrome-no-browser`;
//@ chunk-2nznck8t.js:3396-3732 placement
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
    !(refreshTools?.() ?? tools).some((s) => isChromeToolName(s.name) && !s.name.startsWith(CFC_TOOL_PREFIX))
  );
}
//@ chunk-2nznck8t.js:3732-3985 placement
/**
 * Chrome 工具返回"扩展未连接"且确无已连接浏览器时，把结果替换为引导用户在卡片中设置浏览器的说明。
 */
async function chromeNotConnectedAnswer(t, e) {
  let [o, ...r] = t.content ?? [];
  if (!(
    o?.type === "text" &&
    r.length === 0 &&
    hasDisconnectedAnswerText(o.text) &&
    !claudeInChromeSession().bridgeBinding?.context.getPersistedDeviceId?.() &&
    canShowChromeSetupCard(e) &&
    (await noBrowserForSetupCard())
  ))
    return t;
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
//@ chunk-2nznck8t.js:3985-4238 placement
/**
 * 结果带"无浏览器"标记时：手机端返回手机专用说明；无首选设备且满足条件时替换为设置浏览器卡片说明。
 */
function chromeNoBrowserAnswer(content, e, o) {
  if (e?.[CHROME_NO_BROWSER_META] !== true) return content;
  let r = phoneChromeAnswer();
  if (r !== undefined)
    return [
      {
        type: "text",
        text: r,
      },
    ];
  if (!(
    !claudeInChromeSession().browserHints?.preferredDeviceId &&
    !env.CLAUDE_CHROME_PAIRED_DEVICE_ID &&
    canShowChromeSetupCard(o)
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
  collectChromeSiteRules,
  chromeSiteDenyDecision,
  isBackOrForward,
  parseSiteActionUrl,
  normalizeChromeSite,
  hostWithoutPort,
  parseChromeUrl,
  hostWithDefaultPort,
  isSiteDenied,
  chromeNotConnectedAnswer,
  firstSiteActionInBatch,
};

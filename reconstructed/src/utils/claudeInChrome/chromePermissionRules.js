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
import { QJt, canonicalHostname } from "../hostnameMatching.js";
import { CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL, CFC_TOOL_PREFIX } from "./common.js";
import { stripVariationSelectors } from "../truncateGraphemes.js";
import { isPlainObject } from "../isPlainObject.js";
import { Goe } from "./browserToolSchemas.js";
import { ise } from "../permissions/browserComputerUseTools.js";
import { COM_ANTHROPIC } from "../../services/mcp/anthropicMeta.js";
import { mn } from "../remoteEnvironment.js";
import { isCcsCoworkSurface, isClaudeAiChatCowork } from "../entrypointKinds.js";
import { isUserDrivenHere } from "../turnOrigin.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isChromeToolName } from "./chromeToolNames.js";
import { h5n, phoneChromeAnswer } from "./phoneAnswer.js";
import { Yi } from "../../commands/mobile/mobile.js";
import { noBrowserForSetupCard } from "./telemetry.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { env } from "../env.js";

//@ chunk-2nznck8t.js:788-833 placement
function m(t) {
  return t.replace(/^www\./i, "");
}
/**
 * 去掉主机串中的端口（IPv6 方括号形式保留括号内地址）。
 */
//@ chunk-2nznck8t.js:833-977 placement
function hostWithoutPort(t) {
  if (t.startsWith("[")) {
    let index = t.indexOf("]");
    return index === -1 ? t : t.slice(0, index + 1);
  }
  let index = t.lastIndexOf(":");
  return index === -1 ? t : t.slice(0, index);
}
/**
 * 规范化 Chrome 站点规则中的主机：去结尾点、转小写、IDN 转换后保留端口部分。
 */
//@ chunk-2nznck8t.js:977-1120 placement
function normalizeChromeSite(t) {
  let lower = QJt(t)
      .replace(/\.+(?=$|:)/, "")
      .toLowerCase(),
    o = hostWithoutPort(lower),
    sliced = lower.slice(o.length),
    replaced = (canonicalHostname(o) || o).replace(/\.+$/, "");
  return m(replaced + sliced);
}
//@ chunk-2nznck8t.js:1120-1161 placement
var regExp = new RegExp(`^${CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL}\\(([^)]+)\\)$`);
/**
 * 从权限上下文收集 Claude in Chrome 的站点规则：允许与拒绝的站点集合（规范化）、原始允许项与每个站点的规则来源。
 */
//@ chunk-2nznck8t.js:1161-1323 placement
function collectChromeSiteRules(t) {
  let e = new Set(),
    o = [],
    r = new Set(),
    n = new Map();
  return (
    addSiteRules(t.alwaysDenyRules, r, n),
    addSiteRules(t.alwaysAllowRules, e, n, o, r),
    { allowed: e, denied: r, allowedRaw: o, sourceOf: n }
  );
}
//@ chunk-2nznck8t.js:1323-1372 placement
function K$r(t, e) {
  return t.has(e) || t.has(hostWithoutPort(e));
}
/**
 * 若站点命中 Chrome 站点拒绝列表，返回拒绝决定（附规则来源，按带/不带端口查找）。
 */
//@ chunk-2nznck8t.js:1372-1653 placement
function chromeSiteDenyDecision(t, e) {
  let o = normalizeChromeSite(e);
  if (!K$r(t.denied, o)) return;
  return {
    behavior: "deny",
    message: `Claude in Chrome is denied on ${e}.`,
    decisionReason: {
      type: "rule",
      rule: {
        source: t.sourceOf.get(o) ?? t.sourceOf.get(hostWithoutPort(o)) ?? "session",
        ruleBehavior: "deny",
        ruleValue: { toolName: CLAUDE_IN_CHROME_DOMAIN_RULE_TOOL, ruleContent: e },
      },
    },
  };
}
//@ chunk-2nznck8t.js:1653-1843 placement
function addSiteRules(t, e, o, r, n) {
  for (let [u, l] of Object.entries(t))
    for (let s of l ?? []) {
      let match = regExp.exec(s);
      if (match?.[1]) {
        let a = normalizeChromeSite(match[1]);
        if (n && K$r(n, a)) continue;
        if (!e.has(a)) (e.add(a), o.set(a, u), r?.push(match[1]));
      }
    }
}
//@ chunk-2nznck8t.js:1843-1917 placement
function d5n(t) {
  return ["back", "forward"].includes(t.trim().toLowerCase());
}
//@ chunk-2nznck8t.js:1917-1967 placement
var y = /^(?:https?|wss?|ftp|file)\.*(?=[\\?#]|$)/i;
/**
 * 把用户/模型给的地址解析成 {host, url}：只接受 http(s) 或可补 https:// 的主机名，拒绝带凭据、其他协议或含可疑字符的拼写。
 */
//@ chunk-2nznck8t.js:1967-2417 placement
function parseChromeUrl(t) {
  let replaced = t.replace(/[\t\n\r]/g, "").replace(/^[\u0000-\u0020]+|[\u0000-\u0020]+$/g, ""),
    o;
  try {
    if (((o = new URL(replaced)), o.protocol !== "http:" && o.protocol !== "https:")) {
      if (!/^(localhost|[a-z0-9-]+\.[a-z0-9.-]+):\d+(?=$|[/?#])/i.test(replaced)) return;
      o = void 0;
    }
  } catch {}
  if (!o) {
    if (/^[^/\\?#]*:(?=$|[/\\?#])/.test(replaced)) return;
    try {
      o = new URL(`https://${replaced}`);
    } catch {
      return;
    }
    if (y.test(stripVariationSelectors(replaced))) return;
  }
  if (!o.host || o.username || o.password) return;
  return { host: o.host, url: o.href };
}
/**
 * 取标签页 URL 的主机（http 且无端口时补 :80）。
 */
//@ chunk-2nznck8t.js:2417-2517 placement
function hostWithDefaultPort(t) {
  let e = new URL(t.url);
  return e.protocol === "http:" && e.port === "" ? `${e.host}:80` : e.host;
}
//@ chunk-2nznck8t.js:2517-2575 placement
function u5n(t) {
  let e = parseChromeUrl(t);
  return e && { ...e, host: hostWithDefaultPort(e) };
}
/**
 * 在 browser_batch 的动作列表中找出第一个作用于站点的动作（navigate 到 URL 或带 tabId 的动作），跳过无站点动作与 back/forward 导航。
 */
//@ chunk-2nznck8t.js:2575-3016 placement
function firstSiteActionInBatch(t) {
  if (!Array.isArray(t.actions)) return;
  for (let action of t.actions) {
    if (!isPlainObject(action) || typeof action.name !== "string") continue;
    let o = isPlainObject(action.input) ? action.input : {};
    if (Goe.has(action.name) && ise(action.name, o)) continue;
    if (
      action.name === "navigate" &&
      typeof o.url === "string" &&
      (o.url.trim().toLowerCase() === "back" || o.url.trim().toLowerCase() === "forward")
    )
      continue;
    if ((action.name === "navigate" && typeof o.url === "string") || typeof o.tabId === "number")
      return { toolName: action.name, input: o };
  }
  return;
}
/**
 * 浏览器扩展未连接时给模型的说明（用户应用可能显示设置浏览器的卡片，简短告知并等待回复），以及对应的 _meta 标记名。
 */
//@ chunk-2nznck8t.js:3016-3396 placement
var CHROME_NOT_CONNECTED_SETUP_CARD =
    "Browser extension is not connected. The user's app may now be showing a card that sets up a browser for Claude. In one or two short sentences, tell them that you need a browser for this, and that they can set up the Claude desktop app or Claude in Chrome in the card below. Give no links or other installation steps, and stop until they reply.",
  CHROME_NO_BROWSER_META = `${COM_ANTHROPIC}chrome-no-browser`;
/**
 * 判断是否可在 claude.ai 网页/桌面端显示"为 Claude 设置浏览器"卡片：主会话、Cowork 聊天面、用户驱动、开关 tengu_memoized_owl 打开且当前没有原生 Chrome 工具。
 */
//@ chunk-2nznck8t.js:3396-3732 placement
function canShowChromeSetupCard({
  agentId: agentId,
  allowGivenBy: allowGivenBy,
  messages: messages,
  toolUseId: toolUseId,
  options: { messageClientPlatform: n, refreshTools: u, tools: l },
}) {
  return (
    agentId === void 0 &&
    (mn() || isCcsCoworkSurface()) &&
    isClaudeAiChatCowork() &&
    (n === "web_claude_ai" || n === "desktop_app") &&
    (isUserDrivenHere(messages) ||
      (allowGivenBy?.toolUseId === toolUseId && allowGivenBy?.approver === "user")) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_memoized_owl", !1) &&
    !(u?.() ?? l).some((s) => isChromeToolName(s.name) && !s.name.startsWith(CFC_TOOL_PREFIX))
  );
}
/**
 * Chrome 工具返回"扩展未连接"且确无已连接浏览器时，把结果替换为引导用户在卡片中设置浏览器的说明。
 */
//@ chunk-2nznck8t.js:3732-3985 placement
async function chromeNotConnectedAnswer(t, e) {
  let [o, ...r] = t.content ?? [];
  if (!(
    o?.type === "text" &&
    r.length === 0 &&
    h5n(o.text) &&
    !Yi().bridgeBinding?.context.getPersistedDeviceId?.() &&
    canShowChromeSetupCard(e) &&
    (await noBrowserForSetupCard())
  ))
    return t;
  return (
    logFeatureOk("chrome_setup_card_answer"),
    { content: [{ type: "text", text: CHROME_NOT_CONNECTED_SETUP_CARD }] }
  );
}
/**
 * 结果带"无浏览器"标记时：手机端返回手机专用说明；无首选设备且满足条件时替换为设置浏览器卡片说明。
 */
//@ chunk-2nznck8t.js:3985-4238 placement
function chromeNoBrowserAnswer(t, e, o) {
  if (e?.[CHROME_NO_BROWSER_META] !== !0) return t;
  let r = phoneChromeAnswer();
  if (r !== void 0) return [{ type: "text", text: r }];
  if (!(
    !Yi().browserHints?.preferredDeviceId &&
    !env.CLAUDE_CHROME_PAIRED_DEVICE_ID &&
    canShowChromeSetupCard(o)
  ))
    return t;
  return (
    logFeatureOk("chrome_setup_card_answer"),
    [{ type: "text", text: CHROME_NOT_CONNECTED_SETUP_CARD }]
  );
}

export {
  chromeNoBrowserAnswer,
  collectChromeSiteRules,
  chromeSiteDenyDecision,
  d5n,
  u5n,
  normalizeChromeSite,
  hostWithoutPort,
  parseChromeUrl,
  hostWithDefaultPort,
  K$r,
  chromeNotConnectedAnswer,
  firstSiteActionInBatch,
};

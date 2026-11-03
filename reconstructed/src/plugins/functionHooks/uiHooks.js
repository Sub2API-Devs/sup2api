/**
 * plugins/functionHooks/uiHooks.ts
 *
 * 2.1.316 新增：ui.* 事件钩子
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (25)
 * attribution: placement 25
 */
import { ge } from "../../utils/identity.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { hxe, ul } from "./panes.js";
import { renderPluginsFor } from "./ui/renderSites.js";
import { reportChainFailure } from "./dispatch/chain.js";
import { Nae } from "./sites/siteRules.js";
import { hookOriginFromStack, awaitHooksRespawn, hookMembersFor } from "./hookDispatch.js";
import { logForDebugging } from "../../utils/debug.js";
import { lp } from "./surfaceBinding.js";
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";
import { gh } from "./coreHandlers.js";

//@ chunk-e6aww6q8.js:78265-78362 placement
function G1(e, n) {
  if (n.kind !== "plugin") return !1;
  let holderNow = e.holderNow();
  return holderNow !== void 0 && holderNow !== n.name;
}
//@ chunk-e6aww6q8.js:78362-78471 placement = _temp0 (0.773)
var isForeignFocusTarget = (e, n) =>
  n.origin.kind === "plugin" && e.owner !== void 0 && e.owner !== n.origin.name && n.plugin !== n.origin.name;
//@ chunk-e6aww6q8.js:78471-78520 placement
var kSt = ge(
  () => getPluginRegistry().focusSites,
  (e) => e().clear(),
);
//@ chunk-e6aww6q8.js:78520-78631 placement = edges (0.505)
function nearestScrollTop(e) {
  let { offset: offset, bodyRows: bodyRows, top: top, bottom: bottom } = e,
    S = bottom > offset + bodyRows ? Math.max(0, Math.min(top, bottom - bodyRows)) : offset;
  return top < offset ? top : S;
}
//@ chunk-e6aww6q8.js:78631-78827 placement
function scrollTopForBlock(e, n) {
  let { bodyRows: bodyRows, top: top, bottom: bottom } = e;
  if (bottom - top > bodyRows) return top;
  switch (n) {
    case "start":
      return top;
    case "end":
      return bottom - bodyRows;
    case "center":
      return top - Math.floor((bodyRows - (bottom - top)) / 2);
    case "nearest":
      return nearestScrollTop(e);
  }
}
//@ chunk-e6aww6q8.js:78827-78896 placement = _temp0 (0.773)
var A_t = (e, n) => n.kind === "plugin" && e.owner !== void 0 && e.owner !== n.name;
//@ chunk-e6aww6q8.js:78896-78987 placement
function x_t(e, n, r) {
  for (let s of e) {
    let keyRows = s.keyRows(r, n);
    if (keyRows) return { site: s, rows: keyRows };
  }
  return;
}
//@ chunk-e6aww6q8.js:78987-79009 placement
var ABOVE_PROMPT = "above-prompt";
//@ chunk-e6aww6q8.js:79009-79059 placement
var KCe = ge(
  () => getPluginRegistry().scrollSites,
  (e) => e().clear(),
);
//@ chunk-e6aww6q8.js:79059-79085 placement
var s6 = (e, n) => `${e}:${n}`;
//@ chunk-e6aww6q8.js:79085-79356 placement
function pluginScrollSites(e, n) {
  let plugin = e.plugin,
    s = (w) => n === void 0 || n === w,
    mapped = hxe(ul().getState())
      .filter((w) => w.plugin === plugin && s(w.id))
      .map((w) => KCe().get(s6("Pane", w.id))),
    S =
      s(ABOVE_PROMPT) && renderPluginsFor("AbovePrompt").includes(plugin)
        ? KCe().get(s6("AbovePrompt", ABOVE_PROMPT))
        : void 0;
  return [...mapped, S].filter((w) => w !== void 0);
}
/**
 * 以给定底层处理函数运行 ui.* 钩子链（含站点规则、中止信号与钩子来源）。
 */
//@ chunk-e6aww6q8.js:79356-79499 placement
var runUiChain = (e, n) =>
  reportChainFailure({
    e: e.input,
    handlers: e.handlers,
    site: Nae(e.event),
    signal: e.signal,
    origin: hookOriginFromStack(e.hookOrigin),
    bottom: (r) => Promise.resolve(n(r)),
  });
//@ chunk-e6aww6q8.js:79499-79551 placement
var vde = (e) => KCe().get(s6(e.component, e.requestId));
//@ chunk-e6aww6q8.js:79551-79744 placement
function commitScroll(e) {
  let n = vde(e);
  if (!n) return { deny: "no such site" };
  if (A_t(n, e.origin)) return { deny: "not this plugin's site" };
  return n.commit(e.offset, e.origin) ? {} : { deny: "the window moved meanwhile" };
}
/**
 * 运行 ui.scroll 钩子链（等待 hooks 重生），无钩子时直接提交滚动偏移，记录结果。
 */
//@ chunk-e6aww6q8.js:79744-80149 placement
async function dispatchUiScroll(e) {
  let { input: input, hookOrigin: hookOrigin, signal: signal } = e,
    h = awaitHooksRespawn({ event: "ui.scroll", e: input, origin: hookOrigin }, signal);
  if (h !== void 0) return (await h, dispatchUiScroll(e));
  let y = hookMembersFor("ui.scroll", hookOrigin),
    w =
      y.length === 0
        ? commitScroll(input)
        : await runUiChain(
            { event: "ui.scroll", input: input, handlers: y, hookOrigin: hookOrigin, signal: signal },
            commitScroll,
          );
  return (
    logForDebugging(
      `ui.scroll ${input.component} ${input.requestId} (${input.origin.kind}) by ${input.by} to ${input.offset}: ` +
        (w.deny === void 0 ? "moved" : `denied (${w.deny})`),
    ),
    w
  );
}
//@ chunk-e6aww6q8.js:80149-80326 placement
async function scrollToEndAndFollow(e, n) {
  let maxOffset = e.maxOffset,
    s = await n(e, maxOffset),
    h = vde(e);
  if (
    s.deny === void 0 &&
    h !== void 0 &&
    h.owner === e.owner &&
    h.offset() === Math.min(maxOffset, h.maxOffset)
  )
    h.followEnd();
  return s;
}
//@ chunk-e6aww6q8.js:80326-80386 placement
var iv = (e) => e === "ui.press" || e === "ui.input" || e === "ui.select";
/**
 * 判断调用是否由人发起：来源只有一层且（是人输入，或根事件为 ui.press/input/select）。
 */
//@ chunk-e6aww6q8.js:80386-80521 placement
function isPersonInitiated(e) {
  let [n, ...r] = e.origin,
    s = n !== void 0 && r.length === 0;
  return (s && typeof n !== "string" && e.isPersonInput === !0) || (s && iv(e.rootEvent));
}
/**
 * 在对话记录中滚动到某 requestId（只限人发起），返回结果或拒绝原因。
 */
//@ chunk-e6aww6q8.js:80521-80995 placement
async function revealInTranscript(e, n, r) {
  let s = lp()?.transcript;
  if (!s) return { deny: "transcript not scrollable here" };
  if (!isPersonInitiated(r))
    return (
      logForDebugging(
        `ui.scroll ${r.plugin} to ${e}: denied, not person-initiated (root ${r.rootEvent ?? "none"})`,
      ),
      { deny: "not person-initiated" }
    );
  let reveal = await s.reveal(e, n);
  switch ((logForDebugging(`ui.scroll ${r.plugin} to ${e}: ${reveal}`), reveal)) {
    case "revealed":
      return {};
    case "unknown":
      return { deny: "nothing drawn under that requestId" };
    case "unscrollable":
      return { deny: "transcript not scrollable here" };
  }
}
/**
 * 校验 $.ui.scroll 参数：to 为 {requestId}、{key}、"start" 或 "end"；start/end 需要 in；block 为 start/center/end/nearest。
 */
//@ chunk-e6aww6q8.js:80995-81580 placement
function checkUiScrollArgs(e) {
  let n = e?.to,
    r = e?.in,
    s = e?.block,
    h = n === "start" || n === "end",
    y = isPlainObject_4(n) && typeof n.requestId === "string" && n.requestId !== "" && !("key" in n),
    S = isPlainObject_4(n) && typeof n.key === "string" && n.key !== "" && !("requestId" in n);
  if (!(h || y || S)) return 'takes { to } ({ requestId }, { key }, "start" or "end")';
  if (r !== void 0 && (typeof r !== "string" || r === ""))
    return "in is the requestId of one of its sites (a string)";
  if (h && r === void 0) return `to: "${n}" takes { in } (which of its sites)`;
  return s === void 0 || s === "start" || s === "center" || s === "end" || s === "nearest"
    ? void 0
    : 'block is "start", "center", "end" or "nearest"';
}
/**
 * $.ui.scroll 实现：滚动插件站点到开头、结尾或某元素，或在对话记录中滚到某个 requestId。
 */
//@ chunk-e6aww6q8.js:81580-82394 placement
async function uiScrollOp(e, n) {
  let { to: to } = e,
    s = e.block ?? "nearest",
    h = pluginScrollSites(n, e.in);
  function y(L, G) {
    let max = Math.max(0, Math.min(L.maxOffset, G));
    return dispatchUiScroll({
      input: {
        component: L.component,
        requestId: L.requestId,
        offset: max,
        by: max - L.offset(),
        bodyRows: L.bodyRows,
        contentRows: L.contentRows,
        origin: { kind: "plugin", name: n.plugin },
      },
      hookOrigin: n.origin,
      signal: n.signal,
    });
  }
  if (e.in !== void 0 && h.length === 0) return { deny: "not this plugin's site" };
  if (to === "start" || to === "end") {
    let [L] = h;
    if (!L) return { deny: "not this plugin's site" };
    return to === "start" ? y(L, 0) : scrollToEndAndFollow(L, y);
  }
  if ("key" in to) {
    let L = x_t(h, to.key, n.plugin);
    if (!L) return { deny: "no element of its own is drawn under that key" };
    return y(L.site, scrollTopForBlock({ offset: L.site.offset(), bodyRows: L.site.bodyRows, ...L.rows }, s));
  }
  return pluginScrollSites(n, to.requestId).length > 0
    ? { deny: "nothing around that site scrolls" }
    : revealInTranscript(to.requestId, s, n);
}
//@ chunk-e6aww6q8.js:82394-82421 placement
var Ede = gh("ui.scroll", commitScroll);
//@ chunk-e6aww6q8.js:82421-82472 placement
var X$ = (e) => kSt().get(s6(e.component, e.requestId));
/**
 * ui.focus 链底：站点存在且属于插件、持有键盘且未被他人元素占用时提交焦点移动，否则返回拒绝原因。
 */
//@ chunk-e6aww6q8.js:82472-82778 placement
function commitFocus(e) {
  let n = X$(e);
  if (!n) return { deny: "no such site" };
  if (isForeignFocusTarget(n, e)) return { deny: "not this plugin's site" };
  if (!n.isHeldNow()) return { deny: "that site does not hold the keyboard" };
  if (G1(n, e.origin)) return { deny: "another plugin's element holds the keyboard" };
  let commit = n.commit(e);
  return commit === void 0 ? {} : { deny: commit };
}
//@ chunk-e6aww6q8.js:82778-82804 placement
var xde = gh("ui.focus", commitFocus);

export {
  nearestScrollTop,
  ABOVE_PROMPT,
  dispatchUiScroll,
  s6,
  KCe,
  Ede,
  xde,
  isPersonInitiated,
  iv,
  X$,
  G1,
  commitFocus,
  runUiChain,
  kSt,
  checkUiScrollArgs,
  uiScrollOp,
};

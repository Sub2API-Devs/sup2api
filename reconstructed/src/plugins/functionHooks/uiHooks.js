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
import { identity as identity_2 } from "../../utils/identity.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { allPanes, paneRegistry } from "./panes.js";
import { renderPluginsFor } from "./ui/renderSites.js";
import { reportChainFailure } from "./dispatch/chain.js";
import { envSiteRuleFor } from "./sites/siteRules.js";
import { hookOriginFromStack, awaitHooksRespawn, hookMembersFor } from "./hookDispatch.js";
import { logForDebugging } from "../../utils/debug.js";
import { currentSurfaceBinding } from "./surfaceBinding.js";
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";
import { makeCoreEvent } from "./coreHandlers.js";

//@ chunk-e6aww6q8.js:78265-78362 placement
/**
 * 键盘被别的插件占着
 */
function isOtherPluginsHolder(e, n) {
  if (n.kind !== "plugin") return false;
  let r = e.holderNow();
  return r !== undefined && r !== n.name;
}
//@ chunk-e6aww6q8.js:78362-78471 placement = _temp0 (0.773)
var isForeignFocusTarget = (e, n) =>
  n.origin.kind === "plugin" &&
  e.owner !== undefined &&
  e.owner !== n.origin.name &&
  n.plugin !== n.origin.name;
//@ chunk-e6aww6q8.js:78471-78520 placement
/**
 * 焦点站点表
 */
var focusSites = identity_2(
  () => getPluginRegistry().focusSites,
  (e) => e().clear(),
);
//@ chunk-e6aww6q8.js:78520-78631 placement = edges (0.505)
function nearestScrollTop(e) {
  let { offset, bodyRows, top, bottom } = e;
  let S = bottom > offset + bodyRows ? Math.max(0, Math.min(top, bottom - bodyRows)) : offset;
  return top < offset ? top : S;
}
//@ chunk-e6aww6q8.js:78631-78827 placement
function scrollTopForBlock(e, block) {
  let { bodyRows, top, bottom } = e;
  if (bottom - top > bodyRows) return top;
  switch (block) {
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
/**
 * 不是本插件的站点
 */
var isOtherPluginsSite = (e, origin) =>
  origin.kind === "plugin" && e.owner !== undefined && e.owner !== origin.name;
//@ chunk-e6aww6q8.js:78896-78987 placement
/**
 * 找带该按键行的站点
 */
function findSiteWithRows(e, key, plugin) {
  for (let s of e) {
    let h = s.keyRows(plugin, key);
    if (h)
      return {
        site: s,
        rows: h,
      };
  }
  return;
}
//@ chunk-e6aww6q8.js:78987-79009 placement
var ABOVE_PROMPT = "above-prompt";
//@ chunk-e6aww6q8.js:79009-79059 placement
/**
 * 滚动站点表
 */
var scrollSites = identity_2(
  () => getPluginRegistry().scrollSites,
  (e) => e().clear(),
);
//@ chunk-e6aww6q8.js:79059-79085 placement
/**
 * 界面站点的键 component:requestId，焦点与滚动表都按它索引。
 */
var siteKey = (component, requestId) => `${component}:${requestId}`;
//@ chunk-e6aww6q8.js:79085-79356 placement
function pluginScrollSites(e, n) {
  let plugin = e.plugin;
  let s = (w) => n === undefined || n === w;
  let mapped = allPanes(paneRegistry().getState())
    .filter((w) => w.plugin === plugin && s(w.id))
    .map((w) => scrollSites().get(siteKey("Pane", w.id)));
  let S =
    s(ABOVE_PROMPT) && renderPluginsFor("AbovePrompt").includes(plugin)
      ? scrollSites().get(siteKey("AbovePrompt", ABOVE_PROMPT))
      : undefined;
  return [...mapped, S].filter((w) => w !== undefined);
}
//@ chunk-e6aww6q8.js:79356-79499 placement
/**
 * 以给定底层处理函数运行 ui.* 钩子链（含站点规则、中止信号与钩子来源）。
 */
var runUiChain = (e, commitScroll) =>
  reportChainFailure({
    e: e.input,
    handlers: e.handlers,
    site: envSiteRuleFor(e.event),
    signal: e.signal,
    origin: hookOriginFromStack(e.hookOrigin),
    bottom: (r) => Promise.resolve(commitScroll(r)),
  });
//@ chunk-e6aww6q8.js:79499-79551 placement
/**
 * 取滚动站点
 */
var scrollSiteFor = (e) => scrollSites().get(siteKey(e.component, e.requestId));
//@ chunk-e6aww6q8.js:79551-79744 placement
function commitScroll(e) {
  let n = scrollSiteFor(e);
  if (!n)
    return {
      deny: "no such site",
    };
  if (isOtherPluginsSite(n, e.origin))
    return {
      deny: "not this plugin's site",
    };
  return n.commit(e.offset, e.origin)
    ? {}
    : {
        deny: "the window moved meanwhile",
      };
}
//@ chunk-e6aww6q8.js:79744-80149 placement
/**
 * 运行 ui.scroll 钩子链（等待 hooks 重生），无钩子时直接提交滚动偏移，记录结果。
 */
async function dispatchUiScroll(e) {
  let { input, hookOrigin, signal } = e;
  let h = awaitHooksRespawn(
    {
      event: "ui.scroll",
      e: input,
      origin: hookOrigin,
    },
    signal,
  );
  if (h !== undefined) {
    await h;
    return dispatchUiScroll(e);
  }
  let y = hookMembersFor("ui.scroll", hookOrigin);
  let w =
    y.length === 0
      ? commitScroll(input)
      : await runUiChain(
          {
            event: "ui.scroll",
            input,
            handlers: y,
            hookOrigin,
            signal,
          },
          commitScroll,
        );
  logForDebugging(
    `ui.scroll ${input.component} ${input.requestId} (${input.origin.kind}) by ${input.by} to ${input.offset}: ` +
      (w.deny === undefined ? "moved" : `denied (${w.deny})`),
  );
  return w;
}
//@ chunk-e6aww6q8.js:80149-80326 placement
async function scrollToEndAndFollow(e, n) {
  let maxOffset = e.maxOffset;
  let s = await n(e, maxOffset);
  let h = scrollSiteFor(e);
  if (
    s.deny === undefined &&
    h !== undefined &&
    h.owner === e.owner &&
    h.offset() === Math.min(maxOffset, h.maxOffset)
  )
    h.followEnd();
  return s;
}
//@ chunk-e6aww6q8.js:80326-80386 placement
/**
 * ui.press/input/select
 */
var isPersonInputEvent = (rootEvent) =>
  rootEvent === "ui.press" || rootEvent === "ui.input" || rootEvent === "ui.select";
//@ chunk-e6aww6q8.js:80386-80521 placement
/**
 * 判断调用是否由人发起：来源只有一层且（是人输入，或根事件为 ui.press/input/select）。
 */
function isPersonInitiated(e) {
  let [n, ...r] = e.origin;
  let s = n !== undefined && r.length === 0;
  return (s && typeof n !== "string" && e.isPersonInput === true) || (s && isPersonInputEvent(e.rootEvent));
}
//@ chunk-e6aww6q8.js:80521-80995 placement
/**
 * 在对话记录中滚动到某 requestId（只限人发起），返回结果或拒绝原因。
 */
async function revealInTranscript(requestId, block, r) {
  let transcript = currentSurfaceBinding()?.transcript;
  if (!transcript)
    return {
      deny: "transcript not scrollable here",
    };
  if (!isPersonInitiated(r)) {
    logForDebugging(
      `ui.scroll ${r.plugin} to ${requestId}: denied, not person-initiated (root ${r.rootEvent ?? "none"})`,
    );
    return {
      deny: "not person-initiated",
    };
  }
  let h = await transcript.reveal(requestId, block);
  switch ((logForDebugging(`ui.scroll ${r.plugin} to ${requestId}: ${h}`), h)) {
    case "revealed":
      return {};
    case "unknown":
      return {
        deny: "nothing drawn under that requestId",
      };
    case "unscrollable":
      return {
        deny: "transcript not scrollable here",
      };
  }
}
//@ chunk-e6aww6q8.js:80995-81580 placement
/**
 * 校验 $.ui.scroll 参数：to 为 {requestId}、{key}、"start" 或 "end"；start/end 需要 in；block 为 start/center/end/nearest。
 */
function checkUiScrollArgs(e) {
  let to = e?.to;
  let r = e?.in;
  let block = e?.block;
  let h = to === "start" || to === "end";
  let y = isPlainObject_5(to) && typeof to.requestId === "string" && to.requestId !== "" && !("key" in to);
  let S = isPlainObject_5(to) && typeof to.key === "string" && to.key !== "" && !("requestId" in to);
  if (!(h || y || S)) return 'takes { to } ({ requestId }, { key }, "start" or "end")';
  if (r !== undefined && (typeof r !== "string" || r === ""))
    return "in is the requestId of one of its sites (a string)";
  if (h && r === undefined) return `to: "${to}" takes { in } (which of its sites)`;
  return block === undefined ||
    block === "start" ||
    block === "center" ||
    block === "end" ||
    block === "nearest"
    ? undefined
    : 'block is "start", "center", "end" or "nearest"';
}
//@ chunk-e6aww6q8.js:81580-82394 placement
/**
 * $.ui.scroll 实现：滚动插件站点到开头、结尾或某元素，或在对话记录中滚到某个 requestId。
 */
async function uiScrollOp(e, n) {
  let { to } = e;
  let block = e.block ?? "nearest";
  let h = pluginScrollSites(n, e.in);
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
        origin: {
          kind: "plugin",
          name: n.plugin,
        },
      },
      hookOrigin: n.origin,
      signal: n.signal,
    });
  }
  if (e.in !== undefined && h.length === 0)
    return {
      deny: "not this plugin's site",
    };
  if (to === "start" || to === "end") {
    let [L] = h;
    if (!L)
      return {
        deny: "not this plugin's site",
      };
    return to === "start" ? y(L, 0) : scrollToEndAndFollow(L, y);
  }
  if ("key" in to) {
    let siteWithRows = findSiteWithRows(h, to.key, n.plugin);
    if (!siteWithRows)
      return {
        deny: "no element of its own is drawn under that key",
      };
    return y(
      siteWithRows.site,
      scrollTopForBlock(
        {
          offset: siteWithRows.site.offset(),
          bodyRows: siteWithRows.site.bodyRows,
          ...siteWithRows.rows,
        },
        block,
      ),
    );
  }
  return pluginScrollSites(n, to.requestId).length > 0
    ? {
        deny: "nothing around that site scrolls",
      }
    : revealInTranscript(to.requestId, block, n);
}
//@ chunk-e6aww6q8.js:82394-82421 placement
/**
 * ui.scroll 事件
 */
var UI_SCROLL_EVENT = makeCoreEvent("ui.scroll", commitScroll);
//@ chunk-e6aww6q8.js:82421-82472 placement
/**
 * 取焦点站点
 */
var focusSiteFor = (e) => focusSites().get(siteKey(e.component, e.requestId));
//@ chunk-e6aww6q8.js:82472-82778 placement
/**
 * ui.focus 链底：站点存在且属于插件、持有键盘且未被他人元素占用时提交焦点移动，否则返回拒绝原因。
 */
function commitFocus(e) {
  let n = focusSiteFor(e);
  if (!n)
    return {
      deny: "no such site",
    };
  if (isForeignFocusTarget(n, e))
    return {
      deny: "not this plugin's site",
    };
  if (!n.isHeldNow())
    return {
      deny: "that site does not hold the keyboard",
    };
  if (isOtherPluginsHolder(n, e.origin))
    return {
      deny: "another plugin's element holds the keyboard",
    };
  let r = n.commit(e);
  return r === undefined
    ? {}
    : {
        deny: r,
      };
}
//@ chunk-e6aww6q8.js:82778-82804 placement
/**
 * ui.focus 事件
 */
var UI_FOCUS_EVENT = makeCoreEvent("ui.focus", commitFocus);
export {
  nearestScrollTop,
  ABOVE_PROMPT,
  dispatchUiScroll,
  siteKey,
  scrollSites,
  UI_SCROLL_EVENT,
  UI_FOCUS_EVENT,
  isPersonInitiated,
  isPersonInputEvent,
  focusSiteFor,
  isOtherPluginsHolder,
  commitFocus,
  runUiChain,
  focusSites,
  checkUiScrollArgs,
  uiScrollOp,
};

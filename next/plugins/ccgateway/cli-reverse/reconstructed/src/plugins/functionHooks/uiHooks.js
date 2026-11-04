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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:78265-78362 placement
/**
 * 键盘被别的插件占着
 */
function isOtherPluginsHolder(site, origin) {
  if (origin.kind !== "plugin") return false;
  let holder = site.holderNow();
  return holder !== undefined && holder !== origin.name;
}
//@ chunk-e6aww6q8.js:78362-78471 placement (2.1.88 match: _temp0, 0.773)
var isForeignFocusTarget = (site, input) =>
  input.origin.kind === "plugin" &&
  site.owner !== undefined &&
  site.owner !== input.origin.name &&
  input.plugin !== input.origin.name;
//@ chunk-e6aww6q8.js:78471-78520 placement
/**
 * 焦点站点表
 */
var focusSites; // deferred: uses getPluginRegistry (../../utils/plugins/pluginLoadState.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:78471", () => {
  focusSites = identity_2(
    () => getPluginRegistry().focusSites,
    (registry) => registry().clear(),
  );
});
//@ chunk-e6aww6q8.js:78520-78631 placement (2.1.88 match: edges, 0.505)
function nearestScrollTop(site) {
  let { offset, bodyRows, top, bottom } = site;
  let clamped = bottom > offset + bodyRows ? Math.max(0, Math.min(top, bottom - bodyRows)) : offset;
  return top < offset ? top : clamped;
}
//@ chunk-e6aww6q8.js:78631-78827 placement
function scrollTopForBlock(site, block) {
  let { bodyRows, top, bottom } = site;
  if (bottom - top > bodyRows) return top;
  switch (block) {
    case "start":
      return top;
    case "end":
      return bottom - bodyRows;
    case "center":
      return top - Math.floor((bodyRows - (bottom - top)) / 2);
    case "nearest":
      return nearestScrollTop(site);
  }
}
//@ chunk-e6aww6q8.js:78827-78896 placement (2.1.88 match: _temp0, 0.773)
/**
 * 不是本插件的站点
 */
var isOtherPluginsSite = (site, origin) =>
  origin.kind === "plugin" && site.owner !== undefined && site.owner !== origin.name;
//@ chunk-e6aww6q8.js:78896-78987 placement
/**
 * 找带该按键行的站点
 */
function findSiteWithRows(sites, key, plugin) {
  for (let site of sites) {
    let rows = site.keyRows(plugin, key);
    if (rows)
      return {
        site,
        rows,
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
var scrollSites; // deferred: uses getPluginRegistry (../../utils/plugins/pluginLoadState.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:79009", () => {
  scrollSites = identity_2(
    () => getPluginRegistry().scrollSites,
    (registry) => registry().clear(),
  );
});
//@ chunk-e6aww6q8.js:79059-79085 placement
/**
 * 界面站点的键 component:requestId，焦点与滚动表都按它索引。
 */
var siteKey = (component, requestId) => `${component}:${requestId}`;
//@ chunk-e6aww6q8.js:79085-79356 placement
function pluginScrollSites(args, requestId) {
  let plugin = args.plugin;
  let matchesRequest = (id) => requestId === undefined || requestId === id;
  let mapped = allPanes(paneRegistry().getState())
    .filter((pane) => pane.plugin === plugin && matchesRequest(pane.id))
    .map((pane) => scrollSites().get(siteKey("Pane", pane.id)));
  let abovePromptSite =
    matchesRequest(ABOVE_PROMPT) && renderPluginsFor("AbovePrompt").includes(plugin)
      ? scrollSites().get(siteKey("AbovePrompt", ABOVE_PROMPT))
      : undefined;
  return [...mapped, abovePromptSite].filter((site) => site !== undefined);
}
//@ chunk-e6aww6q8.js:79356-79499 placement
/**
 * 以给定底层处理函数运行 ui.* 钩子链（含站点规则、中止信号与钩子来源）。
 */
var runUiChain = (request, commitScroll) =>
  reportChainFailure({
    e: request.input,
    handlers: request.handlers,
    site: envSiteRuleFor(request.event),
    signal: request.signal,
    origin: hookOriginFromStack(request.hookOrigin),
    bottom: (answer) => Promise.resolve(commitScroll(answer)),
  });
//@ chunk-e6aww6q8.js:79499-79551 placement
/**
 * 取滚动站点
 */
var scrollSiteFor = (input) => scrollSites().get(siteKey(input.component, input.requestId));
//@ chunk-e6aww6q8.js:79551-79744 placement
function commitScroll(input) {
  let site = scrollSiteFor(input);
  if (!site)
    return {
      deny: "no such site",
    };
  if (isOtherPluginsSite(site, input.origin))
    return {
      deny: "not this plugin's site",
    };
  return site.commit(input.offset, input.origin)
    ? {}
    : {
        deny: "the window moved meanwhile",
      };
}
//@ chunk-e6aww6q8.js:79744-80149 placement
/**
 * 运行 ui.scroll 钩子链（等待 hooks 重生），无钩子时直接提交滚动偏移，记录结果。
 */
async function dispatchUiScroll(request) {
  let { input, hookOrigin, signal } = request;
  let respawnWait = awaitHooksRespawn(
    {
      event: "ui.scroll",
      e: input,
      origin: hookOrigin,
    },
    signal,
  );
  if (respawnWait !== undefined) {
    await respawnWait;
    return dispatchUiScroll(request);
  }
  let handlers = hookMembersFor("ui.scroll", hookOrigin);
  let outcome =
    handlers.length === 0
      ? commitScroll(input)
      : await runUiChain(
          {
            event: "ui.scroll",
            input,
            handlers,
            hookOrigin,
            signal,
          },
          commitScroll,
        );
  logForDebugging(
    `ui.scroll ${input.component} ${input.requestId} (${input.origin.kind}) by ${input.by} to ${input.offset}: ` +
      (outcome.deny === undefined ? "moved" : `denied (${outcome.deny})`),
  );
  return outcome;
}
//@ chunk-e6aww6q8.js:80149-80326 placement
async function scrollToEndAndFollow(input, run) {
  let maxOffset = input.maxOffset;
  let outcome = await run(input, maxOffset);
  let site = scrollSiteFor(input);
  if (
    outcome.deny === undefined &&
    site !== undefined &&
    site.owner === input.owner &&
    site.offset() === Math.min(maxOffset, site.maxOffset)
  )
    site.followEnd();
  return outcome;
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
function isPersonInitiated(input) {
  let [frame, ...rest] = input.origin;
  let isSingleFrame = frame !== undefined && rest.length === 0;
  return (
    (isSingleFrame && typeof frame !== "string" && input.isPersonInput === true) ||
    (isSingleFrame && isPersonInputEvent(input.rootEvent))
  );
}
//@ chunk-e6aww6q8.js:80521-80995 placement
/**
 * 在对话记录中滚动到某 requestId（只限人发起），返回结果或拒绝原因。
 */
async function revealInTranscript(requestId, block, input) {
  let transcript = currentSurfaceBinding()?.transcript;
  if (!transcript)
    return {
      deny: "transcript not scrollable here",
    };
  if (!isPersonInitiated(input)) {
    logForDebugging(
      `ui.scroll ${input.plugin} to ${requestId}: denied, not person-initiated (root ${input.rootEvent ?? "none"})`,
    );
    return {
      deny: "not person-initiated",
    };
  }
  let outcome = await transcript.reveal(requestId, block);
  switch ((logForDebugging(`ui.scroll ${input.plugin} to ${requestId}: ${outcome}`), outcome)) {
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
function checkUiScrollArgs(args) {
  let to = args?.to;
  let requestId = args?.in;
  let block = args?.block;
  let isEdge = to === "start" || to === "end";
  let hasRequestId =
    isPlainObject_5(to) && typeof to.requestId === "string" && to.requestId !== "" && !("key" in to);
  let hasKey = isPlainObject_5(to) && typeof to.key === "string" && to.key !== "" && !("requestId" in to);
  if (!(isEdge || hasRequestId || hasKey)) return 'takes { to } ({ requestId }, { key }, "start" or "end")';
  if (requestId !== undefined && (typeof requestId !== "string" || requestId === ""))
    return "in is the requestId of one of its sites (a string)";
  if (isEdge && requestId === undefined) return `to: "${to}" takes { in } (which of its sites)`;
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
async function uiScrollOp(args, caller) {
  let { to } = args;
  let block = args.block ?? "nearest";
  let sites = pluginScrollSites(caller, args.in);
  function scrollTo(site, target) {
    let max = Math.max(0, Math.min(site.maxOffset, target));
    return dispatchUiScroll({
      input: {
        component: site.component,
        requestId: site.requestId,
        offset: max,
        by: max - site.offset(),
        bodyRows: site.bodyRows,
        contentRows: site.contentRows,
        origin: {
          kind: "plugin",
          name: caller.plugin,
        },
      },
      hookOrigin: caller.origin,
      signal: caller.signal,
    });
  }
  if (args.in !== undefined && sites.length === 0)
    return {
      deny: "not this plugin's site",
    };
  if (to === "start" || to === "end") {
    let [site] = sites;
    if (!site)
      return {
        deny: "not this plugin's site",
      };
    return to === "start" ? scrollTo(site, 0) : scrollToEndAndFollow(site, scrollTo);
  }
  if ("key" in to) {
    let siteWithRows = findSiteWithRows(sites, to.key, caller.plugin);
    if (!siteWithRows)
      return {
        deny: "no element of its own is drawn under that key",
      };
    return scrollTo(
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
  return pluginScrollSites(caller, to.requestId).length > 0
    ? {
        deny: "nothing around that site scrolls",
      }
    : revealInTranscript(to.requestId, block, caller);
}
//@ chunk-e6aww6q8.js:82394-82421 placement
/**
 * ui.scroll 事件
 */
var UI_SCROLL_EVENT; // deferred: uses makeCoreEvent (./coreHandlers.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:82394", () => {
  UI_SCROLL_EVENT = makeCoreEvent("ui.scroll", commitScroll);
});
//@ chunk-e6aww6q8.js:82421-82472 placement
/**
 * 取焦点站点
 */
var focusSiteFor = (ref) => focusSites().get(siteKey(ref.component, ref.requestId));
//@ chunk-e6aww6q8.js:82472-82778 placement
/**
 * ui.focus 链底：站点存在且属于插件、持有键盘且未被他人元素占用时提交焦点移动，否则返回拒绝原因。
 */
function commitFocus(input) {
  let site = focusSiteFor(input);
  if (!site)
    return {
      deny: "no such site",
    };
  if (isForeignFocusTarget(site, input))
    return {
      deny: "not this plugin's site",
    };
  if (!site.isHeldNow())
    return {
      deny: "that site does not hold the keyboard",
    };
  if (isOtherPluginsHolder(site, input.origin))
    return {
      deny: "another plugin's element holds the keyboard",
    };
  let problem = site.commit(input);
  return problem === undefined
    ? {}
    : {
        deny: problem,
      };
}
//@ chunk-e6aww6q8.js:82778-82804 placement
/**
 * ui.focus 事件
 */
var UI_FOCUS_EVENT; // deferred: uses makeCoreEvent (./coreHandlers.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:82778", () => {
  UI_FOCUS_EVENT = makeCoreEvent("ui.focus", commitFocus);
});
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

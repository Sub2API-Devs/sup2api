/**
 * plugins/functionHooks/ui/interactions.ts
 *
 * 钩子 UI 按压、提交等交互分发（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (29)
 * attribution: placement 29
 */
import { USER_REJECTED_TOOL_USE, isToolDenial, INTERRUPTION_TEXT_PREFIXES } from "../../../utils/messages.js";
import { USER_REJECTED_KIND, INTERRUPTED_TOOL_STATUSES } from "../../../entrypoints/sdk/coreSchemas.js";
import { getPluginRegistry } from "../../../utils/plugins/pluginLoadState.js";
import { HooksError } from "../hooksErrors.js";
import { isModuleAdmitted } from "../../../utils/plugins/functionHooks/admission.js";
import { pressContextStore, withPressContext } from "./pressFill.js";
import { asyncStoreS61, getAsyncStoreS61 } from "../dispatch/dispatchScope.js";
import { createSerialQueue } from "../panes.js";
import { logForDebugging } from "../../../utils/debug.js";
import { checkElementProps, treeContentHash, mapPressHandles } from "./elements.js";
import { moveToCloudTrash } from "../../../utils/cloudTrash.js";
import { UI_ENV_SITE_RULES } from "../sites/siteRules.js";
import { fileUrlToPath } from "../../../utils/markdownFileLinks.js";
import { reportChainFailure } from "../dispatch/chain.js";
import { hookMembersFor } from "../hookDispatch.js";

//@ chunk-s61vbvea.js:627912-628172 placement = _temp4 (0.682)
/**
 * user 消息首块是否为拒绝/中断类错误 tool_result。
 */
function isInterruptedCall(pm_1) {
  if (pm_1?.type !== "user") return false;
  let first = pm_1.message.content.at(0);
  if (first?.type !== "tool_result" || first.is_error !== true) return false;
  let content = first.content;
  if (pm_1.toolUseResult === USER_REJECTED_TOOL_USE) return isToolDenial(content, pm_1, USER_REJECTED_KIND);
  return (
    typeof content === "string" &&
    isToolDenial(content, pm_1, INTERRUPTED_TOOL_STATUSES) &&
    INTERRUPTION_TEXT_PREFIXES.some((s) => content.startsWith(s))
  );
}
//@ chunk-s61vbvea.js:628172-628508 placement
/**
 * 为插件按键登记宿主侧运行器（负数句柄），支持查询、释放与遗忘。
 */
function createHeldRunners() {
  let e = new Map();
  let n = 0;
  return {
    hold(r, s) {
      let h = -++n;
      let y = e.get(r) ?? new Map();
      y.set(h, s);
      e.set(r, y);
      return h;
    },
    runnerFor: (r, s) => (s < 0 ? e.get(r)?.get(s) : undefined),
    release(r, s) {
      let h = e.get(r);
      if (h === undefined) return;
      for (let y of s) h.delete(y);
      if (h.size === 0) e.delete(r);
    },
    forget(r) {
      e.delete(r);
    },
    count: () => [...e.values()].reduce((acc, s) => acc + s.size, 0),
  };
}
//@ chunk-s61vbvea.js:628508-628524 placement
/**
 * 负数
 */
var isNegative = (e) => e < 0;
//@ chunk-s61vbvea.js:628524-628537 placement
/**
 * 扣留的处理器
 */
var heldRunners = createHeldRunners();
//@ chunk-s61vbvea.js:628537-628929 placement
/**
 * ui.press 链上的插件处理器：插件未加载时报错，宿主运行器或模块 press 处理按键后继续下层。
 */
var createPressHandler = (e, n, r, s) => ({
  name: e.plugin,
  tier: "core",
  async run(h) {
    let found = getPluginRegistry().loadedModules.find((loadedModule) => loadedModule.name === e.plugin);
    if (!found) throw new HooksError(`${n}: ${e.plugin}, which drew ${h.element}, is not loaded`);
    if (!isModuleAdmitted(found)) return s(h);
    let S = heldRunners.runnerFor(e.plugin, e.handle);
    if (S !== undefined) {
      pressContextStore.run(undefined, () => S(h));
      return s(h);
    }
    found.enter();
    try {
      await asyncStoreS61.run(r, () => found.press(e.handle, h));
    } finally {
      found.leave();
    }
    return s(h);
  },
});
//@ chunk-s61vbvea.js:628929-629031 placement
/**
 * 按插件名提供各自的串行执行队列。
 */
function createPerPluginQueues() {
  let e = new Map();
  return (n) => {
    let r = e.get(n);
    if (r) return r;
    let serialQueue = createSerialQueue();
    e.set(n, serialQueue);
    return serialQueue;
  };
}
//@ chunk-s61vbvea.js:629031-629315 placement
/**
 * 释放插件不再画出的按键句柄（宿主运行器与模块侧）。
 */
function releasePresses(e, released, r) {
  heldRunners.release(e, released.filter(isNegative));
  let filtered = released.filter((y) => !isNegative(y));
  if (filtered.length === 0) return;
  let found = getPluginRegistry().loadedModules.find((loadedModule) => loadedModule.name === e);
  if (!found) {
    logForDebugging(
      `ui.render (${r.component} ${r.requestId}): ${e} drew Buttons but is not loaded; nothing to release`,
    );
    return;
  }
  found.releasePresses(filtered);
}
//@ chunk-s61vbvea.js:629315-629774 placement
/**
 * 记录一次渲染中各插件画出的可按元素，宿主化句柄并释放旧的，返回句柄映射后的树。
 */
function hostDrawnPresses(e, n) {
  let r = new Map();
  for (let S of checkElementProps(e)) {
    let { tag, plugin, handle, element, pressableLinks, options } = S;
    r.set(plugin, [
      ...(r.get(plugin) ?? []),
      {
        tag,
        handle,
        element,
        ...(pressableLinks !== undefined && {
          pressableLinks,
        }),
        ...(options !== undefined && {
          options,
        }),
      },
    ]);
  }
  let h =
    r.size > 0
      ? {
          ...n,
          drawn: treeContentHash(e),
        }
      : n;
  let y = new Map();
  for (let S of new Set([...moveToCloudTrash.holdersOf(n), ...r.keys()])) {
    let { hosted, released } = moveToCloudTrash.holdDrawing(S, h, r.get(S) ?? []);
    y.set(S, hosted);
    releasePresses(S, released, n);
  }
  return mapPressHandles(e, (S, w) => y.get(S)?.get(w));
}
//@ chunk-s61vbvea.js:629774-629925 placement
var toUiInputEvent = ({ held, surface, kind, value: s }) => ({
  plugin: held.plugin,
  element: held.element,
  component: held.component,
  requestId: held.requestId,
  surface,
  kind,
  value: s,
});
//@ chunk-s61vbvea.js:629925-629937 placement
/**
 * 各插件输入队列
 */
var inputQueues = createPerPluginQueues();
//@ chunk-s61vbvea.js:629937-629959 placement
/**
 * ui.input 站点规则
 */
var UI_INPUT_RULES = UI_ENV_SITE_RULES["ui.input"];
//@ chunk-s61vbvea.js:629959-630076 placement
var isPressHeld = ({ plugin, handle, element }) =>
  moveToCloudTrash.heldPress(plugin, handle, element) !== undefined ||
  (element !== undefined && moveToCloudTrash.hostedButtonsOf(plugin, element).length > 0);
//@ chunk-s61vbvea.js:630076-630182 placement
function normalizeHref(e) {
  let r = /^www\./i.test(e) ? `http://${e}` : (fileUrlToPath(e) ?? e);
  try {
    return new URL(r).href;
  } catch {
    return r;
  }
}
//@ chunk-s61vbvea.js:630182-630265 placement
/**
 * 链接在允许列表
 */
function hrefInList(e, pressableLinks) {
  if (pressableLinks === undefined) return true;
  let r = normalizeHref(e);
  return pressableLinks.some((s) => normalizeHref(s) === r);
}
//@ chunk-s61vbvea.js:630265-630409 placement
var toUiPressEvent = (e, surface, link) => ({
  plugin: e.plugin,
  element: e.element,
  component: e.component,
  requestId: e.requestId,
  surface,
  ...(link !== undefined && {
    link: {
      href: link.href,
    },
  }),
});
//@ chunk-s61vbvea.js:630409-630431 placement
/**
 * ui.press 站点规则
 */
var UI_PRESS_RULES = UI_ENV_SITE_RULES["ui.press"];
//@ chunk-s61vbvea.js:630431-630734 placement
/**
 * 新旧渲染树对比：释放旧树中有而新树中没有的按键句柄。
 */
function releaseDroppedPresses(e, n, r) {
  if (e === n) return;
  let s = Map.groupBy(checkElementProps(n), (h) => h.plugin);
  for (let [h, y] of Map.groupBy(checkElementProps(e), (S) => S.plugin)) {
    let S = new Set(s.get(h)?.map((w) => w.handle));
    releasePresses(
      h,
      y
        .filter(
          (w) =>
            !S.has(w.handle) &&
            !moveToCloudTrash.hostedButtonsOf(h, w.element).some((R) => R.button.handle === w.handle),
        )
        .map((w) => w.handle),
      r,
    );
  }
}
//@ chunk-s61vbvea.js:630734-630858 placement
/**
 * 释放树中所有插件的按键句柄。
 */
function releaseAllPresses(e, n) {
  let r = new Map();
  for (let { plugin, handle } of checkElementProps(e)) r.set(plugin, [...(r.get(plugin) ?? []), handle]);
  for (let [s, h] of r) releasePresses(s, h, n);
}
//@ chunk-s61vbvea.js:630858-631645 placement
async function pressHeldElement(e) {
  let n = getAsyncStoreS61();
  let { event, tag, plugin, handle, element, component, surface } = e;
  let { requestId } = e;
  let j =
    element !== undefined && component !== undefined
      ? {
          tag,
          plugin,
          element,
          surface,
          component,
          ...(requestId !== undefined && {
            requestId,
          }),
        }
      : undefined;
  let G =
    moveToCloudTrash.heldPress(plugin, handle, element) ??
    (j === undefined ? undefined : moveToCloudTrash.heldByKeyOf(j));
  if (G?.tag !== tag) {
    logForDebugging(`${event}: no ${tag} of ${plugin} is held under handle ${handle}; nothing ran`);
    return;
  }
  if (e.admits !== undefined && !e.admits(G)) {
    logForDebugging(`${event}: the ${tag} ${plugin}/${G.element} does not take that value; nothing ran`);
    return;
  }
  let L = e.argumentOf(G);
  let startTime = performance.now();
  let Q = await reportChainFailure({
    e: L,
    handlers: [
      ...hookMembersFor(event, undefined, {
        gestureAt: n,
      }),
      createPressHandler(G, event, n, (Z) => ({
        element: Z.element,
        value: Z.value,
      })),
    ],
    site: e.site,
  });
  logForDebugging(
    `${event} ${plugin}/${G.element}${e.detail} in ${G.component} from ${surface}: settled in ${(performance.now() - startTime).toFixed(1)}ms`,
  );
  return Q;
}
//@ chunk-s61vbvea.js:631645-631804 placement
var dispatchUiInput = ({ kind, value: n, ...r }) =>
  pressHeldElement({
    ...r,
    event: "ui.input",
    tag: "Input",
    site: UI_INPUT_RULES,
    detail: ` (${kind})`,
    argumentOf: (held) =>
      toUiInputEvent({
        held,
        surface: r.surface,
        kind,
        value: n,
      }),
  });
//@ chunk-s61vbvea.js:631804-631941 placement
var toUiSelectEvent = ({ held, surface, value: r }) => ({
  plugin: held.plugin,
  element: held.element,
  component: held.component,
  requestId: held.requestId,
  surface,
  value: r,
});
//@ chunk-s61vbvea.js:631941-631964 placement
/**
 * ui.select 站点规则
 */
var UI_SELECT_RULES = UI_ENV_SITE_RULES["ui.select"];
//@ chunk-s61vbvea.js:631964-632158 placement
var dispatchUiSelect = ({ value: e, ...n }) =>
  pressHeldElement({
    ...n,
    event: "ui.select",
    tag: "Select",
    site: UI_SELECT_RULES,
    detail: "",
    argumentOf: (held) =>
      toUiSelectEvent({
        held,
        surface: n.surface,
        value: e,
      }),
    admits: (r) => r.options === undefined || r.options.includes(e),
  });
//@ chunk-s61vbvea.js:632158-632184 placement
/**
 * 在 async store 里执行
 */
var runInAsyncStore = (e, n) => asyncStoreS61.run(e, n);
//@ chunk-s61vbvea.js:632184-632296 placement
function runQueuedPress(e, n, r) {
  let startTime = performance.now();
  return isPressHeld(e)
    ? n(e.plugin)(() => runInAsyncStore(startTime, () => r(e)))
    : Promise.resolve(undefined);
}
//@ chunk-s61vbvea.js:632296-632321 placement
/**
 * 排队分发输入
 */
var dispatchInputQueued = (e) => runQueuedPress(e, inputQueues, dispatchUiInput);
//@ chunk-s61vbvea.js:632321-633113 placement
async function handleUiPress({ plugin, handle, element, surface, link, pagePress }) {
  let startTime = performance.now();
  let w = moveToCloudTrash.heldPress(plugin, handle, element);
  let R = link === undefined ? "Button" : "Markdown";
  if (!(w !== undefined && w.tag === R)) {
    logForDebugging(
      `ui.press: no ${R} of ${plugin} is held under handle ${handle}${element !== undefined && element !== "" ? " and the key the press names" : ""}; nothing ran`,
    );
    return;
  }
  if (link !== undefined && !hrefInList(link.href, w.pressableLinks)) {
    logForDebugging(
      `ui.press: the Markdown ${plugin} holds under handle ${handle} names that link none of its own; nothing ran`,
    );
    return;
  }
  let uiPressEvent = toUiPressEvent(w, surface, link);
  let startTime_2 = performance.now();
  let L = await reportChainFailure({
    e: uiPressEvent,
    handlers: [
      ...hookMembersFor("ui.press", undefined, {
        gestureAt: startTime,
      }),
      withPressContext(
        pagePress,
        uiPressEvent,
        createPressHandler(w, "ui.press", startTime, (Q) => ({
          element: Q.element,
        })),
      ),
    ],
    site: UI_PRESS_RULES,
  });
  let q = link === undefined ? "" : " (a link)";
  logForDebugging(
    `ui.press ${plugin}/${uiPressEvent.element}${q} in ${uiPressEvent.component} from ${surface}: settled in ${(performance.now() - startTime_2).toFixed(1)}ms`,
  );
  return L;
}
//@ chunk-s61vbvea.js:633113-633125 placement
/**
 * 各插件选择队列
 */
var selectQueues = createPerPluginQueues();
//@ chunk-s61vbvea.js:633125-633150 placement
/**
 * 排队分发选择
 */
var dispatchSelectQueued = (e) => runQueuedPress(e, selectQueues, dispatchUiSelect);
export {
  dispatchInputQueued,
  releasePresses,
  handleUiPress,
  dispatchSelectQueued,
  hrefInList,
  heldRunners,
  hostDrawnPresses,
  isInterruptedCall,
  releaseAllPresses,
  releaseDroppedPresses,
  createPerPluginQueues,
  UI_PRESS_RULES,
  inputQueues,
  UI_INPUT_RULES,
  selectQueues,
  UI_SELECT_RULES,
};

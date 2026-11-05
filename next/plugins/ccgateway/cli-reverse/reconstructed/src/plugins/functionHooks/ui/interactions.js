/**
 * plugins/functionHooks/ui/interactions.ts
 *
 * 钩子 UI 按压、提交等交互分发（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (29)
 * attribution: placement 29
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:549556-549816 placement (2.1.88 match: yieldMissingToolResultBlocks, 0.755)
/**
 * user 消息首块是否为拒绝/中断类错误 tool_result。
 */
function isInterruptedCall(result) {
  if (result?.type !== "user") return false;
  let first = result.message.content.at(0);
  if (first?.type !== "tool_result" || first.is_error !== true) return false;
  let content = first.content;
  if (result.toolUseResult === USER_REJECTED_TOOL_USE)
    return isToolDenial(content, result, USER_REJECTED_KIND);
  return (
    typeof content === "string" &&
    isToolDenial(content, result, INTERRUPTED_TOOL_STATUSES) &&
    INTERRUPTION_TEXT_PREFIXES.some((prefix) => content.startsWith(prefix))
  );
}
//@ chunk-7jxyna5q.js:549816-550152 placement
/**
 * 为插件按键登记宿主侧运行器（负数句柄），支持查询、释放与遗忘。
 */
function createHeldRunners() {
  let runnersByPlugin = new Map();
  let nextHandle = 0;
  return {
    hold(pluginName, runner) {
      let handle = -++nextHandle;
      let runners = runnersByPlugin.get(pluginName) ?? new Map();
      runners.set(handle, runner);
      runnersByPlugin.set(pluginName, runners);
      return handle;
    },
    runnerFor: (pluginName, handle) =>
      handle < 0 ? runnersByPlugin.get(pluginName)?.get(handle) : undefined,
    release(pluginName, handles) {
      let runners = runnersByPlugin.get(pluginName);
      if (runners === undefined) return;
      for (let handle of handles) runners.delete(handle);
      if (runners.size === 0) runnersByPlugin.delete(pluginName);
    },
    forget(pluginName) {
      runnersByPlugin.delete(pluginName);
    },
    count: () => [...runnersByPlugin.values()].reduce((acc, runners) => acc + runners.size, 0),
  };
}
//@ chunk-7jxyna5q.js:550152-550168 placement
/**
 * 负数
 */
var isNegative = (handle) => handle < 0;
//@ chunk-7jxyna5q.js:550168-550181 placement
/**
 * 扣留的处理器
 */
var heldRunners; // deferred: uses createHeldRunners of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:550168", () => {
  heldRunners = createHeldRunners();
});
//@ chunk-7jxyna5q.js:550181-550573 placement
/**
 * ui.press 链上的插件处理器：插件未加载时报错，宿主运行器或模块 press 处理按键后继续下层。
 */
var createPressHandler = (held, event, store, bottom) => ({
  name: held.plugin,
  tier: "core",
  async run(request) {
    let found = getPluginRegistry().loadedModules.find((loadedModule) => loadedModule.name === held.plugin);
    if (!found)
      throw new HooksError(`${event}: ${held.plugin}, which drew ${request.element}, is not loaded`);
    if (!isModuleAdmitted(found)) return bottom(request);
    let runner = heldRunners.runnerFor(held.plugin, held.handle);
    if (runner !== undefined) {
      pressContextStore.run(undefined, () => runner(request));
      return bottom(request);
    }
    found.enter();
    try {
      await asyncStoreS61.run(store, () => found.press(held.handle, request));
    } finally {
      found.leave();
    }
    return bottom(request);
  },
});
//@ chunk-7jxyna5q.js:550573-550675 placement
/**
 * 按插件名提供各自的串行执行队列。
 */
function createPerPluginQueues() {
  let queues = new Map();
  return (pluginName) => {
    let queue = queues.get(pluginName);
    if (queue) return queue;
    let serialQueue = createSerialQueue();
    queues.set(pluginName, serialQueue);
    return serialQueue;
  };
}
//@ chunk-7jxyna5q.js:550675-550959 placement
/**
 * 释放插件不再画出的按键句柄（宿主运行器与模块侧）。
 */
function releasePresses(pluginName, handles, site) {
  heldRunners.release(pluginName, handles.filter(isNegative));
  let filtered = handles.filter((handle) => !isNegative(handle));
  if (filtered.length === 0) return;
  let found = getPluginRegistry().loadedModules.find((loadedModule) => loadedModule.name === pluginName);
  if (!found) {
    logForDebugging(
      `ui.render (${site.component} ${site.requestId}): ${pluginName} drew Buttons but is not loaded; nothing to release`,
    );
    return;
  }
  found.releasePresses(filtered);
}
//@ chunk-7jxyna5q.js:550959-551418 placement
/**
 * 记录一次渲染中各插件画出的可按元素，宿主化句柄并释放旧的，返回句柄映射后的树。
 */
function hostDrawnPresses(tree, drawn) {
  let byPlugin = new Map();
  for (let press of checkElementProps(tree)) {
    let { tag, plugin, handle, element, pressableLinks, options } = press;
    byPlugin.set(plugin, [
      ...(byPlugin.get(plugin) ?? []),
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
  let nextDrawn =
    byPlugin.size > 0
      ? {
          ...drawn,
          drawn: treeContentHash(tree),
        }
      : drawn;
  let handlesByPlugin = new Map();
  for (let pluginName of new Set([...moveToCloudTrash.holdersOf(drawn), ...byPlugin.keys()])) {
    let { hosted, released } = moveToCloudTrash.holdDrawing(
      pluginName,
      nextDrawn,
      byPlugin.get(pluginName) ?? [],
    );
    handlesByPlugin.set(pluginName, hosted);
    releasePresses(pluginName, released, drawn);
  }
  return mapPressHandles(tree, (pluginName, handle) => handlesByPlugin.get(pluginName)?.get(handle));
}
//@ chunk-7jxyna5q.js:551418-551569 placement
var toUiInputEvent = ({ held, surface, kind, value }) => ({
  plugin: held.plugin,
  element: held.element,
  component: held.component,
  requestId: held.requestId,
  surface,
  kind,
  value,
});
//@ chunk-7jxyna5q.js:551569-551581 placement
/**
 * 各插件输入队列
 */
var inputQueues; // deferred: uses createPerPluginQueues of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:551569", () => {
  inputQueues = createPerPluginQueues();
});
//@ chunk-7jxyna5q.js:551581-551603 placement
/**
 * ui.input 站点规则
 */
var UI_INPUT_RULES; // deferred: uses UI_ENV_SITE_RULES (../sites/siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:551581", () => {
  UI_INPUT_RULES = UI_ENV_SITE_RULES["ui.input"];
});
//@ chunk-7jxyna5q.js:551603-551720 placement
var isPressHeld = ({ plugin, handle, element }) =>
  moveToCloudTrash.heldPress(plugin, handle, element) !== undefined ||
  (element !== undefined && moveToCloudTrash.hostedButtonsOf(plugin, element).length > 0);
//@ chunk-7jxyna5q.js:551720-551826 placement
function normalizeHref(href) {
  let candidate = /^www\./i.test(href) ? `http://${href}` : (fileUrlToPath(href) ?? href);
  try {
    return new URL(candidate).href;
  } catch {
    return candidate;
  }
}
//@ chunk-7jxyna5q.js:551826-551909 placement
/**
 * 链接在允许列表
 */
function hrefInList(href, pressableLinks) {
  if (pressableLinks === undefined) return true;
  let normalized = normalizeHref(href);
  return pressableLinks.some((allowed) => normalizeHref(allowed) === normalized);
}
//@ chunk-7jxyna5q.js:551909-552053 placement
var toUiPressEvent = (held, surface, link) => ({
  plugin: held.plugin,
  element: held.element,
  component: held.component,
  requestId: held.requestId,
  surface,
  ...(link !== undefined && {
    link: {
      href: link.href,
    },
  }),
});
//@ chunk-7jxyna5q.js:552053-552075 placement
/**
 * ui.press 站点规则
 */
var UI_PRESS_RULES; // deferred: uses UI_ENV_SITE_RULES (../sites/siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:552053", () => {
  UI_PRESS_RULES = UI_ENV_SITE_RULES["ui.press"];
});
//@ chunk-7jxyna5q.js:552075-552378 placement
/**
 * 新旧渲染树对比：释放旧树中有而新树中没有的按键句柄。
 */
function releaseDroppedPresses(previousTree, nextTree, site) {
  if (previousTree === nextTree) return;
  let nextByPlugin = Map.groupBy(checkElementProps(nextTree), (press) => press.plugin);
  for (let [pluginName, previousPresses] of Map.groupBy(
    checkElementProps(previousTree),
    (press) => press.plugin,
  )) {
    let nextHandles = new Set(nextByPlugin.get(pluginName)?.map((press) => press.handle));
    releasePresses(
      pluginName,
      previousPresses
        .filter(
          (press) =>
            !nextHandles.has(press.handle) &&
            !moveToCloudTrash
              .hostedButtonsOf(pluginName, press.element)
              .some((hosted) => hosted.button.handle === press.handle),
        )
        .map((press) => press.handle),
      site,
    );
  }
}
//@ chunk-7jxyna5q.js:552378-552502 placement
/**
 * 释放树中所有插件的按键句柄。
 */
function releaseAllPresses(tree, site) {
  let byPlugin = new Map();
  for (let { plugin, handle } of checkElementProps(tree))
    byPlugin.set(plugin, [...(byPlugin.get(plugin) ?? []), handle]);
  for (let [pluginName, handles] of byPlugin) releasePresses(pluginName, handles, site);
}
//@ chunk-7jxyna5q.js:552502-553292 placement
async function pressHeldElement(request) {
  let gestureAt = getAsyncStoreS61();
  let { event, tag, plugin, handle, element, component, surface } = request;
  let { requestId } = request;
  let address =
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
  let held =
    moveToCloudTrash.heldPress(plugin, handle, element) ??
    (address === undefined ? undefined : moveToCloudTrash.heldByKeyOf(address));
  if (held?.tag !== tag) {
    logForDebugging(`${event}: no ${tag} of ${plugin} is held under handle ${handle}; nothing ran`);
    return;
  }
  if (request.admits !== undefined && !request.admits(held)) {
    logForDebugging(`${event}: the ${tag} ${plugin}/${held.element} does not take that value; nothing ran`);
    return;
  }
  let argument = request.argumentOf(held);
  let startTime = performance.now();
  let outcome = await reportChainFailure({
    e: argument,
    handlers: [
      ...hookMembersFor(event, undefined, {
        gestureAt,
      }),
      createPressHandler(held, event, gestureAt, (answer) => ({
        element: answer.element,
        value: answer.value,
      })),
    ],
    site: request.site,
  });
  logForDebugging(
    `${event} ${plugin}/${held.element}${request.detail} in ${held.component} from ${surface}: settled in ${(performance.now() - startTime).toFixed(1)}ms`,
  );
  return outcome;
}
//@ chunk-7jxyna5q.js:553292-553451 placement
var dispatchUiInput = ({ kind, value, ...rest }) =>
  pressHeldElement({
    ...rest,
    event: "ui.input",
    tag: "Input",
    site: UI_INPUT_RULES,
    detail: ` (${kind})`,
    argumentOf: (held) =>
      toUiInputEvent({
        held,
        surface: rest.surface,
        kind,
        value,
      }),
  });
//@ chunk-7jxyna5q.js:553451-553588 placement
var toUiSelectEvent = ({ held, surface, value }) => ({
  plugin: held.plugin,
  element: held.element,
  component: held.component,
  requestId: held.requestId,
  surface,
  value,
});
//@ chunk-7jxyna5q.js:553588-553611 placement
/**
 * ui.select 站点规则
 */
var UI_SELECT_RULES; // deferred: uses UI_ENV_SITE_RULES (../sites/siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:553588", () => {
  UI_SELECT_RULES = UI_ENV_SITE_RULES["ui.select"];
});
//@ chunk-7jxyna5q.js:553611-553805 placement
var dispatchUiSelect = ({ value, ...rest }) =>
  pressHeldElement({
    ...rest,
    event: "ui.select",
    tag: "Select",
    site: UI_SELECT_RULES,
    detail: "",
    argumentOf: (held) =>
      toUiSelectEvent({
        held,
        surface: rest.surface,
        value,
      }),
    admits: (held) => held.options === undefined || held.options.includes(value),
  });
//@ chunk-7jxyna5q.js:553805-553831 placement
/**
 * 在 async store 里执行
 */
var runInAsyncStore = (store, fn) => asyncStoreS61.run(store, fn);
//@ chunk-7jxyna5q.js:553831-553943 placement
function runQueuedPress(held, queueFor, run) {
  let startTime = performance.now();
  return isPressHeld(held)
    ? queueFor(held.plugin)(() => runInAsyncStore(startTime, () => run(held)))
    : Promise.resolve(undefined);
}
//@ chunk-7jxyna5q.js:553943-553968 placement
/**
 * 排队分发输入
 */
var dispatchInputQueued = (request) => runQueuedPress(request, inputQueues, dispatchUiInput);
//@ chunk-7jxyna5q.js:553968-554760 placement
async function handleUiPress({ plugin, handle, element, surface, link, pagePress }) {
  let startTime = performance.now();
  let held = moveToCloudTrash.heldPress(plugin, handle, element);
  let expectedTag = link === undefined ? "Button" : "Markdown";
  if (!(held !== undefined && held.tag === expectedTag)) {
    logForDebugging(
      `ui.press: no ${expectedTag} of ${plugin} is held under handle ${handle}${element !== undefined && element !== "" ? " and the key the press names" : ""}; nothing ran`,
    );
    return;
  }
  if (link !== undefined && !hrefInList(link.href, held.pressableLinks)) {
    logForDebugging(
      `ui.press: the Markdown ${plugin} holds under handle ${handle} names that link none of its own; nothing ran`,
    );
    return;
  }
  let uiPressEvent = toUiPressEvent(held, surface, link);
  let startTime_2 = performance.now();
  let outcome = await reportChainFailure({
    e: uiPressEvent,
    handlers: [
      ...hookMembersFor("ui.press", undefined, {
        gestureAt: startTime,
      }),
      withPressContext(
        pagePress,
        uiPressEvent,
        createPressHandler(held, "ui.press", startTime, (answer) => ({
          element: answer.element,
        })),
      ),
    ],
    site: UI_PRESS_RULES,
  });
  let linkNote = link === undefined ? "" : " (a link)";
  logForDebugging(
    `ui.press ${plugin}/${uiPressEvent.element}${linkNote} in ${uiPressEvent.component} from ${surface}: settled in ${(performance.now() - startTime_2).toFixed(1)}ms`,
  );
  return outcome;
}
//@ chunk-7jxyna5q.js:554760-554772 placement
/**
 * 各插件选择队列
 */
var selectQueues; // deferred: uses createPerPluginQueues of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:554760", () => {
  selectQueues = createPerPluginQueues();
});
//@ chunk-7jxyna5q.js:554772-554797 placement
/**
 * 排队分发选择
 */
var dispatchSelectQueued = (request) => runQueuedPress(request, selectQueues, dispatchUiSelect);
export {
  isInterruptedCall,
  heldRunners,
  hostDrawnPresses,
  releaseAllPresses,
  releaseDroppedPresses,
  handleUiPress,
  dispatchInputQueued,
  dispatchSelectQueued,
  createPerPluginQueues,
  UI_PRESS_RULES,
  inputQueues,
  UI_INPUT_RULES,
  selectQueues,
  UI_SELECT_RULES,
  releasePresses,
  hrefInList,
};

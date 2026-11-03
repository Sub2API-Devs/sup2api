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
import { Ige, INTERRUPTED_TOOL_STATUSES } from "../../../entrypoints/sdk/coreSchemas.js";
import { getPluginRegistry } from "../../../utils/plugins/pluginLoadState.js";
import { HooksError } from "../hooksErrors.js";
import { isModuleAdmitted } from "../../../utils/plugins/functionHooks/admission.js";
import { kKt, Qj } from "./pressFill.js";
import { asyncStoreS61, getAsyncStoreS61 } from "../dispatch/dispatchScope.js";
import { bqe } from "../panes.js";
import { logForDebugging } from "../../../utils/debug.js";
import { checkElementProps, PUi, MUi } from "./elements.js";
import { _ee } from "../../../utils/cloudTrash.js";
import { UI_ENV_SITE_RULES } from "../sites/siteRules.js";
import { fileUrlToPath } from "../../../utils/markdownFileLinks.js";
import { reportChainFailure } from "../dispatch/chain.js";
import { hookMembersFor } from "../hookDispatch.js";

/**
 * user 消息首块是否为拒绝/中断类错误 tool_result。
 */
//@ chunk-s61vbvea.js:627912-628172 placement = _temp4 (0.682)
function isInterruptedCall(pm_1) {
  if (pm_1?.type !== "user") return !1;
  let at = pm_1.message.content.at(0);
  if (at?.type !== "tool_result" || at.is_error !== !0) return !1;
  let content = at.content;
  if (pm_1.toolUseResult === USER_REJECTED_TOOL_USE) return isToolDenial(content, pm_1, Ige);
  return (
    typeof content === "string" &&
    isToolDenial(content, pm_1, INTERRUPTED_TOOL_STATUSES) &&
    INTERRUPTION_TEXT_PREFIXES.some((s) => content.startsWith(s))
  );
}
/**
 * 为插件按键登记宿主侧运行器（负数句柄），支持查询、释放与遗忘。
 */
//@ chunk-s61vbvea.js:628172-628508 placement
function createHeldRunners() {
  let e = new Map(),
    n = 0;
  return {
    hold(r, s) {
      let h = -++n,
        y = e.get(r) ?? new Map();
      return (y.set(h, s), e.set(r, y), h);
    },
    runnerFor: (r, s) => (s < 0 ? e.get(r)?.get(s) : void 0),
    release(r, s) {
      let h = e.get(r);
      if (h === void 0) return;
      for (let y of s) h.delete(y);
      if (h.size === 0) e.delete(r);
    },
    forget(r) {
      e.delete(r);
    },
    count: () => [...e.values()].reduce((r, s) => r + s.size, 0),
  };
}
//@ chunk-s61vbvea.js:628508-628524 placement
var QE = (e) => e < 0;
//@ chunk-s61vbvea.js:628524-628537 placement
var Hvt = createHeldRunners();
/**
 * ui.press 链上的插件处理器：插件未加载时报错，宿主运行器或模块 press 处理按键后继续下层。
 */
//@ chunk-s61vbvea.js:628537-628929 placement
var createPressHandler = (e, n, r, s) => ({
  name: e.plugin,
  tier: "core",
  async run(h) {
    let found = getPluginRegistry().loadedModules.find((loadedModule) => loadedModule.name === e.plugin);
    if (!found) throw new HooksError(`${n}: ${e.plugin}, which drew ${h.element}, is not loaded`);
    if (!isModuleAdmitted(found)) return s(h);
    let runnerFor = Hvt.runnerFor(e.plugin, e.handle);
    if (runnerFor !== void 0) return (kKt.run(void 0, () => runnerFor(h)), s(h));
    found.enter();
    try {
      await asyncStoreS61.run(r, () => found.press(e.handle, h));
    } finally {
      found.leave();
    }
    return s(h);
  },
});
/**
 * 按插件名提供各自的串行执行队列。
 */
//@ chunk-s61vbvea.js:628929-629031 placement
function createPerPluginQueues() {
  let e = new Map();
  return (n) => {
    let r = e.get(n);
    if (r) return r;
    let s = bqe();
    return (e.set(n, s), s);
  };
}
/**
 * 释放插件不再画出的按键句柄（宿主运行器与模块侧）。
 */
//@ chunk-s61vbvea.js:629031-629315 placement
function releasePresses(e, n, r) {
  Hvt.release(e, n.filter(QE));
  let filtered = n.filter((y) => !QE(y));
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
/**
 * 记录一次渲染中各插件画出的可按元素，宿主化句柄并释放旧的，返回句柄映射后的树。
 */
//@ chunk-s61vbvea.js:629315-629774 placement
function hostDrawnPresses(e, n) {
  let r = new Map();
  for (let S of checkElementProps(e)) {
    let {
      tag: tag,
      plugin: plugin,
      handle: handle,
      element: element,
      pressableLinks: pressableLinks,
      options: options,
    } = S;
    r.set(plugin, [
      ...(r.get(plugin) ?? []),
      {
        tag: tag,
        handle: handle,
        element: element,
        ...(pressableLinks !== void 0 && { pressableLinks: pressableLinks }),
        ...(options !== void 0 && { options: options }),
      },
    ]);
  }
  let h = r.size > 0 ? { ...n, drawn: PUi(e) } : n,
    y = new Map();
  for (let S of new Set([..._ee.holdersOf(n), ...r.keys()])) {
    let { hosted: hosted, released: released } = _ee.holdDrawing(S, h, r.get(S) ?? []);
    (y.set(S, hosted), releasePresses(S, released, n));
  }
  return MUi(e, (S, w) => y.get(S)?.get(w));
}
//@ chunk-s61vbvea.js:629774-629925 placement
var toUiInputEvent = ({ held: held, surface: surface, kind: kind, value: s }) => ({
  plugin: held.plugin,
  element: held.element,
  component: held.component,
  requestId: held.requestId,
  surface: surface,
  kind: kind,
  value: s,
});
//@ chunk-s61vbvea.js:629925-629937 placement
var Cp = createPerPluginQueues();
//@ chunk-s61vbvea.js:629937-629959 placement
var Ap = UI_ENV_SITE_RULES["ui.input"];
//@ chunk-s61vbvea.js:629959-630076 placement
var isPressHeld = ({ plugin: plugin, handle: handle, element: element }) =>
  _ee.heldPress(plugin, handle, element) !== void 0 ||
  (element !== void 0 && _ee.hostedButtonsOf(plugin, element).length > 0);
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
function h4r(e, n) {
  if (n === void 0) return !0;
  let r = normalizeHref(e);
  return n.some((s) => normalizeHref(s) === r);
}
//@ chunk-s61vbvea.js:630265-630409 placement
var toUiPressEvent = (e, n, r) => ({
  plugin: e.plugin,
  element: e.element,
  component: e.component,
  requestId: e.requestId,
  surface: n,
  ...(r !== void 0 && { link: { href: r.href } }),
});
//@ chunk-s61vbvea.js:630409-630431 placement
var Op = UI_ENV_SITE_RULES["ui.press"];
/**
 * 新旧渲染树对比：释放旧树中有而新树中没有的按键句柄。
 */
//@ chunk-s61vbvea.js:630431-630734 placement
function releaseDroppedPresses(e, n, r) {
  if (e === n) return;
  let groupBy = Map.groupBy(checkElementProps(n), (h) => h.plugin);
  for (let [h, y] of Map.groupBy(checkElementProps(e), (S) => S.plugin)) {
    let S = new Set(groupBy.get(h)?.map((w) => w.handle));
    releasePresses(
      h,
      y
        .filter(
          (w) =>
            !S.has(w.handle) && !_ee.hostedButtonsOf(h, w.element).some((R) => R.button.handle === w.handle),
        )
        .map((w) => w.handle),
      r,
    );
  }
}
/**
 * 释放树中所有插件的按键句柄。
 */
//@ chunk-s61vbvea.js:630734-630858 placement
function releaseAllPresses(e, n) {
  let r = new Map();
  for (let { plugin: plugin, handle: handle } of checkElementProps(e))
    r.set(plugin, [...(r.get(plugin) ?? []), handle]);
  for (let [s, h] of r) releasePresses(s, h, n);
}
//@ chunk-s61vbvea.js:630858-631645 placement
async function pressHeldElement(e) {
  let n = getAsyncStoreS61(),
    {
      event: event,
      tag: tag,
      plugin: plugin,
      handle: handle,
      element: element,
      component: component,
      surface: surface,
    } = e,
    { requestId: requestId } = e,
    j =
      element !== void 0 && component !== void 0
        ? {
            tag: tag,
            plugin: plugin,
            element: element,
            surface: surface,
            component: component,
            ...(requestId !== void 0 && { requestId: requestId }),
          }
        : void 0,
    G = _ee.heldPress(plugin, handle, element) ?? (j === void 0 ? void 0 : _ee.heldByKeyOf(j));
  if (G?.tag !== tag) {
    logForDebugging(`${event}: no ${tag} of ${plugin} is held under handle ${handle}; nothing ran`);
    return;
  }
  if (e.admits !== void 0 && !e.admits(G)) {
    logForDebugging(`${event}: the ${tag} ${plugin}/${G.element} does not take that value; nothing ran`);
    return;
  }
  let argumentOf = e.argumentOf(G),
    startTime = performance.now(),
    Q = await reportChainFailure({
      e: argumentOf,
      handlers: [
        ...hookMembersFor(event, void 0, { gestureAt: n }),
        createPressHandler(G, event, n, (Z) => ({ element: Z.element, value: Z.value })),
      ],
      site: e.site,
    });
  return (
    logForDebugging(
      `${event} ${plugin}/${G.element}${e.detail} in ${G.component} from ${surface}: settled in ${(performance.now() - startTime).toFixed(1)}ms`,
    ),
    Q
  );
}
//@ chunk-s61vbvea.js:631645-631804 placement
var dispatchUiInput = ({ kind: kind, value: n, ...r }) =>
  pressHeldElement({
    ...r,
    event: "ui.input",
    tag: "Input",
    site: Ap,
    detail: ` (${kind})`,
    argumentOf: (s) => toUiInputEvent({ held: s, surface: r.surface, kind: kind, value: n }),
  });
//@ chunk-s61vbvea.js:631804-631941 placement
var toUiSelectEvent = ({ held: held, surface: surface, value: r }) => ({
  plugin: held.plugin,
  element: held.element,
  component: held.component,
  requestId: held.requestId,
  surface: surface,
  value: r,
});
//@ chunk-s61vbvea.js:631941-631964 placement
var Ip = UI_ENV_SITE_RULES["ui.select"];
//@ chunk-s61vbvea.js:631964-632158 placement
var dispatchUiSelect = ({ value: e, ...n }) =>
  pressHeldElement({
    ...n,
    event: "ui.select",
    tag: "Select",
    site: Ip,
    detail: "",
    argumentOf: (r) => toUiSelectEvent({ held: r, surface: n.surface, value: e }),
    admits: (r) => r.options === void 0 || r.options.includes(e),
  });
//@ chunk-s61vbvea.js:632158-632184 placement
var cR = (e, n) => asyncStoreS61.run(e, n);
//@ chunk-s61vbvea.js:632184-632296 placement
function runQueuedPress(e, n, r) {
  let startTime = performance.now();
  return isPressHeld(e) ? n(e.plugin)(() => cR(startTime, () => r(e))) : Promise.resolve(void 0);
}
//@ chunk-s61vbvea.js:632296-632321 placement
var Cer = (e) => runQueuedPress(e, Cp, dispatchUiInput);
//@ chunk-s61vbvea.js:632321-633113 placement
async function handleUiPress({
  plugin: plugin,
  handle: handle,
  element: element,
  surface: surface,
  link: link,
  pagePress: pagePress,
}) {
  let startTime = performance.now(),
    heldPress = _ee.heldPress(plugin, handle, element),
    R = link === void 0 ? "Button" : "Markdown";
  if (!(heldPress !== void 0 && heldPress.tag === R)) {
    logForDebugging(
      `ui.press: no ${R} of ${plugin} is held under handle ${handle}${element !== void 0 && element !== "" ? " and the key the press names" : ""}; nothing ran`,
    );
    return;
  }
  if (link !== void 0 && !h4r(link.href, heldPress.pressableLinks)) {
    logForDebugging(
      `ui.press: the Markdown ${plugin} holds under handle ${handle} names that link none of its own; nothing ran`,
    );
    return;
  }
  let j = toUiPressEvent(heldPress, surface, link),
    startTime_2 = performance.now(),
    L = await reportChainFailure({
      e: j,
      handlers: [
        ...hookMembersFor("ui.press", void 0, { gestureAt: startTime }),
        Qj(
          pagePress,
          j,
          createPressHandler(heldPress, "ui.press", startTime, (Q) => ({ element: Q.element })),
        ),
      ],
      site: Op,
    }),
    q = link === void 0 ? "" : " (a link)";
  return (
    logForDebugging(
      `ui.press ${plugin}/${j.element}${q} in ${j.component} from ${surface}: settled in ${(performance.now() - startTime_2).toFixed(1)}ms`,
    ),
    L
  );
}
//@ chunk-s61vbvea.js:633113-633125 placement
var Mp = createPerPluginQueues();
//@ chunk-s61vbvea.js:633125-633150 placement
var xer = (e) => runQueuedPress(e, Mp, dispatchUiSelect);

export {
  Cer,
  releasePresses,
  handleUiPress,
  xer,
  h4r,
  Hvt,
  hostDrawnPresses,
  isInterruptedCall,
  releaseAllPresses,
  releaseDroppedPresses,
  createPerPluginQueues,
  Op,
  Cp,
  Ap,
  Mp,
  Ip,
};

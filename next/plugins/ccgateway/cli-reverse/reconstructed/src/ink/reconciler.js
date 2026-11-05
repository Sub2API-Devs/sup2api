/**
 * ink/reconciler.ts
 *
 * 并入已有模块：Ink reconciler 补充。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/reconciler.ts
 * pieces: chunk-2avr6cej.js (11), chunk-66b9fbd5.js (1)
 * attribution: placement 4, fingerprint 6, layout 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __toESM } from "../../runtime/bun-runtime.js";
import { require_react_reconciler_production } from "../../vendor/react-reconciler/cjs/react-reconciler.production.js";
import {
  clearYogaNodeReferences,
  setStyleAndApplyLayout,
  setAccessibility,
  setAttribute,
  createNode,
  createTextNode,
  setTextNodeValue,
  markDirty,
  appendChildNode,
  insertBeforeNode,
  removeChildAndCleanup,
  diffProps,
  setTextStyles,
} from "./dom.js";
import { RAW_MODE_HANDLER_PROPS, EVENT_HANDLER_PROPS } from "./events/event-handlers.js";
import { Dispatcher } from "./events/dispatcher.js";
import { withTelemetryMessage } from "../utils/errors.js";
import { getFocusManager, getRootNode } from "./focus.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-2avr6cej.js:175058-175076 placement
var ReactReconcilerModule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-2avr6cej.js:175058", () => {
  ReactReconcilerModule = __toESM(require_react_reconciler_production(), 1);
});
//@ chunk-2avr6cej.js:194777-194858 fingerprint (2.1.88 match: cleanupYogaNode, 1)
/**
 * 释放节点的 yoga 子树：解除测量函数、清 yogaNode 引用、freeRecursive。
 */
var cleanupYogaNode = (node) => {
  let yogaNode = node.yogaNode;
  if (yogaNode) {
    yogaNode.unsetMeasureFunc();
    clearYogaNodeReferences(node);
    yogaNode.freeRecursive();
  }
};
//@ chunk-2avr6cej.js:194858-194940 fingerprint (2.1.88 match: setEventHandler, 1)
/**
 * 把事件处理器存进节点的 _eventHandlers（不放 attributes，避免改处理器触发重绘）。
 */
function setEventHandler(node, key, value) {
  if (!node._eventHandlers) node._eventHandlers = {};
  node._eventHandlers[key] = value;
}
//@ chunk-2avr6cej.js:194940-195041 layout (2.1.88 match: setEventHandler, 1)
/**
 * 节点是否挂了键盘/粘贴/滚轮处理器（需要 stdin 原始模式）。
 */
function hasRawModeHandler(node) {
  let _eventHandlers = node._eventHandlers;
  if (!_eventHandlers) return false;
  for (let propName of RAW_MODE_HANDLER_PROPS) if (_eventHandlers[propName] != null) return true;
  return false;
}
//@ chunk-2avr6cej.js:195041-195150 placement
/**
 * 根节点原始模式引用计数加减：已接上 setRawMode 时直接调用，否则先累计到 _pendingRawModeDelta。
 */
function adjustRawModeRef(root, delta) {
  if (root.setRawMode) root.setRawMode(delta > 0);
  else root._pendingRawModeDelta = (root._pendingRawModeDelta ?? 0) + delta;
}
//@ chunk-2avr6cej.js:195150-195248 placement
/**
 * 节点挂/卸原始模式处理器时同步引用：首次需要时 +1，不再需要时 -1。316 新增：只有真的有键盘/粘贴/滚轮处理器时才打开 stdin 原始模式。
 */
function syncRawModeRef(node, root) {
  let needsRaw = hasRawModeHandler(node);
  if (needsRaw === !!node._holdsRawModeRef) return;
  node._holdsRawModeRef = needsRaw;
  adjustRawModeRef(root, needsRaw ? 1 : -1);
}
//@ chunk-2avr6cej.js:195248-195376 placement (2.1.88 match: dropSubtreeCache, 0.851)
/**
 * 删除子树时归还其中持有的原始模式引用。
 */
function releaseRawModeRefs(node, root) {
  if (node._holdsRawModeRef) {
    node._holdsRawModeRef = false;
    adjustRawModeRef(root, -1);
  }
  for (let child of node.childNodes) if (child.nodeName !== "#text") releaseRawModeRefs(child, root);
}
//@ chunk-2avr6cej.js:195552-195750 fingerprint (2.1.88 match: applyProp, 0.823)
/**
 * 把一个 React 属性写到 DOM 节点：style→setStyleAndApplyLayout，textStyles 直接赋值，accessibility，事件处理器进 _eventHandlers，其余进 attributes。
 */
function applyProp(node, key, value) {
  if (key === "children") return;
  if (key === "style") {
    setStyleAndApplyLayout(node, value);
    return;
  }
  if (key === "textStyles") {
    node.textStyles = value;
    return;
  }
  if (key === "accessibility") {
    setAccessibility(node, value);
    return;
  }
  if (EVENT_HANDLER_PROPS.has(key)) {
    setEventHandler(node, key, value);
    return;
  }
  setAttribute(node, key, value);
}
//@ chunk-2avr6cej.js:195750-196021 fingerprint (2.1.88 match: getOwnerChain, 1)
/**
 * 沿 fiber 的 _debugOwner/return 链收集组件名（最多 50 层，去重相邻），用于错误信息和调试重绘。
 */
function getOwnerChain(fiber) {
  let chain = [];
  let seen = new Set();
  let cur = fiber;
  for (let i = 0; cur && i < 50; i++) {
    if (seen.has(cur)) break;
    seen.add(cur);
    let t = cur.elementType;
    let name =
      typeof t === "function"
        ? t.displayName || t.name
        : typeof t === "string"
          ? undefined
          : t?.displayName || t?.name;
    if (name && name !== chain.at(-1)) chain.push(name);
    cur = cur._debugOwner ?? cur.return;
  }
  return chain;
}
//@ chunk-2avr6cej.js:196021-196124 layout
/**
 * 把所有者链格式化成 " (owner chain: A > B)" 附在报错信息后。
 */
function formatOwnerChain(fiber) {
  try {
    let ownerChain = getOwnerChain(fiber);
    return ownerChain.length > 0 ? ` (owner chain: ${ownerChain.join(" > ")})` : "";
  } catch {
    return "";
  }
}
//@ chunk-2avr6cej.js:196124-199097 fingerprint (2.1.88 match: reconciler, 0.867)
/**
 * Ink 的 React reconciler（react-reconciler 宿主配置，mutation 模式、主渲染器）与事件分发器。要点：createInstance 时 <Box> 不能嵌在 <Text> 里、ink-text 嵌套变 ink-virtual-text；文字必须在 <Text> 内（报错信息带组件所有者链）；commitUpdate 只把变化的属性写回 DOM（样式差量写进 yoga）；hide/unhideInstance 用 display:none；resetAfterCommit 记录提交耗时并触发 onComputeLayout + onRender；更新优先级由 dispatcher 按当前事件类型决定；autoFocus 在 commitMount 时聚焦；挂上键盘/粘贴/滚轮处理器时同步 stdin 原始模式引用。
 */
var dispatcher; // deferred: uses Dispatcher (./events/dispatcher.js) of its import cycle while loading; runs once the cycle is complete
var reconciler;
var reconcilerAlias;
deferInit("chunk-2avr6cej.js:196124", () => {
  dispatcher = new Dispatcher((fn, a, b, c, d) => reconciler.discreteUpdates(fn, a, b, c, d));
  reconciler = ReactReconcilerModule.default({
    getRootHostContext: () => ({
      isInsideText: false,
    }),
    prepareForCommit: () => null,
    preparePortalMount: () => null,
    clearContainer: () => false,
    resetAfterCommit(container) {
      let scrollCommitStartedAt = container.scrollCommitStartedAt;
      container.lastCommitMs =
        scrollCommitStartedAt === undefined ? 0 : performance.now() - scrollCommitStartedAt;
      container.scrollCommitStartedAt = undefined;
      container.layoutStale = false;
      if (typeof container.onComputeLayout === "function") container.onComputeLayout();
      container.onRender?.();
    },
    getChildHostContext(parentHostContext, type) {
      let previousIsInsideText = parentHostContext.isInsideText;
      let isInsideText = type === "ink-text" || type === "ink-virtual-text" || type === "ink-link";
      if (previousIsInsideText === isInsideText) return parentHostContext;
      return {
        isInsideText,
      };
    },
    shouldSetTextContent: () => false,
    createInstance(originalType, newProps, root, hostContext, internalHandle) {
      if (hostContext.isInsideText && originalType === "ink-box")
        throw Error(`<Box> can't be nested inside <Text> component${formatOwnerChain(internalHandle)}`);
      let type = originalType === "ink-text" && hostContext.isInsideText ? "ink-virtual-text" : originalType;
      let node = createNode(type, root.yogaNode?.config);
      for (let [key, value] of Object.entries(newProps)) applyProp(node, key, value);
      syncRawModeRef(node, root);
      if (root.debugRepaints) node.debugOwnerChain = getOwnerChain(internalHandle);
      return node;
    },
    createTextInstance(text, _root, hostContext, fiber) {
      if (!hostContext.isInsideText) {
        let fiberOwner = formatOwnerChain(fiber);
        throw withTelemetryMessage(
          Error(`Text string "${text}" must be rendered inside <Text> component${fiberOwner}`),
          `Text string "<redacted: ${text.length} chars>" must be rendered inside <Text> component${fiberOwner}`,
        );
      }
      return createTextNode(text);
    },
    resetTextContent() {},
    hideTextInstance(node) {
      setTextNodeValue(node, "");
    },
    unhideTextInstance(node, text) {
      setTextNodeValue(node, text);
    },
    getPublicInstance: (instance) => instance,
    hideInstance(node) {
      node.isHidden = true;
      node.yogaNode?.setDisplay(1);
      markDirty(node);
    },
    unhideInstance(node) {
      node.isHidden = false;
      node.yogaNode?.setDisplay(0);
      markDirty(node);
    },
    appendInitialChild: appendChildNode,
    appendChild: appendChildNode,
    insertBefore: insertBeforeNode,
    finalizeInitialChildren(_node, _type, props) {
      return props.autoFocus === true;
    },
    commitMount(node) {
      getFocusManager(node).handleAutoFocus(node);
    },
    isPrimaryRenderer: true,
    supportsMutation: true,
    supportsPersistence: false,
    supportsHydration: false,
    scheduleTimeout: setTimeout,
    cancelTimeout: clearTimeout,
    noTimeout: -1,
    getCurrentUpdatePriority: () => dispatcher.currentUpdatePriority,
    beforeActiveInstanceBlur() {},
    afterActiveInstanceBlur() {},
    detachDeletedInstance() {},
    getInstanceFromNode: () => null,
    prepareScopeUpdate() {},
    getInstanceFromScope: () => null,
    appendChildToContainer: appendChildNode,
    insertInContainerBefore: insertBeforeNode,
    removeChildFromContainer: removeChildAndCleanup,
    commitUpdate(node, _type, oldProps, newProps) {
      let props = diffProps(oldProps, newProps);
      let style = false;
      if (props)
        for (let [key, value] of Object.entries(props)) {
          if (key === "style") {
            setStyleAndApplyLayout(node, value);
            continue;
          }
          if (key === "textStyles") {
            setTextStyles(node, value);
            continue;
          }
          if (key === "accessibility") {
            setAccessibility(node, value);
            continue;
          }
          if (EVENT_HANDLER_PROPS.has(key)) {
            setEventHandler(node, key, value);
            if (RAW_MODE_HANDLER_PROPS.has(key)) style = true;
            continue;
          }
          setAttribute(node, key, value);
        }
      if (style) syncRawModeRef(node, getRootNode(node));
      if (props?.autoFocus === true) getFocusManager(node).handleAutoFocus(node);
    },
    commitTextUpdate(node, _oldText, newText) {
      setTextNodeValue(node, newText);
    },
    removeChild: removeChildAndCleanup,
    maySuspendCommit() {
      return false;
    },
    preloadInstance() {
      return true;
    },
    startSuspendingCommit() {},
    suspendInstance() {},
    waitForCommitToBeReady() {
      return null;
    },
    NotPendingTransition: null,
    HostTransitionContext: {
      $$typeof: Symbol.for("react.context"),
      _currentValue: null,
    },
    setCurrentUpdatePriority(newPriority) {
      dispatcher.setCurrentUpdatePriority(newPriority);
    },
    resolveUpdatePriority() {
      return dispatcher.resolveEventPriority();
    },
    resetFormInstance() {},
    requestPostPaintCallback() {},
    shouldAttemptEagerTransition() {
      return false;
    },
    trackSchedulerEvent() {},
    resolveEventType() {
      return dispatcher.currentEvent?.type ?? null;
    },
    resolveEventTimeStamp() {
      return dispatcher.currentEvent?.timeStamp ?? -1.1;
    },
  });
  reconcilerAlias = reconciler;
});
//@ chunk-66b9fbd5.js:49872-50007 fingerprint
/**
 * 包装桥句柄的 teardown，使其同时拆掉标题同步/在线状态等辅助对象；句柄为空时直接拆辅助对象。
 */
function wrapTeardownWithPresence(handle, getPresence) {
  if (!handle) {
    getPresence()?.teardown();
    return null;
  }
  let originalTeardown = handle.teardown.bind(handle);
  handle.teardown = async (options) => {
    getPresence()?.teardown();
    await originalTeardown(options);
  };
  return handle;
}
export { cleanupYogaNode, releaseRawModeRefs, reconcilerAlias, dispatcher, wrapTeardownWithPresence };

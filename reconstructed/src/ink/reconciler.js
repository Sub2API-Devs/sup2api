/**
 * ink/reconciler.ts
 *
 * 并入已有模块：Ink reconciler 补充。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/ink/reconciler.ts
 * pieces: chunk-bzr73sfg.js (10), chunk-cg2r2hy6.js (1)
 * attribution: fingerprint 6, layout 2, placement 3
 */
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
import { ReactReconcilerModule } from "./line-width-cache.js";
import { withTelemetryMessage } from "../utils/errors.js";
import { getFocusManager, getRootNode } from "./focus.js";

/**
 * 释放节点的 yoga 子树：解除测量函数、清 yogaNode 引用、freeRecursive。
 */
//@ chunk-bzr73sfg.js:195131-195212 fingerprint = cleanupYogaNode (1)
var cleanupYogaNode = (node) => {
  let yogaNode = node.yogaNode;
  if (yogaNode) (yogaNode.unsetMeasureFunc(), clearYogaNodeReferences(node), yogaNode.freeRecursive());
};
/**
 * 把事件处理器存进节点的 _eventHandlers（不放 attributes，避免改处理器触发重绘）。
 */
//@ chunk-bzr73sfg.js:195212-195294 fingerprint = setEventHandler (1)
function setEventHandler(node, key, value) {
  if (!node._eventHandlers) node._eventHandlers = {};
  node._eventHandlers[key] = value;
}
/**
 * 节点是否挂了键盘/粘贴/滚轮处理器（需要 stdin 原始模式）。
 */
//@ chunk-bzr73sfg.js:195294-195395 layout = setEventHandler (1)
function hasRawModeHandler(node) {
  let _eventHandlers = node._eventHandlers;
  if (!_eventHandlers) return !1;
  for (let f of RAW_MODE_HANDLER_PROPS) if (_eventHandlers[f] != null) return !0;
  return !1;
}
/**
 * 根节点原始模式引用计数加减：已接上 setRawMode 时直接调用，否则先累计到 _pendingRawModeDelta。
 */
//@ chunk-bzr73sfg.js:195395-195504 placement
function adjustRawModeRef(root, delta) {
  if (root.setRawMode) root.setRawMode(delta > 0);
  else root._pendingRawModeDelta = (root._pendingRawModeDelta ?? 0) + delta;
}
/**
 * 节点挂/卸原始模式处理器时同步引用：首次需要时 +1，不再需要时 -1。316 新增：只有真的有键盘/粘贴/滚轮处理器时才打开 stdin 原始模式。
 */
//@ chunk-bzr73sfg.js:195504-195602 placement
function syncRawModeRef(node, root) {
  let needsRaw = hasRawModeHandler(node);
  if (needsRaw === !!node._holdsRawModeRef) return;
  ((node._holdsRawModeRef = needsRaw), adjustRawModeRef(root, needsRaw ? 1 : -1));
}
/**
 * 删除子树时归还其中持有的原始模式引用。
 */
//@ chunk-bzr73sfg.js:195602-195730 placement = dropSubtreeCache (0.851)
function releaseRawModeRefs(node, root) {
  if (node._holdsRawModeRef) ((node._holdsRawModeRef = !1), adjustRawModeRef(root, -1));
  for (let child of node.childNodes) if (child.nodeName !== "#text") releaseRawModeRefs(child, root);
}
/**
 * 把一个 React 属性写到 DOM 节点：style→setStyleAndApplyLayout，textStyles 直接赋值，accessibility，事件处理器进 _eventHandlers，其余进 attributes。
 */
//@ chunk-bzr73sfg.js:195906-196104 fingerprint = applyProp (0.823)
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
/**
 * 沿 fiber 的 _debugOwner/return 链收集组件名（最多 50 层，去重相邻），用于错误信息和调试重绘。
 */
//@ chunk-bzr73sfg.js:196104-196375 fingerprint = getOwnerChain (1)
function getOwnerChain(fiber) {
  let chain = [],
    seen = new Set(),
    cur = fiber;
  for (let p = 0; cur && p < 50; p++) {
    if (seen.has(cur)) break;
    seen.add(cur);
    let elementType = cur.elementType,
      name =
        typeof elementType === "function"
          ? elementType.displayName || elementType.name
          : typeof elementType === "string"
            ? void 0
            : elementType?.displayName || elementType?.name;
    if (name && name !== chain.at(-1)) chain.push(name);
    cur = cur._debugOwner ?? cur.return;
  }
  return chain;
}
/**
 * 把所有者链格式化成 " (owner chain: A > B)" 附在报错信息后。
 */
//@ chunk-bzr73sfg.js:196375-196478 layout
function formatOwnerChain(fiber) {
  try {
    let u = getOwnerChain(fiber);
    return u.length > 0 ? ` (owner chain: ${u.join(" > ")})` : "";
  } catch {
    return "";
  }
}
/**
 * Ink 的 React reconciler（react-reconciler 宿主配置，mutation 模式、主渲染器）与事件分发器。要点：createInstance 时 <Box> 不能嵌在 <Text> 里、ink-text 嵌套变 ink-virtual-text；文字必须在 <Text> 内（报错信息带组件所有者链）；commitUpdate 只把变化的属性写回 DOM（样式差量写进 yoga）；hide/unhideInstance 用 display:none；resetAfterCommit 记录提交耗时并触发 onComputeLayout + onRender；更新优先级由 dispatcher 按当前事件类型决定；autoFocus 在 commitMount 时聚焦；挂上键盘/粘贴/滚轮处理器时同步 stdin 原始模式引用。
 */
//@ chunk-bzr73sfg.js:196478-199445 fingerprint = reconciler (0.867)
var dispatcher = new Dispatcher((n, u, f, m, p) => reconciler.discreteUpdates(n, u, f, m, p)),
  reconciler = ReactReconcilerModule.default({
    getRootHostContext: () => ({ isInsideText: !1 }),
    prepareForCommit: () => null,
    preparePortalMount: () => null,
    clearContainer: () => !1,
    resetAfterCommit(n) {
      let scrollCommitStartedAt = n.scrollCommitStartedAt;
      if (
        ((n.lastCommitMs = scrollCommitStartedAt === void 0 ? 0 : performance.now() - scrollCommitStartedAt),
        (n.scrollCommitStartedAt = void 0),
        (n.layoutStale = !1),
        typeof n.onComputeLayout === "function")
      )
        n.onComputeLayout();
      n.onRender?.();
    },
    getChildHostContext(n, u) {
      let isInsideText = n.isInsideText,
        m = u === "ink-text" || u === "ink-virtual-text" || u === "ink-link";
      if (isInsideText === m) return n;
      return { isInsideText: m };
    },
    shouldSetTextContent: () => !1,
    createInstance(n, u, f, m, p) {
      if (m.isInsideText && n === "ink-box")
        throw Error(`<Box> can't be nested inside <Text> component${formatOwnerChain(p)}`);
      let g = n === "ink-text" && m.isInsideText ? "ink-virtual-text" : n,
        E = createNode(g, f.yogaNode?.config);
      for (let [T, A] of Object.entries(u)) applyProp(E, T, A);
      if ((syncRawModeRef(E, f), f.debugRepaints)) E.debugOwnerChain = getOwnerChain(p);
      return E;
    },
    createTextInstance(n, u, f, m) {
      if (!f.isInsideText) {
        let p = formatOwnerChain(m);
        throw withTelemetryMessage(
          Error(`Text string "${n}" must be rendered inside <Text> component${p}`),
          `Text string "<redacted: ${n.length} chars>" must be rendered inside <Text> component${p}`,
        );
      }
      return createTextNode(n);
    },
    resetTextContent() {},
    hideTextInstance(n) {
      setTextNodeValue(n, "");
    },
    unhideTextInstance(n, u) {
      setTextNodeValue(n, u);
    },
    getPublicInstance: (n) => n,
    hideInstance(n) {
      ((n.isHidden = !0), n.yogaNode?.setDisplay(1), markDirty(n));
    },
    unhideInstance(n) {
      ((n.isHidden = !1), n.yogaNode?.setDisplay(0), markDirty(n));
    },
    appendInitialChild: appendChildNode,
    appendChild: appendChildNode,
    insertBefore: insertBeforeNode,
    finalizeInitialChildren(n, u, f) {
      return f.autoFocus === !0;
    },
    commitMount(n) {
      getFocusManager(n).handleAutoFocus(n);
    },
    isPrimaryRenderer: !0,
    supportsMutation: !0,
    supportsPersistence: !1,
    supportsHydration: !1,
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
    commitUpdate(n, u, f, m) {
      let p = diffProps(f, m),
        g = !1;
      if (p)
        for (let [E, T] of Object.entries(p)) {
          if (E === "style") {
            setStyleAndApplyLayout(n, T);
            continue;
          }
          if (E === "textStyles") {
            setTextStyles(n, T);
            continue;
          }
          if (E === "accessibility") {
            setAccessibility(n, T);
            continue;
          }
          if (EVENT_HANDLER_PROPS.has(E)) {
            if ((setEventHandler(n, E, T), RAW_MODE_HANDLER_PROPS.has(E))) g = !0;
            continue;
          }
          setAttribute(n, E, T);
        }
      if (g) syncRawModeRef(n, getRootNode(n));
      if (p?.autoFocus === !0) getFocusManager(n).handleAutoFocus(n);
    },
    commitTextUpdate(n, u, f) {
      setTextNodeValue(n, f);
    },
    removeChild: removeChildAndCleanup,
    maySuspendCommit() {
      return !1;
    },
    preloadInstance() {
      return !0;
    },
    startSuspendingCommit() {},
    suspendInstance() {},
    waitForCommitToBeReady() {
      return null;
    },
    NotPendingTransition: null,
    HostTransitionContext: { $$typeof: Symbol.for("react.context"), _currentValue: null },
    setCurrentUpdatePriority(n) {
      dispatcher.setCurrentUpdatePriority(n);
    },
    resolveUpdatePriority() {
      return dispatcher.resolveEventPriority();
    },
    resetFormInstance() {},
    requestPostPaintCallback() {},
    shouldAttemptEagerTransition() {
      return !1;
    },
    trackSchedulerEvent() {},
    resolveEventType() {
      return dispatcher.currentEvent?.type ?? null;
    },
    resolveEventTimeStamp() {
      return dispatcher.currentEvent?.timeStamp ?? -1.1;
    },
  }),
  reconcilerAlias = reconciler;
/**
 * 包装桥句柄的 teardown，使其同时拆掉标题同步/在线状态等辅助对象；句柄为空时直接拆辅助对象。
 */
//@ chunk-cg2r2hy6.js:48603-48738 fingerprint
function wrapTeardownWithPresence(handle, getPresence) {
  if (!handle) return (getPresence()?.teardown(), null);
  let p = handle.teardown.bind(handle);
  return (
    (handle.teardown = async (o) => {
      (getPresence()?.teardown(), await p(o));
    }),
    handle
  );
}

export { dispatcher, cleanupYogaNode, releaseRawModeRefs, reconcilerAlias, wrapTeardownWithPresence };

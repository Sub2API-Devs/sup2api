/**
 * ink/inputSelectionBridge.tsx
 *
 * 2.1.316 新增：输入选择桥接。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-xe7zq1p4.js (12)
 * attribution: placement 12
 */
import { hitTest } from "./hit-test.js";
import { isKeybindingContext } from "../keybindings/schema.js";
import { KeybindingActionEvent } from "../keybindings/KeybindingProviderSetup.js";
import { dispatcher } from "./reconciler.js";
import {
  init_react_production,
  createContext,
  useRef,
  useContext,
} from "../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-xe7zq1p4.js:10469-10518 placement
/**
 * 带 attributes 的节点
 */
function isLayoutNodeLike(value) {
  return value !== null && "attributes" in value;
}
//@ chunk-xe7zq1p4.js:10518-10555 placement
/**
 * 节点或 undefined
 */
function asLayoutNode(value) {
  return isLayoutNodeLike(value) ? value : undefined;
}
//@ chunk-xe7zq1p4.js:10555-10759 placement
/**
 * 判断从某节点到祖先节点之间是否有处理滚轮事件的元素（可按坐标命中检测）。
 */
function hasWheelHandlerBetween(target, currentTarget, col, row) {
  let node = asLayoutNode(target);
  let stopNode = asLayoutNode(currentTarget);
  while (node && node !== stopNode) {
    if (
      node._eventHandlers?.onWheel &&
      (col === undefined ||
        row === undefined ||
        typeof node.attributes.tabIndex === "number" ||
        hitTest(node, col, row) !== null)
    )
      return true;
    node = node.parentNode;
  }
  return false;
}
//@ chunk-xe7zq1p4.js:10759-10900 placement
/**
 * 从节点向上收集各级的快捷键作用域。
 */
function getKeybindingScopes(target) {
  let scopes = [];
  let node = asLayoutNode(target);
  while (node) {
    let keybindingScope = node.attributes.keybindingScope;
    if (typeof keybindingScope === "string" && isKeybindingContext(keybindingScope))
      scopes.push(keybindingScope);
    node = node.parentNode;
  }
  return scopes;
}
//@ chunk-xe7zq1p4.js:10900-11020 placement
/**
 * 派发快捷键事件并返回是否被消费。
 */
function dispatchKeybindingEvent(target, sourceEvent, action, isChordCompletion, origin) {
  let event = new KeybindingActionEvent(action, {
    sourceEvent,
    isChordCompletion,
    origin,
  });
  dispatcher.dispatch(target, event);
  return event.consumed;
}
//@ chunk-xe7zq1p4.js:11020-11024 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-xe7zq1p4.js:11020", () => {
  init_react_production();
});
//@ chunk-xe7zq1p4.js:11024-11028 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-xe7zq1p4.js:11024", () => {
  init_react_production();
});
//@ chunk-xe7zq1p4.js:11028-11032 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-xe7zq1p4.js:11028", () => {
  init_react_production();
});
//@ chunk-xe7zq1p4.js:11032-11048 placement
/**
 * 输入选择桥接上下文
 */
var InputSelectionContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-xe7zq1p4.js:11032", () => {
  InputSelectionContext = createContext(null);
});
//@ chunk-xe7zq1p4.js:11048-11294 placement
/**
 * 提供输入选择桥接上下文（保存当前处理器）的 Provider 组件。
 */
function InputSelectionBridgeProvider(props) {
  let $ = useMemoCache(3);
  let { children } = props;
  let handlerRef = useRef(null);
  let contextValue;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    contextValue = {
      setHandler: (handler) => {
        handlerRef.current = handler;
      },
      tryDelete: (key) => handlerRef.current?.(key) ?? false,
    };
    $[0] = contextValue;
  } else contextValue = $[0];
  let value = contextValue;
  let providerElement;
  if ($[1] !== children) {
    providerElement = jsxProd_default(InputSelectionContext.Provider, {
      value,
      children,
    });
    $[1] = children;
    $[2] = providerElement;
  } else providerElement = $[2];
  return providerElement;
}
//@ chunk-xe7zq1p4.js:11294-11484 placement
/**
 * 读取输入选择桥接上下文，不在 Provider 内时抛错。
 */
function useInputSelectionBridge() {
  let contextValue = useContext(InputSelectionContext);
  if (!contextValue) {
    throw ReferenceError(
      "useInputSelectionBridge cannot be called outside of an <InputSelectionBridgeProvider /> (mounted by <AppStateProvider />)",
    );
  }
  return contextValue;
}
//@ chunk-xe7zq1p4.js:11484-11488 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-xe7zq1p4.js:11484", () => {
  init_react_production();
});
export {
  useInputSelectionBridge,
  InputSelectionBridgeProvider,
  getKeybindingScopes,
  asLayoutNode,
  dispatchKeybindingEvent,
  hasWheelHandlerBetween,
};

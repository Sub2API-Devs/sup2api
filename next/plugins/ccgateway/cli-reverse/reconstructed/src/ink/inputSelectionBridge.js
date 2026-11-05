/**
 * ink/inputSelectionBridge.tsx
 *
 * 2.1.316 新增：输入选择桥接。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-swe0kb5q.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-swe0kb5q.js:10488-10537 placement
/**
 * 带 attributes 的节点
 */
function isLayoutNodeLike(value) {
  return value !== null && "attributes" in value;
}
//@ chunk-swe0kb5q.js:10537-10574 placement
/**
 * 节点或 undefined
 */
function asLayoutNode(value) {
  return isLayoutNodeLike(value) ? value : undefined;
}
//@ chunk-swe0kb5q.js:10574-10778 placement
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
//@ chunk-swe0kb5q.js:10778-10919 placement
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
//@ chunk-swe0kb5q.js:10919-11040 placement
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
//@ chunk-swe0kb5q.js:11040-11044 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-swe0kb5q.js:11040", () => {
  init_react_production();
});
//@ chunk-swe0kb5q.js:11044-11048 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-swe0kb5q.js:11044", () => {
  init_react_production();
});
//@ chunk-swe0kb5q.js:11048-11052 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-swe0kb5q.js:11048", () => {
  init_react_production();
});
//@ chunk-swe0kb5q.js:11052-11068 placement
/**
 * 输入选择桥接上下文
 */
var InputSelectionContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-swe0kb5q.js:11052", () => {
  InputSelectionContext = createContext(null);
});
//@ chunk-swe0kb5q.js:11068-11314 placement
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
//@ chunk-swe0kb5q.js:11314-11504 placement
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
//@ chunk-swe0kb5q.js:11504-11508 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-swe0kb5q.js:11504", () => {
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

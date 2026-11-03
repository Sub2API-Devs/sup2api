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
import { init_react_production, qt, R, Se } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-xe7zq1p4.js:10469-10518 placement
/**
 * 带 attributes 的节点
 */
function isLayoutNodeLike(n) {
  return n !== null && "attributes" in n;
}
//@ chunk-xe7zq1p4.js:10518-10555 placement
/**
 * 节点或 undefined
 */
function asLayoutNode(n) {
  return isLayoutNodeLike(n) ? n : undefined;
}
//@ chunk-xe7zq1p4.js:10555-10759 placement
/**
 * 判断从某节点到祖先节点之间是否有处理滚轮事件的元素（可按坐标命中检测）。
 */
function hasWheelHandlerBetween(target, currentTarget, col, row) {
  let a = asLayoutNode(target);
  let c = asLayoutNode(currentTarget);
  while (a && a !== c) {
    if (
      a._eventHandlers?.onWheel &&
      (col === undefined ||
        row === undefined ||
        typeof a.attributes.tabIndex === "number" ||
        hitTest(a, col, row) !== null)
    )
      return true;
    a = a.parentNode;
  }
  return false;
}
//@ chunk-xe7zq1p4.js:10759-10900 placement
/**
 * 从节点向上收集各级的快捷键作用域。
 */
function getKeybindingScopes(target) {
  let r = [];
  let i = asLayoutNode(target);
  while (i) {
    let keybindingScope = i.attributes.keybindingScope;
    if (typeof keybindingScope === "string" && isKeybindingContext(keybindingScope)) r.push(keybindingScope);
    i = i.parentNode;
  }
  return r;
}
//@ chunk-xe7zq1p4.js:10900-11020 placement
/**
 * 派发快捷键事件并返回是否被消费。
 */
function dispatchKeybindingEvent(n, sourceEvent, action, isChordCompletion, origin) {
  let c = new KeybindingActionEvent(action, {
    sourceEvent,
    isChordCompletion,
    origin,
  });
  dispatcher.dispatch(n, c);
  return c.consumed;
}
//@ chunk-xe7zq1p4.js:11020-11024 placement
init_react_production();
//@ chunk-xe7zq1p4.js:11024-11028 placement
init_react_production();
//@ chunk-xe7zq1p4.js:11028-11032 placement
init_react_production();
//@ chunk-xe7zq1p4.js:11032-11048 placement
/**
 * 输入选择桥接上下文
 */
var InputSelectionContext = qt(null);
//@ chunk-xe7zq1p4.js:11048-11294 placement
/**
 * 提供输入选择桥接上下文（保存当前处理器）的 Provider 组件。
 */
function InputSelectionBridgeProvider(props) {
  let o = w(3);
  let { children } = props;
  let i = R(null);
  let a;
  if (o[0] === MEMO_CACHE_SENTINEL) {
    a = {
      setHandler: (c) => {
        i.current = c;
      },
      tryDelete: (b) => i.current?.(b) ?? false,
    };
    o[0] = a;
  } else a = o[0];
  let value = a;
  let T;
  if (o[1] !== children) {
    T = jsxProd_default(InputSelectionContext.Provider, {
      value,
      children,
    });
    o[1] = children;
    o[2] = T;
  } else T = o[2];
  return T;
}
//@ chunk-xe7zq1p4.js:11294-11484 placement
/**
 * 读取输入选择桥接上下文，不在 Provider 内时抛错。
 */
function useInputSelectionBridge() {
  let n = Se(InputSelectionContext);
  if (!n) {
    throw ReferenceError(
      "useInputSelectionBridge cannot be called outside of an <InputSelectionBridgeProvider /> (mounted by <AppStateProvider />)",
    );
  }
  return n;
}
//@ chunk-xe7zq1p4.js:11484-11488 placement
init_react_production();
export {
  useInputSelectionBridge,
  InputSelectionBridgeProvider,
  getKeybindingScopes,
  asLayoutNode,
  dispatchKeybindingEvent,
  hasWheelHandlerBetween,
};

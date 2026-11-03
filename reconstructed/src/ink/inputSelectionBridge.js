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
import { j, qt, R, Se } from "../../vendor/react/cjs/react.production.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";

//@ chunk-xe7zq1p4.js:10469-10518 placement
function Gt(n) {
  return n !== null && "attributes" in n;
}
//@ chunk-xe7zq1p4.js:10518-10555 placement
function ue(n) {
  return Gt(n) ? n : void 0;
}
/**
 * 判断从某节点到祖先节点之间是否有处理滚轮事件的元素（可按坐标命中检测）。
 */
//@ chunk-xe7zq1p4.js:10555-10759 placement
function hasWheelHandlerBetween(n, r, i, o) {
  let a = ue(n),
    c = ue(r);
  while (a && a !== c) {
    if (
      a._eventHandlers?.onWheel &&
      (i === void 0 || o === void 0 || typeof a.attributes.tabIndex === "number" || hitTest(a, i, o) !== null)
    )
      return !0;
    a = a.parentNode;
  }
  return !1;
}
/**
 * 从节点向上收集各级的快捷键作用域。
 */
//@ chunk-xe7zq1p4.js:10759-10900 placement
function getKeybindingScopes(n) {
  let r = [],
    i = ue(n);
  while (i) {
    let keybindingScope = i.attributes.keybindingScope;
    if (typeof keybindingScope === "string" && isKeybindingContext(keybindingScope)) r.push(keybindingScope);
    i = i.parentNode;
  }
  return r;
}
/**
 * 派发快捷键事件并返回是否被消费。
 */
//@ chunk-xe7zq1p4.js:10900-11020 placement
function dispatchKeybindingEvent(n, r, i, o, a) {
  let c = new KeybindingActionEvent(i, { sourceEvent: r, isChordCompletion: o, origin: a });
  return (dispatcher.dispatch(n, c), c.consumed);
}
//@ chunk-xe7zq1p4.js:11020-11024 placement
j();
//@ chunk-xe7zq1p4.js:11024-11028 placement
j();
//@ chunk-xe7zq1p4.js:11028-11032 placement
j();
//@ chunk-xe7zq1p4.js:11032-11048 placement
var de = qt(null);
/**
 * 提供输入选择桥接上下文（保存当前处理器）的 Provider 组件。
 */
//@ chunk-xe7zq1p4.js:11048-11294 placement
function InputSelectionBridgeProvider(n) {
  let o = w(3),
    { children: children } = n,
    i = R(null),
    a;
  if (o[0] === MEMO_CACHE_SENTINEL)
    ((a = {
      setHandler: (c) => {
        i.current = c;
      },
      tryDelete: (b) => i.current?.(b) ?? !1,
    }),
      (o[0] = a));
  else a = o[0];
  let M = a,
    T;
  if (o[1] !== children)
    ((T = e(de.Provider, { value: M, children: children })), (o[1] = children), (o[2] = T));
  else T = o[2];
  return T;
}
/**
 * 读取输入选择桥接上下文，不在 Provider 内时抛错。
 */
//@ chunk-xe7zq1p4.js:11294-11484 placement
function useInputSelectionBridge() {
  let n = Se(de);
  if (!n) {
    throw ReferenceError(
      "useInputSelectionBridge cannot be called outside of an <InputSelectionBridgeProvider /> (mounted by <AppStateProvider />)",
    );
  }
  return n;
}
//@ chunk-xe7zq1p4.js:11484-11488 placement
j();

export {
  useInputSelectionBridge,
  InputSelectionBridgeProvider,
  getKeybindingScopes,
  ue,
  dispatchKeybindingEvent,
  hasWheelHandlerBetween,
};

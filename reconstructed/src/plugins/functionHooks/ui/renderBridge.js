/**
 * plugins/functionHooks/ui/renderBridge.ts
 *
 * 钩子渲染与 local-jsx 的桥接（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (7)
 * attribution: placement 7
 */
import { createValueSlot } from "../../../utils/valueSlot.js";

//@ chunk-s61vbvea.js:15043-15106 placement
/**
 * 渲染桥接状态
 */
var newRenderBridgeState = () => ({
  installed: createValueSlot(),
  pending: new Set(),
  attached: new Map(),
});
//@ chunk-s61vbvea.js:15106-15198 placement
/**
 * 引擎元素
 */
var engineElement = (props) => ({
  props,
  rewritten: false,
  tree: {
    type: "engine",
    ref: 0,
  },
  clientModules: {},
  drawnBy: [],
});
//@ chunk-s61vbvea.js:15198-15968 placement
/**
 * 渲染门面：已安装实现时委托给它（run/press/input/select/client*），否则给默认结果；onInvalidate 在安装前暂存。
 */
var createRenderFacade = (renderBridgeState) => ({
  run: (n) => renderBridgeState.installed.get()?.run(n) ?? Promise.resolve(engineElement(n.props)),
  hooked: () => renderBridgeState.installed.get()?.hooked() ?? false,
  press: (n) => renderBridgeState.installed.get()?.press(n) ?? Promise.resolve(undefined),
  input: (n) => renderBridgeState.installed.get()?.input(n) ?? Promise.resolve(undefined),
  select: (n) => renderBridgeState.installed.get()?.select(n) ?? Promise.resolve(undefined),
  clientModule: (n) => renderBridgeState.installed.get()?.clientModule(n),
  clientPress: (n) => renderBridgeState.installed.get()?.clientPress(n) ?? Promise.resolve(undefined),
  clientMessage: (n) => renderBridgeState.installed.get()?.clientMessage(n) ?? Promise.resolve(undefined),
  clientFault: (n) => renderBridgeState.installed.get()?.clientFault(n) ?? Promise.resolve(undefined),
  onInvalidate: (n) => {
    let r = renderBridgeState.installed.get();
    if (r) return r.onInvalidate(n);
    renderBridgeState.pending.add(n);
    return () => {
      renderBridgeState.pending.delete(n);
      renderBridgeState.attached.get(n)?.();
      renderBridgeState.attached.delete(n);
    };
  },
});
//@ chunk-s61vbvea.js:15968-16125 placement
function createRenderBridge() {
  let renderBridgeState = newRenderBridgeState();
  return {
    install: (n) => {
      renderBridgeState.installed.set(n);
      for (let r of renderBridgeState.pending) renderBridgeState.attached.set(r, n.onInvalidate(r));
      renderBridgeState.pending.clear();
    },
    render: createRenderFacade(renderBridgeState),
  };
}
//@ chunk-s61vbvea.js:16125-16137 placement
/**
 * 渲染桥接
 */
var renderBridge = createRenderBridge();
//@ chunk-s61vbvea.js:16137-16165 placement
/**
 * 安装渲染桥接
 */
var installRenderBridge = (e) => {
  renderBridge.install(e);
};
//@ chunk-s61vbvea.js:16165-16183 placement
var render = renderBridge.render;
export { render, installRenderBridge, engineElement };

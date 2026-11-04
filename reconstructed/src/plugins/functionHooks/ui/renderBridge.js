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
  run: (request) =>
    renderBridgeState.installed.get()?.run(request) ?? Promise.resolve(engineElement(request.props)),
  hooked: () => renderBridgeState.installed.get()?.hooked() ?? false,
  press: (press) => renderBridgeState.installed.get()?.press(press) ?? Promise.resolve(undefined),
  input: (input) => renderBridgeState.installed.get()?.input(input) ?? Promise.resolve(undefined),
  select: (select) => renderBridgeState.installed.get()?.select(select) ?? Promise.resolve(undefined),
  clientModule: (client) => renderBridgeState.installed.get()?.clientModule(client),
  clientPress: (press) => renderBridgeState.installed.get()?.clientPress(press) ?? Promise.resolve(undefined),
  clientMessage: (message) =>
    renderBridgeState.installed.get()?.clientMessage(message) ?? Promise.resolve(undefined),
  clientFault: (fault) => renderBridgeState.installed.get()?.clientFault(fault) ?? Promise.resolve(undefined),
  onInvalidate: (listener) => {
    let installed = renderBridgeState.installed.get();
    if (installed) return installed.onInvalidate(listener);
    renderBridgeState.pending.add(listener);
    return () => {
      renderBridgeState.pending.delete(listener);
      renderBridgeState.attached.get(listener)?.();
      renderBridgeState.attached.delete(listener);
    };
  },
});
//@ chunk-s61vbvea.js:15968-16125 placement
function createRenderBridge() {
  let renderBridgeState = newRenderBridgeState();
  return {
    install: (bridge) => {
      renderBridgeState.installed.set(bridge);
      for (let listener of renderBridgeState.pending)
        renderBridgeState.attached.set(listener, bridge.onInvalidate(listener));
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
var installRenderBridge = (bridge) => {
  renderBridge.install(bridge);
};
//@ chunk-s61vbvea.js:16165-16183 placement
var render = renderBridge.render;
export { render, installRenderBridge, engineElement };

/**
 * plugins/functionHooks/ui/renderBridge.ts
 *
 * 钩子渲染与 local-jsx 的桥接（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (7)
 * attribution: placement 7
 */
import { createValueSlot } from "../../../utils/valueSlot.js";

//@ chunk-7jxyna5q.js:15786-15849 placement
/**
 * 渲染桥接状态
 */
var newRenderBridgeState = () => ({
  installed: createValueSlot(),
  pending: new Set(),
  attached: new Map(),
});
//@ chunk-7jxyna5q.js:15849-15941 placement
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
//@ chunk-7jxyna5q.js:15941-16711 placement
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
//@ chunk-7jxyna5q.js:16711-16868 placement
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
//@ chunk-7jxyna5q.js:16868-16880 placement
/**
 * 渲染桥接
 */
var renderBridge = createRenderBridge();
//@ chunk-7jxyna5q.js:16880-16908 placement
/**
 * 安装渲染桥接
 */
var installRenderBridge = (bridge) => {
  renderBridge.install(bridge);
};
//@ chunk-7jxyna5q.js:16908-16926 placement
var render = renderBridge.render;
export { render, installRenderBridge, engineElement };

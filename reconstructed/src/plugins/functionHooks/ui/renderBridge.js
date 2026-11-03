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
import { to } from "../../../utils/valueSlot.js";

//@ chunk-s61vbvea.js:15043-15106 placement
var nx = () => ({ installed: to(), pending: new Set(), attached: new Map() });
//@ chunk-s61vbvea.js:15106-15198 placement
var Uc = (e) => ({
  props: e,
  rewritten: !1,
  tree: { type: "engine", ref: 0 },
  clientModules: {},
  drawnBy: [],
});
/**
 * 渲染门面：已安装实现时委托给它（run/press/input/select/client*），否则给默认结果；onInvalidate 在安装前暂存。
 */
//@ chunk-s61vbvea.js:15198-15968 placement
var createRenderFacade = (e) => ({
  run: (n) => e.installed.get()?.run(n) ?? Promise.resolve(Uc(n.props)),
  hooked: () => e.installed.get()?.hooked() ?? !1,
  press: (n) => e.installed.get()?.press(n) ?? Promise.resolve(void 0),
  input: (n) => e.installed.get()?.input(n) ?? Promise.resolve(void 0),
  select: (n) => e.installed.get()?.select(n) ?? Promise.resolve(void 0),
  clientModule: (n) => e.installed.get()?.clientModule(n),
  clientPress: (n) => e.installed.get()?.clientPress(n) ?? Promise.resolve(void 0),
  clientMessage: (n) => e.installed.get()?.clientMessage(n) ?? Promise.resolve(void 0),
  clientFault: (n) => e.installed.get()?.clientFault(n) ?? Promise.resolve(void 0),
  onInvalidate: (n) => {
    let r = e.installed.get();
    if (r) return r.onInvalidate(n);
    return (
      e.pending.add(n),
      () => {
        (e.pending.delete(n), e.attached.get(n)?.(), e.attached.delete(n));
      }
    );
  },
});
//@ chunk-s61vbvea.js:15968-16125 placement
function createRenderBridge() {
  let e = nx();
  return {
    install: (n) => {
      e.installed.set(n);
      for (let r of e.pending) e.attached.set(r, n.onInvalidate(r));
      e.pending.clear();
    },
    render: createRenderFacade(e),
  };
}
//@ chunk-s61vbvea.js:16125-16137 placement
var ta = createRenderBridge();
//@ chunk-s61vbvea.js:16137-16165 placement
var dx = (e) => {
  ta.install(e);
};
//@ chunk-s61vbvea.js:16165-16183 placement
var render = ta.render;

export { render, dx, Uc };

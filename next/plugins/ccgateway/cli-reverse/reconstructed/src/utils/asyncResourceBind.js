/**
 * utils/asyncResourceBind.ts
 *
 * 2.1.316 新增：async_hooks 资源绑定辅助
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0777tkjc.js (1)
 * attribution: placement 1
 */
//@ chunk-0777tkjc.js:191-292 placement
var asyncHooksModule = globalThis.process?.getBuiltinModule?.("async_hooks");
var bindAsyncResource = asyncHooksModule ? (fn) => asyncHooksModule.AsyncResource.bind(fn) : (fn) => fn;
export { bindAsyncResource };

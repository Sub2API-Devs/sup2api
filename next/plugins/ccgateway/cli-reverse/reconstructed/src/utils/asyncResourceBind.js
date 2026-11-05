/**
 * utils/asyncResourceBind.ts
 *
 * 2.1.316 新增：async_hooks 资源绑定辅助
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ndkzc8d3.js (1)
 * attribution: placement 1
 */
//@ chunk-ndkzc8d3.js:191-293 placement
var asyncHooksModule = globalThis.process?.getBuiltinModule?.("async_hooks");
var bindAsyncResource = asyncHooksModule ? (fn) => asyncHooksModule.AsyncResource.bind(fn) : (fn) => fn;
export { bindAsyncResource };

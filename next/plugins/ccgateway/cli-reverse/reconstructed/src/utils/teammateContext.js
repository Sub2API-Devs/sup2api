/**
 * utils/teammateContext.ts
 *
 * 构造同进程 teammate 上下文（AsyncLocalStorage 中存放的身份对象）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/teammateContext.ts
 * pieces: chunk-fxf1mb10.js (1)
 * attribution: fingerprint 1
 */

//@ chunk-fxf1mb10.js:581-625 fingerprint (2.1.88 match: createTeammateContext, 1)
/**
 * 用配置构造 teammate 上下文并标 isInProcess=true。
 */
function createTeammateContext(config) {
  return {
    ...config,
    isInProcess: true,
  };
}
export { createTeammateContext };

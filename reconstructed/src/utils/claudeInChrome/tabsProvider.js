/**
 * utils/claudeInChrome/tabsProvider.ts
 *
 * 2.1.316 新增：Claude in Chrome 标签页提供者
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-cxfkxaw3.js (3)
 * attribution: placement 3
 */

//@ chunk-cxfkxaw3.js:191-202 placement
var r = null;
//@ chunk-cxfkxaw3.js:202-222 placement
function s2s(e) {
  r = e;
}
/**
 * 从外部注入的标签页提供者获取标签页列表（只保留有数字 tabId 与字符串 url 的项）。
 */
//@ chunk-cxfkxaw3.js:222-377 placement
async function listProvidedTabs() {
  if (r === null) return;
  let e = await r();
  return Array.isArray(e)
    ? e.filter((n) => typeof n?.tabId === "number" && typeof n?.url === "string")
    : void 0;
}

export { s2s, listProvidedTabs };

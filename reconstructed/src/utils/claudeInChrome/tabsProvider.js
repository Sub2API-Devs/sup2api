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
/**
 * 外部注入的标签页提供者函数。
 */
var providedTabsProvider = null;
//@ chunk-cxfkxaw3.js:202-222 placement
/**
 * 设置外部注入的标签页提供者。
 */
function setProvidedTabsProvider(e) {
  providedTabsProvider = e;
}
//@ chunk-cxfkxaw3.js:222-377 placement
/**
 * 从外部注入的标签页提供者获取标签页列表（只保留有数字 tabId 与字符串 url 的项）。
 */
async function listProvidedTabs() {
  if (providedTabsProvider === null) return;
  let e = await providedTabsProvider();
  return Array.isArray(e)
    ? e.filter((n) => typeof n?.tabId === "number" && typeof n?.url === "string")
    : undefined;
}
export { setProvidedTabsProvider, listProvidedTabs };

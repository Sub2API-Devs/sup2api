/**
 * utils/permissions/securityWarnings.ts
 *
 * 2.1.316 新增。安全警告。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-vqy2q2s8.js (4)
 * attribution: placement 4
 */
import { stringArray, uniq } from "../collections.js";
import { getGlobalConfig, saveGlobalConfig } from "../config.js";
import { logError } from "../log.js";

//@ chunk-vqy2q2s8.js:303-313 placement
var a = 256;
/**
 * 过滤掉全局配置里记为已看过的安全警告。
 */
//@ chunk-vqy2q2s8.js:313-434 placement
function filterUnseenSecurityWarnings(e) {
  let n = new Set(stringArray(getGlobalConfig().seenSecurityWarnings));
  return e.filter((r) => r.seenKey === void 0 || !n.has(r.seenKey));
}
/**
 * 把安全警告键加入全局配置的已看列表（去重，只保留最近若干条）。
 */
//@ chunk-vqy2q2s8.js:434-645 placement
function markSecurityWarningsSeen(e, n) {
  if (e.length === 0) return;
  saveGlobalConfig((r) => {
    let i = stringArray(r.seenSecurityWarnings),
      o = new Set(i),
      filtered = uniq(e).filter((s) => !o.has(s));
    if (filtered.length === 0) return r;
    return { ...r, seenSecurityWarnings: [...i, ...filtered].slice(-a) };
  }, n);
}
/**
 * 动态加载工具与规则模块，收集磁盘上权限规则的建议提示行并去重；出错时返回空数组。
 */
//@ chunk-vqy2q2s8.js:645-938 placement
async function collectPermissionRuleWarningLines() {
  try {
    let [
      { getAllBaseTools: e },
      { collectPermissionRuleAdvisories: n },
      { loadAllPermissionRulesFromDisk: r },
    ] = await Promise.all([
      import("./chunk-swszrtvp.js"),
      import("./chunk-x38v0jj9.js"),
      import("./chunk-8qwkkc63.js"),
    ]);
    return uniq(n(r(), e).map((i) => i.line));
  } catch (error) {
    return (logError(error), []);
  }
}

export { collectPermissionRuleWarningLines, markSecurityWarningsSeen, filterUnseenSecurityWarnings };

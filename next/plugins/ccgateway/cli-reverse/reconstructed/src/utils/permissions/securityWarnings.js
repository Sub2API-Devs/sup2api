/**
 * utils/permissions/securityWarnings.ts
 *
 * 2.1.316 新增。安全警告。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hqedtyh4.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { stringArray } from "../collections.js";
import { getGlobalConfig, saveGlobalConfig } from "../config.js";
import { normalizeCaseForComparison_2 } from "./filesystem.js";
import { logError } from "../log.js";

//@ chunk-hqedtyh4.js:303-313 placement
var MAX_SEEN_SECURITY_WARNINGS = 256;
//@ chunk-hqedtyh4.js:313-434 placement
/**
 * 过滤掉全局配置里记为已看过的安全警告。
 */
function filterUnseenSecurityWarnings(warnings) {
  let seen = new Set(stringArray(getGlobalConfig().seenSecurityWarnings));
  return warnings.filter((warning) => warning.seenKey === undefined || !seen.has(warning.seenKey));
}
//@ chunk-hqedtyh4.js:434-645 placement
/**
 * 把安全警告键加入全局配置的已看列表（去重，只保留最近若干条）。
 */
function markSecurityWarningsSeen(keys, storageV5) {
  if (keys.length === 0) return;
  saveGlobalConfig((config) => {
    let existing = stringArray(config.seenSecurityWarnings);
    let known = new Set(existing);
    let filtered = normalizeCaseForComparison_2(keys).filter((key) => !known.has(key));
    if (filtered.length === 0) return config;
    return {
      ...config,
      seenSecurityWarnings: [...existing, ...filtered].slice(-MAX_SEEN_SECURITY_WARNINGS),
    };
  }, storageV5);
}
//@ chunk-hqedtyh4.js:645-938 placement
/**
 * 动态加载工具与规则模块，收集磁盘上权限规则的建议提示行并去重；出错时返回空数组。
 */
async function collectPermissionRuleWarningLines() {
  try {
    let [
      { getAllBaseTools },
      { collectPermissionRuleAdvisories: collectAdvisories },
      { loadAllPermissionRulesFromDisk: loadAllRules },
    ] = await Promise.all([
      import("../../tools.js"),
      import("./permissionSetup.js"),
      import("./permissionsLoader.js"),
    ]);
    return normalizeCaseForComparison_2(
      collectAdvisories(loadAllRules(), getAllBaseTools).map((warning) => warning.line),
    );
  } catch (error) {
    logError(error);
    return [];
  }
}
export { collectPermissionRuleWarningLines, filterUnseenSecurityWarnings, markSecurityWarningsSeen };

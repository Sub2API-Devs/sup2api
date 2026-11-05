/**
 * utils/hooks/hooksPolicy.ts
 *
 * 2.1.316 新增：hooks 策略：按设置来源决定哪些 hooks 可运行（托管优先、不可读的处理）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ybq8sbnv.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isSafeMode } from "../envUtils.js";
import { getSettingsForSource } from "../settings/settings.js";

//@ chunk-ybq8sbnv.js:2563-2638 placement (2.1.88 match: _temp2, 1)
/**
 * 判断是否处于"仅托管钩子"模式（安全模式或策略设置）。
 */
function isManagedHooksOnlyMode() {
  return isSafeMode() || getSettingsForSource("policySettings")?.allowManagedHooksOnly === true;
}
export { isManagedHooksOnlyMode };

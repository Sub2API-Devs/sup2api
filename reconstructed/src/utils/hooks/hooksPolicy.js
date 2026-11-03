/**
 * utils/hooks/hooksPolicy.ts
 *
 * 2.1.316 新增：hooks 策略：按设置来源决定哪些 hooks 可运行（托管优先、不可读的处理）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-2jdf5m4m.js (1)
 * attribution: placement 1
 */
import { isSafeMode } from "../envUtils.js";
import { getSettingsForSource } from "../settings/settings.js";

//@ chunk-2jdf5m4m.js:2564-2639 placement = _temp2 (1)
function k() {
  return isSafeMode() || getSettingsForSource("policySettings")?.allowManagedHooksOnly === !0;
}

export { k };

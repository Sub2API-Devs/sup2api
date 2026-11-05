/**
 * services/tips/orgTips.ts
 *
 * 2.1.316 新增：组织提示
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5j1n9yg4.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { HostScoped } from "../../utils/hostScoped.js";
import { ORG_TIP, CUSTOM_TIP } from "./spinnerTipsOverride.js";
import { lit, fromSanitizer_SANITIZER_OUTPUT_ONLY } from "../analytics/safeMetadata.js";
import { parsePluginIdentifier_2 } from "../../utils/plugins/pluginIdentifier.js";
import { CLAUDE_PLUGINS_OFFICIAL } from "../../utils/plugins/officialMarketplace.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5j1n9yg4.js:649-910 placement
class TipSeat {
  seated = undefined;
  picker = undefined;
  seat(seated) {
    this.seated = seated;
  }
  vacate(tip) {
    if (this.seated === tip) this.seated = undefined;
  }
  current() {
    return this.seated;
  }
  install(picker) {
    this.picker = picker;
  }
  pickDue() {
    if (this.picker === undefined || this.seated === undefined) return false;
    this.picker(this.seated);
    return true;
  }
}
//@ chunk-5j1n9yg4.js:910-935 placement
/**
 * 按席位保存的组织提示状态。
 */
var tipSeatSlots; // deferred: uses TipSeat of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5j1n9yg4.js:910", () => {
  tipSeatSlots = new HostScoped(() => new TipSeat());
});
//@ chunk-5j1n9yg4.js:935-988 placement
/**
 * 惰性加载提示注册表模块。
 */
function loadTipRegistryModule() {
  return require("./MARKETPLACE_PLUGIN_TIP_ID_PREFIX.lazy.js");
}
//@ chunk-5j1n9yg4.js:988-1297 placement
/**
 * 返回用于打点的提示 id：组织/自定义提示为 org-tip；市场插件提示只有官方市场的保留原 id，否则为 org-marketplace；内置提示保留原 id；其他为 other。
 */
function getTipTelemetryId(tip) {
  if (tip.id.startsWith(ORG_TIP) || tip.id.startsWith(CUSTOM_TIP)) return lit("org-tip");
  let { isBuiltInTipId, MARKETPLACE_PLUGIN_TIP_ID_PREFIX } = loadTipRegistryModule();
  if (tip.id.startsWith(MARKETPLACE_PLUGIN_TIP_ID_PREFIX))
    return tip.pluginId !== undefined &&
      parsePluginIdentifier_2(tip.pluginId).marketplace === CLAUDE_PLUGINS_OFFICIAL
      ? fromSanitizer_SANITIZER_OUTPUT_ONLY(tip.id)
      : lit("marketplace-plugin:org-marketplace");
  return isBuiltInTipId(tip.id) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(tip.id) : lit("other");
}
//@ chunk-5j1n9yg4.js:3206-3231 placement
var CC_PLUGIN_TIPS = "cc-plugin-tips";
export { getTipTelemetryId, CC_PLUGIN_TIPS, loadTipRegistryModule, tipSeatSlots };

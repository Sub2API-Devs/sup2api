/**
 * services/tips/orgTips.ts
 *
 * 2.1.316 新增：组织提示
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s8af6efx.js (5)
 * attribution: placement 5
 */
import { HostScoped } from "../../utils/hostScoped.js";
import { ORG_TIP, CUSTOM_TIP } from "./spinnerTipsOverride.js";
import { lit, fromSanitizer_SANITIZER_OUTPUT_ONLY } from "../analytics/safeMetadata.js";
import { parsePluginIdentifier_2 } from "../../utils/plugins/pluginIdentifier.js";
import { CLAUDE_PLUGINS_OFFICIAL } from "../../utils/plugins/officialMarketplace.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-s8af6efx.js:645-906 placement
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
//@ chunk-s8af6efx.js:906-931 placement
/**
 * 按席位保存的组织提示状态。
 */
var tipSeatSlots; // deferred: uses TipSeat of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s8af6efx.js:906", () => {
  tipSeatSlots = new HostScoped(() => new TipSeat());
});
//@ chunk-s8af6efx.js:931-984 placement
/**
 * 惰性加载提示注册表模块。
 */
function loadTipRegistryModule() {
  return require("./MARKETPLACE_PLUGIN_TIP_ID_PREFIX.lazy.js");
}
//@ chunk-s8af6efx.js:984-1293 placement
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
//@ chunk-s8af6efx.js:2935-2960 placement
var CC_PLUGIN_TIPS = "cc-plugin-tips";
export { CC_PLUGIN_TIPS, loadTipRegistryModule, tipSeatSlots, getTipTelemetryId };

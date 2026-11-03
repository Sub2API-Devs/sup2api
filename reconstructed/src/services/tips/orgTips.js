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

//@ chunk-s8af6efx.js:645-906 placement
class TipSeat {
  seated = void 0;
  picker = void 0;
  seat(e) {
    this.seated = e;
  }
  vacate(e) {
    if (this.seated === e) this.seated = void 0;
  }
  current() {
    return this.seated;
  }
  install(e) {
    this.picker = e;
  }
  pickDue() {
    if (this.picker === void 0 || this.seated === void 0) return !1;
    return (this.picker(this.seated), !0);
  }
}
//@ chunk-s8af6efx.js:906-931 placement
var B$t = new HostScoped(() => new TipSeat());
//@ chunk-s8af6efx.js:931-984 placement
function j$t() {
  return require("./chunk-4t8fx0s8.js");
}
/**
 * 返回用于打点的提示 id：组织/自定义提示为 org-tip；市场插件提示只有官方市场的保留原 id，否则为 org-marketplace；内置提示保留原 id；其他为 other。
 */
//@ chunk-s8af6efx.js:984-1293 placement
function getTipTelemetryId(e) {
  if (e.id.startsWith(ORG_TIP) || e.id.startsWith(CUSTOM_TIP)) return lit("org-tip");
  let { isBuiltInTipId: isBuiltInTipId, MARKETPLACE_PLUGIN_TIP_ID_PREFIX: MARKETPLACE_PLUGIN_TIP_ID_PREFIX } =
    j$t();
  if (e.id.startsWith(MARKETPLACE_PLUGIN_TIP_ID_PREFIX))
    return e.pluginId !== void 0 &&
      parsePluginIdentifier_2(e.pluginId).marketplace === CLAUDE_PLUGINS_OFFICIAL
      ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e.id)
      : lit("marketplace-plugin:org-marketplace");
  return isBuiltInTipId(e.id) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(e.id) : lit("other");
}
//@ chunk-s8af6efx.js:2935-2960 placement
var CC_PLUGIN_TIPS = "cc-plugin-tips";

export { CC_PLUGIN_TIPS, j$t, B$t, getTipTelemetryId };

/**
 * tools/PluginSearchTool/pluginSkillToolGate.ts
 *
 * 2.1.316 新增。插件技能搜索工具是否可用（组织策略 allow_plugin_skill_search、HIPAA）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-dbbfk5a2.js (5)
 * attribution: placement 5
 */
import { policyDenyKind } from "../../services/policyLimits/policyVerdicts.js";
import { hasComplianceTaint } from "../../services/policyLimits/complianceTaints.js";
import { gHe } from "../../utils/remoteSessionEnv.js";
import { isTopHostSession } from "../../utils/sessionShape.js";
import { isFirstPartyProvider } from "../../utils/model/providers.js";
import { zrr } from "../pluginDiscoveryToolNames.js";

//@ chunk-dbbfk5a2.js:376-459 placement
class r {
  reader = void 0;
  register(e) {
    this.reader = e;
  }
  read() {
    return this.reader?.() ?? !1;
  }
}
//@ chunk-dbbfk5a2.js:459-471 placement
var o = new r();
//@ chunk-dbbfk5a2.js:471-501 placement
function _registerSuggestRolloutPinReader(e) {
  o.register(e);
}
/**
 * 插件技能搜索工具是否可用（组织策略 allow_plugin_skill_search、HIPAA）。
 */
//@ chunk-dbbfk5a2.js:501-687 placement
function isPluginSkillToolEnabled() {
  let e = policyDenyKind("allow_plugin_skill_search");
  if (
    e === "org_denied" ||
    e === "latched" ||
    e === "unregistered" ||
    (e !== null && hasComplianceTaint("hipaa"))
  )
    return !1;
  if (gHe()) return !0;
  return isTopHostSession() && isFirstPartyProvider() && o.read();
}
//@ chunk-dbbfk5a2.js:687-745 placement
function isPluginSkillToolAdvertised(e) {
  if (!zrr.includes(e)) return !0;
  return isPluginSkillToolEnabled();
}

export { isPluginSkillToolEnabled, _registerSuggestRolloutPinReader };

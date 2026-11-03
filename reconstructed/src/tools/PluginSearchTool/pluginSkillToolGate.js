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
import { isRemoteFirstPartySession } from "../../utils/remoteSessionEnv.js";
import { isTopHostSession } from "../../utils/sessionShape.js";
import { isFirstPartyProvider } from "../../utils/model/providers.js";
import { PLUGIN_DISCOVERY_SEARCH_TOOL_NAMES } from "../pluginDiscoveryToolNames.js";

//@ chunk-dbbfk5a2.js:376-459 placement
/**
 * 保存一个“读取建议灰度固定值”回调的小容器，可注册后读取。
 */
class SuggestRolloutPinReader {
  reader = undefined;
  register(reader) {
    this.reader = reader;
  }
  read() {
    return this.reader?.() ?? false;
  }
}
//@ chunk-dbbfk5a2.js:459-471 placement
/**
 * 全局唯一的建议灰度固定值读取器实例。
 */
var suggestRolloutPinReader = new SuggestRolloutPinReader();
//@ chunk-dbbfk5a2.js:471-501 placement
function _registerSuggestRolloutPinReader(isSuggestRolloutEnabled) {
  suggestRolloutPinReader.register(isSuggestRolloutEnabled);
}
//@ chunk-dbbfk5a2.js:501-687 placement
/**
 * 插件技能搜索工具是否可用（组织策略 allow_plugin_skill_search、HIPAA）。
 */
function isPluginSkillToolEnabled() {
  let e = policyDenyKind("allow_plugin_skill_search");
  if (
    e === "org_denied" ||
    e === "latched" ||
    e === "unregistered" ||
    (e !== null && hasComplianceTaint("hipaa"))
  )
    return false;
  if (isRemoteFirstPartySession()) return true;
  return isTopHostSession() && isFirstPartyProvider() && suggestRolloutPinReader.read();
}
//@ chunk-dbbfk5a2.js:687-745 placement
function isPluginSkillToolAdvertised(e) {
  if (!PLUGIN_DISCOVERY_SEARCH_TOOL_NAMES.includes(e)) return true;
  return isPluginSkillToolEnabled();
}
export { isPluginSkillToolEnabled, _registerSuggestRolloutPinReader };

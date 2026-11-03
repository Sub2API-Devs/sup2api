/**
 * utils/permissions/bashClassifier.ts
 *
 * 汇总 deny 规则串供分类器提示词使用；另一项是 sandbox-runtime 的第三方函数误归。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/bashClassifier.ts
 * pieces: chunk-e6aww6q8.js (1), chunk-s4bxxzsw.js (1)
 * attribution: fingerprint 2
 */
import { permissionRuleValueFromString } from "./permissionRuleParser.js";
import { PERMISSION_CARD_REGISTRY } from "../../components/permissions/permissionCardRegistry.js";

/**
 * 汇总 alwaysDenyRules 中所有规则串（去重），跳过 toolsNarrowing/command 来源和 "prompt:" 内容的规则，供分类器提示词使用。
 */
//@ chunk-e6aww6q8.js:2916203-2916427 fingerprint = PROMPT_PREFIX (0.483)
function collectDenyRuleStringsForClassifier(context) {
  let ruleStrings = new Set();
  for (let [r, s] of Object.entries(context.alwaysDenyRules)) {
    if (r === "toolsNarrowing" || r === "command") continue;
    for (let h of s ?? []) {
      if (permissionRuleValueFromString(h).ruleContent?.startsWith("prompt:")) continue;
      ruleStrings.add(h);
    }
  }
  return [...ruleStrings];
}
//@ chunk-s4bxxzsw.js:45959-46009 fingerprint = classifyBashCommand (0.426)
function classifyBashCommand(e) {
  return PERMISSION_CARD_REGISTRY.find((r) => r.matches(e));
}

export { classifyBashCommand, collectDenyRuleStringsForClassifier };

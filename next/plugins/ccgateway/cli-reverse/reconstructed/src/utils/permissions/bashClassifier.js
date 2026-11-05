/**
 * utils/permissions/bashClassifier.ts
 *
 * 汇总 deny 规则串供分类器提示词使用；另一项是 sandbox-runtime 的第三方函数误归。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/bashClassifier.ts
 * pieces: chunk-5xgkngpb.js (1), chunk-g4tsxwy3.js (1)
 * attribution: fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { parseRuleString } from "./permissionRuleParser.js";
import { PERMISSION_CARD_REGISTRY } from "../../components/permissions/permissionCardRegistry.js";

//@ chunk-5xgkngpb.js:2985769-2985993 fingerprint (2.1.88 match: PROMPT_PREFIX, 0.484)
/**
 * 汇总 alwaysDenyRules 中所有规则串（去重），跳过 toolsNarrowing/command 来源和 "prompt:" 内容的规则，供分类器提示词使用。
 */
function collectDenyRuleStringsForClassifier(context) {
  let ruleStrings = new Set();
  for (let [key, value] of Object.entries(context.alwaysDenyRules)) {
    if (key === "toolsNarrowing" || key === "command") continue;
    for (let ruleString of value ?? []) {
      if (parseRuleString(ruleString).ruleContent?.startsWith("prompt:")) continue;
      ruleStrings.add(ruleString);
    }
  }
  return [...ruleStrings];
}
//@ chunk-g4tsxwy3.js:46222-46272 fingerprint (2.1.88 match: classifyBashCommand, 0.426)
function classifyBashCommand(tool) {
  return PERMISSION_CARD_REGISTRY.find((card) => card.matches(tool));
}
export { classifyBashCommand, collectDenyRuleStringsForClassifier };

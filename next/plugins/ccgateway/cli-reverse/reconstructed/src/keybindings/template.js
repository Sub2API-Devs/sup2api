/**
 * keybindings/template.ts
 *
 * 生成 keybindings.json 模板（/keybindings 命令用）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/keybindings/template.ts
 * pieces: chunk-k9jq5tr2.js (2)
 * attribution: callgraph-fingerprint 1, fingerprint 1
 */
import { NON_REBINDABLE, normalizeKeyForComparison } from "./reservedShortcuts.js";
import { TEMPLATE_EXCLUDED_CONTEXTS } from "./schema.js";
import { DEFAULT_BINDINGS } from "./defaultBindings.js";
import { isEffortHintFlagOn } from "../utils/effort.js";
import { import_reject } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { jsonStringify } from "../utils/slowOperations.js";

//@ chunk-k9jq5tr2.js:4255-4489 callgraph-fingerprint (2.1.88 match: filterReservedShortcuts, 1)
/**
 * 从模板里去掉不可重绑的保留键（X5e）；空块整个丢弃。
 */
function filterReservedShortcuts(blocks) {
  let reservedKeys = new Set(NON_REBINDABLE.map((reserved) => normalizeKeyForComparison(reserved.key)));
  return blocks
    .map((block) => {
      let filteredBindings = {};
      for (let [key, action] of Object.entries(block.bindings))
        if (!reservedKeys.has(normalizeKeyForComparison(key))) filteredBindings[key] = action;
      return {
        context: block.context,
        bindings: filteredBindings,
      };
    })
    .filter((block) => Object.keys(block.bindings).length > 0);
}
//@ chunk-k9jq5tr2.js:4489-4822 fingerprint (2.1.88 match: generateKeybindingsTemplate, 0.788)
/**
 * 生成 keybindings.json 模板：$schema（schemastore）、$docs、去掉 FeedbackSurvey 等内部上下文和保留键后的默认绑定；effort 调节未开放时删掉 chat:increaseEffort/decreaseEffort。
 */
function generateKeybindingsTemplate() {
  let excludedContexts = TEMPLATE_EXCLUDED_CONTEXTS;
  let bindings = filterReservedShortcuts(
    DEFAULT_BINDINGS.filter((block) => !excludedContexts.includes(block.context)),
  );
  let config = {
    $schema: "https://www.schemastore.org/claude-code-keybindings.json",
    $docs: "https://code.claude.com/docs/en/keybindings",
    bindings: isEffortHintFlagOn()
      ? bindings
      : bindings.map((binding) => ({
          ...binding,
          bindings: import_reject(
            binding.bindings,
            (action) => action === "chat:increaseEffort" || action === "chat:decreaseEffort",
          ),
        })),
  };
  return (
    jsonStringify(config, null, 2) +
    `
`
  );
}
export { generateKeybindingsTemplate };

/**
 * keybindings/template.ts
 *
 * 生成 keybindings.json 模板（/keybindings 命令用）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/keybindings/template.ts
 * pieces: chunk-1nat7wre.js (2)
 * attribution: callgraph-fingerprint 1, fingerprint 1
 */
import { NON_REBINDABLE } from "./reservedShortcuts.js";
import { normalizeKeyForComparison } from "./parser.js";
import { TEMPLATE_EXCLUDED_CONTEXTS } from "./schema.js";
import { DEFAULT_BINDINGS } from "./defaultBindings.js";
import { isEffortHintFlagOn } from "../utils/effort.js";
import { wi } from "../../vendor/lodash-es/_inlinedHelpers.js";
import { jsonStringify } from "../utils/slowOperations.js";

//@ chunk-1nat7wre.js:3947-4181 callgraph-fingerprint = filterReservedShortcuts (1)
/**
 * 从模板里去掉不可重绑的保留键（X5e）；空块整个丢弃。
 */
function filterReservedShortcuts(blocks) {
  let reservedKeys = new Set(NON_REBINDABLE.map((e) => normalizeKeyForComparison(e.key)));
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
//@ chunk-1nat7wre.js:4181-4514 fingerprint = generateKeybindingsTemplate (0.789)
/**
 * 生成 keybindings.json 模板：$schema（schemastore）、$docs、去掉 FeedbackSurvey 等内部上下文和保留键后的默认绑定；effort 调节未开放时删掉 chat:increaseEffort/decreaseEffort。
 */
function generateKeybindingsTemplate() {
  let s = TEMPLATE_EXCLUDED_CONTEXTS;
  let bindings = filterReservedShortcuts(DEFAULT_BINDINGS.filter((t) => !s.includes(t.context)));
  let config = {
    $schema: "https://www.schemastore.org/claude-code-keybindings.json",
    $docs: "https://code.claude.com/docs/en/keybindings",
    bindings: isEffortHintFlagOn()
      ? bindings
      : bindings.map((binding) => ({
          ...binding,
          bindings: wi(binding.bindings, (r) => r === "chat:increaseEffort" || r === "chat:decreaseEffort"),
        })),
  };
  return (
    jsonStringify(config, null, 2) +
    `
`
  );
}
export { generateKeybindingsTemplate };

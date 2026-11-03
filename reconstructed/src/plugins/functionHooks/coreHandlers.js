/**
 * plugins/functionHooks/coreHandlers.ts
 *
 * 2.1.316 新增：各钩子事件链底部的核心处理器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (19)
 * attribution: placement 18, layout 1
 */
import { UI_ENV_SITE_RULES, SESSION_SITE_NAMES } from "./sites/siteRules.js";
import { lp } from "./surfaceBinding.js";
import { promptComposer } from "./promptComposition.js";
import { pu } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";

//@ chunk-e6aww6q8.js:58779-58983 placement
var TEXT_PASSTHROUGH_CORES = {
  "prompt.section": (e) => ({ text: e.text }),
  "prompt.attachment": (e) => ({ text: e.text }),
  "skill.prompt": (e) => ({ text: e.text }),
  "attribution.text": (e) => ({ text: e.text }),
  "session.receive": (e) => ({ text: e.text }),
};
//@ chunk-e6aww6q8.js:58983-59071 placement
var gh = (e, n) => ({
  site: UI_ENV_SITE_RULES[e],
  core: { name: "core", isCore: !0, budgetMs: 0, run: async (r) => n(r) },
});
//@ chunk-e6aww6q8.js:59071-59096 placement
var eA = (e) => gh(e, TEXT_PASSTHROUGH_CORES[e]);
//@ chunk-e6aww6q8.js:59263-59353 placement = toggleTeammateVisibility (0.659)
var defaultDescribe = (e) => ({
  description: e.description,
  argumentHint: e.argumentHint,
  isHidden: e.isHidden,
});
//@ chunk-e6aww6q8.js:59353-59451 layout
var Ale = {
  site: UI_ENV_SITE_RULES["command.describe"],
  core: { name: "core", isCore: !0, budgetMs: 0, run: async (e) => defaultDescribe(e) },
};
//@ chunk-e6aww6q8.js:59451-59528 placement
var xle = (e) => ({ label: e.label, description: e.description, isHidden: e.isHidden });
//@ chunk-e6aww6q8.js:59528-59625 placement
var B1 = {
  site: UI_ENV_SITE_RULES["config.describe"],
  core: { name: "core", isCore: !0, budgetMs: 0, run: async (e) => xle(e) },
};
//@ chunk-e6aww6q8.js:59625-59657 placement
var Ple = eA("prompt.attachment");
//@ chunk-e6aww6q8.js:59657-59714 placement
var Ole = gh("prompt.autocomplete", () => ({ suggestions: [] }));
//@ chunk-e6aww6q8.js:59714-59739 placement
var RS = (e) => gh(e, SESSION_SITE_NAMES[e]);
//@ chunk-e6aww6q8.js:59739-59767 placement
var Lle = RS("prompt.change");
/**
 * prompt.compose 的核心实现：用当前工具与模型生成独立的提示词分段。
 */
//@ chunk-e6aww6q8.js:59767-59899 placement
async function composeDetachedSections(e, n) {
  let r = lp(),
    s = r && { tools: r.tools(), model: r.model() };
  return { sections: (await promptComposer()?.detachedSections(e, s, n)) ?? [] };
}
//@ chunk-e6aww6q8.js:59899-59939 placement
var LX = gh("prompt.compose", (e) => composeDetachedSections(e));
/**
 * prompt.context 事件定义：核心处理器原样返回上下文块与指令文件。
 */
//@ chunk-e6aww6q8.js:59939-60085 placement
var PROMPT_CONTEXT_EVENT = {
  site: UI_ENV_SITE_RULES["prompt.context"],
  core: {
    name: "core",
    isCore: !0,
    budgetMs: 0,
    run: async (e) => ({ blocks: e.blocks, instructionFiles: e.instructionFiles }),
  },
};
/**
 * 把 inputText 插到 [start, end) 区间替换原文本，返回新文本与光标位置。
 */
//@ chunk-e6aww6q8.js:60085-60282 placement
function applyTextInsertion(e) {
  let max = Math.max(0, Math.min(e.start, e.text.length)),
    max_2 = Math.max(max, Math.min(e.end, e.text.length));
  return { text: e.text.slice(0, max) + e.inputText + e.text.slice(max_2), cursor: max + e.inputText.length };
}
//@ chunk-e6aww6q8.js:60282-60312 placement
var $le = gh("prompt.edit", applyTextInsertion);
//@ chunk-e6aww6q8.js:60312-60352 placement
var V$ = (e, n) => Math.max(0, Math.min(e, n));
//@ chunk-e6aww6q8.js:70644-70673 placement
var qle = eA("prompt.section");
//@ chunk-e6aww6q8.js:71153-71166 placement
var nSt = pu();

export {
  nSt,
  applyTextInsertion,
  eA,
  V$,
  gh,
  RS,
  Ale,
  B1,
  qle,
  PROMPT_CONTEXT_EVENT,
  Ple,
  LX,
  $le,
  Lle,
  Ole,
  defaultDescribe,
  composeDetachedSections,
  xle,
};

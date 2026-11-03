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
import { currentSurfaceBinding } from "./surfaceBinding.js";
import { promptComposer } from "./promptComposition.js";
import { pu } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";

//@ chunk-e6aww6q8.js:58779-58983 placement
var TEXT_PASSTHROUGH_CORES_2 = {
  "prompt.section": (e) => ({
    text: e.text,
  }),
  "prompt.attachment": (e) => ({
    text: e.text,
  }),
  "skill.prompt": (e) => ({
    text: e.text,
  }),
  "attribution.text": (e) => ({
    text: e.text,
  }),
  "session.receive": (e) => ({
    text: e.text,
  }),
};
//@ chunk-e6aww6q8.js:58983-59071 placement
/**
 * 生成带核心处理器的事件定义
 */
var makeCoreEvent = (e, n) => ({
  site: UI_ENV_SITE_RULES[e],
  core: {
    name: "core",
    isCore: true,
    budgetMs: 0,
    run: async (r) => n(r),
  },
});
//@ chunk-e6aww6q8.js:59071-59096 placement
/**
 * 文本原样透传事件
 */
var textPassthroughEvent = (e) => makeCoreEvent(e, TEXT_PASSTHROUGH_CORES_2[e]);
//@ chunk-e6aww6q8.js:59263-59353 placement = toggleTeammateVisibility (0.659)
var defaultDescribe = (e) => ({
  description: e.description,
  argumentHint: e.argumentHint,
  isHidden: e.isHidden,
});
//@ chunk-e6aww6q8.js:59353-59451 layout
/**
 * command.describe 事件定义
 */
var COMMAND_DESCRIBE_EVENT = {
  site: UI_ENV_SITE_RULES["command.describe"],
  core: {
    name: "core",
    isCore: true,
    budgetMs: 0,
    run: async (e) => defaultDescribe(e),
  },
};
//@ chunk-e6aww6q8.js:59451-59528 placement
/**
 * 取配置行的展示字段
 */
var pickRowFields = (e) => ({
  label: e.label,
  description: e.description,
  isHidden: e.isHidden,
});
//@ chunk-e6aww6q8.js:59528-59625 placement
/**
 * config.describe 事件定义
 */
var CONFIG_DESCRIBE_EVENT = {
  site: UI_ENV_SITE_RULES["config.describe"],
  core: {
    name: "core",
    isCore: true,
    budgetMs: 0,
    run: async (e) => pickRowFields(e),
  },
};
//@ chunk-e6aww6q8.js:59625-59657 placement
/**
 * prompt.attachment 事件
 */
var PROMPT_ATTACHMENT_EVENT = textPassthroughEvent("prompt.attachment");
//@ chunk-e6aww6q8.js:59657-59714 placement
/**
 * prompt.autocomplete 事件
 */
var PROMPT_AUTOCOMPLETE_EVENT = makeCoreEvent("prompt.autocomplete", () => ({
  suggestions: [],
}));
//@ chunk-e6aww6q8.js:59714-59739 placement
/**
 * 按站点名生成会话事件
 */
var sessionSiteEvent = (e) => makeCoreEvent(e, SESSION_SITE_NAMES[e]);
//@ chunk-e6aww6q8.js:59739-59767 placement
/**
 * prompt.change 事件
 */
var PROMPT_CHANGE_EVENT = sessionSiteEvent("prompt.change");
//@ chunk-e6aww6q8.js:59767-59899 placement
/**
 * prompt.compose 的核心实现：用当前工具与模型生成独立的提示词分段。
 */
async function composeDetachedSections(e, origin) {
  let r = currentSurfaceBinding();
  let s = r && {
    tools: r.tools(),
    model: r.model(),
  };
  return {
    sections: (await promptComposer()?.detachedSections(e, s, origin)) ?? [],
  };
}
//@ chunk-e6aww6q8.js:59899-59939 placement
/**
 * prompt.compose 事件
 */
var PROMPT_COMPOSE_EVENT = makeCoreEvent("prompt.compose", (e) => composeDetachedSections(e));
//@ chunk-e6aww6q8.js:59939-60085 placement
/**
 * prompt.context 事件定义：核心处理器原样返回上下文块与指令文件。
 */
var PROMPT_CONTEXT_EVENT = {
  site: UI_ENV_SITE_RULES["prompt.context"],
  core: {
    name: "core",
    isCore: true,
    budgetMs: 0,
    run: async (e) => ({
      blocks: e.blocks,
      instructionFiles: e.instructionFiles,
    }),
  },
};
//@ chunk-e6aww6q8.js:60085-60282 placement
/**
 * 把 inputText 插到 [start, end) 区间替换原文本，返回新文本与光标位置。
 */
function applyTextInsertion(e) {
  let max = Math.max(0, Math.min(e.start, e.text.length));
  let max_2 = Math.max(max, Math.min(e.end, e.text.length));
  return {
    text: e.text.slice(0, max) + e.inputText + e.text.slice(max_2),
    cursor: max + e.inputText.length,
  };
}
//@ chunk-e6aww6q8.js:60282-60312 placement
/**
 * prompt.edit 事件
 */
var PROMPT_EDIT_EVENT = makeCoreEvent("prompt.edit", applyTextInsertion);
//@ chunk-e6aww6q8.js:60312-60352 placement
/**
 * 夹在 0 与上界之间
 */
var clampPositive = (e, n) => Math.max(0, Math.min(e, n));
//@ chunk-e6aww6q8.js:70644-70673 placement
/**
 * prompt.section 事件
 */
var PROMPT_SECTION_EVENT = textPassthroughEvent("prompt.section");
//@ chunk-e6aww6q8.js:71153-71166 placement
/**
 * 文本透传的核心处理器表
 */
var TEXT_PASSTHROUGH_CORES = pu();
export {
  TEXT_PASSTHROUGH_CORES,
  applyTextInsertion,
  textPassthroughEvent,
  clampPositive,
  makeCoreEvent,
  sessionSiteEvent,
  COMMAND_DESCRIBE_EVENT,
  CONFIG_DESCRIBE_EVENT,
  PROMPT_SECTION_EVENT,
  PROMPT_CONTEXT_EVENT,
  PROMPT_ATTACHMENT_EVENT,
  PROMPT_COMPOSE_EVENT,
  PROMPT_EDIT_EVENT,
  PROMPT_CHANGE_EVENT,
  PROMPT_AUTOCOMPLETE_EVENT,
  defaultDescribe,
  composeDetachedSections,
  pickRowFields,
};

/**
 * plugins/functionHooks/coreHandlers.ts
 *
 * 2.1.316 新增：各钩子事件链底部的核心处理器
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (19)
 * attribution: placement 18, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { UI_ENV_SITE_RULES, SESSION_SITE_NAMES } from "./sites/siteRules.js";
import { currentSurfaceBinding } from "./surfaceBinding.js";
import { promptComposer } from "./promptComposition.js";
import { subscribe } from "../../../vendor/@growthbook/growthbook/dist/bundles/esm.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:61307-61511 placement
var TEXT_PASSTHROUGH_CORES_2 = {
  "prompt.section": (input) => ({
    text: input.text,
  }),
  "prompt.attachment": (input) => ({
    text: input.text,
  }),
  "skill.prompt": (input) => ({
    text: input.text,
  }),
  "attribution.text": (input) => ({
    text: input.text,
  }),
  "session.receive": (input) => ({
    text: input.text,
  }),
};
//@ chunk-5xgkngpb.js:61511-61599 placement
/**
 * 生成带核心处理器的事件定义
 */
var makeCoreEvent = (site, run) => ({
  site: UI_ENV_SITE_RULES[site],
  core: {
    name: "core",
    isCore: true,
    budgetMs: 0,
    run: async (input) => run(input),
  },
});
//@ chunk-5xgkngpb.js:61599-61624 placement
/**
 * 文本原样透传事件
 */
var textPassthroughEvent = (site) => makeCoreEvent(site, TEXT_PASSTHROUGH_CORES_2[site]);
//@ chunk-5xgkngpb.js:61791-61881 placement (2.1.88 match: toggleTeammateVisibility, 0.66)
var defaultDescribe = (command) => ({
  description: command.description,
  argumentHint: command.argumentHint,
  isHidden: command.isHidden,
});
//@ chunk-5xgkngpb.js:61881-61979 layout
/**
 * command.describe 事件定义
 */
var COMMAND_DESCRIBE_EVENT; // deferred: uses UI_ENV_SITE_RULES (./sites/siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:61881", () => {
  COMMAND_DESCRIBE_EVENT = {
    site: UI_ENV_SITE_RULES["command.describe"],
    core: {
      name: "core",
      isCore: true,
      budgetMs: 0,
      run: async (input) => defaultDescribe(input),
    },
  };
});
//@ chunk-5xgkngpb.js:61979-62056 placement
/**
 * 取配置行的展示字段
 */
var pickRowFields = (input) => ({
  label: input.label,
  description: input.description,
  isHidden: input.isHidden,
});
//@ chunk-5xgkngpb.js:62056-62153 placement
/**
 * config.describe 事件定义
 */
var CONFIG_DESCRIBE_EVENT; // deferred: uses UI_ENV_SITE_RULES (./sites/siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:62056", () => {
  CONFIG_DESCRIBE_EVENT = {
    site: UI_ENV_SITE_RULES["config.describe"],
    core: {
      name: "core",
      isCore: true,
      budgetMs: 0,
      run: async (input) => pickRowFields(input),
    },
  };
});
//@ chunk-5xgkngpb.js:62153-62185 placement
/**
 * prompt.attachment 事件
 */
var PROMPT_ATTACHMENT_EVENT; // deferred: uses textPassthroughEvent of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:62153", () => {
  PROMPT_ATTACHMENT_EVENT = textPassthroughEvent("prompt.attachment");
});
//@ chunk-5xgkngpb.js:62185-62242 placement
/**
 * prompt.autocomplete 事件
 */
var PROMPT_AUTOCOMPLETE_EVENT; // deferred: uses makeCoreEvent of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:62185", () => {
  PROMPT_AUTOCOMPLETE_EVENT = makeCoreEvent("prompt.autocomplete", () => ({
    suggestions: [],
  }));
});
//@ chunk-5xgkngpb.js:62242-62267 placement
/**
 * 按站点名生成会话事件
 */
var sessionSiteEvent = (site) => makeCoreEvent(site, SESSION_SITE_NAMES[site]);
//@ chunk-5xgkngpb.js:62267-62295 placement
/**
 * prompt.change 事件
 */
var PROMPT_CHANGE_EVENT; // deferred: uses sessionSiteEvent of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:62267", () => {
  PROMPT_CHANGE_EVENT = sessionSiteEvent("prompt.change");
});
//@ chunk-5xgkngpb.js:62295-62427 placement
/**
 * prompt.compose 的核心实现：用当前工具与模型生成独立的提示词分段。
 */
async function composeDetachedSections(input, origin) {
  let binding = currentSurfaceBinding();
  let facts = binding && {
    tools: binding.tools(),
    model: binding.model(),
  };
  return {
    sections: (await promptComposer()?.detachedSections(input, facts, origin)) ?? [],
  };
}
//@ chunk-5xgkngpb.js:62427-62467 placement
/**
 * prompt.compose 事件
 */
var PROMPT_COMPOSE_EVENT; // deferred: uses makeCoreEvent of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:62427", () => {
  PROMPT_COMPOSE_EVENT = makeCoreEvent("prompt.compose", (input) => composeDetachedSections(input));
});
//@ chunk-5xgkngpb.js:62467-62613 placement
/**
 * prompt.context 事件定义：核心处理器原样返回上下文块与指令文件。
 */
var PROMPT_CONTEXT_EVENT; // deferred: uses UI_ENV_SITE_RULES (./sites/siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:62467", () => {
  PROMPT_CONTEXT_EVENT = {
    site: UI_ENV_SITE_RULES["prompt.context"],
    core: {
      name: "core",
      isCore: true,
      budgetMs: 0,
      run: async (input) => ({
        blocks: input.blocks,
        instructionFiles: input.instructionFiles,
      }),
    },
  };
});
//@ chunk-5xgkngpb.js:62613-62810 placement
/**
 * 把 inputText 插到 [start, end) 区间替换原文本，返回新文本与光标位置。
 */
function applyTextInsertion(insertion) {
  let max = Math.max(0, Math.min(insertion.start, insertion.text.length));
  let max_2 = Math.max(max, Math.min(insertion.end, insertion.text.length));
  return {
    text: insertion.text.slice(0, max) + insertion.inputText + insertion.text.slice(max_2),
    cursor: max + insertion.inputText.length,
  };
}
//@ chunk-5xgkngpb.js:62810-62840 placement
/**
 * prompt.edit 事件
 */
var PROMPT_EDIT_EVENT; // deferred: uses makeCoreEvent of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:62810", () => {
  PROMPT_EDIT_EVENT = makeCoreEvent("prompt.edit", applyTextInsertion);
});
//@ chunk-5xgkngpb.js:62840-62880 placement
/**
 * 夹在 0 与上界之间
 */
var clampPositive = (x, max) => Math.max(0, Math.min(x, max));
//@ chunk-5xgkngpb.js:73191-73220 placement
/**
 * prompt.section 事件
 */
var PROMPT_SECTION_EVENT; // deferred: uses textPassthroughEvent of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:73191", () => {
  PROMPT_SECTION_EVENT = textPassthroughEvent("prompt.section");
});
//@ chunk-5xgkngpb.js:73700-73713 placement
/**
 * 文本透传的核心处理器表
 */
var TEXT_PASSTHROUGH_CORES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:73700", () => {
  TEXT_PASSTHROUGH_CORES = subscribe();
});
export {
  textPassthroughEvent,
  clampPositive,
  makeCoreEvent,
  TEXT_PASSTHROUGH_CORES,
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
  applyTextInsertion,
};

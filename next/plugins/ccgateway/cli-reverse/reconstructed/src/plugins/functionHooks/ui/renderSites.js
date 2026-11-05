/**
 * plugins/functionHooks/ui/renderSites.ts
 *
 * 渲染站点常量（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (2), chunk-j8f885h1.js (5)
 * attribution: placement 7
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { UI_ELEMENT_TYPES } from "./elements.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { pluginsMatchingEvent } from "../hookDispatch.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-j8f885h1.js:50850-50905 placement
/**
 * 是否已知元素类型名
 */
var isUiElementTypeName = (surface) =>
  typeof surface === "string" && Object.hasOwn(UI_ELEMENT_TYPES, surface);
//@ chunk-j8f885h1.js:50905-50944 placement
var UI_ELEMENT_TYPE_NAMES; // deferred: uses UI_ELEMENT_TYPES (./elements.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:50905", () => {
  UI_ELEMENT_TYPE_NAMES = Object.freeze(Object.keys(UI_ELEMENT_TYPES));
});
//@ chunk-j8f885h1.js:50944-51506 placement
var RENDER_SITES = {
  AskUserQuestion: "AskUserQuestionPermissionDialog",
  UserMessage: "UserPromptMessage",
  AssistantMessage: "AssistantTextMessage",
  ToolUse: "AssistantToolUseMessage",
  ToolResult: "UserToolResultMessage",
  ToolGroup: "CollapsedReadSearchContent",
  ToolProgress: "ToolProgressHint",
  CommandOutput: "CommandOutputSite",
  Spinner: "SpinnerWithVerb",
  TurnDuration: "TurnDurationMessage",
  InfoNotice: "InfoNoticeLine",
  SessionMode: "SessionStateRow",
  PromptHint: "PromptHintSite",
  AbovePrompt: "AbovePromptSite",
  Pane: "PaneSite",
  Placed: "PlacedSite",
  Backdrop: "none: a remote surface draws it",
};
//@ chunk-j8f885h1.js:51506-51760 placement
/**
 * 校验 ui.render 参数：surface 必须是已知界面，component 必须是引擎绘制的组件。
 */
function checkRenderArgument(arg) {
  if (!(isPlainObject(arg) && isUiElementTypeName(arg.surface)))
    return "takes a ui.render argument (e.surface names the surface)";
  let componentName = String(arg.component);
  return Object.hasOwn(RENDER_SITES, componentName)
    ? undefined
    : `takes a ui.render argument (e.component "${componentName}" is not a component the engine draws)`;
}
//@ chunk-j8f885h1.js:51760-51853 placement
var RENDER_SITE_PAIRS; // deferred: uses UI_ELEMENT_TYPE_NAMES of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-j8f885h1.js:51760", () => {
  RENDER_SITE_PAIRS = Object.freeze(
    UI_ELEMENT_TYPE_NAMES.flatMap((surface) =>
      Object.keys(RENDER_SITES).map((component) => ({
        surface,
        component,
      })),
    ),
  );
});
//@ chunk-7jxyna5q.js:53114-53133 placement
var RENDER_EVENT = "ui.render";
//@ chunk-7jxyna5q.js:53133-53167 placement
var renderPluginsFor = (component) =>
  pluginsMatchingEvent(RENDER_EVENT, {
    component,
  });
export {
  renderPluginsFor,
  RENDER_SITE_PAIRS,
  isUiElementTypeName,
  RENDER_EVENT,
  RENDER_SITES,
  UI_ELEMENT_TYPE_NAMES,
  checkRenderArgument,
};

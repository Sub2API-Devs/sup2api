/**
 * plugins/functionHooks/ui/renderSites.ts
 *
 * 渲染站点常量（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (5), chunk-s61vbvea.js (2)
 * attribution: placement 7
 */
import { UI_ELEMENT_TYPES } from "./elements.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { pluginsMatchingEvent } from "../hookDispatch.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-4121qate.js:70291-70346 placement
/**
 * 是否已知元素类型名
 */
var isUiElementTypeName = (surface) =>
  typeof surface === "string" && Object.hasOwn(UI_ELEMENT_TYPES, surface);
//@ chunk-4121qate.js:70346-70385 placement
var UI_ELEMENT_TYPE_NAMES; // deferred: uses UI_ELEMENT_TYPES (./elements.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4121qate.js:70346", () => {
  UI_ELEMENT_TYPE_NAMES = Object.freeze(Object.keys(UI_ELEMENT_TYPES));
});
//@ chunk-4121qate.js:70385-70904 placement
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
};
//@ chunk-4121qate.js:70904-71158 placement
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
//@ chunk-4121qate.js:71158-71251 placement
var RENDER_SITE_PAIRS; // deferred: uses UI_ELEMENT_TYPE_NAMES of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4121qate.js:71158", () => {
  RENDER_SITE_PAIRS = Object.freeze(
    UI_ELEMENT_TYPE_NAMES.flatMap((surface) =>
      Object.keys(RENDER_SITES).map((component) => ({
        surface,
        component,
      })),
    ),
  );
});
//@ chunk-s61vbvea.js:52501-52520 placement
var RENDER_EVENT = "ui.render";
//@ chunk-s61vbvea.js:52520-52554 placement
var renderPluginsFor = (component) =>
  pluginsMatchingEvent(RENDER_EVENT, {
    component,
  });
export {
  isUiElementTypeName,
  RENDER_SITES,
  UI_ELEMENT_TYPE_NAMES,
  checkRenderArgument,
  RENDER_EVENT,
  renderPluginsFor,
  RENDER_SITE_PAIRS,
};

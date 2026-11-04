/**
 * plugins/functionHooks/sites/uiSites.ts
 *
 * 钩子站点规则：ui.render 与元素归属（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (49), chunk-d5gb8ms2.js (1)
 * attribution: placement 50
 */
import {
  stringsCharCount,
  findChangedProp,
  ESCAPE_CHARACTER,
  PLACEHOLDER_CHARACTER,
  SPREAD_CELL,
  OPENING_MARK,
  LONE_SURROGATE,
} from "../ui/textScrub.js";
import {
  RASTER_OR_IMAGE_KIND_TEXT,
  checkPinnedKeys,
  checkResultObject,
  toolUseIdList,
  isNonNegativeInt,
  restoreField,
} from "./siteRules.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { denseListCopy } from "./promptContextSites.js";
import { isUiElementTypeName, UI_ELEMENT_TYPE_NAMES, checkRenderArgument } from "../ui/renderSites.js";
import { emptyPlainDataState, checkPlainDataDepth, checkPlainData } from "./plainData.js";
import {
  isPlainMatcherObject,
  matchesField,
  matchesRegExpMatcher,
} from "../../../utils/hooks/functionHookMatchers.js";
import { uniq } from "../../../utils/collections.js";
import { similarNames } from "../../../utils/settings/managedEnvKeys.js";
import { wellFormed, checkRenderTree } from "../ui/validateTree.js";
import { checkElementTable } from "../ui/elements.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-4121qate.js:134242-134274 placement
/**
 * 来源更靠后
 */
var isLaterOrigin = (later, earlier, character) =>
  stringsCharCount(later, character) > stringsCharCount(earlier, character);
//@ chunk-4121qate.js:134274-134611 placement
/**
 * ui.render 改写的 props 不得新增终端转义、图片占位、展开标记或孤立代理项等控制字符。
 */
function checkPropsControlChars(passed, received) {
  let props = received.props;
  return findChangedProp(passed, props, (key) =>
    isLaterOrigin(passed[key], props[key], ESCAPE_CHARACTER) ||
    isLaterOrigin(passed[key], props[key], PLACEHOLDER_CHARACTER) ||
    stringsCharCount(passed[key], SPREAD_CELL) > 0 ||
    stringsCharCount(passed[key], OPENING_MARK) > 0 ||
    isLaterOrigin(passed[key], props[key], LONE_SURROGATE)
      ? `a props.${key} with a control character (an escape sequence the terminal would honour, an image placeholder, or an unpaired surrogate half out of reach); a rewrite the engine draws adds none`
      : undefined,
  );
}
//@ chunk-4121qate.js:134611-134649 placement
/**
 * "an object"/null/missing
 */
var PROP_TYPE_VALUES = ["an object", "null", "missing"];
//@ chunk-4121qate.js:134649-135319 placement
/**
 * 各内置渲染组件的 props 类型约束表（AskUserQuestion、UserMessage、ToolUse、Spinner 等）。
 */
var RENDER_PROP_KINDS; // deferred: uses RASTER_OR_IMAGE_KIND_TEXT (./siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4121qate.js:134649", () => {
  RENDER_PROP_KINDS = {
    AskUserQuestion: {
      metadataSource: ["a string", "missing"],
    },
    UserMessage: {
      onScreen: PROP_TYPE_VALUES,
    },
    AssistantMessage: {
      isSummary: ["a boolean", "missing"],
      onScreen: PROP_TYPE_VALUES,
    },
    ToolUse: {
      input: RASTER_OR_IMAGE_KIND_TEXT,
      output: RASTER_OR_IMAGE_KIND_TEXT,
      isExpanded: ["a boolean", "missing"],
      onScreen: PROP_TYPE_VALUES,
    },
    ToolResult: {
      output: RASTER_OR_IMAGE_KIND_TEXT,
      isExpanded: ["a boolean", "missing"],
      onScreen: PROP_TYPE_VALUES,
    },
    ToolGroup: {
      isCallsOnly: ["a boolean", "missing"],
      onScreen: PROP_TYPE_VALUES,
    },
    CommandOutput: {
      onScreen: PROP_TYPE_VALUES,
    },
    Spinner: {
      message: ["a string", "null"],
      suffix: ["a string", "missing"],
    },
    TurnDuration: {
      isExpanded: ["a boolean", "missing"],
      waitingFor: ["an object", "missing"],
      onScreen: PROP_TYPE_VALUES,
    },
    InfoNotice: {
      command: ["a string", "null"],
      onScreen: PROP_TYPE_VALUES,
    },
    PromptHint: {
      tail: ["a string", "missing"],
    },
    Placed: {
      onScreen: PROP_TYPE_VALUES,
    },
  };
});
//@ chunk-4121qate.js:135319-135346 placement
var PERMISSIONREQUEST = "PermissionRequest";
//@ chunk-4121qate.js:135346-135400 placement
/**
 * ui.render 固定键
 */
var UI_RENDER_PINNED_KEYS = ["surface", "component", "requestId", "viewport"];
//@ chunk-4121qate.js:135400-135424 placement
/**
 * 校验 ui.render 固定键
 */
var checkUiRenderPinned = (passed, received) => checkPinnedKeys(UI_RENDER_PINNED_KEYS, passed, received);
//@ chunk-4121qate.js:135424-135566 placement
/**
 * ui 值类站点规则工厂：结果需有 element 与 value 字符串。
 */
var createUiValueSite = (event, checkArgument) => ({
  event,
  checkArgument,
  check: checkResultObject((answer) =>
    typeof answer.element === "string" && typeof answer.value === "string"
      ? undefined
      : "no { element, value }",
  ),
});
//@ chunk-4121qate.js:135566-135893 placement
/**
 * 校验 ToolGroup 的 calls 未被改动。
 */
function checkToolGroupCalls(props, received) {
  let engineCalls =
    received.component === "ToolGroup" ? (toolUseIdList(received.props.calls) ?? []) : undefined;
  let answerCalls = toolUseIdList(props.calls);
  return engineCalls !== undefined &&
    (answerCalls === undefined ||
      answerCalls.length !== engineCalls.length ||
      answerCalls.some((id, index) => id === null || id !== engineCalls[index]))
    ? "props.calls whose tool_use_ids are not the ones the engine drew (each call keeps the id tool.call carried; the group's calls are its own)"
    : undefined;
}
//@ chunk-4121qate.js:135893-136122 placement
/**
 * 恢复 ToolGroup 的 calls。
 */
function restoreToolGroupCalls(answer, request, copyIds) {
  let { props } = answer;
  if (!(request.component === "ToolGroup" && isPlainObject(props))) return answer;
  let { calls } = props;
  let hasChangedCalls = Array.isArray(calls) && calls !== request.props.calls;
  let answerCallIds = hasChangedCalls ? calls : [];
  let list = Array.from(
    {
      length: answerCallIds.length,
    },
    (unusedSlot, index) => answerCallIds[index],
  );
  return hasChangedCalls
    ? {
        ...answer,
        props: {
          ...props,
          calls: copyIds(list),
        },
      }
    : answer;
}
//@ chunk-4121qate.js:136122-136309 placement
/**
 * 判断值是否持有自定义 toJSON。
 */
var holdsToJson = (value) =>
  (typeof value === "object" || typeof value === "function") &&
  value !== null &&
  (typeof Reflect.get(value, "toJSON") === "function" ||
    (typeof value === "object" &&
      (Array.isArray(value) ? denseListCopy(value) : Object.values(value)).some(holdsToJson)));
//@ chunk-4121qate.js:136309-136686 placement
/**
 * 判断对象沿原型或引用链是否会回到自身。
 */
function reachesItself(start, ancestors, finished) {
  let seen = new Set(ancestors);
  let stack = [];
  let current = start;
  for (;;) {
    let held = typeof current === "object" && current !== null ? current : undefined;
    if (held !== undefined && seen.has(held)) return true;
    if (held !== undefined && !finished.has(held)) {
      seen.add(held);
      stack.push({
        held,
        parts: Array.isArray(held) ? denseListCopy(held) : Object.values(held),
        at: 0,
      });
    }
    let last = stack.at(-1);
    if (last === undefined) return false;
    if (last.at < last.parts.length) {
      current = last.parts[last.at];
      last.at += 1;
      continue;
    }
    stack.pop();
    seen.delete(last.held);
    finished.add(last.held);
    current = undefined;
  }
}
//@ chunk-4121qate.js:136686-137242 placement
function checkRenderElementOwner(press, received) {
  if (press.plugin !== received.plugin) return "a plugin other than the one that drew the element";
  if (typeof press.element !== "string") return "no { element }";
  if (typeof press.component !== "string") return "no { component }";
  if (press.requestId !== received.requestId)
    return "a requestId other than the instance the element was drawn in";
  if (!isUiElementTypeName(press.surface)) return "no { surface } naming a surface";
  let { link } = press;
  if (received.link === undefined)
    return link !== undefined ? "a { link } on a press that had none" : undefined;
  return isPlainObject(link) && typeof link.href === "string"
    ? undefined
    : "no { link: { href } } on a press that had one";
}
//@ chunk-4121qate.js:137242-137430 placement
/**
 * 校验 ui.input 参数：kind 不变，value 为字符串。
 */
function checkUiInputArgument(passed, received) {
  let ownerProblem = checkRenderElementOwner(passed, received);
  if (ownerProblem !== undefined) return ownerProblem;
  if (passed.kind !== received.kind) return `a kind other than the ${received.kind} it was given`;
  return typeof passed.value === "string" ? undefined : "no { value } string";
}
//@ chunk-4121qate.js:137430-137592 placement
/**
 * 描述值的种类（数组、null、缺失、对象或类型名）。
 */
function describeValueKind(value) {
  if (Array.isArray(value)) return "an array";
  if (value === null) return "null";
  if (value === undefined) return "missing";
  return typeof value === "object" ? "an object" : `a ${typeof value}`;
}
//@ chunk-4121qate.js:137592-137792 placement
/**
 * 校验 columns/rows 为不超过视口的正整数。
 */
function checkCellSize(columns, rows, bounds) {
  if (!(isNonNegativeInt(columns) && columns >= 1 && columns <= bounds.columns))
    return `columns must be a whole number from 1 to ${bounds.columns}`;
  return isNonNegativeInt(rows) && rows >= 1 && rows <= bounds.rows
    ? undefined
    : `rows must be a whole number from 1 to ${bounds.rows}`;
}
//@ chunk-4121qate.js:137792-137856 placement
/**
 * 纯数据字符数
 */
function plainDataChars(value) {
  let budget = emptyPlainDataState();
  return checkPlainDataDepth(value, 0, budget) === undefined ? budget.chars : 1 / 0;
}
//@ chunk-4121qate.js:137856-138113 placement
/**
 * 校验 ui.message 参数：只有 data 可改。
 */
function checkUiMessageArgument(passed, received) {
  for (let key of ["surface", "component", "requestId", "element", "module"])
    if (passed[key] !== received[key]) return `{ ${key} } rewritten; only data may change`;
  if (!("data" in passed) || passed.data === undefined) return "no { data }";
  let dataProblem = checkPlainData(passed.data);
  return dataProblem === undefined ? undefined : `data ${dataProblem}`;
}
//@ chunk-4121qate.js:138113-138228 placement
/**
 * 校验 ui.message 的 props。
 */
function checkUiMessageProps(answer) {
  if (!("props" in answer) || answer.props === undefined) return;
  let propsProblem = checkPlainData(answer.props);
  return propsProblem === undefined ? undefined : `props ${propsProblem}`;
}
//@ chunk-4121qate.js:138228-138368 placement
var MESSAGE_COMPONENT_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-4121qate.js:138228", () => {
  MESSAGE_COMPONENT_NAMES = new Set([
    "UserMessage",
    "AssistantMessage",
    "ToolUse",
    "ToolResult",
    "ToolGroup",
    "CommandOutput",
    "TurnDuration",
    "InfoNotice",
    "Placed",
  ]);
});
//@ chunk-4121qate.js:138368-138587 placement
/**
 * 校验 props.onScreen 与界面报告一致。
 */
function checkOnScreenProp(props, received) {
  return MESSAGE_COMPONENT_NAMES.has(received.component) &&
    checkPinnedKeys(["onScreen"], props, received.props) !== undefined
    ? "a props.onScreen other than the surface reported (the surface says what its viewport shows; a rewrite changes the drawing alone)"
    : undefined;
}
//@ chunk-4121qate.js:138587-138802 placement
/**
 * 校验 CommandOutput 的 props.command 未改。
 */
function checkCommandProp(props, received) {
  return received.component === "CommandOutput" && props.command !== received.props.command
    ? "a props.command other than the engine drew (the name is the command that printed the row; a rewrite changes the row alone)"
    : undefined;
}
//@ chunk-4121qate.js:138802-139002 placement
/**
 * 校验 Pane 的 props.placement 未改。
 */
function checkPlacementProp(props, received) {
  return received.component === "Pane" && props.placement !== received.props.placement
    ? "a props.placement other than the surface drew (the surface places the pane; a rewrite changes the drawing alone)"
    : undefined;
}
//@ chunk-4121qate.js:139002-139355 placement
/**
 * 校验 Placed 的 props.plugin 与 id 未改。
 */
function checkPlacedProps(props, received) {
  let hasChangedPlugin = received.component === "Placed" && props.plugin !== received.props.plugin;
  let hasChangedId = received.component === "Placed" && props.id !== received.props.id;
  return hasChangedPlugin
    ? "a props.plugin other than placed the row (the row stays its placer's; a rewrite changes the drawing alone)"
    : hasChangedId
      ? "a props.id other than the row was placed under (the id names the row; a rewrite changes the drawing alone)"
      : undefined;
}
//@ chunk-4121qate.js:139355-139539 placement
/**
 * 校验 ToolProgress 的 props.kind 未改。
 */
function checkProgressKindProp(props, received) {
  return received.component === "ToolProgress" && props.kind !== received.props.kind
    ? "a props.kind other than the engine drew (the kind names the row; a rewrite changes its text alone)"
    : undefined;
}
//@ chunk-4121qate.js:139539-139766 placement
/**
 * 校验 AssistantMessage 的 props.isSummary 未改。
 */
function checkSummaryProp(props, received) {
  return received.component === "AssistantMessage" && props.isSummary !== received.props.isSummary
    ? "a props.isSummary other than the engine drew (the row names its block as a summary or not; a rewrite changes the drawing alone)"
    : undefined;
}
//@ chunk-4121qate.js:139766-139811 placement
/**
 * UserMessage 固定 props
 */
var USER_MESSAGE_PINNED_KEYS = ["origin", "isExpanded", "task", "from"];
//@ chunk-4121qate.js:139811-140095 placement
/**
 * 校验 UserMessage 的固定 props 未改。
 */
function checkUserMessageProps(props, received) {
  if (received.component !== "UserMessage") return;
  let found = USER_MESSAGE_PINNED_KEYS.find(
    (key) => checkPinnedKeys([key], props, received.props) !== undefined,
  );
  if (found === undefined) return;
  return `a props.${found} other than the engine drew (the row names its message's origin, sender and task and how the view draws it; a rewrite changes the text alone)`;
}
//@ chunk-4121qate.js:140095-140333 placement
/**
 * 校验 Pane/AbovePrompt 的 props.view 未改。
 */
function checkViewProp(props, received) {
  return (received.component === "Pane" || received.component === "AbovePrompt") &&
    checkPinnedKeys(["view"], props, received.props) !== undefined
    ? "a props.view other than the surface drew (the person chooses the transcript in view; a rewrite changes the drawing alone)"
    : undefined;
}
//@ chunk-4121qate.js:140333-140509 placement
/**
 * 校验 props 中没有自带 toJSON 的值。
 */
var checkPropsToJson = (passed, received) =>
  findChangedProp(passed, received.props, (key) =>
    (key === "toJSON" && typeof passed[key] === "function") || holdsToJson(passed[key])
      ? `a props.${key} that holds a toJSON of its own; a prop may not say how it is serialised`
      : undefined,
  );
//@ chunk-4121qate.js:140509-140766 placement
/**
 * 校验工具类组件的 props.tool_use_id 未改。
 */
function checkToolUseIdProp(props, received) {
  return (received.component === "ToolUse" ||
    received.component === "ToolResult" ||
    received.component === "ToolProgress") &&
    props.tool_use_id !== received.props.tool_use_id
    ? "a props.tool_use_id other than the engine drew (the id names the call; a rewrite changes the row alone)"
    : undefined;
}
//@ chunk-4121qate.js:140766-141055 placement
/**
 * 校验 props 中没有新引入的循环引用。
 */
function checkPropsCycles(answer, request) {
  let props = answer.props;
  if (typeof props !== "object" || props === null) return;
  let seenAnswer = new Set();
  let seenRequest = new Set();
  for (let [key, value] of Object.entries(props)) {
    let requestValue = Reflect.get(request.props, key);
    if (
      value !== requestValue &&
      reachesItself(value, [answer, props], seenAnswer) &&
      !reachesItself(requestValue, [request, request.props], seenRequest)
    )
      return `a props.${key} that holds itself; a prop may not reach back into itself`;
  }
  return;
}
//@ chunk-4121qate.js:141055-141596 placement
function checkRenderProps(answer, request) {
  let props = answer.props;
  if (!isPlainObject(props)) return "no { props } (an object)";
  let cycleProblem = checkPropsCycles(answer, request);
  if (cycleProblem !== undefined) return cycleProblem;
  let propKinds = RENDER_PROP_KINDS[request.component] ?? {};
  for (let [key, value] of Object.entries(propKinds)) {
    let valueKind = describeValueKind(props[key]);
    if (value !== RASTER_OR_IMAGE_KIND_TEXT && !value.includes(valueKind))
      return `a props.${key} that is ${valueKind}, not ${value.join(" or ")}`;
  }
  for (let [key, value] of Object.entries(request.props)) {
    if (value === undefined || Object.hasOwn(propKinds, key)) continue;
    let requestKind = describeValueKind(value);
    let answerKind = describeValueKind(props[key]);
    if (answerKind !== requestKind) return `a props.${key} that is ${answerKind}, not ${requestKind}`;
  }
  return (
    checkPropsControlChars(props, request) ??
    checkUserMessageProps(props, request) ??
    checkToolUseIdProp(props, request) ??
    checkProgressKindProp(props, request) ??
    checkToolGroupCalls(props, request) ??
    checkCommandProp(props, request) ??
    checkPlacementProp(props, request) ??
    checkPlacedProps(props, request) ??
    checkSummaryProp(props, request) ??
    checkViewProp(props, request) ??
    checkOnScreenProp(props, request) ??
    checkPropsToJson(props, request)
  );
}
//@ chunk-4121qate.js:141596-141952 placement
/**
 * 各渲染组件在哪些界面上触发（终端、桌面、VS Code 等）。
 */
var RENDER_COMPONENT_SURFACES; // deferred: uses UI_ELEMENT_TYPE_NAMES (../ui/renderSites.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4121qate.js:141596", () => {
  RENDER_COMPONENT_SURFACES = {
    AskUserQuestion: UI_ELEMENT_TYPE_NAMES,
    UserMessage: UI_ELEMENT_TYPE_NAMES,
    AssistantMessage: UI_ELEMENT_TYPE_NAMES,
    ToolUse: UI_ELEMENT_TYPE_NAMES,
    ToolResult: UI_ELEMENT_TYPE_NAMES,
    ToolGroup: UI_ELEMENT_TYPE_NAMES,
    ToolProgress: ["terminal"],
    CommandOutput: UI_ELEMENT_TYPE_NAMES,
    Spinner: ["terminal", "desktop", "vscode"],
    TurnDuration: ["terminal"],
    InfoNotice: ["terminal"],
    SessionMode: ["terminal", "desktop"],
    PromptHint: ["terminal", "desktop"],
    AbovePrompt: ["terminal", "desktop"],
    Pane: UI_ELEMENT_TYPE_NAMES,
    Placed: UI_ELEMENT_TYPE_NAMES,
  };
});
//@ chunk-4121qate.js:141952-142152 placement
/**
 * 描述组件在哪些界面上触发。
 */
function describeComponentSurfaces(component) {
  let surfaces = RENDER_COMPONENT_SURFACES[component];
  let all = UI_ELEMENT_TYPE_NAMES.every((surface) => surfaces.includes(surface));
  let isSingle = surfaces.length === 1;
  return all
    ? "every attached surface"
    : isSingle
      ? `the ${surfaces[0]} surface only`
      : `the ${surfaces.slice(0, -1).join(", ")} and ${surfaces.at(-1)} surfaces only`;
}
//@ chunk-4121qate.js:142152-142183 placement
/**
 * 渲染参数与 props 校验
 */
var checkRenderArgAndProps = (answer, request) =>
  checkUiRenderPinned(answer, request) ?? checkRenderProps(answer, request);
//@ chunk-4121qate.js:142183-142221 placement
var RENDER_COMPONENT_NAMES; // deferred: uses RENDER_COMPONENT_SURFACES of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4121qate.js:142183", () => {
  RENDER_COMPONENT_NAMES = Object.freeze(Object.keys(RENDER_COMPONENT_SURFACES));
});
//@ chunk-4121qate.js:142221-142402 placement
/**
 * 取 matcher 对象某字段的字符串或字符串列表值。
 */
function matcherStrings(matcher, field) {
  if (!isPlainMatcherObject(matcher) || !Object.hasOwn(matcher, field)) return;
  let value = matcher[field];
  if (typeof value === "string") return [value];
  return Array.isArray(value) && value.length > 0 && value.every((name) => typeof name === "string")
    ? value
    : undefined;
}
//@ chunk-4121qate.js:142402-142527 placement
/**
 * 列出与 matcher 相符的（组件, 界面）组合。
 */
var matchingRenderSites = (matcher) =>
  RENDER_COMPONENT_NAMES.flatMap((component) =>
    RENDER_COMPONENT_SURFACES[component]
      .filter(
        (surface) =>
          matchesField(matcher, "component", component) && matchesField(matcher, "surface", surface),
      )
      .map((surface) => ({
        component,
        surface,
      })),
  );
//@ chunk-4121qate.js:142527-142679 placement
/**
 * 列出未知名字的问题（附相近名建议）。
 */
var unknownNamesProblems = (names, known, noun) =>
  uniq(names)
    .filter((name) => !known.includes(name))
    .map((name) => {
      let [similar] = similarNames(name, known, 1);
      let hint = similar === undefined ? "" : ` (did you mean ${similar}?)`;
      return `no ${noun} is named ${name}${hint}`;
    });
//@ chunk-4121qate.js:142679-143148 placement
/**
 * 检查 ui.render 的 matcher：未知组件/界面名（给出相近名），以及组件与界面组合永远不会触发的情况。
 */
function adviseUiRenderMatcher(matcher) {
  let matchers = Array.isArray(matcher) ? matcher : [matcher];
  let names = matchers.flatMap((matcher) => matcherStrings(matcher, "component") ?? []);
  let names_2 = matchers.flatMap((matcher) => matcherStrings(matcher, "surface") ?? []);
  let filtered = RENDER_COMPONENT_NAMES.filter((component) => names.includes(component));
  let filtered_2 = UI_ELEMENT_TYPE_NAMES.filter((surface) => names_2.includes(surface));
  let all = matchers.every((matcher) => matchingRenderSites(matcher).length === 0);
  let isSurfaceMismatch = all && filtered.length > 0 && filtered_2.length > 0;
  let problems = [
    ...unknownNamesProblems(names, RENDER_COMPONENT_NAMES, "component"),
    ...unknownNamesProblems(names_2, UI_ELEMENT_TYPE_NAMES, "surface"),
    ...(isSurfaceMismatch
      ? [
          filtered
            .map((component) => `${component} is raised on ${describeComponentSurfaces(component)}`)
            .join(", ") + `; this hook names ${filtered_2.join(", ")}`,
        ]
      : []),
  ];
  return problems.length > 0 ? `${problems.join("; ")}${all ? ", so it never runs" : ""}` : undefined;
}
//@ chunk-4121qate.js:143148-143387 placement
/**
 * 校验 ui.resolve 的 matcher 只按 surface 与 component 匹配。
 */
function checkResolveMatcher(matcher, isPrecomputed) {
  let filtered = Object.keys(matcher).filter((key) => key !== "surface" && key !== "component");
  return isPrecomputed || filtered.length === 0
    ? undefined
    : `resolved ahead of time, once per surface and component; a matcher here takes surface and component only, not ${filtered.join(", ")}`;
}
//@ chunk-4121qate.js:143387-143503 placement
/**
 * 校验 ui.select 参数：value 为字符串。
 */
function checkUiSelectArgument(passed, received) {
  let ownerProblem = checkRenderElementOwner(passed, received);
  if (ownerProblem !== undefined) return ownerProblem;
  return typeof passed.value === "string" ? undefined : "no { value } string";
}
//@ chunk-4121qate.js:143503-143528 placement
/**
 * ui.input 站点规则
 */
var UI_INPUT_SITE; // deferred: uses createUiValueSite of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4121qate.js:143503", () => {
  UI_INPUT_SITE = createUiValueSite("ui.input", checkUiInputArgument);
});
//@ chunk-4121qate.js:143528-143585 placement
/**
 * ui.message 站点规则
 */
var UI_MESSAGE_SITE; // deferred: uses checkResultObject (./siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4121qate.js:143528", () => {
  UI_MESSAGE_SITE = {
    event: "ui.message",
    checkArgument: checkUiMessageArgument,
    check: checkResultObject(checkUiMessageProps),
  };
});
//@ chunk-4121qate.js:143585-143694 placement
/**
 * ui.press 站点规则：结果需有 element。
 */
var UI_PRESS_SITE; // deferred: uses checkResultObject (./siteRules.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4121qate.js:143585", () => {
  UI_PRESS_SITE = {
    event: "ui.press",
    checkArgument: checkRenderElementOwner,
    check: checkResultObject((answer) => (typeof answer.element === "string" ? undefined : "no { element }")),
  };
});
//@ chunk-4121qate.js:196298-196707 placement
var UI_RENDER_SITE = {
  event: "ui.render",
  argumentCopy: "whole",
  adoptArgument: (passed, received, adopt) =>
    restoreToolGroupCalls(restoreField("props")(passed, received, adopt), received, adopt),
  restoreArgument: wellFormed,
  checkArgument: checkRenderArgAndProps,
  checkMatcher: (matcher) =>
    Object.hasOwn(matcher, "component") && matchesRegExpMatcher(matcher.component, PERMISSIONREQUEST)
      ? `${PERMISSIONREQUEST} is drawn by the engine alone; its answer authorises an action. A plugin adds context with $.ui.notice`
      : undefined,
  check: checkRenderTree,
  checkHop: (hop, request) => checkRenderTree(hop, request),
  refusedSubject: ({ component, requestId }) => `${component} ${requestId}`,
};
//@ chunk-4121qate.js:196707-196777 placement
/**
 * ui.resolve 站点规则
 */
var UI_RESOLVE_SITE = {
  event: "ui.resolve",
  checkArgument: checkRenderArgument,
  checkMatcher: checkResolveMatcher,
  check: checkElementTable,
};
//@ chunk-4121qate.js:196777-196803 placement
/**
 * ui.select 站点规则
 */
var UI_SELECT_SITE; // deferred: uses createUiValueSite of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-4121qate.js:196777", () => {
  UI_SELECT_SITE = createUiValueSite("ui.select", checkUiSelectArgument);
});
//@ chunk-d5gb8ms2.js:228-376 placement
/**
 * 取 matcher 中的 door 列表。
 */
function matcherDoors(matcher) {
  if (Array.isArray(matcher)) {
    let mapped = matcher.map(matcherDoors);
    return mapped.length > 0 && mapped.every((doors) => doors !== undefined)
      ? mapped.flatMap((doors) => doors ?? [])
      : undefined;
  }
  return matcherStrings(matcher, "door");
}
export {
  matcherDoors,
  RENDER_PROP_KINDS,
  PERMISSIONREQUEST,
  MESSAGE_COMPONENT_NAMES,
  PROP_TYPE_VALUES,
  RENDER_COMPONENT_NAMES,
  UI_RENDER_PINNED_KEYS,
  RENDER_COMPONENT_SURFACES,
  USER_MESSAGE_PINNED_KEYS,
  UI_INPUT_SITE,
  UI_MESSAGE_SITE,
  UI_PRESS_SITE,
  UI_RENDER_SITE,
  UI_RESOLVE_SITE,
  UI_SELECT_SITE,
  checkPropsControlChars,
  checkUiRenderPinned,
  createUiValueSite,
  checkToolGroupCalls,
  restoreToolGroupCalls,
  isLaterOrigin,
  holdsToJson,
  reachesItself,
  checkUiInputArgument,
  describeValueKind,
  checkUiMessageArgument,
  checkUiMessageProps,
  matcherStrings,
  checkOnScreenProp,
  checkCommandProp,
  checkPlacementProp,
  checkPlacedProps,
  checkRenderElementOwner,
  checkProgressKindProp,
  checkRenderProps,
  describeComponentSurfaces,
  matchingRenderSites,
  checkRenderArgAndProps,
  adviseUiRenderMatcher,
  checkSummaryProp,
  checkResolveMatcher,
  checkUserMessageProps,
  checkUiSelectArgument,
  checkViewProp,
  checkPropsToJson,
  checkToolUseIdProp,
  unknownNamesProblems,
  checkPropsCycles,
  plainDataChars,
  checkCellSize,
};

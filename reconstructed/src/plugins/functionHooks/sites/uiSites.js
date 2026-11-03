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
import { isUiElementTypeName, je, checkRenderArgument } from "../ui/renderSites.js";
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

//@ chunk-4121qate.js:134242-134274 placement
/**
 * 来源更靠后
 */
var isLaterOrigin = (e, o, r) => stringsCharCount(e, r) > stringsCharCount(o, r);
//@ chunk-4121qate.js:134274-134611 placement
/**
 * ui.render 改写的 props 不得新增终端转义、图片占位、展开标记或孤立代理项等控制字符。
 */
function checkPropsControlChars(props, o) {
  let props_2 = o.props;
  return findChangedProp(props, props_2, (n) =>
    isLaterOrigin(props[n], props_2[n], ESCAPE_CHARACTER) ||
    isLaterOrigin(props[n], props_2[n], PLACEHOLDER_CHARACTER) ||
    stringsCharCount(props[n], SPREAD_CELL) > 0 ||
    stringsCharCount(props[n], OPENING_MARK) > 0 ||
    isLaterOrigin(props[n], props_2[n], LONE_SURROGATE)
      ? `a props.${n} with a control character (an escape sequence the terminal would honour, an image placeholder, or an unpaired surrogate half out of reach); a rewrite the engine draws adds none`
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
var RENDER_PROP_KINDS = {
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
var checkUiRenderPinned = (e, o) => checkPinnedKeys(UI_RENDER_PINNED_KEYS, e, o);
//@ chunk-4121qate.js:135424-135566 placement
/**
 * ui 值类站点规则工厂：结果需有 element 与 value 字符串。
 */
var createUiValueSite = (event, checkArgument) => ({
  event,
  checkArgument,
  check: checkResultObject((r) =>
    typeof r.element === "string" && typeof r.value === "string" ? undefined : "no { element, value }",
  ),
});
//@ chunk-4121qate.js:135566-135893 placement
/**
 * 校验 ToolGroup 的 calls 未被改动。
 */
function checkToolGroupCalls(props, o) {
  let n = o.component === "ToolGroup" ? (toolUseIdList(o.props.calls) ?? []) : undefined;
  let s = toolUseIdList(props.calls);
  return n !== undefined &&
    (s === undefined || s.length !== n.length || s.some((p, f) => p === null || p !== n[f]))
    ? "props.calls whose tool_use_ids are not the ones the engine drew (each call keeps the id tool.call carried; the group's calls are its own)"
    : undefined;
}
//@ chunk-4121qate.js:135893-136122 placement
/**
 * 恢复 ToolGroup 的 calls。
 */
function restoreToolGroupCalls(e, o, r) {
  let { props } = e;
  if (!(o.component === "ToolGroup" && isPlainObject(props))) return e;
  let { calls } = props;
  let p = Array.isArray(calls) && calls !== o.props.calls;
  let f = p ? calls : [];
  let list = Array.from(
    {
      length: f.length,
    },
    (m, c) => f[c],
  );
  return p
    ? {
        ...e,
        props: {
          ...props,
          calls: r(list),
        },
      }
    : e;
}
//@ chunk-4121qate.js:136122-136309 placement
/**
 * 判断值是否持有自定义 toJSON。
 */
var holdsToJson = (e) =>
  (typeof e === "object" || typeof e === "function") &&
  e !== null &&
  (typeof Reflect.get(e, "toJSON") === "function" ||
    (typeof e === "object" && (Array.isArray(e) ? denseListCopy(e) : Object.values(e)).some(holdsToJson)));
//@ chunk-4121qate.js:136309-136686 placement
/**
 * 判断对象沿原型或引用链是否会回到自身。
 */
function reachesItself(e, o, r) {
  let n = new Set(o);
  let s = [];
  let i = e;
  for (;;) {
    let p = typeof i === "object" && i !== null ? i : undefined;
    if (p !== undefined && n.has(p)) return true;
    if (p !== undefined && !r.has(p)) {
      n.add(p);
      s.push({
        held: p,
        parts: Array.isArray(p) ? denseListCopy(p) : Object.values(p),
        at: 0,
      });
    }
    let last = s.at(-1);
    if (last === undefined) return false;
    if (last.at < last.parts.length) {
      i = last.parts[last.at];
      last.at += 1;
      continue;
    }
    s.pop();
    n.delete(last.held);
    r.add(last.held);
    i = undefined;
  }
}
//@ chunk-4121qate.js:136686-137242 placement
function checkRenderElementOwner(e, o) {
  if (e.plugin !== o.plugin) return "a plugin other than the one that drew the element";
  if (typeof e.element !== "string") return "no { element }";
  if (typeof e.component !== "string") return "no { component }";
  if (e.requestId !== o.requestId) return "a requestId other than the instance the element was drawn in";
  if (!isUiElementTypeName(e.surface)) return "no { surface } naming a surface";
  let { link } = e;
  if (o.link === undefined) return link !== undefined ? "a { link } on a press that had none" : undefined;
  return isPlainObject(link) && typeof link.href === "string"
    ? undefined
    : "no { link: { href } } on a press that had one";
}
//@ chunk-4121qate.js:137242-137430 placement
/**
 * 校验 ui.input 参数：kind 不变，value 为字符串。
 */
function checkUiInputArgument(e, o) {
  let r = checkRenderElementOwner(e, o);
  if (r !== undefined) return r;
  if (e.kind !== o.kind) return `a kind other than the ${o.kind} it was given`;
  return typeof e.value === "string" ? undefined : "no { value } string";
}
//@ chunk-4121qate.js:137430-137592 placement
/**
 * 描述值的种类（数组、null、缺失、对象或类型名）。
 */
function describeValueKind(e) {
  if (Array.isArray(e)) return "an array";
  if (e === null) return "null";
  if (e === undefined) return "missing";
  return typeof e === "object" ? "an object" : `a ${typeof e}`;
}
//@ chunk-4121qate.js:137592-137792 placement
/**
 * 校验 columns/rows 为不超过视口的正整数。
 */
function checkCellSize(e, o, r) {
  if (!(isNonNegativeInt(e) && e >= 1 && e <= r.columns))
    return `columns must be a whole number from 1 to ${r.columns}`;
  return isNonNegativeInt(o) && o >= 1 && o <= r.rows
    ? undefined
    : `rows must be a whole number from 1 to ${r.rows}`;
}
//@ chunk-4121qate.js:137792-137856 placement
/**
 * 纯数据字符数
 */
function plainDataChars(e) {
  let o = emptyPlainDataState();
  return checkPlainDataDepth(e, 0, o) === undefined ? o.chars : 1 / 0;
}
//@ chunk-4121qate.js:137856-138113 placement
/**
 * 校验 ui.message 参数：只有 data 可改。
 */
function checkUiMessageArgument(e, o) {
  for (let n of ["surface", "component", "requestId", "element", "module"])
    if (e[n] !== o[n]) return `{ ${n} } rewritten; only data may change`;
  if (!("data" in e) || e.data === undefined) return "no { data }";
  let r = checkPlainData(e.data);
  return r === undefined ? undefined : `data ${r}`;
}
//@ chunk-4121qate.js:138113-138228 placement
/**
 * 校验 ui.message 的 props。
 */
function checkUiMessageProps(e) {
  if (!("props" in e) || e.props === undefined) return;
  let o = checkPlainData(e.props);
  return o === undefined ? undefined : `props ${o}`;
}
//@ chunk-4121qate.js:138228-138368 placement
var MESSAGE_COMPONENT_NAMES = new Set([
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
//@ chunk-4121qate.js:138368-138587 placement
/**
 * 校验 props.onScreen 与界面报告一致。
 */
function checkOnScreenProp(props, o) {
  return MESSAGE_COMPONENT_NAMES.has(o.component) &&
    checkPinnedKeys(["onScreen"], props, o.props) !== undefined
    ? "a props.onScreen other than the surface reported (the surface says what its viewport shows; a rewrite changes the drawing alone)"
    : undefined;
}
//@ chunk-4121qate.js:138587-138802 placement
/**
 * 校验 CommandOutput 的 props.command 未改。
 */
function checkCommandProp(props, o) {
  return o.component === "CommandOutput" && props.command !== o.props.command
    ? "a props.command other than the engine drew (the name is the command that printed the row; a rewrite changes the row alone)"
    : undefined;
}
//@ chunk-4121qate.js:138802-139002 placement
/**
 * 校验 Pane 的 props.placement 未改。
 */
function checkPlacementProp(props, o) {
  return o.component === "Pane" && props.placement !== o.props.placement
    ? "a props.placement other than the surface drew (the surface places the pane; a rewrite changes the drawing alone)"
    : undefined;
}
//@ chunk-4121qate.js:139002-139355 placement
/**
 * 校验 Placed 的 props.plugin 与 id 未改。
 */
function checkPlacedProps(props, o) {
  let r = o.component === "Placed" && props.plugin !== o.props.plugin;
  let n = o.component === "Placed" && props.id !== o.props.id;
  return r
    ? "a props.plugin other than placed the row (the row stays its placer's; a rewrite changes the drawing alone)"
    : n
      ? "a props.id other than the row was placed under (the id names the row; a rewrite changes the drawing alone)"
      : undefined;
}
//@ chunk-4121qate.js:139355-139539 placement
/**
 * 校验 ToolProgress 的 props.kind 未改。
 */
function checkProgressKindProp(props, o) {
  return o.component === "ToolProgress" && props.kind !== o.props.kind
    ? "a props.kind other than the engine drew (the kind names the row; a rewrite changes its text alone)"
    : undefined;
}
//@ chunk-4121qate.js:139539-139766 placement
/**
 * 校验 AssistantMessage 的 props.isSummary 未改。
 */
function checkSummaryProp(props, o) {
  return o.component === "AssistantMessage" && props.isSummary !== o.props.isSummary
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
function checkUserMessageProps(props, o) {
  if (o.component !== "UserMessage") return;
  let found = USER_MESSAGE_PINNED_KEYS.find((n) => checkPinnedKeys([n], props, o.props) !== undefined);
  if (found === undefined) return;
  return `a props.${found} other than the engine drew (the row names its message's origin, sender and task and how the view draws it; a rewrite changes the text alone)`;
}
//@ chunk-4121qate.js:140095-140333 placement
/**
 * 校验 Pane/AbovePrompt 的 props.view 未改。
 */
function checkViewProp(props, o) {
  return (o.component === "Pane" || o.component === "AbovePrompt") &&
    checkPinnedKeys(["view"], props, o.props) !== undefined
    ? "a props.view other than the surface drew (the person chooses the transcript in view; a rewrite changes the drawing alone)"
    : undefined;
}
//@ chunk-4121qate.js:140333-140509 placement
/**
 * 校验 props 中没有自带 toJSON 的值。
 */
var checkPropsToJson = (props, o) =>
  findChangedProp(props, o.props, (r) =>
    (r === "toJSON" && typeof props[r] === "function") || holdsToJson(props[r])
      ? `a props.${r} that holds a toJSON of its own; a prop may not say how it is serialised`
      : undefined,
  );
//@ chunk-4121qate.js:140509-140766 placement
/**
 * 校验工具类组件的 props.tool_use_id 未改。
 */
function checkToolUseIdProp(props, o) {
  return (o.component === "ToolUse" || o.component === "ToolResult" || o.component === "ToolProgress") &&
    props.tool_use_id !== o.props.tool_use_id
    ? "a props.tool_use_id other than the engine drew (the id names the call; a rewrite changes the row alone)"
    : undefined;
}
//@ chunk-4121qate.js:140766-141055 placement
/**
 * 校验 props 中没有新引入的循环引用。
 */
function checkPropsCycles(e, o) {
  let props = e.props;
  if (typeof props !== "object" || props === null) return;
  let n = new Set();
  let s = new Set();
  for (let [key, value] of Object.entries(props)) {
    let f = Reflect.get(o.props, key);
    if (value !== f && reachesItself(value, [e, props], n) && !reachesItself(f, [o, o.props], s))
      return `a props.${key} that holds itself; a prop may not reach back into itself`;
  }
  return;
}
//@ chunk-4121qate.js:141055-141596 placement
function checkRenderProps(e, o) {
  let props = e.props;
  if (!isPlainObject(props)) return "no { props } (an object)";
  let n = checkPropsCycles(e, o);
  if (n !== undefined) return n;
  let s = RENDER_PROP_KINDS[o.component] ?? {};
  for (let [key, value] of Object.entries(s)) {
    let f = describeValueKind(props[key]);
    if (value !== RASTER_OR_IMAGE_KIND_TEXT && !value.includes(f))
      return `a props.${key} that is ${f}, not ${value.join(" or ")}`;
  }
  for (let [key, value] of Object.entries(o.props)) {
    if (value === undefined || Object.hasOwn(s, key)) continue;
    let f = describeValueKind(value);
    let a = describeValueKind(props[key]);
    if (a !== f) return `a props.${key} that is ${a}, not ${f}`;
  }
  return (
    checkPropsControlChars(props, o) ??
    checkUserMessageProps(props, o) ??
    checkToolUseIdProp(props, o) ??
    checkProgressKindProp(props, o) ??
    checkToolGroupCalls(props, o) ??
    checkCommandProp(props, o) ??
    checkPlacementProp(props, o) ??
    checkPlacedProps(props, o) ??
    checkSummaryProp(props, o) ??
    checkViewProp(props, o) ??
    checkOnScreenProp(props, o) ??
    checkPropsToJson(props, o)
  );
}
//@ chunk-4121qate.js:141596-141952 placement
/**
 * 各渲染组件在哪些界面上触发（终端、桌面、VS Code 等）。
 */
var RENDER_COMPONENT_SURFACES = {
  AskUserQuestion: je,
  UserMessage: je,
  AssistantMessage: je,
  ToolUse: je,
  ToolResult: je,
  ToolGroup: je,
  ToolProgress: ["terminal"],
  CommandOutput: je,
  Spinner: ["terminal", "desktop", "vscode"],
  TurnDuration: ["terminal"],
  InfoNotice: ["terminal"],
  SessionMode: ["terminal", "desktop"],
  PromptHint: ["terminal", "desktop"],
  AbovePrompt: ["terminal", "desktop"],
  Pane: je,
  Placed: je,
};
//@ chunk-4121qate.js:141952-142152 placement
/**
 * 描述组件在哪些界面上触发。
 */
function describeComponentSurfaces(e) {
  let o = RENDER_COMPONENT_SURFACES[e];
  let all = je.every((s) => o.includes(s));
  let n = o.length === 1;
  return all
    ? "every attached surface"
    : n
      ? `the ${o[0]} surface only`
      : `the ${o.slice(0, -1).join(", ")} and ${o.at(-1)} surfaces only`;
}
//@ chunk-4121qate.js:142152-142183 placement
/**
 * 渲染参数与 props 校验
 */
var checkRenderArgAndProps = (e, o) => checkUiRenderPinned(e, o) ?? checkRenderProps(e, o);
//@ chunk-4121qate.js:142183-142221 placement
var qt = Object.freeze(Object.keys(RENDER_COMPONENT_SURFACES));
//@ chunk-4121qate.js:142221-142402 placement
/**
 * 取 matcher 对象某字段的字符串或字符串列表值。
 */
function matcherStrings(e, o) {
  if (!isPlainMatcherObject(e) || !Object.hasOwn(e, o)) return;
  let r = e[o];
  if (typeof r === "string") return [r];
  return Array.isArray(r) && r.length > 0 && r.every((s) => typeof s === "string") ? r : undefined;
}
//@ chunk-4121qate.js:142402-142527 placement
/**
 * 列出与 matcher 相符的（组件, 界面）组合。
 */
var matchingRenderSites = (e) =>
  qt.flatMap((o) =>
    RENDER_COMPONENT_SURFACES[o]
      .filter((r) => matchesField(e, "component", o) && matchesField(e, "surface", r))
      .map((surface) => ({
        component: o,
        surface,
      })),
  );
//@ chunk-4121qate.js:142527-142679 placement
/**
 * 列出未知名字的问题（附相近名建议）。
 */
var unknownNamesProblems = (e, o, r) =>
  uniq(e)
    .filter((n) => !o.includes(n))
    .map((n) => {
      let [s] = similarNames(n, o, 1);
      let i = s === undefined ? "" : ` (did you mean ${s}?)`;
      return `no ${r} is named ${n}${i}`;
    });
//@ chunk-4121qate.js:142679-143148 placement
/**
 * 检查 ui.render 的 matcher：未知组件/界面名（给出相近名），以及组件与界面组合永远不会触发的情况。
 */
function adviseUiRenderMatcher(matcher) {
  let o = Array.isArray(matcher) ? matcher : [matcher];
  let flattened = o.flatMap((c) => matcherStrings(c, "component") ?? []);
  let flattened_2 = o.flatMap((c) => matcherStrings(c, "surface") ?? []);
  let filtered = qt.filter((c) => flattened.includes(c));
  let filtered_2 = je.filter((c) => flattened_2.includes(c));
  let all = o.every((c) => matchingRenderSites(c).length === 0);
  let f = all && filtered.length > 0 && filtered_2.length > 0;
  let a = [
    ...unknownNamesProblems(flattened, qt, "component"),
    ...unknownNamesProblems(flattened_2, je, "surface"),
    ...(f
      ? [
          filtered.map((c) => `${c} is raised on ${describeComponentSurfaces(c)}`).join(", ") +
            `; this hook names ${filtered_2.join(", ")}`,
        ]
      : []),
  ];
  return a.length > 0 ? `${a.join("; ")}${all ? ", so it never runs" : ""}` : undefined;
}
//@ chunk-4121qate.js:143148-143387 placement
/**
 * 校验 ui.resolve 的 matcher 只按 surface 与 component 匹配。
 */
function checkResolveMatcher(e, o) {
  let filtered = Object.keys(e).filter((key) => key !== "surface" && key !== "component");
  return o || filtered.length === 0
    ? undefined
    : `resolved ahead of time, once per surface and component; a matcher here takes surface and component only, not ${filtered.join(", ")}`;
}
//@ chunk-4121qate.js:143387-143503 placement
/**
 * 校验 ui.select 参数：value 为字符串。
 */
function checkUiSelectArgument(e, o) {
  let r = checkRenderElementOwner(e, o);
  if (r !== undefined) return r;
  return typeof e.value === "string" ? undefined : "no { value } string";
}
//@ chunk-4121qate.js:143503-143528 placement
/**
 * ui.input 站点规则
 */
var UI_INPUT_SITE = createUiValueSite("ui.input", checkUiInputArgument);
//@ chunk-4121qate.js:143528-143585 placement
/**
 * ui.message 站点规则
 */
var UI_MESSAGE_SITE = {
  event: "ui.message",
  checkArgument: checkUiMessageArgument,
  check: checkResultObject(checkUiMessageProps),
};
//@ chunk-4121qate.js:143585-143694 placement
/**
 * ui.press 站点规则：结果需有 element。
 */
var UI_PRESS_SITE = {
  event: "ui.press",
  checkArgument: checkRenderElementOwner,
  check: checkResultObject((e) => (typeof e.element === "string" ? undefined : "no { element }")),
};
//@ chunk-4121qate.js:196298-196707 placement
var UI_RENDER_SITE = {
  event: "ui.render",
  argumentCopy: "whole",
  adoptArgument: (e, o, r) => restoreToolGroupCalls(restoreField("props")(e, o, r), o, r),
  restoreArgument: wellFormed,
  checkArgument: checkRenderArgAndProps,
  checkMatcher: (e) =>
    Object.hasOwn(e, "component") && matchesRegExpMatcher(e.component, PERMISSIONREQUEST)
      ? `${PERMISSIONREQUEST} is drawn by the engine alone; its answer authorises an action. A plugin adds context with $.ui.notice`
      : undefined,
  check: checkRenderTree,
  checkHop: (e, o) => checkRenderTree(e, o),
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
var UI_SELECT_SITE = createUiValueSite("ui.select", checkUiSelectArgument);
//@ chunk-d5gb8ms2.js:228-376 placement
/**
 * 取 matcher 中的 door 列表。
 */
function matcherDoors(e) {
  if (Array.isArray(e)) {
    let mapped = e.map(matcherDoors);
    return mapped.length > 0 && mapped.every((r) => r !== undefined)
      ? mapped.flatMap((r) => r ?? [])
      : undefined;
  }
  return matcherStrings(e, "door");
}
export {
  matcherDoors,
  RENDER_PROP_KINDS,
  PERMISSIONREQUEST,
  MESSAGE_COMPONENT_NAMES,
  PROP_TYPE_VALUES,
  qt,
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

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
  At,
  findChangedProp,
  ESCAPE_CHARACTER,
  PLACEHOLDER_CHARACTER,
  SPREAD_CELL,
  OPENING_MARK,
  LONE_SURROGATE,
} from "../ui/textScrub.js";
import { Rt, checkPinnedKeys, M, Ur, hK, Tr } from "./siteRules.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { Xv } from "./promptContextSites.js";
import { W5e, freeze_2, checkRenderArgument } from "../ui/renderSites.js";
import { Dr, checkPlainDataDepth, lEe } from "./plainData.js";
import { Z5e, hxt, gxt } from "../../../utils/hooks/functionHookMatchers.js";
import { uniq } from "../../../utils/collections.js";
import { similarNames } from "../../../utils/settings/managedEnvKeys.js";
import { wellFormed, checkRenderTree } from "../ui/validateTree.js";
import { checkElementTable } from "../ui/elements.js";

//@ chunk-4121qate.js:134242-134274 placement
var Fo = (e, o, r) => At(e, r) > At(o, r);
/**
 * ui.render 改写的 props 不得新增终端转义、图片占位、展开标记或孤立代理项等控制字符。
 */
//@ chunk-4121qate.js:134274-134611 placement
function checkPropsControlChars(e, o) {
  let props = o.props;
  return findChangedProp(e, props, (n) =>
    Fo(e[n], props[n], ESCAPE_CHARACTER) ||
    Fo(e[n], props[n], PLACEHOLDER_CHARACTER) ||
    At(e[n], SPREAD_CELL) > 0 ||
    At(e[n], OPENING_MARK) > 0 ||
    Fo(e[n], props[n], LONE_SURROGATE)
      ? `a props.${n} with a control character (an escape sequence the terminal would honour, an image placeholder, or an unpaired surrogate half out of reach); a rewrite the engine draws adds none`
      : void 0,
  );
}
//@ chunk-4121qate.js:134611-134649 placement
var et = ["an object", "null", "missing"];
/**
 * 各内置渲染组件的 props 类型约束表（AskUserQuestion、UserMessage、ToolUse、Spinner 等）。
 */
//@ chunk-4121qate.js:134649-135319 placement
var RENDER_PROP_KINDS = {
  AskUserQuestion: { metadataSource: ["a string", "missing"] },
  UserMessage: { onScreen: et },
  AssistantMessage: { isSummary: ["a boolean", "missing"], onScreen: et },
  ToolUse: { input: Rt, output: Rt, isExpanded: ["a boolean", "missing"], onScreen: et },
  ToolResult: { output: Rt, isExpanded: ["a boolean", "missing"], onScreen: et },
  ToolGroup: { isCallsOnly: ["a boolean", "missing"], onScreen: et },
  CommandOutput: { onScreen: et },
  Spinner: { message: ["a string", "null"], suffix: ["a string", "missing"] },
  TurnDuration: { isExpanded: ["a boolean", "missing"], waitingFor: ["an object", "missing"], onScreen: et },
  InfoNotice: { command: ["a string", "null"], onScreen: et },
  PromptHint: { tail: ["a string", "missing"] },
  Placed: { onScreen: et },
};
//@ chunk-4121qate.js:135319-135346 placement
var PERMISSIONREQUEST = "PermissionRequest";
//@ chunk-4121qate.js:135346-135400 placement
var si = ["surface", "component", "requestId", "viewport"];
//@ chunk-4121qate.js:135400-135424 placement
var ii = (e, o) => checkPinnedKeys(si, e, o);
/**
 * ui 值类站点规则工厂：结果需有 element 与 value 字符串。
 */
//@ chunk-4121qate.js:135424-135566 placement
var createUiValueSite = (e, o) => ({
  event: e,
  checkArgument: o,
  check: M((r) =>
    typeof r.element === "string" && typeof r.value === "string" ? void 0 : "no { element, value }",
  ),
});
/**
 * 校验 ToolGroup 的 calls 未被改动。
 */
//@ chunk-4121qate.js:135566-135893 placement
function checkToolGroupCalls(e, o) {
  let n = o.component === "ToolGroup" ? (Ur(o.props.calls) ?? []) : void 0,
    s = Ur(e.calls);
  return n !== void 0 && (s === void 0 || s.length !== n.length || s.some((p, f) => p === null || p !== n[f]))
    ? "props.calls whose tool_use_ids are not the ones the engine drew (each call keeps the id tool.call carried; the group's calls are its own)"
    : void 0;
}
/**
 * 恢复 ToolGroup 的 calls。
 */
//@ chunk-4121qate.js:135893-136122 placement
function restoreToolGroupCalls(e, o, r) {
  let { props: props } = e;
  if (!(o.component === "ToolGroup" && isPlainObject(props))) return e;
  let { calls: calls } = props,
    p = Array.isArray(calls) && calls !== o.props.calls,
    f = p ? calls : [],
    list = Array.from({ length: f.length }, (m, c) => f[c]);
  return p ? { ...e, props: { ...props, calls: r(list) } } : e;
}
/**
 * 判断值是否持有自定义 toJSON。
 */
//@ chunk-4121qate.js:136122-136309 placement
var holdsToJson = (e) =>
  (typeof e === "object" || typeof e === "function") &&
  e !== null &&
  (typeof Reflect.get(e, "toJSON") === "function" ||
    (typeof e === "object" && (Array.isArray(e) ? Xv(e) : Object.values(e)).some(holdsToJson)));
/**
 * 判断对象沿原型或引用链是否会回到自身。
 */
//@ chunk-4121qate.js:136309-136686 placement
function reachesItself(e, o, r) {
  let n = new Set(o),
    s = [],
    i = e;
  for (;;) {
    let p = typeof i === "object" && i !== null ? i : void 0;
    if (p !== void 0 && n.has(p)) return !0;
    if (p !== void 0 && !r.has(p))
      (n.add(p), s.push({ held: p, parts: Array.isArray(p) ? Xv(p) : Object.values(p), at: 0 }));
    let at = s.at(-1);
    if (at === void 0) return !1;
    if (at.at < at.parts.length) {
      ((i = at.parts[at.at]), (at.at += 1));
      continue;
    }
    (s.pop(), n.delete(at.held), r.add(at.held), (i = void 0));
  }
}
//@ chunk-4121qate.js:136686-137242 placement
function checkRenderElementOwner(e, o) {
  if (e.plugin !== o.plugin) return "a plugin other than the one that drew the element";
  if (typeof e.element !== "string") return "no { element }";
  if (typeof e.component !== "string") return "no { component }";
  if (e.requestId !== o.requestId) return "a requestId other than the instance the element was drawn in";
  if (!W5e(e.surface)) return "no { surface } naming a surface";
  let { link: link } = e;
  if (o.link === void 0) return link !== void 0 ? "a { link } on a press that had none" : void 0;
  return isPlainObject(link) && typeof link.href === "string"
    ? void 0
    : "no { link: { href } } on a press that had one";
}
/**
 * 校验 ui.input 参数：kind 不变，value 为字符串。
 */
//@ chunk-4121qate.js:137242-137430 placement
function checkUiInputArgument(e, o) {
  let r = checkRenderElementOwner(e, o);
  if (r !== void 0) return r;
  if (e.kind !== o.kind) return `a kind other than the ${o.kind} it was given`;
  return typeof e.value === "string" ? void 0 : "no { value } string";
}
/**
 * 描述值的种类（数组、null、缺失、对象或类型名）。
 */
//@ chunk-4121qate.js:137430-137592 placement
function describeValueKind(e) {
  if (Array.isArray(e)) return "an array";
  if (e === null) return "null";
  if (e === void 0) return "missing";
  return typeof e === "object" ? "an object" : `a ${typeof e}`;
}
/**
 * 校验 columns/rows 为不超过视口的正整数。
 */
//@ chunk-4121qate.js:137592-137792 placement
function checkCellSize(e, o, r) {
  if (!(hK(e) && e >= 1 && e <= r.columns)) return `columns must be a whole number from 1 to ${r.columns}`;
  return hK(o) && o >= 1 && o <= r.rows ? void 0 : `rows must be a whole number from 1 to ${r.rows}`;
}
//@ chunk-4121qate.js:137792-137856 placement
function gm(e) {
  let o = Dr();
  return checkPlainDataDepth(e, 0, o) === void 0 ? o.chars : 1 / 0;
}
/**
 * 校验 ui.message 参数：只有 data 可改。
 */
//@ chunk-4121qate.js:137856-138113 placement
function checkUiMessageArgument(e, o) {
  for (let n of ["surface", "component", "requestId", "element", "module"])
    if (e[n] !== o[n]) return `{ ${n} } rewritten; only data may change`;
  if (!("data" in e) || e.data === void 0) return "no { data }";
  let r = lEe(e.data);
  return r === void 0 ? void 0 : `data ${r}`;
}
/**
 * 校验 ui.message 的 props。
 */
//@ chunk-4121qate.js:138113-138228 placement
function checkUiMessageProps(e) {
  if (!("props" in e) || e.props === void 0) return;
  let o = lEe(e.props);
  return o === void 0 ? void 0 : `props ${o}`;
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
/**
 * 校验 props.onScreen 与界面报告一致。
 */
//@ chunk-4121qate.js:138368-138587 placement
function checkOnScreenProp(e, o) {
  return MESSAGE_COMPONENT_NAMES.has(o.component) && checkPinnedKeys(["onScreen"], e, o.props) !== void 0
    ? "a props.onScreen other than the surface reported (the surface says what its viewport shows; a rewrite changes the drawing alone)"
    : void 0;
}
/**
 * 校验 CommandOutput 的 props.command 未改。
 */
//@ chunk-4121qate.js:138587-138802 placement
function checkCommandProp(e, o) {
  return o.component === "CommandOutput" && e.command !== o.props.command
    ? "a props.command other than the engine drew (the name is the command that printed the row; a rewrite changes the row alone)"
    : void 0;
}
/**
 * 校验 Pane 的 props.placement 未改。
 */
//@ chunk-4121qate.js:138802-139002 placement
function checkPlacementProp(e, o) {
  return o.component === "Pane" && e.placement !== o.props.placement
    ? "a props.placement other than the surface drew (the surface places the pane; a rewrite changes the drawing alone)"
    : void 0;
}
/**
 * 校验 Placed 的 props.plugin 与 id 未改。
 */
//@ chunk-4121qate.js:139002-139355 placement
function checkPlacedProps(e, o) {
  let r = o.component === "Placed" && e.plugin !== o.props.plugin,
    n = o.component === "Placed" && e.id !== o.props.id;
  return r
    ? "a props.plugin other than placed the row (the row stays its placer's; a rewrite changes the drawing alone)"
    : n
      ? "a props.id other than the row was placed under (the id names the row; a rewrite changes the drawing alone)"
      : void 0;
}
/**
 * 校验 ToolProgress 的 props.kind 未改。
 */
//@ chunk-4121qate.js:139355-139539 placement
function checkProgressKindProp(e, o) {
  return o.component === "ToolProgress" && e.kind !== o.props.kind
    ? "a props.kind other than the engine drew (the kind names the row; a rewrite changes its text alone)"
    : void 0;
}
/**
 * 校验 AssistantMessage 的 props.isSummary 未改。
 */
//@ chunk-4121qate.js:139539-139766 placement
function checkSummaryProp(e, o) {
  return o.component === "AssistantMessage" && e.isSummary !== o.props.isSummary
    ? "a props.isSummary other than the engine drew (the row names its block as a summary or not; a rewrite changes the drawing alone)"
    : void 0;
}
//@ chunk-4121qate.js:139766-139811 placement
var ki = ["origin", "isExpanded", "task", "from"];
/**
 * 校验 UserMessage 的固定 props 未改。
 */
//@ chunk-4121qate.js:139811-140095 placement
function checkUserMessageProps(e, o) {
  if (o.component !== "UserMessage") return;
  let found = ki.find((n) => checkPinnedKeys([n], e, o.props) !== void 0);
  if (found === void 0) return;
  return `a props.${found} other than the engine drew (the row names its message's origin, sender and task and how the view draws it; a rewrite changes the text alone)`;
}
/**
 * 校验 Pane/AbovePrompt 的 props.view 未改。
 */
//@ chunk-4121qate.js:140095-140333 placement
function checkViewProp(e, o) {
  return (o.component === "Pane" || o.component === "AbovePrompt") &&
    checkPinnedKeys(["view"], e, o.props) !== void 0
    ? "a props.view other than the surface drew (the person chooses the transcript in view; a rewrite changes the drawing alone)"
    : void 0;
}
/**
 * 校验 props 中没有自带 toJSON 的值。
 */
//@ chunk-4121qate.js:140333-140509 placement
var checkPropsToJson = (e, o) =>
  findChangedProp(e, o.props, (r) =>
    (r === "toJSON" && typeof e[r] === "function") || holdsToJson(e[r])
      ? `a props.${r} that holds a toJSON of its own; a prop may not say how it is serialised`
      : void 0,
  );
/**
 * 校验工具类组件的 props.tool_use_id 未改。
 */
//@ chunk-4121qate.js:140509-140766 placement
function checkToolUseIdProp(e, o) {
  return (o.component === "ToolUse" || o.component === "ToolResult" || o.component === "ToolProgress") &&
    e.tool_use_id !== o.props.tool_use_id
    ? "a props.tool_use_id other than the engine drew (the id names the call; a rewrite changes the row alone)"
    : void 0;
}
/**
 * 校验 props 中没有新引入的循环引用。
 */
//@ chunk-4121qate.js:140766-141055 placement
function checkPropsCycles(e, o) {
  let props = e.props;
  if (typeof props !== "object" || props === null) return;
  let n = new Set(),
    s = new Set();
  for (let [i, p] of Object.entries(props)) {
    let f = Reflect.get(o.props, i);
    if (p !== f && reachesItself(p, [e, props], n) && !reachesItself(f, [o, o.props], s))
      return `a props.${i} that holds itself; a prop may not reach back into itself`;
  }
  return;
}
//@ chunk-4121qate.js:141055-141596 placement
function checkRenderProps(e, o) {
  let props = e.props;
  if (!isPlainObject(props)) return "no { props } (an object)";
  let n = checkPropsCycles(e, o);
  if (n !== void 0) return n;
  let s = RENDER_PROP_KINDS[o.component] ?? {};
  for (let [i, p] of Object.entries(s)) {
    let f = describeValueKind(props[i]);
    if (p !== Rt && !p.includes(f)) return `a props.${i} that is ${f}, not ${p.join(" or ")}`;
  }
  for (let [i, p] of Object.entries(o.props)) {
    if (p === void 0 || Object.hasOwn(s, i)) continue;
    let f = describeValueKind(p),
      a = describeValueKind(props[i]);
    if (a !== f) return `a props.${i} that is ${a}, not ${f}`;
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
/**
 * 各渲染组件在哪些界面上触发（终端、桌面、VS Code 等）。
 */
//@ chunk-4121qate.js:141596-141952 placement
var RENDER_COMPONENT_SURFACES = {
  AskUserQuestion: freeze_2,
  UserMessage: freeze_2,
  AssistantMessage: freeze_2,
  ToolUse: freeze_2,
  ToolResult: freeze_2,
  ToolGroup: freeze_2,
  ToolProgress: ["terminal"],
  CommandOutput: freeze_2,
  Spinner: ["terminal", "desktop", "vscode"],
  TurnDuration: ["terminal"],
  InfoNotice: ["terminal"],
  SessionMode: ["terminal", "desktop"],
  PromptHint: ["terminal", "desktop"],
  AbovePrompt: ["terminal", "desktop"],
  Pane: freeze_2,
  Placed: freeze_2,
};
/**
 * 描述组件在哪些界面上触发。
 */
//@ chunk-4121qate.js:141952-142152 placement
function describeComponentSurfaces(e) {
  let o = RENDER_COMPONENT_SURFACES[e],
    all = freeze_2.every((s) => o.includes(s)),
    n = o.length === 1;
  return all
    ? "every attached surface"
    : n
      ? `the ${o[0]} surface only`
      : `the ${o.slice(0, -1).join(", ")} and ${o.at(-1)} surfaces only`;
}
//@ chunk-4121qate.js:142152-142183 placement
var Pi = (e, o) => ii(e, o) ?? checkRenderProps(e, o);
//@ chunk-4121qate.js:142183-142221 placement
var freeze_8 = Object.freeze(Object.keys(RENDER_COMPONENT_SURFACES));
/**
 * 取 matcher 对象某字段的字符串或字符串列表值。
 */
//@ chunk-4121qate.js:142221-142402 placement
function matcherStrings(e, o) {
  if (!Z5e(e) || !Object.hasOwn(e, o)) return;
  let r = e[o];
  if (typeof r === "string") return [r];
  return Array.isArray(r) && r.length > 0 && r.every((s) => typeof s === "string") ? r : void 0;
}
/**
 * 列出与 matcher 相符的（组件, 界面）组合。
 */
//@ chunk-4121qate.js:142402-142527 placement
var matchingRenderSites = (e) =>
  freeze_8.flatMap((o) =>
    RENDER_COMPONENT_SURFACES[o]
      .filter((r) => hxt(e, "component", o) && hxt(e, "surface", r))
      .map((r) => ({ component: o, surface: r })),
  );
/**
 * 列出未知名字的问题（附相近名建议）。
 */
//@ chunk-4121qate.js:142527-142679 placement
var unknownNamesProblems = (e, o, r) =>
  uniq(e)
    .filter((n) => !o.includes(n))
    .map((n) => {
      let [s] = similarNames(n, o, 1),
        i = s === void 0 ? "" : ` (did you mean ${s}?)`;
      return `no ${r} is named ${n}${i}`;
    });
/**
 * 检查 ui.render 的 matcher：未知组件/界面名（给出相近名），以及组件与界面组合永远不会触发的情况。
 */
//@ chunk-4121qate.js:142679-143148 placement
function adviseUiRenderMatcher(e) {
  let o = Array.isArray(e) ? e : [e],
    flattened = o.flatMap((c) => matcherStrings(c, "component") ?? []),
    flattened_2 = o.flatMap((c) => matcherStrings(c, "surface") ?? []),
    filtered = freeze_8.filter((c) => flattened.includes(c)),
    filtered_2 = freeze_2.filter((c) => flattened_2.includes(c)),
    all = o.every((c) => matchingRenderSites(c).length === 0),
    f = all && filtered.length > 0 && filtered_2.length > 0,
    a = [
      ...unknownNamesProblems(flattened, freeze_8, "component"),
      ...unknownNamesProblems(flattened_2, freeze_2, "surface"),
      ...(f
        ? [
            filtered.map((c) => `${c} is raised on ${describeComponentSurfaces(c)}`).join(", ") +
              `; this hook names ${filtered_2.join(", ")}`,
          ]
        : []),
    ];
  return a.length > 0 ? `${a.join("; ")}${all ? ", so it never runs" : ""}` : void 0;
}
/**
 * 校验 ui.resolve 的 matcher 只按 surface 与 component 匹配。
 */
//@ chunk-4121qate.js:143148-143387 placement
function checkResolveMatcher(e, o) {
  let filtered = Object.keys(e).filter((s) => s !== "surface" && s !== "component");
  return o || filtered.length === 0
    ? void 0
    : `resolved ahead of time, once per surface and component; a matcher here takes surface and component only, not ${filtered.join(", ")}`;
}
/**
 * 校验 ui.select 参数：value 为字符串。
 */
//@ chunk-4121qate.js:143387-143503 placement
function checkUiSelectArgument(e, o) {
  let r = checkRenderElementOwner(e, o);
  if (r !== void 0) return r;
  return typeof e.value === "string" ? void 0 : "no { value } string";
}
//@ chunk-4121qate.js:143503-143528 placement
var xm = createUiValueSite("ui.input", checkUiInputArgument);
//@ chunk-4121qate.js:143528-143585 placement
var km = { event: "ui.message", checkArgument: checkUiMessageArgument, check: M(checkUiMessageProps) };
/**
 * ui.press 站点规则：结果需有 element。
 */
//@ chunk-4121qate.js:143585-143694 placement
var UI_PRESS_SITE = {
  event: "ui.press",
  checkArgument: checkRenderElementOwner,
  check: M((e) => (typeof e.element === "string" ? void 0 : "no { element }")),
};
//@ chunk-4121qate.js:196298-196707 placement
var UI_RENDER_SITE = {
  event: "ui.render",
  argumentCopy: "whole",
  adoptArgument: (e, o, r) => restoreToolGroupCalls(Tr("props")(e, o, r), o, r),
  restoreArgument: wellFormed,
  checkArgument: Pi,
  checkMatcher: (e) =>
    Object.hasOwn(e, "component") && gxt(e.component, PERMISSIONREQUEST)
      ? `${PERMISSIONREQUEST} is drawn by the engine alone; its answer authorises an action. A plugin adds context with $.ui.notice`
      : void 0,
  check: checkRenderTree,
  checkHop: (e, o) => checkRenderTree(e, o),
  refusedSubject: ({ component: component, requestId: requestId }) => `${component} ${requestId}`,
};
//@ chunk-4121qate.js:196707-196777 placement
var Cu = {
  event: "ui.resolve",
  checkArgument: checkRenderArgument,
  checkMatcher: checkResolveMatcher,
  check: checkElementTable,
};
//@ chunk-4121qate.js:196777-196803 placement
var Hu = createUiValueSite("ui.select", checkUiSelectArgument);
/**
 * 取 matcher 中的 door 列表。
 */
//@ chunk-d5gb8ms2.js:228-376 placement
function matcherDoors(e) {
  if (Array.isArray(e)) {
    let mapped = e.map(matcherDoors);
    return mapped.length > 0 && mapped.every((r) => r !== void 0) ? mapped.flatMap((r) => r ?? []) : void 0;
  }
  return matcherStrings(e, "door");
}

export {
  matcherDoors,
  RENDER_PROP_KINDS,
  PERMISSIONREQUEST,
  MESSAGE_COMPONENT_NAMES,
  et,
  freeze_8,
  si,
  RENDER_COMPONENT_SURFACES,
  ki,
  xm,
  km,
  UI_PRESS_SITE,
  UI_RENDER_SITE,
  Cu,
  Hu,
  checkPropsControlChars,
  ii,
  createUiValueSite,
  checkToolGroupCalls,
  restoreToolGroupCalls,
  Fo,
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
  Pi,
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
  gm,
  checkCellSize,
};

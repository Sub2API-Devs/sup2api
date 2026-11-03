/**
 * utils/permissions/actionSummary.ts
 *
 * 2.1.316 新增：计算机操作摘要 schema
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (25)
 * attribution: placement 25
 */
import { isPlainObject as isPlainObject_4 } from "../isPlainObject.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
} from "../../services/analytics/growthbook.js";
import { uae } from "../claudeInChrome/chromeToolNames.js";
import { ge } from "../identity.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { Qbe, Kfe, mZn } from "../../services/projects/threadRows.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logError } from "../log.js";
import { getMcpPrefix as getMcpPrefix_2 } from "../../services/mcp/mcpStringUtils.js";
import { COMPUTER_USE_MCP_SERVER_NAME } from "../computerUse/common.js";
import { REMOTE_DEVICES } from "../../services/mcp/firstPartyServerIds.js";

//@ chunk-e6aww6q8.js:990241-990271 placement
var TENGU_DRIFTING_REEF = "tengu_drifting_reef";
//@ chunk-e6aww6q8.js:990271-990312 placement
function b1t(e, n) {
  return isPlainObject_4(e) && e[n] === !0;
}
//@ chunk-e6aww6q8.js:990312-990354 placement
function p1r(e) {
  return b1t(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_DRIFTING_REEF, null), e);
}
//@ chunk-e6aww6q8.js:990354-990397 placement
function Phe(e) {
  return b1t(getFeatureValue_SESSION_PINNED(TENGU_DRIFTING_REEF, null), e);
}
/**
 * 计算机操作的 action_summary 字段说明与适用的操作。
 */
//@ chunk-e6aww6q8.js:990397-991504 placement
var ACTION_SUMMARY_SCHEMA = "action_summary",
  Uz =
    "State the effect only, and accurately: no reasons, nothing about what you were asked or allowed to do, no passwords or other secrets.",
  T1t = new Set([
    "left_click",
    "right_click",
    "double_click",
    "triple_click",
    "left_click_drag",
    "key",
    "type",
  ]),
  freeze_6 = Object.freeze({
    type: "string",
    description: `A few words saying what this action does on the page and to what, for example 'Sends the drafted reply to pat@example.com' or 'Opens the Filters menu'. Set it on every left_click, right_click, double_click, triple_click, left_click_drag, key and type action. ${Uz}`,
  }),
  freeze_7 = Object.freeze({
    type: "string",
    description: `A few words saying what this form fill does on the page and to what, for example 'Sets the delivery date to 29 September'. ${Uz}`,
  }),
  RGe = `For computer items whose action is left_click, right_click, double_click, triple_click, left_click_drag, key or type, and for form_input items, include ${ACTION_SUMMARY_SCHEMA} in the item's input, as you would when calling that tool directly.`,
  E1t = new Map(
    uae.flatMap((e) => [
      [e + "computer", freeze_6],
      [e + "form_input", freeze_7],
    ]),
  ),
  R1t = new Set(uae.map((e) => e + "browser_batch"));
//@ chunk-e6aww6q8.js:991504-991693 placement
function getActionsSchemaParts(e) {
  let n = e?.properties?.actions;
  if (!isPlainObject_4(n) || !isPlainObject_4(n.items)) return;
  let items = n.items,
    properties = items.properties;
  if (!isPlainObject_4(properties) || !isPlainObject_4(properties.input)) return;
  return { actions: n, items: items, itemProperties: properties, input: properties.input };
}
//@ chunk-e6aww6q8.js:991693-991939 placement
function getActionSummaryLength(e, n, r) {
  let s = E1t.get(e),
    h = n?.properties;
  if (s === void 0 || typeof h !== "object" || h === null || !(ACTION_SUMMARY_SCHEMA in h)) return;
  let y = r;
  if (s === freeze_6 && !(typeof y?.action === "string" && T1t.has(y.action))) return;
  let S = y?.[ACTION_SUMMARY_SCHEMA];
  return typeof S === "string" ? S.length : 0;
}
//@ chunk-e6aww6q8.js:991939-992038 placement
function mPo() {
  return (
    getFeatureValue_SESSION_PINNED("tengu_auto_mode_config", {})?.chromeAgentNote === !0 ||
    Phe("browserSummary")
  );
}
//@ chunk-e6aww6q8.js:992038-992081 placement
var w1t = ge({ logged: !1 }, (e) => {
  e.logged = !1;
});
/**
 * 在开关开启时给计算机操作类工具的输入 schema 加上操作摘要字段（批量动作工具改写 actions 描述）。
 */
//@ chunk-e6aww6q8.js:992081-992310 placement
function addActionSummaryToSchema(e, n, r = mPo) {
  if (R1t.has(n)) return addActionSummaryToBatchDescription(e, r);
  let s = E1t.get(n);
  if (
    s === void 0 ||
    typeof e.properties !== "object" ||
    e.properties === null ||
    ACTION_SUMMARY_SCHEMA in e.properties ||
    !r()
  )
    return e;
  return (x1t(), { ...e, properties: { ...e.properties, [ACTION_SUMMARY_SCHEMA]: s } });
}
//@ chunk-e6aww6q8.js:992310-992381 placement
function x1t() {
  if (!w1t.logged) ((w1t.logged = !0), logFeatureOk("chrome_action_summary"));
}
/**
 * 在批量动作工具的 actions.items.input 描述中追加操作摘要要求（已有时不重复）。
 */
//@ chunk-e6aww6q8.js:992381-992725 placement
function addActionSummaryToBatchDescription(e, n) {
  let r = getActionsSchemaParts(e);
  if (r === void 0) return e;
  let { actions: actions, items: items, itemProperties: itemProperties, input: input } = r,
    description = input.description;
  if (
    (description !== void 0 && typeof description !== "string") ||
    description?.includes(ACTION_SUMMARY_SCHEMA) ||
    !n()
  )
    return e;
  return (
    x1t(),
    {
      ...e,
      properties: {
        ...e.properties,
        actions: {
          ...actions,
          items: {
            ...items,
            properties: {
              ...itemProperties,
              input: {
                ...input,
                description: description === void 0 || description === "" ? RGe : `${description} ${RGe}`,
              },
            },
          },
        },
      },
    }
  );
}
/**
 * 统计批量动作调用中需要摘要的动作（form_input 与特定 computer 动作）数和实际填写了摘要的数量。
 */
//@ chunk-e6aww6q8.js:992725-993171 placement
function countBatchActionSummaries(e, n, r) {
  if (!R1t.has(e)) return;
  let s = getActionsSchemaParts(n)?.input.description;
  if (typeof s !== "string" || !s.includes(RGe)) return;
  let h = 0,
    y = 0,
    S = isPlainObject_4(r) && Array.isArray(r.actions) ? r.actions : [];
  for (let w of S) {
    if (!isPlainObject_4(w) || !isPlainObject_4(w.input)) continue;
    if (!(
      w.name === "form_input" ||
      (w.name === "computer" && typeof w.input.action === "string" && T1t.has(w.input.action))
    ))
      continue;
    h++;
    let G = w.input[ACTION_SUMMARY_SCHEMA];
    if (typeof G === "string" && G.trim() !== "") y++;
  }
  return { expectedItems: h, filledItems: y };
}
/**
 * 项目功能开启时，按根工具集判断项目角色（thread/overview/other）用于遥测；出错时返回空对象。
 */
//@ chunk-e6aww6q8.js:993171-993330 placement
function getProjectsRoleTelemetry(e) {
  try {
    if (!Qbe()) return {};
    let { tools: tools } = e.rootToolSurface;
    return { projectsRole: fromEnum(Kfe(tools) ? "thread" : mZn(tools) ? "overview" : "other") };
  } catch (error) {
    logError(error);
  }
  return {};
}
//@ chunk-e6aww6q8.js:994061-994922 placement
var ACTION_SUMMARY_FIELD =
    "A few words saying what this action does and to what, for example 'Sends the drafted reply to pat@example.com' or 'Opens the Filters menu'.",
  freeze_8 = Object.freeze({
    type: "string",
    description: `${ACTION_SUMMARY_FIELD} Set it on every call. ${Uz}`,
  }),
  I1t = ["mouse_move", "scroll", "screenshot", "zoom", "cursor_position", "wait"],
  D1t = ["scroll", "screenshot", "zoom"],
  freeze_9 = Object.freeze({
    type: "string",
    description: `${ACTION_SUMMARY_FIELD} Set it on every action except ${joinWithAnd(I1t)}. ${Uz}`,
  }),
  freeze_10 = Object.freeze({
    type: "string",
    description: `${ACTION_SUMMARY_FIELD} Set it on every action except ${joinWithAnd(D1t)}. ${Uz}`,
  }),
  kPo = [
    "left_click",
    "right_click",
    "middle_click",
    "double_click",
    "triple_click",
    "left_click_drag",
    "left_mouse_down",
    "left_mouse_up",
    "key",
    "hold_key",
    "type",
    "app_click",
    "app_drag",
    "app_key",
    "app_type",
    "app_menu",
  ],
  bPo = { computer_batch: freeze_9, app_batch: freeze_10 },
  wPo = { computer_batch: I1t, app_batch: D1t },
  TPo = getMcpPrefix_2(COMPUTER_USE_MCP_SERVER_NAME),
  M1t = getMcpPrefix_2(REMOTE_DEVICES);
//@ chunk-e6aww6q8.js:994922-995014 placement
function AGe(e) {
  return [TPo + e, `${M1t}computer_${e}`, ...(e.startsWith("computer_") ? [M1t + e] : [])];
}
//@ chunk-e6aww6q8.js:995014-995196 placement
var ACTION_SUMMARY_TOOLS = new Set(kPo.flatMap(AGe)),
  ACTION_SUMMARY_ITEM_TOOLS = new Map(Object.entries(bPo).flatMap(([e, n]) => AGe(e).map((r) => [r, n]))),
  ACTION_SUMMARY_EXEMPT_ACTIONS = new Map(Object.entries(wPo).flatMap(([e, n]) => AGe(e).map((r) => [r, n])));
//@ chunk-e6aww6q8.js:995196-995304 placement
function isComputerUseSummaryEnabled() {
  return (
    getFeatureValue_SESSION_PINNED("tengu_auto_mode_config", {})?.computerUseAgentNote === !0 ||
    Phe("computerUseSummary")
  );
}
//@ chunk-e6aww6q8.js:995304-995347 placement
var O1t = ge({ logged: !1 }, (e) => {
  e.logged = !1;
});
/**
 * 计算机使用类工具开关开启时给 schema（或 actions.items）加操作摘要字段，首次生效记 computeruse_action_summary。
 */
//@ chunk-e6aww6q8.js:995347-995555 placement
function addComputerUseActionSummary(e, n, r = isComputerUseSummaryEnabled) {
  let s = ACTION_SUMMARY_ITEM_TOOLS.get(n);
  if (s === void 0 && !ACTION_SUMMARY_TOOLS.has(n)) return e;
  let h = s === void 0 ? addSummaryProperty(e, freeze_8) : addSummaryToActionItems(e, s);
  if (h === e || !r()) return e;
  if (!O1t.logged) ((O1t.logged = !0), logFeatureOk("computeruse_action_summary"));
  return h;
}
/**
 * 统计工具调用的操作摘要填写情况：单动作工具返回摘要长度；批量工具返回需摘要动作数与已填数。
 */
//@ chunk-e6aww6q8.js:995555-996091 placement
function measureActionSummaries(e, n, r) {
  let properties = n?.properties;
  if (!uM(properties)) return;
  let input = uM(r) ? r : {};
  if (ACTION_SUMMARY_TOOLS.has(e)) {
    if (!(ACTION_SUMMARY_SCHEMA in properties)) return;
    let G = input[ACTION_SUMMARY_SCHEMA];
    return { length: typeof G === "string" ? G.length : 0 };
  }
  let exemptActions = ACTION_SUMMARY_EXEMPT_ACTIONS.get(e);
  if (exemptActions === void 0) return;
  let actions = properties.actions;
  if (
    !uM(actions) ||
    !uM(actions.items) ||
    !uM(actions.items.properties) ||
    !(ACTION_SUMMARY_SCHEMA in actions.items.properties)
  )
    return;
  let expectedItems = 0,
    filledItems = 0;
  for (let G of Array.isArray(input.actions) ? input.actions : []) {
    if (!uM(G) || typeof G.action !== "string" || exemptActions.includes(G.action)) continue;
    expectedItems++;
    let q = G[ACTION_SUMMARY_SCHEMA];
    if (typeof q === "string" && q.trim() !== "") filledItems++;
  }
  return { expectedItems: expectedItems, filledItems: filledItems };
}
//@ chunk-e6aww6q8.js:996091-996191 placement
function joinWithAnd(e) {
  if (e.length < 2) return e.join("");
  return `${e.slice(0, -1).join(", ")} and ${e.at(-1)}`;
}
//@ chunk-e6aww6q8.js:996191-996262 placement
function uM(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-e6aww6q8.js:996262-996379 placement
function addSummaryProperty(e, n) {
  if (!uM(e.properties) || ACTION_SUMMARY_SCHEMA in e.properties) return e;
  return { ...e, properties: { ...e.properties, [ACTION_SUMMARY_SCHEMA]: n } };
}
//@ chunk-e6aww6q8.js:996379-996568 placement
function addSummaryToActionItems(e, n) {
  let r = e.properties?.actions;
  if (!uM(r) || !uM(r.items)) return e;
  let s = addSummaryProperty(r.items, n);
  if (s === r.items) return e;
  return { ...e, properties: { ...e.properties, actions: { ...r, items: s } } };
}

export {
  p1r,
  getProjectsRoleTelemetry,
  measureActionSummaries,
  countBatchActionSummaries,
  getActionSummaryLength,
  addComputerUseActionSummary,
  addActionSummaryToSchema,
};

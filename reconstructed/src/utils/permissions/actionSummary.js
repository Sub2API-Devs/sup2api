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
import { isPlainObject as isPlainObject_5 } from "../isPlainObject.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
} from "../../services/analytics/growthbook.js";
import { CHROME_TOOL_PREFIXES } from "../claudeInChrome/chromeToolNames.js";
import { identity as identity_2 } from "../identity.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import {
  hasRelaySourceForClients,
  hasUpdateStatusToolOnly,
  hasStartThreadToolOnly,
} from "../../services/projects/threadRows.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logError } from "../log.js";
import { getMcpPrefix as getMcpPrefix_2 } from "../../services/mcp/mcpStringUtils.js";
import { COMPUTER_USE_MCP_SERVER_NAME } from "../computerUse/common.js";
import { REMOTE_DEVICES } from "../../services/mcp/firstPartyServerIds.js";

//@ chunk-e6aww6q8.js:990241-990271 placement
var TENGU_DRIFTING_REEF = "tengu_drifting_reef";
//@ chunk-e6aww6q8.js:990271-990312 placement
function flagInFeatureConfig(e, n) {
  return isPlainObject_5(e) && e[n] === true;
}
//@ chunk-e6aww6q8.js:990312-990354 placement
/**
 * isActionSummaryEnabled：动作摘要总开关。
 */
function isActionSummaryEnabled(e) {
  return flagInFeatureConfig(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_DRIFTING_REEF, null), e);
}
//@ chunk-e6aww6q8.js:990354-990397 placement
function isSessionPinnedActionSummary(e) {
  return flagInFeatureConfig(getFeatureValue_SESSION_PINNED(TENGU_DRIFTING_REEF, null), e);
}
//@ chunk-e6aww6q8.js:990397-991504 placement
/**
 * 计算机操作的 action_summary 字段说明与适用的操作。
 */
var ACTION_SUMMARY_SCHEMA = "action_summary";
var ACTION_SUMMARY_STYLE_RULE =
  "State the effect only, and accurately: no reasons, nothing about what you were asked or allowed to do, no passwords or other secrets.";
var COMPUTER_ACTIONS_WITH_SUMMARY = new Set([
  "left_click",
  "right_click",
  "double_click",
  "triple_click",
  "left_click_drag",
  "key",
  "type",
]);
var v1t = Object.freeze({
  type: "string",
  description: `A few words saying what this action does on the page and to what, for example 'Sends the drafted reply to pat@example.com' or 'Opens the Filters menu'. Set it on every left_click, right_click, double_click, triple_click, left_click_drag, key and type action. ${ACTION_SUMMARY_STYLE_RULE}`,
});
var pPo = Object.freeze({
  type: "string",
  description: `A few words saying what this form fill does on the page and to what, for example 'Sets the delivery date to 29 September'. ${ACTION_SUMMARY_STYLE_RULE}`,
});
var BATCH_ITEM_SUMMARY_INSTRUCTION = `For computer items whose action is left_click, right_click, double_click, triple_click, left_click_drag, key or type, and for form_input items, include ${ACTION_SUMMARY_SCHEMA} in the item's input, as you would when calling that tool directly.`;
var ACTION_SUMMARY_SCHEMA_BY_TOOL = new Map(
  CHROME_TOOL_PREFIXES.flatMap((e) => [
    [e + "computer", v1t],
    [e + "form_input", pPo],
  ]),
);
var BATCH_TOOLS_WITH_SUMMARY = new Set(CHROME_TOOL_PREFIXES.map((e) => e + "browser_batch"));
//@ chunk-e6aww6q8.js:991504-991693 placement
function getActionsSchemaParts(e) {
  let actions = e?.properties?.actions;
  if (!isPlainObject_5(actions) || !isPlainObject_5(actions.items)) return;
  let items = actions.items;
  let properties = items.properties;
  if (!isPlainObject_5(properties) || !isPlainObject_5(properties.input)) return;
  return {
    actions,
    items,
    itemProperties: properties,
    input: properties.input,
  };
}
//@ chunk-e6aww6q8.js:991693-991939 placement
function getActionSummaryLength(toolNameForPermissionCheck, inputJSONSchema, r) {
  let s = ACTION_SUMMARY_SCHEMA_BY_TOOL.get(toolNameForPermissionCheck);
  let properties = inputJSONSchema?.properties;
  if (
    s === undefined ||
    typeof properties !== "object" ||
    properties === null ||
    !(ACTION_SUMMARY_SCHEMA in properties)
  )
    return;
  let y = r;
  if (s === v1t && !(typeof y?.action === "string" && COMPUTER_ACTIONS_WITH_SUMMARY.has(y.action))) return;
  let S = y?.[ACTION_SUMMARY_SCHEMA];
  return typeof S === "string" ? S.length : 0;
}
//@ chunk-e6aww6q8.js:991939-992038 placement
function isBrowserActionSummaryAwake() {
  return (
    getFeatureValue_SESSION_PINNED("tengu_auto_mode_config", {})?.chromeAgentNote === true ||
    isSessionPinnedActionSummary("browserSummary")
  );
}
//@ chunk-e6aww6q8.js:992038-992081 placement
var schemaSummaryLogState = identity_2(
  {
    logged: false,
  },
  (e) => {
    e.logged = false;
  },
);
//@ chunk-e6aww6q8.js:992081-992310 placement
/**
 * 在开关开启时给计算机操作类工具的输入 schema 加上操作摘要字段（批量动作工具改写 actions 描述）。
 */
function addActionSummaryToSchema(e, mcpToolName, r = isBrowserActionSummaryAwake) {
  if (BATCH_TOOLS_WITH_SUMMARY.has(mcpToolName)) return addActionSummaryToBatchDescription(e, r);
  let s = ACTION_SUMMARY_SCHEMA_BY_TOOL.get(mcpToolName);
  if (
    s === undefined ||
    typeof e.properties !== "object" ||
    e.properties === null ||
    ACTION_SUMMARY_SCHEMA in e.properties ||
    !r()
  )
    return e;
  logSchemaSummaryOnce();
  return {
    ...e,
    properties: {
      ...e.properties,
      [ACTION_SUMMARY_SCHEMA]: s,
    },
  };
}
//@ chunk-e6aww6q8.js:992310-992381 placement
function logSchemaSummaryOnce() {
  if (!schemaSummaryLogState.logged) {
    schemaSummaryLogState.logged = true;
    logFeatureOk("chrome_action_summary");
  }
}
//@ chunk-e6aww6q8.js:992381-992725 placement
/**
 * 在批量动作工具的 actions.items.input 描述中追加操作摘要要求（已有时不重复）。
 */
function addActionSummaryToBatchDescription(e, n) {
  let actionsSchemaParts = getActionsSchemaParts(e);
  if (actionsSchemaParts === undefined) return e;
  let { actions, items, itemProperties, input } = actionsSchemaParts;
  let description = input.description;
  if (
    (description !== undefined && typeof description !== "string") ||
    description?.includes(ACTION_SUMMARY_SCHEMA) ||
    !n()
  )
    return e;
  logSchemaSummaryOnce();
  return {
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
              description:
                description === undefined || description === ""
                  ? BATCH_ITEM_SUMMARY_INSTRUCTION
                  : `${description} ${BATCH_ITEM_SUMMARY_INSTRUCTION}`,
            },
          },
        },
      },
    },
  };
}
//@ chunk-e6aww6q8.js:992725-993171 placement
/**
 * 统计批量动作调用中需要摘要的动作（form_input 与特定 computer 动作）数和实际填写了摘要的数量。
 */
function countBatchActionSummaries(toolNameForPermissionCheck, inputJSONSchema, r) {
  if (!BATCH_TOOLS_WITH_SUMMARY.has(toolNameForPermissionCheck)) return;
  let description = getActionsSchemaParts(inputJSONSchema)?.input.description;
  if (typeof description !== "string" || !description.includes(BATCH_ITEM_SUMMARY_INSTRUCTION)) return;
  let h = 0;
  let y = 0;
  let actions = isPlainObject_5(r) && Array.isArray(r.actions) ? r.actions : [];
  for (let action of actions) {
    if (!isPlainObject_5(action) || !isPlainObject_5(action.input)) continue;
    if (!(
      action.name === "form_input" ||
      (action.name === "computer" &&
        typeof action.input.action === "string" &&
        COMPUTER_ACTIONS_WITH_SUMMARY.has(action.input.action))
    ))
      continue;
    h++;
    let G = action.input[ACTION_SUMMARY_SCHEMA];
    if (typeof G === "string" && G.trim() !== "") y++;
  }
  return {
    expectedItems: h,
    filledItems: y,
  };
}
//@ chunk-e6aww6q8.js:993171-993330 placement
/**
 * 项目功能开启时，按根工具集判断项目角色（thread/overview/other）用于遥测；出错时返回空对象。
 */
function getProjectsRoleTelemetry(e) {
  try {
    if (!hasRelaySourceForClients()) return {};
    let { tools } = e.rootToolSurface;
    return {
      projectsRole: fromEnum(
        hasUpdateStatusToolOnly(tools) ? "thread" : hasStartThreadToolOnly(tools) ? "overview" : "other",
      ),
    };
  } catch (error) {
    logError(error);
  }
  return {};
}
//@ chunk-e6aww6q8.js:994061-994922 placement
/**
 * COMPUTER_BATCH_EXEMPT_ACTIONS：computer_batch 不需要摘要的动作；APP_BATCH_EXEMPT_ACTIONS：app_batch 不需要摘要的动作；COMPUTER_USE_ACTION_NAMES：计算机使用类工具的动作名全集（同一声明共 7 个绑定）。
 */
var ACTION_SUMMARY_FIELD =
  "A few words saying what this action does and to what, for example 'Sends the drafted reply to pat@example.com' or 'Opens the Filters menu'.";
var yPo = Object.freeze({
  type: "string",
  description: `${ACTION_SUMMARY_FIELD} Set it on every call. ${ACTION_SUMMARY_STYLE_RULE}`,
});
var COMPUTER_BATCH_EXEMPT_ACTIONS = ["mouse_move", "scroll", "screenshot", "zoom", "cursor_position", "wait"];
var APP_BATCH_EXEMPT_ACTIONS = ["scroll", "screenshot", "zoom"];
var _Po = Object.freeze({
  type: "string",
  description: `${ACTION_SUMMARY_FIELD} Set it on every action except ${joinWithAnd(COMPUTER_BATCH_EXEMPT_ACTIONS)}. ${ACTION_SUMMARY_STYLE_RULE}`,
});
var SPo = Object.freeze({
  type: "string",
  description: `${ACTION_SUMMARY_FIELD} Set it on every action except ${joinWithAnd(APP_BATCH_EXEMPT_ACTIONS)}. ${ACTION_SUMMARY_STYLE_RULE}`,
});
var COMPUTER_USE_ACTION_NAMES = [
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
];
var BATCH_SUMMARY_SCHEMA_BY_TOOL = {
  computer_batch: _Po,
  app_batch: SPo,
};
var BATCH_EXEMPT_ACTIONS_BY_TOOL = {
  computer_batch: COMPUTER_BATCH_EXEMPT_ACTIONS,
  app_batch: APP_BATCH_EXEMPT_ACTIONS,
};
var COMPUTER_USE_TOOL_PREFIX = getMcpPrefix_2(COMPUTER_USE_MCP_SERVER_NAME);
var REMOTE_DEVICE_TOOL_PREFIX = getMcpPrefix_2(REMOTE_DEVICES);
//@ chunk-e6aww6q8.js:994922-995014 placement
function computerUseToolNames(e) {
  return [
    COMPUTER_USE_TOOL_PREFIX + e,
    `${REMOTE_DEVICE_TOOL_PREFIX}computer_${e}`,
    ...(e.startsWith("computer_") ? [REMOTE_DEVICE_TOOL_PREFIX + e] : []),
  ];
}
//@ chunk-e6aww6q8.js:995014-995196 placement
var ACTION_SUMMARY_TOOLS = new Set(COMPUTER_USE_ACTION_NAMES.flatMap(computerUseToolNames));
var ACTION_SUMMARY_ITEM_TOOLS = new Map(
  Object.entries(BATCH_SUMMARY_SCHEMA_BY_TOOL).flatMap(([key, value]) =>
    computerUseToolNames(key).map((r) => [r, value]),
  ),
);
var ACTION_SUMMARY_EXEMPT_ACTIONS = new Map(
  Object.entries(BATCH_EXEMPT_ACTIONS_BY_TOOL).flatMap(([key, value]) =>
    computerUseToolNames(key).map((r) => [r, value]),
  ),
);
//@ chunk-e6aww6q8.js:995196-995304 placement
function isComputerUseSummaryEnabled() {
  return (
    getFeatureValue_SESSION_PINNED("tengu_auto_mode_config", {})?.computerUseAgentNote === true ||
    isSessionPinnedActionSummary("computerUseSummary")
  );
}
//@ chunk-e6aww6q8.js:995304-995347 placement
var computerUseSummaryLogState = identity_2(
  {
    logged: false,
  },
  (e) => {
    e.logged = false;
  },
);
//@ chunk-e6aww6q8.js:995347-995555 placement
/**
 * 计算机使用类工具开关开启时给 schema（或 actions.items）加操作摘要字段，首次生效记 computeruse_action_summary。
 */
function addComputerUseActionSummary(e, mcpToolName, r = isComputerUseSummaryEnabled) {
  let s = ACTION_SUMMARY_ITEM_TOOLS.get(mcpToolName);
  if (s === undefined && !ACTION_SUMMARY_TOOLS.has(mcpToolName)) return e;
  let h = s === undefined ? addSummaryProperty(e, yPo) : addSummaryToActionItems(e, s);
  if (h === e || !r()) return e;
  if (!computerUseSummaryLogState.logged) {
    computerUseSummaryLogState.logged = true;
    logFeatureOk("computeruse_action_summary");
  }
  return h;
}
//@ chunk-e6aww6q8.js:995555-996091 placement
/**
 * 统计工具调用的操作摘要填写情况：单动作工具返回摘要长度；批量工具返回需摘要动作数与已填数。
 */
function measureActionSummaries(toolNameForPermissionCheck, inputJSONSchema, r) {
  let properties = inputJSONSchema?.properties;
  if (!isNonNullRecord(properties)) return;
  let input = isNonNullRecord(r) ? r : {};
  if (ACTION_SUMMARY_TOOLS.has(toolNameForPermissionCheck)) {
    if (!(ACTION_SUMMARY_SCHEMA in properties)) return;
    let G = input[ACTION_SUMMARY_SCHEMA];
    return {
      length: typeof G === "string" ? G.length : 0,
    };
  }
  let exemptActions = ACTION_SUMMARY_EXEMPT_ACTIONS.get(toolNameForPermissionCheck);
  if (exemptActions === undefined) return;
  let actions = properties.actions;
  if (
    !isNonNullRecord(actions) ||
    !isNonNullRecord(actions.items) ||
    !isNonNullRecord(actions.items.properties) ||
    !(ACTION_SUMMARY_SCHEMA in actions.items.properties)
  )
    return;
  let expectedItems = 0;
  let filledItems = 0;
  for (let G of Array.isArray(input.actions) ? input.actions : []) {
    if (!isNonNullRecord(G) || typeof G.action !== "string" || exemptActions.includes(G.action)) continue;
    expectedItems++;
    let q = G[ACTION_SUMMARY_SCHEMA];
    if (typeof q === "string" && q.trim() !== "") filledItems++;
  }
  return {
    expectedItems,
    filledItems,
  };
}
//@ chunk-e6aww6q8.js:996091-996191 placement
function joinWithAnd(e) {
  if (e.length < 2) return e.join("");
  return `${e.slice(0, -1).join(", ")} and ${e.at(-1)}`;
}
//@ chunk-e6aww6q8.js:996191-996262 placement
function isNonNullRecord(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-e6aww6q8.js:996262-996379 placement
function addSummaryProperty(e, n) {
  if (!isNonNullRecord(e.properties) || ACTION_SUMMARY_SCHEMA in e.properties) return e;
  return {
    ...e,
    properties: {
      ...e.properties,
      [ACTION_SUMMARY_SCHEMA]: n,
    },
  };
}
//@ chunk-e6aww6q8.js:996379-996568 placement
function addSummaryToActionItems(e, n) {
  let actions = e.properties?.actions;
  if (!isNonNullRecord(actions) || !isNonNullRecord(actions.items)) return e;
  let s = addSummaryProperty(actions.items, n);
  if (s === actions.items) return e;
  return {
    ...e,
    properties: {
      ...e.properties,
      actions: {
        ...actions,
        items: s,
      },
    },
  };
}
export {
  isActionSummaryEnabled,
  getProjectsRoleTelemetry,
  measureActionSummaries,
  countBatchActionSummaries,
  getActionSummaryLength,
  addComputerUseActionSummary,
  addActionSummaryToSchema,
};

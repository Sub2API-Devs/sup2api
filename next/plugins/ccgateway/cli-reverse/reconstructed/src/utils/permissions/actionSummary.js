/**
 * utils/permissions/actionSummary.ts
 *
 * 2.1.316 新增：计算机操作摘要 schema
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (25)
 * attribution: placement 25
 */
import { isPlainObject as isPlainObject_6 } from "../isPlainObject.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
} from "../../services/analytics/growthbook.js";
import { isCcsTenant } from "../../bootstrap/state.js";
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
import { getMcpPrefix as getMcpPrefix_4 } from "../../services/mcp/mcpStringUtils.js";
import { COMPUTER_USE_MCP_SERVER_NAME } from "../computerUse/common.js";
import { REMOTE_DEVICES } from "../../services/mcp/firstPartyServerIds.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1003953-1004027 placement
var TENGU_DRIFTING_REEF = "tengu_drifting_reef";
var BROWSER_ACTION_TOOLS = {
  browserClicks: true,
  computerUseChecks: true,
};
//@ chunk-5xgkngpb.js:1004027-1004068 placement
function flagInFeatureConfig(config, flag) {
  return isPlainObject_6(config) && config[flag] === true;
}
//@ chunk-5xgkngpb.js:1004068-1004119 placement
/**
 * isActionSummaryEnabled：动作摘要总开关。
 */
function isActionSummaryEnabled(flag) {
  return flagInFeatureConfig(
    getFeatureValue_CACHED_MAY_BE_STALE(TENGU_DRIFTING_REEF, isCcsTenant() ? BROWSER_ACTION_TOOLS : null),
    flag,
  );
}
//@ chunk-5xgkngpb.js:1004119-1004162 placement
function isSessionPinnedActionSummary(flag) {
  return flagInFeatureConfig(getFeatureValue_SESSION_PINNED(TENGU_DRIFTING_REEF, null), flag);
}
//@ chunk-5xgkngpb.js:1004162-1005269 placement
/**
 * 计算机操作的 action_summary 字段说明与适用的操作。
 */
var ACTION_SUMMARY_FIELD; // deferred: uses MCP_CLAUDE_DEVICE_CHROME (../claudeInChrome/chromeToolNames.js) of its import cycle while loading; runs once the cycle is complete
var ACTION_SUMMARY_STYLE_RULE;
var COMPUTER_ACTIONS_WITH_SUMMARY;
var computerActionSummarySchema;
var formInputSummarySchema;
var BATCH_ITEM_SUMMARY_INSTRUCTION;
var ACTION_SUMMARY_SCHEMA_BY_TOOL;
var BATCH_TOOLS_WITH_SUMMARY;
deferInit("chunk-5xgkngpb.js:1004162", () => {
  ACTION_SUMMARY_FIELD = "action_summary";
  ACTION_SUMMARY_STYLE_RULE =
    "State the effect only, and accurately: no reasons, nothing about what you were asked or allowed to do, no passwords or other secrets.";
  COMPUTER_ACTIONS_WITH_SUMMARY = new Set([
    "left_click",
    "right_click",
    "double_click",
    "triple_click",
    "left_click_drag",
    "key",
    "type",
  ]);
  computerActionSummarySchema = Object.freeze({
    type: "string",
    description: `A few words saying what this action does on the page and to what, for example 'Sends the drafted reply to pat@example.com' or 'Opens the Filters menu'. Set it on every left_click, right_click, double_click, triple_click, left_click_drag, key and type action. ${ACTION_SUMMARY_STYLE_RULE}`,
  });
  formInputSummarySchema = Object.freeze({
    type: "string",
    description: `A few words saying what this form fill does on the page and to what, for example 'Sets the delivery date to 29 September'. ${ACTION_SUMMARY_STYLE_RULE}`,
  });
  BATCH_ITEM_SUMMARY_INSTRUCTION = `For computer items whose action is left_click, right_click, double_click, triple_click, left_click_drag, key or type, and for form_input items, include ${ACTION_SUMMARY_FIELD} in the item's input, as you would when calling that tool directly.`;
  ACTION_SUMMARY_SCHEMA_BY_TOOL = new Map(
    CHROME_TOOL_PREFIXES.flatMap((prefix) => [
      [prefix + "computer", computerActionSummarySchema],
      [prefix + "form_input", formInputSummarySchema],
    ]),
  );
  BATCH_TOOLS_WITH_SUMMARY = new Set(CHROME_TOOL_PREFIXES.map((prefix) => prefix + "browser_batch"));
});
//@ chunk-5xgkngpb.js:1005269-1005458 placement
function getActionsSchemaParts(schema) {
  let actions = schema?.properties?.actions;
  if (!isPlainObject_6(actions) || !isPlainObject_6(actions.items)) return;
  let items = actions.items;
  let properties = items.properties;
  if (!isPlainObject_6(properties) || !isPlainObject_6(properties.input)) return;
  return {
    actions,
    items,
    itemProperties: properties,
    input: properties.input,
  };
}
//@ chunk-5xgkngpb.js:1005458-1005704 placement
function getActionSummaryLength(toolName, inputJSONSchema, input) {
  let summarySchema = ACTION_SUMMARY_SCHEMA_BY_TOOL.get(toolName);
  let properties = inputJSONSchema?.properties;
  if (
    summarySchema === undefined ||
    typeof properties !== "object" ||
    properties === null ||
    !(ACTION_SUMMARY_FIELD in properties)
  )
    return;
  let toolInput = input;
  if (
    summarySchema === computerActionSummarySchema &&
    !(typeof toolInput?.action === "string" && COMPUTER_ACTIONS_WITH_SUMMARY.has(toolInput.action))
  )
    return;
  let summary = toolInput?.[ACTION_SUMMARY_FIELD];
  return typeof summary === "string" ? summary.length : 0;
}
//@ chunk-5xgkngpb.js:1005704-1005803 placement
function isBrowserActionSummaryAwake() {
  return (
    getFeatureValue_SESSION_PINNED("tengu_auto_mode_config", {})?.chromeAgentNote === true ||
    isSessionPinnedActionSummary("browserSummary")
  );
}
//@ chunk-5xgkngpb.js:1005803-1005846 placement
var schemaSummaryLogState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1005803", () => {
  schemaSummaryLogState = identity_2(
    {
      logged: false,
    },
    (state) => {
      state.logged = false;
    },
  );
});
//@ chunk-5xgkngpb.js:1005846-1006075 placement
/**
 * 在开关开启时给计算机操作类工具的输入 schema 加上操作摘要字段（批量动作工具改写 actions 描述）。
 */
function addActionSummaryToSchema(schema, mcpToolName, isEnabled = isBrowserActionSummaryAwake) {
  if (BATCH_TOOLS_WITH_SUMMARY.has(mcpToolName)) return addActionSummaryToBatchDescription(schema, isEnabled);
  let summarySchema = ACTION_SUMMARY_SCHEMA_BY_TOOL.get(mcpToolName);
  if (
    summarySchema === undefined ||
    typeof schema.properties !== "object" ||
    schema.properties === null ||
    ACTION_SUMMARY_FIELD in schema.properties ||
    !isEnabled()
  )
    return schema;
  logSchemaSummaryOnce();
  return {
    ...schema,
    properties: {
      ...schema.properties,
      [ACTION_SUMMARY_FIELD]: summarySchema,
    },
  };
}
//@ chunk-5xgkngpb.js:1006075-1006146 placement
function logSchemaSummaryOnce() {
  if (!schemaSummaryLogState.logged) {
    schemaSummaryLogState.logged = true;
    logFeatureOk("chrome_action_summary");
  }
}
//@ chunk-5xgkngpb.js:1006146-1006490 placement
/**
 * 在批量动作工具的 actions.items.input 描述中追加操作摘要要求（已有时不重复）。
 */
function addActionSummaryToBatchDescription(schema, isEnabled) {
  let actionsSchemaParts = getActionsSchemaParts(schema);
  if (actionsSchemaParts === undefined) return schema;
  let { actions, items, itemProperties, input } = actionsSchemaParts;
  let description = input.description;
  if (
    (description !== undefined && typeof description !== "string") ||
    description?.includes(ACTION_SUMMARY_FIELD) ||
    !isEnabled()
  )
    return schema;
  logSchemaSummaryOnce();
  return {
    ...schema,
    properties: {
      ...schema.properties,
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
//@ chunk-5xgkngpb.js:1006490-1006936 placement
/**
 * 统计批量动作调用中需要摘要的动作（form_input 与特定 computer 动作）数和实际填写了摘要的数量。
 */
function countBatchActionSummaries(toolName, schema, input) {
  if (!BATCH_TOOLS_WITH_SUMMARY.has(toolName)) return;
  let description = getActionsSchemaParts(schema)?.input.description;
  if (typeof description !== "string" || !description.includes(BATCH_ITEM_SUMMARY_INSTRUCTION)) return;
  let expectedItems = 0;
  let filledItems = 0;
  let actions = isPlainObject_6(input) && Array.isArray(input.actions) ? input.actions : [];
  for (let action of actions) {
    if (!isPlainObject_6(action) || !isPlainObject_6(action.input)) continue;
    if (!(
      action.name === "form_input" ||
      (action.name === "computer" &&
        typeof action.input.action === "string" &&
        COMPUTER_ACTIONS_WITH_SUMMARY.has(action.input.action))
    ))
      continue;
    expectedItems++;
    let summary = action.input[ACTION_SUMMARY_FIELD];
    if (typeof summary === "string" && summary.trim() !== "") filledItems++;
  }
  return {
    expectedItems,
    filledItems,
  };
}
//@ chunk-5xgkngpb.js:1006936-1007095 placement
/**
 * 项目功能开启时，按根工具集判断项目角色（thread/overview/other）用于遥测；出错时返回空对象。
 */
function getProjectsRoleTelemetry(context) {
  try {
    if (!hasRelaySourceForClients()) return {};
    let { tools } = context.rootToolSurface;
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
//@ chunk-5xgkngpb.js:1007827-1008688 placement
/**
 * COMPUTER_BATCH_EXEMPT_ACTIONS：computer_batch 不需要摘要的动作；APP_BATCH_EXEMPT_ACTIONS：app_batch 不需要摘要的动作；COMPUTER_USE_ACTION_NAMES：计算机使用类工具的动作名全集（同一声明共 7 个绑定）。
 */
var ACTION_SUMMARY_FIELD_2; // deferred: uses ACTION_SUMMARY_FIELD of its import cycle while loading; runs once the cycle is complete
var genericActionSummarySchema;
var COMPUTER_BATCH_EXEMPT_ACTIONS;
var APP_BATCH_EXEMPT_ACTIONS;
var COMPUTER_BATCH_SUMMARY_SCHEMA;
var APP_BATCH_SUMMARY_SCHEMA;
var COMPUTER_USE_ACTION_NAMES;
var BATCH_SUMMARY_SCHEMA_BY_TOOL;
var BATCH_EXEMPT_ACTIONS_BY_TOOL;
var COMPUTER_USE_TOOL_PREFIX;
var REMOTE_DEVICE_TOOL_PREFIX;
deferInit("chunk-5xgkngpb.js:1007827", () => {
  ACTION_SUMMARY_FIELD_2 =
    "A few words saying what this action does and to what, for example 'Sends the drafted reply to pat@example.com' or 'Opens the Filters menu'.";
  genericActionSummarySchema = Object.freeze({
    type: "string",
    description: `${ACTION_SUMMARY_FIELD_2} Set it on every call. ${ACTION_SUMMARY_STYLE_RULE}`,
  });
  COMPUTER_BATCH_EXEMPT_ACTIONS = ["mouse_move", "scroll", "screenshot", "zoom", "cursor_position", "wait"];
  APP_BATCH_EXEMPT_ACTIONS = ["scroll", "screenshot", "zoom"];
  COMPUTER_BATCH_SUMMARY_SCHEMA = Object.freeze({
    type: "string",
    description: `${ACTION_SUMMARY_FIELD_2} Set it on every action except ${joinWithAnd(COMPUTER_BATCH_EXEMPT_ACTIONS)}. ${ACTION_SUMMARY_STYLE_RULE}`,
  });
  APP_BATCH_SUMMARY_SCHEMA = Object.freeze({
    type: "string",
    description: `${ACTION_SUMMARY_FIELD_2} Set it on every action except ${joinWithAnd(APP_BATCH_EXEMPT_ACTIONS)}. ${ACTION_SUMMARY_STYLE_RULE}`,
  });
  COMPUTER_USE_ACTION_NAMES = [
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
  BATCH_SUMMARY_SCHEMA_BY_TOOL = {
    computer_batch: COMPUTER_BATCH_SUMMARY_SCHEMA,
    app_batch: APP_BATCH_SUMMARY_SCHEMA,
  };
  BATCH_EXEMPT_ACTIONS_BY_TOOL = {
    computer_batch: COMPUTER_BATCH_EXEMPT_ACTIONS,
    app_batch: APP_BATCH_EXEMPT_ACTIONS,
  };
  COMPUTER_USE_TOOL_PREFIX = getMcpPrefix_4(COMPUTER_USE_MCP_SERVER_NAME);
  REMOTE_DEVICE_TOOL_PREFIX = getMcpPrefix_4(REMOTE_DEVICES);
});
//@ chunk-5xgkngpb.js:1008688-1008780 placement
function computerUseToolNames(actionName) {
  return [
    COMPUTER_USE_TOOL_PREFIX + actionName,
    `${REMOTE_DEVICE_TOOL_PREFIX}computer_${actionName}`,
    ...(actionName.startsWith("computer_") ? [REMOTE_DEVICE_TOOL_PREFIX + actionName] : []),
  ];
}
//@ chunk-5xgkngpb.js:1008780-1008962 placement
var ACTION_SUMMARY_TOOLS; // deferred: uses ACTION_SUMMARY_FIELD_2 of its import cycle while loading; runs once the cycle is complete
var ACTION_SUMMARY_ITEM_TOOLS;
var ACTION_SUMMARY_EXEMPT_ACTIONS;
deferInit("chunk-5xgkngpb.js:1008780", () => {
  ACTION_SUMMARY_TOOLS = new Set(COMPUTER_USE_ACTION_NAMES.flatMap(computerUseToolNames));
  ACTION_SUMMARY_ITEM_TOOLS = new Map(
    Object.entries(BATCH_SUMMARY_SCHEMA_BY_TOOL).flatMap(([key, value]) =>
      computerUseToolNames(key).map((toolName) => [toolName, value]),
    ),
  );
  ACTION_SUMMARY_EXEMPT_ACTIONS = new Map(
    Object.entries(BATCH_EXEMPT_ACTIONS_BY_TOOL).flatMap(([key, value]) =>
      computerUseToolNames(key).map((toolName) => [toolName, value]),
    ),
  );
});
//@ chunk-5xgkngpb.js:1008962-1009070 placement
function isComputerUseSummaryEnabled() {
  return (
    getFeatureValue_SESSION_PINNED("tengu_auto_mode_config", {})?.computerUseAgentNote === true ||
    isSessionPinnedActionSummary("computerUseSummary")
  );
}
//@ chunk-5xgkngpb.js:1009070-1009113 placement
var computerUseSummaryLogState; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1009070", () => {
  computerUseSummaryLogState = identity_2(
    {
      logged: false,
    },
    (state) => {
      state.logged = false;
    },
  );
});
//@ chunk-5xgkngpb.js:1009113-1009321 placement
/**
 * 计算机使用类工具开关开启时给 schema（或 actions.items）加操作摘要字段，首次生效记 computeruse_action_summary。
 */
function addComputerUseActionSummary(schema, mcpToolName, isEnabled = isComputerUseSummaryEnabled) {
  let itemSchema = ACTION_SUMMARY_ITEM_TOOLS.get(mcpToolName);
  if (itemSchema === undefined && !ACTION_SUMMARY_TOOLS.has(mcpToolName)) return schema;
  let updatedSchema =
    itemSchema === undefined
      ? addSummaryProperty(schema, genericActionSummarySchema)
      : addSummaryToActionItems(schema, itemSchema);
  if (updatedSchema === schema || !isEnabled()) return schema;
  if (!computerUseSummaryLogState.logged) {
    computerUseSummaryLogState.logged = true;
    logFeatureOk("computeruse_action_summary");
  }
  return updatedSchema;
}
//@ chunk-5xgkngpb.js:1009321-1009857 placement
/**
 * 统计工具调用的操作摘要填写情况：单动作工具返回摘要长度；批量工具返回需摘要动作数与已填数。
 */
function measureActionSummaries(toolName, inputJSONSchema, input) {
  let properties = inputJSONSchema?.properties;
  if (!isNonNullRecord(properties)) return;
  let input_2 = isNonNullRecord(input) ? input : {};
  if (ACTION_SUMMARY_TOOLS.has(toolName)) {
    if (!(ACTION_SUMMARY_FIELD in properties)) return;
    let summary = input_2[ACTION_SUMMARY_FIELD];
    return {
      length: typeof summary === "string" ? summary.length : 0,
    };
  }
  let exemptActions = ACTION_SUMMARY_EXEMPT_ACTIONS.get(toolName);
  if (exemptActions === undefined) return;
  let actions = properties.actions;
  if (
    !isNonNullRecord(actions) ||
    !isNonNullRecord(actions.items) ||
    !isNonNullRecord(actions.items.properties) ||
    !(ACTION_SUMMARY_FIELD in actions.items.properties)
  )
    return;
  let expectedItems = 0;
  let filledItems = 0;
  for (let action of Array.isArray(input_2.actions) ? input_2.actions : []) {
    if (
      !isNonNullRecord(action) ||
      typeof action.action !== "string" ||
      exemptActions.includes(action.action)
    )
      continue;
    expectedItems++;
    let summary = action[ACTION_SUMMARY_FIELD];
    if (typeof summary === "string" && summary.trim() !== "") filledItems++;
  }
  return {
    expectedItems,
    filledItems,
  };
}
//@ chunk-5xgkngpb.js:1009857-1009957 placement
function joinWithAnd(parts) {
  if (parts.length < 2) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}`;
}
//@ chunk-5xgkngpb.js:1009957-1010028 placement
function isNonNullRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
//@ chunk-5xgkngpb.js:1010028-1010145 placement
function addSummaryProperty(schema, summarySchema) {
  if (!isNonNullRecord(schema.properties) || ACTION_SUMMARY_FIELD in schema.properties) return schema;
  return {
    ...schema,
    properties: {
      ...schema.properties,
      [ACTION_SUMMARY_FIELD]: summarySchema,
    },
  };
}
//@ chunk-5xgkngpb.js:1010145-1010334 placement
function addSummaryToActionItems(itemSchema, summarySchema) {
  let actions = itemSchema.properties?.actions;
  if (!isNonNullRecord(actions) || !isNonNullRecord(actions.items)) return itemSchema;
  let updatedItems = addSummaryProperty(actions.items, summarySchema);
  if (updatedItems === actions.items) return itemSchema;
  return {
    ...itemSchema,
    properties: {
      ...itemSchema.properties,
      actions: {
        ...actions,
        items: updatedItems,
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

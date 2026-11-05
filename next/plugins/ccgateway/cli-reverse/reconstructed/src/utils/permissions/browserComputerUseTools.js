/**
 * utils/permissions/browserComputerUseTools.ts
 *
 * 2.1.316 新增：浏览器与计算机操作工具清单
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (38)
 * attribution: placement 38
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { READ } from "../../tools/FileReadTool/constants.js";
import { GREP_TOOL_NAME } from "../../tools/GrepTool/prompt.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { LSP_TOOL_NAME } from "../../tools/LSPTool/UI.js";
import { TOOL_SEARCH_TOOL_NAME } from "../../tools/ToolSearchTool/prompt.js";
import { LISTMCPRESOURCESTOOL } from "../../tools/ListMcpResourcesTool/prompt.js";
import { REFRESH_MCP_TOOLS_TOOL_NAME } from "../../tools/RefreshMcpToolsTool/RefreshMcpToolsTool.js";
import { WAITFORMCPSERVERS } from "../../tools/WaitForMcpServersTool/WaitForMcpServersTool.js";
import { REPORTFINDINGS } from "../../tools/ReportFindingsTool/constants.js";
import { TODO_WRITE_TOOL_NAME } from "../../tools/TodoWriteTool/constants.js";
import { TASK_CREATE_TOOL_NAME } from "../../tools/TaskCreateTool/constants.js";
import { TASK_GET_TOOL_NAME } from "../../tools/TaskGetTool/constants.js";
import { TASK_UPDATE_TOOL_NAME } from "../../tools/TaskUpdateTool/constants.js";
import { TASK_LIST_TOOL_NAME } from "../../tools/TaskListTool/constants.js";
import { TASKSTOP } from "../../tools/TaskStopTool/prompt.js";
import { GET_TASK_TOOL_TEXT } from "../../remote/tools/nativeToolErrors.js";
import { CONNECTGITHUB } from "../../components/ConnectGitHub/constants.js";
import { ENTER_PLAN_MODE_TOOL_NAME } from "../../tools/EnterPlanModeTool/constants.js";
import { EXITPLANMODE } from "../../tools/ExitPlanModeTool/constants.js";
import { SHOWONBOARDINGROLEPICKER } from "../../tools/ShowOnboardingRolePickerTool/ShowOnboardingRolePickerTool.js";
import { READMCPRESOURCETOOL } from "../../tools/ReadMcpResourceTool/prompt.js";
import { READ_MCP_RESOURCE_DIR_TOOL_NAME } from "../../tools/ReadMcpResourceDirTool/prompt.js";
import { CHROME_TOOL_PREFIXES, BROWSER_PREVIEW_TOOL_PREFIXES } from "../claudeInChrome/chromeToolNames.js";
import { greedyShoreEnabled } from "./permissionSetup.js";
import { AGENT } from "../../tools/AgentTool/constants.js";
import { CRON_CREATE_TOOL_NAME } from "../../tools/ScheduleCronTool/prompt.js";
import { MEMORY_WRITE } from "../../tools/MemoryTool/memoryToolNames.js";
import { PROJECTS_TOOL_NAME } from "../../tools/ProjectsTool/prompt.js";
import { SENDFILE } from "../../tools/SendFileTool/prompt.js";
import { REMOTETRIGGER } from "../../tools/RemoteTriggerTool/prompt.js";
import { SCHEDULE_WAKEUP_TOOL_NAME } from "../../tools/ScheduleWakeupTool/prompt.js";
import { SENDMESSAGE } from "../../tools/SendMessageTool/constants.js";
import {
  SELF_HOSTED_RUNNER_SPAWN_LOCAL,
  SELF_HOSTED_RUNNER_REQUEUE_SESSION,
} from "../../services/selfHostedRunner/runnerToolNames.js";
import { REPL_TOOL_NAME } from "../../tools/REPLTool/constants.js";
import {
  getMcpPrefix as getMcpPrefix_4,
  getToolNameForPermissionCheck as getToolNameForPermissionCheck_4,
} from "../../services/mcp/mcpStringUtils.js";
import { COMPUTER_USE_MCP_SERVER_NAME } from "../computerUse/common.js";
import { REMOTE_DEVICES } from "../../services/mcp/firstPartyServerIds.js";
import { isAutoClassifierActive } from "./autoModeState.js";
import { READ_ONLY_CU_ACTIONS, REGION_DURATION_ARG_KEYS } from "../computerUse/toolRendering.js";
import { isComputerUseTool } from "./browserToolNames.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1269640-1269680 placement
/**
 * lacksCreateIfEmpty：输入未要求 createIfEmpty（只读工具判定）。
 */
function lacksCreateIfEmpty(store) {
  return !store?.createIfEmpty;
}
//@ chunk-5xgkngpb.js:1269680-1269712 placement
/**
 * lacksClear：输入未要求 clear（只读工具判定）。
 */
function lacksClear(store) {
  return !store?.clear;
}
//@ chunk-5xgkngpb.js:1269712-1269923 placement
var BROWSER_TOOL_INPUT_CHECKS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var BROWSER_HOUSEKEEPING_TOOLS;
deferInit("chunk-5xgkngpb.js:1269712", () => {
  BROWSER_TOOL_INPUT_CHECKS = new Map([
    ["read_console_messages", lacksClear],
    ["read_network_requests", lacksClear],
    ["tabs_context_mcp", lacksCreateIfEmpty],
  ]);
  BROWSER_HOUSEKEEPING_TOOLS = new Set([
    "list_connected_browsers",
    "resize_window",
    "shortcuts_list",
    "switch_browser",
    "tabs_close_mcp",
  ]);
});
//@ chunk-5xgkngpb.js:1269923-1270006 placement
/**
 * isBrowserHousekeepingCall：浏览器内务类工具或输入检查通过即为真。
 */
function isBrowserHousekeepingCall(name, input) {
  if (BROWSER_HOUSEKEEPING_TOOLS.has(name)) return true;
  let check = BROWSER_TOOL_INPUT_CHECKS.get(name);
  if (check) return check(input);
  return false;
}
//@ chunk-5xgkngpb.js:1270006-1270062 placement
var HIDDEN_INPUT_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:1270006", () => {
  HIDDEN_INPUT_KEYS = new Set(["includePermissionState", "checkUrls"]);
});
//@ chunk-5xgkngpb.js:1270062-1270173 placement
function makeWalkFrame(source) {
  return {
    source,
    keys: Array.isArray(source) ? undefined : Object.keys(source),
    next: 0,
    replaced: undefined,
    dropped: false,
  };
}
//@ chunk-5xgkngpb.js:1270173-1270398 placement
function rebuildWalkFrame({ source, keys, replaced, dropped }) {
  if (replaced === undefined && !dropped) return source;
  if (keys === undefined)
    return source.map((item, index) => (replaced?.has(index) ? replaced.get(index) : item));
  return Object.fromEntries(
    keys.flatMap((key, index) =>
      HIDDEN_INPUT_KEYS.has(key) ? [] : [[key, replaced?.has(index) ? replaced.get(index) : source[key]]],
    ),
  );
}
//@ chunk-5xgkngpb.js:1270398-1270913 placement
/**
 * 非递归遍历对象图：删掉保留键（j4t 集合），把循环引用替换为 undefined，只在有改动时复制容器。
 */
function stripCyclesAndHiddenKeys(root) {
  if (typeof root !== "object" || root === null) return root;
  let stack = [makeWalkFrame(root)];
  let onStack = new Set([root]);
  for (;;) {
    let last = stack.at(-1);
    let { source, keys } = last;
    if (last.next < (keys ?? source).length) {
      let key = keys?.[last.next];
      if (key !== undefined && HIDDEN_INPUT_KEYS.has(key)) {
        last.dropped = true;
        last.next++;
        continue;
      }
      let child = source[key ?? last.next];
      if (typeof child !== "object" || child === null) last.next++;
      else if (onStack.has(child)) (last.replaced ??= new Map()).set(last.next++, undefined);
      else {
        onStack.add(child);
        stack.push(makeWalkFrame(child));
      }
      continue;
    }
    stack.pop();
    onStack.delete(source);
    let rebuilt = rebuildWalkFrame(last);
    let last_2 = stack.at(-1);
    if (last_2 === undefined) return rebuilt;
    if (rebuilt !== source) (last_2.replaced ??= new Map()).set(last_2.next, rebuilt);
    last_2.next++;
  }
}
//@ chunk-5xgkngpb.js:1270913-1272071 placement
/**
 * 浏览器与计算机操作工具清单（延迟加载的工具模块）。
 */
var BROWSER_COMPUTER_USE_TOOLS; // deferred: loads other modules while loading; runs once its import cycle is complete
var SEARCH_MCP_REGISTRY_TOOL_NAME;
var SUGGEST_CONNECTORS_TOOL_NAME;
var LIST_CONNECTORS_TOOL_NAME;
var PLUGIN_SKILL_SAFE_TOOL_NAMES;
var OPTIONAL_TOOL_NAME_A;
var OPTIONAL_TOOL_NAME_B;
var OPTIONAL_TOOL_NAME_C;
var OPTIONAL_TOOL_NAME_D;
var BENIGN_TOOL_NAMES;
var MCP_RESOURCE_TOOL_NAMES_2;
var BROWSER_READ_ONLY_SUFFIXES;
var PERMISSION_INSPECTION_TOOL_NAMES;
var COMPUTER_READ_ONLY_ACTIONS;
var BROWSER_TOOL_NAMES_WITH_INPUT;
var BATCH_TOOL_NAMES;
var READ_ONLY_COMPUTER_ACTIONS;
var COMPUTER_NO_SAVE_ACTIONS;
deferInit("chunk-5xgkngpb.js:1270913", () => {
  BROWSER_COMPUTER_USE_TOOLS = null;
  SEARCH_MCP_REGISTRY_TOOL_NAME =
    require("../../tools/SearchMcpRegistryTool/prompt.js").SEARCH_MCP_REGISTRY_TOOL_NAME;
  SUGGEST_CONNECTORS_TOOL_NAME =
    require("../../tools/SuggestConnectorsTool/prompt.js").SUGGEST_CONNECTORS_TOOL_NAME;
  LIST_CONNECTORS_TOOL_NAME = require("../../tools/ListConnectorsTool/prompt.js").LIST_CONNECTORS_TOOL_NAME;
  PLUGIN_SKILL_SAFE_TOOL_NAMES =
    require("../../tools/PluginSearchTool/PluginSearchTool.js").PLUGIN_SKILL_SAFE_TOOL_NAMES;
  OPTIONAL_TOOL_NAME_A = null;
  OPTIONAL_TOOL_NAME_B = null;
  OPTIONAL_TOOL_NAME_C = null;
  OPTIONAL_TOOL_NAME_D = null;
  BENIGN_TOOL_NAMES = new Set([
    READ,
    GREP_TOOL_NAME,
    GLOB_TOOL_NAME,
    LSP_TOOL_NAME,
    TOOL_SEARCH_TOOL_NAME,
    LISTMCPRESOURCESTOOL,
    REFRESH_MCP_TOOLS_TOOL_NAME,
    WAITFORMCPSERVERS,
    REPORTFINDINGS,
    TODO_WRITE_TOOL_NAME,
    TASK_CREATE_TOOL_NAME,
    TASK_GET_TOOL_NAME,
    TASK_UPDATE_TOOL_NAME,
    TASK_LIST_TOOL_NAME,
    TASKSTOP,
    GET_TASK_TOOL_TEXT,
    CONNECTGITHUB,
    ENTER_PLAN_MODE_TOOL_NAME,
    EXITPLANMODE,
    ...(BROWSER_COMPUTER_USE_TOOLS ? [BROWSER_COMPUTER_USE_TOOLS] : []),
    ...(SEARCH_MCP_REGISTRY_TOOL_NAME ? [SEARCH_MCP_REGISTRY_TOOL_NAME] : []),
    ...(SUGGEST_CONNECTORS_TOOL_NAME ? [SUGGEST_CONNECTORS_TOOL_NAME] : []),
    SHOWONBOARDINGROLEPICKER,
    ...(LIST_CONNECTORS_TOOL_NAME ? [LIST_CONNECTORS_TOOL_NAME] : []),
    ...PLUGIN_SKILL_SAFE_TOOL_NAMES,
  ]);
  MCP_RESOURCE_TOOL_NAMES_2 = new Set([READMCPRESOURCETOOL, READ_MCP_RESOURCE_DIR_TOOL_NAME]);
  BROWSER_READ_ONLY_SUFFIXES = [
    "find",
    "get_page_text",
    "list_connected_browsers",
    "read_page",
    "resize_window",
    "shortcuts_list",
    "switch_browser",
    "tabs_close_mcp",
  ];
  PERMISSION_INSPECTION_TOOL_NAMES = new Set([
    ...BROWSER_READ_ONLY_SUFFIXES.flatMap((suffix) => CHROME_TOOL_PREFIXES.map((prefix) => prefix + suffix)),
    ...["tabs_close", "tabs_select"].flatMap((suffix) =>
      BROWSER_PREVIEW_TOOL_PREFIXES.map((prefix) => prefix + suffix),
    ),
  ]);
  COMPUTER_READ_ONLY_ACTIONS = new Map([
    ...[...BROWSER_TOOL_INPUT_CHECKS].flatMap(([toolName, check]) =>
      CHROME_TOOL_PREFIXES.map((prefix) => [prefix + toolName, check]),
    ),
    ...BROWSER_PREVIEW_TOOL_PREFIXES.map((prefix) => [`${prefix}tabs_context`, lacksCreateIfEmpty]),
  ]);
  BROWSER_TOOL_NAMES_WITH_INPUT = new Set(CHROME_TOOL_PREFIXES.map((prefix) => `${prefix}computer`));
  BATCH_TOOL_NAMES = new Set(CHROME_TOOL_PREFIXES.map((prefix) => `${prefix}browser_batch`));
  READ_ONLY_COMPUTER_ACTIONS = new Set([
    "left_click",
    "right_click",
    "middle_click",
    "double_click",
    "triple_click",
    "left_click_drag",
  ]);
  COMPUTER_NO_SAVE_ACTIONS = new Set([
    "screenshot",
    "zoom",
    "wait",
    "get_page_text",
    "find",
    "scroll",
    "scroll_to",
    "hover",
    "mouse_move",
    "cursor_position",
    ...READ_ONLY_COMPUTER_ACTIONS,
  ]);
});
//@ chunk-5xgkngpb.js:1272071-1272158 placement
function isComputerActionWithoutSave(input) {
  let toolInput = input;
  if (!COMPUTER_NO_SAVE_ACTIONS.has(String(toolInput?.action))) return false;
  return !toolInput?.save_to_disk;
}
//@ chunk-5xgkngpb.js:1272158-1272217 placement
var BROWSER_READ_ONLY_TOOL_SET; // deferred: uses BROWSER_COMPUTER_USE_TOOLS of its import cycle while loading; runs once the cycle is complete
var COMPUTER_READ_ONLY_INPUT_CHECKS;
deferInit("chunk-5xgkngpb.js:1272158", () => {
  BROWSER_READ_ONLY_TOOL_SET = new Set(BROWSER_READ_ONLY_SUFFIXES);
  COMPUTER_READ_ONLY_INPUT_CHECKS = new Map([
    ["computer", isComputerActionWithoutSave],
    ...BROWSER_TOOL_INPUT_CHECKS,
  ]);
});
//@ chunk-5xgkngpb.js:1272217-1272255 placement
function isReadOnlyComputerCall(input) {
  return matchesToolSet(input, COMPUTER_READ_ONLY_INPUT_CHECKS, BROWSER_READ_ONLY_TOOL_SET);
}
//@ chunk-5xgkngpb.js:1272255-1272416 placement
function matchesToolSet(tool, inputChecks, nameSet) {
  if (typeof tool !== "object" || tool === null) return false;
  let toolName = tool.name;
  if (typeof toolName !== "string") return false;
  let check = inputChecks.get(toolName);
  if (check) return check(tool.input);
  return nameSet.has(toolName);
}
//@ chunk-5xgkngpb.js:1272416-1272740 placement
/**
 * auto 模式下浏览器/计算机操作工具是否可直接放行：排除列表外的只读工具、按工具输入判定的工具、批量动作全部为只读时为真。
 */
function isBrowserToolAutoAllowed(tool, input) {
  if (tool.excludedFromAutoModeAllowlist?.() === true) return false;
  let toolName = tool.name;
  if (MCP_RESOURCE_TOOL_NAMES_2.has(toolName)) return !greedyShoreEnabled();
  if (BENIGN_TOOL_NAMES.has(toolName)) return true;
  if (PERMISSION_INSPECTION_TOOL_NAMES.has(toolName)) return true;
  let check = COMPUTER_READ_ONLY_ACTIONS.get(toolName);
  if (check) return check(input);
  if (BROWSER_TOOL_NAMES_WITH_INPUT.has(toolName)) return isComputerActionWithoutSave(input);
  if (BATCH_TOOL_NAMES.has(toolName)) {
    let actions = input?.actions;
    if (!Array.isArray(actions) || actions.length === 0) return false;
    return actions.every(isReadOnlyComputerCall);
  }
  return false;
}
//@ chunk-5xgkngpb.js:1272740-1272790 placement
function isReadOnlyComputerActionOnly(input) {
  return READ_ONLY_COMPUTER_ACTIONS.has(String(input?.action));
}
//@ chunk-5xgkngpb.js:1272790-1272838 placement
var READ_ONLY_CU_ACTION_CHECKS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var EMPTY_TOOL_NAME_SET;
deferInit("chunk-5xgkngpb.js:1272790", () => {
  READ_ONLY_CU_ACTION_CHECKS = new Map([["computer", isReadOnlyComputerActionOnly]]);
  EMPTY_TOOL_NAME_SET = new Set();
});
//@ chunk-5xgkngpb.js:1272838-1272978 placement
function hasBrowserWriteAction(toolName, input) {
  if (BROWSER_TOOL_NAMES_WITH_INPUT.has(toolName)) return isReadOnlyComputerActionOnly(input);
  if (BATCH_TOOL_NAMES.has(toolName)) {
    let actions = input?.actions;
    return (
      Array.isArray(actions) &&
      actions.some((action) => matchesToolSet(action, READ_ONLY_CU_ACTION_CHECKS, EMPTY_TOOL_NAME_SET))
    );
  }
  return false;
}
//@ chunk-5xgkngpb.js:1272978-1273051 placement
/**
 * shouldClassifyBrowserWrite：开启点击分类器且有浏览器写动作。
 */
function shouldClassifyBrowserWrite(toolPermissionContext, toolName, input) {
  return (
    toolPermissionContext.chromeClickClassifierEnabled === true && hasBrowserWriteAction(toolName, input)
  );
}
//@ chunk-5xgkngpb.js:1273051-1273264 placement
var READ_ONLY_BROWSER_TOOL_SUFFIXES; // deferred: uses MCP_CLAUDE_DEVICE_CHROME (../claudeInChrome/chromeToolNames.js) of its import cycle while loading; runs once the cycle is complete
var READ_ONLY_BROWSER_TOOLS;
var READ_ONLY_COMPUTER_ACTIONS_2;
deferInit("chunk-5xgkngpb.js:1273051", () => {
  READ_ONLY_BROWSER_TOOL_SUFFIXES = [
    "find",
    "get_page_text",
    "list_connected_browsers",
    "read_page",
    "shortcuts_list",
  ];
  READ_ONLY_BROWSER_TOOLS = new Set(
    READ_ONLY_BROWSER_TOOL_SUFFIXES.flatMap((suffix) =>
      CHROME_TOOL_PREFIXES.map((prefix) => prefix + suffix),
    ),
  );
  READ_ONLY_COMPUTER_ACTIONS_2 = new Set(["screenshot", "wait", "get_page_text", "find", "cursor_position"]);
});
//@ chunk-5xgkngpb.js:1273264-1273322 placement
function isReadOnlyComputerAction(input) {
  return READ_ONLY_COMPUTER_ACTIONS_2.has(String(input?.action)) && isComputerActionWithoutSave(input);
}
//@ chunk-5xgkngpb.js:1273322-1273381 placement
var READ_ONLY_BROWSER_SUFFIX_SET; // deferred: uses READ_ONLY_BROWSER_TOOL_SUFFIXES of its import cycle while loading; runs once the cycle is complete
var READ_ONLY_COMPUTER_INPUT_CHECKS;
deferInit("chunk-5xgkngpb.js:1273322", () => {
  READ_ONLY_BROWSER_SUFFIX_SET = new Set(READ_ONLY_BROWSER_TOOL_SUFFIXES);
  READ_ONLY_COMPUTER_INPUT_CHECKS = new Map([
    ["computer", isReadOnlyComputerAction],
    ...BROWSER_TOOL_INPUT_CHECKS,
  ]);
});
//@ chunk-5xgkngpb.js:1273381-1273419 placement
function isReadOnlyBrowserAction(input) {
  return matchesToolSet(input, READ_ONLY_COMPUTER_INPUT_CHECKS, READ_ONLY_BROWSER_SUFFIX_SET);
}
//@ chunk-5xgkngpb.js:1273419-1273626 placement
function isReadOnlyBrowserCall(toolNameForPermissionCheck, input) {
  if (READ_ONLY_BROWSER_TOOLS.has(toolNameForPermissionCheck)) return true;
  let check = COMPUTER_READ_ONLY_ACTIONS.get(toolNameForPermissionCheck);
  if (check) return check(input);
  if (BROWSER_TOOL_NAMES_WITH_INPUT.has(toolNameForPermissionCheck)) return isReadOnlyComputerAction(input);
  if (BATCH_TOOL_NAMES.has(toolNameForPermissionCheck)) {
    let actions = input?.actions;
    if (!Array.isArray(actions) || actions.length === 0) return false;
    return actions.every(isReadOnlyBrowserAction);
  }
  return false;
}
//@ chunk-5xgkngpb.js:1273626-1273744 placement
var AGENT_SPAWNING_TOOLS; // deferred: uses AGENT (../../tools/AgentTool/constants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:1273626", () => {
  AGENT_SPAWNING_TOOLS = new Set([
    AGENT,
    CRON_CREATE_TOOL_NAME,
    MEMORY_WRITE,
    PROJECTS_TOOL_NAME,
    SENDFILE,
    REMOTETRIGGER,
    SCHEDULE_WAKEUP_TOOL_NAME,
    SENDMESSAGE,
    SELF_HOSTED_RUNNER_SPAWN_LOCAL,
    SELF_HOSTED_RUNNER_REQUEUE_SESSION,
    ...(OPTIONAL_TOOL_NAME_A ? [OPTIONAL_TOOL_NAME_A] : []),
    ...(OPTIONAL_TOOL_NAME_D ? [OPTIONAL_TOOL_NAME_D] : []),
    ...(OPTIONAL_TOOL_NAME_B ? [OPTIONAL_TOOL_NAME_B] : []),
    ...(OPTIONAL_TOOL_NAME_C ? [OPTIONAL_TOOL_NAME_C] : []),
    REPL_TOOL_NAME,
  ]);
});
//@ chunk-5xgkngpb.js:1273744-1273777 placement
/**
 * isAgentSpawningTool：是否为会派生代理的工具。
 */
function isAgentSpawningTool(name) {
  return AGENT_SPAWNING_TOOLS.has(name);
}
//@ chunk-5xgkngpb.js:1273777-1274653 placement
/**
 * BROWSER_ACTION_KINDS_COPY：BROWSER_ACTION_KINDS 的副本（未被使用）。
 */
var BROWSER_ACTION_KINDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var BROWSER_ACTION_KINDS_COPY;
deferInit("chunk-5xgkngpb.js:1273777", () => {
  BROWSER_ACTION_KINDS = new Map(
    [
      [
        "observe",
        [
          "screenshot",
          "zoom",
          "cursor_position",
          "wait",
          "scroll",
          "switch_display",
          "list_granted_applications",
          "list_apps",
          "app_list_windows",
          "app_ax_find",
          "app_screenshot",
          "app_zoom",
          "app_scroll",
          "release_full_control",
          "app_release",
          "release_lock",
          "resolve_access",
          "left_mouse_up",
        ],
      ],
      ["access", ["request_access", "request_full_control", "request_teach_access"]],
      [
        "press",
        [
          "left_click",
          "right_click",
          "middle_click",
          "double_click",
          "triple_click",
          "left_click_drag",
          "app_click",
          "app_drag",
        ],
      ],
      ["mouse_hold", ["left_mouse_down"]],
      ["move", ["mouse_move"]],
      ["keyboard", ["type", "key", "hold_key", "app_type", "app_key"]],
      ["clipboard", ["read_clipboard", "write_clipboard"]],
      ["app", ["open_application", "app_menu", "app_focus", "app_bring_to_current_space"]],
      ["batch", ["computer_batch", "app_batch", "teach_step", "teach_batch"]],
    ].flatMap(([kind, actions]) => actions.map((action) => [action, kind])),
  );
  BROWSER_ACTION_KINDS_COPY = new Map(BROWSER_ACTION_KINDS);
});
//@ chunk-5xgkngpb.js:1274653-1274712 placement
var computerUseToolPrefix; // deferred: uses getMcpPrefix (../../services/mcp/mcpStringUtils.js) of its import cycle while loading; runs once the cycle is complete
var remoteDevicesToolPrefix;
var COMPUTER;
var COMPUTER_2;
deferInit("chunk-5xgkngpb.js:1274653", () => {
  computerUseToolPrefix = getMcpPrefix_4(COMPUTER_USE_MCP_SERVER_NAME);
  remoteDevicesToolPrefix = getMcpPrefix_4(REMOTE_DEVICES);
  COMPUTER = "computer_";
  COMPUTER_2 = "computer__";
});
//@ chunk-5xgkngpb.js:1274712-1274919 placement
function getBrowserActionName(toolName) {
  if (toolName.startsWith(computerUseToolPrefix)) return toolName.slice(computerUseToolPrefix.length);
  if (!toolName.startsWith(remoteDevicesToolPrefix)) return;
  let sliced = toolName.slice(remoteDevicesToolPrefix.length);
  if (!sliced.startsWith(COMPUTER) || sliced.startsWith(COMPUTER_2)) return;
  return BROWSER_ACTION_KINDS.has(sliced) ? sliced : sliced.slice(COMPUTER.length);
}
//@ chunk-5xgkngpb.js:1274919-1274958 placement
/**
 * isClassifiableBrowserCall：能取到浏览器动作名的调用。
 */
function isClassifiableBrowserCall(toolName) {
  return getBrowserActionName(toolName) !== undefined;
}
//@ chunk-5xgkngpb.js:1274958-1275034 placement
function savesObservedContent(input) {
  return Boolean(readObjectField(input, "text")) || Boolean(readObjectField(input, "save_to_disk"));
}
//@ chunk-5xgkngpb.js:1275034-1275114 placement
function readObjectField(object, field) {
  if (typeof object !== "object" || object === null || !(field in object)) return;
  return object[field];
}
//@ chunk-5xgkngpb.js:1275114-1275461 placement
/**
 * 批量计算机操作（含 teach_batch 的各步）是否全部为不落盘的观察类动作。
 */
function isObserveOnlyBatch(browserActionName, input) {
  if (readObjectField(input, "save_to_disk")) return false;
  let prefix = browserActionName === "app_batch" ? "app_" : "";
  let objectField = readObjectField(input, "steps");
  let actionLists =
    browserActionName === "teach_batch"
      ? Array.isArray(objectField)
        ? objectField.map((step) => readObjectField(step, "actions"))
        : []
      : [readObjectField(input, "actions")];
  return (
    actionLists.length > 0 &&
    actionLists.every(
      (actions) =>
        Array.isArray(actions) &&
        actions.length > 0 &&
        actions.every((action) => {
          let objectField = readObjectField(action, "action");
          return (
            typeof objectField === "string" &&
            BROWSER_ACTION_KINDS.get(prefix + objectField) === "observe" &&
            !savesObservedContent(action)
          );
        }),
    )
  );
}
//@ chunk-5xgkngpb.js:1275461-1275646 placement
function classifyBrowserAction(toolName, input) {
  let browserActionName = getBrowserActionName(toolName);
  if (browserActionName === undefined) return;
  let kind = BROWSER_ACTION_KINDS.get(browserActionName) ?? "other";
  if (kind === "observe") return savesObservedContent(input) ? "other" : "observe";
  if (kind === "batch") return isObserveOnlyBatch(browserActionName, input) ? "observe" : "batch";
  return kind;
}
//@ chunk-5xgkngpb.js:1275646-1275690 placement
/**
 * normalizeAutoModeValue：只把 “on” 归一为 “on”。
 */
function normalizeAutoModeValue(featureValue_CACHED_MAY_BE_STALE) {
  return featureValue_CACHED_MAY_BE_STALE === "on" ? "on" : undefined;
}
//@ chunk-5xgkngpb.js:1275690-1275789 placement
function getClassifiableBrowserAction(tool, input, toolPermissionContext) {
  if (!isAutoClassifierActive(toolPermissionContext)) return;
  let kind = classifyBrowserAction(getToolNameForPermissionCheck_4(tool), input);
  return kind === "observe" || kind === "access" ? undefined : kind;
}
//@ chunk-5xgkngpb.js:1275789-1275868 placement
/**
 * shouldRouteBrowserCallToClassifier：分类器开启且动作可判定时才交给分类器。
 */
function shouldRouteBrowserCallToClassifier(
  computerUseChecksSetting,
  toolPermissionContext,
  tool,
  input,
  callContext,
) {
  return (
    computerUseChecksSetting === "on" &&
    toolPermissionContext.servedCall !== true &&
    getClassifiableBrowserAction(tool, input, callContext) !== undefined
  );
}
//@ chunk-5xgkngpb.js:1275868-1276063 placement (2.1.88 match: getToolNameForPermissionCheck, 1)
function getToolNameForPermissionCheck(tool, input) {
  let { mcpInfo } = tool;
  let isReadOnlyAction =
    mcpInfo?.serverName === COMPUTER_USE_MCP_SERVER_NAME &&
    READ_ONLY_CU_ACTIONS.includes(mcpInfo.toolName) &&
    (input == null ||
      (typeof input === "object" &&
        !Array.isArray(input) &&
        Object.keys(input).every((key) => REGION_DURATION_ARG_KEYS.includes(key))));
  return isComputerUseTool(mcpInfo) && !isReadOnlyAction;
}
//@ chunk-5xgkngpb.js:1276063-1276404 placement
/**
 * 可能作用于本会话桌面的工具每次调用都需要审阅：生成不可被 allow 规则、钩子或插件放行的 ask（可由分类器批准）。
 */
function buildDesktopActionReviewAsk(tool, input, decision) {
  if (
    decision?.behavior === "ask" ||
    decision?.behavior === "deny" ||
    !getToolNameForPermissionCheck(tool, input)
  )
    return;
  let reviewMessage = `${tool.name} may act on this session's desktop, so each call is reviewed; allow rules, hooks and plugins cannot approve it.`;
  return {
    behavior: "ask",
    message: reviewMessage,
    suppressAlwaysAllowRule: true,
    decisionReason: {
      type: "safetyCheck",
      reason: reviewMessage,
      classifierApprovable: true,
    },
  };
}
export {
  isReadOnlyBrowserCall,
  normalizeAutoModeValue,
  shouldRouteBrowserCallToClassifier,
  isBrowserToolAutoAllowed,
  shouldClassifyBrowserWrite,
  classifyBrowserAction,
  hasBrowserWriteAction,
  isAgentSpawningTool,
  getToolNameForPermissionCheck,
  buildDesktopActionReviewAsk,
  getClassifiableBrowserAction,
  isBrowserHousekeepingCall,
  stripCyclesAndHiddenKeys,
  isClassifiableBrowserCall,
};

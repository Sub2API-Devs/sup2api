/**
 * utils/permissions/browserComputerUseTools.ts
 *
 * 2.1.316 新增：浏览器与计算机操作工具清单
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (36)
 * attribution: placement 36
 */
import { lacksClear, lacksCreateIfEmpty } from "./autoModeUnavailable.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
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
  getMcpPrefix as getMcpPrefix_2,
  getToolNameForPermissionCheck as getToolNameForPermissionCheck_4,
} from "../../services/mcp/mcpStringUtils.js";
import { COMPUTER_USE_MCP_SERVER_NAME } from "../computerUse/common.js";
import { REMOTE_DEVICES } from "../../services/mcp/firstPartyServerIds.js";
import { isAutoClassifierActive } from "./autoModeState.js";
import { READ_ONLY_CU_ACTIONS, REGION_DURATION_ARG_KEYS } from "../computerUse/toolRendering.js";
import { isComputerUseTool } from "./browserToolNames.js";

//@ chunk-e6aww6q8.js:1279034-1279245 placement
var BROWSER_TOOL_INPUT_CHECKS = new Map([
  ["read_console_messages", lacksClear],
  ["read_network_requests", lacksClear],
  ["tabs_context_mcp", lacksCreateIfEmpty],
]);
var BROWSER_HOUSEKEEPING_TOOLS = new Set([
  "list_connected_browsers",
  "resize_window",
  "shortcuts_list",
  "switch_browser",
  "tabs_close_mcp",
]);
//@ chunk-e6aww6q8.js:1279245-1279328 placement
/**
 * isBrowserHousekeepingCall：浏览器内务类工具或输入检查通过即为真。
 */
function isBrowserHousekeepingCall(name, n) {
  if (BROWSER_HOUSEKEEPING_TOOLS.has(name)) return true;
  let r = BROWSER_TOOL_INPUT_CHECKS.get(name);
  if (r) return r(n);
  return false;
}
//@ chunk-e6aww6q8.js:1279328-1279384 placement
var HIDDEN_INPUT_KEYS = new Set(["includePermissionState", "checkUrls"]);
//@ chunk-e6aww6q8.js:1279384-1279495 placement
function makeWalkFrame(e) {
  return {
    source: e,
    keys: Array.isArray(e) ? undefined : Object.keys(e),
    next: 0,
    replaced: undefined,
    dropped: false,
  };
}
//@ chunk-e6aww6q8.js:1279495-1279720 placement
function rebuildWalkFrame({ source, keys, replaced, dropped }) {
  if (replaced === undefined && !dropped) return source;
  if (keys === undefined) return source.map((h, y) => (replaced?.has(y) ? replaced.get(y) : h));
  return Object.fromEntries(
    keys.flatMap((key, y) =>
      HIDDEN_INPUT_KEYS.has(key) ? [] : [[key, replaced?.has(y) ? replaced.get(y) : source[key]]],
    ),
  );
}
//@ chunk-e6aww6q8.js:1279720-1280235 placement
/**
 * 非递归遍历对象图：删掉保留键（j4t 集合），把循环引用替换为 undefined，只在有改动时复制容器。
 */
function stripCyclesAndHiddenKeys(e) {
  if (typeof e !== "object" || e === null) return e;
  let stack = [makeWalkFrame(e)];
  let onStack = new Set([e]);
  for (;;) {
    let last = stack.at(-1);
    let { source, keys } = last;
    if (last.next < (keys ?? source).length) {
      let L = keys?.[last.next];
      if (L !== undefined && HIDDEN_INPUT_KEYS.has(L)) {
        last.dropped = true;
        last.next++;
        continue;
      }
      let G = source[L ?? last.next];
      if (typeof G !== "object" || G === null) last.next++;
      else if (onStack.has(G)) (last.replaced ??= new Map()).set(last.next++, undefined);
      else {
        onStack.add(G);
        stack.push(makeWalkFrame(G));
      }
      continue;
    }
    stack.pop();
    onStack.delete(source);
    let S = rebuildWalkFrame(last);
    let last_2 = stack.at(-1);
    if (last_2 === undefined) return S;
    if (S !== source) (last_2.replaced ??= new Map()).set(last_2.next, S);
    last_2.next++;
  }
}
//@ chunk-e6aww6q8.js:1280235-1281393 placement
/**
 * 浏览器与计算机操作工具清单（延迟加载的工具模块）。
 */
var BROWSER_COMPUTER_USE_TOOLS = null;
var SEARCH_MCP_REGISTRY_TOOL_NAME = require("./chunk-1rsxrh43.js").SEARCH_MCP_REGISTRY_TOOL_NAME;
var SUGGEST_CONNECTORS_TOOL_NAME = require("./chunk-69v1fc7x.js").SUGGEST_CONNECTORS_TOOL_NAME;
var LIST_CONNECTORS_TOOL_NAME = require("./chunk-gkmh922z.js").LIST_CONNECTORS_TOOL_NAME;
var PLUGIN_SKILL_SAFE_TOOL_NAMES = require("./chunk-zw5xhxkf.js").PLUGIN_SKILL_SAFE_TOOL_NAMES;
var OPTIONAL_TOOL_NAME_A = null;
var OPTIONAL_TOOL_NAME_B = null;
var OPTIONAL_TOOL_NAME_C = null;
var OPTIONAL_TOOL_NAME_D = null;
var BENIGN_TOOL_NAMES = new Set([
  FILE_READ_TOOL_NAME,
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
var MCP_RESOURCE_TOOL_NAMES = new Set([READMCPRESOURCETOOL, READ_MCP_RESOURCE_DIR_TOOL_NAME]);
var BROWSER_READ_ONLY_SUFFIXES = [
  "find",
  "get_page_text",
  "list_connected_browsers",
  "read_page",
  "resize_window",
  "shortcuts_list",
  "switch_browser",
  "tabs_close_mcp",
];
var PERMISSION_INSPECTION_TOOL_NAMES = new Set([
  ...BROWSER_READ_ONLY_SUFFIXES.flatMap((e) => CHROME_TOOL_PREFIXES.map((n) => n + e)),
  ...["tabs_close", "tabs_select"].flatMap((e) => BROWSER_PREVIEW_TOOL_PREFIXES.map((n) => n + e)),
]);
var COMPUTER_READ_ONLY_ACTIONS = new Map([
  ...[...BROWSER_TOOL_INPUT_CHECKS].flatMap(([e, n]) => CHROME_TOOL_PREFIXES.map((r) => [r + e, n])),
  ...BROWSER_PREVIEW_TOOL_PREFIXES.map((e) => [`${e}tabs_context`, lacksCreateIfEmpty]),
]);
var BROWSER_TOOL_NAMES_WITH_INPUT = new Set(CHROME_TOOL_PREFIXES.map((e) => `${e}computer`));
var BATCH_TOOL_NAMES = new Set(CHROME_TOOL_PREFIXES.map((e) => `${e}browser_batch`));
var READ_ONLY_COMPUTER_ACTIONS = new Set([
  "left_click",
  "right_click",
  "middle_click",
  "double_click",
  "triple_click",
  "left_click_drag",
]);
var COMPUTER_NO_SAVE_ACTIONS = new Set([
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
//@ chunk-e6aww6q8.js:1281393-1281480 placement
function isComputerActionWithoutSave(e) {
  let n = e;
  if (!COMPUTER_NO_SAVE_ACTIONS.has(String(n?.action))) return false;
  return !n?.save_to_disk;
}
//@ chunk-e6aww6q8.js:1281480-1281539 placement
var BROWSER_READ_ONLY_TOOL_SET = new Set(BROWSER_READ_ONLY_SUFFIXES);
var COMPUTER_READ_ONLY_INPUT_CHECKS = new Map([
  ["computer", isComputerActionWithoutSave],
  ...BROWSER_TOOL_INPUT_CHECKS,
]);
//@ chunk-e6aww6q8.js:1281539-1281577 placement
function isReadOnlyComputerCall(e) {
  return matchesToolSet(e, COMPUTER_READ_ONLY_INPUT_CHECKS, BROWSER_READ_ONLY_TOOL_SET);
}
//@ chunk-e6aww6q8.js:1281577-1281738 placement
function matchesToolSet(e, n, r) {
  if (typeof e !== "object" || e === null) return false;
  let s = e.name;
  if (typeof s !== "string") return false;
  let h = n.get(s);
  if (h) return h(e.input);
  return r.has(s);
}
//@ chunk-e6aww6q8.js:1281738-1282062 placement
/**
 * auto 模式下浏览器/计算机操作工具是否可直接放行：排除列表外的只读工具、按工具输入判定的工具、批量动作全部为只读时为真。
 */
function isBrowserToolAutoAllowed(tool, n) {
  if (tool.excludedFromAutoModeAllowlist?.() === true) return false;
  let r = tool.name;
  if (MCP_RESOURCE_TOOL_NAMES.has(r)) return !greedyShoreEnabled();
  if (BENIGN_TOOL_NAMES.has(r)) return true;
  if (PERMISSION_INSPECTION_TOOL_NAMES.has(r)) return true;
  let s = COMPUTER_READ_ONLY_ACTIONS.get(r);
  if (s) return s(n);
  if (BROWSER_TOOL_NAMES_WITH_INPUT.has(r)) return isComputerActionWithoutSave(n);
  if (BATCH_TOOL_NAMES.has(r)) {
    let actions = n?.actions;
    if (!Array.isArray(actions) || actions.length === 0) return false;
    return actions.every(isReadOnlyComputerCall);
  }
  return false;
}
//@ chunk-e6aww6q8.js:1282062-1282112 placement
function isReadOnlyComputerActionOnly(e) {
  return READ_ONLY_COMPUTER_ACTIONS.has(String(e?.action));
}
//@ chunk-e6aww6q8.js:1282112-1282160 placement
var READ_ONLY_CU_ACTION_CHECKS = new Map([["computer", isReadOnlyComputerActionOnly]]);
var EMPTY_TOOL_NAME_SET = new Set();
//@ chunk-e6aww6q8.js:1282160-1282300 placement
function hasBrowserWriteAction(e, n) {
  if (BROWSER_TOOL_NAMES_WITH_INPUT.has(e)) return isReadOnlyComputerActionOnly(n);
  if (BATCH_TOOL_NAMES.has(e)) {
    let actions = n?.actions;
    return (
      Array.isArray(actions) &&
      actions.some((action) => matchesToolSet(action, READ_ONLY_CU_ACTION_CHECKS, EMPTY_TOOL_NAME_SET))
    );
  }
  return false;
}
//@ chunk-e6aww6q8.js:1282300-1282373 placement
/**
 * shouldClassifyBrowserWrite：开启点击分类器且有浏览器写动作。
 */
function shouldClassifyBrowserWrite(toolPermissionContext, toolNameForPermissionCheck, r) {
  return (
    toolPermissionContext.chromeClickClassifierEnabled === true &&
    hasBrowserWriteAction(toolNameForPermissionCheck, r)
  );
}
//@ chunk-e6aww6q8.js:1282373-1282586 placement
var READ_ONLY_BROWSER_TOOL_SUFFIXES = [
  "find",
  "get_page_text",
  "list_connected_browsers",
  "read_page",
  "shortcuts_list",
];
var READ_ONLY_BROWSER_TOOLS = new Set(
  READ_ONLY_BROWSER_TOOL_SUFFIXES.flatMap((e) => CHROME_TOOL_PREFIXES.map((n) => n + e)),
);
var READ_ONLY_COMPUTER_ACTIONS_2 = new Set([
  "screenshot",
  "wait",
  "get_page_text",
  "find",
  "cursor_position",
]);
//@ chunk-e6aww6q8.js:1282586-1282644 placement
function isReadOnlyComputerAction(e) {
  return READ_ONLY_COMPUTER_ACTIONS_2.has(String(e?.action)) && isComputerActionWithoutSave(e);
}
//@ chunk-e6aww6q8.js:1282644-1282703 placement
var READ_ONLY_BROWSER_SUFFIX_SET = new Set(READ_ONLY_BROWSER_TOOL_SUFFIXES);
var READ_ONLY_COMPUTER_INPUT_CHECKS = new Map([
  ["computer", isReadOnlyComputerAction],
  ...BROWSER_TOOL_INPUT_CHECKS,
]);
//@ chunk-e6aww6q8.js:1282703-1282741 placement
function isReadOnlyBrowserAction(e) {
  return matchesToolSet(e, READ_ONLY_COMPUTER_INPUT_CHECKS, READ_ONLY_BROWSER_SUFFIX_SET);
}
//@ chunk-e6aww6q8.js:1282741-1282948 placement
function isReadOnlyBrowserCall(toolNameForPermissionCheck, n) {
  if (READ_ONLY_BROWSER_TOOLS.has(toolNameForPermissionCheck)) return true;
  let r = COMPUTER_READ_ONLY_ACTIONS.get(toolNameForPermissionCheck);
  if (r) return r(n);
  if (BROWSER_TOOL_NAMES_WITH_INPUT.has(toolNameForPermissionCheck)) return isReadOnlyComputerAction(n);
  if (BATCH_TOOL_NAMES.has(toolNameForPermissionCheck)) {
    let actions = n?.actions;
    if (!Array.isArray(actions) || actions.length === 0) return false;
    return actions.every(isReadOnlyBrowserAction);
  }
  return false;
}
//@ chunk-e6aww6q8.js:1282948-1283066 placement
var AGENT_SPAWNING_TOOLS = new Set([
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
//@ chunk-e6aww6q8.js:1283066-1283100 placement
/**
 * isAgentSpawningTool：是否为会派生代理的工具。
 */
function isAgentSpawningTool(name) {
  return AGENT_SPAWNING_TOOLS.has(name);
}
//@ chunk-e6aww6q8.js:1283100-1283976 placement
/**
 * BROWSER_ACTION_KINDS_COPY：BROWSER_ACTION_KINDS 的副本（未被使用）。
 */
var BROWSER_ACTION_KINDS = new Map(
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
  ].flatMap(([e, n]) => n.map((r) => [r, e])),
);
var BROWSER_ACTION_KINDS_COPY = new Map(BROWSER_ACTION_KINDS);
//@ chunk-e6aww6q8.js:1283976-1284035 placement
var computerUseToolPrefix = getMcpPrefix_2(COMPUTER_USE_MCP_SERVER_NAME);
var remoteDevicesToolPrefix = getMcpPrefix_2(REMOTE_DEVICES);
var COMPUTER = "computer_";
var COMPUTER_2 = "computer__";
//@ chunk-e6aww6q8.js:1284035-1284242 placement
function getBrowserActionName(e) {
  if (e.startsWith(computerUseToolPrefix)) return e.slice(computerUseToolPrefix.length);
  if (!e.startsWith(remoteDevicesToolPrefix)) return;
  let sliced = e.slice(remoteDevicesToolPrefix.length);
  if (!sliced.startsWith(COMPUTER) || sliced.startsWith(COMPUTER_2)) return;
  return BROWSER_ACTION_KINDS.has(sliced) ? sliced : sliced.slice(COMPUTER.length);
}
//@ chunk-e6aww6q8.js:1284242-1284281 placement
/**
 * isClassifiableBrowserCall：能取到浏览器动作名的调用。
 */
function isClassifiableBrowserCall(e) {
  return getBrowserActionName(e) !== undefined;
}
//@ chunk-e6aww6q8.js:1284281-1284357 placement
function savesObservedContent(e) {
  return Boolean(readObjectField(e, "text")) || Boolean(readObjectField(e, "save_to_disk"));
}
//@ chunk-e6aww6q8.js:1284357-1284437 placement
function readObjectField(e, n) {
  if (typeof e !== "object" || e === null || !(n in e)) return;
  return e[n];
}
//@ chunk-e6aww6q8.js:1284437-1284784 placement
/**
 * 批量计算机操作（含 teach_batch 的各步）是否全部为不落盘的观察类动作。
 */
function isObserveOnlyBatch(browserActionName, n) {
  if (readObjectField(n, "save_to_disk")) return false;
  let r = browserActionName === "app_batch" ? "app_" : "";
  let objectField = readObjectField(n, "steps");
  let h =
    browserActionName === "teach_batch"
      ? Array.isArray(objectField)
        ? objectField.map((y) => readObjectField(y, "actions"))
        : []
      : [readObjectField(n, "actions")];
  return (
    h.length > 0 &&
    h.every(
      (y) =>
        Array.isArray(y) &&
        y.length > 0 &&
        y.every((S) => {
          let objectField = readObjectField(S, "action");
          return (
            typeof objectField === "string" &&
            BROWSER_ACTION_KINDS.get(r + objectField) === "observe" &&
            !savesObservedContent(S)
          );
        }),
    )
  );
}
//@ chunk-e6aww6q8.js:1284784-1284969 placement
function classifyBrowserAction(toolNameForPermissionCheck, n) {
  let browserActionName = getBrowserActionName(toolNameForPermissionCheck);
  if (browserActionName === undefined) return;
  let s = BROWSER_ACTION_KINDS.get(browserActionName) ?? "other";
  if (s === "observe") return savesObservedContent(n) ? "other" : "observe";
  if (s === "batch") return isObserveOnlyBatch(browserActionName, n) ? "observe" : "batch";
  return s;
}
//@ chunk-e6aww6q8.js:1284969-1285013 placement
/**
 * normalizeAutoModeValue：只把 “on” 归一为 “on”。
 */
function normalizeAutoModeValue(featureValue_CACHED_MAY_BE_STALE) {
  return featureValue_CACHED_MAY_BE_STALE === "on" ? "on" : undefined;
}
//@ chunk-e6aww6q8.js:1285013-1285113 placement
function getClassifiableBrowserAction(e, n, r) {
  if (!isAutoClassifierActive(r)) return;
  let s = classifyBrowserAction(getToolNameForPermissionCheck_4(e), n);
  return s === "observe" || s === "access" ? undefined : s;
}
//@ chunk-e6aww6q8.js:1285113-1285193 placement
/**
 * shouldRouteBrowserCallToClassifier：分类器开启且动作可判定时才交给分类器。
 */
function shouldRouteBrowserCallToClassifier(computerUseChecksSetting, toolPermissionContext, tool, s, h) {
  return (
    computerUseChecksSetting === "on" &&
    toolPermissionContext.servedCall !== true &&
    getClassifiableBrowserAction(tool, s, h) !== undefined
  );
}
//@ chunk-e6aww6q8.js:1285193-1285387 placement = getToolNameForPermissionCheck (1)
function getToolNameForPermissionCheck(tool, n) {
  let { mcpInfo } = tool;
  let s =
    mcpInfo?.serverName === COMPUTER_USE_MCP_SERVER_NAME &&
    READ_ONLY_CU_ACTIONS.includes(mcpInfo.toolName) &&
    (n == null ||
      (typeof n === "object" &&
        !Array.isArray(n) &&
        Object.keys(n).every((key) => REGION_DURATION_ARG_KEYS.includes(key))));
  return isComputerUseTool(mcpInfo) && !s;
}
//@ chunk-e6aww6q8.js:1285387-1285727 placement
/**
 * 可能作用于本会话桌面的工具每次调用都需要审阅：生成不可被 allow 规则、钩子或插件放行的 ask（可由分类器批准）。
 */
function buildDesktopActionReviewAsk(e, n, r) {
  if (r?.behavior === "ask" || r?.behavior === "deny" || !getToolNameForPermissionCheck(e, n)) return;
  let s = `${e.name} may act on this session's desktop, so each call is reviewed; allow rules, hooks and plugins cannot approve it.`;
  return {
    behavior: "ask",
    message: s,
    suppressAlwaysAllowRule: true,
    decisionReason: {
      type: "safetyCheck",
      reason: s,
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
  getClassifiableBrowserAction,
  buildDesktopActionReviewAsk,
  isBrowserHousekeepingCall,
  stripCyclesAndHiddenKeys,
  isClassifiableBrowserCall,
};

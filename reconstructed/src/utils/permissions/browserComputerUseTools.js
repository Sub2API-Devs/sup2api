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
import { B4t, Lqe } from "./autoModeUnavailable.js";
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
import { uae, Ddr } from "../claudeInChrome/chromeToolNames.js";
import { SFe } from "./permissionSetup.js";
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
import { READ_ONLY_CU_ACTIONS, Vxi } from "../computerUse/toolRendering.js";
import { isComputerUseTool } from "./browserToolNames.js";

//@ chunk-e6aww6q8.js:1279034-1279245 placement
var BROWSER_TOOL_INPUT_CHECKS = new Map([
    ["read_console_messages", B4t],
    ["read_network_requests", B4t],
    ["tabs_context_mcp", Lqe],
  ]),
  BROWSER_HOUSEKEEPING_TOOLS = new Set([
    "list_connected_browsers",
    "resize_window",
    "shortcuts_list",
    "switch_browser",
    "tabs_close_mcp",
  ]);
//@ chunk-e6aww6q8.js:1279245-1279328 placement
function ise(e, n) {
  if (BROWSER_HOUSEKEEPING_TOOLS.has(e)) return !0;
  let r = BROWSER_TOOL_INPUT_CHECKS.get(e);
  if (r) return r(n);
  return !1;
}
//@ chunk-e6aww6q8.js:1279328-1279384 placement
var j4t = new Set(["includePermissionState", "checkUrls"]);
//@ chunk-e6aww6q8.js:1279384-1279495 placement
function makeWalkFrame(e) {
  return {
    source: e,
    keys: Array.isArray(e) ? void 0 : Object.keys(e),
    next: 0,
    replaced: void 0,
    dropped: !1,
  };
}
//@ chunk-e6aww6q8.js:1279495-1279720 placement
function rebuildWalkFrame({ source: source, keys: keys, replaced: replaced, dropped: dropped }) {
  if (replaced === void 0 && !dropped) return source;
  if (keys === void 0) return source.map((h, y) => (replaced?.has(y) ? replaced.get(y) : h));
  return Object.fromEntries(
    keys.flatMap((h, y) => (j4t.has(h) ? [] : [[h, replaced?.has(y) ? replaced.get(y) : source[h]]])),
  );
}
/**
 * 非递归遍历对象图：删掉保留键（j4t 集合），把循环引用替换为 undefined，只在有改动时复制容器。
 */
//@ chunk-e6aww6q8.js:1279720-1280235 placement
function stripCyclesAndHiddenKeys(e) {
  if (typeof e !== "object" || e === null) return e;
  let stack = [makeWalkFrame(e)],
    onStack = new Set([e]);
  for (;;) {
    let at = stack.at(-1),
      { source: source, keys: keys } = at;
    if (at.next < (keys ?? source).length) {
      let L = keys?.[at.next];
      if (L !== void 0 && j4t.has(L)) {
        ((at.dropped = !0), at.next++);
        continue;
      }
      let G = source[L ?? at.next];
      if (typeof G !== "object" || G === null) at.next++;
      else if (onStack.has(G)) (at.replaced ??= new Map()).set(at.next++, void 0);
      else (onStack.add(G), stack.push(makeWalkFrame(G)));
      continue;
    }
    (stack.pop(), onStack.delete(source));
    let S = rebuildWalkFrame(at),
      at_2 = stack.at(-1);
    if (at_2 === void 0) return S;
    if (S !== source) (at_2.replaced ??= new Map()).set(at_2.next, S);
    at_2.next++;
  }
}
/**
 * 浏览器与计算机操作工具清单（延迟加载的工具模块）。
 */
//@ chunk-e6aww6q8.js:1280235-1281393 placement
var BROWSER_COMPUTER_USE_TOOLS = null,
  SEARCH_MCP_REGISTRY_TOOL_NAME = require("./chunk-1rsxrh43.js").SEARCH_MCP_REGISTRY_TOOL_NAME,
  SUGGEST_CONNECTORS_TOOL_NAME = require("./chunk-69v1fc7x.js").SUGGEST_CONNECTORS_TOOL_NAME,
  LIST_CONNECTORS_TOOL_NAME = require("./chunk-gkmh922z.js").LIST_CONNECTORS_TOOL_NAME,
  PLUGIN_SKILL_SAFE_TOOL_NAMES = require("./chunk-zw5xhxkf.js").PLUGIN_SKILL_SAFE_TOOL_NAMES,
  K4t = null,
  Y4t = null,
  Z4t = null,
  e6t = null,
  BNo = new Set([
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
  ]),
  UNo = new Set([READMCPRESOURCETOOL, READ_MCP_RESOURCE_DIR_TOOL_NAME]),
  t6t = [
    "find",
    "get_page_text",
    "list_connected_browsers",
    "read_page",
    "resize_window",
    "shortcuts_list",
    "switch_browser",
    "tabs_close_mcp",
  ],
  jNo = new Set([
    ...t6t.flatMap((e) => uae.map((n) => n + e)),
    ...["tabs_close", "tabs_select"].flatMap((e) => Ddr.map((n) => n + e)),
  ]),
  n6t = new Map([
    ...[...BROWSER_TOOL_INPUT_CHECKS].flatMap(([e, n]) => uae.map((r) => [r + e, n])),
    ...Ddr.map((e) => [`${e}tabs_context`, Lqe]),
  ]),
  Hqe = new Set(uae.map((e) => `${e}computer`)),
  jqe = new Set(uae.map((e) => `${e}browser_batch`)),
  o6t = new Set([
    "left_click",
    "right_click",
    "middle_click",
    "double_click",
    "triple_click",
    "left_click_drag",
  ]),
  WNo = new Set([
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
    ...o6t,
  ]);
//@ chunk-e6aww6q8.js:1281393-1281480 placement
function Wqe(e) {
  let n = e;
  if (!WNo.has(String(n?.action))) return !1;
  return !n?.save_to_disk;
}
//@ chunk-e6aww6q8.js:1281480-1281539 placement
var GNo = new Set(t6t),
  zNo = new Map([["computer", Wqe], ...BROWSER_TOOL_INPUT_CHECKS]);
//@ chunk-e6aww6q8.js:1281539-1281577 placement
function qNo(e) {
  return matchesToolSet(e, zNo, GNo);
}
//@ chunk-e6aww6q8.js:1281577-1281738 placement
function matchesToolSet(e, n, r) {
  if (typeof e !== "object" || e === null) return !1;
  let s = e.name;
  if (typeof s !== "string") return !1;
  let h = n.get(s);
  if (h) return h(e.input);
  return r.has(s);
}
/**
 * auto 模式下浏览器/计算机操作工具是否可直接放行：排除列表外的只读工具、按工具输入判定的工具、批量动作全部为只读时为真。
 */
//@ chunk-e6aww6q8.js:1281738-1282062 placement
function isBrowserToolAutoAllowed(e, n) {
  if (e.excludedFromAutoModeAllowlist?.() === !0) return !1;
  let r = e.name;
  if (UNo.has(r)) return !SFe();
  if (BNo.has(r)) return !0;
  if (jNo.has(r)) return !0;
  let s = n6t.get(r);
  if (s) return s(n);
  if (Hqe.has(r)) return Wqe(n);
  if (jqe.has(r)) {
    let h = n?.actions;
    if (!Array.isArray(h) || h.length === 0) return !1;
    return h.every(qNo);
  }
  return !1;
}
//@ chunk-e6aww6q8.js:1282062-1282112 placement
function r6t(e) {
  return o6t.has(String(e?.action));
}
//@ chunk-e6aww6q8.js:1282112-1282160 placement
var KNo = new Map([["computer", r6t]]),
  VNo = new Set();
//@ chunk-e6aww6q8.js:1282160-1282300 placement
function hasBrowserWriteAction(e, n) {
  if (Hqe.has(e)) return r6t(n);
  if (jqe.has(e)) {
    let r = n?.actions;
    return Array.isArray(r) && r.some((s) => matchesToolSet(s, KNo, VNo));
  }
  return !1;
}
//@ chunk-e6aww6q8.js:1282300-1282373 placement
function Zqe(e, n, r) {
  return e.chromeClickClassifierEnabled === !0 && hasBrowserWriteAction(n, r);
}
//@ chunk-e6aww6q8.js:1282373-1282586 placement
var READ_ONLY_BROWSER_TOOL_SUFFIXES = [
    "find",
    "get_page_text",
    "list_connected_browsers",
    "read_page",
    "shortcuts_list",
  ],
  READ_ONLY_BROWSER_TOOLS = new Set(READ_ONLY_BROWSER_TOOL_SUFFIXES.flatMap((e) => uae.map((n) => n + e))),
  READ_ONLY_COMPUTER_ACTIONS = new Set(["screenshot", "wait", "get_page_text", "find", "cursor_position"]);
//@ chunk-e6aww6q8.js:1282586-1282644 placement
function i6t(e) {
  return READ_ONLY_COMPUTER_ACTIONS.has(String(e?.action)) && Wqe(e);
}
//@ chunk-e6aww6q8.js:1282644-1282703 placement
var QNo = new Set(READ_ONLY_BROWSER_TOOL_SUFFIXES),
  JNo = new Map([["computer", i6t], ...BROWSER_TOOL_INPUT_CHECKS]);
//@ chunk-e6aww6q8.js:1282703-1282741 placement
function ZNo(e) {
  return matchesToolSet(e, JNo, QNo);
}
//@ chunk-e6aww6q8.js:1282741-1282948 placement
function isReadOnlyBrowserCall(e, n) {
  if (READ_ONLY_BROWSER_TOOLS.has(e)) return !0;
  let r = n6t.get(e);
  if (r) return r(n);
  if (Hqe.has(e)) return i6t(n);
  if (jqe.has(e)) {
    let s = n?.actions;
    if (!Array.isArray(s) || s.length === 0) return !1;
    return s.every(ZNo);
  }
  return !1;
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
  ...(K4t ? [K4t] : []),
  ...(e6t ? [e6t] : []),
  ...(Y4t ? [Y4t] : []),
  ...(Z4t ? [Z4t] : []),
  REPL_TOOL_NAME,
]);
//@ chunk-e6aww6q8.js:1283066-1283100 placement
function Qye(e) {
  return AGENT_SPAWNING_TOOLS.has(e);
}
//@ chunk-e6aww6q8.js:1283100-1283976 placement
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
  ),
  XPa = new Map(BROWSER_ACTION_KINDS);
//@ chunk-e6aww6q8.js:1283976-1284035 placement
var a6t = getMcpPrefix_2(COMPUTER_USE_MCP_SERVER_NAME),
  d6t = getMcpPrefix_2(REMOTE_DEVICES),
  COMPUTER = "computer_",
  COMPUTER_2 = "computer__";
//@ chunk-e6aww6q8.js:1284035-1284242 placement
function getBrowserActionName(e) {
  if (e.startsWith(a6t)) return e.slice(a6t.length);
  if (!e.startsWith(d6t)) return;
  let sliced = e.slice(d6t.length);
  if (!sliced.startsWith(COMPUTER) || sliced.startsWith(COMPUTER_2)) return;
  return BROWSER_ACTION_KINDS.has(sliced) ? sliced : sliced.slice(COMPUTER.length);
}
//@ chunk-e6aww6q8.js:1284242-1284281 placement
function Wjr(e) {
  return getBrowserActionName(e) !== void 0;
}
//@ chunk-e6aww6q8.js:1284281-1284357 placement
function p6t(e) {
  return Boolean(qH(e, "text")) || Boolean(qH(e, "save_to_disk"));
}
//@ chunk-e6aww6q8.js:1284357-1284437 placement
function qH(e, n) {
  if (typeof e !== "object" || e === null || !(n in e)) return;
  return e[n];
}
/**
 * 批量计算机操作（含 teach_batch 的各步）是否全部为不落盘的观察类动作。
 */
//@ chunk-e6aww6q8.js:1284437-1284784 placement
function isObserveOnlyBatch(e, n) {
  if (qH(n, "save_to_disk")) return !1;
  let r = e === "app_batch" ? "app_" : "",
    s = qH(n, "steps"),
    h = e === "teach_batch" ? (Array.isArray(s) ? s.map((y) => qH(y, "actions")) : []) : [qH(n, "actions")];
  return (
    h.length > 0 &&
    h.every(
      (y) =>
        Array.isArray(y) &&
        y.length > 0 &&
        y.every((S) => {
          let w = qH(S, "action");
          return typeof w === "string" && BROWSER_ACTION_KINDS.get(r + w) === "observe" && !p6t(S);
        }),
    )
  );
}
//@ chunk-e6aww6q8.js:1284784-1284969 placement
function classifyBrowserAction(e, n) {
  let r = getBrowserActionName(e);
  if (r === void 0) return;
  let s = BROWSER_ACTION_KINDS.get(r) ?? "other";
  if (s === "observe") return p6t(n) ? "other" : "observe";
  if (s === "batch") return isObserveOnlyBatch(r, n) ? "observe" : "batch";
  return s;
}
//@ chunk-e6aww6q8.js:1284969-1285013 placement
function m6t(e) {
  return e === "on" ? "on" : void 0;
}
//@ chunk-e6aww6q8.js:1285013-1285113 placement
function getClassifiableBrowserAction(e, n, r) {
  if (!isAutoClassifierActive(r)) return;
  let s = classifyBrowserAction(getToolNameForPermissionCheck_4(e), n);
  return s === "observe" || s === "access" ? void 0 : s;
}
//@ chunk-e6aww6q8.js:1285113-1285193 placement
function t2e(e, n, r, s, h) {
  return e === "on" && n.servedCall !== !0 && getClassifiableBrowserAction(r, s, h) !== void 0;
}
//@ chunk-e6aww6q8.js:1285193-1285387 placement = getToolNameForPermissionCheck (1)
function getToolNameForPermissionCheck(e, n) {
  let { mcpInfo: mcpInfo } = e,
    s =
      mcpInfo?.serverName === COMPUTER_USE_MCP_SERVER_NAME &&
      READ_ONLY_CU_ACTIONS.includes(mcpInfo.toolName) &&
      (n == null ||
        (typeof n === "object" && !Array.isArray(n) && Object.keys(n).every((h) => Vxi.includes(h))));
  return isComputerUseTool(mcpInfo) && !s;
}
/**
 * 可能作用于本会话桌面的工具每次调用都需要审阅：生成不可被 allow 规则、钩子或插件放行的 ask（可由分类器批准）。
 */
//@ chunk-e6aww6q8.js:1285387-1285727 placement
function buildDesktopActionReviewAsk(e, n, r) {
  if (r?.behavior === "ask" || r?.behavior === "deny" || !getToolNameForPermissionCheck(e, n)) return;
  let s = `${e.name} may act on this session's desktop, so each call is reviewed; allow rules, hooks and plugins cannot approve it.`;
  return {
    behavior: "ask",
    message: s,
    suppressAlwaysAllowRule: !0,
    decisionReason: { type: "safetyCheck", reason: s, classifierApprovable: !0 },
  };
}

export {
  isReadOnlyBrowserCall,
  m6t,
  t2e,
  isBrowserToolAutoAllowed,
  Zqe,
  classifyBrowserAction,
  hasBrowserWriteAction,
  Qye,
  getToolNameForPermissionCheck,
  getClassifiableBrowserAction,
  buildDesktopActionReviewAsk,
  ise,
  stripCyclesAndHiddenKeys,
  Wjr,
};

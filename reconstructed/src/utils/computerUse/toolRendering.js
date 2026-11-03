/**
 * utils/computerUse/toolRendering.tsx
 *
 * 并入已有模块：是否为托管桌面远程会话；是否为 computer use MCP 服务器。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/computerUse/toolRendering.tsx
 * pieces: chunk-ah34pb7m.js (2), chunk-dcmhvw5a.js (3)
 * attribution: fingerprint 2, placement 3
 */
import { normalizeNameForMCP } from "../../services/mcp/normalization.js";
import { COMPUTER_USE_MCP_SERVER_NAME } from "./common.js";
import { env } from "../env.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { Text } from "../../ink/components/Text.js";

//@ chunk-dcmhvw5a.js:205215-205249 placement
/**
 * 是否为 computer use MCP 服务器。
 */
function isComputerUseServer(e) {
  return normalizeNameForMCP(e) === COMPUTER_USE_MCP_SERVER_NAME;
}
//@ chunk-dcmhvw5a.js:205249-205322 placement
/**
 * 是否为托管桌面远程会话。
 */
function isHostedDesktopSession() {
  return env.CLAUDE_CODE_REMOTE && env.CLAUDE_CODE_HOSTED_DESKTOP;
}
//@ chunk-dcmhvw5a.js:205322-206103 fingerprint = getComputerUseMCPRenderingOverrides (0.588)
/**
 * region/duration 两个参数键（只读截图/缩放时允许的输入）。
 */
var HOSTED_DESKTOP_ONLY_MESSAGE = "This session's desktop takes calls only through its tools.";
var READ_ONLY_CU_ACTIONS = ["screenshot", "zoom", "cursor_position", "wait"];
var REGION_DURATION_ARG_KEYS = ["region", "duration"];
var CU_TOOL_NAMES = [
  "request_access",
  "screenshot",
  "zoom",
  "left_click",
  "double_click",
  "triple_click",
  "right_click",
  "middle_click",
  "type",
  "key",
  "scroll",
  "left_click_drag",
  "mouse_move",
  "open_application",
  "switch_display",
  "list_granted_applications",
  "read_clipboard",
  "write_clipboard",
  "wait",
  "cursor_position",
  "hold_key",
  "left_mouse_down",
  "left_mouse_up",
  "computer_batch",
  "request_teach_access",
  "teach_step",
  "teach_batch",
  "app_ax_find",
  "app_batch",
  "app_bring_to_current_space",
  "app_click",
  "app_drag",
  "app_key",
  "app_list_windows",
  "app_menu",
  "app_release",
  "app_screenshot",
  "app_scroll",
  "app_type",
  "list_apps",
  "release_full_control",
  "request_full_control",
];
//@ chunk-ah34pb7m.js:14137-14444 fingerprint = RESULT_SUMMARY (1)
/**
 * computer-use 工具结果的简短摘要（Captured/Clicked/Typed…）。
 */
var RESULT_SUMMARY = {
  screenshot: "Captured",
  zoom: "Captured",
  request_access: "Access updated",
  left_click: "Clicked",
  right_click: "Clicked",
  middle_click: "Clicked",
  double_click: "Clicked",
  triple_click: "Clicked",
  type: "Typed",
  key: "Pressed",
  hold_key: "Pressed",
  scroll: "Scrolled",
  left_click_drag: "Dragged",
  open_application: "Opened",
};
//@ chunk-ah34pb7m.js:14444-14627 placement = renderToolResultMessage (1)
/**
 * 生成"非 verbose 时显示一行固定摘要"的结果渲染函数（摘要表 RESULT_SUMMARY 按 key 查）。
 */
function renderToolResultMessage_2(m) {
  return (d, c, { verbose }) => {
    if (verbose || typeof d !== "object" || d === null) return null;
    let f = RESULT_SUMMARY[m];
    if (!f) return null;
    return jsxProd_default(MessageResponse, {
      height: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: f,
      }),
    });
  };
}
export {
  isHostedDesktopSession,
  isComputerUseServer,
  READ_ONLY_CU_ACTIONS,
  CU_TOOL_NAMES,
  renderToolResultMessage_2,
  HOSTED_DESKTOP_ONLY_MESSAGE,
  REGION_DURATION_ARG_KEYS,
};

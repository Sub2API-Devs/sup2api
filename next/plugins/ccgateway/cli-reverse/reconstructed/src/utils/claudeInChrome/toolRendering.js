/**
 * utils/claudeInChrome/toolRendering.tsx
 *
 * 并入已有模块：统计可见任务数（排除进程内队友）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/claudeInChrome/toolRendering.tsx
 * pieces: chunk-vnst8cd9.js (2), chunk-wjygkcr4.js (5)
 * attribution: fingerprint 5, placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { countWhere } from "../collections.js";
import { shouldHideTasksFooter } from "../../components/tasks/taskStatusUtils.js";
import { countOf } from "../../components/tasks/remoteTaskStatus.js";
import { supportsHyperlinks } from "../../ink/supports-hyperlinks.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Link } from "../../ink/components/Text.js";
import { renderMcpToolResultMessage } from "../../tools/MCPTool/UI.js";
import { MessageResponse } from "../../components/MessageResponse.js";
import { trackClaudeInChromeTabId } from "./common.js";
import { truncateToWidth } from "../format.js";
import { getClaudeInChromePermissionOverrides } from "./permissionOverrides.js";

//@ chunk-wjygkcr4.js:12594-12654 placement
/**
 * 统计可见任务数（排除进程内队友）。
 */
function countVisibleTasks(tasks, taskList, context) {
  return countWhere(Object.values(tasks), shouldHideTasksFooter) + countOf(taskList, context);
}
//@ chunk-wjygkcr4.js:12997-13034 fingerprint (2.1.88 match: CHROME_EXTENSION_FOCUS_TAB_URL_BASE, 1)
/**
 * 扩展聚焦标签页链接前缀 https://clau.de/chrome/tab/。
 */
var CHROME_EXTENSION_FOCUS_TAB_URL_BASE = "https://clau.de/chrome/tab/";
//@ chunk-wjygkcr4.js:13034-13360 fingerprint (2.1.88 match: renderChromeViewTabLink, 0.801)
/**
 * 终端支持超链接时，在工具行后显示 "[View Tab]" 链接（按输入里的 tabId）。
 */
function renderChromeViewTabLink(input) {
  if (!supportsHyperlinks()) return null;
  if (typeof input !== "object" || input === null || !("tabId" in input)) return null;
  let tabId =
    typeof input.tabId === "number"
      ? input.tabId
      : typeof input.tabId === "string"
        ? parseInt(input.tabId, 10)
        : NaN;
  if (isNaN(tabId)) return null;
  let linkUrl = `${CHROME_EXTENSION_FOCUS_TAB_URL_BASE}${tabId}`;
  return jsxProd_default_2(Text, {
    children: [
      " ",
      jsxProd_default(Link, {
        url: linkUrl,
        children: jsxProd_default(Text, {
          color: "subtle",
          children: "[View Tab]",
        }),
      }),
    ],
  });
}
//@ chunk-wjygkcr4.js:13360-14316 fingerprint (2.1.88 match: renderChromeToolResultMessage, 1)
/**
 * Chrome 工具结果的简短摘要（Navigation completed、Tab created、Page read…），verbose 时显示完整结果。
 */
function renderChromeToolResultMessage(output, toolName, verbose) {
  if (verbose)
    return renderMcpToolResultMessage(output, [], {
      verbose,
    });
  let summary = null;
  switch (toolName) {
    case "navigate":
      summary = "Navigation completed";
      break;
    case "tabs_create_mcp":
      summary = "Tab created";
      break;
    case "tabs_context_mcp":
      summary = "Tabs read";
      break;
    case "form_input":
      summary = "Input completed";
      break;
    case "computer":
      summary = "Action completed";
      break;
    case "resize_window":
      summary = "Window resized";
      break;
    case "find":
      summary = "Search completed";
      break;
    case "gif_creator":
      summary = "GIF action completed";
      break;
    case "read_console_messages":
      summary = "Console messages retrieved";
      break;
    case "read_network_requests":
      summary = "Network requests retrieved";
      break;
    case "shortcuts_list":
      summary = "Shortcuts retrieved";
      break;
    case "shortcuts_execute":
      summary = "Shortcut executed";
      break;
    case "javascript_tool":
      summary = "Script executed";
      break;
    case "read_page":
      summary = "Page read";
      break;
    case "upload_image":
      summary = "Image uploaded";
      break;
    case "get_page_text":
      summary = "Page text retrieved";
      break;
    case "update_plan":
      summary = "Plan updated";
      break;
  }
  if (summary)
    return jsxProd_default(MessageResponse, {
      height: 1,
      children: jsxProd_default(Text, {
        dimColor: true,
        children: summary,
      }),
    });
  return null;
}
//@ chunk-wjygkcr4.js:14316-14420 placement
/**
 * 返回一个渲染函数：结果是对象时按给定格式渲染（verbose 透传），否则返回 null。
 */
function createObjectResultRenderer(toolName) {
  return (output, result, { verbose }) => {
    if (typeof output !== "object" || output === null) return null;
    return renderChromeToolResultMessage(output, toolName, verbose);
  };
}
//@ chunk-vnst8cd9.js:13237-15021 fingerprint (2.1.88 match: renderChromeToolUseMessage, 1)
/**
 * Chrome 工具调用行的副标题：navigate 显示主机名、computer 显示动作与坐标/ref、find 显示 pattern 等；同时记录 tabId。
 */
function renderChromeToolUseMessage(input, toolName, verbose) {
  let tabId = input.tabId;
  if (typeof tabId === "number") trackClaudeInChromeTabId(tabId);
  let secondaryInfo = [];
  switch (toolName) {
    case "navigate":
      if (typeof input.url === "string")
        try {
          let url = new URL(input.url);
          secondaryInfo.push(url.hostname);
        } catch {
          secondaryInfo.push(truncateToWidth(input.url, 30));
        }
      break;
    case "find":
      if (typeof input.query === "string") secondaryInfo.push(`pattern: ${truncateToWidth(input.query, 30)}`);
      break;
    case "computer":
      if (typeof input.action === "string") {
        let action = input.action;
        if (
          action === "left_click" ||
          action === "right_click" ||
          action === "double_click" ||
          action === "middle_click"
        ) {
          if (typeof input.ref === "string") secondaryInfo.push(`${action} on ${input.ref}`);
          else if (Array.isArray(input.coordinate))
            secondaryInfo.push(`${action} at (${input.coordinate.join(", ")})`);
          else secondaryInfo.push(action);
        } else if (action === "type" && typeof input.text === "string")
          secondaryInfo.push(`type "${truncateToWidth(input.text, 15)}"`);
        else if (action === "key" && typeof input.text === "string") secondaryInfo.push(`key ${input.text}`);
        else if (action === "scroll" && typeof input.scroll_direction === "string")
          secondaryInfo.push(`scroll ${input.scroll_direction}`);
        else if (action === "wait" && typeof input.duration === "number")
          secondaryInfo.push(`wait ${input.duration}s`);
        else if (action === "left_click_drag") secondaryInfo.push("drag");
        else secondaryInfo.push(action);
      }
      break;
    case "gif_creator":
      if (typeof input.action === "string") secondaryInfo.push(`${input.action}`);
      break;
    case "resize_window":
      if (typeof input.width === "number" && typeof input.height === "number")
        secondaryInfo.push(`${input.width}x${input.height}`);
      break;
    case "read_console_messages":
      if (typeof input.pattern === "string")
        secondaryInfo.push(`pattern: ${truncateToWidth(input.pattern, 20)}`);
      if (input.onlyErrors === true) secondaryInfo.push("errors only");
      break;
    case "read_network_requests":
      if (typeof input.urlPattern === "string")
        secondaryInfo.push(`pattern: ${truncateToWidth(input.urlPattern, 20)}`);
      break;
    case "shortcuts_execute":
      if (typeof input.shortcutId === "string") secondaryInfo.push(`shortcut_id: ${input.shortcutId}`);
      break;
    case "javascript_tool":
      if (verbose && typeof input.text === "string") return input.text;
      return "";
    case "tabs_create_mcp":
    case "tabs_context_mcp":
    case "form_input":
    case "shortcuts_list":
    case "read_page":
    case "upload_image":
    case "get_page_text":
    case "update_plan":
      return "";
  }
  return secondaryInfo.join(", ") || null;
}
//@ chunk-vnst8cd9.js:15021-15176 fingerprint (2.1.88 match: getClaudeInChromeMCPToolOverrides, 0.784)
/**
 * 给 claude-in-chrome 的 MCP 工具覆盖显示名 "Claude in Chrome[tool]" 与渲染函数。
 */
function getClaudeInChromeMCPToolOverrides(toolName) {
  return {
    userFacingName(_input) {
      return `Claude in Chrome[${toolName.replace(/_mcp$/, "")}]`;
    },
    renderToolUseMessage(input, { verbose }) {
      return renderChromeToolUseMessage(input, toolName, verbose);
    },
    ...getClaudeInChromePermissionOverrides(toolName),
  };
}
export {
  countVisibleTasks,
  createObjectResultRenderer,
  renderChromeViewTabLink,
  getClaudeInChromeMCPToolOverrides,
};

/**
 * utils/claudeInChrome/toolErrorClassification.ts
 *
 * 2.1.316 新增：浏览器工具错误分类与设备选择
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-290tacpj.js (5)
 * attribution: placement 5
 */
import { BROWSER_ACTION_SETTLE_MS } from "./browserToolSchemas.js";

//@ chunk-290tacpj.js:232-682 placement
function pickBrowserDevice(extensions, persistedDeviceId, localDeviceIds) {
  if (extensions.length === 0)
    return {
      kind: "none",
    };
  if (persistedDeviceId) {
    let found = extensions.find((extension) => extension.deviceId === persistedDeviceId);
    if (found)
      return {
        kind: "select",
        extension: found,
        reason: "persisted",
      };
  }
  if (extensions.length === 1)
    return {
      kind: "select",
      extension: extensions[0],
      reason: "only",
    };
  let localExtensions = localDeviceIds
    ? extensions.filter((extension) => localDeviceIds.has(extension.deviceId))
    : [];
  let [firstLocal, secondLocal] = localExtensions;
  if (firstLocal && !secondLocal && localDeviceIds?.get(firstLocal.deviceId) === "live")
    return {
      kind: "select",
      extension: firstLocal,
      reason: "local",
    };
  return {
    kind: "ask",
    candidates: [
      ...localExtensions,
      ...extensions.filter((extension) => !localExtensions.includes(extension)),
    ],
    localCount: localExtensions.length,
  };
}
//@ chunk-290tacpj.js:682-921 placement
function safeCallPromise(getLocalDeviceIds) {
  let idsPromise;
  try {
    idsPromise = getLocalDeviceIds?.();
  } catch {
    return Promise.resolve(undefined);
  }
  if (!idsPromise) return Promise.resolve(undefined);
  return new Promise((resolve) => {
    let timer = setTimeout(() => resolve(undefined), BROWSER_ACTION_SETTLE_MS);
    idsPromise.then(
      (ids) => {
        clearTimeout(timer);
        resolve(ids);
      },
      () => {
        clearTimeout(timer);
        resolve(undefined);
      },
    );
  });
}
//@ chunk-290tacpj.js:1092-4508 placement
/**
 * 工具错误正则到错误类型的规则表（第一部分）。
 */
var TAB_GONE_PATTERN = String.raw`(?:No tab with id: \d+|Tab \d+ (?:no longer exists|is not in the same group))`;
var TOOL_ERROR_RULES = [
  {
    pattern: /^Permission denied for JavaScript execution/,
    errorType: "js_permission_denied",
  },
  {
    pattern: /^JavaScript execution error: Execution timeout: Code exceeded \d+-second limit$/,
    errorType: "js_timeout",
  },
  {
    pattern: /^JavaScript execution error:/,
    errorType: "js_execution_error",
  },
  {
    pattern: new RegExp(`^Failed to execute JavaScript: ${TAB_GONE_PATTERN}`),
    errorType: "tab_not_found",
  },
  {
    pattern: /^Failed to execute JavaScript:/,
    errorType: "js_exception",
  },
];
var CONNECTION_ERROR_RULES = [
  {
    pattern: /^Permission denied for this action/,
    errorType: "computer_permission_denied",
  },
  {
    pattern:
      /^No element found with reference|^Error getting element coordinates|^Failed to (execute script to get|get) element coordinates/,
    errorType: "computer_element_not_found",
  },
  {
    pattern:
      /^Error (clicking|hovering|scrolling|pressing key|performing drag|capturing)|^Failed to (type|scroll to element)/,
    errorType: "computer_action_failed",
  },
  {
    pattern: /^"[^"]*" was not pressed: page zoom keyboard shortcuts are not supported/,
    errorType: "computer_zoom_shortcut_unsupported",
  },
  {
    pattern: new RegExp(`^Failed to execute action: ${TAB_GONE_PATTERN}`),
    errorType: "tab_not_found",
  },
  {
    pattern: /^Failed to execute action:/,
    errorType: "computer_exception",
  },
];
var PAGE_ERROR_RULES = [
  {
    pattern: /^Permission denied for reading page content/,
    errorType: "get_page_text_permission_denied",
  },
  {
    pattern: /^No semantic content element found|^Output exceeds \d+ character limit/,
    errorType: "get_page_text_too_large",
  },
  {
    pattern: /^No text content found/,
    errorType: "get_page_text_no_content",
  },
  {
    pattern: /^Failed to extract page text: No main text content found/,
    errorType: "get_page_text_no_content",
  },
  {
    pattern: /^Failed to extract page text: (Script execution failed|Page script returned empty result)/,
    errorType: "get_page_text_script_error",
  },
  {
    pattern: new RegExp(`^Failed to extract page text: ${TAB_GONE_PATTERN}`),
    errorType: "tab_not_found",
  },
  {
    pattern: /^Failed to extract page text:/,
    errorType: "get_page_text_exception",
  },
];
var ALL_TOOL_ERROR_RULES = [
  {
    pattern: /^Permission denied by user\. Domain transition denied/,
    errorType: "navigation_blocked",
  },
  {
    pattern: /^Cannot access this page\. Claude cannot assist/,
    errorType: "navigation_blocked",
  },
  {
    pattern: /^Permission denied by user/,
    errorType: "permission_denied_user",
  },
  {
    pattern: /^Permission required but no handler/,
    errorType: "permission_handler_missing",
  },
  {
    pattern:
      /^Authentication failed\. The extension may need to be re-authenticated\. Please check your login status/,
    errorType: "authentication_failed",
  },
  {
    pattern:
      /^Authentication failed\. The extension may need to be re-authenticated\. Open the Claude in Chrome side panel/,
    errorType: "session_expired",
  },
  {
    pattern: /^Authentication failed\. The extension may need to be re-authenticated/,
    errorType: "authentication_failed",
  },
  {
    pattern: /^No tabs? available/,
    errorType: "no_tabs_available",
  },
  {
    pattern: /^This site is blocked/,
    errorType: "domain_blocked",
  },
  {
    pattern: /^This site is not allowed due to safety restrictions/,
    errorType: "domain_blocked",
  },
  {
    pattern: /^Could not verify this site's safety category\. Blocking as a precaution/,
    errorType: "category_lookup_error",
  },
  {
    pattern: /^Claude in Chrome is turned off/,
    errorType: "domain_blocked",
  },
  {
    pattern: new RegExp(`^Tab \\d+ no longer exists|^${TAB_GONE_PATTERN}`),
    errorType: "tab_not_found",
  },
  {
    pattern: /^Security check failed: Domain changed|^Unable to verify current URL for security check/,
    errorType: "security_check_failed",
  },
];
var ERROR_TYPE_BY_CODE = new Map([
  ["javascript_tool", TOOL_ERROR_RULES],
  ["computer", CONNECTION_ERROR_RULES],
  ["get_page_text", PAGE_ERROR_RULES],
]);
//@ chunk-290tacpj.js:4508-4695 placement
function classifyToolError(toolName, errorText) {
  let rules = ERROR_TYPE_BY_CODE.get(toolName);
  if (rules) {
    for (let { pattern, errorType } of rules) if (pattern.test(errorText)) return errorType;
  }
  for (let { pattern, errorType } of ALL_TOOL_ERROR_RULES) if (pattern.test(errorText)) return errorType;
  return "unclassified_tool_error";
}
//@ chunk-290tacpj.js:4695-4870 placement
function firstTextContent(error) {
  let content = error?.content;
  if (typeof content === "string" && content) return content;
  if (Array.isArray(content))
    for (let block of content) {
      let text = block?.text;
      if (typeof text === "string" && text) return text;
    }
  return "Unknown error";
}
export { classifyToolError, firstTextContent, safeCallPromise, pickBrowserDevice };

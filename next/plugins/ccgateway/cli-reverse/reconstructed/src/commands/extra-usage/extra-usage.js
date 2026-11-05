/**
 * commands/extra-usage/extra-usage.tsx
 *
 * 沿用旧版路径：/extra-usage 命令。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/extra-usage/extra-usage.tsx
 * pieces: chunk-448az1sc.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { runExtraUsage } from "./extra-usage-core.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { USAGE_CREDITS_NONINTERACTIVE_HINT } from "../../services/api/adminRequests.js";

//@ chunk-448az1sc.js:13092-13442 placement
/**
 * /extra-usage 的非交互（文本）实现：调用 runExtraUsage，返回管理员请求确认文案或"已在浏览器打开/请访问 URL"的提示。
 */
async function callExtraUsageNonInteractive(args, context) {
  let result = await runExtraUsage(
    {
      openInBrowser: getIsNonInteractiveSession(),
    },
    context.credentials,
  );
  if (result.type === "message")
    return {
      type: "text",
      value: result.value,
    };
  if (result.type === "confirm-admin-request")
    return {
      type: "text",
      value: USAGE_CREDITS_NONINTERACTIVE_HINT,
    };
  return {
    type: "text",
    value: result.opened
      ? `Browser opened to manage usage credits. If it didn't open, visit: ${result.url}`
      : `Visit ${result.url} to manage usage credits.`,
  };
}
export { callExtraUsageNonInteractive };

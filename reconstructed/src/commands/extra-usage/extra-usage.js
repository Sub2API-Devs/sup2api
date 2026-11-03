/**
 * commands/extra-usage/extra-usage.tsx
 *
 * 沿用旧版路径：/extra-usage 命令。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/extra-usage/extra-usage.tsx
 * pieces: chunk-g49d7j62.js (1)
 * attribution: placement 1
 */
import { runExtraUsage } from "./extra-usage-core.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { USAGE_CREDITS_NONINTERACTIVE_HINT } from "../../services/api/adminRequests.js";

/**
 * /extra-usage 的非交互（文本）实现：调用 runExtraUsage，返回管理员请求确认文案或"已在浏览器打开/请访问 URL"的提示。
 */
//@ chunk-g49d7j62.js:11944-12294 placement
async function callExtraUsageNonInteractive(args, context) {
  let e = await runExtraUsage({ openInBrowser: getIsNonInteractiveSession() }, context.credentials);
  if (e.type === "message") return { type: "text", value: e.value };
  if (e.type === "confirm-admin-request") return { type: "text", value: USAGE_CREDITS_NONINTERACTIVE_HINT };
  return {
    type: "text",
    value: e.opened
      ? `Browser opened to manage usage credits. If it didn't open, visit: ${e.url}`
      : `Visit ${e.url} to manage usage credits.`,
  };
}

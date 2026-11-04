/**
 * utils/promptAblation.ts
 *
 * 2.1.316 新增：提示消融
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { logEvent } from "../services/analytics/index.js";
import { env } from "./env.js";
import { safeParseJSON } from "./json.js";
import { getCachedClientData } from "./config.js";
import { logForDebugging } from "./debug.js";

//@ chunk-e6aww6q8.js:1502484-1502516 placement
var REMOVE_PROMPT_STRINGS = "remove_prompt_strings";
//@ chunk-e6aww6q8.js:1502516-1502630 placement
function logPromptStringsRemoval({ strings, matched }) {
  logEvent("tengu_remove_prompt_strings_applied", {
    configured: strings.length,
    matched: matched.size,
  });
}
//@ chunk-e6aww6q8.js:1502630-1503098 placement
/**
 * 读取要从提示词中删除的字符串列表（环境变量 CLAUDE_CODE_REMOVE_PROMPT_STRINGS 优先，否则取客户端数据），格式不对时告警；有内容则记遥测。
 */
function loadPromptRemovalConfig() {
  let fromEnv = env.CLAUDE_CODE_REMOVE_PROMPT_STRINGS !== undefined;
  let rawValue = fromEnv
    ? safeParseJSON(env.CLAUDE_CODE_REMOVE_PROMPT_STRINGS, false)
    : getCachedClientData()?.[REMOVE_PROMPT_STRINGS];
  let strings = Array.isArray(rawValue)
    ? rawValue.filter((entry) => typeof entry === "string" && entry.trim() !== "")
    : [];
  let configured = Array.isArray(rawValue) ? rawValue.length > 0 : rawValue !== undefined;
  if (strings.length === 0 && configured)
    logForDebugging(
      `prompt ablation: ignoring ${fromEnv ? "CLAUDE_CODE_REMOVE_PROMPT_STRINGS" : `client_data ${REMOVE_PROMPT_STRINGS}`}: not a JSON array of non-empty strings`,
      {
        level: "warn",
      },
    );
  let config = {
    strings,
    matched: new Set(),
  };
  if (strings.length > 0) logPromptStringsRemoval(config);
  return config;
}
export { loadPromptRemovalConfig, logPromptStringsRemoval };

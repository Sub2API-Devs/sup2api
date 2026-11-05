/**
 * utils/hooks/scriptHooks.ts
 *
 * 脚本钩子路径锚定（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isAbsolute, join } from "path";
import { homedir } from "os";
import { HOOK_COMMAND_MAX_LENGTH } from "../../schemas/hooks.js";
import { checkHookCommandExpansion } from "../../schemas/hookEntryValidation.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { escapeControlChars, truncateToLength } from "../stringUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:298509-298628 placement
var SCRIPT_HOOK_ACK_ENV; // deferred: uses HOOK_COMMAND_MAX_LENGTH (../../schemas/hooks.js) of its import cycle while loading; runs once the cycle is complete
var MAX_SCRIPT_HOOK_PATH_CHARS;
var SCRIPT_HOOK_PATH_VARS;
deferInit("chunk-7jxyna5q.js:298509", () => {
  SCRIPT_HOOK_ACK_ENV = "CLAUDE_SCRIPT_HOOK_ACK";
  MAX_SCRIPT_HOOK_PATH_CHARS = HOOK_COMMAND_MAX_LENGTH * 3;
  SCRIPT_HOOK_PATH_VARS = ["${CLAUDE_PROJECT_DIR}", "${CLAUDE_PLUGIN_ROOT}", "${CLAUDE_PLUGIN_DATA}"];
});
//@ chunk-7jxyna5q.js:298628-298894 placement
function anchorScriptHookPath(command) {
  let problem = checkHookCommandExpansion(command);
  if (problem !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `script hook: ${problem}`,
      "script hook: file spelling cannot be anchored",
    );
  if (isAbsolute(command) || SCRIPT_HOOK_PATH_VARS.some((prefix) => command.startsWith(prefix)))
    return command;
  if (command === "~" || /^~[\\/]/.test(command)) return join(homedir(), command.slice(2));
  return `\${CLAUDE_PROJECT_DIR}/${command}`;
}
//@ chunk-7jxyna5q.js:298894-299170 placement
function expandScriptHookPathVars(path, roots) {
  let replaced = path.replaceAll("${CLAUDE_PROJECT_DIR}", () => roots.projectDir);
  if (roots.pluginRoot !== undefined)
    replaced = replaced.replaceAll("${CLAUDE_PLUGIN_ROOT}", () => roots.pluginRoot);
  if (roots.pluginData !== undefined)
    replaced = replaced.replaceAll("${CLAUDE_PLUGIN_DATA}", () => roots.pluginData);
  return replaced.includes("${") ? undefined : replaced;
}
//@ chunk-7jxyna5q.js:299170-299248 placement
/**
 * 此构建不支持脚本钩子，直接抛错。
 */
function runScriptHookUnsupported(hook, options) {
  throw Error("script hooks are not available in this build");
}
//@ chunk-7jxyna5q.js:299248-299258 placement
var MAX_SCRIPT_HOOK_LABEL_CHARS = 60;
//@ chunk-7jxyna5q.js:299258-299433 placement
function scriptHookDisplayLabel(hook) {
  let firstLine =
    escapeControlChars(hook)
      .split(
        `
`,
      )
      .map((line) => line.trim())
      .find((line) => line.length > 0) ?? "";
  let label = truncateToLength(firstLine, MAX_SCRIPT_HOOK_LABEL_CHARS);
  let truncated =
    label.length < firstLine.length ||
    hook.trim().includes(`
`);
  return `script: ${label}${truncated ? "\u2026" : ""}`;
}
export {
  scriptHookDisplayLabel,
  SCRIPT_HOOK_ACK_ENV,
  expandScriptHookPathVars,
  anchorScriptHookPath,
  runScriptHookUnsupported,
};

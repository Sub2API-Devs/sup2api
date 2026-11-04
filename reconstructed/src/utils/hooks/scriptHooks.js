/**
 * utils/hooks/scriptHooks.ts
 *
 * 脚本钩子路径锚定（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (6)
 * attribution: placement 6
 */
import { isAbsolute, join } from "path";
import { homedir } from "os";
import { HOOK_COMMAND_MAX_LENGTH } from "../../schemas/hooks.js";
import { checkHookCommandExpansion } from "../../schemas/hookEntryValidation.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { escapeControlChars, truncateToLength } from "../stringUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:373842-373962 placement
var SCRIPT_HOOK_ACK_ENV; // deferred: uses HOOK_COMMAND_MAX_LENGTH (../../schemas/hooks.js) of its import cycle while loading; runs once the cycle is complete
var MAX_SCRIPT_HOOK_PATH_CHARS;
var SCRIPT_HOOK_PATH_VARS;
deferInit("chunk-s61vbvea.js:373842", () => {
  SCRIPT_HOOK_ACK_ENV = "CLAUDE_SCRIPT_HOOK_ACK";
  MAX_SCRIPT_HOOK_PATH_CHARS = HOOK_COMMAND_MAX_LENGTH * 3;
  SCRIPT_HOOK_PATH_VARS = ["${CLAUDE_PROJECT_DIR}", "${CLAUDE_PLUGIN_ROOT}", "${CLAUDE_PLUGIN_DATA}"];
});
//@ chunk-s61vbvea.js:373962-374228 placement
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
//@ chunk-s61vbvea.js:374228-374504 placement
function expandScriptHookPathVars(path, roots) {
  let replaced = path.replaceAll("${CLAUDE_PROJECT_DIR}", () => roots.projectDir);
  if (roots.pluginRoot !== undefined)
    replaced = replaced.replaceAll("${CLAUDE_PLUGIN_ROOT}", () => roots.pluginRoot);
  if (roots.pluginData !== undefined)
    replaced = replaced.replaceAll("${CLAUDE_PLUGIN_DATA}", () => roots.pluginData);
  return replaced.includes("${") ? undefined : replaced;
}
//@ chunk-s61vbvea.js:374504-374582 placement
/**
 * 此构建不支持脚本钩子，直接抛错。
 */
function runScriptHookUnsupported(hook, options) {
  throw Error("script hooks are not available in this build");
}
//@ chunk-s61vbvea.js:374582-374592 placement
var MAX_SCRIPT_HOOK_LABEL_CHARS = 60;
//@ chunk-s61vbvea.js:374592-374768 placement
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
  SCRIPT_HOOK_ACK_ENV,
  expandScriptHookPathVars,
  anchorScriptHookPath,
  runScriptHookUnsupported,
  scriptHookDisplayLabel,
};

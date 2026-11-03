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

//@ chunk-s61vbvea.js:373842-373962 placement
var SCRIPT_HOOK_ACK_ENV = "CLAUDE_SCRIPT_HOOK_ACK";
var MAX_SCRIPT_HOOK_PATH_CHARS = HOOK_COMMAND_MAX_LENGTH * 3;
var SCRIPT_HOOK_PATH_VARS = ["${CLAUDE_PROJECT_DIR}", "${CLAUDE_PLUGIN_ROOT}", "${CLAUDE_PLUGIN_DATA}"];
//@ chunk-s61vbvea.js:373962-374228 placement
function anchorScriptHookPath(file) {
  let n = checkHookCommandExpansion(file);
  if (n !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `script hook: ${n}`,
      "script hook: file spelling cannot be anchored",
    );
  if (isAbsolute(file) || SCRIPT_HOOK_PATH_VARS.some((r) => file.startsWith(r))) return file;
  if (file === "~" || /^~[\\/]/.test(file)) return join(homedir(), file.slice(2));
  return `\${CLAUDE_PROJECT_DIR}/${file}`;
}
//@ chunk-s61vbvea.js:374228-374504 placement
function expandScriptHookPathVars(e, n) {
  let replaced = e.replaceAll("${CLAUDE_PROJECT_DIR}", () => n.projectDir);
  if (n.pluginRoot !== undefined) replaced = replaced.replaceAll("${CLAUDE_PLUGIN_ROOT}", () => n.pluginRoot);
  if (n.pluginData !== undefined) replaced = replaced.replaceAll("${CLAUDE_PLUGIN_DATA}", () => n.pluginData);
  return replaced.includes("${") ? undefined : replaced;
}
//@ chunk-s61vbvea.js:374504-374582 placement
/**
 * 此构建不支持脚本钩子，直接抛错。
 */
function runScriptHookUnsupported(e, n) {
  throw Error("script hooks are not available in this build");
}
//@ chunk-s61vbvea.js:374582-374592 placement
var MAX_SCRIPT_HOOK_LABEL_CHARS = 60;
//@ chunk-s61vbvea.js:374592-374768 placement
function scriptHookDisplayLabel(e) {
  let n =
    escapeControlChars(e)
      .split(
        `
`,
      )
      .map((line) => line.trim())
      .find((h) => h.length > 0) ?? "";
  let r = truncateToLength(n, MAX_SCRIPT_HOOK_LABEL_CHARS);
  let s =
    r.length < n.length ||
    e.trim().includes(`
`);
  return `script: ${r}${s ? "\u2026" : ""}`;
}
export {
  SCRIPT_HOOK_ACK_ENV,
  expandScriptHookPathVars,
  anchorScriptHookPath,
  runScriptHookUnsupported,
  scriptHookDisplayLabel,
};

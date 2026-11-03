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
import {
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  join as join_12,
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
} from "path";
import {
  homedir,
  homedir as homedir_2,
  homedir as homedir_3,
  homedir as homedir_4,
  homedir as homedir_5,
  homedir as homedir_6,
  homedir as homedir_7,
} from "os";
import { HOOK_COMMAND_MAX_LENGTH } from "../../schemas/hooks.js";
import { checkHookCommandExpansion } from "../../schemas/hookEntryValidation.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { escapeControlChars, truncateToLength } from "../stringUtils.js";

//@ chunk-s61vbvea.js:373842-373962 placement
var SCRIPT_HOOK_ACK_ENV = "CLAUDE_SCRIPT_HOOK_ACK",
  Mae = HOOK_COMMAND_MAX_LENGTH * 3,
  JN = ["${CLAUDE_PROJECT_DIR}", "${CLAUDE_PLUGIN_ROOT}", "${CLAUDE_PLUGIN_DATA}"];
//@ chunk-s61vbvea.js:373962-374228 placement
function anchorScriptHookPath(e) {
  let n = checkHookCommandExpansion(e);
  if (n !== void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `script hook: ${n}`,
      "script hook: file spelling cannot be anchored",
    );
  if (isAbsolute_8(e) || JN.some((r) => e.startsWith(r))) return e;
  if (e === "~" || /^~[\\/]/.test(e)) return join_11(homedir_3(), e.slice(2));
  return `\${CLAUDE_PROJECT_DIR}/${e}`;
}
//@ chunk-s61vbvea.js:374228-374504 placement
function expandScriptHookPathVars(e, n) {
  let replaced = e.replaceAll("${CLAUDE_PROJECT_DIR}", () => n.projectDir);
  if (n.pluginRoot !== void 0) replaced = replaced.replaceAll("${CLAUDE_PLUGIN_ROOT}", () => n.pluginRoot);
  if (n.pluginData !== void 0) replaced = replaced.replaceAll("${CLAUDE_PLUGIN_DATA}", () => n.pluginData);
  return replaced.includes("${") ? void 0 : replaced;
}
//@ chunk-s61vbvea.js:374504-374582 placement
function XVo(e, n) {
  throw Error("script hooks are not available in this build");
}
//@ chunk-s61vbvea.js:374582-374592 placement
var QN = 60;
//@ chunk-s61vbvea.js:374592-374768 placement
function scriptHookDisplayLabel(e) {
  let n =
      escapeControlChars(e)
        .split(
          `
`,
        )
        .map((h) => h.trim())
        .find((h) => h.length > 0) ?? "",
    r = truncateToLength(n, QN),
    s =
      r.length < n.length ||
      e.trim().includes(`
`);
  return `script: ${r}${s ? "\u2026" : ""}`;
}

export { SCRIPT_HOOK_ACK_ENV, expandScriptHookPathVars, anchorScriptHookPath, XVo, scriptHookDisplayLabel };

/**
 * utils/plugins/pluginDirsEnv.ts
 *
 * 2.1.316 新增。读取 CLAUDE_CODE_PLUGIN_DIRS 环境变量中的插件目录。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fj3y0bxk.js (6)
 * attribution: placement 6
 */
import { delimiter, resolve, isAbsolute } from "path";
import { env } from "../env.js";
import { Lu, Ya, tP } from "../networkPaths.js";
import { logForDebugging } from "../debug.js";
import { isWindowsDevicePath } from "../windowsUncPaths.js";

//@ chunk-fj3y0bxk.js:368-534 placement
var PLUGIN_DIRS_ENV_VAR = "CLAUDE_CODE_PLUGIN_DIRS",
  PLUGIN_DIRS_ENV_RECOVERY_HINT =
    "Unset CLAUDE_CODE_PLUGIN_DIRS (in the environment, or in the settings `env` block that sets it) to run without those folders.";
/**
 * 读取 CLAUDE_CODE_PLUGIN_DIRS 环境变量中的插件目录。
 */
//@ chunk-fj3y0bxk.js:534-827 placement
function pluginDirsFromEnv() {
  let filtered = (env.CLAUDE_CODE_PLUGIN_DIRS ?? "")
      .split(delimiter)
      .map((e) => Lu(e.trim()))
      .filter((e) => e !== ""),
    filtered_2 = filtered.filter((e) => !l(e));
  if (filtered_2.length > 0)
    logForDebugging(
      `${PLUGIN_DIRS_ENV_VAR}: skipped ${filtered_2.join(", ")}: a plugin folder here is an absolute local path or starts with ~`,
      { level: "warn" },
    );
  return filtered.filter(l).map((e) => resolve(e));
}
//@ chunk-fj3y0bxk.js:827-944 placement
function settlePluginDirsEnv() {
  let n = pluginDirsFromEnv();
  if (env.CLAUDE_CODE_PLUGIN_DIRS !== void 0) env.set("CLAUDE_CODE_PLUGIN_DIRS", n.join(delimiter));
  return n;
}
//@ chunk-fj3y0bxk.js:944-1056 placement
function mergePluginDirs(...n) {
  let r = new Map();
  for (let e of n.flat()) {
    let o = resolve(e);
    if (!r.has(o)) r.set(o, e);
  }
  return [...r.values()];
}
//@ chunk-fj3y0bxk.js:1056-1141 placement
function withoutPluginDirs(n, r) {
  let e = new Set(r.map((o) => resolve(o)));
  return n.filter((o) => !e.has(resolve(o)));
}
//@ chunk-fj3y0bxk.js:1141-1191 placement
function l(n) {
  return isAbsolute(n) && !isWindowsDevicePath(n) && !Ya(n) && !tP(n);
}

export {
  mergePluginDirs,
  withoutPluginDirs,
  settlePluginDirsEnv,
  PLUGIN_DIRS_ENV_VAR,
  PLUGIN_DIRS_ENV_RECOVERY_HINT,
  pluginDirsFromEnv,
};

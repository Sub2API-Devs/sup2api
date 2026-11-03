/**
 * utils/configDirPathShape.ts
 *
 * 2.1.316 新增：配置目录路径形态遥测与可缓存提示词拼接
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-3wek6r2k.js (5)
 * attribution: placement 5
 */
import * as pathModule from "path";
import { SYSTEM_PROMPT_DYNAMIC_BOUNDARY } from "../entrypoints/sdk/coreSchemas.js";
import { isCliSyspromptPrefix } from "../constants/system.js";
import { isUncachedSystemBlock } from "../services/api/promptCacheBreakDetection.js";
import { isDiskless } from "../bootstrap/state.js";
import { getEnvCaseInsensitive } from "./plugins/securityDefaultPlugin.js";
import { getPreSettingsEnvSnapshot } from "./managedEnvApply.js";
import { getClaudeConfigHomeDir } from "./envUtils.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { createEnvAccessor } from "./env/envRegistry.js";

//@ chunk-3wek6r2k.js:68365-68416 placement
function isUncachedPromptBoundary(e) {
  return (
    e === SYSTEM_PROMPT_DYNAMIC_BOUNDARY ||
    isCliSyspromptPrefix(e) ||
    isUncachedSystemBlock({
      text: e,
    })
  );
}
//@ chunk-3wek6r2k.js:68416-68474 placement
function joinCacheablePrompt(e) {
  return e.filter((o) => o && !isUncachedPromptBoundary(o)).join(`

`);
}
//@ chunk-3wek6r2k.js:68498-68886 placement
function configDirPathShape(e, o = pathModule) {
  if (e === undefined) return "unset";
  let trimmed = e.trim();
  if (trimmed === "") return "blank";
  let r = o.sep === "\\";
  if (o.isAbsolute(e))
    return !r || /^[a-z]:/i.test(e) ? "absolute" : /^[\\/]{2}/.test(e) ? "unc" : "rooted_no_drive";
  let replaced = trimmed.replace(/^(["'])(.*)\1$/s, "$2");
  if (o.isAbsolute(replaced)) return "quoted_or_padded";
  let [p = ""] = replaced.split(r ? /[\\/]/ : "/");
  return p === "~" ? "tilde" : /^[$%~]/.test(p) ? "variable" : "relative";
}
//@ chunk-3wek6r2k.js:68886-69038 placement
function configDirTelemetry() {
  if (isDiskless()) return {};
  let envCaseInsensitive = getEnvCaseInsensitive(getPreSettingsEnvSnapshot(), "CLAUDE_CONFIG_DIR");
  let claudeConfigHomeDir = getClaudeConfigHomeDir();
  return {
    config_dir_kind: fromEnum(configDirPathShape(envCaseInsensitive)),
    ...(claudeConfigHomeDir !== envCaseInsensitive && {
      config_dir_settings_kind: fromEnum(configDirPathShape(claudeConfigHomeDir)),
    }),
  };
}
//@ chunk-3wek6r2k.js:69038-69063 placement
/**
 * 配置目录路径覆盖的空表。
 */
var emptyConfigDirOverrides = {};
var configDirOverridesAccessor = createEnvAccessor(emptyConfigDirOverrides, null);
export { configDirTelemetry, joinCacheablePrompt, isUncachedPromptBoundary };

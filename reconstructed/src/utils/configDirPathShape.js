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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-3wek6r2k.js:68365-68416 placement
function isUncachedPromptBoundary(promptPart) {
  return (
    promptPart === SYSTEM_PROMPT_DYNAMIC_BOUNDARY ||
    isCliSyspromptPrefix(promptPart) ||
    isUncachedSystemBlock({
      text: promptPart,
    })
  );
}
//@ chunk-3wek6r2k.js:68416-68474 placement
function joinCacheablePrompt(promptParts) {
  return promptParts.filter((promptPart) => promptPart && !isUncachedPromptBoundary(promptPart)).join(`

`);
}
//@ chunk-3wek6r2k.js:68498-68886 placement
function configDirPathShape(configDirPath, pathApi = pathModule) {
  if (configDirPath === undefined) return "unset";
  let trimmed = configDirPath.trim();
  if (trimmed === "") return "blank";
  let isWindowsPath = pathApi.sep === "\\";
  if (pathApi.isAbsolute(configDirPath))
    return !isWindowsPath || /^[a-z]:/i.test(configDirPath)
      ? "absolute"
      : /^[\\/]{2}/.test(configDirPath)
        ? "unc"
        : "rooted_no_drive";
  let replaced = trimmed.replace(/^(["'])(.*)\1$/s, "$2");
  if (pathApi.isAbsolute(replaced)) return "quoted_or_padded";
  let [firstSegment = ""] = replaced.split(isWindowsPath ? /[\\/]/ : "/");
  return firstSegment === "~" ? "tilde" : /^[$%~]/.test(firstSegment) ? "variable" : "relative";
}
//@ chunk-3wek6r2k.js:68886-69038 placement
function configDirTelemetry() {
  if (isDiskless()) return {};
  let configDirPath = getEnvCaseInsensitive(getPreSettingsEnvSnapshot(), "CLAUDE_CONFIG_DIR");
  let configDirPath_2 = getClaudeConfigHomeDir();
  return {
    config_dir_kind: fromEnum(configDirPathShape(configDirPath)),
    ...(configDirPath_2 !== configDirPath && {
      config_dir_settings_kind: fromEnum(configDirPathShape(configDirPath_2)),
    }),
  };
}
//@ chunk-3wek6r2k.js:69038-69063 placement
/**
 * 配置目录路径覆盖的空表。
 */
var emptyConfigDirOverrides; // deferred: uses createEnvAccessor (./env/envRegistry.js) of its import cycle while loading; runs once the cycle is complete
var configDirOverridesAccessor;
deferInit("chunk-3wek6r2k.js:69038", () => {
  emptyConfigDirOverrides = {};
  configDirOverridesAccessor = createEnvAccessor(emptyConfigDirOverrides, null);
});
export { configDirTelemetry, joinCacheablePrompt, isUncachedPromptBoundary };

/**
 * utils/configDirPathShape.ts
 *
 * 2.1.316 新增：配置目录路径形态遥测与可缓存提示词拼接
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hjswk319.js (4)
 * attribution: placement 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-hjswk319.js:67789-67840 placement
function isUncachedPromptBoundary(promptPart) {
  return (
    promptPart === SYSTEM_PROMPT_DYNAMIC_BOUNDARY ||
    isCliSyspromptPrefix(promptPart) ||
    isUncachedSystemBlock({
      text: promptPart,
    })
  );
}
//@ chunk-hjswk319.js:67840-67898 placement
function joinCacheablePrompt(promptParts) {
  return promptParts.filter((promptPart) => promptPart && !isUncachedPromptBoundary(promptPart)).join(`

`);
}
//@ chunk-hjswk319.js:67922-68310 placement
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
//@ chunk-hjswk319.js:68310-68462 placement
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
export { configDirTelemetry, joinCacheablePrompt, isUncachedPromptBoundary };

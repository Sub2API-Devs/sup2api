/**
 * services/autoModeSetup/applySetup.ts
 *
 * /auto-mode-setup 写入设置（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fta1hp2w.js (15)
 * attribution: placement 15
 */
import {
  MAX_SETTINGS_JSON_BYTES,
  autoModeConfigSchema,
  getSettingsFilePathForSource,
  updateSettingsForSourceWithTransform,
  builtinAllowRulesAreOff,
} from "../../utils/settings/settings.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import {
  DEFAULTS_PLACEHOLDER,
  hasControlChars,
  hasInvisibleRuleChars,
  findTemplateInjection,
} from "../../utils/permissions/autoModeRulesPrompt.js";
import { ghIsDangerousCallback } from "./pregather.js";
import { logForDebugging } from "../../utils/debug.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fta1hp2w.js:55285-55367 placement
/**
 * autoMode.environment 的最大字节数（50000）。
 */
var AUTO_MODE_DECISION_KINDS; // deferred: uses MAX_SETTINGS_JSON_BYTES (../../utils/settings/settings.js) of its import cycle while loading; runs once the cycle is complete
var MAX_RULES_PER_DECISION_KIND;
var MAX_RULE_ENTRY_CHARS;
var MAX_PERMISSIONS_JSON_BYTES;
var MAX_ENVIRONMENT_ENTRIES;
var MAX_ENVIRONMENT_BYTES;
deferInit("chunk-fta1hp2w.js:55285", () => {
  AUTO_MODE_DECISION_KINDS = ["allow", "soft_deny", "hard_deny"];
  MAX_RULES_PER_DECISION_KIND = 200;
  MAX_RULE_ENTRY_CHARS = 1e4;
  MAX_PERMISSIONS_JSON_BYTES = MAX_SETTINGS_JSON_BYTES / 4;
  MAX_ENVIRONMENT_ENTRIES = 200;
  MAX_ENVIRONMENT_BYTES = 50000;
});
//@ chunk-fta1hp2w.js:55367-55471 placement
class AutoModeSetupWriteError extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.name = "AutoModeSetupWriteError";
    this.code = code;
  }
}
//@ chunk-fta1hp2w.js:55471-55724 placement
/**
 * 写入自动模式设置并记录特性状态：失败按错误码记录，跳过 permissions.allow 时记为 sad。
 */
async function applyAutoModeSettings(input, storageV5) {
  let result;
  try {
    result = await writeAutoModeSettings(input, storageV5);
  } catch (error) {
    logFeatureBad("auto_mode_setup_write", error instanceof AutoModeSetupWriteError ? error.code : "unknown");
    throw error;
  }
  if (result.permissionsAllowSkipped) logFeatureSad("auto_mode_setup_write", "permissions_allow_skipped");
  else logFeatureOk("auto_mode_setup_write");
  return result;
}
//@ chunk-fta1hp2w.js:55724-57038 placement
function validateAutoModeBlock(input) {
  let { autoMode } = input;
  if (autoMode === undefined && (input.removeFromPermissionsAllow ?? []).length === 0)
    return "Nothing to save.";
  if (autoMode !== undefined) {
    let parseResult = autoModeConfigSchema().safeParse(autoMode);
    if (!parseResult.success)
      return `autoMode block failed validation: ${formatZodIssues(parseResult.error)}`;
    if (!autoMode.environment || autoMode.environment.length === 0)
      return "autoMode.environment is empty \u2014 nothing to save.";
    let entryError = checkAutoModeEntries("environment", autoMode.environment);
    if (entryError) return entryError;
    if (
      autoMode.environment.some(
        (environmentEntry) => stripVariationSelectors(environmentEntry) === DEFAULTS_PLACEHOLDER,
      )
    )
      return `autoMode.environment must not contain "${DEFAULTS_PLACEHOLDER}" \u2014 skipped slots get their shipped default text written verbatim instead.`;
    for (let decisionKind of AUTO_MODE_DECISION_KINDS) {
      let decisionEntries = autoMode[decisionKind];
      if (decisionEntries === undefined) continue;
      if (decisionEntries.length === 0)
        return `autoMode.${decisionKind} is empty \u2014 omit the key when nothing was accepted for it.`;
      let entryError = checkAutoModeEntries(decisionKind, decisionEntries);
      if (entryError) return entryError;
      if (!decisionEntries.includes(DEFAULTS_PLACEHOLDER))
        return `autoMode.${decisionKind} is missing the literal entry "${DEFAULTS_PLACEHOLDER}" \u2014 without it the array replaces the shipped rules instead of extending them.`;
    }
  }
  let removeFromPermissionsAllow = input.removeFromPermissionsAllow;
  if (removeFromPermissionsAllow !== undefined) {
    if (!Array.isArray(removeFromPermissionsAllow))
      return "removeFromPermissionsAllow must be an array of rule strings.";
    if (removeFromPermissionsAllow.length > MAX_RULES_PER_DECISION_KIND)
      return `removeFromPermissionsAllow has ${removeFromPermissionsAllow.length} entries; the maximum is ${MAX_RULES_PER_DECISION_KIND}.`;
    for (let [index, ruleString] of removeFromPermissionsAllow.entries())
      if (typeof ruleString !== "string" || !ghIsDangerousCallback(ruleString))
        return `removeFromPermissionsAllow[${index}] is not a rule string the removal offer could have produced.`;
  }
  return null;
}
//@ chunk-fta1hp2w.js:57038-59304 placement
/**
 * 把自动模式设置写入用户设置文件（校验、解析失败时报错）
 */
async function writeAutoModeSettings(input, storageV5) {
  let validationError = validateAutoModeBlock(input);
  if (validationError) throw new AutoModeSetupWriteError("invalid_input", validationError);
  let settingsFilePathForSource = getSettingsFilePathForSource("userSettings");
  if (!settingsFilePathForSource)
    throw new AutoModeSetupWriteError(
      "no_user_settings_path",
      "Could not resolve the user settings file path.",
    );
  let normalizedBlock = input.autoMode !== undefined ? normalizeAutoModeBlock(input.autoMode) : undefined;
  let mode = input.mode ?? "append";
  let removeFromPermissionsAllow = input.removeFromPermissionsAllow ?? [];
  let removedAllowRules = [];
  let permissionsAllowNotFound = [];
  let permissionsAllowSkipped = false;
  let environmentEntriesPreserved = 0;
  let mergeError = null;
  let warnings = [];
  let { error } = await updateSettingsForSourceWithTransform(
    "userSettings",
    (currentSettings) => {
      let changes = {};
      if (normalizedBlock !== undefined) {
        let autoMode = currentSettings?.autoMode;
        if (Array.isArray(autoMode)) {
          mergeError =
            "the existing autoMode value in the settings file is an array \u2014 remove or fix it, then re-run setup.";
          return null;
        }
        let existingAutoMode = autoMode !== null && typeof autoMode === "object" ? autoMode : undefined;
        let mergedBlock;
        if (mode === "append") {
          let existing = toStringList(existingAutoMode?.environment);
          environmentEntriesPreserved = existing.length;
          mergedBlock = {
            environment: mergeEnvironmentEntries(existing, normalizedBlock.environment),
          };
        } else
          mergedBlock = {
            environment: normalizedBlock.environment,
          };
        for (let decisionKind of AUTO_MODE_DECISION_KINDS) {
          let incomingEntries = normalizedBlock[decisionKind];
          if (incomingEntries === undefined) continue;
          mergedBlock[decisionKind] = mergeRuleEntries(
            decisionKind,
            toStringList(existingAutoMode?.[decisionKind]),
            incomingEntries,
          );
        }
        let candidateBlock = {
          ...existingAutoMode,
          ...mergedBlock,
        };
        let parseResult = autoModeConfigSchema().safeParse(candidateBlock);
        if (!parseResult.success) {
          mergeError = `merging with the existing autoMode block in the settings file would produce an invalid result: ${formatZodIssues(parseResult.error)}`;
          return null;
        }
        let environmentByteLength = Buffer.byteLength(JSON.stringify(mergedBlock.environment), "utf8");
        if (
          mergedBlock.environment.length > MAX_ENVIRONMENT_ENTRIES ||
          environmentByteLength > MAX_ENVIRONMENT_BYTES
        ) {
          let sizeWarning = `autoMode.environment now has ${mergedBlock.environment.length} entries (~${Math.round(environmentByteLength / 1024)} KB). It\u2019s spliced into the classifier prompt on every auto-mode decision \u2014 consider pruning stale entries.`;
          warnings.push(sizeWarning);
          logForDebugging(`auto-mode setup: ${sizeWarning}`, {
            level: "warn",
          });
        }
        let autoModeByteLength = Buffer.byteLength(jsonStringify(candidateBlock));
        if (autoModeByteLength > MAX_PERMISSIONS_JSON_BYTES)
          warnings.push(
            `The autoMode settings section is ${Math.round(autoModeByteLength / 1024)}KB serialized \u2014 the whole settings file stops loading past ${Math.round(MAX_SETTINGS_JSON_BYTES / 1048576)}MiB. Consider trimming rules or environment entries.`,
          );
        changes.autoMode = mergedBlock;
      }
      let toChangesOrNull = () => (Object.keys(changes).length > 0 ? changes : null);
      if (removeFromPermissionsAllow.length === 0) return toChangesOrNull();
      let allow = currentSettings?.permissions?.allow;
      if (!Array.isArray(allow)) {
        permissionsAllowSkipped = true;
        return toChangesOrNull();
      }
      let removeSet = new Set(removeFromPermissionsAllow);
      let allow_2 = allow.filter((rule) => !removeSet.has(rule));
      removedAllowRules = allow.filter((rule) => removeSet.has(rule));
      let existingAllowSet = new Set(allow);
      permissionsAllowNotFound = removeFromPermissionsAllow.filter((rule) => !existingAllowSet.has(rule));
      if (removedAllowRules.length === 0) return toChangesOrNull();
      changes.permissions = {
        allow: allow_2,
      };
      return changes;
    },
    undefined,
    storageV5,
  );
  if (mergeError) throw new AutoModeSetupWriteError("invalid_merged", mergeError);
  if (error) {
    logForDebugging(`auto-mode setup write failed: ${error.message}`, {
      level: "error",
    });
    let failure = describeSettingsWriteFailure(error, settingsFilePathForSource, "setup");
    throw new AutoModeSetupWriteError(failure.code, failure.message);
  }
  return {
    filePath: settingsFilePathForSource,
    autoModeKeysWritten: normalizedBlock !== undefined ? Object.keys(normalizedBlock) : [],
    environmentEntriesPreserved,
    permissionsAllowRemoved: removedAllowRules,
    permissionsAllowNotFound,
    permissionsAllowSkipped,
    warnings,
  };
}
//@ chunk-fta1hp2w.js:59304-59421 placement
/**
 * 设置文件 JSON 无效时的提示：修复或删除后重新运行命令。
 */
function invalidSettingsJsonMessage(settingsPath, commandName) {
  return `The settings file at ${settingsPath} contains invalid JSON \u2014 fix or remove it, then re-run ${commandName}.`;
}
//@ chunk-fta1hp2w.js:59421-59689 placement
/**
 * 把设置写入失败转换为错误码与提示：JSON 语法错误或一般写入失败（检查权限与磁盘空间）。
 */
function describeSettingsWriteFailure(error, settingsPath, commandName) {
  if (error.message.includes("Invalid JSON syntax"))
    return {
      code: "settings_file_invalid",
      message: invalidSettingsJsonMessage(settingsPath, commandName),
    };
  return {
    code: "write_failed",
    message: `Could not write ${settingsPath} \u2014 check file permissions and disk space (run with --debug for the underlying error).`,
  };
}
//@ chunk-fta1hp2w.js:59689-59789 placement
function formatZodIssues(error) {
  return error.issues.map((issue) => `${issue.path.map(String).join(".")}: ${issue.message}`).join("; ");
}
//@ chunk-fta1hp2w.js:59789-59866 placement
/**
 * 把值规范成字符串数组：非数组给空数组，并过滤掉非字符串项。
 */
function toStringList(environment) {
  return Array.isArray(environment) ? environment.filter((entry) => typeof entry === "string") : [];
}
//@ chunk-fta1hp2w.js:59866-60448 placement
/**
 * 把新的环境说明条目合并到已有 autoMode.environment：按 "### " 小节分组，相同小节内已存在的条目跳过，新条目插到对应小节末尾，新小节追加到最后，空的新小节会被删除。
 */
function mergeEnvironmentEntries(existing, incoming) {
  let isSectionHeader = (line) => line.startsWith("### ");
  let merged = [...existing];
  let sectionKey = (sectionName, line) => `${sectionName}\x00${stripVariationSelectors(line)}`;
  let seenInSection = new Set();
  let seenAnywhere = new Set();
  {
    let section = "";
    for (let line of existing)
      if (isSectionHeader(line)) section = stripVariationSelectors(line);
      else {
        seenInSection.add(sectionKey(section, line));
        seenAnywhere.add(stripVariationSelectors(line));
      }
  }
  let insertAt = merged.length;
  let currentSection = "";
  let newSectionIndex = -1;
  let newSectionTouched = false;
  let pruneEmptyNewSection = () => {
    if (newSectionIndex !== -1 && !newSectionTouched) {
      merged.splice(newSectionIndex, 1);
      if (insertAt > newSectionIndex) insertAt--;
    }
    newSectionIndex = -1;
    newSectionTouched = false;
  };
  for (let line of incoming) {
    if (isSectionHeader(line)) {
      pruneEmptyNewSection();
      currentSection = stripVariationSelectors(line);
      let index = merged.findIndex((mergedLine) => stripVariationSelectors(mergedLine) === currentSection);
      if (index === -1) {
        merged.push(line);
        newSectionIndex = merged.length - 1;
        insertAt = merged.length;
      } else {
        let nextIndex = index + 1;
        while (nextIndex < merged.length && !isSectionHeader(merged[nextIndex])) nextIndex++;
        insertAt = nextIndex;
      }
      continue;
    }
    let strippedLine = stripVariationSelectors(line);
    if (
      seenInSection.has(sectionKey(currentSection, line)) ||
      seenInSection.has(sectionKey("", line)) ||
      (currentSection === "" && seenAnywhere.has(strippedLine))
    )
      continue;
    merged.splice(insertAt++, 0, line);
    seenInSection.add(sectionKey(currentSection, line));
    seenAnywhere.add(strippedLine);
    if (newSectionIndex !== -1) newSectionTouched = true;
  }
  pruneEmptyNewSection();
  return merged;
}
//@ chunk-fta1hp2w.js:60448-60659 placement
function mergeRuleEntries(decisionKind, stringList, incomingEntries) {
  let keepPlaceholder =
    decisionKind !== "allow" ||
    (stringList.length === 0
      ? !builtinAllowRulesAreOff()
      : stringList.some((entry) => stripVariationSelectors(entry) === DEFAULTS_PLACEHOLDER));
  let seen = new Set();
  let merged = [];
  for (let entry of [DEFAULTS_PLACEHOLDER, ...stringList, ...incomingEntries]) {
    let stripped = stripVariationSelectors(entry);
    if (stripped === DEFAULTS_PLACEHOLDER && !keepPlaceholder) continue;
    if (seen.has(stripped)) continue;
    seen.add(stripped);
    merged.push(entry);
  }
  return merged;
}
//@ chunk-fta1hp2w.js:60659-60783 placement
function normalizeAutoModeBlock(autoMode) {
  let normalized = {
    environment: autoMode.environment.map(stripVariationSelectors),
  };
  for (let decisionKind of AUTO_MODE_DECISION_KINDS) {
    let entries = autoMode[decisionKind];
    if (entries !== undefined) normalized[decisionKind] = entries.map(stripVariationSelectors);
  }
  return normalized;
}
//@ chunk-fta1hp2w.js:60783-61621 placement
function checkAutoModeEntries(fieldName, entries) {
  if (entries.length > MAX_RULES_PER_DECISION_KIND)
    return `${fieldName} has ${entries.length} entries; the maximum is ${MAX_RULES_PER_DECISION_KIND}.`;
  for (let entry of entries) {
    let stripped = stripVariationSelectors(entry);
    if (stripped.trim() === "") return `${fieldName} contains an empty entry.`;
    if (stripped.length > MAX_RULE_ENTRY_CHARS)
      return `${fieldName} contains an entry of ${stripped.length} characters; the maximum is ${MAX_RULE_ENTRY_CHARS}.`;
    if (hasControlChars(stripped))
      return `${fieldName} contains an entry with a control character; entries must be single-line text.`;
    if (hasInvisibleRuleChars(stripped))
      return `${fieldName} contains an entry with an invisible or bidirectional character; entries must be plainly renderable text.`;
    switch (findTemplateInjection(stripped)) {
      case "template_token":
        return `${fieldName} contains an entry with a literal "<settings_" template token; entries must not contain classifier template tokens.`;
      case "region_tag":
        return `${fieldName} contains an entry with a literal "cc_automode" region tag; entries must not contain classifier region markers.`;
      case null:
        break;
    }
  }
  return null;
}
//@ chunk-fta1hp2w.js:61621-61667 placement
/**
 * 匹配变体选择符（VS1–VS16 与 VS17–VS256）的正则。
 */
var VARIATION_SELECTOR_RE = /[\uFE00-\uFE0F\u{E0100}-\u{E01EF}]/gu;
//@ chunk-fta1hp2w.js:61667-61706 placement
/**
 * 去掉字符串中的变体选择符，用于规则条目比较。
 */
function stripVariationSelectors(text) {
  return text.replace(VARIATION_SELECTOR_RE, "");
}
export {
  applyAutoModeSettings,
  AutoModeSetupWriteError,
  invalidSettingsJsonMessage,
  describeSettingsWriteFailure,
  stripVariationSelectors,
  MAX_RULES_PER_DECISION_KIND,
  MAX_RULE_ENTRY_CHARS,
  validateAutoModeBlock,
  checkAutoModeEntries,
  AUTO_MODE_DECISION_KINDS,
};

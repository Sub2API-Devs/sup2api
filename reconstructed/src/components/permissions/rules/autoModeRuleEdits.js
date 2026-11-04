/**
 * components/permissions/rules/autoModeRuleEdits.ts
 *
 * 自动模式规则编辑：来源分类、校验、写入用户设置（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-p2qwpk2k.js (43)
 * attribution: placement 43
 */
import {
  autoModeConfigSchema,
  AUTO_MODE_TRUSTED_SOURCES,
  getSettingsForSource,
  getSettingsForSourceForUpkeep,
  flagAllowBesideManagedAllow,
  getSettingsFilePathForSource,
  parseSettingsFile,
  updateSettingsForSourceWithTransform,
  builtinAllowRulesAreOff,
} from "../../../utils/settings/settings.js";
import { DEFAULTS_PLACEHOLDER } from "../../../utils/permissions/autoModeRulesPrompt.js";
import { withFeatureTelemetry } from "../../../services/analytics/featureTelemetry.js";
import {
  checkAutoModeEntries,
  MAX_RULES_PER_DECISION_KIND,
  describeSettingsWriteFailure,
  stripVariationSelectors,
  MAX_RULE_ENTRY_CHARS,
} from "../../../services/autoModeSetup/applySetup.js";
import { alwaysTrueFlag } from "../../../utils/permissions/serverClassifier/arbiter.js";
import { init_react_production } from "../../../../vendor/react/cjs/react.production.js";
import { replaceLineBreaks, displayField } from "../../../utils/permissions/approvalPayloadSerialization.js";
import { getGraphemeSegmenter } from "../../../utils/intl.js";
import { bunStringWidth } from "../../../ink/stringWidth.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-p2qwpk2k.js:35210-35277 placement
function editOutcomeKey(op) {
  return (error) => `${op}_${error instanceof AutoModeRuleWriteError ? error.code : "error"}`;
}
//@ chunk-p2qwpk2k.js:35277-35332 placement
var AUTO_MODE_RULE_SECTIONS = ["allow", "soft_deny", "hard_deny", "environment"];
//@ chunk-p2qwpk2k.js:35332-35708 placement
/**
 * 从可信设置来源读取 autoMode 配置，展开为 {text, section, source, index, structure} 条目列表（跳过默认占位，环境中的 ### 行标为结构）。
 */
function collectAutoModeRuleEntries() {
  let schema = autoModeConfigSchema();
  let entries = [];
  for (let source of AUTO_MODE_TRUSTED_SOURCES) {
    let settingsForSource = getSettingsForSource(source);
    if (!settingsForSource) continue;
    let parsed = schema.safeParse(settingsForSource.autoMode);
    if (!parsed.success) continue;
    for (let section of AUTO_MODE_RULE_SECTIONS) {
      let sectionValue = parsed.data[section];
      if (!sectionValue) continue;
      sectionValue.forEach((entry, index) => {
        if (entry === DEFAULTS_PLACEHOLDER) return;
        if (section === "environment" && entry.startsWith("### ")) {
          entries.push({
            text: entry,
            section,
            source,
            index,
            structure: true,
          });
          return;
        }
        entries.push({
          text: entry,
          section,
          source,
          index,
        });
      });
    }
  }
  return entries;
}
//@ chunk-p2qwpk2k.js:35708-36050 placement
/**
 * 把整份环境文档写回用户设置：加载后若条目已变化则拒绝，解析并校验新条目后写入（带 auto_mode_rule_edit 遥测）。
 */
async function saveEnvironmentDocument(section, expectedEntries, storageV5) {
  return withFeatureTelemetry(
    "auto_mode_rule_edit",
    () =>
      writeAutoModeRuleEdit(
        "environment",
        (currentEntries) => {
          if (
            currentEntries.length !== expectedEntries.length ||
            currentEntries.some((entry, index) => entry !== expectedEntries[index])
          )
            return {
              refuse:
                "The environment changed since this screen loaded \u2014 reopen the tab to see the current entries.",
            };
          let { entries, problem } = parseEnvironmentDocument(
            section.join(`
`),
          );
          if (problem !== null)
            return {
              refuse: problem,
            };
          return entries;
        },
        storageV5,
      ),
    editOutcomeKey("add"),
  );
}
//@ chunk-p2qwpk2k.js:36050-36191 placement
/**
 * 读取用户设置中 autoMode 的 environment 条目，格式不对时返回空数组。
 */
function readUserEnvironmentEntries() {
  let settingsForSourceForUpkeep = getSettingsForSourceForUpkeep("userSettings");
  if (!settingsForSourceForUpkeep) return [];
  let parsed = autoModeConfigSchema().safeParse(settingsForSourceForUpkeep.autoMode);
  if (!parsed.success) return [];
  return parsed.data.environment ?? [];
}
//@ chunk-p2qwpk2k.js:36191-36227 placement
function ruleTextProblem(content) {
  return parseEnvironmentDocument(content).problem;
}
//@ chunk-p2qwpk2k.js:36227-36450 placement
function parseEnvironmentDocument(content) {
  let entries = dropEmptySectionHeaders(
    content
      .split(
        `
`,
      )
      .map((line) => normalizeRuleText(line))
      .filter((state) => state.length > 0),
  );
  if (entries.length === 0)
    return {
      entries,
      problem: null,
    };
  let problem = checkAutoModeEntries("environment", entries);
  if (problem !== null)
    return {
      entries,
      problem,
    };
  return {
    entries,
    problem: null,
  };
}
//@ chunk-p2qwpk2k.js:36450-37643 placement
function classifyAutoModeRuleSource() {
  if (!alwaysTrueFlag()) {
    let internalTemplateSource = {
      enabled: true,
      control: "internalTemplate",
    };
    return {
      allow: internalTemplateSource,
      soft_deny: internalTemplateSource,
      hard_deny: internalTemplateSource,
      environment: internalTemplateSource,
    };
  }
  let schema = autoModeConfigSchema();
  let disabled = new Set();
  let sourcesBySection = {};
  for (let source of AUTO_MODE_TRUSTED_SOURCES) {
    let settingsForSource = getSettingsForSource(source);
    if (!settingsForSource) continue;
    let parsed = schema.safeParse(settingsForSource.autoMode);
    if (!parsed.success) continue;
    let sectionValues = {};
    for (let section of AUTO_MODE_RULE_SECTIONS)
      if (parsed.data[section]?.length) sectionValues[section] = parsed.data[section];
    sourcesBySection[source] = sectionValues;
  }
  if (sourcesBySection.flagSettings?.allow)
    sourcesBySection.flagSettings.allow = flagAllowBesideManagedAllow(
      sourcesBySection.flagSettings.allow,
      sourcesBySection.policySettings?.allow,
    );
  let sectionControls = {};
  for (let sectionName of AUTO_MODE_RULE_SECTIONS) {
    let filtered = AUTO_MODE_TRUSTED_SOURCES.map((source) => ({
      source,
      values: sourcesBySection[source]?.[sectionName] ?? [],
    })).filter((state) => state.values.length > 0);
    if (filtered.length === 0) {
      sectionControls[sectionName] = {
        enabled: true,
        control: "empty",
      };
      continue;
    }
    if (sectionName === "environment") {
      let found = filtered.find((state) => state.values.includes(DEFAULTS_PLACEHOLDER));
      sectionControls[sectionName] = found
        ? {
            enabled: true,
            control: "otherSource",
            source: found.source,
          }
        : {
            enabled: false,
            control: "otherSource",
            source: filtered[0].source,
          };
      continue;
    }
    let userValues = sourcesBySection.userSettings?.[sectionName] ?? [];
    let found = filtered.find(
      (state) => state.source !== "userSettings" && state.values.includes(DEFAULTS_PLACEHOLDER),
    );
    let isUserDisabled = sectionName === "soft_deny" && disabled.has("userSettings");
    if (!found && isUserDisabled) {
      sectionControls[sectionName] = {
        enabled: true,
        control: "otherSource",
        source: "userSettings",
      };
      continue;
    }
    if (found) {
      sectionControls[sectionName] = {
        enabled: true,
        control: "otherSource",
        source: found.source,
      };
      continue;
    }
    if (userValues.length > 0) {
      sectionControls[sectionName] = {
        enabled: userValues.includes(DEFAULTS_PLACEHOLDER),
        control: "user",
      };
      continue;
    }
    sectionControls[sectionName] = {
      enabled: false,
      control: "otherSource",
      source: filtered[0].source,
    };
  }
  return sectionControls;
}
//@ chunk-p2qwpk2k.js:37643-38242 placement
async function AUTO_MODE_RULE_EDIT_ERRORS(section, targetSection, storageV5) {
  let isInternalTemplate = (() => false)();
  return withFeatureTelemetry(
    "auto_mode_rule_edit",
    () =>
      writeAutoModeRuleEdit(
        section,
        (current) => {
          if (!alwaysTrueFlag())
            return {
              refuse:
                "Built-in rules cannot be disabled on internal-template sessions \u2014 they are always in effect.",
            };
          if (section === "environment")
            return {
              refuse:
                "The environment is a single replaceable document \u2014 write your own version to replace the built-in default, or delete your entries to restore it.",
            };
          let filtered = current.filter((entry) => entry !== DEFAULTS_PLACEHOLDER);
          if (targetSection) return [DEFAULTS_PLACEHOLDER, ...filtered];
          if (filtered.length === 0 && !isInternalTemplate)
            return {
              refuse: "An empty section cannot hold the off state \u2014 add a rule to this section first.",
            };
          return filtered;
        },
        storageV5,
      ),
    editOutcomeKey("toggle"),
  );
}
//@ chunk-p2qwpk2k.js:38242-38371 placement
function dropEmptySectionHeaders(lines) {
  return lines.filter((line, index) => {
    if (!line.startsWith("### ")) return true;
    let next = lines[index + 1];
    return next !== undefined && !next.startsWith("### ");
  });
}
//@ chunk-p2qwpk2k.js:38371-38473 placement
class AutoModeRuleWriteError extends Error {
  code;
  constructor(code, message) {
    super(message);
    this.code = code;
    this.name = "AutoModeRuleWriteError";
  }
}
//@ chunk-p2qwpk2k.js:38473-40052 placement
/**
 * 把自动模式规则修改写入用户设置文件
 */
async function writeAutoModeRuleEdit(section, mutate, storageV5) {
  let settingsFilePathForSource = getSettingsFilePathForSource("userSettings");
  if (!settingsFilePathForSource)
    throw new AutoModeRuleWriteError(
      "no_user_settings_path",
      "Could not resolve the user settings file path.",
    );
  let { settings, errors } = parseSettingsFile(settingsFilePathForSource);
  if (settings === null && errors.length > 0)
    throw new AutoModeRuleWriteError(
      "settings_file_invalid",
      "the settings file has a validation error or cannot be read, so its auto mode rules are not in effect; fix it (Claude Code names the problem at startup), then try again.",
    );
  let isSectionMissing = false;
  let existingCount = 0;
  let settingsError = null;
  let refuseReason = null;
  let { error } = await updateSettingsForSourceWithTransform(
    "userSettings",
    (settings) => {
      isSectionMissing = false;
      existingCount = 0;
      settingsError = null;
      refuseReason = null;
      let autoMode = settings?.autoMode;
      if (Array.isArray(autoMode)) {
        settingsError =
          "the existing autoMode value in the settings file is an array \u2014 fix or remove it, then try again.";
        return null;
      }
      if (autoMode !== undefined && !autoModeConfigSchema().safeParse(autoMode).success) {
        settingsError =
          "the existing autoMode value in the settings file does not match the expected shape \u2014 fix or remove it, then try again.";
        return null;
      }
      let autoModeConfig = autoMode !== null && typeof autoMode === "object" ? autoMode : undefined;
      let sectionRules = Array.isArray(autoModeConfig?.[section])
        ? autoModeConfig[section].filter((entry) => typeof entry === "string")
        : [];
      let mutated = mutate(sectionRules);
      if (mutated !== null && !Array.isArray(mutated)) {
        refuseReason = mutated.refuse;
        return null;
      }
      let countWithoutDefaults = (state) => state.length - (state.includes(DEFAULTS_PLACEHOLDER) ? 1 : 0);
      if (
        mutated !== null &&
        countWithoutDefaults(mutated) > MAX_RULES_PER_DECISION_KIND &&
        countWithoutDefaults(mutated) > countWithoutDefaults(sectionRules)
      ) {
        existingCount = countWithoutDefaults(sectionRules);
        return null;
      }
      if (mutated === null) {
        isSectionMissing = true;
        return null;
      }
      let nextSettings = {};
      nextSettings.autoMode = {
        [section]: mutated,
      };
      return nextSettings;
    },
    undefined,
    storageV5,
  );
  if (settingsError) throw new AutoModeRuleWriteError("settings_file_invalid", settingsError);
  if (refuseReason !== null) throw new AutoModeRuleWriteError("invalid_input", refuseReason);
  if (existingCount)
    throw new AutoModeRuleWriteError(
      "invalid_input",
      `autoMode.${section} already has ${existingCount} entries; the maximum is ${MAX_RULES_PER_DECISION_KIND}.`,
    );
  if (isSectionMissing)
    throw new AutoModeRuleWriteError(
      "entry_not_found",
      "That rule changed on disk while the dialog was open \u2014 close and reopen /permissions, then try again.",
    );
  if (error) {
    let failure = describeSettingsWriteFailure(error, settingsFilePathForSource, "/permissions");
    throw new AutoModeRuleWriteError(failure.code, failure.message);
  }
}
//@ chunk-p2qwpk2k.js:40052-40080 placement
function normalizeRuleText(text) {
  return stripVariationSelectors(text);
}
//@ chunk-p2qwpk2k.js:40080-40178 placement
function validateRuleText(section, ruleText) {
  try {
    validateAutoModeRuleText(section, normalizeRuleText(ruleText));
    return null;
  } catch (error) {
    return error instanceof AutoModeRuleWriteError ? error.message : String(error);
  }
}
//@ chunk-p2qwpk2k.js:40178-40692 placement
function validateAutoModeRuleText(section, ruleText) {
  if (ruleText === DEFAULTS_PLACEHOLDER)
    throw new AutoModeRuleWriteError(
      "invalid_input",
      `"${DEFAULTS_PLACEHOLDER}" is reserved \u2014 it splices the built-in rules in and cannot be added as a rule.`,
    );
  if (ruleText.length > MAX_RULE_ENTRY_CHARS)
    throw new AutoModeRuleWriteError(
      "invalid_input",
      `the rule is ${ruleText.length} characters; the maximum is ${MAX_RULE_ENTRY_CHARS}.`,
    );
  let lines = ruleText.split(`
`);
  if (section === "environment" && lines.some((line) => line.startsWith("### ")))
    throw new AutoModeRuleWriteError(
      "invalid_input",
      "'### ' lines are environment section headers (structure, not entries) and cannot be written here.",
    );
  let problem = checkAutoModeEntries(section, lines);
  if (problem) throw new AutoModeRuleWriteError("invalid_input", problem);
}
//@ chunk-p2qwpk2k.js:40692-40774 placement
async function addAutoModeRule(section, ruleText, storageV5) {
  return withFeatureTelemetry(
    "auto_mode_rule_edit",
    () => addAutoModeRule_2(section, ruleText, storageV5),
    editOutcomeKey("add"),
  );
}
//@ chunk-p2qwpk2k.js:40774-41054 placement
/**
 * 向用户设置的某分类追加一条 auto 模式规则；分类为空时先插入默认占位以保留内置规则；环境按文档编辑时拒绝。
 */
async function addAutoModeRule_2(section, ruleText, storageV5) {
  let normalized = normalizeRuleText(ruleText);
  validateAutoModeRuleText(section, normalized);
  return writeAutoModeRuleEdit(
    section,
    (current) => {
      if (section === "environment" && alwaysTrueFlag())
        return {
          refuse: "The environment is edited as a document \u2014 use Edit environment on the Auto mode tab.",
        };
      return section !== "environment" &&
        current.length === 0 &&
        !(section === "allow" && builtinAllowRulesAreOff())
        ? [DEFAULTS_PLACEHOLDER, normalized]
        : [...current, normalized];
    },
    storageV5,
  );
}
//@ chunk-p2qwpk2k.js:41054-41147 placement
async function updateAutoModeRule(section, index, oldText, expectedOldText, storageV5) {
  return withFeatureTelemetry(
    "auto_mode_rule_edit",
    () => replaceAutoModeRule(section, index, oldText, expectedOldText, storageV5),
    editOutcomeKey("update"),
  );
}
//@ chunk-p2qwpk2k.js:41147-41505 placement
/**
 * 替换指定下标的 auto 模式规则（下标处文本须与预期一致）；默认占位与环境分节标题不可编辑。
 */
async function replaceAutoModeRule(section, index, oldText, newText, storageV5) {
  let normalized = normalizeRuleText(newText);
  validateAutoModeRuleText(section, normalized);
  return writeAutoModeRuleEdit(
    section,
    (current) => {
      if (oldText === DEFAULTS_PLACEHOLDER)
        return {
          refuse: `"${DEFAULTS_PLACEHOLDER}" is splice plumbing, not an editable rule.`,
        };
      if (section === "environment" && oldText.startsWith("### "))
        return {
          refuse:
            "'### ' lines are environment section headers (structure, not entries) and cannot be edited here.",
        };
      if (current[index] !== oldText) return null;
      let next = [...current];
      next[index] = normalized;
      return next;
    },
    storageV5,
  );
}
//@ chunk-p2qwpk2k.js:41505-41594 placement
async function deleteAutoModeRule(section, index, storageV5, expectedText) {
  return withFeatureTelemetry(
    "auto_mode_rule_edit",
    () => deleteAutoModeRule_2(section, index, storageV5, expectedText),
    editOutcomeKey("delete"),
  );
}
//@ chunk-p2qwpk2k.js:41594-41975 placement
/**
 * 删除指定下标的 auto 模式规则（下标处文本须一致）；环境删除后清理空分节标题。
 */
async function deleteAutoModeRule_2(section, index, storageV5, expectedText) {
  return writeAutoModeRuleEdit(
    section,
    (ruleLines) => {
      if (storageV5 === DEFAULTS_PLACEHOLDER)
        return {
          refuse: `"${DEFAULTS_PLACEHOLDER}" is splice plumbing, not a deletable rule.`,
        };
      if (section === "environment" && storageV5.startsWith("### "))
        return {
          refuse:
            "'### ' lines are environment section headers (structure, not entries) and cannot be deleted here.",
        };
      if (ruleLines[index] !== storageV5) return null;
      let nextRuleLines = [...ruleLines.slice(0, index), ...ruleLines.slice(index + 1)];
      return section === "environment" ? dropEmptySectionHeaders(nextRuleLines) : nextRuleLines;
    },
    expectedText,
  );
}
//@ chunk-p2qwpk2k.js:41975-41979 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-p2qwpk2k.js:41975", () => {
  init_react_production();
});
//@ chunk-p2qwpk2k.js:41979-42029 placement
function isNotEnvironmentSection(rule) {
  return rule.section !== "environment";
}
//@ chunk-p2qwpk2k.js:42029-42063 placement
function toRuleKeyPair(displayRule) {
  return [ruleKey(displayRule), displayRule];
}
//@ chunk-p2qwpk2k.js:42063-42094 placement
function ruleText(rule) {
  return rule.text;
}
//@ chunk-p2qwpk2k.js:42094-42133 placement
function normalizedRuleText(rule) {
  return replaceLineBreaks(displayField(rule).text);
}
//@ chunk-p2qwpk2k.js:42133-42183 placement
function isEnvironmentSection(rule) {
  return rule.section === "environment";
}
//@ chunk-p2qwpk2k.js:42183-42270 placement
function toDisplayRule(rule) {
  return {
    tag: rule.legacy ? "legacy" : getRuleSourceBadge(rule.source),
    text: replaceLineBreaks(displayField(rule.text).text),
  };
}
//@ chunk-p2qwpk2k.js:42270-42324 placement
function toDisplayRuleNoTag(rule) {
  return {
    tag: null,
    text: replaceLineBreaks(displayField(rule).text),
  };
}
//@ chunk-p2qwpk2k.js:42324-42357 placement
function ruleSource(rule) {
  return rule.source;
}
//@ chunk-p2qwpk2k.js:42357-42407 placement = _temp5 (1)
function isUserSettingsRule(a_0) {
  return a_0.source === "userSettings";
}
//@ chunk-p2qwpk2k.js:42407-42457 placement = _temp5 (1)
function isNonUserSettingsRule(a_0) {
  return a_0.source !== "userSettings";
}
//@ chunk-p2qwpk2k.js:42729-42795 placement
function padSectionLabel(label) {
  return label ? ` \xB7 ${label}`.padEnd(RULE_LABEL_WIDTH) : " ".repeat(RULE_LABEL_WIDTH);
}
//@ chunk-p2qwpk2k.js:42795-42828 placement
function ruleKeyValuePair(key, value) {
  return [key, value];
}
//@ chunk-p2qwpk2k.js:42962-43125 placement
function getAutoModeRuleCategoryLabel(section) {
  switch (section) {
    case "allow":
      return "Soft allow";
    case "soft_deny":
      return "Soft deny";
    case "hard_deny":
      return "Hard deny";
    case "environment":
      return "Environment";
  }
}
//@ chunk-p2qwpk2k.js:43125-43266 placement
/**
 * 返回自动模式规则分区的颜色：allow 绿、soft_deny 黄、hard_deny 红等。
 */
function getAutoModeSectionColor(section) {
  switch (section) {
    case "allow":
      return "success";
    case "soft_deny":
      return "warning";
    case "hard_deny":
      return "error";
    case "environment":
      return;
  }
}
//@ chunk-p2qwpk2k.js:43266-43426 placement
/**
 * 把规则来源（用户设置、--settings、托管设置）转换为显示文本。
 */
function describeRuleSource(source) {
  switch (source) {
    case "userSettings":
      return "user settings";
    case "flagSettings":
      return "the --settings flag";
    case "policySettings":
      return "managed settings";
  }
}
//@ chunk-p2qwpk2k.js:43426-43608 placement
/**
 * 按分区顺序、再按来源（用户、flag、托管）顺序排列规则条目。
 */
function sortRuleEntries(entries) {
  let sourceOrder = ["userSettings", "flagSettings", "policySettings"];
  return AUTO_MODE_RULE_SECTIONS.flatMap((section) => {
    let filtered = entries.filter((state) => state.section === section);
    return sourceOrder.flatMap((entry) => filtered.filter((state) => state.source === entry));
  });
}
//@ chunk-p2qwpk2k.js:43608-43691 placement
function ruleKey(rule) {
  return `${rule.section}:${rule.source}:${rule.legacy ? "legacy-" : ""}${rule.index}`;
}
//@ chunk-p2qwpk2k.js:43691-43813 placement
function getRuleSourceBadge(source) {
  switch (source) {
    case "userSettings":
      return null;
    case "flagSettings":
      return "flag";
    case "policySettings":
      return "org";
  }
}
//@ chunk-p2qwpk2k.js:43813-43823 placement
var RULE_LABEL_WIDTH = 20;
//@ chunk-p2qwpk2k.js:43823-43991 placement
function splitByWidth(text, width) {
  let lines = [];
  let current = "";
  let currentWidth = 0;
  for (let { segment } of getGraphemeSegmenter().segment(text)) {
    let line = bunStringWidth(segment);
    if (currentWidth + line > width && current.length > 0) {
      lines.push(current);
      current = "";
      currentWidth = 0;
    }
    current += segment;
    currentWidth += line;
  }
  if (current.length > 0) lines.push(current);
  return lines;
}
//@ chunk-p2qwpk2k.js:43991-44000 placement
var MAX_RULE_ROWS = 5;
export {
  getAutoModeRuleCategoryLabel,
  getRuleSourceBadge,
  getAutoModeSectionColor,
  RULE_LABEL_WIDTH,
  AUTO_MODE_RULE_SECTIONS,
  splitByWidth,
  isNotEnvironmentSection,
  toRuleKeyPair,
  sortRuleEntries,
  ruleText,
  normalizedRuleText,
  isEnvironmentSection,
  toDisplayRule,
  toDisplayRuleNoTag,
  ruleSource,
  describeRuleSource,
  isUserSettingsRule,
  isNonUserSettingsRule,
  ruleKey,
  padSectionLabel,
  MAX_RULE_ROWS,
  ruleKeyValuePair,
  validateRuleText,
  classifyAutoModeRuleSource,
  collectAutoModeRuleEntries,
  ruleTextProblem,
  saveEnvironmentDocument,
  readUserEnvironmentEntries,
  normalizeRuleText,
  updateAutoModeRule,
  addAutoModeRule,
  AUTO_MODE_RULE_EDIT_ERRORS,
  deleteAutoModeRule,
};

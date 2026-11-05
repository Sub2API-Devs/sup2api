/**
 * cli/handlers/autoMode.ts
 *
 * 并入旧版已有路径：auto 模式相关的 CLI 处理（默认规则、配置展示）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/handlers/autoMode.ts
 * pieces: chunk-exfmq47h.js (1), chunk-fmakjjce.js (13), chunk-fta1hp2w.js (2)
 * attribution: fingerprint 2, placement 11, layout 1, sole-consumer 2
 */
import { stripVTControlCharacters } from "util";
import { ANSI_ESCAPE_RE } from "../../utils/concurrentSessions.js";
import {
  getDefaultExternalAutoModeRules,
  buildDefaultExternalSystemPrompt,
} from "../../utils/permissions/yoloClassifier.js";
import {
  expandDefaultsPlaceholder,
  replacesDefaultRules,
  DEFAULTS_PLACEHOLDER,
} from "../../utils/permissions/autoModeRulesPrompt.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { RenderOnceAndExit } from "../../utils/staticRender.js";
import { Text } from "../../ink/components/Text.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import {
  logFeatureOkAsync,
  logFeatureBadAsync,
  logFeatureSadAsync,
} from "../../services/analytics/featureTelemetry.js";
import {
  getAutoModeConfig,
  getSettingsFilePathForSource,
  MAX_SETTINGS_JSON_BYTES,
  parseSettingsFile,
  updateSettingsForSourceWithTransform,
  AUTO_MODE_TRUSTED_SOURCES,
  getSettingsForSource,
} from "../../utils/settings/settings.js";
import { cliErrorAfterAnalyticsFlush } from "../exit.js";
import { readFileChecked } from "../../utils/fileRead.js";
import { isENOENT, errorMessage } from "../../utils/errors.js";
import { stripControlChars } from "../../utils/settings/writeQueues.js";
import { safeParseJSON } from "../../utils/json.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import {
  invalidSettingsJsonMessage,
  describeSettingsWriteFailure,
} from "../../services/autoModeSetup/applySetup.js";
import { writeToStdout } from "../../utils/process.js";
import { confirmYesNo } from "./util.js";
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";
import { logForDebugging } from "../../utils/debug.js";
import { plural } from "../../utils/stringUtils.js";
import { replaceControlChars } from "../../utils/resultError.js";
import { parseUserSpecifiedModel } from "../../utils/model/modelDisplay.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { sideQueryWithCounter } from "../../utils/sideQuery.js";

//@ chunk-exfmq47h.js:873753-874008 fingerprint (2.1.88 match: formatRulesForCritique, 0.557)
function formatRulesForCritique_2(status) {
  if (status.code !== 0) return;
  let changedCount = 0;
  let untrackedCount = 0;
  for (let line of status.stdout.split(`
`)) {
    let replaced = line.replace(ANSI_ESCAPE_RE, "");
    if (replaced.trim() === "" || replaced.startsWith("## ")) continue;
    if (replaced.startsWith("??")) untrackedCount++;
    else changedCount++;
  }
  return {
    isCleanTree: changedCount + untrackedCount === 0,
    changedFileCount: changedCount,
    untrackedFileCount: untrackedCount,
  };
}
//@ chunk-fta1hp2w.js:11376-11455 placement
/**
 * 取规则标签：冒号或方括号之前的部分（去尾部空白），用于 --label 过滤。
 */
function ruleLabelOf(rule) {
  let separatorIndex = rule.search(/[:[]/);
  return (separatorIndex === -1 ? rule : rule.slice(0, separatorIndex)).trimEnd();
}
//@ chunk-fta1hp2w.js:11455-11661 sole-consumer (2.1.88 match: autoModeConfigHandler, 0.842)
/**
 * 合并用户 autoMode 设置与内置默认规则（allow/soft_deny/hard_deny/environment 四段）。
 */
function autoModeConfigHandler_3(autoModeConfig) {
  let config = getDefaultExternalAutoModeRules();
  let identity = (rule) => rule;
  return {
    allow: expandDefaultsPlaceholder(autoModeConfig?.allow, config.allow, identity),
    soft_deny: expandDefaultsPlaceholder(autoModeConfig?.soft_deny, config.soft_deny, identity),
    hard_deny: expandDefaultsPlaceholder(autoModeConfig?.hard_deny, config.hard_deny, identity),
    environment: expandDefaultsPlaceholder(autoModeConfig?.environment, config.environment, identity),
  };
}
//@ chunk-fmakjjce.js:16397-16498 placement (2.1.88 match: renderAndRun, 1)
async function renderAndRun(root, element) {
  root.render(
    jsxProd_default(RenderOnceAndExit, {
      children: jsxProd_default(Text, {
        children: jsonStringify(element, null, 2),
      }),
    }),
  );
  await root.waitUntilExit();
}
//@ chunk-fmakjjce.js:16498-16589 placement
async function runAutoModeDefaults(root, filter) {
  let defaultExternalAutoModeRules = getDefaultExternalAutoModeRules();
  await renderAndRun(
    root,
    filter ? autoModeConfigHandler_2(defaultExternalAutoModeRules, filter) : defaultExternalAutoModeRules,
  );
  await logFeatureOkAsync("cli_auto_mode_defaults");
}
//@ chunk-fmakjjce.js:16589-16875 placement (2.1.88 match: autoModeConfigHandler, 0.842)
function autoModeConfigHandler_2(defaultExternalAutoModeRules, filterArg) {
  let normalizeLabel = (label) =>
    label
      .replace(/\*/g, "")
      .replace(/\[[^\]]*\]/g, "")
      .toLowerCase();
  let labelOf = (rule) => ruleLabelOf(normalizeLabel(rule));
  let needle = labelOf(filterArg) || filterArg.toLowerCase();
  let matches = (rule) => labelOf(rule).startsWith(needle);
  return {
    allow: defaultExternalAutoModeRules.allow.filter(matches),
    soft_deny: defaultExternalAutoModeRules.soft_deny.filter(matches),
    hard_deny: defaultExternalAutoModeRules.hard_deny.filter(matches),
    environment: defaultExternalAutoModeRules.environment.filter(matches),
  };
}
//@ chunk-fmakjjce.js:16875-16950 placement
/**
 * claude auto-mode config：输出生效的 autoMode 配置（用户设置覆盖默认值）为 JSON。
 */
async function autoModeConfigHandler(root) {
  await renderAndRun(root, autoModeConfigHandler_3(getAutoModeConfig()));
  await logFeatureOkAsync("cli_auto_mode_config");
}
//@ chunk-fmakjjce.js:16950-19089 placement
/**
 * claude auto-mode reset：从用户设置文件删除 autoMode 段。
 */
async function autoModeResetHandler(options, storage) {
  let settingsPath = getSettingsFilePathForSource("userSettings");
  if (!settingsPath) {
    await logFeatureBadAsync("cli_auto_mode_reset", "no_user_settings_path");
    return cliErrorAfterAnalyticsFlush("Could not resolve the user settings file path.");
  }
  let rawText = null;
  try {
    rawText = (await readFileChecked(settingsPath, MAX_SETTINGS_JSON_BYTES)).content;
  } catch (error) {
    if (!isENOENT(error)) {
      await logFeatureBadAsync("cli_auto_mode_reset", "settings_file_unreadable");
      return cliErrorAfterAnalyticsFlush(
        stripControlChars(`Could not read ${settingsPath}: ${errorMessage(error)}`),
      );
    }
  }
  let hasText = rawText !== null && rawText.trim() !== "";
  let parsed = hasText ? safeParseJSON(rawText, false) : null;
  if (hasText && !isPlainObject(parsed)) {
    await logFeatureBadAsync("cli_auto_mode_reset", "settings_file_invalid");
    return cliErrorAfterAnalyticsFlush(invalidSettingsJsonMessage(settingsPath, "reset"));
  }
  let autoMode = isPlainObject(parsed) ? parsed.autoMode : undefined;
  if (autoMode === undefined) {
    writeToStdout(`Auto mode configuration is already at defaults \u2014 ${settingsPath} has no autoMode section.
`);
    noteOtherAutoModeSources();
    await logFeatureOkAsync("cli_auto_mode_reset");
    return;
  }
  let settingsFile = parseSettingsFile(settingsPath);
  let lossyEntries =
    settingsFile.settings === null
      ? []
      : settingsFile.errors
          .filter((error) => error.severity === "warning")
          .map((error) => stripAnsiAndTrim(error.path) || "unknown entry");
  let lossySummary = countDuplicates(lossyEntries);
  if (lossyEntries.length > 0 && options.yes) {
    await logFeatureSadAsync("cli_auto_mode_reset", "lossy_write_unconfirmed");
    return cliErrorAfterAnalyticsFlush(
      `Not resetting: ${settingsPath} also contains ${pluralCount(lossyEntries.length, "entry", "entries")} this version of Claude Code cannot parse \u2014 ${lossySummary.join(", ")} \u2014 and saving the file would delete ${lossyEntries.length === 1 ? "it" : "them"} too. Fix or remove ${lossyEntries.length === 1 ? "that entry" : "those entries"} first, or run the command without --yes to review and confirm.`,
    );
  }
  writeToStdout(`This resets auto mode to the shipped defaults by removing the autoMode section from ${settingsPath}:
`);
  for (let line of describeAutoModeSectionKeys(autoMode))
    writeToStdout(`  - ${stripAnsiAndTrim(line)}
`);
  if (lossyEntries.length > 0) {
    writeToStdout(`Saving will ALSO delete ${pluralCount(lossyEntries.length, "entry", "entries")} this version of Claude Code cannot parse \u2014 the settings writer rewrites the file from its validated view:
`);
    for (let line of lossySummary)
      writeToStdout(`  - ${line}
`);
  }
  if (!options.yes) {
    if (!(await confirmYesNo("Reset auto mode configuration to defaults?"))) {
      await logFeatureSadAsync("cli_auto_mode_reset", "declined");
      return cliErrorAfterAnalyticsFlush("Aborted.");
    }
  }
  invalidateCommandNames();
  let { error } = await updateSettingsForSourceWithTransform(
    "userSettings",
    (settings) =>
      settings !== null && settings.autoMode !== undefined
        ? {
            autoMode: undefined,
          }
        : null,
    undefined,
    storage,
  );
  if (error) {
    logForDebugging(`auto-mode reset write failed: ${error.message}`, {
      level: "error",
    });
    let failure = describeSettingsWriteFailure(error, settingsPath, "reset");
    await logFeatureBadAsync("cli_auto_mode_reset", failure.code);
    return cliErrorAfterAnalyticsFlush(failure.message);
  }
  await logFeatureOkAsync("cli_auto_mode_reset");
  writeToStdout(`Auto mode configuration reset to defaults \u2014 autoMode section removed from ${settingsPath}.
Run \`claude auto-mode config\` to see the effective rules.
`);
  noteOtherAutoModeSources();
}
//@ chunk-fmakjjce.js:19089-19264 placement
function describeAutoModeSectionKeys(autoMode) {
  if (!isPlainObject(autoMode)) return ["autoMode (unrecognized value)"];
  return Object.entries(autoMode).map(([key, value]) =>
    Array.isArray(value) ? `${key} (${value.length} ${plural(value.length, "entry", "entries")})` : key,
  );
}
//@ chunk-fmakjjce.js:19264-19410 placement
function countDuplicates(values) {
  let counts = new Map();
  for (let value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].map(([value, count]) =>
    count > 1 ? `${value} (${pluralCount(count, "entry", "entries")})` : value,
  );
}
//@ chunk-fmakjjce.js:19410-19440 placement
function stripAnsiAndTrim(text) {
  return replaceControlChars(stripVTControlCharacters(text));
}
//@ chunk-fmakjjce.js:19440-19483 placement
function pluralCount(count, singular, pluralForm) {
  return `${count} ${plural(count, singular, pluralForm)}`;
}
//@ chunk-fmakjjce.js:19483-19715 placement
function noteOtherAutoModeSources() {
  for (let sourceName of AUTO_MODE_TRUSTED_SOURCES) {
    if (sourceName === "userSettings") continue;
    if (getSettingsForSource(sourceName)?.autoMode !== undefined) {
      writeToStdout(`Note: auto mode rules from managed or --settings flag sources still apply \u2014 reset only changes your user settings file.
`);
      return;
    }
  }
}
//@ chunk-fmakjjce.js:19715-20984 layout
var CRITIQUE_SYSTEM_PROMPT = `You are an expert reviewer of auto mode classifier rules for Claude Code.

Claude Code has an "auto mode" that uses an AI classifier to decide whether tool calls should be auto-approved or require user confirmation. Users can write custom rules in four categories:

- **allow**: Actions the classifier should auto-approve
- **soft_deny**: Destructive/irreversible actions the classifier should block unless clear user intent authorizes them
- **hard_deny**: Security-boundary actions the classifier should block unconditionally (user intent does not clear these)
- **environment**: Context about the user's setup that helps the classifier make decisions

Your job is to critique the user's custom rules for clarity, completeness, and potential issues. The classifier is an LLM that reads these rules as part of its system prompt.

For each rule, evaluate:
1. **Clarity**: Is the rule unambiguous? Could the classifier misinterpret it?
2. **Completeness**: Are there gaps or edge cases the rule doesn't cover?
3. **Conflicts**: Do any of the rules conflict with each other?
4. **Actionability**: Is the rule specific enough for the classifier to act on?

Be concise and constructive. Only comment on rules that could be improved. If all rules look good, say so.`;
//@ chunk-fmakjjce.js:20984-22510 fingerprint (2.1.88 match: autoModeCritiqueHandler, 0.525)
/**
 * claude auto-mode critique：把用户的 autoMode 规则发给模型点评（CRITIQUE_SYSTEM_PROMPT）。
 */
async function autoModeCritiqueHandler(root, options, credentials) {
  let config = getAutoModeConfig();
  if (!(
    replacesDefaultRules(config?.allow) ||
    replacesDefaultRules(config?.soft_deny) ||
    replacesDefaultRules(config?.hard_deny) ||
    replacesDefaultRules(config?.environment)
  )) {
    root.render(
      jsxProd_default(RenderOnceAndExit, {
        children: jsxProd_default(Text, {
          children: `No custom auto mode rules found.

Add rules to your settings file under autoMode.{allow, soft_deny, hard_deny, environment}.
Run \`claude auto-mode defaults\` to see the default rules for reference.`,
        }),
      }),
    );
    await root.waitUntilExit();
    return;
  }
  let model = options.model ? parseUserSpecifiedModel(options.model) : getMainLoopModel();
  let defaults = getDefaultExternalAutoModeRules();
  let classifierPrompt = buildDefaultExternalSystemPrompt();
  let userRulesSummary =
    formatRulesForCritique("allow", config?.allow ?? [], defaults.allow) +
    formatRulesForCritique("soft_deny", config?.soft_deny ?? [], defaults.soft_deny) +
    formatRulesForCritique("hard_deny", config?.hard_deny ?? [], defaults.hard_deny) +
    formatRulesForCritique("environment", config?.environment ?? [], defaults.environment);
  root.render(
    jsxProd_default_2(Text, {
      children: [
        "Analyzing your auto mode rules\u2026",
        `

`,
      ],
    }),
  );
  let response;
  try {
    let textBlock = (
      await sideQueryWithCounter({
        querySource: "auto_mode_critique",
        model,
        credentials,
        system: CRITIQUE_SYSTEM_PROMPT,
        skipSystemPromptPrefix: true,
        forceAttributionHeader: true,
        max_tokens: 4096,
        messages: [
          {
            role: "user",
            content:
              `Here is the full classifier system prompt that the auto mode classifier receives:

<classifier_system_prompt>
` +
              classifierPrompt +
              `
</classifier_system_prompt>

Here are the user's custom rules (each section header notes whether they replace or extend the defaults):

` +
              userRulesSummary +
              `
Please critique these custom rules.`,
          },
        ],
      })
    ).content.find((block) => block.type === "text");
    response = textBlock?.type === "text" ? textBlock.text : "No critique was generated. Please try again.";
  } catch (error) {
    await logFeatureBadAsync("cli_auto_mode_critique", "cli_auto_mode_critique_query_failed");
    root.unmount();
    return cliErrorAfterAnalyticsFlush(stripControlChars("Failed to analyze rules: " + errorMessage(error)));
  }
  root.render(
    jsxProd_default(RenderOnceAndExit, {
      children: jsxProd_default(Text, {
        children: response,
      }),
    }),
  );
  await root.waitUntilExit();
  await logFeatureOkAsync("cli_auto_mode_critique");
}
//@ chunk-fmakjjce.js:22510-22858 sole-consumer
function formatRulesForCritique(sectionName, customRules, defaultRules) {
  let filtered = customRules.filter((rule) => rule !== DEFAULTS_PLACEHOLDER);
  if (filtered.length === 0) return "";
  let addedAlongsideDefaults = customRules.length !== filtered.length;
  let joined = filtered.map((rule) => "- " + rule).join(`
`);
  let joined_2 = defaultRules.map((rule) => "- " + rule).join(`
`);
  return (
    "## " +
    sectionName +
    (addedAlongsideDefaults
      ? ` (custom rules added alongside the defaults)
`
      : ` (custom rules replacing defaults)
`) +
    `Custom:
` +
    joined +
    `

` +
    (addedAlongsideDefaults
      ? `Defaults also in effect:
`
      : `Defaults being replaced:
`) +
    joined_2 +
    `

`
  );
}
export {
  formatRulesForCritique_2,
  ruleLabelOf,
  autoModeConfigHandler,
  autoModeCritiqueHandler,
  runAutoModeDefaults,
  autoModeResetHandler,
};

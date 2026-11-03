/**
 * cli/handlers/autoMode.ts
 *
 * 并入旧版已有路径：auto 模式相关的 CLI 处理（默认规则、配置展示）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/cli/handlers/autoMode.ts
 * pieces: chunk-2a8yx6fc.js (2), chunk-aepeg2w5.js (1), chunk-t2bgh7t8.js (13)
 * attribution: placement 11, fingerprint 3, layout 1, sole-consumer 1
 */
import { stripVTControlCharacters } from "util";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { RenderOnceAndExit } from "../../utils/staticRender.js";
import { Text } from "../../ink/components/Text.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import {
  getDefaultExternalAutoModeRules,
  buildDefaultExternalSystemPrompt,
} from "../../utils/permissions/yoloClassifier.js";
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
import { or } from "../../utils/settings/commandSyncNames.js";
import { logForDebugging } from "../../utils/debug.js";
import { plural } from "../../utils/stringUtils.js";
import { replaceControlChars } from "../../utils/resultError.js";
import {
  nct,
  DEFAULTS_PLACEHOLDER,
  expandDefaultsPlaceholder,
} from "../../utils/permissions/autoModeRulesPrompt.js";
import { parseUserSpecifiedModel } from "../../utils/model/modelDisplay.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { aN } from "../../utils/sideQuery.js";
import { $Y } from "../../utils/concurrentSessions.js";

//@ chunk-t2bgh7t8.js:15206-15307 placement = renderAndRun (1)
async function renderAndRun(root, element) {
  (root.render(e(RenderOnceAndExit, { children: e(Text, { children: jsonStringify(element, null, 2) }) })),
    await root.waitUntilExit());
}
//@ chunk-t2bgh7t8.js:15307-15398 placement
async function ne(o, i) {
  let s = getDefaultExternalAutoModeRules();
  (await renderAndRun(o, i ? autoModeConfigHandler_3(s, i) : s),
    await logFeatureOkAsync("cli_auto_mode_defaults"));
}
//@ chunk-t2bgh7t8.js:15398-15684 placement = autoModeConfigHandler (0.842)
function autoModeConfigHandler_3(o, i) {
  let s = (u) =>
      u
        .replace(/\*/g, "")
        .replace(/\[[^\]]*\]/g, "")
        .toLowerCase(),
    a = (u) => ruleLabelOf(s(u)),
    g = a(i) || i.toLowerCase(),
    c = (u) => a(u).startsWith(g);
  return {
    allow: o.allow.filter(c),
    soft_deny: o.soft_deny.filter(c),
    hard_deny: o.hard_deny.filter(c),
    environment: o.environment.filter(c),
  };
}
/**
 * claude auto-mode config：输出生效的 autoMode 配置（用户设置覆盖默认值）为 JSON。
 */
//@ chunk-t2bgh7t8.js:15684-15759 placement
async function autoModeConfigHandler(o) {
  (await renderAndRun(o, autoModeConfigHandler_2(getAutoModeConfig())),
    await logFeatureOkAsync("cli_auto_mode_config"));
}
/**
 * claude auto-mode reset：从用户设置文件删除 autoMode 段。
 */
//@ chunk-t2bgh7t8.js:15759-17898 placement
async function autoModeResetHandler(o, i) {
  let s = getSettingsFilePathForSource("userSettings");
  if (!s)
    return (
      await logFeatureBadAsync("cli_auto_mode_reset", "no_user_settings_path"),
      cliErrorAfterAnalyticsFlush("Could not resolve the user settings file path.")
    );
  let a = null;
  try {
    a = (await readFileChecked(s, MAX_SETTINGS_JSON_BYTES)).content;
  } catch (error) {
    if (!isENOENT(error))
      return (
        await logFeatureBadAsync("cli_auto_mode_reset", "settings_file_unreadable"),
        cliErrorAfterAnalyticsFlush(stripControlChars(`Could not read ${s}: ${errorMessage(error)}`))
      );
  }
  let g = a !== null && a.trim() !== "",
    c = g ? safeParseJSON(a, !1) : null;
  if (g && !isPlainObject(c))
    return (
      await logFeatureBadAsync("cli_auto_mode_reset", "settings_file_invalid"),
      cliErrorAfterAnalyticsFlush(invalidSettingsJsonMessage(s, "reset"))
    );
  let u = isPlainObject(c) ? c.autoMode : void 0;
  if (u === void 0) {
    (writeToStdout(`Auto mode configuration is already at defaults \u2014 ${s} has no autoMode section.
`),
      noteOtherAutoModeSources(),
      await logFeatureOkAsync("cli_auto_mode_reset"));
    return;
  }
  let f = parseSettingsFile(s),
    m =
      f.settings === null
        ? []
        : f.errors
            .filter((error) => error.severity === "warning")
            .map((l) => stripAnsiAndTrim(l.path) || "unknown entry"),
    p = countDuplicates(m);
  if (m.length > 0 && o.yes)
    return (
      await logFeatureSadAsync("cli_auto_mode_reset", "lossy_write_unconfirmed"),
      cliErrorAfterAnalyticsFlush(
        `Not resetting: ${s} also contains ${pluralCount(m.length, "entry", "entries")} this version of Claude Code cannot parse \u2014 ${p.join(", ")} \u2014 and saving the file would delete ${m.length === 1 ? "it" : "them"} too. Fix or remove ${m.length === 1 ? "that entry" : "those entries"} first, or run the command without --yes to review and confirm.`,
      )
    );
  writeToStdout(`This resets auto mode to the shipped defaults by removing the autoMode section from ${s}:
`);
  for (let l of describeAutoModeSectionKeys(u))
    writeToStdout(`  - ${stripAnsiAndTrim(l)}
`);
  if (m.length > 0) {
    writeToStdout(`Saving will ALSO delete ${pluralCount(m.length, "entry", "entries")} this version of Claude Code cannot parse \u2014 the settings writer rewrites the file from its validated view:
`);
    for (let l of p)
      writeToStdout(`  - ${l}
`);
  }
  if (!o.yes) {
    if (!(await confirmYesNo("Reset auto mode configuration to defaults?")))
      return (
        await logFeatureSadAsync("cli_auto_mode_reset", "declined"),
        cliErrorAfterAnalyticsFlush("Aborted.")
      );
  }
  or();
  let { error: error } = await updateSettingsForSourceWithTransform(
    "userSettings",
    (l) => (l !== null && l.autoMode !== void 0 ? { autoMode: void 0 } : null),
    void 0,
    i,
  );
  if (error) {
    logForDebugging(`auto-mode reset write failed: ${error.message}`, { level: "error" });
    let l = describeSettingsWriteFailure(error, s, "reset");
    return (await logFeatureBadAsync("cli_auto_mode_reset", l.code), cliErrorAfterAnalyticsFlush(l.message));
  }
  (await logFeatureOkAsync("cli_auto_mode_reset"),
    writeToStdout(`Auto mode configuration reset to defaults \u2014 autoMode section removed from ${s}.
Run \`claude auto-mode config\` to see the effective rules.
`),
    noteOtherAutoModeSources());
}
//@ chunk-t2bgh7t8.js:17898-18073 placement
function describeAutoModeSectionKeys(o) {
  if (!isPlainObject(o)) return ["autoMode (unrecognized value)"];
  return Object.entries(o).map(([i, s]) =>
    Array.isArray(s) ? `${i} (${s.length} ${plural(s.length, "entry", "entries")})` : i,
  );
}
//@ chunk-t2bgh7t8.js:18073-18219 placement
function countDuplicates(o) {
  let i = new Map();
  for (let s of o) i.set(s, (i.get(s) ?? 0) + 1);
  return [...i.entries()].map(([s, a]) => (a > 1 ? `${s} (${pluralCount(a, "entry", "entries")})` : s));
}
//@ chunk-t2bgh7t8.js:18219-18249 placement
function stripAnsiAndTrim(o) {
  return replaceControlChars(stripVTControlCharacters(o));
}
//@ chunk-t2bgh7t8.js:18249-18292 placement
function pluralCount(o, i, s) {
  return `${o} ${plural(o, i, s)}`;
}
//@ chunk-t2bgh7t8.js:18292-18524 placement
function noteOtherAutoModeSources() {
  for (let o of AUTO_MODE_TRUSTED_SOURCES) {
    if (o === "userSettings") continue;
    if (getSettingsForSource(o)?.autoMode !== void 0) {
      writeToStdout(`Note: auto mode rules from managed or --settings flag sources still apply \u2014 reset only changes your user settings file.
`);
      return;
    }
  }
}
//@ chunk-t2bgh7t8.js:18524-19793 layout
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
/**
 * claude auto-mode critique：把用户的 autoMode 规则发给模型点评（CRITIQUE_SYSTEM_PROMPT）。
 */
//@ chunk-t2bgh7t8.js:19793-21319 fingerprint = autoModeCritiqueHandler (0.525)
async function autoModeCritiqueHandler(o, i, s) {
  let config = getAutoModeConfig();
  if (!(nct(config?.allow) || nct(config?.soft_deny) || nct(config?.hard_deny) || nct(config?.environment))) {
    (o.render(
      e(RenderOnceAndExit, {
        children: e(Text, {
          children: `No custom auto mode rules found.

Add rules to your settings file under autoMode.{allow, soft_deny, hard_deny, environment}.
Run \`claude auto-mode defaults\` to see the default rules for reference.`,
        }),
      }),
    ),
      await o.waitUntilExit());
    return;
  }
  let model = i.model ? parseUserSpecifiedModel(i.model) : getMainLoopModel(),
    defaults = getDefaultExternalAutoModeRules(),
    classifierPrompt = buildDefaultExternalSystemPrompt(),
    userRulesSummary =
      formatRulesForCritique("allow", config?.allow ?? [], defaults.allow) +
      formatRulesForCritique("soft_deny", config?.soft_deny ?? [], defaults.soft_deny) +
      formatRulesForCritique("hard_deny", config?.hard_deny ?? [], defaults.hard_deny) +
      formatRulesForCritique("environment", config?.environment ?? [], defaults.environment);
  o.render(
    r(Text, {
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
      await aN({
        querySource: "auto_mode_critique",
        model: model,
        credentials: s,
        system: CRITIQUE_SYSTEM_PROMPT,
        skipSystemPromptPrefix: !0,
        forceAttributionHeader: !0,
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
    return (
      await logFeatureBadAsync("cli_auto_mode_critique", "cli_auto_mode_critique_query_failed"),
      o.unmount(),
      cliErrorAfterAnalyticsFlush(stripControlChars("Failed to analyze rules: " + errorMessage(error)))
    );
  }
  (o.render(e(RenderOnceAndExit, { children: e(Text, { children: response }) })),
    await o.waitUntilExit(),
    await logFeatureOkAsync("cli_auto_mode_critique"));
}
//@ chunk-t2bgh7t8.js:21319-21667 sole-consumer
function formatRulesForCritique(o, i, s) {
  let filtered = i.filter((f) => f !== DEFAULTS_PLACEHOLDER);
  if (filtered.length === 0) return "";
  let g = i.length !== filtered.length,
    joined = filtered.map((f) => "- " + f).join(`
`),
    joined_2 = s.map((f) => "- " + f).join(`
`);
  return (
    "## " +
    o +
    (g
      ? ` (custom rules added alongside the defaults)
`
      : ` (custom rules replacing defaults)
`) +
    `Custom:
` +
    joined +
    `

` +
    (g
      ? `Defaults also in effect:
`
      : `Defaults being replaced:
`) +
    joined_2 +
    `

`
  );
}
/**
 * 取规则标签：冒号或方括号之前的部分（去尾部空白），用于 --label 过滤。
 */
//@ chunk-2a8yx6fc.js:11310-11389 placement
function ruleLabelOf(e) {
  let search = e.search(/[:[]/);
  return (search === -1 ? e : e.slice(0, search)).trimEnd();
}
/**
 * 合并用户 autoMode 设置与内置默认规则（allow/soft_deny/hard_deny/environment 四段）。
 */
//@ chunk-2a8yx6fc.js:11389-11595 fingerprint = autoModeConfigHandler (0.842)
function autoModeConfigHandler_2(e) {
  let config = getDefaultExternalAutoModeRules(),
    r = (o) => o;
  return {
    allow: expandDefaultsPlaceholder(e?.allow, config.allow, r),
    soft_deny: expandDefaultsPlaceholder(e?.soft_deny, config.soft_deny, r),
    hard_deny: expandDefaultsPlaceholder(e?.hard_deny, config.hard_deny, r),
    environment: expandDefaultsPlaceholder(e?.environment, config.environment, r),
  };
}
//@ chunk-aepeg2w5.js:851418-851673 fingerprint = formatRulesForCritique (0.557)
function formatRulesForCritique_2(e) {
  if (e.code !== 0) return;
  let n = 0,
    r = 0;
  for (let s of e.stdout.split(`
`)) {
    let replaced = s.replace($Y, "");
    if (replaced.trim() === "" || replaced.startsWith("## ")) continue;
    if (replaced.startsWith("??")) r++;
    else n++;
  }
  return { isCleanTree: n + r === 0, changedFileCount: n, untrackedFileCount: r };
}

export { ruleLabelOf, formatRulesForCritique_2 };

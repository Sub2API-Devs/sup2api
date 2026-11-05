/**
 * services/mcpServe/projectSettingsCalls.ts
 *
 * 2.1.316 新增：mcp serve 读取项目设置调用。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-xrwmcqkn.js (9)
 * attribution: placement 9
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  stringSchema,
  objectSchema,
  booleanSchema,
  record,
  union,
  literal,
  discriminatedUnion,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { MAX_CLEAN_IDENTIFIER_LENGTH } from "../../utils/sanitization.js";
import { getSettingsFieldSchema } from "../../utils/settings/types.js";
import { foldLookalikeChars, foldConfusableCharacters } from "../../utils/confusables.js";
import { EFFORT_LEVELS } from "../../utils/effort.js";
import { import_reject, pickAlias } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { isUndefinedAlias, isEmpty } from "./callUtils.js";
import {
  DEFAULT_2,
  clearOutputStylesCache,
  getAllOutputStylesCached,
  isBuiltInOrDefaultStyle,
} from "../../constants/outputStyles.js";
import { clearOutputStyleCaches } from "../../outputStyles/loadOutputStylesDir.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { logError } from "../../utils/log.js";
import { isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { getSettingsFilePathForSource, parseSettingsFileUncached } from "../../utils/settings/settings.js";

//@ chunk-xrwmcqkn.js:42056-44039 placement
/**
 * ReadProjectSettings 的上限常量与输出结构（只暴露 thinking、attribution、自动压缩、effort、语言、输出风格、技能清单、token 提醒等字段），以及 attribution 文本安全检查用的正则。
 */
var MAX_MODEL_SETTINGS = 64;
var MAX_MODEL_KEY_LENGTH = 256;
var MAX_SKILL_OVERRIDES = 256;
var MAX_SKILL_OVERRIDE_KEY = 256;
var outputStyleNameSchema = DoctorLazy(() =>
  stringSchema()
    .max(MAX_CLEAN_IDENTIFIER_LENGTH)
    .refine((name) => !(name in Object.prototype)),
);
var servedProjectSettingsSchema = DoctorLazy(() =>
  objectSchema({
    alwaysThinkingEnabled: getSettingsFieldSchema("alwaysThinkingEnabled").catch(undefined),
    attribution: objectSchema({
      commit: safeAttributionSchema(),
      pr: safeAttributionSchema(),
      sessionUrl: booleanSchema().optional().catch(undefined),
    })
      .optional()
      .catch(undefined),
    autoCompactEnabled: getSettingsFieldSchema("autoCompactEnabled").catch(undefined),
    autoCompactWindow: getSettingsFieldSchema("autoCompactWindow").catch(undefined),
    disableBundledSkills: getSettingsFieldSchema("disableBundledSkills").catch(undefined),
    effortLevel: getSettingsFieldSchema("effortLevel").catch(undefined),
    includeCoAuthoredBy: getSettingsFieldSchema("includeCoAuthoredBy").catch(undefined),
    includeGitInstructions: getSettingsFieldSchema("includeGitInstructions").catch(undefined),
    language: stringSchema().max(MAX_CLEAN_IDENTIFIER_LENGTH).optional().catch(undefined),
    maxEffortLevel: getSettingsFieldSchema("maxEffortLevel").catch(undefined),
    modelSettings: record(
      stringSchema().max(MAX_MODEL_KEY_LENGTH),
      objectSchema({
        autoCompactWindow: union([literal("auto"), getSettingsFieldSchema("autoCompactWindow")]),
        effortLevel: getSettingsFieldSchema("effortLevel"),
        maxEffortLevel: getSettingsFieldSchema("maxEffortLevel"),
      }),
    )
      .refine((modelSettings) => Object.keys(modelSettings).length <= MAX_MODEL_SETTINGS)
      .optional()
      .catch(undefined),
    outputStyle: outputStyleNameSchema().optional().catch(undefined),
    precomputeCompactionEnabled: getSettingsFieldSchema("precomputeCompactionEnabled").catch(undefined),
    promptSuggestionEnabled: getSettingsFieldSchema("promptSuggestionEnabled").catch(undefined),
    showThinkingSummaries: getSettingsFieldSchema("showThinkingSummaries").catch(undefined),
    skillListingBudgetFraction: getSettingsFieldSchema("skillListingBudgetFraction").catch(undefined),
    skillListingMaxDescChars: getSettingsFieldSchema("skillListingMaxDescChars").catch(undefined),
    skillOverrides: getSettingsFieldSchema("skillOverrides")
      .refine(
        (overrides) =>
          overrides === undefined ||
          (Object.keys(overrides).length <= MAX_SKILL_OVERRIDES &&
            Object.keys(overrides).every((key) => key.length <= MAX_SKILL_OVERRIDE_KEY)),
      )
      .catch(undefined),
    switchModelsOnFlag: getSettingsFieldSchema("switchModelsOnFlag").catch(undefined),
    totalTokensReminder: getSettingsFieldSchema("totalTokensReminder").catch(undefined),
    totalTokensReminderAfterUserTurn: getSettingsFieldSchema("totalTokensReminderAfterUserTurn").catch(
      undefined,
    ),
    totalTokensReminderBudget: getSettingsFieldSchema("totalTokensReminderBudget").catch(undefined),
  }),
);
var MAX_ATTRIBUTION_LENGTH = 1024;
var MAX_ATTRIBUTION_LINES = 8;
var UNSAFE_ATTRIBUTION_CHARS_RE =
  /[^\P{C}\n]|[^\P{Z} ]|[\p{Default_Ignorable_Code_Point}\u2800\ufffc\u{16fe4}\u{1d159}]/u;
var HEREDOC_MARKER_RE = /EOF|^ *[\w-]{1,64} *$/m;
var SHELL_META_CHARS_RE = /["'`$\\\u2018-\u201f]/;
var TRAILER_EMAIL_RE = /(?<=^[\w-]+: [^<>\n]+ )<[\w.+[\]-]+@[\w.-]+>$/gm;
var SYSTEM_REMINDER_WORD_RE = /systemreminder/i;
//@ chunk-xrwmcqkn.js:44039-44100 placement
/**
 * 可安全使用的 attribution 文本 schema。
 */
function safeAttributionSchema() {
  return stringSchema().refine(isSafeAttributionText).optional().catch(undefined);
}
//@ chunk-xrwmcqkn.js:44100-44364 placement
/**
 * 判断 attribution 文本可安全使用：长度/行数有限，无控制或不可见字符、引号与 shell 元字符、heredoc 标记、尖括号（允许 trailer 邮箱）、system-reminder 字样。
 */
function isSafeAttributionText(text) {
  if (text.length > MAX_ATTRIBUTION_LENGTH) return false;
  let lines = text.split(`
`);
  let normalized = text.normalize("NFKD");
  let normalized_2 = text.replace(TRAILER_EMAIL_RE, "").normalize("NFKD");
  return (
    !UNSAFE_ATTRIBUTION_CHARS_RE.test(text) &&
    !SHELL_META_CHARS_RE.test(normalized) &&
    !HEREDOC_MARKER_RE.test(normalized) &&
    !/[<>]/.test(foldLookalikeChars(normalized_2)) &&
    !SYSTEM_REMINDER_WORD_RE.test(foldConfusableCharacters(text).replace(/[^a-z]/gi, "")) &&
    lines.length <= MAX_ATTRIBUTION_LINES &&
    lines.every((line) => line.length <= MAX_CLEAN_IDENTIFIER_LENGTH)
  );
}
//@ chunk-xrwmcqkn.js:44364-44995 placement
/**
 * 限制 modelSettings 的数量与键长度：超出的条目把最严的 maxEffortLevel 并入顶层，其余只保留 autoCompactWindow/effortLevel。
 */
function capModelSettings(settingsFileUncached) {
  if (settingsFileUncached.settings === null) return settingsFileUncached;
  let { maxEffortLevel } = settingsFileUncached.settings;
  let entries = Object.entries(settingsFileUncached.settings.modelSettings ?? {});
  let capped = new Map();
  for (let [model, entry] of entries) {
    let maxEffortLevel_2 = entry?.maxEffortLevel;
    if (maxEffortLevel_2 === undefined) continue;
    if (model.length <= MAX_MODEL_KEY_LENGTH && capped.size < MAX_MODEL_SETTINGS)
      capped.set(model, {
        maxEffortLevel: maxEffortLevel_2,
      });
    else if (
      maxEffortLevel === undefined ||
      EFFORT_LEVELS.indexOf(maxEffortLevel_2) < EFFORT_LEVELS.indexOf(maxEffortLevel)
    )
      maxEffortLevel = maxEffortLevel_2;
  }
  for (let [model, entry] of entries) {
    let windowAndEffort = import_reject(
      pickAlias(entry, "autoCompactWindow", "effortLevel"),
      isUndefinedAlias,
    );
    if (
      !isEmpty(windowAndEffort) &&
      model.length <= MAX_MODEL_KEY_LENGTH &&
      (capped.has(model) || capped.size < MAX_MODEL_SETTINGS)
    )
      capped.set(model, {
        ...capped.get(model),
        ...windowAndEffort,
      });
  }
  let modelSettings = Object.fromEntries(
    entries.flatMap(([model]) => {
      let value = capped.get(model);
      return value === undefined ? [] : [[model, value]];
    }),
  );
  return {
    ...settingsFileUncached,
    settings: {
      ...settingsFileUncached.settings,
      maxEffortLevel,
      modelSettings: capped.size > 0 ? modelSettings : undefined,
    },
  };
}
//@ chunk-xrwmcqkn.js:44995-45115 placement
var MAX_OUTPUT_STYLE_PROMPT = 65536;
var servedOutputStyleSchema = DoctorLazy(() =>
  objectSchema({
    name: outputStyleNameSchema(),
    prompt: stringSchema().max(MAX_OUTPUT_STYLE_PROMPT),
    keepCodingInstructions: booleanSchema().optional(),
  })
    .optional()
    .catch(undefined),
);
//@ chunk-xrwmcqkn.js:45115-45333 placement
async function readServedOutputStyle(styleName, storageV5) {
  let name = styleName || DEFAULT_2;
  clearOutputStyleCaches();
  clearOutputStylesCache();
  let style = (
    await getAllOutputStylesCached(getOriginalCwd(), storageV5).catch((error) => {
      logError(error);
      return;
    })
  )?.[name];
  return style == null || isBuiltInOrDefaultStyle(style)
    ? undefined
    : servedOutputStyleSchema().parse({
        name,
        prompt: style.prompt,
        keepCodingInstructions: style.keepCodingInstructions,
      });
}
//@ chunk-xrwmcqkn.js:45333-45588 placement
/**
 * 读取项目设置结果的 schema。
 */
var READPROJECTSETTINGS = "ReadProjectSettings";
var projectSettingsInputSchema = DoctorLazy(() =>
  objectSchema({
    ...servedProjectSettingsSchema().shape,
    respectGitignore: booleanSchema().optional(),
  }),
);
var projectSettingsStateSchema = DoctorLazy(() =>
  discriminatedUnion("state", [
    objectSchema({
      state: literal("absent"),
    }),
    objectSchema({
      state: literal("unreadable"),
    }),
    objectSchema({
      state: literal("read"),
      settings: projectSettingsInputSchema(),
    }),
  ]),
);
var readProjectSettingsResultSchema = DoctorLazy(() =>
  objectSchema({
    project: projectSettingsStateSchema(),
    local: projectSettingsStateSchema(),
    outputStyle: servedOutputStyleSchema(),
  }),
);
//@ chunk-xrwmcqkn.js:45588-45872 placement
async function serveReadProjectSettings(input, signal, context) {
  let settingsSource = readSettingsSource("projectSettings");
  let settingsSource_2 = readSettingsSource("localSettings");
  return {
    summary: "settings read",
    output: {
      project: settingsSource,
      local: settingsSource_2,
      outputStyle: await readServedOutputStyle(
        (settingsSource_2.state === "read" ? settingsSource_2.settings.outputStyle : undefined) ??
          (settingsSource.state === "read" ? settingsSource.settings.outputStyle : undefined),
        context.toolUseContext().storageV5,
      ),
    },
  };
}
//@ chunk-xrwmcqkn.js:45872-46092 placement
function readSettingsSource(source) {
  let filePath = isSettingSourceEnabled(source) ? getSettingsFilePathForSource(source) : undefined;
  if (filePath === undefined)
    return {
      state: "absent",
    };
  let { settings, loadState } = capModelSettings(parseSettingsFileUncached(filePath));
  if (settings === null)
    return {
      state: loadState === "absent" ? "absent" : "unreadable",
    };
  return {
    state: "read",
    settings: projectSettingsInputSchema().parse(settings),
  };
}
export { READPROJECTSETTINGS, serveReadProjectSettings };

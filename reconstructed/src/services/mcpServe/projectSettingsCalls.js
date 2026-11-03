/**
 * services/mcpServe/projectSettingsCalls.ts
 *
 * 2.1.316 新增：mcp serve 读取项目设置调用。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-wy9dbk5f.js (9)
 * attribution: placement 9
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import {
  string,
  u,
  M,
  record,
  union,
  literal,
  discriminatedUnion,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { MAX_CLEAN_IDENTIFIER_LENGTH } from "../../utils/sanitization.js";
import { getSettingsFieldSchema } from "../../utils/settings/types.js";
import { foldLookalikeChars, foldConfusableCharacters } from "../../utils/confusables.js";
import { EFFORT_LEVELS } from "../../utils/effort.js";
import { wi, wS } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { isUndefinedAlias, isEmpty } from "./callUtils.js";
import {
  DEFAULT,
  clearOutputStylesCache,
  getAllOutputStylesCached,
  isBuiltInOrDefaultStyle,
} from "../../constants/outputStyles.js";
import { clearOutputStyleCaches } from "../../outputStyles/loadOutputStylesDir.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { logError } from "../../utils/log.js";
import { isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { getSettingsFilePathForSource, parseSettingsFileUncached } from "../../utils/settings/settings.js";

//@ chunk-wy9dbk5f.js:46366-48349 placement
/**
 * ReadProjectSettings 的上限常量与输出结构（只暴露 thinking、attribution、自动压缩、effort、语言、输出风格、技能清单、token 提醒等字段），以及 attribution 文本安全检查用的正则。
 */
var MAX_MODEL_SETTINGS = 64;
var MAX_MODEL_KEY_LENGTH = 256;
var MAX_SKILL_OVERRIDES = 256;
var MAX_SKILL_OVERRIDE_KEY = 256;
var outputStyleNameSchema = DoctorLazy(() =>
  string()
    .max(MAX_CLEAN_IDENTIFIER_LENGTH)
    .refine((e) => !(e in Object.prototype)),
);
var servedProjectSettingsSchema = DoctorLazy(() =>
  u({
    alwaysThinkingEnabled: getSettingsFieldSchema("alwaysThinkingEnabled").catch(undefined),
    attribution: u({
      commit: safeAttributionSchema(),
      pr: safeAttributionSchema(),
      sessionUrl: M().optional().catch(undefined),
    })
      .optional()
      .catch(undefined),
    autoCompactEnabled: getSettingsFieldSchema("autoCompactEnabled").catch(undefined),
    autoCompactWindow: getSettingsFieldSchema("autoCompactWindow").catch(undefined),
    disableBundledSkills: getSettingsFieldSchema("disableBundledSkills").catch(undefined),
    effortLevel: getSettingsFieldSchema("effortLevel").catch(undefined),
    includeCoAuthoredBy: getSettingsFieldSchema("includeCoAuthoredBy").catch(undefined),
    includeGitInstructions: getSettingsFieldSchema("includeGitInstructions").catch(undefined),
    language: string().max(MAX_CLEAN_IDENTIFIER_LENGTH).optional().catch(undefined),
    maxEffortLevel: getSettingsFieldSchema("maxEffortLevel").catch(undefined),
    modelSettings: record(
      string().max(MAX_MODEL_KEY_LENGTH),
      u({
        autoCompactWindow: union([literal("auto"), getSettingsFieldSchema("autoCompactWindow")]),
        effortLevel: getSettingsFieldSchema("effortLevel"),
        maxEffortLevel: getSettingsFieldSchema("maxEffortLevel"),
      }),
    )
      .refine((e) => Object.keys(e).length <= MAX_MODEL_SETTINGS)
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
        (e) =>
          e === undefined ||
          (Object.keys(e).length <= MAX_SKILL_OVERRIDES &&
            Object.keys(e).every((key) => key.length <= MAX_SKILL_OVERRIDE_KEY)),
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
//@ chunk-wy9dbk5f.js:48349-48410 placement
/**
 * 可安全使用的 attribution 文本 schema。
 */
function safeAttributionSchema() {
  return string().refine(isSafeAttributionText).optional().catch(undefined);
}
//@ chunk-wy9dbk5f.js:48410-48674 placement
/**
 * 判断 attribution 文本可安全使用：长度/行数有限，无控制或不可见字符、引号与 shell 元字符、heredoc 标记、尖括号（允许 trailer 邮箱）、system-reminder 字样。
 */
function isSafeAttributionText(e) {
  if (e.length > MAX_ATTRIBUTION_LENGTH) return false;
  let lines = e.split(`
`);
  let normalized = e.normalize("NFKD");
  let normalized_2 = e.replace(TRAILER_EMAIL_RE, "").normalize("NFKD");
  return (
    !UNSAFE_ATTRIBUTION_CHARS_RE.test(e) &&
    !SHELL_META_CHARS_RE.test(normalized) &&
    !HEREDOC_MARKER_RE.test(normalized) &&
    !/[<>]/.test(foldLookalikeChars(normalized_2)) &&
    !SYSTEM_REMINDER_WORD_RE.test(foldConfusableCharacters(e).replace(/[^a-z]/gi, "")) &&
    lines.length <= MAX_ATTRIBUTION_LINES &&
    lines.every((line) => line.length <= MAX_CLEAN_IDENTIFIER_LENGTH)
  );
}
//@ chunk-wy9dbk5f.js:48674-49304 placement
/**
 * 限制 modelSettings 的数量与键长度：超出的条目把最严的 maxEffortLevel 并入顶层，其余只保留 autoCompactWindow/effortLevel。
 */
function capModelSettings(settingsFileUncached) {
  if (settingsFileUncached.settings === null) return settingsFileUncached;
  let { maxEffortLevel } = settingsFileUncached.settings;
  let entries = Object.entries(settingsFileUncached.settings.modelSettings ?? {});
  let s = new Map();
  for (let [c, y] of entries) {
    let maxEffortLevel_2 = y?.maxEffortLevel;
    if (maxEffortLevel_2 === undefined) continue;
    if (c.length <= MAX_MODEL_KEY_LENGTH && s.size < MAX_MODEL_SETTINGS)
      s.set(c, {
        maxEffortLevel: maxEffortLevel_2,
      });
    else if (
      maxEffortLevel === undefined ||
      EFFORT_LEVELS.indexOf(maxEffortLevel_2) < EFFORT_LEVELS.indexOf(maxEffortLevel)
    )
      maxEffortLevel = maxEffortLevel_2;
  }
  for (let [c, y] of entries) {
    let g = wi(wS(y, "autoCompactWindow", "effortLevel"), isUndefinedAlias);
    if (!isEmpty(g) && c.length <= MAX_MODEL_KEY_LENGTH && (s.has(c) || s.size < MAX_MODEL_SETTINGS))
      s.set(c, {
        ...s.get(c),
        ...g,
      });
  }
  let a = Object.fromEntries(
    entries.flatMap(([c]) => {
      let y = s.get(c);
      return y === undefined ? [] : [[c, y]];
    }),
  );
  return {
    ...settingsFileUncached,
    settings: {
      ...settingsFileUncached.settings,
      maxEffortLevel,
      modelSettings: s.size > 0 ? a : undefined,
    },
  };
}
//@ chunk-wy9dbk5f.js:49304-49424 placement
var MAX_OUTPUT_STYLE_PROMPT = 65536;
var servedOutputStyleSchema = DoctorLazy(() =>
  u({
    name: outputStyleNameSchema(),
    prompt: string().max(MAX_OUTPUT_STYLE_PROMPT),
    keepCodingInstructions: M().optional(),
  })
    .optional()
    .catch(undefined),
);
//@ chunk-wy9dbk5f.js:49424-49642 placement
async function readServedOutputStyle(e, storageV5) {
  let n = e || DEFAULT;
  clearOutputStyleCaches();
  clearOutputStylesCache();
  let a = (
    await getAllOutputStylesCached(getOriginalCwd(), storageV5).catch((error) => {
      logError(error);
      return;
    })
  )?.[n];
  return a == null || isBuiltInOrDefaultStyle(a)
    ? undefined
    : servedOutputStyleSchema().parse({
        name: n,
        prompt: a.prompt,
        keepCodingInstructions: a.keepCodingInstructions,
      });
}
//@ chunk-wy9dbk5f.js:49642-49897 placement
/**
 * 读取项目设置结果的 schema。
 */
var READPROJECTSETTINGS = "ReadProjectSettings";
var projectSettingsInputSchema = DoctorLazy(() =>
  u({
    ...servedProjectSettingsSchema().shape,
    respectGitignore: M().optional(),
  }),
);
var projectSettingsStateSchema = DoctorLazy(() =>
  discriminatedUnion("state", [
    u({
      state: literal("absent"),
    }),
    u({
      state: literal("unreadable"),
    }),
    u({
      state: literal("read"),
      settings: projectSettingsInputSchema(),
    }),
  ]),
);
var readProjectSettingsResultSchema = DoctorLazy(() =>
  u({
    project: projectSettingsStateSchema(),
    local: projectSettingsStateSchema(),
    outputStyle: servedOutputStyleSchema(),
  }),
);
//@ chunk-wy9dbk5f.js:49897-50181 placement
async function serveReadProjectSettings(e, r, n) {
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
        n.toolUseContext().storageV5,
      ),
    },
  };
}
//@ chunk-wy9dbk5f.js:50181-50401 placement
function readSettingsSource(e) {
  let r = isSettingSourceEnabled(e) ? getSettingsFilePathForSource(e) : undefined;
  if (r === undefined)
    return {
      state: "absent",
    };
  let { settings, loadState } = capModelSettings(parseSettingsFileUncached(r));
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

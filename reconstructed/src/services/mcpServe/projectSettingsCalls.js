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
import { o, u as u_2, M, pe, Ue, T, Ir } from "../../../vendor/zod/v4/classic/schemas.js";
import { RI } from "../../utils/sanitization.js";
import { getSettingsFieldSchema } from "../../utils/settings/types.js";
import { bv, foldConfusableCharacters } from "../../utils/confusables.js";
import { EFFORT_LEVELS } from "../../utils/effort.js";
import { wi, wS } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { ot, et } from "./callUtils.js";
import {
  DEFAULT,
  clearOutputStylesCache,
  getAllOutputStylesCached,
  isBuiltInOrDefaultStyle,
} from "../../constants/outputStyles.js";
import { Awt } from "../../outputStyles/loadOutputStylesDir.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { logError } from "../../utils/log.js";
import { isSettingSourceEnabled } from "../../utils/settings/constants.js";
import { getSettingsFilePathForSource, parseSettingsFileUncached } from "../../utils/settings/settings.js";

/**
 * ReadProjectSettings 的上限常量与输出结构（只暴露 thinking、attribution、自动压缩、effort、语言、输出风格、技能清单、token 提醒等字段），以及 attribution 文本安全检查用的正则。
 */
//@ chunk-wy9dbk5f.js:46366-48349 placement
var MAX_MODEL_SETTINGS = 64,
  MAX_MODEL_KEY_LENGTH = 256,
  MAX_SKILL_OVERRIDES = 256,
  MAX_SKILL_OVERRIDE_KEY = 256,
  outputStyleNameSchema = DoctorLazy(() =>
    o()
      .max(RI)
      .refine((e) => !(e in Object.prototype)),
  ),
  servedProjectSettingsSchema = DoctorLazy(() =>
    u_2({
      alwaysThinkingEnabled: getSettingsFieldSchema("alwaysThinkingEnabled").catch(void 0),
      attribution: u_2({
        commit: Eo(),
        pr: Eo(),
        sessionUrl: M()
          .optional()
          .catch(void 0),
      })
        .optional()
        .catch(void 0),
      autoCompactEnabled: getSettingsFieldSchema("autoCompactEnabled").catch(void 0),
      autoCompactWindow: getSettingsFieldSchema("autoCompactWindow").catch(void 0),
      disableBundledSkills: getSettingsFieldSchema("disableBundledSkills").catch(void 0),
      effortLevel: getSettingsFieldSchema("effortLevel").catch(void 0),
      includeCoAuthoredBy: getSettingsFieldSchema("includeCoAuthoredBy").catch(void 0),
      includeGitInstructions: getSettingsFieldSchema("includeGitInstructions").catch(void 0),
      language: o()
        .max(RI)
        .optional()
        .catch(void 0),
      maxEffortLevel: getSettingsFieldSchema("maxEffortLevel").catch(void 0),
      modelSettings: pe(
        o().max(MAX_MODEL_KEY_LENGTH),
        u_2({
          autoCompactWindow: Ue([T("auto"), getSettingsFieldSchema("autoCompactWindow")]),
          effortLevel: getSettingsFieldSchema("effortLevel"),
          maxEffortLevel: getSettingsFieldSchema("maxEffortLevel"),
        }),
      )
        .refine((e) => Object.keys(e).length <= MAX_MODEL_SETTINGS)
        .optional()
        .catch(void 0),
      outputStyle: outputStyleNameSchema()
        .optional()
        .catch(void 0),
      precomputeCompactionEnabled: getSettingsFieldSchema("precomputeCompactionEnabled").catch(void 0),
      promptSuggestionEnabled: getSettingsFieldSchema("promptSuggestionEnabled").catch(void 0),
      showThinkingSummaries: getSettingsFieldSchema("showThinkingSummaries").catch(void 0),
      skillListingBudgetFraction: getSettingsFieldSchema("skillListingBudgetFraction").catch(void 0),
      skillListingMaxDescChars: getSettingsFieldSchema("skillListingMaxDescChars").catch(void 0),
      skillOverrides: getSettingsFieldSchema("skillOverrides")
        .refine(
          (e) =>
            e === void 0 ||
            (Object.keys(e).length <= MAX_SKILL_OVERRIDES &&
              Object.keys(e).every((r) => r.length <= MAX_SKILL_OVERRIDE_KEY)),
        )
        .catch(void 0),
      switchModelsOnFlag: getSettingsFieldSchema("switchModelsOnFlag").catch(void 0),
      totalTokensReminder: getSettingsFieldSchema("totalTokensReminder").catch(void 0),
      totalTokensReminderAfterUserTurn: getSettingsFieldSchema("totalTokensReminderAfterUserTurn").catch(
        void 0,
      ),
      totalTokensReminderBudget: getSettingsFieldSchema("totalTokensReminderBudget").catch(void 0),
    }),
  ),
  MAX_ATTRIBUTION_LENGTH = 1024,
  MAX_ATTRIBUTION_LINES = 8,
  UNSAFE_ATTRIBUTION_CHARS_RE =
    /[^\P{C}\n]|[^\P{Z} ]|[\p{Default_Ignorable_Code_Point}\u2800\ufffc\u{16fe4}\u{1d159}]/u,
  HEREDOC_MARKER_RE = /EOF|^ *[\w-]{1,64} *$/m,
  SHELL_META_CHARS_RE = /["'`$\\\u2018-\u201f]/,
  TRAILER_EMAIL_RE = /(?<=^[\w-]+: [^<>\n]+ )<[\w.+[\]-]+@[\w.-]+>$/gm,
  SYSTEM_REMINDER_WORD_RE = /systemreminder/i;
//@ chunk-wy9dbk5f.js:48349-48410 placement
function Eo() {
  return o()
    .refine(isSafeAttributionText)
    .optional()
    .catch(void 0);
}
/**
 * 判断 attribution 文本可安全使用：长度/行数有限，无控制或不可见字符、引号与 shell 元字符、heredoc 标记、尖括号（允许 trailer 邮箱）、system-reminder 字样。
 */
//@ chunk-wy9dbk5f.js:48410-48674 placement
function isSafeAttributionText(e) {
  if (e.length > MAX_ATTRIBUTION_LENGTH) return !1;
  let parts = e.split(`
`),
    normalized = e.normalize("NFKD"),
    normalized_2 = e.replace(TRAILER_EMAIL_RE, "").normalize("NFKD");
  return (
    !UNSAFE_ATTRIBUTION_CHARS_RE.test(e) &&
    !SHELL_META_CHARS_RE.test(normalized) &&
    !HEREDOC_MARKER_RE.test(normalized) &&
    !/[<>]/.test(bv(normalized_2)) &&
    !SYSTEM_REMINDER_WORD_RE.test(foldConfusableCharacters(e).replace(/[^a-z]/gi, "")) &&
    parts.length <= MAX_ATTRIBUTION_LINES &&
    parts.every((a) => a.length <= RI)
  );
}
/**
 * 限制 modelSettings 的数量与键长度：超出的条目把最严的 maxEffortLevel 并入顶层，其余只保留 autoCompactWindow/effortLevel。
 */
//@ chunk-wy9dbk5f.js:48674-49304 placement
function capModelSettings(e) {
  if (e.settings === null) return e;
  let { maxEffortLevel: maxEffortLevel } = e.settings,
    entries = Object.entries(e.settings.modelSettings ?? {}),
    s = new Map();
  for (let [c, y] of entries) {
    let g = y?.maxEffortLevel;
    if (g === void 0) continue;
    if (c.length <= MAX_MODEL_KEY_LENGTH && s.size < MAX_MODEL_SETTINGS) s.set(c, { maxEffortLevel: g });
    else if (maxEffortLevel === void 0 || EFFORT_LEVELS.indexOf(g) < EFFORT_LEVELS.indexOf(maxEffortLevel))
      maxEffortLevel = g;
  }
  for (let [c, y] of entries) {
    let g = wi(wS(y, "autoCompactWindow", "effortLevel"), ot);
    if (!et(g) && c.length <= MAX_MODEL_KEY_LENGTH && (s.has(c) || s.size < MAX_MODEL_SETTINGS))
      s.set(c, { ...s.get(c), ...g });
  }
  let fromEntries = Object.fromEntries(
    entries.flatMap(([c]) => {
      let y = s.get(c);
      return y === void 0 ? [] : [[c, y]];
    }),
  );
  return {
    ...e,
    settings: {
      ...e.settings,
      maxEffortLevel: maxEffortLevel,
      modelSettings: s.size > 0 ? fromEntries : void 0,
    },
  };
}
//@ chunk-wy9dbk5f.js:49304-49424 placement
var MAX_OUTPUT_STYLE_PROMPT = 65536,
  servedOutputStyleSchema = DoctorLazy(() =>
    u_2({
      name: outputStyleNameSchema(),
      prompt: o().max(MAX_OUTPUT_STYLE_PROMPT),
      keepCodingInstructions: M().optional(),
    })
      .optional()
      .catch(void 0),
  );
//@ chunk-wy9dbk5f.js:49424-49642 placement
async function readServedOutputStyle(e, r) {
  let n = e || DEFAULT;
  (Awt(), clearOutputStylesCache());
  let a = (
    await getAllOutputStylesCached(getOriginalCwd(), r).catch((c) => {
      logError(c);
      return;
    })
  )?.[n];
  return a == null || isBuiltInOrDefaultStyle(a)
    ? void 0
    : servedOutputStyleSchema().parse({
        name: n,
        prompt: a.prompt,
        keepCodingInstructions: a.keepCodingInstructions,
      });
}
//@ chunk-wy9dbk5f.js:49642-49897 placement
var READPROJECTSETTINGS = "ReadProjectSettings",
  Mo = DoctorLazy(() => u_2({ ...servedProjectSettingsSchema().shape, respectGitignore: M().optional() })),
  To = DoctorLazy(() =>
    Ir("state", [
      u_2({ state: T("absent") }),
      u_2({ state: T("unreadable") }),
      u_2({ state: T("read"), settings: Mo() }),
    ]),
  ),
  Yl = DoctorLazy(() => u_2({ project: To(), local: To(), outputStyle: servedOutputStyleSchema() }));
//@ chunk-wy9dbk5f.js:49897-50181 placement
async function serveReadProjectSettings(e, r, n) {
  let s = readSettingsSource("projectSettings"),
    a = readSettingsSource("localSettings");
  return {
    summary: "settings read",
    output: {
      project: s,
      local: a,
      outputStyle: await readServedOutputStyle(
        (a.state === "read" ? a.settings.outputStyle : void 0) ??
          (s.state === "read" ? s.settings.outputStyle : void 0),
        n.toolUseContext().storageV5,
      ),
    },
  };
}
//@ chunk-wy9dbk5f.js:50181-50401 placement
function readSettingsSource(e) {
  let r = isSettingSourceEnabled(e) ? getSettingsFilePathForSource(e) : void 0;
  if (r === void 0) return { state: "absent" };
  let { settings: settings, loadState: loadState } = capModelSettings(parseSettingsFileUncached(r));
  if (settings === null) return { state: loadState === "absent" ? "absent" : "unreadable" };
  return { state: "read", settings: Mo().parse(settings) };
}

export { READPROJECTSETTINGS, serveReadProjectSettings };

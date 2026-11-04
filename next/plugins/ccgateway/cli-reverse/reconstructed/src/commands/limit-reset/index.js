/**
 * commands/limit-reset/index.ts
 *
 * 2.1.316 新增：/limit-reset 命令：选择并使用额度重置券（周限额、Fable 限额）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (19)
 * attribution: placement 19
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { isClaudeAISubscriber } from "../../utils/auth.js";

//@ chunk-e6aww6q8.js:2043361-2043382 placement
var LIMIT_RESET = "limit-reset";
//@ chunk-e6aww6q8.js:2043382-2045061 placement
/**
 * /limit-reset 的界面文案模板（额度种类、剩余、到期日、确认语句）。
 */
var LIMIT_RESET_TEXT = "tengu_cedar_ember";
var CEDAR_EMBER_DEFAULT_TEXTS = {
  label: "Use a {kind} ({left} left, until {date})",
  noticeLine: `/${LIMIT_RESET} to use your {kind} \xB7 {left} left \xB7 use by {date}`,
  noticeLineMany: `/${LIMIT_RESET} \xB7 {held} \xB7 first expires {date}`,
  fableAtWeeklySuffix: "frees up only what Fable used this week",
  chooseTitle: "Which reset do you want to use?",
  keptChoiceLine: `Resets kept \xB7 run /${LIMIT_RESET} when you want one \xB7 first expires {deadline}`,
  noKindLine: "No {kind} to use",
  spentLine: "Reset used \xB7 {resets} left",
  confirmTitle: "Use a {kind}?",
  confirmBody: "Refills your {limits} now \xB7 {returns} \xB7 your weekly reset day stays {week}",
  confirmDetail: "{kindResets} left \xB7 use by {deadline}",
  confirmYes: "Yes, use my {kind}",
  confirmNo: "No, keep it",
  successLine: "{done} \xB7 your weekly reset day stays {week} \xB7 {kindResets} left",
  keptLine: `{Kind} kept \xB7 run /${LIMIT_RESET} at a limit to use it \xB7 use by {deadline}`,
  keptAnytimeLine: `{Kind} kept \xB7 run /${LIMIT_RESET} whenever you want to use it \xB7 use by {deadline}`,
  unavailableLine: "Couldn't reset your limits \xB7 nothing was used \xB7 try again in a moment",
  unconfirmedLine:
    "Couldn't confirm the reset went through \xB7 if you're still at the limit in a moment, try again",
  unconfirmedAnytimeLine: `Couldn't confirm the reset went through \xB7 check /usage in a moment \xB7 if your limits weren't refilled, run /${LIMIT_RESET} again`,
  stillUnconfirmedLine:
    "Still couldn't confirm your reset \xB7 nothing more was used \xB7 if your limits aren't refilled in a few minutes, contact support",
  earlyLine: "You still have {percent}% of your {limit} left \u2014 use your {kind} anyway?",
  earlyNoNumberLine: "You haven't reached a limit yet \u2014 use your {kind} anyway?",
};
//@ chunk-e6aww6q8.js:2045061-2045153 placement
/**
 * getCedarEmberConfig：tengu_cedar_ember（额度重置的另一形态）。
 */
function getCedarEmberConfig() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(LIMIT_RESET_TEXT, {});
  return typeof featureValue_CACHED_MAY_BE_STALE === "object" &&
    featureValue_CACHED_MAY_BE_STALE !== null &&
    !Array.isArray(featureValue_CACHED_MAY_BE_STALE)
    ? featureValue_CACHED_MAY_BE_STALE
    : {};
}
//@ chunk-e6aww6q8.js:2045153-2045194 placement
function isCedarEmberEnabled() {
  return getCedarEmberConfig().enabled === true;
}
//@ chunk-e6aww6q8.js:2045194-2045280 placement
/**
 * 读取 cedarEmber 配置里的 version（非法时按 0）。
 */
function cedarEmberVersion() {
  let version = getCedarEmberConfig().version;
  return typeof version === "number" && Number.isFinite(version) ? version : 0;
}
//@ chunk-e6aww6q8.js:2045280-2045326 placement
/**
 * cedarEmber 的 autoContinue 开关（缺省视为 true）。
 */
function cedarEmberAutoContinue() {
  return getCedarEmberConfig().autoContinue !== false;
}
//@ chunk-e6aww6q8.js:2045326-2045389 placement
function stringOrDefault(value, fallback) {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}
//@ chunk-e6aww6q8.js:2045389-2046524 placement
function getCedarEmberCopy() {
  let cedarEmberConfig = getCedarEmberConfig();
  return {
    label: stringOrDefault(cedarEmberConfig.label, CEDAR_EMBER_DEFAULT_TEXTS.label),
    noticeLine: stringOrDefault(cedarEmberConfig.noticeLine, CEDAR_EMBER_DEFAULT_TEXTS.noticeLine),
    noticeLineMany: stringOrDefault(
      cedarEmberConfig.noticeLineMany,
      CEDAR_EMBER_DEFAULT_TEXTS.noticeLineMany,
    ),
    fableAtWeeklySuffix: stringOrDefault(
      cedarEmberConfig.fableAtWeeklySuffix,
      CEDAR_EMBER_DEFAULT_TEXTS.fableAtWeeklySuffix,
    ),
    chooseTitle: stringOrDefault(cedarEmberConfig.chooseTitle, CEDAR_EMBER_DEFAULT_TEXTS.chooseTitle),
    keptChoiceLine: stringOrDefault(
      cedarEmberConfig.keptChoiceLine,
      CEDAR_EMBER_DEFAULT_TEXTS.keptChoiceLine,
    ),
    noKindLine: stringOrDefault(cedarEmberConfig.noKindLine, CEDAR_EMBER_DEFAULT_TEXTS.noKindLine),
    spentLine: stringOrDefault(cedarEmberConfig.spentLine, CEDAR_EMBER_DEFAULT_TEXTS.spentLine),
    confirmTitle: stringOrDefault(cedarEmberConfig.confirmTitle, CEDAR_EMBER_DEFAULT_TEXTS.confirmTitle),
    confirmBody: stringOrDefault(cedarEmberConfig.confirmBody, CEDAR_EMBER_DEFAULT_TEXTS.confirmBody),
    confirmDetail: stringOrDefault(cedarEmberConfig.confirmDetail, CEDAR_EMBER_DEFAULT_TEXTS.confirmDetail),
    confirmYes: stringOrDefault(cedarEmberConfig.confirmYes, CEDAR_EMBER_DEFAULT_TEXTS.confirmYes),
    confirmNo: stringOrDefault(cedarEmberConfig.confirmNo, CEDAR_EMBER_DEFAULT_TEXTS.confirmNo),
    successLine: stringOrDefault(cedarEmberConfig.successLine, CEDAR_EMBER_DEFAULT_TEXTS.successLine),
    keptLine: stringOrDefault(cedarEmberConfig.keptLine, CEDAR_EMBER_DEFAULT_TEXTS.keptLine),
    keptAnytimeLine: stringOrDefault(
      cedarEmberConfig.keptAnytimeLine,
      CEDAR_EMBER_DEFAULT_TEXTS.keptAnytimeLine,
    ),
    unavailableLine: stringOrDefault(
      cedarEmberConfig.unavailableLine,
      CEDAR_EMBER_DEFAULT_TEXTS.unavailableLine,
    ),
    unconfirmedLine: stringOrDefault(
      cedarEmberConfig.unconfirmedLine,
      CEDAR_EMBER_DEFAULT_TEXTS.unconfirmedLine,
    ),
    unconfirmedAnytimeLine: stringOrDefault(
      cedarEmberConfig.unconfirmedAnytimeLine,
      CEDAR_EMBER_DEFAULT_TEXTS.unconfirmedAnytimeLine,
    ),
    stillUnconfirmedLine: stringOrDefault(
      cedarEmberConfig.stillUnconfirmedLine,
      CEDAR_EMBER_DEFAULT_TEXTS.stillUnconfirmedLine,
    ),
    earlyLine: stringOrDefault(cedarEmberConfig.earlyLine, CEDAR_EMBER_DEFAULT_TEXTS.earlyLine),
    earlyNoNumberLine: stringOrDefault(
      cedarEmberConfig.earlyNoNumberLine,
      CEDAR_EMBER_DEFAULT_TEXTS.earlyNoNumberLine,
    ),
  };
}
//@ chunk-e6aww6q8.js:2046524-2046541 placement = SEP_WIDTH (1)
/**
 * 终端/摘要输出里多处使用的分隔串 " · "（split/join 与 trim 后拼接）。
 */
var SEP = " \xB7 ";
//@ chunk-e6aww6q8.js:2046541-2047364 placement
function formatLimitResetTemplate(template, values) {
  let templateVars = {
    "{kind}": values.kind,
    "{Kind}":
      values.kind === undefined ? undefined : values.kind.charAt(0).toUpperCase() + values.kind.slice(1),
    "{kindResets}": values.kindResets,
    "{held}": values.held,
    "{returns}": values.returns,
    "{done}": values.done,
    "{left}": values.left === undefined ? undefined : String(values.left),
    "{resets}":
      values.left === undefined
        ? undefined
        : values.left === 0
          ? "no resets"
          : values.left === 1
            ? "1 reset"
            : `${values.left} resets`,
    "{date}": values.date,
    "{deadline}": values.deadline,
    "{week}": values.week,
    "{limits}": values.limits,
    "{percent}": values.percent === undefined ? undefined : String(values.percent),
    "{limit}": values.limit,
  };
  let filtered = Object.keys(templateVars).filter(
    (key) => templateVars[key] === undefined && template.includes(key),
  );
  let filled = template;
  if (filtered.length > 0) {
    let filtered_2 = filled
      .split(SEP)
      .filter((key) => !filtered.some((placeholder) => key.includes(placeholder)));
    filled =
      filtered_2.length > 0 ? filtered_2.join(SEP) : filled.replace(/ \([^)]*\{[A-Za-z]+\}[^)]*\)/g, "");
    for (let placeholder of filtered) filled = filled.replaceAll(placeholder, "\u2026");
  }
  for (let [key, value] of Object.entries(templateVars))
    if (value !== undefined) filled = filled.replaceAll(key, value);
  return filled;
}
//@ chunk-e6aww6q8.js:2047364-2047768 placement
/**
 * 限额重置功能的默认界面文案（按钮、通知、成功/不可用等）。
 */
var TENGU_NIFTY_LEMUR = "tengu_nifty_lemur";
var LIMIT_RESET_DEFAULT_TEXTS = {
  label: "Reset your 5-hour limit now",
  noticeLine: `/${LIMIT_RESET} to reset your 5-hour limit now \xB7 uses weekly limit \xB7 1/week`,
  spentLine: "Weekly reset used \xB7 available again {date}",
  successLine: "5-hour limit reset \xB7 next reset available {date} \xB7 your weekly limit still applies",
  unavailableLine: "Couldn't reset your 5-hour limit right now \xB7 try again in a moment",
};
//@ chunk-e6aww6q8.js:2047768-2047860 placement
/**
 * getLimitResetConfig：tengu_nifty_lemur。
 */
function getLimitResetConfig() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_NIFTY_LEMUR, {});
  return typeof featureValue_CACHED_MAY_BE_STALE === "object" &&
    featureValue_CACHED_MAY_BE_STALE !== null &&
    !Array.isArray(featureValue_CACHED_MAY_BE_STALE)
    ? featureValue_CACHED_MAY_BE_STALE
    : {};
}
//@ chunk-e6aww6q8.js:2047860-2047901 placement
function isLimitResetEnabled() {
  return getLimitResetConfig().enabled === true;
}
//@ chunk-e6aww6q8.js:2047901-2047987 placement
/**
 * 读取 limitReset 配置里的 version（非法时按 0）。
 */
function limitResetConfigVersion() {
  let version = getLimitResetConfig().version;
  return typeof version === "number" && Number.isFinite(version) ? version : 0;
}
//@ chunk-e6aww6q8.js:2047987-2048033 placement
/**
 * limitReset 的 autoContinue 开关（缺省视为 true）。
 */
function limitResetAutoContinue() {
  return getLimitResetConfig().autoContinue !== false;
}
//@ chunk-e6aww6q8.js:2048033-2048096 placement
function stringOrDefault_2(value, fallback) {
  return typeof value === "string" && value.trim() !== "" ? value : fallback;
}
//@ chunk-e6aww6q8.js:2048096-2048341 placement
function getLimitResetCopy() {
  let limitResetConfig = getLimitResetConfig();
  return {
    label: stringOrDefault_2(limitResetConfig.label, LIMIT_RESET_DEFAULT_TEXTS.label),
    noticeLine: stringOrDefault_2(limitResetConfig.noticeLine, LIMIT_RESET_DEFAULT_TEXTS.noticeLine),
    spentLine: stringOrDefault_2(limitResetConfig.spentLine, LIMIT_RESET_DEFAULT_TEXTS.spentLine),
    successLine: stringOrDefault_2(limitResetConfig.successLine, LIMIT_RESET_DEFAULT_TEXTS.successLine),
    unavailableLine: stringOrDefault_2(
      limitResetConfig.unavailableLine,
      LIMIT_RESET_DEFAULT_TEXTS.unavailableLine,
    ),
  };
}
//@ chunk-e6aww6q8.js:2048341-2048560 placement
/**
 * 填充文案中的 {date} 占位：有日期则替换；没有则删去含占位的分段，全部被删时改用 later。
 */
function fillDatePlaceholder(template, values) {
  if (!template.includes("{date}")) return template;
  if (values !== undefined) return template.replaceAll("{date}", values);
  let joined = template
    .split(" \xB7 ")
    .filter((part) => !part.includes("{date}"))
    .join(" \xB7 ");
  return joined !== "" ? joined : template.replaceAll("{date}", "later");
}
//@ chunk-e6aww6q8.js:2048560-2048898 placement
/**
 * /limit-reset 命令对象（local-jsx）；描述：{return kse()?"Use an available limit reset and keep working":"Reset your 5-hour limit now and keep working; once a week, still counts towar；isEnabled: ()=>vt()&&(Tbe()||kse())；isHidden: true；实现 chunk-q8p98373.js 的 ge。
 */
var limitResetCommandDefinition = {
  type: "local-jsx",
  name: LIMIT_RESET,
  get description() {
    return isCedarEmberEnabled()
      ? "Use an available limit reset and keep working"
      : "Reset your 5-hour limit now and keep working; once a week, still counts toward your weekly limit";
  },
  get argumentHint() {
    return isCedarEmberEnabled() ? "[fable|full|5-hour|weekly]" : undefined;
  },
  isEnabled: () => isClaudeAISubscriber() && (isLimitResetEnabled() || isCedarEmberEnabled()),
  isHidden: true,
};
var limitResetCommand = limitResetCommandDefinition;
export {
  formatLimitResetTemplate,
  getCedarEmberCopy,
  getLimitResetCopy,
  limitResetCommand,
  isCedarEmberEnabled,
  cedarEmberVersion,
  LIMIT_RESET,
  cedarEmberAutoContinue,
  isLimitResetEnabled,
  fillDatePlaceholder,
  limitResetConfigVersion,
  limitResetAutoContinue,
};

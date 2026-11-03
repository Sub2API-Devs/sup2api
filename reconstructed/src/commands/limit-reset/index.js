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
/**
 * /limit-reset 的界面文案模板（额度种类、剩余、到期日、确认语句）。
 */
//@ chunk-e6aww6q8.js:2043382-2045061 placement
var LIMIT_RESET_TEXT = "tengu_cedar_ember",
  Fh = {
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
/**
 * getCedarEmberConfig：tengu_cedar_ember（额度重置的另一形态）。
 */
//@ chunk-e6aww6q8.js:2045061-2045153 placement
function getCedarEmberConfig() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE(LIMIT_RESET_TEXT, {});
  return typeof e === "object" && e !== null && !Array.isArray(e) ? e : {};
}
//@ chunk-e6aww6q8.js:2045153-2045194 placement
function isCedarEmberEnabled() {
  return getCedarEmberConfig().enabled === !0;
}
//@ chunk-e6aww6q8.js:2045194-2045280 placement
function Stt() {
  let version = getCedarEmberConfig().version;
  return typeof version === "number" && Number.isFinite(version) ? version : 0;
}
//@ chunk-e6aww6q8.js:2045280-2045326 placement
function X3s() {
  return getCedarEmberConfig().autoContinue !== !1;
}
//@ chunk-e6aww6q8.js:2045326-2045389 placement
function $h(e, n) {
  return typeof e === "string" && e.trim() !== "" ? e : n;
}
//@ chunk-e6aww6q8.js:2045389-2046524 placement
function getCedarEmberCopy() {
  let e = getCedarEmberConfig();
  return {
    label: $h(e.label, Fh.label),
    noticeLine: $h(e.noticeLine, Fh.noticeLine),
    noticeLineMany: $h(e.noticeLineMany, Fh.noticeLineMany),
    fableAtWeeklySuffix: $h(e.fableAtWeeklySuffix, Fh.fableAtWeeklySuffix),
    chooseTitle: $h(e.chooseTitle, Fh.chooseTitle),
    keptChoiceLine: $h(e.keptChoiceLine, Fh.keptChoiceLine),
    noKindLine: $h(e.noKindLine, Fh.noKindLine),
    spentLine: $h(e.spentLine, Fh.spentLine),
    confirmTitle: $h(e.confirmTitle, Fh.confirmTitle),
    confirmBody: $h(e.confirmBody, Fh.confirmBody),
    confirmDetail: $h(e.confirmDetail, Fh.confirmDetail),
    confirmYes: $h(e.confirmYes, Fh.confirmYes),
    confirmNo: $h(e.confirmNo, Fh.confirmNo),
    successLine: $h(e.successLine, Fh.successLine),
    keptLine: $h(e.keptLine, Fh.keptLine),
    keptAnytimeLine: $h(e.keptAnytimeLine, Fh.keptAnytimeLine),
    unavailableLine: $h(e.unavailableLine, Fh.unavailableLine),
    unconfirmedLine: $h(e.unconfirmedLine, Fh.unconfirmedLine),
    unconfirmedAnytimeLine: $h(e.unconfirmedAnytimeLine, Fh.unconfirmedAnytimeLine),
    stillUnconfirmedLine: $h(e.stillUnconfirmedLine, Fh.stillUnconfirmedLine),
    earlyLine: $h(e.earlyLine, Fh.earlyLine),
    earlyNoNumberLine: $h(e.earlyNoNumberLine, Fh.earlyNoNumberLine),
  };
}
//@ chunk-e6aww6q8.js:2046524-2046541 placement = SEP_WIDTH (1)
var SEP_WIDTH = " \xB7 ";
//@ chunk-e6aww6q8.js:2046541-2047364 placement
function formatLimitResetTemplate(e, n) {
  let r = {
      "{kind}": n.kind,
      "{Kind}": n.kind === void 0 ? void 0 : n.kind.charAt(0).toUpperCase() + n.kind.slice(1),
      "{kindResets}": n.kindResets,
      "{held}": n.held,
      "{returns}": n.returns,
      "{done}": n.done,
      "{left}": n.left === void 0 ? void 0 : String(n.left),
      "{resets}":
        n.left === void 0
          ? void 0
          : n.left === 0
            ? "no resets"
            : n.left === 1
              ? "1 reset"
              : `${n.left} resets`,
      "{date}": n.date,
      "{deadline}": n.deadline,
      "{week}": n.week,
      "{limits}": n.limits,
      "{percent}": n.percent === void 0 ? void 0 : String(n.percent),
      "{limit}": n.limit,
    },
    filtered = Object.keys(r).filter((y) => r[y] === void 0 && e.includes(y)),
    h = e;
  if (filtered.length > 0) {
    let filtered_2 = h.split(SEP_WIDTH).filter((S) => !filtered.some((w) => S.includes(w)));
    h = filtered_2.length > 0 ? filtered_2.join(SEP_WIDTH) : h.replace(/ \([^)]*\{[A-Za-z]+\}[^)]*\)/g, "");
    for (let S of filtered) h = h.replaceAll(S, "\u2026");
  }
  for (let [y, S] of Object.entries(r)) if (S !== void 0) h = h.replaceAll(y, S);
  return h;
}
//@ chunk-e6aww6q8.js:2047364-2047768 placement
var TENGU_NIFTY_LEMUR = "tengu_nifty_lemur",
  yZ = {
    label: "Reset your 5-hour limit now",
    noticeLine: `/${LIMIT_RESET} to reset your 5-hour limit now \xB7 uses weekly limit \xB7 1/week`,
    spentLine: "Weekly reset used \xB7 available again {date}",
    successLine: "5-hour limit reset \xB7 next reset available {date} \xB7 your weekly limit still applies",
    unavailableLine: "Couldn't reset your 5-hour limit right now \xB7 try again in a moment",
  };
/**
 * getLimitResetConfig：tengu_nifty_lemur。
 */
//@ chunk-e6aww6q8.js:2047768-2047860 placement
function getLimitResetConfig() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_NIFTY_LEMUR, {});
  return typeof e === "object" && e !== null && !Array.isArray(e) ? e : {};
}
//@ chunk-e6aww6q8.js:2047860-2047901 placement
function isLimitResetEnabled() {
  return getLimitResetConfig().enabled === !0;
}
//@ chunk-e6aww6q8.js:2047901-2047987 placement
function oJn() {
  let version = getLimitResetConfig().version;
  return typeof version === "number" && Number.isFinite(version) ? version : 0;
}
//@ chunk-e6aww6q8.js:2047987-2048033 placement
function J3s() {
  return getLimitResetConfig().autoContinue !== !1;
}
//@ chunk-e6aww6q8.js:2048033-2048096 placement
function _Z(e, n) {
  return typeof e === "string" && e.trim() !== "" ? e : n;
}
//@ chunk-e6aww6q8.js:2048096-2048341 placement
function getLimitResetCopy() {
  let e = getLimitResetConfig();
  return {
    label: _Z(e.label, yZ.label),
    noticeLine: _Z(e.noticeLine, yZ.noticeLine),
    spentLine: _Z(e.spentLine, yZ.spentLine),
    successLine: _Z(e.successLine, yZ.successLine),
    unavailableLine: _Z(e.unavailableLine, yZ.unavailableLine),
  };
}
/**
 * 填充文案中的 {date} 占位：有日期则替换；没有则删去含占位的分段，全部被删时改用 later。
 */
//@ chunk-e6aww6q8.js:2048341-2048560 placement
function fillDatePlaceholder(e, n) {
  if (!e.includes("{date}")) return e;
  if (n !== void 0) return e.replaceAll("{date}", n);
  let joined = e
    .split(" \xB7 ")
    .filter((s) => !s.includes("{date}"))
    .join(" \xB7 ");
  return joined !== "" ? joined : e.replaceAll("{date}", "later");
}
/**
 * /limit-reset 命令对象（local-jsx）；描述：{return kse()?"Use an available limit reset and keep working":"Reset your 5-hour limit now and keep working; once a week, still counts towar；isEnabled: ()=>vt()&&(Tbe()||kse())；isHidden: true；实现 chunk-q8p98373.js 的 ge。
 */
//@ chunk-e6aww6q8.js:2048560-2048898 placement
var limitResetCommandDefinition = {
    type: "local-jsx",
    name: LIMIT_RESET,
    get description() {
      return isCedarEmberEnabled()
        ? "Use an available limit reset and keep working"
        : "Reset your 5-hour limit now and keep working; once a week, still counts toward your weekly limit";
    },
    get argumentHint() {
      return isCedarEmberEnabled() ? "[fable|full|5-hour|weekly]" : void 0;
    },
    isEnabled: () => isClaudeAISubscriber() && (isLimitResetEnabled() || isCedarEmberEnabled()),
    isHidden: !0,
  },
  limitResetCommand = limitResetCommandDefinition;

export {
  formatLimitResetTemplate,
  getCedarEmberCopy,
  getLimitResetCopy,
  limitResetCommand,
  isCedarEmberEnabled,
  Stt,
  LIMIT_RESET,
  X3s,
  isLimitResetEnabled,
  fillDatePlaceholder,
  oJn,
  J3s,
};

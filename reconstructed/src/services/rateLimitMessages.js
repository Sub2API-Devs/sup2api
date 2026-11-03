/**
 * services/rateLimitMessages.ts
 *
 * 订阅限额的面向用户文案：被拒/预警/正在用 overage 时的提示文本、按订阅类型的升级或换模型建议。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/rateLimitMessages.ts
 * pieces: chunk-89vj35pq.js (6), chunk-dcmhvw5a.js (3), chunk-w5ndchqs.js (15)
 * attribution: placement 9, fingerprint 6, callgraph-fingerprint 3, layout 6
 */
import { xk, utilizationPercent, planWindowPercent } from "../utils/format.js";
import {
  RATE_LIMIT_DISPLAY_NAMES,
  HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE,
  isSubagentWrapUpNoteDue,
  wrapUpOnMainTurnStart,
  takeWrapUpTurnNote,
  markWrapUpStartNotePlaced,
  getWrapUpZone,
  consumeNearLimitWrapUpHint,
} from "./claudeAiLimits.js";
import { lD, isConsumerPlan, Gpe, L8r, D2 } from "../utils/planTiers.js";
import { formatRateLimitMessage } from "../entrypoints/sdk/coreSchemas.js";
import { NEAR_LIMIT_UTILIZATION, Z, overageIncludedModels } from "./api/usage.js";
import {
  getSubscriptionType,
  getOauthAccountInfo,
  isExtraUsageAllowed,
  getRateLimitTier,
  getUsageCreditsCommand,
} from "../utils/auth.js";
import {
  renderUsageCreditsOnlyModelName,
  parseUserSpecifiedModel,
  isUsageCreditsOnlyModel,
  getPublicModelDisplayName,
} from "../utils/model/modelDisplay.js";
import { modelSupportsEffort, getEffortLevelOrHigh } from "../utils/effort.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "./analytics/growthbook.js";
import { getCanonicalName } from "../utils/model/canonicalModelName.js";
import {
  bhn,
  formatWrapUpText,
  WRAP_UP_TEXT_FLAG,
  parseWrapUpMode,
  TENGU_LANTERN_WICK_MODE,
  GRACE_CHECKPOINT_NOTE,
  USAGE_LIMIT_WRAP_UP_NOTE,
  TENGU_VELLUM_ANCHOR,
  yJs,
  NOTICE,
  hJs,
} from "./usageLimitGrace.js";
import { sanitizeAttributeValue } from "../utils/sanitization.js";
import { logFeatureSad, logFeatureOk } from "./analytics/featureTelemetry.js";
import { isSessionTaskTurn } from "../utils/messages/promptOrigin.js";
import { createUserMessage, createSystemMessage } from "../utils/messages.js";
import { getIsNonInteractiveSession, getSessionId } from "../bootstrap/state.js";
import { logError } from "../utils/log.js";

//@ chunk-w5ndchqs.js:20352-20707 placement
function rateLimitWindowLabel(e) {
  let n = e.resetsAt ? xk(e.resetsAt, !0) : void 0;
  if (!n) return null;
  switch (e.rateLimitType) {
    case "five_hour":
    case "seven_day":
    case "seven_day_opus":
      return { limitName: RATE_LIMIT_DISPLAY_NAMES[e.rateLimitType], resetTime: n };
    case "seven_day_sonnet":
      return { limitName: getWeeklyModelLimitName(), resetTime: n };
    case "seven_day_overage_included":
    case "overage":
    case void 0:
      return null;
    default:
      return null;
  }
}
/**
 * 由额度状态得到 {message, severity}：overage 预警、被拒（错误）、allowed_warning（团队/企业已开 extra usage 时不提示）。
 */
//@ chunk-w5ndchqs.js:20707-21273 fingerprint = getRateLimitMessage (0.621)
function getRateLimitMessage(e, n, r) {
  if (e.isUsingOverage) {
    if (e.overageStatus === "allowed_warning") {
      let s = lD() ? "usage limit" : "usage credit limit",
        d = toUtilizationPercent(r);
      return {
        message: d ? `Over ${d}% of your ${s} used` : `You're close to your ${s}`,
        severity: "warning",
      };
    }
    return null;
  }
  if (e.status === "rejected") return { message: formatRateLimitMessage(e, n), severity: "error" };
  if (e.status === "allowed_warning") {
    if (e.utilization !== void 0 && e.utilization < NEAR_LIMIT_UTILIZATION) return null;
    let subscriptionType = getSubscriptionType(),
      isTeamOrEnterprise = subscriptionType === "team" || subscriptionType === "enterprise",
      hasExtraUsageEnabled = getOauthAccountInfo()?.hasExtraUsageEnabled === !0;
    if (isTeamOrEnterprise && hasExtraUsageEnabled && !isConsumerPlan()) return null;
    let text = getEarlyWarningText(e);
    if (text) return { message: text, severity: "warning" };
  }
  return null;
}
/**
 * 只取错误级文案。
 */
//@ chunk-w5ndchqs.js:21273-21361 callgraph-fingerprint = getRateLimitErrorMessage (1)
function getRateLimitErrorMessage(limits, model) {
  let message = getRateLimitMessage(limits, model);
  if (message && message.severity === "error") return message.message;
  return null;
}
/**
 * 只取警告级文案。
 */
//@ chunk-w5ndchqs.js:21361-21455 callgraph-fingerprint = getRateLimitWarning (1)
function getRateLimitWarning(e, n, r) {
  let s = getRateLimitMessage(e, n, r);
  if (s && s.severity === "warning") return s.message;
  return null;
}
/**
 * 被拒时的"You've hit your <限额>"文案（按限额类型）。
 */
//@ chunk-w5ndchqs.js:24419-24734 callgraph-fingerprint = getLimitReachedText (0.332)
function getLimitReachedText(e, n, r) {
  switch (e.rateLimitType) {
    case "seven_day_sonnet":
      return formatLimitReachedText(getWeeklyModelLimitName(), n, r, { progressSavedSuffix: Z() });
    case "five_hour":
    case "seven_day":
    case "seven_day_opus":
      return formatLimitReachedText(RATE_LIMIT_DISPLAY_NAMES[e.rateLimitType], n, r, {
        progressSavedSuffix: Z(),
      });
    case "seven_day_overage_included":
      return formatLimitReachedText(RATE_LIMIT_DISPLAY_NAMES[e.rateLimitType], n, r);
    default:
      return null;
  }
}
/**
 * 利用率转 1–99 的整数百分比。
 */
//@ chunk-w5ndchqs.js:24734-24857 layout
function toUtilizationPercent(e) {
  if (e === void 0 || !Number.isFinite(e) || e <= 0 || e >= 1) return;
  return Math.min(99, Math.floor(Math.round(e * 1e4) / 100));
}
/**
 * 预警文案："You've used N% of your <限额>" 等。
 */
//@ chunk-w5ndchqs.js:24857-25556 fingerprint = getEarlyWarningText (0.526)
function getEarlyWarningText(limits) {
  let n = limits.utilization
      ? Math.floor(
          limits.rateLimitType === "overage"
            ? utilizationPercent(limits.utilization)
            : planWindowPercent(limits.utilization),
        )
      : void 0,
    limitName = null;
  switch (limits.rateLimitType) {
    case "five_hour":
    case "seven_day":
    case "seven_day_opus":
    case "seven_day_sonnet":
    case "seven_day_overage_included":
      limitName = RATE_LIMIT_DISPLAY_NAMES[limits.rateLimitType];
      break;
    case "overage":
      if (lD()) limitName = n ? "usage" : "usage limit";
      else limitName = n ? "usage credits" : "usage credit limit";
      break;
    case void 0:
      return null;
  }
  let s = limits.rateLimitType === "overage" && lD(),
    d = limits.resetsAt && !s ? xk(limits.resetsAt, !0) : void 0,
    m = getWarningUpsellText(limits.rateLimitType),
    h = n ? void 0 : toUtilizationPercent(limits.surpassedThreshold);
  return [
    n
      ? `You've used ${n}% of your ${limitName}`
      : h
        ? `Over ${h}% of your ${limitName} used`
        : `Approaching ${limitName}`,
    d && `resets ${d}`,
    m,
  ]
    .filter(Boolean)
    .join(" \xB7 ");
}
/**
 * 按订阅类型的升级/购买提示。
 */
//@ chunk-w5ndchqs.js:25556-26197 fingerprint = getWarningUpsellText (0.61)
function getWarningUpsellText(rateLimitType) {
  let subscriptionType = getSubscriptionType(),
    hasExtraUsageEnabled = getOauthAccountInfo()?.hasExtraUsageEnabled === !0,
    s = isConsumerPlan();
  if (subscriptionType === "team" || subscriptionType === "enterprise") {
    if (!hasExtraUsageEnabled && isExtraUsageAllowed())
      return s
        ? "Run /usage-credits to turn on extra usage for your org"
        : "Run /usage-credits to ask your admin for more";
    if (hasExtraUsageEnabled && rateLimitType === "overage") {
      if (isExtraUsageAllowed())
        return s ? "Run /usage-credits to raise the cap" : "Run /usage-credits to ask your admin for more";
      return s ? `Raise the cap at ${HTTPS_CLAUDE_AI_ADMIN_SETTINGS_USAGE}` : "Ask your admin for more";
    }
    return null;
  }
  if (subscriptionType === "max" && getRateLimitTier() === "default_claude_max_20x")
    return !hasExtraUsageEnabled && isExtraUsageAllowed() ? "/usage-credits to keep using Claude Code" : null;
  if (
    rateLimitType === "five_hour" &&
    (subscriptionType === "pro" || subscriptionType === "max") &&
    !hasExtraUsageEnabled &&
    Gpe()
  )
    return "/upgrade to keep using Claude Code";
  return null;
}
/**
 * 需要用量信用的模型受限时提示购买或换模型。
 */
//@ chunk-w5ndchqs.js:26197-26420 layout
function getModelSwitchUpsell(e) {
  if (e === null || !isCreditsOnlyModelLimit(e)) return null;
  if (!isExtraUsageAllowed()) return "Switch models to keep working.";
  if (!isConsumerPlan()) return "Switch models to keep working.";
  return `Buy more to keep using ${renderUsageCreditsOnlyModelName(parseUserSpecifiedModel(e))}, or switch models to keep working.`;
}
/**
 * 模型受"仅用量信用"限制（可用、需信用、未豁免）。
 */
//@ chunk-w5ndchqs.js:26420-26497 layout
function isCreditsOnlyModelLimit(e) {
  if (e === null) return !1;
  let n = parseUserSpecifiedModel(e);
  return isUsageCreditsOnlyModel(n) && L8r(n) && !D2();
}
/**
 * Pro 用户周限额预警时的换模型建议（如 /model opus 更多余量）。
 */
//@ chunk-w5ndchqs.js:26497-26898 layout
function getProRunwayTip(e, n, r) {
  if (getSubscriptionType() !== "pro") return null;
  if (e.rateLimitType !== "seven_day") return null;
  if (n.includes("fable")) return { lever: "model", text: "try /model opus \xB7 more runway" };
  if (n.includes("opus")) return { lever: "model", text: "try /model sonnet \xB7 ~2\xD7 runway" };
  if (!modelSupportsEffort(n)) return null;
  let s = getEffortLevelOrHigh(n, r);
  if (s === "high" || s === "xhigh" || s === "max") return { lever: "effort", text: "try /effort medium" };
  return null;
}
/**
 * 正在使用 overage 时的提示文案。
 */
//@ chunk-w5ndchqs.js:26898-27538 fingerprint = getUsingOverageText (0.407)
function getUsingOverageText(e, n) {
  let r = e.resetsAt ? xk(e.resetsAt, !0) : "",
    limitName = "";
  switch (e.rateLimitType) {
    case "five_hour":
    case "seven_day":
    case "seven_day_opus":
      limitName = RATE_LIMIT_DISPLAY_NAMES[e.rateLimitType];
      break;
    case "seven_day_sonnet":
      limitName = getWeeklyModelLimitName();
      break;
    case "seven_day_overage_included":
    case "overage":
    case void 0:
      break;
  }
  let subscriptionType = lD();
  if (!limitName && !subscriptionType && n) {
    let y = getPublicModelDisplayName(parseUserSpecifiedModel(n));
    if (y && overageIncludedModels().some((w) => w.toLowerCase() === y.toLowerCase())) {
      let w = r ? ` \xB7 Your ${y} limit resets ${r}` : "";
      return `Now using usage credits for ${y}${w}`;
    }
  }
  let m = subscriptionType ? "your usage allocation" : "usage credits";
  if (!limitName) return subscriptionType ? `Now using ${m}` : "Now using credits";
  let h = r && !subscriptionType ? ` \xB7 Your ${limitName} resets ${r}` : "";
  return `You're now using ${m}${h}`;
}
/**
 * Pro/企业显示 weekly limit，否则 Sonnet limit。
 */
//@ chunk-w5ndchqs.js:27538-27634 layout
function getWeeklyModelLimitName() {
  let e = getSubscriptionType();
  return e === "pro" || e === "enterprise"
    ? RATE_LIMIT_DISPLAY_NAMES.seven_day
    : RATE_LIMIT_DISPLAY_NAMES.seven_day_sonnet;
}
/**
 * " · run <命令> to ask your admin for a higher limit"。
 */
//@ chunk-w5ndchqs.js:27634-27765 layout
function getAskAdminSuffix() {
  let e = getUsageCreditsCommand();
  return e
    ? ` \xB7 run ${e} to ask your admin for a higher limit`
    : " \xB7 ask your admin for a higher limit";
}
/**
 * "You've hit your <限额><重置时间>[ · progress saved]"。
 */
//@ chunk-w5ndchqs.js:27765-27877 fingerprint = formatLimitReachedText (0.403)
function formatLimitReachedText(e, n, r, s) {
  let d = s?.progressSavedSuffix ? " \xB7 progress saved" : "";
  return `You've hit your ${e}${n}${d}`;
}
//@ chunk-89vj35pq.js:520-732 placement
var TENGU_LANTERN_WICK_RELEASE = "tengu_lantern_wick_release",
  TENGU_LANTERN_WICK_BRAID = "tengu_lantern_wick_braid",
  TENGU_LANTERN_WICK_BRAID_TEXT = "tengu_lantern_wick_braid_text",
  TENGU_LANTERN_WICK_BRAID_RELEASE = "tengu_lantern_wick_braid_release",
  TENGU_LANTERN_WICK_TEXT_BY_MODEL = "tengu_lantern_wick_text_by_model",
  TENGU_LANTERN_WICK_RELEASE_BY_MODEL = "tengu_lantern_wick_release_by_model";
//@ chunk-89vj35pq.js:732-775 placement
function P(t, n, e) {
  return servedTextForModel(t, e) ?? getFeatureValue_CACHED_MAY_BE_STALE(n, "");
}
/**
 * 从开关配置中按模型名、规范名或 default 取服务端下发的文字。
 */
//@ chunk-89vj35pq.js:775-927 placement
function servedTextForModel(t, n) {
  let e = getFeatureValue_CACHED_MAY_BE_STALE(t, {});
  if (typeof e !== "object" || e === null) return;
  let u = e;
  return [n, getCanonicalName(n), "default"].map((s) => u[s]).find((s) => typeof s === "string");
}
/**
 * 把服务端下发的文字清洗后加方括号，清洗失败或被改动时记遥测。
 */
//@ chunk-89vj35pq.js:927-1240 placement
function bracketServedText(t) {
  if (bhn()) {
    let e = sanitizeAttributeValue(t);
    if (e === null) {
      if (typeof t === "string" && t.trim() !== "")
        logFeatureSad("usage_limit_served_text_rejected", "release_text");
      return "";
    }
    if (typeof t === "string" && e !== t.trim())
      logFeatureSad("usage_limit_served_text_altered", "release_text");
    return `[${e}]`;
  }
  let n = typeof t === "string" ? t.trim() : "";
  return n ? `[${n}]` : "";
}
//@ chunk-89vj35pq.js:1240-1374 placement
function lastUsageLimitNote(t) {
  for (let n = t.length - 1; n >= 0; n--) {
    let e = t[n];
    if (e?.type === "user" && e.usageLimitNote !== void 0) return e.usageLimitNote;
  }
  return;
}
//@ chunk-89vj35pq.js:1374-3036 placement
function* usageLimitNotices(
  t,
  {
    resumeActive: resumeActive,
    isMainLoop: isMainLoop,
    querySource: querySource,
    depth: depth,
    model: model,
    toolUseContext: toolUseContext,
    now: now,
    uuid: uuid,
  },
) {
  let { agentContext: agentContext } = toolUseContext,
    C =
      !isMainLoop &&
      querySource.startsWith("agent:") &&
      agentContext.agentType !== "teammate" &&
      !(agentContext.agentType === "subagent" && agentContext.workflowRunId);
  if (resumeActive || !(isMainLoop || C)) return t;
  let i = [];
  try {
    let a = isMainLoop && depth === 0 && isSessionTaskTurn(t),
      E = a && isSubagentWrapUpNoteDue();
    if (isMainLoop && depth === 0 && !E) wrapUpOnMainTurnStart();
    let R = !1,
      U = !1;
    if (isMainLoop && (depth > 0 || E)) {
      if (((U = takeWrapUpTurnNote()), E && !U)) {
        let r = lastUsageLimitNote(t);
        if (r !== "wrap_up" && r !== "near_limit") wrapUpOnMainTurnStart();
      }
    }
    if (
      isMainLoop
        ? U
        : isSubagentWrapUpNoteDue() &&
          getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LANTERN_WICK_BRAID, !1) === !0 &&
          lastUsageLimitNote(t) !== "wrap_up"
    ) {
      let r =
          (isMainLoop
            ? null
            : formatWrapUpText(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LANTERN_WICK_BRAID_TEXT, ""))) ??
          formatWrapUpText(P(TENGU_LANTERN_WICK_TEXT_BY_MODEL, WRAP_UP_TEXT_FLAG, model)),
        o =
          r !== null
            ? "custom"
            : parseWrapUpMode(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LANTERN_WICK_MODE, "off"));
      if (o !== "off") {
        if (
          (i.push(
            createUserMessage({
              content: r ?? (o === "next-steps" ? GRACE_CHECKPOINT_NOTE : USAGE_LIMIT_WRAP_UP_NOTE),
              isMeta: !0,
              turnCompanion: !0,
              usageLimitNote: "wrap_up",
              now: now,
              uuidFn: uuid,
            }),
          ),
          logFeatureOk(isMainLoop ? "usage_limit_grace_wrapup" : "usage_limit_grace_wrapup_subagent", {
            next_steps: o === "next-steps",
            custom: o === "custom",
          }),
          (R = !0),
          isMainLoop)
        )
          markWrapUpStartNotePlaced();
      }
    }
    let T = !isMainLoop || a ? getWrapUpZone() : null,
      G = T !== null && T.extraUsageStatus === void 0,
      N;
    if (isMainLoop) {
      let r = depth === 0 ? lastUsageLimitNote(t) : void 0;
      N = !G && (r === "wrap_up" || r === "near_limit");
    } else
      N =
        !G &&
        lastUsageLimitNote(t) === "wrap_up" &&
        getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LANTERN_WICK_BRAID, !1) === !0;
    if (N) {
      let r =
        (isMainLoop
          ? ""
          : bracketServedText(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LANTERN_WICK_BRAID_RELEASE, ""))) ||
        bracketServedText(P(TENGU_LANTERN_WICK_RELEASE_BY_MODEL, TENGU_LANTERN_WICK_RELEASE, model));
      if (r)
        (i.push(
          createUserMessage({
            content: r,
            isMeta: !0,
            turnCompanion: !0,
            usageLimitNote: "release",
            now: now,
            uuidFn: uuid,
          }),
        ),
          logFeatureOk(isMainLoop ? "usage_limit_grace_release" : "usage_limit_grace_release_subagent"));
    }
    if (
      isMainLoop &&
      depth > 0 &&
      consumeNearLimitWrapUpHint() &&
      getFeatureValue_CACHED_MAY_BE_STALE(TENGU_VELLUM_ANCHOR, !1)
    ) {
      if ((i.push(createSystemMessage(yJs, NOTICE)), !R))
        i.push(
          createUserMessage({
            content: hJs,
            isMeta: !0,
            turnCompanion: !0,
            usageLimitNote: "near_limit",
            now: now,
            uuidFn: uuid,
          }),
        );
      if ((logFeatureOk("usage_limit_near_wrapup"), !getIsNonInteractiveSession()))
        import("./chunk-89f54s6c.js")
          .then(({ performRateLimitCheckpoint: performRateLimitCheckpoint }) =>
            performRateLimitCheckpoint({
              todos: toolUseContext.getAppState().todos[toolUseContext.agentId ?? getSessionId()] ?? [],
              trigger: "near_limit",
            }),
          )
          .catch(() => {});
    }
  } catch (error) {
    logError(error);
  }
  let d = [];
  for (let a of i) if ((yield a, a.type === "user")) d.push(a);
  return d.length === 0 ? t : [...t, ...d];
}
/**
 * 用量上限消息的开头文本集合。
 */
//@ chunk-dcmhvw5a.js:49677-50242 placement
var LIMIT_MESSAGE_PREFIXES = [
    "You've hit your",
    "You've reached your",
    "You're out of usage credits",
    "Your org is out of usage \xB7 add funds to continue",
    "Your org is out of usage \xB7 contact your admin",
    "Your seat type doesn't include usage credits",
    "Your seat type doesn't include usage",
    "Your usage allocation has been disabled by your admin",
    "Your group's usage limit is set to $0",
    "Fable 5 requires usage credits",
    "You're out of extra usage",
    "Your seat type doesn't include extra usage",
  ],
  Ffs = [/^(?:Fable|Haiku|Mythos|Opus|Sonnet)(?: [^\u00B7\n]{1,40})? requires usage credits\./];
//@ chunk-dcmhvw5a.js:50242-50322 placement
function isRateLimitErrorMessage(text) {
  return LIMIT_MESSAGE_PREFIXES.some((prefix) => text.startsWith(prefix)) || Ffs.some((n) => n.test(text));
}
/**
 * 限额文案前缀表：错误类、预警类（"You've used"/"You're close to"）、overage 类（"Now using usage credits" 等），用于识别限额消息。
 */
//@ chunk-dcmhvw5a.js:50322-50625 fingerprint = RATE_LIMIT_ERROR_PREFIXES (0.403)
var RATE_LIMIT_ERROR_PREFIXES = ["This service is disabled for your org"],
  RATE_LIMIT_WARNING_PREFIXES = ["You've used", "You're close to"],
  OVERAGE_NOTICE_PREFIXES = [
    "You're now using usage credits",
    "You're now using your usage allocation",
    "Now using your usage allocation",
    "Now using usage credits",
    "Now using credits",
    "You're now using extra usage",
    "Now using extra usage",
  ];

export {
  getLimitReachedText,
  rateLimitWindowLabel,
  formatLimitReachedText,
  getAskAdminSuffix,
  getWarningUpsellText,
  getUsingOverageText,
  getRateLimitWarning,
  getProRunwayTip,
  getModelSwitchUpsell,
  LIMIT_MESSAGE_PREFIXES,
  RATE_LIMIT_WARNING_PREFIXES,
  OVERAGE_NOTICE_PREFIXES,
  RATE_LIMIT_ERROR_PREFIXES,
  Ffs,
  usageLimitNotices,
  servedTextForModel,
  getRateLimitErrorMessage,
  isRateLimitErrorMessage,
  getWeeklyModelLimitName,
};

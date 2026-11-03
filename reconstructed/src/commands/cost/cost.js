/**
 * commands/cost/cost.ts
 *
 * /usage 无头实现（旧 /cost）：会话花费、计划用量与限额贡献项
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/cost/cost.ts
 * pieces: chunk-9689amr8.js (6)
 * attribution: sole-consumer 5, callgraph-fingerprint 1
 */
import { UsageReportSchema } from "../../entrypoints/sdk/coreSchemas.js";
import { logForDebugging } from "../../utils/debug.js";
import { getSubscriptionType, hasProfileScope, isClaudeAISubscriber } from "../../utils/auth.js";
import { isUsageBasedBilling } from "../../utils/planTiers.js";
import { getCurrentLimits, getRawUtilization } from "../../services/claudeAiLimits.js";
import { getIsNonInteractiveSession } from "../../bootstrap/state.js";
import { isUsageScanAllowed } from "../../services/usageInsights/transcriptScan.js";
import { projectModelScopedUsage } from "../../services/api/usage.js";
import { isBridgeOrTransport, mayTransportPersist } from "../../cli/transportState.js";
import { Usage } from "../../components/Settings/Usage.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { formatCostBreakdown, formatTotalCost } from "../../cost-tracker.js";
import { sequential } from "../../utils/sequential.js";
import { stripAnsi } from "../../utils/stripAnsi.js";
import { getAPIProvider } from "../../utils/model/providers.js";
import { refreshGatewayUsage, SPEND_PERIOD_LABELS } from "./usagePeriods.js";
import { formatCurrency } from "../../services/api/referral.js";
import { formatResetTime } from "../../utils/format.js";
import { plural } from "../../utils/stringUtils.js";

//@ chunk-9689amr8.js:12675-12929 sole-consumer
/**
 * 格式化 /cost 中的使用行为统计（近 24 小时与近 7 天），无数据时返回 null。
 */
function formatBehaviors(a) {
  let { behaviors } = a;
  if (!behaviors) return null;
  let filtered = [
    formatUsagePeriod("Last 24h", behaviors.day),
    formatUsagePeriod("Last 7d", behaviors.week),
  ].filter((i) => i !== null);
  if (filtered.length === 0) return null;
  return [
    _,
    "Approximate \xB7 sessions on this machine only \xB7 shares overlap",
    "",
    filtered.join(`

`),
  ].join(`
`);
}
//@ chunk-9689amr8.js:12929-12972 sole-consumer
var _ = "What's contributing to your usage?";
//@ chunk-9689amr8.js:12972-13258 sole-consumer
function usageReportFromData(a) {
  let rateLimits = a.rate_limits;
  let r = UsageReportSchema().safeParse({
    session: a.session,
    rate_limits:
      rateLimits === null
        ? null
        : {
            limits: rateLimits.limits ?? null,
            extra_usage: rateLimits.extra_usage,
          },
  });
  if (!r.success) {
    logForDebugging(`usage_report: twin dropped, the usage data failed its schema: ${r.error.message}`, {
      level: "warn",
    });
    return;
  }
  return r.data;
}
//@ chunk-9689amr8.js:13258-14587 callgraph-fingerprint = call (0.272)
/**
 * /usage（旧 /cost）无头实现：订阅用户显示当前在用订阅额度还是超额、模型分组用量和近 24h/7d 使用分布；网关用户显示花费上限与重置时间；其他显示本会话总花费。
 */
var costCall = async (args, context) => {
  let r = getSubscriptionType() !== null || hasProfileScope();
  if (isClaudeAISubscriber() && r && !isUsageBasedBilling()) {
    let s;
    if (getCurrentLimits().isUsingOverage)
      s =
        "You are currently using your overages to power your Claude Code usage. We will automatically switch you back to your subscription rate limits when they reset";
    else s = "You are currently using your subscription to power your Claude Code usage";
    let isNonInteractiveSession = getIsNonInteractiveSession();
    let n = isUsageScanAllowed();
    let l = await projectModelScopedUsage({
      includeBehaviors: isNonInteractiveSession && !isBridgeOrTransport(context.session) && n.allowed,
      storageV5: context.storageV5,
      credentials: context.credentials,
    });
    let u = Usage(l);
    if (u)
      s += `

${u}`;
    let { behaviors } = l;
    let c = mayTransportPersist(context.session) && {
      recommendations: undefined,
    };
    let f =
      behaviors && !isBridgeOrTransport(context.session)
        ? formatBehaviors({
            ...l,
            behaviors: {
              day: {
                ...behaviors.day,
                ...c,
              },
              week: {
                ...behaviors.week,
                ...c,
              },
            },
          })
        : null;
    if (f)
      s += `

${f}`;
    else if (
      isNonInteractiveSession &&
      !isBridgeOrTransport(context.session) &&
      !n.allowed &&
      isClaudeAISubscriber()
    )
      s += `

${_}
${n.reason}`;
    if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_lark", false)) {
      let d = formatCostBreakdown();
      if (d)
        s += `

${sequential.dim(d)}`;
    }
    let g = usageReportFromData(l);
    return {
      type: "text",
      value: s,
      ...(g !== undefined && {
        usageReport: g,
      }),
    };
  }
  let i = stripAnsi(formatTotalCost());
  if (getAPIProvider() === "gateway") {
    let s = await refreshGatewayUsage(context.credentials);
    let overage = getRawUtilization().overage;
    if (s) {
      i += `

Spend limit: ${formatCurrency(s.used, s.currency)} / ${formatCurrency(s.limit, s.currency)} spent${s.period ? ` ${SPEND_PERIOD_LABELS[s.period]}` : ""} (${Math.round(s.utilization)}%)`;
      let n = s.resetsAt ? formatResetTime(Date.parse(s.resetsAt) / 1000, true, true, true) : undefined;
      if (n) i += ` \xB7 resets ${n}`;
    } else if (overage)
      i += `

Spend limit: ${Math.round(overage.utilization * 100)}% used \xB7 resets ${formatResetTime(overage.resets_at, true, true, true)}`;
  }
  return {
    type: "text",
    value: i,
  };
};
var MAX_LISTED_ITEMS = 8;
//@ chunk-9689amr8.js:14587-15105 sole-consumer
/**
 * 格式化一个时间段（24h/7d）的使用分布：请求数、会话数、推荐项百分比，以及最常用的技能、子代理、插件、MCP 服务器。
 */
function formatUsagePeriod(label, period) {
  let recommendations = period.recommendations ?? [];
  let topLines = [
    formatTopList("Top skills", period.skills, (n) => `/${n}`),
    formatTopList("Top subagents", period.agents),
    formatTopList("Top plugins", period.plugins),
    formatTopList("Top MCP servers", period.mcp_servers),
  ].filter((n) => n !== null);
  if (recommendations.length === 0 && topLines.length === 0) return null;
  let s = `${period.request_count} ${plural(period.request_count, "request")}`;
  let o = `${period.session_count} ${plural(period.session_count, "session")}`;
  return [
    `${label} \xB7 ${s} \xB7 ${o}`,
    ...recommendations.map(
      (recommendation) =>
        `  ${String(recommendation.pct).padStart(2)}%  ${recommendation.title}${recommendation.detail ? ` \xB7 ${recommendation.detail}` : ""}`,
    ),
    ...topLines.map((topLine) => `  ${topLine}`),
  ].join(`
`);
}
//@ chunk-9689amr8.js:15105-15281 sole-consumer
function formatTopList(a, e, r) {
  if (e.length === 0) return null;
  let joined = e
    .slice(0, MAX_LISTED_ITEMS)
    .map((o) => `${r ? r(o.name) : o.name} ${o.pct}%`)
    .join(", ");
  let s = e.length - MAX_LISTED_ITEMS;
  return `${a}: ${joined}${s > 0 ? `, +${s} more` : ""}`;
}

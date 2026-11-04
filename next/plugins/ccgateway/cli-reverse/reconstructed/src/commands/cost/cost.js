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
function formatBehaviors(behaviors) {
  let { behaviors: behaviors_2 } = behaviors;
  if (!behaviors_2) return null;
  let filtered = [
    formatUsagePeriod("Last 24h", behaviors_2.day),
    formatUsagePeriod("Last 7d", behaviors_2.week),
  ].filter((behavior) => behavior !== null);
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
function usageReportFromData(data) {
  let rateLimits = data.rate_limits;
  let parsed = UsageReportSchema().safeParse({
    session: data.session,
    rate_limits:
      rateLimits === null
        ? null
        : {
            limits: rateLimits.limits ?? null,
            extra_usage: rateLimits.extra_usage,
          },
  });
  if (!parsed.success) {
    logForDebugging(`usage_report: twin dropped, the usage data failed its schema: ${parsed.error.message}`, {
      level: "warn",
    });
    return;
  }
  return parsed.data;
}
//@ chunk-9689amr8.js:13258-14587 callgraph-fingerprint (2.1.88 match: call, 0.272)
/**
 * /usage（旧 /cost）无头实现：订阅用户显示当前在用订阅额度还是超额、模型分组用量和近 24h/7d 使用分布；网关用户显示花费上限与重置时间；其他显示本会话总花费。
 */
var costCall = async (args, context) => {
  let isSubscriber = getSubscriptionType() !== null || hasProfileScope();
  if (isClaudeAISubscriber() && isSubscriber && !isUsageBasedBilling()) {
    let limits;
    if (getCurrentLimits().isUsingOverage)
      limits =
        "You are currently using your overages to power your Claude Code usage. We will automatically switch you back to your subscription rate limits when they reset";
    else limits = "You are currently using your subscription to power your Claude Code usage";
    let isNonInteractiveSession = getIsNonInteractiveSession();
    let scanAllowed = isUsageScanAllowed();
    let projection = await projectModelScopedUsage({
      includeBehaviors:
        isNonInteractiveSession && !isBridgeOrTransport(context.session) && scanAllowed.allowed,
      storageV5: context.storageV5,
      credentials: context.credentials,
    });
    let report = Usage(projection);
    if (report)
      limits += `

${report}`;
    let { behaviors } = projection;
    let remoteOverrides = mayTransportPersist(context.session) && {
      recommendations: undefined,
    };
    let localBehaviors =
      behaviors && !isBridgeOrTransport(context.session)
        ? formatBehaviors({
            ...projection,
            behaviors: {
              day: {
                ...behaviors.day,
                ...remoteOverrides,
              },
              week: {
                ...behaviors.week,
                ...remoteOverrides,
              },
            },
          })
        : null;
    if (localBehaviors)
      limits += `

${localBehaviors}`;
    else if (
      isNonInteractiveSession &&
      !isBridgeOrTransport(context.session) &&
      !scanAllowed.allowed &&
      isClaudeAISubscriber()
    )
      limits += `

${_}
${scanAllowed.reason}`;
    if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_lark", false)) {
      let breakdown = formatCostBreakdown();
      if (breakdown)
        limits += `

${sequential.dim(breakdown)}`;
    }
    let usageReport = usageReportFromData(projection);
    return {
      type: "text",
      value: limits,
      ...(usageReport !== undefined && {
        usageReport,
      }),
    };
  }
  let totalCost = stripAnsi(formatTotalCost());
  if (getAPIProvider() === "gateway") {
    let gatewayUsage = await refreshGatewayUsage(context.credentials);
    let overage = getRawUtilization().overage;
    if (gatewayUsage) {
      totalCost += `

Spend limit: ${formatCurrency(gatewayUsage.used, gatewayUsage.currency)} / ${formatCurrency(gatewayUsage.limit, gatewayUsage.currency)} spent${gatewayUsage.period ? ` ${SPEND_PERIOD_LABELS[gatewayUsage.period]}` : ""} (${Math.round(gatewayUsage.utilization)}%)`;
      let resetsAt = gatewayUsage.resetsAt
        ? formatResetTime(Date.parse(gatewayUsage.resetsAt) / 1000, true, true, true)
        : undefined;
      if (resetsAt) totalCost += ` \xB7 resets ${resetsAt}`;
    } else if (overage)
      totalCost += `

Spend limit: ${Math.round(overage.utilization * 100)}% used \xB7 resets ${formatResetTime(overage.resets_at, true, true, true)}`;
  }
  return {
    type: "text",
    value: totalCost,
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
    formatTopList("Top skills", period.skills, (name) => `/${name}`),
    formatTopList("Top subagents", period.agents),
    formatTopList("Top plugins", period.plugins),
    formatTopList("Top MCP servers", period.mcp_servers),
  ].filter((line) => line !== null);
  if (recommendations.length === 0 && topLines.length === 0) return null;
  let requestLine = `${period.request_count} ${plural(period.request_count, "request")}`;
  let sessionLine = `${period.session_count} ${plural(period.session_count, "session")}`;
  return [
    `${label} \xB7 ${requestLine} \xB7 ${sessionLine}`,
    ...recommendations.map(
      (recommendation) =>
        `  ${String(recommendation.pct).padStart(2)}%  ${recommendation.title}${recommendation.detail ? ` \xB7 ${recommendation.detail}` : ""}`,
    ),
    ...topLines.map((topLine) => `  ${topLine}`),
  ].join(`
`);
}
//@ chunk-9689amr8.js:15105-15281 sole-consumer
function formatTopList(title, items, formatItem) {
  if (items.length === 0) return null;
  let joined = items
    .slice(0, MAX_LISTED_ITEMS)
    .map((item) => `${formatItem ? formatItem(item.name) : item.name} ${item.pct}%`)
    .join(", ");
  let hiddenCount = items.length - MAX_LISTED_ITEMS;
  return `${title}: ${joined}${hiddenCount > 0 ? `, +${hiddenCount} more` : ""}`;
}
export { costCall, formatBehaviors };

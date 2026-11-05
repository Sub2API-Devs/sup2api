/**
 * services/claudeGateway/mockRateLimits.ts
 *
 * 2.1.316 新增：网关模拟限流
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1hnjmk23.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { buildOverageMockHeaders } from "../mockRateLimits.js";
import { periodResetsAt, pickMoreSevereLimit } from "./spendLimits.js";

//@ chunk-1hnjmk23.js:1473737-1473757 placement
/**
 * 限速模拟时使用的使用率档位 [0.95, 0.75]。
 */
var MOCK_UTILIZATION_STEPS = [0.95, 0.75];
//@ chunk-1hnjmk23.js:1473757-1473853 placement
/**
 * 由花费记录生成模拟限速状态（最严重的一条 + 响应头）。
 */
function mockLimitsFromSpend(limits, date = new Date()) {
  let binding = mostSevereLimit(limits.map((limit) => withLimitStatus(limit, date)));
  return {
    binding,
    headers: binding ? buildOverageMockHeaders(binding, date) : {},
  };
}
//@ chunk-1hnjmk23.js:1473853-1473997 placement
/**
 * 花费记录补上是否超限、使用率与重置时间。
 */
function withLimitStatus(limit, date) {
  let capCents = Number(limit.cap_cents);
  let exceeded = limit.spent_cents >= capCents;
  return {
    ...limit,
    exceeded,
    utilization: capCents > 0 ? limit.spent_cents / capCents : 1,
    resetsAt: periodResetsAt(limit.period, date),
  };
}
//@ chunk-1hnjmk23.js:1473997-1474062 placement
/**
 * 从多条限额里挑最严重的一条（严重度按 pickMoreSevereLimit）。
 */
function mostSevereLimit(limits) {
  let worst = null;
  for (let limit of limits) worst = worst ? pickMoreSevereLimit(worst, limit) : limit;
  return worst;
}
//@ chunk-1hnjmk23.js:1474062-1474154 placement
/**
 * 使用率保留两位小数；未超限时封顶 0.99。
 */
function roundUtilization(limit) {
  let rounded = Math.round(limit.utilization * 100) / 100;
  return limit.exceeded ? rounded : Math.min(rounded, 0.99);
}
export { MOCK_UTILIZATION_STEPS, roundUtilization, mockLimitsFromSpend, withLimitStatus, mostSevereLimit };

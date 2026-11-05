/**
 * utils/auth/credentialExpiry.ts
 *
 * 登录凭证到期窗口计算与提前告警（额度重置不移动到期日，提示 claude auth login / setup-token）（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-6ezjwmcr.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { refreshTokenExpiryNotice } from "../../components/LogoV2/Notices.js";
import { logError } from "../log.js";
import { writeToStderr } from "../process.js";
import { plural } from "../stringUtils.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";

//@ chunk-6ezjwmcr.js:476-501 placement
var DAY_MS = 86400000;
var EXPIRY_MARGIN_DAYS = 3;
var WARN_DAYS = 7 + EXPIRY_MARGIN_DAYS;
//@ chunk-6ezjwmcr.js:501-616 placement
/**
 * 凭证到期时间字段（credential_expires_at），非第一方或没有刷新令牌时给空对象。
 */
function credentialExpiresAtField() {
  try {
    let expiresAt = refreshTokenExpiryNotice();
    return expiresAt === null
      ? {}
      : {
          credential_expires_at: expiresAt.toISOString(),
        };
  } catch (error) {
    logError(error);
    return {};
  }
}
//@ chunk-6ezjwmcr.js:616-933 placement
/**
 * 登录到期窗口的可读描述（可能已结束/随时结束/在两天区间内结束）。
 */
function formatExpiryWarning(now = Date.now()) {
  try {
    let expiresAt = refreshTokenExpiryNotice();
    if (expiresAt === null) return null;
    let { earliest, latest, daysToEarliest } = expiryBands(expiresAt, now);
    return `${expiresAt.getTime() <= now ? `Sign-in may have ended: between ${earliest} and ${latest}` : daysToEarliest < 1 ? `Sign-in ends: any day now, by ${latest}` : `Sign-in ends: between ${earliest} and ${latest}`} (${expiresAt.toISOString()})`;
  } catch (error) {
    logError(error);
    return null;
  }
}
//@ chunk-6ezjwmcr.js:933-1684 placement
/**
 * 登录将在 10 天内到期时输出告警（分已过期、随时到期、区间到期三档），并记 oauth_expiry_warning。
 */
function warnIfSignInExpiring(now = Date.now()) {
  try {
    let expiresAt = refreshTokenExpiryNotice();
    if (expiresAt === null) return;
    let remainingMs = expiresAt.getTime() - now;
    if (remainingMs >= WARN_DAYS * DAY_MS) return;
    let { earliest, latest, daysToEarliest } = expiryBands(expiresAt, now);
    writeToStderr(
      remainingMs <= 0
        ? `Warning: this sign-in may have ended between ${earliest} and ${latest}. If requests are refused, run claude auth login, or use claude setup-token for unattended jobs.
`
        : daysToEarliest < 1
          ? `Warning: this sign-in can end at any time from now until ${latest}. Renewing it does not move that date. Run claude auth login now, or use claude setup-token for unattended jobs.
`
          : `Warning: this sign-in ends between ${earliest} and ${latest} (in ${daysToEarliest} ${plural(daysToEarliest, "day")} at the earliest). Renewing it does not move those dates. Run claude auth login before then, or use claude setup-token for unattended jobs.
`,
    );
    logFeatureOk("oauth_expiry_warning");
  } catch (error) {
    logError(error);
  }
}
//@ chunk-6ezjwmcr.js:1684-1859 placement
function expiryBands(expiresAt, now) {
  let earliestMs = expiresAt.getTime() - EXPIRY_MARGIN_DAYS * DAY_MS;
  return {
    earliest: new Date(earliestMs).toISOString().slice(0, 10),
    latest: expiresAt.toISOString().slice(0, 10),
    daysToEarliest: Math.floor(earliestMs / DAY_MS) - Math.floor(now / DAY_MS),
  };
}
export { credentialExpiresAtField, warnIfSignInExpiring, formatExpiryWarning };

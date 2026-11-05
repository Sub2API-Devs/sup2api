/**
 * cli/remoteIO/servedTokenProvider.ts
 *
 * remoteIO 的令牌提供者：远端环境下从 ccrClient 取服务令牌（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-1kk50rk6.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isSelfHostedByocEnvironment } from "../../utils/remoteEnvironment.js";
import { isReviewSession } from "../../utils/sessionAccessToken.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { TENGU_PATIENT_LEDGER } from "../transports/ccrClient.js";

//@ chunk-1kk50rk6.js:51029-51083 placement
function getPatientLedgerReader() {
  return isSelfHostedByocEnvironment() && !isReviewSession()
    ? () => getFeatureValue_CACHED_MAY_BE_STALE(TENGU_PATIENT_LEDGER, false)
    : undefined;
}
export { getPatientLedgerReader };

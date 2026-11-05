/**
 * screens/repl/resumeCompactOffer.ts
 *
 * 2.1.316 新增。续接时提议压缩。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (3)
 * attribution: placement 3
 */
import { withHideWhile } from "../../components/dialogs/dialogRequests.js";
import { RESUME_RETURN } from "../../components/nudges/nudgeIds.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, numberSchema, booleanSchema, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { env } from "../../utils/env.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:354643-354856 placement
/**
 * 续接旧会话时提议压缩的对话框定义（compact/continue/dismiss/never）。
 */
var RESUME_COMPACT_DIALOG; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:354643", () => {
  RESUME_COMPACT_DIALOG = withHideWhile({
    kind: RESUME_RETURN,
    payload: DoctorLazy(() =>
      objectSchema({
        sessionAgeMinutes: numberSchema(),
        estimatedTokens: numberSchema(),
        hasPrecomputedSummary: booleanSchema(),
      }),
    ),
    result: DoctorLazy(() => _enum(["compact", "continue", "dismiss", "never", "cancelled"])),
    default: "cancelled",
    hideWhile: [],
  });
});
//@ chunk-czq1j3j2.js:354856-355372 placement
function shouldOfferResumeCompact(estimate, estimateTokensWithAnchor) {
  if (
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_gleaming_fair", false) &&
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_gleaming_fair_reuse", false)
  )
    return null;
  if (getGlobalConfig().resumeReturnDismissed) return null;
  let CLAUDE_CODE_RESUME_THRESHOLD_MINUTES = env.CLAUDE_CODE_RESUME_THRESHOLD_MINUTES ?? 70;
  let CLAUDE_CODE_RESUME_TOKEN_THRESHOLD = env.CLAUDE_CODE_RESUME_TOKEN_THRESHOLD ?? 1e5;
  let cutoffMs = Date.now() - 60000;
  let timestamp = estimate.findLast(
    (entry) =>
      (entry.type === "user" || entry.type === "assistant") && Date.parse(entry.timestamp) < cutoffMs,
  )?.timestamp;
  if (!timestamp) return null;
  let minutesAgo = (Date.now() - Date.parse(timestamp)) / 60000;
  if (minutesAgo < CLAUDE_CODE_RESUME_THRESHOLD_MINUTES) return null;
  let totalTokens = estimateTokensWithAnchor(estimate);
  if (totalTokens < CLAUDE_CODE_RESUME_TOKEN_THRESHOLD) return null;
  return {
    sessionAgeMinutes: minutesAgo,
    estimatedTokens: totalTokens,
  };
}
//@ chunk-czq1j3j2.js:355372-355948 placement
async function runResumeCompactOffer(
  requestDialog,
  messages,
  { getMessageCount, storage, runCompact, hasPrecomputedSummary },
) {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_gleaming_fair_reuse",
    false,
  );
  let offerText =
    featureValue_CACHED_MAY_BE_STALE && !messages.hasPrecomputedSummary
      ? "skipped_no_summary"
      : await requestDialog(RESUME_COMPACT_DIALOG, messages);
  if (offerText === "cancelled") return offerText;
  let offerLines =
    featureValue_CACHED_MAY_BE_STALE && offerText === "compact" && !hasPrecomputedSummary()
      ? "summary_gone"
      : offerText;
  logEvent("tengu_resume_return_action", {
    action: fromEnum(offerLines),
    sessionAgeMinutes: Math.round(messages.sessionAgeMinutes),
    messageCount: getMessageCount(),
    estimatedTokens: messages.estimatedTokens,
  });
  if (offerLines === "never")
    await saveGlobalConfig((config) => {
      if (config.resumeReturnDismissed) return config;
      return {
        ...config,
        resumeReturnDismissed: true,
      };
    }, storage);
  if (offerLines === "compact") runCompact();
  return offerLines;
}
export { RESUME_COMPACT_DIALOG, shouldOfferResumeCompact, runResumeCompactOffer };

/**
 * screens/repl/resumeCompactOffer.ts
 *
 * 2.1.316 新增。续接时提议压缩。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: placement 3
 */
import { withHideWhile } from "../../components/dialogs/dialogRequests.js";
import { RESUME_RETURN } from "../../components/nudges/nudgeIds.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, E, M, _enum } from "../../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { env } from "../../utils/env.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

//@ chunk-18hwfzwa.js:330496-330709 placement
/**
 * 续接旧会话时提议压缩的对话框定义（compact/continue/dismiss/never）。
 */
var RESUME_COMPACT_DIALOG = withHideWhile({
  kind: RESUME_RETURN,
  payload: DoctorLazy(() =>
    u({
      sessionAgeMinutes: E(),
      estimatedTokens: E(),
      hasPrecomputedSummary: M(),
    }),
  ),
  result: DoctorLazy(() => _enum(["compact", "continue", "dismiss", "never", "cancelled"])),
  default: "cancelled",
  hideWhile: [],
});
//@ chunk-18hwfzwa.js:330709-331225 placement
function shouldOfferResumeCompact(h, estimateTokensWithAnchor) {
  if (
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_gleaming_fair", false) &&
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_gleaming_fair_reuse", false)
  )
    return null;
  if (getGlobalConfig().resumeReturnDismissed) return null;
  let CLAUDE_CODE_RESUME_THRESHOLD_MINUTES = env.CLAUDE_CODE_RESUME_THRESHOLD_MINUTES ?? 70;
  let CLAUDE_CODE_RESUME_TOKEN_THRESHOLD = env.CLAUDE_CODE_RESUME_TOKEN_THRESHOLD ?? 1e5;
  let ee = Date.now() - 60000;
  let timestamp = h.findLast(
    (He) => (He.type === "user" || He.type === "assistant") && Date.parse(He.timestamp) < ee,
  )?.timestamp;
  if (!timestamp) return null;
  let Re = (Date.now() - Date.parse(timestamp)) / 60000;
  if (Re < CLAUDE_CODE_RESUME_THRESHOLD_MINUTES) return null;
  let Be = estimateTokensWithAnchor(h);
  if (Be < CLAUDE_CODE_RESUME_TOKEN_THRESHOLD) return null;
  return {
    sessionAgeMinutes: Re,
    estimatedTokens: Be,
  };
}
//@ chunk-18hwfzwa.js:331225-331801 placement
async function runResumeCompactOffer(
  requestDialog,
  x,
  { getMessageCount, storage, runCompact, hasPrecomputedSummary },
) {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_gleaming_fair_reuse",
    false,
  );
  let Be =
    featureValue_CACHED_MAY_BE_STALE && !x.hasPrecomputedSummary
      ? "skipped_no_summary"
      : await requestDialog(RESUME_COMPACT_DIALOG, x);
  if (Be === "cancelled") return Be;
  let He =
    featureValue_CACHED_MAY_BE_STALE && Be === "compact" && !hasPrecomputedSummary() ? "summary_gone" : Be;
  logEvent("tengu_resume_return_action", {
    action: fromEnum(He),
    sessionAgeMinutes: Math.round(x.sessionAgeMinutes),
    messageCount: getMessageCount(),
    estimatedTokens: x.estimatedTokens,
  });
  if (He === "never")
    await saveGlobalConfig((We) => {
      if (We.resumeReturnDismissed) return We;
      return {
        ...We,
        resumeReturnDismissed: true,
      };
    }, storage);
  if (He === "compact") runCompact();
  return He;
}
export { shouldOfferResumeCompact, runResumeCompactOffer, RESUME_COMPACT_DIALOG };

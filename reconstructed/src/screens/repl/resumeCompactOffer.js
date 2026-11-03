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
import { u, E, M, U } from "../../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { env } from "../../utils/env.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";

/**
 * 续接旧会话时提议压缩的对话框定义（compact/continue/dismiss/never）。
 */
//@ chunk-18hwfzwa.js:330496-330709 placement
var RESUME_COMPACT_DIALOG = withHideWhile({
  kind: RESUME_RETURN,
  payload: DoctorLazy(() => u({ sessionAgeMinutes: E(), estimatedTokens: E(), hasPrecomputedSummary: M() })),
  result: DoctorLazy(() => U(["compact", "continue", "dismiss", "never", "cancelled"])),
  default: "cancelled",
  hideWhile: [],
});
//@ chunk-18hwfzwa.js:330709-331225 placement
function shouldOfferResumeCompact(h, x) {
  if (
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_gleaming_fair", !1) &&
    !getFeatureValue_CACHED_MAY_BE_STALE("tengu_gleaming_fair_reuse", !1)
  )
    return null;
  if (getGlobalConfig().resumeReturnDismissed) return null;
  let D = env.CLAUDE_CODE_RESUME_THRESHOLD_MINUTES ?? 70,
    L = env.CLAUDE_CODE_RESUME_TOKEN_THRESHOLD ?? 1e5,
    ee = Date.now() - 60000,
    ke = h.findLast(
      (He) => (He.type === "user" || He.type === "assistant") && Date.parse(He.timestamp) < ee,
    )?.timestamp;
  if (!ke) return null;
  let Re = (Date.now() - Date.parse(ke)) / 60000;
  if (Re < D) return null;
  let Be = x(h);
  if (Be < L) return null;
  return { sessionAgeMinutes: Re, estimatedTokens: Be };
}
//@ chunk-18hwfzwa.js:331225-331801 placement
async function runResumeCompactOffer(
  h,
  x,
  {
    getMessageCount: getMessageCount,
    storage: storage,
    runCompact: runCompact,
    hasPrecomputedSummary: hasPrecomputedSummary,
  },
) {
  let Re = getFeatureValue_CACHED_MAY_BE_STALE("tengu_gleaming_fair_reuse", !1),
    Be = Re && !x.hasPrecomputedSummary ? "skipped_no_summary" : await h(RESUME_COMPACT_DIALOG, x);
  if (Be === "cancelled") return Be;
  let He = Re && Be === "compact" && !hasPrecomputedSummary() ? "summary_gone" : Be;
  if (
    (logEvent("tengu_resume_return_action", {
      action: fromEnum(He),
      sessionAgeMinutes: Math.round(x.sessionAgeMinutes),
      messageCount: getMessageCount(),
      estimatedTokens: x.estimatedTokens,
    }),
    He === "never")
  )
    await saveGlobalConfig((We) => {
      if (We.resumeReturnDismissed) return We;
      return { ...We, resumeReturnDismissed: !0 };
    }, storage);
  if (He === "compact") runCompact();
  return He;
}

export { shouldOfferResumeCompact, runResumeCompactOffer, RESUME_COMPACT_DIALOG };

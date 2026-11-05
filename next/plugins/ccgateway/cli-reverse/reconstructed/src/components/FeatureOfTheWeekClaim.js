/**
 * components/FeatureOfTheWeekClaim.tsx
 *
 * 2.1.316 新增。“本周功能”赠送额度领取界面。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useAppState, useSetAppState } from "../state/AppState.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { useEffect } from "../../vendor/react/cjs/react.production.js";
import { refreshPromoEligibility } from "../services/api/featureOfTheWeek.js";
import { useTimeout } from "../ink/hooks/useTerminalHooks.js";
import { formatCurrency } from "../services/api/referral.js";

//@ chunk-czq1j3j2.js:1668982-1669061 placement
var FOTW_CLAIM_CLEAR_DELAY_MS = 30000;
var FOTW_NOTIFICATION_TIMEOUT_MS = 60000;
var HTTPS_CLAUDE_AI_SETTINGS_USAGE = "https://claude.ai/settings/usage";
var FOTW_CLAIM = "fotw-claim";
//@ chunk-czq1j3j2.js:1669061-1670175 placement
function FeatureOfTheWeekClaim(addNotification, removeNotification) {
  let claim = useAppState((state) => state.fotwClaim);
  let setAppState = useSetAppState();
  let { credentials } = useTheme_2();
  useEffect(() => {
    refreshPromoEligibility(credentials);
  }, [credentials]);
  let phase = claim?.phase;
  useTimeout(
    () =>
      setAppState((state) =>
        state.fotwClaim
          ? {
              ...state,
              fotwClaim: undefined,
            }
          : state,
      ),
    phase === undefined || phase === "pending" ? null : FOTW_CLAIM_CLEAR_DELAY_MS,
    [phase],
  );
  useEffect(() => {
    if (!claim) {
      removeNotification(FOTW_CLAIM);
      return;
    }
    let amount = formatCurrency(claim.amountMinorUnits, claim.currency, "precise");
    switch ((removeNotification(FOTW_CLAIM), claim.phase)) {
      case "pending":
        addNotification({
          key: FOTW_CLAIM,
          text: `Thanks for trying the feature of the week. ${amount} in usage credits on its way!`,
          priority: "immediate",
          requeueOnPreempt: true,
          timeoutMs: FOTW_NOTIFICATION_TIMEOUT_MS,
        });
        return;
      case "granted":
        addNotification({
          key: FOTW_CLAIM,
          text: `${amount} in usage credits added to your account \xB7 Expires in 90 days`,
          color: "success",
          priority: "immediate",
          requeueOnPreempt: true,
          timeoutMs: FOTW_CLAIM_CLEAR_DELAY_MS,
        });
        return;
      case "failed":
        addNotification({
          key: FOTW_CLAIM,
          text: "Something went wrong when adding your usage credits. Contact support for help.",
          color: "error",
          priority: "immediate",
          requeueOnPreempt: true,
          timeoutMs: FOTW_CLAIM_CLEAR_DELAY_MS,
        });
        return;
      case "needs_payment_setup":
        addNotification({
          key: FOTW_CLAIM,
          text: `To claim ${amount} in usage credits, add a payment method at ${HTTPS_CLAUDE_AI_SETTINGS_USAGE}, then run /${claim.command} again to claim (claiming turns on extra usage billing)`,
          priority: "immediate",
          requeueOnPreempt: true,
          timeoutMs: FOTW_CLAIM_CLEAR_DELAY_MS,
        });
        return;
    }
  }, [claim, addNotification, removeNotification]);
}
export { FeatureOfTheWeekClaim };

/**
 * components/FeatureOfTheWeekClaim.tsx
 *
 * 2.1.316 新增。“本周功能”赠送额度领取界面。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: placement 2
 */
import { useAppState, useSetAppState } from "../state/AppState.js";
import { useTheme_2 } from "./design-system/ThemeProvider.js";
import { P } from "../../vendor/react/cjs/react.production.js";
import { refreshPromoEligibility } from "../services/api/featureOfTheWeek.js";
import { useTimeout } from "../ink/hooks/useTerminalHooks.js";
import { formatCurrency } from "../services/api/referral.js";

//@ chunk-18hwfzwa.js:1624816-1624895 placement
var FOTW_CLAIM_CLEAR_DELAY_MS = 30000;
var FOTW_NOTIFICATION_TIMEOUT_MS = 60000;
var HTTPS_CLAUDE_AI_SETTINGS_USAGE = "https://claude.ai/settings/usage";
var FOTW_CLAIM = "fotw-claim";
//@ chunk-18hwfzwa.js:1624895-1626009 placement
function FeatureOfTheWeekClaim(addNotification, removeNotification) {
  let D = useAppState((Be) => Be.fotwClaim);
  let setAppState = useSetAppState();
  let { credentials } = useTheme_2();
  P(() => {
    refreshPromoEligibility(credentials);
  }, [credentials]);
  let phase = D?.phase;
  useTimeout(
    () =>
      setAppState((Be) =>
        Be.fotwClaim
          ? {
              ...Be,
              fotwClaim: undefined,
            }
          : Be,
      ),
    phase === undefined || phase === "pending" ? null : FOTW_CLAIM_CLEAR_DELAY_MS,
    [phase],
  );
  P(() => {
    if (!D) {
      removeNotification(FOTW_CLAIM);
      return;
    }
    let Be = formatCurrency(D.amountMinorUnits, D.currency, "precise");
    switch ((removeNotification(FOTW_CLAIM), D.phase)) {
      case "pending":
        addNotification({
          key: FOTW_CLAIM,
          text: `Thanks for trying the feature of the week. ${Be} in usage credits on its way!`,
          priority: "immediate",
          requeueOnPreempt: true,
          timeoutMs: FOTW_NOTIFICATION_TIMEOUT_MS,
        });
        return;
      case "granted":
        addNotification({
          key: FOTW_CLAIM,
          text: `${Be} in usage credits added to your account \xB7 Expires in 90 days`,
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
          text: `To claim ${Be} in usage credits, add a payment method at ${HTTPS_CLAUDE_AI_SETTINGS_USAGE}, then run /${D.command} again to claim (claiming turns on extra usage billing)`,
          priority: "immediate",
          requeueOnPreempt: true,
          timeoutMs: FOTW_CLAIM_CLEAR_DELAY_MS,
        });
        return;
    }
  }, [D, addNotification, removeNotification]);
}
export { FeatureOfTheWeekClaim };

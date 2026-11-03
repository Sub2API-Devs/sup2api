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
import { Me } from "./design-system/ThemeProvider.js";
import { P } from "../../vendor/react/cjs/react.production.js";
import { refreshPromoEligibility } from "../services/api/featureOfTheWeek.js";
import { useTimeout } from "../ink/hooks/useTerminalHooks.js";
import { formatCurrency } from "../services/api/referral.js";

//@ chunk-18hwfzwa.js:1624816-1624895 placement
var cte = 30000,
  N$o = 60000,
  HTTPS_CLAUDE_AI_SETTINGS_USAGE = "https://claude.ai/settings/usage",
  FOTW_CLAIM = "fotw-claim";
//@ chunk-18hwfzwa.js:1624895-1626009 placement
function FeatureOfTheWeekClaim(h, x) {
  let D = useAppState((Be) => Be.fotwClaim),
    L = useSetAppState(),
    { credentials: credentials } = Me();
  P(() => {
    refreshPromoEligibility(credentials);
  }, [credentials]);
  let ke = D?.phase;
  (useTimeout(
    () => L((Be) => (Be.fotwClaim ? { ...Be, fotwClaim: void 0 } : Be)),
    ke === void 0 || ke === "pending" ? null : cte,
    [ke],
  ),
    P(() => {
      if (!D) {
        x(FOTW_CLAIM);
        return;
      }
      let Be = formatCurrency(D.amountMinorUnits, D.currency, "precise");
      switch ((x(FOTW_CLAIM), D.phase)) {
        case "pending":
          h({
            key: FOTW_CLAIM,
            text: `Thanks for trying the feature of the week. ${Be} in usage credits on its way!`,
            priority: "immediate",
            requeueOnPreempt: !0,
            timeoutMs: N$o,
          });
          return;
        case "granted":
          h({
            key: FOTW_CLAIM,
            text: `${Be} in usage credits added to your account \xB7 Expires in 90 days`,
            color: "success",
            priority: "immediate",
            requeueOnPreempt: !0,
            timeoutMs: cte,
          });
          return;
        case "failed":
          h({
            key: FOTW_CLAIM,
            text: "Something went wrong when adding your usage credits. Contact support for help.",
            color: "error",
            priority: "immediate",
            requeueOnPreempt: !0,
            timeoutMs: cte,
          });
          return;
        case "needs_payment_setup":
          h({
            key: FOTW_CLAIM,
            text: `To claim ${Be} in usage credits, add a payment method at ${HTTPS_CLAUDE_AI_SETTINGS_USAGE}, then run /${D.command} again to claim (claiming turns on extra usage billing)`,
            priority: "immediate",
            requeueOnPreempt: !0,
            timeoutMs: cte,
          });
          return;
      }
    }, [D, h, x]));
}

export { FeatureOfTheWeekClaim };

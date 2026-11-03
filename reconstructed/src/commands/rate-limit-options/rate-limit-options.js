/**
 * commands/rate-limit-options/rate-limit-options.tsx
 *
 * /rate-limit-options 实现：升级、用量额度、自动恢复、等待等选项
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/rate-limit-options/rate-limit-options.tsx
 * pieces: chunk-dg94x42s.js (22)
 * attribution: sole-consumer 17, affinity 1, fingerprint 1, layout 2, callgraph-fingerprint 1
 */
import { j, y, P, yt, R, zt } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTheme, Me } from "../../components/design-system/ThemeProvider.js";
import {
  useRateLimitState,
  useResetReached,
  useQuotaAutoResumeState,
  TENGU_PEWTER_SUMMIT,
  Dtn,
  EWe,
  getRateLimitEventProps,
} from "../../components/rateLimit/quotaAutoResume.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getSubscriptionType, getRateLimitTier, getOauthAccountInfo } from "../../utils/auth.js";
import { Gpe, isConsumerPlan } from "../../utils/planTiers.js";
import { getLspManager } from "../../services/lsp/manager.js";
import { fetchUtilization } from "../../services/api/usage.js";
import { formatResetTime } from "../../utils/format.js";
import { formatCurrency } from "../../services/api/referral.js";
import { logEvent } from "../../services/analytics/index.js";
import { updateOverageSpendLimit, fetchPrepaidBalance } from "../../services/api/billing.js";
import { markOverageAllowed, fileAdminLimitRequest } from "../../services/api/adminRequests.js";
import { color } from "../../components/design-system/color.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { WorkerBadge } from "../../components/permissions/WorkerBadge.js";
import { FocusColumn } from "../../components/design-system/FocusColumn.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { emitStatusChange } from "../../services/claudeAiLimits.js";
import {
  resetOfferLabel,
  subscribeResetChanges,
  O7,
  availableResetOffers,
  isClaimingReset,
  canArmLowPriorityReset,
  resetsUsedUpLine,
  reportResetOfferShown,
  refreshResetStatusForDialog,
  startResetFlowSafe,
  RESET_STATUS_MESSAGES,
  eJe,
} from "../../services/rateLimit/rateLimitWall.js";
import { fromEnum, lit } from "../../services/analytics/safeMetadata.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { A, xE, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import {
  A7e,
  armQuotaAutoResumeFromDialog,
  due,
  cancelQuotaAutoResume,
  yUt,
  Fyt,
} from "../../services/quotaAutoResume/quotaAutoResume.js";
import {
  canOfferLowPriority,
  logLowPriorityShown,
  enableLowPriorityMode,
  lowPriorityUnavailableMessage,
  lowPriorityOnMessage,
} from "../../services/lowPriorityMode.js";
import {
  i9,
  s9,
  Jre,
  CWe,
  getOfferMenuSuffix,
  getCreditOfferForRateLimit,
  logCreditOfferShown,
  retryOfferPrompt,
} from "../../services/usageCreditOffers.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import {
  usageCreditsSpentLine,
  logLimitResetOfferShown,
  Qho,
  checkUsageCredits,
} from "../../components/rateLimit/usageCreditsOffer.js";
import { usageCreditsCommand } from "../extra-usage/index.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { getUsageCreditsFlowConfig, call as call_2 } from "../usage-credits/usageCredits.js";
import { runExtraUsage } from "../extra-usage/extra-usage-core.js";
import { useInputClock } from "../../ink/components/Input.js";
import { useRefusalTracker } from "../../components/CustomSelect/selectTypeahead.js";
import { upgradeCommand } from "../upgrade/index.js";
import { getLimitResetCopy } from "../limit-reset/index.js";
import { statusLineShouldDisplay } from "../../components/StatusLine.js";
import { isWithinRecentInput, So } from "../../hooks/useRecentInputGuard.js";
import { isFrozenMarker } from "../../utils/frozenMarkers.js";
import { isAutoResumableLimit } from "../../services/api/errors.js";
import { ResetLimits, ResetLimitsOffers } from "./ResetLimits.js";
import { callUpgradeFromSurface } from "../upgrade/upgrade.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../../components/CustomSelect/select.js";

//@ chunk-dg94x42s.js:18401-18405 sole-consumer
j();
//@ chunk-dg94x42s.js:18405-18409 sole-consumer
j();
//@ chunk-dg94x42s.js:18409-18449 sole-consumer
function mr($i) {
  return Math.max(0, $i - 1);
}
//@ chunk-dg94x42s.js:18449-18491 sole-consumer
var Le = 500,
  Ko = 1000,
  Qo = 10000000000,
  qo = 4000;
//@ chunk-dg94x42s.js:18491-18589 sole-consumer
function yi(k) {
  return k.overageDisabledReason === "org_level_disabled_until" && k.balanceMinorUnits > 0;
}
//@ chunk-dg94x42s.js:18589-18758 sole-consumer
function stepCreditAmount(k, d, t = null) {
  let g = k ?? qo,
    me = d === 1 ? Math.floor(g / Le + 1) * Le : Math.ceil(g / Le - 1) * Le,
    i = t === null ? Le : d === 1 ? Math.ceil((t + Ko) / Le) * Le : t;
  return Math.min(Qo, Math.max(i, me));
}
/**
 * 限流选项菜单：升级、额外用量、自动恢复、等待等。
 */
//@ chunk-dg94x42s.js:18758-24302 sole-consumer
function RateLimitOptionsMenu(k) {
  let h = w(61),
    { balance: balance, onDone: onDone, context: context } = k,
    [me, i] = y(null),
    [xe] = useTheme(),
    l = useRateLimitState(),
    at;
  if (h[0] === MEMO_CACHE_SENTINEL) ((at = getSubscriptionType()), (h[0] = at));
  else at = h[0];
  let Qt = at,
    Ri;
  if (h[1] === MEMO_CACHE_SENTINEL) {
    let oo = Qt === "max" && getRateLimitTier() === "default_claude_max_20x";
    Ri = !oo && Gpe();
    h[1] = Ri;
  } else Ri = h[1];
  let qt = Ri,
    currency = balance.currency,
    [J, ve] = y(void 0),
    [W, ce] = y(void 0),
    [x, Ce] = y(!1),
    [se, lt] = y(0),
    [ke, z] = y(null),
    dt,
    pe;
  if (h[2] !== context.credentials)
    ((dt = () => {
      let ut = getLspManager();
      if (ut) {
        (ve(ut.spendLimitCents), ce(ut.spendLimitCents));
        return;
      }
      let Ie = !1;
      return (
        fetchUtilization(context.credentials)
          .then((Vt) => {
            if (Ie) {
              return;
            }
            let ae = Vt?.extra_usage?.monthly_limit ?? null;
            let mt = Vt?.extra_usage?.used_credits ?? 0;
            let De = ae === null ? null : Math.max(ae, mt);
            (ve(De), ce(De));
          })
          .catch(() => {
            if (Ie) {
              return;
            }
            (ve(null), ce(null));
          }),
        () => {
          Ie = !0;
        }
      );
    }),
      (pe = [context.credentials]),
      (h[2] = context.credentials),
      (h[3] = dt),
      (h[4] = pe));
  else ((dt = h[3]), (pe = h[4]));
  P(dt, pe);
  let ct;
  Te: {
    if (l.resetsAt) {
      let V;
      if (h[5] !== l.resetsAt) ((V = formatResetTime(l.resetsAt, !0)), (h[5] = l.resetsAt), (h[6] = V));
      else V = h[6];
      ct = V;
      break Te;
    }
    ct = void 0;
  }
  let ji = ct,
    X = W !== void 0,
    V;
  if (h[7] !== currency || h[8] !== X || h[9] !== W)
    ((V = !X ? "\u2026" : W === null ? "Unlimited" : formatCurrency(W, currency, "fit")),
      (h[7] = currency),
      (h[8] = X),
      (h[9] = W),
      (h[10] = V));
  else V = h[10];
  const pt = `Adjust monthly spend limit: ${V}`,
    Gt =
      J === null ? "\u2190 or \u2192 to set a limit" : "\u2190 or \u2192 to adjust \xB7 Del to remove limit";
  let Ne;
  if (h[11] !== pt || h[12] !== Gt)
    ((Ne = { id: "adjust", label: pt, hint: Gt }), (h[11] = pt), (h[12] = Gt), (h[13] = Ne));
  else Ne = h[13];
  const Yt = ji ? `Resets ${ji}` : "";
  let fe;
  if (h[14] !== Yt)
    ((fe = { id: "wait", label: "Wait for limit to reset", hint: Yt }), (h[14] = Yt), (h[15] = fe));
  else fe = h[15];
  let B;
  if (h[16] !== fe || h[17] !== Ne) {
    B = [Ne, fe];
    if (qt) {
      let ro = Qt === "max" ? "Max 20x" : "Max";
      let We;
      if (h[19] === MEMO_CACHE_SENTINEL)
        ((We = { id: "upgrade", label: `Upgrade to ${ro} for higher session limits every month`, hint: "" }),
          (h[19] = We));
      else We = h[19];
      B.push(We);
    }
    ((h[16] = fe), (h[17] = Ne), (h[18] = B));
  } else B = h[18];
  let G = B,
    We;
  if (h[20] !== context || h[21] !== onDone)
    ((We = function Xe() {
      (logEvent("tengu_spend_limit_nudge_cancel", {}),
        context.prefillRateLimitAutoQueueContinue?.(),
        onDone(void 0, { display: "skip" }));
    }),
      (h[20] = context),
      (h[21] = onDone),
      (h[22] = We));
  else We = h[22];
  let Xe = We,
    F;
  if (
    h[23] !== context.credentials ||
    h[24] !== currency ||
    h[25] !== X ||
    h[26] !== onDone ||
    h[27] !== W ||
    h[28] !== J ||
    h[29] !== x ||
    h[30] !== xe
  )
    ((F = async function $e() {
      if (!X || x) {
        return;
      }
      if (W === J) {
        z(
          J === null
            ? "Press \u2190 or \u2192 to set a limit."
            : "Press \u2192 to raise the limit, or Del to remove it.",
        );
        return;
      }
      Ce(!0);
      let H = W ?? null;
      let D = await updateOverageSpendLimit(H, currency, context.credentials);
      if (!D.ok) {
        (Ce(!1),
          z(
            D.reason
              ? `Could not update your spend limit: ${D.reason}`
              : "Could not update your spend limit. Press Enter to retry.",
          ));
        return;
      }
      let Zt = D.disabledUntil != null ? new Date(D.disabledUntil) : null;
      let Ei = Zt != null && (Number.isNaN(Zt.getTime()) || Zt > new Date());
      if ((logEvent("tengu_spend_limit_nudge_save", { removed: H === null, reblocked: Ei }), Ei)) {
        Ce(!1);
        let Be = D.usedCredits !== null ? Math.max(J ?? 0, D.usedCredits) : J;
        (ve(Be ?? null),
          ce((ei) => (Be !== null && Be !== void 0 && ei !== null ? Math.max(ei ?? 0, Be) : ei)),
          z(
            D.usedCredits !== null
              ? `You've already used ${formatCurrency(D.usedCredits, currency, "fit")} this month \u2014 set your limit above that.`
              : "Your current spend is still over the new limit. Raise it higher or remove it.",
          ));
        return;
      }
      if ((z(null), markOverageAllowed(), H === null))
        onDone(color("success", xe)("Removed monthly spend limit"));
      else
        onDone(
          color("success", xe)(`Increased monthly spend limit to ${formatCurrency(H, currency, "fit")}`),
        );
    }),
      (h[23] = context.credentials),
      (h[24] = currency),
      (h[25] = X),
      (h[26] = onDone),
      (h[27] = W),
      (h[28] = J),
      (h[29] = x),
      (h[30] = xe),
      (h[31] = F));
  else F = h[31];
  let $e = F,
    ge;
  if (h[32] !== $e || h[33] !== context || h[34] !== onDone)
    ((ge = function Oe(Y) {
      if (Y === "adjust" || Y === "upgrade") context.cancelRateLimitAutoQueueContinue?.();
      else if (Y === "wait") context.prefillRateLimitAutoQueueContinue?.();
      if (Y === "adjust") $e();
      else if (Y === "wait")
        (logEvent("tengu_spend_limit_nudge_wait", {}), onDone(void 0, { display: "skip" }));
      else if (Y === "upgrade")
        (logEvent("tengu_spend_limit_nudge_upgrade", {}),
          import("./chunk-txp87wj5.js")
            .then((ft) => {
              let { callUpgradeFromSurface: callUpgradeFromSurface } = ft;
              return callUpgradeFromSurface(onDone, context, "spend_limit_options_menu");
            })
            .then((ti) => {
              if (ti) i(ti);
            }));
    }),
      (h[32] = $e),
      (h[33] = context),
      (h[34] = onDone),
      (h[35] = ge));
  else ge = h[35];
  let Oe = ge,
    ft;
  if (h[36] !== Oe || h[37] !== X || h[38] !== G || h[39] !== se || h[40] !== J || h[41] !== x)
    ((ft = function L(M) {
      if (x) {
        return;
      }
      if (M.key === "up") {
        (M.preventDefault(), z(null), lt(mr));
        return;
      }
      if (M.key === "down") {
        (M.preventDefault(), z(null), lt((Ii) => Math.min(G.length - 1, Ii + 1)));
        return;
      }
      if (M.key === "return") {
        M.preventDefault();
        let ii = G[se];
        if (ii) Oe(ii.id);
        return;
      }
      if (G[se]?.id !== "adjust" || !X) {
        return;
      }
      if (M.key === "left")
        (M.preventDefault(), z(null), ce((ni) => stepCreditAmount(ni ?? null, -1, J ?? null)));
      else if (M.key === "right")
        (M.preventDefault(), z(null), ce((Ni) => stepCreditAmount(Ni ?? null, 1, J ?? null)));
      else if (M.key === "delete" || M.key === "backspace") (M.preventDefault(), z(null), ce(null));
    }),
      (h[36] = Oe),
      (h[37] = X),
      (h[38] = G),
      (h[39] = se),
      (h[40] = J),
      (h[41] = x),
      (h[42] = ft));
  else ft = h[42];
  let L = ft;
  if (me) {
    return me;
  }
  let le;
  if (h[43] !== balance.amount || h[44] !== currency)
    ((le = formatCurrency(balance.amount, currency)),
      (h[43] = balance.amount),
      (h[44] = currency),
      (h[45] = le));
  else le = h[45];
  const oi = `Usage credit balance: ${le}`,
    Fe = !x;
  let He;
  if (h[46] !== G || h[47] !== se)
    ((He = e(Box, {
      flexDirection: "column",
      children: G.map((Ke, Wi) => {
        let Xi = Wi === se;
        return r(
          Box,
          {
            justifyContent: "space-between",
            gap: 2,
            children: [
              r(Text, {
                color: Xi ? "suggestion" : void 0,
                children: [Xi ? re.pointer : " ", " ", Ke.label],
              }),
              Ke.hint ? e(Text, { dimColor: !0, wrap: "truncate-end", children: Ke.hint }) : null,
            ],
          },
          Ke.id,
        );
      }),
    })),
      (h[46] = G),
      (h[47] = se),
      (h[48] = He));
  else He = h[48];
  let Z;
  if (h[49] !== ke || h[50] !== x)
    ((Z = x
      ? e(WorkerBadge, { message: "Updating spend limit\u2026" })
      : ke
        ? e(Box, { children: e(Text, { color: "error", children: ke }) })
        : null),
      (h[49] = ke),
      (h[50] = x),
      (h[51] = Z));
  else Z = h[51];
  let gt;
  if (h[52] !== L || h[53] !== He || h[54] !== Z)
    ((gt = r(FocusColumn, { gap: 1, onKeyDown: L, children: [He, Z] })),
      (h[52] = L),
      (h[53] = He),
      (h[54] = Z),
      (h[55] = gt));
  else gt = h[55];
  let Bi;
  if (h[56] !== Xe || h[57] !== oi || h[58] !== Fe || h[59] !== gt)
    ((Bi = e(Dialog, {
      title: "What do you want to do?",
      titleEnd: oi,
      onCancel: Xe,
      isCancelActive: Fe,
      color: "suggestion",
      children: gt,
    })),
      (h[56] = Xe),
      (h[57] = oi),
      (h[58] = Fe),
      (h[59] = gt),
      (h[60] = Bi));
  else Bi = h[60];
  return Bi;
}
//@ chunk-dg94x42s.js:24302-24339 sole-consumer
function os() {
  return emitStatusChange(Date.now());
}
//@ chunk-dg94x42s.js:24339-24379 sole-consumer
function rs(Ho) {
  return [Ho.kind, resetOfferLabel(Ho)];
}
//@ chunk-dg94x42s.js:24379-24394 sole-consumer
function ss() {}
//@ chunk-dg94x42s.js:24394-24409 sole-consumer
function as() {}
//@ chunk-dg94x42s.js:24409-24441 sole-consumer
function ls(ks) {
  return ks.value;
}
//@ chunk-dg94x42s.js:24441-24476 sole-consumer
function ds(Ds) {
  return fromEnum(Ds.value);
}
//@ chunk-dg94x42s.js:24476-24491 sole-consumer
function us() {}
//@ chunk-dg94x42s.js:24491-24506 sole-consumer
function ms() {}
//@ chunk-dg94x42s.js:24506-24521 sole-consumer
function cs() {}
//@ chunk-dg94x42s.js:24521-24552 sole-consumer
var gn = DoctorLazy(() => A(xE([o(), o()])));
/**
 * 选项是升级或额外用量。
 */
//@ chunk-dg94x42s.js:24552-24869 affinity
function isUpgradeOption(k) {
  switch (k) {
    case "upgrade":
    case "extra-usage":
      return !0;
    case "cancel":
    case "auto-resume":
    case "low-priority":
    case "juniper-tide":
    case "juniper-tide-spent":
    case "cedar-ember-session":
    case "cedar-ember-weekly":
    case "cedar-ember-fable":
    case "cedar-ember-full":
    case "cedar-ember-spent":
    case "cancel-auto-resume":
      return !1;
  }
}
//@ chunk-dg94x42s.js:24869-37678 fingerprint = RateLimitOptionsMenu (0.363)
function RateLimitOptionsMenu_2(t0) {
  let l = w(177),
    { onDone: onDone, context: context } = t0,
    [g, me] = y(null),
    claudeAiLimits = useRateLimitState(),
    { storageV5: storageV5 } = Me(),
    h;
  if (l[0] === MEMO_CACHE_SENTINEL) ((h = getSubscriptionType()), (l[0] = h));
  else h = l[0];
  let at = h,
    Qt;
  if (l[1] === MEMO_CACHE_SENTINEL) ((Qt = getRateLimitTier()), (l[1] = Qt));
  else Qt = l[1];
  let Ri = Qt,
    oo = getOauthAccountInfo()?.hasExtraUsageEnabled === !0,
    qt = getOauthAccountInfo()?.billingType === "usage_based",
    J = at === "max" && Ri === "default_claude_max_20x",
    ve = at === "team" || at === "enterprise",
    W;
  if (l[2] === MEMO_CACHE_SENTINEL)
    ((W = getFeatureValue_CACHED_MAY_BE_STALE("tengu_jade_anvil_4", !1)), (l[2] = W));
  else W = l[2];
  let ce = W,
    upgradePaths = claudeAiLimits.upgradePaths,
    [Ce] = y(os),
    se = Kt(claudeAiLimits, Ce),
    lt = se !== null,
    ke = se?.resetsAt,
    z = useResetReached(ke !== void 0 ? ke * 1000 : null),
    { label: label } = getWaitOptionLabel(ke, z),
    phase = useQuotaAutoResumeState().phase,
    ut;
  if (l[3] !== phase) ((ut = A7e(phase)), (l[3] = phase), (l[4] = ut));
  else ut = l[4];
  let Ie = ut,
    Vt;
  if (l[5] !== claudeAiLimits)
    ((Vt = canOfferLowPriority(claudeAiLimits)), (l[5] = claudeAiLimits), (l[6] = Vt));
  else Vt = l[6];
  let ae = Vt,
    phase_2 = yt(subscribeResetChanges, O7, O7).phase,
    phase_3 = yt(i9, s9, s9).phase,
    ct;
  if (l[7] !== claudeAiLimits)
    ((ct = () => jsonStringify(availableResetOffers(claudeAiLimits).map(rs))),
      (l[7] = claudeAiLimits),
      (l[8] = ct));
  else ct = l[8];
  let V = yt(i9, ct),
    Te = V !== "[]",
    ji = yt(i9, isClaimingReset),
    X;
  if (l[9] !== claudeAiLimits)
    ((X = () => canArmLowPriorityReset(claudeAiLimits)), (l[9] = claudeAiLimits), (l[10] = X));
  else X = l[10];
  let ps = yt(subscribeResetChanges, X),
    pt;
  if (l[11] !== claudeAiLimits)
    ((pt = () => resetsUsedUpLine(claudeAiLimits)), (l[11] = claudeAiLimits), (l[12] = pt));
  else pt = l[12];
  let Gt = yt(i9, pt),
    Ne;
  if (l[13] !== claudeAiLimits)
    ((Ne = () => usageCreditsSpentLine(claudeAiLimits)), (l[13] = claudeAiLimits), (l[14] = Ne));
  else Ne = l[14];
  let Yt = yt(subscribeResetChanges, Ne),
    phase_4 = yt(Jre, CWe, CWe).phase,
    B = yt(Jre, getOfferMenuSuffix, getOfferMenuSuffix),
    [ro, We] = y(!1),
    G = R(!1),
    Xe = R(!1),
    F = !Te && !ji && ps,
    H = Te || F ? void 0 : Gt,
    D = F || Te || H !== void 0 ? void 0 : Yt,
    [Zt, Ei] = y(!1),
    Be;
  if (l[15] === MEMO_CACHE_SENTINEL)
    ((Be = getFeatureValue_CACHED_MAY_BE_STALE(TENGU_PEWTER_SUMMIT, !1)), (l[15] = Be));
  else Be = l[15];
  let ei = Be,
    $e;
  if (l[16] !== claudeAiLimits.overageDisabledReason)
    (($e =
      ei &&
      !ve &&
      claudeAiLimits.overageDisabledReason === "org_level_disabled_until" &&
      isConsumerPlan() &&
      usageCreditsCommand.isEnabled()),
      (l[16] = claudeAiLimits.overageDisabledReason),
      (l[17] = $e));
  else $e = l[17];
  let ge = $e,
    [Y, ft] = y(null),
    Ji;
  if (l[18] !== claudeAiLimits.overageDisabledReason || l[19] !== context.credentials || l[20] !== ge)
    ((Ji = () => {
      if (!ge) {
        return;
      }
      let ti = !1;
      return (
        fetchPrepaidBalance(context.credentials)
          .then((Oe) => {
            if (ti || !Oe) {
              return;
            }
            if (
              yi({
                overageDisabledReason: claudeAiLimits.overageDisabledReason,
                balanceMinorUnits: Oe.amount,
              })
            )
              ft(Oe);
          })
          .catch(ss),
        () => {
          ti = !0;
        }
      );
    }),
      (l[18] = claudeAiLimits.overageDisabledReason),
      (l[19] = context.credentials),
      (l[20] = ge),
      (l[21] = Ji));
  else Ji = l[21];
  let M;
  if (l[22] !== ge) ((M = [ge]), (l[22] = ge), (l[23] = M));
  else M = l[23];
  P(Ji, M);
  let Ii;
  if (l[24] === MEMO_CACHE_SENTINEL) ((Ii = ve && !isConsumerPlan()), (l[24] = Ii));
  else Ii = l[24];
  let ii = Ii,
    ni = useIsScreenReaderEnabled(),
    Ni;
  if (l[25] !== claudeAiLimits.overageScope || l[26] !== ni || l[27] !== upgradePaths)
    ((Ni =
      ii &&
      Dtn(upgradePaths) &&
      !isBgSession() &&
      !ni &&
      claudeAiLimits.overageScope !== "group_pool" &&
      getUsageCreditsFlowConfig()?.mode === "one_step"),
      (l[25] = claudeAiLimits.overageScope),
      (l[26] = ni),
      (l[27] = upgradePaths),
      (l[28] = Ni));
  else Ni = l[28];
  let L = Ni,
    [le, oi] = y(null),
    Fe = R(null),
    He = R(!1),
    Ke,
    Wi;
  if (l[29] !== context.credentials || l[30] !== L)
    ((Ke = () => {
      if (!L || He.current) {
        return;
      }
      ((He.current = !0),
        runExtraUsage({ openInBrowser: !1 }, context.credentials)
          .then((Xi) => {
            ((Fe.current = Date.now()), oi(Xi));
          })
          .catch(as));
    }),
      (Wi = [L, context.credentials]),
      (l[29] = context.credentials),
      (l[30] = L),
      (l[31] = Ke),
      (l[32] = Wi));
  else ((Ke = l[31]), (Wi = l[32]));
  P(Ke, Wi);
  let Z = L && le?.type === "message" ? le.value : null,
    [gt, Bi] = y(!1),
    $i = R(!1),
    Fi = R(!1),
    Hi = R(null),
    hasBillingAccess = useInputClock(),
    Ki = R(null),
    Qi = R(null),
    { refusedWithin: refusedWithin, noteRefused: noteRefused } = useRefusalTracker(),
    Se;
  if (l[33] !== Z || l[34] !== upgradePaths || l[35] !== B) {
    Se = [];
    let fs = upgradePaths !== void 0;
    if (Dtn(upgradePaths)) {
      let so = qt ? "usage" : "usage credits";
      let Ue;
      if (ii) Ue = "Ask your admin for more usage";
      else if (((Ue = oo ? `Add funds to continue with ${so}` : `Switch to ${so}`), B !== void 0 && !qt))
        Ue = `${Ue} \xB7 ${B}`;
      let he;
      if (l[37] !== Z || l[38] !== Ue)
        ((he =
          Z !== null
            ? { label: Z, value: "extra-usage", disabled: !0 }
            : { label: Ue, value: "extra-usage" }),
          (l[37] = Z),
          (l[38] = Ue),
          (l[39] = he));
      else he = l[39];
      Se.push(he);
    }
    if (
      fs
        ? upgradePaths.includes("upgrade_plan") && upgradeCommand.isEnabled()
        : !J && !ve && upgradeCommand.isEnabled()
    ) {
      let he;
      if (l[40] === MEMO_CACHE_SENTINEL)
        ((he = { label: "Upgrade your plan", value: "upgrade" }), (l[40] = he));
      else he = l[40];
      Se.push(he);
    }
    ((l[33] = Z), (l[34] = upgradePaths), (l[35] = B), (l[36] = Se));
  } else Se = l[36];
  let he;
  if (l[41] === MEMO_CACHE_SENTINEL)
    ((he = { label: qt ? "Stop" : "Stop and wait for limit to reset", value: "cancel" }), (l[41] = he));
  else he = l[41];
  let ao = he,
    lo;
  if (l[42] !== label || l[43] !== lt || l[44] !== Ie)
    ((lo = Ie
      ? { label: "Don\u2019t continue automatically", value: "cancel-auto-resume" }
      : lt
        ? { label: label, value: "auto-resume" }
        : void 0),
      (l[42] = label),
      (l[43] = lt),
      (l[44] = Ie),
      (l[45] = lo));
  else lo = l[45];
  let ri = lo,
    K;
  if (l[46] !== ri || l[47] !== V || l[48] !== H || l[49] !== D || l[50] !== F || l[51] !== ae) {
    K = [];
    for (const [gs, hs] of gn().parse(jsonParse(V))) {
      let found = EWe.find((bs) => bs === gs);
      if (found !== void 0) K.push({ label: hs, value: `cedar-ember-${found}` });
    }
    if (V === "[]" && H !== void 0) {
      let O;
      if (l[53] !== H)
        ((O = { label: H, value: "cedar-ember-spent", disabled: !0 }), (l[53] = H), (l[54] = O));
      else O = l[54];
      K.push(O);
    }
    if (F) {
      let O;
      if (l[55] === MEMO_CACHE_SENTINEL)
        ((O = { label: getLimitResetCopy().label, value: "juniper-tide" }), (l[55] = O));
      else O = l[55];
      K.push(O);
    } else if (D !== void 0) {
      let O;
      if (l[56] !== D)
        ((O = { label: D, value: "juniper-tide-spent", disabled: !0 }), (l[56] = D), (l[57] = O));
      else O = l[57];
      K.push(O);
    }
    if (ri) K.push(ri);
    if (ae) {
      let O;
      if (l[58] === MEMO_CACHE_SENTINEL)
        ((O = { label: statusLineShouldDisplay().label, value: "low-priority" }), (l[58] = O));
      else O = l[58];
      K.push(O);
    }
    ((l[46] = ri), (l[47] = V), (l[48] = H), (l[49] = D), (l[50] = F), (l[51] = ae), (l[52] = K));
  } else K = l[52];
  let O;
  if (l[59] !== Se || l[60] !== L || l[61] !== K)
    ((O = ce && !L ? [...Se, ao, ...K] : [ao, ...K, ...Se]),
      (l[59] = Se),
      (l[60] = L),
      (l[61] = K),
      (l[62] = O));
  else O = l[62];
  let T = O,
    mo,
    co;
  if (l[63] !== T)
    ((mo = () => {
      let joined = T.map(ls).join(" ");
      if (Qi.current !== null && Qi.current !== joined) Ki.current = Date.now();
      Qi.current = joined;
    }),
      (co = [T]),
      (l[63] = T),
      (l[64] = mo),
      (l[65] = co));
  else ((mo = l[64]), (co = l[65]));
  zt(mo, co);
  let fo;
  if (l[66] !== hasBillingAccess || l[67] !== noteRefused || l[68] !== refusedWithin)
    ((fo = function Pe() {
      if (
        (Ki.current !== null && isWithinRecentInput(hasBillingAccess, Ki.current, So)) ||
        refusedWithin(So)
      ) {
        return (noteRefused(), !0);
      }
      return !1;
    }),
      (l[66] = hasBillingAccess),
      (l[67] = noteRefused),
      (l[68] = refusedWithin),
      (l[69] = fo));
  else fo = l[69];
  let Pe = fo,
    go = R(!1),
    ho,
    bo;
  if (l[70] !== claudeAiLimits || l[71] !== context.submittedFromComposer || l[72] !== T)
    ((ho = () => {
      if (go.current) {
        return;
      }
      ((go.current = !0),
        logEvent("tengu_rate_limit_options_menu_shown", {
          ...getRateLimitEventProps(claudeAiLimits),
          ...getCreditOfferForRateLimit(),
          entry: isFrozenMarker(context.submittedFromComposer) ? lit("typed") : lit("not_typed"),
          rows: T.map(ds),
          blocked: isAutoResumableLimit(claudeAiLimits),
        }));
    }),
      (bo = [claudeAiLimits, context.submittedFromComposer, T]),
      (l[70] = claudeAiLimits),
      (l[71] = context.submittedFromComposer),
      (l[72] = T),
      (l[73] = ho),
      (l[74] = bo));
  else ((ho = l[73]), (bo = l[74]));
  P(ho, bo);
  let Lo, yo;
  if (l[75] !== claudeAiLimits || l[76] !== ae)
    ((Lo = () => {
      if (ae) logLowPriorityShown(claudeAiLimits, "dialog");
    }),
      (yo = [ae, claudeAiLimits]),
      (l[75] = claudeAiLimits),
      (l[76] = ae),
      (l[77] = Lo),
      (l[78] = yo));
  else ((Lo = l[77]), (yo = l[78]));
  P(Lo, yo);
  let Ao, _o;
  if (l[79] !== claudeAiLimits || l[80] !== F)
    ((Ao = () => {
      if (F) logLimitResetOfferShown(claudeAiLimits, "dialog");
    }),
      (_o = [F, claudeAiLimits]),
      (l[79] = claudeAiLimits),
      (l[80] = F),
      (l[81] = Ao),
      (l[82] = _o));
  else ((Ao = l[81]), (_o = l[82]));
  P(Ao, _o);
  let wo, xo;
  if (l[83] !== claudeAiLimits || l[84] !== Te)
    ((wo = () => {
      if (Te) reportResetOfferShown(claudeAiLimits, "dialog");
    }),
      (xo = [Te, claudeAiLimits]),
      (l[83] = claudeAiLimits),
      (l[84] = Te),
      (l[85] = wo),
      (l[86] = xo));
  else ((wo = l[85]), (xo = l[86]));
  P(wo, xo);
  let vo;
  if (l[87] !== T || l[88] !== B)
    ((vo =
      B !== void 0 &&
      T.some((Gi) => Gi.value === "extra-usage" && typeof Gi.label === "string" && Gi.label.includes(B))),
      (l[87] = T),
      (l[88] = B),
      (l[89] = vo));
  else vo = l[89];
  let si = vo,
    Co,
    Do;
  if (l[90] !== si)
    ((Co = () => {
      if (si) logCreditOfferShown("cli_menu");
    }),
      (Do = [si]),
      (l[90] = si),
      (l[91] = Co),
      (l[92] = Do));
  else ((Co = l[91]), (Do = l[92]));
  P(Co, Do);
  let Mo = R(!1),
    To,
    Oo;
  if (l[93] !== claudeAiLimits || l[94] !== context.credentials || l[95] !== phase_2)
    ((To = () => {
      if (Mo.current || phase_2 !== "failed") {
        return;
      }
      ((Mo.current = !0), Qho(claudeAiLimits, context.credentials));
    }),
      (Oo = [phase_2, claudeAiLimits, context.credentials]),
      (l[93] = claudeAiLimits),
      (l[94] = context.credentials),
      (l[95] = phase_2),
      (l[96] = To),
      (l[97] = Oo));
  else ((To = l[96]), (Oo = l[97]));
  P(To, Oo);
  let Uo = R(!1),
    Po = R(!1),
    Ro,
    jo;
  if (l[98] !== phase_3 || l[99] !== claudeAiLimits || l[100] !== context.credentials)
    ((Ro = () => {
      if (phase_3 === "failed") {
        if (Uo.current) {
          return;
        }
        ((Uo.current = !0), refreshResetStatusForDialog(claudeAiLimits, context.credentials));
        return;
      }
      if (phase_3 === "answered" && !Po.current)
        ((Po.current = !0), refreshResetStatusForDialog(claudeAiLimits, context.credentials));
    }),
      (jo = [phase_3, claudeAiLimits, context.credentials]),
      (l[98] = phase_3),
      (l[99] = claudeAiLimits),
      (l[100] = context.credentials),
      (l[101] = Ro),
      (l[102] = jo));
  else ((Ro = l[101]), (jo = l[102]));
  P(Ro, jo);
  let Eo = R(!1),
    Jo,
    Io;
  if (l[103] !== claudeAiLimits || l[104] !== context.credentials || l[105] !== phase_4)
    ((Jo = () => {
      if (Eo.current || phase_4 !== "failed") {
        return;
      }
      Eo.current = retryOfferPrompt(claudeAiLimits, context.credentials);
    }),
      (Io = [phase_4, claudeAiLimits, context.credentials]),
      (l[103] = claudeAiLimits),
      (l[104] = context.credentials),
      (l[105] = phase_4),
      (l[106] = Jo),
      (l[107] = Io));
  else ((Jo = l[106]), (Io = l[107]));
  P(Jo, Io);
  let ht, bt, Lt, be, At, _t, wt, xt;
  if (
    l[108] !== Ce ||
    l[109] !== phase ||
    l[110] !== claudeAiLimits ||
    l[111] !== context ||
    l[112] !== onDone ||
    l[113] !== storageV5
  ) {
    ht = function ht() {
      logEvent("tengu_rate_limit_options_menu_select_auto_resume", {});
      let vt = Kt(claudeAiLimits, Ce);
      if (vt === null || !armQuotaAutoResumeFromDialog(vt, Date.now(), "dialog", storageV5)) {
        ai();
        return;
      }
      let { confirmationPhrase: confirmationPhrase } = getWaitOptionLabel(
        vt.resetsAt,
        vt.resetsAt !== void 0 && vt.resetsAt * 1000 <= Date.now(),
      );
      onDone(
        `Claude Code will continue automatically ${confirmationPhrase}. Keep this session open; it may still pause for permission prompts. Press esc to cancel the wait.`,
      );
    };
    let Ct;
    if (l[122] !== onDone)
      ((Ct = function _t() {
        logEvent("tengu_rate_limit_options_menu_select_low_priority", {});
        let No = enableLowPriorityMode("dialog");
        if (No === "unavailable") {
          onDone(lowPriorityUnavailableMessage());
          return;
        }
        onDone(lowPriorityOnMessage(No));
      }),
        (l[122] = onDone),
        (l[123] = Ct));
    else Ct = l[123];
    _t = Ct;
    let f;
    if (l[124] !== context.credentials || l[125] !== onDone)
      ((f = function At() {
        (logEvent("tengu_rate_limit_options_menu_select_juniper_tide", {}),
          Ei(!0),
          checkUsageCredits("dialog", context.credentials)
            .then((ys) => {
              onDone(ys.text);
            })
            .catch(() => {
              onDone(getLimitResetCopy().unavailableLine);
            }));
      }),
        (l[124] = context.credentials),
        (l[125] = onDone),
        (l[126] = f));
    else f = l[126];
    At = f;
    let q;
    if (l[127] !== context.credentials || l[128] !== onDone)
      ((q = function Lt(As) {
        if (G.current) {
          return;
        }
        ((G.current = !0),
          logEvent("tengu_rate_limit_options_menu_select_cedar_ember", {}),
          We(!0),
          startResetFlowSafe("dialog", context.credentials, As)
            .then((kt) => {
              if (Xe.current) {
                return;
              }
              switch (kt.kind) {
                case "answer": {
                  onDone(kt.result.text);
                  return;
                }
                case "confirm": {
                  me(
                    e(ResetLimits, {
                      offer: kt.offer,
                      entry: "dialog",
                      credentials: context.credentials,
                      onDone: (_s) => onDone(_s.text),
                    }),
                  );
                  return;
                }
                case "choose": {
                  me(
                    e(ResetLimitsOffers, {
                      offers: kt.offers,
                      unusable: kt.unusable,
                      entry: "dialog",
                      credentials: context.credentials,
                      onDone: (ws) => onDone(ws.text),
                    }),
                  );
                  return;
                }
              }
            })
            .catch(() => {
              onDone(RESET_STATUS_MESSAGES);
            }));
      }),
        (l[127] = context.credentials),
        (l[128] = onDone),
        (l[129] = q));
    else q = l[129];
    Lt = q;
    let ee;
    if (l[130] !== context || l[131] !== onDone)
      ((ee = function wt(xs) {
        (context.cancelRateLimitAutoQueueContinue?.(),
          logEvent("tengu_rate_limit_options_menu_select_extra_usage", getCreditOfferForRateLimit()),
          Bi(!0),
          fileAdminLimitRequest(xs, context.credentials)
            .then((Wo) => {
              (logEvent("tengu_rate_limit_options_menu_admin_ask", {
                filed: Wo.filed,
                mode: lit("one_step"),
              }),
                due(onDone)(Wo.value));
            })
            .catch(() => {
              onDone();
            }));
      }),
        (l[130] = context),
        (l[131] = onDone),
        (l[132] = ee));
    else ee = l[132];
    wt = ee;
    let qe;
    if (l[133] !== onDone)
      ((qe = function Dt() {
        (cancelQuotaAutoResume("dialog"),
          onDone(
            "Automatic continue cancelled. Your session will wait for you instead; /rate-limit-options can arm it again.",
          ));
      }),
        (l[133] = onDone),
        (l[134] = qe));
    else qe = l[134];
    let Dt = qe;
    let Re;
    if (l[135] !== Dt)
      ((Re = function bt() {
        (logEvent("tengu_rate_limit_options_menu_cancel_auto_resume", {}), Dt());
      }),
        (l[135] = Dt),
        (l[136] = Re));
    else Re = l[136];
    bt = Re;
    xt = function xt() {
      if ((logEvent("tengu_rate_limit_options_menu_cancel", {}), yUt() || phase === "stale")) {
        Dt();
        return;
      }
      ai();
    };
    be = function be() {
      (logEvent("tengu_rate_limit_options_menu_cancel", {}), ai());
    };
    function ai() {
      (context.prefillRateLimitAutoQueueContinue?.(), onDone(void 0, { display: "skip" }));
    }
    ((l[108] = Ce),
      (l[109] = phase),
      (l[110] = claudeAiLimits),
      (l[111] = context),
      (l[112] = onDone),
      (l[113] = storageV5),
      (l[114] = ht),
      (l[115] = bt),
      (l[116] = Lt),
      (l[117] = be),
      (l[118] = At),
      (l[119] = _t),
      (l[120] = wt),
      (l[121] = xt));
  } else
    ((ht = l[114]),
      (bt = l[115]),
      (Lt = l[116]),
      (be = l[117]),
      (At = l[118]),
      (_t = l[119]),
      (wt = l[120]),
      (xt = l[121]));
  let Ct;
  if (
    l[137] !== le ||
    l[138] !== context ||
    l[139] !== ht ||
    l[140] !== bt ||
    l[141] !== Lt ||
    l[142] !== At ||
    l[143] !== _t ||
    l[144] !== wt ||
    l[145] !== xt ||
    l[146] !== hasBillingAccess ||
    l[147] !== onDone ||
    l[148] !== L ||
    l[149] !== Pe
  )
    ((Ct = function li(value) {
      if (Pe()) {
        return;
      }
      if (value === "extra-usage" && L) {
        if ($i.current) {
          return;
        }
        $i.current = !0;
      }
      if (
        value === "extra-usage" &&
        L &&
        !Fi.current &&
        le?.type === "confirm-admin-request" &&
        le.checked &&
        Hi.current !== null &&
        Fe.current !== null &&
        hasBillingAccess() - Math.max(Hi.current, Fe.current) >= So
      ) {
        wt(le.extraUsage);
        return;
      }
      if (isUpgradeOption(value)) context.cancelRateLimitAutoQueueContinue?.();
      if (value === "upgrade")
        (logEvent("tengu_rate_limit_options_menu_select_upgrade", {}),
          callUpgradeFromSurface(onDone, context, "rate_limit_options_menu").then((jsx) => {
            if (jsx) me(jsx);
          }));
      else if (value === "extra-usage")
        (logEvent("tengu_rate_limit_options_menu_select_extra_usage", getCreditOfferForRateLimit()),
          call_2(onDone, context).then((jsx_0) => {
            if (jsx_0) me(jsx_0);
          }));
      else if (value === "auto-resume") ht();
      else if (value === "cancel-auto-resume") bt();
      else if (value === "low-priority") _t();
      else if (value === "juniper-tide") At();
      else if (value.startsWith("cedar-ember-")) {
        let found = EWe.find((vs) => value === `cedar-ember-${vs}`);
        if (found !== void 0) Lt(found);
      } else if (value === "cancel") xt();
    }),
      (l[137] = le),
      (l[138] = context),
      (l[139] = ht),
      (l[140] = bt),
      (l[141] = Lt),
      (l[142] = At),
      (l[143] = _t),
      (l[144] = wt),
      (l[145] = xt),
      (l[146] = hasBillingAccess),
      (l[147] = onDone),
      (l[148] = L),
      (l[149] = Pe),
      (l[150] = Ct));
  else Ct = l[150];
  let li = Ct;
  if (g) {
    return g;
  }
  if (ro) {
    let f;
    if (l[151] !== be)
      ((f = () => {
        ((Xe.current = !0), be());
      }),
        (l[151] = be),
        (l[152] = f));
    else f = l[152];
    let q;
    if (l[153] === MEMO_CACHE_SENTINEL) ((q = e(Text, { dimColor: !0, children: eJe })), (l[153] = q));
    else q = l[153];
    let ee;
    if (l[154] !== f)
      ((ee = e(Dialog, { title: "What do you want to do?", onCancel: f, color: "suggestion", children: q })),
        (l[154] = f),
        (l[155] = ee));
    else ee = l[155];
    return ee;
  }
  if (Zt) {
    let f;
    if (l[156] === MEMO_CACHE_SENTINEL)
      ((f = e(Dialog, {
        title: "What do you want to do?",
        onCancel: us,
        exitOnCtrlCD: !0,
        color: "suggestion",
        hideInputGuide: !0,
        children: e(Text, {
          dimColor: !0,
          children: "Resetting your 5-hour limit\u2026 this usually takes a few seconds",
        }),
      })),
        (l[156] = f));
    else f = l[156];
    return f;
  }
  if (gt) {
    let f;
    if (l[157] === MEMO_CACHE_SENTINEL)
      ((f = e(Dialog, {
        title: "What do you want to do?",
        onCancel: ms,
        exitOnCtrlCD: !0,
        color: "suggestion",
        hideInputGuide: !0,
        children: e(Text, { dimColor: !0, children: "Sending request to your admin\u2026" }),
      })),
        (l[157] = f));
    else f = l[157];
    return f;
  }
  if (Y) {
    let f;
    if (l[158] !== onDone) ((f = due(onDone)), (l[158] = onDone), (l[159] = f));
    else f = l[159];
    let q;
    if (l[160] !== context || l[161] !== Y || l[162] !== f)
      ((q = e(RateLimitOptionsMenu, { balance: Y, onDone: f, context: context })),
        (l[160] = context),
        (l[161] = Y),
        (l[162] = f),
        (l[163] = q));
    else q = l[163];
    return q;
  }
  let f, q;
  if (l[164] === MEMO_CACHE_SENTINEL)
    ((f = (Mt) => {
      if (!Mt.ctrl && !Mt.meta && (Mt.key.length === 1 || (Mt.key.length > 1 && Mt.name === "")))
        Fi.current = !0;
    }),
      (q = () => {
        Fi.current = !0;
      }),
      (l[164] = f),
      (l[165] = q));
  else ((f = l[164]), (q = l[165]));
  let ee;
  if (l[166] !== L)
    ((ee = (Cs) => {
      Hi.current = Cs === "extra-usage" && L ? Date.now() : null;
    }),
      (l[166] = L),
      (l[167] = ee));
  else ee = l[167];
  const qe = L ? cs : void 0;
  let Re;
  if (l[168] !== li || l[169] !== T || l[170] !== Pe || l[171] !== ee || l[172] !== qe)
    ((Re = e(Box, {
      flexDirection: "column",
      onKeyDownCapture: f,
      onPasteCapture: q,
      children: e(ModelSelector, {
        options: T,
        onChange: li,
        refuseInput: Pe,
        selectedValue: NO_COMMITTED_ROW,
        onFocus: ee,
        onUpFromFirstItem: qe,
        visibleOptionCount: T.length,
      }),
    })),
      (l[168] = li),
      (l[169] = T),
      (l[170] = Pe),
      (l[171] = ee),
      (l[172] = qe),
      (l[173] = Re));
  else Re = l[173];
  let Fo;
  if (l[174] !== be || l[175] !== Re)
    ((Fo = e(Dialog, { title: "What do you want to do?", onCancel: be, color: "suggestion", children: Re })),
      (l[174] = be),
      (l[175] = Re),
      (l[176] = Fo));
  else Fo = l[176];
  return Fo;
}
//@ chunk-dg94x42s.js:37678-38028 layout
function getWaitOptionLabel(k, d) {
  if (d) return { label: "Wait here, then continue automatically shortly", confirmationPhrase: "shortly" };
  let t = formatResetTime(k);
  if (t) return { label: `Wait here, then continue automatically at ${t}`, confirmationPhrase: `at ${t}` };
  return {
    label: "Wait here, then continue automatically when the limit resets",
    confirmationPhrase: "when your usage limit resets",
  };
}
//@ chunk-dg94x42s.js:38028-38095 layout
function Kt(k, d) {
  if (Fyt(k)) return k;
  return d !== null && Fyt(d) ? d : null;
}
/**
 * /rate-limit-options 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-dg94x42s.js:38095-38152 callgraph-fingerprint = call (1)
async function call(onDone, context) {
  return e(RateLimitOptionsMenu_2, { onDone: onDone, context: context });
}

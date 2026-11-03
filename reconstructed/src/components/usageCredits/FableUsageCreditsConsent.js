/**
 * components/usageCredits/FableUsageCreditsConsent.tsx
 *
 * 2.1.316 新增。Fable 模型使用额度同意。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (3)
 * attribution: placement 3
 */
import { firstWord as firstWord_2 } from "../../utils/model/thirdPartyModelDefaults.js";
import { useNotifyDialogClaimed } from "../permissions/PermissionRequestTitle.js";
import { Me } from "../design-system/ThemeProvider.js";
import { Q, y, R, P } from "../../../vendor/react/cjs/react.production.js";
import { due } from "../../services/quotaAutoResume/quotaAutoResume.js";
import { useInputClock } from "../../ink/components/Input.js";
import { useRefusableAnswer } from "../../hooks/useRefusableAnswer.js";
import { useInputRefusalWindow, useRefusalTracker, settleKey } from "../CustomSelect/selectTypeahead.js";
import { isWithinRecentInput } from "../../hooks/useRecentInputGuard.js";
import { fetchPrepaidBalance, RUo } from "../../services/api/billing.js";
import { checkExtraUsageStatus, enableOverageForConsent } from "../../services/api/overageConsent.js";
import {
  hasExtraUsageProvisioned,
  yst,
  isUsageCreditsModelBilled,
  Bdi,
  isConsumerPlan,
} from "../../utils/planTiers.js";
import { runExtraUsage, canPurchaseExtraUsage } from "../../commands/extra-usage/extra-usage-core.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { hS, AdminRequestConfirmDialog } from "./AdminRequestDialog.js";
import { isExtraUsageAllowed } from "../../utils/auth.js";
import {
  USAGE_CREDITS_NONINTERACTIVE_HINT,
  ADMIN_REQUEST_TIMEOUT_MS,
} from "../../services/api/adminRequests.js";
import { getUsageCreditsOnlyModelConsentDeclineFallback } from "../../utils/model/modelFallback.js";
import { renderModelName } from "../../utils/model/modelDisplay.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Dialog } from "../design-system/Dialog.js";
import { WorkerBadge } from "../permissions/WorkerBadge.js";
import { formatCurrency } from "../../services/api/referral.js";
import { Box, Text } from "../../ink/components/Text.js";
import { PCn } from "../../services/claudeAiLimits.js";
import { LearnMoreLink } from "../LearnMoreLink.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../CustomSelect/select.js";
import { ExtraUsageDialogEntry } from "./ExtraUsageDialog.js";
import { AwaitWork } from "./BuyCreditsFlow.js";
import { sleep } from "../../utils/sleep.js";

//@ chunk-18hwfzwa.js:1185083-1185164 placement
var LTo = "By continuing, you agree to turn on usage credits per our Help Center:";
/**
 * FableUsageCreditsConsent：使用 Fable 模型会消耗用量额度时的同意界面。
 */
//@ chunk-18hwfzwa.js:1185164-1191955 placement
function FableUsageCreditsConsent(h) {
  let {
      variant: variant,
      modelName: modelName = "Fable",
      model: model,
      onDone: onDone,
      startAtChooseForTesting: startAtChooseForTesting,
    } = h,
    Re = firstWord_2(modelName),
    Be = () => h.variant !== "mid-session" || h.wouldTakeAnswer(),
    He = useNotifyDialogClaimed(),
    { storageV5: storageV5, credentials: credentials } = Me(),
    Xe = Q(() => due(onDone), [onDone]),
    [rt, kt] = y(
      startAtChooseForTesting
        ? { s: "choose", blocked: !1, liveDefinite: !0, ...startAtChooseForTesting }
        : { s: "loading" },
    ),
    At = useInputClock(),
    [It, Ot] = y(rt.s),
    [Et, Dt] = y(0),
    Lt = useRefusableAnswer(() => Be());
  if (It !== rt.s) (Ot(rt.s), Dt(Date.now()));
  let oo = useInputRefusalWindow(),
    { refusedWithin: refusedWithin, noteRefused: noteRefused, epoch: epoch } = useRefusalTracker(),
    po = R(!1),
    ao = settleKey(`${Et}:${epoch}`);
  function co() {
    return (Et !== 0 && isWithinRecentInput(At, Et)) || refusedWithin();
  }
  function bo() {
    if (oo() || co()) return (noteRefused(), !0);
    return !1;
  }
  let Ao = R(null),
    Bo = R(null),
    Ro = R(null),
    Ho = R(!1),
    Io = R(!1);
  P(() => {
    if (rt.s === "loading") {
      let Xo = !1;
      return (
        (Ao.current ??= Promise.all([
          fetchPrepaidBalance(credentials).catch(() => null),
          checkExtraUsageStatus(credentials, storageV5).catch(() => "unknown"),
        ]).then(([Sn, $n]) => ({
          balance: Sn,
          overagesEnabled:
            $n === "enabled" || $n === "blocked" || ($n === "unknown" && hasExtraUsageProvisioned()),
          blocked: $n === "blocked",
          liveDefinite: $n !== "unknown",
        }))),
        Ao.current.then((Sn) => {
          if (Xo) return;
          kt({ s: "choose", ...Sn });
        }),
        () => {
          Xo = !0;
        }
      );
    }
    if (rt.s === "buy-external") {
      let Xo = !1;
      return (
        (Bo.current ??= runExtraUsage({ openInBrowser: !0 }, credentials)),
        Bo.current.then((Sn) => {
          if (Xo || Io.current) return;
          if (((Io.current = !0), Sn.type === "confirm-admin-request")) {
            if (isBgSession()) {
              (logFeatureSad("model_fable_consent", "overage_enable_deferred"),
                hS(() =>
                  Xe(
                    "dismiss",
                    isExtraUsageAllowed()
                      ? USAGE_CREDITS_NONINTERACTIVE_HINT
                      : "Contact your admin to manage usage credit settings.",
                  ),
                ));
              return;
            }
            kt({ s: "confirm-admin-request", extraUsage: Sn.extraUsage, needsSetup: rt.needsSetup });
            return;
          }
          (logFeatureSad("model_fable_consent", "overage_enable_deferred"),
            hS(() =>
              Xe(
                "dismiss",
                Sn.type === "message"
                  ? Sn.value
                  : Sn.opened
                    ? `Opened ${Sn.url} in your browser to ${rt.needsSetup ? "turn on" : "manage"} usage credits. Once ${rt.needsSetup ? "enabled" : "topped up"}, run /model to switch to ${modelName}.`
                    : `Visit ${Sn.url} to ${rt.needsSetup ? "turn on" : "manage"} usage credits. Once ${rt.needsSetup ? "enabled" : "topped up"}, run /model to switch to ${modelName}.`,
              ),
            ));
        }),
        () => {
          Xo = !0;
        }
      );
    }
  }, [rt.s, Xe, credentials, storageV5]);
  function Wo() {
    if (Xe("consent") === !1) return;
    (yst(Re, storageV5), logFeatureOk("model_fable_consent"));
  }
  function mn(Xo, Sn) {
    if (!Be()) return;
    if ((He(), canPurchaseExtraUsage())) kt({ s: "buy", needsSetup: Xo, skipLiveCheck: Xo && Sn });
    else kt({ s: "buy-external", needsSetup: Xo });
  }
  function Cn() {
    if (!Be()) return;
    if (po.current) return;
    ((po.current = !0),
      He(),
      kt({
        s: "reenabling",
        work: enableOverageForConsent({ credentials: credentials, storageV5: storageV5 }),
      }));
  }
  function No() {
    if (Xe("switch") === !1) return;
    logFeatureBad("model_fable_consent", "declined");
  }
  function vo() {
    if (Xe("upgrade") === !1) return;
    logFeatureSad("model_fable_consent", "upsell_selected");
  }
  function Yo() {
    if (oo() || co()) {
      noteRefused();
      return;
    }
    if (Xe("dismiss") === !1) return;
    logFeatureSad("model_fable_consent", "dismissed");
  }
  let kn = getUsageCreditsOnlyModelConsentDeclineFallback(),
    Fn =
      variant === "mid-session" && kn !== null
        ? `Switch to ${renderModelName(kn)} and continue`
        : variant === "mid-session"
          ? "Not now"
          : "No, keep my current model",
    [bn] = y(() => isUsageCreditsModelBilled(model)),
    Go = Re === "Fable" && variant === "mid-session" && !bn,
    [hn] = y(() => Re === "Fable" && (variant === "picker" || !isBgSession()) && bn && Bdi()),
    Mn =
      variant === "picker"
        ? `Switch to ${modelName}?`
        : Go
          ? "You've reached your Fable limit"
          : `${modelName} now uses usage credits`;
  switch (rt.s) {
    case "loading":
      return e(Dialog, {
        title: Mn,
        color: "warning",
        onCancel: Yo,
        children: e(WorkerBadge, { message: "Checking usage credits\u2026" }),
      });
    case "choose": {
      let {
          balance: balance,
          overagesEnabled: overagesEnabled,
          blocked: blocked,
          liveDefinite: liveDefinite,
        } = rt,
        _o = balance?.amount ?? 0,
        cn = balance?.currency ?? "USD",
        Dn = !overagesEnabled,
        wn = Dn && _o > 0,
        mr = overagesEnabled && balance === null,
        Kn = overagesEnabled && _o > 0,
        Wn = !blocked && (Kn || mr),
        Fr = canPurchaseExtraUsage(),
        Zn = isConsumerPlan()
          ? Dn
            ? "Set up usage credits on claude.ai"
            : "Manage usage credits on claude.ai"
          : Dn
            ? "Request usage credits from your admin"
            : "Request more from your admin",
        Un = Go
          ? `You've used your included Fable usage for this week. Continuing on ${modelName} uses usage credits`
          : `${modelName} runs on usage credits`,
        dr =
          (Dn && !wn) || mr
            ? `${Un}, purchased separately from your plan.`
            : `${Un} \u2014 you have ${formatCurrency(Kn || wn ? _o : 0, cn)} in credits.`,
        or = Wn
          ? `Continue with ${modelName}`
          : wn && Fr
            ? "Yes, re-enable and continue"
            : Fr
              ? Dn
                ? "Yes, buy usage credits"
                : "Buy usage credits"
              : Zn,
        pr = hn ? { label: "Upgrade to Max", value: "upsell" } : null,
        Qn = !1,
        ur = !1,
        Ir = formatCurrency(RUo, "USD", "whole");
      return e(Dialog, {
        title: Mn,
        color: "warning",
        onCancel: Yo,
        children: r(Box, {
          flexDirection: "column",
          gap: 1,
          marginBottom: 1,
          children: [
            r(Text, { children: [dr, ""] }),
            wn
              ? r(Text, {
                  dimColor: !0,
                  children: ["Usage credits are turned off. Re-enable to use ", modelName, "."],
                })
              : Dn
                ? r(Fragment, {
                    children: [
                      e(Text, { dimColor: !0, children: "You don't have usage credits yet." }),
                      Fr &&
                        r(Fragment, {
                          children: [
                            r(Text, {
                              dimColor: !0,
                              children: [
                                "Starts with a ",
                                Ir,
                                " monthly limit \xB7 run /usage-credits to adjust",
                              ],
                            }),
                            r(Text, { dimColor: !0, children: [LTo, " ", PCn] }),
                          ],
                        }),
                    ],
                  })
                : e(LearnMoreLink, { url: PCn }),
            e(
              ModelSelector,
              {
                options: [
                  { label: Fn, value: "switch" },
                  { label: or, value: "confirm" },
                  ...(pr ? [pr] : []),
                ],
                selectedValue: NO_COMMITTED_ROW,
                refuseInput: bo,
                hideIndexes: !0,
                defaultFocusValue: "switch",
                onChange: (Pr) => {
                  if (co()) {
                    (Lt.refuse(Pr), noteRefused());
                    return;
                  }
                  if (!Lt.answer(Pr)) return;
                  if (Pr === "switch") return No();
                  if (Pr === "upsell") return hn ? vo() : void 0;
                  if (Wn) return Wo();
                  if (wn && Fr) return Cn();
                  return mn(Dn && !wn, liveDefinite);
                },
                onCancel: Yo,
              },
              `${Lt.attempts}-${ao.remountKey}`,
            ),
          ],
        }),
      });
    }
    case "buy":
      return e(ExtraUsageDialogEntry, {
        initialStep: "buy_select",
        entryReason: "fable",
        onBeforePurchase: rt.needsSetup
          ? () =>
              enableOverageForConsent({
                skipLiveCheck: rt.skipLiveCheck,
                credentials: credentials,
                storageV5: storageV5,
              })
          : void 0,
        onPurchaseSuccess: (Xo) => {
          (yst(Re, storageV5), logFeatureOk("model_fable_consent"), hS(() => Xe("consent", Xo)));
        },
        onDone: (Xo) => {
          if (typeof Xo === "string") {
            (logFeatureSad("model_fable_consent", "buy_fallback"), hS(() => Xe("dismiss", Xo)));
            return;
          }
          ((Ao.current = null), kt({ s: "loading" }));
        },
      });
    case "reenabling":
      return e(Dialog, {
        title: Mn,
        color: "warning",
        onCancel: Yo,
        children: e(AwaitWork, {
          message: "Turning on usage credits\u2026",
          work: rt.work,
          failure: !1,
          onDone: (Xo) => {
            if (Xo) (yst(Re, storageV5), logFeatureOk("model_fable_consent"), hS(() => Xe("consent")));
            else
              (logFeatureSad("model_fable_consent", "reenable_failed"),
                hS(() => Xe("dismiss", "Couldn't turn on usage credits. Run /usage-credits to try again.")));
          },
        }),
      });
    case "granted":
      return e(Dialog, {
        title: Mn,
        color: "warning",
        onCancel: () => {
          if (oo() || co()) {
            noteRefused();
            return;
          }
          if (Ho.current) return;
          if (Xe("dismiss", usageCreditsBlockedText(rt.line, "unknown", modelName)) === !1) return;
          ((Ho.current = !0), logFeatureSad("model_fable_consent", "dismissed"));
        },
        children: e(Box, {
          paddingTop: 1,
          children: e(WorkerBadge, { message: `${rt.line} Checking usage credits\u2026` }),
        }),
      });
    case "buy-external":
      return e(Dialog, {
        title: Mn,
        color: "warning",
        onCancel: Yo,
        children: e(WorkerBadge, {
          message: rt.needsSetup ? "Setting up usage credits\u2026" : "Opening usage credits\u2026",
        }),
      });
    case "confirm-admin-request":
      return e(AdminRequestConfirmDialog, {
        extraUsage: rt.extraUsage,
        wouldTakeAnswer: Be,
        onDone: (Xo) => {
          let Sn = Ro.current;
          if (Sn === null) return Xe("dismiss", Xo);
          return (
            He(),
            kt({ s: "granted", line: Sn }),
            sleep(ADMIN_REQUEST_TIMEOUT_MS)
              .then(() => checkExtraUsageStatus(credentials, storageV5))
              .catch(() => "unknown")
              .then(($n) => {
                if (Ho.current) return;
                if (((Ho.current = !0), $n === "enabled")) {
                  (yst(Re, storageV5), logFeatureOk("model_fable_consent"), hS(() => Xe("consent", Sn)));
                  return;
                }
                (logFeatureSad(
                  "model_fable_consent",
                  $n === "disabled"
                    ? "overage_enable_deferred"
                    : $n === "blocked"
                      ? "credits_blocked"
                      : "credits_unconfirmed",
                ),
                  hS(() => Xe("dismiss", usageCreditsBlockedText(Sn, $n, modelName))));
              }),
            !0
          );
        },
        onOutcome: (Xo) => {
          switch (Xo.outcome) {
            case "granted":
              Ro.current = Xo.grantLine;
              return;
            case "filed":
              logFeatureSad("model_fable_consent", "overage_enable_deferred");
              return;
            case "failed":
              logFeatureBad("model_fable_consent", "admin_request_failed");
              return;
            case "cancelled":
              logFeatureSad("model_fable_consent", "dismissed");
              return;
          }
        },
      });
  }
}
//@ chunk-18hwfzwa.js:1191955-1192350 placement
function usageCreditsBlockedText(h, x, D) {
  switch (x) {
    case "disabled":
      return `${h} Usage credits aren't on for your organization yet. Ask your admin to turn them on, then run /model to switch to ${D}.`;
    case "blocked":
      return `${h} Your organization's usage credits are capped or used up right now. Run /model to switch to ${D} once they're available.`;
    case "enabled":
    case "unknown":
      return `${h} Run /model to switch to ${D}.`;
  }
}

export { FableUsageCreditsConsent };

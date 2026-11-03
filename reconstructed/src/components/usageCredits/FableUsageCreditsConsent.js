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
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { Q, y, R, P } from "../../../vendor/react/cjs/react.production.js";
import { withQuotaResumeFire } from "../../services/quotaAutoResume/quotaAutoResume.js";
import { useInputClock } from "../../ink/components/Input.js";
import { useRefusableAnswer } from "../../hooks/useRefusableAnswer.js";
import { useInputRefusalWindow, useRefusalTracker, settleKey } from "../CustomSelect/selectTypeahead.js";
import { isWithinRecentInput } from "../../hooks/useRecentInputGuard.js";
import { fetchPrepaidBalance, DEFAULT_MONTHLY_SPEND_LIMIT } from "../../services/api/billing.js";
import { checkExtraUsageStatus, enableOverageForConsent } from "../../services/api/overageConsent.js";
import {
  hasExtraUsageProvisioned,
  saveModelConsent,
  isUsageCreditsModelBilled,
  saffronLadderOn,
  isConsumerPlan,
} from "../../utils/planTiers.js";
import { runExtraUsage, canPurchaseExtraUsage } from "../../commands/extra-usage/extra-usage-core.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { resolveWhenTaken, AdminRequestConfirmDialog } from "./AdminRequestDialog.js";
import { isExtraUsageAllowed } from "../../utils/auth.js";
import {
  USAGE_CREDITS_NONINTERACTIVE_HINT,
  ADMIN_REQUEST_TIMEOUT_MS,
} from "../../services/api/adminRequests.js";
import { getUsageCreditsOnlyModelConsentDeclineFallback } from "../../utils/model/modelFallback.js";
import { renderModelName } from "../../utils/model/modelDisplay.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Dialog } from "../design-system/Dialog.js";
import { WorkerBadge } from "../permissions/WorkerBadge.js";
import { formatCurrency } from "../../services/api/referral.js";
import { Box, Text } from "../../ink/components/Text.js";
import { EXTRA_USAGE_HELP_URL } from "../../services/claudeAiLimits.js";
import { LearnMoreLink } from "../LearnMoreLink.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../CustomSelect/select.js";
import { ExtraUsageDialogEntry } from "./ExtraUsageDialog.js";
import { AwaitWork } from "./BuyCreditsFlow.js";
import { sleep } from "../../utils/sleep.js";

//@ chunk-18hwfzwa.js:1185083-1185164 placement
var CREDITS_CONSENT_TEXT = "By continuing, you agree to turn on usage credits per our Help Center:";
//@ chunk-18hwfzwa.js:1185164-1191955 placement
/**
 * FableUsageCreditsConsent：使用 Fable 模型会消耗用量额度时的同意界面。
 */
function FableUsageCreditsConsent(props) {
  let { variant, modelName = "Fable", model, onDone, startAtChooseForTesting } = props;
  let Re = firstWord_2(modelName);
  let Be = () => props.variant !== "mid-session" || props.wouldTakeAnswer();
  let notifyDialogClaimed = useNotifyDialogClaimed();
  let { storageV5, credentials } = useTheme_2();
  let Xe = Q(() => withQuotaResumeFire(onDone), [onDone]);
  let [rt, kt] = y(
    startAtChooseForTesting
      ? {
          s: "choose",
          blocked: false,
          liveDefinite: true,
          ...startAtChooseForTesting,
        }
      : {
          s: "loading",
        },
  );
  let inputClock = useInputClock();
  let [It, Ot] = y(rt.s);
  let [Et, Dt] = y(0);
  let Lt = useRefusableAnswer(() => Be());
  if (It !== rt.s) {
    Ot(rt.s);
    Dt(Date.now());
  }
  let inputRefusalWindow = useInputRefusalWindow();
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let po = R(false);
  let ao = settleKey(`${Et}:${epoch}`);
  function co() {
    return (Et !== 0 && isWithinRecentInput(inputClock, Et)) || refusedWithin();
  }
  function bo() {
    if (inputRefusalWindow() || co()) {
      noteRefused();
      return true;
    }
    return false;
  }
  let Ao = R(null);
  let Bo = R(null);
  let grantLineRef = R(null);
  let Ho = R(false);
  let Io = R(false);
  P(() => {
    if (rt.s === "loading") {
      let Xo = false;
      Ao.current ??= Promise.all([
        fetchPrepaidBalance(credentials).catch(() => null),
        checkExtraUsageStatus(credentials, storageV5).catch(() => "unknown"),
      ]).then(([Sn, $n]) => ({
        balance: Sn,
        overagesEnabled:
          $n === "enabled" || $n === "blocked" || ($n === "unknown" && hasExtraUsageProvisioned()),
        blocked: $n === "blocked",
        liveDefinite: $n !== "unknown",
      }));
      Ao.current.then((Sn) => {
        if (Xo) return;
        kt({
          s: "choose",
          ...Sn,
        });
      });
      return () => {
        Xo = true;
      };
    }
    if (rt.s === "buy-external") {
      let Xo = false;
      Bo.current ??= runExtraUsage(
        {
          openInBrowser: true,
        },
        credentials,
      );
      Bo.current.then((Sn) => {
        if (Xo || Io.current) return;
        Io.current = true;
        if (Sn.type === "confirm-admin-request") {
          if (isBgSession()) {
            logFeatureSad("model_fable_consent", "overage_enable_deferred");
            resolveWhenTaken(() =>
              Xe(
                "dismiss",
                isExtraUsageAllowed()
                  ? USAGE_CREDITS_NONINTERACTIVE_HINT
                  : "Contact your admin to manage usage credit settings.",
              ),
            );
            return;
          }
          kt({
            s: "confirm-admin-request",
            extraUsage: Sn.extraUsage,
            needsSetup: rt.needsSetup,
          });
          return;
        }
        logFeatureSad("model_fable_consent", "overage_enable_deferred");
        resolveWhenTaken(() =>
          Xe(
            "dismiss",
            Sn.type === "message"
              ? Sn.value
              : Sn.opened
                ? `Opened ${Sn.url} in your browser to ${rt.needsSetup ? "turn on" : "manage"} usage credits. Once ${rt.needsSetup ? "enabled" : "topped up"}, run /model to switch to ${modelName}.`
                : `Visit ${Sn.url} to ${rt.needsSetup ? "turn on" : "manage"} usage credits. Once ${rt.needsSetup ? "enabled" : "topped up"}, run /model to switch to ${modelName}.`,
          ),
        );
      });
      return () => {
        Xo = true;
      };
    }
  }, [rt.s, Xe, credentials, storageV5]);
  function Wo() {
    if (Xe("consent") === false) return;
    saveModelConsent(Re, storageV5);
    logFeatureOk("model_fable_consent");
  }
  function mn(Xo, liveDefinite) {
    if (!Be()) return;
    notifyDialogClaimed();
    if (canPurchaseExtraUsage())
      kt({
        s: "buy",
        needsSetup: Xo,
        skipLiveCheck: Xo && liveDefinite,
      });
    else
      kt({
        s: "buy-external",
        needsSetup: Xo,
      });
  }
  function Cn() {
    if (!Be()) return;
    if (po.current) return;
    po.current = true;
    notifyDialogClaimed();
    kt({
      s: "reenabling",
      work: enableOverageForConsent({
        credentials,
        storageV5,
      }),
    });
  }
  function No() {
    if (Xe("switch") === false) return;
    logFeatureBad("model_fable_consent", "declined");
  }
  function vo() {
    if (Xe("upgrade") === false) return;
    logFeatureSad("model_fable_consent", "upsell_selected");
  }
  function Yo() {
    if (inputRefusalWindow() || co()) {
      noteRefused();
      return;
    }
    if (Xe("dismiss") === false) return;
    logFeatureSad("model_fable_consent", "dismissed");
  }
  let kn = getUsageCreditsOnlyModelConsentDeclineFallback();
  let label =
    variant === "mid-session" && kn !== null
      ? `Switch to ${renderModelName(kn)} and continue`
      : variant === "mid-session"
        ? "Not now"
        : "No, keep my current model";
  let [bn] = y(() => isUsageCreditsModelBilled(model));
  let Go = Re === "Fable" && variant === "mid-session" && !bn;
  let [hn] = y(() => Re === "Fable" && (variant === "picker" || !isBgSession()) && bn && saffronLadderOn());
  let title =
    variant === "picker"
      ? `Switch to ${modelName}?`
      : Go
        ? "You've reached your Fable limit"
        : `${modelName} now uses usage credits`;
  switch (rt.s) {
    case "loading":
      return jsxProd_default(Dialog, {
        title,
        color: "warning",
        onCancel: Yo,
        children: jsxProd_default(WorkerBadge, {
          message: "Checking usage credits\u2026",
        }),
      });
    case "choose": {
      let { balance, overagesEnabled, blocked, liveDefinite } = rt;
      let amount = balance?.amount ?? 0;
      let currency = balance?.currency ?? "USD";
      let Dn = !overagesEnabled;
      let wn = Dn && amount > 0;
      let mr = overagesEnabled && balance === null;
      let Kn = overagesEnabled && amount > 0;
      let Wn = !blocked && (Kn || mr);
      let Fr = canPurchaseExtraUsage();
      let Zn = isConsumerPlan()
        ? Dn
          ? "Set up usage credits on claude.ai"
          : "Manage usage credits on claude.ai"
        : Dn
          ? "Request usage credits from your admin"
          : "Request more from your admin";
      let Un = Go
        ? `You've used your included Fable usage for this week. Continuing on ${modelName} uses usage credits`
        : `${modelName} runs on usage credits`;
      let dr =
        (Dn && !wn) || mr
          ? `${Un}, purchased separately from your plan.`
          : `${Un} \u2014 you have ${formatCurrency(Kn || wn ? amount : 0, currency)} in credits.`;
      let label_2 = Wn
        ? `Continue with ${modelName}`
        : wn && Fr
          ? "Yes, re-enable and continue"
          : Fr
            ? Dn
              ? "Yes, buy usage credits"
              : "Buy usage credits"
            : Zn;
      let pr = hn
        ? {
            label: "Upgrade to Max",
            value: "upsell",
          }
        : null;
      let Qn = false;
      let ur = false;
      let Ir = formatCurrency(DEFAULT_MONTHLY_SPEND_LIMIT, "USD", "whole");
      return jsxProd_default(Dialog, {
        title,
        color: "warning",
        onCancel: Yo,
        children: jsxProd_default_2(Box, {
          flexDirection: "column",
          gap: 1,
          marginBottom: 1,
          children: [
            jsxProd_default_2(Text, {
              children: [dr, ""],
            }),
            wn
              ? jsxProd_default_2(Text, {
                  dimColor: true,
                  children: ["Usage credits are turned off. Re-enable to use ", modelName, "."],
                })
              : Dn
                ? jsxProd_default_2(Fragment, {
                    children: [
                      jsxProd_default(Text, {
                        dimColor: true,
                        children: "You don't have usage credits yet.",
                      }),
                      Fr &&
                        jsxProd_default_2(Fragment, {
                          children: [
                            jsxProd_default_2(Text, {
                              dimColor: true,
                              children: [
                                "Starts with a ",
                                Ir,
                                " monthly limit \xB7 run /usage-credits to adjust",
                              ],
                            }),
                            jsxProd_default_2(Text, {
                              dimColor: true,
                              children: [CREDITS_CONSENT_TEXT, " ", EXTRA_USAGE_HELP_URL],
                            }),
                          ],
                        }),
                    ],
                  })
                : jsxProd_default(LearnMoreLink, {
                    url: EXTRA_USAGE_HELP_URL,
                  }),
            jsxProd_default(
              ModelSelector,
              {
                options: [
                  {
                    label,
                    value: "switch",
                  },
                  {
                    label: label_2,
                    value: "confirm",
                  },
                  ...(pr ? [pr] : []),
                ],
                selectedValue: NO_COMMITTED_ROW,
                refuseInput: bo,
                hideIndexes: true,
                defaultFocusValue: "switch",
                onChange: (Pr) => {
                  if (co()) {
                    Lt.refuse(Pr);
                    noteRefused();
                    return;
                  }
                  if (!Lt.answer(Pr)) return;
                  if (Pr === "switch") return No();
                  if (Pr === "upsell") return hn ? vo() : undefined;
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
      return jsxProd_default(ExtraUsageDialogEntry, {
        initialStep: "buy_select",
        entryReason: "fable",
        onBeforePurchase: rt.needsSetup
          ? () =>
              enableOverageForConsent({
                skipLiveCheck: rt.skipLiveCheck,
                credentials,
                storageV5,
              })
          : undefined,
        onPurchaseSuccess: (Xo) => {
          saveModelConsent(Re, storageV5);
          logFeatureOk("model_fable_consent");
          resolveWhenTaken(() => Xe("consent", Xo));
        },
        onDone: (Xo) => {
          if (typeof Xo === "string") {
            logFeatureSad("model_fable_consent", "buy_fallback");
            resolveWhenTaken(() => Xe("dismiss", Xo));
            return;
          }
          Ao.current = null;
          kt({
            s: "loading",
          });
        },
      });
    case "reenabling":
      return jsxProd_default(Dialog, {
        title,
        color: "warning",
        onCancel: Yo,
        children: jsxProd_default(AwaitWork, {
          message: "Turning on usage credits\u2026",
          work: rt.work,
          failure: false,
          onDone: (Xo) => {
            if (Xo) {
              saveModelConsent(Re, storageV5);
              logFeatureOk("model_fable_consent");
              resolveWhenTaken(() => Xe("consent"));
            } else {
              logFeatureSad("model_fable_consent", "reenable_failed");
              resolveWhenTaken(() =>
                Xe("dismiss", "Couldn't turn on usage credits. Run /usage-credits to try again."),
              );
            }
          },
        }),
      });
    case "granted":
      return jsxProd_default(Dialog, {
        title,
        color: "warning",
        onCancel: () => {
          if (inputRefusalWindow() || co()) {
            noteRefused();
            return;
          }
          if (Ho.current) return;
          if (Xe("dismiss", usageCreditsBlockedText(rt.line, "unknown", modelName)) === false) return;
          Ho.current = true;
          logFeatureSad("model_fable_consent", "dismissed");
        },
        children: jsxProd_default(Box, {
          paddingTop: 1,
          children: jsxProd_default(WorkerBadge, {
            message: `${rt.line} Checking usage credits\u2026`,
          }),
        }),
      });
    case "buy-external":
      return jsxProd_default(Dialog, {
        title,
        color: "warning",
        onCancel: Yo,
        children: jsxProd_default(WorkerBadge, {
          message: rt.needsSetup ? "Setting up usage credits\u2026" : "Opening usage credits\u2026",
        }),
      });
    case "confirm-admin-request":
      return jsxProd_default(AdminRequestConfirmDialog, {
        extraUsage: rt.extraUsage,
        wouldTakeAnswer: Be,
        onDone: (Xo) => {
          let Sn = grantLineRef.current;
          if (Sn === null) return Xe("dismiss", Xo);
          notifyDialogClaimed();
          kt({
            s: "granted",
            line: Sn,
          });
          sleep(ADMIN_REQUEST_TIMEOUT_MS)
            .then(() => checkExtraUsageStatus(credentials, storageV5))
            .catch(() => "unknown")
            .then(($n) => {
              if (Ho.current) return;
              Ho.current = true;
              if ($n === "enabled") {
                saveModelConsent(Re, storageV5);
                logFeatureOk("model_fable_consent");
                resolveWhenTaken(() => Xe("consent", Sn));
                return;
              }
              logFeatureSad(
                "model_fable_consent",
                $n === "disabled"
                  ? "overage_enable_deferred"
                  : $n === "blocked"
                    ? "credits_blocked"
                    : "credits_unconfirmed",
              );
              resolveWhenTaken(() => Xe("dismiss", usageCreditsBlockedText(Sn, $n, modelName)));
            });
          return true;
        },
        onOutcome: (Xo) => {
          switch (Xo.outcome) {
            case "granted":
              grantLineRef.current = Xo.grantLine;
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
function usageCreditsBlockedText(h, x, modelName) {
  switch (x) {
    case "disabled":
      return `${h} Usage credits aren't on for your organization yet. Ask your admin to turn them on, then run /model to switch to ${modelName}.`;
    case "blocked":
      return `${h} Your organization's usage credits are capped or used up right now. Run /model to switch to ${modelName} once they're available.`;
    case "enabled":
    case "unknown":
      return `${h} Run /model to switch to ${modelName}.`;
  }
}
export { FableUsageCreditsConsent };

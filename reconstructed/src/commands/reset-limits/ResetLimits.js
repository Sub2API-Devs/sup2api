/**
 * commands/reset-limits/ResetLimits.tsx
 *
 * 2.1.316 新增：/reset-limits：用周额度立即重置 5 小时额度的界面
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q8p98373.js (6)
 * attribution: placement 6
 */
import {
  init_react_production,
  useState,
  useRef,
  useEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  startResetFlowSafe,
  isResetOfferAvailable,
  isClaimingReset,
  canArmLowPriorityReset,
  RESET_STATUS_MESSAGES,
  CHECKING_FOR_RESET_LINE,
} from "../../services/rateLimit/rateLimitWall.js";
import { getCurrentLimits } from "../../services/claudeAiLimits.js";
import { isLimitResetEnabled, LIMIT_RESET, isCedarEmberEnabled } from "../limit-reset/index.js";
import { checkUsageCredits } from "../../components/rateLimit/usageCreditsOffer.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ResetLimitsOffers, ResetLimits } from "../rate-limit-options/ResetLimits.js";
import { Text } from "../../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { LIMIT_CATEGORIES } from "../../components/rateLimit/quotaAutoResume.js";

//@ chunk-q8p98373.js:13956-13960 placement
init_react_production();
//@ chunk-q8p98373.js:13960-15829 placement
function ResetLimitsView(props) {
  let $ = useMemoCache(26);
  let { onDone, credentials, kind } = props;
  let [flowState, setFlowState] = useState(null);
  let [phase, setPhase] = useState("idle");
  let startedRef = useRef(false);
  let cancelledRef = useRef(false);
  let finishedRef = useRef(false);
  let startFlowEffect;
  let startFlowDeps;
  if ($[0] !== credentials || $[1] !== kind || $[2] !== onDone) {
    startFlowEffect = () => {
      if (startedRef.current) {
        return;
      }
      startedRef.current = true;
      startResetFlowSafe("command", credentials, kind)
        .then(async (resetFlow) => {
          if (cancelledRef.current) {
            return;
          }
          finishedRef.current = true;
          if (resetFlow.kind === "confirm" || resetFlow.kind === "choose") {
            setFlowState(resetFlow);
            return;
          }
          let resetResult = resetFlow.result;
          let limits = getCurrentLimits();
          if (!(
            kind === undefined &&
            isLimitResetEnabled() &&
            !isResetOfferAvailable(limits) &&
            !isClaimingReset()
          )) {
            let shouldHintUsage =
              kind !== undefined &&
              resetResult.outcome === "not_offered" &&
              isLimitResetEnabled() &&
              canArmLowPriorityReset(limits);
            finishWithSystemMessage(
              onDone,
              shouldHintUsage ? `${resetResult.text} \xB7 ${RESET_LIMITS_USAGE_HINT}` : resetResult.text,
            );
            return;
          }
          setPhase(canArmLowPriorityReset(limits) ? "claiming" : "asking");
          let creditsResult = await checkUsageCredits("command", credentials);
          finishWithSystemMessage(
            onDone,
            creditsResult.outcome === "not_offered" ? resetResult.text : creditsResult.text,
          );
        })
        .catch(() => {
          finishWithSystemMessage(onDone, RESET_STATUS_MESSAGES);
        });
    };
    startFlowDeps = [credentials, onDone, kind];
    $[0] = credentials;
    $[1] = kind;
    $[2] = onDone;
    $[3] = startFlowEffect;
    $[4] = startFlowDeps;
  } else {
    startFlowEffect = $[3];
    startFlowDeps = $[4];
  }
  useEffect(startFlowEffect, startFlowDeps);
  if (flowState?.kind === "choose") {
    let onDone_2;
    if ($[5] !== onDone) {
      onDone_2 = (offerResult) => finishWithSystemMessage(onDone, offerResult.text);
      $[5] = onDone;
      $[6] = onDone_2;
    } else onDone_2 = $[6];
    let offersView;
    if (
      $[7] !== credentials ||
      $[8] !== flowState.offers ||
      $[9] !== flowState.unusable ||
      $[10] !== onDone_2
    ) {
      offersView = jsxProd_default(ResetLimitsOffers, {
        offers: flowState.offers,
        unusable: flowState.unusable,
        entry: "command",
        credentials,
        onDone: onDone_2,
      });
      $[7] = credentials;
      $[8] = flowState.offers;
      $[9] = flowState.unusable;
      $[10] = onDone_2;
      $[11] = offersView;
    } else offersView = $[11];
    return offersView;
  }
  if (flowState === null || flowState.kind !== "confirm") {
    if (phase !== "idle") {
      const children =
        phase === "claiming"
          ? "Resetting your 5-hour limit\u2026 this usually takes a few seconds"
          : CHECKING_FOR_RESET_LINE;
      let phaseText;
      if ($[12] !== children) {
        phaseText = jsxProd_default(Text, {
          dimColor: true,
          children,
        });
        $[12] = children;
        $[13] = phaseText;
      } else phaseText = $[13];
      return phaseText;
    }
    let onCancel;
    if ($[14] !== onDone) {
      onCancel = () => {
        if (finishedRef.current) {
          return;
        }
        cancelledRef.current = true;
        onDone(undefined, {
          display: "skip",
        });
      };
      $[14] = onDone;
      $[15] = onCancel;
    } else onCancel = $[15];
    let inputGuide;
    let children;
    if ($[16] === MEMO_CACHE_SENTINEL) {
      inputGuide = jsxProd_default(KeyboardShortcutHint, {
        chord: "escape",
        action: "cancel",
      });
      children = jsxProd_default(Text, {
        dimColor: true,
        children: "This takes a moment",
      });
      $[16] = inputGuide;
      $[17] = children;
    } else {
      inputGuide = $[16];
      children = $[17];
    }
    let checkingDialog;
    if ($[18] !== onCancel) {
      checkingDialog = jsxProd_default(Dialog, {
        title: CHECKING_FOR_RESET_LINE,
        onCancel,
        color: "suggestion",
        inputGuide,
        children,
      });
      $[18] = onCancel;
      $[19] = checkingDialog;
    } else checkingDialog = $[19];
    return checkingDialog;
  }
  let onDone_2;
  if ($[20] !== onDone) {
    onDone_2 = (confirmResult) => finishWithSystemMessage(onDone, confirmResult.text);
    $[20] = onDone;
    $[21] = onDone_2;
  } else onDone_2 = $[21];
  let confirmView;
  if ($[22] !== credentials || $[23] !== flowState.offer || $[24] !== onDone_2) {
    confirmView = jsxProd_default(ResetLimits, {
      offer: flowState.offer,
      entry: "command",
      credentials,
      onDone: onDone_2,
    });
    $[22] = credentials;
    $[23] = flowState.offer;
    $[24] = onDone_2;
    $[25] = confirmView;
  } else confirmView = $[25];
  return confirmView;
}
//@ chunk-q8p98373.js:15829-15869 placement
function finishWithSystemMessage(onDone, text) {
  onDone(text, {
    display: "system",
  });
}
//@ chunk-q8p98373.js:15869-16022 placement
function parseResetName(name) {
  let lower = name.trim().toLowerCase();
  if (lower === "") return;
  if (lower === "5-hour" || lower === "5h" || lower === "five-hour") return "session";
  return LIMIT_CATEGORIES.find((category) => category === lower) ?? null;
}
//@ chunk-q8p98373.js:16022-16222 placement
var RESET_LIMITS_USAGE_HINT = `or run just /${LIMIT_RESET} to reset your 5-hour limit now (uses your weekly limit)`;
var INVALID_RESET_NAME_MESSAGE = `That isn't a reset name \xB7 try /${LIMIT_RESET} fable, full, 5-hour or weekly, or just /${LIMIT_RESET} to see the resets you have`;
//@ chunk-q8p98373.js:16222-16424 placement
/**
 * /reset-limits：用周额度立即重置 5 小时额度等。
 */
async function runResetLimitsCommand(onDone, context, args = "") {
  if (!isCedarEmberEnabled()) {
    let creditsResult = await checkUsageCredits("command", context.credentials);
    finishWithSystemMessage(onDone, creditsResult.text);
    return null;
  }
  let resetName = parseResetName(args);
  if (resetName === null) {
    finishWithSystemMessage(onDone, INVALID_RESET_NAME_MESSAGE);
    return null;
  }
  return jsxProd_default(ResetLimitsView, {
    onDone,
    credentials: context.credentials,
    kind: resetName,
  });
}
export { runResetLimitsCommand };

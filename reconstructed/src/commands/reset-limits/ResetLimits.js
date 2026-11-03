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
import { init_react_production, y, R, P } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
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
  let m = w(26);
  let { onDone, credentials, kind } = props;
  let [i, Y] = y(null);
  let [T, Z] = y("idle");
  let K = R(false);
  let O = R(false);
  let v = R(false);
  let X;
  let H;
  if (m[0] !== credentials || m[1] !== kind || m[2] !== onDone) {
    X = () => {
      if (K.current) {
        return;
      }
      K.current = true;
      startResetFlowSafe("command", credentials, kind)
        .then(async (resetFlow) => {
          if (O.current) {
            return;
          }
          v.current = true;
          if (resetFlow.kind === "confirm" || resetFlow.kind === "choose") {
            Y(resetFlow);
            return;
          }
          let C = resetFlow.result;
          let currentLimits = getCurrentLimits();
          if (!(
            kind === undefined &&
            isLimitResetEnabled() &&
            !isResetOfferAvailable(currentLimits) &&
            !isClaimingReset()
          )) {
            let ee =
              kind !== undefined &&
              C.outcome === "not_offered" &&
              isLimitResetEnabled() &&
              canArmLowPriorityReset(currentLimits);
            finishWithSystemMessage(onDone, ee ? `${C.text} \xB7 ${RESET_LIMITS_USAGE_HINT}` : C.text);
            return;
          }
          Z(canArmLowPriorityReset(currentLimits) ? "claiming" : "asking");
          let I = await checkUsageCredits("command", credentials);
          finishWithSystemMessage(onDone, I.outcome === "not_offered" ? C.text : I.text);
        })
        .catch(() => {
          finishWithSystemMessage(onDone, RESET_STATUS_MESSAGES);
        });
    };
    H = [credentials, onDone, kind];
    m[0] = credentials;
    m[1] = kind;
    m[2] = onDone;
    m[3] = X;
    m[4] = H;
  } else {
    X = m[3];
    H = m[4];
  }
  P(X, H);
  if (i?.kind === "choose") {
    let onDone_2;
    if (m[5] !== onDone) {
      onDone_2 = (re) => finishWithSystemMessage(onDone, re.text);
      m[5] = onDone;
      m[6] = onDone_2;
    } else onDone_2 = m[6];
    let d;
    if (m[7] !== credentials || m[8] !== i.offers || m[9] !== i.unusable || m[10] !== onDone_2) {
      d = jsxProd_default(ResetLimitsOffers, {
        offers: i.offers,
        unusable: i.unusable,
        entry: "command",
        credentials,
        onDone: onDone_2,
      });
      m[7] = credentials;
      m[8] = i.offers;
      m[9] = i.unusable;
      m[10] = onDone_2;
      m[11] = d;
    } else d = m[11];
    return d;
  }
  if (i === null || i.kind !== "confirm") {
    if (T !== "idle") {
      const children =
        T === "claiming"
          ? "Resetting your 5-hour limit\u2026 this usually takes a few seconds"
          : CHECKING_FOR_RESET_LINE;
      let d;
      if (m[12] !== children) {
        d = jsxProd_default(Text, {
          dimColor: true,
          children,
        });
        m[12] = children;
        m[13] = d;
      } else d = m[13];
      return d;
    }
    let onCancel;
    if (m[14] !== onDone) {
      onCancel = () => {
        if (v.current) {
          return;
        }
        O.current = true;
        onDone(undefined, {
          display: "skip",
        });
      };
      m[14] = onDone;
      m[15] = onCancel;
    } else onCancel = m[15];
    let inputGuide;
    let children;
    if (m[16] === MEMO_CACHE_SENTINEL) {
      inputGuide = jsxProd_default(KeyboardShortcutHint, {
        chord: "escape",
        action: "cancel",
      });
      children = jsxProd_default(Text, {
        dimColor: true,
        children: "This takes a moment",
      });
      m[16] = inputGuide;
      m[17] = children;
    } else {
      inputGuide = m[16];
      children = m[17];
    }
    let J;
    if (m[18] !== onCancel) {
      J = jsxProd_default(Dialog, {
        title: CHECKING_FOR_RESET_LINE,
        onCancel,
        color: "suggestion",
        inputGuide,
        children,
      });
      m[18] = onCancel;
      m[19] = J;
    } else J = m[19];
    return J;
  }
  let onDone_2;
  if (m[20] !== onDone) {
    onDone_2 = (ne) => finishWithSystemMessage(onDone, ne.text);
    m[20] = onDone;
    m[21] = onDone_2;
  } else onDone_2 = m[21];
  let d;
  if (m[22] !== credentials || m[23] !== i.offer || m[24] !== onDone_2) {
    d = jsxProd_default(ResetLimits, {
      offer: i.offer,
      entry: "command",
      credentials,
      onDone: onDone_2,
    });
    m[22] = credentials;
    m[23] = i.offer;
    m[24] = onDone_2;
    m[25] = d;
  } else d = m[25];
  return d;
}
//@ chunk-q8p98373.js:15829-15869 placement
function finishWithSystemMessage(onDone, r) {
  onDone(r, {
    display: "system",
  });
}
//@ chunk-q8p98373.js:15869-16022 placement
function parseResetName(a) {
  let lower = a.trim().toLowerCase();
  if (lower === "") return;
  if (lower === "5-hour" || lower === "5h" || lower === "five-hour") return "session";
  return LIMIT_CATEGORIES.find((o) => o === lower) ?? null;
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
    let i = await checkUsageCredits("command", context.credentials);
    finishWithSystemMessage(onDone, i.text);
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

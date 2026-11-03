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
import { j, y, R, P } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import {
  startResetFlowSafe,
  Ltn,
  isClaimingReset,
  canArmLowPriorityReset,
  RESET_STATUS_MESSAGES,
  eJe,
} from "../../services/rateLimit/rateLimitWall.js";
import { getCurrentLimits } from "../../services/claudeAiLimits.js";
import { isLimitResetEnabled, LIMIT_RESET, isCedarEmberEnabled } from "../limit-reset/index.js";
import { checkUsageCredits } from "../../components/rateLimit/usageCreditsOffer.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ResetLimitsOffers, ResetLimits } from "../rate-limit-options/ResetLimits.js";
import { Text } from "../../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { KeyboardShortcutHint } from "../../components/design-system/KeyboardShortcutHint.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { EWe } from "../../components/rateLimit/quotaAutoResume.js";

//@ chunk-q8p98373.js:13956-13960 placement
j();
//@ chunk-q8p98373.js:13960-15829 placement
function ResetLimitsView(a) {
  let m = w(26),
    { onDone: onDone, credentials: credentials, kind: kind } = a,
    [i, Y] = y(null),
    [T, Z] = y("idle"),
    K = R(!1),
    O = R(!1),
    v = R(!1),
    X,
    H;
  if (m[0] !== credentials || m[1] !== kind || m[2] !== onDone)
    ((X = () => {
      if (K.current) {
        return;
      }
      ((K.current = !0),
        startResetFlowSafe("command", credentials, kind)
          .then(async (h) => {
            if (O.current) {
              return;
            }
            if (((v.current = !0), h.kind === "confirm" || h.kind === "choose")) {
              Y(h);
              return;
            }
            let C = h.result;
            let x = getCurrentLimits();
            if (!(kind === void 0 && isLimitResetEnabled() && !Ltn(x) && !isClaimingReset())) {
              let ee =
                kind !== void 0 &&
                C.outcome === "not_offered" &&
                isLimitResetEnabled() &&
                canArmLowPriorityReset(x);
              s(onDone, ee ? `${C.text} \xB7 ${RESET_LIMITS_USAGE_HINT}` : C.text);
              return;
            }
            Z(canArmLowPriorityReset(x) ? "claiming" : "asking");
            let I = await checkUsageCredits("command", credentials);
            s(onDone, I.outcome === "not_offered" ? C.text : I.text);
          })
          .catch(() => {
            s(onDone, RESET_STATUS_MESSAGES);
          }));
    }),
      (H = [credentials, onDone, kind]),
      (m[0] = credentials),
      (m[1] = kind),
      (m[2] = onDone),
      (m[3] = X),
      (m[4] = H));
  else ((X = m[3]), (H = m[4]));
  if ((P(X, H), i?.kind === "choose")) {
    let t;
    if (m[5] !== onDone) ((t = (re) => s(onDone, re.text)), (m[5] = onDone), (m[6] = t));
    else t = m[6];
    let d;
    if (m[7] !== credentials || m[8] !== i.offers || m[9] !== i.unusable || m[10] !== t)
      ((d = e(ResetLimitsOffers, {
        offers: i.offers,
        unusable: i.unusable,
        entry: "command",
        credentials: credentials,
        onDone: t,
      })),
        (m[7] = credentials),
        (m[8] = i.offers),
        (m[9] = i.unusable),
        (m[10] = t),
        (m[11] = d));
    else d = m[11];
    return d;
  }
  if (i === null || i.kind !== "confirm") {
    if (T !== "idle") {
      const t = T === "claiming" ? "Resetting your 5-hour limit\u2026 this usually takes a few seconds" : eJe;
      let d;
      if (m[12] !== t) ((d = e(Text, { dimColor: !0, children: t })), (m[12] = t), (m[13] = d));
      else d = m[13];
      return d;
    }
    let t;
    if (m[14] !== onDone)
      ((t = () => {
        if (v.current) {
          return;
        }
        ((O.current = !0), onDone(void 0, { display: "skip" }));
      }),
        (m[14] = onDone),
        (m[15] = t));
    else t = m[15];
    let d, W;
    if (m[16] === MEMO_CACHE_SENTINEL)
      ((d = e(KeyboardShortcutHint, { chord: "escape", action: "cancel" })),
        (W = e(Text, { dimColor: !0, children: "This takes a moment" })),
        (m[16] = d),
        (m[17] = W));
    else ((d = m[16]), (W = m[17]));
    let J;
    if (m[18] !== t)
      ((J = e(Dialog, { title: eJe, onCancel: t, color: "suggestion", inputGuide: d, children: W })),
        (m[18] = t),
        (m[19] = J));
    else J = m[19];
    return J;
  }
  let t;
  if (m[20] !== onDone) ((t = (ne) => s(onDone, ne.text)), (m[20] = onDone), (m[21] = t));
  else t = m[21];
  let d;
  if (m[22] !== credentials || m[23] !== i.offer || m[24] !== t)
    ((d = e(ResetLimits, { offer: i.offer, entry: "command", credentials: credentials, onDone: t })),
      (m[22] = credentials),
      (m[23] = i.offer),
      (m[24] = t),
      (m[25] = d));
  else d = m[25];
  return d;
}
//@ chunk-q8p98373.js:15829-15869 placement
function s(a, r) {
  a(r, { display: "system" });
}
//@ chunk-q8p98373.js:15869-16022 placement
function parseResetName(a) {
  let lower = a.trim().toLowerCase();
  if (lower === "") return;
  if (lower === "5-hour" || lower === "5h" || lower === "five-hour") return "session";
  return EWe.find((o) => o === lower) ?? null;
}
//@ chunk-q8p98373.js:16022-16222 placement
var RESET_LIMITS_USAGE_HINT = `or run just /${LIMIT_RESET} to reset your 5-hour limit now (uses your weekly limit)`,
  INVALID_RESET_NAME_MESSAGE = `That isn't a reset name \xB7 try /${LIMIT_RESET} fable, full, 5-hour or weekly, or just /${LIMIT_RESET} to see the resets you have`;
/**
 * /reset-limits：用周额度立即重置 5 小时额度等。
 */
//@ chunk-q8p98373.js:16222-16424 placement
async function runResetLimitsCommand(onDone, context, args = "") {
  if (!isCedarEmberEnabled()) {
    let i = await checkUsageCredits("command", context.credentials);
    return (s(onDone, i.text), null);
  }
  let l = parseResetName(args);
  if (l === null) return (s(onDone, INVALID_RESET_NAME_MESSAGE), null);
  return e(ResetLimitsView, { onDone: onDone, credentials: context.credentials, kind: l });
}

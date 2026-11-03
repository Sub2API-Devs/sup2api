/**
 * commands/rate-limit-options/ResetLimits.tsx
 *
 * 重置用量限额界面（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jh6bkx5v.js (7)
 * attribution: placement 7
 */
import { j, y, R } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import {
  useInputRefusalWindow,
  useRefusalTracker,
  useMountTime,
} from "../../components/CustomSelect/selectTypeahead.js";
import { So } from "../../hooks/useRecentInputGuard.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getCedarEmberCopy, formatLimitResetTemplate } from "../limit-reset/index.js";
import {
  resetOfferFields,
  earlyUseLine,
  reportResetDeclined,
  claimReset,
  resetOfferLabel,
  keepResetForLater,
  reportResetSelected,
} from "../../services/rateLimit/rateLimitWall.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { ConfirmSelect } from "../../components/design-system/ConfirmSelect.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../../components/CustomSelect/select.js";

//@ chunk-jh6bkx5v.js:633-637 placement
j();
//@ chunk-jh6bkx5v.js:637-652 placement
function ge() {}
/**
 * 重置用量限额的界面：调用重置接口并显示进度
 */
//@ chunk-jh6bkx5v.js:652-2981 placement
function ResetLimits(ce) {
  let t = w(55),
    { offer: offer, entry: entry, credentials: credentials, onDone: onDone } = ce,
    [u, I] = y(!1),
    T = R(!1),
    b = useInputRefusalWindow(So),
    { refusedWithin: refusedWithin, noteRefused: noteRefused } = useRefusalTracker(),
    K = useMountTime(),
    m,
    i,
    v,
    f,
    W,
    z,
    V,
    k,
    E,
    U,
    g,
    P,
    D,
    N,
    x;
  if (
    t[0] !== u ||
    t[1] !== credentials ||
    t[2] !== entry ||
    t[3] !== b ||
    t[4] !== noteRefused ||
    t[5] !== offer ||
    t[6] !== onDone ||
    t[7] !== refusedWithin ||
    t[8] !== K
  ) {
    z = EARLY_RETURN_SENTINEL;
    io: {
      let c = getCedarEmberCopy();
      let L = resetOfferFields(offer);
      let H;
      if (t[24] !== offer) ((H = earlyUseLine(offer)), (t[24] = offer), (t[25] = H));
      else H = t[25];
      let J = H;
      let Y;
      if (t[26] !== b || t[27] !== noteRefused || t[28] !== refusedWithin)
        ((Y = function A() {
          if (b() || refusedWithin(So)) {
            return (noteRefused(), !0);
          }
          return !1;
        }),
          (t[26] = b),
          (t[27] = noteRefused),
          (t[28] = refusedWithin),
          (t[29] = Y));
      else Y = t[29];
      let A = Y;
      let le;
      if (t[30] !== entry || t[31] !== offer || t[32] !== onDone || t[33] !== A)
        ((le = function v() {
          if (T.current || A()) {
            return;
          }
          ((T.current = !0), onDone(reportResetDeclined(entry, offer)));
        }),
          (t[30] = entry),
          (t[31] = offer),
          (t[32] = onDone),
          (t[33] = A),
          (t[34] = le));
      else le = t[34];
      v = le;
      x = function x() {
        if (T.current || A()) {
          return;
        }
        ((T.current = !0),
          I(!0),
          claimReset(entry, credentials, offer)
            .then(onDone)
            .catch(() => {
              onDone({
                outcome: "unavailable",
                text: formatLimitResetTemplate(
                  offer.origin === "wall" ? c.unconfirmedLine : c.unconfirmedAnytimeLine,
                  L,
                ),
              });
            }));
      };
      if (u) {
        const Q = formatLimitResetTemplate(c.confirmTitle, L);
        let ue;
        if (t[35] === MEMO_CACHE_SENTINEL)
          ((ue = e(Text, {
            dimColor: !0,
            children: "Resetting your limits\u2026 this usually takes a few seconds",
          })),
            (t[35] = ue));
        else ue = t[35];
        z = e(Dialog, {
          title: Q,
          onCancel: ge,
          exitOnCtrlCD: !0,
          color: "suggestion",
          hideInputGuide: !0,
          children: ue,
        });
        break io;
      }
      i = Dialog;
      P = formatLimitResetTemplate(c.confirmTitle, L);
      D = v;
      N = "suggestion";
      let Q;
      if (t[36] !== J) ((Q = J === void 0 ? null : e(Text, { children: J })), (t[36] = J), (t[37] = Q));
      else Q = t[37];
      W = r(Box, {
        flexDirection: "column",
        children: [
          Q,
          e(Text, { children: formatLimitResetTemplate(c.confirmBody, L) }),
          e(Text, { dimColor: !0, children: formatLimitResetTemplate(c.confirmDetail, L) }),
        ],
      });
      m = ConfirmSelect;
      f = A;
      V = K;
      k = So;
      E = !0;
      U = formatLimitResetTemplate(c.confirmYes, L);
      g = formatLimitResetTemplate(c.confirmNo, L);
    }
    ((t[0] = u),
      (t[1] = credentials),
      (t[2] = entry),
      (t[3] = b),
      (t[4] = noteRefused),
      (t[5] = offer),
      (t[6] = onDone),
      (t[7] = refusedWithin),
      (t[8] = K),
      (t[9] = m),
      (t[10] = i),
      (t[11] = v),
      (t[12] = f),
      (t[13] = W),
      (t[14] = z),
      (t[15] = V),
      (t[16] = k),
      (t[17] = E),
      (t[18] = U),
      (t[19] = g),
      (t[20] = P),
      (t[21] = D),
      (t[22] = N),
      (t[23] = x));
  } else
    ((m = t[9]),
      (i = t[10]),
      (v = t[11]),
      (f = t[12]),
      (W = t[13]),
      (z = t[14]),
      (V = t[15]),
      (k = t[16]),
      (E = t[17]),
      (U = t[18]),
      (g = t[19]),
      (P = t[20]),
      (D = t[21]),
      (N = t[22]),
      (x = t[23]));
  if (z !== EARLY_RETURN_SENTINEL) return z;
  let H;
  if (
    t[38] !== m ||
    t[39] !== v ||
    t[40] !== f ||
    t[41] !== V ||
    t[42] !== k ||
    t[43] !== E ||
    t[44] !== U ||
    t[45] !== g ||
    t[46] !== x
  )
    ((H = e(m, {
      refuseInput: f,
      openedAt: V,
      windowMs: k,
      hideIndexes: E,
      confirmLabel: U,
      cancelLabel: g,
      onConfirm: x,
      onCancel: v,
    })),
      (t[38] = m),
      (t[39] = v),
      (t[40] = f),
      (t[41] = V),
      (t[42] = k),
      (t[43] = E),
      (t[44] = U),
      (t[45] = g),
      (t[46] = x),
      (t[47] = H));
  else H = t[47];
  let Y;
  if (t[48] !== i || t[49] !== W || t[50] !== H || t[51] !== P || t[52] !== D || t[53] !== N)
    ((Y = r(i, { title: P, onCancel: D, color: N, children: [W, H] })),
      (t[48] = i),
      (t[49] = W),
      (t[50] = H),
      (t[51] = P),
      (t[52] = D),
      (t[53] = N),
      (t[54] = Y));
  else Y = t[54];
  return Y;
}
//@ chunk-jh6bkx5v.js:2981-2985 placement
j();
//@ chunk-jh6bkx5v.js:2985-3034 placement
function Re(x) {
  return { label: resetOfferLabel(x), value: x.kind };
}
//@ chunk-jh6bkx5v.js:3034-3095 placement
function We(c) {
  return { label: c.text, value: c.kind, disabled: !0 };
}
/**
 * 重置限额选项列表（选中后进入确认）。
 */
//@ chunk-jh6bkx5v.js:3095-4430 placement
function ResetLimitsOffers(ce) {
  let t = w(30),
    { offers: offers, unusable: unusable, entry: entry, credentials: credentials, onDone: onDone } = ce,
    [I, T] = y(null),
    b = R(!1),
    C = useInputRefusalWindow(So),
    { refusedWithin: refusedWithin, noteRefused: noteRefused } = useRefusalTracker();
  if (I !== null) {
    let m;
    if (t[0] !== I || t[1] !== credentials || t[2] !== entry || t[3] !== onDone)
      ((m = e(ResetLimits, { offer: I, entry: entry, credentials: credentials, onDone: onDone })),
        (t[0] = I),
        (t[1] = credentials),
        (t[2] = entry),
        (t[3] = onDone),
        (t[4] = m));
    else m = t[4];
    return m;
  }
  let m;
  if (t[5] !== C || t[6] !== noteRefused || t[7] !== refusedWithin)
    ((m = function i() {
      if (C() || refusedWithin(So)) {
        return (noteRefused(), !0);
      }
      return !1;
    }),
      (t[5] = C),
      (t[6] = noteRefused),
      (t[7] = refusedWithin),
      (t[8] = m));
  else m = t[8];
  let i = m,
    v;
  if (t[9] !== entry || t[10] !== offers || t[11] !== onDone || t[12] !== i)
    ((v = function f() {
      if (b.current || i()) {
        return;
      }
      ((b.current = !0), onDone(keepResetForLater(entry, offers)));
    }),
      (t[9] = entry),
      (t[10] = offers),
      (t[11] = onDone),
      (t[12] = i),
      (t[13] = v));
  else v = t[13];
  let f = v,
    W;
  if (t[14] !== entry || t[15] !== offers || t[16] !== i)
    ((W = function E(z) {
      let found = offers.find((V) => V.kind === z);
      if (found === void 0 || b.current || i()) {
        return;
      }
      (reportResetSelected(entry, found), T(found));
    }),
      (t[14] = entry),
      (t[15] = offers),
      (t[16] = i),
      (t[17] = W));
  else W = t[17];
  let E = W,
    U;
  if (t[18] !== offers || t[19] !== unusable)
    ((U = [...offers.map(Re), ...unusable.map(We)]), (t[18] = offers), (t[19] = unusable), (t[20] = U));
  else U = t[20];
  let g = U,
    P;
  if (t[21] === MEMO_CACHE_SENTINEL) ((P = getCedarEmberCopy()), (t[21] = P));
  else P = t[21];
  let D;
  if (t[22] !== E || t[23] !== f || t[24] !== g || t[25] !== i)
    ((D = e(ModelSelector, {
      options: g,
      onChange: E,
      onCancel: f,
      refuseInput: i,
      selectedValue: NO_COMMITTED_ROW,
      hideIndexes: !0,
      visibleOptionCount: g.length,
    })),
      (t[22] = E),
      (t[23] = f),
      (t[24] = g),
      (t[25] = i),
      (t[26] = D));
  else D = t[26];
  let N;
  if (t[27] !== f || t[28] !== D)
    ((N = e(Dialog, { title: P.chooseTitle, onCancel: f, color: "suggestion", children: D })),
      (t[27] = f),
      (t[28] = D),
      (t[29] = N));
  else N = t[29];
  return N;
}

export { ResetLimits, ResetLimitsOffers };

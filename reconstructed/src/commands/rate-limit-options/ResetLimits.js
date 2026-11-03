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
import { init_react_production, y, R } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import {
  useInputRefusalWindow,
  useRefusalTracker,
  useMountTime,
} from "../../components/CustomSelect/selectTypeahead.js";
import { RECENT_INPUT_GUARD_MS } from "../../hooks/useRecentInputGuard.js";
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
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Dialog } from "../../components/design-system/Dialog.js";
import { ConfirmSelect } from "../../components/design-system/ConfirmSelect.js";
import { ModelSelector } from "../../components/agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../../components/CustomSelect/select.js";

//@ chunk-jh6bkx5v.js:633-637 placement
init_react_production();
//@ chunk-jh6bkx5v.js:637-652 placement
function noop() {}
//@ chunk-jh6bkx5v.js:652-2981 placement
/**
 * 重置用量限额的界面：调用重置接口并显示进度
 */
function ResetLimits(props) {
  let t = w(55);
  let { offer, entry, credentials, onDone } = props;
  let [u, I] = y(false);
  let T = R(false);
  let inputRefusalWindow = useInputRefusalWindow(RECENT_INPUT_GUARD_MS);
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let mountTime = useMountTime();
  let m;
  let i;
  let v;
  let refuseInput;
  let W;
  let z;
  let openedAt;
  let windowMs;
  let hideIndexes;
  let confirmLabel;
  let cancelLabel;
  let title;
  let onCancel;
  let color;
  let onConfirm;
  if (
    t[0] !== u ||
    t[1] !== credentials ||
    t[2] !== entry ||
    t[3] !== inputRefusalWindow ||
    t[4] !== noteRefused ||
    t[5] !== offer ||
    t[6] !== onDone ||
    t[7] !== refusedWithin ||
    t[8] !== mountTime
  ) {
    z = EARLY_RETURN_SENTINEL;
    io: {
      let cedarEmberCopy = getCedarEmberCopy();
      let L = resetOfferFields(offer);
      let H;
      if (t[24] !== offer) {
        H = earlyUseLine(offer);
        t[24] = offer;
        t[25] = H;
      } else H = t[25];
      let J = H;
      let Y;
      if (t[26] !== inputRefusalWindow || t[27] !== noteRefused || t[28] !== refusedWithin) {
        Y = function A() {
          if (inputRefusalWindow() || refusedWithin(RECENT_INPUT_GUARD_MS)) {
            noteRefused();
            return true;
          }
          return false;
        };
        t[26] = inputRefusalWindow;
        t[27] = noteRefused;
        t[28] = refusedWithin;
        t[29] = Y;
      } else Y = t[29];
      let A = Y;
      let le;
      if (t[30] !== entry || t[31] !== offer || t[32] !== onDone || t[33] !== A) {
        le = function v() {
          if (T.current || A()) {
            return;
          }
          T.current = true;
          onDone(reportResetDeclined(entry, offer));
        };
        t[30] = entry;
        t[31] = offer;
        t[32] = onDone;
        t[33] = A;
        t[34] = le;
      } else le = t[34];
      v = le;
      onConfirm = function x() {
        if (T.current || A()) {
          return;
        }
        T.current = true;
        I(true);
        claimReset(entry, credentials, offer)
          .then(onDone)
          .catch(() => {
            onDone({
              outcome: "unavailable",
              text: formatLimitResetTemplate(
                offer.origin === "wall"
                  ? cedarEmberCopy.unconfirmedLine
                  : cedarEmberCopy.unconfirmedAnytimeLine,
                L,
              ),
            });
          });
      };
      if (u) {
        const title = formatLimitResetTemplate(cedarEmberCopy.confirmTitle, L);
        let children;
        if (t[35] === MEMO_CACHE_SENTINEL) {
          children = jsxProd_default(Text, {
            dimColor: true,
            children: "Resetting your limits\u2026 this usually takes a few seconds",
          });
          t[35] = children;
        } else children = t[35];
        z = jsxProd_default(Dialog, {
          title,
          onCancel: noop,
          exitOnCtrlCD: true,
          color: "suggestion",
          hideInputGuide: true,
          children,
        });
        break io;
      }
      i = Dialog;
      title = formatLimitResetTemplate(cedarEmberCopy.confirmTitle, L);
      onCancel = v;
      color = "suggestion";
      let Q;
      if (t[36] !== J) {
        Q =
          J === undefined
            ? null
            : jsxProd_default(Text, {
                children: J,
              });
        t[36] = J;
        t[37] = Q;
      } else Q = t[37];
      W = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          Q,
          jsxProd_default(Text, {
            children: formatLimitResetTemplate(cedarEmberCopy.confirmBody, L),
          }),
          jsxProd_default(Text, {
            dimColor: true,
            children: formatLimitResetTemplate(cedarEmberCopy.confirmDetail, L),
          }),
        ],
      });
      m = ConfirmSelect;
      refuseInput = A;
      openedAt = mountTime;
      windowMs = RECENT_INPUT_GUARD_MS;
      hideIndexes = true;
      confirmLabel = formatLimitResetTemplate(cedarEmberCopy.confirmYes, L);
      cancelLabel = formatLimitResetTemplate(cedarEmberCopy.confirmNo, L);
    }
    t[0] = u;
    t[1] = credentials;
    t[2] = entry;
    t[3] = inputRefusalWindow;
    t[4] = noteRefused;
    t[5] = offer;
    t[6] = onDone;
    t[7] = refusedWithin;
    t[8] = mountTime;
    t[9] = m;
    t[10] = i;
    t[11] = v;
    t[12] = refuseInput;
    t[13] = W;
    t[14] = z;
    t[15] = openedAt;
    t[16] = windowMs;
    t[17] = hideIndexes;
    t[18] = confirmLabel;
    t[19] = cancelLabel;
    t[20] = title;
    t[21] = onCancel;
    t[22] = color;
    t[23] = onConfirm;
  } else {
    m = t[9];
    i = t[10];
    v = t[11];
    refuseInput = t[12];
    W = t[13];
    z = t[14];
    openedAt = t[15];
    windowMs = t[16];
    hideIndexes = t[17];
    confirmLabel = t[18];
    cancelLabel = t[19];
    title = t[20];
    onCancel = t[21];
    color = t[22];
    onConfirm = t[23];
  }
  if (z !== EARLY_RETURN_SENTINEL) return z;
  let H;
  if (
    t[38] !== m ||
    t[39] !== v ||
    t[40] !== refuseInput ||
    t[41] !== openedAt ||
    t[42] !== windowMs ||
    t[43] !== hideIndexes ||
    t[44] !== confirmLabel ||
    t[45] !== cancelLabel ||
    t[46] !== onConfirm
  ) {
    H = jsxProd_default(m, {
      refuseInput,
      openedAt,
      windowMs,
      hideIndexes,
      confirmLabel,
      cancelLabel,
      onConfirm,
      onCancel: v,
    });
    t[38] = m;
    t[39] = v;
    t[40] = refuseInput;
    t[41] = openedAt;
    t[42] = windowMs;
    t[43] = hideIndexes;
    t[44] = confirmLabel;
    t[45] = cancelLabel;
    t[46] = onConfirm;
    t[47] = H;
  } else H = t[47];
  let Y;
  if (t[48] !== i || t[49] !== W || t[50] !== H || t[51] !== title || t[52] !== onCancel || t[53] !== color) {
    Y = jsxProd_default_2(i, {
      title,
      onCancel,
      color,
      children: [W, H],
    });
    t[48] = i;
    t[49] = W;
    t[50] = H;
    t[51] = title;
    t[52] = onCancel;
    t[53] = color;
    t[54] = Y;
  } else Y = t[54];
  return Y;
}
//@ chunk-jh6bkx5v.js:2981-2985 placement
init_react_production();
//@ chunk-jh6bkx5v.js:2985-3034 placement
function resetOfferOption(x) {
  return {
    label: resetOfferLabel(x),
    value: x.kind,
  };
}
//@ chunk-jh6bkx5v.js:3034-3095 placement
function unusableResetOption(c) {
  return {
    label: c.text,
    value: c.kind,
    disabled: true,
  };
}
//@ chunk-jh6bkx5v.js:3095-4430 placement
/**
 * 重置限额选项列表（选中后进入确认）。
 */
function ResetLimitsOffers(props) {
  let t = w(30);
  let { offers, unusable, entry, credentials, onDone } = props;
  let [I, T] = y(null);
  let b = R(false);
  let inputRefusalWindow = useInputRefusalWindow(RECENT_INPUT_GUARD_MS);
  let { refusedWithin, noteRefused } = useRefusalTracker();
  if (I !== null) {
    let m;
    if (t[0] !== I || t[1] !== credentials || t[2] !== entry || t[3] !== onDone) {
      m = jsxProd_default(ResetLimits, {
        offer: I,
        entry,
        credentials,
        onDone,
      });
      t[0] = I;
      t[1] = credentials;
      t[2] = entry;
      t[3] = onDone;
      t[4] = m;
    } else m = t[4];
    return m;
  }
  let m;
  if (t[5] !== inputRefusalWindow || t[6] !== noteRefused || t[7] !== refusedWithin) {
    m = function i() {
      if (inputRefusalWindow() || refusedWithin(RECENT_INPUT_GUARD_MS)) {
        noteRefused();
        return true;
      }
      return false;
    };
    t[5] = inputRefusalWindow;
    t[6] = noteRefused;
    t[7] = refusedWithin;
    t[8] = m;
  } else m = t[8];
  let i = m;
  let v;
  if (t[9] !== entry || t[10] !== offers || t[11] !== onDone || t[12] !== i) {
    v = function f() {
      if (b.current || i()) {
        return;
      }
      b.current = true;
      onDone(keepResetForLater(entry, offers));
    };
    t[9] = entry;
    t[10] = offers;
    t[11] = onDone;
    t[12] = i;
    t[13] = v;
  } else v = t[13];
  let onCancel = v;
  let W;
  if (t[14] !== entry || t[15] !== offers || t[16] !== i) {
    W = function E(z) {
      let found = offers.find((offer) => offer.kind === z);
      if (found === undefined || b.current || i()) {
        return;
      }
      reportResetSelected(entry, found);
      T(found);
    };
    t[14] = entry;
    t[15] = offers;
    t[16] = i;
    t[17] = W;
  } else W = t[17];
  let onChange = W;
  let U;
  if (t[18] !== offers || t[19] !== unusable) {
    U = [...offers.map(resetOfferOption), ...unusable.map(unusableResetOption)];
    t[18] = offers;
    t[19] = unusable;
    t[20] = U;
  } else U = t[20];
  let g = U;
  let P;
  if (t[21] === MEMO_CACHE_SENTINEL) {
    P = getCedarEmberCopy();
    t[21] = P;
  } else P = t[21];
  let children;
  if (t[22] !== onChange || t[23] !== onCancel || t[24] !== g || t[25] !== i) {
    children = jsxProd_default(ModelSelector, {
      options: g,
      onChange,
      onCancel,
      refuseInput: i,
      selectedValue: NO_COMMITTED_ROW,
      hideIndexes: true,
      visibleOptionCount: g.length,
    });
    t[22] = onChange;
    t[23] = onCancel;
    t[24] = g;
    t[25] = i;
    t[26] = children;
  } else children = t[26];
  let N;
  if (t[27] !== onCancel || t[28] !== children) {
    N = jsxProd_default(Dialog, {
      title: P.chooseTitle,
      onCancel,
      color: "suggestion",
      children,
    });
    t[27] = onCancel;
    t[28] = children;
    t[29] = N;
  } else N = t[29];
  return N;
}
export { ResetLimits, ResetLimitsOffers };

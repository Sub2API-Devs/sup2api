/**
 * components/CustomSelect/selectTypeahead.tsx
 *
 * 2.1.316 新增：多选列表组件（提交按钮、默认值、输入拒绝）；通用单选列表组件（标题、标签、禁用、默认值、输入拒绝）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ey2qag4x.js (71)
 * attribution: placement 71
 */
import {
  init_react_production,
  R,
  ce,
  y,
  Kc,
  P,
  isValidElement_default,
  qt,
  Fy,
  Se,
} from "../../../vendor/react/cjs/react.production.js";
import { RECENT_INPUT_GUARD_MS_2, isWithinRecentInput } from "../../hooks/useRecentInputGuard.js";
import { useInputClock } from "../../ink/components/Input.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  truncateCodePoints,
  normalizeFullWidthDigits_2,
  replaceIdeographicSpace,
} from "../../utils/stringUtils.js";
import { isArrowNavEnabled } from "../../utils/accessibility/screenReader.js";
import { useFocusOnMount } from "../../hooks/useFocusOnMount.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { reactNodeText } from "../../utils/reactText.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { useDeclaredCursor } from "../../ink/hooks/use-declared-cursor.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { sequential } from "../../utils/sequential.js";

//@ chunk-ey2qag4x.js:1685-1689 placement
init_react_production();
//@ chunk-ey2qag4x.js:1689-1693 placement
init_react_production();
//@ chunk-ey2qag4x.js:1693-1777 placement
/**
 * 打开后一段时间内拒绝输入的判断（防止误触）。
 */
function useInputRefusalWindow(t = RECENT_INPUT_GUARD_MS_2) {
  let inputClock = useInputClock();
  let i = R(Date.now());
  return ce(() => isWithinRecentInput(inputClock, i.current, t), [inputClock, t]);
}
//@ chunk-ey2qag4x.js:1777-1820 placement
/**
 * 组件挂载时间。
 */
function useMountTime() {
  return R(Date.now()).current;
}
//@ chunk-ey2qag4x.js:1820-1902 placement
/**
 * 根据是否已过冷静期返回 remountKey（settled/held）。
 */
function settleKey(epoch, o = RECENT_INPUT_GUARD_MS_2) {
  let timeout = useTimeout(o, epoch);
  return {
    remountKey: timeout ? "settled" : "held",
    settled: timeout,
  };
}
//@ chunk-ey2qag4x.js:1902-1986 placement
/**
 * typeahead 的 epoch 追踪器：返回 {epoch, noteAttempt}，值变化时用它重置内部状态。
 */
function typeaheadEpochTracker() {
  let [t, o] = y(0);
  let noteAttempt = ce(() => o((a) => a + 1), []);
  return {
    epoch: t,
    noteAttempt,
  };
}
//@ chunk-ey2qag4x.js:1986-2192 placement
/**
 * 记录最近一次被拒输入并判断是否仍在拒绝窗口内。
 */
function useRefusalTracker() {
  let inputClock = useInputClock();
  let o = R(null);
  let { epoch, noteAttempt } = typeaheadEpochTracker();
  let refusedWithin = ce(
    (d = RECENT_INPUT_GUARD_MS_2) => o.current !== null && isWithinRecentInput(inputClock, o.current, d),
    [inputClock],
  );
  let noteRefused = ce(() => {
    o.current = Date.now();
    noteAttempt();
  }, [noteAttempt]);
  return {
    refusedWithin,
    noteRefused,
    epoch,
  };
}
//@ chunk-ey2qag4x.js:2192-2232 placement
function optionValueString(kt) {
  return String(kt.value);
}
//@ chunk-ey2qag4x.js:2232-2258 placement
function nullPlaceholder1() {
  return null;
}
//@ chunk-ey2qag4x.js:2258-2281 placement
function emptyPlaceholder1() {
  return "";
}
//@ chunk-ey2qag4x.js:2281-2307 placement
function nullPlaceholder2() {
  return null;
}
//@ chunk-ey2qag4x.js:2307-2330 placement
function emptyPlaceholder2() {
  return "";
}
//@ chunk-ey2qag4x.js:2330-2353 placement
function emptyPlaceholder3() {
  return "";
}
//@ chunk-ey2qag4x.js:2353-2379 placement
function nullPlaceholder3() {
  return null;
}
//@ chunk-ey2qag4x.js:2379-2402 placement
function emptyPlaceholder4() {
  return "";
}
//@ chunk-ey2qag4x.js:2402-2425 placement
function emptyPlaceholder5() {
  return "";
}
//@ chunk-ey2qag4x.js:2425-2451 placement
function nullPlaceholder4() {
  return null;
}
//@ chunk-ey2qag4x.js:2451-2474 placement
function emptyPlaceholder6() {
  return "";
}
//@ chunk-ey2qag4x.js:2474-2500 placement
function nullPlaceholder5() {
  return null;
}
//@ chunk-ey2qag4x.js:2500-2526 placement
function nullPlaceholder6() {
  return null;
}
//@ chunk-ey2qag4x.js:2526-2549 placement
function emptyPlaceholder7() {
  return "";
}
//@ chunk-ey2qag4x.js:2549-2590 placement = _temp7 (1)
function isNotInputOption(opt) {
  return opt.type !== "input";
}
//@ chunk-ey2qag4x.js:2590-2613 placement
function emptyPlaceholder8() {
  return "";
}
//@ chunk-ey2qag4x.js:2613-2639 placement
function nullPlaceholder8() {
  return null;
}
//@ chunk-ey2qag4x.js:2639-2679 placement
function optionValueString_2(Ql) {
  return String(Ql.value);
}
//@ chunk-ey2qag4x.js:2679-2705 placement
function nullPlaceholder9() {
  return null;
}
//@ chunk-ey2qag4x.js:2705-2731 placement
function nullPlaceholder10() {
  return null;
}
//@ chunk-ey2qag4x.js:2731-2754 placement
function emptyPlaceholder9() {
  return "";
}
//@ chunk-ey2qag4x.js:2754-2780 placement
function nullPlaceholder7() {
  return null;
}
//@ chunk-ey2qag4x.js:2780-2803 placement
function emptyPlaceholder10() {
  return "";
}
//@ chunk-ey2qag4x.js:2803-2826 placement
function emptyPlaceholder11() {
  return "";
}
//@ chunk-ey2qag4x.js:2826-2852 placement
function nullPlaceholder11() {
  return null;
}
//@ chunk-ey2qag4x.js:2852-2878 placement
function nullPlaceholder12() {
  return null;
}
//@ chunk-ey2qag4x.js:2878-2904 placement
function nullPlaceholder13() {
  return null;
}
//@ chunk-ey2qag4x.js:2904-2927 placement
function emptyPlaceholder12() {
  return "";
}
//@ chunk-ey2qag4x.js:2927-2950 placement
function emptyPlaceholder13() {
  return "";
}
//@ chunk-ey2qag4x.js:2950-2973 placement
function emptyPlaceholder14() {
  return "";
}
//@ chunk-ey2qag4x.js:2973-2996 placement
function emptyPlaceholder15() {
  return "";
}
//@ chunk-ey2qag4x.js:2996-3022 placement
function nullPlaceholder14() {
  return null;
}
//@ chunk-ey2qag4x.js:3022-3048 placement
function nullPlaceholder15() {
  return null;
}
//@ chunk-ey2qag4x.js:3048-3074 placement
function nullPlaceholder19() {
  return null;
}
//@ chunk-ey2qag4x.js:3074-3115 placement = _temp7 (1)
function isNotInputOption_2(opt) {
  return opt.type !== "input";
}
//@ chunk-ey2qag4x.js:3115-3138 placement
function emptyPlaceholder16() {
  return "";
}
//@ chunk-ey2qag4x.js:3138-3170 placement
function subtract(ea, ls) {
  return ea - ls;
}
//@ chunk-ey2qag4x.js:3170-3206 placement
function nextIndexString(na) {
  return String(na + 1);
}
//@ chunk-ey2qag4x.js:3206-3232 placement
function nullPlaceholder16() {
  return null;
}
//@ chunk-ey2qag4x.js:3232-3255 placement
function emptyPlaceholder17() {
  return "";
}
//@ chunk-ey2qag4x.js:3255-3281 placement
function nullPlaceholder17() {
  return null;
}
//@ chunk-ey2qag4x.js:3281-3307 placement
function nullPlaceholder18() {
  return null;
}
//@ chunk-ey2qag4x.js:3307-3330 placement
function emptyPlaceholder18() {
  return "";
}
//@ chunk-ey2qag4x.js:3330-3353 placement
function emptyPlaceholder19() {
  return "";
}
//@ chunk-ey2qag4x.js:3353-3391 placement
function dropLastChar(Ve) {
  return Ve.slice(0, -1);
}
//@ chunk-ey2qag4x.js:3391-3580 placement
function useStateWithRef(t) {
  let l = w(3);
  let [o, i] = y(t);
  let a = R(t);
  let f;
  if (l[0] === MEMO_CACHE_SENTINEL) {
    f = (d) => {
      a.current = d(a.current);
      i(a.current);
    };
    l[0] = f;
  } else f = l[0];
  let u = f;
  let g;
  if (l[1] !== o) {
    g = [o, a, u];
    l[1] = o;
    l[2] = g;
  } else g = l[2];
  return g;
}
//@ chunk-ey2qag4x.js:3580-3608 placement
function useStringStateWithRef() {
  return useStateWithRef("");
}
//@ chunk-ey2qag4x.js:3608-3749 placement
function formatOrList(t) {
  if (t.length <= 1) return t[0] ?? "";
  if (t.length === 2) return `${t[0]} or ${t[1]}`;
  return `${t.slice(0, -1).join(", ")}, or ${t.at(-1)}`;
}
//@ chunk-ey2qag4x.js:3749-3760 placement
var MAX_OPTION_LABEL_CHARS = 300;
//@ chunk-ey2qag4x.js:3760-3813 placement
function moreCharactersSuffix(t) {
  return ` \u2026 +${t} more characters`;
}
//@ chunk-ey2qag4x.js:3813-3924 placement
function truncateOptionLabel(t) {
  if (t.length <= MAX_OPTION_LABEL_CHARS) return t;
  let o = truncateCodePoints(t, MAX_OPTION_LABEL_CHARS);
  if (o === t) return t;
  let i = [...t].length - MAX_OPTION_LABEL_CHARS;
  return o + moreCharactersSuffix(i);
}
//@ chunk-ey2qag4x.js:3924-4554 placement
/**
 * 组合打开时间与拒绝记录，给出 refuse/refuseCharacter 判断。
 */
function useRefuseInput(openedAt, windowMs) {
  let f = w(18);
  let i = windowMs === undefined ? RECENT_INPUT_GUARD_MS_2 : windowMs;
  let inputClock = useInputClock();
  let inputRefusalWindow = useInputRefusalWindow(i);
  let d;
  if (f[0] !== openedAt || f[1] !== inputClock || f[2] !== inputRefusalWindow || f[3] !== i) {
    d = openedAt === undefined ? inputRefusalWindow : () => isWithinRecentInput(inputClock, openedAt, i);
    f[0] = openedAt;
    f[1] = inputClock;
    f[2] = inputRefusalWindow;
    f[3] = i;
    f[4] = d;
  } else d = f[4];
  let u = d;
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let b;
  if (f[5] !== u || f[6] !== noteRefused || f[7] !== refusedWithin || f[8] !== i) {
    b = () => {
      if (u() || refusedWithin(i)) {
        noteRefused();
        return true;
      }
      return false;
    };
    f[5] = u;
    f[6] = noteRefused;
    f[7] = refusedWithin;
    f[8] = i;
    f[9] = b;
  } else b = f[9];
  let refuse = b;
  let x;
  if (f[10] !== u || f[11] !== noteRefused || f[12] !== refusedWithin || f[13] !== i) {
    x = () => {
      if (!u() && !refusedWithin(i)) {
        return false;
      }
      noteRefused();
      return true;
    };
    f[10] = u;
    f[11] = noteRefused;
    f[12] = refusedWithin;
    f[13] = i;
    f[14] = x;
  } else x = f[14];
  let refuseCharacter = x;
  let B;
  if (f[15] !== refuse || f[16] !== refuseCharacter) {
    B = {
      refuse,
      refuseCharacter,
    };
    f[15] = refuse;
    f[16] = refuseCharacter;
    f[17] = B;
  } else B = f[17];
  return B;
}
//@ chunk-ey2qag4x.js:4554-9171 placement
/**
 * 通用单选列表组件（标题、标签、禁用、默认值、输入拒绝）。
 */
function Select(props) {
  let D = w(73);
  let {
    options,
    onChange,
    onFocus,
    onCancel,
    isDisabled,
    disableSelection,
    defaultValue,
    refuseInput,
    headings,
    drawLabels,
    hidePromptWhileDisabled,
  } = props;
  let x = isDisabled === undefined ? false : isDisabled;
  let C = disableSelection === undefined ? false : disableSelection;
  let drawLabel = drawLabels === undefined ? false : drawLabels;
  let N = hidePromptWhileDisabled === undefined ? false : hidePromptWhileDisabled;
  let [h, K, m] = useStringStateWithRef();
  let [W, T] = y(null);
  let L;
  if (D[0] === MEMO_CACHE_SENTINEL) {
    L = isArrowNavEnabled();
    D[0] = L;
  } else L = D[0];
  let M = L;
  let [E, H, v] = useStateWithRef(null);
  let ue;
  if (D[1] !== options) {
    ue = options.map(optionValueString).join("\x00");
    D[1] = options;
    D[2] = ue;
  } else ue = D[2];
  let ve = ue;
  let [Y, J] = y(ve);
  if (Y !== ve) {
    J(ve);
    v(nullPlaceholder1);
    m(emptyPlaceholder1);
  }
  let [ye, fe, ee] = useStateWithRef(null);
  if (Y !== ve && ye !== null) {
    ee(nullPlaceholder2);
    m(emptyPlaceholder2);
  }
  let O = ye !== null && options[ye - 1]?.type === "input" ? options[ye - 1] : null;
  let xe = R(null);
  useFocusOnMount(xe, !x);
  useRegisterOverlay("select", !!onCancel && !x);
  let U;
  if (
    D[3] !== C ||
    D[4] !== O ||
    D[5] !== onChange ||
    D[6] !== onFocus ||
    D[7] !== options ||
    D[8] !== m ||
    D[9] !== v ||
    D[10] !== ee
  ) {
    U = (me) => {
      if (C) {
        return;
      }
      if (O) {
        if (me === "" && !O.screenReaderEmptySubmit) {
          T("Enter some text, or Escape for the list.");
          return;
        }
        if (onChange?.(O.value) === false) {
          return;
        }
        m(emptyPlaceholder3);
        ee(nullPlaceholder3);
        return;
      }
      let X = Number.parseInt(me, 10);
      if (!Number.isFinite(X) || X < 1 || X > options.length) {
        T(
          options.length === 0
            ? `Invalid selection "${me}". Nothing to select.`
            : `Invalid selection "${me}". Enter a number between 1 and ${options.length}.`,
        );
        m(emptyPlaceholder4);
        return;
      }
      let le = options[X - 1];
      if (le.disabled) {
        T(`Option ${X} is disabled.`);
        m(emptyPlaceholder5);
        return;
      }
      if (le.type === "input") {
        ee(() => X);
        v(nullPlaceholder4);
        let initialValue = le.initialValue ?? "";
        m(() => initialValue);
        le.onChange(initialValue);
        onFocus?.(le.value);
        return;
      }
      if (onChange?.(le.value) === false) {
        return;
      }
      m(emptyPlaceholder6);
      v(nullPlaceholder5);
    };
    D[3] = C;
    D[4] = O;
    D[5] = onChange;
    D[6] = onFocus;
    D[7] = options;
    D[8] = m;
    D[9] = v;
    D[10] = ee;
    D[11] = U;
  } else U = D[11];
  let Ve = U;
  let ne;
  if (
    D[12] !== K ||
    D[13] !== C ||
    D[14] !== H ||
    D[15] !== O ||
    D[16] !== fe ||
    D[17] !== x ||
    D[18] !== onCancel ||
    D[19] !== onFocus ||
    D[20] !== options ||
    D[21] !== refuseInput ||
    D[22] !== m ||
    D[23] !== v ||
    D[24] !== ee ||
    D[25] !== Ve
  ) {
    ne = (event) => {
      if (x) {
        return;
      }
      if (event.key === "escape" && event.name === "escape") {
        event.preventDefault();
        if (O) {
          if (O.onChange(O.initialValue ?? "") === false) {
            return;
          }
          ee(nullPlaceholder6);
          m(emptyPlaceholder7);
          let we = options.find(isNotInputOption) ?? options[0];
          if (we) onFocus?.(we.value);
          return;
        }
        onCancel?.();
        return;
      }
      if (C) {
        return;
      }
      if (event.key === "return" && event.name === "return") {
        event.preventDefault();
        if (refuseInput?.()) {
          return;
        }
        if (O || K.current.length > 0) {
          Ve(K.current);
          return;
        }
        if (M && H.current !== null) Ve(String(H.current + 1));
        return;
      }
      if (event.key === "backspace" || event.key === "delete") {
        event.preventDefault();
        let sliced = K.current.slice(0, -1);
        if (O && O.onChange(sliced) === false) {
          return;
        }
        m(() => sliced);
        return;
      }
      if (M && !O && fe.current === null && (event.name === "up" || event.name === "down")) {
        event.preventDefault();
        if (refuseInput?.()) {
          return;
        }
        T(null);
        m(emptyPlaceholder8);
        let ze = options.length;
        if (ze === 0) {
          return;
        }
        let Ce = H.current;
        let mt =
          Ce === null
            ? event.name === "down"
              ? 0
              : ze - 1
            : (Ce + (event.name === "down" ? 1 : -1) + ze) % ze;
        v(() => mt);
        let Be = options[mt];
        if (Be) onFocus?.(Be.value);
        return;
      }
      if (O) {
        if (event.key.length === 1 && !event.ctrl && !event.meta) {
          event.preventDefault();
          let Bt = K.current + event.key;
          if (O.onChange(Bt) === false) {
            return;
          }
          m(() => Bt);
        }
        return;
      }
      let Vt = normalizeFullWidthDigits_2(event.key);
      if (/^[0-9]$/.test(Vt)) {
        event.preventDefault();
        if (refuseInput?.()) {
          return;
        }
        T(null);
        m((Nt) => Nt + Vt);
        v(nullPlaceholder8);
      }
    };
    D[12] = K;
    D[13] = C;
    D[14] = H;
    D[15] = O;
    D[16] = fe;
    D[17] = x;
    D[18] = onCancel;
    D[19] = onFocus;
    D[20] = options;
    D[21] = refuseInput;
    D[22] = m;
    D[23] = v;
    D[24] = ee;
    D[25] = Ve;
    D[26] = ne;
  } else ne = D[26];
  let onKeyDown = ne;
  let yt;
  if (D[27] !== h || D[28] !== O || D[29] !== ye || D[30] !== onCancel || D[31] !== options.length) {
    yt = O
      ? `Enter text for option ${ye} (${reactNodeText(O.label)}), or Escape for the list: ${h}`
      : options.length === 0
        ? `Nothing to select${onCancel ? ". Escape to cancel" : ""}: ${h}`
        : `Select with numbers [1-${options.length}]${M ? " or up / down arrow keys" : ""}. Then ${formatOrList(["Enter to submit", ...(onCancel ? ["Escape to cancel"] : [])])}: ${h}`;
    D[27] = h;
    D[28] = O;
    D[29] = ye;
    D[30] = onCancel;
    D[31] = options.length;
    D[32] = yt;
  } else yt = D[32];
  let _e = yt;
  let column;
  if (D[33] !== _e) {
    column = bunStringWidth(_e);
    D[33] = _e;
    D[34] = column;
  } else column = D[34];
  const active = !x && !C && E === null;
  let Qe;
  if (D[35] !== column || D[36] !== active) {
    Qe = {
      line: 0,
      column,
      active,
      visible: true,
    };
    D[35] = column;
    D[36] = active;
    D[37] = Qe;
  } else Qe = D[37];
  let ref = useDeclaredCursor(Qe);
  let ht;
  if (D[38] !== onKeyDown || D[39] !== x) {
    ht = x
      ? {}
      : {
          tabIndex: 0,
          onKeyDown,
        };
    D[38] = onKeyDown;
    D[39] = x;
    D[40] = ht;
  } else ht = D[40];
  let De;
  if (
    D[41] !== defaultValue ||
    D[42] !== C ||
    D[43] !== drawLabel ||
    D[44] !== E ||
    D[45] !== headings ||
    D[46] !== x ||
    D[47] !== options
  ) {
    let Ne;
    if (
      D[49] !== defaultValue ||
      D[50] !== C ||
      D[51] !== drawLabel ||
      D[52] !== E ||
      D[53] !== headings ||
      D[54] !== x
    ) {
      Ne = (p, Ft) =>
        jsxProd_default_2(
          Kc,
          {
            children: [
              headings?.get(Ft),
              jsxProd_default(SelectOptionLabel, {
                index: Ft + 1,
                option: p,
                selected: defaultValue !== undefined && p.value === defaultValue,
                focused: E === Ft && !x && !C,
                drawLabel,
              }),
            ],
          },
          String(p.value),
        );
      D[49] = defaultValue;
      D[50] = C;
      D[51] = drawLabel;
      D[52] = E;
      D[53] = headings;
      D[54] = x;
      D[55] = Ne;
    } else Ne = D[55];
    De = options.map(Ne);
    D[41] = defaultValue;
    D[42] = C;
    D[43] = drawLabel;
    D[44] = E;
    D[45] = headings;
    D[46] = x;
    D[47] = options;
    D[48] = De;
  } else De = D[48];
  let Ne;
  if (D[56] !== headings || D[57] !== options.length) {
    Ne = headings?.get(options.length);
    D[56] = headings;
    D[57] = options.length;
    D[58] = Ne;
  } else Ne = D[58];
  let St;
  if (D[59] !== W) {
    St =
      W &&
      jsxProd_default(Text, {
        children: W,
      });
    D[59] = W;
    D[60] = St;
  } else St = D[60];
  let Le;
  if (D[61] !== ref || D[62] !== C || D[63] !== N || D[64] !== x || D[65] !== _e) {
    Le =
      !C &&
      !(x && N) &&
      jsxProd_default(Box, {
        ref,
        children: jsxProd_default(Text, {
          children: _e,
        }),
      });
    D[61] = ref;
    D[62] = C;
    D[63] = N;
    D[64] = x;
    D[65] = _e;
    D[66] = Le;
  } else Le = D[66];
  let wt;
  if (D[67] !== ht || D[68] !== De || D[69] !== Ne || D[70] !== St || D[71] !== Le) {
    wt = jsxProd_default_2(Box, {
      ref: xe,
      flexDirection: "column",
      ...ht,
      children: [De, Ne, St, Le],
    });
    D[67] = ht;
    D[68] = De;
    D[69] = Ne;
    D[70] = St;
    D[71] = Le;
    D[72] = wt;
  } else wt = D[72];
  return wt;
}
//@ chunk-ey2qag4x.js:9171-15553 placement
/**
 * 多选列表组件（提交按钮、默认值、输入拒绝）。
 */
function MultiSelect(props) {
  let b = w(91);
  let {
    options,
    defaultValue,
    onChange,
    onSubmit,
    onFocus,
    onCancel,
    isDisabled,
    submitButtonText,
    refuseInput,
  } = props;
  let V;
  if (b[0] !== defaultValue) {
    V = defaultValue === undefined ? [] : defaultValue;
    b[0] = defaultValue;
    b[1] = V;
  } else V = b[1];
  let x = V;
  let C = isDisabled === undefined ? false : isDisabled;
  let [B, N, h] = useStringStateWithRef();
  let [K, m] = y(null);
  let W;
  if (b[2] === MEMO_CACHE_SENTINEL) {
    W = isArrowNavEnabled();
    b[2] = W;
  } else W = b[2];
  let T = W;
  let [D, L, M] = useStateWithRef(null);
  let [E, H, v] = useStateWithRef(null);
  let ue;
  if (b[3] !== options) {
    ue = options.map(optionValueString_2).join("\x00");
    b[3] = options;
    b[4] = ue;
  } else ue = b[4];
  let ve = ue;
  let [Y, J] = y(ve);
  if (Y !== ve) {
    J(ve);
    M(nullPlaceholder9);
    v(nullPlaceholder10);
    h(emptyPlaceholder9);
  }
  let ye;
  if (b[5] !== x || b[6] !== options) {
    ye = () =>
      new Set(options.flatMap((option, ee) => (!option.disabled && x.includes(option.value) ? [ee] : [])));
    b[5] = x;
    b[6] = options;
    b[7] = ye;
  } else ye = b[7];
  let O = ye;
  let [xe, U] = y(null);
  let me = R(false);
  let X = R(false);
  let le;
  if (b[8] !== onSubmit || b[9] !== xe) {
    le = () => {
      if (xe !== null) {
        let Te = [...xe];
        U(null);
        me.current = false;
        onSubmit?.(Te);
      }
    };
    b[8] = onSubmit;
    b[9] = xe;
    b[10] = le;
  } else le = b[10];
  let Ve;
  if (b[11] !== xe) {
    Ve = [xe];
    b[11] = xe;
    b[12] = Ve;
  } else Ve = b[12];
  P(le, Ve);
  let [ne, A, we] = useStateWithRef(null);
  if (Y !== ve && ne !== null) {
    we(nullPlaceholder7);
    h(emptyPlaceholder10);
  }
  let te = ne && options[ne.index - 1]?.type === "input" ? options[ne.index - 1] : null;
  let ze = R(null);
  useFocusOnMount(ze, !C);
  useRegisterOverlay("multi-select", !!onCancel && !C);
  let Ce;
  if (b[13] !== onChange || b[14] !== h || b[15] !== M || b[16] !== we || b[17] !== v) {
    Ce = (mt) => {
      me.current = true;
      if (onChange?.([...mt]) === false) {
        me.current = false;
        return;
      }
      U(mt);
      h(emptyPlaceholder11);
      we(nullPlaceholder11);
      M(nullPlaceholder12);
      v(nullPlaceholder13);
    };
    b[13] = onChange;
    b[14] = h;
    b[15] = M;
    b[16] = we;
    b[17] = v;
    b[18] = Ce;
  } else Ce = b[18];
  let Be = Ce;
  let Bt;
  if (
    b[19] !== x ||
    b[20] !== Be ||
    b[21] !== te ||
    b[22] !== ne ||
    b[23] !== onFocus ||
    b[24] !== options ||
    b[25] !== h ||
    b[26] !== M ||
    b[27] !== we ||
    b[28] !== v
  ) {
    Bt = (Vt) => {
      if (te && ne) {
        if (Vt === "") {
          m("Enter some text, or Escape for the list.");
          return;
        }
        Be([...ne.stashed, te.value]);
        return;
      }
      let trimmed = Vt.trim();
      if (trimmed === "") {
        Be(x);
        return;
      }
      let filtered = trimmed.split(/[\s,]+/).filter(Boolean);
      if (filtered.length === 0) {
        Be(x);
        return;
      }
      let yt = new Set();
      let _e = [];
      let ke = null;
      for (const dt of filtered) {
        if (!/^\d+$/.test(dt)) {
          m(
            `Invalid selection "${dt}". Enter numbers between 1 and ${options.length}, comma- or space-separated.`,
          );
          h(emptyPlaceholder12);
          return;
        }
        let Qe = Number.parseInt(dt, 10);
        if (yt.has(Qe)) {
          continue;
        }
        yt.add(Qe);
        if (Qe < 1 || Qe > options.length) {
          m(
            `Invalid selection "${dt}". Enter numbers between 1 and ${options.length}, comma- or space-separated.`,
          );
          h(emptyPlaceholder13);
          return;
        }
        let ct = options[Qe - 1];
        if (ct.disabled) {
          m(`Option ${Qe} is disabled.`);
          h(emptyPlaceholder14);
          return;
        }
        if (ct.type === "input") {
          if (ke) {
            m("Only one free-text option can be included per selection.");
            h(emptyPlaceholder15);
            return;
          }
          ke = {
            index: Qe,
            opt: ct,
          };
          continue;
        }
        _e.push(ct.value);
      }
      if (ke?.opt) {
        we(() => ({
          index: ke.index,
          stashed: _e,
          raw: trimmed,
        }));
        M(nullPlaceholder14);
        v(nullPlaceholder15);
        let initialValue = ke.opt.initialValue ?? "";
        h(() => initialValue);
        ke.opt.onChange(initialValue);
        onFocus?.(ke.opt.value);
        return;
      }
      Be(_e);
    };
    b[19] = x;
    b[20] = Be;
    b[21] = te;
    b[22] = ne;
    b[23] = onFocus;
    b[24] = options;
    b[25] = h;
    b[26] = M;
    b[27] = we;
    b[28] = v;
    b[29] = Bt;
  } else Bt = b[29];
  let De = Bt;
  let Ne;
  if (
    b[30] !== N ||
    b[31] !== O ||
    b[32] !== Be ||
    b[33] !== L ||
    b[34] !== te ||
    b[35] !== ne ||
    b[36] !== A ||
    b[37] !== C ||
    b[38] !== onCancel ||
    b[39] !== onFocus ||
    b[40] !== options ||
    b[41] !== refuseInput ||
    b[42] !== h ||
    b[43] !== M ||
    b[44] !== we ||
    b[45] !== v ||
    b[46] !== De ||
    b[47] !== H
  ) {
    Ne = (event) => {
      if (C) {
        return;
      }
      if (event.key === "escape" && event.name === "escape") {
        event.preventDefault();
        if (ne) {
          let { raw } = ne;
          we(nullPlaceholder19);
          h(() => raw);
          let St = options.find(isNotInputOption_2) ?? options[0];
          if (St) onFocus?.(St.value);
          return;
        }
        onCancel?.();
        return;
      }
      if (event.key === "return" && event.name === "return") {
        event.preventDefault();
        if (X.current) {
          refuseInput?.();
          X.current = false;
          h(emptyPlaceholder16);
          m("Part of that entry arrived before the list was ready \u2014 enter your selection again.");
          return;
        }
        if (refuseInput?.()) {
          return;
        }
        if (me.current) {
          return;
        }
        if (T && !te && N.current.length === 0 && H.current !== null) {
          let sorted = [...H.current].sort(subtract);
          if (sorted.length === 0) Be([]);
          else De(sorted.map(nextIndexString).join(" "));
          return;
        }
        De(N.current);
        return;
      }
      if (event.key === "backspace" || event.key === "delete") {
        event.preventDefault();
        let wt = N.current;
        let sliced = wt.slice(0, -1);
        if (te && te.onChange(sliced) === false) {
          return;
        }
        h(() => sliced);
        if (!te && wt !== sliced) v(nullPlaceholder16);
        return;
      }
      if (T && !te && A.current === null && (event.name === "up" || event.name === "down")) {
        event.preventDefault();
        if (refuseInput?.()) {
          return;
        }
        m(null);
        h(emptyPlaceholder17);
        X.current = false;
        let bt = options.length;
        if (bt === 0) {
          return;
        }
        let on = L.current;
        let Ge =
          on === null
            ? event.name === "down"
              ? 0
              : bt - 1
            : (on + (event.name === "down" ? 1 : -1) + bt) % bt;
        M(() => Ge);
        let Lt = options[Ge];
        if (Lt) onFocus?.(Lt.value);
        return;
      }
      if (
        T &&
        !te &&
        A.current === null &&
        L.current !== null &&
        replaceIdeographicSpace(event.key) === " "
      ) {
        event.preventDefault();
        if (refuseInput?.()) {
          return;
        }
        let Ze = L.current;
        let sn = options[Ze];
        if (!sn) {
          return;
        }
        if (sn.disabled) {
          m(`Option ${Ze + 1} is disabled.`);
          return;
        }
        m(null);
        v((_n) => {
          let Rt = new Set(_n ?? O());
          if (Rt.has(Ze)) Rt.delete(Ze);
          else Rt.add(Ze);
          return Rt;
        });
        return;
      }
      if (te) {
        if (event.key.length === 1 && !event.ctrl && !event.meta) {
          event.preventDefault();
          let Gn = N.current + event.key;
          if (te.onChange(Gn) === false) {
            return;
          }
          h(() => Gn);
        }
        return;
      }
      let replaced = replaceIdeographicSpace(normalizeFullWidthDigits_2(event.key))
        .replace("\uFF0C", ",")
        .replace("\u3001", ",");
      if (/^[0-9, ]$/.test(replaced)) {
        event.preventDefault();
        if (X.current) {
          refuseInput?.();
          return;
        }
        if (refuseInput?.()) {
          X.current = true;
          return;
        }
        m(null);
        h((Xo) => Xo + replaced);
        M(nullPlaceholder17);
        v(nullPlaceholder18);
      }
    };
    b[30] = N;
    b[31] = O;
    b[32] = Be;
    b[33] = L;
    b[34] = te;
    b[35] = ne;
    b[36] = A;
    b[37] = C;
    b[38] = onCancel;
    b[39] = onFocus;
    b[40] = options;
    b[41] = refuseInput;
    b[42] = h;
    b[43] = M;
    b[44] = we;
    b[45] = v;
    b[46] = De;
    b[47] = H;
    b[48] = Ne;
  } else Ne = b[48];
  let onKeyDown = Ne;
  let et;
  if (
    b[49] !== B ||
    b[50] !== x ||
    b[51] !== te ||
    b[52] !== ne?.index ||
    b[53] !== onCancel ||
    b[54] !== options.length ||
    b[55] !== submitButtonText ||
    b[56] !== E
  ) {
    et = te
      ? `Enter text for option ${ne?.index} (${reactNodeText(te.label)}), or Escape for the list: ${B}`
      : `Select with numbers [1-${options.length}] (comma- or space-separated for several)${T ? " or up / down arrow keys" : ""}. Then ${formatOrList([...(T ? ["Space to toggle"] : []), `Enter to ${submitButtonText ?? "submit"}`, ...(x.length > 0 && E === null ? ["bare Enter for defaults"] : []), ...(onCancel ? ["Escape to cancel"] : [])])}: ${B}`;
    b[49] = B;
    b[50] = x;
    b[51] = te;
    b[52] = ne?.index;
    b[53] = onCancel;
    b[54] = options.length;
    b[55] = submitButtonText;
    b[56] = E;
    b[57] = et;
  } else et = b[57];
  let Ct = et;
  let column;
  if (b[58] !== Ct) {
    column = bunStringWidth(Ct);
    b[58] = Ct;
    b[59] = column;
  } else column = b[59];
  const active = !C && D === null;
  let ft;
  if (b[60] !== column || b[61] !== active) {
    ft = {
      line: 0,
      column,
      active,
      visible: true,
    };
    b[60] = column;
    b[61] = active;
    b[62] = ft;
  } else ft = b[62];
  let ref = useDeclaredCursor(ft);
  let an;
  if (b[63] !== x) {
    an = new Set(x);
    b[63] = x;
    b[64] = an;
  } else an = b[64];
  let z = an;
  let dn;
  if (b[65] !== onKeyDown || b[66] !== C) {
    dn = C
      ? {}
      : {
          tabIndex: 0,
          onKeyDown,
        };
    b[65] = onKeyDown;
    b[66] = C;
    b[67] = dn;
  } else dn = b[67];
  let cn;
  if (b[68] !== z || b[69] !== D || b[70] !== C || b[71] !== options || b[72] !== E) {
    let tt;
    if (b[74] !== z || b[75] !== D || b[76] !== C || b[77] !== E) {
      tt = (pn, On) =>
        jsxProd_default(
          SelectOptionLabel,
          {
            index: On + 1,
            option: pn,
            selected: E ? E.has(On) : z.has(pn.value),
            focused: D === On && !C,
          },
          String(pn.value),
        );
      b[74] = z;
      b[75] = D;
      b[76] = C;
      b[77] = E;
      b[78] = tt;
    } else tt = b[78];
    cn = options.map(tt);
    b[68] = z;
    b[69] = D;
    b[70] = C;
    b[71] = options;
    b[72] = E;
    b[73] = cn;
  } else cn = b[73];
  let tt;
  if (b[79] !== K) {
    tt =
      K &&
      jsxProd_default(Text, {
        children: K,
      });
    b[79] = K;
    b[80] = tt;
  } else tt = b[80];
  let children;
  if (b[81] !== Ct) {
    children = jsxProd_default(Text, {
      children: Ct,
    });
    b[81] = Ct;
    b[82] = children;
  } else children = b[82];
  let fn;
  if (b[83] !== ref || b[84] !== children) {
    fn = jsxProd_default(Box, {
      ref,
      children,
    });
    b[83] = ref;
    b[84] = children;
    b[85] = fn;
  } else fn = b[85];
  let Jn;
  if (b[86] !== dn || b[87] !== cn || b[88] !== tt || b[89] !== fn) {
    Jn = jsxProd_default_2(Box, {
      ref: ze,
      flexDirection: "column",
      ...dn,
      children: [cn, tt, fn],
    });
    b[86] = dn;
    b[87] = cn;
    b[88] = tt;
    b[89] = fn;
    b[90] = Jn;
  } else Jn = b[90];
  return Jn;
}
//@ chunk-ey2qag4x.js:15553-16760 placement
/**
 * 选项标签渲染（选中/焦点标记）。
 */
function SelectOptionLabel(props) {
  let u = w(26);
  let { index, option, selected, focused, drawLabel } = props;
  let d = drawLabel === undefined ? false : drawLabel;
  let g;
  if (u[0] !== focused) {
    g = {
      line: 0,
      column: 0,
      active: focused,
      visible: true,
    };
    u[0] = focused;
    u[1] = g;
  } else g = u[1];
  let ref = useDeclaredCursor(g);
  let b;
  if (u[2] !== option.label) {
    b = reactNodeText(option.label);
    u[2] = option.label;
    u[3] = b;
  } else b = u[3];
  let V = b;
  let x = option.description ? ` \u2014 ${option.description}` : "";
  const C = `${V}${x}`;
  let B;
  if (u[4] !== C) {
    B = truncateOptionLabel(C);
    u[4] = C;
    u[5] = B;
  } else B = u[5];
  let N = B;
  const h = option.disabled ? "(disabled)" : null;
  const K = selected ? "(selected)" : null;
  let m;
  if (u[6] !== h || u[7] !== K) {
    m = [h, K].filter(Boolean);
    u[6] = h;
    u[7] = K;
    u[8] = m;
  } else m = u[8];
  let joined = m.join(" ");
  if (d) {
    const T = joined ? ` ${joined}` : "";
    let D;
    if (u[9] !== index || u[10] !== T) {
      D = jsxProd_default_2(Text, {
        children: [index, ".", T],
      });
      u[9] = index;
      u[10] = T;
      u[11] = D;
    } else D = u[11];
    let L;
    if (u[12] !== option.description) {
      L =
        option.description &&
        jsxProd_default_2(Text, {
          children: ["\u2014 ", option.description],
        });
      u[12] = option.description;
      u[13] = L;
    } else L = u[13];
    let M;
    if (u[14] !== ref || u[15] !== option.label || u[16] !== D || u[17] !== L) {
      M = jsxProd_default_2(Box, {
        ref,
        children: [D, option.label, L],
      });
      u[14] = ref;
      u[15] = option.label;
      u[16] = D;
      u[17] = L;
      u[18] = M;
    } else M = u[18];
    return M;
  }
  const T = joined ? `${joined} ` : "";
  let children;
  if (u[19] !== N || u[20] !== index || u[21] !== T) {
    children = jsxProd_default_2(Text, {
      children: [index, ". ", T, N],
    });
    u[19] = N;
    u[20] = index;
    u[21] = T;
    u[22] = children;
  } else children = u[22];
  let L;
  if (u[23] !== ref || u[24] !== children) {
    L = jsxProd_default(Box, {
      ref,
      children,
    });
    u[23] = ref;
    u[24] = children;
    u[25] = L;
  } else L = u[25];
  return L;
}
//@ chunk-ey2qag4x.js:16760-18909 placement
/**
 * 确认/取消按钮对，带打开后输入拒绝窗口。
 */
function ConfirmButtons(props) {
  let h = w(43);
  let { confirmLabel, cancelLabel, onConfirm, onCancel, refuseInput, openedAt, windowMs } = props;
  let [g, c, b] = useStringStateWithRef();
  let [V, x] = y(null);
  let C = R(null);
  useFocusOnMount(C, true);
  useRegisterOverlay("select", true);
  let { refuse, refuseCharacter } = useRefuseInput(openedAt, windowMs);
  let K;
  if (h[0] !== refuseInput || h[1] !== refuse) {
    K = function m() {
      return (refuseInput?.() ?? false) || refuse();
    };
    h[0] = refuseInput;
    h[1] = refuse;
    h[2] = K;
  } else K = h[2];
  let m = K;
  let W;
  if (h[3] !== refuseInput || h[4] !== refuseCharacter) {
    W = function T() {
      return (refuseInput?.() ?? false) || refuseCharacter();
    };
    h[3] = refuseInput;
    h[4] = refuseCharacter;
    h[5] = W;
  } else W = h[5];
  let T = W;
  let D;
  if (h[6] !== onCancel || h[7] !== onConfirm || h[8] !== m || h[9] !== b) {
    D = (L) => {
      let lower = L.trim().toLowerCase();
      if ((lower === "y" || lower === "yes" || lower === "n" || lower === "no") && m()) {
        b(emptyPlaceholder18);
        return;
      }
      if (lower === "y" || lower === "yes") {
        return onConfirm();
      }
      if (lower === "n" || lower === "no") {
        return onCancel();
      }
      x("Please answer y or n.");
      b(emptyPlaceholder19);
    };
    h[6] = onCancel;
    h[7] = onConfirm;
    h[8] = m;
    h[9] = b;
    h[10] = D;
  } else D = h[10];
  let E = D;
  let H;
  if (h[11] !== c || h[12] !== onCancel || h[13] !== m || h[14] !== T || h[15] !== b || h[16] !== E) {
    H = (event) => {
      if (event.key === "escape" && event.name === "escape") {
        event.preventDefault();
        if (m()) {
          return;
        }
        return onCancel();
      }
      if (event.key === "return" && event.name === "return") {
        event.preventDefault();
        return E(c.current);
      }
      if (event.key === "backspace" || event.key === "delete") {
        event.preventDefault();
        b(dropLastChar);
        return;
      }
      if (event.key.length === 1 && !event.ctrl && !event.meta) {
        event.preventDefault();
        if (T()) {
          return;
        }
        x(null);
        b((ue) => ue + event.key);
      }
    };
    h[11] = c;
    h[12] = onCancel;
    h[13] = m;
    h[14] = T;
    h[15] = b;
    h[16] = E;
    h[17] = H;
  } else H = h[17];
  let onKeyDown = H;
  let Y = `Enter y/n: ${g}`;
  let column;
  if (h[18] !== Y) {
    column = bunStringWidth(Y);
    h[18] = Y;
    h[19] = column;
  } else column = h[19];
  let ye;
  if (h[20] !== column) {
    ye = {
      line: 0,
      column,
      active: true,
      visible: true,
    };
    h[20] = column;
    h[21] = ye;
  } else ye = h[21];
  let ref = useDeclaredCursor(ye);
  let ee;
  if (h[22] !== confirmLabel) {
    ee = reactNodeText(confirmLabel);
    h[22] = confirmLabel;
    h[23] = ee;
  } else ee = h[23];
  let O;
  if (h[24] !== ee) {
    O = jsxProd_default_2(Text, {
      children: ["y. ", ee],
    });
    h[24] = ee;
    h[25] = O;
  } else O = h[25];
  let xe;
  if (h[26] !== cancelLabel) {
    xe = reactNodeText(cancelLabel);
    h[26] = cancelLabel;
    h[27] = xe;
  } else xe = h[27];
  let U;
  if (h[28] !== xe) {
    U = jsxProd_default_2(Text, {
      children: ["n. ", xe],
    });
    h[28] = xe;
    h[29] = U;
  } else U = h[29];
  let me;
  if (h[30] !== V) {
    me =
      V &&
      jsxProd_default(Text, {
        children: V,
      });
    h[30] = V;
    h[31] = me;
  } else me = h[31];
  let children;
  if (h[32] !== Y) {
    children = jsxProd_default(Text, {
      children: Y,
    });
    h[32] = Y;
    h[33] = children;
  } else children = h[33];
  let le;
  if (h[34] !== ref || h[35] !== children) {
    le = jsxProd_default(Box, {
      ref,
      children,
    });
    h[34] = ref;
    h[35] = children;
    h[36] = le;
  } else le = h[36];
  let Te;
  if (h[37] !== onKeyDown || h[38] !== U || h[39] !== me || h[40] !== le || h[41] !== O) {
    Te = jsxProd_default_2(Box, {
      ref: C,
      flexDirection: "column",
      tabIndex: 0,
      onKeyDown,
      children: [O, U, me, le],
    });
    h[37] = onKeyDown;
    h[38] = U;
    h[39] = me;
    h[40] = le;
    h[41] = O;
    h[42] = Te;
  } else Te = h[42];
  return Te;
}
//@ chunk-ey2qag4x.js:18909-18913 placement
init_react_production();
//@ chunk-ey2qag4x.js:18913-18917 placement
init_react_production();
//@ chunk-ey2qag4x.js:18917-18954 placement
function elementKeyOrEmpty(x) {
  return isValidElement_default(x) ? x.key : "";
}
//@ chunk-ey2qag4x.js:18954-18985 placement
/**
 * 用户消息背景色主题键。
 */
var USER_MESSAGE_BACKGROUND = "userMessageBackground";
//@ chunk-ey2qag4x.js:18985-19040 placement
/**
 * 用户消息背景色模式：无色（level 0）时用 inverse，否则用传入值。
 */
function userMessageBackgroundMode(t = "tint") {
  return sequential.level === 0 ? "inverse" : t;
}
//@ chunk-ey2qag4x.js:19040-19054 placement
var WINDOWED_TEXT_CONTEXT = qt("");
//@ chunk-ey2qag4x.js:19054-19582 placement
/**
 * 按窗口起点切片渲染子元素文本。
 */
function WindowedText(t) {
  let o = w(14);
  let i;
  let a;
  if (o[0] !== t) {
    ({ windowStart: a, ...i } = t);
    o[0] = t;
    o[1] = i;
    o[2] = a;
  } else {
    i = o[1];
    a = o[2];
  }
  let l = a === undefined ? 0 : a;
  let f;
  let d;
  let u;
  if (o[3] !== i.children || o[4] !== l) {
    let mapped = Fy.toArray(i.children).map(elementKeyOrEmpty);
    f = WINDOWED_TEXT_CONTEXT.Provider;
    d = l;
    u = mapped.join();
    o[3] = i.children;
    o[4] = l;
    o[5] = f;
    o[6] = d;
    o[7] = u;
  } else {
    f = o[5];
    d = o[6];
    u = o[7];
  }
  const value = `${d} ${u}`;
  let children;
  if (o[8] !== i) {
    children = jsxProd_default(Box, {
      flexDirection: "column",
      ...i,
    });
    o[8] = i;
    o[9] = children;
  } else children = o[9];
  let V;
  if (o[10] !== f || o[11] !== value || o[12] !== children) {
    V = jsxProd_default(f, {
      value,
      children,
    });
    o[10] = f;
    o[11] = value;
    o[12] = children;
    o[13] = V;
  } else V = o[13];
  return V;
}
//@ chunk-ey2qag4x.js:19582-19808 placement
/**
 * 行悬停高亮：返回 [是否高亮, 设置悬停]，同一上下文里只有一行处于悬停态。
 */
function useHoverHighlight(t) {
  let $ = w(5);
  let o = Se(WINDOWED_TEXT_CONTEXT);
  let [i, a] = y(null);
  let l = t && i === o;
  if (i !== null && !l) a(null);
  let d;
  if ($[0] !== o) {
    d = (u) => a(u ? o : null);
    $[0] = o;
    $[1] = d;
  } else d = $[1];
  let g;
  if ($[2] !== l || $[3] !== d) {
    g = [l, d];
    $[2] = l;
    $[3] = d;
    $[4] = g;
  } else g = $[4];
  return g;
}
export {
  useInputRefusalWindow,
  useRefusalTracker,
  useMountTime,
  settleKey,
  USER_MESSAGE_BACKGROUND,
  typeaheadEpochTracker,
  Select,
  userMessageBackgroundMode,
  WindowedText,
  useHoverHighlight,
  MultiSelect,
  ConfirmButtons,
};

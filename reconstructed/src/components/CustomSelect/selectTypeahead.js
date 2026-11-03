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
import { j, R, ce, y, Kc, P, dh, qt, Fy, Se } from "../../../vendor/react/cjs/react.production.js";
import { RECENT_INPUT_GUARD_MS, isWithinRecentInput } from "../../hooks/useRecentInputGuard.js";
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
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { sequential } from "../../utils/sequential.js";

//@ chunk-ey2qag4x.js:1685-1689 placement
j();
//@ chunk-ey2qag4x.js:1689-1693 placement
j();
/**
 * 打开后一段时间内拒绝输入的判断（防止误触）。
 */
//@ chunk-ey2qag4x.js:1693-1777 placement
function useInputRefusalWindow(t = RECENT_INPUT_GUARD_MS) {
  let o = useInputClock(),
    i = R(Date.now());
  return ce(() => isWithinRecentInput(o, i.current, t), [o, t]);
}
/**
 * 组件挂载时间。
 */
//@ chunk-ey2qag4x.js:1777-1820 placement
function useMountTime() {
  return R(Date.now()).current;
}
/**
 * 根据是否已过冷静期返回 remountKey（settled/held）。
 */
//@ chunk-ey2qag4x.js:1820-1902 placement
function settleKey(t, o = RECENT_INPUT_GUARD_MS) {
  let i = useTimeout(o, t);
  return { remountKey: i ? "settled" : "held", settled: i };
}
//@ chunk-ey2qag4x.js:1902-1986 placement
function jnn() {
  let [t, o] = y(0),
    i = ce(() => o((a) => a + 1), []);
  return { epoch: t, noteAttempt: i };
}
/**
 * 记录最近一次被拒输入并判断是否仍在拒绝窗口内。
 */
//@ chunk-ey2qag4x.js:1986-2192 placement
function useRefusalTracker() {
  let t = useInputClock(),
    o = R(null),
    { epoch: epoch, noteAttempt: noteAttempt } = jnn(),
    l = ce((d = RECENT_INPUT_GUARD_MS) => o.current !== null && isWithinRecentInput(t, o.current, d), [t]),
    f = ce(() => {
      ((o.current = Date.now()), noteAttempt());
    }, [noteAttempt]);
  return { refusedWithin: l, noteRefused: f, epoch: epoch };
}
//@ chunk-ey2qag4x.js:2192-2232 placement
function Fu(kt) {
  return String(kt.value);
}
//@ chunk-ey2qag4x.js:2232-2258 placement
function ku() {
  return null;
}
//@ chunk-ey2qag4x.js:2258-2281 placement
function Ru() {
  return "";
}
//@ chunk-ey2qag4x.js:2281-2307 placement
function Mu() {
  return null;
}
//@ chunk-ey2qag4x.js:2307-2330 placement
function Eu() {
  return "";
}
//@ chunk-ey2qag4x.js:2330-2353 placement
function Pu() {
  return "";
}
//@ chunk-ey2qag4x.js:2353-2379 placement
function Au() {
  return null;
}
//@ chunk-ey2qag4x.js:2379-2402 placement
function Wu() {
  return "";
}
//@ chunk-ey2qag4x.js:2402-2425 placement
function Bu() {
  return "";
}
//@ chunk-ey2qag4x.js:2425-2451 placement
function Nu() {
  return null;
}
//@ chunk-ey2qag4x.js:2451-2474 placement
function Lu() {
  return "";
}
//@ chunk-ey2qag4x.js:2474-2500 placement
function Uu() {
  return null;
}
//@ chunk-ey2qag4x.js:2500-2526 placement
function Ku() {
  return null;
}
//@ chunk-ey2qag4x.js:2526-2549 placement
function Hu() {
  return "";
}
//@ chunk-ey2qag4x.js:2549-2590 placement = _temp7 (1)
function ju(opt) {
  return opt.type !== "input";
}
//@ chunk-ey2qag4x.js:2590-2613 placement
function zu() {
  return "";
}
//@ chunk-ey2qag4x.js:2613-2639 placement
function _u() {
  return null;
}
//@ chunk-ey2qag4x.js:2639-2679 placement
function Gu(Ql) {
  return String(Ql.value);
}
//@ chunk-ey2qag4x.js:2679-2705 placement
function qu() {
  return null;
}
//@ chunk-ey2qag4x.js:2705-2731 placement
function Yu() {
  return null;
}
//@ chunk-ey2qag4x.js:2731-2754 placement
function Ju() {
  return "";
}
//@ chunk-ey2qag4x.js:2754-2780 placement
function Xu() {
  return null;
}
//@ chunk-ey2qag4x.js:2780-2803 placement
function Qu() {
  return "";
}
//@ chunk-ey2qag4x.js:2803-2826 placement
function Zu() {
  return "";
}
//@ chunk-ey2qag4x.js:2826-2852 placement
function ed() {
  return null;
}
//@ chunk-ey2qag4x.js:2852-2878 placement
function td() {
  return null;
}
//@ chunk-ey2qag4x.js:2878-2904 placement
function nd() {
  return null;
}
//@ chunk-ey2qag4x.js:2904-2927 placement
function od() {
  return "";
}
//@ chunk-ey2qag4x.js:2927-2950 placement
function id() {
  return "";
}
//@ chunk-ey2qag4x.js:2950-2973 placement
function sd() {
  return "";
}
//@ chunk-ey2qag4x.js:2973-2996 placement
function rd() {
  return "";
}
//@ chunk-ey2qag4x.js:2996-3022 placement
function ld() {
  return null;
}
//@ chunk-ey2qag4x.js:3022-3048 placement
function ad() {
  return null;
}
//@ chunk-ey2qag4x.js:3048-3074 placement
function ud() {
  return null;
}
//@ chunk-ey2qag4x.js:3074-3115 placement = _temp7 (1)
function dd(opt) {
  return opt.type !== "input";
}
//@ chunk-ey2qag4x.js:3115-3138 placement
function cd() {
  return "";
}
//@ chunk-ey2qag4x.js:3138-3170 placement
function pd(ea, ls) {
  return ea - ls;
}
//@ chunk-ey2qag4x.js:3170-3206 placement
function fd(na) {
  return String(na + 1);
}
//@ chunk-ey2qag4x.js:3206-3232 placement
function md() {
  return null;
}
//@ chunk-ey2qag4x.js:3232-3255 placement
function hd() {
  return "";
}
//@ chunk-ey2qag4x.js:3255-3281 placement
function bd() {
  return null;
}
//@ chunk-ey2qag4x.js:3281-3307 placement
function gd() {
  return null;
}
//@ chunk-ey2qag4x.js:3307-3330 placement
function vd() {
  return "";
}
//@ chunk-ey2qag4x.js:3330-3353 placement
function xd() {
  return "";
}
//@ chunk-ey2qag4x.js:3353-3391 placement
function Id(Ve) {
  return Ve.slice(0, -1);
}
//@ chunk-ey2qag4x.js:3391-3580 placement
function useStateWithRef(t) {
  let l = w(3),
    [o, i] = y(t),
    a = R(t),
    f;
  if (l[0] === MEMO_CACHE_SENTINEL)
    ((f = (d) => {
      ((a.current = d(a.current)), i(a.current));
    }),
      (l[0] = f));
  else f = l[0];
  let u = f,
    g;
  if (l[1] !== o) ((g = [o, a, u]), (l[1] = o), (l[2] = g));
  else g = l[2];
  return g;
}
//@ chunk-ey2qag4x.js:3580-3608 placement
function Jt() {
  return useStateWithRef("");
}
//@ chunk-ey2qag4x.js:3608-3749 placement
function formatOrList(t) {
  if (t.length <= 1) return t[0] ?? "";
  if (t.length === 2) return `${t[0]} or ${t[1]}`;
  return `${t.slice(0, -1).join(", ")}, or ${t.at(-1)}`;
}
//@ chunk-ey2qag4x.js:3749-3760 placement
var ti = 300;
//@ chunk-ey2qag4x.js:3760-3813 placement
function Va(t) {
  return ` \u2026 +${t} more characters`;
}
//@ chunk-ey2qag4x.js:3813-3924 placement
function truncateOptionLabel(t) {
  if (t.length <= ti) return t;
  let o = truncateCodePoints(t, ti);
  if (o === t) return t;
  let i = [...t].length - ti;
  return o + Va(i);
}
/**
 * 组合打开时间与拒绝记录，给出 refuse/refuseCharacter 判断。
 */
//@ chunk-ey2qag4x.js:3924-4554 placement
function useRefuseInput(t, o) {
  let f = w(18),
    i = o === void 0 ? RECENT_INPUT_GUARD_MS : o,
    a = useInputClock(),
    l = useInputRefusalWindow(i),
    d;
  if (f[0] !== t || f[1] !== a || f[2] !== l || f[3] !== i)
    ((d = t === void 0 ? l : () => isWithinRecentInput(a, t, i)),
      (f[0] = t),
      (f[1] = a),
      (f[2] = l),
      (f[3] = i),
      (f[4] = d));
  else d = f[4];
  let u = d,
    { refusedWithin: refusedWithin, noteRefused: noteRefused } = useRefusalTracker(),
    b;
  if (f[5] !== u || f[6] !== noteRefused || f[7] !== refusedWithin || f[8] !== i)
    ((b = () => {
      if (u() || refusedWithin(i)) {
        return (noteRefused(), !0);
      }
      return !1;
    }),
      (f[5] = u),
      (f[6] = noteRefused),
      (f[7] = refusedWithin),
      (f[8] = i),
      (f[9] = b));
  else b = f[9];
  let V = b,
    x;
  if (f[10] !== u || f[11] !== noteRefused || f[12] !== refusedWithin || f[13] !== i)
    ((x = () => {
      if (!u() && !refusedWithin(i)) {
        return !1;
      }
      return (noteRefused(), !0);
    }),
      (f[10] = u),
      (f[11] = noteRefused),
      (f[12] = refusedWithin),
      (f[13] = i),
      (f[14] = x));
  else x = f[14];
  let C = x,
    B;
  if (f[15] !== V || f[16] !== C)
    ((B = { refuse: V, refuseCharacter: C }), (f[15] = V), (f[16] = C), (f[17] = B));
  else B = f[17];
  return B;
}
/**
 * 通用单选列表组件（标题、标签、禁用、默认值、输入拒绝）。
 */
//@ chunk-ey2qag4x.js:4554-9171 placement
function Select(t) {
  let D = w(73),
    {
      options: options,
      onChange: onChange,
      onFocus: onFocus,
      onCancel: onCancel,
      isDisabled: isDisabled,
      disableSelection: disableSelection,
      defaultValue: defaultValue,
      refuseInput: refuseInput,
      headings: headings,
      drawLabels: drawLabels,
      hidePromptWhileDisabled: hidePromptWhileDisabled,
    } = t,
    x = isDisabled === void 0 ? !1 : isDisabled,
    C = disableSelection === void 0 ? !1 : disableSelection,
    B = drawLabels === void 0 ? !1 : drawLabels,
    N = hidePromptWhileDisabled === void 0 ? !1 : hidePromptWhileDisabled,
    [h, K, m] = Jt(),
    [W, T] = y(null),
    L;
  if (D[0] === MEMO_CACHE_SENTINEL) ((L = isArrowNavEnabled()), (D[0] = L));
  else L = D[0];
  let M = L,
    [E, H, v] = useStateWithRef(null),
    ue;
  if (D[1] !== options) ((ue = options.map(Fu).join("\x00")), (D[1] = options), (D[2] = ue));
  else ue = D[2];
  let ve = ue,
    [Y, J] = y(ve);
  if (Y !== ve) (J(ve), v(ku), m(Ru));
  let [ye, fe, ee] = useStateWithRef(null);
  if (Y !== ve && ye !== null) (ee(Mu), m(Eu));
  let O = ye !== null && options[ye - 1]?.type === "input" ? options[ye - 1] : null,
    xe = R(null);
  (useFocusOnMount(xe, !x), useRegisterOverlay("select", !!onCancel && !x));
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
  )
    ((U = (me) => {
      if (C) {
        return;
      }
      if (O) {
        if (me === "" && !O.screenReaderEmptySubmit) {
          T("Enter some text, or Escape for the list.");
          return;
        }
        if (onChange?.(O.value) === !1) {
          return;
        }
        (m(Pu), ee(Au));
        return;
      }
      let int = Number.parseInt(me, 10);
      if (!Number.isFinite(int) || int < 1 || int > options.length) {
        (T(
          options.length === 0
            ? `Invalid selection "${me}". Nothing to select.`
            : `Invalid selection "${me}". Enter a number between 1 and ${options.length}.`,
        ),
          m(Wu));
        return;
      }
      let le = options[int - 1];
      if (le.disabled) {
        (T(`Option ${int} is disabled.`), m(Bu));
        return;
      }
      if (le.type === "input") {
        (ee(() => int), v(Nu));
        let Te = le.initialValue ?? "";
        (m(() => Te), le.onChange(Te), onFocus?.(le.value));
        return;
      }
      if (onChange?.(le.value) === !1) {
        return;
      }
      (m(Lu), v(Uu));
    }),
      (D[3] = C),
      (D[4] = O),
      (D[5] = onChange),
      (D[6] = onFocus),
      (D[7] = options),
      (D[8] = m),
      (D[9] = v),
      (D[10] = ee),
      (D[11] = U));
  else U = D[11];
  let Ve = U,
    ne;
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
  )
    ((ne = (A) => {
      if (x) {
        return;
      }
      if (A.key === "escape" && A.name === "escape") {
        if ((A.preventDefault(), O)) {
          if (O.onChange(O.initialValue ?? "") === !1) {
            return;
          }
          (ee(Ku), m(Hu));
          let we = options.find(ju) ?? options[0];
          if (we) onFocus?.(we.value);
          return;
        }
        onCancel?.();
        return;
      }
      if (C) {
        return;
      }
      if (A.key === "return" && A.name === "return") {
        if ((A.preventDefault(), refuseInput?.())) {
          return;
        }
        if (O || K.current.length > 0) {
          Ve(K.current);
          return;
        }
        if (M && H.current !== null) Ve(String(H.current + 1));
        return;
      }
      if (A.key === "backspace" || A.key === "delete") {
        A.preventDefault();
        let sliced = K.current.slice(0, -1);
        if (O && O.onChange(sliced) === !1) {
          return;
        }
        m(() => sliced);
        return;
      }
      if (M && !O && fe.current === null && (A.name === "up" || A.name === "down")) {
        if ((A.preventDefault(), refuseInput?.())) {
          return;
        }
        (T(null), m(zu));
        let ze = options.length;
        if (ze === 0) {
          return;
        }
        let Ce = H.current;
        let mt =
          Ce === null ? (A.name === "down" ? 0 : ze - 1) : (Ce + (A.name === "down" ? 1 : -1) + ze) % ze;
        v(() => mt);
        let Be = options[mt];
        if (Be) onFocus?.(Be.value);
        return;
      }
      if (O) {
        if (A.key.length === 1 && !A.ctrl && !A.meta) {
          A.preventDefault();
          let Bt = K.current + A.key;
          if (O.onChange(Bt) === !1) {
            return;
          }
          m(() => Bt);
        }
        return;
      }
      let Vt = normalizeFullWidthDigits_2(A.key);
      if (/^[0-9]$/.test(Vt)) {
        if ((A.preventDefault(), refuseInput?.())) {
          return;
        }
        (T(null), m((Nt) => Nt + Vt), v(_u));
      }
    }),
      (D[12] = K),
      (D[13] = C),
      (D[14] = H),
      (D[15] = O),
      (D[16] = fe),
      (D[17] = x),
      (D[18] = onCancel),
      (D[19] = onFocus),
      (D[20] = options),
      (D[21] = refuseInput),
      (D[22] = m),
      (D[23] = v),
      (D[24] = ee),
      (D[25] = Ve),
      (D[26] = ne));
  else ne = D[26];
  let Fe = ne,
    yt;
  if (D[27] !== h || D[28] !== O || D[29] !== ye || D[30] !== onCancel || D[31] !== options.length)
    ((yt = O
      ? `Enter text for option ${ye} (${reactNodeText(O.label)}), or Escape for the list: ${h}`
      : options.length === 0
        ? `Nothing to select${onCancel ? ". Escape to cancel" : ""}: ${h}`
        : `Select with numbers [1-${options.length}]${M ? " or up / down arrow keys" : ""}. Then ${formatOrList(["Enter to submit", ...(onCancel ? ["Escape to cancel"] : [])])}: ${h}`),
      (D[27] = h),
      (D[28] = O),
      (D[29] = ye),
      (D[30] = onCancel),
      (D[31] = options.length),
      (D[32] = yt));
  else yt = D[32];
  let _e = yt,
    ke;
  if (D[33] !== _e) ((ke = bunStringWidth(_e)), (D[33] = _e), (D[34] = ke));
  else ke = D[34];
  const dt = !x && !C && E === null;
  let Qe;
  if (D[35] !== ke || D[36] !== dt)
    ((Qe = { line: 0, column: ke, active: dt, visible: !0 }), (D[35] = ke), (D[36] = dt), (D[37] = Qe));
  else Qe = D[37];
  let ct = useDeclaredCursor(Qe),
    ht;
  if (D[38] !== Fe || D[39] !== x)
    ((ht = x ? {} : { tabIndex: 0, onKeyDown: Fe }), (D[38] = Fe), (D[39] = x), (D[40] = ht));
  else ht = D[40];
  let De;
  if (
    D[41] !== defaultValue ||
    D[42] !== C ||
    D[43] !== B ||
    D[44] !== E ||
    D[45] !== headings ||
    D[46] !== x ||
    D[47] !== options
  ) {
    let Ne;
    if (
      D[49] !== defaultValue ||
      D[50] !== C ||
      D[51] !== B ||
      D[52] !== E ||
      D[53] !== headings ||
      D[54] !== x
    )
      ((Ne = (p, Ft) =>
        r(
          Kc,
          {
            children: [
              headings?.get(Ft),
              e(SelectOptionLabel, {
                index: Ft + 1,
                option: p,
                selected: defaultValue !== void 0 && p.value === defaultValue,
                focused: E === Ft && !x && !C,
                drawLabel: B,
              }),
            ],
          },
          String(p.value),
        )),
        (D[49] = defaultValue),
        (D[50] = C),
        (D[51] = B),
        (D[52] = E),
        (D[53] = headings),
        (D[54] = x),
        (D[55] = Ne));
    else Ne = D[55];
    De = options.map(Ne);
    ((D[41] = defaultValue),
      (D[42] = C),
      (D[43] = B),
      (D[44] = E),
      (D[45] = headings),
      (D[46] = x),
      (D[47] = options),
      (D[48] = De));
  } else De = D[48];
  let Ne;
  if (D[56] !== headings || D[57] !== options.length)
    ((Ne = headings?.get(options.length)), (D[56] = headings), (D[57] = options.length), (D[58] = Ne));
  else Ne = D[58];
  let St;
  if (D[59] !== W) ((St = W && e(Text, { children: W })), (D[59] = W), (D[60] = St));
  else St = D[60];
  let Le;
  if (D[61] !== ct || D[62] !== C || D[63] !== N || D[64] !== x || D[65] !== _e)
    ((Le = !C && !(x && N) && e(Box, { ref: ct, children: e(Text, { children: _e }) })),
      (D[61] = ct),
      (D[62] = C),
      (D[63] = N),
      (D[64] = x),
      (D[65] = _e),
      (D[66] = Le));
  else Le = D[66];
  let wt;
  if (D[67] !== ht || D[68] !== De || D[69] !== Ne || D[70] !== St || D[71] !== Le)
    ((wt = r(Box, { ref: xe, flexDirection: "column", ...ht, children: [De, Ne, St, Le] })),
      (D[67] = ht),
      (D[68] = De),
      (D[69] = Ne),
      (D[70] = St),
      (D[71] = Le),
      (D[72] = wt));
  else wt = D[72];
  return wt;
}
/**
 * 多选列表组件（提交按钮、默认值、输入拒绝）。
 */
//@ chunk-ey2qag4x.js:9171-15553 placement
function MultiSelect(t) {
  let b = w(91),
    {
      options: options,
      defaultValue: defaultValue,
      onChange: onChange,
      onSubmit: onSubmit,
      onFocus: onFocus,
      onCancel: onCancel,
      isDisabled: isDisabled,
      submitButtonText: submitButtonText,
      refuseInput: refuseInput,
    } = t,
    V;
  if (b[0] !== defaultValue)
    ((V = defaultValue === void 0 ? [] : defaultValue), (b[0] = defaultValue), (b[1] = V));
  else V = b[1];
  let x = V,
    C = isDisabled === void 0 ? !1 : isDisabled,
    [B, N, h] = Jt(),
    [K, m] = y(null),
    W;
  if (b[2] === MEMO_CACHE_SENTINEL) ((W = isArrowNavEnabled()), (b[2] = W));
  else W = b[2];
  let T = W,
    [D, L, M] = useStateWithRef(null),
    [E, H, v] = useStateWithRef(null),
    ue;
  if (b[3] !== options) ((ue = options.map(Gu).join("\x00")), (b[3] = options), (b[4] = ue));
  else ue = b[4];
  let ve = ue,
    [Y, J] = y(ve);
  if (Y !== ve) (J(ve), M(qu), v(Yu), h(Ju));
  let ye;
  if (b[5] !== x || b[6] !== options)
    ((ye = () => new Set(options.flatMap((fe, ee) => (!fe.disabled && x.includes(fe.value) ? [ee] : [])))),
      (b[5] = x),
      (b[6] = options),
      (b[7] = ye));
  else ye = b[7];
  let O = ye,
    [xe, U] = y(null),
    me = R(!1),
    X = R(!1),
    le;
  if (b[8] !== onSubmit || b[9] !== xe)
    ((le = () => {
      if (xe !== null) {
        let Te = [...xe];
        (U(null), (me.current = !1), onSubmit?.(Te));
      }
    }),
      (b[8] = onSubmit),
      (b[9] = xe),
      (b[10] = le));
  else le = b[10];
  let Ve;
  if (b[11] !== xe) ((Ve = [xe]), (b[11] = xe), (b[12] = Ve));
  else Ve = b[12];
  P(le, Ve);
  let [ne, A, we] = useStateWithRef(null);
  if (Y !== ve && ne !== null) (we(Xu), h(Qu));
  let te = ne && options[ne.index - 1]?.type === "input" ? options[ne.index - 1] : null,
    ze = R(null);
  (useFocusOnMount(ze, !C), useRegisterOverlay("multi-select", !!onCancel && !C));
  let Ce;
  if (b[13] !== onChange || b[14] !== h || b[15] !== M || b[16] !== we || b[17] !== v)
    ((Ce = (mt) => {
      if (((me.current = !0), onChange?.([...mt]) === !1)) {
        me.current = !1;
        return;
      }
      (U(mt), h(Zu), we(ed), M(td), v(nd));
    }),
      (b[13] = onChange),
      (b[14] = h),
      (b[15] = M),
      (b[16] = we),
      (b[17] = v),
      (b[18] = Ce));
  else Ce = b[18];
  let Be = Ce,
    Bt;
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
  )
    ((Bt = (Vt) => {
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
          (m(
            `Invalid selection "${dt}". Enter numbers between 1 and ${options.length}, comma- or space-separated.`,
          ),
            h(od));
          return;
        }
        let int = Number.parseInt(dt, 10);
        if (yt.has(int)) {
          continue;
        }
        if ((yt.add(int), int < 1 || int > options.length)) {
          (m(
            `Invalid selection "${dt}". Enter numbers between 1 and ${options.length}, comma- or space-separated.`,
          ),
            h(id));
          return;
        }
        let ct = options[int - 1];
        if (ct.disabled) {
          (m(`Option ${int} is disabled.`), h(sd));
          return;
        }
        if (ct.type === "input") {
          if (ke) {
            (m("Only one free-text option can be included per selection."), h(rd));
            return;
          }
          ke = { index: int, opt: ct };
          continue;
        }
        _e.push(ct.value);
      }
      if (ke?.opt) {
        (we(() => ({ index: ke.index, stashed: _e, raw: trimmed })), M(ld), v(ad));
        let ht = ke.opt.initialValue ?? "";
        (h(() => ht), ke.opt.onChange(ht), onFocus?.(ke.opt.value));
        return;
      }
      Be(_e);
    }),
      (b[19] = x),
      (b[20] = Be),
      (b[21] = te),
      (b[22] = ne),
      (b[23] = onFocus),
      (b[24] = options),
      (b[25] = h),
      (b[26] = M),
      (b[27] = we),
      (b[28] = v),
      (b[29] = Bt));
  else Bt = b[29];
  let De = Bt,
    Ne;
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
  )
    ((Ne = (p) => {
      if (C) {
        return;
      }
      if (p.key === "escape" && p.name === "escape") {
        if ((p.preventDefault(), ne)) {
          let { raw: raw } = ne;
          (we(ud), h(() => raw));
          let St = options.find(dd) ?? options[0];
          if (St) onFocus?.(St.value);
          return;
        }
        onCancel?.();
        return;
      }
      if (p.key === "return" && p.name === "return") {
        if ((p.preventDefault(), X.current)) {
          (refuseInput?.(),
            (X.current = !1),
            h(cd),
            m("Part of that entry arrived before the list was ready \u2014 enter your selection again."));
          return;
        }
        if (refuseInput?.()) {
          return;
        }
        if (me.current) {
          return;
        }
        if (T && !te && N.current.length === 0 && H.current !== null) {
          let sorted = [...H.current].sort(pd);
          if (sorted.length === 0) Be([]);
          else De(sorted.map(fd).join(" "));
          return;
        }
        De(N.current);
        return;
      }
      if (p.key === "backspace" || p.key === "delete") {
        p.preventDefault();
        let wt = N.current;
        let sliced = wt.slice(0, -1);
        if (te && te.onChange(sliced) === !1) {
          return;
        }
        if ((h(() => sliced), !te && wt !== sliced)) v(md);
        return;
      }
      if (T && !te && A.current === null && (p.name === "up" || p.name === "down")) {
        if ((p.preventDefault(), refuseInput?.())) {
          return;
        }
        (m(null), h(hd), (X.current = !1));
        let bt = options.length;
        if (bt === 0) {
          return;
        }
        let on = L.current;
        let Ge =
          on === null ? (p.name === "down" ? 0 : bt - 1) : (on + (p.name === "down" ? 1 : -1) + bt) % bt;
        M(() => Ge);
        let Lt = options[Ge];
        if (Lt) onFocus?.(Lt.value);
        return;
      }
      if (T && !te && A.current === null && L.current !== null && replaceIdeographicSpace(p.key) === " ") {
        if ((p.preventDefault(), refuseInput?.())) {
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
        (m(null),
          v((_n) => {
            let Rt = new Set(_n ?? O());
            if (Rt.has(Ze)) Rt.delete(Ze);
            else Rt.add(Ze);
            return Rt;
          }));
        return;
      }
      if (te) {
        if (p.key.length === 1 && !p.ctrl && !p.meta) {
          p.preventDefault();
          let Gn = N.current + p.key;
          if (te.onChange(Gn) === !1) {
            return;
          }
          h(() => Gn);
        }
        return;
      }
      let replaced = replaceIdeographicSpace(normalizeFullWidthDigits_2(p.key))
        .replace("\uFF0C", ",")
        .replace("\u3001", ",");
      if (/^[0-9, ]$/.test(replaced)) {
        if ((p.preventDefault(), X.current)) {
          refuseInput?.();
          return;
        }
        if (refuseInput?.()) {
          X.current = !0;
          return;
        }
        (m(null), h((Xo) => Xo + replaced), M(bd), v(gd));
      }
    }),
      (b[30] = N),
      (b[31] = O),
      (b[32] = Be),
      (b[33] = L),
      (b[34] = te),
      (b[35] = ne),
      (b[36] = A),
      (b[37] = C),
      (b[38] = onCancel),
      (b[39] = onFocus),
      (b[40] = options),
      (b[41] = refuseInput),
      (b[42] = h),
      (b[43] = M),
      (b[44] = we),
      (b[45] = v),
      (b[46] = De),
      (b[47] = H),
      (b[48] = Ne));
  else Ne = b[48];
  let rn = Ne,
    et;
  if (
    b[49] !== B ||
    b[50] !== x ||
    b[51] !== te ||
    b[52] !== ne?.index ||
    b[53] !== onCancel ||
    b[54] !== options.length ||
    b[55] !== submitButtonText ||
    b[56] !== E
  )
    ((et = te
      ? `Enter text for option ${ne?.index} (${reactNodeText(te.label)}), or Escape for the list: ${B}`
      : `Select with numbers [1-${options.length}] (comma- or space-separated for several)${T ? " or up / down arrow keys" : ""}. Then ${formatOrList([...(T ? ["Space to toggle"] : []), `Enter to ${submitButtonText ?? "submit"}`, ...(x.length > 0 && E === null ? ["bare Enter for defaults"] : []), ...(onCancel ? ["Escape to cancel"] : [])])}: ${B}`),
      (b[49] = B),
      (b[50] = x),
      (b[51] = te),
      (b[52] = ne?.index),
      (b[53] = onCancel),
      (b[54] = options.length),
      (b[55] = submitButtonText),
      (b[56] = E),
      (b[57] = et));
  else et = b[57];
  let Ct = et,
    vt;
  if (b[58] !== Ct) ((vt = bunStringWidth(Ct)), (b[58] = Ct), (b[59] = vt));
  else vt = b[59];
  const ln = !C && D === null;
  let ft;
  if (b[60] !== vt || b[61] !== ln)
    ((ft = { line: 0, column: vt, active: ln, visible: !0 }), (b[60] = vt), (b[61] = ln), (b[62] = ft));
  else ft = b[62];
  let Ue = useDeclaredCursor(ft),
    an;
  if (b[63] !== x) ((an = new Set(x)), (b[63] = x), (b[64] = an));
  else an = b[64];
  let z = an,
    dn;
  if (b[65] !== rn || b[66] !== C)
    ((dn = C ? {} : { tabIndex: 0, onKeyDown: rn }), (b[65] = rn), (b[66] = C), (b[67] = dn));
  else dn = b[67];
  let cn;
  if (b[68] !== z || b[69] !== D || b[70] !== C || b[71] !== options || b[72] !== E) {
    let tt;
    if (b[74] !== z || b[75] !== D || b[76] !== C || b[77] !== E)
      ((tt = (pn, On) =>
        e(
          SelectOptionLabel,
          { index: On + 1, option: pn, selected: E ? E.has(On) : z.has(pn.value), focused: D === On && !C },
          String(pn.value),
        )),
        (b[74] = z),
        (b[75] = D),
        (b[76] = C),
        (b[77] = E),
        (b[78] = tt));
    else tt = b[78];
    cn = options.map(tt);
    ((b[68] = z), (b[69] = D), (b[70] = C), (b[71] = options), (b[72] = E), (b[73] = cn));
  } else cn = b[73];
  let tt;
  if (b[79] !== K) ((tt = K && e(Text, { children: K })), (b[79] = K), (b[80] = tt));
  else tt = b[80];
  let Yn;
  if (b[81] !== Ct) ((Yn = e(Text, { children: Ct })), (b[81] = Ct), (b[82] = Yn));
  else Yn = b[82];
  let fn;
  if (b[83] !== Ue || b[84] !== Yn)
    ((fn = e(Box, { ref: Ue, children: Yn })), (b[83] = Ue), (b[84] = Yn), (b[85] = fn));
  else fn = b[85];
  let Jn;
  if (b[86] !== dn || b[87] !== cn || b[88] !== tt || b[89] !== fn)
    ((Jn = r(Box, { ref: ze, flexDirection: "column", ...dn, children: [cn, tt, fn] })),
      (b[86] = dn),
      (b[87] = cn),
      (b[88] = tt),
      (b[89] = fn),
      (b[90] = Jn));
  else Jn = b[90];
  return Jn;
}
/**
 * 选项标签渲染（选中/焦点标记）。
 */
//@ chunk-ey2qag4x.js:15553-16760 placement
function SelectOptionLabel(t) {
  let u = w(26),
    { index: index, option: option, selected: selected, focused: focused, drawLabel: drawLabel } = t,
    d = drawLabel === void 0 ? !1 : drawLabel,
    g;
  if (u[0] !== focused)
    ((g = { line: 0, column: 0, active: focused, visible: !0 }), (u[0] = focused), (u[1] = g));
  else g = u[1];
  let c = useDeclaredCursor(g),
    b;
  if (u[2] !== option.label) ((b = reactNodeText(option.label)), (u[2] = option.label), (u[3] = b));
  else b = u[3];
  let V = b,
    x = option.description ? ` \u2014 ${option.description}` : "";
  const C = `${V}${x}`;
  let B;
  if (u[4] !== C) ((B = truncateOptionLabel(C)), (u[4] = C), (u[5] = B));
  else B = u[5];
  let N = B;
  const h = option.disabled ? "(disabled)" : null,
    K = selected ? "(selected)" : null;
  let m;
  if (u[6] !== h || u[7] !== K) ((m = [h, K].filter(Boolean)), (u[6] = h), (u[7] = K), (u[8] = m));
  else m = u[8];
  let joined = m.join(" ");
  if (d) {
    const T = joined ? ` ${joined}` : "";
    let D;
    if (u[9] !== index || u[10] !== T)
      ((D = r(Text, { children: [index, ".", T] })), (u[9] = index), (u[10] = T), (u[11] = D));
    else D = u[11];
    let L;
    if (u[12] !== option.description)
      ((L = option.description && r(Text, { children: ["\u2014 ", option.description] })),
        (u[12] = option.description),
        (u[13] = L));
    else L = u[13];
    let M;
    if (u[14] !== c || u[15] !== option.label || u[16] !== D || u[17] !== L)
      ((M = r(Box, { ref: c, children: [D, option.label, L] })),
        (u[14] = c),
        (u[15] = option.label),
        (u[16] = D),
        (u[17] = L),
        (u[18] = M));
    else M = u[18];
    return M;
  }
  const T = joined ? `${joined} ` : "";
  let D;
  if (u[19] !== N || u[20] !== index || u[21] !== T)
    ((D = r(Text, { children: [index, ". ", T, N] })),
      (u[19] = N),
      (u[20] = index),
      (u[21] = T),
      (u[22] = D));
  else D = u[22];
  let L;
  if (u[23] !== c || u[24] !== D)
    ((L = e(Box, { ref: c, children: D })), (u[23] = c), (u[24] = D), (u[25] = L));
  else L = u[25];
  return L;
}
/**
 * 确认/取消按钮对，带打开后输入拒绝窗口。
 */
//@ chunk-ey2qag4x.js:16760-18909 placement
function ConfirmButtons(t) {
  let h = w(43),
    {
      confirmLabel: confirmLabel,
      cancelLabel: cancelLabel,
      onConfirm: onConfirm,
      onCancel: onCancel,
      refuseInput: refuseInput,
      openedAt: openedAt,
      windowMs: windowMs,
    } = t,
    [g, c, b] = Jt(),
    [V, x] = y(null),
    C = R(null);
  (useFocusOnMount(C, !0), useRegisterOverlay("select", !0));
  let { refuse: refuse, refuseCharacter: refuseCharacter } = useRefuseInput(openedAt, windowMs),
    K;
  if (h[0] !== refuseInput || h[1] !== refuse)
    ((K = function m() {
      return (refuseInput?.() ?? !1) || refuse();
    }),
      (h[0] = refuseInput),
      (h[1] = refuse),
      (h[2] = K));
  else K = h[2];
  let m = K,
    W;
  if (h[3] !== refuseInput || h[4] !== refuseCharacter)
    ((W = function T() {
      return (refuseInput?.() ?? !1) || refuseCharacter();
    }),
      (h[3] = refuseInput),
      (h[4] = refuseCharacter),
      (h[5] = W));
  else W = h[5];
  let T = W,
    D;
  if (h[6] !== onCancel || h[7] !== onConfirm || h[8] !== m || h[9] !== b)
    ((D = (L) => {
      let lower = L.trim().toLowerCase();
      if ((lower === "y" || lower === "yes" || lower === "n" || lower === "no") && m()) {
        b(vd);
        return;
      }
      if (lower === "y" || lower === "yes") {
        return onConfirm();
      }
      if (lower === "n" || lower === "no") {
        return onCancel();
      }
      (x("Please answer y or n."), b(xd));
    }),
      (h[6] = onCancel),
      (h[7] = onConfirm),
      (h[8] = m),
      (h[9] = b),
      (h[10] = D));
  else D = h[10];
  let E = D,
    H;
  if (h[11] !== c || h[12] !== onCancel || h[13] !== m || h[14] !== T || h[15] !== b || h[16] !== E)
    ((H = (v) => {
      if (v.key === "escape" && v.name === "escape") {
        if ((v.preventDefault(), m())) {
          return;
        }
        return onCancel();
      }
      if (v.key === "return" && v.name === "return") {
        return (v.preventDefault(), E(c.current));
      }
      if (v.key === "backspace" || v.key === "delete") {
        (v.preventDefault(), b(Id));
        return;
      }
      if (v.key.length === 1 && !v.ctrl && !v.meta) {
        if ((v.preventDefault(), T())) {
          return;
        }
        (x(null), b((ue) => ue + v.key));
      }
    }),
      (h[11] = c),
      (h[12] = onCancel),
      (h[13] = m),
      (h[14] = T),
      (h[15] = b),
      (h[16] = E),
      (h[17] = H));
  else H = h[17];
  let ve = H,
    Y = `Enter y/n: ${g}`,
    J;
  if (h[18] !== Y) ((J = bunStringWidth(Y)), (h[18] = Y), (h[19] = J));
  else J = h[19];
  let ye;
  if (h[20] !== J) ((ye = { line: 0, column: J, active: !0, visible: !0 }), (h[20] = J), (h[21] = ye));
  else ye = h[21];
  let fe = useDeclaredCursor(ye),
    ee;
  if (h[22] !== confirmLabel) ((ee = reactNodeText(confirmLabel)), (h[22] = confirmLabel), (h[23] = ee));
  else ee = h[23];
  let O;
  if (h[24] !== ee) ((O = r(Text, { children: ["y. ", ee] })), (h[24] = ee), (h[25] = O));
  else O = h[25];
  let xe;
  if (h[26] !== cancelLabel) ((xe = reactNodeText(cancelLabel)), (h[26] = cancelLabel), (h[27] = xe));
  else xe = h[27];
  let U;
  if (h[28] !== xe) ((U = r(Text, { children: ["n. ", xe] })), (h[28] = xe), (h[29] = U));
  else U = h[29];
  let me;
  if (h[30] !== V) ((me = V && e(Text, { children: V })), (h[30] = V), (h[31] = me));
  else me = h[31];
  let X;
  if (h[32] !== Y) ((X = e(Text, { children: Y })), (h[32] = Y), (h[33] = X));
  else X = h[33];
  let le;
  if (h[34] !== fe || h[35] !== X)
    ((le = e(Box, { ref: fe, children: X })), (h[34] = fe), (h[35] = X), (h[36] = le));
  else le = h[36];
  let Te;
  if (h[37] !== ve || h[38] !== U || h[39] !== me || h[40] !== le || h[41] !== O)
    ((Te = r(Box, { ref: C, flexDirection: "column", tabIndex: 0, onKeyDown: ve, children: [O, U, me, le] })),
      (h[37] = ve),
      (h[38] = U),
      (h[39] = me),
      (h[40] = le),
      (h[41] = O),
      (h[42] = Te));
  else Te = h[42];
  return Te;
}
//@ chunk-ey2qag4x.js:18909-18913 placement
j();
//@ chunk-ey2qag4x.js:18913-18917 placement
j();
//@ chunk-ey2qag4x.js:18917-18954 placement
function Kd(x) {
  return dh(x) ? x.key : "";
}
/**
 * 用户消息背景色主题键。
 */
//@ chunk-ey2qag4x.js:18954-18985 placement
var USER_MESSAGE_BACKGROUND = "userMessageBackground";
//@ chunk-ey2qag4x.js:18985-19040 placement
function WDe(t = "tint") {
  return sequential.level === 0 ? "inverse" : t;
}
//@ chunk-ey2qag4x.js:19040-19054 placement
var wo = qt("");
/**
 * 按窗口起点切片渲染子元素文本。
 */
//@ chunk-ey2qag4x.js:19054-19582 placement
function WindowedText(t) {
  let o = w(14),
    i,
    a;
  if (o[0] !== t) (({ windowStart: a, ...i } = t), (o[0] = t), (o[1] = i), (o[2] = a));
  else ((i = o[1]), (a = o[2]));
  let l = a === void 0 ? 0 : a,
    f,
    d,
    u;
  if (o[3] !== i.children || o[4] !== l) {
    let mapped = Fy.toArray(i.children).map(Kd);
    f = wo.Provider;
    d = l;
    u = mapped.join();
    ((o[3] = i.children), (o[4] = l), (o[5] = f), (o[6] = d), (o[7] = u));
  } else ((f = o[5]), (d = o[6]), (u = o[7]));
  const c = `${d} ${u}`;
  let b;
  if (o[8] !== i) ((b = e(Box, { flexDirection: "column", ...i })), (o[8] = i), (o[9] = b));
  else b = o[9];
  let V;
  if (o[10] !== f || o[11] !== c || o[12] !== b)
    ((V = e(f, { value: c, children: b })), (o[10] = f), (o[11] = c), (o[12] = b), (o[13] = V));
  else V = o[13];
  return V;
}
/**
 * 行悬停高亮：返回 [是否高亮, 设置悬停]，同一上下文里只有一行处于悬停态。
 */
//@ chunk-ey2qag4x.js:19582-19808 placement
function useHoverHighlight(t) {
  let $ = w(5),
    o = Se(wo),
    [i, a] = y(null),
    l = t && i === o;
  if (i !== null && !l) a(null);
  let d;
  if ($[0] !== o) ((d = (u) => a(u ? o : null)), ($[0] = o), ($[1] = d));
  else d = $[1];
  let g;
  if ($[2] !== l || $[3] !== d) ((g = [l, d]), ($[2] = l), ($[3] = d), ($[4] = g));
  else g = $[4];
  return g;
}

export {
  useInputRefusalWindow,
  useRefusalTracker,
  useMountTime,
  settleKey,
  USER_MESSAGE_BACKGROUND,
  jnn,
  Select,
  WDe,
  WindowedText,
  useHoverHighlight,
  MultiSelect,
  ConfirmButtons,
};

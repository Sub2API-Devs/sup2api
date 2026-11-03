/**
 * components/GlobalSearchDialog.tsx
 *
 * 全局搜索/主题保存对话框（GlobalSearchDialog），并含按 slug 去重的命名辅助。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/GlobalSearchDialog.tsx
 * pieces: chunk-3s4dbk22.js (9), chunk-axmbhcjg.js (1)
 * attribution: sole-consumer 8, callgraph-fingerprint 1, fingerprint 1
 */
import { sep } from "path";
import { j, y, P } from "../../vendor/react/cjs/react.production.js";
import { cps } from "../utils/permissions/autoModeRulesPrompt.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { e, r } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { Me, useCustomThemes } from "./design-system/ThemeProvider.js";
import { nd } from "../utils/stableEmptyObject.js";
import { getTheme, isValidThemeColor } from "../utils/theme.js";
import { saveCustomTheme, customThemeRef, getThemesDir, slugify } from "../utils/customThemes.js";
import { logForDebugging } from "../utils/debug.js";
import { Uo } from "../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { useKeybinding } from "../keybindings/useKeybinding.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { TextInput } from "./TextInput.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { Byline } from "./design-system/Byline.js";
import { Pane } from "./design-system/Pane.js";
import { plural } from "../utils/stringUtils.js";
import { ParenHint } from "./diff/DiffDetailView.js";
import { FuzzyPicker } from "./design-system/FuzzyPicker.js";
import { Fn } from "../utils/posixPaths.js";
import { AAe } from "../services/homeSeed/portableSettings.js";

//@ chunk-3s4dbk22.js:15006-15010 sole-consumer
j();
//@ chunk-3s4dbk22.js:15010-15014 sole-consumer
j();
//@ chunk-3s4dbk22.js:15042-15065 sole-consumer
function wo() {
  return !1;
}
//@ chunk-3s4dbk22.js:15065-15091 sole-consumer
function Do(Jo) {
  return Jo;
}
//@ chunk-3s4dbk22.js:15091-15138 sole-consumer
function bo(Vo) {
  return `No color named "${Vo}"`;
}
//@ chunk-3s4dbk22.js:15138-15153 sole-consumer
var tn = cps + cps;
//@ chunk-3s4dbk22.js:15153-15270 sole-consumer
function ColorSwatch(ce) {
  let J = w(2),
    { value: m } = ce,
    a;
  if (J[0] !== m) ((a = e(Text, { color: m, children: tn })), (J[0] = m), (J[1] = a));
  else a = J[1];
  return a;
}
//@ chunk-3s4dbk22.js:15270-23369 callgraph-fingerprint = GlobalSearchDialog (0.218)
function GlobalSearchDialog(t0) {
  let $ = w(165),
    { initial: initial, defaultBase: defaultBase, onDone: onDone, onPick: onPick, onCancel: onCancel } = t0,
    { storageV5: storageV5 } = Me(),
    {
      customThemes: customThemes,
      reloadCustomThemes: reloadCustomThemes,
      setPreviewOverrides: setPreviewOverrides,
    } = useCustomThemes(),
    Pe = initial !== void 0 && initial.source !== "user",
    [at, je] = y(initial && !Pe ? "colors" : "name"),
    [c, mt] = y(initial?.name ?? ""),
    [Qe, z] = y(c.length),
    [p, Je] = y(Pe ? "" : (initial?.slug ?? "")),
    ct;
  if ($[0] !== defaultBase || $[1] !== initial?.base)
    ((ct = () => initial?.base ?? defaultBase), ($[0] = defaultBase), ($[1] = initial?.base), ($[2] = ct));
  else ct = $[2];
  let [l] = y(ct),
    [g] = y(wo),
    ue;
  if ($[3] !== g) ((ue = nd(g)), ($[3] = g), ($[4] = ue));
  else ue = $[4];
  let h = ue,
    ut;
  if ($[5] !== l) ((ut = getTheme(l)), ($[5] = l), ($[6] = ut));
  else ut = $[6];
  let k = ut,
    ft;
  if ($[7] !== initial?.overrides)
    ((ft = initial?.overrides ?? {}), ($[7] = initial?.overrides), ($[8] = ft));
  else ft = $[8];
  let [i, Qn] = y(ft),
    Ve;
  if ($[9] !== k) ((Ve = Object.keys(k).sort()), ($[9] = k), ($[10] = Ve));
  else Ve = $[10];
  let fe = Ve,
    [Z, Jn] = y(""),
    [u, Xe] = y(null),
    [T, vt] = y(""),
    [se, gt] = y(0),
    D;
  if ($[11] !== fe || $[12] !== Z) {
    let lower = Z.toLowerCase();
    D = lower ? fe.filter((Xt) => Xt.toLowerCase().includes(lower)) : fe;
    (($[11] = fe), ($[12] = Z), ($[13] = D));
  } else D = $[13];
  let ze = D,
    zt;
  if ($[14] !== customThemes || $[15] !== c || $[16] !== p)
    ((zt = p || uniqueSlug(c, customThemes)), ($[14] = customThemes), ($[15] = c), ($[16] = p), ($[17] = zt));
  else zt = $[17];
  let V = zt,
    N;
  if ($[18] !== i) ((N = Object.keys(i)), ($[18] = i), ($[19] = N));
  else N = $[19];
  let ve = N.length,
    Se,
    Kt;
  if ($[20] !== setPreviewOverrides)
    ((Kt = () => () => setPreviewOverrides(null)),
      (Se = [setPreviewOverrides]),
      ($[20] = setPreviewOverrides),
      ($[21] = Se),
      ($[22] = Kt));
  else ((Se = $[21]), (Kt = $[22]));
  P(Kt, Se);
  let b;
  if ($[23] !== i || $[24] !== k)
    ((b = function f(ht) {
      return i[ht] ?? k[ht];
    }),
      ($[23] = i),
      ($[24] = k),
      ($[25] = b));
  else b = $[25];
  let f = b,
    Ke;
  if ($[26] !== l || $[27] !== c || $[28] !== setPreviewOverrides || $[29] !== storageV5)
    ((Ke = function K(ge, $e) {
      (Qn($e),
        setPreviewOverrides($e),
        saveCustomTheme(
          { slug: ge, name: c.trim(), base: l, overrides: $e, source: "user" },
          storageV5,
        ).catch((Yt) => {
          logForDebugging(`[theme] save ${ge} failed: ${Yt}`, { level: "warn" });
        }));
    }),
      ($[26] = l),
      ($[27] = c),
      ($[28] = setPreviewOverrides),
      ($[29] = storageV5),
      ($[30] = Ke));
  else Ke = $[30];
  let K = Ke,
    kt;
  if ($[31] !== f)
    ((kt = function F(Ye) {
      let Ct = f(Ye);
      (vt(Ct), gt(Ct.length), Xe(Ye));
    }),
      ($[31] = f),
      ($[32] = kt));
  else kt = $[32];
  let F = kt,
    yt;
  if ($[33] !== K || $[34] !== T || $[35] !== u || $[36] !== i || $[37] !== k || $[38] !== p)
    ((yt = function Oe() {
      if (u === null || !isValidThemeColor(T)) {
        return;
      }
      (K(p, T === k[u] ? Uo(i, u) : { ...i, [u]: T }), Xe(null));
    }),
      ($[33] = K),
      ($[34] = T),
      ($[35] = u),
      ($[36] = i),
      ($[37] = k),
      ($[38] = p),
      ($[39] = yt));
  else yt = $[39];
  let Oe = yt,
    H;
  if ($[40] !== i || $[41] !== setPreviewOverrides)
    ((H = function E() {
      (setPreviewOverrides(i), Xe(null));
    }),
      ($[40] = i),
      ($[41] = setPreviewOverrides),
      ($[42] = H));
  else H = $[42];
  let E = H,
    Gt;
  if ($[43] !== K || $[44] !== i || $[45] !== p)
    ((Gt = function ie(m_0) {
      if (!(m_0 in i)) {
        return;
      }
      K(p, Uo(i, m_0));
    }),
      ($[43] = K),
      ($[44] = i),
      ($[45] = p),
      ($[46] = Gt));
  else Gt = $[46];
  let ie = Gt,
    Ae;
  if ($[47] !== u || $[48] !== i || $[49] !== setPreviewOverrides)
    ((Ae = function xe(match) {
      if ((vt(match), u && isValidThemeColor(match))) setPreviewOverrides({ ...i, [u]: match });
    }),
      ($[47] = u),
      ($[48] = i),
      ($[49] = setPreviewOverrides),
      ($[50] = Ae));
  else Ae = $[50];
  let xe = Ae,
    Tt;
  if ($[51] !== E || $[52] !== u || $[53] !== onCancel)
    ((Tt = () => {
      if (u !== null) E();
      else onCancel();
    }),
      ($[51] = E),
      ($[52] = u),
      ($[53] = onCancel),
      ($[54] = Tt));
  else Tt = $[54];
  const It = at === "name" || u !== null;
  let Vn;
  if ($[55] !== It) ((Vn = { context: "Settings", isActive: It }), ($[55] = It), ($[56] = Vn));
  else Vn = $[56];
  if ((useKeybinding("confirm:no", Tt, Vn), at === "name")) {
    let Re, he;
    if ($[57] !== c) ((Re = c.trim()), (he = Re.length > 0), ($[57] = c), ($[58] = Re), ($[59] = he));
    else ((Re = $[58]), (he = $[59]));
    let Wt = Pe && initial ? `Fork ${initial.name} to your themes` : "New custom theme";
    let X;
    if ($[60] !== g || $[61] !== Wt)
      ((X = !g && e(Text, { bold: !0, color: "permission", children: Wt })),
        ($[60] = g),
        ($[61] = Wt),
        ($[62] = X));
    else X = $[62];
    let U;
    if ($[63] === MEMO_CACHE_SENTINEL) ((U = e(Text, { children: "Name: " })), ($[63] = U));
    else U = $[63];
    let L;
    if (
      $[64] !== l ||
      $[65] !== V ||
      $[66] !== onPick ||
      $[67] !== i ||
      $[68] !== reloadCustomThemes ||
      $[69] !== storageV5 ||
      $[70] !== Re ||
      $[71] !== he
    )
      ((L = () => {
        if (!he) {
          return;
        }
        (Je(V),
          mt(Re),
          je("colors"),
          saveCustomTheme({ slug: V, name: Re, base: l, overrides: i, source: "user" }, storageV5)
            .then(() => reloadCustomThemes())
            .then(() => {
              onPick(customThemeRef(V));
            })
            .catch((m_3) => {
              logForDebugging(`[theme] save ${V} failed: ${m_3}`, { level: "warn" });
            }));
      }),
        ($[64] = l),
        ($[65] = V),
        ($[66] = onPick),
        ($[67] = i),
        ($[68] = reloadCustomThemes),
        ($[69] = storageV5),
        ($[70] = Re),
        ($[71] = he),
        ($[72] = L));
    else L = $[72];
    let A;
    if ($[73] !== c || $[74] !== Qe || $[75] !== onCancel || $[76] !== L)
      ((A = r(Box, {
        children: [
          U,
          e(TextInput, {
            value: c,
            onChange: mt,
            onSubmit: L,
            onExit: onCancel,
            placeholder: "my-theme",
            columns: 40,
            cursorOffset: Qe,
            onChangeCursorOffset: z,
            disableCursorMovementForUpDownKeys: !0,
            disableEscapeDoublePress: !0,
            focus: !0,
            showCursor: !0,
          }),
        ],
      })),
        ($[73] = c),
        ($[74] = Qe),
        ($[75] = onCancel),
        ($[76] = L),
        ($[77] = A));
    else A = $[77];
    let Y;
    if ($[78] === MEMO_CACHE_SENTINEL) ((Y = getThemesDir()), ($[78] = Y));
    else Y = $[78];
    let x;
    if ($[79] !== l || $[80] !== V)
      ((x = r(Text, { dimColor: !0, children: ["based on ", l, " \xB7 saved to ", Y, sep, V, ".json"] })),
        ($[79] = l),
        ($[80] = V),
        ($[81] = x));
    else x = $[81];
    let _;
    if ($[82] !== A || $[83] !== x)
      ((_ = r(Box, { flexDirection: "column", children: [A, x] })), ($[82] = A), ($[83] = x), ($[84] = _));
    else _ = $[84];
    let de;
    if ($[85] !== h || $[86] !== he)
      ((de = he && e(KeyboardShortcutHint, { chord: "enter", action: "continue", ...h })),
        ($[85] = h),
        ($[86] = he),
        ($[87] = de));
    else de = $[87];
    let ee;
    if ($[88] !== h)
      ((ee = e(KeyboardShortcutHint, { chord: "escape", action: "cancel", ...h })),
        ($[88] = h),
        ($[89] = ee));
    else ee = $[89];
    let te;
    if ($[90] !== de || $[91] !== ee)
      ((te = r(Byline, { children: [de, ee] })), ($[90] = de), ($[91] = ee), ($[92] = te));
    else te = $[92];
    let ke;
    if ($[93] !== g || $[94] !== te)
      ((ke = e(Text, { dimColor: !0, italic: g, children: te })), ($[93] = g), ($[94] = te), ($[95] = ke));
    else ke = $[95];
    let Ce;
    if ($[96] !== X || $[97] !== _ || $[98] !== ke) {
      let opened = r(Box, { flexDirection: "column", gap: 1, children: [X, _, ke] });
      Ce = e(Pane, { color: "permission", children: opened });
      (($[96] = X), ($[97] = _), ($[98] = ke), ($[99] = Ce));
    } else Ce = $[99];
    return Ce;
  }
  if (u !== null) {
    let X;
    if ($[100] !== T) ((X = isValidThemeColor(T)), ($[100] = T), ($[101] = X));
    else X = $[101];
    let wt = X;
    let U;
    if ($[102] !== g || $[103] !== c)
      ((U = !g && e(Text, { bold: !0, color: "permission", children: c })),
        ($[102] = g),
        ($[103] = c),
        ($[104] = U));
    else U = $[104];
    const L = wt ? T : k[u];
    let A;
    if ($[105] !== L) ((A = e(ColorSwatch, { value: L })), ($[105] = L), ($[106] = A));
    else A = $[106];
    let Y;
    if ($[107] === MEMO_CACHE_SENTINEL) ((Y = e(Text, { children: " " })), ($[107] = Y));
    else Y = $[107];
    let x;
    if ($[108] !== u) ((x = e(Text, { bold: !0, children: u })), ($[108] = u), ($[109] = x));
    else x = $[109];
    let _;
    if ($[110] !== A || $[111] !== x)
      ((_ = r(Box, { children: [A, Y, x] })), ($[110] = A), ($[111] = x), ($[112] = _));
    else _ = $[112];
    const de = k[u];
    let ee;
    if ($[113] !== de)
      ((ee = r(Text, { dimColor: !0, children: ["preset: ", de] })), ($[113] = de), ($[114] = ee));
    else ee = $[114];
    let te;
    if ($[115] !== _ || $[116] !== ee)
      ((te = r(Box, { flexDirection: "column", children: [_, ee] })),
        ($[115] = _),
        ($[116] = ee),
        ($[117] = te));
    else te = $[117];
    let ke;
    if ($[118] === MEMO_CACHE_SENTINEL) ((ke = e(Text, { children: "Value: " })), ($[118] = ke));
    else ke = $[118];
    let Ce;
    if ($[119] !== E || $[120] !== Oe || $[121] !== se || $[122] !== T || $[123] !== xe)
      ((Ce = r(Box, {
        children: [
          ke,
          e(TextInput, {
            value: T,
            onChange: xe,
            onSubmit: Oe,
            onExit: E,
            placeholder: "rgb(r,g,b) \xB7 #rrggbb \xB7 ansi:red",
            columns: 40,
            cursorOffset: se,
            onChangeCursorOffset: gt,
            disableCursorMovementForUpDownKeys: !0,
            disableEscapeDoublePress: !0,
            focus: !0,
            showCursor: !0,
          }),
        ],
      })),
        ($[119] = E),
        ($[120] = Oe),
        ($[121] = se),
        ($[122] = T),
        ($[123] = xe),
        ($[124] = Ce));
    else Ce = $[124];
    let Dt;
    if ($[125] !== h || $[126] !== wt)
      ((Dt = wt
        ? r(Byline, {
            children: [
              e(KeyboardShortcutHint, { chord: "enter", action: "save", ...h }),
              e(KeyboardShortcutHint, { chord: "escape", action: "cancel", ...h }),
            ],
          })
        : "Accepts rgb(r,g,b), #rrggbb, ansi256(n), or ansi:name"),
        ($[125] = h),
        ($[126] = wt),
        ($[127] = Dt));
    else Dt = $[127];
    let bt;
    if ($[128] !== g || $[129] !== Dt)
      ((bt = e(Text, { dimColor: !0, italic: g, children: Dt })), ($[128] = g), ($[129] = Dt), ($[130] = bt));
    else bt = $[130];
    let Xn;
    if ($[131] !== U || $[132] !== te || $[133] !== Ce || $[134] !== bt) {
      let _o = r(Box, { flexDirection: "column", gap: 1, children: [U, te, Ce, bt] });
      Xn = e(Pane, { color: "permission", children: _o });
      (($[131] = U), ($[132] = te), ($[133] = Ce), ($[134] = bt), ($[135] = Xn));
    } else Xn = $[135];
    return Xn;
  }
  const X = `${c} \xB7 based on ${l}`;
  let U;
  if ($[136] !== ie)
    ((U = {
      action: "reset",
      handler: (m_5) => {
        if (m_5) ie(m_5);
      },
    }),
      ($[136] = ie),
      ($[137] = U));
  else U = $[137];
  let L;
  if (
    $[138] !== l ||
    $[139] !== c ||
    $[140] !== onDone ||
    $[141] !== i ||
    $[142] !== setPreviewOverrides ||
    $[143] !== p
  )
    ((L = () => {
      (setPreviewOverrides(null), onDone({ slug: p, name: c, base: l, overrides: i, source: "user" }));
    }),
      ($[138] = l),
      ($[139] = c),
      ($[140] = onDone),
      ($[141] = i),
      ($[142] = setPreviewOverrides),
      ($[143] = p),
      ($[144] = L));
  else L = $[144];
  let A;
  if ($[145] !== ve || $[146] !== p)
    ((A = ve > 0 ? `${ve} ${plural(ve, "color")} customized \xB7 ${p}.json` : `editing ${p}.json`),
      ($[145] = ve),
      ($[146] = p),
      ($[147] = A));
  else A = $[147];
  let Y;
  if ($[148] !== i || $[149] !== f)
    ((Y = (m_7, isFocused) => {
      let Qo = i[m_7] !== void 0;
      return r(Box, {
        children: [
          e(ColorSwatch, { value: f(m_7) }),
          e(Text, { children: " " }),
          e(Text, { color: isFocused ? "suggestion" : void 0, children: m_7 }),
          e(ParenHint, { when: Qo, children: "custom" }),
        ],
      });
    }),
      ($[148] = i),
      ($[149] = f),
      ($[150] = Y));
  else Y = $[150];
  let x;
  if ($[151] !== i || $[152] !== k || $[153] !== f)
    ((x = (m_8) =>
      r(Box, {
        flexDirection: "column",
        children: [
          r(Text, { children: ["current: ", e(ColorSwatch, { value: f(m_8) }), " ", f(m_8)] }),
          i[m_8] !== void 0 &&
            r(Text, { dimColor: !0, children: ["preset: ", e(ColorSwatch, { value: k[m_8] }), " ", k[m_8]] }),
        ],
      })),
      ($[151] = i),
      ($[152] = k),
      ($[153] = f),
      ($[154] = x));
  else x = $[154];
  let _;
  if (
    $[155] !== ze ||
    $[156] !== Z ||
    $[157] !== F ||
    $[158] !== X ||
    $[159] !== U ||
    $[160] !== L ||
    $[161] !== A ||
    $[162] !== Y ||
    $[163] !== x
  )
    ((_ = e(FuzzyPicker, {
      title: X,
      placeholder: "Filter color tokens\u2026",
      items: ze,
      getKey: Do,
      initialQuery: Z,
      onQueryChange: Jn,
      onSelect: F,
      onTab: U,
      onCancel: L,
      selectAction: "edit",
      cancelAction: "done",
      matchLabel: A,
      renderItem: Y,
      renderPreview: x,
      emptyMessage: bo,
    })),
      ($[155] = ze),
      ($[156] = Z),
      ($[157] = F),
      ($[158] = X),
      ($[159] = U),
      ($[160] = L),
      ($[161] = A),
      ($[162] = Y),
      ($[163] = x),
      ($[164] = _));
  else _ = $[164];
  return _;
}
//@ chunk-3s4dbk22.js:23369-23515 sole-consumer
function uniqueSlug(ce, m) {
  let J = slugify(ce);
  if (!m.some((a) => a.slug === J)) return J;
  for (let a = 2; ; a++) {
    let re = `${J}-${a}`;
    if (!m.some((W) => W.slug === re)) return re;
  }
}
//@ chunk-axmbhcjg.js:28422-28530 fingerprint = matchKey (0.685)
function matchKey(e, n) {
  let parts = e.split(`
`),
    o = parts.length > Fn ? -1 : parts.findIndex((i) => AAe(i));
  return o === -1 ? {} : { line: n + o + 1 };
}

export { GlobalSearchDialog, matchKey };

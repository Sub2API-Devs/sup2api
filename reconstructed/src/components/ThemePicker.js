/**
 * components/ThemePicker.tsx
 *
 * /theme 主题选择器：预览 diff 着色，ctrl+t 切换语法高亮，写入 userSettings。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ThemePicker.tsx
 * pieces: chunk-5je9hz27.js (5)
 * attribution: placement 1, fingerprint 2, layout 2
 */
import { j, R, P, y, Se } from "../../vendor/react/cjs/react.production.js";
import { customThemeRef, parseCustomThemeRef } from "../utils/customThemes.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import {
  Me,
  useTheme,
  useThemeSetting,
  usePreviewTheme,
  useCustomThemes,
} from "./design-system/ThemeProvider.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { getColorModuleUnavailableReason } from "./StructuredDiff/colorDiff.js";
import { Gyo } from "../native-ts/color-diff/index.js";
import { useAppState, useSetAppState } from "../state/AppState.js";
import { useRegisterKeybindingContext } from "../keybindings/KeybindingContext.js";
import { useShortcutDisplay } from "../keybindings/useShortcutDisplay.js";
import { updateSettingsForSource } from "../utils/settings/settings.js";
import { useKeybinding, useGlobalExitKeybindings } from "../keybindings/useKeybinding.js";
import { gracefulShutdown } from "../utils/gracefulShutdown.js";
import { $V, NV, ScrollColumn } from "./design-system/ScrollColumn.js";
import { $E } from "./ScrollViewportContext.js";
import { topWithin } from "../ink/hooks/useTerminalHooks.js";
import { useMeasured } from "../ink/components/Input.js";
import { e, r, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { skt } from "../utils/theme.js";
import { OrderedListWithItem } from "./CustomSelect/selectTable.js";
import { StatusIcon, Qmt } from "./design-system/StatusIcon.js";
import { DiffFrame } from "./FileEditToolDiff.js";
import { StructuredDiff } from "./StructuredDiff.js";
import { env } from "../utils/env.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";

//@ chunk-5je9hz27.js:1146-1150 placement
j();
//@ chunk-5je9hz27.js:1150-1212 fingerprint = _temp (1)
function selectSettingsSyntaxHighlightingDisabled(s) {
  return s.settings.syntaxHighlightingDisabled;
}
//@ chunk-5je9hz27.js:1212-1331 layout
function toCustomThemeOption(xe) {
  return {
    label: xe.name,
    origin: xe.source === "user" ? "custom" : `from ${xe.source.plugin}`,
    value: customThemeRef(xe.slug),
  };
}
//@ chunk-5je9hz27.js:1331-1361 layout
var Ye = "__new_custom_theme__";
/**
 * 主题选择器：列出 dark/light/daltonized/ansi 等主题，选中即预览（含 diff 示例），ctrl+t 切换语法高亮，确定后写入 userSettings。
 */
//@ chunk-5je9hz27.js:1361-8399 fingerprint = ThemePicker (0.724)
function ThemePicker(t0) {
  let $ = w(109),
    {
      onThemeSelect: onThemeSelect,
      showIntroText: t1,
      helpText: t2,
      showHelpTextBelow: t3,
      hideEscToCancel: t4,
      skipExitHandling: t5,
      onCancel: onCancelProp,
      onCustomTheme: onCustomTheme,
    } = t0,
    g = t1 === void 0 ? !1 : t1,
    c = t2 === void 0 ? "" : t2,
    x = t3 === void 0 ? !1 : t3,
    X = t4 === void 0 ? !1 : t4,
    p = t5 === void 0 ? !1 : t5,
    { storageV5: storageV5 } = Me(),
    [Ie] = useTheme(),
    themeSetting = useThemeSetting(),
    { columns: columns } = useTerminalSize(),
    vt;
  if ($[0] === MEMO_CACHE_SENTINEL) ((vt = getColorModuleUnavailableReason()), ($[0] = vt));
  else vt = $[0];
  let Le = vt,
    Tt;
  if ($[1] !== Ie) ((Tt = Le === null ? Gyo(Ie) : null), ($[1] = Ie), ($[2] = Tt));
  else Tt = $[2];
  let z = Tt,
    { setPreviewTheme: setPreviewTheme, cancelPreview: cancelPreview } = usePreviewTheme(),
    d = R(void 0),
    wt;
  if ($[3] !== cancelPreview)
    ((wt = (wo) => {
      let Ct = Symbol("commit");
      d.current = Ct;
      let bt = () => {
        if (d.current === Ct) ((d.current = void 0), cancelPreview());
      };
      Promise.resolve(wo).then(bt, bt);
    }),
      ($[3] = cancelPreview),
      ($[4] = wt));
  else wt = $[4];
  let T = wt,
    St,
    yt;
  if ($[5] !== cancelPreview)
    ((yt = () => () => {
      if (d.current === void 0) cancelPreview();
    }),
      (St = [cancelPreview]),
      ($[5] = cancelPreview),
      ($[6] = St),
      ($[7] = yt));
  else ((St = $[6]), (yt = $[7]));
  P(yt, St);
  let W = useAppState(selectSettingsSyntaxHighlightingDisabled) ?? !1,
    setAppState = useSetAppState();
  useRegisterKeybindingContext("ThemePicker");
  let syntaxToggleShortcut = useShortcutDisplay("theme:toggleSyntaxHighlighting", "ThemePicker", "ctrl+t"),
    Pt;
  if ($[8] !== setAppState || $[9] !== storageV5 || $[10] !== W)
    ((Pt = () => {
      if (Le === null) {
        let newValue = !W;
        (updateSettingsForSource("userSettings", { syntaxHighlightingDisabled: newValue }, void 0, storageV5),
          setAppState((prev) => ({
            ...prev,
            settings: { ...prev.settings, syntaxHighlightingDisabled: newValue },
          })));
      }
    }),
      ($[8] = setAppState),
      ($[9] = storageV5),
      ($[10] = W),
      ($[11] = Pt));
  else Pt = $[11];
  let Ot;
  if ($[12] === MEMO_CACHE_SENTINEL) ((Ot = { context: "ThemePicker" }), ($[12] = Ot));
  else Ot = $[12];
  useKeybinding("theme:toggleSyntaxHighlighting", Pt, Ot);
  let Dt;
  if ($[13] !== cancelPreview || $[14] !== onCancelProp)
    ((Dt = () => {
      ((d.current = void 0), cancelPreview(), onCancelProp?.());
    }),
      ($[13] = cancelPreview),
      ($[14] = onCancelProp),
      ($[15] = Dt));
  else Dt = $[15];
  let Y = Dt,
    It;
  if ($[16] !== Y || $[17] !== cancelPreview || $[18] !== p)
    ((It = p
      ? Y
      : async () => {
          (cancelPreview(), await gracefulShutdown(0));
        }),
      ($[16] = Y),
      ($[17] = cancelPreview),
      ($[18] = p),
      ($[19] = It));
  else It = $[19];
  let Et;
  if ($[20] === MEMO_CACHE_SENTINEL) ((Et = { context: "Select" }), ($[20] = Et));
  else Et = $[20];
  useKeybinding("select:cancel", It, Et);
  let exitState = useGlobalExitKeybindings(p ? Y : void 0),
    { customThemes: customThemes } = useCustomThemes(),
    Mt,
    Lt,
    _t,
    At,
    Rt,
    Bt,
    Nt;
  if ($[21] === MEMO_CACHE_SENTINEL)
    ((Mt = { label: "Auto (match terminal)", value: "auto" }),
      (Lt = { label: "Dark mode", value: "dark" }),
      (_t = { label: "Light mode", value: "light" }),
      (At = { label: "Dark mode (colorblind-friendly)", value: "dark-daltonized" }),
      (Rt = { label: "Light mode (colorblind-friendly)", value: "light-daltonized" }),
      (Bt = { label: "Dark mode (ANSI colors only)", value: "dark-ansi" }),
      (Nt = { label: "Light mode (ANSI colors only)", value: "light-ansi" }),
      ($[21] = Mt),
      ($[22] = Lt),
      ($[23] = _t),
      ($[24] = At),
      ($[25] = Rt),
      ($[26] = Bt),
      ($[27] = Nt));
  else ((Mt = $[21]), (Lt = $[22]), (_t = $[23]), (At = $[24]), (Rt = $[25]), (Bt = $[26]), (Nt = $[27]));
  let $t;
  if ($[28] !== customThemes || $[29] !== onCustomTheme) {
    const mapped = customThemes.map(toCustomThemeOption);
    let I;
    if ($[31] !== onCustomTheme)
      ((I = onCustomTheme ? [{ label: "New custom theme\u2026", value: Ye }] : []),
        ($[31] = onCustomTheme),
        ($[32] = I));
    else I = $[32];
    $t = [Mt, Lt, _t, At, Rt, Bt, Nt, ...mapped, ...I];
    (($[28] = customThemes), ($[29] = onCustomTheme), ($[30] = $t));
  } else $t = $[30];
  let a = $t,
    index = a.findIndex((Co) => Co.value === themeSetting),
    [b, Ut] = y(a[Math.max(0, index)]?.value ?? themeSetting),
    [bo, So] = y(!1),
    [Ft, yo] = y(index !== -1);
  if (!Ft && !bo && index !== -1) (yo(!0), Ut(themeSetting));
  let Q;
  if ($[33] !== b) ((Q = parseCustomThemeRef(b)), ($[33] = b), ($[34] = Q));
  else Q = $[34];
  let ee = Q,
    I;
  if ($[35] !== customThemes || $[36] !== ee)
    ((I = ee ? customThemes.find((Po) => Po.slug === ee) : void 0),
      ($[35] = customThemes),
      ($[36] = ee),
      ($[37] = I));
  else I = $[37];
  let f = I,
    Ne = useShortcutDisplay("theme:editCustom", "ThemePicker", "ctrl+e"),
    Vt;
  if ($[38] !== f || $[39] !== T || $[40] !== onCustomTheme)
    ((Vt = () => {
      if (f && onCustomTheme && d.current === void 0) T(onCustomTheme(f));
    }),
      ($[38] = f),
      ($[39] = T),
      ($[40] = onCustomTheme),
      ($[41] = Vt));
  else Vt = $[41];
  let Gt;
  if ($[42] === MEMO_CACHE_SENTINEL) ((Gt = { context: "ThemePicker" }), ($[42] = Gt));
  else Gt = $[42];
  useKeybinding("theme:editCustom", Vt, Gt);
  let h = $V(),
    E = Se($E),
    Xt = R(null),
    zt;
  if ($[43] !== h)
    ((zt = () => {
      let $e = Xt.current;
      if ($e === null) {
        return 0;
      }
      let te = h?.box.current ?? $e;
      while (h === null && te.parentNode !== void 0) te = te.parentNode;
      return Math.max(0, topWithin($e, te));
    }),
      ($[43] = h),
      ($[44] = zt));
  else zt = $[44];
  let ko = useMeasured(zt),
    oe = g ? 0 : ko + (X ? 1 : 0),
    ne;
  if ($[45] !== g)
    ((ne = g
      ? e(Text, { children: "Let's get started." })
      : e(Text, { bold: !0, color: "permission", children: "Theme" })),
      ($[45] = g),
      ($[46] = ne));
  else ne = $[46];
  let Wt;
  if ($[47] === MEMO_CACHE_SENTINEL)
    ((Wt = e(Text, { bold: !0, children: "Choose the text style that looks best with your terminal" })),
      ($[47] = Wt));
  else Wt = $[47];
  let ie;
  if ($[48] !== c || $[49] !== x)
    ((ie = c && !x && e(Text, { dimColor: !0, children: c })), ($[48] = c), ($[49] = x), ($[50] = ie));
  else ie = $[50];
  let se;
  if ($[51] !== ie)
    ((se = r(Box, { flexDirection: "column", children: [Wt, ie] })), ($[51] = ie), ($[52] = se));
  else se = $[52];
  const Ue = Ft ? "on-saved-theme" : "on-first-theme",
    max = Math.max(0, index);
  let le;
  if ($[53] !== cancelPreview || $[54] !== b || $[55] !== setPreviewTheme || $[56] !== a)
    ((le = (setting) => {
      let M = a[setting]?.value;
      if (M === void 0 || M === b || d.current !== void 0) {
        return;
      }
      if ((Ut(M), So(!0), skt(M))) setPreviewTheme(M);
      else cancelPreview();
    }),
      ($[53] = cancelPreview),
      ($[54] = b),
      ($[55] = setPreviewTheme),
      ($[56] = a),
      ($[57] = le));
  else le = $[57];
  let ae;
  if (
    $[58] !== cancelPreview ||
    $[59] !== T ||
    $[60] !== onCustomTheme ||
    $[61] !== onThemeSelect ||
    $[62] !== a
  )
    ((ae = (setting_0) => {
      let Ve = a[setting_0]?.value;
      if (Ve === void 0 || d.current !== void 0) {
        return;
      }
      if (!skt(Ve)) {
        (cancelPreview(), onCustomTheme?.(void 0));
        return;
      }
      T(onThemeSelect(Ve));
    }),
      ($[58] = cancelPreview),
      ($[59] = T),
      ($[60] = onCustomTheme),
      ($[61] = onThemeSelect),
      ($[62] = a),
      ($[63] = ae));
  else ae = $[63];
  let re;
  if ($[64] !== a || $[65] !== themeSetting)
    ((re = a.map((L) =>
      e(
        OrderedListWithItem.Item,
        {
          label: L.label,
          icon:
            L.value === themeSetting
              ? e(StatusIcon, { status: "success", "aria-label": "current:" })
              : e(Text, { "aria-hidden": !0, children: " ".repeat(Qmt()) }),
          meta: L.origin === void 0 ? void 0 : [L.origin],
        },
        L.value,
      ),
    )),
      ($[64] = a),
      ($[65] = themeSetting),
      ($[66] = re));
  else re = $[66];
  let me;
  if ($[67] !== Ue || $[68] !== max || $[69] !== le || $[70] !== ae || $[71] !== re)
    ((me = e(OrderedListWithItem, { defaultFocusIndex: max, onFocus: le, onSelect: ae, children: re }, Ue)),
      ($[67] = Ue),
      ($[68] = max),
      ($[69] = le),
      ($[70] = ae),
      ($[71] = re),
      ($[72] = me));
  else me = $[72];
  let ce;
  if ($[73] !== ne || $[74] !== se || $[75] !== me)
    ((ce = r(Box, { flexDirection: "column", gap: 1, children: [ne, se, me] })),
      ($[73] = ne),
      ($[74] = se),
      ($[75] = me),
      ($[76] = ce));
  else ce = $[76];
  let Yt;
  if ($[77] === MEMO_CACHE_SENTINEL)
    ((Yt = {
      oldStart: 1,
      newStart: 1,
      oldLines: 3,
      newLines: 3,
      lines: [
        " function greet() {",
        '-  console.log("Hello, World!");',
        '+  console.log("Hello, Claude!");',
        " }",
      ],
    }),
      ($[77] = Yt));
  else Yt = $[77];
  const Ge = columns - 6;
  let de;
  if ($[78] !== Ge)
    ((de = e(DiffFrame, {
      paddingX: 0,
      children: e(StructuredDiff, { patch: Yt, dim: !1, filePath: "demo.js", firstLine: null, width: Ge }),
    })),
      ($[78] = Ge),
      ($[79] = de));
  else de = $[79];
  const Xe =
    Le === "env"
      ? `Syntax highlighting disabled (via CLAUDE_CODE_SYNTAX_HIGHLIGHT=${env.CLAUDE_CODE_SYNTAX_HIGHLIGHT})`
      : W
        ? `Syntax highlighting disabled (${syntaxToggleShortcut} to enable)`
        : z
          ? `Syntax theme: ${z.theme}${z.source ? ` (from ${z.source})` : ""} (${syntaxToggleShortcut} to disable)`
          : `Syntax highlighting enabled (${syntaxToggleShortcut} to disable)`;
  let he;
  if ($[80] !== Xe) ((he = r(Text, { dimColor: !0, children: [" ", Xe] })), ($[80] = Xe), ($[81] = he));
  else he = $[81];
  let ue;
  if ($[82] !== de || $[83] !== he)
    ((ue = r(Box, { flexDirection: "column", width: "100%", children: [de, he] })),
      ($[82] = de),
      ($[83] = he),
      ($[84] = ue));
  else ue = $[84];
  let jt;
  if ($[85] !== ce || $[86] !== ue)
    ((jt = r(Box, { ref: Xt, flexDirection: "column", gap: 1, children: [ce, ue] })),
      ($[85] = ce),
      ($[86] = ue),
      ($[87] = jt));
  else jt = $[87];
  let ze = jt,
    ge;
  if ($[88] !== h?.rows || $[89] !== oe || $[90] !== E)
    ((ge = E && { ...E, rows: Math.max(0, (h?.rows ?? E.rows) - oe) }),
      ($[88] = h?.rows),
      ($[89] = oe),
      ($[90] = E),
      ($[91] = ge));
  else ge = $[91];
  const We = (h?.reserve ?? NV) + oe;
  let pe;
  if (
    $[92] !== Ne ||
    $[93] !== exitState ||
    $[94] !== f ||
    $[95] !== c ||
    $[96] !== X ||
    $[97] !== onCustomTheme ||
    $[98] !== x ||
    $[99] !== g ||
    $[100] !== p
  )
    ((pe =
      !g &&
      r(Box, {
        marginTop: 1,
        children: [
          x && c && e(Box, { marginLeft: 3, children: e(Text, { dimColor: !0, children: c }) }),
          !X &&
            e(Box, {
              children: e(Text, {
                dimColor: !0,
                italic: !0,
                children: exitState.pending
                  ? r(Fragment, {
                      children: ["Press ", exitState.keyName, " again to", " ", p ? "cancel" : "exit"],
                    })
                  : r(Byline, {
                      children: [
                        e(KeyboardShortcutHint, { chord: "enter", action: "select" }),
                        f && onCustomTheme && e(KeyboardShortcutHint, { chord: Ne, action: "edit" }),
                        e(KeyboardShortcutHint, { chord: "escape", action: "cancel" }),
                      ],
                    }),
              }),
            }),
        ],
      })),
      ($[92] = Ne),
      ($[93] = exitState),
      ($[94] = f),
      ($[95] = c),
      ($[96] = X),
      ($[97] = onCustomTheme),
      ($[98] = x),
      ($[99] = g),
      ($[100] = p),
      ($[101] = pe));
  else pe = $[101];
  let fe;
  if ($[102] !== ze || $[103] !== We || $[104] !== pe)
    ((fe = r(ScrollColumn, { reserve: We, children: [ze, pe] })),
      ($[102] = ze),
      ($[103] = We),
      ($[104] = pe),
      ($[105] = fe));
  else fe = $[105];
  let qt;
  if ($[106] !== ge || $[107] !== fe)
    ((qt = e($E, { value: ge, children: fe })), ($[106] = ge), ($[107] = fe), ($[108] = qt));
  else qt = $[108];
  return qt;
}

export { ThemePicker };

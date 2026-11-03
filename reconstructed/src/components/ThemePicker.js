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
import { init_react_production, R, P, y, Se } from "../../vendor/react/cjs/react.production.js";
import { customThemeRef, parseCustomThemeRef } from "../utils/customThemes.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import {
  useTheme_2,
  useTheme,
  useThemeSetting,
  usePreviewTheme,
  useCustomThemes,
} from "./design-system/ThemeProvider.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { getColorModuleUnavailableReason } from "./StructuredDiff/colorDiff.js";
import { getColorSyntaxTheme } from "../native-ts/color-diff/index.js";
import { useAppState, useSetAppState } from "../state/AppState.js";
import { useRegisterKeybindingContext } from "../keybindings/KeybindingContext.js";
import { useShortcutDisplay } from "../keybindings/useShortcutDisplay.js";
import { updateSettingsForSource } from "../utils/settings/settings.js";
import { useKeybinding, useGlobalExitKeybindings } from "../keybindings/useKeybinding.js";
import { gracefulShutdown } from "../utils/gracefulShutdown.js";
import {
  useScrollColumnContext,
  SCROLL_COLUMN_MIN_ROWS,
  ScrollColumn,
} from "./design-system/ScrollColumn.js";
import { scrollViewportContext } from "./ScrollViewportContext.js";
import { topWithin } from "../ink/hooks/useTerminalHooks.js";
import { useMeasured } from "../ink/components/Input.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { isSelectableThemeName } from "../utils/theme.js";
import { OrderedListWithItem } from "./CustomSelect/selectTable.js";
import { StatusIcon, maxStatusIconWidth } from "./design-system/StatusIcon.js";
import { DiffFrame } from "./FileEditToolDiff.js";
import { StructuredDiff } from "./StructuredDiff.js";
import { env } from "../utils/env.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";

//@ chunk-5je9hz27.js:1146-1150 placement
init_react_production();
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
var NEW_CUSTOM_THEME = "__new_custom_theme__";
//@ chunk-5je9hz27.js:1361-8399 fingerprint = ThemePicker (0.724)
/**
 * 主题选择器：列出 dark/light/daltonized/ansi 等主题，选中即预览（含 diff 示例），ctrl+t 切换语法高亮，确定后写入 userSettings。
 */
function ThemePicker(props) {
  let $ = w(109);
  let {
    onThemeSelect,
    showIntroText,
    helpText,
    showHelpTextBelow,
    hideEscToCancel,
    skipExitHandling,
    onCancel: onCancelProp,
    onCustomTheme,
  } = props;
  let g = showIntroText === undefined ? false : showIntroText;
  let c = helpText === undefined ? "" : helpText;
  let x = showHelpTextBelow === undefined ? false : showHelpTextBelow;
  let X = hideEscToCancel === undefined ? false : hideEscToCancel;
  let p = skipExitHandling === undefined ? false : skipExitHandling;
  let { storageV5 } = useTheme_2();
  let [theme] = useTheme();
  let themeSetting = useThemeSetting();
  let { columns } = useTerminalSize();
  let vt;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    vt = getColorModuleUnavailableReason();
    $[0] = vt;
  } else vt = $[0];
  let colorModuleUnavailableReason = vt;
  let Tt;
  if ($[1] !== theme) {
    Tt = colorModuleUnavailableReason === null ? getColorSyntaxTheme(theme) : null;
    $[1] = theme;
    $[2] = Tt;
  } else Tt = $[2];
  let syntaxTheme = Tt;
  let { setPreviewTheme, cancelPreview } = usePreviewTheme();
  let d = R(undefined);
  let wt;
  if ($[3] !== cancelPreview) {
    wt = (wo) => {
      let Ct = Symbol("commit");
      d.current = Ct;
      let bt = () => {
        if (d.current === Ct) {
          d.current = undefined;
          cancelPreview();
        }
      };
      Promise.resolve(wo).then(bt, bt);
    };
    $[3] = cancelPreview;
    $[4] = wt;
  } else wt = $[4];
  let T = wt;
  let St;
  let yt;
  if ($[5] !== cancelPreview) {
    yt = () => () => {
      if (d.current === undefined) cancelPreview();
    };
    St = [cancelPreview];
    $[5] = cancelPreview;
    $[6] = St;
    $[7] = yt;
  } else {
    St = $[6];
    yt = $[7];
  }
  P(yt, St);
  let W = useAppState(selectSettingsSyntaxHighlightingDisabled) ?? false;
  let setAppState = useSetAppState();
  useRegisterKeybindingContext("ThemePicker");
  let syntaxToggleShortcut = useShortcutDisplay("theme:toggleSyntaxHighlighting", "ThemePicker", "ctrl+t");
  let Pt;
  if ($[8] !== setAppState || $[9] !== storageV5 || $[10] !== W) {
    Pt = () => {
      if (colorModuleUnavailableReason === null) {
        let newValue = !W;
        updateSettingsForSource(
          "userSettings",
          {
            syntaxHighlightingDisabled: newValue,
          },
          undefined,
          storageV5,
        );
        setAppState((prev) => ({
          ...prev,
          settings: {
            ...prev.settings,
            syntaxHighlightingDisabled: newValue,
          },
        }));
      }
    };
    $[8] = setAppState;
    $[9] = storageV5;
    $[10] = W;
    $[11] = Pt;
  } else Pt = $[11];
  let Ot;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    Ot = {
      context: "ThemePicker",
    };
    $[12] = Ot;
  } else Ot = $[12];
  useKeybinding("theme:toggleSyntaxHighlighting", Pt, Ot);
  let Dt;
  if ($[13] !== cancelPreview || $[14] !== onCancelProp) {
    Dt = () => {
      d.current = undefined;
      cancelPreview();
      onCancelProp?.();
    };
    $[13] = cancelPreview;
    $[14] = onCancelProp;
    $[15] = Dt;
  } else Dt = $[15];
  let Y = Dt;
  let It;
  if ($[16] !== Y || $[17] !== cancelPreview || $[18] !== p) {
    It = p
      ? Y
      : async () => {
          cancelPreview();
          await gracefulShutdown(0);
        };
    $[16] = Y;
    $[17] = cancelPreview;
    $[18] = p;
    $[19] = It;
  } else It = $[19];
  let Et;
  if ($[20] === MEMO_CACHE_SENTINEL) {
    Et = {
      context: "Select",
    };
    $[20] = Et;
  } else Et = $[20];
  useKeybinding("select:cancel", It, Et);
  let exitState = useGlobalExitKeybindings(p ? Y : undefined);
  let { customThemes } = useCustomThemes();
  let Mt;
  let Lt;
  let _t;
  let At;
  let Rt;
  let Bt;
  let Nt;
  if ($[21] === MEMO_CACHE_SENTINEL) {
    Mt = {
      label: "Auto (match terminal)",
      value: "auto",
    };
    Lt = {
      label: "Dark mode",
      value: "dark",
    };
    _t = {
      label: "Light mode",
      value: "light",
    };
    At = {
      label: "Dark mode (colorblind-friendly)",
      value: "dark-daltonized",
    };
    Rt = {
      label: "Light mode (colorblind-friendly)",
      value: "light-daltonized",
    };
    Bt = {
      label: "Dark mode (ANSI colors only)",
      value: "dark-ansi",
    };
    Nt = {
      label: "Light mode (ANSI colors only)",
      value: "light-ansi",
    };
    $[21] = Mt;
    $[22] = Lt;
    $[23] = _t;
    $[24] = At;
    $[25] = Rt;
    $[26] = Bt;
    $[27] = Nt;
  } else {
    Mt = $[21];
    Lt = $[22];
    _t = $[23];
    At = $[24];
    Rt = $[25];
    Bt = $[26];
    Nt = $[27];
  }
  let $t;
  if ($[28] !== customThemes || $[29] !== onCustomTheme) {
    const mapped = customThemes.map(toCustomThemeOption);
    let I;
    if ($[31] !== onCustomTheme) {
      I = onCustomTheme
        ? [
            {
              label: "New custom theme\u2026",
              value: NEW_CUSTOM_THEME,
            },
          ]
        : [];
      $[31] = onCustomTheme;
      $[32] = I;
    } else I = $[32];
    $t = [Mt, Lt, _t, At, Rt, Bt, Nt, ...mapped, ...I];
    $[28] = customThemes;
    $[29] = onCustomTheme;
    $[30] = $t;
  } else $t = $[30];
  let a = $t;
  let index = a.findIndex((Co) => Co.value === themeSetting);
  let [b, Ut] = y(a[Math.max(0, index)]?.value ?? themeSetting);
  let [bo, So] = y(false);
  let [Ft, yo] = y(index !== -1);
  if (!Ft && !bo && index !== -1) {
    yo(true);
    Ut(themeSetting);
  }
  let Q;
  if ($[33] !== b) {
    Q = parseCustomThemeRef(b);
    $[33] = b;
    $[34] = Q;
  } else Q = $[34];
  let ee = Q;
  let I;
  if ($[35] !== customThemes || $[36] !== ee) {
    I = ee ? customThemes.find((customTheme) => customTheme.slug === ee) : undefined;
    $[35] = customThemes;
    $[36] = ee;
    $[37] = I;
  } else I = $[37];
  let f = I;
  let chord = useShortcutDisplay("theme:editCustom", "ThemePicker", "ctrl+e");
  let Vt;
  if ($[38] !== f || $[39] !== T || $[40] !== onCustomTheme) {
    Vt = () => {
      if (f && onCustomTheme && d.current === undefined) T(onCustomTheme(f));
    };
    $[38] = f;
    $[39] = T;
    $[40] = onCustomTheme;
    $[41] = Vt;
  } else Vt = $[41];
  let Gt;
  if ($[42] === MEMO_CACHE_SENTINEL) {
    Gt = {
      context: "ThemePicker",
    };
    $[42] = Gt;
  } else Gt = $[42];
  useKeybinding("theme:editCustom", Vt, Gt);
  let scrollColumnContext = useScrollColumnContext();
  let E = Se(scrollViewportContext);
  let Xt = R(null);
  let zt;
  if ($[43] !== scrollColumnContext) {
    zt = () => {
      let $e = Xt.current;
      if ($e === null) {
        return 0;
      }
      let te = scrollColumnContext?.box.current ?? $e;
      while (scrollColumnContext === null && te.parentNode !== undefined) te = te.parentNode;
      return Math.max(0, topWithin($e, te));
    };
    $[43] = scrollColumnContext;
    $[44] = zt;
  } else zt = $[44];
  let measured = useMeasured(zt);
  let oe = g ? 0 : measured + (X ? 1 : 0);
  let ne;
  if ($[45] !== g) {
    ne = g
      ? jsxProd_default(Text, {
          children: "Let's get started.",
        })
      : jsxProd_default(Text, {
          bold: true,
          color: "permission",
          children: "Theme",
        });
    $[45] = g;
    $[46] = ne;
  } else ne = $[46];
  let Wt;
  if ($[47] === MEMO_CACHE_SENTINEL) {
    Wt = jsxProd_default(Text, {
      bold: true,
      children: "Choose the text style that looks best with your terminal",
    });
    $[47] = Wt;
  } else Wt = $[47];
  let ie;
  if ($[48] !== c || $[49] !== x) {
    ie =
      c &&
      !x &&
      jsxProd_default(Text, {
        dimColor: true,
        children: c,
      });
    $[48] = c;
    $[49] = x;
    $[50] = ie;
  } else ie = $[50];
  let se;
  if ($[51] !== ie) {
    se = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [Wt, ie],
    });
    $[51] = ie;
    $[52] = se;
  } else se = $[52];
  const Ue = Ft ? "on-saved-theme" : "on-first-theme";
  const defaultFocusIndex = Math.max(0, index);
  let onFocus;
  if ($[53] !== cancelPreview || $[54] !== b || $[55] !== setPreviewTheme || $[56] !== a) {
    onFocus = (setting) => {
      let M = a[setting]?.value;
      if (M === undefined || M === b || d.current !== undefined) {
        return;
      }
      Ut(M);
      So(true);
      if (isSelectableThemeName(M)) setPreviewTheme(M);
      else cancelPreview();
    };
    $[53] = cancelPreview;
    $[54] = b;
    $[55] = setPreviewTheme;
    $[56] = a;
    $[57] = onFocus;
  } else onFocus = $[57];
  let onSelect;
  if (
    $[58] !== cancelPreview ||
    $[59] !== T ||
    $[60] !== onCustomTheme ||
    $[61] !== onThemeSelect ||
    $[62] !== a
  ) {
    onSelect = (setting_0) => {
      let Ve = a[setting_0]?.value;
      if (Ve === undefined || d.current !== undefined) {
        return;
      }
      if (!isSelectableThemeName(Ve)) {
        cancelPreview();
        onCustomTheme?.(undefined);
        return;
      }
      T(onThemeSelect(Ve));
    };
    $[58] = cancelPreview;
    $[59] = T;
    $[60] = onCustomTheme;
    $[61] = onThemeSelect;
    $[62] = a;
    $[63] = onSelect;
  } else onSelect = $[63];
  let children;
  if ($[64] !== a || $[65] !== themeSetting) {
    children = a.map((L) =>
      jsxProd_default(
        OrderedListWithItem.Item,
        {
          label: L.label,
          icon:
            L.value === themeSetting
              ? jsxProd_default(StatusIcon, {
                  status: "success",
                  "aria-label": "current:",
                })
              : jsxProd_default(Text, {
                  "aria-hidden": true,
                  children: " ".repeat(maxStatusIconWidth()),
                }),
          meta: L.origin === undefined ? undefined : [L.origin],
        },
        L.value,
      ),
    );
    $[64] = a;
    $[65] = themeSetting;
    $[66] = children;
  } else children = $[66];
  let me;
  if (
    $[67] !== Ue ||
    $[68] !== defaultFocusIndex ||
    $[69] !== onFocus ||
    $[70] !== onSelect ||
    $[71] !== children
  ) {
    me = jsxProd_default(
      OrderedListWithItem,
      {
        defaultFocusIndex,
        onFocus,
        onSelect,
        children,
      },
      Ue,
    );
    $[67] = Ue;
    $[68] = defaultFocusIndex;
    $[69] = onFocus;
    $[70] = onSelect;
    $[71] = children;
    $[72] = me;
  } else me = $[72];
  let ce;
  if ($[73] !== ne || $[74] !== se || $[75] !== me) {
    ce = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [ne, se, me],
    });
    $[73] = ne;
    $[74] = se;
    $[75] = me;
    $[76] = ce;
  } else ce = $[76];
  let patch;
  if ($[77] === MEMO_CACHE_SENTINEL) {
    patch = {
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
    };
    $[77] = patch;
  } else patch = $[77];
  const width = columns - 6;
  let de;
  if ($[78] !== width) {
    de = jsxProd_default(DiffFrame, {
      paddingX: 0,
      children: jsxProd_default(StructuredDiff, {
        patch,
        dim: false,
        filePath: "demo.js",
        firstLine: null,
        width,
      }),
    });
    $[78] = width;
    $[79] = de;
  } else de = $[79];
  const Xe =
    colorModuleUnavailableReason === "env"
      ? `Syntax highlighting disabled (via CLAUDE_CODE_SYNTAX_HIGHLIGHT=${env.CLAUDE_CODE_SYNTAX_HIGHLIGHT})`
      : W
        ? `Syntax highlighting disabled (${syntaxToggleShortcut} to enable)`
        : syntaxTheme
          ? `Syntax theme: ${syntaxTheme.theme}${syntaxTheme.source ? ` (from ${syntaxTheme.source})` : ""} (${syntaxToggleShortcut} to disable)`
          : `Syntax highlighting enabled (${syntaxToggleShortcut} to disable)`;
  let he;
  if ($[80] !== Xe) {
    he = jsxProd_default_2(Text, {
      dimColor: true,
      children: [" ", Xe],
    });
    $[80] = Xe;
    $[81] = he;
  } else he = $[81];
  let ue;
  if ($[82] !== de || $[83] !== he) {
    ue = jsxProd_default_2(Box, {
      flexDirection: "column",
      width: "100%",
      children: [de, he],
    });
    $[82] = de;
    $[83] = he;
    $[84] = ue;
  } else ue = $[84];
  let jt;
  if ($[85] !== ce || $[86] !== ue) {
    jt = jsxProd_default_2(Box, {
      ref: Xt,
      flexDirection: "column",
      gap: 1,
      children: [ce, ue],
    });
    $[85] = ce;
    $[86] = ue;
    $[87] = jt;
  } else jt = $[87];
  let ze = jt;
  let value;
  if ($[88] !== scrollColumnContext?.rows || $[89] !== oe || $[90] !== E) {
    value = E && {
      ...E,
      rows: Math.max(0, (scrollColumnContext?.rows ?? E.rows) - oe),
    };
    $[88] = scrollColumnContext?.rows;
    $[89] = oe;
    $[90] = E;
    $[91] = value;
  } else value = $[91];
  const reserve = (scrollColumnContext?.reserve ?? SCROLL_COLUMN_MIN_ROWS) + oe;
  let pe;
  if (
    $[92] !== chord ||
    $[93] !== exitState ||
    $[94] !== f ||
    $[95] !== c ||
    $[96] !== X ||
    $[97] !== onCustomTheme ||
    $[98] !== x ||
    $[99] !== g ||
    $[100] !== p
  ) {
    pe =
      !g &&
      jsxProd_default_2(Box, {
        marginTop: 1,
        children: [
          x &&
            c &&
            jsxProd_default(Box, {
              marginLeft: 3,
              children: jsxProd_default(Text, {
                dimColor: true,
                children: c,
              }),
            }),
          !X &&
            jsxProd_default(Box, {
              children: jsxProd_default(Text, {
                dimColor: true,
                italic: true,
                children: exitState.pending
                  ? jsxProd_default_2(Fragment, {
                      children: ["Press ", exitState.keyName, " again to", " ", p ? "cancel" : "exit"],
                    })
                  : jsxProd_default_2(Byline, {
                      children: [
                        jsxProd_default(KeyboardShortcutHint, {
                          chord: "enter",
                          action: "select",
                        }),
                        f &&
                          onCustomTheme &&
                          jsxProd_default(KeyboardShortcutHint, {
                            chord,
                            action: "edit",
                          }),
                        jsxProd_default(KeyboardShortcutHint, {
                          chord: "escape",
                          action: "cancel",
                        }),
                      ],
                    }),
              }),
            }),
        ],
      });
    $[92] = chord;
    $[93] = exitState;
    $[94] = f;
    $[95] = c;
    $[96] = X;
    $[97] = onCustomTheme;
    $[98] = x;
    $[99] = g;
    $[100] = p;
    $[101] = pe;
  } else pe = $[101];
  let children_2;
  if ($[102] !== ze || $[103] !== reserve || $[104] !== pe) {
    children_2 = jsxProd_default_2(ScrollColumn, {
      reserve,
      children: [ze, pe],
    });
    $[102] = ze;
    $[103] = reserve;
    $[104] = pe;
    $[105] = children_2;
  } else children_2 = $[105];
  let qt;
  if ($[106] !== value || $[107] !== children_2) {
    qt = jsxProd_default(scrollViewportContext, {
      value,
      children: children_2,
    });
    $[106] = value;
    $[107] = children_2;
    $[108] = qt;
  } else qt = $[108];
  return qt;
}
export { ThemePicker };

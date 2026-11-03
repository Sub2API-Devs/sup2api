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
import { init_react_production, y, P } from "../../vendor/react/cjs/react.production.js";
import { FULL_BLOCK_GLYPH } from "../utils/permissions/autoModeRulesPrompt.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { useTheme_2, useCustomThemes } from "./design-system/ThemeProvider.js";
import { stableEmptyObject } from "../utils/stableEmptyObject.js";
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
import { MAX_POSIX_PATH_LENGTH } from "../utils/posixPaths.js";
import { looksLikeCredentialIncludingNul } from "../services/homeSeed/portableSettings.js";

//@ chunk-3s4dbk22.js:15006-15010 sole-consumer
init_react_production();
//@ chunk-3s4dbk22.js:15010-15014 sole-consumer
init_react_production();
//@ chunk-3s4dbk22.js:15042-15065 sole-consumer
function returnFalse() {
  return false;
}
//@ chunk-3s4dbk22.js:15065-15091 sole-consumer
function identity(Jo) {
  return Jo;
}
//@ chunk-3s4dbk22.js:15091-15138 sole-consumer
function noColorNamedText(Vo) {
  return `No color named "${Vo}"`;
}
//@ chunk-3s4dbk22.js:15138-15153 sole-consumer
var DOUBLE_WIDTH = FULL_BLOCK_GLYPH + FULL_BLOCK_GLYPH;
//@ chunk-3s4dbk22.js:15153-15270 sole-consumer
function ColorSwatch(props) {
  let J = w(2);
  let { value: m } = props;
  let a;
  if (J[0] !== m) {
    a = jsxProd_default(Text, {
      color: m,
      children: DOUBLE_WIDTH,
    });
    J[0] = m;
    J[1] = a;
  } else a = J[1];
  return a;
}
//@ chunk-3s4dbk22.js:15270-23369 callgraph-fingerprint = GlobalSearchDialog (0.218)
function GlobalSearchDialog(props) {
  let $ = w(165);
  let { initial, defaultBase, onDone, onPick, onCancel } = props;
  let { storageV5 } = useTheme_2();
  let { customThemes, reloadCustomThemes, setPreviewOverrides } = useCustomThemes();
  let Pe = initial !== undefined && initial.source !== "user";
  let [at, je] = y(initial && !Pe ? "colors" : "name");
  let [c, mt] = y(initial?.name ?? "");
  let [Qe, z] = y(c.length);
  let [p, Je] = y(Pe ? "" : (initial?.slug ?? ""));
  let ct;
  if ($[0] !== defaultBase || $[1] !== initial?.base) {
    ct = () => initial?.base ?? defaultBase;
    $[0] = defaultBase;
    $[1] = initial?.base;
    $[2] = ct;
  } else ct = $[2];
  let [l] = y(ct);
  let [g] = y(returnFalse);
  let ue;
  if ($[3] !== g) {
    ue = stableEmptyObject(g);
    $[3] = g;
    $[4] = ue;
  } else ue = $[4];
  let h = ue;
  let ut;
  if ($[5] !== l) {
    ut = getTheme(l);
    $[5] = l;
    $[6] = ut;
  } else ut = $[6];
  let k = ut;
  let ft;
  if ($[7] !== initial?.overrides) {
    ft = initial?.overrides ?? {};
    $[7] = initial?.overrides;
    $[8] = ft;
  } else ft = $[8];
  let [i, Qn] = y(ft);
  let Ve;
  if ($[9] !== k) {
    Ve = Object.keys(k).sort();
    $[9] = k;
    $[10] = Ve;
  } else Ve = $[10];
  let fe = Ve;
  let [Z, Jn] = y("");
  let [u, Xe] = y(null);
  let [T, vt] = y("");
  let [se, gt] = y(0);
  let D;
  if ($[11] !== fe || $[12] !== Z) {
    let lower = Z.toLowerCase();
    D = lower ? fe.filter((Xt) => Xt.toLowerCase().includes(lower)) : fe;
    $[11] = fe;
    $[12] = Z;
    $[13] = D;
  } else D = $[13];
  let items = D;
  let zt;
  if ($[14] !== customThemes || $[15] !== c || $[16] !== p) {
    zt = p || uniqueSlug(c, customThemes);
    $[14] = customThemes;
    $[15] = c;
    $[16] = p;
    $[17] = zt;
  } else zt = $[17];
  let V = zt;
  let N;
  if ($[18] !== i) {
    N = Object.keys(i);
    $[18] = i;
    $[19] = N;
  } else N = $[19];
  let ve = N.length;
  let Se;
  let Kt;
  if ($[20] !== setPreviewOverrides) {
    Kt = () => () => setPreviewOverrides(null);
    Se = [setPreviewOverrides];
    $[20] = setPreviewOverrides;
    $[21] = Se;
    $[22] = Kt;
  } else {
    Se = $[21];
    Kt = $[22];
  }
  P(Kt, Se);
  let b;
  if ($[23] !== i || $[24] !== k) {
    b = function f(ht) {
      return i[ht] ?? k[ht];
    };
    $[23] = i;
    $[24] = k;
    $[25] = b;
  } else b = $[25];
  let f = b;
  let Ke;
  if ($[26] !== l || $[27] !== c || $[28] !== setPreviewOverrides || $[29] !== storageV5) {
    Ke = function K(ge, $e) {
      Qn($e);
      setPreviewOverrides($e);
      saveCustomTheme(
        {
          slug: ge,
          name: c.trim(),
          base: l,
          overrides: $e,
          source: "user",
        },
        storageV5,
      ).catch((error) => {
        logForDebugging(`[theme] save ${ge} failed: ${error}`, {
          level: "warn",
        });
      });
    };
    $[26] = l;
    $[27] = c;
    $[28] = setPreviewOverrides;
    $[29] = storageV5;
    $[30] = Ke;
  } else Ke = $[30];
  let K = Ke;
  let kt;
  if ($[31] !== f) {
    kt = function F(Ye) {
      let Ct = f(Ye);
      vt(Ct);
      gt(Ct.length);
      Xe(Ye);
    };
    $[31] = f;
    $[32] = kt;
  } else kt = $[32];
  let onSelect = kt;
  let yt;
  if ($[33] !== K || $[34] !== T || $[35] !== u || $[36] !== i || $[37] !== k || $[38] !== p) {
    yt = function Oe() {
      if (u === null || !isValidThemeColor(T)) {
        return;
      }
      K(
        p,
        T === k[u]
          ? Uo(i, u)
          : {
              ...i,
              [u]: T,
            },
      );
      Xe(null);
    };
    $[33] = K;
    $[34] = T;
    $[35] = u;
    $[36] = i;
    $[37] = k;
    $[38] = p;
    $[39] = yt;
  } else yt = $[39];
  let onSubmit = yt;
  let H;
  if ($[40] !== i || $[41] !== setPreviewOverrides) {
    H = function E() {
      setPreviewOverrides(i);
      Xe(null);
    };
    $[40] = i;
    $[41] = setPreviewOverrides;
    $[42] = H;
  } else H = $[42];
  let E = H;
  let Gt;
  if ($[43] !== K || $[44] !== i || $[45] !== p) {
    Gt = function ie(m_0) {
      if (!(m_0 in i)) {
        return;
      }
      K(p, Uo(i, m_0));
    };
    $[43] = K;
    $[44] = i;
    $[45] = p;
    $[46] = Gt;
  } else Gt = $[46];
  let ie = Gt;
  let Ae;
  if ($[47] !== u || $[48] !== i || $[49] !== setPreviewOverrides) {
    Ae = function xe(match) {
      vt(match);
      if (u && isValidThemeColor(match))
        setPreviewOverrides({
          ...i,
          [u]: match,
        });
    };
    $[47] = u;
    $[48] = i;
    $[49] = setPreviewOverrides;
    $[50] = Ae;
  } else Ae = $[50];
  let onChange = Ae;
  let Tt;
  if ($[51] !== E || $[52] !== u || $[53] !== onCancel) {
    Tt = () => {
      if (u !== null) E();
      else onCancel();
    };
    $[51] = E;
    $[52] = u;
    $[53] = onCancel;
    $[54] = Tt;
  } else Tt = $[54];
  const isActive = at === "name" || u !== null;
  let Vn;
  if ($[55] !== isActive) {
    Vn = {
      context: "Settings",
      isActive,
    };
    $[55] = isActive;
    $[56] = Vn;
  } else Vn = $[56];
  useKeybinding("confirm:no", Tt, Vn);
  if (at === "name") {
    let Re;
    let he;
    if ($[57] !== c) {
      Re = c.trim();
      he = Re.length > 0;
      $[57] = c;
      $[58] = Re;
      $[59] = he;
    } else {
      Re = $[58];
      he = $[59];
    }
    let children = Pe && initial ? `Fork ${initial.name} to your themes` : "New custom theme";
    let X;
    if ($[60] !== g || $[61] !== children) {
      X =
        !g &&
        jsxProd_default(Text, {
          bold: true,
          color: "permission",
          children,
        });
      $[60] = g;
      $[61] = children;
      $[62] = X;
    } else X = $[62];
    let U;
    if ($[63] === MEMO_CACHE_SENTINEL) {
      U = jsxProd_default(Text, {
        children: "Name: ",
      });
      $[63] = U;
    } else U = $[63];
    let onSubmit;
    if (
      $[64] !== l ||
      $[65] !== V ||
      $[66] !== onPick ||
      $[67] !== i ||
      $[68] !== reloadCustomThemes ||
      $[69] !== storageV5 ||
      $[70] !== Re ||
      $[71] !== he
    ) {
      onSubmit = () => {
        if (!he) {
          return;
        }
        Je(V);
        mt(Re);
        je("colors");
        saveCustomTheme(
          {
            slug: V,
            name: Re,
            base: l,
            overrides: i,
            source: "user",
          },
          storageV5,
        )
          .then(() => reloadCustomThemes())
          .then(() => {
            onPick(customThemeRef(V));
          })
          .catch((m_3) => {
            logForDebugging(`[theme] save ${V} failed: ${m_3}`, {
              level: "warn",
            });
          });
      };
      $[64] = l;
      $[65] = V;
      $[66] = onPick;
      $[67] = i;
      $[68] = reloadCustomThemes;
      $[69] = storageV5;
      $[70] = Re;
      $[71] = he;
      $[72] = onSubmit;
    } else onSubmit = $[72];
    let A;
    if ($[73] !== c || $[74] !== Qe || $[75] !== onCancel || $[76] !== onSubmit) {
      A = jsxProd_default_2(Box, {
        children: [
          U,
          jsxProd_default(TextInput, {
            value: c,
            onChange: mt,
            onSubmit,
            onExit: onCancel,
            placeholder: "my-theme",
            columns: 40,
            cursorOffset: Qe,
            onChangeCursorOffset: z,
            disableCursorMovementForUpDownKeys: true,
            disableEscapeDoublePress: true,
            focus: true,
            showCursor: true,
          }),
        ],
      });
      $[73] = c;
      $[74] = Qe;
      $[75] = onCancel;
      $[76] = onSubmit;
      $[77] = A;
    } else A = $[77];
    let Y;
    if ($[78] === MEMO_CACHE_SENTINEL) {
      Y = getThemesDir();
      $[78] = Y;
    } else Y = $[78];
    let x;
    if ($[79] !== l || $[80] !== V) {
      x = jsxProd_default_2(Text, {
        dimColor: true,
        children: ["based on ", l, " \xB7 saved to ", Y, sep, V, ".json"],
      });
      $[79] = l;
      $[80] = V;
      $[81] = x;
    } else x = $[81];
    let _;
    if ($[82] !== A || $[83] !== x) {
      _ = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [A, x],
      });
      $[82] = A;
      $[83] = x;
      $[84] = _;
    } else _ = $[84];
    let de;
    if ($[85] !== h || $[86] !== he) {
      de =
        he &&
        jsxProd_default(KeyboardShortcutHint, {
          chord: "enter",
          action: "continue",
          ...h,
        });
      $[85] = h;
      $[86] = he;
      $[87] = de;
    } else de = $[87];
    let ee;
    if ($[88] !== h) {
      ee = jsxProd_default(KeyboardShortcutHint, {
        chord: "escape",
        action: "cancel",
        ...h,
      });
      $[88] = h;
      $[89] = ee;
    } else ee = $[89];
    let children_2;
    if ($[90] !== de || $[91] !== ee) {
      children_2 = jsxProd_default_2(Byline, {
        children: [de, ee],
      });
      $[90] = de;
      $[91] = ee;
      $[92] = children_2;
    } else children_2 = $[92];
    let ke;
    if ($[93] !== g || $[94] !== children_2) {
      ke = jsxProd_default(Text, {
        dimColor: true,
        italic: g,
        children: children_2,
      });
      $[93] = g;
      $[94] = children_2;
      $[95] = ke;
    } else ke = $[95];
    let Ce;
    if ($[96] !== X || $[97] !== _ || $[98] !== ke) {
      let opened = jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [X, _, ke],
      });
      Ce = jsxProd_default(Pane, {
        color: "permission",
        children: opened,
      });
      $[96] = X;
      $[97] = _;
      $[98] = ke;
      $[99] = Ce;
    } else Ce = $[99];
    return Ce;
  }
  if (u !== null) {
    let X;
    if ($[100] !== T) {
      X = isValidThemeColor(T);
      $[100] = T;
      $[101] = X;
    } else X = $[101];
    let wt = X;
    let U;
    if ($[102] !== g || $[103] !== c) {
      U =
        !g &&
        jsxProd_default(Text, {
          bold: true,
          color: "permission",
          children: c,
        });
      $[102] = g;
      $[103] = c;
      $[104] = U;
    } else U = $[104];
    const value = wt ? T : k[u];
    let A;
    if ($[105] !== value) {
      A = jsxProd_default(ColorSwatch, {
        value,
      });
      $[105] = value;
      $[106] = A;
    } else A = $[106];
    let Y;
    if ($[107] === MEMO_CACHE_SENTINEL) {
      Y = jsxProd_default(Text, {
        children: " ",
      });
      $[107] = Y;
    } else Y = $[107];
    let x;
    if ($[108] !== u) {
      x = jsxProd_default(Text, {
        bold: true,
        children: u,
      });
      $[108] = u;
      $[109] = x;
    } else x = $[109];
    let _;
    if ($[110] !== A || $[111] !== x) {
      _ = jsxProd_default_2(Box, {
        children: [A, Y, x],
      });
      $[110] = A;
      $[111] = x;
      $[112] = _;
    } else _ = $[112];
    const de = k[u];
    let ee;
    if ($[113] !== de) {
      ee = jsxProd_default_2(Text, {
        dimColor: true,
        children: ["preset: ", de],
      });
      $[113] = de;
      $[114] = ee;
    } else ee = $[114];
    let te;
    if ($[115] !== _ || $[116] !== ee) {
      te = jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [_, ee],
      });
      $[115] = _;
      $[116] = ee;
      $[117] = te;
    } else te = $[117];
    let ke;
    if ($[118] === MEMO_CACHE_SENTINEL) {
      ke = jsxProd_default(Text, {
        children: "Value: ",
      });
      $[118] = ke;
    } else ke = $[118];
    let Ce;
    if ($[119] !== E || $[120] !== onSubmit || $[121] !== se || $[122] !== T || $[123] !== onChange) {
      Ce = jsxProd_default_2(Box, {
        children: [
          ke,
          jsxProd_default(TextInput, {
            value: T,
            onChange,
            onSubmit,
            onExit: E,
            placeholder: "rgb(r,g,b) \xB7 #rrggbb \xB7 ansi:red",
            columns: 40,
            cursorOffset: se,
            onChangeCursorOffset: gt,
            disableCursorMovementForUpDownKeys: true,
            disableEscapeDoublePress: true,
            focus: true,
            showCursor: true,
          }),
        ],
      });
      $[119] = E;
      $[120] = onSubmit;
      $[121] = se;
      $[122] = T;
      $[123] = onChange;
      $[124] = Ce;
    } else Ce = $[124];
    let children;
    if ($[125] !== h || $[126] !== wt) {
      children = wt
        ? jsxProd_default_2(Byline, {
            children: [
              jsxProd_default(KeyboardShortcutHint, {
                chord: "enter",
                action: "save",
                ...h,
              }),
              jsxProd_default(KeyboardShortcutHint, {
                chord: "escape",
                action: "cancel",
                ...h,
              }),
            ],
          })
        : "Accepts rgb(r,g,b), #rrggbb, ansi256(n), or ansi:name";
      $[125] = h;
      $[126] = wt;
      $[127] = children;
    } else children = $[127];
    let bt;
    if ($[128] !== g || $[129] !== children) {
      bt = jsxProd_default(Text, {
        dimColor: true,
        italic: g,
        children,
      });
      $[128] = g;
      $[129] = children;
      $[130] = bt;
    } else bt = $[130];
    let Xn;
    if ($[131] !== U || $[132] !== te || $[133] !== Ce || $[134] !== bt) {
      let children = jsxProd_default_2(Box, {
        flexDirection: "column",
        gap: 1,
        children: [U, te, Ce, bt],
      });
      Xn = jsxProd_default(Pane, {
        color: "permission",
        children,
      });
      $[131] = U;
      $[132] = te;
      $[133] = Ce;
      $[134] = bt;
      $[135] = Xn;
    } else Xn = $[135];
    return Xn;
  }
  const title = `${c} \xB7 based on ${l}`;
  let onTab;
  if ($[136] !== ie) {
    onTab = {
      action: "reset",
      handler: (m_5) => {
        if (m_5) ie(m_5);
      },
    };
    $[136] = ie;
    $[137] = onTab;
  } else onTab = $[137];
  let onCancel_2;
  if (
    $[138] !== l ||
    $[139] !== c ||
    $[140] !== onDone ||
    $[141] !== i ||
    $[142] !== setPreviewOverrides ||
    $[143] !== p
  ) {
    onCancel_2 = () => {
      setPreviewOverrides(null);
      onDone({
        slug: p,
        name: c,
        base: l,
        overrides: i,
        source: "user",
      });
    };
    $[138] = l;
    $[139] = c;
    $[140] = onDone;
    $[141] = i;
    $[142] = setPreviewOverrides;
    $[143] = p;
    $[144] = onCancel_2;
  } else onCancel_2 = $[144];
  let matchLabel;
  if ($[145] !== ve || $[146] !== p) {
    matchLabel = ve > 0 ? `${ve} ${plural(ve, "color")} customized \xB7 ${p}.json` : `editing ${p}.json`;
    $[145] = ve;
    $[146] = p;
    $[147] = matchLabel;
  } else matchLabel = $[147];
  let renderItem;
  if ($[148] !== i || $[149] !== f) {
    renderItem = (m_7, isFocused) => {
      let when = i[m_7] !== undefined;
      return jsxProd_default_2(Box, {
        children: [
          jsxProd_default(ColorSwatch, {
            value: f(m_7),
          }),
          jsxProd_default(Text, {
            children: " ",
          }),
          jsxProd_default(Text, {
            color: isFocused ? "suggestion" : undefined,
            children: m_7,
          }),
          jsxProd_default(ParenHint, {
            when,
            children: "custom",
          }),
        ],
      });
    };
    $[148] = i;
    $[149] = f;
    $[150] = renderItem;
  } else renderItem = $[150];
  let renderPreview;
  if ($[151] !== i || $[152] !== k || $[153] !== f) {
    renderPreview = (m_8) =>
      jsxProd_default_2(Box, {
        flexDirection: "column",
        children: [
          jsxProd_default_2(Text, {
            children: [
              "current: ",
              jsxProd_default(ColorSwatch, {
                value: f(m_8),
              }),
              " ",
              f(m_8),
            ],
          }),
          i[m_8] !== undefined &&
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                "preset: ",
                jsxProd_default(ColorSwatch, {
                  value: k[m_8],
                }),
                " ",
                k[m_8],
              ],
            }),
        ],
      });
    $[151] = i;
    $[152] = k;
    $[153] = f;
    $[154] = renderPreview;
  } else renderPreview = $[154];
  let _;
  if (
    $[155] !== items ||
    $[156] !== Z ||
    $[157] !== onSelect ||
    $[158] !== title ||
    $[159] !== onTab ||
    $[160] !== onCancel_2 ||
    $[161] !== matchLabel ||
    $[162] !== renderItem ||
    $[163] !== renderPreview
  ) {
    _ = jsxProd_default(FuzzyPicker, {
      title,
      placeholder: "Filter color tokens\u2026",
      items,
      getKey: identity,
      initialQuery: Z,
      onQueryChange: Jn,
      onSelect,
      onTab,
      onCancel: onCancel_2,
      selectAction: "edit",
      cancelAction: "done",
      matchLabel,
      renderItem,
      renderPreview,
      emptyMessage: noColorNamedText,
    });
    $[155] = items;
    $[156] = Z;
    $[157] = onSelect;
    $[158] = title;
    $[159] = onTab;
    $[160] = onCancel_2;
    $[161] = matchLabel;
    $[162] = renderItem;
    $[163] = renderPreview;
    $[164] = _;
  } else _ = $[164];
  return _;
}
//@ chunk-3s4dbk22.js:23369-23515 sole-consumer
function uniqueSlug(ce, customThemes) {
  let J = slugify(ce);
  if (!customThemes.some((a) => a.slug === J)) return J;
  for (let i = 2; ; i++) {
    let re = `${J}-${i}`;
    if (!customThemes.some((W) => W.slug === re)) return re;
  }
}
//@ chunk-axmbhcjg.js:28422-28530 fingerprint = matchKey (0.685)
function matchKey(e, n) {
  let lines = e.split(`
`);
  let o =
    lines.length > MAX_POSIX_PATH_LENGTH
      ? -1
      : lines.findIndex((line) => looksLikeCredentialIncludingNul(line));
  return o === -1
    ? {}
    : {
        line: n + o + 1,
      };
}
export { GlobalSearchDialog, matchKey };

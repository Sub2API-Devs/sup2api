/**
 * commands/theme/theme.tsx
 *
 * /theme 实现：主题选择与自定义主题
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/theme/theme.tsx
 * pieces: chunk-3s4dbk22.js (2)
 * attribution: fingerprint 1, callgraph-fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { R, y } from "../../../vendor/react/cjs/react.production.js";
import { useTheme, useCustomThemes, useThemeSetting } from "../../components/design-system/ThemeProvider.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { isCustomizationDisabled } from "../../utils/settings/customizationDisabled.js";
import { parseCustomThemeRef, customThemeRef } from "../../utils/customThemes.js";
import { commitTheme } from "./themeWriter.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage } from "../../utils/errors.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { GlobalSearchDialog } from "../../components/GlobalSearchDialog.js";
import { getSafeModeExitHint } from "../../utils/envUtils.js";
import { Pane } from "../../components/design-system/Pane.js";
import { ThemePicker } from "../../components/ThemePicker.js";

//@ chunk-3s4dbk22.js:23515-27511 fingerprint = ThemePickerCommand (0.344)
function ThemePickerCommand(t0) {
  let a = w(50),
    { onDone: onDone } = t0,
    J = R(!1),
    re;
  if (a[0] !== onDone)
    ((re = (W, le) => {
      if (!J.current) ((J.current = !0), onDone(W, le));
    }),
      (a[0] = onDone),
      (a[1] = re));
  else re = a[1];
  let C = re,
    [be, v] = useTheme(),
    { customThemes: customThemes } = useCustomThemes(),
    at;
  if (a[2] === MEMO_CACHE_SENTINEL) ((at = { kind: "picker" }), (a[2] = at));
  else at = a[2];
  let [je, c] = y(at),
    mt;
  if (a[3] === MEMO_CACHE_SENTINEL) ((mt = isCustomizationDisabled("themes")), (a[3] = mt));
  else mt = a[3];
  let Qe = mt,
    z = useThemeSetting(),
    p;
  if (a[4] !== z) ((p = parseCustomThemeRef(z)), (a[4] = z), (a[5] = p));
  else p = a[5];
  let Je = p,
    o = R(void 0),
    ct;
  if (a[6] !== z) ((ct = () => o.current ?? z), (a[6] = z), (a[7] = ct));
  else ct = a[7];
  let l = ct,
    g = R(void 0),
    ue = R(void 0),
    h = R(void 0),
    ut;
  if (a[8] !== l || a[9] !== v) {
    let Xe = (k, ft) => {
      if (J.current) {
        return;
      }
      let i = { withdrawal: new AbortController(), saved: void 0 };
      let Ve = (setting) => {
        if (ue.current === i) ue.current = void 0;
        if (i.saved !== void 0) ((g.current = void 0), ft({ kind: "saved", saved: i.saved }));
        else if (!i.withdrawal.signal.aborted) ft({ kind: "refused", reason: setting });
      };
      let Z = commitTheme(
        k,
        {
          themeSetting: l(),
          setTheme: (fe) => {
            ((i.saved = fe), (o.current = fe), v(fe));
          },
        },
        i.withdrawal.signal,
      );
      if (!(Z instanceof Promise)) {
        Ve(Z?.error?.message);
        return;
      }
      return (
        (ue.current = i),
        Z.then(
          (Jn) => Ve(Jn?.error?.message),
          (u) => {
            (logForDebugging(`/theme: config.set failed: ${errorMessage(u)}`, { level: "error" }),
              Ve(errorMessage(u)));
          },
        )
      );
    };
    ut = (T, vt) => {
      let se = h.current === void 0 ? Xe(T, vt) : h.current.then(() => Xe(T, vt));
      if (se !== void 0) {
        h.current = se;
        let gt = () => {
          if (h.current === se) h.current = void 0;
        };
        se.then(gt, gt);
      }
      return se;
    };
    ((a[8] = l), (a[9] = v), (a[10] = ut));
  } else ut = a[10];
  let D = ut,
    pt;
  if (a[11] === MEMO_CACHE_SENTINEL)
    ((pt = () => (ue.current?.withdrawal.abort(), ue.current?.saved)), (a[11] = pt));
  else pt = a[11];
  let Xt = pt,
    ze;
  if (a[12] !== C)
    ((ze = (zt, V) => C(`${zt}${V ? `: ${V}` : ""}`, { display: "system" })), (a[12] = C), (a[13] = ze));
  else ze = a[13];
  let N = ze,
    ve;
  if (a[14] !== customThemes || a[15] !== C)
    ((ve = (Se) =>
      C(
        parseCustomThemeRef(Se)
          ? `Using custom theme "${customThemes.find((Kt) => customThemeRef(Kt.slug) === Se)?.name ?? Se}"`
          : `Theme set to ${Se}`,
      )),
      (a[14] = customThemes),
      (a[15] = C),
      (a[16] = ve));
  else ve = a[16];
  let b = ve,
    ht = R(!1);
  if (je.kind === "editor") {
    let f;
    if (a[17] !== D || a[18] !== C || a[19] !== l || a[20] !== b || a[21] !== N)
      ((f = (Ke) => {
        let ge = customThemeRef(Ke.slug);
        let $e = `Saved custom theme "${Ke.name}", not in use`;
        let K = (Yt) => (Yt === ge ? C(`Using custom theme "${Ke.name}"`) : b(Yt));
        if (ht.current) {
          let kt = Xt();
          if (kt === void 0) N($e, void 0);
          else K(kt);
          return;
        }
        ht.current = !0;
        let Ct = () => {
          if (g.current?.ref === ge) {
            N($e, g.current.reason);
            return;
          }
          if (ge === l()) {
            K(ge);
            return;
          }
          return D(ge, (Ye) => {
            switch (Ye.kind) {
              case "refused": {
                N($e, Ye.reason);
                return;
              }
              case "saved": {
                K(Ye.saved);
                return;
              }
            }
          });
        };
        h.current === void 0 ? Ct() : h.current.then(Ct);
      }),
        (a[17] = D),
        (a[18] = C),
        (a[19] = l),
        (a[20] = b),
        (a[21] = N),
        (a[22] = f));
    else f = a[22];
    let F;
    if (a[23] !== D)
      ((F = (yt) =>
        D(yt, (Oe) => {
          if (Oe.kind === "refused") g.current = { ref: yt, reason: Oe.reason };
        })),
        (a[23] = D),
        (a[24] = F));
    else F = a[24];
    let H;
    if (a[25] === MEMO_CACHE_SENTINEL) ((H = () => c({ kind: "picker" })), (a[25] = H));
    else H = a[25];
    let E;
    if (a[26] !== be || a[27] !== je.initial || a[28] !== f || a[29] !== F)
      ((E = e(GlobalSearchDialog, {
        initial: je.initial,
        defaultBase: be,
        onDone: f,
        onPick: F,
        onCancel: H,
      })),
        (a[26] = be),
        (a[27] = je.initial),
        (a[28] = f),
        (a[29] = F),
        (a[30] = E));
    else E = a[30];
    return E;
  }
  let f;
  if (a[31] !== D || a[32] !== b || a[33] !== N)
    ((f = (Gt) =>
      D(Gt, (Ge) => {
        switch (Ge.kind) {
          case "refused": {
            N("Couldn't save Theme", Ge.reason);
            return;
          }
          case "saved": {
            b(Ge.saved);
            return;
          }
        }
      })),
      (a[31] = D),
      (a[32] = b),
      (a[33] = N),
      (a[34] = f));
  else f = a[34];
  let F;
  if (a[35] !== D || a[36] !== b || a[37] !== N || a[38] !== z)
    ((F = Qe
      ? void 0
      : (ie) => {
          let Ae = ie && customThemeRef(ie.slug);
          if (Ae === void 0 || Ae === z) {
            c({ kind: "editor", initial: ie });
            return;
          }
          return D(Ae, (pe) => {
            switch (pe.kind) {
              case "refused": {
                N("Couldn't save Theme", pe.reason);
                return;
              }
              case "saved": {
                if (pe.saved === Ae) c({ kind: "editor", initial: ie });
                else b(pe.saved);
                return;
              }
            }
          });
        }),
      (a[35] = D),
      (a[36] = b),
      (a[37] = N),
      (a[38] = z),
      (a[39] = F));
  else F = a[39];
  let H;
  if (a[40] !== Je)
    ((H = Qe
      ? `Custom themes are disabled in safe mode \u2014 ${getSafeModeExitHint()} to create or edit them${Je ? `. Your saved theme "${Je}" is a custom theme; selecting a preset here replaces it` : ""}`
      : ""),
      (a[40] = Je),
      (a[41] = H));
  else H = a[41];
  let E;
  if (a[42] !== C || a[43] !== b)
    ((E = () => {
      let xe = Xt();
      if (xe === void 0) C("Theme picker dismissed", { display: "system" });
      else b(xe);
    }),
      (a[42] = C),
      (a[43] = b),
      (a[44] = E));
  else E = a[44];
  let Tt;
  if (a[45] !== f || a[46] !== F || a[47] !== H || a[48] !== E)
    ((Tt = e(Pane, {
      color: "permission",
      children: e(ThemePicker, {
        onThemeSelect: f,
        onCustomTheme: F,
        helpText: H,
        onCancel: E,
        skipExitHandling: !0,
      }),
    })),
      (a[45] = f),
      (a[46] = F),
      (a[47] = H),
      (a[48] = E),
      (a[49] = Tt));
  else Tt = a[49];
  return Tt;
}
/**
 * /theme 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
//@ chunk-3s4dbk22.js:27511-27549 callgraph-fingerprint = call (1)
var call = async (onDone, context) => e(ThemePickerCommand, { onDone: onDone });

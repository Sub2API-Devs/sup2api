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
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { GlobalSearchDialog } from "../../components/GlobalSearchDialog.js";
import { getSafeModeExitHint } from "../../utils/envUtils.js";
import { Pane } from "../../components/design-system/Pane.js";
import { ThemePicker } from "../../components/ThemePicker.js";

//@ chunk-3s4dbk22.js:23515-27511 fingerprint = ThemePickerCommand (0.344)
function ThemePickerCommand(props) {
  let a = w(50);
  let { onDone } = props;
  let J = R(false);
  let re;
  if (a[0] !== onDone) {
    re = (W, le) => {
      if (!J.current) {
        J.current = true;
        onDone(W, le);
      }
    };
    a[0] = onDone;
    a[1] = re;
  } else re = a[1];
  let C = re;
  let [be, v] = useTheme();
  let { customThemes } = useCustomThemes();
  let at;
  if (a[2] === MEMO_CACHE_SENTINEL) {
    at = {
      kind: "picker",
    };
    a[2] = at;
  } else at = a[2];
  let [je, c] = y(at);
  let mt;
  if (a[3] === MEMO_CACHE_SENTINEL) {
    mt = isCustomizationDisabled("themes");
    a[3] = mt;
  } else mt = a[3];
  let Qe = mt;
  let themeSetting = useThemeSetting();
  let p;
  if (a[4] !== themeSetting) {
    p = parseCustomThemeRef(themeSetting);
    a[4] = themeSetting;
    a[5] = p;
  } else p = a[5];
  let Je = p;
  let o = R(undefined);
  let ct;
  if (a[6] !== themeSetting) {
    ct = () => o.current ?? themeSetting;
    a[6] = themeSetting;
    a[7] = ct;
  } else ct = a[7];
  let l = ct;
  let g = R(undefined);
  let ue = R(undefined);
  let h = R(undefined);
  let ut;
  if (a[8] !== l || a[9] !== v) {
    let Xe = (k, ft) => {
      if (J.current) {
        return;
      }
      let i = {
        withdrawal: new AbortController(),
        saved: undefined,
      };
      let Ve = (setting) => {
        if (ue.current === i) ue.current = undefined;
        if (i.saved !== undefined) {
          g.current = undefined;
          ft({
            kind: "saved",
            saved: i.saved,
          });
        } else if (!i.withdrawal.signal.aborted)
          ft({
            kind: "refused",
            reason: setting,
          });
      };
      let Z = commitTheme(
        k,
        {
          themeSetting: l(),
          setTheme: (fe) => {
            i.saved = fe;
            o.current = fe;
            v(fe);
          },
        },
        i.withdrawal.signal,
      );
      if (!(Z instanceof Promise)) {
        Ve(Z?.error?.message);
        return;
      }
      ue.current = i;
      return Z.then(
        (Jn) => Ve(Jn?.error?.message),
        (error) => {
          logForDebugging(`/theme: config.set failed: ${errorMessage(error)}`, {
            level: "error",
          });
          Ve(errorMessage(error));
        },
      );
    };
    ut = (T, vt) => {
      let se = h.current === undefined ? Xe(T, vt) : h.current.then(() => Xe(T, vt));
      if (se !== undefined) {
        h.current = se;
        let gt = () => {
          if (h.current === se) h.current = undefined;
        };
        se.then(gt, gt);
      }
      return se;
    };
    a[8] = l;
    a[9] = v;
    a[10] = ut;
  } else ut = a[10];
  let D = ut;
  let pt;
  if (a[11] === MEMO_CACHE_SENTINEL) {
    pt = () => {
      ue.current?.withdrawal.abort();
      return ue.current?.saved;
    };
    a[11] = pt;
  } else pt = a[11];
  let Xt = pt;
  let ze;
  if (a[12] !== C) {
    ze = (zt, V) =>
      C(`${zt}${V ? `: ${V}` : ""}`, {
        display: "system",
      });
    a[12] = C;
    a[13] = ze;
  } else ze = a[13];
  let N = ze;
  let ve;
  if (a[14] !== customThemes || a[15] !== C) {
    ve = (Se) =>
      C(
        parseCustomThemeRef(Se)
          ? `Using custom theme "${customThemes.find((customTheme) => customThemeRef(customTheme.slug) === Se)?.name ?? Se}"`
          : `Theme set to ${Se}`,
      );
    a[14] = customThemes;
    a[15] = C;
    a[16] = ve;
  } else ve = a[16];
  let b = ve;
  let ht = R(false);
  if (je.kind === "editor") {
    let onDone;
    if (a[17] !== D || a[18] !== C || a[19] !== l || a[20] !== b || a[21] !== N) {
      onDone = (Ke) => {
        let ge = customThemeRef(Ke.slug);
        let $e = `Saved custom theme "${Ke.name}", not in use`;
        let K = (Yt) => (Yt === ge ? C(`Using custom theme "${Ke.name}"`) : b(Yt));
        if (ht.current) {
          let kt = Xt();
          if (kt === undefined) N($e, undefined);
          else K(kt);
          return;
        }
        ht.current = true;
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
        if (h.current === undefined) Ct();
        else h.current.then(Ct);
      };
      a[17] = D;
      a[18] = C;
      a[19] = l;
      a[20] = b;
      a[21] = N;
      a[22] = onDone;
    } else onDone = a[22];
    let onPick;
    if (a[23] !== D) {
      onPick = (yt) =>
        D(yt, (Oe) => {
          if (Oe.kind === "refused")
            g.current = {
              ref: yt,
              reason: Oe.reason,
            };
        });
      a[23] = D;
      a[24] = onPick;
    } else onPick = a[24];
    let onCancel;
    if (a[25] === MEMO_CACHE_SENTINEL) {
      onCancel = () =>
        c({
          kind: "picker",
        });
      a[25] = onCancel;
    } else onCancel = a[25];
    let E;
    if (a[26] !== be || a[27] !== je.initial || a[28] !== onDone || a[29] !== onPick) {
      E = jsxProd_default(GlobalSearchDialog, {
        initial: je.initial,
        defaultBase: be,
        onDone,
        onPick,
        onCancel,
      });
      a[26] = be;
      a[27] = je.initial;
      a[28] = onDone;
      a[29] = onPick;
      a[30] = E;
    } else E = a[30];
    return E;
  }
  let onThemeSelect;
  if (a[31] !== D || a[32] !== b || a[33] !== N) {
    onThemeSelect = (Gt) =>
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
      });
    a[31] = D;
    a[32] = b;
    a[33] = N;
    a[34] = onThemeSelect;
  } else onThemeSelect = a[34];
  let onCustomTheme;
  if (a[35] !== D || a[36] !== b || a[37] !== N || a[38] !== themeSetting) {
    onCustomTheme = Qe
      ? undefined
      : (ie) => {
          let Ae = ie && customThemeRef(ie.slug);
          if (Ae === undefined || Ae === themeSetting) {
            c({
              kind: "editor",
              initial: ie,
            });
            return;
          }
          return D(Ae, (pe) => {
            switch (pe.kind) {
              case "refused": {
                N("Couldn't save Theme", pe.reason);
                return;
              }
              case "saved": {
                if (pe.saved === Ae)
                  c({
                    kind: "editor",
                    initial: ie,
                  });
                else b(pe.saved);
                return;
              }
            }
          });
        };
    a[35] = D;
    a[36] = b;
    a[37] = N;
    a[38] = themeSetting;
    a[39] = onCustomTheme;
  } else onCustomTheme = a[39];
  let helpText;
  if (a[40] !== Je) {
    helpText = Qe
      ? `Custom themes are disabled in safe mode \u2014 ${getSafeModeExitHint()} to create or edit them${Je ? `. Your saved theme "${Je}" is a custom theme; selecting a preset here replaces it` : ""}`
      : "";
    a[40] = Je;
    a[41] = helpText;
  } else helpText = a[41];
  let onCancel;
  if (a[42] !== C || a[43] !== b) {
    onCancel = () => {
      let xe = Xt();
      if (xe === undefined)
        C("Theme picker dismissed", {
          display: "system",
        });
      else b(xe);
    };
    a[42] = C;
    a[43] = b;
    a[44] = onCancel;
  } else onCancel = a[44];
  let Tt;
  if (a[45] !== onThemeSelect || a[46] !== onCustomTheme || a[47] !== helpText || a[48] !== onCancel) {
    Tt = jsxProd_default(Pane, {
      color: "permission",
      children: jsxProd_default(ThemePicker, {
        onThemeSelect,
        onCustomTheme,
        helpText,
        onCancel,
        skipExitHandling: true,
      }),
    });
    a[45] = onThemeSelect;
    a[46] = onCustomTheme;
    a[47] = helpText;
    a[48] = onCancel;
    a[49] = Tt;
  } else Tt = a[49];
  return Tt;
}
//@ chunk-3s4dbk22.js:27511-27549 callgraph-fingerprint = call (1)
/**
 * /theme 的 local-jsx call(onDone, context, args, invokedName) 实现入口（由命令对象 load() 返回）。
 */
var call = async (onDone, context) =>
  jsxProd_default(ThemePickerCommand, {
    onDone,
  });

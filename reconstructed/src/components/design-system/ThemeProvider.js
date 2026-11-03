/**
 * components/design-system/ThemeProvider.tsx
 *
 * 主题 Provider：themeSetting（含 auto 跟随系统）、预览主题、自定义/插件主题与覆盖色，提供 useTheme/useThemeSetting/usePreviewTheme。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/design-system/ThemeProvider.tsx
 * pieces: chunk-v9w831vx.js (16)
 * attribution: placement 15, fingerprint 1
 */
import { init_react_production, Se, qt, y, yt, P } from "../../../vendor/react/cjs/react.production.js";
import { StdinContextAlias } from "../../ink/terminalModes.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { getTheme, mergeThemeOverrides } from "../../utils/theme.js";
import { resolveSetting, saveUserIntentSetting } from "../../utils/settings/userIntentSettings.js";
import {
  getCachedCustomThemes,
  getCustomThemeRegistry,
  loadCustomThemes,
  watchCustomThemes,
  parseCustomThemeRef,
} from "../../utils/customThemes.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getSystemThemeName, onSystemThemeChange } from "../../utils/systemTheme.js";

//@ chunk-v9w831vx.js:557-561 placement
init_react_production();
//@ chunk-v9w831vx.js:561-565 placement
init_react_production();
//@ chunk-v9w831vx.js:565-590 placement
var useStdin_2 = () => Se(StdinContextAlias);
var useStdin = useStdin_2;
//@ chunk-v9w831vx.js:590-594 placement
init_react_production();
//@ chunk-v9w831vx.js:594-626 placement
var M = Object.freeze({});
var THEME_CONTEXT = qt(M);
//@ chunk-v9w831vx.js:626-917 placement
function StorageCredentialsProvider(props) {
  let a = w(6);
  let { storageV5, credentials, children } = props;
  let t;
  if (a[0] !== credentials || a[1] !== storageV5) {
    t =
      storageV5 === undefined && credentials === undefined
        ? M
        : {
            storageV5,
            credentials,
          };
    a[0] = credentials;
    a[1] = storageV5;
    a[2] = t;
  } else t = a[2];
  let value = t;
  let q;
  if (a[3] !== children || a[4] !== value) {
    q = jsxProd_default(THEME_CONTEXT.Provider, {
      value,
      children,
    });
    a[3] = children;
    a[4] = value;
    a[5] = q;
  } else q = a[5];
  return q;
}
//@ chunk-v9w831vx.js:917-944 placement
/**
 * 读主题 context 的 hook（useTheme），全站 160 多处使用。
 */
function useTheme_2() {
  return Se(THEME_CONTEXT);
}
//@ chunk-v9w831vx.js:944-1219 fingerprint = ThemeContext (0.572)
var DARK = "dark";
var ThemeContext = qt({
  themeSetting: DARK,
  setThemeSetting: () => {},
  setPreviewTheme: () => {},
  cancelPreview: () => {},
  currentTheme: DARK,
  resolvedTheme: getTheme(DARK),
  activeThemeOverrides: undefined,
  customThemes: [],
  activeCustomTheme: undefined,
  reloadCustomThemes: () => Promise.resolve(),
  setPreviewOverrides: () => {},
});
//@ chunk-v9w831vx.js:1219-1266 placement
function getConfiguredTheme() {
  return resolveSetting("theme", "dark").value;
}
//@ chunk-v9w831vx.js:1266-3554 placement = ThemeProvider (0.633)
/**
 * 主题 Provider：从全局配置读 theme（默认 dark），auto 时跟随系统明暗；支持临时预览（setPreviewTheme/cancelPreview）、自定义主题（用户 + 插件）与覆盖色；保存时写入 theme 设置。
 */
function ThemeProvider(props) {
  let $ = w(46);
  let { children, initialState, onThemeSave } = props;
  let { storageV5 } = useTheme_2();
  let C;
  if ($[0] !== onThemeSave || $[1] !== storageV5) {
    C = (q) => (onThemeSave ? onThemeSave(q) : saveUserIntentSetting("theme", q, storageV5));
    $[0] = onThemeSave;
    $[1] = storageV5;
    $[2] = C;
  } else C = $[2];
  let I = C;
  let [T, rt] = y(initialState ?? getConfiguredTheme);
  let [it, J] = y(null);
  let [nt, st] = y(null);
  let [K, mt] = y(getCachedCustomThemes);
  let ve;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    ve = getCustomThemeRegistry();
    $[3] = ve;
  } else ve = $[3];
  let pluginThemes = ve.pluginThemes;
  let W = yt(pluginThemes.subscribe, pluginThemes.getState);
  let de;
  if ($[4] !== W || $[5] !== K) {
    de = [...K, ...W];
    $[4] = W;
    $[5] = K;
    $[6] = de;
  } else de = $[6];
  let u = de;
  let ge;
  if ($[7] !== initialState || $[8] !== T) {
    ge = () => ((initialState ?? T) === "auto" ? getSystemThemeName() : "dark");
    $[7] = initialState;
    $[8] = T;
    $[9] = ge;
  } else ge = $[9];
  let [ot, O] = y(ge);
  let m = it ?? T;
  let pe;
  if ($[10] !== storageV5) {
    pe = () => loadCustomThemes(storageV5).then(mt);
    $[10] = storageV5;
    $[11] = pe;
  } else pe = $[11];
  let h = pe;
  let fe;
  let Pe;
  if ($[12] !== h) {
    fe = () => {
      h();
      return watchCustomThemes(() => void h());
    };
    Pe = [h];
    $[12] = h;
    $[13] = fe;
    $[14] = Pe;
  } else {
    fe = $[13];
    Pe = $[14];
  }
  P(fe, Pe);
  let { internal_querier } = useStdin();
  let we;
  let Ce;
  if ($[15] !== m) {
    we = () => {
      if (m !== "auto") {
        return;
      }
      O(getSystemThemeName());
      return onSystemThemeChange(() => O(getSystemThemeName()));
    };
    Ce = [m];
    $[15] = m;
    $[16] = we;
    $[17] = Ce;
  } else {
    we = $[16];
    Ce = $[17];
  }
  P(we, Ce);
  let ye;
  let Oe;
  if ($[18] !== m || $[19] !== internal_querier) {
    ye = () => {
      if (m !== "auto" || !internal_querier) {
        return;
      }
      let cleanup;
      let cancelled = false;
      import("./chunk-xfhnxaa2.js").then((H) => {
        let { watchSystemTheme } = H;
        if (cancelled) {
          return;
        }
        cleanup = watchSystemTheme(internal_querier, O);
      });
      return () => {
        cancelled = true;
        cleanup?.();
      };
    };
    Oe = [m, internal_querier];
    $[18] = m;
    $[19] = internal_querier;
    $[20] = ye;
    $[21] = Oe;
  } else {
    ye = $[20];
    Oe = $[21];
  }
  P(ye, Oe);
  let H;
  if ($[22] !== m) {
    H = parseCustomThemeRef(m);
    $[22] = m;
    $[23] = H;
  } else H = $[23];
  let R = H;
  let ke;
  if ($[24] !== R || $[25] !== u) {
    ke = R ? u.find((ht) => ht.slug === R) : undefined;
    $[24] = R;
    $[25] = u;
    $[26] = ke;
  } else ke = $[26];
  let v = ke;
  let currentTheme = v ? v.base : m === "auto" ? ot : R ? "dark" : m;
  let d = nt ?? v?.overrides;
  let xe;
  if ($[27] !== d || $[28] !== currentTheme) {
    xe = mergeThemeOverrides(getTheme(currentTheme), d);
    $[27] = d;
    $[28] = currentTheme;
    $[29] = xe;
  } else xe = $[29];
  let resolvedTheme = xe;
  let _e;
  if ($[30] === MEMO_CACHE_SENTINEL) {
    _e = () => J(null);
    $[30] = _e;
  } else _e = $[30];
  let cancelPreview = _e;
  let setThemeSetting;
  if ($[31] !== I) {
    setThemeSetting = (newSetting) => {
      rt(newSetting);
      J(null);
      if (newSetting === "auto") O(getSystemThemeName());
      I(newSetting);
    };
    $[31] = I;
    $[32] = setThemeSetting;
  } else setThemeSetting = $[32];
  let setPreviewTheme;
  if ($[33] === MEMO_CACHE_SENTINEL) {
    setPreviewTheme = (newSetting_0) => {
      J(newSetting_0);
      if (newSetting_0 === "auto") O(getSystemThemeName());
    };
    $[33] = setPreviewTheme;
  } else setPreviewTheme = $[33];
  let qe;
  if (
    $[34] !== v ||
    $[35] !== d ||
    $[36] !== currentTheme ||
    $[37] !== u ||
    $[38] !== h ||
    $[39] !== resolvedTheme ||
    $[40] !== setThemeSetting ||
    $[41] !== T
  ) {
    qe = {
      themeSetting: T,
      setThemeSetting,
      setPreviewTheme,
      cancelPreview,
      currentTheme,
      resolvedTheme,
      activeThemeOverrides: d,
      customThemes: u,
      activeCustomTheme: v,
      reloadCustomThemes: h,
      setPreviewOverrides: st,
    };
    $[34] = v;
    $[35] = d;
    $[36] = currentTheme;
    $[37] = u;
    $[38] = h;
    $[39] = resolvedTheme;
    $[40] = setThemeSetting;
    $[41] = T;
    $[42] = qe;
  } else qe = $[42];
  let value = qe;
  let He;
  if ($[43] !== children || $[44] !== value) {
    He = jsxProd_default(ThemeContext.Provider, {
      value,
      children,
    });
    $[43] = children;
    $[44] = value;
    $[45] = He;
  } else He = $[45];
  return He;
}
//@ chunk-v9w831vx.js:3554-3694 placement = useTheme (1)
/**
 * 返回 [currentTheme, setThemeSetting]（被 44 处使用）。
 */
function useTheme() {
  let $ = w(3);
  let { currentTheme, setThemeSetting } = Se(ThemeContext);
  let t0;
  if ($[0] !== currentTheme || $[1] !== setThemeSetting) {
    t0 = [currentTheme, setThemeSetting];
    $[0] = currentTheme;
    $[1] = setThemeSetting;
    $[2] = t0;
  } else t0 = $[2];
  return t0;
}
//@ chunk-v9w831vx.js:3694-3735 placement = useThemeSetting (1)
function useThemeSetting() {
  return Se(ThemeContext).themeSetting;
}
//@ chunk-v9w831vx.js:3735-3907 placement = usePreviewTheme (1)
function usePreviewTheme() {
  let $ = w(3);
  let { setPreviewTheme, cancelPreview } = Se(ThemeContext);
  let t0;
  if ($[0] !== cancelPreview || $[1] !== setPreviewTheme) {
    t0 = {
      setPreviewTheme,
      cancelPreview,
    };
    $[0] = cancelPreview;
    $[1] = setPreviewTheme;
    $[2] = t0;
  } else t0 = $[2];
  return t0;
}
//@ chunk-v9w831vx.js:3907-3948 placement
function useResolvedTheme() {
  return Se(ThemeContext).resolvedTheme;
}
//@ chunk-v9w831vx.js:3948-3997 placement
function useActiveThemeOverrides() {
  return Se(ThemeContext).activeThemeOverrides;
}
//@ chunk-v9w831vx.js:3997-4291 placement
function useCustomThemes() {
  let a = w(5);
  let { customThemes, activeCustomTheme, reloadCustomThemes, setPreviewOverrides } = Se(ThemeContext);
  let t;
  if (
    a[0] !== activeCustomTheme ||
    a[1] !== customThemes ||
    a[2] !== reloadCustomThemes ||
    a[3] !== setPreviewOverrides
  ) {
    t = {
      customThemes,
      activeCustomTheme,
      reloadCustomThemes,
      setPreviewOverrides,
    };
    a[0] = activeCustomTheme;
    a[1] = customThemes;
    a[2] = reloadCustomThemes;
    a[3] = setPreviewOverrides;
    a[4] = t;
  } else t = a[4];
  return t;
}
export {
  useTheme_2,
  useTheme,
  useActiveThemeOverrides,
  useStdin,
  useResolvedTheme,
  useThemeSetting,
  useCustomThemes,
  usePreviewTheme,
  getConfiguredTheme,
  ThemeProvider,
  StorageCredentialsProvider,
};

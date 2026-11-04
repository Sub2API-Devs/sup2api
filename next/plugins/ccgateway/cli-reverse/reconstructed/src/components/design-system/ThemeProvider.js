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
import {
  init_react_production,
  useContext,
  createContext,
  useState,
  useSyncExternalStore,
  useEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { StdinContextAlias } from "../../ink/terminalModes.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-v9w831vx.js:557-561 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-v9w831vx.js:557", () => {
  init_react_production();
});
//@ chunk-v9w831vx.js:561-565 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-v9w831vx.js:561", () => {
  init_react_production();
});
//@ chunk-v9w831vx.js:565-590 placement
var useStdin_2 = () => useContext(StdinContextAlias);
var useStdin = useStdin_2;
//@ chunk-v9w831vx.js:590-594 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-v9w831vx.js:590", () => {
  init_react_production();
});
//@ chunk-v9w831vx.js:594-626 placement
var EMPTY_THEME; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var THEME_CONTEXT;
deferInit("chunk-v9w831vx.js:594", () => {
  EMPTY_THEME = Object.freeze({});
  THEME_CONTEXT = createContext(EMPTY_THEME);
});
//@ chunk-v9w831vx.js:626-917 placement
function StorageCredentialsProvider(props) {
  let $ = useMemoCache(6);
  let { storageV5, credentials, children } = props;
  let value;
  if ($[0] !== credentials || $[1] !== storageV5) {
    value =
      storageV5 === undefined && credentials === undefined
        ? EMPTY_THEME
        : {
            storageV5,
            credentials,
          };
    $[0] = credentials;
    $[1] = storageV5;
    $[2] = value;
  } else value = $[2];
  let value_2 = value;
  let provider;
  if ($[3] !== children || $[4] !== value_2) {
    provider = jsxProd_default(THEME_CONTEXT.Provider, {
      value: value_2,
      children,
    });
    $[3] = children;
    $[4] = value_2;
    $[5] = provider;
  } else provider = $[5];
  return provider;
}
//@ chunk-v9w831vx.js:917-944 placement
/**
 * 读主题 context 的 hook（useTheme），全站 160 多处使用。
 */
function useTheme_2() {
  return useContext(THEME_CONTEXT);
}
//@ chunk-v9w831vx.js:944-1219 fingerprint (2.1.88 match: ThemeContext, 0.572)
var DARK; // deferred: uses getTheme (../../utils/theme.js) of its import cycle while loading; runs once the cycle is complete
var ThemeContext;
deferInit("chunk-v9w831vx.js:944", () => {
  DARK = "dark";
  ThemeContext = createContext({
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
});
//@ chunk-v9w831vx.js:1219-1266 placement
function getConfiguredTheme() {
  return resolveSetting("theme", "dark").value;
}
//@ chunk-v9w831vx.js:1266-3554 placement (2.1.88 match: ThemeProvider, 0.633)
/**
 * 主题 Provider：从全局配置读 theme（默认 dark），auto 时跟随系统明暗；支持临时预览（setPreviewTheme/cancelPreview）、自定义主题（用户 + 插件）与覆盖色；保存时写入 theme 设置。
 */
function ThemeProvider(props) {
  let $ = useMemoCache(46);
  let { children, initialState, onThemeSave } = props;
  let { storageV5 } = useTheme_2();
  let saveThemeSetting;
  if ($[0] !== onThemeSave || $[1] !== storageV5) {
    saveThemeSetting = (nextValue) =>
      onThemeSave ? onThemeSave(nextValue) : saveUserIntentSetting("theme", nextValue, storageV5);
    $[0] = onThemeSave;
    $[1] = storageV5;
    $[2] = saveThemeSetting;
  } else saveThemeSetting = $[2];
  let persistTheme = saveThemeSetting;
  let [themeSetting, setThemeSettingState] = useState(initialState ?? getConfiguredTheme);
  let [previewSetting, setPreviewSetting] = useState(null);
  let [previewOverrides, setPreviewOverrides] = useState(null);
  let [storedCustomThemes, setStoredCustomThemes] = useState(getCachedCustomThemes);
  let customThemeRegistry;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    customThemeRegistry = getCustomThemeRegistry();
    $[3] = customThemeRegistry;
  } else customThemeRegistry = $[3];
  let pluginThemes = customThemeRegistry.pluginThemes;
  let pluginThemesState = useSyncExternalStore(pluginThemes.subscribe, pluginThemes.getState);
  let customThemesCached;
  if ($[4] !== pluginThemesState || $[5] !== storedCustomThemes) {
    customThemesCached = [...storedCustomThemes, ...pluginThemesState];
    $[4] = pluginThemesState;
    $[5] = storedCustomThemes;
    $[6] = customThemesCached;
  } else customThemesCached = $[6];
  let customThemes = customThemesCached;
  let initialSystemTheme;
  if ($[7] !== initialState || $[8] !== themeSetting) {
    initialSystemTheme = () => ((initialState ?? themeSetting) === "auto" ? getSystemThemeName() : "dark");
    $[7] = initialState;
    $[8] = themeSetting;
    $[9] = initialSystemTheme;
  } else initialSystemTheme = $[9];
  let [systemTheme, setSystemTheme] = useState(initialSystemTheme);
  let effectiveSetting = previewSetting ?? themeSetting;
  let reloadCustomThemesCached;
  if ($[10] !== storageV5) {
    reloadCustomThemesCached = () => loadCustomThemes(storageV5).then(setStoredCustomThemes);
    $[10] = storageV5;
    $[11] = reloadCustomThemesCached;
  } else reloadCustomThemesCached = $[11];
  let reloadCustomThemes = reloadCustomThemesCached;
  let watchThemesEffect;
  let watchThemesDeps;
  if ($[12] !== reloadCustomThemes) {
    watchThemesEffect = () => {
      reloadCustomThemes();
      return watchCustomThemes(() => void reloadCustomThemes());
    };
    watchThemesDeps = [reloadCustomThemes];
    $[12] = reloadCustomThemes;
    $[13] = watchThemesEffect;
    $[14] = watchThemesDeps;
  } else {
    watchThemesEffect = $[13];
    watchThemesDeps = $[14];
  }
  useEffect(watchThemesEffect, watchThemesDeps);
  let { internal_querier } = useStdin();
  let systemThemeEffect;
  let systemThemeDeps;
  if ($[15] !== effectiveSetting) {
    systemThemeEffect = () => {
      if (effectiveSetting !== "auto") {
        return;
      }
      setSystemTheme(getSystemThemeName());
      return onSystemThemeChange(() => setSystemTheme(getSystemThemeName()));
    };
    systemThemeDeps = [effectiveSetting];
    $[15] = effectiveSetting;
    $[16] = systemThemeEffect;
    $[17] = systemThemeDeps;
  } else {
    systemThemeEffect = $[16];
    systemThemeDeps = $[17];
  }
  useEffect(systemThemeEffect, systemThemeDeps);
  let watcherEffect;
  let watcherDeps;
  if ($[18] !== effectiveSetting || $[19] !== internal_querier) {
    watcherEffect = () => {
      if (effectiveSetting !== "auto" || !internal_querier) {
        return;
      }
      let cleanup;
      let cancelled = false;
      import("../../utils/systemThemeQuery.js").then((themeWatcherModule) => {
        let { watchSystemTheme } = themeWatcherModule;
        if (cancelled) {
          return;
        }
        cleanup = watchSystemTheme(internal_querier, setSystemTheme);
      });
      return () => {
        cancelled = true;
        cleanup?.();
      };
    };
    watcherDeps = [effectiveSetting, internal_querier];
    $[18] = effectiveSetting;
    $[19] = internal_querier;
    $[20] = watcherEffect;
    $[21] = watcherDeps;
  } else {
    watcherEffect = $[20];
    watcherDeps = $[21];
  }
  useEffect(watcherEffect, watcherDeps);
  let customSlugCached;
  if ($[22] !== effectiveSetting) {
    customSlugCached = parseCustomThemeRef(effectiveSetting);
    $[22] = effectiveSetting;
    $[23] = customSlugCached;
  } else customSlugCached = $[23];
  let customSlug = customSlugCached;
  let activeCustomThemeCached;
  if ($[24] !== customSlug || $[25] !== customThemes) {
    activeCustomThemeCached = customSlug
      ? customThemes.find((candidate) => candidate.slug === customSlug)
      : undefined;
    $[24] = customSlug;
    $[25] = customThemes;
    $[26] = activeCustomThemeCached;
  } else activeCustomThemeCached = $[26];
  let activeCustomTheme = activeCustomThemeCached;
  let currentTheme = activeCustomTheme
    ? activeCustomTheme.base
    : effectiveSetting === "auto"
      ? systemTheme
      : customSlug
        ? "dark"
        : effectiveSetting;
  let activeThemeOverrides = previewOverrides ?? activeCustomTheme?.overrides;
  let resolvedThemeCached;
  if ($[27] !== activeThemeOverrides || $[28] !== currentTheme) {
    resolvedThemeCached = mergeThemeOverrides(getTheme(currentTheme), activeThemeOverrides);
    $[27] = activeThemeOverrides;
    $[28] = currentTheme;
    $[29] = resolvedThemeCached;
  } else resolvedThemeCached = $[29];
  let resolvedTheme = resolvedThemeCached;
  let cancelPreview;
  if ($[30] === MEMO_CACHE_SENTINEL) {
    cancelPreview = () => setPreviewSetting(null);
    $[30] = cancelPreview;
  } else cancelPreview = $[30];
  let cancelPreview_2 = cancelPreview;
  let setThemeSetting;
  if ($[31] !== persistTheme) {
    setThemeSetting = (newSetting) => {
      setThemeSettingState(newSetting);
      setPreviewSetting(null);
      if (newSetting === "auto") setSystemTheme(getSystemThemeName());
      persistTheme(newSetting);
    };
    $[31] = persistTheme;
    $[32] = setThemeSetting;
  } else setThemeSetting = $[32];
  let setPreviewTheme;
  if ($[33] === MEMO_CACHE_SENTINEL) {
    setPreviewTheme = (newSetting_0) => {
      setPreviewSetting(newSetting_0);
      if (newSetting_0 === "auto") setSystemTheme(getSystemThemeName());
    };
    $[33] = setPreviewTheme;
  } else setPreviewTheme = $[33];
  let contextValueCached;
  if (
    $[34] !== activeCustomTheme ||
    $[35] !== activeThemeOverrides ||
    $[36] !== currentTheme ||
    $[37] !== customThemes ||
    $[38] !== reloadCustomThemes ||
    $[39] !== resolvedTheme ||
    $[40] !== setThemeSetting ||
    $[41] !== themeSetting
  ) {
    contextValueCached = {
      themeSetting,
      setThemeSetting,
      setPreviewTheme,
      cancelPreview: cancelPreview_2,
      currentTheme,
      resolvedTheme,
      activeThemeOverrides,
      customThemes,
      activeCustomTheme,
      reloadCustomThemes,
      setPreviewOverrides,
    };
    $[34] = activeCustomTheme;
    $[35] = activeThemeOverrides;
    $[36] = currentTheme;
    $[37] = customThemes;
    $[38] = reloadCustomThemes;
    $[39] = resolvedTheme;
    $[40] = setThemeSetting;
    $[41] = themeSetting;
    $[42] = contextValueCached;
  } else contextValueCached = $[42];
  let value = contextValueCached;
  let providerElement;
  if ($[43] !== children || $[44] !== value) {
    providerElement = jsxProd_default(ThemeContext.Provider, {
      value,
      children,
    });
    $[43] = children;
    $[44] = value;
    $[45] = providerElement;
  } else providerElement = $[45];
  return providerElement;
}
//@ chunk-v9w831vx.js:3554-3694 placement (2.1.88 match: useTheme, 1)
/**
 * 返回 [currentTheme, setThemeSetting]（被 44 处使用）。
 */
function useTheme() {
  let $ = useMemoCache(3);
  let { currentTheme, setThemeSetting } = useContext(ThemeContext);
  let t0;
  if ($[0] !== currentTheme || $[1] !== setThemeSetting) {
    t0 = [currentTheme, setThemeSetting];
    $[0] = currentTheme;
    $[1] = setThemeSetting;
    $[2] = t0;
  } else t0 = $[2];
  return t0;
}
//@ chunk-v9w831vx.js:3694-3735 placement (2.1.88 match: useThemeSetting, 1)
function useThemeSetting() {
  return useContext(ThemeContext).themeSetting;
}
//@ chunk-v9w831vx.js:3735-3907 placement (2.1.88 match: usePreviewTheme, 1)
function usePreviewTheme() {
  let $ = useMemoCache(3);
  let { setPreviewTheme, cancelPreview } = useContext(ThemeContext);
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
  return useContext(ThemeContext).resolvedTheme;
}
//@ chunk-v9w831vx.js:3948-3997 placement
function useActiveThemeOverrides() {
  return useContext(ThemeContext).activeThemeOverrides;
}
//@ chunk-v9w831vx.js:3997-4291 placement
function useCustomThemes() {
  let $ = useMemoCache(5);
  let { customThemes, activeCustomTheme, reloadCustomThemes, setPreviewOverrides } = useContext(ThemeContext);
  let to;
  if (
    $[0] !== activeCustomTheme ||
    $[1] !== customThemes ||
    $[2] !== reloadCustomThemes ||
    $[3] !== setPreviewOverrides
  ) {
    to = {
      customThemes,
      activeCustomTheme,
      reloadCustomThemes,
      setPreviewOverrides,
    };
    $[0] = activeCustomTheme;
    $[1] = customThemes;
    $[2] = reloadCustomThemes;
    $[3] = setPreviewOverrides;
    $[4] = to;
  } else to = $[4];
  return to;
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

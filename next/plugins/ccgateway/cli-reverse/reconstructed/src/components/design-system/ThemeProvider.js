/**
 * components/design-system/ThemeProvider.tsx
 *
 * 主题 Provider：themeSetting（含 auto 跟随系统）、预览主题、自定义/插件主题与覆盖色，提供 useTheme/useThemeSetting/usePreviewTheme。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/design-system/ThemeProvider.tsx
 * pieces: chunk-t1ad9vmv.js (16)
 * attribution: placement 15, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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

//@ chunk-t1ad9vmv.js:557-561 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-t1ad9vmv.js:557", () => {
  init_react_production();
});
//@ chunk-t1ad9vmv.js:561-565 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-t1ad9vmv.js:561", () => {
  init_react_production();
});
//@ chunk-t1ad9vmv.js:565-590 placement
var useStdin_2 = () => useContext(StdinContextAlias);
var useStdin = useStdin_2;
//@ chunk-t1ad9vmv.js:590-594 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-t1ad9vmv.js:590", () => {
  init_react_production();
});
//@ chunk-t1ad9vmv.js:594-626 placement
var EMPTY_THEME; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var THEME_CONTEXT;
deferInit("chunk-t1ad9vmv.js:594", () => {
  EMPTY_THEME = Object.freeze({});
  THEME_CONTEXT = createContext(EMPTY_THEME);
});
//@ chunk-t1ad9vmv.js:626-917 placement
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
//@ chunk-t1ad9vmv.js:917-944 placement
/**
 * 读主题 context 的 hook（useTheme），全站 160 多处使用。
 */
function useTheme_2() {
  return useContext(THEME_CONTEXT);
}
//@ chunk-t1ad9vmv.js:944-1194 fingerprint (2.1.88 match: ThemeContext, 0.608)
var DARK; // deferred: uses getTheme (../../utils/theme.js) of its import cycle while loading; runs once the cycle is complete
var ThemeContext;
deferInit("chunk-t1ad9vmv.js:944", () => {
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
    reloadCustomThemes: () => Promise.resolve(),
    setPreviewOverrides: () => {},
  });
});
//@ chunk-t1ad9vmv.js:1194-1241 placement
function getConfiguredTheme() {
  return resolveSetting("theme", "dark").value;
}
//@ chunk-t1ad9vmv.js:1241-3490 placement (2.1.88 match: ThemeProvider, 0.652)
/**
 * 主题 Provider：从全局配置读 theme（默认 dark），auto 时跟随系统明暗；支持临时预览（setPreviewTheme/cancelPreview）、自定义主题（用户 + 插件）与覆盖色；保存时写入 theme 设置。
 */
function ThemeProvider(props) {
  let $ = useMemoCache(45);
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
  let overrides = previewOverrides ?? activeCustomTheme?.overrides;
  let resolvedThemeCached;
  if ($[27] !== overrides || $[28] !== currentTheme) {
    resolvedThemeCached = mergeThemeOverrides(getTheme(currentTheme), overrides);
    $[27] = overrides;
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
    $[34] !== overrides ||
    $[35] !== currentTheme ||
    $[36] !== customThemes ||
    $[37] !== reloadCustomThemes ||
    $[38] !== resolvedTheme ||
    $[39] !== setThemeSetting ||
    $[40] !== themeSetting
  ) {
    contextValueCached = {
      themeSetting,
      setThemeSetting,
      setPreviewTheme,
      cancelPreview: cancelPreview_2,
      currentTheme,
      resolvedTheme,
      activeThemeOverrides: overrides,
      customThemes,
      reloadCustomThemes,
      setPreviewOverrides,
    };
    $[34] = overrides;
    $[35] = currentTheme;
    $[36] = customThemes;
    $[37] = reloadCustomThemes;
    $[38] = resolvedTheme;
    $[39] = setThemeSetting;
    $[40] = themeSetting;
    $[41] = contextValueCached;
  } else contextValueCached = $[41];
  let value = contextValueCached;
  let providerElement;
  if ($[42] !== children || $[43] !== value) {
    providerElement = jsxProd_default(ThemeContext.Provider, {
      value,
      children,
    });
    $[42] = children;
    $[43] = value;
    $[44] = providerElement;
  } else providerElement = $[44];
  return providerElement;
}
//@ chunk-t1ad9vmv.js:3490-3630 placement (2.1.88 match: useTheme, 1)
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
//@ chunk-t1ad9vmv.js:3630-3671 placement (2.1.88 match: useThemeSetting, 1)
function useThemeSetting() {
  return useContext(ThemeContext).themeSetting;
}
//@ chunk-t1ad9vmv.js:3671-3843 placement (2.1.88 match: usePreviewTheme, 1)
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
//@ chunk-t1ad9vmv.js:3843-3884 placement
function useResolvedTheme() {
  return useContext(ThemeContext).resolvedTheme;
}
//@ chunk-t1ad9vmv.js:3884-3933 placement
function useActiveThemeOverrides() {
  return useContext(ThemeContext).activeThemeOverrides;
}
//@ chunk-t1ad9vmv.js:3933-4170 placement
function useCustomThemes() {
  let $ = useMemoCache(4);
  let { customThemes, reloadCustomThemes, setPreviewOverrides } = useContext(ThemeContext);
  let to;
  if ($[0] !== customThemes || $[1] !== reloadCustomThemes || $[2] !== setPreviewOverrides) {
    to = {
      customThemes,
      reloadCustomThemes,
      setPreviewOverrides,
    };
    $[0] = customThemes;
    $[1] = reloadCustomThemes;
    $[2] = setPreviewOverrides;
    $[3] = to;
  } else to = $[3];
  return to;
}
export {
  useTheme_2,
  useStdin,
  useResolvedTheme,
  ThemeProvider,
  StorageCredentialsProvider,
  useTheme,
  useActiveThemeOverrides,
  useThemeSetting,
  usePreviewTheme,
  useCustomThemes,
  getConfiguredTheme,
};

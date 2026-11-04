/**
 * screens/FleetView/FleetViewScreen.tsx
 *
 * 2.1.316 新增（门面模块 FleetViewScreen）。Fleet 多会话视图。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8kxjtdv8.js (6)
 * attribution: placement 6
 */
import { init_react_production, useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { resolveThemeSetting, getCachedSystemTheme, onSystemThemeChange } from "../../utils/systemTheme.js";
import { isLightTheme } from "../../utils/theme.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getConfiguredTheme } from "../../components/design-system/ThemeProvider.js";
import { isLaunchComposerEnabled } from "../../utils/fleetGates.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { KillRingProvider } from "../../utils/killRing.js";
import { shouldUseFullscreenByDefault, isMouseTrackingEnabled } from "../../utils/fullscreen.js";
import { AlternateScreen } from "../../ink/components/AlternateScreen.js";
import { getPlatform } from "../../utils/platform.js";
import { env } from "../../utils/env.js";

//@ chunk-8kxjtdv8.js:675-679 placement
init_react_production();
//@ chunk-8kxjtdv8.js:679-786 placement
var SURFACE_COLORS = {
  light: {
    background: "#f9f9f7",
    foreground: "#000000",
  },
  dark: {
    background: "#1f1f1e",
    foreground: "#ffffff",
  },
};
//@ chunk-8kxjtdv8.js:786-908 placement
function resolveSurface(setting, systemTheme, enabled) {
  if (!enabled) return;
  let theme;
  if (setting === "auto") {
    if (systemTheme === undefined) return;
    theme = systemTheme;
  } else theme = resolveThemeSetting(setting);
  return isLightTheme(theme) ? SURFACE_COLORS.light : SURFACE_COLORS.dark;
}
//@ chunk-8kxjtdv8.js:908-1104 placement
function useSurfaceTheme() {
  let $ = useMemoCache(4);
  let [theme, setTheme] = useState(getCachedSystemTheme);
  let subscribe;
  let deps;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    subscribe = () => onSystemThemeChange(() => setTheme(getCachedSystemTheme()));
    deps = [];
    $[0] = subscribe;
    $[1] = deps;
  } else {
    subscribe = $[0];
    deps = $[1];
  }
  useEffect(subscribe, deps);
  let surface;
  if ($[2] !== theme) {
    surface = resolveSurface(getConfiguredTheme(), theme, isLaunchComposerEnabled());
    $[2] = theme;
    $[3] = surface;
  } else surface = $[3];
  return surface;
}
//@ chunk-8kxjtdv8.js:1104-1483 placement
function FleetViewScreen(props) {
  let $ = useMemoCache(9);
  let { children, mouseTracking, killRing } = props;
  let surface = useSurfaceTheme();
  let withKillRing;
  if ($[0] !== children || $[1] !== killRing) {
    withKillRing = jsxProd_default(KillRingProvider, {
      handle: killRing,
      children,
    });
    $[0] = children;
    $[1] = killRing;
    $[2] = withKillRing;
  } else withKillRing = $[2];
  let content = withKillRing;
  if (shouldUseFullscreenByDefault()) {
    let mouseTracking_2;
    if ($[3] !== mouseTracking) {
      mouseTracking_2 = mouseTracking ?? isMouseTrackingEnabled();
      $[3] = mouseTracking;
      $[4] = mouseTracking_2;
    } else mouseTracking_2 = $[4];
    let screen;
    if ($[5] !== surface || $[6] !== mouseTracking_2 || $[7] !== content) {
      screen = jsxProd_default(AlternateScreen, {
        mouseTracking: mouseTracking_2,
        surface,
        children: content,
      });
      $[5] = surface;
      $[6] = mouseTracking_2;
      $[7] = content;
      $[8] = screen;
    } else screen = $[8];
    return screen;
  }
  return content;
}
//@ chunk-8kxjtdv8.js:1483-1585 placement
function applyFleetViewHostWindowsEnv() {
  if (getPlatform() === "windows" || env.WT_SESSION) process.env.CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT ??= "1";
}
export { FleetViewScreen, applyFleetViewHostWindowsEnv, resolveSurface };

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
import { init_react_production, y, P } from "../../../vendor/react/cjs/react.production.js";
import { resolveThemeSetting, getCachedSystemTheme, onSystemThemeChange } from "../../utils/systemTheme.js";
import { isLightTheme } from "../../utils/theme.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
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
function resolveSurface(setting, t, o) {
  if (!o) return;
  let r;
  if (setting === "auto") {
    if (t === undefined) return;
    r = t;
  } else r = resolveThemeSetting(setting);
  return isLightTheme(r) ? SURFACE_COLORS.light : SURFACE_COLORS.dark;
}
//@ chunk-8kxjtdv8.js:908-1104 placement
function useSurfaceTheme() {
  let $ = w(4);
  let [n, t] = y(getCachedSystemTheme);
  let r;
  let m;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    r = () => onSystemThemeChange(() => t(getCachedSystemTheme()));
    m = [];
    $[0] = r;
    $[1] = m;
  } else {
    r = $[0];
    m = $[1];
  }
  P(r, m);
  let f;
  if ($[2] !== n) {
    f = resolveSurface(getConfiguredTheme(), n, isLaunchComposerEnabled());
    $[2] = n;
    $[3] = f;
  } else f = $[3];
  return f;
}
//@ chunk-8kxjtdv8.js:1104-1483 placement
function FleetViewScreen(props) {
  let $ = w(9);
  let { children, mouseTracking, killRing } = props;
  let surface = useSurfaceTheme();
  let c;
  if ($[0] !== children || $[1] !== killRing) {
    c = jsxProd_default(KillRingProvider, {
      handle: killRing,
      children,
    });
    $[0] = children;
    $[1] = killRing;
    $[2] = c;
  } else c = $[2];
  let a = c;
  if (shouldUseFullscreenByDefault()) {
    let mouseTracking_2;
    if ($[3] !== mouseTracking) {
      mouseTracking_2 = mouseTracking ?? isMouseTrackingEnabled();
      $[3] = mouseTracking;
      $[4] = mouseTracking_2;
    } else mouseTracking_2 = $[4];
    let p;
    if ($[5] !== surface || $[6] !== mouseTracking_2 || $[7] !== a) {
      p = jsxProd_default(AlternateScreen, {
        mouseTracking: mouseTracking_2,
        surface,
        children: a,
      });
      $[5] = surface;
      $[6] = mouseTracking_2;
      $[7] = a;
      $[8] = p;
    } else p = $[8];
    return p;
  }
  return a;
}
//@ chunk-8kxjtdv8.js:1483-1585 placement
function applyFleetViewHostWindowsEnv() {
  if (getPlatform() === "windows" || env.WT_SESSION) process.env.CLAUDE_CODE_ALT_SCREEN_FULL_REPAINT ??= "1";
}
export { FleetViewScreen };

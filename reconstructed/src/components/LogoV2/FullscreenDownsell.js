/**
 * components/LogoV2/FullscreenDownsell.tsx
 *
 * 2.1.316 新增：全屏 downsell 提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ag5x7vhf.js (5)
 * attribution: placement 5
 */
import { getFullscreenDecision } from "../../utils/fullscreen.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { Me } from "../design-system/ThemeProvider.js";
import { at } from "./CondensedLogo.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logEvent } from "../../services/analytics/index.js";
import { getInitialSettings_2, updateSettingsForSource } from "../../utils/settings/settings.js";
import { logForDebugging } from "../../utils/debug.js";
import { Box, Text } from "../../ink/components/Text.js";
import { AnimatedAsterisk } from "./AnimatedAsterisk.js";

//@ chunk-ag5x7vhf.js:84754-84763 placement
var DOWNSELL_MAX_VIEWS = 5;
//@ chunk-ag5x7vhf.js:84763-84857 placement
function isFullscreenDownsellActive() {
  if (getFullscreenDecision() !== "downsell_on") return !1;
  return (getGlobalConfig().fullscreenDownsellSeenCount ?? 0) < DOWNSELL_MAX_VIEWS;
}
//@ chunk-ag5x7vhf.js:84857-85038 placement
function FullscreenDownsellNotice() {
  let h = w(3),
    { storageV5: storageV5 } = Me(),
    x;
  if (h[0] !== storageV5)
    ((x = () => recordFullscreenDownsellSeen(storageV5)), (h[0] = storageV5), (h[1] = x));
  else x = h[1];
  at("fullscreen-downsell", x);
  let k;
  if (h[2] === MEMO_CACHE_SENTINEL) ((k = e(FlickerFreeRenderingNotice, {})), (h[2] = k));
  else k = h[2];
  return k;
}
/**
 * 记录全屏下推（downsell）提示被看过一次；达到次数后把 settings.tui=fullscreen 持久化（tengu_fullscreen_downsell_persisted）。
 */
//@ chunk-ag5x7vhf.js:85038-85454 placement
async function recordFullscreenDownsellSeen(m) {
  let h = 0;
  if (
    (saveGlobalConfig(
      (x) => ((h = (x.fullscreenDownsellSeenCount ?? 0) + 1), { ...x, fullscreenDownsellSeenCount: h }),
      m,
    ),
    logEvent("tengu_fullscreen_downsell_shown", { seen_count: h }),
    h >= DOWNSELL_MAX_VIEWS && getInitialSettings_2().tui === void 0)
  ) {
    let { error: error } = await updateSettingsForSource("userSettings", { tui: "fullscreen" }, void 0, m);
    if (error) {
      logForDebugging(`fullscreen downsell graduation persist failed: ${error.message}`, { level: "error" });
      return;
    }
    logEvent("tengu_fullscreen_downsell_persisted", { seen_count: h });
  }
}
/**
 * 全屏（无闪烁渲染）说明：滚动、选中即复制、点击移动光标/展开、/tui default 退回。
 */
//@ chunk-ag5x7vhf.js:85454-86081 placement
function FlickerFreeRenderingNotice() {
  let m = w(1),
    h;
  if (m[0] === MEMO_CACHE_SENTINEL)
    ((h = r(Box, {
      flexDirection: "column",
      children: [
        r(Box, {
          flexDirection: "row",
          children: [
            e(AnimatedAsterisk, {}),
            e(Text, { color: "autoAccept", children: " Using flicker-free rendering" }),
          ],
        }),
        r(Text, {
          dimColor: !0,
          children: ["  ", "\xB7 Scroll with your trackpad, scroll wheel, or PageUp/PageDown"],
        }),
        r(Text, {
          dimColor: !0,
          children: ["  ", "\xB7 Select text to copy \u2014 copying is automatic (/config to disable)"],
        }),
        r(Text, {
          dimColor: !0,
          children: ["  ", "\xB7 Click to move your cursor or expand collapsed results"],
        }),
        r(Text, {
          dimColor: !0,
          children: ["  ", "\xB7 /tui default to go back (saved to your preferences)"],
        }),
      ],
    })),
      (m[0] = h));
  else h = m[0];
  return h;
}

export { isFullscreenDownsellActive, FullscreenDownsellNotice };

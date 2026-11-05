/**
 * components/LogoV2/FullscreenDownsell.tsx
 *
 * 2.1.316 新增：全屏 downsell 提示。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-hnxhr3bs.js (5)
 * attribution: placement 5
 */
import { getFullscreenDecision } from "../../utils/fullscreen.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useNoticeImpression } from "./CondensedLogo.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logEvent } from "../../services/analytics/index.js";
import { getInitialSettings, updateSettingsForSource } from "../../utils/settings/settings.js";
import { logForDebugging } from "../../utils/debug.js";
import { Box, Text } from "../../ink/components/Text.js";
import { AnimatedAsterisk } from "./AnimatedAsterisk.js";

//@ chunk-hnxhr3bs.js:84239-84248 placement
var DOWNSELL_MAX_VIEWS = 5;
//@ chunk-hnxhr3bs.js:84248-84342 placement
function isFullscreenDownsellActive() {
  if (getFullscreenDecision() !== "downsell_on") return false;
  return (getGlobalConfig().fullscreenDownsellSeenCount ?? 0) < DOWNSELL_MAX_VIEWS;
}
//@ chunk-hnxhr3bs.js:84342-84523 placement
function FullscreenDownsellNotice() {
  let $ = useMemoCache(3);
  let { storageV5 } = useTheme_2();
  let onShown;
  if ($[0] !== storageV5) {
    onShown = () => recordFullscreenDownsellSeen(storageV5);
    $[0] = storageV5;
    $[1] = onShown;
  } else onShown = $[1];
  useNoticeImpression("fullscreen-downsell", onShown);
  let notice;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    notice = jsxProd_default(FlickerFreeRenderingNotice, {});
    $[2] = notice;
  } else notice = $[2];
  return notice;
}
//@ chunk-hnxhr3bs.js:84523-84939 placement
/**
 * 记录全屏下推（downsell）提示被看过一次；达到次数后把 settings.tui=fullscreen 持久化（tengu_fullscreen_downsell_persisted）。
 */
async function recordFullscreenDownsellSeen(storageV5) {
  let seenCount = 0;
  saveGlobalConfig((config) => {
    seenCount = (config.fullscreenDownsellSeenCount ?? 0) + 1;
    return {
      ...config,
      fullscreenDownsellSeenCount: seenCount,
    };
  }, storageV5);
  logEvent("tengu_fullscreen_downsell_shown", {
    seen_count: seenCount,
  });
  if (seenCount >= DOWNSELL_MAX_VIEWS && getInitialSettings().tui === undefined) {
    let { error } = await updateSettingsForSource(
      "userSettings",
      {
        tui: "fullscreen",
      },
      undefined,
      storageV5,
    );
    if (error) {
      logForDebugging(`fullscreen downsell graduation persist failed: ${error.message}`, {
        level: "error",
      });
      return;
    }
    logEvent("tengu_fullscreen_downsell_persisted", {
      seen_count: seenCount,
    });
  }
}
//@ chunk-hnxhr3bs.js:84939-85566 placement
/**
 * 全屏（无闪烁渲染）说明：滚动、选中即复制、点击移动光标/展开、/tui default 退回。
 */
function FlickerFreeRenderingNotice() {
  let $ = useMemoCache(1);
  let notice;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    notice = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        jsxProd_default_2(Box, {
          flexDirection: "row",
          children: [
            jsxProd_default(AnimatedAsterisk, {}),
            jsxProd_default(Text, {
              color: "autoAccept",
              children: " Using flicker-free rendering",
            }),
          ],
        }),
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["  ", "\xB7 Scroll with your trackpad, scroll wheel, or PageUp/PageDown"],
        }),
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["  ", "\xB7 Select text to copy \u2014 copying is automatic (/config to disable)"],
        }),
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["  ", "\xB7 Click to move your cursor or expand collapsed results"],
        }),
        jsxProd_default_2(Text, {
          dimColor: true,
          children: ["  ", "\xB7 /tui default to go back (saved to your preferences)"],
        }),
      ],
    });
    $[0] = notice;
  } else notice = $[0];
  return notice;
}
export { isFullscreenDownsellActive, FullscreenDownsellNotice };

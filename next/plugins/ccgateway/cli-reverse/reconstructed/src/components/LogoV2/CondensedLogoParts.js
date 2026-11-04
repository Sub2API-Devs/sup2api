/**
 * components/LogoV2/CondensedLogoParts.tsx
 *
 * 2.1.316 新增：精简 Logo 的 Clawd 动画与渲染器切换提示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ag5x7vhf.js (12)
 * attribution: placement 12
 */
import { CLAWD_BASE_WIDTH, AnimatedClawd } from "./AnimatedClawd.js";
import { toRGBColor, parseRGB, interpolateColor } from "../Spinner/utils.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { usePrefersReducedMotion } from "../Spinner/spinnerFlags.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useResolvedTheme, useTheme } from "../design-system/ThemeProvider.js";
import { isLightTheme } from "../../utils/theme.js";
import { useTerminalFocusState } from "../../ink/hooks/use-terminal-focus.js";
import {
  useRef,
  useContext,
  useReducer,
  useLayoutEffect,
  init_react_production,
} from "../../../vendor/react/cjs/react.production.js";
import { TerminalSizeContext } from "../../ink/terminalModes.js";
import { useTerminalViewport, fullRepaintInterval, useAnimationFrame } from "../../ink/components/Input.js";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { getTeammateAgentId } from "../../bootstrap/state.js";
import { sequential } from "../../utils/sequential.js";
import { chalkForChart, Clawd } from "./Clawd.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { DIAGONAL, FOUR_POINTED_STAR } from "../../constants/figures.js";
import { env } from "../../utils/env.js";
import { isFullscreenEnvEnabled } from "../../utils/fullscreen.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { describeMetaKey } from "../../ink/terminal.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ag5x7vhf.js:57348-57827 placement
/**
 * 精简 Logo 魔杖/星光动画的常量：帧长、周期、光晕位置与速度、深浅两套调色板（wood/ember/gold/flare 等 RGB）、闪亮/渐变阶段帧数。
 */
var WAND_FRAME_MS = 128;
var WAND_CYCLE_MS = 24 * WAND_FRAME_MS;
var HELD_POSE_WIDTH = 2;
var WAND_GLOW_ORIGIN = {
  column: CLAWD_BASE_WIDTH + 1,
  row: 0,
};
var GLOW_WAVE_SPEED = 7;
var GLOW_LEAD_WIDTH = 0.9;
var GLOW_TRAIL_WIDTH = 1.8;
var GLOW_ECHO = {
  behind: 3.5,
  share: 0.4,
};
var GLOW_LEVELS = 8;
var WHITE_RGB = {
  r: 255,
  g: 255,
  b: 255,
};
var WAND_PALETTE_DARK = {
  crest: 0.8,
  wood: {
    r: 208,
    g: 162,
    b: 100,
  },
  woodLit: {
    r: 255,
    g: 240,
    b: 184,
  },
  ember: {
    r: 240,
    g: 128,
    b: 72,
  },
  gold: {
    r: 255,
    g: 204,
    b: 104,
  },
  bright: {
    r: 255,
    g: 236,
    b: 160,
  },
  flare: {
    r: 255,
    g: 252,
    b: 235,
  },
};
var WAND_PALETTE_LIGHT = {
  crest: 0.7,
  wood: {
    r: 150,
    g: 104,
    b: 48,
  },
  woodLit: {
    r: 196,
    g: 120,
    b: 24,
  },
  ember: {
    r: 232,
    g: 150,
    b: 40,
  },
  gold: {
    r: 240,
    g: 118,
    b: 24,
  },
  bright: {
    r: 238,
    g: 84,
    b: 16,
  },
  flare: {
    r: 224,
    g: 40,
    b: 8,
  },
};
var WAND_CYCLE_FRAMES = WAND_CYCLE_MS / WAND_FRAME_MS;
var WAND_FLARE_FRAMES = 2;
var WAND_COOLDOWN_FRAMES = 3;
var WAND_WARMUP_FRAMES = 4;
//@ chunk-ag5x7vhf.js:57827-57913 placement
function plainWandColors(light) {
  let { wood, gold } = light ? WAND_PALETTE_LIGHT : WAND_PALETTE_DARK;
  return {
    wand: toRGBColor(wood),
    flame: toRGBColor(gold),
    isFlaring: false,
  };
}
//@ chunk-ag5x7vhf.js:57913-58122 placement
/**
 * 按时间生成一个 paint(列,行) 函数：以魔杖位置为圆心向外扩散的两道光波，按距离把底色与高光色插值（量化到若干级）。
 */
function makeWandGlowPainter(ultraColor, frameMs, light) {
  let base = parseRGB(ultraColor, WHITE_RGB, (light ? WAND_PALETTE_LIGHT : WAND_PALETTE_DARK).crest);
  let phase = ((frameMs % WAND_CYCLE_MS) / 1000) * GLOW_WAVE_SPEED;
  return (column, row) => {
    let distance = Math.hypot(column - WAND_GLOW_ORIGIN.column, 2 * (row - WAND_GLOW_ORIGIN.row));
    let max = Math.max(
      glowFalloff(phase - distance),
      GLOW_ECHO.share * glowFalloff(phase - GLOW_ECHO.behind - distance),
    );
    return toRGBColor(parseRGB(ultraColor, base, Math.round(max * GLOW_LEVELS) / GLOW_LEVELS));
  };
}
//@ chunk-ag5x7vhf.js:58122-58601 placement
/**
 * 按动画时间算魔杖与火焰的颜色：周期开头闪亮、随后渐暗、周期末尾渐亮，其余时间火焰在 ember 与 gold 之间伪随机闪烁；返回 {wand, flame, isFlaring}。
 */
function getWandColors(elapsedMs, light) {
  let { wood, woodLit, ember, gold, bright, flare } = light ? WAND_PALETTE_LIGHT : WAND_PALETTE_DARK;
  let floored = Math.floor((elapsedMs % WAND_CYCLE_MS) / WAND_FRAME_MS);
  if (floored < WAND_FLARE_FRAMES)
    return {
      wand: toRGBColor(woodLit),
      flame: toRGBColor(flare),
      isFlaring: true,
    };
  if (floored < WAND_FLARE_FRAMES + WAND_COOLDOWN_FRAMES) {
    let cooldownT = (floored - WAND_FLARE_FRAMES + 1) / WAND_COOLDOWN_FRAMES;
    return {
      wand: toRGBColor(parseRGB(woodLit, wood, cooldownT)),
      flame: toRGBColor(parseRGB(bright, gold, cooldownT)),
      isFlaring: false,
    };
  }
  if (floored >= WAND_CYCLE_FRAMES - WAND_WARMUP_FRAMES) {
    let warmupT = (floored - (WAND_CYCLE_FRAMES - WAND_WARMUP_FRAMES) + 1) / WAND_WARMUP_FRAMES;
    return {
      wand: toRGBColor(parseRGB(wood, woodLit, warmupT / 2)),
      flame: toRGBColor(parseRGB(gold, bright, warmupT)),
      isFlaring: false,
    };
  }
  let floored_2 = Math.floor(elapsedMs / WAND_FRAME_MS);
  let emberT =
    Math.round((Math.abs(Math.sin(floored_2 * 12.9898) * 43758.5453) % 1) * GLOW_LEVELS) / GLOW_LEVELS;
  return {
    wand: toRGBColor(wood),
    flame: toRGBColor(parseRGB(ember, gold, emberT)),
    isFlaring: false,
  };
}
//@ chunk-ag5x7vhf.js:58601-58649 placement
function glowFalloff(delta) {
  return Math.exp(delta >= 0 ? -delta / GLOW_TRAIL_WIDTH : delta / GLOW_LEAD_WIDTH);
}
//@ chunk-ag5x7vhf.js:58649-58677 placement
function incrementCounter(count) {
  return count + 1;
}
//@ chunk-ag5x7vhf.js:58677-58724 placement
var CLAWD_DEFAULT_POSE = {
  eyes: "open",
  arms: "one-up",
  feet: "both",
};
//@ chunk-ag5x7vhf.js:58724-60079 placement
/**
 * 精简版 Logo 的 Clawd 动画（含 effort ultra 的魔杖/火焰效果、全屏入场动画）。
 */
function AnimatedClawdLogo(props) {
  let $ = useMemoCache(21);
  let { fullscreen, entrance, ultra } = props;
  let prefersReducedMotion = usePrefersReducedMotion();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let ultraColor = interpolateColor(useResolvedTheme().effortUltra);
  let isLight = isLightTheme(useTheme()[0]);
  let terminalFocusState = useTerminalFocusState();
  let terminalFocusStateRef = useRef(terminalFocusState);
  let sizeContext = useContext(TerminalSizeContext);
  let columns = sizeContext?.columns;
  let rows = sizeContext?.rows;
  let [setRef, viewport, isVisibleFn] = useTerminalViewport();
  let { isVisible } = viewport;
  let [, forceFrame] = useReducer(incrementCounter, 0);
  let animating =
    ultra &&
    fullscreen &&
    fullRepaintInterval(WAND_FRAME_MS) === WAND_FRAME_MS &&
    terminalFocusState !== "blurred" &&
    !isBgSession() &&
    getTeammateAgentId() === undefined &&
    !prefersReducedMotion &&
    !isScreenReaderEnabled &&
    ultraColor !== null &&
    sequential.level >= 3 &&
    chalkForChart();
  let [measureRef, frameMs] = useAnimationFrame(animating ? WAND_FRAME_MS : null);
  let wandActive = animating && isVisible;
  let repaintEffect;
  if ($[0] !== animating || $[1] !== terminalFocusState || $[2] !== isVisible || $[3] !== isVisibleFn) {
    repaintEffect = () => {
      let focusChanged = terminalFocusStateRef.current !== terminalFocusState;
      terminalFocusStateRef.current = terminalFocusState;
      if (animating && (focusChanged || isVisibleFn() !== isVisible)) forceFrame();
    };
    $[0] = animating;
    $[1] = terminalFocusState;
    $[2] = isVisible;
    $[3] = isVisibleFn;
    $[4] = repaintEffect;
  } else repaintEffect = $[4];
  let repaintDeps;
  if (
    $[5] !== animating ||
    $[6] !== columns ||
    $[7] !== terminalFocusState ||
    $[8] !== isVisible ||
    $[9] !== isVisibleFn ||
    $[10] !== rows ||
    $[11] !== frameMs
  ) {
    repaintDeps = [animating, terminalFocusState, isVisible, frameMs, columns, rows, isVisibleFn];
    $[5] = animating;
    $[6] = columns;
    $[7] = terminalFocusState;
    $[8] = isVisible;
    $[9] = isVisibleFn;
    $[10] = rows;
    $[11] = frameMs;
    $[12] = repaintDeps;
  } else repaintDeps = $[12];
  useLayoutEffect(repaintEffect, repaintDeps);
  if (isScreenReaderEnabled) {
    return null;
  }
  let color = ultra ? "effortUltra" : undefined;
  let wandGlyph = jsxProd_default(WandGlyph, {
    wand: wandActive ? getWandColors(frameMs, isLight) : plainWandColors(isLight),
    usesTerminalColors: ultraColor === null,
  });
  const BoxComponent = Box;
  let ref;
  if ($[13] !== measureRef || $[14] !== setRef) {
    ref = (node) => {
      measureRef(node);
      setRef(node);
    };
    $[13] = measureRef;
    $[14] = setRef;
    $[15] = ref;
  } else ref = $[15];
  const flexShrink = 0;
  const width = ultra ? CLAWD_BASE_WIDTH + HELD_POSE_WIDTH : CLAWD_BASE_WIDTH;
  const children = fullscreen
    ? jsxProd_default(AnimatedClawd, {
        sequence: entrance,
        delayMs: 100,
        color,
        rest: ultra
          ? {
              pose: CLAWD_DEFAULT_POSE,
              paint:
                wandActive && ultraColor !== null
                  ? makeWandGlowPainter(ultraColor, frameMs, isLight)
                  : undefined,
              held: wandGlyph,
              heldWidth: HELD_POSE_WIDTH,
            }
          : undefined,
      })
    : jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default(Clawd, {
            pose: ultra ? CLAWD_DEFAULT_POSE : "default",
            color,
          }),
          ultra ? wandGlyph : null,
        ],
      });
  let logo;
  if ($[16] !== BoxComponent || $[17] !== ref || $[18] !== width || $[19] !== children) {
    logo = jsxProd_default(BoxComponent, {
      ref,
      flexShrink,
      width,
      children,
    });
    $[16] = BoxComponent;
    $[17] = ref;
    $[18] = width;
    $[19] = children;
    $[20] = logo;
  } else logo = $[20];
  return logo;
}
//@ chunk-ag5x7vhf.js:60079-60496 placement
/**
 * 渲染魔杖"╱✦"两个字符，颜色来自 getWandColors；终端配色模式下统一用 warning 色。
 */
function WandGlyph(props) {
  let $ = useMemoCache(8);
  let { wand, usesTerminalColors } = props;
  const color = usesTerminalColors ? "warning" : wand.wand;
  let wandText;
  if ($[0] !== color) {
    wandText = jsxProd_default(Text, {
      color,
      bold: true,
      children: DIAGONAL,
    });
    $[0] = color;
    $[1] = wandText;
  } else wandText = $[1];
  const color_2 = usesTerminalColors ? "warning" : wand.flame;
  let flameText;
  if ($[2] !== color_2 || $[3] !== wand.isFlaring) {
    flameText = jsxProd_default(Text, {
      color: color_2,
      bold: wand.isFlaring,
      children: FOUR_POINTED_STAR,
    });
    $[2] = color_2;
    $[3] = wand.isFlaring;
    $[4] = flameText;
  } else flameText = $[4];
  let glyph;
  if ($[5] !== wandText || $[6] !== flameText) {
    glyph = jsxProd_default_2(Text, {
      children: [wandText, flameText],
    });
    $[5] = wandText;
    $[6] = flameText;
    $[7] = glyph;
  } else glyph = $[7];
  return glyph;
}
//@ chunk-ag5x7vhf.js:60496-60645 placement
function justSwitchedRenderer() {
  switch (env.CLAUDE_CODE_TUI_JUST_SWITCHED) {
    case "fullscreen":
      return isFullscreenEnvEnabled() ? "fullscreen" : undefined;
    case "default":
      return "default";
    default:
      return;
  }
}
//@ chunk-ag5x7vhf.js:60645-61634 placement
/**
 * 刚切换渲染器（CLAUDE_CODE_TUI_JUST_SWITCHED）后的提示：全屏"flicker-free rendering"使用说明或回退说明。
 */
function RendererSwitchNotice() {
  let $ = useMemoCache(6);
  switch (justSwitchedRenderer()) {
    case "fullscreen": {
      let titleRow;
      let cursorRow;
      let expandRow;
      let copyRow;
      if ($[0] === MEMO_CACHE_SENTINEL) {
        titleRow = jsxProd_default_2(Text, {
          children: [
            jsxProd_default(StatusIcon, {
              status: "success",
              withSpace: true,
            }),
            jsxProd_default(Text, {
              color: "success",
              children: "Using flicker-free rendering",
            }),
            jsxProd_default(Text, {
              dimColor: true,
              children: " \xB7 if you want to go back, use /tui default",
            }),
          ],
        });
        cursorRow = jsxProd_default_2(Text, {
          dimColor: true,
          children: ["  ", "\xB7 Click to move your cursor in the text input"],
        });
        expandRow = jsxProd_default_2(Text, {
          dimColor: true,
          children: ["  ", "\xB7 Click to expand collapsed tool results"],
        });
        copyRow = jsxProd_default_2(Text, {
          dimColor: true,
          children: ["  ", "\xB7 By default, text auto-copies when you select it (/config to change)"],
        });
        $[0] = titleRow;
        $[1] = cursorRow;
        $[2] = expandRow;
        $[3] = copyRow;
      } else {
        titleRow = $[0];
        cursorRow = $[1];
        expandRow = $[2];
        copyRow = $[3];
      }
      let fullscreenNotice;
      if ($[4] === MEMO_CACHE_SENTINEL) {
        fullscreenNotice = jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            titleRow,
            cursorRow,
            expandRow,
            copyRow,
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [
                "  ",
                "\xB7 Hold ",
                describeMetaKey(),
                " while selecting to use your terminal's native copy instead",
              ],
            }),
          ],
        });
        $[4] = fullscreenNotice;
      } else fullscreenNotice = $[4];
      return fullscreenNotice;
    }
    case "default": {
      let defaultNotice;
      if ($[5] === MEMO_CACHE_SENTINEL) {
        defaultNotice = jsxProd_default(Text, {
          dimColor: true,
          children: "Switched back to the classic renderer",
        });
        $[5] = defaultNotice;
      } else defaultNotice = $[5];
      return defaultNotice;
    }
    default: {
      return null;
    }
  }
}
//@ chunk-ag5x7vhf.js:61634-61638 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ag5x7vhf.js:61634", () => {
  init_react_production();
});
export { justSwitchedRenderer, AnimatedClawdLogo, RendererSwitchNotice };

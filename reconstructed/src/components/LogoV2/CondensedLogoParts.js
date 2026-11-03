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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { usePrefersReducedMotion } from "../Spinner/spinnerFlags.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useResolvedTheme, useTheme } from "../design-system/ThemeProvider.js";
import { isLightTheme } from "../../utils/theme.js";
import { useTerminalFocusState } from "../../ink/hooks/use-terminal-focus.js";
import { R, Se, Uy, zt, init_react_production } from "../../../vendor/react/cjs/react.production.js";
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
import { DIAGONAL, FOUR_POINTED_STAR } from "../../utils/permissions/autoModeRulesPrompt.js";
import { env } from "../../utils/env.js";
import { isFullscreenEnvEnabled } from "../../utils/fullscreen.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { describeMetaKey } from "../../ink/terminal.js";

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
function plainWandColors(m) {
  let { wood, gold } = m ? WAND_PALETTE_LIGHT : WAND_PALETTE_DARK;
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
function makeWandGlowPainter(m, h, x) {
  let T = parseRGB(m, WHITE_RGB, (x ? WAND_PALETTE_LIGHT : WAND_PALETTE_DARK).crest);
  let k = ((h % WAND_CYCLE_MS) / 1000) * GLOW_WAVE_SPEED;
  return (_, I) => {
    let D = Math.hypot(_ - WAND_GLOW_ORIGIN.column, 2 * (I - WAND_GLOW_ORIGIN.row));
    let max = Math.max(glowFalloff(k - D), GLOW_ECHO.share * glowFalloff(k - GLOW_ECHO.behind - D));
    return toRGBColor(parseRGB(m, T, Math.round(max * GLOW_LEVELS) / GLOW_LEVELS));
  };
}
//@ chunk-ag5x7vhf.js:58122-58601 placement
/**
 * 按动画时间算魔杖与火焰的颜色：周期开头闪亮、随后渐暗、周期末尾渐亮，其余时间火焰在 ember 与 gold 之间伪随机闪烁；返回 {wand, flame, isFlaring}。
 */
function getWandColors(m, h) {
  let { wood, woodLit, ember, gold, bright, flare } = h ? WAND_PALETTE_LIGHT : WAND_PALETTE_DARK;
  let floored = Math.floor((m % WAND_CYCLE_MS) / WAND_FRAME_MS);
  if (floored < WAND_FLARE_FRAMES)
    return {
      wand: toRGBColor(woodLit),
      flame: toRGBColor(flare),
      isFlaring: true,
    };
  if (floored < WAND_FLARE_FRAMES + WAND_COOLDOWN_FRAMES) {
    let W = (floored - WAND_FLARE_FRAMES + 1) / WAND_COOLDOWN_FRAMES;
    return {
      wand: toRGBColor(parseRGB(woodLit, wood, W)),
      flame: toRGBColor(parseRGB(bright, gold, W)),
      isFlaring: false,
    };
  }
  if (floored >= WAND_CYCLE_FRAMES - WAND_WARMUP_FRAMES) {
    let W = (floored - (WAND_CYCLE_FRAMES - WAND_WARMUP_FRAMES) + 1) / WAND_WARMUP_FRAMES;
    return {
      wand: toRGBColor(parseRGB(wood, woodLit, W / 2)),
      flame: toRGBColor(parseRGB(gold, bright, W)),
      isFlaring: false,
    };
  }
  let floored_2 = Math.floor(m / WAND_FRAME_MS);
  let V = Math.round((Math.abs(Math.sin(floored_2 * 12.9898) * 43758.5453) % 1) * GLOW_LEVELS) / GLOW_LEVELS;
  return {
    wand: toRGBColor(wood),
    flame: toRGBColor(parseRGB(ember, gold, V)),
    isFlaring: false,
  };
}
//@ chunk-ag5x7vhf.js:58601-58649 placement
function glowFalloff(m) {
  return Math.exp(m >= 0 ? -m / GLOW_TRAIL_WIDTH : m / GLOW_LEAD_WIDTH);
}
//@ chunk-ag5x7vhf.js:58649-58677 placement
function incrementCounter(tt) {
  return tt + 1;
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
  let Fe = w(21);
  let { fullscreen, entrance, ultra } = props;
  let prefersReducedMotion = usePrefersReducedMotion();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let I = interpolateColor(useResolvedTheme().effortUltra);
  let D = isLightTheme(useTheme()[0]);
  let terminalFocusState = useTerminalFocusState();
  let terminalFocusStateRef = R(terminalFocusState);
  let V = Se(TerminalSizeContext);
  let columns = V?.columns;
  let rows = V?.rows;
  let [K, q, Y] = useTerminalViewport();
  let { isVisible } = q;
  let [, xe] = Uy(incrementCounter, 0);
  let ge =
    ultra &&
    fullscreen &&
    fullRepaintInterval(WAND_FRAME_MS) === WAND_FRAME_MS &&
    terminalFocusState !== "blurred" &&
    !isBgSession() &&
    getTeammateAgentId() === undefined &&
    !prefersReducedMotion &&
    !isScreenReaderEnabled &&
    I !== null &&
    sequential.level >= 3 &&
    chalkForChart();
  let [Re, We] = useAnimationFrame(ge ? WAND_FRAME_MS : null);
  let fe = ge && isVisible;
  let te;
  if (Fe[0] !== ge || Fe[1] !== terminalFocusState || Fe[2] !== isVisible || Fe[3] !== Y) {
    te = () => {
      let me = terminalFocusStateRef.current !== terminalFocusState;
      terminalFocusStateRef.current = terminalFocusState;
      if (ge && (me || Y() !== isVisible)) xe();
    };
    Fe[0] = ge;
    Fe[1] = terminalFocusState;
    Fe[2] = isVisible;
    Fe[3] = Y;
    Fe[4] = te;
  } else te = Fe[4];
  let se;
  if (
    Fe[5] !== ge ||
    Fe[6] !== columns ||
    Fe[7] !== terminalFocusState ||
    Fe[8] !== isVisible ||
    Fe[9] !== Y ||
    Fe[10] !== rows ||
    Fe[11] !== We
  ) {
    se = [ge, terminalFocusState, isVisible, We, columns, rows, Y];
    Fe[5] = ge;
    Fe[6] = columns;
    Fe[7] = terminalFocusState;
    Fe[8] = isVisible;
    Fe[9] = Y;
    Fe[10] = rows;
    Fe[11] = We;
    Fe[12] = se;
  } else se = Fe[12];
  zt(te, se);
  if (isScreenReaderEnabled) {
    return null;
  }
  let color = ultra ? "effortUltra" : undefined;
  let oe = jsxProd_default(WandGlyph, {
    wand: fe ? getWandColors(We, D) : plainWandColors(D),
    usesTerminalColors: I === null,
  });
  const ve = Box;
  let ref;
  if (Fe[13] !== Re || Fe[14] !== K) {
    ref = (He) => {
      Re(He);
      K(He);
    };
    Fe[13] = Re;
    Fe[14] = K;
    Fe[15] = ref;
  } else ref = Fe[15];
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
              paint: fe && I !== null ? makeWandGlowPainter(I, We, D) : undefined,
              held: oe,
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
          ultra ? oe : null,
        ],
      });
  let ae;
  if (Fe[16] !== ve || Fe[17] !== ref || Fe[18] !== width || Fe[19] !== children) {
    ae = jsxProd_default(ve, {
      ref,
      flexShrink,
      width,
      children,
    });
    Fe[16] = ve;
    Fe[17] = ref;
    Fe[18] = width;
    Fe[19] = children;
    Fe[20] = ae;
  } else ae = Fe[20];
  return ae;
}
//@ chunk-ag5x7vhf.js:60079-60496 placement
/**
 * 渲染魔杖"╱✦"两个字符，颜色来自 getWandColors；终端配色模式下统一用 warning 色。
 */
function WandGlyph(props) {
  let k = w(8);
  let { wand, usesTerminalColors } = props;
  const color = usesTerminalColors ? "warning" : wand.wand;
  let _;
  if (k[0] !== color) {
    _ = jsxProd_default(Text, {
      color,
      bold: true,
      children: DIAGONAL,
    });
    k[0] = color;
    k[1] = _;
  } else _ = k[1];
  const color_2 = usesTerminalColors ? "warning" : wand.flame;
  let D;
  if (k[2] !== color_2 || k[3] !== wand.isFlaring) {
    D = jsxProd_default(Text, {
      color: color_2,
      bold: wand.isFlaring,
      children: FOUR_POINTED_STAR,
    });
    k[2] = color_2;
    k[3] = wand.isFlaring;
    k[4] = D;
  } else D = k[4];
  let A;
  if (k[5] !== _ || k[6] !== D) {
    A = jsxProd_default_2(Text, {
      children: [_, D],
    });
    k[5] = _;
    k[6] = D;
    k[7] = A;
  } else A = k[7];
  return A;
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
  let m = w(6);
  switch (justSwitchedRenderer()) {
    case "fullscreen": {
      let h;
      let x;
      let T;
      let k;
      if (m[0] === MEMO_CACHE_SENTINEL) {
        h = jsxProd_default_2(Text, {
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
        x = jsxProd_default_2(Text, {
          dimColor: true,
          children: ["  ", "\xB7 Click to move your cursor in the text input"],
        });
        T = jsxProd_default_2(Text, {
          dimColor: true,
          children: ["  ", "\xB7 Click to expand collapsed tool results"],
        });
        k = jsxProd_default_2(Text, {
          dimColor: true,
          children: ["  ", "\xB7 By default, text auto-copies when you select it (/config to change)"],
        });
        m[0] = h;
        m[1] = x;
        m[2] = T;
        m[3] = k;
      } else {
        h = m[0];
        x = m[1];
        T = m[2];
        k = m[3];
      }
      let _;
      if (m[4] === MEMO_CACHE_SENTINEL) {
        _ = jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            h,
            x,
            T,
            k,
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
        m[4] = _;
      } else _ = m[4];
      return _;
    }
    case "default": {
      let h;
      if (m[5] === MEMO_CACHE_SENTINEL) {
        h = jsxProd_default(Text, {
          dimColor: true,
          children: "Switched back to the classic renderer",
        });
        m[5] = h;
      } else h = m[5];
      return h;
    }
    default: {
      return null;
    }
  }
}
//@ chunk-ag5x7vhf.js:61634-61638 placement
init_react_production();
export { justSwitchedRenderer, AnimatedClawdLogo, RendererSwitchNotice };

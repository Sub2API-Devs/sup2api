/**
 * components/design-system/StatusIcon.tsx
 *
 * 状态图标配置（success/error/warning/info/pending/loading 的符号与颜色）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/design-system/StatusIcon.tsx
 * pieces: chunk-axsvbsqv.js (1), chunk-mkatyybr.js (8)
 * attribution: fingerprint 2, placement 7
 */
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { BLACK_CIRCLE, BULLET } from "../../constants/figures.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { stripSuffix, repeatString } from "../../utils/stringUtils.js";
import { useResolvedTheme } from "./ThemeProvider.js";
import { interpolateColor, toRGBColor, parseRGB, cosineEase } from "../Spinner/utils.js";
import { sequential } from "../../utils/sequential.js";
import { usePrefersReducedMotion } from "../Spinner/spinnerFlags.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { fullRepaintInterval, useAnimationFrame } from "../../ink/components/Input.js";
import { SCROLL_JUMP_LINES } from "../../ink/scrollConstants.js";
import { getTaskIcon } from "../TaskListV2.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-mkatyybr.js:651-1441 fingerprint (2.1.88 match: STATUS_CONFIG, 0.341)
/**
 * 状态图标闪光动画的调色板长度与每步时间。
 */
var STATUS_CONFIG; // deferred: uses BLACK_CIRCLE (../../constants/figures.js) of its import cycle while loading; runs once the cycle is complete
var AGENT_STATUS_GLYPHS;
var SHIMMER_PALETTE_LENGTH;
var SHIMMER_STEP_MS;
deferInit("chunk-mkatyybr.js:651", () => {
  STATUS_CONFIG = {
    success: {
      icon: figures_default.tick,
      color: "success",
      ariaLabel: "done:",
    },
    error: {
      icon: figures_default.cross,
      color: "error",
      ariaLabel: "failed:",
    },
    warning: {
      icon: figures_default.warning,
      color: "warning",
      ariaLabel: "warning:",
    },
    info: {
      icon: figures_default.info,
      color: "suggestion",
      ariaLabel: "note:",
    },
    pending: {
      icon: figures_default.circle,
      color: undefined,
      ariaLabel: "pending:",
    },
    loading: {
      icon: "\u2026",
      color: undefined,
      ariaLabel: "loading:",
    },
    running: {
      icon: BLACK_CIRCLE,
      color: undefined,
      ariaLabel: "running:",
    },
    on: {
      icon: figures_default.tick,
      color: "success",
      ariaLabel: "on:",
    },
    off: {
      icon: figures_default.circle,
      color: undefined,
      ariaLabel: "off:",
    },
    working: {
      icon: BULLET,
      color: undefined,
      ariaLabel: "working:",
    },
    needsYou: {
      icon: BULLET,
      color: "warning",
      ariaLabel: "needs you:",
    },
    idle: {
      icon: BULLET,
      color: undefined,
      ariaLabel: "idle:",
    },
    failed: {
      icon: BULLET,
      color: "error",
      ariaLabel: "error:",
    },
  };
  AGENT_STATUS_GLYPHS = {
    working: BULLET,
    needsYou: "!",
    idle: "\u25E6",
    failed: "\xD7",
  };
  SHIMMER_PALETTE_LENGTH = 8;
  SHIMMER_STEP_MS = 200;
});
//@ chunk-mkatyybr.js:1441-1516 placement
/**
 * 所有状态图标里最宽的显示宽度（按显示宽度计算）。
 */
function maxStatusIconWidth() {
  return Math.max(...Object.values(STATUS_CONFIG).map((config) => bunStringWidth(config.icon)));
}
//@ chunk-mkatyybr.js:1516-1546 placement
/**
 * 状态图标占位宽度：最宽图标 + 1 列。
 */
function statusIconSlotWidth() {
  return maxStatusIconWidth() + 1;
}
//@ chunk-mkatyybr.js:1546-2361 placement
/**
 * 状态图标（成功/失败/运行中等），带无障碍标签与占位空格。
 */
function StatusIcon(props) {
  let $ = useMemoCache(20);
  let { status, "aria-label": ariaLabel, withSpace, slot } = props;
  let addSpace = withSpace === undefined ? false : withSpace;
  if (status === undefined) {
    let slotText;
    if ($[0] !== slot) {
      slotText =
        slot &&
        jsxProd_default(Text, {
          children: " ".repeat(statusIconSlotWidth()),
        });
      $[0] = slot;
      $[1] = slotText;
    } else slotText = $[1];
    return slotText;
  }
  let config = STATUS_CONFIG[status];
  let spoken;
  if ($[2] !== ariaLabel || $[3] !== config || $[4] !== slot) {
    spoken = ariaLabel ?? (slot === "trailing" ? stripSuffix(config.ariaLabel, ":") : config.ariaLabel);
    $[2] = ariaLabel;
    $[3] = config;
    $[4] = slot;
    $[5] = spoken;
  } else spoken = $[5];
  let label = spoken;
  if (isAgentStatusGlyph(status)) {
    let glyph;
    if ($[6] !== slot || $[7] !== label || $[8] !== status || $[9] !== addSpace) {
      glyph = jsxProd_default(StatusGlyph, {
        status,
        spoken: label,
        slot,
        withSpace: addSpace,
      });
      $[6] = slot;
      $[7] = label;
      $[8] = status;
      $[9] = addSpace;
      $[10] = glyph;
    } else glyph = $[10];
    return glyph;
  }
  const color = config.color;
  const dimColor = !config.color;
  let children;
  if ($[11] !== config.icon || $[12] !== slot || $[13] !== label || $[14] !== addSpace) {
    children = renderStatusGlyph(config.icon, label, slot, addSpace);
    $[11] = config.icon;
    $[12] = slot;
    $[13] = label;
    $[14] = addSpace;
    $[15] = children;
  } else children = $[15];
  let iconText;
  if ($[16] !== config.color || $[17] !== dimColor || $[18] !== children) {
    iconText = jsxProd_default(Text, {
      color,
      dimColor,
      children,
    });
    $[16] = config.color;
    $[17] = dimColor;
    $[18] = children;
    $[19] = iconText;
  } else iconText = $[19];
  return iconText;
}
//@ chunk-mkatyybr.js:2361-2519 placement
function renderStatusGlyph(glyph, spoken, slot, withSpace) {
  let pad =
    slot === undefined ? withSpace && " " : repeatString(" ", statusIconSlotWidth() - bunStringWidth(glyph));
  return jsxProd_default_2(Fragment, {
    children: [
      slot === "trailing" && pad,
      jsxProd_default(Text, {
        "aria-label": spoken,
        children: glyph,
      }),
      slot !== "trailing" && pad,
    ],
  });
}
//@ chunk-mkatyybr.js:2519-2547 placement
function isAgentStatusGlyph(status) {
  return status in AGENT_STATUS_GLYPHS;
}
//@ chunk-mkatyybr.js:2547-3261 placement
/**
 * 按状态取颜色与字形绘制图标，支持朗读文本。
 */
function StatusGlyph(props) {
  let $ = useMemoCache(17);
  let { status, spoken, slot, withSpace } = props;
  let resolvedTheme = useResolvedTheme();
  let subtleColor;
  if ($[0] !== resolvedTheme.subtle) {
    subtleColor = interpolateColor(resolvedTheme.subtle);
    $[0] = resolvedTheme.subtle;
    $[1] = subtleColor;
  } else subtleColor = $[1];
  let subtle = subtleColor;
  let inactiveColor;
  if ($[2] !== resolvedTheme.inactive) {
    inactiveColor = interpolateColor(resolvedTheme.inactive);
    $[2] = resolvedTheme.inactive;
    $[3] = inactiveColor;
  } else inactiveColor = $[3];
  let inactive = inactiveColor;
  let { color } = STATUS_CONFIG[status];
  let shimmering = sequential.level >= 2 && subtle !== null && inactive !== null;
  const glyph = shimmering ? BULLET : AGENT_STATUS_GLYPHS[status];
  let glyphNode;
  if ($[4] !== slot || $[5] !== spoken || $[6] !== glyph || $[7] !== withSpace) {
    glyphNode = renderStatusGlyph(glyph, spoken, slot, withSpace);
    $[4] = slot;
    $[5] = spoken;
    $[6] = glyph;
    $[7] = withSpace;
    $[8] = glyphNode;
  } else glyphNode = $[8];
  let children = glyphNode;
  if (shimmering && status === "working") {
    let shimmer;
    if ($[9] !== inactive || $[10] !== subtle || $[11] !== children) {
      shimmer = jsxProd_default(ShimmerDim, {
        dimmer: subtle,
        dim: inactive,
        children,
      });
      $[9] = inactive;
      $[10] = subtle;
      $[11] = children;
      $[12] = shimmer;
    } else shimmer = $[12];
    return shimmer;
  }
  const dimColor = !color;
  let textNode;
  if ($[13] !== color || $[14] !== children || $[15] !== dimColor) {
    textNode = jsxProd_default(Text, {
      color,
      dimColor,
      children,
    });
    $[13] = color;
    $[14] = children;
    $[15] = dimColor;
    $[16] = textNode;
  } else textNode = $[16];
  return textNode;
}
//@ chunk-mkatyybr.js:3261-3624 placement
/**
 * 运行中状态的明暗闪烁包装（减弱动画模式下静态）。
 */
function ShimmerDim(props) {
  let $ = useMemoCache(8);
  let { dimmer, dim, children } = props;
  let prefersReducedMotion = usePrefersReducedMotion();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let isStatic = prefersReducedMotion || isScreenReaderEnabled;
  let frameInterval = Math.ceil(fullRepaintInterval(SHIMMER_STEP_MS) / SCROLL_JUMP_LINES) * SCROLL_JUMP_LINES;
  let [, frame] = useAnimationFrame(isStatic ? null : frameInterval);
  let color;
  if ($[0] !== dim || $[1] !== dimmer || $[2] !== isStatic || $[3] !== frame) {
    color = isStatic
      ? "subtle"
      : toRGBColor(
          parseRGB(
            dimmer,
            dim,
            cosineEase(Math.floor(frame / frameInterval) % SHIMMER_PALETTE_LENGTH, SHIMMER_PALETTE_LENGTH),
          ),
        );
    $[0] = dim;
    $[1] = dimmer;
    $[2] = isStatic;
    $[3] = frame;
    $[4] = color;
  } else color = $[4];
  let color_2 = color;
  let textNode;
  if ($[5] !== children || $[6] !== color_2) {
    textNode = jsxProd_default(Text, {
      color: color_2,
      children,
    });
    $[5] = children;
    $[6] = color_2;
    $[7] = textNode;
  } else textNode = $[7];
  return textNode;
}
//@ chunk-axsvbsqv.js:14472-14537 fingerprint (2.1.88 match: StatusIcon, 0.661)
function StatusIcon_2(t0) {
  let { icon, color } = getTaskIcon(t0);
  return {
    text: icon,
    color,
  };
}
export { StatusIcon, statusIconSlotWidth, maxStatusIconWidth, STATUS_CONFIG, StatusIcon_2 };

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
import { BLACK_CIRCLE, BULLET } from "../../utils/permissions/autoModeRulesPrompt.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
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

//@ chunk-mkatyybr.js:651-1441 fingerprint = STATUS_CONFIG (0.341)
/**
 * 状态图标闪光动画的调色板长度与每步时间。
 */
var STATUS_CONFIG = {
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
var AGENT_STATUS_GLYPHS = {
  working: BULLET,
  needsYou: "!",
  idle: "\u25E6",
  failed: "\xD7",
};
var SHIMMER_PALETTE_LENGTH = 8;
var SHIMMER_STEP_MS = 200;
//@ chunk-mkatyybr.js:1441-1516 placement
/**
 * 所有状态图标里最宽的显示宽度（按显示宽度计算）。
 */
function maxStatusIconWidth() {
  return Math.max(...Object.values(STATUS_CONFIG).map((l) => bunStringWidth(l.icon)));
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
  let a = w(20);
  let { status, "aria-label": s, withSpace, slot } = props;
  let c = withSpace === undefined ? false : withSpace;
  if (status === undefined) {
    let p;
    if (a[0] !== slot) {
      p =
        slot &&
        jsxProd_default(Text, {
          children: " ".repeat(statusIconSlotWidth()),
        });
      a[0] = slot;
      a[1] = p;
    } else p = a[1];
    return p;
  }
  let t = STATUS_CONFIG[status];
  let p;
  if (a[2] !== s || a[3] !== t || a[4] !== slot) {
    p = s ?? (slot === "trailing" ? stripSuffix(t.ariaLabel, ":") : t.ariaLabel);
    a[2] = s;
    a[3] = t;
    a[4] = slot;
    a[5] = p;
  } else p = a[5];
  let d = p;
  if (isAgentStatusGlyph(status)) {
    let f;
    if (a[6] !== slot || a[7] !== d || a[8] !== status || a[9] !== c) {
      f = jsxProd_default(StatusGlyph, {
        status,
        spoken: d,
        slot,
        withSpace: c,
      });
      a[6] = slot;
      a[7] = d;
      a[8] = status;
      a[9] = c;
      a[10] = f;
    } else f = a[10];
    return f;
  }
  const color = t.color;
  const dimColor = !t.color;
  let children;
  if (a[11] !== t.icon || a[12] !== slot || a[13] !== d || a[14] !== c) {
    children = renderStatusGlyph(t.icon, d, slot, c);
    a[11] = t.icon;
    a[12] = slot;
    a[13] = d;
    a[14] = c;
    a[15] = children;
  } else children = a[15];
  let k;
  if (a[16] !== t.color || a[17] !== dimColor || a[18] !== children) {
    k = jsxProd_default(Text, {
      color,
      dimColor,
      children,
    });
    a[16] = t.color;
    a[17] = dimColor;
    a[18] = children;
    a[19] = k;
  } else k = a[19];
  return k;
}
//@ chunk-mkatyybr.js:2361-2519 placement
function renderStatusGlyph(l, i, slot, u) {
  let o = slot === undefined ? u && " " : repeatString(" ", statusIconSlotWidth() - bunStringWidth(l));
  return jsxProd_default_2(Fragment, {
    children: [
      slot === "trailing" && o,
      jsxProd_default(Text, {
        "aria-label": i,
        children: l,
      }),
      slot !== "trailing" && o,
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
  let a = w(17);
  let { status, spoken, slot, withSpace } = props;
  let resolvedTheme = useResolvedTheme();
  let p;
  if (a[0] !== resolvedTheme.subtle) {
    p = interpolateColor(resolvedTheme.subtle);
    a[0] = resolvedTheme.subtle;
    a[1] = p;
  } else p = a[1];
  let t = p;
  let d;
  if (a[2] !== resolvedTheme.inactive) {
    d = interpolateColor(resolvedTheme.inactive);
    a[2] = resolvedTheme.inactive;
    a[3] = d;
  } else d = a[3];
  let f = d;
  let { color } = STATUS_CONFIG[status];
  let g = sequential.level >= 2 && t !== null && f !== null;
  const k = g ? BULLET : AGENT_STATUS_GLYPHS[status];
  let K;
  if (a[4] !== slot || a[5] !== spoken || a[6] !== k || a[7] !== withSpace) {
    K = renderStatusGlyph(k, spoken, slot, withSpace);
    a[4] = slot;
    a[5] = spoken;
    a[6] = k;
    a[7] = withSpace;
    a[8] = K;
  } else K = a[8];
  let children = K;
  if (g && status === "working") {
    let S;
    if (a[9] !== f || a[10] !== t || a[11] !== children) {
      S = jsxProd_default(ShimmerDim, {
        dimmer: t,
        dim: f,
        children,
      });
      a[9] = f;
      a[10] = t;
      a[11] = children;
      a[12] = S;
    } else S = a[12];
    return S;
  }
  const dimColor = !color;
  let Q;
  if (a[13] !== color || a[14] !== children || a[15] !== dimColor) {
    Q = jsxProd_default(Text, {
      color,
      dimColor,
      children,
    });
    a[13] = color;
    a[14] = children;
    a[15] = dimColor;
    a[16] = Q;
  } else Q = a[16];
  return Q;
}
//@ chunk-mkatyybr.js:3261-3624 placement
/**
 * 运行中状态的明暗闪烁包装（减弱动画模式下静态）。
 */
function ShimmerDim(props) {
  let d = w(8);
  let { dimmer, dim, children } = props;
  let prefersReducedMotion = usePrefersReducedMotion();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let a = prefersReducedMotion || isScreenReaderEnabled;
  let p = Math.ceil(fullRepaintInterval(SHIMMER_STEP_MS) / SCROLL_JUMP_LINES) * SCROLL_JUMP_LINES;
  let [, t] = useAnimationFrame(a ? null : p);
  let f;
  if (d[0] !== dim || d[1] !== dimmer || d[2] !== a || d[3] !== t) {
    f = a
      ? "subtle"
      : toRGBColor(
          parseRGB(
            dimmer,
            dim,
            cosineEase(Math.floor(t / p) % SHIMMER_PALETTE_LENGTH, SHIMMER_PALETTE_LENGTH),
          ),
        );
    d[0] = dim;
    d[1] = dimmer;
    d[2] = a;
    d[3] = t;
    d[4] = f;
  } else f = d[4];
  let color = f;
  let g;
  if (d[5] !== children || d[6] !== color) {
    g = jsxProd_default(Text, {
      color,
      children,
    });
    d[5] = children;
    d[6] = color;
    d[7] = g;
  } else g = d[7];
  return g;
}
//@ chunk-axsvbsqv.js:14472-14537 fingerprint = StatusIcon (0.661)
function StatusIcon_2(t0) {
  let { icon, color } = getTaskIcon(t0);
  return {
    text: icon,
    color,
  };
}
export { StatusIcon, statusIconSlotWidth, maxStatusIconWidth, STATUS_CONFIG, StatusIcon_2 };

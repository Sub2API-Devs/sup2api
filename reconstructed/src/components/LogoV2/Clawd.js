/**
 * components/LogoV2/Clawd.tsx
 *
 * Clawd 字符画渲染：按姿态（眼/手/脚）拼块字符并着色，含 Apple Terminal 专用版本。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/LogoV2/Clawd.tsx
 * pieces: chunk-8jypjjdf.js (11)
 * attribution: placement 4, callgraph-fingerprint 1, layout 4, fingerprint 2
 */
import { identity } from "../../utils/identity.js";
import { createValueSlot } from "../../utils/valueSlot.js";
import { env } from "../../utils/env.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";

//@ chunk-8jypjjdf.js:11218-11254 placement
/**
 * 导出值：clawdPoseStore（Clawd 姿态 store）；位于「Clawd 字符画渲染：按姿态（眼/手/脚）拼块字符并着色，含 Apple Terminal 专用版本」模块。
 */
var clawdPoseStore = identity(createValueSlot(), (o) => o.set(undefined));
//@ chunk-8jypjjdf.js:11254-11311 placement
/**
 * 读取 Clawd 吉祥物姿态的全局状态（保留的姿态、取用时间、运行次数）。
 */
var getClawdPoseState = () =>
  clawdPoseStore.get() ?? {
    kept: undefined,
    takenAfter: 0,
    runs: 0,
  };
//@ chunk-8jypjjdf.js:11311-11355 placement
/**
 * 清除保留的 Clawd 姿态。
 */
var clearKeptClawdPose = () =>
  clawdPoseStore.set({
    ...getClawdPoseState(),
    kept: undefined,
  });
//@ chunk-8jypjjdf.js:11355-14769 callgraph-fingerprint = APPLE_EYES (0.203)
/**
 * Clawd 字符画的部件表：姿态 → {eyes, arms, feet}；手臂、眼睛、脚、眼睛单行、转身视角各自的方块字符（转身帧带背景着色区间 from/to）。
 */
var CLAWD_POSES = {
  default: {
    eyes: "open",
    arms: "down",
    feet: "both",
  },
  "arms-up": {
    eyes: "open",
    arms: "up",
    feet: "both",
  },
  "look-left": {
    eyes: "left",
    arms: "down",
    feet: "both",
  },
  "look-right": {
    eyes: "right",
    arms: "down",
    feet: "both",
  },
};
var CLAWD_ARM_GLYPHS = {
  down: {
    r1L: " \u2590",
    r1R: "",
    r2L: "\u259D\u259C",
    r2R: "\u2588\u2580",
  },
  up: {
    r1L: "\u2597\u259F",
    r1R: "\u2584",
    r2L: " \u259C",
    r2R: "\u2588\u2598",
  },
  "one-up": {
    r1L: " \u2590",
    r1R: "\u2584",
    r2L: "\u259D\u259C",
    r2R: "\u2588\u2598",
  },
};
var CLAWD_EYE_GLYPHS = {
  open: [
    {
      glyphs: "\u259B\u2588\u2588\u2588\u259B\u2588",
    },
  ],
  left: [
    {
      glyphs: "\u259F\u2588\u2588\u2588\u259F\u2588",
    },
  ],
  right: [
    {
      glyphs: "\u2588\u259F\u2588\u2588\u2588\u259F",
    },
  ],
  closed: [
    {
      glyphs: "\u2582",
      lid: true,
    },
    {
      glyphs: "\u2588\u2588\u2588",
    },
    {
      glyphs: "\u2582",
      lid: true,
    },
    {
      glyphs: "\u2588",
    },
  ],
  wink: [
    {
      glyphs: "\u259B\u2588\u2588\u2588",
    },
    {
      glyphs: "\u2582",
      lid: true,
    },
    {
      glyphs: "\u2588",
    },
  ],
};
var CLAWD_FEET_GLYPHS = {
  both: " \u259D\u259D   \u259D\u259D ",
  left: " \u259D\u259D      ",
  right: "      \u259D\u259D ",
};
var CLAWD_SMALL_EYE_GLYPHS = {
  open: " \u2597   \u2596 ",
  left: " \u2598   \u2598 ",
  right: " \u259D   \u259D ",
  closed: " \u2582   \u2582 ",
  wink: " \u2597   \u2582 ",
};
var CLAWD_TURN_GLYPHS = {
  "right-12": [
    {
      glyphs: " \u2590\u2588\u259C\u2588\u2588\u259B\u2588 ",
      from: 2,
      to: 8,
    },
    {
      glyphs: "\u259D\u259C\u2588\u2588\u2588\u2588\u2588\u2588\u2580",
      from: 2,
      to: 7,
    },
    {
      glyphs: " \u259D\u259D   \u259D\u259D ",
      from: 0,
      to: 0,
    },
  ],
  "right-30": [
    {
      glyphs: "  \u2588\u259B\u2588\u2588\u259B\u258C ",
      from: 2,
      to: 7,
    },
    {
      glyphs: " \u259D\u2588\u2588\u2588\u2588\u2588\u259B ",
      from: 2,
      to: 7,
    },
    {
      glyphs: "  \u2598\u2598  \u2598\u2598 ",
      from: 0,
      to: 0,
    },
  ],
  "right-55": [
    {
      glyphs: "  \u2590\u2588\u259B\u2588\u259C  ",
      from: 3,
      to: 7,
    },
    {
      glyphs: "  \u2590\u2588\u2588\u2588\u2588  ",
      from: 3,
      to: 7,
    },
    {
      glyphs: "  \u259D\u259D \u259D\u259D  ",
      from: 0,
      to: 0,
    },
  ],
  "right-75": [
    {
      glyphs: "   \u2588\u2588\u259B\u258C  ",
      from: 3,
      to: 6,
    },
    {
      glyphs: "   \u2588\u2588\u2588\u258C  ",
      from: 3,
      to: 6,
    },
    {
      glyphs: "   \u2598  \u2598  ",
      from: 0,
      to: 0,
    },
  ],
  edge: [
    {
      glyphs: "   \u2590\u2588\u2588   ",
      from: 4,
      to: 6,
    },
    {
      glyphs: "   \u2590\u2588\u2588   ",
      from: 4,
      to: 6,
    },
    {
      glyphs: "   \u259D \u259D   ",
      from: 0,
      to: 0,
    },
  ],
  "back-105": [
    {
      glyphs: "   \u2588\u2588\u2588\u258C  ",
      from: 3,
      to: 6,
    },
    {
      glyphs: "   \u2588\u2588\u2588\u258C  ",
      from: 3,
      to: 6,
    },
    {
      glyphs: "   \u2598  \u2598  ",
      from: 0,
      to: 0,
    },
  ],
  "back-125": [
    {
      glyphs: "  \u2590\u2588\u2588\u2588\u2588  ",
      from: 3,
      to: 7,
    },
    {
      glyphs: "  \u2590\u2588\u2588\u2588\u2588  ",
      from: 3,
      to: 7,
    },
    {
      glyphs: "  \u259D\u259D \u259D\u259D  ",
      from: 0,
      to: 0,
    },
  ],
  "back-150": [
    {
      glyphs: "  \u2588\u2588\u2588\u2588\u2588\u258C ",
      from: 2,
      to: 7,
    },
    {
      glyphs: " \u259D\u2588\u2588\u2588\u2588\u2588\u259B ",
      from: 2,
      to: 7,
    },
    {
      glyphs: "  \u2598\u2598  \u2598\u2598 ",
      from: 0,
      to: 0,
    },
  ],
  back: [
    {
      glyphs: " \u2590\u2588\u2588\u2588\u2588\u2588\u2588 ",
      from: 2,
      to: 8,
    },
    {
      glyphs: "\u259D\u259C\u2588\u2588\u2588\u2588\u2588\u2588\u2580",
      from: 2,
      to: 7,
    },
    {
      glyphs: " \u259D\u259D   \u259D\u259D ",
      from: 0,
      to: 0,
    },
  ],
  "left-75": [
    {
      glyphs: "   \u259B\u2588\u2588\u258C  ",
      from: 3,
      to: 6,
    },
    {
      glyphs: "   \u2588\u2588\u2588\u258C  ",
      from: 3,
      to: 6,
    },
    {
      glyphs: "   \u2598  \u2598  ",
      from: 0,
      to: 0,
    },
  ],
  "left-55": [
    {
      glyphs: "  \u2590\u259C\u259B\u2588\u2588  ",
      from: 3,
      to: 7,
    },
    {
      glyphs: "  \u2590\u2588\u2588\u2588\u2588  ",
      from: 3,
      to: 7,
    },
    {
      glyphs: "  \u259D\u259D \u259D\u259D  ",
      from: 0,
      to: 0,
    },
  ],
  "left-30": [
    {
      glyphs: "  \u259B\u2588\u2588\u259B\u2588\u258C ",
      from: 2,
      to: 7,
    },
    {
      glyphs: " \u259D\u2588\u2588\u2588\u2588\u2588\u259B ",
      from: 2,
      to: 7,
    },
    {
      glyphs: "  \u2598\u2598  \u2598\u2598 ",
      from: 0,
      to: 0,
    },
  ],
  "left-12": [
    {
      glyphs: " \u2590\u259B\u2588\u2588\u2588\u259C\u2588 ",
      from: 2,
      to: 8,
    },
    {
      glyphs: "\u259D\u259C\u2588\u2588\u2588\u2588\u2588\u2588\u2580",
      from: 2,
      to: 7,
    },
    {
      glyphs: " \u259D\u259D   \u259D\u259D ",
      from: 0,
      to: 0,
    },
  ],
};
//@ chunk-8jypjjdf.js:14769-14820 layout
/**
 * 函数 normalizePose（字符串姿态名转定义）；位于「Clawd 字符画渲染：按姿态（眼/手/脚）拼块字符并着色，含 Apple Terminal 专用版本」模块。
 */
function normalizePose(o) {
  return typeof o === "string" ? CLAWD_POSES[o] : o;
}
//@ chunk-8jypjjdf.js:14820-14877 layout
/**
 * 函数 isPoseSpec（非字符串且带 facing）；位于「Clawd 字符画渲染：按姿态（眼/手/脚）拼块字符并着色，含 Apple Terminal 专用版本」模块。
 */
function isPoseSpec(pose) {
  return typeof pose !== "string" && "facing" in pose;
}
//@ chunk-8jypjjdf.js:14877-14929 placement = chalkForChart (1)
function chalkForChart() {
  return env.terminal !== "Apple_Terminal";
}
//@ chunk-8jypjjdf.js:14929-17028 fingerprint = Clawd (0.367)
function Clawd(t0) {
  let $ = w(47);
  let t;
  if ($[0] !== t0) {
    t = t0 === undefined ? {} : t0;
    $[0] = t0;
    $[1] = t;
  } else t = $[1];
  let { pose, color, paint } = t;
  let p = pose === undefined ? "default" : pose;
  let d = color === undefined ? "clawd_body" : color;
  if (useIsScreenReaderEnabled()) {
    return null;
  }
  if (isPoseSpec(p)) {
    let h;
    if ($[2] !== d || $[3] !== p) {
      h = chalkForChart()
        ? jsxProd_default(ClawdTurnFrame, {
            facing: p.facing,
            color: d,
          })
        : jsxProd_default(AppleTerminalClawd, {
            eyes: "open",
            color: d,
          });
      $[2] = d;
      $[3] = p;
      $[4] = h;
    } else h = $[4];
    return h;
  }
  let h;
  if ($[5] !== p) {
    h = normalizePose(p);
    $[5] = p;
    $[6] = h;
  } else h = $[6];
  let u = h;
  if (!chalkForChart()) {
    let b;
    if ($[7] !== d || $[8] !== u.eyes) {
      b = jsxProd_default(AppleTerminalClawd, {
        eyes: u.eyes,
        color: d,
      });
      $[7] = d;
      $[8] = u.eyes;
      $[9] = b;
    } else b = $[9];
    return b;
  }
  let C = CLAWD_ARM_GLYPHS[u.arms];
  let b;
  if ($[10] !== d || $[11] !== paint) {
    b = paint ?? (() => d);
    $[10] = d;
    $[11] = paint;
    $[12] = b;
  } else b = $[12];
  let paint_2 = b;
  let W;
  if ($[13] !== u.eyes) {
    W = [];
    for (const span of CLAWD_EYE_GLYPHS[u.eyes]) {
      let last = W.at(-1);
      W.push({
        span,
        column: last ? last.column + last.span.glyphs.length : 2,
      });
    }
    $[13] = u.eyes;
    $[14] = W;
  } else W = $[14];
  let H;
  if ($[15] !== C.r1L || $[16] !== paint_2) {
    H = jsxProd_default(renderPaintedGlyphs, {
      glyphs: C.r1L,
      column: 0,
      row: 0,
      paint: paint_2,
    });
    $[15] = C.r1L;
    $[16] = paint_2;
    $[17] = H;
  } else H = $[17];
  let M;
  if ($[18] !== paint_2 || $[19] !== W) {
    M = W.map((I) => {
      let { span, column } = I;
      return jsxProd_default(
        renderPaintedGlyphs,
        {
          glyphs: span.glyphs,
          column,
          row: 0,
          paint: paint_2,
          on: span.lid ? "lid" : "eyes",
        },
        column,
      );
    });
    $[18] = paint_2;
    $[19] = W;
    $[20] = M;
  } else M = $[20];
  let I;
  if ($[21] !== C.r1R || $[22] !== paint_2) {
    I = jsxProd_default(renderPaintedGlyphs, {
      glyphs: C.r1R,
      column: 8,
      row: 0,
      paint: paint_2,
    });
    $[21] = C.r1R;
    $[22] = paint_2;
    $[23] = I;
  } else I = $[23];
  let q;
  if ($[24] !== H || $[25] !== M || $[26] !== I) {
    q = jsxProd_default_2(Text, {
      children: [H, M, I],
    });
    $[24] = H;
    $[25] = M;
    $[26] = I;
    $[27] = q;
  } else q = $[27];
  let A;
  if ($[28] !== C.r2L || $[29] !== paint_2) {
    A = jsxProd_default(renderPaintedGlyphs, {
      glyphs: C.r2L,
      column: 0,
      row: 1,
      paint: paint_2,
    });
    $[28] = C.r2L;
    $[29] = paint_2;
    $[30] = A;
  } else A = $[30];
  let K;
  if ($[31] !== paint_2) {
    K = jsxProd_default(renderPaintedGlyphs, {
      glyphs: "\u2588\u2588\u2588\u2588\u2588",
      column: 2,
      row: 1,
      paint: paint_2,
      on: "eyes",
    });
    $[31] = paint_2;
    $[32] = K;
  } else K = $[32];
  let k;
  if ($[33] !== C.r2R || $[34] !== paint_2) {
    k = jsxProd_default(renderPaintedGlyphs, {
      glyphs: C.r2R,
      column: 7,
      row: 1,
      paint: paint_2,
    });
    $[33] = C.r2R;
    $[34] = paint_2;
    $[35] = k;
  } else k = $[35];
  let R;
  if ($[36] !== A || $[37] !== K || $[38] !== k) {
    R = jsxProd_default_2(Text, {
      children: [A, K, k],
    });
    $[36] = A;
    $[37] = K;
    $[38] = k;
    $[39] = R;
  } else R = $[39];
  const glyphs = CLAWD_FEET_GLYPHS[u.feet];
  let F;
  if ($[40] !== paint_2 || $[41] !== glyphs) {
    F = jsxProd_default(Text, {
      children: jsxProd_default(renderPaintedGlyphs, {
        glyphs,
        column: 0,
        row: 2,
        paint: paint_2,
      }),
    });
    $[40] = paint_2;
    $[41] = glyphs;
    $[42] = F;
  } else F = $[42];
  let J;
  if ($[43] !== R || $[44] !== F || $[45] !== q) {
    J = jsxProd_default_2(Box, {
      flexDirection: "column",
      flexShrink: 0,
      children: [q, R, F],
    });
    $[43] = R;
    $[44] = F;
    $[45] = q;
    $[46] = J;
  } else J = $[46];
  return J;
}
//@ chunk-8jypjjdf.js:17028-17380 layout
/**
 * 把一串字符按 paint(列,行) 给出的颜色分段（相邻同色合并，空格沿用前一段颜色）渲染成 Text 列表；on=lid 时前景背景对调。
 */
function renderPaintedGlyphs({ glyphs, column, row, paint, on }) {
  let m = [];
  for (let [p, d] of Array.from(glyphs).entries()) {
    let last = m.at(-1);
    let h = d === " " && last ? last.color : paint(column + p, row);
    if (last?.color === h) last.glyphs += d;
    else
      m.push({
        glyphs: d,
        color: h,
      });
  }
  return m.map((p, d) =>
    jsxProd_default(
      Text,
      {
        color: on === "lid" ? "clawd_background" : p.color,
        backgroundColor: on === "lid" ? p.color : on && "clawd_background",
        children: p.glyphs,
      },
      d,
    ),
  );
}
//@ chunk-8jypjjdf.js:17380-17829 layout
/**
 * 渲染 Clawd 转身视角帧：每行的 from..to 区间加 clawd_background 背景色。
 */
function ClawdTurnFrame(props) {
  let $ = w(7);
  let { facing, color } = props;
  const l = CLAWD_TURN_GLYPHS[facing];
  let children;
  if ($[0] !== color || $[1] !== l) {
    let p;
    if ($[3] !== color) {
      p = (d, f) => {
        let { glyphs, from, to } = d;
        return jsxProd_default_2(
          Text,
          {
            color,
            children: [
              glyphs.slice(0, from),
              jsxProd_default(Text, {
                backgroundColor: "clawd_background",
                children: glyphs.slice(from, to),
              }),
              glyphs.slice(to),
            ],
          },
          f,
        );
      };
      $[3] = color;
      $[4] = p;
    } else p = $[4];
    children = l.map(p);
    $[0] = color;
    $[1] = l;
    $[2] = children;
  } else children = $[2];
  let p;
  if ($[5] !== children) {
    p = jsxProd_default(Box, {
      flexDirection: "column",
      flexShrink: 0,
      children,
    });
    $[5] = children;
    $[6] = p;
  } else p = $[6];
  return p;
}
//@ chunk-8jypjjdf.js:17829-18653 fingerprint = AppleTerminalClawd (0.558)
function AppleTerminalClawd(props) {
  let $ = w(19);
  let { eyes, color } = props;
  let c;
  if ($[0] !== color) {
    c = jsxProd_default(Text, {
      color,
      children: "\u2597",
    });
    $[0] = color;
    $[1] = c;
  } else c = $[1];
  const children = CLAWD_SMALL_EYE_GLYPHS[eyes];
  let t3;
  if ($[2] !== color || $[3] !== children) {
    t3 = jsxProd_default(Text, {
      color: "clawd_background",
      backgroundColor: color,
      children,
    });
    $[2] = color;
    $[3] = children;
    $[4] = t3;
  } else t3 = $[4];
  let d;
  if ($[5] !== color) {
    d = jsxProd_default(Text, {
      color,
      children: "\u2596",
    });
    $[5] = color;
    $[6] = d;
  } else d = $[6];
  let f;
  if ($[7] !== c || $[8] !== t3 || $[9] !== d) {
    f = jsxProd_default_2(Text, {
      children: [c, t3, d],
    });
    $[7] = c;
    $[8] = t3;
    $[9] = d;
    $[10] = f;
  } else f = $[10];
  let children_2;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    children_2 = " ".repeat(7);
    $[11] = children_2;
  } else children_2 = $[11];
  let u;
  let b;
  if ($[12] !== color) {
    u = jsxProd_default(Text, {
      backgroundColor: color,
      children: children_2,
    });
    b = jsxProd_default(Text, {
      color,
      children: "\u2598\u2598   \u259D\u259D",
    });
    $[12] = color;
    $[13] = u;
    $[14] = b;
  } else {
    u = $[13];
    b = $[14];
  }
  let t8;
  if ($[15] !== f || $[16] !== u || $[17] !== b) {
    t8 = jsxProd_default_2(Box, {
      flexDirection: "column",
      alignItems: "center",
      children: [f, u, b],
    });
    $[15] = f;
    $[16] = u;
    $[17] = b;
    $[18] = t8;
  } else t8 = $[18];
  return t8;
}
export {
  clearKeptClawdPose,
  Clawd,
  isPoseSpec,
  normalizePose,
  chalkForChart,
  getClawdPoseState,
  clawdPoseStore,
};

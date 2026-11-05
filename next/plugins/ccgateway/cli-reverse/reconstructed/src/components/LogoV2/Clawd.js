/**
 * components/LogoV2/Clawd.tsx
 *
 * Clawd 字符画渲染：按姿态（眼/手/脚）拼块字符并着色，含 Apple Terminal 专用版本。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/LogoV2/Clawd.tsx
 * pieces: chunk-tvbhy3tn.js (11)
 * attribution: placement 4, callgraph-fingerprint 1, layout 4, fingerprint 2
 */
import { identity } from "../../utils/identity.js";
import { createValueSlot } from "../../utils/valueSlot.js";
import { env } from "../../utils/env.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-tvbhy3tn.js:11220-11256 placement
/**
 * 导出值：clawdPoseStore（Clawd 姿态 store）；位于「Clawd 字符画渲染：按姿态（眼/手/脚）拼块字符并着色，含 Apple Terminal 专用版本」模块。
 */
var clawdPoseStore; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tvbhy3tn.js:11220", () => {
  clawdPoseStore = identity(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-tvbhy3tn.js:11256-11313 placement
/**
 * 读取 Clawd 吉祥物姿态的全局状态（保留的姿态、取用时间、运行次数）。
 */
var getClawdPoseState = () =>
  clawdPoseStore.get() ?? {
    kept: undefined,
    takenAfter: 0,
    runs: 0,
  };
//@ chunk-tvbhy3tn.js:11313-11357 placement
/**
 * 清除保留的 Clawd 姿态。
 */
var clearKeptClawdPose = () =>
  clawdPoseStore.set({
    ...getClawdPoseState(),
    kept: undefined,
  });
//@ chunk-tvbhy3tn.js:11357-14771 callgraph-fingerprint (2.1.88 match: APPLE_EYES, 0.203)
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
//@ chunk-tvbhy3tn.js:14771-14822 layout
/**
 * 函数 normalizePose（字符串姿态名转定义）；位于「Clawd 字符画渲染：按姿态（眼/手/脚）拼块字符并着色，含 Apple Terminal 专用版本」模块。
 */
function normalizePose(pose) {
  return typeof pose === "string" ? CLAWD_POSES[pose] : pose;
}
//@ chunk-tvbhy3tn.js:14822-14879 layout
/**
 * 函数 isPoseSpec（非字符串且带 facing）；位于「Clawd 字符画渲染：按姿态（眼/手/脚）拼块字符并着色，含 Apple Terminal 专用版本」模块。
 */
function isPoseSpec(poseSpec) {
  return typeof poseSpec !== "string" && "facing" in poseSpec;
}
//@ chunk-tvbhy3tn.js:14879-14931 placement
function notAppleTerminal() {
  return env.terminal !== "Apple_Terminal";
}
//@ chunk-tvbhy3tn.js:14931-17030 fingerprint (2.1.88 match: Clawd, 0.367)
function Clawd(t0) {
  let $ = useMemoCache(47);
  let props;
  if ($[0] !== t0) {
    props = t0 === undefined ? {} : t0;
    $[0] = t0;
    $[1] = props;
  } else props = $[1];
  let { pose, color, paint } = props;
  let poseName = pose === undefined ? "default" : pose;
  let bodyColor = color === undefined ? "clawd_body" : color;
  if (useIsScreenReaderEnabled()) {
    return null;
  }
  if (isPoseSpec(poseName)) {
    let frame;
    if ($[2] !== bodyColor || $[3] !== poseName) {
      frame = notAppleTerminal()
        ? jsxProd_default(ClawdTurnFrame, {
            facing: poseName.facing,
            color: bodyColor,
          })
        : jsxProd_default(AppleTerminalClawd, {
            eyes: "open",
            color: bodyColor,
          });
      $[2] = bodyColor;
      $[3] = poseName;
      $[4] = frame;
    } else frame = $[4];
    return frame;
  }
  let poseSpec;
  if ($[5] !== poseName) {
    poseSpec = normalizePose(poseName);
    $[5] = poseName;
    $[6] = poseSpec;
  } else poseSpec = $[6];
  let poseValue = poseSpec;
  if (!notAppleTerminal()) {
    let smallFrame;
    if ($[7] !== bodyColor || $[8] !== poseValue.eyes) {
      smallFrame = jsxProd_default(AppleTerminalClawd, {
        eyes: poseValue.eyes,
        color: bodyColor,
      });
      $[7] = bodyColor;
      $[8] = poseValue.eyes;
      $[9] = smallFrame;
    } else smallFrame = $[9];
    return smallFrame;
  }
  let arms = CLAWD_ARM_GLYPHS[poseValue.arms];
  let paintFn;
  if ($[10] !== bodyColor || $[11] !== paint) {
    paintFn = paint ?? (() => bodyColor);
    $[10] = bodyColor;
    $[11] = paint;
    $[12] = paintFn;
  } else paintFn = $[12];
  let paint_2 = paintFn;
  let eyeSpans;
  if ($[13] !== poseValue.eyes) {
    eyeSpans = [];
    for (const span of CLAWD_EYE_GLYPHS[poseValue.eyes]) {
      let last = eyeSpans.at(-1);
      eyeSpans.push({
        span,
        column: last ? last.column + last.span.glyphs.length : 2,
      });
    }
    $[13] = poseValue.eyes;
    $[14] = eyeSpans;
  } else eyeSpans = $[14];
  let row1Left;
  if ($[15] !== arms.r1L || $[16] !== paint_2) {
    row1Left = jsxProd_default(renderPaintedGlyphs, {
      glyphs: arms.r1L,
      column: 0,
      row: 0,
      paint: paint_2,
    });
    $[15] = arms.r1L;
    $[16] = paint_2;
    $[17] = row1Left;
  } else row1Left = $[17];
  let row1Eyes;
  if ($[18] !== paint_2 || $[19] !== eyeSpans) {
    row1Eyes = eyeSpans.map((eyeSpan) => {
      let { span, column } = eyeSpan;
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
    $[19] = eyeSpans;
    $[20] = row1Eyes;
  } else row1Eyes = $[20];
  let row1Right;
  if ($[21] !== arms.r1R || $[22] !== paint_2) {
    row1Right = jsxProd_default(renderPaintedGlyphs, {
      glyphs: arms.r1R,
      column: 8,
      row: 0,
      paint: paint_2,
    });
    $[21] = arms.r1R;
    $[22] = paint_2;
    $[23] = row1Right;
  } else row1Right = $[23];
  let row1;
  if ($[24] !== row1Left || $[25] !== row1Eyes || $[26] !== row1Right) {
    row1 = jsxProd_default_2(Text, {
      children: [row1Left, row1Eyes, row1Right],
    });
    $[24] = row1Left;
    $[25] = row1Eyes;
    $[26] = row1Right;
    $[27] = row1;
  } else row1 = $[27];
  let row2Left;
  if ($[28] !== arms.r2L || $[29] !== paint_2) {
    row2Left = jsxProd_default(renderPaintedGlyphs, {
      glyphs: arms.r2L,
      column: 0,
      row: 1,
      paint: paint_2,
    });
    $[28] = arms.r2L;
    $[29] = paint_2;
    $[30] = row2Left;
  } else row2Left = $[30];
  let row2Mid;
  if ($[31] !== paint_2) {
    row2Mid = jsxProd_default(renderPaintedGlyphs, {
      glyphs: "\u2588\u2588\u2588\u2588\u2588",
      column: 2,
      row: 1,
      paint: paint_2,
      on: "eyes",
    });
    $[31] = paint_2;
    $[32] = row2Mid;
  } else row2Mid = $[32];
  let row2Right;
  if ($[33] !== arms.r2R || $[34] !== paint_2) {
    row2Right = jsxProd_default(renderPaintedGlyphs, {
      glyphs: arms.r2R,
      column: 7,
      row: 1,
      paint: paint_2,
    });
    $[33] = arms.r2R;
    $[34] = paint_2;
    $[35] = row2Right;
  } else row2Right = $[35];
  let row2;
  if ($[36] !== row2Left || $[37] !== row2Mid || $[38] !== row2Right) {
    row2 = jsxProd_default_2(Text, {
      children: [row2Left, row2Mid, row2Right],
    });
    $[36] = row2Left;
    $[37] = row2Mid;
    $[38] = row2Right;
    $[39] = row2;
  } else row2 = $[39];
  const glyphs = CLAWD_FEET_GLYPHS[poseValue.feet];
  let feetRow;
  if ($[40] !== paint_2 || $[41] !== glyphs) {
    feetRow = jsxProd_default(Text, {
      children: jsxProd_default(renderPaintedGlyphs, {
        glyphs,
        column: 0,
        row: 2,
        paint: paint_2,
      }),
    });
    $[40] = paint_2;
    $[41] = glyphs;
    $[42] = feetRow;
  } else feetRow = $[42];
  let clawd;
  if ($[43] !== row2 || $[44] !== feetRow || $[45] !== row1) {
    clawd = jsxProd_default_2(Box, {
      flexDirection: "column",
      flexShrink: 0,
      children: [row1, row2, feetRow],
    });
    $[43] = row2;
    $[44] = feetRow;
    $[45] = row1;
    $[46] = clawd;
  } else clawd = $[46];
  return clawd;
}
//@ chunk-tvbhy3tn.js:17030-17382 layout
/**
 * 把一串字符按 paint(列,行) 给出的颜色分段（相邻同色合并，空格沿用前一段颜色）渲染成 Text 列表；on=lid 时前景背景对调。
 */
function renderPaintedGlyphs({ glyphs, column, row, paint, on }) {
  let runs = [];
  for (let [columnOffset, char] of Array.from(glyphs).entries()) {
    let last = runs.at(-1);
    let color = char === " " && last ? last.color : paint(column + columnOffset, row);
    if (last?.color === color) last.glyphs += char;
    else
      runs.push({
        glyphs: char,
        color,
      });
  }
  return runs.map((run, index) =>
    jsxProd_default(
      Text,
      {
        color: on === "lid" ? "clawd_background" : run.color,
        backgroundColor: on === "lid" ? run.color : on && "clawd_background",
        children: run.glyphs,
      },
      index,
    ),
  );
}
//@ chunk-tvbhy3tn.js:17382-17831 layout
/**
 * 渲染 Clawd 转身视角帧：每行的 from..to 区间加 clawd_background 背景色。
 */
function ClawdTurnFrame(props) {
  let $ = useMemoCache(7);
  let { facing, color } = props;
  const rows = CLAWD_TURN_GLYPHS[facing];
  let children;
  if ($[0] !== color || $[1] !== rows) {
    let renderRow;
    if ($[3] !== color) {
      renderRow = (row, index) => {
        let { glyphs, from, to } = row;
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
          index,
        );
      };
      $[3] = color;
      $[4] = renderRow;
    } else renderRow = $[4];
    children = rows.map(renderRow);
    $[0] = color;
    $[1] = rows;
    $[2] = children;
  } else children = $[2];
  let frame;
  if ($[5] !== children) {
    frame = jsxProd_default(Box, {
      flexDirection: "column",
      flexShrink: 0,
      children,
    });
    $[5] = children;
    $[6] = frame;
  } else frame = $[6];
  return frame;
}
//@ chunk-tvbhy3tn.js:17831-18655 fingerprint (2.1.88 match: AppleTerminalClawd, 0.558)
function AppleTerminalClawd(props) {
  let $ = useMemoCache(19);
  let { eyes, color } = props;
  let leftEar;
  if ($[0] !== color) {
    leftEar = jsxProd_default(Text, {
      color,
      children: "\u2597",
    });
    $[0] = color;
    $[1] = leftEar;
  } else leftEar = $[1];
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
  let rightEar;
  if ($[5] !== color) {
    rightEar = jsxProd_default(Text, {
      color,
      children: "\u2596",
    });
    $[5] = color;
    $[6] = rightEar;
  } else rightEar = $[6];
  let head;
  if ($[7] !== leftEar || $[8] !== t3 || $[9] !== rightEar) {
    head = jsxProd_default_2(Text, {
      children: [leftEar, t3, rightEar],
    });
    $[7] = leftEar;
    $[8] = t3;
    $[9] = rightEar;
    $[10] = head;
  } else head = $[10];
  let children_2;
  if ($[11] === MEMO_CACHE_SENTINEL) {
    children_2 = " ".repeat(7);
    $[11] = children_2;
  } else children_2 = $[11];
  let bodyFill;
  let legs;
  if ($[12] !== color) {
    bodyFill = jsxProd_default(Text, {
      backgroundColor: color,
      children: children_2,
    });
    legs = jsxProd_default(Text, {
      color,
      children: "\u2598\u2598   \u259D\u259D",
    });
    $[12] = color;
    $[13] = bodyFill;
    $[14] = legs;
  } else {
    bodyFill = $[13];
    legs = $[14];
  }
  let t8;
  if ($[15] !== head || $[16] !== bodyFill || $[17] !== legs) {
    t8 = jsxProd_default_2(Box, {
      flexDirection: "column",
      alignItems: "center",
      children: [head, bodyFill, legs],
    });
    $[15] = head;
    $[16] = bodyFill;
    $[17] = legs;
    $[18] = t8;
  } else t8 = $[18];
  return t8;
}
export {
  clearKeptClawdPose,
  Clawd,
  notAppleTerminal,
  isPoseSpec,
  normalizePose,
  getClawdPoseState,
  clawdPoseStore,
};

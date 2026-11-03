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
import { ge } from "../../utils/identity.js";
import { to } from "../../utils/valueSlot.js";
import { env } from "../../utils/env.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";

//@ chunk-8jypjjdf.js:11218-11254 placement
var Rmt = ge(to(), (o) => o.set(void 0));
/**
 * 读取 Clawd 吉祥物姿态的全局状态（保留的姿态、取用时间、运行次数）。
 */
//@ chunk-8jypjjdf.js:11254-11311 placement
var getClawdPoseState = () => Rmt.get() ?? { kept: void 0, takenAfter: 0, runs: 0 };
/**
 * 清除保留的 Clawd 姿态。
 */
//@ chunk-8jypjjdf.js:11311-11355 placement
var clearKeptClawdPose = () => Rmt.set({ ...getClawdPoseState(), kept: void 0 });
/**
 * Clawd 字符画的部件表：姿态 → {eyes, arms, feet}；手臂、眼睛、脚、眼睛单行、转身视角各自的方块字符（转身帧带背景着色区间 from/to）。
 */
//@ chunk-8jypjjdf.js:11355-14769 callgraph-fingerprint = APPLE_EYES (0.203)
var CLAWD_POSES = {
    default: { eyes: "open", arms: "down", feet: "both" },
    "arms-up": { eyes: "open", arms: "up", feet: "both" },
    "look-left": { eyes: "left", arms: "down", feet: "both" },
    "look-right": { eyes: "right", arms: "down", feet: "both" },
  },
  CLAWD_ARM_GLYPHS = {
    down: { r1L: " \u2590", r1R: "", r2L: "\u259D\u259C", r2R: "\u2588\u2580" },
    up: { r1L: "\u2597\u259F", r1R: "\u2584", r2L: " \u259C", r2R: "\u2588\u2598" },
    "one-up": { r1L: " \u2590", r1R: "\u2584", r2L: "\u259D\u259C", r2R: "\u2588\u2598" },
  },
  CLAWD_EYE_GLYPHS = {
    open: [{ glyphs: "\u259B\u2588\u2588\u2588\u259B\u2588" }],
    left: [{ glyphs: "\u259F\u2588\u2588\u2588\u259F\u2588" }],
    right: [{ glyphs: "\u2588\u259F\u2588\u2588\u2588\u259F" }],
    closed: [
      { glyphs: "\u2582", lid: !0 },
      { glyphs: "\u2588\u2588\u2588" },
      { glyphs: "\u2582", lid: !0 },
      { glyphs: "\u2588" },
    ],
    wink: [{ glyphs: "\u259B\u2588\u2588\u2588" }, { glyphs: "\u2582", lid: !0 }, { glyphs: "\u2588" }],
  },
  CLAWD_FEET_GLYPHS = {
    both: " \u259D\u259D   \u259D\u259D ",
    left: " \u259D\u259D      ",
    right: "      \u259D\u259D ",
  },
  CLAWD_SMALL_EYE_GLYPHS = {
    open: " \u2597   \u2596 ",
    left: " \u2598   \u2598 ",
    right: " \u259D   \u259D ",
    closed: " \u2582   \u2582 ",
    wink: " \u2597   \u2582 ",
  },
  CLAWD_TURN_GLYPHS = {
    "right-12": [
      { glyphs: " \u2590\u2588\u259C\u2588\u2588\u259B\u2588 ", from: 2, to: 8 },
      { glyphs: "\u259D\u259C\u2588\u2588\u2588\u2588\u2588\u2588\u2580", from: 2, to: 7 },
      { glyphs: " \u259D\u259D   \u259D\u259D ", from: 0, to: 0 },
    ],
    "right-30": [
      { glyphs: "  \u2588\u259B\u2588\u2588\u259B\u258C ", from: 2, to: 7 },
      { glyphs: " \u259D\u2588\u2588\u2588\u2588\u2588\u259B ", from: 2, to: 7 },
      { glyphs: "  \u2598\u2598  \u2598\u2598 ", from: 0, to: 0 },
    ],
    "right-55": [
      { glyphs: "  \u2590\u2588\u259B\u2588\u259C  ", from: 3, to: 7 },
      { glyphs: "  \u2590\u2588\u2588\u2588\u2588  ", from: 3, to: 7 },
      { glyphs: "  \u259D\u259D \u259D\u259D  ", from: 0, to: 0 },
    ],
    "right-75": [
      { glyphs: "   \u2588\u2588\u259B\u258C  ", from: 3, to: 6 },
      { glyphs: "   \u2588\u2588\u2588\u258C  ", from: 3, to: 6 },
      { glyphs: "   \u2598  \u2598  ", from: 0, to: 0 },
    ],
    edge: [
      { glyphs: "   \u2590\u2588\u2588   ", from: 4, to: 6 },
      { glyphs: "   \u2590\u2588\u2588   ", from: 4, to: 6 },
      { glyphs: "   \u259D \u259D   ", from: 0, to: 0 },
    ],
    "back-105": [
      { glyphs: "   \u2588\u2588\u2588\u258C  ", from: 3, to: 6 },
      { glyphs: "   \u2588\u2588\u2588\u258C  ", from: 3, to: 6 },
      { glyphs: "   \u2598  \u2598  ", from: 0, to: 0 },
    ],
    "back-125": [
      { glyphs: "  \u2590\u2588\u2588\u2588\u2588  ", from: 3, to: 7 },
      { glyphs: "  \u2590\u2588\u2588\u2588\u2588  ", from: 3, to: 7 },
      { glyphs: "  \u259D\u259D \u259D\u259D  ", from: 0, to: 0 },
    ],
    "back-150": [
      { glyphs: "  \u2588\u2588\u2588\u2588\u2588\u258C ", from: 2, to: 7 },
      { glyphs: " \u259D\u2588\u2588\u2588\u2588\u2588\u259B ", from: 2, to: 7 },
      { glyphs: "  \u2598\u2598  \u2598\u2598 ", from: 0, to: 0 },
    ],
    back: [
      { glyphs: " \u2590\u2588\u2588\u2588\u2588\u2588\u2588 ", from: 2, to: 8 },
      { glyphs: "\u259D\u259C\u2588\u2588\u2588\u2588\u2588\u2588\u2580", from: 2, to: 7 },
      { glyphs: " \u259D\u259D   \u259D\u259D ", from: 0, to: 0 },
    ],
    "left-75": [
      { glyphs: "   \u259B\u2588\u2588\u258C  ", from: 3, to: 6 },
      { glyphs: "   \u2588\u2588\u2588\u258C  ", from: 3, to: 6 },
      { glyphs: "   \u2598  \u2598  ", from: 0, to: 0 },
    ],
    "left-55": [
      { glyphs: "  \u2590\u259C\u259B\u2588\u2588  ", from: 3, to: 7 },
      { glyphs: "  \u2590\u2588\u2588\u2588\u2588  ", from: 3, to: 7 },
      { glyphs: "  \u259D\u259D \u259D\u259D  ", from: 0, to: 0 },
    ],
    "left-30": [
      { glyphs: "  \u259B\u2588\u2588\u259B\u2588\u258C ", from: 2, to: 7 },
      { glyphs: " \u259D\u2588\u2588\u2588\u2588\u2588\u259B ", from: 2, to: 7 },
      { glyphs: "  \u2598\u2598  \u2598\u2598 ", from: 0, to: 0 },
    ],
    "left-12": [
      { glyphs: " \u2590\u259B\u2588\u2588\u2588\u259C\u2588 ", from: 2, to: 8 },
      { glyphs: "\u259D\u259C\u2588\u2588\u2588\u2588\u2588\u2588\u2580", from: 2, to: 7 },
      { glyphs: " \u259D\u259D   \u259D\u259D ", from: 0, to: 0 },
    ],
  };
//@ chunk-8jypjjdf.js:14769-14820 layout
function ECr(o) {
  return typeof o === "string" ? CLAWD_POSES[o] : o;
}
//@ chunk-8jypjjdf.js:14820-14877 layout
function LFn(o) {
  return typeof o !== "string" && "facing" in o;
}
//@ chunk-8jypjjdf.js:14877-14929 placement = chalkForChart (1)
function chalkForChart() {
  return env.terminal !== "Apple_Terminal";
}
//@ chunk-8jypjjdf.js:14929-17028 fingerprint = Clawd (0.367)
function Clawd(t0) {
  let $ = w(47),
    t;
  if ($[0] !== t0) ((t = t0 === void 0 ? {} : t0), ($[0] = t0), ($[1] = t));
  else t = $[1];
  let { pose: t2, color: color, paint: paint } = t,
    p = t2 === void 0 ? "default" : t2,
    d = color === void 0 ? "clawd_body" : color;
  if (useIsScreenReaderEnabled()) {
    return null;
  }
  if (LFn(p)) {
    let h;
    if ($[2] !== d || $[3] !== p)
      ((h = chalkForChart()
        ? e(ClawdTurnFrame, { facing: p.facing, color: d })
        : e(AppleTerminalClawd, { eyes: "open", color: d })),
        ($[2] = d),
        ($[3] = p),
        ($[4] = h));
    else h = $[4];
    return h;
  }
  let h;
  if ($[5] !== p) ((h = ECr(p)), ($[5] = p), ($[6] = h));
  else h = $[6];
  let u = h;
  if (!chalkForChart()) {
    let b;
    if ($[7] !== d || $[8] !== u.eyes)
      ((b = e(AppleTerminalClawd, { eyes: u.eyes, color: d })), ($[7] = d), ($[8] = u.eyes), ($[9] = b));
    else b = $[9];
    return b;
  }
  let C = CLAWD_ARM_GLYPHS[u.arms],
    b;
  if ($[10] !== d || $[11] !== paint) ((b = paint ?? (() => d)), ($[10] = d), ($[11] = paint), ($[12] = b));
  else b = $[12];
  let g = b,
    W;
  if ($[13] !== u.eyes) {
    W = [];
    for (const B of CLAWD_EYE_GLYPHS[u.eyes]) {
      let at = W.at(-1);
      W.push({ span: B, column: at ? at.column + at.span.glyphs.length : 2 });
    }
    (($[13] = u.eyes), ($[14] = W));
  } else W = $[14];
  let H;
  if ($[15] !== C.r1L || $[16] !== g)
    ((H = e(renderPaintedGlyphs, { glyphs: C.r1L, column: 0, row: 0, paint: g })),
      ($[15] = C.r1L),
      ($[16] = g),
      ($[17] = H));
  else H = $[17];
  let M;
  if ($[18] !== g || $[19] !== W)
    ((M = W.map((I) => {
      let { span: span, column: column } = I;
      return e(
        renderPaintedGlyphs,
        { glyphs: span.glyphs, column: column, row: 0, paint: g, on: span.lid ? "lid" : "eyes" },
        column,
      );
    })),
      ($[18] = g),
      ($[19] = W),
      ($[20] = M));
  else M = $[20];
  let I;
  if ($[21] !== C.r1R || $[22] !== g)
    ((I = e(renderPaintedGlyphs, { glyphs: C.r1R, column: 8, row: 0, paint: g })),
      ($[21] = C.r1R),
      ($[22] = g),
      ($[23] = I));
  else I = $[23];
  let q;
  if ($[24] !== H || $[25] !== M || $[26] !== I)
    ((q = r(Text, { children: [H, M, I] })), ($[24] = H), ($[25] = M), ($[26] = I), ($[27] = q));
  else q = $[27];
  let A;
  if ($[28] !== C.r2L || $[29] !== g)
    ((A = e(renderPaintedGlyphs, { glyphs: C.r2L, column: 0, row: 1, paint: g })),
      ($[28] = C.r2L),
      ($[29] = g),
      ($[30] = A));
  else A = $[30];
  let K;
  if ($[31] !== g)
    ((K = e(renderPaintedGlyphs, {
      glyphs: "\u2588\u2588\u2588\u2588\u2588",
      column: 2,
      row: 1,
      paint: g,
      on: "eyes",
    })),
      ($[31] = g),
      ($[32] = K));
  else K = $[32];
  let k;
  if ($[33] !== C.r2R || $[34] !== g)
    ((k = e(renderPaintedGlyphs, { glyphs: C.r2R, column: 7, row: 1, paint: g })),
      ($[33] = C.r2R),
      ($[34] = g),
      ($[35] = k));
  else k = $[35];
  let R;
  if ($[36] !== A || $[37] !== K || $[38] !== k)
    ((R = r(Text, { children: [A, K, k] })), ($[36] = A), ($[37] = K), ($[38] = k), ($[39] = R));
  else R = $[39];
  const v = CLAWD_FEET_GLYPHS[u.feet];
  let F;
  if ($[40] !== g || $[41] !== v)
    ((F = e(Text, { children: e(renderPaintedGlyphs, { glyphs: v, column: 0, row: 2, paint: g }) })),
      ($[40] = g),
      ($[41] = v),
      ($[42] = F));
  else F = $[42];
  let J;
  if ($[43] !== R || $[44] !== F || $[45] !== q)
    ((J = r(Box, { flexDirection: "column", flexShrink: 0, children: [q, R, F] })),
      ($[43] = R),
      ($[44] = F),
      ($[45] = q),
      ($[46] = J));
  else J = $[46];
  return J;
}
/**
 * 把一串字符按 paint(列,行) 给出的颜色分段（相邻同色合并，空格沿用前一段颜色）渲染成 Text 列表；on=lid 时前景背景对调。
 */
//@ chunk-8jypjjdf.js:17028-17380 layout
function renderPaintedGlyphs({ glyphs: glyphs, column: column, row: row, paint: paint, on: on }) {
  let m = [];
  for (let [p, d] of Array.from(glyphs).entries()) {
    let at = m.at(-1),
      h = d === " " && at ? at.color : paint(column + p, row);
    if (at?.color === h) at.glyphs += d;
    else m.push({ glyphs: d, color: h });
  }
  return m.map((p, d) =>
    e(
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
/**
 * 渲染 Clawd 转身视角帧：每行的 from..to 区间加 clawd_background 背景色。
 */
//@ chunk-8jypjjdf.js:17380-17829 layout
function ClawdTurnFrame(o) {
  let $ = w(7),
    { facing: facing, color: color } = o;
  const l = CLAWD_TURN_GLYPHS[facing];
  let m;
  if ($[0] !== color || $[1] !== l) {
    let p;
    if ($[3] !== color)
      ((p = (d, f) => {
        let { glyphs: glyphs, from: from, to: to } = d;
        return r(
          Text,
          {
            color: color,
            children: [
              glyphs.slice(0, from),
              e(Text, { backgroundColor: "clawd_background", children: glyphs.slice(from, to) }),
              glyphs.slice(to),
            ],
          },
          f,
        );
      }),
        ($[3] = color),
        ($[4] = p));
    else p = $[4];
    m = l.map(p);
    (($[0] = color), ($[1] = l), ($[2] = m));
  } else m = $[2];
  let p;
  if ($[5] !== m)
    ((p = e(Box, { flexDirection: "column", flexShrink: 0, children: m })), ($[5] = m), ($[6] = p));
  else p = $[6];
  return p;
}
//@ chunk-8jypjjdf.js:17829-18653 fingerprint = AppleTerminalClawd (0.558)
function AppleTerminalClawd(t0) {
  let $ = w(19),
    { eyes: eyes, color: color } = t0,
    c;
  if ($[0] !== color) ((c = e(Text, { color: color, children: "\u2597" })), ($[0] = color), ($[1] = c));
  else c = $[1];
  const t2 = CLAWD_SMALL_EYE_GLYPHS[eyes];
  let p;
  if ($[2] !== color || $[3] !== t2)
    ((p = e(Text, { color: "clawd_background", backgroundColor: color, children: t2 })),
      ($[2] = color),
      ($[3] = t2),
      ($[4] = p));
  else p = $[4];
  let d;
  if ($[5] !== color) ((d = e(Text, { color: color, children: "\u2596" })), ($[5] = color), ($[6] = d));
  else d = $[6];
  let f;
  if ($[7] !== c || $[8] !== p || $[9] !== d)
    ((f = r(Text, { children: [c, p, d] })), ($[7] = c), ($[8] = p), ($[9] = d), ($[10] = f));
  else f = $[10];
  let h;
  if ($[11] === MEMO_CACHE_SENTINEL) ((h = " ".repeat(7)), ($[11] = h));
  else h = $[11];
  let u, b;
  if ($[12] !== color)
    ((u = e(Text, { backgroundColor: color, children: h })),
      (b = e(Text, { color: color, children: "\u2598\u2598   \u259D\u259D" })),
      ($[12] = color),
      ($[13] = u),
      ($[14] = b));
  else ((u = $[13]), (b = $[14]));
  let C;
  if ($[15] !== f || $[16] !== u || $[17] !== b)
    ((C = r(Box, { flexDirection: "column", alignItems: "center", children: [f, u, b] })),
      ($[15] = f),
      ($[16] = u),
      ($[17] = b),
      ($[18] = C));
  else C = $[18];
  return C;
}

export { clearKeptClawdPose, Clawd, LFn, ECr, chalkForChart, getClawdPoseState, Rmt };

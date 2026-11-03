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
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { BLACK_CIRCLE, BULLET } from "../../utils/permissions/autoModeRulesPrompt.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { stripSuffix, repeatString } from "../../utils/stringUtils.js";
import { useResolvedTheme } from "./ThemeProvider.js";
import { interpolateColor, toRGBColor, parseRGB, qWe } from "../Spinner/utils.js";
import { sequential } from "../../utils/sequential.js";
import { usePrefersReducedMotion } from "../Spinner/spinnerFlags.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { fullRepaintInterval, useAnimationFrame } from "../../ink/components/Input.js";
import { Xh } from "../../ink/scrollConstants.js";
import { getTaskIcon } from "../TaskListV2.js";

//@ chunk-mkatyybr.js:651-1441 fingerprint = STATUS_CONFIG (0.341)
var STATUS_CONFIG = {
    success: { icon: re.tick, color: "success", ariaLabel: "done:" },
    error: { icon: re.cross, color: "error", ariaLabel: "failed:" },
    warning: { icon: re.warning, color: "warning", ariaLabel: "warning:" },
    info: { icon: re.info, color: "suggestion", ariaLabel: "note:" },
    pending: { icon: re.circle, color: void 0, ariaLabel: "pending:" },
    loading: { icon: "\u2026", color: void 0, ariaLabel: "loading:" },
    running: { icon: BLACK_CIRCLE, color: void 0, ariaLabel: "running:" },
    on: { icon: re.tick, color: "success", ariaLabel: "on:" },
    off: { icon: re.circle, color: void 0, ariaLabel: "off:" },
    working: { icon: BULLET, color: void 0, ariaLabel: "working:" },
    needsYou: { icon: BULLET, color: "warning", ariaLabel: "needs you:" },
    idle: { icon: BULLET, color: void 0, ariaLabel: "idle:" },
    failed: { icon: BULLET, color: "error", ariaLabel: "error:" },
  },
  AGENT_STATUS_GLYPHS = { working: BULLET, needsYou: "!", idle: "\u25E6", failed: "\xD7" },
  L = 8,
  Y = 200;
//@ chunk-mkatyybr.js:1441-1516 placement
function Qmt() {
  return Math.max(...Object.values(STATUS_CONFIG).map((l) => bunStringWidth(l.icon)));
}
//@ chunk-mkatyybr.js:1516-1546 placement
function PUn() {
  return Qmt() + 1;
}
/**
 * 状态图标（成功/失败/运行中等），带无障碍标签与占位空格。
 */
//@ chunk-mkatyybr.js:1546-2361 placement
function StatusIcon(l) {
  let a = w(20),
    { status: status, "aria-label": s, withSpace: withSpace, slot: slot } = l,
    c = withSpace === void 0 ? !1 : withSpace;
  if (status === void 0) {
    let p;
    if (a[0] !== slot) ((p = slot && e(Text, { children: " ".repeat(PUn()) })), (a[0] = slot), (a[1] = p));
    else p = a[1];
    return p;
  }
  let t = STATUS_CONFIG[status],
    p;
  if (a[2] !== s || a[3] !== t || a[4] !== slot)
    ((p = s ?? (slot === "trailing" ? stripSuffix(t.ariaLabel, ":") : t.ariaLabel)),
      (a[2] = s),
      (a[3] = t),
      (a[4] = slot),
      (a[5] = p));
  else p = a[5];
  let d = p;
  if (B(status)) {
    let f;
    if (a[6] !== slot || a[7] !== d || a[8] !== status || a[9] !== c)
      ((f = e(StatusGlyph, { status: status, spoken: d, slot: slot, withSpace: c })),
        (a[6] = slot),
        (a[7] = d),
        (a[8] = status),
        (a[9] = c),
        (a[10] = f));
    else f = a[10];
    return f;
  }
  const color = t.color,
    m = !t.color;
  let g;
  if (a[11] !== t.icon || a[12] !== slot || a[13] !== d || a[14] !== c)
    ((g = renderStatusGlyph(t.icon, d, slot, c)),
      (a[11] = t.icon),
      (a[12] = slot),
      (a[13] = d),
      (a[14] = c),
      (a[15] = g));
  else g = a[15];
  let k;
  if (a[16] !== t.color || a[17] !== m || a[18] !== g)
    ((k = e(Text, { color: color, dimColor: m, children: g })),
      (a[16] = t.color),
      (a[17] = m),
      (a[18] = g),
      (a[19] = k));
  else k = a[19];
  return k;
}
//@ chunk-mkatyybr.js:2361-2519 placement
function renderStatusGlyph(l, i, s, u) {
  let o = s === void 0 ? u && " " : repeatString(" ", PUn() - bunStringWidth(l));
  return r(Fragment, {
    children: [s === "trailing" && o, e(Text, { "aria-label": i, children: l }), s !== "trailing" && o],
  });
}
//@ chunk-mkatyybr.js:2519-2547 placement
function B(l) {
  return l in AGENT_STATUS_GLYPHS;
}
/**
 * 按状态取颜色与字形绘制图标，支持朗读文本。
 */
//@ chunk-mkatyybr.js:2547-3261 placement
function StatusGlyph(l) {
  let a = w(17),
    { status: status, spoken: spoken, slot: slot, withSpace: withSpace } = l,
    c = useResolvedTheme(),
    p;
  if (a[0] !== c.subtle) ((p = interpolateColor(c.subtle)), (a[0] = c.subtle), (a[1] = p));
  else p = a[1];
  let t = p,
    d;
  if (a[2] !== c.inactive) ((d = interpolateColor(c.inactive)), (a[2] = c.inactive), (a[3] = d));
  else d = a[3];
  let f = d,
    { color: color } = STATUS_CONFIG[status],
    g = sequential.level >= 2 && t !== null && f !== null;
  const k = g ? BULLET : AGENT_STATUS_GLYPHS[status];
  let K;
  if (a[4] !== slot || a[5] !== spoken || a[6] !== k || a[7] !== withSpace)
    ((K = renderStatusGlyph(k, spoken, slot, withSpace)),
      (a[4] = slot),
      (a[5] = spoken),
      (a[6] = k),
      (a[7] = withSpace),
      (a[8] = K));
  else K = a[8];
  let b = K;
  if (g && status === "working") {
    let S;
    if (a[9] !== f || a[10] !== t || a[11] !== b)
      ((S = e(ShimmerDim, { dimmer: t, dim: f, children: b })),
        (a[9] = f),
        (a[10] = t),
        (a[11] = b),
        (a[12] = S));
    else S = a[12];
    return S;
  }
  const S = !color;
  let Q;
  if (a[13] !== color || a[14] !== b || a[15] !== S)
    ((Q = e(Text, { color: color, dimColor: S, children: b })),
      (a[13] = color),
      (a[14] = b),
      (a[15] = S),
      (a[16] = Q));
  else Q = a[16];
  return Q;
}
/**
 * 运行中状态的明暗闪烁包装（减弱动画模式下静态）。
 */
//@ chunk-mkatyybr.js:3261-3624 placement
function ShimmerDim(l) {
  let d = w(8),
    { dimmer: dimmer, dim: dim, children: children } = l,
    o = usePrefersReducedMotion(),
    c = useIsScreenReaderEnabled(),
    a = o || c,
    p = Math.ceil(fullRepaintInterval(Y) / Xh) * Xh,
    [, t] = useAnimationFrame(a ? null : p),
    f;
  if (d[0] !== dim || d[1] !== dimmer || d[2] !== a || d[3] !== t)
    ((f = a ? "subtle" : toRGBColor(parseRGB(dimmer, dim, qWe(Math.floor(t / p) % L, L)))),
      (d[0] = dim),
      (d[1] = dimmer),
      (d[2] = a),
      (d[3] = t),
      (d[4] = f));
  else f = d[4];
  let m = f,
    g;
  if (d[5] !== children || d[6] !== m)
    ((g = e(Text, { color: m, children: children })), (d[5] = children), (d[6] = m), (d[7] = g));
  else g = d[7];
  return g;
}
//@ chunk-axsvbsqv.js:14472-14537 fingerprint = StatusIcon (0.661)
function StatusIcon_2(t0) {
  let { icon: icon, color: color } = getTaskIcon(t0);
  return { text: icon, color: color };
}

export { StatusIcon, PUn, Qmt, STATUS_CONFIG, StatusIcon_2 };

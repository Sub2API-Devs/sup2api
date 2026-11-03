/**
 * components/LogoV2/AnimatedClawd.tsx
 *
 * Clawd 吉祥物入场/待机动画：姿态帧序列、首次启动判定（CLAUDE_CODE_FORCE_FIRST_LAUNCH）与 lastClawdEntranceVersion 记录。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/LogoV2/AnimatedClawd.tsx
 * pieces: chunk-ag5x7vhf.js (14)
 * attribution: fingerprint 2, layout 11, callgraph-witnessed 1
 */
import { LFn, ECr, Clawd, chalkForChart } from "./Clawd.js";
import { antEnv } from "../../utils/env.js";
import { isSemverString } from "../../utils/model/modelCatalog/catalogCapabilities.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { gt as gt_2 } from "../../utils/semver.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { Decorative, useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { isReducedMotion } from "../Spinner/spinnerFlags.js";
import { getInitialSettings_2 } from "../../utils/settings/settings.js";
import { y, Oo, R, P } from "../../../vendor/react/cjs/react.production.js";
import { useClock } from "../../ink/components/ClockContext.js";

//@ chunk-ag5x7vhf.js:48678-48727 fingerprint = hold (1)
var yo = 3,
  ho = 9,
  La = 60,
  on = { pose: "default", offset: 0 };
//@ chunk-ag5x7vhf.js:48727-48824 layout
function Xr() {
  return [
    { pose: "default", offset: 1, poof: "dot" },
    { pose: "default", offset: 1, poof: "wave" },
  ];
}
//@ chunk-ag5x7vhf.js:48824-48951 layout
function repeatPoseFrames(m, h, { offset: x = 0, x: T, poof: k, shadow: _ } = {}) {
  return Array.from({ length: h }, () => ({ pose: m, offset: x, x: T, poof: k, shadow: _ }));
}
//@ chunk-ag5x7vhf.js:48951-49019 layout
function Yr(m, h) {
  return m.flatMap((x) => repeatPoseFrames({ facing: x }, 1, { shadow: h }));
}
//@ chunk-ag5x7vhf.js:49019-49081 layout
function vo(m, h = "down", x = "both") {
  return { eyes: m, arms: h, feet: x };
}
/**
 * Clawd 动画帧序列表：每种动画（jump/look/celebrate/skip/spin/peekaboo/drop/waddle/peek/wink/boop/tap/sneeze/turn/coin-hop）是若干 {pose, offset, x, poof, shadow} 帧；CLAWD_ANIMATIONS 按名字索引，CLAWD_ANIMATION_NAMES 列出顺序。
 */
//@ chunk-ag5x7vhf.js:49081-51755 layout
var JUMP_FRAMES = [
    ...Xr(),
    ...repeatPoseFrames("arms-up", 3),
    ...repeatPoseFrames("default", 1),
    ...Xr(),
    ...repeatPoseFrames("arms-up", 3),
    ...repeatPoseFrames("default", 1),
  ],
  LOOK_FRAMES = [
    ...repeatPoseFrames("look-right", 5),
    ...repeatPoseFrames("look-left", 5),
    ...repeatPoseFrames("default", 1),
  ],
  IDLE_LOOK_FRAMES = [
    ...repeatPoseFrames("default", 12),
    ...repeatPoseFrames("look-right", 5),
    ...repeatPoseFrames("look-left", 5),
  ],
  CELEBRATE_FRAMES = [...JUMP_FRAMES, ...repeatPoseFrames("default", 3, { offset: 1 })],
  SPIN_FRAMES = [
    ...repeatPoseFrames("look-left", 2),
    ...repeatPoseFrames("look-right", 2),
    ...repeatPoseFrames("look-left", 2),
    ...repeatPoseFrames("arms-up", 3),
    ...repeatPoseFrames("default", 1),
  ],
  SKIP_FRAMES = [
    ...repeatPoseFrames("default", 1, { offset: 1, x: -ho }),
    ...repeatPoseFrames("arms-up", 2, { x: -6 }),
    ...repeatPoseFrames("default", 1, { x: -6 }),
    ...repeatPoseFrames("default", 1, { offset: 1, x: -6 }),
    ...repeatPoseFrames("arms-up", 2, { x: -3 }),
    ...repeatPoseFrames("default", 1, { x: -3 }),
    ...repeatPoseFrames("default", 1, { offset: 1, x: -3 }),
    ...repeatPoseFrames("arms-up", 2),
    ...Xr(),
    ...repeatPoseFrames("default", 1),
  ],
  BLINK_SETTLE_FRAMES = [...repeatPoseFrames(vo("closed"), 1), on],
  PEEKABOO_FRAMES = [
    ...repeatPoseFrames("default", 1, { offset: yo }),
    ...repeatPoseFrames("default", 3, { offset: 2 }),
    ...repeatPoseFrames("look-right", 3, { offset: 2 }),
    ...repeatPoseFrames("look-left", 3, { offset: 2 }),
    ...repeatPoseFrames("default", 2, { offset: 2 }),
    ...repeatPoseFrames("default", 1, { offset: 1 }),
    ...repeatPoseFrames("arms-up", 4),
    ...repeatPoseFrames("default", 2),
    ...BLINK_SETTLE_FRAMES,
  ],
  DROP_FRAMES = [
    ...repeatPoseFrames("arms-up", 1, { offset: -yo }),
    ...repeatPoseFrames("arms-up", 2, { offset: -2 }),
    ...repeatPoseFrames("arms-up", 2, { offset: -1 }),
    ...repeatPoseFrames("arms-up", 1),
    ...Xr(),
    ...repeatPoseFrames("default", 3),
    ...BLINK_SETTLE_FRAMES,
  ],
  WADDLE_FRAMES = [
    ...repeatPoseFrames("look-right", 1, { x: -ho }),
    ...[-6, -5, -4, -3, -2, -1].flatMap((m) =>
      repeatPoseFrames(vo("right", "down", m % 2 === 0 ? "left" : "right"), 2, { x: m }),
    ),
    ...repeatPoseFrames("look-right", 2),
    ...repeatPoseFrames("default", 2),
    ...BLINK_SETTLE_FRAMES,
  ],
  PEEK_FRAMES = [
    ...repeatPoseFrames("look-right", 1, { x: -ho }),
    ...repeatPoseFrames("look-right", 5, { x: -6 }),
    ...repeatPoseFrames("look-right", 3, { x: -ho }),
    ...repeatPoseFrames("look-right", 4, { x: -5 }),
    ...repeatPoseFrames("arms-up", 2, { x: -3 }),
    ...repeatPoseFrames("arms-up", 2),
    ...Xr(),
    on,
  ],
  WINK_FRAMES = [...repeatPoseFrames(vo("wink"), 5), on],
  BOOP_FRAMES = [
    ...repeatPoseFrames(vo("closed"), 1, { offset: 1, poof: "dot" }),
    ...repeatPoseFrames(vo("closed"), 2, { offset: 1, poof: "wave" }),
    ...repeatPoseFrames("look-left", 4),
    ...repeatPoseFrames("default", 2),
    ...BLINK_SETTLE_FRAMES,
  ],
  TAP_FRAMES = [
    ...repeatPoseFrames(vo("open", "down", "left"), 2),
    ...repeatPoseFrames(vo("open", "down", "right"), 2),
    ...repeatPoseFrames(vo("open", "down", "left"), 2),
    ...repeatPoseFrames(vo("open", "down", "right"), 2),
    ...repeatPoseFrames(vo("open", "down", "left"), 1),
    ...repeatPoseFrames(vo("open", "down", "right"), 1),
    ...repeatPoseFrames("arms-up", 3),
    on,
  ],
  SNEEZE_FRAMES = [
    ...repeatPoseFrames(vo("closed", "up"), 4),
    ...repeatPoseFrames(vo("closed"), 2, { offset: 1, poof: "wave" }),
    ...repeatPoseFrames(vo("closed"), 2),
    ...repeatPoseFrames("default", 2),
    ...BLINK_SETTLE_FRAMES,
  ],
  TURN_FRAMES = [
    ...Yr(["right-12", "right-30", "right-55", "right-75", "edge"]),
    ...Yr(["back-105", "back-125", "back-150", "back", "back"]),
    ...Yr(["back-150", "back-125", "back-105", "edge"]),
    ...Yr(["left-75", "left-55", "left-30", "left-12"]),
    on,
  ],
  COIN_HOP_FRAMES = [
    ...repeatPoseFrames("default", 2, { offset: 1 }),
    ...repeatPoseFrames("arms-up", 1, { shadow: "wide" }),
    ...Yr(["right-55", "edge", "back-125", "back"], "narrow"),
    ...Yr(["back-125", "edge", "left-55"], "narrow"),
    ...repeatPoseFrames("arms-up", 1, { shadow: "wide" }),
    ...Xr(),
    on,
  ],
  CLAWD_ANIMATIONS = {
    jump: JUMP_FRAMES,
    look: LOOK_FRAMES,
    celebrate: CELEBRATE_FRAMES,
    skip: SKIP_FRAMES,
    spin: SPIN_FRAMES,
    peekaboo: PEEKABOO_FRAMES,
    drop: DROP_FRAMES,
    waddle: WADDLE_FRAMES,
    peek: PEEK_FRAMES,
    wink: WINK_FRAMES,
    boop: BOOP_FRAMES,
    tap: TAP_FRAMES,
    sneeze: SNEEZE_FRAMES,
    turn: TURN_FRAMES,
    "coin-hop": COIN_HOP_FRAMES,
  },
  CLAWD_ANIMATION_NAMES = [
    "skip",
    "jump",
    "look",
    "spin",
    "peekaboo",
    "drop",
    "waddle",
    "peek",
    "wink",
    "boop",
    "tap",
    "sneeze",
    "turn",
    "coin-hop",
  ],
  IN_PLACE_ANIMATION_NAMES = CLAWD_ANIMATION_NAMES.filter((m) => (CLAWD_ANIMATIONS[m][0]?.x ?? 0) === 0);
/**
 * 不允许移动时，过滤掉首帧/任意帧带特殊姿态或首帧是静止睁眼原位的动画，只留下适合入场的动画名；允许时原样返回。
 */
//@ chunk-ag5x7vhf.js:51755-51954 layout
function filterEntranceAnimations(m, h) {
  if (h) return m;
  return m.filter((x) => {
    let T = CLAWD_ANIMATIONS[x],
      k = T[0];
    if (k === void 0 || LFn(k.pose)) return !1;
    return !T.some((_) => LFn(_.pose)) && (ECr(k.pose).eyes !== "open" || k.offset !== 0 || (k.x ?? 0) !== 0);
  });
}
//@ chunk-ag5x7vhf.js:51954-52141 layout
function withLeadInFrames(m, h) {
  let x = CLAWD_ANIMATIONS[m],
    T = x[0];
  if (!h || T === void 0) return x;
  let _ = (T.x ?? 0) !== 0 || Math.abs(T.offset) >= yo ? T : on,
    max = Math.max(1, Math.round(h / La));
  return [...Array.from({ length: max }, () => _), ...x];
}
/**
 * 读 CLAUDE_CODE_FORCE_FIRST_LAUNCH：是 semver 时按该版本当作上次见过的版本；为真值时当作从未见过；未设置或假值返回 undefined。
 */
//@ chunk-ag5x7vhf.js:52141-52296 layout
function getForcedFirstLaunch() {
  let CLAUDE_CODE_FORCE_FIRST_LAUNCH = antEnv.CLAUDE_CODE_FORCE_FIRST_LAUNCH;
  if (CLAUDE_CODE_FORCE_FIRST_LAUNCH === void 0) return;
  if (isSemverString(CLAUDE_CODE_FORCE_FIRST_LAUNCH))
    return { pretendLastSeen: CLAUDE_CODE_FORCE_FIRST_LAUNCH };
  return isEnvTruthy(CLAUDE_CODE_FORCE_FIRST_LAUNCH) ? { pretendLastSeen: void 0 } : void 0;
}
//@ chunk-ag5x7vhf.js:52296-52873 layout
function isNewerClawdEntranceVersion(
  m,
  h = {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.316",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-10-30T23:28:13Z",
    GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  }.VERSION,
) {
  if (!isSemverString(h)) return !1;
  if (!isSemverString(m)) return !0;
  try {
    return gt_2(h, m);
  } catch {
    return !0;
  }
}
/**
 * 若当前版本比 lastClawdEntranceVersion 新，返回把它更新为当前版本（2.1.316）的新配置，否则原样返回。
 */
//@ chunk-ag5x7vhf.js:52873-53447 layout
function markClawdEntranceSeen(config) {
  return isNewerClawdEntranceVersion(config.lastClawdEntranceVersion)
    ? {
        ...config,
        lastClawdEntranceVersion: {
          ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
          PACKAGE_URL: "@anthropic-ai/claude-code",
          README_URL: "https://code.claude.com/docs/en/overview",
          VERSION: "2.1.316",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-10-30T23:28:13Z",
          GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
      }
    : config;
}
//@ chunk-ag5x7vhf.js:53447-53567 layout
var POOF_GLYPHS = { dot: "\xB7", wave: "~" },
  SHADOW_GLYPHS = { wide: { glyphs: "\u2581\u2581\u2581", left: 3 }, narrow: { glyphs: "\u2581", left: 4 } },
  nextFrameIndex = (m) => m + 1;
//@ chunk-ag5x7vhf.js:53567-55252 callgraph-witnessed = AnimatedClawd (0.3)
function AnimatedClawd(m) {
  let $ = w(28),
    x;
  if ($[0] !== m) ((x = m === void 0 ? {} : m), ($[0] = m), ($[1] = x));
  else x = $[1];
  let {
      autoplay: autoplay,
      sequence: sequence,
      delayMs: delayMs,
      onComplete: onComplete,
      reserveCrouchRow: reserveCrouchRow,
      color: color,
      rest: rest,
    } = x,
    V = autoplay === void 0 ? !1 : autoplay,
    W = reserveCrouchRow === void 0 ? !1 : reserveCrouchRow,
    {
      pose: pose,
      bounceOffset: bounceOffset,
      x: q,
      poof: poof,
      shadow: shadow,
      isPlaying: isPlaying,
      onClick: onClick,
    } = useClawdAnimation(V, sequence, delayMs, onComplete),
    Re = W ? yo + 1 : yo,
    We = isPlaying ? void 0 : rest;
  const fe = ho + (rest?.heldWidth ?? 0),
    Fe = bounceOffset > 1 ? bounceOffset + Re - yo : bounceOffset,
    te = We?.pose ?? pose,
    me = We?.paint;
  let se;
  if ($[2] !== color || $[3] !== te || $[4] !== me)
    ((se = e(Clawd, { pose: te, color: color, paint: me })),
      ($[2] = color),
      ($[3] = te),
      ($[4] = me),
      ($[5] = se));
  else se = $[5];
  let _e;
  if ($[6] !== Fe || $[7] !== se || $[8] !== q)
    ((_e = e(Box, { marginTop: Fe, marginLeft: q, flexShrink: 0, children: se })),
      ($[6] = Fe),
      ($[7] = se),
      ($[8] = q),
      ($[9] = _e));
  else _e = $[9];
  let oe;
  if ($[10] !== bounceOffset || $[11] !== poof)
    ((oe =
      poof && bounceOffset > 0
        ? r(Fragment, {
            children: [
              e(Box, {
                position: "absolute",
                top: yo - 1,
                left: 0,
                children: e(Text, { color: "inactive", children: POOF_GLYPHS[poof] }),
              }),
              e(Box, {
                position: "absolute",
                top: yo - 1,
                right: 0,
                children: e(Text, { color: "inactive", children: POOF_GLYPHS[poof] }),
              }),
            ],
          })
        : null),
      ($[10] = bounceOffset),
      ($[11] = poof),
      ($[12] = oe));
  else oe = $[12];
  let ve;
  if ($[13] !== shadow)
    ((ve = shadow
      ? e(Box, {
          position: "absolute",
          top: yo - 1,
          left: SHADOW_GLYPHS[shadow].left,
          children: e(Text, { color: "inactive", children: SHADOW_GLYPHS[shadow].glyphs }),
        })
      : null),
      ($[13] = shadow),
      ($[14] = ve));
  else ve = $[14];
  let Ee;
  if ($[15] !== Re || $[16] !== oe || $[17] !== ve || $[18] !== _e)
    ((Ee = r(Box, {
      height: Re,
      width: ho,
      flexDirection: "column",
      flexShrink: 0,
      overflow: "hidden",
      children: [_e, oe, ve],
    })),
      ($[15] = Re),
      ($[16] = oe),
      ($[17] = ve),
      ($[18] = _e),
      ($[19] = Ee));
  else Ee = $[19];
  let He;
  if ($[20] !== We)
    ((He = We ? e(Box, { flexShrink: 0, children: We.held }) : null), ($[20] = We), ($[21] = He));
  else He = $[21];
  let Ue;
  if ($[22] !== Re || $[23] !== onClick || $[24] !== Ee || $[25] !== He || $[26] !== fe)
    ((Ue = e(Decorative, {
      children: r(Box, {
        height: Re,
        width: fe,
        flexShrink: 0,
        noSelect: !0,
        onClick: onClick,
        children: [Ee, He],
      }),
    })),
      ($[22] = Re),
      ($[23] = onClick),
      ($[24] = Ee),
      ($[25] = He),
      ($[26] = fe),
      ($[27] = Ue));
  else Ue = $[27];
  return Ue;
}
//@ chunk-ag5x7vhf.js:55252-56868 fingerprint = useClawdAnimation (0.646)
function useClawdAnimation(m, h, x, T) {
  let $ = w(40),
    k = useIsScreenReaderEnabled(),
    I;
  if ($[0] !== k)
    ((I = () => isReducedMotion(getInitialSettings_2().prefersReducedMotion) || k), ($[0] = k), ($[1] = I));
  else I = $[1];
  let [D] = y(I),
    A = (m || h !== void 0) && !D,
    [L, V] = y(A ? 0 : -1),
    W;
  if ($[2] !== m || $[3] !== x || $[4] !== h)
    ((W = () => (h ? withLeadInFrames(h, x) : m ? IDLE_LOOK_FRAMES : CLAWD_ANIMATIONS.jump)),
      ($[2] = m),
      ($[3] = x),
      ($[4] = h),
      ($[5] = W));
  else W = $[5];
  let [z, K] = y(W),
    q;
  if ($[6] !== T) ((q = () => T?.()), ($[6] = T), ($[7] = q));
  else q = $[7];
  let Y = Oo(q),
    pe = R(!h),
    xe = useClock(),
    ge;
  if ($[8] !== Y || $[9] !== D)
    ((ge = () => {
      if (D) Y();
    }),
      ($[8] = Y),
      ($[9] = D),
      ($[10] = ge));
  else ge = $[10];
  let Re;
  if ($[11] !== D) ((Re = [D]), ($[11] = D), ($[12] = Re));
  else Re = $[12];
  P(ge, Re);
  let We;
  if ($[13] !== m || $[14] !== L || $[15] !== D)
    ((We = () => {
      if (m || D || L !== -1 || !pe.current) {
        return;
      }
      let fe = filterEntranceAnimations(IN_PLACE_ANIMATION_NAMES, chalkForChart());
      (K(CLAWD_ANIMATIONS[fe[Math.floor(Math.random() * fe.length)]]), V(0));
    }),
      ($[13] = m),
      ($[14] = L),
      ($[15] = D),
      ($[16] = We));
  else We = $[16];
  let Fe = We,
    te;
  if ($[17] !== m || $[18] !== xe || $[19] !== Y || $[20] !== L || $[21] !== z || $[22] !== h)
    ((te = () => {
      if (L === -1) {
        return;
      }
      if (L >= z.length) {
        ((pe.current = !0), Y(), V(m && !h ? 0 : -1));
        return;
      }
      return xe.setTimeout(() => V(nextFrameIndex), La);
    }),
      ($[17] = m),
      ($[18] = xe),
      ($[19] = Y),
      ($[20] = L),
      ($[21] = z),
      ($[22] = h),
      ($[23] = te));
  else te = $[23];
  let me;
  if ($[24] !== m || $[25] !== xe || $[26] !== L || $[27] !== z || $[28] !== h)
    ((me = [L, z, m, h, xe]), ($[24] = m), ($[25] = xe), ($[26] = L), ($[27] = z), ($[28] = h), ($[29] = me));
  else me = $[29];
  P(te, me);
  let se;
  if ($[30] !== h) ((se = h ? CLAWD_ANIMATIONS[h].at(-1) : on), ($[30] = h), ($[31] = se));
  else se = $[31];
  let _e = se,
    oe = L >= 0 && L < z.length,
    current = oe ? z[L] : _e;
  const Ee = current.x ?? 0;
  let He;
  if (
    $[32] !== current.offset ||
    $[33] !== current.poof ||
    $[34] !== current.pose ||
    $[35] !== current.shadow ||
    $[36] !== oe ||
    $[37] !== Fe ||
    $[38] !== Ee
  )
    ((He = {
      pose: current.pose,
      bounceOffset: current.offset,
      x: Ee,
      poof: current.poof,
      shadow: current.shadow,
      isPlaying: oe,
      onClick: Fe,
    }),
      ($[32] = current.offset),
      ($[33] = current.poof),
      ($[34] = current.pose),
      ($[35] = current.shadow),
      ($[36] = oe),
      ($[37] = Fe),
      ($[38] = Ee),
      ($[39] = He));
  else He = $[39];
  return He;
}

export {
  AnimatedClawd,
  getForcedFirstLaunch,
  isNewerClawdEntranceVersion,
  filterEntranceAnimations,
  CLAWD_ANIMATION_NAMES,
  markClawdEntranceSeen,
  ho,
};

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
import { isPoseSpec, normalizePose, Clawd, chalkForChart } from "./Clawd.js";
import { antEnv } from "../../utils/env.js";
import { isSemverString } from "../../utils/model/modelCatalog/catalogCapabilities.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { semverGte } from "../../utils/semver.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { Decorative, useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { isReducedMotion } from "../Spinner/spinnerFlags.js";
import { getInitialSettings_2 } from "../../utils/settings/settings.js";
import { y, Oo, R, P } from "../../../vendor/react/cjs/react.production.js";
import { useClock } from "../../ink/components/ClockContext.js";

//@ chunk-ag5x7vhf.js:48678-48727 fingerprint = hold (1)
var CLAWD_MIN_OFFSET = 3;
var CLAWD_BASE_WIDTH = 9;
var CLAWD_FRAME_WIDTH = 60;
var DEFAULT_CLAWD_FRAME = {
  pose: "default",
  offset: 0,
};
//@ chunk-ag5x7vhf.js:48727-48824 layout
function poofFrames() {
  return [
    {
      pose: "default",
      offset: 1,
      poof: "dot",
    },
    {
      pose: "default",
      offset: 1,
      poof: "wave",
    },
  ];
}
//@ chunk-ag5x7vhf.js:48824-48951 layout
function repeatPoseFrames(pose, h, { offset: x = 0, x: T, poof: k, shadow: _ } = {}) {
  return Array.from(
    {
      length: h,
    },
    () => ({
      pose,
      offset: x,
      x: T,
      poof: k,
      shadow: _,
    }),
  );
}
//@ chunk-ag5x7vhf.js:48951-49019 layout
function turnFrames(m, shadow) {
  return m.flatMap((facing) =>
    repeatPoseFrames(
      {
        facing,
      },
      1,
      {
        shadow,
      },
    ),
  );
}
//@ chunk-ag5x7vhf.js:49019-49081 layout
function pose(eyes, arms = "down", feet = "both") {
  return {
    eyes,
    arms,
    feet,
  };
}
//@ chunk-ag5x7vhf.js:49081-51755 layout
/**
 * Clawd 动画帧序列表：每种动画（jump/look/celebrate/skip/spin/peekaboo/drop/waddle/peek/wink/boop/tap/sneeze/turn/coin-hop）是若干 {pose, offset, x, poof, shadow} 帧；CLAWD_ANIMATIONS 按名字索引，CLAWD_ANIMATION_NAMES 列出顺序。
 */
var JUMP_FRAMES = [
  ...poofFrames(),
  ...repeatPoseFrames("arms-up", 3),
  ...repeatPoseFrames("default", 1),
  ...poofFrames(),
  ...repeatPoseFrames("arms-up", 3),
  ...repeatPoseFrames("default", 1),
];
var LOOK_FRAMES = [
  ...repeatPoseFrames("look-right", 5),
  ...repeatPoseFrames("look-left", 5),
  ...repeatPoseFrames("default", 1),
];
var IDLE_LOOK_FRAMES = [
  ...repeatPoseFrames("default", 12),
  ...repeatPoseFrames("look-right", 5),
  ...repeatPoseFrames("look-left", 5),
];
var CELEBRATE_FRAMES = [
  ...JUMP_FRAMES,
  ...repeatPoseFrames("default", 3, {
    offset: 1,
  }),
];
var SPIN_FRAMES = [
  ...repeatPoseFrames("look-left", 2),
  ...repeatPoseFrames("look-right", 2),
  ...repeatPoseFrames("look-left", 2),
  ...repeatPoseFrames("arms-up", 3),
  ...repeatPoseFrames("default", 1),
];
var SKIP_FRAMES = [
  ...repeatPoseFrames("default", 1, {
    offset: 1,
    x: -CLAWD_BASE_WIDTH,
  }),
  ...repeatPoseFrames("arms-up", 2, {
    x: -6,
  }),
  ...repeatPoseFrames("default", 1, {
    x: -6,
  }),
  ...repeatPoseFrames("default", 1, {
    offset: 1,
    x: -6,
  }),
  ...repeatPoseFrames("arms-up", 2, {
    x: -3,
  }),
  ...repeatPoseFrames("default", 1, {
    x: -3,
  }),
  ...repeatPoseFrames("default", 1, {
    offset: 1,
    x: -3,
  }),
  ...repeatPoseFrames("arms-up", 2),
  ...poofFrames(),
  ...repeatPoseFrames("default", 1),
];
var BLINK_SETTLE_FRAMES = [...repeatPoseFrames(pose("closed"), 1), DEFAULT_CLAWD_FRAME];
var PEEKABOO_FRAMES = [
  ...repeatPoseFrames("default", 1, {
    offset: CLAWD_MIN_OFFSET,
  }),
  ...repeatPoseFrames("default", 3, {
    offset: 2,
  }),
  ...repeatPoseFrames("look-right", 3, {
    offset: 2,
  }),
  ...repeatPoseFrames("look-left", 3, {
    offset: 2,
  }),
  ...repeatPoseFrames("default", 2, {
    offset: 2,
  }),
  ...repeatPoseFrames("default", 1, {
    offset: 1,
  }),
  ...repeatPoseFrames("arms-up", 4),
  ...repeatPoseFrames("default", 2),
  ...BLINK_SETTLE_FRAMES,
];
var DROP_FRAMES = [
  ...repeatPoseFrames("arms-up", 1, {
    offset: -CLAWD_MIN_OFFSET,
  }),
  ...repeatPoseFrames("arms-up", 2, {
    offset: -2,
  }),
  ...repeatPoseFrames("arms-up", 2, {
    offset: -1,
  }),
  ...repeatPoseFrames("arms-up", 1),
  ...poofFrames(),
  ...repeatPoseFrames("default", 3),
  ...BLINK_SETTLE_FRAMES,
];
var WADDLE_FRAMES = [
  ...repeatPoseFrames("look-right", 1, {
    x: -CLAWD_BASE_WIDTH,
  }),
  ...[-6, -5, -4, -3, -2, -1].flatMap((m) =>
    repeatPoseFrames(pose("right", "down", m % 2 === 0 ? "left" : "right"), 2, {
      x: m,
    }),
  ),
  ...repeatPoseFrames("look-right", 2),
  ...repeatPoseFrames("default", 2),
  ...BLINK_SETTLE_FRAMES,
];
var PEEK_FRAMES = [
  ...repeatPoseFrames("look-right", 1, {
    x: -CLAWD_BASE_WIDTH,
  }),
  ...repeatPoseFrames("look-right", 5, {
    x: -6,
  }),
  ...repeatPoseFrames("look-right", 3, {
    x: -CLAWD_BASE_WIDTH,
  }),
  ...repeatPoseFrames("look-right", 4, {
    x: -5,
  }),
  ...repeatPoseFrames("arms-up", 2, {
    x: -3,
  }),
  ...repeatPoseFrames("arms-up", 2),
  ...poofFrames(),
  DEFAULT_CLAWD_FRAME,
];
var WINK_FRAMES = [...repeatPoseFrames(pose("wink"), 5), DEFAULT_CLAWD_FRAME];
var BOOP_FRAMES = [
  ...repeatPoseFrames(pose("closed"), 1, {
    offset: 1,
    poof: "dot",
  }),
  ...repeatPoseFrames(pose("closed"), 2, {
    offset: 1,
    poof: "wave",
  }),
  ...repeatPoseFrames("look-left", 4),
  ...repeatPoseFrames("default", 2),
  ...BLINK_SETTLE_FRAMES,
];
var TAP_FRAMES = [
  ...repeatPoseFrames(pose("open", "down", "left"), 2),
  ...repeatPoseFrames(pose("open", "down", "right"), 2),
  ...repeatPoseFrames(pose("open", "down", "left"), 2),
  ...repeatPoseFrames(pose("open", "down", "right"), 2),
  ...repeatPoseFrames(pose("open", "down", "left"), 1),
  ...repeatPoseFrames(pose("open", "down", "right"), 1),
  ...repeatPoseFrames("arms-up", 3),
  DEFAULT_CLAWD_FRAME,
];
var SNEEZE_FRAMES = [
  ...repeatPoseFrames(pose("closed", "up"), 4),
  ...repeatPoseFrames(pose("closed"), 2, {
    offset: 1,
    poof: "wave",
  }),
  ...repeatPoseFrames(pose("closed"), 2),
  ...repeatPoseFrames("default", 2),
  ...BLINK_SETTLE_FRAMES,
];
var TURN_FRAMES = [
  ...turnFrames(["right-12", "right-30", "right-55", "right-75", "edge"]),
  ...turnFrames(["back-105", "back-125", "back-150", "back", "back"]),
  ...turnFrames(["back-150", "back-125", "back-105", "edge"]),
  ...turnFrames(["left-75", "left-55", "left-30", "left-12"]),
  DEFAULT_CLAWD_FRAME,
];
var COIN_HOP_FRAMES = [
  ...repeatPoseFrames("default", 2, {
    offset: 1,
  }),
  ...repeatPoseFrames("arms-up", 1, {
    shadow: "wide",
  }),
  ...turnFrames(["right-55", "edge", "back-125", "back"], "narrow"),
  ...turnFrames(["back-125", "edge", "left-55"], "narrow"),
  ...repeatPoseFrames("arms-up", 1, {
    shadow: "wide",
  }),
  ...poofFrames(),
  DEFAULT_CLAWD_FRAME,
];
var CLAWD_ANIMATIONS = {
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
};
var CLAWD_ANIMATION_NAMES = [
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
];
var IN_PLACE_ANIMATION_NAMES = CLAWD_ANIMATION_NAMES.filter((m) => (CLAWD_ANIMATIONS[m][0]?.x ?? 0) === 0);
//@ chunk-ag5x7vhf.js:51755-51954 layout
/**
 * 不允许移动时，过滤掉首帧/任意帧带特殊姿态或首帧是静止睁眼原位的动画，只留下适合入场的动画名；允许时原样返回。
 */
function filterEntranceAnimations(m, h) {
  if (h) return m;
  return m.filter((x) => {
    let T = CLAWD_ANIMATIONS[x];
    let k = T[0];
    if (k === undefined || isPoseSpec(k.pose)) return false;
    return (
      !T.some((_) => isPoseSpec(_.pose)) &&
      (normalizePose(k.pose).eyes !== "open" || k.offset !== 0 || (k.x ?? 0) !== 0)
    );
  });
}
//@ chunk-ag5x7vhf.js:51954-52141 layout
function withLeadInFrames(m, h) {
  let x = CLAWD_ANIMATIONS[m];
  let T = x[0];
  if (!h || T === undefined) return x;
  let _ = (T.x ?? 0) !== 0 || Math.abs(T.offset) >= CLAWD_MIN_OFFSET ? T : DEFAULT_CLAWD_FRAME;
  let max = Math.max(1, Math.round(h / CLAWD_FRAME_WIDTH));
  return [
    ...Array.from(
      {
        length: max,
      },
      () => _,
    ),
    ...x,
  ];
}
//@ chunk-ag5x7vhf.js:52141-52296 layout
/**
 * 读 CLAUDE_CODE_FORCE_FIRST_LAUNCH：是 semver 时按该版本当作上次见过的版本；为真值时当作从未见过；未设置或假值返回 undefined。
 */
function getForcedFirstLaunch() {
  let CLAUDE_CODE_FORCE_FIRST_LAUNCH = antEnv.CLAUDE_CODE_FORCE_FIRST_LAUNCH;
  if (CLAUDE_CODE_FORCE_FIRST_LAUNCH === undefined) return;
  if (isSemverString(CLAUDE_CODE_FORCE_FIRST_LAUNCH))
    return {
      pretendLastSeen: CLAUDE_CODE_FORCE_FIRST_LAUNCH,
    };
  return isEnvTruthy(CLAUDE_CODE_FORCE_FIRST_LAUNCH)
    ? {
        pretendLastSeen: undefined,
      }
    : undefined;
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
  if (!isSemverString(h)) return false;
  if (!isSemverString(m)) return true;
  try {
    return semverGte(h, m);
  } catch {
    return true;
  }
}
//@ chunk-ag5x7vhf.js:52873-53447 layout
/**
 * 若当前版本比 lastClawdEntranceVersion 新，返回把它更新为当前版本（2.1.316）的新配置，否则原样返回。
 */
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
var POOF_GLYPHS = {
  dot: "\xB7",
  wave: "~",
};
var SHADOW_GLYPHS = {
  wide: {
    glyphs: "\u2581\u2581\u2581",
    left: 3,
  },
  narrow: {
    glyphs: "\u2581",
    left: 4,
  },
};
var nextFrameIndex = (m) => m + 1;
//@ chunk-ag5x7vhf.js:53567-55252 callgraph-witnessed = AnimatedClawd (0.3)
function AnimatedClawd(m) {
  let $ = w(28);
  let x;
  if ($[0] !== m) {
    x = m === undefined ? {} : m;
    $[0] = m;
    $[1] = x;
  } else x = $[1];
  let { autoplay, sequence, delayMs, onComplete, reserveCrouchRow, color, rest } = x;
  let V = autoplay === undefined ? false : autoplay;
  let W = reserveCrouchRow === undefined ? false : reserveCrouchRow;
  let {
    pose,
    bounceOffset,
    x: q,
    poof,
    shadow,
    isPlaying,
    onClick,
  } = useClawdAnimation(V, sequence, delayMs, onComplete);
  let Re = W ? CLAWD_MIN_OFFSET + 1 : CLAWD_MIN_OFFSET;
  let We = isPlaying ? undefined : rest;
  const width = CLAWD_BASE_WIDTH + (rest?.heldWidth ?? 0);
  const marginTop = bounceOffset > 1 ? bounceOffset + Re - CLAWD_MIN_OFFSET : bounceOffset;
  const pose_2 = We?.pose ?? pose;
  const paint = We?.paint;
  let children;
  if ($[2] !== color || $[3] !== pose_2 || $[4] !== paint) {
    children = jsxProd_default(Clawd, {
      pose: pose_2,
      color,
      paint,
    });
    $[2] = color;
    $[3] = pose_2;
    $[4] = paint;
    $[5] = children;
  } else children = $[5];
  let _e;
  if ($[6] !== marginTop || $[7] !== children || $[8] !== q) {
    _e = jsxProd_default(Box, {
      marginTop,
      marginLeft: q,
      flexShrink: 0,
      children,
    });
    $[6] = marginTop;
    $[7] = children;
    $[8] = q;
    $[9] = _e;
  } else _e = $[9];
  let oe;
  if ($[10] !== bounceOffset || $[11] !== poof) {
    oe =
      poof && bounceOffset > 0
        ? jsxProd_default_2(Fragment, {
            children: [
              jsxProd_default(Box, {
                position: "absolute",
                top: CLAWD_MIN_OFFSET - 1,
                left: 0,
                children: jsxProd_default(Text, {
                  color: "inactive",
                  children: POOF_GLYPHS[poof],
                }),
              }),
              jsxProd_default(Box, {
                position: "absolute",
                top: CLAWD_MIN_OFFSET - 1,
                right: 0,
                children: jsxProd_default(Text, {
                  color: "inactive",
                  children: POOF_GLYPHS[poof],
                }),
              }),
            ],
          })
        : null;
    $[10] = bounceOffset;
    $[11] = poof;
    $[12] = oe;
  } else oe = $[12];
  let ve;
  if ($[13] !== shadow) {
    ve = shadow
      ? jsxProd_default(Box, {
          position: "absolute",
          top: CLAWD_MIN_OFFSET - 1,
          left: SHADOW_GLYPHS[shadow].left,
          children: jsxProd_default(Text, {
            color: "inactive",
            children: SHADOW_GLYPHS[shadow].glyphs,
          }),
        })
      : null;
    $[13] = shadow;
    $[14] = ve;
  } else ve = $[14];
  let Ee;
  if ($[15] !== Re || $[16] !== oe || $[17] !== ve || $[18] !== _e) {
    Ee = jsxProd_default_2(Box, {
      height: Re,
      width: CLAWD_BASE_WIDTH,
      flexDirection: "column",
      flexShrink: 0,
      overflow: "hidden",
      children: [_e, oe, ve],
    });
    $[15] = Re;
    $[16] = oe;
    $[17] = ve;
    $[18] = _e;
    $[19] = Ee;
  } else Ee = $[19];
  let He;
  if ($[20] !== We) {
    He = We
      ? jsxProd_default(Box, {
          flexShrink: 0,
          children: We.held,
        })
      : null;
    $[20] = We;
    $[21] = He;
  } else He = $[21];
  let Ue;
  if ($[22] !== Re || $[23] !== onClick || $[24] !== Ee || $[25] !== He || $[26] !== width) {
    Ue = jsxProd_default(Decorative, {
      children: jsxProd_default_2(Box, {
        height: Re,
        width,
        flexShrink: 0,
        noSelect: true,
        onClick,
        children: [Ee, He],
      }),
    });
    $[22] = Re;
    $[23] = onClick;
    $[24] = Ee;
    $[25] = He;
    $[26] = width;
    $[27] = Ue;
  } else Ue = $[27];
  return Ue;
}
//@ chunk-ag5x7vhf.js:55252-56868 fingerprint = useClawdAnimation (0.646)
function useClawdAnimation(m, sequence, delayMs, onComplete) {
  let $ = w(40);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let I;
  if ($[0] !== isScreenReaderEnabled) {
    I = () => isReducedMotion(getInitialSettings_2().prefersReducedMotion) || isScreenReaderEnabled;
    $[0] = isScreenReaderEnabled;
    $[1] = I;
  } else I = $[1];
  let [D] = y(I);
  let A = (m || sequence !== undefined) && !D;
  let [L, V] = y(A ? 0 : -1);
  let W;
  if ($[2] !== m || $[3] !== delayMs || $[4] !== sequence) {
    W = () => (sequence ? withLeadInFrames(sequence, delayMs) : m ? IDLE_LOOK_FRAMES : CLAWD_ANIMATIONS.jump);
    $[2] = m;
    $[3] = delayMs;
    $[4] = sequence;
    $[5] = W;
  } else W = $[5];
  let [z, K] = y(W);
  let q;
  if ($[6] !== onComplete) {
    q = () => onComplete?.();
    $[6] = onComplete;
    $[7] = q;
  } else q = $[7];
  let Y = Oo(q);
  let pe = R(!sequence);
  let clock = useClock();
  let ge;
  if ($[8] !== Y || $[9] !== D) {
    ge = () => {
      if (D) Y();
    };
    $[8] = Y;
    $[9] = D;
    $[10] = ge;
  } else ge = $[10];
  let Re;
  if ($[11] !== D) {
    Re = [D];
    $[11] = D;
    $[12] = Re;
  } else Re = $[12];
  P(ge, Re);
  let We;
  if ($[13] !== m || $[14] !== L || $[15] !== D) {
    We = () => {
      if (m || D || L !== -1 || !pe.current) {
        return;
      }
      let fe = filterEntranceAnimations(IN_PLACE_ANIMATION_NAMES, chalkForChart());
      K(CLAWD_ANIMATIONS[fe[Math.floor(Math.random() * fe.length)]]);
      V(0);
    };
    $[13] = m;
    $[14] = L;
    $[15] = D;
    $[16] = We;
  } else We = $[16];
  let onClick = We;
  let te;
  if ($[17] !== m || $[18] !== clock || $[19] !== Y || $[20] !== L || $[21] !== z || $[22] !== sequence) {
    te = () => {
      if (L === -1) {
        return;
      }
      if (L >= z.length) {
        pe.current = true;
        Y();
        V(m && !sequence ? 0 : -1);
        return;
      }
      return clock.setTimeout(() => V(nextFrameIndex), CLAWD_FRAME_WIDTH);
    };
    $[17] = m;
    $[18] = clock;
    $[19] = Y;
    $[20] = L;
    $[21] = z;
    $[22] = sequence;
    $[23] = te;
  } else te = $[23];
  let me;
  if ($[24] !== m || $[25] !== clock || $[26] !== L || $[27] !== z || $[28] !== sequence) {
    me = [L, z, m, sequence, clock];
    $[24] = m;
    $[25] = clock;
    $[26] = L;
    $[27] = z;
    $[28] = sequence;
    $[29] = me;
  } else me = $[29];
  P(te, me);
  let se;
  if ($[30] !== sequence) {
    se = sequence ? CLAWD_ANIMATIONS[sequence].at(-1) : DEFAULT_CLAWD_FRAME;
    $[30] = sequence;
    $[31] = se;
  } else se = $[31];
  let _e = se;
  let oe = L >= 0 && L < z.length;
  let current = oe ? z[L] : _e;
  const Ee = current.x ?? 0;
  let He;
  if (
    $[32] !== current.offset ||
    $[33] !== current.poof ||
    $[34] !== current.pose ||
    $[35] !== current.shadow ||
    $[36] !== oe ||
    $[37] !== onClick ||
    $[38] !== Ee
  ) {
    He = {
      pose: current.pose,
      bounceOffset: current.offset,
      x: Ee,
      poof: current.poof,
      shadow: current.shadow,
      isPlaying: oe,
      onClick,
    };
    $[32] = current.offset;
    $[33] = current.poof;
    $[34] = current.pose;
    $[35] = current.shadow;
    $[36] = oe;
    $[37] = onClick;
    $[38] = Ee;
    $[39] = He;
  } else He = $[39];
  return He;
}
export {
  AnimatedClawd,
  getForcedFirstLaunch,
  isNewerClawdEntranceVersion,
  filterEntranceAnimations,
  CLAWD_ANIMATION_NAMES,
  markClawdEntranceSeen,
  CLAWD_BASE_WIDTH,
};

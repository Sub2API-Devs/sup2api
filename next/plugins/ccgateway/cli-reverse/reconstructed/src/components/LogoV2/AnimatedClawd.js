/**
 * components/LogoV2/AnimatedClawd.tsx
 *
 * Clawd 吉祥物入场/待机动画：姿态帧序列、首次启动判定（CLAUDE_CODE_FORCE_FIRST_LAUNCH）与 lastClawdEntranceVersion 记录。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/LogoV2/AnimatedClawd.tsx
 * pieces: chunk-hnxhr3bs.js (14)
 * attribution: fingerprint 2, layout 11, callgraph-witnessed 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isPoseSpec, normalizePose, Clawd, notAppleTerminal } from "./Clawd.js";
import { antEnv } from "../../utils/env.js";
import { isSemverString } from "../../utils/model/modelCatalog/catalogCapabilities.js";
import { isEnvTruthy } from "../../utils/envUtils.js";
import { semverGte } from "../../utils/semver.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { Decorative, useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { isReducedMotion } from "../Spinner/spinnerFlags.js";
import { getInitialSettings } from "../../utils/settings/settings.js";
import { useState, useEffectEvent, useRef, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-hnxhr3bs.js:48132-48181 fingerprint (2.1.88 match: hold, 1)
var CLAWD_MIN_OFFSET = 3;
var CLAWD_BASE_WIDTH = 9;
var CLAWD_FRAME_WIDTH = 60;
var DEFAULT_CLAWD_FRAME = {
  pose: "default",
  offset: 0,
};
//@ chunk-hnxhr3bs.js:48181-48278 layout
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
//@ chunk-hnxhr3bs.js:48278-48405 layout
function repeatPoseFrames(pose, count, { offset = 0, x, poof, shadow } = {}) {
  return Array.from(
    {
      length: count,
    },
    () => ({
      pose,
      offset,
      x,
      poof,
      shadow,
    }),
  );
}
//@ chunk-hnxhr3bs.js:48405-48473 layout
function turnFrames(facings, shadow) {
  return facings.flatMap((facing) =>
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
//@ chunk-hnxhr3bs.js:48473-48535 layout
function pose(eyes, arms = "down", feet = "both") {
  return {
    eyes,
    arms,
    feet,
  };
}
//@ chunk-hnxhr3bs.js:48535-51209 layout
/**
 * Clawd 动画帧序列表：每种动画（jump/look/celebrate/skip/spin/peekaboo/drop/waddle/peek/wink/boop/tap/sneeze/turn/coin-hop）是若干 {pose, offset, x, poof, shadow} 帧；CLAWD_ANIMATIONS 按名字索引，CLAWD_ANIMATION_NAMES 列出顺序。
 */
var JUMP_FRAMES; // deferred: uses poofFrames of its import cycle while loading; runs once the cycle is complete
var LOOK_FRAMES;
var IDLE_LOOK_FRAMES;
var CELEBRATE_FRAMES;
var SPIN_FRAMES;
var SKIP_FRAMES;
var BLINK_SETTLE_FRAMES;
var PEEKABOO_FRAMES;
var DROP_FRAMES;
var WADDLE_FRAMES;
var PEEK_FRAMES;
var WINK_FRAMES;
var BOOP_FRAMES;
var TAP_FRAMES;
var SNEEZE_FRAMES;
var TURN_FRAMES;
var COIN_HOP_FRAMES;
var CLAWD_ANIMATIONS;
var CLAWD_ANIMATION_NAMES;
var IN_PLACE_ANIMATION_NAMES;
deferInit("chunk-hnxhr3bs.js:48535", () => {
  JUMP_FRAMES = [
    ...poofFrames(),
    ...repeatPoseFrames("arms-up", 3),
    ...repeatPoseFrames("default", 1),
    ...poofFrames(),
    ...repeatPoseFrames("arms-up", 3),
    ...repeatPoseFrames("default", 1),
  ];
  LOOK_FRAMES = [
    ...repeatPoseFrames("look-right", 5),
    ...repeatPoseFrames("look-left", 5),
    ...repeatPoseFrames("default", 1),
  ];
  IDLE_LOOK_FRAMES = [
    ...repeatPoseFrames("default", 12),
    ...repeatPoseFrames("look-right", 5),
    ...repeatPoseFrames("look-left", 5),
  ];
  CELEBRATE_FRAMES = [
    ...JUMP_FRAMES,
    ...repeatPoseFrames("default", 3, {
      offset: 1,
    }),
  ];
  SPIN_FRAMES = [
    ...repeatPoseFrames("look-left", 2),
    ...repeatPoseFrames("look-right", 2),
    ...repeatPoseFrames("look-left", 2),
    ...repeatPoseFrames("arms-up", 3),
    ...repeatPoseFrames("default", 1),
  ];
  SKIP_FRAMES = [
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
  BLINK_SETTLE_FRAMES = [...repeatPoseFrames(pose("closed"), 1), DEFAULT_CLAWD_FRAME];
  PEEKABOO_FRAMES = [
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
  DROP_FRAMES = [
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
  WADDLE_FRAMES = [
    ...repeatPoseFrames("look-right", 1, {
      x: -CLAWD_BASE_WIDTH,
    }),
    ...[-6, -5, -4, -3, -2, -1].flatMap((x) =>
      repeatPoseFrames(pose("right", "down", x % 2 === 0 ? "left" : "right"), 2, {
        x,
      }),
    ),
    ...repeatPoseFrames("look-right", 2),
    ...repeatPoseFrames("default", 2),
    ...BLINK_SETTLE_FRAMES,
  ];
  PEEK_FRAMES = [
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
  WINK_FRAMES = [...repeatPoseFrames(pose("wink"), 5), DEFAULT_CLAWD_FRAME];
  BOOP_FRAMES = [
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
  TAP_FRAMES = [
    ...repeatPoseFrames(pose("open", "down", "left"), 2),
    ...repeatPoseFrames(pose("open", "down", "right"), 2),
    ...repeatPoseFrames(pose("open", "down", "left"), 2),
    ...repeatPoseFrames(pose("open", "down", "right"), 2),
    ...repeatPoseFrames(pose("open", "down", "left"), 1),
    ...repeatPoseFrames(pose("open", "down", "right"), 1),
    ...repeatPoseFrames("arms-up", 3),
    DEFAULT_CLAWD_FRAME,
  ];
  SNEEZE_FRAMES = [
    ...repeatPoseFrames(pose("closed", "up"), 4),
    ...repeatPoseFrames(pose("closed"), 2, {
      offset: 1,
      poof: "wave",
    }),
    ...repeatPoseFrames(pose("closed"), 2),
    ...repeatPoseFrames("default", 2),
    ...BLINK_SETTLE_FRAMES,
  ];
  TURN_FRAMES = [
    ...turnFrames(["right-12", "right-30", "right-55", "right-75", "edge"]),
    ...turnFrames(["back-105", "back-125", "back-150", "back", "back"]),
    ...turnFrames(["back-150", "back-125", "back-105", "edge"]),
    ...turnFrames(["left-75", "left-55", "left-30", "left-12"]),
    DEFAULT_CLAWD_FRAME,
  ];
  COIN_HOP_FRAMES = [
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
  };
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
  ];
  IN_PLACE_ANIMATION_NAMES = CLAWD_ANIMATION_NAMES.filter(
    (name) => (CLAWD_ANIMATIONS[name][0]?.x ?? 0) === 0,
  );
});
//@ chunk-hnxhr3bs.js:51209-51408 layout
/**
 * 不允许移动时，过滤掉首帧/任意帧带特殊姿态或首帧是静止睁眼原位的动画，只留下适合入场的动画名；允许时原样返回。
 */
function filterEntranceAnimations(animations, chalkOk) {
  if (chalkOk) return animations;
  return animations.filter((name) => {
    let frames = CLAWD_ANIMATIONS[name];
    let first = frames[0];
    if (first === undefined || isPoseSpec(first.pose)) return false;
    return (
      !frames.some((frame) => isPoseSpec(frame.pose)) &&
      (normalizePose(first.pose).eyes !== "open" || first.offset !== 0 || (first.x ?? 0) !== 0)
    );
  });
}
//@ chunk-hnxhr3bs.js:51408-51595 layout
function withLeadInFrames(name, delayMs) {
  let frames = CLAWD_ANIMATIONS[name];
  let first = frames[0];
  if (!delayMs || first === undefined) return frames;
  let leadIn =
    (first.x ?? 0) !== 0 || Math.abs(first.offset) >= CLAWD_MIN_OFFSET ? first : DEFAULT_CLAWD_FRAME;
  let max = Math.max(1, Math.round(delayMs / CLAWD_FRAME_WIDTH));
  return [
    ...Array.from(
      {
        length: max,
      },
      () => leadIn,
    ),
    ...frames,
  ];
}
//@ chunk-hnxhr3bs.js:51595-51750 layout
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
//@ chunk-hnxhr3bs.js:51750-52327 layout
function isNewerClawdEntranceVersion(
  entranceVersion,
  appVersion = {
    ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
    PACKAGE_URL: "@anthropic-ai/claude-code",
    README_URL: "https://code.claude.com/docs/en/overview",
    VERSION: "2.1.318",
    FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
    BUILD_TIME: "2026-11-03T18:52:53Z",
    GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
    HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
    DD_SOURCEMAP_GROUP: "default",
  }.VERSION,
) {
  if (!isSemverString(appVersion)) return false;
  if (!isSemverString(entranceVersion)) return true;
  try {
    return semverGte(appVersion, entranceVersion);
  } catch {
    return true;
  }
}
//@ chunk-hnxhr3bs.js:52327-52901 layout
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
          VERSION: "2.1.318",
          FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
          BUILD_TIME: "2026-11-03T18:52:53Z",
          GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
          HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
          DD_SOURCEMAP_GROUP: "default",
        }.VERSION,
      }
    : config;
}
//@ chunk-hnxhr3bs.js:52901-53021 layout
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
var nextFrameIndex = (index) => index + 1;
//@ chunk-hnxhr3bs.js:53021-54707 callgraph-witnessed (2.1.88 match: AnimatedClawd, 0.3)
function AnimatedClawd(props) {
  let $ = useMemoCache(28);
  let options;
  if ($[0] !== props) {
    options = props === undefined ? {} : props;
    $[0] = props;
    $[1] = options;
  } else options = $[1];
  let { autoplay, sequence, delayMs, onComplete, reserveCrouchRow, color, rest } = options;
  let shouldAutoplay = autoplay === undefined ? false : autoplay;
  let keepCrouchRow = reserveCrouchRow === undefined ? false : reserveCrouchRow;
  let { pose, bounceOffset, x, poof, shadow, isPlaying, onClick } = useClawdAnimation(
    shouldAutoplay,
    sequence,
    delayMs,
    onComplete,
  );
  let height = keepCrouchRow ? CLAWD_MIN_OFFSET + 1 : CLAWD_MIN_OFFSET;
  let restFrame = isPlaying ? undefined : rest;
  const width = CLAWD_BASE_WIDTH + (rest?.heldWidth ?? 0);
  const marginTop = bounceOffset > 1 ? bounceOffset + height - CLAWD_MIN_OFFSET : bounceOffset;
  const pose_2 = restFrame?.pose ?? pose;
  const paint = restFrame?.paint;
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
  let clawdBox;
  if ($[6] !== marginTop || $[7] !== children || $[8] !== x) {
    clawdBox = jsxProd_default(Box, {
      marginTop,
      marginLeft: x,
      flexShrink: 0,
      children,
    });
    $[6] = marginTop;
    $[7] = children;
    $[8] = x;
    $[9] = clawdBox;
  } else clawdBox = $[9];
  let poofBox;
  if ($[10] !== bounceOffset || $[11] !== poof) {
    poofBox =
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
    $[12] = poofBox;
  } else poofBox = $[12];
  let shadowBox;
  if ($[13] !== shadow) {
    shadowBox = shadow
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
    $[14] = shadowBox;
  } else shadowBox = $[14];
  let stage;
  if ($[15] !== height || $[16] !== poofBox || $[17] !== shadowBox || $[18] !== clawdBox) {
    stage = jsxProd_default_2(Box, {
      height,
      width: CLAWD_BASE_WIDTH,
      flexDirection: "column",
      flexShrink: 0,
      overflow: "hidden",
      children: [clawdBox, poofBox, shadowBox],
    });
    $[15] = height;
    $[16] = poofBox;
    $[17] = shadowBox;
    $[18] = clawdBox;
    $[19] = stage;
  } else stage = $[19];
  let heldBox;
  if ($[20] !== restFrame) {
    heldBox = restFrame
      ? jsxProd_default(Box, {
          flexShrink: 0,
          children: restFrame.held,
        })
      : null;
    $[20] = restFrame;
    $[21] = heldBox;
  } else heldBox = $[21];
  let clawd;
  if ($[22] !== height || $[23] !== onClick || $[24] !== stage || $[25] !== heldBox || $[26] !== width) {
    clawd = jsxProd_default(Decorative, {
      children: jsxProd_default_2(Box, {
        height,
        width,
        flexShrink: 0,
        noSelect: true,
        onClick,
        children: [stage, heldBox],
      }),
    });
    $[22] = height;
    $[23] = onClick;
    $[24] = stage;
    $[25] = heldBox;
    $[26] = width;
    $[27] = clawd;
  } else clawd = $[27];
  return clawd;
}
//@ chunk-hnxhr3bs.js:54707-56323 fingerprint (2.1.88 match: useClawdAnimation, 0.646)
function useClawdAnimation(autoplay, name, delayMs, onComplete) {
  let $ = useMemoCache(40);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let isReduced;
  if ($[0] !== isScreenReaderEnabled) {
    isReduced = () => isReducedMotion(getInitialSettings().prefersReducedMotion) || isScreenReaderEnabled;
    $[0] = isScreenReaderEnabled;
    $[1] = isReduced;
  } else isReduced = $[1];
  let [reducedMotion] = useState(isReduced);
  let shouldAnimate = (autoplay || name !== undefined) && !reducedMotion;
  let [frameIndex, setFrameIndex] = useState(shouldAnimate ? 0 : -1);
  let pickFrames;
  if ($[2] !== autoplay || $[3] !== delayMs || $[4] !== name) {
    pickFrames = () =>
      name ? withLeadInFrames(name, delayMs) : autoplay ? IDLE_LOOK_FRAMES : CLAWD_ANIMATIONS.jump;
    $[2] = autoplay;
    $[3] = delayMs;
    $[4] = name;
    $[5] = pickFrames;
  } else pickFrames = $[5];
  let [frames, setFrames] = useState(pickFrames);
  let notifyComplete;
  if ($[6] !== onComplete) {
    notifyComplete = () => onComplete?.();
    $[6] = onComplete;
    $[7] = notifyComplete;
  } else notifyComplete = $[7];
  let complete = useEffectEvent(notifyComplete);
  let canClickRef = useRef(!name);
  let clock = useClock();
  let settleEffect;
  if ($[8] !== complete || $[9] !== reducedMotion) {
    settleEffect = () => {
      if (reducedMotion) complete();
    };
    $[8] = complete;
    $[9] = reducedMotion;
    $[10] = settleEffect;
  } else settleEffect = $[10];
  let settleDeps;
  if ($[11] !== reducedMotion) {
    settleDeps = [reducedMotion];
    $[11] = reducedMotion;
    $[12] = settleDeps;
  } else settleDeps = $[12];
  useEffect(settleEffect, settleDeps);
  let onClick;
  if ($[13] !== autoplay || $[14] !== frameIndex || $[15] !== reducedMotion) {
    onClick = () => {
      if (autoplay || reducedMotion || frameIndex !== -1 || !canClickRef.current) {
        return;
      }
      let entranceNames = filterEntranceAnimations(IN_PLACE_ANIMATION_NAMES, notAppleTerminal());
      setFrames(CLAWD_ANIMATIONS[entranceNames[Math.floor(Math.random() * entranceNames.length)]]);
      setFrameIndex(0);
    };
    $[13] = autoplay;
    $[14] = frameIndex;
    $[15] = reducedMotion;
    $[16] = onClick;
  } else onClick = $[16];
  let onClick_2 = onClick;
  let tick;
  if (
    $[17] !== autoplay ||
    $[18] !== clock ||
    $[19] !== complete ||
    $[20] !== frameIndex ||
    $[21] !== frames ||
    $[22] !== name
  ) {
    tick = () => {
      if (frameIndex === -1) {
        return;
      }
      if (frameIndex >= frames.length) {
        canClickRef.current = true;
        complete();
        setFrameIndex(autoplay && !name ? 0 : -1);
        return;
      }
      return clock.setTimeout(() => setFrameIndex(nextFrameIndex), CLAWD_FRAME_WIDTH);
    };
    $[17] = autoplay;
    $[18] = clock;
    $[19] = complete;
    $[20] = frameIndex;
    $[21] = frames;
    $[22] = name;
    $[23] = tick;
  } else tick = $[23];
  let tickDeps;
  if ($[24] !== autoplay || $[25] !== clock || $[26] !== frameIndex || $[27] !== frames || $[28] !== name) {
    tickDeps = [frameIndex, frames, autoplay, name, clock];
    $[24] = autoplay;
    $[25] = clock;
    $[26] = frameIndex;
    $[27] = frames;
    $[28] = name;
    $[29] = tickDeps;
  } else tickDeps = $[29];
  useEffect(tick, tickDeps);
  let lastFrame;
  if ($[30] !== name) {
    lastFrame = name ? CLAWD_ANIMATIONS[name].at(-1) : DEFAULT_CLAWD_FRAME;
    $[30] = name;
    $[31] = lastFrame;
  } else lastFrame = $[31];
  let lastFrame_2 = lastFrame;
  let isPlaying = frameIndex >= 0 && frameIndex < frames.length;
  let current = isPlaying ? frames[frameIndex] : lastFrame_2;
  const x = current.x ?? 0;
  let state;
  if (
    $[32] !== current.offset ||
    $[33] !== current.poof ||
    $[34] !== current.pose ||
    $[35] !== current.shadow ||
    $[36] !== isPlaying ||
    $[37] !== onClick_2 ||
    $[38] !== x
  ) {
    state = {
      pose: current.pose,
      bounceOffset: current.offset,
      x,
      poof: current.poof,
      shadow: current.shadow,
      isPlaying,
      onClick: onClick_2,
    };
    $[32] = current.offset;
    $[33] = current.poof;
    $[34] = current.pose;
    $[35] = current.shadow;
    $[36] = isPlaying;
    $[37] = onClick_2;
    $[38] = x;
    $[39] = state;
  } else state = $[39];
  return state;
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

/**
 * components/tasks/RemoteSessionProgress.tsx
 *
 * 云会话进度行（review 阶段计数彩虹条）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/tasks/RemoteSessionProgress.tsx
 * pieces: chunk-18hwfzwa.js (10), chunk-fm6h4dv7.js (1)
 * attribution: placement 4, layout 2, fingerprint 5
 */
import { currentUsageCreditState } from "../../services/usageCreditOffers.js";
import { isSameWallReset } from "../rateLimit/quotaAutoResume.js";
import { init_react_production, useState } from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  jsxProd_default,
  Fragment,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { getRainbowColor } from "../../utils/thinking.js";
import { useSettingsState } from "../../hooks/useSettings.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { isReducedMotion } from "../Spinner/spinnerFlags.js";
import { useAnimationFrame } from "../../ink/components/Input.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { FILLED_DIAMOND_GLYPH, DIAMOND_GLYPH } from "../../constants/figures.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { count } from "../../utils/collections.js";
import { toInkColor } from "../../utils/ink.js";
import { collapseWhitespace } from "../../utils/stringUtils.js";
import { describeTeammateActivity } from "./taskStatusUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fm6h4dv7.js:10887-10953 fingerprint (2.1.88 match: RainbowText, 0.607)
function RainbowText(t0) {
  let wall = currentUsageCreditState();
  return wall.phase === "failed" && isSameWallReset(wall.wall, t0);
}
//@ chunk-18hwfzwa.js:692158-692162 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:692158", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:692162-692172 layout
var PROGRESS_TICK_MS = 80;
//@ chunk-18hwfzwa.js:692172-692509 fingerprint (2.1.88 match: formatReviewStageCounts, 1)
function formatReviewStageCounts(stage, found, verified, refuted) {
  if (!stage) return `${found} found \xB7 ${verified} verified`;
  if (stage === "synthesizing") {
    let parts = [`${verified} verified`];
    if (refuted > 0) parts.push(`${refuted} refuted`);
    parts.push("deduping");
    return parts.join(" \xB7 ");
  }
  if (stage === "verifying") {
    let parts = [`${found} found`, `${verified} verified`];
    if (refuted > 0) parts.push(`${refuted} refuted`);
    return parts.join(" \xB7 ");
  }
  return found > 0 ? `${found} found` : "finding";
}
//@ chunk-18hwfzwa.js:692509-692784 layout
function RainbowChars(props) {
  let $ = useMemoCache(5);
  let { text, phase } = props;
  let startPhase = phase === undefined ? 0 : phase;
  let chars;
  if ($[0] !== text) {
    chars = [...text];
    $[0] = text;
    $[1] = chars;
  } else chars = $[1];
  let element;
  if ($[2] !== startPhase || $[3] !== chars) {
    element = jsxProd_default(Fragment, {
      children: chars.map((children, charIndex) =>
        jsxProd_default(
          Text,
          {
            color: getRainbowColor(charIndex + startPhase),
            children,
          },
          charIndex,
        ),
      ),
    });
    $[2] = startPhase;
    $[3] = chars;
    $[4] = element;
  } else element = $[4];
  return element;
}
//@ chunk-18hwfzwa.js:692784-693241 placement (2.1.88 match: _temp2, 0.728)
/**
 * 让显示计数每个 tick 最多增加 1（追赶目标值），减少或强制时直接跳到目标。
 */
function useSteppedCount(target, tick, immediate) {
  let $ = useMemoCache(9);
  let initialState;
  if ($[0] !== target || $[1] !== tick) {
    initialState = {
      count: target,
      tick,
    };
    $[0] = target;
    $[1] = tick;
    $[2] = initialState;
  } else initialState = $[2];
  let [steppedState, setSteppedState] = useState(initialState);
  let nextState = steppedState;
  if (immediate || target < steppedState.count) {
    if (steppedState.count !== target) {
      let sameTickState;
      if ($[3] !== steppedState.tick || $[4] !== target) {
        sameTickState = {
          count: target,
          tick: steppedState.tick,
        };
        $[3] = steppedState.tick;
        $[4] = target;
        $[5] = sameTickState;
      } else sameTickState = $[5];
      nextState = sameTickState;
    }
  } else if (target > steppedState.count && tick !== steppedState.tick) {
    const count = steppedState.count + 1;
    let advancedState;
    if ($[6] !== count || $[7] !== tick) {
      advancedState = {
        count,
        tick,
      };
      $[6] = count;
      $[7] = tick;
      $[8] = advancedState;
    } else advancedState = $[8];
    nextState = advancedState;
  }
  if (nextState !== steppedState) setSteppedState(nextState);
  return nextState.count;
}
//@ chunk-18hwfzwa.js:693241-694845 fingerprint (2.1.88 match: ReviewRainbowLine, 0.769)
function ReviewRainbowLine(props) {
  let $ = useMemoCache(20);
  let { session } = props;
  let settings = useSettingsState();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let reducedMotion;
  if ($[0] !== isScreenReaderEnabled || $[1] !== settings.prefersReducedMotion) {
    reducedMotion = isReducedMotion(settings.prefersReducedMotion) || isScreenReaderEnabled;
    $[0] = isScreenReaderEnabled;
    $[1] = settings.prefersReducedMotion;
    $[2] = reducedMotion;
  } else reducedMotion = $[2];
  let reducedMotion_2 = reducedMotion;
  let reviewProgress = session.reviewProgress;
  let running = session.status === "running";
  let [, time] = useAnimationFrame(running && !reducedMotion_2 ? PROGRESS_TICK_MS : null);
  let targetFound = reviewProgress?.bugsFound ?? 0;
  let targetVerified = reviewProgress?.bugsVerified ?? 0;
  let targetRefuted = reviewProgress?.bugsRefuted ?? 0;
  let snap = reducedMotion_2 || !running;
  let found = useSteppedCount(targetFound, time, snap);
  let verified = useSteppedCount(targetVerified, time, snap);
  let refuted = useSteppedCount(targetRefuted, time, snap);
  let phase = Math.floor(time / (PROGRESS_TICK_MS * 3)) % 7;
  if (session.status === "completed") {
    let glyphElement;
    let labelElement;
    if ($[3] === MEMO_CACHE_SENTINEL) {
      glyphElement = jsxProd_default_2(Text, {
        color: "background",
        children: [FILLED_DIAMOND_GLYPH, " "],
      });
      labelElement = jsxProd_default(RainbowChars, {
        text: "ultrareview",
        phase: 0,
      });
      $[3] = glyphElement;
      $[4] = labelElement;
    } else {
      glyphElement = $[3];
      labelElement = $[4];
    }
    let readyLine;
    if ($[5] === MEMO_CACHE_SENTINEL) {
      readyLine = jsxProd_default_2(Fragment, {
        children: [
          glyphElement,
          labelElement,
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [
              " ready \xB7 ",
              jsxProd_default(KeyboardShortcutHint, {
                chord: "shift+down",
                action: "view",
              }),
            ],
          }),
        ],
      });
      $[5] = readyLine;
    } else readyLine = $[5];
    return readyLine;
  }
  if (session.status === "failed") {
    let t1;
    if ($[6] === MEMO_CACHE_SENTINEL) {
      t1 = jsxProd_default_2(Fragment, {
        children: [
          jsxProd_default_2(Text, {
            color: "background",
            children: [FILLED_DIAMOND_GLYPH, " "],
          }),
          jsxProd_default(RainbowChars, {
            text: "ultrareview",
            phase: 0,
          }),
          jsxProd_default_2(Text, {
            color: "error",
            dimColor: true,
            children: [" \xB7 ", "error"],
          }),
        ],
      });
      $[6] = t1;
    } else t1 = $[6];
    return t1;
  }
  let t1;
  if ($[7] !== found || $[8] !== reviewProgress || $[9] !== refuted || $[10] !== verified) {
    t1 = !reviewProgress
      ? "setting up"
      : formatReviewStageCounts(reviewProgress.stage, found, verified, refuted);
    $[7] = found;
    $[8] = reviewProgress;
    $[9] = refuted;
    $[10] = verified;
    $[11] = t1;
  } else t1 = $[11];
  let tail = t1;
  let t2;
  if ($[12] === MEMO_CACHE_SENTINEL) {
    t2 = jsxProd_default_2(Text, {
      color: "background",
      children: [DIAMOND_GLYPH, " "],
    });
    $[12] = t2;
  } else t2 = $[12];
  const phase_2 = running ? phase : 0;
  let t4;
  if ($[13] !== phase_2) {
    t4 = jsxProd_default(RainbowChars, {
      text: "ultrareview",
      phase: phase_2,
    });
    $[13] = phase_2;
    $[14] = t4;
  } else t4 = $[14];
  let t5;
  if ($[15] !== tail) {
    t5 = jsxProd_default_2(Text, {
      dimColor: true,
      children: [" \xB7 ", tail],
    });
    $[15] = tail;
    $[16] = t5;
  } else t5 = $[16];
  let t6;
  if ($[17] !== t4 || $[18] !== t5) {
    t6 = jsxProd_default_2(Fragment, {
      children: [t2, t4, t5],
    });
    $[17] = t4;
    $[18] = t5;
    $[19] = t6;
  } else t6 = $[19];
  return t6;
}
//@ chunk-18hwfzwa.js:694845-695386 fingerprint (2.1.88 match: RemoteSessionProgress, 0.595)
function RemoteSessionProgress(props) {
  let $ = useMemoCache(8);
  let { session } = props;
  if (session.isRemoteReview) {
    let t1;
    if ($[0] !== session) {
      t1 = jsxProd_default(ReviewRainbowLine, {
        session,
      });
      $[0] = session;
      $[1] = t1;
    } else t1 = $[1];
    return t1;
  }
  if (session.status === "completed") {
    let t1;
    if ($[2] === MEMO_CACHE_SENTINEL) {
      t1 = jsxProd_default(Text, {
        bold: true,
        color: "success",
        dimColor: true,
        children: "done",
      });
      $[2] = t1;
    } else t1 = $[2];
    return t1;
  }
  if (session.status === "failed") {
    let t1;
    if ($[3] === MEMO_CACHE_SENTINEL) {
      t1 = jsxProd_default(Text, {
        bold: true,
        color: "error",
        dimColor: true,
        children: "error",
      });
      $[3] = t1;
    } else t1 = $[3];
    return t1;
  }
  let children;
  if ($[4] !== session) {
    children = remoteSessionProgressLabel(session);
    $[4] = session;
    $[5] = children;
  } else children = $[5];
  let labelElement;
  if ($[6] !== children) {
    labelElement = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    $[6] = children;
    $[7] = labelElement;
  } else labelElement = $[7];
  return labelElement;
}
//@ chunk-18hwfzwa.js:695386-695523 placement
function remoteSessionProgressLabel(session) {
  if (!session.todoList.length) return `${session.status}\u2026`;
  return `${count(session.todoList, (todo) => todo.status === "completed")}/${session.todoList.length}`;
}
//@ chunk-18hwfzwa.js:697663-698417 placement
function RemoteAgentTaskLabel(props) {
  let $ = useMemoCache(16);
  let { task } = props;
  if (task.type === "remote_agent") {
    let progressElement;
    if ($[0] !== task) {
      progressElement = jsxProd_default(Text, {
        children: jsxProd_default(RemoteSessionProgress, {
          session: task,
        }),
      });
      $[0] = task;
      $[1] = progressElement;
    } else progressElement = $[1];
    return progressElement;
  }
  let color;
  if ($[2] !== task.identity.color) {
    color = toInkColor(task.identity.color);
    $[2] = task.identity.color;
    $[3] = color;
  } else color = $[3];
  let agentName;
  if ($[4] !== task.identity.agentName) {
    agentName = collapseWhitespace(task.identity.agentName);
    $[4] = task.identity.agentName;
    $[5] = agentName;
  } else agentName = $[5];
  let agentNameElement;
  if ($[6] !== color || $[7] !== agentName) {
    agentNameElement = jsxProd_default_2(Text, {
      color,
      children: ["@", agentName],
    });
    $[6] = color;
    $[7] = agentName;
    $[8] = agentNameElement;
  } else agentNameElement = $[8];
  let activityText;
  if ($[9] !== task) {
    activityText = collapseWhitespace(describeTeammateActivity(task));
    $[9] = task;
    $[10] = activityText;
  } else activityText = $[10];
  let activityElement;
  if ($[11] !== activityText) {
    activityElement = jsxProd_default_2(Text, {
      dimColor: true,
      children: [": ", activityText],
    });
    $[11] = activityText;
    $[12] = activityElement;
  } else activityElement = $[12];
  let labelElement;
  if ($[13] !== agentNameElement || $[14] !== activityElement) {
    labelElement = jsxProd_default_2(Text, {
      wrap: "truncate-end",
      children: [agentNameElement, activityElement],
    });
    $[13] = agentNameElement;
    $[14] = activityElement;
    $[15] = labelElement;
  } else labelElement = $[15];
  return labelElement;
}
//@ chunk-18hwfzwa.js:1429198-1429302 fingerprint (2.1.88 match: _temp, 1)
/**
 * 已完成项占比（百分比），空列表返回 undefined。
 */
function completedPercent(taskListSnapshot) {
  if (taskListSnapshot === undefined || taskListSnapshot.length === 0) return;
  return (100 * count(taskListSnapshot, (task) => task.status === "completed")) / taskListSnapshot.length;
}
export {
  remoteSessionProgressLabel,
  formatReviewStageCounts,
  RemoteSessionProgress,
  RemoteAgentTaskLabel,
  completedPercent,
  RainbowText,
};

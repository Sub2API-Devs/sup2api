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
import { init_react_production, y } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
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
import { FILLED_DIAMOND_GLYPH, DIAMOND_GLYPH } from "../../utils/permissions/autoModeRulesPrompt.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { count } from "../../utils/collections.js";
import { toInkColor } from "../../utils/ink.js";
import { collapseWhitespace } from "../../utils/stringUtils.js";
import { describeTeammateActivity } from "./taskStatusUtils.js";
import { currentUsageCreditState } from "../../services/usageCreditOffers.js";
import { isSameWallReset } from "../rateLimit/quotaAutoResume.js";

//@ chunk-18hwfzwa.js:692158-692162 placement
init_react_production();
//@ chunk-18hwfzwa.js:692162-692172 layout
var PROGRESS_TICK_MS = 80;
//@ chunk-18hwfzwa.js:692172-692509 fingerprint = formatReviewStageCounts (1)
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
  let ee = w(5);
  let { text, phase } = props;
  let L = phase === undefined ? 0 : phase;
  let ke;
  if (ee[0] !== text) {
    ke = [...text];
    ee[0] = text;
    ee[1] = ke;
  } else ke = ee[1];
  let Re;
  if (ee[2] !== L || ee[3] !== ke) {
    Re = jsxProd_default(Fragment, {
      children: ke.map((children, He) =>
        jsxProd_default(
          Text,
          {
            color: getRainbowColor(He + L),
            children,
          },
          He,
        ),
      ),
    });
    ee[2] = L;
    ee[3] = ke;
    ee[4] = Re;
  } else Re = ee[4];
  return Re;
}
//@ chunk-18hwfzwa.js:692784-693241 placement = _temp2 (0.728)
/**
 * 让显示计数每个 tick 最多增加 1（追赶目标值），减少或强制时直接跳到目标。
 */
function useSteppedCount(target, tick, immediate) {
  let L = w(9);
  let ee;
  if (L[0] !== target || L[1] !== tick) {
    ee = {
      count: target,
      tick,
    };
    L[0] = target;
    L[1] = tick;
    L[2] = ee;
  } else ee = L[2];
  let [ke, Re] = y(ee);
  let Be = ke;
  if (immediate || target < ke.count) {
    if (ke.count !== target) {
      let He;
      if (L[3] !== ke.tick || L[4] !== target) {
        He = {
          count: target,
          tick: ke.tick,
        };
        L[3] = ke.tick;
        L[4] = target;
        L[5] = He;
      } else He = L[5];
      Be = He;
    }
  } else if (target > ke.count && tick !== ke.tick) {
    const count = ke.count + 1;
    let We;
    if (L[6] !== count || L[7] !== tick) {
      We = {
        count,
        tick,
      };
      L[6] = count;
      L[7] = tick;
      L[8] = We;
    } else We = L[8];
    Be = We;
  }
  if (Be !== ke) Re(Be);
  return Be.count;
}
//@ chunk-18hwfzwa.js:693241-694845 fingerprint = ReviewRainbowLine (0.769)
function ReviewRainbowLine(props) {
  let $ = w(20);
  let { session } = props;
  let settings = useSettingsState();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let ke;
  if ($[0] !== isScreenReaderEnabled || $[1] !== settings.prefersReducedMotion) {
    ke = isReducedMotion(settings.prefersReducedMotion) || isScreenReaderEnabled;
    $[0] = isScreenReaderEnabled;
    $[1] = settings.prefersReducedMotion;
    $[2] = ke;
  } else ke = $[2];
  let reducedMotion = ke;
  let reviewProgress = session.reviewProgress;
  let running = session.status === "running";
  let [, time] = useAnimationFrame(running && !reducedMotion ? PROGRESS_TICK_MS : null);
  let targetFound = reviewProgress?.bugsFound ?? 0;
  let targetVerified = reviewProgress?.bugsVerified ?? 0;
  let targetRefuted = reviewProgress?.bugsRefuted ?? 0;
  let snap = reducedMotion || !running;
  let found = useSteppedCount(targetFound, time, snap);
  let verified = useSteppedCount(targetVerified, time, snap);
  let refuted = useSteppedCount(targetRefuted, time, snap);
  let phase = Math.floor(time / (PROGRESS_TICK_MS * 3)) % 7;
  if (session.status === "completed") {
    let Dt;
    let Lt;
    if ($[3] === MEMO_CACHE_SENTINEL) {
      Dt = jsxProd_default_2(Text, {
        color: "background",
        children: [FILLED_DIAMOND_GLYPH, " "],
      });
      Lt = jsxProd_default(RainbowChars, {
        text: "ultrareview",
        phase: 0,
      });
      $[3] = Dt;
      $[4] = Lt;
    } else {
      Dt = $[3];
      Lt = $[4];
    }
    let oo;
    if ($[5] === MEMO_CACHE_SENTINEL) {
      oo = jsxProd_default_2(Fragment, {
        children: [
          Dt,
          Lt,
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
      $[5] = oo;
    } else oo = $[5];
    return oo;
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
//@ chunk-18hwfzwa.js:694845-695386 fingerprint = RemoteSessionProgress (0.595)
function RemoteSessionProgress(props) {
  let $ = w(8);
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
  let ee;
  if ($[6] !== children) {
    ee = jsxProd_default(Text, {
      dimColor: true,
      children,
    });
    $[6] = children;
    $[7] = ee;
  } else ee = $[7];
  return ee;
}
//@ chunk-18hwfzwa.js:695386-695523 placement
function remoteSessionProgressLabel(h) {
  if (!h.todoList.length) return `${h.status}\u2026`;
  return `${count(h.todoList, (D) => D.status === "completed")}/${h.todoList.length}`;
}
//@ chunk-18hwfzwa.js:697663-698417 placement
function RemoteAgentTaskLabel(props) {
  let $ = w(16);
  let { task } = props;
  if (task.type === "remote_agent") {
    let L;
    if ($[0] !== task) {
      L = jsxProd_default(Text, {
        children: jsxProd_default(RemoteSessionProgress, {
          session: task,
        }),
      });
      $[0] = task;
      $[1] = L;
    } else L = $[1];
    return L;
  }
  let color;
  if ($[2] !== task.identity.color) {
    color = toInkColor(task.identity.color);
    $[2] = task.identity.color;
    $[3] = color;
  } else color = $[3];
  let ee;
  if ($[4] !== task.identity.agentName) {
    ee = collapseWhitespace(task.identity.agentName);
    $[4] = task.identity.agentName;
    $[5] = ee;
  } else ee = $[5];
  let ke;
  if ($[6] !== color || $[7] !== ee) {
    ke = jsxProd_default_2(Text, {
      color,
      children: ["@", ee],
    });
    $[6] = color;
    $[7] = ee;
    $[8] = ke;
  } else ke = $[8];
  let Re;
  if ($[9] !== task) {
    Re = collapseWhitespace(describeTeammateActivity(task));
    $[9] = task;
    $[10] = Re;
  } else Re = $[10];
  let Be;
  if ($[11] !== Re) {
    Be = jsxProd_default_2(Text, {
      dimColor: true,
      children: [": ", Re],
    });
    $[11] = Re;
    $[12] = Be;
  } else Be = $[12];
  let He;
  if ($[13] !== ke || $[14] !== Be) {
    He = jsxProd_default_2(Text, {
      wrap: "truncate-end",
      children: [ke, Be],
    });
    $[13] = ke;
    $[14] = Be;
    $[15] = He;
  } else He = $[15];
  return He;
}
//@ chunk-18hwfzwa.js:1429198-1429302 fingerprint = _temp (1)
/**
 * 已完成项占比（百分比），空列表返回 undefined。
 */
function completedPercent(taskListSnapshot) {
  if (taskListSnapshot === undefined || taskListSnapshot.length === 0) return;
  return (100 * count(taskListSnapshot, (x) => x.status === "completed")) / taskListSnapshot.length;
}
//@ chunk-fm6h4dv7.js:10887-10953 fingerprint = RainbowText (0.607)
function RainbowText(t0) {
  let s = currentUsageCreditState();
  return s.phase === "failed" && isSameWallReset(s.wall, t0);
}
export {
  remoteSessionProgressLabel,
  formatReviewStageCounts,
  RemoteSessionProgress,
  RemoteAgentTaskLabel,
  completedPercent,
  RainbowText,
};

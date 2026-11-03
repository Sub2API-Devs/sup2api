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
import { j, y } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { e, Fragment, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { getRainbowColor } from "../../utils/thinking.js";
import { qd } from "../../hooks/useSettings.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { isReducedMotion } from "../Spinner/spinnerFlags.js";
import { useAnimationFrame } from "../../ink/components/Input.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { Wx, DIAMOND_GLYPH } from "../../utils/permissions/autoModeRulesPrompt.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { count } from "../../utils/collections.js";
import { toInkColor } from "../../utils/ink.js";
import { Dr } from "../../utils/stringUtils.js";
import { describeTeammateActivity } from "./taskStatusUtils.js";
import { s9 } from "../../services/usageCreditOffers.js";
import { isSameWallReset } from "../rateLimit/quotaAutoResume.js";

//@ chunk-18hwfzwa.js:692158-692162 placement
j();
//@ chunk-18hwfzwa.js:692162-692172 layout
var X2 = 80;
//@ chunk-18hwfzwa.js:692172-692509 fingerprint = formatReviewStageCounts (1)
function formatReviewStageCounts(stage, found, verified, refuted) {
  if (!stage) return `${found} found \xB7 ${verified} verified`;
  if (stage === "synthesizing") {
    let parts = [`${verified} verified`];
    if (refuted > 0) parts.push(`${refuted} refuted`);
    return (parts.push("deduping"), parts.join(" \xB7 "));
  }
  if (stage === "verifying") {
    let parts = [`${found} found`, `${verified} verified`];
    if (refuted > 0) parts.push(`${refuted} refuted`);
    return parts.join(" \xB7 ");
  }
  return found > 0 ? `${found} found` : "finding";
}
//@ chunk-18hwfzwa.js:692509-692784 layout
function RainbowChars(h) {
  let ee = w(5),
    { text: text, phase: phase } = h,
    L = phase === void 0 ? 0 : phase,
    ke;
  if (ee[0] !== text) ((ke = [...text]), (ee[0] = text), (ee[1] = ke));
  else ke = ee[1];
  let Re;
  if (ee[2] !== L || ee[3] !== ke)
    ((Re = e(Fragment, {
      children: ke.map((Be, He) => e(Text, { color: getRainbowColor(He + L), children: Be }, He)),
    })),
      (ee[2] = L),
      (ee[3] = ke),
      (ee[4] = Re));
  else Re = ee[4];
  return Re;
}
/**
 * 让显示计数每个 tick 最多增加 1（追赶目标值），减少或强制时直接跳到目标。
 */
//@ chunk-18hwfzwa.js:692784-693241 placement = _temp2 (0.728)
function useSteppedCount(target, tick, immediate) {
  let L = w(9),
    ee;
  if (L[0] !== target || L[1] !== tick)
    ((ee = { count: target, tick: tick }), (L[0] = target), (L[1] = tick), (L[2] = ee));
  else ee = L[2];
  let [ke, Re] = y(ee),
    Be = ke;
  if (immediate || target < ke.count) {
    if (ke.count !== target) {
      let He;
      if (L[3] !== ke.tick || L[4] !== target)
        ((He = { count: target, tick: ke.tick }), (L[3] = ke.tick), (L[4] = target), (L[5] = He));
      else He = L[5];
      Be = He;
    }
  } else if (target > ke.count && tick !== ke.tick) {
    const He = ke.count + 1;
    let We;
    if (L[6] !== He || L[7] !== tick)
      ((We = { count: He, tick: tick }), (L[6] = He), (L[7] = tick), (L[8] = We));
    else We = L[8];
    Be = We;
  }
  if (Be !== ke) Re(Be);
  return Be.count;
}
//@ chunk-18hwfzwa.js:693241-694845 fingerprint = ReviewRainbowLine (0.769)
function ReviewRainbowLine(t0) {
  let $ = w(20),
    { session: session } = t0,
    settings = qd(),
    L = useIsScreenReaderEnabled(),
    ke;
  if ($[0] !== L || $[1] !== settings.prefersReducedMotion)
    ((ke = isReducedMotion(settings.prefersReducedMotion) || L),
      ($[0] = L),
      ($[1] = settings.prefersReducedMotion),
      ($[2] = ke));
  else ke = $[2];
  let Re = ke,
    reviewProgress = session.reviewProgress,
    He = session.status === "running",
    [, We] = useAnimationFrame(He && !Re ? X2 : null),
    ze = reviewProgress?.bugsFound ?? 0,
    Xe = reviewProgress?.bugsVerified ?? 0,
    rt = reviewProgress?.bugsRefuted ?? 0,
    kt = Re || !He,
    found = useSteppedCount(ze, We, kt),
    verified = useSteppedCount(Xe, We, kt),
    refuted = useSteppedCount(rt, We, kt),
    Et = Math.floor(We / (X2 * 3)) % 7;
  if (session.status === "completed") {
    let Dt, Lt;
    if ($[3] === MEMO_CACHE_SENTINEL)
      ((Dt = r(Text, { color: "background", children: [Wx, " "] })),
        (Lt = e(RainbowChars, { text: "ultrareview", phase: 0 })),
        ($[3] = Dt),
        ($[4] = Lt));
    else ((Dt = $[3]), (Lt = $[4]));
    let oo;
    if ($[5] === MEMO_CACHE_SENTINEL)
      ((oo = r(Fragment, {
        children: [
          Dt,
          Lt,
          r(Text, {
            dimColor: !0,
            children: [" ready \xB7 ", e(KeyboardShortcutHint, { chord: "shift+down", action: "view" })],
          }),
        ],
      })),
        ($[5] = oo));
    else oo = $[5];
    return oo;
  }
  if (session.status === "failed") {
    let Dt;
    if ($[6] === MEMO_CACHE_SENTINEL)
      ((Dt = r(Fragment, {
        children: [
          r(Text, { color: "background", children: [Wx, " "] }),
          e(RainbowChars, { text: "ultrareview", phase: 0 }),
          r(Text, { color: "error", dimColor: !0, children: [" \xB7 ", "error"] }),
        ],
      })),
        ($[6] = Dt));
    else Dt = $[6];
    return Dt;
  }
  let Dt;
  if ($[7] !== found || $[8] !== reviewProgress || $[9] !== refuted || $[10] !== verified)
    ((Dt = !reviewProgress
      ? "setting up"
      : formatReviewStageCounts(reviewProgress.stage, found, verified, refuted)),
      ($[7] = found),
      ($[8] = reviewProgress),
      ($[9] = refuted),
      ($[10] = verified),
      ($[11] = Dt));
  else Dt = $[11];
  let Xt = Dt,
    Lt;
  if ($[12] === MEMO_CACHE_SENTINEL)
    ((Lt = r(Text, { color: "background", children: [DIAMOND_GLYPH, " "] })), ($[12] = Lt));
  else Lt = $[12];
  const t3 = He ? Et : 0;
  let io;
  if ($[13] !== t3) ((io = e(RainbowChars, { text: "ultrareview", phase: t3 })), ($[13] = t3), ($[14] = io));
  else io = $[14];
  let so;
  if ($[15] !== Xt) ((so = r(Text, { dimColor: !0, children: [" \xB7 ", Xt] })), ($[15] = Xt), ($[16] = so));
  else so = $[16];
  let po;
  if ($[17] !== io || $[18] !== so)
    ((po = r(Fragment, { children: [Lt, io, so] })), ($[17] = io), ($[18] = so), ($[19] = po));
  else po = $[19];
  return po;
}
//@ chunk-18hwfzwa.js:694845-695386 fingerprint = RemoteSessionProgress (0.595)
function RemoteSessionProgress(t0) {
  let $ = w(8),
    { session: session } = t0;
  if (session.isRemoteReview) {
    let L;
    if ($[0] !== session) ((L = e(ReviewRainbowLine, { session: session })), ($[0] = session), ($[1] = L));
    else L = $[1];
    return L;
  }
  if (session.status === "completed") {
    let L;
    if ($[2] === MEMO_CACHE_SENTINEL)
      ((L = e(Text, { bold: !0, color: "success", dimColor: !0, children: "done" })), ($[2] = L));
    else L = $[2];
    return L;
  }
  if (session.status === "failed") {
    let L;
    if ($[3] === MEMO_CACHE_SENTINEL)
      ((L = e(Text, { bold: !0, color: "error", dimColor: !0, children: "error" })), ($[3] = L));
    else L = $[3];
    return L;
  }
  let L;
  if ($[4] !== session) ((L = remoteSessionProgressLabel(session)), ($[4] = session), ($[5] = L));
  else L = $[5];
  let ee;
  if ($[6] !== L) ((ee = e(Text, { dimColor: !0, children: L })), ($[6] = L), ($[7] = ee));
  else ee = $[7];
  return ee;
}
//@ chunk-18hwfzwa.js:695386-695523 placement
function remoteSessionProgressLabel(h) {
  if (!h.todoList.length) return `${h.status}\u2026`;
  return `${count(h.todoList, (D) => D.status === "completed")}/${h.todoList.length}`;
}
//@ chunk-18hwfzwa.js:697663-698417 placement
function RemoteAgentTaskLabel(h) {
  let $ = w(16),
    { task: task } = h;
  if (task.type === "remote_agent") {
    let L;
    if ($[0] !== task)
      ((L = e(Text, { children: e(RemoteSessionProgress, { session: task }) })), ($[0] = task), ($[1] = L));
    else L = $[1];
    return L;
  }
  let L;
  if ($[2] !== task.identity.color)
    ((L = toInkColor(task.identity.color)), ($[2] = task.identity.color), ($[3] = L));
  else L = $[3];
  let ee;
  if ($[4] !== task.identity.agentName)
    ((ee = Dr(task.identity.agentName)), ($[4] = task.identity.agentName), ($[5] = ee));
  else ee = $[5];
  let ke;
  if ($[6] !== L || $[7] !== ee)
    ((ke = r(Text, { color: L, children: ["@", ee] })), ($[6] = L), ($[7] = ee), ($[8] = ke));
  else ke = $[8];
  let Re;
  if ($[9] !== task) ((Re = Dr(describeTeammateActivity(task))), ($[9] = task), ($[10] = Re));
  else Re = $[10];
  let Be;
  if ($[11] !== Re) ((Be = r(Text, { dimColor: !0, children: [": ", Re] })), ($[11] = Re), ($[12] = Be));
  else Be = $[12];
  let He;
  if ($[13] !== ke || $[14] !== Be)
    ((He = r(Text, { wrap: "truncate-end", children: [ke, Be] })), ($[13] = ke), ($[14] = Be), ($[15] = He));
  else He = $[15];
  return He;
}
/**
 * 已完成项占比（百分比），空列表返回 undefined。
 */
//@ chunk-18hwfzwa.js:1429198-1429302 fingerprint = _temp (1)
function completedPercent(h) {
  if (h === void 0 || h.length === 0) return;
  return (100 * count(h, (x) => x.status === "completed")) / h.length;
}
//@ chunk-fm6h4dv7.js:10887-10953 fingerprint = RainbowText (0.607)
function RainbowText(t0) {
  let s = s9();
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

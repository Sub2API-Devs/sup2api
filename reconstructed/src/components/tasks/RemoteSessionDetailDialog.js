/**
 * components/tasks/RemoteSessionDetailDialog.tsx
 *
 * 云会话（ultraplan/ultrareview）详情：阶段流水线、计划审阅、终止会话。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/tasks/RemoteSessionDetailDialog.tsx
 * pieces: chunk-18hwfzwa.js (12), chunk-azz22fvc.js (1), chunk-hantmvxa.js (1)
 * attribution: placement 2, fingerprint 10, layout 1, callgraph-fingerprint 1
 */
import { j, y, R, Kc, Q } from "../../../vendor/react/cjs/react.production.js";
import { EXITPLANMODE_2 } from "../../tools/ExitPlanModeTool/constants.js";
import { ASKUSERQUESTION } from "../../tools/AskUserQuestionTool/prompt.js";
import { truncateToWidth } from "../../utils/format.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useElapsedTicker } from "../ConfirmationPrompt.js";
import { Cjr } from "../../tasks/RemoteAgentTask/RemoteAgentTask.js";
import { ZCe } from "../../utils/background/remote/remoteSession.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Dialog } from "../design-system/Dialog.js";
import { Wx, DIAMOND_GLYPH } from "../../utils/permissions/autoModeRulesPrompt.js";
import { Text, Box, Link } from "../../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { plural } from "../../utils/stringUtils.js";
import { fi } from "../../utils/browser.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { formatReviewStageCounts, RemoteSessionProgress } from "./RemoteSessionProgress.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { normalizeMessages, EMPTY_LOOKUPS } from "../../utils/messages.js";
import { toInternalMessages } from "../../utils/messages/mappers.js";
import { teleportResumeCodeSession } from "../../utils/teleport.js";
import { errorMessage } from "../../utils/errors.js";
import { FocusColumn } from "../design-system/FocusColumn.js";
import { TranscriptModeProvider } from "../messages/transcriptModeContext.js";
import { agentProgressSelector } from "../../tools/AgentTool/UI.js";
import { isFilePersistenceEnabled } from "../../utils/filePersistence/filePersistence.js";
import { filesPlacedByNameRead } from "../../bootstrap/state.js";
import { hasConflictingPlacedFile } from "../../utils/filePersistence/taskFileLookup.js";

//@ chunk-18hwfzwa.js:708595-708599 placement
j();
//@ chunk-18hwfzwa.js:708599-708603 placement
j();
//@ chunk-18hwfzwa.js:708603-709181 fingerprint = formatToolUseSummary (0.898)
function formatToolUseSummary(h, x, D) {
  if (h === EXITPLANMODE_2) return "Review the plan in your browser";
  if (!x || typeof x !== "object") return h;
  if (h === ASKUSERQUESTION && "questions" in x) {
    let qs = x.questions;
    if (Array.isArray(qs) && qs[0] && typeof qs[0] === "object") {
      let ee =
        "question" in qs[0] && typeof qs[0].question === "string" && qs[0].question
          ? qs[0].question
          : "header" in qs[0] && typeof qs[0].header === "string"
            ? qs[0].header
            : null;
      if (ee) {
        let oneLine = ee.replace(/\s+/g, " ").trim();
        return `Answer in browser: ${truncateToWidth(oneLine, D - 10)}`;
      }
    }
  }
  for (let L of Object.values(x))
    if (typeof L === "string" && L.trim()) {
      let oneLine = L.replace(/\s+/g, " ").trim();
      return `${h} ${truncateToWidth(oneLine, D)}`;
    }
  return h;
}
//@ chunk-18hwfzwa.js:709181-709285 fingerprint = PHASE_LABEL (0.819)
var ULTRAPLAN_STATUS_LABELS = { needs_input: "input required", plan_ready: "ready" },
  ULTRAPLAN_STATUS_SHORT = { needs_input: "waiting", plan_ready: "done" };
//@ chunk-18hwfzwa.js:709285-713110 fingerprint = UltraplanSessionDetail (0.62)
function UltraplanSessionDetail(t0) {
  let $ = w(74),
    { session: session, onDone: onDone, onBack: onBack, onKill: onKill } = t0,
    ke = session.status === "running" || session.status === "pending",
    phase = session.ultraplanPhase,
    Be = ke ? (phase ? ULTRAPLAN_STATUS_LABELS[phase] : "running") : session.status,
    elapsedTime = useElapsedTicker(session.startTime, ke, 1000, 0, session.endTime),
    We = Cjr(session.id),
    ze = 1 + (We?.agentSpawnCount ?? 0),
    Xe = We?.toolCallCount ?? 0,
    rt = We?.lastToolUse ? formatToolUseSummary(We.lastToolUse.name, We.lastToolUse.input, 60) : null,
    At;
  if ($[0] !== session.sessionId) ((At = ZCe(session.sessionId)), ($[0] = session.sessionId), ($[1] = At));
  else At = $[1];
  let It = At,
    Ot;
  if ($[2] !== onBack || $[3] !== onDone)
    ((Ot = onBack ?? (() => onDone("Cloud session details dismissed", { display: "system" }))),
      ($[2] = onBack),
      ($[3] = onDone),
      ($[4] = Ot));
  else Ot = $[4];
  let Et = Ot,
    [Dt, Lt] = y(!1);
  if (Dt) {
    const oo = phase === "plan_ready";
    let Xt;
    if ($[5] !== Et || $[6] !== onKill)
      ((Xt = () => {
        (onKill?.(), Et());
      }),
        ($[5] = Et),
        ($[6] = onKill),
        ($[7] = Xt));
    else Xt = $[7];
    let io;
    if ($[8] !== Lt) ((io = () => Lt(!1)), ($[8] = Lt), ($[9] = io));
    else io = $[9];
    let so;
    if ($[10] !== oo || $[11] !== Xt || $[12] !== io)
      ((so = e(StopUltraplanConfirm, { discardsPlan: oo, backFirst: !1, onStop: Xt, onBack: io })),
        ($[10] = oo),
        ($[11] = Xt),
        ($[12] = io),
        ($[13] = so));
    else so = $[13];
    return so;
  }
  const po = Dialog,
    oo = phase === "plan_ready" ? Wx : DIAMOND_GLYPH;
  let Xt;
  if ($[14] !== oo)
    ((Xt = r(Text, { color: "background", children: [oo, " "] })), ($[14] = oo), ($[15] = Xt));
  else Xt = $[15];
  let io;
  if ($[16] === MEMO_CACHE_SENTINEL) ((io = e(Text, { bold: !0, children: "ultraplan" })), ($[16] = io));
  else io = $[16];
  let so;
  if ($[17] !== elapsedTime || $[18] !== Be)
    ((so = r(Text, { dimColor: !0, children: [" \xB7 ", elapsedTime, " \xB7 ", Be] })),
      ($[17] = elapsedTime),
      ($[18] = Be),
      ($[19] = so));
  else so = $[19];
  let ao;
  if ($[20] !== Xt || $[21] !== so)
    ((ao = r(Text, { children: [Xt, io, so] })), ($[20] = Xt), ($[21] = so), ($[22] = ao));
  else ao = $[22];
  const co = "background",
    bo = Box,
    Ao = "column",
    Bo = 1,
    Ro = Text;
  let Ho;
  if ($[23] !== phase)
    ((Ho = phase === "plan_ready" && r(Text, { color: "success", children: [re.tick, " "] })),
      ($[23] = phase),
      ($[24] = Ho));
  else Ho = $[24];
  const Io = " ";
  let Wo;
  if ($[25] !== ze) ((Wo = plural(ze, "agent")), ($[25] = ze), ($[26] = Wo));
  else Wo = $[26];
  const mn = " ",
    Cn = phase ? ULTRAPLAN_STATUS_SHORT[phase] : "working",
    No = " \xB7 ",
    vo = " tool",
    Yo = " ",
    kn = plural(Xe, "call");
  let Fn;
  if (
    $[27] !== Ro ||
    $[28] !== ze ||
    $[29] !== Ho ||
    $[30] !== Wo ||
    $[31] !== Cn ||
    $[32] !== kn ||
    $[33] !== Xe
  )
    ((Fn = r(Ro, { children: [Ho, ze, Io, Wo, mn, Cn, No, Xe, vo, Yo, kn] })),
      ($[27] = Ro),
      ($[28] = ze),
      ($[29] = Ho),
      ($[30] = Wo),
      ($[31] = Cn),
      ($[32] = kn),
      ($[33] = Xe),
      ($[34] = Fn));
  else Fn = $[34];
  let bn;
  if ($[35] !== rt) ((bn = rt && e(Text, { dimColor: !0, children: rt })), ($[35] = rt), ($[36] = bn));
  else bn = $[36];
  let Go;
  if ($[37] !== It) ((Go = e(Text, { dimColor: !0, children: It })), ($[37] = It), ($[38] = Go));
  else Go = $[38];
  let hn;
  if ($[39] !== It || $[40] !== Go)
    ((hn = e(Link, { url: It, children: Go })), ($[39] = It), ($[40] = Go), ($[41] = hn));
  else hn = $[41];
  const Mn =
    phase === "plan_ready"
      ? "Review in browser"
      : phase === "needs_input"
        ? "Answer in browser"
        : "Open in browser";
  let Xo;
  if ($[42] !== phase)
    ((Xo = phase === "plan_ready" && { description: "Approve, edit, or comment on the plan" }),
      ($[42] = phase),
      ($[43] = Xo));
  else Xo = $[43];
  let Sn;
  if ($[44] !== Mn || $[45] !== Xo)
    ((Sn = { label: Mn, value: "open", ...Xo }), ($[44] = Mn), ($[45] = Xo), ($[46] = Sn));
  else Sn = $[46];
  let $n;
  if ($[47] !== onKill || $[48] !== phase || $[49] !== ke)
    (($n =
      onKill && ke
        ? [
            {
              label: "Stop ultraplan",
              value: "stop",
              ...(phase === "plan_ready" && { description: "Discard the generated plan" }),
            },
          ]
        : []),
      ($[47] = onKill),
      ($[48] = phase),
      ($[49] = ke),
      ($[50] = $n));
  else $n = $[50];
  let on;
  if ($[51] === MEMO_CACHE_SENTINEL) ((on = { label: "Back", value: "back" }), ($[51] = on));
  else on = $[51];
  let _o;
  if ($[52] !== Sn || $[53] !== $n) ((_o = [Sn, ...$n, on]), ($[52] = Sn), ($[53] = $n), ($[54] = _o));
  else _o = $[54];
  let cn;
  if ($[55] !== Et || $[56] !== onDone || $[57] !== It || $[58] !== Lt)
    ((cn = (v_0) => {
      switch (v_0) {
        case "open": {
          (fi(It), onDone());
          return;
        }
        case "stop": {
          Lt(!0);
          return;
        }
        case "back": {
          Et();
          return;
        }
      }
    }),
      ($[55] = Et),
      ($[56] = onDone),
      ($[57] = It),
      ($[58] = Lt),
      ($[59] = cn));
  else cn = $[59];
  let wn;
  if ($[60] !== _o || $[61] !== cn)
    ((wn = e(ModelSelector, { options: _o, onChange: cn })), ($[60] = _o), ($[61] = cn), ($[62] = wn));
  else wn = $[62];
  let mr;
  if ($[63] !== bo || $[64] !== Fn || $[65] !== bn || $[66] !== hn || $[67] !== wn)
    ((mr = r(bo, { flexDirection: Ao, gap: Bo, children: [Fn, bn, hn, wn] })),
      ($[63] = bo),
      ($[64] = Fn),
      ($[65] = bn),
      ($[66] = hn),
      ($[67] = wn),
      ($[68] = mr));
  else mr = $[68];
  let Kn;
  if ($[69] !== po || $[70] !== Et || $[71] !== mr || $[72] !== ao)
    ((Kn = e(po, { title: ao, onCancel: Et, color: co, children: mr })),
      ($[69] = po),
      ($[70] = Et),
      ($[71] = mr),
      ($[72] = ao),
      ($[73] = Kn));
  else Kn = $[73];
  return Kn;
}
/**
 * "停止 ultraplan？"确认对话框：终止云会话（可选同时丢弃计划），防止重复触发。
 */
//@ chunk-18hwfzwa.js:713110-714091 layout
function StopUltraplanConfirm(h) {
  let $ = w(15),
    { discardsPlan: discardsPlan, backFirst: backFirst, onStop: onStop, onBack: onBack } = h,
    ke = R(!1),
    Be;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((Be = (He) => {
      if (!ke.current) ((ke.current = !0), He());
    }),
      ($[0] = Be));
  else Be = $[0];
  let We = Be,
    ze;
  if ($[1] === MEMO_CACHE_SENTINEL)
    ((ze = e(Text, { dimColor: !0, children: "This will terminate the cloud session." })), ($[1] = ze));
  else ze = $[1];
  const Xe = discardsPlan ? "Terminate session and discard plan" : "Terminate session",
    rt = backFirst ? "cancel" : "confirm";
  let kt;
  if ($[2] !== onStop) ((kt = () => We(onStop)), ($[2] = onStop), ($[3] = kt));
  else kt = $[3];
  let At;
  if ($[4] !== onBack) ((At = () => We(onBack)), ($[4] = onBack), ($[5] = At));
  else At = $[5];
  let It;
  if ($[6] !== backFirst || $[7] !== Xe || $[8] !== rt || $[9] !== kt || $[10] !== At)
    ((It = r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        ze,
        e(ConfirmSelect, {
          confirmLabel: Xe,
          cancelLabel: "Back",
          cancelFirst: backFirst,
          focus: rt,
          hideIndexes: backFirst,
          onConfirm: kt,
          onCancel: At,
        }),
      ],
    })),
      ($[6] = backFirst),
      ($[7] = Xe),
      ($[8] = rt),
      ($[9] = kt),
      ($[10] = At),
      ($[11] = It));
  else It = $[11];
  let Ot;
  if ($[12] !== onBack || $[13] !== It)
    ((Ot = e(Dialog, { title: "Stop ultraplan?", onCancel: onBack, color: "background", children: It })),
      ($[12] = onBack),
      ($[13] = It),
      ($[14] = Ot));
  else Ot = $[14];
  return Ot;
}
//@ chunk-18hwfzwa.js:714091-714198 fingerprint = STAGE_LABELS (0.772)
var REVIEW_STAGES = ["finding", "verifying", "synthesizing"],
  REVIEW_STAGE_LABELS = { finding: "Find", verifying: "Verify", synthesizing: "Dedupe" };
//@ chunk-18hwfzwa.js:714198-715118 fingerprint = StagePipeline (0.627)
function StagePipeline(t0) {
  let $ = w(15),
    { stage: stage, completed: completed, hasProgress: hasProgress } = t0,
    ke;
  if ($[0] !== stage) ((ke = stage ? REVIEW_STAGES.indexOf(stage) : -1), ($[0] = stage), ($[1] = ke));
  else ke = $[1];
  let currentIdx = ke,
    Be = !completed && !hasProgress,
    He;
  if ($[2] !== Be)
    ((He = Be
      ? e(Text, { color: "background", children: "Setup" })
      : e(Text, { dimColor: !0, children: "Setup" })),
      ($[2] = Be),
      ($[3] = He));
  else He = $[3];
  let We;
  if ($[4] === MEMO_CACHE_SENTINEL) ((We = e(Text, { dimColor: !0, children: " \u2192 " })), ($[4] = We));
  else We = $[4];
  let ze;
  if ($[5] !== completed || $[6] !== currentIdx || $[7] !== Be)
    ((ze = REVIEW_STAGES.map((Xe, rt) => {
      let kt = !completed && !Be && rt === currentIdx;
      return r(
        Kc,
        {
          children: [
            rt > 0 && e(Text, { dimColor: !0, children: " \u2192 " }),
            kt
              ? e(Text, { color: "background", children: REVIEW_STAGE_LABELS[Xe] })
              : e(Text, { dimColor: !0, children: REVIEW_STAGE_LABELS[Xe] }),
          ],
        },
        Xe,
      );
    })),
      ($[5] = completed),
      ($[6] = currentIdx),
      ($[7] = Be),
      ($[8] = ze));
  else ze = $[8];
  let At;
  if ($[9] !== completed)
    ((At = completed && r(Text, { children: [" ", e(StatusIcon, { status: "success" })] })),
      ($[9] = completed),
      ($[10] = At));
  else At = $[10];
  let It;
  if ($[11] !== He || $[12] !== ze || $[13] !== At)
    ((It = r(Text, { children: [He, We, ze, At] })), ($[11] = He), ($[12] = ze), ($[13] = At), ($[14] = It));
  else It = $[14];
  return It;
}
//@ chunk-18hwfzwa.js:715118-715405 fingerprint = reviewCountsLine (1)
function reviewCountsLine(session) {
  let reviewProgress = session.reviewProgress;
  if (!reviewProgress) return session.status === "completed" ? "done" : "setting up";
  let verified = reviewProgress.bugsVerified,
    refuted = reviewProgress.bugsRefuted ?? 0;
  if (session.status === "completed") {
    let parts = [`${verified} ${plural(verified, "finding")}`];
    if (refuted > 0) parts.push(`${refuted} refuted`);
    return parts.join(" \xB7 ");
  }
  return formatReviewStageCounts(reviewProgress.stage, reviewProgress.bugsFound, verified, refuted);
}
/**
 * "停止 ultrareview？"确认对话框：归档云会话、停止本地跟踪并丢弃已有发现。
 */
//@ chunk-18hwfzwa.js:715405-716385 callgraph-fingerprint = _temp (0.156)
function StopUltrareviewConfirm(exitState) {
  let $ = w(10),
    { onStop: onStop, onBack: onBack } = exitState,
    L = R(!1),
    ke;
  if ($[0] !== onBack || $[1] !== onStop)
    ((ke = (Re) => {
      if (L.current) {
        return;
      }
      if (((L.current = !0), Re === "stop")) onStop();
      else onBack();
    }),
      ($[0] = onBack),
      ($[1] = onStop),
      ($[2] = ke));
  else ke = $[2];
  let Be = ke,
    He;
  if ($[3] === MEMO_CACHE_SENTINEL)
    ((He = r(Byline, {
      children: [
        e(KeyboardShortcutHint, { chord: "enter", action: "select" }),
        e(KeyboardShortcutHint, { chord: "escape", action: "go back" }),
      ],
    })),
      ($[3] = He));
  else He = $[3];
  let We;
  if ($[4] === MEMO_CACHE_SENTINEL)
    ((We = e(Text, {
      dimColor: !0,
      children:
        "This archives the cloud session and stops local tracking. The review will not complete and any findings so far are discarded.",
    })),
      ($[4] = We));
  else We = $[4];
  let ze;
  if ($[5] !== Be)
    ((ze = r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        We,
        e(ConfirmSelect, {
          confirmLabel: "Stop ultrareview",
          cancelLabel: "Back",
          cancelFirst: !0,
          focus: "cancel",
          hideIndexes: !0,
          onConfirm: () => Be("stop"),
          onCancel: () => Be("back"),
        }),
      ],
    })),
      ($[5] = Be),
      ($[6] = ze));
  else ze = $[6];
  let Xe;
  if ($[7] !== onBack || $[8] !== ze)
    ((Xe = e(Dialog, {
      title: "Stop ultrareview?",
      onCancel: onBack,
      color: "background",
      inputGuide: He,
      children: ze,
    })),
      ($[7] = onBack),
      ($[8] = ze),
      ($[9] = Xe));
  else Xe = $[9];
  return Xe;
}
//@ chunk-18hwfzwa.js:716385-719172 fingerprint = ReviewSessionDetail (0.743)
function ReviewSessionDetail(t0) {
  let $ = w(50),
    { session: session, onDone: onDone, onBack: onBack, onKill: onKill } = t0,
    completed = session.status === "completed",
    Re = session.status === "running" || session.status === "pending",
    [Be, He] = y(!1),
    elapsedTime = useElapsedTicker(session.startTime, Re, 1000, 0, session.endTime),
    Xe;
  if ($[0] !== onDone)
    ((Xe = () => onDone("Cloud session details dismissed", { display: "system" })),
      ($[0] = onDone),
      ($[1] = Xe));
  else Xe = $[1];
  let rt = Xe,
    kt = onBack ?? rt,
    At = completed ? "ready" : Re ? "running" : session.status;
  if (Be) {
    let It;
    if ($[2] !== kt || $[3] !== onKill)
      ((It = () => {
        (onKill?.(), kt());
      }),
        ($[2] = kt),
        ($[3] = onKill),
        ($[4] = It));
    else It = $[4];
    let Ot;
    if ($[5] === MEMO_CACHE_SENTINEL) ((Ot = () => He(!1)), ($[5] = Ot));
    else Ot = $[5];
    let Et;
    if ($[6] !== It) ((Et = e(StopUltrareviewConfirm, { onStop: It, onBack: Ot })), ($[6] = It), ($[7] = Et));
    else Et = $[7];
    return Et;
  }
  let It;
  if ($[8] !== completed || $[9] !== onKill || $[10] !== Re)
    ((It = completed
      ? [{ label: "Dismiss", value: "dismiss" }]
      : [
          ...(onKill && Re ? [{ label: "Stop ultrareview", value: "stop" }] : []),
          { label: "Back", value: "back" },
        ]),
      ($[8] = completed),
      ($[9] = onKill),
      ($[10] = Re),
      ($[11] = It));
  else It = $[11];
  let Dt = It,
    Ot;
  if ($[12] !== kt || $[13] !== rt)
    ((Ot = (action) => {
      oo: switch (action) {
        case "stop": {
          He(!0);
          break oo;
        }
        case "back": {
          kt();
          break oo;
        }
        case "dismiss": {
          rt();
        }
      }
    }),
      ($[12] = kt),
      ($[13] = rt),
      ($[14] = Ot));
  else Ot = $[14];
  let Xt = Ot;
  const Et = completed ? Wx : DIAMOND_GLYPH;
  let io;
  if ($[15] !== Et)
    ((io = r(Text, { color: "background", children: [Et, " "] })), ($[15] = Et), ($[16] = io));
  else io = $[16];
  let so;
  if ($[17] === MEMO_CACHE_SENTINEL) ((so = e(Text, { bold: !0, children: "ultrareview" })), ($[17] = so));
  else so = $[17];
  let po;
  if ($[18] !== elapsedTime || $[19] !== At)
    ((po = r(Text, { dimColor: !0, children: [" \xB7 ", elapsedTime, " \xB7 ", At] })),
      ($[18] = elapsedTime),
      ($[19] = At),
      ($[20] = po));
  else po = $[20];
  let ao;
  if ($[21] !== io || $[22] !== po)
    ((ao = r(Text, { children: [io, so, po] })), ($[21] = io), ($[22] = po), ($[23] = ao));
  else ao = $[23];
  let co;
  if ($[24] === MEMO_CACHE_SENTINEL)
    ((co = r(Byline, {
      children: [
        e(KeyboardShortcutHint, { chord: "enter", action: "select" }),
        e(KeyboardShortcutHint, { chord: "escape", action: "go back" }),
      ],
    })),
      ($[24] = co));
  else co = $[24];
  const t10 = session.reviewProgress?.stage,
    t11 = !!session.reviewProgress;
  let Bo;
  if ($[25] !== completed || $[26] !== t10 || $[27] !== t11)
    ((Bo = e(StagePipeline, { stage: t10, completed: completed, hasProgress: t11 })),
      ($[25] = completed),
      ($[26] = t10),
      ($[27] = t11),
      ($[28] = Bo));
  else Bo = $[28];
  let Ro;
  if ($[29] !== session) ((Ro = reviewCountsLine(session)), ($[29] = session), ($[30] = Ro));
  else Ro = $[30];
  let Ho;
  if ($[31] !== Ro) ((Ho = e(Text, { children: Ro })), ($[31] = Ro), ($[32] = Ho));
  else Ho = $[32];
  let Io;
  if ($[33] !== completed)
    ((Io = completed && e(Text, { dimColor: !0, children: "The full review is in this session." })),
      ($[33] = completed),
      ($[34] = Io));
  else Io = $[34];
  let Wo;
  if ($[35] !== Ho || $[36] !== Io)
    ((Wo = r(Box, { flexDirection: "column", children: [Ho, Io] })),
      ($[35] = Ho),
      ($[36] = Io),
      ($[37] = Wo));
  else Wo = $[37];
  const mn = completed ? "dismiss" : "back";
  let Cn;
  if ($[38] !== Xt || $[39] !== Dt || $[40] !== mn)
    ((Cn = e(ModelSelector, { options: Dt, defaultFocusValue: mn, onChange: Xt })),
      ($[38] = Xt),
      ($[39] = Dt),
      ($[40] = mn),
      ($[41] = Cn));
  else Cn = $[41];
  let No;
  if ($[42] !== Bo || $[43] !== Wo || $[44] !== Cn)
    ((No = r(Box, { flexDirection: "column", gap: 1, children: [Bo, Wo, Cn] })),
      ($[42] = Bo),
      ($[43] = Wo),
      ($[44] = Cn),
      ($[45] = No));
  else No = $[45];
  let vo;
  if ($[46] !== kt || $[47] !== No || $[48] !== ao)
    ((vo = e(Dialog, { title: ao, onCancel: kt, color: "background", inputGuide: co, children: No })),
      ($[46] = kt),
      ($[47] = No),
      ($[48] = ao),
      ($[49] = vo));
  else vo = $[49];
  return vo;
}
/**
 * 云会话详情：ultraplan 显示阶段与计划审阅（在浏览器中查看），ultrareview 显示发现/验证计数，可终止或归档会话。
 */
//@ chunk-18hwfzwa.js:719172-721881 fingerprint = RemoteSessionDetailDialog (0.679)
function RemoteSessionDetailDialog({
  session: session,
  tools: tools,
  commands: commands,
  verbose: verbose,
  onDone: onDone,
  onBack: onBack,
  onKill: onKill,
}) {
  let [Be, He] = y(!1),
    [We, ze] = y(null),
    Xe = Cjr(session.id),
    rt = Xe?.tail,
    lastMessages = Q(() => {
      if (session.isUltraplan || session.isRemoteReview || !rt) return [];
      return normalizeMessages(toInternalMessages(rt))
        .filter((Xt) => Xt.type !== "progress")
        .slice(-3);
    }, [session.isUltraplan, session.isRemoteReview, rt]),
    At = session.status === "running" || session.status === "pending",
    It = useElapsedTicker(session.startTime, At, 1000, 0, session.endTime);
  if (session.isUltraplan)
    return e(UltraplanSessionDetail, { session: session, onDone: onDone, onBack: onBack, onKill: onKill });
  if (session.isRemoteReview)
    return e(ReviewSessionDetail, { session: session, onDone: onDone, onBack: onBack, onKill: onKill });
  let handleClose = () => onDone("Cloud session details dismissed", { display: "system" }),
    handleKeyDown = (Xt) => {
      if (Xt.key === " ")
        (Xt.preventDefault(), onDone("Cloud session details dismissed", { display: "system" }));
      else if (Xt.key === "left" && onBack) (Xt.preventDefault(), onBack());
      else if (Xt.key === "t" && !Xt.ctrl && !Xt.meta && !Be) (Xt.preventDefault(), handleTeleport());
      else if (Xt.key === "return") (Xt.preventDefault(), handleClose());
    };
  async function handleTeleport() {
    (He(!0), ze(null));
    try {
      await teleportResumeCodeSession(session.sessionId);
    } catch (err) {
      ze(errorMessage(err));
    } finally {
      He(!1);
    }
  }
  let displayTitle = truncateToWidth(session.title, 50),
    displayStatus = session.status === "pending" ? "starting" : session.status;
  return e(FocusColumn, {
    onKeyDown: handleKeyDown,
    children: r(Dialog, {
      title: "Cloud session details",
      onCancel: handleClose,
      color: "background",
      inputGuide: r(Byline, {
        children: [
          onBack && e(KeyboardShortcutHint, { chord: "left", action: "go back" }),
          e(KeyboardShortcutHint, { chord: ["escape", "enter", "space"], action: "close" }),
          !Be && e(KeyboardShortcutHint, { chord: "t", action: "teleport" }),
        ],
      }),
      children: [
        r(Box, {
          flexDirection: "column",
          children: [
            r(Text, {
              children: [
                e(Text, { bold: !0, children: "Status" }),
                ":",
                " ",
                displayStatus === "running" || displayStatus === "starting"
                  ? e(Text, { color: "background", children: displayStatus })
                  : displayStatus === "completed"
                    ? e(Text, { color: "success", children: displayStatus })
                    : e(Text, { color: "error", children: displayStatus }),
              ],
            }),
            r(Text, { children: [e(Text, { bold: !0, children: "Runtime" }), ": ", It] }),
            r(Text, {
              wrap: "truncate-end",
              children: [e(Text, { bold: !0, children: "Title" }), ": ", displayTitle],
            }),
            r(Text, {
              children: [
                e(Text, { bold: !0, children: "Progress" }),
                ":",
                " ",
                e(RemoteSessionProgress, { session: session }),
              ],
            }),
            r(Text, {
              children: [
                e(Text, { bold: !0, children: "Session URL" }),
                ":",
                " ",
                e(Link, {
                  url: ZCe(session.sessionId),
                  children: e(Text, { dimColor: !0, children: ZCe(session.sessionId) }),
                }),
              ],
            }),
          ],
        }),
        Xe !== void 0 &&
          Xe.eventCount > 0 &&
          r(Box, {
            flexDirection: "column",
            marginTop: 1,
            children: [
              r(Text, { children: [e(Text, { bold: !0, children: "Recent messages" }), ":"] }),
              e(Box, {
                flexDirection: "column",
                height: 10,
                overflowY: "hidden",
                children: e(TranscriptModeProvider, {
                  children: lastMessages.map((msg, io) =>
                    e(
                      agentProgressSelector,
                      {
                        message: msg,
                        lookups: EMPTY_LOOKUPS,
                        addMargin: io > 0,
                        tools: tools,
                        commands: commands,
                        verbose: verbose,
                        inProgressToolUseIDs: new Set(),
                        progressMessagesForMessage: [],
                        shouldAnimate: !1,
                        shouldShowDot: !1,
                        style: "condensed",
                        isTranscriptMode: !1,
                        isStatic: !0,
                      },
                      io,
                    ),
                  ),
                }),
              }),
              e(Box, {
                marginTop: 1,
                children: r(Text, {
                  dimColor: !0,
                  italic: !0,
                  children: ["Showing last ", lastMessages.length, " of ", Xe.eventCount, " ", "messages"],
                }),
              }),
            ],
          }),
        We &&
          e(Box, {
            marginTop: 1,
            children: r(Text, { color: "error", children: ["Teleport failed: ", We] }),
          }),
        Be && e(Text, { color: "background", children: "Teleporting to session\u2026" }),
      ],
    }),
  });
}
//@ chunk-azz22fvc.js:1568-1635 fingerprint = AGENT_VERB (0.384)
function AGENT_VERB(e) {
  return (
    e.length > 0 &&
    isFilePersistenceEnabled() &&
    (filesPlacedByNameRead() !== "done" || hasConflictingPlacedFile(e))
  );
}
//@ chunk-hantmvxa.js:57940-58017 fingerprint = STAGES (0.317)
function STAGES(e) {
  return e === "all" ? "all findings" : `\u2264${e} ${plural(e, "finding")}`;
}

export { StopUltrareviewConfirm, RemoteSessionDetailDialog, STAGES, AGENT_VERB };

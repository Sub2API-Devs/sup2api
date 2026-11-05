/**
 * components/tasks/RemoteSessionDetailDialog.tsx
 *
 * 云会话（ultraplan/ultrareview）详情：阶段流水线、计划审阅、终止会话。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/tasks/RemoteSessionDetailDialog.tsx
 * pieces: chunk-czq1j3j2.js (12), chunk-h6gkxbpm.js (1), chunk-ne2890fx.js (1)
 * attribution: placement 3, fingerprint 9, layout 1, callgraph-fingerprint 1
 */
import { plural } from "../../utils/stringUtils.js";
import { isFilePersistenceEnabled } from "../../utils/filePersistence/filePersistence.js";
import { filesPlacedByNameRead } from "../../bootstrap/state.js";
import { hasConflictingPlacedFile } from "../../utils/filePersistence/taskFileLookup.js";
import {
  init_react_production,
  useState,
  useRef,
  fragmentTypeExport,
  useMemo,
} from "../../../vendor/react/cjs/react.production.js";
import { EXITPLANMODE_2 } from "../../tools/ExitPlanModeTool/constants.js";
import { ASKUSERQUESTION } from "../../tools/AskUserQuestionTool/prompt.js";
import { truncateToWidth } from "../../utils/format.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useElapsedTicker } from "../ConfirmationPrompt.js";
import { remoteSessionLogFor } from "../../tasks/RemoteAgentTask/RemoteAgentTask.js";
import { remoteSessionUrl } from "../../utils/background/remote/remoteSession.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Dialog } from "../design-system/Dialog.js";
import { FILLED_DIAMOND_GLYPH, DIAMOND_GLYPH } from "../../constants/figures.js";
import { Text, Box, Link } from "../../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { openValidatedUrlSucceeded } from "../../utils/browser.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";
import { StatusIcon } from "../design-system/StatusIcon.js";
import { formatReviewStageCounts, RemoteSessionProgress } from "./RemoteSessionProgress.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { normalizeMessages, EMPTY_LOOKUPS } from "../../utils/messages.js";
import { sdkMessagesToInternal } from "../../utils/messages/mappers.js";
import { teleportResumeCodeSession } from "../../utils/teleport.js";
import { errorMessage } from "../../utils/errors.js";
import { FocusColumn } from "../design-system/FocusColumn.js";
import { TranscriptModeProvider } from "../messages/transcriptModeContext.js";
import { agentProgressSelector } from "../../tools/AgentTool/UI.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ne2890fx.js:58114-58191 fingerprint (2.1.88 match: STAGES, 0.314)
function STAGES(maxFindings) {
  return maxFindings === "all" ? "all findings" : `\u2264${maxFindings} ${plural(maxFindings, "finding")}`;
}
//@ chunk-h6gkxbpm.js:1533-1600 placement
function agentId(agentId) {
  return (
    agentId.length > 0 &&
    isFilePersistenceEnabled() &&
    (filesPlacedByNameRead() !== "done" || hasConflictingPlacedFile(agentId))
  );
}
//@ chunk-czq1j3j2.js:702898-702902 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:702898", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:707417-707421 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:707417", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:729346-729924 fingerprint (2.1.88 match: formatToolUseSummary, 0.898)
function formatToolUseSummary(name, input, maxWidth) {
  if (name === EXITPLANMODE_2) return "Review the plan in your browser";
  if (!input || typeof input !== "object") return name;
  if (name === ASKUSERQUESTION && "questions" in input) {
    let qs = input.questions;
    if (Array.isArray(qs) && qs[0] && typeof qs[0] === "object") {
      let questionText =
        "question" in qs[0] && typeof qs[0].question === "string" && qs[0].question
          ? qs[0].question
          : "header" in qs[0] && typeof qs[0].header === "string"
            ? qs[0].header
            : null;
      if (questionText) {
        let oneLine = questionText.replace(/\s+/g, " ").trim();
        return `Answer in browser: ${truncateToWidth(oneLine, maxWidth - 10)}`;
      }
    }
  }
  for (let v of Object.values(input))
    if (typeof v === "string" && v.trim()) {
      let oneLine = v.replace(/\s+/g, " ").trim();
      return `${name} ${truncateToWidth(oneLine, maxWidth)}`;
    }
  return name;
}
//@ chunk-czq1j3j2.js:729924-730028 fingerprint (2.1.88 match: PHASE_LABEL, 0.82)
var ULTRAPLAN_STATUS_LABELS = {
  needs_input: "input required",
  plan_ready: "ready",
};
var ULTRAPLAN_STATUS_SHORT = {
  needs_input: "waiting",
  plan_ready: "done",
};
//@ chunk-czq1j3j2.js:730028-733853 fingerprint (2.1.88 match: UltraplanSessionDetail, 0.627)
function UltraplanSessionDetail(props) {
  let $ = useMemoCache(74);
  let { session, onDone, onBack, onKill } = props;
  let running = session.status === "running" || session.status === "pending";
  let phase = session.ultraplanPhase;
  let statusText = running ? (phase ? ULTRAPLAN_STATUS_LABELS[phase] : "running") : session.status;
  let elapsedTime = useElapsedTicker(session.startTime, running, 1000, 0, session.endTime);
  let sessionLog = remoteSessionLogFor(session.id);
  let agentsWorking = 1 + (sessionLog?.agentSpawnCount ?? 0);
  let toolCalls = sessionLog?.toolCallCount ?? 0;
  let lastToolCall = sessionLog?.lastToolUse
    ? formatToolUseSummary(sessionLog.lastToolUse.name, sessionLog.lastToolUse.input, 60)
    : null;
  let sessionUrl;
  if ($[0] !== session.sessionId) {
    sessionUrl = remoteSessionUrl(session.sessionId);
    $[0] = session.sessionId;
    $[1] = sessionUrl;
  } else sessionUrl = $[1];
  let sessionUrl_2 = sessionUrl;
  let t5;
  if ($[2] !== onBack || $[3] !== onDone) {
    t5 =
      onBack ??
      (() =>
        onDone("Cloud session details dismissed", {
          display: "system",
        }));
    $[2] = onBack;
    $[3] = onDone;
    $[4] = t5;
  } else t5 = $[4];
  let goBackOrClose = t5;
  let [confirmingStop, setConfirmingStop] = useState(false);
  if (confirmingStop) {
    const discardsPlan = phase === "plan_ready";
    let onStop;
    if ($[5] !== goBackOrClose || $[6] !== onKill) {
      onStop = () => {
        onKill?.();
        goBackOrClose();
      };
      $[5] = goBackOrClose;
      $[6] = onKill;
      $[7] = onStop;
    } else onStop = $[7];
    let onBack;
    if ($[8] !== setConfirmingStop) {
      onBack = () => setConfirmingStop(false);
      $[8] = setConfirmingStop;
      $[9] = onBack;
    } else onBack = $[9];
    let confirmElement;
    if ($[10] !== discardsPlan || $[11] !== onStop || $[12] !== onBack) {
      confirmElement = jsxProd_default(StopUltraplanConfirm, {
        discardsPlan,
        backFirst: false,
        onStop,
        onBack,
      });
      $[10] = discardsPlan;
      $[11] = onStop;
      $[12] = onBack;
      $[13] = confirmElement;
    } else confirmElement = $[13];
    return confirmElement;
  }
  const DialogComponent = Dialog;
  const phaseGlyph = phase === "plan_ready" ? FILLED_DIAMOND_GLYPH : DIAMOND_GLYPH;
  let t7;
  if ($[14] !== phaseGlyph) {
    t7 = jsxProd_default_2(Text, {
      color: "background",
      children: [phaseGlyph, " "],
    });
    $[14] = phaseGlyph;
    $[15] = t7;
  } else t7 = $[15];
  let t8;
  if ($[16] === MEMO_CACHE_SENTINEL) {
    t8 = jsxProd_default(Text, {
      bold: true,
      children: "ultraplan",
    });
    $[16] = t8;
  } else t8 = $[16];
  let t9;
  if ($[17] !== elapsedTime || $[18] !== statusText) {
    t9 = jsxProd_default_2(Text, {
      dimColor: true,
      children: [" \xB7 ", elapsedTime, " \xB7 ", statusText],
    });
    $[17] = elapsedTime;
    $[18] = statusText;
    $[19] = t9;
  } else t9 = $[19];
  let title;
  if ($[20] !== t7 || $[21] !== t9) {
    title = jsxProd_default_2(Text, {
      children: [t7, t8, t9],
    });
    $[20] = t7;
    $[21] = t9;
    $[22] = title;
  } else title = $[22];
  const color = "background";
  const BoxComponent = Box;
  const flexDirection = "column";
  const gap = 1;
  const TextComponent = Text;
  let t11;
  if ($[23] !== phase) {
    t11 =
      phase === "plan_ready" &&
      jsxProd_default_2(Text, {
        color: "success",
        children: [figures_default.tick, " "],
      });
    $[23] = phase;
    $[24] = t11;
  } else t11 = $[24];
  const spaceAfterAgentCount = " ";
  let t12;
  if ($[25] !== agentsWorking) {
    t12 = plural(agentsWorking, "agent");
    $[25] = agentsWorking;
    $[26] = t12;
  } else t12 = $[26];
  const spaceBeforePhase = " ";
  const phaseLabel = phase ? ULTRAPLAN_STATUS_SHORT[phase] : "working";
  const toolCountSeparator = " \xB7 ";
  const toolSuffix = " tool";
  const spaceAfterToolCount = " ";
  const toolCallCountLabel = plural(toolCalls, "call");
  let t15;
  if (
    $[27] !== TextComponent ||
    $[28] !== agentsWorking ||
    $[29] !== t11 ||
    $[30] !== t12 ||
    $[31] !== phaseLabel ||
    $[32] !== toolCallCountLabel ||
    $[33] !== toolCalls
  ) {
    t15 = jsxProd_default_2(TextComponent, {
      children: [
        t11,
        agentsWorking,
        spaceAfterAgentCount,
        t12,
        spaceBeforePhase,
        phaseLabel,
        toolCountSeparator,
        toolCalls,
        toolSuffix,
        spaceAfterToolCount,
        toolCallCountLabel,
      ],
    });
    $[27] = TextComponent;
    $[28] = agentsWorking;
    $[29] = t11;
    $[30] = t12;
    $[31] = phaseLabel;
    $[32] = toolCallCountLabel;
    $[33] = toolCalls;
    $[34] = t15;
  } else t15 = $[34];
  let t16;
  if ($[35] !== lastToolCall) {
    t16 =
      lastToolCall &&
      jsxProd_default(Text, {
        dimColor: true,
        children: lastToolCall,
      });
    $[35] = lastToolCall;
    $[36] = t16;
  } else t16 = $[36];
  let children;
  if ($[37] !== sessionUrl_2) {
    children = jsxProd_default(Text, {
      dimColor: true,
      children: sessionUrl_2,
    });
    $[37] = sessionUrl_2;
    $[38] = children;
  } else children = $[38];
  let t18;
  if ($[39] !== sessionUrl_2 || $[40] !== children) {
    t18 = jsxProd_default(Link, {
      url: sessionUrl_2,
      children,
    });
    $[39] = sessionUrl_2;
    $[40] = children;
    $[41] = t18;
  } else t18 = $[41];
  const label =
    phase === "plan_ready"
      ? "Review in browser"
      : phase === "needs_input"
        ? "Answer in browser"
        : "Open in browser";
  let openOptionDescription;
  if ($[42] !== phase) {
    openOptionDescription = phase === "plan_ready" && {
      description: "Approve, edit, or comment on the plan",
    };
    $[42] = phase;
    $[43] = openOptionDescription;
  } else openOptionDescription = $[43];
  let openOption;
  if ($[44] !== label || $[45] !== openOptionDescription) {
    openOption = {
      label,
      value: "open",
      ...openOptionDescription,
    };
    $[44] = label;
    $[45] = openOptionDescription;
    $[46] = openOption;
  } else openOption = $[46];
  let stopOptions;
  if ($[47] !== onKill || $[48] !== phase || $[49] !== running) {
    stopOptions =
      onKill && running
        ? [
            {
              label: "Stop ultraplan",
              value: "stop",
              ...(phase === "plan_ready" && {
                description: "Discard the generated plan",
              }),
            },
          ]
        : [];
    $[47] = onKill;
    $[48] = phase;
    $[49] = running;
    $[50] = stopOptions;
  } else stopOptions = $[50];
  let t21;
  if ($[51] === MEMO_CACHE_SENTINEL) {
    t21 = {
      label: "Back",
      value: "back",
    };
    $[51] = t21;
  } else t21 = $[51];
  let options;
  if ($[52] !== openOption || $[53] !== stopOptions) {
    options = [openOption, ...stopOptions, t21];
    $[52] = openOption;
    $[53] = stopOptions;
    $[54] = options;
  } else options = $[54];
  let onChange;
  if ($[55] !== goBackOrClose || $[56] !== onDone || $[57] !== sessionUrl_2 || $[58] !== setConfirmingStop) {
    onChange = (v_0) => {
      switch (v_0) {
        case "open": {
          openValidatedUrlSucceeded(sessionUrl_2);
          onDone();
          return;
        }
        case "stop": {
          setConfirmingStop(true);
          return;
        }
        case "back": {
          goBackOrClose();
          return;
        }
      }
    };
    $[55] = goBackOrClose;
    $[56] = onDone;
    $[57] = sessionUrl_2;
    $[58] = setConfirmingStop;
    $[59] = onChange;
  } else onChange = $[59];
  let t24;
  if ($[60] !== options || $[61] !== onChange) {
    t24 = jsxProd_default(ModelSelector, {
      options,
      onChange,
    });
    $[60] = options;
    $[61] = onChange;
    $[62] = t24;
  } else t24 = $[62];
  let children_2;
  if ($[63] !== BoxComponent || $[64] !== t15 || $[65] !== t16 || $[66] !== t18 || $[67] !== t24) {
    children_2 = jsxProd_default_2(BoxComponent, {
      flexDirection,
      gap,
      children: [t15, t16, t18, t24],
    });
    $[63] = BoxComponent;
    $[64] = t15;
    $[65] = t16;
    $[66] = t18;
    $[67] = t24;
    $[68] = children_2;
  } else children_2 = $[68];
  let t26;
  if ($[69] !== DialogComponent || $[70] !== goBackOrClose || $[71] !== children_2 || $[72] !== title) {
    t26 = jsxProd_default(DialogComponent, {
      title,
      onCancel: goBackOrClose,
      color,
      children: children_2,
    });
    $[69] = DialogComponent;
    $[70] = goBackOrClose;
    $[71] = children_2;
    $[72] = title;
    $[73] = t26;
  } else t26 = $[73];
  return t26;
}
//@ chunk-czq1j3j2.js:733853-734834 layout
/**
 * "停止 ultraplan？"确认对话框：终止云会话（可选同时丢弃计划），防止重复触发。
 */
function StopUltraplanConfirm(props) {
  let $ = useMemoCache(15);
  let { discardsPlan, backFirst, onStop, onBack } = props;
  let hasAnsweredRef = useRef(false);
  let answerOnce;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    answerOnce = (callback) => {
      if (!hasAnsweredRef.current) {
        hasAnsweredRef.current = true;
        callback();
      }
    };
    $[0] = answerOnce;
  } else answerOnce = $[0];
  let answerOnce_ = answerOnce;
  let noticeText;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    noticeText = jsxProd_default(Text, {
      dimColor: true,
      children: "This will terminate the cloud session.",
    });
    $[1] = noticeText;
  } else noticeText = $[1];
  const confirmLabel = discardsPlan ? "Terminate session and discard plan" : "Terminate session";
  const focus = backFirst ? "cancel" : "confirm";
  let onConfirm;
  if ($[2] !== onStop) {
    onConfirm = () => answerOnce_(onStop);
    $[2] = onStop;
    $[3] = onConfirm;
  } else onConfirm = $[3];
  let onCancel;
  if ($[4] !== onBack) {
    onCancel = () => answerOnce_(onBack);
    $[4] = onBack;
    $[5] = onCancel;
  } else onCancel = $[5];
  let children;
  if (
    $[6] !== backFirst ||
    $[7] !== confirmLabel ||
    $[8] !== focus ||
    $[9] !== onConfirm ||
    $[10] !== onCancel
  ) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        noticeText,
        jsxProd_default(ConfirmSelect, {
          confirmLabel,
          cancelLabel: "Back",
          cancelFirst: backFirst,
          focus,
          hideIndexes: backFirst,
          onConfirm,
          onCancel,
        }),
      ],
    });
    $[6] = backFirst;
    $[7] = confirmLabel;
    $[8] = focus;
    $[9] = onConfirm;
    $[10] = onCancel;
    $[11] = children;
  } else children = $[11];
  let dialogElement;
  if ($[12] !== onBack || $[13] !== children) {
    dialogElement = jsxProd_default(Dialog, {
      title: "Stop ultraplan?",
      onCancel: onBack,
      color: "background",
      children,
    });
    $[12] = onBack;
    $[13] = children;
    $[14] = dialogElement;
  } else dialogElement = $[14];
  return dialogElement;
}
//@ chunk-czq1j3j2.js:734834-734941 fingerprint (2.1.88 match: STAGE_LABELS, 0.772)
var REVIEW_STAGES = ["finding", "verifying", "synthesizing"];
var REVIEW_STAGE_LABELS = {
  finding: "Find",
  verifying: "Verify",
  synthesizing: "Dedupe",
};
//@ chunk-czq1j3j2.js:734941-735861 fingerprint (2.1.88 match: StagePipeline, 0.627)
function StagePipeline(props) {
  let $ = useMemoCache(15);
  let { stage, completed, hasProgress } = props;
  let t1;
  if ($[0] !== stage) {
    t1 = stage ? REVIEW_STAGES.indexOf(stage) : -1;
    $[0] = stage;
    $[1] = t1;
  } else t1 = $[1];
  let currentIdx = t1;
  let inSetup = !completed && !hasProgress;
  let t2;
  if ($[2] !== inSetup) {
    t2 = inSetup
      ? jsxProd_default(Text, {
          color: "background",
          children: "Setup",
        })
      : jsxProd_default(Text, {
          dimColor: true,
          children: "Setup",
        });
    $[2] = inSetup;
    $[3] = t2;
  } else t2 = $[3];
  let t3;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    t3 = jsxProd_default(Text, {
      dimColor: true,
      children: " \u2192 ",
    });
    $[4] = t3;
  } else t3 = $[4];
  let t4;
  if ($[5] !== completed || $[6] !== currentIdx || $[7] !== inSetup) {
    t4 = REVIEW_STAGES.map((stage, i) => {
      let isCurrent = !completed && !inSetup && i === currentIdx;
      return jsxProd_default_2(
        fragmentTypeExport,
        {
          children: [
            i > 0 &&
              jsxProd_default(Text, {
                dimColor: true,
                children: " \u2192 ",
              }),
            isCurrent
              ? jsxProd_default(Text, {
                  color: "background",
                  children: REVIEW_STAGE_LABELS[stage],
                })
              : jsxProd_default(Text, {
                  dimColor: true,
                  children: REVIEW_STAGE_LABELS[stage],
                }),
          ],
        },
        stage,
      );
    });
    $[5] = completed;
    $[6] = currentIdx;
    $[7] = inSetup;
    $[8] = t4;
  } else t4 = $[8];
  let t5;
  if ($[9] !== completed) {
    t5 =
      completed &&
      jsxProd_default_2(Text, {
        children: [
          " ",
          jsxProd_default(StatusIcon, {
            status: "success",
          }),
        ],
      });
    $[9] = completed;
    $[10] = t5;
  } else t5 = $[10];
  let t6;
  if ($[11] !== t2 || $[12] !== t4 || $[13] !== t5) {
    t6 = jsxProd_default_2(Text, {
      children: [t2, t3, t4, t5],
    });
    $[11] = t2;
    $[12] = t4;
    $[13] = t5;
    $[14] = t6;
  } else t6 = $[14];
  return t6;
}
//@ chunk-czq1j3j2.js:735861-736148 fingerprint (2.1.88 match: reviewCountsLine, 1)
function reviewCountsLine(session) {
  let reviewProgress = session.reviewProgress;
  if (!reviewProgress) return session.status === "completed" ? "done" : "setting up";
  let verified = reviewProgress.bugsVerified;
  let refuted = reviewProgress.bugsRefuted ?? 0;
  if (session.status === "completed") {
    let parts = [`${verified} ${plural(verified, "finding")}`];
    if (refuted > 0) parts.push(`${refuted} refuted`);
    return parts.join(" \xB7 ");
  }
  return formatReviewStageCounts(reviewProgress.stage, reviewProgress.bugsFound, verified, refuted);
}
//@ chunk-czq1j3j2.js:736148-737128 callgraph-fingerprint (2.1.88 match: _temp, 0.156)
/**
 * "停止 ultrareview？"确认对话框：归档云会话、停止本地跟踪并丢弃已有发现。
 */
function StopUltrareviewConfirm(exitState) {
  let $ = useMemoCache(10);
  let { onStop, onBack } = exitState;
  let hasAnsweredRef = useRef(false);
  let handleAnswer;
  if ($[0] !== onBack || $[1] !== onStop) {
    handleAnswer = (answer) => {
      if (hasAnsweredRef.current) {
        return;
      }
      hasAnsweredRef.current = true;
      if (answer === "stop") onStop();
      else onBack();
    };
    $[0] = onBack;
    $[1] = onStop;
    $[2] = handleAnswer;
  } else handleAnswer = $[2];
  let answerOnce = handleAnswer;
  let inputGuide;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [
        jsxProd_default(KeyboardShortcutHint, {
          chord: "enter",
          action: "select",
        }),
        jsxProd_default(KeyboardShortcutHint, {
          chord: "escape",
          action: "go back",
        }),
      ],
    });
    $[3] = inputGuide;
  } else inputGuide = $[3];
  let noticeText;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    noticeText = jsxProd_default(Text, {
      dimColor: true,
      children:
        "This archives the cloud session and stops local tracking. The review will not complete and any findings so far are discarded.",
    });
    $[4] = noticeText;
  } else noticeText = $[4];
  let children;
  if ($[5] !== answerOnce) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        noticeText,
        jsxProd_default(ConfirmSelect, {
          confirmLabel: "Stop ultrareview",
          cancelLabel: "Back",
          cancelFirst: true,
          focus: "cancel",
          hideIndexes: true,
          onConfirm: () => answerOnce("stop"),
          onCancel: () => answerOnce("back"),
        }),
      ],
    });
    $[5] = answerOnce;
    $[6] = children;
  } else children = $[6];
  let dialogElement;
  if ($[7] !== onBack || $[8] !== children) {
    dialogElement = jsxProd_default(Dialog, {
      title: "Stop ultrareview?",
      onCancel: onBack,
      color: "background",
      inputGuide,
      children,
    });
    $[7] = onBack;
    $[8] = children;
    $[9] = dialogElement;
  } else dialogElement = $[9];
  return dialogElement;
}
//@ chunk-czq1j3j2.js:737128-739915 fingerprint (2.1.88 match: ReviewSessionDetail, 0.743)
function ReviewSessionDetail(props) {
  let $ = useMemoCache(50);
  let { session, onDone, onBack, onKill } = props;
  let completed = session.status === "completed";
  let running = session.status === "running" || session.status === "pending";
  let [confirmingStop, setConfirmingStop] = useState(false);
  let elapsedTime = useElapsedTicker(session.startTime, running, 1000, 0, session.endTime);
  let t1;
  if ($[0] !== onDone) {
    t1 = () =>
      onDone("Cloud session details dismissed", {
        display: "system",
      });
    $[0] = onDone;
    $[1] = t1;
  } else t1 = $[1];
  let handleClose = t1;
  let goBackOrClose = onBack ?? handleClose;
  let statusLabel = completed ? "ready" : running ? "running" : session.status;
  if (confirmingStop) {
    let onStop;
    if ($[2] !== goBackOrClose || $[3] !== onKill) {
      onStop = () => {
        onKill?.();
        goBackOrClose();
      };
      $[2] = goBackOrClose;
      $[3] = onKill;
      $[4] = onStop;
    } else onStop = $[4];
    let onBack;
    if ($[5] === MEMO_CACHE_SENTINEL) {
      onBack = () => setConfirmingStop(false);
      $[5] = onBack;
    } else onBack = $[5];
    let confirmElement;
    if ($[6] !== onStop) {
      confirmElement = jsxProd_default(StopUltrareviewConfirm, {
        onStop,
        onBack,
      });
      $[6] = onStop;
      $[7] = confirmElement;
    } else confirmElement = $[7];
    return confirmElement;
  }
  let options;
  if ($[8] !== completed || $[9] !== onKill || $[10] !== running) {
    options = completed
      ? [
          {
            label: "Dismiss",
            value: "dismiss",
          },
        ]
      : [
          ...(onKill && running
            ? [
                {
                  label: "Stop ultrareview",
                  value: "stop",
                },
              ]
            : []),
          {
            label: "Back",
            value: "back",
          },
        ];
    $[8] = completed;
    $[9] = onKill;
    $[10] = running;
    $[11] = options;
  } else options = $[11];
  let options_2 = options;
  let handleChange;
  if ($[12] !== goBackOrClose || $[13] !== handleClose) {
    handleChange = (action) => {
      eo: switch (action) {
        case "stop": {
          setConfirmingStop(true);
          break eo;
        }
        case "back": {
          goBackOrClose();
          break eo;
        }
        case "dismiss": {
          handleClose();
        }
      }
    };
    $[12] = goBackOrClose;
    $[13] = handleClose;
    $[14] = handleChange;
  } else handleChange = $[14];
  let onChange = handleChange;
  const t5 = completed ? FILLED_DIAMOND_GLYPH : DIAMOND_GLYPH;
  let t6;
  if ($[15] !== t5) {
    t6 = jsxProd_default_2(Text, {
      color: "background",
      children: [t5, " "],
    });
    $[15] = t5;
    $[16] = t6;
  } else t6 = $[16];
  let t7;
  if ($[17] === MEMO_CACHE_SENTINEL) {
    t7 = jsxProd_default(Text, {
      bold: true,
      children: "ultrareview",
    });
    $[17] = t7;
  } else t7 = $[17];
  let t8;
  if ($[18] !== elapsedTime || $[19] !== statusLabel) {
    t8 = jsxProd_default_2(Text, {
      dimColor: true,
      children: [" \xB7 ", elapsedTime, " \xB7 ", statusLabel],
    });
    $[18] = elapsedTime;
    $[19] = statusLabel;
    $[20] = t8;
  } else t8 = $[20];
  let title;
  if ($[21] !== t6 || $[22] !== t8) {
    title = jsxProd_default_2(Text, {
      children: [t6, t7, t8],
    });
    $[21] = t6;
    $[22] = t8;
    $[23] = title;
  } else title = $[23];
  let inputGuide;
  if ($[24] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [
        jsxProd_default(KeyboardShortcutHint, {
          chord: "enter",
          action: "select",
        }),
        jsxProd_default(KeyboardShortcutHint, {
          chord: "escape",
          action: "go back",
        }),
      ],
    });
    $[24] = inputGuide;
  } else inputGuide = $[24];
  const stage = session.reviewProgress?.stage;
  const hasProgress = !!session.reviewProgress;
  let t12;
  if ($[25] !== completed || $[26] !== stage || $[27] !== hasProgress) {
    t12 = jsxProd_default(StagePipeline, {
      stage,
      completed,
      hasProgress,
    });
    $[25] = completed;
    $[26] = stage;
    $[27] = hasProgress;
    $[28] = t12;
  } else t12 = $[28];
  let children;
  if ($[29] !== session) {
    children = reviewCountsLine(session);
    $[29] = session;
    $[30] = children;
  } else children = $[30];
  let t14;
  if ($[31] !== children) {
    t14 = jsxProd_default(Text, {
      children,
    });
    $[31] = children;
    $[32] = t14;
  } else t14 = $[32];
  let doneNote;
  if ($[33] !== completed) {
    doneNote =
      completed &&
      jsxProd_default(Text, {
        dimColor: true,
        children: "The full review is in this session.",
      });
    $[33] = completed;
    $[34] = doneNote;
  } else doneNote = $[34];
  let t17;
  if ($[35] !== t14 || $[36] !== doneNote) {
    t17 = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [t14, doneNote],
    });
    $[35] = t14;
    $[36] = doneNote;
    $[37] = t17;
  } else t17 = $[37];
  const defaultFocusValue = completed ? "dismiss" : "back";
  let t18;
  if ($[38] !== onChange || $[39] !== options_2 || $[40] !== defaultFocusValue) {
    t18 = jsxProd_default(ModelSelector, {
      options: options_2,
      defaultFocusValue,
      onChange,
    });
    $[38] = onChange;
    $[39] = options_2;
    $[40] = defaultFocusValue;
    $[41] = t18;
  } else t18 = $[41];
  let children_2;
  if ($[42] !== t12 || $[43] !== t17 || $[44] !== t18) {
    children_2 = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [t12, t17, t18],
    });
    $[42] = t12;
    $[43] = t17;
    $[44] = t18;
    $[45] = children_2;
  } else children_2 = $[45];
  let t20;
  if ($[46] !== goBackOrClose || $[47] !== children_2 || $[48] !== title) {
    t20 = jsxProd_default(Dialog, {
      title,
      onCancel: goBackOrClose,
      color: "background",
      inputGuide,
      children: children_2,
    });
    $[46] = goBackOrClose;
    $[47] = children_2;
    $[48] = title;
    $[49] = t20;
  } else t20 = $[49];
  return t20;
}
//@ chunk-czq1j3j2.js:739915-742624 fingerprint (2.1.88 match: RemoteSessionDetailDialog, 0.679)
/**
 * 云会话详情：ultraplan 显示阶段与计划审阅（在浏览器中查看），ultrareview 显示发现/验证计数，可终止或归档会话。
 */
function RemoteSessionDetailDialog({ session, tools, commands, verbose, onDone, onBack, onKill }) {
  let [isTeleporting, setIsTeleporting] = useState(false);
  let [teleportError, setTeleportError] = useState(null);
  let sessionLog = remoteSessionLogFor(session.id);
  let tail = sessionLog?.tail;
  let lastMessages = useMemo(() => {
    if (session.isUltraplan || session.isRemoteReview || !tail) return [];
    return normalizeMessages(sdkMessagesToInternal(tail))
      .filter((message) => message.type !== "progress")
      .slice(-3);
  }, [session.isUltraplan, session.isRemoteReview, tail]);
  let isRunning = session.status === "running" || session.status === "pending";
  let elapsedTicker = useElapsedTicker(session.startTime, isRunning, 1000, 0, session.endTime);
  if (session.isUltraplan)
    return jsxProd_default(UltraplanSessionDetail, {
      session,
      onDone,
      onBack,
      onKill,
    });
  if (session.isRemoteReview)
    return jsxProd_default(ReviewSessionDetail, {
      session,
      onDone,
      onBack,
      onKill,
    });
  let handleClose = () =>
    onDone("Cloud session details dismissed", {
      display: "system",
    });
  let handleKeyDown = (e) => {
    if (e.key === " ") {
      e.preventDefault();
      onDone("Cloud session details dismissed", {
        display: "system",
      });
    } else if (e.key === "left" && onBack) {
      e.preventDefault();
      onBack();
    } else if (e.key === "t" && !e.ctrl && !e.meta && !isTeleporting) {
      e.preventDefault();
      handleTeleport();
    } else if (e.key === "return") {
      e.preventDefault();
      handleClose();
    }
  };
  async function handleTeleport() {
    setIsTeleporting(true);
    setTeleportError(null);
    try {
      await teleportResumeCodeSession(session.sessionId);
    } catch (err) {
      setTeleportError(errorMessage(err));
    } finally {
      setIsTeleporting(false);
    }
  }
  let displayTitle = truncateToWidth(session.title, 50);
  let displayStatus = session.status === "pending" ? "starting" : session.status;
  return jsxProd_default(FocusColumn, {
    onKeyDown: handleKeyDown,
    children: jsxProd_default_2(Dialog, {
      title: "Cloud session details",
      onCancel: handleClose,
      color: "background",
      inputGuide: jsxProd_default_2(Byline, {
        children: [
          onBack &&
            jsxProd_default(KeyboardShortcutHint, {
              chord: "left",
              action: "go back",
            }),
          jsxProd_default(KeyboardShortcutHint, {
            chord: ["escape", "enter", "space"],
            action: "close",
          }),
          !isTeleporting &&
            jsxProd_default(KeyboardShortcutHint, {
              chord: "t",
              action: "teleport",
            }),
        ],
      }),
      children: [
        jsxProd_default_2(Box, {
          flexDirection: "column",
          children: [
            jsxProd_default_2(Text, {
              children: [
                jsxProd_default(Text, {
                  bold: true,
                  children: "Status",
                }),
                ":",
                " ",
                displayStatus === "running" || displayStatus === "starting"
                  ? jsxProd_default(Text, {
                      color: "background",
                      children: displayStatus,
                    })
                  : displayStatus === "completed"
                    ? jsxProd_default(Text, {
                        color: "success",
                        children: displayStatus,
                      })
                    : jsxProd_default(Text, {
                        color: "error",
                        children: displayStatus,
                      }),
              ],
            }),
            jsxProd_default_2(Text, {
              children: [
                jsxProd_default(Text, {
                  bold: true,
                  children: "Runtime",
                }),
                ": ",
                elapsedTicker,
              ],
            }),
            jsxProd_default_2(Text, {
              wrap: "truncate-end",
              children: [
                jsxProd_default(Text, {
                  bold: true,
                  children: "Title",
                }),
                ": ",
                displayTitle,
              ],
            }),
            jsxProd_default_2(Text, {
              children: [
                jsxProd_default(Text, {
                  bold: true,
                  children: "Progress",
                }),
                ":",
                " ",
                jsxProd_default(RemoteSessionProgress, {
                  session,
                }),
              ],
            }),
            jsxProd_default_2(Text, {
              children: [
                jsxProd_default(Text, {
                  bold: true,
                  children: "Session URL",
                }),
                ":",
                " ",
                jsxProd_default(Link, {
                  url: remoteSessionUrl(session.sessionId),
                  children: jsxProd_default(Text, {
                    dimColor: true,
                    children: remoteSessionUrl(session.sessionId),
                  }),
                }),
              ],
            }),
          ],
        }),
        sessionLog !== undefined &&
          sessionLog.eventCount > 0 &&
          jsxProd_default_2(Box, {
            flexDirection: "column",
            marginTop: 1,
            children: [
              jsxProd_default_2(Text, {
                children: [
                  jsxProd_default(Text, {
                    bold: true,
                    children: "Recent messages",
                  }),
                  ":",
                ],
              }),
              jsxProd_default(Box, {
                flexDirection: "column",
                height: 10,
                overflowY: "hidden",
                children: jsxProd_default(TranscriptModeProvider, {
                  children: lastMessages.map((msg, i) =>
                    jsxProd_default(
                      agentProgressSelector,
                      {
                        message: msg,
                        lookups: EMPTY_LOOKUPS,
                        addMargin: i > 0,
                        tools,
                        commands,
                        verbose,
                        inProgressToolUseIDs: new Set(),
                        progressMessagesForMessage: [],
                        shouldAnimate: false,
                        shouldShowDot: false,
                        style: "condensed",
                        isTranscriptMode: false,
                        isStatic: true,
                      },
                      i,
                    ),
                  ),
                }),
              }),
              jsxProd_default(Box, {
                marginTop: 1,
                children: jsxProd_default_2(Text, {
                  dimColor: true,
                  italic: true,
                  children: [
                    "Showing last ",
                    lastMessages.length,
                    " of ",
                    sessionLog.eventCount,
                    " ",
                    "messages",
                  ],
                }),
              }),
            ],
          }),
        teleportError &&
          jsxProd_default(Box, {
            marginTop: 1,
            children: jsxProd_default_2(Text, {
              color: "error",
              children: ["Teleport failed: ", teleportError],
            }),
          }),
        isTeleporting &&
          jsxProd_default(Text, {
            color: "background",
            children: "Teleporting to session\u2026",
          }),
      ],
    }),
  });
}
export { agentId, StopUltrareviewConfirm, RemoteSessionDetailDialog, STAGES };

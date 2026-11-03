/**
 * components/PromptInput/PromptInputQueuedCommands.tsx
 *
 * 输入框上方显示排队中的命令预览；本模块混入大量 task-notification 判定副本（切分误归）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/PromptInput/PromptInputQueuedCommands.tsx
 * pieces: chunk-18hwfzwa.js (16)
 * attribution: placement 14, fingerprint 2
 */
import {
  parseTaskNotification,
  buildCollapsedNotification,
  collapseNotificationRuns,
} from "../../utils/queuedCommandDisplay.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { isTaggedSystemUserText } from "../messages/UserTextMessage.js";
import { isNonHumanQueuedCommand, isRefillableInput } from "../../utils/messageQueueManager.js";
import {
  peerOrObserverFrom,
  isNonHumanQueuedOrigin,
  QueuedCommandRow,
  hasAbortedSignal,
  SendNowButton,
  framePreviewText,
  renderContentBlockPreview,
} from "./WaitingMessages.js";
import {
  parseFrameForDisplay,
  IdleNotificationMessageSchema,
  capRawFrameTextForDisplay,
  IDLE_FRAME_TOTAL_RECEIVE_BOUND,
  FRAME_SANITIZED_FOR_DISPLAY_MARKER,
  capStrippedFrameField,
} from "../../utils/teammateMailbox.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useCommandQueue } from "../Messages.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useAppState } from "../../state/AppState.js";
import { selectIsViewingAgentTask } from "../Spinner/TeammateSpinnerTree.js";
import { shouldShowNotice } from "../SlashCommandLink.js";
import { isFullscreenEnvEnabled } from "../../utils/fullscreen.js";
import { collapseExcessTaskNotifications } from "../../tasks/RemoteAgentTask/RemoteAgentTask.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { QueuedMessageProvider } from "../../context/QueuedMessageContext.js";
import { agentProgressSelector } from "../../tools/AgentTool/UI.js";
import { EMPTY_LOOKUPS, createUserMessage, normalizeMessages } from "../../utils/messages.js";
import { Box } from "../../ink/components/Text.js";

//@ chunk-18hwfzwa.js:120821-120864 placement
function selectAbortController(Bo) {
  return Bo.abortController;
}
//@ chunk-18hwfzwa.js:120911-120953 placement
function selectQueueEditIndex(Ho) {
  return Ho.queueEditIndex;
}
//@ chunk-18hwfzwa.js:120953-120988 placement
function selectVerbose_3(Io) {
  return Io.verbose;
}
//@ chunk-18hwfzwa.js:120988-121042 placement
function selectToolPermissionContextMode_4(Wo) {
  return Wo.toolPermissionContext.mode;
}
//@ chunk-18hwfzwa.js:121093-121136 placement
function selectAbortController2(Et) {
  return Et.abortController;
}
//@ chunk-18hwfzwa.js:121136-121190 placement
function selectToolPermissionContextMode2(Dt) {
  return Dt.toolPermissionContext.mode;
}
//@ chunk-18hwfzwa.js:121190-121237 placement = _temp2 (1)
function selectHasViewedAgentTask(s_0) {
  return !!s_0.viewingAgentTaskId;
}
//@ chunk-18hwfzwa.js:121237-121288 placement
var EMPTY_TOOL_USE_IDS = new Set();
var MAX_REPLY_ROWS = 3;
var MIN_CHARS_PER_BLOCK = 256;
var MAX_PREVIEW_BLOCKS = 50;
var COMMAND_ROW_INDENT = 16;
var COMMAND_ROW_PADDING = 32;
//@ chunk-18hwfzwa.js:121288-121809 placement
function queuedCommandOriginLabel(h) {
  let origin = h[0]?.origin;
  let origin_2 = h.at(-1)?.origin;
  if (
    origin?.kind === "task-notification" &&
    origin.source === "artifact-auto-react" &&
    origin.displayName !== undefined &&
    h.every(
      (L) =>
        L.origin?.kind === "task-notification" &&
        L.origin.source === "artifact-auto-react" &&
        L.origin.coalesced?.family === "auto-replied" &&
        L.origin.slug === origin.slug,
    )
  ) {
    let L = h.length;
    return `+${L} more auto-reply ${L === 1 ? "notice" : "notices"} on Artifact: ${origin_2?.kind === "task-notification" && origin_2.displayName !== undefined ? origin_2.displayName : origin.displayName}`;
  }
  return `+${h.length} more tasks completed`;
}
//@ chunk-18hwfzwa.js:121809-121885 placement
function getQueuedCommandText(h) {
  return typeof h.value === "string" ? parseTaskNotification(h.value, h.origin) : null;
}
//@ chunk-18hwfzwa.js:121885-121992 fingerprint = processQueuedCommands (1)
function processQueuedCommands(h, x) {
  return {
    value: buildCollapsedNotification(x, h.length - 1),
    mode: "task-notification",
    agentId: mainAgentId(),
    origin: h[0].origin,
  };
}
//@ chunk-18hwfzwa.js:121992-122030 placement
function summarizeQueuedCommand(h) {
  return collapseNotificationRuns(h, getQueuedCommandText, processQueuedCommands);
}
//@ chunk-18hwfzwa.js:122030-122160 placement = processQueuedCommands (1)
function isTaskNotificationCommand(queuedCommands) {
  return (
    queuedCommands.mode === "task-notification" &&
    queuedCommands.origin?.kind === "task-notification" &&
    typeof queuedCommands.value === "string" &&
    isTaggedSystemUserText(queuedCommands.value)
  );
}
//@ chunk-18hwfzwa.js:122160-122371 placement
function humanQueuedCommands(commandQueue) {
  return commandQueue.filter((x) => {
    if (!isNonHumanQueuedCommand(x)) return false;
    if (typeof x.value !== "string") return true;
    if (isTaskNotificationCommand(x)) return false;
    return !(
      peerOrObserverFrom(x.origin) !== undefined &&
      parseFrameForDisplay(IdleNotificationMessageSchema(), x.value) !== null &&
      capRawFrameTextForDisplay(x.value, peerOrObserverFrom(x.origin)) === x.value
    );
  });
}
//@ chunk-18hwfzwa.js:122727-124299 placement
function QueuedCommandsList(props) {
  let $ = w(23);
  let { turn, promptMounted } = props;
  let commandQueue = useCommandQueue();
  let storeSelector = useStoreSelector(turn, selectAbortController);
  let appState = useAppState(selectIsViewingAgentTask);
  let appState_2 = useAppState(selectQueueEditIndex);
  let appState_3 = useAppState(selectVerbose_3);
  let He = shouldShowNotice(appState_3);
  let ze;
  if ($[0] !== He) {
    ze = He && isFullscreenEnvEnabled();
    $[0] = He;
    $[1] = ze;
  } else ze = $[1];
  let dedupe = ze;
  let appState_4 = useAppState(selectToolPermissionContextMode_4);
  let kt;
  if ($[2] !== dedupe || $[3] !== commandQueue) {
    At: {
      if (commandQueue.length === 0) {
        kt = null;
        break At;
      }
      let It = collapseExcessTaskNotifications(humanQueuedCommands(commandQueue), dedupe);
      if (It.length === 0) {
        kt = null;
        break At;
      }
      kt = PromptInputQueuedCommandsImpl(It);
    }
    $[2] = dedupe;
    $[3] = commandQueue;
    $[4] = kt;
  } else kt = $[4];
  let Ot = kt;
  let Et;
  Dt: {
    if (appState_2 === null || Ot === null) {
      Et = undefined;
      break Dt;
    }
    let Lt;
    if ($[5] !== commandQueue) {
      Lt = commandQueue.filter(isRefillableInput);
      $[5] = commandQueue;
      $[6] = Lt;
    } else Lt = $[6];
    let oo = Lt[appState_2];
    let Xt;
    if ($[7] !== oo || $[8] !== Ot) {
      Xt = Ot.some((io) => io.command === oo) ? oo : undefined;
      $[7] = oo;
      $[8] = Ot;
      $[9] = Xt;
    } else Xt = $[9];
    Et = Xt;
  }
  let so = Et;
  if (appState || Ot === null) {
    return null;
  }
  let po = so !== undefined;
  let Lt;
  if ($[10] !== so || $[11] !== He || $[12] !== Ot || $[13] !== po) {
    Lt = Ot.map((Xt, ao) => {
      let { message, command } = Xt;
      return jsxProd_default_2(
        QueuedMessageProvider,
        {
          isFirst: ao === 0,
          noticeSystemLines: He,
          selectionHighlight: po ? (command === so ? "on" : "off") : undefined,
          children: [
            jsxProd_default(agentProgressSelector, {
              message,
              lookups: EMPTY_LOOKUPS,
              addMargin: ao === 0 || isRefillableInput(command),
              tools: [],
              commands: [],
              verbose: false,
              inProgressToolUseIDs: EMPTY_TOOL_USE_IDS,
              progressMessagesForMessage: [],
              shouldAnimate: false,
              shouldShowDot: false,
              isTranscriptMode: false,
              isStatic: true,
            }),
            command.ideSelection !== undefined &&
              !isNonHumanQueuedOrigin(command) &&
              Ot[ao + 1]?.command !== command &&
              jsxProd_default(QueuedCommandRow, {
                command,
              }),
          ],
        },
        ao,
      );
    });
    $[10] = so;
    $[11] = He;
    $[12] = Ot;
    $[13] = po;
    $[14] = Lt;
  } else Lt = $[14];
  let Xt;
  if ($[15] !== appState_4 || $[16] !== promptMounted || $[17] !== commandQueue || $[18] !== storeSelector) {
    Xt =
      promptMounted &&
      hasAbortedSignal(commandQueue, storeSelector, appState_4) &&
      jsxProd_default(SendNowButton, {
        marginTop: 0,
      });
    $[15] = appState_4;
    $[16] = promptMounted;
    $[17] = commandQueue;
    $[18] = storeSelector;
    $[19] = Xt;
  } else Xt = $[19];
  let Ao;
  if ($[20] !== Lt || $[21] !== Xt) {
    Ao = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [Lt, Xt],
    });
    $[20] = Lt;
    $[21] = Xt;
    $[22] = Ao;
  } else Ao = $[22];
  return Ao;
}
//@ chunk-18hwfzwa.js:124299-125411 fingerprint = PromptInputQueuedCommandsImpl (0.313)
/**
 * 排队命令预览：把 queuedCommands 的文本/图片内容截断显示在输入框上方（图片块显示占位）。
 */
function PromptInputQueuedCommandsImpl(h, x = IDLE_FRAME_TOTAL_RECEIVE_BOUND) {
  return h
    .map((D) => {
      let L = D.value;
      if (isNonHumanQueuedOrigin(D)) {
        let viewingAgent = peerOrObserverFrom(D.origin);
        if (typeof L === "string") L = framePreviewText(L, viewingAgent, x);
        else if (Array.isArray(L)) {
          let ke = [];
          let Re = x;
          for (let He of L) {
            if (Re <= 0 || ke.length >= MAX_PREVIEW_BLOCKS) break;
            if (He.type === "text") {
              let We = framePreviewText(He.text, viewingAgent, Re);
              let Xe =
                Object.keys(He).some((s_0) => s_0 !== "type" && s_0 !== "text") &&
                !We.includes(FRAME_SANITIZED_FOR_DISPLAY_MARKER)
                  ? `${We}
${FRAME_SANITIZED_FOR_DISPLAY_MARKER}`
                  : We;
              ke.push({
                type: "text",
                text: Xe,
              });
              Re -= Math.max(Xe.length, MIN_CHARS_PER_BLOCK);
            } else if (He.type === "image") {
              ke.push({
                type: "text",
                text: "[image block not shown in preview]",
              });
              Re -= Math.max(34, MIN_CHARS_PER_BLOCK);
            } else {
              let messages = capStrippedFrameField(
                typeof He.type === "string" ? He.type : "unknown",
                COMMAND_ROW_PADDING,
              );
              let ze = null;
              try {
                ze = renderContentBlockPreview(He, Re, true);
              } catch {
                ze = null;
              }
              let Xe =
                ze !== null
                  ? framePreviewText(`[${messages}] ${ze}`, viewingAgent, Re, true)
                  : `[${messages} block not shown in preview]
${FRAME_SANITIZED_FOR_DISPLAY_MARKER}`;
              ke.push({
                type: "text",
                text: Xe,
              });
              Re -= Math.max(Xe.length, MIN_CHARS_PER_BLOCK);
            }
          }
          let Be = L.length - ke.length;
          if (Be > 0)
            ke.push({
              type: "text",
              text: `
[${Be} block(s) truncated for display]`,
            });
          L = ke;
        }
      }
      if (D.mode === "bash" && typeof L === "string") L = `<bash-input>${L}</bash-input>`;
      return {
        command: D,
        userMessage: createUserMessage({
          content: L,
          origin: D.origin,
        }),
      };
    })
    .flatMap(({ command, userMessage }) =>
      normalizeMessages([userMessage]).map((cmd) => ({
        message: cmd,
        command,
      })),
    );
}
export {
  summarizeQueuedCommand,
  MAX_REPLY_ROWS,
  queuedCommandOriginLabel,
  QueuedCommandsList,
  selectAbortController2,
  selectToolPermissionContextMode2,
  selectHasViewedAgentTask,
  COMMAND_ROW_INDENT,
  COMMAND_ROW_PADDING,
  humanQueuedCommands,
  PromptInputQueuedCommandsImpl,
  isTaskNotificationCommand,
};

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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:120821-120864 placement
function selectAbortController(state) {
  return state.abortController;
}
//@ chunk-18hwfzwa.js:120911-120953 placement
function selectQueueEditIndex(state) {
  return state.queueEditIndex;
}
//@ chunk-18hwfzwa.js:120953-120988 placement
function selectVerbose_3(state) {
  return state.verbose;
}
//@ chunk-18hwfzwa.js:120988-121042 placement
function selectToolPermissionContextMode_4(state) {
  return state.toolPermissionContext.mode;
}
//@ chunk-18hwfzwa.js:121093-121136 placement
function selectAbortController2(state) {
  return state.abortController;
}
//@ chunk-18hwfzwa.js:121136-121190 placement
function selectToolPermissionContextMode2(state) {
  return state.toolPermissionContext.mode;
}
//@ chunk-18hwfzwa.js:121190-121237 placement = _temp2 (1)
function selectHasViewedAgentTask(s_0) {
  return !!s_0.viewingAgentTaskId;
}
//@ chunk-18hwfzwa.js:121237-121288 placement
var EMPTY_TOOL_USE_IDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_REPLY_ROWS;
var MIN_CHARS_PER_BLOCK;
var MAX_PREVIEW_BLOCKS;
var COMMAND_ROW_INDENT;
var COMMAND_ROW_PADDING;
deferInit("chunk-18hwfzwa.js:121237", () => {
  EMPTY_TOOL_USE_IDS = new Set();
  MAX_REPLY_ROWS = 3;
  MIN_CHARS_PER_BLOCK = 256;
  MAX_PREVIEW_BLOCKS = 50;
  COMMAND_ROW_INDENT = 16;
  COMMAND_ROW_PADDING = 32;
});
//@ chunk-18hwfzwa.js:121288-121809 placement
function queuedCommandOriginLabel(commands) {
  let origin = commands[0]?.origin;
  let origin_2 = commands.at(-1)?.origin;
  if (
    origin?.kind === "task-notification" &&
    origin.source === "artifact-auto-react" &&
    origin.displayName !== undefined &&
    commands.every(
      (state) =>
        state.origin?.kind === "task-notification" &&
        state.origin.source === "artifact-auto-react" &&
        state.origin.coalesced?.family === "auto-replied" &&
        state.origin.slug === origin.slug,
    )
  ) {
    let count = commands.length;
    return `+${count} more auto-reply ${count === 1 ? "notice" : "notices"} on Artifact: ${origin_2?.kind === "task-notification" && origin_2.displayName !== undefined ? origin_2.displayName : origin.displayName}`;
  }
  return `+${commands.length} more tasks completed`;
}
//@ chunk-18hwfzwa.js:121809-121885 placement
function getQueuedCommandText(command) {
  return typeof command.value === "string" ? parseTaskNotification(command.value, command.origin) : null;
}
//@ chunk-18hwfzwa.js:121885-121992 fingerprint = processQueuedCommands (1)
function processQueuedCommands(commands, run) {
  return {
    value: buildCollapsedNotification(run, commands.length - 1),
    mode: "task-notification",
    agentId: mainAgentId(),
    origin: commands[0].origin,
  };
}
//@ chunk-18hwfzwa.js:121992-122030 placement
function summarizeQueuedCommand(queue) {
  return collapseNotificationRuns(queue, getQueuedCommandText, processQueuedCommands);
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
  return commandQueue.filter((command) => {
    if (!isNonHumanQueuedCommand(command)) return false;
    if (typeof command.value !== "string") return true;
    if (isTaskNotificationCommand(command)) return false;
    return !(
      peerOrObserverFrom(command.origin) !== undefined &&
      parseFrameForDisplay(IdleNotificationMessageSchema(), command.value) !== null &&
      capRawFrameTextForDisplay(command.value, peerOrObserverFrom(command.origin)) === command.value
    );
  });
}
//@ chunk-18hwfzwa.js:122727-124299 placement
function QueuedCommandsList(props) {
  let $ = useMemoCache(23);
  let { turn, promptMounted } = props;
  let commandQueue = useCommandQueue();
  let storeSelector = useStoreSelector(turn, selectAbortController);
  let appState = useAppState(selectIsViewingAgentTask);
  let appState_2 = useAppState(selectQueueEditIndex);
  let appState_3 = useAppState(selectVerbose_3);
  let showNotice = shouldShowNotice(appState_3);
  let showNoticeLines;
  if ($[0] !== showNotice) {
    showNoticeLines = showNotice && isFullscreenEnvEnabled();
    $[0] = showNotice;
    $[1] = showNoticeLines;
  } else showNoticeLines = $[1];
  let dedupe = showNoticeLines;
  let appState_4 = useAppState(selectToolPermissionContextMode_4);
  let list;
  if ($[2] !== dedupe || $[3] !== commandQueue) {
    At: {
      if (commandQueue.length === 0) {
        list = null;
        break At;
      }
      let humanCommands = collapseExcessTaskNotifications(humanQueuedCommands(commandQueue), dedupe);
      if (humanCommands.length === 0) {
        list = null;
        break At;
      }
      list = PromptInputQueuedCommandsImpl(humanCommands);
    }
    $[2] = dedupe;
    $[3] = commandQueue;
    $[4] = list;
  } else list = $[4];
  let listValue = list;
  let selectedCommand;
  Dt: {
    if (appState_2 === null || listValue === null) {
      selectedCommand = undefined;
      break Dt;
    }
    let refillableCommands;
    if ($[5] !== commandQueue) {
      refillableCommands = commandQueue.filter(isRefillableInput);
      $[5] = commandQueue;
      $[6] = refillableCommands;
    } else refillableCommands = $[6];
    let editingCommand = refillableCommands[appState_2];
    let selected;
    if ($[7] !== editingCommand || $[8] !== listValue) {
      selected = listValue.some((state) => state.command === editingCommand) ? editingCommand : undefined;
      $[7] = editingCommand;
      $[8] = listValue;
      $[9] = selected;
    } else selected = $[9];
    selectedCommand = selected;
  }
  let selectedCommandValue = selectedCommand;
  if (appState || listValue === null) {
    return null;
  }
  let hasSelection = selectedCommandValue !== undefined;
  let rows;
  if (
    $[10] !== selectedCommandValue ||
    $[11] !== showNotice ||
    $[12] !== listValue ||
    $[13] !== hasSelection
  ) {
    rows = listValue.map((entry, index) => {
      let { message, command } = entry;
      return jsxProd_default_2(
        QueuedMessageProvider,
        {
          isFirst: index === 0,
          noticeSystemLines: showNotice,
          selectionHighlight: hasSelection ? (command === selectedCommandValue ? "on" : "off") : undefined,
          children: [
            jsxProd_default(agentProgressSelector, {
              message,
              lookups: EMPTY_LOOKUPS,
              addMargin: index === 0 || isRefillableInput(command),
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
              listValue[index + 1]?.command !== command &&
              jsxProd_default(QueuedCommandRow, {
                command,
              }),
          ],
        },
        index,
      );
    });
    $[10] = selectedCommandValue;
    $[11] = showNotice;
    $[12] = listValue;
    $[13] = hasSelection;
    $[14] = rows;
  } else rows = $[14];
  let footerHint;
  if ($[15] !== appState_4 || $[16] !== promptMounted || $[17] !== commandQueue || $[18] !== storeSelector) {
    footerHint =
      promptMounted &&
      hasAbortedSignal(commandQueue, storeSelector, appState_4) &&
      jsxProd_default(SendNowButton, {
        marginTop: 0,
      });
    $[15] = appState_4;
    $[16] = promptMounted;
    $[17] = commandQueue;
    $[18] = storeSelector;
    $[19] = footerHint;
  } else footerHint = $[19];
  let container;
  if ($[20] !== rows || $[21] !== footerHint) {
    container = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [rows, footerHint],
    });
    $[20] = rows;
    $[21] = footerHint;
    $[22] = container;
  } else container = $[22];
  return container;
}
//@ chunk-18hwfzwa.js:124299-125411 fingerprint = PromptInputQueuedCommandsImpl (0.313)
/**
 * 排队命令预览：把 queuedCommands 的文本/图片内容截断显示在输入框上方（图片块显示占位）。
 */
function PromptInputQueuedCommandsImpl(commands, maxChars = IDLE_FRAME_TOTAL_RECEIVE_BOUND) {
  return commands
    .map((command) => {
      let content = command.value;
      if (isNonHumanQueuedOrigin(command)) {
        let viewingAgent = peerOrObserverFrom(command.origin);
        if (typeof content === "string") content = framePreviewText(content, viewingAgent, maxChars);
        else if (Array.isArray(content)) {
          let blocks = [];
          let remaining = maxChars;
          for (let block of content) {
            if (remaining <= 0 || blocks.length >= MAX_PREVIEW_BLOCKS) break;
            if (block.type === "text") {
              let previewText = framePreviewText(block.text, viewingAgent, remaining);
              let text =
                Object.keys(block).some((s_0) => s_0 !== "type" && s_0 !== "text") &&
                !previewText.includes(FRAME_SANITIZED_FOR_DISPLAY_MARKER)
                  ? `${previewText}
${FRAME_SANITIZED_FOR_DISPLAY_MARKER}`
                  : previewText;
              blocks.push({
                type: "text",
                text,
              });
              remaining -= Math.max(text.length, MIN_CHARS_PER_BLOCK);
            } else if (block.type === "image") {
              blocks.push({
                type: "text",
                text: "[image block not shown in preview]",
              });
              remaining -= Math.max(34, MIN_CHARS_PER_BLOCK);
            } else {
              let messages = capStrippedFrameField(
                typeof block.type === "string" ? block.type : "unknown",
                COMMAND_ROW_PADDING,
              );
              let rendered = null;
              try {
                rendered = renderContentBlockPreview(block, remaining, true);
              } catch {
                rendered = null;
              }
              let fallbackText =
                rendered !== null
                  ? framePreviewText(`[${messages}] ${rendered}`, viewingAgent, remaining, true)
                  : `[${messages} block not shown in preview]
${FRAME_SANITIZED_FOR_DISPLAY_MARKER}`;
              blocks.push({
                type: "text",
                text: fallbackText,
              });
              remaining -= Math.max(fallbackText.length, MIN_CHARS_PER_BLOCK);
            }
          }
          let droppedCount = content.length - blocks.length;
          if (droppedCount > 0)
            blocks.push({
              type: "text",
              text: `
[${droppedCount} block(s) truncated for display]`,
            });
          content = blocks;
        }
      }
      if (command.mode === "bash" && typeof content === "string")
        content = `<bash-input>${content}</bash-input>`;
      return {
        command,
        userMessage: createUserMessage({
          content,
          origin: command.origin,
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

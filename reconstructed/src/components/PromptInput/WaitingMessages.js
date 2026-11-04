/**
 * components/PromptInput/WaitingMessages.tsx
 *
 * 2.1.316 新增。等待中的消息（排队提示）显示。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (21)
 * attribution: placement 21
 */
import { isMainAgentCommand, isRefillableInput } from "../../utils/messageQueueManager.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { useIdeConnectionStatusValue } from "../../commands/chrome/chrome.js";
import { EARLY_RETURN_SENTINEL, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { ideSelectionLabel, IDE_FILE_MARKER } from "../IdeStatusIndicator.js";
import { Box, Text } from "../../ink/components/Text.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { hasSendNowBinding, SEND_NOW_HINT_KEY } from "../../screens/repl/sendNow.js";
import { useActionHandler } from "../../keybindings/useActionHandlers.js";
import { useIsFullscreen } from "../../ink/renderModeContext.js";
import {
  useSyncExternalStore,
  memo,
  useState,
  useEffect,
  init_react_production,
} from "../../../vendor/react/cjs/react.production.js";
import {
  subscribeFullscreenObserved,
  hasFullscreenBeenObserved,
  isMouseTrackingEnabled,
} from "../../utils/fullscreen.js";
import { logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { formatShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { ScrollArrowButton } from "../CustomSelect/select.js";
import {
  QueuedCommandsList,
  selectAbortController2,
  selectToolPermissionContextMode2,
  selectHasViewedAgentTask,
  COMMAND_ROW_INDENT,
  COMMAND_ROW_PADDING,
  humanQueuedCommands,
  PromptInputQueuedCommandsImpl,
} from "./PromptInputQueuedCommands.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useCommandQueue } from "../Messages.js";
import { useThirdOverlayKeys } from "../../context/overlayContext.js";
import { useDialogOfKind } from "../../state/dialogQueue.js";
import { LOCAL_JSX_DIALOG } from "../../commands/rate-limit-options/index.js";
import {
  IDLE_FRAME_TOTAL_RECEIVE_BOUND,
  capRawFrameTextForDisplay,
  stripFrameControlChars,
  capFrameBodyForDisplay,
  FRAME_SANITIZED_FOR_DISPLAY_MARKER,
  capStrippedFrameField,
  PLAN_CONTENT_DISPLAY_BOUND,
} from "../../utils/teammateMailbox.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { getDeliveryId } from "../../cli/queuedCommands.js";
import { agentProgressSelector } from "../../tools/AgentTool/UI.js";
import { EMPTY_LOOKUPS } from "../../utils/messages.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { mainAgentId } from "../../bootstrap/state.js";
import { isInProcessTeammateTask } from "../../tasks/InProcessTeammateTask/types.js";
import { identityAgentId2 } from "../../utils/agentId.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:125411-125565 placement
function hasAbortedSignal(commandQueue, storeSelector, appState) {
  if (storeSelector === null || storeSelector.signal.aborted) return false;
  let filtered = commandQueue.filter((command) => isMainAgentCommand(command) && isRefillableInput(command));
  return filtered.length > 0 && !filtered.some((state) => state.screeningPending === true);
}
//@ chunk-18hwfzwa.js:125565-126391 placement
function QueuedCommandRow(props) {
  let $ = useMemoCache(21);
  let { command } = props;
  let connectionState = useAppState(useIdeConnectionStatusValue);
  let textComponent;
  let boxComponent;
  let dimColor;
  let wrap;
  let textElement;
  let fileLabel;
  let paddingLeft;
  let resultElement;
  if ($[0] !== command.ideSelection || $[1] !== connectionState) {
    resultElement = EARLY_RETURN_SENTINEL;
    kt: {
      let selectionLabel = ideSelectionLabel(connectionState, command.ideSelection);
      if (selectionLabel === null) {
        resultElement = null;
        break kt;
      }
      boxComponent = Box;
      paddingLeft = 2;
      textComponent = Text;
      dimColor = true;
      wrap = "truncate-end";
      if ($[10] === MEMO_CACHE_SENTINEL) {
        textElement = jsxProd_default(Text, {
          "aria-hidden": true,
          children: IDE_FILE_MARKER,
        });
        $[10] = textElement;
      } else textElement = $[10];
      fileLabel = selectionLabel.slice(IDE_FILE_MARKER.length);
    }
    $[0] = command.ideSelection;
    $[1] = connectionState;
    $[2] = textComponent;
    $[3] = boxComponent;
    $[4] = dimColor;
    $[5] = wrap;
    $[6] = textElement;
    $[7] = fileLabel;
    $[8] = paddingLeft;
    $[9] = resultElement;
  } else {
    textComponent = $[2];
    boxComponent = $[3];
    dimColor = $[4];
    wrap = $[5];
    textElement = $[6];
    fileLabel = $[7];
    paddingLeft = $[8];
    resultElement = $[9];
  }
  if (resultElement !== EARLY_RETURN_SENTINEL) return resultElement;
  let children;
  if (
    $[11] !== textComponent ||
    $[12] !== dimColor ||
    $[13] !== wrap ||
    $[14] !== textElement ||
    $[15] !== fileLabel
  ) {
    children = jsxProd_default_2(textComponent, {
      dimColor,
      wrap,
      children: [textElement, fileLabel],
    });
    $[11] = textComponent;
    $[12] = dimColor;
    $[13] = wrap;
    $[14] = textElement;
    $[15] = fileLabel;
    $[16] = children;
  } else children = $[16];
  let boxComponentElement;
  if ($[17] !== boxComponent || $[18] !== paddingLeft || $[19] !== children) {
    boxComponentElement = jsxProd_default(boxComponent, {
      paddingLeft,
      children,
    });
    $[17] = boxComponent;
    $[18] = paddingLeft;
    $[19] = children;
    $[20] = boxComponentElement;
  } else boxComponentElement = $[20];
  return boxComponentElement;
}
//@ chunk-18hwfzwa.js:126391-127104 placement
function SendNowButton(props) {
  let $ = useMemoCache(10);
  let { marginTop } = props;
  let sendNowBinding = hasSendNowBinding();
  let actionHandler = useActionHandler(SEND_NOW_HINT_KEY);
  let isFullscreen = useIsFullscreen();
  let hasObservedFullscreen = useSyncExternalStore(subscribeFullscreenObserved, hasFullscreenBeenObserved);
  let canSendNow = isFullscreen && isMouseTrackingEnabled() === "full" && hasObservedFullscreen;
  if (sendNowBinding === null || (sendNowBinding === "" && (actionHandler === null || !canSendNow))) {
    return null;
  }
  let onPress;
  if ($[0] !== actionHandler) {
    onPress =
      actionHandler === null || isMouseTrackingEnabled() !== "full"
        ? undefined
        : () => {
            if (actionHandler()) logFeatureOk("input_send_now_click");
            else logFeatureBad("input_send_now_click", "no_handler_took_it");
          };
    $[0] = actionHandler;
    $[1] = onPress;
  } else onPress = $[1];
  let children;
  if ($[2] !== sendNowBinding) {
    children =
      sendNowBinding === ""
        ? "click to send now"
        : formatShortcutHint({
            chord: sendNowBinding,
            action: "send now",
            format: {
              keyCase: "lower",
            },
          });
    $[2] = sendNowBinding;
    $[3] = children;
  } else children = $[3];
  let children_2;
  if ($[4] !== onPress || $[5] !== children) {
    children_2 = jsxProd_default(ScrollArrowButton, {
      onPress,
      children,
    });
    $[4] = onPress;
    $[5] = children;
    $[6] = children_2;
  } else children_2 = $[6];
  let buttonBox;
  if ($[7] !== marginTop || $[8] !== children_2) {
    buttonBox = jsxProd_default(Box, {
      paddingLeft: 2,
      marginTop,
      children: children_2,
    });
    $[7] = marginTop;
    $[8] = children_2;
    $[9] = buttonBox;
  } else buttonBox = $[9];
  return buttonBox;
}
//@ chunk-18hwfzwa.js:127104-127120 placement
var QueuedCommandsListMemo; // deferred: uses QueuedCommandsList (./PromptInputQueuedCommands.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-18hwfzwa.js:127104", () => {
  QueuedCommandsListMemo = memo(QueuedCommandsList);
});
//@ chunk-18hwfzwa.js:127120-127663 placement
function WaitingLines(props) {
  let $ = useMemoCache(12);
  let { sendsNow, turn, promptMounted, waitingLines } = props;
  let storeSelector = useStoreSelector(sendsNow);
  let hasWaitingLines = (useStoreSelector(waitingLines)?.length ?? 0) > 0;
  let commandQueue = useCommandQueue();
  let storeSelector_2 = useStoreSelector(turn, selectAbortController2);
  let appState = useAppState(selectToolPermissionContextMode2);
  let appState_2 = useAppState(selectHasViewedAgentTask);
  let thirdOverlayKeys = useThirdOverlayKeys();
  let dialogOfKind = useDialogOfKind(LOCAL_JSX_DIALOG.kind);
  let abortController;
  if ($[0] !== appState || $[1] !== commandQueue || $[2] !== storeSelector_2) {
    abortController = hasAbortedSignal(commandQueue, storeSelector_2, appState);
    $[0] = appState;
    $[1] = commandQueue;
    $[2] = storeSelector_2;
    $[3] = abortController;
  } else abortController = $[3];
  let promptMode = abortController;
  let sendNowRow;
  if (
    $[4] !== storeSelector ||
    $[5] !== hasWaitingLines ||
    $[6] !== thirdOverlayKeys ||
    $[7] !== dialogOfKind ||
    $[8] !== promptMounted ||
    $[9] !== promptMode ||
    $[10] !== appState_2
  ) {
    sendNowRow =
      promptMounted && storeSelector && !appState_2 && !thirdOverlayKeys && !dialogOfKind && !promptMode
        ? jsxProd_default(SendNowButton, {
            marginTop: hasWaitingLines ? 0 : 1,
          })
        : null;
    $[4] = storeSelector;
    $[5] = hasWaitingLines;
    $[6] = thirdOverlayKeys;
    $[7] = dialogOfKind;
    $[8] = promptMounted;
    $[9] = promptMode;
    $[10] = appState_2;
    $[11] = sendNowRow;
  } else sendNowRow = $[11];
  return sendNowRow;
}
//@ chunk-18hwfzwa.js:127663-127742 placement
function peerOrObserverFrom(origin) {
  return origin && (origin.kind === "peer" || origin.kind === "observer") ? origin.from : undefined;
}
//@ chunk-18hwfzwa.js:127742-127891 placement
function isNonHumanQueuedOrigin(message) {
  if (message.verifiedSlackHumanTurn === true) return true;
  switch (message.origin?.kind) {
    case undefined:
    case "human":
    case "slack-ping":
      return false;
    default:
      return true;
  }
}
//@ chunk-18hwfzwa.js:127891-128002 placement
function framePreviewText(
  rawFrameText,
  viewingAgent,
  maxReceiveBytes = IDLE_FRAME_TOTAL_RECEIVE_BOUND,
  forceSanitized = false,
) {
  let capped = capRawFrameTextForDisplay(rawFrameText, viewingAgent);
  let isSanitized = forceSanitized || capped !== rawFrameText || stripFrameControlChars(capped) !== capped;
  let body = capFrameBodyForDisplay(capped, maxReceiveBytes);
  return isSanitized
    ? `${body}
${FRAME_SANITIZED_FOR_DISPLAY_MARKER}`
    : body;
}
//@ chunk-18hwfzwa.js:128002-128353 placement = extractErrorTypeFromData (1)
/**
 * 把内容块截取为不超过 maxChars 的文本预览。
 */
function previewContentBlocks(content, budgetChars, renderNonText) {
  let parts = [];
  let remaining = budgetChars;
  let min = Math.min(content.length, COMMAND_ROW_INDENT);
  for (let idx = 0; idx < min && remaining > 0; idx++) {
    let block = content[idx];
    if (
      typeof block === "object" &&
      block !== null &&
      "type" in block &&
      block.type === "text" &&
      "text" in block &&
      typeof block.text === "string"
    ) {
      let text = truncateToLength(block.text, remaining);
      parts.push(text);
      remaining -= [...text].length;
    } else if (renderNonText) {
      let rendered = renderContentBlockPreview(block, remaining, false);
      if (rendered) {
        parts.push(rendered);
        remaining -= [...rendered].length;
      }
    }
  }
  return parts.join(`
`);
}
//@ chunk-18hwfzwa.js:128353-128668 placement
/**
 * 把任意内容（字符串、数组、对象）递归截取成不超过 maxChars 的纯文本预览，深度受限，每层最多取若干项。
 */
function previewContentText(content, budgetChars, depth) {
  if (budgetChars <= 0 || depth <= 0) return "";
  if (typeof content === "string") return truncateToLength(content, budgetChars);
  if (content === null || typeof content !== "object") return "";
  let values = Array.isArray(content) ? content : Object.values(content);
  let min = Math.min(values.length, COMMAND_ROW_INDENT);
  let parts = [];
  let remaining = budgetChars;
  for (let idx = 0; idx < min && remaining > 0; idx++) {
    let text = previewContentText(values[idx], remaining, depth - 1);
    if (text) {
      parts.push(text);
      remaining -= [...text].length;
    }
  }
  return parts.join(`
`);
}
//@ chunk-18hwfzwa.js:128668-130111 placement
function renderContentBlockPreview(block, budgetChars, renderRich) {
  if (typeof block !== "object" || block === null || !("type" in block)) return null;
  let blockType = block.type;
  if (blockType === "tool_result") {
    let content = "content" in block ? block.content : undefined;
    if (typeof content === "string") return truncateToLength(content, budgetChars);
    return Array.isArray(content) ? previewContentBlocks(content, budgetChars, renderRich) : null;
  }
  if (blockType === "document") {
    let title =
      "title" in block && typeof block.title === "string" ? truncateToLength(block.title, budgetChars) : "";
    let contextText =
      "context" in block && typeof block.context === "string"
        ? truncateToLength(block.context, budgetChars)
        : "";
    let source = "source" in block ? block.source : undefined;
    let sourceText = "";
    if (typeof source === "object" && source !== null && "type" in source)
      if (source.type === "text" && "data" in source && typeof source.data === "string")
        sourceText = truncateToLength(source.data, budgetChars);
      else if (source.type === "content" && "content" in source) {
        let content = source.content;
        sourceText =
          typeof content === "string"
            ? truncateToLength(content, budgetChars)
            : Array.isArray(content)
              ? previewContentBlocks(content, budgetChars, renderRich)
              : "";
      } else {
        let mediaType =
          "media_type" in source && typeof source.media_type === "string"
            ? source.media_type
            : typeof source.type === "string"
              ? source.type
              : "unknown";
        sourceText = `[${capStrippedFrameField(mediaType, COMMAND_ROW_PADDING)} source not shown]`;
      }
    return (
      truncateToLength(
        [title, contextText, sourceText].filter(Boolean).join(`
`),
        budgetChars,
      ) || null
    );
  }
  if (blockType === "search_result") {
    let sourceId =
      "source" in block && typeof block.source === "string"
        ? capStrippedFrameField(block.source, COMMAND_ROW_PADDING)
        : "";
    let title =
      "title" in block && typeof block.title === "string" ? truncateToLength(block.title, budgetChars) : "";
    let contentText =
      "content" in block && Array.isArray(block.content)
        ? previewContentBlocks(block.content, budgetChars, renderRich)
        : "";
    return (
      truncateToLength(
        [sourceId, title, contentText].filter(Boolean).join(`
`),
        budgetChars,
      ) || null
    );
  }
  if (blockType === "thinking")
    return "thinking" in block && typeof block.thinking === "string"
      ? truncateToLength(block.thinking, budgetChars)
      : null;
  if (blockType === "tool_use") {
    let name =
      "name" in block && typeof block.name === "string" ? truncateToLength(block.name, budgetChars) : "";
    let input = "input" in block ? block.input : undefined;
    let inputPreview = previewContentText(input, budgetChars, 3);
    return (
      truncateToLength(
        [name, inputPreview].filter(Boolean).join(`
`),
        budgetChars,
      ) || null
    );
  }
  return null;
}
//@ chunk-18hwfzwa.js:130111-130145 placement
function createMessageWeakMap() {
  return new WeakMap();
}
//@ chunk-18hwfzwa.js:130145-130179 placement
function createFolderWaitWeakMap() {
  return new WeakMap();
}
//@ chunk-18hwfzwa.js:130179-130223 placement
function isNotShownAs(message) {
  return message.shownAs === undefined;
}
//@ chunk-18hwfzwa.js:130223-130270 placement
function hasDeliveryId(message) {
  return message.deliveryId !== undefined;
}
//@ chunk-18hwfzwa.js:130270-130306 placement
function messageDeliveryIds(message) {
  return getDeliveryId(message) ?? [];
}
//@ chunk-18hwfzwa.js:130306-130555 placement = VerboseAgentTranscript (0.912)
/**
 * 静态（转录模式）渲染单条子代理消息。
 */
function VerboseAgentTranscript(props, index) {
  let { message } = props;
  return jsxProd_default(
    agentProgressSelector,
    {
      message,
      lookups: EMPTY_LOOKUPS,
      addMargin: index > 0,
      tools: [],
      commands: [],
      verbose: true,
      inProgressToolUseIDs: EMPTY_TOOL_USE_ID_SET,
      progressMessagesForMessage: [],
      shouldAnimate: false,
      shouldShowDot: false,
      isTranscriptMode: true,
      isStatic: true,
    },
    message.uuid,
  );
}
//@ chunk-18hwfzwa.js:130555-130577 placement
/**
 * 渲染用空集合/空数组常量。
 */
var EMPTY_TOOL_USE_ID_SET; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var EMPTY_CONFIG_ARRAY;
deferInit("chunk-18hwfzwa.js:130555", () => {
  EMPTY_TOOL_USE_ID_SET = new Set();
  EMPTY_CONFIG_ARRAY = [];
});
//@ chunk-18hwfzwa.js:130577-132669 placement
function AgentWaitingMessages(props) {
  let $ = useMemoCache(34);
  let { focused } = props;
  let commandQueue = useCommandQueue();
  let { task, messages, isLoading } = focused;
  let [rowCache] = useState(createMessageWeakMap);
  let [pendingCache] = useState(createFolderWaitWeakMap);
  let pendingMessages = task !== undefined && isLocalAgent(task) ? task.pendingMessages : EMPTY_CONFIG_ARRAY;
  let agentId;
  if ($[0] !== task) {
    agentId =
      task === undefined
        ? mainAgentId()
        : isInProcessTeammateTask(task)
          ? (task.identity.resumableAgentId ?? task.identity.agentId)
          : task.agentId;
    $[0] = task;
    $[1] = agentId;
  } else agentId = $[1];
  let targetAgentId = agentId;
  let queuedMessages;
  if ($[2] !== pendingCache || $[3] !== pendingMessages || $[4] !== targetAgentId || $[5] !== commandQueue) {
    const filtered = pendingMessages.filter(isNotShownAs);
    let toCommand;
    if ($[7] !== pendingCache || $[8] !== targetAgentId) {
      toCommand = (message) => {
        let cached = pendingCache.get(message);
        if (cached !== undefined) {
          return cached;
        }
        let command = {
          value: message.text,
          mode: "prompt",
          agentId: identityAgentId2(targetAgentId),
          origin: message.origin,
          isMeta: message.isMeta,
        };
        pendingCache.set(message, command);
        return command;
      };
      $[7] = pendingCache;
      $[8] = targetAgentId;
      $[9] = toCommand;
    } else toCommand = $[9];
    let mapped = filtered.map(toCommand);
    const humanCommands = humanQueuedCommands([...commandQueue, ...mapped]);
    let belongsHere;
    if ($[10] !== targetAgentId) {
      belongsHere = (command) => command.agentId === targetAgentId && !isRefillableInput(command);
      $[10] = targetAgentId;
      $[11] = belongsHere;
    } else belongsHere = $[11];
    queuedMessages = humanCommands.filter(belongsHere);
    $[2] = pendingCache;
    $[3] = pendingMessages;
    $[4] = targetAgentId;
    $[5] = commandQueue;
    $[6] = queuedMessages;
  } else queuedMessages = $[6];
  let commands = queuedMessages;
  let rows;
  if ($[12] !== commands || $[13] !== messages || $[14] !== rowCache) {
    let deliveryIds = commands.some(hasDeliveryId)
      ? new Set(messages.flatMap(messageDeliveryIds))
      : EMPTY_TOOL_USE_ID_SET;
    const filtered = commands.filter(
      (message) => !(message.deliveryId !== undefined && deliveryIds.has(message.deliveryId)),
    );
    let buildRows;
    if ($[16] !== rowCache) {
      buildRows = (command) => {
        let cached = rowCache.get(command);
        if (cached !== undefined) {
          return cached;
        }
        let rows = PromptInputQueuedCommandsImpl([command], PLAN_CONTENT_DISPLAY_BOUND);
        rowCache.set(command, rows);
        return rows;
      };
      $[16] = rowCache;
      $[17] = buildRows;
    } else buildRows = $[17];
    rows = filtered.flatMap(buildRows);
    $[12] = commands;
    $[13] = messages;
    $[14] = rowCache;
    $[15] = rows;
  } else rows = $[15];
  let newRows = rows;
  let nextState;
  if ($[18] !== messages.length || $[19] !== newRows) {
    nextState = {
      rows: newRows,
      transcriptLength: messages.length,
    };
    $[18] = messages.length;
    $[19] = newRows;
    $[20] = nextState;
  } else nextState = $[20];
  let [prevState, setPrevState] = useState(nextState);
  let merged;
  if ($[21] !== prevState || $[22] !== isLoading || $[23] !== messages.length || $[24] !== newRows) {
    merged = mergeWaitingRows(prevState, newRows, messages.length, isLoading);
    $[21] = prevState;
    $[22] = isLoading;
    $[23] = messages.length;
    $[24] = newRows;
    $[25] = merged;
  } else merged = $[25];
  let mergedState = merged;
  if (mergedState !== prevState) setPrevState(mergedState);
  let hasRows = mergedState.rows.length > 0;
  let logShown;
  let logDeps;
  if ($[26] !== hasRows) {
    logShown = () => {
      if (hasRows) logFeatureOk("transcript_waiting_messages");
    };
    logDeps = [hasRows];
    $[26] = hasRows;
    $[27] = logShown;
    $[28] = logDeps;
  } else {
    logShown = $[27];
    logDeps = $[28];
  }
  useEffect(logShown, logDeps);
  if (mergedState.rows.length === 0) {
    return null;
  }
  let header;
  if ($[29] === MEMO_CACHE_SENTINEL) {
    header = jsxProd_default(Text, {
      dimColor: true,
      children: "Waiting to be delivered",
    });
    $[29] = header;
  } else header = $[29];
  let rowElements;
  if ($[30] !== mergedState.rows) {
    rowElements = mergedState.rows.map(VerboseAgentTranscript);
    $[30] = mergedState.rows;
    $[31] = rowElements;
  } else rowElements = $[31];
  let container;
  if ($[32] !== rowElements) {
    container = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [header, rowElements],
    });
    $[32] = rowElements;
    $[33] = container;
  } else container = $[33];
  return container;
}
//@ chunk-18hwfzwa.js:132669-132908 placement
function mergeWaitingRows(previous, rows, transcriptLength, isLoading) {
  let rowSet = new Set(rows);
  let merged = [
    ...(isLoading && previous.transcriptLength === transcriptLength
      ? previous.rows.filter((row) => !rowSet.has(row))
      : []),
    ...rows,
  ];
  return previous.transcriptLength === transcriptLength &&
    merged.length === previous.rows.length &&
    merged.every((row, index) => row === previous.rows[index])
    ? previous
    : {
        rows: merged,
        transcriptLength,
      };
}
//@ chunk-18hwfzwa.js:132908-132912 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:132908", () => {
  init_react_production();
});
export {
  peerOrObserverFrom,
  isNonHumanQueuedOrigin,
  QueuedCommandRow,
  hasAbortedSignal,
  SendNowButton,
  framePreviewText,
  renderContentBlockPreview,
  AgentWaitingMessages,
  QueuedCommandsListMemo,
  WaitingLines,
};

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
import { w } from "../../../vendor/react/compiler-runtime.js";
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
import { yt, Rh, y, P, init_react_production } from "../../../vendor/react/cjs/react.production.js";
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

//@ chunk-18hwfzwa.js:125411-125565 placement
function hasAbortedSignal(commandQueue, storeSelector, appState) {
  if (storeSelector === null || storeSelector.signal.aborted) return false;
  let filtered = commandQueue.filter((ee) => isMainAgentCommand(ee) && isRefillableInput(ee));
  return filtered.length > 0 && !filtered.some((ee) => ee.screeningPending === true);
}
//@ chunk-18hwfzwa.js:125565-126391 placement
function QueuedCommandRow(props) {
  let $ = w(21);
  let { command } = props;
  let appState = useAppState(useIdeConnectionStatusValue);
  let ee;
  let ke;
  let dimColor;
  let wrap;
  let He;
  let We;
  let paddingLeft;
  let Xe;
  if ($[0] !== command.ideSelection || $[1] !== appState) {
    Xe = EARLY_RETURN_SENTINEL;
    kt: {
      let rt = ideSelectionLabel(appState, command.ideSelection);
      if (rt === null) {
        Xe = null;
        break kt;
      }
      ke = Box;
      paddingLeft = 2;
      ee = Text;
      dimColor = true;
      wrap = "truncate-end";
      if ($[10] === MEMO_CACHE_SENTINEL) {
        He = jsxProd_default(Text, {
          "aria-hidden": true,
          children: IDE_FILE_MARKER,
        });
        $[10] = He;
      } else He = $[10];
      We = rt.slice(IDE_FILE_MARKER.length);
    }
    $[0] = command.ideSelection;
    $[1] = appState;
    $[2] = ee;
    $[3] = ke;
    $[4] = dimColor;
    $[5] = wrap;
    $[6] = He;
    $[7] = We;
    $[8] = paddingLeft;
    $[9] = Xe;
  } else {
    ee = $[2];
    ke = $[3];
    dimColor = $[4];
    wrap = $[5];
    He = $[6];
    We = $[7];
    paddingLeft = $[8];
    Xe = $[9];
  }
  if (Xe !== EARLY_RETURN_SENTINEL) return Xe;
  let children;
  if ($[11] !== ee || $[12] !== dimColor || $[13] !== wrap || $[14] !== He || $[15] !== We) {
    children = jsxProd_default_2(ee, {
      dimColor,
      wrap,
      children: [He, We],
    });
    $[11] = ee;
    $[12] = dimColor;
    $[13] = wrap;
    $[14] = He;
    $[15] = We;
    $[16] = children;
  } else children = $[16];
  let It;
  if ($[17] !== ke || $[18] !== paddingLeft || $[19] !== children) {
    It = jsxProd_default(ke, {
      paddingLeft,
      children,
    });
    $[17] = ke;
    $[18] = paddingLeft;
    $[19] = children;
    $[20] = It;
  } else It = $[20];
  return It;
}
//@ chunk-18hwfzwa.js:126391-127104 placement
function SendNowButton(props) {
  let $ = w(10);
  let { marginTop } = props;
  let D = hasSendNowBinding();
  let actionHandler = useActionHandler(SEND_NOW_HINT_KEY);
  let isFullscreen = useIsFullscreen();
  let ke = yt(subscribeFullscreenObserved, hasFullscreenBeenObserved);
  let Re = isFullscreen && isMouseTrackingEnabled() === "full" && ke;
  if (D === null || (D === "" && (actionHandler === null || !Re))) {
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
  if ($[2] !== D) {
    children =
      D === ""
        ? "click to send now"
        : formatShortcutHint({
            chord: D,
            action: "send now",
            format: {
              keyCase: "lower",
            },
          });
    $[2] = D;
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
  let Xe;
  if ($[7] !== marginTop || $[8] !== children_2) {
    Xe = jsxProd_default(Box, {
      paddingLeft: 2,
      marginTop,
      children: children_2,
    });
    $[7] = marginTop;
    $[8] = children_2;
    $[9] = Xe;
  } else Xe = $[9];
  return Xe;
}
//@ chunk-18hwfzwa.js:127104-127120 placement
var QueuedCommandsListMemo = Rh(QueuedCommandsList);
//@ chunk-18hwfzwa.js:127120-127663 placement
function WaitingLines(props) {
  let $ = w(12);
  let { sendsNow, turn, promptMounted, waitingLines } = props;
  let storeSelector = useStoreSelector(sendsNow);
  let Re = (useStoreSelector(waitingLines)?.length ?? 0) > 0;
  let commandQueue = useCommandQueue();
  let storeSelector_2 = useStoreSelector(turn, selectAbortController2);
  let appState = useAppState(selectToolPermissionContextMode2);
  let appState_2 = useAppState(selectHasViewedAgentTask);
  let thirdOverlayKeys = useThirdOverlayKeys();
  let dialogOfKind = useDialogOfKind(LOCAL_JSX_DIALOG.kind);
  let At;
  if ($[0] !== appState || $[1] !== commandQueue || $[2] !== storeSelector_2) {
    At = hasAbortedSignal(commandQueue, storeSelector_2, appState);
    $[0] = appState;
    $[1] = commandQueue;
    $[2] = storeSelector_2;
    $[3] = At;
  } else At = $[3];
  let It = At;
  let Ot;
  if (
    $[4] !== storeSelector ||
    $[5] !== Re ||
    $[6] !== thirdOverlayKeys ||
    $[7] !== dialogOfKind ||
    $[8] !== promptMounted ||
    $[9] !== It ||
    $[10] !== appState_2
  ) {
    Ot =
      promptMounted && storeSelector && !appState_2 && !thirdOverlayKeys && !dialogOfKind && !It
        ? jsxProd_default(SendNowButton, {
            marginTop: Re ? 0 : 1,
          })
        : null;
    $[4] = storeSelector;
    $[5] = Re;
    $[6] = thirdOverlayKeys;
    $[7] = dialogOfKind;
    $[8] = promptMounted;
    $[9] = It;
    $[10] = appState_2;
    $[11] = Ot;
  } else Ot = $[11];
  return Ot;
}
//@ chunk-18hwfzwa.js:127663-127742 placement
function peerOrObserverFrom(origin) {
  return origin && (origin.kind === "peer" || origin.kind === "observer") ? origin.from : undefined;
}
//@ chunk-18hwfzwa.js:127742-127891 placement
function isNonHumanQueuedOrigin(h) {
  if (h.verifiedSlackHumanTurn === true) return true;
  switch (h.origin?.kind) {
    case undefined:
    case "human":
    case "slack-ping":
      return false;
    default:
      return true;
  }
}
//@ chunk-18hwfzwa.js:127891-128002 placement
function framePreviewText(h, viewingAgent, D = IDLE_FRAME_TOTAL_RECEIVE_BOUND, L = false) {
  let ee = capRawFrameTextForDisplay(h, viewingAgent);
  let ke = L || ee !== h || stripFrameControlChars(ee) !== ee;
  let Re = capFrameBodyForDisplay(ee, D);
  return ke
    ? `${Re}
${FRAME_SANITIZED_FOR_DISPLAY_MARKER}`
    : Re;
}
//@ chunk-18hwfzwa.js:128002-128353 placement = extractErrorTypeFromData (1)
/**
 * 把内容块截取为不超过 maxChars 的文本预览。
 */
function previewContentBlocks(content, x, D) {
  let L = [];
  let ee = x;
  let min = Math.min(content.length, COMMAND_ROW_INDENT);
  for (let idx = 0; idx < min && ee > 0; idx++) {
    let Be = content[idx];
    if (
      typeof Be === "object" &&
      Be !== null &&
      "type" in Be &&
      Be.type === "text" &&
      "text" in Be &&
      typeof Be.text === "string"
    ) {
      let He = truncateToLength(Be.text, ee);
      L.push(He);
      ee -= [...He].length;
    } else if (D) {
      let He = renderContentBlockPreview(Be, ee, false);
      if (He) {
        L.push(He);
        ee -= [...He].length;
      }
    }
  }
  return L.join(`
`);
}
//@ chunk-18hwfzwa.js:128353-128668 placement
/**
 * 把任意内容（字符串、数组、对象）递归截取成不超过 maxChars 的纯文本预览，深度受限，每层最多取若干项。
 */
function previewContentText(h, x, D) {
  if (x <= 0 || D <= 0) return "";
  if (typeof h === "string") return truncateToLength(h, x);
  if (h === null || typeof h !== "object") return "";
  let L = Array.isArray(h) ? h : Object.values(h);
  let min = Math.min(L.length, COMMAND_ROW_INDENT);
  let ke = [];
  let Re = x;
  for (let idx = 0; idx < min && Re > 0; idx++) {
    let He = previewContentText(L[idx], Re, D - 1);
    if (He) {
      ke.push(He);
      Re -= [...He].length;
    }
  }
  return ke.join(`
`);
}
//@ chunk-18hwfzwa.js:128668-130111 placement
function renderContentBlockPreview(h, x, D) {
  if (typeof h !== "object" || h === null || !("type" in h)) return null;
  let L = h.type;
  if (L === "tool_result") {
    let content = "content" in h ? h.content : undefined;
    if (typeof content === "string") return truncateToLength(content, x);
    return Array.isArray(content) ? previewContentBlocks(content, x, D) : null;
  }
  if (L === "document") {
    let ee = "title" in h && typeof h.title === "string" ? truncateToLength(h.title, x) : "";
    let ke = "context" in h && typeof h.context === "string" ? truncateToLength(h.context, x) : "";
    let source = "source" in h ? h.source : undefined;
    let Be = "";
    if (typeof source === "object" && source !== null && "type" in source)
      if (source.type === "text" && "data" in source && typeof source.data === "string")
        Be = truncateToLength(source.data, x);
      else if (source.type === "content" && "content" in source) {
        let content = source.content;
        Be =
          typeof content === "string"
            ? truncateToLength(content, x)
            : Array.isArray(content)
              ? previewContentBlocks(content, x, D)
              : "";
      } else {
        let We =
          "media_type" in source && typeof source.media_type === "string"
            ? source.media_type
            : typeof source.type === "string"
              ? source.type
              : "unknown";
        Be = `[${capStrippedFrameField(We, COMMAND_ROW_PADDING)} source not shown]`;
      }
    return (
      truncateToLength(
        [ee, ke, Be].filter(Boolean).join(`
`),
        x,
      ) || null
    );
  }
  if (L === "search_result") {
    let ee =
      "source" in h && typeof h.source === "string"
        ? capStrippedFrameField(h.source, COMMAND_ROW_PADDING)
        : "";
    let ke = "title" in h && typeof h.title === "string" ? truncateToLength(h.title, x) : "";
    let Re = "content" in h && Array.isArray(h.content) ? previewContentBlocks(h.content, x, D) : "";
    return (
      truncateToLength(
        [ee, ke, Re].filter(Boolean).join(`
`),
        x,
      ) || null
    );
  }
  if (L === "thinking")
    return "thinking" in h && typeof h.thinking === "string" ? truncateToLength(h.thinking, x) : null;
  if (L === "tool_use") {
    let ee = "name" in h && typeof h.name === "string" ? truncateToLength(h.name, x) : "";
    let input = "input" in h ? h.input : undefined;
    let Re = previewContentText(input, x, 3);
    return (
      truncateToLength(
        [ee, Re].filter(Boolean).join(`
`),
        x,
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
function isNotShownAs(vo) {
  return vo.shownAs === undefined;
}
//@ chunk-18hwfzwa.js:130223-130270 placement
function hasDeliveryId(Yo) {
  return Yo.deliveryId !== undefined;
}
//@ chunk-18hwfzwa.js:130270-130306 placement
function messageDeliveryIds(kn) {
  return getDeliveryId(kn) ?? [];
}
//@ chunk-18hwfzwa.js:130306-130555 placement = VerboseAgentTranscript (0.912)
/**
 * 静态（转录模式）渲染单条子代理消息。
 */
function VerboseAgentTranscript(h, Fn) {
  let { message } = h;
  return jsxProd_default(
    agentProgressSelector,
    {
      message,
      lookups: EMPTY_LOOKUPS,
      addMargin: Fn > 0,
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
var EMPTY_TOOL_USE_ID_SET = new Set();
var EMPTY_CONFIG_ARRAY = [];
//@ chunk-18hwfzwa.js:130577-132669 placement
function AgentWaitingMessages(props) {
  let $ = w(34);
  let { focused } = props;
  let commandQueue = useCommandQueue();
  let { task, messages, isLoading } = focused;
  let [Re] = y(createMessageWeakMap);
  let [Be] = y(createFolderWaitWeakMap);
  let He = task !== undefined && isLocalAgent(task) ? task.pendingMessages : EMPTY_CONFIG_ARRAY;
  let ze;
  if ($[0] !== task) {
    ze =
      task === undefined
        ? mainAgentId()
        : isInProcessTeammateTask(task)
          ? (task.identity.resumableAgentId ?? task.identity.agentId)
          : task.agentId;
    $[0] = task;
    $[1] = ze;
  } else ze = $[1];
  let Xe = ze;
  let rt;
  if ($[2] !== Be || $[3] !== He || $[4] !== Xe || $[5] !== commandQueue) {
    const filtered = He.filter(isNotShownAs);
    let At;
    if ($[7] !== Be || $[8] !== Xe) {
      At = (It) => {
        let Ot = Be.get(It);
        if (Ot !== undefined) {
          return Ot;
        }
        let Et = {
          value: It.text,
          mode: "prompt",
          agentId: identityAgentId2(Xe),
          origin: It.origin,
          isMeta: It.isMeta,
        };
        Be.set(It, Et);
        return Et;
      };
      $[7] = Be;
      $[8] = Xe;
      $[9] = At;
    } else At = $[9];
    let mapped = filtered.map(At);
    const Lt = humanQueuedCommands([...commandQueue, ...mapped]);
    let oo;
    if ($[10] !== Xe) {
      oo = (Xt) => Xt.agentId === Xe && !isRefillableInput(Xt);
      $[10] = Xe;
      $[11] = oo;
    } else oo = $[11];
    rt = Lt.filter(oo);
    $[2] = Be;
    $[3] = He;
    $[4] = Xe;
    $[5] = commandQueue;
    $[6] = rt;
  } else rt = $[6];
  let io = rt;
  let kt;
  if ($[12] !== io || $[13] !== messages || $[14] !== Re) {
    let so = io.some(hasDeliveryId) ? new Set(messages.flatMap(messageDeliveryIds)) : EMPTY_TOOL_USE_ID_SET;
    const filtered = io.filter((po) => !(po.deliveryId !== undefined && so.has(po.deliveryId)));
    let Lt;
    if ($[16] !== Re) {
      Lt = (ao) => {
        let co = Re.get(ao);
        if (co !== undefined) {
          return co;
        }
        let bo = PromptInputQueuedCommandsImpl([ao], PLAN_CONTENT_DISPLAY_BOUND);
        Re.set(ao, bo);
        return bo;
      };
      $[16] = Re;
      $[17] = Lt;
    } else Lt = $[17];
    kt = filtered.flatMap(Lt);
    $[12] = io;
    $[13] = messages;
    $[14] = Re;
    $[15] = kt;
  } else kt = $[15];
  let Ao = kt;
  let At;
  if ($[18] !== messages.length || $[19] !== Ao) {
    At = {
      rows: Ao,
      transcriptLength: messages.length,
    };
    $[18] = messages.length;
    $[19] = Ao;
    $[20] = At;
  } else At = $[20];
  let [Bo, Ro] = y(At);
  let Lt;
  if ($[21] !== Bo || $[22] !== isLoading || $[23] !== messages.length || $[24] !== Ao) {
    Lt = mergeWaitingRows(Bo, Ao, messages.length, isLoading);
    $[21] = Bo;
    $[22] = isLoading;
    $[23] = messages.length;
    $[24] = Ao;
    $[25] = Lt;
  } else Lt = $[25];
  let Ho = Lt;
  if (Ho !== Bo) Ro(Ho);
  let Io = Ho.rows.length > 0;
  let oo;
  let Wo;
  if ($[26] !== Io) {
    oo = () => {
      if (Io) logFeatureOk("transcript_waiting_messages");
    };
    Wo = [Io];
    $[26] = Io;
    $[27] = oo;
    $[28] = Wo;
  } else {
    oo = $[27];
    Wo = $[28];
  }
  P(oo, Wo);
  if (Ho.rows.length === 0) {
    return null;
  }
  let mn;
  if ($[29] === MEMO_CACHE_SENTINEL) {
    mn = jsxProd_default(Text, {
      dimColor: true,
      children: "Waiting to be delivered",
    });
    $[29] = mn;
  } else mn = $[29];
  let Cn;
  if ($[30] !== Ho.rows) {
    Cn = Ho.rows.map(VerboseAgentTranscript);
    $[30] = Ho.rows;
    $[31] = Cn;
  } else Cn = $[31];
  let No;
  if ($[32] !== Cn) {
    No = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [mn, Cn],
    });
    $[32] = Cn;
    $[33] = No;
  } else No = $[33];
  return No;
}
//@ chunk-18hwfzwa.js:132669-132908 placement
function mergeWaitingRows(h, x, D, isLoading) {
  let ee = new Set(x);
  let Re = [...(isLoading && h.transcriptLength === D ? h.rows.filter((He) => !ee.has(He)) : []), ...x];
  return h.transcriptLength === D && Re.length === h.rows.length && Re.every((He, We) => He === h.rows[We])
    ? h
    : {
        rows: Re,
        transcriptLength: D,
      };
}
//@ chunk-18hwfzwa.js:132908-132912 placement
init_react_production();
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

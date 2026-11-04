/**
 * components/SessionHeader.tsx
 *
 * 2.1.316 新增。会话标题头。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (8)
 * attribution: placement 8
 */
import { getModelBadgeParts } from "../utils/ultraplan/keyword.js";
import { showSwarmFooterGate } from "./PromptInput/footerGates.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { SentryErrorBoundary } from "./SentryErrorBoundary.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { Box, Text } from "../ink/components/Text.js";
import { NoticeLine } from "./SlashCommandLink.js";
import { useMainLoopModel_2 } from "../hooks/useMainLoopModel.js";
import { parseUserSpecifiedModel, renderModelSetting } from "../utils/model/modelDisplay.js";
import { useAppState } from "../state/AppState.js";
import { selectIsBriefOnly2, selectUltracode2, selectFastMode_3 } from "../screens/repl/ReplScreenFrame.js";
import { useQueuedMessageText } from "../context/QueuedMessageContext.js";
import { isEffortIndicatorShown } from "./EffortIndicator.js";
import { AccountMemoryMarker } from "./PromptInput/PromptInputFooter.js";
import { useHasComplianceTaint } from "./LogoV2/LogoV2.js";
import { noEffortHint, effortValueToString, isUltracodeActive } from "../utils/effort.js";
import { isFastModeOnForRequestModel } from "../utils/fastMode.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { isDebugMode } from "../utils/debug.js";
import { isSendableQueuedCommand } from "../utils/messageQueueManager.js";
import { isTaskNotificationCommand } from "./PromptInput/PromptInputQueuedCommands.js";
import { useCommandQueue } from "./Messages.js";
import { count } from "../utils/collections.js";

//@ chunk-18hwfzwa.js:1442667-1442762 placement
function sessionHeaderParts(header) {
  return [header.compliance, header.debug ? "Debug" : undefined, ...header.modes].filter(
    (part) => part !== undefined,
  );
}
//@ chunk-18hwfzwa.js:1442762-1442821 placement
function sessionHeaderText(sessionHeaderInfo) {
  return [...getModelBadgeParts(sessionHeaderInfo), ...sessionHeaderParts(sessionHeaderInfo)].join(" \xB7 ");
}
//@ chunk-18hwfzwa.js:1442821-1442880 placement
function renderSessionHeaderLine() {
  return showSwarmFooterGate()
    ? jsxProd_default(SentryErrorBoundary, {
        children: jsxProd_default(SessionHeaderLine, {}),
      })
    : null;
}
//@ chunk-18hwfzwa.js:1442880-1443110 placement
function SessionHeaderLine() {
  let $ = useMemoCache(4);
  const sessionHeaderInfo = useSessionHeaderInfo();
  let text;
  if ($[0] !== sessionHeaderInfo) {
    text = sessionHeaderText(sessionHeaderInfo);
    $[0] = sessionHeaderInfo;
    $[1] = text;
  } else text = $[1];
  let hintBox;
  if ($[2] !== text) {
    hintBox = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(NoticeLine, {
        state: "settled",
        tone: "dim",
        linkify: false,
        text,
      }),
    });
    $[2] = text;
    $[3] = hintBox;
  } else hintBox = $[3];
  return hintBox;
}
//@ chunk-18hwfzwa.js:1443110-1443782 placement
/**
 * 汇总会话标题头信息：模型显示名、effort、ultracode、快速模式、合规标识（HIPAA/zdr）、调试模式与账号记忆标记。
 */
function useSessionHeaderInfo() {
  let $ = useMemoCache(13);
  let model = useMainLoopModel_2();
  let parsedModel = parseUserSpecifiedModel(model);
  let briefOnly = useAppState(selectIsBriefOnly2);
  let effortSetting = useQueuedMessageText();
  let effort = isEffortIndicatorShown(effortSetting, parsedModel, briefOnly);
  let ultracodeState = useAppState(selectUltracode2);
  let modeMarkers = AccountMemoryMarker();
  let fastModeState = useAppState(selectFastMode_3);
  let isHipaa = useHasComplianceTaint("hipaa");
  let isZdr = useHasComplianceTaint("zdr");
  let modelLabel;
  if ($[0] !== model) {
    modelLabel = renderModelSetting(model);
    $[0] = model;
    $[1] = modelLabel;
  } else modelLabel = $[1];
  const effortLabel =
    effort === undefined
      ? undefined
      : (noEffortHint(effortSetting, parsedModel) ?? effortValueToString(effort));
  const ultra = !briefOnly && isUltracodeActive(ultracodeState, parsedModel);
  let fastMode;
  if ($[2] !== fastModeState || $[3] !== model) {
    fastMode = isFastModeOnForRequestModel(fastModeState, false, model);
    $[2] = fastModeState;
    $[3] = model;
    $[4] = fastMode;
  } else fastMode = $[4];
  const compliance = isHipaa ? "HIPAA" : isZdr ? "zdr" : undefined;
  let debug;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    debug = isDebugMode();
    $[5] = debug;
  } else debug = $[5];
  let info;
  if (
    $[6] !== modeMarkers ||
    $[7] !== modelLabel ||
    $[8] !== effortLabel ||
    $[9] !== ultra ||
    $[10] !== fastMode ||
    $[11] !== compliance
  ) {
    info = {
      model: modelLabel,
      effort: effortLabel,
      ultra,
      fastMode,
      compliance,
      debug,
      modes: modeMarkers,
    };
    $[6] = modeMarkers;
    $[7] = modelLabel;
    $[8] = effortLabel;
    $[9] = ultra;
    $[10] = fastMode;
    $[11] = compliance;
    $[12] = info;
  } else info = $[12];
  return info;
}
//@ chunk-18hwfzwa.js:1443782-1443829 placement (2.1.88 match: _temp2, 1)
function selectNoteHasViewedAgentTask(s_0) {
  return !!s_0.viewingAgentTaskId;
}
//@ chunk-18hwfzwa.js:1443829-1443921 placement (2.1.88 match: processQueuedCommands, 0.792)
function processQueuedCommands_2(queuedCommands) {
  return (
    queuedCommands.mode === "task-notification" &&
    queuedCommands.taskId !== undefined &&
    isSendableQueuedCommand(queuedCommands) &&
    !isTaskNotificationCommand(queuedCommands)
  );
}
//@ chunk-18hwfzwa.js:1443921-1444271 placement
/**
 * 面板打开期间有排队的后台任务更新时，显示"N background task updates waiting"。
 */
function PendingTaskUpdatesNote() {
  let $ = useMemoCache(4);
  let appState = useAppState(selectNoteHasViewedAgentTask);
  let commandQueue = useCommandQueue();
  let queuedCount;
  if ($[0] !== commandQueue) {
    queuedCount = count(commandQueue, processQueuedCommands_2);
    $[0] = commandQueue;
    $[1] = queuedCount;
  } else queuedCount = $[1];
  let queueSummary = queuedCount;
  if (appState || queueSummary === 0) {
    return null;
  }
  const summaryElement =
    queueSummary === 1 ? "Background task update" : `${queueSummary} background task updates`;
  let textElement;
  if ($[2] !== summaryElement) {
    textElement = jsxProd_default_2(Text, {
      dimColor: true,
      wrap: "truncate",
      children: [summaryElement, " ", "waiting while this panel is open"],
    });
    $[2] = summaryElement;
    $[3] = textElement;
  } else textElement = $[3];
  return textElement;
}
export { PendingTaskUpdatesNote, renderSessionHeaderLine };

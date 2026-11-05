/**
 * utils/messageQueueManager.ts
 *
 * 命令队列相关：优先级（now/next/later）、队列操作记录、可编辑命令弹回输入框、图片提取；本切片还混入了用量限额提示、权限模式循环与压缩元数据修复等代码（见过程记录）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/messageQueueManager.ts
 * pieces: chunk-1z79zgep.js (16), chunk-5xgkngpb.js (58), chunk-czq1j3j2.js (1), chunk-nh1pvp1m.js (1), chunk-w3ch4xq2.js (11)
 * attribution: placement 79, fingerprint 3, facade-majority 3, callgraph-fingerprint 1, sole-consumer 1
 */
import { randomUUID } from "crypto";
import {
  mainAgentId,
  isDiskless,
  onProcessRootHost,
  getSessionId,
  getConversationToolsUsed,
  getRootSession,
} from "../bootstrap/state.js";
import {
  normalizeTaskNotificationOrigin,
  isSessionTaskNotificationOrigin,
  isBareTaskNotificationOrigin,
  isNonHumanInboundOrigin,
} from "./backgroundSessionResume.js";
import { getQueuedNotificationMode } from "./attachments.js";
import { isTextNotTyped } from "../entrypoints/sdk/coreSchemas.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { looksLikeSlashInput } from "../commands.js";
import { isOwnWordTurn, isHumanDrivenOrigin, allUserTurnsSatisfy } from "./turnOrigin.js";
import { logForDebugging } from "./debug.js";
import { recordQueueOperation } from "./sessionStorage.js";
import { dropHopChain } from "./peerMessageHeaders.js";
import { isHumanOrAutoContinuation } from "./messageProvenance.js";
import { isPassiveOrAttachedCommand } from "./messages/messagePredicates.js";
import {
  isPollEventMode,
  selectPollEventBatch,
  MAX_POLL_EVENTS_PER_BATCH,
  MAX_POLL_EVENT_BATCH_BYTES,
  eventByteLength,
  POLL_KIND_DEFAULT_TIMEOUT_MS,
  isValidPollEventKind,
  mentionsReservedKind,
  EVAL_SETTLE_EVENT_KIND,
  REPL_STATUS_EVENT_KIND,
  pollEventMaxEnvelopeBytes,
  parsePollEventEnvelope,
  validatePollEvent,
  randomEventNonce,
  withEventNonce,
  isPollEventForAgent,
  discardPollEvent,
} from "./pollEvents.js";
import { codeModeAccepted } from "./codeMode/accepted.js";
import { runIgnoringAbort } from "../plugins/functionHooks/dispatch/dispatchScope.js";
import { clearScheduledByPlugin } from "./workloadContext.js";
import { extractTextContent_2, getContentText } from "./messages.js";
import { isBase64ImageBlock as isBase64ImageBlock_3 } from "./imageValidation.js";
import {
  mintPasteId,
  formatImageRef,
  registerPasteCarrier,
  groupByToObject,
  parsePastedRefs,
  isValidPasteId,
  expandPastedTextRefs_2,
} from "../history.js";
import { unchangedOrUndefined } from "./historyFile.js";
import { HostScoped } from "./hostScoped.js";
import { createSignal, createLazySignal } from "./signal.js";
import { createQueueRecorder, queueRecordText } from "./messageQueue/queueRecords.js";
import { countWhere } from "./collections.js";
import {
  isAbortError,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
} from "./errors.js";
import { logError } from "./log.js";
import { isTerminalShutdown } from "./terminalShutdown.js";
import {
  createHopGuard,
  getPeerGuardLimits,
  createPeerDropLogger,
  ownHopTokens,
} from "./udsMessaging/peerGuard.js";
import { parseAddress } from "./peerAddress.js";
import { swarmHostState } from "./swarm/hostState.js";
import { markReceiptQueued, settleReceiptsForMessages } from "../bridge/readReceipts.js";
import { noteHandback } from "../tools/AgentTool/handbackReport.js";
import { truncateMiddle as truncateMiddle_2 } from "../memdir/memoryTool.js";
import { MAX_MERGED_PROMPTS } from "../constants/outputLimits.js";
import { getContextKey } from "./cwd.js";
import { getRunId } from "./task/taskNotifications.js";
import { shouldStampThreadState } from "./projectsThreadState.js";
import { buildPollEventEnvelope } from "./pollEvents/declarations.js";
import { logDeliveryFailureForEndings } from "../services/mcp/taskDelivery.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { identity as identity_2 } from "./identity.js";
import { createValueSlot } from "./valueSlot.js";
import { stripAnsi } from "./stripAnsi.js";
import {
  MAX_CHECKLIST_LINE_CHARS,
  CHECKLIST_MARKER_STATUS,
  MAX_CHECKLIST_LINES,
  textFromTaskCreateInput,
} from "./tasks.js";
import { aliasCanonicalNames } from "../services/mcp/ccrMetaMcp.js";
import { NO_REPLY_SUFFIX } from "../bridge/projectsReplyEvaluation.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, array, stringSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { isMachineOnlyTurnRange } from "./messages/messageSource.js";
import { hasNoReplyTerminalTool, getTerminalMcpTools } from "./transcript/deserialize.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { isEvalToolCallName } from "../tools/REPLTool/constants.js";
import { parseExternalEventWake, isSessionInboxWake } from "./externalEventWake.js";
import { isGeneratedToolCountSummary } from "./permissions/yoloClassifier.js";
import { FETCH_INBOX_MESSAGE_TOOL_NAME } from "../tools/FetchInboxMessageTool/prompt.js";
import { READNOTIFICATIONS } from "../tools/ReadNotificationsTool/ReadNotificationsTool.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-1z79zgep.js:723-817 placement
/**
 * 判断输入是否为需要唤醒的 poll-event 命令。
 */
function isPollEventWakeInput(input, pollEmptyDispatchStalled, forceWake) {
  return (
    input !== undefined &&
    input.mode === "poll-event" &&
    (input.pollEvent?.wake === true || forceWake) &&
    !pollEmptyDispatchStalled
  );
}
//@ chunk-1z79zgep.js:817-945 placement
/**
 * 判断某模式是否可作为提示输入（prompt、bash、任务通知等）。
 */
function isPromptCapableMode(mode, clientBashCommand) {
  return (
    mode === "prompt" ||
    (mode === "bash" && clientBashCommand === true) ||
    mode === "orphaned-permission" ||
    mode === "task-notification" ||
    mode === "poll-event"
  );
}
//@ chunk-1z79zgep.js:945-984 placement
/**
 * 判断命令是否属于主 agent。
 */
function isMainAgentCommand(command) {
  return command.agentId === mainAgentId();
}
//@ chunk-1z79zgep.js:984-1041 placement
/**
 * "目标检查"任务通知来源。
 */
var GOAL_CHECKIN_ORIGIN = {
  kind: "task-notification",
  source: "goal-checkin",
};
//@ chunk-1z79zgep.js:1041-1135 placement
/**
 * 判断来源是否为目标检查通知。
 */
function isGoalCheckinNotification(origin) {
  return origin.origin?.kind === "task-notification" && origin.origin.source === "goal-checkin";
}
//@ chunk-1z79zgep.js:1135-1194 placement
/**
 * "worker 检查"任务通知来源。
 */
var WORKER_CHECKIN_ORIGIN = {
  kind: "task-notification",
  source: "worker-checkin",
};
//@ chunk-1z79zgep.js:1194-1361 placement
function isCheckinNotification(message) {
  return (
    message.origin?.kind === "task-notification" &&
    (message.origin.source === "goal-checkin" ||
      message.origin.source === "worker-checkin" ||
      message.origin.source === "shell-checkin")
  );
}
//@ chunk-1z79zgep.js:1361-1420 placement (2.1.88 match: processQueuedCommands, 1)
function processQueuedCommands(queuedCommands) {
  return isMainAgentCommand(queuedCommands) && queuedCommands.mode === "task-notification";
}
//@ chunk-1z79zgep.js:1420-1497 placement
/**
 * 归一化队列来源（检查通知做规范来源）。
 */
function normalizedQueueOrigin(command) {
  let origin = command.queueOrigin ?? command.origin;
  return isCheckinNotification({
    origin,
  })
    ? normalizeTaskNotificationOrigin(origin)
    : origin;
}
//@ chunk-1z79zgep.js:1497-1543 placement
/**
 * 取队列中的通知模式（显式 queueMode 或按来源推断）。
 */
function queuedNotificationMode(command) {
  return command.queueMode ?? getQueuedNotificationMode(normalizedQueueOrigin(command));
}
//@ chunk-1z79zgep.js:1543-1634 placement
/**
 * 判断是否应跳过该队列附件的附加处理。
 */
function shouldSkipQueueAttachments(command) {
  return command.queueSkipAttachments === true || queuedNotificationMode(command) === "task-notification"
    ? true
    : undefined;
}
//@ chunk-1z79zgep.js:1634-1932 placement
function textNotTypedFlags(text, meta) {
  if (!isTextNotTyped(text)) return;
  if ("text_not_typed" in text && text.text_not_typed === true) logFeatureOk("input_text_not_typed");
  else logFeatureSad("input_text_not_typed", "malformed_mark");
  let flattened = (meta?.writtenFiles ?? []).flatMap((file) => (file.inlined ? [] : [file.path]));
  return {
    textNotTyped: true,
    skipSlashCommands: true,
    ...(flattened.length > 0 && {
      ownFilePaths: flattened,
    }),
  };
}
//@ chunk-1z79zgep.js:1932-2184 placement
/**
 * 计算入队命令的输入标志（跳过斜杠命令、非键入、仅排空等）。
 */
function queueInputFlags(message) {
  if (message.handedOff !== true && message.textNotTyped !== true)
    return message.queueSkipSlashCommands === true && looksLikeSlashInput(message.message.content)
      ? {
          skipSlashCommands: true,
        }
      : undefined;
  return {
    textNotTyped: true,
    noPersonArrived: true,
    drainOnly: true,
    ...(looksLikeSlashInput(message.message.content) && {
      skipSlashCommands: true,
    }),
  };
}
//@ chunk-1z79zgep.js:2264-2416 placement
function getSchedulingPlugin(input) {
  let { origin } = input;
  let originPlugin =
    origin?.kind === "plugin"
      ? origin.name
      : typeof origin === "object" && origin !== null && "plugin" in origin
        ? origin.plugin
        : undefined;
  return input.scheduledByPlugin ?? originPlugin;
}
//@ chunk-1z79zgep.js:2416-2457 placement
/**
 * 判断两条命令是否来自同一调度插件。
 */
function sameSchedulingPlugin(inputA, inputB) {
  return getSchedulingPlugin(inputA) === getSchedulingPlugin(inputB);
}
//@ chunk-1z79zgep.js:2457-2532 placement
/**
 * 找出这批命令的调度插件（混合来源时为 undefined）。
 */
function firstSchedulingPlugin(inputs) {
  return inputs.some(isOwnWordTurn)
    ? undefined
    : inputs.map(getSchedulingPlugin).find((plugin) => plugin !== undefined);
}
//@ chunk-5xgkngpb.js:194633-194717 placement
class QueueInstallerHolder {
  current = null;
  register(installer) {
    this.current = installer;
  }
  registered() {
    return this.current;
  }
}
//@ chunk-5xgkngpb.js:194717-194733 placement
var queueInstallerSingleton; // deferred: uses QueueInstallerHolder of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:194717", () => {
  queueInstallerSingleton = new QueueInstallerHolder();
});
//@ chunk-5xgkngpb.js:194733-194765 placement
function setQueueInstaller(installer) {
  queueInstallerSingleton.register(installer);
}
//@ chunk-5xgkngpb.js:194765-194804 placement
/**
 * 取当前登记的队列安装器。
 */
function getProcessedQueuedCommands() {
  return queueInstallerSingleton.registered();
}
//@ chunk-5xgkngpb.js:559235-559424 fingerprint (2.1.88 match: PRIORITY_ORDER, 0.375)
/**
 * {now:0, next:1, later:2}。
 */
var recordQueueOperation_2 = (operation) => {
  if (isDiskless()) {
    logForDebugging(
      `Diskless session: queue operation '${operation.operation}' not recorded: the default queue has no storage backend`,
      {
        level: "warn",
      },
    );
    return;
  }
  recordQueueOperation(operation);
};
var PRIORITY_ORDER = {
  now: 0,
  next: 1,
  later: 2,
};
//@ chunk-5xgkngpb.js:559424-559489 placement
function isPeerOrigin(origin) {
  return origin?.kind === "peer" && origin.senderTaskId === undefined;
}
//@ chunk-5xgkngpb.js:559489-559759 placement
function dropPeerHopChain(input) {
  if (!isPeerOrigin(input.origin)) return input;
  let rawValue = input.value;
  if (typeof rawValue === "string") {
    let stripped = dropHopChain(rawValue);
    return stripped === rawValue
      ? input
      : {
          ...input,
          value: stripped,
        };
  }
  let changed = false;
  let value = rawValue.map((block) => {
    if (block.type !== "text") return block;
    let strippedText = dropHopChain(block.text);
    if (strippedText === block.text) return block;
    changed = true;
    return {
      ...block,
      text: strippedText,
    };
  });
  return changed
    ? {
        ...input,
        value,
      }
    : input;
}
//@ chunk-5xgkngpb.js:559759-559829 placement
function isVouchedPeerOrigin(origin) {
  return origin.verifiedPeerPid !== undefined || origin.from !== "unknown";
}
//@ chunk-5xgkngpb.js:559829-559881 placement
var NON_EDITABLE_MODES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:559829", () => {
  NON_EDITABLE_MODES = new Set(["task-notification", "poll-event"]);
});
//@ chunk-5xgkngpb.js:559881-559915 placement
function isPromptInputModeEditable(mode) {
  return !NON_EDITABLE_MODES.has(mode);
}
//@ chunk-5xgkngpb.js:559915-559996 placement
/**
 * 判断历史条目是否可用于回填输入框（可改写且有字符串值）。
 */
function isTypedAtThisComposer(entry) {
  return (
    entry.historyEntry !== undefined && isQueuedCommandEditable(entry) && typeof entry.value === "string"
  );
}
//@ chunk-5xgkngpb.js:559996-560064 placement (2.1.88 match: isQueuedCommandEditable, 1)
/**
 * 判断输入是否可回填（可编辑提示模式、非 meta、人类/自动续写来源）。
 */
function isQueuedCommandEditable(input) {
  return (
    isPromptInputModeEditable(input.mode) &&
    !input.isMeta &&
    isHumanOrAutoContinuation(input.origin) &&
    !isPassiveOrAttachedCommand(input)
  );
}
//@ chunk-5xgkngpb.js:560064-560117 placement (2.1.88 match: prependModeCharacterToInput, 1)
function isQueuedCommandPullableInto(input, mode) {
  return isQueuedCommandEditable(input) && (mode || input.mode !== "bash");
}
//@ chunk-5xgkngpb.js:560117-560258 placement
function hasPreExpansionText(input) {
  return (
    (input.skipSlashCommands === true || input.pasteTagged === true) &&
    typeof input.preExpansionValue === "string" &&
    input.preExpansionValue.trim() !== ""
  );
}
//@ chunk-5xgkngpb.js:560258-560331 placement
/**
 * 取输入的展示文本（展开前原文优先）。
 */
function restoreTextForPop(input) {
  if (hasPreExpansionText(input)) return input.preExpansionValue;
  return extractTextFromValue(input.value);
}
//@ chunk-5xgkngpb.js:560331-560477 placement
function collectPastedContentsForPop(input) {
  if (!input.pastedContents) return [];
  let keepAll = hasPreExpansionText(input);
  return Object.values(input.pastedContents).filter(
    (pastedContent) => pastedContent.type === "image" || pastedContent.inline === true || keepAll,
  );
}
//@ chunk-5xgkngpb.js:560477-560651 placement
function isQueuedCommandVisible(command, meta) {
  let kind = command.origin?.kind;
  if (
    (kind === "task-notification" &&
      !(isSessionTaskNotificationOrigin(command.origin) && isBareTaskNotificationOrigin(command.origin))) ||
    kind === "auto-continuation" ||
    kind === "plugin"
  )
    return true;
  return isNonHumanInboundOrigin(command.origin, meta) || isQueuedCommandEditable(command);
}
//@ chunk-5xgkngpb.js:560651-560695 placement
/**
 * 判断是否为主 agent 的非被动命令。
 */
function isDrainableMainThreadCommand(command) {
  return isMainAgentCommand(command) && command.passive !== true;
}
//@ chunk-5xgkngpb.js:560695-560731 placement
/**
 * 判断该排队命令是否可发送（活跃且未被挂起）。
 */
function isIdleDrainableMainThreadCommand(command) {
  return isDrainableMainThreadCommand(command) && !isPollEventMode(command);
}
//@ chunk-5xgkngpb.js:560731-560825 facade-majority (2.1.88 match: canBatchWith, 0.666)
/**
 * 排队的命令能否与前一条合并发送（同为普通 prompt 且来源允许）。
 */
function isQueuedUserTurnCommand(command) {
  return (
    isIdleDrainableMainThreadCommand(command) &&
    command.mode === "prompt" &&
    command.shouldQuery !== false &&
    !command.isMeta &&
    isHumanDrivenOrigin(command.origin)
  );
}
//@ chunk-5xgkngpb.js:560883-560943 placement
/**
 * 判断是否为主 agent 的被动命令。
 */
function isPassiveMainThreadCommand(command) {
  return (
    command.passive === true &&
    isMainAgentCommand(command) &&
    !(codeModeAccepted() && isPollEventMode(command))
  );
}
//@ chunk-5xgkngpb.js:560943-561000 placement (2.1.88 match: isSlashCommand, 1)
function isSlashCommand(cmd) {
  return looksLikeSlashInput(cmd.value) && !cmd.skipSlashCommands;
}
//@ chunk-5xgkngpb.js:561000-561079 placement (2.1.88 match: getValueFromInput, 1)
function unnameTurnPersonJoined(commands, isMainThreadQuery) {
  runIgnoringAbort(() => {
    if (isMainThreadQuery && commands.some((command) => command.mode === "prompt" && isOwnWordTurn(command)))
      clearScheduledByPlugin();
  });
}
//@ chunk-5xgkngpb.js:561079-561284 placement
function filterMidTurnDrainCommands(commandsByMaxPriority, { isMainThread, currentAgentId }) {
  let commands = commandsByMaxPriority.filter((command) => {
    if (isSlashCommand(command)) return false;
    if (isMainThread) return isMainAgentCommand(command);
    return (
      (command.mode === "task-notification" || (codeModeAccepted() && command.mode === "poll-event")) &&
      command.agentId === currentAgentId
    );
  });
  return dedupePollEvents(commands);
}
//@ chunk-5xgkngpb.js:561284-561391 placement
function midTurnFoldableFor(threadInfo) {
  return threadInfo.isMainThread
    ? isDrainableMainThreadCommand
    : (command) =>
        filterMidTurnDrainCommands([command], {
          isMainThread: false,
          currentAgentId: threadInfo.agentId,
        }).length > 0;
}
//@ chunk-5xgkngpb.js:561391-561581 placement
function dedupePollEvents(commands) {
  let entries = commands.filter((command) => command.mode === "poll-event");
  if (entries.length === 0) return commands;
  let batchIds = new Set(selectPollEventBatch(entries));
  if (batchIds.size === entries.length) return commands;
  return commands.filter((command) => command.mode !== "poll-event" || batchIds.has(command));
}
//@ chunk-5xgkngpb.js:561581-561629 placement (2.1.88 match: getValueFromInput, 1)
function isQueuedUserPrompt(input) {
  return isMainAgentCommand(input) && input.mode === "prompt";
}
//@ chunk-5xgkngpb.js:561629-561657 placement
/**
 * 判断该命令是否尚未通过屏幕检查（可回填）。
 */
function isBatchHeadHumanCommand(input) {
  return isQueuedCommandEditable(input);
}
//@ chunk-5xgkngpb.js:561657-561712 placement
function extractTextFromValue(value) {
  return typeof value === "string"
    ? value
    : extractTextContent_2(
        value,
        `
`,
      );
}
//@ chunk-5xgkngpb.js:561712-561972 facade-majority (2.1.88 match: extractImagesFromValue, 0.858)
/**
 * 从内容块中取出 base64 图片为 paste 记录（id、mediaType、filename）。
 */
function extractImagesFromValue(value, startId) {
  if (typeof value === "string") return [];
  let images = [];
  let imageIndex = 0;
  for (let block of value)
    if (isBase64ImageBlock_3(block) && block.type === "image") {
      let mediaType = block.source.media_type;
      images.push({
        id: startId + imageIndex,
        type: "image",
        content: block.source.data,
        mediaType: typeof mediaType === "string" ? mediaType : undefined,
        filename: `image${imageIndex + 1}`,
      });
      imageIndex++;
    }
  return images;
}
//@ chunk-5xgkngpb.js:561972-562223 facade-majority
/**
 * 图片块按是否有原 paste id 分成 stamped / manufactured。
 */
function restorePastedImageContents(content, imagePasteIds) {
  let stamped = {};
  let manufactured = {};
  content.forEach((block, index) => {
    if (!isBase64ImageBlock_3(block)) return;
    let pasteId = imagePasteIds?.[index];
    let id = pasteId ?? index + 1;
    let mediaType = block.source.media_type;
    let target = pasteId !== undefined ? stamped : manufactured;
    target[id] = {
      id,
      type: "image",
      content: block.source.data,
      mediaType: typeof mediaType === "string" ? mediaType : undefined,
    };
  });
  return {
    stamped,
    manufactured,
  };
}
//@ chunk-5xgkngpb.js:562223-562367 callgraph-fingerprint (2.1.88 match: popAllEditable, 0.225)
/**
 * 可编辑命令弹回输入框：图片换成 [Image #n] 引用并重新编号。
 */
function popAllEditable(text, images, pastePrefix, seq) {
  let mapped = extractImagesFromValue(images, 0).map((cmd) => ({
    ...cmd,
    id: mintPasteId(pastePrefix, seq),
  }));
  return {
    text: [...mapped.map((cmd) => formatImageRef(cmd.id)), text].filter(Boolean).join(" "),
    images: mapped,
  };
}
//@ chunk-5xgkngpb.js:562367-562519 placement
function joinWithCursor(leftText, rightText, rightCursor) {
  if (!leftText)
    return {
      text: rightText,
      cursorOffset: rightCursor,
    };
  if (!rightText)
    return {
      text: leftText,
      cursorOffset: leftText.length + rightCursor,
    };
  return {
    text: `${leftText}
${rightText}`,
    cursorOffset: leftText.length + 1 + rightCursor,
  };
}
//@ chunk-5xgkngpb.js:562519-562677 placement
function hasUnpassedScreening(command) {
  let { promptSubmitted, value } = command;
  return (
    promptSubmitted === undefined ||
    command.screeningPending === true ||
    command.screeningOwed === true ||
    promptSubmitted.stopped !== undefined ||
    unchangedOrUndefined(value, promptSubmitted.text) !== undefined
  );
}
//@ chunk-5xgkngpb.js:562677-562745 placement
var queueSignalsRegistry; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-5xgkngpb.js:562677", () => {
  queueSignalsRegistry = new HostScoped(() => ({
    commandsDiscarded: createSignal(),
    commandsConsumed: createSignal(),
  }));
});
//@ chunk-5xgkngpb.js:562745-562775 placement
function currentQueueSignals() {
  return onProcessRootHost(queueSignalsRegistry);
}
//@ chunk-5xgkngpb.js:562775-562850 placement
/**
 * 队列事件信号：命令被丢弃与命令被消费。
 */
var commandsDiscarded; // deferred: uses currentQueueSignals of its import cycle while loading; runs once the cycle is complete
var commandsConsumed;
deferInit("chunk-5xgkngpb.js:562775", () => {
  commandsDiscarded = createLazySignal(() => currentQueueSignals().commandsDiscarded);
  commandsConsumed = createLazySignal(() => currentQueueSignals().commandsConsumed);
});
//@ chunk-5xgkngpb.js:562850-562939 placement
function queuedUnderPlugins(command) {
  return command.queuedUnder ?? (command.origin?.kind === "plugin" ? [command.origin.name] : undefined);
}
//@ chunk-5xgkngpb.js:562939-562961 placement
var PEER_ADMITTED = {
  admitted: true,
};
//@ chunk-5xgkngpb.js:562961-584563 placement
/**
 * 创建消息队列管理器：入队、暂扣、钩子丢弃、交回等操作。
 */
function createMessageQueue(options) {
  let recordOperation = options?.recordOperation ?? createQueueRecorder(recordQueueOperation_2);
  let queueSignals = currentQueueSignals();
  function recordQueueOperation(operation, content, reason, commandUuid, deliveryId, queuedUnder) {
    let queueOperation = {
      type: "queue-operation",
      operation,
      timestamp: new Date().toISOString(),
      sessionId: getSessionId(),
      ...(content !== undefined && {
        content,
      }),
      ...(reason !== undefined && {
        reason,
      }),
      ...(commandUuid !== undefined && {
        commandUuid,
      }),
      ...(deliveryId !== undefined && {
        deliveryId,
      }),
    };
    if (queuedUnder === undefined) recordOperation(queueOperation);
    else recordOperation(queueOperation, queuedUnder);
  }
  function recordEnqueue(operation, command) {
    recordQueueOperation(
      operation,
      queueRecordText(command),
      undefined,
      undefined,
      undefined,
      queuedUnderPlugins(command),
    );
  }
  let commands = [...(options?.adopt ?? [])];
  let snapshot = Object.freeze([...commands]);
  let signal = createSignal();
  let signal_2 = createSignal();
  let signal_3 = createSignal();
  registerPasteCarrier(() => commands.filter(isQueuedCommandEditable).map(restoreTextForPop));
  let cancelPending = new Set();
  let cancelPendingAcked = new Set();
  let maxCancelPending = 256;
  function emitQueueChanged() {
    snapshot = Object.freeze([...commands]);
    signal.emit();
  }
  let hold;
  function markHeldPassive(command) {
    if (hold === undefined || command.passive === true || !hold.holds(command)) return false;
    command.passive = true;
    hold.marked.add(command);
    return true;
  }
  function holdBack(holds) {
    if (hold !== undefined)
      throw Error(
        "holdBack: this message queue already has a hold; end it with the function the first call returned before setting another",
      );
    let newHold = {
      holds,
      marked: new Set(),
    };
    hold = newHold;
    try {
      if (countWhere(commands, markHeldPassive) > 0) emitQueueChanged();
    } catch (error) {
      if (hold === newHold) hold = undefined;
      for (let command of newHold.marked) delete command.passive;
      throw error;
    }
    return () => {
      if (hold !== newHold) return 0;
      hold = undefined;
      let filtered = commands.filter((heldCommand) => newHold.marked.has(heldCommand));
      if (filtered.length === 0) return 0;
      let filtered_2 = commands.filter((unheldCommand) => !newHold.marked.has(unheldCommand));
      for (let heldCommand of filtered) delete heldCommand.passive;
      commands.length = 0;
      commands.push(...filtered_2, ...filtered);
      emitQueueChanged();
      return filtered.length;
    };
  }
  function letHeldBackGo(predicate) {
    let marked = hold?.marked;
    let filtered = commands.filter((command) => marked?.has(command) === true && predicate(command));
    for (let command of filtered) {
      delete command.passive;
      marked?.delete(command);
    }
    if (filtered.length > 0) emitQueueChanged();
    return filtered.length;
  }
  function markCancelPending(uuid, options) {
    if (cancelPending.delete(uuid)) cancelPending.add(uuid);
    else {
      if (options?.terminalEmitted !== true && cancelPending.size >= maxCancelPending) {
        let evictUuid;
        for (let queuedUuid of cancelPending)
          if (!cancelPendingAcked.has(queuedUuid)) {
            evictUuid = queuedUuid;
            break;
          }
        if (evictUuid !== undefined) cancelPending.delete(evictUuid);
      }
      cancelPending.add(uuid);
    }
    if (options?.terminalEmitted !== true) return false;
    if (cancelPendingAcked.has(uuid)) return false;
    cancelPendingAcked.add(uuid);
    return true;
  }
  function consumeCancelPending(uuid) {
    return cancelPending.delete(uuid);
  }
  function consumeCancelPendingAcked(uuid) {
    return cancelPendingAcked.delete(uuid);
  }
  function hasCancelPendingAcked(uuid) {
    return cancelPendingAcked.has(uuid);
  }
  let foldInFlight = new Set();
  function registerFoldInFlight(foldedCommands) {
    for (let command of foldedCommands) {
      foldInFlight.add(command);
      if (command.uuid !== undefined) foldInFlight.add(command.uuid);
    }
  }
  function unregisterFoldInFlight(foldedCommands) {
    for (let command of foldedCommands) {
      foldInFlight.delete(command);
      if (command.uuid !== undefined) foldInFlight.delete(command.uuid);
    }
  }
  function isFoldInFlight(uuid) {
    return foldInFlight.has(uuid);
  }
  let inboundIngests = new Map();
  function beginInboundIngest(messageId) {
    if (messageId === undefined)
      return {
        withdrawn: () => false,
        [Symbol.dispose]: () => {},
      };
    let ingestState = {
      withdrawn: false,
    };
    inboundIngests.set(messageId, ingestState);
    return {
      withdrawn: () => ingestState.withdrawn,
      [Symbol.dispose]: () => {
        if (inboundIngests.get(messageId) === ingestState) inboundIngests.delete(messageId);
      },
    };
  }
  function withdrawInboundIngest(messageId) {
    let ingestState = inboundIngests.get(messageId);
    if (ingestState === undefined || ingestState.withdrawn) return false;
    ingestState.withdrawn = true;
    return true;
  }
  let midTurnFoldSuspended = false;
  let turnStartFoldTarget;
  function suspendMidTurnFold() {
    if (midTurnFoldSuspended) return;
    midTurnFoldSuspended = true;
    emitQueueChanged();
  }
  function settleScreening(uuid, result) {
    return applyScreeningResult(
      commands.find((command) => command.uuid === uuid && command.screeningPending === true),
      result,
    );
  }
  function settleSurfaced(command, result) {
    return applyScreeningResult(commands.includes(command) ? command : undefined, result);
  }
  function handTypedBack(entries) {
    let filtered = entries.filter(isTypedAtThisComposer);
    if (filtered.length === 0) return;
    try {
      signal_3.emit(filtered);
    } catch (error) {
      if (isAbortError(error)) logForDebugging(`typedHandedBack listener aborted: ${error}`);
      else logError(error);
    }
  }
  function applyScreeningResult(command, result) {
    if (command === undefined) return false;
    if ("dropped" in result) {
      remove([command], {
        reason: "dropped_by_hook",
      });
      return true;
    }
    let wasScreeningPending = command.screeningPending === true;
    delete command.screeningPending;
    command.promptSubmitted = result.promptSubmitted;
    command.drainOnly = result.drainOnly;
    if (result.promptSubmitted === undefined) command.screeningOwed = true;
    else delete command.screeningOwed;
    emitQueueChanged();
    if (wasScreeningPending && !command.unlogged) recordEnqueue("enqueue", command);
    return true;
  }
  function promoteToNow(uuid) {
    let found = commands.find((command) => command.uuid === uuid);
    if (found === undefined || found.priority === "now" || foldInFlight.has(uuid)) return false;
    found.raisedFrom = found.priority ?? "next";
    found.priority = "now";
    emitQueueChanged();
    return true;
  }
  function demoteFromNow(uuid, priority) {
    let found = commands.find((command) => command.uuid === uuid);
    if (found === undefined || found.priority !== "now") return false;
    found.priority = priority;
    emitQueueChanged();
    return true;
  }
  function isMidTurnFoldSuspended() {
    return midTurnFoldSuspended || isTerminalShutdown();
  }
  let inFlightDrainBatch = null;
  let drainBatchStanding;
  function setInFlightDrainBatch(drainBatch) {
    inFlightDrainBatch = drainBatch;
    drainBatchStanding = undefined;
  }
  function clearInFlightDrainBatch(drainBatch) {
    if (drainBatch === undefined || inFlightDrainBatch === drainBatch) {
      inFlightDrainBatch = null;
      drainBatchStanding = undefined;
    }
  }
  function someInFlightDrainCommand(predicate) {
    return inFlightDrainBatch !== null && inFlightDrainBatch.some(predicate);
  }
  let inFlightSubmissions = new Set();
  function trackSubmission(submission) {
    inFlightSubmissions.add(submission);
    return {
      [Symbol.dispose]: () => {
        inFlightSubmissions.delete(submission);
      },
    };
  }
  function someSubmissionInFlight(predicate) {
    for (let submission of inFlightSubmissions) if (predicate(submission)) return true;
    return false;
  }
  function noteTurnAppended(appendedCommands) {
    let appendedUuids = new Set(appendedCommands.map((command) => command.uuid));
    for (let submission of inFlightSubmissions)
      if (submission.uuid !== undefined && appendedUuids.has(submission.uuid))
        inFlightSubmissions.delete(submission);
    let flattened = (inFlightDrainBatch ?? []).flatMap((batchCommand) =>
      batchCommand.uuid === undefined ? [] : [batchCommand.uuid],
    );
    if (flattened.length > 0 && drainBatchStanding !== "appended")
      drainBatchStanding = flattened.some((batchUuid) => appendedUuids.has(batchUuid))
        ? "appended"
        : "passed-over";
  }
  function getInFlightDrainBatchStanding() {
    return drainBatchStanding;
  }
  let resolved = Promise.resolve();
  function takeInboundEnqueueTurn() {
    let prior = resolved;
    let release;
    resolved = new Promise((resolve) => {
      release = resolve;
    });
    return {
      prior,
      release,
    };
  }
  function getCommandQueueSnapshot() {
    return snapshot;
  }
  function getCommandQueue() {
    return [...commands];
  }
  function getCommandQueueLength() {
    return commands.length;
  }
  function getMainThreadQueueLength() {
    return countWhere(commands, isIdleDrainableMainThreadCommand);
  }
  function getDrainableMainThreadQueueLength() {
    return (
      getMainThreadQueueLength() +
      countWhere(commands, (heldCommand) => hold?.marked.has(heldCommand) === true)
    );
  }
  function hasCommandsInQueue() {
    return commands.length > 0;
  }
  function hasUserIntentCommandsInQueue() {
    return commands.some((command) => !isPollEventMode(command) && command.passive !== true);
  }
  function recheckCommandQueue() {
    if (commands.length > 0) emitQueueChanged();
  }
  let hopGuard = createHopGuard({}, getPeerGuardLimits);
  let peerDropConfig =
    options?.dropReceiptTrailMs === undefined
      ? {}
      : {
          trailMs: options.dropReceiptTrailMs,
        };
  let peerDropLogger = createPeerDropLogger(peerDropConfig);
  function resetPeerGuard() {
    hopGuard = createHopGuard({}, getPeerGuardLimits);
    peerDropLogger.dispose();
    peerDropLogger = createPeerDropLogger(peerDropConfig);
  }
  function flushPeerDropReceipts(options) {
    return peerDropLogger.flushPendingReceipts(options);
  }
  function getQueuedPeerMessageCount() {
    let isPeerCommand = (command) => isPeerOrigin(command.origin);
    let inFlightCount = 0;
    runIgnoringAbort(() => {
      inFlightCount = heldByHold.get()?.(isPeerCommand) ?? 0;
    });
    return countWhere(commands, isPeerCommand) + inFlightCount;
  }
  function admitPeerCommand(command, receiptMode = "coalesced") {
    let origin = command.origin;
    if (!isPeerOrigin(origin)) return PEER_ADMITTED;
    let isResurrected = command.admissionExempt === "resurrected";
    if (!isResurrected && !isVouchedPeerOrigin(origin)) {
      let hopCheck = hopGuard.checkHopChain(origin.hopChain, ownHopTokens());
      if (hopCheck && !hopCheck.admitted) {
        peerDropLogger.report({
          reason: hopCheck.reason,
          from: origin.from,
          ...(origin.name !== undefined && {
            name: origin.name,
          }),
        });
        if (receiptMode === "coalesced") reportPeerDrop(command, hopCheck.reason);
        return {
          admitted: false,
          reason: hopCheck.reason,
        };
      }
    }
    if (!isResurrected && isVouchedPeerOrigin(origin)) {
      let body = typeof command.value === "string" ? command.value : extractTextContent_2(command.value);
      let admission = hopGuard.admit({
        senderKey: origin.from !== "unknown" ? `from:${origin.from}` : `pid:${origin.verifiedPeerPid}`,
        body,
        hopChain: origin.hopChain,
        ownTokens: ownHopTokens(),
      });
      if (!admission.admitted) {
        peerDropLogger.report({
          reason: admission.reason,
          from: origin.from,
          ...(origin.name !== undefined && {
            name: origin.name,
          }),
        });
        if (receiptMode === "coalesced") reportPeerDrop(command, admission.reason);
        return {
          admitted: false,
          reason: admission.reason,
        };
      }
    }
    if (!isResurrected && getQueuedPeerMessageCount() >= getPeerGuardLimits().maxQueuedPeerMessages) {
      peerDropLogger.report({
        reason: "queue-full",
        from: origin.from,
        ...(origin.name !== undefined && {
          name: origin.name,
        }),
      });
      if (receiptMode === "coalesced") reportPeerDrop(command, "queue-full");
      return {
        admitted: false,
        reason: "queue-full",
      };
    }
    logFeatureOk("peer_loop_guard");
    return PEER_ADMITTED;
  }
  function reportPeerDrop(command, reason) {
    let origin = command.origin;
    if (
      origin?.kind !== "peer" ||
      parseAddress(origin.from).scheme !== "uds" ||
      !swarmHostState().inbound.sendPeerReceipt
    )
      return;
    peerDropLogger.noteDropForReceipt(
      `${origin.from}\x00${origin.verifiedPeerPid ?? ""}\x00${reason}`,
      origin.msg_id,
      (droppedMsgIds) =>
        swarmHostState().inbound.sendPeerReceipt?.(command, "dropped", {
          dropReason: reason,
          droppedMsgIds,
        }),
    );
  }
  function queueWithReceipt(command, commit) {
    let queued = false;
    runIgnoringAbort(() => {
      let commitThunk = () => emitDiscarded([command]);
      queued = entryHold.get()?.(command, commit, commitThunk) === true;
      if (queued) markReceiptQueued(command.uuid);
    });
    return queued;
  }
  function enqueueReportingAdmission(command, { receipt: receiptMode = "coalesced", ahead = false } = {}) {
    let admission = admitPeerCommand(command, receiptMode);
    if (!admission.admitted) return admission;
    let preparedCommand = {
      ...dropPeerHopChain(command),
      priority: command.priority ?? "next",
      timestamp: command.timestamp ?? new Date().toISOString(),
    };
    let commit = () => commitPeerCommand(command, preparedCommand, ahead);
    if (!queueWithReceipt(preparedCommand, commit)) commit();
    return PEER_ADMITTED;
  }
  function commitPeerCommand(originalCommand, command, ahead) {
    markHeldPassive(command);
    if (ahead) commands.unshift(command);
    else commands.push(command);
    if (
      originalCommand.origin?.kind === "peer" &&
      originalCommand.origin.handback === true &&
      originalCommand.origin.senderTaskId !== undefined &&
      originalCommand.admissionExempt !== "resurrected"
    )
      noteHandback({
        sender: originalCommand.origin.senderTaskId,
        recipient: originalCommand.agentId,
        senderName: originalCommand.origin.from,
        flagged: originalCommand.origin.flagged === true,
      });
    markReceiptQueued(originalCommand.uuid);
    emitQueueChanged();
    if (!originalCommand.unlogged && originalCommand.screeningPending !== true)
      recordEnqueue("enqueue", originalCommand);
  }
  function enqueue(command) {
    enqueueReportingAdmission(command);
  }
  function enqueuePendingNotification(command, { turnAttribution = "none" } = {}) {
    if (!admitPeerCommand(command).admitted) return;
    let nextCommand = command;
    if (command.mode === "task-notification" && typeof command.value === "string") {
      let truncatedValue = truncateMiddle_2(command.value, MAX_MERGED_PROMPTS);
      if (truncatedValue !== command.value) {
        logForDebugging(
          `enqueuePendingNotification: task-notification capped from ${command.value.length} to ${truncatedValue.length} chars`,
          {
            level: "warn",
          },
        );
        nextCommand = {
          ...command,
          value: truncatedValue,
        };
      }
    }
    let attributionKey =
      command.inheritedTurnAttributionKey ??
      (turnAttribution === "inherit" && command.mode === "task-notification" ? getContextKey() : undefined);
    if (
      turnAttribution === "inherit" &&
      command.mode === "task-notification" &&
      (nextCommand.origin === undefined || nextCommand.origin.kind === "task-notification")
    )
      nextCommand = {
        ...nextCommand,
        origin: {
          ...(nextCommand.origin ?? {
            kind: "task-notification",
          }),
          producer: "session-task",
        },
      };
    let runId =
      command.mode === "task-notification" && command.taskId !== undefined
        ? (command.runId ?? getRunId(command.taskId))
        : undefined;
    if (runId !== undefined)
      nextCommand = {
        ...nextCommand,
        runId,
      };
    let stampThreadState =
      command.stampThreadState ??
      (command.mode === "task-notification" &&
        command.handbackPointer !== true &&
        isDrainableMainThreadCommand(command) &&
        shouldStampThreadState({
          isPeer: false,
        }));
    let preparedCommand = {
      ...dropPeerHopChain(nextCommand),
      priority: command.priority ?? "later",
      timestamp: command.timestamp ?? new Date().toISOString(),
      ...(attributionKey && {
        inheritedTurnAttributionKey: attributionKey,
      }),
      ...(stampThreadState && {
        stampThreadState: true,
      }),
    };
    let commit = () => {
      markHeldPassive(preparedCommand);
      commands.push(preparedCommand);
      emitQueueChanged();
      if (!command.unlogged) recordQueueOperation("enqueue", queueRecordText(nextCommand));
    };
    if (!queueWithReceipt(preparedCommand, commit)) commit();
  }
  async function enqueuePollEvent(request) {
    assertPollEventCapacity(1);
    let { command, delivered } = buildPollEventCommand(request, undefined);
    commands.push(command);
    emitQueueChanged();
    recordQueueOperation("enqueue", command.pollEvent?.envelope);
    return delivered;
  }
  async function enqueuePollEventGroup(requests) {
    assertPollEventCapacity(requests.length);
    if (
      requests.length === 0 ||
      requests.length > MAX_POLL_EVENTS_PER_BATCH ||
      requests.some((request) => request.wake === false)
    ) {
      logFeatureBad("poll_event_delivery", "group_refused");
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `poll event rejected: a group holds 1 to ${MAX_POLL_EVENTS_PER_BATCH} events, none of them wake: false`,
        "poll event rejected: group shape",
      );
    }
    let groupId = randomUUID();
    let mapped = requests.map((request) => buildPollEventCommand(request, groupId));
    let reduced = mapped.reduce(
      (acc, { command }) => acc + Buffer.byteLength(command.pollEvent?.envelope ?? "", "utf8"),
      0,
    );
    if (reduced > MAX_POLL_EVENT_BATCH_BYTES) {
      logFeatureBad("poll_event_delivery", "group_too_large");
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `poll event rejected: the group is ${reduced} bytes after nonce stamping (cap ${MAX_POLL_EVENT_BATCH_BYTES})`,
        "poll event rejected: group too large",
      );
    }
    let reduced_2 = requests.reduce(
      (acc, request) => acc + (request.declared === undefined ? 0 : eventByteLength(request.declared.fields)),
      0,
    );
    if (reduced_2 > MAX_POLL_EVENT_BATCH_BYTES) {
      logFeatureBad("poll_event_delivery", "group_too_large");
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `poll event rejected: the group's fields are ${reduced_2} bytes as sent (cap ${MAX_POLL_EVENT_BATCH_BYTES})`,
        "poll event rejected: group too large",
      );
    }
    commands.push(...mapped.map(({ command }) => command));
    emitQueueChanged();
    for (let { command } of mapped) recordQueueOperation("enqueue", command.pollEvent?.envelope);
    await Promise.all(mapped.map(({ delivered }) => delivered));
  }
  function assertPollEventCapacity(incomingCount) {
    let queuedCount = countWhere(commands, isPollEventMode);
    if (queuedCount + incomingCount > POLL_KIND_DEFAULT_TIMEOUT_MS) {
      logFeatureBad("poll_event_delivery", "queue_cap");
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        incomingCount === 1
          ? `poll event rejected: ${POLL_KIND_DEFAULT_TIMEOUT_MS} events already queued`
          : `poll event rejected: the queue holds at most ${POLL_KIND_DEFAULT_TIMEOUT_MS} events (${queuedCount} queued, ${incomingCount} arriving)`,
        "poll event rejected: queue depth cap",
      );
    }
  }
  function buildPollEventCommand(event, groupId) {
    if (!isValidPollEventKind(event.kind)) {
      logFeatureBad("poll_event_delivery", "invalid_kind");
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "poll event rejected: invalid kind (a lowercase letter, then lowercase letters, digits and hyphens, at most 64 characters)",
        "poll event rejected: invalid kind",
      );
    }
    if (mentionsReservedKind(event.kind) && event.allowReservedKind !== true) {
      logFeatureBad("poll_event_delivery", "reserved_kind");
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `poll event rejected: kind "${event.kind}" is reserved for a trusted in-process producer`,
        "poll event rejected: reserved kind",
      );
    }
    if (codeModeAccepted()) {
      let found = [
        ["following", "following_refused"],
        ["displayRows", "display_rows_refused"],
        ["media", "media_refused"],
        ["passive", "passive_refused"],
        ["replToolUseId", "repl_tool_use_id_refused"],
        ["keepsRow", "keeps_row_refused"],
        ["startsTurn", "starts_turn_refused"],
      ].find(([field]) => event[field] !== undefined);
      if (
        found !== undefined &&
        !(event.allowReservedKind === true && event.kind === EVAL_SETTLE_EVENT_KIND)
      ) {
        let [fieldName, eventName] = found;
        logFeatureBad("poll_event_delivery", eventName);
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `poll event rejected: only an in-process REPL eval-settle event (kind '${EVAL_SETTLE_EVENT_KIND}', allowReservedKind) may set the '${fieldName}' field`,
          "poll event rejected: a settle-only field set on a non-settle event",
        );
      }
      if (
        event.agentId !== undefined &&
        !(
          event.allowReservedKind === true &&
          (event.kind === EVAL_SETTLE_EVENT_KIND || event.kind === REPL_STATUS_EVENT_KIND)
        )
      ) {
        logFeatureBad("poll_event_delivery", "agent_id_refused");
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "poll event rejected: only an in-process REPL result or status event (allowReservedKind) may set the 'agentId' field",
          "poll event rejected: a subagent address on a non-REPL event",
        );
      }
    }
    let envelope;
    let kind = "element";
    let declaredFields;
    if (event.element !== undefined) {
      if (event.content !== undefined || event.declared !== undefined)
        throw Error("poll event: pass one of content, element, declared");
      let byteLength = Buffer.byteLength(event.element, "utf8");
      if (byteLength > pollEventMaxEnvelopeBytes(event.kind)) {
        logFeatureBad("poll_event_delivery", "envelope_too_large");
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `poll event rejected: envelope is ${byteLength} bytes (cap ${pollEventMaxEnvelopeBytes(event.kind)})`,
          "poll event rejected: envelope too large",
        );
      }
      let pollEventEnvelope = parsePollEventEnvelope(event.element);
      if (!pollEventEnvelope.ok) {
        logFeatureBad("poll_event_delivery", "validation_failed");
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `poll event rejected: ${pollEventEnvelope.reason}`,
          "poll event rejected: element failed validation",
        );
      }
      if (pollEventEnvelope.kind !== event.kind) {
        logFeatureBad("poll_event_delivery", "kind_mismatch");
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `poll event rejected: element kind "${pollEventEnvelope.kind}" does not match declared kind "${event.kind}"`,
          "poll event rejected: kind mismatch",
        );
      }
      envelope = event.element;
    } else if (event.declared !== undefined) {
      if (event.content !== undefined) throw Error("poll event: pass one of content, element, declared");
      let pollEventEnvelope = buildPollEventEnvelope(event.declared);
      if (!pollEventEnvelope.ok || event.declared.declaration.kind !== event.kind) {
        logFeatureBad("poll_event_delivery", "fields_invalid");
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `poll event rejected: ${pollEventEnvelope.ok ? "declaration is for another kind" : pollEventEnvelope.reason}`,
          "poll event rejected: fields failed validation",
        );
      }
      envelope = pollEventEnvelope.envelope;
      kind = "json";
      declaredFields = {
        at: event.declared.at,
        fields: pollEventEnvelope.fields,
      };
    } else if (event.content !== undefined)
      envelope = validatePollEvent({
        kind: event.kind,
        at: new Date().toISOString(),
        content: event.content,
      });
    else throw Error("poll event: content, element or declared is required");
    let nonce = randomEventNonce();
    envelope = withEventNonce(envelope, nonce, kind);
    let stampedLength = Buffer.byteLength(envelope, "utf8");
    if (stampedLength > pollEventMaxEnvelopeBytes(event.kind)) {
      logFeatureBad("poll_event_delivery", "envelope_too_large");
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `poll event rejected: envelope is ${stampedLength} bytes after nonce stamping (cap ${pollEventMaxEnvelopeBytes(event.kind)})`,
        "poll event rejected: envelope too large",
      );
    }
    let wake = event.wake ?? true;
    let settleDelivered;
    let settleDropped;
    let delivered = new Promise((resolve, reject) => {
      settleDelivered = resolve;
      settleDropped = reject;
    });
    return {
      command: {
        value: envelope,
        mode: "poll-event",
        agentId: codeModeAccepted() && event.agentId !== undefined ? event.agentId : mainAgentId(),
        priority: wake ? "next" : "later",
        uuid: randomUUID(),
        isMeta: true,
        ...(codeModeAccepted() &&
          event.passive === true && {
            passive: true,
          }),
        timestamp: new Date().toISOString(),
        pollEvent: {
          kind: event.kind,
          envelope,
          toolsUsed: getConversationToolsUsed().names(),
          ...(codeModeAccepted() && {
            nonce,
          }),
          ...(event.media !== undefined &&
            event.media.length > 0 && {
              media: event.media,
            }),
          ...(codeModeAccepted() &&
            event.replToolUseId !== undefined && {
              replToolUseId: event.replToolUseId,
            }),
          ...(codeModeAccepted() &&
            event.displayRows !== undefined &&
            event.displayRows.length > 0 && {
              displayRows: event.displayRows,
            }),
          ...(codeModeAccepted() &&
            event.keepsRow === true && {
              keepsRow: true,
            }),
          wake,
          ...(codeModeAccepted() &&
            event.startsTurn === false && {
              startsTurn: false,
            }),
          ...(codeModeAccepted() &&
            event.following !== undefined && {
              following: event.following,
            }),
          settleDelivered,
          settleDropped,
          provenance: event.provenance,
          ...(declaredFields !== undefined && {
            declared: declaredFields,
          }),
          ...(groupId !== undefined && {
            group: groupId,
          }),
        },
      },
      delivered,
    };
  }
  function drainPollEventChunk(agentId) {
    let entries = commands.filter((command) => isPollEventForAgent(command, agentId));
    if (entries.length === 0)
      return {
        commands: [],
        remainingWakeCount: 0,
      };
    let pollEventBatch = selectPollEventBatch(entries);
    let selected = new Set(pollEventBatch);
    let filtered = commands.filter((command) => !selected.has(command));
    commands.length = 0;
    commands.push(...filtered);
    emitQueueChanged();
    for (let command of selected) if (!command.unlogged) recordQueueOperation("dequeue");
    return {
      commands: pollEventBatch,
      remainingWakeCount: countPendingWakePollEvents(agentId),
    };
  }
  let activePollCalls = new Set();
  function tryBeginPollCall(callId) {
    if (activePollCalls.has(callId)) return false;
    activePollCalls.add(callId);
    return true;
  }
  function endPollCall(callId) {
    activePollCalls.delete(callId);
  }
  let pollEventAdmissions = 0;
  function beginPollEventAdmission() {
    pollEventAdmissions++;
  }
  function endPollEventAdmission() {
    if (pollEventAdmissions === 0) return;
    pollEventAdmissions--;
    if (pollEventAdmissions === 0)
      try {
        signal.emit();
      } catch (error) {
        if (isAbortError(error)) logForDebugging(`queueChanged listener aborted: ${error}`);
        else logError(error);
      }
  }
  function pollEventAdmissionsPending() {
    return pollEventAdmissions;
  }
  function countRemainingWakePollEventsAfter(chunkCommands) {
    let agentId = chunkCommands.find(isPollEventMode)?.agentId;
    let consumedWakeCount = countWhere(chunkCommands, (command) => command.pollEvent?.wake === true);
    return Math.max(
      0,
      countWhere(
        commands,
        (command) =>
          command.mode === "poll-event" &&
          command.agentId === (agentId ?? mainAgentId()) &&
          command.pollEvent?.wake === true,
      ) - consumedWakeCount,
    );
  }
  function countPendingWakePollEvents(agentId) {
    return countWhere(
      commands,
      (command) => isPollEventForAgent(command, agentId) && command.pollEvent?.wake === true,
    );
  }
  function dequeue(predicate) {
    if (commands.length === 0) return;
    let bestIndex = -1;
    let bestPriority = 1 / 0;
    for (let idx = 0; idx < commands.length; idx++) {
      let command = commands[idx];
      if (predicate && !predicate(command)) continue;
      let priorityValue = PRIORITY_ORDER[command.priority ?? "next"];
      if (priorityValue < bestPriority) {
        bestIndex = idx;
        bestPriority = priorityValue;
      }
    }
    if (bestIndex === -1) return;
    let [dequeued] = commands.splice(bestIndex, 1);
    emitQueueChanged();
    if (!dequeued.unlogged) recordQueueOperation("dequeue");
    return dequeued;
  }
  function dequeueAll() {
    if (commands.length === 0) return [];
    let dequeued = [...commands];
    commands.length = 0;
    emitQueueChanged();
    for (let command of dequeued) if (!command.unlogged) recordQueueOperation("dequeue");
    return dequeued;
  }
  function peek(predicate) {
    if (commands.length === 0) return;
    let bestIndex = -1;
    let bestPriority = 1 / 0;
    for (let idx = 0; idx < commands.length; idx++) {
      let command = commands[idx];
      if (predicate && !predicate(command)) continue;
      let priorityValue = PRIORITY_ORDER[command.priority ?? "next"];
      if (priorityValue < bestPriority) {
        bestIndex = idx;
        bestPriority = priorityValue;
      }
    }
    if (bestIndex === -1) return;
    return commands[bestIndex];
  }
  function dequeueAllMatching(predicate) {
    let matched = [];
    let rest = [];
    for (let command of commands)
      if (predicate(command)) matched.push(command);
      else rest.push(command);
    if (matched.length === 0) return [];
    commands.length = 0;
    commands.push(...rest);
    emitQueueChanged();
    for (let command of matched) if (!command.unlogged) recordQueueOperation("dequeue");
    return matched;
  }
  function remove(commands, options) {
    removeCommands((command) => commands.includes(command), queueSignals.commandsDiscarded, options?.reason);
  }
  let now = options?.now ?? (() => Math.max(performance.timeOrigin + performance.now(), Date.now()));
  let requeueWindow;
  let putBackUuids = new Set();
  let discardedTaskIds = new Set();
  function consume(commands, options) {
    let consumed = removeCommands(
      (command) => commands.includes(command),
      queueSignals.commandsConsumed,
      options.reason,
    );
    if (options.reason === "absorbed_mid_turn")
      for (let command of consumed) {
        if (command.mode !== "prompt" || !isMainAgentCommand(command)) continue;
        let { uuid } = command;
        let requeueIfInterruptedWithinMs =
          uuid !== undefined &&
          command.shouldQuery !== false &&
          command.passive !== true &&
          !cancelPending.has(uuid)
            ? command.requeueIfInterruptedWithinMs
            : undefined;
        if (requeueIfInterruptedWithinMs !== undefined || requeueWindow !== undefined)
          requeueWindow = {
            uuid,
            cmd: command,
            withinMs: requeueIfInterruptedWithinMs,
            until: undefined,
          };
      }
  }
  function startRequeueWindow() {
    if (requeueWindow?.withinMs !== undefined) requeueWindow.until ??= now() + requeueWindow.withinMs;
  }
  function settleTaken({ turnEnded = false } = {}) {
    requeueWindow = undefined;
    if (turnEnded) putBackUuids.clear();
  }
  function forgoRequeue(uuid) {
    if (requeueWindow?.uuid === uuid) requeueWindow.withinMs = undefined;
    for (let command of commands) if (command.uuid === uuid) delete command.requeueIfInterruptedWithinMs;
  }
  function requeueTaken() {
    let interruptedCommand = requeueWindow;
    requeueWindow = undefined;
    if (
      interruptedCommand?.uuid === undefined ||
      interruptedCommand.withinMs === undefined ||
      (interruptedCommand.until !== undefined && now() > interruptedCommand.until)
    )
      return;
    let { requeueIfInterruptedWithinMs, promptSubmitted, attachmentSourceUuid, deliveryId, ...commandRest } =
      interruptedCommand.cmd;
    putBackUuids.add(interruptedCommand.uuid);
    foldInFlight.delete(interruptedCommand.uuid);
    try {
      enqueueReportingAdmission(
        {
          ...commandRest,
          drainOnly: true,
          runsAlone: true,
          admissionExempt: "resurrected",
          ...(promptSubmitted !== undefined && {
            screeningOwed: true,
          }),
        },
        {
          ahead: true,
        },
      );
    } catch (error) {
      logError(error);
    }
    return interruptedCommand.cmd;
  }
  function wasPutBack(uuid) {
    return putBackUuids.has(uuid);
  }
  function foldCopyFate(uuid) {
    if (putBackUuids.has(uuid)) return "drop";
    if (
      foldInFlight.has(uuid) &&
      commands.some((command) => command.uuid === uuid && command.requeueIfInterruptedWithinMs !== undefined)
    )
      return "wait";
    return requeueWindow?.uuid === uuid &&
      requeueWindow.withinMs !== undefined &&
      (requeueWindow.until === undefined || now() <= requeueWindow.until)
      ? "wait"
      : "keep";
  }
  function foldCopyWritten(uuid) {
    if (requeueWindow?.uuid === uuid || foldInFlight.has(uuid)) forgoRequeue(uuid);
  }
  function requeueWindowLeftMs() {
    return requeueWindow?.withinMs !== undefined &&
      requeueWindow.until !== undefined &&
      now() <= requeueWindow.until
      ? requeueWindow.until - now()
      : undefined;
  }
  function removeByFilter(predicate, options) {
    return removeCommands(predicate, queueSignals.commandsDiscarded, options?.reason);
  }
  function emitDiscarded(commands) {
    for (let { mode, taskId } of commands)
      if (mode === "task-notification" && taskId !== undefined) discardedTaskIds.add(taskId);
    settleReceiptsForMessages(commands);
    queueSignals.commandsDiscarded.emit(commands);
  }
  function takeDiscardedNotice(taskId) {
    return discardedTaskIds.delete(taskId);
  }
  function removeCommands(predicate, removedSignal, reason) {
    let removed = [];
    for (let idx = commands.length - 1; idx >= 0; idx--)
      if (predicate(commands[idx])) removed.unshift(commands.splice(idx, 1)[0]);
    if (removed.length > 0) {
      emitQueueChanged();
      try {
        signal_2.emit();
      } catch (error) {
        if (isAbortError(error)) logForDebugging(`commandsRemoved listener aborted: ${error}`);
        else logError(error);
      }
      for (let command of removed) {
        if (command.unlogged || command.screeningPending === true) continue;
        recordQueueOperation(
          "remove",
          reason === "dropped_by_hook" ? undefined : queueRecordText(command),
          reason,
          command.attachmentSourceUuid ?? command.uuid,
          command.deliveryId,
          queuedUnderPlugins(command),
        );
      }
      if (reason === "cleared_on_cancel" || reason === "dropped_by_hook")
        logDeliveryFailureForEndings(removed, reason);
      if (removedSignal === queueSignals.commandsDiscarded) emitDiscarded(removed);
      else removedSignal.emit(removed);
    }
    return removed;
  }
  function clearCommandQueue(options) {
    if (commands.length === 0) return [];
    let keep = options?.keep;
    let toDrop = keep ? commands.filter((command) => !keep(command)) : commands;
    if (toDrop.length === 0) return [];
    let countByMode = groupByToObject(toDrop, (command) => command.mode);
    logForDebugging(
      `[clearCommandQueue] dropping ${toDrop.length} queued command(s): ${Object.entries(countByMode)
        .map(([key, value]) => `${key}=${value.length}`)
        .join(" ")}`,
      {
        level: "warn",
      },
    );
    discardPollEvent(toDrop.filter(isPollEventMode), "queue cleared");
    return removeByFilter(keep ? (command) => !keep(command) : () => true, options);
  }
  function resetCommandQueue() {
    commands.length = 0;
    snapshot = Object.freeze([]);
    activePollCalls.clear();
    cancelPending.clear();
    cancelPendingAcked.clear();
    foldInFlight.clear();
    midTurnFoldSuspended = false;
    turnStartFoldTarget = undefined;
    hold = undefined;
    requeueWindow = undefined;
    putBackUuids.clear();
    discardedTaskIds.clear();
    resetPeerGuard();
    clearInFlightDrainBatch();
    inFlightSubmissions.clear();
  }
  function claimPasteIds(commands, editorText, editorPastes) {
    let mapped = commands.map((command) => ({
      text: restoreTextForPop(command),
      entries: collectPastedContentsForPop(command),
    }));
    function findReferencedPasteIds(text, knownIds) {
      let referencedIds = new Set();
      for (let pasteRef of parsePastedRefs(text))
        if (isValidPasteId(pasteRef.id) && !knownIds.has(pasteRef.id)) referencedIds.add(pasteRef.id);
      return referencedIds;
    }
    let referencedByOthers = [
      findReferencedPasteIds(editorText, new Set(Object.keys(editorPastes).map(Number))),
      ...mapped.map((command) =>
        findReferencedPasteIds(command.text, new Set(command.entries.map((entry) => entry.id))),
      ),
    ];
    return mapped.map((command, commandIndex) => {
      let foreignIds = new Set();
      referencedByOthers.forEach((ids, groupIndex) => {
        if (groupIndex !== commandIndex + 1) for (let pasteId of ids) foreignIds.add(pasteId);
      });
      let text = command.text;
      let entries = command.entries.map((entry) => {
        if (entry.type !== "text" || !foreignIds.has(entry.id)) return entry;
        let freshPasteId = mintPasteId(editorText, editorPastes);
        text = expandPastedTextRefs_2(text, entry.id, freshPasteId, "text");
        return {
          ...entry,
          id: freshPasteId,
        };
      });
      return {
        text,
        entries,
      };
    });
  }
  function popAllEditableCommands(editorText, cursorOffset, pastes = {}) {
    if (commands.length === 0) return;
    let isEditorEmpty = editorText === "";
    let filtered = commands.filter((command) => isQueuedCommandPullableInto(command, isEditorEmpty));
    if (filtered.length === 0) return;
    let mode = filtered.every((command) => command.mode === "bash") ? "bash" : "prompt";
    let poppedCommands = mode === "bash" ? filtered : filtered.filter((command) => command.mode !== "bash");
    let claimed = claimPasteIds(poppedCommands, editorText, pastes);
    let mapped = claimed.map((entry, entryIndex) =>
      popAllEditable(entry.text, poppedCommands[entryIndex].value, editorText, pastes),
    );
    let { text, cursorOffset: cursorOffset_2 } = joinWithCursor(
      mapped.map((popped) => popped.text).filter(Boolean).join(`
`),
      editorText,
      cursorOffset,
    );
    let images = [];
    for (let [commandIndex, claimedEntry] of claimed.entries())
      images.push(...claimedEntry.entries, ...mapped[commandIndex].images);
    for (let command of poppedCommands) {
      if (command.unlogged || command.screeningPending === true) continue;
      recordEnqueue("popAll", command);
    }
    let poppedSet = new Set(poppedCommands);
    let filtered_2 = commands.filter((command) => !poppedSet.has(command));
    commands.length = 0;
    commands.push(...filtered_2);
    emitQueueChanged();
    emitDiscarded(poppedCommands);
    return {
      text,
      cursorOffset: cursorOffset_2,
      images,
      mode,
      ideSelection:
        poppedCommands.find((command) => command.ideSelection?.text)?.ideSelection ??
        poppedCommands.find((command) => command.ideSelection !== undefined)?.ideSelection,
      unpassed: poppedCommands.some(hasUnpassedScreening),
    };
  }
  function popEditableAt(index, editorText, cursorOffset, pastes = {}) {
    let command = commands.filter(isQueuedCommandEditable)[index];
    if (!command) return;
    if (!isQueuedCommandPullableInto(command, editorText === "")) return;
    let [claimed] = claimPasteIds([command], editorText, pastes);
    let { text, entries } = claimed;
    let popped = popAllEditable(text, command.value, editorText, pastes);
    let { text: text_2, cursorOffset: cursorOffset_2 } = joinWithCursor(
      popped.text,
      editorText,
      cursorOffset,
    );
    let images = entries;
    images.push(...popped.images);
    if (!command.unlogged && command.screeningPending !== true) recordEnqueue("popOne", command);
    let index_2 = commands.indexOf(command);
    if (index_2 !== -1) {
      commands.splice(index_2, 1);
      emitQueueChanged();
      emitDiscarded([command]);
    }
    return {
      text: text_2,
      cursorOffset: cursorOffset_2,
      images,
      mode: command.mode === "bash" ? "bash" : "prompt",
      ideSelection: command.ideSelection,
      unpassed: hasUnpassedScreening(command),
    };
  }
  function getCommandsByMaxPriority(maxPriority) {
    let maxOrder = PRIORITY_ORDER[maxPriority];
    return commands.filter((command) => PRIORITY_ORDER[command.priority ?? "next"] <= maxOrder);
  }
  function setTurnStartFoldTarget(target) {
    turnStartFoldTarget = target;
  }
  function getTurnStartFoldCommands(includeLater) {
    return commands.filter(
      (command) =>
        PRIORITY_ORDER[command.priority ?? "next"] <= PRIORITY_ORDER.next ||
        (command === turnStartFoldTarget && !includeLater),
    );
  }
  return {
    subscribe: signal.subscribe,
    subscribeToRemovals: signal_2.subscribe,
    getCommandQueueSnapshot,
    getCommandQueue,
    getCommandQueueLength,
    getMainThreadQueueLength,
    getDrainableMainThreadQueueLength,
    ...{
      setPassive(predicate, on) {
        let changed = 0;
        for (let command of commands) {
          if (!predicate(command) || (command.passive === true) === on) continue;
          if (on) command.passive = true;
          else delete command.passive;
          changed++;
        }
        if (changed > 0) emitQueueChanged();
        return changed;
      },
    },
    getQueuedPeerMessageCount,
    emitDiscarded,
    takeDiscardedNotice,
    hasCommandsInQueue,
    recheckCommandQueue,
    enqueue,
    enqueueReportingAdmission,
    flushPeerDropReceipts,
    enqueuePendingNotification,
    holdBack,
    letHeldBackGo,
    enqueuePollEvent,
    enqueuePollEventGroup,
    drainPollEventChunk,
    countPendingWakePollEvents,
    countRemainingWakePollEventsAfter,
    hasUserIntentCommandsInQueue,
    tryBeginPollCall,
    endPollCall,
    beginPollEventAdmission,
    endPollEventAdmission,
    pollEventAdmissionsPending,
    dequeue,
    dequeueAll,
    peek,
    dequeueAllMatching,
    remove,
    consume,
    startRequeueWindow,
    settleTaken,
    forgoRequeue,
    requeueTaken,
    wasPutBack,
    foldCopyFate,
    foldCopyWritten,
    requeueWindowLeftMs,
    removeByFilter,
    clearCommandQueue,
    resetCommandQueue,
    popAllEditable: popAllEditableCommands,
    popEditableAt,
    getCommandsByMaxPriority,
    setTurnStartFoldTarget,
    getTurnStartFoldCommands,
    markCancelPending,
    consumeCancelPending,
    consumeCancelPendingAcked,
    hasCancelPendingAcked,
    registerFoldInFlight,
    unregisterFoldInFlight,
    isFoldInFlight,
    beginInboundIngest,
    withdrawInboundIngest,
    suspendMidTurnFold,
    isMidTurnFoldSuspended,
    settleScreening,
    settleSurfaced,
    typedHandedBack: signal_3,
    handTypedBack,
    promoteToNow,
    demoteFromNow,
    setInFlightDrainBatch,
    clearInFlightDrainBatch,
    someInFlightDrainCommand,
    trackSubmission,
    someSubmissionInFlight,
    noteTurnAppended,
    getInFlightDrainBatchStanding,
    takeInboundEnqueueTurn,
  };
}
//@ chunk-5xgkngpb.js:584563-584612 placement
var sessionCommandQueueSlot; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:584563", () => {
  sessionCommandQueueSlot = new SessionRootSlot(() => ({
    queue: createMessageQueue(),
    installed: false,
  }));
});
//@ chunk-5xgkngpb.js:584612-584646 placement
function currentSessionQueueState() {
  return sessionCommandQueueSlot.of(getRootSession());
}
//@ chunk-5xgkngpb.js:584646-584799 placement
function installProcessQueue(options) {
  let state = currentSessionQueueState();
  if (state.installed) return state.queue;
  let queue = state.queue;
  let installedQueue = options(queue.getCommandQueue());
  queue.resetCommandQueue();
  state.queue = installedQueue;
  state.installed = true;
  return installedQueue;
}
//@ chunk-5xgkngpb.js:584799-584832 placement
/**
 * 取当前会话的消息队列管理器。
 */
function getProcessQueue() {
  return currentSessionQueueState().queue;
}
//@ chunk-5xgkngpb.js:584832-584900 placement
/**
 * 宿主隔离的"回执已入队/正在排空"探测函数槽。
 */
var entryHold; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var heldByHold;
deferInit("chunk-5xgkngpb.js:584832", () => {
  entryHold = identity_2(createValueSlot(), (probeSlot) => probeSlot.set(undefined));
  heldByHold = identity_2(createValueSlot(), (probeSlot) => probeSlot.set(undefined));
});
//@ chunk-5xgkngpb.js:584900-584942 placement
/**
 * 判断是否正在折叠队列。
 */
var isFoldInFlight = (...commandArgs) => getProcessQueue().isFoldInFlight(...commandArgs);
//@ chunk-5xgkngpb.js:584942-585031 placement
/**
 * 取命令队列快照与完整队列。
 */
var getCommandQueueSnapshot = (...commandArgs) => getProcessQueue().getCommandQueueSnapshot(...commandArgs);
var getCommandQueue = (...commandArgs) => getProcessQueue().getCommandQueue(...commandArgs);
//@ chunk-5xgkngpb.js:585031-585083 placement
/**
 * 取主线程队列长度。
 */
var getMainThreadQueueLength = (...commandArgs) => getProcessQueue().getMainThreadQueueLength(...commandArgs);
//@ chunk-5xgkngpb.js:585083-585124 placement
/**
 * 上报命令被丢弃。
 */
var discardUnqueued = (...commandArgs) => getProcessQueue().emitDiscarded(...commandArgs);
//@ chunk-5xgkngpb.js:585124-585191 placement
/**
 * 判断队列中是否存在可回填的主 agent 命令。
 */
function hasEditableMainThreadCommand(commands) {
  return commands
    .getCommandQueue()
    .some((command) => isMainAgentCommand(command) && isQueuedCommandEditable(command));
}
//@ chunk-5xgkngpb.js:585191-585256 placement
/**
 * 判断队列中是否有带模式字符的命令。
 */
function hasPullableCommandInQueue(store, modeChar) {
  return store.getCommandQueue().some((command) => isQueuedCommandPullableInto(command, modeChar));
}
//@ chunk-5xgkngpb.js:585256-585373 placement
function isTaskNotificationQueuedFor(agentId, taskId) {
  return getProcessQueue()
    .getCommandQueue()
    .some(
      (command) =>
        command.mode === "task-notification" && command.agentId === agentId && command.taskId === taskId,
    );
}
//@ chunk-5xgkngpb.js:585373-585510 placement
function isWakingNotificationQueuedFor(recipientAgentId, taskId) {
  return getProcessQueue()
    .getCommandQueue()
    .some(
      (command) =>
        command.mode === "task-notification" &&
        command.agentId === recipientAgentId &&
        command.taskId === taskId &&
        command.shouldQuery !== false,
    );
}
//@ chunk-5xgkngpb.js:585510-585813 placement
/**
 * 消息队列管理器各方法的转发函数（取丢弃通知、重查命令队列、入队等）。
 */
var takeDiscardedNotice = (...args) => getProcessQueue().takeDiscardedNotice(...args);
var recheckCommandQueue = (...args) => getProcessQueue().recheckCommandQueue(...args);
var enqueue = (...args) => getProcessQueue().enqueue(...args);
var enqueueReportingAdmission = (...args) => getProcessQueue().enqueueReportingAdmission(...args);
var flushPeerDropReceipts = (...args) => getProcessQueue().flushPeerDropReceipts(...args);
var enqueuePollEvent = (...args) => getProcessQueue().enqueuePollEvent(...args);
var enqueuePendingNotification = (...args) => getProcessQueue().enqueuePendingNotification(...args);
//@ chunk-5xgkngpb.js:585813-585887 placement
/**
 * 查看队首命令与按条件批量出队。
 */
var peek = (...args) => getProcessQueue().peek(...args);
var dequeueAllMatching = (...args) => getProcessQueue().dequeueAllMatching(...args);
//@ chunk-5xgkngpb.js:585887-585928 placement
/**
 * 按过滤条件移除排队命令。
 */
var removeByFilter = (...args) => getProcessQueue().removeByFilter(...args);
//@ chunk-5xgkngpb.js:585928-585980 placement
/**
 * 判断是否有正在排空的命令。
 */
var someInFlightDrainCommand = (...args) => getProcessQueue().someInFlightDrainCommand(...args);
//@ chunk-5xgkngpb.js:585980-586248 placement
// deferred: uses setQueueInstaller of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-5xgkngpb.js:585980", () => {
  setQueueInstaller((commandName, origin, discardWatch) => {
    let commandUuid = discardWatch === undefined ? undefined : randomUUID();
    enqueue({
      agentId: mainAgentId(),
      mode: "prompt",
      value: `/${commandName}`,
      origin,
      uuid: commandUuid,
    });
    if (discardWatch === undefined || discardWatch.until.aborted) return;
    let unsubscribe = commandsDiscarded.subscribe((discarded) => {
      if (discarded.some((command) => command.uuid === commandUuid)) {
        unsubscribe();
        discardWatch.onDiscarded();
      }
    });
    discardWatch.until.addEventListener("abort", unsubscribe, {
      once: true,
    });
  });
});
//@ chunk-w3ch4xq2.js:85621-85921 sole-consumer
/**
 * 把带 ✓/○ 等符号的清单文本解析为 header 与 items（最多 32 条）。
 */
function parseChecklistText(text) {
  let mapped = text
    .split(
      `
`,
    )
    .map((line) =>
      stripAnsi(line)
        .slice(0, MAX_CHECKLIST_LINE_CHARS)
        .trim()
        .replace(/^(\*{1,2})(.+?)\1$/, "$2"),
    );
  let firstLine = mapped[0] ?? "";
  return {
    header: firstLine !== "" && !CHECKLIST_MARKER_STATUS.has(firstLine.charAt(0)) ? firstLine : null,
    items: mapped
      .flatMap((line) => {
        let status = CHECKLIST_MARKER_STATUS.get(line.charAt(0));
        let trimmed = line.slice(1).trim();
        return status !== undefined && trimmed !== ""
          ? [
              {
                content: trimmed,
                status,
              },
            ]
          : [];
      })
      .slice(0, MAX_CHECKLIST_LINES),
  };
}
//@ chunk-w3ch4xq2.js:85921-86251 placement
/**
 * 协调者内部工具名列表。
 */
var COORDINATOR_TOOL_NAMES; // deferred: uses NO_REPLY_SUFFIX (../bridge/projectsReplyEvaluation.js) of its import cycle while loading; runs once the cycle is complete
var COORDINATOR_TOOL_SUFFIXES;
var mapped;
var mapped_2;
var REPORTING_NOTIFICATION_ORIGINS;
var TOOL_RESULT_NOTIFICATIONS_SCHEMA;
var REPORTING_WINDOW_MS;
deferInit("chunk-w3ch4xq2.js:85921", () => {
  COORDINATOR_TOOL_NAMES = aliasCanonicalNames(["update_status"]).map((name) => `__${name}`);
  COORDINATOR_TOOL_SUFFIXES = [NO_REPLY_SUFFIX, "__react", "__message_coordinator", "__message_thread"];
  mapped = aliasCanonicalNames(["ask_decision"]).map((name) => `__${name}`);
  mapped_2 = aliasCanonicalNames(["close_decision", "set_thread_resolved"]).map((name) => `__${name}`);
  REPORTING_NOTIFICATION_ORIGINS = new Set(["github_webhook", "trigger_fire"]);
  TOOL_RESULT_NOTIFICATIONS_SCHEMA = DoctorLazy(() =>
    objectSchema({
      notifications: array(
        objectSchema({
          origin: stringSchema(),
        }),
      ),
    }),
  );
  REPORTING_WINDOW_MS = 259200000;
});
//@ chunk-w3ch4xq2.js:86251-86508 placement
/**
 * 找出最近一次"已展示但未读"的出错工具行 id（供分类器提示）。
 */
function shownErroredToolRowId(messages) {
  if (!isGracefulCakeEnabled()) return;
  try {
    let recentErroredTools = findRecentErroredTools(messages);
    return recentErroredTools?.shown === true &&
      allUserTurnsSatisfy(
        messages.slice(recentErroredTools.row),
        (block, message) =>
          block === undefined &&
          message.type === "user" &&
          message.isMeta === true &&
          message.turnOrigin === undefined,
      )
      ? recentErroredTools.id
      : undefined;
  } catch (error) {
    logForDebugging(`[classifier] shown message not read: ${errorMessage(error)}`, {
      level: "error",
    });
    return;
  }
}
//@ chunk-w3ch4xq2.js:86508-86764 placement
function logOperation(operation, content) {
  if (!isGracefulCakeEnabled()) return false;
  try {
    let recentErroredTools = findRecentErroredTools(content);
    if (
      recentErroredTools?.id !== operation ||
      Date.now() - Date.parse(content[recentErroredTools.row].timestamp) >= REPORTING_WINDOW_MS
    )
      return false;
    let messages = content.slice(recentErroredTools.row);
    return (
      isMachineOnlyTurnRange(messages) &&
      allUserTurnsSatisfy(messages, isAutomatedNotification) &&
      hasOnlyWaitCalls(messages)
    );
  } catch (error) {
    logForDebugging(`[classifier] quiet turn not read: ${errorMessage(error)}`, {
      level: "error",
    });
    return false;
  }
}
//@ chunk-w3ch4xq2.js:86764-86820 placement
function isGracefulCakeEnabled() {
  return hasNoReplyTerminalTool() && getFeatureValue_CACHED_MAY_BE_STALE("tengu_graceful_cake", true);
}
//@ chunk-w3ch4xq2.js:86820-86871 placement
function nameEndsWithAny(name, suffixes) {
  return suffixes.some((suffix) => name.endsWith(suffix));
}
//@ chunk-w3ch4xq2.js:86871-87577 placement
/**
 * 找出最近出错的工具调用。
 */
function findRecentErroredTools(messages) {
  let terminalMcpTools = getTerminalMcpTools();
  let erroredToolIds = new Set();
  for (let message of messages)
    if (message.type === "user" && Array.isArray(message.message.content)) {
      for (let block of message.message.content)
        if (block.type === "tool_result" && block.is_error === true) erroredToolIds.add(block.tool_use_id);
    }
  for (let j = messages.length - 1; j >= 0; j--) {
    let message = messages[j];
    if (message.type !== "assistant") continue;
    for (let block of message.message.content.toReversed()) {
      if (block.type !== "tool_use") continue;
      if (isEvalToolCallName(block.name))
        return {
          row: j,
          id: block.id,
          shown: false,
        };
      if (erroredToolIds.has(block.id)) continue;
      if (nameEndsWithAny(block.name, mapped_2))
        return {
          row: j,
          id: block.id,
          shown: false,
        };
      if (nameEndsWithAny(block.name, mapped))
        return {
          row: j,
          id: block.id,
          shown: true,
        };
      if (!terminalMcpTools.has(block.name) || nameEndsWithAny(block.name, COORDINATOR_TOOL_SUFFIXES))
        continue;
      if (!nameEndsWithAny(block.name, COORDINATOR_TOOL_NAMES))
        return {
          row: j,
          id: block.id,
          shown: true,
        };
      if (
        !parseChecklistText(textFromTaskCreateInput(block) ?? "").items.some(
          (item) => item.status !== "completed",
        )
      )
        return {
          row: j,
          id: block.id,
          shown: false,
        };
    }
  }
  return;
}
//@ chunk-w3ch4xq2.js:87577-88098 placement
/**
 * 是否为自动任务通知（定时触发、会话任务）。
 */
function isAutomatedNotification(origin, message) {
  if (origin !== undefined && origin.kind !== "task-notification") return false;
  if (origin?.subkind === "scheduled-trigger" || origin?.producer === "session-task") return true;
  if (origin?.subkind !== undefined) return false;
  if (
    origin === undefined &&
    message.type === "user" &&
    message.isMeta === true &&
    (message.turnOrigin === undefined || message.turnOrigin === "scheduled")
  )
    return true;
  let text =
    message.type === "user"
      ? getContentText(message.message.content)
      : message.type === "attachment" && message.attachment.type === "queued_command"
        ? getContentText(message.attachment.prompt)
        : null;
  if (text === null) return false;
  let externalEventWake = parseExternalEventWake(text);
  return externalEventWake === null
    ? isGeneratedToolCountSummary(text)
    : !isSessionInboxWake(externalEventWake) &&
        (externalEventWake.from === undefined || externalEventWake.from === "system");
}
//@ chunk-w3ch4xq2.js:88098-88563 placement
/**
 * 回合是否只有等待类调用。
 */
function hasOnlyWaitCalls(messages) {
  let pendingReadIds = new Set();
  for (let message of messages)
    if (message.type === "assistant")
      for (let block of message.message.content) {
        if (block.type !== "tool_use") continue;
        if (block.name === FETCH_INBOX_MESSAGE_TOOL_NAME) return false;
        if (block.name === READNOTIFICATIONS) pendingReadIds.add(block.id);
      }
    else if (message.type === "user" && Array.isArray(message.message.content))
      for (let block of message.message.content) {
        if (block.type !== "tool_result" || !pendingReadIds.delete(block.tool_use_id)) continue;
        let parsed = TOOL_RESULT_NOTIFICATIONS_SCHEMA().safeParse(message.toolUseResult);
        if (
          !parsed.success ||
          !parsed.data.notifications.every((notification) =>
            REPORTING_NOTIFICATION_ORIGINS.has(notification.origin),
          )
        )
          return false;
      }
  return pendingReadIds.size === 0;
}
//@ chunk-w3ch4xq2.js:88669-88741 placement
/**
 * 惰性加载的两个 chunk 模块引用。
 */
var lazyChunkCv3; // deferred: loads other modules while loading; runs once its import cycle is complete
var lazyChunkVsw;
deferInit("chunk-w3ch4xq2.js:88669", () => {
  lazyChunkCv3 = require("../tools/BriefTool/BriefTool.js");
  lazyChunkVsw = require("../tools/BriefTool/prompt.js");
});
//@ chunk-w3ch4xq2.js:88741-88779 placement
/**
 * 取已排队的对等消息数量。
 */
var getQueuedPeerMessageCount; // deferred: loads other modules while loading; runs once its import cycle is complete
deferInit("chunk-w3ch4xq2.js:88741", () => {
  getQueuedPeerMessageCount = require("../bridge/projectsReplyEvaluation.js");
});
//@ chunk-nh1pvp1m.js:43637-43711 fingerprint (2.1.88 match: enqueuePendingNotification, 0.592)
/**
 * 已验证的 Slack 人类消息且优先级为 later。旧版名 enqueuePendingNotification 为错配。
 */
function isSlackLaterNotification(command) {
  return command.verifiedSlackHumanTurn === true && command.priority === "later";
}
//@ chunk-czq1j3j2.js:1700784-1700831 fingerprint (2.1.88 match: snapshot, 0.673)
/**
 * {status:null,next:null}。旧版名 snapshot 为错配。
 */
var EMPTY_LIMIT_NOTICES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1700784", () => {
  EMPTY_LIMIT_NOTICES = Object.freeze({
    status: null,
    next: null,
  });
});
export {
  isTaskNotificationQueuedFor,
  takeDiscardedNotice,
  isWakingNotificationQueuedFor,
  enqueuePendingNotification,
  dequeueAllMatching,
  recheckCommandQueue,
  commandsDiscarded,
  firstSchedulingPlugin,
  isDrainableMainThreadCommand,
  isQueuedUserTurnCommand,
  textNotTypedFlags,
  peek,
  removeByFilter,
  isQueuedUserPrompt,
  filterMidTurnDrainCommands,
  getCommandQueueSnapshot,
  enqueuePollEvent,
  sameSchedulingPlugin,
  isMainAgentCommand,
  isPassiveMainThreadCommand,
  processQueuedCommands,
  isSlashCommand,
  isPollEventWakeInput,
  isPromptCapableMode,
  isBatchHeadHumanCommand,
  commandsConsumed,
  entryHold,
  heldByHold,
  getCommandQueue,
  isQueuedCommandEditable,
  normalizedQueueOrigin,
  shouldSkipQueueAttachments,
  queueInputFlags,
  getProcessQueue,
  installProcessQueue,
  createMessageQueue,
  isTypedAtThisComposer,
  restoreTextForPop,
  collectPastedContentsForPop,
  extractImagesFromValue,
  enqueue,
  isGoalCheckinNotification,
  GOAL_CHECKIN_ORIGIN,
  someInFlightDrainCommand,
  WORKER_CHECKIN_ORIGIN,
  isIdleDrainableMainThreadCommand,
  enqueueReportingAdmission,
  getProcessedQueuedCommands,
  getSchedulingPlugin,
  discardUnqueued,
  isFoldInFlight,
  isCheckinNotification,
  isQueuedCommandPullableInto,
  hasEditableMainThreadCommand,
  isQueuedCommandVisible,
  restorePastedImageContents,
  hasPullableCommandInQueue,
  queuedNotificationMode,
  EMPTY_LIMIT_NOTICES,
  getMainThreadQueueLength,
  flushPeerDropReceipts,
  isSlackLaterNotification,
  midTurnFoldableFor,
  unnameTurnPersonJoined,
  shownErroredToolRowId,
  logOperation,
  lazyChunkCv3,
  lazyChunkVsw,
  getQueuedPeerMessageCount,
};

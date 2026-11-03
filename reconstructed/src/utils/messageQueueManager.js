/**
 * utils/messageQueueManager.ts
 *
 * 命令队列相关：优先级（now/next/later）、队列操作记录、可编辑命令弹回输入框、图片提取；本切片还混入了用量限额提示、权限模式循环与压缩元数据修复等代码（见过程记录）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/messageQueueManager.ts
 * pieces: chunk-0sfjpx19.js (1), chunk-18hwfzwa.js (2), chunk-e6aww6q8.js (73), chunk-ha3km179.js (11)
 * attribution: fingerprint 5, placement 79, layout 1, callgraph-fingerprint 1, sole-consumer 1
 */
import { randomUUID } from "crypto";
import {
  mainAgentId,
  isDiskless,
  onProcessRootHost,
  getSessionId,
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
import { isOwnWordTurn, allUserTurnsSatisfy } from "./turnOrigin.js";
import { logForDebugging } from "./debug.js";
import { recordQueueOperation } from "./sessionStorage.js";
import { dropHopChain } from "./peerMessageHeaders.js";
import { isHumanOrAutoContinuation, isPeerOrSlackPing } from "./messageProvenance.js";
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
  pollEventMaxEnvelopeBytes,
  parsePollEventEnvelope,
  validatePollEvent,
  randomEventNonce,
  withEventNonce,
  isPollEventForAgent,
  discardPollEvent,
} from "./pollEvents.js";
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
import { count } from "./collections.js";
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
import { NO_REPLY_TOOL_SUFFIX } from "../bridge/projectsReplyEvaluation.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, array, string } from "../../vendor/zod/v4/classic/schemas.js";
import { isMachineOnlyTurnRange } from "./messages/messageSource.js";
import { getTerminalMcpTools } from "./transcript/deserialize.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { isExactReplToolName } from "../tools/REPLTool/constants.js";
import { parseExternalEventWake, isSessionInboxWake } from "./externalEventWake.js";
import { isGeneratedToolCountSummary } from "./permissions/yoloClassifier.js";
import { FETCH_INBOX_MESSAGE_TOOL_NAME } from "../tools/FetchInboxMessageTool/prompt.js";
import { READNOTIFICATIONS } from "../tools/ReadNotificationsTool/ReadNotificationsTool.js";

//@ chunk-e6aww6q8.js:193960-194054 placement
/**
 * 判断输入是否为需要唤醒的 poll-event 命令。
 */
function isPollEventWakeInput(e, pollEmptyDispatchStalled, r) {
  return (
    e !== undefined &&
    e.mode === "poll-event" &&
    (e.pollEvent?.wake === true || r) &&
    !pollEmptyDispatchStalled
  );
}
//@ chunk-e6aww6q8.js:194054-194182 placement
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
//@ chunk-e6aww6q8.js:194182-194221 placement
/**
 * 判断命令是否属于主 agent。
 */
function isMainAgentCommand(e) {
  return e.agentId === mainAgentId();
}
//@ chunk-e6aww6q8.js:194221-194278 placement
/**
 * "目标检查"任务通知来源。
 */
var GOAL_CHECKIN_ORIGIN = {
  kind: "task-notification",
  source: "goal-checkin",
};
//@ chunk-e6aww6q8.js:194278-194372 placement
/**
 * 判断来源是否为目标检查通知。
 */
function isGoalCheckinNotification(e) {
  return e.origin?.kind === "task-notification" && e.origin.source === "goal-checkin";
}
//@ chunk-e6aww6q8.js:194372-194431 placement
/**
 * "worker 检查"任务通知来源。
 */
var WORKER_CHECKIN_ORIGIN = {
  kind: "task-notification",
  source: "worker-checkin",
};
//@ chunk-e6aww6q8.js:194431-194598 placement
function isCheckinNotification(e) {
  return (
    e.origin?.kind === "task-notification" &&
    (e.origin.source === "goal-checkin" ||
      e.origin.source === "worker-checkin" ||
      e.origin.source === "shell-checkin")
  );
}
//@ chunk-e6aww6q8.js:194598-194657 placement = processQueuedCommands (1)
function processQueuedCommands(queuedCommands) {
  return isMainAgentCommand(queuedCommands) && queuedCommands.mode === "task-notification";
}
//@ chunk-e6aww6q8.js:194657-194735 placement
/**
 * 归一化队列来源（检查通知做规范来源）。
 */
function normalizedQueueOrigin(e) {
  let n = e.queueOrigin ?? e.origin;
  return isCheckinNotification({
    origin: n,
  })
    ? normalizeTaskNotificationOrigin(n)
    : n;
}
//@ chunk-e6aww6q8.js:194735-194783 placement
/**
 * 取队列中的通知模式（显式 queueMode 或按来源推断）。
 */
function queuedNotificationMode(e) {
  return e.queueMode ?? getQueuedNotificationMode(normalizedQueueOrigin(e));
}
//@ chunk-e6aww6q8.js:194783-194874 placement
/**
 * 判断是否应跳过该队列附件的附加处理。
 */
function shouldSkipQueueAttachments(message) {
  return message.queueSkipAttachments === true || queuedNotificationMode(message) === "task-notification"
    ? true
    : undefined;
}
//@ chunk-e6aww6q8.js:194874-195172 placement
function textNotTypedFlags(e, n) {
  if (!isTextNotTyped(e)) return;
  if ("text_not_typed" in e && e.text_not_typed === true) logFeatureOk("input_text_not_typed");
  else logFeatureSad("input_text_not_typed", "malformed_mark");
  let flattened = (n?.writtenFiles ?? []).flatMap((s) => (s.inlined ? [] : [s.path]));
  return {
    textNotTyped: true,
    skipSlashCommands: true,
    ...(flattened.length > 0 && {
      ownFilePaths: flattened,
    }),
  };
}
//@ chunk-e6aww6q8.js:195172-195424 placement
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
//@ chunk-e6aww6q8.js:195506-195658 placement
function getSchedulingPlugin(e) {
  let { origin } = e;
  let r =
    origin?.kind === "plugin"
      ? origin.name
      : typeof origin === "object" && origin !== null && "plugin" in origin
        ? origin.plugin
        : undefined;
  return e.scheduledByPlugin ?? r;
}
//@ chunk-e6aww6q8.js:195658-195699 placement
/**
 * 判断两条命令是否来自同一调度插件。
 */
function sameSchedulingPlugin(e, n) {
  return getSchedulingPlugin(e) === getSchedulingPlugin(n);
}
//@ chunk-e6aww6q8.js:195699-195774 placement
/**
 * 找出这批命令的调度插件（混合来源时为 undefined）。
 */
function firstSchedulingPlugin(e) {
  return e.some(isOwnWordTurn) ? undefined : e.map(getSchedulingPlugin).find((n) => n !== undefined);
}
//@ chunk-e6aww6q8.js:195774-195858 placement
class QueueInstallerHolder {
  current = null;
  register(e) {
    this.current = e;
  }
  registered() {
    return this.current;
  }
}
//@ chunk-e6aww6q8.js:195858-195874 placement
var queueInstallerSingleton = new QueueInstallerHolder();
//@ chunk-e6aww6q8.js:195874-195906 placement
function setQueueInstaller(e) {
  queueInstallerSingleton.register(e);
}
//@ chunk-e6aww6q8.js:195906-195945 placement
/**
 * 取当前登记的队列安装器。
 */
function getProcessedQueuedCommands() {
  return queueInstallerSingleton.registered();
}
//@ chunk-e6aww6q8.js:552455-552644 fingerprint = PRIORITY_ORDER (0.375)
/**
 * {now:0, next:1, later:2}。
 */
var recordQueueOperation_2 = (e) => {
  if (isDiskless()) {
    logForDebugging(
      `Diskless session: queue operation '${e.operation}' not recorded: the default queue has no storage backend`,
      {
        level: "warn",
      },
    );
    return;
  }
  recordQueueOperation(e);
};
var PRIORITY_ORDER = {
  now: 0,
  next: 1,
  later: 2,
};
//@ chunk-e6aww6q8.js:552644-552709 placement
function isPeerOrigin(origin) {
  return origin?.kind === "peer" && origin.senderTaskId === undefined;
}
//@ chunk-e6aww6q8.js:552709-552979 placement
function dropPeerHopChain(e) {
  if (!isPeerOrigin(e.origin)) return e;
  let n = e.value;
  if (typeof n === "string") {
    let h = dropHopChain(n);
    return h === n
      ? e
      : {
          ...e,
          value: h,
        };
  }
  let r = false;
  let value = n.map((h) => {
    if (h.type !== "text") return h;
    let y = dropHopChain(h.text);
    if (y === h.text) return h;
    r = true;
    return {
      ...h,
      text: y,
    };
  });
  return r
    ? {
        ...e,
        value,
      }
    : e;
}
//@ chunk-e6aww6q8.js:552979-553049 placement
function isVouchedPeerOrigin(origin) {
  return origin.verifiedPeerPid !== undefined || origin.from !== "unknown";
}
//@ chunk-e6aww6q8.js:553049-553101 placement
var NON_EDITABLE_MODES = new Set(["task-notification", "poll-event"]);
//@ chunk-e6aww6q8.js:553101-553135 placement
function isPromptInputModeEditable(mode) {
  return !NON_EDITABLE_MODES.has(mode);
}
//@ chunk-e6aww6q8.js:553135-553216 placement
/**
 * 判断历史条目是否可用于回填输入框（可改写且有字符串值）。
 */
function isReplayableHistoryEntry(e) {
  return e.historyEntry !== undefined && isRefillableInput(e) && typeof e.value === "string";
}
//@ chunk-e6aww6q8.js:553216-553284 placement
/**
 * 判断输入是否可回填（可编辑提示模式、非 meta、人类/自动续写来源）。
 */
function isRefillableInput(e) {
  return (
    isPromptInputModeEditable(e.mode) &&
    !e.isMeta &&
    isHumanOrAutoContinuation(e.origin) &&
    !isPassiveOrAttachedCommand(e)
  );
}
//@ chunk-e6aww6q8.js:553284-553337 placement = prependModeCharacterToInput (1)
function shouldPrependModeChar(input, mode) {
  return isRefillableInput(input) && (mode || input.mode !== "bash");
}
//@ chunk-e6aww6q8.js:553337-553478 placement
function hasPreExpansionText(e) {
  return (
    (e.skipSlashCommands === true || e.pasteTagged === true) &&
    typeof e.preExpansionValue === "string" &&
    e.preExpansionValue.trim() !== ""
  );
}
//@ chunk-e6aww6q8.js:553478-553551 placement
/**
 * 取输入的展示文本（展开前原文优先）。
 */
function inputDisplayText(e) {
  if (hasPreExpansionText(e)) return e.preExpansionValue;
  return extractTextFromValue(e.value);
}
//@ chunk-e6aww6q8.js:553551-553697 placement
function getRetainedPastedContents(e) {
  if (!e.pastedContents) return [];
  let n = hasPreExpansionText(e);
  return Object.values(e.pastedContents).filter(
    (pastedContent) => pastedContent.type === "image" || pastedContent.inline === true || n,
  );
}
//@ chunk-e6aww6q8.js:553697-553872 placement
function isNonHumanQueuedCommand(e, n) {
  let kind = e.origin?.kind;
  if (
    (kind === "task-notification" &&
      !(isSessionTaskNotificationOrigin(e.origin) && isBareTaskNotificationOrigin(e.origin))) ||
    kind === "auto-continuation" ||
    kind === "plugin"
  )
    return true;
  return isNonHumanInboundOrigin(e.origin, n) || isRefillableInput(e);
}
//@ chunk-e6aww6q8.js:553872-553916 placement
/**
 * 判断是否为主 agent 的非被动命令。
 */
function isActiveMainAgentCommand(e) {
  return isMainAgentCommand(e) && e.passive !== true;
}
//@ chunk-e6aww6q8.js:553916-553953 placement
/**
 * 判断该排队命令是否可发送（活跃且未被挂起）。
 */
function isSendableQueuedCommand(e) {
  return isActiveMainAgentCommand(e) && !isPollEventMode(e);
}
//@ chunk-e6aww6q8.js:554106-554154 placement
/**
 * 判断是否为主 agent 的被动命令。
 */
function isPassiveMainAgentCommand(e) {
  return e.passive === true && isMainAgentCommand(e) && true;
}
//@ chunk-e6aww6q8.js:554154-554211 placement = isSlashCommand (1)
function isSlashCommand_2(cmd) {
  return looksLikeSlashInput(cmd.value) && !cmd.skipSlashCommands;
}
//@ chunk-e6aww6q8.js:554211-554290 placement = getValueFromInput (1)
function getValueFromInput(e, isMainThreadQuery) {
  runIgnoringAbort(() => {
    if (isMainThreadQuery && e.some((s) => s.mode === "prompt" && isOwnWordTurn(s))) clearScheduledByPlugin();
  });
}
//@ chunk-e6aww6q8.js:554290-554470 placement
function filterQueuedCommandsForThread(commandsByMaxPriority, { isMainThread, currentAgentId }) {
  let filtered = commandsByMaxPriority.filter((h) => {
    if (isSlashCommand_2(h)) return false;
    if (isMainThread) return isMainAgentCommand(h);
    return (h.mode === "task-notification" || false) && h.agentId === currentAgentId;
  });
  return dedupePollEvents(filtered);
}
//@ chunk-e6aww6q8.js:554470-554577 placement
function createQueueFilterForThread(e) {
  return e.isMainThread
    ? isActiveMainAgentCommand
    : (n) =>
        filterQueuedCommandsForThread([n], {
          isMainThread: false,
          currentAgentId: e.agentId,
        }).length > 0;
}
//@ chunk-e6aww6q8.js:554577-554767 placement
function dedupePollEvents(e) {
  let filtered = e.filter((s) => s.mode === "poll-event");
  if (filtered.length === 0) return e;
  let r = new Set(selectPollEventBatch(filtered));
  if (r.size === filtered.length) return e;
  return e.filter((s) => s.mode !== "poll-event" || r.has(s));
}
//@ chunk-e6aww6q8.js:554767-554815 placement = getValueFromInput (1)
function isPromptModeQueuedCommand(input) {
  return isMainAgentCommand(input) && input.mode === "prompt";
}
//@ chunk-e6aww6q8.js:554815-554844 placement
/**
 * 判断该命令是否尚未通过屏幕检查（可回填）。
 */
function isRefillableCommand(e) {
  return isRefillableInput(e);
}
//@ chunk-e6aww6q8.js:554844-554899 placement
function extractTextFromValue(value) {
  return typeof value === "string"
    ? value
    : extractTextContent_2(
        value,
        `
`,
      );
}
//@ chunk-e6aww6q8.js:554899-555159 fingerprint = extractImagesFromValue (0.858)
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
//@ chunk-e6aww6q8.js:555159-555410 layout
/**
 * 图片块按是否有原 paste id 分成 stamped / manufactured。
 */
function splitStampedImages(e, imagePasteIds) {
  let r = {};
  let s = {};
  e.forEach((h, y) => {
    if (!isBase64ImageBlock_3(h)) return;
    let S = imagePasteIds?.[y];
    let w = S ?? y + 1;
    let mediaType = h.source.media_type;
    let G = S !== undefined ? r : s;
    G[w] = {
      id: w,
      type: "image",
      content: h.source.data,
      mediaType: typeof mediaType === "string" ? mediaType : undefined,
    };
  });
  return {
    stamped: r,
    manufactured: s,
  };
}
//@ chunk-e6aww6q8.js:555410-555554 callgraph-fingerprint = popAllEditable (0.232)
/**
 * 可编辑命令弹回输入框：图片换成 [Image #n] 引用并重新编号。
 */
function popAllEditable(text, n, r, s) {
  let mapped = extractImagesFromValue(n, 0).map((cmd) => ({
    ...cmd,
    id: mintPasteId(r, s),
  }));
  return {
    text: [...mapped.map((cmd) => formatImageRef(cmd.id)), text].filter(Boolean).join(" "),
    images: mapped,
  };
}
//@ chunk-e6aww6q8.js:555554-555706 placement
function joinWithCursor(e, n, r) {
  if (!e)
    return {
      text: n,
      cursorOffset: r,
    };
  if (!n)
    return {
      text: e,
      cursorOffset: e.length + r,
    };
  return {
    text: `${e}
${n}`,
    cursorOffset: e.length + 1 + r,
  };
}
//@ chunk-e6aww6q8.js:555706-555864 placement
function hasUnpassedScreening(e) {
  let { promptSubmitted, value: r } = e;
  return (
    promptSubmitted === undefined ||
    e.screeningPending === true ||
    e.screeningOwed === true ||
    promptSubmitted.stopped !== undefined ||
    unchangedOrUndefined(r, promptSubmitted.text) !== undefined
  );
}
//@ chunk-e6aww6q8.js:555864-555932 placement
var queueSignalsRegistry = new HostScoped(() => ({
  commandsDiscarded: createSignal(),
  commandsConsumed: createSignal(),
}));
//@ chunk-e6aww6q8.js:555932-555962 placement
function currentQueueSignals() {
  return onProcessRootHost(queueSignalsRegistry);
}
//@ chunk-e6aww6q8.js:555962-556037 placement
/**
 * 队列事件信号：命令被丢弃与命令被消费。
 */
var commandsDiscardedSignal = createLazySignal(() => currentQueueSignals().commandsDiscarded);
var commandsConsumedSignal = createLazySignal(() => currentQueueSignals().commandsConsumed);
//@ chunk-e6aww6q8.js:556037-556126 placement
function queuedUnderPlugins(e) {
  return e.queuedUnder ?? (e.origin?.kind === "plugin" ? [e.origin.name] : undefined);
}
//@ chunk-e6aww6q8.js:556126-556148 placement
var PEER_ADMITTED = {
  admitted: true,
};
//@ chunk-e6aww6q8.js:556148-576253 placement
/**
 * 创建消息队列管理器：入队、暂扣、钩子丢弃、交回等操作。
 */
function createMessageQueueManager(e) {
  let n = e?.recordOperation ?? createQueueRecorder(recordQueueOperation_2);
  let r = currentQueueSignals();
  function s(operation, zs, li, nl, Tl, kd) {
    let na = {
      type: "queue-operation",
      operation,
      timestamp: new Date().toISOString(),
      sessionId: getSessionId(),
      ...(zs !== undefined && {
        content: zs,
      }),
      ...(li !== undefined && {
        reason: li,
      }),
      ...(nl !== undefined && {
        commandUuid: nl,
      }),
      ...(Tl !== undefined && {
        deliveryId: Tl,
      }),
    };
    if (kd === undefined) n(na);
    else n(na, kd);
  }
  function h(wr, zs) {
    s(wr, queueRecordText(zs), undefined, undefined, undefined, queuedUnderPlugins(zs));
  }
  let y = [...(e?.adopt ?? [])];
  let S = Object.freeze([...y]);
  let signal = createSignal();
  let signal_2 = createSignal();
  let signal_3 = createSignal();
  registerPasteCarrier(() => y.filter(isRefillableInput).map(inputDisplayText));
  let q = new Set();
  let Z = new Set();
  let Se = 256;
  function ke() {
    S = Object.freeze([...y]);
    signal.emit();
  }
  let we;
  function Ee(wr) {
    if (we === undefined || wr.passive === true || !we.holds(wr)) return false;
    wr.passive = true;
    we.marked.add(wr);
    return true;
  }
  function Ae(holds) {
    if (we !== undefined)
      throw Error(
        "holdBack: this message queue already has a hold; end it with the function the first call returned before setting another",
      );
    let zs = {
      holds,
      marked: new Set(),
    };
    we = zs;
    try {
      if (count(y, Ee) > 0) ke();
    } catch (error) {
      if (we === zs) we = undefined;
      for (let nl of zs.marked) delete nl.passive;
      throw error;
    }
    return () => {
      if (we !== zs) return 0;
      we = undefined;
      let filtered = y.filter((Tl) => zs.marked.has(Tl));
      if (filtered.length === 0) return 0;
      let filtered_2 = y.filter((Tl) => !zs.marked.has(Tl));
      for (let Tl of filtered) delete Tl.passive;
      y.length = 0;
      y.push(...filtered_2, ...filtered);
      ke();
      return filtered.length;
    };
  }
  function Ie(wr) {
    let marked = we?.marked;
    let filtered = y.filter((nl) => marked?.has(nl) === true && wr(nl));
    for (let nl of filtered) {
      delete nl.passive;
      marked?.delete(nl);
    }
    if (filtered.length > 0) ke();
    return filtered.length;
  }
  function Me(wr, zs) {
    if (q.delete(wr)) q.add(wr);
    else {
      if (zs?.terminalEmitted !== true && q.size >= Se) {
        let li;
        for (let nl of q)
          if (!Z.has(nl)) {
            li = nl;
            break;
          }
        if (li !== undefined) q.delete(li);
      }
      q.add(wr);
    }
    if (zs?.terminalEmitted !== true) return false;
    if (Z.has(wr)) return false;
    Z.add(wr);
    return true;
  }
  function We(wr) {
    return q.delete(wr);
  }
  function ze(wr) {
    return Z.delete(wr);
  }
  function lt(wr) {
    return Z.has(wr);
  }
  let Je = new Set();
  function nt(wr) {
    for (let zs of wr) {
      Je.add(zs);
      if (zs.uuid !== undefined) Je.add(zs.uuid);
    }
  }
  function pt(wr) {
    for (let zs of wr) {
      Je.delete(zs);
      if (zs.uuid !== undefined) Je.delete(zs.uuid);
    }
  }
  function Et(wr) {
    return Je.has(wr);
  }
  let yt = new Map();
  function gt(wr) {
    if (wr === undefined)
      return {
        withdrawn: () => false,
        [Symbol.dispose]: () => {},
      };
    let zs = {
      withdrawn: false,
    };
    yt.set(wr, zs);
    return {
      withdrawn: () => zs.withdrawn,
      [Symbol.dispose]: () => {
        if (yt.get(wr) === zs) yt.delete(wr);
      },
    };
  }
  function At(wr) {
    let zs = yt.get(wr);
    if (zs === undefined || zs.withdrawn) return false;
    zs.withdrawn = true;
    return true;
  }
  let It = false;
  let Yt;
  function qt() {
    if (It) return;
    It = true;
    ke();
  }
  function Zt(wr, zs) {
    return no(
      y.find((li) => li.uuid === wr && li.screeningPending === true),
      zs,
    );
  }
  function rn(wr, zs) {
    return no(y.includes(wr) ? wr : undefined, zs);
  }
  function pn(wr) {
    let filtered = wr.filter(isReplayableHistoryEntry);
    if (filtered.length === 0) return;
    try {
      signal_3.emit(filtered);
    } catch (error) {
      if (isAbortError(error)) logForDebugging(`typedHandedBack listener aborted: ${error}`);
      else logError(error);
    }
  }
  function no(wr, zs) {
    if (wr === undefined) return false;
    if ("dropped" in zs) {
      Di([wr], {
        reason: "dropped_by_hook",
      });
      return true;
    }
    let li = wr.screeningPending === true;
    delete wr.screeningPending;
    wr.promptSubmitted = zs.promptSubmitted;
    wr.drainOnly = zs.drainOnly;
    if (zs.promptSubmitted === undefined) wr.screeningOwed = true;
    else delete wr.screeningOwed;
    ke();
    if (li && !wr.unlogged) h("enqueue", wr);
    return true;
  }
  function hn(wr) {
    let found = y.find((li) => li.uuid === wr);
    if (found === undefined || found.priority === "now" || Je.has(wr)) return false;
    found.priority = "now";
    ke();
    return true;
  }
  function ho(wr, priority) {
    let found = y.find((nl) => nl.uuid === wr);
    if (found === undefined || found.priority !== "now") return false;
    found.priority = priority;
    ke();
    return true;
  }
  function yn() {
    return It || isTerminalShutdown();
  }
  let Kn = null;
  let Xn;
  function fo(wr) {
    Kn = wr;
    Xn = undefined;
  }
  function To(wr) {
    if (wr === undefined || Kn === wr) {
      Kn = null;
      Xn = undefined;
    }
  }
  function bo(wr) {
    return Kn !== null && Kn.some(wr);
  }
  let vn = new Set();
  function co(wr) {
    vn.add(wr);
    return {
      [Symbol.dispose]: () => {
        vn.delete(wr);
      },
    };
  }
  function So(wr) {
    for (let zs of vn) if (wr(zs)) return true;
    return false;
  }
  function ko(wr) {
    let zs = new Set(wr.map((nl) => nl.uuid));
    for (let nl of vn) if (nl.uuid !== undefined && zs.has(nl.uuid)) vn.delete(nl);
    let flattened = (Kn ?? []).flatMap((nl) => (nl.uuid === undefined ? [] : [nl.uuid]));
    if (flattened.length > 0 && Xn !== "appended")
      Xn = flattened.some((nl) => zs.has(nl)) ? "appended" : "passed-over";
  }
  function un() {
    return Xn;
  }
  let resolved = Promise.resolve();
  function $o() {
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
  function yo() {
    return S;
  }
  function Ho() {
    return [...y];
  }
  function rr() {
    return y.length;
  }
  function br() {
    return count(y, isSendableQueuedCommand);
  }
  function Hr() {
    return br() + count(y, (wr) => we?.marked.has(wr) === true);
  }
  function Fr() {
    return y.length > 0;
  }
  function cs() {
    return y.some((wr) => !isPollEventMode(wr) && wr.passive !== true);
  }
  function _r() {
    if (y.length > 0) ke();
  }
  let hopGuard = createHopGuard({}, getPeerGuardLimits);
  let Vr =
    e?.dropReceiptTrailMs === undefined
      ? {}
      : {
          trailMs: e.dropReceiptTrailMs,
        };
  let peerDropLogger = createPeerDropLogger(Vr);
  function jr() {
    hopGuard = createHopGuard({}, getPeerGuardLimits);
    peerDropLogger.dispose();
    peerDropLogger = createPeerDropLogger(Vr);
  }
  function Or(wr) {
    return peerDropLogger.flushPendingReceipts(wr);
  }
  function Io() {
    let wr = (li) => isPeerOrigin(li.origin);
    let zs = 0;
    runIgnoringAbort(() => {
      zs = inFlightDrainProbe.get()?.(wr) ?? 0;
    });
    return count(y, wr) + zs;
  }
  function zo(wr, zs = "coalesced") {
    let origin = wr.origin;
    if (!isPeerOrigin(origin)) return PEER_ADMITTED;
    let nl = wr.admissionExempt === "resurrected";
    if (!nl && !isVouchedPeerOrigin(origin)) {
      let Tl = hopGuard.checkHopChain(origin.hopChain, ownHopTokens());
      if (Tl && !Tl.admitted) {
        peerDropLogger.report({
          reason: Tl.reason,
          from: origin.from,
          ...(origin.name !== undefined && {
            name: origin.name,
          }),
        });
        if (zs === "coalesced") rs(wr, Tl.reason);
        return {
          admitted: false,
          reason: Tl.reason,
        };
      }
    }
    if (!nl && isVouchedPeerOrigin(origin)) {
      let body = typeof wr.value === "string" ? wr.value : extractTextContent_2(wr.value);
      let kd = hopGuard.admit({
        senderKey: origin.from !== "unknown" ? `from:${origin.from}` : `pid:${origin.verifiedPeerPid}`,
        body,
        hopChain: origin.hopChain,
        ownTokens: ownHopTokens(),
      });
      if (!kd.admitted) {
        peerDropLogger.report({
          reason: kd.reason,
          from: origin.from,
          ...(origin.name !== undefined && {
            name: origin.name,
          }),
        });
        if (zs === "coalesced") rs(wr, kd.reason);
        return {
          admitted: false,
          reason: kd.reason,
        };
      }
    }
    if (!nl && Io() >= getPeerGuardLimits().maxQueuedPeerMessages) {
      peerDropLogger.report({
        reason: "queue-full",
        from: origin.from,
        ...(origin.name !== undefined && {
          name: origin.name,
        }),
      });
      if (zs === "coalesced") rs(wr, "queue-full");
      return {
        admitted: false,
        reason: "queue-full",
      };
    }
    logFeatureOk("peer_loop_guard");
    return PEER_ADMITTED;
  }
  function rs(wr, reason) {
    let origin = wr.origin;
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
        swarmHostState().inbound.sendPeerReceipt?.(wr, "dropped", {
          dropReason: reason,
          droppedMsgIds,
        }),
    );
  }
  function Es(wr, zs) {
    let li = false;
    runIgnoringAbort(() => {
      let nl = () => Sd([wr]);
      li = receiptQueuedProbe.get()?.(wr, zs, nl) === true;
      if (li) markReceiptQueued(wr.uuid);
    });
    return li;
  }
  function Nr(wr, { receipt: zs = "coalesced", ahead: li = false } = {}) {
    let nl = zo(wr, zs);
    if (!nl.admitted) return nl;
    let Tl = {
      ...dropPeerHopChain(wr),
      priority: wr.priority ?? "next",
      timestamp: wr.timestamp ?? new Date().toISOString(),
    };
    let kd = () => Is(wr, Tl, li);
    if (!Es(Tl, kd)) kd();
    return PEER_ADMITTED;
  }
  function Is(wr, zs, li) {
    Ee(zs);
    if (li) y.unshift(zs);
    else y.push(zs);
    if (
      wr.origin?.kind === "peer" &&
      wr.origin.handback === true &&
      wr.origin.senderTaskId !== undefined &&
      wr.admissionExempt !== "resurrected"
    )
      noteHandback({
        sender: wr.origin.senderTaskId,
        recipient: wr.agentId,
        senderName: wr.origin.from,
        flagged: wr.origin.flagged === true,
      });
    markReceiptQueued(wr.uuid);
    ke();
    if (!wr.unlogged && wr.screeningPending !== true) h("enqueue", wr);
  }
  function fs(wr) {
    Nr(wr);
  }
  function as(wr, { turnAttribution: zs = "none" } = {}) {
    if (!zo(wr).admitted) return;
    let li = wr;
    if (wr.mode === "task-notification" && typeof wr.value === "string") {
      let Ac = truncateMiddle_2(wr.value, MAX_MERGED_PROMPTS);
      if (Ac !== wr.value) {
        logForDebugging(
          `enqueuePendingNotification: task-notification capped from ${wr.value.length} to ${Ac.length} chars`,
          {
            level: "warn",
          },
        );
        li = {
          ...wr,
          value: Ac,
        };
      }
    }
    let nl =
      wr.inheritedTurnAttributionKey ??
      (zs === "inherit" && wr.mode === "task-notification" ? getContextKey() : undefined);
    if (
      zs === "inherit" &&
      wr.mode === "task-notification" &&
      (li.origin === undefined || li.origin.kind === "task-notification")
    )
      li = {
        ...li,
        origin: {
          ...(li.origin ?? {
            kind: "task-notification",
          }),
          producer: "session-task",
        },
      };
    let Tl =
      wr.mode === "task-notification" && wr.taskId !== undefined
        ? (wr.runId ?? getRunId(wr.taskId))
        : undefined;
    if (Tl !== undefined)
      li = {
        ...li,
        runId: Tl,
      };
    let kd =
      wr.stampThreadState ??
      (wr.mode === "task-notification" &&
        wr.handbackPointer !== true &&
        isActiveMainAgentCommand(wr) &&
        shouldStampThreadState({
          isPeer: false,
        }));
    let na = {
      ...dropPeerHopChain(li),
      priority: wr.priority ?? "later",
      timestamp: wr.timestamp ?? new Date().toISOString(),
      ...(nl && {
        inheritedTurnAttributionKey: nl,
      }),
      ...(kd && {
        stampThreadState: true,
      }),
    };
    let em = () => {
      Ee(na);
      y.push(na);
      ke();
      if (!wr.unlogged) s("enqueue", queueRecordText(li));
    };
    if (!Es(na, em)) em();
  }
  async function Vi(wr) {
    Wi(1);
    let { command, delivered } = ii(wr, undefined);
    y.push(command);
    ke();
    s("enqueue", command.pollEvent?.envelope);
    return delivered;
  }
  async function ji(wr) {
    Wi(wr.length);
    if (wr.length === 0 || wr.length > MAX_POLL_EVENTS_PER_BATCH || wr.some((kd) => kd.wake === false)) {
      logFeatureBad("poll_event_delivery", "group_refused");
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `poll event rejected: a group holds 1 to ${MAX_POLL_EVENTS_PER_BATCH} events, none of them wake: false`,
        "poll event rejected: group shape",
      );
    }
    let zs = randomUUID();
    let mapped = wr.map((kd) => ii(kd, zs));
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
    let reduced_2 = wr.reduce(
      (acc, na) => acc + (na.declared === undefined ? 0 : eventByteLength(na.declared.fields)),
      0,
    );
    if (reduced_2 > MAX_POLL_EVENT_BATCH_BYTES) {
      logFeatureBad("poll_event_delivery", "group_too_large");
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `poll event rejected: the group's fields are ${reduced_2} bytes as sent (cap ${MAX_POLL_EVENT_BATCH_BYTES})`,
        "poll event rejected: group too large",
      );
    }
    y.push(...mapped.map(({ command }) => command));
    ke();
    for (let { command } of mapped) s("enqueue", command.pollEvent?.envelope);
    await Promise.all(mapped.map(({ delivered }) => delivered));
  }
  function Wi(wr) {
    let zs = count(y, isPollEventMode);
    if (zs + wr > POLL_KIND_DEFAULT_TIMEOUT_MS) {
      logFeatureBad("poll_event_delivery", "queue_cap");
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        wr === 1
          ? `poll event rejected: ${POLL_KIND_DEFAULT_TIMEOUT_MS} events already queued`
          : `poll event rejected: the queue holds at most ${POLL_KIND_DEFAULT_TIMEOUT_MS} events (${zs} queued, ${wr} arriving)`,
        "poll event rejected: queue depth cap",
      );
    }
  }
  function ii(wr, zs) {
    if (!isValidPollEventKind(wr.kind)) {
      logFeatureBad("poll_event_delivery", "invalid_kind");
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        "poll event rejected: invalid kind (a lowercase letter, then lowercase letters, digits and hyphens, at most 64 characters)",
        "poll event rejected: invalid kind",
      );
    }
    if (mentionsReservedKind(wr.kind) && wr.allowReservedKind !== true) {
      logFeatureBad("poll_event_delivery", "reserved_kind");
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `poll event rejected: kind "${wr.kind}" is reserved for a trusted in-process producer`,
        "poll event rejected: reserved kind",
      );
    }
    let li;
    let nl = "element";
    let Tl;
    if (wr.element !== undefined) {
      if (wr.content !== undefined || wr.declared !== undefined)
        throw Error("poll event: pass one of content, element, declared");
      let np = Buffer.byteLength(wr.element, "utf8");
      if (np > pollEventMaxEnvelopeBytes(wr.kind)) {
        logFeatureBad("poll_event_delivery", "envelope_too_large");
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `poll event rejected: envelope is ${np} bytes (cap ${pollEventMaxEnvelopeBytes(wr.kind)})`,
          "poll event rejected: envelope too large",
        );
      }
      let pollEventEnvelope = parsePollEventEnvelope(wr.element);
      if (!pollEventEnvelope.ok) {
        logFeatureBad("poll_event_delivery", "validation_failed");
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `poll event rejected: ${pollEventEnvelope.reason}`,
          "poll event rejected: element failed validation",
        );
      }
      if (pollEventEnvelope.kind !== wr.kind) {
        logFeatureBad("poll_event_delivery", "kind_mismatch");
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `poll event rejected: element kind "${pollEventEnvelope.kind}" does not match declared kind "${wr.kind}"`,
          "poll event rejected: kind mismatch",
        );
      }
      li = wr.element;
    } else if (wr.declared !== undefined) {
      if (wr.content !== undefined) throw Error("poll event: pass one of content, element, declared");
      let pollEventEnvelope = buildPollEventEnvelope(wr.declared);
      if (!pollEventEnvelope.ok || wr.declared.declaration.kind !== wr.kind) {
        logFeatureBad("poll_event_delivery", "fields_invalid");
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `poll event rejected: ${pollEventEnvelope.ok ? "declaration is for another kind" : pollEventEnvelope.reason}`,
          "poll event rejected: fields failed validation",
        );
      }
      li = pollEventEnvelope.envelope;
      nl = "json";
      Tl = {
        at: wr.declared.at,
        fields: pollEventEnvelope.fields,
      };
    } else if (wr.content !== undefined)
      li = validatePollEvent({
        kind: wr.kind,
        at: new Date().toISOString(),
        content: wr.content,
      });
    else throw Error("poll event: content, element or declared is required");
    let kd = randomEventNonce();
    li = withEventNonce(li, kd, nl);
    let na = Buffer.byteLength(li, "utf8");
    if (na > pollEventMaxEnvelopeBytes(wr.kind)) {
      logFeatureBad("poll_event_delivery", "envelope_too_large");
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `poll event rejected: envelope is ${na} bytes after nonce stamping (cap ${pollEventMaxEnvelopeBytes(wr.kind)})`,
        "poll event rejected: envelope too large",
      );
    }
    let wake = wr.wake ?? true;
    let settleDelivered;
    let settleDropped;
    let delivered = new Promise((resolve, reject) => {
      settleDelivered = resolve;
      settleDropped = reject;
    });
    return {
      command: {
        value: li,
        mode: "poll-event",
        agentId: mainAgentId(),
        priority: wake ? "next" : "later",
        uuid: randomUUID(),
        isMeta: true,
        ...false,
        timestamp: new Date().toISOString(),
        pollEvent: {
          kind: wr.kind,
          envelope: li,
          ...false,
          ...(wr.media !== undefined &&
            wr.media.length > 0 && {
              media: wr.media,
            }),
          ...false,
          ...false,
          ...false,
          wake,
          ...false,
          ...false,
          settleDelivered,
          settleDropped,
          provenance: wr.provenance,
          ...(Tl !== undefined && {
            declared: Tl,
          }),
          ...(zs !== undefined && {
            group: zs,
          }),
        },
      },
      delivered,
    };
  }
  function wa(wr) {
    let filtered = y.filter((kd) => isPollEventForAgent(kd, wr));
    if (filtered.length === 0)
      return {
        commands: [],
        remainingWakeCount: 0,
      };
    let pollEventBatch = selectPollEventBatch(filtered);
    let nl = new Set(pollEventBatch);
    let filtered_2 = y.filter((kd) => !nl.has(kd));
    y.length = 0;
    y.push(...filtered_2);
    ke();
    for (let kd of nl) if (!kd.unlogged) s("dequeue");
    return {
      commands: pollEventBatch,
      remainingWakeCount: jo(wr),
    };
  }
  let hr = new Set();
  function mi(wr) {
    if (hr.has(wr)) return false;
    hr.add(wr);
    return true;
  }
  function Ha(wr) {
    hr.delete(wr);
  }
  let $a = 0;
  function nr() {
    $a++;
  }
  function Ti() {
    if ($a === 0) return;
    $a--;
    if ($a === 0)
      try {
        signal.emit();
      } catch (error) {
        if (isAbortError(error)) logForDebugging(`queueChanged listener aborted: ${error}`);
        else logError(error);
      }
  }
  function Vs() {
    return $a;
  }
  function _i(wr) {
    let agentId = wr.find(isPollEventMode)?.agentId;
    let li = count(wr, (nl) => nl.pollEvent?.wake === true);
    return Math.max(
      0,
      count(
        y,
        (nl) =>
          nl.mode === "poll-event" &&
          nl.agentId === (agentId ?? mainAgentId()) &&
          nl.pollEvent?.wake === true,
      ) - li,
    );
  }
  function jo(wr) {
    return count(y, (zs) => isPollEventForAgent(zs, wr) && zs.pollEvent?.wake === true);
  }
  function Qr(wr) {
    if (y.length === 0) return;
    let zs = -1;
    let li = 1 / 0;
    for (let idx = 0; idx < y.length; idx++) {
      let kd = y[idx];
      if (wr && !wr(kd)) continue;
      let na = PRIORITY_ORDER[kd.priority ?? "next"];
      if (na < li) {
        zs = idx;
        li = na;
      }
    }
    if (zs === -1) return;
    let [nl] = y.splice(zs, 1);
    ke();
    if (!nl.unlogged) s("dequeue");
    return nl;
  }
  function fi() {
    if (y.length === 0) return [];
    let wr = [...y];
    y.length = 0;
    ke();
    for (let zs of wr) if (!zs.unlogged) s("dequeue");
    return wr;
  }
  function Ri(wr) {
    if (y.length === 0) return;
    let zs = -1;
    let li = 1 / 0;
    for (let idx = 0; idx < y.length; idx++) {
      let Tl = y[idx];
      if (wr && !wr(Tl)) continue;
      let kd = PRIORITY_ORDER[Tl.priority ?? "next"];
      if (kd < li) {
        zs = idx;
        li = kd;
      }
    }
    if (zs === -1) return;
    return y[zs];
  }
  function Ja(wr) {
    let zs = [];
    let li = [];
    for (let nl of y)
      if (wr(nl)) zs.push(nl);
      else li.push(nl);
    if (zs.length === 0) return [];
    y.length = 0;
    y.push(...li);
    ke();
    for (let nl of zs) if (!nl.unlogged) s("dequeue");
    return zs;
  }
  function Di(wr, zs) {
    vs((li) => wr.includes(li), r.commandsDiscarded, zs?.reason);
  }
  let yr = e?.now ?? (() => Math.max(performance.timeOrigin + performance.now(), Date.now()));
  let Kr;
  let Li = new Set();
  let Qs = new Set();
  function Hi(wr, zs) {
    let li = vs((nl) => wr.includes(nl), r.commandsConsumed, zs.reason);
    if (zs.reason === "absorbed_mid_turn")
      for (let nl of li) {
        if (nl.mode !== "prompt" || !isMainAgentCommand(nl)) continue;
        let { uuid } = nl;
        let requeueIfInterruptedWithinMs =
          uuid !== undefined && nl.shouldQuery !== false && nl.passive !== true && !q.has(uuid)
            ? nl.requeueIfInterruptedWithinMs
            : undefined;
        if (requeueIfInterruptedWithinMs !== undefined || Kr !== undefined)
          Kr = {
            uuid,
            cmd: nl,
            withinMs: requeueIfInterruptedWithinMs,
            until: undefined,
          };
      }
  }
  function Xa() {
    if (Kr?.withinMs !== undefined) Kr.until ??= yr() + Kr.withinMs;
  }
  function ta({ turnEnded: wr = false } = {}) {
    Kr = undefined;
    if (wr) Li.clear();
  }
  function Bs(wr) {
    if (Kr?.uuid === wr) Kr.withinMs = undefined;
    for (let zs of y) if (zs.uuid === wr) delete zs.requeueIfInterruptedWithinMs;
  }
  function Ca() {
    let wr = Kr;
    Kr = undefined;
    if (wr?.uuid === undefined || wr.withinMs === undefined || (wr.until !== undefined && yr() > wr.until))
      return;
    let { requeueIfInterruptedWithinMs, promptSubmitted, attachmentSourceUuid, deliveryId, ...kd } = wr.cmd;
    Li.add(wr.uuid);
    Je.delete(wr.uuid);
    try {
      Nr(
        {
          ...kd,
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
    return wr.cmd;
  }
  function tu(wr) {
    return Li.has(wr);
  }
  function pd(wr) {
    if (Li.has(wr)) return "drop";
    if (Je.has(wr) && y.some((zs) => zs.uuid === wr && zs.requeueIfInterruptedWithinMs !== undefined))
      return "wait";
    return Kr?.uuid === wr && Kr.withinMs !== undefined && (Kr.until === undefined || yr() <= Kr.until)
      ? "wait"
      : "keep";
  }
  function ga(wr) {
    if (Kr?.uuid === wr || Je.has(wr)) Bs(wr);
  }
  function Hl() {
    return Kr?.withinMs !== undefined && Kr.until !== undefined && yr() <= Kr.until
      ? Kr.until - yr()
      : undefined;
  }
  function hd(wr, zs) {
    return vs(wr, r.commandsDiscarded, zs?.reason);
  }
  function Sd(wr) {
    for (let { mode, taskId } of wr) if (mode === "task-notification" && taskId !== undefined) Qs.add(taskId);
    settleReceiptsForMessages(wr);
    r.commandsDiscarded.emit(wr);
  }
  function Ld(wr) {
    return Qs.delete(wr);
  }
  function vs(wr, zs, reason) {
    let nl = [];
    for (let idx = y.length - 1; idx >= 0; idx--) if (wr(y[idx])) nl.unshift(y.splice(idx, 1)[0]);
    if (nl.length > 0) {
      ke();
      try {
        signal_2.emit();
      } catch (error) {
        if (isAbortError(error)) logForDebugging(`commandsRemoved listener aborted: ${error}`);
        else logError(error);
      }
      for (let Tl of nl) {
        if (Tl.unlogged || Tl.screeningPending === true) continue;
        s(
          "remove",
          reason === "dropped_by_hook" ? undefined : queueRecordText(Tl),
          reason,
          Tl.attachmentSourceUuid ?? Tl.uuid,
          Tl.deliveryId,
          queuedUnderPlugins(Tl),
        );
      }
      if (reason === "cleared_on_cancel" || reason === "dropped_by_hook")
        logDeliveryFailureForEndings(nl, reason);
      if (zs === r.commandsDiscarded) Sd(nl);
      else zs.emit(nl);
    }
    return nl;
  }
  function ol(wr) {
    if (y.length === 0) return [];
    let keep = wr?.keep;
    let li = keep ? y.filter((Tl) => !keep(Tl)) : y;
    if (li.length === 0) return [];
    let nl = groupByToObject(li, (Tl) => Tl.mode);
    logForDebugging(
      `[clearCommandQueue] dropping ${li.length} queued command(s): ${Object.entries(nl)
        .map(([key, value]) => `${key}=${value.length}`)
        .join(" ")}`,
      {
        level: "warn",
      },
    );
    discardPollEvent(li.filter(isPollEventMode), "queue cleared");
    return hd(keep ? (Tl) => !keep(Tl) : () => true, wr);
  }
  function gd() {
    y.length = 0;
    S = Object.freeze([]);
    hr.clear();
    q.clear();
    Z.clear();
    Je.clear();
    It = false;
    Yt = undefined;
    we = undefined;
    Kr = undefined;
    Li.clear();
    Qs.clear();
    jr();
    To();
    vn.clear();
  }
  function Su(wr, zs, li) {
    let mapped = wr.map((na) => ({
      text: inputDisplayText(na),
      entries: getRetainedPastedContents(na),
    }));
    function Tl(na, em) {
      let Ac = new Set();
      for (let tp of parsePastedRefs(na)) if (isValidPasteId(tp.id) && !em.has(tp.id)) Ac.add(tp.id);
      return Ac;
    }
    let kd = [
      Tl(zs, new Set(Object.keys(li).map(Number))),
      ...mapped.map((na) => Tl(na.text, new Set(na.entries.map((entry) => entry.id)))),
    ];
    return mapped.map((na, em) => {
      let Ac = new Set();
      kd.forEach((Ef, np) => {
        if (np !== em + 1) for (let Rf of Ef) Ac.add(Rf);
      });
      let text = na.text;
      let entries = na.entries.map((entry) => {
        if (entry.type !== "text" || !Ac.has(entry.id)) return entry;
        let np = mintPasteId(zs, li);
        text = expandPastedTextRefs_2(text, entry.id, np, "text");
        return {
          ...entry,
          id: np,
        };
      });
      return {
        text,
        entries,
      };
    });
  }
  function Eu(wr, zs, li = {}) {
    if (y.length === 0) return;
    let nl = wr === "";
    let filtered = y.filter((ap) => shouldPrependModeChar(ap, nl));
    if (filtered.length === 0) return;
    let kd = filtered.every((ap) => ap.mode === "bash") ? "bash" : "prompt";
    let na = kd === "bash" ? filtered : filtered.filter((ap) => ap.mode !== "bash");
    let em = Su(na, wr, li);
    let mapped = em.map((ap, al) => popAllEditable(ap.text, na[al].value, wr, li));
    let { text, cursorOffset } = joinWithCursor(
      mapped.map((ap) => ap.text).filter(Boolean).join(`
`),
      wr,
      zs,
    );
    let Ef = [];
    for (let [ap, al] of em.entries()) Ef.push(...al.entries, ...mapped[ap].images);
    for (let ap of na) {
      if (ap.unlogged || ap.screeningPending === true) continue;
      h("popAll", ap);
    }
    let np = new Set(na);
    let filtered_2 = y.filter((ap) => !np.has(ap));
    y.length = 0;
    y.push(...filtered_2);
    ke();
    Sd(na);
    return {
      text,
      cursorOffset,
      images: Ef,
      mode: kd,
      ideSelection:
        na.find((ap) => ap.ideSelection?.text)?.ideSelection ??
        na.find((ap) => ap.ideSelection !== undefined)?.ideSelection,
      unpassed: na.some(hasUnpassedScreening),
    };
  }
  function Uc(wr, zs, li, nl = {}) {
    let kd = y.filter(isRefillableInput)[wr];
    if (!kd) return;
    if (!shouldPrependModeChar(kd, zs === "")) return;
    let [na] = Su([kd], zs, nl);
    let { text, entries } = na;
    let tp = popAllEditable(text, kd.value, zs, nl);
    let { text: text_2, cursorOffset } = joinWithCursor(tp.text, zs, li);
    let np = entries;
    np.push(...tp.images);
    if (!kd.unlogged && kd.screeningPending !== true) h("popOne", kd);
    let index = y.indexOf(kd);
    if (index !== -1) {
      y.splice(index, 1);
      ke();
      Sd([kd]);
    }
    return {
      text: text_2,
      cursorOffset,
      images: np,
      mode: kd.mode === "bash" ? "bash" : "prompt",
      ideSelection: kd.ideSelection,
      unpassed: hasUnpassedScreening(kd),
    };
  }
  function Kc(wr) {
    let zs = PRIORITY_ORDER[wr];
    return y.filter((li) => PRIORITY_ORDER[li.priority ?? "next"] <= zs);
  }
  function _s(wr) {
    Yt = wr;
  }
  function Qm(wr) {
    return y.filter(
      (zs) => PRIORITY_ORDER[zs.priority ?? "next"] <= PRIORITY_ORDER.next || (zs === Yt && !wr),
    );
  }
  return {
    subscribe: signal.subscribe,
    subscribeToRemovals: signal_2.subscribe,
    getCommandQueueSnapshot: yo,
    getCommandQueue: Ho,
    getCommandQueueLength: rr,
    getMainThreadQueueLength: br,
    getDrainableMainThreadQueueLength: Hr,
    ...{},
    getQueuedPeerMessageCount: Io,
    emitDiscarded: Sd,
    takeDiscardedNotice: Ld,
    hasCommandsInQueue: Fr,
    recheckCommandQueue: _r,
    enqueue: fs,
    enqueueReportingAdmission: Nr,
    flushPeerDropReceipts: Or,
    enqueuePendingNotification: as,
    holdBack: Ae,
    letHeldBackGo: Ie,
    enqueuePollEvent: Vi,
    enqueuePollEventGroup: ji,
    drainPollEventChunk: wa,
    countPendingWakePollEvents: jo,
    countRemainingWakePollEventsAfter: _i,
    hasUserIntentCommandsInQueue: cs,
    tryBeginPollCall: mi,
    endPollCall: Ha,
    beginPollEventAdmission: nr,
    endPollEventAdmission: Ti,
    pollEventAdmissionsPending: Vs,
    dequeue: Qr,
    dequeueAll: fi,
    peek: Ri,
    dequeueAllMatching: Ja,
    remove: Di,
    consume: Hi,
    startRequeueWindow: Xa,
    settleTaken: ta,
    forgoRequeue: Bs,
    requeueTaken: Ca,
    wasPutBack: tu,
    foldCopyFate: pd,
    foldCopyWritten: ga,
    requeueWindowLeftMs: Hl,
    removeByFilter: hd,
    clearCommandQueue: ol,
    resetCommandQueue: gd,
    popAllEditable: Eu,
    popEditableAt: Uc,
    getCommandsByMaxPriority: Kc,
    setTurnStartFoldTarget: _s,
    getTurnStartFoldCommands: Qm,
    markCancelPending: Me,
    consumeCancelPending: We,
    consumeCancelPendingAcked: ze,
    hasCancelPendingAcked: lt,
    registerFoldInFlight: nt,
    unregisterFoldInFlight: pt,
    isFoldInFlight: Et,
    beginInboundIngest: gt,
    withdrawInboundIngest: At,
    suspendMidTurnFold: qt,
    isMidTurnFoldSuspended: yn,
    settleScreening: Zt,
    settleSurfaced: rn,
    typedHandedBack: signal_3,
    handTypedBack: pn,
    promoteToNow: hn,
    demoteFromNow: ho,
    setInFlightDrainBatch: fo,
    clearInFlightDrainBatch: To,
    someInFlightDrainCommand: bo,
    trackSubmission: co,
    someSubmissionInFlight: So,
    noteTurnAppended: ko,
    getInFlightDrainBatchStanding: un,
    takeInboundEnqueueTurn: $o,
  };
}
//@ chunk-e6aww6q8.js:576253-576302 placement
var sessionCommandQueueSlot = new SessionRootSlot(() => ({
  queue: createMessageQueueManager(),
  installed: false,
}));
//@ chunk-e6aww6q8.js:576302-576336 placement
function currentSessionQueueState() {
  return sessionCommandQueueSlot.of(getRootSession());
}
//@ chunk-e6aww6q8.js:576336-576489 placement
function installCommandQueue(e) {
  let n = currentSessionQueueState();
  if (n.installed) return n.queue;
  let queue = n.queue;
  let s = e(queue.getCommandQueue());
  queue.resetCommandQueue();
  n.queue = s;
  n.installed = true;
  return s;
}
//@ chunk-e6aww6q8.js:576489-576522 placement
/**
 * 取当前会话的消息队列管理器。
 */
function commandQueueManager() {
  return currentSessionQueueState().queue;
}
//@ chunk-e6aww6q8.js:576522-576590 placement
/**
 * 宿主隔离的"回执已入队/正在排空"探测函数槽。
 */
var receiptQueuedProbe = identity_2(createValueSlot(), (e) => e.set(undefined));
var inFlightDrainProbe = identity_2(createValueSlot(), (e) => e.set(undefined));
//@ chunk-e6aww6q8.js:576590-576632 placement
/**
 * 判断是否正在折叠队列。
 */
var isFoldInFlight = (...e) => commandQueueManager().isFoldInFlight(...e);
//@ chunk-e6aww6q8.js:576632-576721 placement
/**
 * 取命令队列快照与完整队列。
 */
var getCommandQueueSnapshot = (...e) => commandQueueManager().getCommandQueueSnapshot(...e);
var getCommandQueue = (...e) => commandQueueManager().getCommandQueue(...e);
//@ chunk-e6aww6q8.js:576721-576773 placement
/**
 * 取主线程队列长度。
 */
var getMainThreadQueueLength = (...e) => commandQueueManager().getMainThreadQueueLength(...e);
//@ chunk-e6aww6q8.js:576773-576814 placement
/**
 * 上报命令被丢弃。
 */
var emitDiscardedCommand = (...e) => commandQueueManager().emitDiscarded(...e);
//@ chunk-e6aww6q8.js:576814-576881 placement
/**
 * 判断队列中是否存在可回填的主 agent 命令。
 */
function hasRefillableMainAgentCommand(e) {
  return e.getCommandQueue().some((n) => isMainAgentCommand(n) && isRefillableInput(n));
}
//@ chunk-e6aww6q8.js:576881-576946 placement
/**
 * 判断队列中是否有带模式字符的命令。
 */
function hasModeCharCommand(store, n) {
  return store.getCommandQueue().some((r) => shouldPrependModeChar(r, n));
}
//@ chunk-e6aww6q8.js:576946-577062 placement
function hasQueuedTaskNotification(e, n) {
  return commandQueueManager()
    .getCommandQueue()
    .some((r) => r.mode === "task-notification" && r.agentId === e && r.taskId === n);
}
//@ chunk-e6aww6q8.js:577062-577199 placement
function hasQueuedQueryingTaskNotification(recipientAgentId, taskId) {
  return commandQueueManager()
    .getCommandQueue()
    .some(
      (r) =>
        r.mode === "task-notification" &&
        r.agentId === recipientAgentId &&
        r.taskId === taskId &&
        r.shouldQuery !== false,
    );
}
//@ chunk-e6aww6q8.js:577199-577502 placement
/**
 * 消息队列管理器各方法的转发函数（取丢弃通知、重查命令队列、入队等）。
 */
var takeDiscardedNotice = (...e) => commandQueueManager().takeDiscardedNotice(...e);
var recheckCommandQueue = (...e) => commandQueueManager().recheckCommandQueue(...e);
var enqueueCommand = (...e) => commandQueueManager().enqueue(...e);
var enqueueReportingAdmission = (...e) => commandQueueManager().enqueueReportingAdmission(...e);
var flushPeerDropReceipts = (...e) => commandQueueManager().flushPeerDropReceipts(...e);
var enqueuePollEvent = (...e) => commandQueueManager().enqueuePollEvent(...e);
var enqueuePendingNotification = (...e) => commandQueueManager().enqueuePendingNotification(...e);
//@ chunk-e6aww6q8.js:577502-577576 placement
/**
 * 查看队首命令与按条件批量出队。
 */
var peekQueuedCommand = (...e) => commandQueueManager().peek(...e);
var dequeueAllMatching = (...e) => commandQueueManager().dequeueAllMatching(...e);
//@ chunk-e6aww6q8.js:577576-577617 placement
/**
 * 按过滤条件移除排队命令。
 */
var removeQueuedByFilter = (...e) => commandQueueManager().removeByFilter(...e);
//@ chunk-e6aww6q8.js:577617-577669 placement
/**
 * 判断是否有正在排空的命令。
 */
var someInFlightDrainCommand = (...e) => commandQueueManager().someInFlightDrainCommand(...e);
//@ chunk-e6aww6q8.js:577669-577937 placement
setQueueInstaller((e, origin, r) => {
  let s = r === undefined ? undefined : randomUUID();
  enqueueCommand({
    agentId: mainAgentId(),
    mode: "prompt",
    value: `/${e}`,
    origin,
    uuid: s,
  });
  if (r === undefined || r.until.aborted) return;
  let h = commandsDiscardedSignal.subscribe((y) => {
    if (y.some((S) => S.uuid === s)) {
      h();
      r.onDiscarded();
    }
  });
  r.until.addEventListener("abort", h, {
    once: true,
  });
});
//@ chunk-ha3km179.js:76331-76631 sole-consumer
/**
 * 把带 ✓/○ 等符号的清单文本解析为 header 与 items（最多 32 条）。
 */
function parseChecklistText(e) {
  let mapped = e
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
  let r = mapped[0] ?? "";
  return {
    header: r !== "" && !CHECKLIST_MARKER_STATUS.has(r.charAt(0)) ? r : null,
    items: mapped
      .flatMap((h) => {
        let y = CHECKLIST_MARKER_STATUS.get(h.charAt(0));
        let trimmed = h.slice(1).trim();
        return y !== undefined && trimmed !== ""
          ? [
              {
                content: trimmed,
                status: y,
              },
            ]
          : [];
      })
      .slice(0, MAX_CHECKLIST_LINES),
  };
}
//@ chunk-ha3km179.js:76631-76961 placement
/**
 * 协调者内部工具名列表。
 */
var COORDINATOR_TOOL_NAMES = aliasCanonicalNames(["update_status"]).map((e) => `__${e}`);
var COORDINATOR_TOOL_SUFFIXES = [
  NO_REPLY_TOOL_SUFFIX,
  "__react",
  "__message_coordinator",
  "__message_thread",
];
var mapped = aliasCanonicalNames(["ask_decision"]).map((e) => `__${e}`);
var mapped_2 = aliasCanonicalNames(["close_decision", "set_thread_resolved"]).map((e) => `__${e}`);
var REPORTING_NOTIFICATION_ORIGINS = new Set(["github_webhook", "trigger_fire"]);
var TOOL_RESULT_NOTIFICATIONS_SCHEMA = DoctorLazy(() =>
  u({
    notifications: array(
      u({
        origin: string(),
      }),
    ),
  }),
);
var REPORTING_WINDOW_MS = 259200000;
//@ chunk-ha3km179.js:76961-77218 placement
/**
 * 找出最近一次"已展示但未读"的出错工具行 id（供分类器提示）。
 */
function shownErroredToolRowId(e) {
  if (!isGracefulCakeEnabled()) return;
  try {
    let recentErroredTools = findRecentErroredTools(e);
    return recentErroredTools?.shown === true &&
      allUserTurnsSatisfy(
        e.slice(recentErroredTools.row),
        (r, s) => r === undefined && s.type === "user" && s.isMeta === true && s.turnOrigin === undefined,
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
//@ chunk-ha3km179.js:77218-77474 placement
function logOperation(operation, content) {
  if (!isGracefulCakeEnabled()) return false;
  try {
    let recentErroredTools = findRecentErroredTools(content);
    if (
      recentErroredTools?.id !== operation ||
      Date.now() - Date.parse(content[recentErroredTools.row].timestamp) >= REPORTING_WINDOW_MS
    )
      return false;
    let sliced = content.slice(recentErroredTools.row);
    return (
      isMachineOnlyTurnRange(sliced) &&
      allUserTurnsSatisfy(sliced, isAutomatedNotification) &&
      hasOnlyWaitCalls(sliced)
    );
  } catch (error) {
    logForDebugging(`[classifier] quiet turn not read: ${errorMessage(error)}`, {
      level: "error",
    });
    return false;
  }
}
//@ chunk-ha3km179.js:77474-77566 placement
function isGracefulCakeEnabled() {
  return (
    getTerminalMcpTools()
      .values()
      .some((e) => e.endsWith(NO_REPLY_TOOL_SUFFIX)) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_graceful_cake", true)
  );
}
//@ chunk-ha3km179.js:77566-77617 placement
function nameEndsWithAny(name, n) {
  return n.some((r) => name.endsWith(r));
}
//@ chunk-ha3km179.js:77617-78323 placement
/**
 * 找出最近出错的工具调用。
 */
function findRecentErroredTools(e) {
  let terminalMcpTools = getTerminalMcpTools();
  let r = new Set();
  for (let s of e)
    if (s.type === "user" && Array.isArray(s.message.content)) {
      for (let h of s.message.content)
        if (h.type === "tool_result" && h.is_error === true) r.add(h.tool_use_id);
    }
  for (let j = e.length - 1; j >= 0; j--) {
    let h = e[j];
    if (h.type !== "assistant") continue;
    for (let y of h.message.content.toReversed()) {
      if (y.type !== "tool_use") continue;
      if (isExactReplToolName(y.name))
        return {
          row: j,
          id: y.id,
          shown: false,
        };
      if (r.has(y.id)) continue;
      if (nameEndsWithAny(y.name, mapped_2))
        return {
          row: j,
          id: y.id,
          shown: false,
        };
      if (nameEndsWithAny(y.name, mapped))
        return {
          row: j,
          id: y.id,
          shown: true,
        };
      if (!terminalMcpTools.has(y.name) || nameEndsWithAny(y.name, COORDINATOR_TOOL_SUFFIXES)) continue;
      if (!nameEndsWithAny(y.name, COORDINATOR_TOOL_NAMES))
        return {
          row: j,
          id: y.id,
          shown: true,
        };
      if (
        !parseChecklistText(textFromTaskCreateInput(y) ?? "").items.some(
          (item) => item.status !== "completed",
        )
      )
        return {
          row: j,
          id: y.id,
          shown: false,
        };
    }
  }
  return;
}
//@ chunk-ha3km179.js:78323-78844 placement
/**
 * 是否为自动任务通知（定时触发、会话任务）。
 */
function isAutomatedNotification(e, n) {
  if (e !== undefined && e.kind !== "task-notification") return false;
  if (e?.subkind === "scheduled-trigger" || e?.producer === "session-task") return true;
  if (e?.subkind !== undefined) return false;
  if (
    e === undefined &&
    n.type === "user" &&
    n.isMeta === true &&
    (n.turnOrigin === undefined || n.turnOrigin === "scheduled")
  )
    return true;
  let r =
    n.type === "user"
      ? getContentText(n.message.content)
      : n.type === "attachment" && n.attachment.type === "queued_command"
        ? getContentText(n.attachment.prompt)
        : null;
  if (r === null) return false;
  let externalEventWake = parseExternalEventWake(r);
  return externalEventWake === null
    ? isGeneratedToolCountSummary(r)
    : !isSessionInboxWake(externalEventWake) &&
        (externalEventWake.from === undefined || externalEventWake.from === "system");
}
//@ chunk-ha3km179.js:78844-79310 placement
/**
 * 回合是否只有等待类调用。
 */
function hasOnlyWaitCalls(e) {
  let n = new Set();
  for (let r of e)
    if (r.type === "assistant")
      for (let s of r.message.content) {
        if (s.type !== "tool_use") continue;
        if (s.name === FETCH_INBOX_MESSAGE_TOOL_NAME) return false;
        if (s.name === READNOTIFICATIONS) n.add(s.id);
      }
    else if (r.type === "user" && Array.isArray(r.message.content))
      for (let s of r.message.content) {
        if (s.type !== "tool_result" || !n.delete(s.tool_use_id)) continue;
        let h = TOOL_RESULT_NOTIFICATIONS_SCHEMA().safeParse(r.toolUseResult);
        if (
          !h.success ||
          !h.data.notifications.every((notification) =>
            REPORTING_NOTIFICATION_ORIGINS.has(notification.origin),
          )
        )
          return false;
      }
  return n.size === 0;
}
//@ chunk-ha3km179.js:79416-79488 placement
/**
 * 惰性加载的两个 chunk 模块引用。
 */
var lazyChunkCv3 = require("./chunk-cv3kgbt2.js");
var lazyChunkVsw = require("./chunk-vswknp5v.js");
//@ chunk-ha3km179.js:79488-79526 placement
/**
 * 取已排队的对等消息数量。
 */
var getQueuedPeerMessageCount = require("./chunk-wpq8yj9g.js");
//@ chunk-18hwfzwa.js:1655060-1655107 fingerprint = snapshot (0.673)
/**
 * {status:null,next:null}。旧版名 snapshot 为错配。
 */
var EMPTY_LIMIT_NOTICES = Object.freeze({
  status: null,
  next: null,
});
//@ chunk-18hwfzwa.js:1661253-1661334 fingerprint = isSlashCommand (1)
/**
 * 值以 / 开头的命令；peer/slack 来源且 skipSlashCommands 时不算。
 */
function isSlashCommand(cmd) {
  if (cmd.skipSlashCommands && isPeerOrSlackPing(cmd.origin)) return false;
  return looksLikeSlashInput(cmd.value);
}
//@ chunk-0sfjpx19.js:15971-16045 fingerprint = enqueuePendingNotification (0.592)
/**
 * 已验证的 Slack 人类消息且优先级为 later。旧版名 enqueuePendingNotification 为错配。
 */
function isSlackLaterNotification(command) {
  return command.verifiedSlackHumanTurn === true && command.priority === "later";
}
export {
  commandQueueManager,
  getProcessedQueuedCommands,
  dequeueAllMatching,
  enqueueCommand,
  flushPeerDropReceipts,
  isSlackLaterNotification,
  isMainAgentCommand,
  getSchedulingPlugin,
  emitDiscardedCommand,
  removeQueuedByFilter,
  isFoldInFlight,
  receiptQueuedProbe,
  inFlightDrainProbe,
  getCommandQueue,
  isRefillableInput,
  enqueuePendingNotification,
  getCommandQueueSnapshot,
  isSendableQueuedCommand,
  isPassiveMainAgentCommand,
  commandsDiscardedSignal,
  inputDisplayText,
  isCheckinNotification,
  processQueuedCommands,
  isSlashCommand_2,
  shouldPrependModeChar,
  hasRefillableMainAgentCommand,
  isNonHumanQueuedCommand,
  splitStampedImages,
  hasModeCharCommand,
  hasQueuedTaskNotification,
  takeDiscardedNotice,
  hasQueuedQueryingTaskNotification,
  recheckCommandQueue,
  isActiveMainAgentCommand,
  firstSchedulingPlugin,
  textNotTypedFlags,
  isRefillableCommand,
  isReplayableHistoryEntry,
  getRetainedPastedContents,
  extractImagesFromValue,
  normalizedQueueOrigin,
  queuedNotificationMode,
  shouldSkipQueueAttachments,
  queueInputFlags,
  EMPTY_LIMIT_NOTICES,
  isSlashCommand,
  sameSchedulingPlugin,
  filterQueuedCommandsForThread,
  isPromptModeQueuedCommand,
  createQueueFilterForThread,
  getValueFromInput,
  someInFlightDrainCommand,
  installCommandQueue,
  createMessageQueueManager,
  commandsConsumedSignal,
  peekQueuedCommand,
  WORKER_CHECKIN_ORIGIN,
  isGoalCheckinNotification,
  shownErroredToolRowId,
  logOperation,
  lazyChunkCv3,
  lazyChunkVsw,
  getQueuedPeerMessageCount,
  GOAL_CHECKIN_ORIGIN,
  enqueueReportingAdmission,
  enqueuePollEvent,
  isPollEventWakeInput,
  isPromptCapableMode,
  getMainThreadQueueLength,
};

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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
  randomUUID as randomUUID_18,
  randomUUID as randomUUID_19,
  randomUUID as randomUUID_20,
  randomUUID as randomUUID_21,
  randomUUID as randomUUID_22,
  randomUUID as randomUUID_23,
  randomUUID as randomUUID_24,
  randomUUID as randomUUID_25,
  randomUUID as randomUUID_26,
  randomUUID as randomUUID_27,
  randomUUID as randomUUID_28,
  randomUUID as randomUUID_29,
  randomUUID as randomUUID_30,
  randomUUID as randomUUID_31,
  randomUUID as randomUUID_32,
  randomUUID as randomUUID_33,
  randomUUID as randomUUID_34,
  randomUUID as randomUUID_35,
  randomUUID as randomUUID_36,
  randomUUID as randomUUID_37,
  randomUUID as randomUUID_38,
  randomUUID as randomUUID_39,
  randomUUID as randomUUID_40,
  randomUUID as randomUUID_41,
  randomUUID as randomUUID_42,
  randomUUID as randomUUID_43,
  randomUUID as randomUUID_44,
  randomUUID as randomUUID_45,
  randomUUID as randomUUID_46,
  randomUUID as randomUUID_47,
  randomUUID as randomUUID_48,
  randomUUID as randomUUID_49,
  randomUUID as randomUUID_50,
} from "crypto";
import {
  mainAgentId,
  isDiskless,
  onProcessRootHost,
  getSessionId,
  getRootSession,
} from "../bootstrap/state.js";
import {
  normalizeTaskNotificationOrigin,
  zfe,
  isBareTaskNotificationOrigin,
  qB,
} from "./backgroundSessionResume.js";
import { getQueuedNotificationMode } from "./attachments.js";
import { isTextNotTyped } from "../entrypoints/sdk/coreSchemas.js";
import { logFeatureOk, logFeatureSad, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { looksLikeSlashInput } from "../commands.js";
import { Jno, allUserTurnsSatisfy } from "./turnOrigin.js";
import { logForDebugging } from "./debug.js";
import { recordQueueOperation } from "./sessionStorage.js";
import { dropHopChain } from "./peerMessageHeaders.js";
import { isHumanOrAutoContinuation, isPeerOrSlackPing } from "./messageProvenance.js";
import { Qvt } from "./messages/messagePredicates.js";
import {
  Kv,
  selectPollEventBatch,
  JAt,
  OPe,
  oCt,
  vFe,
  QAt,
  kFe,
  jar,
  parsePollEventEnvelope,
  validatePollEvent,
  $vn,
  withEventNonce,
  kQo,
  discardPollEvent,
} from "./pollEvents.js";
import { Km } from "../plugins/functionHooks/dispatch/dispatchScope.js";
import { clearScheduledByPlugin } from "./workloadContext.js";
import { extractTextContent_2, getContentText } from "./messages.js";
import { isBase64ImageBlock as isBase64ImageBlock_3 } from "./imageValidation.js";
import {
  ZR,
  formatImageRef,
  zZ,
  groupByToObject,
  parsePastedRefs,
  n_n,
  expandPastedTextRefs_2,
} from "../history.js";
import { EKt } from "./historyFile.js";
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
import { ci } from "./swarm/hostState.js";
import { markReceiptQueued, Dli } from "../bridge/readReceipts.js";
import { C5t } from "../tools/AgentTool/handbackReport.js";
import { truncateMiddle as truncateMiddle_2 } from "../memdir/memoryTool.js";
import { Z9t } from "../constants/outputLimits.js";
import { getContextKey } from "./cwd.js";
import { getRunId } from "./task/taskNotifications.js";
import { shouldStampThreadState } from "./projectsThreadState.js";
import { buildPollEventEnvelope } from "./pollEvents/declarations.js";
import { E1r } from "../services/mcp/taskDelivery.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { ge } from "./identity.js";
import { to } from "./valueSlot.js";
import { Yn } from "./stripAnsi.js";
import { Rf, CHECKLIST_MARKER_STATUS, Af, fd } from "./tasks.js";
import { xle } from "../services/mcp/ccrMetaMcp.js";
import { NO_REPLY_TOOL_SUFFIX } from "../bridge/projectsReplyEvaluation.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, A, o } from "../../vendor/zod/v4/classic/schemas.js";
import { isMachineOnlyTurnRange } from "./messages/messageSource.js";
import { getTerminalMcpTools } from "./transcript/deserialize.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { S4 } from "../tools/REPLTool/constants.js";
import { parseExternalEventWake, isSessionInboxWake } from "./externalEventWake.js";
import { isGeneratedToolCountSummary } from "./permissions/yoloClassifier.js";
import { FETCH_INBOX_MESSAGE_TOOL_NAME } from "../tools/FetchInboxMessageTool/prompt.js";
import { READNOTIFICATIONS } from "../tools/ReadNotificationsTool/ReadNotificationsTool.js";

//@ chunk-e6aww6q8.js:193960-194054 placement
function x4s(e, n, r) {
  return e !== void 0 && e.mode === "poll-event" && (e.pollEvent?.wake === !0 || r) && !n;
}
//@ chunk-e6aww6q8.js:194054-194182 placement
function d1r(e, n) {
  return (
    e === "prompt" ||
    (e === "bash" && n === !0) ||
    e === "orphaned-permission" ||
    e === "task-notification" ||
    e === "poll-event"
  );
}
//@ chunk-e6aww6q8.js:194182-194221 placement
function $f(e) {
  return e.agentId === mainAgentId();
}
//@ chunk-e6aww6q8.js:194221-194278 placement
var P4s = { kind: "task-notification", source: "goal-checkin" };
//@ chunk-e6aww6q8.js:194278-194372 placement
function V3n(e) {
  return e.origin?.kind === "task-notification" && e.origin.source === "goal-checkin";
}
//@ chunk-e6aww6q8.js:194372-194431 placement
var tRt = { kind: "task-notification", source: "worker-checkin" };
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
  return $f(queuedCommands) && queuedCommands.mode === "task-notification";
}
//@ chunk-e6aww6q8.js:194657-194735 placement
function Ofn(e) {
  let n = e.queueOrigin ?? e.origin;
  return isCheckinNotification({ origin: n }) ? normalizeTaskNotificationOrigin(n) : n;
}
//@ chunk-e6aww6q8.js:194735-194783 placement
function PFo(e) {
  return e.queueMode ?? getQueuedNotificationMode(Ofn(e));
}
//@ chunk-e6aww6q8.js:194783-194874 placement
function xjt(e) {
  return e.queueSkipAttachments === !0 || PFo(e) === "task-notification" ? !0 : void 0;
}
//@ chunk-e6aww6q8.js:194874-195172 placement
function textNotTypedFlags(e, n) {
  if (!isTextNotTyped(e)) return;
  if ("text_not_typed" in e && e.text_not_typed === !0) logFeatureOk("input_text_not_typed");
  else logFeatureSad("input_text_not_typed", "malformed_mark");
  let flattened = (n?.writtenFiles ?? []).flatMap((s) => (s.inlined ? [] : [s.path]));
  return {
    textNotTyped: !0,
    skipSlashCommands: !0,
    ...(flattened.length > 0 && { ownFilePaths: flattened }),
  };
}
//@ chunk-e6aww6q8.js:195172-195424 placement
function Pjt(e) {
  if (e.handedOff !== !0 && e.textNotTyped !== !0)
    return e.queueSkipSlashCommands === !0 && looksLikeSlashInput(e.message.content)
      ? { skipSlashCommands: !0 }
      : void 0;
  return {
    textNotTyped: !0,
    noPersonArrived: !0,
    drainOnly: !0,
    ...(looksLikeSlashInput(e.message.content) && { skipSlashCommands: !0 }),
  };
}
//@ chunk-e6aww6q8.js:195506-195658 placement
function getSchedulingPlugin(e) {
  let { origin: origin } = e,
    r =
      origin?.kind === "plugin"
        ? origin.name
        : typeof origin === "object" && origin !== null && "plugin" in origin
          ? origin.plugin
          : void 0;
  return e.scheduledByPlugin ?? r;
}
//@ chunk-e6aww6q8.js:195658-195699 placement
function Dfn(e, n) {
  return getSchedulingPlugin(e) === getSchedulingPlugin(n);
}
//@ chunk-e6aww6q8.js:195699-195774 placement
function Y3n(e) {
  return e.some(Jno) ? void 0 : e.map(getSchedulingPlugin).find((n) => n !== void 0);
}
//@ chunk-e6aww6q8.js:195774-195858 placement
class nRt {
  current = null;
  register(e) {
    this.current = e;
  }
  registered() {
    return this.current;
  }
}
//@ chunk-e6aww6q8.js:195858-195874 placement
var rRt = new nRt();
//@ chunk-e6aww6q8.js:195874-195906 placement
function sRt(e) {
  rRt.register(e);
}
//@ chunk-e6aww6q8.js:195906-195945 placement
function zzt() {
  return rRt.registered();
}
/**
 * {now:0, next:1, later:2}。
 */
//@ chunk-e6aww6q8.js:552455-552644 fingerprint = PRIORITY_ORDER (0.375)
var recordQueueOperation_2 = (e) => {
    if (isDiskless()) {
      logForDebugging(
        `Diskless session: queue operation '${e.operation}' not recorded: the default queue has no storage backend`,
        { level: "warn" },
      );
      return;
    }
    recordQueueOperation(e);
  },
  PRIORITY_ORDER = { now: 0, next: 1, later: 2 };
//@ chunk-e6aww6q8.js:552644-552709 placement
function WBe(e) {
  return e?.kind === "peer" && e.senderTaskId === void 0;
}
//@ chunk-e6aww6q8.js:552709-552979 placement
function AIt(e) {
  if (!WBe(e.origin)) return e;
  let n = e.value;
  if (typeof n === "string") {
    let h = dropHopChain(n);
    return h === n ? e : { ...e, value: h };
  }
  let r = !1,
    mapped = n.map((h) => {
      if (h.type !== "text") return h;
      let y = dropHopChain(h.text);
      if (y === h.text) return h;
      return ((r = !0), { ...h, text: y });
    });
  return r ? { ...e, value: mapped } : e;
}
//@ chunk-e6aww6q8.js:552979-553049 placement
function xIt(e) {
  return e.verifiedPeerPid !== void 0 || e.from !== "unknown";
}
//@ chunk-e6aww6q8.js:553049-553101 placement
var NON_EDITABLE_MODES = new Set(["task-notification", "poll-event"]);
//@ chunk-e6aww6q8.js:553101-553135 placement
function isPromptInputModeEditable(mode) {
  return !NON_EDITABLE_MODES.has(mode);
}
//@ chunk-e6aww6q8.js:553135-553216 placement
function e7n(e) {
  return e.historyEntry !== void 0 && Up(e) && typeof e.value === "string";
}
//@ chunk-e6aww6q8.js:553216-553284 placement
function Up(e) {
  return isPromptInputModeEditable(e.mode) && !e.isMeta && isHumanOrAutoContinuation(e.origin) && !Qvt(e);
}
//@ chunk-e6aww6q8.js:553284-553337 placement = prependModeCharacterToInput (1)
function shouldPrependModeChar(input, mode) {
  return Up(input) && (mode || input.mode !== "bash");
}
//@ chunk-e6aww6q8.js:553337-553478 placement
function hasPreExpansionText(e) {
  return (
    (e.skipSlashCommands === !0 || e.pasteTagged === !0) &&
    typeof e.preExpansionValue === "string" &&
    e.preExpansionValue.trim() !== ""
  );
}
//@ chunk-e6aww6q8.js:553478-553551 placement
function REt(e) {
  if (hasPreExpansionText(e)) return e.preExpansionValue;
  return extractTextFromValue(e.value);
}
//@ chunk-e6aww6q8.js:553551-553697 placement
function getRetainedPastedContents(e) {
  if (!e.pastedContents) return [];
  let n = hasPreExpansionText(e);
  return Object.values(e.pastedContents).filter((r) => r.type === "image" || r.inline === !0 || n);
}
//@ chunk-e6aww6q8.js:553697-553872 placement
function isNonHumanQueuedCommand(e, n) {
  let r = e.origin?.kind;
  if (
    (r === "task-notification" && !(zfe(e.origin) && isBareTaskNotificationOrigin(e.origin))) ||
    r === "auto-continuation" ||
    r === "plugin"
  )
    return !0;
  return qB(e.origin, n) || Up(e);
}
//@ chunk-e6aww6q8.js:553872-553916 placement
function im(e) {
  return $f(e) && e.passive !== !0;
}
//@ chunk-e6aww6q8.js:553916-553953 placement
function Ffe(e) {
  return im(e) && !Kv(e);
}
//@ chunk-e6aww6q8.js:554106-554154 placement
function Oq(e) {
  return e.passive === !0 && $f(e) && !0;
}
//@ chunk-e6aww6q8.js:554154-554211 placement = isSlashCommand (1)
function isSlashCommand_2(cmd) {
  return looksLikeSlashInput(cmd.value) && !cmd.skipSlashCommands;
}
//@ chunk-e6aww6q8.js:554211-554290 placement = getValueFromInput (1)
function getValueFromInput(e, n) {
  Km(() => {
    if (n && e.some((s) => s.mode === "prompt" && Jno(s))) clearScheduledByPlugin();
  });
}
//@ chunk-e6aww6q8.js:554290-554470 placement
function filterQueuedCommandsForThread(e, { isMainThread: isMainThread, currentAgentId: currentAgentId }) {
  let filtered = e.filter((h) => {
    if (isSlashCommand_2(h)) return !1;
    if (isMainThread) return $f(h);
    return (h.mode === "task-notification" || !1) && h.agentId === currentAgentId;
  });
  return dedupePollEvents(filtered);
}
//@ chunk-e6aww6q8.js:554470-554577 placement
function createQueueFilterForThread(e) {
  return e.isMainThread
    ? im
    : (n) => filterQueuedCommandsForThread([n], { isMainThread: !1, currentAgentId: e.agentId }).length > 0;
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
  return $f(input) && input.mode === "prompt";
}
//@ chunk-e6aww6q8.js:554815-554844 placement
function jse(e) {
  return Up(e);
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
/**
 * 从内容块中取出 base64 图片为 paste 记录（id、mediaType、filename）。
 */
//@ chunk-e6aww6q8.js:554899-555159 fingerprint = extractImagesFromValue (0.858)
function extractImagesFromValue(value, startId) {
  if (typeof value === "string") return [];
  let images = [],
    imageIndex = 0;
  for (let block of value)
    if (isBase64ImageBlock_3(block) && block.type === "image") {
      let media_type = block.source.media_type;
      (images.push({
        id: startId + imageIndex,
        type: "image",
        content: block.source.data,
        mediaType: typeof media_type === "string" ? media_type : void 0,
        filename: `image${imageIndex + 1}`,
      }),
        imageIndex++);
    }
  return images;
}
/**
 * 图片块按是否有原 paste id 分成 stamped / manufactured。
 */
//@ chunk-e6aww6q8.js:555159-555410 layout
function splitStampedImages(e, n) {
  let r = {},
    s = {};
  return (
    e.forEach((h, y) => {
      if (!isBase64ImageBlock_3(h)) return;
      let S = n?.[y],
        w = S ?? y + 1,
        media_type = h.source.media_type,
        G = S !== void 0 ? r : s;
      G[w] = {
        id: w,
        type: "image",
        content: h.source.data,
        mediaType: typeof media_type === "string" ? media_type : void 0,
      };
    }),
    { stamped: r, manufactured: s }
  );
}
/**
 * 可编辑命令弹回输入框：图片换成 [Image #n] 引用并重新编号。
 */
//@ chunk-e6aww6q8.js:555410-555554 callgraph-fingerprint = popAllEditable (0.232)
function popAllEditable(e, n, r, s) {
  let mapped = extractImagesFromValue(n, 0).map((cmd) => ({ ...cmd, id: ZR(r, s) }));
  return {
    text: [...mapped.map((cmd) => formatImageRef(cmd.id)), e].filter(Boolean).join(" "),
    images: mapped,
  };
}
//@ chunk-e6aww6q8.js:555554-555706 placement
function joinWithCursor(e, n, r) {
  if (!e) return { text: n, cursorOffset: r };
  if (!n) return { text: e, cursorOffset: e.length + r };
  return {
    text: `${e}
${n}`,
    cursorOffset: e.length + 1 + r,
  };
}
//@ chunk-e6aww6q8.js:555706-555864 placement
function OIt(e) {
  let { promptSubmitted: promptSubmitted, value: r } = e;
  return (
    promptSubmitted === void 0 ||
    e.screeningPending === !0 ||
    e.screeningOwed === !0 ||
    promptSubmitted.stopped !== void 0 ||
    EKt(r, promptSubmitted.text) !== void 0
  );
}
//@ chunk-e6aww6q8.js:555864-555932 placement
var Kmo = new HostScoped(() => ({ commandsDiscarded: createSignal(), commandsConsumed: createSignal() }));
//@ chunk-e6aww6q8.js:555932-555962 placement
function GBe() {
  return onProcessRootHost(Kmo);
}
//@ chunk-e6aww6q8.js:555962-556037 placement
var bVe = createLazySignal(() => GBe().commandsDiscarded),
  lhn = createLazySignal(() => GBe().commandsConsumed);
//@ chunk-e6aww6q8.js:556037-556126 placement
function IIt(e) {
  return e.queuedUnder ?? (e.origin?.kind === "plugin" ? [e.origin.name] : void 0);
}
//@ chunk-e6aww6q8.js:556126-556148 placement
var BBe = { admitted: !0 };
/**
 * 创建消息队列管理器：入队、暂扣、钩子丢弃、交回等操作。
 */
//@ chunk-e6aww6q8.js:556148-576253 placement
function createMessageQueueManager(e) {
  let n = e?.recordOperation ?? createQueueRecorder(recordQueueOperation_2),
    r = GBe();
  function s(wr, zs, li, nl, Tl, kd) {
    let na = {
      type: "queue-operation",
      operation: wr,
      timestamp: new Date().toISOString(),
      sessionId: getSessionId(),
      ...(zs !== void 0 && { content: zs }),
      ...(li !== void 0 && { reason: li }),
      ...(nl !== void 0 && { commandUuid: nl }),
      ...(Tl !== void 0 && { deliveryId: Tl }),
    };
    if (kd === void 0) n(na);
    else n(na, kd);
  }
  function h(wr, zs) {
    s(wr, queueRecordText(zs), void 0, void 0, void 0, IIt(zs));
  }
  let y = [...(e?.adopt ?? [])],
    freeze = Object.freeze([...y]),
    w = createSignal(),
    L = createSignal(),
    G = createSignal();
  zZ(() => y.filter(Up).map(REt));
  let q = new Set(),
    Z = new Set(),
    Se = 256;
  function ke() {
    ((freeze = Object.freeze([...y])), w.emit());
  }
  let we;
  function Ee(wr) {
    if (we === void 0 || wr.passive === !0 || !we.holds(wr)) return !1;
    return ((wr.passive = !0), we.marked.add(wr), !0);
  }
  function Ae(wr) {
    if (we !== void 0)
      throw Error(
        "holdBack: this message queue already has a hold; end it with the function the first call returned before setting another",
      );
    let zs = { holds: wr, marked: new Set() };
    we = zs;
    try {
      if (count(y, Ee) > 0) ke();
    } catch (error) {
      if (we === zs) we = void 0;
      for (let nl of zs.marked) delete nl.passive;
      throw error;
    }
    return () => {
      if (we !== zs) return 0;
      we = void 0;
      let filtered = y.filter((Tl) => zs.marked.has(Tl));
      if (filtered.length === 0) return 0;
      let filtered_2 = y.filter((Tl) => !zs.marked.has(Tl));
      for (let Tl of filtered) delete Tl.passive;
      return ((y.length = 0), y.push(...filtered_2, ...filtered), ke(), filtered.length);
    };
  }
  function Ie(wr) {
    let zs = we?.marked,
      filtered = y.filter((nl) => zs?.has(nl) === !0 && wr(nl));
    for (let nl of filtered) (delete nl.passive, zs?.delete(nl));
    if (filtered.length > 0) ke();
    return filtered.length;
  }
  function Me(wr, zs) {
    if (q.delete(wr)) q.add(wr);
    else {
      if (zs?.terminalEmitted !== !0 && q.size >= Se) {
        let li;
        for (let nl of q)
          if (!Z.has(nl)) {
            li = nl;
            break;
          }
        if (li !== void 0) q.delete(li);
      }
      q.add(wr);
    }
    if (zs?.terminalEmitted !== !0) return !1;
    if (Z.has(wr)) return !1;
    return (Z.add(wr), !0);
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
    for (let zs of wr) if ((Je.add(zs), zs.uuid !== void 0)) Je.add(zs.uuid);
  }
  function pt(wr) {
    for (let zs of wr) if ((Je.delete(zs), zs.uuid !== void 0)) Je.delete(zs.uuid);
  }
  function Et(wr) {
    return Je.has(wr);
  }
  let yt = new Map();
  function gt(wr) {
    if (wr === void 0) return { withdrawn: () => !1, [Symbol.dispose]: () => {} };
    let zs = { withdrawn: !1 };
    return (
      yt.set(wr, zs),
      {
        withdrawn: () => zs.withdrawn,
        [Symbol.dispose]: () => {
          if (yt.get(wr) === zs) yt.delete(wr);
        },
      }
    );
  }
  function At(wr) {
    let zs = yt.get(wr);
    if (zs === void 0 || zs.withdrawn) return !1;
    return ((zs.withdrawn = !0), !0);
  }
  let It = !1,
    Yt;
  function qt() {
    if (It) return;
    ((It = !0), ke());
  }
  function Zt(wr, zs) {
    return no(
      y.find((li) => li.uuid === wr && li.screeningPending === !0),
      zs,
    );
  }
  function rn(wr, zs) {
    return no(y.includes(wr) ? wr : void 0, zs);
  }
  function pn(wr) {
    let filtered = wr.filter(e7n);
    if (filtered.length === 0) return;
    try {
      G.emit(filtered);
    } catch (error) {
      if (isAbortError(error)) logForDebugging(`typedHandedBack listener aborted: ${error}`);
      else logError(error);
    }
  }
  function no(wr, zs) {
    if (wr === void 0) return !1;
    if ("dropped" in zs) return (Di([wr], { reason: "dropped_by_hook" }), !0);
    let li = wr.screeningPending === !0;
    if (
      (delete wr.screeningPending,
      (wr.promptSubmitted = zs.promptSubmitted),
      (wr.drainOnly = zs.drainOnly),
      zs.promptSubmitted === void 0)
    )
      wr.screeningOwed = !0;
    else delete wr.screeningOwed;
    if ((ke(), li && !wr.unlogged)) h("enqueue", wr);
    return !0;
  }
  function hn(wr) {
    let found = y.find((li) => li.uuid === wr);
    if (found === void 0 || found.priority === "now" || Je.has(wr)) return !1;
    return ((found.priority = "now"), ke(), !0);
  }
  function ho(wr, zs) {
    let found = y.find((nl) => nl.uuid === wr);
    if (found === void 0 || found.priority !== "now") return !1;
    return ((found.priority = zs), ke(), !0);
  }
  function yn() {
    return It || isTerminalShutdown();
  }
  let Kn = null,
    Xn;
  function fo(wr) {
    ((Kn = wr), (Xn = void 0));
  }
  function To(wr) {
    if (wr === void 0 || Kn === wr) ((Kn = null), (Xn = void 0));
  }
  function bo(wr) {
    return Kn !== null && Kn.some(wr);
  }
  let vn = new Set();
  function co(wr) {
    return (
      vn.add(wr),
      {
        [Symbol.dispose]: () => {
          vn.delete(wr);
        },
      }
    );
  }
  function So(wr) {
    for (let zs of vn) if (wr(zs)) return !0;
    return !1;
  }
  function ko(wr) {
    let zs = new Set(wr.map((nl) => nl.uuid));
    for (let nl of vn) if (nl.uuid !== void 0 && zs.has(nl.uuid)) vn.delete(nl);
    let flattened = (Kn ?? []).flatMap((nl) => (nl.uuid === void 0 ? [] : [nl.uuid]));
    if (flattened.length > 0 && Xn !== "appended")
      Xn = flattened.some((nl) => zs.has(nl)) ? "appended" : "passed-over";
  }
  function un() {
    return Xn;
  }
  let resolved = Promise.resolve();
  function $o() {
    let wr = resolved,
      zs;
    return (
      (resolved = new Promise((li) => {
        zs = li;
      })),
      { prior: wr, release: zs }
    );
  }
  function yo() {
    return freeze;
  }
  function Ho() {
    return [...y];
  }
  function rr() {
    return y.length;
  }
  function br() {
    return count(y, Ffe);
  }
  function Hr() {
    return br() + count(y, (wr) => we?.marked.has(wr) === !0);
  }
  function Fr() {
    return y.length > 0;
  }
  function cs() {
    return y.some((wr) => !Kv(wr) && wr.passive !== !0);
  }
  function _r() {
    if (y.length > 0) ke();
  }
  let Cr = createHopGuard({}, getPeerGuardLimits),
    Vr = e?.dropReceiptTrailMs === void 0 ? {} : { trailMs: e.dropReceiptTrailMs },
    Oo = createPeerDropLogger(Vr);
  function jr() {
    ((Cr = createHopGuard({}, getPeerGuardLimits)), Oo.dispose(), (Oo = createPeerDropLogger(Vr)));
  }
  function Or(wr) {
    return Oo.flushPendingReceipts(wr);
  }
  function Io() {
    let wr = (li) => WBe(li.origin),
      zs = 0;
    return (
      Km(() => {
        zs = chn.get()?.(wr) ?? 0;
      }),
      count(y, wr) + zs
    );
  }
  function zo(wr, zs = "coalesced") {
    let origin = wr.origin;
    if (!WBe(origin)) return BBe;
    let nl = wr.admissionExempt === "resurrected";
    if (!nl && !xIt(origin)) {
      let checkHopChain = Cr.checkHopChain(origin.hopChain, ownHopTokens());
      if (checkHopChain && !checkHopChain.admitted) {
        if (
          (Oo.report({
            reason: checkHopChain.reason,
            from: origin.from,
            ...(origin.name !== void 0 && { name: origin.name }),
          }),
          zs === "coalesced")
        )
          rs(wr, checkHopChain.reason);
        return { admitted: !1, reason: checkHopChain.reason };
      }
    }
    if (!nl && xIt(origin)) {
      let Tl = typeof wr.value === "string" ? wr.value : extractTextContent_2(wr.value),
        admit = Cr.admit({
          senderKey: origin.from !== "unknown" ? `from:${origin.from}` : `pid:${origin.verifiedPeerPid}`,
          body: Tl,
          hopChain: origin.hopChain,
          ownTokens: ownHopTokens(),
        });
      if (!admit.admitted) {
        if (
          (Oo.report({
            reason: admit.reason,
            from: origin.from,
            ...(origin.name !== void 0 && { name: origin.name }),
          }),
          zs === "coalesced")
        )
          rs(wr, admit.reason);
        return { admitted: !1, reason: admit.reason };
      }
    }
    if (!nl && Io() >= getPeerGuardLimits().maxQueuedPeerMessages) {
      if (
        (Oo.report({
          reason: "queue-full",
          from: origin.from,
          ...(origin.name !== void 0 && { name: origin.name }),
        }),
        zs === "coalesced")
      )
        rs(wr, "queue-full");
      return { admitted: !1, reason: "queue-full" };
    }
    return (logFeatureOk("peer_loop_guard"), BBe);
  }
  function rs(wr, zs) {
    let origin = wr.origin;
    if (
      origin?.kind !== "peer" ||
      parseAddress(origin.from).scheme !== "uds" ||
      !ci().inbound.sendPeerReceipt
    )
      return;
    Oo.noteDropForReceipt(`${origin.from}\x00${origin.verifiedPeerPid ?? ""}\x00${zs}`, origin.msg_id, (nl) =>
      ci().inbound.sendPeerReceipt?.(wr, "dropped", { dropReason: zs, droppedMsgIds: nl }),
    );
  }
  function Es(wr, zs) {
    let li = !1;
    return (
      Km(() => {
        let nl = () => Sd([wr]);
        if (((li = dhn.get()?.(wr, zs, nl) === !0), li)) markReceiptQueued(wr.uuid);
      }),
      li
    );
  }
  function Nr(wr, { receipt: zs = "coalesced", ahead: li = !1 } = {}) {
    let nl = zo(wr, zs);
    if (!nl.admitted) return nl;
    let Tl = {
        ...AIt(wr),
        priority: wr.priority ?? "next",
        timestamp: wr.timestamp ?? new Date().toISOString(),
      },
      kd = () => Is(wr, Tl, li);
    if (!Es(Tl, kd)) kd();
    return BBe;
  }
  function Is(wr, zs, li) {
    if ((Ee(zs), li)) y.unshift(zs);
    else y.push(zs);
    if (
      wr.origin?.kind === "peer" &&
      wr.origin.handback === !0 &&
      wr.origin.senderTaskId !== void 0 &&
      wr.admissionExempt !== "resurrected"
    )
      C5t({
        sender: wr.origin.senderTaskId,
        recipient: wr.agentId,
        senderName: wr.origin.from,
        flagged: wr.origin.flagged === !0,
      });
    if ((markReceiptQueued(wr.uuid), ke(), !wr.unlogged && wr.screeningPending !== !0)) h("enqueue", wr);
  }
  function fs(wr) {
    Nr(wr);
  }
  function as(wr, { turnAttribution: zs = "none" } = {}) {
    if (!zo(wr).admitted) return;
    let li = wr;
    if (wr.mode === "task-notification" && typeof wr.value === "string") {
      let Ac = truncateMiddle_2(wr.value, Z9t);
      if (Ac !== wr.value)
        (logForDebugging(
          `enqueuePendingNotification: task-notification capped from ${wr.value.length} to ${Ac.length} chars`,
          { level: "warn" },
        ),
          (li = { ...wr, value: Ac }));
    }
    let nl =
      wr.inheritedTurnAttributionKey ??
      (zs === "inherit" && wr.mode === "task-notification" ? getContextKey() : void 0);
    if (
      zs === "inherit" &&
      wr.mode === "task-notification" &&
      (li.origin === void 0 || li.origin.kind === "task-notification")
    )
      li = { ...li, origin: { ...(li.origin ?? { kind: "task-notification" }), producer: "session-task" } };
    let Tl =
      wr.mode === "task-notification" && wr.taskId !== void 0 ? (wr.runId ?? getRunId(wr.taskId)) : void 0;
    if (Tl !== void 0) li = { ...li, runId: Tl };
    let kd =
        wr.stampThreadState ??
        (wr.mode === "task-notification" &&
          wr.handbackPointer !== !0 &&
          im(wr) &&
          shouldStampThreadState({ isPeer: !1 })),
      na = {
        ...AIt(li),
        priority: wr.priority ?? "later",
        timestamp: wr.timestamp ?? new Date().toISOString(),
        ...(nl && { inheritedTurnAttributionKey: nl }),
        ...(kd && { stampThreadState: !0 }),
      },
      em = () => {
        if ((Ee(na), y.push(na), ke(), !wr.unlogged)) s("enqueue", queueRecordText(li));
      };
    if (!Es(na, em)) em();
  }
  async function Vi(wr) {
    Wi(1);
    let { command: command, delivered: delivered } = ii(wr, void 0);
    return (y.push(command), ke(), s("enqueue", command.pollEvent?.envelope), delivered);
  }
  async function ji(wr) {
    if ((Wi(wr.length), wr.length === 0 || wr.length > JAt || wr.some((kd) => kd.wake === !1)))
      throw (
        logFeatureBad("poll_event_delivery", "group_refused"),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `poll event rejected: a group holds 1 to ${JAt} events, none of them wake: false`,
          "poll event rejected: group shape",
        )
      );
    let zs = randomUUID_6(),
      mapped = wr.map((kd) => ii(kd, zs)),
      reduced = mapped.reduce(
        (kd, { command: command }) => kd + Buffer.byteLength(command.pollEvent?.envelope ?? "", "utf8"),
        0,
      );
    if (reduced > OPe)
      throw (
        logFeatureBad("poll_event_delivery", "group_too_large"),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `poll event rejected: the group is ${reduced} bytes after nonce stamping (cap ${OPe})`,
          "poll event rejected: group too large",
        )
      );
    let reduced_2 = wr.reduce((kd, na) => kd + (na.declared === void 0 ? 0 : oCt(na.declared.fields)), 0);
    if (reduced_2 > OPe)
      throw (
        logFeatureBad("poll_event_delivery", "group_too_large"),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `poll event rejected: the group's fields are ${reduced_2} bytes as sent (cap ${OPe})`,
          "poll event rejected: group too large",
        )
      );
    (y.push(...mapped.map(({ command: command }) => command)), ke());
    for (let { command: command } of mapped) s("enqueue", command.pollEvent?.envelope);
    await Promise.all(mapped.map(({ delivered: delivered }) => delivered));
  }
  function Wi(wr) {
    let zs = count(y, Kv);
    if (zs + wr > vFe)
      throw (
        logFeatureBad("poll_event_delivery", "queue_cap"),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          wr === 1
            ? `poll event rejected: ${vFe} events already queued`
            : `poll event rejected: the queue holds at most ${vFe} events (${zs} queued, ${wr} arriving)`,
          "poll event rejected: queue depth cap",
        )
      );
  }
  function ii(wr, zs) {
    if (!QAt(wr.kind))
      throw (
        logFeatureBad("poll_event_delivery", "invalid_kind"),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          "poll event rejected: invalid kind (a lowercase letter, then lowercase letters, digits and hyphens, at most 64 characters)",
          "poll event rejected: invalid kind",
        )
      );
    if (kFe(wr.kind) && wr.allowReservedKind !== !0)
      throw (
        logFeatureBad("poll_event_delivery", "reserved_kind"),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `poll event rejected: kind "${wr.kind}" is reserved for a trusted in-process producer`,
          "poll event rejected: reserved kind",
        )
      );
    let li,
      nl = "element",
      Tl;
    if (wr.element !== void 0) {
      if (wr.content !== void 0 || wr.declared !== void 0)
        throw Error("poll event: pass one of content, element, declared");
      let byteLength = Buffer.byteLength(wr.element, "utf8");
      if (byteLength > jar(wr.kind))
        throw (
          logFeatureBad("poll_event_delivery", "envelope_too_large"),
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `poll event rejected: envelope is ${byteLength} bytes (cap ${jar(wr.kind)})`,
            "poll event rejected: envelope too large",
          )
        );
      let Rf = parsePollEventEnvelope(wr.element);
      if (!Rf.ok)
        throw (
          logFeatureBad("poll_event_delivery", "validation_failed"),
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `poll event rejected: ${Rf.reason}`,
            "poll event rejected: element failed validation",
          )
        );
      if (Rf.kind !== wr.kind)
        throw (
          logFeatureBad("poll_event_delivery", "kind_mismatch"),
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `poll event rejected: element kind "${Rf.kind}" does not match declared kind "${wr.kind}"`,
            "poll event rejected: kind mismatch",
          )
        );
      li = wr.element;
    } else if (wr.declared !== void 0) {
      if (wr.content !== void 0) throw Error("poll event: pass one of content, element, declared");
      let np = buildPollEventEnvelope(wr.declared);
      if (!np.ok || wr.declared.declaration.kind !== wr.kind)
        throw (
          logFeatureBad("poll_event_delivery", "fields_invalid"),
          new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
            `poll event rejected: ${np.ok ? "declaration is for another kind" : np.reason}`,
            "poll event rejected: fields failed validation",
          )
        );
      ((li = np.envelope), (nl = "json"), (Tl = { at: wr.declared.at, fields: np.fields }));
    } else if (wr.content !== void 0)
      li = validatePollEvent({ kind: wr.kind, at: new Date().toISOString(), content: wr.content });
    else throw Error("poll event: content, element or declared is required");
    let kd = $vn();
    li = withEventNonce(li, kd, nl);
    let byteLength = Buffer.byteLength(li, "utf8");
    if (byteLength > jar(wr.kind))
      throw (
        logFeatureBad("poll_event_delivery", "envelope_too_large"),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `poll event rejected: envelope is ${byteLength} bytes after nonce stamping (cap ${jar(wr.kind)})`,
          "poll event rejected: envelope too large",
        )
      );
    let em = wr.wake ?? !0,
      Ac,
      tp,
      promise = new Promise((np, Rf) => {
        ((Ac = np), (tp = Rf));
      });
    return {
      command: {
        value: li,
        mode: "poll-event",
        agentId: mainAgentId(),
        priority: em ? "next" : "later",
        uuid: randomUUID_6(),
        isMeta: !0,
        ...!1,
        timestamp: new Date().toISOString(),
        pollEvent: {
          kind: wr.kind,
          envelope: li,
          ...!1,
          ...(wr.media !== void 0 && wr.media.length > 0 && { media: wr.media }),
          ...!1,
          ...!1,
          ...!1,
          wake: em,
          ...!1,
          ...!1,
          settleDelivered: Ac,
          settleDropped: tp,
          provenance: wr.provenance,
          ...(Tl !== void 0 && { declared: Tl }),
          ...(zs !== void 0 && { group: zs }),
        },
      },
      delivered: promise,
    };
  }
  function wa(wr) {
    let filtered = y.filter((kd) => kQo(kd, wr));
    if (filtered.length === 0) return { commands: [], remainingWakeCount: 0 };
    let li = selectPollEventBatch(filtered),
      nl = new Set(li),
      filtered_2 = y.filter((kd) => !nl.has(kd));
    ((y.length = 0), y.push(...filtered_2), ke());
    for (let kd of nl) if (!kd.unlogged) s("dequeue");
    return { commands: li, remainingWakeCount: jo(wr) };
  }
  let hr = new Set();
  function mi(wr) {
    if (hr.has(wr)) return !1;
    return (hr.add(wr), !0);
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
    if (($a--, $a === 0))
      try {
        w.emit();
      } catch (error) {
        if (isAbortError(error)) logForDebugging(`queueChanged listener aborted: ${error}`);
        else logError(error);
      }
  }
  function Vs() {
    return $a;
  }
  function _i(wr) {
    let zs = wr.find(Kv)?.agentId,
      li = count(wr, (nl) => nl.pollEvent?.wake === !0);
    return Math.max(
      0,
      count(
        y,
        (nl) => nl.mode === "poll-event" && nl.agentId === (zs ?? mainAgentId()) && nl.pollEvent?.wake === !0,
      ) - li,
    );
  }
  function jo(wr) {
    return count(y, (zs) => kQo(zs, wr) && zs.pollEvent?.wake === !0);
  }
  function Qr(wr) {
    if (y.length === 0) return;
    let zs = -1,
      li = 1 / 0;
    for (let Tl = 0; Tl < y.length; Tl++) {
      let kd = y[Tl];
      if (wr && !wr(kd)) continue;
      let na = PRIORITY_ORDER[kd.priority ?? "next"];
      if (na < li) ((zs = Tl), (li = na));
    }
    if (zs === -1) return;
    let [nl] = y.splice(zs, 1);
    if ((ke(), !nl.unlogged)) s("dequeue");
    return nl;
  }
  function fi() {
    if (y.length === 0) return [];
    let wr = [...y];
    ((y.length = 0), ke());
    for (let zs of wr) if (!zs.unlogged) s("dequeue");
    return wr;
  }
  function Ri(wr) {
    if (y.length === 0) return;
    let zs = -1,
      li = 1 / 0;
    for (let nl = 0; nl < y.length; nl++) {
      let Tl = y[nl];
      if (wr && !wr(Tl)) continue;
      let kd = PRIORITY_ORDER[Tl.priority ?? "next"];
      if (kd < li) ((zs = nl), (li = kd));
    }
    if (zs === -1) return;
    return y[zs];
  }
  function Ja(wr) {
    let zs = [],
      li = [];
    for (let nl of y)
      if (wr(nl)) zs.push(nl);
      else li.push(nl);
    if (zs.length === 0) return [];
    ((y.length = 0), y.push(...li), ke());
    for (let nl of zs) if (!nl.unlogged) s("dequeue");
    return zs;
  }
  function Di(wr, zs) {
    vs((li) => wr.includes(li), r.commandsDiscarded, zs?.reason);
  }
  let yr = e?.now ?? (() => Math.max(performance.timeOrigin + performance.now(), Date.now())),
    Kr,
    Li = new Set(),
    Qs = new Set();
  function Hi(wr, zs) {
    let li = vs((nl) => wr.includes(nl), r.commandsConsumed, zs.reason);
    if (zs.reason === "absorbed_mid_turn")
      for (let nl of li) {
        if (nl.mode !== "prompt" || !$f(nl)) continue;
        let { uuid: uuid } = nl,
          kd =
            uuid !== void 0 && nl.shouldQuery !== !1 && nl.passive !== !0 && !q.has(uuid)
              ? nl.requeueIfInterruptedWithinMs
              : void 0;
        if (kd !== void 0 || Kr !== void 0) Kr = { uuid: uuid, cmd: nl, withinMs: kd, until: void 0 };
      }
  }
  function Xa() {
    if (Kr?.withinMs !== void 0) Kr.until ??= yr() + Kr.withinMs;
  }
  function ta({ turnEnded: wr = !1 } = {}) {
    if (((Kr = void 0), wr)) Li.clear();
  }
  function Bs(wr) {
    if (Kr?.uuid === wr) Kr.withinMs = void 0;
    for (let zs of y) if (zs.uuid === wr) delete zs.requeueIfInterruptedWithinMs;
  }
  function Ca() {
    let wr = Kr;
    if (
      ((Kr = void 0),
      wr?.uuid === void 0 || wr.withinMs === void 0 || (wr.until !== void 0 && yr() > wr.until))
    )
      return;
    let {
      requeueIfInterruptedWithinMs: requeueIfInterruptedWithinMs,
      promptSubmitted: promptSubmitted,
      attachmentSourceUuid: attachmentSourceUuid,
      deliveryId: deliveryId,
      ...kd
    } = wr.cmd;
    (Li.add(wr.uuid), Je.delete(wr.uuid));
    try {
      Nr(
        {
          ...kd,
          drainOnly: !0,
          runsAlone: !0,
          admissionExempt: "resurrected",
          ...(promptSubmitted !== void 0 && { screeningOwed: !0 }),
        },
        { ahead: !0 },
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
    if (Je.has(wr) && y.some((zs) => zs.uuid === wr && zs.requeueIfInterruptedWithinMs !== void 0))
      return "wait";
    return Kr?.uuid === wr && Kr.withinMs !== void 0 && (Kr.until === void 0 || yr() <= Kr.until)
      ? "wait"
      : "keep";
  }
  function ga(wr) {
    if (Kr?.uuid === wr || Je.has(wr)) Bs(wr);
  }
  function Hl() {
    return Kr?.withinMs !== void 0 && Kr.until !== void 0 && yr() <= Kr.until ? Kr.until - yr() : void 0;
  }
  function hd(wr, zs) {
    return vs(wr, r.commandsDiscarded, zs?.reason);
  }
  function Sd(wr) {
    for (let { mode: mode, taskId: taskId } of wr)
      if (mode === "task-notification" && taskId !== void 0) Qs.add(taskId);
    (Dli(wr), r.commandsDiscarded.emit(wr));
  }
  function Ld(wr) {
    return Qs.delete(wr);
  }
  function vs(wr, zs, li) {
    let nl = [];
    for (let Tl = y.length - 1; Tl >= 0; Tl--) if (wr(y[Tl])) nl.unshift(y.splice(Tl, 1)[0]);
    if (nl.length > 0) {
      ke();
      try {
        L.emit();
      } catch (error) {
        if (isAbortError(error)) logForDebugging(`commandsRemoved listener aborted: ${error}`);
        else logError(error);
      }
      for (let Tl of nl) {
        if (Tl.unlogged || Tl.screeningPending === !0) continue;
        s(
          "remove",
          li === "dropped_by_hook" ? void 0 : queueRecordText(Tl),
          li,
          Tl.attachmentSourceUuid ?? Tl.uuid,
          Tl.deliveryId,
          IIt(Tl),
        );
      }
      if (li === "cleared_on_cancel" || li === "dropped_by_hook") E1r(nl, li);
      if (zs === r.commandsDiscarded) Sd(nl);
      else zs.emit(nl);
    }
    return nl;
  }
  function ol(wr) {
    if (y.length === 0) return [];
    let zs = wr?.keep,
      li = zs ? y.filter((Tl) => !zs(Tl)) : y;
    if (li.length === 0) return [];
    let nl = groupByToObject(li, (Tl) => Tl.mode);
    return (
      logForDebugging(
        `[clearCommandQueue] dropping ${li.length} queued command(s): ${Object.entries(nl)
          .map(([Tl, kd]) => `${Tl}=${kd.length}`)
          .join(" ")}`,
        { level: "warn" },
      ),
      discardPollEvent(li.filter(Kv), "queue cleared"),
      hd(zs ? (Tl) => !zs(Tl) : () => !0, wr)
    );
  }
  function gd() {
    ((y.length = 0),
      (freeze = Object.freeze([])),
      hr.clear(),
      q.clear(),
      Z.clear(),
      Je.clear(),
      (It = !1),
      (Yt = void 0),
      (we = void 0),
      (Kr = void 0),
      Li.clear(),
      Qs.clear(),
      jr(),
      To(),
      vn.clear());
  }
  function Su(wr, zs, li) {
    let mapped = wr.map((na) => ({ text: REt(na), entries: getRetainedPastedContents(na) }));
    function Tl(na, em) {
      let Ac = new Set();
      for (let tp of parsePastedRefs(na)) if (n_n(tp.id) && !em.has(tp.id)) Ac.add(tp.id);
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
      let text = na.text,
        mapped = na.entries.map((entry) => {
          if (entry.type !== "text" || !Ac.has(entry.id)) return entry;
          let np = ZR(zs, li);
          return ((text = expandPastedTextRefs_2(text, entry.id, np, "text")), { ...entry, id: np });
        });
      return { text: text, entries: mapped };
    });
  }
  function Eu(wr, zs, li = {}) {
    if (y.length === 0) return;
    let nl = wr === "",
      filtered = y.filter((ap) => shouldPrependModeChar(ap, nl));
    if (filtered.length === 0) return;
    let kd = filtered.every((ap) => ap.mode === "bash") ? "bash" : "prompt",
      na = kd === "bash" ? filtered : filtered.filter((ap) => ap.mode !== "bash"),
      em = Su(na, wr, li),
      mapped = em.map((ap, al) => popAllEditable(ap.text, na[al].value, wr, li)),
      { text: text, cursorOffset: cursorOffset } = joinWithCursor(
        mapped.map((ap) => ap.text).filter(Boolean).join(`
`),
        wr,
        zs,
      ),
      Ef = [];
    for (let [ap, al] of em.entries()) Ef.push(...al.entries, ...mapped[ap].images);
    for (let ap of na) {
      if (ap.unlogged || ap.screeningPending === !0) continue;
      h("popAll", ap);
    }
    let np = new Set(na),
      filtered_2 = y.filter((ap) => !np.has(ap));
    return (
      (y.length = 0),
      y.push(...filtered_2),
      ke(),
      Sd(na),
      {
        text: text,
        cursorOffset: cursorOffset,
        images: Ef,
        mode: kd,
        ideSelection:
          na.find((ap) => ap.ideSelection?.text)?.ideSelection ??
          na.find((ap) => ap.ideSelection !== void 0)?.ideSelection,
        unpassed: na.some(OIt),
      }
    );
  }
  function Uc(wr, zs, li, nl = {}) {
    let kd = y.filter(Up)[wr];
    if (!kd) return;
    if (!shouldPrependModeChar(kd, zs === "")) return;
    let [na] = Su([kd], zs, nl),
      { text: text, entries: entries } = na,
      tp = popAllEditable(text, kd.value, zs, nl),
      { text: text_2, cursorOffset: cursorOffset } = joinWithCursor(tp.text, zs, li),
      np = entries;
    if ((np.push(...tp.images), !kd.unlogged && kd.screeningPending !== !0)) h("popOne", kd);
    let index = y.indexOf(kd);
    if (index !== -1) (y.splice(index, 1), ke(), Sd([kd]));
    return {
      text: text_2,
      cursorOffset: cursorOffset,
      images: np,
      mode: kd.mode === "bash" ? "bash" : "prompt",
      ideSelection: kd.ideSelection,
      unpassed: OIt(kd),
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
    subscribe: w.subscribe,
    subscribeToRemovals: L.subscribe,
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
    typedHandedBack: G,
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
var Vmo = new SessionRootSlot(() => ({ queue: createMessageQueueManager(), installed: !1 }));
//@ chunk-e6aww6q8.js:576302-576336 placement
function FIt() {
  return Vmo.of(getRootSession());
}
//@ chunk-e6aww6q8.js:576336-576489 placement
function installCommandQueue(e) {
  let n = FIt();
  if (n.installed) return n.queue;
  let queue = n.queue,
    s = e(queue.getCommandQueue());
  return (queue.resetCommandQueue(), (n.queue = s), (n.installed = !0), s);
}
//@ chunk-e6aww6q8.js:576489-576522 placement
function mg() {
  return FIt().queue;
}
//@ chunk-e6aww6q8.js:576522-576590 placement
var dhn = ge(to(), (e) => e.set(void 0)),
  chn = ge(to(), (e) => e.set(void 0));
//@ chunk-e6aww6q8.js:576590-576632 placement
var OXs = (...e) => mg().isFoldInFlight(...e);
//@ chunk-e6aww6q8.js:576632-576721 placement
var t7n = (...e) => mg().getCommandQueueSnapshot(...e),
  oO = (...e) => mg().getCommandQueue(...e);
//@ chunk-e6aww6q8.js:576721-576773 placement
var WKr = (...e) => mg().getMainThreadQueueLength(...e);
//@ chunk-e6aww6q8.js:576773-576814 placement
var MXs = (...e) => mg().emitDiscarded(...e);
//@ chunk-e6aww6q8.js:576814-576881 placement
function GKr(e) {
  return e.getCommandQueue().some((n) => $f(n) && Up(n));
}
//@ chunk-e6aww6q8.js:576881-576946 placement
function DXs(e, n) {
  return e.getCommandQueue().some((r) => shouldPrependModeChar(r, n));
}
//@ chunk-e6aww6q8.js:576946-577062 placement
function hasQueuedTaskNotification(e, n) {
  return mg()
    .getCommandQueue()
    .some((r) => r.mode === "task-notification" && r.agentId === e && r.taskId === n);
}
//@ chunk-e6aww6q8.js:577062-577199 placement
function hasQueuedQueryingTaskNotification(e, n) {
  return mg()
    .getCommandQueue()
    .some((r) => r.mode === "task-notification" && r.agentId === e && r.taskId === n && r.shouldQuery !== !1);
}
/**
 * 消息队列管理器各方法的转发函数（取丢弃通知、重查命令队列、入队等）。
 */
//@ chunk-e6aww6q8.js:577199-577502 placement
var takeDiscardedNotice = (...e) => mg().takeDiscardedNotice(...e),
  recheckCommandQueue = (...e) => mg().recheckCommandQueue(...e),
  enqueueCommand = (...e) => mg().enqueue(...e),
  enqueueReportingAdmission = (...e) => mg().enqueueReportingAdmission(...e),
  flushPeerDropReceipts = (...e) => mg().flushPeerDropReceipts(...e),
  enqueuePollEvent = (...e) => mg().enqueuePollEvent(...e),
  enqueuePendingNotification = (...e) => mg().enqueuePendingNotification(...e);
//@ chunk-e6aww6q8.js:577502-577576 placement
var n7n = (...e) => mg().peek(...e),
  SVe = (...e) => mg().dequeueAllMatching(...e);
//@ chunk-e6aww6q8.js:577576-577617 placement
var kb = (...e) => mg().removeByFilter(...e);
//@ chunk-e6aww6q8.js:577617-577669 placement
var zKr = (...e) => mg().someInFlightDrainCommand(...e);
//@ chunk-e6aww6q8.js:577669-577937 placement
sRt((e, n, r) => {
  let s = r === void 0 ? void 0 : randomUUID_6();
  if (
    (enqueueCommand({ agentId: mainAgentId(), mode: "prompt", value: `/${e}`, origin: n, uuid: s }),
    r === void 0 || r.until.aborted)
  )
    return;
  let subscribe = bVe.subscribe((y) => {
    if (y.some((S) => S.uuid === s)) (subscribe(), r.onDiscarded());
  });
  r.until.addEventListener("abort", subscribe, { once: !0 });
});
/**
 * 把带 ✓/○ 等符号的清单文本解析为 header 与 items（最多 32 条）。
 */
//@ chunk-ha3km179.js:76331-76631 sole-consumer
function parseChecklistText(e) {
  let mapped = e
      .split(
        `
`,
      )
      .map((h) =>
        Yn(h)
          .slice(0, Rf)
          .trim()
          .replace(/^(\*{1,2})(.+?)\1$/, "$2"),
      ),
    r = mapped[0] ?? "";
  return {
    header: r !== "" && !CHECKLIST_MARKER_STATUS.has(r.charAt(0)) ? r : null,
    items: mapped
      .flatMap((h) => {
        let y = CHECKLIST_MARKER_STATUS.get(h.charAt(0)),
          trimmed = h.slice(1).trim();
        return y !== void 0 && trimmed !== "" ? [{ content: trimmed, status: y }] : [];
      })
      .slice(0, Af),
  };
}
/**
 * 协调者内部工具名列表。
 */
//@ chunk-ha3km179.js:76631-76961 placement
var COORDINATOR_TOOL_NAMES = xle(["update_status"]).map((e) => `__${e}`),
  wf = [NO_REPLY_TOOL_SUFFIX, "__react", "__message_coordinator", "__message_thread"],
  mapped = xle(["ask_decision"]).map((e) => `__${e}`),
  mapped_2 = xle(["close_decision", "set_thread_resolved"]).map((e) => `__${e}`),
  Pf = new Set(["github_webhook", "trigger_fire"]),
  Of = DoctorLazy(() => u({ notifications: A(u({ origin: o() })) })),
  Ff = 259200000;
//@ chunk-ha3km179.js:76961-77218 placement
function yd(e) {
  if (!_d()) return;
  try {
    let n = findRecentErroredTools(e);
    return n?.shown === !0 &&
      allUserTurnsSatisfy(
        e.slice(n.row),
        (r, s) => r === void 0 && s.type === "user" && s.isMeta === !0 && s.turnOrigin === void 0,
      )
      ? n.id
      : void 0;
  } catch (error) {
    logForDebugging(`[classifier] shown message not read: ${errorMessage(error)}`, { level: "error" });
    return;
  }
}
//@ chunk-ha3km179.js:77218-77474 placement
function logOperation(operation, content) {
  if (!_d()) return !1;
  try {
    let r = findRecentErroredTools(content);
    if (r?.id !== operation || Date.now() - Date.parse(content[r.row].timestamp) >= Ff) return !1;
    let sliced = content.slice(r.row);
    return (
      isMachineOnlyTurnRange(sliced) &&
      allUserTurnsSatisfy(sliced, isAutomatedNotification) &&
      hasOnlyWaitCalls(sliced)
    );
  } catch (error) {
    return (
      logForDebugging(`[classifier] quiet turn not read: ${errorMessage(error)}`, { level: "error" }),
      !1
    );
  }
}
//@ chunk-ha3km179.js:77474-77566 placement
function _d() {
  return (
    getTerminalMcpTools()
      .values()
      .some((e) => e.endsWith(NO_REPLY_TOOL_SUFFIX)) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_graceful_cake", !0)
  );
}
//@ chunk-ha3km179.js:77566-77617 placement
function Br(e, n) {
  return n.some((r) => e.endsWith(r));
}
/**
 * 找出最近出错的工具调用。
 */
//@ chunk-ha3km179.js:77617-78323 placement
function findRecentErroredTools(e) {
  let n = getTerminalMcpTools(),
    r = new Set();
  for (let s of e)
    if (s.type === "user" && Array.isArray(s.message.content)) {
      for (let h of s.message.content)
        if (h.type === "tool_result" && h.is_error === !0) r.add(h.tool_use_id);
    }
  for (let s = e.length - 1; s >= 0; s--) {
    let h = e[s];
    if (h.type !== "assistant") continue;
    for (let y of h.message.content.toReversed()) {
      if (y.type !== "tool_use") continue;
      if (S4(y.name)) return { row: s, id: y.id, shown: !1 };
      if (r.has(y.id)) continue;
      if (Br(y.name, mapped_2)) return { row: s, id: y.id, shown: !1 };
      if (Br(y.name, mapped)) return { row: s, id: y.id, shown: !0 };
      if (!n.has(y.name) || Br(y.name, wf)) continue;
      if (!Br(y.name, COORDINATOR_TOOL_NAMES)) return { row: s, id: y.id, shown: !0 };
      if (!parseChecklistText(fd(y) ?? "").items.some((item) => item.status !== "completed"))
        return { row: s, id: y.id, shown: !1 };
    }
  }
  return;
}
/**
 * 是否为自动任务通知（定时触发、会话任务）。
 */
//@ chunk-ha3km179.js:78323-78844 placement
function isAutomatedNotification(e, n) {
  if (e !== void 0 && e.kind !== "task-notification") return !1;
  if (e?.subkind === "scheduled-trigger" || e?.producer === "session-task") return !0;
  if (e?.subkind !== void 0) return !1;
  if (
    e === void 0 &&
    n.type === "user" &&
    n.isMeta === !0 &&
    (n.turnOrigin === void 0 || n.turnOrigin === "scheduled")
  )
    return !0;
  let r =
    n.type === "user"
      ? getContentText(n.message.content)
      : n.type === "attachment" && n.attachment.type === "queued_command"
        ? getContentText(n.attachment.prompt)
        : null;
  if (r === null) return !1;
  let s = parseExternalEventWake(r);
  return s === null
    ? isGeneratedToolCountSummary(r)
    : !isSessionInboxWake(s) && (s.from === void 0 || s.from === "system");
}
/**
 * 回合是否只有等待类调用。
 */
//@ chunk-ha3km179.js:78844-79310 placement
function hasOnlyWaitCalls(e) {
  let n = new Set();
  for (let r of e)
    if (r.type === "assistant")
      for (let s of r.message.content) {
        if (s.type !== "tool_use") continue;
        if (s.name === FETCH_INBOX_MESSAGE_TOOL_NAME) return !1;
        if (s.name === READNOTIFICATIONS) n.add(s.id);
      }
    else if (r.type === "user" && Array.isArray(r.message.content))
      for (let s of r.message.content) {
        if (s.type !== "tool_result" || !n.delete(s.tool_use_id)) continue;
        let safeParse = Of().safeParse(r.toolUseResult);
        if (
          !safeParse.success ||
          !safeParse.data.notifications.every((notification) => Pf.has(notification.origin))
        )
          return !1;
      }
  return n.size === 0;
}
//@ chunk-ha3km179.js:79416-79488 placement
var jr = require("./chunk-cv3kgbt2.js"),
  xo = require("./chunk-vswknp5v.js");
//@ chunk-ha3km179.js:79488-79526 placement
var Io = require("./chunk-wpq8yj9g.js");
/**
 * {status:null,next:null}。旧版名 snapshot 为错配。
 */
//@ chunk-18hwfzwa.js:1655060-1655107 fingerprint = snapshot (0.673)
var EMPTY_LIMIT_NOTICES = Object.freeze({ status: null, next: null });
/**
 * 值以 / 开头的命令；peer/slack 来源且 skipSlashCommands 时不算。
 */
//@ chunk-18hwfzwa.js:1661253-1661334 fingerprint = isSlashCommand (1)
function isSlashCommand(cmd) {
  if (cmd.skipSlashCommands && isPeerOrSlackPing(cmd.origin)) return !1;
  return looksLikeSlashInput(cmd.value);
}
/**
 * 已验证的 Slack 人类消息且优先级为 later。旧版名 enqueuePendingNotification 为错配。
 */
//@ chunk-0sfjpx19.js:15971-16045 fingerprint = enqueuePendingNotification (0.592)
function isSlackLaterNotification(command) {
  return command.verifiedSlackHumanTurn === !0 && command.priority === "later";
}

export {
  mg,
  zzt,
  SVe,
  enqueueCommand,
  flushPeerDropReceipts,
  isSlackLaterNotification,
  $f,
  getSchedulingPlugin,
  MXs,
  kb,
  OXs,
  dhn,
  chn,
  oO,
  Up,
  enqueuePendingNotification,
  t7n,
  Ffe,
  Oq,
  bVe,
  REt,
  isCheckinNotification,
  processQueuedCommands,
  isSlashCommand_2,
  GKr,
  isNonHumanQueuedCommand,
  splitStampedImages,
  DXs,
  shouldPrependModeChar,
  hasQueuedTaskNotification,
  takeDiscardedNotice,
  hasQueuedQueryingTaskNotification,
  recheckCommandQueue,
  im,
  Y3n,
  textNotTypedFlags,
  jse,
  e7n,
  getRetainedPastedContents,
  extractImagesFromValue,
  Ofn,
  PFo,
  xjt,
  Pjt,
  EMPTY_LIMIT_NOTICES,
  isSlashCommand,
  Dfn,
  filterQueuedCommandsForThread,
  isPromptModeQueuedCommand,
  createQueueFilterForThread,
  getValueFromInput,
  zKr,
  installCommandQueue,
  createMessageQueueManager,
  lhn,
  n7n,
  tRt,
  V3n,
  yd,
  logOperation,
  jr,
  xo,
  Io,
  P4s,
  enqueueReportingAdmission,
  enqueuePollEvent,
  x4s,
  d1r,
  WKr,
};

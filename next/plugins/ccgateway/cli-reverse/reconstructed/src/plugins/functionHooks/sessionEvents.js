/**
 * plugins/functionHooks/sessionEvents.ts
 *
 * 2.1.316 新增：函数钩子（plugin function hooks）的会话事件：session.attach/detach/start/append/measure/end/send、prompt.edit
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0sfjpx19.js (62)
 * attribution: placement 62
 */
import { sanitizePromptText } from "../../utils/promptTextSanitize.js";
import { NO_CORE_AT_CHAIN_BOTTOM, eventCallersWrapper } from "./eventCatalog.js";
import { applyTextInsertion } from "./coreHandlers.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, AbortError } from "../../utils/errors.js";
import { clientRegistry } from "./panes.js";
import { commandSetSignalA, commandSetSignalB } from "./commandRunDispatch.js";
import { recordSessionStartLoad } from "./promptApi.js";
import { getCwd } from "../../utils/cwd.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { workersLoadedReporter } from "./hooksModuleLoader.js";
import { hasModuleHookingSite } from "../hooksModules/loadedModuleFilters.js";
import { orderedRowSource, appendRowsWithHooks } from "../../utils/queryHelpers.js";
import { createUserMessage, getContentText } from "../../utils/messages.js";
import { NO_CONTENT_MESSAGE } from "../../constants/messages.js";
import { identity } from "../../utils/identity.js";
import { createValueSlot } from "../../utils/valueSlot.js";
import { sessionUsageOp } from "./sessionApi.js";
import { ENGINE } from "./dispatch/chain.js";
import { getCurrentLimits, onLimitsStatusChanged } from "../../services/claudeAiLimits.js";
import { createHostStateSlot } from "./devModsStatus.js";
import { setSessionMeasurer, measureSession } from "../../query/turnHooks.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { setPromptMentionRunner } from "./promptMentionRunner.js";
import { queueRecordTextBuilder, trackQueueRecordChain } from "../../utils/messageQueue/queueRecords.js";
import { submitMarksSlot } from "./promptSubmit.js";
import { raceWithAbortSignal } from "../../utils/sleep.js";
import { isNonResetExitReason } from "../../entrypoints/sdk/coreSchemas.js";
import { resetPluginState } from "./api/state.js";
import { setSessionEndRaiser } from "../../utils/hooks.js";
import { pluginsMatchingEvent } from "./hookDispatch.js";
import { DELIVERED_RESULT, setSessionSendRunner } from "../../tools/SendMessageTool/deliveryResults.js";
import { createCoreHandoff, awaitArrivalOrAnswer, performCoreStep } from "./sessionReceive.js";
import { SESSION_LIVENESS_TIMEOUT_MS } from "../../services/remoteTools/awayTimings.js";
import { SSE_CONNECT_TIMEOUT_MS } from "../../cli/transports/SSETransport.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0sfjpx19.js:118583-118974 placement
function collectSurfaceHandles(node) {
  if (node === undefined || typeof node === "string" || node.type === "engine") return [];
  if (node.type === "Button" || node.type === "Input" || node.type === "Select") {
    let { plugin, handle } = node.press;
    return [
      {
        tag: node.type,
        plugin,
        handle,
        element: node.props.key,
        isAutoFocus: node.props.autoFocus === true,
        ...(node.type !== "Button" && {
          value: node.props.value,
        }),
        ...(node.type === "Select" && {
          options: node.props.options,
        }),
      },
    ];
  }
  return (node.children ?? []).flatMap(collectSurfaceHandles);
}
//@ chunk-0sfjpx19.js:118974-119190 placement
/**
 * 清洗 prompt.autocomplete 建议：文本去控制字符（空则丢弃），标签压成单行。
 */
function normalizeAutocompleteSuggestions(suggestions) {
  let sanitize = sanitizePromptText();
  return suggestions.flatMap(({ text, label, description }) => {
    let cleanText = sanitize(text);
    let trimmed = label?.replace(/\s+/gu, " ").trim();
    return cleanText === ""
      ? []
      : {
          text: cleanText,
          ...(trimmed !== undefined &&
            trimmed !== "" && {
              label: trimmed,
            }),
          ...(description !== undefined && {
            description,
          }),
        };
  });
}
//@ chunk-0sfjpx19.js:119190-119245 placement
/**
 * 无核心时的自动补全
 */
var autocompleteWithNoCore = (request, signal) =>
  NO_CORE_AT_CHAIN_BOTTOM("prompt.autocomplete", {
    signal,
  })(request);
//@ chunk-0sfjpx19.js:119245-119438 placement
/**
 * 取光标前连续的非空白片段作为当前词（光标夹到文本内），无则 undefined。
 */
function currentToken(draft) {
  let min = Math.min(Math.max(draft.cursor, 0), draft.text.length);
  let tokenStart = min;
  while (tokenStart > 0 && draft.text.charAt(tokenStart - 1).trim() !== "") tokenStart -= 1;
  return tokenStart === min
    ? undefined
    : {
        text: draft.text,
        cursor: min,
        token: draft.text.slice(tokenStart, min),
        start: tokenStart,
      };
}
//@ chunk-0sfjpx19.js:119438-119479 placement
var COMPOSER_EDIT_ORIGIN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0sfjpx19.js:119438", () => {
  COMPOSER_EDIT_ORIGIN = Object.freeze({
    kind: "composer",
  });
});
//@ chunk-0sfjpx19.js:119479-119745 placement
function applyEditKeepingCursor(draft, edit) {
  let { text } = applyTextInsertion({
    origin: COMPOSER_EDIT_ORIGIN,
    text: draft.text,
    cursor: draft.cursor,
    ...edit,
  });
  let deltaChars = edit.inputText.length - (edit.end - edit.start);
  let cursorAfterEdit = draft.cursor >= edit.end;
  let cursorInsideEdit = !cursorAfterEdit && draft.cursor > edit.start;
  let nextCursor = cursorAfterEdit
    ? draft.cursor + deltaChars
    : cursorInsideEdit
      ? edit.start + edit.inputText.length
      : draft.cursor;
  return {
    text,
    cursor: Math.max(0, Math.min(nextCursor, text.length)),
  };
}
//@ chunk-0sfjpx19.js:119745-119826 placement
/**
 * 把光标夹到文本内
 */
var clampCursor = (draft) => ({
  text: draft.text,
  cursor: Math.max(0, Math.min(draft.cursor, draft.text.length)),
});
//@ chunk-0sfjpx19.js:119826-119868 placement
/**
 * 光标移到末尾
 */
var cursorAtEnd = (draft) => ({
  ...draft,
  cursor: draft.text.length,
});
//@ chunk-0sfjpx19.js:119868-120020 placement
function summarizeEditBatch(batch) {
  let [firstEdit] = batch;
  let before = firstEdit?.before ?? {
    text: "",
    cursor: 0,
  };
  let after = batch.at(-1)?.after ?? before;
  let isSingleKeyed = batch.length === 1 && firstEdit?.key !== undefined;
  return {
    before,
    after,
    ...(isSingleKeyed && {
      key: firstEdit.key,
    }),
  };
}
//@ chunk-0sfjpx19.js:120020-120132 placement
var sameEdit = (a, b) =>
  a.text === b.text &&
  a.cursor === b.cursor &&
  a.start === b.start &&
  a.end === b.end &&
  a.inputText === b.inputText;
//@ chunk-0sfjpx19.js:120132-120214 placement
/**
 * prompt.edit 核心步骤
 */
var editCoreStep = (promptEditEvent, after) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  run: async (request) => (sameEdit(request, promptEditEvent) ? after : applyTextInsertion(request)),
});
//@ chunk-0sfjpx19.js:120214-120432 placement
function describeEditKey(key) {
  let isSingleChar = [...key.key].length === 1;
  let isNamedKey = key.name !== "" && !isSingleChar;
  if (!isSingleChar && !isNamedKey) return;
  let isSpace = key.key === " ";
  let key_2 = isNamedKey ? key.name : isSpace ? "space" : key.key;
  return Object.freeze({
    key: key_2,
    ...(key.ctrl && {
      ctrl: true,
    }),
    ...(key.shift && {
      shift: true,
    }),
    ...(key.meta && {
      meta: true,
    }),
  });
}
//@ chunk-0sfjpx19.js:120432-120514 placement
/**
 * 编辑键参数
 */
function editKeyArgs(options) {
  let keyInfo = options.key === undefined ? undefined : describeEditKey(options.key);
  return keyInfo === undefined
    ? {}
    : {
        key: keyInfo,
      };
}
//@ chunk-0sfjpx19.js:120514-120577 placement
/**
 * 连续满足的次数
 */
function countUntilFalse(limit, isSame) {
  let count = 0;
  for (; count < limit; count += 1) if (!isSame(count)) break;
  return count;
}
//@ chunk-0sfjpx19.js:120577-120983 placement
/**
 * 比较两段文本（以光标限定公共前缀），求出最小替换区间 {start, end, inputText}。
 */
function diffTextEdit(before, after) {
  if (before.text === after.text)
    return {
      start: after.cursor,
      end: after.cursor,
      inputText: "",
    };
  let prefixLen = countUntilFalse(
    Math.min(before.cursor, after.cursor, before.text.length, after.text.length),
    (offset) => before.text.charCodeAt(offset) === after.text.charCodeAt(offset),
  );
  let suffixLen = countUntilFalse(
    Math.min(before.text.length, after.text.length) - prefixLen,
    (offset) =>
      before.text.charCodeAt(before.text.length - 1 - offset) ===
      after.text.charCodeAt(after.text.length - 1 - offset),
  );
  return {
    start: prefixLen,
    end: before.text.length - suffixLen,
    inputText: after.text.slice(prefixLen, after.text.length - suffixLen),
  };
}
//@ chunk-0sfjpx19.js:120983-121086 placement
var toPromptEditEvent = (batch) => ({
  origin: COMPOSER_EDIT_ORIGIN,
  ...editKeyArgs(batch),
  text: batch.before.text,
  cursor: batch.before.cursor,
  ...diffTextEdit(batch.before, batch.after),
});
//@ chunk-0sfjpx19.js:121086-121190 placement
/**
 * 对一批输入编辑触发 prompt.edit 钩子链，核心处理器在未改写时保持原结果。
 */
function dispatchPromptEdit(batch, signal) {
  let promptEditEvent = toPromptEditEvent(batch);
  return NO_CORE_AT_CHAIN_BOTTOM("prompt.edit", {
    signal,
    core: {
      "prompt.edit": editCoreStep(promptEditEvent, batch.after),
    },
  })(promptEditEvent);
}
//@ chunk-0sfjpx19.js:121190-121396 placement
function rebaseEdit(edit, applied) {
  if ((applied.start === applied.end && applied.inputText === "") || edit.end <= applied.start) return edit;
  let deltaChars = applied.inputText.length - (applied.end - applied.start);
  if (!(applied.end <= edit.start)) return;
  return {
    start: edit.start + deltaChars,
    end: edit.end + deltaChars,
    inputText: edit.inputText,
  };
}
//@ chunk-0sfjpx19.js:121396-121699 placement
/**
 * 根据钩子改写结果与当前草稿计算新的输入框状态；草稿已移动无法套用时给出原因。
 */
function resolveEditedBox(after, hookedBox, liveBox) {
  if (hookedBox.text === after.text && hookedBox.cursor === after.cursor) return {};
  if (liveBox.text === after.text && liveBox.cursor === after.cursor)
    return {
      box: clampCursor(hookedBox),
    };
  let liveEdit = diffTextEdit(after, liveBox);
  let rebased =
    liveEdit.end - liveEdit.start === after.text.length
      ? undefined
      : rebaseEdit(diffTextEdit(after, hookedBox), liveEdit);
  if (rebased === undefined)
    return {
      reason: "a rewrite no longer fits the draft (it moved meanwhile)",
    };
  return {
    box: applyEditKeepingCursor(liveBox, rebased),
  };
}
//@ chunk-0sfjpx19.js:121699-122470 placement
/**
 * 应用 prompt.edit 钩子对草稿的改写（草稿已变或用户正在输入时放弃）。
 */
function applyPromptEdit(options) {
  let raise = options.raise ?? dispatchPromptEdit;
  let later = options.later ?? queueMicrotask;
  let report = options.report ?? ((message) => logForDebugging(message));
  let abortController = new AbortController();
  let isHookRecording = false;
  let pendingEdits = [];
  let inFlight;
  let isFlushScheduled = false;
  function flush() {
    isFlushScheduled = false;
    if (pendingEdits.length === 0 || inFlight !== undefined) return;
    let batch = summarizeEditBatch(pendingEdits);
    pendingEdits = [];
    inFlight = batch;
    raise(batch, abortController.signal).then(
      (answer) => applyAnswer(batch, answer),
      (error) => {
        report(`prompt.edit: ${errorMessage(error)}; the editor's edit stands`);
        applyAnswer(batch, batch.after);
      },
    );
  }
  function applyAnswer(batch, box) {
    inFlight = undefined;
    if (abortController.signal.aborted) return;
    let editedBox = resolveEditedBox(batch.after, box, options.read());
    if (editedBox.box !== undefined) {
      let before = cursorAtEnd(options.read());
      options.commit(editedBox.box);
      options.carryLayers?.({
        before,
        after: cursorAtEnd(options.read()),
      });
    } else if (editedBox.reason !== undefined)
      report(`prompt.edit: ${editedBox.reason}; the person's typing stands`);
    if (options.read().text === box.text) options.paint?.(box.decorations, box.text);
    flush();
  }
  return {
    isRecording: () => isHookRecording,
    record: (edit) => {
      options.carry?.(edit);
      pendingEdits.push(edit);
      if (!isFlushScheduled && inFlight === undefined) {
        isFlushScheduled = true;
        later(flush);
      }
    },
    setHooked: (isHooked) => {
      isHookRecording = isHooked;
    },
    dispose: () => {
      pendingEdits = [];
      abortController.abort();
    },
  };
}
//@ chunk-0sfjpx19.js:122470-122745 placement
async function raiseSessionAttach(client, answers) {
  if (
    !clientRegistry.attach({
      ...client,
      attachedAt: Date.now(),
      ...(answers !== undefined && {
        answers,
      }),
    })
  )
    return false;
  logForDebugging(`session.attach: ${client.clientId} on ${client.surface}`);
  try {
    await commandSetSignalA.get();
    await eventCallersWrapper().session.attach(client);
  } catch (error) {
    logForDebugging(`session.attach: failed: ${errorMessage(error)}`, {
      level: "error",
    });
  }
  return true;
}
//@ chunk-0sfjpx19.js:122745-122773 placement
/**
 * 会话作用域的默认键 <x>:default，用于没有指定 session 的场景。
 */
var defaultScopeKey = (surface) => `${surface}:default`;
//@ chunk-0sfjpx19.js:122773-122789 placement
var DETACH = "detach";
//@ chunk-0sfjpx19.js:122789-123047 placement
async function raiseSessionDetach(clientId, reason, rootEvent) {
  let detached = clientRegistry.detach(clientId);
  if (detached === undefined) return;
  logForDebugging(`session.detach: ${clientId} (${reason})`);
  try {
    await commandSetSignalA.get();
    await eventCallersWrapper(rootEvent).session.detach({
      surface: detached.surface,
      clientId,
      reason,
    });
  } catch (error) {
    logForDebugging(`session.detach: failed: ${errorMessage(error)}`, {
      level: "error",
    });
  }
  return detached;
}
//@ chunk-0sfjpx19.js:123047-123275 placement
/**
 * 对所有已附着客户端触发 session.detach，记录失败并返回失败数。
 */
async function detachAllClients_2() {
  let flattened = (
    await Promise.allSettled(
      clientRegistry.list().map((client) => raiseSessionDetach(client.clientId, DETACH)),
    )
  ).flatMap((result) => (result.status === "rejected" ? [result.reason] : []));
  for (let reason of flattened)
    logForDebugging(`session.detach: failed: ${errorMessage(reason)}`, {
      level: "error",
    });
  return flattened.length;
}
//@ chunk-0sfjpx19.js:123275-123350 placement
/**
 * 结束所有客户端会话
 */
async function detachAllClients(rootEvent) {
  for (let client of clientRegistry.list()) await raiseSessionDetach(client.clientId, "end", rootEvent);
}
//@ chunk-0sfjpx19.js:123350-123705 placement
/**
 * 为加载的插件触发 session.start（同一加载只触发一次）。
 */
function raiseSessionStart(modules, weakSet, facts) {
  for (let mod of modules) {
    if (weakSet.has(mod)) continue;
    weakSet.add(mod);
    if (!mod.hooks("session.start")) continue;
    logForDebugging(
      `session.start: raised for ${mod.name} ` +
        (recordSessionStartLoad(mod) ? "(again, the same load)" : "(loaded later)"),
    );
    Promise.resolve()
      .then(() =>
        eventCallersWrapper({
          only: mod.name,
        }).session.start({
          cwd: getCwd(),
          ...facts,
        }),
      )
      .catch((error) => {
        logForDebugging(`session.start: failed for ${mod.name}: ${errorMessage(error)}`, {
          level: "error",
        });
      });
  }
}
//@ chunk-0sfjpx19.js:123705-124155 placement
async function describeInteractivity({ loaded, surface, isInteractive }, isStillCurrent) {
  await Promise.resolve(loaded).catch(() => {
    return;
  });
  if (!isStillCurrent()) return;
  logForDebugging(
    `session.start: raised (surface ${surface ?? "none"}, ${isInteractive ? "interactive" : "not interactive"})`,
  );
  let loadedModules = getPluginRegistry().loadedModules;
  let weakSet = new WeakSet(loadedModules);
  for (let loadedModule of loadedModules) recordSessionStartLoad(loadedModule);
  workersLoadedReporter.set((raisedModules) =>
    raiseSessionStart(raisedModules, weakSet, {
      surface,
      isInteractive,
    }),
  );
  try {
    await eventCallersWrapper().session.start({
      cwd: getCwd(),
      surface,
      isInteractive,
    });
  } catch (error) {
    logForDebugging(`session.start: failed: ${errorMessage(error)}`, {
      level: "error",
    });
  }
}
//@ chunk-0sfjpx19.js:124155-124235 placement
/**
 * 运行提及链
 */
var runMentionChain = async (request) =>
  (await import("../../engine/CONTEXT_DROPPED_NOTE.lazy.js")).runPromptMentionChain(request);
//@ chunk-0sfjpx19.js:124235-124532 placement
function raiseSessionAppend(text, hookOrigin) {
  if (
    !hasModuleHookingSite("session.append", {
      door: "queue",
    })
  )
    return;
  let source = orderedRowSource({
    keep: () => {},
    rows: () => [],
    isHookable: true,
  });
  return Promise.resolve(
    appendRowsWithHooks(
      source,
      [
        createUserMessage({
          content: text,
        }),
      ],
      {
        door: "queue",
        ...(hookOrigin && {
          hookOrigin,
        }),
      },
    ),
  ).then(
    ([row]) => {
      let nextText = row?.type === "user" ? getContentText(row.message.content) : text;
      return nextText === NO_CONTENT_MESSAGE && text !== nextText ? "" : (nextText ?? "");
    },
    () => text,
  );
}
//@ chunk-0sfjpx19.js:124532-124614 placement
/**
 * 用量窗口是否变化
 */
var usageWindowChanged = (context, context_2) =>
  !context ||
  context.tokens !== context_2.tokens ||
  context.window !== context_2.window ||
  context.percent !== context_2.percent;
//@ chunk-0sfjpx19.js:124614-124668 placement
/**
 * 成本是否变化
 */
var costChanged = (previous, cost) =>
  previous ? previous.usage.cost?.usd !== cost?.usd : cost !== undefined;
//@ chunk-0sfjpx19.js:124668-124687 placement
/**
 * 1e-9
 */
var NEGLIGIBLE_COST = 0.000000001;
//@ chunk-0sfjpx19.js:124687-124696 placement
/**
 * 1
 */
var MIN_COST_DELTA = 1;
//@ chunk-0sfjpx19.js:124696-124973 placement
function rateLimitsChanged(previous, next) {
  let rateLimits = next.usage.rateLimits;
  if (!previous) return rateLimits.length > 0;
  let previousPercents = new Map(
    previous.usage.rateLimits.map((rateLimit) => [rateLimit.kind, rateLimit.percentUsed]),
  );
  return (
    previous.limitStatus !== next.limitStatus ||
    previousPercents.size !== rateLimits.length ||
    rateLimits.some((rateLimit) => {
      let previousPercent = previousPercents.get(rateLimit.kind);
      return (
        previousPercent === undefined ||
        Math.abs(rateLimit.percentUsed - previousPercent) >= MIN_COST_DELTA - NEGLIGIBLE_COST
      );
    })
  );
}
//@ chunk-0sfjpx19.js:124973-125135 placement
/**
 * 比较两次会话度量，列出变化的类别（context、rateLimits、cost）。
 */
function changedMeasures(previous, next) {
  let changed = [];
  if (usageWindowChanged(previous?.usage.context, next.usage.context)) changed.push("context");
  if (rateLimitsChanged(previous, next)) changed.push("rateLimits");
  if (costChanged(previous, next.usage.cost)) changed.push("cost");
  return changed;
}
//@ chunk-0sfjpx19.js:125135-125170 placement
/**
 * 会话度量槽
 */
var sessionMeasureSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0sfjpx19.js:125135", () => {
  sessionMeasureSlot = identity(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-0sfjpx19.js:125170-125238 placement
/**
 * 默认度量结果
 */
var measureDefault = async () => ({
  usage: await sessionUsageOp({}, ENGINE),
  limitStatus: getCurrentLimits().status,
});
//@ chunk-0sfjpx19.js:125238-125331 placement
/**
 * 并入限流信息
 */
var withRateLimits = (previous, next) => ({
  usage: {
    ...next.usage,
    rateLimits: previous.usage.rateLimits,
  },
  limitStatus: previous.limitStatus,
});
//@ chunk-0sfjpx19.js:125331-125395 placement
/**
 * 按需保留限流
 */
function keepRateLimits(previous, next, changed) {
  return !previous || changed.includes("rateLimits") ? next : withRateLimits(previous, next);
}
//@ chunk-0sfjpx19.js:125395-125737 placement
async function raiseSessionMeasure(trigger) {
  try {
    let measures = await measureDefault();
    let previous = sessionMeasureSlot.get();
    let changed = changedMeasures(previous, measures);
    if (!(trigger === "turn" ? changed.length > 0 : changed.includes("rateLimits"))) return;
    sessionMeasureSlot.set(keepRateLimits(previous, measures, changed));
    let { context, rateLimits, cost } = measures.usage;
    await eventCallersWrapper().session.measure({
      context,
      rateLimits,
      ...(cost !== undefined && {
        cost,
      }),
      changed,
    });
  } catch (error) {
    logForDebugging(`session.measure (${trigger}): failed: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
}
//@ chunk-0sfjpx19.js:125737-125772 placement
/**
 * 会话结束槽
 */
var sessionEndSlot; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0sfjpx19.js:125737", () => {
  sessionEndSlot = identity(createValueSlot(), (slot) => slot.set(undefined));
});
//@ chunk-0sfjpx19.js:125772-125890 placement
async function runMeasureLoop(loop, trigger) {
  let current = trigger;
  try {
    while (current) {
      await raiseSessionMeasure(current);
      current = loop.next;
      loop.next = undefined;
    }
  } finally {
    if (sessionEndSlot.get() === loop) sessionEndSlot.set(undefined);
  }
}
//@ chunk-0sfjpx19.js:125890-125903 placement
/**
 * 宿主状态槽
 */
var hostStateSlot; // deferred: uses createHostStateSlot (./devModsStatus.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0sfjpx19.js:125890", () => {
  hostStateSlot = createHostStateSlot();
});
//@ chunk-0sfjpx19.js:125903-125966 placement
/**
 * session.measure 是否有钩子
 */
function isSessionMeasureHooked() {
  try {
    return hasModuleHookingSite("session.measure");
  } catch {
    return false;
  }
}
//@ chunk-0sfjpx19.js:125966-126174 placement
/**
 * 合并触发 session.measure：已在度量中则排队下一次（turn 优先），否则启动循环。
 */
var scheduleSessionMeasure = (trigger) => {
  if (!isSessionMeasureHooked()) return Promise.resolve();
  let loop = sessionEndSlot.get();
  if (loop) {
    loop.next = loop.next === "turn" ? "turn" : trigger;
    return loop.running;
  }
  let newLoop = {
    running: Promise.resolve(),
    next: undefined,
  };
  sessionEndSlot.set(newLoop);
  newLoop.running = runMeasureLoop(newLoop, trigger);
  return newLoop.running;
};
//@ chunk-0sfjpx19.js:126174-126182 placement
// deferred: uses setSessionMeasurer (../../query/turnHooks.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0sfjpx19.js:126174", () => {
  setSessionMeasurer(scheduleSessionMeasure);
});
//@ chunk-0sfjpx19.js:126182-126330 placement
/**
 * 订阅限额状态变化以触发 session.measure（只订阅一次）。
 */
function watchLimitsForMeasure() {
  if (hostStateSlot.get()) return;
  let release = onLimitsStatusChanged(() => {
    try {
      measureSession("limits");
    } catch (error) {
      logForDebugging(`session.measure (limits): ${errorMessage(error)}`, {
        level: "warn",
      });
    }
  });
  hostStateSlot.set(release);
  registerCleanup(release);
}
//@ chunk-0sfjpx19.js:126330-126600 placement
/**
 * 会话就绪时启动函数钩子：订阅限额、设置提及运行器与追加触发器，描述交互能力（触发 session.start），只执行一次。
 */
function startSessionHooks(options) {
  let existing = commandSetSignalA.get();
  if (existing) return existing;
  watchLimitsForMeasure();
  setPromptMentionRunner(runMentionChain);
  queueRecordTextBuilder.set(raiseSessionAppend);
  let marks = new Set();
  submitMarksSlot.set(marks);
  let started = describeInteractivity(options, () => commandSetSignalA.get() === started).finally(() => {
    if (submitMarksSlot.get() === marks) submitMarksSlot.set(undefined);
  });
  commandSetSignalA.set(started);
  let loaded = Promise.resolve(options.loaded).then(
    () => {
      return;
    },
    () => {
      return;
    },
  );
  commandSetSignalB.set(loaded);
  trackQueueRecordChain(loaded);
  return started;
}
//@ chunk-0sfjpx19.js:126600-126653 placement
/**
 * 中止时静默
 */
var raceWithAbortSilently = (promise, signal) =>
  raceWithAbortSignal(promise, signal, () => new AbortError()).catch(() => {
    return;
  });
//@ chunk-0sfjpx19.js:126653-126752 placement
/**
 * session.end 核心步骤
 */
var sessionEndCoreStep = (endSession) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  run: async (request) => {
    await endSession();
    return {
      sessionId: request.sessionId,
    };
  },
});
//@ chunk-0sfjpx19.js:126790-126861 placement
/**
 * session.end 是否有钩子
 */
function isSessionEndHooked(reason) {
  try {
    return hasModuleHookingSite("session.end", {
      reason,
    });
  } catch {
    return false;
  }
}
//@ chunk-0sfjpx19.js:126861-127375 placement
/**
 * 触发 session.end：在 SessionEnd 时限内运行，超时则结束会话不等待。
 */
var raiseSessionEnd = async ({ reason, sessionId, boundMs, end }) => {
  await end();
  let cutAt = Date.now() + boundMs;
  let deadlineSignal = AbortSignal.timeout(boundMs);
  let detachPromise;
  let detachClients = () =>
    (detachPromise ??= isNonResetExitReason(reason)
      ? detachAllClients({
          signal: deadlineSignal,
          cutAt,
        })
      : Promise.resolve());
  try {
    if (!isSessionEndHooked(reason)) {
      await raceWithAbortSilently(detachClients(), deadlineSignal);
      return;
    }
    try {
      await raceWithAbortSignal(
        eventCallersWrapper({
          signal: deadlineSignal,
          cutAt,
          core: {
            "session.end": sessionEndCoreStep(detachClients),
          },
        }).session.end({
          reason,
          sessionId,
          resume: {
            id: sessionId,
          },
        }),
        deadlineSignal,
        () => new AbortError(),
      );
    } catch (error) {
      let failureText = deadlineSignal.aborted
        ? "cut at the SessionEnd bound, the session ends regardless"
        : `failed: ${errorMessage(error)}`;
      logForDebugging(`session.end (${reason}): ${failureText}`, {
        level: "warn",
      });
    }
    await raceWithAbortSilently(detachClients(), deadlineSignal);
  } finally {
    resetPluginState();
  }
};
//@ chunk-0sfjpx19.js:127375-127383 placement
// deferred: uses setSessionEndRaiser (../../utils/hooks.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0sfjpx19.js:127375", () => {
  setSessionEndRaiser(raiseSessionEnd);
});
//@ chunk-0sfjpx19.js:127383-127520 placement
var createSendOutcome = (coreHandoff) => ({
  delivered: () =>
    coreHandoff.done({
      isDelivered: true,
    }),
  refused: (reason) =>
    coreHandoff.done({
      isDelivered: false,
      reason,
    }),
  [Symbol.dispose]: coreHandoff[Symbol.dispose],
});
//@ chunk-0sfjpx19.js:127520-127620 placement
var SEND_NOT_DELIVERED_MESSAGE =
  "session.send: the message was not delivered (the send failed after the hooks passed it on)";
//@ chunk-0sfjpx19.js:127620-128279 placement
/**
 * 触发 session.send：钩子可改写、拒绝或自行投递消息。
 */
async function raiseSessionSend(request) {
  let { raised, signalOf, skipping } = request;
  let { text, ...rest } = raised;
  let matchers = pluginsMatchingEvent("session.send", rest, skipping);
  if (matchers.length === 0)
    return {
      send: raised,
      delivering: DELIVERED_RESULT,
    };
  let coreHandoff = createCoreHandoff(SEND_NOT_DELIVERED_MESSAGE);
  let outcome = await awaitArrivalOrAnswer(
    coreHandoff,
    eventCallersWrapper({
      signal: signalOf(),
      origin: skipping,
      core: {
        "session.send": performCoreStep(coreHandoff),
      },
    }).session.send(raised),
  );
  if (!outcome.arrived) {
    let { answered } = outcome;
    let whyNotSent = answered.isDelivered
      ? "a hook delivered it itself"
      : `refused by a hook (${answered.reason})`;
    logForDebugging(
      `session.send to ${raised.to} (${raised.origin.kind}): ${whyNotSent}; hooked by ${matchers.join("+")}; nothing sent`,
    );
    return {
      answered,
    };
  }
  let arrived = outcome.arrived;
  if (arrived.to !== raised.to || arrived.text !== raised.text)
    logForDebugging(
      `session.send to ${raised.to} (${raised.origin.kind}): rewritten by a hook (to ${arrived.to}, ${arrived.text.length} chars)`,
    );
  return {
    send: arrived,
    delivering: createSendOutcome(coreHandoff),
  };
}
//@ chunk-0sfjpx19.js:128279-128287 placement
// deferred: uses setSessionSendRunner (../../tools/SendMessageTool/deliveryResults.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-0sfjpx19.js:128279", () => {
  setSessionSendRunner(raiseSessionSend);
});
//@ chunk-0sfjpx19.js:128287-128300 placement
/**
 * 15000
 */
var SESSION_END_GRACE_MS = 15000;
//@ chunk-0sfjpx19.js:128300-128318 placement
/**
 * 总等待时长
 */
var SESSION_END_WAIT_MS = SESSION_LIVENESS_TIMEOUT_MS + SSE_CONNECT_TIMEOUT_MS + SESSION_END_GRACE_MS;
//@ chunk-0sfjpx19.js:128318-128332 placement
/**
 * 300000
 */
var SESSION_END_HARD_CAP_MS = 300000;
//@ chunk-0sfjpx19.js:128332-128792 placement
function raiseViewerAbsence(setHandler, isViewerPresent, onAbsent) {
  let absenceStart;
  let lastSeen;
  let isRunning = false;
  let isStopped = false;
  function reset() {
    absenceStart = undefined;
    lastSeen = undefined;
  }
  function stop() {
    isRunning = false;
    reset();
    setHandler(undefined);
  }
  function reportAbsent(absentMs) {
    logForDebugging(`viewer absence: no viewer for ${absentMs} ms`);
    stop();
    try {
      onAbsent();
    } catch (error) {
      logForDebugging(`viewer absence: failed: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  }
  function noteBeat(now) {
    let start =
      lastSeen !== undefined && now - lastSeen <= SESSION_END_HARD_CAP_MS ? (absenceStart ?? now) : now;
    absenceStart = start;
    lastSeen = now;
    if (now - start >= SESSION_END_WAIT_MS) reportAbsent(now - start);
  }
  let onBeat = (isVisible) => (isVisible ? reset() : noteBeat(Date.now()));
  let onBeatChecked = (now) => (isViewerPresent() ? onBeat(now) : stop());
  let onBeatWhileRunning = (now) => (isRunning ? onBeatChecked(now) : undefined);
  function heard() {
    reset();
    if (!isRunning && !isStopped) {
      isRunning = true;
      setHandler(onBeatWhileRunning);
    }
  }
  function stopWatching() {
    isStopped = true;
    stop();
  }
  return {
    heard,
    stop: stopWatching,
  };
}
export {
  collectSurfaceHandles,
  COMPOSER_EDIT_ORIGIN,
  startSessionHooks,
  diffTextEdit,
  autocompleteWithNoCore,
  normalizeAutocompleteSuggestions,
  currentToken,
  raiseSessionDetach,
  detachAllClients_2,
  raiseViewerAbsence,
  detachAllClients,
  defaultScopeKey,
  applyPromptEdit,
  dispatchPromptEdit,
  clampCursor,
  raiseSessionAttach,
};

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
import { yvo, setSessionSendRunner } from "../../tools/SendMessageTool/deliveryResults.js";
import { createCoreHandoff, awaitArrivalOrAnswer, performCoreStep } from "./sessionReceive.js";
import { SESSION_LIVENESS_TIMEOUT_MS } from "../../services/remoteTools/awayTimings.js";
import { SSE_CONNECT_TIMEOUT_MS } from "../../cli/transports/SSETransport.js";

//@ chunk-0sfjpx19.js:118583-118974 placement
function collectSurfaceHandles(e) {
  if (e === undefined || typeof e === "string" || e.type === "engine") return [];
  if (e.type === "Button" || e.type === "Input" || e.type === "Select") {
    let { plugin, handle } = e.press;
    return [
      {
        tag: e.type,
        plugin,
        handle,
        element: e.props.key,
        isAutoFocus: e.props.autoFocus === true,
        ...(e.type !== "Button" && {
          value: e.props.value,
        }),
        ...(e.type === "Select" && {
          options: e.props.options,
        }),
      },
    ];
  }
  return (e.children ?? []).flatMap(collectSurfaceHandles);
}
//@ chunk-0sfjpx19.js:118974-119190 placement
/**
 * 清洗 prompt.autocomplete 建议：文本去控制字符（空则丢弃），标签压成单行。
 */
function normalizeAutocompleteSuggestions(suggestions) {
  let n = sanitizePromptText();
  return suggestions.flatMap(({ text, label, description }) => {
    let y = n(text);
    let trimmed = label?.replace(/\s+/gu, " ").trim();
    return y === ""
      ? []
      : {
          text: y,
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
var autocompleteWithNoCore = (e, signal) =>
  NO_CORE_AT_CHAIN_BOTTOM("prompt.autocomplete", {
    signal,
  })(e);
//@ chunk-0sfjpx19.js:119245-119438 placement
/**
 * 取光标前连续的非空白片段作为当前词（光标夹到文本内），无则 undefined。
 */
function currentToken(e) {
  let min = Math.min(Math.max(e.cursor, 0), e.text.length);
  let r = min;
  while (r > 0 && e.text.charAt(r - 1).trim() !== "") r -= 1;
  return r === min
    ? undefined
    : {
        text: e.text,
        cursor: min,
        token: e.text.slice(r, min),
        start: r,
      };
}
//@ chunk-0sfjpx19.js:119438-119479 placement
var cXe = Object.freeze({
  kind: "composer",
});
//@ chunk-0sfjpx19.js:119479-119745 placement
function applyEditKeepingCursor(e, n) {
  let { text } = applyTextInsertion({
    origin: cXe,
    text: e.text,
    cursor: e.cursor,
    ...n,
  });
  let s = n.inputText.length - (n.end - n.start);
  let h = e.cursor >= n.end;
  let y = !h && e.cursor > n.start;
  let _ = h ? e.cursor + s : y ? n.start + n.inputText.length : e.cursor;
  return {
    text,
    cursor: Math.max(0, Math.min(_, text.length)),
  };
}
//@ chunk-0sfjpx19.js:119745-119826 placement
/**
 * 把光标夹到文本内
 */
var clampCursor = (e) => ({
  text: e.text,
  cursor: Math.max(0, Math.min(e.cursor, e.text.length)),
});
//@ chunk-0sfjpx19.js:119826-119868 placement
/**
 * 光标移到末尾
 */
var cursorAtEnd = (e) => ({
  ...e,
  cursor: e.text.length,
});
//@ chunk-0sfjpx19.js:119868-120020 placement
function summarizeEditBatch(e) {
  let [n] = e;
  let r = n?.before ?? {
    text: "",
    cursor: 0,
  };
  let after = e.at(-1)?.after ?? r;
  let h = e.length === 1 && n?.key !== undefined;
  return {
    before: r,
    after,
    ...(h && {
      key: n.key,
    }),
  };
}
//@ chunk-0sfjpx19.js:120020-120132 placement
var sameEdit = (e, n) =>
  e.text === n.text &&
  e.cursor === n.cursor &&
  e.start === n.start &&
  e.end === n.end &&
  e.inputText === n.inputText;
//@ chunk-0sfjpx19.js:120132-120214 placement
/**
 * prompt.edit 核心步骤
 */
var editCoreStep = (promptEditEvent, after) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  run: async (r) => (sameEdit(r, promptEditEvent) ? after : applyTextInsertion(r)),
});
//@ chunk-0sfjpx19.js:120214-120432 placement
function describeEditKey(key) {
  let n = [...key.key].length === 1;
  let r = key.name !== "" && !n;
  if (!n && !r) return;
  let s = key.key === " ";
  let key_2 = r ? key.name : s ? "space" : key.key;
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
function editKeyArgs(e) {
  let n = e.key === undefined ? undefined : describeEditKey(e.key);
  return n === undefined
    ? {}
    : {
        key: n,
      };
}
//@ chunk-0sfjpx19.js:120514-120577 placement
/**
 * 连续满足的次数
 */
function countUntilFalse(e, n) {
  let r = 0;
  for (; r < e; r += 1) if (!n(r)) break;
  return r;
}
//@ chunk-0sfjpx19.js:120577-120983 placement
/**
 * 比较两段文本（以光标限定公共前缀），求出最小替换区间 {start, end, inputText}。
 */
function diffTextEdit(e, n) {
  if (e.text === n.text)
    return {
      start: n.cursor,
      end: n.cursor,
      inputText: "",
    };
  let r = countUntilFalse(
    Math.min(e.cursor, n.cursor, e.text.length, n.text.length),
    (h) => e.text.charCodeAt(h) === n.text.charCodeAt(h),
  );
  let s = countUntilFalse(
    Math.min(e.text.length, n.text.length) - r,
    (h) => e.text.charCodeAt(e.text.length - 1 - h) === n.text.charCodeAt(n.text.length - 1 - h),
  );
  return {
    start: r,
    end: e.text.length - s,
    inputText: n.text.slice(r, n.text.length - s),
  };
}
//@ chunk-0sfjpx19.js:120983-121086 placement
var toPromptEditEvent = (e) => ({
  origin: cXe,
  ...editKeyArgs(e),
  text: e.before.text,
  cursor: e.before.cursor,
  ...diffTextEdit(e.before, e.after),
});
//@ chunk-0sfjpx19.js:121086-121190 placement
/**
 * 对一批输入编辑触发 prompt.edit 钩子链，核心处理器在未改写时保持原结果。
 */
function dispatchPromptEdit(e, signal) {
  let promptEditEvent = toPromptEditEvent(e);
  return NO_CORE_AT_CHAIN_BOTTOM("prompt.edit", {
    signal,
    core: {
      "prompt.edit": editCoreStep(promptEditEvent, e.after),
    },
  })(promptEditEvent);
}
//@ chunk-0sfjpx19.js:121190-121396 placement
function rebaseEdit(e, n) {
  if ((n.start === n.end && n.inputText === "") || e.end <= n.start) return e;
  let s = n.inputText.length - (n.end - n.start);
  if (!(n.end <= e.start)) return;
  return {
    start: e.start + s,
    end: e.end + s,
    inputText: e.inputText,
  };
}
//@ chunk-0sfjpx19.js:121396-121699 placement
/**
 * 根据钩子改写结果与当前草稿计算新的输入框状态；草稿已移动无法套用时给出原因。
 */
function resolveEditedBox(after, n, r) {
  if (n.text === after.text && n.cursor === after.cursor) return {};
  if (r.text === after.text && r.cursor === after.cursor)
    return {
      box: clampCursor(n),
    };
  let y = diffTextEdit(after, r);
  let b = y.end - y.start === after.text.length ? undefined : rebaseEdit(diffTextEdit(after, n), y);
  if (b === undefined)
    return {
      reason: "a rewrite no longer fits the draft (it moved meanwhile)",
    };
  return {
    box: applyEditKeepingCursor(r, b),
  };
}
//@ chunk-0sfjpx19.js:121699-122470 placement
/**
 * 应用 prompt.edit 钩子对草稿的改写（草稿已变或用户正在输入时放弃）。
 */
function applyPromptEdit(e) {
  let raise = e.raise ?? dispatchPromptEdit;
  let later = e.later ?? queueMicrotask;
  let s = e.report ?? ((T) => logForDebugging(T));
  let abortController = new AbortController();
  let y = false;
  let _ = [];
  let b;
  let k = false;
  function w() {
    k = false;
    if (_.length === 0 || b !== undefined) return;
    let T = summarizeEditBatch(_);
    _ = [];
    b = T;
    raise(T, abortController.signal).then(
      (D) => S(T, D),
      (error) => {
        s(`prompt.edit: ${errorMessage(error)}; the editor's edit stands`);
        S(T, T.after);
      },
    );
  }
  function S(T, D) {
    b = undefined;
    if (abortController.signal.aborted) return;
    let editedBox = resolveEditedBox(T.after, D, e.read());
    if (editedBox.box !== undefined) {
      let before = cursorAtEnd(e.read());
      e.commit(editedBox.box);
      e.carryLayers?.({
        before,
        after: cursorAtEnd(e.read()),
      });
    } else if (editedBox.reason !== undefined)
      s(`prompt.edit: ${editedBox.reason}; the person's typing stands`);
    if (e.read().text === D.text) e.paint?.(D.decorations, D.text);
    w();
  }
  return {
    isRecording: () => y,
    record: (T) => {
      e.carry?.(T);
      _.push(T);
      if (!k && b === undefined) {
        k = true;
        later(w);
      }
    },
    setHooked: (T) => {
      y = T;
    },
    dispose: () => {
      _ = [];
      abortController.abort();
    },
  };
}
//@ chunk-0sfjpx19.js:122470-122745 placement
async function raiseSessionAttach(e, n) {
  if (
    !clientRegistry.attach({
      ...e,
      attachedAt: Date.now(),
      ...(n !== undefined && {
        answers: n,
      }),
    })
  )
    return false;
  logForDebugging(`session.attach: ${e.clientId} on ${e.surface}`);
  try {
    await commandSetSignalA.get();
    await eventCallersWrapper().session.attach(e);
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
async function raiseSessionDetach(clientId, n, r) {
  let s = clientRegistry.detach(clientId);
  if (s === undefined) return;
  logForDebugging(`session.detach: ${clientId} (${n})`);
  try {
    await commandSetSignalA.get();
    await eventCallersWrapper(r).session.detach({
      surface: s.surface,
      clientId,
      reason: n,
    });
  } catch (error) {
    logForDebugging(`session.detach: failed: ${errorMessage(error)}`, {
      level: "error",
    });
  }
  return s;
}
//@ chunk-0sfjpx19.js:123047-123275 placement
/**
 * 对所有已附着客户端触发 session.detach，记录失败并返回失败数。
 */
async function detachAllClients_2() {
  let flattened = (
    await Promise.allSettled(clientRegistry.list().map((n) => raiseSessionDetach(n.clientId, DETACH)))
  ).flatMap((n) => (n.status === "rejected" ? [n.reason] : []));
  for (let n of flattened)
    logForDebugging(`session.detach: failed: ${errorMessage(n)}`, {
      level: "error",
    });
  return flattened.length;
}
//@ chunk-0sfjpx19.js:123275-123350 placement
/**
 * 结束所有客户端会话
 */
async function detachAllClients(e) {
  for (let n of clientRegistry.list()) await raiseSessionDetach(n.clientId, "end", e);
}
//@ chunk-0sfjpx19.js:123350-123705 placement
/**
 * 为加载的插件触发 session.start（同一加载只触发一次）。
 */
function raiseSessionStart(e, weakSet, r) {
  for (let s of e) {
    if (weakSet.has(s)) continue;
    weakSet.add(s);
    if (!s.hooks("session.start")) continue;
    logForDebugging(
      `session.start: raised for ${s.name} ` +
        (recordSessionStartLoad(s) ? "(again, the same load)" : "(loaded later)"),
    );
    Promise.resolve()
      .then(() =>
        eventCallersWrapper({
          only: s.name,
        }).session.start({
          cwd: getCwd(),
          ...r,
        }),
      )
      .catch((error) => {
        logForDebugging(`session.start: failed for ${s.name}: ${errorMessage(error)}`, {
          level: "error",
        });
      });
  }
}
//@ chunk-0sfjpx19.js:123705-124155 placement
async function describeInteractivity({ loaded, surface, isInteractive }, s) {
  await Promise.resolve(loaded).catch(() => {
    return;
  });
  if (!s()) return;
  logForDebugging(
    `session.start: raised (surface ${surface ?? "none"}, ${isInteractive ? "interactive" : "not interactive"})`,
  );
  let loadedModules = getPluginRegistry().loadedModules;
  let weakSet = new WeakSet(loadedModules);
  for (let loadedModule of loadedModules) recordSessionStartLoad(loadedModule);
  workersLoadedReporter.set((_) =>
    raiseSessionStart(_, weakSet, {
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
var runMentionChain = async (e) => (await import("./chunk-a53esm6j.js")).runPromptMentionChain(e);
//@ chunk-0sfjpx19.js:124235-124532 placement
function raiseSessionAppend(e, n) {
  if (
    !hasModuleHookingSite("session.append", {
      door: "queue",
    })
  )
    return;
  let s = orderedRowSource({
    keep: () => {},
    rows: () => [],
    isHookable: true,
  });
  return Promise.resolve(
    appendRowsWithHooks(
      s,
      [
        createUserMessage({
          content: e,
        }),
      ],
      {
        door: "queue",
        ...(n && {
          hookOrigin: n,
        }),
      },
    ),
  ).then(
    ([h]) => {
      let y = h?.type === "user" ? getContentText(h.message.content) : e;
      return y === NO_CONTENT_MESSAGE && e !== y ? "" : (y ?? "");
    },
    () => e,
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
var costChanged = (e, cost) => (e ? e.usage.cost?.usd !== cost?.usd : cost !== undefined);
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
function rateLimitsChanged(e, n) {
  let rateLimits = n.usage.rateLimits;
  if (!e) return rateLimits.length > 0;
  let s = new Map(e.usage.rateLimits.map((rateLimit) => [rateLimit.kind, rateLimit.percentUsed]));
  return (
    e.limitStatus !== n.limitStatus ||
    s.size !== rateLimits.length ||
    rateLimits.some((rateLimit) => {
      let y = s.get(rateLimit.kind);
      return y === undefined || Math.abs(rateLimit.percentUsed - y) >= MIN_COST_DELTA - NEGLIGIBLE_COST;
    })
  );
}
//@ chunk-0sfjpx19.js:124973-125135 placement
/**
 * 比较两次会话度量，列出变化的类别（context、rateLimits、cost）。
 */
function changedMeasures(e, n) {
  let r = [];
  if (usageWindowChanged(e?.usage.context, n.usage.context)) r.push("context");
  if (rateLimitsChanged(e, n)) r.push("rateLimits");
  if (costChanged(e, n.usage.cost)) r.push("cost");
  return r;
}
//@ chunk-0sfjpx19.js:125135-125170 placement
/**
 * 会话度量槽
 */
var sessionMeasureSlot = identity(createValueSlot(), (e) => e.set(undefined));
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
var withRateLimits = (e, n) => ({
  usage: {
    ...n.usage,
    rateLimits: e.usage.rateLimits,
  },
  limitStatus: e.limitStatus,
});
//@ chunk-0sfjpx19.js:125331-125395 placement
/**
 * 按需保留限流
 */
function keepRateLimits(e, n, r) {
  return !e || r.includes("rateLimits") ? n : withRateLimits(e, n);
}
//@ chunk-0sfjpx19.js:125395-125737 placement
async function raiseSessionMeasure(e) {
  try {
    let n = await measureDefault();
    let r = sessionMeasureSlot.get();
    let s = changedMeasures(r, n);
    if (!(e === "turn" ? s.length > 0 : s.includes("rateLimits"))) return;
    sessionMeasureSlot.set(keepRateLimits(r, n, s));
    let { context, rateLimits, cost } = n.usage;
    await eventCallersWrapper().session.measure({
      context,
      rateLimits,
      ...(cost !== undefined && {
        cost,
      }),
      changed: s,
    });
  } catch (error) {
    logForDebugging(`session.measure (${e}): failed: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
}
//@ chunk-0sfjpx19.js:125737-125772 placement
/**
 * 会话结束槽
 */
var sessionEndSlot = identity(createValueSlot(), (e) => e.set(undefined));
//@ chunk-0sfjpx19.js:125772-125890 placement
async function runMeasureLoop(e, n) {
  let r = n;
  try {
    while (r) {
      await raiseSessionMeasure(r);
      r = e.next;
      e.next = undefined;
    }
  } finally {
    if (sessionEndSlot.get() === e) sessionEndSlot.set(undefined);
  }
}
//@ chunk-0sfjpx19.js:125890-125903 placement
/**
 * 宿主状态槽
 */
var hostStateSlot = createHostStateSlot();
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
var scheduleSessionMeasure = (e) => {
  if (!isSessionMeasureHooked()) return Promise.resolve();
  let n = sessionEndSlot.get();
  if (n) {
    n.next = n.next === "turn" ? "turn" : e;
    return n.running;
  }
  let r = {
    running: Promise.resolve(),
    next: undefined,
  };
  sessionEndSlot.set(r);
  r.running = runMeasureLoop(r, e);
  return r.running;
};
//@ chunk-0sfjpx19.js:126174-126182 placement
setSessionMeasurer(scheduleSessionMeasure);
//@ chunk-0sfjpx19.js:126182-126330 placement
/**
 * 订阅限额状态变化以触发 session.measure（只订阅一次）。
 */
function watchLimitsForMeasure() {
  if (hostStateSlot.get()) return;
  let e = onLimitsStatusChanged(() => {
    try {
      measureSession("limits");
    } catch (error) {
      logForDebugging(`session.measure (limits): ${errorMessage(error)}`, {
        level: "warn",
      });
    }
  });
  hostStateSlot.set(e);
  registerCleanup(e);
}
//@ chunk-0sfjpx19.js:126330-126600 placement
/**
 * 会话就绪时启动函数钩子：订阅限额、设置提及运行器与追加触发器，描述交互能力（触发 session.start），只执行一次。
 */
function startSessionHooks(e) {
  let n = commandSetSignalA.get();
  if (n) return n;
  watchLimitsForMeasure();
  setPromptMentionRunner(runMentionChain);
  queueRecordTextBuilder.set(raiseSessionAppend);
  let r = new Set();
  submitMarksSlot.set(r);
  let s = describeInteractivity(e, () => commandSetSignalA.get() === s).finally(() => {
    if (submitMarksSlot.get() === r) submitMarksSlot.set(undefined);
  });
  commandSetSignalA.set(s);
  let h = Promise.resolve(e.loaded).then(
    () => {
      return;
    },
    () => {
      return;
    },
  );
  commandSetSignalB.set(h);
  trackQueueRecordChain(h);
  return s;
}
//@ chunk-0sfjpx19.js:126600-126653 placement
/**
 * 中止时静默
 */
var raceWithAbortSilently = (e, n) =>
  raceWithAbortSignal(e, n, () => new AbortError()).catch(() => {
    return;
  });
//@ chunk-0sfjpx19.js:126653-126752 placement
/**
 * session.end 核心步骤
 */
var sessionEndCoreStep = (e) => ({
  name: "core",
  isCore: true,
  budgetMs: 0,
  run: async (n) => {
    await e();
    return {
      sessionId: n.sessionId,
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
  let y = AbortSignal.timeout(boundMs);
  let _;
  let b = () =>
    (_ ??= isNonResetExitReason(reason)
      ? detachAllClients({
          signal: y,
          cutAt,
        })
      : Promise.resolve());
  try {
    if (!isSessionEndHooked(reason)) {
      await raceWithAbortSilently(b(), y);
      return;
    }
    try {
      await raceWithAbortSignal(
        eventCallersWrapper({
          signal: y,
          cutAt,
          core: {
            "session.end": sessionEndCoreStep(b),
          },
        }).session.end({
          reason,
          sessionId,
          resume: {
            id: sessionId,
          },
        }),
        y,
        () => new AbortError(),
      );
    } catch (error) {
      let w = y.aborted
        ? "cut at the SessionEnd bound, the session ends regardless"
        : `failed: ${errorMessage(error)}`;
      logForDebugging(`session.end (${reason}): ${w}`, {
        level: "warn",
      });
    }
    await raceWithAbortSilently(b(), y);
  } finally {
    resetPluginState();
  }
};
//@ chunk-0sfjpx19.js:127375-127383 placement
setSessionEndRaiser(raiseSessionEnd);
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
async function raiseSessionSend(e) {
  let { raised, signalOf, skipping } = e;
  let { text, ...y } = raised;
  let _ = pluginsMatchingEvent("session.send", y, skipping);
  if (_.length === 0)
    return {
      send: raised,
      delivering: yvo,
    };
  let coreHandoff = createCoreHandoff(SEND_NOT_DELIVERED_MESSAGE);
  let k = await awaitArrivalOrAnswer(
    coreHandoff,
    eventCallersWrapper({
      signal: signalOf(),
      origin: skipping,
      core: {
        "session.send": performCoreStep(coreHandoff),
      },
    }).session.send(raised),
  );
  if (!k.arrived) {
    let { answered } = k;
    let D = answered.isDelivered ? "a hook delivered it itself" : `refused by a hook (${answered.reason})`;
    logForDebugging(
      `session.send to ${raised.to} (${raised.origin.kind}): ${D}; hooked by ${_.join("+")}; nothing sent`,
    );
    return {
      answered,
    };
  }
  let arrived = k.arrived;
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
setSessionSendRunner(raiseSessionSend);
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
function raiseViewerAbsence(e, n, r) {
  let s;
  let h;
  let y = false;
  let _ = false;
  function b() {
    s = undefined;
    h = undefined;
  }
  function k() {
    y = false;
    b();
    e(undefined);
  }
  function w(R) {
    logForDebugging(`viewer absence: no viewer for ${R} ms`);
    k();
    try {
      r();
    } catch (error) {
      logForDebugging(`viewer absence: failed: ${errorMessage(error)}`, {
        level: "error",
      });
    }
  }
  function S(R) {
    let U = h !== undefined && R - h <= SESSION_END_HARD_CAP_MS ? (s ?? R) : R;
    s = U;
    h = R;
    if (R - U >= SESSION_END_WAIT_MS) w(R - U);
  }
  let T = (R) => (R ? b() : S(Date.now()));
  let D = (R) => (n() ? T(R) : k());
  let E = (R) => (y ? D(R) : undefined);
  function N() {
    b();
    if (!y && !_) {
      y = true;
      e(E);
    }
  }
  function G() {
    _ = true;
    k();
  }
  return {
    heard: N,
    stop: G,
  };
}
export {
  collectSurfaceHandles,
  cXe,
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

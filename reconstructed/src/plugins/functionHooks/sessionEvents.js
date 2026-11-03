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
import { tUo } from "../../utils/promptTextSanitize.js";
import { NO_CORE_AT_CHAIN_BOTTOM, Xue } from "./eventCatalog.js";
import { applyTextInsertion } from "./coreHandlers.js";
import { logForDebugging } from "../../utils/debug.js";
import { errorMessage, AbortError } from "../../utils/errors.js";
import { vk } from "./panes.js";
import { MZ, B1r } from "./commandRunDispatch.js";
import { recordSessionStartLoad } from "./promptApi.js";
import { getCwd } from "../../utils/cwd.js";
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { r2r } from "./hooksModuleLoader.js";
import { hasModuleHookingSite } from "../hooksModules/loadedModuleFilters.js";
import { Ebe, appendRowsWithHooks } from "../../utils/queryHelpers.js";
import { createUserMessage, getContentText } from "../../utils/messages.js";
import { NO_CONTENT_MESSAGE } from "../../constants/messages.js";
import { ge } from "../../utils/identity.js";
import { to } from "../../utils/valueSlot.js";
import { sessionUsageOp } from "./sessionApi.js";
import { ENGINE } from "./dispatch/chain.js";
import { getCurrentLimits, onLimitsStatusChanged } from "../../services/claudeAiLimits.js";
import { h2r } from "./devModsStatus.js";
import { setSessionMeasurer, measureSession } from "../../query/turnHooks.js";
import { registerCleanup } from "../../utils/cleanupRegistry.js";
import { setPromptMentionRunner } from "./promptMentionRunner.js";
import { FKr, kXs } from "../../utils/messageQueue/queueRecords.js";
import { oX } from "./promptSubmit.js";
import { raceWithAbortSignal } from "../../utils/sleep.js";
import { isNonResetExitReason } from "../../entrypoints/sdk/coreSchemas.js";
import { resetPluginState } from "./api/state.js";
import { setSessionEndRaiser } from "../../utils/hooks.js";
import { pluginsMatchingEvent } from "./hookDispatch.js";
import { freeze as freeze_3, setSessionSendRunner } from "../../tools/SendMessageTool/deliveryResults.js";
import { createCoreHandoff, awaitArrivalOrAnswer, D1r } from "./sessionReceive.js";
import { CXe } from "../../services/remoteTools/awayTimings.js";
import { hUr } from "../../cli/transports/SSETransport.js";

//@ chunk-0sfjpx19.js:118583-118974 placement
function collectSurfaceHandles(e) {
  if (e === void 0 || typeof e === "string" || e.type === "engine") return [];
  if (e.type === "Button" || e.type === "Input" || e.type === "Select") {
    let { plugin: plugin, handle: handle } = e.press;
    return [
      {
        tag: e.type,
        plugin: plugin,
        handle: handle,
        element: e.props.key,
        isAutoFocus: e.props.autoFocus === !0,
        ...(e.type !== "Button" && { value: e.props.value }),
        ...(e.type === "Select" && { options: e.props.options }),
      },
    ];
  }
  return (e.children ?? []).flatMap(collectSurfaceHandles);
}
/**
 * 清洗 prompt.autocomplete 建议：文本去控制字符（空则丢弃），标签压成单行。
 */
//@ chunk-0sfjpx19.js:118974-119190 placement
function normalizeAutocompleteSuggestions(e) {
  let n = tUo();
  return e.flatMap(({ text: text, label: label, description: description }) => {
    let y = n(text),
      _ = label?.replace(/\s+/gu, " ").trim();
    return y === ""
      ? []
      : {
          text: y,
          ...(_ !== void 0 && _ !== "" && { label: _ }),
          ...(description !== void 0 && { description: description }),
        };
  });
}
//@ chunk-0sfjpx19.js:119190-119245 placement
var Y0n = (e, n) => NO_CORE_AT_CHAIN_BOTTOM("prompt.autocomplete", { signal: n })(e);
/**
 * 取光标前连续的非空白片段作为当前词（光标夹到文本内），无则 undefined。
 */
//@ chunk-0sfjpx19.js:119245-119438 placement
function currentToken(e) {
  let min = Math.min(Math.max(e.cursor, 0), e.text.length),
    r = min;
  while (r > 0 && e.text.charAt(r - 1).trim() !== "") r -= 1;
  return r === min ? void 0 : { text: e.text, cursor: min, token: e.text.slice(r, min), start: r };
}
//@ chunk-0sfjpx19.js:119438-119479 placement
var freeze = Object.freeze({ kind: "composer" });
//@ chunk-0sfjpx19.js:119479-119745 placement
function applyEditKeepingCursor(e, n) {
  let { text: text } = applyTextInsertion({ origin: freeze, text: e.text, cursor: e.cursor, ...n }),
    s = n.inputText.length - (n.end - n.start),
    h = e.cursor >= n.end,
    y = !h && e.cursor > n.start,
    _ = h ? e.cursor + s : y ? n.start + n.inputText.length : e.cursor;
  return { text: text, cursor: Math.max(0, Math.min(_, text.length)) };
}
//@ chunk-0sfjpx19.js:119745-119826 placement
var X0n = (e) => ({ text: e.text, cursor: Math.max(0, Math.min(e.cursor, e.text.length)) });
//@ chunk-0sfjpx19.js:119826-119868 placement
var dn = (e) => ({ ...e, cursor: e.text.length });
//@ chunk-0sfjpx19.js:119868-120020 placement
function summarizeEditBatch(e) {
  let [n] = e,
    r = n?.before ?? { text: "", cursor: 0 },
    s = e.at(-1)?.after ?? r,
    h = e.length === 1 && n?.key !== void 0;
  return { before: r, after: s, ...(h && { key: n.key }) };
}
//@ chunk-0sfjpx19.js:120020-120132 placement
var sameEdit = (e, n) =>
  e.text === n.text &&
  e.cursor === n.cursor &&
  e.start === n.start &&
  e.end === n.end &&
  e.inputText === n.inputText;
//@ chunk-0sfjpx19.js:120132-120214 placement
var qo = (e, n) => ({
  name: "core",
  isCore: !0,
  budgetMs: 0,
  run: async (r) => (sameEdit(r, e) ? n : applyTextInsertion(r)),
});
//@ chunk-0sfjpx19.js:120214-120432 placement
function describeEditKey(e) {
  let n = [...e.key].length === 1,
    r = e.name !== "" && !n;
  if (!n && !r) return;
  let s = e.key === " ",
    h = r ? e.name : s ? "space" : e.key;
  return Object.freeze({
    key: h,
    ...(e.ctrl && { ctrl: !0 }),
    ...(e.shift && { shift: !0 }),
    ...(e.meta && { meta: !0 }),
  });
}
//@ chunk-0sfjpx19.js:120432-120514 placement
function Xo(e) {
  let n = e.key === void 0 ? void 0 : describeEditKey(e.key);
  return n === void 0 ? {} : { key: n };
}
//@ chunk-0sfjpx19.js:120514-120577 placement
function cn(e, n) {
  let r = 0;
  for (; r < e; r += 1) if (!n(r)) break;
  return r;
}
/**
 * 比较两段文本（以光标限定公共前缀），求出最小替换区间 {start, end, inputText}。
 */
//@ chunk-0sfjpx19.js:120577-120983 placement
function diffTextEdit(e, n) {
  if (e.text === n.text) return { start: n.cursor, end: n.cursor, inputText: "" };
  let r = cn(
      Math.min(e.cursor, n.cursor, e.text.length, n.text.length),
      (h) => e.text.charCodeAt(h) === n.text.charCodeAt(h),
    ),
    s = cn(
      Math.min(e.text.length, n.text.length) - r,
      (h) => e.text.charCodeAt(e.text.length - 1 - h) === n.text.charCodeAt(n.text.length - 1 - h),
    );
  return { start: r, end: e.text.length - s, inputText: n.text.slice(r, n.text.length - s) };
}
//@ chunk-0sfjpx19.js:120983-121086 placement
var toPromptEditEvent = (e) => ({
  origin: freeze,
  ...Xo(e),
  text: e.before.text,
  cursor: e.before.cursor,
  ...diffTextEdit(e.before, e.after),
});
/**
 * 对一批输入编辑触发 prompt.edit 钩子链，核心处理器在未改写时保持原结果。
 */
//@ chunk-0sfjpx19.js:121086-121190 placement
function dispatchPromptEdit(e, n) {
  let r = toPromptEditEvent(e);
  return NO_CORE_AT_CHAIN_BOTTOM("prompt.edit", { signal: n, core: { "prompt.edit": qo(r, e.after) } })(r);
}
//@ chunk-0sfjpx19.js:121190-121396 placement
function rebaseEdit(e, n) {
  if ((n.start === n.end && n.inputText === "") || e.end <= n.start) return e;
  let s = n.inputText.length - (n.end - n.start);
  if (!(n.end <= e.start)) return;
  return { start: e.start + s, end: e.end + s, inputText: e.inputText };
}
/**
 * 根据钩子改写结果与当前草稿计算新的输入框状态；草稿已移动无法套用时给出原因。
 */
//@ chunk-0sfjpx19.js:121396-121699 placement
function resolveEditedBox(e, n, r) {
  if (n.text === e.text && n.cursor === e.cursor) return {};
  if (r.text === e.text && r.cursor === e.cursor) return { box: X0n(n) };
  let y = diffTextEdit(e, r),
    b = y.end - y.start === e.text.length ? void 0 : rebaseEdit(diffTextEdit(e, n), y);
  if (b === void 0) return { reason: "a rewrite no longer fits the draft (it moved meanwhile)" };
  return { box: applyEditKeepingCursor(r, b) };
}
/**
 * 应用 prompt.edit 钩子对草稿的改写（草稿已变或用户正在输入时放弃）。
 */
//@ chunk-0sfjpx19.js:121699-122470 placement
function applyPromptEdit(e) {
  let n = e.raise ?? dispatchPromptEdit,
    r = e.later ?? queueMicrotask,
    s = e.report ?? ((T) => logForDebugging(T)),
    abortController = new AbortController(),
    y = !1,
    _ = [],
    b,
    k = !1;
  function w() {
    if (((k = !1), _.length === 0 || b !== void 0)) return;
    let T = summarizeEditBatch(_);
    ((_ = []),
      (b = T),
      n(T, abortController.signal).then(
        (D) => S(T, D),
        (D) => {
          (s(`prompt.edit: ${errorMessage(D)}; the editor's edit stands`), S(T, T.after));
        },
      ));
  }
  function S(T, D) {
    if (((b = void 0), abortController.signal.aborted)) return;
    let E = resolveEditedBox(T.after, D, e.read());
    if (E.box !== void 0) {
      let G = dn(e.read());
      (e.commit(E.box), e.carryLayers?.({ before: G, after: dn(e.read()) }));
    } else if (E.reason !== void 0) s(`prompt.edit: ${E.reason}; the person's typing stands`);
    if (e.read().text === D.text) e.paint?.(D.decorations, D.text);
    w();
  }
  return {
    isRecording: () => y,
    record: (T) => {
      if ((e.carry?.(T), _.push(T), !k && b === void 0)) ((k = !0), r(w));
    },
    setHooked: (T) => {
      y = T;
    },
    dispose: () => {
      ((_ = []), abortController.abort());
    },
  };
}
//@ chunk-0sfjpx19.js:122470-122745 placement
async function raiseSessionAttach(e, n) {
  if (!vk.attach({ ...e, attachedAt: Date.now(), ...(n !== void 0 && { answers: n }) })) return !1;
  logForDebugging(`session.attach: ${e.clientId} on ${e.surface}`);
  try {
    (await MZ.get(), await Xue().session.attach(e));
  } catch (error) {
    logForDebugging(`session.attach: failed: ${errorMessage(error)}`, { level: "error" });
  }
  return !0;
}
//@ chunk-0sfjpx19.js:122745-122773 placement
var ypt = (e) => `${e}:default`;
//@ chunk-0sfjpx19.js:122773-122789 placement
var DETACH = "detach";
//@ chunk-0sfjpx19.js:122789-123047 placement
async function raiseSessionDetach(e, n, r) {
  let detach = vk.detach(e);
  if (detach === void 0) return;
  logForDebugging(`session.detach: ${e} (${n})`);
  try {
    (await MZ.get(), await Xue(r).session.detach({ surface: detach.surface, clientId: e, reason: n }));
  } catch (error) {
    logForDebugging(`session.detach: failed: ${errorMessage(error)}`, { level: "error" });
  }
  return detach;
}
/**
 * 对所有已附着客户端触发 session.detach，记录失败并返回失败数。
 */
//@ chunk-0sfjpx19.js:123047-123275 placement
async function detachAllClients() {
  let flattened = (
    await Promise.allSettled(vk.list().map((n) => raiseSessionDetach(n.clientId, DETACH)))
  ).flatMap((n) => (n.status === "rejected" ? [n.reason] : []));
  for (let n of flattened) logForDebugging(`session.detach: failed: ${errorMessage(n)}`, { level: "error" });
  return flattened.length;
}
//@ chunk-0sfjpx19.js:123275-123350 placement
async function Vpo(e) {
  for (let n of vk.list()) await raiseSessionDetach(n.clientId, "end", e);
}
/**
 * 为加载的插件触发 session.start（同一加载只触发一次）。
 */
//@ chunk-0sfjpx19.js:123350-123705 placement
function raiseSessionStart(e, n, r) {
  for (let s of e) {
    if (n.has(s)) continue;
    if ((n.add(s), !s.hooks("session.start"))) continue;
    (logForDebugging(
      `session.start: raised for ${s.name} ` +
        (recordSessionStartLoad(s) ? "(again, the same load)" : "(loaded later)"),
    ),
      Promise.resolve()
        .then(() => Xue({ only: s.name }).session.start({ cwd: getCwd(), ...r }))
        .catch((h) => {
          logForDebugging(`session.start: failed for ${s.name}: ${errorMessage(h)}`, { level: "error" });
        }));
  }
}
//@ chunk-0sfjpx19.js:123705-124155 placement
async function describeInteractivity({ loaded: loaded, surface: surface, isInteractive: isInteractive }, s) {
  if (
    (await Promise.resolve(loaded).catch(() => {
      return;
    }),
    !s())
  )
    return;
  logForDebugging(
    `session.start: raised (surface ${surface ?? "none"}, ${isInteractive ? "interactive" : "not interactive"})`,
  );
  let loadedModules = getPluginRegistry().loadedModules,
    weakSet = new WeakSet(loadedModules);
  for (let _ of loadedModules) recordSessionStartLoad(_);
  r2r.set((_) => raiseSessionStart(_, weakSet, { surface: surface, isInteractive: isInteractive }));
  try {
    await Xue().session.start({ cwd: getCwd(), surface: surface, isInteractive: isInteractive });
  } catch (error) {
    logForDebugging(`session.start: failed: ${errorMessage(error)}`, { level: "error" });
  }
}
//@ chunk-0sfjpx19.js:124155-124235 placement
var wa = async (e) => (await import("./chunk-a53esm6j.js")).runPromptMentionChain(e);
//@ chunk-0sfjpx19.js:124235-124532 placement
function raiseSessionAppend(e, n) {
  if (!hasModuleHookingSite("session.append", { door: "queue" })) return;
  let s = Ebe({ keep: () => {}, rows: () => [], isHookable: !0 });
  return Promise.resolve(
    appendRowsWithHooks(s, [createUserMessage({ content: e })], {
      door: "queue",
      ...(n && { hookOrigin: n }),
    }),
  ).then(
    ([h]) => {
      let y = h?.type === "user" ? getContentText(h.message.content) : e;
      return y === NO_CONTENT_MESSAGE && e !== y ? "" : (y ?? "");
    },
    () => e,
  );
}
//@ chunk-0sfjpx19.js:124532-124614 placement
var lr = (e, n) => !e || e.tokens !== n.tokens || e.window !== n.window || e.percent !== n.percent;
//@ chunk-0sfjpx19.js:124614-124668 placement
var ur = (e, n) => (e ? e.usage.cost?.usd !== n?.usd : n !== void 0);
//@ chunk-0sfjpx19.js:124668-124687 placement
var dr = 0.000000001;
//@ chunk-0sfjpx19.js:124687-124696 placement
var cr = 1;
//@ chunk-0sfjpx19.js:124696-124973 placement
function rateLimitsChanged(e, n) {
  let rateLimits = n.usage.rateLimits;
  if (!e) return rateLimits.length > 0;
  let s = new Map(e.usage.rateLimits.map((rateLimit) => [rateLimit.kind, rateLimit.percentUsed]));
  return (
    e.limitStatus !== n.limitStatus ||
    s.size !== rateLimits.length ||
    rateLimits.some((h) => {
      let y = s.get(h.kind);
      return y === void 0 || Math.abs(h.percentUsed - y) >= cr - dr;
    })
  );
}
/**
 * 比较两次会话度量，列出变化的类别（context、rateLimits、cost）。
 */
//@ chunk-0sfjpx19.js:124973-125135 placement
function changedMeasures(e, n) {
  let r = [];
  if (lr(e?.usage.context, n.usage.context)) r.push("context");
  if (rateLimitsChanged(e, n)) r.push("rateLimits");
  if (ur(e, n.usage.cost)) r.push("cost");
  return r;
}
//@ chunk-0sfjpx19.js:125135-125170 placement
var pn = ge(to(), (e) => e.set(void 0));
//@ chunk-0sfjpx19.js:125170-125238 placement
var pr = async () => ({ usage: await sessionUsageOp({}, ENGINE), limitStatus: getCurrentLimits().status });
//@ chunk-0sfjpx19.js:125238-125331 placement
var gr = (e, n) => ({ usage: { ...n.usage, rateLimits: e.usage.rateLimits }, limitStatus: e.limitStatus });
//@ chunk-0sfjpx19.js:125331-125395 placement
function hr(e, n, r) {
  return !e || r.includes("rateLimits") ? n : gr(e, n);
}
//@ chunk-0sfjpx19.js:125395-125737 placement
async function raiseSessionMeasure(e) {
  try {
    let n = await pr(),
      r = pn.get(),
      s = changedMeasures(r, n);
    if (!(e === "turn" ? s.length > 0 : s.includes("rateLimits"))) return;
    pn.set(hr(r, n, s));
    let { context: context, rateLimits: rateLimits, cost: cost } = n.usage;
    await Xue().session.measure({
      context: context,
      rateLimits: rateLimits,
      ...(cost !== void 0 && { cost: cost }),
      changed: s,
    });
  } catch (error) {
    logForDebugging(`session.measure (${e}): failed: ${errorMessage(error)}`, { level: "warn" });
  }
}
//@ chunk-0sfjpx19.js:125737-125772 placement
var He = ge(to(), (e) => e.set(void 0));
//@ chunk-0sfjpx19.js:125772-125890 placement
async function runMeasureLoop(e, n) {
  let r = n;
  try {
    while (r) (await raiseSessionMeasure(r), (r = e.next), (e.next = void 0));
  } finally {
    if (He.get() === e) He.set(void 0);
  }
}
//@ chunk-0sfjpx19.js:125890-125903 placement
var gn = h2r();
//@ chunk-0sfjpx19.js:125903-125966 placement
function wr() {
  try {
    return hasModuleHookingSite("session.measure");
  } catch {
    return !1;
  }
}
/**
 * 合并触发 session.measure：已在度量中则排队下一次（turn 优先），否则启动循环。
 */
//@ chunk-0sfjpx19.js:125966-126174 placement
var scheduleSessionMeasure = (e) => {
  if (!wr()) return Promise.resolve();
  let n = He.get();
  if (n) return ((n.next = n.next === "turn" ? "turn" : e), n.running);
  let r = { running: Promise.resolve(), next: void 0 };
  return (He.set(r), (r.running = runMeasureLoop(r, e)), r.running);
};
//@ chunk-0sfjpx19.js:126174-126182 placement
setSessionMeasurer(scheduleSessionMeasure);
/**
 * 订阅限额状态变化以触发 session.measure（只订阅一次）。
 */
//@ chunk-0sfjpx19.js:126182-126330 placement
function watchLimitsForMeasure() {
  if (gn.get()) return;
  let e = onLimitsStatusChanged(() => {
    try {
      measureSession("limits");
    } catch (error) {
      logForDebugging(`session.measure (limits): ${errorMessage(error)}`, { level: "warn" });
    }
  });
  (gn.set(e), registerCleanup(e));
}
/**
 * 会话就绪时启动函数钩子：订阅限额、设置提及运行器与追加触发器，描述交互能力（触发 session.start），只执行一次。
 */
//@ chunk-0sfjpx19.js:126330-126600 placement
function startSessionHooks(e) {
  let n = MZ.get();
  if (n) return n;
  (watchLimitsForMeasure(), setPromptMentionRunner(wa), FKr.set(raiseSessionAppend));
  let r = new Set();
  oX.set(r);
  let s = describeInteractivity(e, () => MZ.get() === s).finally(() => {
    if (oX.get() === r) oX.set(void 0);
  });
  MZ.set(s);
  let h = Promise.resolve(e.loaded).then(
    () => {
      return;
    },
    () => {
      return;
    },
  );
  return (B1r.set(h), kXs(h), s);
}
//@ chunk-0sfjpx19.js:126600-126653 placement
var hn = (e, n) =>
  raceWithAbortSignal(e, n, () => new AbortError()).catch(() => {
    return;
  });
//@ chunk-0sfjpx19.js:126653-126752 placement
var Cr = (e) => ({
  name: "core",
  isCore: !0,
  budgetMs: 0,
  run: async (n) => (await e(), { sessionId: n.sessionId }),
});
//@ chunk-0sfjpx19.js:126790-126861 placement
function Rr(e) {
  try {
    return hasModuleHookingSite("session.end", { reason: e });
  } catch {
    return !1;
  }
}
/**
 * 触发 session.end：在 SessionEnd 时限内运行，超时则结束会话不等待。
 */
//@ chunk-0sfjpx19.js:126861-127375 placement
var raiseSessionEnd = async ({ reason: reason, sessionId: sessionId, boundMs: boundMs, end: end }) => {
  await end();
  let h = Date.now() + boundMs,
    timeout = AbortSignal.timeout(boundMs),
    _,
    b = () => (_ ??= isNonResetExitReason(reason) ? Vpo({ signal: timeout, cutAt: h }) : Promise.resolve());
  try {
    if (!Rr(reason)) {
      await hn(b(), timeout);
      return;
    }
    try {
      await raceWithAbortSignal(
        Xue({ signal: timeout, cutAt: h, core: { "session.end": Cr(b) } }).session.end({
          reason: reason,
          sessionId: sessionId,
          resume: { id: sessionId },
        }),
        timeout,
        () => new AbortError(),
      );
    } catch (error) {
      let w = timeout.aborted
        ? "cut at the SessionEnd bound, the session ends regardless"
        : `failed: ${errorMessage(error)}`;
      logForDebugging(`session.end (${reason}): ${w}`, { level: "warn" });
    }
    await hn(b(), timeout);
  } finally {
    resetPluginState();
  }
};
//@ chunk-0sfjpx19.js:127375-127383 placement
setSessionEndRaiser(raiseSessionEnd);
//@ chunk-0sfjpx19.js:127383-127520 placement
var createSendOutcome = (e) => ({
  delivered: () => e.done({ isDelivered: !0 }),
  refused: (n) => e.done({ isDelivered: !1, reason: n }),
  [Symbol.dispose]: e[Symbol.dispose],
});
//@ chunk-0sfjpx19.js:127520-127620 placement
var SEND_NOT_DELIVERED_MESSAGE =
  "session.send: the message was not delivered (the send failed after the hooks passed it on)";
/**
 * 触发 session.send：钩子可改写、拒绝或自行投递消息。
 */
//@ chunk-0sfjpx19.js:127620-128279 placement
async function raiseSessionSend(e) {
  let { raised: raised, signalOf: signalOf, skipping: skipping } = e,
    { text: text, ...y } = raised,
    _ = pluginsMatchingEvent("session.send", y, skipping);
  if (_.length === 0) return { send: raised, delivering: freeze_3 };
  let b = createCoreHandoff(SEND_NOT_DELIVERED_MESSAGE),
    k = await awaitArrivalOrAnswer(
      b,
      Xue({ signal: signalOf(), origin: skipping, core: { "session.send": D1r(b) } }).session.send(raised),
    );
  if (!k.arrived) {
    let { answered: answered } = k,
      D = answered.isDelivered ? "a hook delivered it itself" : `refused by a hook (${answered.reason})`;
    return (
      logForDebugging(
        `session.send to ${raised.to} (${raised.origin.kind}): ${D}; hooked by ${_.join("+")}; nothing sent`,
      ),
      { answered: answered }
    );
  }
  let arrived = k.arrived;
  if (arrived.to !== raised.to || arrived.text !== raised.text)
    logForDebugging(
      `session.send to ${raised.to} (${raised.origin.kind}): rewritten by a hook (to ${arrived.to}, ${arrived.text.length} chars)`,
    );
  return { send: arrived, delivering: createSendOutcome(b) };
}
//@ chunk-0sfjpx19.js:128279-128287 placement
setSessionSendRunner(raiseSessionSend);
//@ chunk-0sfjpx19.js:128287-128300 placement
var Ir = 15000;
//@ chunk-0sfjpx19.js:128300-128318 placement
var Pr = CXe + hUr + Ir;
//@ chunk-0sfjpx19.js:128318-128332 placement
var Or = 300000;
//@ chunk-0sfjpx19.js:128332-128792 placement
function raiseViewerAbsence(e, n, r) {
  let s,
    h,
    y = !1,
    _ = !1;
  function b() {
    ((s = void 0), (h = void 0));
  }
  function k() {
    ((y = !1), b(), e(void 0));
  }
  function w(R) {
    (logForDebugging(`viewer absence: no viewer for ${R} ms`), k());
    try {
      r();
    } catch (error) {
      logForDebugging(`viewer absence: failed: ${errorMessage(error)}`, { level: "error" });
    }
  }
  function S(R) {
    let U = h !== void 0 && R - h <= Or ? (s ?? R) : R;
    if (((s = U), (h = R), R - U >= Pr)) w(R - U);
  }
  let T = (R) => (R ? b() : S(Date.now())),
    D = (R) => (n() ? T(R) : k()),
    E = (R) => (y ? D(R) : void 0);
  function N() {
    if ((b(), !y && !_)) ((y = !0), e(E));
  }
  function G() {
    ((_ = !0), k());
  }
  return { heard: N, stop: G };
}

export {
  collectSurfaceHandles,
  freeze,
  startSessionHooks,
  diffTextEdit,
  Y0n,
  normalizeAutocompleteSuggestions,
  currentToken,
  raiseSessionDetach,
  detachAllClients,
  raiseViewerAbsence,
  Vpo,
  ypt,
  applyPromptEdit,
  dispatchPromptEdit,
  X0n,
  raiseSessionAttach,
};

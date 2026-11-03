/**
 * utils/processUserInput/userPromptSubmitHooks.ts
 *
 * 2.1.316 新增：UserPromptSubmit 钩子执行与结果合并。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8fqgaf3a.js (45)
 * attribution: placement 45
 */
import { randomUUID } from "crypto";
import { createAttachmentMessage_2 as createAttachmentMessage, logForDebugging } from "../debug.js";
import { createSystemMessage, HOOK_STOPPED_MESSAGE, createUserMessage } from "../messages.js";
import { wrapPluginPrompt, KQn, Vtt } from "../messages/nonUserMessages.js";
import { StreamClosedAbortError } from "../errors.js";
import { Rs } from "../hooks/hookSerialization.js";
import {
  findPluginRenderHooks,
  uiRenderRegistry,
} from "../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { promptOriginForHooks } from "../promptSource.js";
import {
  snapshotHookRegistration,
  hasHookRegistrationChanged,
  hasPromptSubmitHooks,
} from "../plugins/functionHooks/hookRegistration.js";
import {
  executeUserPromptSubmitHooks,
  getUserPromptSubmitHookBlockingMessage,
  userPromptSubmitHooksKey,
  shouldSkipHookDueToTrust,
  MANAGED_HOOKS_TIER,
} from "../hooks.js";
import { getToolPermissionContext } from "../permissions/toolPermissionContext.js";
import { vAn, Zur } from "../abortErrors.js";
import { getPluginRegistry } from "../plugins/pluginLoadState.js";
import { isOfficialMarketplacePlugin } from "../../plugins/functionHooks/panes.js";
import { isModuleAdmitted } from "../plugins/functionHooks/admission.js";
import { hasModuleHookingSite } from "../../plugins/hooksModules/loadedModuleFilters.js";
import { isPlainObject } from "../isPlainObject.js";
import { asStringList } from "../../plugins/functionHooks/sites/siteRules.js";
import { MZ } from "../../plugins/functionHooks/commandRunDispatch.js";
import { createCoreHandoff, awaitArrivalOrAnswer } from "../../plugins/functionHooks/sessionReceive.js";
import { RBr, createSubmitChainEnds, vNi } from "../../plugins/functionHooks/promptSubmit.js";
import { abortErrorFor } from "../../plugins/functionHooks/dispatch/chain.js";
import { withHeldMedia, promptMediaSources } from "../attachmentMedia.js";
import { ASt } from "../../plugins/functionHooks/eventCatalog.js";
import { resolveMessageOrigin } from "../messageOrigin.js";

//@ chunk-8fqgaf3a.js:1017-1099 placement
var K = (e, o) => (o ? { drop: o.resultText ?? "blocked by a UserPromptSubmit hook" } : { text: e });
/**
 * 创建 UserPromptSubmit 的附加上下文附件消息。
 */
//@ chunk-8fqgaf3a.js:1136-1287 placement
var createHookContextAttachment = (e, o = "UserPromptSubmit") =>
  createAttachmentMessage({
    type: "hook_additional_context",
    content: [...e],
    hookName: o,
    toolUseID: `hook-${randomUUID()}`,
    hookEvent: "UserPromptSubmit",
  });
//@ chunk-8fqgaf3a.js:1287-1296 placement
var M = !0;
//@ chunk-8fqgaf3a.js:1296-1426 placement
var blockedPromptResult = (e, o) => ({
  messages: [
    { ...createSystemMessage(e, "warning", void 0, M), promptSubmitEnding: { ending: o, promptKept: !1 } },
  ],
  shouldQuery: !1,
  resultText: e,
});
//@ chunk-8fqgaf3a.js:1426-1490 placement
function X(e, o, r) {
  return r === !0
    ? e
    : `${e}

Original prompt: ${o}`;
}
//@ chunk-8fqgaf3a.js:1490-1516 placement
var sUt = { wasCancelled: !0 };
//@ chunk-8fqgaf3a.js:1516-1589 placement
var N = (e) => e.wasCancelled === !0 && (e.blocked === void 0 || e.stopped !== void 0);
//@ chunk-8fqgaf3a.js:1589-1676 placement
var E = (e, o, r) => (N(e) ? sUt : { ended: o, stopped: e.stopped, text: r, wasCancelled: e.wasCancelled });
//@ chunk-8fqgaf3a.js:1676-1823 placement
var hooksNeverRanResult = () =>
  blockedPromptResult("Prompt blocked: the UserPromptSubmit hooks did not run over the submitted text.", {
    kind: "no_verdict",
    noVerdictKind: "hooks_never_ran",
  });
//@ chunk-8fqgaf3a.js:1823-1932 placement
function promptTextForHooks(e) {
  let origin = e.origin;
  return origin?.kind === "plugin" && origin.asUser !== !0
    ? wrapPluginPrompt(e.text, origin.name, { midTurn: !1 })
    : e.text;
}
//@ chunk-8fqgaf3a.js:1932-2023 placement
var Z = (e, o, r) => ({
  proceeds: { text: e, sessionTitle: o, ...(r !== void 0 && r.length > 0 && { context: r }) },
});
//@ chunk-8fqgaf3a.js:2023-2071 placement
var j = (e, o) => ({ ...e, ...(o?.length && { context: o }) });
//@ chunk-8fqgaf3a.js:2071-2200 placement
var submitOutcome = (e, o, r) =>
  !e
    ? { ended: hooksNeverRanResult() }
    : e.blocked
      ? j(E(e, e.blocked, o.text), o.context)
      : { ...Z(promptTextForHooks(o), r, o.context), wasCancelled: e.wasCancelled };
//@ chunk-8fqgaf3a.js:2200-2222 placement
var ee = (e) => e.aborted;
//@ chunk-8fqgaf3a.js:2222-2315 placement
function te(e) {
  return e && (e.attachment.type !== "hook_success" || e.attachment.content) ? e : void 0;
}
//@ chunk-8fqgaf3a.js:2315-2378 placement
var oe = "the turn was interrupted while the prompt was checked";
//@ chunk-8fqgaf3a.js:2378-2406 placement
var re = (e) => e instanceof StreamClosedAbortError;
//@ chunk-8fqgaf3a.js:2406-2440 placement
var Ke = (e, o) => Rs(e) === Rs(o?.made);
//@ chunk-8fqgaf3a.js:2440-2462 placement
var F = (e, o) => e || ee(o);
//@ chunk-8fqgaf3a.js:2462-2585 placement
var NOT_THROUGH_PROMPT_SUBMIT =
  "the prompt did not go through prompt.submit (a command, bash mode, an input that did not query, or a failed pass)";
//@ chunk-8fqgaf3a.js:2585-2622 placement
var R0i = (e, o) => e.plugins !== o.plugins;
//@ chunk-8fqgaf3a.js:2622-2734 placement
function createObjectIds() {
  let weakMap = new WeakMap(),
    o = 0;
  return {
    of: (r) => {
      let n = weakMap.get(r);
      if (n === void 0) ((o += 1), (n = o), weakMap.set(r, n));
      return n;
    },
  };
}
//@ chunk-8fqgaf3a.js:2734-2746 placement
var ie = createObjectIds();
//@ chunk-8fqgaf3a.js:2746-2884 placement
function promptSubmitRenderKey() {
  let e = findPluginRenderHooks("prompt.submit");
  return e.length === 0
    ? ""
    : JSON.stringify([ie.of(uiRenderRegistry.plugins()), e.map((r) => [r.plugin, r.generation])]);
}
//@ chunk-8fqgaf3a.js:2884-2975 placement
var HHr = (e, o) => ({
  ...createSystemMessage(e, "warning", void 0, M),
  promptSubmitEnding: { ending: o, promptKept: !0 },
});
//@ chunk-8fqgaf3a.js:2975-3017 placement
var pe = (e) => (e === void 0 ? HOOK_STOPPED_MESSAGE : `${HOOK_STOPPED_MESSAGE}: ${e}`);
//@ chunk-8fqgaf3a.js:3017-3056 placement
var NHr = (e) => createUserMessage({ content: e, isMeta: !0 });
//@ chunk-8fqgaf3a.js:3056-3120 placement
var me = (e, o, r) => ({ blocked: e, stopped: o, ...(r && { wasCancelled: !0 }) });
//@ chunk-8fqgaf3a.js:3120-3178 placement
var ue = (e, o) => promptOriginForHooks({ promptSource: e ?? "sdk", wakeupSource: o });
//@ chunk-8fqgaf3a.js:3178-3326 placement
function isHookCancelledByAbort(e, o) {
  return (
    e.message?.type === "attachment" &&
    e.message.attachment.type === "hook_cancelled" &&
    e.message.attachment.timedOut !== !0 &&
    o.aborted
  );
}
/**
 * 运行 UserPromptSubmit 钩子：阻止时返回阻止结果，阻止继续时停止查询，收集会话标题与附加上下文。
 */
//@ chunk-8fqgaf3a.js:3326-4646 placement
async function runUserPromptSubmitHooks({
  text: text,
  typed: typed,
  context: context,
  result: n,
  promptSource: promptSource,
  wakeupSource: wakeupSource,
  tiers: tiers,
}) {
  let g,
    aborted = context.abortController.signal.aborted,
    h = snapshotHookRegistration();
  try {
    for await (let i of executeUserPromptSubmitHooks(
      text,
      getToolPermissionContext(context).mode,
      context,
      ue(promptSource, wakeupSource),
      tiers,
    )) {
      if (i.message?.type === "progress") continue;
      if (isHookCancelledByAbort(i, context.abortController.signal)) aborted = !0;
      if (i.blockingError) {
        let a = F(aborted, context.abortController.signal),
          p =
            i.suppressOriginalPrompt === !0 ||
            typed !== text ||
            hasHookRegistrationChanged(h) ||
            hasPromptSubmitHooks({ isRunReached: !1 }),
          promptEnding = i.blockingError.promptEnding;
        return {
          blocked: blockedPromptResult(
            X(getUserPromptSubmitHookBlockingMessage(i.blockingError), text, p),
            promptEnding !== void 0 && "noVerdict" in promptEnding
              ? { kind: "no_verdict", noVerdictKind: promptEnding.noVerdict }
              : { kind: "blocked_by_hook", ...KQn(promptEnding?.reason) },
          ),
          ...(a && { wasCancelled: !0 }),
        };
      }
      if (i.preventContinuation) {
        let a = pe(i.stopReason);
        return (
          (n.messages = [...n.messages, NHr(a), HHr(a, { kind: "stopped_by_hook", ...KQn(i.stopReason) })]),
          (n.shouldQuery = !1),
          (n.resultText = a),
          (n.allowedTools = void 0),
          me(n, a, F(aborted, context.abortController.signal))
        );
      }
      if (i.sessionTitle) g = i.sessionTitle;
      let additionalContexts = i.additionalContexts;
      if (additionalContexts !== void 0 && additionalContexts.length > 0)
        n.messages = [...n.messages, createHookContextAttachment(additionalContexts)];
      let y = te(i.message);
      if (y) n.messages = [...n.messages, y];
    }
  } catch (error) {
    let P = vAn(error, context.abortController.signal),
      b = !re(error);
    if (!P) throw error;
    logForDebugging(
      b
        ? "UserPromptSubmit hooks cancelled (interrupted while a hook ran)"
        : "UserPromptSubmit hooks cancelled (control stream closed)",
    );
  }
  return F(aborted, context.abortController.signal)
    ? { sessionTitle: g, wasCancelled: !0 }
    : { sessionTitle: g };
}
//@ chunk-8fqgaf3a.js:4646-4741 placement
var de = (e) => ({ ...e, messages: [...e.messages], allowedTools: e.allowedTools && [...e.allowedTools] });
//@ chunk-8fqgaf3a.js:4741-4776 placement
var _Io = (e) => userPromptSubmitHooksKey(e) !== "" || promptSubmitRenderKey() !== "";
/**
 * 是否有非官方市场插件挂了 prompt.submit 或 classic.UserPromptSubmit。
 */
//@ chunk-8fqgaf3a.js:4776-4918 placement
var hasThirdPartyPromptHooks = () =>
  getPluginRegistry().loadedModules.some(
    (loadedModule) =>
      !isOfficialMarketplacePlugin(loadedModule.args.pluginStorageId) &&
      isModuleAdmitted(loadedModule) &&
      (loadedModule.hooks("prompt.submit") || loadedModule.hooks("classic.UserPromptSubmit")),
  );
//@ chunk-8fqgaf3a.js:4918-5049 placement
var needsPromptScreening = (e) =>
  e === void 0 ||
  e.hooks !== "" ||
  ["prompt.submit", "classic.UserPromptSubmit"].some((o) =>
    findPluginRenderHooks(o).some((r) => r.tier !== "builtin"),
  );
//@ chunk-8fqgaf3a.js:5049-5142 placement
var b7e = (e) => ({
  permissionMode: getToolPermissionContext(e).mode,
  hooks: userPromptSubmitHooksKey(e),
  plugins: promptSubmitRenderKey(),
  hooksSkippedByTrust: shouldSkipHookDueToTrust(),
});
/**
 * 创建读取当前提示筛查配置的函数（可在出错后锁定为 undefined）。
 */
//@ chunk-8fqgaf3a.js:5142-5325 placement
function createScreensReader(e, { latch: latch }) {
  let r,
    n = !1;
  return () => {
    if (n || (latch && r)) return r;
    try {
      r = b7e(e());
    } catch (error) {
      ((r = void 0),
        (n = latch),
        logForDebugging(`could not read what screens a prompt now: ${error}`, { level: "error" }));
    }
    return r;
  };
}
/**
 * 比较两份提示筛查配置是否变化（钩子、信任跳过、插件、权限模式）。
 */
//@ chunk-8fqgaf3a.js:5325-5479 placement
var screensChanged = (e, o) =>
  e.hooks !== o.hooks ||
  e.hooksSkippedByTrust !== o.hooksSkippedByTrust ||
  e.plugins !== o.plugins ||
  (e.permissionMode !== o.permissionMode && o.hooks !== "");
//@ chunk-8fqgaf3a.js:5479-5599 placement
var passResult = (e, o) => ({
  scratch: e,
  blocked: o.blocked,
  sessionTitle: o.sessionTitle,
  stopped: o.stopped,
  wasCancelled: o.wasCancelled,
});
/**
 * 为提示提交创建钩子执行器：按文本缓存每次执行结果，提供托管层执行、提交结果与查询阻止文本等方法。
 */
//@ chunk-8fqgaf3a.js:5599-6516 placement
function createHookPassRunner({
  typed: typed,
  result: o,
  context: context,
  promptSource: promptSource,
  wakeupSource: wakeupSource,
}) {
  let m,
    u,
    g = new Map(),
    d = new Set();
  async function h(a, p) {
    let f = p.managedHooksExcluded === !0,
      R = de(f ? (u?.scratch ?? o) : o),
      c = passResult(
        R,
        await runUserPromptSubmitHooks({
          text: a,
          typed: typed,
          context: context,
          result: R,
          promptSource: promptSource,
          wakeupSource: wakeupSource,
          tiers: p,
        }),
      );
    return (g.delete(a), g.set(a, c), c);
  }
  function i(a, p) {
    let f = h(a, p);
    return (d.add(f), f.finally(() => d.delete(f)));
  }
  async function P() {
    while (d.size > 0) await Promise.allSettled([...d]);
  }
  function b() {
    let [a, p] = [...g].at(-1) ?? [];
    return p?.blocked !== void 0 && p.stopped === void 0 ? a : void 0;
  }
  async function _(a) {
    let p = await i(a, MANAGED_HOOKS_TIER);
    return ((u = p), (m = p.sessionTitle ?? m), p);
  }
  function y(a) {
    let p = g.get(a);
    if (!p) return;
    return (
      (o.messages = p.scratch.messages),
      (o.allowedTools = p.scratch.allowedTools),
      (o.shouldQuery = p.scratch.shouldQuery),
      (o.resultText = p.scratch.resultText),
      (m = p.sessionTitle ?? m),
      p
    );
  }
  return {
    managed: _,
    pass: i,
    commit: y,
    settled: P,
    blockedText: b,
    managedRun: () => u,
    sessionTitle: () => m,
  };
}
//@ chunk-8fqgaf3a.js:6516-6754 placement
var toPromptSubmitEvent = ({
  submission: submission,
  attachments: attachments,
  origin: origin,
  turnId: turnId,
  shouldWait: shouldWait,
}) => ({
  text: submission.text,
  wait: shouldWait,
  ...(attachments.length > 0 && { attachments: attachments }),
  origin: origin,
  ...(turnId !== void 0 && { turnId: turnId }),
  ...(submission.command !== void 0 && { command: submission.command }),
  ...(submission.isMeta === !0 && { isMeta: submission.isMeta }),
});
/**
 * 包装排队提交的结算句柄：确保只结算一次，未结算即释放时按"未经 prompt.submit"丢弃。
 */
//@ chunk-8fqgaf3a.js:6754-6956 placement
function createQueuedSettler(e) {
  let o = !1;
  return {
    origin: e?.origin,
    settle(r) {
      ((o = !0), e?.settle(r));
    },
    settleWhen(r) {
      ((o = !0),
        r.then(
          (n) => e?.settle(n),
          () => e?.settle({ drop: NOT_THROUGH_PROMPT_SUBMIT }),
        ));
    },
    [Symbol.dispose]() {
      if (!o) ((o = !0), e?.settle({ drop: NOT_THROUGH_PROMPT_SUBMIT }));
    },
  };
}
//@ chunk-8fqgaf3a.js:6956-7035 placement
function ge(e, o) {
  let r = hasModuleHookingSite("prompt.submit");
  return !e || !r ? Promise.resolve() : e(o);
}
/**
 * 警告插件在 next() 之后才加入的 context（未附加）。
 */
//@ chunk-8fqgaf3a.js:7035-7474 placement
function warnLateContext(e, o) {
  let r = new Set(o ?? []);
  for (let n of e.toSorted((s, m) => m.index - s.index)) {
    let returned = n.returned,
      m = isPlainObject(returned) ? returned.context : void 0,
      filtered = (asStringList(m) ?? []).filter((d) => !r.has(d));
    if (filtered.length === 0) continue;
    for (let d of filtered) r.add(d);
    let reduced = filtered.reduce((d, h) => d + h.length, 0);
    logForDebugging(
      `prompt.submit: ${n.plugin} put ${filtered.length} context ${filtered.length === 1 ? "entry" : "entries"} (${reduced} characters) on its result after next(); not attached, the prompt had entered`,
      { level: "warn" },
    );
  }
}
/**
 * 经 prompt.submit 钩子链提交提示：核心处理运行 UserPromptSubmit 钩子，处理改写、丢弃、阻止与中断，返回继续或结束结果。
 */
//@ chunk-8fqgaf3a.js:7474-9830 placement
async function submitPromptWithHooks({
  submission: submission,
  origin: origin,
  bridgeOrigin: bridgeOrigin,
  mode: mode,
  turnId: turnId,
  shouldWait: shouldWait,
  context: context,
  result: g,
  promptSource: promptSource,
  wakeupSource: wakeupSource,
  queued: queued,
  isStartInput: isStartInput,
  enter: enter,
  bound: bound,
}) {
  if (!isStartInput) await MZ.get();
  bound?.();
  let { signal: signal } = context.abortController,
    a = createScreensReader(() => context, { latch: !1 }),
    p = () => needsPromptScreening(a()) || hasThirdPartyPromptHooks(),
    f = p(),
    R = () => f || p();
  if (f && signal.aborted) return (queued?.settle({ drop: oe }), sUt);
  let hookPasses = createHookPassRunner({
      typed: submission.text,
      result: g,
      context: context,
      promptSource: promptSource,
      wakeupSource: wakeupSource,
    }),
    A = createCoreHandoff(RBr),
    { unplaceable: unplaceable } = submission,
    submitChain = createSubmitChainEnds(async (l, x) => {
      if (unplaceable !== void 0 && l !== submission.text) return { drop: unplaceable };
      let k = await (x.managedHooksOnly ? hookPasses.managed(l) : hookPasses.pass(l, x));
      if (N(k) && R()) throw abortErrorFor(signal);
      return K(l, k.blocked);
    }, A.perform),
    L,
    chainOutcome = await Zur(
      awaitArrivalOrAnswer(
        A,
        withHeldMedia(
          promptMediaSources(submission.input, submission.pastedContents),
          context.options.mainLoopModel,
          (l) =>
            ASt({
              signal: signal,
              origin: queued?.origin,
              core: { "prompt.submit": submitChain.core },
              managed: { "prompt.submit": submitChain.managed },
              trace: (x) => {
                if (L) warnLateContext(x, L.context);
              },
            }).prompt.submit(
              toPromptSubmitEvent({
                submission: submission,
                attachments: l,
                origin: resolveMessageOrigin({
                  origin: origin,
                  bridgeOrigin: bridgeOrigin,
                  wakeupSource: wakeupSource,
                  mode: mode,
                  promptSource: promptSource,
                }),
                turnId: turnId,
                shouldWait: shouldWait,
              }),
            ),
        ),
      ),
      signal,
    );
  if (chainOutcome === void 0) {
    await hookPasses.settled();
    let blockedText = hookPasses.blockedText(),
      x = blockedText === void 0 ? void 0 : hookPasses.commit(blockedText),
      I = x?.blocked,
      k = blockedText !== void 0 && x !== void 0 && I !== void 0;
    return (
      logForDebugging(
        "prompt.submit: interrupted while a hook checked the prompt: " +
          (k ? "the block given beneath it stands" : "no verdict"),
      ),
      queued?.settle(k ? K(blockedText, I) : { drop: oe }),
      k ? j(E(x, I, blockedText), submitChain.arrivedContext()) : sUt
    );
  }
  if (chainOutcome.arrived) {
    let arrived = chainOutcome.arrived;
    if (((L = arrived), arrived.text !== submission.text))
      logForDebugging(
        `prompt.submit: text rewritten by a hook (${submission.text.length} -> ${arrived.text.length} chars)`,
      );
    let x = submitOutcome(hookPasses.commit(arrived.text), arrived, hookPasses.sessionTitle()),
      k = x.wasCancelled === !0 && R() && x.proceeds ? sUt : x,
      J = ge(enter, k);
    return (
      queued?.settleWhen(J.then(() => arrived)),
      J.then(
        () => A.done(arrived),
        (Pe) => A.failed(Pe),
      ),
      k
    );
  }
  let answered = chainOutcome.answered,
    last = submitChain.runs.last(),
    G = vNi(answered, last?.made);
  (logForDebugging(`prompt.submit: dropped (${G.drop})`), queued?.settle(G));
  let managedRun = hookPasses.managedRun();
  if (managedRun?.blocked)
    return (hookPasses.commit(submission.text), E(managedRun, managedRun.blocked, submission.text));
  if (unplaceable !== void 0 && last?.made.drop === unplaceable)
    return {
      ended: blockedPromptResult(unplaceable, { kind: "no_verdict", noVerdictKind: "rewrite_unplaceable" }),
    };
  let w = last ? hookPasses.commit(last.input) : void 0,
    Q = w?.blocked,
    he = answered.drop !== void 0 && last !== void 0 && !Ke(answered, last),
    arrivedContext = submitChain.arrivedContext();
  if (last !== void 0 && w !== void 0 && Q !== void 0 && !he) return j(E(w, Q, last.input), arrivedContext);
  if (signal.aborted && (w?.blocked === void 0 || N(w)) && R()) return sUt;
  let z = answered.drop !== void 0;
  return {
    ended: blockedPromptResult(
      z ? `Prompt dropped by a hook: ${Vtt(answered.drop)}` : `Prompt not submitted: ${RBr}`,
      z ? { kind: "dropped_by_hook", ...KQn(answered.drop) } : { kind: "not_passed_on" },
    ),
  };
}

export {
  b7e,
  submitPromptWithHooks,
  hasThirdPartyPromptHooks,
  _Io,
  createScreensReader,
  createHookContextAttachment,
  screensChanged,
  NHr,
  HHr,
  createQueuedSettler,
  R0i,
  runUserPromptSubmitHooks,
  sUt,
};

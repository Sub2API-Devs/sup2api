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
import { wrapPluginPrompt, reasonFromText, singleLineFieldText } from "../messages/nonUserMessages.js";
import { StreamClosedAbortError } from "../errors.js";
import { stableStringifySafe } from "../hooks/hookSerialization.js";
import {
  findPluginRenderHooks,
  uiRenderRegistry,
} from "../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { promptOriginForHooks } from "../promptSource.js";
import {
  snapshotHookRegistration,
  hasHookRegistrationChanged,
  hasPromptSubmitHooks as hasPromptSubmitHooks_2,
} from "../plugins/functionHooks/hookRegistration.js";
import {
  executeUserPromptSubmitHooks,
  getUserPromptSubmitHookBlockingMessage,
  userPromptSubmitHooksKey,
  shouldSkipHookDueToTrust,
  MANAGED_HOOKS_TIER,
} from "../hooks.js";
import { getToolPermissionContext } from "../permissions/toolPermissionContext.js";
import { isStreamClosedOrAbortError, swallowAbortError } from "../abortErrors.js";
import { getPluginRegistry } from "../plugins/pluginLoadState.js";
import { isOfficialMarketplacePlugin } from "../../plugins/functionHooks/panes.js";
import { isModuleAdmitted } from "../plugins/functionHooks/admission.js";
import { hasModuleHookingSite } from "../../plugins/hooksModules/loadedModuleFilters.js";
import { isPlainObject } from "../isPlainObject.js";
import { asStringList } from "../../plugins/functionHooks/sites/siteRules.js";
import { commandSetSignalA } from "../../plugins/functionHooks/commandRunDispatch.js";
import { createCoreHandoff, awaitArrivalOrAnswer } from "../../plugins/functionHooks/sessionReceive.js";
import {
  PROMPT_NOT_PASSED,
  createSubmitChainEnds,
  ensureDrop,
} from "../../plugins/functionHooks/promptSubmit.js";
import { abortErrorFor } from "../../plugins/functionHooks/dispatch/chain.js";
import { withHeldMedia, promptMediaSources } from "../attachmentMedia.js";
import { createEventCallersRef } from "../../plugins/functionHooks/eventCatalog.js";
import { resolveMessageOrigin } from "../messageOrigin.js";

//@ chunk-8fqgaf3a.js:1017-1099 placement
var hookSubmitResult = (text, blocked) =>
  blocked
    ? {
        drop: blocked.resultText ?? "blocked by a UserPromptSubmit hook",
      }
    : {
        text,
      };
//@ chunk-8fqgaf3a.js:1136-1287 placement
/**
 * 创建 UserPromptSubmit 的附加上下文附件消息。
 */
var createHookContextAttachment = (e, hookName = "UserPromptSubmit") =>
  createAttachmentMessage({
    type: "hook_additional_context",
    content: [...e],
    hookName,
    toolUseID: `hook-${randomUUID()}`,
    hookEvent: "UserPromptSubmit",
  });
//@ chunk-8fqgaf3a.js:1287-1296 placement
var IS_META_MESSAGE = true;
//@ chunk-8fqgaf3a.js:1296-1426 placement
var blockedPromptResult = (e, ending) => ({
  messages: [
    {
      ...createSystemMessage(e, "warning", undefined, IS_META_MESSAGE),
      promptSubmitEnding: {
        ending,
        promptKept: false,
      },
    },
  ],
  shouldQuery: false,
  resultText: e,
});
//@ chunk-8fqgaf3a.js:1426-1490 placement
function appendOriginalPrompt(userPromptSubmitHookBlockingMessage, text, r) {
  return r === true
    ? userPromptSubmitHookBlockingMessage
    : `${userPromptSubmitHookBlockingMessage}

Original prompt: ${text}`;
}
//@ chunk-8fqgaf3a.js:1490-1516 placement
/**
 * CANCELLED_RESULT：已取消的提示提交结果。
 */
var CANCELLED_RESULT = {
  wasCancelled: true,
};
//@ chunk-8fqgaf3a.js:1516-1589 placement
var wasCancelledAndStopped = (e) =>
  e.wasCancelled === true && (e.blocked === undefined || e.stopped !== undefined);
//@ chunk-8fqgaf3a.js:1589-1676 placement
var cancelledSubmitOutcome = (e, ended, text) =>
  wasCancelledAndStopped(e)
    ? CANCELLED_RESULT
    : {
        ended,
        stopped: e.stopped,
        text,
        wasCancelled: e.wasCancelled,
      };
//@ chunk-8fqgaf3a.js:1676-1823 placement
var hooksNeverRanResult = () =>
  blockedPromptResult("Prompt blocked: the UserPromptSubmit hooks did not run over the submitted text.", {
    kind: "no_verdict",
    noVerdictKind: "hooks_never_ran",
  });
//@ chunk-8fqgaf3a.js:1823-1932 placement
function promptTextForHooks(e) {
  let origin = e.origin;
  return origin?.kind === "plugin" && origin.asUser !== true
    ? wrapPluginPrompt(e.text, origin.name, {
        midTurn: false,
      })
    : e.text;
}
//@ chunk-8fqgaf3a.js:1932-2023 placement
var proceedsResult = (text, sessionTitle, context) => ({
  proceeds: {
    text,
    sessionTitle,
    ...(context !== undefined &&
      context.length > 0 && {
        context,
      }),
  },
});
//@ chunk-8fqgaf3a.js:2023-2071 placement
var withContext = (e, o) => ({
  ...e,
  ...(o?.length && {
    context: o,
  }),
});
//@ chunk-8fqgaf3a.js:2071-2200 placement
var submitOutcome_2 = (e, arrived, sessionTitle) =>
  !e
    ? {
        ended: hooksNeverRanResult(),
      }
    : e.blocked
      ? withContext(cancelledSubmitOutcome(e, e.blocked, arrived.text), arrived.context)
      : {
          ...proceedsResult(promptTextForHooks(arrived), sessionTitle, arrived.context),
          wasCancelled: e.wasCancelled,
        };
//@ chunk-8fqgaf3a.js:2200-2222 placement
var isAborted = (e) => e.aborted;
//@ chunk-8fqgaf3a.js:2222-2315 placement
function keepUsefulHookAttachment(message) {
  return message && (message.attachment.type !== "hook_success" || message.attachment.content)
    ? message
    : undefined;
}
//@ chunk-8fqgaf3a.js:2315-2378 placement
var INTERRUPTED_DURING_CHECK_MESSAGE = "the turn was interrupted while the prompt was checked";
//@ chunk-8fqgaf3a.js:2378-2406 placement
var isStreamClosedAbort = (error) => error instanceof StreamClosedAbortError;
//@ chunk-8fqgaf3a.js:2406-2440 placement
var isSameMade = (answered, o) => stableStringifySafe(answered) === stableStringifySafe(o?.made);
//@ chunk-8fqgaf3a.js:2440-2462 placement
var isBlockedOrAborted = (aborted, signal) => aborted || isAborted(signal);
//@ chunk-8fqgaf3a.js:2462-2585 placement
var NOT_THROUGH_PROMPT_SUBMIT =
  "the prompt did not go through prompt.submit (a command, bash mode, an input that did not query, or a failed pass)";
//@ chunk-8fqgaf3a.js:2585-2622 placement
/**
 * pluginsChanged：插件列表是否变化。
 */
var pluginsChanged = (under, o) => under.plugins !== o.plugins;
//@ chunk-8fqgaf3a.js:2622-2734 placement
function createObjectIds() {
  let weakMap = new WeakMap();
  let o = 0;
  return {
    of: (r) => {
      let n = weakMap.get(r);
      if (n === undefined) {
        o += 1;
        n = o;
        weakMap.set(r, n);
      }
      return n;
    },
  };
}
//@ chunk-8fqgaf3a.js:2734-2746 placement
var objectIds = createObjectIds();
//@ chunk-8fqgaf3a.js:2746-2884 placement
function promptSubmitRenderKey() {
  let pluginRenderHooks = findPluginRenderHooks("prompt.submit");
  return pluginRenderHooks.length === 0
    ? ""
    : JSON.stringify([
        objectIds.of(uiRenderRegistry.plugins()),
        pluginRenderHooks.map((pluginRenderHook) => [pluginRenderHook.plugin, pluginRenderHook.generation]),
      ]);
}
//@ chunk-8fqgaf3a.js:2884-2975 placement
/**
 * hookStopWarningMessage：钩子停止时保留提示词的警告消息。
 */
var hookStopWarningMessage = (e, ending) => ({
  ...createSystemMessage(e, "warning", undefined, IS_META_MESSAGE),
  promptSubmitEnding: {
    ending,
    promptKept: true,
  },
});
//@ chunk-8fqgaf3a.js:2975-3017 placement
var hookStoppedText = (stopReason) =>
  stopReason === undefined ? HOOK_STOPPED_MESSAGE : `${HOOK_STOPPED_MESSAGE}: ${stopReason}`;
//@ chunk-8fqgaf3a.js:3017-3056 placement
/**
 * makeMetaUserMessage：构造 meta 用户消息。
 */
var makeMetaUserMessage = (content) =>
  createUserMessage({
    content,
    isMeta: true,
  });
//@ chunk-8fqgaf3a.js:3056-3120 placement
var submitOutcome = (blocked, stopped, r) => ({
  blocked,
  stopped,
  ...(r && {
    wasCancelled: true,
  }),
});
//@ chunk-8fqgaf3a.js:3120-3178 placement
var promptOriginFromSource = (promptSource, wakeupSource) =>
  promptOriginForHooks({
    promptSource: promptSource ?? "sdk",
    wakeupSource,
  });
//@ chunk-8fqgaf3a.js:3178-3326 placement
function isHookCancelledByAbort(e, signal) {
  return (
    e.message?.type === "attachment" &&
    e.message.attachment.type === "hook_cancelled" &&
    e.message.attachment.timedOut !== true &&
    signal.aborted
  );
}
//@ chunk-8fqgaf3a.js:3326-4646 placement
/**
 * 运行 UserPromptSubmit 钩子：阻止时返回阻止结果，阻止继续时停止查询，收集会话标题与附加上下文。
 */
async function runUserPromptSubmitHooks({
  text,
  typed,
  context,
  result: blocked,
  promptSource,
  wakeupSource,
  tiers,
}) {
  let sessionTitle;
  let aborted = context.abortController.signal.aborted;
  let h = snapshotHookRegistration();
  try {
    for await (let i of executeUserPromptSubmitHooks(
      text,
      getToolPermissionContext(context).mode,
      context,
      promptOriginFromSource(promptSource, wakeupSource),
      tiers,
    )) {
      if (i.message?.type === "progress") continue;
      if (isHookCancelledByAbort(i, context.abortController.signal)) aborted = true;
      if (i.blockingError) {
        let a = isBlockedOrAborted(aborted, context.abortController.signal);
        let p =
          i.suppressOriginalPrompt === true ||
          typed !== text ||
          hasHookRegistrationChanged(h) ||
          hasPromptSubmitHooks_2({
            isRunReached: false,
          });
        let promptEnding = i.blockingError.promptEnding;
        return {
          blocked: blockedPromptResult(
            appendOriginalPrompt(getUserPromptSubmitHookBlockingMessage(i.blockingError), text, p),
            promptEnding !== undefined && "noVerdict" in promptEnding
              ? {
                  kind: "no_verdict",
                  noVerdictKind: promptEnding.noVerdict,
                }
              : {
                  kind: "blocked_by_hook",
                  ...reasonFromText(promptEnding?.reason),
                },
          ),
          ...(a && {
            wasCancelled: true,
          }),
        };
      }
      if (i.preventContinuation) {
        let a = hookStoppedText(i.stopReason);
        blocked.messages = [
          ...blocked.messages,
          makeMetaUserMessage(a),
          hookStopWarningMessage(a, {
            kind: "stopped_by_hook",
            ...reasonFromText(i.stopReason),
          }),
        ];
        blocked.shouldQuery = false;
        blocked.resultText = a;
        blocked.allowedTools = undefined;
        return submitOutcome(blocked, a, isBlockedOrAborted(aborted, context.abortController.signal));
      }
      if (i.sessionTitle) sessionTitle = i.sessionTitle;
      let additionalContexts = i.additionalContexts;
      if (additionalContexts !== undefined && additionalContexts.length > 0)
        blocked.messages = [...blocked.messages, createHookContextAttachment(additionalContexts)];
      let y = keepUsefulHookAttachment(i.message);
      if (y) blocked.messages = [...blocked.messages, y];
    }
  } catch (error) {
    let P = isStreamClosedOrAbortError(error, context.abortController.signal);
    let b = !isStreamClosedAbort(error);
    if (!P) throw error;
    logForDebugging(
      b
        ? "UserPromptSubmit hooks cancelled (interrupted while a hook ran)"
        : "UserPromptSubmit hooks cancelled (control stream closed)",
    );
  }
  return isBlockedOrAborted(aborted, context.abortController.signal)
    ? {
        sessionTitle,
        wasCancelled: true,
      }
    : {
        sessionTitle,
      };
}
//@ chunk-8fqgaf3a.js:4646-4741 placement
var cloneInputSnapshot = (e) => ({
  ...e,
  messages: [...e.messages],
  allowedTools: e.allowedTools && [...e.allowedTools],
});
//@ chunk-8fqgaf3a.js:4741-4776 placement
/**
 * hasPromptSubmitHooks：存在 UserPromptSubmit 钩子或渲染键。
 */
var hasPromptSubmitHooks = (e) => userPromptSubmitHooksKey(e) !== "" || promptSubmitRenderKey() !== "";
//@ chunk-8fqgaf3a.js:4776-4918 placement
/**
 * 是否有非官方市场插件挂了 prompt.submit 或 classic.UserPromptSubmit。
 */
var hasThirdPartyPromptHooks = () =>
  getPluginRegistry().loadedModules.some(
    (loadedModule) =>
      !isOfficialMarketplacePlugin(loadedModule.args.pluginStorageId) &&
      isModuleAdmitted(loadedModule) &&
      (loadedModule.hooks("prompt.submit") || loadedModule.hooks("classic.UserPromptSubmit")),
  );
//@ chunk-8fqgaf3a.js:4918-5049 placement
var needsPromptScreening = (e) =>
  e === undefined ||
  e.hooks !== "" ||
  ["prompt.submit", "classic.UserPromptSubmit"].some((o) =>
    findPluginRenderHooks(o).some((r) => r.tier !== "builtin"),
  );
//@ chunk-8fqgaf3a.js:5049-5142 placement
/**
 * hooksSnapshotKey：钩子与插件快照键。
 */
var hooksSnapshotKey = (e) => ({
  permissionMode: getToolPermissionContext(e).mode,
  hooks: userPromptSubmitHooksKey(e),
  plugins: promptSubmitRenderKey(),
  hooksSkippedByTrust: shouldSkipHookDueToTrust(),
});
//@ chunk-8fqgaf3a.js:5142-5325 placement
/**
 * 创建读取当前提示筛查配置的函数（可在出错后锁定为 undefined）。
 */
function createScreensReader(e, { latch }) {
  let r;
  let n = false;
  return () => {
    if (n || (latch && r)) return r;
    try {
      r = hooksSnapshotKey(e());
    } catch (error) {
      r = undefined;
      n = latch;
      logForDebugging(`could not read what screens a prompt now: ${error}`, {
        level: "error",
      });
    }
    return r;
  };
}
//@ chunk-8fqgaf3a.js:5325-5479 placement
/**
 * 比较两份提示筛查配置是否变化（钩子、信任跳过、插件、权限模式）。
 */
var screensChanged = (under, o) =>
  under.hooks !== o.hooks ||
  under.hooksSkippedByTrust !== o.hooksSkippedByTrust ||
  under.plugins !== o.plugins ||
  (under.permissionMode !== o.permissionMode && o.hooks !== "");
//@ chunk-8fqgaf3a.js:5479-5599 placement
var passResult = (scratch, o) => ({
  scratch,
  blocked: o.blocked,
  sessionTitle: o.sessionTitle,
  stopped: o.stopped,
  wasCancelled: o.wasCancelled,
});
//@ chunk-8fqgaf3a.js:5599-6516 placement
/**
 * 为提示提交创建钩子执行器：按文本缓存每次执行结果，提供托管层执行、提交结果与查询阻止文本等方法。
 */
function createHookPassRunner({ typed, result: o, context, promptSource, wakeupSource }) {
  let m;
  let u;
  let g = new Map();
  let d = new Set();
  async function h(a, p) {
    let f = p.managedHooksExcluded === true;
    let scratch = cloneInputSnapshot(f ? (u?.scratch ?? o) : o);
    let c = passResult(
      scratch,
      await runUserPromptSubmitHooks({
        text: a,
        typed,
        context,
        result: scratch,
        promptSource,
        wakeupSource,
        tiers: p,
      }),
    );
    g.delete(a);
    g.set(a, c);
    return c;
  }
  function i(a, p) {
    let f = h(a, p);
    d.add(f);
    return f.finally(() => d.delete(f));
  }
  async function P() {
    while (d.size > 0) await Promise.allSettled([...d]);
  }
  function b() {
    let [a, p] = [...g].at(-1) ?? [];
    return p?.blocked !== undefined && p.stopped === undefined ? a : undefined;
  }
  async function _(a) {
    let p = await i(a, MANAGED_HOOKS_TIER);
    u = p;
    m = p.sessionTitle ?? m;
    return p;
  }
  function y(a) {
    let p = g.get(a);
    if (!p) return;
    o.messages = p.scratch.messages;
    o.allowedTools = p.scratch.allowedTools;
    o.shouldQuery = p.scratch.shouldQuery;
    o.resultText = p.scratch.resultText;
    m = p.sessionTitle ?? m;
    return p;
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
var toPromptSubmitEvent = ({ submission, attachments, origin, turnId, shouldWait }) => ({
  text: submission.text,
  wait: shouldWait,
  ...(attachments.length > 0 && {
    attachments,
  }),
  origin,
  ...(turnId !== undefined && {
    turnId,
  }),
  ...(submission.command !== undefined && {
    command: submission.command,
  }),
  ...(submission.isMeta === true && {
    isMeta: submission.isMeta,
  }),
});
//@ chunk-8fqgaf3a.js:6754-6956 placement
/**
 * 包装排队提交的结算句柄：确保只结算一次，未结算即释放时按"未经 prompt.submit"丢弃。
 */
function createQueuedSettler(e) {
  let o = false;
  return {
    origin: e?.origin,
    settle(r) {
      o = true;
      e?.settle(r);
    },
    settleWhen(r) {
      o = true;
      r.then(
        (n) => e?.settle(n),
        () =>
          e?.settle({
            drop: NOT_THROUGH_PROMPT_SUBMIT,
          }),
      );
    },
    [Symbol.dispose]() {
      if (!o) {
        o = true;
        e?.settle({
          drop: NOT_THROUGH_PROMPT_SUBMIT,
        });
      }
    },
  };
}
//@ chunk-8fqgaf3a.js:6956-7035 placement
function maybeRunModuleHook(enter, o) {
  let r = hasModuleHookingSite("prompt.submit");
  return !enter || !r ? Promise.resolve() : enter(o);
}
//@ chunk-8fqgaf3a.js:7035-7474 placement
/**
 * 警告插件在 next() 之后才加入的 context（未附加）。
 */
function warnLateContext(e, context) {
  let r = new Set(context ?? []);
  for (let n of e.toSorted((s, m) => m.index - s.index)) {
    let returned = n.returned;
    let context = isPlainObject(returned) ? returned.context : undefined;
    let filtered = (asStringList(context) ?? []).filter((d) => !r.has(d));
    if (filtered.length === 0) continue;
    for (let d of filtered) r.add(d);
    let reduced = filtered.reduce((acc, h) => acc + h.length, 0);
    logForDebugging(
      `prompt.submit: ${n.plugin} put ${filtered.length} context ${filtered.length === 1 ? "entry" : "entries"} (${reduced} characters) on its result after next(); not attached, the prompt had entered`,
      {
        level: "warn",
      },
    );
  }
}
//@ chunk-8fqgaf3a.js:7474-9830 placement
/**
 * 经 prompt.submit 钩子链提交提示：核心处理运行 UserPromptSubmit 钩子，处理改写、丢弃、阻止与中断，返回继续或结束结果。
 */
async function submitPromptWithHooks({
  submission,
  origin,
  bridgeOrigin,
  mode,
  turnId,
  shouldWait,
  context,
  result: g,
  promptSource,
  wakeupSource,
  queued,
  isStartInput,
  enter,
  bound,
}) {
  if (!isStartInput) await commandSetSignalA.get();
  bound?.();
  let { signal } = context.abortController;
  let screensReader = createScreensReader(() => context, {
    latch: false,
  });
  let p = () => needsPromptScreening(screensReader()) || hasThirdPartyPromptHooks();
  let f = p();
  let R = () => f || p();
  if (f && signal.aborted) {
    queued?.settle({
      drop: INTERRUPTED_DURING_CHECK_MESSAGE,
    });
    return CANCELLED_RESULT;
  }
  let hookPasses = createHookPassRunner({
    typed: submission.text,
    result: g,
    context,
    promptSource,
    wakeupSource,
  });
  let coreHandoff = createCoreHandoff(PROMPT_NOT_PASSED);
  let { unplaceable } = submission;
  let submitChain = createSubmitChainEnds(async (text, x) => {
    if (unplaceable !== undefined && text !== submission.text)
      return {
        drop: unplaceable,
      };
    let k = await (x.managedHooksOnly ? hookPasses.managed(text) : hookPasses.pass(text, x));
    if (wasCancelledAndStopped(k) && R()) throw abortErrorFor(signal);
    return hookSubmitResult(text, k.blocked);
  }, coreHandoff.perform);
  let L;
  let chainOutcome = await swallowAbortError(
    awaitArrivalOrAnswer(
      coreHandoff,
      withHeldMedia(
        promptMediaSources(submission.input, submission.pastedContents),
        context.options.mainLoopModel,
        (attachments) =>
          createEventCallersRef({
            signal,
            origin: queued?.origin,
            core: {
              "prompt.submit": submitChain.core,
            },
            managed: {
              "prompt.submit": submitChain.managed,
            },
            trace: (x) => {
              if (L) warnLateContext(x, L.context);
            },
          }).prompt.submit(
            toPromptSubmitEvent({
              submission,
              attachments,
              origin: resolveMessageOrigin({
                origin,
                bridgeOrigin,
                wakeupSource,
                mode,
                promptSource,
              }),
              turnId,
              shouldWait,
            }),
          ),
      ),
    ),
    signal,
  );
  if (chainOutcome === undefined) {
    await hookPasses.settled();
    let text = hookPasses.blockedText();
    let x = text === undefined ? undefined : hookPasses.commit(text);
    let blocked = x?.blocked;
    let k = text !== undefined && x !== undefined && blocked !== undefined;
    logForDebugging(
      "prompt.submit: interrupted while a hook checked the prompt: " +
        (k ? "the block given beneath it stands" : "no verdict"),
    );
    queued?.settle(
      k
        ? hookSubmitResult(text, blocked)
        : {
            drop: INTERRUPTED_DURING_CHECK_MESSAGE,
          },
    );
    return k
      ? withContext(cancelledSubmitOutcome(x, blocked, text), submitChain.arrivedContext())
      : CANCELLED_RESULT;
  }
  if (chainOutcome.arrived) {
    let arrived = chainOutcome.arrived;
    L = arrived;
    if (arrived.text !== submission.text)
      logForDebugging(
        `prompt.submit: text rewritten by a hook (${submission.text.length} -> ${arrived.text.length} chars)`,
      );
    let x = submitOutcome_2(hookPasses.commit(arrived.text), arrived, hookPasses.sessionTitle());
    let k = x.wasCancelled === true && R() && x.proceeds ? CANCELLED_RESULT : x;
    let J = maybeRunModuleHook(enter, k);
    queued?.settleWhen(J.then(() => arrived));
    J.then(
      () => coreHandoff.done(arrived),
      (error) => coreHandoff.failed(error),
    );
    return k;
  }
  let answered = chainOutcome.answered;
  let S = submitChain.runs.last();
  let drop = ensureDrop(answered, S?.made);
  logForDebugging(`prompt.submit: dropped (${drop.drop})`);
  queued?.settle(drop);
  let V = hookPasses.managedRun();
  if (V?.blocked) {
    hookPasses.commit(submission.text);
    return cancelledSubmitOutcome(V, V.blocked, submission.text);
  }
  if (unplaceable !== undefined && S?.made.drop === unplaceable)
    return {
      ended: blockedPromptResult(unplaceable, {
        kind: "no_verdict",
        noVerdictKind: "rewrite_unplaceable",
      }),
    };
  let w = S ? hookPasses.commit(S.input) : undefined;
  let blocked = w?.blocked;
  let he = answered.drop !== undefined && S !== undefined && !isSameMade(answered, S);
  let Se = submitChain.arrivedContext();
  if (S !== undefined && w !== undefined && blocked !== undefined && !he)
    return withContext(cancelledSubmitOutcome(w, blocked, S.input), Se);
  if (signal.aborted && (w?.blocked === undefined || wasCancelledAndStopped(w)) && R())
    return CANCELLED_RESULT;
  let z = answered.drop !== undefined;
  return {
    ended: blockedPromptResult(
      z
        ? `Prompt dropped by a hook: ${singleLineFieldText(answered.drop)}`
        : `Prompt not submitted: ${PROMPT_NOT_PASSED}`,
      z
        ? {
            kind: "dropped_by_hook",
            ...reasonFromText(answered.drop),
          }
        : {
            kind: "not_passed_on",
          },
    ),
  };
}
export {
  hooksSnapshotKey,
  submitPromptWithHooks,
  hasThirdPartyPromptHooks,
  hasPromptSubmitHooks,
  createScreensReader,
  createHookContextAttachment,
  screensChanged,
  makeMetaUserMessage,
  hookStopWarningMessage,
  createQueuedSettler,
  pluginsChanged,
  runUserPromptSubmitHooks,
  CANCELLED_RESULT,
};

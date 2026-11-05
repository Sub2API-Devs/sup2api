/**
 * utils/processUserInput/userPromptSubmitHooks.ts
 *
 * 2.1.316 新增：UserPromptSubmit 钩子执行与结果合并。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-y8xj45e1.js (45)
 * attribution: placement 45
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import { createAttachmentMessage_2 as createAttachmentMessage, logForDebugging } from "../debug.js";
import { createSystemMessage, createUserMessage } from "../messages.js";
import { wrapPluginPrompt, reasonFromText, singleLineFieldText } from "../messages/nonUserMessages.js";
import { StreamClosedAbortError } from "../errors.js";
import { stableStringifySafe } from "../hooks/hookSerialization.js";
import {
  findPluginRenderHooks,
  uiRenderRegistry,
} from "../../components/permissions/AskUserQuestionPermissionRequest/uiRenderHook.js";
import { HOOK_STOPPED_MESSAGE } from "../../services/compact/compact.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-y8xj45e1.js:1018-1100 placement
var hookSubmitResult = (text, blocked) =>
  blocked
    ? {
        drop: blocked.resultText ?? "blocked by a UserPromptSubmit hook",
      }
    : {
        text,
      };
//@ chunk-y8xj45e1.js:1137-1288 placement
/**
 * 创建 UserPromptSubmit 的附加上下文附件消息。
 */
var createHookContextAttachment = (contexts, hookName = "UserPromptSubmit") =>
  createAttachmentMessage({
    type: "hook_additional_context",
    content: [...contexts],
    hookName,
    toolUseID: `hook-${randomUUID()}`,
    hookEvent: "UserPromptSubmit",
  });
//@ chunk-y8xj45e1.js:1288-1297 placement
var IS_META_MESSAGE = true;
//@ chunk-y8xj45e1.js:1297-1427 placement
var blockedPromptResult = (message, ending) => ({
  messages: [
    {
      ...createSystemMessage(message, "warning", undefined, IS_META_MESSAGE),
      promptSubmitEnding: {
        ending,
        promptKept: false,
      },
    },
  ],
  shouldQuery: false,
  resultText: message,
});
//@ chunk-y8xj45e1.js:1427-1491 placement
function appendOriginalPrompt(userPromptSubmitHookBlockingMessage, text, suppressOriginal) {
  return suppressOriginal === true
    ? userPromptSubmitHookBlockingMessage
    : `${userPromptSubmitHookBlockingMessage}

Original prompt: ${text}`;
}
//@ chunk-y8xj45e1.js:1491-1517 placement
/**
 * CANCELLED_RESULT：已取消的提示提交结果。
 */
var CANCELLED_RESULT = {
  wasCancelled: true,
};
//@ chunk-y8xj45e1.js:1517-1590 placement
var wasCancelledAndStopped = (result) =>
  result.wasCancelled === true && (result.blocked === undefined || result.stopped !== undefined);
//@ chunk-y8xj45e1.js:1590-1677 placement
var cancelledSubmitOutcome = (result, ended, text) =>
  wasCancelledAndStopped(result)
    ? CANCELLED_RESULT
    : {
        ended,
        stopped: result.stopped,
        text,
        wasCancelled: result.wasCancelled,
      };
//@ chunk-y8xj45e1.js:1677-1824 placement
var hooksNeverRanResult = () =>
  blockedPromptResult("Prompt blocked: the UserPromptSubmit hooks did not run over the submitted text.", {
    kind: "no_verdict",
    noVerdictKind: "hooks_never_ran",
  });
//@ chunk-y8xj45e1.js:1824-1933 placement
function promptTextForHooks(submission) {
  let origin = submission.origin;
  return origin?.kind === "plugin" && origin.asUser !== true
    ? wrapPluginPrompt(submission.text, origin.name, {
        midTurn: false,
      })
    : submission.text;
}
//@ chunk-y8xj45e1.js:1933-2024 placement
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
//@ chunk-y8xj45e1.js:2024-2072 placement
var withContext = (outcome, context) => ({
  ...outcome,
  ...(context?.length && {
    context,
  }),
});
//@ chunk-y8xj45e1.js:2072-2201 placement
var submitOutcome_2 = (result, submission, sessionTitle) =>
  !result
    ? {
        ended: hooksNeverRanResult(),
      }
    : result.blocked
      ? withContext(cancelledSubmitOutcome(result, result.blocked, submission.text), submission.context)
      : {
          ...proceedsResult(promptTextForHooks(submission), sessionTitle, submission.context),
          wasCancelled: result.wasCancelled,
        };
//@ chunk-y8xj45e1.js:2201-2223 placement
var isAborted = (state) => state.aborted;
//@ chunk-y8xj45e1.js:2223-2316 placement
function keepUsefulHookAttachment(message) {
  return message && (message.attachment.type !== "hook_success" || message.attachment.content)
    ? message
    : undefined;
}
//@ chunk-y8xj45e1.js:2316-2379 placement
var INTERRUPTED_DURING_CHECK_MESSAGE = "the turn was interrupted while the prompt was checked";
//@ chunk-y8xj45e1.js:2379-2407 placement
var isStreamClosedAbort = (error) => error instanceof StreamClosedAbortError;
//@ chunk-y8xj45e1.js:2407-2441 placement
var isSameMade = (answered, recording) =>
  stableStringifySafe(answered) === stableStringifySafe(recording?.made);
//@ chunk-y8xj45e1.js:2441-2463 placement
var isBlockedOrAborted = (aborted, signal) => aborted || isAborted(signal);
//@ chunk-y8xj45e1.js:2463-2586 placement
var NOT_THROUGH_PROMPT_SUBMIT =
  "the prompt did not go through prompt.submit (a command, bash mode, an input that did not query, or a failed pass)";
//@ chunk-y8xj45e1.js:2586-2623 placement
/**
 * pluginsChanged：插件列表是否变化。
 */
var pluginsChanged = (under, snapshot) => under.plugins !== snapshot.plugins;
//@ chunk-y8xj45e1.js:2623-2735 placement
function createObjectIds() {
  let weakMap = new WeakMap();
  let nextId = 0;
  return {
    of: (object) => {
      let id = weakMap.get(object);
      if (id === undefined) {
        nextId += 1;
        id = nextId;
        weakMap.set(object, id);
      }
      return id;
    },
  };
}
//@ chunk-y8xj45e1.js:2735-2747 placement
var objectIds; // deferred: uses createObjectIds of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-y8xj45e1.js:2735", () => {
  objectIds = createObjectIds();
});
//@ chunk-y8xj45e1.js:2747-2885 placement
function promptSubmitRenderKey() {
  let pluginRenderHooks = findPluginRenderHooks("prompt.submit");
  return pluginRenderHooks.length === 0
    ? ""
    : JSON.stringify([
        objectIds.of(uiRenderRegistry.plugins()),
        pluginRenderHooks.map((pluginRenderHook) => [pluginRenderHook.plugin, pluginRenderHook.generation]),
      ]);
}
//@ chunk-y8xj45e1.js:2885-2976 placement
/**
 * hookStopWarningMessage：钩子停止时保留提示词的警告消息。
 */
var hookStopWarningMessage = (text, ending) => ({
  ...createSystemMessage(text, "warning", undefined, IS_META_MESSAGE),
  promptSubmitEnding: {
    ending,
    promptKept: true,
  },
});
//@ chunk-y8xj45e1.js:2976-3018 placement
var hookStoppedText = (stopReason) =>
  stopReason === undefined ? HOOK_STOPPED_MESSAGE : `${HOOK_STOPPED_MESSAGE}: ${stopReason}`;
//@ chunk-y8xj45e1.js:3018-3057 placement
/**
 * makeMetaUserMessage：构造 meta 用户消息。
 */
var makeMetaUserMessage = (content) =>
  createUserMessage({
    content,
    isMeta: true,
  });
//@ chunk-y8xj45e1.js:3057-3121 placement
var submitOutcome = (blocked, stopped, cancelled) => ({
  blocked,
  stopped,
  ...(cancelled && {
    wasCancelled: true,
  }),
});
//@ chunk-y8xj45e1.js:3121-3179 placement
var promptOriginFromSource = (promptSource, wakeupSource) =>
  promptOriginForHooks({
    promptSource: promptSource ?? "sdk",
    wakeupSource,
  });
//@ chunk-y8xj45e1.js:3179-3327 placement
function isHookCancelledByAbort(result, signal) {
  return (
    result.message?.type === "attachment" &&
    result.message.attachment.type === "hook_cancelled" &&
    result.message.attachment.timedOut !== true &&
    signal.aborted
  );
}
//@ chunk-y8xj45e1.js:3327-4647 placement
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
  let snapshot = snapshotHookRegistration();
  try {
    for await (let event of executeUserPromptSubmitHooks(
      text,
      getToolPermissionContext(context).mode,
      context,
      promptOriginFromSource(promptSource, wakeupSource),
      tiers,
    )) {
      if (event.message?.type === "progress") continue;
      if (isHookCancelledByAbort(event, context.abortController.signal)) aborted = true;
      if (event.blockingError) {
        let cancelledNow = isBlockedOrAborted(aborted, context.abortController.signal);
        let suppressOriginal =
          event.suppressOriginalPrompt === true ||
          typed !== text ||
          hasHookRegistrationChanged(snapshot) ||
          hasPromptSubmitHooks_2({
            isRunReached: false,
          });
        let promptEnding = event.blockingError.promptEnding;
        return {
          blocked: blockedPromptResult(
            appendOriginalPrompt(
              getUserPromptSubmitHookBlockingMessage(event.blockingError),
              text,
              suppressOriginal,
            ),
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
          ...(cancelledNow && {
            wasCancelled: true,
          }),
        };
      }
      if (event.preventContinuation) {
        let stopText = hookStoppedText(event.stopReason);
        blocked.messages = [
          ...blocked.messages,
          makeMetaUserMessage(stopText),
          hookStopWarningMessage(stopText, {
            kind: "stopped_by_hook",
            ...reasonFromText(event.stopReason),
          }),
        ];
        blocked.shouldQuery = false;
        blocked.resultText = stopText;
        blocked.allowedTools = undefined;
        return submitOutcome(blocked, stopText, isBlockedOrAborted(aborted, context.abortController.signal));
      }
      if (event.sessionTitle) sessionTitle = event.sessionTitle;
      let additionalContexts = event.additionalContexts;
      if (additionalContexts !== undefined && additionalContexts.length > 0)
        blocked.messages = [...blocked.messages, createHookContextAttachment(additionalContexts)];
      let attachment = keepUsefulHookAttachment(event.message);
      if (attachment) blocked.messages = [...blocked.messages, attachment];
    }
  } catch (error) {
    let cancelled = isStreamClosedOrAbortError(error, context.abortController.signal);
    let interrupted = !isStreamClosedAbort(error);
    if (!cancelled) throw error;
    logForDebugging(
      interrupted
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
//@ chunk-y8xj45e1.js:4647-4742 placement
var cloneInputSnapshot = (input) => ({
  ...input,
  messages: [...input.messages],
  allowedTools: input.allowedTools && [...input.allowedTools],
});
//@ chunk-y8xj45e1.js:4742-4777 placement
/**
 * hasPromptSubmitHooks：存在 UserPromptSubmit 钩子或渲染键。
 */
var hasPromptSubmitHooks = (context) =>
  userPromptSubmitHooksKey(context) !== "" || promptSubmitRenderKey() !== "";
//@ chunk-y8xj45e1.js:4777-4919 placement
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
//@ chunk-y8xj45e1.js:4919-5050 placement
var needsPromptScreening = (snapshot) =>
  snapshot === undefined ||
  snapshot.hooks !== "" ||
  ["prompt.submit", "classic.UserPromptSubmit"].some((eventName) =>
    findPluginRenderHooks(eventName).some((hook) => hook.tier !== "builtin"),
  );
//@ chunk-y8xj45e1.js:5050-5143 placement
/**
 * hooksSnapshotKey：钩子与插件快照键。
 */
var hooksSnapshotKey = (context) => ({
  permissionMode: getToolPermissionContext(context).mode,
  hooks: userPromptSubmitHooksKey(context),
  plugins: promptSubmitRenderKey(),
  hooksSkippedByTrust: shouldSkipHookDueToTrust(),
});
//@ chunk-y8xj45e1.js:5143-5326 placement
/**
 * 创建读取当前提示筛查配置的函数（可在出错后锁定为 undefined）。
 */
function createScreensReader(context, { latch }) {
  let key;
  let latched = false;
  return () => {
    if (latched || (latch && key)) return key;
    try {
      key = hooksSnapshotKey(context());
    } catch (error) {
      key = undefined;
      latched = latch;
      logForDebugging(`could not read what screens a prompt now: ${error}`, {
        level: "error",
      });
    }
    return key;
  };
}
//@ chunk-y8xj45e1.js:5326-5480 placement
/**
 * 比较两份提示筛查配置是否变化（钩子、信任跳过、插件、权限模式）。
 */
var screensChanged = (under, current) =>
  under.hooks !== current.hooks ||
  under.hooksSkippedByTrust !== current.hooksSkippedByTrust ||
  under.plugins !== current.plugins ||
  (under.permissionMode !== current.permissionMode && current.hooks !== "");
//@ chunk-y8xj45e1.js:5480-5600 placement
var passResult = (scratch, result) => ({
  scratch,
  blocked: result.blocked,
  sessionTitle: result.sessionTitle,
  stopped: result.stopped,
  wasCancelled: result.wasCancelled,
});
//@ chunk-y8xj45e1.js:5600-6517 placement
/**
 * 为提示提交创建钩子执行器：按文本缓存每次执行结果，提供托管层执行、提交结果与查询阻止文本等方法。
 */
function createHookPassRunner({ typed, result, context, promptSource, wakeupSource }) {
  let sessionTitle;
  let managedResult;
  let passesByText = new Map();
  let inFlight = new Set();
  async function text(tiers, passTiers) {
    let manageOnly = passTiers.managedHooksExcluded === true;
    let scratch = cloneInputSnapshot(manageOnly ? (managedResult?.scratch ?? result) : result);
    let passOutcome = passResult(
      scratch,
      await runUserPromptSubmitHooks({
        text: tiers,
        typed,
        context,
        result: scratch,
        promptSource,
        wakeupSource,
        tiers: passTiers,
      }),
    );
    passesByText.delete(tiers);
    passesByText.set(tiers, passOutcome);
    return passOutcome;
  }
  function hookText(tiers, promise) {
    let passPromise = text(tiers, promise);
    inFlight.add(passPromise);
    return passPromise.finally(() => inFlight.delete(passPromise));
  }
  async function runManaged() {
    while (inFlight.size > 0) await Promise.allSettled([...inFlight]);
  }
  function blockedText() {
    let [text, outcome] = [...passesByText].at(-1) ?? [];
    return outcome?.blocked !== undefined && outcome.stopped === undefined ? text : undefined;
  }
  async function runPass(text) {
    let outcome = await hookText(text, MANAGED_HOOKS_TIER);
    managedResult = outcome;
    sessionTitle = outcome.sessionTitle ?? sessionTitle;
    return outcome;
  }
  function commitPass(text) {
    let outcome = passesByText.get(text);
    if (!outcome) return;
    result.messages = outcome.scratch.messages;
    result.allowedTools = outcome.scratch.allowedTools;
    result.shouldQuery = outcome.scratch.shouldQuery;
    result.resultText = outcome.scratch.resultText;
    sessionTitle = outcome.sessionTitle ?? sessionTitle;
    return outcome;
  }
  return {
    managed: runPass,
    pass: hookText,
    commit: commitPass,
    settled: runManaged,
    blockedText,
    managedRun: () => managedResult,
    sessionTitle: () => sessionTitle,
  };
}
//@ chunk-y8xj45e1.js:6517-6755 placement
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
//@ chunk-y8xj45e1.js:6755-6957 placement
/**
 * 包装排队提交的结算句柄：确保只结算一次，未结算即释放时按"未经 prompt.submit"丢弃。
 */
function createQueuedSettler(waiter) {
  let settled = false;
  return {
    origin: waiter?.origin,
    settle(result) {
      settled = true;
      waiter?.settle(result);
    },
    settleWhen(promise) {
      settled = true;
      promise.then(
        (result) => waiter?.settle(result),
        () =>
          waiter?.settle({
            drop: NOT_THROUGH_PROMPT_SUBMIT,
          }),
      );
    },
    [Symbol.dispose]() {
      if (!settled) {
        settled = true;
        waiter?.settle({
          drop: NOT_THROUGH_PROMPT_SUBMIT,
        });
      }
    },
  };
}
//@ chunk-y8xj45e1.js:6957-7036 placement
function maybeRunModuleHook(enter, run) {
  let hasHookSite = hasModuleHookingSite("prompt.submit");
  return !enter || !hasHookSite ? Promise.resolve() : enter(run);
}
//@ chunk-y8xj45e1.js:7036-7475 placement
/**
 * 警告插件在 next() 之后才加入的 context（未附加）。
 */
function warnLateContext(results, context) {
  let knownContext = new Set(context ?? []);
  for (let result of results.toSorted((left, right) => right.index - left.index)) {
    let returned = result.returned;
    let context = isPlainObject(returned) ? returned.context : undefined;
    let filtered = (asStringList(context) ?? []).filter((entry) => !knownContext.has(entry));
    if (filtered.length === 0) continue;
    for (let entry of filtered) knownContext.add(entry);
    let reduced = filtered.reduce((acc, entry) => acc + entry.length, 0);
    logForDebugging(
      `prompt.submit: ${result.plugin} put ${filtered.length} context ${filtered.length === 1 ? "entry" : "entries"} (${reduced} characters) on its result after next(); not attached, the prompt had entered`,
      {
        level: "warn",
      },
    );
  }
}
//@ chunk-y8xj45e1.js:7475-9832 placement
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
  result,
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
  let needsScreening = () => needsPromptScreening(screensReader()) || hasThirdPartyPromptHooks();
  let screenedAtStart = needsScreening();
  let screensNow = () => screenedAtStart || needsScreening();
  if (screenedAtStart && signal.aborted) {
    queued?.settle({
      drop: INTERRUPTED_DURING_CHECK_MESSAGE,
    });
    return CANCELLED_RESULT;
  }
  let hookPasses = createHookPassRunner({
    typed: submission.text,
    result,
    context,
    promptSource,
    wakeupSource,
  });
  let coreHandoff = createCoreHandoff(PROMPT_NOT_PASSED);
  let { unplaceable } = submission;
  let submitChain = createSubmitChainEnds(async (text, tiers) => {
    if (unplaceable !== undefined && text !== submission.text)
      return {
        drop: unplaceable,
      };
    let outcome = await (tiers.managedHooksOnly ? hookPasses.managed(text) : hookPasses.pass(text, tiers));
    if (wasCancelledAndStopped(outcome) && screensNow()) throw abortErrorFor(signal);
    return hookSubmitResult(text, outcome.blocked);
  }, coreHandoff.perform);
  let arrived;
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
            trace: (results) => {
              if (arrived) warnLateContext(results, arrived.context);
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
    let committed = text === undefined ? undefined : hookPasses.commit(text);
    let blocked = committed?.blocked;
    let blockedStands = text !== undefined && committed !== undefined && blocked !== undefined;
    logForDebugging(
      "prompt.submit: interrupted while a hook checked the prompt: " +
        (blockedStands ? "the block given beneath it stands" : "no verdict"),
    );
    queued?.settle(
      blockedStands
        ? hookSubmitResult(text, blocked)
        : {
            drop: INTERRUPTED_DURING_CHECK_MESSAGE,
          },
    );
    return blockedStands
      ? withContext(cancelledSubmitOutcome(committed, blocked, text), submitChain.arrivedContext())
      : CANCELLED_RESULT;
  }
  if (chainOutcome.arrived) {
    let arrived_2 = chainOutcome.arrived;
    arrived = arrived_2;
    if (arrived_2.text !== submission.text)
      logForDebugging(
        `prompt.submit: text rewritten by a hook (${submission.text.length} -> ${arrived_2.text.length} chars)`,
      );
    let outcome = submitOutcome_2(hookPasses.commit(arrived_2.text), arrived_2, hookPasses.sessionTitle());
    let finalOutcome =
      outcome.wasCancelled === true && screensNow() && outcome.proceeds ? CANCELLED_RESULT : outcome;
    let enterPromise = maybeRunModuleHook(enter, finalOutcome);
    queued?.settleWhen(enterPromise.then(() => arrived_2));
    enterPromise.then(
      () => coreHandoff.done(arrived_2),
      (error) => coreHandoff.failed(error),
    );
    return finalOutcome;
  }
  let answered = chainOutcome.answered;
  let lastRun = submitChain.runs.last();
  let drop = ensureDrop(answered, lastRun?.made);
  logForDebugging(`prompt.submit: dropped (${drop.drop})`);
  queued?.settle(drop);
  let managedOutcome = hookPasses.managedRun();
  if (managedOutcome?.blocked) {
    hookPasses.commit(submission.text);
    return cancelledSubmitOutcome(managedOutcome, managedOutcome.blocked, submission.text);
  }
  if (unplaceable !== undefined && lastRun?.made.drop === unplaceable)
    return {
      ended: blockedPromptResult(unplaceable, {
        kind: "no_verdict",
        noVerdictKind: "rewrite_unplaceable",
      }),
    };
  let committed = lastRun ? hookPasses.commit(lastRun.input) : undefined;
  let blocked = committed?.blocked;
  let madeChanged = answered.drop !== undefined && lastRun !== undefined && !isSameMade(answered, lastRun);
  let arrivedContext = submitChain.arrivedContext();
  if (lastRun !== undefined && committed !== undefined && blocked !== undefined && !madeChanged)
    return withContext(cancelledSubmitOutcome(committed, blocked, lastRun.input), arrivedContext);
  if (
    signal.aborted &&
    (committed?.blocked === undefined || wasCancelledAndStopped(committed)) &&
    screensNow()
  )
    return CANCELLED_RESULT;
  let dropped = answered.drop !== undefined;
  return {
    ended: blockedPromptResult(
      dropped
        ? `Prompt dropped by a hook: ${singleLineFieldText(answered.drop)}`
        : `Prompt not submitted: ${PROMPT_NOT_PASSED}`,
      dropped
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
  makeMetaUserMessage,
  hookStopWarningMessage,
  createHookContextAttachment,
  createQueuedSettler,
  screensChanged,
  pluginsChanged,
  runUserPromptSubmitHooks,
  CANCELLED_RESULT,
  createScreensReader,
};

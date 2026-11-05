/**
 * plugins/functionHooks/modelApi.ts
 *
 * 2.1.316 新增：插件 $.model.complete/classify/fork 接口
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (15), chunk-j8f885h1.js (1)
 * attribution: placement 16
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  isTextBlockArrayWithCacheFlag,
  ZERO_TOKEN_USAGE,
  getTokenCountFromUsage_3 as getTokenCountFromUsage_3_2,
} from "./api/operations.js";
import { isWellFormedString } from "../../utils/stringUtils.js";
import { isAbortError, errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { modelApiError, MAX_ERROR_TEXT } from "./mcpApi.js";
import { HooksError } from "./hooksErrors.js";
import { MAX_TIMER_DELAY_MS } from "../../utils/timerDelayClamp.js";
import {
  isEffortLevel,
  getEffortEnvOverride,
  isEffortHigherThan,
  normalizeEffortLevel,
} from "../../utils/effort.js";
import { parseUserSpecifiedModel } from "../../utils/model/modelDisplay.js";
import { isModelAllowed } from "../../utils/model/modelAllowlist.js";
import { getModelMaxOutputTokens } from "../../utils/context.js";
import { MAX_OUTPUT_TOKENS_CAP as MAX_OUTPUT_TOKENS_CAP_2 } from "../../utils/mediaLimits.js";
import { getSideQueryThinkingSettings } from "../../utils/thinking.js";
import { sideQueryWithCounter, describeApiErrorForPlugin } from "../../utils/sideQuery.js";
import { withTimeout as withTimeout_2 } from "../../utils/sleep.js";
import { joinTextBlocks } from "./sessionReceive.js";
import { classifyQuerySource } from "../../services/api/requestHeaders.js";
import { isMainAgent } from "../../utils/agentContext.js";
import {
  forkCacheSafeParamsSlot,
  createCacheSafeParams,
  getLastCacheSafeParams,
  runForkedAgent,
} from "../../utils/forkedAgent.js";
import { getSessionId } from "../../bootstrap/state.js";
import { currentTurn } from "./personHold.js";
import { createUserMessage, getAssistantMessageText } from "../../utils/messages.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../../services/analytics/featureTelemetry.js";

//@ chunk-j8f885h1.js:262153-262381 placement
/**
 * prompt/system 为块数组时拼成字符串并保留原块（promptBlocks/systemBlocks）。疑似属于 SDK/钩子输入规整，归错文件。
 */
function normalizePromptAndSystemBlocks(options) {
  let { prompt, system, ...rest } = options;
  let promptPart = isTextBlockArrayWithCacheFlag(prompt)
    ? {
        prompt: prompt.map((promptBlock) => promptBlock.text).join(""),
        promptBlocks: prompt,
      }
    : {
        prompt,
      };
  let systemPart = isTextBlockArrayWithCacheFlag(system)
    ? {
        system: system.map((systemBlock) => systemBlock.text).join(""),
        systemBlocks: system,
      }
    : {
        system,
      };
  let hasSystem = Boolean(system);
  return {
    ...rest,
    ...promptPart,
    ...(hasSystem && systemPart),
  };
}
//@ chunk-5xgkngpb.js:4083317-4083833 placement
/**
 * 校验 $.model.complete 参数：需要 {model, prompt}，system/prompt 块必须是带可选 cache 的文本块列表。
 */
function checkModelCompleteArgs(args) {
  if (!(typeof args?.model === "string" && typeof args.prompt === "string"))
    return "takes { model, prompt }, the prompt a string or a list of blocks, each { text } and at most `cache: true`";
  if (!(typeof args.system === "string" || !args.system))
    return "takes a system that is a string or a list of blocks, each { text } and at most `cache: true`";
  return [args.promptBlocks, args.systemBlocks].every(
    (blocks) => blocks === undefined || isTextBlockArrayWithCacheFlag(blocks),
  )
    ? undefined
    : "takes promptBlocks and systemBlocks that are lists of blocks, each { text } and at most `cache: true`";
}
//@ chunk-5xgkngpb.js:4083833-4084127 placement
/**
 * 把提示文本按给定块前缀切分为 API 文本块（cache 标记转为 ephemeral cache_control）；无可用块时返回原字符串。
 */
function toPromptBlocks(prefixText, blocks = []) {
  let matchedCount = 0;
  let offset = 0;
  for (let block of blocks) {
    if (!(isWellFormedString(block.text) && prefixText.startsWith(block.text, offset))) break;
    matchedCount += 1;
    offset += block.text.length;
  }
  let keepWholeText = matchedCount === 0 || prefixText === "";
  let sliced = prefixText.slice(offset);
  return keepWholeText
    ? prefixText
    : [
        ...blocks.slice(0, matchedCount),
        ...(sliced === ""
          ? []
          : [
              {
                text: sliced,
              },
            ]),
      ].map((block) => ({
        type: "text",
        text: block.text,
        ...(block.cache === true && {
          cache_control: {
            type: "ephemeral",
          },
        }),
      }));
}
//@ chunk-5xgkngpb.js:4084127-4084169 placement
/**
 * 模型调用超时说明
 */
var MODEL_COMPLETE_DEADLINE = "model.complete deadline reached";
//@ chunk-5xgkngpb.js:4084169-4084533 placement
/**
 * $.model.complete 失败时的结果：超时/中止记调试日志并返回未回答，HTTP 失败记错误并按失败类型给出结果。
 */
function modelCompleteFailure({ pluginName, model, error, timedOutAfterMs, failure }) {
  let errorSuffix = isAbortError(error) ? "" : `: ${errorMessage(error)}`;
  let reasonText =
    timedOutAfterMs !== undefined
      ? `timed out after ${timedOutAfterMs} ms`
      : failure === null
        ? `aborted${errorSuffix}`
        : `failed (HTTP ${failure.status ?? "no status"}, ${failure.kind})` + errorSuffix;
  logForDebugging(`$.model.complete (${pluginName}): ${model} ${reasonText}`, {
    level: failure === null ? "debug" : "error",
  });
  if (failure === null)
    return {
      isAnswered: false,
      reason: "aborted",
      usage: ZERO_TOKEN_USAGE,
    };
  return modelApiError(failure);
}
//@ chunk-5xgkngpb.js:4084533-4086493 placement
/**
 * 插件 $.model.complete：校验 maxTokens、timeoutMs、effort 等参数后调用模型。
 */
async function modelCompleteForPlugin(
  { model, prompt, system, promptBlocks, systemBlocks, maxTokens, effort, timeoutMs },
  pluginName,
  record,
  externalSignal,
) {
  let argsProblem = checkModelCompleteArgs({
    model,
    prompt,
    system,
    promptBlocks,
    systemBlocks,
  });
  if (argsProblem !== undefined) throw new HooksError(`${pluginName}: $.model.complete: ${argsProblem}`);
  if (maxTokens !== undefined && (!Number.isInteger(maxTokens) || maxTokens < 1))
    throw new HooksError(
      `${pluginName}: $.model.complete: maxTokens must be a positive integer (got ${String(maxTokens)})`,
    );
  if (timeoutMs !== undefined && (!Number.isInteger(timeoutMs) || timeoutMs < 1))
    throw new HooksError(
      `${pluginName}: $.model.complete: timeoutMs must be a positive integer of milliseconds (got ${String(timeoutMs)})`,
    );
  let deadlineMs = timeoutMs === undefined ? undefined : Math.min(timeoutMs, MAX_TIMER_DELAY_MS);
  if (effort !== undefined && (typeof effort !== "string" || !isEffortLevel(effort)))
    throw new HooksError(
      `${pluginName}: $.model.complete: effort must be one of low, medium, high, xhigh, max (got ${String(effort)})`,
    );
  let userSpecifiedModel = parseUserSpecifiedModel(model);
  if (!isModelAllowed(userSpecifiedModel))
    throw new HooksError(
      `${pluginName}: $.model.complete: model "${model}" is not in this organization's allowlist`,
    );
  let min = Math.min(getModelMaxOutputTokens(userSpecifiedModel).upperLimit, MAX_OUTPUT_TOKENS_CAP_2);
  if (maxTokens !== undefined && maxTokens > min)
    throw new HooksError(
      `${pluginName}: $.model.complete: maxTokens ${maxTokens} is past what ${userSpecifiedModel} can produce in one reply (${min})`,
    );
  let [thinking, thinkingBudget] = getSideQueryThinkingSettings(userSpecifiedModel);
  let maxTokens_2 = Math.min((maxTokens ?? MAX_ERROR_TEXT) + thinkingBudget, min);
  let promptBlocks_2 = toPromptBlocks(typeof system === "string" ? system : "", systemBlocks);
  let abortController = new AbortController();
  let filtered = [externalSignal, abortController.signal].filter((abortSignal) => abortSignal !== undefined);
  let signal = AbortSignal.any(filtered);
  let now = Date.now();
  let response;
  let queryPromise = sideQueryWithCounter({
    querySource: "hook_prompt",
    model: userSpecifiedModel,
    max_tokens: maxTokens_2,
    thinking,
    skipSystemPromptPrefix: true,
    dropCacheControlWhenCachingDisabled: true,
    ...(promptBlocks_2.length > 0 && {
      system: promptBlocks_2,
    }),
    ...(effort !== undefined && {
      effort,
    }),
    messages: [
      {
        role: "user",
        content: toPromptBlocks(prompt, promptBlocks),
      },
    ],
    signal,
    record,
  });
  try {
    response = await (deadlineMs === undefined
      ? queryPromise
      : withTimeout_2(queryPromise, deadlineMs, MODEL_COMPLETE_DEADLINE));
  } catch (error) {
    let isAborted = externalSignal?.aborted === true || isAbortError(error);
    let isTimedOut = error instanceof Error && error.message === MODEL_COMPLETE_DEADLINE && !isAborted;
    if (isTimedOut) {
      abortController.abort();
      queryPromise.catch(() => {});
    }
    let isCanceled = isTimedOut || isAborted;
    return modelCompleteFailure({
      pluginName,
      model: userSpecifiedModel,
      error,
      ...(isTimedOut && {
        timedOutAfterMs: timeoutMs,
      }),
      failure: isCanceled ? null : describeApiErrorForPlugin(error, userSpecifiedModel),
    });
  }
  let replyText = joinTextBlocks(response.content, "");
  let usage = getTokenCountFromUsage_3_2(response.usage);
  logForDebugging(
    `$.model.complete (${pluginName}): ${userSpecifiedModel} answered in ${Date.now() - now}ms, ${replyText.length} chars`,
  );
  return replyText === ""
    ? {
        isAnswered: false,
        reason: "empty-reply",
        usage,
      }
    : {
        isAnswered: true,
        text: replyText,
        usage,
      };
}
//@ chunk-5xgkngpb.js:4086493-4086630 placement
var denyForkToolUse = () =>
  Promise.resolve({
    behavior: "deny",
    message: "A model fork cannot use tools",
    decisionReason: {
      type: "other",
      reason: "model.fork",
    },
  });
//@ chunk-5xgkngpb.js:4086630-4086640 placement
/**
 * 2
 */
var SESSION_CACHE_SLOTS = 2;
//@ chunk-5xgkngpb.js:4086640-4086801 placement
var isMainThreadQuery = ({ toolUseContext, querySource }) =>
  toolUseContext.agentId === undefined &&
  classifyQuerySource(querySource) === "main" &&
  (toolUseContext.agentContext === undefined || isMainAgent(toolUseContext.agentContext)) &&
  !toolUseContext.abortController.signal.aborted;
//@ chunk-5xgkngpb.js:4086801-4086851 placement
/**
 * 会话回合缓存
 */
var sessionTurnCache = () => forkCacheSafeParamsSlot.current(String(getSessionId()), currentTurn()?.turnId);
//@ chunk-5xgkngpb.js:4086851-4086968 placement
/**
 * 在主线程 Stop 钩子阶段记录本回合的请求，供插件 $.model.fork 复用。
 */
function noteMainRequestForFork(query, cacheSafeParams) {
  let sessionId = String(getSessionId());
  let turnId = currentTurn()?.turnId;
  if (turnId !== undefined && isMainThreadQuery(query) && !forkCacheSafeParamsSlot.holdsResponse(sessionId))
    forkCacheSafeParamsSlot.setRequest(cacheSafeParams, sessionId, turnId);
}
//@ chunk-5xgkngpb.js:4086968-4087020 placement
/**
 * 记住回合请求参数
 */
function rememberTurnParams(query) {
  if (isMainThreadQuery(query))
    forkCacheSafeParamsSlot.set(createCacheSafeParams(query), String(getSessionId()));
}
//@ chunk-5xgkngpb.js:4087020-4087056 placement
/**
 * 注册一次 Stop 钩子
 */
function registerTurnParamsHook(registerPostSamplingHook) {
  if (forkCacheSafeParamsSlot.once()) registerPostSamplingHook(rememberTurnParams);
}
//@ chunk-5xgkngpb.js:4087056-4087377 placement
/**
 * 去掉消息末尾连续助手消息中的 tool_use 块（全为 tool_use 的消息丢弃）。
 */
function stripTrailingToolUses(forkContextMessages) {
  let scanEnd = forkContextMessages.length;
  let strippedAny = false;
  let keptTail = [];
  while (scanEnd > 0) {
    let message = forkContextMessages[scanEnd - 1];
    if (!message || message.type !== "assistant") break;
    scanEnd--;
    let filtered = message.message.content.filter((contentBlock) => contentBlock.type !== "tool_use");
    if (filtered.length === message.message.content.length) keptTail.unshift(message);
    else {
      strippedAny = true;
      if (filtered.length > 0)
        keptTail.unshift({
          ...message,
          message: {
            ...message.message,
            content: filtered,
          },
        });
    }
  }
  return strippedAny ? [...forkContextMessages.slice(0, scanEnd), ...keptTail] : forkContextMessages;
}
//@ chunk-5xgkngpb.js:4087377-4089286 placement
/**
 * 插件 $.model.fork：在主线程请求的基础上分叉一次模型调用。
 */
async function modelForkForPlugin(args, plugin, modelCallNames, signal) {
  let cacheSafeParams =
    (currentTurn() !== undefined ? sessionTurnCache() : undefined) ?? getLastCacheSafeParams();
  if (!cacheSafeParams) {
    logForDebugging(`$.model.fork (${plugin}): no main-thread request to fork yet`);
    return {
      isAnswered: false,
      reason: "nothing-to-fork",
    };
  }
  let effort = args.effort;
  let effortEnvOverride = getEffortEnvOverride();
  let envRaisesEffort =
    effort !== undefined &&
    effortEnvOverride !== undefined &&
    (effortEnvOverride === null || isEffortHigherThan(effort, normalizeEffortLevel(effortEnvOverride)));
  let abortController = new AbortController();
  let onSignalAbort = () => abortController.abort();
  if (signal?.aborted) abortController.abort();
  else
    signal?.addEventListener("abort", onSignalAbort, {
      once: true,
    });
  let now = Date.now();
  try {
    let { messages, totalUsage } = await runForkedAgent({
      promptMessages: [
        createUserMessage({
          content: args.prompt,
        }),
      ],
      cacheSafeParams: {
        ...cacheSafeParams,
        forkContextMessages: stripTrailingToolUses(cacheSafeParams.forkContextMessages),
      },
      canUseTool: denyForkToolUse,
      querySource: "hook_prompt",
      forkLabel: "plugin_model_fork",
      maxTurns: SESSION_CACHE_SLOTS,
      pinnedEffort: envRaisesEffort ? undefined : effort,
      skipCacheWrite: true,
      skipTranscript: true,
      overrides: {
        abortController,
        modelCallNames,
      },
    });
    let forkedUuids = new Set(cacheSafeParams.forkContextMessages.map(({ uuid }) => uuid));
    let filtered = messages
      .filter((message) => message.type === "assistant")
      .filter(({ uuid }) => !forkedUuids.has(uuid));
    let filtered_2 = filtered.filter((assistantMessage) => !assistantMessage.isApiErrorMessage);
    let filtered_3 = filtered_2
      .map(getAssistantMessageText)
      .filter((replyText) => replyText !== null && replyText !== "");
    let last = filtered.findLast((errorMessage) => errorMessage.isApiErrorMessage);
    let aborted = abortController.signal.aborted;
    let last_2 = filtered_2.at(-1);
    let sentEffort = last_2?.perTurnEffort ?? last_2?.effort;
    let effortNote = {
      usage: getTokenCountFromUsage_3_2(totalUsage),
      ...(sentEffort !== undefined && {
        effort: sentEffort,
      }),
    };
    logForDebugging(
      `$.model.fork (${plugin}): ${Date.now() - now}ms, ${filtered_3.length} replies` +
        (effort === undefined ? "" : `, effort ${effort} asked, ${sentEffort ?? "none"} sent`) +
        (aborted ? ", aborted" : "") +
        (last ? `, API error ${last.apiErrorStatus ?? "no status"}` : ""),
    );
    if (effort !== undefined && !aborted) {
      if (sentEffort === effort) logFeatureOk("plugin_function_hooks_fork_effort");
      else if (last_2 === undefined) logFeatureBad("plugin_function_hooks_fork_effort", "no_response");
      else
        logFeatureSad(
          "plugin_function_hooks_fork_effort",
          sentEffort === undefined ? "no_named_level" : "other_level",
        );
    }
    let hasReplies = filtered_3.length > 0;
    return aborted
      ? {
          isAnswered: false,
          reason: "aborted",
          ...effortNote,
        }
      : hasReplies
        ? {
            isAnswered: true,
            text: filtered_3.join(`
`),
            ...effortNote,
          }
        : last
          ? {
              isAnswered: false,
              reason: "api-error",
              status: last.apiErrorStatus ?? null,
              error: last.error ?? "unknown",
              ...effortNote,
            }
          : {
              isAnswered: false,
              reason: "empty-reply",
              ...effortNote,
            };
  } catch (error) {
    if (effort !== undefined && !abortController.signal.aborted)
      logFeatureBad("plugin_function_hooks_fork_effort", "threw");
    throw error;
  } finally {
    signal?.removeEventListener("abort", onSignalAbort);
  }
}
//@ chunk-5xgkngpb.js:4089286-4089340 placement
/**
 * 带前缀包装的错误构造
 */
var prefixedErrorCtor = (pluginName, method, apiName) => (detail) =>
  new HooksError(`${pluginName}: ${method}(${apiName}) ${detail}`);
export {
  registerTurnParamsHook,
  checkModelCompleteArgs,
  modelCompleteForPlugin,
  modelForkForPlugin,
  prefixedErrorCtor,
  normalizePromptAndSystemBlocks,
  rememberTurnParams,
  noteMainRequestForFork,
};

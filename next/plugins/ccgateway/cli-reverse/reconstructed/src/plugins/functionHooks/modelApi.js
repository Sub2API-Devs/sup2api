/**
 * plugins/functionHooks/modelApi.ts
 *
 * 2.1.316 新增：插件 $.model.complete/classify/fork 接口
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4121qate.js (1), chunk-e6aww6q8.js (15)
 * attribution: placement 16
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
import { isEffortLevel } from "../../utils/effort.js";
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

//@ chunk-4121qate.js:280961-281189 placement
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
//@ chunk-e6aww6q8.js:3981077-3981593 placement
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
//@ chunk-e6aww6q8.js:3981593-3981887 placement
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
//@ chunk-e6aww6q8.js:3981887-3981929 placement
/**
 * 模型调用超时说明
 */
var MODEL_COMPLETE_DEADLINE = "model.complete deadline reached";
//@ chunk-e6aww6q8.js:3981929-3982293 placement
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
//@ chunk-e6aww6q8.js:3982293-3984250 placement
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
//@ chunk-e6aww6q8.js:3984250-3984387 placement
var denyForkToolUse = () =>
  Promise.resolve({
    behavior: "deny",
    message: "A model fork cannot use tools",
    decisionReason: {
      type: "other",
      reason: "model.fork",
    },
  });
//@ chunk-e6aww6q8.js:3984387-3984397 placement
/**
 * 2
 */
var SESSION_CACHE_SLOTS = 2;
//@ chunk-e6aww6q8.js:3984397-3984558 placement
var isMainThreadQuery = ({ toolUseContext, querySource }) =>
  toolUseContext.agentId === undefined &&
  classifyQuerySource(querySource) === "main" &&
  (toolUseContext.agentContext === undefined || isMainAgent(toolUseContext.agentContext)) &&
  !toolUseContext.abortController.signal.aborted;
//@ chunk-e6aww6q8.js:3984558-3984608 placement
/**
 * 会话回合缓存
 */
var sessionTurnCache = () => forkCacheSafeParamsSlot.current(String(getSessionId()), currentTurn()?.turnId);
//@ chunk-e6aww6q8.js:3984608-3984725 placement
/**
 * 在主线程 Stop 钩子阶段记录本回合的请求，供插件 $.model.fork 复用。
 */
function noteMainRequestForFork(query, cacheSafeParams) {
  let sessionId = String(getSessionId());
  let turnId = currentTurn()?.turnId;
  if (turnId !== undefined && isMainThreadQuery(query) && !forkCacheSafeParamsSlot.holdsResponse(sessionId))
    forkCacheSafeParamsSlot.setRequest(cacheSafeParams, sessionId, turnId);
}
//@ chunk-e6aww6q8.js:3984725-3984777 placement
/**
 * 记住回合请求参数
 */
function rememberTurnParams(query) {
  if (isMainThreadQuery(query))
    forkCacheSafeParamsSlot.set(createCacheSafeParams(query), String(getSessionId()));
}
//@ chunk-e6aww6q8.js:3984777-3984813 placement
/**
 * 注册一次 Stop 钩子
 */
function registerTurnParamsHook(registerPostSamplingHook) {
  if (forkCacheSafeParamsSlot.once()) registerPostSamplingHook(rememberTurnParams);
}
//@ chunk-e6aww6q8.js:3984813-3985134 placement
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
//@ chunk-e6aww6q8.js:3985134-3986406 placement
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
      skipCacheWrite: true,
      skipTranscript: true,
      overrides: {
        abortController,
        modelCallNames,
      },
    });
    let usage = getTokenCountFromUsage_3_2(totalUsage);
    let filtered = messages.filter((message) => message.type === "assistant");
    let filtered_2 = filtered
      .filter((assistantMessage) => !assistantMessage.isApiErrorMessage)
      .map(getAssistantMessageText)
      .filter((replyText) => replyText !== null && replyText !== "");
    let last = filtered.findLast((errorMessage) => errorMessage.isApiErrorMessage);
    let aborted = abortController.signal.aborted;
    logForDebugging(
      `$.model.fork (${plugin}): ${Date.now() - now}ms, ${filtered_2.length} replies` +
        (aborted ? ", aborted" : "") +
        (last ? `, API error ${last.apiErrorStatus ?? "no status"}` : ""),
    );
    let hasReplies = filtered_2.length > 0;
    return aborted
      ? {
          isAnswered: false,
          reason: "aborted",
          usage,
        }
      : hasReplies
        ? {
            isAnswered: true,
            text: filtered_2.join(`
`),
            usage,
          }
        : last
          ? {
              isAnswered: false,
              reason: "api-error",
              status: last.apiErrorStatus ?? null,
              error: last.error ?? "unknown",
              usage,
            }
          : {
              isAnswered: false,
              reason: "empty-reply",
              usage,
            };
  } finally {
    signal?.removeEventListener("abort", onSignalAbort);
  }
}
//@ chunk-e6aww6q8.js:3986406-3986460 placement
/**
 * 带前缀包装的错误构造
 */
var prefixedErrorCtor = (pluginName, method, apiName) => (detail) =>
  new HooksError(`${pluginName}: ${method}(${apiName}) ${detail}`);
export {
  registerTurnParamsHook,
  normalizePromptAndSystemBlocks,
  prefixedErrorCtor,
  checkModelCompleteArgs,
  modelCompleteForPlugin,
  modelForkForPlugin,
  rememberTurnParams,
  noteMainRequestForFork,
};

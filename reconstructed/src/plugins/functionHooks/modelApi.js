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
  Reo,
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
import { MAX_OUTPUT_TOKENS_CAP as MAX_OUTPUT_TOKENS_CAP_2 } from "../../utils/truncateGraphemes.js";
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

//@ chunk-e6aww6q8.js:3981077-3981593 placement
/**
 * 校验 $.model.complete 参数：需要 {model, prompt}，system/prompt 块必须是带可选 cache 的文本块列表。
 */
function checkModelCompleteArgs(e) {
  if (!(typeof e?.model === "string" && typeof e.prompt === "string"))
    return "takes { model, prompt }, the prompt a string or a list of blocks, each { text } and at most `cache: true`";
  if (!(typeof e.system === "string" || !e.system))
    return "takes a system that is a string or a list of blocks, each { text } and at most `cache: true`";
  return [e.promptBlocks, e.systemBlocks].every((h) => h === undefined || isTextBlockArrayWithCacheFlag(h))
    ? undefined
    : "takes promptBlocks and systemBlocks that are lists of blocks, each { text } and at most `cache: true`";
}
//@ chunk-e6aww6q8.js:3981593-3981887 placement
/**
 * 把提示文本按给定块前缀切分为 API 文本块（cache 标记转为 ephemeral cache_control）；无可用块时返回原字符串。
 */
function toPromptBlocks(e, n = []) {
  let r = 0;
  let s = 0;
  for (let S of n) {
    if (!(isWellFormedString(S.text) && e.startsWith(S.text, s))) break;
    r += 1;
    s += S.text.length;
  }
  let h = r === 0 || e === "";
  let sliced = e.slice(s);
  return h
    ? e
    : [
        ...n.slice(0, r),
        ...(sliced === ""
          ? []
          : [
              {
                text: sliced,
              },
            ]),
      ].map((S) => ({
        type: "text",
        text: S.text,
        ...(S.cache === true && {
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
  let y = isAbortError(error) ? "" : `: ${errorMessage(error)}`;
  let S =
    timedOutAfterMs !== undefined
      ? `timed out after ${timedOutAfterMs} ms`
      : failure === null
        ? `aborted${y}`
        : `failed (HTTP ${failure.status ?? "no status"}, ${failure.kind})` + y;
  logForDebugging(`$.model.complete (${pluginName}): ${model} ${S}`, {
    level: failure === null ? "debug" : "error",
  });
  if (failure === null)
    return {
      isAnswered: false,
      reason: "aborted",
      usage: Reo,
    };
  return modelApiError(failure);
}
//@ chunk-e6aww6q8.js:3982293-3984250 placement
/**
 * 插件 $.model.complete：校验 maxTokens、timeoutMs、effort 等参数后调用模型。
 */
async function modelCompleteForPlugin(
  { model, prompt, system, promptBlocks, systemBlocks, maxTokens, effort, timeoutMs },
  L,
  record,
  q,
) {
  let Z = checkModelCompleteArgs({
    model,
    prompt,
    system,
    promptBlocks,
    systemBlocks,
  });
  if (Z !== undefined) throw new HooksError(`${L}: $.model.complete: ${Z}`);
  if (maxTokens !== undefined && (!Number.isInteger(maxTokens) || maxTokens < 1))
    throw new HooksError(
      `${L}: $.model.complete: maxTokens must be a positive integer (got ${String(maxTokens)})`,
    );
  if (timeoutMs !== undefined && (!Number.isInteger(timeoutMs) || timeoutMs < 1))
    throw new HooksError(
      `${L}: $.model.complete: timeoutMs must be a positive integer of milliseconds (got ${String(timeoutMs)})`,
    );
  let we = timeoutMs === undefined ? undefined : Math.min(timeoutMs, MAX_TIMER_DELAY_MS);
  if (effort !== undefined && (typeof effort !== "string" || !isEffortLevel(effort)))
    throw new HooksError(
      `${L}: $.model.complete: effort must be one of low, medium, high, xhigh, max (got ${String(effort)})`,
    );
  let userSpecifiedModel = parseUserSpecifiedModel(model);
  if (!isModelAllowed(userSpecifiedModel))
    throw new HooksError(`${L}: $.model.complete: model "${model}" is not in this organization's allowlist`);
  let min = Math.min(getModelMaxOutputTokens(userSpecifiedModel).upperLimit, MAX_OUTPUT_TOKENS_CAP_2);
  if (maxTokens !== undefined && maxTokens > min)
    throw new HooksError(
      `${L}: $.model.complete: maxTokens ${maxTokens} is past what ${userSpecifiedModel} can produce in one reply (${min})`,
    );
  let [Me, We] = getSideQueryThinkingSettings(userSpecifiedModel);
  let maxTokens_2 = Math.min((maxTokens ?? MAX_ERROR_TEXT) + We, min);
  let promptBlocks_2 = toPromptBlocks(typeof system === "string" ? system : "", systemBlocks);
  let abortController = new AbortController();
  let filtered = [q, abortController.signal].filter((qt) => qt !== undefined);
  let signal = AbortSignal.any(filtered);
  let now = Date.now();
  let yt;
  let gt = sideQueryWithCounter({
    querySource: "hook_prompt",
    model: userSpecifiedModel,
    max_tokens: maxTokens_2,
    thinking: Me,
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
    yt = await (we === undefined ? gt : withTimeout_2(gt, we, MODEL_COMPLETE_DEADLINE));
  } catch (error) {
    let Zt = q?.aborted === true || isAbortError(error);
    let rn = error instanceof Error && error.message === MODEL_COMPLETE_DEADLINE && !Zt;
    if (rn) {
      abortController.abort();
      gt.catch(() => {});
    }
    let pn = rn || Zt;
    return modelCompleteFailure({
      pluginName: L,
      model: userSpecifiedModel,
      error,
      ...(rn && {
        timedOutAfterMs: timeoutMs,
      }),
      failure: pn ? null : describeApiErrorForPlugin(error, userSpecifiedModel),
    });
  }
  let At = joinTextBlocks(yt.content, "");
  let usage = getTokenCountFromUsage_3_2(yt.usage);
  logForDebugging(
    `$.model.complete (${L}): ${userSpecifiedModel} answered in ${Date.now() - now}ms, ${At.length} chars`,
  );
  return At === ""
    ? {
        isAnswered: false,
        reason: "empty-reply",
        usage,
      }
    : {
        isAnswered: true,
        text: At,
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
function noteMainRequestForFork(e, cacheSafeParams) {
  let r = String(getSessionId());
  let turnId = currentTurn()?.turnId;
  if (turnId !== undefined && isMainThreadQuery(e) && !forkCacheSafeParamsSlot.holdsResponse(r))
    forkCacheSafeParamsSlot.setRequest(cacheSafeParams, r, turnId);
}
//@ chunk-e6aww6q8.js:3984725-3984777 placement
/**
 * 记住回合请求参数
 */
function rememberTurnParams(e) {
  if (isMainThreadQuery(e)) forkCacheSafeParamsSlot.set(createCacheSafeParams(e), String(getSessionId()));
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
  let n = forkContextMessages.length;
  let r = false;
  let s = [];
  while (n > 0) {
    let h = forkContextMessages[n - 1];
    if (!h || h.type !== "assistant") break;
    n--;
    let filtered = h.message.content.filter((S) => S.type !== "tool_use");
    if (filtered.length === h.message.content.length) s.unshift(h);
    else {
      r = true;
      if (filtered.length > 0)
        s.unshift({
          ...h,
          message: {
            ...h.message,
            content: filtered,
          },
        });
    }
  }
  return r ? [...forkContextMessages.slice(0, n), ...s] : forkContextMessages;
}
//@ chunk-e6aww6q8.js:3985134-3986406 placement
/**
 * 插件 $.model.fork：在主线程请求的基础上分叉一次模型调用。
 */
async function modelForkForPlugin(e, plugin, modelCallNames, signal) {
  let y = (currentTurn() !== undefined ? sessionTurnCache() : undefined) ?? getLastCacheSafeParams();
  if (!y) {
    logForDebugging(`$.model.fork (${plugin}): no main-thread request to fork yet`);
    return {
      isAnswered: false,
      reason: "nothing-to-fork",
    };
  }
  let abortController = new AbortController();
  let w = () => abortController.abort();
  if (signal?.aborted) abortController.abort();
  else
    signal?.addEventListener("abort", w, {
      once: true,
    });
  let now = Date.now();
  try {
    let { messages, totalUsage } = await runForkedAgent({
      promptMessages: [
        createUserMessage({
          content: e.prompt,
        }),
      ],
      cacheSafeParams: {
        ...y,
        forkContextMessages: stripTrailingToolUses(y.forkContextMessages),
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
      .filter((Ie) => !Ie.isApiErrorMessage)
      .map(getAssistantMessageText)
      .filter((Ie) => Ie !== null && Ie !== "");
    let last = filtered.findLast((Ie) => Ie.isApiErrorMessage);
    let aborted = abortController.signal.aborted;
    logForDebugging(
      `$.model.fork (${plugin}): ${Date.now() - now}ms, ${filtered_2.length} replies` +
        (aborted ? ", aborted" : "") +
        (last ? `, API error ${last.apiErrorStatus ?? "no status"}` : ""),
    );
    let Ae = filtered_2.length > 0;
    return aborted
      ? {
          isAnswered: false,
          reason: "aborted",
          usage,
        }
      : Ae
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
    signal?.removeEventListener("abort", w);
  }
}
//@ chunk-e6aww6q8.js:3986406-3986460 placement
/**
 * 带前缀包装的错误构造
 */
var prefixedErrorCtor = (e, n, r) => (s) => new HooksError(`${e}: ${n}(${r}) ${s}`);
//@ chunk-4121qate.js:280961-281189 placement
/**
 * prompt/system 为块数组时拼成字符串并保留原块（promptBlocks/systemBlocks）。疑似属于 SDK/钩子输入规整，归错文件。
 */
function normalizePromptAndSystemBlocks(e) {
  let { prompt, system, ...n } = e;
  let i = isTextBlockArrayWithCacheFlag(prompt)
    ? {
        prompt: prompt.map((m) => m.text).join(""),
        promptBlocks: prompt,
      }
    : {
        prompt,
      };
  let f = isTextBlockArrayWithCacheFlag(system)
    ? {
        system: system.map((m) => m.text).join(""),
        systemBlocks: system,
      }
    : {
        system,
      };
  let a = Boolean(system);
  return {
    ...n,
    ...i,
    ...(a && f),
  };
}
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

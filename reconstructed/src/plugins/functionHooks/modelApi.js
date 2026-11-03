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
  freeze_10 as freeze_10_2,
  getTokenCountFromUsage_3 as getTokenCountFromUsage_3_2,
} from "./api/operations.js";
import { isWellFormedString } from "../../utils/stringUtils.js";
import { isAbortError, errorMessage } from "../../utils/errors.js";
import { logForDebugging } from "../../utils/debug.js";
import { c0n, RXr } from "./mcpApi.js";
import { HooksError } from "./hooksErrors.js";
import { ec } from "../../utils/timerDelayClamp.js";
import { isEffortLevel } from "../../utils/effort.js";
import { parseUserSpecifiedModel } from "../../utils/model/modelDisplay.js";
import { isModelAllowed } from "../../utils/model/modelAllowlist.js";
import { getModelMaxOutputTokens } from "../../utils/context.js";
import { MMn } from "../../utils/truncateGraphemes.js";
import { getSideQueryThinkingSettings } from "../../utils/thinking.js";
import { aN, I_n } from "../../utils/sideQuery.js";
import { withTimeout as withTimeout_2 } from "../../utils/sleep.js";
import { ANe } from "./sessionReceive.js";
import { classifyQuerySource } from "../../services/api/requestHeaders.js";
import { isMainAgent } from "../../utils/agentContext.js";
import {
  VR,
  createCacheSafeParams,
  getLastCacheSafeParams,
  runForkedAgent,
} from "../../utils/forkedAgent.js";
import { getSessionId } from "../../bootstrap/state.js";
import { vbe } from "./personHold.js";
import { createUserMessage, getAssistantMessageText } from "../../utils/messages.js";

/**
 * 校验 $.model.complete 参数：需要 {model, prompt}，system/prompt 块必须是带可选 cache 的文本块列表。
 */
//@ chunk-e6aww6q8.js:3981077-3981593 placement
function checkModelCompleteArgs(e) {
  if (!(typeof e?.model === "string" && typeof e.prompt === "string"))
    return "takes { model, prompt }, the prompt a string or a list of blocks, each { text } and at most `cache: true`";
  if (!(typeof e.system === "string" || !e.system))
    return "takes a system that is a string or a list of blocks, each { text } and at most `cache: true`";
  return [e.promptBlocks, e.systemBlocks].every((h) => h === void 0 || isTextBlockArrayWithCacheFlag(h))
    ? void 0
    : "takes promptBlocks and systemBlocks that are lists of blocks, each { text } and at most `cache: true`";
}
/**
 * 把提示文本按给定块前缀切分为 API 文本块（cache 标记转为 ephemeral cache_control）；无可用块时返回原字符串。
 */
//@ chunk-e6aww6q8.js:3981593-3981887 placement
function toPromptBlocks(e, n = []) {
  let r = 0,
    s = 0;
  for (let S of n) {
    if (!(isWellFormedString(S.text) && e.startsWith(S.text, s))) break;
    ((r += 1), (s += S.text.length));
  }
  let h = r === 0 || e === "",
    sliced = e.slice(s);
  return h
    ? e
    : [...n.slice(0, r), ...(sliced === "" ? [] : [{ text: sliced }])].map((S) => ({
        type: "text",
        text: S.text,
        ...(S.cache === !0 && { cache_control: { type: "ephemeral" } }),
      }));
}
//@ chunk-e6aww6q8.js:3981887-3981929 placement
var m0n = "model.complete deadline reached";
/**
 * $.model.complete 失败时的结果：超时/中止记调试日志并返回未回答，HTTP 失败记错误并按失败类型给出结果。
 */
//@ chunk-e6aww6q8.js:3981929-3982293 placement
function modelCompleteFailure({
  pluginName: pluginName,
  model: model,
  error: error,
  timedOutAfterMs: timedOutAfterMs,
  failure: failure,
}) {
  let y = isAbortError(error) ? "" : `: ${errorMessage(error)}`,
    S =
      timedOutAfterMs !== void 0
        ? `timed out after ${timedOutAfterMs} ms`
        : failure === null
          ? `aborted${y}`
          : `failed (HTTP ${failure.status ?? "no status"}, ${failure.kind})` + y;
  if (
    (logForDebugging(`$.model.complete (${pluginName}): ${model} ${S}`, {
      level: failure === null ? "debug" : "error",
    }),
    failure === null)
  )
    return { isAnswered: !1, reason: "aborted", usage: freeze_10_2 };
  return c0n(failure);
}
/**
 * 插件 $.model.complete：校验 maxTokens、timeoutMs、effort 等参数后调用模型。
 */
//@ chunk-e6aww6q8.js:3982293-3984250 placement
async function modelCompleteForPlugin(
  {
    model: model,
    prompt: prompt,
    system: system,
    promptBlocks: promptBlocks,
    systemBlocks: systemBlocks,
    maxTokens: maxTokens,
    effort: effort,
    timeoutMs: timeoutMs,
  },
  L,
  G,
  q,
) {
  let Z = checkModelCompleteArgs({
    model: model,
    prompt: prompt,
    system: system,
    promptBlocks: promptBlocks,
    systemBlocks: systemBlocks,
  });
  if (Z !== void 0) throw new HooksError(`${L}: $.model.complete: ${Z}`);
  if (maxTokens !== void 0 && (!Number.isInteger(maxTokens) || maxTokens < 1))
    throw new HooksError(
      `${L}: $.model.complete: maxTokens must be a positive integer (got ${String(maxTokens)})`,
    );
  if (timeoutMs !== void 0 && (!Number.isInteger(timeoutMs) || timeoutMs < 1))
    throw new HooksError(
      `${L}: $.model.complete: timeoutMs must be a positive integer of milliseconds (got ${String(timeoutMs)})`,
    );
  let we = timeoutMs === void 0 ? void 0 : Math.min(timeoutMs, ec);
  if (effort !== void 0 && (typeof effort !== "string" || !isEffortLevel(effort)))
    throw new HooksError(
      `${L}: $.model.complete: effort must be one of low, medium, high, xhigh, max (got ${String(effort)})`,
    );
  let Ae = parseUserSpecifiedModel(model);
  if (!isModelAllowed(Ae))
    throw new HooksError(`${L}: $.model.complete: model "${model}" is not in this organization's allowlist`);
  let min = Math.min(getModelMaxOutputTokens(Ae).upperLimit, MMn);
  if (maxTokens !== void 0 && maxTokens > min)
    throw new HooksError(
      `${L}: $.model.complete: maxTokens ${maxTokens} is past what ${Ae} can produce in one reply (${min})`,
    );
  let [Me, We] = getSideQueryThinkingSettings(Ae),
    min_2 = Math.min((maxTokens ?? RXr) + We, min),
    lt = toPromptBlocks(typeof system === "string" ? system : "", systemBlocks),
    abortController = new AbortController(),
    filtered = [q, abortController.signal].filter((qt) => qt !== void 0),
    any = AbortSignal.any(filtered),
    now = Date.now(),
    yt,
    gt = aN({
      querySource: "hook_prompt",
      model: Ae,
      max_tokens: min_2,
      thinking: Me,
      skipSystemPromptPrefix: !0,
      dropCacheControlWhenCachingDisabled: !0,
      ...(lt.length > 0 && { system: lt }),
      ...(effort !== void 0 && { effort: effort }),
      messages: [{ role: "user", content: toPromptBlocks(prompt, promptBlocks) }],
      signal: any,
      record: G,
    });
  try {
    yt = await (we === void 0 ? gt : withTimeout_2(gt, we, m0n));
  } catch (error) {
    let Zt = q?.aborted === !0 || isAbortError(error),
      rn = error instanceof Error && error.message === m0n && !Zt;
    if (rn) (abortController.abort(), gt.catch(() => {}));
    let pn = rn || Zt;
    return modelCompleteFailure({
      pluginName: L,
      model: Ae,
      error: error,
      ...(rn && { timedOutAfterMs: timeoutMs }),
      failure: pn ? null : I_n(error, Ae),
    });
  }
  let At = ANe(yt.content, ""),
    It = getTokenCountFromUsage_3_2(yt.usage);
  return (
    logForDebugging(`$.model.complete (${L}): ${Ae} answered in ${Date.now() - now}ms, ${At.length} chars`),
    At === "" ? { isAnswered: !1, reason: "empty-reply", usage: It } : { isAnswered: !0, text: At, usage: It }
  );
}
//@ chunk-e6aww6q8.js:3984250-3984387 placement
var denyForkToolUse = () =>
  Promise.resolve({
    behavior: "deny",
    message: "A model fork cannot use tools",
    decisionReason: { type: "other", reason: "model.fork" },
  });
//@ chunk-e6aww6q8.js:3984387-3984397 placement
var S0n = 2;
//@ chunk-e6aww6q8.js:3984397-3984558 placement
var isMainThreadQuery = ({ toolUseContext: toolUseContext, querySource: querySource }) =>
  toolUseContext.agentId === void 0 &&
  classifyQuerySource(querySource) === "main" &&
  (toolUseContext.agentContext === void 0 || isMainAgent(toolUseContext.agentContext)) &&
  !toolUseContext.abortController.signal.aborted;
//@ chunk-e6aww6q8.js:3984558-3984608 placement
var DXr = () => VR.current(String(getSessionId()), vbe()?.turnId);
/**
 * 在主线程 Stop 钩子阶段记录本回合的请求，供插件 $.model.fork 复用。
 */
//@ chunk-e6aww6q8.js:3984608-3984725 placement
function noteMainRequestForFork(e, n) {
  let r = String(getSessionId()),
    s = vbe()?.turnId;
  if (s !== void 0 && isMainThreadQuery(e) && !VR.holdsResponse(r)) VR.setRequest(n, r, s);
}
//@ chunk-e6aww6q8.js:3984725-3984777 placement
function vWo(e) {
  if (isMainThreadQuery(e)) VR.set(createCacheSafeParams(e), String(getSessionId()));
}
//@ chunk-e6aww6q8.js:3984777-3984813 placement
function kWo(e) {
  if (VR.once()) e(vWo);
}
/**
 * 去掉消息末尾连续助手消息中的 tool_use 块（全为 tool_use 的消息丢弃）。
 */
//@ chunk-e6aww6q8.js:3984813-3985134 placement
function stripTrailingToolUses(e) {
  let n = e.length,
    r = !1,
    s = [];
  while (n > 0) {
    let h = e[n - 1];
    if (!h || h.type !== "assistant") break;
    n--;
    let filtered = h.message.content.filter((S) => S.type !== "tool_use");
    if (filtered.length === h.message.content.length) s.unshift(h);
    else if (((r = !0), filtered.length > 0))
      s.unshift({ ...h, message: { ...h.message, content: filtered } });
  }
  return r ? [...e.slice(0, n), ...s] : e;
}
/**
 * 插件 $.model.fork：在主线程请求的基础上分叉一次模型调用。
 */
//@ chunk-e6aww6q8.js:3985134-3986406 placement
async function modelForkForPlugin(e, n, r, s) {
  let y = (vbe() !== void 0 ? DXr() : void 0) ?? getLastCacheSafeParams();
  if (!y)
    return (
      logForDebugging(`$.model.fork (${n}): no main-thread request to fork yet`),
      { isAnswered: !1, reason: "nothing-to-fork" }
    );
  let abortController = new AbortController(),
    w = () => abortController.abort();
  s?.aborted ? abortController.abort() : s?.addEventListener("abort", w, { once: !0 });
  let now = Date.now();
  try {
    let { messages: messages, totalUsage: totalUsage } = await runForkedAgent({
        promptMessages: [createUserMessage({ content: e.prompt })],
        cacheSafeParams: { ...y, forkContextMessages: stripTrailingToolUses(y.forkContextMessages) },
        canUseTool: denyForkToolUse,
        querySource: "hook_prompt",
        forkLabel: "plugin_model_fork",
        maxTurns: S0n,
        skipCacheWrite: !0,
        skipTranscript: !0,
        overrides: { abortController: abortController, modelCallNames: r },
      }),
      Z = getTokenCountFromUsage_3_2(totalUsage),
      filtered = messages.filter((Ie) => Ie.type === "assistant"),
      filtered_2 = filtered
        .filter((Ie) => !Ie.isApiErrorMessage)
        .map(getAssistantMessageText)
        .filter((Ie) => Ie !== null && Ie !== ""),
      last = filtered.findLast((Ie) => Ie.isApiErrorMessage),
      aborted = abortController.signal.aborted;
    logForDebugging(
      `$.model.fork (${n}): ${Date.now() - now}ms, ${filtered_2.length} replies` +
        (aborted ? ", aborted" : "") +
        (last ? `, API error ${last.apiErrorStatus ?? "no status"}` : ""),
    );
    let Ae = filtered_2.length > 0;
    return aborted
      ? { isAnswered: !1, reason: "aborted", usage: Z }
      : Ae
        ? {
            isAnswered: !0,
            text: filtered_2.join(`
`),
            usage: Z,
          }
        : last
          ? {
              isAnswered: !1,
              reason: "api-error",
              status: last.apiErrorStatus ?? null,
              error: last.error ?? "unknown",
              usage: Z,
            }
          : { isAnswered: !1, reason: "empty-reply", usage: Z };
  } finally {
    s?.removeEventListener("abort", w);
  }
}
//@ chunk-e6aww6q8.js:3986406-3986460 placement
var ZPe = (e, n, r) => (s) => new HooksError(`${e}: ${n}(${r}) ${s}`);
/**
 * prompt/system 为块数组时拼成字符串并保留原块（promptBlocks/systemBlocks）。疑似属于 SDK/钩子输入规整，归错文件。
 */
//@ chunk-4121qate.js:280961-281189 placement
function normalizePromptAndSystemBlocks(e) {
  let { prompt: prompt, system: system, ...n } = e,
    i = isTextBlockArrayWithCacheFlag(prompt)
      ? { prompt: prompt.map((m) => m.text).join(""), promptBlocks: prompt }
      : { prompt: prompt },
    f = isTextBlockArrayWithCacheFlag(system)
      ? { system: system.map((m) => m.text).join(""), systemBlocks: system }
      : { system: system },
    a = Boolean(system);
  return { ...n, ...i, ...(a && f) };
}

export {
  kWo,
  normalizePromptAndSystemBlocks,
  ZPe,
  checkModelCompleteArgs,
  modelCompleteForPlugin,
  modelForkForPlugin,
  vWo,
  noteMainRequestForFork,
};

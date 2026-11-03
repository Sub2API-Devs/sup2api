/**
 * services/tokenEstimation.ts
 *
 * token 计数：countTokens API（第一方/Bedrock/小模型采样回退）与按字符数的粗估（默认 4 字节/token，JSON 2 字节/token，图片/文档 2000）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/tokenEstimation.ts
 * pieces: chunk-aepeg2w5.js (1), chunk-e6aww6q8.js (11), chunk-g54kbxqw.js (8)
 * attribution: fingerprint 6, placement 5, layout 6, affinity 1, callgraph-witnessed 1, file-local 1
 */
import { modelSupportsAdaptiveThinking } from "../utils/thinking.js";
import { getThinkingTypeOverride, isDiskless, getGatewayAuth } from "../bootstrap/state.js";
import { getCanonicalName } from "../utils/model/canonicalModelName.js";
import { isToolReferenceBlock } from "../utils/toolSearch.js";
import { stripFallbackBlocks, kGe } from "../utils/messages.js";
import { withTokenCountVCR } from "./vcr.js";
import { unlessManagedDeniedModel, getSmallFastModel } from "../utils/model/smallFastModel.js";
import { getMainLoopModel, toProviderWireModelId, getDefaultSonnetModel } from "../utils/model/model.js";
import { getModelBetas, u9t, betasRequestParam, betaHeaderValues } from "../utils/betas.js";
import { getProviderForModel } from "../utils/model/providers.js";
import { getAnthropicClient, getToolNameList } from "./api/client.js";
import { mainAgentContext } from "../utils/agentContext.js";
import { deferredToolNameOf } from "./api/deferredToolsState.js";
import { logForDebugging } from "../utils/debug.js";
import { XUt } from "./api/regimeRefusal.js";
import { Ot } from "../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { env } from "../utils/env.js";
import { getVertexRegionForModel } from "../utils/envUtils.js";
import {
  createBedrockRuntimeClient,
  isFoundationModel,
  getInferenceProfileBackingModel,
  Oos,
} from "../utils/model/bedrock.js";
import { jsonStringify } from "../utils/slowOperations.js";
import { bl } from "../utils/toolResultStorage.js";

//@ chunk-e6aww6q8.js:977825-977847 placement
var qxo = 1024,
  a1t = 2048;
//@ chunk-e6aww6q8.js:977847-978007 placement
function thinkingParamFor(e, n = e) {
  return modelSupportsAdaptiveThinking({
    runtimeOverride: getThinkingTypeOverride(e),
    resolvedModel: n,
    canonicalModel: getCanonicalName(n),
  }) === "adaptive"
    ? { type: "adaptive" }
    : { type: "enabled", budget_tokens: qxo };
}
/**
 * API 消息中是否有 thinking/redacted_thinking 块（计数请求需带 thinking 参数）。
 */
//@ chunk-e6aww6q8.js:978007-978228 fingerprint = hasThinkingBlocks (1)
function hasThinkingBlocks(messages) {
  for (let message of messages)
    if (message.role === "assistant" && Array.isArray(message.content)) {
      for (let block of message.content)
        if (
          typeof block === "object" &&
          block !== null &&
          "type" in block &&
          (block.type === "thinking" || block.type === "redacted_thinking")
        )
          return !0;
    }
  return !1;
}
/**
 * 计数请求前去掉 tool_use.caller 与 tool_result 里的 tool_reference 块。
 */
//@ chunk-e6aww6q8.js:978228-978657 layout = stripCallerFieldFromAssistantMessage (0.762)
function stripToolSearchFieldsForCount(message) {
  return message.map((n) => {
    if (!Array.isArray(n.content)) return n;
    let r = !1,
      mapped = n.content.map((block) => {
        if (block.type === "tool_use" && "caller" in block) {
          let { caller: caller, ...S } = block;
          return ((r = !0), S);
        }
        if (block.type === "tool_result" && Array.isArray(block.content)) {
          let filtered = block.content.filter((block) => !isToolReferenceBlock(block));
          if (filtered.length === block.content.length) return block;
          return (
            (r = !0),
            {
              ...block,
              content: filtered.length > 0 ? filtered : [{ type: "text", text: "[tool references]" }],
            }
          );
        }
        return block;
      });
    return r ? { ...n, content: mapped } : n;
  });
}
/**
 * 工具定义去掉 eager_input_streaming/defer_loading/strict/citations。
 */
//@ chunk-e6aww6q8.js:978657-978860 layout
function stripToolSchemaExtras(e) {
  if (e.length === 0) return e;
  return e.map((n) => {
    let {
      eager_input_streaming: eager_input_streaming,
      defer_loading: defer_loading,
      strict: strict,
      citations: citations,
      ...S
    } = n;
    if (
      eager_input_streaming === void 0 &&
      defer_loading === void 0 &&
      strict === void 0 &&
      citations === void 0
    )
      return n;
    return S;
  });
}
/**
 * 单段文本作为一条 user 消息调用 countTokens。
 */
//@ chunk-e6aww6q8.js:978860-978963 layout
async function countTextTokensWithAPI(e, n) {
  if (!e) return 0;
  return countMessagesTokensWithAPI([{ role: "user", content: e }], [], void 0, { credentials: n });
}
/**
 * countTokens API 计数（VCR 可录放）：Bedrock 走 CountTokensCommand；否则 anthropic.beta.messages.countTokens（只带允许的 beta，含 thinking 时带 thinking）；网关回 501 时用小模型采样回退。
 */
//@ chunk-e6aww6q8.js:978963-979897 fingerprint = countMessagesTokensWithAPI (0.688)
async function countMessagesTokensWithAPI(e, n, r, s) {
  if (isDiskless()) return null;
  e = stripToolSearchFieldsForCount(stripFallbackBlocks(e));
  let h = stripToolSchemaExtras(n);
  return withTokenCountVCR(e, h, async () => {
    try {
      let y = unlessManagedDeniedModel(r ?? getMainLoopModel()),
        betas = getModelBetas(y),
        containsThinking = hasThinkingBlocks(e);
      if (getProviderForModel(y) === "bedrock")
        return countTokensBedrock({
          model: toProviderWireModelId(y),
          configuredModel: y,
          messages: e,
          tools: h,
          betas: betas.filter((Se) => u9t.has(Se)),
          containsThinking: containsThinking,
        });
      let anthropic = await getAnthropicClient({
          maxRetries: 1,
          model: y,
          source: "count_tokens",
          toolNames: getToolNameList(h, e),
          agentContext: mainAgentContext(),
          credentials: s?.credentials,
        }),
        filtered = betas.filter((Se) => u9t.has(Se)),
        response = await anthropic.beta.messages.countTokens({
          model: toProviderWireModelId(y),
          ...deferredToolNameOf({
            messages: e.length > 0 ? e : [{ role: "user", content: "foo" }],
            tools: h,
          }),
          ...betasRequestParam(filtered),
          ...(containsThinking && { thinking: thinkingParamFor(y) }),
        });
      if (typeof response.input_tokens !== "number") return null;
      return response.input_tokens;
    } catch (error) {
      if (
        (logForDebugging(
          `countTokens API call failed: ${error instanceof Error ? error.message : String(error)}`,
          { level: "error" },
        ),
        XUt(error),
        getGatewayAuth() && error instanceof Ot && error.status === 501)
      )
        return countTokensViaHaikuFallback(e, n, s?.credentials).catch(
          (S) => (logForDebugging(`gateway sample count failed: ${String(S)}`, { level: "error" }), null),
        );
      return null;
    }
  });
}
/**
 * 用小模型发 max_tokens=1（有 thinking 时 2048）的真实请求，读 usage 的输入+缓存 token 作为计数。
 */
//@ chunk-e6aww6q8.js:979897-980616 fingerprint = countTokensViaHaikuFallback (0.803)
async function countTokensViaHaikuFallback(e, n, r) {
  e = stripFallbackBlocks(e);
  let containsThinking = stripToolSchemaExtras(n);
  return withTokenCountVCR(e, containsThinking, async () => {
    let h = hasThinkingBlocks(e),
      y = env.CLAUDE_CODE_USE_VERTEX && getVertexRegionForModel(getSmallFastModel()) === "global",
      S = h && (env.CLAUDE_CODE_USE_BEDROCK || env.CLAUDE_CODE_USE_VERTEX),
      w = y || S ? unlessManagedDeniedModel(getDefaultSonnetModel()) : getSmallFastModel(),
      anthropic = await getAnthropicClient({
        maxRetries: 1,
        model: w,
        source: "count_tokens",
        toolNames: getToolNameList(containsThinking, e),
        agentContext: mainAgentContext(),
        credentials: r,
      }),
      normalizedMessages = stripToolSearchFieldsForCount(e),
      q = normalizedMessages.length > 0 ? normalizedMessages : [{ role: "user", content: "count" }],
      filtered = getModelBetas(w).filter((Me) => u9t.has(Me)),
      usage = (
        await anthropic.beta.messages.create({
          model: toProviderWireModelId(w),
          max_tokens: h ? a1t : 1,
          ...deferredToolNameOf({
            messages: q,
            tools: containsThinking.length > 0 ? containsThinking : void 0,
          }),
          ...betasRequestParam(filtered),
          ...(h && { thinking: thinkingParamFor(w) }),
        })
      ).usage,
      inputTokens = usage.input_tokens;
    if (typeof inputTokens !== "number") return null;
    let Ae = usage.cache_creation_input_tokens || 0,
      Ie = usage.cache_read_input_tokens || 0;
    return inputTokens + Ae + Ie;
  });
}
//@ chunk-e6aww6q8.js:980616-980677 placement
function Lg(e, n) {
  let r = 0;
  for (let s of e) r += roughTokenCountEstimationForMessage(s, n);
  return r;
}
//@ chunk-e6aww6q8.js:980677-980986 placement
function roughTokenCountEstimationForMessage(e, n) {
  if ((e.type === "assistant" || e.type === "user" || e.type === "api_system") && e.message?.content)
    return roughTokenCountEstimationForContent(e.message?.content, n);
  if (e.type === "attachment" && e.attachment) {
    let userMessages = kGe({ uuid: e.uuid, attachment: e.attachment, rendered: e.rendered }),
      total = 0;
    for (let userMsg of userMessages)
      total += roughTokenCountEstimationForContent(userMsg.message.content, n);
    return total;
  }
  return 0;
}
/**
 * 用 Bedrock CountTokens 计数（失败返回 null）。
 */
//@ chunk-e6aww6q8.js:980986-981425 placement
async function countTokensBedrock({
  model: model,
  configuredModel: configuredModel,
  messages: messages,
  tools: tools,
  betas: betas,
  containsThinking: containsThinking,
}) {
  try {
    let S = await createBedrockRuntimeClient(),
      w = isFoundationModel(model) ? model : await getInferenceProfileBackingModel(model);
    if (!w) return null;
    let L = {
      messages: messages.length > 0 ? messages : [{ role: "user", content: "foo" }],
      max_tokens: containsThinking ? a1t : 1,
      ...(tools.length > 0 && { tools: tools }),
      ...(betaHeaderValues(betas).length > 0 && { anthropic_beta: betaHeaderValues(betas) }),
      ...(containsThinking && {
        thinking: thinkingParamFor(configuredModel, Oos(configuredModel) ? w : configuredModel),
      }),
    };
    return await countTokensWithBedrock(S, w, L);
  } catch (error) {
    return (logForDebugging(`Bedrock CountTokens failed: ${error}`, { level: "error" }), null);
  }
}
/**
 * 长度 / bytesPerToken（默认 4）四舍五入。
 */
//@ chunk-g54kbxqw.js:92203-92245 affinity
function tokensFromLength(e, n = 4) {
  return Math.round(e / n);
}
/**
 * 字符串长度按 4 字节/token（或指定）粗估。
 */
//@ chunk-g54kbxqw.js:92245-92316 callgraph-witnessed = roughTokenCountEstimation (0)
function roughTokenCountEstimation(content, bytesPerToken) {
  if (typeof content !== "string") return 0;
  return tokensFromLength(content.length, bytesPerToken);
}
/**
 * 带缓存的对象 JSON 长度（tool_use 输入估算用）。
 */
//@ chunk-g54kbxqw.js:92316-92499 layout
function getCachedJsonLength(e, n) {
  if (n === void 0 || typeof e !== "object" || e === null) return;
  let s = n.get(e);
  if (s !== void 0) return s;
  let r = jsonStringify(e);
  if (typeof r !== "string") return;
  return (n.set(e, r.length), r.length);
}
/**
 * json/jsonl/jsonc 按 2 字节/token，其余 4。
 */
//@ chunk-g54kbxqw.js:92499-92586 fingerprint = bytesPerTokenForFileType (1)
function bytesPerTokenForFileType(fileExtension) {
  switch (fileExtension) {
    case "json":
    case "jsonl":
    case "jsonc":
      return 2;
    default:
      return 4;
  }
}
/**
 * 按文件扩展名选择字节系数后粗估 token。
 */
//@ chunk-g54kbxqw.js:92586-92623 layout
function roughTokenCountEstimationForFileType(e, n) {
  return roughTokenCountEstimation(e, bytesPerTokenForFileType(n));
}
/**
 * 对象 JSON 序列化后粗估 token（附件计数用）。
 */
//@ chunk-g54kbxqw.js:92623-92655 layout
function roughTokenCountEstimationForObject(e) {
  return roughTokenCountEstimation(jsonStringify(e));
}
/**
 * 字符串或内容块数组的粗估之和。
 */
//@ chunk-g54kbxqw.js:92655-92803 file-local
function roughTokenCountEstimationForContent(e, n, s) {
  if (!e) return 0;
  if (typeof e === "string") return roughTokenCountEstimation(e, n);
  if (!Array.isArray(e)) return 0;
  let totalTokens = 0;
  for (let block of e) totalTokens += roughTokenCountEstimationForBlock(block, n, s);
  return totalTokens;
}
/**
 * 单个内容块粗估：text/thinking/redacted 按长度，文本文档按扩展名系数，image/document 固定 2000，tool_use 名+输入 JSON 长度，tool_result 递归。
 */
//@ chunk-g54kbxqw.js:92803-93689 fingerprint = roughTokenCountEstimationForBlock (0.814)
function roughTokenCountEstimationForBlock(e, n, s) {
  if (typeof e === "string") return roughTokenCountEstimation(e, n);
  if (!bl(e)) return 0;
  if (e.type === "text") return roughTokenCountEstimation(e.text, n);
  if (e.type === "document" && "source" in e && typeof e.source === "object" && e.source !== null) {
    let source = e.source;
    if (source.type === "text") {
      let h = e.title?.split(".").pop()?.toLowerCase() ?? "",
        y = bytesPerTokenForFileType(h);
      return roughTokenCountEstimation(source.data, n === void 0 ? y : Math.min(n, y));
    }
    if (source.type === "content") {
      if (typeof source.content === "string") return roughTokenCountEstimation(source.content, n);
      if (Array.isArray(source.content))
        return roughTokenCountEstimationForContent(
          source.content.filter((h) => typeof h === "object" && h !== null),
          n,
        );
    }
  }
  if (e.type === "image" || e.type === "document") return 2000;
  if (e.type === "tool_result") return roughTokenCountEstimationForContent(e.content, n, s);
  if (e.type === "tool_use") {
    let r = typeof e.name === "string" ? getCachedJsonLength(e.input, s) : void 0;
    if (r !== void 0) return tokensFromLength(e.name.length + r, n);
    return roughTokenCountEstimation(e.name + jsonStringify(e.input ?? {}), n);
  }
  if (e.type === "thinking") return roughTokenCountEstimation(e.thinking, n);
  if (e.type === "redacted_thinking") return roughTokenCountEstimation(e.data, n);
  return roughTokenCountEstimation(jsonStringify(e), n);
}
/**
 * Bedrock CountTokensCommand（invokeModel body，anthropic_version bedrock-2023-05-31）计数。
 */
//@ chunk-aepeg2w5.js:133402-133642 fingerprint = countTokensWithBedrock (0.523)
async function countTokensWithBedrock(e, n, r, s) {
  let { CountTokensCommand: CountTokensCommand } = await import("./chunk-nbmkwhd6.js");
  return (
    (
      await e.send(
        new CountTokensCommand({
          modelId: n,
          input: {
            invokeModel: {
              body: Buffer.from(jsonStringify({ anthropic_version: "bedrock-2023-05-31", ...r })),
            },
          },
        }),
        s,
      )
    ).inputTokens ?? null
  );
}

export {
  roughTokenCountEstimation,
  countTokensWithBedrock,
  roughTokenCountEstimationForContent,
  Lg,
  roughTokenCountEstimationForFileType,
  countTextTokensWithAPI,
  roughTokenCountEstimationForBlock,
  roughTokenCountEstimationForObject,
  getCachedJsonLength,
  countMessagesTokensWithAPI,
};

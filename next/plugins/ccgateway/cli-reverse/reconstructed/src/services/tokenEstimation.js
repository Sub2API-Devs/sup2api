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
import { jsonStringify } from "../utils/slowOperations.js";
import { isObjectBlock } from "../utils/toolResultStorage.js";
import { modelSupportsAdaptiveThinking } from "../utils/thinking.js";
import { getThinkingTypeOverride, isDiskless, getGatewayAuth } from "../bootstrap/state.js";
import { getCanonicalName } from "../utils/model/canonicalModelName.js";
import { isToolReferenceBlock } from "../utils/toolSearch.js";
import { stripFallbackBlocks, applyScreenedAnswers } from "../utils/messages.js";
import { withTokenCountVCR } from "./vcr.js";
import { unlessManagedDeniedModel, getSmallFastModel } from "../utils/model/smallFastModel.js";
import { getMainLoopModel, toProviderWireModelId, getDefaultSonnetModel } from "../utils/model/model.js";
import {
  getModelBetas,
  FIRST_PARTY_ONLY_BETAS,
  betasRequestParam,
  betaHeaderValues,
} from "../utils/betas.js";
import { getProviderForModel } from "../utils/model/providers.js";
import { getAnthropicClient, getToolNameList } from "./api/client.js";
import { mainAgentContext } from "../utils/agentContext.js";
import { deferredToolNameOf } from "./api/deferredToolsState.js";
import { logForDebugging } from "../utils/debug.js";
import { recoverRegimeRefusalIfNeeded } from "./api/regimeRefusal.js";
import { APIError } from "../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { env } from "../utils/env.js";
import { getVertexRegionForModel } from "../utils/envUtils.js";
import {
  createBedrockRuntimeClient,
  isFoundationModel,
  getInferenceProfileBackingModel,
  isInferenceProfileArn,
} from "../utils/model/bedrock.js";

//@ chunk-aepeg2w5.js:133402-133642 fingerprint (2.1.88 match: countTokensWithBedrock, 0.523)
/**
 * Bedrock CountTokensCommand（invokeModel body，anthropic_version bedrock-2023-05-31）计数。
 */
async function countTokensWithBedrock(client, modelId, body, abortSignal) {
  let { CountTokensCommand } = await import("../../vendor/@aws-sdk/client-bedrock-runtime/dist-cjs/index.js");
  return (
    (
      await client.send(
        new CountTokensCommand({
          modelId,
          input: {
            invokeModel: {
              body: Buffer.from(
                jsonStringify({
                  anthropic_version: "bedrock-2023-05-31",
                  ...body,
                }),
              ),
            },
          },
        }),
        abortSignal,
      )
    ).inputTokens ?? null
  );
}
//@ chunk-g54kbxqw.js:92203-92245 affinity
/**
 * 长度 / bytesPerToken（默认 4）四舍五入。
 */
function tokensFromLength(length, bytesPerToken = 4) {
  return Math.round(length / bytesPerToken);
}
//@ chunk-g54kbxqw.js:92245-92316 callgraph-witnessed (2.1.88 match: roughTokenCountEstimation, 0)
/**
 * 字符串长度按 4 字节/token（或指定）粗估。
 */
function roughTokenCountEstimation(content, bytesPerToken) {
  if (typeof content !== "string") return 0;
  return tokensFromLength(content.length, bytesPerToken);
}
//@ chunk-g54kbxqw.js:92316-92499 layout
/**
 * 带缓存的对象 JSON 长度（tool_use 输入估算用）。
 */
function getCachedJsonLength(value, cache) {
  if (cache === undefined || typeof value !== "object" || value === null) return;
  let cached = cache.get(value);
  if (cached !== undefined) return cached;
  let json = jsonStringify(value);
  if (typeof json !== "string") return;
  cache.set(value, json.length);
  return json.length;
}
//@ chunk-g54kbxqw.js:92499-92586 fingerprint (2.1.88 match: bytesPerTokenForFileType, 1)
/**
 * json/jsonl/jsonc 按 2 字节/token，其余 4。
 */
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
//@ chunk-g54kbxqw.js:92586-92623 layout
/**
 * 按文件扩展名选择字节系数后粗估 token。
 */
function roughTokenCountEstimationForFileType(content, fileExtension) {
  return roughTokenCountEstimation(content, bytesPerTokenForFileType(fileExtension));
}
//@ chunk-g54kbxqw.js:92623-92655 layout
/**
 * 对象 JSON 序列化后粗估 token（附件计数用）。
 */
function roughTokenCountEstimationForObject(attachment) {
  return roughTokenCountEstimation(jsonStringify(attachment));
}
//@ chunk-g54kbxqw.js:92655-92803 file-local
/**
 * 字符串或内容块数组的粗估之和。
 */
function roughTokenCountEstimationForContent(content, bytesPerToken, jsonLengthCache) {
  if (!content) return 0;
  if (typeof content === "string") return roughTokenCountEstimation(content, bytesPerToken);
  if (!Array.isArray(content)) return 0;
  let totalTokens = 0;
  for (let block of content)
    totalTokens += roughTokenCountEstimationForBlock(block, bytesPerToken, jsonLengthCache);
  return totalTokens;
}
//@ chunk-g54kbxqw.js:92803-93689 fingerprint (2.1.88 match: roughTokenCountEstimationForBlock, 0.814)
/**
 * 单个内容块粗估：text/thinking/redacted 按长度，文本文档按扩展名系数，image/document 固定 2000，tool_use 名+输入 JSON 长度，tool_result 递归。
 */
function roughTokenCountEstimationForBlock(block, bytesPerToken, jsonLengthCache) {
  if (typeof block === "string") return roughTokenCountEstimation(block, bytesPerToken);
  if (!isObjectBlock(block)) return 0;
  if (block.type === "text") return roughTokenCountEstimation(block.text, bytesPerToken);
  if (
    block.type === "document" &&
    "source" in block &&
    typeof block.source === "object" &&
    block.source !== null
  ) {
    let source = block.source;
    if (source.type === "text") {
      let fileExtension = block.title?.split(".").pop()?.toLowerCase() ?? "";
      let byFileType = bytesPerTokenForFileType(fileExtension);
      return roughTokenCountEstimation(
        source.data,
        bytesPerToken === undefined ? byFileType : Math.min(bytesPerToken, byFileType),
      );
    }
    if (source.type === "content") {
      if (typeof source.content === "string") return roughTokenCountEstimation(source.content, bytesPerToken);
      if (Array.isArray(source.content))
        return roughTokenCountEstimationForContent(
          source.content.filter((block) => typeof block === "object" && block !== null),
          bytesPerToken,
        );
    }
  }
  if (block.type === "image" || block.type === "document") return 2000;
  if (block.type === "tool_result")
    return roughTokenCountEstimationForContent(block.content, bytesPerToken, jsonLengthCache);
  if (block.type === "tool_use") {
    let inputLength =
      typeof block.name === "string" ? getCachedJsonLength(block.input, jsonLengthCache) : undefined;
    if (inputLength !== undefined) return tokensFromLength(block.name.length + inputLength, bytesPerToken);
    return roughTokenCountEstimation(block.name + jsonStringify(block.input ?? {}), bytesPerToken);
  }
  if (block.type === "thinking") return roughTokenCountEstimation(block.thinking, bytesPerToken);
  if (block.type === "redacted_thinking") return roughTokenCountEstimation(block.data, bytesPerToken);
  return roughTokenCountEstimation(jsonStringify(block), bytesPerToken);
}
//@ chunk-e6aww6q8.js:977825-977847 placement
var DEFAULT_THINKING_BUDGET = 1024;
var TOKEN_COUNT_MAX_TOKENS = 2048;
//@ chunk-e6aww6q8.js:977847-978007 placement
function thinkingParamFor(runtimeModel, resolvedModel = runtimeModel) {
  return modelSupportsAdaptiveThinking({
    runtimeOverride: getThinkingTypeOverride(runtimeModel),
    resolvedModel,
    canonicalModel: getCanonicalName(resolvedModel),
  }) === "adaptive"
    ? {
        type: "adaptive",
      }
    : {
        type: "enabled",
        budget_tokens: DEFAULT_THINKING_BUDGET,
      };
}
//@ chunk-e6aww6q8.js:978007-978228 fingerprint (2.1.88 match: hasThinkingBlocks, 1)
/**
 * API 消息中是否有 thinking/redacted_thinking 块（计数请求需带 thinking 参数）。
 */
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
          return true;
    }
  return false;
}
//@ chunk-e6aww6q8.js:978228-978657 layout (2.1.88 match: stripCallerFieldFromAssistantMessage, 0.762)
/**
 * 计数请求前去掉 tool_use.caller 与 tool_result 里的 tool_reference 块。
 */
function stripToolSearchFieldsForCount(message) {
  return message.map((message) => {
    if (!Array.isArray(message.content)) return message;
    let didStrip = false;
    let content = message.content.map((block) => {
      if (block.type === "tool_use" && "caller" in block) {
        let { caller, ...rest } = block;
        didStrip = true;
        return rest;
      }
      if (block.type === "tool_result" && Array.isArray(block.content)) {
        let filtered = block.content.filter((block) => !isToolReferenceBlock(block));
        if (filtered.length === block.content.length) return block;
        didStrip = true;
        return {
          ...block,
          content:
            filtered.length > 0
              ? filtered
              : [
                  {
                    type: "text",
                    text: "[tool references]",
                  },
                ],
        };
      }
      return block;
    });
    return didStrip
      ? {
          ...message,
          content,
        }
      : message;
  });
}
//@ chunk-e6aww6q8.js:978657-978860 layout
/**
 * 工具定义去掉 eager_input_streaming/defer_loading/strict/citations。
 */
function stripToolSchemaExtras(tools) {
  if (tools.length === 0) return tools;
  return tools.map((tool) => {
    let {
      eager_input_streaming: eagerInputStreaming,
      defer_loading: deferLoading,
      strict,
      citations,
      ...rest
    } = tool;
    if (
      eagerInputStreaming === undefined &&
      deferLoading === undefined &&
      strict === undefined &&
      citations === undefined
    )
      return tool;
    return rest;
  });
}
//@ chunk-e6aww6q8.js:978860-978963 layout
/**
 * 单段文本作为一条 user 消息调用 countTokens。
 */
async function countTextTokensWithAPI(content, credentials) {
  if (!content) return 0;
  return countMessagesTokensWithAPI(
    [
      {
        role: "user",
        content,
      },
    ],
    [],
    undefined,
    {
      credentials,
    },
  );
}
//@ chunk-e6aww6q8.js:978963-979897 fingerprint (2.1.88 match: countMessagesTokensWithAPI, 0.688)
/**
 * countTokens API 计数（VCR 可录放）：Bedrock 走 CountTokensCommand；否则 anthropic.beta.messages.countTokens（只带允许的 beta，含 thinking 时带 thinking）；网关回 501 时用小模型采样回退。
 */
async function countMessagesTokensWithAPI(messages, tools, requestedModel, options) {
  if (isDiskless()) return null;
  messages = stripToolSearchFieldsForCount(stripFallbackBlocks(messages));
  let tools_2 = stripToolSchemaExtras(tools);
  return withTokenCountVCR(messages, tools_2, async () => {
    try {
      let model = unlessManagedDeniedModel(requestedModel ?? getMainLoopModel());
      let betas = getModelBetas(model);
      let containsThinking = hasThinkingBlocks(messages);
      if (getProviderForModel(model) === "bedrock")
        return countTokensBedrock({
          model: toProviderWireModelId(model),
          configuredModel: model,
          messages,
          tools: tools_2,
          betas: betas.filter((beta) => FIRST_PARTY_ONLY_BETAS.has(beta)),
          containsThinking,
        });
      let anthropic = await getAnthropicClient({
        maxRetries: 1,
        model,
        source: "count_tokens",
        toolNames: getToolNameList(tools_2, messages),
        agentContext: mainAgentContext(),
        credentials: options?.credentials,
      });
      let filtered = betas.filter((beta) => FIRST_PARTY_ONLY_BETAS.has(beta));
      let response = await anthropic.beta.messages.countTokens({
        model: toProviderWireModelId(model),
        ...deferredToolNameOf({
          messages:
            messages.length > 0
              ? messages
              : [
                  {
                    role: "user",
                    content: "foo",
                  },
                ],
          tools: tools_2,
        }),
        ...betasRequestParam(filtered),
        ...(containsThinking && {
          thinking: thinkingParamFor(model),
        }),
      });
      if (typeof response.input_tokens !== "number") return null;
      return response.input_tokens;
    } catch (error) {
      logForDebugging(
        `countTokens API call failed: ${error instanceof Error ? error.message : String(error)}`,
        {
          level: "error",
        },
      );
      recoverRegimeRefusalIfNeeded(error);
      if (getGatewayAuth() && error instanceof APIError && error.status === 501)
        return countTokensViaHaikuFallback(messages, tools, options?.credentials).catch((error) => {
          logForDebugging(`gateway sample count failed: ${String(error)}`, {
            level: "error",
          });
          return null;
        });
      return null;
    }
  });
}
//@ chunk-e6aww6q8.js:979897-980616 fingerprint (2.1.88 match: countTokensViaHaikuFallback, 0.803)
/**
 * 用小模型发 max_tokens=1（有 thinking 时 2048）的真实请求，读 usage 的输入+缓存 token 作为计数。
 */
async function countTokensViaHaikuFallback(messages, tools, credentials) {
  messages = stripFallbackBlocks(messages);
  let containsThinking = stripToolSchemaExtras(tools);
  return withTokenCountVCR(messages, containsThinking, async () => {
    let containsThinking_2 = hasThinkingBlocks(messages);
    let isVertexGlobalEndpoint =
      env.CLAUDE_CODE_USE_VERTEX && getVertexRegionForModel(getSmallFastModel()) === "global";
    let isBedrockWithThinking =
      containsThinking_2 && (env.CLAUDE_CODE_USE_BEDROCK || env.CLAUDE_CODE_USE_VERTEX);
    let model =
      isVertexGlobalEndpoint || isBedrockWithThinking
        ? unlessManagedDeniedModel(getDefaultSonnetModel())
        : getSmallFastModel();
    let anthropic = await getAnthropicClient({
      maxRetries: 1,
      model,
      source: "count_tokens",
      toolNames: getToolNameList(containsThinking, messages),
      agentContext: mainAgentContext(),
      credentials,
    });
    let normalizedMessages = stripToolSearchFieldsForCount(messages);
    let messagesToSend =
      normalizedMessages.length > 0
        ? normalizedMessages
        : [
            {
              role: "user",
              content: "count",
            },
          ];
    let filtered = getModelBetas(model).filter((beta) => FIRST_PARTY_ONLY_BETAS.has(beta));
    let usage = (
      await anthropic.beta.messages.create({
        model: toProviderWireModelId(model),
        max_tokens: containsThinking_2 ? TOKEN_COUNT_MAX_TOKENS : 1,
        ...deferredToolNameOf({
          messages: messagesToSend,
          tools: containsThinking.length > 0 ? containsThinking : undefined,
        }),
        ...betasRequestParam(filtered),
        ...(containsThinking_2 && {
          thinking: thinkingParamFor(model),
        }),
      })
    ).usage;
    let inputTokens = usage.input_tokens;
    if (typeof inputTokens !== "number") return null;
    let cacheCreationTokens = usage.cache_creation_input_tokens || 0;
    let cacheReadTokens = usage.cache_read_input_tokens || 0;
    return inputTokens + cacheCreationTokens + cacheReadTokens;
  });
}
//@ chunk-e6aww6q8.js:980616-980677 placement
/**
 * 逐条消息做粗粒度 token 估算并求和。
 */
function roughTokenCountEstimationForMessages(messages, bytesPerToken) {
  let total = 0;
  for (let message of messages) total += roughTokenCountEstimationForMessage(message, bytesPerToken);
  return total;
}
//@ chunk-e6aww6q8.js:980677-980986 placement
function roughTokenCountEstimationForMessage(message, bytesPerToken) {
  if (
    (message.type === "assistant" || message.type === "user" || message.type === "api_system") &&
    message.message?.content
  )
    return roughTokenCountEstimationForContent(message.message?.content, bytesPerToken);
  if (message.type === "attachment" && message.attachment) {
    let userMessages = applyScreenedAnswers({
      uuid: message.uuid,
      attachment: message.attachment,
      rendered: message.rendered,
    });
    let total = 0;
    for (let userMsg of userMessages)
      total += roughTokenCountEstimationForContent(userMsg.message.content, bytesPerToken);
    return total;
  }
  return 0;
}
//@ chunk-e6aww6q8.js:980986-981425 placement
/**
 * 用 Bedrock CountTokens 计数（失败返回 null）。
 */
async function countTokensBedrock({ model, configuredModel, messages, tools, betas, containsThinking }) {
  try {
    let client = await createBedrockRuntimeClient();
    let modelId = isFoundationModel(model) ? model : await getInferenceProfileBackingModel(model);
    if (!modelId) return null;
    let body = {
      messages:
        messages.length > 0
          ? messages
          : [
              {
                role: "user",
                content: "foo",
              },
            ],
      max_tokens: containsThinking ? TOKEN_COUNT_MAX_TOKENS : 1,
      ...(tools.length > 0 && {
        tools,
      }),
      ...(betaHeaderValues(betas).length > 0 && {
        anthropic_beta: betaHeaderValues(betas),
      }),
      ...(containsThinking && {
        thinking: thinkingParamFor(
          configuredModel,
          isInferenceProfileArn(configuredModel) ? modelId : configuredModel,
        ),
      }),
    };
    return await countTokensWithBedrock(client, modelId, body);
  } catch (error) {
    logForDebugging(`Bedrock CountTokens failed: ${error}`, {
      level: "error",
    });
    return null;
  }
}
export {
  roughTokenCountEstimation,
  countTokensWithBedrock,
  roughTokenCountEstimationForContent,
  roughTokenCountEstimationForMessages,
  roughTokenCountEstimationForFileType,
  countTextTokensWithAPI,
  roughTokenCountEstimationForBlock,
  roughTokenCountEstimationForObject,
  getCachedJsonLength,
  countMessagesTokensWithAPI,
};

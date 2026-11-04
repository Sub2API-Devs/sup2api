/**
 * @anthropic-ai/sdk/lib/internal/tracing/response.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: esm-fingerprint 3
 */

//@ chunk-e6aww6q8.js:2799795-2801148 esm-fingerprint
/**
 * 用流里 message_delta 的 usage 更新累计 usage：正数才覆盖输入/缓存字段，其余字段非空才覆盖。
 */
function mergeUsageFromDelta(usage, partUsage) {
  if (!partUsage)
    return {
      ...usage,
    };
  let cacheCreation = partUsage.cache_creation;
  let cacheCreationTokens =
    (cacheCreation?.ephemeral_1h_input_tokens ?? 0) + (cacheCreation?.ephemeral_5m_input_tokens ?? 0);
  let cacheCreation_2 =
    cacheCreationTokens > 0
      ? {
          ephemeral_1h_input_tokens:
            cacheCreation?.ephemeral_1h_input_tokens ?? usage.cache_creation.ephemeral_1h_input_tokens,
          ephemeral_5m_input_tokens:
            cacheCreation?.ephemeral_5m_input_tokens ?? usage.cache_creation.ephemeral_5m_input_tokens,
        }
      : {
          ...usage.cache_creation,
        };
  return {
    input_tokens:
      partUsage.input_tokens !== null && partUsage.input_tokens > 0
        ? partUsage.input_tokens
        : usage.input_tokens,
    cache_creation_input_tokens:
      partUsage.cache_creation_input_tokens !== null && partUsage.cache_creation_input_tokens > 0
        ? partUsage.cache_creation_input_tokens
        : cacheCreationTokens > 0
          ? cacheCreationTokens
          : usage.cache_creation_input_tokens,
    cache_read_input_tokens:
      partUsage.cache_read_input_tokens !== null && partUsage.cache_read_input_tokens > 0
        ? partUsage.cache_read_input_tokens
        : usage.cache_read_input_tokens,
    output_tokens: partUsage.output_tokens ?? usage.output_tokens,
    output_tokens_details: {
      thinking_tokens:
        partUsage.output_tokens_details?.thinking_tokens ?? usage.output_tokens_details.thinking_tokens,
    },
    server_tool_use: {
      web_search_requests:
        partUsage.server_tool_use?.web_search_requests ?? usage.server_tool_use.web_search_requests,
      web_fetch_requests:
        partUsage.server_tool_use?.web_fetch_requests ?? usage.server_tool_use.web_fetch_requests,
    },
    service_tier: partUsage.service_tier ?? usage.service_tier,
    cache_creation: cacheCreation_2,
    inference_geo: partUsage.inference_geo ?? usage.inference_geo,
    iterations: partUsage.iterations ?? usage.iterations,
    speed: partUsage.speed ?? usage.speed,
    fallback_credit: partUsage.fallback_credit ?? usage.fallback_credit,
  };
}
//@ chunk-e6aww6q8.js:2801148-2801862 esm-fingerprint
/**
 * 累加跨请求的 usage（output 细分、缓存 1h/5m 细分、fallback_credit）。
 */
function addResponseUsageAttributes(usage, usage_2) {
  if (!usage_2)
    return {
      ...usage,
    };
  let cacheCreation = usage_2.cache_creation;
  return {
    ...usage,
    output_tokens_details: {
      thinking_tokens:
        usage_2.output_tokens_details?.thinking_tokens ?? usage.output_tokens_details.thinking_tokens,
    },
    input_tokens: usage_2.input_tokens ?? usage.input_tokens,
    output_tokens: usage_2.output_tokens ?? usage.output_tokens,
    fallback_credit: usage_2.fallback_credit ?? usage.fallback_credit,
    cache_read_input_tokens: usage_2.cache_read_input_tokens ?? usage.cache_read_input_tokens,
    cache_creation_input_tokens:
      usage_2.cache_creation_input_tokens ??
      (cacheCreation
        ? (cacheCreation.ephemeral_1h_input_tokens ?? 0) + (cacheCreation.ephemeral_5m_input_tokens ?? 0)
        : usage.cache_creation_input_tokens),
    ...(cacheCreation && {
      cache_creation: {
        ephemeral_1h_input_tokens: cacheCreation.ephemeral_1h_input_tokens ?? 0,
        ephemeral_5m_input_tokens: cacheCreation.ephemeral_5m_input_tokens ?? 0,
      },
    }),
  };
}
//@ chunk-e6aww6q8.js:2801862-2802858 esm-fingerprint
/**
 * 两个 usage 逐字段相加（含缓存细分、server_tool_use）。
 */
function addUsage_2(totalUsage, messageUsage) {
  return {
    input_tokens: totalUsage.input_tokens + messageUsage.input_tokens,
    cache_creation_input_tokens:
      totalUsage.cache_creation_input_tokens + messageUsage.cache_creation_input_tokens,
    cache_read_input_tokens: totalUsage.cache_read_input_tokens + messageUsage.cache_read_input_tokens,
    output_tokens: totalUsage.output_tokens + messageUsage.output_tokens,
    output_tokens_details: {
      thinking_tokens:
        totalUsage.output_tokens_details.thinking_tokens + messageUsage.output_tokens_details.thinking_tokens,
    },
    server_tool_use: {
      web_search_requests:
        totalUsage.server_tool_use.web_search_requests + messageUsage.server_tool_use.web_search_requests,
      web_fetch_requests:
        totalUsage.server_tool_use.web_fetch_requests + messageUsage.server_tool_use.web_fetch_requests,
    },
    service_tier: messageUsage.service_tier,
    cache_creation: {
      ephemeral_1h_input_tokens:
        totalUsage.cache_creation.ephemeral_1h_input_tokens +
        messageUsage.cache_creation.ephemeral_1h_input_tokens,
      ephemeral_5m_input_tokens:
        totalUsage.cache_creation.ephemeral_5m_input_tokens +
        messageUsage.cache_creation.ephemeral_5m_input_tokens,
    },
    inference_geo: messageUsage.inference_geo,
    iterations: messageUsage.iterations,
    speed: messageUsage.speed,
    fallback_credit: messageUsage.fallback_credit ?? totalUsage.fallback_credit,
  };
}
export { mergeUsageFromDelta, addUsage_2, addResponseUsageAttributes };

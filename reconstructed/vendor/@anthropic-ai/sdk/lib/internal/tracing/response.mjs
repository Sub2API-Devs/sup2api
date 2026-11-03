/**
 * @anthropic-ai/sdk/lib/internal/tracing/response.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: esm-fingerprint 3
 */

/**
 * 用流里 message_delta 的 usage 更新累计 usage：正数才覆盖输入/缓存字段，其余字段非空才覆盖。
 */
//@ chunk-e6aww6q8.js:2799795-2801148 esm-fingerprint
function mRe(e, n) {
  if (!n) return { ...e };
  let cache_creation = n.cache_creation,
    s = (cache_creation?.ephemeral_1h_input_tokens ?? 0) + (cache_creation?.ephemeral_5m_input_tokens ?? 0),
    h =
      s > 0
        ? {
            ephemeral_1h_input_tokens:
              cache_creation?.ephemeral_1h_input_tokens ?? e.cache_creation.ephemeral_1h_input_tokens,
            ephemeral_5m_input_tokens:
              cache_creation?.ephemeral_5m_input_tokens ?? e.cache_creation.ephemeral_5m_input_tokens,
          }
        : { ...e.cache_creation };
  return {
    input_tokens: n.input_tokens !== null && n.input_tokens > 0 ? n.input_tokens : e.input_tokens,
    cache_creation_input_tokens:
      n.cache_creation_input_tokens !== null && n.cache_creation_input_tokens > 0
        ? n.cache_creation_input_tokens
        : s > 0
          ? s
          : e.cache_creation_input_tokens,
    cache_read_input_tokens:
      n.cache_read_input_tokens !== null && n.cache_read_input_tokens > 0
        ? n.cache_read_input_tokens
        : e.cache_read_input_tokens,
    output_tokens: n.output_tokens ?? e.output_tokens,
    output_tokens_details: {
      thinking_tokens: n.output_tokens_details?.thinking_tokens ?? e.output_tokens_details.thinking_tokens,
    },
    server_tool_use: {
      web_search_requests: n.server_tool_use?.web_search_requests ?? e.server_tool_use.web_search_requests,
      web_fetch_requests: n.server_tool_use?.web_fetch_requests ?? e.server_tool_use.web_fetch_requests,
    },
    service_tier: n.service_tier ?? e.service_tier,
    cache_creation: h,
    inference_geo: n.inference_geo ?? e.inference_geo,
    iterations: n.iterations ?? e.iterations,
    speed: n.speed ?? e.speed,
    fallback_credit: n.fallback_credit ?? e.fallback_credit,
  };
}
/**
 * 累加跨请求的 usage（output 细分、缓存 1h/5m 细分、fallback_credit）。
 */
//@ chunk-e6aww6q8.js:2801148-2801862 esm-fingerprint
function $jo(e, n) {
  if (!n) return { ...e };
  let cache_creation = n.cache_creation;
  return {
    ...e,
    output_tokens_details: {
      thinking_tokens: n.output_tokens_details?.thinking_tokens ?? e.output_tokens_details.thinking_tokens,
    },
    input_tokens: n.input_tokens ?? e.input_tokens,
    output_tokens: n.output_tokens ?? e.output_tokens,
    fallback_credit: n.fallback_credit ?? e.fallback_credit,
    cache_read_input_tokens: n.cache_read_input_tokens ?? e.cache_read_input_tokens,
    cache_creation_input_tokens:
      n.cache_creation_input_tokens ??
      (cache_creation
        ? (cache_creation.ephemeral_1h_input_tokens ?? 0) + (cache_creation.ephemeral_5m_input_tokens ?? 0)
        : e.cache_creation_input_tokens),
    ...(cache_creation && {
      cache_creation: {
        ephemeral_1h_input_tokens: cache_creation.ephemeral_1h_input_tokens ?? 0,
        ephemeral_5m_input_tokens: cache_creation.ephemeral_5m_input_tokens ?? 0,
      },
    }),
  };
}
/**
 * 两个 usage 逐字段相加（含缓存细分、server_tool_use）。
 */
//@ chunk-e6aww6q8.js:2801862-2802858 esm-fingerprint
function addUsage_2(e, n) {
  return {
    input_tokens: e.input_tokens + n.input_tokens,
    cache_creation_input_tokens: e.cache_creation_input_tokens + n.cache_creation_input_tokens,
    cache_read_input_tokens: e.cache_read_input_tokens + n.cache_read_input_tokens,
    output_tokens: e.output_tokens + n.output_tokens,
    output_tokens_details: {
      thinking_tokens: e.output_tokens_details.thinking_tokens + n.output_tokens_details.thinking_tokens,
    },
    server_tool_use: {
      web_search_requests: e.server_tool_use.web_search_requests + n.server_tool_use.web_search_requests,
      web_fetch_requests: e.server_tool_use.web_fetch_requests + n.server_tool_use.web_fetch_requests,
    },
    service_tier: n.service_tier,
    cache_creation: {
      ephemeral_1h_input_tokens:
        e.cache_creation.ephemeral_1h_input_tokens + n.cache_creation.ephemeral_1h_input_tokens,
      ephemeral_5m_input_tokens:
        e.cache_creation.ephemeral_5m_input_tokens + n.cache_creation.ephemeral_5m_input_tokens,
    },
    inference_geo: n.inference_geo,
    iterations: n.iterations,
    speed: n.speed,
    fallback_credit: n.fallback_credit ?? e.fallback_credit,
  };
}

export { mRe, addUsage_2, $jo };

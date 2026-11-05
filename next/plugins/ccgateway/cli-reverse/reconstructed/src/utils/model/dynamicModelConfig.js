/**
 * utils/model/dynamicModelConfig.ts
 *
 * 2.1.316 新增：动态模型配置
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { toProviderWireModelId } from "./model.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import { getProviderState } from "./providerCaches.js";
import { withTimeout as withTimeout_2 } from "../sleep.js";
import { getAnthropicClient } from "../../services/api/client.js";
import { mainAgentContext } from "../agentContext.js";
import { isClaudeAISubscriber } from "../auth.js";
import { OAUTH_BETA_HEADER } from "../../constants/oauth.js";
import { logForDebugging } from "../debug.js";
import {
  APIConnectionTimeoutError,
  APIUserAbortError,
  APIError,
} from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:2545560-2545640 placement
var DYNAMIC_CONFIG_TIMEOUT_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var TIMEOUT_MESSAGE;
var IN_FLIGHT_MARKER;
deferInit("chunk-5xgkngpb.js:2545560", () => {
  DYNAMIC_CONFIG_TIMEOUT_MS = 5000;
  TIMEOUT_MESSAGE = "dynamic model config fetch timed out";
  IN_FLIGHT_MARKER = Symbol("in-flight");
});
//@ chunk-5xgkngpb.js:2545640-2545664 placement
/**
 * 判断动态模型配置是否启用（此构建恒为 false）。
 */
function isDynamicModelConfigEnabled() {
  return false;
}
//@ chunk-5xgkngpb.js:2545664-2545745 placement
/**
 * 拉取动态模型配置（未启用时返回 null）。
 */
function fetchDynamicModelConfig(resolvedInitialModel, signal, options) {
  if (!isDynamicModelConfigEnabled()) return Promise.resolve(null);
  return getOrFetchModelConfig(toProviderWireModelId(resolvedInitialModel), signal, options);
}
//@ chunk-5xgkngpb.js:2545745-2545976 placement
/**
 * 在请求前等待动态模型配置获取完成，若需等待则记录等待时长。
 */
async function awaitModelConfigFetch(model, credentials, storageV5) {
  if (!isDynamicModelConfigEnabled()) return;
  let fetchPromise = getOrFetchModelConfig(toProviderWireModelId(model), credentials, storageV5);
  let startTime = performance.now();
  if ((await Promise.race([fetchPromise, Promise.resolve(IN_FLIGHT_MARKER)])) === IN_FLIGHT_MARKER) {
    await fetchPromise;
    logFeatureSad("model_config_fetch", "request_waited", {
      waited_ms: Math.round(performance.now() - startTime),
    });
  }
}
//@ chunk-5xgkngpb.js:2545976-2546092 placement
function getOrFetchModelConfig(modelId, credentials, storageV5) {
  let modelConfigs = getProviderState().providerCache.modelConfigs;
  let pending = modelConfigs.get(modelId);
  if (pending === undefined) {
    pending = logDynamicModelConfig(modelId, credentials, storageV5);
    modelConfigs.set(modelId, pending);
  }
  return pending;
}
//@ chunk-5xgkngpb.js:2546092-2547056 placement
async function logDynamicModelConfig(modelId, credentials, storageV5) {
  let startTime = performance.now();
  let timeoutSignal = AbortSignal.timeout(DYNAMIC_CONFIG_TIMEOUT_MS);
  let clientMs;
  try {
    let config = await withTimeout_2(
      getAnthropicClient({
        maxRetries: 0,
        agentContext: mainAgentContext(),
        credentials,
        storageV5,
      }).then((anthropicClient) => {
        clientMs = Math.round(performance.now() - startTime);
        timeoutSignal.throwIfAborted();
        return anthropicClient.models.retrieve(
          modelId,
          {
            betas: isClaudeAISubscriber() ? [OAUTH_BETA_HEADER] : undefined,
          },
          {
            signal: timeoutSignal,
          },
        );
      }),
      DYNAMIC_CONFIG_TIMEOUT_MS,
      TIMEOUT_MESSAGE,
    );
    let rounded = Math.round(performance.now() - startTime);
    logForDebugging(
      `[modelConfig] ${modelId} \u2192 ${config.id}: max_input_tokens=${config.max_input_tokens} max_tokens=${config.max_tokens} (client ${clientMs}ms, total ${rounded}ms)`,
    );
    logFeatureOk("model_config_fetch", {
      fetch_ms: rounded,
      ...(clientMs !== undefined && {
        client_ms: clientMs,
      }),
    });
    return config;
  } catch (error) {
    let rounded = Math.round(performance.now() - startTime);
    logForDebugging(
      `[modelConfig] ${modelId}: ${error instanceof Error ? error.message : String(error)} (${rounded}ms)`,
      {
        level: "error",
      },
    );
    let failureKind = "connection";
    if (
      timeoutSignal.aborted ||
      (error instanceof Error && error.message === TIMEOUT_MESSAGE) ||
      error instanceof APIConnectionTimeoutError ||
      error instanceof APIUserAbortError
    )
      failureKind = "timeout";
    else if (error instanceof APIError && error.status !== undefined)
      failureKind = error.status === 404 ? "not_found" : `http_${error.status}`;
    logFeatureBad("model_config_fetch", failureKind, {
      fetch_ms: rounded,
      ...(clientMs !== undefined && {
        client_ms: clientMs,
      }),
    });
    return null;
  }
}
export { isDynamicModelConfigEnabled, awaitModelConfigFetch, fetchDynamicModelConfig };

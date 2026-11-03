/**
 * utils/model/dynamicModelConfig.ts
 *
 * 2.1.316 新增：动态模型配置
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (6)
 * attribution: placement 6
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

//@ chunk-e6aww6q8.js:2503901-2503981 placement
var DYNAMIC_CONFIG_TIMEOUT_MS = 5000;
var TIMEOUT_MESSAGE = "dynamic model config fetch timed out";
var IN_FLIGHT_MARKER = Symbol("in-flight");
//@ chunk-e6aww6q8.js:2503981-2504005 placement
/**
 * 判断动态模型配置是否启用（此构建恒为 false）。
 */
function isDynamicModelConfigEnabled() {
  return false;
}
//@ chunk-e6aww6q8.js:2504005-2504086 placement
/**
 * 拉取动态模型配置（未启用时返回 null）。
 */
function fetchDynamicModelConfig(resolvedInitialModel, n, r) {
  if (!isDynamicModelConfigEnabled()) return Promise.resolve(null);
  return getOrFetchModelConfig(toProviderWireModelId(resolvedInitialModel), n, r);
}
//@ chunk-e6aww6q8.js:2504086-2504317 placement
/**
 * 在请求前等待动态模型配置获取完成，若需等待则记录等待时长。
 */
async function awaitModelConfigFetch(model, credentials, storageV5) {
  if (!isDynamicModelConfigEnabled()) return;
  let s = getOrFetchModelConfig(toProviderWireModelId(model), credentials, storageV5);
  let startTime = performance.now();
  if ((await Promise.race([s, Promise.resolve(IN_FLIGHT_MARKER)])) === IN_FLIGHT_MARKER) {
    await s;
    logFeatureSad("model_config_fetch", "request_waited", {
      waited_ms: Math.round(performance.now() - startTime),
    });
  }
}
//@ chunk-e6aww6q8.js:2504317-2504433 placement
function getOrFetchModelConfig(providerWireModelId, credentials, storageV5) {
  let modelConfigs = getProviderState().providerCache.modelConfigs;
  let h = modelConfigs.get(providerWireModelId);
  if (h === undefined) {
    h = logDynamicModelConfig(providerWireModelId, credentials, storageV5);
    modelConfigs.set(providerWireModelId, h);
  }
  return h;
}
//@ chunk-e6aww6q8.js:2504433-2505397 placement
async function logDynamicModelConfig(e, credentials, storageV5) {
  let startTime = performance.now();
  let h = AbortSignal.timeout(DYNAMIC_CONFIG_TIMEOUT_MS);
  let y;
  try {
    let S = await withTimeout_2(
      getAnthropicClient({
        maxRetries: 0,
        agentContext: mainAgentContext(),
        credentials,
        storageV5,
      }).then((anthropicClient) => {
        y = Math.round(performance.now() - startTime);
        h.throwIfAborted();
        return anthropicClient.models.retrieve(
          e,
          {
            betas: isClaudeAISubscriber() ? [OAUTH_BETA_HEADER] : undefined,
          },
          {
            signal: h,
          },
        );
      }),
      DYNAMIC_CONFIG_TIMEOUT_MS,
      TIMEOUT_MESSAGE,
    );
    let rounded = Math.round(performance.now() - startTime);
    logForDebugging(
      `[modelConfig] ${e} \u2192 ${S.id}: max_input_tokens=${S.max_input_tokens} max_tokens=${S.max_tokens} (client ${y}ms, total ${rounded}ms)`,
    );
    logFeatureOk("model_config_fetch", {
      fetch_ms: rounded,
      ...(y !== undefined && {
        client_ms: y,
      }),
    });
    return S;
  } catch (error) {
    let rounded = Math.round(performance.now() - startTime);
    logForDebugging(
      `[modelConfig] ${e}: ${error instanceof Error ? error.message : String(error)} (${rounded}ms)`,
      {
        level: "error",
      },
    );
    let L = "connection";
    if (
      h.aborted ||
      (error instanceof Error && error.message === TIMEOUT_MESSAGE) ||
      error instanceof APIConnectionTimeoutError ||
      error instanceof APIUserAbortError
    )
      L = "timeout";
    else if (error instanceof APIError && error.status !== undefined)
      L = error.status === 404 ? "not_found" : `http_${error.status}`;
    logFeatureBad("model_config_fetch", L, {
      fetch_ms: rounded,
      ...(y !== undefined && {
        client_ms: y,
      }),
    });
    return null;
  }
}
export { isDynamicModelConfigEnabled, awaitModelConfigFetch, fetchDynamicModelConfig };

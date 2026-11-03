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
import { fT, Lf, Ot } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";

//@ chunk-e6aww6q8.js:2503901-2503981 placement
var Pdn = 5000,
  Mdn = "dynamic model config fetch timed out",
  Odn = Symbol("in-flight");
//@ chunk-e6aww6q8.js:2503981-2504005 placement
function jve() {
  return !1;
}
//@ chunk-e6aww6q8.js:2504005-2504086 placement
function b8s(e, n, r) {
  if (!jve()) return Promise.resolve(null);
  return getOrFetchModelConfig(toProviderWireModelId(e), n, r);
}
/**
 * 在请求前等待动态模型配置获取完成，若需等待则记录等待时长。
 */
//@ chunk-e6aww6q8.js:2504086-2504317 placement
async function awaitModelConfigFetch(e, n, r) {
  if (!jve()) return;
  let s = getOrFetchModelConfig(toProviderWireModelId(e), n, r),
    startTime = performance.now();
  if ((await Promise.race([s, Promise.resolve(Odn)])) === Odn)
    (await s,
      logFeatureSad("model_config_fetch", "request_waited", {
        waited_ms: Math.round(performance.now() - startTime),
      }));
}
//@ chunk-e6aww6q8.js:2504317-2504433 placement
function getOrFetchModelConfig(e, n, r) {
  let modelConfigs = getProviderState().providerCache.modelConfigs,
    h = modelConfigs.get(e);
  if (h === void 0) ((h = logDynamicModelConfig(e, n, r)), modelConfigs.set(e, h));
  return h;
}
//@ chunk-e6aww6q8.js:2504433-2505397 placement
async function logDynamicModelConfig(e, n, r) {
  let startTime = performance.now(),
    timeout = AbortSignal.timeout(Pdn),
    y;
  try {
    let S = await withTimeout_2(
        getAnthropicClient({
          maxRetries: 0,
          agentContext: mainAgentContext(),
          credentials: n,
          storageV5: r,
        }).then(
          (L) => (
            (y = Math.round(performance.now() - startTime)),
            timeout.throwIfAborted(),
            L.models.retrieve(
              e,
              { betas: isClaudeAISubscriber() ? [OAUTH_BETA_HEADER] : void 0 },
              { signal: timeout },
            )
          ),
        ),
        Pdn,
        Mdn,
      ),
      rounded = Math.round(performance.now() - startTime);
    return (
      logForDebugging(
        `[modelConfig] ${e} \u2192 ${S.id}: max_input_tokens=${S.max_input_tokens} max_tokens=${S.max_tokens} (client ${y}ms, total ${rounded}ms)`,
      ),
      logFeatureOk("model_config_fetch", { fetch_ms: rounded, ...(y !== void 0 && { client_ms: y }) }),
      S
    );
  } catch (error) {
    let rounded = Math.round(performance.now() - startTime);
    logForDebugging(
      `[modelConfig] ${e}: ${error instanceof Error ? error.message : String(error)} (${rounded}ms)`,
      { level: "error" },
    );
    let L = "connection";
    if (
      timeout.aborted ||
      (error instanceof Error && error.message === Mdn) ||
      error instanceof fT ||
      error instanceof Lf
    )
      L = "timeout";
    else if (error instanceof Ot && error.status !== void 0)
      L = error.status === 404 ? "not_found" : `http_${error.status}`;
    return (
      logFeatureBad("model_config_fetch", L, { fetch_ms: rounded, ...(y !== void 0 && { client_ms: y }) }),
      null
    );
  }
}

export { jve, awaitModelConfigFetch, b8s };

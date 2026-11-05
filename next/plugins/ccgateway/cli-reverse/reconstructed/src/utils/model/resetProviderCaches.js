/**
 * utils/model/resetProviderCaches.ts
 *
 * 2.1.316 新增。切换提供商后重置相关缓存。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-y3w95ygc.js (1)
 * attribution: placement 1
 */
import {
  resetModelStrings,
  clearStructuredOutputsUnsupported,
  clearContext1mRefused,
} from "../../bootstrap/state.js";
import { clearBetasCaches } from "../betas.js";
import { getProviderState, createProviderCache } from "./providerCaches.js";
import { clearAwsCredentialsCache, clearGcpCredentialsCache } from "../auth.js";
import { resetDatadogInit } from "../../services/analytics/datadog.js";
import { refreshGrowthBookFeatures } from "../../services/analytics/growthbook.js";

//@ chunk-y3w95ygc.js:360-467 placement
/**
 * 切换提供商后重置相关缓存。
 */
function resetProviderBoundCaches(provider) {
  resetModelStrings();
  clearBetasCaches();
  getProviderState().providerCache = createProviderCache();
  clearStructuredOutputsUnsupported();
  clearContext1mRefused();
  clearAwsCredentialsCache();
  clearGcpCredentialsCache();
  resetDatadogInit();
  if (provider === "firstParty") refreshGrowthBookFeatures();
}
export { resetProviderBoundCaches };

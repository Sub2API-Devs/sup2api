/**
 * hooks/useApiKeyVerification.ts
 *
 * API key 校验状态（loading/valid/missing，apiKeyHelper/网关）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useApiKeyVerification.ts
 * pieces: chunk-czq1j3j2.js (2)
 * attribution: placement 1, fingerprint 1
 */
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../utils/debug.js";
import { stringSchema } from "../../vendor/zod/v4/classic/schemas.js";
import { createSignal } from "../utils/signal.js";
import { Text } from "../ink/components/Text.js";
import { getAPIProvider } from "../utils/model/providers.js";
import { getGatewayAuth, getIsNonInteractiveSession } from "../bootstrap/state.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import {
  isAnthropicAuthEnabled,
  isClaudeAISubscriber,
  getApiKeyFromApiKeyHelper,
  getAnthropicApiKeyWithSource,
  getClaudeAIOAuthTokensAsync,
  wasOAuthAccessTokenSavedByThisProcess,
} from "../utils/auth.js";
import { verifyApiKey } from "../services/api/claude.js";

//@ chunk-czq1j3j2.js:189956-191109 placement
class ApiKeyVerification {
  #e;
  #t = 0;
  #o = createSignal();
  constructor() {
    this.#e = useApiKeyVerification();
  }
  subscribe = (listener) => this.#o.subscribe(listener);
  getSnapshot = () => this.#e;
  #n(next) {
    if (next === this.#e) return;
    this.#e = next;
    this.#o.emit();
  }
  #r(generation, status) {
    if (generation !== this.#t) return;
    this.#n(status);
  }
  verify = async ({ credentials, storageV5 }) => {
    let generation = ++this.#t;
    if (getAPIProvider() === "gateway" && !getGatewayAuth()) {
      this.#r(generation, "missing");
      logFeatureSad("auth_api_key_verify", "missing");
      return;
    }
    if (!isAnthropicAuthEnabled() || isClaudeAISubscriber()) {
      this.#r(generation, "valid");
      logFeatureOk("auth_api_key_verify");
      return;
    }
    await getApiKeyFromApiKeyHelper(getIsNonInteractiveSession());
    let { key, source } = getAnthropicApiKeyWithSource();
    if (!key?.trim()) {
      if (source === "apiKeyHelper") {
        this.#r(generation, "error");
        logFeatureBad("auth_api_key_verify", "apikeyhelper_failed");
        return;
      }
      this.#r(generation, "missing");
      logFeatureSad("auth_api_key_verify", "missing");
      return;
    }
    try {
      let isValid = await verifyApiKey(key, false, credentials, storageV5);
      this.#r(generation, isValid ? "valid" : "invalid");
      if (isValid) logFeatureOk("auth_api_key_verify");
      else logFeatureBad("auth_api_key_verify", "invalid");
    } catch {
      this.#r(generation, "error");
      logFeatureBad("auth_api_key_verify", "network_error");
    }
  };
  recheckAfterCredentialsChange = async (context) => {
    if (!this.showsLoginNotice()) return false;
    let claudeAIOAuthTokens = await getClaudeAIOAuthTokensAsync(context.credentials);
    if (!this.showsLoginNotice() || !isClaudeAISubscriber()) return false;
    if (
      claudeAIOAuthTokens &&
      wasOAuthAccessTokenSavedByThisProcess(context.host, claudeAIOAuthTokens.accessToken)
    )
      return false;
    await this.verify(context);
    return this.#e === "valid";
  };
  showsLoginNotice() {
    return this.#e === "missing" || this.#e === "invalid";
  }
}
//@ chunk-czq1j3j2.js:191109-191316 fingerprint (2.1.88 match: useApiKeyVerification, 0.836)
function useApiKeyVerification() {
  if (getAPIProvider() === "gateway" && !getGatewayAuth()) return "missing";
  if (!isAnthropicAuthEnabled() || isClaudeAISubscriber()) return "valid";
  let { key, source } = getAnthropicApiKeyWithSource({
    skipRetrievingKeyFromApiKeyHelper: true,
  });
  if (key || source === "apiKeyHelper") return "loading";
  return "missing";
}
export { ApiKeyVerification };

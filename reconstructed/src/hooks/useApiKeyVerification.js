/**
 * hooks/useApiKeyVerification.ts
 *
 * API key 校验状态（loading/valid/missing，apiKeyHelper/网关）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useApiKeyVerification.ts
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { logForDebugging } from "../utils/debug.js";
import { o } from "../../vendor/zod/v4/classic/schemas.js";
import { createSignal } from "../utils/signal.js";
import { Text, Box } from "../ink/components/Text.js";
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

//@ chunk-18hwfzwa.js:185159-186312 placement
class ApiKeyVerification {
  #e;
  #t = 0;
  #o = createSignal();
  constructor() {
    this.#e = useApiKeyVerification();
  }
  subscribe = (h) => this.#o.subscribe(h);
  getSnapshot = () => this.#e;
  #n(h) {
    if (h === this.#e) return;
    ((this.#e = h), this.#o.emit());
  }
  #s(h, x) {
    if (h !== this.#t) return;
    this.#n(x);
  }
  verify = async ({ credentials: credentials, storageV5: storageV5 }) => {
    let D = ++this.#t;
    if (getAPIProvider() === "gateway" && !getGatewayAuth()) {
      (this.#s(D, "missing"), logFeatureSad("auth_api_key_verify", "missing"));
      return;
    }
    if (!isAnthropicAuthEnabled() || isClaudeAISubscriber()) {
      (this.#s(D, "valid"), logFeatureOk("auth_api_key_verify"));
      return;
    }
    await getApiKeyFromApiKeyHelper(getIsNonInteractiveSession());
    let { key: key, source: source } = getAnthropicApiKeyWithSource();
    if (!key?.trim()) {
      if (source === "apiKeyHelper") {
        (this.#s(D, "error"), logFeatureBad("auth_api_key_verify", "apikeyhelper_failed"));
        return;
      }
      (this.#s(D, "missing"), logFeatureSad("auth_api_key_verify", "missing"));
      return;
    }
    try {
      let ke = await verifyApiKey(key, !1, credentials, storageV5);
      if ((this.#s(D, ke ? "valid" : "invalid"), ke)) logFeatureOk("auth_api_key_verify");
      else logFeatureBad("auth_api_key_verify", "invalid");
    } catch {
      (this.#s(D, "error"), logFeatureBad("auth_api_key_verify", "network_error"));
    }
  };
  recheckAfterCredentialsChange = async (h) => {
    if (!this.showsLoginNotice()) return !1;
    let x = await getClaudeAIOAuthTokensAsync(h.credentials);
    if (!this.showsLoginNotice() || !isClaudeAISubscriber()) return !1;
    if (x && wasOAuthAccessTokenSavedByThisProcess(h.host, x.accessToken)) return !1;
    return (await this.verify(h), this.#e === "valid");
  };
  showsLoginNotice() {
    return this.#e === "missing" || this.#e === "invalid";
  }
}
//@ chunk-18hwfzwa.js:186312-186519 fingerprint = useApiKeyVerification (0.836)
function useApiKeyVerification() {
  if (getAPIProvider() === "gateway" && !getGatewayAuth()) return "missing";
  if (!isAnthropicAuthEnabled() || isClaudeAISubscriber()) return "valid";
  let { key: key, source: source } = getAnthropicApiKeyWithSource({ skipRetrievingKeyFromApiKeyHelper: !0 });
  if (key || source === "apiKeyHelper") return "loading";
  return "missing";
}

export { ApiKeyVerification };

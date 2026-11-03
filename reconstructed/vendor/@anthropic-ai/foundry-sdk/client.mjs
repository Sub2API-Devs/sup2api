/**
 * @anthropic-ai/foundry-sdk/client.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/foundry-sdk@0.4.1..0.5.4
 * pieces: chunk-q01xm7xp.js (3)
 * attribution: esm-fingerprint 3
 */
import { uPe } from "../sdk/client.mjs";
import { u } from "./internal/utils/env.mjs";
import { pr } from "../sdk/core/error.mjs";
import { p } from "./internal/headers.mjs";
import { Cx } from "../sdk/version.mjs";
import { $ie } from "../sdk/resources/messages/messages.mjs";
import { Nie } from "../sdk/resources/beta/beta.mjs";

//@ chunk-q01xm7xp.js:1613-3141 esm-fingerprint
class y extends uPe {
  constructor({
    baseURL: e = u("ANTHROPIC_FOUNDRY_BASE_URL"),
    apiKey: t = u("ANTHROPIC_FOUNDRY_API_KEY"),
    resource: n = u("ANTHROPIC_FOUNDRY_RESOURCE"),
    azureADTokenProvider: r,
    dangerouslyAllowBrowser: o,
    ...i
  } = {}) {
    if (typeof r === "function") o = !0;
    if (!r && !t)
      throw new pr(
        "Missing credentials. Please pass one of `apiKey` and `azureTokenProvider`, or set the `ANTHROPIC_FOUNDRY_API_KEY` environment variable.",
      );
    if (r && t)
      throw new pr(
        "The `apiKey` and `azureADTokenProvider` arguments are mutually exclusive; only one can be passed at a time.",
      );
    if (!e) {
      if (!n)
        throw new pr(
          "Must provide one of the `baseURL` or `resource` arguments, or the `ANTHROPIC_FOUNDRY_RESOURCE` environment variable",
        );
      e = `https://${n}.services.ai.azure.com/anthropic/`;
    } else if (n) throw new pr("baseURL and resource are mutually exclusive");
    super({ apiKey: r ?? t, baseURL: e, ...i, ...(o !== void 0 ? { dangerouslyAllowBrowser: o } : {}) });
    ((this.resource = null), (this.messages = w(this)), (this.beta = E(this)), (this.models = void 0));
  }
  async authHeaders() {
    if (typeof this._options.apiKey === "function") {
      let e;
      try {
        e = await this._options.apiKey();
      } catch (error) {
        if (error instanceof pr) throw error;
        throw new pr(`Failed to get token from azureADTokenProvider: ${error.message}`, { cause: error });
      }
      if (typeof e !== "string" || !e)
        throw new pr(
          `Expected azureADTokenProvider function argument to return a string but it returned ${e}`,
        );
      return p([{ Authorization: `Bearer ${e}` }]);
    }
    if (typeof this._options.apiKey === "string") return p([{ "x-api-key": this.apiKey }]);
    return;
  }
  validateHeaders() {
    return;
  }
  getUserAgent() {
    return `AnthropicFoundry/JS ${Cx}`;
  }
}
//@ chunk-q01xm7xp.js:3141-3198 esm-fingerprint
function w(e) {
  let t = new $ie(e);
  return (delete t.batches, t);
}
//@ chunk-q01xm7xp.js:3198-3264 esm-fingerprint
function E(e) {
  let t = new Nie(e);
  return (delete t.messages.batches, t);
}

/**
 * @anthropic-ai/foundry-sdk/client.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/foundry-sdk@0.4.1..0.5.4
 * pieces: chunk-q01xm7xp.js (3)
 * attribution: esm-fingerprint 3
 */
import { Anthropic } from "../sdk/client.mjs";
import { readEnv } from "./internal/utils/env.mjs";
import { AnthropicError } from "../sdk/core/error.mjs";
import { buildHeaders } from "./internal/headers.mjs";
import { VERSION } from "../sdk/version.mjs";
import { Messages_2 } from "../sdk/resources/messages/messages.mjs";
import { Beta } from "../sdk/resources/beta/beta.mjs";

//@ chunk-q01xm7xp.js:1613-3141 esm-fingerprint
class AnthropicFoundry extends Anthropic {
  constructor({
    baseURL = readEnv("ANTHROPIC_FOUNDRY_BASE_URL"),
    apiKey = readEnv("ANTHROPIC_FOUNDRY_API_KEY"),
    resource = readEnv("ANTHROPIC_FOUNDRY_RESOURCE"),
    azureADTokenProvider,
    dangerouslyAllowBrowser,
    ...opts
  } = {}) {
    if (typeof azureADTokenProvider === "function") dangerouslyAllowBrowser = true;
    if (!azureADTokenProvider && !apiKey)
      throw new AnthropicError(
        "Missing credentials. Please pass one of `apiKey` and `azureTokenProvider`, or set the `ANTHROPIC_FOUNDRY_API_KEY` environment variable.",
      );
    if (azureADTokenProvider && apiKey)
      throw new AnthropicError(
        "The `apiKey` and `azureADTokenProvider` arguments are mutually exclusive; only one can be passed at a time.",
      );
    if (!baseURL) {
      if (!resource)
        throw new AnthropicError(
          "Must provide one of the `baseURL` or `resource` arguments, or the `ANTHROPIC_FOUNDRY_RESOURCE` environment variable",
        );
      baseURL = `https://${resource}.services.ai.azure.com/anthropic/`;
    } else if (resource) throw new AnthropicError("baseURL and resource are mutually exclusive");
    super({
      apiKey: azureADTokenProvider ?? apiKey,
      baseURL,
      ...opts,
      ...(dangerouslyAllowBrowser !== undefined
        ? {
            dangerouslyAllowBrowser,
          }
        : {}),
    });
    this.resource = null;
    this.messages = makeMessagesResource(this);
    this.beta = makeBetaResource(this);
    this.models = undefined;
  }
  async authHeaders() {
    if (typeof this._options.apiKey === "function") {
      let token;
      try {
        token = await this._options.apiKey();
      } catch (err) {
        if (err instanceof AnthropicError) throw err;
        throw new AnthropicError(`Failed to get token from azureADTokenProvider: ${err.message}`, {
          cause: err,
        });
      }
      if (typeof token !== "string" || !token)
        throw new AnthropicError(
          `Expected azureADTokenProvider function argument to return a string but it returned ${token}`,
        );
      return buildHeaders([
        {
          Authorization: `Bearer ${token}`,
        },
      ]);
    }
    if (typeof this._options.apiKey === "string")
      return buildHeaders([
        {
          "x-api-key": this.apiKey,
        },
      ]);
    return;
  }
  validateHeaders() {
    return;
  }
  getUserAgent() {
    return `AnthropicFoundry/JS ${VERSION}`;
  }
}
//@ chunk-q01xm7xp.js:3141-3198 esm-fingerprint
function makeMessagesResource(client) {
  let resource = new Messages_2(client);
  delete resource.batches;
  return resource;
}
//@ chunk-q01xm7xp.js:3198-3264 esm-fingerprint
function makeBetaResource(client) {
  let resource = new Beta(client);
  delete resource.messages.batches;
  return resource;
}

/**
 * @anthropic-ai/vertex-sdk/client.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/vertex-sdk@0.19.3..0.20.4
 * pieces: chunk-1vqm62xf.js (1)
 * attribution: esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { BaseAnthropic } from "../sdk/client.mjs";
import { readEnv } from "../bedrock-sdk/internal/utils/env.mjs";
import {
  _AnthropicVertex_instances,
  makeMessagesResource,
  makeBetaResource,
  __classPrivateFieldGet,
  _AnthropicVertex_adaptRequest,
} from "./client.mjs";
import { import_google_auth_library } from "../bedrock-sdk/internal/errors.mjs";
import { VERSION } from "../sdk/version.mjs";

//@ chunk-1vqm62xf.js:2594-3944 esm-fingerprint
class AnthropicVertex extends BaseAnthropic {
  constructor({
    baseURL = readEnv("ANTHROPIC_VERTEX_BASE_URL"),
    region = readEnv("CLOUD_ML_REGION") ?? null,
    projectId = readEnv("ANTHROPIC_VERTEX_PROJECT_ID") ?? null,
    ...opts
  } = {}) {
    if (!region)
      throw Error(
        "No region was given. The client should be instantiated with the `region` option or the `CLOUD_ML_REGION` environment variable should be set.",
      );
    if (!baseURL)
      switch (region) {
        case "global":
          baseURL = "https://aiplatform.googleapis.com/v1";
          break;
        case "us":
          baseURL = "https://aiplatform.us.rep.googleapis.com/v1";
          break;
        case "eu":
          baseURL = "https://aiplatform.eu.rep.googleapis.com/v1";
          break;
        default:
          baseURL = `https://${region}-aiplatform.googleapis.com/v1`;
      }
    super({
      baseURL,
      apiKey: null,
      authToken: null,
      ...opts,
    });
    _AnthropicVertex_instances.add(this);
    this.messages = makeMessagesResource(this);
    this.beta = makeBetaResource(this);
    this.region = region;
    this.projectId = projectId;
    this.accessToken = opts.accessToken ?? null;
    if (opts.authClient && opts.googleAuth)
      throw Error("You cannot provide both `authClient` and `googleAuth`. Please provide only one of them.");
    else if (opts.authClient) this._authClientPromise = Promise.resolve(opts.authClient);
    else {
      this._auth =
        opts.googleAuth ??
        new import_google_auth_library.GoogleAuth({
          scopes: "https://www.googleapis.com/auth/cloud-platform",
        });
      this._authClientPromise = this._auth.getClient();
    }
  }
  validateHeaders() {}
  _shouldResolveDefaultCredentials() {
    return false;
  }
  async authHeaders() {
    return;
  }
  getUserAgent() {
    return `AnthropicVertex/JS ${VERSION}`;
  }
  backendMiddleware() {
    return [
      async (request, next, ctx) =>
        next(
          await __classPrivateFieldGet(
            this,
            _AnthropicVertex_instances,
            "m",
            _AnthropicVertex_adaptRequest,
          ).call(this, request, ctx.options),
        ),
    ];
  }
}
export { AnthropicVertex };

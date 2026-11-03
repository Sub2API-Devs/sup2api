/**
 * @anthropic-ai/vertex-sdk/client.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/vertex-sdk@0.19.3..0.20.4
 * pieces: chunk-xa96axyz.js (2)
 * attribution: esm-fingerprint 2
 */
import { BaseAnthropic } from "../sdk/client.mjs";
import { readEnv_4 } from "../bedrock-sdk/internal/utils/env.mjs";
import { makeMessagesResource, makeBetaResource } from "./client.mjs";
import { import_google_auth_library } from "../bedrock-sdk/internal/errors.mjs";
import { VERSION } from "../sdk/version.mjs";

//@ chunk-xa96axyz.js:2219-2594 esm-fingerprint
var __classPrivateFieldGet = function (receiver, state, kind, f) {
  if (kind === "a" && !f) throw TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _AnthropicVertex_instances;
var _AnthropicVertex_adaptRequest;
var DEFAULT_VERSION = "vertex-2023-10-16";
var MODEL_ENDPOINTS = new Set(["/v1/messages", "/v1/messages?beta=true"]);
//@ chunk-xa96axyz.js:2594-3944 esm-fingerprint
class AnthropicVertex extends BaseAnthropic {
  constructor({
    baseURL = readEnv_4("ANTHROPIC_VERTEX_BASE_URL"),
    region = readEnv_4("CLOUD_ML_REGION") ?? null,
    projectId = readEnv_4("ANTHROPIC_VERTEX_PROJECT_ID") ?? null,
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
export { _AnthropicVertex_instances, _AnthropicVertex_adaptRequest, DEFAULT_VERSION, MODEL_ENDPOINTS };

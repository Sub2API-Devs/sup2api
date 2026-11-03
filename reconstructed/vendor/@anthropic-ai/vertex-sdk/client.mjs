/**
 * @anthropic-ai/vertex-sdk/client.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/vertex-sdk@0.19.3..0.20.4
 * pieces: chunk-xa96axyz.js (3)
 * attribution: esm-fingerprint 3
 */
import {
  _AnthropicVertex_instances,
  _AnthropicVertex_adaptRequest,
  DEFAULT_VERSION,
  MODEL_ENDPOINTS,
} from "./client.js";
import { APIConnectionError } from "../sdk/core/error.mjs";
import { castToError_2 } from "../bedrock-sdk/internal/errors.mjs";
import { w, b } from "./internal/utils/values.mjs";
import { buildHeaders } from "./internal/headers.mjs";
import { Messages_2 } from "../sdk/resources/messages/messages.mjs";
import { Beta } from "../sdk/resources/beta/beta.mjs";

//@ chunk-xa96axyz.js:3944-5755 esm-fingerprint
_AnthropicVertex_instances = new WeakSet();
_AnthropicVertex_adaptRequest = async function (request, options) {
  let authClient;
  let googleAuthHeaders;
  try {
    authClient = await this._authClientPromise;
    googleAuthHeaders = await authClient.getRequestHeaders();
  } catch (err) {
    throw new APIConnectionError({
      message: "Failed to acquire Google OAuth credentials.",
      cause: castToError_2(err),
    });
  }
  let projectId = authClient.projectId ?? googleAuthHeaders.get("x-goog-user-project");
  if (!this.projectId && projectId) this.projectId = projectId;
  let url = new URL(request.url);
  let parsedBody;
  if (typeof request.body === "string") {
    let parsed = w(request.body);
    if (b(parsed)) parsedBody = parsed;
  }
  if (parsedBody && !parsedBody.anthropic_version) parsedBody.anthropic_version = DEFAULT_VERSION;
  if (options && MODEL_ENDPOINTS.has(options.path) && options.method === "post") {
    let canonicalPath = options.path.split("?")[0];
    if (url.pathname.endsWith(canonicalPath)) {
      if (!this.projectId)
        throw Error(
          "No projectId was given and it could not be resolved from credentials. The client should be instantiated with the `projectId` option or the `ANTHROPIC_VERTEX_PROJECT_ID` environment variable should be set.",
        );
      if (!parsedBody) throw Error("Expected request body to be an object for post /v1/messages");
      let model = parsedBody.model;
      delete parsedBody.model;
      let v = (parsedBody.stream ?? false) ? "streamRawPredict" : "rawPredict";
      let prefix = url.pathname.slice(0, url.pathname.length - canonicalPath.length);
      url.pathname = `${prefix}/projects/${this.projectId}/locations/${this.region}/publishers/anthropic/models/${model}:${v}`;
      url.searchParams.delete("beta");
    }
  }
  if (
    options &&
    (options.path === "/v1/messages/count_tokens" ||
      (options.path == "/v1/messages/count_tokens?beta=true" && options.method === "post"))
  ) {
    let canonicalPath = options.path.split("?")[0];
    if (url.pathname.endsWith(canonicalPath)) {
      if (!this.projectId)
        throw Error(
          "No projectId was given and it could not be resolved from credentials. The client should be instantiated with the `projectId` option or the `ANTHROPIC_VERTEX_PROJECT_ID` environment variable should be set.",
        );
      let prefix = url.pathname.slice(0, url.pathname.length - canonicalPath.length);
      url.pathname = `${prefix}/projects/${this.projectId}/locations/${this.region}/publishers/anthropic/models/count-tokens:rawPredict`;
      url.searchParams.delete("beta");
    }
  }
  let adapted = {
    ...request,
    url: url.toString(),
    headers: buildHeaders([googleAuthHeaders, request.headers]).values,
  };
  if (parsedBody) adapted.body = JSON.stringify(parsedBody);
  return adapted;
};
//@ chunk-xa96axyz.js:5755-5812 esm-fingerprint
function makeMessagesResource(client) {
  let resource = new Messages_2(client);
  delete resource.batches;
  return resource;
}
//@ chunk-xa96axyz.js:5812-5878 esm-fingerprint
function makeBetaResource(client) {
  let resource = new Beta(client);
  delete resource.messages.batches;
  return resource;
}
export { makeMessagesResource, makeBetaResource };

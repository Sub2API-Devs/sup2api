/**
 * @anthropic-ai/bedrock-sdk/client.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-b8zxeazh.js (5)
 * attribution: esm-fingerprint 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { BaseAnthropic } from "../sdk/client.mjs";
import { readEnv_2 } from "./internal/utils/env.mjs";
import { Completions } from "../sdk/resources/completions.mjs";
import { loggerFor } from "./internal/utils/log.mjs";
import { VERSION } from "../sdk/version.mjs";
import { tryParseJson } from "./AWS_restJson1.mjs";
import { is_buffer } from "./internal/qs/utils.js";
import { formatter } from "./internal/utils/path.mjs";
import { getAuthHeaders } from "./core/auth.js";
import { buildHeaders } from "./internal/headers.mjs";
import { eventStreamToSSEResponse } from "./core/streaming.mjs";
import { Messages_2 } from "../sdk/resources/messages/messages.mjs";
import { Beta } from "../sdk/resources/beta/beta.mjs";

//@ chunk-b8zxeazh.js:10925-11322 esm-fingerprint
var __classPrivateFieldGet = function (receiver, state, kind, f) {
  if (kind === "a" && !f) throw TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _AnthropicBedrock_instances;
var _AnthropicBedrock_adaptRequest;
var _AnthropicBedrock_adaptResponse;
var DEFAULT_VERSION = "bedrock-2023-05-31";
var MODEL_ENDPOINTS = new Set(["/v1/complete", "/v1/messages", "/v1/messages?beta=true"]);
//@ chunk-b8zxeazh.js:11322-12463 esm-fingerprint
class AnthropicBedrock extends BaseAnthropic {
  constructor({
    awsRegion = readEnv_2("AWS_REGION") ?? "us-east-1",
    baseURL = readEnv_2("ANTHROPIC_BEDROCK_BASE_URL") ?? `https://bedrock-runtime.${awsRegion}.amazonaws.com`,
    apiKey = readEnv_2("AWS_BEARER_TOKEN_BEDROCK"),
    awsSecretKey = null,
    awsAccessKey = null,
    awsSessionToken = null,
    providerChainResolver = null,
    ...opts
  } = {}) {
    super({
      baseURL,
      authToken: apiKey ?? null,
      apiKey: null,
      ...opts,
    });
    _AnthropicBedrock_instances.add(this);
    this.skipAuth = false;
    this.messages = makeMessagesResource(this);
    this.completions = new Completions(this);
    this.beta = makeBetaResource(this);
    let hasAccess = awsAccessKey != null;
    let hasSecret = awsSecretKey != null;
    if (hasAccess !== hasSecret)
      loggerFor(this).warn(
        "Warning: Passing only one of `awsAccessKey` or `awsSecretKey` is deprecated. Please provide both keys, or provide neither and rely on the AWS credential provider chain.",
      );
    this.awsSecretKey = awsSecretKey;
    this.awsAccessKey = awsAccessKey;
    this.awsRegion = awsRegion;
    this.awsSessionToken = awsSessionToken;
    this.skipAuth = opts.skipAuth ?? false;
    this.providerChainResolver = providerChainResolver;
  }
  validateHeaders() {}
  _shouldResolveDefaultCredentials() {
    return false;
  }
  getUserAgent() {
    return `AnthropicBedrock/JS ${VERSION}`;
  }
  async authHeaders(opts) {
    return this.skipAuth ? undefined : super.authHeaders(opts);
  }
  backendMiddleware() {
    return [
      async (request, next, ctx) => {
        let response = await next(
          await __classPrivateFieldGet(
            this,
            _AnthropicBedrock_instances,
            "m",
            _AnthropicBedrock_adaptRequest,
          ).call(this, request, ctx.options),
        );
        return __classPrivateFieldGet(
          this,
          _AnthropicBedrock_instances,
          "m",
          _AnthropicBedrock_adaptResponse,
        ).call(this, response);
      },
    ];
  }
}
//@ chunk-b8zxeazh.js:12463-13829 esm-fingerprint
_AnthropicBedrock_instances = new WeakSet();
_AnthropicBedrock_adaptRequest = async function (request, options) {
  let url = new URL(request.url);
  let headers = new Headers(request.headers);
  let parsedBody;
  if (typeof request.body === "string") {
    let parsed = tryParseJson(request.body);
    if (is_buffer(parsed)) parsedBody = parsed;
  }
  if (parsedBody) {
    if (!parsedBody.anthropic_version) parsedBody.anthropic_version = DEFAULT_VERSION;
    let betas = headers.get("anthropic-beta");
    if (betas != null && !parsedBody.anthropic_beta)
      parsedBody.anthropic_beta = betas.split(",").map((beta) => beta.trim());
  }
  if (options && MODEL_ENDPOINTS.has(options.path) && options.method === "post") {
    let canonicalPath = options.path.split("?")[0];
    if (url.pathname.endsWith(canonicalPath)) {
      if (!parsedBody) throw Error(`Expected request body to be a JSON object for post ${canonicalPath}`);
      let model = parsedBody.model;
      delete parsedBody.model;
      let stream = parsedBody.stream;
      delete parsedBody.stream;
      let prefix = url.pathname.slice(0, url.pathname.length - canonicalPath.length);
      url.pathname =
        prefix +
        (stream ? formatter`/model/${model}/invoke-with-response-stream` : formatter`/model/${model}/invoke`);
      url.searchParams.delete("beta");
    }
  }
  let adapted = {
    ...request,
    url: url.toString(),
    headers,
  };
  if (parsedBody) adapted.body = JSON.stringify(parsedBody);
  if (!this.skipAuth && !this.authToken) {
    let regionName = this.awsRegion;
    if (!regionName)
      throw Error(
        "Expected `awsRegion` option to be passed to the client or the `AWS_REGION` environment variable to be present",
      );
    let authHeaders = await getAuthHeaders(adapted, {
      url: adapted.url,
      regionName,
      awsAccessKey: this.awsAccessKey,
      awsSecretKey: this.awsSecretKey,
      awsSessionToken: this.awsSessionToken,
      fetchOptions: this.fetchOptions,
      providerChainResolver: this.providerChainResolver,
      logger: loggerFor(this),
    });
    adapted.headers = buildHeaders([adapted.headers, authHeaders]).values;
  }
  return adapted;
};
_AnthropicBedrock_adaptResponse = function (response) {
  if (response.body && response.headers.get("content-type")?.includes("application/vnd.amazon.eventstream"))
    return eventStreamToSSEResponse(response);
  return response;
};
//@ chunk-b8zxeazh.js:13829-13908 esm-fingerprint
function makeMessagesResource(client) {
  let resource = new Messages_2(client);
  delete resource.batches;
  delete resource.countTokens;
  return resource;
}
//@ chunk-b8zxeazh.js:13908-14028 esm-fingerprint
function makeBetaResource(client) {
  let resource = new Beta(client);
  delete resource.promptCaching;
  delete resource.messages.batches;
  delete resource.messages.countTokens;
  return resource;
}
export { AnthropicBedrock };

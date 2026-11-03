/**
 * @anthropic-ai/bedrock-sdk/mantle-client.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-h87x8cg3.js (4), chunk-qhhcfyds.js (3)
 * attribution: esm-fingerprint 5, esm-layout 2
 */
import { BaseAnthropic, Anthropic } from "../sdk/client.mjs";
import { readEnv_2, readEnv_3 } from "./internal/utils/env.mjs";
import { AnthropicError } from "../sdk/core/error.mjs";
import { Messages_2 } from "../sdk/resources/messages/messages.mjs";
import { buildHeaders_2, buildHeaders_3 } from "./internal/headers.mjs";
import { VERSION } from "../sdk/version.mjs";
import { getAuthHeaders_2, getAuthHeaders } from "./core/aws-auth.js";
import { loggerFor, loggerFor_2 } from "./internal/utils/log.mjs";
import { Beta } from "../sdk/resources/beta/beta.mjs";
import { import_node_config_provider, import_index_native } from "./internal/errors.mjs";

//@ chunk-h87x8cg3.js:15740-16062 esm-fingerprint
var __classPrivateFieldGet_2 = function (receiver, state, kind, f) {
  if (kind === "a" && !f) throw TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _AnthropicBedrockMantle_instances;
var _AnthropicBedrockMantle_signRequest;
var DEFAULT_SERVICE_NAME = "bedrock-mantle";
//@ chunk-h87x8cg3.js:16062-17524 esm-fingerprint
class AnthropicBedrockMantle extends BaseAnthropic {
  constructor({
    awsRegion,
    baseURL,
    apiKey,
    awsAccessKey = null,
    awsSecretAccessKey = null,
    awsSessionToken = null,
    awsProfile,
    providerChainResolver = null,
    skipAuth = false,
    ...opts
  } = {}) {
    let resolvedRegion = awsRegion ?? readEnv_2("AWS_REGION") ?? readEnv_2("AWS_DEFAULT_REGION");
    let resolvedBaseURL =
      baseURL ??
      readEnv_2("ANTHROPIC_BEDROCK_MANTLE_BASE_URL") ??
      (resolvedRegion ? `https://bedrock-mantle.${resolvedRegion}.api.aws/anthropic` : undefined);
    if (!resolvedBaseURL)
      throw new AnthropicError(
        "No AWS region or base URL found. Set `awsRegion` in the constructor, the `AWS_REGION` / `AWS_DEFAULT_REGION` environment variable, or provide a `baseURL` / `ANTHROPIC_BEDROCK_MANTLE_BASE_URL` environment variable.",
      );
    let hasExplicitApiKey = apiKey != null;
    if ((awsAccessKey != null) !== (awsSecretAccessKey != null))
      throw new AnthropicError(
        "`awsAccessKey` and `awsSecretAccessKey` must be provided together. You provided only one.",
      );
    let hasExplicitAwsCreds = awsAccessKey != null && awsSecretAccessKey != null;
    let hasAwsProfile = awsProfile != null;
    let resolvedApiKey;
    if (hasExplicitApiKey) resolvedApiKey = apiKey;
    else if (!hasExplicitAwsCreds && !hasAwsProfile)
      resolvedApiKey = readEnv_2("AWS_BEARER_TOKEN_BEDROCK") ?? undefined;
    super({
      apiKey: resolvedApiKey ?? null,
      authToken: null,
      baseURL: resolvedBaseURL,
      ...opts,
    });
    _AnthropicBedrockMantle_instances.add(this);
    this.messages = new Messages_2(this);
    this.beta = makeMantleBetaResource(this);
    this.skipAuth = false;
    this.awsRegion = resolvedRegion;
    this.awsAccessKey = awsAccessKey;
    this.awsSecretAccessKey = awsSecretAccessKey;
    this.awsSessionToken = awsSessionToken;
    this.awsProfile = awsProfile ?? null;
    this.providerChainResolver = providerChainResolver;
    this.skipAuth = skipAuth;
    this._useSigV4 = resolvedApiKey == null;
  }
  async authHeaders(opts) {
    if (this.skipAuth) return;
    if (!this._useSigV4)
      return buildHeaders_2([
        {
          Authorization: `Bearer ${this.apiKey}`,
        },
      ]);
    return;
  }
  validateHeaders() {}
  _shouldResolveDefaultCredentials() {
    return false;
  }
  getUserAgent() {
    return `AnthropicBedrockMantle/JS ${VERSION}`;
  }
  backendMiddleware() {
    return [
      async (request, next) =>
        next(
          await __classPrivateFieldGet_2(
            this,
            _AnthropicBedrockMantle_instances,
            "m",
            _AnthropicBedrockMantle_signRequest,
          ).call(this, request),
        ),
    ];
  }
}
//@ chunk-h87x8cg3.js:17524-18072 esm-fingerprint
_AnthropicBedrockMantle_instances = new WeakSet();
_AnthropicBedrockMantle_signRequest = async function (request) {
  if (this.skipAuth || !this._useSigV4) return request;
  let regionName = this.awsRegion;
  if (!regionName)
    throw new AnthropicError(
      "No AWS region found. Set `awsRegion` in the constructor or the `AWS_REGION` / `AWS_DEFAULT_REGION` environment variable.",
    );
  let headers = await getAuthHeaders_2(request, {
    url: request.url,
    regionName,
    serviceName: DEFAULT_SERVICE_NAME,
    awsAccessKey: this.awsAccessKey,
    awsSecretAccessKey: this.awsSecretAccessKey,
    awsSessionToken: this.awsSessionToken,
    awsProfile: this.awsProfile,
    providerChainResolver: this.providerChainResolver,
    logger: loggerFor(this),
  });
  return {
    ...request,
    headers: buildHeaders_2([request.headers, headers]).values,
  };
};
//@ chunk-h87x8cg3.js:18072-18133 esm-layout
function makeMantleBetaResource(client) {
  let { messages } = new Beta(client);
  return {
    messages,
  };
}
//@ chunk-qhhcfyds.js:4536-5142 esm-fingerprint
var re = function (receiver, state, kind, f) {
  if (kind === "a" && !f) throw TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver))
    throw TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _AnthropicBedrockMantle_instances_2;
var _AnthropicBedrockMantle_signRequest_2;
var DEFAULT_SERVICE_NAME_2 = "aws-external-anthropic";
var P = () =>
  new AnthropicError(
    "No AWS region or base URL found. Set `awsRegion` in the constructor, the `AWS_REGION` / `AWS_DEFAULT_REGION` environment variable, configure a `region` for your profile in `~/.aws/config`, or provide a `baseURL` / `ANTHROPIC_AWS_BASE_URL` environment variable.",
  );
//@ chunk-qhhcfyds.js:5142-7547 esm-layout
class U extends Anthropic {
  constructor({
    awsRegion: e,
    baseURL: t,
    apiKey: r,
    awsAccessKey: n = null,
    awsSecretAccessKey: o = null,
    awsSessionToken: i = null,
    awsProfile: s,
    providerChainResolver: a = null,
    workspaceId: R,
    skipAuth: c = false,
    credentials: x,
    config: B,
    profile: K,
    ...O
  } = {}) {
    let h = e ?? readEnv_3("AWS_REGION") ?? readEnv_3("AWS_DEFAULT_REGION");
    let l = t ?? readEnv_3("ANTHROPIC_AWS_BASE_URL");
    let y;
    if (l) y = l;
    else if (h) y = `https://aws-external-anthropic.${h}.api.aws`;
    else y = undefined;
    let W = r != null;
    if ((n != null) !== (o != null))
      throw new AnthropicError(
        "`awsAccessKey` and `awsSecretAccessKey` must be provided together. You provided only one.",
      );
    let G = n != null && o != null;
    let V = s != null;
    let u;
    if (W) u = r;
    else if (!G && !V) u = readEnv_3("ANTHROPIC_AWS_API_KEY") ?? undefined;
    let m = R ?? readEnv_3("ANTHROPIC_AWS_WORKSPACE_ID");
    if (!m && !c)
      throw new AnthropicError(
        "No workspace ID found. Set `workspaceId` in the constructor or the `ANTHROPIC_AWS_WORKSPACE_ID` environment variable.",
      );
    super({
      apiKey: u ?? null,
      authToken: null,
      baseURL: y,
      ...O,
      defaultHeaders: buildHeaders_3([
        O.defaultHeaders,
        {
          "anthropic-workspace-id": m,
        },
      ]),
    });
    _AnthropicBedrockMantle_instances_2.add(this);
    this.skipAuth = false;
    if (x != null || B != null || K != null)
      loggerFor_2(this).warn(
        "`credentials`, `config`, and `profile` are not supported by the AWS client and were ignored. Authenticate with `apiKey` or AWS credentials (SigV4) instead.",
      );
    this._baseURLIsExplicit = !!l;
    this.awsRegion = h;
    this.awsAccessKey = n;
    this.awsSecretAccessKey = o;
    this.awsSessionToken = i;
    this.awsProfile = s ?? null;
    this.providerChainResolver = a;
    this.workspaceId = m;
    this.skipAuth = c;
    this._useSigV4 = u == null;
    let _options = {
      ...this._options,
      apiKey: u ?? null,
      baseURL: l,
      awsRegion: e,
      awsAccessKey: n,
      awsSecretAccessKey: o,
      awsSessionToken: i,
      awsProfile: s,
      providerChainResolver: a,
      workspaceId: m,
      skipAuth: c,
    };
    this._options = _options;
    if (h || l || c) this.ready = Promise.resolve();
    else {
      this.ready = this._resolveRegionFromConfig(s).then((C) => {
        this.awsRegion = C;
        this.baseURL = `https://aws-external-anthropic.${C}.api.aws`;
      });
      this.ready.catch(() => {});
    }
  }
  _shouldResolveDefaultCredentials() {
    return false;
  }
  withOptions(e) {
    return super.withOptions({
      awsRegion: this.awsRegion,
      ...e,
    });
  }
  _resolveRegionFromConfig(e) {
    return import_node_config_provider.loadConfig(
      {
        ...import_index_native.NODE_REGION_CONFIG_OPTIONS,
        default: () => {
          throw P();
        },
      },
      {
        ...import_index_native.NODE_REGION_CONFIG_FILE_OPTIONS,
        ...(e && {
          profile: e,
        }),
      },
    )();
  }
  async prepareOptions(e) {
    await super.prepareOptions(e);
    await this.ready;
  }
  async authHeaders(e) {
    if (this.skipAuth) return;
    if (!this._useSigV4) return super.authHeaders(e);
    return;
  }
  validateHeaders() {}
  getUserAgent() {
    return `AnthropicAws/JS ${VERSION}`;
  }
  backendMiddleware() {
    return [
      async (e, t) =>
        t(
          await re(
            this,
            _AnthropicBedrockMantle_instances_2,
            "m",
            _AnthropicBedrockMantle_signRequest_2,
          ).call(this, e),
        ),
    ];
  }
}
//@ chunk-qhhcfyds.js:7547-7971 esm-fingerprint
_AnthropicBedrockMantle_instances_2 = new WeakSet();
_AnthropicBedrockMantle_signRequest_2 = async function (request) {
  if (this.skipAuth || !this._useSigV4) return request;
  if (!this.awsRegion) throw P();
  let headers = await getAuthHeaders(request, {
    url: request.url,
    regionName: this.awsRegion,
    serviceName: DEFAULT_SERVICE_NAME_2,
    awsAccessKey: this.awsAccessKey,
    awsSecretAccessKey: this.awsSecretAccessKey,
    awsSessionToken: this.awsSessionToken,
    awsProfile: this.awsProfile,
    providerChainResolver: this.providerChainResolver,
    logger: loggerFor_2(this),
  });
  return {
    ...request,
    headers: buildHeaders_3([request.headers, headers]).values,
  };
};

/**
 * _unknown/anthropic-google-cloud-client.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: _unknown/anthropic-google-cloud-client.js
 * pieces: chunk-mgs2qfsy.js (1)
 * attribution: placement 2
 */
import { Anthropic } from "../@anthropic-ai/sdk/client.mjs";
import { VERSION } from "../@anthropic-ai/bedrock-sdk/version.mjs";
import { AnthropicError } from "../@anthropic-ai/sdk/core/error.mjs";
import { readEnv_4 } from "../@anthropic-ai/bedrock-sdk/internal/utils/env.mjs";
import {
  CREDENTIAL_OPTIONS,
  GLOBAL,
  workspaceInvokeURL,
  NO_PROJECT_HINT,
  _AnthropicGoogleCloud_instances,
  _AnthropicGoogleCloud_bearerTokenProvider,
  _AnthropicGoogleCloud_googleAuth,
  _AnthropicGoogleCloud_authClient,
  _AnthropicGoogleCloud_authClientPromise,
  _AnthropicGoogleCloud_workspaceURL,
  _AnthropicGoogleCloud_organizationURL,
  HTTPS_UNRESOLVED_INVALID,
  __classPrivateFieldSet,
  organizationInvokeURL,
  import_google_auth_library,
  GOOGLE_CLOUD_PLATFORM_SCOPE,
  __classPrivateFieldGet,
  _AnthropicGoogleCloud_isBaseURLOverridden,
  ORGANIZATIONS_PATH_PREFIX,
  _AnthropicGoogleCloud_awaitReady,
  _AnthropicGoogleCloud_getBearerToken,
} from "../@anthropic-ai/bedrock-sdk/internal/decoders/line.mjs";
import { isAbsoluteURL } from "../@anthropic-ai/bedrock-sdk/internal/utils/values.mjs";
import { buildHeaders_2 } from "../@anthropic-ai/bedrock-sdk/internal/headers.mjs";
import { VERSION as VERSION_2 } from "../@anthropic-ai/sdk/version.mjs";

//@ chunk-mgs2qfsy.js:2859-6243 placement
class AnthropicGoogleCloud extends Anthropic {
  _instrumentationScope() {
    return {
      platform: "google-cloud",
      version: VERSION,
    };
  }
  get completions() {
    throw new AnthropicError(
      "The deprecated text Completions API is not available on Claude Platform on Google Cloud",
    );
  }
  set completions(value) {}
  constructor({
    baseURL = readEnv_4("ANTHROPIC_GOOGLE_CLOUD_BASE_URL"),
    project = readEnv_4("ANTHROPIC_GOOGLE_CLOUD_PROJECT") ?? readEnv_4("GOOGLE_CLOUD_PROJECT"),
    location = readEnv_4("ANTHROPIC_GOOGLE_CLOUD_LOCATION"),
    workspaceId = readEnv_4("ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID"),
    bearerTokenProvider,
    googleAuth,
    authClient,
    skipAuth = false,
    ...opts
  } = {}) {
    if (authClient && googleAuth)
      throw new AnthropicError(
        "The `authClient` and `googleAuth` arguments are mutually exclusive; only one can be passed at a time.",
      );
    if (skipAuth && (bearerTokenProvider || googleAuth || authClient))
      throw new AnthropicError(
        "The `skipAuth` option is mutually exclusive with `bearerTokenProvider`, `googleAuth`, and `authClient`; `skipAuth` disables authentication entirely.",
      );
    for (let credentialOption of CREDENTIAL_OPTIONS)
      if (opts[credentialOption] != null)
        throw new AnthropicError(
          `The \`${credentialOption}\` option is not supported by AnthropicGoogleCloud; authentication uses a Google bearer token (\`bearerTokenProvider\`, \`googleAuth\`/\`authClient\`, or Application Default Credentials).`,
        );
    location = location || GLOBAL;
    let resolvedBaseURL = baseURL;
    let projectMustResolve = false;
    if (!resolvedBaseURL)
      if (project) {
        if (workspaceId) resolvedBaseURL = workspaceInvokeURL(project, location, workspaceId);
      } else if (skipAuth) throw new AnthropicError(`No project was given. ${NO_PROJECT_HINT}`);
      else projectMustResolve = true;
    super({
      baseURL: resolvedBaseURL ?? null,
      ...opts,
      apiKey: null,
      authToken: null,
      ...{
        __auth: {
          provider: null,
          tokenCache: null,
          resolution: null,
          error: null,
          extraHeaders: {},
        },
      },
    });
    _AnthropicGoogleCloud_instances.add(this);
    _AnthropicGoogleCloud_bearerTokenProvider.set(this, undefined);
    _AnthropicGoogleCloud_googleAuth.set(this, undefined);
    _AnthropicGoogleCloud_authClient.set(this, undefined);
    _AnthropicGoogleCloud_authClientPromise.set(this, undefined);
    _AnthropicGoogleCloud_workspaceURL.set(this, undefined);
    _AnthropicGoogleCloud_organizationURL.set(this, HTTPS_UNRESOLVED_INVALID);
    this.project = project ?? null;
    this.location = location ?? null;
    this.workspaceId = workspaceId;
    this.skipAuth = skipAuth;
    __classPrivateFieldSet(this, _AnthropicGoogleCloud_bearerTokenProvider, bearerTokenProvider, "f");
    __classPrivateFieldSet(this, _AnthropicGoogleCloud_googleAuth, googleAuth ?? null, "f");
    __classPrivateFieldSet(this, _AnthropicGoogleCloud_authClient, authClient ?? null, "f");
    if (!baseURL) {
      __classPrivateFieldSet(
        this,
        _AnthropicGoogleCloud_workspaceURL,
        (this.baseURL = resolvedBaseURL ?? HTTPS_UNRESOLVED_INVALID),
        "f",
      );
      if (project)
        __classPrivateFieldSet(
          this,
          _AnthropicGoogleCloud_organizationURL,
          organizationInvokeURL(project, location),
          "f",
        );
    }
    let googleAuth_2;
    if (!skipAuth && !bearerTokenProvider)
      if (authClient)
        __classPrivateFieldSet(
          this,
          _AnthropicGoogleCloud_authClientPromise,
          Promise.resolve(authClient),
          "f",
        );
      else {
        googleAuth_2 =
          googleAuth ??
          new import_google_auth_library.GoogleAuth({
            scopes: GOOGLE_CLOUD_PLATFORM_SCOPE,
          });
        __classPrivateFieldSet(this, _AnthropicGoogleCloud_authClientPromise, googleAuth_2.getClient(), "f");
        __classPrivateFieldGet(this, _AnthropicGoogleCloud_authClientPromise, "f").catch(() => {});
      }
    if (!projectMustResolve) this.ready = Promise.resolve();
    else {
      let googleAuthInstance =
        googleAuth_2 ??
        googleAuth ??
        new import_google_auth_library.GoogleAuth({
          scopes: GOOGLE_CLOUD_PLATFORM_SCOPE,
          ...(authClient
            ? {
                authClient,
              }
            : {}),
        });
      let resolvedLocation = location;
      this.ready = googleAuthInstance.getProjectId().then(
        (projectId) => {
          this.project = projectId;
          if (
            __classPrivateFieldGet(
              this,
              _AnthropicGoogleCloud_instances,
              "m",
              _AnthropicGoogleCloud_isBaseURLOverridden,
            ).call(this)
          )
            return;
          __classPrivateFieldSet(
            this,
            _AnthropicGoogleCloud_organizationURL,
            organizationInvokeURL(projectId, resolvedLocation),
            "f",
          );
          if (workspaceId)
            __classPrivateFieldSet(
              this,
              _AnthropicGoogleCloud_workspaceURL,
              (this.baseURL = workspaceInvokeURL(projectId, resolvedLocation, workspaceId)),
              "f",
            );
        },
        (cause) => {
          let projectError = new AnthropicError(
            `No project was given and it could not be resolved from Google credentials. ${NO_PROJECT_HINT}`,
          );
          projectError.cause = cause;
          throw projectError;
        },
      );
      this.ready.catch(() => {});
    }
  }
  withOptions(options) {
    return super.withOptions({
      project: this.project ?? undefined,
      location: this.location ?? undefined,
      workspaceId: this.workspaceId,
      bearerTokenProvider: __classPrivateFieldGet(this, _AnthropicGoogleCloud_bearerTokenProvider, "f"),
      googleAuth: __classPrivateFieldGet(this, _AnthropicGoogleCloud_googleAuth, "f") ?? undefined,
      authClient: __classPrivateFieldGet(this, _AnthropicGoogleCloud_authClient, "f") ?? undefined,
      skipAuth: this.skipAuth,
      baseURL: __classPrivateFieldGet(
        this,
        _AnthropicGoogleCloud_instances,
        "m",
        _AnthropicGoogleCloud_isBaseURLOverridden,
      ).call(this)
        ? this.baseURL
        : undefined,
      ...options,
    });
  }
  buildURL(url, query, defaultBaseURL) {
    if (
      __classPrivateFieldGet(
        this,
        _AnthropicGoogleCloud_instances,
        "m",
        _AnthropicGoogleCloud_isBaseURLOverridden,
      ).call(this) ||
      isAbsoluteURL(url)
    )
      return super.buildURL(url, query, defaultBaseURL);
    if (url.startsWith(ORGANIZATIONS_PATH_PREFIX))
      return super.buildURL(
        __classPrivateFieldGet(this, _AnthropicGoogleCloud_organizationURL, "f") + url,
        query,
        defaultBaseURL,
      );
    if (!this.workspaceId)
      throw new AnthropicError(
        "No workspace ID found. Set `workspaceId` in the constructor or the `ANTHROPIC_GOOGLE_CLOUD_WORKSPACE_ID` environment variable.",
      );
    return super.buildURL(url, query, defaultBaseURL);
  }
  async prepareOptions(options) {
    await super.prepareOptions(options);
    await __classPrivateFieldGet(
      this,
      _AnthropicGoogleCloud_instances,
      "m",
      _AnthropicGoogleCloud_awaitReady,
    ).call(this);
  }
  async buildRequest(options, requestOptions = {}) {
    await __classPrivateFieldGet(
      this,
      _AnthropicGoogleCloud_instances,
      "m",
      _AnthropicGoogleCloud_awaitReady,
    ).call(this);
    return await super.buildRequest(options, requestOptions);
  }
  async authHeaders(opts) {
    if (this.skipAuth) return;
    let headers = buildHeaders_2([this._options.defaultHeaders, opts.headers]);
    if (headers.values.get("authorization") || headers.nulls.has("authorization")) return;
    let token = await __classPrivateFieldGet(
      this,
      _AnthropicGoogleCloud_instances,
      "m",
      _AnthropicGoogleCloud_getBearerToken,
    ).call(this);
    return buildHeaders_2([
      {
        Authorization: `Bearer ${token}`,
      },
    ]);
  }
  validateHeaders() {
    return;
  }
  getUserAgent() {
    return `AnthropicGoogleCloud/JS ${VERSION_2}`;
  }
}
export { AnthropicGoogleCloud };

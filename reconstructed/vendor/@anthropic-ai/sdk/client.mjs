/**
 * @anthropic-ai/sdk/client.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-layout 1
 */
import { readEnv } from "./internal/utils/env.mjs";
import { isRunningInBrowser, jur } from "./internal/detect-platform.mjs";
import {
  AnthropicError,
  APIError,
  APIUserAbortError,
  APIConnectionTimeoutError,
  APIConnectionError,
  NotFoundError,
  ConflictError,
  RateLimitError,
  BadRequestError,
  AuthenticationError,
  InternalServerError,
  PermissionDeniedError,
  UnprocessableEntityError,
} from "./core/error.mjs";
import { defaultLogLevel, parseLogLevel, loggerFor, debugLogRequestDetails } from "./internal/utils/log.mjs";
import { Do, ql, Ui, Uo } from "./internal/utils/values.mjs";
import { getDefaultFetch, CancelReadableStream, ReadableStreamFrom } from "./internal/shims.mjs";
import { __classPrivateFieldSet, __classPrivateFieldGet } from "./internal/tslib.mjs";
import { FallbackEncoder } from "./internal/request-options.mjs";
import { resolveCredentialsFromConfig, defaultCredentials } from "./lib/credentials/credential-chain.mjs";
import { wrapFetchWithMiddleware, isRetryableError, isFetchOriginError } from "./core/middleware.mjs";
import { TokenCache } from "./lib/credentials/token-cache.mjs";
import { buildHeaders } from "./internal/headers.mjs";
import { stringifyQuery } from "./internal/utils/query.mjs";
import { VERSION } from "./version.mjs";
import { OAUTH_API_BETA_HEADER } from "./lib/credentials/types.mjs";
import { APIPromise } from "./core/api-promise.mjs";
import { castToError, isAbortError_2 } from "./internal/errors.mjs";
import {
  releaseAbortListener,
  registerFinalizerCleanup,
  registerAbortListenerCleanup,
} from "./internal/request-signal.mjs";
import { PagePromise } from "./core/pagination.mjs";
import { sleepUnlessAborted } from "./tools/agent-toolset/memories.mjs";
import { toFile } from "./internal/to-file.mjs";
import { Completions } from "./resources/completions.mjs";
import { Messages_2 } from "./resources/messages/messages.mjs";
import { Models_2 } from "./resources/models.mjs";
import { Files_2 } from "./resources/files.mjs";
import { Skills_2 } from "./resources/skills/skills.mjs";
import { Beta } from "./resources/beta/beta.mjs";

//@ chunk-hwmsct5x.js:162129-177706 esm-layout
var _BaseAnthropic_instances;
var _a;
var _BaseAnthropic_encoder;
var _BaseAnthropic_baseURLOverridden;
var HUMAN_PROMPT = "\\n\\nHuman:";
var AI_PROMPT = "\\n\\nAssistant:";
var BaseAnthropic = (() => {
  class BaseAnthropic {
    get credentials() {
      return this._authState.provider;
    }
    constructor({
      baseURL = readEnv("ANTHROPIC_BASE_URL"),
      apiKey,
      authToken,
      webhookKey = readEnv("ANTHROPIC_WEBHOOK_SIGNING_KEY") ?? null,
      ...opts
    } = {}) {
      _BaseAnthropic_instances.add(this);
      this._requestAuthFlags = new WeakMap();
      _BaseAnthropic_encoder.set(this, undefined);
      if (apiKey === undefined) apiKey = opts.profile != null ? null : (readEnv("ANTHROPIC_API_KEY") ?? null);
      if (authToken === undefined)
        authToken = opts.profile != null ? null : (readEnv("ANTHROPIC_AUTH_TOKEN") ?? null);
      if (opts.profile != null && (opts.credentials != null || opts.config != null))
        throw TypeError("Pass at most one of `profile`, `credentials`, or `config`.");
      let options = {
        apiKey,
        authToken,
        webhookKey,
        ...opts,
        baseURL: baseURL || "https://api.anthropic.com",
      };
      if (!options.dangerouslyAllowBrowser && isRunningInBrowser())
        throw new AnthropicError(`It looks like you're running in a browser-like environment.

This is disabled by default, as it risks exposing your secret API credentials to attackers.
If you understand the risks and have appropriate mitigations in place,
you can set the \`dangerouslyAllowBrowser\` option to \`true\`, e.g.,

new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
`);
      this.baseURL = options.baseURL;
      this._baseURLIsExplicit = opts.__baseURLIsExplicit ?? !!baseURL;
      this.timeout = options.timeout ?? _a.DEFAULT_TIMEOUT;
      this.logger = options.logger ?? console;
      this.logLevel = defaultLogLevel;
      this.logLevel =
        parseLogLevel(options.logLevel, "ClientOptions.logLevel", loggerFor(this)) ??
        parseLogLevel(readEnv("ANTHROPIC_LOG"), "process.env['ANTHROPIC_LOG']", loggerFor(this)) ??
        defaultLogLevel;
      this.fetchOptions = options.fetchOptions;
      this.maxRetries = Do("maxRetries", options.maxRetries ?? 2);
      this.fetch = options.fetch ?? getDefaultFetch();
      __classPrivateFieldSet(this, _BaseAnthropic_encoder, FallbackEncoder, "f");
      this.middleware = [...(options.middleware ?? [])];
      let customHeadersEnv = readEnv("ANTHROPIC_CUSTOM_HEADERS");
      if (customHeadersEnv) {
        let parsed = {};
        for (let line of customHeadersEnv.split(`
`)) {
          let colon = line.indexOf(":");
          if (colon >= 0) parsed[line.substring(0, colon).trim()] = line.substring(colon + 1).trim();
        }
        options.defaultHeaders = {
          ...parsed,
          ...options.defaultHeaders,
        };
      }
      let inherited = opts.__auth;
      delete options.__auth;
      delete options.__baseURLIsExplicit;
      this._options = options;
      this.apiKey = typeof apiKey === "string" ? apiKey : null;
      this.authToken = authToken;
      this.webhookKey = webhookKey;
      if (inherited) {
        this._authState = inherited;
        if (!this._baseURLIsExplicit && inherited.baseURL) this.baseURL = inherited.baseURL;
      } else {
        this._authState = {
          provider: null,
          tokenCache: null,
          resolution: null,
          error: null,
          extraHeaders: {},
        };
        if (this.apiKey == null && this.authToken == null) {
          let credentials = options.credentials ?? null;
          if (credentials) {
            this._authState.provider = credentials;
            this._authState.tokenCache = this._makeTokenCache(credentials);
          } else if (options.config != null) {
            let result = resolveCredentialsFromConfig(options.config, this._credentialResolverOptions());
            this._authState.provider = result.provider;
            this._authState.tokenCache = this._makeTokenCache(result.provider);
            this._authState.extraHeaders = result.extraHeaders;
            this._applyCredentialBaseURL(result.baseURL);
          } else if (options.profile != null)
            this._authState.resolution = this._resolveDefaultCredentials(options.profile);
          else if (this._shouldResolveDefaultCredentials())
            this._authState.resolution = this._resolveDefaultCredentials();
        }
      }
    }
    _shouldResolveDefaultCredentials() {
      return true;
    }
    _applyCredentialBaseURL(baseURL) {
      if (!baseURL) return;
      let normalized = baseURL.replace(/\/+$/, "");
      this._authState.baseURL = normalized;
      if (!this._baseURLIsExplicit) this.baseURL = normalized;
    }
    _credentialResolverOptions() {
      return {
        baseURL: this.baseURL,
        fetch: this._credentialsFetch(),
        userAgent: this.getUserAgent(),
        onCacheWriteError: (err) => {
          loggerFor(this).debug("credential cache write failed (best-effort)", err);
        },
        onSafetyWarning: (msg) => {
          loggerFor(this).warn(msg);
        },
      };
    }
    _credentialsFetch() {
      return wrapFetchWithMiddleware(this.fetch, this.middleware, undefined, this);
    }
    _makeTokenCache(provider) {
      return new TokenCache(provider, (err) => {
        loggerFor(this).debug("advisory token refresh failed; serving cached token", err);
      });
    }
    withOptions(options) {
      let overridesStructuredAuth = "credentials" in options || "config" in options || "profile" in options;
      let overridesAuth = "apiKey" in options || "authToken" in options || overridesStructuredAuth;
      let internal = {
        ...this._options,
        ...(this._baseURLIsExplicit
          ? {
              baseURL: this.baseURL,
            }
          : {}),
        maxRetries: this.maxRetries,
        timeout: this.timeout,
        logger: this.logger,
        logLevel: this.logLevel,
        fetch: this.fetch,
        fetchOptions: this.fetchOptions,
        middleware: this.middleware,
        apiKey: this.apiKey,
        authToken: this.authToken,
        webhookKey: this.webhookKey,
        credentials: this.credentials,
        ...(overridesStructuredAuth
          ? {
              credentials: undefined,
              config: undefined,
              profile: undefined,
            }
          : {}),
        ...options,
        __auth: overridesAuth ? undefined : this._authState,
        __baseURLIsExplicit: "baseURL" in options ? true : this._baseURLIsExplicit,
      };
      return new this.constructor(internal);
    }
    async _resolveDefaultCredentials(profile) {
      try {
        let result = await defaultCredentials(this._credentialResolverOptions(), profile);
        if (result) {
          this._authState.provider = result.provider;
          this._authState.tokenCache = this._makeTokenCache(result.provider);
          this._authState.extraHeaders = result.extraHeaders;
          this._applyCredentialBaseURL(result.baseURL);
        } else if (profile != null)
          throw new AnthropicError(
            `Profile "${profile}" could not be resolved (no <config_dir>/configs/${profile}.json found).`,
          );
      } catch (err) {
        this._authState.error = err;
      } finally {
        this._authState.resolution = null;
      }
    }
    defaultQuery() {
      return this._options.defaultQuery;
    }
    validateHeaders({ values, nulls }) {
      if (values.get("x-api-key") || values.get("authorization")) return;
      if (this._authState.error) throw this._authState.error;
      if (this._authState.tokenCache || this._authState.resolution) return;
      if (this.apiKey && values.get("x-api-key")) return;
      if (nulls.has("x-api-key")) return;
      if (this.authToken && values.get("authorization")) return;
      if (nulls.has("authorization")) return;
      throw Error(
        'Could not resolve authentication method. Expected one of apiKey, authToken, credentials, config, or profile to be set. Or for one of the "X-Api-Key" or "Authorization" headers to be explicitly omitted',
      );
    }
    _authFlags(opts) {
      let flags = this._requestAuthFlags.get(opts);
      if (!flags) {
        flags = {
          usedTokenCache: false,
          didRefreshFor401: false,
        };
        this._requestAuthFlags.set(opts, flags);
      }
      return flags;
    }
    async authHeaders(opts) {
      if (this._authState.resolution) await this._authState.resolution;
      if (this._authState.error) return;
      if (this._authState.tokenCache && this.apiKey == null) {
        let token = await this._authState.tokenCache.getToken();
        this._authFlags(opts).usedTokenCache = true;
        return buildHeaders([
          {
            Authorization: `Bearer ${token}`,
          },
        ]);
      }
      return buildHeaders([await this.apiKeyAuth(opts), await this.bearerAuth(opts)]);
    }
    async apiKeyAuth(opts) {
      if (this.apiKey == null) return;
      return buildHeaders([
        {
          "X-Api-Key": this.apiKey,
        },
      ]);
    }
    async bearerAuth(opts) {
      if (this.authToken == null) return;
      return buildHeaders([
        {
          Authorization: `Bearer ${this.authToken}`,
        },
      ]);
    }
    stringifyQuery(query) {
      return stringifyQuery(query);
    }
    getUserAgent() {
      return `Anthropic/JS ${VERSION}`;
    }
    makeStatusError(status, error, message, headers) {
      return APIError.generate(status, error, message, headers);
    }
    buildURL(path, query, defaultBaseURL) {
      let baseURL =
        (!__classPrivateFieldGet(this, _BaseAnthropic_instances, "m", _BaseAnthropic_baseURLOverridden).call(
          this,
        ) &&
          defaultBaseURL) ||
        this.baseURL;
      let url = ql(path)
        ? new URL(path)
        : new URL(baseURL + (baseURL.endsWith("/") && path.startsWith("/") ? path.slice(1) : path));
      let defaultQuery = this.defaultQuery();
      let pathQuery = Object.fromEntries(url.searchParams);
      if (!Ui(defaultQuery) || !Ui(pathQuery))
        query = {
          ...pathQuery,
          ...defaultQuery,
          ...query,
        };
      if (typeof query === "object" && query && !Array.isArray(query))
        url.search = this.stringifyQuery(query);
      return url.toString();
    }
    _calculateNonstreamingTimeout(maxTokens) {
      if ((3600 * maxTokens) / 128000 > 600)
        throw new AnthropicError(
          "Streaming is required for operations that may take longer than 10 minutes. See https://github.com/anthropics/anthropic-sdk-typescript#streaming-responses for more details",
        );
      return 600000;
    }
    async prepareOptions(options) {}
    async prepareRequest(request, { url, options }) {
      if (this._authState.tokenCache && this.apiKey == null) {
        let headers = request.headers instanceof Headers ? request.headers : new Headers(request.headers);
        for (let [k, v] of Object.entries(this._authState.extraHeaders))
          if (!headers.has(k)) headers.set(k, v);
        let existing = headers
          .get("anthropic-beta")
          ?.split(",")
          .map((s) => s.trim());
        if (!existing?.includes(OAUTH_API_BETA_HEADER))
          headers.set("anthropic-beta", [...(existing ?? []), OAUTH_API_BETA_HEADER].join(","));
        request.headers = headers;
      }
    }
    backendMiddleware() {
      return [];
    }
    get(path, opts) {
      return this.methodRequest("get", path, opts);
    }
    post(path, opts) {
      return this.methodRequest("post", path, opts);
    }
    patch(path, opts) {
      return this.methodRequest("patch", path, opts);
    }
    put(path, opts) {
      return this.methodRequest("put", path, opts);
    }
    delete(path, opts) {
      return this.methodRequest("delete", path, opts);
    }
    methodRequest(method, path, opts) {
      return this.request(
        Promise.resolve(opts).then((opts) => ({
          method,
          path,
          ...opts,
        })),
      );
    }
    request(options, remainingRetries = null) {
      return new APIPromise(this, this.makeRequest(options, remainingRetries, undefined));
    }
    async makeRequest(optionsInput, retriesRemaining, retryOfRequestLogID) {
      let options = await optionsInput;
      let maxRetries = Do("maxRetries", options.maxRetries ?? this.maxRetries);
      if (this.isStreamBody(options.body)) maxRetries = 0;
      if (retriesRemaining == null) {
        retriesRemaining = maxRetries;
        this._requestAuthFlags.delete(options);
      }
      await this.prepareOptions(options);
      let { req, url, timeout } = await this.buildRequest(options, {
        retryCount: maxRetries - retriesRemaining,
      });
      let requestLogID = "log_" + ((Math.random() * 16777216) | 0).toString(16).padStart(6, "0");
      let retryLogStr = retryOfRequestLogID === undefined ? "" : `, retryOf: ${retryOfRequestLogID}`;
      let startTime = Date.now();
      if (options.signal?.aborted) throw new APIUserAbortError();
      let controller = new AbortController();
      let response = await this.fetchWithTimeout(url, req, timeout, controller, options, {
        requestLogID,
        retryOfRequestLogID,
      }).catch(castToError);
      let headersTime = Date.now();
      if (response instanceof globalThis.Error) {
        releaseAbortListener(controller);
        let retryMessage = `retrying, ${retriesRemaining} attempts remaining`;
        if (options.signal?.aborted) throw new APIUserAbortError();
        let isTimeout =
          isAbortError_2(response) ||
          /timed? ?out/i.test(String(response) + ("cause" in response ? String(response.cause) : ""));
        let hasMiddleware =
          this.middleware.length > 0 || !!options.middleware?.length || this.backendMiddleware().length > 0;
        if (hasMiddleware && !isTimeout && !isRetryableError(response)) {
          loggerFor(this).info(`[${requestLogID}] middleware error (not retryable)`);
          debugLogRequestDetails(loggerFor(this), `[${requestLogID}] middleware error (not retryable)`, {
            retryOfRequestLogID,
            url,
            durationMs: headersTime - startTime,
            message: response.message,
          });
          throw response;
        }
        if (retriesRemaining) {
          loggerFor(this).info(
            `[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} - ${retryMessage}`,
          );
          debugLogRequestDetails(
            loggerFor(this),
            `[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} (${retryMessage})`,
            {
              retryOfRequestLogID,
              url,
              durationMs: headersTime - startTime,
              message: response.message,
            },
          );
          return this.retryRequest(options, retriesRemaining, retryOfRequestLogID ?? requestLogID);
        }
        loggerFor(this).info(
          `[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} - error; no more retries left`,
        );
        debugLogRequestDetails(
          loggerFor(this),
          `[${requestLogID}] connection ${isTimeout ? "timed out" : "failed"} (error; no more retries left)`,
          {
            retryOfRequestLogID,
            url,
            durationMs: headersTime - startTime,
            message: response.message,
          },
        );
        if (isTimeout) throw new APIConnectionTimeoutError();
        if (hasMiddleware && !isFetchOriginError(response)) throw response;
        throw new APIConnectionError({
          cause: response,
        });
      }
      let specialHeaders = [...response.headers.entries()]
        .filter(([name]) => name === "request-id" || name === "anthropic-workspace-id")
        .map(([name, value]) => ", " + name + ": " + JSON.stringify(value))
        .join("");
      let responseInfo = `[${requestLogID}${retryLogStr}${specialHeaders}] ${req.method} ${url} ${response.ok ? "succeeded" : "failed"} with status ${response.status} in ${headersTime - startTime}ms`;
      if (!response.ok) {
        let shouldRetry = await this.shouldRetry(response, options);
        if (retriesRemaining && shouldRetry) {
          let retryMessage = `retrying, ${retriesRemaining} attempts remaining`;
          await CancelReadableStream(response.body);
          releaseAbortListener(controller);
          loggerFor(this).info(`${responseInfo} - ${retryMessage}`);
          debugLogRequestDetails(loggerFor(this), `[${requestLogID}] response error (${retryMessage})`, {
            retryOfRequestLogID,
            url: response.url,
            status: response.status,
            headers: response.headers,
            durationMs: headersTime - startTime,
          });
          return this.retryRequest(
            options,
            retriesRemaining,
            retryOfRequestLogID ?? requestLogID,
            response.headers,
          );
        }
        let retryMessage = shouldRetry ? "error; no more retries left" : "error; not retryable";
        loggerFor(this).info(`${responseInfo} - ${retryMessage}`);
        let errText = await response.text().catch((err) => castToError(err).message);
        let errJSON = Uo(errText);
        let errMessage = errJSON ? undefined : errText;
        debugLogRequestDetails(loggerFor(this), `[${requestLogID}] response error (${retryMessage})`, {
          retryOfRequestLogID,
          url: response.url,
          status: response.status,
          headers: response.headers,
          message: errMessage,
          durationMs: Date.now() - startTime,
        });
        releaseAbortListener(controller);
        throw this.makeStatusError(response.status, errJSON, errMessage, response.headers);
      }
      loggerFor(this).info(responseInfo);
      debugLogRequestDetails(loggerFor(this), `[${requestLogID}] response start`, {
        retryOfRequestLogID,
        url: response.url,
        status: response.status,
        headers: response.headers,
        durationMs: headersTime - startTime,
      });
      registerFinalizerCleanup(response.body ?? response, controller);
      return {
        response,
        options,
        controller,
        requestLogID,
        retryOfRequestLogID,
        startTime,
      };
    }
    getAPIList(path, Page, opts) {
      return this.requestAPIList(
        Page,
        opts && "then" in opts
          ? opts.then((opts) => ({
              method: "get",
              path,
              ...opts,
            }))
          : {
              method: "get",
              path,
              ...opts,
            },
      );
    }
    requestAPIList(Page, options) {
      let request = this.makeRequest(options, null, undefined);
      return new PagePromise(this, request, Page);
    }
    async fetchWithTimeout(url, init, ms, controller, requestOptions, logCtx) {
      let { signal, method, ...options } = init || {};
      let abort = this._makeAbort(controller);
      if (signal) {
        signal.addEventListener("abort", abort, {
          once: true,
        });
        registerAbortListenerCleanup(controller, signal, abort);
      }
      let isReadableBody =
        (globalThis.ReadableStream && options.body instanceof globalThis.ReadableStream) ||
        (typeof options.body === "object" && options.body !== null && Symbol.asyncIterator in options.body);
      let fetchOptions = {
        signal: controller.signal,
        ...(isReadableBody
          ? {
              duplex: "half",
            }
          : {}),
        method: "GET",
        ...options,
      };
      if (method) fetchOptions.method = method.toUpperCase();
      let baseFetch = this.fetch;
      let timedFetch = async (innerUrl, innerInit) => {
        let timeout = setTimeout(abort, ms);
        try {
          return await baseFetch.call(undefined, innerUrl, innerInit);
        } finally {
          clearTimeout(timeout);
        }
      };
      let innerFetch =
        requestOptions === undefined
          ? timedFetch
          : async (innerUrl, innerInit = {}) => {
              let innerUrlStr =
                typeof innerUrl === "string"
                  ? innerUrl
                  : innerUrl instanceof URL
                    ? innerUrl.href
                    : innerUrl.url;
              innerInit.headers =
                innerInit.headers instanceof Headers ? innerInit.headers : new Headers(innerInit.headers);
              await this.prepareRequest(innerInit, {
                url: innerUrlStr,
                options: requestOptions,
              });
              if (logCtx)
                debugLogRequestDetails(loggerFor(this), `[${logCtx.requestLogID}] sending request`, {
                  retryOfRequestLogID: logCtx.retryOfRequestLogID,
                  method: innerInit.method,
                  url: innerUrlStr,
                  options: requestOptions,
                  headers: innerInit.headers,
                });
              return timedFetch(innerUrl, innerInit);
            };
      let requestMiddleware = requestOptions?.middleware;
      let backendMiddleware = this.backendMiddleware();
      let allMiddleware =
        requestMiddleware?.length || backendMiddleware.length
          ? [...this.middleware, ...(requestMiddleware ?? []), ...backendMiddleware]
          : this.middleware;
      return await wrapFetchWithMiddleware(
        innerFetch,
        allMiddleware,
        requestOptions,
        this,
      )(url, fetchOptions);
    }
    async shouldRetry(response, options) {
      let flags = this._authFlags(options);
      if (
        response.status === 401 &&
        this._authState.tokenCache &&
        flags.usedTokenCache &&
        !flags.didRefreshFor401
      ) {
        flags.didRefreshFor401 = true;
        this._authState.tokenCache.invalidate();
        return true;
      }
      let shouldRetryHeader = response.headers.get("x-should-retry");
      if (shouldRetryHeader === "true") return true;
      if (shouldRetryHeader === "false") return false;
      if (response.status === 408) return true;
      if (response.status === 409) return true;
      if (response.status === 429) return true;
      if (response.status >= 500) return true;
      return false;
    }
    async retryRequest(options, retriesRemaining, requestLogID, responseHeaders) {
      let timeoutMillis;
      let retryAfterMillisHeader = responseHeaders?.get("retry-after-ms");
      if (retryAfterMillisHeader) {
        let timeoutMs = parseFloat(retryAfterMillisHeader);
        if (!Number.isNaN(timeoutMs)) timeoutMillis = timeoutMs;
      }
      let retryAfterHeader = responseHeaders?.get("retry-after");
      if (retryAfterHeader && !timeoutMillis) {
        let timeoutSeconds = parseFloat(retryAfterHeader);
        if (!Number.isNaN(timeoutSeconds)) timeoutMillis = timeoutSeconds * 1000;
        else timeoutMillis = Date.parse(retryAfterHeader) - Date.now();
      }
      if (timeoutMillis === undefined || !(timeoutMillis > 0 && timeoutMillis <= 2147483647)) {
        let maxRetries = options.maxRetries ?? this.maxRetries;
        timeoutMillis = this.calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries);
      }
      await sleepUnlessAborted(timeoutMillis, options.signal ?? undefined);
      return this.makeRequest(options, retriesRemaining - 1, requestLogID);
    }
    calculateDefaultRetryTimeoutMillis(retriesRemaining, maxRetries) {
      let y = maxRetries - retriesRemaining;
      let sleepSeconds = Math.min(0.5 * Math.pow(2, y), 8);
      let S = 1 - Math.random() * 0.25;
      return sleepSeconds * S * 1000;
    }
    calculateNonstreamingTimeout(maxTokens, maxNonstreamingTokens) {
      if (
        (3600000 * maxTokens) / 128000 > 600000 ||
        (maxNonstreamingTokens != null && maxTokens > maxNonstreamingTokens)
      )
        throw new AnthropicError(
          "Streaming is required for operations that may take longer than 10 minutes. See https://github.com/anthropics/anthropic-sdk-typescript#long-requests for more details",
        );
      return 600000;
    }
    async buildRequest(inputOptions, { retryCount = 0 } = {}) {
      let options = {
        ...inputOptions,
      };
      let { method, path, query, defaultBaseURL } = options;
      if (this._authState.resolution) await this._authState.resolution;
      if (!this._baseURLIsExplicit && this._authState.baseURL && this.baseURL !== this._authState.baseURL)
        this.baseURL = this._authState.baseURL;
      let url = this.buildURL(path, query, defaultBaseURL);
      if ("timeout" in options) Do("timeout", options.timeout);
      options.timeout = options.timeout ?? this.timeout;
      let { bodyHeaders, body } = this.buildBody({
        options,
      });
      let reqHeaders = await this.buildHeaders({
        options: inputOptions,
        method,
        bodyHeaders,
        retryCount,
      });
      return {
        req: {
          method,
          headers: reqHeaders,
          ...(options.signal && {
            signal: options.signal,
          }),
          ...(globalThis.ReadableStream &&
            body instanceof globalThis.ReadableStream && {
              duplex: "half",
            }),
          ...(body && {
            body,
          }),
          ...(this.fetchOptions ?? {}),
          ...(options.fetchOptions ?? {}),
        },
        url,
        timeout: options.timeout,
      };
    }
    async buildHeaders({ options, method, bodyHeaders, retryCount }) {
      let headers = buildHeaders([
        {
          Accept: "application/json",
          "User-Agent": this.getUserAgent(),
          "X-Stainless-Retry-Count": String(retryCount),
          ...(options.timeout
            ? {
                "X-Stainless-Timeout": String(Math.trunc(options.timeout / 1000)),
              }
            : {}),
          ...jur(),
          ...(this._options.dangerouslyAllowBrowser
            ? {
                "anthropic-dangerous-direct-browser-access": "true",
              }
            : undefined),
          "anthropic-version": "2023-06-01",
        },
        await this.authHeaders(options),
        this._options.defaultHeaders,
        bodyHeaders,
        options.headers,
      ]);
      this.validateHeaders(headers);
      return headers.values;
    }
    _makeAbort(controller) {
      return () => controller.abort();
    }
    buildBody({ options: { body, headers: rawHeaders } }) {
      if (!body)
        return {
          bodyHeaders: undefined,
          body: undefined,
        };
      let headers = buildHeaders([rawHeaders]);
      if (
        ArrayBuffer.isView(body) ||
        body instanceof ArrayBuffer ||
        body instanceof DataView ||
        (typeof body === "string" && headers.values.has("content-type")) ||
        (globalThis.Blob && body instanceof globalThis.Blob) ||
        body instanceof FormData ||
        body instanceof URLSearchParams ||
        (globalThis.ReadableStream && body instanceof globalThis.ReadableStream)
      )
        return {
          bodyHeaders: undefined,
          body,
        };
      else if (this.isStreamBody(body))
        return {
          bodyHeaders: undefined,
          body: ReadableStreamFrom(body),
        };
      else if (
        typeof body === "object" &&
        headers.values.get("content-type") === "application/x-www-form-urlencoded"
      )
        return {
          bodyHeaders: {
            "content-type": "application/x-www-form-urlencoded",
          },
          body: this.stringifyQuery(body),
        };
      else
        return __classPrivateFieldGet(this, _BaseAnthropic_encoder, "f").call(this, {
          body,
          headers,
        });
    }
    isStreamBody(body) {
      if (globalThis.ReadableStream && body instanceof globalThis.ReadableStream) return true;
      return (
        typeof body === "object" &&
        body !== null &&
        (Symbol.asyncIterator in body ||
          (Symbol.iterator in body && "next" in body && typeof body.next === "function"))
      );
    }
  }
  _a = BaseAnthropic;
  _BaseAnthropic_encoder = new WeakMap();
  _BaseAnthropic_instances = new WeakSet();
  _BaseAnthropic_baseURLOverridden = function () {
    return this.baseURL !== "https://api.anthropic.com";
  };
  BaseAnthropic.Anthropic = _a;
  BaseAnthropic.HUMAN_PROMPT = HUMAN_PROMPT;
  BaseAnthropic.AI_PROMPT = AI_PROMPT;
  BaseAnthropic.DEFAULT_TIMEOUT = 600000;
  BaseAnthropic.AnthropicError = AnthropicError;
  BaseAnthropic.APIError = APIError;
  BaseAnthropic.APIConnectionError = APIConnectionError;
  BaseAnthropic.APIConnectionTimeoutError = APIConnectionTimeoutError;
  BaseAnthropic.APIUserAbortError = APIUserAbortError;
  BaseAnthropic.NotFoundError = NotFoundError;
  BaseAnthropic.ConflictError = ConflictError;
  BaseAnthropic.RateLimitError = RateLimitError;
  BaseAnthropic.BadRequestError = BadRequestError;
  BaseAnthropic.AuthenticationError = AuthenticationError;
  BaseAnthropic.InternalServerError = InternalServerError;
  BaseAnthropic.PermissionDeniedError = PermissionDeniedError;
  BaseAnthropic.UnprocessableEntityError = UnprocessableEntityError;
  BaseAnthropic.toFile = toFile;
  return BaseAnthropic;
})();
var Anthropic = (() => {
  class Anthropic extends BaseAnthropic {
    constructor() {
      super(...arguments);
      this.completions = new Completions(this);
      this.messages = new Messages_2(this);
      this.models = new Models_2(this);
      this.files = new Files_2(this);
      this.skills = new Skills_2(this);
      this.beta = new Beta(this);
    }
  }
  Anthropic.Completions = Completions;
  Anthropic.Messages = Messages_2;
  Anthropic.Models = Models_2;
  Anthropic.Files = Files_2;
  Anthropic.Skills = Skills_2;
  Anthropic.Beta = Beta;
  return Anthropic;
})();
export { Anthropic, BaseAnthropic };

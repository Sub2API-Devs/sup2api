/**
 * @smithy/core/dist-cjs/submodules/retry/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/core@3.30.0
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_index_browser, require_index_browser_2 } from "./index.browser.js";
import { require_protocol_http as require_protocol_http_3 } from "../../../../protocol-http/dist-cjs/index.js";
import { require_v4, require_isStreamingPayload } from "../../../index.js";
import { require_util_middleware } from "../../../../util-middleware/dist-cjs/index.js";
import { require_client as require_client_3 } from "../client/index.js";

//@ chunk-edce4vxq.js:128507-134734 cjs-fingerprint
var require_retry = __commonJS(function (cjsExports) {
  var retryableErrorCodes = require_index_browser();
  var protocolHttp = require_protocol_http_3();
  var utilRetry = require_index_browser_2();
  var v4 = require_v4();
  var utilMiddleware = require_util_middleware();
  var client = require_client_3();
  var streamingPayload = require_isStreamingPayload();
  var createRetryQuota = (initialCapacity, options) => {
    let maxCapacity = initialCapacity;
    let { NO_RETRY_INCREMENT, RETRY_COST, TIMEOUT_RETRY_COST } = retryableErrorCodes;
    let availableCapacity = initialCapacity;
    let getCapacityAmount = (error) => (error.name === "TimeoutError" ? TIMEOUT_RETRY_COST : RETRY_COST);
    let hasRetryTokens = (error) => getCapacityAmount(error) <= availableCapacity;
    return Object.freeze({
      hasRetryTokens,
      retrieveRetryTokens: (error) => {
        if (!hasRetryTokens(error)) throw Error("No retry token available");
        let retryCost = getCapacityAmount(error);
        availableCapacity -= retryCost;
        return retryCost;
      },
      releaseRetryTokens: (retryCost) => {
        availableCapacity += retryCost ?? NO_RETRY_INCREMENT;
        availableCapacity = Math.min(availableCapacity, maxCapacity);
      },
    });
  };
  var defaultDelayDecider = (delayBase, attempts) =>
    Math.floor(Math.min(retryableErrorCodes.MAXIMUM_RETRY_DELAY, Math.random() * 2 ** attempts * delayBase));
  var defaultRetryDecider = (error) => {
    if (!error) return false;
    return (
      utilRetry.isRetryableByTrait(error) ||
      utilRetry.isClockSkewError(error) ||
      utilRetry.isThrottlingError(error) ||
      utilRetry.isTransientError(error)
    );
  };
  var asSdkError = (error) => {
    if (error instanceof Error) return error;
    if (error instanceof Object) return Object.assign(Error(), error);
    if (typeof error === "string") return Error(error);
    return Error(`AWS SDK error wrapper for ${error}`);
  };
  class StandardRetryStrategy {
    maxAttemptsProvider;
    retryDecider;
    delayDecider;
    retryQuota;
    mode = retryableErrorCodes.RETRY_MODES.STANDARD;
    constructor(maxAttemptsProvider, options) {
      this.maxAttemptsProvider = maxAttemptsProvider;
      this.retryDecider = options?.retryDecider ?? defaultRetryDecider;
      this.delayDecider = options?.delayDecider ?? defaultDelayDecider;
      this.retryQuota = options?.retryQuota ?? createRetryQuota(retryableErrorCodes.INITIAL_RETRY_TOKENS);
    }
    shouldRetry(error, attempts, maxAttempts) {
      return attempts < maxAttempts && this.retryDecider(error) && this.retryQuota.hasRetryTokens(error);
    }
    async getMaxAttempts() {
      let maxAttempts;
      try {
        maxAttempts = await this.maxAttemptsProvider();
      } catch (error) {
        maxAttempts = retryableErrorCodes.DEFAULT_MAX_ATTEMPTS;
      }
      return maxAttempts;
    }
    async retry(next, args, options) {
      let retryTokenAmount;
      let attempts = 0;
      let totalDelay = 0;
      let maxAttempts = await this.getMaxAttempts();
      let { request } = args;
      if (protocolHttp.HttpRequest.isInstance(request))
        request.headers[retryableErrorCodes.INVOCATION_ID_HEADER] = v4.v4();
      while (true)
        try {
          if (protocolHttp.HttpRequest.isInstance(request))
            request.headers[retryableErrorCodes.REQUEST_HEADER] =
              `attempt=${attempts + 1}; max=${maxAttempts}`;
          if (options?.beforeRequest) await options.beforeRequest();
          let { response, output } = await next(args);
          if (options?.afterRequest) options.afterRequest(response);
          this.retryQuota.releaseRetryTokens(retryTokenAmount);
          output.$metadata.attempts = attempts + 1;
          output.$metadata.totalRetryDelay = totalDelay;
          return {
            response,
            output,
          };
        } catch (e) {
          let err = asSdkError(e);
          attempts++;
          if (this.shouldRetry(err, attempts, maxAttempts)) {
            retryTokenAmount = this.retryQuota.retrieveRetryTokens(err);
            let delayFromDecider = this.delayDecider(
              utilRetry.isThrottlingError(err)
                ? retryableErrorCodes.THROTTLING_RETRY_DELAY_BASE
                : retryableErrorCodes.DEFAULT_RETRY_DELAY_BASE,
              attempts,
            );
            let delayFromResponse = getDelayFromRetryAfterHeader(err.$response);
            let delay = Math.max(delayFromResponse || 0, delayFromDecider);
            totalDelay += delay;
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }
          if (!err.$metadata) err.$metadata = {};
          err.$metadata.attempts = attempts;
          err.$metadata.totalRetryDelay = totalDelay;
          throw err;
        }
    }
  }
  var getDelayFromRetryAfterHeader = (response) => {
    if (!protocolHttp.HttpResponse.isInstance(response)) return;
    let retryAfterHeaderName = Object.keys(response.headers).find(
      (key) => key.toLowerCase() === "retry-after",
    );
    if (!retryAfterHeaderName) return;
    let retryAfterHeader = response.headers[retryAfterHeaderName];
    let retryAfterSeconds = Number(retryAfterHeader);
    if (!Number.isNaN(retryAfterSeconds)) return retryAfterSeconds * 1000;
    return new Date(retryAfterHeader).getTime() - Date.now();
  };
  class AdaptiveRetryStrategy extends StandardRetryStrategy {
    rateLimiter;
    constructor(maxAttemptsProvider, options) {
      let { rateLimiter, ...superOptions } = options ?? {};
      super(maxAttemptsProvider, superOptions);
      this.rateLimiter = rateLimiter ?? new retryableErrorCodes.DefaultRateLimiter();
      this.mode = retryableErrorCodes.RETRY_MODES.ADAPTIVE;
    }
    async retry(next, args) {
      return super.retry(next, args, {
        beforeRequest: async () => this.rateLimiter.getSendToken(),
        afterRequest: (response) => {
          this.rateLimiter.updateClientSendingRate(response);
        },
      });
    }
  }
  var ENV_MAX_ATTEMPTS = "AWS_MAX_ATTEMPTS";
  var CONFIG_MAX_ATTEMPTS = "max_attempts";
  var NODE_MAX_ATTEMPT_CONFIG_OPTIONS = {
    environmentVariableSelector: (env) => {
      let rawValue = env[ENV_MAX_ATTEMPTS];
      if (!rawValue) return;
      let value = parseInt(rawValue);
      if (Number.isNaN(value))
        throw Error(`Environment variable ${ENV_MAX_ATTEMPTS} mast be a number, got "${rawValue}"`);
      return value;
    },
    configFileSelector: (configFile) => {
      let rawValue = configFile[CONFIG_MAX_ATTEMPTS];
      if (!rawValue) return;
      let value = parseInt(rawValue);
      if (Number.isNaN(value))
        throw Error(`Shared config file entry ${CONFIG_MAX_ATTEMPTS} mast be a number, got "${rawValue}"`);
      return value;
    },
    default: retryableErrorCodes.DEFAULT_MAX_ATTEMPTS,
  };
  var resolveRetryConfig = (input) => {
    let { retryStrategy, retryMode, maxAttempts } = input;
    let maxAttemptsProvider = utilMiddleware.normalizeProvider(
      maxAttempts ?? retryableErrorCodes.DEFAULT_MAX_ATTEMPTS,
    );
    return Object.assign(input, {
      maxAttempts: maxAttemptsProvider,
      retryStrategy: async () => {
        if (retryStrategy) return retryStrategy;
        if (
          (await utilMiddleware.normalizeProvider(retryMode)()) === retryableErrorCodes.RETRY_MODES.ADAPTIVE
        )
          return new retryableErrorCodes.AdaptiveRetryStrategy(maxAttemptsProvider);
        return new retryableErrorCodes.StandardRetryStrategy(maxAttemptsProvider);
      },
    });
  };
  var ENV_RETRY_MODE = "AWS_RETRY_MODE";
  var CONFIG_RETRY_MODE = "retry_mode";
  var NODE_RETRY_MODE_CONFIG_OPTIONS = {
    environmentVariableSelector: (env) => env[ENV_RETRY_MODE],
    configFileSelector: (error) => error[CONFIG_RETRY_MODE],
    default: retryableErrorCodes.DEFAULT_RETRY_MODE,
  };
  var omitRetryHeadersMiddleware = () => (next) => async (args) => {
    let { request } = args;
    if (protocolHttp.HttpRequest.isInstance(request)) {
      delete request.headers[retryableErrorCodes.INVOCATION_ID_HEADER];
      delete request.headers[retryableErrorCodes.REQUEST_HEADER];
    }
    return next(args);
  };
  var omitRetryHeadersMiddlewareOptions = {
    name: "omitRetryHeadersMiddleware",
    tags: ["RETRY", "HEADERS", "OMIT_RETRY_HEADERS"],
    relation: "before",
    toMiddleware: "awsAuthMiddleware",
    override: true,
  };
  var getOmitRetryHeadersPlugin = (config) => ({
    applyToStack: (clientStack) => {
      clientStack.addRelativeTo(omitRetryHeadersMiddleware(), omitRetryHeadersMiddlewareOptions);
    },
  });
  var retryMiddleware = (options) => (next, context) => async (args) => {
    let retryStrategy = await options.retryStrategy();
    let maxAttempts = await options.maxAttempts();
    if (isRetryStrategyV2(retryStrategy)) {
      retryStrategy = retryStrategy;
      let retryToken = await retryStrategy.acquireInitialRetryToken(context.partition_id);
      let lastError = Error();
      let attempts = 0;
      let totalRetryDelay = 0;
      let { request } = args;
      let isRequest = protocolHttp.HttpRequest.isInstance(request);
      if (isRequest) request.headers[retryableErrorCodes.INVOCATION_ID_HEADER] = v4.v4();
      while (true)
        try {
          if (isRequest)
            request.headers[retryableErrorCodes.REQUEST_HEADER] =
              `attempt=${attempts + 1}; max=${maxAttempts}`;
          let { response, output } = await next(args);
          retryStrategy.recordSuccess(retryToken);
          output.$metadata.attempts = attempts + 1;
          output.$metadata.totalRetryDelay = totalRetryDelay;
          return {
            response,
            output,
          };
        } catch (e) {
          let retryErrorInfo = getRetryErrorInfo(e);
          lastError = asSdkError(e);
          if (isRequest && streamingPayload.isStreamingPayload(request)) {
            (context.logger instanceof client.NoOpLogger ? console : context.logger)?.warn(
              "An error was encountered in a non-retryable streaming request.",
            );
            throw lastError;
          }
          try {
            retryToken = await retryStrategy.refreshRetryTokenForRetry(retryToken, retryErrorInfo);
          } catch (error) {
            if (!lastError.$metadata) lastError.$metadata = {};
            lastError.$metadata.attempts = attempts + 1;
            lastError.$metadata.totalRetryDelay = totalRetryDelay;
            throw lastError;
          }
          attempts = retryToken.getRetryCount();
          let retryDelay = retryToken.getRetryDelay();
          totalRetryDelay += retryDelay;
          await new Promise((resolve) => setTimeout(resolve, retryDelay));
        }
    } else {
      retryStrategy = retryStrategy;
      if (retryStrategy?.mode)
        context.userAgent = [...(context.userAgent || []), ["cfg/retry-mode", retryStrategy.mode]];
      return retryStrategy.retry(next, args);
    }
  };
  var isRetryStrategyV2 = (retryStrategy) =>
    typeof retryStrategy.acquireInitialRetryToken !== "undefined" &&
    typeof retryStrategy.refreshRetryTokenForRetry !== "undefined" &&
    typeof retryStrategy.recordSuccess !== "undefined";
  var getRetryErrorInfo = (error) => {
    let errorInfo = {
      error,
      errorType: determineRetryErrorType(error),
    };
    let retryAfterHint = getRetryAfterHint(error.$response);
    if (retryAfterHint) errorInfo.retryAfterHint = retryAfterHint;
    return errorInfo;
  };
  var determineRetryErrorType = (error) => {
    if (utilRetry.isThrottlingError(error)) return "THROTTLING";
    if (utilRetry.isTransientError(error)) return "TRANSIENT";
    if (utilRetry.isServerError(error)) return "SERVER_ERROR";
    return "CLIENT_ERROR";
  };
  var retryMiddlewareOptions = {
    name: "retryMiddleware",
    tags: ["RETRY"],
    step: "finalizeRequest",
    priority: "high",
    override: true,
  };
  var getRetryPlugin = (options) => ({
    applyToStack: (clientStack) => {
      clientStack.add(retryMiddleware(options), retryMiddlewareOptions);
    },
  });
  var getRetryAfterHint = (response) => {
    if (!protocolHttp.HttpResponse.isInstance(response)) return;
    let found = Object.keys(response.headers).find((key) => key.toLowerCase() === "retry-after");
    if (!found) return;
    let retryAfter = response.headers[found];
    let retryAfterSeconds = Number(retryAfter);
    if (!Number.isNaN(retryAfterSeconds)) return new Date(retryAfterSeconds * 1000);
    return new Date(retryAfter);
  };
  cjsExports.AdaptiveRetryStrategy = AdaptiveRetryStrategy;
  cjsExports.CONFIG_MAX_ATTEMPTS = CONFIG_MAX_ATTEMPTS;
  cjsExports.CONFIG_RETRY_MODE = CONFIG_RETRY_MODE;
  cjsExports.ENV_MAX_ATTEMPTS = ENV_MAX_ATTEMPTS;
  cjsExports.ENV_RETRY_MODE = ENV_RETRY_MODE;
  cjsExports.NODE_MAX_ATTEMPT_CONFIG_OPTIONS = NODE_MAX_ATTEMPT_CONFIG_OPTIONS;
  cjsExports.NODE_RETRY_MODE_CONFIG_OPTIONS = NODE_RETRY_MODE_CONFIG_OPTIONS;
  cjsExports.StandardRetryStrategy = StandardRetryStrategy;
  cjsExports.defaultDelayDecider = defaultDelayDecider;
  cjsExports.defaultRetryDecider = defaultRetryDecider;
  cjsExports.getOmitRetryHeadersPlugin = getOmitRetryHeadersPlugin;
  cjsExports.getRetryAfterHint = getRetryAfterHint;
  cjsExports.getRetryPlugin = getRetryPlugin;
  cjsExports.omitRetryHeadersMiddleware = omitRetryHeadersMiddleware;
  cjsExports.omitRetryHeadersMiddlewareOptions = omitRetryHeadersMiddlewareOptions;
  cjsExports.resolveRetryConfig = resolveRetryConfig;
  cjsExports.retryMiddleware = retryMiddleware;
  cjsExports.retryMiddlewareOptions = retryMiddlewareOptions;
});
export { require_retry };

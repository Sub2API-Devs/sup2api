/**
 * @smithy/core/dist-cjs/submodules/retry/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/core@3.30.0
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { require_index_browser, require_index_browser_2 } from "./index.browser.js";
import { require_protocol_http } from "../../../../protocol-http/dist-cjs/index.js";
import { Jns, Dn } from "../../../index.js";
import { require_util_middleware } from "../../../../util-middleware/dist-cjs/index.js";
import { require_client } from "../client/index.js";

//@ chunk-edce4vxq.js:128507-134734 cjs-fingerprint
var require_retry = x(function (cjsExports) {
  var j = require_index_browser();
  var Me = require_protocol_http();
  var ye = require_index_browser_2();
  var v4 = Jns();
  var Pn = require_util_middleware();
  var gl = require_client();
  var yl = Dn();
  var El = (e, t) => {
    let r = e;
    let { NO_RETRY_INCREMENT, RETRY_COST, TIMEOUT_RETRY_COST } = j;
    let c = e;
    let d = (N) => (N.name === "TimeoutError" ? TIMEOUT_RETRY_COST : RETRY_COST);
    let f = (N) => d(N) <= c;
    return Object.freeze({
      hasRetryTokens: f,
      retrieveRetryTokens: (N) => {
        if (!f(N)) throw Error("No retry token available");
        let b = d(N);
        c -= b;
        return b;
      },
      releaseRetryTokens: (N) => {
        c += N ?? NO_RETRY_INCREMENT;
        c = Math.min(c, r);
      },
    });
  };
  var defaultDelayDecider = (e, t) => Math.floor(Math.min(j.MAXIMUM_RETRY_DELAY, Math.random() * 2 ** t * e));
  var defaultRetryDecider = (e) => {
    if (!e) return false;
    return (
      ye.isRetryableByTrait(e) || ye.isClockSkewError(e) || ye.isThrottlingError(e) || ye.isTransientError(e)
    );
  };
  var asSdkError = (e) => {
    if (e instanceof Error) return e;
    if (e instanceof Object) return Object.assign(Error(), e);
    if (typeof e === "string") return Error(e);
    return Error(`AWS SDK error wrapper for ${e}`);
  };
  class StandardRetryStrategy {
    maxAttemptsProvider;
    retryDecider;
    delayDecider;
    retryQuota;
    mode = j.RETRY_MODES.STANDARD;
    constructor(maxAttemptsProvider, options) {
      this.maxAttemptsProvider = maxAttemptsProvider;
      this.retryDecider = options?.retryDecider ?? defaultRetryDecider;
      this.delayDecider = options?.delayDecider ?? defaultDelayDecider;
      this.retryQuota = options?.retryQuota ?? El(j.INITIAL_RETRY_TOKENS);
    }
    shouldRetry(error, attempts, maxAttempts) {
      return attempts < maxAttempts && this.retryDecider(error) && this.retryQuota.hasRetryTokens(error);
    }
    async getMaxAttempts() {
      let maxAttempts;
      try {
        maxAttempts = await this.maxAttemptsProvider();
      } catch (error) {
        maxAttempts = j.DEFAULT_MAX_ATTEMPTS;
      }
      return maxAttempts;
    }
    async retry(next, args, options) {
      let retryTokenAmount;
      let attempts = 0;
      let totalDelay = 0;
      let maxAttempts = await this.getMaxAttempts();
      let { request } = args;
      if (Me.HttpRequest.isInstance(request)) request.headers[j.INVOCATION_ID_HEADER] = v4.v4();
      while (true)
        try {
          if (Me.HttpRequest.isInstance(request))
            request.headers[j.REQUEST_HEADER] = `attempt=${attempts + 1}; max=${maxAttempts}`;
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
              ye.isThrottlingError(err) ? j.THROTTLING_RETRY_DELAY_BASE : j.DEFAULT_RETRY_DELAY_BASE,
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
    if (!Me.HttpResponse.isInstance(response)) return;
    let retryAfterHeaderName = Object.keys(response.headers).find(
      (key) => key.toLowerCase() === "retry-after",
    );
    if (!retryAfterHeaderName) return;
    let r = response.headers[retryAfterHeaderName];
    let s = Number(r);
    if (!Number.isNaN(s)) return s * 1000;
    return new Date(r).getTime() - Date.now();
  };
  class Bn extends StandardRetryStrategy {
    rateLimiter;
    constructor(maxAttemptsProvider, options) {
      let { rateLimiter, ...superOptions } = options ?? {};
      super(maxAttemptsProvider, superOptions);
      this.rateLimiter = rateLimiter ?? new j.DefaultRateLimiter();
      this.mode = j.RETRY_MODES.ADAPTIVE;
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
  var ur = "AWS_MAX_ATTEMPTS";
  var lr = "max_attempts";
  var wl = {
    environmentVariableSelector: (e) => {
      let t = e[ur];
      if (!t) return;
      let r = parseInt(t);
      if (Number.isNaN(r)) throw Error(`Environment variable ${ur} mast be a number, got "${t}"`);
      return r;
    },
    configFileSelector: (e) => {
      let t = e[lr];
      if (!t) return;
      let r = parseInt(t);
      if (Number.isNaN(r)) throw Error(`Shared config file entry ${lr} mast be a number, got "${t}"`);
      return r;
    },
    default: j.DEFAULT_MAX_ATTEMPTS,
  };
  var resolveRetryConfig = (e) => {
    let { retryStrategy, retryMode, maxAttempts } = e;
    let o = Pn.normalizeProvider(maxAttempts ?? j.DEFAULT_MAX_ATTEMPTS);
    return Object.assign(e, {
      maxAttempts: o,
      retryStrategy: async () => {
        if (retryStrategy) return retryStrategy;
        if ((await Pn.normalizeProvider(retryMode)()) === j.RETRY_MODES.ADAPTIVE)
          return new j.AdaptiveRetryStrategy(o);
        return new j.StandardRetryStrategy(o);
      },
    });
  };
  var Ln = "AWS_RETRY_MODE";
  var Un = "retry_mode";
  var bl = {
    environmentVariableSelector: (e) => e[Ln],
    configFileSelector: (error) => error[Un],
    default: j.DEFAULT_RETRY_MODE,
  };
  var Vn = () => (e) => async (t) => {
    let { request } = t;
    if (Me.HttpRequest.isInstance(request)) {
      delete request.headers[j.INVOCATION_ID_HEADER];
      delete request.headers[j.REQUEST_HEADER];
    }
    return e(t);
  };
  var Fn = {
    name: "omitRetryHeadersMiddleware",
    tags: ["RETRY", "HEADERS", "OMIT_RETRY_HEADERS"],
    relation: "before",
    toMiddleware: "awsAuthMiddleware",
    override: true,
  };
  var getOmitRetryHeadersPlugin = (e) => ({
    applyToStack: (t) => {
      t.addRelativeTo(Vn(), Fn);
    },
  });
  var jn = (options) => (next, context) => async (args) => {
    let retryStrategy = await options.retryStrategy();
    let maxAttempts = await options.maxAttempts();
    if (Tl(retryStrategy)) {
      retryStrategy = retryStrategy;
      let retryToken = await retryStrategy.acquireInitialRetryToken(context.partition_id);
      let lastError = Error();
      let attempts = 0;
      let totalRetryDelay = 0;
      let { request } = args;
      let isRequest = Me.HttpRequest.isInstance(request);
      if (isRequest) request.headers[j.INVOCATION_ID_HEADER] = v4.v4();
      while (true)
        try {
          if (isRequest) request.headers[j.REQUEST_HEADER] = `attempt=${attempts + 1}; max=${maxAttempts}`;
          let { response, output } = await next(args);
          retryStrategy.recordSuccess(retryToken);
          output.$metadata.attempts = attempts + 1;
          output.$metadata.totalRetryDelay = totalRetryDelay;
          return {
            response,
            output,
          };
        } catch (e) {
          let retryErrorInfo = _l(e);
          lastError = asSdkError(e);
          if (isRequest && yl.isStreamingPayload(request)) {
            (context.logger instanceof gl.NoOpLogger ? console : context.logger)?.warn(
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
          let _ = retryToken.getRetryDelay();
          totalRetryDelay += _;
          await new Promise((resolve) => setTimeout(resolve, _));
        }
    } else {
      retryStrategy = retryStrategy;
      if (retryStrategy?.mode)
        context.userAgent = [...(context.userAgent || []), ["cfg/retry-mode", retryStrategy.mode]];
      return retryStrategy.retry(next, args);
    }
  };
  var Tl = (retryStrategy) =>
    typeof retryStrategy.acquireInitialRetryToken !== "undefined" &&
    typeof retryStrategy.refreshRetryTokenForRetry !== "undefined" &&
    typeof retryStrategy.recordSuccess !== "undefined";
  var _l = (error) => {
    let errorInfo = {
      error,
      errorType: Cl(error),
    };
    let retryAfterHint = Hn(error.$response);
    if (retryAfterHint) errorInfo.retryAfterHint = retryAfterHint;
    return errorInfo;
  };
  var Cl = (error) => {
    if (ye.isThrottlingError(error)) return "THROTTLING";
    if (ye.isTransientError(error)) return "TRANSIENT";
    if (ye.isServerError(error)) return "SERVER_ERROR";
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
      clientStack.add(jn(options), retryMiddlewareOptions);
    },
  });
  var Hn = (e) => {
    if (!Me.HttpResponse.isInstance(e)) return;
    let found = Object.keys(e.headers).find((key) => key.toLowerCase() === "retry-after");
    if (!found) return;
    let retryAfter = e.headers[found];
    let s = Number(retryAfter);
    if (!Number.isNaN(s)) return new Date(s * 1000);
    return new Date(retryAfter);
  };
  cjsExports.AdaptiveRetryStrategy = Bn;
  cjsExports.CONFIG_MAX_ATTEMPTS = lr;
  cjsExports.CONFIG_RETRY_MODE = Un;
  cjsExports.ENV_MAX_ATTEMPTS = ur;
  cjsExports.ENV_RETRY_MODE = Ln;
  cjsExports.NODE_MAX_ATTEMPT_CONFIG_OPTIONS = wl;
  cjsExports.NODE_RETRY_MODE_CONFIG_OPTIONS = bl;
  cjsExports.StandardRetryStrategy = StandardRetryStrategy;
  cjsExports.defaultDelayDecider = defaultDelayDecider;
  cjsExports.defaultRetryDecider = defaultRetryDecider;
  cjsExports.getOmitRetryHeadersPlugin = getOmitRetryHeadersPlugin;
  cjsExports.getRetryAfterHint = Hn;
  cjsExports.getRetryPlugin = getRetryPlugin;
  cjsExports.omitRetryHeadersMiddleware = Vn;
  cjsExports.omitRetryHeadersMiddlewareOptions = Fn;
  cjsExports.resolveRetryConfig = resolveRetryConfig;
  cjsExports.retryMiddleware = jn;
  cjsExports.retryMiddlewareOptions = retryMiddlewareOptions;
});
export { require_retry };

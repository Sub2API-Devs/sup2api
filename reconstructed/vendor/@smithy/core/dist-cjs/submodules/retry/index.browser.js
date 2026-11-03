/**
 * @smithy/core/dist-cjs/submodules/retry/index.browser.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/core@3.30.0
 * pieces: chunk-edce4vxq.js (2)
 * attribution: cjs-fingerprint+context 1, cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-edce4vxq.js:120842-122470 cjs-fingerprint+context
var require_index_browser_2 = x(function (cjsExports) {
  var CLOCK_SKEW_ERROR_CODES = [
    "AuthFailure",
    "InvalidSignatureException",
    "RequestExpired",
    "RequestInTheFuture",
    "RequestTimeTooSkewed",
    "SignatureDoesNotMatch",
  ];
  var THROTTLING_ERROR_CODES = [
    "BandwidthLimitExceeded",
    "EC2ThrottledException",
    "LimitExceededException",
    "PriorRequestNotComplete",
    "ProvisionedThroughputExceededException",
    "RequestLimitExceeded",
    "RequestThrottled",
    "RequestThrottledException",
    "SlowDown",
    "ThrottledException",
    "Throttling",
    "ThrottlingException",
    "TooManyRequestsException",
    "TransactionInProgressException",
  ];
  var Pu = ["TimeoutError", "RequestTimeout", "RequestTimeoutException"];
  var TRANSIENT_ERROR_STATUS_CODES = [500, 502, 503, 504];
  var NODEJS_TIMEOUT_ERROR_CODES = ["ECONNRESET", "ECONNREFUSED", "EPIPE", "ETIMEDOUT"];
  var NODEJS_NETWORK_ERROR_CODES = ["EHOSTUNREACH", "ENETUNREACH", "ENOTFOUND"];
  var isRetryableByTrait = (error) => error?.$retryable !== undefined;
  var isClockSkewError = (error) => CLOCK_SKEW_ERROR_CODES.includes(error.name);
  var isClockSkewCorrectedError = (error) => error.$metadata?.clockSkewCorrected;
  var isBrowserNetworkError = (error) => {
    let errorMessages = new Set([
      "Failed to fetch",
      "NetworkError when attempting to fetch resource",
      "The Internet connection appears to be offline",
      "Load failed",
      "Network request failed",
    ]);
    if (!(error && error instanceof TypeError)) return false;
    return errorMessages.has(error.message);
  };
  var isThrottlingError = (error) =>
    error.$metadata?.httpStatusCode === 429 ||
    THROTTLING_ERROR_CODES.includes(error.name) ||
    error.$retryable?.throttling == true;
  var isTransientError = (error, depth = 0) =>
    isRetryableByTrait(error) ||
    isClockSkewCorrectedError(error) ||
    Pu.includes(error.name) ||
    NODEJS_TIMEOUT_ERROR_CODES.includes(error?.code || "") ||
    NODEJS_NETWORK_ERROR_CODES.includes(error?.code || "") ||
    TRANSIENT_ERROR_STATUS_CODES.includes(error.$metadata?.httpStatusCode || 0) ||
    isBrowserNetworkError(error) ||
    (error.cause !== undefined && depth <= 10 && isTransientError(error.cause, depth + 1));
  var isServerError = (error) => {
    if (error.$metadata?.httpStatusCode !== undefined) {
      let statusCode = error.$metadata.httpStatusCode;
      if (500 <= statusCode && statusCode <= 599 && !isTransientError(error)) return true;
      return false;
    }
    return false;
  };
  cjsExports.isBrowserNetworkError = isBrowserNetworkError;
  cjsExports.isClockSkewCorrectedError = isClockSkewCorrectedError;
  cjsExports.isClockSkewError = isClockSkewError;
  cjsExports.isRetryableByTrait = isRetryableByTrait;
  cjsExports.isServerError = isServerError;
  cjsExports.isThrottlingError = isThrottlingError;
  cjsExports.isTransientError = isTransientError;
});
//@ chunk-edce4vxq.js:122470-128258 cjs-fingerprint
var require_index_browser = x(function (cjsExports) {
  var Wu = require_index_browser_2();
  cjsExports.RETRY_MODES = undefined;
  (function (RETRY_MODES) {
    RETRY_MODES.STANDARD = "standard";
    RETRY_MODES.ADAPTIVE = "adaptive";
  })(cjsExports.RETRY_MODES || (cjsExports.RETRY_MODES = {}));
  var DEFAULT_MAX_ATTEMPTS = 3;
  var STANDARD = cjsExports.RETRY_MODES.STANDARD;
  class DefaultRateLimiter {
    static setTimeoutFn = setTimeout;
    beta;
    minCapacity;
    minFillRate;
    scaleConstant;
    smooth;
    currentCapacity = 0;
    enabled = false;
    lastMaxRate = 0;
    measuredTxRate = 0;
    requestCount = 0;
    fillRate;
    lastThrottleTime;
    lastTimestamp = 0;
    lastTxRateBucket;
    maxCapacity;
    timeWindow = 0;
    constructor(options) {
      this.beta = options?.beta ?? 0.7;
      this.minCapacity = options?.minCapacity ?? 1;
      this.minFillRate = options?.minFillRate ?? 0.5;
      this.scaleConstant = options?.scaleConstant ?? 0.4;
      this.smooth = options?.smooth ?? 0.8;
      let lastThrottleTime = this.getCurrentTimeInSeconds();
      this.lastThrottleTime = lastThrottleTime;
      this.lastTxRateBucket = Math.floor(this.getCurrentTimeInSeconds());
      this.fillRate = this.minFillRate;
      this.maxCapacity = this.minCapacity;
    }
    getCurrentTimeInSeconds() {
      return Date.now() / 1000;
    }
    async getSendToken() {
      return this.acquireTokenBucket(1);
    }
    async acquireTokenBucket(amount) {
      if (!this.enabled) return;
      this.refillTokenBucket();
      if (amount > this.currentCapacity) {
        let delay = ((amount - this.currentCapacity) / this.fillRate) * 1000;
        await new Promise((resolve) => DefaultRateLimiter.setTimeoutFn(resolve, delay));
      }
      this.currentCapacity = this.currentCapacity - amount;
    }
    refillTokenBucket() {
      let timestamp = this.getCurrentTimeInSeconds();
      if (!this.lastTimestamp) {
        this.lastTimestamp = timestamp;
        return;
      }
      let fillAmount = (timestamp - this.lastTimestamp) * this.fillRate;
      this.currentCapacity = Math.min(this.maxCapacity, this.currentCapacity + fillAmount);
      this.lastTimestamp = timestamp;
    }
    updateClientSendingRate(e) {
      let t;
      this.updateMeasuredRate();
      if (Wu.isThrottlingError(e)) {
        let s = !this.enabled ? this.measuredTxRate : Math.min(this.measuredTxRate, this.fillRate);
        this.lastMaxRate = s;
        this.calculateTimeWindow();
        this.lastThrottleTime = this.getCurrentTimeInSeconds();
        t = this.cubicThrottle(s);
        this.enableTokenBucket();
      } else {
        this.calculateTimeWindow();
        t = this.cubicSuccess(this.getCurrentTimeInSeconds());
      }
      let min = Math.min(t, 2 * this.measuredTxRate);
      this.updateTokenBucketRate(min);
    }
    calculateTimeWindow() {
      this.timeWindow = this.getPrecise(
        Math.pow((this.lastMaxRate * (1 - this.beta)) / this.scaleConstant, 0.3333333333333333),
      );
    }
    cubicThrottle(rateToUse) {
      return this.getPrecise(rateToUse * this.beta);
    }
    cubicSuccess(timestamp) {
      return this.getPrecise(
        this.scaleConstant * Math.pow(timestamp - this.lastThrottleTime - this.timeWindow, 3) +
          this.lastMaxRate,
      );
    }
    enableTokenBucket() {
      this.enabled = true;
    }
    updateTokenBucketRate(newRate) {
      this.refillTokenBucket();
      this.fillRate = Math.max(newRate, this.minFillRate);
      this.maxCapacity = Math.max(newRate, this.minCapacity);
      this.currentCapacity = Math.min(this.currentCapacity, this.maxCapacity);
    }
    updateMeasuredRate() {
      let t_2 = this.getCurrentTimeInSeconds();
      let timeBucket = Math.floor(t_2 * 2) / 2;
      this.requestCount++;
      if (timeBucket > this.lastTxRateBucket) {
        let currentRate = this.requestCount / (timeBucket - this.lastTxRateBucket);
        this.measuredTxRate = this.getPrecise(
          currentRate * this.smooth + this.measuredTxRate * (1 - this.smooth),
        );
        this.requestCount = 0;
        this.lastTxRateBucket = timeBucket;
      }
    }
    getPrecise(num) {
      return parseFloat(num.toFixed(8));
    }
  }
  var je = 100;
  var cr = 20000;
  var Nn = 500;
  var ar = 500;
  var Tn = 5;
  var _n = 10;
  var NO_RETRY_INCREMENT = 1;
  var Qu = "amz-sdk-invocation-id";
  var Yu = "amz-sdk-request";
  var Ju = () => {
    let e = je;
    return {
      computeNextBackoffDelay: (s) => Math.floor(Math.min(cr, Math.random() * 2 ** s * e)),
      setDelayBase: (s) => {
        e = s;
      },
    };
  };
  var bn = ({ retryDelay, retryCount, retryCost }) => ({
    getRetryCount: () => retryCount,
    getRetryDelay: () => Math.min(cr, retryDelay),
    getRetryCost: () => retryCost,
  });
  class StandardRetryStrategy$1 {
    maxAttempts;
    mode = cjsExports.RETRY_MODES.STANDARD;
    capacity = ar;
    retryBackoffStrategy = Ju();
    maxAttemptsProvider;
    constructor(arg1) {
      this.maxAttempts = arg1;
      this.maxAttemptsProvider = typeof arg1 === "function" ? arg1 : async () => arg1;
    }
    async acquireInitialRetryToken(e) {
      return bn({
        retryDelay: je,
        retryCount: 0,
      });
    }
    async refreshRetryTokenForRetry(token, errorInfo) {
      let maxAttempts = await this.getMaxAttempts();
      if (this.shouldRetry(token, errorInfo, maxAttempts)) {
        let errorType = errorInfo.errorType;
        this.retryBackoffStrategy.setDelayBase(errorType === "THROTTLING" ? Nn : je);
        let o = this.retryBackoffStrategy.computeNextBackoffDelay(token.getRetryCount());
        let retryDelay = errorInfo.retryAfterHint
          ? Math.max(errorInfo.retryAfterHint.getTime() - Date.now() || 0, o)
          : o;
        let capacityCost = this.getCapacityCost(errorType);
        this.capacity -= capacityCost;
        return bn({
          retryDelay,
          retryCount: token.getRetryCount() + 1,
          retryCost: capacityCost,
        });
      }
      throw Error("No retry token available");
    }
    recordSuccess(token) {
      this.capacity = Math.max(ar, this.capacity + (token.getRetryCost() ?? NO_RETRY_INCREMENT));
    }
    getCapacity() {
      return this.capacity;
    }
    async getMaxAttempts() {
      try {
        return await this.maxAttemptsProvider();
      } catch (error) {
        console.warn(`Max attempts provider could not resolve. Using default of ${DEFAULT_MAX_ATTEMPTS}`);
        return DEFAULT_MAX_ATTEMPTS;
      }
    }
    shouldRetry(tokenToRenew, errorInfo, r) {
      return (
        tokenToRenew.getRetryCount() + 1 < r &&
        this.capacity >= this.getCapacityCost(errorInfo.errorType) &&
        this.isRetryableError(errorInfo.errorType)
      );
    }
    getCapacityCost(errorType) {
      return errorType === "TRANSIENT" ? _n : Tn;
    }
    isRetryableError(errorType) {
      return errorType === "THROTTLING" || errorType === "TRANSIENT";
    }
  }
  class AdaptiveRetryStrategy$1 {
    maxAttemptsProvider;
    rateLimiter;
    standardRetryStrategy;
    mode = cjsExports.RETRY_MODES.ADAPTIVE;
    constructor(maxAttemptsProvider, options) {
      this.maxAttemptsProvider = maxAttemptsProvider;
      let { rateLimiter } = options ?? {};
      this.rateLimiter = rateLimiter ?? new DefaultRateLimiter();
      this.standardRetryStrategy = new StandardRetryStrategy$1(maxAttemptsProvider);
    }
    async acquireInitialRetryToken(e) {
      await this.rateLimiter.getSendToken();
      return this.standardRetryStrategy.acquireInitialRetryToken(e);
    }
    async refreshRetryTokenForRetry(tokenToRenew, errorInfo) {
      this.rateLimiter.updateClientSendingRate(errorInfo);
      return this.standardRetryStrategy.refreshRetryTokenForRetry(tokenToRenew, errorInfo);
    }
    recordSuccess(token) {
      this.rateLimiter.updateClientSendingRate({});
      this.standardRetryStrategy.recordSuccess(token);
    }
  }
  class ConfiguredRetryStrategy extends StandardRetryStrategy$1 {
    computeNextBackoffDelay;
    constructor(maxAttempts, computeNextBackoffDelay = je) {
      super(typeof maxAttempts === "function" ? maxAttempts : async () => maxAttempts);
      if (typeof computeNextBackoffDelay === "number")
        this.computeNextBackoffDelay = () => computeNextBackoffDelay;
      else this.computeNextBackoffDelay = computeNextBackoffDelay;
    }
    async refreshRetryTokenForRetry(e, t) {
      let r = await super.refreshRetryTokenForRetry(e, t);
      r.getRetryDelay = () => this.computeNextBackoffDelay(r.getRetryCount());
      return r;
    }
  }
  cjsExports.AdaptiveRetryStrategy = AdaptiveRetryStrategy$1;
  cjsExports.ConfiguredRetryStrategy = ConfiguredRetryStrategy;
  cjsExports.DEFAULT_MAX_ATTEMPTS = DEFAULT_MAX_ATTEMPTS;
  cjsExports.DEFAULT_RETRY_DELAY_BASE = je;
  cjsExports.DEFAULT_RETRY_MODE = STANDARD;
  cjsExports.DefaultRateLimiter = DefaultRateLimiter;
  cjsExports.INITIAL_RETRY_TOKENS = ar;
  cjsExports.INVOCATION_ID_HEADER = Qu;
  cjsExports.MAXIMUM_RETRY_DELAY = cr;
  cjsExports.NO_RETRY_INCREMENT = NO_RETRY_INCREMENT;
  cjsExports.REQUEST_HEADER = Yu;
  cjsExports.RETRY_COST = Tn;
  cjsExports.StandardRetryStrategy = StandardRetryStrategy$1;
  cjsExports.THROTTLING_RETRY_DELAY_BASE = Nn;
  cjsExports.TIMEOUT_RETRY_COST = _n;
});
export { require_index_browser, require_index_browser_2 };

/**
 * @smithy/core/dist-cjs/submodules/retry/index.browser.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/core@3.30.0
 * pieces: chunk-edce4vxq.js (2)
 * attribution: cjs-fingerprint+context 1, cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-edce4vxq.js:120842-122470 cjs-fingerprint+context
var ir = x(function (Uu) {
  var Mu = [
      "AuthFailure",
      "InvalidSignatureException",
      "RequestExpired",
      "RequestInTheFuture",
      "RequestTimeTooSkewed",
      "SignatureDoesNotMatch",
    ],
    Du = [
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
    ],
    Pu = ["TimeoutError", "RequestTimeout", "RequestTimeoutException"],
    ku = [500, 502, 503, 504],
    vu = ["ECONNRESET", "ECONNREFUSED", "EPIPE", "ETIMEDOUT"],
    zu = ["EHOSTUNREACH", "ENETUNREACH", "ENOTFOUND"],
    Sn = (e) => e?.$retryable !== void 0,
    $u = (e) => Mu.includes(e.name),
    wn = (e) => e.$metadata?.clockSkewCorrected,
    xn = (e) => {
      let t = new Set([
        "Failed to fetch",
        "NetworkError when attempting to fetch resource",
        "The Internet connection appears to be offline",
        "Load failed",
        "Network request failed",
      ]);
      if (!(e && e instanceof TypeError)) return !1;
      return t.has(e.message);
    },
    Bu = (e) => e.$metadata?.httpStatusCode === 429 || Du.includes(e.name) || e.$retryable?.throttling == !0,
    nr = (e, t = 0) =>
      Sn(e) ||
      wn(e) ||
      Pu.includes(e.name) ||
      vu.includes(e?.code || "") ||
      zu.includes(e?.code || "") ||
      ku.includes(e.$metadata?.httpStatusCode || 0) ||
      xn(e) ||
      (e.cause !== void 0 && t <= 10 && nr(e.cause, t + 1)),
    Lu = (e) => {
      if (e.$metadata?.httpStatusCode !== void 0) {
        let httpStatusCode = e.$metadata.httpStatusCode;
        if (500 <= httpStatusCode && httpStatusCode <= 599 && !nr(e)) return !0;
        return !1;
      }
      return !1;
    };
  Uu.isBrowserNetworkError = xn;
  Uu.isClockSkewCorrectedError = wn;
  Uu.isClockSkewError = $u;
  Uu.isRetryableByTrait = Sn;
  Uu.isServerError = Lu;
  Uu.isThrottlingError = Bu;
  Uu.isTransientError = nr;
});
//@ chunk-edce4vxq.js:122470-128258 cjs-fingerprint
var Mae = x(function (Zu) {
  var Wu = ir();
  Zu.RETRY_MODES = void 0;
  (function (e) {
    ((e.STANDARD = "standard"), (e.ADAPTIVE = "adaptive"));
  })(Zu.RETRY_MODES || (Zu.RETRY_MODES = {}));
  var or = 3,
    STANDARD = Zu.RETRY_MODES.STANDARD;
  class ct {
    static setTimeoutFn = setTimeout;
    beta;
    minCapacity;
    minFillRate;
    scaleConstant;
    smooth;
    currentCapacity = 0;
    enabled = !1;
    lastMaxRate = 0;
    measuredTxRate = 0;
    requestCount = 0;
    fillRate;
    lastThrottleTime;
    lastTimestamp = 0;
    lastTxRateBucket;
    maxCapacity;
    timeWindow = 0;
    constructor(e) {
      ((this.beta = e?.beta ?? 0.7),
        (this.minCapacity = e?.minCapacity ?? 1),
        (this.minFillRate = e?.minFillRate ?? 0.5),
        (this.scaleConstant = e?.scaleConstant ?? 0.4),
        (this.smooth = e?.smooth ?? 0.8));
      let currentTimeInSeconds = this.getCurrentTimeInSeconds();
      ((this.lastThrottleTime = currentTimeInSeconds),
        (this.lastTxRateBucket = Math.floor(this.getCurrentTimeInSeconds())),
        (this.fillRate = this.minFillRate),
        (this.maxCapacity = this.minCapacity));
    }
    getCurrentTimeInSeconds() {
      return Date.now() / 1000;
    }
    async getSendToken() {
      return this.acquireTokenBucket(1);
    }
    async acquireTokenBucket(e) {
      if (!this.enabled) return;
      if ((this.refillTokenBucket(), e > this.currentCapacity)) {
        let t = ((e - this.currentCapacity) / this.fillRate) * 1000;
        await new Promise((r) => ct.setTimeoutFn(r, t));
      }
      this.currentCapacity = this.currentCapacity - e;
    }
    refillTokenBucket() {
      let currentTimeInSeconds = this.getCurrentTimeInSeconds();
      if (!this.lastTimestamp) {
        this.lastTimestamp = currentTimeInSeconds;
        return;
      }
      let t = (currentTimeInSeconds - this.lastTimestamp) * this.fillRate;
      ((this.currentCapacity = Math.min(this.maxCapacity, this.currentCapacity + t)),
        (this.lastTimestamp = currentTimeInSeconds));
    }
    updateClientSendingRate(e) {
      let t;
      if ((this.updateMeasuredRate(), Wu.isThrottlingError(e))) {
        let s = !this.enabled ? this.measuredTxRate : Math.min(this.measuredTxRate, this.fillRate);
        ((this.lastMaxRate = s),
          this.calculateTimeWindow(),
          (this.lastThrottleTime = this.getCurrentTimeInSeconds()),
          (t = this.cubicThrottle(s)),
          this.enableTokenBucket());
      } else (this.calculateTimeWindow(), (t = this.cubicSuccess(this.getCurrentTimeInSeconds())));
      let min = Math.min(t, 2 * this.measuredTxRate);
      this.updateTokenBucketRate(min);
    }
    calculateTimeWindow() {
      this.timeWindow = this.getPrecise(
        Math.pow((this.lastMaxRate * (1 - this.beta)) / this.scaleConstant, 0.3333333333333333),
      );
    }
    cubicThrottle(e) {
      return this.getPrecise(e * this.beta);
    }
    cubicSuccess(e) {
      return this.getPrecise(
        this.scaleConstant * Math.pow(e - this.lastThrottleTime - this.timeWindow, 3) + this.lastMaxRate,
      );
    }
    enableTokenBucket() {
      this.enabled = !0;
    }
    updateTokenBucketRate(e) {
      (this.refillTokenBucket(),
        (this.fillRate = Math.max(e, this.minFillRate)),
        (this.maxCapacity = Math.max(e, this.minCapacity)),
        (this.currentCapacity = Math.min(this.currentCapacity, this.maxCapacity)));
    }
    updateMeasuredRate() {
      let currentTimeInSeconds = this.getCurrentTimeInSeconds(),
        t = Math.floor(currentTimeInSeconds * 2) / 2;
      if ((this.requestCount++, t > this.lastTxRateBucket)) {
        let r = this.requestCount / (t - this.lastTxRateBucket);
        ((this.measuredTxRate = this.getPrecise(r * this.smooth + this.measuredTxRate * (1 - this.smooth))),
          (this.requestCount = 0),
          (this.lastTxRateBucket = t));
      }
    }
    getPrecise(e) {
      return parseFloat(e.toFixed(8));
    }
  }
  var je = 100,
    cr = 20000,
    Nn = 500,
    ar = 500,
    Tn = 5,
    _n = 10,
    Cn = 1,
    Qu = "amz-sdk-invocation-id",
    Yu = "amz-sdk-request",
    Ju = () => {
      let e = je;
      return {
        computeNextBackoffDelay: (s) => Math.floor(Math.min(cr, Math.random() * 2 ** s * e)),
        setDelayBase: (s) => {
          e = s;
        },
      };
    },
    bn = ({ retryDelay: retryDelay, retryCount: retryCount, retryCost: retryCost }) => ({
      getRetryCount: () => retryCount,
      getRetryDelay: () => Math.min(cr, retryDelay),
      getRetryCost: () => retryCost,
    });
  class ut {
    maxAttempts;
    mode = Zu.RETRY_MODES.STANDARD;
    capacity = ar;
    retryBackoffStrategy = Ju();
    maxAttemptsProvider;
    constructor(e) {
      ((this.maxAttempts = e), (this.maxAttemptsProvider = typeof e === "function" ? e : async () => e));
    }
    async acquireInitialRetryToken(e) {
      return bn({ retryDelay: je, retryCount: 0 });
    }
    async refreshRetryTokenForRetry(e, t) {
      let maxAttempts = await this.getMaxAttempts();
      if (this.shouldRetry(e, t, maxAttempts)) {
        let errorType = t.errorType;
        this.retryBackoffStrategy.setDelayBase(errorType === "THROTTLING" ? Nn : je);
        let nextBackoffDelay = this.retryBackoffStrategy.computeNextBackoffDelay(e.getRetryCount()),
          a = t.retryAfterHint
            ? Math.max(t.retryAfterHint.getTime() - Date.now() || 0, nextBackoffDelay)
            : nextBackoffDelay,
          capacityCost = this.getCapacityCost(errorType);
        return (
          (this.capacity -= capacityCost),
          bn({ retryDelay: a, retryCount: e.getRetryCount() + 1, retryCost: capacityCost })
        );
      }
      throw Error("No retry token available");
    }
    recordSuccess(e) {
      this.capacity = Math.max(ar, this.capacity + (e.getRetryCost() ?? Cn));
    }
    getCapacity() {
      return this.capacity;
    }
    async getMaxAttempts() {
      try {
        return await this.maxAttemptsProvider();
      } catch (error) {
        return (console.warn(`Max attempts provider could not resolve. Using default of ${or}`), or);
      }
    }
    shouldRetry(e, t, r) {
      return (
        e.getRetryCount() + 1 < r &&
        this.capacity >= this.getCapacityCost(t.errorType) &&
        this.isRetryableError(t.errorType)
      );
    }
    getCapacityCost(e) {
      return e === "TRANSIENT" ? _n : Tn;
    }
    isRetryableError(e) {
      return e === "THROTTLING" || e === "TRANSIENT";
    }
  }
  class An {
    maxAttemptsProvider;
    rateLimiter;
    standardRetryStrategy;
    mode = Zu.RETRY_MODES.ADAPTIVE;
    constructor(e, t) {
      this.maxAttemptsProvider = e;
      let { rateLimiter: rateLimiter } = t ?? {};
      ((this.rateLimiter = rateLimiter ?? new ct()), (this.standardRetryStrategy = new ut(e)));
    }
    async acquireInitialRetryToken(e) {
      return (await this.rateLimiter.getSendToken(), this.standardRetryStrategy.acquireInitialRetryToken(e));
    }
    async refreshRetryTokenForRetry(e, t) {
      return (
        this.rateLimiter.updateClientSendingRate(t),
        this.standardRetryStrategy.refreshRetryTokenForRetry(e, t)
      );
    }
    recordSuccess(e) {
      (this.rateLimiter.updateClientSendingRate({}), this.standardRetryStrategy.recordSuccess(e));
    }
  }
  class Rn extends ut {
    computeNextBackoffDelay;
    constructor(e, t = je) {
      super(typeof e === "function" ? e : async () => e);
      if (typeof t === "number") this.computeNextBackoffDelay = () => t;
      else this.computeNextBackoffDelay = t;
    }
    async refreshRetryTokenForRetry(e, t) {
      let refreshRetryTokenForRetry = await super.refreshRetryTokenForRetry(e, t);
      return (
        (refreshRetryTokenForRetry.getRetryDelay = () =>
          this.computeNextBackoffDelay(refreshRetryTokenForRetry.getRetryCount())),
        refreshRetryTokenForRetry
      );
    }
  }
  Zu.AdaptiveRetryStrategy = An;
  Zu.ConfiguredRetryStrategy = Rn;
  Zu.DEFAULT_MAX_ATTEMPTS = or;
  Zu.DEFAULT_RETRY_DELAY_BASE = je;
  Zu.DEFAULT_RETRY_MODE = STANDARD;
  Zu.DefaultRateLimiter = ct;
  Zu.INITIAL_RETRY_TOKENS = ar;
  Zu.INVOCATION_ID_HEADER = Qu;
  Zu.MAXIMUM_RETRY_DELAY = cr;
  Zu.NO_RETRY_INCREMENT = Cn;
  Zu.REQUEST_HEADER = Yu;
  Zu.RETRY_COST = Tn;
  Zu.StandardRetryStrategy = ut;
  Zu.THROTTLING_RETRY_DELAY_BASE = Nn;
  Zu.TIMEOUT_RETRY_COST = _n;
});

export { Mae, ir };

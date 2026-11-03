/**
 * @smithy/core/dist-cjs/submodules/retry/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/core@3.30.0
 * pieces: chunk-edce4vxq.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { Mae, ir } from "./index.browser.js";
import { Kg } from "../../../../protocol-http/dist-cjs/index.js";
import { Jns, Dn } from "../../../index.js";
import { bD } from "../../../../util-middleware/dist-cjs/index.js";
import { ff } from "../client/index.js";

//@ chunk-edce4vxq.js:128507-134734 cjs-fingerprint
var dG = x(function (Rl) {
  var j = Mae(),
    Me = Kg(),
    ye = ir(),
    kn = Jns(),
    Pn = bD(),
    gl = ff(),
    yl = Dn(),
    El = (e, t) => {
      let r = e,
        {
          NO_RETRY_INCREMENT: NO_RETRY_INCREMENT,
          RETRY_COST: RETRY_COST,
          TIMEOUT_RETRY_COST: TIMEOUT_RETRY_COST,
        } = j,
        c = e,
        d = (N) => (N.name === "TimeoutError" ? TIMEOUT_RETRY_COST : RETRY_COST),
        f = (N) => d(N) <= c;
      return Object.freeze({
        hasRetryTokens: f,
        retrieveRetryTokens: (N) => {
          if (!f(N)) throw Error("No retry token available");
          let b = d(N);
          return ((c -= b), b);
        },
        releaseRetryTokens: (N) => {
          ((c += N ?? NO_RETRY_INCREMENT), (c = Math.min(c, r)));
        },
      });
    },
    vn = (e, t) => Math.floor(Math.min(j.MAXIMUM_RETRY_DELAY, Math.random() * 2 ** t * e)),
    zn = (e) => {
      if (!e) return !1;
      return (
        ye.isRetryableByTrait(e) ||
        ye.isClockSkewError(e) ||
        ye.isThrottlingError(e) ||
        ye.isTransientError(e)
      );
    },
    $n = (e) => {
      if (e instanceof Error) return e;
      if (e instanceof Object) return Object.assign(Error(), e);
      if (typeof e === "string") return Error(e);
      return Error(`AWS SDK error wrapper for ${e}`);
    };
  class dr {
    maxAttemptsProvider;
    retryDecider;
    delayDecider;
    retryQuota;
    mode = j.RETRY_MODES.STANDARD;
    constructor(e, t) {
      ((this.maxAttemptsProvider = e),
        (this.retryDecider = t?.retryDecider ?? zn),
        (this.delayDecider = t?.delayDecider ?? vn),
        (this.retryQuota = t?.retryQuota ?? El(j.INITIAL_RETRY_TOKENS)));
    }
    shouldRetry(e, t, r) {
      return t < r && this.retryDecider(e) && this.retryQuota.hasRetryTokens(e);
    }
    async getMaxAttempts() {
      let e;
      try {
        e = await this.maxAttemptsProvider();
      } catch (error) {
        e = j.DEFAULT_MAX_ATTEMPTS;
      }
      return e;
    }
    async retry(e, t, r) {
      let s,
        o = 0,
        a = 0,
        maxAttempts = await this.getMaxAttempts(),
        { request: request } = t;
      if (Me.HttpRequest.isInstance(request)) request.headers[j.INVOCATION_ID_HEADER] = kn.v4();
      while (!0)
        try {
          if (Me.HttpRequest.isInstance(request))
            request.headers[j.REQUEST_HEADER] = `attempt=${o + 1}; max=${maxAttempts}`;
          if (r?.beforeRequest) await r.beforeRequest();
          let { response: response, output: output } = await e(t);
          if (r?.afterRequest) r.afterRequest(response);
          return (
            this.retryQuota.releaseRetryTokens(s),
            (output.$metadata.attempts = o + 1),
            (output.$metadata.totalRetryDelay = a),
            { response: response, output: output }
          );
        } catch (error) {
          let m = $n(error);
          if ((o++, this.shouldRetry(m, o, maxAttempts))) {
            s = this.retryQuota.retrieveRetryTokens(m);
            let delayDecider = this.delayDecider(
                ye.isThrottlingError(m) ? j.THROTTLING_RETRY_DELAY_BASE : j.DEFAULT_RETRY_DELAY_BASE,
                o,
              ),
              N = Sl(m.$response),
              max = Math.max(N || 0, delayDecider);
            ((a += max), await new Promise((T) => setTimeout(T, max)));
            continue;
          }
          if (!m.$metadata) m.$metadata = {};
          throw ((m.$metadata.attempts = o), (m.$metadata.totalRetryDelay = a), m);
        }
    }
  }
  var Sl = (e) => {
    if (!Me.HttpResponse.isInstance(e)) return;
    let found = Object.keys(e.headers).find((a) => a.toLowerCase() === "retry-after");
    if (!found) return;
    let r = e.headers[found],
      s = Number(r);
    if (!Number.isNaN(s)) return s * 1000;
    return new Date(r).getTime() - Date.now();
  };
  class Bn extends dr {
    rateLimiter;
    constructor(e, t) {
      let { rateLimiter: rateLimiter, ...s } = t ?? {};
      super(e, s);
      ((this.rateLimiter = rateLimiter ?? new j.DefaultRateLimiter()), (this.mode = j.RETRY_MODES.ADAPTIVE));
    }
    async retry(e, t) {
      return super.retry(e, t, {
        beforeRequest: async () => this.rateLimiter.getSendToken(),
        afterRequest: (r) => {
          this.rateLimiter.updateClientSendingRate(r);
        },
      });
    }
  }
  var ur = "AWS_MAX_ATTEMPTS",
    lr = "max_attempts",
    wl = {
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
    },
    xl = (e) => {
      let { retryStrategy: retryStrategy, retryMode: retryMode, maxAttempts: maxAttempts } = e,
        normalizeProvider = Pn.normalizeProvider(maxAttempts ?? j.DEFAULT_MAX_ATTEMPTS);
      return Object.assign(e, {
        maxAttempts: normalizeProvider,
        retryStrategy: async () => {
          if (retryStrategy) return retryStrategy;
          if ((await Pn.normalizeProvider(retryMode)()) === j.RETRY_MODES.ADAPTIVE)
            return new j.AdaptiveRetryStrategy(normalizeProvider);
          return new j.StandardRetryStrategy(normalizeProvider);
        },
      });
    },
    Ln = "AWS_RETRY_MODE",
    Un = "retry_mode",
    bl = {
      environmentVariableSelector: (e) => e[Ln],
      configFileSelector: (e) => e[Un],
      default: j.DEFAULT_RETRY_MODE,
    },
    Vn = () => (e) => async (t) => {
      let { request: request } = t;
      if (Me.HttpRequest.isInstance(request))
        (delete request.headers[j.INVOCATION_ID_HEADER], delete request.headers[j.REQUEST_HEADER]);
      return e(t);
    },
    Fn = {
      name: "omitRetryHeadersMiddleware",
      tags: ["RETRY", "HEADERS", "OMIT_RETRY_HEADERS"],
      relation: "before",
      toMiddleware: "awsAuthMiddleware",
      override: !0,
    },
    Nl = (e) => ({
      applyToStack: (t) => {
        t.addRelativeTo(Vn(), Fn);
      },
    }),
    jn = (e) => (t, r) => async (s) => {
      let retryStrategy = await e.retryStrategy(),
        maxAttempts = await e.maxAttempts();
      if (Tl(retryStrategy)) {
        retryStrategy = retryStrategy;
        let acquireInitialRetryToken = await retryStrategy.acquireInitialRetryToken(r.partition_id),
          d = Error(),
          f = 0,
          m = 0,
          { request: request } = s,
          isInstance = Me.HttpRequest.isInstance(request);
        if (isInstance) request.headers[j.INVOCATION_ID_HEADER] = kn.v4();
        while (!0)
          try {
            if (isInstance) request.headers[j.REQUEST_HEADER] = `attempt=${f + 1}; max=${maxAttempts}`;
            let { response: response, output: output } = await t(s);
            return (
              retryStrategy.recordSuccess(acquireInitialRetryToken),
              (output.$metadata.attempts = f + 1),
              (output.$metadata.totalRetryDelay = m),
              { response: response, output: output }
            );
          } catch (error) {
            let T = _l(error);
            if (((d = $n(error)), isInstance && yl.isStreamingPayload(request)))
              throw (
                (r.logger instanceof gl.NoOpLogger ? console : r.logger)?.warn(
                  "An error was encountered in a non-retryable streaming request.",
                ),
                d
              );
            try {
              acquireInitialRetryToken = await retryStrategy.refreshRetryTokenForRetry(
                acquireInitialRetryToken,
                T,
              );
            } catch (error) {
              if (!d.$metadata) d.$metadata = {};
              throw ((d.$metadata.attempts = f + 1), (d.$metadata.totalRetryDelay = m), d);
            }
            f = acquireInitialRetryToken.getRetryCount();
            let retryDelay = acquireInitialRetryToken.getRetryDelay();
            ((m += retryDelay), await new Promise((I) => setTimeout(I, retryDelay)));
          }
      } else {
        if (((retryStrategy = retryStrategy), retryStrategy?.mode))
          r.userAgent = [...(r.userAgent || []), ["cfg/retry-mode", retryStrategy.mode]];
        return retryStrategy.retry(t, s);
      }
    },
    Tl = (e) =>
      typeof e.acquireInitialRetryToken < "u" &&
      typeof e.refreshRetryTokenForRetry < "u" &&
      typeof e.recordSuccess < "u",
    _l = (e) => {
      let t = { error: e, errorType: Cl(e) },
        r = Hn(e.$response);
      if (r) t.retryAfterHint = r;
      return t;
    },
    Cl = (e) => {
      if (ye.isThrottlingError(e)) return "THROTTLING";
      if (ye.isTransientError(e)) return "TRANSIENT";
      if (ye.isServerError(e)) return "SERVER_ERROR";
      return "CLIENT_ERROR";
    },
    qn = {
      name: "retryMiddleware",
      tags: ["RETRY"],
      step: "finalizeRequest",
      priority: "high",
      override: !0,
    },
    Al = (e) => ({
      applyToStack: (t) => {
        t.add(jn(e), qn);
      },
    }),
    Hn = (e) => {
      if (!Me.HttpResponse.isInstance(e)) return;
      let found = Object.keys(e.headers).find((a) => a.toLowerCase() === "retry-after");
      if (!found) return;
      let r = e.headers[found],
        s = Number(r);
      if (!Number.isNaN(s)) return new Date(s * 1000);
      return new Date(r);
    };
  Rl.AdaptiveRetryStrategy = Bn;
  Rl.CONFIG_MAX_ATTEMPTS = lr;
  Rl.CONFIG_RETRY_MODE = Un;
  Rl.ENV_MAX_ATTEMPTS = ur;
  Rl.ENV_RETRY_MODE = Ln;
  Rl.NODE_MAX_ATTEMPT_CONFIG_OPTIONS = wl;
  Rl.NODE_RETRY_MODE_CONFIG_OPTIONS = bl;
  Rl.StandardRetryStrategy = dr;
  Rl.defaultDelayDecider = vn;
  Rl.defaultRetryDecider = zn;
  Rl.getOmitRetryHeadersPlugin = Nl;
  Rl.getRetryAfterHint = Hn;
  Rl.getRetryPlugin = Al;
  Rl.omitRetryHeadersMiddleware = Vn;
  Rl.omitRetryHeadersMiddlewareOptions = Fn;
  Rl.resolveRetryConfig = xl;
  Rl.retryMiddleware = jn;
  Rl.retryMiddlewareOptions = qn;
});

export { dG };

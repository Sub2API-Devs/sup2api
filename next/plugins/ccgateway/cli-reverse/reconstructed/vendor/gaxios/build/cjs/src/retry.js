/**
 * gaxios/build/cjs/src/retry.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: gaxios@7.1.4
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-e8d3a8an.js:8062-10109 cjs-fingerprint
var require_retry = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getRetryConfig = getRetryConfig;
  async function getRetryConfig(err) {
    let config = getConfig(err);
    if (!err || !err.config || (!config && !err.config.retry))
      return {
        shouldRetry: false,
      };
    config = config || {};
    config.currentRetryAttempt = config.currentRetryAttempt || 0;
    config.retry = config.retry === undefined || config.retry === null ? 3 : config.retry;
    config.httpMethodsToRetry = config.httpMethodsToRetry || ["GET", "HEAD", "PUT", "OPTIONS", "DELETE"];
    config.noResponseRetries =
      config.noResponseRetries === undefined || config.noResponseRetries === null
        ? 2
        : config.noResponseRetries;
    config.retryDelayMultiplier = config.retryDelayMultiplier ? config.retryDelayMultiplier : 2;
    config.timeOfFirstRequest = config.timeOfFirstRequest ? config.timeOfFirstRequest : Date.now();
    config.totalTimeout = config.totalTimeout ? config.totalTimeout : Number.MAX_SAFE_INTEGER;
    config.maxRetryDelay = config.maxRetryDelay ? config.maxRetryDelay : Number.MAX_SAFE_INTEGER;
    let retryRanges = [
      [100, 199],
      [408, 408],
      [429, 429],
      [500, 599],
    ];
    config.statusCodesToRetry = config.statusCodesToRetry || retryRanges;
    err.config.retryConfig = config;
    if (!(await (config.shouldRetry || require_https)(err)))
      return {
        shouldRetry: false,
        config: err.config,
      };
    let delay = getNextRetryDelay(config);
    err.config.retryConfig.currentRetryAttempt += 1;
    let backoff = config.retryBackoff
      ? config.retryBackoff(err, delay)
      : new Promise((resolve) => {
          setTimeout(resolve, delay);
        });
    if (config.onRetryAttempt) await config.onRetryAttempt(err);
    await backoff;
    return {
      shouldRetry: true,
      config: err.config,
    };
  }
  function require_https(err) {
    let config = getConfig(err);
    if ((err.config.signal?.aborted && err.code !== "TimeoutError") || err.code === "AbortError")
      return false;
    if (!config || config.retry === 0) return false;
    if (!err.response && (config.currentRetryAttempt || 0) >= config.noResponseRetries) return false;
    if (
      !config.httpMethodsToRetry ||
      !config.httpMethodsToRetry.includes(err.config.method?.toUpperCase() || "GET")
    )
      return false;
    if (err.response && err.response.status) {
      let isInRange = false;
      for (let [min, max] of config.statusCodesToRetry) {
        let status = err.response.status;
        if (status >= min && status <= max) {
          isInRange = true;
          break;
        }
      }
      if (!isInRange) return false;
    }
    config.currentRetryAttempt = config.currentRetryAttempt || 0;
    if (config.currentRetryAttempt >= config.retry) return false;
    return true;
  }
  function getConfig(err) {
    if (err && err.config && err.config.retryConfig) return err.config.retryConfig;
    return;
  }
  function getNextRetryDelay(config) {
    let getConfig =
      (config.currentRetryAttempt ? 0 : (config.retryDelay ?? 100)) +
      ((Math.pow(config.retryDelayMultiplier, config.currentRetryAttempt) - 1) / 2) * 1000;
    let maxAllowableDelay = config.totalTimeout - (Date.now() - config.timeOfFirstRequest);
    return Math.min(getConfig, maxAllowableDelay, config.maxRetryDelay);
  }
});
export { require_retry };

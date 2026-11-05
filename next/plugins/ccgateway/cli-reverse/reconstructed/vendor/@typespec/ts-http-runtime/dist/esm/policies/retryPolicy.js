/**
 * @typespec/ts-http-runtime/dist/esm/policies/retryPolicy.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-b5df2wx1.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import { createClientLogger } from "../../../../../@azure/logger/dist/esm/index.js";
import { AbortError_2 } from "../restError.js";
import { delay_2 } from "../util/helpers.js";

//@ chunk-b5df2wx1.js:45267-45276 esm-layout
var DEFAULT_RETRY_POLICY_COUNT = 3;
//@ chunk-b5df2wx1.js:45276-45334 esm-fingerprint
var retryPolicyLogger = createClientLogger("ts-http-runtime retryPolicy");
var retryPolicyName = "retryPolicy";
//@ chunk-b5df2wx1.js:45334-46988 esm-fingerprint
function retryPolicy_2(
  strategies,
  options = {
    maxRetries: DEFAULT_RETRY_POLICY_COUNT,
  },
) {
  let logger = options.logger || retryPolicyLogger;
  return {
    name: retryPolicyName,
    async sendRequest(request, next) {
      var _a;
      var _b;
      let response;
      let responseError;
      let retryCount = -1;
      e: while (true) {
        retryCount += 1;
        response = undefined;
        responseError = undefined;
        try {
          logger.info(`Retry ${retryCount}: Attempting to send request`, request.requestId);
          response = await next(request);
          logger.info(`Retry ${retryCount}: Received a response from request`, request.requestId);
        } catch (e) {
          logger.error(`Retry ${retryCount}: Received an error from request`, request.requestId);
          responseError = e;
          if (!e || responseError.name !== "RestError") throw e;
          response = responseError.response;
        }
        if ((_a = request.abortSignal) === null || _a === undefined ? undefined : _a.aborted) {
          logger.error(`Retry ${retryCount}: Request aborted.`);
          throw new AbortError_2();
        }
        if (
          retryCount >=
          ((_b = options.maxRetries) !== null && _b !== undefined ? _b : DEFAULT_RETRY_POLICY_COUNT)
        ) {
          logger.info(
            `Retry ${retryCount}: Maximum retries reached. Returning the last received response, or throwing the last received error.`,
          );
          if (responseError) throw responseError;
          else if (response) return response;
          else throw Error("Maximum retries reached with no response or error to throw");
        }
        logger.info(`Retry ${retryCount}: Processing ${strategies.length} retry strategies.`);
        t: for (let strategy of strategies) {
          let strategyLogger = strategy.logger || logger;
          strategyLogger.info(`Retry ${retryCount}: Processing retry strategy ${strategy.name}.`);
          let modifiers = strategy.retry({
            retryCount,
            response,
            responseError,
          });
          if (modifiers.skipStrategy) {
            strategyLogger.info(`Retry ${retryCount}: Skipped.`);
            continue t;
          }
          let { errorToThrow, retryAfterInMs, redirectTo } = modifiers;
          if (errorToThrow) {
            strategyLogger.error(
              `Retry ${retryCount}: Retry strategy ${strategy.name} throws error:`,
              errorToThrow,
            );
            throw errorToThrow;
          }
          if (retryAfterInMs || retryAfterInMs === 0) {
            strategyLogger.info(
              `Retry ${retryCount}: Retry strategy ${strategy.name} retries after ${retryAfterInMs}`,
            );
            await delay_2(retryAfterInMs, undefined, {
              abortSignal: request.abortSignal,
            });
            continue e;
          }
          if (redirectTo) {
            strategyLogger.info(
              `Retry ${retryCount}: Retry strategy ${strategy.name} redirects to ${redirectTo}`,
            );
            request.url = redirectTo;
            continue e;
          }
        }
        if (responseError) {
          logger.info("None of the retry strategies could work with the received error. Throwing it.");
          throw responseError;
        }
        if (response) {
          logger.info("None of the retry strategies could work with the received response. Returning it.");
          return response;
        }
      }
    },
  };
}
export { retryPolicy_2, DEFAULT_RETRY_POLICY_COUNT };

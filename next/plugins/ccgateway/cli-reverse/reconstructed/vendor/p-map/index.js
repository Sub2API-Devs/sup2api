/**
 * p-map/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: p-map/index.js
 * pieces: chunk-mnmtaqy0.js (2)
 * attribution: placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-mnmtaqy0.js:191-1565 placement
/**
 * p-map 默认导出（第三方）：限制并发的异步 map
 */
async function pMap(
  iterable,
  mapper,
  { concurrency = Number.POSITIVE_INFINITY, stopOnError = true, signal } = {},
) {
  return new Promise((resolve, reject) => {
    if (iterable[Symbol.iterator] === undefined && iterable[Symbol.asyncIterator] === undefined)
      throw TypeError(
        `Expected \`input\` to be either an \`Iterable\` or \`AsyncIterable\`, got (${typeof iterable})`,
      );
    if (typeof mapper !== "function") throw TypeError("Mapper function is required");
    if (!(
      (Number.isSafeInteger(concurrency) && concurrency >= 1) ||
      concurrency === Number.POSITIVE_INFINITY
    ))
      throw TypeError(
        `Expected \`concurrency\` to be an integer from 1 and up or \`Infinity\`, got \`${concurrency}\` (${typeof concurrency})`,
      );
    let result = [];
    let errors = [];
    let skippedIndexesMap = new Map();
    let isRejected = false;
    let isStopped = false;
    let isIterableDone = false;
    let resolvingCount = 0;
    let currentIndex = 0;
    let iterator =
      iterable[Symbol.iterator] === undefined
        ? iterable[Symbol.asyncIterator]()
        : iterable[Symbol.iterator]();
    let onAbort = () => {
      rejectOne(signal.reason);
    };
    let removeAbortListener = () => {
      signal?.removeEventListener("abort", onAbort);
    };
    let resolveOne = (value) => {
      resolve(value);
      removeAbortListener();
    };
    let rejectOne = (error) => {
      isRejected = true;
      isStopped = true;
      reject(error);
      removeAbortListener();
    };
    if (signal) {
      if (signal.aborted) rejectOne(signal.reason);
      signal.addEventListener("abort", onAbort, {
        once: true,
      });
    }
    let next = async () => {
      if (isStopped) return;
      let step = await iterator.next();
      let index = currentIndex;
      currentIndex++;
      if (step.done) {
        isIterableDone = true;
        if (resolvingCount === 0 && !isStopped) {
          if (!stopOnError && errors.length > 0) {
            rejectOne(AggregateError(errors));
            return;
          }
          isStopped = true;
          if (skippedIndexesMap.size === 0) {
            resolveOne(result);
            return;
          }
          let resultWithSkippedIndexes = [];
          for (let [index, mappedValue] of result.entries()) {
            if (skippedIndexesMap.get(index) === call) continue;
            resultWithSkippedIndexes.push(mappedValue);
          }
          resolveOne(resultWithSkippedIndexes);
        }
        return;
      }
      resolvingCount++;
      (async () => {
        try {
          let value = await step.value;
          if (isStopped) return;
          let mappedValue = await mapper(value, index);
          if (mappedValue === call) skippedIndexesMap.set(index, mappedValue);
          result[index] = mappedValue;
          resolvingCount--;
          await next();
        } catch (error) {
          if (stopOnError) rejectOne(error);
          else {
            errors.push(error);
            resolvingCount--;
            try {
              await next();
            } catch (error) {
              rejectOne(error);
            }
          }
        }
      })();
    };
    (async () => {
      for (let j = 0; j < concurrency; j++) {
        try {
          await next();
        } catch (error) {
          rejectOne(error);
          break;
        }
        if (isIterableDone || isRejected) break;
      }
    })();
  });
}
//@ chunk-mnmtaqy0.js:1565-1586 placement (2.1.88 match: call, 0.708)
var call = Symbol("skip");
export { pMap };

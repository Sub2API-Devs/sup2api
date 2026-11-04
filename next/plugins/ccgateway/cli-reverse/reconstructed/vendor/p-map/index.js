/**
 * p-map/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: p-map/index.js
 * pieces: chunk-rbe666af.js (2)
 * attribution: placement 2
 */

//@ chunk-rbe666af.js:376-1750 placement
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
      for (let idx = 0; idx < concurrency; idx++) {
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
//@ chunk-rbe666af.js:1750-1771 placement = call (0.709)
var call = Symbol("skip");
export { pMap };

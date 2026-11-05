/**
 * utils/generators.ts
 *
 * 异步生成器工具（all 并发合并、转发 return 值、结果 promise）；另混入极简 plist XML 解析器与 ReadableStream 适配
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/generators.ts
 * pieces: chunk-5xgkngpb.js (5)
 * attribution: placement 4, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-5xgkngpb.js:932606-932684 placement (2.1.88 match: returnValue, 1)
async function returnValue(as) {
  let e;
  do e = await as.next();
  while (!e.done);
  return e.value;
}
//@ chunk-5xgkngpb.js:932684-933074 fingerprint (2.1.88 match: all, 1)
/**
 * 并发合并多个异步生成器（最多 n 个同时运行），按产出先后交错 yield 各生成器的值。
 */
async function* all(generators, concurrencyCap = 1 / 0) {
  let next = (generator) => {
    let promise = generator.next().then(({ done, value }) => ({
      done,
      value,
      generator,
      promise,
    }));
    return promise;
  };
  let waiting = [...generators];
  let promises = new Set();
  while (promises.size < concurrencyCap && waiting.length > 0) {
    let gen = waiting.shift();
    promises.add(next(gen));
  }
  while (promises.size > 0) {
    let { done, value, generator, promise } = await Promise.race(promises);
    promises.delete(promise);
    if (!done) {
      promises.add(next(generator));
      if (value !== undefined) yield value;
    } else if (waiting.length > 0) {
      let nextGen = waiting.shift();
      promises.add(next(nextGen));
    }
  }
}
//@ chunk-5xgkngpb.js:933074-933145 placement
async function toArray_2(generator) {
  let result = [];
  for await (let item of generator) result.push(item);
  return result;
}
//@ chunk-5xgkngpb.js:933145-933190 placement
/**
 * 把同步可迭代对象重新包装为异步生成器（逐项 yield）。
 */
async function* replayAsyncIterable(iterable) {
  for (let item of iterable) yield item;
}
//@ chunk-5xgkngpb.js:933190-933552 placement
/**
 * 包装异步迭代器：结束或出错后释放对原迭代器的引用，之后 next/return 直接完成；支持 await using 释放。
 */
function releasingAsyncIterator(inner) {
  let currentInner = inner;
  let markDone = (result) => {
    if (result.done) currentInner = undefined;
    return result;
  };
  let markFailed = (error) => {
    currentInner = undefined;
    throw error;
  };
  let doneResult = (value) =>
    Promise.resolve({
      done: true,
      value,
    });
  let wrapper = {
    next: (value) =>
      currentInner ? currentInner.next(value).then(markDone, markFailed) : doneResult(undefined),
    return: (value) =>
      currentInner ? currentInner.return(value).then(markDone, markFailed) : doneResult(value),
    throw: (error) =>
      currentInner ? currentInner.throw(error).then(markDone, markFailed) : Promise.reject(error),
    [Symbol.asyncIterator]: () => wrapper,
    [Symbol.asyncDispose]: async () => {
      await wrapper.return(undefined);
    },
  };
  return wrapper;
}
export { returnValue, replayAsyncIterable, all, toArray_2, releasingAsyncIterator };

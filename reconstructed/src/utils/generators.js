/**
 * utils/generators.ts
 *
 * 异步生成器工具（all 并发合并、转发 return 值、结果 promise）；另混入极简 plist XML 解析器与 ReadableStream 适配
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/generators.ts
 * pieces: chunk-0sxtya66.js (1), chunk-e6aww6q8.js (5)
 * attribution: fingerprint 2, placement 4
 */
import { indexOfBytes, readJsonStringField, VLr } from "../services/usageInsights/transcriptScan.js";
import {
  R,
  q,
  sanitizeToolLabel,
  EMPTY_TOOL_LABEL,
  extractToolEvidenceLabel,
  MAX_EVIDENCE_FIELD_CHARS,
} from "../services/usageInsights/recommendations.js";

//@ chunk-e6aww6q8.js:922105-922183 placement = returnValue (1)
async function returnValue_2(as) {
  let e;
  do e = await as.next();
  while (!e.done);
  return e.value;
}
//@ chunk-e6aww6q8.js:922183-922573 fingerprint = all (1)
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
//@ chunk-e6aww6q8.js:922573-922644 placement
async function toArray_2(generator) {
  let result = [];
  for await (let r of generator) result.push(r);
  return result;
}
//@ chunk-e6aww6q8.js:922644-922689 placement
/**
 * 把同步可迭代对象重新包装为异步生成器（逐项 yield）。
 */
async function* replayAsyncIterable(e) {
  for (let n of e) yield n;
}
//@ chunk-e6aww6q8.js:922689-923051 placement
/**
 * 包装异步迭代器：结束或出错后释放对原迭代器的引用，之后 next/return 直接完成；支持 await using 释放。
 */
function releasingAsyncIterator(e) {
  let n = e;
  let r = (S) => {
    if (S.done) n = undefined;
    return S;
  };
  let s = (S) => {
    n = undefined;
    throw S;
  };
  let h = (value) =>
    Promise.resolve({
      done: true,
      value,
    });
  let y = {
    next: (S) => (n ? n.next(S).then(r, s) : h(undefined)),
    return: (S) => (n ? n.return(S).then(r, s) : h(S)),
    throw: (S) => (n ? n.throw(S).then(r, s) : Promise.reject(S)),
    [Symbol.asyncIterator]: () => y,
    [Symbol.asyncDispose]: async () => {
      await y.return(undefined);
    },
  };
  return y;
}
//@ chunk-0sxtya66.js:3695-3948 fingerprint = returnValue (1)
function returnValue(e, t, n) {
  let r = indexOfBytes(e, R, 0, t);
  while (r >= 0) {
    let i = indexOfBytes(e, R, r + R.length, t);
    let a = i < 0 ? t : i;
    let jsonStringField = readJsonStringField(e, VLr, r, a);
    let jsonStringField_2 = readJsonStringField(e, q, r, a);
    if (jsonStringField && jsonStringField_2 && !n.has(jsonStringField)) {
      let f = sanitizeToolLabel(jsonStringField_2) ?? EMPTY_TOOL_LABEL;
      n.set(jsonStringField, {
        tool: f,
        detail: extractToolEvidenceLabel(f, e, r, a),
      });
      let l = n.keys().next();
      if (n.size > MAX_EVIDENCE_FIELD_CHARS && !l.done) n.delete(l.value);
    }
    r = i;
  }
}
export { all, returnValue, replayAsyncIterable, returnValue_2, releasingAsyncIterator, toArray_2 };

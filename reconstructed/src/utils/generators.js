/**
 * utils/generators.ts
 *
 * 异步生成器工具（all 并发合并、转发 return 值、结果 promise）；另混入极简 plist XML 解析器与 ReadableStream 适配
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/generators.ts
 * pieces: chunk-0sxtya66.js (1), chunk-e6aww6q8.js (4)
 * attribution: fingerprint 2, placement 3
 */
import { ty, readJsonStringField, encode_7 as encode_7_2 } from "../services/usageInsights/transcriptScan.js";
import {
  encode_3,
  encode_4,
  F,
  b,
  extractToolEvidenceLabel,
  z,
} from "../services/usageInsights/recommendations.js";

/**
 * 并发合并多个异步生成器（最多 n 个同时运行），按产出先后交错 yield 各生成器的值。
 */
//@ chunk-e6aww6q8.js:922183-922573 fingerprint = all (1)
async function* all(generators, concurrencyCap = 1 / 0) {
  let next = (generator) => {
      let promise = generator
        .next()
        .then(({ done: w, value: L }) => ({ done: w, value: L, generator: generator, promise: promise }));
      return promise;
    },
    waiting = [...generators],
    promises = new Set();
  while (promises.size < concurrencyCap && waiting.length > 0) {
    let gen = waiting.shift();
    promises.add(next(gen));
  }
  while (promises.size > 0) {
    let { done: done, value: value, generator: generator, promise: promise } = await Promise.race(promises);
    if ((promises.delete(promise), !done)) {
      if ((promises.add(next(generator)), value !== void 0)) yield value;
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
async function* o4s(e) {
  for (let n of e) yield n;
}
/**
 * 包装异步迭代器：结束或出错后释放对原迭代器的引用，之后 next/return 直接完成；支持 await using 释放。
 */
//@ chunk-e6aww6q8.js:922689-923051 placement
function releasingAsyncIterator(e) {
  let n = e,
    r = (S) => {
      if (S.done) n = void 0;
      return S;
    },
    s = (S) => {
      throw ((n = void 0), S);
    },
    h = (S) => Promise.resolve({ done: !0, value: S }),
    y = {
      next: (S) => (n ? n.next(S).then(r, s) : h(void 0)),
      return: (S) => (n ? n.return(S).then(r, s) : h(S)),
      throw: (S) => (n ? n.throw(S).then(r, s) : Promise.reject(S)),
      [Symbol.asyncIterator]: () => y,
      [Symbol.asyncDispose]: async () => {
        await y.return(void 0);
      },
    };
  return y;
}
//@ chunk-0sxtya66.js:3695-3948 fingerprint = returnValue (1)
function returnValue(e, t, n) {
  let r = ty(e, encode_3, 0, t);
  while (r >= 0) {
    let i = ty(e, encode_3, r + encode_3.length, t),
      a = i < 0 ? t : i,
      d = readJsonStringField(e, encode_7_2, r, a),
      s = readJsonStringField(e, encode_4, r, a);
    if (d && s && !n.has(d)) {
      let f = F(s) ?? b;
      n.set(d, { tool: f, detail: extractToolEvidenceLabel(f, e, r, a) });
      let l = n.keys().next();
      if (n.size > z && !l.done) n.delete(l.value);
    }
    r = i;
  }
}

export { all, returnValue, o4s, releasingAsyncIterator, toArray_2 };

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
import {
  indexOfBytes,
  readJsonStringField,
  ID_FIELD_MARKER,
} from "../services/usageInsights/transcriptScan.js";
import {
  TOOL_USE_TYPE_MARKER,
  TOOL_NAME_FIELD_MARKER,
  sanitizeToolLabel,
  EMPTY_TOOL_LABEL,
  extractToolEvidenceLabel,
  MAX_EVIDENCE_FIELD_CHARS,
} from "../services/usageInsights/recommendations.js";

//@ chunk-e6aww6q8.js:922105-922183 placement (2.1.88 match: returnValue, 1)
async function returnValue_2(as) {
  let e;
  do e = await as.next();
  while (!e.done);
  return e.value;
}
//@ chunk-e6aww6q8.js:922183-922573 fingerprint (2.1.88 match: all, 1)
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
  for await (let item of generator) result.push(item);
  return result;
}
//@ chunk-e6aww6q8.js:922644-922689 placement
/**
 * 把同步可迭代对象重新包装为异步生成器（逐项 yield）。
 */
async function* replayAsyncIterable(iterable) {
  for (let item of iterable) yield item;
}
//@ chunk-e6aww6q8.js:922689-923051 placement
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
//@ chunk-0sxtya66.js:3695-3948 fingerprint (2.1.88 match: returnValue, 1)
function returnValue(buffer, end, evidenceByTool) {
  let fieldStart = indexOfBytes(buffer, TOOL_USE_TYPE_MARKER, 0, end);
  while (fieldStart >= 0) {
    let nextRecord = indexOfBytes(
      buffer,
      TOOL_USE_TYPE_MARKER,
      fieldStart + TOOL_USE_TYPE_MARKER.length,
      end,
    );
    let recordEnd = nextRecord < 0 ? end : nextRecord;
    let jsonStringField = readJsonStringField(buffer, ID_FIELD_MARKER, fieldStart, recordEnd);
    let label = readJsonStringField(buffer, TOOL_NAME_FIELD_MARKER, fieldStart, recordEnd);
    if (jsonStringField && label && !evidenceByTool.has(jsonStringField)) {
      let toolLabel = sanitizeToolLabel(label) ?? EMPTY_TOOL_LABEL;
      evidenceByTool.set(jsonStringField, {
        tool: toolLabel,
        detail: extractToolEvidenceLabel(toolLabel, buffer, fieldStart, recordEnd),
      });
      let oldestEntry = evidenceByTool.keys().next();
      if (evidenceByTool.size > MAX_EVIDENCE_FIELD_CHARS && !oldestEntry.done)
        evidenceByTool.delete(oldestEntry.value);
    }
    fieldStart = nextRecord;
  }
}
export { all, returnValue, replayAsyncIterable, returnValue_2, releasingAsyncIterator, toArray_2 };

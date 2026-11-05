/**
 * @anthropic-ai/bedrock-sdk/internal/shims.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-b8zxeazh.js (3)
 * attribution: esm-fingerprint 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-b8zxeazh.js:5935-6155 esm-fingerprint
function makeReadableStream(...args) {
  let ReadableStream_2 = globalThis.ReadableStream;
  if (typeof ReadableStream_2 === "undefined")
    throw Error(
      "`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`",
    );
  return new ReadableStream_2(...args);
}
//@ chunk-b8zxeazh.js:6155-6389 esm-fingerprint
function ReadableStreamFrom(iterable) {
  let iter =
    Symbol.asyncIterator in iterable ? iterable[Symbol.asyncIterator]() : iterable[Symbol.iterator]();
  return makeReadableStream({
    start() {},
    async pull(controller) {
      let { done, value } = await iter.next();
      if (done) controller.close();
      else controller.enqueue(value);
    },
    async cancel() {
      await iter.return?.();
    },
  });
}
//@ chunk-b8zxeazh.js:6389-6701 esm-fingerprint
function ReadableStreamToAsyncIterable(stream) {
  if (stream[Symbol.asyncIterator]) return stream;
  let reader = stream.getReader();
  return {
    async next() {
      try {
        let result = await reader.read();
        if (result?.done) reader.releaseLock();
        return result;
      } catch (e) {
        reader.releaseLock();
        throw e;
      }
    },
    async return() {
      let cancelPromise = reader.cancel();
      reader.releaseLock();
      await cancelPromise;
      return {
        done: true,
        value: undefined,
      };
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
}
export { ReadableStreamToAsyncIterable, ReadableStreamFrom };

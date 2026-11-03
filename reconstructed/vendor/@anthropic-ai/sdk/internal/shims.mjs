/**
 * @anthropic-ai/sdk/internal/shims.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (5)
 * attribution: esm-fingerprint 5
 */

//@ chunk-hwmsct5x.js:17807-18018 esm-fingerprint
function getDefaultFetch() {
  if (typeof fetch !== "undefined") return fetch;
  throw Error(
    "`fetch` is not defined as a global; Either pass `fetch` to the client, `new Anthropic({ fetch })` or polyfill the global, `globalThis.fetch = fetch`",
  );
}
//@ chunk-hwmsct5x.js:18018-18238 esm-fingerprint
function makeReadableStream(...args) {
  let n = globalThis.ReadableStream;
  if (typeof n === "undefined")
    throw Error(
      "`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`",
    );
  return new n(...args);
}
//@ chunk-hwmsct5x.js:18238-18473 esm-fingerprint
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
//@ chunk-hwmsct5x.js:18473-18786 esm-fingerprint
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
//@ chunk-hwmsct5x.js:18786-18982 esm-fingerprint
async function CancelReadableStream(stream) {
  if (stream === null || typeof stream !== "object") return;
  if (stream[Symbol.asyncIterator]) {
    await stream[Symbol.asyncIterator]().return?.();
    return;
  }
  let reader = stream.getReader();
  let cancelPromise = reader.cancel();
  reader.releaseLock();
  await cancelPromise;
}
export {
  ReadableStreamToAsyncIterable,
  makeReadableStream,
  ReadableStreamFrom,
  getDefaultFetch,
  CancelReadableStream,
};

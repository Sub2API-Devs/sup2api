/**
 * @anthropic-ai/bedrock-sdk/internal/shims.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/bedrock-sdk@0.33.7..0.34.3
 * pieces: chunk-h87x8cg3.js (3)
 * attribution: esm-fingerprint 3
 */

//@ chunk-h87x8cg3.js:5935-6155 esm-fingerprint
function Oe(...e) {
  let t = globalThis.ReadableStream;
  if (typeof t > "u")
    throw Error(
      "`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`",
    );
  return new t(...e);
}
//@ chunk-h87x8cg3.js:6155-6389 esm-fingerprint
function W(e) {
  let t = Symbol.asyncIterator in e ? e[Symbol.asyncIterator]() : e[Symbol.iterator]();
  return Oe({
    start() {},
    async pull(r) {
      let { done: n, value: s } = await t.next();
      if (n) r.close();
      else r.enqueue(s);
    },
    async cancel() {
      await t.return?.();
    },
  });
}
//@ chunk-h87x8cg3.js:6389-6701 esm-fingerprint
function z(e) {
  if (e[Symbol.asyncIterator]) return e;
  let reader = e.getReader();
  return {
    async next() {
      try {
        let read = await reader.read();
        if (read?.done) reader.releaseLock();
        return read;
      } catch (error) {
        throw (reader.releaseLock(), error);
      }
    },
    async return() {
      let cancel = reader.cancel();
      return (reader.releaseLock(), await cancel, { done: !0, value: void 0 });
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
}

export { z, W };

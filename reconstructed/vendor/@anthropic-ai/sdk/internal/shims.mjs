/**
 * @anthropic-ai/sdk/internal/shims.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (5)
 * attribution: esm-fingerprint 5
 */

//@ chunk-hwmsct5x.js:17807-18018 esm-fingerprint
function Kl() {
  if (typeof fetch < "u") return fetch;
  throw Error(
    "`fetch` is not defined as a global; Either pass `fetch` to the client, `new Anthropic({ fetch })` or polyfill the global, `globalThis.fetch = fetch`",
  );
}
//@ chunk-hwmsct5x.js:18018-18238 esm-fingerprint
function Bi(...e) {
  let n = globalThis.ReadableStream;
  if (typeof n > "u")
    throw Error(
      "`ReadableStream` is not defined as a global; You will need to polyfill it, `globalThis.ReadableStream = ReadableStream`",
    );
  return new n(...e);
}
//@ chunk-hwmsct5x.js:18238-18473 esm-fingerprint
function $o(e) {
  let n = Symbol.asyncIterator in e ? e[Symbol.asyncIterator]() : e[Symbol.iterator]();
  return Bi({
    start() {},
    async pull(r) {
      let { done: s, value: h } = await n.next();
      if (s) r.close();
      else r.enqueue(h);
    },
    async cancel() {
      await n.return?.();
    },
  });
}
//@ chunk-hwmsct5x.js:18473-18786 esm-fingerprint
function rr(e) {
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
//@ chunk-hwmsct5x.js:18786-18982 esm-fingerprint
async function Vl(e) {
  if (e === null || typeof e !== "object") return;
  if (e[Symbol.asyncIterator]) {
    await e[Symbol.asyncIterator]().return?.();
    return;
  }
  let reader = e.getReader(),
    cancel = reader.cancel();
  (reader.releaseLock(), await cancel);
}

export { rr, Bi, $o, Kl, Vl };

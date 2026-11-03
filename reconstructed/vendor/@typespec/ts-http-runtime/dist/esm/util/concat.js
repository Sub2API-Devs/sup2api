/**
 * @typespec/ts-http-runtime/dist/esm/util/concat.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (7)
 * attribution: esm-layout 2, esm-fingerprint 5
 */
import { Readable } from "stream";
import { __asyncGenerator, __await, __asyncValues } from "../../../../../tslib/tslib.es6.mjs";

//@ chunk-mrx6y2r5.js:47151-47192 esm-layout
function rt(e, t) {
  return Buffer.from(e, t);
}
//@ chunk-mrx6y2r5.js:49828-49879 esm-layout
function hasStreamMethod(e) {
  return typeof e.stream === "function";
}
//@ chunk-mrx6y2r5.js:49914-50120 esm-fingerprint
function readableStreamAsyncIterator() {
  return __asyncGenerator(this, arguments, function* () {
    let reader = this.getReader();
    try {
      while (!0) {
        let { done: r, value: n } = yield __await(reader.read());
        if (r) return yield __await(void 0);
        yield yield __await(n);
      }
    } finally {
      reader.releaseLock();
    }
  });
}
//@ chunk-mrx6y2r5.js:50120-50231 esm-fingerprint
function polyfillReadableStreamIterator(e) {
  if (!e[Symbol.asyncIterator]) e[Symbol.asyncIterator] = readableStreamAsyncIterator.bind(e);
  if (!e.values) e.values = readableStreamAsyncIterator.bind(e);
}
//@ chunk-mrx6y2r5.js:50231-50318 esm-fingerprint
function toNodeReadable(e) {
  if (e instanceof ReadableStream) return (polyfillReadableStreamIterator(e), Readable.fromWeb(e));
  else return e;
}
//@ chunk-mrx6y2r5.js:50318-50445 esm-fingerprint
function toNodeReadableFromBody(e) {
  if (e instanceof Uint8Array) return Readable.from(Buffer.from(e));
  else if (hasStreamMethod(e)) return toNodeReadable(e.stream());
  else return toNodeReadable(e);
}
//@ chunk-mrx6y2r5.js:50445-50855 esm-fingerprint
async function Pl(e) {
  return function () {
    let mapped = e.map((r) => (typeof r === "function" ? r() : r)).map(toNodeReadableFromBody);
    return Readable.from(
      (function () {
        return __asyncGenerator(this, arguments, function* () {
          var r, n, o, i;
          for (let l of mapped)
            try {
              for (
                var s = !0, a = ((n = void 0), __asyncValues(l)), c;
                (c = yield __await(a.next())), (r = c.done), !r;
                s = !0
              )
                ((i = c.value), (s = !1), yield yield __await(i));
            } catch (error) {
              n = { error: error };
            } finally {
              try {
                if (!s && !r && (o = a.return)) yield __await(o.call(a));
              } finally {
                if (n) throw n.error;
              }
            }
        });
      })(),
    );
  };
}

export { rt, hasStreamMethod, Pl };

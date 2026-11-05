/**
 * @typespec/ts-http-runtime/dist/esm/util/concat.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-b5df2wx1.js (7)
 * attribution: esm-layout 2, esm-fingerprint 5
 */
import { Readable } from "stream";
import { __asyncGenerator, __await, __asyncValues } from "../../../../../tslib/tslib.es6.mjs";

//@ chunk-b5df2wx1.js:47151-47192 esm-layout
function stringToUint8Array(value, format) {
  return Buffer.from(value, format);
}
//@ chunk-b5df2wx1.js:49828-49879 esm-layout
function hasStreamMethod(source) {
  return typeof source.stream === "function";
}
//@ chunk-b5df2wx1.js:49914-50120 esm-fingerprint
function readableStreamAsyncIterator() {
  return __asyncGenerator(this, arguments, function* () {
    let reader = this.getReader();
    try {
      while (true) {
        let { done, value } = yield __await(reader.read());
        if (done) return yield __await(undefined);
        yield yield __await(value);
      }
    } finally {
      reader.releaseLock();
    }
  });
}
//@ chunk-b5df2wx1.js:50120-50231 esm-fingerprint
function polyfillReadableStreamIterator(webStream) {
  if (!webStream[Symbol.asyncIterator])
    webStream[Symbol.asyncIterator] = readableStreamAsyncIterator.bind(webStream);
  if (!webStream.values) webStream.values = readableStreamAsyncIterator.bind(webStream);
}
//@ chunk-b5df2wx1.js:50231-50318 esm-fingerprint
function toNodeReadable(stream) {
  if (stream instanceof ReadableStream) {
    polyfillReadableStreamIterator(stream);
    return Readable.fromWeb(stream);
  } else return stream;
}
//@ chunk-b5df2wx1.js:50318-50445 esm-fingerprint
function toNodeReadableFromBody(source) {
  if (source instanceof Uint8Array) return Readable.from(Buffer.from(source));
  else if (hasStreamMethod(source)) return toNodeReadable(source.stream());
  else return toNodeReadable(source);
}
//@ chunk-b5df2wx1.js:50445-50855 esm-fingerprint
async function concat(sources) {
  return function () {
    let streams = sources.map((x) => (typeof x === "function" ? x() : x)).map(toNodeReadableFromBody);
    return Readable.from(
      (function () {
        return __asyncGenerator(this, arguments, function* () {
          var _a;
          var e_1;
          var _b;
          var _c;
          for (let stream of streams)
            try {
              for (
                var _d = true, stream_1 = ((e_1 = undefined), __asyncValues(stream)), stream_1_1;
                (stream_1_1 = yield __await(stream_1.next())), (_a = stream_1_1.done), !_a;
                _d = true
              ) {
                _c = stream_1_1.value;
                _d = false;
                yield yield __await(_c);
              }
            } catch (e_1_1) {
              e_1 = {
                error: e_1_1,
              };
            } finally {
              try {
                if (!_d && !_a && (_b = stream_1.return)) yield __await(_b.call(stream_1));
              } finally {
                if (e_1) throw e_1.error;
              }
            }
        });
      })(),
    );
  };
}
export { stringToUint8Array, hasStreamMethod, concat };

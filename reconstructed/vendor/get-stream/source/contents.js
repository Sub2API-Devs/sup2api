/**
 * get-stream/source/contents.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: get-stream@8.0.1
 * pieces: chunk-m4p5zn6n.js (2)
 * attribution: esm-fingerprint 2
 */

//@ chunk-m4p5zn6n.js:21236-22730 esm-fingerprint
var D = async (
    e,
    {
      init: init,
      convertChunk: convertChunk,
      getSize: getSize,
      truncateChunk: truncateChunk,
      addChunk: addChunk,
      getFinalChunk: getFinalChunk,
      finalize: finalize,
    },
    { maxBuffer: f = Number.POSITIVE_INFINITY } = {},
  ) => {
    if (!to(e)) throw Error("The first argument must be a Readable, a ReadableStream, or an async iterable.");
    let p = init();
    p.length = 0;
    try {
      for await (let h of e) {
        let S = no(h),
          y = convertChunk[S](h, p);
        cn({
          convertedChunk: y,
          state: p,
          getSize: getSize,
          truncateChunk: truncateChunk,
          addChunk: addChunk,
          maxBuffer: f,
        });
      }
      return (
        eo({
          state: p,
          convertChunk: convertChunk,
          getSize: getSize,
          truncateChunk: truncateChunk,
          addChunk: addChunk,
          getFinalChunk: getFinalChunk,
          maxBuffer: f,
        }),
        finalize(p)
      );
    } catch (error) {
      throw ((error.bufferedData = finalize(p)), error);
    }
  },
  eo = ({
    state: state,
    getSize: getSize,
    truncateChunk: truncateChunk,
    addChunk: addChunk,
    getFinalChunk: getFinalChunk,
    maxBuffer: maxBuffer,
  }) => {
    let d = getFinalChunk(state);
    if (d !== void 0)
      cn({
        convertedChunk: d,
        state: state,
        getSize: getSize,
        truncateChunk: truncateChunk,
        addChunk: addChunk,
        maxBuffer: maxBuffer,
      });
  },
  cn = ({
    convertedChunk: convertedChunk,
    state: state,
    getSize: getSize,
    truncateChunk: truncateChunk,
    addChunk: addChunk,
    maxBuffer: maxBuffer,
  }) => {
    let d = getSize(convertedChunk),
      l = state.length + d;
    if (l <= maxBuffer) {
      an(convertedChunk, state, addChunk, l);
      return;
    }
    let f = truncateChunk(convertedChunk, maxBuffer - state.length);
    if (f !== void 0) an(f, state, addChunk, maxBuffer);
    throw new $e();
  },
  an = (e, n, r, o) => {
    ((n.contents = r(e, n, o)), (n.length = o));
  },
  to = (e) => typeof e === "object" && e !== null && typeof e[Symbol.asyncIterator] === "function",
  no = (e) => {
    let n = typeof e;
    if (n === "string") return "string";
    if (n !== "object" || e === null) return "others";
    if (globalThis.Buffer?.isBuffer(e)) return "buffer";
    let r = toString.call(e);
    if (r === "[object ArrayBuffer]") return "arrayBuffer";
    if (r === "[object DataView]") return "dataView";
    if (
      Number.isInteger(e.byteLength) &&
      Number.isInteger(e.byteOffset) &&
      toString.call(e.buffer) === "[object ArrayBuffer]"
    )
      return "typedArray";
    return "others";
  },
  { toString: toString } = Object.prototype;
//@ chunk-m4p5zn6n.js:22730-22818 esm-fingerprint
class $e extends Error {
  name = "MaxBufferError";
  constructor() {
    super("maxBuffer exceeded");
  }
}

export { D };

/**
 * @anthropic-ai/sdk/internal/decoders/line.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { __classPrivateFieldSet, __classPrivateFieldGet } from "../tslib.mjs";
import { encodeUTF8, concatBytes, decodeUtf8 } from "../utils/bytes.mjs";

//@ chunk-hwmsct5x.js:27813-28807 esm-layout
var _LineDecoder_buffer;
var _LineDecoder_carriageReturnIndex;
var LineDecoder = (() => {
  class LineDecoder {
    constructor() {
      _LineDecoder_buffer.set(this, undefined);
      _LineDecoder_carriageReturnIndex.set(this, undefined);
      __classPrivateFieldSet(this, _LineDecoder_buffer, new Uint8Array(), "f");
      __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
    }
    decode(chunk) {
      if (chunk == null) return [];
      let binaryChunk =
        chunk instanceof ArrayBuffer
          ? new Uint8Array(chunk)
          : typeof chunk === "string"
            ? encodeUTF8(chunk)
            : chunk;
      __classPrivateFieldSet(
        this,
        _LineDecoder_buffer,
        concatBytes([__classPrivateFieldGet(this, _LineDecoder_buffer, "f"), binaryChunk]),
        "f",
      );
      let lines = [];
      let patternIndex;
      while (
        (patternIndex = findNewlineIndex(
          __classPrivateFieldGet(this, _LineDecoder_buffer, "f"),
          __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f"),
        )) != null
      ) {
        if (
          patternIndex.carriage &&
          __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") == null
        ) {
          __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, patternIndex.index, "f");
          continue;
        }
        if (
          __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") != null &&
          (patternIndex.index !== __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") + 1 ||
            patternIndex.carriage)
        ) {
          lines.push(
            decodeUtf8(
              __classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(
                0,
                __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") - 1,
              ),
            ),
          );
          __classPrivateFieldSet(
            this,
            _LineDecoder_buffer,
            __classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(
              __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f"),
            ),
            "f",
          );
          __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
          continue;
        }
        let endIndex =
          __classPrivateFieldGet(this, _LineDecoder_carriageReturnIndex, "f") !== null
            ? patternIndex.preceding - 1
            : patternIndex.preceding;
        let line = decodeUtf8(__classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(0, endIndex));
        lines.push(line);
        __classPrivateFieldSet(
          this,
          _LineDecoder_buffer,
          __classPrivateFieldGet(this, _LineDecoder_buffer, "f").subarray(patternIndex.index),
          "f",
        );
        __classPrivateFieldSet(this, _LineDecoder_carriageReturnIndex, null, "f");
      }
      return lines;
    }
    flush() {
      if (!__classPrivateFieldGet(this, _LineDecoder_buffer, "f").length) return [];
      return this.decode(`
`);
    }
  }
  _LineDecoder_buffer = new WeakMap();
  _LineDecoder_carriageReturnIndex = new WeakMap();
  LineDecoder.NEWLINE_CHARS = new Set([
    `
`,
    "\r",
  ]);
  LineDecoder.NEWLINE_REGEXP = /\r\n|[\n\r]/g;
  return LineDecoder;
})();
//@ chunk-hwmsct5x.js:28807-28977 esm-fingerprint
function findNewlineIndex(buffer, startIndex) {
  for (let i = startIndex ?? 0; i < buffer.length; i++) {
    if (buffer[i] === 10)
      return {
        preceding: i,
        index: i + 1,
        carriage: false,
      };
    if (buffer[i] === 13)
      return {
        preceding: i,
        index: i + 1,
        carriage: true,
      };
  }
  return null;
}
export { LineDecoder };

/**
 * @bufbuild/protobuf/dist/cjs/wire/text-encoding.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-fq0cr76a.js:332193-332773 cjs-require-graph
var require_text_encoding = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.configureTextEncoding = configureTextEncoding;
  cjsExports.getTextEncoding = getTextEncoding;
  var symbol = Symbol.for("@bufbuild/protobuf/text-encoding");
  function configureTextEncoding(textEncoding) {
    globalThis[symbol] = textEncoding;
  }
  function getTextEncoding() {
    if (globalThis[symbol] == null) {
      let te = new globalThis.TextEncoder();
      let td = new globalThis.TextDecoder();
      let tdStrict;
      globalThis[symbol] = {
        encodeUtf8(text) {
          return te.encode(text);
        },
        decodeUtf8(bytes, strict) {
          if (strict) {
            if (tdStrict === undefined)
              tdStrict = new globalThis.TextDecoder("utf-8", {
                fatal: true,
              });
            return tdStrict.decode(bytes);
          }
          return td.decode(bytes);
        },
        checkUtf8(text) {
          try {
            encodeURIComponent(text);
            return true;
          } catch (_) {
            return false;
          }
        },
      };
    }
    return globalThis[symbol];
  }
});
export { require_text_encoding };

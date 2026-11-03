/**
 * mime-types/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: mime-types@2.1.35
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../runtime/bun-runtime.js";

//@ chunk-h6b7mazd.js:4742-5269 cjs-require-graph
var Sn = x(function (vl, _n) {
  var Ze = (e) => () => {
    throw Error(
      "mime-types." +
        e +
        "() is stubbed in this build. Do not rely on axios auto-multipart serialization (plain object + Content-Type: multipart/form-data). Use native FormData or hand-roll the multipart body instead. See scripts/build-plugins.ts stubMimeTypes plugin.",
    );
  };
  _n.exports = {
    lookup: Ze("lookup"),
    contentType: Ze("contentType"),
    extension: Ze("extension"),
    charset: Ze("charset"),
    extensions: Object.create(null),
    types: Object.create(null),
    charsets: { lookup: Ze("charsets.lookup") },
  };
});

export { Sn };

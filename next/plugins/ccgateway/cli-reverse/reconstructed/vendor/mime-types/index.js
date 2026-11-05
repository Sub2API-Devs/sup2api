/**
 * mime-types/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: mime-types@2.1.35
 * pieces: chunk-ww9agm6g.js (1)
 * attribution: cjs-require-graph 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../runtime/bun-runtime.js";

//@ chunk-ww9agm6g.js:4742-5269 cjs-require-graph
var require_mime_types = __commonJS(function (cjsExports, cjsModule) {
  var makeStub = (methodName) => () => {
    throw Error(
      "mime-types." +
        methodName +
        "() is stubbed in this build. Do not rely on axios auto-multipart serialization (plain object + Content-Type: multipart/form-data). Use native FormData or hand-roll the multipart body instead. See scripts/build-plugins.ts stubMimeTypes plugin.",
    );
  };
  cjsModule.exports = {
    lookup: makeStub("lookup"),
    contentType: makeStub("contentType"),
    extension: makeStub("extension"),
    charset: makeStub("charset"),
    extensions: Object.create(null),
    types: Object.create(null),
    charsets: {
      lookup: makeStub("charsets.lookup"),
    },
  };
});
export { require_mime_types };

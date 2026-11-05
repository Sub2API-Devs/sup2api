/**
 * @protobufjs/path/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @protobufjs/path@1.1.2
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";

//@ chunk-3k21nfa0.js:79292-79820 cjs-fingerprint
var require_path = __commonJS(function (cjsExports) {
  var path = cjsExports;
  var isAbsolute = (path.isAbsolute = function (path) {
    return /^(?:\/|\w+:)/.test(path);
  });
  var normalize = (path.normalize = function (path) {
    path = path.replace(/\\/g, "/").replace(/\/{2,}/g, "/");
    var parts = path.split("/");
    var absolute = isAbsolute(path);
    var prefix = "";
    if (absolute) prefix = parts.shift() + "/";
    for (var i = 0; i < parts.length;)
      if (parts[i] === "..") {
        if (i > 0 && parts[i - 1] !== "..") parts.splice(--i, 2);
        else if (absolute) parts.splice(i, 1);
        else ++i;
      } else if (parts[i] === ".") parts.splice(i, 1);
      else ++i;
    return prefix + parts.join("/");
  });
  path.resolve = function (originPath, includePath, alreadyNormalized) {
    if (!alreadyNormalized) includePath = normalize(includePath);
    if (isAbsolute(includePath)) return includePath;
    if (!alreadyNormalized) originPath = normalize(originPath);
    return (originPath = originPath.replace(/(?:\/|^)[^/]+$/, "")).length
      ? normalize(originPath + "/" + includePath)
      : includePath;
  };
});
export { require_path };

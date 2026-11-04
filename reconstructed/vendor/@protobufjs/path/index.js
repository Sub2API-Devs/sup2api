/**
 * @protobufjs/path/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @protobufjs/path@1.1.2
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x } from "../../../runtime/bun-runtime.js";

//@ chunk-pwh5dx3n.js:79292-79820 cjs-fingerprint
var ad = x(function (cjsExports) {
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
export { ad };

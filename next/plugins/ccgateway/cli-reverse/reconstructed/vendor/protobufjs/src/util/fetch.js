/**
 * protobufjs/src/util/fetch.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint+context 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_aspromise } from "./aspromise.js";
import { require_inquire } from "../../../unresolved-cjs/index.js";

//@ chunk-pwh5dx3n.js:78403-79292 cjs-fingerprint+context
var require_fetch = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = fetchFile;
  var asPromise = require_aspromise();
  var requireModule = require_inquire();
  var fs = requireModule("fs");
  function fetchFile(filename, options, callback) {
    if (typeof options === "function") {
      callback = options;
      options = {};
    } else if (!options) options = {};
    if (!callback) return asPromise(fetchFile, this, filename, options);
    if (!options.xhr && fs && fs.readFile)
      return fs.readFile(filename, function (err, contents) {
        return err && typeof XMLHttpRequest !== "undefined"
          ? fetchFile.xhr(filename, options, callback)
          : err
            ? callback(err)
            : callback(null, options.binary ? contents : contents.toString("utf8"));
      });
    return fetchFile.xhr(filename, options, callback);
  }
  fetchFile.xhr = function (filename, options, callback) {
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
      if (xhr.readyState !== 4) return;
      if (xhr.status !== 0 && xhr.status !== 200) return callback(Error("status " + xhr.status));
      if (options.binary) {
        var buffer = xhr.response;
        if (!buffer) {
          buffer = [];
          for (var i = 0; i < xhr.responseText.length; ++i) buffer.push(xhr.responseText.charCodeAt(i) & 255);
        }
        return callback(null, typeof Uint8Array !== "undefined" ? new Uint8Array(buffer) : buffer);
      }
      return callback(null, xhr.responseText);
    };
    if (options.binary) {
      if ("overrideMimeType" in xhr) xhr.overrideMimeType("text/plain; charset=x-user-defined");
      xhr.responseType = "arraybuffer";
    }
    xhr.open("GET", filename);
    xhr.send();
  };
});
export { require_fetch };

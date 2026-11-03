/**
 * protobufjs/src/util/fetch.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint+context 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { QPo } from "./aspromise.js";
import { td } from "../../../unresolved-cjs/index.js";

//@ chunk-pwh5dx3n.js:78403-79292 cjs-fingerprint+context
var id = x(function (eA, rd) {
  rd.exports = wi;
  var nE = QPo(),
    aE = td(),
    Ma = aE("fs");
  function wi(e, t, r) {
    if (typeof t === "function") ((r = t), (t = {}));
    else if (!t) t = {};
    if (!r) return nE(wi, this, e, t);
    if (!t.xhr && Ma && Ma.readFile)
      return Ma.readFile(e, function (s, n) {
        return s && typeof XMLHttpRequest < "u"
          ? wi.xhr(e, t, r)
          : s
            ? r(s)
            : r(null, t.binary ? n : n.toString("utf8"));
      });
    return wi.xhr(e, t, r);
  }
  wi.xhr = function (t, r, i) {
    var xMLHttpRequest = new XMLHttpRequest();
    if (
      ((xMLHttpRequest.onreadystatechange = function () {
        if (xMLHttpRequest.readyState !== 4) return;
        if (xMLHttpRequest.status !== 0 && xMLHttpRequest.status !== 200)
          return i(Error("status " + xMLHttpRequest.status));
        if (r.binary) {
          var response = xMLHttpRequest.response;
          if (!response) {
            response = [];
            for (var o = 0; o < xMLHttpRequest.responseText.length; ++o)
              response.push(xMLHttpRequest.responseText.charCodeAt(o) & 255);
          }
          return i(null, typeof Uint8Array < "u" ? new Uint8Array(response) : response);
        }
        return i(null, xMLHttpRequest.responseText);
      }),
      r.binary)
    ) {
      if ("overrideMimeType" in xMLHttpRequest)
        xMLHttpRequest.overrideMimeType("text/plain; charset=x-user-defined");
      xMLHttpRequest.responseType = "arraybuffer";
    }
    (xMLHttpRequest.open("GET", t), xMLHttpRequest.send());
  };
});

export { id };

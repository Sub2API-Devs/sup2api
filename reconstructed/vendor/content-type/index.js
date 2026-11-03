/**
 * content-type/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: content-type@1.0.5
 * pieces: chunk-r1g76qsy.js (1)
 * attribution: cjs-fingerprint 1
 */
import { J, Eo } from "../@modelcontextprotocol/core/(bundler runtime of a pre-bundled dist file).js";

//@ chunk-r1g76qsy.js:115925-117199 cjs-fingerprint
var fu = J((e) => {
    var t =
        /; *([!#$%&'*+.^_`|~0-9A-Za-z-]+) *= *("(?:[\u000b\u0020\u0021\u0023-\u005b\u005d-\u007e\u0080-\u00ff]|\\[\u000b\u0020-\u00ff])*"|[!#$%&'*+.^_`|~0-9A-Za-z-]+) */g,
      r = /\\([\u000b\u0020-\u00ff])/g,
      s = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+\/[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
    e.parse = a;
    function a(l) {
      if (!l) throw TypeError("argument string is required");
      var c = typeof l === "object" ? n(l) : l;
      if (typeof c !== "string") throw TypeError("argument string is required to be a string");
      var index = c.indexOf(";"),
        m = index !== -1 ? c.slice(0, index).trim() : c.trim();
      if (!s.test(m)) throw TypeError("invalid media type");
      var _ = new i(m.toLowerCase());
      if (index !== -1) {
        var w, P, y;
        t.lastIndex = index;
        while ((P = t.exec(c))) {
          if (P.index !== index) throw TypeError("invalid parameter format");
          if (((index += P[0].length), (w = P[1].toLowerCase()), (y = P[2]), y.charCodeAt(0) === 34)) {
            if (((y = y.slice(1, -1)), y.indexOf("\\") !== -1)) y = y.replace(r, "$1");
          }
          _.parameters[w] = y;
        }
        if (index !== c.length) throw TypeError("invalid parameter format");
      }
      return _;
    }
    function n(l) {
      var c;
      if (typeof l.getHeader === "function") c = l.getHeader("content-type");
      else if (typeof l.headers === "object") c = l.headers && l.headers["content-type"];
      if (typeof c !== "string") throw TypeError("content-type header is missing from object");
      return c;
    }
    function i(l) {
      ((this.parameters = Object.create(null)), (this.type = l));
    }
  }),
  Su = Eo(fu(), 1);

export { Su };

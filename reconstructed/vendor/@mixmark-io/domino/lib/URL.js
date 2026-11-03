/**
 * @mixmark-io/domino/lib/URL.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-vwj6ccer.js:73463-76243 cjs-fingerprint
var ca = x(function (Rd, m0) {
  m0.exports = de;
  function de(e) {
    if (!e) return Object.create(de.prototype);
    this.url = e.replace(/^[ \t\n\r\f]+|[ \t\n\r\f]+$/g, "");
    var match = de.pattern.exec(this.url);
    if (match) {
      if (match[2]) this.scheme = match[2];
      if (match[4]) {
        var match_2 = match[4].match(de.userinfoPattern);
        if (match_2)
          ((this.username = match_2[1]),
            (this.password = match_2[3]),
            (match[4] = match[4].substring(match_2[0].length)));
        if (match[4].match(de.portPattern)) {
          var index = match[4].lastIndexOf(":");
          ((this.host = match[4].substring(0, index)), (this.port = match[4].substring(index + 1)));
        } else this.host = match[4];
      }
      if (match[5]) this.path = match[5];
      if (match[6]) this.query = match[7];
      if (match[8]) this.fragment = match[9];
    }
  }
  de.pattern = /^(([^:\/?#]+):)?(\/\/([^\/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?$/;
  de.userinfoPattern = /^([^@:]*)(:([^@]*))?@/;
  de.portPattern = /:\d+$/;
  de.authorityPattern = /^[^:\/?#]+:\/\//;
  de.hierarchyPattern = /^[^:\/?#]+:\//;
  de.percentEncode = function (t) {
    var code = t.charCodeAt(0);
    if (code < 256) return "%" + code.toString(16);
    else throw Error("can't percent-encode codepoints > 255 yet");
  };
  de.prototype = {
    constructor: de,
    isAbsolute: function () {
      return !!this.scheme;
    },
    isAuthorityBased: function () {
      return de.authorityPattern.test(this.url);
    },
    isHierarchical: function () {
      return de.hierarchyPattern.test(this.url);
    },
    toString: function () {
      var e = "";
      if (this.scheme !== void 0) e += this.scheme + ":";
      if (this.isAbsolute()) {
        if (((e += "//"), this.username || this.password)) {
          if (((e += this.username || ""), this.password)) e += ":" + this.password;
          e += "@";
        }
        if (this.host) e += this.host;
      }
      if (this.port !== void 0) e += ":" + this.port;
      if (this.path !== void 0) e += this.path;
      if (this.query !== void 0) e += "?" + this.query;
      if (this.fragment !== void 0) e += "#" + this.fragment;
      return e;
    },
    resolve: function (e) {
      var t = this,
        r = new de(e),
        a = new de();
      if (r.scheme !== void 0)
        ((a.scheme = r.scheme),
          (a.username = r.username),
          (a.password = r.password),
          (a.host = r.host),
          (a.port = r.port),
          (a.path = c(r.path)),
          (a.query = r.query));
      else if (((a.scheme = t.scheme), r.host !== void 0))
        ((a.username = r.username),
          (a.password = r.password),
          (a.host = r.host),
          (a.port = r.port),
          (a.path = c(r.path)),
          (a.query = r.query));
      else if (
        ((a.username = t.username), (a.password = t.password), (a.host = t.host), (a.port = t.port), !r.path)
      )
        if (((a.path = t.path), r.query !== void 0)) a.query = r.query;
        else a.query = t.query;
      else {
        if (r.path.charAt(0) === "/") a.path = c(r.path);
        else ((a.path = s(t.path, r.path)), (a.path = c(a.path)));
        a.query = r.query;
      }
      return ((a.fragment = r.fragment), a.toString());
      function s(d, g) {
        if (t.host !== void 0 && !t.path) return "/" + g;
        var index = d.lastIndexOf("/");
        if (index === -1) return g;
        else return d.substring(0, index + 1) + g;
      }
      function c(d) {
        if (!d) return d;
        var g = "";
        while (d.length > 0) {
          if (d === "." || d === "..") {
            d = "";
            break;
          }
          var substring = d.substring(0, 2),
            substring_2 = d.substring(0, 3),
            substring_3 = d.substring(0, 4);
          if (substring_2 === "../") d = d.substring(3);
          else if (substring === "./") d = d.substring(2);
          else if (substring_2 === "/./") d = "/" + d.substring(3);
          else if (substring === "/." && d.length === 2) d = "/";
          else if (substring_3 === "/../" || (substring_2 === "/.." && d.length === 3))
            ((d = "/" + d.substring(4)), (g = g.replace(/\/?[^\/]*$/, "")));
          else {
            var ne = d.match(/(\/?([^\/]*))/)[0];
            ((g += ne), (d = d.substring(ne.length)));
          }
        }
        return g;
      }
    },
  };
});

export { ca };

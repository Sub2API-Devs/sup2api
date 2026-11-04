/**
 * @mixmark-io/domino/lib/URL.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-vwj6ccer.js:73463-76243 cjs-fingerprint
var require_URL = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = URLClass;
  function URLClass(url) {
    if (!url) return Object.create(URLClass.prototype);
    this.url = url.replace(/^[ \t\n\r\f]+|[ \t\n\r\f]+$/g, "");
    var match = URLClass.pattern.exec(this.url);
    if (match) {
      if (match[2]) this.scheme = match[2];
      if (match[4]) {
        var userinfo = match[4].match(URLClass.userinfoPattern);
        if (userinfo) {
          this.username = userinfo[1];
          this.password = userinfo[3];
          match[4] = match[4].substring(userinfo[0].length);
        }
        if (match[4].match(URLClass.portPattern)) {
          var pos = match[4].lastIndexOf(":");
          this.host = match[4].substring(0, pos);
          this.port = match[4].substring(pos + 1);
        } else this.host = match[4];
      }
      if (match[5]) this.path = match[5];
      if (match[6]) this.query = match[7];
      if (match[8]) this.fragment = match[9];
    }
  }
  URLClass.pattern = /^(([^:\/?#]+):)?(\/\/([^\/?#]*))?([^?#]*)(\?([^#]*))?(#(.*))?$/;
  URLClass.userinfoPattern = /^([^@:]*)(:([^@]*))?@/;
  URLClass.portPattern = /:\d+$/;
  URLClass.authorityPattern = /^[^:\/?#]+:\/\//;
  URLClass.hierarchyPattern = /^[^:\/?#]+:\//;
  URLClass.percentEncode = function (s) {
    var c = s.charCodeAt(0);
    if (c < 256) return "%" + c.toString(16);
    else throw Error("can't percent-encode codepoints > 255 yet");
  };
  URLClass.prototype = {
    constructor: URLClass,
    isAbsolute: function () {
      return !!this.scheme;
    },
    isAuthorityBased: function () {
      return URLClass.authorityPattern.test(this.url);
    },
    isHierarchical: function () {
      return URLClass.hierarchyPattern.test(this.url);
    },
    toString: function () {
      var s = "";
      if (this.scheme !== undefined) s += this.scheme + ":";
      if (this.isAbsolute()) {
        s += "//";
        if (this.username || this.password) {
          s += this.username || "";
          if (this.password) s += ":" + this.password;
          s += "@";
        }
        if (this.host) s += this.host;
      }
      if (this.port !== undefined) s += ":" + this.port;
      if (this.path !== undefined) s += this.path;
      if (this.query !== undefined) s += "?" + this.query;
      if (this.fragment !== undefined) s += "#" + this.fragment;
      return s;
    },
    resolve: function (relative) {
      var base = this;
      var relativeURL = new URLClass(relative);
      var t = new URLClass();
      if (relativeURL.scheme !== undefined) {
        t.scheme = relativeURL.scheme;
        t.username = relativeURL.username;
        t.password = relativeURL.password;
        t.host = relativeURL.host;
        t.port = relativeURL.port;
        t.path = remove_dot_segments(relativeURL.path);
        t.query = relativeURL.query;
      } else {
        t.scheme = base.scheme;
        if (relativeURL.host !== undefined) {
          t.username = relativeURL.username;
          t.password = relativeURL.password;
          t.host = relativeURL.host;
          t.port = relativeURL.port;
          t.path = remove_dot_segments(relativeURL.path);
          t.query = relativeURL.query;
        } else {
          t.username = base.username;
          t.password = base.password;
          t.host = base.host;
          t.port = base.port;
          if (!relativeURL.path) {
            t.path = base.path;
            if (relativeURL.query !== undefined) t.query = relativeURL.query;
            else t.query = base.query;
          } else {
            if (relativeURL.path.charAt(0) === "/") t.path = remove_dot_segments(relativeURL.path);
            else {
              t.path = merge(base.path, relativeURL.path);
              t.path = remove_dot_segments(t.path);
            }
            t.query = relativeURL.query;
          }
        }
      }
      t.fragment = relativeURL.fragment;
      return t.toString();
      function merge(basepath, refpath) {
        if (base.host !== undefined && !base.path) return "/" + refpath;
        var lastslash = basepath.lastIndexOf("/");
        if (lastslash === -1) return refpath;
        else return basepath.substring(0, lastslash + 1) + refpath;
      }
      function remove_dot_segments(path) {
        if (!path) return path;
        var output = "";
        while (path.length > 0) {
          if (path === "." || path === "..") {
            path = "";
            break;
          }
          var twochars = path.substring(0, 2);
          var threechars = path.substring(0, 3);
          var fourchars = path.substring(0, 4);
          if (threechars === "../") path = path.substring(3);
          else if (twochars === "./") path = path.substring(2);
          else if (threechars === "/./") path = "/" + path.substring(3);
          else if (twochars === "/." && path.length === 2) path = "/";
          else if (fourchars === "/../" || (threechars === "/.." && path.length === 3)) {
            path = "/" + path.substring(4);
            output = output.replace(/\/?[^\/]*$/, "");
          } else {
            var segment = path.match(/(\/?([^\/]*))/)[0];
            output += segment;
            path = path.substring(segment.length);
          }
        }
        return output;
      }
    },
  };
});
export { require_URL };

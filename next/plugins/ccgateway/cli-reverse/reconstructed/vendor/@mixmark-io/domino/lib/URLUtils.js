/**
 * @mixmark-io/domino/lib/URLUtils.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-w04z664w.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_URL } from "./URL.js";

//@ chunk-w04z664w.js:79901-83403 cjs-fingerprint
var require_URLUtils = __commonJS(function (cjsExports, cjsModule) {
  var URLModule = require_URL();
  cjsModule.exports = URLUtils;
  function URLUtils() {}
  URLUtils.prototype = Object.create(Object.prototype, {
    _url: {
      get: function () {
        return new URLModule(this.href);
      },
    },
    protocol: {
      get: function () {
        var url = this._url;
        if (url && url.scheme) return url.scheme + ":";
        else return ":";
      },
      set: function (v) {
        var output = this.href;
        var url = new URLModule(output);
        if (url.isAbsolute()) {
          v = v.replace(/:+$/, "");
          v = v.replace(/[^-+\.a-zA-Z0-9]/g, URLModule.percentEncode);
          if (v.length > 0) {
            url.scheme = v;
            output = url.toString();
          }
        }
        this.href = output;
      },
    },
    host: {
      get: function () {
        var url = this._url;
        if (url.isAbsolute() && url.isAuthorityBased()) return url.host + (url.port ? ":" + url.port : "");
        else return "";
      },
      set: function (v) {
        var output = this.href;
        var url = new URLModule(output);
        if (url.isAbsolute() && url.isAuthorityBased()) {
          v = v.replace(/[^-+\._~!$&'()*,;:=a-zA-Z0-9]/g, URLModule.percentEncode);
          if (v.length > 0) {
            url.host = v;
            delete url.port;
            output = url.toString();
          }
        }
        this.href = output;
      },
    },
    hostname: {
      get: function () {
        var url = this._url;
        if (url.isAbsolute() && url.isAuthorityBased()) return url.host;
        else return "";
      },
      set: function (v) {
        var output = this.href;
        var url = new URLModule(output);
        if (url.isAbsolute() && url.isAuthorityBased()) {
          v = v.replace(/^\/+/, "");
          v = v.replace(/[^-+\._~!$&'()*,;:=a-zA-Z0-9]/g, URLModule.percentEncode);
          if (v.length > 0) {
            url.host = v;
            output = url.toString();
          }
        }
        this.href = output;
      },
    },
    port: {
      get: function () {
        var url = this._url;
        if (url.isAbsolute() && url.isAuthorityBased() && url.port !== undefined) return url.port;
        else return "";
      },
      set: function (v) {
        var output = this.href;
        var url = new URLModule(output);
        if (url.isAbsolute() && url.isAuthorityBased()) {
          v = "" + v;
          v = v.replace(/[^0-9].*$/, "");
          v = v.replace(/^0+/, "");
          if (v.length === 0) v = "0";
          if (parseInt(v, 10) <= 65535) {
            url.port = v;
            output = url.toString();
          }
        }
        this.href = output;
      },
    },
    pathname: {
      get: function () {
        var url = this._url;
        if (url.isAbsolute() && url.isHierarchical()) return url.path;
        else return "";
      },
      set: function (v) {
        var output = this.href;
        var url = new URLModule(output);
        if (url.isAbsolute() && url.isHierarchical()) {
          if (v.charAt(0) !== "/") v = "/" + v;
          v = v.replace(/[^-+\._~!$&'()*,;:=@\/a-zA-Z0-9]/g, URLModule.percentEncode);
          url.path = v;
          output = url.toString();
        }
        this.href = output;
      },
    },
    search: {
      get: function () {
        var url = this._url;
        if (url.isAbsolute() && url.isHierarchical() && url.query !== undefined) return "?" + url.query;
        else return "";
      },
      set: function (v) {
        var output = this.href;
        var url = new URLModule(output);
        if (url.isAbsolute() && url.isHierarchical()) {
          if (v.charAt(0) === "?") v = v.substring(1);
          v = v.replace(/[^-+\._~!$&'()*,;:=@\/?a-zA-Z0-9]/g, URLModule.percentEncode);
          url.query = v;
          output = url.toString();
        }
        this.href = output;
      },
    },
    hash: {
      get: function () {
        var url = this._url;
        if (url == null || url.fragment == null || url.fragment === "") return "";
        else return "#" + url.fragment;
      },
      set: function (v) {
        var output = this.href;
        var url = new URLModule(output);
        if (v.charAt(0) === "#") v = v.substring(1);
        v = v.replace(/[^-+\._~!$&'()*,;:=@\/?a-zA-Z0-9]/g, URLModule.percentEncode);
        url.fragment = v;
        output = url.toString();
        this.href = output;
      },
    },
    username: {
      get: function () {
        var url = this._url;
        return url.username || "";
      },
      set: function (v) {
        var output = this.href;
        var url = new URLModule(output);
        if (url.isAbsolute()) {
          v = v.replace(/[\x00-\x1F\x7F-\uFFFF "#<>?`\/@\\:]/g, URLModule.percentEncode);
          url.username = v;
          output = url.toString();
        }
        this.href = output;
      },
    },
    password: {
      get: function () {
        var url = this._url;
        return url.password || "";
      },
      set: function (v) {
        var output = this.href;
        var url = new URLModule(output);
        if (url.isAbsolute()) {
          if (v === "") url.password = null;
          else {
            v = v.replace(/[\x00-\x1F\x7F-\uFFFF "#<>?`\/@\\]/g, URLModule.percentEncode);
            url.password = v;
          }
          output = url.toString();
        }
        this.href = output;
      },
    },
    origin: {
      get: function () {
        var url = this._url;
        if (url == null) return "";
        var originForPort = function (defaultPort) {
          var origin = [url.scheme, url.host, +url.port || defaultPort];
          return origin[0] + "://" + origin[1] + (origin[2] === defaultPort ? "" : ":" + origin[2]);
        };
        switch (url.scheme) {
          case "ftp":
            return originForPort(21);
          case "gopher":
            return originForPort(70);
          case "http":
          case "ws":
            return originForPort(80);
          case "https":
          case "wss":
            return originForPort(443);
          default:
            return url.scheme + "://";
        }
      },
    },
  });
  URLUtils._inherit = function (proto) {
    Object.getOwnPropertyNames(URLUtils.prototype).forEach(function (p) {
      if (p === "constructor" || p === "href") return;
      var desc = Object.getOwnPropertyDescriptor(URLUtils.prototype, p);
      Object.defineProperty(proto, p, desc);
    });
  };
});
export { require_URLUtils };

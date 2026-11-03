/**
 * @mixmark-io/domino/lib/URLUtils.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { ca } from "./URL.js";

//@ chunk-vwj6ccer.js:79901-83403 cjs-fingerprint
var Vn = x(function (Fd, k0) {
  var oe = ca();
  k0.exports = pr;
  function pr() {}
  pr.prototype = Object.create(Object.prototype, {
    _url: {
      get: function () {
        return new oe(this.href);
      },
    },
    protocol: {
      get: function () {
        var _url = this._url;
        if (_url && _url.scheme) return _url.scheme + ":";
        else return ":";
      },
      set: function (e) {
        var href = this.href,
          r = new oe(href);
        if (r.isAbsolute()) {
          if (
            ((e = e.replace(/:+$/, "")), (e = e.replace(/[^-+\.a-zA-Z0-9]/g, oe.percentEncode)), e.length > 0)
          )
            ((r.scheme = e), (href = r.toString()));
        }
        this.href = href;
      },
    },
    host: {
      get: function () {
        var _url = this._url;
        if (_url.isAbsolute() && _url.isAuthorityBased())
          return _url.host + (_url.port ? ":" + _url.port : "");
        else return "";
      },
      set: function (e) {
        var href = this.href,
          r = new oe(href);
        if (r.isAbsolute() && r.isAuthorityBased()) {
          if (((e = e.replace(/[^-+\._~!$&'()*,;:=a-zA-Z0-9]/g, oe.percentEncode)), e.length > 0))
            ((r.host = e), delete r.port, (href = r.toString()));
        }
        this.href = href;
      },
    },
    hostname: {
      get: function () {
        var _url = this._url;
        if (_url.isAbsolute() && _url.isAuthorityBased()) return _url.host;
        else return "";
      },
      set: function (e) {
        var href = this.href,
          r = new oe(href);
        if (r.isAbsolute() && r.isAuthorityBased()) {
          if (
            ((e = e.replace(/^\/+/, "")),
            (e = e.replace(/[^-+\._~!$&'()*,;:=a-zA-Z0-9]/g, oe.percentEncode)),
            e.length > 0)
          )
            ((r.host = e), (href = r.toString()));
        }
        this.href = href;
      },
    },
    port: {
      get: function () {
        var _url = this._url;
        if (_url.isAbsolute() && _url.isAuthorityBased() && _url.port !== void 0) return _url.port;
        else return "";
      },
      set: function (e) {
        var href = this.href,
          r = new oe(href);
        if (r.isAbsolute() && r.isAuthorityBased()) {
          if (((e = "" + e), (e = e.replace(/[^0-9].*$/, "")), (e = e.replace(/^0+/, "")), e.length === 0))
            e = "0";
          if (parseInt(e, 10) <= 65535) ((r.port = e), (href = r.toString()));
        }
        this.href = href;
      },
    },
    pathname: {
      get: function () {
        var _url = this._url;
        if (_url.isAbsolute() && _url.isHierarchical()) return _url.path;
        else return "";
      },
      set: function (e) {
        var href = this.href,
          r = new oe(href);
        if (r.isAbsolute() && r.isHierarchical()) {
          if (e.charAt(0) !== "/") e = "/" + e;
          ((e = e.replace(/[^-+\._~!$&'()*,;:=@\/a-zA-Z0-9]/g, oe.percentEncode)),
            (r.path = e),
            (href = r.toString()));
        }
        this.href = href;
      },
    },
    search: {
      get: function () {
        var _url = this._url;
        if (_url.isAbsolute() && _url.isHierarchical() && _url.query !== void 0) return "?" + _url.query;
        else return "";
      },
      set: function (e) {
        var href = this.href,
          r = new oe(href);
        if (r.isAbsolute() && r.isHierarchical()) {
          if (e.charAt(0) === "?") e = e.substring(1);
          ((e = e.replace(/[^-+\._~!$&'()*,;:=@\/?a-zA-Z0-9]/g, oe.percentEncode)),
            (r.query = e),
            (href = r.toString()));
        }
        this.href = href;
      },
    },
    hash: {
      get: function () {
        var _url = this._url;
        if (_url == null || _url.fragment == null || _url.fragment === "") return "";
        else return "#" + _url.fragment;
      },
      set: function (e) {
        var href = this.href,
          r = new oe(href);
        if (e.charAt(0) === "#") e = e.substring(1);
        ((e = e.replace(/[^-+\._~!$&'()*,;:=@\/?a-zA-Z0-9]/g, oe.percentEncode)),
          (r.fragment = e),
          (href = r.toString()),
          (this.href = href));
      },
    },
    username: {
      get: function () {
        var _url = this._url;
        return _url.username || "";
      },
      set: function (e) {
        var href = this.href,
          r = new oe(href);
        if (r.isAbsolute())
          ((e = e.replace(/[\x00-\x1F\x7F-\uFFFF "#<>?`\/@\\:]/g, oe.percentEncode)),
            (r.username = e),
            (href = r.toString()));
        this.href = href;
      },
    },
    password: {
      get: function () {
        var _url = this._url;
        return _url.password || "";
      },
      set: function (e) {
        var href = this.href,
          r = new oe(href);
        if (r.isAbsolute()) {
          if (e === "") r.password = null;
          else ((e = e.replace(/[\x00-\x1F\x7F-\uFFFF "#<>?`\/@\\]/g, oe.percentEncode)), (r.password = e));
          href = r.toString();
        }
        this.href = href;
      },
    },
    origin: {
      get: function () {
        var _url = this._url;
        if (_url == null) return "";
        var t = function (r) {
          var a = [_url.scheme, _url.host, +_url.port || r];
          return a[0] + "://" + a[1] + (a[2] === r ? "" : ":" + a[2]);
        };
        switch (_url.scheme) {
          case "ftp":
            return t(21);
          case "gopher":
            return t(70);
          case "http":
          case "ws":
            return t(80);
          case "https":
          case "wss":
            return t(443);
          default:
            return _url.scheme + "://";
        }
      },
    },
  });
  pr._inherit = function (e) {
    Object.getOwnPropertyNames(pr.prototype).forEach(function (t) {
      if (t === "constructor" || t === "href") return;
      var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(pr.prototype, t);
      Object.defineProperty(e, t, ownPropertyDescriptor);
    });
  };
});

export { Vn };

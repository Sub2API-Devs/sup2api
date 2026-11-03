/**
 * follow-redirects/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: follow-redirects@1.16.0
 * pieces: chunk-h6b7mazd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../runtime/bun-runtime.js";
import { Gs } from "./debug.js";

//@ chunk-h6b7mazd.js:37518-45969 cjs-fingerprint
var Qs = x(function (Dd, $r) {
  var ct = importMetaRequire("url"),
    ut = ct.URL,
    Ef = importMetaRequire("http"),
    Rf = importMetaRequire("https"),
    Writable = importMetaRequire("stream").Writable,
    Ir = importMetaRequire("assert"),
    Js = Gs();
  (function () {
    var t = typeof process < "u",
      r = typeof window < "u" && typeof document < "u",
      n = Ce(Error.captureStackTrace);
    if (!t && (r || !n)) console.warn("The follow-redirects package should be excluded from browser builds.");
  })();
  var kr = !1;
  try {
    Ir(new ut(""));
  } catch (error) {
    kr = error.code === "ERR_INVALID_URL";
  }
  var wf = ["Authorization", "Proxy-Authorization", "Cookie"],
    xf = [
      "auth",
      "host",
      "hostname",
      "href",
      "path",
      "pathname",
      "port",
      "protocol",
      "query",
      "search",
      "hash",
    ],
    jr = ["abort", "aborted", "connect", "error", "socket", "timeout"],
    create = Object.create(null);
  jr.forEach(function (e) {
    create[e] = function (t, r, n) {
      this._redirectable.emit(e, t, r, n);
    };
  });
  var Nr = ft("ERR_INVALID_URL", "Invalid URL", TypeError),
    Dr = ft("ERR_FR_REDIRECTION_FAILURE", "Redirected request failed"),
    _f = ft("ERR_FR_TOO_MANY_REDIRECTS", "Maximum number of redirects exceeded", Dr),
    Sf = ft("ERR_FR_MAX_BODY_LENGTH_EXCEEDED", "Request body larger than maxBodyLength limit"),
    Af = ft("ERR_STREAM_WRITE_AFTER_END", "write after end"),
    Of = Writable.prototype.destroy || Xs;
  function Y(e, t) {
    if (
      (Writable.call(this),
      this._sanitizeOptions(e),
      (this._options = e),
      (this._ended = !1),
      (this._ending = !1),
      (this._redirectCount = 0),
      (this._redirects = []),
      (this._requestBodyLength = 0),
      (this._requestBodyBuffers = []),
      t)
    )
      this.on("response", t);
    var r = this;
    ((this._onNativeResponse = function (n) {
      try {
        r._processResponse(n);
      } catch (error) {
        r.emit("error", error instanceof Dr ? error : new Dr({ cause: error }));
      }
    }),
      (this._headerFilter = new RegExp("^(?:" + wf.concat(e.sensitiveHeaders).map(Lf).join("|") + ")$", "i")),
      this._performRequest());
  }
  Y.prototype = Object.create(Writable.prototype);
  Y.prototype.abort = function () {
    (zr(this._currentRequest), this._currentRequest.abort(), this.emit("abort"));
  };
  Y.prototype.destroy = function (e) {
    return (zr(this._currentRequest, e), Of.call(this, e), this);
  };
  Y.prototype.write = function (e, t, r) {
    if (this._ending) throw new Af();
    if (!Oe(e) && !Pf(e)) throw TypeError("data should be a string, Buffer or Uint8Array");
    if (Ce(t)) ((r = t), (t = null));
    if (e.length === 0) {
      if (r) r();
      return;
    }
    if (this._requestBodyLength + e.length <= this._options.maxBodyLength)
      ((this._requestBodyLength += e.length),
        this._requestBodyBuffers.push({ data: e, encoding: t }),
        this._currentRequest.write(e, t, r));
    else (this.emit("error", new Sf()), this.abort());
  };
  Y.prototype.end = function (e, t, r) {
    if (Ce(e)) ((r = e), (e = t = null));
    else if (Ce(t)) ((r = t), (t = null));
    if (!e) ((this._ended = this._ending = !0), this._currentRequest.end(null, null, r));
    else {
      var n = this,
        _currentRequest = this._currentRequest;
      (this.write(e, t, function () {
        ((n._ended = !0), _currentRequest.end(null, null, r));
      }),
        (this._ending = !0));
    }
  };
  Y.prototype.setHeader = function (e, t) {
    ((this._options.headers[e] = t), this._currentRequest.setHeader(e, t));
  };
  Y.prototype.removeHeader = function (e) {
    (delete this._options.headers[e], this._currentRequest.removeHeader(e));
  };
  Y.prototype.setTimeout = function (e, t) {
    var r = this;
    function n(i) {
      (i.setTimeout(e), i.removeListener("timeout", i.destroy), i.addListener("timeout", i.destroy));
    }
    function o(i) {
      if (r._timeout) clearTimeout(r._timeout);
      ((r._timeout = setTimeout(function () {
        (r.emit("timeout"), s());
      }, e)),
        n(i));
    }
    function s() {
      if (r._timeout) (clearTimeout(r._timeout), (r._timeout = null));
      if (
        (r.removeListener("abort", s),
        r.removeListener("error", s),
        r.removeListener("response", s),
        r.removeListener("close", s),
        t)
      )
        r.removeListener("timeout", t);
      if (!r.socket) r._currentRequest.removeListener("socket", o);
    }
    if (t) this.on("timeout", t);
    if (this.socket) o(this.socket);
    else this._currentRequest.once("socket", o);
    return (
      this.on("socket", n),
      this.on("abort", s),
      this.on("error", s),
      this.on("response", s),
      this.on("close", s),
      this
    );
  };
  ["flushHeaders", "getHeader", "setNoDelay", "setSocketKeepAlive"].forEach(function (e) {
    Y.prototype[e] = function (t, r) {
      return this._currentRequest[e](t, r);
    };
  });
  ["aborted", "connection", "socket"].forEach(function (e) {
    Object.defineProperty(Y.prototype, e, {
      get: function () {
        return this._currentRequest[e];
      },
    });
  });
  Y.prototype._sanitizeOptions = function (e) {
    if (!e.headers) e.headers = {};
    if (!Tf(e.sensitiveHeaders)) e.sensitiveHeaders = [];
    if (e.host) {
      if (!e.hostname) e.hostname = e.host;
      delete e.host;
    }
    if (!e.pathname && e.path) {
      var index = e.path.indexOf("?");
      if (index < 0) e.pathname = e.path;
      else ((e.pathname = e.path.substring(0, index)), (e.search = e.path.substring(index)));
    }
  };
  Y.prototype._performRequest = function () {
    var protocol = this._options.protocol,
      t = this._options.nativeProtocols[protocol];
    if (!t) throw TypeError("Unsupported protocol " + protocol);
    if (this._options.agents) {
      var sliced = protocol.slice(0, -1);
      this._options.agent = this._options.agents[sliced];
    }
    var n = (this._currentRequest = t.request(this._options, this._onNativeResponse));
    n._redirectable = this;
    for (var o of jr) n.on(o, create[o]);
    if (
      ((this._currentUrl = /^\//.test(this._options.path) ? ct.format(this._options) : this._options.path),
      this._isRedirect)
    ) {
      var s = 0,
        i = this,
        _requestBodyBuffers = this._requestBodyBuffers;
      (function l(f) {
        if (n === i._currentRequest) {
          if (f) i.emit("error", f);
          else if (s < _requestBodyBuffers.length) {
            var c = _requestBodyBuffers[s++];
            if (!n.finished) n.write(c.data, c.encoding, l);
          } else if (i._ended) n.end();
        }
      })();
    }
  };
  Y.prototype._processResponse = function (e) {
    var statusCode = e.statusCode;
    if (this._options.trackRedirects)
      this._redirects.push({ url: this._currentUrl, headers: e.headers, statusCode: statusCode });
    var location = e.headers.location;
    if (!location || this._options.followRedirects === !1 || statusCode < 300 || statusCode >= 400) {
      ((e.responseUrl = this._currentUrl),
        (e.redirects = this._redirects),
        this.emit("response", e),
        (this._requestBodyBuffers = []));
      return;
    }
    if ((zr(this._currentRequest), e.destroy(), ++this._redirectCount > this._options.maxRedirects))
      throw new _f();
    var n,
      beforeRedirect = this._options.beforeRedirect;
    if (beforeRedirect) n = Object.assign({ Host: e.req.getHeader("host") }, this._options.headers);
    var method = this._options.method;
    if (
      ((statusCode === 301 || statusCode === 302) && this._options.method === "POST") ||
      (statusCode === 303 && !/^(?:GET|HEAD)$/.test(this._options.method))
    )
      ((this._options.method = "GET"),
        (this._requestBodyBuffers = []),
        Br(/^content-/i, this._options.headers));
    var i = Br(/^host$/i, this._options.headers),
      a = Hr(this._currentUrl),
      l = i || a.host,
      f = /^\w+:/.test(location) ? this._currentUrl : ct.format(Object.assign(a, { host: l })),
      c = Cf(location, f);
    if (
      (Js("redirecting to", c.href),
      (this._isRedirect = !0),
      Ur(c, this._options),
      (c.protocol !== a.protocol && c.protocol !== "https:") || (c.host !== l && !vf(c.host, l)))
    )
      Br(this._headerFilter, this._options.headers);
    if (Ce(beforeRedirect)) {
      var p = { headers: e.headers, statusCode: statusCode },
        d = { url: f, method: method, headers: n };
      (beforeRedirect(this._options, p, d), this._sanitizeOptions(this._options));
    }
    this._performRequest();
  };
  function Ks(e) {
    var t = { maxRedirects: 21, maxBodyLength: 10485760 },
      r = {};
    return (
      Object.keys(e).forEach(function (n) {
        var o = n + ":",
          s = (r[o] = e[n]),
          i = (t[n] = Object.create(s));
        function a(f, c, p) {
          if (Ff(f)) f = Ur(f);
          else if (Oe(f)) f = Ur(Hr(f));
          else ((p = c), (c = Ys(f)), (f = { protocol: o }));
          if (Ce(c)) ((p = c), (c = null));
          if (
            ((c = Object.assign({ maxRedirects: t.maxRedirects, maxBodyLength: t.maxBodyLength }, f, c)),
            (c.nativeProtocols = r),
            !Oe(c.host) && !Oe(c.hostname))
          )
            c.hostname = "::1";
          return (Ir.equal(c.protocol, o, "protocol mismatch"), Js("options", c), new Y(c, p));
        }
        function l(f, c, p) {
          var request = i.request(f, c, p);
          return (request.end(), request);
        }
        Object.defineProperties(i, {
          request: { value: a, configurable: !0, enumerable: !0, writable: !0 },
          get: { value: l, configurable: !0, enumerable: !0, writable: !0 },
        });
      }),
      t
    );
  }
  function Xs() {}
  function Hr(e) {
    var t;
    if (kr) t = new ut(e);
    else if (((t = Ys(ct.parse(e))), !Oe(t.protocol))) throw new Nr({ input: e });
    return t;
  }
  function Cf(e, t) {
    return kr ? new ut(e, t) : Hr(ct.resolve(t, e));
  }
  function Ys(e) {
    if (/^\[/.test(e.hostname) && !/^\[[:0-9a-f]+\]$/i.test(e.hostname)) throw new Nr({ input: e.href || e });
    if (/^\[/.test(e.host) && !/^\[[:0-9a-f]+\](:\d+)?$/i.test(e.host)) throw new Nr({ input: e.href || e });
    return e;
  }
  function Ur(e, t) {
    var r = t || {};
    for (var n of xf) r[n] = e[n];
    if (r.hostname.startsWith("[")) r.hostname = r.hostname.slice(1, -1);
    if (r.port !== "") r.port = Number(r.port);
    return ((r.path = r.search ? r.pathname + r.search : r.pathname), r);
  }
  function Br(e, t) {
    var r;
    for (var key in t) if (e.test(key)) ((r = t[key]), delete t[key]);
    return r === null || typeof r > "u" ? void 0 : String(r).trim();
  }
  function ft(e, t, r) {
    function n(o) {
      if (Ce(Error.captureStackTrace)) Error.captureStackTrace(this, this.constructor);
      (Object.assign(this, o || {}),
        (this.code = e),
        (this.message = this.cause ? t + ": " + this.cause.message : t));
    }
    return (
      (n.prototype = Object.create((r || Error).prototype)),
      Object.defineProperties(n.prototype, {
        constructor: { value: n, enumerable: !1 },
        name: { value: "Error [" + e + "]", enumerable: !1 },
      }),
      n
    );
  }
  function zr(e, t) {
    for (var r of jr) e.removeListener(r, create[r]);
    (e.on("error", Xs), e.destroy(t));
  }
  function vf(e, t) {
    Ir(Oe(e) && Oe(t));
    var r = e.length - t.length - 1;
    return r > 0 && e[r] === "." && e.endsWith(t);
  }
  function Tf(e) {
    return e instanceof Array;
  }
  function Oe(e) {
    return typeof e === "string" || e instanceof String;
  }
  function Ce(e) {
    return typeof e === "function";
  }
  function Pf(e) {
    return typeof e === "object" && "length" in e;
  }
  function Ff(e) {
    return ut && e instanceof ut;
  }
  function Lf(e) {
    return e.replace(/[\]\\/()*+?.$]/g, "\\$&");
  }
  $r.exports = Ks({ http: Ef, https: Rf });
  $r.exports.wrap = Ks;
});

export { Qs };

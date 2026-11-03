/**
 * object-hash/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: object-hash@2.2.0
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../runtime/bun-runtime.js";

//@ chunk-1ny7cxrt.js:30880-37631 cjs-fingerprint
var AS = x(function (Ka, PS) {
  var vy = importMetaRequire("crypto");
  Ka = PS.exports = Au;
  function Au(e, t) {
    return ((t = kS(e, t)), ZF(e, t));
  }
  Ka.sha1 = function (e) {
    return Au(e);
  };
  Ka.keys = function (e) {
    return Au(e, { excludeValues: !0, algorithm: "sha1", encoding: "hex" });
  };
  Ka.MD5 = function (e) {
    return Au(e, { algorithm: "md5", encoding: "hex" });
  };
  Ka.keysMD5 = function (e) {
    return Au(e, { algorithm: "md5", encoding: "hex", excludeValues: !0 });
  };
  var kl = vy.getHashes ? vy.getHashes().slice() : ["sha1", "md5"];
  kl.push("passthrough");
  var vS = ["buffer", "hex", "binary", "base64"];
  function kS(e, t) {
    t = t || {};
    var n = {};
    if (
      ((n.algorithm = t.algorithm || "sha1"),
      (n.encoding = t.encoding || "hex"),
      (n.excludeValues = t.excludeValues ? !0 : !1),
      (n.algorithm = n.algorithm.toLowerCase()),
      (n.encoding = n.encoding.toLowerCase()),
      (n.ignoreUnknown = t.ignoreUnknown !== !0 ? !1 : !0),
      (n.respectType = t.respectType === !1 ? !1 : !0),
      (n.respectFunctionNames = t.respectFunctionNames === !1 ? !1 : !0),
      (n.respectFunctionProperties = t.respectFunctionProperties === !1 ? !1 : !0),
      (n.unorderedArrays = t.unorderedArrays !== !0 ? !1 : !0),
      (n.unorderedSets = t.unorderedSets === !1 ? !1 : !0),
      (n.unorderedObjects = t.unorderedObjects === !1 ? !1 : !0),
      (n.replacer = t.replacer || void 0),
      (n.excludeKeys = t.excludeKeys || void 0),
      typeof e > "u")
    )
      throw Error("Object argument required.");
    for (var o = 0; o < kl.length; ++o)
      if (kl[o].toLowerCase() === n.algorithm.toLowerCase()) n.algorithm = kl[o];
    if (kl.indexOf(n.algorithm) === -1)
      throw Error('Algorithm "' + n.algorithm + '"  not supported. supported values: ' + kl.join(", "));
    if (vS.indexOf(n.encoding) === -1 && n.algorithm !== "passthrough")
      throw Error('Encoding "' + n.encoding + '"  not supported. supported values: ' + vS.join(", "));
    return n;
  }
  function OS(e) {
    if (typeof e !== "function") return !1;
    var t = /^function\s+\w*\s*\(\s*\)\s*{\s+\[native code\]\s+}$/i;
    return t.exec(Function.prototype.toString.call(e)) != null;
  }
  function ZF(e, t) {
    var n;
    if (t.algorithm !== "passthrough") n = vy.createHash(t.algorithm);
    else n = new ES();
    if (typeof n.write > "u") ((n.write = n.update), (n.end = n.update));
    var o = wy(t, n);
    if ((o.dispatch(e), !n.update)) n.end("");
    if (n.digest) return n.digest(t.encoding === "buffer" ? void 0 : t.encoding);
    var read = n.read();
    if (t.encoding === "buffer") return read;
    return read.toString(t.encoding);
  }
  Ka.writeToStream = function (e, t, n) {
    if (typeof n > "u") ((n = t), (t = {}));
    return ((t = kS(e, t)), wy(t, n).dispatch(e));
  };
  function wy(e, t, n) {
    n = n || [];
    var o = function (r) {
      if (t.update) return t.update(r, "utf8");
      else return t.write(r, "utf8");
    };
    return {
      dispatch: function (r) {
        if (e.replacer) r = e.replacer(r);
        var s = typeof r;
        if (r === null) s = "null";
        return this["_" + s](r);
      },
      _object: function (r) {
        var s = /\[object (.*)\]/i,
          a = Object.prototype.toString.call(r),
          match = s.exec(a);
        if (!match) match = "unknown:[" + a + "]";
        else match = match[1];
        match = match.toLowerCase();
        var c = null;
        if ((c = n.indexOf(r)) >= 0) return this.dispatch("[CIRCULAR:" + c + "]");
        else n.push(r);
        if (typeof Buffer < "u" && Buffer.isBuffer && Buffer.isBuffer(r)) return (o("buffer:"), o(r));
        if (match !== "object" && match !== "function" && match !== "asyncfunction")
          if (this["_" + match]) this["_" + match](r);
          else if (e.ignoreUnknown) return o("[" + match + "]");
          else throw Error('Unknown object type "' + match + '"');
        else {
          var keys = Object.keys(r);
          if (e.unorderedObjects) keys = keys.sort();
          if (e.respectType !== !1 && !OS(r)) keys.splice(0, 0, "prototype", "__proto__", "constructor");
          if (e.excludeKeys)
            keys = keys.filter(function (h) {
              return !e.excludeKeys(h);
            });
          o("object:" + keys.length + ":");
          var f = this;
          return keys.forEach(function (h) {
            if ((f.dispatch(h), o(":"), !e.excludeValues)) f.dispatch(r[h]);
            o(",");
          });
        }
      },
      _array: function (r, s) {
        s = typeof s < "u" ? s : e.unorderedArrays !== !1;
        var a = this;
        if ((o("array:" + r.length + ":"), !s || r.length <= 1))
          return r.forEach(function (u) {
            return a.dispatch(u);
          });
        var l = [],
          mapped = r.map(function (u) {
            var f = new ES(),
              sliced = n.slice(),
              m = wy(e, f, sliced);
            return (m.dispatch(u), (l = l.concat(sliced.slice(n.length))), f.read().toString());
          });
        return ((n = n.concat(l)), mapped.sort(), this._array(mapped, !1));
      },
      _date: function (r) {
        return o("date:" + r.toJSON());
      },
      _symbol: function (r) {
        return o("symbol:" + r.toString());
      },
      _error: function (r) {
        return o("error:" + r.toString());
      },
      _boolean: function (r) {
        return o("bool:" + r.toString());
      },
      _string: function (r) {
        (o("string:" + r.length + ":"), o(r.toString()));
      },
      _function: function (r) {
        if ((o("fn:"), OS(r))) this.dispatch("[native]");
        else this.dispatch(r.toString());
        if (e.respectFunctionNames !== !1) this.dispatch("function-name:" + String(r.name));
        if (e.respectFunctionProperties) this._object(r);
      },
      _number: function (r) {
        return o("number:" + r.toString());
      },
      _xml: function (r) {
        return o("xml:" + r.toString());
      },
      _null: function () {
        return o("Null");
      },
      _undefined: function () {
        return o("Undefined");
      },
      _regexp: function (r) {
        return o("regex:" + r.toString());
      },
      _uint8array: function (r) {
        return (o("uint8array:"), this.dispatch(Array.prototype.slice.call(r)));
      },
      _uint8clampedarray: function (r) {
        return (o("uint8clampedarray:"), this.dispatch(Array.prototype.slice.call(r)));
      },
      _int8array: function (r) {
        return (o("uint8array:"), this.dispatch(Array.prototype.slice.call(r)));
      },
      _uint16array: function (r) {
        return (o("uint16array:"), this.dispatch(Array.prototype.slice.call(r)));
      },
      _int16array: function (r) {
        return (o("uint16array:"), this.dispatch(Array.prototype.slice.call(r)));
      },
      _uint32array: function (r) {
        return (o("uint32array:"), this.dispatch(Array.prototype.slice.call(r)));
      },
      _int32array: function (r) {
        return (o("uint32array:"), this.dispatch(Array.prototype.slice.call(r)));
      },
      _float32array: function (r) {
        return (o("float32array:"), this.dispatch(Array.prototype.slice.call(r)));
      },
      _float64array: function (r) {
        return (o("float64array:"), this.dispatch(Array.prototype.slice.call(r)));
      },
      _arraybuffer: function (r) {
        return (o("arraybuffer:"), this.dispatch(new Uint8Array(r)));
      },
      _url: function (r) {
        return o("url:" + r.toString(), "utf8");
      },
      _map: function (r) {
        o("map:");
        var list = Array.from(r);
        return this._array(list, e.unorderedSets !== !1);
      },
      _set: function (r) {
        o("set:");
        var list = Array.from(r);
        return this._array(list, e.unorderedSets !== !1);
      },
      _file: function (r) {
        return (o("file:"), this.dispatch([r.name, r.size, r.type, r.lastModfied]));
      },
      _blob: function () {
        if (e.ignoreUnknown) return o("[blob]");
        throw Error(`Hashing Blob objects is currently not supported
(see https://github.com/puleos/object-hash/issues/26)
Use "options.replacer" or "options.ignoreUnknown"
`);
      },
      _domwindow: function () {
        return o("domwindow");
      },
      _bigint: function (r) {
        return o("bigint:" + r.toString());
      },
      _process: function () {
        return o("process");
      },
      _timer: function () {
        return o("timer");
      },
      _pipe: function () {
        return o("pipe");
      },
      _tcp: function () {
        return o("tcp");
      },
      _udp: function () {
        return o("udp");
      },
      _tty: function () {
        return o("tty");
      },
      _statwatcher: function () {
        return o("statwatcher");
      },
      _securecontext: function () {
        return o("securecontext");
      },
      _connection: function () {
        return o("connection");
      },
      _zlib: function () {
        return o("zlib");
      },
      _context: function () {
        return o("context");
      },
      _nodescript: function () {
        return o("nodescript");
      },
      _httpparser: function () {
        return o("httpparser");
      },
      _dataview: function () {
        return o("dataview");
      },
      _signal: function () {
        return o("signal");
      },
      _fsevent: function () {
        return o("fsevent");
      },
      _tlswrap: function () {
        return o("tlswrap");
      },
    };
  }
  function ES() {
    return {
      buf: "",
      write: function (e) {
        this.buf += e;
      },
      end: function (e) {
        this.buf += e;
      },
      read: function () {
        return this.buf;
      },
    };
  }
});

export { AS };

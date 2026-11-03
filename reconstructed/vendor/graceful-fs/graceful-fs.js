/**
 * graceful-fs/graceful-fs.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: graceful-fs@4.2.11
 * pieces: chunk-bmbhxpfm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../runtime/bun-runtime.js";
import { je } from "./polyfills.js";
import { Ae } from "./legacy-streams.js";
import { We } from "./clone.js";

//@ chunk-bmbhxpfm.js:6170-11354 cjs-fingerprint
var ge = x(function (er, Oe) {
  var F = importMetaRequire("fs"),
    vt = je(),
    St = Ae(),
    _t = We(),
    ce = importMetaRequire("util"),
    G,
    fe;
  if (typeof Symbol === "function" && typeof Symbol.for === "function")
    ((G = Symbol.for("graceful-fs.queue")), (fe = Symbol.for("graceful-fs.previous")));
  else ((G = "___graceful-fs.queue"), (fe = "___graceful-fs.previous"));
  function wt() {}
  function Ot(e, r) {
    Object.defineProperty(e, G, {
      get: function () {
        return r;
      },
    });
  }
  var Q = wt;
  if (ce.debuglog) Q = ce.debuglog("gfs4");
  else if (/\bgfs4\b/i.test(process.env.NODE_DEBUG || ""))
    Q = function () {
      var e = ce.format.apply(ce, arguments);
      ((e =
        "GFS4: " +
        e.split(/\n/).join(`
GFS4: `)),
        console.error(e));
    };
  if (!F[G]) {
    if (
      ((Se = global[G] || []),
      Ot(F, Se),
      (F.close = (function (e) {
        function r(n, i) {
          return e.call(F, n, function (u) {
            if (!u) Ye();
            if (typeof i === "function") i.apply(this, arguments);
          });
        }
        return (Object.defineProperty(r, fe, { value: e }), r);
      })(F.close)),
      (F.closeSync = (function (e) {
        function r(n) {
          (e.apply(F, arguments), Ye());
        }
        return (Object.defineProperty(r, fe, { value: e }), r);
      })(F.closeSync)),
      /\bgfs4\b/i.test(process.env.NODE_DEBUG || ""))
    )
      process.on("exit", function () {
        (Q(F[G]), importMetaRequire("assert").equal(F[G].length, 0));
      });
  }
  var Se;
  Oe.exports = _e(_t(F));
  if (process.env.TEST_GRACEFUL_FS_GLOBAL_PATCH && !F.__patched) ((Oe.exports = _e(F)), (F.__patched = !0));
  function _e(e) {
    (vt(e), (e.gracefulify = _e), (e.createReadStream = Me), (e.createWriteStream = Ce));
    var readFile = e.readFile;
    e.readFile = n;
    function n(l, v, y) {
      if (typeof v === "function") ((y = v), (v = null));
      return P(l, v, y);
      function P(R, N, I, L) {
        return readFile(R, N, function (_) {
          if (_ && (_.code === "EMFILE" || _.code === "ENFILE"))
            V([P, [R, N, I], _, L || Date.now(), Date.now()]);
          else if (typeof I === "function") I.apply(this, arguments);
        });
      }
    }
    var writeFile = e.writeFile;
    e.writeFile = u;
    function u(l, v, y, P) {
      if (typeof y === "function") ((P = y), (y = null));
      return R(l, v, y, P);
      function R(N, I, L, _, M) {
        return writeFile(N, I, L, function (O) {
          if (O && (O.code === "EMFILE" || O.code === "ENFILE"))
            V([R, [N, I, L, _], O, M || Date.now(), Date.now()]);
          else if (typeof _ === "function") _.apply(this, arguments);
        });
      }
    }
    var appendFile = e.appendFile;
    if (appendFile) e.appendFile = h;
    function h(l, v, y, P) {
      if (typeof y === "function") ((P = y), (y = null));
      return R(l, v, y, P);
      function R(N, I, L, _, M) {
        return appendFile(N, I, L, function (O) {
          if (O && (O.code === "EMFILE" || O.code === "ENFILE"))
            V([R, [N, I, L, _], O, M || Date.now(), Date.now()]);
          else if (typeof _ === "function") _.apply(this, arguments);
        });
      }
    }
    var copyFile = e.copyFile;
    if (copyFile) e.copyFile = E;
    function E(l, v, y, P) {
      if (typeof y === "function") ((P = y), (y = 0));
      return R(l, v, y, P);
      function R(N, I, L, _, M) {
        return copyFile(N, I, L, function (O) {
          if (O && (O.code === "EMFILE" || O.code === "ENFILE"))
            V([R, [N, I, L, _], O, M || Date.now(), Date.now()]);
          else if (typeof _ === "function") _.apply(this, arguments);
        });
      }
    }
    var readdir = e.readdir;
    e.readdir = p;
    var o = /^v[0-5]\./;
    function p(l, v, y) {
      if (typeof v === "function") ((y = v), (v = null));
      var P = o.test(process.version)
        ? function (I, L, _, M) {
            return readdir(I, R(I, L, _, M));
          }
        : function (I, L, _, M) {
            return readdir(I, L, R(I, L, _, M));
          };
      return P(l, v, y);
      function R(N, I, L, _) {
        return function (M, O) {
          if (M && (M.code === "EMFILE" || M.code === "ENFILE"))
            V([P, [N, I, L], M, _ || Date.now(), Date.now()]);
          else {
            if (O && O.sort) O.sort();
            if (typeof L === "function") L.call(this, M, O);
          }
        };
      }
    }
    if (process.version.substr(0, 4) === "v0.8") {
      var f = St(e);
      ((T = f.ReadStream), (C = f.WriteStream));
    }
    var ReadStream = e.ReadStream;
    if (ReadStream) ((T.prototype = Object.create(ReadStream.prototype)), (T.prototype.open = j));
    var WriteStream = e.WriteStream;
    if (WriteStream) ((C.prototype = Object.create(WriteStream.prototype)), (C.prototype.open = Z));
    (Object.defineProperty(e, "ReadStream", {
      get: function () {
        return T;
      },
      set: function (l) {
        T = l;
      },
      enumerable: !0,
      configurable: !0,
    }),
      Object.defineProperty(e, "WriteStream", {
        get: function () {
          return C;
        },
        set: function (l) {
          C = l;
        },
        enumerable: !0,
        configurable: !0,
      }));
    var w = T;
    Object.defineProperty(e, "FileReadStream", {
      get: function () {
        return w;
      },
      set: function (l) {
        w = l;
      },
      enumerable: !0,
      configurable: !0,
    });
    var S = C;
    Object.defineProperty(e, "FileWriteStream", {
      get: function () {
        return S;
      },
      set: function (l) {
        S = l;
      },
      enumerable: !0,
      configurable: !0,
    });
    function T(l, v) {
      if (this instanceof T) return (ReadStream.apply(this, arguments), this);
      else return T.apply(Object.create(T.prototype), arguments);
    }
    function j() {
      var l = this;
      ve(l.path, l.flags, l.mode, function (v, y) {
        if (v) {
          if (l.autoClose) l.destroy();
          l.emit("error", v);
        } else ((l.fd = y), l.emit("open", y), l.read());
      });
    }
    function C(l, v) {
      if (this instanceof C) return (WriteStream.apply(this, arguments), this);
      else return C.apply(Object.create(C.prototype), arguments);
    }
    function Z() {
      var l = this;
      ve(l.path, l.flags, l.mode, function (v, y) {
        if (v) (l.destroy(), l.emit("error", v));
        else ((l.fd = y), l.emit("open", y));
      });
    }
    function Me(l, v) {
      return new e.ReadStream(l, v);
    }
    function Ce(l, v) {
      return new e.WriteStream(l, v);
    }
    var open = e.open;
    e.open = ve;
    function ve(l, v, y, P) {
      if (typeof y === "function") ((P = y), (y = null));
      return R(l, v, y, P);
      function R(N, I, L, _, M) {
        return open(N, I, L, function (O, Vt) {
          if (O && (O.code === "EMFILE" || O.code === "ENFILE"))
            V([R, [N, I, L, _], O, M || Date.now(), Date.now()]);
          else if (typeof _ === "function") _.apply(this, arguments);
        });
      }
    }
    return e;
  }
  function V(e) {
    (Q("ENQUEUE", e[0].name, e[1]), F[G].push(e), we());
  }
  var ae;
  function Ye() {
    var now = Date.now();
    for (var r = 0; r < F[G].length; ++r) if (F[G][r].length > 2) ((F[G][r][3] = now), (F[G][r][4] = now));
    we();
  }
  function we() {
    if ((clearTimeout(ae), (ae = void 0), F[G].length === 0)) return;
    var e = F[G].shift(),
      r = e[0],
      n = e[1],
      i = e[2],
      u = e[3],
      c = e[4];
    if (u === void 0) (Q("RETRY", r.name, n), r.apply(null, n));
    else if (Date.now() - u >= 60000) {
      Q("TIMEOUT", r.name, n);
      var h = n.pop();
      if (typeof h === "function") h.call(null, i);
    } else {
      var m = Date.now() - c,
        max = Math.max(c - u, 1),
        min = Math.min(max * 1.2, 100);
      if (m >= min) (Q("RETRY", r.name, n), r.apply(null, n.concat([u])));
      else F[G].push(e);
    }
    if (ae === void 0) ae = setTimeout(we, 0);
  }
});

export { ge };

/**
 * graceful-fs/polyfills.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: graceful-fs@4.2.11
 * pieces: chunk-bmbhxpfm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../runtime/bun-runtime.js";

//@ chunk-bmbhxpfm.js:301-4288 cjs-fingerprint
var je = x(function (Xt, Ge) {
  var W = importMetaRequire("constants"),
    cwd = process.cwd,
    oe = null,
    ht = process.env.GRACEFUL_FS_PLATFORM || "linux";
  process.cwd = function () {
    if (!oe) oe = cwd.call(process);
    return oe;
  };
  try {
    process.cwd();
  } catch (error) {}
  if (typeof process.chdir === "function") {
    if (
      ((ue = process.chdir),
      (process.chdir = function (e) {
        ((oe = null), ue.call(process, e));
      }),
      Object.setPrototypeOf)
    )
      Object.setPrototypeOf(process.chdir, ue);
  }
  var ue;
  Ge.exports = pt;
  function pt(e) {
    if (W.hasOwnProperty("O_SYMLINK") && process.version.match(/^v0\.6\.[0-2]|^v0\.5\./)) r(e);
    if (!e.lutimes) n(e);
    if (
      ((e.chown = c(e.chown)),
      (e.fchown = c(e.fchown)),
      (e.lchown = c(e.lchown)),
      (e.chmod = i(e.chmod)),
      (e.fchmod = i(e.fchmod)),
      (e.lchmod = i(e.lchmod)),
      (e.chownSync = h(e.chownSync)),
      (e.fchownSync = h(e.fchownSync)),
      (e.lchownSync = h(e.lchownSync)),
      (e.chmodSync = u(e.chmodSync)),
      (e.fchmodSync = u(e.fchmodSync)),
      (e.lchmodSync = u(e.lchmodSync)),
      (e.stat = m(e.stat)),
      (e.fstat = m(e.fstat)),
      (e.lstat = m(e.lstat)),
      (e.statSync = E(e.statSync)),
      (e.fstatSync = E(e.fstatSync)),
      (e.lstatSync = E(e.lstatSync)),
      e.chmod && !e.lchmod)
    )
      ((e.lchmod = function (o, p, f) {
        if (f) process.nextTick(f);
      }),
        (e.lchmodSync = function () {}));
    if (e.chown && !e.lchown)
      ((e.lchown = function (o, p, f, a) {
        if (a) process.nextTick(a);
      }),
        (e.lchownSync = function () {}));
    if (ht === "win32")
      e.rename =
        typeof e.rename !== "function"
          ? e.rename
          : (function (o) {
              function p(f, a, s) {
                var now = Date.now(),
                  S = 0;
                o(f, a, function T(j) {
                  if (
                    j &&
                    (j.code === "EACCES" || j.code === "EPERM" || j.code === "EBUSY") &&
                    Date.now() - now < 60000
                  ) {
                    if (
                      (setTimeout(function () {
                        e.stat(a, function (C, Z) {
                          if (C && C.code === "ENOENT") o(f, a, T);
                          else s(j);
                        });
                      }, S),
                      S < 100)
                    )
                      S += 10;
                    return;
                  }
                  if (s) s(j);
                });
              }
              if (Object.setPrototypeOf) Object.setPrototypeOf(p, o);
              return p;
            })(e.rename);
    ((e.read =
      typeof e.read !== "function"
        ? e.read
        : (function (o) {
            function p(f, a, s, w, S, T) {
              var j;
              if (T && typeof T === "function") {
                var C = 0;
                j = function (Z, Me, Ce) {
                  if (Z && Z.code === "EAGAIN" && C < 10) return (C++, o.call(e, f, a, s, w, S, j));
                  T.apply(this, arguments);
                };
              }
              return o.call(e, f, a, s, w, S, j);
            }
            if (Object.setPrototypeOf) Object.setPrototypeOf(p, o);
            return p;
          })(e.read)),
      (e.readSync =
        typeof e.readSync !== "function"
          ? e.readSync
          : (function (o) {
              return function (p, f, a, s, w) {
                var S = 0;
                while (!0)
                  try {
                    return o.call(e, p, f, a, s, w);
                  } catch (error) {
                    if (error.code === "EAGAIN" && S < 10) {
                      S++;
                      continue;
                    }
                    throw error;
                  }
              };
            })(e.readSync)));
    function r(o) {
      ((o.lchmod = function (p, f, a) {
        o.open(p, W.O_WRONLY | W.O_SYMLINK, f, function (s, w) {
          if (s) {
            if (a) a(s);
            return;
          }
          o.fchmod(w, f, function (S) {
            o.close(w, function (T) {
              if (a) a(S || T);
            });
          });
        });
      }),
        (o.lchmodSync = function (p, f) {
          var openSync = o.openSync(p, W.O_WRONLY | W.O_SYMLINK, f),
            s = !0,
            w;
          try {
            ((w = o.fchmodSync(openSync, f)), (s = !1));
          } finally {
            if (s)
              try {
                o.closeSync(openSync);
              } catch (error) {}
            else o.closeSync(openSync);
          }
          return w;
        }));
    }
    function n(o) {
      if (W.hasOwnProperty("O_SYMLINK") && o.futimes)
        ((o.lutimes = function (p, f, a, s) {
          o.open(p, W.O_SYMLINK, function (w, S) {
            if (w) {
              if (s) s(w);
              return;
            }
            o.futimes(S, f, a, function (T) {
              o.close(S, function (j) {
                if (s) s(T || j);
              });
            });
          });
        }),
          (o.lutimesSync = function (p, f, a) {
            var openSync = o.openSync(p, W.O_SYMLINK),
              w,
              S = !0;
            try {
              ((w = o.futimesSync(openSync, f, a)), (S = !1));
            } finally {
              if (S)
                try {
                  o.closeSync(openSync);
                } catch (error) {}
              else o.closeSync(openSync);
            }
            return w;
          }));
      else if (o.futimes)
        ((o.lutimes = function (p, f, a, s) {
          if (s) process.nextTick(s);
        }),
          (o.lutimesSync = function () {}));
    }
    function i(o) {
      if (!o) return o;
      return function (p, f, a) {
        return o.call(e, p, f, function (s) {
          if (b(s)) s = null;
          if (a) a.apply(this, arguments);
        });
      };
    }
    function u(o) {
      if (!o) return o;
      return function (p, f) {
        try {
          return o.call(e, p, f);
        } catch (error) {
          if (!b(error)) throw error;
        }
      };
    }
    function c(o) {
      if (!o) return o;
      return function (p, f, a, s) {
        return o.call(e, p, f, a, function (w) {
          if (b(w)) w = null;
          if (s) s.apply(this, arguments);
        });
      };
    }
    function h(o) {
      if (!o) return o;
      return function (p, f, a) {
        try {
          return o.call(e, p, f, a);
        } catch (error) {
          if (!b(error)) throw error;
        }
      };
    }
    function m(o) {
      if (!o) return o;
      return function (p, f, a) {
        if (typeof f === "function") ((a = f), (f = null));
        function s(w, S) {
          if (S) {
            if (S.uid < 0) S.uid += 4294967296;
            if (S.gid < 0) S.gid += 4294967296;
          }
          if (a) a.apply(this, arguments);
        }
        return f ? o.call(e, p, f, s) : o.call(e, p, s);
      };
    }
    function E(o) {
      if (!o) return o;
      return function (p, f) {
        var a = f ? o.call(e, p, f) : o.call(e, p);
        if (a) {
          if (a.uid < 0) a.uid += 4294967296;
          if (a.gid < 0) a.gid += 4294967296;
        }
        return a;
      };
    }
    function b(o) {
      if (!o) return !0;
      if (o.code === "ENOSYS") return !0;
      var p = !process.getuid || process.getuid() !== 0;
      if (p) {
        if (o.code === "EINVAL" || o.code === "EPERM") return !0;
      }
      return !1;
    }
  }
});

export { je };

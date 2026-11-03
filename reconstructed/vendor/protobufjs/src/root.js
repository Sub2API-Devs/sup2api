/**
 * protobufjs/src/root.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { zr } from "./namespace.js";
import { Yt } from "./field.js";
import { nt } from "./enum.js";
import { Sr } from "./oneof.js";
import { de } from "./util.js";

//@ chunk-pwh5dx3n.js:109305-112807 cjs-fingerprint
var xs = x(function (fA, wd) {
  wd.exports = Le;
  var Is = zr();
  ((Le.prototype = Object.create(Is.prototype)).constructor = Le).className = "Root";
  var Ns = Yt(),
    Ja = nt(),
    AE = Sr(),
    Ut = de(),
    Xa,
    Qa,
    Ni;
  function Le(e) {
    (Is.call(this, "", e),
      (this.deferred = []),
      (this.files = []),
      (this._edition = "proto2"),
      (this._fullyQualifiedObjects = {}));
  }
  Le.fromJSON = function (t, r, i) {
    if (((i = Ut.checkDepth(i)), !r)) r = new Le();
    if (t.options) r.setOptions(t.options);
    return r.addJSON(t.nested, i).resolveAll();
  };
  Le.prototype.resolvePath = Ut.path.resolve;
  Le.prototype.fetch = Ut.fetch;
  function Od() {}
  Le.prototype.load = function e(t, r, i) {
    if (typeof r === "function") ((i = r), (r = void 0));
    var s = this;
    if (!i) return Ut.asPromise(e, s, t, r);
    var n = i === Od;
    function a(m, f) {
      if (!i) return;
      if (n) throw m;
      if (f) f.resolveAll();
      var y = i;
      ((i = null), y(m, f));
    }
    function o(m) {
      var index = m.lastIndexOf("google/protobuf/");
      if (index > -1) {
        var substring = m.substring(index);
        if (substring in Ni) return substring;
      }
      return null;
    }
    function l(m, f) {
      try {
        if (Ut.isString(f) && f.charAt(0) === "{") f = JSON.parse(f);
        if (!Ut.isString(f)) s.setOptions(f.options).addJSON(f.nested);
        else {
          Qa.filename = m;
          var y = Qa(f, s, r),
            C,
            E = 0;
          if (y.imports) {
            for (; E < y.imports.length; ++E)
              if ((C = o(y.imports[E]) || s.resolvePath(m, y.imports[E]))) c(C);
          }
          if (y.weakImports) {
            for (E = 0; E < y.weakImports.length; ++E)
              if ((C = o(y.weakImports[E]) || s.resolvePath(m, y.weakImports[E]))) c(C, !0);
          }
        }
      } catch (error) {
        a(error);
      }
      if (!n && !u) a(null, s);
    }
    function c(m, f) {
      if (((m = o(m) || m), s.files.indexOf(m) > -1)) return;
      if ((s.files.push(m), m in Ni)) {
        if (n) l(m, Ni[m]);
        else
          (++u,
            setTimeout(function () {
              (--u, l(m, Ni[m]));
            }));
        return;
      }
      if (n) {
        var y;
        try {
          y = Ut.fs.readFileSync(m).toString("utf8");
        } catch (error) {
          if (!f) a(error);
          return;
        }
        l(m, y);
      } else
        (++u,
          s.fetch(m, function (C, E) {
            if ((--u, !i)) return;
            if (C) {
              if (!f) a(C);
              else if (!u) a(null, s);
              return;
            }
            l(m, E);
          }));
    }
    var u = 0;
    if (Ut.isString(t)) t = [t];
    for (var d = 0, h; d < t.length; ++d) if ((h = s.resolvePath("", t[d]))) c(h);
    if (n) return (s.resolveAll(), s);
    if (!u) a(null, s);
    return s;
  };
  Le.prototype.loadSync = function (t, r) {
    if (!Ut.isNode) throw Error("not supported");
    return this.load(t, r, Od);
  };
  Le.prototype.resolveAll = function () {
    if (!this._needsRecursiveResolve) return this;
    if (this.deferred.length)
      throw Error(
        "unresolvable extensions: " +
          this.deferred
            .map(function (t) {
              return "'extend " + t.extend + "' in " + t.parent.fullName;
            })
            .join(", "),
      );
    return Is.prototype.resolveAll.call(this);
  };
  var Ms = /^[A-Z]/;
  function bd(e, t) {
    var lookup = t.parent.lookup(t.extend);
    if (lookup) {
      var i = new Ns(t.fullName, t.id, t.type, t.rule, void 0, t.options);
      if (lookup.get(i.name)) return !0;
      return ((i.declaringField = t), (t.extensionField = i), lookup.add(i), !0);
    }
    return !1;
  }
  Le.prototype._handleAdd = function (t) {
    if (t instanceof Ns) {
      if (t.extend !== void 0 && !t.extensionField) {
        if (!bd(this, t)) this.deferred.push(t);
      }
    } else if (t instanceof Ja) {
      if (Ms.test(t.name)) t.parent[t.name] = t.values;
    } else if (!(t instanceof AE)) {
      if (t instanceof Xa)
        for (var r = 0; r < this.deferred.length;)
          if (bd(this, this.deferred[r])) this.deferred.splice(r, 1);
          else ++r;
      for (var i = 0; i < t.nestedArray.length; ++i) this._handleAdd(t._nestedArray[i]);
      if (Ms.test(t.name)) t.parent[t.name] = t;
    }
    if (t instanceof Xa || t instanceof Ja || t instanceof Ns) this._fullyQualifiedObjects[t.fullName] = t;
  };
  Le.prototype._handleRemove = function (t) {
    if (t instanceof Ns) {
      if (t.extend !== void 0)
        if (t.extensionField) (t.extensionField.parent.remove(t.extensionField), (t.extensionField = null));
        else {
          var index = this.deferred.indexOf(t);
          if (index > -1) this.deferred.splice(index, 1);
        }
    } else if (t instanceof Ja) {
      if (Ms.test(t.name)) delete t.parent[t.name];
    } else if (t instanceof Is) {
      for (var i = 0; i < t.nestedArray.length; ++i) this._handleRemove(t._nestedArray[i]);
      if (Ms.test(t.name)) delete t.parent[t.name];
    }
    delete this._fullyQualifiedObjects[t.fullName];
  };
  Le._configure = function (e, t, r) {
    ((Xa = e), (Qa = t), (Ni = r));
  };
});

export { xs };

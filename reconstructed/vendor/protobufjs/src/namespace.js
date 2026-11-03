/**
 * protobufjs/src/namespace.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Kt } from "./object.js";
import { Yt } from "./field.js";
import { de } from "./util.js";
import { Sr } from "./oneof.js";

//@ chunk-pwh5dx3n.js:80379-85940 cjs-fingerprint
var zr = x(function (iA, dd) {
  dd.exports = B;
  var Es = Kt();
  ((B.prototype = Object.create(Es.prototype)).constructor = B).className = "Namespace";
  var ka = Yt(),
    Br = de(),
    oE = Sr(),
    yr,
    Ur,
    _r;
  B.fromJSON = function (t, r, i) {
    return ((i = Br.checkDepth(i)), new B(t, r.options).addJSON(r.nested, i));
  };
  function cd(e, t) {
    if (!(e && e.length)) return;
    var r = {};
    for (var i = 0; i < e.length; ++i) r[e[i].name] = e[i].toJSON(t);
    return r;
  }
  B.arrayToJSON = cd;
  B.isReservedId = function (t, r) {
    if (t) {
      for (var i = 0; i < t.length; ++i)
        if (typeof t[i] !== "string" && t[i][0] <= r && t[i][1] > r) return !0;
    }
    return !1;
  };
  B.isReservedName = function (t, r) {
    if (t) {
      for (var i = 0; i < t.length; ++i) if (t[i] === r) return !0;
    }
    return !1;
  };
  function B(e, t) {
    (Es.call(this, e, t),
      (this.nested = void 0),
      (this._nestedArray = null),
      (this._lookupCache = Object.create(null)),
      (this._needsRecursiveFeatureResolution = !0),
      (this._needsRecursiveResolve = !0));
  }
  function ud(e) {
    ((e._nestedArray = null), (e._lookupCache = Object.create(null)));
    var t = e;
    while ((t = t.parent)) t._lookupCache = Object.create(null);
    return e;
  }
  Object.defineProperty(B.prototype, "nestedArray", {
    get: function () {
      return this._nestedArray || (this._nestedArray = Br.toArray(this.nested));
    },
  });
  B.prototype.toJSON = function (t) {
    return Br.toObject(["options", this.options, "nested", cd(this.nestedArray, t)]);
  };
  B.prototype.addJSON = function (t, r) {
    r = Br.checkDepth(r);
    var i = this;
    if (t)
      for (var keys = Object.keys(t), n = 0, a; n < keys.length; ++n)
        ((a = t[keys[n]]),
          i.add(
            (a.fields !== void 0
              ? yr.fromJSON
              : a.values !== void 0
                ? _r.fromJSON
                : a.methods !== void 0
                  ? Ur.fromJSON
                  : a.id !== void 0
                    ? ka.fromJSON
                    : B.fromJSON)(keys[n], a, r + 1),
          ));
    return this;
  };
  B.prototype.get = function (t) {
    return this.nested && Object.prototype.hasOwnProperty.call(this.nested, t) ? this.nested[t] : null;
  };
  B.prototype.getEnum = function (t) {
    if (this.nested && Object.prototype.hasOwnProperty.call(this.nested, t) && this.nested[t] instanceof _r)
      return this.nested[t].values;
    throw Error("no such enum: " + t);
  };
  B.prototype.add = function (t) {
    if (!(
      (t instanceof ka && t.extend !== void 0) ||
      t instanceof yr ||
      t instanceof oE ||
      t instanceof _r ||
      t instanceof Ur ||
      t instanceof B
    ))
      throw TypeError("object must be a valid nested object");
    if (t.name === "__proto__") return this;
    if (!this.nested) this.nested = {};
    else {
      var r = this.get(t.name);
      if (r)
        if (r instanceof B && t instanceof B && !(r instanceof yr || r instanceof Ur)) {
          var nestedArray = r.nestedArray;
          for (var s = 0; s < nestedArray.length; ++s) t.add(nestedArray[s]);
          if ((this.remove(r), !this.nested)) this.nested = {};
          t.setOptions(r.options, !0);
        } else throw Error("duplicate name '" + t.name + "' in " + this);
    }
    if (
      ((this.nested[t.name] = t),
      !(this instanceof yr || this instanceof Ur || this instanceof _r || this instanceof ka))
    ) {
      if (!t._edition) t._edition = t._defaultEdition;
    }
    ((this._needsRecursiveFeatureResolution = !0), (this._needsRecursiveResolve = !0));
    var n = this;
    while ((n = n.parent)) ((n._needsRecursiveFeatureResolution = !0), (n._needsRecursiveResolve = !0));
    return (t.onAdd(this), ud(this));
  };
  B.prototype.remove = function (t) {
    if (!(t instanceof Es)) throw TypeError("object must be a ReflectionObject");
    if (t.parent !== this) throw Error(t + " is not a member of " + this);
    if ((delete this.nested[t.name], !Object.keys(this.nested).length)) this.nested = void 0;
    return (t.onRemove(this), ud(this));
  };
  B.prototype.define = function (t, r) {
    if (Br.isString(t)) t = t.split(".");
    else if (!Array.isArray(t)) throw TypeError("illegal path");
    if (t && t.length && t[0] === "") throw Error("path must be relative");
    var i = this;
    while (t.length > 0) {
      var s = t.shift();
      if (i.nested && i.nested[s]) {
        if (((i = i.nested[s]), !(i instanceof B))) throw Error("path conflicts with non-namespace objects");
      } else i.add((i = new B(s)));
    }
    if (r) i.addJSON(r);
    return i;
  };
  B.prototype.resolveAll = function () {
    if (!this._needsRecursiveResolve) return this;
    this._resolveFeaturesRecursive(this._edition);
    var nestedArray = this.nestedArray,
      r = 0;
    this.resolve();
    while (r < nestedArray.length)
      if (nestedArray[r] instanceof B) nestedArray[r++].resolveAll();
      else nestedArray[r++].resolve();
    return ((this._needsRecursiveResolve = !1), this);
  };
  B.prototype._resolveFeaturesRecursive = function (t) {
    if (!this._needsRecursiveFeatureResolution) return this;
    return (
      (this._needsRecursiveFeatureResolution = !1),
      (t = this._edition || t),
      Es.prototype._resolveFeaturesRecursive.call(this, t),
      this.nestedArray.forEach((r) => {
        r._resolveFeaturesRecursive(t);
      }),
      this
    );
  };
  B.prototype.lookup = function (t, r, i) {
    if (typeof r === "boolean") ((i = r), (r = void 0));
    else if (r && !Array.isArray(r)) r = [r];
    if (Br.isString(t) && t.length) {
      if (t === ".") return this.root;
      t = t.split(".");
    } else if (!t.length) return this;
    var joined = t.join(".");
    if (t[0] === "") return this.root.lookup(t.slice(1), r);
    var n = this.root._fullyQualifiedObjects && this.root._fullyQualifiedObjects["." + joined];
    if (n && (!r || r.indexOf(n.constructor) > -1)) return n;
    if (((n = this._lookupImpl(t, joined)), n && (!r || r.indexOf(n.constructor) > -1))) return n;
    if (i) return null;
    var a = this;
    while (a.parent) {
      if (((n = a.parent._lookupImpl(t, joined)), n && (!r || r.indexOf(n.constructor) > -1))) return n;
      a = a.parent;
    }
    return null;
  };
  B.prototype._lookupImpl = function (t, r) {
    if (Object.prototype.hasOwnProperty.call(this._lookupCache, r)) return this._lookupCache[r];
    var i = this.get(t[0]),
      s = null;
    if (i) {
      if (t.length === 1) s = i;
      else if (i instanceof B) ((t = t.slice(1)), (s = i._lookupImpl(t, t.join("."))));
    } else
      for (var n = 0; n < this.nestedArray.length; ++n)
        if (this._nestedArray[n] instanceof B && (i = this._nestedArray[n]._lookupImpl(t, r))) {
          s = i;
          break;
        }
    return ((this._lookupCache[r] = s), s);
  };
  B.prototype.lookupType = function (t) {
    var lookup = this.lookup(t, [yr]);
    if (!lookup) throw Error("no such type: " + t);
    return lookup;
  };
  B.prototype.lookupEnum = function (t) {
    var lookup = this.lookup(t, [_r]);
    if (!lookup) throw Error("no such Enum '" + t + "' in " + this);
    return lookup;
  };
  B.prototype.lookupTypeOrEnum = function (t) {
    var lookup = this.lookup(t, [yr, _r]);
    if (!lookup) throw Error("no such Type or Enum '" + t + "' in " + this);
    return lookup;
  };
  B.prototype.lookupService = function (t) {
    var lookup = this.lookup(t, [Ur]);
    if (!lookup) throw Error("no such Service '" + t + "' in " + this);
    return lookup;
  };
  B._configure = function (e, t, r) {
    ((yr = e), (Ur = t), (_r = r));
  };
});

export { zr };

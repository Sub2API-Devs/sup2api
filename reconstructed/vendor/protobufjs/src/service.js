/**
 * protobufjs/src/service.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { zr } from "./namespace.js";
import { Rs } from "./method.js";
import { de } from "./util.js";
import { ZPo } from "./rpc.js";

//@ chunk-pwh5dx3n.js:88399-90850 cjs-fingerprint
var bs = x(function (aA, gd) {
  gd.exports = De;
  var Ft = zr();
  ((De.prototype = Object.create(Ft.prototype)).constructor = De).className = "Service";
  var Fa = Rs(),
    Wr = de(),
    cE = ZPo(),
    reservedRe = Wr.patterns.reservedRe;
  function De(e, t) {
    (Ft.call(this, e, t), (this.methods = {}), (this._methodsArray = null));
  }
  De.fromJSON = function (t, r, i) {
    i = Wr.checkDepth(i);
    var s = new De(t, r.options);
    if (r.methods)
      for (var keys = Object.keys(r.methods), a = 0; a < keys.length; ++a)
        s.add(Fa.fromJSON(keys[a], r.methods[keys[a]]));
    if (r.nested) s.addJSON(r.nested, i);
    if (r.edition) s._edition = r.edition;
    return ((s.comment = r.comment), (s._defaultEdition = "proto3"), s);
  };
  De.prototype.toJSON = function (t) {
    var r = Ft.prototype.toJSON.call(this, t),
      i = t ? Boolean(t.keepComments) : !1;
    return Wr.toObject([
      "edition",
      this._editionToJSON(),
      "options",
      (r && r.options) || void 0,
      "methods",
      Ft.arrayToJSON(this.methodsArray, t) || {},
      "nested",
      (r && r.nested) || void 0,
      "comment",
      i ? this.comment : void 0,
    ]);
  };
  Object.defineProperty(De.prototype, "methodsArray", {
    get: function () {
      return this._methodsArray || (this._methodsArray = Wr.toArray(this.methods));
    },
  });
  function pd(e) {
    return ((e._methodsArray = null), e);
  }
  De.prototype.get = function (t) {
    return Object.prototype.hasOwnProperty.call(this.methods, t)
      ? this.methods[t]
      : Ft.prototype.get.call(this, t);
  };
  De.prototype.resolveAll = function () {
    if (!this._needsRecursiveResolve) return this;
    Ft.prototype.resolve.call(this);
    var methodsArray = this.methodsArray;
    for (var r = 0; r < methodsArray.length; ++r) methodsArray[r].resolve();
    return this;
  };
  De.prototype._resolveFeaturesRecursive = function (t) {
    if (!this._needsRecursiveFeatureResolution) return this;
    return (
      (t = this._edition || t),
      Ft.prototype._resolveFeaturesRecursive.call(this, t),
      this.methodsArray.forEach((r) => {
        r._resolveFeaturesRecursive(t);
      }),
      this
    );
  };
  De.prototype.add = function (t) {
    if (this.get(t.name)) throw Error("duplicate name '" + t.name + "' in " + this);
    if (t instanceof Fa) {
      if (t.name === "__proto__") return this;
      return ((this.methods[t.name] = t), (t.parent = this), pd(this));
    }
    return Ft.prototype.add.call(this, t);
  };
  De.prototype.remove = function (t) {
    if (t instanceof Fa) {
      if (this.methods[t.name] !== t) throw Error(t + " is not a member of " + this);
      return (delete this.methods[t.name], (t.parent = null), pd(this));
    }
    return Ft.prototype.remove.call(this, t);
  };
  De.prototype.create = function (t, r, i) {
    var s = new cE.Service(t, r, i);
    for (var n = 0, a; n < this.methodsArray.length; ++n) {
      var replaced = Wr.lcFirst((a = this._methodsArray[n]).resolve().name).replace(/[^$\w_]/g, "");
      s[replaced] = Wr.codegen(
        ["r", "c"],
        reservedRe.test(replaced) ? replaced + "_" : replaced,
      )("return this.rpcCall(m,q,s,r,c)")({
        m: a,
        q: a.resolvedRequestType.ctor,
        s: a.resolvedResponseType.ctor,
      });
    }
    return s;
  };
});

export { bs };

/**
 * protobufjs/src/type.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { zr } from "./namespace.js";
import { nt } from "./enum.js";
import { Sr } from "./oneof.js";
import { Yt } from "./field.js";
import { Ts } from "./mapfield.js";
import { bs } from "./service.js";
import { Os } from "./message.js";
import { _Hr } from "./reader.js";
import { yHr } from "./writer.js";
import { de } from "./util.js";
import { Ka } from "./encoder.js";
import { qa } from "./decoder.js";
import { za } from "./verifier.js";
import { ja } from "./converter.js";
import { Ga } from "./wrappers.js";

//@ chunk-pwh5dx3n.js:102455-109305 cjs-fingerprint
var Ps = x(function (hA, Rd) {
  Rd.exports = J;
  var We = zr();
  ((J.prototype = Object.create(We.prototype)).constructor = J).className = "Type";
  var SE = nt(),
    Ya = Sr(),
    ws = Yt(),
    CE = Ts(),
    EE = bs(),
    $a = Os(),
    Va = _Hr(),
    TE = yHr(),
    ve = de(),
    RE = Ka(),
    bE = qa(),
    OE = za(),
    Td = ja(),
    wE = Ga();
  function J(e, t) {
    ((e = e.replace(/\W/g, "")),
      We.call(this, e, t),
      (this.fields = {}),
      (this.oneofs = void 0),
      (this.extensions = void 0),
      (this.reserved = void 0),
      (this.group = void 0),
      (this._fieldsById = null),
      (this._fieldsArray = null),
      (this._oneofsArray = null),
      (this._ctor = null));
  }
  Object.defineProperties(J.prototype, {
    fieldsById: {
      get: function () {
        if (this._fieldsById) return this._fieldsById;
        this._fieldsById = {};
        for (var keys = Object.keys(this.fields), t = 0; t < keys.length; ++t) {
          var r = this.fields[keys[t]],
            id = r.id;
          if (this._fieldsById[id]) throw Error("duplicate id " + id + " in " + this);
          this._fieldsById[id] = r;
        }
        return this._fieldsById;
      },
    },
    fieldsArray: {
      get: function () {
        return this._fieldsArray || (this._fieldsArray = ve.toArray(this.fields));
      },
    },
    oneofsArray: {
      get: function () {
        return this._oneofsArray || (this._oneofsArray = ve.toArray(this.oneofs));
      },
    },
    ctor: {
      get: function () {
        return this._ctor || (this.ctor = J.generateConstructor(this)());
      },
      set: function (e) {
        var t = e.prototype;
        if (!(t instanceof $a)) (((e.prototype = new $a()).constructor = e), ve.merge(e.prototype, t));
        ((e.$type = e.prototype.$type = this), ve.merge(e, $a, !0), (this._ctor = e));
        var r = 0;
        for (; r < this.fieldsArray.length; ++r) this._fieldsArray[r].resolve();
        var i = {};
        for (r = 0; r < this.oneofsArray.length; ++r)
          i[this._oneofsArray[r].resolve().name] = {
            get: ve.oneOfGetter(this._oneofsArray[r].oneof),
            set: ve.oneOfSetter(this._oneofsArray[r].oneof),
          };
        if (r) Object.defineProperties(e.prototype, i);
      },
    },
  });
  J.generateConstructor = function (t) {
    var codegen = ve.codegen(["p"], t.name);
    for (var i = 0, s; i < t.fieldsArray.length; ++i)
      if ((s = t._fieldsArray[i]).map) codegen("this%s={}", ve.safeProp(s.name));
      else if (s.repeated) codegen("this%s=[]", ve.safeProp(s.name));
    return codegen(
      'if(p)for(var ks=Object.keys(p),i=0;i<ks.length;++i)if(p[ks[i]]!=null&&ks[i]!=="__proto__")',
    )("this[ks[i]]=p[ks[i]]");
  };
  function As(e) {
    return (
      (e._fieldsById = e._fieldsArray = e._oneofsArray = null),
      delete e.encode,
      delete e.decode,
      delete e.verify,
      e
    );
  }
  J.fromJSON = function (t, r, i) {
    i = ve.checkDepth(i);
    var s = new J(t, r.options);
    ((s.extensions = r.extensions), (s.reserved = r.reserved));
    var keys = Object.keys(r.fields),
      a = 0;
    for (; a < keys.length; ++a)
      s.add((typeof r.fields[keys[a]].keyType < "u" ? CE.fromJSON : ws.fromJSON)(keys[a], r.fields[keys[a]]));
    if (r.oneofs)
      for (keys = Object.keys(r.oneofs), a = 0; a < keys.length; ++a)
        s.add(Ya.fromJSON(keys[a], r.oneofs[keys[a]]));
    if (r.nested)
      for (keys = Object.keys(r.nested), a = 0; a < keys.length; ++a) {
        var o = r.nested[keys[a]];
        s.add(
          (o.id !== void 0
            ? ws.fromJSON
            : o.fields !== void 0
              ? J.fromJSON
              : o.values !== void 0
                ? SE.fromJSON
                : o.methods !== void 0
                  ? EE.fromJSON
                  : We.fromJSON)(keys[a], o, i + 1),
        );
      }
    if (r.extensions && r.extensions.length) s.extensions = r.extensions;
    if (r.reserved && r.reserved.length) s.reserved = r.reserved;
    if (r.group) s.group = !0;
    if (r.comment) s.comment = r.comment;
    if (r.edition) s._edition = r.edition;
    return ((s._defaultEdition = "proto3"), s);
  };
  J.prototype.toJSON = function (t) {
    var r = We.prototype.toJSON.call(this, t),
      i = t ? Boolean(t.keepComments) : !1;
    return ve.toObject([
      "edition",
      this._editionToJSON(),
      "options",
      (r && r.options) || void 0,
      "oneofs",
      We.arrayToJSON(this.oneofsArray, t),
      "fields",
      We.arrayToJSON(
        this.fieldsArray.filter(function (s) {
          return !s.declaringField;
        }),
        t,
      ) || {},
      "extensions",
      this.extensions && this.extensions.length ? this.extensions : void 0,
      "reserved",
      this.reserved && this.reserved.length ? this.reserved : void 0,
      "group",
      this.group || void 0,
      "nested",
      (r && r.nested) || void 0,
      "comment",
      i ? this.comment : void 0,
    ]);
  };
  J.prototype.resolveAll = function () {
    if (!this._needsRecursiveResolve) return this;
    We.prototype.resolveAll.call(this);
    var oneofsArray = this.oneofsArray;
    i = 0;
    while (i < oneofsArray.length) oneofsArray[i++].resolve();
    var fieldsArray = this.fieldsArray,
      i = 0;
    while (i < fieldsArray.length) fieldsArray[i++].resolve();
    return this;
  };
  J.prototype._resolveFeaturesRecursive = function (t) {
    if (!this._needsRecursiveFeatureResolution) return this;
    return (
      (t = this._edition || t),
      We.prototype._resolveFeaturesRecursive.call(this, t),
      this.oneofsArray.forEach((r) => {
        r._resolveFeatures(t);
      }),
      this.fieldsArray.forEach((r) => {
        r._resolveFeatures(t);
      }),
      this
    );
  };
  J.prototype.get = function (t) {
    if (Object.prototype.hasOwnProperty.call(this.fields, t)) return this.fields[t];
    if (this.oneofs && Object.prototype.hasOwnProperty.call(this.oneofs, t)) return this.oneofs[t];
    if (this.nested && Object.prototype.hasOwnProperty.call(this.nested, t)) return this.nested[t];
    return null;
  };
  J.prototype.add = function (t) {
    if (this.get(t.name)) throw Error("duplicate name '" + t.name + "' in " + this);
    if (t instanceof ws && t.extend === void 0) {
      if (this._fieldsById ? this._fieldsById[t.id] : this.fieldsById[t.id])
        throw Error("duplicate id " + t.id + " in " + this);
      if (this.isReservedId(t.id)) throw Error("id " + t.id + " is reserved in " + this);
      if (this.isReservedName(t.name)) throw Error("name '" + t.name + "' is reserved in " + this);
      if (t.name === "__proto__") return this;
      if (t.parent) t.parent.remove(t);
      return ((this.fields[t.name] = t), (t.message = this), t.onAdd(this), As(this));
    }
    if (t instanceof Ya) {
      if (t.name === "__proto__") return this;
      if (!this.oneofs) this.oneofs = {};
      return ((this.oneofs[t.name] = t), t.onAdd(this), As(this));
    }
    return We.prototype.add.call(this, t);
  };
  J.prototype.remove = function (t) {
    if (t instanceof ws && t.extend === void 0) {
      if (!this.fields || this.fields[t.name] !== t) throw Error(t + " is not a member of " + this);
      return (delete this.fields[t.name], (t.parent = null), t.onRemove(this), As(this));
    }
    if (t instanceof Ya) {
      if (!this.oneofs || this.oneofs[t.name] !== t) throw Error(t + " is not a member of " + this);
      return (delete this.oneofs[t.name], (t.parent = null), t.onRemove(this), As(this));
    }
    return We.prototype.remove.call(this, t);
  };
  J.prototype.isReservedId = function (t) {
    return We.isReservedId(this.reserved, t);
  };
  J.prototype.isReservedName = function (t) {
    return We.isReservedName(this.reserved, t);
  };
  J.prototype.create = function (t) {
    return new this.ctor(t);
  };
  J.prototype.setup = function () {
    var fullName = this.fullName,
      r = [];
    for (var i = 0; i < this.fieldsArray.length; ++i) r.push(this._fieldsArray[i].resolve().resolvedType);
    ((this.encode = RE(this)({ Writer: TE, types: r, util: ve })),
      (this.decode = bE(this)({ Reader: Va, types: r, util: ve })),
      (this.verify = OE(this)({ types: r, util: ve })),
      (this.fromObject = Td.fromObject(this)({ types: r, util: ve })),
      (this.toObject = Td.toObject(this)({ types: r, util: ve })));
    var s = wE[fullName];
    if (s) {
      var create = Object.create(this);
      ((create.fromObject = this.fromObject),
        (this.fromObject = s.fromObject.bind(create)),
        (create.toObject = this.toObject),
        (this.toObject = s.toObject.bind(create)));
    }
    return this;
  };
  J.prototype.encode = function (t, r) {
    return this.setup().encode(t, r);
  };
  J.prototype.encodeDelimited = function (t, r) {
    return this.encode(t, r && r.len ? r.fork() : r).ldelim();
  };
  J.prototype.decode = function (t, r, i, s) {
    return this.setup().decode(t, r, i, s);
  };
  J.prototype.decodeDelimited = function (t) {
    if (!(t instanceof Va)) t = Va.create(t);
    return this.decode(t, t.uint32());
  };
  J.prototype.verify = function (t, r) {
    return this.setup().verify(t, r);
  };
  J.prototype.fromObject = function (t, r) {
    return this.setup().fromObject(t, r);
  };
  J.prototype.toObject = function (t, r) {
    return this.setup().toObject(t, r);
  };
  J.d = function (t) {
    return function (i) {
      ve.decorateType(i, t);
    };
  };
});

export { Ps };

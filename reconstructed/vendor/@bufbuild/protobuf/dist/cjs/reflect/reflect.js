/**
 * @bufbuild/protobuf/dist/cjs/reflect/reflect.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { Ns } from "../descriptors.js";
import { Dg } from "./reflect-check.js";
import { op } from "./error.js";
import { xl } from "./unsafe.js";
import { wl } from "../create.js";
import { Fu } from "../wkt/wrappers.js";
import { El } from "../../commonjs/reflect/scalar.js";
import { ko } from "../../commonjs/proto-int64.js";
import { Uu } from "./guard.js";

//@ chunk-fq0cr76a.js:345921-353042 cjs-require-graph
var Po = x(function (Ck) {
  Object.defineProperty(Ck, "__esModule", { value: !0 });
  Ck.reflect = AY;
  Ck.reflectList = CY;
  Ck.reflectMap = RY;
  var On = Ns(),
    Tl = Dg(),
    Fg = op(),
    Yr = xl(),
    xk = wl(),
    Mg = Fu(),
    _k = El(),
    Li = ko(),
    Oo = Uu();
  function AY(e, n, r = !0) {
    return new qx(e, n, r);
  }
  var weakMap = new WeakMap();
  class qx {
    get sortedFields() {
      let e = weakMap.get(this.desc);
      if (e) return e;
      let sorted = this.desc.fields.concat().sort((r, s) => r.number - s.number);
      return (weakMap.set(this.desc, sorted), sorted);
    }
    constructor(e, n, r = !0) {
      ((this.lists = new Map()),
        (this.maps = new Map()),
        (this.check = r),
        (this.desc = e),
        (this.message = this[Yr.unsafeLocal] = n !== null && n !== void 0 ? n : xk.create(e)),
        (this.fields = e.fields),
        (this.oneofs = e.oneofs),
        (this.members = e.members));
    }
    findNumber(e) {
      if (!this._fieldsByNumber)
        this._fieldsByNumber = new Map(this.desc.fields.map((field) => [field.number, field]));
      return this._fieldsByNumber.get(e);
    }
    oneofCase(e) {
      return (cp(this.message, e), Yr.unsafeOneofCase(this.message, e));
    }
    isSet(e) {
      return (cp(this.message, e), Yr.unsafeIsSet(this.message, e));
    }
    clear(e) {
      (cp(this.message, e), Yr.unsafeClear(this.message, e));
    }
    get(e) {
      cp(this.message, e);
      let unsafeGet = Yr.unsafeGet(this.message, e);
      switch (e.fieldKind) {
        case "list":
          let r = this.lists.get(e);
          if (!r || r[Yr.unsafeLocal] !== unsafeGet)
            this.lists.set(e, (r = new jx(e, unsafeGet, this.check)));
          return r;
        case "map":
          let s = this.maps.get(e);
          if (!s || s[Yr.unsafeLocal] !== unsafeGet) this.maps.set(e, (s = new Yx(e, unsafeGet, this.check)));
          return s;
        case "message":
          return zx(e, unsafeGet, this.check);
        case "scalar":
          return unsafeGet === void 0 ? _k.scalarZeroValue(e.scalar, !1) : Xx(e, unsafeGet);
        case "enum":
          return unsafeGet !== null && unsafeGet !== void 0 ? unsafeGet : e.enum.values[0].number;
      }
    }
    set(e, n) {
      if ((cp(this.message, e), this.check)) {
        let checkField = Tl.checkField(e, n);
        if (checkField) throw checkField;
      }
      let r;
      if (e.fieldKind == "message") r = Zx(e, n);
      else if (Oo.isReflectMap(n) || Oo.isReflectList(n)) r = n[Yr.unsafeLocal];
      else r = Jx(e, n);
      Yr.unsafeSet(this.message, e, r);
    }
    getUnknown() {
      return this.message.$unknown;
    }
    setUnknown(e) {
      this.message.$unknown = e;
    }
  }
  function cp(e, n) {
    if (n.parent.typeName !== e.$typeName)
      throw new Fg.FieldError(
        n,
        `cannot use ${n.toString()} with message ${e.$typeName}`,
        "ForeignFieldError",
      );
  }
  function CY(e, n, r = !0) {
    return new jx(e, n !== null && n !== void 0 ? n : [], r);
  }
  class jx {
    field() {
      return this._field;
    }
    get size() {
      return this._arr.length;
    }
    constructor(e, n, r) {
      ((this._field = e), (this._arr = this[Yr.unsafeLocal] = n), (this.check = r));
    }
    get(e) {
      let n = this._arr[e];
      return n === void 0 ? void 0 : Hx(this._field, n, this.check);
    }
    set(e, n) {
      if (e < 0 || e >= this._arr.length)
        throw new Fg.FieldError(this._field, `list item #${e + 1}: out of range`);
      if (this.check) {
        let checkListItem = Tl.checkListItem(this._field, e, n);
        if (checkListItem) throw checkListItem;
      }
      this._arr[e] = Sk(this._field, n);
    }
    add(e) {
      if (this.check) {
        let checkListItem = Tl.checkListItem(this._field, this._arr.length, e);
        if (checkListItem) throw checkListItem;
      }
      this._arr.push(Sk(this._field, e));
      return;
    }
    clear() {
      this._arr.splice(0, this._arr.length);
    }
    [Symbol.iterator]() {
      return this.values();
    }
    keys() {
      return this._arr.keys();
    }
    *values() {
      for (let e of this._arr) yield Hx(this._field, e, this.check);
    }
    *entries() {
      for (let e = 0; e < this._arr.length; e++) yield [e, Hx(this._field, this._arr[e], this.check)];
    }
  }
  function RY(e, n, r = !0) {
    return new Yx(e, n, r);
  }
  class Yx {
    constructor(e, n, r = !0) {
      ((this.obj = this[Yr.unsafeLocal] = n !== null && n !== void 0 ? n : {}),
        (this.check = r),
        (this._field = e));
    }
    field() {
      return this._field;
    }
    set(e, n) {
      if (this.check) {
        let checkMapEntry = Tl.checkMapEntry(this._field, e, n);
        if (checkMapEntry) throw checkMapEntry;
      }
      return ((this.obj[Ug(e)] = IY(this._field, n)), this);
    }
    delete(e) {
      let n = Ug(e),
        r = Object.prototype.hasOwnProperty.call(this.obj, n);
      if (r) delete this.obj[n];
      return r;
    }
    clear() {
      for (let e of Object.keys(this.obj)) delete this.obj[e];
    }
    get(e) {
      let n = this.obj[Ug(e)];
      if (n !== void 0) n = Kx(this._field, n, this.check);
      return n;
    }
    has(e) {
      return Object.prototype.hasOwnProperty.call(this.obj, Ug(e));
    }
    *keys() {
      for (let e of Object.keys(this.obj)) yield Ek(e, this._field.mapKey);
    }
    *entries() {
      for (let e of Object.entries(this.obj))
        yield [Ek(e[0], this._field.mapKey), Kx(this._field, e[1], this.check)];
    }
    [Symbol.iterator]() {
      return this.entries();
    }
    get size() {
      return Object.keys(this.obj).length;
    }
    *values() {
      for (let e of Object.values(this.obj)) yield Kx(this._field, e, this.check);
    }
    forEach(e, n) {
      for (let r of this.entries()) e.call(n, r[1], r[0], this);
    }
  }
  function Zx(e, n) {
    if (!Oo.isReflectMessage(n)) return n;
    if (Mg.isWrapper(n.message) && !e.oneof && e.fieldKind == "message") return n.message.value;
    if (n.desc.typeName == "google.protobuf.Struct" && e.parent.typeName != "google.protobuf.Value")
      return wk(n.message);
    return n.message;
  }
  function zx(e, n, r) {
    if (n !== void 0) {
      if (Mg.isWrapperDesc(e.message) && !e.oneof && e.fieldKind == "message")
        n = { $typeName: e.message.typeName, value: Xx(e.message.fields[0], n) };
      else if (
        e.message.typeName == "google.protobuf.Struct" &&
        e.parent.typeName != "google.protobuf.Value" &&
        Oo.isObject(n)
      )
        n = vk(n);
    }
    return new qx(e.message, n, r);
  }
  function Sk(e, n) {
    if (e.listKind == "message") return Zx(e, n);
    return Jx(e, n);
  }
  function Hx(e, n, r) {
    if (e.listKind == "message") return zx(e, n, r);
    return Xx(e, n);
  }
  function IY(e, n) {
    if (e.mapKind == "message") return Zx(e, n);
    return Jx(e, n);
  }
  function Kx(e, n, r) {
    if (e.mapKind == "message") return zx(e, n, r);
    return n;
  }
  function Ug(e) {
    return typeof e == "string" || typeof e == "number" ? e : String(e);
  }
  function Ek(e, n) {
    switch (n) {
      case On.ScalarType.STRING:
        return e;
      case On.ScalarType.INT32:
      case On.ScalarType.FIXED32:
      case On.ScalarType.UINT32:
      case On.ScalarType.SFIXED32:
      case On.ScalarType.SINT32: {
        let int = Number.parseInt(e);
        if (Number.isFinite(int)) return int;
        break;
      }
      case On.ScalarType.BOOL:
        switch (e) {
          case "true":
            return !0;
          case "false":
            return !1;
        }
        break;
      case On.ScalarType.UINT64:
      case On.ScalarType.FIXED64:
        try {
          return Li.protoInt64.uParse(e);
        } catch (error) {}
        break;
      default:
        try {
          return Li.protoInt64.parse(e);
        } catch (error) {}
        break;
    }
    return e;
  }
  function Xx(e, n) {
    switch (e.scalar) {
      case On.ScalarType.INT64:
      case On.ScalarType.SFIXED64:
      case On.ScalarType.SINT64:
        if ("longAsString" in e && e.longAsString && typeof n == "string") n = Li.protoInt64.parse(n);
        break;
      case On.ScalarType.FIXED64:
      case On.ScalarType.UINT64:
        if ("longAsString" in e && e.longAsString && typeof n == "string") n = Li.protoInt64.uParse(n);
        break;
    }
    return n;
  }
  function Jx(e, n) {
    switch (e.scalar) {
      case On.ScalarType.INT64:
      case On.ScalarType.SFIXED64:
      case On.ScalarType.SINT64:
        if ("longAsString" in e && e.longAsString) n = String(n);
        else if (typeof n == "string" || typeof n == "number") n = Li.protoInt64.parse(n);
        break;
      case On.ScalarType.FIXED64:
      case On.ScalarType.UINT64:
        if ("longAsString" in e && e.longAsString) n = String(n);
        else if (typeof n == "string" || typeof n == "number") n = Li.protoInt64.uParse(n);
        break;
    }
    return n;
  }
  function vk(e) {
    let n = { $typeName: "google.protobuf.Struct", fields: {} };
    if (Oo.isObject(e)) for (let [r, s] of Object.entries(e)) n.fields[r] = Ak(s);
    return n;
  }
  function wk(e) {
    let n = {};
    for (let [r, s] of Object.entries(e.fields)) n[r] = Tk(s);
    return n;
  }
  function Tk(e) {
    switch (e.kind.case) {
      case "structValue":
        return wk(e.kind.value);
      case "listValue":
        return e.kind.value.values.map(Tk);
      case "nullValue":
      case void 0:
        return null;
      default:
        return e.kind.value;
    }
  }
  function Ak(e) {
    let n = { $typeName: "google.protobuf.Value", kind: { case: void 0 } };
    switch (typeof e) {
      case "number":
        n.kind = { case: "numberValue", value: e };
        break;
      case "string":
        n.kind = { case: "stringValue", value: e };
        break;
      case "boolean":
        n.kind = { case: "boolValue", value: e };
        break;
      case "object":
        if (e === null) n.kind = { case: "nullValue", value: 0 };
        else if (Array.isArray(e)) {
          let r = { $typeName: "google.protobuf.ListValue", values: [] };
          if (Array.isArray(e)) for (let s of e) r.values.push(Ak(s));
          n.kind = { case: "listValue", value: r };
        } else n.kind = { case: "structValue", value: vk(e) };
        break;
    }
    return n;
  }
});

export { Po };

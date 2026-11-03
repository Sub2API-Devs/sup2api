/**
 * @bufbuild/cel/dist/cjs/access.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { av } from "./planner.js";
import { bl } from "./error.js";
import { MU } from "./field.js";
import { Bi } from "./uint.js";
import { Ei } from "./type.js";

//@ chunk-fq0cr76a.js:603440-611055 cjs-fingerprint
var QU = x(function (XU) {
  Object.defineProperty(XU, "__esModule", { value: !0 });
  XU.ConcreteAttributeFactory = XU.ErrorAttr = void 0;
  var $U = av(),
    yr = bl(),
    Mr = MU(),
    VU = Bi(),
    cr = Ei();
  function s0(e, n, r, s) {
    let resolved = s.resolve(n);
    if (resolved === void 0) return;
    if (yr.isCelError(resolved)) return resolved;
    return e.newAccess(s.id, resolved, s.isOptional()).access(n, r);
  }
  function i0(e, n, r, s) {
    let resolved = s.resolve(n);
    if (resolved === void 0) return !1;
    if (yr.isCelError(resolved)) return resolved;
    return e.newAccess(s.id, resolved, s.isOptional()).isPresent(n, r);
  }
  function o0(e, n, r, s, h) {
    let resolved = s.resolve(n);
    if (resolved === void 0) return;
    if (yr.isCelError(resolved)) return resolved;
    return e.newAccess(s.id, resolved, s.isOptional()).accessIfPresent(n, r, h);
  }
  function WU(e, n, r) {
    if (r.length === 0) return n;
    let s = n;
    for (let h of r) {
      let access = h.access(e, s);
      if (access === void 0) return;
      if (yr.isCelError(access)) return access;
      s = access;
    }
    return s;
  }
  class GU {
    id;
    nsNames;
    accesses_;
    registry;
    factory;
    constructor(e, n, r, s, h) {
      if (
        ((this.id = e),
        (this.nsNames = n),
        (this.accesses_ = r),
        (this.registry = s),
        (this.factory = h),
        n.length === 0)
      )
        throw Error("No names provided");
    }
    isOptional() {
      return !1;
    }
    addAccess(e) {
      this.accesses_.push(e);
    }
    candidateNames() {
      return this.nsNames;
    }
    accesses() {
      return this.accesses_;
    }
    access(e, n) {
      return s0(this.factory, e, n, this);
    }
    isPresent(e, n) {
      return i0(this.factory, e, n, this);
    }
    accessIfPresent(e, n, r) {
      return o0(this.factory, e, n, this, r);
    }
    resolve(e) {
      for (let nsName of this.nsNames) {
        let resolved = e.resolve(nsName);
        if (resolved !== void 0) {
          if (yr.isCelError(resolved)) return resolved;
          return WU(e, resolved, this.accesses_);
        }
        let ident = this.findIdent(nsName);
        if (ident !== void 0 && this.accesses_.length === 0) return ident;
      }
      return;
    }
    findIdent(e) {
      let message = this.registry.getMessage(e);
      if (message) return cr.objectType(message);
      if (e.indexOf(".") > 1) {
        let index = e.lastIndexOf("."),
          substring = e.substring(0, index),
          substring_2 = e.substring(index + 1),
          y = this.registry.getEnum(substring);
        if (y) {
          let found = y.values.find((S) => S.name === substring_2);
          if (found) return BigInt(found.number);
        }
      }
      switch (e) {
        case "int":
          return cr.CelScalar.INT;
        case "uint":
          return cr.CelScalar.UINT;
        case "double":
          return cr.CelScalar.DOUBLE;
        case "bool":
          return cr.CelScalar.BOOL;
        case "string":
          return cr.CelScalar.STRING;
        case "bytes":
          return cr.CelScalar.BYTES;
        case "list":
          return cr.listType(cr.CelScalar.DYN);
        case "map":
          return cr.mapType(cr.CelScalar.DYN, cr.CelScalar.DYN);
        case "null_type":
          return cr.CelScalar.NULL;
        case "type":
          return cr.CelScalar.TYPE;
        default:
          return;
      }
    }
  }
  class HU {
    id;
    cond;
    t;
    f;
    factory;
    constructor(e, n, r, s, h) {
      ((this.id = e), (this.cond = n), (this.t = r), (this.f = s), (this.factory = h));
    }
    isOptional() {
      return !1;
    }
    addAccess(e) {
      (this.t.addAccess(e), this.f.addAccess(e));
    }
    access(e, n) {
      return s0(this.factory, e, n, this);
    }
    isPresent(e, n) {
      return i0(this.factory, e, n, this);
    }
    accessIfPresent(e, n, r) {
      return o0(this.factory, e, n, this, r);
    }
    resolve(e) {
      let n = this.cond.eval(e);
      switch (!0) {
        case n === !0:
          return this.t.resolve(e);
        case n === !1:
          return this.f.resolve(e);
        case yr.isCelError(n):
          return n;
      }
      return yr.celError(
        `found no matching overload for _?_:_ applied to '(${cr.celType(n).name})'`,
        this.id,
      );
    }
  }
  class KU {
    id;
    attrs;
    factory;
    constructor(e, n, r) {
      ((this.id = e), (this.attrs = n), (this.factory = r));
    }
    isOptional() {
      return !1;
    }
    addAccess(e) {
      let n = [],
        r;
      if (e instanceof iv) r = e.name;
      for (let attr of this.attrs) {
        if (r !== void 0 && attr.accesses().length === 0)
          for (let h of attr.candidateNames()) n.push(h + "." + r);
        attr.addAccess(e);
      }
      if (n.length > 0) {
        let absolute = this.factory.createAbsolute(this.id, n);
        this.attrs.unshift(absolute);
      }
    }
    access(e, n) {
      return s0(this.factory, e, n, this);
    }
    isPresent(e, n) {
      return i0(this.factory, e, n, this);
    }
    accessIfPresent(e, n, r) {
      return o0(this.factory, e, n, this, r);
    }
    resolve(e) {
      for (let attr of this.attrs) {
        let resolved = attr.resolve(e);
        if (resolved !== void 0) return resolved;
      }
      return;
    }
  }
  class qU {
    id;
    operand;
    accesses_;
    factory;
    constructor(e, n, r, s) {
      ((this.id = e), (this.operand = n), (this.accesses_ = r), (this.factory = s));
    }
    isOptional() {
      return !1;
    }
    addAccess(e) {
      this.accesses_.push(e);
    }
    access(e, n) {
      return s0(this.factory, e, n, this);
    }
    isPresent(e, n) {
      return i0(this.factory, e, n, this);
    }
    accessIfPresent(e, n, r) {
      return o0(this.factory, e, n, this, r);
    }
    resolve(e) {
      let n = this.operand.eval(e);
      if (yr.isCelError(n)) return n;
      return WU(e, n, this.accesses_);
    }
  }
  class iv {
    id;
    name;
    celVal;
    optional;
    constructor(e, n, r, s) {
      ((this.id = e), (this.name = n), (this.celVal = r), (this.optional = s));
    }
    isOptional() {
      return this.optional;
    }
    access(e, n) {
      let accessByName = Mr.accessByName(n, this.name);
      if (accessByName === void 0 && !this.optional) return Td(this.id, this.name);
      return accessByName;
    }
    isPresent(e, n) {
      let isSet = Mr.isSet(n, this.name);
      if (isSet === void 0) return Td(this.id, this.name);
      return isSet;
    }
    accessIfPresent(e, n, r) {
      let accessByName = Mr.accessByName(n, this.name);
      if (accessByName === void 0 && !this.optional && !r) return Td(this.id, this.name);
      return accessByName;
    }
  }
  class jU {
    id;
    index;
    optional;
    constructor(e, n, r) {
      ((this.id = e), (this.index = n), (this.optional = r));
    }
    isOptional() {
      return this.optional;
    }
    access(e, n) {
      if (n === void 0) return n;
      let accessByIndex = Mr.accessByIndex(n, this.index);
      if (accessByIndex === void 0 && !this.optional) return Td(this.id, this.index);
      return accessByIndex;
    }
    isPresent(e, n) {
      if (Mr.accessByIndex(n, this.index) === void 0 && !this.optional) return Td(this.id, this.index);
      return !0;
    }
    accessIfPresent(e, n, r) {
      let accessByIndex = Mr.accessByIndex(n, this.index);
      if (accessByIndex === void 0 && !this.optional) return Td(this.id, this.index);
      return accessByIndex;
    }
  }
  class YU {
    id;
    index;
    celVal;
    optional;
    constructor(e, n, r, s) {
      ((this.id = e), (this.index = n), (this.celVal = r), (this.optional = s));
    }
    isOptional() {
      return this.optional;
    }
    access(e, n) {
      if (n === void 0) return n;
      let accessByIndex = Mr.accessByIndex(n, this.index);
      if (accessByIndex === void 0 && !this.optional) return Cd(this.id, this.index, -1);
      return accessByIndex;
    }
    isPresent(e, n) {
      if (Mr.accessByIndex(n, this.index) === void 0 && !this.optional) return Cd(this.id, this.index, -1);
      return !0;
    }
    accessIfPresent(e, n, r) {
      let accessByIndex = Mr.accessByIndex(n, this.index);
      if (accessByIndex === void 0 && !this.optional) return Cd(this.id, this.index, -1);
      return accessByIndex;
    }
  }
  class sv {
    id;
    index;
    celVal;
    optional;
    constructor(e, n, r, s) {
      ((this.id = e), (this.index = n), (this.celVal = r), (this.optional = s));
    }
    access(e, n) {
      if (n === void 0) return n;
      let accessByIndex = Mr.accessByIndex(n, this.index);
      if (accessByIndex === void 0 && !this.optional) return Cd(this.id, Number(this.index), -1);
      return accessByIndex;
    }
    isPresent(e, n) {
      if (Mr.accessByIndex(n, this.index) === void 0 && !this.optional)
        return Cd(this.id, Number(this.index), -1);
      return !0;
    }
    accessIfPresent(e, n, r) {
      let accessByIndex = Mr.accessByIndex(n, this.index);
      if (accessByIndex === void 0 && !this.optional) return Cd(this.id, Number(this.index), -1);
      return accessByIndex;
    }
    isOptional() {
      return this.optional;
    }
  }
  class ov {
    id;
    error;
    opt;
    constructor(e, n, r) {
      ((this.id = e), (this.error = n), (this.opt = r));
    }
    addAccess(e) {}
    resolve(e) {
      return this.error;
    }
    isOptional() {
      return this.opt;
    }
    access(e, n) {
      return this.error;
    }
    isPresent(e, n) {
      return this.error;
    }
    accessIfPresent(e, n, r) {
      return this.error;
    }
  }
  XU.ErrorAttr = ov;
  class ZU {
    id;
    key;
    factory;
    optional;
    constructor(e, n, r, s) {
      ((this.id = e), (this.key = n), (this.factory = r), (this.optional = s));
    }
    access(e, n) {
      if (n === void 0) return n;
      let r = this.key.eval(e);
      if (yr.isCelError(r)) return r;
      return this.factory.newAccess(this.id, r, this.optional).access(e, n);
    }
    isPresent(e, n) {
      if (n === void 0) return !1;
      let r = this.key.eval(e);
      if (yr.isCelError(r)) return r;
      return this.factory.newAccess(this.id, r, this.optional).isPresent(e, n);
    }
    accessIfPresent(e, n, r) {
      let s = this.key.eval(e);
      if (yr.isCelError(s)) return s;
      return this.factory.newAccess(this.id, s, this.optional).accessIfPresent(e, n, r);
    }
    isOptional() {
      return this.optional;
    }
  }
  class zU {
    registry;
    container;
    constructor(e, n) {
      ((this.registry = e), (this.container = n));
    }
    createAbsolute(e, n) {
      return new GU(e, n, [], this.registry, this);
    }
    createConditional(e, n, r, s) {
      return new HU(e, n, r, s, this);
    }
    createMaybe(e, n) {
      return new KU(e, [this.createAbsolute(e, this.container.resolveCandidateNames(n))], this);
    }
    createRelative(e, n) {
      return new qU(e, n, [], this);
    }
    newAccess(e, n, r) {
      switch (typeof n) {
        case "boolean":
          return new jU(e, n, r);
        case "number":
          return new YU(e, n, n, r);
        case "bigint":
          return new sv(e, n, n, r);
        case "string":
          return new iv(e, n, n, r);
        case "object":
          if (n instanceof $U.EvalAttr) return new ZU(e, n, this, r);
          if (VU.isCelUint(n)) return new sv(e, n.value, n, r);
          break;
        default:
          break;
      }
      return new ov(e, yr.celError("unsupported key type", e), r);
    }
  }
  XU.ConcreteAttributeFactory = zU;
  function Td(e, n) {
    return yr.celError(`field not found: ${String(n)}`, e);
  }
  function Cd(e, n, r) {
    return yr.celError(`index ${n} out of bounds [0, ${r})`, e);
  }
});

export { QU };

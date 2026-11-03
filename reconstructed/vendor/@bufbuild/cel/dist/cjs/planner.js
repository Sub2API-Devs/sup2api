/**
 * @bufbuild/cel/dist/cjs/planner.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { QU } from "./access.js";
import { lv } from "./activation.js";
import { Ny } from "./gen/dev/cel/expr/operator_const.js";
import { D_ } from "./namespace.js";
import { bl } from "./error.js";
import { $o } from "./list.js";
import { Aa } from "./map.js";
import { Bi } from "./uint.js";
import { fF } from "./object.js";
import { Ei } from "./type.js";

//@ chunk-fq0cr76a.js:617423-628168 cjs-fingerprint
var av = x(function (TF) {
  Object.defineProperty(TF, "__esModule", { value: !0 });
  TF.EvalAttr = TF.Planner = void 0;
  var l0 = QU(),
    u0 = lv(),
    Fs = Ny(),
    pF = D_(),
    Ut = bl(),
    kd = $o(),
    Dd = Aa(),
    d0 = Bi(),
    hF = fF(),
    Zo = Ei();
  class mF {
    functions;
    registry;
    namespace;
    factory;
    constructor(e, n, r = pF.Namespace.ROOT) {
      ((this.functions = e),
        (this.registry = n),
        (this.namespace = r),
        (this.factory = new l0.ConcreteAttributeFactory(this.registry, this.namespace)));
    }
    plan(e) {
      let n = Number(e.id);
      switch (e.exprKind.case) {
        case "identExpr":
          return new Rc(this.factory.createMaybe(n, e.exprKind.value.name), !1);
        case "constExpr":
          return new hv(n, this.constVal(e.exprKind.value));
        case "callExpr":
          return this.planCall(n, e.exprKind.value);
        case "listExpr":
          return this.planCreateList(n, e.exprKind.value);
        case "structExpr":
          return this.planCreateStruct(n, e.exprKind.value);
        case "selectExpr":
          return this.planSelect(n, e.exprKind.value);
        case "comprehensionExpr":
          return this.planComprehension(n, e.exprKind.value);
        default:
          return new a0(n, "invalid expression");
      }
    }
    planComprehension(e, n) {
      if (
        n.accuInit === void 0 ||
        n.iterRange === void 0 ||
        n.loopCondition === void 0 ||
        n.loopStep === void 0 ||
        n.result === void 0
      )
        throw Error("invalid comprehension");
      let plan = this.plan(n.accuInit),
        plan_2 = this.plan(n.iterRange),
        plan_3 = this.plan(n.loopCondition),
        plan_4 = this.plan(n.loopStep),
        plan_5 = this.plan(n.result);
      return new EF(e, n.accuVar, n.iterVar, plan_2, plan, plan_3, plan_4, plan_5);
    }
    planSelect(e, n) {
      if (n.operand === void 0) throw Error("invalid select");
      let plan = this.plan(n.operand),
        relativeAttr = this.relativeAttr(e, plan, !1),
        newAccess = this.factory.newAccess(e, n.field, !1);
      if (newAccess instanceof l0.ErrorAttr) throw Error(`invalid select: ${newAccess.error.message}`);
      if (n.testOnly) return new gF(e, relativeAttr, newAccess, n.field);
      return (relativeAttr.addAccess(newAccess), relativeAttr);
    }
    planCreateObj(e, n) {
      let r = this.resolveType(n.messageName);
      if (r === void 0) return new a0(e, "unknown type: " + n.messageName);
      let s = void 0,
        h = [],
        y = [];
      for (let b = 0; b < n.entries.length; b++) {
        let S = n.entries[b];
        if (S.optionalEntry) {
          if (s === void 0) s = Array(n.entries.length).fill(!1);
          s[b] = !0;
        }
        switch (S.keyKind.case) {
          case "fieldKey":
            h.push(S.keyKind.value);
            break;
          case "mapKey":
            throw Error("invalid entry");
          default:
            break;
        }
        if (S.value === void 0) throw Error("invalid entry");
        y.push(this.plan(S.value));
      }
      return new yF(e, r, h, y, s);
    }
    planCreateStruct(e, n) {
      if (n.messageName !== "") return this.planCreateObj(e, n);
      let r = void 0,
        s = [],
        h = [];
      for (let y = 0; y < n.entries.length; y++) {
        let b = n.entries[y];
        if (b.optionalEntry) {
          if (r === void 0) r = Array(n.entries.length).fill(!1);
          r[y] = !0;
        }
        switch (b.keyKind.case) {
          case "fieldKey":
            throw Error("unimplemented");
          case "mapKey":
            s.push(this.plan(b.keyKind.value));
            break;
          default:
            break;
        }
        if (b.value === void 0) return new a0(e, "map entry missing value");
        h.push(this.plan(b.value));
      }
      return new SF(e, s, h, r);
    }
    planCreateList(e, n) {
      if (n.optionalIndices.length > 0) {
        let fill = Array(n.elements.length).fill(!1);
        for (let h = 0; h < n.optionalIndices.length; h++) {
          let y = n.optionalIndices[h];
          if (y < 0 || y >= n.elements.length) throw Error("invalid optional index");
          fill[y] = !0;
        }
      }
      return new bF(
        e,
        n.elements.map((element) => this.plan(element)),
        void 0,
      );
    }
    planCall(e, n) {
      if (n.target !== void 0) {
        let s = wF(n.target);
        if (s !== void 0) {
          let h = s + "." + n.function;
          for (let y of this.namespace.resolveCandidateNames(h)) {
            let found = this.functions.find(y);
            if (found !== void 0)
              return new mv(
                e,
                y,
                "",
                void 0,
                found,
                n.args.map((arg) => this.plan(arg)),
              );
          }
        }
      }
      let mapped = n.args.map((arg) => this.plan(arg));
      if (n.target) mapped = [this.plan(n.target), ...mapped];
      switch (n.function) {
        case Fs.INDEX:
          return this.planCallIndex(n, mapped, !1);
        case Fs.OPT_INDEX:
        case Fs.OPT_SELECT:
          return this.planCallIndex(n, mapped, !0);
        case Fs.CONDITIONAL:
          return this.planCallConditional(e, n, mapped);
        case Fs.LOGICAL_AND:
          return new xF(e, mapped);
        case Fs.LOGICAL_OR:
          return new _F(e, mapped);
        case Fs.NOT_STRICTLY_FALSE:
        case Fs.OLD_NOT_STRICTLY_FALSE:
          return new vF(e, mapped[0]);
        default:
          return new mv(
            e,
            n.function,
            "",
            n.target ? mapped[0] : void 0,
            this.functions.find(n.function),
            n.target ? mapped.slice(1) : mapped,
          );
      }
    }
    planCallConditional(e, n, r) {
      let s = r[0],
        h = r[1],
        y = r[2],
        relativeAttr = this.relativeAttr(h.id, h, !1),
        relativeAttr_2 = this.relativeAttr(y.id, y, !1);
      return new Rc(this.factory.createConditional(e, s, relativeAttr, relativeAttr_2), !1);
    }
    planCallIndex(e, n, r) {
      let s = n[0],
        h = n[1],
        relativeAttr = this.relativeAttr(s.id, s, !1),
        b;
      if (h instanceof hv) b = this.factory.newAccess(s.id, h.value, r);
      else if (h instanceof Rc) b = this.factory.newAccess(s.id, h, r);
      else b = this.relativeAttr(s.id, h, r);
      return (relativeAttr.addAccess(b), relativeAttr);
    }
    constVal(e) {
      switch (e.constantKind.case) {
        case "stringValue":
          return e.constantKind.value;
        case "bytesValue":
          return e.constantKind.value;
        case "doubleValue":
          return e.constantKind.value;
        case "boolValue":
          return e.constantKind.value;
        case "int64Value":
          return e.constantKind.value;
        case "uint64Value":
          return d0.celUint(e.constantKind.value);
        case "nullValue":
          return null;
        case void 0:
          throw Error("invalid constant");
        default:
          throw Error(`unimplemented: ${e.constantKind.case}`);
      }
    }
    relativeAttr(e, n, r) {
      if (n instanceof Rc) return n;
      return new Rc(this.factory.createRelative(e, n), r);
    }
    resolveType(e) {
      for (let n of this.namespace.resolveCandidateNames(e)) if (this.isKnownType(n)) return n;
      return;
    }
    isKnownType(e) {
      switch (e) {
        case "google.protobuf.Value":
        case "google.protobuf.Struct":
        case "google.protobuf.ListValue":
        case "google.protobuf.NullValue":
        case "google.protobuf.BoolValue":
        case "google.protobuf.UInt32Value":
        case "google.protobuf.UInt64Value":
        case "google.protobuf.Int32Value":
        case "google.protobuf.Int64Value":
        case "google.protobuf.FloatValue":
        case "google.protobuf.DoubleValue":
        case "google.protobuf.StringValue":
        case "google.protobuf.BytesValue":
        case "google.protobuf.Timestamp":
        case "google.protobuf.Duration":
        case "google.protobuf.Any":
          return !0;
        default:
          return this.registry.getMessage(e) !== void 0;
      }
    }
  }
  TF.Planner = mF;
  class gF {
    id;
    attr;
    access;
    field;
    constructor(e, n, r, s) {
      ((this.id = e), (this.attr = n), (this.access = r), (this.field = s));
    }
    eval(e) {
      let resolved = this.attr.resolve(e);
      if (resolved === void 0) return !1;
      if (Ut.isCelError(resolved)) return resolved;
      return this.access.isPresent(e, resolved);
    }
  }
  class a0 {
    id;
    msg;
    constructor(e, n) {
      ((this.id = e), (this.msg = n));
    }
    eval(e) {
      return Ut.celError(this.msg, this.id);
    }
  }
  class hv {
    id;
    value;
    constructor(e, n) {
      ((this.id = e), (this.value = n));
    }
    eval(e) {
      return this.value;
    }
  }
  class Rc {
    attr;
    opt;
    id;
    constructor(e, n) {
      ((this.attr = e), (this.opt = n), (this.id = e.id));
    }
    access(e, n) {
      return this.attr.access(e, n);
    }
    isPresent(e, n) {
      return this.attr.isPresent(e, n);
    }
    accessIfPresent(e, n, r) {
      return this.attr.accessIfPresent(e, n, r);
    }
    isOptional() {
      return this.opt;
    }
    eval(e) {
      let resolved = this.attr.resolve(e);
      if (resolved === void 0) return Ut.celError("unresolved attribute", this.id);
      if (Ut.isCelError(resolved)) return resolved;
      return resolved;
    }
    resolve(e) {
      return this.attr.resolve(e);
    }
    addAccess(e) {
      this.attr.addAccess(e);
    }
  }
  TF.EvalAttr = Rc;
  class mv {
    id;
    name;
    overload;
    target;
    func;
    args;
    constructor(e, n, r, s, h, y) {
      ((this.id = e),
        (this.name = n),
        (this.overload = r),
        (this.target = s),
        (this.func = h),
        (this.args = y));
    }
    eval(e) {
      if (this.func === void 0) return Ut.celError(`unbound function: ${this.name}`, this.id);
      let n = this.target?.eval(e);
      if (Ut.isCelError(n)) return n;
      let r = [];
      for (let arg of this.args) {
        let y = arg.eval(e);
        if (Ut.isCelError(y)) return y;
        r.push(y);
      }
      let s = this.func.call(this.id, n, r);
      if (s !== void 0) return s;
      return Ut.celError(
        `found no matching overload for '${this.name}' applied to '${n !== void 0 ? `${Zo.celType(n)}.` : ""}(${r
          .map((h) => Zo.celType(h))
          .map((h) => h.name)
          .join(", ")})'`,
        this.id,
      );
    }
  }
  class yF {
    id;
    typeName;
    fields;
    values;
    optionals;
    constructor(e, n, r, s, h) {
      ((this.id = e), (this.typeName = n), (this.fields = r), (this.values = s), (this.optionals = h));
    }
    args() {
      return this.values;
    }
    eval(e) {
      let n = dae(this.values.map((s) => s.eval(e)));
      if (Ut.isCelError(n)) return n;
      let r = new Map();
      for (let s = 0; s < n.length; s++) {
        if (r.has(this.fields[s])) return Ut.celError(`map key conflict: ${this.fields[s]}`, this.id);
        r.set(this.fields[s], n[s]);
      }
      try {
        return hF.celObject(this.typeName, r);
      } catch (error) {
        if (error instanceof Error) error = error.message;
        return Ut.celError(`${error}`, this.id);
      }
    }
  }
  class bF {
    id;
    elems;
    constructor(e, n, r) {
      ((this.id = e), (this.elems = n));
    }
    eval(e) {
      if (this.elems.length === 0) return kd.EMPTY_LIST;
      let n = this.elems[0].eval(e);
      if (Ut.isCelError(n)) return n;
      let r = [n];
      for (let s = 1; s < this.elems.length; s++) {
        let h = this.elems[s].eval(e);
        if (Ut.isCelError(h)) return h;
        r.push(h);
      }
      return kd.celList(r);
    }
    args() {
      return this.elems;
    }
  }
  class SF {
    id;
    keys;
    values;
    constructor(e, n, r, s) {
      ((this.id = e), (this.keys = n), (this.values = r));
    }
    args() {
      return this.keys.concat(this.values);
    }
    eval(e) {
      if (this.keys.length === 0) return Dd.EMPTY_MAP;
      let n = new Map(),
        mapKeyOrError = this.mapKeyOrError(this.keys[0].eval(e));
      if (Ut.isCelError(mapKeyOrError)) return mapKeyOrError;
      let s = this.values[0].eval(e);
      if (Ut.isCelError(s)) return s;
      if (typeof mapKeyOrError === "number" && !Number.isInteger(mapKeyOrError)) return Rp(this.id);
      n.set(mapKeyOrError, s);
      for (let h = 1; h < this.keys.length; h++) {
        let mapKeyOrError = this.mapKeyOrError(this.keys[h].eval(e));
        if (Ut.isCelError(mapKeyOrError)) return mapKeyOrError;
        let b = this.values[h].eval(e);
        if (Ut.isCelError(b)) return b;
        if (n.has(mapKeyOrError)) return Ut.celError(`map key conflict: ${mapKeyOrError}`, this.id);
        if (typeof mapKeyOrError === "number" && !Number.isInteger(mapKeyOrError)) return Rp(this.id);
        n.set(mapKeyOrError, b);
      }
      return Dd.celMap(n);
    }
    mapKeyOrError(e) {
      switch (typeof e) {
        case "boolean":
        case "bigint":
        case "string":
          return e;
        case "object":
          if (d0.isCelUint(e)) return e;
          return Rp(this.id);
        case "number":
          if (Number.isInteger(e)) return BigInt(e);
          return Rp(this.id);
        default:
          return Rp(this.id);
      }
    }
  }
  class EF {
    id;
    accuVar;
    iterVar;
    iterRange;
    accu;
    cond;
    step;
    result;
    constructor(e, n, r, s, h, y, b, S) {
      ((this.id = e),
        (this.accuVar = n),
        (this.iterVar = r),
        (this.iterRange = s),
        (this.accu = h),
        (this.cond = y),
        (this.step = b),
        (this.result = S));
    }
    eval(e) {
      let n = this.accu.eval(e);
      if (Ut.isCelError(n)) return n;
      let r = new u0.VarActivation(this.accuVar, n, e),
        s = this.iterRange.eval(e);
      if (Ut.isCelError(s)) return s;
      let h = [];
      if (Dd.isCelMap(s)) h = Array.from(s.keys());
      else if (kd.isCelList(s)) h = Array.from(s);
      else return Ut.celError(`type mismatch: iterable vs ${Zo.celType(s)}`, this.id);
      for (let y of h) {
        if (Ut.isCelError(y)) return y;
        let b = new u0.VarActivation(this.iterVar, y, r),
          S = this.cond.eval(b);
        if (Ut.isCelError(S)) return S;
        if (S !== !0) break;
        r.value = this.step.eval(b);
      }
      return this.result.eval(r);
    }
  }
  class xF {
    id;
    args;
    constructor(e, n) {
      ((this.id = e), (this.args = n));
    }
    eval(e) {
      let n = [];
      for (let arg of this.args) {
        let s = arg.eval(e);
        if (typeof s === "boolean") {
          if (!s) return !1;
          continue;
        }
        if (Ut.isCelError(s)) n.push(s);
        else n.push(Ut.celError(`type mismatch: expected bool, got ${Zo.celType(s)}`, this.id));
      }
      if (n.length > 0) return Ut.celErrorMerge(n[0], ...n.slice(1));
      return !0;
    }
  }
  class _F {
    id;
    args;
    constructor(e, n) {
      ((this.id = e), (this.args = n));
    }
    eval(e) {
      let n = [];
      for (let arg of this.args) {
        let s = arg.eval(e);
        if (typeof s === "boolean") {
          if (s) return !0;
          continue;
        }
        if (Ut.isCelError(s)) n.push(s);
        else n.push(Ut.celError(`type mismatch: expected bool, got ${Zo.celType(s)}`, this.id));
      }
      if (n.length > 0) return Ut.celErrorMerge(n[0], ...n.slice(1));
      return !1;
    }
  }
  class vF {
    id;
    arg;
    constructor(e, n) {
      ((this.id = e), (this.arg = n));
    }
    eval(e) {
      return this.arg.eval(e) !== !1;
    }
  }
  function wF(e) {
    switch (e.exprKind.case) {
      case "identExpr":
        return e.exprKind.value.name;
      case "selectExpr": {
        if (e.exprKind.value.testOnly || e.exprKind.value.operand === void 0) return;
        let n = wF(e.exprKind.value.operand);
        if (n === void 0) return;
        return n + "." + e.exprKind.value.field;
      }
      default:
        return;
    }
  }
  function Rp(e) {
    return Ut.celError("unsupported key type", e);
  }
  function dae(e) {
    let n = [];
    for (let r = 0; r < e.length; r++) {
      let s = e[r];
      if (Ut.isCelError(s)) n.push(s);
    }
    if (n.length > 0) return Ut.celErrorMerge(n[0], ...n.slice(1));
    return e;
  }
});

export { av };

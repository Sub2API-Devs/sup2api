/**
 * @bufbuild/cel/dist/cjs/planner.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { require_access } from "./access.js";
import { require_activation } from "./activation.js";
import { require_operator_const } from "./gen/dev/cel/expr/operator_const.js";
import { require_namespace } from "./namespace.js";
import { require_error } from "./error.js";
import { require_list } from "./list.js";
import { require_map } from "./map.js";
import { require_uint } from "./uint.js";
import { require_object } from "./object.js";
import { require_type } from "./type.js";

//@ chunk-fq0cr76a.js:617423-628168 cjs-fingerprint
var require_planner = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.EvalAttr = cjsExports.Planner = undefined;
  var access_js_1 = require_access();
  var activation_js_1 = require_activation();
  var opc = require_operator_const();
  var namespace_js_1 = require_namespace();
  var error_js_1 = require_error();
  var list_js_1 = require_list();
  var map_js_1 = require_map();
  var uint_js_1 = require_uint();
  var object_js_1 = require_object();
  var type_js_1 = require_type();
  class Planner {
    functions;
    registry;
    namespace;
    factory;
    constructor(functions, registry, namespace = namespace_js_1.Namespace.ROOT) {
      this.functions = functions;
      this.registry = registry;
      this.namespace = namespace;
      this.factory = new access_js_1.ConcreteAttributeFactory(this.registry, this.namespace);
    }
    plan(expr) {
      let id = Number(expr.id);
      switch (expr.exprKind.case) {
        case "identExpr":
          return new EvalAttr(this.factory.createMaybe(id, expr.exprKind.value.name), false);
        case "constExpr":
          return new EvalConst(id, this.constVal(expr.exprKind.value));
        case "callExpr":
          return this.planCall(id, expr.exprKind.value);
        case "listExpr":
          return this.planCreateList(id, expr.exprKind.value);
        case "structExpr":
          return this.planCreateStruct(id, expr.exprKind.value);
        case "selectExpr":
          return this.planSelect(id, expr.exprKind.value);
        case "comprehensionExpr":
          return this.planComprehension(id, expr.exprKind.value);
        default:
          return new EvalErr(id, "invalid expression");
      }
    }
    planComprehension(id, value) {
      if (
        value.accuInit === undefined ||
        value.iterRange === undefined ||
        value.loopCondition === undefined ||
        value.loopStep === undefined ||
        value.result === undefined
      )
        throw Error("invalid comprehension");
      let accu = this.plan(value.accuInit);
      let iterRange = this.plan(value.iterRange);
      let cond = this.plan(value.loopCondition);
      let step = this.plan(value.loopStep);
      let result = this.plan(value.result);
      return new EvalFold(id, value.accuVar, value.iterVar, iterRange, accu, cond, step, result);
    }
    planSelect(id, expr) {
      if (expr.operand === undefined) throw Error("invalid select");
      let operand = this.plan(expr.operand);
      let attr = this.relativeAttr(id, operand, false);
      let acc = this.factory.newAccess(id, expr.field, false);
      if (acc instanceof access_js_1.ErrorAttr) throw Error(`invalid select: ${acc.error.message}`);
      if (expr.testOnly) return new EvalHas(id, attr, acc, expr.field);
      attr.addAccess(acc);
      return attr;
    }
    planCreateObj(id, expr) {
      let typeName = this.resolveType(expr.messageName);
      if (typeName === undefined) return new EvalErr(id, "unknown type: " + expr.messageName);
      let optionals = undefined;
      let keys = [];
      let values = [];
      for (let i = 0; i < expr.entries.length; i++) {
        let entry = expr.entries[i];
        if (entry.optionalEntry) {
          if (optionals === undefined) optionals = Array(expr.entries.length).fill(false);
          optionals[i] = true;
        }
        switch (entry.keyKind.case) {
          case "fieldKey":
            keys.push(entry.keyKind.value);
            break;
          case "mapKey":
            throw Error("invalid entry");
          default:
            break;
        }
        if (entry.value === undefined) throw Error("invalid entry");
        values.push(this.plan(entry.value));
      }
      return new EvalObj(id, typeName, keys, values, optionals);
    }
    planCreateStruct(id, expr) {
      if (expr.messageName !== "") return this.planCreateObj(id, expr);
      let optionals = undefined;
      let keys = [];
      let values = [];
      for (let i = 0; i < expr.entries.length; i++) {
        let entry = expr.entries[i];
        if (entry.optionalEntry) {
          if (optionals === undefined) optionals = Array(expr.entries.length).fill(false);
          optionals[i] = true;
        }
        switch (entry.keyKind.case) {
          case "fieldKey":
            throw Error("unimplemented");
          case "mapKey":
            keys.push(this.plan(entry.keyKind.value));
            break;
          default:
            break;
        }
        if (entry.value === undefined) return new EvalErr(id, "map entry missing value");
        values.push(this.plan(entry.value));
      }
      return new EvalMap(id, keys, values, optionals);
    }
    planCreateList(id, expr) {
      if (expr.optionalIndices.length > 0) {
        let optionals = Array(expr.elements.length).fill(false);
        for (let i = 0; i < expr.optionalIndices.length; i++) {
          let index = expr.optionalIndices[i];
          if (index < 0 || index >= expr.elements.length) throw Error("invalid optional index");
          optionals[index] = true;
        }
      }
      return new EvalList(
        id,
        expr.elements.map((arg) => this.plan(arg)),
        undefined,
      );
    }
    planCall(id, call) {
      if (call.target !== undefined) {
        let qualName = toQualifiedName(call.target);
        if (qualName !== undefined) {
          let funcName = qualName + "." + call.function;
          for (let candidate of this.namespace.resolveCandidateNames(funcName)) {
            let func = this.functions.find(candidate);
            if (func !== undefined)
              return new EvalCall(
                id,
                candidate,
                "",
                undefined,
                func,
                call.args.map((arg) => this.plan(arg)),
              );
          }
        }
      }
      let args = call.args.map((arg) => this.plan(arg));
      if (call.target) args = [this.plan(call.target), ...args];
      switch (call.function) {
        case opc.INDEX:
          return this.planCallIndex(call, args, false);
        case opc.OPT_INDEX:
        case opc.OPT_SELECT:
          return this.planCallIndex(call, args, true);
        case opc.CONDITIONAL:
          return this.planCallConditional(id, call, args);
        case opc.LOGICAL_AND:
          return new EvalAnd(id, args);
        case opc.LOGICAL_OR:
          return new EvalOr(id, args);
        case opc.NOT_STRICTLY_FALSE:
        case opc.OLD_NOT_STRICTLY_FALSE:
          return new EvalNotStrictlyFalse(id, args[0]);
        default:
          return new EvalCall(
            id,
            call.function,
            "",
            call.target ? args[0] : undefined,
            this.functions.find(call.function),
            call.target ? args.slice(1) : args,
          );
      }
    }
    planCallConditional(id, _call, args) {
      let cond = args[0];
      let t = args[1];
      let f = args[2];
      let tAttr = this.relativeAttr(t.id, t, false);
      let fAttr = this.relativeAttr(f.id, f, false);
      return new EvalAttr(this.factory.createConditional(id, cond, tAttr, fAttr), false);
    }
    planCallIndex(_call, args, opt) {
      let op = args[0];
      let ind = args[1];
      let attr = this.relativeAttr(op.id, op, false);
      let acc;
      if (ind instanceof EvalConst) acc = this.factory.newAccess(op.id, ind.value, opt);
      else if (ind instanceof EvalAttr) acc = this.factory.newAccess(op.id, ind, opt);
      else acc = this.relativeAttr(op.id, ind, opt);
      attr.addAccess(acc);
      return attr;
    }
    constVal(val) {
      switch (val.constantKind.case) {
        case "stringValue":
          return val.constantKind.value;
        case "bytesValue":
          return val.constantKind.value;
        case "doubleValue":
          return val.constantKind.value;
        case "boolValue":
          return val.constantKind.value;
        case "int64Value":
          return val.constantKind.value;
        case "uint64Value":
          return uint_js_1.celUint(val.constantKind.value);
        case "nullValue":
          return null;
        case undefined:
          throw Error("invalid constant");
        default:
          throw Error(`unimplemented: ${val.constantKind.case}`);
      }
    }
    relativeAttr(id, e, opt) {
      if (e instanceof EvalAttr) return e;
      return new EvalAttr(this.factory.createRelative(id, e), opt);
    }
    resolveType(name) {
      for (let candidate of this.namespace.resolveCandidateNames(name))
        if (this.isKnownType(candidate)) return candidate;
      return;
    }
    isKnownType(name) {
      switch (name) {
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
          return true;
        default:
          return this.registry.getMessage(name) !== undefined;
      }
    }
  }
  cjsExports.Planner = Planner;
  class EvalHas {
    id;
    attr;
    access;
    field;
    constructor(id, attr, access, field) {
      this.id = id;
      this.attr = attr;
      this.access = access;
      this.field = field;
    }
    eval(ctx) {
      let raw = this.attr.resolve(ctx);
      if (raw === undefined) return false;
      if (error_js_1.isCelError(raw)) return raw;
      return this.access.isPresent(ctx, raw);
    }
  }
  class EvalErr {
    id;
    msg;
    constructor(id, msg) {
      this.id = id;
      this.msg = msg;
    }
    eval(_ctx) {
      return error_js_1.celError(this.msg, this.id);
    }
  }
  class EvalConst {
    id;
    value;
    constructor(id, value) {
      this.id = id;
      this.value = value;
    }
    eval(_ctx) {
      return this.value;
    }
  }
  class EvalAttr {
    attr;
    opt;
    id;
    constructor(attr, opt) {
      this.attr = attr;
      this.opt = opt;
      this.id = attr.id;
    }
    access(vars, obj) {
      return this.attr.access(vars, obj);
    }
    isPresent(vars, obj) {
      return this.attr.isPresent(vars, obj);
    }
    accessIfPresent(vars, obj, presenceOnly) {
      return this.attr.accessIfPresent(vars, obj, presenceOnly);
    }
    isOptional() {
      return this.opt;
    }
    eval(ctx) {
      let val = this.attr.resolve(ctx);
      if (val === undefined) return error_js_1.celError("unresolved attribute", this.id);
      if (error_js_1.isCelError(val)) return val;
      return val;
    }
    resolve(vars) {
      return this.attr.resolve(vars);
    }
    addAccess(acc) {
      this.attr.addAccess(acc);
    }
  }
  cjsExports.EvalAttr = EvalAttr;
  class EvalCall {
    id;
    name;
    overload;
    target;
    func;
    args;
    constructor(id, name, overload, target, func, args) {
      this.id = id;
      this.name = name;
      this.overload = overload;
      this.target = target;
      this.func = func;
      this.args = args;
    }
    eval(ctx) {
      if (this.func === undefined) return error_js_1.celError(`unbound function: ${this.name}`, this.id);
      let target = this.target?.eval(ctx);
      if (error_js_1.isCelError(target)) return target;
      let vals = [];
      for (let arg of this.args) {
        let val = arg.eval(ctx);
        if (error_js_1.isCelError(val)) return val;
        vals.push(val);
      }
      let result = this.func.call(this.id, target, vals);
      if (result !== undefined) return result;
      return error_js_1.celError(
        `found no matching overload for '${this.name}' applied to '${target !== undefined ? `${type_js_1.celType(target)}.` : ""}(${vals
          .map((x) => type_js_1.celType(x))
          .map((x) => x.name)
          .join(", ")})'`,
        this.id,
      );
    }
  }
  class EvalObj {
    id;
    typeName;
    fields;
    values;
    optionals;
    constructor(id, typeName, fields, values, optionals) {
      this.id = id;
      this.typeName = typeName;
      this.fields = fields;
      this.values = values;
      this.optionals = optionals;
    }
    args() {
      return this.values;
    }
    eval(ctx) {
      let vals = coerceToValues(this.values.map((x) => x.eval(ctx)));
      if (error_js_1.isCelError(vals)) return vals;
      let obj = new Map();
      for (let i = 0; i < vals.length; i++) {
        if (obj.has(this.fields[i]))
          return error_js_1.celError(`map key conflict: ${this.fields[i]}`, this.id);
        obj.set(this.fields[i], vals[i]);
      }
      try {
        return object_js_1.celObject(this.typeName, obj);
      } catch (ex) {
        if (ex instanceof Error) ex = ex.message;
        return error_js_1.celError(`${ex}`, this.id);
      }
    }
  }
  class EvalList {
    id;
    elems;
    constructor(id, elems, _) {
      this.id = id;
      this.elems = elems;
    }
    eval(ctx) {
      if (this.elems.length === 0) return list_js_1.EMPTY_LIST;
      let first = this.elems[0].eval(ctx);
      if (error_js_1.isCelError(first)) return first;
      let elemVals = [first];
      for (let i = 1; i < this.elems.length; i++) {
        let elemVal = this.elems[i].eval(ctx);
        if (error_js_1.isCelError(elemVal)) return elemVal;
        elemVals.push(elemVal);
      }
      return list_js_1.celList(elemVals);
    }
    args() {
      return this.elems;
    }
  }
  class EvalMap {
    id;
    keys;
    values;
    constructor(id, keys, values, _) {
      this.id = id;
      this.keys = keys;
      this.values = values;
    }
    args() {
      return this.keys.concat(this.values);
    }
    eval(ctx) {
      if (this.keys.length === 0) return map_js_1.EMPTY_MAP;
      let entries = new Map();
      let firstKey = this.mapKeyOrError(this.keys[0].eval(ctx));
      if (error_js_1.isCelError(firstKey)) return firstKey;
      let firstVal = this.values[0].eval(ctx);
      if (error_js_1.isCelError(firstVal)) return firstVal;
      if (typeof firstKey === "number" && !Number.isInteger(firstKey)) return unsupportedKeyType(this.id);
      entries.set(firstKey, firstVal);
      for (let i = 1; i < this.keys.length; i++) {
        let key = this.mapKeyOrError(this.keys[i].eval(ctx));
        if (error_js_1.isCelError(key)) return key;
        let val = this.values[i].eval(ctx);
        if (error_js_1.isCelError(val)) return val;
        if (entries.has(key)) return error_js_1.celError(`map key conflict: ${key}`, this.id);
        if (typeof key === "number" && !Number.isInteger(key)) return unsupportedKeyType(this.id);
        entries.set(key, val);
      }
      return map_js_1.celMap(entries);
    }
    mapKeyOrError(key) {
      switch (typeof key) {
        case "boolean":
        case "bigint":
        case "string":
          return key;
        case "object":
          if (uint_js_1.isCelUint(key)) return key;
          return unsupportedKeyType(this.id);
        case "number":
          if (Number.isInteger(key)) return BigInt(key);
          return unsupportedKeyType(this.id);
        default:
          return unsupportedKeyType(this.id);
      }
    }
  }
  class EvalFold {
    id;
    accuVar;
    iterVar;
    iterRange;
    accu;
    cond;
    step;
    result;
    constructor(id, accuVar, iterVar, iterRange, accu, cond, step, result) {
      this.id = id;
      this.accuVar = accuVar;
      this.iterVar = iterVar;
      this.iterRange = iterRange;
      this.accu = accu;
      this.cond = cond;
      this.step = step;
      this.result = result;
    }
    eval(ctx) {
      let accuInit = this.accu.eval(ctx);
      if (error_js_1.isCelError(accuInit)) return accuInit;
      let accuCtx = new activation_js_1.VarActivation(this.accuVar, accuInit, ctx);
      let iterRange = this.iterRange.eval(ctx);
      if (error_js_1.isCelError(iterRange)) return iterRange;
      let items = [];
      if (map_js_1.isCelMap(iterRange)) items = Array.from(iterRange.keys());
      else if (list_js_1.isCelList(iterRange)) items = Array.from(iterRange);
      else return error_js_1.celError(`type mismatch: iterable vs ${type_js_1.celType(iterRange)}`, this.id);
      for (let item of items) {
        if (error_js_1.isCelError(item)) return item;
        let iterCtx = new activation_js_1.VarActivation(this.iterVar, item, accuCtx);
        let cond = this.cond.eval(iterCtx);
        if (error_js_1.isCelError(cond)) return cond;
        if (cond !== true) break;
        accuCtx.value = this.step.eval(iterCtx);
      }
      return this.result.eval(accuCtx);
    }
  }
  class EvalAnd {
    id;
    args;
    constructor(id, args) {
      this.id = id;
      this.args = args;
    }
    eval(ctx) {
      let errors = [];
      for (let arg of this.args) {
        let val = arg.eval(ctx);
        if (typeof val === "boolean") {
          if (!val) return false;
          continue;
        }
        if (error_js_1.isCelError(val)) errors.push(val);
        else
          errors.push(
            error_js_1.celError(`type mismatch: expected bool, got ${type_js_1.celType(val)}`, this.id),
          );
      }
      if (errors.length > 0) return error_js_1.celErrorMerge(errors[0], ...errors.slice(1));
      return true;
    }
  }
  class EvalOr {
    id;
    args;
    constructor(id, args) {
      this.id = id;
      this.args = args;
    }
    eval(ctx) {
      let errors = [];
      for (let arg of this.args) {
        let val = arg.eval(ctx);
        if (typeof val === "boolean") {
          if (val) return true;
          continue;
        }
        if (error_js_1.isCelError(val)) errors.push(val);
        else
          errors.push(
            error_js_1.celError(`type mismatch: expected bool, got ${type_js_1.celType(val)}`, this.id),
          );
      }
      if (errors.length > 0) return error_js_1.celErrorMerge(errors[0], ...errors.slice(1));
      return false;
    }
  }
  class EvalNotStrictlyFalse {
    id;
    arg;
    constructor(id, arg) {
      this.id = id;
      this.arg = arg;
    }
    eval(ctx) {
      return this.arg.eval(ctx) !== false;
    }
  }
  function toQualifiedName(expr) {
    switch (expr.exprKind.case) {
      case "identExpr":
        return expr.exprKind.value.name;
      case "selectExpr": {
        if (expr.exprKind.value.testOnly || expr.exprKind.value.operand === undefined) return;
        let parent = toQualifiedName(expr.exprKind.value.operand);
        if (parent === undefined) return;
        return parent + "." + expr.exprKind.value.field;
      }
      default:
        return;
    }
  }
  function unsupportedKeyType(id) {
    return error_js_1.celError("unsupported key type", id);
  }
  function coerceToValues(args) {
    let errors = [];
    for (let i = 0; i < args.length; i++) {
      let arg = args[i];
      if (error_js_1.isCelError(arg)) errors.push(arg);
    }
    if (errors.length > 0) return error_js_1.celErrorMerge(errors[0], ...errors.slice(1));
    return args;
  }
});
export { require_planner };

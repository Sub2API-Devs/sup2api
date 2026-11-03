/**
 * @bufbuild/cel/dist/cjs/access.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { require_planner } from "./planner.js";
import { require_error } from "./error.js";
import { require_field } from "./field.js";
import { require_uint } from "./uint.js";
import { require_type } from "./type.js";

//@ chunk-fq0cr76a.js:603440-611055 cjs-fingerprint
var require_access = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ConcreteAttributeFactory = cjsExports.ErrorAttr = undefined;
  var planner_js_1 = require_planner();
  var error_js_1 = require_error();
  var field_js_1 = require_field();
  var uint_js_1 = require_uint();
  var type_js_1 = require_type();
  function attrAccess(factory, vars, obj, accAttr) {
    let val = accAttr.resolve(vars);
    if (val === undefined) return;
    if (error_js_1.isCelError(val)) return val;
    return factory.newAccess(accAttr.id, val, accAttr.isOptional()).access(vars, obj);
  }
  function attrIsPresent(factory, vars, obj, accAttr) {
    let val = accAttr.resolve(vars);
    if (val === undefined) return false;
    if (error_js_1.isCelError(val)) return val;
    return factory.newAccess(accAttr.id, val, accAttr.isOptional()).isPresent(vars, obj);
  }
  function attrAccessIfPresent(factory, vars, obj, accAttr, presenceOnly) {
    let val = accAttr.resolve(vars);
    if (val === undefined) return;
    if (error_js_1.isCelError(val)) return val;
    return factory.newAccess(accAttr.id, val, accAttr.isOptional()).accessIfPresent(vars, obj, presenceOnly);
  }
  function applyAccesses(vars, obj, accesses) {
    if (accesses.length === 0) return obj;
    let cur = obj;
    for (let access of accesses) {
      let result = access.access(vars, cur);
      if (result === undefined) return;
      if (error_js_1.isCelError(result)) return result;
      cur = result;
    }
    return cur;
  }
  class AbsoluteAttr {
    id;
    nsNames;
    accesses_;
    registry;
    factory;
    constructor(id, nsNames, accesses_, registry, factory) {
      this.id = id;
      this.nsNames = nsNames;
      this.accesses_ = accesses_;
      this.registry = registry;
      this.factory = factory;
      if (nsNames.length === 0) throw Error("No names provided");
    }
    isOptional() {
      return false;
    }
    addAccess(access) {
      this.accesses_.push(access);
    }
    candidateNames() {
      return this.nsNames;
    }
    accesses() {
      return this.accesses_;
    }
    access(vars, obj) {
      return attrAccess(this.factory, vars, obj, this);
    }
    isPresent(vars, obj) {
      return attrIsPresent(this.factory, vars, obj, this);
    }
    accessIfPresent(vars, obj, presenceOnly) {
      return attrAccessIfPresent(this.factory, vars, obj, this, presenceOnly);
    }
    resolve(vars) {
      for (let name of this.nsNames) {
        let raw = vars.resolve(name);
        if (raw !== undefined) {
          if (error_js_1.isCelError(raw)) return raw;
          return applyAccesses(vars, raw, this.accesses_);
        }
        let typ = this.findIdent(name);
        if (typ !== undefined && this.accesses_.length === 0) return typ;
      }
      return;
    }
    findIdent(ident) {
      let desc = this.registry.getMessage(ident);
      if (desc) return type_js_1.objectType(desc);
      if (ident.indexOf(".") > 1) {
        let lastDot = ident.lastIndexOf(".");
        let enumName = ident.substring(0, lastDot);
        let valueName = ident.substring(lastDot + 1);
        let descEnum = this.registry.getEnum(enumName);
        if (descEnum) {
          let enumValue = descEnum.values.find((v) => v.name === valueName);
          if (enumValue) return BigInt(enumValue.number);
        }
      }
      switch (ident) {
        case "int":
          return type_js_1.CelScalar.INT;
        case "uint":
          return type_js_1.CelScalar.UINT;
        case "double":
          return type_js_1.CelScalar.DOUBLE;
        case "bool":
          return type_js_1.CelScalar.BOOL;
        case "string":
          return type_js_1.CelScalar.STRING;
        case "bytes":
          return type_js_1.CelScalar.BYTES;
        case "list":
          return type_js_1.listType(type_js_1.CelScalar.DYN);
        case "map":
          return type_js_1.mapType(type_js_1.CelScalar.DYN, type_js_1.CelScalar.DYN);
        case "null_type":
          return type_js_1.CelScalar.NULL;
        case "type":
          return type_js_1.CelScalar.TYPE;
        default:
          return;
      }
    }
  }
  class ConditionalAttr {
    id;
    cond;
    t;
    f;
    factory;
    constructor(id, cond, t, f, factory) {
      this.id = id;
      this.cond = cond;
      this.t = t;
      this.f = f;
      this.factory = factory;
    }
    isOptional() {
      return false;
    }
    addAccess(access) {
      this.t.addAccess(access);
      this.f.addAccess(access);
    }
    access(vars, obj) {
      return attrAccess(this.factory, vars, obj, this);
    }
    isPresent(vars, obj) {
      return attrIsPresent(this.factory, vars, obj, this);
    }
    accessIfPresent(vars, obj, presenceOnly) {
      return attrAccessIfPresent(this.factory, vars, obj, this, presenceOnly);
    }
    resolve(vars) {
      let cond = this.cond.eval(vars);
      switch (true) {
        case cond === true:
          return this.t.resolve(vars);
        case cond === false:
          return this.f.resolve(vars);
        case error_js_1.isCelError(cond):
          return cond;
      }
      return error_js_1.celError(
        `found no matching overload for _?_:_ applied to '(${type_js_1.celType(cond).name})'`,
        this.id,
      );
    }
  }
  class MaybeAttr {
    id;
    attrs;
    factory;
    constructor(id, attrs, factory) {
      this.id = id;
      this.attrs = attrs;
      this.factory = factory;
    }
    isOptional() {
      return false;
    }
    addAccess(access) {
      let augmentedNames = [];
      let str;
      if (access instanceof StringAccess) str = access.name;
      for (let attr of this.attrs) {
        if (str !== undefined && attr.accesses().length === 0)
          for (let name of attr.candidateNames()) augmentedNames.push(name + "." + str);
        attr.addAccess(access);
      }
      if (augmentedNames.length > 0) {
        let newAttr = this.factory.createAbsolute(this.id, augmentedNames);
        this.attrs.unshift(newAttr);
      }
    }
    access(vars, obj) {
      return attrAccess(this.factory, vars, obj, this);
    }
    isPresent(vars, obj) {
      return attrIsPresent(this.factory, vars, obj, this);
    }
    accessIfPresent(vars, obj, presenceOnly) {
      return attrAccessIfPresent(this.factory, vars, obj, this, presenceOnly);
    }
    resolve(vars) {
      for (let attr of this.attrs) {
        let val = attr.resolve(vars);
        if (val !== undefined) return val;
      }
      return;
    }
  }
  class RelativeAttr {
    id;
    operand;
    accesses_;
    factory;
    constructor(id, operand, accesses_, factory) {
      this.id = id;
      this.operand = operand;
      this.accesses_ = accesses_;
      this.factory = factory;
    }
    isOptional() {
      return false;
    }
    addAccess(access) {
      this.accesses_.push(access);
    }
    access(vars, obj) {
      return attrAccess(this.factory, vars, obj, this);
    }
    isPresent(vars, obj) {
      return attrIsPresent(this.factory, vars, obj, this);
    }
    accessIfPresent(vars, obj, presenceOnly) {
      return attrAccessIfPresent(this.factory, vars, obj, this, presenceOnly);
    }
    resolve(vars) {
      let v = this.operand.eval(vars);
      if (error_js_1.isCelError(v)) return v;
      return applyAccesses(vars, v, this.accesses_);
    }
  }
  class StringAccess {
    id;
    name;
    celVal;
    optional;
    constructor(id, name, celVal, optional) {
      this.id = id;
      this.name = name;
      this.celVal = celVal;
      this.optional = optional;
    }
    isOptional() {
      return this.optional;
    }
    access(_vars, obj) {
      let val = field_js_1.accessByName(obj, this.name);
      if (val === undefined && !this.optional) return fieldNotFound(this.id, this.name);
      return val;
    }
    isPresent(_vars, obj) {
      let set = field_js_1.isSet(obj, this.name);
      if (set === undefined) return fieldNotFound(this.id, this.name);
      return set;
    }
    accessIfPresent(_vars, obj, presenceOnly) {
      let val = field_js_1.accessByName(obj, this.name);
      if (val === undefined && !this.optional && !presenceOnly) return fieldNotFound(this.id, this.name);
      return val;
    }
  }
  class BoolAccess {
    id;
    index;
    optional;
    constructor(id, index, optional) {
      this.id = id;
      this.index = index;
      this.optional = optional;
    }
    isOptional() {
      return this.optional;
    }
    access(_vars, obj) {
      if (obj === undefined) return obj;
      let raw = field_js_1.accessByIndex(obj, this.index);
      if (raw === undefined && !this.optional) return fieldNotFound(this.id, this.index);
      return raw;
    }
    isPresent(_vars, obj) {
      if (field_js_1.accessByIndex(obj, this.index) === undefined && !this.optional)
        return fieldNotFound(this.id, this.index);
      return true;
    }
    accessIfPresent(_vars, obj, _presenceOnly) {
      let raw = field_js_1.accessByIndex(obj, this.index);
      if (raw === undefined && !this.optional) return fieldNotFound(this.id, this.index);
      return raw;
    }
  }
  class NumAccess {
    id;
    index;
    celVal;
    optional;
    constructor(id, index, celVal, optional) {
      this.id = id;
      this.index = index;
      this.celVal = celVal;
      this.optional = optional;
    }
    isOptional() {
      return this.optional;
    }
    access(_vars, obj) {
      if (obj === undefined) return obj;
      let raw = field_js_1.accessByIndex(obj, this.index);
      if (raw === undefined && !this.optional) return indexOutOfBounds(this.id, this.index, -1);
      return raw;
    }
    isPresent(_vars, obj) {
      if (field_js_1.accessByIndex(obj, this.index) === undefined && !this.optional)
        return indexOutOfBounds(this.id, this.index, -1);
      return true;
    }
    accessIfPresent(_vars, obj, _presenceOnly) {
      let raw = field_js_1.accessByIndex(obj, this.index);
      if (raw === undefined && !this.optional) return indexOutOfBounds(this.id, this.index, -1);
      return raw;
    }
  }
  class IntAccess {
    id;
    index;
    celVal;
    optional;
    constructor(id, index, celVal, optional) {
      this.id = id;
      this.index = index;
      this.celVal = celVal;
      this.optional = optional;
    }
    access(_vars, obj) {
      if (obj === undefined) return obj;
      let raw = field_js_1.accessByIndex(obj, this.index);
      if (raw === undefined && !this.optional) return indexOutOfBounds(this.id, Number(this.index), -1);
      return raw;
    }
    isPresent(_vars, obj) {
      if (field_js_1.accessByIndex(obj, this.index) === undefined && !this.optional)
        return indexOutOfBounds(this.id, Number(this.index), -1);
      return true;
    }
    accessIfPresent(_vars, obj, _presenceOnly) {
      let raw = field_js_1.accessByIndex(obj, this.index);
      if (raw === undefined && !this.optional) return indexOutOfBounds(this.id, Number(this.index), -1);
      return raw;
    }
    isOptional() {
      return this.optional;
    }
  }
  class ErrorAttr {
    id;
    error;
    opt;
    constructor(id, error, opt) {
      this.id = id;
      this.error = error;
      this.opt = opt;
    }
    addAccess(_access) {}
    resolve(_vars) {
      return this.error;
    }
    isOptional() {
      return this.opt;
    }
    access(_vars, _obj) {
      return this.error;
    }
    isPresent(_vars, _obj) {
      return this.error;
    }
    accessIfPresent(_vars, _obj, _presenceOnly) {
      return this.error;
    }
  }
  cjsExports.ErrorAttr = ErrorAttr;
  class EvalAccess {
    id;
    key;
    factory;
    optional;
    constructor(id, key, factory, optional) {
      this.id = id;
      this.key = key;
      this.factory = factory;
      this.optional = optional;
    }
    access(vars, obj) {
      if (obj === undefined) return obj;
      let key = this.key.eval(vars);
      if (error_js_1.isCelError(key)) return key;
      return this.factory.newAccess(this.id, key, this.optional).access(vars, obj);
    }
    isPresent(vars, obj) {
      if (obj === undefined) return false;
      let key = this.key.eval(vars);
      if (error_js_1.isCelError(key)) return key;
      return this.factory.newAccess(this.id, key, this.optional).isPresent(vars, obj);
    }
    accessIfPresent(vars, obj, presenceOnly) {
      let key = this.key.eval(vars);
      if (error_js_1.isCelError(key)) return key;
      return this.factory.newAccess(this.id, key, this.optional).accessIfPresent(vars, obj, presenceOnly);
    }
    isOptional() {
      return this.optional;
    }
  }
  class ConcreteAttributeFactory {
    registry;
    container;
    constructor(registry, container) {
      this.registry = registry;
      this.container = container;
    }
    createAbsolute(id, names) {
      return new AbsoluteAttr(id, names, [], this.registry, this);
    }
    createConditional(id, cond, t, f) {
      return new ConditionalAttr(id, cond, t, f, this);
    }
    createMaybe(id, name) {
      return new MaybeAttr(id, [this.createAbsolute(id, this.container.resolveCandidateNames(name))], this);
    }
    createRelative(id, operand) {
      return new RelativeAttr(id, operand, [], this);
    }
    newAccess(id, val, opt) {
      switch (typeof val) {
        case "boolean":
          return new BoolAccess(id, val, opt);
        case "number":
          return new NumAccess(id, val, val, opt);
        case "bigint":
          return new IntAccess(id, val, val, opt);
        case "string":
          return new StringAccess(id, val, val, opt);
        case "object":
          if (val instanceof planner_js_1.EvalAttr) return new EvalAccess(id, val, this, opt);
          if (uint_js_1.isCelUint(val)) return new IntAccess(id, val.value, val, opt);
          break;
        default:
          break;
      }
      return new ErrorAttr(id, error_js_1.celError("unsupported key type", id), opt);
    }
  }
  cjsExports.ConcreteAttributeFactory = ConcreteAttributeFactory;
  function fieldNotFound(id, name) {
    return error_js_1.celError(`field not found: ${String(name)}`, id);
  }
  function indexOutOfBounds(id, index, length) {
    return error_js_1.celError(`index ${index} out of bounds [0, ${length})`, id);
  }
});
export { require_access };

/**
 * @bufbuild/cel/dist/cjs/resolver.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_value } from "./value.js";

//@ chunk-fq0cr76a.js:478784-479776 cjs-fingerprint
var require_resolver = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.createResolver = createResolver;
  var value_js_1 = require_value();
  var privateSymbol = Symbol.for("@bufbuild/cel/resolver");
  function createResolver(...inputs) {
    let groups = new Map();
    for (let input of inputs) {
      let funcs = isFuncResolver(input) || Array.isArray(input) ? input : [input];
      for (let func of funcs) {
        let group = groups.get(func.name);
        if (group === undefined) {
          group = [];
          groups.set(func.name, group);
        }
        group.push(func);
      }
    }
    return new Resolver(
      new Map(Array(...groups.entries()).map(([name, funcs]) => [name, createFuncGroup(name, funcs)])),
    );
  }
  function isFuncResolver(v) {
    return typeof v === "object" && v !== null && privateSymbol in v;
  }
  class Resolver {
    _groups;
    [privateSymbol] = {};
    constructor(_groups) {
      this._groups = _groups;
    }
    *[Symbol.iterator]() {
      for (let group of this._groups.values()) yield* group;
    }
    find(name) {
      return this._groups.get(name);
    }
  }
  function createFuncGroup(name, funcs) {
    let set = [];
    for (let func of funcs) {
      for (let i = 0; i < set.length; i++)
        if (func.id === set[i].id) {
          set.splice(i, 1);
          break;
        }
      set.push(func);
    }
    return new Group(name, set);
  }
  class Group {
    _name;
    _funcs;
    constructor(_name, _funcs) {
      this._name = _name;
      this._funcs = _funcs;
    }
    *[Symbol.iterator]() {
      yield* this._funcs;
    }
    get name() {
      return this._name;
    }
    call(id, target, args) {
      args = args.map((arg) => value_js_1.unwrapAny(arg));
      for (let func of this._funcs) {
        let result = func.call(id, target, args);
        if (result !== undefined) return result;
      }
      return;
    }
  }
});
export { require_resolver };

/**
 * @bufbuild/cel/dist/cjs/list.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_reflect_2 } from "../../../protobuf/dist/commonjs/reflect/index.js";
import { require_proto } from "./proto.js";
import { require_value } from "./value.js";

//@ chunk-fq0cr76a.js:468191-469618 cjs-fingerprint
var require_list = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.EMPTY_LIST = undefined;
  cjsExports.celList = celList;
  cjsExports.celListConcat = celListConcat;
  cjsExports.isCelList = isCelList;
  var reflect_1 = require_reflect_2();
  var proto_js_1 = require_proto();
  var value_js_1 = require_value();
  var privateSymbol = Symbol.for("@bufbuild/cel/list");
  function celList(arrayOrReflectList) {
    if (reflect_1.isReflectList(arrayOrReflectList)) return new RepeatedFieldList(arrayOrReflectList);
    return new ArrayList(arrayOrReflectList);
  }
  function celListConcat(...lists) {
    return new ConcatList(lists);
  }
  function isCelList(v) {
    return typeof v === "object" && v !== null && privateSymbol in v;
  }
  class ArrayList {
    _array;
    [privateSymbol] = {};
    constructor(_array) {
      this._array = _array;
    }
    get size() {
      return this._array.length;
    }
    get(index) {
      if (index < 0 || index >= this.size) return;
      return value_js_1.toCel(this._array[index]);
    }
    *values() {
      for (let element of this._array.values()) yield value_js_1.toCel(element);
    }
    [Symbol.iterator]() {
      return this.values();
    }
  }
  class RepeatedFieldList {
    _list;
    [privateSymbol] = {};
    constructor(_list) {
      this._list = _list;
    }
    get size() {
      return this._list.size;
    }
    get(index) {
      let val = this._list.get(index);
      if (val === undefined) return;
      return celFromListElem(this._list.field(), val);
    }
    *values() {
      for (let val of this._list) yield celFromListElem(this._list.field(), val);
    }
    [Symbol.iterator]() {
      return this.values();
    }
  }
  class ConcatList {
    _lists;
    [privateSymbol] = {};
    _size;
    constructor(_lists) {
      this._lists = _lists;
      let size = 0;
      for (let list of _lists) size += list.size;
      this._size = size;
    }
    get size() {
      return this._size;
    }
    get(index) {
      if (index < 0 || index >= this.size) return;
      for (let list of this._lists) {
        if (index < list.size) return list.get(index);
        index = index - list.size;
      }
      return;
    }
    *values() {
      for (let list of this._lists) yield* list.values();
    }
    [Symbol.iterator]() {
      return this.values();
    }
  }
  function celFromListElem(desc, v) {
    switch (desc.listKind) {
      case "enum":
        return BigInt(v);
      case "message":
        return value_js_1.reflectMsgToCel(v);
      case "scalar":
        return proto_js_1.celFromScalar(desc.scalar, v);
    }
  }
  cjsExports.EMPTY_LIST = celList([]);
});
export { require_list };

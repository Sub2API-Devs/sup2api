/**
 * zod/v4/classic/errors.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-7vp249v4.js (3)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import { $ZodError, formatError, flattenError } from "../core/errors.js";
import { jsonStringifyReplacer } from "../core/util.js";
import { Fr } from "../core/core.js";

//@ chunk-7vp249v4.js:78914-78969 esm-layout
var _installedErrorProtos = new WeakSet([Object.prototype, Error.prototype]);
//@ chunk-7vp249v4.js:78969-79221 esm-fingerprint
function _lazyMethod(proto, key, make) {
  Object.defineProperty(proto, key, {
    configurable: true,
    enumerable: false,
    get() {
      let value = make(this);
      Object.defineProperty(this, key, {
        value,
        configurable: true,
        writable: true,
      });
      return value;
    },
    set(value) {
      Object.defineProperty(this, key, {
        value,
        configurable: true,
        writable: true,
      });
    },
  });
}
//@ chunk-7vp249v4.js:79221-79741 esm-fingerprint
var initializer_2 = (inst, issues) => {
  $ZodError.init(inst, issues);
  inst.name = "ZodError";
  let proto = Object.getPrototypeOf(inst);
  if (_installedErrorProtos.has(proto)) return;
  _installedErrorProtos.add(proto);
  _lazyMethod(proto, "format", (n) => (mapper) => formatError(n, mapper));
  _lazyMethod(proto, "flatten", (n) => (mapper) => flattenError(n, mapper));
  _lazyMethod(proto, "addIssue", (n) => (issue) => {
    n.issues.push(issue);
    n.message = JSON.stringify(n.issues, jsonStringifyReplacer, 2);
  });
  _lazyMethod(proto, "addIssues", (n) => (issues) => {
    n.issues.push(...issues);
    n.message = JSON.stringify(n.issues, jsonStringifyReplacer, 2);
  });
  Object.defineProperty(proto, "isEmpty", {
    configurable: true,
    enumerable: false,
    get() {
      return this.issues.length === 0;
    },
  });
};
var ZodError = Fr("ZodError", initializer_2);
var ZodRealError = Fr("ZodError", initializer_2, undefined, {
  Parent: Error,
});
export { ZodError, ZodRealError };

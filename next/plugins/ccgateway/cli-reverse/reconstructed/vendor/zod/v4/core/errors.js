/**
 * zod/v4/core/errors.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-m4y44r15.js (8)
 * attribution: esm-fingerprint 8
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { jsonStringifyReplacer } from "./util.js";
import { $constructor } from "./core.js";

//@ chunk-m4y44r15.js:433-531 esm-fingerprint
function _getMessage() {
  let internals = this._zod;
  internals.message ?? (internals.message = JSON.stringify(internals.def, jsonStringifyReplacer, 2));
  return internals.message;
}
//@ chunk-m4y44r15.js:531-566 esm-fingerprint
function _setMessage(value) {
  this._zod.message = value;
}
//@ chunk-m4y44r15.js:566-1225 esm-fingerprint
var _messageDesc = {
  get: _getMessage,
  set: _setMessage,
  enumerable: true,
  configurable: true,
};
var _issuesDesc = {
  value: undefined,
  enumerable: false,
};
var _installedToString = new WeakSet([Object.prototype, Error.prototype]);
var initializer = (inst, def) => {
  inst.name = "$ZodError";
  _issuesDesc.value = def;
  Object.defineProperty(inst, "issues", _issuesDesc);
  _issuesDesc.value = undefined;
  Object.defineProperty(inst, "message", _messageDesc);
  let proto = Object.getPrototypeOf(inst);
  if (!_installedToString.has(proto)) {
    _installedToString.add(proto);
    Object.defineProperty(proto, "toString", {
      configurable: true,
      enumerable: false,
      get() {
        let value = () => this.message;
        Object.defineProperty(this, "toString", {
          value,
          configurable: true,
          writable: true,
        });
        return value;
      },
      set(value) {
        Object.defineProperty(this, "toString", {
          value,
          configurable: true,
          writable: true,
        });
      },
    });
  }
};
var $ZodError = $constructor("$ZodError", initializer);
var $ZodRealError = $constructor("$ZodError", initializer, undefined, {
  Parent: Error,
});
//@ chunk-m4y44r15.js:1225-1416 esm-fingerprint
function node(obj, key, make) {
  if (!Object.prototype.hasOwnProperty.call(obj, key))
    if (key === "__proto__")
      Object.defineProperty(obj, key, {
        value: make(),
        writable: true,
        enumerable: true,
        configurable: true,
      });
    else obj[key] = make();
  return obj[key];
}
//@ chunk-m4y44r15.js:1416-1590 esm-fingerprint
function flattenError(error, mapper = (issue) => issue.message) {
  let fieldErrors = {};
  let formErrors = [];
  for (let sub of error.issues)
    if (sub.path.length > 0) node(fieldErrors, sub.path[0], () => []).push(mapper(sub));
    else formErrors.push(mapper(sub));
  return {
    formErrors,
    fieldErrors,
  };
}
//@ chunk-m4y44r15.js:1590-2297 esm-fingerprint
function formatError(error, mapper = (issue) => issue.message) {
  let fieldErrors = {
    _errors: [],
  };
  let processError = (error, path = []) => {
    for (let issue of error.issues)
      if (issue.code === "invalid_union" && issue.errors.length)
        issue.errors.map((issues) =>
          processError(
            {
              issues,
            },
            [...path, ...issue.path],
          ),
        );
      else if (issue.code === "invalid_key")
        processError(
          {
            issues: issue.issues,
          },
          [...path, ...issue.path],
        );
      else if (issue.code === "invalid_element")
        processError(
          {
            issues: issue.issues,
          },
          [...path, ...issue.path],
        );
      else {
        let fullpath = [...path, ...issue.path];
        if (fullpath.length === 0) fieldErrors._errors.push(mapper(issue));
        else {
          let curr = fieldErrors;
          let i = 0;
          while (i < fullpath.length) {
            let el = fullpath[i];
            let terminal = i === fullpath.length - 1;
            if (el === "_errors") {
              if (terminal) curr._errors.push(mapper(issue));
              i++;
              continue;
            }
            if (!Object.prototype.hasOwnProperty.call(curr, el))
              Object.defineProperty(curr, el, {
                value: {
                  _errors: [],
                },
                enumerable: true,
                writable: true,
                configurable: true,
              });
            let node = curr[el];
            if (terminal) node._errors.push(mapper(issue));
            curr = node;
            i++;
          }
        }
      }
  };
  processError(error);
  return fieldErrors;
}
//@ chunk-m4y44r15.js:2297-2602 esm-fingerprint
function toDotPath(_path) {
  let segs = [];
  let path = _path.map((seg) => (typeof seg === "object" ? seg.key : seg));
  for (let seg of path)
    if (typeof seg === "number") segs.push(`[${seg}]`);
    else if (typeof seg === "symbol") segs.push(`[${JSON.stringify(String(seg))}]`);
    else if (/[^\w$]/.test(seg)) segs.push(`[${JSON.stringify(seg)}]`);
    else {
      if (segs.length) segs.push(".");
      segs.push(seg);
    }
  return segs.join("");
}
//@ chunk-m4y44r15.js:2602-2814 esm-fingerprint
function prettifyError(error) {
  let lines = [];
  let issues = [...error.issues].sort((a, b) => (a.path ?? []).length - (b.path ?? []).length);
  for (let issue of issues) {
    lines.push(`\u2716 ${issue.message}`);
    if (issue.path?.length) lines.push(`  \u2192 at ${toDotPath(issue.path)}`);
  }
  return lines.join(`
`);
}
export { prettifyError, $ZodRealError, $ZodError, formatError, flattenError };

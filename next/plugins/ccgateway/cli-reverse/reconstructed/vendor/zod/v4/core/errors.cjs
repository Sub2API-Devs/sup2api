/**
 * zod/v4/core/errors.cjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_core } from "./core.cjs";
import { require_util } from "./util.cjs";

//@ chunk-1hnjmk23.js:106858-111332 cjs-fingerprint
var require_errors_2 = __commonJS(function (cjsExports) {
  var __createBinding =
    (cjsExports && cjsExports.__createBinding) ||
    (Object.create
      ? function (o_2, m, k, k2) {
          if (k2 === undefined) k2 = k;
          var desc = Object.getOwnPropertyDescriptor(m, k);
          if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
            desc = {
              enumerable: true,
              get: function () {
                return m[k];
              },
            };
          Object.defineProperty(o_2, k2, desc);
        }
      : function (o_2, m, k, k2) {
          if (k2 === undefined) k2 = k;
          o_2[k2] = m[k];
        });
  var __setModuleDefault =
    (cjsExports && cjsExports.__setModuleDefault) ||
    (Object.create
      ? function (o, v) {
          Object.defineProperty(o, "default", {
            enumerable: true,
            value: v,
          });
        }
      : function (o, v) {
          o.default = v;
        });
  var __importStar =
    (cjsExports && cjsExports.__importStar) ||
    function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod)
          if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
            __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.$ZodRealError = cjsExports.$ZodError = undefined;
  cjsExports.flattenError = flattenError;
  cjsExports.formatError = formatError;
  cjsExports.treeifyError = treeifyError;
  cjsExports.toDotPath = toDotPath;
  cjsExports.prettifyError = prettifyError;
  var core_js_1 = require_core();
  var util = __importStar(require_util());
  function _getMessage() {
    let internals = this._zod;
    internals.message ?? (internals.message = JSON.stringify(internals.def, util.jsonStringifyReplacer, 2));
    return internals.message;
  }
  function _setMessage(value) {
    this._zod.message = value;
  }
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
  cjsExports.$ZodError = core_js_1.$constructor("$ZodError", initializer);
  cjsExports.$ZodRealError = core_js_1.$constructor("$ZodError", initializer, undefined, {
    Parent: Error,
  });
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
  function treeifyError(error, mapper = (issue) => issue.message) {
    let result = {
      errors: [],
    };
    let processError = (error, path = []) => {
      var _a;
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
          if (fullpath.length === 0) {
            result.errors.push(mapper(issue));
            continue;
          }
          let curr = result;
          let i = 0;
          while (i < fullpath.length) {
            let el = fullpath[i];
            let terminal = i === fullpath.length - 1;
            if (typeof el === "string") {
              curr.properties ?? (curr.properties = {});
              if (!Object.prototype.hasOwnProperty.call(curr.properties, el))
                Object.defineProperty(curr.properties, el, {
                  value: {
                    errors: [],
                  },
                  enumerable: true,
                  writable: true,
                  configurable: true,
                });
              curr = curr.properties[el];
            } else {
              curr.items ?? (curr.items = []);
              (_a = curr.items)[el] ??
                (_a[el] = {
                  errors: [],
                });
              curr = curr.items[el];
            }
            if (terminal) curr.errors.push(mapper(issue));
            i++;
          }
        }
    };
    processError(error);
    return result;
  }
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
  (function () {
    var keys = Object.getOwnPropertyNames(cjsExports);
    for (var i = 0; i < keys.length; i++) {
      var desc = Object.getOwnPropertyDescriptor(cjsExports, keys[i]);
      if (!desc || !desc.get || !desc.configurable) continue;
      var value;
      try {
        value = desc.get();
      } catch (e) {
        continue;
      }
      if (value === undefined) continue;
      Object.defineProperty(cjsExports, keys[i], {
        value,
        writable: false,
        enumerable: desc.enumerable,
        configurable: false,
      });
    }
    Object.freeze(cjsExports);
  })();
});
export { require_errors_2 };

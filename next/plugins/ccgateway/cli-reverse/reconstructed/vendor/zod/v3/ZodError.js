/**
 * zod/v3/ZodError.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-djgshcbm.js (2)
 * attribution: esm-fingerprint 2
 */
import { util } from "./helpers/util.js";

//@ chunk-djgshcbm.js:2007-2316 esm-fingerprint
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite",
]);
//@ chunk-djgshcbm.js:2316-3800 esm-fingerprint
class ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    let actualProto = new.target.prototype;
    if (Object.setPrototypeOf) Object.setPrototypeOf(this, actualProto);
    else this.__proto__ = actualProto;
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    let mapper =
      _mapper ||
      function (issue) {
        return issue.message;
      };
    let fieldErrors = {
      _errors: [],
    };
    let processError = (error) => {
      for (let issue of error.issues)
        if (issue.code === "invalid_union") issue.unionErrors.map(processError);
        else if (issue.code === "invalid_return_type") processError(issue.returnTypeError);
        else if (issue.code === "invalid_arguments") processError(issue.argumentsError);
        else if (issue.path.length === 0) fieldErrors._errors.push(mapper(issue));
        else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            let el = issue.path[i];
            let terminal = i === issue.path.length - 1;
            if (el === "_errors") {
              if (terminal) curr._errors.push(mapper(issue));
              i++;
              continue;
            }
            if (!Object.prototype.hasOwnProperty.call(curr, el))
              if (el === "__proto__")
                Object.defineProperty(curr, el, {
                  value: {
                    _errors: [],
                  },
                  writable: true,
                  enumerable: true,
                  configurable: true,
                });
              else
                curr[el] = {
                  _errors: [],
                };
            curr = curr[el];
            if (terminal) curr._errors.push(mapper(issue));
            i++;
          }
        }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof ZodError)) throw Error(`Not a ZodError: ${value}`);
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    let fieldErrors = Object.create(null);
    let formErrors = [];
    for (let sub of this.issues)
      if (sub.path.length > 0) {
        let firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else formErrors.push(mapper(sub));
    return {
      formErrors,
      fieldErrors,
    };
  }
  get formErrors() {
    return this.flatten();
  }
}
export { ZodIssueCode, ZodError };

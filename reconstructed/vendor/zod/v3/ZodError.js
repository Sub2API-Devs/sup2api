/**
 * zod/v3/ZodError.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: zod@4.6.2
 * pieces: chunk-j2t139r9.js (2)
 * attribution: esm-fingerprint 2
 */
import { g } from "./helpers/util.js";

//@ chunk-j2t139r9.js:2007-2316 esm-fingerprint
var arrayToEnum_2 = g.arrayToEnum([
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
//@ chunk-j2t139r9.js:2316-3800 esm-fingerprint
class ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(e) {
    super();
    ((this.issues = []),
      (this.addIssue = (r) => {
        this.issues = [...this.issues, r];
      }),
      (this.addIssues = (r = []) => {
        this.issues = [...this.issues, ...r];
      }));
    let t = new.target.prototype;
    if (Object.setPrototypeOf) Object.setPrototypeOf(this, t);
    else this.__proto__ = t;
    ((this.name = "ZodError"), (this.issues = e));
  }
  format(e) {
    let t =
        e ||
        function (s) {
          return s.message;
        },
      r = { _errors: [] },
      a = (s) => {
        for (let issue of s.issues)
          if (issue.code === "invalid_union") issue.unionErrors.map(a);
          else if (issue.code === "invalid_return_type") a(issue.returnTypeError);
          else if (issue.code === "invalid_arguments") a(issue.argumentsError);
          else if (issue.path.length === 0) r._errors.push(t(issue));
          else {
            let n = r,
              c = 0;
            while (c < issue.path.length) {
              let o = issue.path[c],
                p = c === issue.path.length - 1;
              if (o === "_errors") {
                if (p) n._errors.push(t(issue));
                c++;
                continue;
              }
              if (!Object.prototype.hasOwnProperty.call(n, o))
                if (o === "__proto__")
                  Object.defineProperty(n, o, {
                    value: { _errors: [] },
                    writable: !0,
                    enumerable: !0,
                    configurable: !0,
                  });
                else n[o] = { _errors: [] };
              if (((n = n[o]), p)) n._errors.push(t(issue));
              c++;
            }
          }
      };
    return (a(this), r);
  }
  static assert(e) {
    if (!(e instanceof ZodError)) throw Error(`Not a ZodError: ${e}`);
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, g.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(e = (t) => t.message) {
    let create = Object.create(null),
      r = [];
    for (let issue of this.issues)
      if (issue.path.length > 0) {
        let s = issue.path[0];
        ((create[s] = create[s] || []), create[s].push(e(issue)));
      } else r.push(e(issue));
    return { formErrors: r, fieldErrors: create };
  }
  get formErrors() {
    return this.flatten();
  }
}

export { arrayToEnum_2, ZodError };

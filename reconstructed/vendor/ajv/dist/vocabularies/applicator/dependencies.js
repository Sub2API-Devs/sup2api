/**
 * ajv/dist/vocabularies/applicator/dependencies.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { uh } from "../../compile/codegen/index.js";
import { ew } from "../../compile/util.js";
import { Q } from "../code.js";

//@ chunk-s82q9s4x.js:96663-98190 cjs-fingerprint
var bXr = x(function (vi) {
  Object.defineProperty(vi, "__esModule", { value: !0 });
  vi.validateSchemaDeps = vi.validatePropertyDeps = vi.error = void 0;
  var et = uh(),
    _i = ew(),
    de = Q();
  vi.error = {
    message: ({ params: { property: e, depsCount: t, deps: r } }) =>
      et.str`must have ${t === 1 ? "property" : "properties"} ${r} when property ${e} is present`,
    params: ({ params: { property: e, depsCount: t, deps: r, missingProperty: s } }) => et._`{property: ${e},
    missingProperty: ${s},
    depsCount: ${t},
    deps: ${r}}`,
  };
  var fp = {
    keyword: "dependencies",
    type: "object",
    schemaType: "object",
    error: vi.error,
    code(e) {
      let [t, r] = pp(e);
      (gi(e, t), $i(e, r));
    },
  };
  function pp({ schema: schema }) {
    let t = {},
      r = {};
    for (let key in schema) {
      if (key === "__proto__") continue;
      let n = Array.isArray(schema[key]) ? t : r;
      n[key] = schema[key];
    }
    return [t, r];
  }
  function gi(e, t = e.schema) {
    let { gen: gen, data: s, it: it } = e;
    if (Object.keys(t).length === 0) return;
    let o = gen.let("missing");
    for (let key in t) {
      let a = t[key];
      if (a.length === 0) continue;
      let propertyInData = de.propertyInData(gen, s, key, it.opts.ownProperties);
      if ((e.setParams({ property: key, depsCount: a.length, deps: a.join(", ") }), it.allErrors))
        gen.if(propertyInData, () => {
          for (let u of a) de.checkReportMissingProp(e, u);
        });
      else
        (gen.if(et._`${propertyInData} && (${de.checkMissingProp(e, a, o)})`),
          de.reportMissingProp(e, o),
          gen.else());
    }
  }
  vi.validatePropertyDeps = gi;
  function $i(e, t = e.schema) {
    let { gen: gen, data: s, keyword: keyword, it: it } = e,
      i = gen.name("valid");
    for (let key in t) {
      if (_i.alwaysValidSchema(it, t[key])) continue;
      (gen.if(
        de.propertyInData(gen, s, key, it.opts.ownProperties),
        () => {
          let subschema = e.subschema({ keyword: keyword, schemaProp: key }, i);
          e.mergeValidEvaluated(subschema, i);
        },
        () => gen.var(i, !0),
      ),
        e.ok(i));
    }
  }
  vi.validateSchemaDeps = $i;
  vi.default = fp;
});

export { bXr };

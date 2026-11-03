/**
 * ajv/dist/vocabularies/applicator/items.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { uh } from "../../compile/codegen/index.js";
import { ew } from "../../compile/util.js";
import { Q } from "../code.js";

//@ chunk-s82q9s4x.js:93166-94228 cjs-fingerprint
var Ir = x(function (oi) {
  Object.defineProperty(oi, "__esModule", { value: !0 });
  oi.validateTuple = void 0;
  var zt = uh(),
    Ne = ew(),
    si = Q(),
    rp = {
      keyword: "items",
      type: "array",
      schemaType: ["object", "array", "boolean"],
      before: "uniqueItems",
      code(e) {
        let { schema: schema, it: it } = e;
        if (Array.isArray(schema)) return ni(e, "additionalItems", schema);
        if (((it.items = !0), Ne.alwaysValidSchema(it, schema))) return;
        e.ok(si.validateArray(e));
      },
    };
  function ni(e, t, r = e.schema) {
    let { gen: gen, parentSchema: parentSchema, data: o, keyword: keyword, it: it } = e;
    if ((l(parentSchema), it.opts.unevaluated && r.length && it.items !== !0))
      it.items = Ne.mergeEvaluated.items(gen, r.length, it.items);
    let c = gen.name("valid"),
      u = gen.const("len", zt._`${o}.length`);
    r.forEach((f, b) => {
      if (Ne.alwaysValidSchema(it, f)) return;
      (gen.if(zt._`${u} > ${b}`, () => e.subschema({ keyword: keyword, schemaProp: b, dataProp: b }, c)),
        e.ok(c));
    });
    function l(f) {
      let { opts: opts, errSchemaPath: errSchemaPath } = it,
        h = r.length,
        p = h === f.minItems && (h === f.maxItems || f[t] === !1);
      if (opts.strictTuples && !p) {
        let y = `"${keyword}" is ${h}-tuple, but minItems or maxItems/${t} are not specified or different at path "${errSchemaPath}"`;
        Ne.checkStrictMode(it, y, opts.strictTuples);
      }
    }
  }
  oi.validateTuple = ni;
  oi.default = rp;
});

export { Ir };

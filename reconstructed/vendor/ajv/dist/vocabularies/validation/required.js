/**
 * ajv/dist/vocabularies/validation/required.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { Q } from "../code.js";
import { uh } from "../../compile/codegen/index.js";
import { ew } from "../../compile/util.js";

//@ chunk-s82q9s4x.js:87116-88514 cjs-fingerprint
var Uo = x(function (zo) {
  Object.defineProperty(zo, "__esModule", { value: !0 });
  var ae = Q(),
    ce = uh(),
    Vo = ew(),
    Ef = {
      message: ({ params: { missingProperty: e } }) => ce.str`must have required property '${e}'`,
      params: ({ params: { missingProperty: e } }) => ce._`{missingProperty: ${e}}`,
    },
    Sf = {
      keyword: "required",
      type: "object",
      schemaType: "array",
      $data: !0,
      error: Ef,
      code(e) {
        let { gen: gen, schema: schema, schemaCode: schemaCode, data: n, $data: $data, it: it } = e,
          { opts: opts } = it;
        if (!$data && schema.length === 0) return;
        let c = schema.length >= opts.loopRequired;
        if (it.allErrors) u();
        else l();
        if (opts.strictRequired) {
          let properties = e.parentSchema.properties,
            { definedProperties: definedProperties } = e.it;
          for (let p of schema)
            if (
              (properties === null || properties === void 0 ? void 0 : properties[p]) === void 0 &&
              !definedProperties.has(p)
            ) {
              let y = it.schemaEnv.baseId + it.errSchemaPath,
                v = `required property "${p}" is not defined at "${y}" (strictRequired)`;
              Vo.checkStrictMode(it, v, it.opts.strictRequired);
            }
        }
        function u() {
          if (c || $data) e.block$data(ce.nil, f);
          else for (let _ of schema) ae.checkReportMissingProp(e, _);
        }
        function l() {
          let _ = gen.let("missing");
          if (c || $data) {
            let h = gen.let("valid", !0);
            (e.block$data(h, () => b(_, h)), e.ok(h));
          } else (gen.if(ae.checkMissingProp(e, schema, _)), ae.reportMissingProp(e, _), gen.else());
        }
        function f() {
          gen.forOf("prop", schemaCode, (_) => {
            (e.setParams({ missingProperty: _ }),
              gen.if(ae.noPropertyInData(gen, n, _, opts.ownProperties), () => e.error()));
          });
        }
        function b(_, h) {
          (e.setParams({ missingProperty: _ }),
            gen.forOf(
              _,
              schemaCode,
              () => {
                (gen.assign(h, ae.propertyInData(gen, n, _, opts.ownProperties)),
                  gen.if(ce.not(h), () => {
                    (e.error(), gen.break());
                  }));
              },
              ce.nil,
            ));
        }
      },
    };
  zo.default = Sf;
});

export { Uo };

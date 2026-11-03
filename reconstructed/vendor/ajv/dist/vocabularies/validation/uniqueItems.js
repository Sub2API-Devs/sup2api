/**
 * ajv/dist/vocabularies/validation/uniqueItems.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { ut } from "../../compile/validate/dataType.js";
import { uh } from "../../compile/codegen/index.js";
import { ew } from "../../compile/util.js";
import { Lkn } from "../../runtime/equal.js";

//@ chunk-s82q9s4x.js:89001-90404 cjs-fingerprint
var Go = x(function (Ho) {
  Object.defineProperty(Ho, "__esModule", { value: !0 });
  var Xe = ut(),
    j = uh(),
    Lo = ew(),
    Of = Lkn(),
    jf = {
      message: ({ params: { i: e, j: t } }) =>
        j.str`must NOT have duplicate items (items ## ${t} and ${e} are identical)`,
      params: ({ params: { i: e, j: t } }) => j._`{i: ${e}, j: ${t}}`,
    },
    xf = {
      keyword: "uniqueItems",
      type: "array",
      schemaType: "boolean",
      $data: !0,
      error: jf,
      code(e) {
        let {
          gen: gen,
          data: r,
          $data: $data,
          schema: schema,
          parentSchema: parentSchema,
          schemaCode: schemaCode,
          it: it,
        } = e;
        if (!$data && !schema) return;
        let c = gen.let("valid"),
          u = parentSchema.items ? Xe.getSchemaTypes(parentSchema.items) : [];
        (e.block$data(c, l, j._`${schemaCode} === false`), e.ok(c));
        function l() {
          let h = gen.let("i", j._`${r}.length`),
            p = gen.let("j");
          (e.setParams({ i: h, j: p }), gen.assign(c, !0), gen.if(j._`${h} > 1`, () => (f() ? b : _)(h, p)));
        }
        function f() {
          return u.length > 0 && !u.some((h) => h === "object" || h === "array");
        }
        function b(h, p) {
          let y = gen.name("item"),
            checkDataTypes = Xe.checkDataTypes(u, y, it.opts.strictNumbers, Xe.DataType.Wrong),
            O = gen.const("indices", j._`{}`);
          gen.for(j._`;${h}--;`, () => {
            if ((gen.let(y, j._`${r}[${h}]`), gen.if(checkDataTypes, j._`continue`), u.length > 1))
              gen.if(j._`typeof ${y} == "string"`, j._`${y} += "_"`);
            gen
              .if(j._`typeof ${O}[${y}] == "number"`, () => {
                (gen.assign(p, j._`${O}[${y}]`), e.error(), gen.assign(c, !1).break());
              })
              .code(j._`${O}[${y}] = ${h}`);
          });
        }
        function _(h, p) {
          let useFunc = Lo.useFunc(gen, Of.default),
            v = gen.name("outer");
          gen.label(v).for(j._`;${h}--;`, () =>
            gen.for(j._`${p} = ${h}; ${p}--;`, () =>
              gen.if(j._`${useFunc}(${r}[${h}], ${r}[${p}])`, () => {
                (e.error(), gen.assign(c, !1).break(v));
              }),
            ),
          );
        }
      },
    };
  Ho.default = xf;
});

export { Go };

/**
 * ajv/dist/vocabularies/format/format.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { uh } from "../../compile/codegen/index.js";

//@ chunk-s82q9s4x.js:106427-108297 cjs-fingerprint
var Zi = x(function (Yi) {
  Object.defineProperty(Yi, "__esModule", { value: !0 });
  var k = uh(),
    oh = {
      message: ({ schemaCode: schemaCode }) => k.str`must match format "${schemaCode}"`,
      params: ({ schemaCode: schemaCode }) => k._`{format: ${schemaCode}}`,
    },
    ih = {
      keyword: "format",
      type: ["number", "string"],
      schemaType: "string",
      $data: !0,
      error: oh,
      code(e, t) {
        let { gen: gen, data: s, $data: $data, schema: schema, schemaCode: schemaCode, it: it } = e,
          { opts: opts, errSchemaPath: errSchemaPath, schemaEnv: schemaEnv, self: f } = it;
        if (!opts.validateFormats) return;
        if ($data) b();
        else _();
        function b() {
          let scopeValue = gen.scopeValue("formats", { ref: f.formats, code: opts.code.formats }),
            p = gen.const("fDef", k._`${scopeValue}[${schemaCode}]`),
            y = gen.let("fType"),
            v = gen.let("format");
          (gen.if(
            k._`typeof ${p} == "object" && !(${p} instanceof RegExp)`,
            () => gen.assign(y, k._`${p}.type || "string"`).assign(v, k._`${p}.validate`),
            () => gen.assign(y, k._`"string"`).assign(v, p),
          ),
            e.fail$data(k.or(O(), q())));
          function O() {
            if (opts.strictSchema === !1) return k.nil;
            return k._`${schemaCode} && !${v}`;
          }
          function q() {
            let M = schemaEnv.$async ? k._`(${p}.async ? await ${v}(${s}) : ${v}(${s}))` : k._`${v}(${s})`,
              N = k._`(typeof ${v} == "function" ? ${M} : ${v}.test(${s}))`;
            return k._`${v} && ${v} !== true && ${y} === ${t} && !${N}`;
          }
        }
        function _() {
          let h = f.formats[schema];
          if (!h) {
            O();
            return;
          }
          if (h === !0) return;
          let [p, y, v] = q(h);
          if (p === t) e.pass(M());
          function O() {
            if (opts.strictSchema === !1) {
              f.logger.warn(N());
              return;
            }
            throw Error(N());
            function N() {
              return `unknown format "${schema}" ignored in schema at path "${errSchemaPath}"`;
            }
          }
          function q(N) {
            let ee =
                N instanceof RegExp
                  ? k.regexpCode(N)
                  : opts.code.formats
                    ? k._`${opts.code.formats}${k.getProperty(schema)}`
                    : void 0,
              scopeValue = gen.scopeValue("formats", { key: schema, ref: N, code: ee });
            if (typeof N == "object" && !(N instanceof RegExp))
              return [N.type || "string", N.validate, k._`${scopeValue}.validate`];
            return ["string", N, scopeValue];
          }
          function M() {
            if (typeof h == "object" && !(h instanceof RegExp) && h.async) {
              if (!schemaEnv.$async) throw Error("async format in sync schema");
              return k._`await ${v}(${s})`;
            }
            return typeof y == "function" ? k._`${v}(${s})` : k._`${v}.test(${s})`;
          }
        }
      },
    };
  Yi.default = ih;
});

export { Zi };

/**
 * ajv-formats/dist/limit.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv-formats@3.0.1
 * pieces: chunk-zykv69v4.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { nlr } from "../../ajv/dist/ajv.js";
import { uh } from "../../ajv/dist/compile/codegen/index.js";

//@ chunk-zykv69v4.js:8167-9708 cjs-fingerprint
var re = x(function (te) {
  Object.defineProperty(te, "__esModule", { value: !0 });
  te.formatLimitDefinition = void 0;
  var ee = nlr(),
    l = uh(),
    operators = l.operators,
    I = {
      formatMaximum: { okStr: "<=", ok: operators.LTE, fail: operators.GT },
      formatMinimum: { okStr: ">=", ok: operators.GTE, fail: operators.LT },
      formatExclusiveMaximum: { okStr: "<", ok: operators.LT, fail: operators.GTE },
      formatExclusiveMinimum: { okStr: ">", ok: operators.GT, fail: operators.LTE },
    },
    Ee = {
      message: ({ keyword: keyword, schemaCode: schemaCode }) =>
        l.str`should be ${I[keyword].okStr} ${schemaCode}`,
      params: ({ keyword: keyword, schemaCode: schemaCode }) =>
        l._`{comparison: ${I[keyword].okStr}, limit: ${schemaCode}}`,
    };
  te.formatLimitDefinition = {
    keyword: Object.keys(I),
    type: "string",
    schemaType: "string",
    $data: !0,
    error: Ee,
    code(e) {
      let { gen: gen, data: r, schemaCode: schemaCode, keyword: keyword, it: it } = e,
        { opts: opts, self: u } = it;
      if (!opts.validateFormats) return;
      let p = new ee.KeywordCxt(it, u.RULES.all.format.definition, "format");
      if (p.$data) i();
      else c();
      function i() {
        let scopeValue = gen.scopeValue("formats", { ref: u.formats, code: opts.code.formats }),
          m = gen.const("fmt", l._`${scopeValue}[${p.schemaCode}]`);
        e.fail$data(
          l.or(
            l._`typeof ${m} != "object"`,
            l._`${m} instanceof RegExp`,
            l._`typeof ${m}.compare != "function"`,
            d(m),
          ),
        );
      }
      function c() {
        let schema = p.schema,
          m = u.formats[schema];
        if (!m || m === !0) return;
        if (typeof m != "object" || m instanceof RegExp || typeof m.compare != "function")
          throw Error(`"${keyword}": format "${schema}" does not define "compare" function`);
        let scopeValue = gen.scopeValue("formats", {
          key: schema,
          ref: m,
          code: opts.code.formats ? l._`${opts.code.formats}${l.getProperty(schema)}` : void 0,
        });
        e.fail$data(d(scopeValue));
      }
      function d(f) {
        return l._`${f}.compare(${r}, ${schemaCode}) ${I[keyword].fail} 0`;
      }
    },
    dependencies: ["format"],
  };
  var Me = (e) => (e.addKeyword(te.formatLimitDefinition), e);
  te.default = Me;
});

export { re };

/**
 * ajv-formats/dist/limit.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv-formats@3.0.1
 * pieces: chunk-efaj9q04.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_ajv } from "../../ajv/dist/ajv.js";
import { require_codegen_2 as require_codegen } from "../../ajv/dist/compile/codegen/index.js";

//@ chunk-efaj9q04.js:8167-9708 cjs-fingerprint
var require_limit = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.formatLimitDefinition = undefined;
  var ajv_1 = require_ajv();
  var codegen_1 = require_codegen();
  var ops = codegen_1.operators;
  var KWDs = {
    formatMaximum: {
      okStr: "<=",
      ok: ops.LTE,
      fail: ops.GT,
    },
    formatMinimum: {
      okStr: ">=",
      ok: ops.GTE,
      fail: ops.LT,
    },
    formatExclusiveMaximum: {
      okStr: "<",
      ok: ops.LT,
      fail: ops.GTE,
    },
    formatExclusiveMinimum: {
      okStr: ">",
      ok: ops.GT,
      fail: ops.LTE,
    },
  };
  var error = {
    message: ({ keyword, schemaCode }) => codegen_1.str`should be ${KWDs[keyword].okStr} ${schemaCode}`,
    params: ({ keyword, schemaCode }) =>
      codegen_1._`{comparison: ${KWDs[keyword].okStr}, limit: ${schemaCode}}`,
  };
  cjsExports.formatLimitDefinition = {
    keyword: Object.keys(KWDs),
    type: "string",
    schemaType: "string",
    $data: true,
    error,
    code(cxt) {
      let { gen, data, schemaCode, keyword, it } = cxt;
      let { opts, self: ajv } = it;
      if (!opts.validateFormats) return;
      let fCxt = new ajv_1.KeywordCxt(it, ajv.RULES.all.format.definition, "format");
      if (fCxt.$data) validate$DataFormat();
      else validateFormat();
      function validate$DataFormat() {
        let fmts = gen.scopeValue("formats", {
          ref: ajv.formats,
          code: opts.code.formats,
        });
        let fmt = gen.const("fmt", codegen_1._`${fmts}[${fCxt.schemaCode}]`);
        cxt.fail$data(
          codegen_1.or(
            codegen_1._`typeof ${fmt} != "object"`,
            codegen_1._`${fmt} instanceof RegExp`,
            codegen_1._`typeof ${fmt}.compare != "function"`,
            compareCode(fmt),
          ),
        );
      }
      function validateFormat() {
        let format = fCxt.schema;
        let fmtDef = ajv.formats[format];
        if (!fmtDef || fmtDef === true) return;
        if (typeof fmtDef != "object" || fmtDef instanceof RegExp || typeof fmtDef.compare != "function")
          throw Error(`"${keyword}": format "${format}" does not define "compare" function`);
        let fmt = gen.scopeValue("formats", {
          key: format,
          ref: fmtDef,
          code: opts.code.formats
            ? codegen_1._`${opts.code.formats}${codegen_1.getProperty(format)}`
            : undefined,
        });
        cxt.fail$data(compareCode(fmt));
      }
      function compareCode(fmt) {
        return codegen_1._`${fmt}.compare(${data}, ${schemaCode}) ${KWDs[keyword].fail} 0`;
      }
    },
    dependencies: ["format"],
  };
  var formatLimitPlugin = (ajv) => {
    ajv.addKeyword(cjsExports.formatLimitDefinition);
    return ajv;
  };
  cjsExports.default = formatLimitPlugin;
});
export { require_limit };

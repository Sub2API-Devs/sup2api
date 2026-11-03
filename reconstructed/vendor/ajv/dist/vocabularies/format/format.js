/**
 * ajv/dist/vocabularies/format/format.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { require_codegen_2 } from "../../compile/codegen/index.js";

//@ chunk-s82q9s4x.js:106427-108297 cjs-fingerprint
var require_format_6 = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var codegen_1 = require_codegen_2();
  var error = {
    message: ({ schemaCode }) => codegen_1.str`must match format "${schemaCode}"`,
    params: ({ schemaCode }) => codegen_1._`{format: ${schemaCode}}`,
  };
  var def = {
    keyword: "format",
    type: ["number", "string"],
    schemaType: "string",
    $data: true,
    error,
    code(cxt, ruleType) {
      let { gen, data, $data, schema, schemaCode, it } = cxt;
      let { opts, errSchemaPath, schemaEnv, self: f } = it;
      if (!opts.validateFormats) return;
      if ($data) validate$DataFormat();
      else validateFormat();
      function validate$DataFormat() {
        let fmts = gen.scopeValue("formats", {
          ref: f.formats,
          code: opts.code.formats,
        });
        let fDef = gen.const("fDef", codegen_1._`${fmts}[${schemaCode}]`);
        let fType = gen.let("fType");
        let format = gen.let("format");
        gen.if(
          codegen_1._`typeof ${fDef} == "object" && !(${fDef} instanceof RegExp)`,
          () =>
            gen
              .assign(fType, codegen_1._`${fDef}.type || "string"`)
              .assign(format, codegen_1._`${fDef}.validate`),
          () => gen.assign(fType, codegen_1._`"string"`).assign(format, fDef),
        );
        cxt.fail$data(codegen_1.or(unknownFmt(), invalidFmt()));
        function unknownFmt() {
          if (opts.strictSchema === false) return codegen_1.nil;
          return codegen_1._`${schemaCode} && !${format}`;
        }
        function invalidFmt() {
          let callFormat = schemaEnv.$async
            ? codegen_1._`(${fDef}.async ? await ${format}(${data}) : ${format}(${data}))`
            : codegen_1._`${format}(${data})`;
          let validData = codegen_1._`(typeof ${format} == "function" ? ${callFormat} : ${format}.test(${data}))`;
          return codegen_1._`${format} && ${format} !== true && ${fType} === ${ruleType} && !${validData}`;
        }
      }
      function validateFormat() {
        let formatDef = f.formats[schema];
        if (!formatDef) {
          unknownFormat();
          return;
        }
        if (formatDef === true) return;
        let [fmtType, format, fmtRef] = getFormat(formatDef);
        if (fmtType === ruleType) cxt.pass(validCondition());
        function unknownFormat() {
          if (opts.strictSchema === false) {
            f.logger.warn(unknownMsg());
            return;
          }
          throw Error(unknownMsg());
          function unknownMsg() {
            return `unknown format "${schema}" ignored in schema at path "${errSchemaPath}"`;
          }
        }
        function getFormat(fmtDef) {
          let code =
            fmtDef instanceof RegExp
              ? codegen_1.regexpCode(fmtDef)
              : opts.code.formats
                ? codegen_1._`${opts.code.formats}${codegen_1.getProperty(schema)}`
                : undefined;
          let fmt = gen.scopeValue("formats", {
            key: schema,
            ref: fmtDef,
            code,
          });
          if (typeof fmtDef == "object" && !(fmtDef instanceof RegExp))
            return [fmtDef.type || "string", fmtDef.validate, codegen_1._`${fmt}.validate`];
          return ["string", fmtDef, fmt];
        }
        function validCondition() {
          if (typeof formatDef == "object" && !(formatDef instanceof RegExp) && formatDef.async) {
            if (!schemaEnv.$async) throw Error("async format in sync schema");
            return codegen_1._`await ${fmtRef}(${data})`;
          }
          return typeof format == "function"
            ? codegen_1._`${fmtRef}(${data})`
            : codegen_1._`${fmtRef}.test(${data})`;
        }
      }
    },
  };
  cjsExports.default = def;
});
export { require_format_6 };

/**
 * ajv/dist/compile/validate/keyword.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_codegen_2 } from "../codegen/index.js";
import { require_names } from "../names.js";
import { require_code_2 } from "../../vocabularies/code.js";
import { require_errors } from "../errors.js";

//@ chunk-s82q9s4x.js:33752-36663 cjs-fingerprint
var require_keyword = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.validateKeywordUsage =
    cjsExports.validSchemaType =
    cjsExports.funcKeywordCode =
    cjsExports.macroKeywordCode =
      undefined;
  var codegen_1 = require_codegen_2();
  var names_1 = require_names();
  var code_1 = require_code_2();
  var errors_1 = require_errors();
  function macroKeywordCode(cxt, def) {
    let { gen, keyword, schema, parentSchema, it } = cxt;
    let macroSchema = def.macro.call(it.self, schema, parentSchema, it);
    let schemaRef = useKeyword(gen, keyword, macroSchema);
    if (it.opts.validateSchema !== false) it.self.validateSchema(macroSchema, true);
    let valid = gen.name("valid");
    cxt.subschema(
      {
        schema: macroSchema,
        schemaPath: codegen_1.nil,
        errSchemaPath: `${it.errSchemaPath}/${keyword}`,
        topSchemaRef: schemaRef,
        compositeRule: true,
      },
      valid,
    );
    cxt.pass(valid, () => cxt.error(true));
  }
  cjsExports.macroKeywordCode = macroKeywordCode;
  function funcKeywordCode(cxt, def) {
    var _a;
    let { gen, keyword, schema, parentSchema, $data, it } = cxt;
    checkAsyncKeyword(it, def);
    let validate = !$data && def.compile ? def.compile.call(it.self, schema, parentSchema, it) : def.validate;
    let validateRef = useKeyword(gen, keyword, validate);
    let valid = gen.let("valid");
    cxt.block$data(valid, validateKeyword);
    cxt.ok((_a = def.valid) !== null && _a !== undefined ? _a : valid);
    function validateKeyword() {
      if (def.errors === false) {
        assignValid();
        if (def.modifying) modifyData(cxt);
        reportErrs(() => cxt.error());
      } else {
        let ruleErrs = def.async ? validateAsync() : validateSync();
        if (def.modifying) modifyData(cxt);
        reportErrs(() => addErrs(cxt, ruleErrs));
      }
    }
    function validateAsync() {
      let ruleErrs = gen.let("ruleErrs", null);
      gen.try(
        () => assignValid(codegen_1._`await `),
        (e) =>
          gen.assign(valid, false).if(
            codegen_1._`${e} instanceof ${it.ValidationError}`,
            () => gen.assign(ruleErrs, codegen_1._`${e}.errors`),
            () => gen.throw(e),
          ),
      );
      return ruleErrs;
    }
    function validateSync() {
      let validateErrs = codegen_1._`${validateRef}.errors`;
      gen.assign(validateErrs, null);
      assignValid(codegen_1.nil);
      return validateErrs;
    }
    function assignValid(_await = def.async ? codegen_1._`await ` : codegen_1.nil) {
      let passCxt = it.opts.passContext ? names_1.default.this : names_1.default.self;
      let passSchema = !(("compile" in def && !$data) || def.schema === false);
      gen.assign(
        valid,
        codegen_1._`${_await}${code_1.callValidateCode(cxt, validateRef, passCxt, passSchema)}`,
        def.modifying,
      );
    }
    function reportErrs(errors) {
      var _a;
      gen.if(codegen_1.not((_a = def.valid) !== null && _a !== undefined ? _a : valid), errors);
    }
  }
  cjsExports.funcKeywordCode = funcKeywordCode;
  function modifyData(cxt) {
    let { gen, data, it } = cxt;
    gen.if(it.parentData, () => gen.assign(data, codegen_1._`${it.parentData}[${it.parentDataProperty}]`));
  }
  function addErrs(cxt, errs) {
    let { gen } = cxt;
    gen.if(
      codegen_1._`Array.isArray(${errs})`,
      () => {
        gen
          .assign(
            names_1.default.vErrors,
            codegen_1._`${names_1.default.vErrors} === null ? ${errs} : ${names_1.default.vErrors}.concat(${errs})`,
          )
          .assign(names_1.default.errors, codegen_1._`${names_1.default.vErrors}.length`);
        errors_1.extendErrors(cxt);
      },
      () => cxt.error(),
    );
  }
  function checkAsyncKeyword({ schemaEnv }, def) {
    if (def.async && !schemaEnv.$async) throw Error("async keyword in sync schema");
  }
  function useKeyword(gen, keyword, result) {
    if (result === undefined) throw Error(`keyword "${keyword}" failed to compile`);
    return gen.scopeValue(
      "keyword",
      typeof result == "function"
        ? {
            ref: result,
          }
        : {
            ref: result,
            code: codegen_1.stringify(result),
          },
    );
  }
  function validSchemaType(schema, schemaType, allowUndefined = false) {
    return (
      !schemaType.length ||
      schemaType.some((st) =>
        st === "array"
          ? Array.isArray(schema)
          : st === "object"
            ? schema && typeof schema == "object" && !Array.isArray(schema)
            : typeof schema == st || (allowUndefined && typeof schema === "undefined"),
      )
    );
  }
  cjsExports.validSchemaType = validSchemaType;
  function validateKeywordUsage({ schema, opts, self: ajvInstance, errSchemaPath }, def, keyword) {
    if (Array.isArray(def.keyword) ? !def.keyword.includes(keyword) : def.keyword !== keyword)
      throw Error("ajv implementation error");
    let deps = def.dependencies;
    if (
      deps === null || deps === undefined
        ? undefined
        : deps.some((kwd) => !Object.prototype.hasOwnProperty.call(schema, kwd))
    )
      throw Error(`parent schema must have dependencies of ${keyword}: ${deps.join(",")}`);
    if (def.validateSchema) {
      if (!def.validateSchema(schema[keyword])) {
        let msg =
          `keyword "${keyword}" value is invalid at path "${errSchemaPath}": ` +
          ajvInstance.errorsText(def.validateSchema.errors);
        if (opts.validateSchema === "log") ajvInstance.logger.error(msg);
        else throw Error(msg);
      }
    }
  }
  cjsExports.validateKeywordUsage = validateKeywordUsage;
});
export { require_keyword };

/**
 * ajv/dist/compile/errors.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-xcs4sv9h.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_codegen_2 } from "./codegen/index.js";
import { require_util_2 } from "./util.js";
import { require_names } from "./names.js";

//@ chunk-xcs4sv9h.js:21375-24395 cjs-fingerprint
var require_errors = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.extendErrors =
    cjsExports.resetErrorsCount =
    cjsExports.reportExtraError =
    cjsExports.reportError =
    cjsExports.keyword$DataError =
    cjsExports.keywordError =
      undefined;
  var codegen_1 = require_codegen_2();
  var util_1 = require_util_2();
  var names_1 = require_names();
  cjsExports.keywordError = {
    message: ({ keyword }) => codegen_1.str`must pass "${keyword}" keyword validation`,
  };
  cjsExports.keyword$DataError = {
    message: ({ keyword, schemaType }) =>
      schemaType
        ? codegen_1.str`"${keyword}" keyword must be ${schemaType} ($data)`
        : codegen_1.str`"${keyword}" keyword is invalid ($data)`,
  };
  function reportError(cxt, error = cjsExports.keywordError, errorPaths, overrideAllErrors) {
    let { it } = cxt;
    let { gen, compositeRule, allErrors } = it;
    let errObj = errorObjectCode(cxt, error, errorPaths);
    if (
      overrideAllErrors !== null && overrideAllErrors !== undefined
        ? overrideAllErrors
        : compositeRule || allErrors
    )
      addError(gen, errObj);
    else returnErrors(it, codegen_1._`[${errObj}]`);
  }
  cjsExports.reportError = reportError;
  function reportExtraError(cxt, error = cjsExports.keywordError, errorPaths) {
    let { it } = cxt;
    let { gen, compositeRule, allErrors } = it;
    let errObj = errorObjectCode(cxt, error, errorPaths);
    addError(gen, errObj);
    if (!(compositeRule || allErrors)) returnErrors(it, names_1.default.vErrors);
  }
  cjsExports.reportExtraError = reportExtraError;
  function resetErrorsCount(gen, errsCount) {
    gen.assign(names_1.default.errors, errsCount);
    gen.if(codegen_1._`${names_1.default.vErrors} !== null`, () =>
      gen.if(
        errsCount,
        () => gen.assign(codegen_1._`${names_1.default.vErrors}.length`, errsCount),
        () => gen.assign(names_1.default.vErrors, null),
      ),
    );
  }
  cjsExports.resetErrorsCount = resetErrorsCount;
  function extendErrors({ gen, keyword, schemaValue, data, errsCount, it }) {
    if (errsCount === undefined) throw Error("ajv implementation error");
    let err = gen.name("err");
    gen.forRange("i", errsCount, names_1.default.errors, (i) => {
      gen.const(err, codegen_1._`${names_1.default.vErrors}[${i}]`);
      gen.if(codegen_1._`${err}.instancePath === undefined`, () =>
        gen.assign(
          codegen_1._`${err}.instancePath`,
          codegen_1.strConcat(names_1.default.instancePath, it.errorPath),
        ),
      );
      gen.assign(codegen_1._`${err}.schemaPath`, codegen_1.str`${it.errSchemaPath}/${keyword}`);
      if (it.opts.verbose) {
        gen.assign(codegen_1._`${err}.schema`, schemaValue);
        gen.assign(codegen_1._`${err}.data`, data);
      }
    });
  }
  cjsExports.extendErrors = extendErrors;
  function addError(gen, errObj) {
    let err = gen.const("err", errObj);
    gen.if(
      codegen_1._`${names_1.default.vErrors} === null`,
      () => gen.assign(names_1.default.vErrors, codegen_1._`[${err}]`),
      codegen_1._`${names_1.default.vErrors}.push(${err})`,
    );
    gen.code(codegen_1._`${names_1.default.errors}++`);
  }
  function returnErrors(it, errs) {
    let { gen, validateName, schemaEnv } = it;
    if (schemaEnv.$async) gen.throw(codegen_1._`new ${it.ValidationError}(${errs})`);
    else {
      gen.assign(codegen_1._`${validateName}.errors`, errs);
      gen.return(false);
    }
  }
  var E = {
    keyword: new codegen_1.Name("keyword"),
    schemaPath: new codegen_1.Name("schemaPath"),
    params: new codegen_1.Name("params"),
    propertyName: new codegen_1.Name("propertyName"),
    message: new codegen_1.Name("message"),
    schema: new codegen_1.Name("schema"),
    parentSchema: new codegen_1.Name("parentSchema"),
  };
  function errorObjectCode(cxt, error, errorPaths) {
    let { createErrors } = cxt.it;
    if (createErrors === false) return codegen_1._`{}`;
    return errorObject(cxt, error, errorPaths);
  }
  function errorObject(cxt, error, errorPaths = {}) {
    let { gen, it } = cxt;
    let keyValues = [errorInstancePath(it, errorPaths), errorSchemaPath(cxt, errorPaths)];
    extraErrorProps(cxt, error, keyValues);
    return gen.object(...keyValues);
  }
  function errorInstancePath({ errorPath }, { instancePath }) {
    let instPath = instancePath
      ? codegen_1.str`${errorPath}${util_1.getErrorPath(instancePath, util_1.Type.Str)}`
      : errorPath;
    return [names_1.default.instancePath, codegen_1.strConcat(names_1.default.instancePath, instPath)];
  }
  function errorSchemaPath({ keyword, it: { errSchemaPath } }, { schemaPath, parentSchema }) {
    let schPath = parentSchema ? errSchemaPath : codegen_1.str`${errSchemaPath}/${keyword}`;
    if (schemaPath) schPath = codegen_1.str`${schPath}${util_1.getErrorPath(schemaPath, util_1.Type.Str)}`;
    return [E.schemaPath, schPath];
  }
  function extraErrorProps(cxt, { params, message }, keyValues) {
    let { keyword, data, schemaValue, it } = cxt;
    let { opts, propertyName, topSchemaRef, schemaPath } = it;
    keyValues.push(
      [E.keyword, keyword],
      [E.params, typeof params == "function" ? params(cxt) : params || codegen_1._`{}`],
    );
    if (opts.messages) keyValues.push([E.message, typeof message == "function" ? message(cxt) : message]);
    if (opts.verbose)
      keyValues.push(
        [E.schema, schemaValue],
        [E.parentSchema, codegen_1._`${topSchemaRef}${schemaPath}`],
        [names_1.default.data, data],
      );
    if (propertyName) keyValues.push([E.propertyName, propertyName]);
  }
});
export { require_errors };

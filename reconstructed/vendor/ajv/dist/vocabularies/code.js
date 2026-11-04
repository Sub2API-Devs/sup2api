/**
 * ajv/dist/vocabularies/code.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_codegen_2 } from "../compile/codegen/index.js";
import { require_util_2 } from "../compile/util.js";
import { require_names } from "../compile/names.js";

//@ chunk-s82q9s4x.js:30715-33752 cjs-fingerprint
var require_code_2 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.validateUnion =
    cjsExports.validateArray =
    cjsExports.usePattern =
    cjsExports.callValidateCode =
    cjsExports.schemaProperties =
    cjsExports.allSchemaProperties =
    cjsExports.noPropertyInData =
    cjsExports.propertyInData =
    cjsExports.isOwnProperty =
    cjsExports.hasPropFunc =
    cjsExports.reportMissingProp =
    cjsExports.checkMissingProp =
    cjsExports.checkReportMissingProp =
      undefined;
  var codegen_1 = require_codegen_2();
  var util_1 = require_util_2();
  var names_1 = require_names();
  var util_2 = require_util_2();
  function checkReportMissingProp(cxt, prop) {
    let { gen, data, it } = cxt;
    gen.if(noPropertyInData(gen, data, prop, it.opts.ownProperties), () => {
      cxt.setParams(
        {
          missingProperty: codegen_1._`${prop}`,
        },
        true,
      );
      cxt.error();
    });
  }
  cjsExports.checkReportMissingProp = checkReportMissingProp;
  function checkMissingProp({ gen, data, it: { opts } }, properties, missing) {
    return codegen_1.or(
      ...properties.map((prop) =>
        codegen_1.and(
          noPropertyInData(gen, data, prop, opts.ownProperties),
          codegen_1._`${missing} = ${prop}`,
        ),
      ),
    );
  }
  cjsExports.checkMissingProp = checkMissingProp;
  function reportMissingProp(cxt, missing) {
    cxt.setParams(
      {
        missingProperty: missing,
      },
      true,
    );
    cxt.error();
  }
  cjsExports.reportMissingProp = reportMissingProp;
  function hasPropFunc(gen) {
    return gen.scopeValue("func", {
      ref: Object.prototype.hasOwnProperty,
      code: codegen_1._`Object.prototype.hasOwnProperty`,
    });
  }
  cjsExports.hasPropFunc = hasPropFunc;
  function isOwnProperty(gen, data, property) {
    return codegen_1._`${hasPropFunc(gen)}.call(${data}, ${property})`;
  }
  cjsExports.isOwnProperty = isOwnProperty;
  function propertyInData(gen, data, property, ownProperties) {
    let cond = codegen_1._`${data}${codegen_1.getProperty(property)} !== undefined`;
    return ownProperties ? codegen_1._`${cond} && ${isOwnProperty(gen, data, property)}` : cond;
  }
  cjsExports.propertyInData = propertyInData;
  function noPropertyInData(gen, data, property, ownProperties) {
    let cond = codegen_1._`${data}${codegen_1.getProperty(property)} === undefined`;
    return ownProperties ? codegen_1.or(cond, codegen_1.not(isOwnProperty(gen, data, property))) : cond;
  }
  cjsExports.noPropertyInData = noPropertyInData;
  function allSchemaProperties(schemaMap) {
    return schemaMap ? Object.keys(schemaMap).filter((p) => p !== "__proto__") : [];
  }
  cjsExports.allSchemaProperties = allSchemaProperties;
  function schemaProperties(it, schemaMap) {
    return allSchemaProperties(schemaMap).filter((p) => !util_1.alwaysValidSchema(it, schemaMap[p]));
  }
  cjsExports.schemaProperties = schemaProperties;
  function callValidateCode(
    { schemaCode, data, it: { gen, topSchemaRef, schemaPath, errorPath }, it },
    func,
    context,
    passSchema,
  ) {
    let dataAndSchema = passSchema ? codegen_1._`${schemaCode}, ${data}, ${topSchemaRef}${schemaPath}` : data;
    let valCxt = [
      [names_1.default.instancePath, codegen_1.strConcat(names_1.default.instancePath, errorPath)],
      [names_1.default.parentData, it.parentData],
      [names_1.default.parentDataProperty, it.parentDataProperty],
      [names_1.default.rootData, names_1.default.rootData],
    ];
    if (it.opts.dynamicRef) valCxt.push([names_1.default.dynamicAnchors, names_1.default.dynamicAnchors]);
    let args = codegen_1._`${dataAndSchema}, ${gen.object(...valCxt)}`;
    return context !== codegen_1.nil
      ? codegen_1._`${func}.call(${context}, ${args})`
      : codegen_1._`${func}(${args})`;
  }
  cjsExports.callValidateCode = callValidateCode;
  var newRegExp = codegen_1._`new RegExp`;
  function usePattern({ gen, it: { opts } }, pattern) {
    let u = opts.unicodeRegExp ? "u" : "";
    let { regExp } = opts.code;
    let rx = regExp(pattern, u);
    return gen.scopeValue("pattern", {
      key: rx.toString(),
      ref: rx,
      code: codegen_1._`${regExp.code === "new RegExp" ? newRegExp : util_2.useFunc(gen, regExp)}(${pattern}, ${u})`,
    });
  }
  cjsExports.usePattern = usePattern;
  function validateArray(cxt) {
    let { gen, data, keyword, it } = cxt;
    let valid = gen.name("valid");
    if (it.allErrors) {
      let validArr = gen.let("valid", true);
      validateItems(() => gen.assign(validArr, false));
      return validArr;
    }
    gen.var(valid, true);
    validateItems(() => gen.break());
    return valid;
    function validateItems(notValid) {
      let len = gen.const("len", codegen_1._`${data}.length`);
      gen.forRange("i", 0, len, (i) => {
        cxt.subschema(
          {
            keyword,
            dataProp: i,
            dataPropType: util_1.Type.Num,
          },
          valid,
        );
        gen.if(codegen_1.not(valid), notValid);
      });
    }
  }
  cjsExports.validateArray = validateArray;
  function validateUnion(cxt) {
    let { gen, schema, keyword, it } = cxt;
    if (!Array.isArray(schema)) throw Error("ajv implementation error");
    if (schema.some((sch) => util_1.alwaysValidSchema(it, sch)) && !it.opts.unevaluated) return;
    let valid = gen.let("valid", false);
    let schValid = gen.name("_valid");
    gen.block(() =>
      schema.forEach((_sch, i) => {
        let schCxt = cxt.subschema(
          {
            keyword,
            schemaProp: i,
            compositeRule: true,
          },
          schValid,
        );
        gen.assign(valid, codegen_1._`${valid} || ${schValid}`);
        if (!cxt.mergeValidEvaluated(schCxt, schValid)) gen.if(codegen_1.not(valid));
      }),
    );
    cxt.result(
      valid,
      () => cxt.reset(),
      () => cxt.error(true),
    );
  }
  cjsExports.validateUnion = validateUnion;
});
export { require_code_2 };

/**
 * ajv/dist/compile/validate/dataType.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-xcs4sv9h.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_rules_2 } from "../rules.js";
import { require_applicability } from "./applicability.js";
import { require_errors } from "../errors.js";
import { require_codegen_2 } from "../codegen/index.js";
import { require_util_2 } from "../util.js";

//@ chunk-xcs4sv9h.js:26116-30071 cjs-fingerprint
var require_dataType_2 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.reportTypeError =
    cjsExports.checkDataTypes =
    cjsExports.checkDataType =
    cjsExports.coerceAndCheckDataType =
    cjsExports.getJSONTypes =
    cjsExports.getSchemaTypes =
    cjsExports.DataType =
      undefined;
  var rules_1 = require_rules_2();
  var applicability_1 = require_applicability();
  var errors_1 = require_errors();
  var codegen_1 = require_codegen_2();
  var util_1 = require_util_2();
  var DataType;
  (function (DataType) {
    DataType[(DataType.Correct = 0)] = "Correct";
    DataType[(DataType.Wrong = 1)] = "Wrong";
  })(DataType || (cjsExports.DataType = DataType = {}));
  function getSchemaTypes(schema) {
    let types = getJSONTypes(schema.type);
    if (types.includes("null")) {
      if (schema.nullable === false) throw Error("type: null contradicts nullable: false");
    } else {
      if (!types.length && schema.nullable !== undefined)
        throw Error('"nullable" cannot be used without "type"');
      if (schema.nullable === true) types.push("null");
    }
    return types;
  }
  cjsExports.getSchemaTypes = getSchemaTypes;
  function getJSONTypes(ts) {
    let types = Array.isArray(ts) ? ts : ts ? [ts] : [];
    if (types.every(rules_1.isJSONType)) return types;
    throw Error("type must be JSONType or JSONType[]: " + types.join(","));
  }
  cjsExports.getJSONTypes = getJSONTypes;
  function coerceAndCheckDataType(it, types) {
    let { gen, data, opts } = it;
    let coerceTo = coerceToTypes(types, opts.coerceTypes);
    let checkTypes =
      types.length > 0 &&
      !(coerceTo.length === 0 && types.length === 1 && applicability_1.schemaHasRulesForType(it, types[0]));
    if (checkTypes) {
      let wrongType = checkDataTypes(types, data, opts.strictNumbers, DataType.Wrong);
      gen.if(wrongType, () => {
        if (coerceTo.length) coerceData(it, types, coerceTo);
        else reportTypeError(it);
      });
    }
    return checkTypes;
  }
  cjsExports.coerceAndCheckDataType = coerceAndCheckDataType;
  var COERCIBLE = new Set(["string", "number", "integer", "boolean", "null"]);
  function coerceToTypes(types, coerceTypes) {
    return coerceTypes
      ? types.filter((t) => COERCIBLE.has(t) || (coerceTypes === "array" && t === "array"))
      : [];
  }
  function coerceData(it, types, coerceTo) {
    let { gen, data, opts } = it;
    let dataType = gen.let("dataType", codegen_1._`typeof ${data}`);
    let coerced = gen.let("coerced", codegen_1._`undefined`);
    if (opts.coerceTypes === "array")
      gen.if(codegen_1._`${dataType} == 'object' && Array.isArray(${data}) && ${data}.length == 1`, () =>
        gen
          .assign(data, codegen_1._`${data}[0]`)
          .assign(dataType, codegen_1._`typeof ${data}`)
          .if(checkDataTypes(types, data, opts.strictNumbers), () => gen.assign(coerced, data)),
      );
    gen.if(codegen_1._`${coerced} !== undefined`);
    for (let t of coerceTo)
      if (COERCIBLE.has(t) || (t === "array" && opts.coerceTypes === "array")) coerceSpecificType(t);
    gen.else();
    reportTypeError(it);
    gen.endIf();
    gen.if(codegen_1._`${coerced} !== undefined`, () => {
      gen.assign(data, coerced);
      assignParentData(it, coerced);
    });
    function coerceSpecificType(t) {
      switch (t) {
        case "string":
          gen
            .elseIf(codegen_1._`${dataType} == "number" || ${dataType} == "boolean"`)
            .assign(coerced, codegen_1._`"" + ${data}`)
            .elseIf(codegen_1._`${data} === null`)
            .assign(coerced, codegen_1._`""`);
          return;
        case "number":
          gen
            .elseIf(
              codegen_1._`${dataType} == "boolean" || ${data} === null
              || (${dataType} == "string" && ${data} && ${data} == +${data})`,
            )
            .assign(coerced, codegen_1._`+${data}`);
          return;
        case "integer":
          gen
            .elseIf(
              codegen_1._`${dataType} === "boolean" || ${data} === null
              || (${dataType} === "string" && ${data} && ${data} == +${data} && !(${data} % 1))`,
            )
            .assign(coerced, codegen_1._`+${data}`);
          return;
        case "boolean":
          gen
            .elseIf(codegen_1._`${data} === "false" || ${data} === 0 || ${data} === null`)
            .assign(coerced, false)
            .elseIf(codegen_1._`${data} === "true" || ${data} === 1`)
            .assign(coerced, true);
          return;
        case "null":
          gen.elseIf(codegen_1._`${data} === "" || ${data} === 0 || ${data} === false`);
          gen.assign(coerced, null);
          return;
        case "array":
          gen
            .elseIf(
              codegen_1._`${dataType} === "string" || ${dataType} === "number"
              || ${dataType} === "boolean" || ${data} === null`,
            )
            .assign(coerced, codegen_1._`[${data}]`);
      }
    }
  }
  function assignParentData({ gen, parentData, parentDataProperty }, expr) {
    gen.if(codegen_1._`${parentData} !== undefined`, () =>
      gen.assign(codegen_1._`${parentData}[${parentDataProperty}]`, expr),
    );
  }
  function checkDataType(dataType, data, strictNums, correct = DataType.Correct) {
    let EQ = correct === DataType.Correct ? codegen_1.operators.EQ : codegen_1.operators.NEQ;
    let cond;
    switch (dataType) {
      case "null":
        return codegen_1._`${data} ${EQ} null`;
      case "array":
        cond = codegen_1._`Array.isArray(${data})`;
        break;
      case "object":
        cond = codegen_1._`${data} && typeof ${data} == "object" && !Array.isArray(${data})`;
        break;
      case "integer":
        cond = numCond(codegen_1._`!(${data} % 1) && !isNaN(${data})`);
        break;
      case "number":
        cond = numCond();
        break;
      default:
        return codegen_1._`typeof ${data} ${EQ} ${dataType}`;
    }
    return correct === DataType.Correct ? cond : codegen_1.not(cond);
    function numCond(_cond = codegen_1.nil) {
      return codegen_1.and(
        codegen_1._`typeof ${data} == "number"`,
        _cond,
        strictNums ? codegen_1._`isFinite(${data})` : codegen_1.nil,
      );
    }
  }
  cjsExports.checkDataType = checkDataType;
  function checkDataTypes(dataTypes, data, strictNums, correct) {
    if (dataTypes.length === 1) return checkDataType(dataTypes[0], data, strictNums, correct);
    let cond;
    let types = util_1.toHash(dataTypes);
    if (types.array && types.object) {
      let notObj = codegen_1._`typeof ${data} != "object"`;
      cond = types.null ? notObj : codegen_1._`!${data} || ${notObj}`;
      delete types.null;
      delete types.array;
      delete types.object;
    } else cond = codegen_1.nil;
    if (types.number) delete types.integer;
    for (let t in types) cond = codegen_1.and(cond, checkDataType(t, data, strictNums, correct));
    return cond;
  }
  cjsExports.checkDataTypes = checkDataTypes;
  var typeError = {
    message: ({ schema }) => `must be ${schema}`,
    params: ({ schema, schemaValue }) =>
      typeof schema == "string" ? codegen_1._`{type: ${schema}}` : codegen_1._`{type: ${schemaValue}}`,
  };
  function reportTypeError(it) {
    let cxt = getTypeErrorContext(it);
    errors_1.reportError(cxt, typeError);
  }
  cjsExports.reportTypeError = reportTypeError;
  function getTypeErrorContext(it) {
    let { gen, data, schema } = it;
    let schemaCode = util_1.schemaRefOrVal(it, schema, "type");
    return {
      gen,
      keyword: "type",
      data,
      schema: schema.type,
      schemaCode,
      schemaValue: schemaCode,
      parentSchema: schema,
      params: {},
      it,
    };
  }
});
export { require_dataType_2 };

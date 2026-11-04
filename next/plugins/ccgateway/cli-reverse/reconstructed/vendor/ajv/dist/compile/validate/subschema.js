/**
 * ajv/dist/compile/validate/subschema.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_codegen_2 } from "../codegen/index.js";
import { require_util_2 } from "../util.js";

//@ chunk-s82q9s4x.js:36663-38567 cjs-fingerprint
var require_subschema = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.extendSubschemaMode = cjsExports.extendSubschemaData = cjsExports.getSubschema = undefined;
  var codegen_1 = require_codegen_2();
  var util_1 = require_util_2();
  function getSubschema(it, { keyword, schemaProp, schema, schemaPath, errSchemaPath, topSchemaRef }) {
    if (keyword !== undefined && schema !== undefined)
      throw Error('both "keyword" and "schema" passed, only one allowed');
    if (keyword !== undefined) {
      let sch = it.schema[keyword];
      return schemaProp === undefined
        ? {
            schema: sch,
            schemaPath: codegen_1._`${it.schemaPath}${codegen_1.getProperty(keyword)}`,
            errSchemaPath: `${it.errSchemaPath}/${keyword}`,
          }
        : {
            schema: sch[schemaProp],
            schemaPath: codegen_1._`${it.schemaPath}${codegen_1.getProperty(keyword)}${codegen_1.getProperty(schemaProp)}`,
            errSchemaPath: `${it.errSchemaPath}/${keyword}/${util_1.escapeFragment(schemaProp)}`,
          };
    }
    if (schema !== undefined) {
      if (schemaPath === undefined || errSchemaPath === undefined || topSchemaRef === undefined)
        throw Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"');
      return {
        schema,
        schemaPath,
        topSchemaRef,
        errSchemaPath,
      };
    }
    throw Error('either "keyword" or "schema" must be passed');
  }
  cjsExports.getSubschema = getSubschema;
  function extendSubschemaData(
    subschema,
    it,
    { dataProp, dataPropType: dpType, data, dataTypes, propertyName },
  ) {
    if (data !== undefined && dataProp !== undefined)
      throw Error('both "data" and "dataProp" passed, only one allowed');
    let { gen } = it;
    if (dataProp !== undefined) {
      let { errorPath, dataPathArr, opts } = it;
      let nextData = gen.let("data", codegen_1._`${it.data}${codegen_1.getProperty(dataProp)}`, true);
      dataContextProps(nextData);
      subschema.errorPath = codegen_1.str`${errorPath}${util_1.getErrorPath(dataProp, dpType, opts.jsPropertySyntax)}`;
      subschema.parentDataProperty = codegen_1._`${dataProp}`;
      subschema.dataPathArr = [...dataPathArr, subschema.parentDataProperty];
    }
    if (data !== undefined) {
      let nextData = data instanceof codegen_1.Name ? data : gen.let("data", data, true);
      dataContextProps(nextData);
      if (propertyName !== undefined) subschema.propertyName = propertyName;
    }
    if (dataTypes) subschema.dataTypes = dataTypes;
    function dataContextProps(_nextData) {
      subschema.data = _nextData;
      subschema.dataLevel = it.dataLevel + 1;
      subschema.dataTypes = [];
      it.definedProperties = new Set();
      subschema.parentData = it.data;
      subschema.dataNames = [...it.dataNames, _nextData];
    }
  }
  cjsExports.extendSubschemaData = extendSubschemaData;
  function extendSubschemaMode(
    subschema,
    { jtdDiscriminator, jtdMetadata, compositeRule, createErrors, allErrors },
  ) {
    if (compositeRule !== undefined) subschema.compositeRule = compositeRule;
    if (createErrors !== undefined) subschema.createErrors = createErrors;
    if (allErrors !== undefined) subschema.allErrors = allErrors;
    subschema.jtdDiscriminator = jtdDiscriminator;
    subschema.jtdMetadata = jtdMetadata;
  }
  cjsExports.extendSubschemaMode = extendSubschemaMode;
});
export { require_subschema };

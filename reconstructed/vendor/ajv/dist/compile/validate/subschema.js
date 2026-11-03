/**
 * ajv/dist/compile/validate/subschema.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { uh } from "../codegen/index.js";
import { ew } from "../util.js";

//@ chunk-s82q9s4x.js:36663-38567 cjs-fingerprint
var an = x(function (nn) {
  Object.defineProperty(nn, "__esModule", { value: !0 });
  nn.extendSubschemaMode = nn.extendSubschemaData = nn.getSubschema = void 0;
  var K = uh(),
    Nt = ew();
  function Mu(
    e,
    {
      keyword: keyword,
      schemaProp: schemaProp,
      schema: schema,
      schemaPath: schemaPath,
      errSchemaPath: errSchemaPath,
      topSchemaRef: topSchemaRef,
    },
  ) {
    if (keyword !== void 0 && schema !== void 0)
      throw Error('both "keyword" and "schema" passed, only one allowed');
    if (keyword !== void 0) {
      let a = e.schema[keyword];
      return schemaProp === void 0
        ? {
            schema: a,
            schemaPath: K._`${e.schemaPath}${K.getProperty(keyword)}`,
            errSchemaPath: `${e.errSchemaPath}/${keyword}`,
          }
        : {
            schema: a[schemaProp],
            schemaPath: K._`${e.schemaPath}${K.getProperty(keyword)}${K.getProperty(schemaProp)}`,
            errSchemaPath: `${e.errSchemaPath}/${keyword}/${Nt.escapeFragment(schemaProp)}`,
          };
    }
    if (schema !== void 0) {
      if (schemaPath === void 0 || errSchemaPath === void 0 || topSchemaRef === void 0)
        throw Error('"schemaPath", "errSchemaPath" and "topSchemaRef" are required with "schema"');
      return {
        schema: schema,
        schemaPath: schemaPath,
        topSchemaRef: topSchemaRef,
        errSchemaPath: errSchemaPath,
      };
    }
    throw Error('either "keyword" or "schema" must be passed');
  }
  nn.getSubschema = Mu;
  function Au(
    e,
    t,
    {
      dataProp: dataProp,
      dataPropType: dataPropType,
      data: n,
      dataTypes: dataTypes,
      propertyName: propertyName,
    },
  ) {
    if (n !== void 0 && dataProp !== void 0)
      throw Error('both "data" and "dataProp" passed, only one allowed');
    let { gen: gen } = t;
    if (dataProp !== void 0) {
      let { errorPath: errorPath, dataPathArr: dataPathArr, opts: opts } = t,
        b = gen.let("data", K._`${t.data}${K.getProperty(dataProp)}`, !0);
      (c(b),
        (e.errorPath = K.str`${errorPath}${Nt.getErrorPath(dataProp, dataPropType, opts.jsPropertySyntax)}`),
        (e.parentDataProperty = K._`${dataProp}`),
        (e.dataPathArr = [...dataPathArr, e.parentDataProperty]));
    }
    if (n !== void 0) {
      let u = n instanceof K.Name ? n : gen.let("data", n, !0);
      if ((c(u), propertyName !== void 0)) e.propertyName = propertyName;
    }
    if (dataTypes) e.dataTypes = dataTypes;
    function c(u) {
      ((e.data = u),
        (e.dataLevel = t.dataLevel + 1),
        (e.dataTypes = []),
        (t.definedProperties = new Set()),
        (e.parentData = t.data),
        (e.dataNames = [...t.dataNames, u]));
    }
  }
  nn.extendSubschemaData = Au;
  function Du(
    e,
    {
      jtdDiscriminator: jtdDiscriminator,
      jtdMetadata: jtdMetadata,
      compositeRule: compositeRule,
      createErrors: createErrors,
      allErrors: allErrors,
    },
  ) {
    if (compositeRule !== void 0) e.compositeRule = compositeRule;
    if (createErrors !== void 0) e.createErrors = createErrors;
    if (allErrors !== void 0) e.allErrors = allErrors;
    ((e.jtdDiscriminator = jtdDiscriminator), (e.jtdMetadata = jtdMetadata));
  }
  nn.extendSubschemaMode = Du;
});

export { an };

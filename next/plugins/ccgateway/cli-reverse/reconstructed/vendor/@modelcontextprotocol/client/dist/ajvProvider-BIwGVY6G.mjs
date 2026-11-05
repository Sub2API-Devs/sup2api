/**
 * @modelcontextprotocol/client/dist/ajvProvider-BIwGVY6G.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @modelcontextprotocol/client@2.0.0
 * pieces: chunk-fra0jg2y.js (26), chunk-qq5knpkd.js (2)
 * attribution: esm-layout 8, esm-fingerprint 9, layout 7, affinity 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { Ajv2020, formatsPlugin, DRAFT_2020_12_URIS, ajvModule } from "../../../ajv-formats/dist/formats.js";
import { require_equal } from "../../../ajv/dist/runtime/equal.js";
import { validateValidationSchema } from "./cfWorkerProvider-l7BFVI5n.mjs";
import { deferInit, runDeferredInits } from "../../../../runtime/deferred-init.js";

//@ chunk-qq5knpkd.js:260247-260360 esm-fingerprint
function createAjv2020() {
  let ajv = new Ajv2020.Ajv2020({
    strict: false,
    validateFormats: true,
    validateSchema: false,
    allErrors: true,
  });
  formatsPlugin(ajv);
  return ajv;
}
//@ chunk-qq5knpkd.js:260360-261073 esm-fingerprint
var AjvJsonSchemaValidator = class {
  _ajv;
  _userAjv;
  constructor(ajvInstance) {
    this._userAjv = ajvInstance !== undefined;
    this._ajv = ajvInstance;
  }
  get ajv() {
    return (this._ajv ??= createAjv2020());
  }
  getValidator(schema) {
    if (
      !this._userAjv &&
      "$schema" in schema &&
      typeof schema.$schema === "string" &&
      !DRAFT_2020_12_URIS.has(schema.$schema.replace(/#$/, ""))
    ) {
      let sliced = schema.$schema.slice(0, 200);
      throw Error(
        `JSON Schema declares an unsupported dialect ("$schema": "${sliced}"). The default validator supports JSON Schema 2020-12 only; pass a pre-configured Ajv instance to AjvJsonSchemaValidator(ajv) to validate other dialects.`,
      );
    }
    let engine = this.ajv;
    let ajvValidator =
      "$id" in schema && typeof schema.$id === "string"
        ? (engine.getSchema(schema.$id) ?? engine.compile(schema))
        : engine.compile(schema);
    return (input) =>
      ajvValidator(input)
        ? {
            valid: true,
            data: input,
            errorMessage: undefined,
          }
        : {
            valid: false,
            data: undefined,
            errorMessage: engine.errorsText(ajvValidator.errors),
          };
  }
};
var Ajv = ajvModule.Ajv;
//@ chunk-fra0jg2y.js:228-1961 esm-layout
var metaSchemaCheck = validateMetaSchema;
var metaSchema2020 = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://json-schema.org/draft/2020-12/schema",
  $vocabulary: {
    "https://json-schema.org/draft/2020-12/vocab/core": true,
    "https://json-schema.org/draft/2020-12/vocab/applicator": true,
    "https://json-schema.org/draft/2020-12/vocab/unevaluated": true,
    "https://json-schema.org/draft/2020-12/vocab/validation": true,
    "https://json-schema.org/draft/2020-12/vocab/meta-data": true,
    "https://json-schema.org/draft/2020-12/vocab/format-annotation": true,
    "https://json-schema.org/draft/2020-12/vocab/content": true,
  },
  $dynamicAnchor: "meta",
  title: "Core and Validation specifications meta-schema",
  allOf: [
    {
      $ref: "meta/core",
    },
    {
      $ref: "meta/applicator",
    },
    {
      $ref: "meta/unevaluated",
    },
    {
      $ref: "meta/validation",
    },
    {
      $ref: "meta/meta-data",
    },
    {
      $ref: "meta/format-annotation",
    },
    {
      $ref: "meta/content",
    },
  ],
  type: ["object", "boolean"],
  $comment:
    "This meta-schema also defines keywords that have appeared in previous drafts in order to prevent incompatible extensions as they remain in common use.",
  properties: {
    definitions: {
      $comment: '"definitions" has been replaced by "$defs".',
      type: "object",
      additionalProperties: {
        $dynamicRef: "#meta",
      },
      deprecated: true,
      default: {},
    },
    dependencies: {
      $comment:
        '"dependencies" has been split and replaced by "dependentSchemas" and "dependentRequired" in order to serve their differing semantics.',
      type: "object",
      additionalProperties: {
        anyOf: [
          {
            $dynamicRef: "#meta",
          },
          {
            $ref: "meta/validation#/$defs/stringArray",
          },
        ],
      },
      deprecated: true,
      default: {},
    },
    $recursiveAnchor: {
      $comment: '"$recursiveAnchor" has been replaced by "$dynamicAnchor".',
      $ref: "meta/core#/$defs/anchorString",
      deprecated: true,
    },
    $recursiveRef: {
      $comment: '"$recursiveRef" has been replaced by "$dynamicRef".',
      $ref: "meta/core#/$defs/uriReferenceString",
      deprecated: true,
    },
  },
};
//@ chunk-fra0jg2y.js:1961-2923 esm-fingerprint
var coreMetaSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://json-schema.org/draft/2020-12/meta/core",
  $vocabulary: {
    "https://json-schema.org/draft/2020-12/vocab/core": true,
  },
  $dynamicAnchor: "meta",
  title: "Core vocabulary meta-schema",
  type: ["object", "boolean"],
  properties: {
    $id: {
      $ref: "#/$defs/uriReferenceString",
      $comment: "Non-empty fragments not allowed.",
      pattern: "^[^#]*#?$",
    },
    $schema: {
      $ref: "#/$defs/uriString",
    },
    $ref: {
      $ref: "#/$defs/uriReferenceString",
    },
    $anchor: {
      $ref: "#/$defs/anchorString",
    },
    $dynamicRef: {
      $ref: "#/$defs/uriReferenceString",
    },
    $dynamicAnchor: {
      $ref: "#/$defs/anchorString",
    },
    $vocabulary: {
      type: "object",
      propertyNames: {
        $ref: "#/$defs/uriString",
      },
      additionalProperties: {
        type: "boolean",
      },
    },
    $comment: {
      type: "string",
    },
    $defs: {
      type: "object",
      additionalProperties: {
        $dynamicRef: "#meta",
      },
    },
  },
  $defs: {
    anchorString: {
      type: "string",
      pattern: "^[A-Za-z_][-A-Za-z0-9._]*$",
    },
    uriString: {
      type: "string",
      format: "uri",
    },
    uriReferenceString: {
      type: "string",
      format: "uri-reference",
    },
  },
};
//@ chunk-fra0jg2y.js:2923-3006 layout
var regExp = new RegExp("^[^#]*#?$", "u");
var regExp_2 = new RegExp("^[A-Za-z_][-A-Za-z0-9._]*$", "u");
//@ chunk-fra0jg2y.js:3006-8156 layout
function validateCoreSchema(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {},
) {
  let vErrors = null;
  let errorsCount = 0;
  let evaluated = validateCoreSchema.evaluated;
  if (evaluated.dynamicProps) evaluated.props = undefined;
  if (evaluated.dynamicItems) evaluated.items = undefined;
  if (!(data && typeof data == "object" && !Array.isArray(data)) && typeof data !== "boolean") {
    validateCoreSchema.errors = [
      {
        instancePath,
        schemaPath: "#/type",
        keyword: "type",
        params: {
          type: coreMetaSchema.type,
        },
        message: "must be object,boolean",
      },
    ];
    return false;
  }
  if (!dynamicAnchors.meta) dynamicAnchors.meta = validateCoreSchema;
  if (errorsCount === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.$id !== undefined) {
        let schemaId = data.$id;
        let errsBeforeId = errorsCount;
        let errsAfterId = errorsCount;
        if (errorsCount === errsAfterId) {
          if (errorsCount === errsAfterId) {
            if (typeof schemaId !== "string") {
              validateCoreSchema.errors = [
                {
                  instancePath: instancePath + "/$id",
                  schemaPath: "#/$defs/uriReferenceString/type",
                  keyword: "type",
                  params: {
                    type: "string",
                  },
                  message: "must be string",
                },
              ];
              return false;
            }
          }
        }
        if (errorsCount === errsBeforeId) {
          if (typeof schemaId === "string") {
            if (!regExp.test(schemaId)) {
              validateCoreSchema.errors = [
                {
                  instancePath: instancePath + "/$id",
                  schemaPath: "#/properties/%24id/pattern",
                  keyword: "pattern",
                  params: {
                    pattern: "^[^#]*#?$",
                  },
                  message: 'must match pattern "^[^#]*#?$"',
                },
              ];
              return false;
            }
          }
        }
        var isPropertyValid = errsBeforeId === errorsCount;
      } else var isPropertyValid = true;
      if (isPropertyValid) {
        if (data.$schema !== undefined) {
          let errsBeforeSchema = errorsCount;
          let errsAfterSchema = errorsCount;
          if (errorsCount === errsAfterSchema) {
            if (errorsCount === errsAfterSchema) {
              if (typeof data.$schema !== "string") {
                validateCoreSchema.errors = [
                  {
                    instancePath: instancePath + "/$schema",
                    schemaPath: "#/$defs/uriString/type",
                    keyword: "type",
                    params: {
                      type: "string",
                    },
                    message: "must be string",
                  },
                ];
                return false;
              }
            }
          }
          var isPropertyValid = errsBeforeSchema === errorsCount;
        } else var isPropertyValid = true;
        if (isPropertyValid) {
          if (data.$ref !== undefined) {
            let errsBeforeRef = errorsCount;
            let errsAfterRef = errorsCount;
            if (errorsCount === errsAfterRef) {
              if (errorsCount === errsAfterRef) {
                if (typeof data.$ref !== "string") {
                  validateCoreSchema.errors = [
                    {
                      instancePath: instancePath + "/$ref",
                      schemaPath: "#/$defs/uriReferenceString/type",
                      keyword: "type",
                      params: {
                        type: "string",
                      },
                      message: "must be string",
                    },
                  ];
                  return false;
                }
              }
            }
            var isPropertyValid = errsBeforeRef === errorsCount;
          } else var isPropertyValid = true;
          if (isPropertyValid) {
            if (data.$anchor !== undefined) {
              let $anchor = data.$anchor;
              let errsBeforeAnchor = errorsCount;
              if (errorsCount === errorsCount)
                if (typeof $anchor === "string") {
                  if (!regExp_2.test($anchor)) {
                    validateCoreSchema.errors = [
                      {
                        instancePath: instancePath + "/$anchor",
                        schemaPath: "#/$defs/anchorString/pattern",
                        keyword: "pattern",
                        params: {
                          pattern: "^[A-Za-z_][-A-Za-z0-9._]*$",
                        },
                        message: 'must match pattern "^[A-Za-z_][-A-Za-z0-9._]*$"',
                      },
                    ];
                    return false;
                  }
                } else {
                  validateCoreSchema.errors = [
                    {
                      instancePath: instancePath + "/$anchor",
                      schemaPath: "#/$defs/anchorString/type",
                      keyword: "type",
                      params: {
                        type: "string",
                      },
                      message: "must be string",
                    },
                  ];
                  return false;
                }
              var isPropertyValid = errsBeforeAnchor === errorsCount;
            } else var isPropertyValid = true;
            if (isPropertyValid) {
              if (data.$dynamicRef !== undefined) {
                let errsBeforeDynamicRef = errorsCount;
                let errsAfterDynamicRef = errorsCount;
                if (errorsCount === errsAfterDynamicRef) {
                  if (errorsCount === errsAfterDynamicRef) {
                    if (typeof data.$dynamicRef !== "string") {
                      validateCoreSchema.errors = [
                        {
                          instancePath: instancePath + "/$dynamicRef",
                          schemaPath: "#/$defs/uriReferenceString/type",
                          keyword: "type",
                          params: {
                            type: "string",
                          },
                          message: "must be string",
                        },
                      ];
                      return false;
                    }
                  }
                }
                var isPropertyValid = errsBeforeDynamicRef === errorsCount;
              } else var isPropertyValid = true;
              if (isPropertyValid) {
                if (data.$dynamicAnchor !== undefined) {
                  let $dynamicAnchor = data.$dynamicAnchor;
                  let errsBeforeDynamicAnchor = errorsCount;
                  if (errorsCount === errorsCount)
                    if (typeof $dynamicAnchor === "string") {
                      if (!regExp_2.test($dynamicAnchor)) {
                        validateCoreSchema.errors = [
                          {
                            instancePath: instancePath + "/$dynamicAnchor",
                            schemaPath: "#/$defs/anchorString/pattern",
                            keyword: "pattern",
                            params: {
                              pattern: "^[A-Za-z_][-A-Za-z0-9._]*$",
                            },
                            message: 'must match pattern "^[A-Za-z_][-A-Za-z0-9._]*$"',
                          },
                        ];
                        return false;
                      }
                    } else {
                      validateCoreSchema.errors = [
                        {
                          instancePath: instancePath + "/$dynamicAnchor",
                          schemaPath: "#/$defs/anchorString/type",
                          keyword: "type",
                          params: {
                            type: "string",
                          },
                          message: "must be string",
                        },
                      ];
                      return false;
                    }
                  var isPropertyValid = errsBeforeDynamicAnchor === errorsCount;
                } else var isPropertyValid = true;
                if (isPropertyValid) {
                  if (data.$vocabulary !== undefined) {
                    let $vocabulary = data.$vocabulary;
                    let errsBeforeVocabulary = errorsCount;
                    if (errorsCount === errsBeforeVocabulary)
                      if ($vocabulary && typeof $vocabulary == "object" && !Array.isArray($vocabulary)) {
                        for (let key in $vocabulary) {
                          let errsBeforeVocabProp = errorsCount;
                          let errsAfterVocabProp = errorsCount;
                          if (errorsCount === errsAfterVocabProp) {
                            if (errorsCount === errsAfterVocabProp) {
                              if (typeof key !== "string") {
                                let vocabPropNameError = {
                                  instancePath: instancePath + "/$vocabulary",
                                  schemaPath: "#/$defs/uriString/type",
                                  keyword: "type",
                                  params: {
                                    type: "string",
                                  },
                                  message: "must be string",
                                  propertyName: key,
                                };
                                if (vErrors === null) vErrors = [vocabPropNameError];
                                else vErrors.push(vocabPropNameError);
                                errorsCount++;
                              }
                            }
                          }
                          var isVocabPropNameValid = errsBeforeVocabProp === errorsCount;
                          if (!isVocabPropNameValid) {
                            let vocabPropError = {
                              instancePath: instancePath + "/$vocabulary",
                              schemaPath: "#/properties/%24vocabulary/propertyNames",
                              keyword: "propertyNames",
                              params: {
                                propertyName: key,
                              },
                              message: "property name must be valid",
                            };
                            if (vErrors === null) vErrors = [vocabPropError];
                            else vErrors.push(vocabPropError);
                            errorsCount++;
                            validateCoreSchema.errors = vErrors;
                            return false;
                            break;
                          }
                        }
                        if (isVocabPropNameValid)
                          for (let key in $vocabulary) {
                            let errsBeforeVocabValue = errorsCount;
                            if (typeof $vocabulary[key] !== "boolean") {
                              validateCoreSchema.errors = [
                                {
                                  instancePath:
                                    instancePath +
                                    "/$vocabulary/" +
                                    key.replace(/~/g, "~0").replace(/\//g, "~1"),
                                  schemaPath: "#/properties/%24vocabulary/additionalProperties/type",
                                  keyword: "type",
                                  params: {
                                    type: "boolean",
                                  },
                                  message: "must be boolean",
                                },
                              ];
                              return false;
                            }
                            var isVocabValueValid = errsBeforeVocabValue === errorsCount;
                            if (!isVocabValueValid) break;
                          }
                      } else {
                        validateCoreSchema.errors = [
                          {
                            instancePath: instancePath + "/$vocabulary",
                            schemaPath: "#/properties/%24vocabulary/type",
                            keyword: "type",
                            params: {
                              type: "object",
                            },
                            message: "must be object",
                          },
                        ];
                        return false;
                      }
                    var isPropertyValid = errsBeforeVocabulary === errorsCount;
                  } else var isPropertyValid = true;
                  if (isPropertyValid) {
                    if (data.$comment !== undefined) {
                      let errsBeforeComment = errorsCount;
                      if (typeof data.$comment !== "string") {
                        validateCoreSchema.errors = [
                          {
                            instancePath: instancePath + "/$comment",
                            schemaPath: "#/properties/%24comment/type",
                            keyword: "type",
                            params: {
                              type: "string",
                            },
                            message: "must be string",
                          },
                        ];
                        return false;
                      }
                      var isPropertyValid = errsBeforeComment === errorsCount;
                    } else var isPropertyValid = true;
                    if (isPropertyValid)
                      if (data.$defs !== undefined) {
                        let $defs = data.$defs;
                        let errsBeforeDefs = errorsCount;
                        if (errorsCount === errsBeforeDefs)
                          if ($defs && typeof $defs == "object" && !Array.isArray($defs))
                            for (let key in $defs) {
                              let defSchema = $defs[key];
                              let errsAfterDefs = errorsCount;
                              let meta = dynamicAnchors.meta;
                              if (meta) {
                                if (
                                  !meta(defSchema, {
                                    instancePath:
                                      instancePath + "/$defs/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                                    parentData: $defs,
                                    parentDataProperty: key,
                                    rootData,
                                    dynamicAnchors,
                                  })
                                ) {
                                  vErrors = vErrors === null ? meta.errors : vErrors.concat(meta.errors);
                                  errorsCount = vErrors.length;
                                } else {
                                  var props = meta.evaluated.props;
                                  var items = meta.evaluated.items;
                                }
                              } else if (
                                !validateCoreSchema(defSchema, {
                                  instancePath:
                                    instancePath + "/$defs/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                                  parentData: $defs,
                                  parentDataProperty: key,
                                  rootData,
                                  dynamicAnchors,
                                })
                              ) {
                                vErrors =
                                  vErrors === null
                                    ? validateCoreSchema.errors
                                    : vErrors.concat(validateCoreSchema.errors);
                                errorsCount = vErrors.length;
                              } else {
                                var props_2 = validateCoreSchema.evaluated.props;
                                if (props !== true && props_2 !== undefined)
                                  if (props_2 === true) props = true;
                                  else {
                                    props = props || {};
                                    Object.assign(props, props_2);
                                  }
                                var items_2 = validateCoreSchema.evaluated.items;
                                if (items !== true && items_2 !== undefined)
                                  items = items_2 === true ? true : items > items_2 ? items : items_2;
                              }
                              var isDefValid = errsAfterDefs === errorsCount;
                              if (!isDefValid) break;
                            }
                          else {
                            validateCoreSchema.errors = [
                              {
                                instancePath: instancePath + "/$defs",
                                schemaPath: "#/properties/%24defs/type",
                                keyword: "type",
                                params: {
                                  type: "object",
                                },
                                message: "must be object",
                              },
                            ];
                            return false;
                          }
                        var isPropertyValid = errsBeforeDefs === errorsCount;
                      } else var isPropertyValid = true;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  validateCoreSchema.errors = vErrors;
  return errorsCount === 0;
}
//@ chunk-fra0jg2y.js:8156-8316 layout
// deferred: uses validateCoreSchema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fra0jg2y.js:8156", () => {
  validateCoreSchema.evaluated = {
    props: {
      $id: true,
      $schema: true,
      $ref: true,
      $anchor: true,
      $dynamicRef: true,
      $dynamicAnchor: true,
      $vocabulary: true,
      $comment: true,
      $defs: true,
    },
    dynamicProps: false,
    dynamicItems: false,
  };
});
//@ chunk-fra0jg2y.js:8316-9367 esm-fingerprint
var applicatorMetaSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://json-schema.org/draft/2020-12/meta/applicator",
  $vocabulary: {
    "https://json-schema.org/draft/2020-12/vocab/applicator": true,
  },
  $dynamicAnchor: "meta",
  title: "Applicator vocabulary meta-schema",
  type: ["object", "boolean"],
  properties: {
    prefixItems: {
      $ref: "#/$defs/schemaArray",
    },
    items: {
      $dynamicRef: "#meta",
    },
    contains: {
      $dynamicRef: "#meta",
    },
    additionalProperties: {
      $dynamicRef: "#meta",
    },
    properties: {
      type: "object",
      additionalProperties: {
        $dynamicRef: "#meta",
      },
      default: {},
    },
    patternProperties: {
      type: "object",
      additionalProperties: {
        $dynamicRef: "#meta",
      },
      propertyNames: {
        format: "regex",
      },
      default: {},
    },
    dependentSchemas: {
      type: "object",
      additionalProperties: {
        $dynamicRef: "#meta",
      },
      default: {},
    },
    propertyNames: {
      $dynamicRef: "#meta",
    },
    if: {
      $dynamicRef: "#meta",
    },
    then: {
      $dynamicRef: "#meta",
    },
    else: {
      $dynamicRef: "#meta",
    },
    allOf: {
      $ref: "#/$defs/schemaArray",
    },
    anyOf: {
      $ref: "#/$defs/schemaArray",
    },
    oneOf: {
      $ref: "#/$defs/schemaArray",
    },
    not: {
      $dynamicRef: "#meta",
    },
  },
  $defs: {
    schemaArray: {
      type: "array",
      minItems: 1,
      items: {
        $dynamicRef: "#meta",
      },
    },
  },
};
//@ chunk-fra0jg2y.js:9367-10508 layout
function validateSchemaArray(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {},
) {
  let vErrors = null;
  let errorsCount = 0;
  let evaluated = validateSchemaArray.evaluated;
  if (evaluated.dynamicProps) evaluated.props = undefined;
  if (evaluated.dynamicItems) evaluated.items = undefined;
  if (errorsCount === 0)
    if (Array.isArray(data)) {
      if (data.length < 1) {
        validateSchemaArray.errors = [
          {
            instancePath,
            schemaPath: "#/minItems",
            keyword: "minItems",
            params: {
              limit: 1,
            },
            message: "must NOT have fewer than 1 items",
          },
        ];
        return false;
      } else {
        var isItemValid = true;
        let itemCount = data.length;
        for (let j = 0; j < itemCount; j++) {
          let item = data[j];
          let errsBeforeItem = errorsCount;
          let meta = dynamicAnchors.meta;
          if (meta) {
            if (
              !meta(item, {
                instancePath: instancePath + "/" + j,
                parentData: data,
                parentDataProperty: j,
                rootData,
                dynamicAnchors,
              })
            ) {
              vErrors = vErrors === null ? meta.errors : vErrors.concat(meta.errors);
              errorsCount = vErrors.length;
            } else {
              var props = meta.evaluated.props;
              var items = meta.evaluated.items;
            }
          } else if (
            !validateSchemaArray(item, {
              instancePath: instancePath + "/" + j,
              parentData: data,
              parentDataProperty: j,
              rootData,
              dynamicAnchors,
            })
          ) {
            vErrors =
              vErrors === null ? validateSchemaArray.errors : vErrors.concat(validateSchemaArray.errors);
            errorsCount = vErrors.length;
          } else {
            var props_2 = validateSchemaArray.evaluated.props;
            if (props !== true && props_2 !== undefined)
              if (props_2 === true) props = true;
              else {
                props = props || {};
                Object.assign(props, props_2);
              }
            var items_2 = validateSchemaArray.evaluated.items;
            if (items !== true && items_2 !== undefined)
              items = items_2 === true ? true : items > items_2 ? items : items_2;
          }
          var isItemValid = errsBeforeItem === errorsCount;
          if (!isItemValid) break;
        }
      }
    } else {
      validateSchemaArray.errors = [
        {
          instancePath,
          schemaPath: "#/type",
          keyword: "type",
          params: {
            type: "array",
          },
          message: "must be array",
        },
      ];
      return false;
    }
  validateSchemaArray.errors = vErrors;
  return errorsCount === 0;
}
//@ chunk-fra0jg2y.js:10508-10563 layout
// deferred: uses validateSchemaArray of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fra0jg2y.js:10508", () => {
  validateSchemaArray.evaluated = {
    items: true,
    dynamicProps: false,
    dynamicItems: false,
  };
});
//@ chunk-fra0jg2y.js:10563-20346 layout
function validateApplicatorSchema(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {},
) {
  let vErrors = null;
  let errorsCount = 0;
  let evaluated = validateApplicatorSchema.evaluated;
  if (evaluated.dynamicProps) evaluated.props = undefined;
  if (evaluated.dynamicItems) evaluated.items = undefined;
  if (!(data && typeof data == "object" && !Array.isArray(data)) && typeof data !== "boolean") {
    validateApplicatorSchema.errors = [
      {
        instancePath,
        schemaPath: "#/type",
        keyword: "type",
        params: {
          type: applicatorMetaSchema.type,
        },
        message: "must be object,boolean",
      },
    ];
    return false;
  }
  if (!dynamicAnchors.meta) dynamicAnchors.meta = validateApplicatorSchema;
  if (errorsCount === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.prefixItems !== undefined) {
        let errsBeforePrefixItems = errorsCount;
        if (
          !validateSchemaArray(data.prefixItems, {
            instancePath: instancePath + "/prefixItems",
            parentData: data,
            parentDataProperty: "prefixItems",
            rootData,
            dynamicAnchors,
          })
        ) {
          vErrors =
            vErrors === null ? validateSchemaArray.errors : vErrors.concat(validateSchemaArray.errors);
          errorsCount = vErrors.length;
        }
        var isKeywordValid = errsBeforePrefixItems === errorsCount;
      } else var isKeywordValid = true;
      if (isKeywordValid) {
        if (data.items !== undefined) {
          let items = data.items;
          let errsBeforeItems = errorsCount;
          let meta = dynamicAnchors.meta;
          if (meta) {
            if (
              !meta(items, {
                instancePath: instancePath + "/items",
                parentData: data,
                parentDataProperty: "items",
                rootData,
                dynamicAnchors,
              })
            ) {
              vErrors = vErrors === null ? meta.errors : vErrors.concat(meta.errors);
              errorsCount = vErrors.length;
            } else {
              var props = meta.evaluated.props;
              var items_2 = meta.evaluated.items;
            }
          } else if (
            !validateApplicatorSchema(items, {
              instancePath: instancePath + "/items",
              parentData: data,
              parentDataProperty: "items",
              rootData,
              dynamicAnchors,
            })
          ) {
            vErrors =
              vErrors === null
                ? validateApplicatorSchema.errors
                : vErrors.concat(validateApplicatorSchema.errors);
            errorsCount = vErrors.length;
          } else {
            var props_2 = validateApplicatorSchema.evaluated.props;
            if (props !== true && props_2 !== undefined)
              if (props_2 === true) props = true;
              else {
                props = props || {};
                Object.assign(props, props_2);
              }
            var items_3 = validateApplicatorSchema.evaluated.items;
            if (items_2 !== true && items_3 !== undefined)
              items_2 = items_3 === true ? true : items_2 > items_3 ? items_2 : items_3;
          }
          var isKeywordValid = errsBeforeItems === errorsCount;
        } else var isKeywordValid = true;
        if (isKeywordValid) {
          if (data.contains !== undefined) {
            let contains = data.contains;
            let errsBeforeContains = errorsCount;
            let meta = dynamicAnchors.meta;
            if (meta) {
              if (
                !meta(contains, {
                  instancePath: instancePath + "/contains",
                  parentData: data,
                  parentDataProperty: "contains",
                  rootData,
                  dynamicAnchors,
                })
              ) {
                vErrors = vErrors === null ? meta.errors : vErrors.concat(meta.errors);
                errorsCount = vErrors.length;
              } else {
                var props_3 = meta.evaluated.props;
                var items_4 = meta.evaluated.items;
              }
            } else if (
              !validateApplicatorSchema(contains, {
                instancePath: instancePath + "/contains",
                parentData: data,
                parentDataProperty: "contains",
                rootData,
                dynamicAnchors,
              })
            ) {
              vErrors =
                vErrors === null
                  ? validateApplicatorSchema.errors
                  : vErrors.concat(validateApplicatorSchema.errors);
              errorsCount = vErrors.length;
            } else {
              var props_4 = validateApplicatorSchema.evaluated.props;
              if (props_3 !== true && props_4 !== undefined)
                if (props_4 === true) props_3 = true;
                else {
                  props_3 = props_3 || {};
                  Object.assign(props_3, props_4);
                }
              var items_5 = validateApplicatorSchema.evaluated.items;
              if (items_4 !== true && items_5 !== undefined)
                items_4 = items_5 === true ? true : items_4 > items_5 ? items_4 : items_5;
            }
            var isKeywordValid = errsBeforeContains === errorsCount;
          } else var isKeywordValid = true;
          if (isKeywordValid) {
            if (data.additionalProperties !== undefined) {
              let additionalProperties = data.additionalProperties;
              let errsBeforeAdditionalProperties = errorsCount;
              let meta = dynamicAnchors.meta;
              if (meta) {
                if (
                  !meta(additionalProperties, {
                    instancePath: instancePath + "/additionalProperties",
                    parentData: data,
                    parentDataProperty: "additionalProperties",
                    rootData,
                    dynamicAnchors,
                  })
                ) {
                  vErrors = vErrors === null ? meta.errors : vErrors.concat(meta.errors);
                  errorsCount = vErrors.length;
                } else {
                  var props_5 = meta.evaluated.props;
                  var items_6 = meta.evaluated.items;
                }
              } else if (
                !validateApplicatorSchema(additionalProperties, {
                  instancePath: instancePath + "/additionalProperties",
                  parentData: data,
                  parentDataProperty: "additionalProperties",
                  rootData,
                  dynamicAnchors,
                })
              ) {
                vErrors =
                  vErrors === null
                    ? validateApplicatorSchema.errors
                    : vErrors.concat(validateApplicatorSchema.errors);
                errorsCount = vErrors.length;
              } else {
                var props_6 = validateApplicatorSchema.evaluated.props;
                if (props_5 !== true && props_6 !== undefined)
                  if (props_6 === true) props_5 = true;
                  else {
                    props_5 = props_5 || {};
                    Object.assign(props_5, props_6);
                  }
                var items_7 = validateApplicatorSchema.evaluated.items;
                if (items_6 !== true && items_7 !== undefined)
                  items_6 = items_7 === true ? true : items_6 > items_7 ? items_6 : items_7;
              }
              var isKeywordValid = errsBeforeAdditionalProperties === errorsCount;
            } else var isKeywordValid = true;
            if (isKeywordValid) {
              if (data.properties !== undefined) {
                let properties = data.properties;
                let errsBeforeProperties = errorsCount;
                if (errorsCount === errsBeforeProperties)
                  if (properties && typeof properties == "object" && !Array.isArray(properties))
                    for (let key in properties) {
                      let propSchema = properties[key];
                      let errsBeforeProp = errorsCount;
                      let meta = dynamicAnchors.meta;
                      if (meta) {
                        if (
                          !meta(propSchema, {
                            instancePath:
                              instancePath + "/properties/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                            parentData: properties,
                            parentDataProperty: key,
                            rootData,
                            dynamicAnchors,
                          })
                        ) {
                          vErrors = vErrors === null ? meta.errors : vErrors.concat(meta.errors);
                          errorsCount = vErrors.length;
                        } else {
                          var props_7 = meta.evaluated.props;
                          var items_8 = meta.evaluated.items;
                        }
                      } else if (
                        !validateApplicatorSchema(propSchema, {
                          instancePath:
                            instancePath + "/properties/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                          parentData: properties,
                          parentDataProperty: key,
                          rootData,
                          dynamicAnchors,
                        })
                      ) {
                        vErrors =
                          vErrors === null
                            ? validateApplicatorSchema.errors
                            : vErrors.concat(validateApplicatorSchema.errors);
                        errorsCount = vErrors.length;
                      } else {
                        var props_8 = validateApplicatorSchema.evaluated.props;
                        if (props_7 !== true && props_8 !== undefined)
                          if (props_8 === true) props_7 = true;
                          else {
                            props_7 = props_7 || {};
                            Object.assign(props_7, props_8);
                          }
                        var items_9 = validateApplicatorSchema.evaluated.items;
                        if (items_8 !== true && items_9 !== undefined)
                          items_8 = items_9 === true ? true : items_8 > items_9 ? items_8 : items_9;
                      }
                      var isPropValid = errsBeforeProp === errorsCount;
                      if (!isPropValid) break;
                    }
                  else {
                    validateApplicatorSchema.errors = [
                      {
                        instancePath: instancePath + "/properties",
                        schemaPath: "#/properties/properties/type",
                        keyword: "type",
                        params: {
                          type: "object",
                        },
                        message: "must be object",
                      },
                    ];
                    return false;
                  }
                var isKeywordValid = errsBeforeProperties === errorsCount;
              } else var isKeywordValid = true;
              if (isKeywordValid) {
                if (data.patternProperties !== undefined) {
                  let patternProperties = data.patternProperties;
                  let errsBeforePatternProperties = errorsCount;
                  if (errorsCount === errsBeforePatternProperties)
                    if (
                      patternProperties &&
                      typeof patternProperties == "object" &&
                      !Array.isArray(patternProperties)
                    ) {
                      for (let propertyName in patternProperties) {
                        var isPatternKeyValid = errorsCount === errorsCount;
                        if (!isPatternKeyValid) {
                          let patternKeyError = {
                            instancePath: instancePath + "/patternProperties",
                            schemaPath: "#/properties/patternProperties/propertyNames",
                            keyword: "propertyNames",
                            params: {
                              propertyName,
                            },
                            message: "property name must be valid",
                          };
                          if (vErrors === null) vErrors = [patternKeyError];
                          else vErrors.push(patternKeyError);
                          errorsCount++;
                          validateApplicatorSchema.errors = vErrors;
                          return false;
                          break;
                        }
                      }
                      if (isPatternKeyValid)
                        for (let key in patternProperties) {
                          let patternSchema = patternProperties[key];
                          let errsBeforePattern = errorsCount;
                          let meta = dynamicAnchors.meta;
                          if (meta) {
                            if (
                              !meta(patternSchema, {
                                instancePath:
                                  instancePath +
                                  "/patternProperties/" +
                                  key.replace(/~/g, "~0").replace(/\//g, "~1"),
                                parentData: patternProperties,
                                parentDataProperty: key,
                                rootData,
                                dynamicAnchors,
                              })
                            ) {
                              vErrors = vErrors === null ? meta.errors : vErrors.concat(meta.errors);
                              errorsCount = vErrors.length;
                            } else {
                              var props_9 = meta.evaluated.props;
                              var items_10 = meta.evaluated.items;
                            }
                          } else if (
                            !validateApplicatorSchema(patternSchema, {
                              instancePath:
                                instancePath +
                                "/patternProperties/" +
                                key.replace(/~/g, "~0").replace(/\//g, "~1"),
                              parentData: patternProperties,
                              parentDataProperty: key,
                              rootData,
                              dynamicAnchors,
                            })
                          ) {
                            vErrors =
                              vErrors === null
                                ? validateApplicatorSchema.errors
                                : vErrors.concat(validateApplicatorSchema.errors);
                            errorsCount = vErrors.length;
                          } else {
                            var props_10 = validateApplicatorSchema.evaluated.props;
                            if (props_9 !== true && props_10 !== undefined)
                              if (props_10 === true) props_9 = true;
                              else {
                                props_9 = props_9 || {};
                                Object.assign(props_9, props_10);
                              }
                            var items_11 = validateApplicatorSchema.evaluated.items;
                            if (items_10 !== true && items_11 !== undefined)
                              items_10 = items_11 === true ? true : items_10 > items_11 ? items_10 : items_11;
                          }
                          var isPatternValid = errsBeforePattern === errorsCount;
                          if (!isPatternValid) break;
                        }
                    } else {
                      validateApplicatorSchema.errors = [
                        {
                          instancePath: instancePath + "/patternProperties",
                          schemaPath: "#/properties/patternProperties/type",
                          keyword: "type",
                          params: {
                            type: "object",
                          },
                          message: "must be object",
                        },
                      ];
                      return false;
                    }
                  var isKeywordValid = errsBeforePatternProperties === errorsCount;
                } else var isKeywordValid = true;
                if (isKeywordValid) {
                  if (data.dependentSchemas !== undefined) {
                    let dependentSchemas = data.dependentSchemas;
                    let errsBeforeDependentSchemas = errorsCount;
                    if (errorsCount === errsBeforeDependentSchemas)
                      if (
                        dependentSchemas &&
                        typeof dependentSchemas == "object" &&
                        !Array.isArray(dependentSchemas)
                      )
                        for (let key in dependentSchemas) {
                          let dependentSchema = dependentSchemas[key];
                          let errsBeforeDependent = errorsCount;
                          let meta = dynamicAnchors.meta;
                          if (meta) {
                            if (
                              !meta(dependentSchema, {
                                instancePath:
                                  instancePath +
                                  "/dependentSchemas/" +
                                  key.replace(/~/g, "~0").replace(/\//g, "~1"),
                                parentData: dependentSchemas,
                                parentDataProperty: key,
                                rootData,
                                dynamicAnchors,
                              })
                            ) {
                              vErrors = vErrors === null ? meta.errors : vErrors.concat(meta.errors);
                              errorsCount = vErrors.length;
                            } else {
                              var props_11 = meta.evaluated.props;
                              var items_12 = meta.evaluated.items;
                            }
                          } else if (
                            !validateApplicatorSchema(dependentSchema, {
                              instancePath:
                                instancePath +
                                "/dependentSchemas/" +
                                key.replace(/~/g, "~0").replace(/\//g, "~1"),
                              parentData: dependentSchemas,
                              parentDataProperty: key,
                              rootData,
                              dynamicAnchors,
                            })
                          ) {
                            vErrors =
                              vErrors === null
                                ? validateApplicatorSchema.errors
                                : vErrors.concat(validateApplicatorSchema.errors);
                            errorsCount = vErrors.length;
                          } else {
                            var props_12 = validateApplicatorSchema.evaluated.props;
                            if (props_11 !== true && props_12 !== undefined)
                              if (props_12 === true) props_11 = true;
                              else {
                                props_11 = props_11 || {};
                                Object.assign(props_11, props_12);
                              }
                            var items_13 = validateApplicatorSchema.evaluated.items;
                            if (items_12 !== true && items_13 !== undefined)
                              items_12 = items_13 === true ? true : items_12 > items_13 ? items_12 : items_13;
                          }
                          var isDependentValid = errsBeforeDependent === errorsCount;
                          if (!isDependentValid) break;
                        }
                      else {
                        validateApplicatorSchema.errors = [
                          {
                            instancePath: instancePath + "/dependentSchemas",
                            schemaPath: "#/properties/dependentSchemas/type",
                            keyword: "type",
                            params: {
                              type: "object",
                            },
                            message: "must be object",
                          },
                        ];
                        return false;
                      }
                    var isKeywordValid = errsBeforeDependentSchemas === errorsCount;
                  } else var isKeywordValid = true;
                  if (isKeywordValid) {
                    if (data.propertyNames !== undefined) {
                      let propertyNames = data.propertyNames;
                      let errsBeforePropertyNames = errorsCount;
                      let meta = dynamicAnchors.meta;
                      if (meta) {
                        if (
                          !meta(propertyNames, {
                            instancePath: instancePath + "/propertyNames",
                            parentData: data,
                            parentDataProperty: "propertyNames",
                            rootData,
                            dynamicAnchors,
                          })
                        ) {
                          vErrors = vErrors === null ? meta.errors : vErrors.concat(meta.errors);
                          errorsCount = vErrors.length;
                        } else {
                          var props_13 = meta.evaluated.props;
                          var items_14 = meta.evaluated.items;
                        }
                      } else if (
                        !validateApplicatorSchema(propertyNames, {
                          instancePath: instancePath + "/propertyNames",
                          parentData: data,
                          parentDataProperty: "propertyNames",
                          rootData,
                          dynamicAnchors,
                        })
                      ) {
                        vErrors =
                          vErrors === null
                            ? validateApplicatorSchema.errors
                            : vErrors.concat(validateApplicatorSchema.errors);
                        errorsCount = vErrors.length;
                      } else {
                        var props_14 = validateApplicatorSchema.evaluated.props;
                        if (props_13 !== true && props_14 !== undefined)
                          if (props_14 === true) props_13 = true;
                          else {
                            props_13 = props_13 || {};
                            Object.assign(props_13, props_14);
                          }
                        var items_15 = validateApplicatorSchema.evaluated.items;
                        if (items_14 !== true && items_15 !== undefined)
                          items_14 = items_15 === true ? true : items_14 > items_15 ? items_14 : items_15;
                      }
                      var isKeywordValid = errsBeforePropertyNames === errorsCount;
                    } else var isKeywordValid = true;
                    if (isKeywordValid) {
                      if (data.if !== undefined) {
                        let ifSchema = data.if;
                        let errsBeforeIf = errorsCount;
                        let meta = dynamicAnchors.meta;
                        if (meta) {
                          if (
                            !meta(ifSchema, {
                              instancePath: instancePath + "/if",
                              parentData: data,
                              parentDataProperty: "if",
                              rootData,
                              dynamicAnchors,
                            })
                          ) {
                            vErrors = vErrors === null ? meta.errors : vErrors.concat(meta.errors);
                            errorsCount = vErrors.length;
                          } else {
                            var props_15 = meta.evaluated.props;
                            var items_16 = meta.evaluated.items;
                          }
                        } else if (
                          !validateApplicatorSchema(ifSchema, {
                            instancePath: instancePath + "/if",
                            parentData: data,
                            parentDataProperty: "if",
                            rootData,
                            dynamicAnchors,
                          })
                        ) {
                          vErrors =
                            vErrors === null
                              ? validateApplicatorSchema.errors
                              : vErrors.concat(validateApplicatorSchema.errors);
                          errorsCount = vErrors.length;
                        } else {
                          var props_16 = validateApplicatorSchema.evaluated.props;
                          if (props_15 !== true && props_16 !== undefined)
                            if (props_16 === true) props_15 = true;
                            else {
                              props_15 = props_15 || {};
                              Object.assign(props_15, props_16);
                            }
                          var items_17 = validateApplicatorSchema.evaluated.items;
                          if (items_16 !== true && items_17 !== undefined)
                            items_16 = items_17 === true ? true : items_16 > items_17 ? items_16 : items_17;
                        }
                        var isKeywordValid = errsBeforeIf === errorsCount;
                      } else var isKeywordValid = true;
                      if (isKeywordValid) {
                        if (data.then !== undefined) {
                          let thenSchema = data.then;
                          let errsBeforeThen = errorsCount;
                          let meta = dynamicAnchors.meta;
                          if (meta) {
                            if (
                              !meta(thenSchema, {
                                instancePath: instancePath + "/then",
                                parentData: data,
                                parentDataProperty: "then",
                                rootData,
                                dynamicAnchors,
                              })
                            ) {
                              vErrors = vErrors === null ? meta.errors : vErrors.concat(meta.errors);
                              errorsCount = vErrors.length;
                            } else {
                              var props_17 = meta.evaluated.props;
                              var items_18 = meta.evaluated.items;
                            }
                          } else if (
                            !validateApplicatorSchema(thenSchema, {
                              instancePath: instancePath + "/then",
                              parentData: data,
                              parentDataProperty: "then",
                              rootData,
                              dynamicAnchors,
                            })
                          ) {
                            vErrors =
                              vErrors === null
                                ? validateApplicatorSchema.errors
                                : vErrors.concat(validateApplicatorSchema.errors);
                            errorsCount = vErrors.length;
                          } else {
                            var props_18 = validateApplicatorSchema.evaluated.props;
                            if (props_17 !== true && props_18 !== undefined)
                              if (props_18 === true) props_17 = true;
                              else {
                                props_17 = props_17 || {};
                                Object.assign(props_17, props_18);
                              }
                            var items_19 = validateApplicatorSchema.evaluated.items;
                            if (items_18 !== true && items_19 !== undefined)
                              items_18 = items_19 === true ? true : items_18 > items_19 ? items_18 : items_19;
                          }
                          var isKeywordValid = errsBeforeThen === errorsCount;
                        } else var isKeywordValid = true;
                        if (isKeywordValid) {
                          if (data.else !== undefined) {
                            let elseSchema = data.else;
                            let errsBeforeElse = errorsCount;
                            let meta = dynamicAnchors.meta;
                            if (meta) {
                              if (
                                !meta(elseSchema, {
                                  instancePath: instancePath + "/else",
                                  parentData: data,
                                  parentDataProperty: "else",
                                  rootData,
                                  dynamicAnchors,
                                })
                              ) {
                                vErrors = vErrors === null ? meta.errors : vErrors.concat(meta.errors);
                                errorsCount = vErrors.length;
                              } else {
                                var props_19 = meta.evaluated.props;
                                var items_20 = meta.evaluated.items;
                              }
                            } else if (
                              !validateApplicatorSchema(elseSchema, {
                                instancePath: instancePath + "/else",
                                parentData: data,
                                parentDataProperty: "else",
                                rootData,
                                dynamicAnchors,
                              })
                            ) {
                              vErrors =
                                vErrors === null
                                  ? validateApplicatorSchema.errors
                                  : vErrors.concat(validateApplicatorSchema.errors);
                              errorsCount = vErrors.length;
                            } else {
                              var props_20 = validateApplicatorSchema.evaluated.props;
                              if (props_19 !== true && props_20 !== undefined)
                                if (props_20 === true) props_19 = true;
                                else {
                                  props_19 = props_19 || {};
                                  Object.assign(props_19, props_20);
                                }
                              var items_21 = validateApplicatorSchema.evaluated.items;
                              if (items_20 !== true && items_21 !== undefined)
                                items_20 =
                                  items_21 === true ? true : items_20 > items_21 ? items_20 : items_21;
                            }
                            var isKeywordValid = errsBeforeElse === errorsCount;
                          } else var isKeywordValid = true;
                          if (isKeywordValid) {
                            if (data.allOf !== undefined) {
                              let errsBeforeAllOf = errorsCount;
                              if (
                                !validateSchemaArray(data.allOf, {
                                  instancePath: instancePath + "/allOf",
                                  parentData: data,
                                  parentDataProperty: "allOf",
                                  rootData,
                                  dynamicAnchors,
                                })
                              ) {
                                vErrors =
                                  vErrors === null
                                    ? validateSchemaArray.errors
                                    : vErrors.concat(validateSchemaArray.errors);
                                errorsCount = vErrors.length;
                              }
                              var isKeywordValid = errsBeforeAllOf === errorsCount;
                            } else var isKeywordValid = true;
                            if (isKeywordValid) {
                              if (data.anyOf !== undefined) {
                                let errsBeforeAnyOf = errorsCount;
                                if (
                                  !validateSchemaArray(data.anyOf, {
                                    instancePath: instancePath + "/anyOf",
                                    parentData: data,
                                    parentDataProperty: "anyOf",
                                    rootData,
                                    dynamicAnchors,
                                  })
                                ) {
                                  vErrors =
                                    vErrors === null
                                      ? validateSchemaArray.errors
                                      : vErrors.concat(validateSchemaArray.errors);
                                  errorsCount = vErrors.length;
                                }
                                var isKeywordValid = errsBeforeAnyOf === errorsCount;
                              } else var isKeywordValid = true;
                              if (isKeywordValid) {
                                if (data.oneOf !== undefined) {
                                  let errsBeforeOneOf = errorsCount;
                                  if (
                                    !validateSchemaArray(data.oneOf, {
                                      instancePath: instancePath + "/oneOf",
                                      parentData: data,
                                      parentDataProperty: "oneOf",
                                      rootData,
                                      dynamicAnchors,
                                    })
                                  ) {
                                    vErrors =
                                      vErrors === null
                                        ? validateSchemaArray.errors
                                        : vErrors.concat(validateSchemaArray.errors);
                                    errorsCount = vErrors.length;
                                  }
                                  var isKeywordValid = errsBeforeOneOf === errorsCount;
                                } else var isKeywordValid = true;
                                if (isKeywordValid)
                                  if (data.not !== undefined) {
                                    let not = data.not;
                                    let errsBeforeNot = errorsCount;
                                    let meta = dynamicAnchors.meta;
                                    if (meta) {
                                      if (
                                        !meta(not, {
                                          instancePath: instancePath + "/not",
                                          parentData: data,
                                          parentDataProperty: "not",
                                          rootData,
                                          dynamicAnchors,
                                        })
                                      ) {
                                        vErrors =
                                          vErrors === null ? meta.errors : vErrors.concat(meta.errors);
                                        errorsCount = vErrors.length;
                                      } else {
                                        var props_21 = meta.evaluated.props;
                                        var items_22 = meta.evaluated.items;
                                      }
                                    } else if (
                                      !validateApplicatorSchema(not, {
                                        instancePath: instancePath + "/not",
                                        parentData: data,
                                        parentDataProperty: "not",
                                        rootData,
                                        dynamicAnchors,
                                      })
                                    ) {
                                      vErrors =
                                        vErrors === null
                                          ? validateApplicatorSchema.errors
                                          : vErrors.concat(validateApplicatorSchema.errors);
                                      errorsCount = vErrors.length;
                                    } else {
                                      var props_22 = validateApplicatorSchema.evaluated.props;
                                      if (props_21 !== true && props_22 !== undefined)
                                        if (props_22 === true) props_21 = true;
                                        else {
                                          props_21 = props_21 || {};
                                          Object.assign(props_21, props_22);
                                        }
                                      var items_23 = validateApplicatorSchema.evaluated.items;
                                      if (items_22 !== true && items_23 !== undefined)
                                        items_22 =
                                          items_23 === true
                                            ? true
                                            : items_22 > items_23
                                              ? items_22
                                              : items_23;
                                    }
                                    var isKeywordValid = errsBeforeNot === errorsCount;
                                  } else var isKeywordValid = true;
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  validateApplicatorSchema.errors = vErrors;
  return errorsCount === 0;
}
//@ chunk-fra0jg2y.js:20346-20588 layout
// deferred: uses validateApplicatorSchema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fra0jg2y.js:20346", () => {
  validateApplicatorSchema.evaluated = {
    props: {
      prefixItems: true,
      items: true,
      contains: true,
      additionalProperties: true,
      properties: true,
      patternProperties: true,
      dependentSchemas: true,
      propertyNames: true,
      if: true,
      then: true,
      else: true,
      allOf: true,
      anyOf: true,
      oneOf: true,
      not: true,
    },
    dynamicProps: false,
    dynamicItems: false,
  };
});
//@ chunk-fra0jg2y.js:20588-20986 esm-fingerprint
var unevaluatedMetaSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://json-schema.org/draft/2020-12/meta/unevaluated",
  $vocabulary: {
    "https://json-schema.org/draft/2020-12/vocab/unevaluated": true,
  },
  $dynamicAnchor: "meta",
  title: "Unevaluated applicator vocabulary meta-schema",
  type: ["object", "boolean"],
  properties: {
    unevaluatedItems: {
      $dynamicRef: "#meta",
    },
    unevaluatedProperties: {
      $dynamicRef: "#meta",
    },
  },
};
//@ chunk-fra0jg2y.js:20986-22855 esm-layout
function validateUnevaluatedSchema(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {},
) {
  let vErrors = null;
  let errorsCount = 0;
  let evaluated = validateUnevaluatedSchema.evaluated;
  if (evaluated.dynamicProps) evaluated.props = undefined;
  if (evaluated.dynamicItems) evaluated.items = undefined;
  if (!(data && typeof data == "object" && !Array.isArray(data)) && typeof data !== "boolean") {
    validateUnevaluatedSchema.errors = [
      {
        instancePath,
        schemaPath: "#/type",
        keyword: "type",
        params: {
          type: unevaluatedMetaSchema.type,
        },
        message: "must be object,boolean",
      },
    ];
    return false;
  }
  if (!dynamicAnchors.meta) dynamicAnchors.meta = validateUnevaluatedSchema;
  if (errorsCount === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.unevaluatedItems !== undefined) {
        let unevaluatedItems = data.unevaluatedItems;
        let errsBeforeUnevaluatedItems = errorsCount;
        let meta = dynamicAnchors.meta;
        if (meta) {
          if (
            !meta(unevaluatedItems, {
              instancePath: instancePath + "/unevaluatedItems",
              parentData: data,
              parentDataProperty: "unevaluatedItems",
              rootData,
              dynamicAnchors,
            })
          ) {
            vErrors = vErrors === null ? meta.errors : vErrors.concat(meta.errors);
            errorsCount = vErrors.length;
          } else {
            var props = meta.evaluated.props;
            var items = meta.evaluated.items;
          }
        } else if (
          !validateUnevaluatedSchema(unevaluatedItems, {
            instancePath: instancePath + "/unevaluatedItems",
            parentData: data,
            parentDataProperty: "unevaluatedItems",
            rootData,
            dynamicAnchors,
          })
        ) {
          vErrors =
            vErrors === null
              ? validateUnevaluatedSchema.errors
              : vErrors.concat(validateUnevaluatedSchema.errors);
          errorsCount = vErrors.length;
        } else {
          var props_2 = validateUnevaluatedSchema.evaluated.props;
          if (props !== true && props_2 !== undefined)
            if (props_2 === true) props = true;
            else {
              props = props || {};
              Object.assign(props, props_2);
            }
          var items_2 = validateUnevaluatedSchema.evaluated.items;
          if (items !== true && items_2 !== undefined)
            items = items_2 === true ? true : items > items_2 ? items : items_2;
        }
        var errsBeforeItems = errsBeforeUnevaluatedItems === errorsCount;
      } else var errsBeforeItems = true;
      if (errsBeforeItems)
        if (data.unevaluatedProperties !== undefined) {
          let unevaluatedProperties = data.unevaluatedProperties;
          let errsBeforeUnevaluatedProperties = errorsCount;
          let meta = dynamicAnchors.meta;
          if (meta) {
            if (
              !meta(unevaluatedProperties, {
                instancePath: instancePath + "/unevaluatedProperties",
                parentData: data,
                parentDataProperty: "unevaluatedProperties",
                rootData,
                dynamicAnchors,
              })
            ) {
              vErrors = vErrors === null ? meta.errors : vErrors.concat(meta.errors);
              errorsCount = vErrors.length;
            } else {
              var props_3 = meta.evaluated.props;
              var items_3 = meta.evaluated.items;
            }
          } else if (
            !validateUnevaluatedSchema(unevaluatedProperties, {
              instancePath: instancePath + "/unevaluatedProperties",
              parentData: data,
              parentDataProperty: "unevaluatedProperties",
              rootData,
              dynamicAnchors,
            })
          ) {
            vErrors =
              vErrors === null
                ? validateUnevaluatedSchema.errors
                : vErrors.concat(validateUnevaluatedSchema.errors);
            errorsCount = vErrors.length;
          } else {
            var props_4 = validateUnevaluatedSchema.evaluated.props;
            if (props_3 !== true && props_4 !== undefined)
              if (props_4 === true) props_3 = true;
              else {
                props_3 = props_3 || {};
                Object.assign(props_3, props_4);
              }
            var items_4 = validateUnevaluatedSchema.evaluated.items;
            if (items_3 !== true && items_4 !== undefined)
              items_3 = items_4 === true ? true : items_3 > items_4 ? items_3 : items_4;
          }
          var errsBeforeItems = errsBeforeUnevaluatedProperties === errorsCount;
        } else var errsBeforeItems = true;
    }
  }
  validateUnevaluatedSchema.errors = vErrors;
  return errorsCount === 0;
}
//@ chunk-fra0jg2y.js:22855-22954 esm-layout
// deferred: uses validateUnevaluatedSchema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fra0jg2y.js:22855", () => {
  validateUnevaluatedSchema.evaluated = {
    props: {
      unevaluatedItems: true,
      unevaluatedProperties: true,
    },
    dynamicProps: false,
    dynamicItems: false,
  };
});
//@ chunk-fra0jg2y.js:22954-24545 esm-fingerprint
var validationMetaSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://json-schema.org/draft/2020-12/meta/validation",
  $vocabulary: {
    "https://json-schema.org/draft/2020-12/vocab/validation": true,
  },
  $dynamicAnchor: "meta",
  title: "Validation vocabulary meta-schema",
  type: ["object", "boolean"],
  properties: {
    type: {
      anyOf: [
        {
          $ref: "#/$defs/simpleTypes",
        },
        {
          type: "array",
          items: {
            $ref: "#/$defs/simpleTypes",
          },
          minItems: 1,
          uniqueItems: true,
        },
      ],
    },
    const: true,
    enum: {
      type: "array",
      items: true,
    },
    multipleOf: {
      type: "number",
      exclusiveMinimum: 0,
    },
    maximum: {
      type: "number",
    },
    exclusiveMaximum: {
      type: "number",
    },
    minimum: {
      type: "number",
    },
    exclusiveMinimum: {
      type: "number",
    },
    maxLength: {
      $ref: "#/$defs/nonNegativeInteger",
    },
    minLength: {
      $ref: "#/$defs/nonNegativeIntegerDefault0",
    },
    pattern: {
      type: "string",
      format: "regex",
    },
    maxItems: {
      $ref: "#/$defs/nonNegativeInteger",
    },
    minItems: {
      $ref: "#/$defs/nonNegativeIntegerDefault0",
    },
    uniqueItems: {
      type: "boolean",
      default: false,
    },
    maxContains: {
      $ref: "#/$defs/nonNegativeInteger",
    },
    minContains: {
      $ref: "#/$defs/nonNegativeInteger",
      default: 1,
    },
    maxProperties: {
      $ref: "#/$defs/nonNegativeInteger",
    },
    minProperties: {
      $ref: "#/$defs/nonNegativeIntegerDefault0",
    },
    required: {
      $ref: "#/$defs/stringArray",
    },
    dependentRequired: {
      type: "object",
      additionalProperties: {
        $ref: "#/$defs/stringArray",
      },
    },
  },
  $defs: {
    nonNegativeInteger: {
      type: "integer",
      minimum: 0,
    },
    nonNegativeIntegerDefault0: {
      $ref: "#/$defs/nonNegativeInteger",
      default: 0,
    },
    simpleTypes: {
      enum: ["array", "boolean", "integer", "null", "number", "object", "string"],
    },
    stringArray: {
      type: "array",
      items: {
        type: "string",
      },
      uniqueItems: true,
      default: [],
    },
  },
};
var simpleTypes = {
  enum: ["array", "boolean", "integer", "null", "number", "object", "string"],
};
//@ chunk-fra0jg2y.js:24545-24566 esm-layout
var require_ajv; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fra0jg2y.js:24545", () => {
  require_ajv = require_equal().default;
});
//@ chunk-fra0jg2y.js:36244-36750 esm-fingerprint
var metaDataMetaSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://json-schema.org/draft/2020-12/meta/meta-data",
  $vocabulary: {
    "https://json-schema.org/draft/2020-12/vocab/meta-data": true,
  },
  $dynamicAnchor: "meta",
  title: "Meta-data vocabulary meta-schema",
  type: ["object", "boolean"],
  properties: {
    title: {
      type: "string",
    },
    description: {
      type: "string",
    },
    default: true,
    deprecated: {
      type: "boolean",
      default: false,
    },
    readOnly: {
      type: "boolean",
      default: false,
    },
    writeOnly: {
      type: "boolean",
      default: false,
    },
    examples: {
      type: "array",
      items: true,
    },
  },
};
//@ chunk-fra0jg2y.js:36750-38764 esm-layout
function validateMetaDataSchema(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {},
) {
  let errors = null;
  let errorsCount = 0;
  let evaluated = validateMetaDataSchema.evaluated;
  if (evaluated.dynamicProps) evaluated.props = undefined;
  if (evaluated.dynamicItems) evaluated.items = undefined;
  if (!(data && typeof data == "object" && !Array.isArray(data)) && typeof data !== "boolean") {
    validateMetaDataSchema.errors = [
      {
        instancePath,
        schemaPath: "#/type",
        keyword: "type",
        params: {
          type: metaDataMetaSchema.type,
        },
        message: "must be object,boolean",
      },
    ];
    return false;
  }
  if (!dynamicAnchors.meta) dynamicAnchors.meta = validateMetaDataSchema;
  if (errorsCount === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.title !== undefined) {
        let errsBeforeTitle = errorsCount;
        if (typeof data.title !== "string") {
          validateMetaDataSchema.errors = [
            {
              instancePath: instancePath + "/title",
              schemaPath: "#/properties/title/type",
              keyword: "type",
              params: {
                type: "string",
              },
              message: "must be string",
            },
          ];
          return false;
        }
        var isKeywordValid = errsBeforeTitle === errorsCount;
      } else var isKeywordValid = true;
      if (isKeywordValid) {
        if (data.description !== undefined) {
          let errsBeforeDescription = errorsCount;
          if (typeof data.description !== "string") {
            validateMetaDataSchema.errors = [
              {
                instancePath: instancePath + "/description",
                schemaPath: "#/properties/description/type",
                keyword: "type",
                params: {
                  type: "string",
                },
                message: "must be string",
              },
            ];
            return false;
          }
          var isKeywordValid = errsBeforeDescription === errorsCount;
        } else var isKeywordValid = true;
        if (isKeywordValid) {
          if (data.deprecated !== undefined) {
            let errsBeforeDeprecated = errorsCount;
            if (typeof data.deprecated !== "boolean") {
              validateMetaDataSchema.errors = [
                {
                  instancePath: instancePath + "/deprecated",
                  schemaPath: "#/properties/deprecated/type",
                  keyword: "type",
                  params: {
                    type: "boolean",
                  },
                  message: "must be boolean",
                },
              ];
              return false;
            }
            var isKeywordValid = errsBeforeDeprecated === errorsCount;
          } else var isKeywordValid = true;
          if (isKeywordValid) {
            if (data.readOnly !== undefined) {
              let errsBeforeReadOnly = errorsCount;
              if (typeof data.readOnly !== "boolean") {
                validateMetaDataSchema.errors = [
                  {
                    instancePath: instancePath + "/readOnly",
                    schemaPath: "#/properties/readOnly/type",
                    keyword: "type",
                    params: {
                      type: "boolean",
                    },
                    message: "must be boolean",
                  },
                ];
                return false;
              }
              var isKeywordValid = errsBeforeReadOnly === errorsCount;
            } else var isKeywordValid = true;
            if (isKeywordValid) {
              if (data.writeOnly !== undefined) {
                let errsBeforeWriteOnly = errorsCount;
                if (typeof data.writeOnly !== "boolean") {
                  validateMetaDataSchema.errors = [
                    {
                      instancePath: instancePath + "/writeOnly",
                      schemaPath: "#/properties/writeOnly/type",
                      keyword: "type",
                      params: {
                        type: "boolean",
                      },
                      message: "must be boolean",
                    },
                  ];
                  return false;
                }
                var isKeywordValid = errsBeforeWriteOnly === errorsCount;
              } else var isKeywordValid = true;
              if (isKeywordValid)
                if (data.examples !== undefined) {
                  let errsBeforeExamples = errorsCount;
                  if (errorsCount === errsBeforeExamples) {
                    if (!Array.isArray(data.examples)) {
                      validateMetaDataSchema.errors = [
                        {
                          instancePath: instancePath + "/examples",
                          schemaPath: "#/properties/examples/type",
                          keyword: "type",
                          params: {
                            type: "array",
                          },
                          message: "must be array",
                        },
                      ];
                      return false;
                    }
                  }
                  var isKeywordValid = errsBeforeExamples === errorsCount;
                } else var isKeywordValid = true;
            }
          }
        }
      }
    }
  }
  validateMetaDataSchema.errors = errors;
  return errorsCount === 0;
}
//@ chunk-fra0jg2y.js:38764-38904 esm-layout
// deferred: uses validateMetaDataSchema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fra0jg2y.js:38764", () => {
  validateMetaDataSchema.evaluated = {
    props: {
      title: true,
      description: true,
      default: true,
      deprecated: true,
      readOnly: true,
      writeOnly: true,
      examples: true,
    },
    dynamicProps: false,
    dynamicItems: false,
  };
});
//@ chunk-fra0jg2y.js:38904-39261 esm-fingerprint
var formatAnnotationMetaSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://json-schema.org/draft/2020-12/meta/format-annotation",
  $vocabulary: {
    "https://json-schema.org/draft/2020-12/vocab/format-annotation": true,
  },
  $dynamicAnchor: "meta",
  title: "Format vocabulary meta-schema for annotation results",
  type: ["object", "boolean"],
  properties: {
    format: {
      type: "string",
    },
  },
};
//@ chunk-fra0jg2y.js:39261-39959 esm-layout
function validateFormatAnnotationSchema(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {},
) {
  let errors = null;
  let errorsCount = 0;
  let evaluated = validateFormatAnnotationSchema.evaluated;
  if (evaluated.dynamicProps) evaluated.props = undefined;
  if (evaluated.dynamicItems) evaluated.items = undefined;
  if (!(data && typeof data == "object" && !Array.isArray(data)) && typeof data !== "boolean") {
    validateFormatAnnotationSchema.errors = [
      {
        instancePath,
        schemaPath: "#/type",
        keyword: "type",
        params: {
          type: formatAnnotationMetaSchema.type,
        },
        message: "must be object,boolean",
      },
    ];
    return false;
  }
  if (!dynamicAnchors.meta) dynamicAnchors.meta = validateFormatAnnotationSchema;
  if (errorsCount === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.format !== undefined) {
        if (typeof data.format !== "string") {
          validateFormatAnnotationSchema.errors = [
            {
              instancePath: instancePath + "/format",
              schemaPath: "#/properties/format/type",
              keyword: "type",
              params: {
                type: "string",
              },
              message: "must be string",
            },
          ];
          return false;
        }
      }
    }
  }
  validateFormatAnnotationSchema.errors = errors;
  return errorsCount === 0;
}
//@ chunk-fra0jg2y.js:39959-40023 esm-layout
// deferred: uses validateFormatAnnotationSchema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fra0jg2y.js:39959", () => {
  validateFormatAnnotationSchema.evaluated = {
    props: {
      format: true,
    },
    dynamicProps: false,
    dynamicItems: false,
  };
});
//@ chunk-fra0jg2y.js:40023-40416 esm-fingerprint
var contentMetaSchema = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://json-schema.org/draft/2020-12/meta/content",
  $vocabulary: {
    "https://json-schema.org/draft/2020-12/vocab/content": true,
  },
  $dynamicAnchor: "meta",
  title: "Content vocabulary meta-schema",
  type: ["object", "boolean"],
  properties: {
    contentEncoding: {
      type: "string",
    },
    contentMediaType: {
      type: "string",
    },
    contentSchema: {
      $dynamicRef: "#meta",
    },
  },
};
//@ chunk-fra0jg2y.js:40416-42121 affinity
function validateContentSchema(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {},
) {
  let vErrors = null;
  let errorsCount = 0;
  let evaluated = validateContentSchema.evaluated;
  if (evaluated.dynamicProps) evaluated.props = undefined;
  if (evaluated.dynamicItems) evaluated.items = undefined;
  if (!(data && typeof data == "object" && !Array.isArray(data)) && typeof data !== "boolean") {
    validateContentSchema.errors = [
      {
        instancePath,
        schemaPath: "#/type",
        keyword: "type",
        params: {
          type: contentMetaSchema.type,
        },
        message: "must be object,boolean",
      },
    ];
    return false;
  }
  if (!dynamicAnchors.meta) dynamicAnchors.meta = validateContentSchema;
  if (errorsCount === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.contentEncoding !== undefined) {
        let errsBeforeContentEncoding = errorsCount;
        if (typeof data.contentEncoding !== "string") {
          validateContentSchema.errors = [
            {
              instancePath: instancePath + "/contentEncoding",
              schemaPath: "#/properties/contentEncoding/type",
              keyword: "type",
              params: {
                type: "string",
              },
              message: "must be string",
            },
          ];
          return false;
        }
        var isKeywordValid = errsBeforeContentEncoding === errorsCount;
      } else var isKeywordValid = true;
      if (isKeywordValid) {
        if (data.contentMediaType !== undefined) {
          let errsBeforeContentMediaType = errorsCount;
          if (typeof data.contentMediaType !== "string") {
            validateContentSchema.errors = [
              {
                instancePath: instancePath + "/contentMediaType",
                schemaPath: "#/properties/contentMediaType/type",
                keyword: "type",
                params: {
                  type: "string",
                },
                message: "must be string",
              },
            ];
            return false;
          }
          var isKeywordValid = errsBeforeContentMediaType === errorsCount;
        } else var isKeywordValid = true;
        if (isKeywordValid)
          if (data.contentSchema !== undefined) {
            let contentSchema = data.contentSchema;
            let errsBeforeContentSchema = errorsCount;
            let meta = dynamicAnchors.meta;
            if (meta) {
              if (
                !meta(contentSchema, {
                  instancePath: instancePath + "/contentSchema",
                  parentData: data,
                  parentDataProperty: "contentSchema",
                  rootData,
                  dynamicAnchors,
                })
              ) {
                vErrors = vErrors === null ? meta.errors : vErrors.concat(meta.errors);
                errorsCount = vErrors.length;
              } else {
                var props = meta.evaluated.props;
                var items = meta.evaluated.items;
              }
            } else if (
              !validateContentSchema(contentSchema, {
                instancePath: instancePath + "/contentSchema",
                parentData: data,
                parentDataProperty: "contentSchema",
                rootData,
                dynamicAnchors,
              })
            ) {
              vErrors =
                vErrors === null
                  ? validateContentSchema.errors
                  : vErrors.concat(validateContentSchema.errors);
              errorsCount = vErrors.length;
            } else {
              var props_2 = validateContentSchema.evaluated.props;
              if (props !== true && props_2 !== undefined)
                if (props_2 === true) props = true;
                else {
                  props = props || {};
                  Object.assign(props, props_2);
                }
              var items_2 = validateContentSchema.evaluated.items;
              if (items !== true && items_2 !== undefined)
                items = items_2 === true ? true : items > items_2 ? items : items_2;
            }
            var isKeywordValid = errsBeforeContentSchema === errorsCount;
          } else var isKeywordValid = true;
      }
    }
  }
  validateContentSchema.errors = vErrors;
  return errorsCount === 0;
}
//@ chunk-fra0jg2y.js:42121-42231 affinity
// deferred: uses validateContentSchema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fra0jg2y.js:42121", () => {
  validateContentSchema.evaluated = {
    props: {
      contentEncoding: true,
      contentMediaType: true,
      contentSchema: true,
    },
    dynamicProps: false,
    dynamicItems: false,
  };
});
//@ chunk-fra0jg2y.js:42231-48153 affinity
function validateMetaSchema(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {},
) {
  let vErrors = null;
  let errorsCount = 0;
  let evaluated = validateMetaSchema.evaluated;
  if (evaluated.dynamicProps) evaluated.props = undefined;
  if (evaluated.dynamicItems) evaluated.items = undefined;
  if (!(data && typeof data == "object" && !Array.isArray(data)) && typeof data !== "boolean") {
    validateMetaSchema.errors = [
      {
        instancePath,
        schemaPath: "#/type",
        keyword: "type",
        params: {
          type: metaSchema2020.type,
        },
        message: "must be object,boolean",
      },
    ];
    return false;
  }
  if (!dynamicAnchors.meta) dynamicAnchors.meta = validateMetaSchema;
  let errsBeforeCore = errorsCount;
  if (
    !validateCoreSchema(data, {
      instancePath,
      parentData,
      parentDataProperty,
      rootData,
      dynamicAnchors,
    })
  ) {
    vErrors = vErrors === null ? validateCoreSchema.errors : vErrors.concat(validateCoreSchema.errors);
    errorsCount = vErrors.length;
  }
  var isSubSchemaValid = errsBeforeCore === errorsCount;
  if (isSubSchemaValid) {
    let errsBeforeApplicator = errorsCount;
    if (
      !validateApplicatorSchema(data, {
        instancePath,
        parentData,
        parentDataProperty,
        rootData,
        dynamicAnchors,
      })
    ) {
      vErrors =
        vErrors === null ? validateApplicatorSchema.errors : vErrors.concat(validateApplicatorSchema.errors);
      errorsCount = vErrors.length;
    }
    var isSubSchemaValid = errsBeforeApplicator === errorsCount;
    if (isSubSchemaValid) {
      let errsBeforeUnevaluated = errorsCount;
      if (
        !validateUnevaluatedSchema(data, {
          instancePath,
          parentData,
          parentDataProperty,
          rootData,
          dynamicAnchors,
        })
      ) {
        vErrors =
          vErrors === null
            ? validateUnevaluatedSchema.errors
            : vErrors.concat(validateUnevaluatedSchema.errors);
        errorsCount = vErrors.length;
      }
      var isSubSchemaValid = errsBeforeUnevaluated === errorsCount;
      if (isSubSchemaValid) {
        let errsBeforeValidation = errorsCount;
        if (
          !validateValidationSchema(data, {
            instancePath,
            parentData,
            parentDataProperty,
            rootData,
            dynamicAnchors,
          })
        ) {
          vErrors =
            vErrors === null
              ? validateValidationSchema.errors
              : vErrors.concat(validateValidationSchema.errors);
          errorsCount = vErrors.length;
        }
        var isSubSchemaValid = errsBeforeValidation === errorsCount;
        if (isSubSchemaValid) {
          let errsBeforeMetaData = errorsCount;
          if (
            !validateMetaDataSchema(data, {
              instancePath,
              parentData,
              parentDataProperty,
              rootData,
              dynamicAnchors,
            })
          ) {
            vErrors =
              vErrors === null
                ? validateMetaDataSchema.errors
                : vErrors.concat(validateMetaDataSchema.errors);
            errorsCount = vErrors.length;
          }
          var isSubSchemaValid = errsBeforeMetaData === errorsCount;
          if (isSubSchemaValid) {
            let errsBeforeFormatAnnotation = errorsCount;
            if (
              !validateFormatAnnotationSchema(data, {
                instancePath,
                parentData,
                parentDataProperty,
                rootData,
                dynamicAnchors,
              })
            ) {
              vErrors =
                vErrors === null
                  ? validateFormatAnnotationSchema.errors
                  : vErrors.concat(validateFormatAnnotationSchema.errors);
              errorsCount = vErrors.length;
            }
            var isSubSchemaValid = errsBeforeFormatAnnotation === errorsCount;
            if (isSubSchemaValid) {
              let errsBeforeContent = errorsCount;
              if (
                !validateContentSchema(data, {
                  instancePath,
                  parentData,
                  parentDataProperty,
                  rootData,
                  dynamicAnchors,
                })
              ) {
                vErrors =
                  vErrors === null
                    ? validateContentSchema.errors
                    : vErrors.concat(validateContentSchema.errors);
                errorsCount = vErrors.length;
              }
              var isSubSchemaValid = errsBeforeContent === errorsCount;
            }
          }
        }
      }
    }
  }
  if (errorsCount === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.definitions !== undefined) {
        let definitions = data.definitions;
        let errsBeforeDefinitions = errorsCount;
        if (errorsCount === errsBeforeDefinitions)
          if (definitions && typeof definitions == "object" && !Array.isArray(definitions))
            for (let key in definitions) {
              let definitionSchema = definitions[key];
              let errsBeforeDefinition = errorsCount;
              let meta = dynamicAnchors.meta;
              if (meta) {
                if (
                  !meta(definitionSchema, {
                    instancePath:
                      instancePath + "/definitions/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                    parentData: definitions,
                    parentDataProperty: key,
                    rootData,
                    dynamicAnchors,
                  })
                ) {
                  vErrors = vErrors === null ? meta.errors : vErrors.concat(meta.errors);
                  errorsCount = vErrors.length;
                } else {
                  var props = meta.evaluated.props;
                  var items = meta.evaluated.items;
                }
              } else if (
                !validateMetaSchema(definitionSchema, {
                  instancePath: instancePath + "/definitions/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                  parentData: definitions,
                  parentDataProperty: key,
                  rootData,
                  dynamicAnchors,
                })
              ) {
                vErrors =
                  vErrors === null ? validateMetaSchema.errors : vErrors.concat(validateMetaSchema.errors);
                errorsCount = vErrors.length;
              } else {
                var props_2 = validateMetaSchema.evaluated.props;
                if (props !== true && props_2 !== undefined)
                  if (props_2 === true) props = true;
                  else {
                    props = props || {};
                    Object.assign(props, props_2);
                  }
                var items_2 = validateMetaSchema.evaluated.items;
                if (items !== true && items_2 !== undefined)
                  items = items_2 === true ? true : items > items_2 ? items : items_2;
              }
              var isDefinitionValid = errsBeforeDefinition === errorsCount;
              if (!isDefinitionValid) break;
            }
          else {
            validateMetaSchema.errors = [
              {
                instancePath: instancePath + "/definitions",
                schemaPath: "#/properties/definitions/type",
                keyword: "type",
                params: {
                  type: "object",
                },
                message: "must be object",
              },
            ];
            return false;
          }
        var isKeywordValid = errsBeforeDefinitions === errorsCount;
      } else var isKeywordValid = true;
      if (isKeywordValid) {
        if (data.dependencies !== undefined) {
          let dependencies = data.dependencies;
          let errsBeforeDependencies = errorsCount;
          if (errorsCount === errsBeforeDependencies)
            if (dependencies && typeof dependencies == "object" && !Array.isArray(dependencies))
              for (let key in dependencies) {
                let dependencyValue = dependencies[key];
                let errsBeforeDependency = errorsCount;
                let errsBeforeDependencyAnyOf = errorsCount;
                let isDependencyAnyOfValid = false;
                let errsBeforeDependencySchema = errorsCount;
                let meta = dynamicAnchors.meta;
                if (meta) {
                  if (
                    !meta(dependencyValue, {
                      instancePath:
                        instancePath + "/dependencies/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                      parentData: dependencies,
                      parentDataProperty: key,
                      rootData,
                      dynamicAnchors,
                    })
                  ) {
                    vErrors = vErrors === null ? meta.errors : vErrors.concat(meta.errors);
                    errorsCount = vErrors.length;
                  } else {
                    var props_3 = meta.evaluated.props;
                    var items_3 = meta.evaluated.items;
                  }
                } else if (
                  !validateMetaSchema(dependencyValue, {
                    instancePath:
                      instancePath + "/dependencies/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                    parentData: dependencies,
                    parentDataProperty: key,
                    rootData,
                    dynamicAnchors,
                  })
                ) {
                  vErrors =
                    vErrors === null ? validateMetaSchema.errors : vErrors.concat(validateMetaSchema.errors);
                  errorsCount = vErrors.length;
                } else {
                  var props_4 = validateMetaSchema.evaluated.props;
                  if (props_3 !== true && props_4 !== undefined)
                    if (props_4 === true) props_3 = true;
                    else {
                      props_3 = props_3 || {};
                      Object.assign(props_3, props_4);
                    }
                  var items_4 = validateMetaSchema.evaluated.items;
                  if (items_3 !== true && items_4 !== undefined)
                    items_3 = items_4 === true ? true : items_3 > items_4 ? items_3 : items_4;
                }
                var isDependencySchemaValid = errsBeforeDependencySchema === errorsCount;
                isDependencyAnyOfValid = isDependencyAnyOfValid || isDependencySchemaValid;
                let errsBeforeDependencyArray = errorsCount;
                if (errorsCount === errorsCount)
                  if (Array.isArray(dependencyValue)) {
                    var isDependencyItemValid = true;
                    let dependencyItemCount = dependencyValue.length;
                    for (let idx = 0; idx < dependencyItemCount; idx++) {
                      let errsBeforeDependencyItem = errorsCount;
                      if (typeof dependencyValue[idx] !== "string") {
                        let dependencyItemTypeError = {
                          instancePath:
                            instancePath +
                            "/dependencies/" +
                            key.replace(/~/g, "~0").replace(/\//g, "~1") +
                            "/" +
                            idx,
                          schemaPath: "meta/validation#/$defs/stringArray/items/type",
                          keyword: "type",
                          params: {
                            type: "string",
                          },
                          message: "must be string",
                        };
                        if (vErrors === null) vErrors = [dependencyItemTypeError];
                        else vErrors.push(dependencyItemTypeError);
                        errorsCount++;
                      }
                      var isDependencyItemValid = errsBeforeDependencyItem === errorsCount;
                      if (!isDependencyItemValid) break;
                    }
                    if (isDependencyItemValid) {
                      let dependencyItemIndex = dependencyValue.length;
                      let duplicateIndex;
                      if (dependencyItemIndex > 1) {
                        let seenItems = {};
                        for (; dependencyItemIndex--;) {
                          let dependencyItem = dependencyValue[dependencyItemIndex];
                          if (typeof dependencyItem !== "string") continue;
                          if (typeof seenItems[dependencyItem] == "number") {
                            duplicateIndex = seenItems[dependencyItem];
                            let duplicateItemError = {
                              instancePath:
                                instancePath +
                                "/dependencies/" +
                                key.replace(/~/g, "~0").replace(/\//g, "~1"),
                              schemaPath: "meta/validation#/$defs/stringArray/uniqueItems",
                              keyword: "uniqueItems",
                              params: {
                                i: dependencyItemIndex,
                                j: duplicateIndex,
                              },
                              message:
                                "must NOT have duplicate items (items ## " +
                                duplicateIndex +
                                " and " +
                                dependencyItemIndex +
                                " are identical)",
                            };
                            if (vErrors === null) vErrors = [duplicateItemError];
                            else vErrors.push(duplicateItemError);
                            errorsCount++;
                            break;
                          }
                          seenItems[dependencyItem] = dependencyItemIndex;
                        }
                      }
                    }
                  } else {
                    let dependencyArrayTypeError = {
                      instancePath:
                        instancePath + "/dependencies/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                      schemaPath: "meta/validation#/$defs/stringArray/type",
                      keyword: "type",
                      params: {
                        type: "array",
                      },
                      message: "must be array",
                    };
                    if (vErrors === null) vErrors = [dependencyArrayTypeError];
                    else vErrors.push(dependencyArrayTypeError);
                    errorsCount++;
                  }
                var isDependencySchemaValid = errsBeforeDependencyArray === errorsCount;
                isDependencyAnyOfValid = isDependencyAnyOfValid || isDependencySchemaValid;
                if (isDependencySchemaValid) {
                  if (items_3 !== true) items_3 = true;
                }
                if (!isDependencyAnyOfValid) {
                  let dependencyAnyOfError = {
                    instancePath:
                      instancePath + "/dependencies/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                    schemaPath: "#/properties/dependencies/additionalProperties/anyOf",
                    keyword: "anyOf",
                    params: {},
                    message: "must match a schema in anyOf",
                  };
                  if (vErrors === null) vErrors = [dependencyAnyOfError];
                  else vErrors.push(dependencyAnyOfError);
                  errorsCount++;
                  validateMetaSchema.errors = vErrors;
                  return false;
                } else {
                  errorsCount = errsBeforeDependencyAnyOf;
                  if (vErrors !== null)
                    if (errsBeforeDependencyAnyOf) vErrors.length = errsBeforeDependencyAnyOf;
                    else vErrors = null;
                }
                var isDependencyEntryValid = errsBeforeDependency === errorsCount;
                if (!isDependencyEntryValid) break;
              }
            else {
              validateMetaSchema.errors = [
                {
                  instancePath: instancePath + "/dependencies",
                  schemaPath: "#/properties/dependencies/type",
                  keyword: "type",
                  params: {
                    type: "object",
                  },
                  message: "must be object",
                },
              ];
              return false;
            }
          var isKeywordValid = errsBeforeDependencies === errorsCount;
        } else var isKeywordValid = true;
        if (isKeywordValid) {
          if (data.$recursiveAnchor !== undefined) {
            let $recursiveAnchor = data.$recursiveAnchor;
            let errsBeforeRecursiveAnchor = errorsCount;
            if (errorsCount === errorsCount)
              if (typeof $recursiveAnchor === "string") {
                if (!regExp_2.test($recursiveAnchor)) {
                  validateMetaSchema.errors = [
                    {
                      instancePath: instancePath + "/$recursiveAnchor",
                      schemaPath: "meta/core#/$defs/anchorString/pattern",
                      keyword: "pattern",
                      params: {
                        pattern: "^[A-Za-z_][-A-Za-z0-9._]*$",
                      },
                      message: 'must match pattern "^[A-Za-z_][-A-Za-z0-9._]*$"',
                    },
                  ];
                  return false;
                }
              } else {
                validateMetaSchema.errors = [
                  {
                    instancePath: instancePath + "/$recursiveAnchor",
                    schemaPath: "meta/core#/$defs/anchorString/type",
                    keyword: "type",
                    params: {
                      type: "string",
                    },
                    message: "must be string",
                  },
                ];
                return false;
              }
            var isKeywordValid = errsBeforeRecursiveAnchor === errorsCount;
          } else var isKeywordValid = true;
          if (isKeywordValid)
            if (data.$recursiveRef !== undefined) {
              let errsBeforeRecursiveRef = errorsCount;
              let errsAfterRecursiveRef = errorsCount;
              if (errorsCount === errsAfterRecursiveRef) {
                if (errorsCount === errsAfterRecursiveRef) {
                  if (typeof data.$recursiveRef !== "string") {
                    validateMetaSchema.errors = [
                      {
                        instancePath: instancePath + "/$recursiveRef",
                        schemaPath: "meta/core#/$defs/uriReferenceString/type",
                        keyword: "type",
                        params: {
                          type: "string",
                        },
                        message: "must be string",
                      },
                    ];
                    return false;
                  }
                }
              }
              var isKeywordValid = errsBeforeRecursiveRef === errorsCount;
            } else var isKeywordValid = true;
        }
      }
    }
  }
  validateMetaSchema.errors = vErrors;
  return errorsCount === 0;
}
//@ chunk-fra0jg2y.js:48153-49040 affinity
// deferred: uses validateMetaSchema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fra0jg2y.js:48153", () => {
  validateMetaSchema.evaluated = {
    props: {
      definitions: true,
      dependencies: true,
      $recursiveAnchor: true,
      $recursiveRef: true,
      contentEncoding: true,
      contentMediaType: true,
      contentSchema: true,
      format: true,
      title: true,
      description: true,
      default: true,
      deprecated: true,
      readOnly: true,
      writeOnly: true,
      examples: true,
      type: true,
      const: true,
      enum: true,
      multipleOf: true,
      maximum: true,
      exclusiveMaximum: true,
      minimum: true,
      exclusiveMinimum: true,
      maxLength: true,
      minLength: true,
      pattern: true,
      maxItems: true,
      minItems: true,
      uniqueItems: true,
      maxContains: true,
      minContains: true,
      maxProperties: true,
      minProperties: true,
      required: true,
      dependentRequired: true,
      unevaluatedItems: true,
      unevaluatedProperties: true,
      prefixItems: true,
      items: true,
      contains: true,
      additionalProperties: true,
      properties: true,
      patternProperties: true,
      dependentSchemas: true,
      propertyNames: true,
      if: true,
      then: true,
      else: true,
      allOf: true,
      anyOf: true,
      oneOf: true,
      not: true,
      $id: true,
      $schema: true,
      $ref: true,
      $anchor: true,
      $dynamicRef: true,
      $dynamicAnchor: true,
      $vocabulary: true,
      $comment: true,
      $defs: true,
    },
    dynamicProps: false,
    dynamicItems: false,
  };
});

// The import cycle this module closes (2 modules) is complete: run the load-time work its statements
// marked "deferred" waited for, in the official build's order (runtime/deferred-init.js).
runDeferredInits("vendor/@modelcontextprotocol/client/dist/ajvProvider-BIwGVY6G.mjs");
runDeferredInits("worker:vendor/@modelcontextprotocol/client/dist/ajvProvider-BIwGVY6G.mjs");
export { AjvJsonSchemaValidator, validationMetaSchema, simpleTypes, require_ajv, metaSchemaCheck };

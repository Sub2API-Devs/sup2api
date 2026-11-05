/**
 * @modelcontextprotocol/client/dist/cfWorkerProvider-l7BFVI5n.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @modelcontextprotocol/client@2.0.0
 * pieces: chunk-fra0jg2y.js (2), chunk-z20c443b.js (1)
 * attribution: esm-layout 1, esm-fingerprint 2
 */
import { validationMetaSchema, simpleTypes, require_ajv } from "./ajvProvider-BIwGVY6G.mjs";
import { deferInit, beginDeferredInits } from "../../../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 2 modules closed by ./ajvProvider-BIwGVY6G.mjs;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("vendor/@modelcontextprotocol/client/dist/ajvProvider-BIwGVY6G.mjs");
// This module is the first evaluated of an import cycle of 2 modules closed by ./ajvProvider-BIwGVY6G.mjs (in the hooks worker thread);
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("worker:vendor/@modelcontextprotocol/client/dist/ajvProvider-BIwGVY6G.mjs");
//@ chunk-z20c443b.js:352137-352293 esm-fingerprint
function countCodePointsInString(str, strLength) {
  let i = 0;
  for (let j = 0; j < strLength; j++) {
    let charCode = str.charCodeAt(j);
    if (
      charCode >= 55296 &&
      charCode <= 56319 &&
      j + 1 < str.length &&
      (str.charCodeAt(j + 1) & 64512) === 56320
    )
      j++;
    i++;
  }
  return i;
}
//@ chunk-fra0jg2y.js:24566-35916 esm-layout
function validateValidationSchema(
  data,
  { instancePath = "", parentData, parentDataProperty, rootData = data, dynamicAnchors = {} } = {},
) {
  let vErrors = null;
  let errorsCount = 0;
  let evaluated = validateValidationSchema.evaluated;
  if (evaluated.dynamicProps) evaluated.props = undefined;
  if (evaluated.dynamicItems) evaluated.items = undefined;
  if (!(data && typeof data == "object" && !Array.isArray(data)) && typeof data !== "boolean") {
    validateValidationSchema.errors = [
      {
        instancePath,
        schemaPath: "#/type",
        keyword: "type",
        params: {
          type: validationMetaSchema.type,
        },
        message: "must be object,boolean",
      },
    ];
    return false;
  }
  if (!dynamicAnchors.meta) dynamicAnchors.meta = validateValidationSchema;
  if (errorsCount === 0) {
    if (data && typeof data == "object" && !Array.isArray(data)) {
      if (data.type !== undefined) {
        let typeValue = data.type;
        let errsBeforeType = errorsCount;
        let errsBeforeTypeAnyOf = errorsCount;
        let isTypeAnyOfValid = false;
        let errsBeforeTypeEnum = errorsCount;
        if (!(
          typeValue === "array" ||
          typeValue === "boolean" ||
          typeValue === "integer" ||
          typeValue === "null" ||
          typeValue === "number" ||
          typeValue === "object" ||
          typeValue === "string"
        )) {
          let typeEnumError = {
            instancePath: instancePath + "/type",
            schemaPath: "#/$defs/simpleTypes/enum",
            keyword: "enum",
            params: {
              allowedValues: simpleTypes.enum,
            },
            message: "must be equal to one of the allowed values",
          };
          if (vErrors === null) vErrors = [typeEnumError];
          else vErrors.push(typeEnumError);
          errorsCount++;
        }
        var isTypeEnumValid = errsBeforeTypeEnum === errorsCount;
        isTypeAnyOfValid = isTypeAnyOfValid || isTypeEnumValid;
        let errsBeforeTypeArray = errorsCount;
        if (errorsCount === errsBeforeTypeArray)
          if (Array.isArray(typeValue)) {
            if (typeValue.length < 1) {
              let typeMinItemsError = {
                instancePath: instancePath + "/type",
                schemaPath: "#/properties/type/anyOf/1/minItems",
                keyword: "minItems",
                params: {
                  limit: 1,
                },
                message: "must NOT have fewer than 1 items",
              };
              if (vErrors === null) vErrors = [typeMinItemsError];
              else vErrors.push(typeMinItemsError);
              errorsCount++;
            } else {
              var isTypeItemValid = true;
              let typeItemCount = typeValue.length;
              for (let typeIndex = 0; typeIndex < typeItemCount; typeIndex++) {
                let typeItem = typeValue[typeIndex];
                let errsBeforeTypeItem = errorsCount;
                if (!(
                  typeItem === "array" ||
                  typeItem === "boolean" ||
                  typeItem === "integer" ||
                  typeItem === "null" ||
                  typeItem === "number" ||
                  typeItem === "object" ||
                  typeItem === "string"
                )) {
                  let typeItemEnumError = {
                    instancePath: instancePath + "/type/" + typeIndex,
                    schemaPath: "#/$defs/simpleTypes/enum",
                    keyword: "enum",
                    params: {
                      allowedValues: simpleTypes.enum,
                    },
                    message: "must be equal to one of the allowed values",
                  };
                  if (vErrors === null) vErrors = [typeItemEnumError];
                  else vErrors.push(typeItemEnumError);
                  errorsCount++;
                }
                var isTypeItemValid = errsBeforeTypeItem === errorsCount;
                if (!isTypeItemValid) break;
              }
              if (isTypeItemValid) {
                let typeItemIndex = typeValue.length;
                let previousTypeIndex;
                if (typeItemIndex > 1) {
                  e: for (; typeItemIndex--;)
                    for (previousTypeIndex = typeItemIndex; previousTypeIndex--;)
                      if (require_ajv(typeValue[typeItemIndex], typeValue[previousTypeIndex])) {
                        let typeUniqueItemError = {
                          instancePath: instancePath + "/type",
                          schemaPath: "#/properties/type/anyOf/1/uniqueItems",
                          keyword: "uniqueItems",
                          params: {
                            i: typeItemIndex,
                            j: previousTypeIndex,
                          },
                          message:
                            "must NOT have duplicate items (items ## " +
                            previousTypeIndex +
                            " and " +
                            typeItemIndex +
                            " are identical)",
                        };
                        if (vErrors === null) vErrors = [typeUniqueItemError];
                        else vErrors.push(typeUniqueItemError);
                        errorsCount++;
                        break e;
                      }
                }
              }
            }
          } else {
            let typeArrayTypeError = {
              instancePath: instancePath + "/type",
              schemaPath: "#/properties/type/anyOf/1/type",
              keyword: "type",
              params: {
                type: "array",
              },
              message: "must be array",
            };
            if (vErrors === null) vErrors = [typeArrayTypeError];
            else vErrors.push(typeArrayTypeError);
            errorsCount++;
          }
        var isTypeEnumValid = errsBeforeTypeArray === errorsCount;
        isTypeAnyOfValid = isTypeAnyOfValid || isTypeEnumValid;
        if (!isTypeAnyOfValid) {
          let typeAnyOfError = {
            instancePath: instancePath + "/type",
            schemaPath: "#/properties/type/anyOf",
            keyword: "anyOf",
            params: {},
            message: "must match a schema in anyOf",
          };
          if (vErrors === null) vErrors = [typeAnyOfError];
          else vErrors.push(typeAnyOfError);
          errorsCount++;
          validateValidationSchema.errors = vErrors;
          return false;
        } else {
          errorsCount = errsBeforeTypeAnyOf;
          if (vErrors !== null)
            if (errsBeforeTypeAnyOf) vErrors.length = errsBeforeTypeAnyOf;
            else vErrors = null;
        }
        var isKeywordValid = errsBeforeType === errorsCount;
      } else var isKeywordValid = true;
      if (isKeywordValid) {
        if (data.enum !== undefined) {
          let errsBeforeEnum = errorsCount;
          if (errorsCount === errsBeforeEnum) {
            if (!Array.isArray(data.enum)) {
              validateValidationSchema.errors = [
                {
                  instancePath: instancePath + "/enum",
                  schemaPath: "#/properties/enum/type",
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
          var isKeywordValid = errsBeforeEnum === errorsCount;
        } else var isKeywordValid = true;
        if (isKeywordValid) {
          if (data.multipleOf !== undefined) {
            let multipleOf = data.multipleOf;
            let errsBeforeMultipleOf = errorsCount;
            if (errorsCount === errsBeforeMultipleOf)
              if (typeof multipleOf == "number" && isFinite(multipleOf)) {
                if (multipleOf <= 0 || isNaN(multipleOf)) {
                  validateValidationSchema.errors = [
                    {
                      instancePath: instancePath + "/multipleOf",
                      schemaPath: "#/properties/multipleOf/exclusiveMinimum",
                      keyword: "exclusiveMinimum",
                      params: {
                        comparison: ">",
                        limit: 0,
                      },
                      message: "must be > 0",
                    },
                  ];
                  return false;
                }
              } else {
                validateValidationSchema.errors = [
                  {
                    instancePath: instancePath + "/multipleOf",
                    schemaPath: "#/properties/multipleOf/type",
                    keyword: "type",
                    params: {
                      type: "number",
                    },
                    message: "must be number",
                  },
                ];
                return false;
              }
            var isKeywordValid = errsBeforeMultipleOf === errorsCount;
          } else var isKeywordValid = true;
          if (isKeywordValid) {
            if (data.maximum !== undefined) {
              let maximum = data.maximum;
              let errsBeforeMaximum = errorsCount;
              if (!(typeof maximum == "number" && isFinite(maximum))) {
                validateValidationSchema.errors = [
                  {
                    instancePath: instancePath + "/maximum",
                    schemaPath: "#/properties/maximum/type",
                    keyword: "type",
                    params: {
                      type: "number",
                    },
                    message: "must be number",
                  },
                ];
                return false;
              }
              var isKeywordValid = errsBeforeMaximum === errorsCount;
            } else var isKeywordValid = true;
            if (isKeywordValid) {
              if (data.exclusiveMaximum !== undefined) {
                let exclusiveMaximum = data.exclusiveMaximum;
                let errsBeforeExclusiveMaximum = errorsCount;
                if (!(typeof exclusiveMaximum == "number" && isFinite(exclusiveMaximum))) {
                  validateValidationSchema.errors = [
                    {
                      instancePath: instancePath + "/exclusiveMaximum",
                      schemaPath: "#/properties/exclusiveMaximum/type",
                      keyword: "type",
                      params: {
                        type: "number",
                      },
                      message: "must be number",
                    },
                  ];
                  return false;
                }
                var isKeywordValid = errsBeforeExclusiveMaximum === errorsCount;
              } else var isKeywordValid = true;
              if (isKeywordValid) {
                if (data.minimum !== undefined) {
                  let minimum = data.minimum;
                  let errsBeforeMinimum = errorsCount;
                  if (!(typeof minimum == "number" && isFinite(minimum))) {
                    validateValidationSchema.errors = [
                      {
                        instancePath: instancePath + "/minimum",
                        schemaPath: "#/properties/minimum/type",
                        keyword: "type",
                        params: {
                          type: "number",
                        },
                        message: "must be number",
                      },
                    ];
                    return false;
                  }
                  var isKeywordValid = errsBeforeMinimum === errorsCount;
                } else var isKeywordValid = true;
                if (isKeywordValid) {
                  if (data.exclusiveMinimum !== undefined) {
                    let exclusiveMinimum = data.exclusiveMinimum;
                    let errsBeforeExclusiveMinimum = errorsCount;
                    if (!(typeof exclusiveMinimum == "number" && isFinite(exclusiveMinimum))) {
                      validateValidationSchema.errors = [
                        {
                          instancePath: instancePath + "/exclusiveMinimum",
                          schemaPath: "#/properties/exclusiveMinimum/type",
                          keyword: "type",
                          params: {
                            type: "number",
                          },
                          message: "must be number",
                        },
                      ];
                      return false;
                    }
                    var isKeywordValid = errsBeforeExclusiveMinimum === errorsCount;
                  } else var isKeywordValid = true;
                  if (isKeywordValid) {
                    if (data.maxLength !== undefined) {
                      let maxLength = data.maxLength;
                      let errsBeforeMaxLength = errorsCount;
                      let errsBeforeMaxLengthMinimum = errorsCount;
                      if (!(
                        typeof maxLength == "number" &&
                        !(maxLength % 1) &&
                        !isNaN(maxLength) &&
                        isFinite(maxLength)
                      )) {
                        validateValidationSchema.errors = [
                          {
                            instancePath: instancePath + "/maxLength",
                            schemaPath: "#/$defs/nonNegativeInteger/type",
                            keyword: "type",
                            params: {
                              type: "integer",
                            },
                            message: "must be integer",
                          },
                        ];
                        return false;
                      }
                      if (errorsCount === errsBeforeMaxLengthMinimum) {
                        if (typeof maxLength == "number" && isFinite(maxLength)) {
                          if (maxLength < 0 || isNaN(maxLength)) {
                            validateValidationSchema.errors = [
                              {
                                instancePath: instancePath + "/maxLength",
                                schemaPath: "#/$defs/nonNegativeInteger/minimum",
                                keyword: "minimum",
                                params: {
                                  comparison: ">=",
                                  limit: 0,
                                },
                                message: "must be >= 0",
                              },
                            ];
                            return false;
                          }
                        }
                      }
                      var isKeywordValid = errsBeforeMaxLength === errorsCount;
                    } else var isKeywordValid = true;
                    if (isKeywordValid) {
                      if (data.minLength !== undefined) {
                        let minLength = data.minLength;
                        let errsBeforeMinLength = errorsCount;
                        let errsBeforeMinLengthMinimum = errorsCount;
                        if (!(
                          typeof minLength == "number" &&
                          !(minLength % 1) &&
                          !isNaN(minLength) &&
                          isFinite(minLength)
                        )) {
                          validateValidationSchema.errors = [
                            {
                              instancePath: instancePath + "/minLength",
                              schemaPath: "#/$defs/nonNegativeIntegerDefault0/type",
                              keyword: "type",
                              params: {
                                type: "integer",
                              },
                              message: "must be integer",
                            },
                          ];
                          return false;
                        }
                        if (errorsCount === errsBeforeMinLengthMinimum) {
                          if (typeof minLength == "number" && isFinite(minLength)) {
                            if (minLength < 0 || isNaN(minLength)) {
                              validateValidationSchema.errors = [
                                {
                                  instancePath: instancePath + "/minLength",
                                  schemaPath: "#/$defs/nonNegativeIntegerDefault0/minimum",
                                  keyword: "minimum",
                                  params: {
                                    comparison: ">=",
                                    limit: 0,
                                  },
                                  message: "must be >= 0",
                                },
                              ];
                              return false;
                            }
                          }
                        }
                        var isKeywordValid = errsBeforeMinLength === errorsCount;
                      } else var isKeywordValid = true;
                      if (isKeywordValid) {
                        if (data.pattern !== undefined) {
                          let errsBeforePattern = errorsCount;
                          if (errorsCount === errsBeforePattern) {
                            if (errorsCount === errsBeforePattern) {
                              if (typeof data.pattern !== "string") {
                                validateValidationSchema.errors = [
                                  {
                                    instancePath: instancePath + "/pattern",
                                    schemaPath: "#/properties/pattern/type",
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
                          var isKeywordValid = errsBeforePattern === errorsCount;
                        } else var isKeywordValid = true;
                        if (isKeywordValid) {
                          if (data.maxItems !== undefined) {
                            let maxItems = data.maxItems;
                            let errsBeforeMaxItems = errorsCount;
                            let errsBeforeMaxItemsMinimum = errorsCount;
                            if (!(
                              typeof maxItems == "number" &&
                              !(maxItems % 1) &&
                              !isNaN(maxItems) &&
                              isFinite(maxItems)
                            )) {
                              validateValidationSchema.errors = [
                                {
                                  instancePath: instancePath + "/maxItems",
                                  schemaPath: "#/$defs/nonNegativeInteger/type",
                                  keyword: "type",
                                  params: {
                                    type: "integer",
                                  },
                                  message: "must be integer",
                                },
                              ];
                              return false;
                            }
                            if (errorsCount === errsBeforeMaxItemsMinimum) {
                              if (typeof maxItems == "number" && isFinite(maxItems)) {
                                if (maxItems < 0 || isNaN(maxItems)) {
                                  validateValidationSchema.errors = [
                                    {
                                      instancePath: instancePath + "/maxItems",
                                      schemaPath: "#/$defs/nonNegativeInteger/minimum",
                                      keyword: "minimum",
                                      params: {
                                        comparison: ">=",
                                        limit: 0,
                                      },
                                      message: "must be >= 0",
                                    },
                                  ];
                                  return false;
                                }
                              }
                            }
                            var isKeywordValid = errsBeforeMaxItems === errorsCount;
                          } else var isKeywordValid = true;
                          if (isKeywordValid) {
                            if (data.minItems !== undefined) {
                              let minItems = data.minItems;
                              let errsBeforeMinItems = errorsCount;
                              let errsBeforeMinItemsMinimum = errorsCount;
                              if (!(
                                typeof minItems == "number" &&
                                !(minItems % 1) &&
                                !isNaN(minItems) &&
                                isFinite(minItems)
                              )) {
                                validateValidationSchema.errors = [
                                  {
                                    instancePath: instancePath + "/minItems",
                                    schemaPath: "#/$defs/nonNegativeIntegerDefault0/type",
                                    keyword: "type",
                                    params: {
                                      type: "integer",
                                    },
                                    message: "must be integer",
                                  },
                                ];
                                return false;
                              }
                              if (errorsCount === errsBeforeMinItemsMinimum) {
                                if (typeof minItems == "number" && isFinite(minItems)) {
                                  if (minItems < 0 || isNaN(minItems)) {
                                    validateValidationSchema.errors = [
                                      {
                                        instancePath: instancePath + "/minItems",
                                        schemaPath: "#/$defs/nonNegativeIntegerDefault0/minimum",
                                        keyword: "minimum",
                                        params: {
                                          comparison: ">=",
                                          limit: 0,
                                        },
                                        message: "must be >= 0",
                                      },
                                    ];
                                    return false;
                                  }
                                }
                              }
                              var isKeywordValid = errsBeforeMinItems === errorsCount;
                            } else var isKeywordValid = true;
                            if (isKeywordValid) {
                              if (data.uniqueItems !== undefined) {
                                let errsBeforeUniqueItems = errorsCount;
                                if (typeof data.uniqueItems !== "boolean") {
                                  validateValidationSchema.errors = [
                                    {
                                      instancePath: instancePath + "/uniqueItems",
                                      schemaPath: "#/properties/uniqueItems/type",
                                      keyword: "type",
                                      params: {
                                        type: "boolean",
                                      },
                                      message: "must be boolean",
                                    },
                                  ];
                                  return false;
                                }
                                var isKeywordValid = errsBeforeUniqueItems === errorsCount;
                              } else var isKeywordValid = true;
                              if (isKeywordValid) {
                                if (data.maxContains !== undefined) {
                                  let maxContains = data.maxContains;
                                  let errsBeforeMaxContains = errorsCount;
                                  let errsBeforeMaxContainsMinimum = errorsCount;
                                  if (!(
                                    typeof maxContains == "number" &&
                                    !(maxContains % 1) &&
                                    !isNaN(maxContains) &&
                                    isFinite(maxContains)
                                  )) {
                                    validateValidationSchema.errors = [
                                      {
                                        instancePath: instancePath + "/maxContains",
                                        schemaPath: "#/$defs/nonNegativeInteger/type",
                                        keyword: "type",
                                        params: {
                                          type: "integer",
                                        },
                                        message: "must be integer",
                                      },
                                    ];
                                    return false;
                                  }
                                  if (errorsCount === errsBeforeMaxContainsMinimum) {
                                    if (typeof maxContains == "number" && isFinite(maxContains)) {
                                      if (maxContains < 0 || isNaN(maxContains)) {
                                        validateValidationSchema.errors = [
                                          {
                                            instancePath: instancePath + "/maxContains",
                                            schemaPath: "#/$defs/nonNegativeInteger/minimum",
                                            keyword: "minimum",
                                            params: {
                                              comparison: ">=",
                                              limit: 0,
                                            },
                                            message: "must be >= 0",
                                          },
                                        ];
                                        return false;
                                      }
                                    }
                                  }
                                  var isKeywordValid = errsBeforeMaxContains === errorsCount;
                                } else var isKeywordValid = true;
                                if (isKeywordValid) {
                                  if (data.minContains !== undefined) {
                                    let minContains = data.minContains;
                                    let errsBeforeMinContains = errorsCount;
                                    let errsBeforeMinContainsMinimum = errorsCount;
                                    if (!(
                                      typeof minContains == "number" &&
                                      !(minContains % 1) &&
                                      !isNaN(minContains) &&
                                      isFinite(minContains)
                                    )) {
                                      validateValidationSchema.errors = [
                                        {
                                          instancePath: instancePath + "/minContains",
                                          schemaPath: "#/$defs/nonNegativeInteger/type",
                                          keyword: "type",
                                          params: {
                                            type: "integer",
                                          },
                                          message: "must be integer",
                                        },
                                      ];
                                      return false;
                                    }
                                    if (errorsCount === errsBeforeMinContainsMinimum) {
                                      if (typeof minContains == "number" && isFinite(minContains)) {
                                        if (minContains < 0 || isNaN(minContains)) {
                                          validateValidationSchema.errors = [
                                            {
                                              instancePath: instancePath + "/minContains",
                                              schemaPath: "#/$defs/nonNegativeInteger/minimum",
                                              keyword: "minimum",
                                              params: {
                                                comparison: ">=",
                                                limit: 0,
                                              },
                                              message: "must be >= 0",
                                            },
                                          ];
                                          return false;
                                        }
                                      }
                                    }
                                    var isKeywordValid = errsBeforeMinContains === errorsCount;
                                  } else var isKeywordValid = true;
                                  if (isKeywordValid) {
                                    if (data.maxProperties !== undefined) {
                                      let maxProperties = data.maxProperties;
                                      let errsBeforeMaxProperties = errorsCount;
                                      let errsBeforeMaxPropertiesMinimum = errorsCount;
                                      if (!(
                                        typeof maxProperties == "number" &&
                                        !(maxProperties % 1) &&
                                        !isNaN(maxProperties) &&
                                        isFinite(maxProperties)
                                      )) {
                                        validateValidationSchema.errors = [
                                          {
                                            instancePath: instancePath + "/maxProperties",
                                            schemaPath: "#/$defs/nonNegativeInteger/type",
                                            keyword: "type",
                                            params: {
                                              type: "integer",
                                            },
                                            message: "must be integer",
                                          },
                                        ];
                                        return false;
                                      }
                                      if (errorsCount === errsBeforeMaxPropertiesMinimum) {
                                        if (typeof maxProperties == "number" && isFinite(maxProperties)) {
                                          if (maxProperties < 0 || isNaN(maxProperties)) {
                                            validateValidationSchema.errors = [
                                              {
                                                instancePath: instancePath + "/maxProperties",
                                                schemaPath: "#/$defs/nonNegativeInteger/minimum",
                                                keyword: "minimum",
                                                params: {
                                                  comparison: ">=",
                                                  limit: 0,
                                                },
                                                message: "must be >= 0",
                                              },
                                            ];
                                            return false;
                                          }
                                        }
                                      }
                                      var isKeywordValid = errsBeforeMaxProperties === errorsCount;
                                    } else var isKeywordValid = true;
                                    if (isKeywordValid) {
                                      if (data.minProperties !== undefined) {
                                        let minProperties = data.minProperties;
                                        let errsBeforeMinProperties = errorsCount;
                                        let errsBeforeMinPropertiesMinimum = errorsCount;
                                        if (!(
                                          typeof minProperties == "number" &&
                                          !(minProperties % 1) &&
                                          !isNaN(minProperties) &&
                                          isFinite(minProperties)
                                        )) {
                                          validateValidationSchema.errors = [
                                            {
                                              instancePath: instancePath + "/minProperties",
                                              schemaPath: "#/$defs/nonNegativeIntegerDefault0/type",
                                              keyword: "type",
                                              params: {
                                                type: "integer",
                                              },
                                              message: "must be integer",
                                            },
                                          ];
                                          return false;
                                        }
                                        if (errorsCount === errsBeforeMinPropertiesMinimum) {
                                          if (typeof minProperties == "number" && isFinite(minProperties)) {
                                            if (minProperties < 0 || isNaN(minProperties)) {
                                              validateValidationSchema.errors = [
                                                {
                                                  instancePath: instancePath + "/minProperties",
                                                  schemaPath: "#/$defs/nonNegativeIntegerDefault0/minimum",
                                                  keyword: "minimum",
                                                  params: {
                                                    comparison: ">=",
                                                    limit: 0,
                                                  },
                                                  message: "must be >= 0",
                                                },
                                              ];
                                              return false;
                                            }
                                          }
                                        }
                                        var isKeywordValid = errsBeforeMinProperties === errorsCount;
                                      } else var isKeywordValid = true;
                                      if (isKeywordValid) {
                                        if (data.required !== undefined) {
                                          let required = data.required;
                                          let errsBeforeRequired = errorsCount;
                                          if (errorsCount === errorsCount)
                                            if (Array.isArray(required)) {
                                              var isRequiredItemValid = true;
                                              let requiredItemCount = required.length;
                                              for (let j = 0; j < requiredItemCount; j++) {
                                                let errsBeforeRequiredItem = errorsCount;
                                                if (typeof required[j] !== "string") {
                                                  validateValidationSchema.errors = [
                                                    {
                                                      instancePath: instancePath + "/required/" + j,
                                                      schemaPath: "#/$defs/stringArray/items/type",
                                                      keyword: "type",
                                                      params: {
                                                        type: "string",
                                                      },
                                                      message: "must be string",
                                                    },
                                                  ];
                                                  return false;
                                                }
                                                var isRequiredItemValid =
                                                  errsBeforeRequiredItem === errorsCount;
                                                if (!isRequiredItemValid) break;
                                              }
                                              if (isRequiredItemValid) {
                                                let requiredItemIndex = required.length;
                                                let duplicateIndex;
                                                if (requiredItemIndex > 1) {
                                                  let seenRequiredItems = {};
                                                  for (; requiredItemIndex--;) {
                                                    let requiredItem = required[requiredItemIndex];
                                                    if (typeof requiredItem !== "string") continue;
                                                    if (typeof seenRequiredItems[requiredItem] == "number") {
                                                      duplicateIndex = seenRequiredItems[requiredItem];
                                                      validateValidationSchema.errors = [
                                                        {
                                                          instancePath: instancePath + "/required",
                                                          schemaPath: "#/$defs/stringArray/uniqueItems",
                                                          keyword: "uniqueItems",
                                                          params: {
                                                            i: requiredItemIndex,
                                                            j: duplicateIndex,
                                                          },
                                                          message:
                                                            "must NOT have duplicate items (items ## " +
                                                            duplicateIndex +
                                                            " and " +
                                                            requiredItemIndex +
                                                            " are identical)",
                                                        },
                                                      ];
                                                      return false;
                                                      break;
                                                    }
                                                    seenRequiredItems[requiredItem] = requiredItemIndex;
                                                  }
                                                }
                                              }
                                            } else {
                                              validateValidationSchema.errors = [
                                                {
                                                  instancePath: instancePath + "/required",
                                                  schemaPath: "#/$defs/stringArray/type",
                                                  keyword: "type",
                                                  params: {
                                                    type: "array",
                                                  },
                                                  message: "must be array",
                                                },
                                              ];
                                              return false;
                                            }
                                          var isKeywordValid = errsBeforeRequired === errorsCount;
                                        } else var isKeywordValid = true;
                                        if (isKeywordValid)
                                          if (data.dependentRequired !== undefined) {
                                            let dependentRequired = data.dependentRequired;
                                            let errsBeforeDependentRequired = errorsCount;
                                            if (errorsCount === errsBeforeDependentRequired)
                                              if (
                                                dependentRequired &&
                                                typeof dependentRequired == "object" &&
                                                !Array.isArray(dependentRequired)
                                              )
                                                for (let key in dependentRequired) {
                                                  let dependentValue = dependentRequired[key];
                                                  let errsBeforeDependentValue = errorsCount;
                                                  if (errorsCount === errorsCount)
                                                    if (Array.isArray(dependentValue)) {
                                                      var isDependentItemValid = true;
                                                      let dependentItemCount = dependentValue.length;
                                                      for (let idx = 0; idx < dependentItemCount; idx++) {
                                                        let errsBeforeDependentItem = errorsCount;
                                                        if (typeof dependentValue[idx] !== "string") {
                                                          validateValidationSchema.errors = [
                                                            {
                                                              instancePath:
                                                                instancePath +
                                                                "/dependentRequired/" +
                                                                key.replace(/~/g, "~0").replace(/\//g, "~1") +
                                                                "/" +
                                                                idx,
                                                              schemaPath: "#/$defs/stringArray/items/type",
                                                              keyword: "type",
                                                              params: {
                                                                type: "string",
                                                              },
                                                              message: "must be string",
                                                            },
                                                          ];
                                                          return false;
                                                        }
                                                        var isDependentItemValid =
                                                          errsBeforeDependentItem === errorsCount;
                                                        if (!isDependentItemValid) break;
                                                      }
                                                      if (isDependentItemValid) {
                                                        let dependentItemIndex = dependentValue.length;
                                                        let dependentDuplicateIndex;
                                                        if (dependentItemIndex > 1) {
                                                          let seenDependentItems = {};
                                                          for (; dependentItemIndex--;) {
                                                            let dependentItem =
                                                              dependentValue[dependentItemIndex];
                                                            if (typeof dependentItem !== "string") continue;
                                                            if (
                                                              typeof seenDependentItems[dependentItem] ==
                                                              "number"
                                                            ) {
                                                              dependentDuplicateIndex =
                                                                seenDependentItems[dependentItem];
                                                              validateValidationSchema.errors = [
                                                                {
                                                                  instancePath:
                                                                    instancePath +
                                                                    "/dependentRequired/" +
                                                                    key
                                                                      .replace(/~/g, "~0")
                                                                      .replace(/\//g, "~1"),
                                                                  schemaPath:
                                                                    "#/$defs/stringArray/uniqueItems",
                                                                  keyword: "uniqueItems",
                                                                  params: {
                                                                    i: dependentItemIndex,
                                                                    j: dependentDuplicateIndex,
                                                                  },
                                                                  message:
                                                                    "must NOT have duplicate items (items ## " +
                                                                    dependentDuplicateIndex +
                                                                    " and " +
                                                                    dependentItemIndex +
                                                                    " are identical)",
                                                                },
                                                              ];
                                                              return false;
                                                              break;
                                                            }
                                                            seenDependentItems[dependentItem] =
                                                              dependentItemIndex;
                                                          }
                                                        }
                                                      }
                                                    } else {
                                                      validateValidationSchema.errors = [
                                                        {
                                                          instancePath:
                                                            instancePath +
                                                            "/dependentRequired/" +
                                                            key.replace(/~/g, "~0").replace(/\//g, "~1"),
                                                          schemaPath: "#/$defs/stringArray/type",
                                                          keyword: "type",
                                                          params: {
                                                            type: "array",
                                                          },
                                                          message: "must be array",
                                                        },
                                                      ];
                                                      return false;
                                                    }
                                                  var isDependentEntryValid =
                                                    errsBeforeDependentValue === errorsCount;
                                                  if (!isDependentEntryValid) break;
                                                }
                                              else {
                                                validateValidationSchema.errors = [
                                                  {
                                                    instancePath: instancePath + "/dependentRequired",
                                                    schemaPath: "#/properties/dependentRequired/type",
                                                    keyword: "type",
                                                    params: {
                                                      type: "object",
                                                    },
                                                    message: "must be object",
                                                  },
                                                ];
                                                return false;
                                              }
                                            var isKeywordValid = errsBeforeDependentRequired === errorsCount;
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
        }
      }
    }
  }
  validateValidationSchema.errors = vErrors;
  return errorsCount === 0;
}
//@ chunk-fra0jg2y.js:35916-36244 esm-fingerprint
// deferred: uses validateValidationSchema of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fra0jg2y.js:35916", () => {
  validateValidationSchema.evaluated = {
    props: {
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
    },
    dynamicProps: false,
    dynamicItems: false,
  };
});
export { validateValidationSchema, countCodePointsInString };

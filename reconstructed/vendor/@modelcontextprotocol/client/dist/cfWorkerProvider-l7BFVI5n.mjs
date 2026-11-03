/**
 * @modelcontextprotocol/client/dist/cfWorkerProvider-l7BFVI5n.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/client@2.0.0
 * pieces: chunk-dcmhvw5a.js (1), chunk-n332mrkv.js (2)
 * attribution: esm-fingerprint 2, esm-layout 1
 */
import { xe, _e, require_ajv } from "./ajvProvider-BIwGVY6G.mjs";

//@ chunk-n332mrkv.js:24566-35916 esm-layout
function b(
  t,
  {
    instancePath: s = "",
    parentData: z,
    parentDataProperty: E,
    rootData: c = t,
    dynamicAnchors: i = {},
  } = {},
) {
  let r = null;
  let e = 0;
  let evaluated = b.evaluated;
  if (evaluated.dynamicProps) evaluated.props = undefined;
  if (evaluated.dynamicItems) evaluated.items = undefined;
  if (!(t && typeof t == "object" && !Array.isArray(t)) && typeof t !== "boolean") {
    b.errors = [
      {
        instancePath: s,
        schemaPath: "#/type",
        keyword: "type",
        params: {
          type: xe.type,
        },
        message: "must be object,boolean",
      },
    ];
    return false;
  }
  if (!i.meta) i.meta = b;
  if (e === 0) {
    if (t && typeof t == "object" && !Array.isArray(t)) {
      if (t.type !== undefined) {
        let a = t.type;
        let f = e;
        let u = e;
        let m = false;
        let N = e;
        if (!(
          a === "array" ||
          a === "boolean" ||
          a === "integer" ||
          a === "null" ||
          a === "number" ||
          a === "object" ||
          a === "string"
        )) {
          let _ = {
            instancePath: s + "/type",
            schemaPath: "#/$defs/simpleTypes/enum",
            keyword: "enum",
            params: {
              allowedValues: _e.enum,
            },
            message: "must be equal to one of the allowed values",
          };
          if (r === null) r = [_];
          else r.push(_);
          e++;
        }
        var d = N === e;
        m = m || d;
        let v = e;
        if (e === v)
          if (Array.isArray(a)) {
            if (a.length < 1) {
              let _ = {
                instancePath: s + "/type",
                schemaPath: "#/properties/type/anyOf/1/minItems",
                keyword: "minItems",
                params: {
                  limit: 1,
                },
                message: "must NOT have fewer than 1 items",
              };
              if (r === null) r = [_];
              else r.push(_);
              e++;
            } else {
              var n = true;
              let _ = a.length;
              for (let j = 0; j < _; j++) {
                let g = a[j];
                let P = e;
                if (!(
                  g === "array" ||
                  g === "boolean" ||
                  g === "integer" ||
                  g === "null" ||
                  g === "number" ||
                  g === "object" ||
                  g === "string"
                )) {
                  let M = {
                    instancePath: s + "/type/" + j,
                    schemaPath: "#/$defs/simpleTypes/enum",
                    keyword: "enum",
                    params: {
                      allowedValues: _e.enum,
                    },
                    message: "must be equal to one of the allowed values",
                  };
                  if (r === null) r = [M];
                  else r.push(M);
                  e++;
                }
                var n = P === e;
                if (!n) break;
              }
              if (n) {
                let j = a.length;
                let g;
                if (j > 1) {
                  e: for (; j--;)
                    for (g = j; g--;)
                      if (require_ajv(a[j], a[g])) {
                        let P = {
                          instancePath: s + "/type",
                          schemaPath: "#/properties/type/anyOf/1/uniqueItems",
                          keyword: "uniqueItems",
                          params: {
                            i: j,
                            j: g,
                          },
                          message:
                            "must NOT have duplicate items (items ## " + g + " and " + j + " are identical)",
                        };
                        if (r === null) r = [P];
                        else r.push(P);
                        e++;
                        break e;
                      }
                }
              }
            }
          } else {
            let _ = {
              instancePath: s + "/type",
              schemaPath: "#/properties/type/anyOf/1/type",
              keyword: "type",
              params: {
                type: "array",
              },
              message: "must be array",
            };
            if (r === null) r = [_];
            else r.push(_);
            e++;
          }
        var d = v === e;
        m = m || d;
        if (!m) {
          let _ = {
            instancePath: s + "/type",
            schemaPath: "#/properties/type/anyOf",
            keyword: "anyOf",
            params: {},
            message: "must match a schema in anyOf",
          };
          if (r === null) r = [_];
          else r.push(_);
          e++;
          b.errors = r;
          return false;
        } else {
          e = u;
          if (r !== null)
            if (u) r.length = u;
            else r = null;
        }
        var o = f === e;
      } else var o = true;
      if (o) {
        if (t.enum !== undefined) {
          let a = e;
          if (e === a) {
            if (!Array.isArray(t.enum)) {
              b.errors = [
                {
                  instancePath: s + "/enum",
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
          var o = a === e;
        } else var o = true;
        if (o) {
          if (t.multipleOf !== undefined) {
            let multipleOf = t.multipleOf;
            let f = e;
            if (e === f)
              if (typeof multipleOf == "number" && isFinite(multipleOf)) {
                if (multipleOf <= 0 || isNaN(multipleOf)) {
                  b.errors = [
                    {
                      instancePath: s + "/multipleOf",
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
                b.errors = [
                  {
                    instancePath: s + "/multipleOf",
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
            var o = f === e;
          } else var o = true;
          if (o) {
            if (t.maximum !== undefined) {
              let maximum = t.maximum;
              let f = e;
              if (!(typeof maximum == "number" && isFinite(maximum))) {
                b.errors = [
                  {
                    instancePath: s + "/maximum",
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
              var o = f === e;
            } else var o = true;
            if (o) {
              if (t.exclusiveMaximum !== undefined) {
                let exclusiveMaximum = t.exclusiveMaximum;
                let f = e;
                if (!(typeof exclusiveMaximum == "number" && isFinite(exclusiveMaximum))) {
                  b.errors = [
                    {
                      instancePath: s + "/exclusiveMaximum",
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
                var o = f === e;
              } else var o = true;
              if (o) {
                if (t.minimum !== undefined) {
                  let minimum = t.minimum;
                  let f = e;
                  if (!(typeof minimum == "number" && isFinite(minimum))) {
                    b.errors = [
                      {
                        instancePath: s + "/minimum",
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
                  var o = f === e;
                } else var o = true;
                if (o) {
                  if (t.exclusiveMinimum !== undefined) {
                    let exclusiveMinimum = t.exclusiveMinimum;
                    let f = e;
                    if (!(typeof exclusiveMinimum == "number" && isFinite(exclusiveMinimum))) {
                      b.errors = [
                        {
                          instancePath: s + "/exclusiveMinimum",
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
                    var o = f === e;
                  } else var o = true;
                  if (o) {
                    if (t.maxLength !== undefined) {
                      let maxLength = t.maxLength;
                      let f = e;
                      let u = e;
                      if (!(
                        typeof maxLength == "number" &&
                        !(maxLength % 1) &&
                        !isNaN(maxLength) &&
                        isFinite(maxLength)
                      )) {
                        b.errors = [
                          {
                            instancePath: s + "/maxLength",
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
                      if (e === u) {
                        if (typeof maxLength == "number" && isFinite(maxLength)) {
                          if (maxLength < 0 || isNaN(maxLength)) {
                            b.errors = [
                              {
                                instancePath: s + "/maxLength",
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
                      var o = f === e;
                    } else var o = true;
                    if (o) {
                      if (t.minLength !== undefined) {
                        let minLength = t.minLength;
                        let f = e;
                        let u = e;
                        if (!(
                          typeof minLength == "number" &&
                          !(minLength % 1) &&
                          !isNaN(minLength) &&
                          isFinite(minLength)
                        )) {
                          b.errors = [
                            {
                              instancePath: s + "/minLength",
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
                        if (e === u) {
                          if (typeof minLength == "number" && isFinite(minLength)) {
                            if (minLength < 0 || isNaN(minLength)) {
                              b.errors = [
                                {
                                  instancePath: s + "/minLength",
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
                        var o = f === e;
                      } else var o = true;
                      if (o) {
                        if (t.pattern !== undefined) {
                          let a = e;
                          if (e === a) {
                            if (e === a) {
                              if (typeof t.pattern !== "string") {
                                b.errors = [
                                  {
                                    instancePath: s + "/pattern",
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
                          var o = a === e;
                        } else var o = true;
                        if (o) {
                          if (t.maxItems !== undefined) {
                            let maxItems = t.maxItems;
                            let f = e;
                            let u = e;
                            if (!(
                              typeof maxItems == "number" &&
                              !(maxItems % 1) &&
                              !isNaN(maxItems) &&
                              isFinite(maxItems)
                            )) {
                              b.errors = [
                                {
                                  instancePath: s + "/maxItems",
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
                            if (e === u) {
                              if (typeof maxItems == "number" && isFinite(maxItems)) {
                                if (maxItems < 0 || isNaN(maxItems)) {
                                  b.errors = [
                                    {
                                      instancePath: s + "/maxItems",
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
                            var o = f === e;
                          } else var o = true;
                          if (o) {
                            if (t.minItems !== undefined) {
                              let minItems = t.minItems;
                              let f = e;
                              let u = e;
                              if (!(
                                typeof minItems == "number" &&
                                !(minItems % 1) &&
                                !isNaN(minItems) &&
                                isFinite(minItems)
                              )) {
                                b.errors = [
                                  {
                                    instancePath: s + "/minItems",
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
                              if (e === u) {
                                if (typeof minItems == "number" && isFinite(minItems)) {
                                  if (minItems < 0 || isNaN(minItems)) {
                                    b.errors = [
                                      {
                                        instancePath: s + "/minItems",
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
                              var o = f === e;
                            } else var o = true;
                            if (o) {
                              if (t.uniqueItems !== undefined) {
                                let a = e;
                                if (typeof t.uniqueItems !== "boolean") {
                                  b.errors = [
                                    {
                                      instancePath: s + "/uniqueItems",
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
                                var o = a === e;
                              } else var o = true;
                              if (o) {
                                if (t.maxContains !== undefined) {
                                  let maxContains = t.maxContains;
                                  let f = e;
                                  let u = e;
                                  if (!(
                                    typeof maxContains == "number" &&
                                    !(maxContains % 1) &&
                                    !isNaN(maxContains) &&
                                    isFinite(maxContains)
                                  )) {
                                    b.errors = [
                                      {
                                        instancePath: s + "/maxContains",
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
                                  if (e === u) {
                                    if (typeof maxContains == "number" && isFinite(maxContains)) {
                                      if (maxContains < 0 || isNaN(maxContains)) {
                                        b.errors = [
                                          {
                                            instancePath: s + "/maxContains",
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
                                  var o = f === e;
                                } else var o = true;
                                if (o) {
                                  if (t.minContains !== undefined) {
                                    let minContains = t.minContains;
                                    let f = e;
                                    let u = e;
                                    if (!(
                                      typeof minContains == "number" &&
                                      !(minContains % 1) &&
                                      !isNaN(minContains) &&
                                      isFinite(minContains)
                                    )) {
                                      b.errors = [
                                        {
                                          instancePath: s + "/minContains",
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
                                    if (e === u) {
                                      if (typeof minContains == "number" && isFinite(minContains)) {
                                        if (minContains < 0 || isNaN(minContains)) {
                                          b.errors = [
                                            {
                                              instancePath: s + "/minContains",
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
                                    var o = f === e;
                                  } else var o = true;
                                  if (o) {
                                    if (t.maxProperties !== undefined) {
                                      let maxProperties = t.maxProperties;
                                      let f = e;
                                      let u = e;
                                      if (!(
                                        typeof maxProperties == "number" &&
                                        !(maxProperties % 1) &&
                                        !isNaN(maxProperties) &&
                                        isFinite(maxProperties)
                                      )) {
                                        b.errors = [
                                          {
                                            instancePath: s + "/maxProperties",
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
                                      if (e === u) {
                                        if (typeof maxProperties == "number" && isFinite(maxProperties)) {
                                          if (maxProperties < 0 || isNaN(maxProperties)) {
                                            b.errors = [
                                              {
                                                instancePath: s + "/maxProperties",
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
                                      var o = f === e;
                                    } else var o = true;
                                    if (o) {
                                      if (t.minProperties !== undefined) {
                                        let minProperties = t.minProperties;
                                        let f = e;
                                        let u = e;
                                        if (!(
                                          typeof minProperties == "number" &&
                                          !(minProperties % 1) &&
                                          !isNaN(minProperties) &&
                                          isFinite(minProperties)
                                        )) {
                                          b.errors = [
                                            {
                                              instancePath: s + "/minProperties",
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
                                        if (e === u) {
                                          if (typeof minProperties == "number" && isFinite(minProperties)) {
                                            if (minProperties < 0 || isNaN(minProperties)) {
                                              b.errors = [
                                                {
                                                  instancePath: s + "/minProperties",
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
                                        var o = f === e;
                                      } else var o = true;
                                      if (o) {
                                        if (t.required !== undefined) {
                                          let required = t.required;
                                          let f = e;
                                          if (e === e)
                                            if (Array.isArray(required)) {
                                              var w = true;
                                              let N = required.length;
                                              for (let j = 0; j < N; j++) {
                                                let _ = e;
                                                if (typeof required[j] !== "string") {
                                                  b.errors = [
                                                    {
                                                      instancePath: s + "/required/" + j,
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
                                                var w = _ === e;
                                                if (!w) break;
                                              }
                                              if (w) {
                                                let v = required.length;
                                                let _;
                                                if (v > 1) {
                                                  let j = {};
                                                  for (; v--;) {
                                                    let g = required[v];
                                                    if (typeof g !== "string") continue;
                                                    if (typeof j[g] == "number") {
                                                      _ = j[g];
                                                      b.errors = [
                                                        {
                                                          instancePath: s + "/required",
                                                          schemaPath: "#/$defs/stringArray/uniqueItems",
                                                          keyword: "uniqueItems",
                                                          params: {
                                                            i: v,
                                                            j: _,
                                                          },
                                                          message:
                                                            "must NOT have duplicate items (items ## " +
                                                            _ +
                                                            " and " +
                                                            v +
                                                            " are identical)",
                                                        },
                                                      ];
                                                      return false;
                                                      break;
                                                    }
                                                    j[g] = v;
                                                  }
                                                }
                                              }
                                            } else {
                                              b.errors = [
                                                {
                                                  instancePath: s + "/required",
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
                                          var o = f === e;
                                        } else var o = true;
                                        if (o)
                                          if (t.dependentRequired !== undefined) {
                                            let dependentRequired = t.dependentRequired;
                                            let f = e;
                                            if (e === f)
                                              if (
                                                dependentRequired &&
                                                typeof dependentRequired == "object" &&
                                                !Array.isArray(dependentRequired)
                                              )
                                                for (let key in dependentRequired) {
                                                  let N = dependentRequired[key];
                                                  let v = e;
                                                  if (e === e)
                                                    if (Array.isArray(N)) {
                                                      var k = true;
                                                      let j = N.length;
                                                      for (let idx = 0; idx < j; idx++) {
                                                        let P = e;
                                                        if (typeof N[idx] !== "string") {
                                                          b.errors = [
                                                            {
                                                              instancePath:
                                                                s +
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
                                                        var k = P === e;
                                                        if (!k) break;
                                                      }
                                                      if (k) {
                                                        let g = N.length;
                                                        let P;
                                                        if (g > 1) {
                                                          let S = {};
                                                          for (; g--;) {
                                                            let M = N[g];
                                                            if (typeof M !== "string") continue;
                                                            if (typeof S[M] == "number") {
                                                              P = S[M];
                                                              b.errors = [
                                                                {
                                                                  instancePath:
                                                                    s +
                                                                    "/dependentRequired/" +
                                                                    key
                                                                      .replace(/~/g, "~0")
                                                                      .replace(/\//g, "~1"),
                                                                  schemaPath:
                                                                    "#/$defs/stringArray/uniqueItems",
                                                                  keyword: "uniqueItems",
                                                                  params: {
                                                                    i: g,
                                                                    j: P,
                                                                  },
                                                                  message:
                                                                    "must NOT have duplicate items (items ## " +
                                                                    P +
                                                                    " and " +
                                                                    g +
                                                                    " are identical)",
                                                                },
                                                              ];
                                                              return false;
                                                              break;
                                                            }
                                                            S[M] = g;
                                                          }
                                                        }
                                                      }
                                                    } else {
                                                      b.errors = [
                                                        {
                                                          instancePath:
                                                            s +
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
                                                  var I = v === e;
                                                  if (!I) break;
                                                }
                                              else {
                                                b.errors = [
                                                  {
                                                    instancePath: s + "/dependentRequired",
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
                                            var o = f === e;
                                          } else var o = true;
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
  b.errors = r;
  return e === 0;
}
//@ chunk-n332mrkv.js:35916-36244 esm-fingerprint
b.evaluated = {
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
//@ chunk-dcmhvw5a.js:354157-354313 esm-fingerprint
function dt(e, n) {
  let i = 0;
  for (let j = 0; j < n; j++) {
    let charCode = e.charCodeAt(j);
    if (charCode >= 55296 && charCode <= 56319 && j + 1 < e.length && (e.charCodeAt(j + 1) & 64512) === 56320)
      j++;
    i++;
  }
  return i;
}
export { dt, b };

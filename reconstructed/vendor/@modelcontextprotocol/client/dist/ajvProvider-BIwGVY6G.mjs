/**
 * @modelcontextprotocol/client/dist/ajvProvider-BIwGVY6G.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/client@2.0.0
 * pieces: chunk-n332mrkv.js (26), chunk-r1g76qsy.js (2)
 * attribution: esm-layout 8, esm-fingerprint 9, layout 7, affinity 4
 */
import { require_equal } from "../../../ajv/dist/runtime/equal.js";
import { b } from "./cfWorkerProvider-l7BFVI5n.mjs";
import { $d, Td, DRAFT_2020_12_URIS, wd } from "../../../ajv-formats/dist/formats.js";

//@ chunk-n332mrkv.js:228-1961 esm-layout
var qe = D;
var je = {
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
//@ chunk-n332mrkv.js:1961-2923 esm-fingerprint
var ke = {
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
//@ chunk-n332mrkv.js:2923-3006 layout
var regExp = new RegExp("^[^#]*#?$", "u");
var regExp_2 = new RegExp("^[A-Za-z_][-A-Za-z0-9._]*$", "u");
//@ chunk-n332mrkv.js:3006-8156 layout
function x(
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
  let evaluated = x.evaluated;
  if (evaluated.dynamicProps) evaluated.props = undefined;
  if (evaluated.dynamicItems) evaluated.items = undefined;
  if (!(t && typeof t == "object" && !Array.isArray(t)) && typeof t !== "boolean") {
    x.errors = [
      {
        instancePath: s,
        schemaPath: "#/type",
        keyword: "type",
        params: {
          type: ke.type,
        },
        message: "must be object,boolean",
      },
    ];
    return false;
  }
  if (!i.meta) i.meta = x;
  if (e === 0) {
    if (t && typeof t == "object" && !Array.isArray(t)) {
      if (t.$id !== undefined) {
        let $id = t.$id;
        let m = e;
        let N = e;
        if (e === N) {
          if (e === N) {
            if (typeof $id !== "string") {
              x.errors = [
                {
                  instancePath: s + "/$id",
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
        if (e === m) {
          if (typeof $id === "string") {
            if (!regExp.test($id)) {
              x.errors = [
                {
                  instancePath: s + "/$id",
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
        var n = m === e;
      } else var n = true;
      if (n) {
        if (t.$schema !== undefined) {
          let u = e;
          let m = e;
          if (e === m) {
            if (e === m) {
              if (typeof t.$schema !== "string") {
                x.errors = [
                  {
                    instancePath: s + "/$schema",
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
          var n = u === e;
        } else var n = true;
        if (n) {
          if (t.$ref !== undefined) {
            let u = e;
            let m = e;
            if (e === m) {
              if (e === m) {
                if (typeof t.$ref !== "string") {
                  x.errors = [
                    {
                      instancePath: s + "/$ref",
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
            var n = u === e;
          } else var n = true;
          if (n) {
            if (t.$anchor !== undefined) {
              let $anchor = t.$anchor;
              let m = e;
              if (e === e)
                if (typeof $anchor === "string") {
                  if (!regExp_2.test($anchor)) {
                    x.errors = [
                      {
                        instancePath: s + "/$anchor",
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
                  x.errors = [
                    {
                      instancePath: s + "/$anchor",
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
              var n = m === e;
            } else var n = true;
            if (n) {
              if (t.$dynamicRef !== undefined) {
                let u = e;
                let m = e;
                if (e === m) {
                  if (e === m) {
                    if (typeof t.$dynamicRef !== "string") {
                      x.errors = [
                        {
                          instancePath: s + "/$dynamicRef",
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
                var n = u === e;
              } else var n = true;
              if (n) {
                if (t.$dynamicAnchor !== undefined) {
                  let $dynamicAnchor = t.$dynamicAnchor;
                  let m = e;
                  if (e === e)
                    if (typeof $dynamicAnchor === "string") {
                      if (!regExp_2.test($dynamicAnchor)) {
                        x.errors = [
                          {
                            instancePath: s + "/$dynamicAnchor",
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
                      x.errors = [
                        {
                          instancePath: s + "/$dynamicAnchor",
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
                  var n = m === e;
                } else var n = true;
                if (n) {
                  if (t.$vocabulary !== undefined) {
                    let $vocabulary = t.$vocabulary;
                    let m = e;
                    if (e === m)
                      if ($vocabulary && typeof $vocabulary == "object" && !Array.isArray($vocabulary)) {
                        for (let key in $vocabulary) {
                          let _ = e;
                          let j = e;
                          if (e === j) {
                            if (e === j) {
                              if (typeof key !== "string") {
                                let g = {
                                  instancePath: s + "/$vocabulary",
                                  schemaPath: "#/$defs/uriString/type",
                                  keyword: "type",
                                  params: {
                                    type: "string",
                                  },
                                  message: "must be string",
                                  propertyName: key,
                                };
                                if (r === null) r = [g];
                                else r.push(g);
                                e++;
                              }
                            }
                          }
                          var d = _ === e;
                          if (!d) {
                            let g = {
                              instancePath: s + "/$vocabulary",
                              schemaPath: "#/properties/%24vocabulary/propertyNames",
                              keyword: "propertyNames",
                              params: {
                                propertyName: key,
                              },
                              message: "property name must be valid",
                            };
                            if (r === null) r = [g];
                            else r.push(g);
                            e++;
                            x.errors = r;
                            return false;
                            break;
                          }
                        }
                        if (d)
                          for (let key in $vocabulary) {
                            let _ = e;
                            if (typeof $vocabulary[key] !== "boolean") {
                              x.errors = [
                                {
                                  instancePath:
                                    s + "/$vocabulary/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
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
                            var o = _ === e;
                            if (!o) break;
                          }
                      } else {
                        x.errors = [
                          {
                            instancePath: s + "/$vocabulary",
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
                    var n = m === e;
                  } else var n = true;
                  if (n) {
                    if (t.$comment !== undefined) {
                      let u = e;
                      if (typeof t.$comment !== "string") {
                        x.errors = [
                          {
                            instancePath: s + "/$comment",
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
                      var n = u === e;
                    } else var n = true;
                    if (n)
                      if (t.$defs !== undefined) {
                        let $defs = t.$defs;
                        let m = e;
                        if (e === m)
                          if ($defs && typeof $defs == "object" && !Array.isArray($defs))
                            for (let key in $defs) {
                              let _ = $defs[key];
                              let j = e;
                              let meta = i.meta;
                              if (meta) {
                                if (
                                  !meta(_, {
                                    instancePath:
                                      s + "/$defs/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                                    parentData: $defs,
                                    parentDataProperty: key,
                                    rootData: c,
                                    dynamicAnchors: i,
                                  })
                                ) {
                                  r = r === null ? meta.errors : r.concat(meta.errors);
                                  e = r.length;
                                } else {
                                  var props = meta.evaluated.props;
                                  var items = meta.evaluated.items;
                                }
                              } else if (
                                !x(_, {
                                  instancePath: s + "/$defs/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                                  parentData: $defs,
                                  parentDataProperty: key,
                                  rootData: c,
                                  dynamicAnchors: i,
                                })
                              ) {
                                r = r === null ? x.errors : r.concat(x.errors);
                                e = r.length;
                              } else {
                                var props_2 = x.evaluated.props;
                                if (props !== true && props_2 !== undefined)
                                  if (props_2 === true) props = true;
                                  else {
                                    props = props || {};
                                    Object.assign(props, props_2);
                                  }
                                var items_2 = x.evaluated.items;
                                if (items !== true && items_2 !== undefined)
                                  items = items_2 === true ? true : items > items_2 ? items : items_2;
                              }
                              var f = j === e;
                              if (!f) break;
                            }
                          else {
                            x.errors = [
                              {
                                instancePath: s + "/$defs",
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
                        var n = m === e;
                      } else var n = true;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  x.errors = r;
  return e === 0;
}
//@ chunk-n332mrkv.js:8156-8316 layout
x.evaluated = {
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
//@ chunk-n332mrkv.js:8316-9367 esm-fingerprint
var Ie = {
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
//@ chunk-n332mrkv.js:9367-10508 layout
function R(
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
  let evaluated = R.evaluated;
  if (evaluated.dynamicProps) evaluated.props = undefined;
  if (evaluated.dynamicItems) evaluated.items = undefined;
  if (e === 0)
    if (Array.isArray(t)) {
      if (t.length < 1) {
        R.errors = [
          {
            instancePath: s,
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
        var n = true;
        let I = t.length;
        for (let j = 0; j < I; j++) {
          let f = t[j];
          let u = e;
          let meta = i.meta;
          if (meta) {
            if (
              !meta(f, {
                instancePath: s + "/" + j,
                parentData: t,
                parentDataProperty: j,
                rootData: c,
                dynamicAnchors: i,
              })
            ) {
              r = r === null ? meta.errors : r.concat(meta.errors);
              e = r.length;
            } else {
              var props = meta.evaluated.props;
              var items = meta.evaluated.items;
            }
          } else if (
            !R(f, {
              instancePath: s + "/" + j,
              parentData: t,
              parentDataProperty: j,
              rootData: c,
              dynamicAnchors: i,
            })
          ) {
            r = r === null ? R.errors : r.concat(R.errors);
            e = r.length;
          } else {
            var props_2 = R.evaluated.props;
            if (props !== true && props_2 !== undefined)
              if (props_2 === true) props = true;
              else {
                props = props || {};
                Object.assign(props, props_2);
              }
            var items_2 = R.evaluated.items;
            if (items !== true && items_2 !== undefined)
              items = items_2 === true ? true : items > items_2 ? items : items_2;
          }
          var n = u === e;
          if (!n) break;
        }
      }
    } else {
      R.errors = [
        {
          instancePath: s,
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
  R.errors = r;
  return e === 0;
}
//@ chunk-n332mrkv.js:10508-10563 layout
R.evaluated = {
  items: true,
  dynamicProps: false,
  dynamicItems: false,
};
//@ chunk-n332mrkv.js:10563-20346 layout
function l(
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
  let evaluated = l.evaluated;
  if (evaluated.dynamicProps) evaluated.props = undefined;
  if (evaluated.dynamicItems) evaluated.items = undefined;
  if (!(t && typeof t == "object" && !Array.isArray(t)) && typeof t !== "boolean") {
    l.errors = [
      {
        instancePath: s,
        schemaPath: "#/type",
        keyword: "type",
        params: {
          type: Ie.type,
        },
        message: "must be object,boolean",
      },
    ];
    return false;
  }
  if (!i.meta) i.meta = l;
  if (e === 0) {
    if (t && typeof t == "object" && !Array.isArray(t)) {
      if (t.prefixItems !== undefined) {
        let p = e;
        if (
          !R(t.prefixItems, {
            instancePath: s + "/prefixItems",
            parentData: t,
            parentDataProperty: "prefixItems",
            rootData: c,
            dynamicAnchors: i,
          })
        ) {
          r = r === null ? R.errors : r.concat(R.errors);
          e = r.length;
        }
        var n = p === e;
      } else var n = true;
      if (n) {
        if (t.items !== undefined) {
          let items = t.items;
          let O = e;
          let meta = i.meta;
          if (meta) {
            if (
              !meta(items, {
                instancePath: s + "/items",
                parentData: t,
                parentDataProperty: "items",
                rootData: c,
                dynamicAnchors: i,
              })
            ) {
              r = r === null ? meta.errors : r.concat(meta.errors);
              e = r.length;
            } else {
              var props = meta.evaluated.props;
              var items_2 = meta.evaluated.items;
            }
          } else if (
            !l(items, {
              instancePath: s + "/items",
              parentData: t,
              parentDataProperty: "items",
              rootData: c,
              dynamicAnchors: i,
            })
          ) {
            r = r === null ? l.errors : r.concat(l.errors);
            e = r.length;
          } else {
            var props_2 = l.evaluated.props;
            if (props !== true && props_2 !== undefined)
              if (props_2 === true) props = true;
              else {
                props = props || {};
                Object.assign(props, props_2);
              }
            var items_3 = l.evaluated.items;
            if (items_2 !== true && items_3 !== undefined)
              items_2 = items_3 === true ? true : items_2 > items_3 ? items_2 : items_3;
          }
          var n = O === e;
        } else var n = true;
        if (n) {
          if (t.contains !== undefined) {
            let contains = t.contains;
            let O = e;
            let meta = i.meta;
            if (meta) {
              if (
                !meta(contains, {
                  instancePath: s + "/contains",
                  parentData: t,
                  parentDataProperty: "contains",
                  rootData: c,
                  dynamicAnchors: i,
                })
              ) {
                r = r === null ? meta.errors : r.concat(meta.errors);
                e = r.length;
              } else {
                var props_3 = meta.evaluated.props;
                var items_4 = meta.evaluated.items;
              }
            } else if (
              !l(contains, {
                instancePath: s + "/contains",
                parentData: t,
                parentDataProperty: "contains",
                rootData: c,
                dynamicAnchors: i,
              })
            ) {
              r = r === null ? l.errors : r.concat(l.errors);
              e = r.length;
            } else {
              var props_4 = l.evaluated.props;
              if (props_3 !== true && props_4 !== undefined)
                if (props_4 === true) props_3 = true;
                else {
                  props_3 = props_3 || {};
                  Object.assign(props_3, props_4);
                }
              var items_5 = l.evaluated.items;
              if (items_4 !== true && items_5 !== undefined)
                items_4 = items_5 === true ? true : items_4 > items_5 ? items_4 : items_5;
            }
            var n = O === e;
          } else var n = true;
          if (n) {
            if (t.additionalProperties !== undefined) {
              let additionalProperties = t.additionalProperties;
              let O = e;
              let meta = i.meta;
              if (meta) {
                if (
                  !meta(additionalProperties, {
                    instancePath: s + "/additionalProperties",
                    parentData: t,
                    parentDataProperty: "additionalProperties",
                    rootData: c,
                    dynamicAnchors: i,
                  })
                ) {
                  r = r === null ? meta.errors : r.concat(meta.errors);
                  e = r.length;
                } else {
                  var props_5 = meta.evaluated.props;
                  var items_6 = meta.evaluated.items;
                }
              } else if (
                !l(additionalProperties, {
                  instancePath: s + "/additionalProperties",
                  parentData: t,
                  parentDataProperty: "additionalProperties",
                  rootData: c,
                  dynamicAnchors: i,
                })
              ) {
                r = r === null ? l.errors : r.concat(l.errors);
                e = r.length;
              } else {
                var props_6 = l.evaluated.props;
                if (props_5 !== true && props_6 !== undefined)
                  if (props_6 === true) props_5 = true;
                  else {
                    props_5 = props_5 || {};
                    Object.assign(props_5, props_6);
                  }
                var items_7 = l.evaluated.items;
                if (items_6 !== true && items_7 !== undefined)
                  items_6 = items_7 === true ? true : items_6 > items_7 ? items_6 : items_7;
              }
              var n = O === e;
            } else var n = true;
            if (n) {
              if (t.properties !== undefined) {
                let properties = t.properties;
                let O = e;
                if (e === O)
                  if (properties && typeof properties == "object" && !Array.isArray(properties))
                    for (let key in properties) {
                      let W = properties[key];
                      let re = e;
                      let meta = i.meta;
                      if (meta) {
                        if (
                          !meta(W, {
                            instancePath: s + "/properties/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                            parentData: properties,
                            parentDataProperty: key,
                            rootData: c,
                            dynamicAnchors: i,
                          })
                        ) {
                          r = r === null ? meta.errors : r.concat(meta.errors);
                          e = r.length;
                        } else {
                          var props_7 = meta.evaluated.props;
                          var items_8 = meta.evaluated.items;
                        }
                      } else if (
                        !l(W, {
                          instancePath: s + "/properties/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                          parentData: properties,
                          parentDataProperty: key,
                          rootData: c,
                          dynamicAnchors: i,
                        })
                      ) {
                        r = r === null ? l.errors : r.concat(l.errors);
                        e = r.length;
                      } else {
                        var props_8 = l.evaluated.props;
                        if (props_7 !== true && props_8 !== undefined)
                          if (props_8 === true) props_7 = true;
                          else {
                            props_7 = props_7 || {};
                            Object.assign(props_7, props_8);
                          }
                        var items_9 = l.evaluated.items;
                        if (items_8 !== true && items_9 !== undefined)
                          items_8 = items_9 === true ? true : items_8 > items_9 ? items_8 : items_9;
                      }
                      var M = re === e;
                      if (!M) break;
                    }
                  else {
                    l.errors = [
                      {
                        instancePath: s + "/properties",
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
                var n = O === e;
              } else var n = true;
              if (n) {
                if (t.patternProperties !== undefined) {
                  let patternProperties = t.patternProperties;
                  let O = e;
                  if (e === O)
                    if (
                      patternProperties &&
                      typeof patternProperties == "object" &&
                      !Array.isArray(patternProperties)
                    ) {
                      for (let propertyName in patternProperties) {
                        var Z = e === e;
                        if (!Z) {
                          let re = {
                            instancePath: s + "/patternProperties",
                            schemaPath: "#/properties/patternProperties/propertyNames",
                            keyword: "propertyNames",
                            params: {
                              propertyName,
                            },
                            message: "property name must be valid",
                          };
                          if (r === null) r = [re];
                          else r.push(re);
                          e++;
                          l.errors = r;
                          return false;
                          break;
                        }
                      }
                      if (Z)
                        for (let key in patternProperties) {
                          let W = patternProperties[key];
                          let re = e;
                          let meta = i.meta;
                          if (meta) {
                            if (
                              !meta(W, {
                                instancePath:
                                  s + "/patternProperties/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                                parentData: patternProperties,
                                parentDataProperty: key,
                                rootData: c,
                                dynamicAnchors: i,
                              })
                            ) {
                              r = r === null ? meta.errors : r.concat(meta.errors);
                              e = r.length;
                            } else {
                              var props_9 = meta.evaluated.props;
                              var items_10 = meta.evaluated.items;
                            }
                          } else if (
                            !l(W, {
                              instancePath:
                                s + "/patternProperties/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                              parentData: patternProperties,
                              parentDataProperty: key,
                              rootData: c,
                              dynamicAnchors: i,
                            })
                          ) {
                            r = r === null ? l.errors : r.concat(l.errors);
                            e = r.length;
                          } else {
                            var props_10 = l.evaluated.props;
                            if (props_9 !== true && props_10 !== undefined)
                              if (props_10 === true) props_9 = true;
                              else {
                                props_9 = props_9 || {};
                                Object.assign(props_9, props_10);
                              }
                            var items_11 = l.evaluated.items;
                            if (items_10 !== true && items_11 !== undefined)
                              items_10 = items_11 === true ? true : items_10 > items_11 ? items_10 : items_11;
                          }
                          var ae = re === e;
                          if (!ae) break;
                        }
                    } else {
                      l.errors = [
                        {
                          instancePath: s + "/patternProperties",
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
                  var n = O === e;
                } else var n = true;
                if (n) {
                  if (t.dependentSchemas !== undefined) {
                    let dependentSchemas = t.dependentSchemas;
                    let O = e;
                    if (e === O)
                      if (
                        dependentSchemas &&
                        typeof dependentSchemas == "object" &&
                        !Array.isArray(dependentSchemas)
                      )
                        for (let key in dependentSchemas) {
                          let W = dependentSchemas[key];
                          let re = e;
                          let meta = i.meta;
                          if (meta) {
                            if (
                              !meta(W, {
                                instancePath:
                                  s + "/dependentSchemas/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                                parentData: dependentSchemas,
                                parentDataProperty: key,
                                rootData: c,
                                dynamicAnchors: i,
                              })
                            ) {
                              r = r === null ? meta.errors : r.concat(meta.errors);
                              e = r.length;
                            } else {
                              var props_11 = meta.evaluated.props;
                              var items_12 = meta.evaluated.items;
                            }
                          } else if (
                            !l(W, {
                              instancePath:
                                s + "/dependentSchemas/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                              parentData: dependentSchemas,
                              parentDataProperty: key,
                              rootData: c,
                              dynamicAnchors: i,
                            })
                          ) {
                            r = r === null ? l.errors : r.concat(l.errors);
                            e = r.length;
                          } else {
                            var props_12 = l.evaluated.props;
                            if (props_11 !== true && props_12 !== undefined)
                              if (props_12 === true) props_11 = true;
                              else {
                                props_11 = props_11 || {};
                                Object.assign(props_11, props_12);
                              }
                            var items_13 = l.evaluated.items;
                            if (items_12 !== true && items_13 !== undefined)
                              items_12 = items_13 === true ? true : items_12 > items_13 ? items_12 : items_13;
                          }
                          var U = re === e;
                          if (!U) break;
                        }
                      else {
                        l.errors = [
                          {
                            instancePath: s + "/dependentSchemas",
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
                    var n = O === e;
                  } else var n = true;
                  if (n) {
                    if (t.propertyNames !== undefined) {
                      let propertyNames = t.propertyNames;
                      let O = e;
                      let meta = i.meta;
                      if (meta) {
                        if (
                          !meta(propertyNames, {
                            instancePath: s + "/propertyNames",
                            parentData: t,
                            parentDataProperty: "propertyNames",
                            rootData: c,
                            dynamicAnchors: i,
                          })
                        ) {
                          r = r === null ? meta.errors : r.concat(meta.errors);
                          e = r.length;
                        } else {
                          var props_13 = meta.evaluated.props;
                          var items_14 = meta.evaluated.items;
                        }
                      } else if (
                        !l(propertyNames, {
                          instancePath: s + "/propertyNames",
                          parentData: t,
                          parentDataProperty: "propertyNames",
                          rootData: c,
                          dynamicAnchors: i,
                        })
                      ) {
                        r = r === null ? l.errors : r.concat(l.errors);
                        e = r.length;
                      } else {
                        var props_14 = l.evaluated.props;
                        if (props_13 !== true && props_14 !== undefined)
                          if (props_14 === true) props_13 = true;
                          else {
                            props_13 = props_13 || {};
                            Object.assign(props_13, props_14);
                          }
                        var items_15 = l.evaluated.items;
                        if (items_14 !== true && items_15 !== undefined)
                          items_14 = items_15 === true ? true : items_14 > items_15 ? items_14 : items_15;
                      }
                      var n = O === e;
                    } else var n = true;
                    if (n) {
                      if (t.if !== undefined) {
                        let p = t.if;
                        let O = e;
                        let meta = i.meta;
                        if (meta) {
                          if (
                            !meta(p, {
                              instancePath: s + "/if",
                              parentData: t,
                              parentDataProperty: "if",
                              rootData: c,
                              dynamicAnchors: i,
                            })
                          ) {
                            r = r === null ? meta.errors : r.concat(meta.errors);
                            e = r.length;
                          } else {
                            var props_15 = meta.evaluated.props;
                            var items_16 = meta.evaluated.items;
                          }
                        } else if (
                          !l(p, {
                            instancePath: s + "/if",
                            parentData: t,
                            parentDataProperty: "if",
                            rootData: c,
                            dynamicAnchors: i,
                          })
                        ) {
                          r = r === null ? l.errors : r.concat(l.errors);
                          e = r.length;
                        } else {
                          var props_16 = l.evaluated.props;
                          if (props_15 !== true && props_16 !== undefined)
                            if (props_16 === true) props_15 = true;
                            else {
                              props_15 = props_15 || {};
                              Object.assign(props_15, props_16);
                            }
                          var items_17 = l.evaluated.items;
                          if (items_16 !== true && items_17 !== undefined)
                            items_16 = items_17 === true ? true : items_16 > items_17 ? items_16 : items_17;
                        }
                        var n = O === e;
                      } else var n = true;
                      if (n) {
                        if (t.then !== undefined) {
                          let p = t.then;
                          let O = e;
                          let meta = i.meta;
                          if (meta) {
                            if (
                              !meta(p, {
                                instancePath: s + "/then",
                                parentData: t,
                                parentDataProperty: "then",
                                rootData: c,
                                dynamicAnchors: i,
                              })
                            ) {
                              r = r === null ? meta.errors : r.concat(meta.errors);
                              e = r.length;
                            } else {
                              var props_17 = meta.evaluated.props;
                              var items_18 = meta.evaluated.items;
                            }
                          } else if (
                            !l(p, {
                              instancePath: s + "/then",
                              parentData: t,
                              parentDataProperty: "then",
                              rootData: c,
                              dynamicAnchors: i,
                            })
                          ) {
                            r = r === null ? l.errors : r.concat(l.errors);
                            e = r.length;
                          } else {
                            var props_18 = l.evaluated.props;
                            if (props_17 !== true && props_18 !== undefined)
                              if (props_18 === true) props_17 = true;
                              else {
                                props_17 = props_17 || {};
                                Object.assign(props_17, props_18);
                              }
                            var items_19 = l.evaluated.items;
                            if (items_18 !== true && items_19 !== undefined)
                              items_18 = items_19 === true ? true : items_18 > items_19 ? items_18 : items_19;
                          }
                          var n = O === e;
                        } else var n = true;
                        if (n) {
                          if (t.else !== undefined) {
                            let p = t.else;
                            let O = e;
                            let meta = i.meta;
                            if (meta) {
                              if (
                                !meta(p, {
                                  instancePath: s + "/else",
                                  parentData: t,
                                  parentDataProperty: "else",
                                  rootData: c,
                                  dynamicAnchors: i,
                                })
                              ) {
                                r = r === null ? meta.errors : r.concat(meta.errors);
                                e = r.length;
                              } else {
                                var props_19 = meta.evaluated.props;
                                var items_20 = meta.evaluated.items;
                              }
                            } else if (
                              !l(p, {
                                instancePath: s + "/else",
                                parentData: t,
                                parentDataProperty: "else",
                                rootData: c,
                                dynamicAnchors: i,
                              })
                            ) {
                              r = r === null ? l.errors : r.concat(l.errors);
                              e = r.length;
                            } else {
                              var props_20 = l.evaluated.props;
                              if (props_19 !== true && props_20 !== undefined)
                                if (props_20 === true) props_19 = true;
                                else {
                                  props_19 = props_19 || {};
                                  Object.assign(props_19, props_20);
                                }
                              var items_21 = l.evaluated.items;
                              if (items_20 !== true && items_21 !== undefined)
                                items_20 =
                                  items_21 === true ? true : items_20 > items_21 ? items_20 : items_21;
                            }
                            var n = O === e;
                          } else var n = true;
                          if (n) {
                            if (t.allOf !== undefined) {
                              let p = e;
                              if (
                                !R(t.allOf, {
                                  instancePath: s + "/allOf",
                                  parentData: t,
                                  parentDataProperty: "allOf",
                                  rootData: c,
                                  dynamicAnchors: i,
                                })
                              ) {
                                r = r === null ? R.errors : r.concat(R.errors);
                                e = r.length;
                              }
                              var n = p === e;
                            } else var n = true;
                            if (n) {
                              if (t.anyOf !== undefined) {
                                let p = e;
                                if (
                                  !R(t.anyOf, {
                                    instancePath: s + "/anyOf",
                                    parentData: t,
                                    parentDataProperty: "anyOf",
                                    rootData: c,
                                    dynamicAnchors: i,
                                  })
                                ) {
                                  r = r === null ? R.errors : r.concat(R.errors);
                                  e = r.length;
                                }
                                var n = p === e;
                              } else var n = true;
                              if (n) {
                                if (t.oneOf !== undefined) {
                                  let p = e;
                                  if (
                                    !R(t.oneOf, {
                                      instancePath: s + "/oneOf",
                                      parentData: t,
                                      parentDataProperty: "oneOf",
                                      rootData: c,
                                      dynamicAnchors: i,
                                    })
                                  ) {
                                    r = r === null ? R.errors : r.concat(R.errors);
                                    e = r.length;
                                  }
                                  var n = p === e;
                                } else var n = true;
                                if (n)
                                  if (t.not !== undefined) {
                                    let not = t.not;
                                    let O = e;
                                    let meta = i.meta;
                                    if (meta) {
                                      if (
                                        !meta(not, {
                                          instancePath: s + "/not",
                                          parentData: t,
                                          parentDataProperty: "not",
                                          rootData: c,
                                          dynamicAnchors: i,
                                        })
                                      ) {
                                        r = r === null ? meta.errors : r.concat(meta.errors);
                                        e = r.length;
                                      } else {
                                        var props_21 = meta.evaluated.props;
                                        var items_22 = meta.evaluated.items;
                                      }
                                    } else if (
                                      !l(not, {
                                        instancePath: s + "/not",
                                        parentData: t,
                                        parentDataProperty: "not",
                                        rootData: c,
                                        dynamicAnchors: i,
                                      })
                                    ) {
                                      r = r === null ? l.errors : r.concat(l.errors);
                                      e = r.length;
                                    } else {
                                      var props_22 = l.evaluated.props;
                                      if (props_21 !== true && props_22 !== undefined)
                                        if (props_22 === true) props_21 = true;
                                        else {
                                          props_21 = props_21 || {};
                                          Object.assign(props_21, props_22);
                                        }
                                      var items_23 = l.evaluated.items;
                                      if (items_22 !== true && items_23 !== undefined)
                                        items_22 =
                                          items_23 === true
                                            ? true
                                            : items_22 > items_23
                                              ? items_22
                                              : items_23;
                                    }
                                    var n = O === e;
                                  } else var n = true;
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
  l.errors = r;
  return e === 0;
}
//@ chunk-n332mrkv.js:20346-20588 layout
l.evaluated = {
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
//@ chunk-n332mrkv.js:20588-20986 esm-fingerprint
var Ne = {
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
//@ chunk-n332mrkv.js:20986-22855 esm-layout
function F(
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
  let evaluated = F.evaluated;
  if (evaluated.dynamicProps) evaluated.props = undefined;
  if (evaluated.dynamicItems) evaluated.items = undefined;
  if (!(t && typeof t == "object" && !Array.isArray(t)) && typeof t !== "boolean") {
    F.errors = [
      {
        instancePath: s,
        schemaPath: "#/type",
        keyword: "type",
        params: {
          type: Ne.type,
        },
        message: "must be object,boolean",
      },
    ];
    return false;
  }
  if (!i.meta) i.meta = F;
  if (e === 0) {
    if (t && typeof t == "object" && !Array.isArray(t)) {
      if (t.unevaluatedItems !== undefined) {
        let unevaluatedItems = t.unevaluatedItems;
        let N = e;
        let meta = i.meta;
        if (meta) {
          if (
            !meta(unevaluatedItems, {
              instancePath: s + "/unevaluatedItems",
              parentData: t,
              parentDataProperty: "unevaluatedItems",
              rootData: c,
              dynamicAnchors: i,
            })
          ) {
            r = r === null ? meta.errors : r.concat(meta.errors);
            e = r.length;
          } else {
            var props = meta.evaluated.props;
            var items = meta.evaluated.items;
          }
        } else if (
          !F(unevaluatedItems, {
            instancePath: s + "/unevaluatedItems",
            parentData: t,
            parentDataProperty: "unevaluatedItems",
            rootData: c,
            dynamicAnchors: i,
          })
        ) {
          r = r === null ? F.errors : r.concat(F.errors);
          e = r.length;
        } else {
          var props_2 = F.evaluated.props;
          if (props !== true && props_2 !== undefined)
            if (props_2 === true) props = true;
            else {
              props = props || {};
              Object.assign(props, props_2);
            }
          var items_2 = F.evaluated.items;
          if (items !== true && items_2 !== undefined)
            items = items_2 === true ? true : items > items_2 ? items : items_2;
        }
        var k = N === e;
      } else var k = true;
      if (k)
        if (t.unevaluatedProperties !== undefined) {
          let unevaluatedProperties = t.unevaluatedProperties;
          let N = e;
          let meta = i.meta;
          if (meta) {
            if (
              !meta(unevaluatedProperties, {
                instancePath: s + "/unevaluatedProperties",
                parentData: t,
                parentDataProperty: "unevaluatedProperties",
                rootData: c,
                dynamicAnchors: i,
              })
            ) {
              r = r === null ? meta.errors : r.concat(meta.errors);
              e = r.length;
            } else {
              var props_3 = meta.evaluated.props;
              var items_3 = meta.evaluated.items;
            }
          } else if (
            !F(unevaluatedProperties, {
              instancePath: s + "/unevaluatedProperties",
              parentData: t,
              parentDataProperty: "unevaluatedProperties",
              rootData: c,
              dynamicAnchors: i,
            })
          ) {
            r = r === null ? F.errors : r.concat(F.errors);
            e = r.length;
          } else {
            var props_4 = F.evaluated.props;
            if (props_3 !== true && props_4 !== undefined)
              if (props_4 === true) props_3 = true;
              else {
                props_3 = props_3 || {};
                Object.assign(props_3, props_4);
              }
            var items_4 = F.evaluated.items;
            if (items_3 !== true && items_4 !== undefined)
              items_3 = items_4 === true ? true : items_3 > items_4 ? items_3 : items_4;
          }
          var k = N === e;
        } else var k = true;
    }
  }
  F.errors = r;
  return e === 0;
}
//@ chunk-n332mrkv.js:22855-22954 esm-layout
F.evaluated = {
  props: {
    unevaluatedItems: true,
    unevaluatedProperties: true,
  },
  dynamicProps: false,
  dynamicItems: false,
};
//@ chunk-n332mrkv.js:22954-24545 esm-fingerprint
var xe = {
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
var _e = {
  enum: ["array", "boolean", "integer", "null", "number", "object", "string"],
};
//@ chunk-n332mrkv.js:24545-24566 esm-layout
var require_ajv = require_equal().default;
//@ chunk-n332mrkv.js:36244-36750 esm-fingerprint
var De = {
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
//@ chunk-n332mrkv.js:36750-38764 esm-layout
function L(
  t,
  {
    instancePath: s = "",
    parentData: z,
    parentDataProperty: E,
    rootData: c = t,
    dynamicAnchors: i = {},
  } = {},
) {
  let errors = null;
  let e = 0;
  let evaluated = L.evaluated;
  if (evaluated.dynamicProps) evaluated.props = undefined;
  if (evaluated.dynamicItems) evaluated.items = undefined;
  if (!(t && typeof t == "object" && !Array.isArray(t)) && typeof t !== "boolean") {
    L.errors = [
      {
        instancePath: s,
        schemaPath: "#/type",
        keyword: "type",
        params: {
          type: De.type,
        },
        message: "must be object,boolean",
      },
    ];
    return false;
  }
  if (!i.meta) i.meta = L;
  if (e === 0) {
    if (t && typeof t == "object" && !Array.isArray(t)) {
      if (t.title !== undefined) {
        let d = e;
        if (typeof t.title !== "string") {
          L.errors = [
            {
              instancePath: s + "/title",
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
        var n = d === e;
      } else var n = true;
      if (n) {
        if (t.description !== undefined) {
          let d = e;
          if (typeof t.description !== "string") {
            L.errors = [
              {
                instancePath: s + "/description",
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
          var n = d === e;
        } else var n = true;
        if (n) {
          if (t.deprecated !== undefined) {
            let d = e;
            if (typeof t.deprecated !== "boolean") {
              L.errors = [
                {
                  instancePath: s + "/deprecated",
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
            var n = d === e;
          } else var n = true;
          if (n) {
            if (t.readOnly !== undefined) {
              let d = e;
              if (typeof t.readOnly !== "boolean") {
                L.errors = [
                  {
                    instancePath: s + "/readOnly",
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
              var n = d === e;
            } else var n = true;
            if (n) {
              if (t.writeOnly !== undefined) {
                let d = e;
                if (typeof t.writeOnly !== "boolean") {
                  L.errors = [
                    {
                      instancePath: s + "/writeOnly",
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
                var n = d === e;
              } else var n = true;
              if (n)
                if (t.examples !== undefined) {
                  let d = e;
                  if (e === d) {
                    if (!Array.isArray(t.examples)) {
                      L.errors = [
                        {
                          instancePath: s + "/examples",
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
                  var n = d === e;
                } else var n = true;
            }
          }
        }
      }
    }
  }
  L.errors = errors;
  return e === 0;
}
//@ chunk-n332mrkv.js:38764-38904 esm-layout
L.evaluated = {
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
//@ chunk-n332mrkv.js:38904-39261 esm-fingerprint
var Re = {
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
//@ chunk-n332mrkv.js:39261-39959 esm-layout
function X(
  t,
  {
    instancePath: s = "",
    parentData: z,
    parentDataProperty: E,
    rootData: c = t,
    dynamicAnchors: i = {},
  } = {},
) {
  let errors = null;
  let e = 0;
  let evaluated = X.evaluated;
  if (evaluated.dynamicProps) evaluated.props = undefined;
  if (evaluated.dynamicItems) evaluated.items = undefined;
  if (!(t && typeof t == "object" && !Array.isArray(t)) && typeof t !== "boolean") {
    X.errors = [
      {
        instancePath: s,
        schemaPath: "#/type",
        keyword: "type",
        params: {
          type: Re.type,
        },
        message: "must be object,boolean",
      },
    ];
    return false;
  }
  if (!i.meta) i.meta = X;
  if (e === 0) {
    if (t && typeof t == "object" && !Array.isArray(t)) {
      if (t.format !== undefined) {
        if (typeof t.format !== "string") {
          X.errors = [
            {
              instancePath: s + "/format",
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
  X.errors = errors;
  return e === 0;
}
//@ chunk-n332mrkv.js:39959-40023 esm-layout
X.evaluated = {
  props: {
    format: true,
  },
  dynamicProps: false,
  dynamicItems: false,
};
//@ chunk-n332mrkv.js:40023-40416 esm-fingerprint
var Ae = {
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
//@ chunk-n332mrkv.js:40416-42121 affinity
function C(
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
  let evaluated = C.evaluated;
  if (evaluated.dynamicProps) evaluated.props = undefined;
  if (evaluated.dynamicItems) evaluated.items = undefined;
  if (!(t && typeof t == "object" && !Array.isArray(t)) && typeof t !== "boolean") {
    C.errors = [
      {
        instancePath: s,
        schemaPath: "#/type",
        keyword: "type",
        params: {
          type: Ae.type,
        },
        message: "must be object,boolean",
      },
    ];
    return false;
  }
  if (!i.meta) i.meta = C;
  if (e === 0) {
    if (t && typeof t == "object" && !Array.isArray(t)) {
      if (t.contentEncoding !== undefined) {
        let I = e;
        if (typeof t.contentEncoding !== "string") {
          C.errors = [
            {
              instancePath: s + "/contentEncoding",
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
        var n = I === e;
      } else var n = true;
      if (n) {
        if (t.contentMediaType !== undefined) {
          let I = e;
          if (typeof t.contentMediaType !== "string") {
            C.errors = [
              {
                instancePath: s + "/contentMediaType",
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
          var n = I === e;
        } else var n = true;
        if (n)
          if (t.contentSchema !== undefined) {
            let contentSchema = t.contentSchema;
            let a = e;
            let meta = i.meta;
            if (meta) {
              if (
                !meta(contentSchema, {
                  instancePath: s + "/contentSchema",
                  parentData: t,
                  parentDataProperty: "contentSchema",
                  rootData: c,
                  dynamicAnchors: i,
                })
              ) {
                r = r === null ? meta.errors : r.concat(meta.errors);
                e = r.length;
              } else {
                var props = meta.evaluated.props;
                var items = meta.evaluated.items;
              }
            } else if (
              !C(contentSchema, {
                instancePath: s + "/contentSchema",
                parentData: t,
                parentDataProperty: "contentSchema",
                rootData: c,
                dynamicAnchors: i,
              })
            ) {
              r = r === null ? C.errors : r.concat(C.errors);
              e = r.length;
            } else {
              var props_2 = C.evaluated.props;
              if (props !== true && props_2 !== undefined)
                if (props_2 === true) props = true;
                else {
                  props = props || {};
                  Object.assign(props, props_2);
                }
              var items_2 = C.evaluated.items;
              if (items !== true && items_2 !== undefined)
                items = items_2 === true ? true : items > items_2 ? items : items_2;
            }
            var n = a === e;
          } else var n = true;
      }
    }
  }
  C.errors = r;
  return e === 0;
}
//@ chunk-n332mrkv.js:42121-42231 affinity
C.evaluated = {
  props: {
    contentEncoding: true,
    contentMediaType: true,
    contentSchema: true,
  },
  dynamicProps: false,
  dynamicItems: false,
};
//@ chunk-n332mrkv.js:42231-48153 affinity
function D(
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
  let evaluated = D.evaluated;
  if (evaluated.dynamicProps) evaluated.props = undefined;
  if (evaluated.dynamicItems) evaluated.items = undefined;
  if (!(t && typeof t == "object" && !Array.isArray(t)) && typeof t !== "boolean") {
    D.errors = [
      {
        instancePath: s,
        schemaPath: "#/type",
        keyword: "type",
        params: {
          type: je.type,
        },
        message: "must be object,boolean",
      },
    ];
    return false;
  }
  if (!i.meta) i.meta = D;
  let n = e;
  if (
    !x(t, {
      instancePath: s,
      parentData: z,
      parentDataProperty: E,
      rootData: c,
      dynamicAnchors: i,
    })
  ) {
    r = r === null ? x.errors : r.concat(x.errors);
    e = r.length;
  }
  var d = n === e;
  if (d) {
    let P = e;
    if (
      !l(t, {
        instancePath: s,
        parentData: z,
        parentDataProperty: E,
        rootData: c,
        dynamicAnchors: i,
      })
    ) {
      r = r === null ? l.errors : r.concat(l.errors);
      e = r.length;
    }
    var d = P === e;
    if (d) {
      let M = e;
      if (
        !F(t, {
          instancePath: s,
          parentData: z,
          parentDataProperty: E,
          rootData: c,
          dynamicAnchors: i,
        })
      ) {
        r = r === null ? F.errors : r.concat(F.errors);
        e = r.length;
      }
      var d = M === e;
      if (d) {
        let T = e;
        if (
          !b(t, {
            instancePath: s,
            parentData: z,
            parentDataProperty: E,
            rootData: c,
            dynamicAnchors: i,
          })
        ) {
          r = r === null ? b.errors : r.concat(b.errors);
          e = r.length;
        }
        var d = T === e;
        if (d) {
          let Q = e;
          if (
            !L(t, {
              instancePath: s,
              parentData: z,
              parentDataProperty: E,
              rootData: c,
              dynamicAnchors: i,
            })
          ) {
            r = r === null ? L.errors : r.concat(L.errors);
            e = r.length;
          }
          var d = Q === e;
          if (d) {
            let ae = e;
            if (
              !X(t, {
                instancePath: s,
                parentData: z,
                parentDataProperty: E,
                rootData: c,
                dynamicAnchors: i,
              })
            ) {
              r = r === null ? X.errors : r.concat(X.errors);
              e = r.length;
            }
            var d = ae === e;
            if (d) {
              let Y = e;
              if (
                !C(t, {
                  instancePath: s,
                  parentData: z,
                  parentDataProperty: E,
                  rootData: c,
                  dynamicAnchors: i,
                })
              ) {
                r = r === null ? C.errors : r.concat(C.errors);
                e = r.length;
              }
              var d = Y === e;
            }
          }
        }
      }
    }
  }
  if (e === 0) {
    if (t && typeof t == "object" && !Array.isArray(t)) {
      if (t.definitions !== undefined) {
        let definitions = t.definitions;
        let S = e;
        if (e === S)
          if (definitions && typeof definitions == "object" && !Array.isArray(definitions))
            for (let key in definitions) {
              let Z = definitions[key];
              let T = e;
              let meta = i.meta;
              if (meta) {
                if (
                  !meta(Z, {
                    instancePath: s + "/definitions/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                    parentData: definitions,
                    parentDataProperty: key,
                    rootData: c,
                    dynamicAnchors: i,
                  })
                ) {
                  r = r === null ? meta.errors : r.concat(meta.errors);
                  e = r.length;
                } else {
                  var props = meta.evaluated.props;
                  var items = meta.evaluated.items;
                }
              } else if (
                !D(Z, {
                  instancePath: s + "/definitions/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                  parentData: definitions,
                  parentDataProperty: key,
                  rootData: c,
                  dynamicAnchors: i,
                })
              ) {
                r = r === null ? D.errors : r.concat(D.errors);
                e = r.length;
              } else {
                var props_2 = D.evaluated.props;
                if (props !== true && props_2 !== undefined)
                  if (props_2 === true) props = true;
                  else {
                    props = props || {};
                    Object.assign(props, props_2);
                  }
                var items_2 = D.evaluated.items;
                if (items !== true && items_2 !== undefined)
                  items = items_2 === true ? true : items > items_2 ? items : items_2;
              }
              var a = T === e;
              if (!a) break;
            }
          else {
            D.errors = [
              {
                instancePath: s + "/definitions",
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
        var f = S === e;
      } else var f = true;
      if (f) {
        if (t.dependencies !== undefined) {
          let dependencies = t.dependencies;
          let S = e;
          if (e === S)
            if (dependencies && typeof dependencies == "object" && !Array.isArray(dependencies))
              for (let key in dependencies) {
                let T = dependencies[key];
                let V = e;
                let Q = e;
                let K = false;
                let ae = e;
                let meta = i.meta;
                if (meta) {
                  if (
                    !meta(T, {
                      instancePath: s + "/dependencies/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                      parentData: dependencies,
                      parentDataProperty: key,
                      rootData: c,
                      dynamicAnchors: i,
                    })
                  ) {
                    r = r === null ? meta.errors : r.concat(meta.errors);
                    e = r.length;
                  } else {
                    var props_3 = meta.evaluated.props;
                    var items_3 = meta.evaluated.items;
                  }
                } else if (
                  !D(T, {
                    instancePath: s + "/dependencies/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                    parentData: dependencies,
                    parentDataProperty: key,
                    rootData: c,
                    dynamicAnchors: i,
                  })
                ) {
                  r = r === null ? D.errors : r.concat(D.errors);
                  e = r.length;
                } else {
                  var props_4 = D.evaluated.props;
                  if (props_3 !== true && props_4 !== undefined)
                    if (props_4 === true) props_3 = true;
                    else {
                      props_3 = props_3 || {};
                      Object.assign(props_3, props_4);
                    }
                  var items_4 = D.evaluated.items;
                  if (items_3 !== true && items_4 !== undefined)
                    items_3 = items_4 === true ? true : items_3 > items_4 ? items_3 : items_4;
                }
                var j = ae === e;
                K = K || j;
                let Y = e;
                if (e === e)
                  if (Array.isArray(T)) {
                    var _ = true;
                    let G = T.length;
                    for (let idx = 0; idx < G; idx++) {
                      let H = e;
                      if (typeof T[idx] !== "string") {
                        let J = {
                          instancePath:
                            s + "/dependencies/" + key.replace(/~/g, "~0").replace(/\//g, "~1") + "/" + idx,
                          schemaPath: "meta/validation#/$defs/stringArray/items/type",
                          keyword: "type",
                          params: {
                            type: "string",
                          },
                          message: "must be string",
                        };
                        if (r === null) r = [J];
                        else r.push(J);
                        e++;
                      }
                      var _ = H === e;
                      if (!_) break;
                    }
                    if (_) {
                      let U = T.length;
                      let H;
                      if (U > 1) {
                        let ee = {};
                        for (; U--;) {
                          let J = T[U];
                          if (typeof J !== "string") continue;
                          if (typeof ee[J] == "number") {
                            H = ee[J];
                            let te = {
                              instancePath:
                                s + "/dependencies/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                              schemaPath: "meta/validation#/$defs/stringArray/uniqueItems",
                              keyword: "uniqueItems",
                              params: {
                                i: U,
                                j: H,
                              },
                              message:
                                "must NOT have duplicate items (items ## " +
                                H +
                                " and " +
                                U +
                                " are identical)",
                            };
                            if (r === null) r = [te];
                            else r.push(te);
                            e++;
                            break;
                          }
                          ee[J] = U;
                        }
                      }
                    }
                  } else {
                    let G = {
                      instancePath: s + "/dependencies/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                      schemaPath: "meta/validation#/$defs/stringArray/type",
                      keyword: "type",
                      params: {
                        type: "array",
                      },
                      message: "must be array",
                    };
                    if (r === null) r = [G];
                    else r.push(G);
                    e++;
                  }
                var j = Y === e;
                K = K || j;
                if (j) {
                  if (items_3 !== true) items_3 = true;
                }
                if (!K) {
                  let G = {
                    instancePath: s + "/dependencies/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                    schemaPath: "#/properties/dependencies/additionalProperties/anyOf",
                    keyword: "anyOf",
                    params: {},
                    message: "must match a schema in anyOf",
                  };
                  if (r === null) r = [G];
                  else r.push(G);
                  e++;
                  D.errors = r;
                  return false;
                } else {
                  e = Q;
                  if (r !== null)
                    if (Q) r.length = Q;
                    else r = null;
                }
                var g = V === e;
                if (!g) break;
              }
            else {
              D.errors = [
                {
                  instancePath: s + "/dependencies",
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
          var f = S === e;
        } else var f = true;
        if (f) {
          if (t.$recursiveAnchor !== undefined) {
            let $recursiveAnchor = t.$recursiveAnchor;
            let S = e;
            if (e === e)
              if (typeof $recursiveAnchor === "string") {
                if (!regExp_2.test($recursiveAnchor)) {
                  D.errors = [
                    {
                      instancePath: s + "/$recursiveAnchor",
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
                D.errors = [
                  {
                    instancePath: s + "/$recursiveAnchor",
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
            var f = S === e;
          } else var f = true;
          if (f)
            if (t.$recursiveRef !== undefined) {
              let P = e;
              let S = e;
              if (e === S) {
                if (e === S) {
                  if (typeof t.$recursiveRef !== "string") {
                    D.errors = [
                      {
                        instancePath: s + "/$recursiveRef",
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
              var f = P === e;
            } else var f = true;
        }
      }
    }
  }
  D.errors = r;
  return e === 0;
}
//@ chunk-n332mrkv.js:48153-49040 affinity
D.evaluated = {
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
//@ chunk-r1g76qsy.js:255842-255955 esm-fingerprint
function Cd() {
  let e = new $d.Ajv2020({
    strict: false,
    validateFormats: true,
    validateSchema: false,
    allErrors: true,
  });
  Td(e);
  return e;
}
//@ chunk-r1g76qsy.js:255955-256668 esm-fingerprint
var Udn = class {
  _ajv;
  _userAjv;
  constructor(e) {
    this._userAjv = e !== undefined;
    this._ajv = e;
  }
  get ajv() {
    return (this._ajv ??= Cd());
  }
  getValidator(e) {
    if (
      !this._userAjv &&
      "$schema" in e &&
      typeof e.$schema === "string" &&
      !DRAFT_2020_12_URIS.has(e.$schema.replace(/#$/, ""))
    ) {
      let sliced = e.$schema.slice(0, 200);
      throw Error(
        `JSON Schema declares an unsupported dialect ("$schema": "${sliced}"). The default validator supports JSON Schema 2020-12 only; pass a pre-configured Ajv instance to AjvJsonSchemaValidator(ajv) to validate other dialects.`,
      );
    }
    let engine = this.ajv;
    let ajvValidator =
      "$id" in e && typeof e.$id === "string"
        ? (engine.getSchema(e.$id) ?? engine.compile(e))
        : engine.compile(e);
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
var Ajv = wd.Ajv;
export { Udn, xe, _e, require_ajv };

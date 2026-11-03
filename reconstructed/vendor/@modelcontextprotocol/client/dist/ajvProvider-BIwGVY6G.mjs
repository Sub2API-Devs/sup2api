/**
 * @modelcontextprotocol/client/dist/ajvProvider-BIwGVY6G.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/client@2.0.0
 * pieces: chunk-n332mrkv.js (26), chunk-r1g76qsy.js (2)
 * attribution: esm-layout 8, esm-fingerprint 9, layout 7, affinity 4
 */
import { Lkn } from "../../../ajv/dist/runtime/equal.js";
import { b } from "./cfWorkerProvider-l7BFVI5n.mjs";
import { $d, Td, Pd, wd } from "../../../ajv-formats/dist/formats.js";

//@ chunk-n332mrkv.js:228-1961 esm-layout
var qe = D,
  je = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://json-schema.org/draft/2020-12/schema",
    $vocabulary: {
      "https://json-schema.org/draft/2020-12/vocab/core": !0,
      "https://json-schema.org/draft/2020-12/vocab/applicator": !0,
      "https://json-schema.org/draft/2020-12/vocab/unevaluated": !0,
      "https://json-schema.org/draft/2020-12/vocab/validation": !0,
      "https://json-schema.org/draft/2020-12/vocab/meta-data": !0,
      "https://json-schema.org/draft/2020-12/vocab/format-annotation": !0,
      "https://json-schema.org/draft/2020-12/vocab/content": !0,
    },
    $dynamicAnchor: "meta",
    title: "Core and Validation specifications meta-schema",
    allOf: [
      { $ref: "meta/core" },
      { $ref: "meta/applicator" },
      { $ref: "meta/unevaluated" },
      { $ref: "meta/validation" },
      { $ref: "meta/meta-data" },
      { $ref: "meta/format-annotation" },
      { $ref: "meta/content" },
    ],
    type: ["object", "boolean"],
    $comment:
      "This meta-schema also defines keywords that have appeared in previous drafts in order to prevent incompatible extensions as they remain in common use.",
    properties: {
      definitions: {
        $comment: '"definitions" has been replaced by "$defs".',
        type: "object",
        additionalProperties: { $dynamicRef: "#meta" },
        deprecated: !0,
        default: {},
      },
      dependencies: {
        $comment:
          '"dependencies" has been split and replaced by "dependentSchemas" and "dependentRequired" in order to serve their differing semantics.',
        type: "object",
        additionalProperties: {
          anyOf: [{ $dynamicRef: "#meta" }, { $ref: "meta/validation#/$defs/stringArray" }],
        },
        deprecated: !0,
        default: {},
      },
      $recursiveAnchor: {
        $comment: '"$recursiveAnchor" has been replaced by "$dynamicAnchor".',
        $ref: "meta/core#/$defs/anchorString",
        deprecated: !0,
      },
      $recursiveRef: {
        $comment: '"$recursiveRef" has been replaced by "$dynamicRef".',
        $ref: "meta/core#/$defs/uriReferenceString",
        deprecated: !0,
      },
    },
  };
//@ chunk-n332mrkv.js:1961-2923 esm-fingerprint
var ke = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://json-schema.org/draft/2020-12/meta/core",
  $vocabulary: { "https://json-schema.org/draft/2020-12/vocab/core": !0 },
  $dynamicAnchor: "meta",
  title: "Core vocabulary meta-schema",
  type: ["object", "boolean"],
  properties: {
    $id: {
      $ref: "#/$defs/uriReferenceString",
      $comment: "Non-empty fragments not allowed.",
      pattern: "^[^#]*#?$",
    },
    $schema: { $ref: "#/$defs/uriString" },
    $ref: { $ref: "#/$defs/uriReferenceString" },
    $anchor: { $ref: "#/$defs/anchorString" },
    $dynamicRef: { $ref: "#/$defs/uriReferenceString" },
    $dynamicAnchor: { $ref: "#/$defs/anchorString" },
    $vocabulary: {
      type: "object",
      propertyNames: { $ref: "#/$defs/uriString" },
      additionalProperties: { type: "boolean" },
    },
    $comment: { type: "string" },
    $defs: { type: "object", additionalProperties: { $dynamicRef: "#meta" } },
  },
  $defs: {
    anchorString: { type: "string", pattern: "^[A-Za-z_][-A-Za-z0-9._]*$" },
    uriString: { type: "string", format: "uri" },
    uriReferenceString: { type: "string", format: "uri-reference" },
  },
};
//@ chunk-n332mrkv.js:2923-3006 layout
var regExp = new RegExp("^[^#]*#?$", "u"),
  regExp_2 = new RegExp("^[A-Za-z_][-A-Za-z0-9._]*$", "u");
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
  let r = null,
    e = 0,
    evaluated = x.evaluated;
  if (evaluated.dynamicProps) evaluated.props = void 0;
  if (evaluated.dynamicItems) evaluated.items = void 0;
  if (!(t && typeof t == "object" && !Array.isArray(t)) && typeof t !== "boolean")
    return (
      (x.errors = [
        {
          instancePath: s,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: ke.type },
          message: "must be object,boolean",
        },
      ]),
      !1
    );
  if (!i.meta) i.meta = x;
  if (e === 0) {
    if (t && typeof t == "object" && !Array.isArray(t)) {
      if (t.$id !== void 0) {
        let $id = t.$id,
          m = e,
          N = e;
        if (e === N) {
          if (e === N) {
            if (typeof $id !== "string")
              return (
                (x.errors = [
                  {
                    instancePath: s + "/$id",
                    schemaPath: "#/$defs/uriReferenceString/type",
                    keyword: "type",
                    params: { type: "string" },
                    message: "must be string",
                  },
                ]),
                !1
              );
          }
        }
        if (e === m) {
          if (typeof $id === "string") {
            if (!regExp.test($id))
              return (
                (x.errors = [
                  {
                    instancePath: s + "/$id",
                    schemaPath: "#/properties/%24id/pattern",
                    keyword: "pattern",
                    params: { pattern: "^[^#]*#?$" },
                    message: 'must match pattern "^[^#]*#?$"',
                  },
                ]),
                !1
              );
          }
        }
        var n = m === e;
      } else var n = !0;
      if (n) {
        if (t.$schema !== void 0) {
          let u = e,
            m = e;
          if (e === m) {
            if (e === m) {
              if (typeof t.$schema !== "string")
                return (
                  (x.errors = [
                    {
                      instancePath: s + "/$schema",
                      schemaPath: "#/$defs/uriString/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    },
                  ]),
                  !1
                );
            }
          }
          var n = u === e;
        } else var n = !0;
        if (n) {
          if (t.$ref !== void 0) {
            let u = e,
              m = e;
            if (e === m) {
              if (e === m) {
                if (typeof t.$ref !== "string")
                  return (
                    (x.errors = [
                      {
                        instancePath: s + "/$ref",
                        schemaPath: "#/$defs/uriReferenceString/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string",
                      },
                    ]),
                    !1
                  );
              }
            }
            var n = u === e;
          } else var n = !0;
          if (n) {
            if (t.$anchor !== void 0) {
              let $anchor = t.$anchor,
                m = e;
              if (e === e)
                if (typeof $anchor === "string") {
                  if (!regExp_2.test($anchor))
                    return (
                      (x.errors = [
                        {
                          instancePath: s + "/$anchor",
                          schemaPath: "#/$defs/anchorString/pattern",
                          keyword: "pattern",
                          params: { pattern: "^[A-Za-z_][-A-Za-z0-9._]*$" },
                          message: 'must match pattern "^[A-Za-z_][-A-Za-z0-9._]*$"',
                        },
                      ]),
                      !1
                    );
                } else
                  return (
                    (x.errors = [
                      {
                        instancePath: s + "/$anchor",
                        schemaPath: "#/$defs/anchorString/type",
                        keyword: "type",
                        params: { type: "string" },
                        message: "must be string",
                      },
                    ]),
                    !1
                  );
              var n = m === e;
            } else var n = !0;
            if (n) {
              if (t.$dynamicRef !== void 0) {
                let u = e,
                  m = e;
                if (e === m) {
                  if (e === m) {
                    if (typeof t.$dynamicRef !== "string")
                      return (
                        (x.errors = [
                          {
                            instancePath: s + "/$dynamicRef",
                            schemaPath: "#/$defs/uriReferenceString/type",
                            keyword: "type",
                            params: { type: "string" },
                            message: "must be string",
                          },
                        ]),
                        !1
                      );
                  }
                }
                var n = u === e;
              } else var n = !0;
              if (n) {
                if (t.$dynamicAnchor !== void 0) {
                  let $dynamicAnchor = t.$dynamicAnchor,
                    m = e;
                  if (e === e)
                    if (typeof $dynamicAnchor === "string") {
                      if (!regExp_2.test($dynamicAnchor))
                        return (
                          (x.errors = [
                            {
                              instancePath: s + "/$dynamicAnchor",
                              schemaPath: "#/$defs/anchorString/pattern",
                              keyword: "pattern",
                              params: { pattern: "^[A-Za-z_][-A-Za-z0-9._]*$" },
                              message: 'must match pattern "^[A-Za-z_][-A-Za-z0-9._]*$"',
                            },
                          ]),
                          !1
                        );
                    } else
                      return (
                        (x.errors = [
                          {
                            instancePath: s + "/$dynamicAnchor",
                            schemaPath: "#/$defs/anchorString/type",
                            keyword: "type",
                            params: { type: "string" },
                            message: "must be string",
                          },
                        ]),
                        !1
                      );
                  var n = m === e;
                } else var n = !0;
                if (n) {
                  if (t.$vocabulary !== void 0) {
                    let $vocabulary = t.$vocabulary,
                      m = e;
                    if (e === m)
                      if ($vocabulary && typeof $vocabulary == "object" && !Array.isArray($vocabulary)) {
                        for (let key in $vocabulary) {
                          let _ = e,
                            j = e;
                          if (e === j) {
                            if (e === j) {
                              if (typeof key !== "string") {
                                let g = {
                                  instancePath: s + "/$vocabulary",
                                  schemaPath: "#/$defs/uriString/type",
                                  keyword: "type",
                                  params: { type: "string" },
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
                              params: { propertyName: key },
                              message: "property name must be valid",
                            };
                            if (r === null) r = [g];
                            else r.push(g);
                            return (e++, (x.errors = r), !1);
                            break;
                          }
                        }
                        if (d)
                          for (let key in $vocabulary) {
                            let _ = e;
                            if (typeof $vocabulary[key] !== "boolean")
                              return (
                                (x.errors = [
                                  {
                                    instancePath:
                                      s + "/$vocabulary/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                                    schemaPath: "#/properties/%24vocabulary/additionalProperties/type",
                                    keyword: "type",
                                    params: { type: "boolean" },
                                    message: "must be boolean",
                                  },
                                ]),
                                !1
                              );
                            var o = _ === e;
                            if (!o) break;
                          }
                      } else
                        return (
                          (x.errors = [
                            {
                              instancePath: s + "/$vocabulary",
                              schemaPath: "#/properties/%24vocabulary/type",
                              keyword: "type",
                              params: { type: "object" },
                              message: "must be object",
                            },
                          ]),
                          !1
                        );
                    var n = m === e;
                  } else var n = !0;
                  if (n) {
                    if (t.$comment !== void 0) {
                      let u = e;
                      if (typeof t.$comment !== "string")
                        return (
                          (x.errors = [
                            {
                              instancePath: s + "/$comment",
                              schemaPath: "#/properties/%24comment/type",
                              keyword: "type",
                              params: { type: "string" },
                              message: "must be string",
                            },
                          ]),
                          !1
                        );
                      var n = u === e;
                    } else var n = !0;
                    if (n)
                      if (t.$defs !== void 0) {
                        let $defs = t.$defs,
                          m = e;
                        if (e === m)
                          if ($defs && typeof $defs == "object" && !Array.isArray($defs))
                            for (let key in $defs) {
                              let _ = $defs[key],
                                j = e,
                                meta = i.meta;
                              if (meta)
                                if (
                                  !meta(_, {
                                    instancePath:
                                      s + "/$defs/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                                    parentData: $defs,
                                    parentDataProperty: key,
                                    rootData: c,
                                    dynamicAnchors: i,
                                  })
                                )
                                  ((r = r === null ? meta.errors : r.concat(meta.errors)), (e = r.length));
                                else
                                  var props = meta.evaluated.props,
                                    items = meta.evaluated.items;
                              else if (
                                !x(_, {
                                  instancePath: s + "/$defs/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                                  parentData: $defs,
                                  parentDataProperty: key,
                                  rootData: c,
                                  dynamicAnchors: i,
                                })
                              )
                                ((r = r === null ? x.errors : r.concat(x.errors)), (e = r.length));
                              else {
                                var props_2 = x.evaluated.props;
                                if (props !== !0 && props_2 !== void 0)
                                  if (props_2 === !0) props = !0;
                                  else ((props = props || {}), Object.assign(props, props_2));
                                var items_2 = x.evaluated.items;
                                if (items !== !0 && items_2 !== void 0)
                                  items = items_2 === !0 ? !0 : items > items_2 ? items : items_2;
                              }
                              var f = j === e;
                              if (!f) break;
                            }
                          else
                            return (
                              (x.errors = [
                                {
                                  instancePath: s + "/$defs",
                                  schemaPath: "#/properties/%24defs/type",
                                  keyword: "type",
                                  params: { type: "object" },
                                  message: "must be object",
                                },
                              ]),
                              !1
                            );
                        var n = m === e;
                      } else var n = !0;
                  }
                }
              }
            }
          }
        }
      }
    }
  }
  return ((x.errors = r), e === 0);
}
//@ chunk-n332mrkv.js:8156-8316 layout
x.evaluated = {
  props: {
    $id: !0,
    $schema: !0,
    $ref: !0,
    $anchor: !0,
    $dynamicRef: !0,
    $dynamicAnchor: !0,
    $vocabulary: !0,
    $comment: !0,
    $defs: !0,
  },
  dynamicProps: !1,
  dynamicItems: !1,
};
//@ chunk-n332mrkv.js:8316-9367 esm-fingerprint
var Ie = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://json-schema.org/draft/2020-12/meta/applicator",
  $vocabulary: { "https://json-schema.org/draft/2020-12/vocab/applicator": !0 },
  $dynamicAnchor: "meta",
  title: "Applicator vocabulary meta-schema",
  type: ["object", "boolean"],
  properties: {
    prefixItems: { $ref: "#/$defs/schemaArray" },
    items: { $dynamicRef: "#meta" },
    contains: { $dynamicRef: "#meta" },
    additionalProperties: { $dynamicRef: "#meta" },
    properties: { type: "object", additionalProperties: { $dynamicRef: "#meta" }, default: {} },
    patternProperties: {
      type: "object",
      additionalProperties: { $dynamicRef: "#meta" },
      propertyNames: { format: "regex" },
      default: {},
    },
    dependentSchemas: { type: "object", additionalProperties: { $dynamicRef: "#meta" }, default: {} },
    propertyNames: { $dynamicRef: "#meta" },
    if: { $dynamicRef: "#meta" },
    then: { $dynamicRef: "#meta" },
    else: { $dynamicRef: "#meta" },
    allOf: { $ref: "#/$defs/schemaArray" },
    anyOf: { $ref: "#/$defs/schemaArray" },
    oneOf: { $ref: "#/$defs/schemaArray" },
    not: { $dynamicRef: "#meta" },
  },
  $defs: { schemaArray: { type: "array", minItems: 1, items: { $dynamicRef: "#meta" } } },
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
  let r = null,
    e = 0,
    evaluated = R.evaluated;
  if (evaluated.dynamicProps) evaluated.props = void 0;
  if (evaluated.dynamicItems) evaluated.items = void 0;
  if (e === 0)
    if (Array.isArray(t))
      if (t.length < 1)
        return (
          (R.errors = [
            {
              instancePath: s,
              schemaPath: "#/minItems",
              keyword: "minItems",
              params: { limit: 1 },
              message: "must NOT have fewer than 1 items",
            },
          ]),
          !1
        );
      else {
        var n = !0;
        let I = t.length;
        for (let a = 0; a < I; a++) {
          let f = t[a],
            u = e,
            meta = i.meta;
          if (meta)
            if (
              !meta(f, {
                instancePath: s + "/" + a,
                parentData: t,
                parentDataProperty: a,
                rootData: c,
                dynamicAnchors: i,
              })
            )
              ((r = r === null ? meta.errors : r.concat(meta.errors)), (e = r.length));
            else
              var props = meta.evaluated.props,
                items = meta.evaluated.items;
          else if (
            !R(f, {
              instancePath: s + "/" + a,
              parentData: t,
              parentDataProperty: a,
              rootData: c,
              dynamicAnchors: i,
            })
          )
            ((r = r === null ? R.errors : r.concat(R.errors)), (e = r.length));
          else {
            var props_2 = R.evaluated.props;
            if (props !== !0 && props_2 !== void 0)
              if (props_2 === !0) props = !0;
              else ((props = props || {}), Object.assign(props, props_2));
            var items_2 = R.evaluated.items;
            if (items !== !0 && items_2 !== void 0)
              items = items_2 === !0 ? !0 : items > items_2 ? items : items_2;
          }
          var n = u === e;
          if (!n) break;
        }
      }
    else
      return (
        (R.errors = [
          {
            instancePath: s,
            schemaPath: "#/type",
            keyword: "type",
            params: { type: "array" },
            message: "must be array",
          },
        ]),
        !1
      );
  return ((R.errors = r), e === 0);
}
//@ chunk-n332mrkv.js:10508-10563 layout
R.evaluated = { items: !0, dynamicProps: !1, dynamicItems: !1 };
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
  let r = null,
    e = 0,
    evaluated = l.evaluated;
  if (evaluated.dynamicProps) evaluated.props = void 0;
  if (evaluated.dynamicItems) evaluated.items = void 0;
  if (!(t && typeof t == "object" && !Array.isArray(t)) && typeof t !== "boolean")
    return (
      (l.errors = [
        {
          instancePath: s,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: Ie.type },
          message: "must be object,boolean",
        },
      ]),
      !1
    );
  if (!i.meta) i.meta = l;
  if (e === 0) {
    if (t && typeof t == "object" && !Array.isArray(t)) {
      if (t.prefixItems !== void 0) {
        let p = e;
        if (
          !R(t.prefixItems, {
            instancePath: s + "/prefixItems",
            parentData: t,
            parentDataProperty: "prefixItems",
            rootData: c,
            dynamicAnchors: i,
          })
        )
          ((r = r === null ? R.errors : r.concat(R.errors)), (e = r.length));
        var n = p === e;
      } else var n = !0;
      if (n) {
        if (t.items !== void 0) {
          let items = t.items,
            O = e,
            meta = i.meta;
          if (meta)
            if (
              !meta(items, {
                instancePath: s + "/items",
                parentData: t,
                parentDataProperty: "items",
                rootData: c,
                dynamicAnchors: i,
              })
            )
              ((r = r === null ? meta.errors : r.concat(meta.errors)), (e = r.length));
            else
              var props = meta.evaluated.props,
                items_2 = meta.evaluated.items;
          else if (
            !l(items, {
              instancePath: s + "/items",
              parentData: t,
              parentDataProperty: "items",
              rootData: c,
              dynamicAnchors: i,
            })
          )
            ((r = r === null ? l.errors : r.concat(l.errors)), (e = r.length));
          else {
            var props_2 = l.evaluated.props;
            if (props !== !0 && props_2 !== void 0)
              if (props_2 === !0) props = !0;
              else ((props = props || {}), Object.assign(props, props_2));
            var items_3 = l.evaluated.items;
            if (items_2 !== !0 && items_3 !== void 0)
              items_2 = items_3 === !0 ? !0 : items_2 > items_3 ? items_2 : items_3;
          }
          var n = O === e;
        } else var n = !0;
        if (n) {
          if (t.contains !== void 0) {
            let contains = t.contains,
              O = e,
              meta = i.meta;
            if (meta)
              if (
                !meta(contains, {
                  instancePath: s + "/contains",
                  parentData: t,
                  parentDataProperty: "contains",
                  rootData: c,
                  dynamicAnchors: i,
                })
              )
                ((r = r === null ? meta.errors : r.concat(meta.errors)), (e = r.length));
              else
                var props_3 = meta.evaluated.props,
                  items_4 = meta.evaluated.items;
            else if (
              !l(contains, {
                instancePath: s + "/contains",
                parentData: t,
                parentDataProperty: "contains",
                rootData: c,
                dynamicAnchors: i,
              })
            )
              ((r = r === null ? l.errors : r.concat(l.errors)), (e = r.length));
            else {
              var props_4 = l.evaluated.props;
              if (props_3 !== !0 && props_4 !== void 0)
                if (props_4 === !0) props_3 = !0;
                else ((props_3 = props_3 || {}), Object.assign(props_3, props_4));
              var items_5 = l.evaluated.items;
              if (items_4 !== !0 && items_5 !== void 0)
                items_4 = items_5 === !0 ? !0 : items_4 > items_5 ? items_4 : items_5;
            }
            var n = O === e;
          } else var n = !0;
          if (n) {
            if (t.additionalProperties !== void 0) {
              let additionalProperties = t.additionalProperties,
                O = e,
                meta = i.meta;
              if (meta)
                if (
                  !meta(additionalProperties, {
                    instancePath: s + "/additionalProperties",
                    parentData: t,
                    parentDataProperty: "additionalProperties",
                    rootData: c,
                    dynamicAnchors: i,
                  })
                )
                  ((r = r === null ? meta.errors : r.concat(meta.errors)), (e = r.length));
                else
                  var props_5 = meta.evaluated.props,
                    items_6 = meta.evaluated.items;
              else if (
                !l(additionalProperties, {
                  instancePath: s + "/additionalProperties",
                  parentData: t,
                  parentDataProperty: "additionalProperties",
                  rootData: c,
                  dynamicAnchors: i,
                })
              )
                ((r = r === null ? l.errors : r.concat(l.errors)), (e = r.length));
              else {
                var props_6 = l.evaluated.props;
                if (props_5 !== !0 && props_6 !== void 0)
                  if (props_6 === !0) props_5 = !0;
                  else ((props_5 = props_5 || {}), Object.assign(props_5, props_6));
                var items_7 = l.evaluated.items;
                if (items_6 !== !0 && items_7 !== void 0)
                  items_6 = items_7 === !0 ? !0 : items_6 > items_7 ? items_6 : items_7;
              }
              var n = O === e;
            } else var n = !0;
            if (n) {
              if (t.properties !== void 0) {
                let properties = t.properties,
                  O = e;
                if (e === O)
                  if (properties && typeof properties == "object" && !Array.isArray(properties))
                    for (let key in properties) {
                      let W = properties[key],
                        re = e,
                        meta = i.meta;
                      if (meta)
                        if (
                          !meta(W, {
                            instancePath: s + "/properties/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                            parentData: properties,
                            parentDataProperty: key,
                            rootData: c,
                            dynamicAnchors: i,
                          })
                        )
                          ((r = r === null ? meta.errors : r.concat(meta.errors)), (e = r.length));
                        else
                          var props_7 = meta.evaluated.props,
                            items_8 = meta.evaluated.items;
                      else if (
                        !l(W, {
                          instancePath: s + "/properties/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                          parentData: properties,
                          parentDataProperty: key,
                          rootData: c,
                          dynamicAnchors: i,
                        })
                      )
                        ((r = r === null ? l.errors : r.concat(l.errors)), (e = r.length));
                      else {
                        var props_8 = l.evaluated.props;
                        if (props_7 !== !0 && props_8 !== void 0)
                          if (props_8 === !0) props_7 = !0;
                          else ((props_7 = props_7 || {}), Object.assign(props_7, props_8));
                        var items_9 = l.evaluated.items;
                        if (items_8 !== !0 && items_9 !== void 0)
                          items_8 = items_9 === !0 ? !0 : items_8 > items_9 ? items_8 : items_9;
                      }
                      var M = re === e;
                      if (!M) break;
                    }
                  else
                    return (
                      (l.errors = [
                        {
                          instancePath: s + "/properties",
                          schemaPath: "#/properties/properties/type",
                          keyword: "type",
                          params: { type: "object" },
                          message: "must be object",
                        },
                      ]),
                      !1
                    );
                var n = O === e;
              } else var n = !0;
              if (n) {
                if (t.patternProperties !== void 0) {
                  let patternProperties = t.patternProperties,
                    O = e;
                  if (e === O)
                    if (
                      patternProperties &&
                      typeof patternProperties == "object" &&
                      !Array.isArray(patternProperties)
                    ) {
                      for (let key in patternProperties) {
                        var Z = e === e;
                        if (!Z) {
                          let re = {
                            instancePath: s + "/patternProperties",
                            schemaPath: "#/properties/patternProperties/propertyNames",
                            keyword: "propertyNames",
                            params: { propertyName: key },
                            message: "property name must be valid",
                          };
                          if (r === null) r = [re];
                          else r.push(re);
                          return (e++, (l.errors = r), !1);
                          break;
                        }
                      }
                      if (Z)
                        for (let key in patternProperties) {
                          let W = patternProperties[key],
                            re = e,
                            meta = i.meta;
                          if (meta)
                            if (
                              !meta(W, {
                                instancePath:
                                  s + "/patternProperties/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                                parentData: patternProperties,
                                parentDataProperty: key,
                                rootData: c,
                                dynamicAnchors: i,
                              })
                            )
                              ((r = r === null ? meta.errors : r.concat(meta.errors)), (e = r.length));
                            else
                              var props_9 = meta.evaluated.props,
                                items_10 = meta.evaluated.items;
                          else if (
                            !l(W, {
                              instancePath:
                                s + "/patternProperties/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                              parentData: patternProperties,
                              parentDataProperty: key,
                              rootData: c,
                              dynamicAnchors: i,
                            })
                          )
                            ((r = r === null ? l.errors : r.concat(l.errors)), (e = r.length));
                          else {
                            var props_10 = l.evaluated.props;
                            if (props_9 !== !0 && props_10 !== void 0)
                              if (props_10 === !0) props_9 = !0;
                              else ((props_9 = props_9 || {}), Object.assign(props_9, props_10));
                            var items_11 = l.evaluated.items;
                            if (items_10 !== !0 && items_11 !== void 0)
                              items_10 = items_11 === !0 ? !0 : items_10 > items_11 ? items_10 : items_11;
                          }
                          var ae = re === e;
                          if (!ae) break;
                        }
                    } else
                      return (
                        (l.errors = [
                          {
                            instancePath: s + "/patternProperties",
                            schemaPath: "#/properties/patternProperties/type",
                            keyword: "type",
                            params: { type: "object" },
                            message: "must be object",
                          },
                        ]),
                        !1
                      );
                  var n = O === e;
                } else var n = !0;
                if (n) {
                  if (t.dependentSchemas !== void 0) {
                    let dependentSchemas = t.dependentSchemas,
                      O = e;
                    if (e === O)
                      if (
                        dependentSchemas &&
                        typeof dependentSchemas == "object" &&
                        !Array.isArray(dependentSchemas)
                      )
                        for (let key in dependentSchemas) {
                          let W = dependentSchemas[key],
                            re = e,
                            meta = i.meta;
                          if (meta)
                            if (
                              !meta(W, {
                                instancePath:
                                  s + "/dependentSchemas/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                                parentData: dependentSchemas,
                                parentDataProperty: key,
                                rootData: c,
                                dynamicAnchors: i,
                              })
                            )
                              ((r = r === null ? meta.errors : r.concat(meta.errors)), (e = r.length));
                            else
                              var props_11 = meta.evaluated.props,
                                items_12 = meta.evaluated.items;
                          else if (
                            !l(W, {
                              instancePath:
                                s + "/dependentSchemas/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                              parentData: dependentSchemas,
                              parentDataProperty: key,
                              rootData: c,
                              dynamicAnchors: i,
                            })
                          )
                            ((r = r === null ? l.errors : r.concat(l.errors)), (e = r.length));
                          else {
                            var props_12 = l.evaluated.props;
                            if (props_11 !== !0 && props_12 !== void 0)
                              if (props_12 === !0) props_11 = !0;
                              else ((props_11 = props_11 || {}), Object.assign(props_11, props_12));
                            var items_13 = l.evaluated.items;
                            if (items_12 !== !0 && items_13 !== void 0)
                              items_12 = items_13 === !0 ? !0 : items_12 > items_13 ? items_12 : items_13;
                          }
                          var U = re === e;
                          if (!U) break;
                        }
                      else
                        return (
                          (l.errors = [
                            {
                              instancePath: s + "/dependentSchemas",
                              schemaPath: "#/properties/dependentSchemas/type",
                              keyword: "type",
                              params: { type: "object" },
                              message: "must be object",
                            },
                          ]),
                          !1
                        );
                    var n = O === e;
                  } else var n = !0;
                  if (n) {
                    if (t.propertyNames !== void 0) {
                      let propertyNames = t.propertyNames,
                        O = e,
                        meta = i.meta;
                      if (meta)
                        if (
                          !meta(propertyNames, {
                            instancePath: s + "/propertyNames",
                            parentData: t,
                            parentDataProperty: "propertyNames",
                            rootData: c,
                            dynamicAnchors: i,
                          })
                        )
                          ((r = r === null ? meta.errors : r.concat(meta.errors)), (e = r.length));
                        else
                          var props_13 = meta.evaluated.props,
                            items_14 = meta.evaluated.items;
                      else if (
                        !l(propertyNames, {
                          instancePath: s + "/propertyNames",
                          parentData: t,
                          parentDataProperty: "propertyNames",
                          rootData: c,
                          dynamicAnchors: i,
                        })
                      )
                        ((r = r === null ? l.errors : r.concat(l.errors)), (e = r.length));
                      else {
                        var props_14 = l.evaluated.props;
                        if (props_13 !== !0 && props_14 !== void 0)
                          if (props_14 === !0) props_13 = !0;
                          else ((props_13 = props_13 || {}), Object.assign(props_13, props_14));
                        var items_15 = l.evaluated.items;
                        if (items_14 !== !0 && items_15 !== void 0)
                          items_14 = items_15 === !0 ? !0 : items_14 > items_15 ? items_14 : items_15;
                      }
                      var n = O === e;
                    } else var n = !0;
                    if (n) {
                      if (t.if !== void 0) {
                        let p = t.if,
                          O = e,
                          meta = i.meta;
                        if (meta)
                          if (
                            !meta(p, {
                              instancePath: s + "/if",
                              parentData: t,
                              parentDataProperty: "if",
                              rootData: c,
                              dynamicAnchors: i,
                            })
                          )
                            ((r = r === null ? meta.errors : r.concat(meta.errors)), (e = r.length));
                          else
                            var props_15 = meta.evaluated.props,
                              items_16 = meta.evaluated.items;
                        else if (
                          !l(p, {
                            instancePath: s + "/if",
                            parentData: t,
                            parentDataProperty: "if",
                            rootData: c,
                            dynamicAnchors: i,
                          })
                        )
                          ((r = r === null ? l.errors : r.concat(l.errors)), (e = r.length));
                        else {
                          var props_16 = l.evaluated.props;
                          if (props_15 !== !0 && props_16 !== void 0)
                            if (props_16 === !0) props_15 = !0;
                            else ((props_15 = props_15 || {}), Object.assign(props_15, props_16));
                          var items_17 = l.evaluated.items;
                          if (items_16 !== !0 && items_17 !== void 0)
                            items_16 = items_17 === !0 ? !0 : items_16 > items_17 ? items_16 : items_17;
                        }
                        var n = O === e;
                      } else var n = !0;
                      if (n) {
                        if (t.then !== void 0) {
                          let p = t.then,
                            O = e,
                            meta = i.meta;
                          if (meta)
                            if (
                              !meta(p, {
                                instancePath: s + "/then",
                                parentData: t,
                                parentDataProperty: "then",
                                rootData: c,
                                dynamicAnchors: i,
                              })
                            )
                              ((r = r === null ? meta.errors : r.concat(meta.errors)), (e = r.length));
                            else
                              var props_17 = meta.evaluated.props,
                                items_18 = meta.evaluated.items;
                          else if (
                            !l(p, {
                              instancePath: s + "/then",
                              parentData: t,
                              parentDataProperty: "then",
                              rootData: c,
                              dynamicAnchors: i,
                            })
                          )
                            ((r = r === null ? l.errors : r.concat(l.errors)), (e = r.length));
                          else {
                            var props_18 = l.evaluated.props;
                            if (props_17 !== !0 && props_18 !== void 0)
                              if (props_18 === !0) props_17 = !0;
                              else ((props_17 = props_17 || {}), Object.assign(props_17, props_18));
                            var items_19 = l.evaluated.items;
                            if (items_18 !== !0 && items_19 !== void 0)
                              items_18 = items_19 === !0 ? !0 : items_18 > items_19 ? items_18 : items_19;
                          }
                          var n = O === e;
                        } else var n = !0;
                        if (n) {
                          if (t.else !== void 0) {
                            let p = t.else,
                              O = e,
                              meta = i.meta;
                            if (meta)
                              if (
                                !meta(p, {
                                  instancePath: s + "/else",
                                  parentData: t,
                                  parentDataProperty: "else",
                                  rootData: c,
                                  dynamicAnchors: i,
                                })
                              )
                                ((r = r === null ? meta.errors : r.concat(meta.errors)), (e = r.length));
                              else
                                var props_19 = meta.evaluated.props,
                                  items_20 = meta.evaluated.items;
                            else if (
                              !l(p, {
                                instancePath: s + "/else",
                                parentData: t,
                                parentDataProperty: "else",
                                rootData: c,
                                dynamicAnchors: i,
                              })
                            )
                              ((r = r === null ? l.errors : r.concat(l.errors)), (e = r.length));
                            else {
                              var props_20 = l.evaluated.props;
                              if (props_19 !== !0 && props_20 !== void 0)
                                if (props_20 === !0) props_19 = !0;
                                else ((props_19 = props_19 || {}), Object.assign(props_19, props_20));
                              var items_21 = l.evaluated.items;
                              if (items_20 !== !0 && items_21 !== void 0)
                                items_20 = items_21 === !0 ? !0 : items_20 > items_21 ? items_20 : items_21;
                            }
                            var n = O === e;
                          } else var n = !0;
                          if (n) {
                            if (t.allOf !== void 0) {
                              let p = e;
                              if (
                                !R(t.allOf, {
                                  instancePath: s + "/allOf",
                                  parentData: t,
                                  parentDataProperty: "allOf",
                                  rootData: c,
                                  dynamicAnchors: i,
                                })
                              )
                                ((r = r === null ? R.errors : r.concat(R.errors)), (e = r.length));
                              var n = p === e;
                            } else var n = !0;
                            if (n) {
                              if (t.anyOf !== void 0) {
                                let p = e;
                                if (
                                  !R(t.anyOf, {
                                    instancePath: s + "/anyOf",
                                    parentData: t,
                                    parentDataProperty: "anyOf",
                                    rootData: c,
                                    dynamicAnchors: i,
                                  })
                                )
                                  ((r = r === null ? R.errors : r.concat(R.errors)), (e = r.length));
                                var n = p === e;
                              } else var n = !0;
                              if (n) {
                                if (t.oneOf !== void 0) {
                                  let p = e;
                                  if (
                                    !R(t.oneOf, {
                                      instancePath: s + "/oneOf",
                                      parentData: t,
                                      parentDataProperty: "oneOf",
                                      rootData: c,
                                      dynamicAnchors: i,
                                    })
                                  )
                                    ((r = r === null ? R.errors : r.concat(R.errors)), (e = r.length));
                                  var n = p === e;
                                } else var n = !0;
                                if (n)
                                  if (t.not !== void 0) {
                                    let not = t.not,
                                      O = e,
                                      meta = i.meta;
                                    if (meta)
                                      if (
                                        !meta(not, {
                                          instancePath: s + "/not",
                                          parentData: t,
                                          parentDataProperty: "not",
                                          rootData: c,
                                          dynamicAnchors: i,
                                        })
                                      )
                                        ((r = r === null ? meta.errors : r.concat(meta.errors)),
                                          (e = r.length));
                                      else
                                        var props_21 = meta.evaluated.props,
                                          items_22 = meta.evaluated.items;
                                    else if (
                                      !l(not, {
                                        instancePath: s + "/not",
                                        parentData: t,
                                        parentDataProperty: "not",
                                        rootData: c,
                                        dynamicAnchors: i,
                                      })
                                    )
                                      ((r = r === null ? l.errors : r.concat(l.errors)), (e = r.length));
                                    else {
                                      var props_22 = l.evaluated.props;
                                      if (props_21 !== !0 && props_22 !== void 0)
                                        if (props_22 === !0) props_21 = !0;
                                        else ((props_21 = props_21 || {}), Object.assign(props_21, props_22));
                                      var items_23 = l.evaluated.items;
                                      if (items_22 !== !0 && items_23 !== void 0)
                                        items_22 =
                                          items_23 === !0 ? !0 : items_22 > items_23 ? items_22 : items_23;
                                    }
                                    var n = O === e;
                                  } else var n = !0;
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
  return ((l.errors = r), e === 0);
}
//@ chunk-n332mrkv.js:20346-20588 layout
l.evaluated = {
  props: {
    prefixItems: !0,
    items: !0,
    contains: !0,
    additionalProperties: !0,
    properties: !0,
    patternProperties: !0,
    dependentSchemas: !0,
    propertyNames: !0,
    if: !0,
    then: !0,
    else: !0,
    allOf: !0,
    anyOf: !0,
    oneOf: !0,
    not: !0,
  },
  dynamicProps: !1,
  dynamicItems: !1,
};
//@ chunk-n332mrkv.js:20588-20986 esm-fingerprint
var Ne = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://json-schema.org/draft/2020-12/meta/unevaluated",
  $vocabulary: { "https://json-schema.org/draft/2020-12/vocab/unevaluated": !0 },
  $dynamicAnchor: "meta",
  title: "Unevaluated applicator vocabulary meta-schema",
  type: ["object", "boolean"],
  properties: { unevaluatedItems: { $dynamicRef: "#meta" }, unevaluatedProperties: { $dynamicRef: "#meta" } },
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
  let r = null,
    e = 0,
    evaluated = F.evaluated;
  if (evaluated.dynamicProps) evaluated.props = void 0;
  if (evaluated.dynamicItems) evaluated.items = void 0;
  if (!(t && typeof t == "object" && !Array.isArray(t)) && typeof t !== "boolean")
    return (
      (F.errors = [
        {
          instancePath: s,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: Ne.type },
          message: "must be object,boolean",
        },
      ]),
      !1
    );
  if (!i.meta) i.meta = F;
  if (e === 0) {
    if (t && typeof t == "object" && !Array.isArray(t)) {
      if (t.unevaluatedItems !== void 0) {
        let unevaluatedItems = t.unevaluatedItems,
          N = e,
          meta = i.meta;
        if (meta)
          if (
            !meta(unevaluatedItems, {
              instancePath: s + "/unevaluatedItems",
              parentData: t,
              parentDataProperty: "unevaluatedItems",
              rootData: c,
              dynamicAnchors: i,
            })
          )
            ((r = r === null ? meta.errors : r.concat(meta.errors)), (e = r.length));
          else
            var props = meta.evaluated.props,
              items = meta.evaluated.items;
        else if (
          !F(unevaluatedItems, {
            instancePath: s + "/unevaluatedItems",
            parentData: t,
            parentDataProperty: "unevaluatedItems",
            rootData: c,
            dynamicAnchors: i,
          })
        )
          ((r = r === null ? F.errors : r.concat(F.errors)), (e = r.length));
        else {
          var props_2 = F.evaluated.props;
          if (props !== !0 && props_2 !== void 0)
            if (props_2 === !0) props = !0;
            else ((props = props || {}), Object.assign(props, props_2));
          var items_2 = F.evaluated.items;
          if (items !== !0 && items_2 !== void 0)
            items = items_2 === !0 ? !0 : items > items_2 ? items : items_2;
        }
        var k = N === e;
      } else var k = !0;
      if (k)
        if (t.unevaluatedProperties !== void 0) {
          let unevaluatedProperties = t.unevaluatedProperties,
            N = e,
            meta = i.meta;
          if (meta)
            if (
              !meta(unevaluatedProperties, {
                instancePath: s + "/unevaluatedProperties",
                parentData: t,
                parentDataProperty: "unevaluatedProperties",
                rootData: c,
                dynamicAnchors: i,
              })
            )
              ((r = r === null ? meta.errors : r.concat(meta.errors)), (e = r.length));
            else
              var props_3 = meta.evaluated.props,
                items_3 = meta.evaluated.items;
          else if (
            !F(unevaluatedProperties, {
              instancePath: s + "/unevaluatedProperties",
              parentData: t,
              parentDataProperty: "unevaluatedProperties",
              rootData: c,
              dynamicAnchors: i,
            })
          )
            ((r = r === null ? F.errors : r.concat(F.errors)), (e = r.length));
          else {
            var props_4 = F.evaluated.props;
            if (props_3 !== !0 && props_4 !== void 0)
              if (props_4 === !0) props_3 = !0;
              else ((props_3 = props_3 || {}), Object.assign(props_3, props_4));
            var items_4 = F.evaluated.items;
            if (items_3 !== !0 && items_4 !== void 0)
              items_3 = items_4 === !0 ? !0 : items_3 > items_4 ? items_3 : items_4;
          }
          var k = N === e;
        } else var k = !0;
    }
  }
  return ((F.errors = r), e === 0);
}
//@ chunk-n332mrkv.js:22855-22954 esm-layout
F.evaluated = {
  props: { unevaluatedItems: !0, unevaluatedProperties: !0 },
  dynamicProps: !1,
  dynamicItems: !1,
};
//@ chunk-n332mrkv.js:22954-24545 esm-fingerprint
var xe = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://json-schema.org/draft/2020-12/meta/validation",
    $vocabulary: { "https://json-schema.org/draft/2020-12/vocab/validation": !0 },
    $dynamicAnchor: "meta",
    title: "Validation vocabulary meta-schema",
    type: ["object", "boolean"],
    properties: {
      type: {
        anyOf: [
          { $ref: "#/$defs/simpleTypes" },
          { type: "array", items: { $ref: "#/$defs/simpleTypes" }, minItems: 1, uniqueItems: !0 },
        ],
      },
      const: !0,
      enum: { type: "array", items: !0 },
      multipleOf: { type: "number", exclusiveMinimum: 0 },
      maximum: { type: "number" },
      exclusiveMaximum: { type: "number" },
      minimum: { type: "number" },
      exclusiveMinimum: { type: "number" },
      maxLength: { $ref: "#/$defs/nonNegativeInteger" },
      minLength: { $ref: "#/$defs/nonNegativeIntegerDefault0" },
      pattern: { type: "string", format: "regex" },
      maxItems: { $ref: "#/$defs/nonNegativeInteger" },
      minItems: { $ref: "#/$defs/nonNegativeIntegerDefault0" },
      uniqueItems: { type: "boolean", default: !1 },
      maxContains: { $ref: "#/$defs/nonNegativeInteger" },
      minContains: { $ref: "#/$defs/nonNegativeInteger", default: 1 },
      maxProperties: { $ref: "#/$defs/nonNegativeInteger" },
      minProperties: { $ref: "#/$defs/nonNegativeIntegerDefault0" },
      required: { $ref: "#/$defs/stringArray" },
      dependentRequired: { type: "object", additionalProperties: { $ref: "#/$defs/stringArray" } },
    },
    $defs: {
      nonNegativeInteger: { type: "integer", minimum: 0 },
      nonNegativeIntegerDefault0: { $ref: "#/$defs/nonNegativeInteger", default: 0 },
      simpleTypes: { enum: ["array", "boolean", "integer", "null", "number", "object", "string"] },
      stringArray: { type: "array", items: { type: "string" }, uniqueItems: !0, default: [] },
    },
  },
  _e = { enum: ["array", "boolean", "integer", "null", "number", "object", "string"] };
//@ chunk-n332mrkv.js:24545-24566 esm-layout
var Oe = Lkn().default;
//@ chunk-n332mrkv.js:36244-36750 esm-fingerprint
var De = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://json-schema.org/draft/2020-12/meta/meta-data",
  $vocabulary: { "https://json-schema.org/draft/2020-12/vocab/meta-data": !0 },
  $dynamicAnchor: "meta",
  title: "Meta-data vocabulary meta-schema",
  type: ["object", "boolean"],
  properties: {
    title: { type: "string" },
    description: { type: "string" },
    default: !0,
    deprecated: { type: "boolean", default: !1 },
    readOnly: { type: "boolean", default: !1 },
    writeOnly: { type: "boolean", default: !1 },
    examples: { type: "array", items: !0 },
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
  let r = null,
    e = 0,
    evaluated = L.evaluated;
  if (evaluated.dynamicProps) evaluated.props = void 0;
  if (evaluated.dynamicItems) evaluated.items = void 0;
  if (!(t && typeof t == "object" && !Array.isArray(t)) && typeof t !== "boolean")
    return (
      (L.errors = [
        {
          instancePath: s,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: De.type },
          message: "must be object,boolean",
        },
      ]),
      !1
    );
  if (!i.meta) i.meta = L;
  if (e === 0) {
    if (t && typeof t == "object" && !Array.isArray(t)) {
      if (t.title !== void 0) {
        let d = e;
        if (typeof t.title !== "string")
          return (
            (L.errors = [
              {
                instancePath: s + "/title",
                schemaPath: "#/properties/title/type",
                keyword: "type",
                params: { type: "string" },
                message: "must be string",
              },
            ]),
            !1
          );
        var n = d === e;
      } else var n = !0;
      if (n) {
        if (t.description !== void 0) {
          let d = e;
          if (typeof t.description !== "string")
            return (
              (L.errors = [
                {
                  instancePath: s + "/description",
                  schemaPath: "#/properties/description/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                },
              ]),
              !1
            );
          var n = d === e;
        } else var n = !0;
        if (n) {
          if (t.deprecated !== void 0) {
            let d = e;
            if (typeof t.deprecated !== "boolean")
              return (
                (L.errors = [
                  {
                    instancePath: s + "/deprecated",
                    schemaPath: "#/properties/deprecated/type",
                    keyword: "type",
                    params: { type: "boolean" },
                    message: "must be boolean",
                  },
                ]),
                !1
              );
            var n = d === e;
          } else var n = !0;
          if (n) {
            if (t.readOnly !== void 0) {
              let d = e;
              if (typeof t.readOnly !== "boolean")
                return (
                  (L.errors = [
                    {
                      instancePath: s + "/readOnly",
                      schemaPath: "#/properties/readOnly/type",
                      keyword: "type",
                      params: { type: "boolean" },
                      message: "must be boolean",
                    },
                  ]),
                  !1
                );
              var n = d === e;
            } else var n = !0;
            if (n) {
              if (t.writeOnly !== void 0) {
                let d = e;
                if (typeof t.writeOnly !== "boolean")
                  return (
                    (L.errors = [
                      {
                        instancePath: s + "/writeOnly",
                        schemaPath: "#/properties/writeOnly/type",
                        keyword: "type",
                        params: { type: "boolean" },
                        message: "must be boolean",
                      },
                    ]),
                    !1
                  );
                var n = d === e;
              } else var n = !0;
              if (n)
                if (t.examples !== void 0) {
                  let d = e;
                  if (e === d) {
                    if (!Array.isArray(t.examples))
                      return (
                        (L.errors = [
                          {
                            instancePath: s + "/examples",
                            schemaPath: "#/properties/examples/type",
                            keyword: "type",
                            params: { type: "array" },
                            message: "must be array",
                          },
                        ]),
                        !1
                      );
                  }
                  var n = d === e;
                } else var n = !0;
            }
          }
        }
      }
    }
  }
  return ((L.errors = r), e === 0);
}
//@ chunk-n332mrkv.js:38764-38904 esm-layout
L.evaluated = {
  props: {
    title: !0,
    description: !0,
    default: !0,
    deprecated: !0,
    readOnly: !0,
    writeOnly: !0,
    examples: !0,
  },
  dynamicProps: !1,
  dynamicItems: !1,
};
//@ chunk-n332mrkv.js:38904-39261 esm-fingerprint
var Re = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://json-schema.org/draft/2020-12/meta/format-annotation",
  $vocabulary: { "https://json-schema.org/draft/2020-12/vocab/format-annotation": !0 },
  $dynamicAnchor: "meta",
  title: "Format vocabulary meta-schema for annotation results",
  type: ["object", "boolean"],
  properties: { format: { type: "string" } },
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
  let r = null,
    e = 0,
    evaluated = X.evaluated;
  if (evaluated.dynamicProps) evaluated.props = void 0;
  if (evaluated.dynamicItems) evaluated.items = void 0;
  if (!(t && typeof t == "object" && !Array.isArray(t)) && typeof t !== "boolean")
    return (
      (X.errors = [
        {
          instancePath: s,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: Re.type },
          message: "must be object,boolean",
        },
      ]),
      !1
    );
  if (!i.meta) i.meta = X;
  if (e === 0) {
    if (t && typeof t == "object" && !Array.isArray(t)) {
      if (t.format !== void 0) {
        if (typeof t.format !== "string")
          return (
            (X.errors = [
              {
                instancePath: s + "/format",
                schemaPath: "#/properties/format/type",
                keyword: "type",
                params: { type: "string" },
                message: "must be string",
              },
            ]),
            !1
          );
      }
    }
  }
  return ((X.errors = r), e === 0);
}
//@ chunk-n332mrkv.js:39959-40023 esm-layout
X.evaluated = { props: { format: !0 }, dynamicProps: !1, dynamicItems: !1 };
//@ chunk-n332mrkv.js:40023-40416 esm-fingerprint
var Ae = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  $id: "https://json-schema.org/draft/2020-12/meta/content",
  $vocabulary: { "https://json-schema.org/draft/2020-12/vocab/content": !0 },
  $dynamicAnchor: "meta",
  title: "Content vocabulary meta-schema",
  type: ["object", "boolean"],
  properties: {
    contentEncoding: { type: "string" },
    contentMediaType: { type: "string" },
    contentSchema: { $dynamicRef: "#meta" },
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
  let r = null,
    e = 0,
    evaluated = C.evaluated;
  if (evaluated.dynamicProps) evaluated.props = void 0;
  if (evaluated.dynamicItems) evaluated.items = void 0;
  if (!(t && typeof t == "object" && !Array.isArray(t)) && typeof t !== "boolean")
    return (
      (C.errors = [
        {
          instancePath: s,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: Ae.type },
          message: "must be object,boolean",
        },
      ]),
      !1
    );
  if (!i.meta) i.meta = C;
  if (e === 0) {
    if (t && typeof t == "object" && !Array.isArray(t)) {
      if (t.contentEncoding !== void 0) {
        let I = e;
        if (typeof t.contentEncoding !== "string")
          return (
            (C.errors = [
              {
                instancePath: s + "/contentEncoding",
                schemaPath: "#/properties/contentEncoding/type",
                keyword: "type",
                params: { type: "string" },
                message: "must be string",
              },
            ]),
            !1
          );
        var n = I === e;
      } else var n = !0;
      if (n) {
        if (t.contentMediaType !== void 0) {
          let I = e;
          if (typeof t.contentMediaType !== "string")
            return (
              (C.errors = [
                {
                  instancePath: s + "/contentMediaType",
                  schemaPath: "#/properties/contentMediaType/type",
                  keyword: "type",
                  params: { type: "string" },
                  message: "must be string",
                },
              ]),
              !1
            );
          var n = I === e;
        } else var n = !0;
        if (n)
          if (t.contentSchema !== void 0) {
            let contentSchema = t.contentSchema,
              a = e,
              meta = i.meta;
            if (meta)
              if (
                !meta(contentSchema, {
                  instancePath: s + "/contentSchema",
                  parentData: t,
                  parentDataProperty: "contentSchema",
                  rootData: c,
                  dynamicAnchors: i,
                })
              )
                ((r = r === null ? meta.errors : r.concat(meta.errors)), (e = r.length));
              else
                var props = meta.evaluated.props,
                  items = meta.evaluated.items;
            else if (
              !C(contentSchema, {
                instancePath: s + "/contentSchema",
                parentData: t,
                parentDataProperty: "contentSchema",
                rootData: c,
                dynamicAnchors: i,
              })
            )
              ((r = r === null ? C.errors : r.concat(C.errors)), (e = r.length));
            else {
              var props_2 = C.evaluated.props;
              if (props !== !0 && props_2 !== void 0)
                if (props_2 === !0) props = !0;
                else ((props = props || {}), Object.assign(props, props_2));
              var items_2 = C.evaluated.items;
              if (items !== !0 && items_2 !== void 0)
                items = items_2 === !0 ? !0 : items > items_2 ? items : items_2;
            }
            var n = a === e;
          } else var n = !0;
      }
    }
  }
  return ((C.errors = r), e === 0);
}
//@ chunk-n332mrkv.js:42121-42231 affinity
C.evaluated = {
  props: { contentEncoding: !0, contentMediaType: !0, contentSchema: !0 },
  dynamicProps: !1,
  dynamicItems: !1,
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
  let r = null,
    e = 0,
    evaluated = D.evaluated;
  if (evaluated.dynamicProps) evaluated.props = void 0;
  if (evaluated.dynamicItems) evaluated.items = void 0;
  if (!(t && typeof t == "object" && !Array.isArray(t)) && typeof t !== "boolean")
    return (
      (D.errors = [
        {
          instancePath: s,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: je.type },
          message: "must be object,boolean",
        },
      ]),
      !1
    );
  if (!i.meta) i.meta = D;
  let n = e;
  if (!x(t, { instancePath: s, parentData: z, parentDataProperty: E, rootData: c, dynamicAnchors: i }))
    ((r = r === null ? x.errors : r.concat(x.errors)), (e = r.length));
  var d = n === e;
  if (d) {
    let P = e;
    if (!l(t, { instancePath: s, parentData: z, parentDataProperty: E, rootData: c, dynamicAnchors: i }))
      ((r = r === null ? l.errors : r.concat(l.errors)), (e = r.length));
    var d = P === e;
    if (d) {
      let M = e;
      if (!F(t, { instancePath: s, parentData: z, parentDataProperty: E, rootData: c, dynamicAnchors: i }))
        ((r = r === null ? F.errors : r.concat(F.errors)), (e = r.length));
      var d = M === e;
      if (d) {
        let T = e;
        if (!b(t, { instancePath: s, parentData: z, parentDataProperty: E, rootData: c, dynamicAnchors: i }))
          ((r = r === null ? b.errors : r.concat(b.errors)), (e = r.length));
        var d = T === e;
        if (d) {
          let Q = e;
          if (
            !L(t, { instancePath: s, parentData: z, parentDataProperty: E, rootData: c, dynamicAnchors: i })
          )
            ((r = r === null ? L.errors : r.concat(L.errors)), (e = r.length));
          var d = Q === e;
          if (d) {
            let ae = e;
            if (
              !X(t, { instancePath: s, parentData: z, parentDataProperty: E, rootData: c, dynamicAnchors: i })
            )
              ((r = r === null ? X.errors : r.concat(X.errors)), (e = r.length));
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
              )
                ((r = r === null ? C.errors : r.concat(C.errors)), (e = r.length));
              var d = Y === e;
            }
          }
        }
      }
    }
  }
  if (e === 0) {
    if (t && typeof t == "object" && !Array.isArray(t)) {
      if (t.definitions !== void 0) {
        let definitions = t.definitions,
          S = e;
        if (e === S)
          if (definitions && typeof definitions == "object" && !Array.isArray(definitions))
            for (let key in definitions) {
              let Z = definitions[key],
                T = e,
                meta = i.meta;
              if (meta)
                if (
                  !meta(Z, {
                    instancePath: s + "/definitions/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                    parentData: definitions,
                    parentDataProperty: key,
                    rootData: c,
                    dynamicAnchors: i,
                  })
                )
                  ((r = r === null ? meta.errors : r.concat(meta.errors)), (e = r.length));
                else
                  var props = meta.evaluated.props,
                    items = meta.evaluated.items;
              else if (
                !D(Z, {
                  instancePath: s + "/definitions/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                  parentData: definitions,
                  parentDataProperty: key,
                  rootData: c,
                  dynamicAnchors: i,
                })
              )
                ((r = r === null ? D.errors : r.concat(D.errors)), (e = r.length));
              else {
                var props_2 = D.evaluated.props;
                if (props !== !0 && props_2 !== void 0)
                  if (props_2 === !0) props = !0;
                  else ((props = props || {}), Object.assign(props, props_2));
                var items_2 = D.evaluated.items;
                if (items !== !0 && items_2 !== void 0)
                  items = items_2 === !0 ? !0 : items > items_2 ? items : items_2;
              }
              var a = T === e;
              if (!a) break;
            }
          else
            return (
              (D.errors = [
                {
                  instancePath: s + "/definitions",
                  schemaPath: "#/properties/definitions/type",
                  keyword: "type",
                  params: { type: "object" },
                  message: "must be object",
                },
              ]),
              !1
            );
        var f = S === e;
      } else var f = !0;
      if (f) {
        if (t.dependencies !== void 0) {
          let dependencies = t.dependencies,
            S = e;
          if (e === S)
            if (dependencies && typeof dependencies == "object" && !Array.isArray(dependencies))
              for (let key in dependencies) {
                let T = dependencies[key],
                  V = e,
                  Q = e,
                  K = !1,
                  ae = e,
                  meta = i.meta;
                if (meta)
                  if (
                    !meta(T, {
                      instancePath: s + "/dependencies/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                      parentData: dependencies,
                      parentDataProperty: key,
                      rootData: c,
                      dynamicAnchors: i,
                    })
                  )
                    ((r = r === null ? meta.errors : r.concat(meta.errors)), (e = r.length));
                  else
                    var props_3 = meta.evaluated.props,
                      items_3 = meta.evaluated.items;
                else if (
                  !D(T, {
                    instancePath: s + "/dependencies/" + key.replace(/~/g, "~0").replace(/\//g, "~1"),
                    parentData: dependencies,
                    parentDataProperty: key,
                    rootData: c,
                    dynamicAnchors: i,
                  })
                )
                  ((r = r === null ? D.errors : r.concat(D.errors)), (e = r.length));
                else {
                  var props_4 = D.evaluated.props;
                  if (props_3 !== !0 && props_4 !== void 0)
                    if (props_4 === !0) props_3 = !0;
                    else ((props_3 = props_3 || {}), Object.assign(props_3, props_4));
                  var items_4 = D.evaluated.items;
                  if (items_3 !== !0 && items_4 !== void 0)
                    items_3 = items_4 === !0 ? !0 : items_3 > items_4 ? items_3 : items_4;
                }
                var j = ae === e;
                K = K || j;
                let Y = e;
                if (e === e)
                  if (Array.isArray(T)) {
                    var _ = !0;
                    let G = T.length;
                    for (let U = 0; U < G; U++) {
                      let H = e;
                      if (typeof T[U] !== "string") {
                        let J = {
                          instancePath:
                            s + "/dependencies/" + key.replace(/~/g, "~0").replace(/\//g, "~1") + "/" + U,
                          schemaPath: "meta/validation#/$defs/stringArray/items/type",
                          keyword: "type",
                          params: { type: "string" },
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
                      let U = T.length,
                        H;
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
                              params: { i: U, j: H },
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
                      params: { type: "array" },
                      message: "must be array",
                    };
                    if (r === null) r = [G];
                    else r.push(G);
                    e++;
                  }
                var j = Y === e;
                if (((K = K || j), j)) {
                  if (items_3 !== !0) items_3 = !0;
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
                  return (e++, (D.errors = r), !1);
                } else if (((e = Q), r !== null))
                  if (Q) r.length = Q;
                  else r = null;
                var g = V === e;
                if (!g) break;
              }
            else
              return (
                (D.errors = [
                  {
                    instancePath: s + "/dependencies",
                    schemaPath: "#/properties/dependencies/type",
                    keyword: "type",
                    params: { type: "object" },
                    message: "must be object",
                  },
                ]),
                !1
              );
          var f = S === e;
        } else var f = !0;
        if (f) {
          if (t.$recursiveAnchor !== void 0) {
            let $recursiveAnchor = t.$recursiveAnchor,
              S = e;
            if (e === e)
              if (typeof $recursiveAnchor === "string") {
                if (!regExp_2.test($recursiveAnchor))
                  return (
                    (D.errors = [
                      {
                        instancePath: s + "/$recursiveAnchor",
                        schemaPath: "meta/core#/$defs/anchorString/pattern",
                        keyword: "pattern",
                        params: { pattern: "^[A-Za-z_][-A-Za-z0-9._]*$" },
                        message: 'must match pattern "^[A-Za-z_][-A-Za-z0-9._]*$"',
                      },
                    ]),
                    !1
                  );
              } else
                return (
                  (D.errors = [
                    {
                      instancePath: s + "/$recursiveAnchor",
                      schemaPath: "meta/core#/$defs/anchorString/type",
                      keyword: "type",
                      params: { type: "string" },
                      message: "must be string",
                    },
                  ]),
                  !1
                );
            var f = S === e;
          } else var f = !0;
          if (f)
            if (t.$recursiveRef !== void 0) {
              let P = e,
                S = e;
              if (e === S) {
                if (e === S) {
                  if (typeof t.$recursiveRef !== "string")
                    return (
                      (D.errors = [
                        {
                          instancePath: s + "/$recursiveRef",
                          schemaPath: "meta/core#/$defs/uriReferenceString/type",
                          keyword: "type",
                          params: { type: "string" },
                          message: "must be string",
                        },
                      ]),
                      !1
                    );
                }
              }
              var f = P === e;
            } else var f = !0;
        }
      }
    }
  }
  return ((D.errors = r), e === 0);
}
//@ chunk-n332mrkv.js:48153-49040 affinity
D.evaluated = {
  props: {
    definitions: !0,
    dependencies: !0,
    $recursiveAnchor: !0,
    $recursiveRef: !0,
    contentEncoding: !0,
    contentMediaType: !0,
    contentSchema: !0,
    format: !0,
    title: !0,
    description: !0,
    default: !0,
    deprecated: !0,
    readOnly: !0,
    writeOnly: !0,
    examples: !0,
    type: !0,
    const: !0,
    enum: !0,
    multipleOf: !0,
    maximum: !0,
    exclusiveMaximum: !0,
    minimum: !0,
    exclusiveMinimum: !0,
    maxLength: !0,
    minLength: !0,
    pattern: !0,
    maxItems: !0,
    minItems: !0,
    uniqueItems: !0,
    maxContains: !0,
    minContains: !0,
    maxProperties: !0,
    minProperties: !0,
    required: !0,
    dependentRequired: !0,
    unevaluatedItems: !0,
    unevaluatedProperties: !0,
    prefixItems: !0,
    items: !0,
    contains: !0,
    additionalProperties: !0,
    properties: !0,
    patternProperties: !0,
    dependentSchemas: !0,
    propertyNames: !0,
    if: !0,
    then: !0,
    else: !0,
    allOf: !0,
    anyOf: !0,
    oneOf: !0,
    not: !0,
    $id: !0,
    $schema: !0,
    $ref: !0,
    $anchor: !0,
    $dynamicRef: !0,
    $dynamicAnchor: !0,
    $vocabulary: !0,
    $comment: !0,
    $defs: !0,
  },
  dynamicProps: !1,
  dynamicItems: !1,
};
//@ chunk-r1g76qsy.js:255842-255955 esm-fingerprint
function Cd() {
  let e = new $d.Ajv2020({ strict: !1, validateFormats: !0, validateSchema: !1, allErrors: !0 });
  return (Td(e), e);
}
//@ chunk-r1g76qsy.js:255955-256668 esm-fingerprint
var Udn = class {
    _ajv;
    _userAjv;
    constructor(e) {
      ((this._userAjv = e !== void 0), (this._ajv = e));
    }
    get ajv() {
      return (this._ajv ??= Cd());
    }
    getValidator(e) {
      if (
        !this._userAjv &&
        "$schema" in e &&
        typeof e.$schema === "string" &&
        !Pd.has(e.$schema.replace(/#$/, ""))
      ) {
        let sliced = e.$schema.slice(0, 200);
        throw Error(
          `JSON Schema declares an unsupported dialect ("$schema": "${sliced}"). The default validator supports JSON Schema 2020-12 only; pass a pre-configured Ajv instance to AjvJsonSchemaValidator(ajv) to validate other dialects.`,
        );
      }
      let ajv = this.ajv,
        r =
          "$id" in e && typeof e.$id === "string" ? (ajv.getSchema(e.$id) ?? ajv.compile(e)) : ajv.compile(e);
      return (s) =>
        r(s)
          ? { valid: !0, data: s, errorMessage: void 0 }
          : { valid: !1, data: void 0, errorMessage: ajv.errorsText(r.errors) };
    }
  },
  Ajv = wd.Ajv;

export { Udn, xe, _e, Oe };

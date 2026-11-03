/**
 * @modelcontextprotocol/client/dist/cfWorkerProvider-l7BFVI5n.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/client@2.0.0
 * pieces: chunk-dcmhvw5a.js (1), chunk-n332mrkv.js (2)
 * attribution: esm-fingerprint 2, esm-layout 1
 */
import { xe, _e, Oe } from "./ajvProvider-BIwGVY6G.mjs";

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
  let r = null,
    e = 0,
    evaluated = b.evaluated;
  if (evaluated.dynamicProps) evaluated.props = void 0;
  if (evaluated.dynamicItems) evaluated.items = void 0;
  if (!(t && typeof t == "object" && !Array.isArray(t)) && typeof t !== "boolean")
    return (
      (b.errors = [
        {
          instancePath: s,
          schemaPath: "#/type",
          keyword: "type",
          params: { type: xe.type },
          message: "must be object,boolean",
        },
      ]),
      !1
    );
  if (!i.meta) i.meta = b;
  if (e === 0) {
    if (t && typeof t == "object" && !Array.isArray(t)) {
      if (t.type !== void 0) {
        let a = t.type,
          f = e,
          u = e,
          m = !1,
          N = e;
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
            params: { allowedValues: _e.enum },
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
          if (Array.isArray(a))
            if (a.length < 1) {
              let _ = {
                instancePath: s + "/type",
                schemaPath: "#/properties/type/anyOf/1/minItems",
                keyword: "minItems",
                params: { limit: 1 },
                message: "must NOT have fewer than 1 items",
              };
              if (r === null) r = [_];
              else r.push(_);
              e++;
            } else {
              var n = !0;
              let _ = a.length;
              for (let j = 0; j < _; j++) {
                let g = a[j],
                  P = e;
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
                    params: { allowedValues: _e.enum },
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
                let j = a.length,
                  g;
                if (j > 1) {
                  e: for (; j--;)
                    for (g = j; g--;)
                      if (Oe(a[j], a[g])) {
                        let P = {
                          instancePath: s + "/type",
                          schemaPath: "#/properties/type/anyOf/1/uniqueItems",
                          keyword: "uniqueItems",
                          params: { i: j, j: g },
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
          else {
            let _ = {
              instancePath: s + "/type",
              schemaPath: "#/properties/type/anyOf/1/type",
              keyword: "type",
              params: { type: "array" },
              message: "must be array",
            };
            if (r === null) r = [_];
            else r.push(_);
            e++;
          }
        var d = v === e;
        if (((m = m || d), !m)) {
          let _ = {
            instancePath: s + "/type",
            schemaPath: "#/properties/type/anyOf",
            keyword: "anyOf",
            params: {},
            message: "must match a schema in anyOf",
          };
          if (r === null) r = [_];
          else r.push(_);
          return (e++, (b.errors = r), !1);
        } else if (((e = u), r !== null))
          if (u) r.length = u;
          else r = null;
        var o = f === e;
      } else var o = !0;
      if (o) {
        if (t.enum !== void 0) {
          let a = e;
          if (e === a) {
            if (!Array.isArray(t.enum))
              return (
                (b.errors = [
                  {
                    instancePath: s + "/enum",
                    schemaPath: "#/properties/enum/type",
                    keyword: "type",
                    params: { type: "array" },
                    message: "must be array",
                  },
                ]),
                !1
              );
          }
          var o = a === e;
        } else var o = !0;
        if (o) {
          if (t.multipleOf !== void 0) {
            let multipleOf = t.multipleOf,
              f = e;
            if (e === f)
              if (typeof multipleOf == "number" && isFinite(multipleOf)) {
                if (multipleOf <= 0 || isNaN(multipleOf))
                  return (
                    (b.errors = [
                      {
                        instancePath: s + "/multipleOf",
                        schemaPath: "#/properties/multipleOf/exclusiveMinimum",
                        keyword: "exclusiveMinimum",
                        params: { comparison: ">", limit: 0 },
                        message: "must be > 0",
                      },
                    ]),
                    !1
                  );
              } else
                return (
                  (b.errors = [
                    {
                      instancePath: s + "/multipleOf",
                      schemaPath: "#/properties/multipleOf/type",
                      keyword: "type",
                      params: { type: "number" },
                      message: "must be number",
                    },
                  ]),
                  !1
                );
            var o = f === e;
          } else var o = !0;
          if (o) {
            if (t.maximum !== void 0) {
              let maximum = t.maximum,
                f = e;
              if (!(typeof maximum == "number" && isFinite(maximum)))
                return (
                  (b.errors = [
                    {
                      instancePath: s + "/maximum",
                      schemaPath: "#/properties/maximum/type",
                      keyword: "type",
                      params: { type: "number" },
                      message: "must be number",
                    },
                  ]),
                  !1
                );
              var o = f === e;
            } else var o = !0;
            if (o) {
              if (t.exclusiveMaximum !== void 0) {
                let exclusiveMaximum = t.exclusiveMaximum,
                  f = e;
                if (!(typeof exclusiveMaximum == "number" && isFinite(exclusiveMaximum)))
                  return (
                    (b.errors = [
                      {
                        instancePath: s + "/exclusiveMaximum",
                        schemaPath: "#/properties/exclusiveMaximum/type",
                        keyword: "type",
                        params: { type: "number" },
                        message: "must be number",
                      },
                    ]),
                    !1
                  );
                var o = f === e;
              } else var o = !0;
              if (o) {
                if (t.minimum !== void 0) {
                  let minimum = t.minimum,
                    f = e;
                  if (!(typeof minimum == "number" && isFinite(minimum)))
                    return (
                      (b.errors = [
                        {
                          instancePath: s + "/minimum",
                          schemaPath: "#/properties/minimum/type",
                          keyword: "type",
                          params: { type: "number" },
                          message: "must be number",
                        },
                      ]),
                      !1
                    );
                  var o = f === e;
                } else var o = !0;
                if (o) {
                  if (t.exclusiveMinimum !== void 0) {
                    let exclusiveMinimum = t.exclusiveMinimum,
                      f = e;
                    if (!(typeof exclusiveMinimum == "number" && isFinite(exclusiveMinimum)))
                      return (
                        (b.errors = [
                          {
                            instancePath: s + "/exclusiveMinimum",
                            schemaPath: "#/properties/exclusiveMinimum/type",
                            keyword: "type",
                            params: { type: "number" },
                            message: "must be number",
                          },
                        ]),
                        !1
                      );
                    var o = f === e;
                  } else var o = !0;
                  if (o) {
                    if (t.maxLength !== void 0) {
                      let maxLength = t.maxLength,
                        f = e,
                        u = e;
                      if (!(
                        typeof maxLength == "number" &&
                        !(maxLength % 1) &&
                        !isNaN(maxLength) &&
                        isFinite(maxLength)
                      ))
                        return (
                          (b.errors = [
                            {
                              instancePath: s + "/maxLength",
                              schemaPath: "#/$defs/nonNegativeInteger/type",
                              keyword: "type",
                              params: { type: "integer" },
                              message: "must be integer",
                            },
                          ]),
                          !1
                        );
                      if (e === u) {
                        if (typeof maxLength == "number" && isFinite(maxLength)) {
                          if (maxLength < 0 || isNaN(maxLength))
                            return (
                              (b.errors = [
                                {
                                  instancePath: s + "/maxLength",
                                  schemaPath: "#/$defs/nonNegativeInteger/minimum",
                                  keyword: "minimum",
                                  params: { comparison: ">=", limit: 0 },
                                  message: "must be >= 0",
                                },
                              ]),
                              !1
                            );
                        }
                      }
                      var o = f === e;
                    } else var o = !0;
                    if (o) {
                      if (t.minLength !== void 0) {
                        let minLength = t.minLength,
                          f = e,
                          u = e;
                        if (!(
                          typeof minLength == "number" &&
                          !(minLength % 1) &&
                          !isNaN(minLength) &&
                          isFinite(minLength)
                        ))
                          return (
                            (b.errors = [
                              {
                                instancePath: s + "/minLength",
                                schemaPath: "#/$defs/nonNegativeIntegerDefault0/type",
                                keyword: "type",
                                params: { type: "integer" },
                                message: "must be integer",
                              },
                            ]),
                            !1
                          );
                        if (e === u) {
                          if (typeof minLength == "number" && isFinite(minLength)) {
                            if (minLength < 0 || isNaN(minLength))
                              return (
                                (b.errors = [
                                  {
                                    instancePath: s + "/minLength",
                                    schemaPath: "#/$defs/nonNegativeIntegerDefault0/minimum",
                                    keyword: "minimum",
                                    params: { comparison: ">=", limit: 0 },
                                    message: "must be >= 0",
                                  },
                                ]),
                                !1
                              );
                          }
                        }
                        var o = f === e;
                      } else var o = !0;
                      if (o) {
                        if (t.pattern !== void 0) {
                          let a = e;
                          if (e === a) {
                            if (e === a) {
                              if (typeof t.pattern !== "string")
                                return (
                                  (b.errors = [
                                    {
                                      instancePath: s + "/pattern",
                                      schemaPath: "#/properties/pattern/type",
                                      keyword: "type",
                                      params: { type: "string" },
                                      message: "must be string",
                                    },
                                  ]),
                                  !1
                                );
                            }
                          }
                          var o = a === e;
                        } else var o = !0;
                        if (o) {
                          if (t.maxItems !== void 0) {
                            let maxItems = t.maxItems,
                              f = e,
                              u = e;
                            if (!(
                              typeof maxItems == "number" &&
                              !(maxItems % 1) &&
                              !isNaN(maxItems) &&
                              isFinite(maxItems)
                            ))
                              return (
                                (b.errors = [
                                  {
                                    instancePath: s + "/maxItems",
                                    schemaPath: "#/$defs/nonNegativeInteger/type",
                                    keyword: "type",
                                    params: { type: "integer" },
                                    message: "must be integer",
                                  },
                                ]),
                                !1
                              );
                            if (e === u) {
                              if (typeof maxItems == "number" && isFinite(maxItems)) {
                                if (maxItems < 0 || isNaN(maxItems))
                                  return (
                                    (b.errors = [
                                      {
                                        instancePath: s + "/maxItems",
                                        schemaPath: "#/$defs/nonNegativeInteger/minimum",
                                        keyword: "minimum",
                                        params: { comparison: ">=", limit: 0 },
                                        message: "must be >= 0",
                                      },
                                    ]),
                                    !1
                                  );
                              }
                            }
                            var o = f === e;
                          } else var o = !0;
                          if (o) {
                            if (t.minItems !== void 0) {
                              let minItems = t.minItems,
                                f = e,
                                u = e;
                              if (!(
                                typeof minItems == "number" &&
                                !(minItems % 1) &&
                                !isNaN(minItems) &&
                                isFinite(minItems)
                              ))
                                return (
                                  (b.errors = [
                                    {
                                      instancePath: s + "/minItems",
                                      schemaPath: "#/$defs/nonNegativeIntegerDefault0/type",
                                      keyword: "type",
                                      params: { type: "integer" },
                                      message: "must be integer",
                                    },
                                  ]),
                                  !1
                                );
                              if (e === u) {
                                if (typeof minItems == "number" && isFinite(minItems)) {
                                  if (minItems < 0 || isNaN(minItems))
                                    return (
                                      (b.errors = [
                                        {
                                          instancePath: s + "/minItems",
                                          schemaPath: "#/$defs/nonNegativeIntegerDefault0/minimum",
                                          keyword: "minimum",
                                          params: { comparison: ">=", limit: 0 },
                                          message: "must be >= 0",
                                        },
                                      ]),
                                      !1
                                    );
                                }
                              }
                              var o = f === e;
                            } else var o = !0;
                            if (o) {
                              if (t.uniqueItems !== void 0) {
                                let a = e;
                                if (typeof t.uniqueItems !== "boolean")
                                  return (
                                    (b.errors = [
                                      {
                                        instancePath: s + "/uniqueItems",
                                        schemaPath: "#/properties/uniqueItems/type",
                                        keyword: "type",
                                        params: { type: "boolean" },
                                        message: "must be boolean",
                                      },
                                    ]),
                                    !1
                                  );
                                var o = a === e;
                              } else var o = !0;
                              if (o) {
                                if (t.maxContains !== void 0) {
                                  let maxContains = t.maxContains,
                                    f = e,
                                    u = e;
                                  if (!(
                                    typeof maxContains == "number" &&
                                    !(maxContains % 1) &&
                                    !isNaN(maxContains) &&
                                    isFinite(maxContains)
                                  ))
                                    return (
                                      (b.errors = [
                                        {
                                          instancePath: s + "/maxContains",
                                          schemaPath: "#/$defs/nonNegativeInteger/type",
                                          keyword: "type",
                                          params: { type: "integer" },
                                          message: "must be integer",
                                        },
                                      ]),
                                      !1
                                    );
                                  if (e === u) {
                                    if (typeof maxContains == "number" && isFinite(maxContains)) {
                                      if (maxContains < 0 || isNaN(maxContains))
                                        return (
                                          (b.errors = [
                                            {
                                              instancePath: s + "/maxContains",
                                              schemaPath: "#/$defs/nonNegativeInteger/minimum",
                                              keyword: "minimum",
                                              params: { comparison: ">=", limit: 0 },
                                              message: "must be >= 0",
                                            },
                                          ]),
                                          !1
                                        );
                                    }
                                  }
                                  var o = f === e;
                                } else var o = !0;
                                if (o) {
                                  if (t.minContains !== void 0) {
                                    let minContains = t.minContains,
                                      f = e,
                                      u = e;
                                    if (!(
                                      typeof minContains == "number" &&
                                      !(minContains % 1) &&
                                      !isNaN(minContains) &&
                                      isFinite(minContains)
                                    ))
                                      return (
                                        (b.errors = [
                                          {
                                            instancePath: s + "/minContains",
                                            schemaPath: "#/$defs/nonNegativeInteger/type",
                                            keyword: "type",
                                            params: { type: "integer" },
                                            message: "must be integer",
                                          },
                                        ]),
                                        !1
                                      );
                                    if (e === u) {
                                      if (typeof minContains == "number" && isFinite(minContains)) {
                                        if (minContains < 0 || isNaN(minContains))
                                          return (
                                            (b.errors = [
                                              {
                                                instancePath: s + "/minContains",
                                                schemaPath: "#/$defs/nonNegativeInteger/minimum",
                                                keyword: "minimum",
                                                params: { comparison: ">=", limit: 0 },
                                                message: "must be >= 0",
                                              },
                                            ]),
                                            !1
                                          );
                                      }
                                    }
                                    var o = f === e;
                                  } else var o = !0;
                                  if (o) {
                                    if (t.maxProperties !== void 0) {
                                      let maxProperties = t.maxProperties,
                                        f = e,
                                        u = e;
                                      if (!(
                                        typeof maxProperties == "number" &&
                                        !(maxProperties % 1) &&
                                        !isNaN(maxProperties) &&
                                        isFinite(maxProperties)
                                      ))
                                        return (
                                          (b.errors = [
                                            {
                                              instancePath: s + "/maxProperties",
                                              schemaPath: "#/$defs/nonNegativeInteger/type",
                                              keyword: "type",
                                              params: { type: "integer" },
                                              message: "must be integer",
                                            },
                                          ]),
                                          !1
                                        );
                                      if (e === u) {
                                        if (typeof maxProperties == "number" && isFinite(maxProperties)) {
                                          if (maxProperties < 0 || isNaN(maxProperties))
                                            return (
                                              (b.errors = [
                                                {
                                                  instancePath: s + "/maxProperties",
                                                  schemaPath: "#/$defs/nonNegativeInteger/minimum",
                                                  keyword: "minimum",
                                                  params: { comparison: ">=", limit: 0 },
                                                  message: "must be >= 0",
                                                },
                                              ]),
                                              !1
                                            );
                                        }
                                      }
                                      var o = f === e;
                                    } else var o = !0;
                                    if (o) {
                                      if (t.minProperties !== void 0) {
                                        let minProperties = t.minProperties,
                                          f = e,
                                          u = e;
                                        if (!(
                                          typeof minProperties == "number" &&
                                          !(minProperties % 1) &&
                                          !isNaN(minProperties) &&
                                          isFinite(minProperties)
                                        ))
                                          return (
                                            (b.errors = [
                                              {
                                                instancePath: s + "/minProperties",
                                                schemaPath: "#/$defs/nonNegativeIntegerDefault0/type",
                                                keyword: "type",
                                                params: { type: "integer" },
                                                message: "must be integer",
                                              },
                                            ]),
                                            !1
                                          );
                                        if (e === u) {
                                          if (typeof minProperties == "number" && isFinite(minProperties)) {
                                            if (minProperties < 0 || isNaN(minProperties))
                                              return (
                                                (b.errors = [
                                                  {
                                                    instancePath: s + "/minProperties",
                                                    schemaPath: "#/$defs/nonNegativeIntegerDefault0/minimum",
                                                    keyword: "minimum",
                                                    params: { comparison: ">=", limit: 0 },
                                                    message: "must be >= 0",
                                                  },
                                                ]),
                                                !1
                                              );
                                          }
                                        }
                                        var o = f === e;
                                      } else var o = !0;
                                      if (o) {
                                        if (t.required !== void 0) {
                                          let required = t.required,
                                            f = e;
                                          if (e === e)
                                            if (Array.isArray(required)) {
                                              var w = !0;
                                              let N = required.length;
                                              for (let v = 0; v < N; v++) {
                                                let _ = e;
                                                if (typeof required[v] !== "string")
                                                  return (
                                                    (b.errors = [
                                                      {
                                                        instancePath: s + "/required/" + v,
                                                        schemaPath: "#/$defs/stringArray/items/type",
                                                        keyword: "type",
                                                        params: { type: "string" },
                                                        message: "must be string",
                                                      },
                                                    ]),
                                                    !1
                                                  );
                                                var w = _ === e;
                                                if (!w) break;
                                              }
                                              if (w) {
                                                let v = required.length,
                                                  _;
                                                if (v > 1) {
                                                  let j = {};
                                                  for (; v--;) {
                                                    let g = required[v];
                                                    if (typeof g !== "string") continue;
                                                    if (typeof j[g] == "number") {
                                                      return (
                                                        (_ = j[g]),
                                                        (b.errors = [
                                                          {
                                                            instancePath: s + "/required",
                                                            schemaPath: "#/$defs/stringArray/uniqueItems",
                                                            keyword: "uniqueItems",
                                                            params: { i: v, j: _ },
                                                            message:
                                                              "must NOT have duplicate items (items ## " +
                                                              _ +
                                                              " and " +
                                                              v +
                                                              " are identical)",
                                                          },
                                                        ]),
                                                        !1
                                                      );
                                                      break;
                                                    }
                                                    j[g] = v;
                                                  }
                                                }
                                              }
                                            } else
                                              return (
                                                (b.errors = [
                                                  {
                                                    instancePath: s + "/required",
                                                    schemaPath: "#/$defs/stringArray/type",
                                                    keyword: "type",
                                                    params: { type: "array" },
                                                    message: "must be array",
                                                  },
                                                ]),
                                                !1
                                              );
                                          var o = f === e;
                                        } else var o = !0;
                                        if (o)
                                          if (t.dependentRequired !== void 0) {
                                            let dependentRequired = t.dependentRequired,
                                              f = e;
                                            if (e === f)
                                              if (
                                                dependentRequired &&
                                                typeof dependentRequired == "object" &&
                                                !Array.isArray(dependentRequired)
                                              )
                                                for (let key in dependentRequired) {
                                                  let N = dependentRequired[key],
                                                    v = e;
                                                  if (e === e)
                                                    if (Array.isArray(N)) {
                                                      var k = !0;
                                                      let j = N.length;
                                                      for (let g = 0; g < j; g++) {
                                                        let P = e;
                                                        if (typeof N[g] !== "string")
                                                          return (
                                                            (b.errors = [
                                                              {
                                                                instancePath:
                                                                  s +
                                                                  "/dependentRequired/" +
                                                                  key
                                                                    .replace(/~/g, "~0")
                                                                    .replace(/\//g, "~1") +
                                                                  "/" +
                                                                  g,
                                                                schemaPath: "#/$defs/stringArray/items/type",
                                                                keyword: "type",
                                                                params: { type: "string" },
                                                                message: "must be string",
                                                              },
                                                            ]),
                                                            !1
                                                          );
                                                        var k = P === e;
                                                        if (!k) break;
                                                      }
                                                      if (k) {
                                                        let g = N.length,
                                                          P;
                                                        if (g > 1) {
                                                          let S = {};
                                                          for (; g--;) {
                                                            let M = N[g];
                                                            if (typeof M !== "string") continue;
                                                            if (typeof S[M] == "number") {
                                                              return (
                                                                (P = S[M]),
                                                                (b.errors = [
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
                                                                    params: { i: g, j: P },
                                                                    message:
                                                                      "must NOT have duplicate items (items ## " +
                                                                      P +
                                                                      " and " +
                                                                      g +
                                                                      " are identical)",
                                                                  },
                                                                ]),
                                                                !1
                                                              );
                                                              break;
                                                            }
                                                            S[M] = g;
                                                          }
                                                        }
                                                      }
                                                    } else
                                                      return (
                                                        (b.errors = [
                                                          {
                                                            instancePath:
                                                              s +
                                                              "/dependentRequired/" +
                                                              key.replace(/~/g, "~0").replace(/\//g, "~1"),
                                                            schemaPath: "#/$defs/stringArray/type",
                                                            keyword: "type",
                                                            params: { type: "array" },
                                                            message: "must be array",
                                                          },
                                                        ]),
                                                        !1
                                                      );
                                                  var I = v === e;
                                                  if (!I) break;
                                                }
                                              else
                                                return (
                                                  (b.errors = [
                                                    {
                                                      instancePath: s + "/dependentRequired",
                                                      schemaPath: "#/properties/dependentRequired/type",
                                                      keyword: "type",
                                                      params: { type: "object" },
                                                      message: "must be object",
                                                    },
                                                  ]),
                                                  !1
                                                );
                                            var o = f === e;
                                          } else var o = !0;
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
  return ((b.errors = r), e === 0);
}
//@ chunk-n332mrkv.js:35916-36244 esm-fingerprint
b.evaluated = {
  props: {
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
  },
  dynamicProps: !1,
  dynamicItems: !1,
};
//@ chunk-dcmhvw5a.js:354157-354313 esm-fingerprint
function dt(e, n) {
  let r = 0;
  for (let s = 0; s < n; s++) {
    let code = e.charCodeAt(s);
    if (code >= 55296 && code <= 56319 && s + 1 < e.length && (e.charCodeAt(s + 1) & 64512) === 56320) s++;
    r++;
  }
  return r;
}

export { dt, b };

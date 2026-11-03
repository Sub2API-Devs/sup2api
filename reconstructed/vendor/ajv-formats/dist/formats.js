/**
 * ajv-formats/dist/formats.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv-formats@3.0.1
 * pieces: chunk-r1g76qsy.js (1), chunk-zykv69v4.js (1)
 * attribution: cjs-fingerprint 2
 */
import { J, Eo } from "../../@modelcontextprotocol/core/(bundler runtime of a pre-bundled dist file).js";
import { ao, De, te, Le, va, ne, Li, Sa, so, Di, ya } from "../../ajv/dist/core.js";
import { x } from "../../../runtime/bun-runtime.js";

//@ chunk-r1g76qsy.js:197840-255842 cjs-fingerprint
var Eu = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = {
      keyword: "id",
      code() {
        throw Error('NOT SUPPORTED: keyword "id", use "$id" for schema ID');
      },
    };
    e.default = t;
  }),
  _n = J((e) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }), (e.callRef = e.getValidate = void 0));
    let t = ao(),
      r = De(),
      s = te(),
      a = Le(),
      n = va(),
      i = ne(),
      l = {
        keyword: "$ref",
        schemaType: "string",
        code(m) {
          let { gen: gen, schema: schema, it: it } = m,
            { baseId: baseId, schemaEnv: schemaEnv, validateName: validateName, opts: opts, self: S } = it,
            { root: root } = schemaEnv;
          if ((schema === "#" || schema === "#/") && baseId === root.baseId) return C();
          let R = n.resolveRef.call(S, root, baseId, schema);
          if (R === void 0) throw new t.default(it.opts.uriResolver, baseId, schema);
          if (R instanceof n.SchemaEnv) return b(R);
          return g(R);
          function C() {
            if (schemaEnv === root) return d(m, validateName, schemaEnv, schemaEnv.$async);
            let scopeValue = gen.scopeValue("root", { ref: root });
            return d(m, s._`${scopeValue}.validate`, root, root.$async);
          }
          function b(k) {
            d(m, c(m, k), k, k.$async);
          }
          function g(k) {
            let scopeValue = gen.scopeValue(
                "schema",
                opts.code.source === !0 ? { ref: k, code: (0, s.stringify)(k) } : { ref: k },
              ),
              H = gen.name("valid"),
              subschema = m.subschema(
                {
                  schema: k,
                  dataTypes: [],
                  schemaPath: s.nil,
                  topSchemaRef: scopeValue,
                  errSchemaPath: schema,
                },
                H,
              );
            (m.mergeEvaluated(subschema), m.ok(H));
          }
        },
      };
    function c(m, _) {
      let { gen: gen } = m;
      return _.validate
        ? gen.scopeValue("validate", { ref: _.validate })
        : s._`${gen.scopeValue("wrapper", { ref: _ })}.validate`;
    }
    e.getValidate = c;
    function d(m, _, w, P) {
      let { gen: gen, it: it } = m,
        { allErrors: allErrors, schemaEnv: schemaEnv, opts: opts } = it,
        f = opts.passContext ? a.default.this : s.nil;
      if (P) R();
      else C();
      function R() {
        if (!schemaEnv.$async) throw Error("async schema referenced by sync schema");
        let k = gen.let("valid");
        (gen.try(
          () => {
            if ((gen.code(s._`await ${(0, r.callValidateCode)(m, _, f)}`), g(_), !allErrors))
              gen.assign(k, !0);
          },
          (V) => {
            if ((gen.if(s._`!(${V} instanceof ${it.ValidationError})`, () => gen.throw(V)), b(V), !allErrors))
              gen.assign(k, !1);
          },
        ),
          m.ok(k));
      }
      function C() {
        m.result(
          (0, r.callValidateCode)(m, _, f),
          () => g(_),
          () => b(_),
        );
      }
      function b(k) {
        let V = s._`${k}.errors`;
        (gen.assign(
          a.default.vErrors,
          s._`${a.default.vErrors} === null ? ${V} : ${a.default.vErrors}.concat(${V})`,
        ),
          gen.assign(a.default.errors, s._`${a.default.vErrors}.length`));
      }
      function g(k) {
        var V;
        if (!it.opts.unevaluated) return;
        let H =
          (V = w === null || w === void 0 ? void 0 : w.validate) === null || V === void 0
            ? void 0
            : V.evaluated;
        if (it.props !== !0)
          if (H && !H.dynamicProps) {
            if (H.props !== void 0) it.props = i.mergeEvaluated.props(gen, H.props, it.props);
          } else {
            let N = gen.var("props", s._`${k}.evaluated.props`);
            it.props = i.mergeEvaluated.props(gen, N, it.props, s.Name);
          }
        if (it.items !== !0)
          if (H && !H.dynamicItems) {
            if (H.items !== void 0) it.items = i.mergeEvaluated.items(gen, H.items, it.items);
          } else {
            let N = gen.var("items", s._`${k}.evaluated.items`);
            it.items = i.mergeEvaluated.items(gen, N, it.items, s.Name);
          }
      }
    }
    ((e.callRef = d), (e.default = l));
  }),
  Vi = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = Eu(),
      r = _n(),
      s = [
        "$schema",
        "$id",
        "$defs",
        "$vocabulary",
        { keyword: "$comment" },
        "definitions",
        t.default,
        r.default,
      ];
    e.default = s;
  }),
  Pu = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = te(),
      operators = t.operators,
      s = {
        maximum: { okStr: "<=", ok: operators.LTE, fail: operators.GT },
        minimum: { okStr: ">=", ok: operators.GTE, fail: operators.LT },
        exclusiveMaximum: { okStr: "<", ok: operators.LT, fail: operators.GTE },
        exclusiveMinimum: { okStr: ">", ok: operators.GT, fail: operators.LTE },
      },
      a = {
        keyword: Object.keys(s),
        type: "number",
        schemaType: "number",
        $data: !0,
        error: {
          message: ({ keyword: keyword, schemaCode: schemaCode }) =>
            t.str`must be ${s[keyword].okStr} ${schemaCode}`,
          params: ({ keyword: keyword, schemaCode: schemaCode }) =>
            t._`{comparison: ${s[keyword].okStr}, limit: ${schemaCode}}`,
        },
        code(n) {
          let { keyword: keyword, data: l, schemaCode: schemaCode } = n;
          n.fail$data(t._`${l} ${s[keyword].fail} ${schemaCode} || isNaN(${l})`);
        },
      };
    e.default = a;
  }),
  Tu = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = te(),
      r = {
        keyword: "multipleOf",
        type: "number",
        schemaType: "number",
        $data: !0,
        error: {
          message: ({ schemaCode: schemaCode }) => t.str`must be multiple of ${schemaCode}`,
          params: ({ schemaCode: schemaCode }) => t._`{multipleOf: ${schemaCode}}`,
        },
        code(s) {
          let { gen: gen, data: n, schemaCode: schemaCode, it: it } = s,
            multipleOfPrecision = it.opts.multipleOfPrecision,
            d = gen.let("res"),
            m = multipleOfPrecision
              ? t._`Math.abs(Math.round(${d}) - ${d}) > 1e-${multipleOfPrecision}`
              : t._`${d} !== parseInt(${d})`;
          s.fail$data(t._`(${schemaCode} === 0 || (${d} = ${n}/${schemaCode}, ${m}))`);
        },
      };
    e.default = r;
  }),
  Cu = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    function t(r) {
      let s = r.length,
        a = 0,
        n = 0,
        i;
      while (n < s)
        if ((a++, (i = r.charCodeAt(n++)), i >= 55296 && i <= 56319 && n < s)) {
          if (((i = r.charCodeAt(n)), (i & 64512) === 56320)) n++;
        }
      return a;
    }
    ((e.default = t), (t.code = 'require("ajv/dist/runtime/ucs2length").default'));
  }),
  ku = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = te(),
      r = ne(),
      s = Cu(),
      a = {
        keyword: ["maxLength", "minLength"],
        type: "string",
        schemaType: "number",
        $data: !0,
        error: {
          message({ keyword: n, schemaCode: i }) {
            let l = n === "maxLength" ? "more" : "fewer";
            return t.str`must NOT have ${l} than ${i} characters`;
          },
          params: ({ schemaCode: schemaCode }) => t._`{limit: ${schemaCode}}`,
        },
        code(n) {
          let { keyword: keyword, data: l, schemaCode: schemaCode, it: it } = n,
            m = keyword === "maxLength" ? t.operators.GT : t.operators.LT,
            _ = it.opts.unicode === !1 ? t._`${l}.length` : t._`${(0, r.useFunc)(n.gen, s.default)}(${l})`;
          n.fail$data(t._`${_} ${m} ${schemaCode}`);
        },
      };
    e.default = a;
  }),
  qu = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = De(),
      r = ne(),
      s = te(),
      a = {
        keyword: "pattern",
        type: "string",
        schemaType: "string",
        $data: !0,
        error: {
          message: ({ schemaCode: schemaCode }) => s.str`must match pattern "${schemaCode}"`,
          params: ({ schemaCode: schemaCode }) => s._`{pattern: ${schemaCode}}`,
        },
        code(n) {
          let { gen: gen, data: l, $data: $data, schema: schema, schemaCode: schemaCode, it: it } = n,
            w = it.opts.unicodeRegExp ? "u" : "";
          if ($data) {
            let { regExp: regExp } = it.opts.code,
              y = regExp.code === "new RegExp" ? s._`new RegExp` : (0, r.useFunc)(gen, regExp),
              v = gen.let("valid");
            (gen.try(
              () => gen.assign(v, s._`${y}(${schemaCode}, ${w}).test(${l})`),
              () => gen.assign(v, !1),
            ),
              n.fail$data(s._`!${v}`));
          } else {
            let P = (0, t.usePattern)(n, schema);
            n.fail$data(s._`!${P}.test(${l})`);
          }
        },
      };
    e.default = a;
  }),
  Iu = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = te(),
      r = {
        keyword: ["maxProperties", "minProperties"],
        type: "object",
        schemaType: "number",
        $data: !0,
        error: {
          message({ keyword: s, schemaCode: a }) {
            let n = s === "maxProperties" ? "more" : "fewer";
            return t.str`must NOT have ${n} than ${a} properties`;
          },
          params: ({ schemaCode: schemaCode }) => t._`{limit: ${schemaCode}}`,
        },
        code(s) {
          let { keyword: keyword, data: n, schemaCode: schemaCode } = s,
            l = keyword === "maxProperties" ? t.operators.GT : t.operators.LT;
          s.fail$data(t._`Object.keys(${n}).length ${l} ${schemaCode}`);
        },
      };
    e.default = r;
  }),
  Ou = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = De(),
      r = te(),
      s = ne(),
      a = {
        keyword: "required",
        type: "object",
        schemaType: "array",
        $data: !0,
        error: {
          message: ({ params: { missingProperty: n } }) => r.str`must have required property '${n}'`,
          params: ({ params: { missingProperty: n } }) => r._`{missingProperty: ${n}}`,
        },
        code(n) {
          let { gen: gen, schema: schema, schemaCode: schemaCode, data: d, $data: $data, it: it } = n,
            { opts: opts } = it;
          if (!$data && schema.length === 0) return;
          let P = schema.length >= opts.loopRequired;
          if (it.allErrors) y();
          else v();
          if (opts.strictRequired) {
            let properties = n.parentSchema.properties,
              { definedProperties: definedProperties } = n.it;
            for (let R of schema)
              if (
                (properties === null || properties === void 0 ? void 0 : properties[R]) === void 0 &&
                !definedProperties.has(R)
              ) {
                let C = `required property "${R}" is not defined at "${it.schemaEnv.baseId + it.errSchemaPath}" (strictRequired)`;
                (0, s.checkStrictMode)(it, C, it.opts.strictRequired);
              }
          }
          function y() {
            if (P || $data) n.block$data(r.nil, p);
            else for (let S of schema) (0, t.checkReportMissingProp)(n, S);
          }
          function v() {
            let S = gen.let("missing");
            if (P || $data) {
              let f = gen.let("valid", !0);
              (n.block$data(f, () => h(S, f)), n.ok(f));
            } else
              (gen.if((0, t.checkMissingProp)(n, schema, S)), (0, t.reportMissingProp)(n, S), gen.else());
          }
          function p() {
            gen.forOf("prop", schemaCode, (S) => {
              (n.setParams({ missingProperty: S }),
                gen.if((0, t.noPropertyInData)(gen, d, S, opts.ownProperties), () => n.error()));
            });
          }
          function h(S, f) {
            (n.setParams({ missingProperty: S }),
              gen.forOf(
                S,
                schemaCode,
                () => {
                  (gen.assign(f, (0, t.propertyInData)(gen, d, S, opts.ownProperties)),
                    gen.if((0, r.not)(f), () => {
                      (n.error(), gen.break());
                    }));
                },
                r.nil,
              ));
          }
        },
      };
    e.default = a;
  }),
  Nu = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = te(),
      r = {
        keyword: ["maxItems", "minItems"],
        type: "array",
        schemaType: "number",
        $data: !0,
        error: {
          message({ keyword: s, schemaCode: a }) {
            let n = s === "maxItems" ? "more" : "fewer";
            return t.str`must NOT have ${n} than ${a} items`;
          },
          params: ({ schemaCode: schemaCode }) => t._`{limit: ${schemaCode}}`,
        },
        code(s) {
          let { keyword: keyword, data: n, schemaCode: schemaCode } = s,
            l = keyword === "maxItems" ? t.operators.GT : t.operators.LT;
          s.fail$data(t._`${n}.length ${l} ${schemaCode}`);
        },
      };
    e.default = r;
  }),
  yn = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = Li();
    ((t.code = 'require("ajv/dist/runtime/equal").default'), (e.default = t));
  }),
  Mu = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = Sa(),
      r = te(),
      s = ne(),
      a = yn(),
      n = {
        keyword: "uniqueItems",
        type: "array",
        schemaType: "boolean",
        $data: !0,
        error: {
          message: ({ params: { i, j: l } }) =>
            r.str`must NOT have duplicate items (items ## ${l} and ${i} are identical)`,
          params: ({ params: { i, j: l } }) => r._`{i: ${i}, j: ${l}}`,
        },
        code(i) {
          let {
            gen: gen,
            data: c,
            $data: $data,
            schema: schema,
            parentSchema: parentSchema,
            schemaCode: schemaCode,
            it: it,
          } = i;
          if (!$data && !schema) return;
          let y = gen.let("valid"),
            v = parentSchema.items ? (0, t.getSchemaTypes)(parentSchema.items) : [];
          (i.block$data(y, p, r._`${schemaCode} === false`), i.ok(y));
          function p() {
            let R = gen.let("i", r._`${c}.length`),
              C = gen.let("j");
            (i.setParams({ i: R, j: C }),
              gen.assign(y, !0),
              gen.if(r._`${R} > 1`, () => (h() ? S : f)(R, C)));
          }
          function h() {
            return v.length > 0 && !v.some((R) => R === "object" || R === "array");
          }
          function S(R, C) {
            let b = gen.name("item"),
              g = (0, t.checkDataTypes)(v, b, it.opts.strictNumbers, t.DataType.Wrong),
              k = gen.const("indices", r._`{}`);
            gen.for(r._`;${R}--;`, () => {
              if ((gen.let(b, r._`${c}[${R}]`), gen.if(g, r._`continue`), v.length > 1))
                gen.if(r._`typeof ${b} == "string"`, r._`${b} += "_"`);
              gen
                .if(r._`typeof ${k}[${b}] == "number"`, () => {
                  (gen.assign(C, r._`${k}[${b}]`), i.error(), gen.assign(y, !1).break());
                })
                .code(r._`${k}[${b}] = ${R}`);
            });
          }
          function f(R, C) {
            let b = (0, s.useFunc)(gen, a.default),
              g = gen.name("outer");
            gen.label(g).for(r._`;${R}--;`, () =>
              gen.for(r._`${C} = ${R}; ${C}--;`, () =>
                gen.if(r._`${b}(${c}[${R}], ${c}[${C}])`, () => {
                  (i.error(), gen.assign(y, !1).break(g));
                }),
              ),
            );
          }
        },
      };
    e.default = n;
  }),
  ju = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = te(),
      r = ne(),
      s = yn(),
      a = {
        keyword: "const",
        $data: !0,
        error: {
          message: "must be equal to constant",
          params: ({ schemaCode: schemaCode }) => t._`{allowedValue: ${schemaCode}}`,
        },
        code(n) {
          let { gen: gen, data: l, $data: $data, schemaCode: schemaCode, schema: schema } = n;
          if ($data || (schema && typeof schema == "object"))
            n.fail$data(t._`!${(0, r.useFunc)(gen, s.default)}(${l}, ${schemaCode})`);
          else n.fail(t._`${schema} !== ${l}`);
        },
      };
    e.default = a;
  }),
  Au = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = te(),
      r = ne(),
      s = yn(),
      a = {
        keyword: "enum",
        schemaType: "array",
        $data: !0,
        error: {
          message: "must be equal to one of the allowed values",
          params: ({ schemaCode: schemaCode }) => t._`{allowedValues: ${schemaCode}}`,
        },
        code(n) {
          let { gen: gen, data: l, $data: $data, schema: schema, schemaCode: schemaCode, it: it } = n;
          if (!$data && schema.length === 0) throw Error("enum must have non-empty array");
          let w = schema.length >= it.opts.loopEnum,
            P,
            y = () => (P !== null && P !== void 0 ? P : (P = (0, r.useFunc)(gen, s.default))),
            v;
          if (w || $data) ((v = gen.let("valid")), n.block$data(v, p));
          else {
            if (!Array.isArray(schema)) throw Error("ajv implementation error");
            let S = gen.const("vSchema", schemaCode);
            v = (0, t.or)(...schema.map((f, R) => h(S, R)));
          }
          n.pass(v);
          function p() {
            (gen.assign(v, !1),
              gen.forOf("v", schemaCode, (S) =>
                gen.if(t._`${y()}(${l}, ${S})`, () => gen.assign(v, !0).break()),
              ));
          }
          function h(S, f) {
            let R = schema[f];
            return typeof R === "object" && R !== null ? t._`${y()}(${l}, ${S}[${f}])` : t._`${l} === ${R}`;
          }
        },
      };
    e.default = a;
  }),
  xi = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = Pu(),
      r = Tu(),
      s = ku(),
      a = qu(),
      n = Iu(),
      i = Ou(),
      l = Nu(),
      c = Mu(),
      d = ju(),
      m = Au(),
      _ = [
        t.default,
        r.default,
        s.default,
        a.default,
        n.default,
        i.default,
        l.default,
        c.default,
        { keyword: "type", schemaType: ["string", "array"] },
        { keyword: "nullable", schemaType: "boolean" },
        d.default,
        m.default,
      ];
    e.default = _;
  }),
  Fi = J((e) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }), (e.validateAdditionalItems = void 0));
    let t = te(),
      r = ne(),
      s = {
        keyword: "additionalItems",
        type: "array",
        schemaType: ["boolean", "object"],
        before: "uniqueItems",
        error: {
          message: ({ params: { len: n } }) => t.str`must NOT have more than ${n} items`,
          params: ({ params: { len: n } }) => t._`{limit: ${n}}`,
        },
        code(n) {
          let { parentSchema: parentSchema, it: it } = n,
            { items: items } = parentSchema;
          if (!Array.isArray(items)) {
            (0, r.checkStrictMode)(
              it,
              '"additionalItems" is ignored when "items" is not an array of schemas',
            );
            return;
          }
          a(n, items);
        },
      };
    function a(n, i) {
      let { gen: gen, schema: schema, data: d, keyword: keyword, it: it } = n;
      it.items = !0;
      let w = gen.const("len", t._`${d}.length`);
      if (schema === !1) (n.setParams({ len: i.length }), n.pass(t._`${w} <= ${i.length}`));
      else if (typeof schema == "object" && !(0, r.alwaysValidSchema)(it, schema)) {
        let y = gen.var("valid", t._`${w} <= ${i.length}`);
        (gen.if((0, t.not)(y), () => P(y)), n.ok(y));
      }
      function P(y) {
        gen.forRange("i", i.length, w, (v) => {
          if ((n.subschema({ keyword: keyword, dataProp: v, dataPropType: r.Type.Num }, y), !it.allErrors))
            gen.if((0, t.not)(y), () => gen.break());
        });
      }
    }
    ((e.validateAdditionalItems = a), (e.default = s));
  }),
  Ki = J((e) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }), (e.validateTuple = void 0));
    let t = te(),
      r = ne(),
      s = De(),
      a = {
        keyword: "items",
        type: "array",
        schemaType: ["object", "array", "boolean"],
        before: "uniqueItems",
        code(i) {
          let { schema: schema, it: it } = i;
          if (Array.isArray(schema)) return n(i, "additionalItems", schema);
          if (((it.items = !0), (0, r.alwaysValidSchema)(it, schema))) return;
          i.ok((0, s.validateArray)(i));
        },
      };
    function n(i, l, c = i.schema) {
      let { gen: gen, parentSchema: parentSchema, data: _, keyword: keyword, it: it } = i;
      if ((p(parentSchema), it.opts.unevaluated && c.length && it.items !== !0))
        it.items = r.mergeEvaluated.items(gen, c.length, it.items);
      let y = gen.name("valid"),
        v = gen.const("len", t._`${_}.length`);
      c.forEach((h, S) => {
        if ((0, r.alwaysValidSchema)(it, h)) return;
        (gen.if(t._`${v} > ${S}`, () => i.subschema({ keyword: keyword, schemaProp: S, dataProp: S }, y)),
          i.ok(y));
      });
      function p(h) {
        let { opts: opts, errSchemaPath: errSchemaPath } = it,
          R = c.length,
          C = R === h.minItems && (R === h.maxItems || h[l] === !1);
        if (opts.strictTuples && !C) {
          let b = `"${keyword}" is ${R}-tuple, but minItems or maxItems/${l} are not specified or different at path "${errSchemaPath}"`;
          (0, r.checkStrictMode)(it, b, opts.strictTuples);
        }
      }
    }
    ((e.validateTuple = n), (e.default = a));
  }),
  Lu = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = Ki(),
      r = {
        keyword: "prefixItems",
        type: "array",
        schemaType: ["array"],
        before: "uniqueItems",
        code: (s) => (0, t.validateTuple)(s, "items"),
      };
    e.default = r;
  }),
  Uu = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = te(),
      r = ne(),
      s = De(),
      a = Fi(),
      n = {
        keyword: "items",
        type: "array",
        schemaType: ["object", "boolean"],
        before: "uniqueItems",
        error: {
          message: ({ params: { len: i } }) => t.str`must NOT have more than ${i} items`,
          params: ({ params: { len: i } }) => t._`{limit: ${i}}`,
        },
        code(i) {
          let { schema: schema, parentSchema: parentSchema, it: it } = i,
            { prefixItems: prefixItems } = parentSchema;
          if (((it.items = !0), (0, r.alwaysValidSchema)(it, schema))) return;
          if (prefixItems) (0, a.validateAdditionalItems)(i, prefixItems);
          else i.ok((0, s.validateArray)(i));
        },
      };
    e.default = n;
  }),
  Du = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = te(),
      r = ne(),
      s = {
        keyword: "contains",
        type: "array",
        schemaType: ["object", "boolean"],
        before: "uniqueItems",
        trackErrors: !0,
        error: {
          message: ({ params: { min: a, max: n } }) =>
            n === void 0
              ? t.str`must contain at least ${a} valid item(s)`
              : t.str`must contain at least ${a} and no more than ${n} valid item(s)`,
          params: ({ params: { min: a, max: n } }) =>
            n === void 0 ? t._`{minContains: ${a}}` : t._`{minContains: ${a}, maxContains: ${n}}`,
        },
        code(a) {
          let { gen: gen, schema: schema, parentSchema: parentSchema, data: c, it: it } = a,
            m,
            _,
            { minContains: minContains, maxContains: maxContains } = parentSchema;
          if (it.opts.next) ((m = minContains === void 0 ? 1 : minContains), (_ = maxContains));
          else m = 1;
          let y = gen.const("len", t._`${c}.length`);
          if ((a.setParams({ min: m, max: _ }), _ === void 0 && m === 0)) {
            (0, r.checkStrictMode)(
              it,
              '"minContains" == 0 without "maxContains": "contains" keyword ignored',
            );
            return;
          }
          if (_ !== void 0 && m > _) {
            ((0, r.checkStrictMode)(it, '"minContains" > "maxContains" is always invalid'), a.fail());
            return;
          }
          if ((0, r.alwaysValidSchema)(it, schema)) {
            let f = t._`${y} >= ${m}`;
            if (_ !== void 0) f = t._`${f} && ${y} <= ${_}`;
            a.pass(f);
            return;
          }
          it.items = !0;
          let v = gen.name("valid");
          if (_ === void 0 && m === 1) h(v, () => gen.if(v, () => gen.break()));
          else if (m === 0) {
            if ((gen.let(v, !0), _ !== void 0)) gen.if(t._`${c}.length > 0`, p);
          } else (gen.let(v, !1), p());
          a.result(v, () => a.reset());
          function p() {
            let f = gen.name("_valid"),
              R = gen.let("count", 0);
            h(f, () => gen.if(f, () => S(R)));
          }
          function h(f, R) {
            gen.forRange("i", 0, y, (C) => {
              (a.subschema(
                { keyword: "contains", dataProp: C, dataPropType: r.Type.Num, compositeRule: !0 },
                f,
              ),
                R());
            });
          }
          function S(f) {
            if ((gen.code(t._`${f}++`), _ === void 0))
              gen.if(t._`${f} >= ${m}`, () => gen.assign(v, !0).break());
            else if ((gen.if(t._`${f} > ${_}`, () => gen.assign(v, !1).break()), m === 1)) gen.assign(v, !0);
            else gen.if(t._`${f} >= ${m}`, () => gen.assign(v, !0));
          }
        },
      };
    e.default = s;
  }),
  vn = J((e) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.validateSchemaDeps = e.validatePropertyDeps = e.error = void 0));
    let t = te(),
      r = ne(),
      s = De();
    e.error = {
      message: ({ params: { property: c, depsCount: d, deps: m } }) => {
        let _ = d === 1 ? "property" : "properties";
        return t.str`must have ${_} ${m} when property ${c} is present`;
      },
      params: ({ params: { property: c, depsCount: d, deps: m, missingProperty: _ } }) => t._`{property: ${c},
    missingProperty: ${_},
    depsCount: ${d},
    deps: ${m}}`,
    };
    let a = {
      keyword: "dependencies",
      type: "object",
      schemaType: "object",
      error: e.error,
      code(c) {
        let [d, m] = n(c);
        (i(c, d), l(c, m));
      },
    };
    function n({ schema: schema }) {
      let d = {},
        m = {};
      for (let key in schema) {
        if (key === "__proto__") continue;
        let w = Array.isArray(schema[key]) ? d : m;
        w[key] = schema[key];
      }
      return [d, m];
    }
    function i(c, d = c.schema) {
      let { gen: gen, data: _, it: it } = c;
      if (Object.keys(d).length === 0) return;
      let P = gen.let("missing");
      for (let key in d) {
        let v = d[key];
        if (v.length === 0) continue;
        let p = (0, s.propertyInData)(gen, _, key, it.opts.ownProperties);
        if ((c.setParams({ property: key, depsCount: v.length, deps: v.join(", ") }), it.allErrors))
          gen.if(p, () => {
            for (let h of v) (0, s.checkReportMissingProp)(c, h);
          });
        else
          (gen.if(t._`${p} && (${(0, s.checkMissingProp)(c, v, P)})`),
            (0, s.reportMissingProp)(c, P),
            gen.else());
      }
    }
    e.validatePropertyDeps = i;
    function l(c, d = c.schema) {
      let { gen: gen, data: _, keyword: keyword, it: it } = c,
        y = gen.name("valid");
      for (let key in d) {
        if ((0, r.alwaysValidSchema)(it, d[key])) continue;
        (gen.if(
          (0, s.propertyInData)(gen, _, key, it.opts.ownProperties),
          () => {
            let subschema = c.subschema({ keyword: keyword, schemaProp: key }, y);
            c.mergeValidEvaluated(subschema, y);
          },
          () => gen.var(y, !0),
        ),
          c.ok(y));
      }
    }
    ((e.validateSchemaDeps = l), (e.default = a));
  }),
  Vu = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = te(),
      r = ne(),
      s = {
        keyword: "propertyNames",
        type: "object",
        schemaType: ["object", "boolean"],
        error: {
          message: "property name must be valid",
          params: ({ params: params }) => t._`{propertyName: ${params.propertyName}}`,
        },
        code(a) {
          let { gen: gen, schema: schema, data: l, it: it } = a;
          if ((0, r.alwaysValidSchema)(it, schema)) return;
          let d = gen.name("valid");
          (gen.forIn("key", l, (m) => {
            (a.setParams({ propertyName: m }),
              a.subschema(
                {
                  keyword: "propertyNames",
                  data: m,
                  dataTypes: ["string"],
                  propertyName: m,
                  compositeRule: !0,
                },
                d,
              ),
              gen.if((0, t.not)(d), () => {
                if ((a.error(!0), !it.allErrors)) gen.break();
              }));
          }),
            a.ok(d));
        },
      };
    e.default = s;
  }),
  Ji = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = De(),
      r = te(),
      s = Le(),
      a = ne(),
      n = {
        keyword: "additionalProperties",
        type: ["object"],
        schemaType: ["boolean", "object"],
        allowUndefined: !0,
        trackErrors: !0,
        error: {
          message: "must NOT have additional properties",
          params: ({ params: params }) => r._`{additionalProperty: ${params.additionalProperty}}`,
        },
        code(i) {
          let {
            gen: gen,
            schema: schema,
            parentSchema: parentSchema,
            data: m,
            errsCount: errsCount,
            it: it,
          } = i;
          if (!errsCount) throw Error("ajv implementation error");
          let { allErrors: allErrors, opts: opts } = it;
          if (((it.props = !0), opts.removeAdditional !== "all" && (0, a.alwaysValidSchema)(it, schema)))
            return;
          let v = (0, t.allSchemaProperties)(parentSchema.properties),
            p = (0, t.allSchemaProperties)(parentSchema.patternProperties);
          (h(), i.ok(r._`${errsCount} === ${s.default.errors}`));
          function h() {
            gen.forIn("key", m, (b) => {
              if (!v.length && !p.length) R(b);
              else gen.if(S(b), () => R(b));
            });
          }
          function S(b) {
            let g;
            if (v.length > 8) {
              let k = (0, a.schemaRefOrVal)(it, parentSchema.properties, "properties");
              g = (0, t.isOwnProperty)(gen, k, b);
            } else if (v.length) g = (0, r.or)(...v.map((k) => r._`${b} === ${k}`));
            else g = r.nil;
            if (p.length) g = (0, r.or)(g, ...p.map((k) => r._`${(0, t.usePattern)(i, k)}.test(${b})`));
            return (0, r.not)(g);
          }
          function f(b) {
            gen.code(r._`delete ${m}[${b}]`);
          }
          function R(b) {
            if (opts.removeAdditional === "all" || (opts.removeAdditional && schema === !1)) {
              f(b);
              return;
            }
            if (schema === !1) {
              if ((i.setParams({ additionalProperty: b }), i.error(), !allErrors)) gen.break();
              return;
            }
            if (typeof schema == "object" && !(0, a.alwaysValidSchema)(it, schema)) {
              let g = gen.name("valid");
              if (opts.removeAdditional === "failing")
                (C(b, g, !1),
                  gen.if((0, r.not)(g), () => {
                    (i.reset(), f(b));
                  }));
              else if ((C(b, g), !allErrors)) gen.if((0, r.not)(g), () => gen.break());
            }
          }
          function C(b, g, k) {
            let V = { keyword: "additionalProperties", dataProp: b, dataPropType: a.Type.Str };
            if (k === !1) Object.assign(V, { compositeRule: !0, createErrors: !1, allErrors: !1 });
            i.subschema(V, g);
          }
        },
      };
    e.default = n;
  }),
  xu = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = so(),
      r = De(),
      s = ne(),
      a = Ji(),
      n = {
        keyword: "properties",
        type: "object",
        schemaType: "object",
        code(i) {
          let { gen: gen, schema: schema, parentSchema: parentSchema, data: m, it: it } = i;
          if (it.opts.removeAdditional === "all" && parentSchema.additionalProperties === void 0)
            a.default.code(new t.KeywordCxt(it, a.default, "additionalProperties"));
          let w = (0, r.allSchemaProperties)(schema);
          for (let h of w) it.definedProperties.add(h);
          if (it.opts.unevaluated && w.length && it.props !== !0)
            it.props = s.mergeEvaluated.props(gen, (0, s.toHash)(w), it.props);
          let filtered = w.filter((h) => !(0, s.alwaysValidSchema)(it, schema[h]));
          if (filtered.length === 0) return;
          let y = gen.name("valid");
          for (let h of filtered) {
            if (v(h)) p(h);
            else {
              if ((gen.if((0, r.propertyInData)(gen, m, h, it.opts.ownProperties)), p(h), !it.allErrors))
                gen.else().var(y, !0);
              gen.endIf();
            }
            (i.it.definedProperties.add(h), i.ok(y));
          }
          function v(h) {
            return it.opts.useDefaults && !it.compositeRule && schema[h].default !== void 0;
          }
          function p(h) {
            i.subschema({ keyword: "properties", schemaProp: h, dataProp: h }, y);
          }
        },
      };
    e.default = n;
  }),
  Fu = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = De(),
      r = te(),
      s = ne(),
      a = ne(),
      n = {
        keyword: "patternProperties",
        type: "object",
        schemaType: "object",
        code(i) {
          let { gen: gen, schema: schema, data: d, parentSchema: parentSchema, it: it } = i,
            { opts: opts } = it,
            P = (0, t.allSchemaProperties)(schema),
            filtered = P.filter((C) => (0, s.alwaysValidSchema)(it, schema[C]));
          if (P.length === 0 || (filtered.length === P.length && (!it.opts.unevaluated || it.props === !0)))
            return;
          let v = opts.strictSchema && !opts.allowMatchingProperties && parentSchema.properties,
            p = gen.name("valid");
          if (it.props !== !0 && !(it.props instanceof r.Name))
            it.props = (0, a.evaluatedPropsToName)(gen, it.props);
          let { props: props } = it;
          S();
          function S() {
            for (let C of P) {
              if (v) f(C);
              if (it.allErrors) R(C);
              else (gen.var(p, !0), R(C), gen.if(p));
            }
          }
          function f(C) {
            for (let key in v)
              if (new RegExp(C).test(key))
                (0, s.checkStrictMode)(
                  it,
                  `property ${key} matches pattern ${C} (use allowMatchingProperties)`,
                );
          }
          function R(C) {
            gen.forIn("key", d, (b) => {
              gen.if(r._`${(0, t.usePattern)(i, C)}.test(${b})`, () => {
                let included = filtered.includes(C);
                if (!included)
                  i.subschema(
                    { keyword: "patternProperties", schemaProp: C, dataProp: b, dataPropType: a.Type.Str },
                    p,
                  );
                if (it.opts.unevaluated && props !== !0) gen.assign(r._`${props}[${b}]`, !0);
                else if (!included && !it.allErrors) gen.if((0, r.not)(p), () => gen.break());
              });
            });
          }
        },
      };
    e.default = n;
  }),
  Hu = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = ne(),
      r = {
        keyword: "not",
        schemaType: ["object", "boolean"],
        trackErrors: !0,
        code(s) {
          let { gen: gen, schema: schema, it: it } = s;
          if ((0, t.alwaysValidSchema)(it, schema)) {
            s.fail();
            return;
          }
          let l = gen.name("valid");
          (s.subschema({ keyword: "not", compositeRule: !0, createErrors: !1, allErrors: !1 }, l),
            s.failResult(
              l,
              () => s.reset(),
              () => s.error(),
            ));
        },
        error: { message: "must NOT be valid" },
      };
    e.default = r;
  }),
  Ku = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = {
      keyword: "anyOf",
      schemaType: "array",
      trackErrors: !0,
      code: De().validateUnion,
      error: { message: "must match a schema in anyOf" },
    };
    e.default = t;
  }),
  Ju = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = te(),
      r = ne(),
      s = {
        keyword: "oneOf",
        schemaType: "array",
        trackErrors: !0,
        error: {
          message: "must match exactly one schema in oneOf",
          params: ({ params: params }) => t._`{passingSchemas: ${params.passing}}`,
        },
        code(a) {
          let { gen: gen, schema: schema, parentSchema: parentSchema, it: it } = a;
          if (!Array.isArray(schema)) throw Error("ajv implementation error");
          if (it.opts.discriminator && parentSchema.discriminator) return;
          let d = schema,
            m = gen.let("valid", !1),
            _ = gen.let("passing", null),
            w = gen.name("_valid");
          (a.setParams({ passing: _ }),
            gen.block(P),
            a.result(
              m,
              () => a.reset(),
              () => a.error(!0),
            ));
          function P() {
            d.forEach((y, v) => {
              let p;
              if ((0, r.alwaysValidSchema)(it, y)) gen.var(w, !0);
              else p = a.subschema({ keyword: "oneOf", schemaProp: v, compositeRule: !0 }, w);
              if (v > 0)
                gen
                  .if(t._`${w} && ${m}`)
                  .assign(m, !1)
                  .assign(_, t._`[${_}, ${v}]`)
                  .else();
              gen.if(w, () => {
                if ((gen.assign(m, !0), gen.assign(_, v), p)) a.mergeEvaluated(p, t.Name);
              });
            });
          }
        },
      };
    e.default = s;
  }),
  Gu = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = ne(),
      r = {
        keyword: "allOf",
        schemaType: "array",
        code(s) {
          let { gen: gen, schema: schema, it: it } = s;
          if (!Array.isArray(schema)) throw Error("ajv implementation error");
          let l = gen.name("valid");
          schema.forEach((c, d) => {
            if ((0, t.alwaysValidSchema)(it, c)) return;
            let subschema = s.subschema({ keyword: "allOf", schemaProp: d }, l);
            (s.ok(l), s.mergeEvaluated(subschema));
          });
        },
      };
    e.default = r;
  }),
  Bu = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = te(),
      r = ne(),
      s = {
        keyword: "if",
        schemaType: ["object", "boolean"],
        trackErrors: !0,
        error: {
          message: ({ params: params }) => t.str`must match "${params.ifClause}" schema`,
          params: ({ params: params }) => t._`{failingKeyword: ${params.ifClause}}`,
        },
        code(n) {
          let { gen: gen, parentSchema: parentSchema, it: it } = n;
          if (parentSchema.then === void 0 && parentSchema.else === void 0)
            (0, r.checkStrictMode)(it, '"if" without "then" and "else" is ignored');
          let d = a(it, "then"),
            m = a(it, "else");
          if (!d && !m) return;
          let _ = gen.let("valid", !0),
            w = gen.name("_valid");
          if ((P(), n.reset(), d && m)) {
            let v = gen.let("ifClause");
            (n.setParams({ ifClause: v }), gen.if(w, y("then", v), y("else", v)));
          } else if (d) gen.if(w, y("then"));
          else gen.if((0, t.not)(w), y("else"));
          n.pass(_, () => n.error(!0));
          function P() {
            let subschema = n.subschema(
              { keyword: "if", compositeRule: !0, createErrors: !1, allErrors: !1 },
              w,
            );
            n.mergeEvaluated(subschema);
          }
          function y(v, p) {
            return () => {
              let subschema = n.subschema({ keyword: v }, w);
              if ((gen.assign(_, w), n.mergeValidEvaluated(subschema, _), p)) gen.assign(p, t._`${v}`);
              else n.setParams({ ifClause: v });
            };
          }
        },
      };
    function a(n, i) {
      let l = n.schema[i];
      return l !== void 0 && !(0, r.alwaysValidSchema)(n, l);
    }
    e.default = s;
  }),
  Wu = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = ne(),
      r = {
        keyword: ["then", "else"],
        schemaType: ["object", "boolean"],
        code({ keyword: s, parentSchema: a, it: n }) {
          if (a.if === void 0) (0, t.checkStrictMode)(n, `"${s}" without "if" is ignored`);
        },
      };
    e.default = r;
  }),
  Gi = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = Fi(),
      r = Lu(),
      s = Ki(),
      a = Uu(),
      n = Du(),
      i = vn(),
      l = Vu(),
      c = Ji(),
      d = xu(),
      m = Fu(),
      _ = Hu(),
      w = Ku(),
      P = Ju(),
      y = Gu(),
      v = Bu(),
      p = Wu();
    function h(S = !1) {
      let f = [
        _.default,
        w.default,
        P.default,
        y.default,
        v.default,
        p.default,
        l.default,
        c.default,
        i.default,
        d.default,
        m.default,
      ];
      if (S) f.push(r.default, a.default);
      else f.push(t.default, s.default);
      return (f.push(n.default), f);
    }
    e.default = h;
  }),
  Yu = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = te(),
      r = {
        keyword: "format",
        type: ["number", "string"],
        schemaType: "string",
        $data: !0,
        error: {
          message: ({ schemaCode: schemaCode }) => t.str`must match format "${schemaCode}"`,
          params: ({ schemaCode: schemaCode }) => t._`{format: ${schemaCode}}`,
        },
        code(s, a) {
          let { gen: gen, data: i, $data: $data, schema: schema, schemaCode: schemaCode, it: it } = s,
            { opts: opts, errSchemaPath: errSchemaPath, schemaEnv: schemaEnv, self: y } = it;
          if (!opts.validateFormats) return;
          if ($data) v();
          else p();
          function v() {
            let scopeValue = gen.scopeValue("formats", { ref: y.formats, code: opts.code.formats }),
              S = gen.const("fDef", t._`${scopeValue}[${schemaCode}]`),
              f = gen.let("fType"),
              R = gen.let("format");
            (gen.if(
              t._`typeof ${S} == "object" && !(${S} instanceof RegExp)`,
              () => gen.assign(f, t._`${S}.type || "string"`).assign(R, t._`${S}.validate`),
              () => gen.assign(f, t._`"string"`).assign(R, S),
            ),
              s.fail$data((0, t.or)(C(), b())));
            function C() {
              if (opts.strictSchema === !1) return t.nil;
              return t._`${schemaCode} && !${R}`;
            }
            function b() {
              let g = schemaEnv.$async ? t._`(${S}.async ? await ${R}(${i}) : ${R}(${i}))` : t._`${R}(${i})`,
                k = t._`(typeof ${R} == "function" ? ${g} : ${R}.test(${i}))`;
              return t._`${R} && ${R} !== true && ${f} === ${a} && !${k}`;
            }
          }
          function p() {
            let h = y.formats[schema];
            if (!h) {
              C();
              return;
            }
            if (h === !0) return;
            let [S, f, R] = b(h);
            if (S === a) s.pass(g());
            function C() {
              if (opts.strictSchema === !1) {
                y.logger.warn(k());
                return;
              }
              throw Error(k());
              function k() {
                return `unknown format "${schema}" ignored in schema at path "${errSchemaPath}"`;
              }
            }
            function b(k) {
              let V =
                  k instanceof RegExp
                    ? (0, t.regexpCode)(k)
                    : opts.code.formats
                      ? t._`${opts.code.formats}${(0, t.getProperty)(schema)}`
                      : void 0,
                scopeValue = gen.scopeValue("formats", { key: schema, ref: k, code: V });
              if (typeof k == "object" && !(k instanceof RegExp))
                return [k.type || "string", k.validate, t._`${scopeValue}.validate`];
              return ["string", k, scopeValue];
            }
            function g() {
              if (typeof h == "object" && !(h instanceof RegExp) && h.async) {
                if (!schemaEnv.$async) throw Error("async format in sync schema");
                return t._`await ${R}(${i})`;
              }
              return typeof f == "function" ? t._`${R}(${i})` : t._`${R}.test(${i})`;
            }
          }
        },
      };
    e.default = r;
  }),
  Bi = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = [Yu().default];
    e.default = t;
  }),
  Wi = J((e) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.contentVocabulary = e.metadataVocabulary = void 0),
      (e.metadataVocabulary = [
        "title",
        "description",
        "default",
        "deprecated",
        "readOnly",
        "writeOnly",
        "examples",
      ]),
      (e.contentVocabulary = ["contentMediaType", "contentEncoding", "contentSchema"]));
  }),
  Xu = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = Vi(),
      r = xi(),
      s = Gi(),
      a = Bi(),
      n = Wi(),
      i = [t.default, r.default, (0, s.default)(), a.default, n.metadataVocabulary, n.contentVocabulary];
    e.default = i;
  }),
  Zu = J((e) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }), (e.DiscrError = void 0));
    var t;
    (function (r) {
      ((r.Tag = "tag"), (r.Mapping = "mapping"));
    })(t || (e.DiscrError = t = {}));
  }),
  Yi = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = te(),
      r = Zu(),
      s = va(),
      a = ao(),
      n = ne(),
      i = {
        keyword: "discriminator",
        type: "object",
        schemaType: "object",
        error: {
          message: ({ params: { discrError: l, tagName: c } }) =>
            l === r.DiscrError.Tag ? `tag "${c}" must be string` : `value of tag "${c}" must be in oneOf`,
          params: ({ params: { discrError: l, tag: c, tagName: d } }) =>
            t._`{error: ${l}, tag: ${d}, tagValue: ${c}}`,
        },
        code(l) {
          let { gen: gen, data: d, schema: schema, parentSchema: parentSchema, it: it } = l,
            { oneOf: oneOf } = parentSchema;
          if (!it.opts.discriminator) throw Error("discriminator: requires discriminator option");
          let propertyName = schema.propertyName;
          if (typeof propertyName != "string") throw Error("discriminator: requires propertyName");
          if (schema.mapping) throw Error("discriminator: mapping is not supported");
          if (!oneOf) throw Error("discriminator: requires oneOf keyword");
          let v = gen.let("valid", !1),
            p = gen.const("tag", t._`${d}${(0, t.getProperty)(propertyName)}`);
          (gen.if(
            t._`typeof ${p} == "string"`,
            () => h(),
            () => l.error(!1, { discrError: r.DiscrError.Tag, tag: p, tagName: propertyName }),
          ),
            l.ok(v));
          function h() {
            let R = f();
            gen.if(!1);
            for (let key in R) (gen.elseIf(t._`${p} === ${key}`), gen.assign(v, S(R[key])));
            (gen.else(),
              l.error(!1, { discrError: r.DiscrError.Mapping, tag: p, tagName: propertyName }),
              gen.endIf());
          }
          function S(R) {
            let C = gen.name("valid"),
              subschema = l.subschema({ keyword: "oneOf", schemaProp: R }, C);
            return (l.mergeEvaluated(subschema, t.Name), C);
          }
          function f() {
            var R;
            let C = {},
              b = k(parentSchema),
              g = !0;
            for (let N = 0; N < oneOf.length; N++) {
              let x = oneOf[N];
              if (
                (x === null || x === void 0 ? void 0 : x.$ref) &&
                !(0, n.schemaHasRulesButRef)(x, it.self.RULES)
              ) {
                let $ref = x.$ref;
                if (
                  ((x = s.resolveRef.call(it.self, it.schemaEnv.root, it.baseId, $ref)),
                  x instanceof s.SchemaEnv)
                )
                  x = x.schema;
                if (x === void 0) throw new a.default(it.opts.uriResolver, it.baseId, $ref);
              }
              let W =
                (R = x === null || x === void 0 ? void 0 : x.properties) === null || R === void 0
                  ? void 0
                  : R[propertyName];
              if (typeof W != "object")
                throw Error(
                  `discriminator: oneOf subschemas (or referenced schemas) must have "properties/${propertyName}"`,
                );
              ((g = g && (b || k(x))), V(W, N));
            }
            if (!g) throw Error(`discriminator: "${propertyName}" must be required`);
            return C;
            function k({ required: required }) {
              return Array.isArray(required) && required.includes(propertyName);
            }
            function V(N, x) {
              if (N.const) H(N.const, x);
              else if (N.enum) for (let W of N.enum) H(W, x);
              else throw Error(`discriminator: "properties/${propertyName}" must have "const" or "enum"`);
            }
            function H(N, x) {
              if (typeof N != "string" || N in C)
                throw Error(`discriminator: "${propertyName}" values must be unique strings`);
              C[N] = x;
            }
          }
        },
      };
    e.default = i;
  }),
  Qu = J((e, t) => {
    t.exports = {
      $schema: "http://json-schema.org/draft-07/schema#",
      $id: "http://json-schema.org/draft-07/schema#",
      title: "Core schema meta-schema",
      definitions: {
        schemaArray: { type: "array", minItems: 1, items: { $ref: "#" } },
        nonNegativeInteger: { type: "integer", minimum: 0 },
        nonNegativeIntegerDefault0: { allOf: [{ $ref: "#/definitions/nonNegativeInteger" }, { default: 0 }] },
        simpleTypes: { enum: ["array", "boolean", "integer", "null", "number", "object", "string"] },
        stringArray: { type: "array", items: { type: "string" }, uniqueItems: !0, default: [] },
      },
      type: ["object", "boolean"],
      properties: {
        $id: { type: "string", format: "uri-reference" },
        $schema: { type: "string", format: "uri" },
        $ref: { type: "string", format: "uri-reference" },
        $comment: { type: "string" },
        title: { type: "string" },
        description: { type: "string" },
        default: !0,
        readOnly: { type: "boolean", default: !1 },
        examples: { type: "array", items: !0 },
        multipleOf: { type: "number", exclusiveMinimum: 0 },
        maximum: { type: "number" },
        exclusiveMaximum: { type: "number" },
        minimum: { type: "number" },
        exclusiveMinimum: { type: "number" },
        maxLength: { $ref: "#/definitions/nonNegativeInteger" },
        minLength: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
        pattern: { type: "string", format: "regex" },
        additionalItems: { $ref: "#" },
        items: { anyOf: [{ $ref: "#" }, { $ref: "#/definitions/schemaArray" }], default: !0 },
        maxItems: { $ref: "#/definitions/nonNegativeInteger" },
        minItems: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
        uniqueItems: { type: "boolean", default: !1 },
        contains: { $ref: "#" },
        maxProperties: { $ref: "#/definitions/nonNegativeInteger" },
        minProperties: { $ref: "#/definitions/nonNegativeIntegerDefault0" },
        required: { $ref: "#/definitions/stringArray" },
        additionalProperties: { $ref: "#" },
        definitions: { type: "object", additionalProperties: { $ref: "#" }, default: {} },
        properties: { type: "object", additionalProperties: { $ref: "#" }, default: {} },
        patternProperties: {
          type: "object",
          additionalProperties: { $ref: "#" },
          propertyNames: { format: "regex" },
          default: {},
        },
        dependencies: {
          type: "object",
          additionalProperties: { anyOf: [{ $ref: "#" }, { $ref: "#/definitions/stringArray" }] },
        },
        propertyNames: { $ref: "#" },
        const: !0,
        enum: { type: "array", items: !0, minItems: 1, uniqueItems: !0 },
        type: {
          anyOf: [
            { $ref: "#/definitions/simpleTypes" },
            { type: "array", items: { $ref: "#/definitions/simpleTypes" }, minItems: 1, uniqueItems: !0 },
          ],
        },
        format: { type: "string" },
        contentMediaType: { type: "string" },
        contentEncoding: { type: "string" },
        if: { $ref: "#" },
        then: { $ref: "#" },
        else: { $ref: "#" },
        allOf: { $ref: "#/definitions/schemaArray" },
        anyOf: { $ref: "#/definitions/schemaArray" },
        oneOf: { $ref: "#/definitions/schemaArray" },
        not: { $ref: "#" },
      },
      default: !0,
    };
  }),
  Xi = J((e, t) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.MissingRefError =
        e.ValidationError =
        e.CodeGen =
        e.Name =
        e.nil =
        e.stringify =
        e.str =
        e._ =
        e.KeywordCxt =
        e.Ajv =
          void 0));
    let r = Di(),
      s = Xu(),
      a = Yi(),
      n = Qu(),
      i = ["/properties"],
      l = "http://json-schema.org/draft-07/schema";
    var c = class extends r.default {
      _addVocabularies() {
        if (
          (super._addVocabularies(), s.default.forEach((P) => this.addVocabulary(P)), this.opts.discriminator)
        )
          this.addKeyword(a.default);
      }
      _addDefaultMetaSchema() {
        if ((super._addDefaultMetaSchema(), !this.opts.meta)) return;
        let P = this.opts.$data ? this.$dataMetaSchema(n, i) : n;
        (this.addMetaSchema(P, l, !1), (this.refs["http://json-schema.org/schema"] = l));
      }
      defaultMeta() {
        return (this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(l) ? l : void 0));
      }
    };
    ((e.Ajv = c),
      (t.exports = e = c),
      (t.exports.Ajv = c),
      Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.default = c));
    var d = so();
    Object.defineProperty(e, "KeywordCxt", {
      enumerable: !0,
      get: function () {
        return d.KeywordCxt;
      },
    });
    var m = te();
    (Object.defineProperty(e, "_", {
      enumerable: !0,
      get: function () {
        return m._;
      },
    }),
      Object.defineProperty(e, "str", {
        enumerable: !0,
        get: function () {
          return m.str;
        },
      }),
      Object.defineProperty(e, "stringify", {
        enumerable: !0,
        get: function () {
          return m.stringify;
        },
      }),
      Object.defineProperty(e, "nil", {
        enumerable: !0,
        get: function () {
          return m.nil;
        },
      }),
      Object.defineProperty(e, "Name", {
        enumerable: !0,
        get: function () {
          return m.Name;
        },
      }),
      Object.defineProperty(e, "CodeGen", {
        enumerable: !0,
        get: function () {
          return m.CodeGen;
        },
      }));
    var _ = ya();
    Object.defineProperty(e, "ValidationError", {
      enumerable: !0,
      get: function () {
        return _.default;
      },
    });
    var w = ao();
    Object.defineProperty(e, "MissingRefError", {
      enumerable: !0,
      get: function () {
        return w.default;
      },
    });
  }),
  Zi = J((e) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }), (e.dynamicAnchor = void 0));
    let t = te(),
      r = Le(),
      s = va(),
      a = _n(),
      n = { keyword: "$dynamicAnchor", schemaType: "string", code: (c) => i(c, c.schema) };
    function i(c, d) {
      let { gen: gen, it: it } = c;
      it.schemaEnv.root.dynamicAnchors[d] = !0;
      let w = t._`${r.default.dynamicAnchors}${(0, t.getProperty)(d)}`,
        P = it.errSchemaPath === "#" ? it.validateName : l(c);
      gen.if(t._`!${w}`, () => gen.assign(w, P));
    }
    e.dynamicAnchor = i;
    function l(c) {
      let { schemaEnv: schemaEnv, schema: schema, self: _ } = c.it,
        { root: root, baseId: baseId, localRefs: localRefs, meta: meta } = schemaEnv.root,
        { schemaId: schemaId } = _.opts,
        h = new s.SchemaEnv({
          schema: schema,
          schemaId: schemaId,
          root: root,
          baseId: baseId,
          localRefs: localRefs,
          meta: meta,
        });
      return (s.compileSchema.call(_, h), (0, a.getValidate)(c, h));
    }
    e.default = n;
  }),
  Qi = J((e) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }), (e.dynamicRef = void 0));
    let t = te(),
      r = Le(),
      s = _n(),
      a = { keyword: "$dynamicRef", schemaType: "string", code: (i) => n(i, i.schema) };
    function n(i, l) {
      let { gen: gen, keyword: keyword, it: it } = i;
      if (l[0] !== "#") throw Error(`"${keyword}" only supports hash fragment reference`);
      let sliced = l.slice(1);
      if (it.allErrors) w();
      else {
        let y = gen.let("valid", !1);
        (w(y), i.ok(y));
      }
      function w(y) {
        if (it.schemaEnv.root.dynamicAnchors[sliced]) {
          let v = gen.let("_v", t._`${r.default.dynamicAnchors}${(0, t.getProperty)(sliced)}`);
          gen.if(v, P(v, y), P(it.validateName, y));
        } else P(it.validateName, y)();
      }
      function P(y, v) {
        return v
          ? () =>
              gen.block(() => {
                ((0, s.callRef)(i, y), gen.let(v, !0));
              })
          : () => (0, s.callRef)(i, y);
      }
    }
    ((e.dynamicRef = n), (e.default = a));
  }),
  ed = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = Zi(),
      r = ne(),
      s = {
        keyword: "$recursiveAnchor",
        schemaType: "boolean",
        code(a) {
          if (a.schema) (0, t.dynamicAnchor)(a, "");
          else (0, r.checkStrictMode)(a.it, "$recursiveAnchor: false is ignored");
        },
      };
    e.default = s;
  }),
  td = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = Qi(),
      r = { keyword: "$recursiveRef", schemaType: "string", code: (s) => (0, t.dynamicRef)(s, s.schema) };
    e.default = r;
  }),
  rd = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = Zi(),
      r = Qi(),
      s = ed(),
      a = td(),
      n = [t.default, r.default, s.default, a.default];
    e.default = n;
  }),
  od = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = vn(),
      r = {
        keyword: "dependentRequired",
        type: "object",
        schemaType: "object",
        error: t.error,
        code: (s) => (0, t.validatePropertyDeps)(s),
      };
    e.default = r;
  }),
  sd = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = vn(),
      r = {
        keyword: "dependentSchemas",
        type: "object",
        schemaType: "object",
        code: (s) => (0, t.validateSchemaDeps)(s),
      };
    e.default = r;
  }),
  ad = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = ne(),
      r = {
        keyword: ["maxContains", "minContains"],
        type: "array",
        schemaType: "number",
        code({ keyword: s, parentSchema: a, it: n }) {
          if (a.contains === void 0) (0, t.checkStrictMode)(n, `"${s}" without "contains" is ignored`);
        },
      };
    e.default = r;
  }),
  nd = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = od(),
      r = sd(),
      s = ad(),
      a = [t.default, r.default, s.default];
    e.default = a;
  }),
  id = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = te(),
      r = ne(),
      s = Le(),
      a = {
        keyword: "unevaluatedProperties",
        type: "object",
        schemaType: ["boolean", "object"],
        trackErrors: !0,
        error: {
          message: "must NOT have unevaluated properties",
          params: ({ params: params }) => t._`{unevaluatedProperty: ${params.unevaluatedProperty}}`,
        },
        code(n) {
          let { gen: gen, schema: schema, data: c, errsCount: errsCount, it: it } = n;
          if (!errsCount) throw Error("ajv implementation error");
          let { allErrors: allErrors, props: props } = it;
          if (props instanceof t.Name)
            gen.if(t._`${props} !== true`, () => gen.forIn("key", c, (p) => gen.if(y(props, p), () => P(p))));
          else if (props !== !0)
            gen.forIn("key", c, (p) => (props === void 0 ? P(p) : gen.if(v(props, p), () => P(p))));
          ((it.props = !0), n.ok(t._`${errsCount} === ${s.default.errors}`));
          function P(p) {
            if (schema === !1) {
              if ((n.setParams({ unevaluatedProperty: p }), n.error(), !allErrors)) gen.break();
              return;
            }
            if (!(0, r.alwaysValidSchema)(it, schema)) {
              let h = gen.name("valid");
              if (
                (n.subschema({ keyword: "unevaluatedProperties", dataProp: p, dataPropType: r.Type.Str }, h),
                !allErrors)
              )
                gen.if((0, t.not)(h), () => gen.break());
            }
          }
          function y(p, h) {
            return t._`!${p} || !${p}[${h}]`;
          }
          function v(p, h) {
            let S = [];
            for (let key in p) if (p[key] === !0) S.push(t._`${h} !== ${key}`);
            return (0, t.and)(...S);
          }
        },
      };
    e.default = a;
  }),
  cd = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = te(),
      r = ne(),
      s = {
        keyword: "unevaluatedItems",
        type: "array",
        schemaType: ["boolean", "object"],
        error: {
          message: ({ params: { len: a } }) => t.str`must NOT have more than ${a} items`,
          params: ({ params: { len: a } }) => t._`{limit: ${a}}`,
        },
        code(a) {
          let { gen: gen, schema: schema, data: l, it: it } = a,
            d = it.items || 0;
          if (d === !0) return;
          let m = gen.const("len", t._`${l}.length`);
          if (schema === !1) (a.setParams({ len: d }), a.fail(t._`${m} > ${d}`));
          else if (typeof schema == "object" && !(0, r.alwaysValidSchema)(it, schema)) {
            let w = gen.var("valid", t._`${m} <= ${d}`);
            (gen.if((0, t.not)(w), () => _(w, d)), a.ok(w));
          }
          it.items = !0;
          function _(w, P) {
            gen.forRange("i", P, m, (y) => {
              if (
                (a.subschema({ keyword: "unevaluatedItems", dataProp: y, dataPropType: r.Type.Num }, w),
                !it.allErrors)
              )
                gen.if((0, t.not)(w), () => gen.break());
            });
          }
        },
      };
    e.default = s;
  }),
  ld = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = id(),
      r = cd(),
      s = [t.default, r.default];
    e.default = s;
  }),
  ud = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = Vi(),
      r = xi(),
      s = Gi(),
      a = rd(),
      n = nd(),
      i = ld(),
      l = Bi(),
      c = Wi(),
      d = [
        a.default,
        t.default,
        r.default,
        (0, s.default)(!0),
        l.default,
        c.metadataVocabulary,
        c.contentVocabulary,
        n.default,
        i.default,
      ];
    e.default = d;
  }),
  dd = J((e, t) => {
    t.exports = {
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
  }),
  hd = J((e, t) => {
    t.exports = {
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
  }),
  md = J((e, t) => {
    t.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/unevaluated",
      $vocabulary: { "https://json-schema.org/draft/2020-12/vocab/unevaluated": !0 },
      $dynamicAnchor: "meta",
      title: "Unevaluated applicator vocabulary meta-schema",
      type: ["object", "boolean"],
      properties: {
        unevaluatedItems: { $dynamicRef: "#meta" },
        unevaluatedProperties: { $dynamicRef: "#meta" },
      },
    };
  }),
  pd = J((e, t) => {
    t.exports = {
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
  }),
  fd = J((e, t) => {
    t.exports = {
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
  }),
  Sd = J((e, t) => {
    t.exports = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      $id: "https://json-schema.org/draft/2020-12/meta/format-annotation",
      $vocabulary: { "https://json-schema.org/draft/2020-12/vocab/format-annotation": !0 },
      $dynamicAnchor: "meta",
      title: "Format vocabulary meta-schema for annotation results",
      type: ["object", "boolean"],
      properties: { format: { type: "string" } },
    };
  }),
  gd = J((e, t) => {
    t.exports = {
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
  }),
  _d = J((e, t) => {
    t.exports = {
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
    };
  }),
  yd = J((e) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let t = dd(),
      r = hd(),
      s = md(),
      a = pd(),
      n = fd(),
      i = Sd(),
      l = gd(),
      c = _d(),
      d = ["/properties"];
    function m(_) {
      return (
        [t, r, s, a, n, w(this, i), l, w(this, c)].forEach((P) => this.addMetaSchema(P, void 0, !1)),
        this
      );
      function w(P, y) {
        return _ ? P.$dataMetaSchema(y, d) : y;
      }
    }
    e.default = m;
  }),
  vd = J((e, t) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.MissingRefError =
        e.ValidationError =
        e.CodeGen =
        e.Name =
        e.nil =
        e.stringify =
        e.str =
        e._ =
        e.KeywordCxt =
        e.Ajv2020 =
          void 0));
    let r = Di(),
      s = ud(),
      a = Yi(),
      n = yd(),
      i = "https://json-schema.org/draft/2020-12/schema";
    var l = class extends r.default {
      constructor(w = {}) {
        super({ ...w, dynamicRef: !0, next: !0, unevaluated: !0 });
      }
      _addVocabularies() {
        if (
          (super._addVocabularies(), s.default.forEach((w) => this.addVocabulary(w)), this.opts.discriminator)
        )
          this.addKeyword(a.default);
      }
      _addDefaultMetaSchema() {
        super._addDefaultMetaSchema();
        let { $data: $data, meta: meta } = this.opts;
        if (!meta) return;
        (n.default.call(this, $data), (this.refs["http://json-schema.org/schema"] = i));
      }
      defaultMeta() {
        return (this.opts.defaultMeta = super.defaultMeta() || (this.getSchema(i) ? i : void 0));
      }
    };
    ((e.Ajv2020 = l),
      (t.exports = e = l),
      (t.exports.Ajv2020 = l),
      Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.default = l));
    var c = so();
    Object.defineProperty(e, "KeywordCxt", {
      enumerable: !0,
      get: function () {
        return c.KeywordCxt;
      },
    });
    var d = te();
    (Object.defineProperty(e, "_", {
      enumerable: !0,
      get: function () {
        return d._;
      },
    }),
      Object.defineProperty(e, "str", {
        enumerable: !0,
        get: function () {
          return d.str;
        },
      }),
      Object.defineProperty(e, "stringify", {
        enumerable: !0,
        get: function () {
          return d.stringify;
        },
      }),
      Object.defineProperty(e, "nil", {
        enumerable: !0,
        get: function () {
          return d.nil;
        },
      }),
      Object.defineProperty(e, "Name", {
        enumerable: !0,
        get: function () {
          return d.Name;
        },
      }),
      Object.defineProperty(e, "CodeGen", {
        enumerable: !0,
        get: function () {
          return d.CodeGen;
        },
      }));
    var m = ya();
    Object.defineProperty(e, "ValidationError", {
      enumerable: !0,
      get: function () {
        return m.default;
      },
    });
    var _ = ao();
    Object.defineProperty(e, "MissingRefError", {
      enumerable: !0,
      get: function () {
        return _.default;
      },
    });
  }),
  bd = J((e) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }),
      (e.formatNames = e.fastFormats = e.fullFormats = void 0));
    function t(N, x) {
      return { validate: N, compare: x };
    }
    ((e.fullFormats = {
      date: t(n, i),
      time: t(c(!0), d),
      "date-time": t(w(!0), P),
      "iso-time": t(c(), m),
      "iso-date-time": t(w(), y),
      duration: /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/,
      uri: h,
      "uri-reference":
        /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,
      "uri-template":
        /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
      url: /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
      email:
        /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
      hostname:
        /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,
      ipv4: /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/,
      ipv6: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,
      regex: H,
      uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
      "json-pointer": /^(?:\/(?:[^~/]|~0|~1)*)*$/,
      "json-pointer-uri-fragment": /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
      "relative-json-pointer": /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
      byte: f,
      int32: { type: "number", validate: b },
      int64: { type: "number", validate: g },
      float: { type: "number", validate: k },
      double: { type: "number", validate: k },
      password: !0,
      binary: !0,
    }),
      (e.fastFormats = {
        ...e.fullFormats,
        date: t(/^\d\d\d\d-[0-1]\d-[0-3]\d$/, i),
        time: t(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, d),
        "date-time": t(
          /^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i,
          P,
        ),
        "iso-time": t(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, m),
        "iso-date-time": t(
          /^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i,
          y,
        ),
        uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
        "uri-reference": /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
        email:
          /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i,
      }),
      (e.formatNames = Object.keys(e.fullFormats)));
    function r(N) {
      return N % 4 === 0 && (N % 100 !== 0 || N % 400 === 0);
    }
    let s = /^(\d\d\d\d)-(\d\d)-(\d\d)$/,
      a = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    function n(N) {
      let match = s.exec(N);
      if (!match) return !1;
      let W = +match[1],
        B = +match[2],
        se = +match[3];
      return B >= 1 && B <= 12 && se >= 1 && se <= (B === 2 && r(W) ? 29 : a[B]);
    }
    function i(N, x) {
      if (!(N && x)) return;
      if (N > x) return 1;
      if (N < x) return -1;
      return 0;
    }
    let l = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;
    function c(N) {
      return function (W) {
        let match = l.exec(W);
        if (!match) return !1;
        let se = +match[1],
          le = +match[2],
          ie = +match[3],
          Se = match[4],
          ae = match[5] === "-" ? -1 : 1,
          O = +(match[6] || 0),
          L = +(match[7] || 0);
        if (O > 23 || L > 59 || (N && !Se)) return !1;
        if (se <= 23 && le <= 59 && ie < 60) return !0;
        let K = le - L * ae,
          z = se - O * ae - (K < 0 ? 1 : 0);
        return (z === 23 || z === -1) && (K === 59 || K === -1) && ie < 61;
      };
    }
    function d(N, x) {
      if (!(N && x)) return;
      let W = new Date("2020-01-01T" + N).valueOf(),
        B = new Date("2020-01-01T" + x).valueOf();
      if (!(W && B)) return;
      return W - B;
    }
    function m(N, x) {
      if (!(N && x)) return;
      let match = l.exec(N),
        match_2 = l.exec(x);
      if (!(match && match_2)) return;
      if (((N = match[1] + match[2] + match[3]), (x = match_2[1] + match_2[2] + match_2[3]), N > x)) return 1;
      if (N < x) return -1;
      return 0;
    }
    let _ = /t|\s/i;
    function w(N) {
      let x = c(N);
      return function (B) {
        let parts = B.split(_);
        return parts.length === 2 && n(parts[0]) && x(parts[1]);
      };
    }
    function P(N, x) {
      if (!(N && x)) return;
      let W = new Date(N).valueOf(),
        B = new Date(x).valueOf();
      if (!(W && B)) return;
      return W - B;
    }
    function y(N, x) {
      if (!(N && x)) return;
      let [W, B] = N.split(_),
        [se, le] = x.split(_),
        ie = i(W, se);
      if (ie === void 0) return;
      return ie || d(B, le);
    }
    let v = /\/|:/,
      p =
        /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
    function h(N) {
      return v.test(N) && p.test(N);
    }
    let S = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;
    function f(N) {
      return ((S.lastIndex = 0), S.test(N));
    }
    let R = -2147483648,
      C = 2147483647;
    function b(N) {
      return Number.isInteger(N) && N <= C && N >= R;
    }
    function g(N) {
      return Number.isInteger(N);
    }
    function k() {
      return !0;
    }
    let V = /[^\\]\\Z/;
    function H(N) {
      if (V.test(N)) return !1;
      try {
        return (new RegExp(N), !0);
      } catch (error) {
        return !1;
      }
    }
  }),
  Rd = J((e) => {
    (Object.defineProperty(e, "__esModule", { value: !0 }), (e.formatLimitDefinition = void 0));
    let t = Xi(),
      r = te(),
      operators = r.operators,
      a = {
        formatMaximum: { okStr: "<=", ok: operators.LTE, fail: operators.GT },
        formatMinimum: { okStr: ">=", ok: operators.GTE, fail: operators.LT },
        formatExclusiveMaximum: { okStr: "<", ok: operators.LT, fail: operators.GTE },
        formatExclusiveMinimum: { okStr: ">", ok: operators.GT, fail: operators.LTE },
      },
      n = {
        message: ({ keyword: keyword, schemaCode: schemaCode }) =>
          r.str`should be ${a[keyword].okStr} ${schemaCode}`,
        params: ({ keyword: keyword, schemaCode: schemaCode }) =>
          r._`{comparison: ${a[keyword].okStr}, limit: ${schemaCode}}`,
      };
    e.formatLimitDefinition = {
      keyword: Object.keys(a),
      type: "string",
      schemaType: "string",
      $data: !0,
      error: n,
      code(l) {
        let { gen: gen, data: d, schemaCode: schemaCode, keyword: keyword, it: it } = l,
          { opts: opts, self: y } = it;
        if (!opts.validateFormats) return;
        let v = new t.KeywordCxt(it, y.RULES.all.format.definition, "format");
        if (v.$data) p();
        else h();
        function p() {
          let scopeValue = gen.scopeValue("formats", { ref: y.formats, code: opts.code.formats }),
            R = gen.const("fmt", r._`${scopeValue}[${v.schemaCode}]`);
          l.fail$data(
            (0, r.or)(
              r._`typeof ${R} != "object"`,
              r._`${R} instanceof RegExp`,
              r._`typeof ${R}.compare != "function"`,
              S(R),
            ),
          );
        }
        function h() {
          let schema = v.schema,
            R = y.formats[schema];
          if (!R || R === !0) return;
          if (typeof R != "object" || R instanceof RegExp || typeof R.compare != "function")
            throw Error(`"${keyword}": format "${schema}" does not define "compare" function`);
          let scopeValue = gen.scopeValue("formats", {
            key: schema,
            ref: R,
            code: opts.code.formats ? r._`${opts.code.formats}${(0, r.getProperty)(schema)}` : void 0,
          });
          l.fail$data(S(scopeValue));
        }
        function S(f) {
          return r._`${f}.compare(${d}, ${schemaCode}) ${a[keyword].fail} 0`;
        }
      },
      dependencies: ["format"],
    };
    let i = (l) => (l.addKeyword(e.formatLimitDefinition), l);
    e.default = i;
  }),
  zd = J((e, t) => {
    Object.defineProperty(e, "__esModule", { value: !0 });
    let r = bd(),
      s = Rd(),
      a = te(),
      n = new a.Name("fullFormats"),
      i = new a.Name("fastFormats"),
      l = (d, m = { keywords: !0 }) => {
        if (Array.isArray(m)) return (c(d, m, r.fullFormats, n), d);
        let [_, w] = m.mode === "fast" ? [r.fastFormats, i] : [r.fullFormats, n];
        if ((c(d, m.formats || r.formatNames, _, w), m.keywords)) (0, s.default)(d);
        return d;
      };
    l.get = (d, m = "full") => {
      let _ = (m === "fast" ? r.fastFormats : r.fullFormats)[d];
      if (!_) throw Error(`Unknown format "${d}"`);
      return _;
    };
    function c(d, m, _, w) {
      var P, y;
      ((P = (y = d.opts.code).formats) !== null && P !== void 0) ||
        (y.formats = a._`require("ajv-formats/dist/formats").${w}`);
      for (let v of m) d.addFormat(v, _[v]);
    }
    ((t.exports = e = l), Object.defineProperty(e, "__esModule", { value: !0 }), (e.default = l));
  }),
  wd = Xi(),
  $d = vd(),
  Ed = Eo(zd(), 1),
  Pd = new Set([
    "https://json-schema.org/draft/2020-12/schema",
    "http://json-schema.org/draft/2020-12/schema",
  ]),
  Td = Ed.default;
//@ chunk-zykv69v4.js:416-8167 cjs-fingerprint
var X = x(function (W) {
  Object.defineProperty(W, "__esModule", { value: !0 });
  W.formatNames = W.fastFormats = W.fullFormats = void 0;
  function k(e, t) {
    return { validate: e, compare: t };
  }
  W.fullFormats = {
    date: k(Q, O),
    time: k(M(!0), j),
    "date-time": k(U(!0), K),
    "iso-time": k(M(), B),
    "iso-date-time": k(U(), G),
    duration: /^P(?!$)((\d+Y)?(\d+M)?(\d+D)?(T(?=\d)(\d+H)?(\d+M)?(\d+S)?)?|(\d+W)?)$/,
    uri: we,
    "uri-reference":
      /^(?:[a-z][a-z0-9+\-.]*:)?(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'"()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'"()*+,;=:@]|%[0-9a-f]{2})*)*)?(?:\?(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'"()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i,
    "uri-template":
      /^(?:(?:[^\x00-\x20"'<>%\\^`{|}]|%[0-9a-f]{2})|\{[+#./;?&=,!@|]?(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?(?:,(?:[a-z0-9_]|%[0-9a-f]{2})+(?::[1-9][0-9]{0,3}|\*)?)*\})*$/i,
    url: /^(?:https?|ftp):\/\/(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)(?:\.(?:[a-z0-9\u{00a1}-\u{ffff}]+-)*[a-z0-9\u{00a1}-\u{ffff}]+)*(?:\.(?:[a-z\u{00a1}-\u{ffff}]{2,})))(?::\d{2,5})?(?:\/[^\s]*)?$/iu,
    email:
      /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i,
    hostname:
      /^(?=.{1,253}\.?$)[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[-0-9a-z]{0,61}[0-9a-z])?)*\.?$/i,
    ipv4: /^(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)$/,
    ipv6: /^((([0-9a-f]{1,4}:){7}([0-9a-f]{1,4}|:))|(([0-9a-f]{1,4}:){6}(:[0-9a-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){5}(((:[0-9a-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9a-f]{1,4}:){4}(((:[0-9a-f]{1,4}){1,3})|((:[0-9a-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){3}(((:[0-9a-f]{1,4}){1,4})|((:[0-9a-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){2}(((:[0-9a-f]{1,4}){1,5})|((:[0-9a-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9a-f]{1,4}:){1}(((:[0-9a-f]{1,4}){1,6})|((:[0-9a-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9a-f]{1,4}){1,7})|((:[0-9a-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))$/i,
    regex: Ie,
    uuid: /^(?:urn:uuid:)?[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i,
    "json-pointer": /^(?:\/(?:[^~/]|~0|~1)*)*$/,
    "json-pointer-uri-fragment": /^#(?:\/(?:[a-z0-9_\-.!$&'()*+,;:=@]|%[0-9a-f]{2}|~0|~1)*)*$/i,
    "relative-json-pointer": /^(?:0|[1-9][0-9]*)(?:#|(?:\/(?:[^~/]|~0|~1)*)*)$/,
    byte: Se,
    int32: { type: "number", validate: Ae },
    int64: { type: "number", validate: $e },
    float: { type: "number", validate: J },
    double: { type: "number", validate: J },
    password: !0,
    binary: !0,
  };
  W.fastFormats = {
    ...W.fullFormats,
    date: k(/^\d\d\d\d-[0-1]\d-[0-3]\d$/, O),
    time: k(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i, j),
    "date-time": k(
      /^\d\d\d\d-[0-1]\d-[0-3]\dt(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)$/i,
      K,
    ),
    "iso-time": k(/^(?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i, B),
    "iso-date-time": k(
      /^\d\d\d\d-[0-1]\d-[0-3]\d[t\s](?:[0-2]\d:[0-5]\d:[0-5]\d|23:59:60)(?:\.\d+)?(?:z|[+-]\d\d(?::?\d\d)?)?$/i,
      G,
    ),
    uri: /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/)?[^\s]*$/i,
    "uri-reference": /^(?:(?:[a-z][a-z0-9+\-.]*:)?\/?\/)?(?:[^\\\s#][^\s#]*)?(?:#[^\\\s]*)?$/i,
    email:
      /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)*$/i,
  };
  W.formatNames = Object.keys(W.fullFormats);
  function _e(e) {
    return e % 4 === 0 && (e % 100 !== 0 || e % 400 === 0);
  }
  var ke = /^(\d\d\d\d)-(\d\d)-(\d\d)$/,
    ve = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  function Q(e) {
    let match = ke.exec(e);
    if (!match) return !1;
    let r = +match[1],
      a = +match[2],
      n = +match[3];
    return a >= 1 && a <= 12 && n >= 1 && n <= (a === 2 && _e(r) ? 29 : ve[a]);
  }
  function O(e, t) {
    if (!(e && t)) return;
    if (e > t) return 1;
    if (e < t) return -1;
    return 0;
  }
  var E = /^(\d\d):(\d\d):(\d\d(?:\.\d+)?)(z|([+-])(\d\d)(?::?(\d\d))?)?$/i;
  function M(e) {
    return function (r) {
      let match = E.exec(r);
      if (!match) return !1;
      let n = +match[1],
        s = +match[2],
        o = +match[3],
        u = match[4],
        p = match[5] === "-" ? -1 : 1,
        i = +(match[6] || 0),
        c = +(match[7] || 0);
      if (i > 23 || c > 59 || (e && !u)) return !1;
      if (n <= 23 && s <= 59 && o < 60) return !0;
      let d = s - c * p,
        f = n - i * p - (d < 0 ? 1 : 0);
      return (f === 23 || f === -1) && (d === 59 || d === -1) && o < 61;
    };
  }
  function j(e, t) {
    if (!(e && t)) return;
    let r = new Date("2020-01-01T" + e).valueOf(),
      a = new Date("2020-01-01T" + t).valueOf();
    if (!(r && a)) return;
    return r - a;
  }
  function B(e, t) {
    if (!(e && t)) return;
    let match = E.exec(e),
      match_2 = E.exec(t);
    if (!(match && match_2)) return;
    if (((e = match[1] + match[2] + match[3]), (t = match_2[1] + match_2[2] + match_2[3]), e > t)) return 1;
    if (e < t) return -1;
    return 0;
  }
  var N = /t|\s/i;
  function U(e) {
    let t = M(e);
    return function (a) {
      let parts = a.split(N);
      return parts.length === 2 && Q(parts[0]) && t(parts[1]);
    };
  }
  function K(e, t) {
    if (!(e && t)) return;
    let r = new Date(e).valueOf(),
      a = new Date(t).valueOf();
    if (!(r && a)) return;
    return r - a;
  }
  function G(e, t) {
    if (!(e && t)) return;
    let [r, a] = e.split(N),
      [n, s] = t.split(N),
      o = O(r, n);
    if (o === void 0) return;
    return o || j(a, s);
  }
  var Te = /\/|:/,
    be =
      /^(?:[a-z][a-z0-9+\-.]*:)(?:\/?\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:]|%[0-9a-f]{2})*@)?(?:\[(?:(?:(?:(?:[0-9a-f]{1,4}:){6}|::(?:[0-9a-f]{1,4}:){5}|(?:[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){4}|(?:(?:[0-9a-f]{1,4}:){0,1}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){3}|(?:(?:[0-9a-f]{1,4}:){0,2}[0-9a-f]{1,4})?::(?:[0-9a-f]{1,4}:){2}|(?:(?:[0-9a-f]{1,4}:){0,3}[0-9a-f]{1,4})?::[0-9a-f]{1,4}:|(?:(?:[0-9a-f]{1,4}:){0,4}[0-9a-f]{1,4})?::)(?:[0-9a-f]{1,4}:[0-9a-f]{1,4}|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?))|(?:(?:[0-9a-f]{1,4}:){0,5}[0-9a-f]{1,4})?::[0-9a-f]{1,4}|(?:(?:[0-9a-f]{1,4}:){0,6}[0-9a-f]{1,4})?::)|[Vv][0-9a-f]+\.[a-z0-9\-._~!$&'()*+,;=:]+)\]|(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)|(?:[a-z0-9\-._~!$&'()*+,;=]|%[0-9a-f]{2})*)(?::\d*)?(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*|\/(?:(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)?|(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})+(?:\/(?:[a-z0-9\-._~!$&'()*+,;=:@]|%[0-9a-f]{2})*)*)(?:\?(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?(?:#(?:[a-z0-9\-._~!$&'()*+,;=:@/?]|%[0-9a-f]{2})*)?$/i;
  function we(e) {
    return Te.test(e) && be.test(e);
  }
  var V = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/gm;
  function Se(e) {
    return ((V.lastIndex = 0), V.test(e));
  }
  var Pe = -2147483648,
    xe = 2147483647;
  function Ae(e) {
    return Number.isInteger(e) && e <= xe && e >= Pe;
  }
  function $e(e) {
    return Number.isInteger(e);
  }
  function J() {
    return !0;
  }
  var De = /[^\\]\\Z/;
  function Ie(e) {
    if (De.test(e)) return !1;
    try {
      return (new RegExp(e), !0);
    } catch (error) {
      return !1;
    }
  }
});

export { $d, Td, Pd, wd, X };

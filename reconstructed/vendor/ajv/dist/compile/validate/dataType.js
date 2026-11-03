/**
 * ajv/dist/compile/validate/dataType.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { pr } from "../rules.js";
import { hr } from "./applicability.js";
import { ct } from "../errors.js";
import { uh } from "../codegen/index.js";
import { ew } from "../util.js";

//@ chunk-s82q9s4x.js:26116-30071 cjs-fingerprint
var ut = x(function (Vs) {
  Object.defineProperty(Vs, "__esModule", { value: !0 });
  Vs.reportTypeError =
    Vs.checkDataTypes =
    Vs.checkDataType =
    Vs.coerceAndCheckDataType =
    Vs.getJSONTypes =
    Vs.getSchemaTypes =
    Vs.DataType =
      void 0;
  var Ts = pr(),
    Cs = hr(),
    Ms = ct(),
    m = uh(),
    Pt = ew(),
    Ue;
  (function (e) {
    ((e[(e.Correct = 0)] = "Correct"), (e[(e.Wrong = 1)] = "Wrong"));
  })(Ue || (Vs.DataType = Ue = {}));
  function Hc(e) {
    let t = As(e.type);
    if (t.includes("null")) {
      if (e.nullable === !1) throw Error("type: null contradicts nullable: false");
    } else {
      if (!t.length && e.nullable !== void 0) throw Error('"nullable" cannot be used without "type"');
      if (e.nullable === !0) t.push("null");
    }
    return t;
  }
  Vs.getSchemaTypes = Hc;
  function As(e) {
    let t = Array.isArray(e) ? e : e ? [e] : [];
    if (t.every(Ts.isJSONType)) return t;
    throw Error("type must be JSONType or JSONType[]: " + t.join(","));
  }
  Vs.getJSONTypes = As;
  function Gc(e, t) {
    let { gen: gen, data: s, opts: opts } = e,
      o = Jc(t, opts.coerceTypes),
      i = t.length > 0 && !(o.length === 0 && t.length === 1 && Cs.schemaHasRulesForType(e, t[0]));
    if (i) {
      let a = yr(t, s, opts.strictNumbers, Ue.Wrong);
      gen.if(a, () => {
        if (o.length) Wc(e, t, o);
        else _r(e);
      });
    }
    return i;
  }
  Vs.coerceAndCheckDataType = Gc;
  var Ds = new Set(["string", "number", "integer", "boolean", "null"]);
  function Jc(e, t) {
    return t ? e.filter((r) => Ds.has(r) || (t === "array" && r === "array")) : [];
  }
  function Wc(e, t, r) {
    let { gen: gen, data: n, opts: opts } = e,
      i = gen.let("dataType", m._`typeof ${n}`),
      a = gen.let("coerced", m._`undefined`);
    if (opts.coerceTypes === "array")
      gen.if(m._`${i} == 'object' && Array.isArray(${n}) && ${n}.length == 1`, () =>
        gen
          .assign(n, m._`${n}[0]`)
          .assign(i, m._`typeof ${n}`)
          .if(yr(t, n, opts.strictNumbers), () => gen.assign(a, n)),
      );
    gen.if(m._`${a} !== undefined`);
    for (let u of r) if (Ds.has(u) || (u === "array" && opts.coerceTypes === "array")) c(u);
    (gen.else(),
      _r(e),
      gen.endIf(),
      gen.if(m._`${a} !== undefined`, () => {
        (gen.assign(n, a), Bc(e, a));
      }));
    function c(u) {
      switch (u) {
        case "string":
          gen
            .elseIf(m._`${i} == "number" || ${i} == "boolean"`)
            .assign(a, m._`"" + ${n}`)
            .elseIf(m._`${n} === null`)
            .assign(a, m._`""`);
          return;
        case "number":
          gen
            .elseIf(
              m._`${i} == "boolean" || ${n} === null
              || (${i} == "string" && ${n} && ${n} == +${n})`,
            )
            .assign(a, m._`+${n}`);
          return;
        case "integer":
          gen
            .elseIf(
              m._`${i} === "boolean" || ${n} === null
              || (${i} === "string" && ${n} && ${n} == +${n} && !(${n} % 1))`,
            )
            .assign(a, m._`+${n}`);
          return;
        case "boolean":
          gen
            .elseIf(m._`${n} === "false" || ${n} === 0 || ${n} === null`)
            .assign(a, !1)
            .elseIf(m._`${n} === "true" || ${n} === 1`)
            .assign(a, !0);
          return;
        case "null":
          (gen.elseIf(m._`${n} === "" || ${n} === 0 || ${n} === false`), gen.assign(a, null));
          return;
        case "array":
          gen
            .elseIf(
              m._`${i} === "string" || ${i} === "number"
              || ${i} === "boolean" || ${n} === null`,
            )
            .assign(a, m._`[${n}]`);
      }
    }
  }
  function Bc({ gen: gen, parentData: parentData, parentDataProperty: parentDataProperty }, s) {
    gen.if(m._`${parentData} !== undefined`, () => gen.assign(m._`${parentData}[${parentDataProperty}]`, s));
  }
  function mr(e, t, r, s = Ue.Correct) {
    let n = s === Ue.Correct ? m.operators.EQ : m.operators.NEQ,
      o;
    switch (e) {
      case "null":
        return m._`${t} ${n} null`;
      case "array":
        o = m._`Array.isArray(${t})`;
        break;
      case "object":
        o = m._`${t} && typeof ${t} == "object" && !Array.isArray(${t})`;
        break;
      case "integer":
        o = i(m._`!(${t} % 1) && !isNaN(${t})`);
        break;
      case "number":
        o = i();
        break;
      default:
        return m._`typeof ${t} ${n} ${e}`;
    }
    return s === Ue.Correct ? o : m.not(o);
    function i(a = m.nil) {
      return m.and(m._`typeof ${t} == "number"`, a, r ? m._`isFinite(${t})` : m.nil);
    }
  }
  Vs.checkDataType = mr;
  function yr(e, t, r, s) {
    if (e.length === 1) return mr(e[0], t, r, s);
    let n,
      toHash = Pt.toHash(e);
    if (toHash.array && toHash.object) {
      let i = m._`typeof ${t} != "object"`;
      ((n = toHash.null ? i : m._`!${t} || ${i}`),
        delete toHash.null,
        delete toHash.array,
        delete toHash.object);
    } else n = m.nil;
    if (toHash.number) delete toHash.integer;
    for (let key in toHash) n = m.and(n, mr(key, t, r, s));
    return n;
  }
  Vs.checkDataTypes = yr;
  var Qc = {
    message: ({ schema: schema }) => `must be ${schema}`,
    params: ({ schema: schema, schemaValue: schemaValue }) =>
      typeof schema == "string" ? m._`{type: ${schema}}` : m._`{type: ${schemaValue}}`,
  };
  function _r(e) {
    let t = Xc(e);
    Ms.reportError(t, Qc);
  }
  Vs.reportTypeError = _r;
  function Xc(e) {
    let { gen: gen, data: r, schema: schema } = e,
      schemaRefOrVal = Pt.schemaRefOrVal(e, schema, "type");
    return {
      gen: gen,
      keyword: "type",
      data: r,
      schema: schema.type,
      schemaCode: schemaRefOrVal,
      schemaValue: schemaRefOrVal,
      parentSchema: schema,
      params: {},
      it: e,
    };
  }
});

export { ut };

/**
 * ajv/dist/compile/util.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { uh } from "./codegen/index.js";
import { it } from "./codegen/code.js";

//@ chunk-s82q9s4x.js:17192-20766 cjs-fingerprint
var ew = x(function (hs) {
  Object.defineProperty(hs, "__esModule", { value: !0 });
  hs.checkStrictMode =
    hs.getErrorPath =
    hs.Type =
    hs.useFunc =
    hs.setEvaluated =
    hs.evaluatedPropsToName =
    hs.mergeEvaluated =
    hs.eachItem =
    hs.unescapeJsonPointer =
    hs.escapeJsonPointer =
    hs.escapeFragment =
    hs.unescapeFragment =
    hs.schemaRefOrVal =
    hs.schemaHasRulesButRef =
    hs.schemaHasRules =
    hs.checkUnknownRules =
    hs.alwaysValidSchema =
    hs.toHash =
      void 0;
  var E = uh(),
    cs = it();
  function Ga(e) {
    let t = {};
    for (let r of e) t[r] = !0;
    return t;
  }
  hs.toHash = Ga;
  function Ja(e, t) {
    if (typeof t == "boolean") return t;
    if (Object.keys(t).length === 0) return !0;
    return (us(e, t), !ls(t, e.self.RULES.all));
  }
  hs.alwaysValidSchema = Ja;
  function us(e, t = e.schema) {
    let { opts: opts, self: s } = e;
    if (!opts.strictSchema) return;
    if (typeof t === "boolean") return;
    let keywords = s.RULES.keywords;
    for (let key in t) if (!keywords[key]) ps(e, `unknown keyword: "${key}"`);
  }
  hs.checkUnknownRules = us;
  function ls(e, t) {
    if (typeof e == "boolean") return !e;
    for (let key in e) if (t[key]) return !0;
    return !1;
  }
  hs.schemaHasRules = ls;
  function Wa(e, t) {
    if (typeof e == "boolean") return !e;
    for (let key in e) if (key !== "$ref" && t.all[key]) return !0;
    return !1;
  }
  hs.schemaHasRulesButRef = Wa;
  function Ba({ topSchemaRef: topSchemaRef, schemaPath: schemaPath }, r, s, n) {
    if (!n) {
      if (typeof r == "number" || typeof r == "boolean") return r;
      if (typeof r == "string") return E._`${r}`;
    }
    return E._`${topSchemaRef}${schemaPath}${E.getProperty(s)}`;
  }
  hs.schemaRefOrVal = Ba;
  function Qa(e) {
    return ds(decodeURIComponent(e));
  }
  hs.unescapeFragment = Qa;
  function Xa(e) {
    return encodeURIComponent(lr(e));
  }
  hs.escapeFragment = Xa;
  function lr(e) {
    if (typeof e == "number") return `${e}`;
    return e.replace(/~/g, "~0").replace(/\//g, "~1");
  }
  hs.escapeJsonPointer = lr;
  function ds(e) {
    return e.replace(/~1/g, "/").replace(/~0/g, "~");
  }
  hs.unescapeJsonPointer = ds;
  function Ya(e, t) {
    if (Array.isArray(e)) for (let r of e) t(r);
    else t(e);
  }
  hs.eachItem = Ya;
  function is({
    mergeNames: mergeNames,
    mergeToName: mergeToName,
    mergeValues: mergeValues,
    resultToName: resultToName,
  }) {
    return (n, o, i, a) => {
      let c =
        i === void 0
          ? o
          : i instanceof E.Name
            ? (o instanceof E.Name ? mergeNames(n, o, i) : mergeToName(n, o, i), i)
            : o instanceof E.Name
              ? (mergeToName(n, i, o), o)
              : mergeValues(o, i);
      return a === E.Name && !(c instanceof E.Name) ? resultToName(n, c) : c;
    };
  }
  hs.mergeEvaluated = {
    props: is({
      mergeNames: (e, t, r) =>
        e.if(E._`${r} !== true && ${t} !== undefined`, () => {
          e.if(
            E._`${t} === true`,
            () => e.assign(r, !0),
            () => e.assign(r, E._`${r} || {}`).code(E._`Object.assign(${r}, ${t})`),
          );
        }),
      mergeToName: (e, t, r) =>
        e.if(E._`${r} !== true`, () => {
          if (t === !0) e.assign(r, !0);
          else (e.assign(r, E._`${r} || {}`), dr(e, r, t));
        }),
      mergeValues: (e, t) => (e === !0 ? !0 : { ...e, ...t }),
      resultToName: fs,
    }),
    items: is({
      mergeNames: (e, t, r) =>
        e.if(E._`${r} !== true && ${t} !== undefined`, () =>
          e.assign(r, E._`${t} === true ? true : ${r} > ${t} ? ${r} : ${t}`),
        ),
      mergeToName: (e, t, r) =>
        e.if(E._`${r} !== true`, () => e.assign(r, t === !0 ? !0 : E._`${r} > ${t} ? ${r} : ${t}`)),
      mergeValues: (e, t) => (e === !0 ? !0 : Math.max(e, t)),
      resultToName: (e, t) => e.var("items", t),
    }),
  };
  function fs(e, t) {
    if (t === !0) return e.var("props", !0);
    let r = e.var("props", E._`{}`);
    if (t !== void 0) dr(e, r, t);
    return r;
  }
  hs.evaluatedPropsToName = fs;
  function dr(e, t, r) {
    Object.keys(r).forEach((s) => e.assign(E._`${t}${E.getProperty(s)}`, !0));
  }
  hs.setEvaluated = dr;
  var as = {};
  function Za(e, t) {
    return e.scopeValue("func", { ref: t, code: as[t.code] || (as[t.code] = new cs._Code(t.code)) });
  }
  hs.useFunc = Za;
  var ur;
  (function (e) {
    ((e[(e.Num = 0)] = "Num"), (e[(e.Str = 1)] = "Str"));
  })(ur || (hs.Type = ur = {}));
  function ec(e, t, r) {
    if (e instanceof E.Name) {
      let s = t === ur.Num;
      return r
        ? s
          ? E._`"[" + ${e} + "]"`
          : E._`"['" + ${e} + "']"`
        : s
          ? E._`"/" + ${e}`
          : E._`"/" + ${e}.replace(/~/g, "~0").replace(/\\//g, "~1")`;
    }
    return r ? E.getProperty(e).toString() : "/" + lr(e);
  }
  hs.getErrorPath = ec;
  function ps(e, t, r = e.opts.strictSchema) {
    if (!r) return;
    if (((t = `strict mode: ${t}`), r === !0)) throw Error(t);
    e.self.logger.warn(t);
  }
  hs.checkStrictMode = ps;
});

export { ew };

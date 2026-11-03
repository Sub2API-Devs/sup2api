/**
 * ajv/dist/vocabularies/code.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { uh } from "../compile/codegen/index.js";
import { ew } from "../compile/util.js";
import { DPe } from "../compile/names.js";

//@ chunk-s82q9s4x.js:30715-33752 cjs-fingerprint
var Q = x(function (Bs) {
  Object.defineProperty(Bs, "__esModule", { value: !0 });
  Bs.validateUnion =
    Bs.validateArray =
    Bs.usePattern =
    Bs.callValidateCode =
    Bs.schemaProperties =
    Bs.allSchemaProperties =
    Bs.noPropertyInData =
    Bs.propertyInData =
    Bs.isOwnProperty =
    Bs.hasPropFunc =
    Bs.reportMissingProp =
    Bs.checkMissingProp =
    Bs.checkReportMissingProp =
      void 0;
  var S = uh(),
    Ke = ew(),
    $e = DPe(),
    Gs = ew();
  function ou(e, t) {
    let { gen: gen, data: s, it: it } = e;
    gen.if($r(gen, s, t, it.opts.ownProperties), () => {
      (e.setParams({ missingProperty: S._`${t}` }, !0), e.error());
    });
  }
  Bs.checkReportMissingProp = ou;
  function iu({ gen: gen, data: t, it: { opts: r } }, s, n) {
    return S.or(...s.map((o) => S.and($r(gen, t, o, r.ownProperties), S._`${n} = ${o}`)));
  }
  Bs.checkMissingProp = iu;
  function au(e, t) {
    (e.setParams({ missingProperty: t }, !0), e.error());
  }
  Bs.reportMissingProp = au;
  function Js(e) {
    return e.scopeValue("func", {
      ref: Object.prototype.hasOwnProperty,
      code: S._`Object.prototype.hasOwnProperty`,
    });
  }
  Bs.hasPropFunc = Js;
  function gr(e, t, r) {
    return S._`${Js(e)}.call(${t}, ${r})`;
  }
  Bs.isOwnProperty = gr;
  function cu(e, t, r, s) {
    let n = S._`${t}${S.getProperty(r)} !== undefined`;
    return s ? S._`${n} && ${gr(e, t, r)}` : n;
  }
  Bs.propertyInData = cu;
  function $r(e, t, r, s) {
    let n = S._`${t}${S.getProperty(r)} === undefined`;
    return s ? S.or(n, S.not(gr(e, t, r))) : n;
  }
  Bs.noPropertyInData = $r;
  function Ws(e) {
    return e ? Object.keys(e).filter((t) => t !== "__proto__") : [];
  }
  Bs.allSchemaProperties = Ws;
  function uu(e, t) {
    return Ws(t).filter((r) => !Ke.alwaysValidSchema(e, t[r]));
  }
  Bs.schemaProperties = uu;
  function lu(
    { schemaCode: schemaCode, data: t, it: { gen: r, topSchemaRef: s, schemaPath: n, errorPath: o }, it: it },
    a,
    c,
    u,
  ) {
    let l = u ? S._`${schemaCode}, ${t}, ${s}${n}` : t,
      f = [
        [$e.default.instancePath, S.strConcat($e.default.instancePath, o)],
        [$e.default.parentData, it.parentData],
        [$e.default.parentDataProperty, it.parentDataProperty],
        [$e.default.rootData, $e.default.rootData],
      ];
    if (it.opts.dynamicRef) f.push([$e.default.dynamicAnchors, $e.default.dynamicAnchors]);
    let b = S._`${l}, ${r.object(...f)}`;
    return c !== S.nil ? S._`${a}.call(${c}, ${b})` : S._`${a}(${b})`;
  }
  Bs.callValidateCode = lu;
  var du = S._`new RegExp`;
  function fu({ gen: gen, it: { opts: t } }, r) {
    let s = t.unicodeRegExp ? "u" : "",
      { regExp: regExp } = t.code,
      o = regExp(r, s);
    return gen.scopeValue("pattern", {
      key: o.toString(),
      ref: o,
      code: S._`${regExp.code === "new RegExp" ? du : Gs.useFunc(gen, regExp)}(${r}, ${s})`,
    });
  }
  Bs.usePattern = fu;
  function pu(e) {
    let { gen: gen, data: r, keyword: keyword, it: it } = e,
      o = gen.name("valid");
    if (it.allErrors) {
      let a = gen.let("valid", !0);
      return (i(() => gen.assign(a, !1)), a);
    }
    return (gen.var(o, !0), i(() => gen.break()), o);
    function i(a) {
      let c = gen.const("len", S._`${r}.length`);
      gen.forRange("i", 0, c, (u) => {
        (e.subschema({ keyword: keyword, dataProp: u, dataPropType: Ke.Type.Num }, o), gen.if(S.not(o), a));
      });
    }
  }
  Bs.validateArray = pu;
  function hu(e) {
    let { gen: gen, schema: schema, keyword: keyword, it: it } = e;
    if (!Array.isArray(schema)) throw Error("ajv implementation error");
    if (schema.some((c) => Ke.alwaysValidSchema(it, c)) && !it.opts.unevaluated) return;
    let i = gen.let("valid", !1),
      a = gen.name("_valid");
    (gen.block(() =>
      schema.forEach((c, u) => {
        let subschema = e.subschema({ keyword: keyword, schemaProp: u, compositeRule: !0 }, a);
        if ((gen.assign(i, S._`${i} || ${a}`), !e.mergeValidEvaluated(subschema, a))) gen.if(S.not(i));
      }),
    ),
      e.result(
        i,
        () => e.reset(),
        () => e.error(!0),
      ));
  }
  Bs.validateUnion = hu;
});

export { Q };

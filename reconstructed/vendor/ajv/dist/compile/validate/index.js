/**
 * ajv/dist/compile/validate/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { ks } from "./boolSchema.js";
import { ut } from "./dataType.js";
import { hr } from "./applicability.js";
import { Hs } from "./defaults.js";
import { sn } from "./keyword.js";
import { an } from "./subschema.js";
import { uh } from "../codegen/index.js";
import { DPe } from "../names.js";
import { lt } from "../resolve.js";
import { ew } from "../util.js";
import { ct } from "../errors.js";

//@ chunk-s82q9s4x.js:41944-51973 cjs-fingerprint
var Bvn = x(function (jn) {
  Object.defineProperty(jn, "__esModule", { value: !0 });
  jn.getData = jn.KeywordCxt = jn.validateFunctionCode = void 0;
  var Ot = ks(),
    qt = ut(),
    He = hr(),
    we = ut(),
    $n = Hs(),
    re = sn(),
    Le = an(),
    d = uh(),
    P = DPe(),
    vn = lt(),
    F = ew(),
    te = ct();
  function rl(e) {
    if (En(e)) {
      if ((Sn(e), bn(e))) {
        ol(e);
        return;
      }
    }
    wn(e, () => Ot.topBoolOrEmptySchema(e));
  }
  jn.validateFunctionCode = rl;
  function wn({ gen: gen, validateName: validateName, schema: schema, schemaEnv: schemaEnv, opts: opts }, o) {
    if (opts.code.es5)
      gen.func(validateName, d._`${P.default.data}, ${P.default.valCxt}`, schemaEnv.$async, () => {
        (gen.code(d._`"use strict"; ${yn(schema, opts)}`), nl(gen, opts), gen.code(o));
      });
    else
      gen.func(validateName, d._`${P.default.data}, ${sl(opts)}`, schemaEnv.$async, () =>
        gen.code(yn(schema, opts)).code(o),
      );
  }
  function sl(e) {
    return d._`{${P.default.instancePath}="", ${P.default.parentData}, ${P.default.parentDataProperty}, ${P.default.rootData}=${P.default.data}${e.dynamicRef ? d._`, ${P.default.dynamicAnchors}={}` : d.nil}}={}`;
  }
  function nl(e, t) {
    e.if(
      P.default.valCxt,
      () => {
        if (
          (e.var(P.default.instancePath, d._`${P.default.valCxt}.${P.default.instancePath}`),
          e.var(P.default.parentData, d._`${P.default.valCxt}.${P.default.parentData}`),
          e.var(P.default.parentDataProperty, d._`${P.default.valCxt}.${P.default.parentDataProperty}`),
          e.var(P.default.rootData, d._`${P.default.valCxt}.${P.default.rootData}`),
          t.dynamicRef)
        )
          e.var(P.default.dynamicAnchors, d._`${P.default.valCxt}.${P.default.dynamicAnchors}`);
      },
      () => {
        if (
          (e.var(P.default.instancePath, d._`""`),
          e.var(P.default.parentData, d._`undefined`),
          e.var(P.default.parentDataProperty, d._`undefined`),
          e.var(P.default.rootData, P.default.data),
          t.dynamicRef)
        )
          e.var(P.default.dynamicAnchors, d._`{}`);
      },
    );
  }
  function ol(e) {
    let { schema: schema, opts: opts, gen: gen } = e;
    wn(e, () => {
      if (opts.$comment && schema.$comment) Nn(e);
      if ((ll(e), gen.let(P.default.vErrors, null), gen.let(P.default.errors, 0), opts.unevaluated)) il(e);
      (Pn(e), pl(e));
    });
    return;
  }
  function il(e) {
    let { gen: gen, validateName: validateName } = e;
    ((e.evaluated = gen.const("evaluated", d._`${validateName}.evaluated`)),
      gen.if(d._`${e.evaluated}.dynamicProps`, () => gen.assign(d._`${e.evaluated}.props`, d._`undefined`)),
      gen.if(d._`${e.evaluated}.dynamicItems`, () => gen.assign(d._`${e.evaluated}.items`, d._`undefined`)));
  }
  function yn(e, t) {
    let r = typeof e == "object" && e[t.schemaId];
    return r && (t.code.source || t.code.process) ? d._`/*# sourceURL=${r} */` : d.nil;
  }
  function al(e, t) {
    if (En(e)) {
      if ((Sn(e), bn(e))) {
        cl(e, t);
        return;
      }
    }
    Ot.boolOrEmptySchema(e, t);
  }
  function bn({ schema: schema, self: t }) {
    if (typeof schema == "boolean") return !schema;
    for (let key in schema) if (t.RULES.all[key]) return !0;
    return !1;
  }
  function En(e) {
    return typeof e.schema != "boolean";
  }
  function cl(e, t) {
    let { schema: schema, gen: gen, opts: opts } = e;
    if (opts.$comment && schema.$comment) Nn(e);
    (dl(e), fl(e));
    let o = gen.const("_errs", P.default.errors);
    (Pn(e, o), gen.var(t, d._`${o} === ${P.default.errors}`));
  }
  function Sn(e) {
    (F.checkUnknownRules(e), ul(e));
  }
  function Pn(e, t) {
    if (e.opts.jtd) return _n(e, [], !1, t);
    let schemaTypes = qt.getSchemaTypes(e.schema),
      coerceAndCheckDataType = qt.coerceAndCheckDataType(e, schemaTypes);
    _n(e, schemaTypes, !coerceAndCheckDataType, t);
  }
  function ul(e) {
    let { schema: schema, errSchemaPath: errSchemaPath, opts: opts, self: n } = e;
    if (schema.$ref && opts.ignoreKeywordsWithRef && F.schemaHasRulesButRef(schema, n.RULES))
      n.logger.warn(`$ref: keywords ignored in schema at path "${errSchemaPath}"`);
  }
  function ll(e) {
    let { schema: schema, opts: opts } = e;
    if (schema.default !== void 0 && opts.useDefaults && opts.strictSchema)
      F.checkStrictMode(e, "default is ignored in the schema root");
  }
  function dl(e) {
    let t = e.schema[e.opts.schemaId];
    if (t) e.baseId = vn.resolveUrl(e.opts.uriResolver, e.baseId, t);
  }
  function fl(e) {
    if (e.schema.$async && !e.schemaEnv.$async) throw Error("async schema in sync schema");
  }
  function Nn({ gen: gen, schemaEnv: schemaEnv, schema: schema, errSchemaPath: errSchemaPath, opts: opts }) {
    let $comment = schema.$comment;
    if (opts.$comment === !0) gen.code(d._`${P.default.self}.logger.log(${$comment})`);
    else if (typeof opts.$comment == "function") {
      let i = d.str`${errSchemaPath}/$comment`,
        scopeValue = gen.scopeValue("root", { ref: schemaEnv.root });
      gen.code(d._`${P.default.self}.opts.$comment(${$comment}, ${i}, ${scopeValue}.schema)`);
    }
  }
  function pl(e) {
    let {
      gen: gen,
      schemaEnv: schemaEnv,
      validateName: validateName,
      ValidationError: ValidationError,
      opts: opts,
    } = e;
    if (schemaEnv.$async)
      gen.if(
        d._`${P.default.errors} === 0`,
        () => gen.return(P.default.data),
        () => gen.throw(d._`new ${ValidationError}(${P.default.vErrors})`),
      );
    else {
      if ((gen.assign(d._`${validateName}.errors`, P.default.vErrors), opts.unevaluated)) hl(e);
      gen.return(d._`${P.default.errors} === 0`);
    }
  }
  function hl({ gen: gen, evaluated: evaluated, props: props, items: items }) {
    if (props instanceof d.Name) gen.assign(d._`${evaluated}.props`, props);
    if (items instanceof d.Name) gen.assign(d._`${evaluated}.items`, items);
  }
  function _n(e, t, r, s) {
    let { gen: gen, schema: schema, data: i, allErrors: allErrors, opts: opts, self: u } = e,
      { RULES: RULES } = u;
    if (schema.$ref && (opts.ignoreKeywordsWithRef || !F.schemaHasRulesButRef(schema, RULES))) {
      gen.block(() => qn(e, "$ref", RULES.all.$ref.definition));
      return;
    }
    if (!opts.jtd) ml(e, t);
    gen.block(() => {
      for (let rule of RULES.rules) f(rule);
      f(RULES.post);
    });
    function f(b) {
      if (!He.shouldUseGroup(schema, b)) return;
      if (b.type) {
        if (
          (gen.if(we.checkDataType(b.type, i, opts.strictNumbers)),
          gn(e, b),
          t.length === 1 && t[0] === b.type && r)
        )
          (gen.else(), we.reportTypeError(e));
        gen.endIf();
      } else gn(e, b);
      if (!allErrors) gen.if(d._`${P.default.errors} === ${s || 0}`);
    }
  }
  function gn(e, t) {
    let {
      gen: gen,
      schema: schema,
      opts: { useDefaults: n },
    } = e;
    if (n) $n.assignDefaults(e, t.type);
    gen.block(() => {
      for (let rule of t.rules)
        if (He.shouldUseRule(schema, rule)) qn(e, rule.keyword, rule.definition, t.type);
    });
  }
  function ml(e, t) {
    if (e.schemaEnv.meta || !e.opts.strictTypes) return;
    if ((yl(e, t), !e.opts.allowUnionTypes)) _l(e, t);
    gl(e, e.dataTypes);
  }
  function yl(e, t) {
    if (!t.length) return;
    if (!e.dataTypes.length) {
      e.dataTypes = t;
      return;
    }
    (t.forEach((r) => {
      if (!kn(e.dataTypes, r)) wr(e, `type "${r}" not allowed by context "${e.dataTypes.join(",")}"`);
    }),
      vl(e, t));
  }
  function _l(e, t) {
    if (t.length > 1 && !(t.length === 2 && t.includes("null")))
      wr(e, "use allowUnionTypes to allow union type keyword");
  }
  function gl(e, t) {
    let all = e.self.RULES.all;
    for (let key in all) {
      let n = all[key];
      if (typeof n == "object" && He.shouldUseRule(e.schema, n)) {
        let { type: o } = n.definition;
        if (o.length && !o.some((i) => $l(t, i))) wr(e, `missing type "${o.join(",")}" for keyword "${key}"`);
      }
    }
  }
  function $l(e, t) {
    return e.includes(t) || (t === "number" && e.includes("integer"));
  }
  function kn(e, t) {
    return e.includes(t) || (t === "integer" && e.includes("number"));
  }
  function vl(e, t) {
    let r = [];
    for (let dataType of e.dataTypes)
      if (kn(t, dataType)) r.push(dataType);
      else if (t.includes("integer") && dataType === "number") r.push("integer");
    e.dataTypes = r;
  }
  function wr(e, t) {
    let r = e.schemaEnv.baseId + e.errSchemaPath;
    ((t += ` at "${r}" (strictTypes)`), F.checkStrictMode(e, t, e.opts.strictTypes));
  }
  class br {
    constructor(e, t, r) {
      if (
        (re.validateKeywordUsage(e, t, r),
        (this.gen = e.gen),
        (this.allErrors = e.allErrors),
        (this.keyword = r),
        (this.data = e.data),
        (this.schema = e.schema[r]),
        (this.$data = t.$data && e.opts.$data && this.schema && this.schema.$data),
        (this.schemaValue = F.schemaRefOrVal(e, this.schema, r, this.$data)),
        (this.schemaType = t.schemaType),
        (this.parentSchema = e.schema),
        (this.params = {}),
        (this.it = e),
        (this.def = t),
        this.$data)
      )
        this.schemaCode = e.gen.const("vSchema", On(this.$data, e));
      else if (
        ((this.schemaCode = this.schemaValue),
        !re.validSchemaType(this.schema, t.schemaType, t.allowUndefined))
      )
        throw Error(`${r} value must be ${JSON.stringify(t.schemaType)}`);
      if ("code" in t ? t.trackErrors : t.errors !== !1)
        this.errsCount = e.gen.const("_errs", P.default.errors);
    }
    result(e, t, r) {
      this.failResult(d.not(e), t, r);
    }
    failResult(e, t, r) {
      if ((this.gen.if(e), r)) r();
      else this.error();
      if (t) {
        if ((this.gen.else(), t(), this.allErrors)) this.gen.endIf();
      } else if (this.allErrors) this.gen.endIf();
      else this.gen.else();
    }
    pass(e, t) {
      this.failResult(d.not(e), void 0, t);
    }
    fail(e) {
      if (e === void 0) {
        if ((this.error(), !this.allErrors)) this.gen.if(!1);
        return;
      }
      if ((this.gen.if(e), this.error(), this.allErrors)) this.gen.endIf();
      else this.gen.else();
    }
    fail$data(e) {
      if (!this.$data) return this.fail(e);
      let { schemaCode: schemaCode } = this;
      this.fail(d._`${schemaCode} !== undefined && (${d.or(this.invalid$data(), e)})`);
    }
    error(e, t, r) {
      if (t) {
        (this.setParams(t), this._error(e, r), this.setParams({}));
        return;
      }
      this._error(e, r);
    }
    _error(e, t) {
      (e ? te.reportExtraError : te.reportError)(this, this.def.error, t);
    }
    $dataError() {
      te.reportError(this, this.def.$dataError || te.keyword$DataError);
    }
    reset() {
      if (this.errsCount === void 0) throw Error('add "trackErrors" to keyword definition');
      te.resetErrorsCount(this.gen, this.errsCount);
    }
    ok(e) {
      if (!this.allErrors) this.gen.if(e);
    }
    setParams(e, t) {
      if (t) Object.assign(this.params, e);
      else this.params = e;
    }
    block$data(e, t, r = d.nil) {
      this.gen.block(() => {
        (this.check$data(e, r), t());
      });
    }
    check$data(e = d.nil, t = d.nil) {
      if (!this.$data) return;
      let { gen: gen, schemaCode: schemaCode, schemaType: schemaType, def: def } = this;
      if ((gen.if(d.or(d._`${schemaCode} === undefined`, t)), e !== d.nil)) gen.assign(e, !0);
      if (schemaType.length || def.validateSchema) {
        if ((gen.elseIf(this.invalid$data()), this.$dataError(), e !== d.nil)) gen.assign(e, !1);
      }
      gen.else();
    }
    invalid$data() {
      let { gen: gen, schemaCode: schemaCode, schemaType: schemaType, def: def, it: it } = this;
      return d.or(o(), i());
      function o() {
        if (schemaType.length) {
          if (!(schemaCode instanceof d.Name)) throw Error("ajv implementation error");
          let a = Array.isArray(schemaType) ? schemaType : [schemaType];
          return d._`${we.checkDataTypes(a, schemaCode, it.opts.strictNumbers, we.DataType.Wrong)}`;
        }
        return d.nil;
      }
      function i() {
        if (def.validateSchema) {
          let scopeValue = gen.scopeValue("validate$data", { ref: def.validateSchema });
          return d._`!${scopeValue}(${schemaCode})`;
        }
        return d.nil;
      }
    }
    subschema(e, t) {
      let subschema = Le.getSubschema(this.it, e);
      (Le.extendSubschemaData(subschema, this.it, e), Le.extendSubschemaMode(subschema, e));
      let s = { ...this.it, ...subschema, items: void 0, props: void 0 };
      return (al(s, t), s);
    }
    mergeEvaluated(e, t) {
      let { it: it, gen: gen } = this;
      if (!it.opts.unevaluated) return;
      if (it.props !== !0 && e.props !== void 0) it.props = F.mergeEvaluated.props(gen, e.props, it.props, t);
      if (it.items !== !0 && e.items !== void 0) it.items = F.mergeEvaluated.items(gen, e.items, it.items, t);
    }
    mergeValidEvaluated(e, t) {
      let { it: it, gen: gen } = this;
      if (it.opts.unevaluated && (it.props !== !0 || it.items !== !0))
        return (gen.if(t, () => this.mergeEvaluated(e, d.Name)), !0);
    }
  }
  jn.KeywordCxt = br;
  function qn(e, t, r, s) {
    let n = new br(e, r, t);
    if ("code" in r) r.code(n, s);
    else if (n.$data && r.validate) re.funcKeywordCode(n, r);
    else if ("macro" in r) re.macroKeywordCode(n, r);
    else if (r.compile || r.validate) re.funcKeywordCode(n, r);
  }
  var wl = /^\/(?:[^~]|~0|~1)*$/,
    bl = /^([0-9]+)(#|\/(?:[^~]|~0|~1)*)?$/;
  function On(e, { dataLevel: dataLevel, dataNames: dataNames, dataPathArr: dataPathArr }) {
    let n, o;
    if (e === "") return P.default.rootData;
    if (e[0] === "/") {
      if (!wl.test(e)) throw Error(`Invalid JSON-pointer: ${e}`);
      ((n = e), (o = P.default.rootData));
    } else {
      let match = bl.exec(e);
      if (!match) throw Error(`Invalid JSON-pointer: ${e}`);
      let l = +match[1];
      if (((n = match[2]), n === "#")) {
        if (l >= dataLevel) throw Error(c("property/index", l));
        return dataPathArr[dataLevel - l];
      }
      if (l > dataLevel) throw Error(c("data", l));
      if (((o = dataNames[dataLevel - l]), !n)) return o;
    }
    let i = o,
      parts = n.split("/");
    for (let u of parts)
      if (u) ((o = d._`${o}${d.getProperty(F.unescapeJsonPointer(u))}`), (i = d._`${i} && ${o}`));
    return i;
    function c(u, l) {
      return `Cannot access ${u} ${l} levels up, current level is ${dataLevel}`;
    }
  }
  jn.getData = On;
});

export { Bvn };

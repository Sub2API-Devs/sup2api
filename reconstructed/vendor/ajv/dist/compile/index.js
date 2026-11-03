/**
 * ajv/dist/compile/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { uh } from "./codegen/index.js";
import { elr } from "../runtime/validation_error.js";
import { DPe } from "./names.js";
import { lt } from "./resolve.js";
import { ew } from "./util.js";
import { Bvn } from "./validate/index.js";

//@ chunk-s82q9s4x.js:52476-57215 cjs-fingerprint
var tlr = x(function (Dn) {
  Object.defineProperty(Dn, "__esModule", { value: !0 });
  Dn.resolveSchema = Dn.getCompilingSchema = Dn.resolveRef = Dn.compileSchema = Dn.SchemaEnv = void 0;
  var V = uh(),
    kl = elr(),
    Me = DPe(),
    z = lt(),
    jt = ew(),
    Mn = Bvn();
  class dt {
    constructor(e) {
      var t;
      ((this.refs = {}), (this.dynamicAnchors = {}));
      let r;
      if (typeof e.schema == "object") r = e.schema;
      ((this.schema = e.schema),
        (this.schemaId = e.schemaId),
        (this.root = e.root || this),
        (this.baseId =
          (t = e.baseId) !== null && t !== void 0
            ? t
            : z.normalizeId(r === null || r === void 0 ? void 0 : r[e.schemaId || "$id"])),
        (this.schemaPath = e.schemaPath),
        (this.localRefs = e.localRefs),
        (this.meta = e.meta),
        (this.$async = r === null || r === void 0 ? void 0 : r.$async),
        (this.refs = {}));
    }
  }
  Dn.SchemaEnv = dt;
  function Sr(e) {
    let t = An.call(this, e);
    if (t) return t;
    let fullPath = z.getFullPath(this.opts.uriResolver, e.root.baseId),
      { es5: es5, lines: lines } = this.opts.code,
      { ownProperties: ownProperties } = this.opts,
      i = new V.CodeGen(this.scope, { es5: es5, lines: lines, ownProperties: ownProperties }),
      a;
    if (e.$async)
      a = i.scopeValue("Error", {
        ref: kl.default,
        code: V._`require("ajv/dist/runtime/validation_error").default`,
      });
    let scopeName = i.scopeName("validate");
    e.validateName = scopeName;
    let u = {
        gen: i,
        allErrors: this.opts.allErrors,
        data: Me.default.data,
        parentData: Me.default.parentData,
        parentDataProperty: Me.default.parentDataProperty,
        dataNames: [Me.default.data],
        dataPathArr: [V.nil],
        dataLevel: 0,
        dataTypes: [],
        definedProperties: new Set(),
        topSchemaRef: i.scopeValue(
          "schema",
          this.opts.code.source === !0 ? { ref: e.schema, code: V.stringify(e.schema) } : { ref: e.schema },
        ),
        validateName: scopeName,
        ValidationError: a,
        schema: e.schema,
        schemaEnv: e,
        rootId: fullPath,
        baseId: e.baseId || fullPath,
        schemaPath: V.nil,
        errSchemaPath: e.schemaPath || (this.opts.jtd ? "" : "#"),
        errorPath: V._`""`,
        opts: this.opts,
        self: this,
      },
      l;
    try {
      (this._compilations.add(e), Mn.validateFunctionCode(u), i.optimize(this.opts.code.optimize));
      let str = i.toString();
      if (((l = `${i.scopeRefs(Me.default.scope)}return ${str}`), this.opts.code.process))
        l = this.opts.code.process(l, e);
      let _ = Function(`${Me.default.self}`, `${Me.default.scope}`, l)(this, this.scope.get());
      if (
        (this.scope.value(scopeName, { ref: _ }),
        (_.errors = null),
        (_.schema = e.schema),
        (_.schemaEnv = e),
        e.$async)
      )
        _.$async = !0;
      if (this.opts.code.source === !0)
        _.source = { validateName: scopeName, validateCode: str, scopeValues: i._values };
      if (this.opts.unevaluated) {
        let { props: props, items: items } = u;
        if (
          ((_.evaluated = {
            props: props instanceof V.Name ? void 0 : props,
            items: items instanceof V.Name ? void 0 : items,
            dynamicProps: props instanceof V.Name,
            dynamicItems: items instanceof V.Name,
          }),
          _.source)
        )
          _.source.evaluated = V.stringify(_.evaluated);
      }
      return ((e.validate = _), e);
    } catch (error) {
      if ((delete e.validate, delete e.validateName, l))
        this.logger.error("Error compiling schema, function code:", l);
      throw error;
    } finally {
      this._compilations.delete(e);
    }
  }
  Dn.compileSchema = Sr;
  function ql(e, t, r) {
    var s;
    r = z.resolveUrl(this.opts.uriResolver, t, r);
    let n = e.refs[r];
    if (n) return n;
    let o = xl.call(this, e, r);
    if (o === void 0) {
      let i = (s = e.localRefs) === null || s === void 0 ? void 0 : s[r],
        { schemaId: schemaId } = this.opts;
      if (i) o = new dt({ schema: i, schemaId: schemaId, root: e, baseId: t });
    }
    if (o === void 0) return;
    return (e.refs[r] = Ol.call(this, o));
  }
  Dn.resolveRef = ql;
  function Ol(e) {
    if (z.inlineRef(e.schema, this.opts.inlineRefs)) return e.schema;
    return e.validate ? e : Sr.call(this, e);
  }
  function An(e) {
    for (let _compilation of this._compilations) if (jl(_compilation, e)) return _compilation;
  }
  Dn.getCompilingSchema = An;
  function jl(e, t) {
    return e.schema === t.schema && e.root === t.root && e.baseId === t.baseId;
  }
  function xl(e, t) {
    let r;
    while (typeof (r = this.refs[t]) == "string") t = r;
    return r || this.schemas[t] || xt.call(this, e, t);
  }
  function xt(e, t) {
    let parse = this.opts.uriResolver.parse(t),
      _getFullPath = z._getFullPath(this.opts.uriResolver, parse),
      fullPath = z.getFullPath(this.opts.uriResolver, e.baseId, void 0);
    if (Object.keys(e.schema).length > 0 && _getFullPath === fullPath) return Er.call(this, parse, e);
    let normalizeId = z.normalizeId(_getFullPath),
      i = this.refs[normalizeId] || this.schemas[normalizeId];
    if (typeof i == "string") {
      let a = xt.call(this, e, i);
      if (typeof (a === null || a === void 0 ? void 0 : a.schema) !== "object") return;
      return Er.call(this, parse, a);
    }
    if (typeof (i === null || i === void 0 ? void 0 : i.schema) !== "object") return;
    if (!i.validate) Sr.call(this, i);
    if (normalizeId === z.normalizeId(t)) {
      let { schema: schema } = i,
        { schemaId: schemaId } = this.opts,
        u = schema[schemaId];
      if (u) fullPath = z.resolveUrl(this.opts.uriResolver, fullPath, u);
      return new dt({ schema: schema, schemaId: schemaId, root: e, baseId: fullPath });
    }
    return Er.call(this, parse, i);
  }
  Dn.resolveSchema = xt;
  var Rl = new Set(["properties", "patternProperties", "enum", "dependencies", "definitions"]);
  function Er(e, { baseId: baseId, schema: schema, root: root }) {
    var n;
    if (((n = e.fragment) === null || n === void 0 ? void 0 : n[0]) !== "/") return;
    for (let a of e.fragment.slice(1).split("/")) {
      if (typeof schema === "boolean") return;
      let c = schema[jt.unescapeFragment(a)];
      if (c === void 0) return;
      schema = c;
      let u = typeof schema === "object" && schema[this.opts.schemaId];
      if (!Rl.has(a) && u) baseId = z.resolveUrl(this.opts.uriResolver, baseId, u);
    }
    let o;
    if (typeof schema != "boolean" && schema.$ref && !jt.schemaHasRulesButRef(schema, this.RULES)) {
      let url = z.resolveUrl(this.opts.uriResolver, baseId, schema.$ref);
      o = xt.call(this, root, url);
    }
    let { schemaId: schemaId } = this.opts;
    if (
      ((o = o || new dt({ schema: schema, schemaId: schemaId, root: root, baseId: baseId })),
      o.schema !== o.root.schema)
    )
      return o;
    return;
  }
});

export { tlr };

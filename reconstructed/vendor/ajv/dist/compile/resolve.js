/**
 * ajv/dist/compile/resolve.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: ajv@8.13.0
 * pieces: chunk-s82q9s4x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { ew } from "./util.js";
import { SZo } from "../../../fast-deep-equal/index.js";
import { un } from "../../../json-schema-traverse/index.js";

//@ chunk-s82q9s4x.js:39807-41944 cjs-fingerprint
var lt = x(function (hn) {
  Object.defineProperty(hn, "__esModule", { value: !0 });
  hn.getSchemaRefs =
    hn.resolveUrl =
    hn.normalizeId =
    hn._getFullPath =
    hn.getFullPath =
    hn.inlineRef =
      void 0;
  var ln = ew(),
    Ku = SZo(),
    Fu = un(),
    Lu = new Set([
      "type",
      "format",
      "pattern",
      "maxLength",
      "minLength",
      "maxProperties",
      "minProperties",
      "maxItems",
      "minItems",
      "maximum",
      "minimum",
      "uniqueItems",
      "multipleOf",
      "required",
      "enum",
      "const",
    ]);
  function Hu(e, t = !0) {
    if (typeof e == "boolean") return !0;
    if (t === !0) return !vr(e);
    if (!t) return !1;
    return dn(e) <= t;
  }
  hn.inlineRef = Hu;
  var Gu = new Set(["$ref", "$recursiveRef", "$recursiveAnchor", "$dynamicRef", "$dynamicAnchor"]);
  function vr(e) {
    for (let key in e) {
      if (Gu.has(key)) return !0;
      let r = e[key];
      if (Array.isArray(r) && r.some(vr)) return !0;
      if (typeof r == "object" && vr(r)) return !0;
    }
    return !1;
  }
  function dn(e) {
    let t = 0;
    for (let key in e) {
      if (key === "$ref") return 1 / 0;
      if ((t++, Lu.has(key))) continue;
      if (typeof e[key] == "object") ln.eachItem(e[key], (s) => (t += dn(s)));
      if (t === 1 / 0) return 1 / 0;
    }
    return t;
  }
  function fn(e, t = "", r) {
    if (r !== !1) t = Fe(t);
    let parse = e.parse(t);
    return pn(e, parse);
  }
  hn.getFullPath = fn;
  function pn(e, t) {
    return e.serialize(t).split("#")[0] + "#";
  }
  hn._getFullPath = pn;
  var Ju = /#\/?$/;
  function Fe(e) {
    return e ? e.replace(Ju, "") : "";
  }
  hn.normalizeId = Fe;
  function Wu(e, t, r) {
    return ((r = Fe(r)), e.resolve(t, r));
  }
  hn.resolveUrl = Wu;
  var Bu = /^[a-z_][-a-z0-9._]*$/i;
  function Qu(e, t) {
    if (typeof e == "boolean") return {};
    let { schemaId: schemaId, uriResolver: uriResolver } = this.opts,
      n = Fe(e[schemaId] || t),
      o = { "": n },
      i = fn(uriResolver, n, !1),
      a = {},
      c = new Set();
    return (
      Fu(e, { allKeys: !0 }, (f, b, _, h) => {
        if (h === void 0) return;
        let p = i + b,
          y = o[h];
        if (typeof f[schemaId] == "string") y = v.call(this, f[schemaId]);
        (O.call(this, f.$anchor), O.call(this, f.$dynamicAnchor), (o[b] = y));
        function v(q) {
          let resolve = this.opts.uriResolver.resolve;
          if (((q = Fe(y ? resolve(y, q) : q)), c.has(q))) throw l(q);
          c.add(q);
          let N = this.refs[q];
          if (typeof N == "string") N = this.refs[N];
          if (typeof N == "object") u(f, N.schema, q);
          else if (q !== Fe(p))
            if (q[0] === "#") (u(f, a[q], q), (a[q] = f));
            else this.refs[q] = p;
          return q;
        }
        function O(q) {
          if (typeof q == "string") {
            if (!Bu.test(q)) throw Error(`invalid anchor "${q}"`);
            v.call(this, `#${q}`);
          }
        }
      }),
      a
    );
    function u(f, b, _) {
      if (b !== void 0 && !Ku(f, b)) throw l(_);
    }
    function l(f) {
      return Error(`reference "${f}" resolves to more than one schema`);
    }
  }
  hn.getSchemaRefs = Qu;
});

export { lt };

/**
 * @bufbuild/protobuf/dist/commonjs/equals.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { El } from "./reflect/scalar.js";
import { Po } from "../cjs/reflect/reflect.js";
import { Ns } from "../cjs/descriptors.js";
import { Os } from "../../../../@anthropic-ai/bedrock-sdk/core/error.js";
import { gp } from "./extensions.js";

//@ chunk-fq0cr76a.js:443249-445879 cjs-fingerprint
var xP = x(function (EP) {
  Object.defineProperty(EP, "__esModule", { value: !0 });
  EP.equals = bP;
  var Fo = El(),
    ly = Po(),
    dy = Ns(),
    cy = Os(),
    kl = gp();
  function bP(e, n, r, s) {
    if (n.$typeName != e.typeName || r.$typeName != e.typeName) return !1;
    if (n === r) return !0;
    return ay(ly.reflect(e, n), ly.reflect(e, r), s);
  }
  function ay(e, n, r) {
    if (
      e.desc.typeName === "google.protobuf.Any" &&
      (r === null || r === void 0 ? void 0 : r.unpackAny) == !0
    )
      return oJ(e.message, n.message, r);
    for (let field of e.fields) if (!SP(field, e, n, r)) return !1;
    if ((r === null || r === void 0 ? void 0 : r.unknown) == !0 && !aJ(e, n, r.registry)) return !1;
    if ((r === null || r === void 0 ? void 0 : r.extensions) == !0 && !lJ(e, n, r)) return !1;
    return !0;
  }
  function SP(e, n, r, s) {
    if (!n.isSet(e) && !r.isSet(e)) return !0;
    if (!n.isSet(e) || !r.isSet(e)) return !1;
    switch (e.fieldKind) {
      case "scalar":
        return Fo.scalarEquals(e.scalar, n.get(e), r.get(e));
      case "enum":
        return n.get(e) === r.get(e);
      case "message":
        return ay(n.get(e), r.get(e), s);
      case "map": {
        let h = n.get(e),
          y = r.get(e),
          b = [];
        for (let S of h.keys()) {
          if (!y.has(S)) return !1;
          b.push(S);
        }
        for (let S of y.keys()) if (!h.has(S)) return !1;
        for (let S of b) {
          let w = h.get(S),
            R = y.get(S);
          if (w === R) continue;
          switch (e.mapKind) {
            case "enum":
              return !1;
            case "message":
              if (!ay(w, R, s)) return !1;
              break;
            case "scalar":
              if (!Fo.scalarEquals(e.scalar, w, R)) return !1;
              break;
          }
        }
        break;
      }
      case "list": {
        let h = n.get(e),
          y = r.get(e);
        if (h.size != y.size) return !1;
        for (let b = 0; b < h.size; b++) {
          let S = h.get(b),
            w = y.get(b);
          if (S === w) continue;
          switch (e.listKind) {
            case "enum":
              return !1;
            case "message":
              if (!ay(S, w, s)) return !1;
              break;
            case "scalar":
              if (!Fo.scalarEquals(e.scalar, S, w)) return !1;
              break;
          }
        }
        break;
      }
    }
    return !0;
  }
  function oJ(e, n, r) {
    if (e.typeUrl !== n.typeUrl) return !1;
    let anyUnpack = cy.anyUnpack(e, r.registry),
      anyUnpack_2 = cy.anyUnpack(n, r.registry);
    if (anyUnpack && anyUnpack_2) {
      let message = r.registry.getMessage(anyUnpack.$typeName);
      if (message) return bP(message, anyUnpack, anyUnpack_2, r);
    }
    return Fo.scalarEquals(dy.ScalarType.BYTES, e.value, n.value);
  }
  function aJ(e, n, r) {
    function s(b, S) {
      var w;
      let R = (w = b.getUnknown()) !== null && w !== void 0 ? w : [];
      return S ? R.filter((D) => !S.getExtensionFor(b.desc, D.no)) : R;
    }
    let h = s(e, r),
      y = s(n, r);
    if (h.length != y.length) return !1;
    for (let b = 0; b < h.length; b++) {
      let S = h[b],
        w = y[b];
      if (S.no != w.no) return !1;
      if (S.wireType != w.wireType) return !1;
      if (!Fo.scalarEquals(dy.ScalarType.BYTES, S.data, w.data)) return !1;
    }
    return !0;
  }
  function lJ(e, n, r) {
    function s(b, S) {
      var w;
      return ((w = b.getUnknown()) !== null && w !== void 0 ? w : [])
        .map((R) => S.getExtensionFor(b.desc, R.no))
        .filter((R) => R != null)
        .filter((R, D, O) => O.indexOf(R) === D);
    }
    let h = s(e, r.registry),
      y = s(n, r.registry);
    if (h.length != y.length || h.some((b) => !y.includes(b))) return !1;
    for (let b of h) {
      let [S, w] = kl.createExtensionContainer(b, kl.getExtension(e.message, b)),
        [R] = kl.createExtensionContainer(b, kl.getExtension(n.message, b));
      if (!SP(w, S, R, r)) return !1;
    }
    return !0;
  }
});

export { xP };

/**
 * @bufbuild/cel/dist/cjs/parser.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { gU } from "./builder.js";
import { z_ } from "./logic-manager.js";

//@ chunk-fq0cr76a.js:532305-597305 cjs-fingerprint
var AU = x(function (wU) {
  Object.defineProperty(wU, "__esModule", { value: !0 });
  wU.ParseSyntaxError = wU.ParseError = void 0;
  wU.parse = Noe;
  var Ap;
  (function (e) {
    class n {
      source;
      start;
      constructor(D, O) {
        ((this.source = D), (this.start = O));
      }
      toString() {
        return String(this.source);
      }
      offset(D) {
        return {
          line: D.line + this.start.line - 1,
          column: D.line === 1 ? D.column + this.start.column - 1 : D.column,
          offset: D.offset + this.start.offset,
        };
      }
      static offsetStart(D) {
        if (D.source instanceof n) return D.source.offset(D.start);
        return D.start;
      }
      static offsetEnd(D) {
        if (D.source instanceof n) return D.source.offset(D.end);
        return D.end;
      }
    }
    e.GrammarLocation = n;
    function r(D, O, L) {
      if (((L = L || " "), D.length > O)) return D;
      return ((O -= D.length), (L += L.repeat(O)), D + L.slice(0, O));
    }
    e.padEnd = r;
    class s {}
    e.ParseFailure = s;
    function h(D) {
      return !D.success;
    }
    e.isFailure = h;
    function y(D, O) {
      let L = 1;
      for (let V = 0; V < O; V++)
        if (D[V] === "\r") {
          if (
            D[V + 1] ===
            `
`
          )
            V++;
          L++;
        } else if (
          D[V] ===
          `
`
        )
          L++;
      return L;
    }
    function b(D, O) {
      let L = 1;
      for (let V = O; V > 0; V--) {
        if (
          [
            `
`,
            "\r",
          ].includes(D[V - 1])
        )
          break;
        L++;
      }
      return L;
    }
    function S(D, O, L, V) {
      return {
        source: D,
        start: {
          offset: O.length - L.length,
          line: y(O, O.length - L.length),
          column: b(O, O.length - L.length),
        },
        end: {
          offset: O.length - V.length,
          line: y(O, O.length - V.length),
          column: b(O, O.length - V.length),
        },
      };
    }
    e.getLocation = S;
    function w(D, O, L, V) {
      return { source: D, start: O.length - L.length, end: O.length - V.length };
    }
    e.getRange = w;
    function R(D, O) {
      return D.slice(0, O.length > 0 ? -O.length : void 0);
    }
    e.getText = R;
  })(Ap || (Ap = {}));
  class xd extends Error {
    rawMessage;
    location;
    constructor(e, n, r = "parse error") {
      super(xd.#e(e, n));
      ((this.name = r), (this.rawMessage = e), (this.location = n));
    }
    static #e(e, n) {
      return `${n.source !== void 0 ? String(n.source) : "<input>"}:${n.start.line}:${n.start.column}: ` + e;
    }
  }
  wU.ParseError = xd;
  class t0 extends xd {
    expected;
    found;
    constructor(e, n, r, s = "syntax error") {
      super(t0.#e(e, n), r, s);
      ((this.expected = e), (this.found = n));
    }
    static #e(e, n) {
      function r(y) {
        return (
          "'" +
          y.replace(/[\\\x07\b\f\n\r\t\v']/g, (b) => {
            switch (b) {
              case "\\":
                return "\\\\";
              case "\x07":
                return "\\x07";
              case "\b":
                return "\\b";
              case "\f":
                return "\\f";
              case `
`:
                return "\\n";
              case "\r":
                return "\\r";
              case "\t":
                return "\\t";
              case "\v":
                return "\\v";
              case "'":
                return "\\'";
              default:
                throw Error(
                  "Unexpected string encoding replacement character. This should be an unreachable error.",
                );
            }
          }) +
          "'"
        );
      }
      function s(y) {
        let b = [
          ...new Set(
            y.map((S) => {
              if (S.type === "literal") return r(S.value);
              return S.value;
            }),
          ),
        ];
        switch ((b.sort(), b.length)) {
          case 1:
            return b[0];
          case 2:
            return `${b[0]} or ${b[1]}`;
          default:
            return b.slice(0, -1).join(", ") + ", or " + b[b.length - 1];
        }
      }
      function h(y) {
        return y.length === 1 ? y : "end of input";
      }
      return "found " + h(n) + " but expecting " + s(e);
    }
  }
  wU.ParseSyntaxError = t0;
  var Fie = gU(),
    yU = z_(),
    Fr = new Fie.default(),
    Ml = { type: "any", value: "any character" },
    Mie = { type: "class", value: "/^[\\t\\n\\f\\r ]/g" },
    wr = { type: "other", value: "whitespace" },
    $ie = { type: "literal", value: "//" },
    Vie = { type: "class", value: "/^[^\\r\\n]/g" },
    Wie = { type: "class", value: "/^[\\r\\n]/g" },
    Gie = { type: "other", value: "new line" },
    Tr = { type: "other", value: "comment" },
    X_ = { type: "literal", value: "-" },
    J_ = { type: "other", value: "digit" },
    Cc = { type: "literal", value: "." },
    Hie = { type: "class", value: "/^[+\\-]/g" },
    Kie = { type: "other", value: "float literal" },
    bU = { type: "literal", value: "0x" },
    qie = { type: "class", value: "/^[uU]/g" },
    jie = { type: "other", value: "unsigned integer literal" },
    Yie = { type: "other", value: "integer literal" },
    Zie = { type: "class", value: "/^[rR]/g" },
    zy = { type: "literal", value: '"""' },
    Xy = { type: "literal", value: "'''" },
    Jy = { type: "literal", value: '"' },
    Qy = { type: "literal", value: "'" },
    e0 = { type: "literal", value: "\\" },
    zie = { type: "class", value: "/^[xX]/g" },
    Q_ = { type: "other", value: "byte value" },
    Xie = { type: "literal", value: "\\u" },
    Jie = { type: "literal", value: "\\U" },
    Qie = { type: "class", value: "/^[0-3]/g" },
    eoe = { type: "other", value: "escaped bytes" },
    toe = { type: "other", value: "byte sequence" },
    noe = { type: "class", value: "/^[abfnrtv]/g" },
    roe = { type: "class", value: "/^[\"'`\\\\?]/g" },
    soe = { type: "other", value: "escaped character" },
    ioe = { type: "other", value: "quoted character sequence" },
    ooe = { type: "other", value: "string literal" },
    aoe = { type: "class", value: "/^[bB]/g" },
    loe = { type: "other", value: "bytes literal" },
    coe = { type: "literal", value: "true" },
    uoe = { type: "literal", value: "false" },
    doe = { type: "other", value: "boolean literal" },
    foe = { type: "literal", value: "null" },
    poe = { type: "other", value: "null literal" },
    SU = { type: "class", value: "/^[_a-zA-Z]/g" },
    hoe = { type: "other", value: "identifier" },
    ev = { type: "literal", value: "(" },
    Ed = { type: "literal", value: "," },
    tv = { type: "literal", value: ")" },
    moe = { type: "other", value: "selector" },
    EU = { type: "literal", value: "{" },
    nv = { type: "literal", value: ":" },
    xU = { type: "literal", value: "}" },
    _U = { type: "literal", value: "[" },
    vU = { type: "literal", value: "]" },
    goe = { type: "literal", value: "!" },
    yoe = { type: "class", value: "/^[*\\/%]/g" },
    boe = { type: "literal", value: "<=" },
    Soe = { type: "literal", value: "<" },
    Eoe = { type: "literal", value: ">=" },
    xoe = { type: "literal", value: ">" },
    _oe = { type: "literal", value: "==" },
    voe = { type: "literal", value: "!=" },
    woe = { type: "literal", value: "in" },
    Toe = { type: "other", value: "relational operator" },
    Aoe = { type: "literal", value: "&&" },
    Coe = { type: "literal", value: "||" },
    Roe = { type: "literal", value: "?" },
    Ioe = { type: "end", value: "end of input" };
  function Noe(e, n = {}) {
    let grammarSource = n.grammarSource,
      s = Je(e);
    if (s.success === !0) return s.value;
    let h = e,
      y = [];
    for (let failedExpectation of s.failedExpectations) {
      if (failedExpectation.remainder.length < h.length) ((h = failedExpectation.remainder), (y = []));
      if (failedExpectation.remainder.length === h.length) y.push(failedExpectation);
    }
    throw new t0(
      y.map((G) => G.expectation),
      h.slice(0, 1),
      Ap.getLocation(grammarSource, e, h, h),
    );
    function b(G, P) {
      return Fr.newDoubleExpr(G(), P);
    }
    function S(G, P) {
      return Fr.newUnsignedInt64Expr(G(), P);
    }
    function w(G, P) {
      return Fr.newInt64Expr(G(), P);
    }
    function R(G) {
      return parseInt(G, 16);
    }
    function D(G) {
      return parseInt(G, 16);
    }
    function O(G) {
      return parseInt(G, 16);
    }
    function L(G) {
      return parseInt(G, 8);
    }
    function V(G) {
      switch (G) {
        case "a":
          return "\x07";
        case "b":
          return "\b";
        case "f":
          return "\f";
        case "n":
          return `
`;
        case "r":
          return "\r";
        case "t":
          return "\t";
        case "v":
          return "\v";
      }
      throw Error();
    }
    function K(G, P) {
      return Fr.newStringExpr(G(), P);
    }
    function q(G, P) {
      return Fr.newBytesExpr(G(), P);
    }
    function Z(G, P) {
      return Fr.newBoolExpr(G(), P);
    }
    function J(G) {
      return Fr.newNullExpr(G());
    }
    function ie(G, P) {
      if (
        [
          "true",
          "false",
          "null",
          "in",
          "as",
          "break",
          "const",
          "continue",
          "else",
          "for",
          "function",
          "if",
          "import",
          "let",
          "loop",
          "package",
          "namespace",
          "return",
          "var",
          "void",
          "while",
        ].includes(P)
      )
        G("reserved identifier");
      return P;
    }
    function ae(G, P, M) {
      return Fr.newCallExpr(G(), P, M);
    }
    function Se(G, P) {
      if (["true", "false", "null", "in"].includes(P)) G("reserved keyword");
      return P;
    }
    function ue(G, P, M) {
      return Fr.newStructEntry(G(), P, M);
    }
    function me(G, P, M, oe) {
      return Fr.newStructExpr(G(), oe, (P !== null ? P : "") + M.join("."));
    }
    function Ne(G, P) {
      return Fr.newIdentExpr(G(), P);
    }
    function Ce(G, P) {
      return Fr.newListExpr(G(), P);
    }
    function Ie(G, P, M) {
      return Fr.newMapEntry(G(), P, M);
    }
    function he(G, P) {
      return Fr.newStructExpr(G(), P);
    }
    function ft(G, P) {
      return (M) => Fr.newSelectExpr(G(), M, P);
    }
    function rt(G, P, M) {
      return (oe) => Fr.newMemberCallExpr(G(), oe, P, M);
    }
    function ut(G, P) {
      return (M) => Fr.newCallExpr(G(), "_[_]", [M, P]);
    }
    function we(G, P) {
      if (P.length === 0) return G;
      return P.reduce((M, oe) => oe(M), G);
    }
    function Ae(G, P, M) {
      if (P.length % 2 === 0) return M;
      if (M.exprKind.case === "callExpr" && M.exprKind.value.function === `${P[0]}_`)
        return M.exprKind.value.args[0];
      return Fr.newCallExpr(G(), `${P[0]}_`, [M]);
    }
    function dt(G) {
      return `_${G}_`;
    }
    function Me(G, P, M) {
      return (oe) => Fr.newCallExpr(G(), P, [oe, M]);
    }
    function Ft(G, P) {
      if (P === null) return G;
      return P.reduce((M, oe) => oe(M), G);
    }
    function xn(G) {
      return `_${G}_`;
    }
    function mt(G, P, M) {
      return (oe) => Fr.newCallExpr(G(), P, [oe, M]);
    }
    function Mt(G, P) {
      if (P === null) return G;
      return P.reduce((M, oe) => oe(M), G);
    }
    function mn(G) {
      return `_${G}_`;
    }
    function Nt() {
      return "@in";
    }
    function Wt(G, P, M) {
      return (oe) => Fr.newCallExpr(G(), P, [oe, M]);
    }
    function gt(G, P) {
      if (P === null) return G;
      return P.reduce((M, oe) => oe(M), G);
    }
    function jt(G, P) {
      if (P.length === 1) return P[0];
      let newBalancingLogicManager = yU.default.newBalancingLogicManager(Fr, "_&&_", P[0]);
      for (let oe = 1; oe < P.length; oe += 1) newBalancingLogicManager.addTerm(G(), P[oe]);
      return newBalancingLogicManager.toExpr();
    }
    function Rn(G, P) {
      if (P.length === 1) return P[0];
      let newBalancingLogicManager = yU.default.newBalancingLogicManager(Fr, "_||_", P[0]);
      for (let oe = 1; oe < P.length; oe += 1) newBalancingLogicManager.addTerm(G(), P[oe]);
      return newBalancingLogicManager.toExpr();
    }
    function Xe(G, P) {
      return [G, P];
    }
    function nn(G, P, M) {
      if (M === null) return P;
      return Fr.newCallExpr(G(), "_?_:_", [P, ...M]);
    }
    function Je(G) {
      let P = vt(G);
      if (P.success === !0) {
        if (P.remainder.length === 0) return P;
        return {
          success: !1,
          remainder: P.remainder,
          failedExpectations: [{ expectation: Ioe, remainder: P.remainder }],
        };
      }
      return P;
    }
    function vt(G) {
      let P = Lt(G);
      if (P.success === !0)
        return {
          success: !0,
          value: nn(() => e.length - G.length, P.value[0], P.value[1]),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function Lt(G) {
      let P = [],
        M = G,
        oe = ln(M);
      if ((P.push(...oe.failedExpectations), oe.success === !1))
        return { success: !1, remainder: oe.remainder, failedExpectations: P };
      M = oe.remainder;
      let match = M.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      if ((P.push({ expectation: wr, remainder: M }, { expectation: Tr, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let de = HV(M);
      if ((P.push(...de.failedExpectations), de.success === !1))
        return { success: !1, remainder: de.remainder, failedExpectations: P };
      return (
        (M = de.remainder),
        { success: !0, value: [oe.value, de.value], remainder: M, failedExpectations: P }
      );
    }
    function ln(G) {
      let P = Zt(G);
      if (P.success === !0)
        return {
          success: !0,
          value: Rn(() => e.length - G.length, P.value),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function Zt(G) {
      let P = [],
        M = [],
        oe = G;
      while (!0) {
        let ee = oe;
        if (P.length > 0) {
          let pn = GV(ee);
          if ((M.push(...pn.failedExpectations), pn.success === !1)) break;
          ee = pn.remainder;
        }
        let de = kn(ee);
        if ((M.push(...de.failedExpectations), de.success === !1)) break;
        ((oe = de.remainder), P.push(de.value));
      }
      if (P.length < 1) return { success: !1, remainder: G, failedExpectations: M };
      return { success: !0, value: P, remainder: oe, failedExpectations: M };
    }
    function kn(G) {
      let P = zr(G);
      if (P.success === !0)
        return {
          success: !0,
          value: jt(() => e.length - G.length, P.value),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function zr(G) {
      let P = [],
        M = [],
        oe = G;
      while (!0) {
        let ee = oe;
        if (P.length > 0) {
          let pn = WV(ee);
          if ((M.push(...pn.failedExpectations), pn.success === !1)) break;
          ee = pn.remainder;
        }
        let de = Pa(ee);
        if ((M.push(...de.failedExpectations), de.success === !1)) break;
        ((oe = de.remainder), P.push(de.value));
      }
      if (P.length < 1) return { success: !1, remainder: G, failedExpectations: M };
      return { success: !0, value: P, remainder: oe, failedExpectations: M };
    }
    function Pa(G) {
      let P = Uc(G);
      if (P.success === !0)
        return {
          success: !0,
          value: gt(P.value[0], P.value[1]),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function Uc(G) {
      let P = [],
        M = G,
        oe = ta(M);
      if ((P.push(...oe.failedExpectations), oe.success === !1))
        return { success: !1, remainder: oe.remainder, failedExpectations: P };
      M = oe.remainder;
      let ee = Es(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      return (
        (M = ee.remainder),
        { success: !0, value: [oe.value, ee.value], remainder: M, failedExpectations: P }
      );
    }
    function ta(G) {
      let P = La(G);
      if (P.success === !0)
        return {
          success: !0,
          value: Mt(P.value[0], P.value[1]),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function La(G) {
      let P = [],
        M = G,
        oe = na(M);
      if ((P.push(...oe.failedExpectations), oe.success === !1))
        return { success: !1, remainder: oe.remainder, failedExpectations: P };
      M = oe.remainder;
      let ee = Xt(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      return (
        (M = ee.remainder),
        { success: !0, value: [oe.value, ee.value], remainder: M, failedExpectations: P }
      );
    }
    function na(G) {
      let P = Fc(G);
      if (P.success === !0)
        return {
          success: !0,
          value: Ft(P.value[0], P.value[1]),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function Fc(G) {
      let P = [],
        M = G,
        oe = qi(M);
      if ((P.push(...oe.failedExpectations), oe.success === !1))
        return { success: !1, remainder: oe.remainder, failedExpectations: P };
      M = oe.remainder;
      let ee = We(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      return (
        (M = ee.remainder),
        { success: !0, value: [oe.value, ee.value], remainder: M, failedExpectations: P }
      );
    }
    function qi(G) {
      let P = [wi, j],
        M = [];
      for (let oe = P.shift(); oe !== void 0; oe = P.shift()) {
        let ee = oe(G);
        if ((M.push(...ee.failedExpectations), ee.success === !0))
          return { success: !0, value: ee.value, remainder: ee.remainder, failedExpectations: M };
      }
      return { success: !1, remainder: G, failedExpectations: M };
    }
    function wi(G) {
      let P = ze(G);
      if (P.success === !0)
        return {
          success: !0,
          value: we(P.value[0], P.value[1]),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function ze(G) {
      let P = [],
        M = G,
        match = M.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      if ((P.push({ expectation: wr, remainder: M }, { expectation: Tr, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = ho(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      M = ee.remainder;
      let de = df(M);
      if ((P.push(...de.failedExpectations), de.success === !1))
        return { success: !1, remainder: de.remainder, failedExpectations: P };
      return (
        (M = de.remainder),
        { success: !0, value: [ee.value, de.value], remainder: M, failedExpectations: P }
      );
    }
    function ot(G) {
      let P = [],
        M = G,
        oe = gn(M);
      if ((P.push(...oe.failedExpectations), oe.success === !1))
        return { success: !1, remainder: oe.remainder, failedExpectations: P };
      M = oe.remainder;
      let ee = dr(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      M = ee.remainder;
      let de = $c(M);
      if ((P.push(...de.failedExpectations), de.success === !1))
        return { success: !1, remainder: de.remainder, failedExpectations: P };
      return (
        (M = de.remainder),
        { success: !0, value: [oe.value, ee.value, de.value], remainder: M, failedExpectations: P }
      );
    }
    function gn(G) {
      let P = vn(G);
      if (P.success === !0) return P;
      return { success: !0, value: null, remainder: G, failedExpectations: P.failedExpectations };
    }
    function vn(G) {
      let P = pr(G);
      if (P.success === !0) return P;
      return {
        success: !1,
        remainder: P.remainder,
        failedExpectations: [{ expectation: wr, remainder: P.remainder }],
      };
    }
    function pr(G) {
      let match = G.match(/^([\t\n\f\r ])+/g);
      if (match?.length === 1)
        return { success: !0, value: match[0], remainder: G.slice(match[0].length), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: Mie, remainder: G }] };
    }
    function dr(G) {
      let P = Ti(G);
      if (P.success === !0) return P;
      return { success: !0, value: null, remainder: G, failedExpectations: P.failedExpectations };
    }
    function Ti(G) {
      let P = $s(G);
      if (P.success === !0) return P;
      return {
        success: !1,
        remainder: P.remainder,
        failedExpectations: [{ expectation: Tr, remainder: P.remainder }],
      };
    }
    function $s(G) {
      let P = [],
        M = G,
        oe = Ba(M);
      if ((P.push(...oe.failedExpectations), oe.success === !1))
        return { success: !1, remainder: oe.remainder, failedExpectations: P };
      M = oe.remainder;
      let ee = po(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      M = ee.remainder;
      let de = Mc(M);
      if ((P.push(...de.failedExpectations), de.success === !1))
        return { success: !1, remainder: de.remainder, failedExpectations: P };
      return (
        (M = de.remainder),
        { success: !0, value: [oe.value, ee.value, de.value], remainder: M, failedExpectations: P }
      );
    }
    function Ba(G) {
      if (G.startsWith("//"))
        return { success: !0, value: "//", remainder: G.slice(2), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: $ie, remainder: G }] };
    }
    function po(G) {
      let P = [],
        M = [],
        oe = G;
      while (!0) {
        let de = jl(oe);
        if ((M.push(...de.failedExpectations), de.success === !1)) break;
        ((oe = de.remainder), P.push(de.value));
      }
      return { success: !0, value: P, remainder: oe, failedExpectations: M };
    }
    function jl(G) {
      if (/^[^\r\n]/g.test(G))
        return { success: !0, value: G.slice(0, 1), remainder: G.slice(1), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: Vie, remainder: G }] };
    }
    function Mc(G) {
      let P = Ua(G);
      if (P.success === !0) return P;
      return {
        success: !1,
        remainder: P.remainder,
        failedExpectations: [{ expectation: Gie, remainder: P.remainder }],
      };
    }
    function Ua(G) {
      let P = [],
        M = [],
        oe = G;
      while (!0) {
        let de = Fa(oe);
        if ((M.push(...de.failedExpectations), de.success === !1)) break;
        ((oe = de.remainder), P.push(de.value));
      }
      if (P.length < 1) return { success: !1, remainder: G, failedExpectations: M };
      return { success: !0, value: P, remainder: oe, failedExpectations: M };
    }
    function Fa(G) {
      if (/^[\r\n]/g.test(G))
        return { success: !0, value: G.slice(0, 1), remainder: G.slice(1), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: Wie, remainder: G }] };
    }
    function $c(G) {
      let P = vn(G);
      if (P.success === !0) return P;
      return { success: !0, value: null, remainder: G, failedExpectations: P.failedExpectations };
    }
    function ho(G) {
      let P = [wn, Sh, xh, Th, Lb, Bb, Fb],
        M = [];
      for (let oe = P.shift(); oe !== void 0; oe = P.shift()) {
        let ee = oe(G);
        if ((M.push(...ee.failedExpectations), ee.success === !0))
          return { success: !0, value: ee.value, remainder: ee.remainder, failedExpectations: M };
      }
      return { success: !1, remainder: G, failedExpectations: M };
    }
    function wn(G) {
      let P = [In, Kn, $a, Vc, of, yh, lf],
        M = [];
      for (let oe = P.shift(); oe !== void 0; oe = P.shift()) {
        let ee = oe(G);
        if ((M.push(...ee.failedExpectations), ee.success === !0))
          return { success: !0, value: ee.value, remainder: ee.remainder, failedExpectations: M };
      }
      return { success: !1, remainder: G, failedExpectations: M };
    }
    function In(G) {
      let P = rn(G);
      if (P.success === !0) return P;
      return {
        success: !1,
        remainder: P.remainder,
        failedExpectations: [{ expectation: Kie, remainder: P.remainder }],
      };
    }
    function rn(G) {
      let P = sn(G);
      if (P.success === !0)
        return {
          success: !0,
          value: b(() => e.length - G.length, P.value),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function sn(G) {
      let match = G.match(
        /^((-)?([0-9])*\.([0-9])+([eE]([+\-])?([0-9])+)?|(-)?([0-9])+[eE]([+\-])?([0-9])+)/g,
      );
      if (match?.length === 1)
        return { success: !0, value: match[0], remainder: G.slice(match[0].length), failedExpectations: [] };
      return {
        success: !1,
        remainder: G,
        failedExpectations: [
          { expectation: X_, remainder: G },
          { expectation: J_, remainder: G },
          { expectation: Cc, remainder: G },
        ],
      };
    }
    function Kn(G) {
      let P = Cr(G);
      if (P.success === !0) return P;
      return {
        success: !1,
        remainder: P.remainder,
        failedExpectations: [{ expectation: jie, remainder: P.remainder }],
      };
    }
    function Cr(G) {
      let P = Rs(G);
      if (P.success === !0)
        return {
          success: !0,
          value: S(() => e.length - G.length, P.value[0]),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function Rs(G) {
      let P = [],
        M = G,
        oe = Ma(M);
      if ((P.push(...oe.failedExpectations), oe.success === !1))
        return { success: !1, remainder: oe.remainder, failedExpectations: P };
      M = oe.remainder;
      let match = M.match(/^[uU]/g);
      if ((P.push({ expectation: qie, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      return (
        (M = M.slice(match[0].length)),
        { success: !0, value: [oe.value], remainder: M, failedExpectations: P }
      );
    }
    function Ma(G) {
      let match = G.match(/^(0x([0-9abcdefABCDEF])+|([0-9])+)/g);
      if (match?.length === 1)
        return { success: !0, value: match[0], remainder: G.slice(match[0].length), failedExpectations: [] };
      return {
        success: !1,
        remainder: G,
        failedExpectations: [
          { expectation: bU, remainder: G },
          { expectation: J_, remainder: G },
        ],
      };
    }
    function $a(G) {
      let P = qd(G);
      if (P.success === !0) return P;
      return {
        success: !1,
        remainder: P.remainder,
        failedExpectations: [{ expectation: Yie, remainder: P.remainder }],
      };
    }
    function qd(G) {
      let P = jd(G);
      if (P.success === !0)
        return {
          success: !0,
          value: w(() => e.length - G.length, P.value),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function jd(G) {
      let match = G.match(/^(-)?(0x([0-9abcdefABCDEF])+|([0-9])+)/g);
      if (match?.length === 1)
        return { success: !0, value: match[0], remainder: G.slice(match[0].length), failedExpectations: [] };
      return {
        success: !1,
        remainder: G,
        failedExpectations: [
          { expectation: X_, remainder: G },
          { expectation: bU, remainder: G },
          { expectation: J_, remainder: G },
        ],
      };
    }
    function Vc(G) {
      let P = sh(G);
      if (P.success === !0) return P;
      return {
        success: !1,
        remainder: P.remainder,
        failedExpectations: [{ expectation: ooe, remainder: P.remainder }],
      };
    }
    function sh(G) {
      let P = Yd(G);
      if (P.success === !0)
        return {
          success: !0,
          value: K(() => e.length - G.length, P.value),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function Yd(G) {
      let P = ih(G);
      if (P.success === !0) return P;
      return {
        success: !1,
        remainder: P.remainder,
        failedExpectations: [{ expectation: ioe, remainder: P.remainder }],
      };
    }
    function ih(G) {
      let P = [ra, uh],
        M = [];
      for (let oe = P.shift(); oe !== void 0; oe = P.shift()) {
        let ee = oe(G);
        if ((M.push(...ee.failedExpectations), ee.success === !0))
          return { success: !0, value: ee.value, remainder: ee.remainder, failedExpectations: M };
      }
      return { success: !1, remainder: G, failedExpectations: M };
    }
    function ra(G) {
      let P = [],
        M = G,
        match = M.match(/^[rR]/g);
      if ((P.push({ expectation: Zie, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = Wc(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      return ((M = ee.remainder), { success: !0, value: ee.value, remainder: M, failedExpectations: P });
    }
    function Wc(G) {
      let P = [Gc, Zd, lh, zd],
        M = [];
      for (let oe = P.shift(); oe !== void 0; oe = P.shift()) {
        let ee = oe(G);
        if ((M.push(...ee.failedExpectations), ee.success === !0))
          return { success: !0, value: ee.value, remainder: ee.remainder, failedExpectations: M };
      }
      return { success: !1, remainder: G, failedExpectations: M };
    }
    function Gc(G) {
      let P = [],
        M = G,
        match = M.match(/^"""/g);
      if ((P.push({ expectation: zy, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = Hc(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      M = ee.remainder;
      let match_2 = M.match(/^"""/g);
      if ((P.push({ expectation: zy, remainder: M }), match_2?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      return (
        (M = M.slice(match_2[0].length)),
        { success: !0, value: ee.value, remainder: M, failedExpectations: P }
      );
    }
    function Hc(G) {
      let P = [],
        M = [],
        oe = G;
      while (!0) {
        let de = oh(oe);
        if ((M.push(...de.failedExpectations), de.success === !1)) break;
        ((oe = de.remainder), P.push(de.value));
      }
      return { success: !0, value: P, remainder: oe, failedExpectations: M };
    }
    function oh(G) {
      let P = [],
        M = G,
        match = M.match(/^(?!""")/g);
      if ((P.push(), match?.length !== 1)) return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = Va(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      return ((M = ee.remainder), { success: !0, value: ee.value, remainder: M, failedExpectations: P });
    }
    function Va(G) {
      if (G.length > 0)
        return { success: !0, value: G.slice(0, 1), remainder: G.slice(1), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: Ml, remainder: G }] };
    }
    function Zd(G) {
      let P = [],
        M = G,
        match = M.match(/^'''/g);
      if ((P.push({ expectation: Xy, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = Yl(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      M = ee.remainder;
      let match_2 = M.match(/^'''/g);
      if ((P.push({ expectation: Xy, remainder: M }), match_2?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      return (
        (M = M.slice(match_2[0].length)),
        { success: !0, value: ee.value, remainder: M, failedExpectations: P }
      );
    }
    function Yl(G) {
      let P = [],
        M = [],
        oe = G;
      while (!0) {
        let de = hb(oe);
        if ((M.push(...de.failedExpectations), de.success === !1)) break;
        ((oe = de.remainder), P.push(de.value));
      }
      return { success: !0, value: P, remainder: oe, failedExpectations: M };
    }
    function hb(G) {
      let P = [],
        M = G,
        match = M.match(/^(?!''')/g);
      if ((P.push(), match?.length !== 1)) return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = ah(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      return ((M = ee.remainder), { success: !0, value: ee.value, remainder: M, failedExpectations: P });
    }
    function ah(G) {
      if (G.length > 0)
        return { success: !0, value: G.slice(0, 1), remainder: G.slice(1), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: Ml, remainder: G }] };
    }
    function lh(G) {
      let P = [],
        M = G,
        match = M.match(/^"/g);
      if ((P.push({ expectation: Jy, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = mb(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      M = ee.remainder;
      let match_2 = M.match(/^"/g);
      if ((P.push({ expectation: Jy, remainder: M }), match_2?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      return (
        (M = M.slice(match_2[0].length)),
        { success: !0, value: ee.value, remainder: M, failedExpectations: P }
      );
    }
    function mb(G) {
      let P = [],
        M = [],
        oe = G;
      while (!0) {
        let de = gb(oe);
        if ((M.push(...de.failedExpectations), de.success === !1)) break;
        ((oe = de.remainder), P.push(de.value));
      }
      return { success: !0, value: P, remainder: oe, failedExpectations: M };
    }
    function gb(G) {
      let P = [],
        M = G,
        match = M.match(/^(?!("|([\r\n])+))/g);
      if ((P.push(), match?.length !== 1)) return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = yb(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      return ((M = ee.remainder), { success: !0, value: ee.value, remainder: M, failedExpectations: P });
    }
    function yb(G) {
      if (G.length > 0)
        return { success: !0, value: G.slice(0, 1), remainder: G.slice(1), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: Ml, remainder: G }] };
    }
    function zd(G) {
      let P = [],
        M = G,
        match = M.match(/^'/g);
      if ((P.push({ expectation: Qy, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = ch(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      M = ee.remainder;
      let match_2 = M.match(/^'/g);
      if ((P.push({ expectation: Qy, remainder: M }), match_2?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      return (
        (M = M.slice(match_2[0].length)),
        { success: !0, value: ee.value, remainder: M, failedExpectations: P }
      );
    }
    function ch(G) {
      let P = [],
        M = [],
        oe = G;
      while (!0) {
        let de = Kc(oe);
        if ((M.push(...de.failedExpectations), de.success === !1)) break;
        ((oe = de.remainder), P.push(de.value));
      }
      return { success: !0, value: P, remainder: oe, failedExpectations: M };
    }
    function Kc(G) {
      let P = [],
        M = G,
        match = M.match(/^(?!('|([\r\n])+))/g);
      if ((P.push(), match?.length !== 1)) return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = Xd(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      return ((M = ee.remainder), { success: !0, value: ee.value, remainder: M, failedExpectations: P });
    }
    function Xd(G) {
      if (G.length > 0)
        return { success: !0, value: G.slice(0, 1), remainder: G.slice(1), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: Ml, remainder: G }] };
    }
    function uh(G) {
      let P = [Jd, wb, aa, sf],
        M = [];
      for (let oe = P.shift(); oe !== void 0; oe = P.shift()) {
        let ee = oe(G);
        if ((M.push(...ee.failedExpectations), ee.success === !0))
          return { success: !0, value: ee.value, remainder: ee.remainder, failedExpectations: M };
      }
      return { success: !1, remainder: G, failedExpectations: M };
    }
    function Jd(G) {
      let P = [],
        M = G,
        match = M.match(/^"""/g);
      if ((P.push({ expectation: zy, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = bb(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      M = ee.remainder;
      let match_2 = M.match(/^"""/g);
      if ((P.push({ expectation: zy, remainder: M }), match_2?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      return (
        (M = M.slice(match_2[0].length)),
        { success: !0, value: ee.value, remainder: M, failedExpectations: P }
      );
    }
    function bb(G) {
      let P = [],
        M = [],
        oe = G;
      while (!0) {
        let de = Qd(oe);
        if ((M.push(...de.failedExpectations), de.success === !1)) break;
        ((oe = de.remainder), P.push(de.value));
      }
      return { success: !0, value: P, remainder: oe, failedExpectations: M };
    }
    function Qd(G) {
      let P = [Wa, oa],
        M = [];
      for (let oe = P.shift(); oe !== void 0; oe = P.shift()) {
        let ee = oe(G);
        if ((M.push(...ee.failedExpectations), ee.success === !0))
          return { success: !0, value: ee.value, remainder: ee.remainder, failedExpectations: M };
      }
      return { success: !1, remainder: G, failedExpectations: M };
    }
    function Wa(G) {
      let P = Sb(G);
      if (P.success === !0) return P;
      return {
        success: !1,
        remainder: P.remainder,
        failedExpectations: [{ expectation: soe, remainder: P.remainder }],
      };
    }
    function Sb(G) {
      let P = [ef, Ai, vb],
        M = [];
      for (let oe = P.shift(); oe !== void 0; oe = P.shift()) {
        let ee = oe(G);
        if ((M.push(...ee.failedExpectations), ee.success === !0))
          return { success: !0, value: ee.value, remainder: ee.remainder, failedExpectations: M };
      }
      return { success: !1, remainder: G, failedExpectations: M };
    }
    function ef(G) {
      let P = tf(G);
      if (P.success === !0) return P;
      return {
        success: !1,
        remainder: P.remainder,
        failedExpectations: [{ expectation: toe, remainder: P.remainder }],
      };
    }
    function tf(G) {
      let P = [],
        M = [],
        oe = G;
      while (!0) {
        let de = sa(oe);
        if ((M.push(...de.failedExpectations), de.success === !1)) break;
        ((oe = de.remainder), P.push(de.value));
      }
      if (P.length < 1) return { success: !1, remainder: G, failedExpectations: M };
      return { success: !0, value: P, remainder: oe, failedExpectations: M };
    }
    function sa(G) {
      let P = Eb(G);
      if (P.success === !0) return P;
      return {
        success: !1,
        remainder: P.remainder,
        failedExpectations: [{ expectation: eoe, remainder: P.remainder }],
      };
    }
    function Eb(G) {
      let P = [dh, xb, Zl, fh],
        M = [];
      for (let oe = P.shift(); oe !== void 0; oe = P.shift()) {
        let ee = oe(G);
        if ((M.push(...ee.failedExpectations), ee.success === !0))
          return { success: !0, value: ee.value, remainder: ee.remainder, failedExpectations: M };
      }
      return { success: !1, remainder: G, failedExpectations: M };
    }
    function dh(G) {
      let P = nf(G);
      if (P.success === !0)
        return { success: !0, value: R(P.value[0]), remainder: P.remainder, failedExpectations: [] };
      return P;
    }
    function nf(G) {
      let P = [],
        M = G,
        match = M.match(/^\\/g);
      if ((P.push({ expectation: e0, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let match_2 = M.match(/^[xX]/g);
      if ((P.push({ expectation: zie, remainder: M }), match_2?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match_2[0].length);
      let de = ji(M);
      if ((P.push(...de.failedExpectations), de.success === !1))
        return { success: !1, remainder: de.remainder, failedExpectations: P };
      return ((M = de.remainder), { success: !0, value: [de.value], remainder: M, failedExpectations: P });
    }
    function ji(G) {
      let match = G.match(/^([0-9abcdefABCDEF][0-9abcdefABCDEF]){0,1}/g);
      if (match?.length === 1)
        return { success: !0, value: match[0], remainder: G.slice(match[0].length), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: Q_, remainder: G }] };
    }
    function xb(G) {
      let P = _b(G);
      if (P.success === !0)
        return { success: !0, value: D(P.value[0]), remainder: P.remainder, failedExpectations: [] };
      return P;
    }
    function _b(G) {
      let P = [],
        M = G,
        match = M.match(/^\\u/g);
      if ((P.push({ expectation: Xie, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = is(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      return ((M = ee.remainder), { success: !0, value: [ee.value], remainder: M, failedExpectations: P });
    }
    function is(G) {
      let match = G.match(/^([0-9abcdefABCDEF][0-9abcdefABCDEF]){0,2}/g);
      if (match?.length === 1)
        return { success: !0, value: match[0], remainder: G.slice(match[0].length), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: Q_, remainder: G }] };
    }
    function Zl(G) {
      let P = Mw(G);
      if (P.success === !0)
        return { success: !0, value: O(P.value[0]), remainder: P.remainder, failedExpectations: [] };
      return P;
    }
    function Mw(G) {
      let P = [],
        M = G,
        match = M.match(/^\\U/g);
      if ((P.push({ expectation: Jie, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = Ga(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      return ((M = ee.remainder), { success: !0, value: [ee.value], remainder: M, failedExpectations: P });
    }
    function Ga(G) {
      let match = G.match(/^([0-9abcdefABCDEF][0-9abcdefABCDEF]){0,4}/g);
      if (match?.length === 1)
        return { success: !0, value: match[0], remainder: G.slice(match[0].length), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: Q_, remainder: G }] };
    }
    function fh(G) {
      let P = ph(G);
      if (P.success === !0)
        return { success: !0, value: L(P.value[0]), remainder: P.remainder, failedExpectations: [] };
      return P;
    }
    function ph(G) {
      let P = [],
        M = G,
        match = M.match(/^\\/g);
      if ((P.push({ expectation: e0, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = rf(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      return ((M = ee.remainder), { success: !0, value: [ee.value], remainder: M, failedExpectations: P });
    }
    function rf(G) {
      let match = G.match(/^[0-3][0-7][0-7]/g);
      if (match?.length === 1)
        return { success: !0, value: match[0], remainder: G.slice(match[0].length), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: Qie, remainder: G }] };
    }
    function Ai(G) {
      let P = Yi(G);
      if (P.success === !0)
        return { success: !0, value: V(P.value[0]), remainder: P.remainder, failedExpectations: [] };
      return P;
    }
    function Yi(G) {
      let P = [],
        M = G,
        match = M.match(/^\\/g);
      if ((P.push({ expectation: e0, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = hh(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      return ((M = ee.remainder), { success: !0, value: [ee.value], remainder: M, failedExpectations: P });
    }
    function hh(G) {
      if (/^[abfnrtv]/g.test(G))
        return { success: !0, value: G.slice(0, 1), remainder: G.slice(1), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: noe, remainder: G }] };
    }
    function vb(G) {
      let P = [],
        M = G,
        match = M.match(/^\\/g);
      if ((P.push({ expectation: e0, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = zl(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      return ((M = ee.remainder), { success: !0, value: ee.value, remainder: M, failedExpectations: P });
    }
    function zl(G) {
      if (/^["'`\\?]/g.test(G))
        return { success: !0, value: G.slice(0, 1), remainder: G.slice(1), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: roe, remainder: G }] };
    }
    function oa(G) {
      let match = G.match(/^(?!""")[\s\S]/g);
      if (match?.length === 1)
        return { success: !0, value: match[0], remainder: G.slice(match[0].length), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: Ml, remainder: G }] };
    }
    function wb(G) {
      let P = [],
        M = G,
        match = M.match(/^'''/g);
      if ((P.push({ expectation: Xy, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = Tb(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      M = ee.remainder;
      let match_2 = M.match(/^'''/g);
      if ((P.push({ expectation: Xy, remainder: M }), match_2?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      return (
        (M = M.slice(match_2[0].length)),
        { success: !0, value: ee.value, remainder: M, failedExpectations: P }
      );
    }
    function Tb(G) {
      let P = [],
        M = [],
        oe = G;
      while (!0) {
        let de = mo(oe);
        if ((M.push(...de.failedExpectations), de.success === !1)) break;
        ((oe = de.remainder), P.push(de.value));
      }
      return { success: !0, value: P, remainder: oe, failedExpectations: M };
    }
    function mo(G) {
      let P = [Wa, qc],
        M = [];
      for (let oe = P.shift(); oe !== void 0; oe = P.shift()) {
        let ee = oe(G);
        if ((M.push(...ee.failedExpectations), ee.success === !0))
          return { success: !0, value: ee.value, remainder: ee.remainder, failedExpectations: M };
      }
      return { success: !1, remainder: G, failedExpectations: M };
    }
    function qc(G) {
      let match = G.match(/^(?!''')[\s\S]/g);
      if (match?.length === 1)
        return { success: !0, value: match[0], remainder: G.slice(match[0].length), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: Ml, remainder: G }] };
    }
    function aa(G) {
      let P = [],
        M = G,
        match = M.match(/^"/g);
      if ((P.push({ expectation: Jy, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = jc(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      M = ee.remainder;
      let match_2 = M.match(/^"/g);
      if ((P.push({ expectation: Jy, remainder: M }), match_2?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      return (
        (M = M.slice(match_2[0].length)),
        { success: !0, value: ee.value, remainder: M, failedExpectations: P }
      );
    }
    function jc(G) {
      let P = [],
        M = [],
        oe = G;
      while (!0) {
        let de = Yc(oe);
        if ((M.push(...de.failedExpectations), de.success === !1)) break;
        ((oe = de.remainder), P.push(de.value));
      }
      return { success: !0, value: P, remainder: oe, failedExpectations: M };
    }
    function Yc(G) {
      let P = [Wa, Js],
        M = [];
      for (let oe = P.shift(); oe !== void 0; oe = P.shift()) {
        let ee = oe(G);
        if ((M.push(...ee.failedExpectations), ee.success === !0))
          return { success: !0, value: ee.value, remainder: ee.remainder, failedExpectations: M };
      }
      return { success: !1, remainder: G, failedExpectations: M };
    }
    function Js(G) {
      let match = G.match(/^(?!("|([\r\n])+))[\s\S]/g);
      if (match?.length === 1)
        return { success: !0, value: match[0], remainder: G.slice(match[0].length), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: Ml, remainder: G }] };
    }
    function sf(G) {
      let P = [],
        M = G,
        match = M.match(/^'/g);
      if ((P.push({ expectation: Qy, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = Ha(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      M = ee.remainder;
      let match_2 = M.match(/^'/g);
      if ((P.push({ expectation: Qy, remainder: M }), match_2?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      return (
        (M = M.slice(match_2[0].length)),
        { success: !0, value: ee.value, remainder: M, failedExpectations: P }
      );
    }
    function Ha(G) {
      let P = [],
        M = [],
        oe = G;
      while (!0) {
        let de = mi(oe);
        if ((M.push(...de.failedExpectations), de.success === !1)) break;
        ((oe = de.remainder), P.push(de.value));
      }
      return { success: !0, value: P, remainder: oe, failedExpectations: M };
    }
    function mi(G) {
      let P = [Wa, mh],
        M = [];
      for (let oe = P.shift(); oe !== void 0; oe = P.shift()) {
        let ee = oe(G);
        if ((M.push(...ee.failedExpectations), ee.success === !0))
          return { success: !0, value: ee.value, remainder: ee.remainder, failedExpectations: M };
      }
      return { success: !1, remainder: G, failedExpectations: M };
    }
    function mh(G) {
      let match = G.match(/^(?!('|([\r\n])+))[\s\S]/g);
      if (match?.length === 1)
        return { success: !0, value: match[0], remainder: G.slice(match[0].length), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: Ml, remainder: G }] };
    }
    function of(G) {
      let P = Xl(G);
      if (P.success === !0) return P;
      return {
        success: !1,
        remainder: P.remainder,
        failedExpectations: [{ expectation: loe, remainder: P.remainder }],
      };
    }
    function Xl(G) {
      let P = gh(G);
      if (P.success === !0)
        return {
          success: !0,
          value: q(() => e.length - G.length, P.value[0]),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function gh(G) {
      let P = [],
        M = G,
        match = M.match(/^[bB]/g);
      if ((P.push({ expectation: aoe, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = Yd(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      return ((M = ee.remainder), { success: !0, value: [ee.value], remainder: M, failedExpectations: P });
    }
    function yh(G) {
      let P = la(G);
      if (P.success === !0) return P;
      return {
        success: !1,
        remainder: P.remainder,
        failedExpectations: [{ expectation: doe, remainder: P.remainder }],
      };
    }
    function la(G) {
      let P = yo(G);
      if (P.success === !0)
        return {
          success: !0,
          value: Z(() => e.length - G.length, P.value),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function yo(G) {
      let P = [Ab, af],
        M = [];
      for (let oe = P.shift(); oe !== void 0; oe = P.shift()) {
        let ee = oe(G);
        if ((M.push(...ee.failedExpectations), ee.success === !0))
          return { success: !0, value: ee.value, remainder: ee.remainder, failedExpectations: M };
      }
      return { success: !1, remainder: G, failedExpectations: M };
    }
    function Ab(G) {
      if (G.startsWith("true"))
        return { success: !0, value: "true", remainder: G.slice(4), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: coe, remainder: G }] };
    }
    function af(G) {
      if (G.startsWith("false"))
        return { success: !0, value: "false", remainder: G.slice(5), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: uoe, remainder: G }] };
    }
    function lf(G) {
      let P = gi(G);
      if (P.success === !0) return P;
      return {
        success: !1,
        remainder: P.remainder,
        failedExpectations: [{ expectation: poe, remainder: P.remainder }],
      };
    }
    function gi(G) {
      let P = bh(G);
      if (P.success === !0)
        return {
          success: !0,
          value: J(() => e.length - G.length),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function bh(G) {
      let P = [],
        M = G,
        match = M.match(/^null/g);
      if ((P.push({ expectation: foe, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let match_2 = M.match(/^(?![_a-zA-Z0-9])/g);
      if ((P.push(), match_2?.length !== 1)) return { success: !1, remainder: M, failedExpectations: P };
      return (
        (M = M.slice(match_2[0].length)),
        { success: !0, value: [], remainder: M, failedExpectations: P }
      );
    }
    function Sh(G) {
      let P = Ka(G);
      if (P.success === !0)
        return {
          success: !0,
          value: ae(() => e.length - G.length, P.value[0], P.value[1]),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function Ka(G) {
      let P = [],
        M = G,
        match = M.match(/^(\.)?/g);
      if ((P.push({ expectation: Cc, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let match_2 = M.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      if (
        (P.push({ expectation: wr, remainder: M }, { expectation: Tr, remainder: M }), match_2?.length !== 1)
      )
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match_2[0].length);
      let de = cf(M);
      if ((P.push(...de.failedExpectations), de.success === !1))
        return { success: !1, remainder: de.remainder, failedExpectations: P };
      M = de.remainder;
      let match_3 = M.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      if (
        (P.push({ expectation: wr, remainder: M }, { expectation: Tr, remainder: M }), match_3?.length !== 1)
      )
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match_3[0].length);
      let match_4 = M.match(/^\(/g);
      if ((P.push({ expectation: ev, remainder: M }), match_4?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match_4[0].length);
      let es = Jl(M);
      if ((P.push(...es.failedExpectations), es.success === !1))
        return { success: !1, remainder: es.remainder, failedExpectations: P };
      M = es.remainder;
      let match_5 = M.match(/^\)/g);
      if ((P.push({ expectation: tv, remainder: M }), match_5?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      return (
        (M = M.slice(match_5[0].length)),
        { success: !0, value: [de.value, es.value], remainder: M, failedExpectations: P }
      );
    }
    function cf(G) {
      let P = Eh(G);
      if (P.success === !0) return P;
      return {
        success: !1,
        remainder: P.remainder,
        failedExpectations: [{ expectation: hoe, remainder: P.remainder }],
      };
    }
    function Eh(G) {
      let P = Zc(G);
      if (P.success === !0)
        return {
          success: !0,
          value: ie((M, oe = Ap.getLocation(grammarSource, e, G, P.remainder), ee) => {
            throw new xd(M, oe, ee);
          }, P.value),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function Zc(G) {
      let match = G.match(/^[_a-zA-Z]([_a-zA-Z0-9])*/g);
      if (match?.length === 1)
        return { success: !0, value: match[0], remainder: G.slice(match[0].length), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: SU, remainder: G }] };
    }
    function Jl(G) {
      let P = [],
        M = [],
        oe = G;
      while (!0) {
        let ee = oe;
        if (P.length > 0) {
          let pn = Cb(ee);
          if ((M.push(...pn.failedExpectations), pn.success === !1)) break;
          ee = pn.remainder;
        }
        let de = vt(ee);
        if ((M.push(...de.failedExpectations), de.success === !1)) break;
        ((oe = de.remainder), P.push(de.value));
      }
      return { success: !0, value: P, remainder: oe, failedExpectations: M };
    }
    function Cb(G) {
      if (G.startsWith(","))
        return { success: !0, value: ",", remainder: G.slice(1), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: Ed, remainder: G }] };
    }
    function xh(G) {
      let P = Rb(G);
      if (P.success === !0)
        return {
          success: !0,
          value: me(() => e.length - G.length, P.value[0], P.value[1], P.value[2]),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function Rb(G) {
      let P = [],
        M = G,
        oe = Ib(M);
      if ((P.push(...oe.failedExpectations), oe.success === !1))
        return { success: !1, remainder: oe.remainder, failedExpectations: P };
      M = oe.remainder;
      let match = M.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      if ((P.push({ expectation: wr, remainder: M }, { expectation: Tr, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let de = kb(M);
      if ((P.push(...de.failedExpectations), de.success === !1))
        return { success: !1, remainder: de.remainder, failedExpectations: P };
      M = de.remainder;
      let match_2 = M.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      if (
        (P.push({ expectation: wr, remainder: M }, { expectation: Tr, remainder: M }), match_2?.length !== 1)
      )
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match_2[0].length);
      let match_3 = M.match(/^\{/g);
      if ((P.push({ expectation: EU, remainder: M }), match_3?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match_3[0].length);
      let es = Ob(M);
      if ((P.push(...es.failedExpectations), es.success === !1))
        return { success: !1, remainder: es.remainder, failedExpectations: P };
      M = es.remainder;
      let match_4 = M.match(/^(,)?/g);
      if ((P.push({ expectation: Ed, remainder: M }), match_4?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match_4[0].length);
      let match_5 = M.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      if (
        (P.push({ expectation: wr, remainder: M }, { expectation: Tr, remainder: M }), match_5?.length !== 1)
      )
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match_5[0].length);
      let match_6 = M.match(/^\}/g);
      if ((P.push({ expectation: xU, remainder: M }), match_6?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      return (
        (M = M.slice(match_6[0].length)),
        { success: !0, value: [oe.value, de.value, es.value], remainder: M, failedExpectations: P }
      );
    }
    function Ib(G) {
      let P = Nb(G);
      if (P.success === !0) return P;
      return { success: !0, value: null, remainder: G, failedExpectations: P.failedExpectations };
    }
    function Nb(G) {
      if (G.startsWith("."))
        return { success: !0, value: ".", remainder: G.slice(1), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: Cc, remainder: G }] };
    }
    function kb(G) {
      let P = [],
        M = [],
        oe = G;
      while (!0) {
        let ee = oe;
        if (P.length > 0) {
          let pn = vh(ee);
          if ((M.push(...pn.failedExpectations), pn.success === !1)) break;
          ee = pn.remainder;
        }
        let de = Ql(ee);
        if ((M.push(...de.failedExpectations), de.success === !1)) break;
        ((oe = de.remainder), P.push(de.value));
      }
      if (P.length < 1) return { success: !1, remainder: G, failedExpectations: M };
      return { success: !0, value: P, remainder: oe, failedExpectations: M };
    }
    function Ql(G) {
      let P = _h(G);
      if (P.success === !0) return P;
      return {
        success: !1,
        remainder: P.remainder,
        failedExpectations: [{ expectation: moe, remainder: P.remainder }],
      };
    }
    function _h(G) {
      let P = zc(G);
      if (P.success === !0)
        return {
          success: !0,
          value: Se((M, oe = Ap.getLocation(grammarSource, e, G, P.remainder), ee) => {
            throw new xd(M, oe, ee);
          }, P.value),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function zc(G) {
      let match = G.match(/^[_a-zA-Z]([_a-zA-Z0-9])*/g);
      if (match?.length === 1)
        return { success: !0, value: match[0], remainder: G.slice(match[0].length), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: SU, remainder: G }] };
    }
    function vh(G) {
      let P = [],
        M = G,
        oe = ot(M);
      if ((P.push(...oe.failedExpectations), oe.success === !1))
        return { success: !1, remainder: oe.remainder, failedExpectations: P };
      M = oe.remainder;
      let ee = Db(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      M = ee.remainder;
      let de = ot(M);
      if ((P.push(...de.failedExpectations), de.success === !1))
        return { success: !1, remainder: de.remainder, failedExpectations: P };
      return (
        (M = de.remainder),
        { success: !0, value: [oe.value, ee.value, oe.value], remainder: M, failedExpectations: P }
      );
    }
    function Db(G) {
      if (G.startsWith("."))
        return { success: !0, value: ".", remainder: G.slice(1), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: Cc, remainder: G }] };
    }
    function Ob(G) {
      let P = [],
        M = [],
        oe = G;
      while (!0) {
        let ee = oe;
        if (P.length > 0) {
          let pn = wh(ee);
          if ((M.push(...pn.failedExpectations), pn.success === !1)) break;
          ee = pn.remainder;
        }
        let de = Pb(ee);
        if ((M.push(...de.failedExpectations), de.success === !1)) break;
        ((oe = de.remainder), P.push(de.value));
      }
      return { success: !0, value: P, remainder: oe, failedExpectations: M };
    }
    function Pb(G) {
      let P = uf(G);
      if (P.success === !0)
        return {
          success: !0,
          value: ue(() => e.length - G.length, P.value[0], P.value[1]),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function uf(G) {
      let P = [],
        M = G,
        match = M.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      if ((P.push({ expectation: wr, remainder: M }, { expectation: Tr, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = Ql(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      M = ee.remainder;
      let match_2 = M.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?:/g);
      if (
        (P.push(
          { expectation: wr, remainder: M },
          { expectation: Tr, remainder: M },
          { expectation: nv, remainder: M },
        ),
        match_2?.length !== 1)
      )
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match_2[0].length);
      let pn = vt(M);
      if ((P.push(...pn.failedExpectations), pn.success === !1))
        return { success: !1, remainder: pn.remainder, failedExpectations: P };
      return (
        (M = pn.remainder),
        { success: !0, value: [ee.value, pn.value], remainder: M, failedExpectations: P }
      );
    }
    function wh(G) {
      if (G.startsWith(","))
        return { success: !0, value: ",", remainder: G.slice(1), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: Ed, remainder: G }] };
    }
    function Th(G) {
      let P = Ah(G);
      if (P.success === !0)
        return {
          success: !0,
          value: Ne(() => e.length - G.length, P.value[0]),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function Ah(G) {
      let P = [],
        M = G,
        match = M.match(/^(\.)?/g);
      if ((P.push({ expectation: Cc, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let match_2 = M.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      if (
        (P.push({ expectation: wr, remainder: M }, { expectation: Tr, remainder: M }), match_2?.length !== 1)
      )
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match_2[0].length);
      let de = Ql(M);
      if ((P.push(...de.failedExpectations), de.success === !1))
        return { success: !1, remainder: de.remainder, failedExpectations: P };
      return ((M = de.remainder), { success: !0, value: [de.value], remainder: M, failedExpectations: P });
    }
    function Lb(G) {
      let P = [],
        M = G,
        match = M.match(/^\(/g);
      if ((P.push({ expectation: ev, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = vt(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      M = ee.remainder;
      let match_2 = M.match(/^\)/g);
      if ((P.push({ expectation: tv, remainder: M }), match_2?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      return (
        (M = M.slice(match_2[0].length)),
        { success: !0, value: ee.value, remainder: M, failedExpectations: P }
      );
    }
    function Bb(G) {
      let P = Ub(G);
      if (P.success === !0)
        return {
          success: !0,
          value: Ce(() => e.length - G.length, P.value),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function Ub(G) {
      let P = [],
        M = G,
        match = M.match(/^\[/g);
      if ((P.push({ expectation: _U, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = Jl(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      M = ee.remainder;
      let match_2 = M.match(/^(,)?/g);
      if ((P.push({ expectation: Ed, remainder: M }), match_2?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match_2[0].length);
      let match_3 = M.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      if (
        (P.push({ expectation: wr, remainder: M }, { expectation: Tr, remainder: M }), match_3?.length !== 1)
      )
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match_3[0].length);
      let match_4 = M.match(/^\]/g);
      if ((P.push({ expectation: vU, remainder: M }), match_4?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      return (
        (M = M.slice(match_4[0].length)),
        { success: !0, value: ee.value, remainder: M, failedExpectations: P }
      );
    }
    function Fb(G) {
      let P = Mb(G);
      if (P.success === !0)
        return {
          success: !0,
          value: he(() => e.length - G.length, P.value),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function Mb(G) {
      let P = [],
        M = G,
        match = M.match(/^\{/g);
      if ((P.push({ expectation: EU, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = Ch(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      M = ee.remainder;
      let match_2 = M.match(/^(,)?(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?\}/g);
      if (
        (P.push(
          { expectation: Ed, remainder: M },
          { expectation: wr, remainder: M },
          { expectation: Tr, remainder: M },
          { expectation: xU, remainder: M },
        ),
        match_2?.length !== 1)
      )
        return { success: !1, remainder: M, failedExpectations: P };
      return (
        (M = M.slice(match_2[0].length)),
        { success: !0, value: ee.value, remainder: M, failedExpectations: P }
      );
    }
    function Ch(G) {
      let P = [],
        M = [],
        oe = G;
      while (!0) {
        let ee = oe;
        if (P.length > 0) {
          let pn = Ih(ee);
          if ((M.push(...pn.failedExpectations), pn.success === !1)) break;
          ee = pn.remainder;
        }
        let de = Rh(ee);
        if ((M.push(...de.failedExpectations), de.success === !1)) break;
        ((oe = de.remainder), P.push(de.value));
      }
      return { success: !0, value: P, remainder: oe, failedExpectations: M };
    }
    function Rh(G) {
      let P = $b(G);
      if (P.success === !0)
        return {
          success: !0,
          value: Ie(() => e.length - G.length, P.value[0], P.value[1]),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function $b(G) {
      let P = [],
        M = G,
        oe = vt(M);
      if ((P.push(...oe.failedExpectations), oe.success === !1))
        return { success: !1, remainder: oe.remainder, failedExpectations: P };
      M = oe.remainder;
      let match = M.match(/^:/g);
      if ((P.push({ expectation: nv, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let de = vt(M);
      if ((P.push(...de.failedExpectations), de.success === !1))
        return { success: !1, remainder: de.remainder, failedExpectations: P };
      return (
        (M = de.remainder),
        { success: !0, value: [oe.value, de.value], remainder: M, failedExpectations: P }
      );
    }
    function Ih(G) {
      if (G.startsWith(","))
        return { success: !0, value: ",", remainder: G.slice(1), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: Ed, remainder: G }] };
    }
    function df(G) {
      let P = [],
        M = [],
        oe = G;
      while (!0) {
        let de = Qs(oe);
        if ((M.push(...de.failedExpectations), de.success === !1)) break;
        ((oe = de.remainder), P.push(de.value));
      }
      return { success: !0, value: P, remainder: oe, failedExpectations: M };
    }
    function Qs(G) {
      let P = [],
        M = G,
        match = M.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      if ((P.push({ expectation: wr, remainder: M }, { expectation: Tr, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = Vb(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      return ((M = ee.remainder), { success: !0, value: ee.value, remainder: M, failedExpectations: P });
    }
    function Vb(G) {
      let P = [Nh, kh, pf],
        M = [];
      for (let oe = P.shift(); oe !== void 0; oe = P.shift()) {
        let ee = oe(G);
        if ((M.push(...ee.failedExpectations), ee.success === !0))
          return { success: !0, value: ee.value, remainder: ee.remainder, failedExpectations: M };
      }
      return { success: !1, remainder: G, failedExpectations: M };
    }
    function Nh(G) {
      let P = ff(G);
      if (P.success === !0)
        return {
          success: !0,
          value: ft(() => e.length - G.length, P.value[0]),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function ff(G) {
      let P = [],
        M = G,
        match = M.match(/^\./g);
      if ((P.push({ expectation: Cc, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let match_2 = M.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      if (
        (P.push({ expectation: wr, remainder: M }, { expectation: Tr, remainder: M }), match_2?.length !== 1)
      )
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match_2[0].length);
      let de = Ql(M);
      if ((P.push(...de.failedExpectations), de.success === !1))
        return { success: !1, remainder: de.remainder, failedExpectations: P };
      M = de.remainder;
      let match_3 = M.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      if (
        (P.push({ expectation: wr, remainder: M }, { expectation: Tr, remainder: M }), match_3?.length !== 1)
      )
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match_3[0].length);
      let match_4 = M.match(/^(?![(])/g);
      if ((P.push(), match_4?.length !== 1)) return { success: !1, remainder: M, failedExpectations: P };
      return (
        (M = M.slice(match_4[0].length)),
        { success: !0, value: [de.value], remainder: M, failedExpectations: P }
      );
    }
    function kh(G) {
      let P = Dh(G);
      if (P.success === !0)
        return {
          success: !0,
          value: rt(() => e.length - G.length, P.value[0], P.value[1]),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function Dh(G) {
      let P = [],
        M = G,
        match = M.match(/^\./g);
      if ((P.push({ expectation: Cc, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let match_2 = M.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      if (
        (P.push({ expectation: wr, remainder: M }, { expectation: Tr, remainder: M }), match_2?.length !== 1)
      )
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match_2[0].length);
      let de = Ql(M);
      if ((P.push(...de.failedExpectations), de.success === !1))
        return { success: !1, remainder: de.remainder, failedExpectations: P };
      M = de.remainder;
      let match_3 = M.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      if (
        (P.push({ expectation: wr, remainder: M }, { expectation: Tr, remainder: M }), match_3?.length !== 1)
      )
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match_3[0].length);
      let match_4 = M.match(/^\(/g);
      if ((P.push({ expectation: ev, remainder: M }), match_4?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match_4[0].length);
      let es = Jl(M);
      if ((P.push(...es.failedExpectations), es.success === !1))
        return { success: !1, remainder: es.remainder, failedExpectations: P };
      M = es.remainder;
      let match_5 = M.match(/^\)/g);
      if ((P.push({ expectation: tv, remainder: M }), match_5?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      return (
        (M = M.slice(match_5[0].length)),
        { success: !0, value: [de.value, es.value], remainder: M, failedExpectations: P }
      );
    }
    function pf(G) {
      let P = Wb(G);
      if (P.success === !0)
        return {
          success: !0,
          value: ut(() => e.length - G.length, P.value[0]),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function Wb(G) {
      let P = [],
        M = G,
        match = M.match(/^\[/g);
      if ((P.push({ expectation: _U, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = vt(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      M = ee.remainder;
      let match_2 = M.match(/^\]/g);
      if ((P.push({ expectation: vU, remainder: M }), match_2?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      return (
        (M = M.slice(match_2[0].length)),
        { success: !0, value: [ee.value], remainder: M, failedExpectations: P }
      );
    }
    function j(G) {
      let P = ce(G);
      if (P.success === !0)
        return {
          success: !0,
          value: Ae(() => e.length - G.length, P.value[0], P.value[1]),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function ce(G) {
      let P = [],
        M = G,
        match = M.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      if ((P.push({ expectation: wr, remainder: M }, { expectation: Tr, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = Ee(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      M = ee.remainder;
      let de = wi(M);
      if ((P.push(...de.failedExpectations), de.success === !1))
        return { success: !1, remainder: de.remainder, failedExpectations: P };
      return (
        (M = de.remainder),
        { success: !0, value: [ee.value, de.value], remainder: M, failedExpectations: P }
      );
    }
    function Ee(G) {
      let match = G.match(/^((!)+|(-)+)/g);
      if (match?.length === 1)
        return { success: !0, value: match[0], remainder: G.slice(match[0].length), failedExpectations: [] };
      return {
        success: !1,
        remainder: G,
        failedExpectations: [
          { expectation: goe, remainder: G },
          { expectation: X_, remainder: G },
        ],
      };
    }
    function We(G) {
      let P = tt(G);
      if (P.success === !0) return P;
      return { success: !0, value: null, remainder: G, failedExpectations: P.failedExpectations };
    }
    function tt(G) {
      let P = [],
        M = [],
        oe = G;
      while (!0) {
        let de = bt(oe);
        if ((M.push(...de.failedExpectations), de.success === !1)) break;
        ((oe = de.remainder), P.push(de.value));
      }
      if (P.length < 1) return { success: !1, remainder: G, failedExpectations: M };
      return { success: !0, value: P, remainder: oe, failedExpectations: M };
    }
    function bt(G) {
      let P = xt(G);
      if (P.success === !0)
        return {
          success: !0,
          value: Me(() => e.length - G.length, P.value[0], P.value[1]),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function xt(G) {
      let P = [],
        M = G,
        match = M.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      if ((P.push({ expectation: wr, remainder: M }, { expectation: Tr, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = je(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      M = ee.remainder;
      let de = qi(M);
      if ((P.push(...de.failedExpectations), de.success === !1))
        return { success: !1, remainder: de.remainder, failedExpectations: P };
      return (
        (M = de.remainder),
        { success: !0, value: [ee.value, de.value], remainder: M, failedExpectations: P }
      );
    }
    function je(G) {
      let P = kt(G);
      if (P.success === !0)
        return { success: !0, value: dt(P.value), remainder: P.remainder, failedExpectations: [] };
      return P;
    }
    function kt(G) {
      if (/^[*\/%]/g.test(G))
        return { success: !0, value: G.slice(0, 1), remainder: G.slice(1), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: yoe, remainder: G }] };
    }
    function Xt(G) {
      let P = Dt(G);
      if (P.success === !0) return P;
      return { success: !0, value: null, remainder: G, failedExpectations: P.failedExpectations };
    }
    function Dt(G) {
      let P = [],
        M = [],
        oe = G;
      while (!0) {
        let de = Ct(oe);
        if ((M.push(...de.failedExpectations), de.success === !1)) break;
        ((oe = de.remainder), P.push(de.value));
      }
      if (P.length < 1) return { success: !1, remainder: G, failedExpectations: M };
      return { success: !0, value: P, remainder: oe, failedExpectations: M };
    }
    function Ct(G) {
      let P = Qe(G);
      if (P.success === !0)
        return {
          success: !0,
          value: mt(() => e.length - G.length, P.value[0], P.value[1]),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function Qe(G) {
      let P = [],
        M = G,
        match = M.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      if ((P.push({ expectation: wr, remainder: M }, { expectation: Tr, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = Bt(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      M = ee.remainder;
      let de = na(M);
      if ((P.push(...de.failedExpectations), de.success === !1))
        return { success: !1, remainder: de.remainder, failedExpectations: P };
      return (
        (M = de.remainder),
        { success: !0, value: [ee.value, de.value], remainder: M, failedExpectations: P }
      );
    }
    function Bt(G) {
      let P = qr(G);
      if (P.success === !0)
        return { success: !0, value: xn(P.value), remainder: P.remainder, failedExpectations: [] };
      return P;
    }
    function qr(G) {
      if (/^[+\-]/g.test(G))
        return { success: !0, value: G.slice(0, 1), remainder: G.slice(1), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: Hie, remainder: G }] };
    }
    function Es(G) {
      let P = Gr(G);
      if (P.success === !0) return P;
      return { success: !0, value: null, remainder: G, failedExpectations: P.failedExpectations };
    }
    function Gr(G) {
      let P = [],
        M = [],
        oe = G;
      while (!0) {
        let de = nr(oe);
        if ((M.push(...de.failedExpectations), de.success === !1)) break;
        ((oe = de.remainder), P.push(de.value));
      }
      if (P.length < 1) return { success: !1, remainder: G, failedExpectations: M };
      return { success: !0, value: P, remainder: oe, failedExpectations: M };
    }
    function nr(G) {
      let P = rr(G);
      if (P.success === !0)
        return {
          success: !0,
          value: Wt(() => e.length - G.length, P.value[0], P.value[1]),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function rr(G) {
      let P = [],
        M = G,
        match = M.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      if ((P.push({ expectation: wr, remainder: M }, { expectation: Tr, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = Hr(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      M = ee.remainder;
      let de = ta(M);
      if ((P.push(...de.failedExpectations), de.success === !1))
        return { success: !1, remainder: de.remainder, failedExpectations: P };
      return (
        (M = de.remainder),
        { success: !0, value: [ee.value, de.value], remainder: M, failedExpectations: P }
      );
    }
    function Hr(G) {
      let P = xs(G);
      if (P.success === !0) return P;
      return {
        success: !1,
        remainder: P.remainder,
        failedExpectations: [{ expectation: Toe, remainder: P.remainder }],
      };
    }
    function xs(G) {
      let P = [qa, ec],
        M = [];
      for (let oe = P.shift(); oe !== void 0; oe = P.shift()) {
        let ee = oe(G);
        if ((M.push(...ee.failedExpectations), ee.success === !0))
          return { success: !0, value: ee.value, remainder: ee.remainder, failedExpectations: M };
      }
      return { success: !1, remainder: G, failedExpectations: M };
    }
    function qa(G) {
      let P = ca(G);
      if (P.success === !0)
        return { success: !0, value: mn(P.value), remainder: P.remainder, failedExpectations: [] };
      return P;
    }
    function ca(G) {
      let match = G.match(/^(<=|<|>=|>|==|!=)/g);
      if (match?.length === 1)
        return { success: !0, value: match[0], remainder: G.slice(match[0].length), failedExpectations: [] };
      return {
        success: !1,
        remainder: G,
        failedExpectations: [
          { expectation: boe, remainder: G },
          { expectation: Soe, remainder: G },
          { expectation: Eoe, remainder: G },
          { expectation: xoe, remainder: G },
          { expectation: _oe, remainder: G },
          { expectation: voe, remainder: G },
        ],
      };
    }
    function ec(G) {
      let P = Xc(G);
      if (P.success === !0)
        return { success: !0, value: Nt(), remainder: P.remainder, failedExpectations: [] };
      return P;
    }
    function Xc(G) {
      if (G.startsWith("in"))
        return { success: !0, value: "in", remainder: G.slice(2), failedExpectations: [] };
      return { success: !1, remainder: G, failedExpectations: [{ expectation: woe, remainder: G }] };
    }
    function WV(G) {
      let match = G.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?&&/g);
      if (match?.length === 1)
        return { success: !0, value: match[0], remainder: G.slice(match[0].length), failedExpectations: [] };
      return {
        success: !1,
        remainder: G,
        failedExpectations: [
          { expectation: wr, remainder: G },
          { expectation: Tr, remainder: G },
          { expectation: Aoe, remainder: G },
        ],
      };
    }
    function GV(G) {
      let match = G.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?\|\|/g);
      if (match?.length === 1)
        return { success: !0, value: match[0], remainder: G.slice(match[0].length), failedExpectations: [] };
      return {
        success: !1,
        remainder: G,
        failedExpectations: [
          { expectation: wr, remainder: G },
          { expectation: Tr, remainder: G },
          { expectation: Coe, remainder: G },
        ],
      };
    }
    function HV(G) {
      let P = KV(G);
      if (P.success === !0) return P;
      return { success: !0, value: null, remainder: G, failedExpectations: P.failedExpectations };
    }
    function KV(G) {
      let P = qV(G);
      if (P.success === !0)
        return {
          success: !0,
          value: Xe(P.value[0], P.value[1]),
          remainder: P.remainder,
          failedExpectations: [],
        };
      return P;
    }
    function qV(G) {
      let P = [],
        M = G,
        match = M.match(/^\?/g);
      if ((P.push({ expectation: Roe, remainder: M }), match?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match[0].length);
      let ee = ln(M);
      if ((P.push(...ee.failedExpectations), ee.success === !1))
        return { success: !1, remainder: ee.remainder, failedExpectations: P };
      M = ee.remainder;
      let match_2 = M.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      if (
        (P.push({ expectation: wr, remainder: M }, { expectation: Tr, remainder: M }), match_2?.length !== 1)
      )
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match_2[0].length);
      let match_3 = M.match(/^:/g);
      if ((P.push({ expectation: nv, remainder: M }), match_3?.length !== 1))
        return { success: !1, remainder: M, failedExpectations: P };
      M = M.slice(match_3[0].length);
      let Qr = vt(M);
      if ((P.push(...Qr.failedExpectations), Qr.success === !1))
        return { success: !1, remainder: Qr.remainder, failedExpectations: P };
      M = Qr.remainder;
      let match_4 = M.match(/^(([\t\n\f\r ])+)?(\/\/([^\r\n])*([\r\n])+)?(([\t\n\f\r ])+)?/g);
      if (
        (P.push({ expectation: wr, remainder: M }, { expectation: Tr, remainder: M }), match_4?.length !== 1)
      )
        return { success: !1, remainder: M, failedExpectations: P };
      return (
        (M = M.slice(match_4[0].length)),
        { success: !0, value: [ee.value, Qr.value], remainder: M, failedExpectations: P }
      );
    }
  }
});

export { AU };

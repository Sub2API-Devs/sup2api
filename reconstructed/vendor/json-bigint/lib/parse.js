/**
 * json-bigint/lib/parse.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: json-bigint@1.0.0
 * pieces: chunk-na3pph4p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Ir } from "../../bignumber.js/bignumber.js";

//@ chunk-na3pph4p.js:39504-43194 cjs-fingerprint
var an = x(function (Fd, on) {
  var qt = null,
    Gc =
      /(?:_|\\u005[Ff])(?:_|\\u005[Ff])(?:p|\\u0070)(?:r|\\u0072)(?:o|\\u006[Ff])(?:t|\\u0074)(?:o|\\u006[Ff])(?:_|\\u005[Ff])(?:_|\\u005[Ff])/,
    Bc =
      /(?:c|\\u0063)(?:o|\\u006[Ff])(?:n|\\u006[Ee])(?:s|\\u0073)(?:t|\\u0074)(?:r|\\u0072)(?:u|\\u0075)(?:c|\\u0063)(?:t|\\u0074)(?:o|\\u006[Ff])(?:r|\\u0072)/,
    Hc = function (e) {
      var t = {
        strict: !1,
        storeAsString: !1,
        alwaysParseAsBig: !1,
        useNativeBigInt: !1,
        protoAction: "error",
        constructorAction: "error",
      };
      if (e !== void 0 && e !== null) {
        if (e.strict === !0) t.strict = !0;
        if (e.storeAsString === !0) t.storeAsString = !0;
        if (
          ((t.alwaysParseAsBig = e.alwaysParseAsBig === !0 ? e.alwaysParseAsBig : !1),
          (t.useNativeBigInt = e.useNativeBigInt === !0 ? e.useNativeBigInt : !1),
          typeof e.constructorAction < "u")
        )
          if (
            e.constructorAction === "error" ||
            e.constructorAction === "ignore" ||
            e.constructorAction === "preserve"
          )
            t.constructorAction = e.constructorAction;
          else
            throw Error(
              `Incorrect value for constructorAction option, must be "error", "ignore" or undefined but passed ${e.constructorAction}`,
            );
        if (typeof e.protoAction < "u")
          if (e.protoAction === "error" || e.protoAction === "ignore" || e.protoAction === "preserve")
            t.protoAction = e.protoAction;
          else
            throw Error(
              `Incorrect value for protoAction option, must be "error", "ignore" or undefined but passed ${e.protoAction}`,
            );
      }
      var r,
        s,
        n = {
          '"': '"',
          "\\": "\\",
          "/": "/",
          b: "\b",
          f: "\f",
          n: `
`,
          r: "\r",
          t: "\t",
        },
        a,
        h = function (S) {
          throw { name: "SyntaxError", message: S, at: r, text: a };
        },
        g = function (S) {
          if (S && S !== s) h("Expected '" + S + "' instead of '" + s + "'");
          return ((s = a.charAt(r)), (r += 1), s);
        },
        E = function () {
          var S,
            P = "";
          if (s === "-") ((P = "-"), g("-"));
          while (s >= "0" && s <= "9") ((P += s), g());
          if (s === ".") {
            P += ".";
            while (g() && s >= "0" && s <= "9") P += s;
          }
          if (s === "e" || s === "E") {
            if (((P += s), g(), s === "-" || s === "+")) ((P += s), g());
            while (s >= "0" && s <= "9") ((P += s), g());
          }
          if (((S = +P), !isFinite(S))) h("Bad number");
          else {
            if (qt == null) qt = Ir();
            if (P.length > 15) return t.storeAsString ? P : t.useNativeBigInt ? BigInt(P) : new qt(P);
            else return !t.alwaysParseAsBig ? S : t.useNativeBigInt ? BigInt(S) : new qt(S);
          }
        },
        k = function () {
          var S,
            P,
            O = "",
            G;
          if (s === '"') {
            var Z = r;
            while (g()) {
              if (s === '"') {
                if (r - 1 > Z) O += a.substring(Z, r - 1);
                return (g(), O);
              }
              if (s === "\\") {
                if (r - 1 > Z) O += a.substring(Z, r - 1);
                if ((g(), s === "u")) {
                  G = 0;
                  for (P = 0; P < 4; P += 1) {
                    if (((S = parseInt(g(), 16)), !isFinite(S))) break;
                    G = G * 16 + S;
                  }
                  O += String.fromCharCode(G);
                } else if (typeof n[s] === "string") O += n[s];
                else break;
                Z = r;
              }
            }
          }
          h("Bad string");
        },
        T = function () {
          while (s && s <= " ") g();
        },
        j = function () {
          switch (s) {
            case "t":
              return (g("t"), g("r"), g("u"), g("e"), !0);
            case "f":
              return (g("f"), g("a"), g("l"), g("s"), g("e"), !1);
            case "n":
              return (g("n"), g("u"), g("l"), g("l"), null);
          }
          h("Unexpected '" + s + "'");
        },
        I,
        Y = function () {
          var S = [];
          if (s === "[") {
            if ((g("["), T(), s === "]")) return (g("]"), S);
            while (s) {
              if ((S.push(I()), T(), s === "]")) return (g("]"), S);
              (g(","), T());
            }
          }
          h("Bad array");
        },
        K = function () {
          var S,
            create = Object.create(null);
          if (s === "{") {
            if ((g("{"), T(), s === "}")) return (g("}"), create);
            while (s) {
              if (((S = k()), T(), g(":"), t.strict === !0 && Object.hasOwnProperty.call(create, S)))
                h('Duplicate key "' + S + '"');
              if (Gc.test(S) === !0)
                if (t.protoAction === "error") h("Object contains forbidden prototype property");
                else if (t.protoAction === "ignore") I();
                else create[S] = I();
              else if (Bc.test(S) === !0)
                if (t.constructorAction === "error") h("Object contains forbidden constructor property");
                else if (t.constructorAction === "ignore") I();
                else create[S] = I();
              else create[S] = I();
              if ((T(), s === "}")) return (g("}"), create);
              (g(","), T());
            }
          }
          h("Bad object");
        };
      return (
        (I = function () {
          switch ((T(), s)) {
            case "{":
              return K();
            case "[":
              return Y();
            case '"':
              return k();
            case "-":
              return E();
            default:
              return s >= "0" && s <= "9" ? E() : j();
          }
        }),
        function (S, P) {
          var O;
          if (((a = S + ""), (r = 0), (s = " "), (O = I()), T(), s)) h("Syntax error");
          return typeof P === "function"
            ? (function G(Z, ie) {
                var D,
                  U,
                  L = Z[ie];
                if (L && typeof L === "object")
                  Object.keys(L).forEach(function (W) {
                    if (((U = G(L, W)), U !== void 0)) L[W] = U;
                    else delete L[W];
                  });
                return P.call(Z, ie, L);
              })({ "": O }, "")
            : O;
        }
      );
    };
  on.exports = Hc;
});

export { an };

/**
 * @bufbuild/cel/dist/cjs/builder.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { z_ } from "./logic-manager.js";

//@ chunk-fq0cr76a.js:526143-532305 cjs-fingerprint
var gU = x(function (mU) {
  Object.defineProperty(mU, "__esModule", { value: !0 });
  var Lie = z_(),
    textEncoder = new TextEncoder(),
    Cs = "@result";
  class hU {
    #e = 0n;
    sourceInfo = {
      $typeName: "cel.expr.SourceInfo",
      syntaxVersion: "",
      location: "",
      lineOffsets: [],
      positions: {},
      macroCalls: {},
      extensions: [],
    };
    nextExpr(e, n) {
      return (
        (this.sourceInfo.positions[(++this.#e).toString()] = e),
        { $typeName: "cel.expr.Expr", id: this.#e, exprKind: n }
      );
    }
    nextEntry(e, n, r) {
      return (
        (this.sourceInfo.positions[(++this.#e).toString()] = e),
        {
          $typeName: "cel.expr.Expr.CreateStruct.Entry",
          id: this.#e,
          keyKind: n,
          value: r,
          optionalEntry: !1,
        }
      );
    }
    newConstExpr(e, n) {
      return this.nextExpr(e, {
        case: "constExpr",
        value: { $typeName: "cel.expr.Constant", constantKind: n },
      });
    }
    newCallExpr(e, n, r) {
      if (n === "has" && r.length === 1 && r[0].exprKind?.case === "selectExpr")
        return this.expandHasMacro(e, r[0]);
      if ((n === "_||_" || n === "_&&_") && r.length > 1) {
        let newBalancingLogicManager = Lie.default.newBalancingLogicManager(this, n, r[0]);
        for (let h = 1; h < r.length; h += 1) newBalancingLogicManager.addTerm(e, r[h]);
        return newBalancingLogicManager.toExpr();
      }
      return this.nextExpr(e, {
        case: "callExpr",
        value: { $typeName: "cel.expr.Expr.Call", function: n, args: r },
      });
    }
    newMemberCallExpr(e, n, r, s) {
      return this.maybeExpand(
        e,
        this.nextExpr(e, {
          case: "callExpr",
          value: { $typeName: "cel.expr.Expr.Call", function: r, target: n, args: s },
        }),
      );
    }
    newStringExpr(e, n) {
      return this.newConstExpr(e, {
        case: "stringValue",
        value: n.reduce((r, s) => {
          if (typeof s !== "string") {
            if (s.some((h) => h >= 55296 && h < 57344)) throw Error("surrogate code points are not allowed");
            return r + String.fromCodePoint(...s);
          }
          return r + s;
        }, ""),
      });
    }
    newBytesExpr(e, n) {
      let r = [],
        s = 0;
      for (let b of n) {
        let S = typeof b === "string" ? textEncoder.encode(b) : b;
        (r.push(S), (s += S.length));
      }
      let uint8Array = new Uint8Array(s),
        y = 0;
      for (let b of r) (uint8Array.set(b, y), (y += b.length));
      return this.newConstExpr(e, { case: "bytesValue", value: uint8Array });
    }
    newBoolExpr(e, n) {
      return this.newConstExpr(e, { case: "boolValue", value: n === "true" });
    }
    newInt64Expr(e, n) {
      return this.newConstExpr(e, {
        case: "int64Value",
        value: n[0] === "-" ? -BigInt(n.slice(1)) : BigInt(n),
      });
    }
    newUnsignedInt64Expr(e, n) {
      return this.newConstExpr(e, { case: "uint64Value", value: BigInt(n) });
    }
    newDoubleExpr(e, n) {
      return this.newConstExpr(e, { case: "doubleValue", value: parseFloat(n) });
    }
    newNullExpr(e) {
      return this.newConstExpr(e, { case: "nullValue", value: 0 });
    }
    newIdentExpr(e, n) {
      return this.nextExpr(e, { case: "identExpr", value: { $typeName: "cel.expr.Expr.Ident", name: n } });
    }
    newInfixExpr(e, n, r) {
      return this.newCallExpr(e, n === "in" ? "@in" : `_${n}_`, r);
    }
    newSelectExpr(e, n, r) {
      return this.nextExpr(e, {
        case: "selectExpr",
        value: { $typeName: "cel.expr.Expr.Select", operand: n, field: r, testOnly: !1 },
      });
    }
    newIndexExpr(e, n, r) {
      return this.newCallExpr(e, "_[_]", [n, r]);
    }
    expandHasMacro(e, n) {
      if (n.exprKind.case !== "selectExpr") return this.newCallExpr(e, "has", [n]);
      return ((n.exprKind.value.testOnly = !0), n);
    }
    newListExpr(e, n) {
      return this.nextExpr(e, {
        case: "listExpr",
        value: { $typeName: "cel.expr.Expr.CreateList", elements: n, optionalIndices: [] },
      });
    }
    newBoolMacro(e, n, r, s, h, y) {
      return this.nextExpr(e, {
        case: "comprehensionExpr",
        value: {
          $typeName: "cel.expr.Expr.Comprehension",
          accuVar: Cs,
          accuInit: this.newConstExpr(e, { case: "boolValue", value: s }),
          iterVar: r,
          iterVar2: "",
          iterRange: n,
          loopStep: h,
          loopCondition: y,
          result: this.newIdentExpr(e, Cs),
        },
      });
    }
    newListMacro(e, n, r, s) {
      return this.nextExpr(e, {
        case: "comprehensionExpr",
        value: {
          $typeName: "cel.expr.Expr.Comprehension",
          accuVar: Cs,
          accuInit: this.newListExpr(e, []),
          iterVar: r,
          iterVar2: "",
          iterRange: n,
          loopCondition: this.newConstExpr(e, { case: "boolValue", value: !0 }),
          loopStep: s,
          result: this.newIdentExpr(e, Cs),
        },
      });
    }
    expandExistsMacro(e, n, r, s) {
      return this.newBoolMacro(
        e,
        n,
        r,
        !1,
        this.newCallExpr(e, "_||_", [this.newIdentExpr(e, Cs), s]),
        this.newCallExpr(e, "@not_strictly_false", [this.newCallExpr(e, "!_", [this.newIdentExpr(e, Cs)])]),
      );
    }
    expandAllMacro(e, n, r, s) {
      return this.newBoolMacro(
        e,
        n,
        r,
        !0,
        this.newCallExpr(e, "_&&_", [this.newIdentExpr(e, Cs), s]),
        this.newCallExpr(e, "@not_strictly_false", [this.newIdentExpr(e, Cs)]),
      );
    }
    expandMapMacro(e, n, r, s) {
      return this.newListMacro(
        e,
        n,
        r,
        this.newCallExpr(e, "_+_", [this.newIdentExpr(e, Cs), this.newListExpr(e, [s])]),
      );
    }
    expandMapFilterMacro(e, n, r, s, h) {
      return this.newListMacro(
        e,
        n,
        r,
        this.newCallExpr(e, "_?_:_", [
          s,
          this.newCallExpr(e, "_+_", [this.newIdentExpr(e, Cs), this.newListExpr(e, [h])]),
          this.newIdentExpr(e, Cs),
        ]),
      );
    }
    expandFilterMacro(e, n, r, s) {
      return this.newListMacro(
        e,
        n,
        r,
        this.newCallExpr(e, "_?_:_", [
          s,
          this.newCallExpr(e, "_+_", [
            this.newIdentExpr(e, Cs),
            this.newListExpr(e, [this.newIdentExpr(e, r)]),
          ]),
          this.newIdentExpr(e, Cs),
        ]),
      );
    }
    expandExistsOne(e, n, r, s) {
      return this.nextExpr(e, {
        case: "comprehensionExpr",
        value: {
          $typeName: "cel.expr.Expr.Comprehension",
          accuVar: Cs,
          accuInit: this.newConstExpr(e, { case: "int64Value", value: BigInt(0) }),
          iterVar: r,
          iterVar2: "",
          iterRange: n,
          loopCondition: this.newConstExpr(e, { case: "boolValue", value: !0 }),
          loopStep: this.newCallExpr(e, "_?_:_", [
            s,
            this.newCallExpr(e, "_+_", [
              this.newIdentExpr(e, Cs),
              this.newConstExpr(e, { case: "int64Value", value: BigInt(1) }),
            ]),
            this.newIdentExpr(e, Cs),
          ]),
          result: this.newCallExpr(e, "_==_", [
            this.newIdentExpr(e, Cs),
            this.newConstExpr(e, { case: "int64Value", value: BigInt(1) }),
          ]),
        },
      });
    }
    maybeExpand(e, n) {
      if (n.exprKind.case === "callExpr") {
        let r = n.exprKind.value,
          s = r.args[0];
        if (s !== void 0 && n.exprKind.value.target !== void 0 && s.exprKind?.case === "identExpr") {
          if (r.args.length === 2)
            switch (r.function) {
              case "exists":
                return this.expandExistsMacro(
                  e,
                  n.exprKind.value.target,
                  s.exprKind.value.name,
                  n.exprKind.value.args[1],
                );
              case "all":
                return this.expandAllMacro(
                  e,
                  n.exprKind.value.target,
                  s.exprKind.value.name,
                  n.exprKind.value.args[1],
                );
              case "map":
                return this.expandMapMacro(
                  e,
                  n.exprKind.value.target,
                  s.exprKind.value.name,
                  n.exprKind.value.args[1],
                );
              case "filter":
                return this.expandFilterMacro(
                  e,
                  n.exprKind.value.target,
                  s.exprKind.value.name,
                  n.exprKind.value.args[1],
                );
              case "exists_one":
              case "existsOne":
                return this.expandExistsOne(
                  e,
                  n.exprKind.value.target,
                  s.exprKind.value.name,
                  n.exprKind.value.args[1],
                );
            }
          if (r.args.length === 3 && r.function == "map")
            return this.expandMapFilterMacro(
              e,
              n.exprKind.value.target,
              s.exprKind.value.name,
              n.exprKind.value.args[1],
              n.exprKind.value.args[2],
            );
        }
      }
      return n;
    }
    newMapEntry(e, n, r) {
      return this.nextEntry(e, { case: "mapKey", value: n }, r);
    }
    newStructExpr(e, n, r = "") {
      return this.nextExpr(e, {
        case: "structExpr",
        value: { $typeName: "cel.expr.Expr.CreateStruct", entries: n, messageName: r },
      });
    }
    newStructEntry(e, n, r) {
      return this.nextEntry(e, { case: "fieldKey", value: n }, r);
    }
  }
  mU.default = hU;
});

export { gU };

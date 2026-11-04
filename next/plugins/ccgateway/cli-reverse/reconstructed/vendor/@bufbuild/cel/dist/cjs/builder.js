/**
 * @bufbuild/cel/dist/cjs/builder.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_logic_manager } from "./logic-manager.js";

//@ chunk-fq0cr76a.js:526143-532305 cjs-fingerprint
var require_builder = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  var logic_manager_js_1 = require_logic_manager();
  var encoder = new TextEncoder();
  var accuVarName = "@result";
  class Builder {
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
    nextExpr(offset, exprKind) {
      this.sourceInfo.positions[(++this.#e).toString()] = offset;
      return {
        $typeName: "cel.expr.Expr",
        id: this.#e,
        exprKind,
      };
    }
    nextEntry(offset, keyKind, value) {
      this.sourceInfo.positions[(++this.#e).toString()] = offset;
      return {
        $typeName: "cel.expr.Expr.CreateStruct.Entry",
        id: this.#e,
        keyKind,
        value,
        optionalEntry: false,
      };
    }
    newConstExpr(offset, constantKind) {
      return this.nextExpr(offset, {
        case: "constExpr",
        value: {
          $typeName: "cel.expr.Constant",
          constantKind,
        },
      });
    }
    newCallExpr(offset, functionName, args) {
      if (functionName === "has" && args.length === 1 && args[0].exprKind?.case === "selectExpr")
        return this.expandHasMacro(offset, args[0]);
      if ((functionName === "_||_" || functionName === "_&&_") && args.length > 1) {
        let logicManager = logic_manager_js_1.default.newBalancingLogicManager(this, functionName, args[0]);
        for (let i = 1; i < args.length; i += 1) logicManager.addTerm(offset, args[i]);
        return logicManager.toExpr();
      }
      return this.nextExpr(offset, {
        case: "callExpr",
        value: {
          $typeName: "cel.expr.Expr.Call",
          function: functionName,
          args,
        },
      });
    }
    newMemberCallExpr(offset, target, functionName, args) {
      return this.maybeExpand(
        offset,
        this.nextExpr(offset, {
          case: "callExpr",
          value: {
            $typeName: "cel.expr.Expr.Call",
            function: functionName,
            target,
            args,
          },
        }),
      );
    }
    newStringExpr(offset, sequence) {
      return this.newConstExpr(offset, {
        case: "stringValue",
        value: sequence.reduce((string, chunk) => {
          if (typeof chunk !== "string") {
            if (chunk.some((cp) => cp >= 55296 && cp < 57344))
              throw Error("surrogate code points are not allowed");
            return string + String.fromCodePoint(...chunk);
          }
          return string + chunk;
        }, ""),
      });
    }
    newBytesExpr(offset, sequence) {
      let chunks = [];
      let totalSize = 0;
      for (let rawChunk of sequence) {
        let chunk = typeof rawChunk === "string" ? encoder.encode(rawChunk) : rawChunk;
        chunks.push(chunk);
        totalSize += chunk.length;
      }
      let value = new Uint8Array(totalSize);
      let chunkOffset = 0;
      for (let chunk of chunks) {
        value.set(chunk, chunkOffset);
        chunkOffset += chunk.length;
      }
      return this.newConstExpr(offset, {
        case: "bytesValue",
        value,
      });
    }
    newBoolExpr(offset, keyword) {
      return this.newConstExpr(offset, {
        case: "boolValue",
        value: keyword === "true",
      });
    }
    newInt64Expr(offset, digits) {
      return this.newConstExpr(offset, {
        case: "int64Value",
        value: digits[0] === "-" ? -BigInt(digits.slice(1)) : BigInt(digits),
      });
    }
    newUnsignedInt64Expr(offset, digits) {
      return this.newConstExpr(offset, {
        case: "uint64Value",
        value: BigInt(digits),
      });
    }
    newDoubleExpr(offset, digits) {
      return this.newConstExpr(offset, {
        case: "doubleValue",
        value: parseFloat(digits),
      });
    }
    newNullExpr(offset) {
      return this.newConstExpr(offset, {
        case: "nullValue",
        value: 0,
      });
    }
    newIdentExpr(offset, name) {
      return this.nextExpr(offset, {
        case: "identExpr",
        value: {
          $typeName: "cel.expr.Expr.Ident",
          name,
        },
      });
    }
    newInfixExpr(offset, op, args) {
      return this.newCallExpr(offset, op === "in" ? "@in" : `_${op}_`, args);
    }
    newSelectExpr(offset, operand, field) {
      return this.nextExpr(offset, {
        case: "selectExpr",
        value: {
          $typeName: "cel.expr.Expr.Select",
          operand,
          field,
          testOnly: false,
        },
      });
    }
    newIndexExpr(offset, operand, index) {
      return this.newCallExpr(offset, "_[_]", [operand, index]);
    }
    expandHasMacro(offset, target) {
      if (target.exprKind.case !== "selectExpr") return this.newCallExpr(offset, "has", [target]);
      target.exprKind.value.testOnly = true;
      return target;
    }
    newListExpr(offset, elements) {
      return this.nextExpr(offset, {
        case: "listExpr",
        value: {
          $typeName: "cel.expr.Expr.CreateList",
          elements,
          optionalIndices: [],
        },
      });
    }
    newBoolMacro(offset, iterRange, iterVar, init, loopStep, loopCondition) {
      return this.nextExpr(offset, {
        case: "comprehensionExpr",
        value: {
          $typeName: "cel.expr.Expr.Comprehension",
          accuVar: accuVarName,
          accuInit: this.newConstExpr(offset, {
            case: "boolValue",
            value: init,
          }),
          iterVar,
          iterVar2: "",
          iterRange,
          loopStep,
          loopCondition,
          result: this.newIdentExpr(offset, accuVarName),
        },
      });
    }
    newListMacro(offset, iterRange, iterVar, loopStep) {
      return this.nextExpr(offset, {
        case: "comprehensionExpr",
        value: {
          $typeName: "cel.expr.Expr.Comprehension",
          accuVar: accuVarName,
          accuInit: this.newListExpr(offset, []),
          iterVar,
          iterVar2: "",
          iterRange,
          loopCondition: this.newConstExpr(offset, {
            case: "boolValue",
            value: true,
          }),
          loopStep,
          result: this.newIdentExpr(offset, accuVarName),
        },
      });
    }
    expandExistsMacro(offset, target, x, test) {
      return this.newBoolMacro(
        offset,
        target,
        x,
        false,
        this.newCallExpr(offset, "_||_", [this.newIdentExpr(offset, accuVarName), test]),
        this.newCallExpr(offset, "@not_strictly_false", [
          this.newCallExpr(offset, "!_", [this.newIdentExpr(offset, accuVarName)]),
        ]),
      );
    }
    expandAllMacro(offset, target, x, test) {
      return this.newBoolMacro(
        offset,
        target,
        x,
        true,
        this.newCallExpr(offset, "_&&_", [this.newIdentExpr(offset, accuVarName), test]),
        this.newCallExpr(offset, "@not_strictly_false", [this.newIdentExpr(offset, accuVarName)]),
      );
    }
    expandMapMacro(offset, target, x, step) {
      return this.newListMacro(
        offset,
        target,
        x,
        this.newCallExpr(offset, "_+_", [
          this.newIdentExpr(offset, accuVarName),
          this.newListExpr(offset, [step]),
        ]),
      );
    }
    expandMapFilterMacro(offset, target, x, test, step) {
      return this.newListMacro(
        offset,
        target,
        x,
        this.newCallExpr(offset, "_?_:_", [
          test,
          this.newCallExpr(offset, "_+_", [
            this.newIdentExpr(offset, accuVarName),
            this.newListExpr(offset, [step]),
          ]),
          this.newIdentExpr(offset, accuVarName),
        ]),
      );
    }
    expandFilterMacro(offset, target, x, step) {
      return this.newListMacro(
        offset,
        target,
        x,
        this.newCallExpr(offset, "_?_:_", [
          step,
          this.newCallExpr(offset, "_+_", [
            this.newIdentExpr(offset, accuVarName),
            this.newListExpr(offset, [this.newIdentExpr(offset, x)]),
          ]),
          this.newIdentExpr(offset, accuVarName),
        ]),
      );
    }
    expandExistsOne(offset, iterRange, iterVar, step) {
      return this.nextExpr(offset, {
        case: "comprehensionExpr",
        value: {
          $typeName: "cel.expr.Expr.Comprehension",
          accuVar: accuVarName,
          accuInit: this.newConstExpr(offset, {
            case: "int64Value",
            value: BigInt(0),
          }),
          iterVar,
          iterVar2: "",
          iterRange,
          loopCondition: this.newConstExpr(offset, {
            case: "boolValue",
            value: true,
          }),
          loopStep: this.newCallExpr(offset, "_?_:_", [
            step,
            this.newCallExpr(offset, "_+_", [
              this.newIdentExpr(offset, accuVarName),
              this.newConstExpr(offset, {
                case: "int64Value",
                value: BigInt(1),
              }),
            ]),
            this.newIdentExpr(offset, accuVarName),
          ]),
          result: this.newCallExpr(offset, "_==_", [
            this.newIdentExpr(offset, accuVarName),
            this.newConstExpr(offset, {
              case: "int64Value",
              value: BigInt(1),
            }),
          ]),
        },
      });
    }
    maybeExpand(offset, call) {
      if (call.exprKind.case === "callExpr") {
        let callExpr = call.exprKind.value;
        let varName = callExpr.args[0];
        if (
          varName !== undefined &&
          call.exprKind.value.target !== undefined &&
          varName.exprKind?.case === "identExpr"
        ) {
          if (callExpr.args.length === 2)
            switch (callExpr.function) {
              case "exists":
                return this.expandExistsMacro(
                  offset,
                  call.exprKind.value.target,
                  varName.exprKind.value.name,
                  call.exprKind.value.args[1],
                );
              case "all":
                return this.expandAllMacro(
                  offset,
                  call.exprKind.value.target,
                  varName.exprKind.value.name,
                  call.exprKind.value.args[1],
                );
              case "map":
                return this.expandMapMacro(
                  offset,
                  call.exprKind.value.target,
                  varName.exprKind.value.name,
                  call.exprKind.value.args[1],
                );
              case "filter":
                return this.expandFilterMacro(
                  offset,
                  call.exprKind.value.target,
                  varName.exprKind.value.name,
                  call.exprKind.value.args[1],
                );
              case "exists_one":
              case "existsOne":
                return this.expandExistsOne(
                  offset,
                  call.exprKind.value.target,
                  varName.exprKind.value.name,
                  call.exprKind.value.args[1],
                );
            }
          if (callExpr.args.length === 3 && callExpr.function == "map")
            return this.expandMapFilterMacro(
              offset,
              call.exprKind.value.target,
              varName.exprKind.value.name,
              call.exprKind.value.args[1],
              call.exprKind.value.args[2],
            );
        }
      }
      return call;
    }
    newMapEntry(offset, key, value) {
      return this.nextEntry(
        offset,
        {
          case: "mapKey",
          value: key,
        },
        value,
      );
    }
    newStructExpr(offset, entries, messageName = "") {
      return this.nextExpr(offset, {
        case: "structExpr",
        value: {
          $typeName: "cel.expr.Expr.CreateStruct",
          entries,
          messageName,
        },
      });
    }
    newStructEntry(offset, field, value) {
      return this.nextEntry(
        offset,
        {
          case: "fieldKey",
          value: field,
        },
        value,
      );
    }
  }
  cjsExports.default = Builder;
});
export { require_builder };

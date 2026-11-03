/**
 * @bufbuild/protobuf/dist/cjs/reflect/reflect-check.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { Ns } from "../descriptors.js";
import { vg } from "../is-message.js";
import { op } from "./error.js";
import { Uu } from "./guard.js";
import { xc } from "../../commonjs/wire/binary-encoding.js";
import { Rg } from "../wire/text-encoding.js";
import { ko } from "../../commonjs/proto-int64.js";

//@ chunk-fq0cr76a.js:338210-342537 cjs-require-graph
var Dg = x(function (ak) {
  Object.defineProperty(ak, "__esModule", { value: !0 });
  ak.checkField = rY;
  ak.checkListItem = sY;
  ak.checkMapEntry = iY;
  ak.formatVal = lp;
  var It = Ns(),
    tk = vg(),
    vl = op(),
    Pi = Uu(),
    Do = xc(),
    nk = Rg(),
    Ng = ko();
  function rY(e, n) {
    let r =
      e.fieldKind == "list"
        ? Pi.isReflectList(n, e)
        : e.fieldKind == "map"
          ? Pi.isReflectMap(n, e)
          : $x(e, n);
    if (r === !0) return;
    let s;
    switch (e.fieldKind) {
      case "list":
        s = `expected ${ik(e)}, got ${lp(n)}`;
        break;
      case "map":
        s = `expected ${ok(e)}, got ${lp(n)}`;
        break;
      default:
        s = kg(e, n, r);
    }
    return new vl.FieldError(e, s);
  }
  function sY(e, n, r) {
    let s = $x(e, r);
    if (s !== !0) return new vl.FieldError(e, `list item #${n + 1}: ${kg(e, r, s)}`);
    return;
  }
  function iY(e, n, r) {
    let s = rk(n, e.mapKey);
    if (s !== !0) return new vl.FieldError(e, `invalid map key: ${kg({ scalar: e.mapKey }, n, s)}`);
    let h = $x(e, r);
    if (h !== !0) return new vl.FieldError(e, `map entry ${lp(n)}: ${kg(e, r, h)}`);
    return;
  }
  function $x(e, n) {
    if (e.scalar !== void 0) return rk(n, e.scalar);
    if (e.enum !== void 0) {
      if (e.enum.open) return Number.isInteger(n);
      return e.enum.values.some((r) => r.number === n);
    }
    return Pi.isReflectMessage(n, e.message);
  }
  function rk(e, n) {
    switch (n) {
      case It.ScalarType.DOUBLE:
        return typeof e == "number";
      case It.ScalarType.FLOAT:
        if (typeof e != "number") return !1;
        if (Number.isNaN(e) || !Number.isFinite(e)) return !0;
        if (e > Do.FLOAT32_MAX || e < Do.FLOAT32_MIN) return `${e.toFixed()} out of range`;
        return !0;
      case It.ScalarType.INT32:
      case It.ScalarType.SFIXED32:
      case It.ScalarType.SINT32:
        if (typeof e !== "number" || !Number.isInteger(e)) return !1;
        if (e > Do.INT32_MAX || e < Do.INT32_MIN) return `${e.toFixed()} out of range`;
        return !0;
      case It.ScalarType.FIXED32:
      case It.ScalarType.UINT32:
        if (typeof e !== "number" || !Number.isInteger(e)) return !1;
        if (e > Do.UINT32_MAX || e < 0) return `${e.toFixed()} out of range`;
        return !0;
      case It.ScalarType.BOOL:
        return typeof e == "boolean";
      case It.ScalarType.STRING:
        if (typeof e != "string") return !1;
        return nk.getTextEncoding().checkUtf8(e) || "invalid UTF8";
      case It.ScalarType.BYTES:
        return e instanceof Uint8Array;
      case It.ScalarType.INT64:
      case It.ScalarType.SFIXED64:
      case It.ScalarType.SINT64:
        if (typeof e == "bigint" || typeof e == "number" || (typeof e == "string" && e.length > 0))
          try {
            return (Ng.protoInt64.parse(e), !0);
          } catch (error) {
            return `${e} out of range`;
          }
        return !1;
      case It.ScalarType.FIXED64:
      case It.ScalarType.UINT64:
        if (typeof e == "bigint" || typeof e == "number" || (typeof e == "string" && e.length > 0))
          try {
            return (Ng.protoInt64.uParse(e), !0);
          } catch (error) {
            return `${e} out of range`;
          }
        return !1;
    }
  }
  function kg(e, n, r) {
    if (((r = typeof r == "string" ? `: ${r}` : `, got ${lp(n)}`), e.scalar !== void 0))
      return `expected ${oY(e.scalar)}` + r;
    if (e.enum !== void 0) return `expected ${e.enum.toString()}` + r;
    return `expected ${sk(e.message)}` + r;
  }
  function lp(e) {
    switch (typeof e) {
      case "object":
        if (e === null) return "null";
        if (e instanceof Uint8Array) return `Uint8Array(${e.length})`;
        if (Array.isArray(e)) return `Array(${e.length})`;
        if (Pi.isReflectList(e)) return ik(e.field());
        if (Pi.isReflectMap(e)) return ok(e.field());
        if (Pi.isReflectMessage(e)) return sk(e.desc);
        if (tk.isMessage(e)) return `message ${e.$typeName}`;
        return "object";
      case "string":
        return e.length > 30 ? "string" : `"${e.split('"').join('\\"')}"`;
      case "boolean":
        return String(e);
      case "number":
        return String(e);
      case "bigint":
        return String(e) + "n";
      default:
        return typeof e;
    }
  }
  function sk(e) {
    return `ReflectMessage (${e.typeName})`;
  }
  function ik(e) {
    switch (e.listKind) {
      case "message":
        return `ReflectList (${e.message.toString()})`;
      case "enum":
        return `ReflectList (${e.enum.toString()})`;
      case "scalar":
        return `ReflectList (${It.ScalarType[e.scalar]})`;
    }
  }
  function ok(e) {
    switch (e.mapKind) {
      case "message":
        return `ReflectMap (${It.ScalarType[e.mapKey]}, ${e.message.toString()})`;
      case "enum":
        return `ReflectMap (${It.ScalarType[e.mapKey]}, ${e.enum.toString()})`;
      case "scalar":
        return `ReflectMap (${It.ScalarType[e.mapKey]}, ${It.ScalarType[e.scalar]})`;
    }
  }
  function oY(e) {
    switch (e) {
      case It.ScalarType.STRING:
        return "string";
      case It.ScalarType.BOOL:
        return "boolean";
      case It.ScalarType.INT64:
      case It.ScalarType.SINT64:
      case It.ScalarType.SFIXED64:
        return "bigint (int64)";
      case It.ScalarType.UINT64:
      case It.ScalarType.FIXED64:
        return "bigint (uint64)";
      case It.ScalarType.BYTES:
        return "Uint8Array";
      case It.ScalarType.DOUBLE:
        return "number (float64)";
      case It.ScalarType.FLOAT:
        return "number (float32)";
      case It.ScalarType.FIXED32:
      case It.ScalarType.UINT32:
        return "number (uint32)";
      case It.ScalarType.INT32:
      case It.ScalarType.SFIXED32:
      case It.ScalarType.SINT32:
        return "number (int32)";
    }
  }
});

export { Dg };

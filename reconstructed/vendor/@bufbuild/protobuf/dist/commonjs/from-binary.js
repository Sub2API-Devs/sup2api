/**
 * @bufbuild/protobuf/dist/commonjs/from-binary.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { Ns } from "../cjs/descriptors.js";
import { El } from "./reflect/scalar.js";
import { Po } from "../cjs/reflect/reflect.js";
import { xc } from "./wire/binary-encoding.js";
import { Tg } from "../cjs/wire/varint.js";

//@ chunk-fq0cr76a.js:410280-413424 cjs-require-graph
var Ku = x(function (jD) {
  Object.defineProperty(jD, "__esModule", { value: !0 });
  jD.fromBinary = yz;
  jD.mergeFromBinary = bz;
  jD.readField = qD;
  var Pn = Ns(),
    jg = El(),
    Il = Po(),
    Lo = xc(),
    HD = Tg(),
    GD = { readUnknownFields: !0 };
  function KD(e) {
    return e ? Object.assign(Object.assign({}, GD), e) : GD;
  }
  function yz(e, n, r) {
    let reflect = Il.reflect(e, void 0, !1);
    return (f_(reflect, new Lo.BinaryReader(n), KD(r), !1, n.byteLength), reflect.message);
  }
  function bz(e, n, r, s) {
    return (f_(Il.reflect(e, n, !1), new Lo.BinaryReader(r), KD(s), !1, r.byteLength), n);
  }
  function f_(e, n, r, s, h) {
    var y;
    let b = s ? n.len : n.pos + h,
      S,
      w,
      R = (y = e.getUnknown()) !== null && y !== void 0 ? y : [];
    while (n.pos < b) {
      if ((([S, w] = n.tag()), s && w == Lo.WireType.EndGroup)) break;
      let number = e.findNumber(S);
      if (!number) {
        let skip = n.skip(w, S);
        if (r.readUnknownFields) R.push({ no: S, wireType: w, data: skip });
        continue;
      }
      qD(e, n, number, w, r);
    }
    if (s) {
      if (w != Lo.WireType.EndGroup || S !== h) throw Error("invalid end group tag");
    }
    if (R.length > 0) e.setUnknown(R);
  }
  function qD(e, n, r, s, h) {
    var y;
    switch (r.fieldKind) {
      case "scalar":
        e.set(r, Hu(n, r.scalar, r.utf8Validation));
        break;
      case "enum":
        let b = Hu(n, Pn.ScalarType.INT32);
        if (r.enum.open) e.set(r, b);
        else if (r.enum.values.some((w) => w.number === b)) e.set(r, b);
        else if (h.readUnknownFields) {
          let w = [];
          HD.varint32write(b, w);
          let R = (y = e.getUnknown()) !== null && y !== void 0 ? y : [];
          (R.push({ no: r.number, wireType: s, data: new Uint8Array(w) }), e.setUnknown(R));
        }
        break;
      case "message":
        e.set(r, p_(n, h, r, e.get(r)));
        break;
      case "list":
        Ez(n, s, e.get(r), h);
        break;
      case "map":
        Sz(n, e.get(r), h);
        break;
    }
  }
  function Sz(e, n, r) {
    let field = n.field(),
      h,
      y,
      uint32 = e.uint32(),
      S = e.pos + uint32;
    while (e.pos < S) {
      let [w] = e.tag();
      switch (w) {
        case 1:
          h = Hu(e, field.mapKey, field.utf8Validation);
          break;
        case 2:
          switch (field.mapKind) {
            case "scalar":
              y = Hu(e, field.scalar, field.utf8Validation);
              break;
            case "enum":
              y = e.int32();
              break;
            case "message":
              y = p_(e, r, field);
              break;
          }
          break;
      }
    }
    if (h === void 0) h = jg.scalarZeroValue(field.mapKey, !1);
    if (y === void 0)
      switch (field.mapKind) {
        case "scalar":
          y = jg.scalarZeroValue(field.scalar, !1);
          break;
        case "enum":
          y = field.enum.values[0].number;
          break;
        case "message":
          y = Il.reflect(field.message, void 0, !1);
          break;
      }
    n.set(h, y);
  }
  function Ez(e, n, r, s) {
    var h;
    let field = r.field();
    if (field.listKind === "message") {
      r.add(p_(e, s, field));
      return;
    }
    let b = (h = field.scalar) !== null && h !== void 0 ? h : Pn.ScalarType.INT32;
    if (!(n == Lo.WireType.LengthDelimited && b != Pn.ScalarType.STRING && b != Pn.ScalarType.BYTES)) {
      r.add(Hu(e, b, field.utf8Validation));
      return;
    }
    let w = e.uint32() + e.pos;
    while (e.pos < w) r.add(Hu(e, b, field.utf8Validation));
  }
  function p_(e, n, r, s) {
    let delimitedEncoding = r.delimitedEncoding,
      y = s !== null && s !== void 0 ? s : Il.reflect(r.message, void 0, !1);
    return (f_(y, e, n, delimitedEncoding, delimitedEncoding ? r.number : e.uint32()), y);
  }
  function Hu(e, n, r = !1) {
    switch (n) {
      case Pn.ScalarType.STRING:
        return e.string(r);
      case Pn.ScalarType.BOOL:
        return e.bool();
      case Pn.ScalarType.DOUBLE:
        return e.double();
      case Pn.ScalarType.FLOAT:
        return e.float();
      case Pn.ScalarType.INT32:
        return e.int32();
      case Pn.ScalarType.INT64:
        return e.int64();
      case Pn.ScalarType.UINT64:
        return e.uint64();
      case Pn.ScalarType.FIXED64:
        return e.fixed64();
      case Pn.ScalarType.BYTES:
        return e.bytes();
      case Pn.ScalarType.FIXED32:
        return e.fixed32();
      case Pn.ScalarType.SFIXED32:
        return e.sfixed32();
      case Pn.ScalarType.SFIXED64:
        return e.sfixed64();
      case Pn.ScalarType.SINT64:
        return e.sint64();
      case Pn.ScalarType.UINT32:
        return e.uint32();
      case Pn.ScalarType.SINT32:
        return e.sint32();
    }
  }
});

export { Ku };

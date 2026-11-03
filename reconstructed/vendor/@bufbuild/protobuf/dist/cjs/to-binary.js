/**
 * @bufbuild/protobuf/dist/cjs/to-binary.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { Po } from "./reflect/reflect.js";
import { xc } from "../commonjs/wire/binary-encoding.js";
import { Ns } from "./descriptors.js";

//@ chunk-fq0cr76a.js:416501-419542 cjs-require-graph
var qu = x(function (OO) {
  Object.defineProperty(OO, "__esModule", { value: !0 });
  OO.toBinary = Mz;
  OO.writeField = NO;
  var IO = Po(),
    Zr = xc(),
    an = Ns(),
    Uz = 3,
    RO = { writeUnknownFields: !0 };
  function Fz(e) {
    return e ? Object.assign(Object.assign({}, RO), e) : RO;
  }
  function Mz(e, n, r) {
    return Zg(new Zr.BinaryWriter(), Fz(r), IO.reflect(e, n)).finish();
  }
  function Zg(e, n, r) {
    var s;
    for (let sortedField of r.sortedFields) {
      if (!r.isSet(sortedField)) {
        if (sortedField.presence == Uz)
          throw Error(`cannot encode ${sortedField} to binary: required field not set`);
        continue;
      }
      NO(e, n, r, sortedField);
    }
    if (n.writeUnknownFields)
      for (let { no: no, wireType: wireType, data: b } of (s = r.getUnknown()) !== null && s !== void 0
        ? s
        : [])
        e.tag(no, wireType).raw(b);
    return e;
  }
  function NO(e, n, r, s) {
    var h;
    switch (s.fieldKind) {
      case "scalar":
      case "enum":
        Xg(
          e,
          r.desc.typeName,
          s.name,
          (h = s.scalar) !== null && h !== void 0 ? h : an.ScalarType.INT32,
          s.number,
          r.get(s),
        );
        break;
      case "list":
        $z(e, n, s, r.get(s));
        break;
      case "message":
        kO(e, n, s, r.get(s));
        break;
      case "map":
        for (let [y, b] of r.get(s)) Vz(e, n, s, y, b);
        break;
    }
  }
  function Xg(e, n, r, s, h, y) {
    DO(e.tag(h, Wz(s)), n, r, s, y);
  }
  function kO(e, n, r, s) {
    if (r.delimitedEncoding)
      Zg(e.tag(r.number, Zr.WireType.StartGroup), n, s).tag(r.number, Zr.WireType.EndGroup);
    else Zg(e.tag(r.number, Zr.WireType.LengthDelimited).fork(), n, s).join();
  }
  function $z(e, n, r, s) {
    var h;
    if (r.listKind == "message") {
      for (let b of s) kO(e, n, r, b);
      return;
    }
    let y = (h = r.scalar) !== null && h !== void 0 ? h : an.ScalarType.INT32;
    if (r.packed) {
      if (!s.size) return;
      e.tag(r.number, Zr.WireType.LengthDelimited).fork();
      for (let b of s) DO(e, r.parent.typeName, r.name, y, b);
      e.join();
      return;
    }
    for (let b of s) Xg(e, r.parent.typeName, r.name, y, r.number, b);
  }
  function Vz(e, n, r, s, h) {
    var y;
    switch (
      (e.tag(r.number, Zr.WireType.LengthDelimited).fork(),
      Xg(e, r.parent.typeName, r.name, r.mapKey, 1, s),
      r.mapKind)
    ) {
      case "scalar":
      case "enum":
        Xg(
          e,
          r.parent.typeName,
          r.name,
          (y = r.scalar) !== null && y !== void 0 ? y : an.ScalarType.INT32,
          2,
          h,
        );
        break;
      case "message":
        Zg(e.tag(2, Zr.WireType.LengthDelimited).fork(), n, h).join();
        break;
    }
    e.join();
  }
  function DO(e, n, r, s, h) {
    try {
      switch (s) {
        case an.ScalarType.STRING:
          e.string(h);
          break;
        case an.ScalarType.BOOL:
          e.bool(h);
          break;
        case an.ScalarType.DOUBLE:
          e.double(h);
          break;
        case an.ScalarType.FLOAT:
          e.float(h);
          break;
        case an.ScalarType.INT32:
          e.int32(h);
          break;
        case an.ScalarType.INT64:
          e.int64(h);
          break;
        case an.ScalarType.UINT64:
          e.uint64(h);
          break;
        case an.ScalarType.FIXED64:
          e.fixed64(h);
          break;
        case an.ScalarType.BYTES:
          e.bytes(h);
          break;
        case an.ScalarType.FIXED32:
          e.fixed32(h);
          break;
        case an.ScalarType.SFIXED32:
          e.sfixed32(h);
          break;
        case an.ScalarType.SFIXED64:
          e.sfixed64(h);
          break;
        case an.ScalarType.SINT64:
          e.sint64(h);
          break;
        case an.ScalarType.UINT32:
          e.uint32(h);
          break;
        case an.ScalarType.SINT32:
          e.sint32(h);
          break;
      }
    } catch (error) {
      if (error instanceof Error) throw Error(`cannot encode field ${n}.${r} to binary: ${error.message}`);
      throw error;
    }
  }
  function Wz(e) {
    switch (e) {
      case an.ScalarType.BYTES:
      case an.ScalarType.STRING:
        return Zr.WireType.LengthDelimited;
      case an.ScalarType.DOUBLE:
      case an.ScalarType.FIXED64:
      case an.ScalarType.SFIXED64:
        return Zr.WireType.Bit64;
      case an.ScalarType.FIXED32:
      case an.ScalarType.SFIXED32:
      case an.ScalarType.FLOAT:
        return Zr.WireType.Bit32;
      default:
        return Zr.WireType.Varint;
    }
  }
});

export { qu };

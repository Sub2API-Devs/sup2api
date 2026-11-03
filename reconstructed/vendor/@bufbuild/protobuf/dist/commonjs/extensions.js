/**
 * @bufbuild/protobuf/dist/commonjs/extensions.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { wl } from "../cjs/create.js";
import { Ku } from "./from-binary.js";
import { Po } from "../cjs/reflect/reflect.js";
import { El } from "./reflect/scalar.js";
import { qu } from "../cjs/to-binary.js";
import { xc } from "./wire/binary-encoding.js";
import { Fu } from "../cjs/wkt/wrappers.js";

//@ chunk-fq0cr76a.js:441299-443249 cjs-require-graph
var gp = x(function (yP) {
  Object.defineProperty(yP, "__esModule", { value: !0 });
  yP.getExtension = mP;
  yP.setExtension = YX;
  yP.clearExtension = ZX;
  yP.hasExtension = gP;
  yP.hasOption = zX;
  yP.getOption = XX;
  yP.createExtensionContainer = oy;
  var iy = wl(),
    uP = Ku(),
    dP = Po(),
    fP = El(),
    pP = qu(),
    Qu = xc(),
    hP = Fu();
  function mP(e, n) {
    S_(n, e);
    let r = JX(e.$unknown, n),
      [s, h, y] = oy(n);
    for (let b of r) uP.readField(s, new Qu.BinaryReader(b.data), h, b.wireType, { readUnknownFields: !0 });
    return y();
  }
  function YX(e, n, r) {
    var s;
    S_(n, e);
    let filtered = ((s = e.$unknown) !== null && s !== void 0 ? s : []).filter((R) => R.no !== n.number),
      [y, b] = oy(n, r),
      S = new Qu.BinaryWriter();
    pP.writeField(S, { writeUnknownFields: !0 }, y, b);
    let w = new Qu.BinaryReader(S.finish());
    while (w.pos < w.len) {
      let [R, D] = w.tag(),
        skip = w.skip(D, R);
      filtered.push({ no: R, wireType: D, data: skip });
    }
    e.$unknown = filtered;
  }
  function ZX(e, n) {
    if ((S_(n, e), e.$unknown === void 0)) return;
    e.$unknown = e.$unknown.filter((r) => r.no !== n.number);
  }
  function gP(e, n) {
    var r;
    return (
      n.extendee.typeName === e.$typeName &&
      !!((r = e.$unknown) === null || r === void 0 ? void 0 : r.find((s) => s.no === n.number))
    );
  }
  function zX(e, n) {
    let options = e.proto.options;
    if (!options) return !1;
    return gP(options, n);
  }
  function XX(e, n) {
    let options = e.proto.options;
    if (!options) {
      let [, , s] = oy(n);
      return s();
    }
    return mP(options, n);
  }
  function JX(e, n) {
    if (e === void 0) return [];
    if (n.fieldKind === "enum" || n.fieldKind === "scalar") {
      for (let r = e.length - 1; r >= 0; --r) if (e[r].no == n.number) return [e[r]];
      return [];
    }
    return e.filter((r) => r.no === n.number);
  }
  function oy(e, n) {
    let typeName = e.typeName,
      merged = Object.assign(Object.assign({}, e), {
        kind: "field",
        parent: e.extendee,
        localName: typeName,
      }),
      merged_2 = Object.assign(Object.assign({}, e.extendee), {
        fields: [merged],
        members: [merged],
        oneofs: [],
      }),
      create = iy.create(merged_2, n !== void 0 ? { [typeName]: n } : void 0);
    return [
      dP.reflect(merged_2, create),
      merged,
      () => {
        let b = create[typeName];
        if (b === void 0) {
          let message = e.message;
          if (hP.isWrapperDesc(message))
            return fP.scalarZeroValue(message.fields[0].scalar, message.fields[0].longAsString);
          return iy.create(message);
        }
        return b;
      },
    ];
  }
  function S_(e, n) {
    if (e.extendee.typeName != n.$typeName)
      throw Error(`extension ${e.typeName} can only be applied to message ${e.extendee.typeName}`);
  }
});

export { gp };

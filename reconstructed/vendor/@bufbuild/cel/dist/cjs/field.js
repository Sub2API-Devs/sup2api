/**
 * @bufbuild/cel/dist/cjs/field.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/cel@0.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { ba } from "../../../protobuf/dist/commonjs/reflect/index.js";
import { Os } from "../../../../@anthropic-ai/bedrock-sdk/core/error.js";
import { $o } from "./list.js";
import { Aa } from "./map.js";
import { Sp } from "./proto.js";
import { wa } from "./value.js";

//@ chunk-fq0cr76a.js:602201-603440 cjs-fingerprint
var MU = x(function (FU) {
  Object.defineProperty(FU, "__esModule", { value: !0 });
  FU.accessByIndex = Zoe;
  FU.accessByName = zoe;
  FU.isSet = Xoe;
  var _d = ba(),
    $l = Os(),
    vd = $o(),
    Yo = Aa(),
    UU = Sp(),
    wd = wa();
  function Zoe(e, n) {
    if (typeof e !== "object" || e === null) return;
    if (Yo.isCelMap(e)) return e.get(n);
    if (vd.isCelList(e)) return e.get(Number(n));
    return;
  }
  function zoe(e, n) {
    if (typeof e !== "object" || e === null) return;
    if (Yo.isCelMap(e)) return e.get(n);
    if (((e = wd.unwrapAny(e)), !_d.isReflectMessage(e))) return;
    let found = e.desc.fields.find((field) => field.name === n);
    if (!found) return;
    switch (found.fieldKind) {
      case "enum":
        return BigInt(e.get(found));
      case "list":
        return vd.celList(e.get(found));
      case "map":
        return Yo.celMap(e.get(found));
      case "scalar":
        return UU.celFromScalar(found.scalar, e.get(found));
      case "message":
        if (e.isSet(found)) return wd.reflectMsgToCel(e.get(found));
        if ($l.isWrapperDesc(found.message)) return null;
        switch (found.message.typeName) {
          case $l.StructSchema.typeName:
            return Yo.EMPTY_MAP;
          case $l.ListValueSchema.typeName:
            return vd.EMPTY_LIST;
          case $l.ValueSchema.typeName:
            return null;
        }
        return _d.reflect(found.message);
    }
  }
  function Xoe(e, n) {
    if (typeof e !== "object" || e === null) return !1;
    if (Yo.isCelMap(e)) return e.has(n);
    if (((e = wd.unwrapAny(e)), _d.isReflectMessage(e))) {
      let found = e.desc.fields.find((field) => field.name === n);
      if (!found) return;
      return e.isSet(found);
    }
    return !1;
  }
});

export { MU };

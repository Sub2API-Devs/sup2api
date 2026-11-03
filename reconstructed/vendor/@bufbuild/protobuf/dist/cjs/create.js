/**
 * @bufbuild/protobuf/dist/cjs/create.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { vg } from "./is-message.js";
import { Ns } from "./descriptors.js";
import { El } from "../commonjs/reflect/scalar.js";
import { Uu } from "./reflect/guard.js";
import { xl } from "./reflect/unsafe.js";
import { Fu } from "./wkt/wrappers.js";

//@ chunk-fq0cr76a.js:343319-345921 cjs-require-graph
var wl = x(function (yk) {
  Object.defineProperty(yk, "__esModule", { value: !0 });
  yk.create = mk;
  var Lg = vg(),
    $u = Ns(),
    pk = El(),
    Bg = Uu(),
    Mu = xl(),
    hk = Fu(),
    gY = 999,
    yY = 998,
    Pg = 2;
  function mk(e, n) {
    if (Lg.isMessage(n, e)) return n;
    let r = vY(e);
    if (n !== void 0) bY(e, r, n);
    return r;
  }
  function bY(e, n, r) {
    for (let member of e.members) {
      let h = r[member.localName];
      if (h == null) continue;
      let y;
      if (member.kind == "oneof") {
        let unsafeOneofCase = Mu.unsafeOneofCase(r, member);
        if (!unsafeOneofCase) continue;
        ((y = unsafeOneofCase), (h = Mu.unsafeGet(r, unsafeOneofCase)));
      } else y = member;
      switch (y.fieldKind) {
        case "message":
          h = Wx(y, h);
          break;
        case "scalar":
          h = gk(y, h);
          break;
        case "list":
          h = xY(y, h);
          break;
        case "map":
          h = EY(y, h);
          break;
      }
      Mu.unsafeSet(n, y, h);
    }
    return n;
  }
  function gk(e, n) {
    if (e.scalar == $u.ScalarType.BYTES) return Gx(n);
    return n;
  }
  function EY(e, n) {
    if (Bg.isObject(n)) {
      if (e.scalar == $u.ScalarType.BYTES) return dk(n, Gx);
      if (e.mapKind == "message") return dk(n, (r) => Wx(e, r));
    }
    return n;
  }
  function xY(e, n) {
    if (Array.isArray(n)) {
      if (e.scalar == $u.ScalarType.BYTES) return n.map(Gx);
      if (e.listKind == "message") return n.map((r) => Wx(e, r));
    }
    return n;
  }
  function Wx(e, n) {
    if (e.fieldKind == "message" && !e.oneof && hk.isWrapperDesc(e.message))
      return gk(e.message.fields[0], n);
    if (Bg.isObject(n)) {
      if (e.message.typeName == "google.protobuf.Struct" && e.parent.typeName !== "google.protobuf.Value")
        return n;
      if (!Lg.isMessage(n, e.message)) return mk(e.message, n);
    }
    return n;
  }
  function Gx(e) {
    return Array.isArray(e) ? new Uint8Array(e) : e;
  }
  function dk(e, n) {
    let r = {};
    for (let s of Object.entries(e)) r[s[0]] = n(s[1]);
    return r;
  }
  var _Y = Symbol(),
    weakMap = new WeakMap();
  function vY(e) {
    let n;
    if (!wY(e)) {
      n = { $typeName: e.typeName };
      for (let member of e.members)
        if (member.kind == "oneof" || member.presence == Pg) n[member.localName] = Vx(member);
    } else {
      let r = weakMap.get(e),
        s,
        h;
      if (r) ({ prototype: s, members: h } = r);
      else {
        ((s = {}), (h = new Set()));
        for (let member of e.members) {
          if (member.kind == "oneof") continue;
          if (member.fieldKind != "scalar" && member.fieldKind != "enum") continue;
          if (member.presence == Pg) continue;
          (h.add(member), (s[member.localName] = Vx(member)));
        }
        weakMap.set(e, { prototype: s, members: h });
      }
      ((n = Object.create(s)), (n.$typeName = e.typeName));
      for (let member of e.members) {
        if (h.has(member)) continue;
        if (member.kind == "field") {
          if (member.fieldKind == "message") continue;
          if (member.fieldKind == "scalar" || member.fieldKind == "enum") {
            if (member.presence != Pg) continue;
          }
        }
        n[member.localName] = Vx(member);
      }
    }
    return n;
  }
  function wY(e) {
    switch (e.file.edition) {
      case gY:
        return !1;
      case yY:
        return !0;
      default:
        return e.fields.some((field) => field.presence != Pg && field.fieldKind != "message" && !field.oneof);
    }
  }
  function Vx(e) {
    if (e.kind == "oneof") return { case: void 0 };
    if (e.fieldKind == "list") return [];
    if (e.fieldKind == "map") return {};
    if (e.fieldKind == "message") return _Y;
    let defaultValue = e.getDefaultValue();
    if (defaultValue !== void 0)
      return e.fieldKind == "scalar" && e.longAsString ? defaultValue.toString() : defaultValue;
    return e.fieldKind == "scalar" ? pk.scalarZeroValue(e.scalar, e.longAsString) : e.enum.values[0].number;
  }
});

export { wl };

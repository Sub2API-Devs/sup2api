/**
 * @bufbuild/protobuf/dist/cjs/registry.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../runtime/bun-runtime.js";
import { Ns } from "./descriptors.js";
import { s_ } from "./wire/text-format.js";
import { Ux } from "./reflect/nested-types.js";
import { xl } from "./reflect/unsafe.js";
import { Ec } from "./reflect/names.js";

//@ chunk-fq0cr76a.js:364098-375937 cjs-require-graph
var qg = x(function (uD) {
  Object.defineProperty(uD, "__esModule", { value: !0 });
  uD.maximumEdition = uD.minimumEdition = void 0;
  uD.createRegistry = i7;
  uD.createMutableRegistry = o7;
  uD.createFileRegistry = a7;
  var Gu = Ns(),
    Hg = s_(),
    rD = Ux(),
    Al = xl(),
    ks = Ec();
  function i7(...e) {
    return iD(e);
  }
  function o7(...e) {
    let n = iD(e);
    return Object.assign(Object.assign({}, n), {
      remove(r) {
        var s;
        if (r.kind == "extension")
          (s = n.extendees.get(r.extendee.typeName)) === null || s === void 0 || s.delete(r.number);
        n.types.delete(r.typeName);
      },
    });
  }
  function a7(...e) {
    let n = sD();
    if (!e.length) return n;
    if ("$typeName" in e[0] && e[0].$typeName == "google.protobuf.FileDescriptorSet") {
      for (let r of e[0].file) eD(r, n);
      return n;
    }
    if ("$typeName" in e[0]) {
      let y = function (b) {
          let S = [];
          for (let w of b.dependency) {
            if (n.getFile(w) != null) continue;
            if (h.has(w)) continue;
            let R = s(w);
            if (!R) throw Error(`Unable to resolve ${w}, imported by ${b.name}`);
            if ("kind" in R) n.addFile(R, !1, !0);
            else (h.add(R.name), S.push(R));
          }
          return S.concat(...S.map(y));
        },
        r = e[0],
        s = e[1],
        h = new Set();
      for (let b of [r, ...y(r)].reverse()) eD(b, n);
    } else for (let r of e) for (let file of r.files) n.addFile(file);
    return n;
  }
  function sD() {
    let e = new Map(),
      n = new Map(),
      r = new Map();
    return {
      kind: "registry",
      types: e,
      extendees: n,
      [Symbol.iterator]() {
        return e.values();
      },
      get files() {
        return r.values();
      },
      addFile(s, h, y) {
        if ((r.set(s.proto.name, s), !h)) for (let b of rD.nestedTypes(s)) this.add(b);
        if (y) for (let dependency of s.dependencies) this.addFile(dependency, h, y);
      },
      add(s) {
        if (s.kind == "extension") {
          let h = n.get(s.extendee.typeName);
          if (!h) n.set(s.extendee.typeName, (h = new Map()));
          h.set(s.number, s);
        }
        e.set(s.typeName, s);
      },
      get(s) {
        return e.get(s);
      },
      getFile(s) {
        return r.get(s);
      },
      getMessage(s) {
        let h = e.get(s);
        return (h === null || h === void 0 ? void 0 : h.kind) == "message" ? h : void 0;
      },
      getEnum(s) {
        let h = e.get(s);
        return (h === null || h === void 0 ? void 0 : h.kind) == "enum" ? h : void 0;
      },
      getExtension(s) {
        let h = e.get(s);
        return (h === null || h === void 0 ? void 0 : h.kind) == "extension" ? h : void 0;
      },
      getExtensionFor(s, h) {
        var y;
        return (y = n.get(s.typeName)) === null || y === void 0 ? void 0 : y.get(h);
      },
      getService(s) {
        let h = e.get(s);
        return (h === null || h === void 0 ? void 0 : h.kind) == "service" ? h : void 0;
      },
    };
  }
  function iD(e) {
    let n = sD();
    for (let r of e)
      switch (r.kind) {
        case "registry":
          for (let s of r) n.add(s);
          break;
        case "file":
          n.addFile(r);
          break;
        default:
          n.add(r);
          break;
      }
    return n;
  }
  var l7 = 998,
    c7 = 999,
    u7 = 9999,
    d7 = 9,
    pp = 10,
    fp = 11,
    f7 = 12,
    Xk = 14,
    c_ = 3,
    p7 = 2,
    Jk = 1,
    h7 = 0,
    i_ = 1,
    Qk = 2,
    m7 = 3,
    g7 = 1,
    y7 = 2,
    b7 = 1,
    S7 = 2;
  ((uD.minimumEdition = 998), (uD.maximumEdition = 1001));
  var aD = {
    998: {
      fieldPresence: 1,
      enumType: 2,
      repeatedFieldEncoding: 2,
      utf8Validation: 3,
      messageEncoding: 1,
      jsonFormat: 2,
      enforceNamingStyle: 2,
      defaultSymbolVisibility: 1,
    },
    999: {
      fieldPresence: 2,
      enumType: 1,
      repeatedFieldEncoding: 1,
      utf8Validation: 2,
      messageEncoding: 1,
      jsonFormat: 1,
      enforceNamingStyle: 2,
      defaultSymbolVisibility: 1,
    },
    1000: {
      fieldPresence: 1,
      enumType: 1,
      repeatedFieldEncoding: 1,
      utf8Validation: 2,
      messageEncoding: 1,
      jsonFormat: 1,
      enforceNamingStyle: 2,
      defaultSymbolVisibility: 1,
    },
    1001: {
      fieldPresence: 1,
      enumType: 1,
      repeatedFieldEncoding: 1,
      utf8Validation: 2,
      messageEncoding: 1,
      jsonFormat: 1,
      enforceNamingStyle: 1,
      defaultSymbolVisibility: 2,
    },
  };
  function eD(e, n) {
    var r, s;
    let h = {
        kind: "file",
        proto: e,
        deprecated:
          (s = (r = e.options) === null || r === void 0 ? void 0 : r.deprecated) !== null && s !== void 0
            ? s
            : !1,
        edition: v7(e),
        name: e.name.replace(/\.proto$/, ""),
        dependencies: w7(e, n),
        enums: [],
        messages: [],
        extensions: [],
        services: [],
        toString() {
          return `file ${e.name}`;
        },
      },
      y = new Map(),
      b = {
        get(S) {
          return y.get(S);
        },
        add(S) {
          var w;
          (so(((w = S.proto.options) === null || w === void 0 ? void 0 : w.mapEntry) === !0),
            y.set(S.typeName, S));
        },
      };
    for (let S of e.enumType) lD(S, h, void 0, n);
    for (let S of e.messageType) cD(S, h, void 0, n, b);
    for (let S of e.service) E7(S, h, n);
    o_(h, n);
    for (let S of y.values()) a_(S, n, b);
    for (let message of h.messages) (a_(message, n, b), o_(message, n));
    n.addFile(h, !0);
  }
  function o_(e, n) {
    switch (e.kind) {
      case "file":
        for (let r of e.proto.extension) {
          let s = l_(r, e, n);
          (e.extensions.push(s), n.add(s));
        }
        break;
      case "message":
        for (let r of e.proto.extension) {
          let s = l_(r, e, n);
          (e.nestedExtensions.push(s), n.add(s));
        }
        for (let nestedMessage of e.nestedMessages) o_(nestedMessage, n);
        break;
    }
  }
  function a_(e, n, r) {
    let mapped = e.proto.oneofDecl.map((y) => _7(y, e)),
      h = new Set();
    for (let y of e.proto.field) {
      let b = C7(y, mapped),
        S = l_(y, e, n, b, r);
      if ((e.fields.push(S), (e.field[S.localName] = S), b === void 0)) e.members.push(S);
      else if ((b.fields.push(S), !h.has(b))) (h.add(b), e.members.push(b));
    }
    for (let y of mapped.filter((b) => h.has(b))) e.oneofs.push(y);
    for (let nestedMessage of e.nestedMessages) a_(nestedMessage, n, r);
  }
  function lD(e, n, r, s) {
    var h, y, b, S, w;
    let R = T7(e.name, e.value),
      D = {
        kind: "enum",
        proto: e,
        deprecated:
          (y = (h = e.options) === null || h === void 0 ? void 0 : h.deprecated) !== null && y !== void 0
            ? y
            : !1,
        file: n,
        parent: r,
        open: !0,
        name: e.name,
        typeName: Kg(e, r, n),
        value: {},
        values: [],
        sharedPrefix: R,
        toString() {
          return `enum ${this.typeName}`;
        },
      };
    ((D.open = k7(D)), s.add(D));
    for (let O of e.value) {
      let L = O.name;
      D.values.push(
        (D.value[O.number] = {
          kind: "enum_value",
          proto: O,
          deprecated:
            (S = (b = O.options) === null || b === void 0 ? void 0 : b.deprecated) !== null && S !== void 0
              ? S
              : !1,
          parent: D,
          name: L,
          localName: ks.safeObjectProperty(R == null ? L : L.substring(R.length)),
          number: O.number,
          toString() {
            return `enum value ${D.typeName}.${L}`;
          },
        }),
      );
    }
    ((w = r === null || r === void 0 ? void 0 : r.nestedEnums) !== null && w !== void 0 ? w : n.enums).push(
      D,
    );
  }
  function cD(e, n, r, s, h) {
    var y, b, S, w;
    let R = {
      kind: "message",
      proto: e,
      deprecated:
        (b = (y = e.options) === null || y === void 0 ? void 0 : y.deprecated) !== null && b !== void 0
          ? b
          : !1,
      file: n,
      parent: r,
      name: e.name,
      typeName: Kg(e, r, n),
      fields: [],
      field: {},
      oneofs: [],
      members: [],
      nestedEnums: [],
      nestedMessages: [],
      nestedExtensions: [],
      toString() {
        return `message ${this.typeName}`;
      },
    };
    if (((S = e.options) === null || S === void 0 ? void 0 : S.mapEntry) === !0) h.add(R);
    else
      (((w = r === null || r === void 0 ? void 0 : r.nestedMessages) !== null && w !== void 0
        ? w
        : n.messages
      ).push(R),
        s.add(R));
    for (let D of e.enumType) lD(D, n, R, s);
    for (let D of e.nestedType) cD(D, n, R, s, h);
  }
  function E7(e, n, r) {
    var s, h;
    let y = {
      kind: "service",
      proto: e,
      deprecated:
        (h = (s = e.options) === null || s === void 0 ? void 0 : s.deprecated) !== null && h !== void 0
          ? h
          : !1,
      file: n,
      name: e.name,
      typeName: Kg(e, void 0, n),
      methods: [],
      method: {},
      toString() {
        return `service ${this.typeName}`;
      },
    };
    (n.services.push(y), r.add(y));
    for (let b of e.method) {
      let S = x7(b, y, r);
      (y.methods.push(S), (y.method[S.localName] = S));
    }
  }
  function x7(e, n, r) {
    var s, h, y, b;
    let S;
    if (e.clientStreaming && e.serverStreaming) S = "bidi_streaming";
    else if (e.clientStreaming) S = "client_streaming";
    else if (e.serverStreaming) S = "server_streaming";
    else S = "unary";
    let message = r.getMessage(Sa(e.inputType)),
      message_2 = r.getMessage(Sa(e.outputType));
    (so(message, `invalid MethodDescriptorProto: input_type ${e.inputType} not found`),
      so(message_2, `invalid MethodDescriptorProto: output_type ${e.inputType} not found`));
    let D = e.name;
    return {
      kind: "rpc",
      proto: e,
      deprecated:
        (h = (s = e.options) === null || s === void 0 ? void 0 : s.deprecated) !== null && h !== void 0
          ? h
          : !1,
      parent: n,
      name: D,
      localName: ks.safeObjectProperty(
        D.length ? ks.safeObjectProperty(D[0].toLowerCase() + D.substring(1)) : D,
      ),
      methodKind: S,
      input: message,
      output: message_2,
      idempotency:
        (b = (y = e.options) === null || y === void 0 ? void 0 : y.idempotencyLevel) !== null && b !== void 0
          ? b
          : h7,
      toString() {
        return `rpc ${n.typeName}.${D}`;
      },
    };
  }
  function _7(e, n) {
    return {
      kind: "oneof",
      proto: e,
      deprecated: !1,
      parent: n,
      fields: [],
      name: e.name,
      localName: ks.safeObjectProperty(ks.protoCamelCase(e.name)),
      toString() {
        return `oneof ${n.typeName}.${this.name}`;
      },
    };
  }
  function l_(e, n, r, s, h) {
    var y, b, S;
    let w = h === void 0,
      R = {
        kind: "field",
        proto: e,
        deprecated:
          (b = (y = e.options) === null || y === void 0 ? void 0 : y.deprecated) !== null && b !== void 0
            ? b
            : !1,
        name: e.name,
        number: e.number,
        scalar: void 0,
        message: void 0,
        enum: void 0,
        presence: R7(e, s, w, n),
        utf8Validation: D7(e, n),
        listKind: void 0,
        mapKind: void 0,
        mapKey: void 0,
        delimitedEncoding: void 0,
        packed: void 0,
        longAsString: !1,
        getDefaultValue: void 0,
      };
    if (w) {
      let V = n.kind == "file" ? n : n.file,
        K = n.kind == "file" ? void 0 : n,
        q = Kg(e, K, V);
      ((R.kind = "extension"),
        (R.file = V),
        (R.parent = K),
        (R.oneof = void 0),
        (R.typeName = q),
        (R.jsonName = `[${q}]`),
        (R.toString = () => `extension ${q}`));
      let message = r.getMessage(Sa(e.extendee));
      (so(message, `invalid FieldDescriptorProto: extendee ${e.extendee} not found`), (R.extendee = message));
    } else {
      let V = n;
      (so(V.kind == "message"),
        (R.parent = V),
        (R.oneof = s),
        (R.localName = s ? ks.protoCamelCase(e.name) : ks.safeObjectProperty(ks.protoCamelCase(e.name))),
        (R.jsonName = e.jsonName),
        (R.toString = () => `field ${V.typeName}.${e.name}`));
    }
    let { label: label, type: O } = e,
      L = (S = e.options) === null || S === void 0 ? void 0 : S.jstype;
    if (label === c_) {
      let V = O == fp ? (h === null || h === void 0 ? void 0 : h.get(Sa(e.typeName))) : void 0;
      if (V) {
        R.fieldKind = "map";
        let { key: key, value: q } = N7(V);
        return (
          (R.mapKey = key.scalar),
          (R.mapKind = q.fieldKind),
          (R.message = q.message),
          (R.delimitedEncoding = !1),
          (R.enum = q.enum),
          (R.scalar = q.scalar),
          R
        );
      }
      switch (((R.fieldKind = "list"), O)) {
        case fp:
        case pp:
          ((R.listKind = "message"),
            (R.message = r.getMessage(Sa(e.typeName))),
            so(R.message),
            (R.delimitedEncoding = nD(e, n)));
          break;
        case Xk:
          ((R.listKind = "enum"), (R.enum = r.getEnum(Sa(e.typeName))), so(R.enum));
          break;
        default:
          ((R.listKind = "scalar"), (R.scalar = O), (R.longAsString = L == Jk));
          break;
      }
      return ((R.packed = I7(e, n)), R);
    }
    switch (O) {
      case fp:
      case pp:
        ((R.fieldKind = "message"),
          (R.message = r.getMessage(Sa(e.typeName))),
          so(R.message, `invalid FieldDescriptorProto: type_name ${e.typeName} not found`),
          (R.delimitedEncoding = nD(e, n)),
          (R.getDefaultValue = () => {
            return;
          }));
        break;
      case Xk: {
        let V = r.getEnum(Sa(e.typeName));
        (so(V !== void 0, `invalid FieldDescriptorProto: type_name ${e.typeName} not found`),
          (R.fieldKind = "enum"),
          (R.enum = r.getEnum(Sa(e.typeName))),
          (R.getDefaultValue = () =>
            Al.unsafeIsSetExplicit(e, "defaultValue")
              ? Hg.parseTextFormatEnumValue(V, e.defaultValue)
              : void 0));
        break;
      }
      default: {
        ((R.fieldKind = "scalar"),
          (R.scalar = O),
          (R.longAsString = L == Jk),
          (R.getDefaultValue = () =>
            Al.unsafeIsSetExplicit(e, "defaultValue")
              ? Hg.parseTextFormatScalarValue(O, e.defaultValue)
              : void 0));
        break;
      }
    }
    return R;
  }
  function v7(e) {
    switch (e.syntax) {
      case "":
      case "proto2":
        return l7;
      case "proto3":
        return c7;
      case "editions":
        if (e.edition === u7) return uD.maximumEdition;
        if (e.edition in aD) return e.edition;
        throw Error(`${e.name}: unsupported edition`);
      default:
        throw Error(`${e.name}: unsupported syntax "${e.syntax}"`);
    }
  }
  function w7(e, n) {
    return e.dependency.map((r) => {
      let file = n.getFile(r);
      if (!file) throw Error(`Cannot find ${r}, imported by ${e.name}`);
      return file;
    });
  }
  function T7(e, n) {
    let r = A7(e) + "_";
    for (let s of n) {
      if (!s.name.toLowerCase().startsWith(r)) return;
      let substring = s.name.substring(r.length);
      if (substring.length == 0) return;
      if (/^\d/.test(substring)) return;
    }
    return r;
  }
  function A7(e) {
    return (e.substring(0, 1) + e.substring(1).replace(/[A-Z]/g, (n) => "_" + n)).toLowerCase();
  }
  function Kg(e, n, r) {
    let s;
    if (n) s = `${n.typeName}.${e.name}`;
    else if (r.proto.package.length > 0) s = `${r.proto.package}.${e.name}`;
    else s = `${e.name}`;
    return s;
  }
  function Sa(e) {
    return e.startsWith(".") ? e.substring(1) : e;
  }
  function C7(e, n) {
    if (!Al.unsafeIsSetExplicit(e, "oneofIndex")) return;
    if (e.proto3Optional) return;
    let r = n[e.oneofIndex];
    return (
      so(r, `invalid FieldDescriptorProto: oneof #${e.oneofIndex} for field #${e.number} not found`),
      r
    );
  }
  function R7(e, n, r, s) {
    if (e.label == p7) return m7;
    if (e.label == c_) return Qk;
    if (!!n || e.proto3Optional) return i_;
    if (r) return i_;
    let h = vc("fieldPresence", { proto: e, parent: s });
    if (h == Qk && (e.type == fp || e.type == pp)) return i_;
    return h;
  }
  function I7(e, n) {
    if (e.label != c_) return !1;
    switch (e.type) {
      case d7:
      case f7:
      case pp:
      case fp:
        return !1;
    }
    let options = e.options;
    if (options && Al.unsafeIsSetExplicit(options, "packed")) return options.packed;
    return g7 == vc("repeatedFieldEncoding", { proto: e, parent: n });
  }
  function N7(e) {
    let found = e.fields.find((field) => field.number === 1),
      found_2 = e.fields.find((field) => field.number === 2);
    return (
      so(
        found &&
          found.fieldKind == "scalar" &&
          found.scalar != Gu.ScalarType.BYTES &&
          found.scalar != Gu.ScalarType.FLOAT &&
          found.scalar != Gu.ScalarType.DOUBLE &&
          found_2 &&
          found_2.fieldKind != "list" &&
          found_2.fieldKind != "map",
      ),
      { key: found, value: found_2 }
    );
  }
  function k7(e) {
    var n;
    return (
      b7 == vc("enumType", { proto: e.proto, parent: (n = e.parent) !== null && n !== void 0 ? n : e.file })
    );
  }
  function nD(e, n) {
    if (e.type == pp) return !0;
    return y7 == vc("messageEncoding", { proto: e, parent: n });
  }
  function D7(e, n) {
    return S7 == vc("utf8Validation", { proto: e, parent: n });
  }
  function vc(e, n) {
    var r, s;
    let h = (r = n.proto.options) === null || r === void 0 ? void 0 : r.features;
    if (h) {
      let y = h[e];
      if (y != 0) return y;
    }
    if ("kind" in n) {
      if (n.kind == "message") return vc(e, (s = n.parent) !== null && s !== void 0 ? s : n.file);
      let y = aD[n.edition];
      if (!y) throw Error(`feature default for edition ${n.edition} not found`);
      return y[e];
    }
    return vc(e, n.parent);
  }
  function so(e, n) {
    if (!e) throw Error(n);
  }
});

export { qg };

/**
 * @bufbuild/protobuf/dist/cjs/codegenv2/boot.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { r_ } from "./restore-json-names.js";
import { qg } from "../registry.js";

//@ chunk-fq0cr76a.js:375937-378224 cjs-require-graph
var d_ = x(function (gD) {
  Object.defineProperty(gD, "__esModule", { value: !0 });
  gD.boot = U7;
  gD.bootFileDescriptorProto = pD;
  var dD = r_(),
    fD = qg();
  function U7(e) {
    let n = pD(e);
    return (
      n.messageType.forEach(dD.restoreJsonNames),
      fD
        .createFileRegistry(n, () => {
          return;
        })
        .getFile(n.name)
    );
  }
  function pD(e) {
    let create = Object.create({ syntax: "", edition: 0 });
    return Object.assign(
      create,
      Object.assign(
        Object.assign(
          {
            $typeName: "google.protobuf.FileDescriptorProto",
            dependency: [],
            publicDependency: [],
            weakDependency: [],
            optionDependency: [],
            service: [],
            extension: [],
          },
          e,
        ),
        { messageType: e.messageType.map(hD), enumType: e.enumType.map(mD) },
      ),
    );
  }
  function hD(e) {
    var n, r, s, h, y, b, S, w;
    let create = Object.create({ visibility: 0 });
    return Object.assign(create, {
      $typeName: "google.protobuf.DescriptorProto",
      name: e.name,
      field:
        (r = (n = e.field) === null || n === void 0 ? void 0 : n.map(F7)) !== null && r !== void 0 ? r : [],
      extension: [],
      nestedType:
        (h = (s = e.nestedType) === null || s === void 0 ? void 0 : s.map(hD)) !== null && h !== void 0
          ? h
          : [],
      enumType:
        (b = (y = e.enumType) === null || y === void 0 ? void 0 : y.map(mD)) !== null && b !== void 0
          ? b
          : [],
      extensionRange:
        (w =
          (S = e.extensionRange) === null || S === void 0
            ? void 0
            : S.map((D) =>
                Object.assign({ $typeName: "google.protobuf.DescriptorProto.ExtensionRange" }, D),
              )) !== null && w !== void 0
          ? w
          : [],
      oneofDecl: [],
      reservedRange: [],
      reservedName: [],
    });
  }
  function F7(e) {
    let create = Object.create({
      label: 1,
      typeName: "",
      extendee: "",
      defaultValue: "",
      oneofIndex: 0,
      jsonName: "",
      proto3Optional: !1,
    });
    return Object.assign(
      create,
      Object.assign(Object.assign({ $typeName: "google.protobuf.FieldDescriptorProto" }, e), {
        options: e.options ? M7(e.options) : void 0,
      }),
    );
  }
  function M7(e) {
    var n, r, s;
    let create = Object.create({
      ctype: 0,
      packed: !1,
      jstype: 0,
      lazy: !1,
      unverifiedLazy: !1,
      deprecated: !1,
      weak: !1,
      debugRedact: !1,
      retention: 0,
    });
    return Object.assign(
      create,
      Object.assign(Object.assign({ $typeName: "google.protobuf.FieldOptions" }, e), {
        targets: (n = e.targets) !== null && n !== void 0 ? n : [],
        editionDefaults:
          (s =
            (r = e.editionDefaults) === null || r === void 0
              ? void 0
              : r.map((y) =>
                  Object.assign({ $typeName: "google.protobuf.FieldOptions.EditionDefault" }, y),
                )) !== null && s !== void 0
            ? s
            : [],
        uninterpretedOption: [],
      }),
    );
  }
  function mD(e) {
    let create = Object.create({ visibility: 0 });
    return Object.assign(create, {
      $typeName: "google.protobuf.EnumDescriptorProto",
      name: e.name,
      reservedName: [],
      reservedRange: [],
      value: e.value.map((r) => Object.assign({ $typeName: "google.protobuf.EnumValueDescriptorProto" }, r)),
    });
  }
});

export { d_ };

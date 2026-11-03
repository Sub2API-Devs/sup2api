/**
 * @bufbuild/protobuf/dist/commonjs/codegenv2/embed.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { Ec } from "../../cjs/reflect/names.js";
import { E_ } from "../fields.js";
import { dp } from "../../cjs/wire/base64-encoding.js";
import { qu } from "../../cjs/to-binary.js";
import { n_ } from "../clone.js";
import { Rl } from "../wkt/gen/google/protobuf/descriptor_pb.js";

//@ chunk-fq0cr76a.js:510775-515173 cjs-fingerprint
var eU = x(function (QB) {
  Object.defineProperty(QB, "__esModule", { value: !0 });
  QB.embedFileDesc = nie;
  QB.pathInFileDesc = rie;
  QB.createFileDescriptorProtoBoot = zB;
  var jy = Ec(),
    fn = E_(),
    qB = dp(),
    jB = qu(),
    YB = n_(),
    Yt = Rl();
  function nie(e) {
    let n = {
      bootable: !1,
      proto() {
        let clone = YB.clone(Yt.FileDescriptorProtoSchema, e);
        return (
          fn.clearField(clone, Yt.FileDescriptorProtoSchema.field.dependency),
          fn.clearField(clone, Yt.FileDescriptorProtoSchema.field.sourceCodeInfo),
          clone.messageType.map(ZB),
          clone
        );
      },
      base64() {
        let toBinary = jB.toBinary(Yt.FileDescriptorProtoSchema, this.proto());
        return qB.base64Encode(toBinary, "std_raw");
      },
    };
    return e.name == "google/protobuf/descriptor.proto"
      ? Object.assign(Object.assign({}, n), {
          bootable: !0,
          boot() {
            return zB(this.proto());
          },
        })
      : n;
  }
  function ZB(e) {
    for (let n of e.field)
      if (n.jsonName === jy.protoCamelCase(n.name))
        fn.clearField(n, Yt.FieldDescriptorProtoSchema.field.jsonName);
    for (let n of e.nestedType) ZB(n);
  }
  function rie(e) {
    if (e.kind == "service") return [e.file.services.indexOf(e)];
    let parent = e.parent;
    if (parent == null)
      switch (e.kind) {
        case "enum":
          return [e.file.enums.indexOf(e)];
        case "message":
          return [e.file.messages.indexOf(e)];
        case "extension":
          return [e.file.extensions.indexOf(e)];
      }
    function r(h) {
      let y = [];
      for (let parent = h.parent; parent;) {
        let index = parent.nestedMessages.indexOf(h);
        (y.unshift(index), (h = parent), (parent = h.parent));
      }
      return (y.unshift(h.file.messages.indexOf(h)), y);
    }
    let s = r(parent);
    switch (e.kind) {
      case "extension":
        return [...s, parent.nestedExtensions.indexOf(e)];
      case "message":
        return [...s, parent.nestedMessages.indexOf(e)];
      case "enum":
        return [...s, parent.nestedEnums.indexOf(e)];
    }
  }
  function zB(e) {
    var n;
    return (
      Xn(e.name == "google/protobuf/descriptor.proto"),
      Xn(e.package == "google.protobuf"),
      Xn(!e.dependency.length),
      Xn(!e.publicDependency.length),
      Xn(!e.weakDependency.length),
      Xn(!e.optionDependency.length),
      Xn(!e.service.length),
      Xn(!e.extension.length),
      Xn(e.sourceCodeInfo === void 0),
      Xn(e.syntax == "" || e.syntax == "proto2"),
      Xn(!((n = e.options) === null || n === void 0 ? void 0 : n.features)),
      Xn(e.edition === Yt.Edition.EDITION_UNKNOWN),
      { name: e.name, package: e.package, messageType: e.messageType.map(XB), enumType: e.enumType.map(JB) }
    );
  }
  function XB(e) {
    (Xn(e.extension.length == 0),
      Xn(!e.oneofDecl.length),
      Xn(!e.options),
      Xn(!fn.isFieldSet(e, Yt.DescriptorProtoSchema.field.visibility)));
    let n = { name: e.name };
    if (e.field.length) n.field = e.field.map(sie);
    if (e.nestedType.length) n.nestedType = e.nestedType.map(XB);
    if (e.enumType.length) n.enumType = e.enumType.map(JB);
    if (e.extensionRange.length)
      n.extensionRange = e.extensionRange.map((r) => (Xn(!r.options), { start: r.start, end: r.end }));
    return n;
  }
  function sie(e) {
    (Xn(fn.isFieldSet(e, Yt.FieldDescriptorProtoSchema.field.name)),
      Xn(fn.isFieldSet(e, Yt.FieldDescriptorProtoSchema.field.number)),
      Xn(fn.isFieldSet(e, Yt.FieldDescriptorProtoSchema.field.type)),
      Xn(!fn.isFieldSet(e, Yt.FieldDescriptorProtoSchema.field.oneofIndex)),
      Xn(
        !fn.isFieldSet(e, Yt.FieldDescriptorProtoSchema.field.jsonName) ||
          e.jsonName === jy.protoCamelCase(e.name),
      ));
    let n = { name: e.name, number: e.number, type: e.type };
    if (fn.isFieldSet(e, Yt.FieldDescriptorProtoSchema.field.label)) n.label = e.label;
    if (fn.isFieldSet(e, Yt.FieldDescriptorProtoSchema.field.typeName)) n.typeName = e.typeName;
    if (fn.isFieldSet(e, Yt.FieldDescriptorProtoSchema.field.extendee)) n.extendee = e.extendee;
    if (fn.isFieldSet(e, Yt.FieldDescriptorProtoSchema.field.defaultValue)) n.defaultValue = e.defaultValue;
    if (e.options) n.options = iie(e.options);
    return n;
  }
  function iie(e) {
    let n = {};
    if (
      (Xn(!fn.isFieldSet(e, Yt.FieldOptionsSchema.field.ctype)),
      fn.isFieldSet(e, Yt.FieldOptionsSchema.field.packed))
    )
      n.packed = e.packed;
    if (
      (Xn(!fn.isFieldSet(e, Yt.FieldOptionsSchema.field.jstype)),
      Xn(!fn.isFieldSet(e, Yt.FieldOptionsSchema.field.lazy)),
      Xn(!fn.isFieldSet(e, Yt.FieldOptionsSchema.field.unverifiedLazy)),
      fn.isFieldSet(e, Yt.FieldOptionsSchema.field.deprecated))
    )
      n.deprecated = e.deprecated;
    if (
      (Xn(!fn.isFieldSet(e, Yt.FieldOptionsSchema.field.weak)),
      Xn(!fn.isFieldSet(e, Yt.FieldOptionsSchema.field.debugRedact)),
      fn.isFieldSet(e, Yt.FieldOptionsSchema.field.retention))
    )
      n.retention = e.retention;
    if (e.targets.length) n.targets = e.targets;
    if (e.editionDefaults.length)
      n.editionDefaults = e.editionDefaults.map((editionDefault) => ({
        value: editionDefault.value,
        edition: editionDefault.edition,
      }));
    return (
      Xn(!fn.isFieldSet(e, Yt.FieldOptionsSchema.field.features)),
      Xn(!fn.isFieldSet(e, Yt.FieldOptionsSchema.field.uninterpretedOption)),
      n
    );
  }
  function JB(e) {
    return (
      Xn(!e.options),
      Xn(!fn.isFieldSet(e, Yt.EnumDescriptorProtoSchema.field.visibility)),
      { name: e.name, value: e.value.map((n) => (Xn(!n.options), { name: n.name, number: n.number })) }
    );
  }
  function Xn(e) {
    if (!e) throw Error();
  }
});

export { eU };

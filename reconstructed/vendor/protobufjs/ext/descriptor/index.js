/**
 * protobufjs/ext/descriptor/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: protobufjs@7.6.0
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { qs } from "../../src/index.js";
import { oo } from "../../google/protobuf/descriptor.json.js";

//@ chunk-pwh5dx3n.js:156548-168464 cjs-fingerprint
var uh = x(function (I, ch) {
  var Ne = qs();
  ch.exports = I = Ne.descriptor = Ne.Root.fromJSON(oo()).lookup(".google.protobuf");
  var {
      Namespace: Namespace,
      Root: Root,
      Enum: Enum,
      Type: Type,
      Field: Field,
      MapField: MapField,
      OneOf: OneOf,
      Service: Service,
      Method: Method,
    } = Ne,
    patterns = Ne.util.patterns,
    { numberRe: numberRe, typeRefRe: typeRefRe } = patterns;
  Root.fromDescriptor = function (t) {
    if (typeof t.length === "number") t = I.FileDescriptorSet.decode(t);
    var r = new Root();
    if (t.file) {
      var i, s;
      for (var n = 0, a; n < t.file.length; ++n) {
        if (((s = r), (i = t.file[n]).package && i.package.length)) s = r.define(i.package);
        var o = TT(i);
        if (i.name && i.name.length) r.files.push((s.filename = i.name));
        if (i.messageType)
          for (a = 0; a < i.messageType.length; ++a) s.add(Type.fromDescriptor(i.messageType[a], o));
        if (i.enumType) for (a = 0; a < i.enumType.length; ++a) s.add(Enum.fromDescriptor(i.enumType[a], o));
        if (i.extension)
          for (a = 0; a < i.extension.length; ++a) s.add(Field.fromDescriptor(i.extension[a], o));
        if (i.service) for (a = 0; a < i.service.length; ++a) s.add(Service.fromDescriptor(i.service[a], o));
        var l = jr(i.options, I.FileOptions);
        if (l) {
          var keys = Object.keys(l);
          for (a = 0; a < keys.length; ++a) s.setOption(keys[a], l[keys[a]]);
        }
      }
    }
    return r.resolveAll();
  };
  Root.prototype.toDescriptor = function (t) {
    var create = I.FileDescriptorSet.create();
    return (nh(this, create.file, t), create);
  };
  function nh(e, t, r) {
    var create = I.FileDescriptorProto.create({
      name: e.filename || (e.fullName.substring(1).replace(/\./g, "_") || "root") + ".proto",
    });
    if ((RT(r, create), !(e instanceof Root))) create.package = e.fullName.substring(1);
    for (var s = 0, n; s < e.nestedArray.length; ++s)
      if ((n = e._nestedArray[s]) instanceof Type) create.messageType.push(n.toDescriptor(r));
      else if (n instanceof Enum) create.enumType.push(n.toDescriptor());
      else if (n instanceof Field) create.extension.push(n.toDescriptor(r));
      else if (n instanceof Service) create.service.push(n.toDescriptor());
      else if (n instanceof Namespace) nh(n, t, r);
    if (
      ((create.options = Gr(e.options, I.FileOptions)),
      create.messageType.length + create.enumType.length + create.extension.length + create.service.length)
    )
      t.push(create);
  }
  var gT = 0;
  Type.fromDescriptor = function (t, r, i) {
    if (typeof t.length === "number") t = I.DescriptorProto.decode(t);
    var s = new Type(t.name.length ? t.name : "Type" + gT++, jr(t.options, I.MessageOptions)),
      n;
    if (!i) s._edition = r;
    if (t.oneofDecl) for (n = 0; n < t.oneofDecl.length; ++n) s.add(OneOf.fromDescriptor(t.oneofDecl[n]));
    if (t.field)
      for (n = 0; n < t.field.length; ++n) {
        var fromDescriptor = Field.fromDescriptor(t.field[n], r, !0);
        if ((s.add(fromDescriptor), t.field[n].hasOwnProperty("oneofIndex")))
          s.oneofsArray[t.field[n].oneofIndex].add(fromDescriptor);
      }
    if (t.extension)
      for (n = 0; n < t.extension.length; ++n) s.add(Field.fromDescriptor(t.extension[n], r, !0));
    if (t.nestedType) {
      for (n = 0; n < t.nestedType.length; ++n)
        if (
          (s.add(Type.fromDescriptor(t.nestedType[n], r, !0)),
          t.nestedType[n].options && t.nestedType[n].options.mapEntry)
        )
          s.setOption("map_entry", !0);
    }
    if (t.enumType) for (n = 0; n < t.enumType.length; ++n) s.add(Enum.fromDescriptor(t.enumType[n], r, !0));
    if (t.extensionRange && t.extensionRange.length) {
      s.extensions = [];
      for (n = 0; n < t.extensionRange.length; ++n)
        s.extensions.push([t.extensionRange[n].start, t.extensionRange[n].end]);
    }
    if ((t.reservedRange && t.reservedRange.length) || (t.reservedName && t.reservedName.length)) {
      if (((s.reserved = []), t.reservedRange))
        for (n = 0; n < t.reservedRange.length; ++n)
          s.reserved.push([t.reservedRange[n].start, t.reservedRange[n].end]);
      if (t.reservedName) for (n = 0; n < t.reservedName.length; ++n) s.reserved.push(t.reservedName[n]);
    }
    return s;
  };
  Type.prototype.toDescriptor = function (t) {
    var create = I.DescriptorProto.create({ name: this.name }),
      i;
    for (i = 0; i < this.fieldsArray.length; ++i) {
      var s;
      if (
        (create.field.push((s = this._fieldsArray[i].toDescriptor(t))),
        this._fieldsArray[i] instanceof MapField)
      ) {
        var n = lo(this._fieldsArray[i].keyType, this._fieldsArray[i].resolvedKeyType, !1),
          a = lo(this._fieldsArray[i].type, this._fieldsArray[i].resolvedType, !1),
          o =
            a === 11 || a === 14
              ? (this._fieldsArray[i].resolvedType && lh(this.parent, this._fieldsArray[i].resolvedType)) ||
                this._fieldsArray[i].type
              : void 0;
        create.nestedType.push(
          I.DescriptorProto.create({
            name: s.typeName,
            field: [
              I.FieldDescriptorProto.create({ name: "key", number: 1, label: 1, type: n }),
              I.FieldDescriptorProto.create({ name: "value", number: 2, label: 1, type: a, typeName: o }),
            ],
            options: I.MessageOptions.create({ mapEntry: !0 }),
          }),
        );
      }
    }
    for (i = 0; i < this.oneofsArray.length; ++i) create.oneofDecl.push(this._oneofsArray[i].toDescriptor());
    for (i = 0; i < this.nestedArray.length; ++i)
      if (this._nestedArray[i] instanceof Field) create.field.push(this._nestedArray[i].toDescriptor(t));
      else if (this._nestedArray[i] instanceof Type)
        create.nestedType.push(this._nestedArray[i].toDescriptor(t));
      else if (this._nestedArray[i] instanceof Enum)
        create.enumType.push(this._nestedArray[i].toDescriptor());
    if (this.extensions)
      for (i = 0; i < this.extensions.length; ++i)
        create.extensionRange.push(
          I.DescriptorProto.ExtensionRange.create({
            start: this.extensions[i][0],
            end: this.extensions[i][1],
          }),
        );
    if (this.reserved)
      for (i = 0; i < this.reserved.length; ++i)
        if (typeof this.reserved[i] === "string") create.reservedName.push(this.reserved[i]);
        else
          create.reservedRange.push(
            I.DescriptorProto.ReservedRange.create({ start: this.reserved[i][0], end: this.reserved[i][1] }),
          );
    return ((create.options = Gr(this.options, I.MessageOptions)), create);
  };
  Field.fromDescriptor = function (t, r, i) {
    if (typeof t.length === "number") t = I.DescriptorProto.decode(t);
    if (typeof t.number !== "number") throw Error("missing field id");
    var typeName = t.typeName,
      n;
    if (typeName != null && typeName !== "") {
      if (typeof typeName !== "string" || !typeRefRe.test(typeName))
        throw Error("illegal type name: " + typeName);
      n = typeName;
    } else n = ST(t.type);
    var a;
    switch (t.label) {
      case 1:
        a = void 0;
        break;
      case 2:
        a = "required";
        break;
      case 3:
        a = "repeated";
        break;
      default:
        throw Error("illegal label: " + t.label);
    }
    var extendee = t.extendee;
    if (extendee != null && extendee !== "") {
      if (typeof extendee !== "string" || !typeRefRe.test(extendee))
        throw Error("illegal type name: " + extendee);
    } else extendee = void 0;
    var l = new Field(t.name.length ? t.name : "field" + t.number, t.number, n, a, extendee);
    if (!i) l._edition = r;
    if (((l.options = jr(t.options, I.FieldOptions)), t.proto3_optional)) l.options.proto3_optional = !0;
    if (t.defaultValue && t.defaultValue.length) {
      var defaultValue = t.defaultValue;
      switch (defaultValue) {
        case "true":
        case "TRUE":
          defaultValue = !0;
          break;
        case "false":
        case "FALSE":
          defaultValue = !1;
          break;
        default:
          var match = numberRe.exec(defaultValue);
          if (match) defaultValue = parseInt(defaultValue);
          break;
      }
      l.setOption("default", defaultValue);
    }
    if (CT(t.type)) {
      if (r === "proto3") {
        if (t.options && !t.options.packed) l.setOption("packed", !1);
      } else if ((!r || r === "proto2") && t.options && t.options.packed) l.setOption("packed", !0);
    }
    return l;
  };
  Field.prototype.toDescriptor = function (t) {
    var create = I.FieldDescriptorProto.create({ name: this.name, number: this.id });
    if (this.map) ((create.type = 11), (create.typeName = Ne.util.ucFirst(this.name)), (create.label = 3));
    else {
      switch ((create.type = lo(this.type, this.resolve().resolvedType, this.delimited))) {
        case 10:
        case 11:
        case 14:
          create.typeName = this.resolvedType ? lh(this.parent, this.resolvedType) : this.type;
          break;
      }
      if (this.rule === "repeated") create.label = 3;
      else if (this.required && t === "proto2") create.label = 2;
      else create.label = 1;
    }
    if (
      ((create.extendee = this.extensionField ? this.extensionField.parent.fullName : this.extend),
      this.partOf && this.parent instanceof Type)
    ) {
      if ((create.oneofIndex = this.parent.oneofsArray.indexOf(this.partOf)) < 0)
        throw Error("missing oneof");
    }
    if (this.options) {
      if (((create.options = Gr(this.options, I.FieldOptions)), this.options.default != null))
        create.defaultValue = String(this.options.default);
      if (this.options.proto3_optional) create.proto3_optional = !0;
    }
    if (t === "proto3") {
      if (!this.packed) (create.options || (create.options = I.FieldOptions.create())).packed = !1;
    } else if ((!t || t === "proto2") && this.packed)
      (create.options || (create.options = I.FieldOptions.create())).packed = !0;
    return create;
  };
  var mT = 0;
  Enum.fromDescriptor = function (t, r, i) {
    if (typeof t.length === "number") t = I.EnumDescriptorProto.decode(t);
    var s = {};
    if (t.value)
      for (var n = 0; n < t.value.length; ++n) {
        var a = t.value[n].name,
          o = t.value[n].number || 0;
        s[a && a.length ? a : "NAME" + o] = o;
      }
    var l = new Enum(t.name && t.name.length ? t.name : "Enum" + mT++, s, jr(t.options, I.EnumOptions));
    if (!i) l._edition = r;
    return l;
  };
  Enum.prototype.toDescriptor = function () {
    var t = [];
    for (var r = 0, keys = Object.keys(this.values); r < keys.length; ++r)
      t.push(I.EnumValueDescriptorProto.create({ name: keys[r], number: this.values[keys[r]] }));
    return I.EnumDescriptorProto.create({
      name: this.name,
      value: t,
      options: Gr(this.options, I.EnumOptions),
    });
  };
  var vT = 0;
  OneOf.fromDescriptor = function (t) {
    if (typeof t.length === "number") t = I.OneofDescriptorProto.decode(t);
    return new OneOf(t.name && t.name.length ? t.name : "oneof" + vT++);
  };
  OneOf.prototype.toDescriptor = function () {
    return I.OneofDescriptorProto.create({ name: this.name });
  };
  var yT = 0;
  Service.fromDescriptor = function (t, r, i) {
    if (typeof t.length === "number") t = I.ServiceDescriptorProto.decode(t);
    var s = new Service(t.name && t.name.length ? t.name : "Service" + yT++, jr(t.options, I.ServiceOptions));
    if (!i) s._edition = r;
    if (t.method) for (var n = 0; n < t.method.length; ++n) s.add(Method.fromDescriptor(t.method[n]));
    return s;
  };
  Service.prototype.toDescriptor = function () {
    var t = [];
    for (var r = 0; r < this.methodsArray.length; ++r) t.push(this._methodsArray[r].toDescriptor());
    return I.ServiceDescriptorProto.create({
      name: this.name,
      method: t,
      options: Gr(this.options, I.ServiceOptions),
    });
  };
  var _T = 0;
  Method.fromDescriptor = function (t) {
    if (typeof t.length === "number") t = I.MethodDescriptorProto.decode(t);
    var inputType = t.inputType,
      outputType = t.outputType;
    if (inputType != null && inputType !== "") {
      if (typeof inputType !== "string" || !typeRefRe.test(inputType))
        throw Error("illegal type name: " + inputType);
    }
    if (outputType != null && outputType !== "") {
      if (typeof outputType !== "string" || !typeRefRe.test(outputType))
        throw Error("illegal type name: " + outputType);
    }
    return new Method(
      t.name && t.name.length ? t.name : "Method" + _T++,
      "rpc",
      inputType,
      outputType,
      Boolean(t.clientStreaming),
      Boolean(t.serverStreaming),
      jr(t.options, I.MethodOptions),
    );
  };
  Method.prototype.toDescriptor = function () {
    return I.MethodDescriptorProto.create({
      name: this.name,
      inputType: this.resolvedRequestType ? this.resolvedRequestType.fullName : this.requestType,
      outputType: this.resolvedResponseType ? this.resolvedResponseType.fullName : this.responseType,
      clientStreaming: this.requestStream,
      serverStreaming: this.responseStream,
      options: Gr(this.options, I.MethodOptions),
    });
  };
  function ST(e) {
    switch (e) {
      case 1:
        return "double";
      case 2:
        return "float";
      case 3:
        return "int64";
      case 4:
        return "uint64";
      case 5:
        return "int32";
      case 6:
        return "fixed64";
      case 7:
        return "fixed32";
      case 8:
        return "bool";
      case 9:
        return "string";
      case 12:
        return "bytes";
      case 13:
        return "uint32";
      case 15:
        return "sfixed32";
      case 16:
        return "sfixed64";
      case 17:
        return "sint32";
      case 18:
        return "sint64";
    }
    throw Error("illegal type: " + e);
  }
  function CT(e) {
    switch (e) {
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
      case 7:
      case 8:
      case 13:
      case 14:
      case 15:
      case 16:
      case 17:
      case 18:
        return !0;
    }
    return !1;
  }
  function lo(e, t, r) {
    switch (e) {
      case "double":
        return 1;
      case "float":
        return 2;
      case "int64":
        return 3;
      case "uint64":
        return 4;
      case "int32":
        return 5;
      case "fixed64":
        return 6;
      case "fixed32":
        return 7;
      case "bool":
        return 8;
      case "string":
        return 9;
      case "bytes":
        return 12;
      case "uint32":
        return 13;
      case "sfixed32":
        return 15;
      case "sfixed64":
        return 16;
      case "sint32":
        return 17;
      case "sint64":
        return 18;
    }
    if (t instanceof Enum) return 14;
    if (t instanceof Type) return r ? 10 : 11;
    throw Error("illegal type: " + e);
  }
  function ah(e, t) {
    var r = {};
    for (var i = 0, s, n; i < t.fieldsArray.length; ++i) {
      if ((n = (s = t._fieldsArray[i]).name) === "uninterpretedOption") continue;
      if (!Object.prototype.hasOwnProperty.call(e, n)) continue;
      var a = ET(n);
      if (s.resolvedType instanceof Type) r[a] = ah(e[n], s.resolvedType);
      else if (s.resolvedType instanceof Enum) r[a] = s.resolvedType.valuesById[e[n]];
      else r[a] = e[n];
    }
    return r;
  }
  function jr(e, t) {
    if (!e) return;
    return ah(t.toObject(e), t);
  }
  function oh(e, t) {
    var r = {},
      keys = Object.keys(e);
    for (var s = 0; s < keys.length; ++s) {
      var n = keys[s],
        camelCase = Ne.util.camelCase(n);
      if (!Object.prototype.hasOwnProperty.call(t.fields, camelCase)) continue;
      var o = t.fields[camelCase];
      if (o.resolvedType instanceof Type) r[camelCase] = oh(e[n], o.resolvedType);
      else r[camelCase] = e[n];
      if (o.repeated && !Array.isArray(r[camelCase])) r[camelCase] = [r[camelCase]];
    }
    return r;
  }
  function Gr(e, t) {
    if (!e) return;
    return t.fromObject(oh(e, t));
  }
  function lh(e, t) {
    var parts = e.fullName.split("."),
      parts_2 = t.fullName.split("."),
      s = 0,
      n = 0,
      a = parts_2.length - 1;
    if (!(e instanceof Root) && t instanceof Namespace)
      while (s < parts.length && n < a && parts[s] === parts_2[n]) {
        var lookup = t.lookup(parts[s++], !0);
        if (lookup !== null && lookup !== t) break;
        ++n;
      }
    else for (; s < parts.length && n < a && parts[s] === parts_2[n]; ++s, ++n);
    return parts_2.slice(n).join(".");
  }
  function ET(e) {
    return (
      e.substring(0, 1) +
      e.substring(1).replace(/([A-Z])(?=[a-z]|$)/g, function (t, r) {
        return "_" + r.toLowerCase();
      })
    );
  }
  function TT(e) {
    if (e.syntax === "editions")
      switch (e.edition) {
        case I.Edition.EDITION_2023:
          return "2023";
        default:
          throw Error("Unsupported edition " + e.edition);
      }
    if (e.syntax === "proto3") return "proto3";
    return "proto2";
  }
  function RT(e, t) {
    if (!e) return;
    if (e === "proto2" || e === "proto3") t.syntax = e;
    else
      switch (((t.syntax = "editions"), e)) {
        case "2023":
          t.edition = I.Edition.EDITION_2023;
          break;
        default:
          throw Error("Unsupported edition " + e);
      }
  }
});

export { uh };

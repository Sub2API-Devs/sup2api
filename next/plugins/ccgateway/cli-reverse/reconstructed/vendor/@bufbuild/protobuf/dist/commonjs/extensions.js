/**
 * @bufbuild/protobuf/dist/commonjs/extensions.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-require-graph 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_create } from "../cjs/create.js";
import { require_from_binary } from "./from-binary.js";
import { require_reflect } from "../cjs/reflect/reflect.js";
import { require_scalar } from "./reflect/scalar.js";
import { require_to_binary } from "../cjs/to-binary.js";
import { require_binary_encoding } from "./wire/binary-encoding.js";
import { require_wrappers } from "../cjs/wkt/wrappers.js";

//@ chunk-qg41pqt6.js:441869-443819 cjs-require-graph
var require_extensions = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getExtension = getExtension;
  cjsExports.setExtension = setExtension;
  cjsExports.clearExtension = clearExtension;
  cjsExports.hasExtension = hasExtension;
  cjsExports.hasOption = hasOption;
  cjsExports.getOption = getOption;
  cjsExports.createExtensionContainer = createExtensionContainer;
  var create_js_1 = require_create();
  var from_binary_js_1 = require_from_binary();
  var reflect_js_1 = require_reflect();
  var scalar_js_1 = require_scalar();
  var to_binary_js_1 = require_to_binary();
  var binary_encoding_js_1 = require_binary_encoding();
  var wrappers_js_1 = require_wrappers();
  function getExtension(message, extension) {
    assertExtendee(extension, message);
    let ufs = filterUnknownFields(message.$unknown, extension);
    let [container, field, get] = createExtensionContainer(extension);
    for (let uf of ufs)
      from_binary_js_1.readField(
        container,
        new binary_encoding_js_1.BinaryReader(uf.data),
        field,
        uf.wireType,
        {
          readUnknownFields: true,
        },
      );
    return get();
  }
  function setExtension(message, extension, value) {
    var _a;
    assertExtendee(extension, message);
    let ufs = ((_a = message.$unknown) !== null && _a !== undefined ? _a : []).filter(
      (uf) => uf.no !== extension.number,
    );
    let [container, field] = createExtensionContainer(extension, value);
    let writer = new binary_encoding_js_1.BinaryWriter();
    to_binary_js_1.writeField(
      writer,
      {
        writeUnknownFields: true,
      },
      container,
      field,
    );
    let reader = new binary_encoding_js_1.BinaryReader(writer.finish());
    while (reader.pos < reader.len) {
      let [no, wireType] = reader.tag();
      let data = reader.skip(wireType, no);
      ufs.push({
        no,
        wireType,
        data,
      });
    }
    message.$unknown = ufs;
  }
  function clearExtension(message, extension) {
    assertExtendee(extension, message);
    if (message.$unknown === undefined) return;
    message.$unknown = message.$unknown.filter((uf) => uf.no !== extension.number);
  }
  function hasExtension(message, extension) {
    var _a;
    return (
      extension.extendee.typeName === message.$typeName &&
      !!((_a = message.$unknown) === null || _a === undefined
        ? undefined
        : _a.find((uf) => uf.no === extension.number))
    );
  }
  function hasOption(element, option) {
    let message = element.proto.options;
    if (!message) return false;
    return hasExtension(message, option);
  }
  function getOption(element, option) {
    let message = element.proto.options;
    if (!message) {
      let [, , get] = createExtensionContainer(option);
      return get();
    }
    return getExtension(message, option);
  }
  function filterUnknownFields(unknownFields, extension) {
    if (unknownFields === undefined) return [];
    if (extension.fieldKind === "enum" || extension.fieldKind === "scalar") {
      for (let i = unknownFields.length - 1; i >= 0; --i)
        if (unknownFields[i].no == extension.number) return [unknownFields[i]];
      return [];
    }
    return unknownFields.filter((uf) => uf.no === extension.number);
  }
  function createExtensionContainer(extension, value) {
    let localName = extension.typeName;
    let field = Object.assign(Object.assign({}, extension), {
      kind: "field",
      parent: extension.extendee,
      localName,
    });
    let desc = Object.assign(Object.assign({}, extension.extendee), {
      fields: [field],
      members: [field],
      oneofs: [],
    });
    let container = create_js_1.create(
      desc,
      value !== undefined
        ? {
            [localName]: value,
          }
        : undefined,
    );
    return [
      reflect_js_1.reflect(desc, container),
      field,
      () => {
        let value = container[localName];
        if (value === undefined) {
          let desc = extension.message;
          if (wrappers_js_1.isWrapperDesc(desc))
            return scalar_js_1.scalarZeroValue(desc.fields[0].scalar, desc.fields[0].longAsString);
          return create_js_1.create(desc);
        }
        return value;
      },
    ];
  }
  function assertExtendee(extension, message) {
    if (extension.extendee.typeName != message.$typeName)
      throw Error(
        `extension ${extension.typeName} can only be applied to message ${extension.extendee.typeName}`,
      );
  }
});
export { require_extensions };

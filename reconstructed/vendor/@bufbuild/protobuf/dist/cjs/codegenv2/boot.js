/**
 * @bufbuild/protobuf/dist/cjs/codegenv2/boot.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @bufbuild/protobuf@2.12.1
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../../../runtime/bun-runtime.js";
import { require_restore_json_names } from "./restore-json-names.js";
import { require_registry } from "../registry.js";

//@ chunk-fq0cr76a.js:375937-378224 cjs-require-graph
var require_boot = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.boot = boot;
  cjsExports.bootFileDescriptorProto = bootFileDescriptorProto;
  var restore_json_names_js_1 = require_restore_json_names();
  var registry_js_1 = require_registry();
  function boot(boot) {
    let root = bootFileDescriptorProto(boot);
    root.messageType.forEach(restore_json_names_js_1.restoreJsonNames);
    return registry_js_1
      .createFileRegistry(root, () => {
        return;
      })
      .getFile(root.name);
  }
  function bootFileDescriptorProto(init) {
    let proto = Object.create({
      syntax: "",
      edition: 0,
    });
    return Object.assign(
      proto,
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
          init,
        ),
        {
          messageType: init.messageType.map(bootDescriptorProto),
          enumType: init.enumType.map(bootEnumDescriptorProto),
        },
      ),
    );
  }
  function bootDescriptorProto(init) {
    var _a;
    var _b;
    var _c;
    var _d;
    var _e;
    var _f;
    var _g;
    var _h;
    let proto = Object.create({
      visibility: 0,
    });
    return Object.assign(proto, {
      $typeName: "google.protobuf.DescriptorProto",
      name: init.name,
      field:
        (_b =
          (_a = init.field) === null || _a === undefined ? undefined : _a.map(bootFieldDescriptorProto)) !==
          null && _b !== undefined
          ? _b
          : [],
      extension: [],
      nestedType:
        (_d =
          (_c = init.nestedType) === null || _c === undefined ? undefined : _c.map(bootDescriptorProto)) !==
          null && _d !== undefined
          ? _d
          : [],
      enumType:
        (_f =
          (_e = init.enumType) === null || _e === undefined ? undefined : _e.map(bootEnumDescriptorProto)) !==
          null && _f !== undefined
          ? _f
          : [],
      extensionRange:
        (_h =
          (_g = init.extensionRange) === null || _g === undefined
            ? undefined
            : _g.map((e) =>
                Object.assign(
                  {
                    $typeName: "google.protobuf.DescriptorProto.ExtensionRange",
                  },
                  e,
                ),
              )) !== null && _h !== undefined
          ? _h
          : [],
      oneofDecl: [],
      reservedRange: [],
      reservedName: [],
    });
  }
  function bootFieldDescriptorProto(init) {
    let proto = Object.create({
      label: 1,
      typeName: "",
      extendee: "",
      defaultValue: "",
      oneofIndex: 0,
      jsonName: "",
      proto3Optional: false,
    });
    return Object.assign(
      proto,
      Object.assign(
        Object.assign(
          {
            $typeName: "google.protobuf.FieldDescriptorProto",
          },
          init,
        ),
        {
          options: init.options ? bootFieldOptions(init.options) : undefined,
        },
      ),
    );
  }
  function bootFieldOptions(init) {
    var _a;
    var _b;
    var _c;
    let proto = Object.create({
      ctype: 0,
      packed: false,
      jstype: 0,
      lazy: false,
      unverifiedLazy: false,
      deprecated: false,
      weak: false,
      debugRedact: false,
      retention: 0,
    });
    return Object.assign(
      proto,
      Object.assign(
        Object.assign(
          {
            $typeName: "google.protobuf.FieldOptions",
          },
          init,
        ),
        {
          targets: (_a = init.targets) !== null && _a !== undefined ? _a : [],
          editionDefaults:
            (_c =
              (_b = init.editionDefaults) === null || _b === undefined
                ? undefined
                : _b.map((e) =>
                    Object.assign(
                      {
                        $typeName: "google.protobuf.FieldOptions.EditionDefault",
                      },
                      e,
                    ),
                  )) !== null && _c !== undefined
              ? _c
              : [],
          uninterpretedOption: [],
        },
      ),
    );
  }
  function bootEnumDescriptorProto(init) {
    let proto = Object.create({
      visibility: 0,
    });
    return Object.assign(proto, {
      $typeName: "google.protobuf.EnumDescriptorProto",
      name: init.name,
      reservedName: [],
      reservedRange: [],
      value: init.value.map((e) =>
        Object.assign(
          {
            $typeName: "google.protobuf.EnumValueDescriptorProto",
          },
          e,
        ),
      ),
    });
  }
});
export { require_boot };

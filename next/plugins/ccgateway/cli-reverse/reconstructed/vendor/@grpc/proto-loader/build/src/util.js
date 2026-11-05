/**
 * @grpc/proto-loader/build/src/util.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/proto-loader@0.8.0..0.8.1
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../../../../runtime/bun-runtime.js";
import { require_protobufjs } from "../../../../protobufjs/src/index.js";
import { require_api } from "../../../../protobufjs/google/protobuf/api.json.js";
import { require_descriptor } from "../../../../protobufjs/google/protobuf/descriptor.json.js";
import { require_source_context } from "../../../../protobufjs/google/protobuf/source_context.json.js";
import { require_type_2 } from "../../../../protobufjs/google/protobuf/type.json.js";

//@ chunk-3k21nfa0.js:171114-172408 cjs-fingerprint
var require_util = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.addCommonProtos =
    cjsExports.loadProtosWithOptionsSync =
    cjsExports.loadProtosWithOptions =
      undefined;
  var fs = importMetaRequire("fs");
  var path = importMetaRequire("path");
  var Protobuf = require_protobufjs();
  function addIncludePathResolver(root, includePaths) {
    let originalResolvePath = root.resolvePath;
    root.resolvePath = (origin, target) => {
      if (path.isAbsolute(target)) return target;
      for (let directory of includePaths) {
        let fullPath = path.join(directory, target);
        try {
          fs.accessSync(fullPath, fs.constants.R_OK);
          return fullPath;
        } catch (error) {
          continue;
        }
      }
      process.emitWarning(`${target} not found in any of the include paths ${includePaths}`);
      return originalResolvePath(origin, target);
    };
  }
  async function loadProtosWithOptions(filename, options) {
    let root = new Protobuf.Root();
    options = options || {};
    if (options.includeDirs) {
      if (!Array.isArray(options.includeDirs))
        return Promise.reject(Error("The includeDirs option must be an array"));
      addIncludePathResolver(root, options.includeDirs);
    }
    let loadedRoot = await root.load(filename, options);
    loadedRoot.resolveAll();
    return loadedRoot;
  }
  cjsExports.loadProtosWithOptions = loadProtosWithOptions;
  function loadProtosWithOptionsSync(filename, options) {
    let root = new Protobuf.Root();
    options = options || {};
    if (options.includeDirs) {
      if (!Array.isArray(options.includeDirs)) throw Error("The includeDirs option must be an array");
      addIncludePathResolver(root, options.includeDirs);
    }
    let loadedRoot = root.loadSync(filename, options);
    loadedRoot.resolveAll();
    return loadedRoot;
  }
  cjsExports.loadProtosWithOptionsSync = loadProtosWithOptionsSync;
  function addCommonProtos() {
    let apiDescriptor = require_api();
    let descriptorDescriptor = require_descriptor();
    let sourceContextDescriptor = require_source_context();
    let typeDescriptor = require_type_2();
    Protobuf.common("api", apiDescriptor.nested.google.nested.protobuf.nested);
    Protobuf.common("descriptor", descriptorDescriptor.nested.google.nested.protobuf.nested);
    Protobuf.common("source_context", sourceContextDescriptor.nested.google.nested.protobuf.nested);
    Protobuf.common("type", typeDescriptor.nested.google.nested.protobuf.nested);
  }
  cjsExports.addCommonProtos = addCommonProtos;
});
export { require_util };

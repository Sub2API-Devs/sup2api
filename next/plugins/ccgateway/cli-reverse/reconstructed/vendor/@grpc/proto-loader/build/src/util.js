/**
 * @grpc/proto-loader/build/src/util.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/proto-loader@0.8.0..0.8.1
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x, importMetaRequire as Be } from "../../../../../runtime/bun-runtime.js";
import { qs } from "../../../../protobufjs/src/index.js";
import { dh } from "../../../../protobufjs/google/protobuf/api.json.js";
import { oo } from "../../../../protobufjs/google/protobuf/descriptor.json.js";
import { hh } from "../../../../protobufjs/google/protobuf/source_context.json.js";
import { fh } from "../../../../protobufjs/google/protobuf/type.json.js";

//@ chunk-pwh5dx3n.js:171114-172408 cjs-fingerprint
var vh = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.addCommonProtos =
    cjsExports.loadProtosWithOptionsSync =
    cjsExports.loadProtosWithOptions =
      undefined;
  var fs = Be("fs");
  var path = Be("path");
  var Protobuf = qs();
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
    let apiDescriptor = dh();
    let descriptorDescriptor = oo();
    let sourceContextDescriptor = hh();
    let typeDescriptor = fh();
    Protobuf.common("api", apiDescriptor.nested.google.nested.protobuf.nested);
    Protobuf.common("descriptor", descriptorDescriptor.nested.google.nested.protobuf.nested);
    Protobuf.common("source_context", sourceContextDescriptor.nested.google.nested.protobuf.nested);
    Protobuf.common("type", typeDescriptor.nested.google.nested.protobuf.nested);
  }
  cjsExports.addCommonProtos = addCommonProtos;
});
export { vh };

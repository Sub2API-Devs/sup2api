/**
 * @aws-crypto/crc32/build/module/aws_crc32.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @aws-crypto/crc32@5.2.0
 * pieces: chunk-3cddmtk7.js (2)
 * attribution: esm-layout 1, esm-fingerprint 1
 */
import { __toESM } from "../../../../../runtime/bun-runtime.js";
import { require_middleware_host_header } from "../../../../@aws-sdk/middleware-host-header/dist-cjs/index.js";
import { require_middleware_logger } from "../../../../@aws-sdk/middleware-logger/dist-cjs/index.js";
import { require_middleware_recursion_detection } from "../../../../@aws-sdk/middleware-recursion-detection/dist-cjs/index.js";
import { require_middleware_user_agent } from "../../../../@aws-sdk/middleware-user-agent/dist-cjs/index.js";
import { Crc32 } from "./index.js";
import { isEmptyString, numToUint8 } from "../../../util/build/module/numToUint8.js";
import { convertToBuffer } from "../../../util/build/convertToBuffer.js";
import { __awaiter, __generator } from "../../../../tslib/tslib.es6.mjs";

//@ chunk-3cddmtk7.js:1049-1103 esm-layout
var import_middleware_host_header = __toESM(require_middleware_host_header());
var import_middleware_logger = __toESM(require_middleware_logger());
var import_middleware_recursion_detection = __toESM(require_middleware_recursion_detection());
var import_middleware_user_agent = __toESM(require_middleware_user_agent());
//@ chunk-3cddmtk7.js:1103-1424 esm-fingerprint
var AwsCrc32 = (function () {
  function AwsCrc32() {
    this.crc32 = new Crc32();
  }
  AwsCrc32.prototype.update = function (toHash) {
    if (isEmptyString(toHash)) return;
    this.crc32.update(convertToBuffer(toHash));
  };
  AwsCrc32.prototype.digest = function () {
    return __awaiter(this, undefined, undefined, function () {
      return __generator(this, function (_a) {
        return [2, numToUint8(this.crc32.digest())];
      });
    });
  };
  AwsCrc32.prototype.reset = function () {
    this.crc32 = new Crc32();
  };
  return AwsCrc32;
})();
export {
  import_middleware_user_agent,
  import_middleware_host_header,
  import_middleware_logger,
  import_middleware_recursion_detection,
};

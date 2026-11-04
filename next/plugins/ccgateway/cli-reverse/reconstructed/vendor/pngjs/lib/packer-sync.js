/**
 * pngjs/lib/packer-sync.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { require_constants } from "./constants.js";
import { require_packer } from "./packer.js";

//@ chunk-spjgqa4y.js:47377-47987 cjs-fingerprint
var require_packer_sync = __commonJS(function (cjsExports, cjsModule) {
  var hasSyncZlib = true;
  var zlib = importMetaRequire("zlib");
  if (!zlib.deflateSync) hasSyncZlib = false;
  var constants = require_constants();
  var packerModule = require_packer();
  cjsModule.exports = function (metaData, opt) {
    if (!hasSyncZlib)
      throw Error(
        "To use the sync capability of this library in old node versions, please pin pngjs to v2.3.0",
      );
    let packer = new packerModule(opt || {});
    let chunks = [];
    chunks.push(Buffer.from(constants.PNG_SIGNATURE));
    chunks.push(packer.packIHDR(metaData.width, metaData.height));
    if (metaData.gamma) chunks.push(packer.packGAMA(metaData.gamma));
    let filteredData = packer.filterData(metaData.data, metaData.width, metaData.height);
    let compressedData = zlib.deflateSync(filteredData, packer.getDeflateOptions());
    filteredData = null;
    if (!compressedData || !compressedData.length) throw Error("bad png - invalid compressed data response");
    chunks.push(packer.packIDAT(compressedData));
    chunks.push(packer.packIEND());
    return Buffer.concat(chunks);
  };
});
export { require_packer_sync };

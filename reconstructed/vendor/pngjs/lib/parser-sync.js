/**
 * pngjs/lib/parser-sync.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: pngjs@5.0.0
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { require_sync_inflate } from "./sync-inflate.js";
import { require_sync_reader } from "./sync-reader.js";
import { require_filter_parse_sync } from "./filter-parse-sync.js";
import { require_parser } from "./parser.js";
import { require_bitmapper } from "./bitmapper.js";
import { require_format_normaliser } from "./format-normaliser.js";

//@ chunk-spjgqa4y.js:46406-47377 cjs-fingerprint
var require_parser_sync = x(function (cjsExports, cjsModule) {
  var hasSyncZlib = true;
  var zlib = importMetaRequire("zlib");
  var inflateSync = require_sync_inflate();
  if (!zlib.deflateSync) hasSyncZlib = false;
  var SyncReader = require_sync_reader();
  var FilterSync = require_filter_parse_sync();
  var Parser = require_parser();
  var bitmapper = require_bitmapper();
  var formatNormaliser = require_format_normaliser();
  cjsModule.exports = function (buffer, options) {
    if (!hasSyncZlib)
      throw Error(
        "To use the sync capability of this library in old node versions, please pin pngjs to v2.3.0",
      );
    let err;
    function handleError(_err_) {
      err = _err_;
    }
    let metaData;
    function handleMetaData(_metaData_) {
      metaData = _metaData_;
    }
    function handleTransColor(transColor) {
      metaData.transColor = transColor;
    }
    function handlePalette(palette) {
      metaData.palette = palette;
    }
    function u() {
      metaData.alpha = true;
    }
    let gamma;
    function handleGamma(_gamma_) {
      gamma = _gamma_;
    }
    let inflateDataList = [];
    function handleInflateData(inflatedData) {
      inflateDataList.push(inflatedData);
    }
    let reader = new SyncReader(buffer);
    new Parser(options, {
      read: reader.read.bind(reader),
      error: handleError,
      metadata: handleMetaData,
      gamma: handleGamma,
      palette: handlePalette,
      transColor: handleTransColor,
      inflateData: handleInflateData,
      simpleTransparency: u,
    }).start();
    reader.process();
    if (err) throw err;
    let inflateData = Buffer.concat(inflateDataList);
    inflateDataList.length = 0;
    let inflatedData;
    if (metaData.interlace) inflatedData = zlib.inflateSync(inflateData);
    else {
      let imageSize = (((metaData.width * metaData.bpp * metaData.depth + 7) >> 3) + 1) * metaData.height;
      inflatedData = inflateSync(inflateData, {
        chunkSize: imageSize,
        maxLength: imageSize,
      });
    }
    inflateData = null;
    if (!inflatedData || !inflatedData.length) throw Error("bad png - invalid inflate data response");
    let unfilteredData = FilterSync.process(inflatedData, metaData);
    inflateData = null;
    let bitmapData = bitmapper.dataToBitMap(unfilteredData, metaData);
    unfilteredData = null;
    let normalisedBitmapData = formatNormaliser(bitmapData, metaData);
    metaData.data = normalisedBitmapData;
    metaData.gamma = gamma || 0;
    return metaData;
  };
});
export { require_parser_sync };

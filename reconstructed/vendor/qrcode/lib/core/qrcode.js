/**
 * qrcode/lib/core/qrcode.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_utils } from "./utils.js";
import { require_error_correction_level } from "./error-correction-level.js";
import { require_bit_buffer } from "./bit-buffer.js";
import { require_bit_matrix } from "./bit-matrix.js";
import { require_alignment_pattern } from "./alignment-pattern.js";
import { require_finder_pattern } from "./finder-pattern.js";
import { require_mask_pattern } from "./mask-pattern.js";
import { require_error_correction_code } from "./error-correction-code.js";
import { require_reed_solomon_encoder } from "./reed-solomon-encoder.js";
import { require_version } from "./version.js";
import { require_format_info } from "./format-info.js";
import { require_mode } from "./mode.js";
import { require_segments } from "./segments.js";

//@ chunk-spjgqa4y.js:17575-20975 cjs-fingerprint
var require_qrcode = x(function (cjsExports) {
  var Utils = require_utils();
  var ECLevel = require_error_correction_level();
  var BitBuffer = require_bit_buffer();
  var BitMatrix = require_bit_matrix();
  var AlignmentPattern = require_alignment_pattern();
  var FinderPattern = require_finder_pattern();
  var MaskPattern = require_mask_pattern();
  var ECCode = require_error_correction_code();
  var ReedSolomonEncoder = require_reed_solomon_encoder();
  var Version = require_version();
  var FormatInfo = require_format_info();
  var Mode = require_mode();
  var Segments = require_segments();
  function setupFinderPattern(matrix, version) {
    let size = matrix.size;
    let pos = FinderPattern.getPositions(version);
    for (let i = 0; i < pos.length; i++) {
      let row = pos[i][0];
      let col = pos[i][1];
      for (let r = -1; r <= 7; r++) {
        if (row + r <= -1 || size <= row + r) continue;
        for (let c = -1; c <= 7; c++) {
          if (col + c <= -1 || size <= col + c) continue;
          if (
            (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
            (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          )
            matrix.set(row + r, col + c, true, true);
          else matrix.set(row + r, col + c, false, true);
        }
      }
    }
  }
  function setupTimingPattern(matrix) {
    let size = matrix.size;
    for (let i = 8; i < size - 8; i++) {
      let value = i % 2 === 0;
      matrix.set(i, 6, value, true);
      matrix.set(6, i, value, true);
    }
  }
  function setupAlignmentPattern(matrix, version) {
    let pos = AlignmentPattern.getPositions(version);
    for (let i_2 = 0; i_2 < pos.length; i_2++) {
      let row = pos[i_2][0];
      let col = pos[i_2][1];
      for (let r = -2; r <= 2; r++)
        for (let c = -2; c <= 2; c++)
          if (r === -2 || r === 2 || c === -2 || c === 2 || (r === 0 && c === 0))
            matrix.set(row + r, col + c, true, true);
          else matrix.set(row + r, col + c, false, true);
    }
  }
  function setupVersionInfo(matrix, version) {
    let size = matrix.size;
    let bits = Version.getEncodedBits(version);
    let row;
    let col;
    let mod;
    for (let i = 0; i < 18; i++) {
      row = Math.floor(i / 3);
      col = (i % 3) + size - 8 - 3;
      mod = ((bits >> i) & 1) === 1;
      matrix.set(row, col, mod, true);
      matrix.set(col, row, mod, true);
    }
  }
  function setupFormatInfo(matrix, errorCorrectionLevel, maskPattern) {
    let size = matrix.size;
    let bits = FormatInfo.getEncodedBits(errorCorrectionLevel, maskPattern);
    let i;
    let mod;
    for (i = 0; i < 15; i++) {
      mod = ((bits >> i) & 1) === 1;
      if (i < 6) matrix.set(i, 8, mod, true);
      else if (i < 8) matrix.set(i + 1, 8, mod, true);
      else matrix.set(size - 15 + i, 8, mod, true);
      if (i < 8) matrix.set(8, size - i - 1, mod, true);
      else if (i < 9) matrix.set(8, 15 - i - 1 + 1, mod, true);
      else matrix.set(8, 15 - i - 1, mod, true);
    }
    matrix.set(size - 8, 8, 1, true);
  }
  function setupData(matrix, data) {
    let size = matrix.size;
    let inc = -1;
    let row = size - 1;
    let bitIndex = 7;
    let byteIndex = 0;
    for (let col = size - 1; col > 0; col -= 2) {
      if (col === 6) col--;
      while (true) {
        for (let c = 0; c < 2; c++)
          if (!matrix.isReserved(row, col - c)) {
            let dark = false;
            if (byteIndex < data.length) dark = ((data[byteIndex] >>> bitIndex) & 1) === 1;
            matrix.set(row, col - c, dark);
            bitIndex--;
            if (bitIndex === -1) {
              byteIndex++;
              bitIndex = 7;
            }
          }
        row += inc;
        if (row < 0 || size <= row) {
          row -= inc;
          inc = -inc;
          break;
        }
      }
    }
  }
  function createData(version, errorCorrectionLevel, segments) {
    let buffer = new BitBuffer();
    segments.forEach(function (data) {
      buffer.put(data.mode.bit, 4);
      buffer.put(data.getLength(), Mode.getCharCountIndicator(data.mode, version));
      data.write(buffer);
    });
    let totalCodewords = Utils.getSymbolTotalCodewords(version);
    let ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
    let dataTotalCodewordsBits = (totalCodewords - ecTotalCodewords) * 8;
    if (buffer.getLengthInBits() + 4 <= dataTotalCodewordsBits) buffer.put(0, 4);
    while (buffer.getLengthInBits() % 8 !== 0) buffer.putBit(0);
    let remainingByte = (dataTotalCodewordsBits - buffer.getLengthInBits()) / 8;
    for (let i = 0; i < remainingByte; i++) buffer.put(i % 2 ? 17 : 236, 8);
    return createCodewords(buffer, version, errorCorrectionLevel);
  }
  function createCodewords(bitBuffer, version, errorCorrectionLevel) {
    let totalCodewords = Utils.getSymbolTotalCodewords(version);
    let ecTotalCodewords = ECCode.getTotalCodewordsCount(version, errorCorrectionLevel);
    let dataTotalCodewords = totalCodewords - ecTotalCodewords;
    let ecTotalBlocks = ECCode.getBlocksCount(version, errorCorrectionLevel);
    let blocksInGroup2 = totalCodewords % ecTotalBlocks;
    let blocksInGroup1 = ecTotalBlocks - blocksInGroup2;
    let totalCodewordsInGroup1 = Math.floor(totalCodewords / ecTotalBlocks);
    let dataCodewordsInGroup1 = Math.floor(dataTotalCodewords / ecTotalBlocks);
    let dataCodewordsInGroup2 = dataCodewordsInGroup1 + 1;
    let ecCount = totalCodewordsInGroup1 - dataCodewordsInGroup1;
    let rs = new ReedSolomonEncoder(ecCount);
    let offset = 0;
    let dcData = Array(ecTotalBlocks);
    let ecData = Array(ecTotalBlocks);
    let maxDataSize = 0;
    let buffer = new Uint8Array(bitBuffer.buffer);
    for (let b = 0; b < ecTotalBlocks; b++) {
      let dataSize = b < blocksInGroup1 ? dataCodewordsInGroup1 : dataCodewordsInGroup2;
      dcData[b] = buffer.slice(offset, offset + dataSize);
      ecData[b] = rs.encode(dcData[b]);
      offset += dataSize;
      maxDataSize = Math.max(maxDataSize, dataSize);
    }
    let data = new Uint8Array(totalCodewords);
    let index = 0;
    let i;
    let r;
    for (i = 0; i < maxDataSize; i++)
      for (r = 0; r < ecTotalBlocks; r++) if (i < dcData[r].length) data[index++] = dcData[r][i];
    for (i = 0; i < ecCount; i++) for (r = 0; r < ecTotalBlocks; r++) data[index++] = ecData[r][i];
    return data;
  }
  function createSymbol(data, version, errorCorrectionLevel, maskPattern) {
    let segments;
    if (Array.isArray(data)) segments = Segments.fromArray(data);
    else if (typeof data === "string") {
      let estimatedVersion = version;
      if (!estimatedVersion) {
        let rawSegments = Segments.rawSplit(data);
        estimatedVersion = Version.getBestVersionForData(rawSegments, errorCorrectionLevel);
      }
      segments = Segments.fromString(data, estimatedVersion || 40);
    } else throw Error("Invalid data");
    let bestVersion = Version.getBestVersionForData(segments, errorCorrectionLevel);
    if (!bestVersion) throw Error("The amount of data is too big to be stored in a QR Code");
    if (!version) version = bestVersion;
    else if (version < bestVersion)
      throw Error(
        `
The chosen QR Code version cannot contain this amount of data.
Minimum version required to store current data is: ` +
          bestVersion +
          `.
`,
      );
    let dataBits = createData(version, errorCorrectionLevel, segments);
    let moduleCount = Utils.getSymbolSize(version);
    let modules = new BitMatrix(moduleCount);
    setupFinderPattern(modules, version);
    setupTimingPattern(modules);
    setupAlignmentPattern(modules, version);
    setupFormatInfo(modules, errorCorrectionLevel, 0);
    if (version >= 7) setupVersionInfo(modules, version);
    setupData(modules, dataBits);
    if (isNaN(maskPattern))
      maskPattern = MaskPattern.getBestMask(
        modules,
        setupFormatInfo.bind(null, modules, errorCorrectionLevel),
      );
    MaskPattern.applyMask(maskPattern, modules);
    setupFormatInfo(modules, errorCorrectionLevel, maskPattern);
    return {
      modules,
      version,
      errorCorrectionLevel,
      maskPattern,
      segments,
    };
  }
  cjsExports.create = function (data, options) {
    if (typeof data === "undefined" || data === "") throw Error("No input text");
    let errorCorrectionLevel = ECLevel.M;
    let version;
    let mask;
    if (typeof options !== "undefined") {
      errorCorrectionLevel = ECLevel.from(options.errorCorrectionLevel, ECLevel.M);
      version = Version.from(options.version);
      mask = MaskPattern.from(options.maskPattern);
      if (options.toSJISFunc) Utils.setToSJISFunction(options.toSJISFunc);
    }
    return createSymbol(data, version, errorCorrectionLevel, mask);
  };
});
export { require_qrcode };

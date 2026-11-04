/**
 * qrcode/lib/core/mask-pattern.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-spjgqa4y.js:3101-5121 cjs-fingerprint
var require_mask_pattern = __commonJS(function (cjsExports) {
  cjsExports.Patterns = {
    PATTERN000: 0,
    PATTERN001: 1,
    PATTERN010: 2,
    PATTERN011: 3,
    PATTERN100: 4,
    PATTERN101: 5,
    PATTERN110: 6,
    PATTERN111: 7,
  };
  var PenaltyScores = {
    N1: 3,
    N2: 3,
    N3: 40,
    N4: 10,
  };
  cjsExports.isValid = function (mask) {
    return mask != null && mask !== "" && !isNaN(mask) && mask >= 0 && mask <= 7;
  };
  cjsExports.from = function (value) {
    return cjsExports.isValid(value) ? parseInt(value, 10) : undefined;
  };
  cjsExports.getPenaltyN1 = function (data) {
    let size = data.size;
    let points = 0;
    let sameCountCol = 0;
    let sameCountRow = 0;
    let lastCol = null;
    let lastRow = null;
    for (let row = 0; row < size; row++) {
      sameCountCol = sameCountRow = 0;
      lastCol = lastRow = null;
      for (let col = 0; col < size; col++) {
        let bit = data.get(row, col);
        if (bit === lastCol) sameCountCol++;
        else {
          if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
          lastCol = bit;
          sameCountCol = 1;
        }
        bit = data.get(col, row);
        if (bit === lastRow) sameCountRow++;
        else {
          if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
          lastRow = bit;
          sameCountRow = 1;
        }
      }
      if (sameCountCol >= 5) points += PenaltyScores.N1 + (sameCountCol - 5);
      if (sameCountRow >= 5) points += PenaltyScores.N1 + (sameCountRow - 5);
    }
    return points;
  };
  cjsExports.getPenaltyN2 = function (data) {
    let size = data.size;
    let points = 0;
    for (let row = 0; row < size - 1; row++)
      for (let col = 0; col < size - 1; col++) {
        let last =
          data.get(row, col) + data.get(row, col + 1) + data.get(row + 1, col) + data.get(row + 1, col + 1);
        if (last === 4 || last === 0) points++;
      }
    return points * PenaltyScores.N2;
  };
  cjsExports.getPenaltyN3 = function (data) {
    let size = data.size;
    let points = 0;
    let bitsCol = 0;
    let bitsRow = 0;
    for (let row = 0; row < size; row++) {
      bitsCol = bitsRow = 0;
      for (let col = 0; col < size; col++) {
        bitsCol = ((bitsCol << 1) & 2047) | data.get(row, col);
        if (col >= 10 && (bitsCol === 1488 || bitsCol === 93)) points++;
        bitsRow = ((bitsRow << 1) & 2047) | data.get(col, row);
        if (col >= 10 && (bitsRow === 1488 || bitsRow === 93)) points++;
      }
    }
    return points * PenaltyScores.N3;
  };
  cjsExports.getPenaltyN4 = function (data) {
    let darkCount = 0;
    let modulesCount = data.data.length;
    for (let i = 0; i < modulesCount; i++) darkCount += data.data[i];
    return Math.abs(Math.ceil((darkCount * 100) / modulesCount / 5) - 10) * PenaltyScores.N4;
  };
  function getMaskAt(maskPattern, i, j) {
    switch (maskPattern) {
      case cjsExports.Patterns.PATTERN000:
        return (i + j) % 2 === 0;
      case cjsExports.Patterns.PATTERN001:
        return i % 2 === 0;
      case cjsExports.Patterns.PATTERN010:
        return j % 3 === 0;
      case cjsExports.Patterns.PATTERN011:
        return (i + j) % 3 === 0;
      case cjsExports.Patterns.PATTERN100:
        return (Math.floor(i / 2) + Math.floor(j / 3)) % 2 === 0;
      case cjsExports.Patterns.PATTERN101:
        return ((i * j) % 2) + ((i * j) % 3) === 0;
      case cjsExports.Patterns.PATTERN110:
        return (((i * j) % 2) + ((i * j) % 3)) % 2 === 0;
      case cjsExports.Patterns.PATTERN111:
        return (((i * j) % 3) + ((i + j) % 2)) % 2 === 0;
      default:
        throw Error("bad maskPattern:" + maskPattern);
    }
  }
  cjsExports.applyMask = function (pattern, data) {
    let size = data.size;
    for (let col = 0; col < size; col++)
      for (let row = 0; row < size; row++) {
        if (data.isReserved(row, col)) continue;
        data.xor(row, col, getMaskAt(pattern, row, col));
      }
  };
  cjsExports.getBestMask = function (data, setupFormatFunc) {
    let numPatterns = Object.keys(cjsExports.Patterns).length;
    let bestPattern = 0;
    let lowerPenalty = 1 / 0;
    for (let p = 0; p < numPatterns; p++) {
      setupFormatFunc(p);
      cjsExports.applyMask(p, data);
      let penalty =
        cjsExports.getPenaltyN1(data) +
        cjsExports.getPenaltyN2(data) +
        cjsExports.getPenaltyN3(data) +
        cjsExports.getPenaltyN4(data);
      cjsExports.applyMask(p, data);
      if (penalty < lowerPenalty) {
        lowerPenalty = penalty;
        bestPattern = p;
      }
    }
    return bestPattern;
  };
});
export { require_mask_pattern };

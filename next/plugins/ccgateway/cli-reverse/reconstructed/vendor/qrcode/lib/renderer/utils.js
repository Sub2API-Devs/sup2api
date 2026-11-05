/**
 * qrcode/lib/renderer/utils.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-s2h2kd6t.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-s2h2kd6t.js:50618-52033 cjs-fingerprint
var require_utils_2 = __commonJS(function (cjsExports) {
  function hex2rgba(hex) {
    if (typeof hex === "number") hex = hex.toString();
    if (typeof hex !== "string") throw Error("Color should be defined as hex string");
    let hexCode = hex.slice().replace("#", "").split("");
    if (hexCode.length < 3 || hexCode.length === 5 || hexCode.length > 8)
      throw Error("Invalid hex color: " + hex);
    if (hexCode.length === 3 || hexCode.length === 4)
      hexCode = Array.prototype.concat.apply(
        [],
        hexCode.map(function (c) {
          return [c, c];
        }),
      );
    if (hexCode.length === 6) hexCode.push("F", "F");
    let hexValue = parseInt(hexCode.join(""), 16);
    return {
      r: (hexValue >> 24) & 255,
      g: (hexValue >> 16) & 255,
      b: (hexValue >> 8) & 255,
      a: hexValue & 255,
      hex: "#" + hexCode.slice(0, 6).join(""),
    };
  }
  cjsExports.getOptions = function (options) {
    if (!options) options = {};
    if (!options.color) options.color = {};
    let margin =
      typeof options.margin === "undefined" || options.margin === null || options.margin < 0
        ? 4
        : options.margin;
    let width = options.width && options.width >= 21 ? options.width : undefined;
    let scale = options.scale || 4;
    return {
      width,
      scale: width ? 4 : scale,
      margin,
      color: {
        dark: hex2rgba(options.color.dark || "#000000ff"),
        light: hex2rgba(options.color.light || "#ffffffff"),
      },
      type: options.type,
      rendererOpts: options.rendererOpts || {},
    };
  };
  cjsExports.getScale = function (qrSize, opts) {
    return opts.width && opts.width >= qrSize + opts.margin * 2
      ? opts.width / (qrSize + opts.margin * 2)
      : opts.scale;
  };
  cjsExports.getImageWidth = function (qrSize, opts) {
    let scale = cjsExports.getScale(qrSize, opts);
    return Math.floor((qrSize + opts.margin * 2) * scale);
  };
  cjsExports.qrToImageData = function (imgData, qr, opts) {
    let size = qr.modules.size;
    let data = qr.modules.data;
    let scale = cjsExports.getScale(size, opts);
    let symbolSize = Math.floor((size + opts.margin * 2) * scale);
    let scaledMargin = opts.margin * scale;
    let palette = [opts.color.light, opts.color.dark];
    for (let i = 0; i < symbolSize; i++)
      for (let j = 0; j < symbolSize; j++) {
        let posDst = (i * symbolSize + j) * 4;
        let pxColor = opts.color.light;
        if (
          i >= scaledMargin &&
          j >= scaledMargin &&
          i < symbolSize - scaledMargin &&
          j < symbolSize - scaledMargin
        ) {
          let iSrc = Math.floor((i - scaledMargin) / scale);
          let jSrc = Math.floor((j - scaledMargin) / scale);
          pxColor = palette[data[iSrc * size + jSrc] ? 1 : 0];
        }
        imgData[posDst++] = pxColor.r;
        imgData[posDst++] = pxColor.g;
        imgData[posDst++] = pxColor.b;
        imgData[posDst] = pxColor.a;
      }
  };
});
export { require_utils_2 };

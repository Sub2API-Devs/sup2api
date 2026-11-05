/**
 * qrcode/lib/renderer/canvas.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-s2h2kd6t.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_utils_2 } from "./utils.js";

//@ chunk-s2h2kd6t.js:56269-57046 cjs-fingerprint
var require_canvas = __commonJS(function (cjsExports) {
  var Utils = require_utils_2();
  function clearCanvas(ctx, canvas, size) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!canvas.style) canvas.style = {};
    canvas.height = size;
    canvas.width = size;
    canvas.style.height = size + "px";
    canvas.style.width = size + "px";
  }
  function getCanvasElement() {
    try {
      return document.createElement("canvas");
    } catch (e) {
      throw Error("You need to specify a canvas element");
    }
  }
  cjsExports.render = function (qrData, canvas, options) {
    let opts = options;
    let canvasEl = canvas;
    if (typeof opts === "undefined" && (!canvas || !canvas.getContext)) {
      opts = canvas;
      canvas = undefined;
    }
    if (!canvas) canvasEl = getCanvasElement();
    opts = Utils.getOptions(opts);
    let size = Utils.getImageWidth(qrData.modules.size, opts);
    let ctx = canvasEl.getContext("2d");
    let image = ctx.createImageData(size, size);
    Utils.qrToImageData(image.data, qrData, opts);
    clearCanvas(ctx, canvasEl, size);
    ctx.putImageData(image, 0, 0);
    return canvasEl;
  };
  cjsExports.renderToDataURL = function (qrData, canvas, options) {
    let opts = options;
    if (typeof opts === "undefined" && (!canvas || !canvas.getContext)) {
      opts = canvas;
      canvas = undefined;
    }
    if (!opts) opts = {};
    let canvasEl = cjsExports.render(qrData, canvas, opts);
    let type = opts.type || "image/png";
    let rendererOpts = opts.rendererOpts || {};
    return canvasEl.toDataURL(type, rendererOpts.quality);
  };
});
export { require_canvas };

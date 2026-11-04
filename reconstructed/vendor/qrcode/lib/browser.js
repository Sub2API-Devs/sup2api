/**
 * qrcode/lib/browser.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_can_promise } from "./can-promise.js";
import { require_qrcode } from "./core/qrcode.js";
import { require_canvas } from "./renderer/canvas.js";
import { require_svg_tag } from "./renderer/svg-tag.js";

//@ chunk-spjgqa4y.js:57046-57866 cjs-fingerprint
var require_browser = __commonJS(function (cjsExports) {
  var canPromise = require_can_promise();
  var QRCode = require_qrcode();
  var CanvasRenderer = require_canvas();
  var SvgRenderer = require_svg_tag();
  function renderCanvas(renderFunc, canvas, text, opts, cb) {
    let args = [].slice.call(arguments, 1);
    let argsNum = args.length;
    let isLastArgCb = typeof args[argsNum - 1] === "function";
    if (!isLastArgCb && !canPromise()) throw Error("Callback required as last argument");
    if (isLastArgCb) {
      if (argsNum < 2) throw Error("Too few arguments provided");
      if (argsNum === 2) {
        cb = text;
        text = canvas;
        canvas = opts = undefined;
      } else if (argsNum === 3)
        if (canvas.getContext && typeof cb === "undefined") {
          cb = opts;
          opts = undefined;
        } else {
          cb = opts;
          opts = text;
          text = canvas;
          canvas = undefined;
        }
    } else {
      if (argsNum < 1) throw Error("Too few arguments provided");
      if (argsNum === 1) {
        text = canvas;
        canvas = opts = undefined;
      } else if (argsNum === 2 && !canvas.getContext) {
        opts = text;
        text = canvas;
        canvas = undefined;
      }
      return new Promise(function (resolve, reject) {
        try {
          let data = QRCode.create(text, opts);
          resolve(renderFunc(data, canvas, opts));
        } catch (e) {
          reject(e);
        }
      });
    }
    try {
      let data = QRCode.create(text, opts);
      cb(null, renderFunc(data, canvas, opts));
    } catch (e) {
      cb(e);
    }
  }
  cjsExports.create = QRCode.create;
  cjsExports.toCanvas = renderCanvas.bind(null, CanvasRenderer.render);
  cjsExports.toDataURL = renderCanvas.bind(null, CanvasRenderer.renderToDataURL);
  cjsExports.toString = renderCanvas.bind(null, function (data, _, opts) {
    return SvgRenderer.render(data, opts);
  });
});
export { require_browser };

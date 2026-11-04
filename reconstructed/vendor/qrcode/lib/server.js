/**
 * qrcode/lib/server.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (7)
 * attribution: esm-layout 2, esm-fingerprint 5
 */
import { require_can_promise } from "./can-promise.js";
import { require_qrcode } from "./core/qrcode.js";
import { require_png_2 } from "./renderer/png.js";
import { require_utf8 } from "./renderer/utf8.js";
import { qrTerminalModule } from "./renderer/terminal.js";
import { require_svg } from "./renderer/svg.js";
import { require_browser } from "./browser.js";

//@ chunk-spjgqa4y.js:57866-57919 esm-layout
var canPromise = require_can_promise();
var QRCode = require_qrcode();
var PngRenderer = require_png_2();
var Utf8Renderer = require_utf8();
var TerminalRenderer = qrTerminalModule();
var SvgRenderer = require_svg();
//@ chunk-spjgqa4y.js:57919-58152 esm-fingerprint
function checkParams(text, opts, cb) {
  if (typeof text === "undefined") throw Error("String required as first argument");
  if (typeof cb === "undefined") {
    cb = opts;
    opts = {};
  }
  if (typeof cb !== "function")
    if (!canPromise()) throw Error("Callback required as last argument");
    else {
      opts = cb || {};
      cb = null;
    }
  return {
    opts,
    cb,
  };
}
//@ chunk-spjgqa4y.js:58152-58226 esm-fingerprint
function getTypeFromFilename(path) {
  return path.slice(((path.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
}
//@ chunk-spjgqa4y.js:58226-58347 esm-fingerprint
function getRendererFromType(type) {
  switch (type) {
    case "svg":
      return SvgRenderer;
    case "txt":
    case "utf8":
      return Utf8Renderer;
    case "png":
    case "image/png":
    default:
      return PngRenderer;
  }
}
//@ chunk-spjgqa4y.js:58347-58447 esm-fingerprint
function getStringRendererFromType(type) {
  switch (type) {
    case "svg":
      return SvgRenderer;
    case "terminal":
      return TerminalRenderer;
    case "utf8":
    default:
      return Utf8Renderer;
  }
}
//@ chunk-spjgqa4y.js:58447-58680 esm-fingerprint
function render(renderFunc, text, params) {
  if (!params.cb)
    return new Promise(function (resolve, reject) {
      try {
        let data = QRCode.create(text, params.opts);
        return renderFunc(data, params.opts, function (err, data) {
          return err ? reject(err) : resolve(data);
        });
      } catch (e) {
        reject(e);
      }
    });
  try {
    let data = QRCode.create(text, params.opts);
    return renderFunc(data, params.opts, params.cb);
  } catch (e) {
    params.cb(e);
  }
}
//@ chunk-spjgqa4y.js:58680-59446 esm-layout
var create = QRCode.create;
var toCanvas = require_browser().toCanvas;
var toString = function (text, opts, cb) {
  let params = checkParams(text, opts, cb);
  let type = params.opts ? params.opts.type : undefined;
  let renderer = getStringRendererFromType(type);
  return render(renderer.render, text, params);
};
var toDataURL = function (text, opts, cb) {
  let params = checkParams(text, opts, cb);
  let renderer = getRendererFromType(params.opts.type);
  return render(renderer.renderToDataURL, text, params);
};
var toBuffer = function (text, opts, cb) {
  let params = checkParams(text, opts, cb);
  let renderer = getRendererFromType(params.opts.type);
  return render(renderer.renderToBuffer, text, params);
};
var toFile = function (path, text, opts, cb) {
  if (typeof path !== "string" || !(typeof text === "string" || typeof text === "object"))
    throw Error("Invalid argument");
  if (arguments.length < 3 && !canPromise()) throw Error("Too few arguments provided");
  let params = checkParams(text, opts, cb);
  let type = params.opts.type || getTypeFromFilename(path);
  let renderToFile = getRendererFromType(type).renderToFile.bind(null, path);
  return render(renderToFile, text, params);
};
var toFileStream = function (stream, text, opts) {
  if (arguments.length < 2) throw Error("Too few arguments provided");
  let params = checkParams(text, opts, stream.emit.bind(stream, "error"));
  let renderToFileStream = getRendererFromType("png").renderToFileStream.bind(null, stream);
  render(renderToFileStream, text, params);
};
export { toString, create, toCanvas, toDataURL, toBuffer, toFile, toFileStream };

/**
 * qrcode/lib/renderer/png.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-s2h2kd6t.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { require_png } from "../../../pngjs/lib/png.js";
import { require_utils_2 } from "./utils.js";

//@ chunk-s2h2kd6t.js:52033-52922 cjs-fingerprint
var require_png_2 = __commonJS(function (cjsExports) {
  var fs = importMetaRequire("fs");
  var PNG = require_png().PNG;
  var Utils = require_utils_2();
  cjsExports.render = function (qrData, options) {
    let opts = Utils.getOptions(options);
    let pngOpts = opts.rendererOpts;
    let size = Utils.getImageWidth(qrData.modules.size, opts);
    pngOpts.width = size;
    pngOpts.height = size;
    let pngImage = new PNG(pngOpts);
    Utils.qrToImageData(pngImage.data, qrData, opts);
    return pngImage;
  };
  cjsExports.renderToDataURL = function (qrData, options, cb) {
    if (typeof cb === "undefined") {
      cb = options;
      options = undefined;
    }
    cjsExports.renderToBuffer(qrData, options, function (err, output) {
      if (err) cb(err);
      let url = "data:image/png;base64,";
      url += output.toString("base64");
      cb(null, url);
    });
  };
  cjsExports.renderToBuffer = function (qrData, options, cb) {
    if (typeof cb === "undefined") {
      cb = options;
      options = undefined;
    }
    let png = cjsExports.render(qrData, options);
    let buffer = [];
    png.on("error", cb);
    png.on("data", function (data) {
      buffer.push(data);
    });
    png.on("end", function () {
      cb(null, Buffer.concat(buffer));
    });
    png.pack();
  };
  cjsExports.renderToFile = function (path, qrData, options, cb) {
    if (typeof cb === "undefined") {
      cb = options;
      options = undefined;
    }
    let called = false;
    let done = (...args) => {
      if (called) return;
      called = true;
      cb.apply(null, args);
    };
    let stream = fs.createWriteStream(path);
    stream.on("error", done);
    stream.on("close", done);
    cjsExports.renderToFileStream(stream, qrData, options);
  };
  cjsExports.renderToFileStream = function (stream, qrData, options) {
    cjsExports.render(qrData, options).pack().pipe(stream);
  };
});
export { require_png_2 };

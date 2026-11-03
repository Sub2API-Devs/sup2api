/**
 * qrcode/lib/renderer/png.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { Ln } from "../../../pngjs/lib/png.js";
import { we } from "./utils.js";

//@ chunk-spjgqa4y.js:52033-52922 cjs-fingerprint
var Pn = x(function (Ee) {
  var Sn = importMetaRequire("fs"),
    PNG = Ln().PNG,
    ue = we();
  Ee.render = function (e, r) {
    let options = ue.getOptions(r),
      rendererOpts = options.rendererOpts,
      imageWidth = ue.getImageWidth(e.modules.size, options);
    ((rendererOpts.width = imageWidth), (rendererOpts.height = imageWidth));
    let s = new PNG(rendererOpts);
    return (ue.qrToImageData(s.data, e, options), s);
  };
  Ee.renderToDataURL = function (e, r, n) {
    if (typeof n > "u") ((n = r), (r = void 0));
    Ee.renderToBuffer(e, r, function (i, o) {
      if (i) n(i);
      let s = "data:image/png;base64,";
      ((s += o.toString("base64")), n(null, s));
    });
  };
  Ee.renderToBuffer = function (e, r, n) {
    if (typeof n > "u") ((n = r), (r = void 0));
    let render = Ee.render(e, r),
      o = [];
    (render.on("error", n),
      render.on("data", function (s) {
        o.push(s);
      }),
      render.on("end", function () {
        n(null, Buffer.concat(o));
      }),
      render.pack());
  };
  Ee.renderToFile = function (e, r, n, i) {
    if (typeof i > "u") ((i = n), (n = void 0));
    let o = !1,
      s = (...u) => {
        if (o) return;
        ((o = !0), i.apply(null, u));
      },
      writeStream = Sn.createWriteStream(e);
    (writeStream.on("error", s), writeStream.on("close", s), Ee.renderToFileStream(writeStream, r, n));
  };
  Ee.renderToFileStream = function (e, r, n) {
    Ee.render(r, n).pack().pipe(e);
  };
});

export { Pn };

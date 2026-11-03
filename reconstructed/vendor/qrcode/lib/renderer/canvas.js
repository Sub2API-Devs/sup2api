/**
 * qrcode/lib/renderer/canvas.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { we } from "./utils.js";

//@ chunk-spjgqa4y.js:56269-57046 cjs-fingerprint
var jn = x(function (nl) {
  var fe = we();
  function tl(t, e, r) {
    if ((t.clearRect(0, 0, e.width, e.height), !e.style)) e.style = {};
    ((e.height = r), (e.width = r), (e.style.height = r + "px"), (e.style.width = r + "px"));
  }
  function rl() {
    try {
      return document.createElement("canvas");
    } catch (error) {
      throw Error("You need to specify a canvas element");
    }
  }
  nl.render = function (e, r, n) {
    let i = n,
      o = r;
    if (typeof i > "u" && (!r || !r.getContext)) ((i = r), (r = void 0));
    if (!r) o = rl();
    i = fe.getOptions(i);
    let imageWidth = fe.getImageWidth(e.modules.size, i),
      context = o.getContext("2d"),
      imageData = context.createImageData(imageWidth, imageWidth);
    return (
      fe.qrToImageData(imageData.data, e, i),
      tl(context, o, imageWidth),
      context.putImageData(imageData, 0, 0),
      o
    );
  };
  nl.renderToDataURL = function (e, r, n) {
    let i = n;
    if (typeof i > "u" && (!r || !r.getContext)) ((i = r), (r = void 0));
    if (!i) i = {};
    let render = nl.render(e, r, i),
      s = i.type || "image/png",
      l = i.rendererOpts || {};
    return render.toDataURL(s, l.quality);
  };
});

export { jn };

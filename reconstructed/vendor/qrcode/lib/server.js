/**
 * qrcode/lib/server.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: qrcode@1.5.4
 * pieces: chunk-spjgqa4y.js (7)
 * attribution: esm-layout 2, esm-fingerprint 5
 */
import { Ue } from "./can-promise.js";
import { it } from "./core/qrcode.js";
import { Pn } from "./renderer/png.js";
import { Sbo } from "./renderer/utf8.js";
import { qrTerminalModule } from "./renderer/terminal.js";
import { Kn } from "./renderer/svg.js";
import { Qn } from "./browser.js";

//@ chunk-spjgqa4y.js:57866-57919 esm-layout
var Zn = Ue(),
  he = it(),
  hl = Pn(),
  $n = Sbo(),
  cl = qrTerminalModule(),
  Xn = Kn();
//@ chunk-spjgqa4y.js:57919-58152 esm-fingerprint
function Te(t, e, r) {
  if (typeof t > "u") throw Error("String required as first argument");
  if (typeof r > "u") ((r = e), (e = {}));
  if (typeof r !== "function")
    if (!Zn()) throw Error("Callback required as last argument");
    else ((e = r || {}), (r = null));
  return { opts: e, cb: r };
}
//@ chunk-spjgqa4y.js:58152-58226 esm-fingerprint
function dl(t) {
  return t.slice(((t.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
}
//@ chunk-spjgqa4y.js:58226-58347 esm-fingerprint
function Oe(t) {
  switch (t) {
    case "svg":
      return Xn;
    case "txt":
    case "utf8":
      return $n;
    case "png":
    case "image/png":
    default:
      return hl;
  }
}
//@ chunk-spjgqa4y.js:58347-58447 esm-fingerprint
function pl(t) {
  switch (t) {
    case "svg":
      return Xn;
    case "terminal":
      return cl;
    case "utf8":
    default:
      return $n;
  }
}
//@ chunk-spjgqa4y.js:58447-58680 esm-fingerprint
function Ce(t, e, r) {
  if (!r.cb)
    return new Promise(function (n, i) {
      try {
        let create = he.create(e, r.opts);
        return t(create, r.opts, function (s, l) {
          return s ? i(s) : n(l);
        });
      } catch (error) {
        i(error);
      }
    });
  try {
    let create = he.create(e, r.opts);
    return t(create, r.opts, r.cb);
  } catch (error) {
    r.cb(error);
  }
}
//@ chunk-spjgqa4y.js:58680-59446 esm-layout
var create = he.create,
  toCanvas = Qn().toCanvas,
  toString = function (e, r, n) {
    let i = Te(e, r, n),
      o = i.opts ? i.opts.type : void 0,
      s = pl(o);
    return Ce(s.render, e, i);
  },
  toDataURL = function (e, r, n) {
    let i = Te(e, r, n),
      o = Oe(i.opts.type);
    return Ce(o.renderToDataURL, e, i);
  },
  toBuffer = function (e, r, n) {
    let i = Te(e, r, n),
      o = Oe(i.opts.type);
    return Ce(o.renderToBuffer, e, i);
  },
  toFile = function (e, r, n, i) {
    if (typeof e !== "string" || !(typeof r === "string" || typeof r === "object"))
      throw Error("Invalid argument");
    if (arguments.length < 3 && !Zn()) throw Error("Too few arguments provided");
    let o = Te(r, n, i),
      s = o.opts.type || dl(e),
      u = Oe(s).renderToFile.bind(null, e);
    return Ce(u, r, o);
  },
  toFileStream = function (e, r, n) {
    if (arguments.length < 2) throw Error("Too few arguments provided");
    let i = Te(r, n, e.emit.bind(e, "error")),
      s = Oe("png").renderToFileStream.bind(null, e);
    Ce(s, r, i);
  };

export { toString, create };

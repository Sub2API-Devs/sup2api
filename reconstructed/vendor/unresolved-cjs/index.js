/**
 * unresolved-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: unresolved-cjs (unresolved)
 * pieces: chunk-a3vzsfpr.js (1), chunk-edce4vxq.js (3), chunk-fq0cr76a.js (2), chunk-h6b7mazd.js (1), chunk-hrs3dad1.js (1), chunk-m4p5zn6n.js (2), chunk-pwh5dx3n.js (1), chunk-zxbmtfmw.js (1)
 * attribution: cjs-unmatched 12
 */
import { x, importMetaRequire, importMetaRequire as Be } from "../../runtime/bun-runtime.js";
import { UQt } from "../@smithy/util-buffer-from/dist-cjs/index.js";
import { IR } from "../@smithy/util-utf8/dist-cjs/index.js";
import { Tn } from "../node-forge/lib/forge.js";
import { Xa } from "../node-forge/lib/aes.js";
import { $A } from "../node-forge/lib/aesCipherSuites.js";
import { Xi } from "../node-forge/lib/asn1.js";
import { $h } from "../node-forge/lib/cipher.js";
import { bf } from "../node-forge/lib/des.js";
import { sC } from "../node-forge/lib/ed25519.js";
import { iu } from "../node-forge/lib/hmac.js";
import { lC } from "../node-forge/lib/kem.js";
import { uC } from "../node-forge/lib/log.js";
import { fC } from "../node-forge/index.js";
import { AS } from "../node-forge/lib/mgf1.js";
import { Xh } from "../node-forge/lib/pbkdf2.js";
import { sc } from "../node-forge/lib/pem.js";
import { SS } from "../node-forge/lib/pkcs1.js";
import { IS } from "../node-forge/lib/pkcs12.js";
import { mC } from "../node-forge/lib/pkcs7.js";
import { kS } from "../node-forge/lib/pki.js";
import { xS } from "../node-forge/lib/prime.js";
import { dS } from "../node-forge/lib/prng.js";
import { sm } from "../node-forge/lib/pss.js";
import { Ci } from "../node-forge/lib/random.js";
import { hS } from "../node-forge/lib/rc2.js";
import { yC } from "../node-forge/lib/ssh.js";
import { US } from "../node-forge/lib/tls.js";
import { Zn } from "../node-forge/lib/util.js";
import { hHr } from "../long/umd/index.js";
import { cliBoxesData } from "../cli-boxes/boxes.json.js";

//@ chunk-edce4vxq.js:12143-12632 cjs-unmatched
var ss = x(function (Vo) {
  var rs = typeof TextEncoder == "function" ? new TextEncoder() : null,
    Uo = (e) => {
      if (typeof e === "string") {
        if (rs) return rs.encode(e).byteLength;
        let t = e.length;
        for (let r = t - 1; r >= 0; r--) {
          let code = e.charCodeAt(r);
          if (code > 127 && code <= 2047) t++;
          else if (code > 2047 && code <= 65535) t += 2;
          if (code >= 56320 && code <= 57343) r--;
        }
        return t;
      } else if (typeof e.byteLength === "number") return e.byteLength;
      else if (typeof e.size === "number") return e.size;
      throw Error(`Body Length computation failed for ${e}`);
    };
  Vo.calculateBodyLength = Uo;
});
//@ chunk-edce4vxq.js:135599-136250 cjs-unmatched
var Nme = x(function (ad) {
  var fr = UQt(),
    id = IR(),
    od = importMetaRequire("buffer"),
    Yn = importMetaRequire("crypto");
  class Zn {
    algorithmIdentifier;
    secret;
    hash;
    constructor(e, t) {
      ((this.algorithmIdentifier = e), (this.secret = t), this.reset());
    }
    update(e, t) {
      this.hash.update(id.toUint8Array(Jn(e, t)));
    }
    digest() {
      return Promise.resolve(this.hash.digest());
    }
    reset() {
      this.hash = this.secret
        ? Yn.createHmac(this.algorithmIdentifier, Jn(this.secret))
        : Yn.createHash(this.algorithmIdentifier);
    }
  }
  function Jn(e, t) {
    if (od.Buffer.isBuffer(e)) return e;
    if (typeof e === "string") return fr.fromString(e, t);
    if (ArrayBuffer.isView(e)) return fr.fromArrayBuffer(e.buffer, e.byteOffset, e.byteLength);
    return fr.fromArrayBuffer(e);
  }
  ad.Hash = Zn;
});
//@ chunk-edce4vxq.js:136250-136783 cjs-unmatched
var $me = x(function (ld) {
  var pr = importMetaRequire("fs"),
    ud = (e) => {
      if (!e) return 0;
      if (typeof e === "string") return Buffer.byteLength(e);
      else if (typeof e.byteLength === "number") return e.byteLength;
      else if (typeof e.size === "number") return e.size;
      else if (typeof e.start === "number" && typeof e.end === "number") return e.end + 1 - e.start;
      else if (e instanceof pr.ReadStream) {
        if (e.path != null) return pr.lstatSync(e.path).size;
        else if (typeof e.fd === "number") return pr.fstatSync(e.fd).size;
      }
      throw Error(`Body Length computation failed for ${e}`);
    };
  ld.calculateBodyLength = ud;
});
//@ chunk-fq0cr76a.js:295373-295542 cjs-unmatched
var EC = x(function (qfe, bC) {
  bC.exports = Tn();
  Xa();
  $A();
  Xi();
  $h();
  bf();
  sC();
  iu();
  lC();
  uC();
  fC();
  AS();
  Xh();
  sc();
  SS();
  IS();
  mC();
  kS();
  xS();
  dS();
  sm();
  Ci();
  hS();
  yC();
  US();
  Zn();
});
//@ chunk-fq0cr76a.js:519597-519671 cjs-unmatched
var cU = x(function (lU) {
  Object.defineProperty(lU, "__esModule", { value: !0 });
});
//@ chunk-m4p5zn6n.js:3688-3917 cjs-unmatched
var Et = x(function (gi, ye) {
  var Ct = (e = {}) => {
    let n = e.env || process.env;
    if ((e.platform || "linux") !== "win32") return "PATH";
    return (
      Object.keys(n)
        .reverse()
        .find((o) => o.toUpperCase() === "PATH") || "Path"
    );
  };
  ye.exports = Ct;
  ye.exports.default = Ct;
});
//@ chunk-m4p5zn6n.js:6576-7096 cjs-unmatched
var yn = x(function (Os, hn) {
  var { PassThrough: PassThrough } = importMetaRequire("stream");
  hn.exports = function () {
    var e = [],
      n = new PassThrough({ objectMode: !0 });
    return (
      n.setMaxListeners(0),
      (n.add = r),
      (n.isEmpty = o),
      n.on("unpipe", s),
      Array.prototype.slice.call(arguments).forEach(r),
      n
    );
    function r(u) {
      if (Array.isArray(u)) return (u.forEach(r), this);
      return (
        e.push(u),
        u.once("end", s.bind(null, u)),
        u.once("error", n.emit.bind(n, "error")),
        u.pipe(n, { end: !1 }),
        this
      );
    }
    function o() {
      return e.length == 0;
    }
    function s(u) {
      if (
        ((e = e.filter(function (d) {
          return d !== u;
        })),
        !e.length && n.readable)
      )
        n.end();
    }
  };
});
//@ chunk-a3vzsfpr.js:299-819 cjs-unmatched
var v = x(function (re) {
  var ne = (e, n, t) => {
      if (!(n in e)) return;
      if (e[n] === "true") return !0;
      if (e[n] === "false") return !1;
      throw Error(`Cannot load ${t} "${n}". Expected "true" or "false", got ${e[n]}.`);
    },
    te = (e, n, t) => {
      if (!(n in e)) return;
      let r = parseInt(e[n], 10);
      if (Number.isNaN(r)) throw TypeError(`Cannot load ${t} '${n}'. Expected number, got '${e[n]}'.`);
      return r;
    };
  re.SelectorType = void 0;
  (function (e) {
    ((e.ENV = "env"), (e.CONFIG = "shared config entry"));
  })(re.SelectorType || (re.SelectorType = {}));
  re.booleanSelector = ne;
  re.numberSelector = te;
});
//@ chunk-h6b7mazd.js:8103-8181 cjs-unmatched
var yo = x(function (Zl, mo) {
  mo.exports =
    Number.isNaN ||
    function (t) {
      return t !== t;
    };
});
//@ chunk-hrs3dad1.js:4804-4874 cjs-unmatched
var N = x(function (We, F) {
  var qe = importMetaRequire("path");
  F.exports = { isSupported: !1 };
});
//@ chunk-pwh5dx3n.js:78091-78403 cjs-unmatched
var td = x(function (exports, module) {
  module.exports = inquire;
  function inquire(moduleName) {
    try {
      var mod =
        moduleName === "long"
          ? hHr()
          : moduleName === "buffer"
            ? Be("buffer")
            : moduleName === "fs"
              ? Be("fs")
              : eval("quire".replace(/^/, "re"))(moduleName);
      if (mod && (mod.length || Object.keys(mod).length)) return mod;
    } catch (error) {}
    return null;
  }
});
//@ chunk-zxbmtfmw.js:1413-1479 cjs-unmatched
var cliBoxesModule = x(function (c, r) {
  var f = cliBoxesData();
  r.exports = f;
  r.exports.default = f;
});

export { Nme, $me, v, cU, cliBoxesModule, ss, EC, yo, N, Et, yn, td };

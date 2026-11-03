/**
 * unresolved-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: unresolved-cjs (unresolved)
 * pieces: chunk-a3vzsfpr.js (1), chunk-edce4vxq.js (3), chunk-fq0cr76a.js (2), chunk-h6b7mazd.js (1), chunk-hrs3dad1.js (1), chunk-m4p5zn6n.js (2), chunk-pwh5dx3n.js (1), chunk-zxbmtfmw.js (1)
 * attribution: cjs-unmatched 12
 */
import { x, importMetaRequire } from "../../runtime/bun-runtime.js";
import { require_util_buffer_from } from "../@smithy/util-buffer-from/dist-cjs/index.js";
import { require_util_utf8 } from "../@smithy/util-utf8/dist-cjs/index.js";
import { require_forge } from "../node-forge/lib/forge.js";
import { require_aes } from "../node-forge/lib/aes.js";
import { require_aesCipherSuites } from "../node-forge/lib/aesCipherSuites.js";
import { require_asn1 } from "../node-forge/lib/asn1.js";
import { require_cipher } from "../node-forge/lib/cipher.js";
import { require_des } from "../node-forge/lib/des.js";
import { require_ed25519 } from "../node-forge/lib/ed25519.js";
import { require_hmac } from "../node-forge/lib/hmac.js";
import { require_kem } from "../node-forge/lib/kem.js";
import { require_log } from "../node-forge/lib/log.js";
import { fC } from "../node-forge/index.js";
import { require_mgf1 } from "../node-forge/lib/mgf1.js";
import { require_pbkdf2 } from "../node-forge/lib/pbkdf2.js";
import { require_pem } from "../node-forge/lib/pem.js";
import { require_pkcs1 } from "../node-forge/lib/pkcs1.js";
import { require_pkcs12 } from "../node-forge/lib/pkcs12.js";
import { require_pkcs7 } from "../node-forge/lib/pkcs7.js";
import { require_pki } from "../node-forge/lib/pki.js";
import { require_prime } from "../node-forge/lib/prime.js";
import { require_prng } from "../node-forge/lib/prng.js";
import { require_pss } from "../node-forge/lib/pss.js";
import { require_random } from "../node-forge/lib/random.js";
import { require_rc2 } from "../node-forge/lib/rc2.js";
import { require_ssh } from "../node-forge/lib/ssh.js";
import { require_tls } from "../node-forge/lib/tls.js";
import { require_util } from "../node-forge/lib/util.js";
import { require_long as hHr } from "../long/umd/index.js";
import { cliBoxesData } from "../cli-boxes/boxes.json.js";

//@ chunk-edce4vxq.js:12143-12632 cjs-unmatched
var ss = x(function (Vo) {
  var rs = typeof TextEncoder == "function" ? new TextEncoder() : null;
  var calculateBodyLength = (e) => {
    if (typeof e === "string") {
      if (rs) return rs.encode(e).byteLength;
      let t = e.length;
      for (let i = t - 1; i >= 0; i--) {
        let code = e.charCodeAt(i);
        if (code > 127 && code <= 2047) t++;
        else if (code > 2047 && code <= 65535) t += 2;
        if (code >= 56320 && code <= 57343) i--;
      }
      return t;
    } else if (typeof e.byteLength === "number") return e.byteLength;
    else if (typeof e.size === "number") return e.size;
    throw Error(`Body Length computation failed for ${e}`);
  };
  Vo.calculateBodyLength = calculateBodyLength;
});
//@ chunk-edce4vxq.js:135599-136250 cjs-unmatched
var Nme = x(function (ad) {
  var fr = require_util_buffer_from();
  var id = require_util_utf8();
  var od = importMetaRequire("buffer");
  var Yn = importMetaRequire("crypto");
  class Zn {
    algorithmIdentifier;
    secret;
    hash;
    constructor(algorithmIdentifier, secret) {
      this.algorithmIdentifier = algorithmIdentifier;
      this.secret = secret;
      this.reset();
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
  var pr = importMetaRequire("fs");
  var calculateBodyLength = (e) => {
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
  ld.calculateBodyLength = calculateBodyLength;
});
//@ chunk-fq0cr76a.js:295373-295542 cjs-unmatched
var EC = x(function (qfe, bC) {
  bC.exports = require_forge();
  require_aes();
  require_aesCipherSuites();
  require_asn1();
  require_cipher();
  require_des();
  require_ed25519();
  require_hmac();
  require_kem();
  require_log();
  fC();
  require_mgf1();
  require_pbkdf2();
  require_pem();
  require_pkcs1();
  require_pkcs12();
  require_pkcs7();
  require_pki();
  require_prime();
  require_prng();
  require_pss();
  require_random();
  require_rc2();
  require_ssh();
  require_tls();
  require_util();
});
//@ chunk-fq0cr76a.js:519597-519671 cjs-unmatched
var cU = x(function (lU) {
  Object.defineProperty(lU, "__esModule", {
    value: true,
  });
});
//@ chunk-m4p5zn6n.js:3688-3917 cjs-unmatched
var Et = x(function (gi, ye) {
  var Ct = (e = {}) => {
    let env = e.env || process.env;
    if ((e.platform || "linux") !== "win32") return "PATH";
    return (
      Object.keys(env)
        .reverse()
        .find((key) => key.toUpperCase() === "PATH") || "Path"
    );
  };
  ye.exports = Ct;
  ye.exports.default = Ct;
});
//@ chunk-m4p5zn6n.js:6576-7096 cjs-unmatched
var yn = x(function (Os, hn) {
  var { PassThrough } = importMetaRequire("stream");
  hn.exports = function () {
    var e = [];
    var n = new PassThrough({
      objectMode: true,
    });
    n.setMaxListeners(0);
    n.add = r;
    n.isEmpty = o;
    n.on("unpipe", s);
    Array.prototype.slice.call(arguments).forEach(r);
    return n;
    function r(u) {
      if (Array.isArray(u)) {
        u.forEach(r);
        return this;
      }
      e.push(u);
      u.once("end", s.bind(null, u));
      u.once("error", n.emit.bind(n, "error"));
      u.pipe(n, {
        end: false,
      });
      return this;
    }
    function o() {
      return e.length == 0;
    }
    function s(u) {
      e = e.filter(function (d) {
        return d !== u;
      });
      if (!e.length && n.readable) n.end();
    }
  };
});
//@ chunk-a3vzsfpr.js:299-819 cjs-unmatched
var v = x(function (re) {
  var booleanSelector = (e, n, t) => {
    if (!(n in e)) return;
    if (e[n] === "true") return true;
    if (e[n] === "false") return false;
    throw Error(`Cannot load ${t} "${n}". Expected "true" or "false", got ${e[n]}.`);
  };
  var numberSelector = (e, n, t) => {
    if (!(n in e)) return;
    let r = parseInt(e[n], 10);
    if (Number.isNaN(r)) throw TypeError(`Cannot load ${t} '${n}'. Expected number, got '${e[n]}'.`);
    return r;
  };
  re.SelectorType = undefined;
  (function (e) {
    e.ENV = "env";
    e.CONFIG = "shared config entry";
  })(re.SelectorType || (re.SelectorType = {}));
  re.booleanSelector = booleanSelector;
  re.numberSelector = numberSelector;
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
  F.exports = {
    isSupported: false,
  };
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
            ? importMetaRequire("buffer")
            : moduleName === "fs"
              ? importMetaRequire("fs")
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

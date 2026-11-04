/**
 * unresolved-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: unresolved-cjs (unresolved)
 * pieces: chunk-a3vzsfpr.js (1), chunk-edce4vxq.js (3), chunk-fq0cr76a.js (2), chunk-h6b7mazd.js (1), chunk-hrs3dad1.js (1), chunk-m4p5zn6n.js (2), chunk-pwh5dx3n.js (1), chunk-zxbmtfmw.js (1)
 * attribution: cjs-unmatched 12
 */
import { __commonJS, importMetaRequire } from "../../runtime/bun-runtime.js";
import { cliBoxesData } from "../cli-boxes/boxes.json.js";
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
import { require_forge_jsIndex } from "../node-forge/index.js";
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
import { require_util_buffer_from } from "../@smithy/util-buffer-from/dist-cjs/index.js";
import { require_util_utf8 } from "../@smithy/util-utf8/dist-cjs/index.js";
import { require_long } from "../long/umd/index.js";

//@ chunk-m4p5zn6n.js:3688-3917 cjs-unmatched
var require_pathKey = __commonJS(function (moduleExports, moduleObj) {
  var pathName = (options = {}) => {
    let env = options.env || process.env;
    if ((options.platform || "linux") !== "win32") return "PATH";
    return (
      Object.keys(env)
        .reverse()
        .find((key) => key.toUpperCase() === "PATH") || "Path"
    );
  };
  moduleObj.exports = pathName;
  moduleObj.exports.default = pathName;
});
//@ chunk-m4p5zn6n.js:6576-7096 cjs-unmatched
var mergeStreamModule = __commonJS(function (moduleExports, moduleObj) {
  var { PassThrough } = importMetaRequire("stream");
  moduleObj.exports = function () {
    var sourceStreams = [];
    var output = new PassThrough({
      objectMode: true,
    });
    output.setMaxListeners(0);
    output.add = add;
    output.isEmpty = isEmpty;
    output.on("unpipe", onUnpipe);
    Array.prototype.slice.call(arguments).forEach(add);
    return output;
    function add(sources) {
      if (Array.isArray(sources)) {
        sources.forEach(add);
        return this;
      }
      sourceStreams.push(sources);
      sources.once("end", onUnpipe.bind(null, sources));
      sources.once("error", output.emit.bind(output, "error"));
      sources.pipe(output, {
        end: false,
      });
      return this;
    }
    function isEmpty() {
      return sourceStreams.length == 0;
    }
    function onUnpipe(source) {
      sourceStreams = sourceStreams.filter(function (stream) {
        return stream !== source;
      });
      if (!sourceStreams.length && output.readable) output.end();
    }
  };
});
//@ chunk-h6b7mazd.js:8103-8181 cjs-unmatched
var isNaNFallbackModule = __commonJS(function (moduleExports, moduleObj) {
  moduleObj.exports =
    Number.isNaN ||
    function (value) {
      return value !== value;
    };
});
//@ chunk-zxbmtfmw.js:1413-1479 cjs-unmatched
var cliBoxesModule = __commonJS(function (moduleExports, moduleObj) {
  var boxes = cliBoxesData();
  moduleObj.exports = boxes;
  moduleObj.exports.default = boxes;
});
//@ chunk-fq0cr76a.js:295373-295542 cjs-unmatched
var forgeModule_2 = __commonJS(function (moduleExports, moduleObj) {
  moduleObj.exports = require_forge();
  require_aes();
  require_aesCipherSuites();
  require_asn1();
  require_cipher();
  require_des();
  require_ed25519();
  require_hmac();
  require_kem();
  require_log();
  require_forge_jsIndex();
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
var emptyModule = __commonJS(function (moduleExports) {
  Object.defineProperty(moduleExports, "__esModule", {
    value: true,
  });
});
//@ chunk-a3vzsfpr.js:299-819 cjs-unmatched
var configResolverModule = __commonJS(function (moduleExports) {
  var booleanSelector = (source, key, selectorType) => {
    if (!(key in source)) return;
    if (source[key] === "true") return true;
    if (source[key] === "false") return false;
    throw Error(`Cannot load ${selectorType} "${key}". Expected "true" or "false", got ${source[key]}.`);
  };
  var numberSelector = (source, key, selectorType) => {
    if (!(key in source)) return;
    let parsed = parseInt(source[key], 10);
    if (Number.isNaN(parsed))
      throw TypeError(`Cannot load ${selectorType} '${key}'. Expected number, got '${source[key]}'.`);
    return parsed;
  };
  moduleExports.SelectorType = undefined;
  (function (selectorTypeEnum) {
    selectorTypeEnum.ENV = "env";
    selectorTypeEnum.CONFIG = "shared config entry";
  })(moduleExports.SelectorType || (moduleExports.SelectorType = {}));
  moduleExports.booleanSelector = booleanSelector;
  moduleExports.numberSelector = numberSelector;
});
//@ chunk-edce4vxq.js:12143-12632 cjs-unmatched
var calculateBodyLengthModule = __commonJS(function (moduleExports) {
  var textEncoder = typeof TextEncoder == "function" ? new TextEncoder() : null;
  var calculateBodyLength = (body) => {
    if (typeof body === "string") {
      if (textEncoder) return textEncoder.encode(body).byteLength;
      let length = body.length;
      for (let i = length - 1; i >= 0; i--) {
        let code = body.charCodeAt(i);
        if (code > 127 && code <= 2047) length++;
        else if (code > 2047 && code <= 65535) length += 2;
        if (code >= 56320 && code <= 57343) i--;
      }
      return length;
    } else if (typeof body.byteLength === "number") return body.byteLength;
    else if (typeof body.size === "number") return body.size;
    throw Error(`Body Length computation failed for ${body}`);
  };
  moduleExports.calculateBodyLength = calculateBodyLength;
});
//@ chunk-edce4vxq.js:135599-136250 cjs-unmatched
var hashModule = __commonJS(function (moduleExports) {
  var fromString = require_util_buffer_from();
  var utf8 = require_util_utf8();
  var bufferModule = importMetaRequire("buffer");
  var cryptoModule = importMetaRequire("crypto");
  class Hash {
    algorithmIdentifier;
    secret;
    hash;
    constructor(algorithmIdentifier, secret) {
      this.algorithmIdentifier = algorithmIdentifier;
      this.secret = secret;
      this.reset();
    }
    update(data, encoding) {
      this.hash.update(utf8.toUint8Array(toBuffer(data, encoding)));
    }
    digest() {
      return Promise.resolve(this.hash.digest());
    }
    reset() {
      this.hash = this.secret
        ? cryptoModule.createHmac(this.algorithmIdentifier, toBuffer(this.secret))
        : cryptoModule.createHash(this.algorithmIdentifier);
    }
  }
  function toBuffer(data, encoding) {
    if (bufferModule.Buffer.isBuffer(data)) return data;
    if (typeof data === "string") return fromString.fromString(data, encoding);
    if (ArrayBuffer.isView(data))
      return fromString.fromArrayBuffer(data.buffer, data.byteOffset, data.byteLength);
    return fromString.fromArrayBuffer(data);
  }
  moduleExports.Hash = Hash;
});
//@ chunk-edce4vxq.js:136250-136783 cjs-unmatched
var bodyLengthNodeModule = __commonJS(function (moduleExports) {
  var fs = importMetaRequire("fs");
  var calculateBodyLength = (body) => {
    if (!body) return 0;
    if (typeof body === "string") return Buffer.byteLength(body);
    else if (typeof body.byteLength === "number") return body.byteLength;
    else if (typeof body.size === "number") return body.size;
    else if (typeof body.start === "number" && typeof body.end === "number") return body.end + 1 - body.start;
    else if (body instanceof fs.ReadStream) {
      if (body.path != null) return fs.lstatSync(body.path).size;
      else if (typeof body.fd === "number") return fs.fstatSync(body.fd).size;
    }
    throw Error(`Body Length computation failed for ${body}`);
  };
  moduleExports.calculateBodyLength = calculateBodyLength;
});
//@ chunk-hrs3dad1.js:4804-4874 cjs-unmatched
var unsupportedModule = __commonJS(function (moduleExports, moduleObj) {
  var path = importMetaRequire("path");
  moduleObj.exports = {
    isSupported: false,
  };
});
//@ chunk-pwh5dx3n.js:78091-78403 cjs-unmatched
var require_inquire = __commonJS(function (exports, module) {
  module.exports = inquire;
  function inquire(moduleName) {
    try {
      var mod =
        moduleName === "long"
          ? require_long()
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
export {
  hashModule,
  bodyLengthNodeModule,
  configResolverModule,
  emptyModule,
  cliBoxesModule,
  calculateBodyLengthModule,
  forgeModule_2,
  isNaNFallbackModule,
  unsupportedModule,
  require_pathKey,
  mergeStreamModule,
  require_inquire,
};

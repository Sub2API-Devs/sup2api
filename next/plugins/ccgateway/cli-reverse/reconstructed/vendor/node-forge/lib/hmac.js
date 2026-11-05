/**
 * node-forge/lib/hmac.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_forge } from "./forge.js";
import { require_md } from "./md.js";
import { require_util } from "./util.js";

//@ chunk-qg41pqt6.js:64590-65611 cjs-fingerprint
var require_hmac = __commonJS(function (cjsExports, cjsModule) {
  var forge = require_forge();
  require_md();
  require_util();
  var hmac = (cjsModule.exports = forge.hmac = forge.hmac || {});
  hmac.create = function () {
    var _key = null;
    var _md = null;
    var _ipadding = null;
    var _opadding = null;
    var ctx = {};
    ctx.start = function (md, key) {
      if (md !== null)
        if (typeof md === "string") {
          md = md.toLowerCase();
          if (md in forge.md.algorithms) _md = forge.md.algorithms[md].create();
          else throw Error('Unknown hash algorithm "' + md + '"');
        } else _md = md;
      if (key === null) key = _key;
      else {
        if (typeof key === "string") key = forge.util.createBuffer(key);
        else if (forge.util.isArray(key)) {
          var tmp = key;
          key = forge.util.createBuffer();
          for (var i = 0; i < tmp.length; ++i) key.putByte(tmp[i]);
        }
        var keylen = key.length();
        if (keylen > _md.blockLength) {
          _md.start();
          _md.update(key.bytes());
          key = _md.digest();
        }
        _ipadding = forge.util.createBuffer();
        _opadding = forge.util.createBuffer();
        keylen = key.length();
        for (var i = 0; i < keylen; ++i) {
          var tmp = key.at(i);
          _ipadding.putByte(54 ^ tmp);
          _opadding.putByte(92 ^ tmp);
        }
        if (keylen < _md.blockLength) {
          var tmp = _md.blockLength - keylen;
          for (var i = 0; i < tmp; ++i) {
            _ipadding.putByte(54);
            _opadding.putByte(92);
          }
        }
        _key = key;
        _ipadding = _ipadding.bytes();
        _opadding = _opadding.bytes();
      }
      _md.start();
      _md.update(_ipadding);
    };
    ctx.update = function (bytes) {
      _md.update(bytes);
    };
    ctx.getMac = function () {
      var inner = _md.digest().bytes();
      _md.start();
      _md.update(_opadding);
      _md.update(inner);
      return _md.digest();
    };
    ctx.digest = ctx.getMac;
    return ctx;
  };
});
export { require_hmac };

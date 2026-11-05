/**
 * node-forge/lib/aesCipherSuites.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_forge } from "./forge.js";
import { require_aes } from "./aes.js";
import { require_tls } from "./tls.js";

//@ chunk-qg41pqt6.js:249906-252786 cjs-fingerprint
var require_aesCipherSuites = __commonJS(function (cjsExports, cjsModule) {
  var forge = require_forge();
  require_aes();
  require_tls();
  var tls = (cjsModule.exports = forge.tls);
  tls.CipherSuites.TLS_RSA_WITH_AES_128_CBC_SHA = {
    id: [0, 47],
    name: "TLS_RSA_WITH_AES_128_CBC_SHA",
    initSecurityParameters: function (sp) {
      sp.bulk_cipher_algorithm = tls.BulkCipherAlgorithm.aes;
      sp.cipher_type = tls.CipherType.block;
      sp.enc_key_length = 16;
      sp.block_length = 16;
      sp.fixed_iv_length = 16;
      sp.record_iv_length = 16;
      sp.mac_algorithm = tls.MACAlgorithm.hmac_sha1;
      sp.mac_length = 20;
      sp.mac_key_length = 20;
    },
    initConnectionState,
  };
  tls.CipherSuites.TLS_RSA_WITH_AES_256_CBC_SHA = {
    id: [0, 53],
    name: "TLS_RSA_WITH_AES_256_CBC_SHA",
    initSecurityParameters: function (sp) {
      sp.bulk_cipher_algorithm = tls.BulkCipherAlgorithm.aes;
      sp.cipher_type = tls.CipherType.block;
      sp.enc_key_length = 32;
      sp.block_length = 16;
      sp.fixed_iv_length = 16;
      sp.record_iv_length = 16;
      sp.mac_algorithm = tls.MACAlgorithm.hmac_sha1;
      sp.mac_length = 20;
      sp.mac_key_length = 20;
    },
    initConnectionState,
  };
  function initConnectionState(state, c, sp) {
    var client = c.entity === forge.tls.ConnectionEnd.client;
    state.read.cipherState = {
      init: false,
      cipher: forge.cipher.createDecipher(
        "AES-CBC",
        client ? sp.keys.server_write_key : sp.keys.client_write_key,
      ),
      iv: client ? sp.keys.server_write_IV : sp.keys.client_write_IV,
    };
    state.write.cipherState = {
      init: false,
      cipher: forge.cipher.createCipher(
        "AES-CBC",
        client ? sp.keys.client_write_key : sp.keys.server_write_key,
      ),
      iv: client ? sp.keys.client_write_IV : sp.keys.server_write_IV,
    };
    state.read.cipherFunction = decrypt_aes_cbc_sha1;
    state.write.cipherFunction = encrypt_aes_cbc_sha1;
    state.read.macLength = state.write.macLength = sp.mac_length;
    state.read.macFunction = state.write.macFunction = tls.hmac_sha1;
  }
  function encrypt_aes_cbc_sha1(record, s_2) {
    var rval = false;
    var mac = s_2.macFunction(s_2.macKey, s_2.sequenceNumber, record);
    record.fragment.putBytes(mac);
    s_2.updateSequenceNumber();
    var iv;
    if (record.version.minor === tls.Versions.TLS_1_0.minor)
      iv = s_2.cipherState.init ? null : s_2.cipherState.iv;
    else iv = forge.random.getBytesSync(16);
    s_2.cipherState.init = true;
    var cipher = s_2.cipherState.cipher;
    cipher.start({
      iv,
    });
    if (record.version.minor >= tls.Versions.TLS_1_1.minor) cipher.output.putBytes(iv);
    cipher.update(record.fragment);
    if (cipher.finish(encrypt_aes_cbc_sha1_padding)) {
      record.fragment = cipher.output;
      record.length = record.fragment.length();
      rval = true;
    }
    return rval;
  }
  function encrypt_aes_cbc_sha1_padding(blockSize, input, decrypt) {
    if (!decrypt) {
      var padding = blockSize - (input.length() % blockSize);
      input.fillWithByte(padding - 1, padding);
    }
    return true;
  }
  function decrypt_aes_cbc_sha1_padding(blockSize, output, decrypt) {
    var rval = true;
    if (decrypt) {
      var len = output.length();
      var paddingLength = output.last();
      for (var i = len - 1 - paddingLength; i < len - 1; ++i) rval = rval && output.at(i) == paddingLength;
      if (rval) output.truncate(paddingLength + 1);
    }
    return rval;
  }
  function decrypt_aes_cbc_sha1(record, s_2) {
    var rval = false;
    var iv;
    if (record.version.minor === tls.Versions.TLS_1_0.minor)
      iv = s_2.cipherState.init ? null : s_2.cipherState.iv;
    else iv = record.fragment.getBytes(16);
    s_2.cipherState.init = true;
    var cipher = s_2.cipherState.cipher;
    cipher.start({
      iv,
    });
    cipher.update(record.fragment);
    rval = cipher.finish(decrypt_aes_cbc_sha1_padding);
    var macLen = s_2.macLength;
    var mac = forge.random.getBytesSync(macLen);
    var len = cipher.output.length();
    if (len >= macLen) {
      record.fragment = cipher.output.getBytes(len - macLen);
      mac = cipher.output.getBytes(macLen);
    } else record.fragment = cipher.output.getBytes();
    record.fragment = forge.util.createBuffer(record.fragment);
    record.length = record.fragment.length();
    var mac2 = s_2.macFunction(s_2.macKey, s_2.sequenceNumber, record);
    s_2.updateSequenceNumber();
    rval = compareMacs(s_2.macKey, mac, mac2) && rval;
    return rval;
  }
  function compareMacs(key, mac1, mac2) {
    var hmac = forge.hmac.create();
    hmac.start("SHA1", key);
    hmac.update(mac1);
    mac1 = hmac.digest().getBytes();
    hmac.start(null, null);
    hmac.update(mac2);
    mac2 = hmac.digest().getBytes();
    return mac1 === mac2;
  }
});
export { require_aesCipherSuites };

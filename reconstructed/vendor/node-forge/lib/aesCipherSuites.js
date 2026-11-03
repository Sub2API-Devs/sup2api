/**
 * node-forge/lib/aesCipherSuites.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { Xa } from "./aes.js";
import { US } from "./tls.js";

//@ chunk-fq0cr76a.js:249438-252318 cjs-fingerprint
var $A = x(function (Ufe, MA) {
  var sl = Tn();
  Xa();
  US();
  var Di = (MA.exports = sl.tls);
  Di.CipherSuites.TLS_RSA_WITH_AES_128_CBC_SHA = {
    id: [0, 47],
    name: "TLS_RSA_WITH_AES_128_CBC_SHA",
    initSecurityParameters: function (e) {
      ((e.bulk_cipher_algorithm = Di.BulkCipherAlgorithm.aes),
        (e.cipher_type = Di.CipherType.block),
        (e.enc_key_length = 16),
        (e.block_length = 16),
        (e.fixed_iv_length = 16),
        (e.record_iv_length = 16),
        (e.mac_algorithm = Di.MACAlgorithm.hmac_sha1),
        (e.mac_length = 20),
        (e.mac_key_length = 20));
    },
    initConnectionState: FA,
  };
  Di.CipherSuites.TLS_RSA_WITH_AES_256_CBC_SHA = {
    id: [0, 53],
    name: "TLS_RSA_WITH_AES_256_CBC_SHA",
    initSecurityParameters: function (e) {
      ((e.bulk_cipher_algorithm = Di.BulkCipherAlgorithm.aes),
        (e.cipher_type = Di.CipherType.block),
        (e.enc_key_length = 32),
        (e.block_length = 16),
        (e.fixed_iv_length = 16),
        (e.record_iv_length = 16),
        (e.mac_algorithm = Di.MACAlgorithm.hmac_sha1),
        (e.mac_length = 20),
        (e.mac_key_length = 20));
    },
    initConnectionState: FA,
  };
  function FA(e, n, r) {
    var s = n.entity === sl.tls.ConnectionEnd.client;
    ((e.read.cipherState = {
      init: !1,
      cipher: sl.cipher.createDecipher("AES-CBC", s ? r.keys.server_write_key : r.keys.client_write_key),
      iv: s ? r.keys.server_write_IV : r.keys.client_write_IV,
    }),
      (e.write.cipherState = {
        init: !1,
        cipher: sl.cipher.createCipher("AES-CBC", s ? r.keys.client_write_key : r.keys.server_write_key),
        iv: s ? r.keys.client_write_IV : r.keys.server_write_IV,
      }),
      (e.read.cipherFunction = x6),
      (e.write.cipherFunction = b6),
      (e.read.macLength = e.write.macLength = r.mac_length),
      (e.read.macFunction = e.write.macFunction = Di.hmac_sha1));
  }
  function b6(e, n) {
    var r = !1,
      macFunction = n.macFunction(n.macKey, n.sequenceNumber, e);
    (e.fragment.putBytes(macFunction), n.updateSequenceNumber());
    var h;
    if (e.version.minor === Di.Versions.TLS_1_0.minor) h = n.cipherState.init ? null : n.cipherState.iv;
    else h = sl.random.getBytesSync(16);
    n.cipherState.init = !0;
    var cipher = n.cipherState.cipher;
    if ((cipher.start({ iv: h }), e.version.minor >= Di.Versions.TLS_1_1.minor)) cipher.output.putBytes(h);
    if ((cipher.update(e.fragment), cipher.finish(S6)))
      ((e.fragment = cipher.output), (e.length = e.fragment.length()), (r = !0));
    return r;
  }
  function S6(e, n, r) {
    if (!r) {
      var s = e - (n.length() % e);
      n.fillWithByte(s - 1, s);
    }
    return !0;
  }
  function E6(e, n, r) {
    var s = !0;
    if (r) {
      var h = n.length(),
        last = n.last();
      for (var b = h - 1 - last; b < h - 1; ++b) s = s && n.at(b) == last;
      if (s) n.truncate(last + 1);
    }
    return s;
  }
  function x6(e, n) {
    var r = !1,
      s;
    if (e.version.minor === Di.Versions.TLS_1_0.minor) s = n.cipherState.init ? null : n.cipherState.iv;
    else s = e.fragment.getBytes(16);
    n.cipherState.init = !0;
    var cipher = n.cipherState.cipher;
    (cipher.start({ iv: s }), cipher.update(e.fragment), (r = cipher.finish(E6)));
    var macLength = n.macLength,
      bytesSync = sl.random.getBytesSync(macLength),
      S = cipher.output.length();
    if (S >= macLength)
      ((e.fragment = cipher.output.getBytes(S - macLength)), (bytesSync = cipher.output.getBytes(macLength)));
    else e.fragment = cipher.output.getBytes();
    ((e.fragment = sl.util.createBuffer(e.fragment)), (e.length = e.fragment.length()));
    var macFunction = n.macFunction(n.macKey, n.sequenceNumber, e);
    return (n.updateSequenceNumber(), (r = _6(n.macKey, bytesSync, macFunction) && r), r);
  }
  function _6(e, n, r) {
    var create = sl.hmac.create();
    return (
      create.start("SHA1", e),
      create.update(n),
      (n = create.digest().getBytes()),
      create.start(null, null),
      create.update(r),
      (r = create.digest().getBytes()),
      n === r
    );
  }
});

export { $A };

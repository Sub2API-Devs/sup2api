/**
 * node-forge/lib/ssh.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { Xa } from "./aes.js";
import { iu } from "./hmac.js";
import { jh } from "./md5.js";
import { cu } from "./sha1.js";
import { Zn } from "./util.js";

//@ chunk-fq0cr76a.js:293009-295373 cjs-fingerprint
var yC = x(function (Kfe, gC) {
  var ts = Tn();
  Xa();
  iu();
  jh();
  cu();
  Zn();
  var ym = (gC.exports = ts.ssh = ts.ssh || {});
  ym.privateKeyToPutty = function (e, n, r) {
    ((r = r || ""), (n = n || ""));
    var s = "ssh-rsa",
      h = n === "" ? "none" : "aes256-cbc",
      y =
        "PuTTY-User-Key-File-2: " +
        s +
        `\r
`;
    ((y +=
      "Encryption: " +
      h +
      `\r
`),
      (y +=
        "Comment: " +
        r +
        `\r
`));
    var buffer = ts.util.createBuffer();
    (bu(buffer, s), Io(buffer, e.e), Io(buffer, e.n));
    var encode64 = ts.util.encode64(buffer.bytes(), 64),
      w = Math.floor(encode64.length / 66) + 1;
    ((y +=
      "Public-Lines: " +
      w +
      `\r
`),
      (y += encode64));
    var buffer_2 = ts.util.createBuffer();
    (Io(buffer_2, e.d), Io(buffer_2, e.p), Io(buffer_2, e.q), Io(buffer_2, e.qInv));
    var D;
    if (!n) D = ts.util.encode64(buffer_2.bytes(), 64);
    else {
      var O = buffer_2.length() + 16 - 1;
      O -= O % 16;
      var L = gm(buffer_2.bytes());
      (L.truncate(L.length() - O + buffer_2.length()), buffer_2.putBuffer(L));
      var buffer_3 = ts.util.createBuffer();
      (buffer_3.putBuffer(gm("\x00\x00\x00\x00", n)), buffer_3.putBuffer(gm("\x00\x00\x00\x01", n)));
      var encryptionCipher = ts.aes.createEncryptionCipher(buffer_3.truncate(8), "CBC");
      (encryptionCipher.start(ts.util.createBuffer().fillWithByte(0, 16)),
        encryptionCipher.update(buffer_2.copy()),
        encryptionCipher.finish());
      var output = encryptionCipher.output;
      (output.truncate(16), (D = ts.util.encode64(output.bytes(), 64)));
    }
    ((w = Math.floor(D.length / 66) + 1),
      (y +=
        `\r
Private-Lines: ` +
        w +
        `\r
`),
      (y += D));
    var Z = gm("putty-private-key-file-mac-key", n),
      buffer_4 = ts.util.createBuffer();
    (bu(buffer_4, s),
      bu(buffer_4, h),
      bu(buffer_4, r),
      buffer_4.putInt32(buffer.length()),
      buffer_4.putBuffer(buffer),
      buffer_4.putInt32(buffer_2.length()),
      buffer_4.putBuffer(buffer_2));
    var create = ts.hmac.create();
    return (
      create.start("sha1", Z),
      create.update(buffer_4.bytes()),
      (y +=
        `\r
Private-MAC: ` +
        create.digest().toHex() +
        `\r
`),
      y
    );
  };
  ym.publicKeyToOpenSSH = function (e, n) {
    var r = "ssh-rsa";
    n = n || "";
    var buffer = ts.util.createBuffer();
    return (
      bu(buffer, r),
      Io(buffer, e.e),
      Io(buffer, e.n),
      r + " " + ts.util.encode64(buffer.bytes()) + " " + n
    );
  };
  ym.privateKeyToOpenSSH = function (e, n) {
    if (!n) return ts.pki.privateKeyToPem(e);
    return ts.pki.encryptRsaPrivateKey(e, n, { legacy: !0, algorithm: "aes128" });
  };
  ym.getPublicKeyFingerprint = function (e, n) {
    n = n || {};
    var r = n.md || ts.md.md5.create(),
      s = "ssh-rsa",
      buffer = ts.util.createBuffer();
    (bu(buffer, s), Io(buffer, e.e), Io(buffer, e.n), r.start(), r.update(buffer.getBytes()));
    var digest = r.digest();
    if (n.encoding === "hex") {
      var toHex = digest.toHex();
      if (n.delimiter) return toHex.match(/.{2}/g).join(n.delimiter);
      return toHex;
    } else if (n.encoding === "binary") return digest.getBytes();
    else if (n.encoding) throw Error('Unknown encoding "' + n.encoding + '".');
    return digest;
  };
  function Io(e, n) {
    var str = n.toString(16);
    if (str[0] >= "8") str = "00" + str;
    var hexToBytes = ts.util.hexToBytes(str);
    (e.putInt32(hexToBytes.length), e.putBytes(hexToBytes));
  }
  function bu(e, n) {
    (e.putInt32(n.length), e.putString(n));
  }
  function gm() {
    var create = ts.md.sha1.create(),
      n = arguments.length;
    for (var r = 0; r < n; ++r) create.update(arguments[r]);
    return create.digest();
  }
});

export { yC };

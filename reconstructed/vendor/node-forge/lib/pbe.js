/**
 * node-forge/lib/pbe.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { Xa } from "./aes.js";
import { Xi } from "./asn1.js";
import { bf } from "./des.js";
import { bo } from "./md.js";
import { Ja } from "./oids.js";
import { Xh } from "./pbkdf2.js";
import { sc } from "./pem.js";
import { Ci } from "./random.js";
import { hS } from "./rc2.js";
import { xf } from "./rsa.js";
import { Zn } from "./util.js";

//@ chunk-fq0cr76a.js:139209-152921 cjs-fingerprint
var wS = x(function (Rfe, pA) {
  var Rt = Tn();
  Xa();
  Xi();
  bf();
  bo();
  Ja();
  Xh();
  sc();
  Ci();
  hS();
  xf();
  Zn();
  if (typeof vS > "u") vS = Rt.jsbn.BigInteger;
  var vS,
    asn1 = Rt.asn1,
    _n = (Rt.pki = Rt.pki || {});
  pA.exports = _n.pbe = Rt.pbe = Rt.pbe || {};
  var oids = _n.oids,
    RG = {
      name: "EncryptedPrivateKeyInfo",
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.SEQUENCE,
      constructed: !0,
      value: [
        {
          name: "EncryptedPrivateKeyInfo.encryptionAlgorithm",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.SEQUENCE,
          constructed: !0,
          value: [
            {
              name: "AlgorithmIdentifier.algorithm",
              tagClass: asn1.Class.UNIVERSAL,
              type: asn1.Type.OID,
              constructed: !1,
              capture: "encryptionOid",
            },
            {
              name: "AlgorithmIdentifier.parameters",
              tagClass: asn1.Class.UNIVERSAL,
              type: asn1.Type.SEQUENCE,
              constructed: !0,
              captureAsn1: "encryptionParams",
            },
          ],
        },
        {
          name: "EncryptedPrivateKeyInfo.encryptedData",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.OCTETSTRING,
          constructed: !1,
          capture: "encryptedData",
        },
      ],
    },
    IG = {
      name: "PBES2Algorithms",
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.SEQUENCE,
      constructed: !0,
      value: [
        {
          name: "PBES2Algorithms.keyDerivationFunc",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.SEQUENCE,
          constructed: !0,
          value: [
            {
              name: "PBES2Algorithms.keyDerivationFunc.oid",
              tagClass: asn1.Class.UNIVERSAL,
              type: asn1.Type.OID,
              constructed: !1,
              capture: "kdfOid",
            },
            {
              name: "PBES2Algorithms.params",
              tagClass: asn1.Class.UNIVERSAL,
              type: asn1.Type.SEQUENCE,
              constructed: !0,
              value: [
                {
                  name: "PBES2Algorithms.params.salt",
                  tagClass: asn1.Class.UNIVERSAL,
                  type: asn1.Type.OCTETSTRING,
                  constructed: !1,
                  capture: "kdfSalt",
                },
                {
                  name: "PBES2Algorithms.params.iterationCount",
                  tagClass: asn1.Class.UNIVERSAL,
                  type: asn1.Type.INTEGER,
                  constructed: !1,
                  capture: "kdfIterationCount",
                },
                {
                  name: "PBES2Algorithms.params.keyLength",
                  tagClass: asn1.Class.UNIVERSAL,
                  type: asn1.Type.INTEGER,
                  constructed: !1,
                  optional: !0,
                  capture: "keyLength",
                },
                {
                  name: "PBES2Algorithms.params.prf",
                  tagClass: asn1.Class.UNIVERSAL,
                  type: asn1.Type.SEQUENCE,
                  constructed: !0,
                  optional: !0,
                  value: [
                    {
                      name: "PBES2Algorithms.params.prf.algorithm",
                      tagClass: asn1.Class.UNIVERSAL,
                      type: asn1.Type.OID,
                      constructed: !1,
                      capture: "prfOid",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: "PBES2Algorithms.encryptionScheme",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.SEQUENCE,
          constructed: !0,
          value: [
            {
              name: "PBES2Algorithms.encryptionScheme.oid",
              tagClass: asn1.Class.UNIVERSAL,
              type: asn1.Type.OID,
              constructed: !1,
              capture: "encOid",
            },
            {
              name: "PBES2Algorithms.encryptionScheme.iv",
              tagClass: asn1.Class.UNIVERSAL,
              type: asn1.Type.OCTETSTRING,
              constructed: !1,
              capture: "encIv",
            },
          ],
        },
      ],
    },
    NG = {
      name: "pkcs-12PbeParams",
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.SEQUENCE,
      constructed: !0,
      value: [
        {
          name: "pkcs-12PbeParams.salt",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.OCTETSTRING,
          constructed: !1,
          capture: "salt",
        },
        {
          name: "pkcs-12PbeParams.iterations",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.INTEGER,
          constructed: !1,
          capture: "iterations",
        },
      ],
    };
  _n.encryptPrivateKeyInfo = function (e, n, r) {
    ((r = r || {}),
      (r.saltSize = r.saltSize || 8),
      (r.count = r.count || 2048),
      (r.algorithm = r.algorithm || "aes128"),
      (r.prfAlgorithm = r.prfAlgorithm || "sha1"));
    var bytesSync = Rt.random.getBytesSync(r.saltSize),
      count = r.count,
      integerToDer = asn1.integerToDer(count),
      b,
      S,
      w;
    if (r.algorithm.indexOf("aes") === 0 || r.algorithm === "des") {
      var R, D, O;
      switch (r.algorithm) {
        case "aes128":
          ((b = 16), (R = 16), (D = oids["aes128-CBC"]), (O = Rt.aes.createEncryptionCipher));
          break;
        case "aes192":
          ((b = 24), (R = 16), (D = oids["aes192-CBC"]), (O = Rt.aes.createEncryptionCipher));
          break;
        case "aes256":
          ((b = 32), (R = 16), (D = oids["aes256-CBC"]), (O = Rt.aes.createEncryptionCipher));
          break;
        case "des":
          ((b = 8), (R = 8), (D = oids.desCBC), (O = Rt.des.createEncryptionCipher));
          break;
        default:
          var L = Error("Cannot encrypt private key. Unknown encryption algorithm.");
          throw ((L.algorithm = r.algorithm), L);
      }
      var V = "hmacWith" + r.prfAlgorithm.toUpperCase(),
        K = fA(V),
        pbkdf2 = Rt.pkcs5.pbkdf2(n, bytesSync, count, b, K),
        bytesSync_2 = Rt.random.getBytesSync(R),
        encryptionCipher = O(pbkdf2);
      (encryptionCipher.start(bytesSync_2),
        encryptionCipher.update(asn1.toDer(e)),
        encryptionCipher.finish(),
        (w = encryptionCipher.output.getBytes()));
      var ie = kG(bytesSync, integerToDer, b, V);
      S = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, !1, asn1.oidToDer(oids.pkcs5PBES2).getBytes()),
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, !1, asn1.oidToDer(oids.pkcs5PBKDF2).getBytes()),
            ie,
          ]),
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, !1, asn1.oidToDer(D).getBytes()),
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, !1, bytesSync_2),
          ]),
        ]),
      ]);
    } else if (r.algorithm === "3des") {
      b = 24;
      var ae = new Rt.util.ByteBuffer(bytesSync),
        pbkdf2 = _n.pbe.generatePkcs12Key(n, ae, 1, count, b),
        bytesSync_2 = _n.pbe.generatePkcs12Key(n, ae, 2, count, b),
        encryptionCipher = Rt.des.createEncryptionCipher(pbkdf2);
      (encryptionCipher.start(bytesSync_2),
        encryptionCipher.update(asn1.toDer(e)),
        encryptionCipher.finish(),
        (w = encryptionCipher.output.getBytes()),
        (S = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
          asn1.create(
            asn1.Class.UNIVERSAL,
            asn1.Type.OID,
            !1,
            asn1.oidToDer(oids["pbeWithSHAAnd3-KeyTripleDES-CBC"]).getBytes(),
          ),
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, !1, bytesSync),
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, !1, integerToDer.getBytes()),
          ]),
        ])));
    } else {
      var L = Error("Cannot encrypt private key. Unknown encryption algorithm.");
      throw ((L.algorithm = r.algorithm), L);
    }
    var create = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
      S,
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, !1, w),
    ]);
    return create;
  };
  _n.decryptPrivateKeyInfo = function (e, n) {
    var r = null,
      s = {},
      h = [];
    if (!asn1.validate(e, RG, s, h)) {
      var y = Error(
        "Cannot read encrypted private key. ASN.1 object is not a supported EncryptedPrivateKeyInfo.",
      );
      throw ((y.errors = h), y);
    }
    var derToOid = asn1.derToOid(s.encryptionOid),
      cipher = _n.pbe.getCipher(derToOid, s.encryptionParams, n),
      buffer = Rt.util.createBuffer(s.encryptedData);
    if ((cipher.update(buffer), cipher.finish())) r = asn1.fromDer(cipher.output);
    return r;
  };
  _n.encryptedPrivateKeyToPem = function (e, n) {
    var r = { type: "ENCRYPTED PRIVATE KEY", body: asn1.toDer(e).getBytes() };
    return Rt.pem.encode(r, { maxline: n });
  };
  _n.encryptedPrivateKeyFromPem = function (e) {
    var n = Rt.pem.decode(e)[0];
    if (n.type !== "ENCRYPTED PRIVATE KEY") {
      var r = Error(
        'Could not convert encrypted private key from PEM; PEM header type is "ENCRYPTED PRIVATE KEY".',
      );
      throw ((r.headerType = n.type), r);
    }
    if (n.procType && n.procType.type === "ENCRYPTED")
      throw Error("Could not convert encrypted private key from PEM; PEM is encrypted.");
    return asn1.fromDer(n.body);
  };
  _n.encryptRsaPrivateKey = function (e, n, r) {
    if (((r = r || {}), !r.legacy)) {
      var wrapRsaPrivateKey = _n.wrapRsaPrivateKey(_n.privateKeyToAsn1(e));
      return (
        (wrapRsaPrivateKey = _n.encryptPrivateKeyInfo(wrapRsaPrivateKey, n, r)),
        _n.encryptedPrivateKeyToPem(wrapRsaPrivateKey)
      );
    }
    var h, y, b, S;
    switch (r.algorithm) {
      case "aes128":
        ((h = "AES-128-CBC"),
          (b = 16),
          (y = Rt.random.getBytesSync(16)),
          (S = Rt.aes.createEncryptionCipher));
        break;
      case "aes192":
        ((h = "AES-192-CBC"),
          (b = 24),
          (y = Rt.random.getBytesSync(16)),
          (S = Rt.aes.createEncryptionCipher));
        break;
      case "aes256":
        ((h = "AES-256-CBC"),
          (b = 32),
          (y = Rt.random.getBytesSync(16)),
          (S = Rt.aes.createEncryptionCipher));
        break;
      case "3des":
        ((h = "DES-EDE3-CBC"),
          (b = 24),
          (y = Rt.random.getBytesSync(8)),
          (S = Rt.des.createEncryptionCipher));
        break;
      case "des":
        ((h = "DES-CBC"), (b = 8), (y = Rt.random.getBytesSync(8)), (S = Rt.des.createEncryptionCipher));
        break;
      default:
        var w = Error(
          'Could not encrypt RSA private key; unsupported encryption algorithm "' + r.algorithm + '".',
        );
        throw ((w.algorithm = r.algorithm), w);
    }
    var opensslDeriveBytes = Rt.pbe.opensslDeriveBytes(n, y.substr(0, 8), b),
      D = S(opensslDeriveBytes);
    (D.start(y), D.update(asn1.toDer(_n.privateKeyToAsn1(e))), D.finish());
    var O = {
      type: "RSA PRIVATE KEY",
      procType: { version: "4", type: "ENCRYPTED" },
      dekInfo: { algorithm: h, parameters: Rt.util.bytesToHex(y).toUpperCase() },
      body: D.output.getBytes(),
    };
    return Rt.pem.encode(O);
  };
  _n.decryptRsaPrivateKey = function (e, n) {
    var r = null,
      s = Rt.pem.decode(e)[0];
    if (s.type !== "ENCRYPTED PRIVATE KEY" && s.type !== "PRIVATE KEY" && s.type !== "RSA PRIVATE KEY") {
      var h = Error(
        'Could not convert private key from PEM; PEM header type is not "ENCRYPTED PRIVATE KEY", "PRIVATE KEY", or "RSA PRIVATE KEY".',
      );
      throw ((h.headerType = h), h);
    }
    if (s.procType && s.procType.type === "ENCRYPTED") {
      var y, b;
      switch (s.dekInfo.algorithm) {
        case "DES-CBC":
          ((y = 8), (b = Rt.des.createDecryptionCipher));
          break;
        case "DES-EDE3-CBC":
          ((y = 24), (b = Rt.des.createDecryptionCipher));
          break;
        case "AES-128-CBC":
          ((y = 16), (b = Rt.aes.createDecryptionCipher));
          break;
        case "AES-192-CBC":
          ((y = 24), (b = Rt.aes.createDecryptionCipher));
          break;
        case "AES-256-CBC":
          ((y = 32), (b = Rt.aes.createDecryptionCipher));
          break;
        case "RC2-40-CBC":
          ((y = 5),
            (b = function (O) {
              return Rt.rc2.createDecryptionCipher(O, 40);
            }));
          break;
        case "RC2-64-CBC":
          ((y = 8),
            (b = function (O) {
              return Rt.rc2.createDecryptionCipher(O, 64);
            }));
          break;
        case "RC2-128-CBC":
          ((y = 16),
            (b = function (O) {
              return Rt.rc2.createDecryptionCipher(O, 128);
            }));
          break;
        default:
          var h = Error(
            'Could not decrypt private key; unsupported encryption algorithm "' + s.dekInfo.algorithm + '".',
          );
          throw ((h.algorithm = s.dekInfo.algorithm), h);
      }
      var hexToBytes = Rt.util.hexToBytes(s.dekInfo.parameters),
        opensslDeriveBytes = Rt.pbe.opensslDeriveBytes(n, hexToBytes.substr(0, 8), y),
        R = b(opensslDeriveBytes);
      if ((R.start(hexToBytes), R.update(Rt.util.createBuffer(s.body)), R.finish())) r = R.output.getBytes();
      else return r;
    } else r = s.body;
    if (s.type === "ENCRYPTED PRIVATE KEY") r = _n.decryptPrivateKeyInfo(asn1.fromDer(r), n);
    else r = asn1.fromDer(r);
    if (r !== null) r = _n.privateKeyFromAsn1(r);
    return r;
  };
  _n.pbe.generatePkcs12Key = function (e, n, r, s, h, y) {
    var b, S;
    if (typeof y > "u" || y === null) {
      if (!("sha1" in Rt.md)) throw Error('"sha1" hash algorithm unavailable.');
      y = Rt.md.sha1.create();
    }
    var digestLength = y.digestLength,
      blockLength = y.blockLength,
      D = new Rt.util.ByteBuffer(),
      O = new Rt.util.ByteBuffer();
    if (e !== null && e !== void 0) {
      for (S = 0; S < e.length; S++) O.putInt16(e.charCodeAt(S));
      O.putInt16(0);
    }
    var L = O.length(),
      V = n.length(),
      K = new Rt.util.ByteBuffer();
    K.fillWithByte(r, blockLength);
    var q = blockLength * Math.ceil(V / blockLength),
      Z = new Rt.util.ByteBuffer();
    for (S = 0; S < q; S++) Z.putByte(n.at(S % V));
    var J = blockLength * Math.ceil(L / blockLength),
      ie = new Rt.util.ByteBuffer();
    for (S = 0; S < J; S++) ie.putByte(O.at(S % L));
    var ae = Z;
    ae.putBuffer(ie);
    var ceil = Math.ceil(h / digestLength);
    for (var ue = 1; ue <= ceil; ue++) {
      var me = new Rt.util.ByteBuffer();
      (me.putBytes(K.bytes()), me.putBytes(ae.bytes()));
      for (var Ne = 0; Ne < s; Ne++) (y.start(), y.update(me.getBytes()), (me = y.digest()));
      var Ce = new Rt.util.ByteBuffer();
      for (S = 0; S < blockLength; S++) Ce.putByte(me.at(S % digestLength));
      var Ie = Math.ceil(V / blockLength) + Math.ceil(L / blockLength),
        he = new Rt.util.ByteBuffer();
      for (b = 0; b < Ie; b++) {
        var ft = new Rt.util.ByteBuffer(ae.getBytes(blockLength)),
          rt = 511;
        for (S = Ce.length() - 1; S >= 0; S--)
          ((rt = rt >> 8), (rt += Ce.at(S) + ft.at(S)), ft.setAt(S, rt & 255));
        he.putBuffer(ft);
      }
      ((ae = he), D.putBuffer(me));
    }
    return (D.truncate(D.length() - h), D);
  };
  _n.pbe.getCipher = function (e, n, r) {
    switch (e) {
      case _n.oids.pkcs5PBES2:
        return _n.pbe.getCipherForPBES2(e, n, r);
      case _n.oids["pbeWithSHAAnd3-KeyTripleDES-CBC"]:
      case _n.oids["pbewithSHAAnd40BitRC2-CBC"]:
        return _n.pbe.getCipherForPKCS12PBE(e, n, r);
      default:
        var s = Error("Cannot read encrypted PBE data block. Unsupported OID.");
        throw (
          (s.oid = e),
          (s.supportedOids = ["pkcs5PBES2", "pbeWithSHAAnd3-KeyTripleDES-CBC", "pbewithSHAAnd40BitRC2-CBC"]),
          s
        );
    }
  };
  _n.pbe.getCipherForPBES2 = function (e, n, r) {
    var s = {},
      h = [];
    if (!asn1.validate(n, IG, s, h)) {
      var y = Error(
        "Cannot read password-based-encryption algorithm parameters. ASN.1 object is not a supported EncryptedPrivateKeyInfo.",
      );
      throw ((y.errors = h), y);
    }
    if (((e = asn1.derToOid(s.kdfOid)), e !== _n.oids.pkcs5PBKDF2)) {
      var y = Error("Cannot read encrypted private key. Unsupported key derivation function OID.");
      throw ((y.oid = e), (y.supportedOids = ["pkcs5PBKDF2"]), y);
    }
    if (
      ((e = asn1.derToOid(s.encOid)),
      e !== _n.oids["aes128-CBC"] &&
        e !== _n.oids["aes192-CBC"] &&
        e !== _n.oids["aes256-CBC"] &&
        e !== _n.oids["des-EDE3-CBC"] &&
        e !== _n.oids.desCBC)
    ) {
      var y = Error("Cannot read encrypted private key. Unsupported encryption scheme OID.");
      throw (
        (y.oid = e),
        (y.supportedOids = ["aes128-CBC", "aes192-CBC", "aes256-CBC", "des-EDE3-CBC", "desCBC"]),
        y
      );
    }
    var kdfSalt = s.kdfSalt,
      buffer = Rt.util.createBuffer(s.kdfIterationCount);
    buffer = buffer.getInt(buffer.length() << 3);
    var w, R;
    switch (_n.oids[e]) {
      case "aes128-CBC":
        ((w = 16), (R = Rt.aes.createDecryptionCipher));
        break;
      case "aes192-CBC":
        ((w = 24), (R = Rt.aes.createDecryptionCipher));
        break;
      case "aes256-CBC":
        ((w = 32), (R = Rt.aes.createDecryptionCipher));
        break;
      case "des-EDE3-CBC":
        ((w = 24), (R = Rt.des.createDecryptionCipher));
        break;
      case "desCBC":
        ((w = 8), (R = Rt.des.createDecryptionCipher));
        break;
    }
    var D = dA(s.prfOid),
      pbkdf2 = Rt.pkcs5.pbkdf2(r, kdfSalt, buffer, w, D),
      encIv = s.encIv,
      V = R(pbkdf2);
    return (V.start(encIv), V);
  };
  _n.pbe.getCipherForPKCS12PBE = function (e, n, r) {
    var s = {},
      h = [];
    if (!asn1.validate(n, NG, s, h)) {
      var y = Error(
        "Cannot read password-based-encryption algorithm parameters. ASN.1 object is not a supported EncryptedPrivateKeyInfo.",
      );
      throw ((y.errors = h), y);
    }
    var buffer = Rt.util.createBuffer(s.salt),
      buffer_2 = Rt.util.createBuffer(s.iterations);
    buffer_2 = buffer_2.getInt(buffer_2.length() << 3);
    var w, R, D;
    switch (e) {
      case _n.oids["pbeWithSHAAnd3-KeyTripleDES-CBC"]:
        ((w = 24), (R = 8), (D = Rt.des.startDecrypting));
        break;
      case _n.oids["pbewithSHAAnd40BitRC2-CBC"]:
        ((w = 5),
          (R = 8),
          (D = function (q, Z) {
            var decryptionCipher = Rt.rc2.createDecryptionCipher(q, 40);
            return (decryptionCipher.start(Z, null), decryptionCipher);
          }));
        break;
      default:
        var y = Error("Cannot read PKCS #12 PBE data block. Unsupported OID.");
        throw ((y.oid = e), y);
    }
    var O = dA(s.prfOid),
      generatePkcs12Key = _n.pbe.generatePkcs12Key(r, buffer, 1, buffer_2, w, O);
    O.start();
    var generatePkcs12Key_2 = _n.pbe.generatePkcs12Key(r, buffer, 2, buffer_2, R, O);
    return D(generatePkcs12Key, generatePkcs12Key_2);
  };
  _n.pbe.opensslDeriveBytes = function (e, n, r, s) {
    if (typeof s > "u" || s === null) {
      if (!("md5" in Rt.md)) throw Error('"md5" hash algorithm unavailable.');
      s = Rt.md.md5.create();
    }
    if (n === null) n = "";
    var h = [uA(s, e + n)];
    for (var y = 16, b = 1; y < r; ++b, y += 16) h.push(uA(s, h[b - 1] + e + n));
    return h.join("").substr(0, r);
  };
  function uA(e, n) {
    return e.start().update(n).digest().getBytes();
  }
  function dA(e) {
    var n;
    if (!e) n = "hmacWithSHA1";
    else if (((n = _n.oids[asn1.derToOid(e)]), !n)) {
      var r = Error("Unsupported PRF OID.");
      throw (
        (r.oid = e),
        (r.supported = [
          "hmacWithSHA1",
          "hmacWithSHA224",
          "hmacWithSHA256",
          "hmacWithSHA384",
          "hmacWithSHA512",
        ]),
        r
      );
    }
    return fA(n);
  }
  function fA(e) {
    var md = Rt.md;
    switch (e) {
      case "hmacWithSHA224":
        md = Rt.md.sha512;
      case "hmacWithSHA1":
      case "hmacWithSHA256":
      case "hmacWithSHA384":
      case "hmacWithSHA512":
        e = e.substr(8).toLowerCase();
        break;
      default:
        var r = Error("Unsupported PRF algorithm.");
        throw (
          (r.algorithm = e),
          (r.supported = [
            "hmacWithSHA1",
            "hmacWithSHA224",
            "hmacWithSHA256",
            "hmacWithSHA384",
            "hmacWithSHA512",
          ]),
          r
        );
    }
    if (!md || !(e in md)) throw Error("Unknown hash algorithm: " + e);
    return md[e].create();
  }
  function kG(e, n, r, s) {
    var create = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, !1, e),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, !1, n.getBytes()),
    ]);
    if (s !== "hmacWithSHA1")
      create.value.push(
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, !1, Rt.util.hexToBytes(r.toString(16))),
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, !1, asn1.oidToDer(_n.oids[s]).getBytes()),
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, !1, ""),
        ]),
      );
    return create;
  }
});

export { wS };

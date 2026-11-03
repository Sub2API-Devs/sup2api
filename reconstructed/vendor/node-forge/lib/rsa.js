/**
 * node-forge/lib/rsa.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { Xi } from "./asn1.js";
import { Ef } from "./jsbn.js";
import { Ja } from "./oids.js";
import { SS } from "./pkcs1.js";
import { xS } from "./prime.js";
import { Ci } from "./random.js";
import { Zn } from "./util.js";

//@ chunk-fq0cr76a.js:120062-139209 cjs-fingerprint
var xf = x(function (Cfe, cA) {
  var Qt = Tn();
  Xi();
  Ef();
  Ja();
  SS();
  xS();
  Ci();
  Zn();
  if (typeof qn > "u") qn = Qt.jsbn.BigInteger;
  var qn,
    _S = Qt.util.isNodejs ? importMetaRequire("crypto") : null,
    { asn1: asn1, util: util } = Qt;
  Qt.pki = Qt.pki || {};
  cA.exports = Qt.pki.rsa = Qt.rsa = Qt.rsa || {};
  var pki = Qt.pki,
    SG = [6, 4, 2, 4, 2, 4, 6, 2],
    EG = {
      name: "PrivateKeyInfo",
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.SEQUENCE,
      constructed: !0,
      value: [
        {
          name: "PrivateKeyInfo.version",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.INTEGER,
          constructed: !1,
          capture: "privateKeyVersion",
        },
        {
          name: "PrivateKeyInfo.privateKeyAlgorithm",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.SEQUENCE,
          constructed: !0,
          value: [
            {
              name: "AlgorithmIdentifier.algorithm",
              tagClass: asn1.Class.UNIVERSAL,
              type: asn1.Type.OID,
              constructed: !1,
              capture: "privateKeyOid",
            },
          ],
        },
        {
          name: "PrivateKeyInfo",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.OCTETSTRING,
          constructed: !1,
          capture: "privateKey",
        },
      ],
    },
    xG = {
      name: "RSAPrivateKey",
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.SEQUENCE,
      constructed: !0,
      value: [
        {
          name: "RSAPrivateKey.version",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.INTEGER,
          constructed: !1,
          capture: "privateKeyVersion",
        },
        {
          name: "RSAPrivateKey.modulus",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.INTEGER,
          constructed: !1,
          capture: "privateKeyModulus",
        },
        {
          name: "RSAPrivateKey.publicExponent",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.INTEGER,
          constructed: !1,
          capture: "privateKeyPublicExponent",
        },
        {
          name: "RSAPrivateKey.privateExponent",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.INTEGER,
          constructed: !1,
          capture: "privateKeyPrivateExponent",
        },
        {
          name: "RSAPrivateKey.prime1",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.INTEGER,
          constructed: !1,
          capture: "privateKeyPrime1",
        },
        {
          name: "RSAPrivateKey.prime2",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.INTEGER,
          constructed: !1,
          capture: "privateKeyPrime2",
        },
        {
          name: "RSAPrivateKey.exponent1",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.INTEGER,
          constructed: !1,
          capture: "privateKeyExponent1",
        },
        {
          name: "RSAPrivateKey.exponent2",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.INTEGER,
          constructed: !1,
          capture: "privateKeyExponent2",
        },
        {
          name: "RSAPrivateKey.coefficient",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.INTEGER,
          constructed: !1,
          capture: "privateKeyCoefficient",
        },
      ],
    },
    _G = {
      name: "RSAPublicKey",
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.SEQUENCE,
      constructed: !0,
      value: [
        {
          name: "RSAPublicKey.modulus",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.INTEGER,
          constructed: !1,
          capture: "publicKeyModulus",
        },
        {
          name: "RSAPublicKey.exponent",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.INTEGER,
          constructed: !1,
          capture: "publicKeyExponent",
        },
      ],
    },
    vG = (Qt.pki.rsa.publicKeyValidator = {
      name: "SubjectPublicKeyInfo",
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.SEQUENCE,
      constructed: !0,
      captureAsn1: "subjectPublicKeyInfo",
      value: [
        {
          name: "SubjectPublicKeyInfo.AlgorithmIdentifier",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.SEQUENCE,
          constructed: !0,
          value: [
            {
              name: "AlgorithmIdentifier.algorithm",
              tagClass: asn1.Class.UNIVERSAL,
              type: asn1.Type.OID,
              constructed: !1,
              capture: "publicKeyOid",
            },
          ],
        },
        {
          name: "SubjectPublicKeyInfo.subjectPublicKey",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.BITSTRING,
          constructed: !1,
          value: [
            {
              name: "SubjectPublicKeyInfo.subjectPublicKey.RSAPublicKey",
              tagClass: asn1.Class.UNIVERSAL,
              type: asn1.Type.SEQUENCE,
              constructed: !0,
              optional: !0,
              captureAsn1: "rsaPublicKey",
            },
          ],
        },
      ],
    }),
    wG = {
      name: "DigestInfo",
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.SEQUENCE,
      constructed: !0,
      value: [
        {
          name: "DigestInfo.DigestAlgorithm",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.SEQUENCE,
          constructed: !0,
          value: [
            {
              name: "DigestInfo.DigestAlgorithm.algorithmIdentifier",
              tagClass: asn1.Class.UNIVERSAL,
              type: asn1.Type.OID,
              constructed: !1,
              capture: "algorithmIdentifier",
            },
            {
              name: "DigestInfo.DigestAlgorithm.parameters",
              tagClass: asn1.Class.UNIVERSAL,
              type: asn1.Type.NULL,
              capture: "parameters",
              optional: !0,
              constructed: !1,
            },
          ],
        },
        {
          name: "DigestInfo.digest",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.OCTETSTRING,
          constructed: !1,
          capture: "digest",
        },
      ],
    },
    TG = function (e) {
      var n;
      if (e.algorithm in pki.oids) n = pki.oids[e.algorithm];
      else {
        var r = Error("Unknown message digest algorithm.");
        throw ((r.algorithm = e.algorithm), r);
      }
      var bytes = asn1.oidToDer(n).getBytes(),
        create = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, []),
        create_2 = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, []);
      (create_2.value.push(asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, !1, bytes)),
        create_2.value.push(asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, !1, "")));
      var create_3 = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, !1, e.digest().getBytes());
      return (create.value.push(create_2), create.value.push(create_3), asn1.toDer(create).getBytes());
    },
    aA = function (e, n, r) {
      if (r) return e.modPow(n.e, n.n);
      if (!n.p || !n.q) return e.modPow(n.d, n.n);
      if (!n.dP) n.dP = n.d.mod(n.p.subtract(qn.ONE));
      if (!n.dQ) n.dQ = n.d.mod(n.q.subtract(qn.ONE));
      if (!n.qInv) n.qInv = n.q.modInverse(n.p);
      var s;
      do s = new qn(Qt.util.bytesToHex(Qt.random.getBytes(n.n.bitLength() / 8)), 16);
      while (s.compareTo(n.n) >= 0 || !s.gcd(n.n).equals(qn.ONE));
      e = e.multiply(s.modPow(n.e, n.n)).mod(n.n);
      var modPow = e.mod(n.p).modPow(n.dP, n.p),
        modPow_2 = e.mod(n.q).modPow(n.dQ, n.q);
      while (modPow.compareTo(modPow_2) < 0) modPow = modPow.add(n.p);
      var b = modPow.subtract(modPow_2).multiply(n.qInv).mod(n.p).multiply(n.q).add(modPow_2);
      return ((b = b.multiply(s.modInverse(n.n)).mod(n.n)), b);
    };
  pki.rsa.encrypt = function (e, n, r) {
    var s = r,
      h,
      ceil = Math.ceil(n.n.bitLength() / 8);
    if (r !== !1 && r !== !0) ((s = r === 2), (h = lA(e, n, r)));
    else ((h = Qt.util.createBuffer()), h.putBytes(e));
    var b = new qn(h.toHex(), 16),
      S = aA(b, n, s),
      str = S.toString(16),
      buffer = Qt.util.createBuffer(),
      D = ceil - Math.ceil(str.length / 2);
    while (D > 0) (buffer.putByte(0), --D);
    return (buffer.putBytes(Qt.util.hexToBytes(str)), buffer.getBytes());
  };
  pki.rsa.decrypt = function (e, n, r, s) {
    var ceil = Math.ceil(n.n.bitLength() / 8);
    if (e.length !== ceil) {
      var y = Error("Encrypted message length is invalid.");
      throw ((y.length = e.length), (y.expected = ceil), y);
    }
    var b = new qn(Qt.util.createBuffer(e).toHex(), 16);
    if (b.compareTo(n.n) >= 0) throw Error("Encrypted message is invalid.");
    var S = aA(b, n, r),
      str = S.toString(16),
      buffer = Qt.util.createBuffer(),
      D = ceil - Math.ceil(str.length / 2);
    while (D > 0) (buffer.putByte(0), --D);
    if ((buffer.putBytes(Qt.util.hexToBytes(str)), s !== !1)) return nm(buffer.getBytes(), n, r);
    return buffer.getBytes();
  };
  pki.rsa.createKeyPairGenerationState = function (e, n, r) {
    if (typeof e === "string") e = parseInt(e, 10);
    ((e = e || 2048), (r = r || {}));
    var s = r.prng || Qt.random,
      h = {
        nextBytes: function (S) {
          var bytesSync = s.getBytesSync(S.length);
          for (var R = 0; R < S.length; ++R) S[R] = bytesSync.charCodeAt(R);
        },
      },
      y = r.algorithm || "PRIMEINC",
      b;
    if (y === "PRIMEINC")
      ((b = {
        algorithm: y,
        state: 0,
        bits: e,
        rng: h,
        eInt: n || 65537,
        e: new qn(null),
        p: null,
        q: null,
        qBits: e >> 1,
        pBits: e - (e >> 1),
        pqState: 0,
        num: null,
        keys: null,
      }),
        b.e.fromInt(b.eInt));
    else throw Error("Invalid key generation algorithm: " + y);
    return b;
  };
  pki.rsa.stepKeyPairGenerationState = function (e, n) {
    if (!("algorithm" in e)) e.algorithm = "PRIMEINC";
    var r = new qn(null);
    r.fromInt(30);
    var s = 0,
      h = function (O, L) {
        return O | L;
      },
      y = +new Date(),
      b,
      S = 0;
    while (e.keys === null && (n <= 0 || S < n)) {
      if (e.state === 0) {
        var w = e.p === null ? e.pBits : e.qBits,
          R = w - 1;
        if (e.pqState === 0) {
          if (((e.num = new qn(w, e.rng)), !e.num.testBit(R))) e.num.bitwiseTo(qn.ONE.shiftLeft(R), h, e.num);
          (e.num.dAddOffset(31 - e.num.mod(r).byteValue(), 0), (s = 0), ++e.pqState);
        } else if (e.pqState === 1)
          if (e.num.bitLength() > w) e.pqState = 0;
          else if (e.num.isProbablePrime(CG(e.num.bitLength()))) ++e.pqState;
          else e.num.dAddOffset(SG[s++ % 8], 0);
        else if (e.pqState === 2) e.pqState = e.num.subtract(qn.ONE).gcd(e.e).compareTo(qn.ONE) === 0 ? 3 : 0;
        else if (e.pqState === 3) {
          if (((e.pqState = 0), e.p === null)) e.p = e.num;
          else e.q = e.num;
          if (e.p !== null && e.q !== null) ++e.state;
          e.num = null;
        }
      } else if (e.state === 1) {
        if (e.p.compareTo(e.q) < 0) ((e.num = e.p), (e.p = e.q), (e.q = e.num));
        ++e.state;
      } else if (e.state === 2)
        ((e.p1 = e.p.subtract(qn.ONE)),
          (e.q1 = e.q.subtract(qn.ONE)),
          (e.phi = e.p1.multiply(e.q1)),
          ++e.state);
      else if (e.state === 3)
        if (e.phi.gcd(e.e).compareTo(qn.ONE) === 0) ++e.state;
        else ((e.p = null), (e.q = null), (e.state = 0));
      else if (e.state === 4)
        if (((e.n = e.p.multiply(e.q)), e.n.bitLength() === e.bits)) ++e.state;
        else ((e.q = null), (e.state = 0));
      else if (e.state === 5) {
        var modInverse = e.e.modInverse(e.phi);
        e.keys = {
          privateKey: pki.rsa.setPrivateKey(
            e.n,
            e.e,
            modInverse,
            e.p,
            e.q,
            modInverse.mod(e.p1),
            modInverse.mod(e.q1),
            e.q.modInverse(e.p),
          ),
          publicKey: pki.rsa.setPublicKey(e.n, e.e),
        };
      }
      ((b = +new Date()), (S += b - y), (y = b));
    }
    return e.keys !== null;
  };
  pki.rsa.generateKeyPair = function (e, n, r, s) {
    if (arguments.length === 1) {
      if (typeof e === "object") ((r = e), (e = void 0));
      else if (typeof e === "function") ((s = e), (e = void 0));
    } else if (arguments.length === 2)
      if (typeof e === "number") {
        if (typeof n === "function") ((s = n), (n = void 0));
        else if (typeof n !== "number") ((r = n), (n = void 0));
      } else ((r = e), (s = n), (e = void 0), (n = void 0));
    else if (arguments.length === 3)
      if (typeof n === "number") {
        if (typeof r === "function") ((s = r), (r = void 0));
      } else ((s = r), (r = n), (n = void 0));
    if (((r = r || {}), e === void 0)) e = r.bits || 2048;
    if (n === void 0) n = r.e || 65537;
    if (!Qt.options.usePureJavaScript && !r.prng && e >= 256 && e <= 16384 && (n === 65537 || n === 3)) {
      if (s) {
        if (rA("generateKeyPair"))
          return _S.generateKeyPair(
            "rsa",
            {
              modulusLength: e,
              publicExponent: n,
              publicKeyEncoding: { type: "spki", format: "pem" },
              privateKeyEncoding: { type: "pkcs8", format: "pem" },
            },
            function (S, w, R) {
              if (S) return s(S);
              s(null, { privateKey: pki.privateKeyFromPem(R), publicKey: pki.publicKeyFromPem(w) });
            },
          );
        if (sA("generateKey") && sA("exportKey"))
          return util.globalScope.crypto.subtle
            .generateKey(
              {
                name: "RSASSA-PKCS1-v1_5",
                modulusLength: e,
                publicExponent: oA(n),
                hash: { name: "SHA-256" },
              },
              !0,
              ["sign", "verify"],
            )
            .then(function (S) {
              return util.globalScope.crypto.subtle.exportKey("pkcs8", S.privateKey);
            })
            .then(void 0, function (S) {
              s(S);
            })
            .then(function (S) {
              if (S) {
                var privateKeyFromAsn1 = pki.privateKeyFromAsn1(asn1.fromDer(Qt.util.createBuffer(S)));
                s(null, {
                  privateKey: privateKeyFromAsn1,
                  publicKey: pki.setRsaPublicKey(privateKeyFromAsn1.n, privateKeyFromAsn1.e),
                });
              }
            });
        if (iA("generateKey") && iA("exportKey")) {
          var generateKey = util.globalScope.msCrypto.subtle.generateKey(
            { name: "RSASSA-PKCS1-v1_5", modulusLength: e, publicExponent: oA(n), hash: { name: "SHA-256" } },
            !0,
            ["sign", "verify"],
          );
          ((generateKey.oncomplete = function (S) {
            var w = S.target.result,
              exportKey = util.globalScope.msCrypto.subtle.exportKey("pkcs8", w.privateKey);
            ((exportKey.oncomplete = function (D) {
              var O = D.target.result,
                privateKeyFromAsn1 = pki.privateKeyFromAsn1(asn1.fromDer(Qt.util.createBuffer(O)));
              s(null, {
                privateKey: privateKeyFromAsn1,
                publicKey: pki.setRsaPublicKey(privateKeyFromAsn1.n, privateKeyFromAsn1.e),
              });
            }),
              (exportKey.onerror = function (D) {
                s(D);
              }));
          }),
            (generateKey.onerror = function (S) {
              s(S);
            }));
          return;
        }
      } else if (rA("generateKeyPairSync")) {
        var generateKeyPairSync = _S.generateKeyPairSync("rsa", {
          modulusLength: e,
          publicExponent: n,
          publicKeyEncoding: { type: "spki", format: "pem" },
          privateKeyEncoding: { type: "pkcs8", format: "pem" },
        });
        return {
          privateKey: pki.privateKeyFromPem(generateKeyPairSync.privateKey),
          publicKey: pki.publicKeyFromPem(generateKeyPairSync.publicKey),
        };
      }
    }
    var keyPairGenerationState = pki.rsa.createKeyPairGenerationState(e, n, r);
    if (!s)
      return (pki.rsa.stepKeyPairGenerationState(keyPairGenerationState, 0), keyPairGenerationState.keys);
    AG(keyPairGenerationState, r, s);
  };
  pki.setRsaPublicKey = pki.rsa.setPublicKey = function (e, n) {
    var r = { n: e, e: n };
    return (
      (r.encrypt = function (s, h, y) {
        if (typeof h === "string") h = h.toUpperCase();
        else if (h === void 0) h = "RSAES-PKCS1-V1_5";
        if (h === "RSAES-PKCS1-V1_5")
          h = {
            encode: function (S, w, R) {
              return lA(S, w, 2).getBytes();
            },
          };
        else if (h === "RSA-OAEP" || h === "RSAES-OAEP")
          h = {
            encode: function (S, w) {
              return Qt.pkcs1.encode_rsa_oaep(w, S, y);
            },
          };
        else if (["RAW", "NONE", "NULL", null].indexOf(h) !== -1)
          h = {
            encode: function (S) {
              return S;
            },
          };
        else if (typeof h === "string") throw Error('Unsupported encryption scheme: "' + h + '".');
        var encode = h.encode(s, r, !0);
        return pki.rsa.encrypt(encode, r, !0);
      }),
      (r.verify = function (s, h, y, b) {
        if (typeof y === "string") y = y.toUpperCase();
        else if (y === void 0) y = "RSASSA-PKCS1-V1_5";
        if (b === void 0) b = { _parseAllDigestBytes: !0, _skipPaddingChecks: !1 };
        if (!("_parseAllDigestBytes" in b)) b._parseAllDigestBytes = !0;
        if (!("_skipPaddingChecks" in b)) b._skipPaddingChecks = !1;
        if (y === "RSASSA-PKCS1-V1_5")
          y = {
            verify: function (w, R) {
              R = nm(R, r, !0, void 0, b);
              var fromDer = asn1.fromDer(R, { parseAllBytes: b._parseAllDigestBytes }),
                O = {},
                L = [];
              if (!asn1.validate(fromDer, wG, O, L) || fromDer.value.length !== 2) {
                var V = Error("ASN.1 object does not contain a valid RSASSA-PKCS1-v1_5 DigestInfo value.");
                throw ((V.errors = L), V);
              }
              var derToOid = asn1.derToOid(O.algorithmIdentifier);
              if (!(
                derToOid === Qt.oids.md2 ||
                derToOid === Qt.oids.md5 ||
                derToOid === Qt.oids.sha1 ||
                derToOid === Qt.oids.sha224 ||
                derToOid === Qt.oids.sha256 ||
                derToOid === Qt.oids.sha384 ||
                derToOid === Qt.oids.sha512 ||
                derToOid === Qt.oids["sha512-224"] ||
                derToOid === Qt.oids["sha512-256"]
              )) {
                var V = Error("Unknown RSASSA-PKCS1-v1_5 DigestAlgorithm identifier.");
                throw ((V.oid = derToOid), V);
              }
              if (derToOid === Qt.oids.md2 || derToOid === Qt.oids.md5) {
                if (!("parameters" in O))
                  throw Error(
                    "ASN.1 object does not contain a valid RSASSA-PKCS1-v1_5 DigestInfo value. Missing algorithm identifier NULL parameters.",
                  );
              }
              return w === O.digest;
            },
          };
        else if (y === "NONE" || y === "NULL" || y === null)
          y = {
            verify: function (w, R) {
              return ((R = nm(R, r, !0, void 0, b)), w === R);
            },
          };
        var decrypt = pki.rsa.decrypt(h, r, !0, !1);
        return y.verify(s, decrypt, r.n.bitLength());
      }),
      r
    );
  };
  pki.setRsaPrivateKey = pki.rsa.setPrivateKey = function (e, n, r, s, h, y, b, S) {
    var w = { n: e, e: n, d: r, p: s, q: h, dP: y, dQ: b, qInv: S };
    return (
      (w.decrypt = function (R, D, O) {
        if (typeof D === "string") D = D.toUpperCase();
        else if (D === void 0) D = "RSAES-PKCS1-V1_5";
        var decrypt = pki.rsa.decrypt(R, w, !1, !1);
        if (D === "RSAES-PKCS1-V1_5") D = { decode: nm };
        else if (D === "RSA-OAEP" || D === "RSAES-OAEP")
          D = {
            decode: function (V, K) {
              return Qt.pkcs1.decode_rsa_oaep(K, V, O);
            },
          };
        else if (["RAW", "NONE", "NULL", null].indexOf(D) !== -1)
          D = {
            decode: function (V) {
              return V;
            },
          };
        else throw Error('Unsupported encryption scheme: "' + D + '".');
        return D.decode(decrypt, w, !1);
      }),
      (w.sign = function (R, D) {
        var O = !1;
        if (typeof D === "string") D = D.toUpperCase();
        if (D === void 0 || D === "RSASSA-PKCS1-V1_5") ((D = { encode: TG }), (O = 1));
        else if (D === "NONE" || D === "NULL" || D === null)
          ((D = {
            encode: function () {
              return R;
            },
          }),
            (O = 1));
        var encode = D.encode(R, w.n.bitLength());
        return pki.rsa.encrypt(encode, w, O);
      }),
      w
    );
  };
  pki.wrapRsaPrivateKey = function (e) {
    return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, !1, asn1.integerToDer(0).getBytes()),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
        asn1.create(
          asn1.Class.UNIVERSAL,
          asn1.Type.OID,
          !1,
          asn1.oidToDer(pki.oids.rsaEncryption).getBytes(),
        ),
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, !1, ""),
      ]),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, !1, asn1.toDer(e).getBytes()),
    ]);
  };
  pki.privateKeyFromAsn1 = function (e) {
    var n = {},
      r = [];
    if (asn1.validate(e, EG, n, r)) e = asn1.fromDer(Qt.util.createBuffer(n.privateKey));
    if (((n = {}), (r = []), !asn1.validate(e, xG, n, r))) {
      var s = Error("Cannot read private key. ASN.1 object does not contain an RSAPrivateKey.");
      throw ((s.errors = r), s);
    }
    var h, y, b, S, w, R, D, O;
    return (
      (h = Qt.util.createBuffer(n.privateKeyModulus).toHex()),
      (y = Qt.util.createBuffer(n.privateKeyPublicExponent).toHex()),
      (b = Qt.util.createBuffer(n.privateKeyPrivateExponent).toHex()),
      (S = Qt.util.createBuffer(n.privateKeyPrime1).toHex()),
      (w = Qt.util.createBuffer(n.privateKeyPrime2).toHex()),
      (R = Qt.util.createBuffer(n.privateKeyExponent1).toHex()),
      (D = Qt.util.createBuffer(n.privateKeyExponent2).toHex()),
      (O = Qt.util.createBuffer(n.privateKeyCoefficient).toHex()),
      pki.setRsaPrivateKey(
        new qn(h, 16),
        new qn(y, 16),
        new qn(b, 16),
        new qn(S, 16),
        new qn(w, 16),
        new qn(R, 16),
        new qn(D, 16),
        new qn(O, 16),
      )
    );
  };
  pki.privateKeyToAsn1 = pki.privateKeyToRSAPrivateKey = function (e) {
    return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, !1, asn1.integerToDer(0).getBytes()),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, !1, Co(e.n)),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, !1, Co(e.e)),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, !1, Co(e.d)),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, !1, Co(e.p)),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, !1, Co(e.q)),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, !1, Co(e.dP)),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, !1, Co(e.dQ)),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, !1, Co(e.qInv)),
    ]);
  };
  pki.publicKeyFromAsn1 = function (e) {
    var n = {},
      r = [];
    if (asn1.validate(e, vG, n, r)) {
      var derToOid = asn1.derToOid(n.publicKeyOid);
      if (derToOid !== pki.oids.rsaEncryption) {
        var h = Error("Cannot read public key. Unknown OID.");
        throw ((h.oid = derToOid), h);
      }
      e = n.rsaPublicKey;
    }
    if (((r = []), !asn1.validate(e, _G, n, r))) {
      var h = Error("Cannot read public key. ASN.1 object does not contain an RSAPublicKey.");
      throw ((h.errors = r), h);
    }
    var toHex = Qt.util.createBuffer(n.publicKeyModulus).toHex(),
      toHex_2 = Qt.util.createBuffer(n.publicKeyExponent).toHex();
    return pki.setRsaPublicKey(new qn(toHex, 16), new qn(toHex_2, 16));
  };
  pki.publicKeyToAsn1 = pki.publicKeyToSubjectPublicKeyInfo = function (e) {
    return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
        asn1.create(
          asn1.Class.UNIVERSAL,
          asn1.Type.OID,
          !1,
          asn1.oidToDer(pki.oids.rsaEncryption).getBytes(),
        ),
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, !1, ""),
      ]),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.BITSTRING, !1, [pki.publicKeyToRSAPublicKey(e)]),
    ]);
  };
  pki.publicKeyToRSAPublicKey = function (e) {
    return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, !1, Co(e.n)),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, !1, Co(e.e)),
    ]);
  };
  function lA(e, n, r) {
    var buffer = Qt.util.createBuffer(),
      ceil = Math.ceil(n.n.bitLength() / 8);
    if (e.length > ceil - 11) {
      var y = Error("Message is too long for PKCS#1 v1.5 padding.");
      throw ((y.length = e.length), (y.max = ceil - 11), y);
    }
    (buffer.putByte(0), buffer.putByte(r));
    var b = ceil - 3 - e.length,
      S;
    if (r === 0 || r === 1) {
      S = r === 0 ? 0 : 255;
      for (var w = 0; w < b; ++w) buffer.putByte(S);
    } else
      while (b > 0) {
        var R = 0,
          bytes = Qt.random.getBytes(b);
        for (var w = 0; w < b; ++w)
          if (((S = bytes.charCodeAt(w)), S === 0)) ++R;
          else buffer.putByte(S);
        b = R;
      }
    return (buffer.putByte(0), buffer.putBytes(e), buffer);
  }
  function nm(e, n, r, s, h) {
    var ceil = Math.ceil(n.n.bitLength() / 8),
      buffer = Qt.util.createBuffer(e),
      byte = buffer.getByte(),
      byte_2 = buffer.getByte();
    if (
      byte !== 0 ||
      (r && byte_2 !== 0 && byte_2 !== 1) ||
      (!r && byte_2 !== 2) ||
      (r && byte_2 === 0 && typeof s > "u")
    )
      throw Error("Encryption block is invalid.");
    var R = 0;
    if (byte_2 === 0) {
      R = ceil - 3 - s;
      for (var D = 0; D < R; ++D) if (buffer.getByte() !== 0) throw Error("Encryption block is invalid.");
    } else if (byte_2 === 1) {
      R = 0;
      while (buffer.length() > 1) {
        if (buffer.getByte() !== 255) {
          --buffer.read;
          break;
        }
        ++R;
      }
      if (R < 8 && !(h ? h._skipPaddingChecks : !1)) throw Error("Encryption block is invalid.");
    } else if (byte_2 === 2) {
      R = 0;
      while (buffer.length() > 1) {
        if (buffer.getByte() === 0) {
          --buffer.read;
          break;
        }
        ++R;
      }
      if (R < 8 && !(h ? h._skipPaddingChecks : !1)) throw Error("Encryption block is invalid.");
    }
    var byte_3 = buffer.getByte();
    if (byte_3 !== 0 || R !== ceil - 3 - buffer.length()) throw Error("Encryption block is invalid.");
    return buffer.getBytes();
  }
  function AG(e, n, r) {
    if (typeof n === "function") ((r = n), (n = {}));
    n = n || {};
    var s = {
      algorithm: {
        name: n.algorithm || "PRIMEINC",
        options: { workers: n.workers || 2, workLoad: n.workLoad || 100, workerScript: n.workerScript },
      },
    };
    if ("prng" in n) s.prng = n.prng;
    h();
    function h() {
      y(e.pBits, function (S, w) {
        if (S) return r(S);
        if (((e.p = w), e.q !== null)) return b(S, e.q);
        y(e.qBits, b);
      });
    }
    function y(S, w) {
      Qt.prime.generateProbablePrime(S, s, w);
    }
    function b(S, w) {
      if (S) return r(S);
      if (((e.q = w), e.p.compareTo(e.q) < 0)) {
        var R = e.p;
        ((e.p = e.q), (e.q = R));
      }
      if (e.p.subtract(qn.ONE).gcd(e.e).compareTo(qn.ONE) !== 0) {
        ((e.p = null), h());
        return;
      }
      if (e.q.subtract(qn.ONE).gcd(e.e).compareTo(qn.ONE) !== 0) {
        ((e.q = null), y(e.qBits, b));
        return;
      }
      if (
        ((e.p1 = e.p.subtract(qn.ONE)),
        (e.q1 = e.q.subtract(qn.ONE)),
        (e.phi = e.p1.multiply(e.q1)),
        e.phi.gcd(e.e).compareTo(qn.ONE) !== 0)
      ) {
        ((e.p = e.q = null), h());
        return;
      }
      if (((e.n = e.p.multiply(e.q)), e.n.bitLength() !== e.bits)) {
        ((e.q = null), y(e.qBits, b));
        return;
      }
      var modInverse = e.e.modInverse(e.phi);
      ((e.keys = {
        privateKey: pki.rsa.setPrivateKey(
          e.n,
          e.e,
          modInverse,
          e.p,
          e.q,
          modInverse.mod(e.p1),
          modInverse.mod(e.q1),
          e.q.modInverse(e.p),
        ),
        publicKey: pki.rsa.setPublicKey(e.n, e.e),
      }),
        r(null, e.keys));
    }
  }
  function Co(e) {
    var str = e.toString(16);
    if (str[0] >= "8") str = "00" + str;
    var hexToBytes = Qt.util.hexToBytes(str);
    if (
      hexToBytes.length > 1 &&
      ((hexToBytes.charCodeAt(0) === 0 && (hexToBytes.charCodeAt(1) & 128) === 0) ||
        (hexToBytes.charCodeAt(0) === 255 && (hexToBytes.charCodeAt(1) & 128) === 128))
    )
      return hexToBytes.substr(1);
    return hexToBytes;
  }
  function CG(e) {
    if (e <= 100) return 27;
    if (e <= 150) return 18;
    if (e <= 200) return 15;
    if (e <= 250) return 12;
    if (e <= 300) return 9;
    if (e <= 350) return 8;
    if (e <= 400) return 7;
    if (e <= 500) return 6;
    if (e <= 600) return 5;
    if (e <= 800) return 4;
    if (e <= 1250) return 3;
    return 2;
  }
  function rA(e) {
    return Qt.util.isNodejs && typeof _S[e] === "function";
  }
  function sA(e) {
    return (
      typeof util.globalScope < "u" &&
      typeof util.globalScope.crypto === "object" &&
      typeof util.globalScope.crypto.subtle === "object" &&
      typeof util.globalScope.crypto.subtle[e] === "function"
    );
  }
  function iA(e) {
    return (
      typeof util.globalScope < "u" &&
      typeof util.globalScope.msCrypto === "object" &&
      typeof util.globalScope.msCrypto.subtle === "object" &&
      typeof util.globalScope.msCrypto.subtle[e] === "function"
    );
  }
  function oA(e) {
    var hexToBytes = Qt.util.hexToBytes(e.toString(16)),
      uint8Array = new Uint8Array(hexToBytes.length);
    for (var s = 0; s < hexToBytes.length; ++s) uint8Array[s] = hexToBytes.charCodeAt(s);
    return uint8Array;
  }
});

export { xf };

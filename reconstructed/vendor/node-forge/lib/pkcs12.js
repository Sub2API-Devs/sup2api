/**
 * node-forge/lib/pkcs12.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { Xi } from "./asn1.js";
import { iu } from "./hmac.js";
import { Ja } from "./oids.js";
import { TS } from "./pkcs7asn1.js";
import { wS } from "./pbe.js";
import { Ci } from "./random.js";
import { xf } from "./rsa.js";
import { cu } from "./sha1.js";
import { Zn } from "./util.js";
import { am } from "./x509.js";

//@ chunk-fq0cr76a.js:198140-210710 cjs-fingerprint
var IS = x(function (Pfe, RA) {
  var Er = Tn();
  Xi();
  iu();
  Ja();
  TS();
  wS();
  Ci();
  xf();
  cu();
  Zn();
  am();
  var { asn1: asn1, pki: pki } = Er,
    vf = (RA.exports = Er.pkcs12 = Er.pkcs12 || {}),
    CA = {
      name: "ContentInfo",
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.SEQUENCE,
      constructed: !0,
      value: [
        {
          name: "ContentInfo.contentType",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.OID,
          constructed: !1,
          capture: "contentType",
        },
        {
          name: "ContentInfo.content",
          tagClass: asn1.Class.CONTEXT_SPECIFIC,
          constructed: !0,
          captureAsn1: "content",
        },
      ],
    },
    WG = {
      name: "PFX",
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.SEQUENCE,
      constructed: !0,
      value: [
        {
          name: "PFX.version",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.INTEGER,
          constructed: !1,
          capture: "version",
        },
        CA,
        {
          name: "PFX.macData",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.SEQUENCE,
          constructed: !0,
          optional: !0,
          captureAsn1: "mac",
          value: [
            {
              name: "PFX.macData.mac",
              tagClass: asn1.Class.UNIVERSAL,
              type: asn1.Type.SEQUENCE,
              constructed: !0,
              value: [
                {
                  name: "PFX.macData.mac.digestAlgorithm",
                  tagClass: asn1.Class.UNIVERSAL,
                  type: asn1.Type.SEQUENCE,
                  constructed: !0,
                  value: [
                    {
                      name: "PFX.macData.mac.digestAlgorithm.algorithm",
                      tagClass: asn1.Class.UNIVERSAL,
                      type: asn1.Type.OID,
                      constructed: !1,
                      capture: "macAlgorithm",
                    },
                    {
                      name: "PFX.macData.mac.digestAlgorithm.parameters",
                      optional: !0,
                      tagClass: asn1.Class.UNIVERSAL,
                      captureAsn1: "macAlgorithmParameters",
                    },
                  ],
                },
                {
                  name: "PFX.macData.mac.digest",
                  tagClass: asn1.Class.UNIVERSAL,
                  type: asn1.Type.OCTETSTRING,
                  constructed: !1,
                  capture: "macDigest",
                },
              ],
            },
            {
              name: "PFX.macData.macSalt",
              tagClass: asn1.Class.UNIVERSAL,
              type: asn1.Type.OCTETSTRING,
              constructed: !1,
              capture: "macSalt",
            },
            {
              name: "PFX.macData.iterations",
              tagClass: asn1.Class.UNIVERSAL,
              type: asn1.Type.INTEGER,
              constructed: !1,
              optional: !0,
              capture: "macIterations",
            },
          ],
        },
      ],
    },
    GG = {
      name: "SafeBag",
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.SEQUENCE,
      constructed: !0,
      value: [
        {
          name: "SafeBag.bagId",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.OID,
          constructed: !1,
          capture: "bagId",
        },
        {
          name: "SafeBag.bagValue",
          tagClass: asn1.Class.CONTEXT_SPECIFIC,
          constructed: !0,
          captureAsn1: "bagValue",
        },
        {
          name: "SafeBag.bagAttributes",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.SET,
          constructed: !0,
          optional: !0,
          capture: "bagAttributes",
        },
      ],
    },
    HG = {
      name: "Attribute",
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.SEQUENCE,
      constructed: !0,
      value: [
        {
          name: "Attribute.attrId",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.OID,
          constructed: !1,
          capture: "oid",
        },
        {
          name: "Attribute.attrValues",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.SET,
          constructed: !0,
          capture: "values",
        },
      ],
    },
    KG = {
      name: "CertBag",
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.SEQUENCE,
      constructed: !0,
      value: [
        {
          name: "CertBag.certId",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.OID,
          constructed: !1,
          capture: "certId",
        },
        {
          name: "CertBag.certValue",
          tagClass: asn1.Class.CONTEXT_SPECIFIC,
          constructed: !0,
          value: [
            {
              name: "CertBag.certValue[0]",
              tagClass: asn1.Class.UNIVERSAL,
              type: asn1.Class.OCTETSTRING,
              constructed: !1,
              capture: "cert",
            },
          ],
        },
      ],
    };
  function _f(e, n, r, s) {
    var h = [];
    for (var y = 0; y < e.length; y++)
      for (var b = 0; b < e[y].safeBags.length; b++) {
        var S = e[y].safeBags[b];
        if (s !== void 0 && S.type !== s) continue;
        if (n === null) {
          h.push(S);
          continue;
        }
        if (S.attributes[n] !== void 0 && S.attributes[n].indexOf(r) >= 0) h.push(S);
      }
    return h;
  }
  vf.pkcs12FromAsn1 = function (e, n, r) {
    if (typeof n === "string") ((r = n), (n = !0));
    else if (n === void 0) n = !0;
    var s = {},
      h = [];
    if (!asn1.validate(e, WG, s, h)) {
      var y = Error("Cannot read PKCS#12 PFX. ASN.1 object is not an PKCS#12 PFX.");
      throw ((y.errors = y), y);
    }
    var b = {
      version: s.version.charCodeAt(0),
      safeContents: [],
      getBags: function (Z) {
        var J = {},
          ie;
        if ("localKeyId" in Z) ie = Z.localKeyId;
        else if ("localKeyIdHex" in Z) ie = Er.util.hexToBytes(Z.localKeyIdHex);
        if (ie === void 0 && !("friendlyName" in Z) && "bagType" in Z)
          J[Z.bagType] = _f(b.safeContents, null, null, Z.bagType);
        if (ie !== void 0) J.localKeyId = _f(b.safeContents, "localKeyId", ie, Z.bagType);
        if ("friendlyName" in Z)
          J.friendlyName = _f(b.safeContents, "friendlyName", Z.friendlyName, Z.bagType);
        return J;
      },
      getBagsByFriendlyName: function (Z, J) {
        return _f(b.safeContents, "friendlyName", Z, J);
      },
      getBagsByLocalKeyId: function (Z, J) {
        return _f(b.safeContents, "localKeyId", Z, J);
      },
    };
    if (s.version.charCodeAt(0) !== 3) {
      var y = Error("PKCS#12 PFX of version other than 3 not supported.");
      throw ((y.version = s.version.charCodeAt(0)), y);
    }
    if (asn1.derToOid(s.contentType) !== pki.oids.data) {
      var y = Error("Only PKCS#12 PFX in password integrity mode supported.");
      throw ((y.oid = asn1.derToOid(s.contentType)), y);
    }
    var S = s.content.value[0];
    if (S.tagClass !== asn1.Class.UNIVERSAL || S.type !== asn1.Type.OCTETSTRING)
      throw Error("PKCS#12 authSafe content data is not an OCTET STRING.");
    if (((S = RS(S)), s.mac)) {
      var w = null,
        R = 0,
        derToOid = asn1.derToOid(s.macAlgorithm);
      switch (derToOid) {
        case pki.oids.sha1:
          ((w = Er.md.sha1.create()), (R = 20));
          break;
        case pki.oids.sha256:
          ((w = Er.md.sha256.create()), (R = 32));
          break;
        case pki.oids.sha384:
          ((w = Er.md.sha384.create()), (R = 48));
          break;
        case pki.oids.sha512:
          ((w = Er.md.sha512.create()), (R = 64));
          break;
        case pki.oids.md5:
          ((w = Er.md.md5.create()), (R = 16));
          break;
      }
      if (w === null) throw Error("PKCS#12 uses unsupported MAC algorithm: " + derToOid);
      var O = new Er.util.ByteBuffer(s.macSalt),
        L = "macIterations" in s ? parseInt(Er.util.bytesToHex(s.macIterations), 16) : 1,
        generateKey = vf.generateKey(r, O, 3, L, R, w),
        create = Er.hmac.create();
      (create.start(w, generateKey), create.update(S.value));
      var mac = create.getMac();
      if (mac.getBytes() !== s.macDigest) throw Error("PKCS#12 MAC could not be verified. Invalid password?");
    } else if (Array.isArray(e.value) && e.value.length > 2)
      throw Error("Invalid PKCS#12. macData field present but MAC was not validated.");
    return (qG(b, S.value, n, r), b);
  };
  function RS(e) {
    if (e.composed || e.constructed) {
      var buffer = Er.util.createBuffer();
      for (var r = 0; r < e.value.length; ++r) buffer.putBytes(e.value[r].value);
      ((e.composed = e.constructed = !1), (e.value = buffer.getBytes()));
    }
    return e;
  }
  function qG(e, n, r, s) {
    if (
      ((n = asn1.fromDer(n, r)),
      n.tagClass !== asn1.Class.UNIVERSAL || n.type !== asn1.Type.SEQUENCE || n.constructed !== !0)
    )
      throw Error("PKCS#12 AuthenticatedSafe expected to be a SEQUENCE OF ContentInfo");
    for (var h = 0; h < n.value.length; h++) {
      var y = n.value[h],
        b = {},
        S = [];
      if (!asn1.validate(y, CA, b, S)) {
        var w = Error("Cannot read ContentInfo.");
        throw ((w.errors = S), w);
      }
      var R = { encrypted: !1 },
        D = null,
        O = b.content.value[0];
      switch (asn1.derToOid(b.contentType)) {
        case pki.oids.data:
          if (O.tagClass !== asn1.Class.UNIVERSAL || O.type !== asn1.Type.OCTETSTRING)
            throw Error("PKCS#12 SafeContents Data is not an OCTET STRING.");
          D = RS(O).value;
          break;
        case pki.oids.encryptedData:
          ((D = jG(O, s)), (R.encrypted = !0));
          break;
        default:
          var w = Error("Unsupported PKCS#12 contentType.");
          throw ((w.contentType = asn1.derToOid(b.contentType)), w);
      }
      ((R.safeBags = YG(D, r, s)), e.safeContents.push(R));
    }
  }
  function jG(e, n) {
    var r = {},
      s = [];
    if (!asn1.validate(e, Er.pkcs7.asn1.encryptedDataValidator, r, s)) {
      var h = Error("Cannot read EncryptedContentInfo.");
      throw ((h.errors = s), h);
    }
    var derToOid = asn1.derToOid(r.contentType);
    if (derToOid !== pki.oids.data) {
      var h = Error("PKCS#12 EncryptedContentInfo ContentType is not Data.");
      throw ((h.oid = derToOid), h);
    }
    derToOid = asn1.derToOid(r.encAlgorithm);
    var cipher = pki.pbe.getCipher(derToOid, r.encParameter, n),
      S = RS(r.encryptedContentAsn1),
      buffer = Er.util.createBuffer(S.value);
    if ((cipher.update(buffer), !cipher.finish())) throw Error("Failed to decrypt PKCS#12 SafeContents.");
    return cipher.output.getBytes();
  }
  function YG(e, n, r) {
    if (!n && e.length === 0) return [];
    if (
      ((e = asn1.fromDer(e, n)),
      e.tagClass !== asn1.Class.UNIVERSAL || e.type !== asn1.Type.SEQUENCE || e.constructed !== !0)
    )
      throw Error("PKCS#12 SafeContents expected to be a SEQUENCE OF SafeBag.");
    var s = [];
    for (var h = 0; h < e.value.length; h++) {
      var y = e.value[h],
        b = {},
        S = [];
      if (!asn1.validate(y, GG, b, S)) {
        var w = Error("Cannot read SafeBag.");
        throw ((w.errors = S), w);
      }
      var R = { type: asn1.derToOid(b.bagId), attributes: ZG(b.bagAttributes) };
      s.push(R);
      var D,
        O,
        L = b.bagValue.value[0];
      switch (R.type) {
        case pki.oids.pkcs8ShroudedKeyBag:
          if (((L = pki.decryptPrivateKeyInfo(L, r)), L === null))
            throw Error("Unable to decrypt PKCS#8 ShroudedKeyBag, wrong password?");
        case pki.oids.keyBag:
          try {
            R.key = pki.privateKeyFromAsn1(L);
          } catch (error) {
            ((R.key = null), (R.asn1 = L));
          }
          continue;
        case pki.oids.certBag:
          ((D = KG),
            (O = function () {
              if (asn1.derToOid(b.certId) !== pki.oids.x509Certificate) {
                var K = Error("Unsupported certificate type, only X.509 supported.");
                throw ((K.oid = asn1.derToOid(b.certId)), K);
              }
              var fromDer = asn1.fromDer(b.cert, n);
              try {
                R.cert = pki.certificateFromAsn1(fromDer, !0);
              } catch (error) {
                ((R.cert = null), (R.asn1 = fromDer));
              }
            }));
          break;
        default:
          var w = Error("Unsupported PKCS#12 SafeBag type.");
          throw ((w.oid = R.type), w);
      }
      if (D !== void 0 && !asn1.validate(L, D, b, S)) {
        var w = Error("Cannot read PKCS#12 " + D.name);
        throw ((w.errors = S), w);
      }
      O();
    }
    return s;
  }
  function ZG(e) {
    var n = {};
    if (e !== void 0)
      for (var r = 0; r < e.length; ++r) {
        var s = {},
          h = [];
        if (!asn1.validate(e[r], HG, s, h)) {
          var y = Error("Cannot read PKCS#12 BagAttribute.");
          throw ((y.errors = h), y);
        }
        var derToOid = asn1.derToOid(s.oid);
        if (pki.oids[derToOid] === void 0) continue;
        n[pki.oids[derToOid]] = [];
        for (var S = 0; S < s.values.length; ++S) n[pki.oids[derToOid]].push(s.values[S].value);
      }
    return n;
  }
  vf.toPkcs12Asn1 = function (generateKey, n, r, s) {
    if (
      ((s = s || {}),
      (s.saltSize = s.saltSize || 8),
      (s.count = s.count || 2048),
      (s.algorithm = s.algorithm || s.encAlgorithm || "aes128"),
      !("useMac" in s))
    )
      s.useMac = !0;
    if (!("localKeyId" in s)) s.localKeyId = null;
    if (!("generateLocalKeyId" in s)) s.generateLocalKeyId = !0;
    var localKeyId = s.localKeyId,
      y;
    if (localKeyId !== null) localKeyId = Er.util.hexToBytes(localKeyId);
    else if (s.generateLocalKeyId)
      if (n) {
        var b = Er.util.isArray(n) ? n[0] : n;
        if (typeof b === "string") b = pki.certificateFromPem(b);
        var create = Er.md.sha1.create();
        (create.update(asn1.toDer(pki.certificateToAsn1(b)).getBytes()),
          (localKeyId = create.digest().getBytes()));
      } else localKeyId = Er.random.getBytes(20);
    var w = [];
    if (localKeyId !== null)
      w.push(
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, !1, asn1.oidToDer(pki.oids.localKeyId).getBytes()),
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, !0, [
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, !1, localKeyId),
          ]),
        ]),
      );
    if ("friendlyName" in s)
      w.push(
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
          asn1.create(
            asn1.Class.UNIVERSAL,
            asn1.Type.OID,
            !1,
            asn1.oidToDer(pki.oids.friendlyName).getBytes(),
          ),
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, !0, [
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.BMPSTRING, !1, s.friendlyName),
          ]),
        ]),
      );
    if (w.length > 0) y = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, !0, w);
    var R = [],
      D = [];
    if (n !== null)
      if (Er.util.isArray(n)) D = n;
      else D = [n];
    var O = [];
    for (var L = 0; L < D.length; ++L) {
      if (((n = D[L]), typeof n === "string")) n = pki.certificateFromPem(n);
      var V = L === 0 ? y : void 0,
        certificateToAsn1 = pki.certificateToAsn1(n),
        create_2 = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, !1, asn1.oidToDer(pki.oids.certBag).getBytes()),
          asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, !0, [
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
              asn1.create(
                asn1.Class.UNIVERSAL,
                asn1.Type.OID,
                !1,
                asn1.oidToDer(pki.oids.x509Certificate).getBytes(),
              ),
              asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, !0, [
                asn1.create(
                  asn1.Class.UNIVERSAL,
                  asn1.Type.OCTETSTRING,
                  !1,
                  asn1.toDer(certificateToAsn1).getBytes(),
                ),
              ]),
            ]),
          ]),
          V,
        ]);
      O.push(create_2);
    }
    if (O.length > 0) {
      var create_3 = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, O),
        create_4 = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, !1, asn1.oidToDer(pki.oids.data).getBytes()),
          asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, !0, [
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, !1, asn1.toDer(create_3).getBytes()),
          ]),
        ]);
      R.push(create_4);
    }
    var ie = null;
    if (generateKey !== null) {
      var wrapRsaPrivateKey = pki.wrapRsaPrivateKey(pki.privateKeyToAsn1(generateKey));
      if (r === null)
        ie = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, !1, asn1.oidToDer(pki.oids.keyBag).getBytes()),
          asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, !0, [wrapRsaPrivateKey]),
          y,
        ]);
      else
        ie = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
          asn1.create(
            asn1.Class.UNIVERSAL,
            asn1.Type.OID,
            !1,
            asn1.oidToDer(pki.oids.pkcs8ShroudedKeyBag).getBytes(),
          ),
          asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, !0, [
            pki.encryptPrivateKeyInfo(wrapRsaPrivateKey, r, s),
          ]),
          y,
        ]);
      var create_5 = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [ie]),
        create_6 = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, !1, asn1.oidToDer(pki.oids.data).getBytes()),
          asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, !0, [
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, !1, asn1.toDer(create_5).getBytes()),
          ]),
        ]);
      R.push(create_6);
    }
    var create_7 = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, R),
      Ne;
    if (s.useMac) {
      var create = Er.md.sha1.create(),
        Ce = new Er.util.ByteBuffer(Er.random.getBytes(s.saltSize)),
        count = s.count,
        generateKey = vf.generateKey(r, Ce, 3, count, 20),
        create_8 = Er.hmac.create();
      (create_8.start(create, generateKey), create_8.update(asn1.toDer(create_7).getBytes()));
      var mac = create_8.getMac();
      Ne = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, !1, asn1.oidToDer(pki.oids.sha1).getBytes()),
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, !1, ""),
          ]),
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, !1, mac.getBytes()),
        ]),
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, !1, Ce.getBytes()),
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, !1, asn1.integerToDer(count).getBytes()),
      ]);
    }
    return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, !1, asn1.integerToDer(3).getBytes()),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, !1, asn1.oidToDer(pki.oids.data).getBytes()),
        asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, !0, [
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, !1, asn1.toDer(create_7).getBytes()),
        ]),
      ]),
      Ne,
    ]);
  };
  vf.generateKey = Er.pbe.generatePkcs12Key;
});

export { IS };

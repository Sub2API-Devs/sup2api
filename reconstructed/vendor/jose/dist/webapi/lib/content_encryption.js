/**
 * jose/dist/webapi/lib/content_encryption.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-2tyrgda4.js (14), chunk-5h78gfwc.js (16)
 * attribution: esm-layout 10, esm-fingerprint 20
 */
import { f_2, c, k_2 } from "../../node/esm/util/errors.js";
import { U } from "../../node/esm/lib/invalid_key_input.js";
import { E_2, xe, W, p } from "./buffer_utils.js";
import { H } from "./crypto_key.js";
import { D } from "./key.js";
import { Xa } from "../../../../../runtime/bun-runtime.js";
import { v } from "../../browser/runtime/base64url.js";

//@ chunk-5h78gfwc.js:7205-7443 esm-fingerprint
function ye(e) {
  switch (e) {
    case "A128GCM":
      return 128;
    case "A192GCM":
      return 192;
    case "A256GCM":
    case "A128CBC-HS256":
      return 256;
    case "A192CBC-HS384":
      return 384;
    case "A256CBC-HS512":
      return 512;
    default:
      throw new f_2(`Unsupported JWE Algorithm: ${e}`);
  }
}
//@ chunk-5h78gfwc.js:7443-7503 esm-fingerprint
var M_2 = (e) => crypto.getRandomValues(new Uint8Array(ye(e) >> 3));
//@ chunk-5h78gfwc.js:7503-7639 esm-fingerprint
function le(e, t) {
  let r = e.byteLength << 3;
  if (r !== t) throw new c(`Invalid Content Encryption Key length. Expected ${t} bits, got ${r} bits`);
}
//@ chunk-5h78gfwc.js:7639-7891 esm-fingerprint
function ke(e) {
  switch (e) {
    case "A128GCM":
    case "A128GCMKW":
    case "A192GCM":
    case "A192GCMKW":
    case "A256GCM":
    case "A256GCMKW":
      return 96;
    case "A128CBC-HS256":
    case "A192CBC-HS384":
    case "A256CBC-HS512":
      return 128;
    default:
      throw new f_2(`Unsupported JWE Algorithm: ${e}`);
  }
}
//@ chunk-5h78gfwc.js:7891-7952 esm-fingerprint
var _t = (e) => crypto.getRandomValues(new Uint8Array(ke(e) >> 3));
//@ chunk-5h78gfwc.js:7952-8044 esm-fingerprint
function Xe(e, t) {
  if (t.length << 3 !== ke(e)) throw new c("Invalid Initialization Vector length");
}
//@ chunk-5h78gfwc.js:8044-8378 esm-fingerprint
async function Ye(e, t, r) {
  if (!(t instanceof Uint8Array)) throw TypeError(U(t, "Uint8Array"));
  let n = parseInt(e.slice(1, 4), 10),
    importKey = await crypto.subtle.importKey("raw", t.subarray(n >> 3), "AES-CBC", !1, [r]),
    importKey_2 = await crypto.subtle.importKey(
      "raw",
      t.subarray(0, n >> 3),
      { hash: `SHA-${n << 1}`, name: "HMAC" },
      !1,
      ["sign"],
    );
  return { encKey: importKey, macKey: importKey_2, keySize: n };
}
//@ chunk-5h78gfwc.js:8378-8479 esm-fingerprint
async function qe(e, t, r) {
  return new Uint8Array((await crypto.subtle.sign("HMAC", e, t)).slice(0, r >> 3));
}
//@ chunk-5h78gfwc.js:8479-8715 esm-fingerprint
async function Nt(e, t, r, n, i) {
  let { encKey: encKey, macKey: macKey, keySize: keySize } = await Ye(e, r, "encrypt"),
    uint8Array = new Uint8Array(await crypto.subtle.encrypt({ iv: n, name: "AES-CBC" }, encKey, t)),
    d = E_2(i, n, uint8Array, xe(i.length << 3)),
    u = await qe(macKey, d, keySize);
  return { ciphertext: uint8Array, tag: u, iv: n };
}
//@ chunk-5h78gfwc.js:8715-9133 esm-fingerprint
async function Bt(e, t) {
  if (!(e instanceof Uint8Array)) throw TypeError("First argument must be a buffer");
  if (!(t instanceof Uint8Array)) throw TypeError("Second argument must be a buffer");
  let r = { name: "HMAC", hash: "SHA-256" },
    generateKey = await crypto.subtle.generateKey(r, !1, ["sign"]),
    uint8Array = new Uint8Array(await crypto.subtle.sign(r, generateKey, e)),
    uint8Array_2 = new Uint8Array(await crypto.subtle.sign(r, generateKey, t)),
    a = 0,
    s = -1;
  while (++s < 32) a |= uint8Array[s] ^ uint8Array_2[s];
  return a === 0;
}
//@ chunk-5h78gfwc.js:9133-9430 esm-fingerprint
async function Lt(e, t, r, n, i, o) {
  let { encKey: encKey, macKey: macKey, keySize: keySize } = await Ye(e, t, "decrypt"),
    d = E_2(o, n, r, xe(o.length << 3)),
    u = await qe(macKey, d, keySize),
    m;
  try {
    m = await Bt(i, u);
  } catch {}
  if (!m) throw new k_2();
  let w;
  try {
    w = new Uint8Array(await crypto.subtle.decrypt({ iv: n, name: "AES-CBC" }, encKey, r));
  } catch {}
  if (!w) throw new k_2();
  return w;
}
//@ chunk-5h78gfwc.js:9430-9752 esm-fingerprint
async function $t(e, t, r, n, i) {
  let o;
  if (r instanceof Uint8Array) o = await crypto.subtle.importKey("raw", r, "AES-GCM", !1, ["encrypt"]);
  else (H(r, e, "encrypt"), (o = r));
  let uint8Array = new Uint8Array(
      await crypto.subtle.encrypt({ additionalData: i, iv: n, name: "AES-GCM", tagLength: 128 }, o, t),
    ),
    sliced = uint8Array.slice(-16);
  return { ciphertext: uint8Array.slice(0, -16), tag: sliced, iv: n };
}
//@ chunk-5h78gfwc.js:9752-10045 esm-fingerprint
async function Gt(e, t, r, n, i, o) {
  let a;
  if (t instanceof Uint8Array) a = await crypto.subtle.importKey("raw", t, "AES-GCM", !1, ["decrypt"]);
  else (H(t, e, "decrypt"), (a = t));
  try {
    return new Uint8Array(
      await crypto.subtle.decrypt(
        { additionalData: o, iv: n, name: "AES-GCM", tagLength: 128 },
        a,
        E_2(r, i),
      ),
    );
  } catch {
    throw new k_2();
  }
}
//@ chunk-5h78gfwc.js:10045-10099 esm-fingerprint
var Qe = "Unsupported JWE Content Encryption Algorithm";
//@ chunk-5h78gfwc.js:10099-10561 esm-fingerprint
async function we(e, t, r, n, i) {
  if (!D(r) && !(r instanceof Uint8Array))
    throw TypeError(U(r, "CryptoKey", "KeyObject", "Uint8Array", "JSON Web Key"));
  if (n) Xe(e, n);
  else n = _t(e);
  switch (e) {
    case "A128CBC-HS256":
    case "A192CBC-HS384":
    case "A256CBC-HS512":
      if (r instanceof Uint8Array) le(r, parseInt(e.slice(-3), 10));
      return Nt(e, t, r, n, i);
    case "A128GCM":
    case "A192GCM":
    case "A256GCM":
      if (r instanceof Uint8Array) le(r, parseInt(e.slice(1, 4), 10));
      return $t(e, t, r, n, i);
    default:
      throw new f_2(Qe);
  }
}
//@ chunk-5h78gfwc.js:10561-11118 esm-fingerprint
async function Se_5h78(e, t, r, n, i, o) {
  if (!D(t) && !(t instanceof Uint8Array))
    throw TypeError(U(t, "CryptoKey", "KeyObject", "Uint8Array", "JSON Web Key"));
  if (!n) throw new c("JWE Initialization Vector missing");
  if (!i) throw new c("JWE Authentication Tag missing");
  switch ((Xe(e, n), e)) {
    case "A128CBC-HS256":
    case "A192CBC-HS384":
    case "A256CBC-HS512":
      if (t instanceof Uint8Array) le(t, parseInt(e.slice(-3), 10));
      return Lt(e, t, r, n, i, o);
    case "A128GCM":
    case "A192GCM":
    case "A256GCM":
      if (t instanceof Uint8Array) le(t, parseInt(e.slice(1, 4), 10));
      return Gt(e, t, r, n, i, o);
    default:
      throw new f_2(Qe);
  }
}
//@ chunk-2tyrgda4.js:1828-1848 esm-layout
var P = Xa(() => {
  v();
});
//@ chunk-2tyrgda4.js:1848-1874 esm-layout
var N, Q, f, re, s, y, Te, Ue, De;
//@ chunk-2tyrgda4.js:1874-3334 esm-layout
var E = Xa(() => {
  N = class N extends Error {
    static get code() {
      return "ERR_JOSE_GENERIC";
    }
    constructor(e) {
      var t;
      super(e);
      ((this.code = "ERR_JOSE_GENERIC"),
        (this.name = this.constructor.name),
        (t = Error.captureStackTrace) === null || t === void 0 || t.call(Error, this, this.constructor));
    }
  };
  Q = class Q extends N {
    constructor() {
      super(...arguments);
      this.code = "ERR_JOSE_ALG_NOT_ALLOWED";
    }
    static get code() {
      return "ERR_JOSE_ALG_NOT_ALLOWED";
    }
  };
  f = class f extends N {
    constructor() {
      super(...arguments);
      this.code = "ERR_JOSE_NOT_SUPPORTED";
    }
    static get code() {
      return "ERR_JOSE_NOT_SUPPORTED";
    }
  };
  re = class re extends N {
    constructor() {
      super(...arguments);
      ((this.code = "ERR_JWE_DECRYPTION_FAILED"), (this.message = "decryption operation failed"));
    }
    static get code() {
      return "ERR_JWE_DECRYPTION_FAILED";
    }
  };
  s = class s extends N {
    constructor() {
      super(...arguments);
      this.code = "ERR_JWE_INVALID";
    }
    static get code() {
      return "ERR_JWE_INVALID";
    }
  };
  y = class y extends N {
    constructor() {
      super(...arguments);
      this.code = "ERR_JWS_INVALID";
    }
    static get code() {
      return "ERR_JWS_INVALID";
    }
  };
  Te = class Te extends N {
    constructor() {
      super(...arguments);
      this.code = "ERR_JWT_INVALID";
    }
    static get code() {
      return "ERR_JWT_INVALID";
    }
  };
  Ue = class Ue extends N {
    constructor() {
      super(...arguments);
      this.code = "ERR_JWK_INVALID";
    }
    static get code() {
      return "ERR_JWK_INVALID";
    }
  };
  De = class De extends N {
    constructor() {
      super(...arguments);
      ((this.code = "ERR_JWS_SIGNATURE_VERIFICATION_FAILED"),
        (this.message = "signature verification failed"));
    }
    static get code() {
      return "ERR_JWS_SIGNATURE_VERIFICATION_FAILED";
    }
  };
});
//@ chunk-2tyrgda4.js:3334-3340 esm-layout
var k;
//@ chunk-2tyrgda4.js:3340-3389 esm-layout
var Ee = Xa(() => {
  W();
  k = p.getRandomValues.bind(p);
});
//@ chunk-2tyrgda4.js:3389-3641 esm-fingerprint
function Oe(e) {
  switch (e) {
    case "A128GCM":
    case "A128GCMKW":
    case "A192GCM":
    case "A192GCMKW":
    case "A256GCM":
    case "A256GCMKW":
      return 96;
    case "A128CBC-HS256":
    case "A192CBC-HS384":
    case "A256CBC-HS512":
      return 128;
    default:
      throw new f(`Unsupported JWE Algorithm: ${e}`);
  }
}
//@ chunk-2tyrgda4.js:3641-3681 esm-layout
var Se = (e) => k(new Uint8Array(Oe(e) >> 3));
//@ chunk-2tyrgda4.js:3681-3707 esm-layout
var Ae = Xa(() => {
  E();
  Ee();
});
//@ chunk-2tyrgda4.js:3707-3801 esm-fingerprint
var yr = (e, t) => {
    if (t.length << 3 !== Oe(e)) throw new s("Invalid Initialization Vector length");
  },
  ge;
//@ chunk-2tyrgda4.js:3801-3833 esm-layout
var Me = Xa(() => {
  E();
  Ae();
  ge = yr;
});
//@ chunk-2tyrgda4.js:3833-3970 esm-fingerprint
var wr = (e, t) => {
    let r = e.byteLength << 3;
    if (r !== t) throw new s(`Invalid Content Encryption Key length. Expected ${t} bits, got ${r} bits`);
  },
  j;
//@ chunk-2tyrgda4.js:9860-9873 esm-layout
var F = () => {};
//@ chunk-2tyrgda4.js:9873-9883 esm-layout
var _r, ee;
//@ chunk-2tyrgda4.js:9883-9952 esm-fingerprint
var Fe = Xa(() => {
  ((_r = [{ hash: "SHA-256", name: "HMAC" }, !0, ["sign"]]), (ee = _r));
});

export { E, j, wr, re, ge, f, Me, ee, Fe, s, k, Se_5h78, ye, M_2, Ee, P, F, Se, we, Ae, Q, y, De, Te, Ue };

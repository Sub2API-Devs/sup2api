/**
 * @smithy/signature-v4/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/signature-v4@5.4.0..5.6.4
 * pieces: chunk-kyj1a8d5.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { K6t } from "../../util-hex-encoding/dist-cjs/index.js";
import { IR } from "../../util-utf8/dist-cjs/index.js";
import { s_s } from "../../is-array-buffer/dist-cjs/index.js";
import { Kg } from "../../protocol-http/dist-cjs/index.js";
import { bD } from "../../util-middleware/dist-cjs/index.js";
import { ahs } from "../../util-uri-escape/dist-cjs/index.js";

//@ chunk-kyj1a8d5.js:379-10813 cjs-fingerprint
var yat = x(function (Re) {
  var f = K6t(),
    d = IR(),
    ue = s_s(),
    Y = Kg(),
    M = bD(),
    R = ahs(),
    K = "X-Amz-Algorithm",
    j = "X-Amz-Credential",
    m = "X-Amz-Date",
    Q = "X-Amz-SignedHeaders",
    V = "X-Amz-Expires",
    U = "X-Amz-Signature",
    v = "X-Amz-Security-Token",
    Ae = "X-Amz-Region-Set",
    P = "authorization",
    lower = m.toLowerCase(),
    q = "date",
    z = [P, lower, q],
    lower_2 = U.toLowerCase(),
    S = "x-amz-content-sha256",
    lower_3 = v.toLowerCase(),
    Ee = "host",
    F = {
      authorization: !0,
      "cache-control": !0,
      connection: !0,
      expect: !0,
      from: !0,
      "keep-alive": !0,
      "max-forwards": !0,
      pragma: !0,
      referer: !0,
      te: !0,
      trailer: !0,
      "transfer-encoding": !0,
      upgrade: !0,
      "user-agent": !0,
      "x-amzn-trace-id": !0,
    },
    W = /^proxy-/,
    Z = /^sec-/,
    he = [/^proxy-/i, /^sec-/i],
    _ = "AWS4-HMAC-SHA256",
    fe = "AWS4-ECDSA-P256-SHA256",
    J = "AWS4-HMAC-SHA256-PAYLOAD",
    ee = "UNSIGNED-PAYLOAD",
    te = 50,
    b = "aws4_request",
    se = 604800,
    y = {},
    w = [],
    D = (e, t, r) => `${e}/${t}/${r}/${b}`,
    re = async (e, t, r, s, n) => {
      let a = await G(e, t.secretAccessKey, t.accessKeyId),
        o = `${r}:${s}:${n}:${f.toHex(a)}:${t.sessionToken}`;
      if (o in y) return y[o];
      w.push(o);
      while (w.length > te) delete y[w.shift()];
      let i = `AWS4${t.secretAccessKey}`;
      for (let c of [r, s, n, b]) i = await G(e, i, c);
      return (y[o] = i);
    },
    le = () => {
      ((w.length = 0),
        Object.keys(y).forEach((e) => {
          delete y[e];
        }));
    },
    G = (e, t, r) => {
      let s = new e(t);
      return (s.update(d.toUint8Array(r)), s.digest());
    },
    T = ({ headers: headers }, t, r) => {
      let s = {};
      for (let n of Object.keys(headers).sort()) {
        if (headers[n] == null) continue;
        let lower = n.toLowerCase();
        if (lower in F || t?.has(lower) || W.test(lower) || Z.test(lower)) {
          if (!r || (r && !r.has(lower))) continue;
        }
        s[lower] = headers[n].trim().replace(/\s+/g, " ");
      }
      return s;
    },
    H = async ({ headers: headers, body: body }, r) => {
      for (let s of Object.keys(headers)) if (s.toLowerCase() === S) return headers[s];
      if (body == null) return "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
      else if (typeof body === "string" || ArrayBuffer.isView(body) || ue.isArrayBuffer(body)) {
        let s = new r();
        return (s.update(d.toUint8Array(body)), f.toHex(await s.digest()));
      }
      return ee;
    };
  class ne {
    format(e) {
      let t = [];
      for (let n of Object.keys(e)) {
        let fromUtf8 = d.fromUtf8(n);
        t.push(Uint8Array.from([fromUtf8.byteLength]), fromUtf8, this.formatHeaderValue(e[n]));
      }
      let uint8Array = new Uint8Array(t.reduce((n, a) => n + a.byteLength, 0)),
        s = 0;
      for (let n of t) (uint8Array.set(n, s), (s += n.byteLength));
      return uint8Array;
    }
    formatHeaderValue(e) {
      switch (e.type) {
        case "boolean":
          return Uint8Array.from([e.value ? 0 : 1]);
        case "byte":
          return Uint8Array.from([2, e.value]);
        case "short":
          let dataView = new DataView(new ArrayBuffer(3));
          return (
            dataView.setUint8(0, 3),
            dataView.setInt16(1, e.value, !1),
            new Uint8Array(dataView.buffer)
          );
        case "integer":
          let dataView_2 = new DataView(new ArrayBuffer(5));
          return (
            dataView_2.setUint8(0, 4),
            dataView_2.setInt32(1, e.value, !1),
            new Uint8Array(dataView_2.buffer)
          );
        case "long":
          let uint8Array = new Uint8Array(9);
          return ((uint8Array[0] = 5), uint8Array.set(e.value.bytes, 1), uint8Array);
        case "binary":
          let dataView_3 = new DataView(new ArrayBuffer(3 + e.value.byteLength));
          (dataView_3.setUint8(0, 6), dataView_3.setUint16(1, e.value.byteLength, !1));
          let uint8Array_2 = new Uint8Array(dataView_3.buffer);
          return (uint8Array_2.set(e.value, 3), uint8Array_2);
        case "string":
          let fromUtf8 = d.fromUtf8(e.value),
            dataView_4 = new DataView(new ArrayBuffer(3 + fromUtf8.byteLength));
          (dataView_4.setUint8(0, 7), dataView_4.setUint16(1, fromUtf8.byteLength, !1));
          let uint8Array_3 = new Uint8Array(dataView_4.buffer);
          return (uint8Array_3.set(fromUtf8, 3), uint8Array_3);
        case "timestamp":
          let uint8Array_4 = new Uint8Array(9);
          return (
            (uint8Array_4[0] = 8),
            uint8Array_4.set(C.fromNumber(e.value.valueOf()).bytes, 1),
            uint8Array_4
          );
        case "uuid":
          if (!ge.test(e.value)) throw Error(`Invalid UUID received: ${e.value}`);
          let uint8Array_5 = new Uint8Array(17);
          return (
            (uint8Array_5[0] = 9),
            uint8Array_5.set(f.fromHex(e.value.replace(/\-/g, "")), 1),
            uint8Array_5
          );
      }
    }
  }
  var ge = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
  class C {
    bytes;
    constructor(e) {
      if (((this.bytes = e), e.byteLength !== 8)) throw Error("Int64 buffers must be exactly 8 bytes");
    }
    static fromNumber(e) {
      if (e > 9223372036854776000 || e < -9223372036854776000)
        throw Error(`${e} is too large (or, if negative, too small) to represent as an Int64`);
      let uint8Array = new Uint8Array(8);
      for (let r = 7, abs = Math.abs(Math.round(e)); r > -1 && abs > 0; r--, abs /= 256) uint8Array[r] = abs;
      if (e < 0) k(uint8Array);
      return new C(uint8Array);
    }
    valueOf() {
      let sliced = this.bytes.slice(0),
        t = sliced[0] & 128;
      if (t) k(sliced);
      return parseInt(f.toHex(sliced), 16) * (t ? -1 : 1);
    }
    toString() {
      return String(this.valueOf());
    }
  }
  function k(e) {
    for (let t = 0; t < 8; t++) e[t] ^= 255;
    for (let t = 7; t > -1; t--) if ((e[t]++, e[t] !== 0)) break;
  }
  var ae = (e, t) => {
      e = e.toLowerCase();
      for (let r of Object.keys(t)) if (e === r.toLowerCase()) return !0;
      return !1;
    },
    oe = (e, t = {}) => {
      let { headers: headers, query: query = {} } = Y.HttpRequest.clone(e);
      for (let n of Object.keys(headers)) {
        let lower = n.toLowerCase();
        if (
          (lower.slice(0, 6) === "x-amz-" && !t.unhoistableHeaders?.has(lower)) ||
          t.hoistableHeaders?.has(lower)
        )
          ((query[n] = headers[n]), delete headers[n]);
      }
      return { ...e, headers: headers, query: query };
    },
    I = (e) => {
      e = Y.HttpRequest.clone(e);
      for (let t of Object.keys(e.headers)) if (z.indexOf(t.toLowerCase()) > -1) delete e.headers[t];
      return e;
    },
    ie = ({ query: query = {} }) => {
      let t = [],
        r = {};
      for (let s of Object.keys(query)) {
        if (s.toLowerCase() === lower_2) continue;
        let escapeUri = R.escapeUri(s);
        t.push(escapeUri);
        let a = query[s];
        if (typeof a === "string") r[escapeUri] = `${escapeUri}=${R.escapeUri(a)}`;
        else if (Array.isArray(a))
          r[escapeUri] = a
            .slice(0)
            .reduce((o, i) => o.concat([`${escapeUri}=${R.escapeUri(i)}`]), [])
            .sort()
            .join("&");
      }
      return t
        .sort()
        .map((s) => r[s])
        .filter((s) => s)
        .join("&");
    },
    de = (e) =>
      ye(e)
        .toISOString()
        .replace(/\.\d{3}Z$/, "Z"),
    ye = (e) => {
      if (typeof e === "number") return new Date(e * 1000);
      if (typeof e === "string") {
        if (Number(e)) return new Date(Number(e) * 1000);
        return new Date(e);
      }
      return e;
    };
  class L {
    service;
    regionProvider;
    credentialProvider;
    sha256;
    uriEscapePath;
    applyChecksum;
    constructor({
      applyChecksum: e,
      credentials: t,
      region: r,
      service: s,
      sha256: n,
      uriEscapePath: a = !0,
    }) {
      ((this.service = s),
        (this.sha256 = n),
        (this.uriEscapePath = a),
        (this.applyChecksum = typeof e === "boolean" ? e : !0),
        (this.regionProvider = M.normalizeProvider(r)),
        (this.credentialProvider = M.normalizeProvider(t)));
    }
    createCanonicalRequest(e, t, r) {
      let sorted = Object.keys(t).sort();
      return `${e.method}
${this.getCanonicalPath(e)}
${ie(e)}
${sorted.map((n) => `${n}:${t[n]}`).join(`
`)}

${sorted.join(";")}
${r}`;
    }
    async createStringToSign(e, t, r, s) {
      let n = new this.sha256();
      n.update(d.toUint8Array(r));
      let digest = await n.digest();
      return `${s}
${e}
${t}
${f.toHex(digest)}`;
    }
    getCanonicalPath({ path: e }) {
      if (this.uriEscapePath) {
        let t = [];
        for (let n of e.split("/")) {
          if (n?.length === 0) continue;
          if (n === ".") continue;
          if (n === "..") t.pop();
          else t.push(n);
        }
        let r = `${e?.startsWith("/") ? "/" : ""}${t.join("/")}${t.length > 0 && e?.endsWith("/") ? "/" : ""}`;
        return R.escapeUri(r).replace(/%2F/g, "/");
      }
      return e;
    }
    validateResolvedCredentials(e) {
      if (typeof e !== "object" || typeof e.accessKeyId !== "string" || typeof e.secretAccessKey !== "string")
        throw Error("Resolved credential object is not valid");
    }
    formatDate(e) {
      let replaced = de(e).replace(/[\-:]/g, "");
      return { longDate: replaced, shortDate: replaced.slice(0, 8) };
    }
    getCanonicalHeaderList(e) {
      return Object.keys(e).sort().join(";");
    }
  }
  class ce extends L {
    headerFormatter = new ne();
    constructor({
      applyChecksum: e,
      credentials: t,
      region: r,
      service: s,
      sha256: n,
      uriEscapePath: a = !0,
    }) {
      super({ applyChecksum: e, credentials: t, region: r, service: s, sha256: n, uriEscapePath: a });
    }
    async presign(e, t = {}) {
      let {
          signingDate: signingDate = new Date(),
          expiresIn: expiresIn = 3600,
          unsignableHeaders: unsignableHeaders,
          unhoistableHeaders: unhoistableHeaders,
          signableHeaders: signableHeaders,
          hoistableHeaders: hoistableHeaders,
          signingRegion: signingRegion,
          signingService: signingService,
        } = t,
        credentialProvider = await this.credentialProvider();
      this.validateResolvedCredentials(credentialProvider);
      let h = signingRegion ?? (await this.regionProvider()),
        { longDate: longDate, shortDate: shortDate } = this.formatDate(signingDate);
      if (expiresIn > se)
        return Promise.reject(
          "Signature version 4 presigned URLs must have an expiration date less than one week in the future",
        );
      let p = D(shortDate, h, signingService ?? this.service),
        E = oe(I(e), { unhoistableHeaders: unhoistableHeaders, hoistableHeaders: hoistableHeaders });
      if (credentialProvider.sessionToken) E.query[v] = credentialProvider.sessionToken;
      ((E.query[K] = _),
        (E.query[j] = `${credentialProvider.accessKeyId}/${p}`),
        (E.query[m] = longDate),
        (E.query[V] = expiresIn.toString(10)));
      let O = T(E, unsignableHeaders, signableHeaders);
      return (
        (E.query[Q] = this.getCanonicalHeaderList(O)),
        (E.query[U] = await this.getSignature(
          longDate,
          p,
          this.getSigningKey(credentialProvider, h, shortDate, signingService),
          this.createCanonicalRequest(E, O, await H(e, this.sha256)),
        )),
        E
      );
    }
    async sign(e, t) {
      if (typeof e === "string") return this.signString(e, t);
      else if (e.headers && e.payload) return this.signEvent(e, t);
      else if (e.message) return this.signMessage(e, t);
      else return this.signRequest(e, t);
    }
    async signEvent(
      { headers: e, payload: t },
      { signingDate: r = new Date(), priorSignature: s, signingRegion: n, signingService: a },
    ) {
      let o = n ?? (await this.regionProvider()),
        { shortDate: shortDate, longDate: longDate } = this.formatDate(r),
        A = D(shortDate, o, a ?? this.service),
        u = await H({ headers: {}, body: t }, this.sha256),
        h = new this.sha256();
      h.update(e);
      let toHex = f.toHex(await h.digest()),
        joined = [J, longDate, A, s, toHex, u].join(`
`);
      return this.signString(joined, { signingDate: r, signingRegion: o, signingService: a });
    }
    async signMessage(e, { signingDate: t = new Date(), signingRegion: r, signingService: s }) {
      return this.signEvent(
        { headers: this.headerFormatter.format(e.message.headers), payload: e.message.body },
        { signingDate: t, signingRegion: r, signingService: s, priorSignature: e.priorSignature },
      ).then((a) => ({ message: e.message, signature: a }));
    }
    async signString(e, { signingDate: t = new Date(), signingRegion: r, signingService: s } = {}) {
      let credentialProvider = await this.credentialProvider();
      this.validateResolvedCredentials(credentialProvider);
      let a = r ?? (await this.regionProvider()),
        { shortDate: shortDate } = this.formatDate(t),
        i = new this.sha256(await this.getSigningKey(credentialProvider, a, shortDate, s));
      return (i.update(d.toUint8Array(e)), f.toHex(await i.digest()));
    }
    async signRequest(
      e,
      {
        signingDate: t = new Date(),
        signableHeaders: r,
        unsignableHeaders: s,
        signingRegion: n,
        signingService: a,
      } = {},
    ) {
      let credentialProvider = await this.credentialProvider();
      this.validateResolvedCredentials(credentialProvider);
      let i = n ?? (await this.regionProvider()),
        c = I(e),
        { longDate: longDate, shortDate: shortDate } = this.formatDate(t),
        h = D(shortDate, i, a ?? this.service);
      if (((c.headers[lower] = longDate), credentialProvider.sessionToken))
        c.headers[lower_3] = credentialProvider.sessionToken;
      let l = await H(c, this.sha256);
      if (!ae(S, c.headers) && this.applyChecksum) c.headers[S] = l;
      let g = T(c, s, r),
        signature = await this.getSignature(
          longDate,
          h,
          this.getSigningKey(credentialProvider, i, shortDate, a),
          this.createCanonicalRequest(c, g, l),
        );
      return (
        (c.headers[P] =
          `${_} Credential=${credentialProvider.accessKeyId}/${h}, SignedHeaders=${this.getCanonicalHeaderList(g)}, Signature=${signature}`),
        c
      );
    }
    async getSignature(e, t, r, s) {
      let stringToSign = await this.createStringToSign(e, t, s, _),
        a = new this.sha256(await r);
      return (a.update(d.toUint8Array(stringToSign)), f.toHex(await a.digest()));
    }
    getSigningKey(e, t, r, s) {
      return re(this.sha256, e, r, t, s || this.service);
    }
  }
  var pe = { SignatureV4a: null };
  Re.ALGORITHM_IDENTIFIER = _;
  Re.ALGORITHM_IDENTIFIER_V4A = fe;
  Re.ALGORITHM_QUERY_PARAM = K;
  Re.ALWAYS_UNSIGNABLE_HEADERS = F;
  Re.AMZ_DATE_HEADER = lower;
  Re.AMZ_DATE_QUERY_PARAM = m;
  Re.AUTH_HEADER = P;
  Re.CREDENTIAL_QUERY_PARAM = j;
  Re.DATE_HEADER = q;
  Re.EVENT_ALGORITHM_IDENTIFIER = J;
  Re.EXPIRES_QUERY_PARAM = V;
  Re.GENERATED_HEADERS = z;
  Re.HOST_HEADER = Ee;
  Re.KEY_TYPE_IDENTIFIER = b;
  Re.MAX_CACHE_SIZE = te;
  Re.MAX_PRESIGNED_TTL = se;
  Re.PROXY_HEADER_PATTERN = W;
  Re.REGION_SET_PARAM = Ae;
  Re.SEC_HEADER_PATTERN = Z;
  Re.SHA256_HEADER = S;
  Re.SIGNATURE_HEADER = lower_2;
  Re.SIGNATURE_QUERY_PARAM = U;
  Re.SIGNED_HEADERS_QUERY_PARAM = Q;
  Re.SignatureV4 = ce;
  Re.SignatureV4Base = L;
  Re.TOKEN_HEADER = lower_3;
  Re.TOKEN_QUERY_PARAM = v;
  Re.UNSIGNABLE_PATTERNS = he;
  Re.UNSIGNED_PAYLOAD = ee;
  Re.clearCredentialCache = le;
  Re.createScope = D;
  Re.getCanonicalHeaders = T;
  Re.getCanonicalQuery = ie;
  Re.getPayloadHash = H;
  Re.getSigningKey = re;
  Re.hasHeader = ae;
  Re.moveHeadersToQuery = oe;
  Re.prepareRequest = I;
  Re.signatureV4aContainer = pe;
});

export { yat };

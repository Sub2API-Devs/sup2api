/**
 * openid-client/lib/helpers/request.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { yf } from "../../../lru-cache/index.js";
import { JO } from "../../package.json.js";
import { Ki } from "../errors.js";
import { df } from "./pick.js";
import { ly } from "./defaults.js";
import { _f } from "./consts.js";

//@ chunk-1ny7cxrt.js:21000-23683 cjs-fingerprint
var Ol = x(function (Zve, my) {
  var EF = importMetaRequire("assert"),
    tS = importMetaRequire("querystring"),
    nS = importMetaRequire("http"),
    rS = importMetaRequire("https"),
    { once: once } = importMetaRequire("events"),
    { URL: PF } = importMetaRequire("url"),
    AF = yf(),
    wl = JO(),
    { RPError: RPError } = Ki(),
    iS = df(),
    { deep: deep } = ly(),
    { HTTP_OPTIONS: HTTP_OPTIONS } = _f(),
    vf,
    TF = /^[\x21\x23-\x5B\x5D-\x7E]+$/,
    oS = ["agent", "ca", "cert", "crl", "headers", "key", "lookup", "passphrase", "pfx", "timeout"],
    sS = (e, t) => {
      vf = deep({}, e.length ? iS(t, ...e) : t, vf);
    };
  sS([], {
    headers: { "User-Agent": `${wl.name}/${wl.version} (${wl.homepage})`, "Accept-Encoding": "identity" },
    timeout: 3500,
  });
  function bf(e, t, n) {
    if (n) (e.removeHeader("content-type"), e.setHeader("content-type", n));
    if (t)
      (e.removeHeader("content-length"), e.setHeader("content-length", Buffer.byteLength(t)), e.write(t));
    e.end();
  }
  var eS = new AF({ max: 100 });
  my.exports = async function (t, { accessToken: n, mTLS: o = !1, DPoP: r } = {}) {
    let s;
    try {
      ((s = new PF(t.url)), delete t.url, EF(/^(https?:)$/.test(s.protocol)));
    } catch (error) {
      throw TypeError("only valid absolute URLs can be requested");
    }
    let a = this[HTTP_OPTIONS],
      l = t,
      c = `${s.origin}${s.pathname}`;
    if (r && "dpopProof" in this)
      ((l.headers = l.headers || {}),
        (l.headers.DPoP = await this.dpopProof(
          { htu: `${s.origin}${s.pathname}`, htm: t.method || "GET", nonce: eS.get(c) },
          r,
          n,
        )));
    let u;
    if (a) u = iS(a.call(this, s, deep({}, l, vf)), ...oS);
    if (((l = deep({}, u, l, vf)), o && !l.pfx && !(l.key && l.cert)))
      throw TypeError("mutual-TLS certificate and key not set");
    if (l.searchParams)
      for (let [S, j] of Object.entries(l.searchParams)) (s.searchParams.delete(S), s.searchParams.set(S, j));
    let f, h, m, y;
    ({ form: h, responseType: f, json: m, body: y, ...l } = l);
    for (let [S, j] of Object.entries(l.headers || {})) if (j === void 0) delete l.headers[S];
    let b,
      w = (s.protocol === "https:" ? rS.request : nS.request)(s.href, l);
    return (async () => {
      if (m) bf(w, JSON.stringify(m), "application/json");
      else if (h) bf(w, tS.stringify(h), "application/x-www-form-urlencoded");
      else if (y) bf(w, y);
      else bf(w);
      if ((([b] = await Promise.race([once(w, "response"), once(w, "timeout")])), !b))
        throw (w.destroy(), new RPError(`outgoing request timed out after ${l.timeout}ms`));
      let S = [];
      for await (let j of b) S.push(j);
      if (S.length)
        switch (f) {
          case "json": {
            Object.defineProperty(b, "body", {
              get() {
                let buffer = Buffer.concat(S);
                try {
                  buffer = JSON.parse(buffer);
                } catch (error) {
                  throw (Object.defineProperty(error, "response", { value: b }), error);
                } finally {
                  Object.defineProperty(b, "body", { value: buffer, configurable: !0 });
                }
                return buffer;
              },
              configurable: !0,
            });
            break;
          }
          case void 0:
          case "buffer": {
            Object.defineProperty(b, "body", {
              get() {
                let buffer = Buffer.concat(S);
                return (Object.defineProperty(b, "body", { value: buffer, configurable: !0 }), buffer);
              },
              configurable: !0,
            });
            break;
          }
          default:
            throw TypeError("unsupported responseType request option");
        }
      return b;
    })()
      .catch((S) => {
        if (b) Object.defineProperty(S, "response", { value: b });
        throw S;
      })
      .finally(() => {
        let S = b && b.headers["dpop-nonce"];
        if (S && TF.test(S)) eS.set(c, S);
      });
  };
  my.exports.setDefaults = sS.bind(void 0, oS);
});

export { Ol };

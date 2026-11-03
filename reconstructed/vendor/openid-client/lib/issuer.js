/**
 * openid-client/lib/issuer.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { Ki } from "./errors.js";
import { Ly } from "./client.js";
import { nk } from "./issuer_registry.js";
import { pf } from "./helpers/process_response.js";
import { ik } from "./helpers/webfinger_normalize.js";
import { Ol } from "./helpers/request.js";
import { Pu } from "./helpers/deep_clone.js";
import { ky } from "./helpers/issuer.js";

//@ chunk-1ny7cxrt.js:69495-72747 cjs-fingerprint
var lk = x(function (ewe, ak) {
  var { inspect: inspect } = importMetaRequire("util"),
    Tl = importMetaRequire("url"),
    { RPError: RPError } = Ki(),
    vB = Ly(),
    Gs = nk(),
    sk = pf(),
    wB = ik(),
    Ef = Ol(),
    OB = Pu(),
    { keystore: keystore } = ky(),
    kB = [
      "https://login.microsoftonline.com/common/.well-known/openid-configuration",
      "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration",
      "https://login.microsoftonline.com/organizations/v2.0/.well-known/openid-configuration",
      "https://login.microsoftonline.com/consumers/v2.0/.well-known/openid-configuration",
    ],
    Uy = Symbol(),
    EB = {
      claim_types_supported: ["normal"],
      claims_parameter_supported: !1,
      grant_types_supported: ["authorization_code", "implicit"],
      request_parameter_supported: !1,
      request_uri_parameter_supported: !0,
      require_request_uri_registration: !1,
      response_modes_supported: ["query", "fragment"],
      token_endpoint_auth_methods_supported: ["client_secret_basic"],
    };
  class zy {
    #e;
    constructor(e = {}) {
      let t = e[Uy];
      (delete e[Uy],
        ["introspection", "revocation"].forEach((o) => {
          if (
            e[`${o}_endpoint`] &&
            e[`${o}_endpoint_auth_methods_supported`] === void 0 &&
            e[`${o}_endpoint_auth_signing_alg_values_supported`] === void 0
          ) {
            if (e.token_endpoint_auth_methods_supported)
              e[`${o}_endpoint_auth_methods_supported`] = e.token_endpoint_auth_methods_supported;
            if (e.token_endpoint_auth_signing_alg_values_supported)
              e[`${o}_endpoint_auth_signing_alg_values_supported`] =
                e.token_endpoint_auth_signing_alg_values_supported;
          }
        }),
        (this.#e = new Map()),
        Object.entries(e).forEach(([o, r]) => {
          if ((this.#e.set(o, r), !this[o]))
            Object.defineProperty(this, o, {
              get() {
                return this.#e.get(o);
              },
              enumerable: !0,
            });
        }),
        Gs.set(this.issuer, this));
      let n = vB(this, t);
      Object.defineProperties(this, {
        Client: { value: n, enumerable: !0 },
        FAPI1Client: { value: class extends n {}, enumerable: !0 },
        FAPI2Client: { value: class extends n {}, enumerable: !0 },
      });
    }
    get metadata() {
      return OB(Object.fromEntries(this.#e.entries()));
    }
    static async webfinger(e) {
      let t = wB(e),
        { host: host } = Tl.parse(t),
        o = `https://${host}/.well-known/webfinger`,
        r = await Ef.call(this, {
          method: "GET",
          url: o,
          responseType: "json",
          searchParams: { resource: t, rel: "http://openid.net/specs/connect/1.0/issuer" },
          headers: { Accept: "application/json" },
        }),
        s = sk(r),
        a =
          Array.isArray(s.links) &&
          s.links.find(
            (link) =>
              typeof link === "object" &&
              link.rel === "http://openid.net/specs/connect/1.0/issuer" &&
              link.href,
          );
      if (!a) throw new RPError({ message: "no issuer found in webfinger response", body: s });
      if (typeof a.href !== "string" || !a.href.startsWith("https://"))
        throw new RPError({ printf: ["invalid issuer location %s", a.href], body: s });
      let href = a.href;
      if (Gs.has(href)) return Gs.get(href);
      let discover = await this.discover(href);
      if (discover.issuer !== href)
        throw (
          Gs.del(discover.issuer),
          new RPError("discovered issuer mismatch, expected %s, got: %s", href, discover.issuer)
        );
      return discover;
    }
    static async discover(e) {
      let t = PB(e),
        n = await Ef.call(this, {
          method: "GET",
          responseType: "json",
          url: t,
          headers: { Accept: "application/json" },
        }),
        o = sk(n);
      return new zy({ ...EB, ...o, [Uy]: !!kB.find((r) => t.startsWith(r)) });
    }
    async reloadJwksUri() {
      await keystore.call(this, !0);
    }
    [inspect.custom]() {
      return `${this.constructor.name} ${inspect(this.metadata, { depth: 1 / 0, colors: process.stdout.isTTY, compact: !1, sorted: !0 })}`;
    }
  }
  function PB(e) {
    let parse = Tl.parse(e);
    if (parse.pathname.includes("/.well-known/")) return e;
    else {
      let n;
      if (parse.pathname.endsWith("/")) n = `${parse.pathname}.well-known/openid-configuration`;
      else n = `${parse.pathname}/.well-known/openid-configuration`;
      return Tl.format({ ...parse, pathname: n });
    }
  }
  ak.exports = zy;
});

export { lk };

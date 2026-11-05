/**
 * openid-client/lib/issuer.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { require_errors } from "./errors.js";
import { require_client_2 } from "./client.js";
import { require_issuer_registry } from "./issuer_registry.js";
import { require_process_response } from "./helpers/process_response.js";
import { require_webfinger_normalize } from "./helpers/webfinger_normalize.js";
import { require_request } from "./helpers/request.js";
import { require_deep_clone } from "./helpers/deep_clone.js";
import { require_issuer_2 } from "./helpers/issuer.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-1hnjmk23.js:69864-73116 cjs-fingerprint
var require_issuer; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-1hnjmk23.js:69864", () => {
  require_issuer = __commonJS(function (cjsExports, cjsModule) {
    var { inspect } = importMetaRequire("util");
    var url = importMetaRequire("url");
    var { RPError } = require_errors();
    var getClient = require_client_2();
    var registry = require_issuer_registry();
    var processResponse = require_process_response();
    var webfingerNormalize = require_webfinger_normalize();
    var request = require_request();
    var clone = require_deep_clone();
    var { keystore } = require_issuer_2();
    var AAD_MULTITENANT_DISCOVERY = [
      "https://login.microsoftonline.com/common/.well-known/openid-configuration",
      "https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration",
      "https://login.microsoftonline.com/organizations/v2.0/.well-known/openid-configuration",
      "https://login.microsoftonline.com/consumers/v2.0/.well-known/openid-configuration",
    ];
    var AAD_MULTITENANT = Symbol();
    var ISSUER_DEFAULTS = {
      claim_types_supported: ["normal"],
      claims_parameter_supported: false,
      grant_types_supported: ["authorization_code", "implicit"],
      request_parameter_supported: false,
      request_uri_parameter_supported: true,
      require_request_uri_registration: false,
      response_modes_supported: ["query", "fragment"],
      token_endpoint_auth_methods_supported: ["client_secret_basic"],
    };
    class Issuer {
      #e;
      constructor(meta = {}) {
        let aadIssValidation = meta[AAD_MULTITENANT];
        delete meta[AAD_MULTITENANT];
        ["introspection", "revocation"].forEach((endpoint) => {
          if (
            meta[`${endpoint}_endpoint`] &&
            meta[`${endpoint}_endpoint_auth_methods_supported`] === undefined &&
            meta[`${endpoint}_endpoint_auth_signing_alg_values_supported`] === undefined
          ) {
            if (meta.token_endpoint_auth_methods_supported)
              meta[`${endpoint}_endpoint_auth_methods_supported`] =
                meta.token_endpoint_auth_methods_supported;
            if (meta.token_endpoint_auth_signing_alg_values_supported)
              meta[`${endpoint}_endpoint_auth_signing_alg_values_supported`] =
                meta.token_endpoint_auth_signing_alg_values_supported;
          }
        });
        this.#e = new Map();
        Object.entries(meta).forEach(([key, value]) => {
          this.#e.set(key, value);
          if (!this[key])
            Object.defineProperty(this, key, {
              get() {
                return this.#e.get(key);
              },
              enumerable: true,
            });
        });
        registry.set(this.issuer, this);
        let Client = getClient(this, aadIssValidation);
        Object.defineProperties(this, {
          Client: {
            value: Client,
            enumerable: true,
          },
          FAPI1Client: {
            value: class extends Client {},
            enumerable: true,
          },
          FAPI2Client: {
            value: class extends Client {},
            enumerable: true,
          },
        });
      }
      get metadata() {
        return clone(Object.fromEntries(this.#e.entries()));
      }
      static async webfinger(input) {
        let resource = webfingerNormalize(input);
        let { host } = url.parse(resource);
        let webfingerUrl = `https://${host}/.well-known/webfinger`;
        let response = await request.call(this, {
          method: "GET",
          url: webfingerUrl,
          responseType: "json",
          searchParams: {
            resource,
            rel: "http://openid.net/specs/connect/1.0/issuer",
          },
          headers: {
            Accept: "application/json",
          },
        });
        let body = processResponse(response);
        let location =
          Array.isArray(body.links) &&
          body.links.find(
            (link) =>
              typeof link === "object" &&
              link.rel === "http://openid.net/specs/connect/1.0/issuer" &&
              link.href,
          );
        if (!location)
          throw new RPError({
            message: "no issuer found in webfinger response",
            body,
          });
        if (typeof location.href !== "string" || !location.href.startsWith("https://"))
          throw new RPError({
            printf: ["invalid issuer location %s", location.href],
            body,
          });
        let expectedIssuer = location.href;
        if (registry.has(expectedIssuer)) return registry.get(expectedIssuer);
        let issuer = await this.discover(expectedIssuer);
        if (issuer.issuer !== expectedIssuer) {
          registry.del(issuer.issuer);
          throw new RPError(
            "discovered issuer mismatch, expected %s, got: %s",
            expectedIssuer,
            issuer.issuer,
          );
        }
        return issuer;
      }
      static async discover(uri) {
        let wellKnownUri = resolveWellKnownUri(uri);
        let response = await request.call(this, {
          method: "GET",
          responseType: "json",
          url: wellKnownUri,
          headers: {
            Accept: "application/json",
          },
        });
        let body = processResponse(response);
        return new Issuer({
          ...ISSUER_DEFAULTS,
          ...body,
          [AAD_MULTITENANT]: !!AAD_MULTITENANT_DISCOVERY.find((discoveryURL) =>
            wellKnownUri.startsWith(discoveryURL),
          ),
        });
      }
      async reloadJwksUri() {
        await keystore.call(this, true);
      }
      [inspect.custom]() {
        return `${this.constructor.name} ${inspect(this.metadata, {
          depth: 1 / 0,
          colors: process.stdout.isTTY,
          compact: false,
          sorted: true,
        })}`;
      }
    }
    function resolveWellKnownUri(uri) {
      let parsed = url.parse(uri);
      if (parsed.pathname.includes("/.well-known/")) return uri;
      else {
        let pathname;
        if (parsed.pathname.endsWith("/")) pathname = `${parsed.pathname}.well-known/openid-configuration`;
        else pathname = `${parsed.pathname}/.well-known/openid-configuration`;
        return url.format({
          ...parsed,
          pathname,
        });
      }
    }
    cjsModule.exports = Issuer;
  });
});
export { require_issuer };

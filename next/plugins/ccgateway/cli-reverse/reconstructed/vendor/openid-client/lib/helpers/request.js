/**
 * openid-client/lib/helpers/request.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { require_lru_cache } from "../../../lru-cache/index.js";
import { require_package } from "../../package.json.js";
import { require_errors } from "../errors.js";
import { require_pick } from "./pick.js";
import { require_defaults } from "./defaults.js";
import { require_consts } from "./consts.js";

//@ chunk-1hnjmk23.js:21369-24052 cjs-fingerprint
var require_request = __commonJS(function (cjsExports, cjsModule) {
  var assert = importMetaRequire("assert");
  var querystring = importMetaRequire("querystring");
  var http = importMetaRequire("http");
  var https = importMetaRequire("https");
  var { once } = importMetaRequire("events");
  var { URL: NodeURL } = importMetaRequire("url");
  var LRU = require_lru_cache();
  var pkg = require_package();
  var { RPError } = require_errors();
  var pick = require_pick();
  var { deep: defaultsDeep } = require_defaults();
  var { HTTP_OPTIONS } = require_consts();
  var DEFAULT_HTTP_OPTIONS;
  var NQCHAR = /^[\x21\x23-\x5B\x5D-\x7E]+$/;
  var allowed = ["agent", "ca", "cert", "crl", "headers", "key", "lookup", "passphrase", "pfx", "timeout"];
  var setDefaults = (props, options) => {
    DEFAULT_HTTP_OPTIONS = defaultsDeep(
      {},
      props.length ? pick(options, ...props) : options,
      DEFAULT_HTTP_OPTIONS,
    );
  };
  setDefaults([], {
    headers: {
      "User-Agent": `${pkg.name}/${pkg.version} (${pkg.homepage})`,
      "Accept-Encoding": "identity",
    },
    timeout: 3500,
  });
  function send(req, body, contentType) {
    if (contentType) {
      req.removeHeader("content-type");
      req.setHeader("content-type", contentType);
    }
    if (body) {
      req.removeHeader("content-length");
      req.setHeader("content-length", Buffer.byteLength(body));
      req.write(body);
    }
    req.end();
  }
  var nonces = new LRU({
    max: 100,
  });
  cjsModule.exports = async function (options, { accessToken, mTLS = false, DPoP } = {}) {
    let url;
    try {
      url = new NodeURL(options.url);
      delete options.url;
      assert(/^(https?:)$/.test(url.protocol));
    } catch (err) {
      throw TypeError("only valid absolute URLs can be requested");
    }
    let optsFn = this[HTTP_OPTIONS];
    let opts = options;
    let nonceKey = `${url.origin}${url.pathname}`;
    if (DPoP && "dpopProof" in this) {
      opts.headers = opts.headers || {};
      opts.headers.DPoP = await this.dpopProof(
        {
          htu: `${url.origin}${url.pathname}`,
          htm: options.method || "GET",
          nonce: nonces.get(nonceKey),
        },
        DPoP,
        accessToken,
      );
    }
    let userOptions;
    if (optsFn)
      userOptions = pick(optsFn.call(this, url, defaultsDeep({}, opts, DEFAULT_HTTP_OPTIONS)), ...allowed);
    opts = defaultsDeep({}, userOptions, opts, DEFAULT_HTTP_OPTIONS);
    if (mTLS && !opts.pfx && !(opts.key && opts.cert))
      throw TypeError("mutual-TLS certificate and key not set");
    if (opts.searchParams)
      for (let [key, value] of Object.entries(opts.searchParams)) {
        url.searchParams.delete(key);
        url.searchParams.set(key, value);
      }
    let responseType;
    let form;
    let json;
    let body;
    ({ form, responseType, json, body, ...opts } = opts);
    for (let [key, value] of Object.entries(opts.headers || {}))
      if (value === undefined) delete opts.headers[key];
    let response;
    let req = (url.protocol === "https:" ? https.request : http.request)(url.href, opts);
    return (async () => {
      if (json) send(req, JSON.stringify(json), "application/json");
      else if (form) send(req, querystring.stringify(form), "application/x-www-form-urlencoded");
      else if (body) send(req, body);
      else send(req);
      [response] = await Promise.race([once(req, "response"), once(req, "timeout")]);
      if (!response) {
        req.destroy();
        throw new RPError(`outgoing request timed out after ${opts.timeout}ms`);
      }
      let parts = [];
      for await (let part of response) parts.push(part);
      if (parts.length)
        switch (responseType) {
          case "json": {
            Object.defineProperty(response, "body", {
              get() {
                let value = Buffer.concat(parts);
                try {
                  value = JSON.parse(value);
                } catch (err) {
                  Object.defineProperty(err, "response", {
                    value: response,
                  });
                  throw err;
                } finally {
                  Object.defineProperty(response, "body", {
                    value,
                    configurable: true,
                  });
                }
                return value;
              },
              configurable: true,
            });
            break;
          }
          case undefined:
          case "buffer": {
            Object.defineProperty(response, "body", {
              get() {
                let value = Buffer.concat(parts);
                Object.defineProperty(response, "body", {
                  value,
                  configurable: true,
                });
                return value;
              },
              configurable: true,
            });
            break;
          }
          default:
            throw TypeError("unsupported responseType request option");
        }
      return response;
    })()
      .catch((err) => {
        if (response)
          Object.defineProperty(err, "response", {
            value: response,
          });
        throw err;
      })
      .finally(() => {
        let dpopNonce = response && response.headers["dpop-nonce"];
        if (dpopNonce && NQCHAR.test(dpopNonce)) nonces.set(nonceKey, dpopNonce);
      });
  };
  cjsModule.exports.setDefaults = setDefaults.bind(undefined, allowed);
});
export { require_request };

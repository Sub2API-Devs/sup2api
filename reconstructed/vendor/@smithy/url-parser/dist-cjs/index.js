/**
 * @smithy/url-parser/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/url-parser@2.2.0
 * pieces: chunk-k057sjda.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { a } from "../../querystring-parser/dist-cjs/index.js";

//@ chunk-k057sjda.js:515-772 cjs-fingerprint
var P4 = x(function (y) {
  var l = a(),
    i = (t) => {
      if (typeof t === "string") return i(new URL(t));
      let { hostname: hostname, pathname: pathname, port: port, protocol: protocol, search: search } = t,
        p;
      if (search) p = l.parseQueryString(search);
      return {
        hostname: hostname,
        port: port ? parseInt(port) : void 0,
        protocol: protocol,
        path: pathname,
        query: p,
      };
    };
  y.parseUrl = i;
});

export { P4 };

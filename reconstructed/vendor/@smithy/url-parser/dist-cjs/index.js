/**
 * @smithy/url-parser/dist-cjs/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/url-parser@2.2.0
 * pieces: chunk-k057sjda.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_querystring_parser } from "../../querystring-parser/dist-cjs/index.js";

//@ chunk-k057sjda.js:515-772 cjs-fingerprint
var require_url_parser = __commonJS(function (cjsExports) {
  var import_querystring_parser = require_querystring_parser();
  var parseUrl = (url) => {
    if (typeof url === "string") return parseUrl(new URL(url));
    let { hostname, pathname, port, protocol, search } = url;
    let query;
    if (search) query = import_querystring_parser.parseQueryString(search);
    return {
      hostname,
      port: port ? parseInt(port) : undefined,
      protocol,
      path: pathname,
      query,
    };
  };
  cjsExports.parseUrl = parseUrl;
});
export { require_url_parser };

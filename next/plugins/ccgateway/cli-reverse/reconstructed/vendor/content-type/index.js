/**
 * content-type/index.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: content-type@1.0.5
 * pieces: chunk-qq5knpkd.js (1)
 * attribution: cjs-fingerprint 1
 */
import {
  initModule,
  interopDefault,
} from "../@modelcontextprotocol/core/(bundler runtime of a pre-bundled dist file).js";

//@ chunk-qq5knpkd.js:120233-121507 cjs-fingerprint
var require_content_type = initModule((cjsExports) => {
  var PARAM_REGEXP =
    /; *([!#$%&'*+.^_`|~0-9A-Za-z-]+) *= *("(?:[\u000b\u0020\u0021\u0023-\u005b\u005d-\u007e\u0080-\u00ff]|\\[\u000b\u0020-\u00ff])*"|[!#$%&'*+.^_`|~0-9A-Za-z-]+) */g;
  var QESC_REGEXP = /\\([\u000b\u0020-\u00ff])/g;
  var TYPE_REGEXP = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+\/[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;
  cjsExports.parse = parse;
  function parse(string) {
    if (!string) throw TypeError("argument string is required");
    var header = typeof string === "object" ? getcontenttype(string) : string;
    if (typeof header !== "string") throw TypeError("argument string is required to be a string");
    var index = header.indexOf(";");
    var type = index !== -1 ? header.slice(0, index).trim() : header.trim();
    if (!TYPE_REGEXP.test(type)) throw TypeError("invalid media type");
    var obj = new ContentType(type.toLowerCase());
    if (index !== -1) {
      var key;
      var match;
      var value;
      PARAM_REGEXP.lastIndex = index;
      while ((match = PARAM_REGEXP.exec(header))) {
        if (match.index !== index) throw TypeError("invalid parameter format");
        index += match[0].length;
        key = match[1].toLowerCase();
        value = match[2];
        if (value.charCodeAt(0) === 34) {
          value = value.slice(1, -1);
          if (value.indexOf("\\") !== -1) value = value.replace(QESC_REGEXP, "$1");
        }
        obj.parameters[key] = value;
      }
      if (index !== header.length) throw TypeError("invalid parameter format");
    }
    return obj;
  }
  function getcontenttype(obj) {
    var header;
    if (typeof obj.getHeader === "function") header = obj.getHeader("content-type");
    else if (typeof obj.headers === "object") header = obj.headers && obj.headers["content-type"];
    if (typeof header !== "string") throw TypeError("content-type header is missing from object");
    return header;
  }
  function ContentType(type) {
    this.parameters = Object.create(null);
    this.type = type;
  }
});
var import_content_type = interopDefault(require_content_type(), 1);
export { import_content_type };

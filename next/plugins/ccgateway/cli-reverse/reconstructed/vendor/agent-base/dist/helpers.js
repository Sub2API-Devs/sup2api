/**
 * agent-base/dist/helpers.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: agent-base@7.1.1..7.1.4
 * pieces: chunk-hq88884p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../runtime/bun-runtime.js";

//@ chunk-hq88884p.js:17045-18297 cjs-fingerprint
var require_helpers = __commonJS(function (cjsExports) {
  var __createBinding =
    (cjsExports && cjsExports.__createBinding) ||
    (Object.create
      ? function (o_2, m, k, k2) {
          if (k2 === undefined) k2 = k;
          var desc = Object.getOwnPropertyDescriptor(m, k);
          if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable))
            desc = {
              enumerable: true,
              get: function () {
                return m[k];
              },
            };
          Object.defineProperty(o_2, k2, desc);
        }
      : function (o_2, m, k, k2) {
          if (k2 === undefined) k2 = k;
          o_2[k2] = m[k];
        });
  var __setModuleDefault =
    (cjsExports && cjsExports.__setModuleDefault) ||
    (Object.create
      ? function (o, v) {
          Object.defineProperty(o, "default", {
            enumerable: true,
            value: v,
          });
        }
      : function (o, v) {
          o.default = v;
        });
  var __importStar =
    (cjsExports && cjsExports.__importStar) ||
    function (mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod)
          if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k))
            __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.req = cjsExports.json = cjsExports.toBuffer = undefined;
  var http = __importStar(importMetaRequire("http"));
  var https = __importStar(importMetaRequire("https"));
  async function toBuffer(stream) {
    let length = 0;
    let chunks = [];
    for await (let chunk of stream) {
      length += chunk.length;
      chunks.push(chunk);
    }
    return Buffer.concat(chunks, length);
  }
  cjsExports.toBuffer = toBuffer;
  async function json(stream) {
    let str = (await toBuffer(stream)).toString("utf8");
    try {
      return JSON.parse(str);
    } catch (_err) {
      let err = _err;
      err.message += ` (input: ${str})`;
      throw err;
    }
  }
  cjsExports.json = json;
  function req(url, opts = {}) {
    let req = ((typeof url === "string" ? url : url.href).startsWith("https:") ? https : http).request(
      url,
      opts,
    );
    let promise = new Promise((resolve, reject) => {
      req.once("response", resolve).once("error", reject).end();
    });
    req.then = promise.then.bind(promise);
    return req;
  }
  cjsExports.req = req;
});
export { require_helpers };

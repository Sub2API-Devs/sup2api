/**
 * https-proxy-agent/dist/parse-proxy-response.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: https-proxy-agent@7.0.4..7.0.6
 * pieces: chunk-355mdh7x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_debug_2 } from "../../debug/src/index.js";

//@ chunk-355mdh7x.js:20988-22425 cjs-fingerprint
var require_parse_proxy_response = __commonJS(function (cjsExports) {
  var __importDefault =
    (cjsExports && cjsExports.__importDefault) ||
    function (mod) {
      return mod && mod.__esModule
        ? mod
        : {
            default: mod,
          };
    };
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.parseProxyResponse = undefined;
  var debug_1 = __importDefault(require_debug_2());
  var debug = (0, debug_1.default)("https-proxy-agent:parse-proxy-response");
  function parseProxyResponse(socket) {
    return new Promise((resolve, reject) => {
      let buffersLength = 0;
      let buffers = [];
      function read() {
        let b = socket.read();
        if (b) ondata(b);
        else socket.once("readable", read);
      }
      function cleanup() {
        socket.removeListener("end", onend);
        socket.removeListener("error", onerror);
        socket.removeListener("readable", read);
      }
      function onend() {
        cleanup();
        debug("onend");
        reject(Error("Proxy connection ended before receiving CONNECT response"));
      }
      function onerror(err) {
        cleanup();
        debug("onerror %o", err);
        reject(err);
      }
      function ondata(b_2) {
        buffers.push(b_2);
        buffersLength += b_2.length;
        let buffered = Buffer.concat(buffers, buffersLength);
        let endOfHeaders = buffered.indexOf(`\r
\r
`);
        if (endOfHeaders === -1) {
          debug("have not received end of HTTP headers yet...");
          read();
          return;
        }
        let headerParts = buffered.slice(0, endOfHeaders).toString("ascii").split(`\r
`);
        let firstLine = headerParts.shift();
        if (!firstLine) {
          socket.destroy();
          return reject(Error("No header received from proxy CONNECT response"));
        }
        let firstLineParts = firstLine.split(" ");
        let statusCode = +firstLineParts[1];
        let statusText = firstLineParts.slice(2).join(" ");
        let headers = {};
        for (let header of headerParts) {
          if (!header) continue;
          let firstColon = header.indexOf(":");
          if (firstColon === -1) {
            socket.destroy();
            return reject(Error(`Invalid header from proxy CONNECT response: "${header}"`));
          }
          let key = header.slice(0, firstColon).toLowerCase();
          let value = header.slice(firstColon + 1).trimStart();
          let current = headers[key];
          if (typeof current === "string") headers[key] = [current, value];
          else if (Array.isArray(current)) current.push(value);
          else headers[key] = value;
        }
        debug("got proxy server response: %o %o", firstLine, headers);
        cleanup();
        resolve({
          connect: {
            statusCode,
            statusText,
            headers,
          },
          buffered,
        });
      }
      socket.on("error", onerror);
      socket.on("end", onend);
      read();
    });
  }
  cjsExports.parseProxyResponse = parseProxyResponse;
});
export { require_parse_proxy_response };

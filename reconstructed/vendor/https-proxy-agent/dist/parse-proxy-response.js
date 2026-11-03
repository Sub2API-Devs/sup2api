/**
 * https-proxy-agent/dist/parse-proxy-response.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: https-proxy-agent@7.0.4..7.0.6
 * pieces: chunk-hq88884p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { pMn } from "../../debug/src/index.js";

//@ chunk-hq88884p.js:20967-22404 cjs-fingerprint
var nr = x(function (te) {
  var uo =
    (te && te.__importDefault) ||
    function (e) {
      return e && e.__esModule ? e : { default: e };
    };
  Object.defineProperty(te, "__esModule", { value: !0 });
  te.parseProxyResponse = void 0;
  var fo = uo(pMn()),
    ye = (0, fo.default)("https-proxy-agent:parse-proxy-response");
  function po(e) {
    return new Promise((r, n) => {
      let o = 0,
        s = [];
      function c() {
        let read = e.read();
        if (read) b(read);
        else e.once("readable", c);
      }
      function a() {
        (e.removeListener("end", u), e.removeListener("error", l), e.removeListener("readable", c));
      }
      function u() {
        (a(), ye("onend"), n(Error("Proxy connection ended before receiving CONNECT response")));
      }
      function l(E) {
        (a(), ye("onerror %o", E), n(E));
      }
      function b(E) {
        (s.push(E), (o += E.length));
        let buffer = Buffer.concat(s, o),
          index = buffer.indexOf(`\r
\r
`);
        if (index === -1) {
          (ye("have not received end of HTTP headers yet..."), c());
          return;
        }
        let parts = buffer.slice(0, index).toString("ascii").split(`\r
`),
          A = parts.shift();
        if (!A) return (e.destroy(), n(Error("No header received from proxy CONNECT response")));
        let parts_2 = A.split(" "),
          d = +parts_2[1],
          joined = parts_2.slice(2).join(" "),
          y = {};
        for (let T of parts) {
          if (!T) continue;
          let index = T.indexOf(":");
          if (index === -1)
            return (e.destroy(), n(Error(`Invalid header from proxy CONNECT response: "${T}"`)));
          let lower = T.slice(0, index).toLowerCase(),
            trimStart = T.slice(index + 1).trimStart(),
            S = y[lower];
          if (typeof S === "string") y[lower] = [S, trimStart];
          else if (Array.isArray(S)) S.push(trimStart);
          else y[lower] = trimStart;
        }
        (ye("got proxy server response: %o %o", A, y),
          a(),
          r({ connect: { statusCode: d, statusText: joined, headers: y }, buffered: buffer }));
      }
      (e.on("error", l), e.on("end", u), c());
    });
  }
  te.parseProxyResponse = po;
});

export { nr };

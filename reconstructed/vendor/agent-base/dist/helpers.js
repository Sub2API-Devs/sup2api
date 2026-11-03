/**
 * agent-base/dist/helpers.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: agent-base@7.1.1..7.1.4
 * pieces: chunk-hq88884p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";

//@ chunk-hq88884p.js:17045-18297 cjs-fingerprint
var Qt = x(function (U) {
  var Zn =
      (U && U.__createBinding) ||
      (Object.create
        ? function (e, r, n, o) {
            if (o === void 0) o = n;
            var ownPropertyDescriptor = Object.getOwnPropertyDescriptor(r, n);
            if (
              !ownPropertyDescriptor ||
              ("get" in ownPropertyDescriptor
                ? !r.__esModule
                : ownPropertyDescriptor.writable || ownPropertyDescriptor.configurable)
            )
              ownPropertyDescriptor = {
                enumerable: !0,
                get: function () {
                  return r[n];
                },
              };
            Object.defineProperty(e, o, ownPropertyDescriptor);
          }
        : function (e, r, n, o) {
            if (o === void 0) o = n;
            e[o] = r[n];
          }),
    eo =
      (U && U.__setModuleDefault) ||
      (Object.create
        ? function (e, r) {
            Object.defineProperty(e, "default", { enumerable: !0, value: r });
          }
        : function (e, r) {
            e.default = r;
          }),
    Gt =
      (U && U.__importStar) ||
      function (e) {
        if (e && e.__esModule) return e;
        var r = {};
        if (e != null) {
          for (var key in e)
            if (key !== "default" && Object.prototype.hasOwnProperty.call(e, key)) Zn(r, e, key);
        }
        return (eo(r, e), r);
      };
  Object.defineProperty(U, "__esModule", { value: !0 });
  U.req = U.json = U.toBuffer = void 0;
  var to = Gt(importMetaRequire("http")),
    ro = Gt(importMetaRequire("https"));
  async function Vt(e) {
    let r = 0,
      n = [];
    for await (let o of e) ((r += o.length), n.push(o));
    return Buffer.concat(n, r);
  }
  U.toBuffer = Vt;
  async function no(e) {
    let str = (await Vt(e)).toString("utf8");
    try {
      return JSON.parse(str);
    } catch (error) {
      let s = error;
      throw ((s.message += ` (input: ${str})`), s);
    }
  }
  U.json = no;
  function oo(e, r = {}) {
    let request = ((typeof e === "string" ? e : e.href).startsWith("https:") ? ro : to).request(e, r),
      promise = new Promise((c, a) => {
        request.once("response", c).once("error", a).end();
      });
    return ((request.then = promise.then.bind(promise)), request);
  }
  U.req = oo;
});

export { Qt };

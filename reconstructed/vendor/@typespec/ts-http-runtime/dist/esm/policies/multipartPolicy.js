/**
 * @typespec/ts-http-runtime/dist/esm/policies/multipartPolicy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (8)
 * attribution: esm-fingerprint 6, esm-layout 2
 */
import { Bn } from "../pipelineRequest.js";
import { hasStreamMethod, rt, Pl } from "../util/concat.js";

//@ chunk-mrx6y2r5.js:50855-50906 esm-fingerprint
function Ym() {
  return `----AzSDKFormBoundary${Bn()}`;
}
//@ chunk-mrx6y2r5.js:50906-50975 esm-layout
function Wm(e) {
  let t = "";
  for (let [r, n] of e)
    t += `${r}: ${n}\r
`;
  return t;
}
//@ chunk-mrx6y2r5.js:50975-51096 esm-fingerprint
function Qm(e) {
  if (e instanceof Uint8Array) return e.byteLength;
  else if (hasStreamMethod(e)) return e.size === -1 ? void 0 : e.size;
  else return;
}
//@ chunk-mrx6y2r5.js:51096-51187 esm-layout
function Jm(e) {
  let t = 0;
  for (let r of e) {
    let n = Qm(r);
    if (n === void 0) return;
    else t += n;
  }
  return t;
}
//@ chunk-mrx6y2r5.js:51187-51444 esm-fingerprint
async function Xm(e, t, r) {
  let n = [
      rt(`--${r}`, "utf-8"),
      ...t.flatMap((i) => [
        rt(
          `\r
`,
          "utf-8",
        ),
        rt(Wm(i.headers), "utf-8"),
        rt(
          `\r
`,
          "utf-8",
        ),
        i.body,
        rt(
          `\r
--${r}`,
          "utf-8",
        ),
      ]),
      rt(
        `--\r
\r
`,
        "utf-8",
      ),
    ],
    o = Jm(n);
  if (o) e.headers.set("Content-Length", o);
  e.body = await Pl(n);
}
//@ chunk-mrx6y2r5.js:51444-51563 esm-fingerprint
var MULTIPARTPOLICY = "multipartPolicy",
  Zm = 70,
  ep = new Set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'()+,-./:=?");
//@ chunk-mrx6y2r5.js:51563-51782 esm-fingerprint
function tp(e) {
  if (e.length > Zm) throw Error(`Multipart boundary "${e}" exceeds maximum length of 70 characters`);
  if (Array.from(e).some((t) => !ep.has(t)))
    throw Error(`Multipart boundary "${e}" contains invalid characters`);
}
//@ chunk-mrx6y2r5.js:51782-52525 esm-fingerprint
function ca() {
  return {
    name: MULTIPARTPOLICY,
    async sendRequest(e, t) {
      var r;
      if (!e.multipartBody) return t(e);
      if (e.body) throw Error("multipartBody and regular body cannot be set at the same time");
      let boundary = e.multipartBody.boundary,
        o = (r = e.headers.get("Content-Type")) !== null && r !== void 0 ? r : "multipart/mixed",
        match = o.match(/^(multipart\/[^ ;]+)(?:; *boundary=(.+))?$/);
      if (!match) throw Error(`Got multipart request body, but content-type header was not multipart: ${o}`);
      let [, s, a] = match;
      if (a && boundary && a !== boundary)
        throw Error(
          `Multipart boundary was specified as ${a} in the header, but got ${boundary} in the request body`,
        );
      if (((boundary !== null && boundary !== void 0) || (boundary = a), boundary)) tp(boundary);
      else boundary = Ym();
      return (
        e.headers.set("Content-Type", `${s}; boundary=${boundary}`),
        await Xm(e, e.multipartBody.parts, boundary),
        (e.multipartBody = void 0),
        t(e)
      );
    },
  };
}

export { MULTIPARTPOLICY, ca };

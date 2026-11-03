/**
 * @typespec/ts-http-runtime/dist/esm/policies/formDataPolicy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @typespec/ts-http-runtime@0.2.3..0.3.0
 * pieces: chunk-mrx6y2r5.js (5)
 * attribution: esm-fingerprint 5
 */
import { Gr } from "../util/checkEnvironment.js";
import { et } from "../pipelineRequest.js";
import { rt } from "../util/concat.js";

//@ chunk-mrx6y2r5.js:48001-48025 esm-fingerprint
var FORMDATAPOLICY = "formDataPolicy";
//@ chunk-mrx6y2r5.js:48025-48143 esm-fingerprint
function Gm(e) {
  var t;
  let r = {};
  for (let [n, o] of e.entries()) (((t = r[n]) !== null && t !== void 0) || (r[n] = []), r[n].push(o));
  return r;
}
//@ chunk-mrx6y2r5.js:48143-48477 esm-fingerprint
function oa() {
  return {
    name: FORMDATAPOLICY,
    async sendRequest(e, t) {
      if (Gr && typeof FormData < "u" && e.body instanceof FormData)
        ((e.formData = Gm(e.body)), (e.body = void 0));
      if (e.formData) {
        let r = e.headers.get("Content-Type");
        if (r && r.indexOf("application/x-www-form-urlencoded") !== -1) e.body = qm(e.formData);
        else await Km(e.formData, e);
        e.formData = void 0;
      }
      return t(e);
    },
  };
}
//@ chunk-mrx6y2r5.js:48477-48661 esm-fingerprint
function qm(e) {
  let uRLSearchParams = new URLSearchParams();
  for (let [r, n] of Object.entries(e))
    if (Array.isArray(n)) for (let o of n) uRLSearchParams.append(r, o.toString());
    else uRLSearchParams.append(r, n.toString());
  return uRLSearchParams.toString();
}
//@ chunk-mrx6y2r5.js:48661-49396 esm-fingerprint
async function Km(e, t) {
  let r = t.headers.get("Content-Type");
  if (r && !r.startsWith("multipart/form-data")) return;
  t.headers.set("Content-Type", r !== null && r !== void 0 ? r : "multipart/form-data");
  let n = [];
  for (let [o, i] of Object.entries(e))
    for (let s of Array.isArray(i) ? i : [i])
      if (typeof s === "string")
        n.push({ headers: et({ "Content-Disposition": `form-data; name="${o}"` }), body: rt(s, "utf-8") });
      else if (s === void 0 || s === null || typeof s !== "object")
        throw Error(`Unexpected value for key ${o}: ${s}. Value should be serialized to string first.`);
      else {
        let a = s.name || "blob",
          c = et();
        (c.set("Content-Disposition", `form-data; name="${o}"; filename="${a}"`),
          c.set("Content-Type", s.type || "application/octet-stream"),
          n.push({ headers: c, body: s }));
      }
  t.multipartBody = { parts: n };
}

export { oa };

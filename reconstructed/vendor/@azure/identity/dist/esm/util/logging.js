/**
 * @azure/identity/dist/esm/util/logging.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/identity@4.10.1
 * pieces: chunk-mrx6y2r5.js (6)
 * attribution: esm-fingerprint 6
 */
import { Pt } from "../../../../logger/dist/esm/index.js";

//@ chunk-mrx6y2r5.js:26851-26873 esm-fingerprint
var $e = Pt("identity");
//@ chunk-mrx6y2r5.js:26873-27008 esm-fingerprint
function Ho(e) {
  return e.reduce(
    (t, r) => {
      if (process.env[r]) t.assigned.push(r);
      else t.missing.push(r);
      return t;
    },
    { missing: [], assigned: [] },
  );
}
//@ chunk-mrx6y2r5.js:27008-27084 esm-fingerprint
function he(e) {
  return `SUCCESS. Scopes: ${Array.isArray(e) ? e.join(", ") : e}.`;
}
//@ chunk-mrx6y2r5.js:27084-27269 esm-fingerprint
function q(e, t) {
  let r = "ERROR.";
  if (e === null || e === void 0 ? void 0 : e.length) r += ` Scopes: ${Array.isArray(e) ? e.join(", ") : e}.`;
  return `${r} Error message: ${typeof t === "string" ? t : t.message}.`;
}
//@ chunk-mrx6y2r5.js:27269-27529 esm-fingerprint
function sl(e, t, r = $e) {
  let n = t ? `${t.fullTitle} ${e}` : e;
  function o(c) {
    r.info(`${n} =>`, c);
  }
  function i(c) {
    r.warning(`${n} =>`, c);
  }
  function s(c) {
    r.verbose(`${n} =>`, c);
  }
  function a(c) {
    r.error(`${n} =>`, c);
  }
  return { title: e, fullTitle: n, info: o, warning: i, verbose: s, error: a };
}
//@ chunk-mrx6y2r5.js:27529-27655 esm-fingerprint
function z(e, t = $e) {
  let r = sl(e, void 0, t);
  return Object.assign(Object.assign({}, r), { parent: t, getToken: sl("=> getToken()", r, t) });
}

export { q, z, Ho, he, $e };

/**
 * @azure/core-rest-pipeline/dist/esm/policies/redirectPolicy.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-fingerprint 2, esm-layout 1
 */

//@ chunk-mrx6y2r5.js:54403-54425 esm-fingerprint
var Bl = ["GET", "HEAD"];
//@ chunk-mrx6y2r5.js:54425-54554 esm-layout
function ha(e = {}) {
  let { maxRetries: maxRetries = 20 } = e;
  return {
    name: "redirectPolicy",
    async sendRequest(r, n) {
      let o = await n(r);
      return zl(n, o, maxRetries);
    },
  };
}
//@ chunk-mrx6y2r5.js:54554-54960 esm-fingerprint
async function zl(e, t, r, n = 0) {
  let { request: request, status: status, headers: headers } = t,
    a = headers.get("location");
  if (
    a &&
    (status === 300 ||
      (status === 301 && Bl.includes(request.method)) ||
      (status === 302 && Bl.includes(request.method)) ||
      (status === 303 && request.method === "POST") ||
      status === 307) &&
    n < r
  ) {
    let c = new URL(a, request.url);
    if (((request.url = c.toString()), status === 303))
      ((request.method = "GET"), request.headers.delete("Content-Length"), delete request.body);
    request.headers.delete("Authorization");
    let l = await e(request);
    return zl(e, l, r, n + 1);
  }
  return t;
}

export { ha };

/**
 * @azure/core-rest-pipeline/dist/esm/util/tokenCycler.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/core-rest-pipeline@1.21.0
 * pieces: chunk-mrx6y2r5.js (3)
 * attribution: esm-fingerprint 3
 */
import { ma } from "../../../../core-util/dist/esm/delay.js";

//@ chunk-mrx6y2r5.js:63072-63158 esm-fingerprint
var Lp = { forcedRefreshWindowInMs: 1000, retryIntervalInMs: 3000, refreshWindowInMs: 120000 };
//@ chunk-mrx6y2r5.js:63158-63414 esm-fingerprint
async function Hp(e, t, r) {
  async function n() {
    if (Date.now() < r)
      try {
        return await e();
      } catch (error) {
        return null;
      }
    else {
      let i = await e();
      if (i === null) throw Error("Failed to refresh access token.");
      return i;
    }
  }
  let o = await n();
  while (o === null) (await ma(t), (o = await n()));
  return o;
}
//@ chunk-mrx6y2r5.js:63414-64307 esm-fingerprint
function gd(e, t) {
  let r = null,
    n = null,
    o,
    merged = Object.assign(Object.assign({}, Lp), t),
    s = {
      get isRefreshing() {
        return r !== null;
      },
      get shouldRefresh() {
        var c;
        if (s.isRefreshing) return !1;
        if (
          (n === null || n === void 0 ? void 0 : n.refreshAfterTimestamp) &&
          n.refreshAfterTimestamp < Date.now()
        )
          return !0;
        return (
          ((c = n === null || n === void 0 ? void 0 : n.expiresOnTimestamp) !== null && c !== void 0
            ? c
            : 0) -
            merged.refreshWindowInMs <
          Date.now()
        );
      },
      get mustRefresh() {
        return n === null || n.expiresOnTimestamp - merged.forcedRefreshWindowInMs < Date.now();
      },
    };
  function a(c, l) {
    var d;
    if (!s.isRefreshing)
      r = Hp(
        () => e.getToken(c, l),
        merged.retryIntervalInMs,
        (d = n === null || n === void 0 ? void 0 : n.expiresOnTimestamp) !== null && d !== void 0
          ? d
          : Date.now(),
      )
        .then((m) => ((r = null), (n = m), (o = l.tenantId), n))
        .catch((m) => {
          throw ((r = null), (n = null), (o = void 0), m);
        });
    return r;
  }
  return async (c, l) => {
    let d = Boolean(l.claims),
      u = o !== l.tenantId;
    if (d) n = null;
    if (u || d || s.mustRefresh) return a(c, l);
    if (s.shouldRefresh) a(c, l);
    return n;
  };
}

export { gd };

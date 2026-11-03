/**
 * services/artifacts/ownPublishes.ts
 *
 * 2.1.316 新增：记录本会话自己的发布与进行中状态
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-06y4szbn.js (10)
 * attribution: placement 10
 */
import { createFieldAccessor, KSi } from "../../state/sliceHelpers.js";

//@ chunk-06y4szbn.js:31510-31602 placement
var jo = 8,
  VER_SHAPE = /^[A-Za-z0-9._-]{1,64}$/,
  ss = { ownVers: {}, inFlight: {} },
  makeOwnPublishesStore = createFieldAccessor("ownPublishes", ss);
//@ chunk-06y4szbn.js:31602-31632 placement
function makeLocalOwnPublishesStore() {
  return KSi(ss);
}
//@ chunk-06y4szbn.js:31632-32020 placement
function recordOwnPublish(e, n, r, s = {}) {
  if (!VER_SHAPE.test(r)) return;
  e.set((h) => {
    let b = h.ownVers[n] ?? [],
      y = h.mergedVers?.[n] ?? [],
      included = b.includes(r),
      included_2 = y.includes(r);
    if (included && (s.merged !== !0 || included_2)) return h;
    let R = included ? b : [...b, r].slice(-jo),
      filtered = (s.merged === !0 && !included_2 ? [...y, r] : y).filter((k) => R.includes(k));
    return {
      ...h,
      ownVers: { ...h.ownVers, [n]: R },
      ...((h.mergedVers?.[n] !== void 0 || filtered.length > 0) && {
        mergedVers: { ...h.mergedVers, [n]: filtered },
      }),
    };
  });
}
//@ chunk-06y4szbn.js:32020-32083 placement
function isOwnPublishedVer(e, n, r) {
  return e.get().ownVers[n]?.includes(r) ?? !1;
}
//@ chunk-06y4szbn.js:32083-32194 placement
function isVouchedOwnVer(e, n, r) {
  let s = e.get();
  return (s.ownVers[n]?.includes(r) ?? !1) && !(s.mergedVers?.[n]?.includes(r) ?? !1);
}
//@ chunk-06y4szbn.js:32194-32252 placement
function hasOwnPublished(e, n) {
  return (e.get().ownVers[n]?.length ?? 0) > 0;
}
//@ chunk-06y4szbn.js:32252-32326 placement
async function withPublishInFlight(e, n, r) {
  markPublishInFlight(e, n);
  try {
    return await r();
  } finally {
    clearPublishInFlight(e, n);
  }
}
//@ chunk-06y4szbn.js:32326-32415 placement
function markPublishInFlight(e, n) {
  e.set((r) => ({ ...r, inFlight: { ...r.inFlight, [n]: (r.inFlight[n] ?? 0) + 1 } }));
}
//@ chunk-06y4szbn.js:32415-32595 placement
function clearPublishInFlight(e, n) {
  e.set((r) => {
    let s = r.inFlight[n] ?? 0;
    if (s === 0) return r;
    if (s === 1) {
      let { [n]: h, ...b } = r.inFlight;
      return { ...r, inFlight: b };
    }
    return { ...r, inFlight: { ...r.inFlight, [n]: s - 1 } };
  });
}
//@ chunk-06y4szbn.js:32595-32646 placement
function isPublishInFlight(e, n) {
  return (e.get().inFlight[n] ?? 0) > 0;
}

export {
  withPublishInFlight,
  recordOwnPublish,
  VER_SHAPE,
  isVouchedOwnVer,
  hasOwnPublished,
  isPublishInFlight,
  isOwnPublishedVer,
  markPublishInFlight,
  clearPublishInFlight,
  makeOwnPublishesStore,
};

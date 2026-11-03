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
import { createFieldAccessor, localValueSlot } from "../../state/sliceHelpers.js";

//@ chunk-06y4szbn.js:31510-31602 placement
/**
 * 本会话自己发布记录的上限 8 个版本与版本号形态正则。
 */
var MAX_OWN_VERSIONS = 8;
var VER_SHAPE = /^[A-Za-z0-9._-]{1,64}$/;
var EMPTY_OWN_PUBLISHES = {
  ownVers: {},
  inFlight: {},
};
var makeOwnPublishesStore = createFieldAccessor("ownPublishes", EMPTY_OWN_PUBLISHES);
//@ chunk-06y4szbn.js:31602-31632 placement
function makeLocalOwnPublishesStore() {
  return localValueSlot(EMPTY_OWN_PUBLISHES);
}
//@ chunk-06y4szbn.js:31632-32020 placement
function recordOwnPublish(ownPublishes, slug, version, s = {}) {
  if (!VER_SHAPE.test(version)) return;
  ownPublishes.set((h) => {
    let b = h.ownVers[slug] ?? [];
    let y = h.mergedVers?.[slug] ?? [];
    let included = b.includes(version);
    let included_2 = y.includes(version);
    if (included && (s.merged !== true || included_2)) return h;
    let R = included ? b : [...b, version].slice(-MAX_OWN_VERSIONS);
    let filtered = (s.merged === true && !included_2 ? [...y, version] : y).filter((k) => R.includes(k));
    return {
      ...h,
      ownVers: {
        ...h.ownVers,
        [slug]: R,
      },
      ...((h.mergedVers?.[slug] !== undefined || filtered.length > 0) && {
        mergedVers: {
          ...h.mergedVers,
          [slug]: filtered,
        },
      }),
    };
  });
}
//@ chunk-06y4szbn.js:32020-32083 placement
function isOwnPublishedVer(ownPublishes, n, r) {
  return ownPublishes.get().ownVers[n]?.includes(r) ?? false;
}
//@ chunk-06y4szbn.js:32083-32194 placement
function isVouchedOwnVer(ownPublishes, slug, ver) {
  let s = ownPublishes.get();
  return (s.ownVers[slug]?.includes(ver) ?? false) && !(s.mergedVers?.[slug]?.includes(ver) ?? false);
}
//@ chunk-06y4szbn.js:32194-32252 placement
function hasOwnPublished(ownPublishes, n) {
  return (ownPublishes.get().ownVers[n]?.length ?? 0) > 0;
}
//@ chunk-06y4szbn.js:32252-32326 placement
async function withPublishInFlight(ownPublishes, slug, r) {
  markPublishInFlight(ownPublishes, slug);
  try {
    return await r();
  } finally {
    clearPublishInFlight(ownPublishes, slug);
  }
}
//@ chunk-06y4szbn.js:32326-32415 placement
function markPublishInFlight(e, n) {
  e.set((r) => ({
    ...r,
    inFlight: {
      ...r.inFlight,
      [n]: (r.inFlight[n] ?? 0) + 1,
    },
  }));
}
//@ chunk-06y4szbn.js:32415-32595 placement
function clearPublishInFlight(e, n) {
  e.set((r) => {
    let s = r.inFlight[n] ?? 0;
    if (s === 0) return r;
    if (s === 1) {
      let { [n]: h, ...b } = r.inFlight;
      return {
        ...r,
        inFlight: b,
      };
    }
    return {
      ...r,
      inFlight: {
        ...r.inFlight,
        [n]: s - 1,
      },
    };
  });
}
//@ chunk-06y4szbn.js:32595-32646 placement
function isPublishInFlight(ownPublishes, n) {
  return (ownPublishes.get().inFlight[n] ?? 0) > 0;
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

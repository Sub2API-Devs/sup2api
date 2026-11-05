/**
 * services/artifacts/ownPublishes.ts
 *
 * 2.1.316 新增：记录本会话自己的发布与进行中状态
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-51jy8ztq.js (10)
 * attribution: placement 10
 */
import { createFieldAccessor, localValueSlot } from "../../state/sliceHelpers.js";

//@ chunk-51jy8ztq.js:31510-31602 placement
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
//@ chunk-51jy8ztq.js:31602-31632 placement
function makeLocalOwnPublishesStore() {
  return localValueSlot(EMPTY_OWN_PUBLISHES);
}
//@ chunk-51jy8ztq.js:31632-32020 placement
function recordOwnPublish(ownPublishes, slug, version, extra = {}) {
  if (!VER_SHAPE.test(version)) return;
  ownPublishes.set((state) => {
    let ownVers = state.ownVers[slug] ?? [];
    let mergedVers = state.mergedVers?.[slug] ?? [];
    let included = ownVers.includes(version);
    let included_2 = mergedVers.includes(version);
    if (included && (extra.merged !== true || included_2)) return state;
    let nextVers = included ? ownVers : [...ownVers, version].slice(-MAX_OWN_VERSIONS);
    let filtered = (extra.merged === true && !included_2 ? [...mergedVers, version] : mergedVers).filter(
      (listedVer) => nextVers.includes(listedVer),
    );
    return {
      ...state,
      ownVers: {
        ...state.ownVers,
        [slug]: nextVers,
      },
      ...((state.mergedVers?.[slug] !== undefined || filtered.length > 0) && {
        mergedVers: {
          ...state.mergedVers,
          [slug]: filtered,
        },
      }),
    };
  });
}
//@ chunk-51jy8ztq.js:32020-32083 placement
function isOwnPublishedVer(ownPublishes, slug, ver) {
  return ownPublishes.get().ownVers[slug]?.includes(ver) ?? false;
}
//@ chunk-51jy8ztq.js:32083-32194 placement
function isVouchedOwnVer(ownPublishes, artifactSlug, ver) {
  let state = ownPublishes.get();
  return (
    (state.ownVers[artifactSlug]?.includes(ver) ?? false) &&
    !(state.mergedVers?.[artifactSlug]?.includes(ver) ?? false)
  );
}
//@ chunk-51jy8ztq.js:32194-32252 placement
function hasOwnPublished(ownPublishes, slug) {
  return (ownPublishes.get().ownVers[slug]?.length ?? 0) > 0;
}
//@ chunk-51jy8ztq.js:32252-32326 placement
async function withPublishInFlight(ownPublishes, slug, run) {
  markPublishInFlight(ownPublishes, slug);
  try {
    return await run();
  } finally {
    clearPublishInFlight(ownPublishes, slug);
  }
}
//@ chunk-51jy8ztq.js:32326-32415 placement
function markPublishInFlight(ownPublishes, slug) {
  ownPublishes.set((state) => ({
    ...state,
    inFlight: {
      ...state.inFlight,
      [slug]: (state.inFlight[slug] ?? 0) + 1,
    },
  }));
}
//@ chunk-51jy8ztq.js:32415-32595 placement
function clearPublishInFlight(ownPublishes, slug) {
  ownPublishes.set((state) => {
    let count = state.inFlight[slug] ?? 0;
    if (count === 0) return state;
    if (count === 1) {
      let { [slug]: removed, ...rest } = state.inFlight;
      return {
        ...state,
        inFlight: rest,
      };
    }
    return {
      ...state,
      inFlight: {
        ...state.inFlight,
        [slug]: count - 1,
      },
    };
  });
}
//@ chunk-51jy8ztq.js:32595-32646 placement
function isPublishInFlight(ownPublishes, slug) {
  return (ownPublishes.get().inFlight[slug] ?? 0) > 0;
}
export {
  VER_SHAPE,
  hasOwnPublished,
  isPublishInFlight,
  isVouchedOwnVer,
  withPublishInFlight,
  recordOwnPublish,
  isOwnPublishedVer,
  makeOwnPublishesStore,
  markPublishInFlight,
  clearPublishInFlight,
  makeLocalOwnPublishesStore,
};

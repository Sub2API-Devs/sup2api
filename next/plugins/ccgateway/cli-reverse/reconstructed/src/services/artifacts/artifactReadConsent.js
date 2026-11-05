/**
 * services/artifacts/artifactReadConsent.ts
 *
 * 2.1.316 新增：Artifact 读取同意。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-pse52p6n.js (6)
 * attribution: placement 6
 */
import { isPersistableFrameUrl } from "../../tools/ArtifactTool/artifactResumeCarry.js";
import { uuidSlugFromUrl } from "../../tools/ArtifactTool/constants.js";
import { createFieldAccessor } from "../../state/sliceHelpers.js";
import { makeOwnPublishesStore } from "./ownPublishes.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-pse52p6n.js:374-489 placement
function findLocalSourcePath(state, url) {
  return Object.entries(state.frameUrls ?? {}).find(
    ([key, value]) =>
      value?.url !== undefined && !isPersistableFrameUrl(key) && uuidSlugFromUrl(value.url) === url,
  )?.[0];
}
//@ chunk-pse52p6n.js:489-747 placement
/**
 * 列出会话记录里仍保留的本地源页面（未被关闭的 frameUrls 条目）：路径、slug、url，以及是否是未经询问的例行/评论页面。
 */
function listHeldSourcePages(state) {
  return Object.entries(state.frameUrls ?? {}).flatMap(([key, value]) => {
    if (value?.url === undefined || isPersistableFrameUrl(key)) return [];
    if (value.dismissed === true) return [];
    let valueUrl = uuidSlugFromUrl(value.url);
    let unasked = value.routineUnasked === true || value.commentUnasked === true;
    return valueUrl === null
      ? []
      : [
          {
            path: key,
            slug: valueUrl,
            url: value.url,
            unasked,
          },
        ];
  });
}
//@ chunk-pse52p6n.js:747-908 placement
function isWorkshopPage(state, slug) {
  return Object.entries(state.frameUrls ?? {}).some(
    ([key, value]) =>
      value?.url !== undefined &&
      uuidSlugFromUrl(value.url) === slug &&
      (key.endsWith(".workshop.html") || key.endsWith(".workshop.md")),
  );
}
//@ chunk-pse52p6n.js:908-1000 placement
var EMPTY_SHARED_CONSENT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var sharedReadConsentAccessor;
var consentEpochAccessor;
deferInit("chunk-pse52p6n.js:908", () => {
  EMPTY_SHARED_CONSENT = Object.freeze({});
  sharedReadConsentAccessor = createFieldAccessor("artifactReadConsentSlugs", EMPTY_SHARED_CONSENT);
  consentEpochAccessor = createFieldAccessor("artifactConsentEpoch", 0);
});
//@ chunk-pse52p6n.js:1000-1195 placement
/**
 * 组装 artifact 会话存储：本会话发布记录、已记录页面查询（是否 workshop 页、本地源路径、保留的源页面）、共享读取同意与同意纪元。
 */
function createArtifactSessionStores(getAppState, setAppState) {
  return {
    ownPublishes: makeOwnPublishesStore(getAppState, setAppState),
    recordedPages: {
      isWorkshopPage: (slug) => isWorkshopPage(getAppState(), slug),
      localSourcePath: (slug) => findLocalSourcePath(getAppState(), slug),
      heldSourcePages: () => listHeldSourcePages(getAppState()),
    },
    sharedReadConsent: sharedReadConsentAccessor(getAppState, setAppState),
    consentEpoch: consentEpochAccessor(getAppState, setAppState),
  };
}
//@ chunk-pse52p6n.js:1195-1251 placement
/**
 * 导出函数 `createEmptyArtifactSessionStores`：返回 createArtifactSessionStores( () => e, (r) => { e = r(e); }, )。
 */
function createEmptyArtifactSessionStores() {
  let out = {};
  return createArtifactSessionStores(
    () => out,
    (slot) => {
      out = slot(out);
    },
  );
}
export { createEmptyArtifactSessionStores, createArtifactSessionStores };
